import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate, keyframes, query, stagger } from '@angular/animations';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

import { LogisticaServiceV2 } from '../../../../../shared/services/despachos/logistica.service.v2';
import { EnviameHelperService } from '../services/enviame-helper.service';
import { Pedido } from '../../../../ventas/modelo/pedido';

// Interfaces genéricas para tracking multiprovider
export interface TrackingEvent {
  timestamp: Date | string;
  status: TrackingStatus;
  statusName?: string;
  description: string;
  location?: string;
  providerSpecific?: any;
}

export interface TrackingResponse {
  success: boolean;
  provider: 'enviame' | 'transportadora' | 'servientrega' | 'interrapidisimo' | 'otro';
  trackingNumber: string;
  currentStatus: TrackingStatus;
  currentStatusName?: string;
  events: TrackingEvent[];
  packageInfo?: {
    weight?: number;
    dimensions?: string;
    packageCount?: number;
  };
  recipientInfo?: {
    name: string;
    address: string;
    phone?: string;
  };
  estimatedDelivery?: Date | string;
  actualDelivery?: Date | string;
  lastKnownLocation?: {
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  canCancel?: boolean;
  labelUrl?: string; // URL del label PDF
  trackingUrl?: string; // URL de tracking web
}

export enum TrackingStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

@Component({
  selector: 'app-tracking-details-modal',
  templateUrl: './tracking-details-modal.component.html',
  styleUrls: ['./tracking-details-modal.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('350ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('pulse', [
      state('*', style({ transform: 'scale(1)' })),
      transition(':enter', [
        animate('2s ease-in-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.05)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('bounce', [
      state('*', style({ transform: 'translateY(0)' })),
      transition(':enter', [
        animate('2s ease-in-out', keyframes([
          style({ transform: 'translateY(0)', offset: 0 }),
          style({ transform: 'translateY(-10px)', offset: 0.5 }),
          style({ transform: 'translateY(0)', offset: 1 })
        ]))
      ])
    ]),
    trigger('staggerAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('350ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('cardHover', [
      state('default', style({ transform: 'translateX(0)', boxShadow: 'none' })),
      state('hovered', style({ transform: 'translateX(8px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' })),
      transition('default <=> hovered', animate('250ms ease-in-out'))
    ]),
    trigger('copyAnimation', [
      transition('* => *', [
        animate('250ms ease-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.2)', offset: 0.5 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ]),
    trigger('countUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('progressAnimation', [
      transition(':enter', [
        style({ width: '0%' }),
        animate('1s ease-out', style({ width: '*' }))
      ])
    ]),
    trigger('lineAnimation', [
      transition(':enter', [
        style({ transform: 'scaleY(0)', transformOrigin: 'top' }),
        animate('350ms ease-out', style({ transform: 'scaleY(1)' }))
      ])
    ]),
    trigger('nodeAnimation', [
      transition(':enter', [
        style({ transform: 'scale(0)' }),
        animate('250ms ease-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class TrackingDetailsModalComponent implements OnInit {

  pedido: Pedido;
  companyId: string;
  trackingData: TrackingResponse | null = null;

  loading = false;
  refreshing = false;

  // Timeline visual
  timelineItems: any[] = [];

  // Estados de UI para animaciones e interacciones
  copied = false;
  hoveredTimelineItem: number | null = null;
  hoveredInfoCard: string | null = null;
  hasValidLogo = true; // Estado para controlar si el logo es válido

  // Milestones del progreso
  progressMilestones = [
    { value: 10, label: 'Creado', icon: 'pi pi-clock' },
    { value: 30, label: 'Procesando', icon: 'pi pi-cog' },
    { value: 50, label: 'Recogido', icon: 'pi pi-inbox' },
    { value: 70, label: 'En tránsito', icon: 'pi pi-truck' },
    { value: 90, label: 'En reparto', icon: 'pi pi-send' },
    { value: 100, label: 'Entregado', icon: 'pi pi-check-circle' }
  ];

  // Caché local
  private cacheKey: string = '';
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  constructor(
    private logisticaService: LogisticaServiceV2,
    private enviameHelper: EnviameHelperService,
    private dialogRef: DynamicDialogRef,
    private dialogConfig: DynamicDialogConfig
  ) {
    // Obtener datos del modal
    this.pedido = this.dialogConfig.data?.pedido;
    this.companyId = this.dialogConfig.data?.companyId || localStorage.getItem('x_idEmpresa') || 'default_company';
  }

  ngOnInit(): void {
    this.loadTrackingData();
  }

  loadTrackingData(): void {
    // TEMPORAL: Permitir pedidos sin shippingOrder para pruebas
    const trackingNumber = this.pedido?.shippment?.trackingNumber || this.pedido?.shippingOrder || this.pedido?.nroPedido || 'TEST-' + Date.now();

    if (!trackingNumber) {
      console.warn('No tracking number available for this order');
      // Mostrar datos de prueba o estado sin tracking
      this.trackingData = this.generateTestData();
      this.buildTimeline();
      return;
    }

    this.cacheKey = `tracking_${trackingNumber}`;

    // Verificar caché
    const cachedData = this.getCachedTracking();
    if (cachedData) {
      this.trackingData = cachedData;
      this.buildTimeline();
      return;
    }

    this.loading = true;

    // Detectar proveedor
    const provider = this.detectProvider();

    const trackingPayload = {
      companyId: this.companyId,
      provider: provider,
      trackingNumber: trackingNumber,
      options: {
        includeEvents: true,
        includeLocation: true
      }
    };

    this.logisticaService.trackShipment(trackingPayload).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta de tracking recibida:', response);
        this.loading = false;
        this.refreshing = false;

        if (response) {
          // Normalizar respuesta según el proveedor
          this.trackingData = this.normalizeTrackingResponse(response, provider);
          console.log('✅ Datos normalizados:', this.trackingData);

          if (this.trackingData) {
            this.setCachedTracking(this.trackingData);
            this.buildTimeline();
          } else {
            console.error('❌ No se pudieron normalizar los datos');
            // Mostrar datos de prueba si falla la normalización
            this.trackingData = this.generateTestData();
            this.buildTimeline();
          }
        } else {
          console.error('Tracking request failed:', response);
          // Mostrar datos de prueba
          this.trackingData = this.generateTestData();
          this.buildTimeline();
        }
      },
      error: (error) => {
        console.error('Error loading tracking data:', error);
        this.loading = false;
        this.refreshing = false;
        // Mostrar datos de prueba en caso de error
        this.trackingData = this.generateTestData();
        this.buildTimeline();
      }
    });
  }

  refreshTrackingData(): void {
    // Limpiar caché antes de refrescar
    if (this.cacheKey) {
      localStorage.removeItem(this.cacheKey);
    }
    this.refreshing = true;
    this.loadTrackingData();
  }

  private detectProvider(): string {

    // Detectar proveedor basado en el pedido
    if (this.enviameHelper.isEnviameShipment(this.pedido)) {
      return 'enviame';
    }

    // Cereza/Osmosis: el pedido tiene integraciones.osmosis.id (asignado por el
    // flow shopify-orders-to-cereza o por push manual desde /despachos).
    const integ: any = (this.pedido as any).integrations
                    || (this.pedido as any).integraciones
                    || {};
    if (integ?.osmosis?.id
        || integ?.osmosis?.osmosisOrderId
        || (this.pedido as any).transportador === 'osmosis') {
      return 'osmosis';
    }

    // Detectar otros proveedores por el formato de guía o campos específicos
    const trackingNumber = this.pedido.shippingOrder || '';

    if (trackingNumber.startsWith('SRV')) {
      return 'servientrega';
    }

    if (trackingNumber.startsWith('INT')) {
      return 'interrapidisimo';
    }

    // Por defecto, usar transportadora propia
    return 'transportadora';
  }

  private normalizeTrackingResponse(response: any, provider: string): TrackingResponse {
    // Normalizar según el proveedor
    switch (provider) {
      case 'enviame':
        return this.normalizeEnviameResponse(response);
      case 'servientrega':
        return this.normalizeServientregaResponse(response);
      case 'interrapidisimo':
        return this.normalizeInterrapidisimoResponse(response);
      default:
        return this.normalizeDefaultResponse(response);
    }
  }

  private normalizeEnviameResponse(response: any): TrackingResponse {
    console.log('🔍 Normalizando respuesta de Enviame:', response);

    // Manejar la estructura real de la respuesta del backend
    let currentStatus: TrackingStatus;
    let currentStatusName: string;
    let events: TrackingEvent[] = [];
    let recipientInfo: any = null;
    let estimatedDelivery: string | undefined;
    let lastLocation: string = '';

    // Detectar si viene con originalResponse (estructura real del backend)
    const data = response.originalResponse || response;

    if (data.status) {
      // Mapear el status de Enviame
      currentStatus = this.mapEnviameStatusCode(data.status.code || data.status.name);
      currentStatusName = data.status.name || data.status.info;

      // Crear evento del estado actual
      events.push({
        timestamp: data.updated_at || response.statusDate || new Date().toISOString(),
        status: currentStatus,
        statusName: currentStatusName,
        description: data.status.info || data.status.name,
        location: response.currentLocation || data.shipping_address?.place || '',
        providerSpecific: {
          courier: data.carrier || response.carrier,
          statusCode: data.status.code
        }
      });
    }

    // Agregar historial si existe
    if (response.history && response.history.length > 0) {
      events.push(...response.history.map((item: any) => ({
        timestamp: item.date || item.timestamp,
        status: this.mapEnviameStatusCode(item.status || item.code),
        statusName: item.statusName || item.description,
        description: item.description || item.info,
        location: item.location || '',
        providerSpecific: { courier: response.carrier }
      })));
    }

    // Si no hay eventos, crear uno básico con el estado actual
    if (events.length === 0 && response.status) {
      events.push({
        timestamp: new Date().toISOString(),
        status: currentStatus || TrackingStatus.PROCESSING,
        statusName: response.status.name || 'En proceso',
        description: response.status.info || 'Estado actual del envío',
        location: response.currentLocation || ''
      });
    }

    // Información del destinatario
    if (data.customer || data.shipping_address) {
      recipientInfo = {
        name: data.customer?.full_name || '',
        address: data.shipping_address?.full_address || '',
        phone: data.customer?.phone || ''
      };
    }

    // Fecha estimada de entrega
    estimatedDelivery = data.deadline_at !== 'No informada.' ? data.deadline_at : undefined;

    // Última ubicación conocida
    if (data.shipping_address) {
      lastLocation = data.shipping_address.place || data.shipping_address.full_address;
    }

    // Obtener URLs de label y tracking
    let labelUrl: string | undefined;
    let trackingUrl: string | undefined;

    if (data.label?.PDF) {
      labelUrl = data.label.PDF;
    }

    if (data.links) {
      const trackingLink = data.links.find((link: any) => link.rel === 'tracking-web');
      if (trackingLink) {
        trackingUrl = trackingLink.href;
      }
    }

    return {
      success: response.success !== false,
      provider: 'enviame',
      trackingNumber: response.trackingNumber || data.tracking_number || data.barcodes,
      currentStatus: currentStatus || TrackingStatus.PROCESSING,
      currentStatusName: currentStatusName || 'En proceso',
      events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
      packageInfo: {
        packageCount: 1,
        weight: response.packageInfo?.weight,
        dimensions: response.packageInfo?.dimensions
      },
      recipientInfo: recipientInfo,
      estimatedDelivery: estimatedDelivery,
      actualDelivery: response.actualDelivery,
      lastKnownLocation: lastLocation ? { address: lastLocation } : undefined,
      canCancel: response.canCancel || false,
      labelUrl: labelUrl,
      trackingUrl: trackingUrl
    };
  }

  private mapEnviameStatusCode(statusCode: string): TrackingStatus {
    const codeMap: { [key: string]: TrackingStatus } = {
      'CREATED': TrackingStatus.CREATED,
      'PREPARING': TrackingStatus.PROCESSING,
      'READY': TrackingStatus.PROCESSING,
      'PICKED': TrackingStatus.PICKED_UP,
      'IN_TRANSIT': TrackingStatus.IN_TRANSIT,
      'DISPATCHED': TrackingStatus.OUT_FOR_DELIVERY,
      'DELIVERED': TrackingStatus.DELIVERED,
      'CANCELLED': TrackingStatus.CANCELLED,
      'RETURNED': TrackingStatus.RETURNED,
      'EXCEPTION': TrackingStatus.EXCEPTION,
      // Mapeo por nombre también
      'En Reparto': TrackingStatus.OUT_FOR_DELIVERY,
      'En Tránsito': TrackingStatus.IN_TRANSIT,
      'Entregado': TrackingStatus.DELIVERED,
      'Creado': TrackingStatus.CREATED
    };

    return codeMap[statusCode] || codeMap[statusCode.toUpperCase()] || TrackingStatus.PROCESSING;
  }

  private normalizeServientregaResponse(response: any): TrackingResponse {
    // Implementar normalización para Servientrega
    return {
      success: true,
      provider: 'servientrega',
      trackingNumber: response.guia || '',
      currentStatus: TrackingStatus.IN_TRANSIT,
      events: [],
      // ... mapear otros campos
    };
  }

  private normalizeInterrapidisimoResponse(response: any): TrackingResponse {
    // Implementar normalización para Interrapidísimo
    return {
      success: true,
      provider: 'interrapidisimo',
      trackingNumber: response.guia || '',
      currentStatus: TrackingStatus.IN_TRANSIT,
      events: [],
      // ... mapear otros campos
    };
  }

  private normalizeDefaultResponse(response: any): TrackingResponse {
    // Normalización por defecto para transportadora propia
    return {
      success: true,
      provider: 'transportadora',
      trackingNumber: response.guia || this.pedido.shippingOrder || '',
      currentStatus: this.mapDefaultStatus(this.pedido.estadoProceso),
      currentStatusName: this.pedido.estadoProceso,
      events: [],
      recipientInfo: {
        name: this.pedido.cliente?.nombres_completos || '',
        address: this.pedido.envio?.direccionEntrega || '',
        phone: this.pedido.cliente?.numero_celular_comprador || ''
      }
    };
  }

  private mapEnviameStatus(status: string): TrackingStatus {
    const statusMap: { [key: string]: TrackingStatus } = {
      'created': TrackingStatus.CREATED,
      'preparing': TrackingStatus.PROCESSING,
      'picked_up': TrackingStatus.PICKED_UP,
      'in_transit': TrackingStatus.IN_TRANSIT,
      'out_for_delivery': TrackingStatus.OUT_FOR_DELIVERY,
      'delivered': TrackingStatus.DELIVERED,
      'cancelled': TrackingStatus.CANCELLED,
      'returned': TrackingStatus.RETURNED,
      'exception': TrackingStatus.EXCEPTION
    };
    return statusMap[status.toLowerCase()] || TrackingStatus.PROCESSING;
  }

  private mapDefaultStatus(estadoProceso: string): TrackingStatus {
    const statusMap: { [key: string]: TrackingStatus } = {
      'SinProducir': TrackingStatus.CREATED,
      'EnProduccion': TrackingStatus.PROCESSING,
      'ProducidoParcialmente': TrackingStatus.PROCESSING,
      'ProducidoTotalmente': TrackingStatus.PROCESSING,
      'Empacado': TrackingStatus.PICKED_UP,
      'ParaDespachar': TrackingStatus.PICKED_UP,
      'Despachado': TrackingStatus.IN_TRANSIT,
      'Entregado': TrackingStatus.DELIVERED,
      'Rechazado': TrackingStatus.CANCELLED
    };
    return statusMap[estadoProceso] || TrackingStatus.PROCESSING;
  }

  private buildTimeline(): void {
    if (!this.trackingData || !this.trackingData.events) {
      this.timelineItems = [];
      return;
    }

    this.timelineItems = this.trackingData.events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((event, index) => {
        const colors = this.getTimelineColors(event.status);

        return {
          status: event.statusName || this.getStatusDisplayName(event.status),
          date: this.formatDate(event.timestamp),
          location: event.location,
          description: event.description,
          icon: 'pi ' + this.getStatusIcon(event.status),
          color: colors.background,
          backgroundColor: colors.background,
          textColor: colors.text,
          isLatest: index === 0,
          providerSpecific: event.providerSpecific
        };
      });
  }

  private getTimelineColors(status: TrackingStatus | string): any {
    const colorMap = {
      [TrackingStatus.CREATED]: { border: '#6c757d', background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)', text: '#ffffff' },
      [TrackingStatus.PROCESSING]: { border: '#007bff', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
      [TrackingStatus.PICKED_UP]: { border: '#17a2b8', background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)', text: '#ffffff' },
      [TrackingStatus.IN_TRANSIT]: { border: '#17a2b8', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', text: '#ffffff' },
      [TrackingStatus.OUT_FOR_DELIVERY]: { border: '#6f42c1', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', text: '#ffffff' },
      [TrackingStatus.DELIVERED]: { border: '#28a745', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', text: '#ffffff' },
      [TrackingStatus.EXCEPTION]: { border: '#ffc107', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', text: '#ffffff' },
      [TrackingStatus.CANCELLED]: { border: '#dc3545', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', text: '#ffffff' },
      [TrackingStatus.RETURNED]: { border: '#fd7e14', background: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)', text: '#ffffff' }
    };
    return colorMap[status] || colorMap[TrackingStatus.PROCESSING];
  }

  private getStatusIcon(status: TrackingStatus | string): string {
    const iconMap = {
      [TrackingStatus.CREATED]: 'pi-clock',
      [TrackingStatus.PROCESSING]: 'pi-cog',
      [TrackingStatus.PICKED_UP]: 'pi-inbox',
      [TrackingStatus.IN_TRANSIT]: 'pi-truck',
      [TrackingStatus.OUT_FOR_DELIVERY]: 'pi-send',
      [TrackingStatus.DELIVERED]: 'pi-check-circle',
      [TrackingStatus.EXCEPTION]: 'pi-exclamation-triangle',
      [TrackingStatus.CANCELLED]: 'pi-times-circle',
      [TrackingStatus.RETURNED]: 'pi-replay'
    };
    return iconMap[status] || 'pi-info-circle';
  }

  private getStatusDisplayName(status: TrackingStatus | string): string {
    const nameMap = {
      [TrackingStatus.CREATED]: 'Creado',
      [TrackingStatus.PROCESSING]: 'En preparación',
      [TrackingStatus.PICKED_UP]: 'Recogido',
      [TrackingStatus.IN_TRANSIT]: 'En tránsito',
      [TrackingStatus.OUT_FOR_DELIVERY]: 'En reparto',
      [TrackingStatus.DELIVERED]: 'Entregado',
      [TrackingStatus.EXCEPTION]: 'Incidencia',
      [TrackingStatus.CANCELLED]: 'Cancelado',
      [TrackingStatus.RETURNED]: 'Devuelto'
    };
    return nameMap[status] || status;
  }

  private formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `Hace ${minutes} minutos`;
    } else if (hours < 24) {
      return `Hace ${hours} horas`;
    } else if (hours < 48) {
      return 'Ayer, ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } else {
      return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  // Métodos de caché
  private getCachedTracking(): TrackingResponse | null {
    const cached = localStorage.getItem(this.cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if (age < this.CACHE_DURATION) {
        return data.response;
      }
      // Limpiar caché expirado
      localStorage.removeItem(this.cacheKey);
    }
    return null;
  }

  private setCachedTracking(response: TrackingResponse): void {
    const data = {
      timestamp: Date.now(),
      response: response
    };
    localStorage.setItem(this.cacheKey, JSON.stringify(data));
  }

  openExternalTracking(): void {
    // Si tenemos una URL de tracking específica, usarla
    if (this.trackingData?.trackingUrl) {
      window.open(this.trackingData.trackingUrl, '_blank');
      return;
    }

    // Si no, usar las URLs genéricas por proveedor
    if (!this.trackingData?.trackingNumber) return;

    let trackingUrl = '';
    switch (this.trackingData.provider) {
      case 'enviame':
        trackingUrl = `https://www.enviame.io/tracking/${this.trackingData.trackingNumber}`;
        break;
      case 'servientrega':
        trackingUrl = `https://www.servientrega.com/wps/portal/rastreo`;
        break;
      case 'interrapidisimo':
        trackingUrl = `https://www.interrapidisimo.com/`;
        break;
      default:
        return; // No hay URL externa para transportadora propia
    }

    if (trackingUrl) {
      window.open(trackingUrl, '_blank');
    }
  }

  downloadLabel(): void {
    if (this.trackingData?.labelUrl) {
      console.log('📄 Descargando etiqueta:', this.trackingData.labelUrl);
      window.open(this.trackingData.labelUrl, '_blank');
    }
  }

  copyTrackingNumber(): void {
    const trackingNumber = this.trackingData?.trackingNumber || this.pedido?.shippingOrder;
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber).then(() => {
        console.log('Número de guía copiado');
        this.copied = true;
        // Reset el estado después de 2 segundos
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      }).catch(err => {
        console.error('Error al copiar:', err);
        // Fallback para navegadores antiguos
        this.fallbackCopyTextToClipboard(trackingNumber);
      });
    }
  }

  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '0';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      }
    } catch (err) {
      console.error('Fallback: Error al copiar', err);
    }
    document.body.removeChild(textArea);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  // Getters para el template
  get trackingNumber(): string {
    return this.trackingData?.trackingNumber || this.pedido?.shippingOrder || 'N/A';
  }

  get currentStatus(): string {
    if (this.trackingData?.currentStatusName) {
      return this.trackingData.currentStatusName;
    }
    return this.getStatusDisplayName(this.trackingData?.currentStatus || TrackingStatus.PROCESSING);
  }

  get currentStatusIcon(): string {
    return this.getStatusIcon(this.trackingData?.currentStatus || TrackingStatus.PROCESSING);
  }

  get estimatedDelivery(): string {
    if (this.trackingData?.estimatedDelivery) {
      return this.formatDate(this.trackingData.estimatedDelivery);
    }
    return 'No disponible';
  }

  get actualDelivery(): string {
    if (this.trackingData?.actualDelivery) {
      return this.formatDate(this.trackingData.actualDelivery);
    }
    return '';
  }

  get lastKnownLocation(): string {
    return this.trackingData?.lastKnownLocation?.address || 'Ubicación no disponible';
  }

  get recipientInfo(): string {
    if (this.trackingData?.recipientInfo) {
      return `${this.trackingData.recipientInfo.name} - ${this.trackingData.recipientInfo.address}`;
    }
    if (this.pedido?.cliente && this.pedido?.envio) {
      return `${this.pedido.cliente.nombres_completos} - ${this.pedido.envio.direccionEntrega}`;
    }
    return 'Información no disponible';
  }

  get hasEvents(): boolean {
    return this.timelineItems.length > 0;
  }

  get isDelivered(): boolean {
    return this.trackingData?.currentStatus === TrackingStatus.DELIVERED;
  }

  get deliveryProgress(): number {
    if (!this.trackingData) return 0;

    const progressMap = {
      [TrackingStatus.CREATED]: 10,
      [TrackingStatus.PROCESSING]: 20,
      [TrackingStatus.PICKED_UP]: 40,
      [TrackingStatus.IN_TRANSIT]: 60,
      [TrackingStatus.OUT_FOR_DELIVERY]: 80,
      [TrackingStatus.DELIVERED]: 100,
      [TrackingStatus.CANCELLED]: 0,
      [TrackingStatus.RETURNED]: 0,
      [TrackingStatus.EXCEPTION]: 50
    };

    return progressMap[this.trackingData.currentStatus] || 0;
  }

  get providerName(): string {
    const names = {
      'enviame': 'Enviame.io',
      'servientrega': 'Servientrega',
      'interrapidisimo': 'Interrapidísimo',
      'osmosis': 'Guía Cereza',
      'prindel': 'Prindel',
      'transportadora': 'Transportadora Propia',
      'otro': 'Otro Proveedor'
    };
    return names[this.trackingData?.provider || 'otro'];
  }

  get providerLogo(): string {
    // Retornar path del logo según el proveedor
    const logos = {
      'enviame': 'https://enviame.io/assets/images/logo-enviame.png',
      'servientrega': 'assets/logos/servientrega.png',
      'interrapidisimo': 'assets/logos/interrapidisimo.png',
      'osmosis': 'assets/images/logos/guiacereza.svg',
      'prindel': 'assets/images/logos/prindel.png',
      'transportadora': 'assets/logos/katuq.png',
      'otro': ''
    };
    return logos[this.trackingData?.provider || 'otro'];
  }

  get safeProviderLogo(): string {
    // Retorna el logo solo si es válido, si no retorna vacío
    return this.hasValidLogo ? this.providerLogo : '';
  }

  onLogoError(): void {
    // Manejo del error cuando el logo no se puede cargar
    console.warn('Logo no pudo ser cargado, mostrando icono por defecto');
    this.hasValidLogo = false;
  }

  getLastUpdateTime(): string {
    if (this.trackingData?.events && this.trackingData.events.length > 0) {
      return this.formatDate(this.trackingData.events[0].timestamp);
    }
    return 'Reciente';
  }

  /**
   * TEMPORAL: Genera datos de prueba para pedidos sin tracking
   */
  private generateTestData(): TrackingResponse {
    // Datos por defecto para pedidos sin tracking real
    const estadoProceso = this.pedido?.estadoProceso || 'SinProducir';
    const currentStatus = this.mapDefaultStatus(estadoProceso);

    return {
      success: true,
      provider: 'transportadora',
      trackingNumber: this.pedido?.shippingOrder || this.pedido?.nroPedido || 'SIN-GUIA',
      currentStatus: currentStatus,
      currentStatusName: this.getStatusDisplayName(currentStatus),
      events: [
        {
          timestamp: new Date().toISOString(),
          status: currentStatus,
          statusName: this.getStatusDisplayName(currentStatus),
          description: `Estado actual: ${estadoProceso}`,
          location: 'Bodega principal'
        },
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: TrackingStatus.CREATED,
          statusName: 'Pedido creado',
          description: 'El pedido ha sido registrado en el sistema',
          location: 'Sistema Katuq'
        }
      ],
      recipientInfo: {
        name: this.pedido?.cliente?.nombres_completos || 'Cliente',
        address: this.pedido?.envio?.direccionEntrega || 'Dirección de entrega',
        phone: this.pedido?.cliente?.numero_celular_comprador || ''
      },
      packageInfo: {
        packageCount: 1,
        weight: 1
      }
    };
  }
}