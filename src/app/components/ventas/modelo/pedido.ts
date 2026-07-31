import {
  Producto,
  ProductoCarrito,
} from "../../../shared/models/productos/Producto";
import { UserLite } from "../../../shared/models/User/UserLite";
import { PagoInformation } from "../../pos/pos-modelo/pedido";

export interface DescuentoAplicado {
  descuentoId: string;
  codigoPersonalizado: string;
  tipo?: "porcentaje" | "valor_fijo" | "envio_gratis";
  valor?: number;
  montoDescuento: number;
  nombre?: string;
  clienteId?: string;
}

export interface Pedido {
  quienRecibio?: string;
  parentesco?: string;
  providerShipment?: string;
  generarFacturaElectronica?: any;
  pdfUrlInvoice?: string;
  pagoRecibido?: any;
  cambioEntregado?: any;
  transaccionId?: any;
  bodegaId?: string;
  entregado?: UserLite;
  transportador?: any;
  nroShippingOrder?: string;
  despachador?: UserLite;
  fechaYHorarioDespachado?: string;
  _id?: string;
  fechaHoraEmpacado?: string;
  porceDescuento?: number;
  typeOrder?: string;
  nroPedido?: string;
  empacador?: string;
  referencia: string;
  nroPedidoReferencia?: string;
  company?: string;
  cliente?: Cliente;
  notasPedido?: NotasPedido;
  notasEntregaMensajero?: string;
  carrito?: Carrito[];
  formaDePago?: string;
  cuponAplicado?: string;
  // Código de descuento/promoción aplicado en el carrito (módulo Descuentos y
  // Promociones). Lo puebla el carrito tras validar contra
  // /v1/descuentos-promociones/aplicar-codigo. El backend lo usa al crear la
  // orden para registrar la redención (incrementa usos y auto-agota).
  descuentoAplicado?: DescuentoAplicado;
  totalPedidoSinDescuento?: number;
  totalEnvio?: number;
  totalDescuento?: number;
  totalImpuesto?: number;
  anticipo?: number;
  faltaPorPagar?: number;
  subtotal?: number;
  totalPedididoConDescuento?: number;
  facturacion?: Facturacion;
  envio?: Envio;
  fechaEntrega?: string;
  horarioEntrega?: string;
  formaEntrega?: string;
  asesorAsignado?: UserLite;
  fechaCreacion?: string;
  estadoProceso: EstadoProceso;
  shippingOrder?: any;
  estadoPago: EstadoPago;
  nroFactura?: string;
  fechaFactura?: string;
  PagosAsentados?: Pago[];
  validacion?: boolean;
  pagoInformation?: PagoInformation;
  channel?: Channel;
  _estadoCalculadoEnFrontend?: boolean;
  _calculadoEnBackend?: boolean; // Indica si los totales fueron calculados por el backend (calculateOrderTotals)
  preAprobadoManual?: boolean;
  // Propiedades de evidencia de entrega
  fotosEvidencia?: string[];
  fotoEvidencia?: string;
  fotoEvidenciaEmpacado?: string[];
  signatureImage?: string;
  historialEstadoProceso?: HistorialEstadoProceso[];
  ultimaImpresion?: string; // Fecha/hora de la última impresión
  revisadoParaProduccion?: string; // Fecha/hora de revisión para producción
  shippment?: Shippment;
  // Integración con plataformas e-commerce
  integrations?: {
    woocommerce?: {
      orderId?: number;
      orderNumber?: string;
      status?: string;
      currency?: string;
      paymentMethod?: string;
      paymentMethodTitle?: string;
      dateCreated?: string;
    };
    shopify?: {
      orderId?: number;
      orderNumber?: string;
      status?: string;
      currency?: string;
      paymentMethod?: string;
      dateCreated?: string;
    };
  };
  // Información de fulfillment (Aliaddo u otros proveedores)
  fulfillment?: FulfillmentInfo;
}

/**
 * Información de fulfillment para órdenes despachadas por proveedores externos.
 * Se actualiza automáticamente cuando la orden usa una bodega de fulfillment.
 */
export interface FulfillmentInfo {
  /** Estado actual del fulfillment */
  status: FulfillmentStatus;
  /** Nombre del proveedor (ej: 'aliaddo') */
  provider: string;
  /** ID de la orden en el sistema del proveedor */
  fulfillmentOrderId?: string;
  /** Número de guía de envío */
  trackingNumber?: string;
  /** URL de seguimiento del envío */
  trackingUrl?: string;
  /** Nombre del transportador */
  carrier?: string;
  /** ID del warehouse en el proveedor */
  warehouseId?: string;
  /** ID de la bodega en Katuq */
  bodegaId?: string;
  /** Nombre de la bodega en Katuq */
  bodegaNombre?: string;
  /** Fecha/hora de envío al proveedor */
  sentAt?: string;
  /** Fecha/hora del último fallo */
  failedAt?: string;
  /** Fecha/hora de inicio del proceso */
  startedAt?: string;
  /** Última actualización del estado */
  lastUpdate?: string;
  /** Fecha estimada de entrega */
  estimatedDelivery?: string;
  /** Duración del proceso en ms */
  durationMs?: number;
  /** Mensaje de error si falló */
  error?: string;
  /** Código de error */
  errorCode?: string;
  /** Tipo de error */
  errorType?: string;
  /** Si el error permite reintento */
  retryable?: boolean;
  /** Número de reintentos realizados */
  retryCount?: number;
  /** Fecha del último reintento */
  lastRetryAt?: string;
  /** Indica si se recibió webhook */
  webhookReceived?: boolean;
  /** Eventos de tracking */
  trackingEvents?: TrackingEvent[];
  /** Respuesta original del proveedor */
  response?: {
    status?: string;
    createdAt?: string;
  };
  /** Metadata adicional del proveedor */
  metadata?: Record<string, any>;
}

