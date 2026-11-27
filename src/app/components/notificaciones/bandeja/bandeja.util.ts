import { WhatsappThread, claveChat } from "../whatsapp-inbox/models/whatsapp-thread.model";
import { MetaCanal, MetaHilo } from "../meta-inbox/models/meta-thread.model";
import { ItemRelacionado } from "../../../shared/services/messaging/messaging.models";
import {
  ASESOR_SIN_ASIGNAR,
  ConversacionRed,
  ConversacionResumen,
  ConversacionWhatsapp,
  FiltroBandeja,
} from "./bandeja.models";

/** Funciones puras de la bandeja: sin Angular ni HTTP. */

export function desdeWhatsapp(hilo: WhatsappThread): ConversacionWhatsapp {
  const lineId = hilo.line?.id;
  return {
    clave: `whatsapp|${claveChat(hilo.phoneHash, lineId)}`,
    canal: "whatsapp",
    lineId: lineId || undefined,
    nombre: hilo.contactName || "",
    resumen: hilo.lastMessageSnippet || "",
    ultimoEn: hilo.lastMessageAt,
    ultimaDireccion: hilo.lastDirection === "inbound" ? "inbound" : "outbound",
    sinLeer: hilo.unreadCount || 0,
    linea: hilo.line || undefined,
    dueno: hilo.owner || undefined,
    threadId: hilo.threadId || undefined,
    colaId: hilo.colaId || undefined,
    cerrado: hilo.cerrado === true,
    motivoCierre: hilo.motivoCierre || undefined,
    etiquetas: hilo.etiquetas || undefined,
    origen: hilo,
  };
}

export function desdeRed(hilo: MetaHilo): ConversacionRed {
  return {
    clave: `${hilo.canal}|${hilo.identidadHash}`,
    canal: hilo.canal,
    nombre: hilo.contactoNombre || "",
    resumen: hilo.ultimoMensajeResumen || "",
    ultimoEn: hilo.ultimoMensajeEn,
    ultimaDireccion: hilo.ultimaDireccion === "inbound" ? "inbound" : "outbound",
    // Sin la bandera el servidor no manda `noLeidos`: queda en 0 y la fila no muestra insignia.
    sinLeer: Math.max(0, Math.floor(Number(hilo.noLeidos) || 0)),
    // Sin la bandera el servidor no manda dueño ni threadId: quedan vacíos y nada cambia.
    dueno: hilo.owner || undefined,
    threadId: hilo.threadId || `red_${hilo.canal}__${hilo.identidadHash}`,
    colaId: hilo.colaId || undefined,
    cerrado: hilo.cerrado === true,
    motivoCierre: hilo.motivoCierre || undefined,
    etiquetas: hilo.etiquetas || undefined,
    origen: hilo,
  };
}

/** Clave de fila de un chat relacionado: la misma que arman desdeWhatsapp y desdeRed. */
export function claveRelacionado(item: Pick<ItemRelacionado, "canal" | "hash" | "lineId">): string {
  return item.canal === "whatsapp"
    ? `whatsapp|${claveChat(item.hash, item.lineId)}`
    : `${item.canal}|${item.hash}`;
}

/**
 * Fila mínima válida para abrir un chat relacionado que no está en la lista cargada (otra página de WhatsApp,
 * filtro «Cerrados», fuera de los 90 días). Sin texto de mensajes: el detalle trae la conversación por su cuenta.
 */
