import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BodegaService } from '../../shared/services/bodegas/bodega.service';
import { SitiosService } from '../sitios/sitios.service';
import { MigracionTiendaService } from './migracion-tienda.service';
import { ErrorImportador } from './tipos';
import { ResultadoLectura, leerTienda } from './logica/importacion';
import { Sobrante } from './logica/lotes';
import { reporteCsv } from './logica/reporte';
import { TotalesProductos, TotalesSimulacion, sumarLotes } from './logica/sumas';
import { RespuestaLoteProductos } from './tipos';
import { OpcionesReintento } from './logica/errores';
import {
  CONFIG_INICIAL,
  ConfigImportacion,
  ContextoFlujo,
  EnviosImportacion,
  EnviosSimulacion,
  ErroresConfig,
  avisoInventario,
  copiarFotosDe,
  crearRedireccionesDe,
  importarProductosPorLotes,
  nuevoId,
  puedeRedirigir,
  simularTodo,
  sinErrores,
  validarConfig,
} from './logica/flujo';
import { resumenDeImportacion } from './logica/textos';
import { OpcionBodega, OpcionSitio, PasoSubirComponent } from './pasos/paso-subir.component';
import { PasoSimularComponent } from './pasos/paso-simular.component';
import { AvanceVista, PasoImportarComponent } from './pasos/paso-importar.component';
import { ExtrasReporte, PasoReporteComponent } from './pasos/paso-reporte.component';

type Paso = 'subir' | 'simular' | 'importar' | 'reporte';
const TITULOS: { [p in Paso]: string } = { subir: 'Tus archivos', simular: 'Revisión', importar: 'Importación', reporte: 'Reporte' };

/**
 * «Traer mi tienda»: sube el CSV de Shopify o WooCommerce, revisa qué pasaría y lo trae por lotes.
 * Esta clase solo orquesta; la lógica vive en `logica/` (probada sin Angular) y cada paso es un
 * componente de presentación. Ningún `if` por proveedor: lo que varía lo da el perfil detectado.
 */