/**
 * Estados posibles del fulfillment
 */
export type FulfillmentStatus =
  | 'pending'      // Pendiente de envío
  | 'sent'         // Enviado al proveedor
  | 'processing'   // En proceso por el proveedor
  | 'ready'        // Listo para despacho
  | 'packed'       // Empacado
  | 'shipped'      // Despachado
  | 'in_transit'   // En tránsito
  | 'out_for_delivery' // En camino de entrega
  | 'delivered'    // Entregado
  | 'failed'       // Falló el envío al proveedor
  | 'error'        // Error de sistema
  | 'cancelled'    // Cancelado
  | 'returned';    // Devuelto

/**
 * Evento de tracking del envío
 */
export interface TrackingEvent {
  /** Estado del evento */
  status: string;
  /** Descripción del evento */
  description?: string;
  /** Ubicación del evento */
  location?: string;
  /** Fecha/hora del evento */
  timestamp: string;
}

export interface Shippment {
  /**
   * Identificador del envío EN EL PROVEEDOR (Enviame lo llama shipmentId). Es
   * el que se usa para cancelar o rastrear contra su API — no confundir con
   * `pedido.shippingOrder`, que es el consecutivo interno de Katuq.
   */
  shipmentId?: number | string;
  /** Guía del transportador final (Coordinadora, Servientrega...). */
  trackingNumber?: string;
  /** URL del PDF de la etiqueta. */
  labelPdf?: string;
  /** Transportador que realmente lleva el paquete. */
  carrier?: string;
  /** Servicio contratado (ecommerce, std...). */
  service?: string;
  status?: string;
  canCancel?: boolean;
  canTrack?: boolean;
  canDownloadLabel?: boolean;
  provider?: string;
  historyShippment?: HistoryShippment[];
}

export interface HistoryShippment {
  status?: string;
  fecha?: string;
  usuario?: string;
  notas?: string;
}

export interface HistorialEstadoProceso {
  estado: EstadoProceso;
  fecha: string;
  usuario: string;
  notas?: string;
}

export interface Channel {
  id?: string;
  name?: string;
  tipo?: string;
  activo?: boolean;
  createdAt?: string;
}

export interface Pago {
  fecha?: string;
  formaPago?: string;
  valor?: number;
  numeroComprobante?: string;
  archivo?: string;
  notas?: string;
  numeroPedido?: string;
  fechaTransaccion?: string;
  valorTotalVenta?: number;
  valorRegistrado?: number;
  valorRestante?: number;
  archivoEvidencia?: string;
  usuarioRegistro?: string;
  estadoVerificacion?: string;
  fechaHoraSistema?: string;
  fechaHoraCarga?: string;
  fechaHoraAprobacionRechazo?: string;
  /** Spec 013 — id del doc en la colección `payments` cuando el pago entró al flujo de tesorería. */
  paymentId?: string;
}

export enum EstadoPago {
  Pendiente = "Pendiente",
  Pospendiente = "Pospendiente",
  PreAprobado = "PreAprobado",
  Aprobado = "Aprobado",
  Rechazado = "Rechazado",
  Precancelado = "Precancelado",
  Cancelado = "Cancelado",
}
export enum EstadoProceso {
  SinProducir = "SinProducir",
  Producido = "Producido",
  Empacado = "Empacado",
  EnDespacho = "EnDespacho",
  Despachado = "Despachado",
  Rechazado = "Rechazado",
  Entregado = "Entregado",
  ProducidoTotalmente = "ProducidoTotalmente",
  ProducidoParcialmente = "ProducidoParcialmente",
  ParaDespachar = "ParaDespachar",
  Cerrado = "Cerrado",
  EnProduccion = "EnProduccion",
  // Estados específicos de Dropshipping
  SolicitadoProveedor = "SolicitadoProveedor",
  AceptadoProveedor = "AceptadoProveedor",
  RechazadoProveedor = "RechazadoProveedor",
  DespachadoProveedor = "DespachadoProveedor",
  EnTransitoProveedor = "EnTransitoProveedor",
}

