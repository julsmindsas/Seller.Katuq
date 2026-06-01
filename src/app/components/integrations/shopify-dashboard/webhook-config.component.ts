import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { IntegrationsService } from '../integrations.service';

interface ShopifyWebhook {
  id: string;
  topic: string;
  address: string;
  format: string;
  active: boolean;
  lastEvent?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-webhook-config',
  templateUrl: './webhook-config.component.html',
  styleUrls: ['./webhook-config.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class WebhookConfigComponent implements OnInit, OnDestroy {
  webhooks: ShopifyWebhook[] = [];
  loading = true;
  registering = false;
  unregisteringId: string | null = null;
  testingId: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private integrationsService: IntegrationsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadWebhooks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWebhooks(): void {
    this.loading = true;
    this.integrationsService.getShopifyWebhooks()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.webhooks = (response.data || []).map((wh: any) => ({
              id: String(wh.id),
              topic: wh.topic,
              address: wh.address,
              format: wh.format || 'json',
              active: wh.active !== false,
              lastEvent: wh.lastEvent || null,
              createdAt: wh.createdAt || wh.created_at
            }));
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los webhooks'
          });
        }
      });
  }

  registerAll(): void {
    this.confirmationService.confirm({
      message: 'Se registraran todos los webhooks necesarios en Shopify. Los webhooks existentes no se duplicaran.',
      header: 'Registrar Webhooks',
      icon: 'pi pi-bell',
      accept: () => {
        this.registering = true;
        this.integrationsService.registerShopifyWebhooks()
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => { this.registering = false; })
          )
          .subscribe({
            next: (response) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Webhooks registrados',
                detail: response?.message || 'Se registraron todos los webhooks correctamente'
              });
              this.loadWebhooks();
            },
            error: (err) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: err?.error?.message || 'No se pudieron registrar los webhooks'
              });
            }
          });
      }
    });
  }

  unregisterWebhook(webhook: ShopifyWebhook): void {
    this.confirmationService.confirm({
      message: `Deseas desregistrar el webhook "${webhook.topic}"?`,
      header: 'Desregistrar Webhook',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.unregisteringId = webhook.id;
        this.integrationsService.unregisterShopifyWebhook(webhook.id)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => { this.unregisteringId = null; })
          )
          .subscribe({
            next: () => {
              this.webhooks = this.webhooks.filter(w => w.id !== webhook.id);
              this.messageService.add({
                severity: 'success',
                summary: 'Webhook eliminado',
                detail: `Se desregistro el webhook "${webhook.topic}"`
              });
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo desregistrar el webhook'
              });
            }
          });
      }
    });
  }

  testWebhook(webhook: ShopifyWebhook): void {
    this.testingId = webhook.id;
    // Use trigger sync to simulate a webhook event
    const resource = this.getResourceFromTopic(webhook.topic);
    this.integrationsService.triggerShopifySync(resource)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.testingId = null; })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Prueba enviada',
            detail: `Se envio un evento de prueba para "${webhook.topic}"`
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo enviar el evento de prueba'
          });
        }
      });
  }

  getTopicLabel(topic: string): string {
    const labels: { [key: string]: string } = {
      'products/create': 'Producto creado',
      'products/update': 'Producto actualizado',
      'products/delete': 'Producto eliminado',
      'orders/create': 'Orden creada',
      'orders/updated': 'Orden actualizada',
      'orders/cancelled': 'Orden cancelada',
      'orders/fulfilled': 'Orden completada',
      'orders/paid': 'Orden pagada',
      'inventory_levels/update': 'Inventario actualizado',
      'inventory_levels/connect': 'Inventario conectado',
      'fulfillments/create': 'Fulfillment creado',
      'fulfillments/update': 'Fulfillment actualizado',
      'refunds/create': 'Reembolso creado',
      'app/uninstalled': 'App desinstalada'
    };
    return labels[topic] || topic;
  }

  getTopicIcon(topic: string): string {
    if (topic.startsWith('products/')) return 'pi pi-box';
    if (topic.startsWith('orders/')) return 'pi pi-shopping-cart';
    if (topic.startsWith('inventory')) return 'pi pi-database';
    if (topic.startsWith('fulfillments/')) return 'pi pi-truck';
    if (topic.startsWith('refunds/')) return 'pi pi-wallet';
    return 'pi pi-bell';
  }

  getTopicCategory(topic: string): string {
    if (topic.startsWith('products/')) return 'Productos';
    if (topic.startsWith('orders/')) return 'Ordenes';
    if (topic.startsWith('inventory')) return 'Inventario';
    if (topic.startsWith('fulfillments/')) return 'Fulfillment';
    if (topic.startsWith('refunds/')) return 'Reembolsos';
    return 'Otro';
  }

  isUnregistering(id: string): boolean {
    return this.unregisteringId === id;
  }

  isTesting(id: string): boolean {
    return this.testingId === id;
  }

  private getResourceFromTopic(topic: string): string {
    if (topic.startsWith('products/')) return 'products';
    if (topic.startsWith('orders/')) return 'orders';
    if (topic.startsWith('inventory')) return 'inventory';
    return 'products';
  }
}
