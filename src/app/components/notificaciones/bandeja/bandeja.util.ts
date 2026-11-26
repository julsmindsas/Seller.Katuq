import { WhatsappThread, claveChat } from "../whatsapp-inbox/models/whatsapp-thread.model";
import { MetaHilo } from "../meta-inbox/models/meta-thread.model";
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
    // Sin la bandera el servidor no manda dueño ni threadId: quedan vacíos y nada cambia.
    dueno: hilo.owner || undefined,
    threadId: hilo.threadId || `red_${hilo.canal}__${hilo.identidadHash}`,
    origen: hilo,
  };
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

export function filtrar(
  lista: ConversacionResumen[],
  filtro: FiltroBandeja,
  miEmail: string,
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
    if (busqueda && !normalizarTexto(c.nombre).includes(busqueda)) return false;
    return true;
  });
}
