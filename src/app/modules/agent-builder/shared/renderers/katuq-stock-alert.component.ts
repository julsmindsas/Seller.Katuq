/**
 * KatuqStockAlert Component
 *
 * Displays stock alerts with severity indicators.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';
import { KatuqStockAlertProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

interface StockAlertProduct {
  id?: string;
  nombre?: string;
  name?: string;
  sku?: string;
  codigo?: string;
  stock?: number;
  cantidad?: number;
  minStock?: number;
  stockMinimo?: number;
}

@Component({
  selector: 'app-katuq-stock-alert',
  template: `
    <div class="katuq-stock-alert" [class]="severityClass">
      <div class="alert-header">
        <div class="alert-icon">
          <i [class]="severityIcon"></i>
        </div>
        <div class="alert-title">
          <h4>{{ title }}</h4>
          <span class="alert-count">{{ products.length }} productos</span>
        </div>
        <button *ngIf="actionLabel" class="alert-action" (click)="onAction()">
          {{ actionLabel }}
        </button>
      </div>

      <div class="alert-products">
        <div class="product-item" *ngFor="let product of products.slice(0, 10)">
          <div class="product-info">
            <span class="product-name">{{ product.nombre || product.name }}</span>
            <span class="product-sku">{{ product.sku || product.codigo }}</span>
          </div>
          <div class="product-stock" [class]="getStockClass(product)">
            <span class="stock-value">{{ product.stock ?? product.cantidad ?? 0 }}</span>
            <span class="stock-min">Min: {{ product.minStock ?? product.stockMinimo ?? 10 }}</span>
          </div>
        </div>

        <div class="more-products" *ngIf="products.length > 10">
          + {{ products.length - 10 }} productos mas
        </div>
      </div>
    </div>
  `,
  styles: [`
    .katuq-stock-alert {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .katuq-stock-alert.warning {
      border-top: 4px solid #f59e0b;
    }

    .katuq-stock-alert.critical {
      border-top: 4px solid #ef4444;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .alert-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .warning .alert-icon {
      background: #fef3c7;
      color: #d97706;
    }

    .critical .alert-icon {
      background: #fee2e2;
      color: #dc2626;
    }

    .alert-title {
      flex: 1;
    }

    .alert-title h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .alert-count {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .alert-action {
      padding: 0.5rem 1rem;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .alert-action:hover {
      background: #4f46e5;
    }

    .alert-products {
      max-height: 300px;
      overflow-y: auto;
    }

    .product-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f3f4f6;
    }

    .product-item:last-child {
      border-bottom: none;
    }

    .product-info {
      display: flex;
      flex-direction: column;
    }

    .product-name {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .product-sku {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .product-stock {
      text-align: right;
    }

    .stock-value {
      display: block;
      font-weight: 600;
      font-size: 1rem;
    }

    .stock-min {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .product-stock.low .stock-value {
      color: #f59e0b;
    }

    .product-stock.critical .stock-value {
      color: #ef4444;
    }

    .product-stock.out .stock-value {
      color: #dc2626;
      font-weight: 700;
    }

    .more-products {
      padding: 0.75rem 1rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6b7280;
      background: #f9fafb;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqStockAlertComponent {
  @Input() props: KatuqStockAlertProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  @Output() alertAction = new EventEmitter<{ action: string; products: any[] }>();

  get products(): StockAlertProduct[] {
    return this.resolve(this.props?.products) || [];
  }

  get severity(): string {
    return this.resolve(this.props?.severity) || 'warning';
  }

  get severityClass(): string {
    return this.severity;
  }

  get severityIcon(): string {
    return this.severity === 'critical'
      ? 'pi pi-exclamation-circle'
      : 'pi pi-exclamation-triangle';
  }

  get title(): string {
    return this.severity === 'critical'
      ? 'Alerta Critica de Stock'
      : 'Alerta de Stock Bajo';
  }

  get actionLabel(): string | null {
    const action = this.props?.action;
    if (!action) return null;
    return this.resolve(action.label);
  }

  get actionName(): string {
    const action = this.props?.action;
    if (!action) return 'create_purchase_order';
    return this.resolve(action.actionName) || 'create_purchase_order';
  }

  getStockClass(product: StockAlertProduct): string {
    const stock = product.stock ?? product.cantidad ?? 0;
    const min = product.minStock ?? product.stockMinimo ?? 10;

    if (stock <= 0) return 'out';
    if (stock <= min * 0.5) return 'critical';
    return 'low';
  }

  onAction(): void {
    this.alertAction.emit({
      action: this.actionName,
      products: this.products
    });
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
