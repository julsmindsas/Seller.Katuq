import {
  DuenoChat,
  LineaResumen,
} from "../../../shared/services/messaging/messaging.models";
import { WhatsappThread } from "../whatsapp-inbox/models/whatsapp-thread.model";
import { MetaCanal, MetaHilo } from "../meta-inbox/models/meta-thread.model";

/**
 * Modelos de presentación de la bandeja única (conv-bandeja-unica).
 * Solo sirven para pintar la lista: nada de esto se guarda ni viaja al servidor.
 */

export type CanalBandeja = "whatsapp" | MetaCanal;

export type DireccionMensaje = "inbound" | "outbound";

interface ConversacionBase {
  /** Identifica la fila: canal + (número y cliente | identidad de la red). */
  clave: string;
  /** Número del comercio (solo WhatsApp con varios números). */
  lineId?: string;
  /** Vacío si el canal no trae nombre: la pantalla pone el texto de «sin nombre». */
  nombre: string;
  resumen: string;
  /** ISO del último mensaje. */
  ultimoEn: string;
  ultimaDireccion: DireccionMensaje;
  /** Solo WhatsApp: entrantes sin marcar como vistos. */
  sinLeer?: number;
  /** Solo WhatsApp: número por el que va el chat; ausente = número compartido de Katuq. */
  linea?: LineaResumen;
  /** Quien atiende el chat (WhatsApp con número propio y, con la bandeja única, también las redes). */
  dueno?: DuenoChat;
  /** Id del hilo de atención (`messaging_threads`); ausente en el número compartido de Katuq. */
  threadId?: string;
  /** Cola del chat (fase D); ausente si no tiene o no hay colas. */
  colaId?: string;
}

export interface ConversacionWhatsapp extends ConversacionBase {
  canal: "whatsapp";
  /** Hilo original, para pasarlo tal cual al detalle de WhatsApp. */
  origen: WhatsappThread;
}

export interface ConversacionRed extends ConversacionBase {
  canal: MetaCanal;
  /** Hilo original, para pasarlo tal cual al detalle de redes. */
  origen: MetaHilo;
}

export type ConversacionResumen = ConversacionWhatsapp | ConversacionRed;

export interface FiltroBandeja {
  /** null = todos los canales. */
  canal: CanalBandeja | null;
  /** null = todos los números. */
  lineId: string | null;
  /** Último mensaje del cliente. */
  sinResponder: boolean;
  /** Chats cuyo dueño es el usuario. */
  mios: boolean;
  /** Búsqueda por nombre. */
  busqueda: string;
  /** Solo quien coordina: correo del asesor, 'sin-asignar' o null (todos). */
  asesor: string | null;
  /** Id de la cola; null = todas. */
  colaId: string | null;
}

/** Valor del filtro por asesor para los chats sin dueño. */
export const ASESOR_SIN_ASIGNAR = "sin-asignar";

export const FILTRO_BANDEJA_VACIO: FiltroBandeja = {
  canal: null,
  lineId: null,
  sinResponder: false,
  mios: false,
  busqueda: "",
  asesor: null,
  colaId: null,
};

/** Lo que devuelve una carga de la bandeja. */
export interface CargaBandeja {
  /** Mezcladas, de la más reciente a la más antigua. */
  conversaciones: ConversacionResumen[];
  /** Canales pedidos cuyo listado falló. */
  canalesCaidos: CanalBandeja[];
  /** Páginas de WhatsApp ya traídas (1 = solo la primera). */
  paginasWhatsapp: number;
  /** Hay otra página de WhatsApp por pedir. */
  hayMasWhatsapp: boolean;
}
