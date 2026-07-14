/**
 * Modelos TypeScript del módulo WhatsApp Inbox (spec 009).
 *
 * Hilo = agrupación de mensajes WhatsApp por phoneHash (E.164 hasheado).
 * El frontend nunca recibe el teléfono completo, solo `phoneMasked`.
 */

export type WhatsappMessageDirection = "outbound" | "inbound";

export type WhatsappMessageStatus = "sent" | "delivered" | "read" | "failed";

export type WhatsappMessageType =
  | "text"
  | "image"
  | "audio"
  | "document"
  | "sticker";

/**
 * Banderas opcionales del hilo (retención, flags operativos).
 * - `inboundTruncatedAt90d`: hubo mensajes entrantes >90 días que se truncaron por política.
 */
export interface WhatsappThreadFlags {
  inboundTruncatedAt90d?: boolean;
}

/**
 * Hilo de conversación WhatsApp resumido (listado).
 */
export interface WhatsappThread {
  /** Hash determinístico del E.164 — clave de agrupación cross-empresa. */
  phoneHash: string;
  /** Teléfono enmascarado para UI (ej: "+57***4567"). */
  phoneMasked: string;
  /** Nombre del cliente registrado o, en su defecto, profileName de WhatsApp. */
  contactName: string;
  /** ISO string del último mensaje (entrante o saliente) del hilo. */
  lastMessageAt: string;
  /** Snippet (primeros ~120 chars) del último mensaje. */
  lastMessageSnippet: string;
  /** Mensajes entrantes sin marcar como vistos por el operador. */
  unreadCount: number;
  /** Dirección del último mensaje del hilo. */
  lastDirection: WhatsappMessageDirection;
  /** Total acumulado de mensajes en el hilo (entrantes + salientes). */
  messageCount: number;
  /** Banderas operativas (retención, etc.). */
  flags?: WhatsappThreadFlags;
}

/**
 * Mensaje individual dentro de un hilo (vista detalle).
 */
export interface WhatsappMessage {
  /** ID del mensaje en backend (uuid o waMessageId). */
  id: string;
  direction: WhatsappMessageDirection;
  type: WhatsappMessageType;
  /** Cuerpo del mensaje (solo texto; media usa placeholder). */
  body: string;
  /** Snippet recortado para el listado. */
  snippet: string;
  /** ISO string del envío/recepción. */
  sentAt: string;
  status: WhatsappMessageStatus;
  /** Media (imagen/audio/doc) no se renderiza inline — se muestra placeholder. */
  mediaPlaceholder?: boolean;
}

/**
 * Página paginada de hilos para el listado.
 */
export interface ThreadsPage {
  items: WhatsappThread[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Página de mensajes de un hilo (paginación hacia atrás).
 */
export interface MessagesPage {
  items: WhatsappMessage[];
  hasMore: boolean;
}

/**
 * Lead vinculado al contacto (CRM Katuq).
 */
export interface ContactProfileLead {
  leadId: string;
  name: string;
  stage: string;
  ownerName: string;
  score?: number;
}

/**
 * Rating draft pendiente de persistir (operador califica al contacto).
 */
export interface ContactProfileRatingDraft {
  score: number;
  updatedAt: string;
}

/**
 * Perfil del contacto del hilo (panel derecho — spec 009.5.1).
 * `isClienteRegistrado=false` cuando solo hay `profileName` de WhatsApp.
 */
export interface ContactProfile {
  phoneHash: string;
  phoneMasked: string;
  clienteNombre?: string;
  profileName?: string;
  isClienteRegistrado: boolean;
  lead?: ContactProfileLead | null;
  ratingDraft?: ContactProfileRatingDraft | null;
  /** [D-098] true = el contacto pidió no recibir mensajes de marketing. */
  optedOut?: boolean;
}

/**
 * Pedido vinculado al contacto (panel derecho — spec 009.5.1).
 */
export interface Order {
  orderId: string;
  nroPedido: string;
  fechaCreacion: string;
  estado: string;
  total: number;
  currency: string;
  /** Deep-link al módulo de ventas (ej: `/ventas/detalle/KAT-2026-00123`). */
  deepLink: string;
}
