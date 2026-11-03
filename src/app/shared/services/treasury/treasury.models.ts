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
  /** Ticket 1455: el rechazo pide un motivo de la lista (bandera `motivoRechazoPago` de la empresa). */
  motivoRechazoPago?: boolean;
  /** Ticket 1448: la empresa puede marcar pedidos como Crédito (bandera `estadoCredito`). */
  estadoCredito?: boolean;
  /** Ticket 1455: lista de motivos frecuentes; sale del servidor, no se copia en el front. */
  motivosRechazo?: MotivoRechazoPago[];
  /** Ticket 1449: «Registrar pago» pide primero el comprobante y lo lee con IA (bandera `comprobantePrimero`). */
  comprobantePrimero?: boolean;
}

/** Ticket 1449: campos que la lectura del comprobante sugiere (cualquiera puede venir en null). */
export interface LecturaComprobanteCampos {
  banco: string | null;
  medio: string | null;
  valor: number | null;
  moneda: string | null;
  fecha: string | null;
  hora: string | null;
  referencia: string | null;
  cuentaDestinoUltimos4: string | null;
}

/** Ticket 1449: respuesta de POST /payments/read-receipt. `modo: 'manual'` = se llena a mano; nunca impide registrar. */
export interface LecturaComprobanteResponse {
  success: boolean;
  modo: 'ia' | 'manual';
  campos?: LecturaComprobanteCampos;
  /** 0 a 1 por campo. */
  confianza?: Record<string, number>;
  huella?: string;
  /** Firma de la lectura: se devuelve tal cual al registrar el pago para que el servidor marque lo «editado a mano». */
  lecturaToken?: string;
  venceEnMinutos?: number;
  motivoCodigo?: string;
  message?: string;
}

/** Ticket 1449: cuenta donde el comercio recibe pagos (nunca el número completo). */
export interface CuentaReceptora {
  id?: string;
  medio: string;
  banco: string;
  alias: string;
  ultimos4: string;
  activa?: boolean;
}

/** Ticket 1449: GET /comprobante/config (lo que el formulario necesita; `todasLasCuentas` solo para un Administrador con `?completo=1`). */
export interface ComprobanteConfigVista {
  success: boolean;
  obligatorio: boolean;
  antiguedadMaximaDias: number;
  formasSinReferencia: string[];
  cuentasReceptoras: CuentaReceptora[];
  todasLasCuentas?: CuentaReceptora[];
}

/** Ticket 1449: cuerpo de PUT /comprobante/config. */
export interface ComprobanteConfigPayload {
  comprobante?: { obligatorio?: boolean; antiguedadMaximaDias?: number; formasSinReferencia?: string[] };
  cuentasReceptoras?: CuentaReceptora[];
}

/** Ticket 1449: aviso de la revisión del comprobante al registrar (el pago se registra igual). */
export interface ComprobanteAviso {
  regla: string;
  motivo: string;
}

/** Ticket 1455: un motivo frecuente al rechazar un pago. `codigo` es estable; `texto` es el nombre en español. */
export interface MotivoRechazoPago {
  codigo: string;
  texto: string;
}

/** Ticket 1455: tipos de evento de la línea de tiempo de un pago. */
export type PaymentAuditEventType =
  | 'subido'
  | 'aprobado'
  | 'rechazado'
  | 'anulado'
  | 'editado'
  | 'edicion_bloqueada'
  | 'estado_pedido'
  | 'estado_pedido_bloqueado'
  | 'alerta'
  | 'nota';

export interface PaymentAuditEvent {
  hora: string;
  tipo: PaymentAuditEventType;
  paymentId: string | null;
  quien: string;
  rol: string;
  canal: string;
  antes: any;
  despues: any;
  motivo: string;
  motivoCodigo: string;
  detalle: string;
}

export interface PaymentAuditSummary {
  paymentId: string;
  valor: number | null;
  formaPago: string;
  referencia: string;
  estadoVerificacion: string;
  motivoRechazo: string;
  motivoRechazoCodigo: string;
  registradoPor: string;
  revisadoPor: string;
  revisadoAt: string;
}

