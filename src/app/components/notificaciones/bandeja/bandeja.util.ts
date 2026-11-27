import { WhatsappThread, claveChat } from "../whatsapp-inbox/models/whatsapp-thread.model";
import { MetaCanal, MetaHilo } from "../meta-inbox/models/meta-thread.model";
import { ItemRelacionado } from "../../../shared/services/messaging/messaging.models";
import {
  ASESOR_SIN_ASIGNAR,
  CanalBandeja,
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
    sinResponderDesde: hilo.threadId ? leerSinResponderDesde(hilo) : undefined,
    origen: hilo,
  };
}

/**
 * `sinResponderDesde` tal como lo manda el servidor en la fila: texto, `null` o ausente (`undefined`). Cualquier
 * otro valor cuenta como ausente, para no esconder un chat por un dato raro.
 */
export function leerSinResponderDesde(fila: object): string | null | undefined {
  if (!("sinResponderDesde" in fila)) return undefined;
  const v = (fila as { sinResponderDesde?: unknown }).sinResponderDesde;
  if (v === null) return null;
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * ¿El cliente espera respuesta de una persona? Con el dato del hilo de atención (`sinResponderDesde`) manda ese
 * dato: así cuenta también el chat que Opttia pasó a un asesor aunque el último mensaje sea del bot. Sin el dato,
 * la regla de siempre: el último mensaje es del cliente. Un chat cerrado nunca cuenta (D-728).
 */
export function esSinResponder(c: ConversacionResumen): boolean {
  if (c.cerrado) return false;
  if (c.sinResponderDesde !== undefined) return !!c.sinResponderDesde;
  return c.ultimaDireccion === "inbound";
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
    // Solo con el hilo de atención que manda el servidor (con la bandeja); si no, la regla de siempre.
    sinResponderDesde: hilo.threadId ? leerSinResponderDesde(hilo) : undefined,
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

/** Lo que guarda un id de hilo de atención: `<línea>__<hash del contacto>` (redes: `red_<canal>__<hash>`). */
export function partesDeThreadId(threadId: string): { lineId: string; hash: string } | null {
  const id = (threadId || "").trim();
  const i = id.lastIndexOf("__");
  if (i <= 0 || i + 2 >= id.length) return null;
  return { lineId: id.slice(0, i), hash: id.slice(i + 2) };
}

/** Lo que se sabe de un chat del informe que no está en la lista cargada (de `GET /atencion/threads/:id`). */
export interface DatosHiloInforme {
  owner?: { email: string; nombre: string } | null;
  colaId?: string | null;
  cerrado?: boolean;
  motivoCierre?: string | null;
  etiquetas?: string[];
  /** WhatsApp: nombre y teléfono del número del comercio, si se conocen. */
  linea?: { nombre: string; telefono: string };
}

/**
 * Fila mínima para abrir desde el informe un chat que no está en la lista cargada (otra página, cerrado o viejo).
 * Sale del id del hilo, que ya lleva la línea y el hash del contacto: sin nombre ni número del cliente. El
 * detalle trae la conversación y la ficha por su cuenta. Null si el id no tiene esa forma.
 */
export function desdeHiloDelInforme(
  canal: CanalBandeja,
  threadId: string,
  datos: DatosHiloInforme = {},
): ConversacionResumen | null {
  const partes = partesDeThreadId(threadId);
  if (!partes) return null;
  if (canal !== "whatsapp" && partes.lineId !== `red_${canal}`) return null;
  return desdeRelacionado({
    canal,
    lineId: partes.lineId,
    linea: canal === "whatsapp" && datos.linea ? { id: partes.lineId, ...datos.linea } : undefined,
    hash: partes.hash,
    nombre: "",
    ultimoEn: "",
    ultimaDireccion: "inbound",
    threadId,
    owner: datos.owner || undefined,
    colaId: datos.colaId || undefined,
    cerrado: datos.cerrado === true,
    motivoCierre: datos.motivoCierre || undefined,
    etiquetas: datos.etiquetas,
    // No se usa para armar la fila: lo pide el tipo del chat relacionado.
    porque: "mismo_telefono",
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

/** Número enmascarado del chat (solo WhatsApp; las redes no tienen número). Vacío si no hay. */
export function telefonoDe(c: ConversacionResumen): string {
  return c.canal === "whatsapp" ? (c.origen?.phoneMasked || "").trim() : "";
}

/**
 * La búsqueda local mira el nombre, el número enmascarado y el último mensaje. Con solo cifras («4521») compara
 * también las cifras del número, para que «+57 300***4521» aparezca aunque se escriba sin signos.
 */
function coincideBusqueda(c: ConversacionResumen, busqueda: string): boolean {
  const telefono = telefonoDe(c);
  if (normalizarTexto([c.nombre, telefono, c.resumen].join(" ")).includes(busqueda)) return true;
  const cifras = busqueda.replace(/\s+/g, "");
  return /^\d{3,}$/.test(cifras) && telefono.replace(/\D/g, "").includes(cifras);
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
    if (filtro.sinResponder && !esSinResponder(c)) return false;
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
    if (busqueda && !coincideBusqueda(c, busqueda)) return false;
    return true;
  });
}
