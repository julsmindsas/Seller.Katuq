// ===== INTERFACES PARA INTEGRACIÓN ENVIAME.IO =====

/**
 * Respuesta de cotización de Enviame
 */
export interface EnviameRate {
  service: string;
  serviceCode: string;
  carrier: string;
  carrierCode: string;
  price: number;
  basePrice: number;
  taxes: number;
  insurancePrice: number;
  currency: string;
  estimatedDays: string;
  estimatedTime: string;
  cutoffTime?: string | null;
  description: string;
  coverage?: string | null;
  maxWeight?: number | null;
  maxDimensions?: string | null;
  weight: string;
  costFreightIncluded: boolean;
  costFreightInfo?: {
    original_price?: number;
    route_charges_minimum_cost?: number;
    route_charges_percentage_cost?: number;
    route_charges_cost_applied?: number;
  };
  serviceTypes: string[];
  groupByCarrierServiceType?: boolean | null;
}

/**
 * Respuesta de cotización completa
 */
export interface EnviameRatesResponse {
  success: boolean;
  rates: EnviameRate[];
  message?: string;
  quotationId?: string;
  validUntil?: Date;
}

/**
 * Datos para solicitud de cotización
 */
export interface EnviameQuoteRequest {
  companyId: string;
  provider: string;
  origin: {
    placeCode?: string;      // Código DANE convertido a 8 dígitos
    municipioCode?: string;  // Código DANE original del municipio
    municipioName?: string;  // Nombre del municipio
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  destination: {
    placeCode?: string;      // Código DANE convertido a 8 dígitos
    municipioCode?: string;  // Código DANE original del municipio
    municipioName?: string;  // Nombre del municipio
    department?: string;     // Departamento/provincia del destino
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  package: {
    weight: number;
    dimensions?: {           // Hacer dimensiones opcionales
      length: number;
      width: number;
      height: number;
    };
    value?: number;
    description?: string;
    quantity?: number;
    nPackages?: number;      // Número de bultos (paquetes físicos de la guía)
  };
  shippingType?: 'estandar' | 'express' | 'prioritario'; // Nuevo campo para tipo de envío
  options?: {
    insuranceValue?: number;
    cashOnDelivery?: boolean;
    signature?: boolean;
    packaging?: string;
  };
}

/**
 * Estado de seguimiento de Enviame
 */
export interface EnviameTrackingEvent {
  status: string;
  statusName: string;
  location: string;
  timestamp: Date;
  description: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  courier?: string;
}

/**
 * Respuesta completa de tracking
 */
export interface EnviameTrackingResponse {
  success: boolean;
  trackingNumber: string;
  currentStatus: string;
  currentStatusName: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  events: EnviameTrackingEvent[];
  recipient?: {
    name: string;
    address: string;
  };
  lastKnownLocation?: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  canCancel?: boolean;
  labelUrl?: string;
}

/**
 * Datos del envío creado
 */
export interface EnviameShipment {
  trackingNumber: string;
  shipmentId: string;
  labelUrl: string;
  status: string;
  statusName: string;
  estimatedDelivery: Date;
  service: string;
  carrier: string;
  cost: number;
  currency: string;
  recipient: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  createdAt: Date;
}

/**
 * Respuesta de creación de envío
 */
export interface EnviameCreateShipmentResponse {
  success: boolean;
  shipment?: EnviameShipment;
  message?: string;
  errors?: string[];
}

/**
 * Solicitud de cancelación
 */
export interface EnviameCancelRequest {
  companyId: string;
  provider: string;
  /**
   * Identificador del envío EN ENVIAME (`pedido.shippment.shipmentId`), que es
   * lo que el backend usa para llamar a su API (`/deliveries/{id}/cancel`).
   * No confundir con `shippingOrder`, que es el consecutivo interno de Katuq.
   */
  shipmentId: string | number;
  /** Guía del transportador. Informativa: sirve para mostrarla y auditar. */
  trackingNumber?: string;
  reason?: string;
  options?: any;
}

/**
 * Respuesta de cancelación
 */
export interface EnviameCancelResponse {
  success: boolean;
  message: string;
  refundAmount?: number;
  refundCurrency?: string;
  cancelledAt?: Date;
}

/**
 * Información de la etiqueta
 */
export interface EnviameLabelInfo {
  trackingNumber: string;
  labelUrl: string;
  format: 'pdf' | 'zpl';
  size: string;
  expiresAt?: Date;
}

/**
 * Estados posibles de envío en Enviame
 */
export enum EnviameShipmentStatus {
  CREATED = 'created',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

/**
 * Filtros para el dashboard de Enviame
 */
export interface EnviameDashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: EnviameShipmentStatus[];
  trackingNumber?: string;
  recipient?: string;
  service?: string;
  carrier?: string;
}

/**
 * Métricas del dashboard
 */
export interface EnviameDashboardMetrics {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pending: number;
  cancelled: number;
  totalCost: number;
  averageDeliveryDays: number;
  deliveryRate: number;
}

/**
 * Configuración para formulario de cotización
 */
export interface EnviameRateFormConfig {
  showInsurance: boolean;
  showCashOnDelivery: boolean;
  showPackaging: boolean;
  defaultWeight: number;
  maxWeight: number;
  allowedCountries: string[];
  requiredFields: string[];
}

/**
 * Datos de cotización por pedido individual
 * Usado para manejar múltiples pedidos con diferentes bodegas/destinos
 */
export interface PedidoQuoteData {
  // Datos del pedido
  pedido: any;  // Pedido interface
  pedidoIndex: number;

  // Información de bodega (origen)
  bodegaId: string;
  bodegaNombre: string;
  bodegaData: {
    address: string;
    city: string;
    department: string;
    country: string;
    postalCode?: string;
  };

  // Información de destino
  destinoData: {
    address: string;
    city: string;
    department: string;
    country: string;
    postalCode?: string;
    recipient: {
      name: string;
      phone: string;
      email: string;
    };
  };

  // Información del paquete
  packageData: {
    weight: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    value: number;
    description: string;
    nPackages?: number;      // Número de bultos (paquetes físicos de la guía)
  };

  // Municipios DANE
  municipioOrigen: any;
  municipioDestino: any;

  // Resultados de cotización
  availableRates: EnviameRate[];
  selectedRate: EnviameRate | null;

  // Estado de cotización
  quotingStatus: 'pending' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

// ===== INTERFACES PARA CREACIÓN DE ENVÍOS UNIFICADOS =====

/**
 * Estructura unificada para crear envíos (single o multiple)
 * Siempre usa array shipments[], incluso para un solo envío
 */
export interface CreateShipmentRequest {
  companyId: string;
  provider: string;
  shippingOrder: {
    nroShippingOrder: string;
    fecha: string | Date;
    metodoEnvio?: string;
  };
  shipments: ShipmentItem[];  // Siempre array, incluso para single
  globalOptions?: ShipmentOptions;
}

/**
 * Item individual de envío con pedido completo incluido
 */
export interface ShipmentItem {
  pedido: any;  // Objeto completo del Pedido
  selectedService: SelectedService;
  origin: ShipmentLocation;
  destination: ShipmentDestination;
  package: ShipmentPackage;
  options?: ShipmentOptions;
}

/**
 * Servicio seleccionado de la cotización
 */
export interface SelectedService {
  service: string;
  serviceCode: string;
  carrier: string;
  carrierCode: string;
  price: number;
  currency: string;
  estimatedDays: string;
  estimatedTime: string;
}

/**
 * Ubicación de origen
 */
export interface ShipmentLocation {
  placeCode?: string;
  municipioCode?: string;
  municipioName?: string;
  address: string;
  city: string;
  department?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

/**
 * Ubicación de destino con datos del destinatario
 */
export interface ShipmentDestination extends ShipmentLocation {
  recipient: {
    name: string;
    phone: string;
    email: string;
    document?: string;
    documentType?: string;
  };
}

/**
 * Información del paquete
 */
export interface ShipmentPackage {
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  value: number;
  description: string;
  quantity?: number;
  nPackages?: number;      // Número de bultos (paquetes físicos de la guía)
}

/**
 * Opciones adicionales de envío
 */
export interface ShipmentOptions {
  insuranceValue?: number;
  cashOnDelivery?: boolean;
  signature?: boolean;
  packaging?: string;
  comments?: string;
  normalizeResponse?: boolean;
}