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
/** ¿La línea quedó operativa? (D-704) `por_terminar`: falta un paso; `por_reconectar`: el proveedor ya no la reconoce. */
export type SetupLinea = 'completo' | 'por_terminar' | 'por_reconectar';
/** Cómo conectar un número directo con Meta (D-704). */
export type ModoConexionMeta = 'celular' | 'nuevo';

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
  setup?: SetupLinea;
  /** Causa en palabras sencillas cuando `setup` no es `completo`. */
  setupError?: string | null;
}

/** `GET /v1/messaging/lines`. */
export interface MessagingLinesResponse {
  habilitado: boolean;
  puedeAdministrar: boolean;
  lines: MessagingLine[];
  equipo: MiembroEquipo[];
  /** Conexión directa con Meta (D-704): si se ofrece y si se puede compartir el número del celular. */
  metaDirecto: { habilitada: boolean; modoCelular: boolean };
}

/** Lo que devuelve conectar en Meta directo: los datos para abrir el registro insertado (D-704). */
export interface DatosRegistroMeta {
  kind: 'embedded_signup';
  appId: string;
  configId: string;
  graphVersion: string;
  versionRegistro: number;
  featureType: string | null;
  modo: ModoConexionMeta;
}

/** Respuesta de `POST /lines/connect`: un enlace (Kapso) o el registro insertado (Meta). */
export type ConexionProveedor = { url: string; expiresAt?: string } | DatosRegistroMeta;

/** Plantilla de la cuenta de WhatsApp de una línea. */
export interface PlantillaLinea {
  id: string | null;
  name: string;
  language: string | null;
  category: string | null;
  status: string | null;
  estadoHumano: string;
  motivoRechazo: string | null;
  bodyText: string;
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

/* ---------- Atención multiagente (D-725, fase C de CONV) ---------- */

/** Nota interna de un chat: nunca va al cliente. */
export interface NotaChat {
  id: string;
  texto: string;
  /** Correo de quien la escribió. */
  por: string;
  nombre: string;
  /** ISO. */
  en: string;
  menciones: string[];
}

/** Disponibilidad del asesor para el reparto automático. */
export type EstadoAsesor = 'disponible' | 'ausente';

/** Persona del equipo con su estado (`GET /atencion/equipo`). */
export interface MiembroAtencion {
  email: string;
  nombre: string;
  rol?: string;
  estado: EstadoAsesor;
  coordina: boolean;
}

/** `GET /atencion/yo`. */
export interface YoAtencion {
  email: string;
  nombre: string;
  coordina: boolean;
  esAdmin: boolean;
  estado: EstadoAsesor;
}

/** Ajustes de atención del comercio (`companyConfig/{empresa}.atencion`). */
export interface AjustesAtencion {
  repartoAutomatico: boolean;
  /** 0 apaga el aviso; máximo 240. */
  minutosSinResponder: number;
}

/** Una fila de carga por asesor en la vista Equipo. */
export interface CargaAsesor {
  email: string;
  nombre: string;
  estado: EstadoAsesor;
  chats: number;
  sinResponder: number;
}

/** `GET /atencion/resumen` (solo quien coordina). */
export interface ResumenAtencion {
  sinAsignar: number;
  sinResponder: number;
  porAsesor: CargaAsesor[];
  ajustes: AjustesAtencion;
}

/** Movimiento del historial del chat (`log`). */
export interface MovimientoChat {
  accion: string;
  por?: string;
  para?: string;
  nota?: string;
  en?: string;
}

/** `GET /atencion/threads/:threadId` (el front trata el 404 como sin dueño y sin notas). */
export interface HiloAtencion {
  threadId: string;
  owner: DuenoChat | null;
  notas: NotaChat[];
  log: MovimientoChat[];
}

/** Lo que emite `app-chat-dueno.pasar` cuando recibe `conNota=true`. */
export interface Transferencia {
  email: string;
  nota: string;
}
