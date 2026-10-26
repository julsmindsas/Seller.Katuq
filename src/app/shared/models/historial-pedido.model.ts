/**
 * Historial del pedido (D-541, F1). Forma de la respuesta de
 * `GET /v1/orders/:orderId/history?vista=eventos` (backend:
 * `services/orders/historialPedido/lectura.js`).
 *
 * El servidor ya manda los textos de negocio (títulos, etiquetas, orígenes, estados) y NUNCA el
 * correo de una persona que tiene nombre. El front solo los pinta.
 */

export type OrdenHistorialPedido = 'asc' | 'desc';

/** De dónde sale el elemento: un evento nuevo, un registro de estados de antes o uno reconstruido. */
export type FuenteHistorialPedido = 'evento' | 'legado' | 'reconstruido';

/** Clase de valor de un detalle, para saber cómo escribirlo. */
export type ClaseDetalleHistorialPedido = 'dinero' | 'texto' | 'estado' | 'fecha' | 'lista';

/** Tipo del evento tal como lo guarda el servidor (design D3; la F2 suma los de notas, entrega, asesor y facturación). */
export type TipoEventoPedido =
  | 'order_created'
  | 'process_status_changed'
  | 'payment_status_changed'
  | 'delivery_reported'
  | 'payment_registered'
  | 'payment_edited'
  | 'payment_voided'
  | 'payment_verified'
  | 'order_deleted'
  | 'line_price_corrected'
  | 'order_note_added'
  | 'order_note_edited'
  | 'delivery_notes_changed'
  | 'gift_card_changed'
  | 'delivery_address_changed'
  | 'delivery_schedule_changed'
  | 'delivery_contact_changed'
  | 'advisor_changed'
  | 'billing_data_changed';

export interface ActorHistorialPedido {
  /** Nombre de la persona, o su correo si no tiene nombre, o «Sistema», «Mensajero» o «Cliente». */
  nombre: string;
  rol: string | null;
}

/** Un dato que cambió: «Estado del pago: Pendiente → Aprobado». */
export interface DetalleHistorialPedido {
  etiqueta: string;
  antes: string | number | boolean | string[] | null;
  despues: string | number | boolean | string[] | null;
  clase: ClaseDetalleHistorialPedido | string;
}

/** La plata del evento: el pago, el saldo antes y después y el total del pedido. */
export interface MontosHistorialPedido {
  pago: number | null;
  saldoAntes: number | null;
  saldoDespues: number | null;
  total: number | null;
}

export interface EventoHistorialPedido {
  id: string;
  tipo: TipoEventoPedido | string;
  titulo: string;
  /** Instante en ISO (UTC). */
  fecha: string | null;
  actor: ActorHistorialPedido;
  /** Texto de negocio: «Web», «POS», «App», «Claude/MCP», «Opttia», «Shopify», «Sistema»… */
  origen: string | null;
  /** Texto de negocio: «Tienda en línea», «Despachos», «Tesorería»… */
  canal: string | null;
  detalles: DetalleHistorialPedido[];
  montos: MontosHistorialPedido | null;
  motivo: string | null;
  /** «Sin motivo (App)» cuando el motivo faltó y se dice por dónde llegó el cambio. */
  notaMotivo: string | null;
  fuente: FuenteHistorialPedido;
  /** Un cambio de proceso hacia atrás. */
  retroceso: boolean;
  /** Hecho por el sistema o una integración, no por una persona. */
  sistema: boolean;
  /** Solo en un evento reconstruido: «Armado con los datos actuales del pedido». */
  nota?: string;
  /** Solo con `foto=1` y en el evento de creación. */
  foto?: any;
  /** Solo en un evento de corrección de precio de una línea (otra fase). */
  cambioPrecio?: any;
}

export interface ResumenCreacionHistorialPedido {
  actor: string;
  rol: string | null;
  fecha: string | null;
  origen: string | null;
  canal: string | null;
  /** `true` si se armó con los datos actuales del pedido (no hay evento real de creación). */
  reconstruido: boolean;
}

export interface ResumenHistorialPedido {
  cliente: string | null;
  total: number | null;
  saldo: number | null;
  estados: { proceso: string | null; pago: string | null; entrega: string | null };
  creacion: ResumenCreacionHistorialPedido | null;
  totalEventos: number;
  ultimoCambio: { fecha: string | null; titulo: string } | null;
}

export interface PaginaHistorialPedido {
  success: boolean;
  /** `eventos`, o `legado` si el servidor respondió la vista de antes (bandera apagada o error). */
  vista?: 'eventos' | 'legado';
  orderId?: string;
  nroPedido?: string | null;
  /** Solo en la primera página. */
  resumen?: ResumenHistorialPedido;
  eventos?: EventoHistorialPedido[];
  /** Cursor de la página siguiente, o `null` si no hay más. */
  siguiente?: string | null;
  orden?: OrdenHistorialPedido;
  /** Solo en la vista de antes (`history`). */
  history?: any[];
  error?: string;
}

export interface ConsultaHistorialPedido {
  cursor?: string | null;
  orden?: OrdenHistorialPedido;
  limite?: number;
}
