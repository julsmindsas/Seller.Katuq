import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import type { EChartsOption } from 'echarts';

import { AnalyticsService } from '../../../../shared/services/dashboard/analytics.service';
import {
  DashboardCoreResponse,
  KPIsCriticos,
  TicketPromedioCanal,
} from '../../../../components/dashboard/model/dashboard-interfaces';
import { CrmService } from '../../../../components/crm/services/crm.service';
import { CrmStage, CrmStats } from '../../../../components/crm/models/crm.models';
import { MarketingService } from '../../services/marketing.service';

interface FunnelRow {
  label: string;
  count: number;
  pct: number; // % relativo a la etapa con más leads (ancho de barra)
  color?: string;
  isWon?: boolean;
}

/**
 * Dashboard de Marketing (spec 022 — MVP read-only).
 *
 * Regla dura de la spec: SOLO métricas reales. Por eso NO consume
 * `/v1/analytics/marketing` (CAC/ROI con gasto inventado y efectividad de
 * canales hardcodeada) — consume dashboard-core (ventas/pedidos reales,
 * multi-tenant), /v1/crm/stats (embudo real) y /v1/whatsapp/conversations
 * (actividad real del canal). Cada tarjeta carga y falla por separado.
 */
@Component({
  selector: 'app-marketing-dashboard',
  templateUrl: './marketing-dashboard.component.html',
  styleUrls: ['./marketing-dashboard.component.scss'],
})
export class MarketingDashboardComponent implements OnInit {
  // Rango de fechas (default: últimos 30 días)
  fechaInicio = '';
  fechaFin = '';
  /** Pill de rango activa (mockup Marketing y WhatsApp): 7d/30d/90d o rango manual. */
  rango: '7d' | '30d' | '90d' | 'custom' = '30d';

  // --- Tarjetas: ventas/pedidos (dashboard-core) ---
  loadingCore = false;
  errorCore = false;
  kpis: KPIsCriticos | null = null;
  canales: TicketPromedioCanal[] = [];
  /** % de la barra de cada canal, relativo al canal top (paralelo a `canales`). */
  canalesPct: number[] = [];
  ventasChartOptions: EChartsOption | null = null;

  // --- Tarjeta: embudo CRM ---
  loadingCrm = false;
  errorCrm = false;
  funnel: FunnelRow[] = [];
  crmStats: CrmStats | null = null;

  // --- Tarjeta: actividad WhatsApp ---
  loadingWa = false;
  errorWa = false;
  waTotal = 0;
  waSinResponder = 0;

  constructor(
    private analytics: AnalyticsService,
    private crm: CrmService,
    private marketing: MarketingService,
  ) {}

  ngOnInit(): void {
    this.setRango('30d');
  }

  /** Cambia el período con las pills del mockup; 'custom' muestra los inputs de fecha. */
  setRango(r: '7d' | '30d' | '90d' | 'custom'): void {
    this.rango = r;
    if (r === 'custom') return; // el usuario elige fechas y presiona Aplicar
    const dias = r === '7d' ? 7 : r === '30d' ? 30 : 90;
    const hoy = new Date();
    const desde = new Date();
    desde.setDate(hoy.getDate() - dias);
    this.fechaFin = this.toIsoDay(hoy);
    this.fechaInicio = this.toIsoDay(desde);
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargarCore();
    this.cargarCrm();
    this.cargarWhatsapp();
  }

  // ---------------------------------------------------------------------
  // Ventas / pedidos del período (fuente: /v1/analytics/dashboard-core)
  // ---------------------------------------------------------------------
  private cargarCore(): void {
    if (!this.fechaInicio || !this.fechaFin) return;
    this.loadingCore = true;
    this.errorCore = false;

    this.analytics.getDashboardCore(this.fechaInicio, this.fechaFin).subscribe({
      next: (core: DashboardCoreResponse) => {
        this.kpis = core?.kpis || null;
        this.canales = (core?.ticketPromedioPorCanal || []).slice(0, 6);
        // Ancho de barra por canal, relativo al canal que más vende (mockup).
        const maxCanal = Math.max(1, ...this.canales.map((c) => c.ventas || 0));
        this.canalesPct = this.canales.map((c) =>
          Math.max(2, Math.round(((c.ventas || 0) / maxCanal) * 100)),
        );
        this.ventasChartOptions = this.buildVentasChart(core);
        this.loadingCore = false;
      },
      error: () => {
        this.errorCore = true;
        this.loadingCore = false;
      },
    });
  }

