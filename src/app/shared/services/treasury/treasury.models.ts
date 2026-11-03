/**
 * Spec 013 — Tesorería MVP. Contratos de datos del módulo de tesorería.
 * Identifiers en inglés (acuerdo del proyecto); textos de UI en español.
 * Alineado 1:1 con el CONTRATO DE DATOS/API del backend /v1/treasury.
 */

export type VerificationState = 'Pendiente' | 'Aprobado' | 'Rechazado';
export type AiFlag = 'clear' | 'duplicate';
export type ReviewAction = 'approve' | 'reject';
export type PaymentOrigin = 'vendedor' | 'tesorero' | 'pos' | 'webhook';
export type AlertSeverity = 'high' | 'medium';
export type AlertType = 'duplicate_file' | 'duplicate_ref';

/** GET /config */
export interface TreasuryConfig {
  treasuryEnabled: boolean;
}

/** Bloque de KPI con monto + cantidad. */
export interface MetricAmount {
  monto: number;
  cantidad: number;
}
/** Bloque de KPI solo con cantidad. */
export interface MetricCount {
  cantidad: number;
}

/** GET /metrics — todo calculado server-side. */
export interface TreasuryMetrics {
  recaudadoHoy: MetricAmount;
  /** Ticket 1461: con la cartera interna encendida, `internos` es lo que se apartó (empleados, socios, empresa propia). */
  carteraPendiente: MetricAmount & { internos?: MetricAmount };
  /** Ticket 1461: claves de documento de los clientes internos (solo con la cartera interna encendida). */
  clavesInternas?: string[];
  /** `true` si el comercio tiene más de 2000 clientes internos y la lista se cortó (algunos no llevan el chip «Interno»). */
  clavesInternasRecortado?: boolean;
  porRevisar: MetricAmount;
  sinPago: MetricCount;
  alertasActivas: MetricCount;
  rechazados: MetricCount;
}

/** Detalle de alerta anti-fraude adjunto a un pago. */
export interface AiDetails {
  tipo: string;
  pedidosInvolucrados: string[];
  detalle: string;
}

/** Pago que viaja en submit / direct (shape del body del contrato). */
export interface TreasuryPagoInput {
  valor: number;
  formaPago: string;
  numeroComprobante: string;
  fechaTransaccion: string;
  archivo: string;
  archivoEvidencia: string;
  archivoHash: string;
  notas: string;
  fecha: string;
  usuarioRegistro: string;
}

/** Body de POST /payments/submit y /payments/direct. */
export interface SubmitPaymentPayload {
  orderId: string;
  pago: TreasuryPagoInput;
  /**
   * Origen del registro (whitelist backend: vendedor|pos; tesorero/webhook los
   * asigna el server). Opcional: si se omite, el backend registra "vendedor".
   */
  origen?: PaymentOrigin;
}

/** Alerta devuelta inline en la respuesta de submit/direct. */
export interface InlineAlert {
  id?: string;
  severity: AlertSeverity;
  alertType: AlertType;
  message: string;
  orderIds?: string[];
  paymentId?: string;
}

/** Respuesta de POST /payments/submit y /payments/direct. */
export interface SubmitPaymentResponse {
  success: boolean;
  paymentId: string;
  estadoPago: string;
  valorRestante: number;
  alerts: InlineAlert[];
  alreadyDecided?: boolean;
}

/** Respuesta de POST /payments/:id/review. */
export interface ReviewPaymentResponse {
  success: boolean;
  estadoPago: string;
  valorRestante?: number;
  alreadyDecided?: boolean;
}

/** Respuesta de POST /orders/:orderId/payment-state. */
export interface ChangePaymentStateResponse {
  success: boolean;
  estadoPago: string;
  /** D-493: el pago cancelado devolvió el inventario a la bodega. */
  devolucionInventario?: boolean;
}

/** Item de la colección normalizada `payments` (historial). */
export interface TreasuryPayment {
  id?: string;
  company?: string;
  orderId: string;
  nroPedido: string;
  valor: number;
  formaPago: string;
  referencia: string;
  fechaTransaccion: string;
  archivoUrl?: string;
  archivoHash?: string;
  notas?: string;
  estadoVerificacion: VerificationState;
  motivoRechazo?: string;
  registradoPor?: string;
  registradoRol?: string;
  revisadoPor?: string;
  revisadoAt?: string;
  aiFlag?: AiFlag;
  aiDetails?: AiDetails | null;
  origen?: PaymentOrigin;
  manual?: boolean;
  createdAt?: string;
}

export interface PaymentsPagination {
  totalItems: number;
  currentPage: number;
  pageSize: number;
}

/** Respuesta de GET /payments (historial paginado). */
export interface PaymentsHistoryResponse {
  items: TreasuryPayment[];
  pagination: PaymentsPagination;
  /** Recaudado (pagos aprobados) del filtro actual, por forma de pago (ticket 1454). */
  resumen?: HistorialResumen;
  /** Formas de pago y usuarios que hay en el periodo, para los filtros. */
  opciones?: { formasPago: string[]; usuarios: string[] };
  /** true si el periodo es tan grande que se alcanzó el tope de lectura del servidor. */
  truncado?: boolean;
}

export interface HistorialResumen {
  porMetodo: { formaPago: string; cantidad: number; monto: number }[];
  montoAprobado: number;
  cantidadAprobada: number;
}

/** GET /orders/totals: totales de todo el resultado filtrado (ticket 1454). */
export interface OrdersTotals {
  totalItems: number;
  anticipo: number;
  faltaPorPagar: number;
  truncado?: boolean;
}

/** Filtros de GET /payments. */
export interface PaymentsHistoryFilters {
  status?: string;
  formaPago?: string;
  /** Correo de quien subió el pago (ticket 1454). */
  registradoPor?: string;
  desde?: string;
  hasta?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Filtros de la cola "Por revisar" (ticket 1126). Fechas sobre la creación del pago. */
export interface ReviewQueueFilters {
  formaPago?: string;
  desde?: string;
  hasta?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * GET /payments/queue: una fila por comprobante pendiente, con la forma de la
 * tabla de pedidos. Cada fila es el pedido + `_pagoPendiente`; `_pagoFueraDelPedido`
 * cuando el pedido no tiene ese pago (no se puede aprobar ni rechazar desde aquí).
 */
export interface ReviewQueueResponse {
  orders: any[];
  pagination: { totalItems: number; currentPage: number; pageSize: number };
}

/** Item de la colección `treasury_alerts`. */
export interface TreasuryAlert {
  id?: string;
  company?: string;
  severity: AlertSeverity;
  alertType: AlertType;
  message: string;
  orderIds?: string[];
  paymentId?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt?: string;
}

/** Respuesta de GET /alerts. `total` es el conteo real de alertas del filtro. */
export interface AlertsResponse {
  items: TreasuryAlert[];
  total?: number;
}

/** Alertas de una misma referencia (GET /alerts?agrupar=true, ticket 1451). */
export interface AlertGroup {
  key: string;
  alertType: AlertType;
  referencia: string;
  /** Referencia de relleno («1», el número del pedido…), no un comprobante real. */
  generica: boolean;
  severity: AlertSeverity;
  resolved: boolean;
  cantidadAlertas: number;
  alertIds: string[];
  totalPedidos: number;
  /** Hasta 30 pedidos con su número visible (DAD-xxxxx). */
  pedidos: { orderId: string; nroPedido: string }[];
  ultimaFecha: string;
}

export interface AlertGroupsResponse {
  total: number;
  grupos: AlertGroup[];
  pagination: { totalItems: number; currentPage: number; pageSize: number };
  truncado?: boolean;
}
