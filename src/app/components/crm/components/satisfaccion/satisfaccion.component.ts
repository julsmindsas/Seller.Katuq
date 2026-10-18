import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ReportVizModule } from '../../../../shared/report-viz/report-viz.module';
import { ModuloIaComponent } from '../../../../shared/components/modulo-ia/modulo-ia.component';
import { FeedbackService } from '../../../../shared/services/feedback/feedback.service';
import { NpsComentario, NpsTablero, SegmentoNps } from '../../../../shared/services/feedback/feedback.models';

type FiltroSegmento = 'todos' | SegmentoNps;

const SEGMENTOS: SegmentoNps[] = ['promotor', 'pasivo', 'detractor'];
/** Colores semánticos del design system: éxito, gris (muted-2) y peligro. */
const COLOR_SEGMENTO: Record<SegmentoNps, string> = { promotor: '#1E874B', pasivo: '#9995b3', detractor: '#D64545' };
const PAGINA = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * "Satisfacción de clientes" (D-483): NPS de 90 días, tendencia, reparto y comentarios de
 * la empresa que recibe las opiniones (en la fase 1, Julsmind). Todo sale de
 * `/v1/nps/tablero`, que corre el motor de reportes con la empresa de la sesión; los
 * widgets son los del constructor de reportes.
 */
@Component({
  selector: 'app-satisfaccion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportVizModule, ModuloIaComponent],
  templateUrl: './satisfaccion.component.html',
  styleUrls: ['./satisfaccion.component.scss'],
})
export class SatisfaccionComponent implements OnInit, OnDestroy {
  readonly SEGMENTOS = SEGMENTOS;
  readonly PAGINA = PAGINA;
  readonly COLOR_LINEA = ['#5F3FE0'];
  readonly NOMBRE: Record<SegmentoNps, string> = { promotor: 'Promotor', pasivo: 'Pasivo', detractor: 'Detractor' };
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

  tablero: NpsTablero | null = null;
  cargando = false;
  error: string | null = null;
  conPruebas = false;

  filtroSegmento: FiltroSegmento = 'todos';
  periodo = 90;
  soloConComentario = false;
  visibles = PAGINA;
  filtrados: NpsComentario[] = [];
  conteo: Record<FiltroSegmento, number> = { todos: 0, promotor: 0, pasivo: 0, detractor: 0 };
  /** Colores de la torta, solo de los segmentos que tienen respuestas (en su mismo orden). */
  coloresReparto: string[] = [];

  private destroy$ = new Subject<void>();
  private formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

  constructor(private feedback: FeedbackService) {}

  get totalReparto(): number {
    const r = this.tablero?.reparto;
    return r ? r.promotor + r.pasivo + r.detractor : 0;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.feedback.tablero(this.conPruebas).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.tablero = r?.tablero || null;
        this.cargando = false;
        this.visibles = PAGINA;
        this.coloresReparto = SEGMENTOS.filter((s) => (this.tablero?.reparto?.[s] || 0) > 0).map((s) => COLOR_SEGMENTO[s]);
        this.aplicarFiltros();
      },
      error: (e) => {
        this.cargando = false;
        this.tablero = null;
        this.error = e?.status === 403
          ? 'Esta información la ven los administradores.'
          : (e?.error?.error || 'No pudimos calcular la satisfacción en este momento. Intenta de nuevo en unos minutos.');
      },
    });
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

  /** Porcentaje entero para mostrar. */
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

  fecha(iso: string): string {
    const t = Date.parse(iso);
    return isNaN(t) ? '' : this.formatoFecha.format(new Date(t));
  }

  metaDe(c: NpsComentario): string {
    return [c.empresa, c.rol, c.plan ? `Plan ${c.plan}` : null].filter(Boolean).join(' · ');
  }

  porId(_: number, c: NpsComentario): string {
    return c.id;
  }
}
