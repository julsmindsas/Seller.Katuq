/**
 * KatuqChart Component
 *
 * Displays various chart types using Chart.js.
 */

import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { KatuqChartProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

declare var Chart: any;

@Component({
  selector: 'app-katuq-chart',
  template: `
    <div class="katuq-chart">
      <div class="chart-header" *ngIf="title">
        <h4>{{ title }}</h4>
      </div>
      <div class="chart-container">
        <canvas #chartCanvas></canvas>
      </div>
    </div>
  `,
  styles: [`
    .katuq-chart {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .chart-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .chart-header h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .chart-container {
      padding: 1rem;
      height: 250px;
      position: relative;
    }

    .chart-container canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqChartComponent implements AfterViewInit, OnChanges {
  @Input() props: KatuqChartProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: any = null;
  private chartLoaded = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.loadChartJs().then(() => {
      this.chartLoaded = true;
      this.renderChart();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chartLoaded && (changes['props'] || changes['dataModel'])) {
      this.renderChart();
    }
  }

  get title(): string | null {
    return this.resolve(this.props?.title);
  }

  get chartType(): string {
    return this.resolve(this.props?.chartType) || 'bar';
  }

  get chartData(): any[] {
    return this.resolve(this.props?.data) || [];
  }

  get showLegend(): boolean {
    const value = this.resolve(this.props?.showLegend);
    return value !== false;
  }

  private async loadChartJs(): Promise<void> {
    if (typeof Chart !== 'undefined') {
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  private renderChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.chartData;
    if (!data || data.length === 0) return;

    // Prepare chart data
    const labels = data.map(d => d.name || d.label || '');
    const values = data.map(d => d.value || d.cantidad || d.total || 0);
    const colors = data.map(d => d.color || this.getDefaultColor(data.indexOf(d)));

    const chartConfig: any = {
      type: this.mapChartType(this.chartType),
      data: {
        labels,
        datasets: [{
          label: this.title || 'Data',
          data: values,
          backgroundColor: colors,
          borderColor: this.chartType === 'line' ? colors[0] : colors,
          borderWidth: this.chartType === 'line' ? 2 : 1,
          fill: this.chartType === 'area',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: this.showLegend && ['pie', 'doughnut'].includes(this.chartType)
          }
        },
        scales: this.getScalesConfig()
      }
    };

    this.chart = new Chart(ctx, chartConfig);
  }

  private mapChartType(type: string): string {
    const typeMap: Record<string, string> = {
      'bar': 'bar',
      'line': 'line',
      'pie': 'pie',
      'doughnut': 'doughnut',
      'area': 'line'
    };
    return typeMap[type] || 'bar';
  }

  private getScalesConfig(): any {
    if (['pie', 'doughnut'].includes(this.chartType)) {
      return {};
    }

    return {
      y: {
        beginAtZero: true,
        title: {
          display: !!this.resolve(this.props?.yAxisLabel),
          text: this.resolve(this.props?.yAxisLabel)
        }
      },
      x: {
        title: {
          display: !!this.resolve(this.props?.xAxisLabel),
          text: this.resolve(this.props?.xAxisLabel)
        }
      }
    };
  }

  private getDefaultColor(index: number): string {
    const colors = [
      '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6'
    ];
    return colors[index % colors.length];
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