export function desdeRelacionado(item: ItemRelacionado): ConversacionResumen {
  const direccion = item.ultimaDireccion === "inbound" ? "inbound" : "outbound";
  if (item.canal === "whatsapp") {
    return desdeWhatsapp({
      phoneHash: item.hash,
      phoneMasked: item.phoneMasked || "",
      contactName: item.nombre || "",
      lastMessageAt: item.ultimoEn,
      lastMessageSnippet: "",
      unreadCount: 0,
      lastDirection: direccion,
      messageCount: 0,
      threadId: item.threadId || null,
      line: item.lineId
        ? { id: item.lineId, displayName: item.linea?.nombre || "", displayPhone: item.linea?.telefono || "" }
        : null,
      owner: item.owner || null,
      colaId: item.colaId || null,
      cerrado: item.cerrado === true,
      motivoCierre: item.motivoCierre || null,
      etiquetas: item.etiquetas,
    });
  }
  const canal = item.canal as MetaCanal;
  return desdeRed({
    identidadHash: item.hash,
    canal,
    contactoNombre: item.nombre || null,
    ultimoMensajeEn: item.ultimoEn,
    ultimoMensajeResumen: "",
    ultimaDireccion: direccion,
    totalMensajes: 0,
    // El detalle pide la ventana real al abrir; mientras llega el campo de respuesta queda cerrado.
    ventana: { abierta: false, minutosRestantes: 0, expiraEn: null },
    threadId: item.threadId || null,
    owner: item.owner || null,
    colaId: item.colaId || null,
    cerrado: item.cerrado === true,
    motivoCierre: item.motivoCierre || null,
    etiquetas: item.etiquetas,
  });
}

function epoch(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Junta varias listas en una, sin repetir claves (gana la primera vez que
 * aparece) y de la conversación más reciente a la más antigua.
 */
export function mezclar(listas: ConversacionResumen[][]): ConversacionResumen[] {
  const vistas = new Set<string>();
  const todas: ConversacionResumen[] = [];
  for (const lista of listas) {
    for (const c of lista) {
      if (vistas.has(c.clave)) continue;
      vistas.add(c.clave);
      todas.push(c);
    }
  }
  return todas.sort((a, b) => epoch(b.ultimoEn) - epoch(a.ultimoEn));
}

/** Minúsculas y sin tildes, para buscar «jose» y encontrar «José». */
export function normalizarTexto(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Colas con las líneas que cubren: lo mínimo para ubicar un chat que aún no trae `colaId`. */
export interface ColaConLineas {
  id: string;
  activa: boolean;
  lineas?: string[];
}

/**
 * Cola de un chat: la suya, o la cola activa que tiene su número o cuenta (WhatsApp: id de la línea;
 * redes: `red_<canal>`). Sin colas o sin coincidencia, null.
 */
export function colaIdDe(c: ConversacionResumen, colas: ColaConLineas[] = []): string | null {
  if (c.colaId) return c.colaId;
  const linea = c.canal === "whatsapp" ? c.lineId : `red_${c.canal}`;
  if (!linea) return null;
  return colas.find((q) => q.activa && (q.lineas || []).includes(linea))?.id ?? null;
}

export function filtrar(
  lista: ConversacionResumen[],
  filtro: FiltroBandeja,
  miEmail: string,
  colas: ColaConLineas[] = [],
): ConversacionResumen[] {
  const busqueda = normalizarTexto(filtro.busqueda);
  const yo = (miEmail || "").trim().toLowerCase();
  return lista.filter((c) => {
    if (filtro.canal && c.canal !== filtro.canal) return false;
    if (filtro.lineId && c.lineId !== filtro.lineId) return false;
    if (filtro.sinResponder && c.ultimaDireccion !== "inbound") return false;
    if (filtro.mios && (!yo || (c.dueno?.email || "").trim().toLowerCase() !== yo)) return false;
    if (filtro.asesor) {
      const dueno = (c.dueno?.email || "").trim().toLowerCase();
      if (filtro.asesor === ASESOR_SIN_ASIGNAR) {
        // Sin threadId (número compartido) no se puede asignar: no cuenta como «sin asignar».
        if (dueno || !c.threadId) return false;
      } else if (dueno !== filtro.asesor.trim().toLowerCase()) {
        return false;
      }
    }
    if (filtro.colaId && colaIdDe(c, colas) !== filtro.colaId) return false;
    // D-728: abiertos y cerrados no se mezclan; sin la bandeja nadie trae `cerrado` y todo es «abierto».
    if (!!c.cerrado !== (filtro.estado === "cerrados")) return false;
    if (filtro.etiqueta && !(c.etiquetas || []).includes(filtro.etiqueta)) return false;
    if (busqueda && !normalizarTexto(c.nombre).includes(busqueda)) return false;
    return true;
  });
}
