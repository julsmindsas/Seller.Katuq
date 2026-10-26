import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MigracionTiendaService } from '../migracion-tienda.service';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { ErrorImportador } from '../tipos';
import { nuevoId } from '../logica/flujo';
import {
  AVISO_CONSENTIMIENTO_APAGADO,
  FECHA_EXPORT_VALIDA,
  LecturaClientes,
  LineaClientes,
  TEXTO_CONFIRMAR_DESHACER,
  TEXTO_DECLARACION,
  TotalesClientes,
  avisosDeClientes,
  deshacerLote,
  importarClientesPorLotes,
  leerClientes,
  resumenDeClientes,
  sumarClientes,
  textoCodigo,
  textoDeshecho,
} from '../logica/clientes';
import { RespuestaClientes } from '../tipos';
import { OpcionSitio } from './paso-subir.component';

interface LoteVista {
  id: string;
  estado: 'activo' | 'deshaciendo' | 'deshecho';
  mensaje: string | null;
}

/**
 * Paso opcional: traer los clientes de Shopify o WooCommerce. Se abre aparte de los cuatro pasos de
 * productos. Solo muestra conteos y códigos: nunca correos, teléfonos ni nombres (ni en pantalla ni en logs).
 */
@Component({
  selector: 'app-mt-paso-clientes',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card cfg-form mt-bloque" *ngIf="!totales">
      <h2 class="mt-subtitulo">Trae tus clientes</h2>
      <p class="mt-ayuda">Sube el CSV de clientes que exportas desde Shopify o WooCommerce. Si un cliente ya está en Katuq, solo le completamos lo que falte.</p>
      <div class="cfg-form__grupo">
        <div>
          <label for="mt-clientes-archivo">Archivo de clientes (CSV)</label>
          <input id="mt-clientes-archivo" class="form-control" type="file" accept=".csv,text/csv" [disabled]="enviando" (change)="elegir($event)" />
        </div>
        <div>
          <label for="mt-clientes-sitio">Sitio de destino</label>
          <select id="mt-clientes-sitio" class="form-select" [disabled]="enviando" (change)="sitioId = valor($event)">
            <option value="">Elige un sitio</option>
            <option *ngFor="let s of sitios" [value]="s.id" [selected]="s.id === sitioId">{{ s.nombre }}</option>
          </select>
        </div>
        <div>
          <label for="mt-clientes-fecha">Fecha del export (opcional)</label>
          <input id="mt-clientes-fecha" class="form-control" type="date" [disabled]="enviando" (change)="fecha = valor($event)" />
        </div>
      </div>

      <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngIf="lectura && !lectura.ok">{{ lectura.message }}</p>

      <ng-container *ngIf="lectura && lectura.ok">
        <p class="cfg-aviso cfg-aviso--ok mt-sep" role="status">
          <span class="mt-fuerte">{{ lectura.perfil.nombre }}: {{ lectura.resumen.total }} clientes</span>
        </p>
        <ul class="mt-lista mt-sep">
          <li *ngIf="lectura.resumen.sinContacto">{{ lectura.resumen.sinContacto }} no tienen correo ni celular y se omitirán.</li>
          <li *ngIf="lectura.resumen.repetidasEnArchivo">{{ lectura.resumen.repetidasEnArchivo }} están repetidos en el archivo y solo entra el primero.</li>
          <li *ngIf="lectura.resumen.correosConMayusculas">{{ lectura.resumen.correosConMayusculas }} correos con mayúsculas en el archivo; si ya los tenías guardados así en tus clientes podrían repetirse.</li>
          <li *ngIf="lectura.resumen.conSmsOWhatsapp">{{ lectura.resumen.conSmsOWhatsapp }} aceptaban SMS o WhatsApp: ese permiso no se importa.</li>
        </ul>

        <div class="mt-sep" *ngIf="traeConsentimiento">
          <label class="mt-check">
            <input type="checkbox" class="form-check-input" [checked]="declaracion" [disabled]="enviando" (change)="declaracion = marcado($event)" />
            <span class="mt-texto-check">{{ textoDeclaracion }}</span>
          </label>
          <p class="mt-ayuda">Solo se suscribe a quienes aceptaron correos en tu tienda anterior ({{ lectura.resumen.aceptanCorreo }} en este archivo) y solo si marcas esta casilla.</p>
          <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="!consentimientoEncendido"><span class="mt-fuerte">{{ avisoApagado }}</span></p>
        </div>
        <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="!traeConsentimiento"><span class="mt-fuerte">El archivo de {{ lectura.perfil.nombre }} no trae el permiso de correos: tus clientes entran sin suscripción.</span></p>
      </ng-container>

      <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngIf="errorValidacion">{{ errorValidacion }}</p>
      <ng-container *ngIf="avance">
        <div class="mt-barra mt-sep" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="porcentaje">
          <div class="mt-barra__relleno" [style.width.%]="porcentaje"></div>
        </div>
        <p class="mt-ayuda">Lote {{ avance.hecho }} de {{ avance.total }}. No cierres esta ventana hasta que termine.</p>
      </ng-container>
      <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngIf="error"><span class="mt-fuerte">{{ error.message }}</span></p>
      <p class="mt-ayuda" *ngIf="error && !error.blocking">Lo que ya se trajo queda guardado y se puede deshacer por lote. Al reintentar seguimos desde donde se detuvo.</p>
    </section>

    <section class="cfg-card mt-bloque" *ngIf="totales">
      <h2 class="mt-subtitulo">{{ error ? 'Los clientes quedaron a medias' : 'Listo, tus clientes ya están en Katuq' }}</h2>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngFor="let t of avisos"><span class="mt-fuerte">{{ t }}</span></p>
      <div class="cfg-stats mt-sep">
        <div class="cfg-stat" *ngFor="let l of lineas">
          <span class="cfg-stat__label">{{ l.etiqueta }}</span>
          <span class="cfg-stat__valor">{{ l.valor }}</span>
        </div>
      </div>
      <div class="mt-sep" *ngIf="totales.issues.length">
        <p class="mt-ayuda">Filas que no entraron (número de fila del archivo{{ totales.issuesTotal > totales.issues.length ? ', primeras ' + totales.issues.length + ' de ' + totales.issuesTotal : '' }}):</p>
        <ul class="mt-lista">
          <li *ngFor="let i of primerasFilas">Fila {{ i.row }}: {{ texto(i.code) }}</li>
        </ul>
      </div>
      <div class="mt-sep" *ngIf="lotes.length">
        <p class="mt-ayuda">¿Te equivocaste de archivo? Puedes deshacer cada lote. Solo quita lo que esta importación creó y nadie ha tocado.</p>
        <div class="mt-lote" *ngFor="let l of lotes; let i = index">
          <span class="mt-fuerte">Lote {{ i + 1 }}</span>
          <button type="button" class="cfg-btn cfg-btn--sec cfg-btn--peligro" *ngIf="l.estado !== 'deshecho'" [disabled]="l.estado === 'deshaciendo'" (click)="deshacer(l)">
            {{ l.estado === 'deshaciendo' ? 'Deshaciendo…' : 'Deshacer este lote' }}
          </button>
          <span class="mt-ayuda" *ngIf="l.mensaje">{{ l.mensaje }}</span>
        </div>
      </div>
    </section>

    <div class="cfg-form__pie">
      <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="enviando" (click)="volver.emit()">Volver</button>
      <button type="button" class="cfg-btn" *ngIf="!totales || error" [disabled]="!puedeImportar" (click)="importar()">{{ error ? 'Reintentar' : 'Traer mis clientes' }}</button>
    </div>
  `,
})
export class PasoClientesComponent {
  @Input() sitios: OpcionSitio[] = [];
  @Input() set sitioInicial(v: string) {
    if (v && !this.sitioId) this.sitioId = v;
  }
  @Output() volver = new EventEmitter<void>();

  sitioId = '';
  fecha = '';
  declaracion = false;
  lectura: LecturaClientes | null = null;
  enviando = false;
  avance: { hecho: number; total: number } | null = null;
  error: ErrorImportador | null = null;
  errorValidacion: string | null = null;
  totales: TotalesClientes | null = null;
  lineas: LineaClientes[] = [];
  avisos: string[] = [];
  lotes: LoteVista[] = [];

  readonly textoDeclaracion = TEXTO_DECLARACION;
  readonly avisoApagado = AVISO_CONSENTIMIENTO_APAGADO;

  private migrationId = nuevoId('cli');
  private previas: RespuestaClientes[] = [];
  private siguiente = 0;

  constructor(
    private readonly servicio: MigracionTiendaService,
    private readonly cd: ChangeDetectorRef,
    private readonly features: CompanyFeaturesService,
  ) {}

  /** El aviso de «entran sin suscripción» solo vale mientras la bandera del concepto legal está apagada. */
  get consentimientoEncendido(): boolean {
    return this.features.isEnabled('storeMigrationCustomerConsent');
  }

  get traeConsentimiento(): boolean {
    return !!this.lectura && this.lectura.ok && this.lectura.perfil.acepta !== null;
  }
  get puedeImportar(): boolean {
    return !!this.lectura && this.lectura.ok && !this.enviando;
  }
  get porcentaje(): number {
    return this.avance && this.avance.total ? Math.min(100, Math.round((this.avance.hecho / this.avance.total) * 100)) : 0;
  }
  get primerasFilas(): { row: number; code: string }[] {
    return this.totales ? this.totales.issues.slice(0, 50) : [];
  }

  texto(codigo: string): string {
    return textoCodigo(codigo);
  }
  valor(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  marcado(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  async elegir(e: Event): Promise<void> {
    const f = (e.target as HTMLInputElement).files;
    this.lectura = null;
    this.errorValidacion = null;
    this.previas = [];
    this.siguiente = 0;
    this.error = null;
    this.migrationId = nuevoId('cli'); // otro archivo es otra importación
    if (f && f.length) this.lectura = leerClientes(await f[0].text());
    this.cd.markForCheck();
  }

  async importar(): Promise<void> {
    if (!this.lectura || !this.lectura.ok) return;
    this.errorValidacion = null;
    if (!this.sitioId) this.errorValidacion = 'Elige el sitio donde quedarán tus clientes.';
    else if (!FECHA_EXPORT_VALIDA(this.fecha)) this.errorValidacion = 'La fecha del export no es válida.';
    if (this.errorValidacion) {
      this.cd.markForCheck();
      return;
    }
    const lectura = this.lectura;
    this.enviando = true;
    this.error = null;
    this.cd.markForCheck();
    const r = await importarClientesPorLotes(
      { importarClientes: (c) => this.servicio.importarClientes(c).toPromise() as Promise<RespuestaClientes> },
      { migrationId: this.migrationId, proveedor: lectura.perfil.id, siteId: this.sitioId, declaracion: this.declaracion, exportadoEn: this.fecha || undefined, filas: lectura.filas },
      {
        desde: this.siguiente,
        previas: this.previas,
        alTerminar: (n, total) => {
          this.avance = { hecho: n, total };
          this.cd.markForCheck();
        },
      },
    );
    this.previas = r.respuestas;
    this.siguiente = r.siguiente;
    this.error = r.detenido ? r.detenido.error : null;
    this.enviando = false;
    this.totales = sumarClientes(r.respuestas);
    this.lineas = resumenDeClientes(this.totales);
    this.avisos = avisosDeClientes(this.totales, lectura.resumen, this.declaracion, this.traeConsentimiento);
    this.lotes = this.totales.batchIds.map((id) => ({ id, estado: 'activo', mensaje: null }));
    this.cd.markForCheck();
  }

  async deshacer(l: LoteVista): Promise<void> {
    const ok = await Swal.fire({
      title: TEXTO_CONFIRMAR_DESHACER.titulo,
      text: TEXTO_CONFIRMAR_DESHACER.cuerpo,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: TEXTO_CONFIRMAR_DESHACER.confirmar,
      cancelButtonText: TEXTO_CONFIRMAR_DESHACER.cancelar,
    });
    if (!ok.isConfirmed) return;
    l.estado = 'deshaciendo';
    l.mensaje = null;
    this.cd.markForCheck();
    const r = await deshacerLote({ deshacerClientes: (id) => this.servicio.deshacerClientes(id).toPromise() as Promise<any> }, l.id);
    l.estado = r.respuesta ? 'deshecho' : 'activo';
    l.mensaje = r.respuesta ? textoDeshecho(r.respuesta) : r.error ? r.error.message : null;
    this.cd.markForCheck();
  }
}
