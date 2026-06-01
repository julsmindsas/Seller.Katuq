import { Component, Input } from '@angular/core';
import { EChartsOption } from 'echarts';
import { ReportResult, VizType } from '../../model/report-spec.interfaces';

@Component({
  selector: 'app-viz-chart',
  template: `
    <div *ngIf="chartOption" echarts [options]="chartOption" class="chart-host"></div>
    <div *ngIf="!chartOption" class="chart-empty">Sin datos suficientes para graficar</div>
  `,
  styles: [
    `
      .chart-host {
        height: 480px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 12px;
      }
      .chart-empty {
        text-align: center;
        padding: 64px;
        color: #9ca3af;
      }
    `,
  ],
})
export class VizChartComponent {
  private _result: ReportResult | null = null;
  private _chartType: VizType = 'bar';
  chartOption: EChartsOption | null = null;

  @Input() set result(r: ReportResult | null) {
    this._result = r;
    this.compute();
  }

  @Input() set chartType(t: VizType) {
    this._chartType = t;
    this.compute();
  }

  private compute(): void {
    if (!this._result || this._result.rows.length === 0) {
      this.chartOption = null;
      return;
    }
    const cols = this._result.columns;
    const hasAxis = cols.some((c) => !!c.axis);
    const rowDims = hasAxis
      ? cols.filter((c) => c.axis === 'row')
      : cols.filter((c) => c.type === 'dimension');
    const colDims = hasAxis ? cols.filter((c) => c.axis === 'col') : [];
    const measures = cols.filter((c) => c.type === 'measure');

    if (rowDims.length === 0 && colDims.length === 0) {
      this.chartOption = null;
      return;
    }
    if (measures.length === 0) {
      this.chartOption = null;
      return;
    }

    // X-axis = primera row-dim. Si no hay row-dims (solo cols), usar la primera col-dim.
    const xDim = rowDims[0] || colDims[0];
    const isPivot = colDims.length > 0 && rowDims.length > 0;

    // Labels del eje X: valores únicos de xDim, en orden de aparición.
    const labelMap = new Map<string, string>();
    for (const r of this._result.rows) {
      const raw = String(r[xDim.field] ?? '');
      if (!labelMap.has(raw)) {
        labelMap.set(raw, this.formatLabel(raw, xDim));
      }
    }
    const xKeys = Array.from(labelMap.keys());
    const labels = xKeys.map((k) => labelMap.get(k)!);

    if (this._chartType === 'pie') {
      // Pie: simple — primera measure agrupada por xDim (ignora pivot).
      const m = measures[0];
      const agg = new Map<string, number>();
      for (const r of this._result.rows) {
        const k = String(r[xDim.field] ?? '');
        agg.set(k, (agg.get(k) || 0) + (Number(r[m.field]) || 0));
      }
      this.chartOption = {
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [
          {
            name: m.label,
            type: 'pie',
            radius: ['40%', '70%'],
            data: Array.from(agg.entries()).map(([k, v]) => ({
              name: this.formatLabel(k, xDim),
              value: v,
            })),
          },
        ],
      };
      return;
    }

    // Bar/line — si hay col-dims, una serie por combinación de col-values × measure.
    // Si no hay col-dims, una serie por measure (comportamiento legacy).
    let series: { name: string; data: number[] }[] = [];
    if (isPivot) {
      // Combinaciones únicas de col-values en orden.
      const seenCombos = new Set<string>();
      const combos: string[][] = [];
      for (const r of this._result.rows) {
        const vals = colDims.map((d) => String(r[d.field] ?? ''));
        const key = vals.join('||');
        if (!seenCombos.has(key)) {
          seenCombos.add(key);
          combos.push(vals);
        }
      }
      combos.sort((a, b) => a.join('||').localeCompare(b.join('||')));

      for (const combo of combos) {
        const comboLabel = combo.map((v, i) => this.formatLabel(v, colDims[i])).join(' / ');
        for (const m of measures) {
          const seriesName = measures.length > 1 ? `${comboLabel} · ${m.label}` : comboLabel;
          const data = xKeys.map((xKey) => {
            // Buscar la fila que matchea xKey + combo
            const match = this._result!.rows.find((r) => {
              if (String(r[xDim.field] ?? '') !== xKey) return false;
              for (let i = 0; i < colDims.length; i++) {
                if (String(r[colDims[i].field] ?? '') !== combo[i]) return false;
              }
              return true;
            });
            return match ? Number(match[m.field]) || 0 : 0;
          });
          series.push({ name: seriesName, data });
        }
      }
    } else {
      series = measures.map((m) => ({
        name: m.label,
        data: xKeys.map((xKey) => {
          // Sumar todas las filas con este xKey (por si hay duplicados).
          let total = 0;
          for (const r of this._result!.rows) {
            if (String(r[xDim.field] ?? '') === xKey) total += Number(r[m.field]) || 0;
          }
          return total;
        }),
      }));
    }

    this.chartOption = {
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll' },
      grid: { left: '3%', right: '3%', bottom: '8%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value' },
      series: series.map((s) => ({
        name: s.name,
        type: this._chartType,
        data: s.data,
        smooth: this._chartType === 'line',
      })) as EChartsOption['series'],
    };
  }

  private formatLabel(raw: string, dim: { dataType: string }): string {
    if (dim.dataType === 'date') {
      const dayM = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dayM) return `${dayM[3]}/${dayM[2]}/${dayM[1]}`;
      const monM = raw.match(/^(\d{4})-(\d{2})$/);
      if (monM) return `${monM[2]}/${monM[1]}`;
    }
    return raw;
  }
}
