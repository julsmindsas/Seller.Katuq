/**
 * ========================================================================
 * INTERFACES PARA HISTORIAL DE ESTADOS DE PEDIDOS
 * ========================================================================
 * Creado: 2025-10-21
 * Propósito: Tipado para el sistema de historial de cambios de estado
 * Colección backend: order_status_history
 * 
 * Archivo NUEVO - No modifica ninguna interfaz existente
 */

/**
 * Tipos de transición de estados
 */
export type TransitionType = 
  | 'forward'      // Avance normal en el flujo
  | 'backward'     // Retroceso (sospechoso)
  | 'rejection'    // Rechazo de orden
  | 'cancellation' // Cancelación
  | 'same'         // Sin cambio
  | 'unknown';     // Tipo desconocido

/**
 * Registro individual de cambio de estado en el historial
 */
export interface OrderStatusHistory {
  /** ID del registro en Firestore */
  id: string;
  
  /** ID de la orden (_id) */
  orderId: string;
  
  /** Número de pedido (ej: DAD-000976) */
  nroPedido: string;
  
  /** Nombre de la empresa */
  company: string;
  
  /** Email del usuario que realizó el cambio (o "Sistema") */
  userEmail: string;
  
  /** Estado anterior de la orden */
  previousStatus: string;
  
  /** Estado nuevo de la orden */
  newStatus: string;
  
  /** Timestamp del cambio (Firestore Timestamp o Date) */
  timestamp: any;
  
  /** Origen del cambio (ej: "updateOrderInternal", "editByTransporter") */
  source: string;
  
  /** Metadata adicional del contexto */
  metadata?: OrderHistoryMetadata;
  
  /** Otros campos que cambiaron en la orden */
  changes?: Record<string, any>;
  
  /** Tipo de transición */
  transitionType: TransitionType;
  
  /** Indica si es un retroceso sospechoso */
  isBackward: boolean;
}

/**
 * Metadata adicional del cambio de estado
 */
export interface OrderHistoryMetadata {
  /** Rol del usuario que hizo el cambio */
  userRole?: string;
  
  /** Si el usuario estaba autorizado para el cambio */
  wasAuthorized?: boolean;
  
  /** Transiciones permitidas desde el estado anterior */
  allowedTransitions?: string[];
  
  /** Transición intentada */
  transitionAttempted?: string;
  
  /** Información del transportador */
  transportador?: string | { nombre: string; placa: string };
  transportadorNombre?: string;
  transportadorPlaca?: string;
  transportadorId?: string;
  
  /** Número de shipping order */
  shippingOrder?: string;
  
  /** Motivo de rechazo (si aplica) */
  motivoRechazo?: string;
  
  /** Observaciones adicionales */
  observaciones?: string;
  
  /** Si se usó API key para el cambio */
  apiKeyUsed?: string;
  
  /** Campos adicionales dinámicos */
  [key: string]: any;
}

/**
 * Respuesta del endpoint de historial
 */
export interface OrderHistoryResponse {
  /** Indica si la petición fue exitosa */
  success: boolean;
  
  /** ID de la orden consultada */
  orderId: string;
  
  /** Número de pedido */
  nroPedido: string;
  
  /** Empresa de la orden */
  company: string;
  
  /** Total de registros en el historial */
  totalRecords: number;
  
  /** Array de cambios de estado */
  history: OrderStatusHistory[];
  
  /** Mensaje informativo */
  message?: string;
  
  /** Error si la petición falló */
  error?: string;
}

/**
 * Configuración para el componente de timeline
 */
export interface OrderHistoryTimelineConfig {
  /** Mostrar metadata expandible */
  showExpandableMetadata?: boolean;
  
  /** Mostrar timestamps relativos (ej: "Hace 2 horas") */
  useRelativeTime?: boolean;
  
  /** Resaltar retrocesos sospechosos */
  highlightBackwardTransitions?: boolean;
  
  /** Mostrar filtros por tipo de transición */
  enableFilters?: boolean;
  
  /** Altura máxima del timeline */
  maxHeight?: string;
}

/**
 * Estados del proceso (para referencia)
 */
export enum EstadoProcesoHistorial {
  SinProducir = 'SinProducir',
  EnProduccion = 'EnProduccion',
  ProducidoParcialmente = 'ProducidoParcialmente',
  ProducidoTotalmente = 'ProducidoTotalmente',
  ParaDespachar = 'ParaDespachar',
  EnDespacho = 'EnDespacho',
  Empacado = 'Empacado',
  Despachado = 'Despachado',
  Entregado = 'Entregado',
  Rechazado = 'Rechazado',
  Cancelado = 'Cancelado',
  Cerrado = 'Cerrado'
}
