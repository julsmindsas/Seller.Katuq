import { Component, OnInit, OnDestroy } from '@angular/core';
import { SubscriptionService } from '../../services/subscription.service';
import { SubscriptionUsage } from '../../models/subscription.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Usage Widget Component
 *
 * Widget para mostrar el uso actual del plan de suscripción
 * Muestra estadísticas de pedidos y uso de IA
 */
@Component({
  selector: 'app-usage-widget',
  templateUrl: './usage-widget.component.html',
  styleUrls: ['./usage-widget.component.scss']
})
export class UsageWidgetComponent implements OnInit, OnDestroy {
  usage: SubscriptionUsage | null = null;
  isPremium = false;
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    // Suscribirse a cambios de uso
    this.subscriptionService.usage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(usage => {
        this.usage = usage;
        this.loading = false;
      });

    // Verificar si es premium
    this.subscriptionService.subscription$
      .pipe(takeUntil(this.destroy$))
      .subscribe(subscription => {
        if (subscription) {
          this.isPremium = subscription.plan === 'premium';
        }
      });

    // Cargar datos
    this.subscriptionService.getUsageStats().subscribe({
      error: (err) => {
        console.error('Error loading usage stats:', err);
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProgressBarClass(percentage: number): string {
    if (percentage >= 90) return 'p-progressbar-danger';
    if (percentage >= 70) return 'p-progressbar-warning';
    return 'p-progressbar-success';
  }

  getOrdersPercentage(): number {
    if (!this.usage || this.usage.orders.limit === -1) return 0;
    return Math.min(100, (this.usage.orders.current / this.usage.orders.limit) * 100);
  }

  getOrdersLimitMessage(): string {
    if (!this.usage) return '';
    const remaining = Math.max(0, this.usage.orders.limit - this.usage.orders.current);
    if (remaining === 0) {
      return 'Llegaste al límite mensual. Puedes esperar al reinicio o desbloquear Premium.';
    }
    return `Te quedan ${remaining} pedidos Gratis este mes.`;
  }

  getChatPercentage(): number {
    if (!this.usage || this.usage.ai.chat.limit === -1) return 0;
    return Math.min(100, (this.usage.ai.chat.used / this.usage.ai.chat.limit) * 100);
  }

  getProductsPercentage(): number {
    if (!this.usage || this.usage.ai.products.limit === -1) return 0;
    return Math.min(100, (this.usage.ai.products.used / this.usage.ai.products.limit) * 100);
  }

  refresh(): void {
    this.loading = true;
    this.subscriptionService.getUsageStats().subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        console.error('Error refreshing usage stats:', err);
        this.loading = false;
      }
    });
  }
}