/** GET /payments/:id/audit y GET /orders/:orderId/payments-audit */
export interface PaymentAuditResponse {
  success: boolean;
  /** Solo en la línea de tiempo de un pago. */
  pago?: PaymentAuditSummary;
  /** Solo en la línea de tiempo de un pedido. */
  orderId?: string;
  pagos?: PaymentAuditSummary[];
  eventos: PaymentAuditEvent[];
  page: number;
  pageSize: number;
  total: number;
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
  /** Ticket 1449 (solo con la bandera `comprobantePrimero`): datos del comprobante que la persona confirmó. */
  banco?: string;
  hora?: string;
  cuentaDestino?: { ultimos4: string };
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
  /** Ticket 1449 (bandera `comprobantePrimero`): la lectura firmada y la casilla «Verificado en banco». El servidor decide qué vale. */
  comprobante?: { lecturaToken?: string; verificadoEnBanco?: boolean };
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
  /** Ticket 1449: avisos de la revisión del comprobante (no bloquean) y campos que la persona cambió respecto a la lectura. */
  comprobanteAvisos?: ComprobanteAviso[];
  camposEditados?: string[];
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
  /** Ticket 1448: al marcar Crédito, qué pasó con el cupo del cliente (solo con la bandera `estadoCredito`). */
  cupo?: { estado: 'tiene' | 'guardado' | 'sin_cupo' | 'sin_ficha' | 'sin_permiso' | 'sin_documento' | 'invalido' | 'error'; cupo?: number };
  /** Ticket 1448: true si el pedido quedó en Crédito pero el cliente sigue sin cupo guardado. */
  cupoPendiente?: boolean;
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
  /** Ticket 1449: campos del comprobante que la persona cambió respecto a lo que leyó la IA (lo decide el servidor). */
  camposEditados?: string[];
  /** Ticket 1449: quién marcó «Verificado en banco» (pago sin comprobante) y cuándo. */
  verificadoEnBanco?: { por: string; fecha: string };
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

/**
 * Ticket 1453 (D-661 propuesta): un solo pago para varios pedidos del mismo cliente (bandera `pagoVariosPedidos`).
 * Lo que muestra de plata (saldo, tope, reparto sugerido) lo calcula el servidor; la pantalla solo lo presenta.
 */
export interface PedidoAbiertoGrupo {
  orderId: string;
  nroPedido: string;
  fechaCreacion: string | null;
  estadoPago: string;
  total: number;
  saldo: number;
  /** Lo que ya tiene en revisión de Tesorería (no se vuelve a pagar). */
  enRevision: number;
  /** Lo máximo que puede recibir este pago: saldo menos lo que está en revisión. */
  tope: number;
}

export interface ParteReparto {
  orderId: string;
  valor: number;
}

/** POST /payments/group/preview */
export interface VistaPreviaPagoGrupo {
  success: boolean;
  documento: string;
  cliente: string;
  maxPedidos: number;
  pedidos: PedidoAbiertoGrupo[];
  reparto: ParteReparto[];
  repartido: number;
  sobrante: number;
  truncado: boolean;
  /** Otros formatos del mismo documento con pedidos abiertos (Cartera los cuenta como otro cliente). */
  variantes: { documento: string; pedidos: number }[];
}

/** POST /payments/group */
export interface PagoGrupoPayload {
  documento: string;
  valor: number;
  formaPago: string;
  referencia: string;
  fechaTransaccion: string;
  fecha: string;
  archivo: string;
  archivoHash: string;
  notas: string;
  reparto: ParteReparto[];
  /** Llave de esta apertura del diálogo: un reintento con la misma llave nunca duplica el pago. */
  idempotencyKey: string;
}

export type EstadoParteGrupo = 'registrado' | 'ya_registrado' | 'completado' | 'en_curso' | 'error' | 'decidido' | 'ya_decidido';

export interface ResultadoParteGrupo {
  orderId: string;
  nroPedido: string;
  valor?: number;
  estado: EstadoParteGrupo;
  paymentId?: string;
  estadoPago?: string;
  codigo?: string;
  motivo?: string;
}

export interface RegistroPagoGrupoResponse {
  success: boolean;
  grupoPagoId: string;
  valor: number;
  resultados: ResultadoParteGrupo[];
  message?: string;
}

/** POST /payments/group/:grupoPagoId/review */
export interface RevisionPagoGrupoResponse {
  success: boolean;
  grupoPagoId: string;
  accion: ReviewAction;
  resultados: ResultadoParteGrupo[];
}
