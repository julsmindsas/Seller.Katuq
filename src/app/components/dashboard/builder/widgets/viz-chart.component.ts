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
    const dims = this._result.columns.filter((c) => c.type === 'dimension');
    const measures = this._result.columns.filter((c) => c.type === 'measure');
    if (dims.length === 0 || measures.length === 0) {
      this.chartOption = null;
      return;
    }
    const xDim = dims[0];
    const labels = this._result.rows.map((r) => String(r[xDim.field] ?? ''));

    if (this._chartType === 'pie') {
      const m = measures[0];
      this.chartOption = {
        tooltip: { trigger: 'item' },
        legend: { orient: 'vertical', left: 'left' },
        series: [
          {
            name: m.label,
            type: 'pie',
            radius: ['40%', '70%'],
            data: this._result.rows.map((r) => ({
              name: String(r[xDim.field] ?? ''),
              value: Number(r[m.field] ?? 0),
            })),
          },
        ],
      };
      return;
    }

    const series = measures.map((m) => ({
      name: m.label,
      type: this._chartType,
      data: this._result!.rows.map((r) => Number(r[m.field] ?? 0)),
      smooth: this._chartType === 'line',
    })) as EChartsOption['series'];

    this.chartOption = {
      tooltip: { trigger: 'axis' },
      legend: {},
      grid: { left: '3%', right: '3%', bottom: '8%', containLabel: true },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: labels.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value' },
      series,
    };
  }
}
