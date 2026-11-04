import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  ClientesListaService, DuplicadoFicha, DuplicadoGrupo, FusionChoque, FusionDecisiones, FusionElige, FusionVista,
} from '../services/clientes-lista.service';

/** Veces seguidas que se revisa otra tanda sola cuando la anterior no trajo ningún grupo. */
const TANDAS_AUTOMATICAS = 8;

type Criterio = 'documento' | 'nombre';

/** Código de error del servidor -> clave de texto (los demás caen en el genérico). */
const ERRORES_FUSION: Record<string, string> = {
  CHOQUES_SIN_DECIDIR: 'sinDecidir',
  YA_FUSIONADO: 'yaUnido',
  PRINCIPAL_YA_FUSIONADO: 'principalYaUnido',
  CADENA: 'cadena',
  CLIENTE_NO_ENCONTRADO: 'noEncontrado',
  MISMA_FICHA: 'mismaFicha',
  ROLE_NOT_ALLOWED: 'sinPermiso',
  FEATURE_DISABLED: 'sinPermiso',
  NO_FUSIONADO: 'noUnido',
};

/** Unión en curso dentro de un grupo (una pareja a la vez). */
interface FusionEnCurso {
  grupo: string;
  principalCd: string;
  duplicadoCd: string;
  vista: FusionVista | null;
  decisiones: FusionDecisiones;
  trabajando: 'previa' | 'unir' | null;
  error: string | null;
}

/** Última unión hecha en esta sesión, para poder deshacerla. */
interface FusionHecha {
  principalCd: string;
  duplicadoCd: string;
  principalNombre: string;
  duplicadoNombre: string;
  deshaciendo: boolean;
  /** El servidor no pudo sincronizar el índice de búsqueda: el duplicado puede seguir apareciendo un rato. */
  indiceDesactualizado: boolean;
  error: string | null;
}

/**
 * Vista «Posibles duplicados» de Clientes (ticket 1462, D-667). Muestra grupos de fichas que parecen la misma
 * persona o empresa (mismo documento sin contar el dígito de verificación, o mismo nombre y mismo teléfono o
 * correo) con sus pedidos y saldo. Se abre desde la lista de Clientes con la bandera `calidadDatosClientes`,
 * para Administrador y Tesorería.
 *
 * Paso B: desde un grupo se pueden UNIR dos fichas (fusión por alias). Una pareja a la vez, con vista previa
 * obligatoria (qué se une y qué diferencias hay), decisión explícita en cada diferencia de cupo, plazo o tipo
 * de relación, confirmación y «Deshacer». La unión no toca pedidos, pagos ni facturas.
 *
 * El servidor revisa el índice por tandas (no toda la empresa a la vez): `siguiente` pide la tanda que sigue.
 */
