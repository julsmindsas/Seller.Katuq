import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportVizModule } from '../../../shared/report-viz/report-viz.module';
import { ModuloIaComponent } from '../../../shared/components/modulo-ia/modulo-ia.component';
import { NpsService } from '../../../shared/services/nps/nps.service';
import { SegmentoNps } from '../../../shared/services/feedback/feedback.models';
import { AdicionalTablero, CanalEncuesta, Encuesta, TableroNps } from '../../../shared/services/nps/nps.models';
import {
  NOMBRE_CANAL, NOMBRE_ESTADO_CASO, NOMBRE_SEGMENTO, casoAbierto, esAdministradorSesion, fechaCorta, mensajeError,
} from '../nps-comun';

type FiltroSegmento = 'todos' | SegmentoNps;
type Comentario = TableroNps['comentarios'][number];

const SEGMENTOS: SegmentoNps[] = ['promotor', 'pasivo', 'detractor'];
/** Colores semánticos del design system: éxito, gris (muted-2) y peligro. */
const COLOR_SEGMENTO: Record<SegmentoNps, string> = { promotor: '#1E874B', pasivo: '#9995b3', detractor: '#D64545' };
const PAGINA = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Pestaña Resultados del módulo NPS (D-490): lo que era "Satisfacción de clientes" (D-483),
 * ahora de cada comercio y filtrable por encuesta y canal, con las respuestas adicionales y
 * el paso del comentario del detractor a su caso. Todo sale de `/v1/nps/tablero`, que
 * calcula con la empresa de la sesión.
 */
@Component({
  selector: 'app-nps-resultados',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReportVizModule, ModuloIaComponent],
  templateUrl: './resultados.component.html',
  styleUrls: ['./resultados.component.scss'],
})
export class ResultadosComponent implements OnInit, OnDestroy {
  readonly SEGMENTOS = SEGMENTOS;
  readonly PAGINA = PAGINA;
  readonly COLOR_LINEA = ['#5F3FE0'];
  readonly NOMBRE = NOMBRE_SEGMENTO;
  readonly NOMBRE_CANAL = NOMBRE_CANAL;
  readonly NOMBRE_ESTADO_CASO = NOMBRE_ESTADO_CASO;
  readonly NOMBRE_PLURAL: Record<SegmentoNps, string> = {
    promotor: 'Promotores (9 y 10)',
    pasivo: 'Pasivos (7 y 8)',
    detractor: 'Detractores (0 a 6)',
  };
  readonly filtrosSegmento: { key: FiltroSegmento; label: string }[] = [
    { key: 'todos', label: 'Todas' },
    { key: 'promotor', label: 'Promotores' },
    { key: 'pasivo', label: 'Pasivos' },
    { key: 'detractor', label: 'Detractores' },
  ];
  readonly periodos = [
    { dias: 90, label: 'Últimos 90 días' },
    { dias: 30, label: 'Último mes' },
    { dias: 7, label: 'Última semana' },
  ];
  /** Las pruebas (respuestas de Julsmind y FLORECER) solo existen en la encuesta a comercios. */
  readonly esJulsmind = this.empresaSesion() === 'julsmind';

  tablero: TableroNps | null = null;
  cargando = false;
  error: string | null = null;

  encuestas: Encuesta[] = [];
  canales: CanalEncuesta[] = ['entrega', 'enlace'];
  encuestaId = '';
  canal: CanalEncuesta | '' = '';
  conPruebas = false;

  filtroSegmento: FiltroSegmento = 'todos';
  periodo = 90;
  soloConComentario = false;
  visibles = PAGINA;
  filtrados: Comentario[] = [];
  conteo: Record<FiltroSegmento, number> = { todos: 0, promotor: 0, pasivo: 0, detractor: 0 };
  /** Colores de la torta, solo de los segmentos que tienen respuestas (en su mismo orden). */
  coloresReparto: string[] = [];
  /** Textos de cada adicional que se muestran completos. */
  textosAbiertos = new Set<string>();

  private destroy$ = new Subject<void>();

  constructor(private nps: NpsService, private router: Router) {}

  get totalReparto(): number {
    const r = this.tablero?.reparto;
    return r ? r.promotor + r.pasivo + r.detractor : 0;
  }

  get encuestaElegida(): Encuesta | undefined {
    return this.encuestas.find((e) => e.id === this.encuestaId);
  }

