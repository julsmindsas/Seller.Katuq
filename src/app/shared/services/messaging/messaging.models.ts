/**
 * Contrato del dominio Mensajería (D-437): líneas del comercio y dueño del chat.
 * No depende del canal: una línea es hoy un número de WhatsApp y mañana puede ser
 * una cuenta de Instagram o una página de Messenger.
 */

/** Persona del comercio a la que se le puede asignar una línea o un chat. */
export interface MiembroEquipo {
  email: string;
  nombre: string;
  rol?: string;
}

export interface VendedorLinea {
  email: string;
  nombre: string;
}

export type TipoConexionLinea = 'coexistence' | 'dedicated';
export type EstadoLinea = 'connected' | 'disconnected';

/** Línea registrada del comercio (`messaging_lines`). */
export interface MessagingLine {
  id: string;
  provider: string;
  channel: string;
  externalId: string;
  displayName: string;
  displayPhone: string;
  verifiedName?: string | null;
  connectionType: TipoConexionLinea;
  status: EstadoLinea;
  sellers: VendedorLinea[];
  botEnabled: boolean;
  /** ISO, epoch o Timestamp serializado de Firestore: se muestra solo si se puede leer. */
  connectedAt?: unknown;
}

/** `GET /v1/messaging/lines`. */
export interface MessagingLinesResponse {
  habilitado: boolean;
  puedeAdministrar: boolean;
  lines: MessagingLine[];
  equipo: MiembroEquipo[];
}

/** Cambios permitidos en `PATCH /v1/messaging/lines/:lineId` (vendedores por email). */
export interface CambiosLinea {
  displayName?: string;
  sellers?: string[];
  botEnabled?: boolean;
}

/** Resumen de la línea que viaja con cada chat del buzón (`null` = número compartido de Katuq). */
export interface LineaResumen {
  id: string;
  displayName: string;
  displayPhone: string;
}

/** Dueño del chat (`messaging_threads.owner`). */
export interface DuenoChat {
  email: string;
  nombre: string;
  desde?: string | null;
}

/** Cuerpo del 409 cuando el chat lo atiende otra persona. */
export interface ErrorChatConDueno {
  error: 'CHAT_CON_DUENO';
  owner: DuenoChat;
  message: string;
}

/** Lee el cuerpo de un error HTTP y dice si es un 409 de chat con dueño. */
export function esErrorChatConDueno(err: any): err is { status: number; error: ErrorChatConDueno } {
  return !!err && err.status === 409 && err.error?.error === 'CHAT_CON_DUENO';
}
