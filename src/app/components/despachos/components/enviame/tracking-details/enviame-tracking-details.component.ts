import { Component, OnInit, OnDestroy } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { interval, Subscription } from 'rxjs';
import { switchMap, takeWhile } from 'rxjs/operators';

import { LogisticaServiceV2 } from '../../../../../shared/services/despachos/logistica.service.v2';
import { EnviameHelperService } from '../services/enviame-helper.service';
import {
  EnviameTrackingResponse,
  EnviameTrackingEvent,
  EnviameShipmentStatus
} from '../models/enviame.interfaces';
import { Pedido } from '../../../../ventas/modelo/pedido';

@Component({
  selector: 'app-enviame-tracking-details',
  templateUrl: './enviame-tracking-details.component.html',
  styleUrls: ['./enviame-tracking-details.component.scss']
})
export class EnviameTrackingDetailsComponent implements OnInit, OnDestroy {

  pedido: Pedido;
  companyId: string;
  trackingData: EnviameTrackingResponse | null = null;

  loading = false;
  refreshing = false;
  autoRefresh = false;

  // Suscripción para auto-refresh
  private autoRefreshSubscription: Subscription | null = null;

  // Timeline visual
  timelineItems: any[] = [];

  constructor(
    private logisticaService: LogisticaServiceV2,
    private enviameHelper: EnviameHelperService,
    private dialogRef: DynamicDialogRef,
    private dialogConfig: DynamicDialogConfig
  ) {
    // Obtener datos del modal
    this.pedido = this.dialogConfig.data?.pedido;
    this.companyId = this.dialogConfig.data?.companyId || 'default_company';
  }

  ngOnInit(): void {
    this.loadTrackingData();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadTrackingData(): void {
    if (!this.pedido?.shippingOrder) {
      console.warn('No tracking number available for this order');
      return;
    }

    this.loading = true;

    const trackingPayload = {
      companyId: this.companyId,
      provider: 'enviame',
      trackingNumber:  this.pedido.shippingOrder || '',
      options: {
        includeEvents: true,
        includeLocation: true
      }
    };

    this.logisticaService.trackShipment(trackingPayload).subscribe({
      next: (response: EnviameTrackingResponse) => {
        this.loading = false;
        this.refreshing = false;

        if (response.success) {
          this.trackingData = response;
          this.buildTimeline();
        } else {
          console.error('Tracking request failed:', response);
        }
      },
      error: (error) => {
        console.error('Error loading tracking data:', error);
        this.loading = false;
        this.refreshing = false;
      }
    });
  }

  refreshTrackingData(): void {
    this.refreshing = true;
    this.loadTrackingData();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;

    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    // Refresh cada 30 segundos si el envío está activo
    this.autoRefreshSubscription = interval(30000)
      .pipe(
        takeWhile(() => this.autoRefresh && this.isShipmentActive()),
        switchMap(() => {
          this.refreshing = true;
          return this.logisticaService.trackShipment({
            companyId: this.companyId,
            provider: 'enviame',
            trackingNumber:  this.pedido.shippingOrder || '',
            options: { includeEvents: true, includeLocation: true }
          });
        })
      )
      .subscribe({
        next: (response: EnviameTrackingResponse) => {
          this.refreshing = false;
          if (response.success) {
            this.trackingData = response;
            this.buildTimeline();
          }
        },
        error: (error) => {
          console.error('Error in auto-refresh:', error);
          this.refreshing = false;
        }
      });
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = null;
    }
  }

  private isShipmentActive(): boolean {
    if (!this.trackingData) return false;

    const activeStatuses = ['created', 'in_transit', 'out_for_delivery', 'preparing', 'picked_up'];
    return activeStatuses.includes(this.trackingData.currentStatus.toLowerCase());
  }

  private buildTimeline(): void {
    if (!this.trackingData || !this.trackingData.events) {
      this.timelineItems = [];
      return;
    }

    this.timelineItems = this.trackingData.events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((event, index) => {
        const colors = this.enviameHelper.getTimelineColors(event.status);

        return {
          status: event.statusName || event.status,
          date: this.enviameHelper.formatDate(event.timestamp),
          location: event.location,
          description: event.description,
          icon: this.enviameHelper.getStatusIcon(event.status),
          color: colors.border,
          backgroundColor: colors.background,
          textColor: colors.text,
          isLatest: index === 0,
          courier: event.courier
        };
      });
  }

  openExternalTracking(): void {
    if (this.trackingData?.trackingNumber) {
      // URL de tracking externo de Enviame.io (puede variar según el país)
      const trackingUrl = `https://www.enviame.io/tracking/${this.trackingData.trackingNumber}`;
      window.open(trackingUrl, '_blank');
    }
  }

  copyTrackingNumber(): void {
    if (this.trackingData?.trackingNumber) {
      navigator.clipboard.writeText(this.trackingData.trackingNumber).then(() => {
        // Podrías mostrar un toast aquí
        console.log('Tracking number copied to clipboard');
      }).catch(err => {
        console.error('Error copying to clipboard:', err);
      });
    }
  }

  onClose(): void {
    this.stopAutoRefresh();
    this.dialogRef.close();
  }

  // Getters para el template
  get trackingNumber(): string {
    return this.trackingData?.trackingNumber || this.pedido?.shippingOrder || 'N/A';
  }

  get currentStatus(): string {
    return this.trackingData?.currentStatusName || this.enviameHelper.getStatusDisplayName(this.pedido?.estadoProceso || 'unknown');
  }

  get currentStatusIcon(): string {
    return this.enviameHelper.getStatusIcon(this.trackingData?.currentStatus || this.pedido?.estadoProceso || 'unknown');
  }

  get estimatedDelivery(): string {
    if (this.trackingData?.estimatedDelivery) {
      return this.enviameHelper.formatDate(this.trackingData.estimatedDelivery);
    }
    return 'No disponible';
  }

  get actualDelivery(): string {
    if (this.trackingData?.actualDelivery) {
      return this.enviameHelper.formatDate(this.trackingData.actualDelivery);
    }
    return '';
  }

  get lastKnownLocation(): string {
    return this.trackingData?.lastKnownLocation?.address || 'Ubicación no disponible';
  }

  get recipientInfo(): string {
    if (this.trackingData?.recipient) {
      return `${this.trackingData.recipient.name} - ${this.trackingData.recipient.address}`;
    }
    if (this.pedido?.cliente && this.pedido?.envio) {
      return `${this.pedido.cliente.nombres_completos} - ${this.pedido.envio.direccionEntrega}`;
    }
    return 'Información no disponible';
  }

  get canCancel(): boolean {
    return this.trackingData?.canCancel || false;
  }

  get hasEvents(): boolean {
    return this.timelineItems.length > 0;
  }

  get isDelivered(): boolean {
    return this.trackingData?.currentStatus.toLowerCase() === 'delivered';
  }

  get deliveryProgress(): number {
    if (!this.trackingData) return 0;

    const status = this.trackingData.currentStatus.toLowerCase();
    const progressMap = {
      'created': 10,
      'preparing': 20,
      'picked_up': 40,
      'in_transit': 60,
      'out_for_delivery': 80,
      'delivered': 100,
      'cancelled': 0,
      'returned': 0,
      'exception': 50
    };

    return progressMap[status] || 0;
  }
}