  ngOnInit(): void {
    // El tablero y las encuestas solo los lee la familia Administrador (el servidor responde
    // 403, y el interceptor lo anunciaría como límite de plan).
    // Quien no es administrador entra al módulo por lo suyo: sus casos.
    if (!esAdministradorSesion()) {
      this.router.navigate(['/nps/seguimiento'], { replaceUrl: true });
      return;
    }
    this.cargarEncuestas();
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Para el filtro; si falla, Resultados sigue sin él. */
  private cargarEncuestas(): void {
    this.nps.encuestas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.encuestas = r?.encuestas || [];
        if (this.encuestas.some((e) => e.canal === 'seller')) this.canales = ['entrega', 'enlace', 'seller'];
      },
      error: () => { this.encuestas = []; },
    });
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.nps.tablero({ pruebas: this.conPruebas, encuesta: this.encuestaId, canal: this.canal })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.tablero = r?.tablero || null;
          this.cargando = false;
          this.textosAbiertos.clear();
          this.coloresReparto = SEGMENTOS.filter((s) => (this.tablero?.reparto?.[s] || 0) > 0).map((s) => COLOR_SEGMENTO[s]);
          this.aplicarFiltros();
        },
        error: (e) => {
          this.cargando = false;
          this.tablero = null;
          this.error = e?.status === 403
            ? 'Los resultados los ven los administradores de tu empresa.'
            : mensajeError(e, 'No pudimos calcular los resultados en este momento. Intenta de nuevo en unos minutos.');
        },
      });
  }

  /** Al escoger una encuesta, el canal queda el de ella. */
  cambiarEncuesta(): void {
    const e = this.encuestaElegida;
    if (e) this.canal = e.canal;
    this.cargar();
  }

  cambiarCanal(): void {
    const e = this.encuestaElegida;
    if (e && this.canal && e.canal !== this.canal) this.encuestaId = '';
    this.cargar();
  }

  filtrarSegmento(s: FiltroSegmento): void {
    this.filtroSegmento = s;
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const desde = Date.now() - this.periodo * DIA_MS;
    const base = (this.tablero?.comentarios || []).filter((c) => {
      const t = Date.parse(c.fecha);
      return (isNaN(t) || t >= desde) && (!this.soloConComentario || !!c.comentario);
    });
    this.conteo = { todos: base.length, promotor: 0, pasivo: 0, detractor: 0 };
    for (const c of base) if (c.segmento in this.conteo) this.conteo[c.segmento] += 1;
    this.filtrados = this.filtroSegmento === 'todos' ? base : base.filter((c) => c.segmento === this.filtroSegmento);
    this.visibles = PAGINA;
  }

  verMas(): void {
    this.visibles += PAGINA;
  }

  /** Color del NPS: negativo peligro, 0 a 29 aviso, 30 o más éxito. */
  tonoNps(n: number | null): string {
    if (n === null) return '';
    return n < 0 ? 'is-peligro' : n < 30 ? 'is-aviso' : 'is-exito';
  }

  pct(s: SegmentoNps): number {
    const total = this.totalReparto;
    return total ? Math.round(((this.tablero?.reparto[s] || 0) * 100) / total) : 0;
  }

  /** Porcentaje exacto para el ancho de la barra (los enteros pueden no sumar 100). */
  ancho(s: SegmentoNps): number {
    const total = this.totalReparto;
    return total ? ((this.tablero?.reparto[s] || 0) * 100) / total : 0;
  }

  get textoReparto(): string {
    return SEGMENTOS.map((s) => `${this.NOMBRE_PLURAL[s]}: ${this.pct(s)}%`).join(', ');
  }

  /** Total de respuestas de una pregunta de opción, para el ancho de cada barra. */
  totalOpciones(a: AdicionalTablero): number {
    return (a.conteo || []).reduce((s, o) => s + (o.n || 0), 0);
  }

  pctOpcion(a: AdicionalTablero, n: number): number {
    const total = this.totalOpciones(a);
    return total ? Math.round((n * 100) / total) : 0;
  }

  alternarTextos(id: string): void {
    if (this.textosAbiertos.has(id)) this.textosAbiertos.delete(id);
    else this.textosAbiertos.add(id);
  }

  /** El caso solo existe para los detractores que no son de prueba. */
  tieneCaso(c: Comentario): boolean {
    return c.segmento === 'detractor' && !!c.casoEstado;
  }

  casoAbierto(c: Comentario): boolean {
    return casoAbierto(c.casoEstado);
  }

  fecha(iso: string): string {
    return fechaCorta(iso);
  }

  metaDe(c: Comentario): string {
    return [c.empresa, c.rol, c.plan ? `Plan ${c.plan}` : null].filter(Boolean).join(' · ');
  }

  porId(_: number, c: Comentario): string {
    return c.id;
  }

  private empresaSesion(): string {
    try {
      return String(JSON.parse(localStorage.getItem('user') || '{}')?.company || '').trim().toLowerCase();
    } catch {
      return '';
    }
  }
}