  private buildVentasChart(core: DashboardCoreResponse): EChartsOption | null {
    const serie = core?.ventasPorPeriodo || [];
    if (serie.length === 0) return null;
    // Barras violeta del mockup: los días pico en acento pleno, el resto en lila.
    const max = Math.max(1, ...serie.map((d) => d.ventas));
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v: any) =>
          `$${Math.round(Number(v) || 0).toLocaleString('es-CO')}`,
      },
      grid: { left: 44, right: 8, top: 16, bottom: 26 },
      xAxis: {
        type: 'category',
        data: serie.map((d) => d.fecha.slice(5)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 10, color: '#a7a3bd', interval: 'auto' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0eef7' } },
        axisLabel: {
          fontSize: 10,
          color: '#a7a3bd',
          formatter: (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}k`),
        },
      },
      series: [
        {
          name: 'Ventas',
          type: 'bar',
          barMaxWidth: 18,
          itemStyle: {
            borderRadius: [4, 4, 2, 2],
            color: (p: any) => (p.value >= max * 0.85 ? '#6a4dfb' : '#c0aeff'),
          },
          data: serie.map((d) => d.ventas),
        },
      ],
    };
  }

  // ---------------------------------------------------------------------
  // Embudo CRM (fuente: /v1/crm/stages + /v1/crm/stats — spec 011)
  // ---------------------------------------------------------------------
  private cargarCrm(): void {
    this.loadingCrm = true;
    this.errorCrm = false;

    forkJoin({
      stages: this.crm.getStages().pipe(catchError(() => of({ stages: [] as CrmStage[], entityType: '' }))),
      stats: this.crm.getStats().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ stages, stats }) => {
        this.crmStats = stats;
        this.funnel = this.buildFunnel(stages?.stages || [], stats);
        this.errorCrm = !stats;
        this.loadingCrm = false;
      },
      error: () => {
        this.errorCrm = true;
        this.loadingCrm = false;
      },
    });
  }

  private buildFunnel(stages: CrmStage[], stats: CrmStats | null): FunnelRow[] {
    if (!stats || !stats.byStage) return [];
    const byStage = stats.byStage;

    // Etapas configuradas primero (orden del pipeline); llaves sueltas al final.
    const ordered: FunnelRow[] = [];
    const seen = new Set<string>();
    for (const st of stages.filter((s) => s.active !== false)) {
      const count = byStage[st.key] || 0;
      ordered.push({ label: st.label || st.key, count, pct: 0, color: st.color, isWon: st.isWon });
      seen.add(st.key);
    }
    for (const key of Object.keys(byStage)) {
      if (!seen.has(key)) ordered.push({ label: key, count: byStage[key], pct: 0 });
    }

    const max = Math.max(1, ...ordered.map((r) => r.count));
    return ordered.map((r) => ({ ...r, pct: Math.round((r.count / max) * 100) }));
  }

  // ---------------------------------------------------------------------
  // Actividad WhatsApp (fuente: /v1/whatsapp/conversations — specs 009.x)
  // ---------------------------------------------------------------------
  private cargarWhatsapp(): void {
    this.loadingWa = true;
    this.errorWa = false;

    this.marketing.getWhatsappActivity().subscribe({
      next: (page) => {
        this.waTotal = page?.totalCount || 0;
        // Solo cuenta sobre los hilos retornados (recientes) — se etiqueta así en la UI.
        this.waSinResponder = (page?.items || []).filter((t) => (t.unreadCount || 0) > 0).length;
        this.loadingWa = false;
      },
      error: () => {
        this.errorWa = true;
        this.loadingWa = false;
      },
    });
  }

  // ---------------------------------------------------------------------
  private toIsoDay(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