@Component({
  selector: 'app-clientes-duplicados',
  templateUrl: './clientes-duplicados.component.html',
  styleUrls: ['./clientes-duplicados.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientesDuplicadosComponent implements OnInit, OnDestroy {
  /** Pide abrir la ficha de un cliente (la lista la abre con su ventana de edición). */
  @Output() abrir = new EventEmitter<{ cd: string }>();

  criterio: Criterio = 'documento';
  grupos: DuplicadoGrupo[] = [];
  siguiente: string | null = null;
  cargando = false;
  error = false;
  revisadas = 0;

  /** Unión que se está preparando; `null` si no hay ninguna. */
  fusion: FusionEnCurso | null = null;
  /** Tras deshacer: algún valor se había cambiado después de la unión y no se devolvió. */
  avisoDeshecho = false;

  /** Última unión hecha, con su «Deshacer». */
  ultimaFusion: FusionHecha | null = null;

  private sub?: Subscription;
  private subFusion?: Subscription;
  private tandasSinGrupos = 0;

  constructor(private servicio: ClientesListaService, private cdr: ChangeDetectorRef, private translate: TranslateService) {}

  ngOnInit(): void {
    this.reiniciar();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subFusion?.unsubscribe();
  }

  cambiarCriterio(criterio: Criterio): void {
    if (criterio === this.criterio) { return; }
    this.criterio = criterio;
    this.reiniciar();
  }

  reiniciar(): void {
    this.cancelarFusion();
    this.sub?.unsubscribe();
    this.grupos = [];
    this.siguiente = null;
    this.revisadas = 0;
    this.error = false;
    this.tandasSinGrupos = 0;
    this.cargar();
  }

  /** Revisa la tanda siguiente (o la primera). Si no trae grupos, sigue sola unas cuantas tandas más. */
  cargar(): void {
    this.sub?.unsubscribe();
    this.cargando = true;
    this.error = false;
    const criterio = this.criterio;
    this.sub = this.servicio.listarDuplicados(criterio, this.siguiente).subscribe({
      next: (pagina) => {
        if (criterio !== this.criterio) { return; }
        // Defensa: si una tanda trae un grupo que ya se muestra (mismo motivo, clave y fichas), no se repite.
        const vistos = new Set(this.grupos.map((g) => this.trackGrupo(0, g)));
        const nuevos = (pagina.grupos || []).filter((g) => !vistos.has(this.trackGrupo(0, g)));
        this.grupos = [...this.grupos, ...nuevos];
        this.revisadas += pagina.escaneadas || 0;
        this.siguiente = pagina.siguiente || null;
        this.tandasSinGrupos = nuevos.length ? 0 : this.tandasSinGrupos + 1;
        if (this.siguiente && this.tandasSinGrupos > 0 && this.tandasSinGrupos < TANDAS_AUTOMATICAS && !this.grupos.length) {
          this.cargar();
          return;
        }
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.error = true;
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  // ── Unir dos fichas (paso B) ────────────────────────────────────────────────────────────────

  /** Abre el panel de unión del grupo: por defecto se queda la ficha con más saldo (y más pedidos). */
  iniciarFusion(g: DuplicadoGrupo): void {
    if (g.fichas.length < 2) { return; }
    const orden = [...g.fichas].sort((a, b) => (b.saldo - a.saldo) || (b.pedidos - a.pedidos));
    this.subFusion?.unsubscribe();
    this.fusion = {
      grupo: this.trackGrupo(0, g),
      principalCd: orden[0].cd,
      duplicadoCd: orden[1].cd,
      vista: null,
      decisiones: {},
      trabajando: null,
      error: null,
    };
    this.cdr.markForCheck();
  }

  cancelarFusion(): void {
    this.subFusion?.unsubscribe();
    this.fusion = null;
    this.cdr.markForCheck();
  }

  fusionAbiertaEn(g: DuplicadoGrupo): boolean {
    return !!this.fusion && this.fusion.grupo === this.trackGrupo(0, g);
  }

  /** Cambiar de ficha invalida la vista previa: hay que volver a mirarla. */
  elegirPrincipal(g: DuplicadoGrupo, cd: string): void {
    if (!this.fusion) { return; }
    this.fusion.principalCd = cd;
    if (this.fusion.duplicadoCd === cd) {
      this.fusion.duplicadoCd = (g.fichas.find((f) => f.cd !== cd) || g.fichas[0]).cd;
    }
    this.reiniciarVista();
  }

  elegirDuplicado(g: DuplicadoGrupo, cd: string): void {
    if (!this.fusion) { return; }
    this.fusion.duplicadoCd = cd;
    if (this.fusion.principalCd === cd) {
      this.fusion.principalCd = (g.fichas.find((f) => f.cd !== cd) || g.fichas[0]).cd;
    }
    this.reiniciarVista();
  }

  private reiniciarVista(): void {
    if (!this.fusion) { return; }
    this.subFusion?.unsubscribe();
    this.fusion.vista = null;
    this.fusion.decisiones = {};
    this.fusion.error = null;
    this.fusion.trabajando = null;
    this.cdr.markForCheck();
  }

  /** Vista previa: no escribe nada. Pide de nuevo con las decisiones que ya se tomaron. */
  verVistaPrevia(): void {
    const f = this.fusion;
    if (!f || f.trabajando) { return; }
    f.trabajando = 'previa';
    f.error = null;
    this.subFusion?.unsubscribe();
    this.subFusion = this.servicio.previsualizarFusion(f.principalCd, f.duplicadoCd, f.decisiones).subscribe({
      next: (vista) => {
        if (this.fusion !== f) { return; }
        f.vista = vista;
        f.trabajando = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (this.fusion !== f) { return; }
        f.trabajando = null;
        f.error = this.claveError(err);
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  /** Una diferencia que el servidor deja decidir: cupo, plazo o tipo de relación. */
  llaveDecision(c: FusionChoque): 'cupo' | 'plazo' | 'relationType' | null {
    return c.codigo === 'CUPO' ? 'cupo' : c.codigo === 'PLAZO' ? 'plazo' : c.codigo === 'RELACION' ? 'relationType' : null;
  }

  decisionDe(c: FusionChoque): FusionElige | undefined {
    const llave = this.llaveDecision(c);
    return llave && this.fusion ? this.fusion.decisiones[llave] : undefined;
  }

  decidir(c: FusionChoque, eleccion: FusionElige): void {
    const llave = this.llaveDecision(c);
    if (!llave || !this.fusion) { return; }
    this.fusion.decisiones = { ...this.fusion.decisiones, [llave]: eleccion };
    this.cdr.markForCheck();
  }

  /** Hay diferencias de cupo, plazo o relación sin decidir. */
  get faltaDecidir(): boolean {
    const f = this.fusion;
    if (!f || !f.vista) { return false; }
    return f.vista.choques.some((c) => c.bloqueante && !this.decisionDe(c));
  }

  get puedeUnir(): boolean {
    const f = this.fusion;
    return !!f && !!f.vista && !f.trabajando && !this.faltaDecidir;
  }

  /** Une de verdad. El botón solo se habilita con la vista previa vista y todas las diferencias decididas. */
  confirmarFusion(g: DuplicadoGrupo): void {
    const f = this.fusion;
    if (!f || !this.puedeUnir) { return; }
    const principal = g.fichas.find((x) => x.cd === f.principalCd);
    const duplicado = g.fichas.find((x) => x.cd === f.duplicadoCd);
    f.trabajando = 'unir';
    f.error = null;
    this.subFusion?.unsubscribe();
    this.subFusion = this.servicio.fusionar(f.principalCd, f.duplicadoCd, f.decisiones).subscribe({
      next: (r) => {
        if (this.fusion !== f) { return; }
        this.ultimaFusion = {
          principalCd: f.principalCd,
          duplicadoCd: f.duplicadoCd,
          principalNombre: principal?.nombre || '',
          duplicadoNombre: duplicado?.nombre || '',
          deshaciendo: false,
          indiceDesactualizado: r?.indiceAlDia === false,
          error: null,
        };
        this.avisoDeshecho = false;
        this.fusion = null;
        this.sacarDelGrupo(g, f.duplicadoCd);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (this.fusion !== f) { return; }
        f.trabajando = null;
        f.error = this.claveError(err);
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  /** La ficha ya unida deja de ser un duplicado: sale del grupo, y el grupo se va si queda una sola ficha. */
  private sacarDelGrupo(g: DuplicadoGrupo, cd: string): void {
    const fichas = g.fichas.filter((f) => f.cd !== cd);
    this.grupos = fichas.length < 2
      ? this.grupos.filter((x) => x !== g)
      : this.grupos.map((x) => (x === g ? { ...g, fichas, totalFichas: Math.max(0, g.totalFichas - 1) } : x));
  }

  deshacerUltima(): void {
    const u = this.ultimaFusion;
    if (!u || u.deshaciendo) { return; }
    u.deshaciendo = true;
    u.error = null;
    this.subFusion?.unsubscribe();
    this.subFusion = this.servicio.deshacerFusion(u.principalCd, u.duplicadoCd).subscribe({
      next: (r) => {
        this.ultimaFusion = null;
        // Si algún valor (cupo, plazo, tipo de relación o cobro) se cambió después de la unión, se dejó como está.
        this.avisoDeshecho = !!(r?.noRestaurado && r.noRestaurado.length);
        this.reiniciar();
      },
      error: (err) => {
        u.deshaciendo = false;
        u.error = this.claveError(err);
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  cerrarUltima(): void {
    this.ultimaFusion = null;
    this.cdr.markForCheck();
  }

  cerrarAvisoDeshecho(): void {
    this.avisoDeshecho = false;
    this.cdr.markForCheck();
  }

  private claveError(err: any): string {
    const codigo = err && err.error && typeof err.error.code === 'string' ? err.error.code : '';
    return ERRORES_FUSION[codigo] || 'generico';
  }

  /** Nombre de la ficha para mostrarlo en el panel. */
  fichaDe(g: DuplicadoGrupo, cd: string): DuplicadoFicha | undefined {
    return g.fichas.find((f) => f.cd === cd);
  }

  /** Valor de una diferencia, listo para mostrarlo: cupo en pesos, plazo en días, relación con su nombre. */
  valorChoque(c: FusionChoque, lado: 'principal' | 'duplicado'): string {
    const v = c[lado];
    if (v === undefined || v === null) { return ''; }
    if (c.codigo === 'CUPO') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0);
    }
    if (c.codigo === 'PLAZO') { return String(v); }
    const clave = this.claveRelacion(v);
    return clave ? this.translate.instant(clave) : String(v);
  }

  /** Clave de texto del tipo de relación (cliente, socio, empleado o empresa); otro valor se muestra tal cual. */
  claveRelacion(valor: unknown): string | null {
    return ['customer', 'partner', 'employee', 'company'].includes(String(valor)) ? `ventas.clientesDuplicados.fusion.relacion.${valor}` : null;
  }

  verFicha(cd: string): void {
    this.abrir.emit({ cd });
  }

  trackGrupo(_: number, g: DuplicadoGrupo): string {
    return `${g.motivo}:${g.clave}:${g.fichas.map((f) => f.cd).join(',')}`;
  }

  trackFicha(_: number, f: { cd: string }): string {
    return f.cd;
  }

  get hayMas(): boolean {
    return !!this.siguiente && !this.cargando;
  }

  get terminado(): boolean {
    return !this.siguiente && !this.cargando && !this.error;
  }
}
