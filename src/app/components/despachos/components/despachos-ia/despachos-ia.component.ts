import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LogisticaServiceV2 } from '../../../../shared/services/despachos/logistica.service.v2';
import { OpttiaChatService } from '../../../../shared/services/opttia-chat.service';
import { AvisoDespacho, DispatchInsights, ExplicacionDespachos, FilaCola, TramoCola } from './despachos-ia.modelos';

const TRAMOS: Record<TramoCola, { texto: string; clase: string }> = {
  vencido_reciente: { texto: 'Vencido', clase: 'is-danger' },
  hoy: { texto: 'Hoy', clase: 'is-warning' },
  manana: { texto: 'Mañana', clase: 'is-info' },
  atrasado: { texto: 'Atrasado', clase: 'is-slate' },
};

const AVISOS: Record<AvisoDespacho['tipo'], string> = {
  problema_transportadora: 'Problema de entrega',
  estancado: 'Empacado sin salir',
  sin_destino: 'Sin dirección',
  sin_transportador: 'Sin transportador',
  sin_fecha: 'Sin fecha',
  vencido_viejo: 'Vencido hace días',
};

/**
 * IA de despachos (openspec/changes/despachos-ia-util): qué despachar hoy, despachados sin
 * cerrar con la plata por cobrar y avisos. Reemplaza las "Recomendaciones KAI" fijas.
 * Al abrir trae lo calculado (sin cupo); "Explicar con Opttia" pide las frases.
 */
@Component({
  selector: 'app-despachos-ia',
  templateUrl: './despachos-ia.component.html',
  styleUrls: ['../../../inventarios/central-abastecimiento/insights.shared.scss', './despachos-ia.component.scss']
})
export class DespachosIaComponent implements OnInit, OnDestroy {
  @Output() cerrar = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  cargando = false;
  explicando = false;
  error: string | null = null;
  insights: DispatchInsights | null = null;
  ia: ExplicacionDespachos | null = null;
  avisoIA: string | null = null;

  readonly preguntas = [
    '¿Qué despacho primero hoy?',
    '¿Qué transportador tiene más plata por cobrar?',
    '¿Qué pedidos despachados no se han cerrado?',
  ];

  constructor(private logistica: LogisticaServiceV2, private opttia: OpttiaChatService) {}

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
    this.logistica.getDispatchInsights().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.insights = r.insights; this.cargando = false; },
      error: (e) => {
        this.error = e?.error?.error || 'No pudimos revisar los despachos en este momento. Intente de nuevo en unos minutos.';
        this.cargando = false;
      },
    });
  }

  explicar(): void {
    if (this.explicando) return;
    this.explicando = true;
    this.avisoIA = null;
    this.logistica.explicarDispatchInsights().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.insights = r.insights; this.ia = r.ia || null; this.avisoIA = r.aviso || null; this.explicando = false; },
      error: (e) => {
        this.avisoIA = e?.status === 429 || e?.status === 403
          ? (e?.error?.message || 'Se acabaron los mensajes de Opttia de su plan por hoy. Las cifras siguen siendo correctas.')
          : 'Opttia no está disponible ahora; las cifras son las calculadas.';
        this.explicando = false;
      },
    });
  }

  preguntar(p: string): void {
    this.opttia.askFromScreen(p);
  }

  dinero(v: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
  }

  tramo(f: FilaCola): { texto: string; clase: string } {
    return TRAMOS[f.tramo];
  }

  tipoAviso(a: AvisoDespacho): string {
    return AVISOS[a.tipo] || a.tipo;
  }

  claseAviso(a: AvisoDespacho): string {
    const p = this.ia?.avisos?.[a.id]?.prioridad;
    if (p === 'alta' || a.tipo === 'problema_transportadora') return 'is-danger';
    return p === 'baja' ? 'is-slate' : 'is-warning';
  }

  get paraHoy(): number {
    const t = this.insights?.cola.porTramo;
    return t ? (t.hoy || 0) + (t.vencido_reciente || 0) : 0;
  }
}
