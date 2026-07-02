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
  carteraPendiente: MetricAmount;
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
}

/** Filtros de GET /payments. */
export interface PaymentsHistoryFilters {
  status?: string;
  formaPago?: string;
  desde?: string;
  hasta?: string;
  search?: string;
  page?: number;
  pageSize?: number;
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

/** Respuesta de GET /alerts. */
export interface AlertsResponse {
  items: TreasuryAlert[];
}
