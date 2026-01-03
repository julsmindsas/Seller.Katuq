/**
 * KatuqMetric Component
 *
 * Displays a metric widget with value, label, trend, and icon.
 */

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { KatuqMetricProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

@Component({
  selector: 'app-katuq-metric',
  template: `
    <div class="katuq-metric" [style.border-left-color]="color">
      <div class="metric-icon" *ngIf="icon" [style.background]="color + '20'" [style.color]="color">
        <i [class]="getIconClass()"></i>
      </div>
      <div class="metric-content">
        <div class="metric-value">{{ value }}</div>
        <div class="metric-label">{{ label }}</div>
      </div>
      <div class="metric-trend" *ngIf="trend" [class]="trendClass">
        <i [class]="trendIcon"></i>
        {{ trend }}
      </div>
    </div>
  `,
  styles: [`
    .katuq-metric {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 0.5rem;
      border-left: 4px solid #6366f1;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .metric-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .metric-content {
      flex: 1;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }

    .metric-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .metric-trend {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .metric-trend.up {
      color: #059669;
      background: #d1fae5;
    }

    .metric-trend.down {
      color: #dc2626;
      background: #fee2e2;
    }

    .metric-trend.neutral {
      color: #6b7280;
      background: #f3f4f6;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqMetricComponent {
  @Input() props: KatuqMetricProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  get value(): string {
    return this.resolve(this.props?.value) || '0';
  }

  get label(): string {
    return this.resolve(this.props?.label) || 'Metric';
  }

  get trend(): string | null {
    return this.resolve(this.props?.trend);
  }

  get trendDirection(): string {
    return this.resolve(this.props?.trendDirection) || 'neutral';
  }

  get icon(): string | null {
    return this.resolve(this.props?.icon);
  }

  get color(): string {
    return this.resolve(this.props?.color) || '#6366f1';
  }

  get trendClass(): string {
    return this.trendDirection;
  }

  get trendIcon(): string {
    switch (this.trendDirection) {
      case 'up':
        return 'pi pi-arrow-up';
      case 'down':
        return 'pi pi-arrow-down';
      default:
        return 'pi pi-minus';
    }
  }

  getIconClass(): string {
    const iconMap: Record<string, string> = {
      'dollar': 'pi pi-dollar',
      'package': 'pi pi-box',
      'truck': 'pi pi-truck',
      'chart': 'pi pi-chart-line',
      'shopping-cart': 'pi pi-shopping-cart',
      'users': 'pi pi-users',
      'check': 'pi pi-check-circle',
      'alert': 'pi pi-exclamation-triangle'
    };

    return iconMap[this.icon || ''] || 'pi pi-chart-bar';
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