export enum EstadoProcesoFiltros {
  SinProducir = "SinProducir",
  Empacado = "Empacado",
  EnDespacho = "EnDespacho",
  Despachado = "Despachado",
  Entregado = "Entregado",
  Rechazado = "Rechazado",
  EnProduccion = "EnProduccion",
  ProducidoTotalmente = "ProducidoTotalmente",
  ProducidoParcialmente = "ProducidoParcialmente",
  ParaDespachar = "ParaDespachar",
  Cerrado = "Cerrado",
  // Filtros específicos de Dropshipping
  SolicitadoProveedor = "SolicitadoProveedor",
  AceptadoProveedor = "AceptadoProveedor",
  RechazadoProveedor = "RechazadoProveedor",
  DespachadoProveedor = "DespachadoProveedor",
  EnTransitoProveedor = "EnTransitoProveedor",
}

export interface CategoriaCliente {
  id: string;
  nombre?: string;
  descripcion?: string;
}

export interface Cliente {
  estado?: string;
  tipo_documento_comprador?: string;
  correo_electronico_comprador?: string;
  documento?: string;
  indicativo_celular_comprador?: string;
  numero_celular_comprador?: string;
  nombres_completos?: string;
  numero_celular_whatsapp?: string;
  apellidos_completos?: string;
  indicativo_celular_whatsapp?: string;
  datosFacturacionElectronica?: Facturacion;
  datosEntrega?: Entrega;
  notas?: Notas;
  categoria?: CategoriaCliente;
}

export interface NotasPedido {
  notasDespachos: Notas[];
  notasEntregas: Notas[];
  notasCliente: Notas[];
  notasProduccion: Notas[];
  notasFacturacionPagos: Notas[];
}

export interface Carrito {
  estadoProcesoProducto?: EstadoProceso;
  producto?: Producto;
  configuracion?: Configuracion;
  cantidad?: number;
  notaProduccion?: Notas[];
  _precioManualOverride?: number;
  _ivaManualOverride?: number;
  _precioManualTemp?: any;
  /** Descuento opcional por línea (porcentaje 0–100). Usado en cotizaciones. */
  descuentoLinea?: number;
}

export interface Facturacion {
  tipoDocumento: string;
  codigoPostal: string;
  indicativoCel: string;
  ciudad: string;
  direccion: string;
  alias: string;
  documento: string;
  celular: string;
  departamento: string;
  correoElectronico: string;
  nombres: string;
  pais: string;
  zonaCobro?: string;
}

export interface Entrega {
  apellidos?: string;
  barrio?: string;
  indicativoOtroNumero?: string;
  especificacionesInternas?: string;
  nombres?: string;
  otroNumero?: string;
  pais?: string;
  direccionEntrega?: string;
  indicativoCel?: string;
  ciudad?: string;
  observaciones?: string;
  alias?: string;
  celular?: string;
  departamento?: string;
  codigoPV?: string;
  nombreUnidad?: string;
}

export interface Notas {
  fecha?: string;
  nota?: string;
  descripcion?: string;
  producto?: string;
  usuario?: string;
  productoId?: string;
  fromFormulario?: boolean;
  // Propiedades para archivos adjuntos
  archivos?: NotaArchivo[];
}

// Nueva interfaz para archivos adjuntos a notas
export interface NotaArchivo {
  url: string;
  nombre: string;
  path: string;
  tipo: string; // 'imagen', 'video', 'documento'
  fechaSubida: string;
}

export interface Envio {
  apellidos: string;
  barrio: string;
  indicativoOtroNumero: string;
  especificacionesInternas: string;
  nombres: string;
  otroNumero: string;
  pais: string;
  direccionEntrega: string;
  indicativoCel: string;
  ciudad: string;
  observaciones: string;
  alias: string;
  celular: string;
  departamento: string;
  codigoPV: string;
  nombreUnidad: string;
  zonaCobro: string;
  valorZonaCobro?: number;
  latitud?: string;
  longitud?: string;
  coordenadas?: string;
}

//Configuracion de producto
export interface Configuracion {
  producto: Producto;
  datosEntrega: DatosEntrega;
  preferencias: Preferencia[];
  adiciones: Adicion[];
  tarjetas: Tarjeta[];
  camposPersonalizados?: { [grupoId: string]: { [campoId: string]: any } };
}

export interface DatosEntrega {
  tipoEntrega: string;
  formaEntrega: string;
  fechaEntrega: Fecha;
  horarioEntrega: string;
  genero: number[];
  ocasion: string;
  colores: string[];
  observaciones: string;
}

export interface Fecha {
  year: number;
  month: number;
  day: number;
}

export interface Preferencia {
  titulo: string;
  subtitulo: string;
  valorUnitarioSinIva: number;
  valorIva: number;
  porcentajeIva: string;
  precioTotalConIva: number;
  imagen: string;
  tipo: string;
}

export interface Adicion {
  titulo: string;
  subtitulo: string;
  valorUnitarioSinIva: number;
  valorIva: number;
  porcentajeIva: number;
  precioTotalConIva: number;
  imagen: string;
  tipo: string;
}

export interface Tarjeta {
  para: string;
  mensaje: string;
  de: string;
}

// fin configuracion de producto
