import { Carrito, Cliente } from "../../ventas/modelo/pedido";

/**
 * Modelo de Cotización — spec 008 (T-13).
 * Reusa `Carrito` y `Cliente` del módulo de ventas para mantener fidelidad
 * de precios/IVA (los ítems llevan la misma forma que el carrito de venta asistida,
 * incluyendo _precioManualOverride / _ivaManualOverride y configuracion).
 */

// Estados canónicos (coinciden con el backend tras normalizarEstado).
export type EstadoCotizacion =
  | "borrador"
  | "enviada"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "convertida";

export const ESTADOS_COTIZACION: { value: EstadoCotizacion; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviada", label: "Enviada" },
  { value: "aceptada", label: "Aceptada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "vencida", label: "Vencida" },
  { value: "convertida", label: "Convertida" },
];

export interface VendedorCotizacion {
  email: string;
  nombre?: string;
}

export interface Cotizacion {
  id?: string;
  nroCotizacion?: string;
  company?: string;
  estadoCotizacion: EstadoCotizacion;
  cliente?: Cliente | null;
  vendedor?: VendedorCotizacion | null;
  // Ítems con la misma forma que el carrito de venta asistida.
  items: Carrito[];
  descGlobal?: number;
  // Totales calculados en el frontend (fuente de verdad — PaymentService).
  subtotal?: number;
  totalDescuento?: number;
  baseGravable?: number;
  totalImpuesto?: number;
  total?: number;
  // Términos y condiciones (precargados del default de empresa).
  terminos?: string;
  fechaCreacion?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  validezDias?: number;
  // Banderas de conversión (fase 008.2).
  convertidaAPedido?: boolean;
  pedidoGenerado?: string | null;
  date_edit?: string;
  user_edit?: string;
}

// KPIs del listado (GET /v1/cotizaciones/metrics).
export interface CotizacionMetrics {
  cotizadoMes: number;
  pipelineActivo: number;
  tasaConversion: number;
  borradores: number;
  total?: number;
  porEstado?: { [estado: string]: number };
}

// Config de términos base por empresa (GET/PUT /v1/cotizaciones/config).
export interface CotizacionConfig {
  terminosBase: string;
}

export interface CotizacionListFilter {
  estado?: EstadoCotizacion | "";
  q?: string;
  pedido?: string;
  page?: number;
  limit?: number;
}

export interface CotizacionPaginatedResponse {
  success: boolean;
  data: Cotizacion[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CotizacionMetricsResponse {
  success: boolean;
  data: CotizacionMetrics;
}

export interface CotizacionConfigResponse {
  success: boolean;
  data: CotizacionConfig;
}

export interface CotizacionDetailResponse {
  success: boolean;
  data: Cotizacion;
}