@Component({
  selector: 'app-migrar-tienda',
  standalone: true,
  imports: [CommonModule, PasoSubirComponent, PasoSimularComponent, PasoImportarComponent, PasoReporteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['./migrar-tienda.component.scss'],
  template: `
    <div class="cfg-pagina mt-raiz">
      <header class="cfg-cabeza">
        <div class="cfg-cabeza__textos">
          <span class="cfg-eyebrow">Migración</span>
          <h1 class="cfg-titulo">Traer mi tienda</h1>
          <p class="cfg-sub">Pasa tus productos, fotos y existencias desde Shopify o WooCommerce a Katuq, sin escribirlos de nuevo.</p>
        </div>
      </header>

      <ol class="mt-pasos" aria-label="Pasos">
        <li *ngFor="let p of pasos; let i = index" class="mt-paso" [class.mt-paso--actual]="p === paso" [class.mt-paso--hecho]="indice(p) < indice(paso)">
          <span class="mt-paso__num">{{ i + 1 }}</span>
          <span class="mt-paso__texto">{{ titulo(p) }}</span>
        </li>
      </ol>

      <app-mt-paso-subir *ngIf="paso === 'subir'"
        [lectura]="lectura" [productosCargados]="textoProductos !== null" [leyendo]="leyendo"
        [sitios]="sitios" [bodegas]="bodegas" [config]="config" [errores]="errores"
        (productos)="alElegirProductos($event)" (inventario)="alElegirInventario($event)"
        (configCambia)="alCambiarConfig($event)" (continuar)="revisar()"></app-mt-paso-subir>

      <app-mt-paso-simular *ngIf="paso === 'simular'"
        [simulando]="simulando" [totales]="simulacion" [sobrantes]="sobrantesSimulacion" [error]="errorSimulacion"
        (volver)="irA('subir')" (reintentar)="simular()" (importar)="importar(false)"></app-mt-paso-simular>

      <app-mt-paso-importar *ngIf="paso === 'importar'"
        [avance]="avance" [error]="errorImportacion"
        (reintentar)="importar(true)" (verReporte)="cerrarConLoAlcanzado()"></app-mt-paso-importar>

      <app-mt-paso-reporte *ngIf="paso === 'reporte' && totales"
        [totales]="totales" [resumen]="resumen" [avisoExistencias]="avisoExistencias" [extras]="extras"
        (descargar)="descargarReporte()" (terminar)="terminar()"></app-mt-paso-reporte>
    </div>
  `,
})
export class MigrarTiendaComponent implements OnInit {
  readonly pasos: Paso[] = ['subir', 'simular', 'importar', 'reporte'];
  paso: Paso = 'subir';

  sitios: OpcionSitio[] = [];
  bodegas: OpcionBodega[] = [];
  config: ConfigImportacion = { ...CONFIG_INICIAL };
  errores: ErroresConfig = {};

  textoProductos: string | null = null;
  textoInventario: string | null = null;
  lectura: ResultadoLectura | null = null;
  leyendo = false;

  simulando = false;
  simulacion: TotalesSimulacion | null = null;
  sobrantesSimulacion: Sobrante[] = [];
  errorSimulacion: ErrorImportador | null = null;

  avance: AvanceVista | null = null;
  errorImportacion: ErrorImportador | null = null;
  totales: TotalesProductos | null = null;
  resumen: ReturnType<typeof resumenDeImportacion> = [];
  avisoExistencias: string | null = null;
  extras: ExtrasReporte = { redirecciones: null, fotos: null, detenido: null };

  private migrationId = nuevoId('mig');
  private runId = nuevoId('run');
  private previas: RespuestaLoteProductos[] = [];
  private siguiente = 0;

  constructor(
    private readonly servicio: MigracionTiendaService,
    private readonly sitiosService: SitiosService,
    private readonly bodegaService: BodegaService,
    private readonly router: Router,
    private readonly cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    firstValueFrom(this.sitiosService.listar())
      .then((r) => {
        this.sitios = ((r && r.data) || []).filter((s) => s.tipo === 'tienda').map((s) => ({ id: s.id, nombre: s.nombre }));
      })
      .catch(() => (this.sitios = []))
      .finally(() => this.cd.markForCheck());
    firstValueFrom(this.bodegaService.getActiveBodegas())
      .then((lista) => {
        this.bodegas = (lista || []).filter((b) => b && b.idBodega).map((b) => ({ idBodega: String(b.idBodega), nombre: String(b.nombre || b.idBodega) }));
      })
      .catch(() => (this.bodegas = []))
      .finally(() => this.cd.markForCheck());
  }

  titulo(p: Paso): string {
    return TITULOS[p];
  }
  indice(p: Paso): number {
    return this.pasos.indexOf(p);
  }
  irA(p: Paso): void {
    this.paso = p;
    this.cd.markForCheck();
  }

  // ── Paso 1 ────────────────────────────────────────────────────────────────────
  async alElegirProductos(archivo: File | null): Promise<void> {
    this.textoProductos = archivo ? await this.leer(archivo) : null;
    if (!archivo) this.textoInventario = null;
    this.releer();
  }

  async alElegirInventario(archivo: File | null): Promise<void> {
    this.textoInventario = archivo ? await this.leer(archivo) : null;
    this.releer();
  }

  private async leer(archivo: File): Promise<string> {
    this.leyendo = true;
    this.cd.markForCheck();
    try {
      return await archivo.text();
    } finally {
      this.leyendo = false;
    }
  }

  private releer(): void {
    this.lectura = this.textoProductos === null ? null : leerTienda(this.textoProductos, this.textoInventario);
    this.simulacion = null;
    this.reiniciarCorrida();
    this.cd.markForCheck();
  }

  alCambiarConfig(parte: Partial<ConfigImportacion>): void {
    this.config = { ...this.config, ...parte };
    this.simulacion = null;
    this.reiniciarCorrida();
    if (Object.keys(this.errores).length) this.errores = validarConfig(this.config, this.hayInventario);
    this.cd.markForCheck();
  }

  /** Una configuración o archivo distinto es otra importación: ids nuevos para no repetir lotes de la anterior. */
  private reiniciarCorrida(): void {
    this.migrationId = nuevoId('mig');
    this.runId = nuevoId('run');
    this.previas = [];
    this.siguiente = 0;
  }

  get hayInventario(): boolean {
    return !!this.lectura && this.lectura.ok && !!this.lectura.inventario;
  }

  revisar(): void {
    this.errores = validarConfig(this.config, this.hayInventario);
    if (!sinErrores(this.errores) || !this.lectura || !this.lectura.ok) {
      this.cd.markForCheck();
      return;
    }
    this.irA('simular');
    void this.simular();
  }

  // ── Paso 2 ────────────────────────────────────────────────────────────────────
  private contexto(): ContextoFlujo {
    const l = this.lectura;
    if (!l || !l.ok) throw new Error('Sin archivo leído');
    return {
      migrationId: this.migrationId,
      runId: this.runId,
      proveedor: l.perfil.id,
      config: this.config,
      hayInventario: this.hayInventario,
      grupos: l.grupos,
      perfil: l.perfil,
      idioma: l.idioma,
    };
  }

  private envios(): EnviosImportacion & EnviosSimulacion {
    return {
      simular: (c) => firstValueFrom(this.servicio.simular(c)),
      importarProductos: (c) => firstValueFrom(this.servicio.importarProductos(c)),
      crearRedirecciones: (c) => firstValueFrom(this.servicio.crearRedirecciones(c)),
      copiarFotos: (c) => firstValueFrom(this.servicio.copiarFotos(c)),
    };
  }

  async simular(): Promise<void> {
    this.simulando = true;
    this.errorSimulacion = null;
    this.simulacion = null;
    this.cd.markForCheck();
    const r = await simularTodo(this.envios(), this.contexto());
    this.simulando = false;
    if ('error' in r) {
      this.errorSimulacion = r.error;
    } else {
      this.simulacion = r.totales;
      this.sobrantesSimulacion = r.sobrantes;
    }
    this.cd.markForCheck();
  }

  // ── Paso 3 ────────────────────────────────────────────────────────────────────
  private reintento(): OpcionesReintento {
    return {
      alEsperar: (error, _intento, ms) => {
        if (this.avance) this.avance = { ...this.avance, espera: `${error.message} (${Math.ceil(ms / 1000)} s)` };
        this.cd.markForCheck();
      },
    };
  }

  private progreso(etapa: AvanceVista['etapa'], hecho: number, total: number): void {
    this.avance = { etapa, hecho, total, espera: null };
    this.cd.markForCheck();
  }

  async importar(reanudar: boolean): Promise<void> {
    this.irA('importar');
    this.errorImportacion = null;
    if (!reanudar) {
      this.previas = [];
      this.siguiente = 0;
      this.extras = { redirecciones: null, fotos: null, detenido: null };
    }
    const ctx = this.contexto();
    const envios = this.envios();
    this.progreso('productos', this.siguiente, 0);
    const r = await importarProductosPorLotes(envios, ctx, {
      ...this.reintento(),
      desde: this.siguiente,
      previas: this.previas,
      progreso: (e, h, t) => this.progreso(e, h, t),
    });
    this.previas = r.avance.respuestas;
    this.siguiente = r.avance.siguiente;
    this.totales = r.totales;
    if (r.avance.detenido) {
      this.errorImportacion = r.avance.detenido.error;
      this.cd.markForCheck();
      return;
    }
    await this.pasosSiguientes(ctx, envios, r.totales);
  }

  /** Redirecciones y fotos van después de los productos. Si fallan, la importación sigue valiendo: se avisa en el reporte. */
  private async pasosSiguientes(ctx: ContextoFlujo, envios: EnviosImportacion, t: TotalesProductos): Promise<void> {
    if (puedeRedirigir(ctx)) {
      this.progreso('redirecciones', 0, 1);
      const red = await crearRedireccionesDe(envios, ctx, t.productos, this.reintento());
      this.extras = {
        ...this.extras,
        redirecciones: { generated: red.generated, conflictsWithManual: red.conflictsWithManual, overCapacity: red.overCapacity, mensaje: red.error ? red.error.message : null },
      };
    }
    if (t.fotos.porCopiar > 0) {
      this.progreso('fotos', 0, 1);
      const f = await copiarFotosDe(envios, ctx, t.productos, { ...this.reintento(), progreso: (e, h, n) => this.progreso(e, h, n) });
      this.extras = {
        ...this.extras,
        fotos: {
          copiadas: f.copiadas,
          fallidas: f.fallidas,
          pendientes: f.lotesHechos < f.lotes,
          mensaje: f.error ? `${f.error.message} Las fotos que faltan se pueden retomar después.` : null,
        },
      };
    }
    this.cerrar(t);
  }

  cerrarConLoAlcanzado(): void {
    const t = this.totales || sumarLotes(this.previas);
    this.extras = {
      ...this.extras,
      detenido: this.errorImportacion ? `${this.errorImportacion.message} Lo que alcanzó a traerse está en el reporte.` : null,
    };
    this.cerrar(t);
  }

  private cerrar(t: TotalesProductos): void {
    this.totales = t;
    this.resumen = resumenDeImportacion(t);
    this.avisoExistencias = avisoInventario(t);
    this.paso = 'reporte';
    this.cd.markForCheck();
  }

  // ── Paso 4 ────────────────────────────────────────────────────────────────────
  descargarReporte(): void {
    if (!this.totales) return;
    const blob = new Blob([reporteCsv(this.totales)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reporte-traer-mi-tienda.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  terminar(): void {
    void this.router.navigate(['/productos']);
  }
}
