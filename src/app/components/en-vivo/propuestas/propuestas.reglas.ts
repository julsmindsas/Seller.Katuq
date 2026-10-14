/**
 * Reglas PURAS de "Opttia propone en la escena" (D-421, fase 1). Sin Angular, sin reloj propio y
 * sin almacenamiento: la hora, lo guardado y el estado entran por parámetro, así que se prueban con
 * node suelto. `EnVivoPropuestasService` las conecta al estado de la pantalla y al servidor.
 *
 * - La cola: propuestas del servidor (despachos y producción) más las señales de cobro que salen
 *   del radar del canal en vivo (sin backend), ordenadas por prioridad, hora límite y tamaño.
 * - "Después" (30 min) y "No hoy" (hasta que cambie la huella), por huella.
 * - Lo que la escena necesita de la propuesta (`PropuestaEnEscena`), con color por mensajero.
 * - Cuándo pedir otra vez al servidor.
 * - Los textos de la tarjeta (eyebrow, confirmación, resultado) y la lógica de aprobar despachos
 *   que antes vivía dentro de la vista Despachos (paraAprobar, conQuien, sinRespuesta...).
 */
import type { AlertaRadar, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import type {
  EstadoResultado,
  GrupoParaAprobar,
  GrupoPlan,
  PlanDespachos,
  ResultadoGrupo,
  TarifaPlan,
  TipoGrupo,
} from '../despachos/plan-despachos.modelos';
import type { GrupoEditable, OpcionMensajero, PedidoEditable } from '../despachos/grupo-despacho/grupo-despacho.component';
import { contarListos } from '../despachos/plan-despachos.reglas';
import { enmascarar } from '../opttia/opttia-reglas';
import { claveDeNombre, dinero, duracion } from '../utilidades/formato';
import type {
  ColorEscena,
  ContadorPropuestas,
  EfectoEscena,
  EstacionEscena,
  GrupoEnEscena,
  ModoPropuesta,
  PrioridadPropuesta,
  PropuestaEnEscena,
  PropuestaServidor,
  RespuestaPropuestas,
  TipoPropuesta,
} from './propuestas.modelos';

// ── Tiempos ─────────────────────────────────────────────────────────────────

/** "Después": la propuesta vuelve a los 30 minutos (para esa persona, en ese navegador). */
export const DESPUES_MS = 30 * 60_000;
/** Espera tras un cambio (pedidos listos, radar o un evento de un pedido propuesto) antes de pedir. */
export const ESPERA_CAMBIO_MS = 25_000;
/** Respaldo: se pide cada 5 minutos aunque nada cambie. */
export const RESPALDO_MS = 5 * 60_000;
/** En modo pantalla (TV) se pide como máximo cada 5 minutos. */
export const MINIMO_TV_MS = 5 * 60_000;
/** Entre dos pedidos al servidor, como mínimo (salvo justo después de aprobar). */
export const MINIMO_ENTRE_PEDIDOS_MS = 15_000;
/** Aprobar queda bloqueado este tiempo cada vez que cambia la propuesta a la vista. */
export const BLOQUEO_AL_PASAR_MS = 1500;
/** El primer toque de Aprobar pide confirmar; si no se confirma en este tiempo, vuelve solo. */
export const CONFIRMAR_MS = 5000;
/** Sin tocar nada este tiempo, el ensayo se retira y queda solo el contador del orbe. */
export const RETIRAR_SIN_USO_MS = 45_000;
/** En modo pantalla, cada propuesta se queda a la vista este tiempo. */
export const TV_POR_PROPUESTA_MS = 20_000;
/** No arranca sola si la persona acaba de aprobar algo. */
export const PAUSA_TRAS_APROBAR_MS = 8000;
/** Se considera que la persona está interactuando si tocó algo hace menos de esto. */
export const INTERACCION_RECIENTE_MS = 4000;
/** Tras un resultado bueno, la tarjeta pasa sola a la siguiente. */
export const PASAR_TRAS_EXITO_MS = 2000;
/** Con pedidos que quedaron por fuera se deja más tiempo para leer la razón. */
export const PASAR_TRAS_PARCIAL_MS = 4500;
/** "Todo al día" se queda a la vista este tiempo y luego la tarjeta se retira. */
export const AL_DIA_MS = 6000;
/** En la TV, "Aprobado desde el celular" se queda a la vista este tiempo. */
export const AVISO_TV_MS = 6000;

/** Un grupo de transportadora lleva a lo sumo 5 pedidos (cada uno es una llamada a la integración). */
export const MAX_PEDIDOS_TRANSPORTADORA = 5;

// ── La cola ─────────────────────────────────────────────────────────────────

/** Una propuesta en la cola, venga del servidor o del radar (cobro). */
export interface ItemCola {
  /**
   * La huella de la propuesta: la del servidor (en despachos, la del grupo del plan, que cambia si
   * cambia uno de sus pedidos, su mensajero o su franja) o `cobro:<pedidoId>`.
   */
  id: string;
  /**
   * Descriptor del grupo que no depende de su huella: tipo (y transportadora), zona y franja; en lo
   * demás, la huella. NO es único (varios grupos de la misma zona y franja lo comparten), así que no
   * sirve para seguir una propuesta: para eso está `sucesorDe`, que la sigue por sus pedidos.
   */
  clave: string;
  tipo: TipoPropuesta;
  modo: ModoPropuesta;
  prioridad: PrioridadPropuesta;
  horaLimite: string | null;
  /** Minutos desde la medianoche de la hora límite, para ordenar; null = sin hora. */
  limiteMin: number | null;
  titulo: string;
  razon: string;
  consecuencias: string[];
  pedidos: ReadonlyArray<{ id: string; nroPedido: string }>;
  porCobrar: number;
  /** Cobro: el valor del pedido (se muestra solo sin "ocultar"). */
  monto: number | null;
  /**
   * El PERMISO de la sesión para aprobarla (rol con Despachos y modo "on"), como lo dice el
   * servidor. Que el grupo esté listo (con mensajero y pedidos) se calcula aparte con el grupo
   * ajustado (`faltaParaAprobar`).
   */
  puedeAprobar: boolean;
  servidor: PropuestaServidor | null;
  /** Cobro: el pedido que abre "Abrir pedido". */
  pedidoId: string | null;
  /**
   * Solo en la propuesta AJUSTADA que se muestra (`ajustada`): con qué se ensaya en la escena (el
   * mensajero o la transportadora que escogió la persona) y una firma del ajuste para que la escena
   * vuelva a armar el ensayo.
   */
  ajuste?: { veh: string | null; firma: string };
}

const PESO_PRIORIDAD: Readonly<Record<PrioridadPropuesta, number>> = { urgente: 0, importante: 1, 'cuando-puedas': 2 };
const PESO_TIPO: Readonly<Record<TipoPropuesta, number>> = { despachos: 0, produccion: 1, cobro: 2 };

export const ETIQUETA_PRIORIDAD: Readonly<Record<PrioridadPropuesta, string>> = {
  urgente: 'Urgente',
  importante: 'Importante',
  'cuando-puedas': 'Cuando puedas',
};

const PRIORIDADES = new Set<string>(['urgente', 'importante', 'cuando-puedas']);
const EFECTOS = new Set<string>(['montones', 'fila', 'moneda']);
const ESTACIONES = new Set<string>(['recibido', 'produccion', 'empacado', 'listo']);
const COLORES = new Set<string>(['accent', 'info', 'pack', 'ok', 'warn', 'bad']);

function texto(v: unknown, max = 240): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * Convierte una propuesta del servidor en un ítem de la cola. Desconfía de la forma: lo que no se
 * reconoce se descarta (null) y "sombra" nunca se puede aprobar, diga lo que diga `puedeAprobar`.
 */
export function desdeServidor(p: PropuestaServidor | null | undefined): ItemCola | null {
  if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id) return null;
  if (p.tipo !== 'despachos' && p.tipo !== 'produccion') return null;
  const modo: ModoPropuesta = p.modo === 'on' ? 'on' : 'sombra';
  const prioridad: PrioridadPropuesta = PRIORIDADES.has(p.prioridad) ? p.prioridad : 'importante';
  const pedidos = Array.isArray(p.pedidos)
    ? p.pedidos.filter((x) => x && typeof x.id === 'string').map((x) => ({ id: x.id, nroPedido: String(x.nroPedido ?? '') }))
    : [];
  const grupo = p.tipo === 'despachos' && p.grupo && typeof p.grupo === 'object' ? p.grupo : null;
  // Despachos necesita su grupo del plan para aprobar: sin él, solo se puede mirar.
  const puedeAprobar = modo === 'on' && p.puedeAprobar === true && (p.tipo !== 'despachos' || !!grupo);
  return {
    id: p.id,
    clave: claveDePropuesta(p.tipo, grupo, p.id),
    tipo: p.tipo,
    modo,
    prioridad,
    horaLimite: texto(p.horaLimite, 60) || null,
    limiteMin: limiteDe(grupo, p.horaLimite),
    titulo: texto(p.titulo) || (p.tipo === 'despachos' ? `${pedidos.length} pedidos listos para salir` : `${pedidos.length} pedidos por arrancar`),
    razon: texto(p.razon, 400),
    consecuencias: Array.isArray(p.consecuencias) ? p.consecuencias.map((c) => texto(c, 120)).filter(Boolean).slice(0, 4) : [],
    pedidos,
    porCobrar: typeof p.cifras?.porCobrar === 'number' && p.cifras.porCobrar > 0 ? p.cifras.porCobrar : 0,
    monto: null,
    puedeAprobar,
    servidor: p,
    pedidoId: null,
  };
}

/** Tipo de grupo (y transportadora), zona y franja: no usa la huella del grupo, que cambia con cualquier pedido. */
function claveDePropuesta(tipo: TipoPropuesta, grupo: GrupoPlan | null, id: string): string {
  if (!grupo) return `${tipo}:${id}`;
  const quien = grupo.tipo === 'transportadora' ? `t:${texto(grupo.transportadora?.proveedor, 60)}` : 'm';
  const franja = grupo.franja ? texto(grupo.franja.clave, 40) || texto(grupo.franja.etiqueta, 60) : '';
  return `${tipo}:${quien}:${claveDeNombre(grupo.zona)}:${franja}`;
}

/** La hora límite en minutos: la franja del grupo si la trae; si no, se lee del texto ("9 a 11 a. m."). */
function limiteDe(grupo: GrupoPlan | null, horaLimite: string | null | undefined): number | null {
  const f = grupo?.franja;
  if (f) {
    const m = typeof f.finMin === 'number' ? f.finMin : typeof f.inicioMin === 'number' ? f.inicioMin : null;
    if (m !== null && Number.isFinite(m)) return m;
  }
  return minutosDeTexto(horaLimite);
}

/**
 * Lee la ÚLTIMA hora de un texto como "9 a 11 a. m.", "2 a 5 p. m." o "11:30 a. m." (la que cierra
 * la franja). Cada número toma el "a. m."/"p. m." que tenga después. null si no hay hora.
 */
export function minutosDeTexto(t: string | null | undefined): number | null {
  if (!t) return null;
  const patron = /(\d{1,2})(?::(\d{2}))?|([ap])\.?\s?m\.?/gi;
  const numeros: Array<{ h: number; m: number; marca: 'a' | 'p' | null }> = [];
  let r: RegExpExecArray | null;
  while ((r = patron.exec(t)) !== null) {
    if (r[1] !== undefined) {
      numeros.push({ h: Number(r[1]), m: r[2] !== undefined ? Number(r[2]) : 0, marca: null });
    } else if (r[3]) {
      const marca = r[3].toLowerCase() === 'p' ? 'p' : 'a';
      // La marca vale para los números que no tienen la suya todavía.
      for (let i = numeros.length - 1; i >= 0 && numeros[i].marca === null; i--) numeros[i].marca = marca;
    }
  }
  const ultimo = numeros[numeros.length - 1];
  if (!ultimo || ultimo.h > 23 || ultimo.m > 59) return null;
  let h = ultimo.h;
  if (ultimo.marca === 'p' && h < 12) h += 12;
  if (ultimo.marca === 'a' && h === 12) h = 0;
  return h * 60 + ultimo.m;
}

/** Estados de pago que ya no son "sin pago". El radar se pone al día cada 30 s; esto lo adelanta. */
const ETAPAS_SIN_COBRO = new Set(['entregado', 'rechazado', 'cancelado']);

/**
 * Señales de cobro sacadas del radar del canal en vivo (`radar.atencion`, tipo `sin_pago`): no
 * escriben ni piden nada al servidor. Se retiran solas cuando el pedido ya no está pendiente de
 * pago (llegó `pago_confirmado`), cuando se cerró o se canceló, o cuando el radar lo suelta.
 */
export function senalesDeCobro(
  atencion: ReadonlyArray<AlertaRadar> | null | undefined,
  pedidos: ReadonlyArray<PedidoEnVivo>
): ItemCola[] {
  if (!Array.isArray(atencion)) return [];
  const porId = new Map(pedidos.map((p) => [p.id, p]));
  const vistos = new Set<string>();
  const out: ItemCola[] = [];
  for (const a of atencion) {
    if (!a || a.tipo !== 'sin_pago' || typeof a.pedidoId !== 'string' || !a.pedidoId || vistos.has(a.pedidoId)) continue;
    const p = porId.get(a.pedidoId);
    if (p && ((p.estadoPago && p.estadoPago !== 'Pendiente') || ETAPAS_SIN_COBRO.has(p.etapa) || p.cancelado)) continue;
    vistos.add(a.pedidoId);
    const numero = a.numero || p?.numero || null;
    const tiempo = typeof a.minutos === 'number' && a.minutos > 0 ? ` lleva ${duracion(a.minutos * 60_000)}` : ' sigue';
    out.push({
      id: `cobro:${a.pedidoId}`,
      clave: `cobro:${a.pedidoId}`,
      tipo: 'cobro',
      modo: 'senal',
      prioridad: 'importante',
      horaLimite: null,
      limiteMin: null,
      titulo: `${numero ? `El #${numero}` : 'Un pedido'}${tiempo} sin pago`,
      razon: texto(a.sugerencia) || 'Ábrelo para revisar el pago antes de despacharlo.',
      consecuencias: ['No cambia el pedido'],
      pedidos: [{ id: a.pedidoId, nroPedido: numero ?? '' }],
      porCobrar: 0,
      monto: p && p.monto > 0 ? p.monto : null,
      puedeAprobar: false,
      servidor: null,
      pedidoId: a.pedidoId,
    });
  }
  return out;
}

/** Orden de la cola: prioridad, hora límite (sin hora al final), más pedidos primero, tipo y huella. */
export function compararItems(a: ItemCola, b: ItemCola): number {
  return (
    PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
    (a.limiteMin ?? Infinity) - (b.limiteMin ?? Infinity) ||
    b.pedidos.length - a.pedidos.length ||
    PESO_TIPO[a.tipo] - PESO_TIPO[b.tipo] ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

export function ordenarCola(items: ReadonlyArray<ItemCola>): ItemCola[] {
  return items.slice().sort(compararItems);
}

/**
 * La cola que se ve: lo del servidor más las señales, sin lo aplazado ("Después", "No hoy"), sin
 * lo que ya se aprobó (`resueltos`) y sin repetir huellas, en orden.
 */
export function armarCola(
  servidor: ReadonlyArray<ItemCola>,
  senales: ReadonlyArray<ItemCola>,
  aplazados: Aplazados,
  ahoraMs: number,
  resueltos: ReadonlySet<string> = new Set()
): ItemCola[] {
  const vistos = new Set<string>();
  const out: ItemCola[] = [];
  for (const it of [...servidor, ...senales]) {
    if (vistos.has(it.id) || resueltos.has(it.id) || oculto(aplazados, it.id, ahoraMs)) continue;
    vistos.add(it.id);
    out.push(it);
  }
  return ordenarCola(out);
}

/** El contador del botón del orbe. La sombra no cuenta como idea: no se puede aprobar. */
export function contar(items: ReadonlyArray<ItemCola>): ContadorPropuestas {
  let ideas = 0;
  let urgentes = 0;
  for (const it of items) {
    if (it.modo === 'sombra') continue;
    ideas++;
    if (it.prioridad === 'urgente') urgentes++;
  }
  return { ideas, urgentes };
}

/**
 * Saludo de la narración al llegar (plantilla con los conteos de la cola; sin llamar al modelo):
 * "Buenos días: 3 para hoy, 1 urgente". null si no hay ideas.
 */
export function saludo(c: ContadorPropuestas, horaColombia: number): string | null {
  if (!c || c.ideas <= 0) return null;
  const parte = horaColombia < 12 ? 'Buenos días' : horaColombia < 19 ? 'Buenas tardes' : 'Buenas noches';
  const urgentes = c.urgentes > 0 ? `, ${c.urgentes} ${c.urgentes === 1 ? 'urgente' : 'urgentes'}` : '';
  return `${parte}: ${c.ideas} para hoy${urgentes}.`;
}

/** Un evento que dice que el pedido ya salió (aprobado en otro lado, p. ej. desde el celular mientras la TV mira). */
export function eventoDeDespacho(ev: { tipo: string; estadoNuevo?: string | null } | null | undefined): boolean {
  if (!ev) return false;
  if (ev.tipo === 'salida' || ev.tipo === 'asignado') return true;
  return ev.tipo === 'cambio_estado' && /^despachad/i.test(String(ev.estadoNuevo ?? ''));
}

/** Lo que la narración cuenta del plan: "Organicé N pedidos en M salidas" (y, si puede, "apruébalas aquí"). */
export interface ResumenPlan {
  pedidos: number;
  salidas: number;
  /** La sesión puede aprobar esas salidas en la tarjeta: solo entonces se le dice "apruébalas aquí". */
  aprobar: boolean;
}

/**
 * Para la narración. Con permiso de aprobar (`puedeAprobar`, de la raíz `despachos`) cuenta las
 * salidas que ESTA sesión puede aprobar; sin permiso cuenta las del plan, pero sin invitar a aprobar.
 */
export function resumenDespachos(items: ReadonlyArray<ItemCola>, puedeAprobar = false): ResumenPlan {
  let pedidos = 0;
  let salidas = 0;
  for (const it of items) {
    if (it.tipo !== 'despachos' || it.modo !== 'on') continue;
    if (puedeAprobar && !it.puedeAprobar) continue;
    salidas++;
    pedidos += it.pedidos.length;
  }
  return { pedidos, salidas, aprobar: puedeAprobar && salidas > 0 };
}

/**
 * "La misma" propuesta después de refrescar (su id es la huella del grupo y cambia si cambia uno
 * de sus pedidos): la del mismo id; si no, la del mismo tipo que comparta MÁS pedidos con ella. Si
 * ninguna comparte pedidos ya es otra propuesta (sus pedidos salieron del plan): null.
 */
export function sucesorDe(anterior: ItemCola, cola: ReadonlyArray<ItemCola>): ItemCola | null {
  const mismo = cola.find((x) => x.id === anterior.id);
  if (mismo) return mismo;
  const suyos = new Set(anterior.pedidos.map((p) => p.id));
  let mejor: ItemCola | null = null;
  let max = 0;
  for (const x of cola) {
    if (x.tipo !== anterior.tipo) continue;
    const comunes = x.pedidos.reduce((n, p) => n + (suyos.has(p.id) ? 1 : 0), 0);
    if (comunes > max) {
      max = comunes;
      mejor = x;
    }
  }
  return mejor;
}

/**
 * La siguiente tras "Después" o "No hoy": la primera de la cola que no sea la actual (así una urgente
 * que llegó mientras tanto, y que la cola puso adelante, sale de siguiente). null si no hay otra.
 */
export function siguienteTrasDescartar(cola: ReadonlyArray<ItemCola>, actualId: string): ItemCola | null {
  return cola.find((x) => x.id !== actualId) ?? null;
}

/** Las propuestas del servidor que incluyen ese pedido (un evento suyo las deja viejas). */
export function itemsDelPedido(items: ReadonlyArray<ItemCola>, pedidoId: string | null | undefined): ItemCola[] {
  if (!pedidoId) return [];
  return items.filter((it) => it.servidor !== null && it.pedidos.some((p) => p.id === pedidoId));
}

// ── "Después" y "No hoy" ────────────────────────────────────────────────────

/** Lo aplazado por la persona, por día: `despues` (huella → hasta cuándo) y `noHoy` (huellas). */
export interface Aplazados {
  dia: string;
  despues: Readonly<Record<string, number>>;
  noHoy: ReadonlyArray<string>;
}

const MAX_APLAZADOS = 200;

export function aplazadosVacios(dia: string): Aplazados {
  return { dia, despues: {}, noHoy: [] };
}

/**
 * Lee lo guardado (puede venir de otra versión, de otro día o roto): lo de otro día se descarta y
 * los "Después" vencidos también.
 */
export function leerAplazados(crudo: unknown, dia: string, ahoraMs: number): Aplazados {
  if (!crudo || typeof crudo !== 'object' || Array.isArray(crudo)) return aplazadosVacios(dia);
  const r = crudo as Record<string, unknown>;
  if (r['dia'] !== dia) return aplazadosVacios(dia);
  const despues: Record<string, number> = {};
  const d = r['despues'];
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    for (const [id, hasta] of Object.entries(d as Record<string, unknown>).slice(0, MAX_APLAZADOS)) {
      if (typeof hasta === 'number' && hasta > ahoraMs && id.length <= 200) despues[id] = hasta;
    }
  }
  const noHoy = Array.isArray(r['noHoy'])
    ? (r['noHoy'] as unknown[]).filter((x): x is string => typeof x === 'string' && x.length <= 200).slice(-MAX_APLAZADOS)
    : [];
  return { dia, despues, noHoy };
}

export function aplazar(a: Aplazados, id: string, ahoraMs: number): Aplazados {
  const despues: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.despues)) if (v > ahoraMs) despues[k] = v;
  despues[id] = ahoraMs + DESPUES_MS;
  return { ...a, despues };
}

export function descartarHoy(a: Aplazados, id: string): Aplazados {
  if (a.noHoy.indexOf(id) !== -1) return a;
  return { ...a, noHoy: [...a.noHoy, id].slice(-MAX_APLAZADOS) };
}

export function oculto(a: Aplazados, id: string, ahoraMs: number): boolean {
  const hasta = a.despues[id];
  return a.noHoy.indexOf(id) !== -1 || (typeof hasta === 'number' && hasta > ahoraMs);
}

/** El próximo "Después" que vence (para volver a armar la cola a esa hora); null = ninguno. */
export function proximoVencimiento(a: Aplazados, ahoraMs: number): number | null {
  let min: number | null = null;
  for (const v of Object.values(a.despues)) if (v > ahoraMs && (min === null || v < min)) min = v;
  return min;
}

// ── Escena ──────────────────────────────────────────────────────────────────

/** Los colores de las chaquetas de las motos de la escena, en el mismo orden. */
export const COLORES_MOTO: ReadonlyArray<ColorEscena> = ['accent', 'info', 'pack', 'ok'];

function esTransportadora(it: ItemCola): boolean {
  return it.servidor?.escena?.transportadora === true || it.servidor?.grupo?.tipo === 'transportadora';
}

/**
 * Un color por mensajero en toda la cola (el mismo mensajero, el mismo color en todas sus
 * propuestas), en el orden en que aparecen. Clave: el nombre sin tildes ni mayúsculas.
 */
export function coloresPorMensajero(items: ReadonlyArray<ItemCola>): Map<string, ColorEscena> {
  const out = new Map<string, ColorEscena>();
  for (const it of items) {
    if (it.tipo !== 'despachos' || esTransportadora(it)) continue;
    const clave = claveDeNombre(vehDe(it, false));
    if (!clave || out.has(clave)) continue;
    out.set(clave, COLORES_MOTO[out.size % COLORES_MOTO.length]);
  }
  return out;
}

/**
 * Mensajero: su nombre (la escena busca su moto). Transportadora: su nombre, con el que la escena
 * rotula el montón frente al camión ("Cereza · 2"); con ella no se busca moto. Con un ajuste, el que
 * escogió la persona.
 */
function vehDe(it: ItemCola, transportadora: boolean): string | null {
  if (it.ajuste) return it.ajuste.veh;
  if (transportadora) return texto(it.servidor?.grupo?.transportadora?.nombre, 60) || null;
  const v = it.servidor?.escena?.veh;
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * El nombre del mensajero sin la cédula que algunos comercios le pegan ("1020304050 - CARLOS PÉREZ"
 * → "CARLOS PÉREZ"). Misma regla que el servidor (`canonicalTransportadorName`): así lo lleva el
 * pedido al aprobar y así lo busca la escena.
 */
export function nombreCanonico(nombre: string | null | undefined): string {
  return String(nombre ?? '')
    .trim()
    .replace(/^\s*\d{6,}\s*-\s*/, '')
    .replace(/\s*-\s*\d{6,}\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * El nombre de pila para los textos ("1020304050 - CARLOS PÉREZ" → "Carlos"), como el título que
 * arma el servidor (`nombrePila`): sin cédula y, si viene todo en mayúsculas o minúsculas, con
 * mayúscula inicial; un nombre ya escrito con mayúsculas y minúsculas se respeta.
 */
export function nombreCorto(nombre: string | null | undefined): string {
  const primero = nombreCanonico(nombre).split(' ')[0] || '';
  if (!primero) return '';
  const todoIgual = primero === primero.toUpperCase() || primero === primero.toLowerCase();
  return todoIgual ? primero.charAt(0).toUpperCase() + primero.slice(1).toLowerCase() : primero;
}

/** Lo único que la escena necesita de la propuesta que está en la tarjeta. */
export function paraEscena(it: ItemCola, colores: ReadonlyMap<string, ColorEscena> = new Map()): PropuestaEnEscena {
  const e = it.servidor?.escena;
  const pedidos = it.pedidos.map((p) => p.id);
  const transportadora = esTransportadora(it);
  const veh = vehDe(it, transportadora);
  // Con un ajuste a otro mensajero, el color del servidor era el del sugerido: manda el del elegido.
  const colorServidor: ColorEscena | null = e && COLORES.has(e.color) && !it.ajuste ? e.color : null;
  const colorMensajero = !transportadora && veh ? colores.get(claveDeNombre(veh)) ?? null : null;
  const color: ColorEscena = colorMensajero ?? colorServidor ?? (it.tipo === 'cobro' ? 'warn' : transportadora ? 'ok' : veh ? 'accent' : 'warn');
  const efecto: EfectoEscena = it.tipo === 'cobro' ? 'moneda' : e && EFECTOS.has(e.efecto) ? e.efecto : it.tipo === 'produccion' ? 'fila' : 'montones';
  const estacion: EstacionEscena | null = e && e.estacion && ESTACIONES.has(e.estacion) ? e.estacion : it.tipo === 'produccion' ? 'recibido' : null;
  const grupos: GrupoEnEscena[] =
    it.tipo === 'despachos'
      ? [{ id: it.servidor?.grupo?.id ?? it.id, pedidos, veh, transportadora, color }]
      : [{ id: it.id, pedidos, veh: null, transportadora: false, color }];
  return {
    // Un ajuste cambia el ensayo (otro mensajero u otros pedidos): otro id para que la escena lo rearme.
    id: it.ajuste ? `${it.id}~${it.ajuste.firma}` : it.id,
    tipo: it.tipo,
    modo: it.modo,
    prioridad: it.prioridad,
    efecto,
    pedidos,
    grupos,
    estacion,
    etiqueta: etiquetaEscena(it, veh, transportadora),
  };
}

/** "Carlos · 4", "Coordinadora · 2", "Escoge mensajero · 3", "5 por arrancar", "#1045 · sin pago". */
function etiquetaEscena(it: ItemCola, veh: string | null, transportadora: boolean): string {
  const n = it.pedidos.length;
  if (it.tipo === 'cobro') return `${it.pedidos[0]?.nroPedido ? `#${it.pedidos[0].nroPedido}` : 'Pedido'} · sin pago`;
  if (it.tipo === 'produccion') return `${n} por arrancar`;
  if (transportadora) return `${veh || 'Transportadora'} · ${n}`;
  return `${veh ? nombreCorto(veh) : 'Escoge mensajero'} · ${n}`;
}

// ── Cuándo pedir ────────────────────────────────────────────────────────────

/**
 * Lo que dispara un pedido al servidor sin costar lecturas: cuántos pedidos están listos y qué
 * alertas `listo`/`sin_pago` trae el radar. Si no cambia, no se pide.
 */
export function firmaParaPedir(pedidos: ReadonlyArray<PedidoEnVivo>, atencion: ReadonlyArray<AlertaRadar> | null | undefined): string {
  const alertas = (Array.isArray(atencion) ? atencion : [])
    .filter((a) => a && (a.tipo === 'listo' || a.tipo === 'sin_pago'))
    .map((a) => `${a.tipo}:${a.pedidoId ?? ''}`)
    .sort();
  return `${contarListos(pedidos)}|${alertas.join(',')}`;
}

export interface CondicionPedir {
  ahoraMs: number;
  /** Cuándo se pidió la última vez (ms); null = nunca. */
  ultimaMs: number | null;
  tv: boolean;
  repitiendo: boolean;
  /** Pestaña oculta. */
  oculta: boolean;
  /** Justo después de aprobar: se salta el mínimo entre pedidos (no el de la TV). */
  trasAprobar?: boolean;
}

/** Nunca durante "Repetir el día" ni con la pestaña oculta; en TV, a lo sumo cada 5 min. */
export function puedePedir(c: CondicionPedir): boolean {
  if (c.repitiendo || c.oculta) return false;
  if (c.ultimaMs === null) return true;
  const pasado = c.ahoraMs - c.ultimaMs;
  if (c.tv) return pasado >= MINIMO_TV_MS;
  return c.trasAprobar === true || pasado >= MINIMO_ENTRE_PEDIDOS_MS;
}

// ── Textos de la tarjeta ────────────────────────────────────────────────────

/** "Opttia propone · 1 de 3 · Urgente" (la tarjeta lo pone en MAYÚSCULA con estilos). */
export function eyebrow(it: ItemCola, indice: number, total: number): string {
  const partes = ['Opttia propone'];
  if (indice >= 0 && total > 0) partes.push(`${indice + 1} de ${total}`);
  partes.push(ETIQUETA_PRIORIDAD[it.prioridad]);
  return partes.join(' · ');
}

/** Título con "ocultar": en cobro, el valor solo sin "ocultar"; en lo del servidor, sin montos. */
export function tituloVisible(it: ItemCola, ocultar: boolean): string {
  if (it.tipo === 'cobro') return it.monto && !ocultar ? `${it.titulo} (${dinero(it.monto)})` : it.titulo;
  return ocultar ? sinMontos(it.titulo) : it.titulo;
}

export function razonVisible(it: ItemCola, ocultar: boolean): string {
  return ocultar ? sinMontos(it.razon) : it.razon;
}

/** Chips de lo que hace aprobar (efecto, par fuerte/suave) y cifras neutras ("$85.000 por cobrar" sin "ocultar"). */
export function chipsDe(it: ItemCola, ocultar: boolean): Array<{ texto: string; efecto: boolean }> {
  const out = it.consecuencias.map((c) => ({ texto: ocultar ? sinMontos(c) : c, efecto: true }));
  if (it.tipo !== 'cobro') {
    const n = it.pedidos.length;
    out.push({ texto: `${n} ${n === 1 ? 'pedido' : 'pedidos'}`, efecto: false });
  }
  if (it.porCobrar > 0 && !ocultar) out.push({ texto: `${dinero(it.porCobrar)} por cobrar`, efecto: false });
  return out;
}

/** Cambia los montos por "$•••" (la misma regla de "ocultar" que el texto de Opttia). */
export function sinMontos(t: string): string {
  return enmascarar(t, { montos: true });
}

/** Pasa la primera letra a minúscula ("Le avisa a Carlos" → "le avisa a Carlos"). */
function enMinuscula(t: string): string {
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
}

/**
 * Texto del botón en el segundo paso: dice el efecto real.
 * "Confirmar: salen 4 con Carlos · le avisa a Carlos en su app" · "Confirmar: 2 pedidos a Cereza".
 */
export function textoConfirmar(it: ItemCola, g: GrupoEditable | null, nombre: string | null, ocultar = false): string {
  const n = g ? g.pedidos.length : it.pedidos.length;
  const pedidos = `${n} ${n === 1 ? 'pedido' : 'pedidos'}`;
  let base: string;
  if (g && g.tipo === 'transportadora') base = `Confirmar: ${pedidos} a ${nombre || 'la transportadora'}`;
  else base = `Confirmar: ${n === 1 ? 'sale 1' : `salen ${n}`} con ${nombre ? nombreCorto(nombre) : 'el mensajero'}`;
  const efecto = it.consecuencias[0];
  return efecto ? `${base} · ${enMinuscula(ocultar ? sinMontos(efecto) : efecto)}` : base;
}

export function textoConfirmarTodos(grupos: number, pedidos: number): string {
  return `Confirmar: salen ${pedidos} ${pedidos === 1 ? 'pedido' : 'pedidos'} en ${grupos} grupos`;
}

export type TonoResultado = 't-ok' | 't-warn' | 't-bad';

/** Estados con los que el grupo ya no se aprueba otra vez ("no despachado" sí se puede reintentar). */
const YA_APROBADOS = new Set<EstadoResultado>(['despachado', 'despachado-parcial', 'ya-aprobado', 'reanudado', 'en-curso']);

export function yaAprobado(r: ResultadoGrupo | null | undefined): boolean {
  return !!r && YA_APROBADOS.has(r.estado);
}

export function tonoResultado(r: ResultadoGrupo): TonoResultado {
  if (r.estado === 'despachado' || r.estado === 'reanudado') return 't-ok';
  if (r.estado === 'despachado-parcial' || r.estado === 'ya-aprobado' || r.estado === 'en-curso') return 't-warn';
  return 't-bad';
}

/** Cuánto esperar para pasar sola a la siguiente; null = no pasar (la persona tiene que leer el error). */
export function esperaParaPasar(r: ResultadoGrupo): number | null {
  if (r.estado === 'despachado' || r.estado === 'reanudado' || r.estado === 'ya-aprobado') return PASAR_TRAS_EXITO_MS;
  if (r.estado === 'despachado-parcial') return PASAR_TRAS_PARCIAL_MS;
  return null;
}

/**
 * El resultado de un grupo en palabras, como en la tarjeta del grupo: "Listo: salieron 4 con Carlos
 * en la orden 412.", "Listo: enviados a Cereza: 2 órdenes de envío (51, 52).", parcial, ya
 * aprobado, en curso o la razón del servidor.
 */
export function textoResultado(r: ResultadoGrupo, ctx: { tipo: TipoGrupo; nombre: string | null; pedidos: number }): string {
  if (ctx.tipo === 'transportadora') return textoResultadoTransportadora(r, ctx.nombre);
  const orden = r.nroShippingOrder ? ` en la orden ${r.nroShippingOrder}` : '';
  const con = ctx.nombre ? ` con ${nombreCorto(ctx.nombre)}` : '';
  const salieron = r.despachados?.length ?? ctx.pedidos;
  switch (r.estado) {
    case 'despachado':
      return `Listo: ${salieron === 1 ? 'salió 1' : `salieron ${salieron}`}${con}${orden}.`;
    case 'despachado-parcial': {
      const fuera = r.fuera?.length ?? 0;
      return `${salieron === 1 ? 'Salió 1' : `Salieron ${salieron}`}${con}${orden}; ${fuera} ${fuera === 1 ? 'quedó' : 'quedaron'} por fuera.`;
    }
    case 'reanudado':
      return `Listo: se terminaron de despachar${orden}.`;
    case 'ya-aprobado':
      return r.razon || 'Ya estaba aprobado.';
    case 'en-curso':
      return r.razon || 'Sigue en curso.';
    default:
      return r.razon || 'No se pudo despachar.';
  }
}

function textoResultadoTransportadora(r: ResultadoGrupo, nombreElegida: string | null): string {
  const nombre = r.transportadora || nombreElegida || 'la transportadora';
  const ordenes = r.nroShippingOrders?.length ? r.nroShippingOrders : r.nroShippingOrder ? [r.nroShippingOrder] : [];
  const salieron = r.despachados?.length ?? ordenes.length;
  const fuera = r.fuera?.length ?? 0;
  switch (r.estado) {
    case 'despachado': {
      const n = ordenes.length || salieron;
      const detalle = ordenes.length ? ` (${ordenes.join(', ')})` : '';
      return `Listo: ${n === 1 ? 'enviado' : 'enviados'} a ${nombre}, ${n} ${n === 1 ? 'orden de envío' : 'órdenes de envío'}${detalle}.`;
    }
    case 'despachado-parcial': {
      const detalle = ordenes.length ? ` (${ordenes.length === 1 ? 'orden' : 'órdenes'} ${ordenes.join(', ')})` : '';
      return `${salieron === 1 ? 'Salió 1' : `Salieron ${salieron}`} a ${nombre}${detalle}; ${fuera} ${fuera === 1 ? 'quedó' : 'quedaron'} por fuera.`;
    }
    case 'reanudado':
      return `Listo: se terminaron de enviar a ${nombre}.`;
    case 'ya-aprobado':
      return r.razon || 'Ya estaba aprobado.';
    case 'en-curso':
      return r.razon || 'Sigue en curso.';
    default:
      return r.razon || 'No se pudo enviar.';
  }
}

// ── Aprobar despachos (lo que antes vivía en la vista Despachos) ───────────

/** El grupo del plan tal como lo puede ajustar la persona antes de aprobar. */
export function editableDe(g: GrupoPlan, frase: string | null = null): GrupoEditable {
  const tipo: TipoGrupo = g.tipo === 'transportadora' ? 'transportadora' : 'mensajero';
  const t = tipo === 'transportadora' ? g.transportadora ?? null : null;
  const alternativas = (t?.alternativas || []).filter((a) => a.proveedor !== t?.proveedor);
  const huellas = g.huellasPedidos || {};
  return {
    id: g.id,
    tipo,
    zona: g.zona,
    franja: g.franja ? g.franja.etiqueta : null,
    urgente: g.franja?.urgente === true,
    pedidos: (g.pedidos || []).map((p) => ({
      id: p.id,
      nroPedido: p.nroPedido,
      porCobrar: p.porCobrar,
      zona: p.zona,
      franja: p.franja,
      huella: huellas[p.id],
      origen: tipo,
    })),
    mensajeroId: tipo === 'mensajero' && g.sugerido ? g.sugerido.id : null,
    proveedor: t ? t.proveedor : null,
    transportadoras: t ? [{ proveedor: t.proveedor, nombre: t.nombre, tarifa: t.tarifa, nota: t.nota ?? null }, ...alternativas] : [],
    frase,
  };
}

/** Mensajero: necesita a quién; transportadora: necesita cuál. */
export function conQuien(g: GrupoEditable): boolean {
  return g.tipo === 'transportadora' ? !!g.proveedor : !!g.mensajeroId;
}

/** O BIEN el mensajero (`transportadorId`) O BIEN la transportadora (`proveedor`), nunca los dos. */
export function paraAprobar(g: GrupoEditable, planHuella: string): GrupoParaAprobar {
  const pedidos = g.pedidos.map((p) => ({ id: p.id, huella: p.huella }));
  return g.tipo === 'transportadora'
    ? { proveedor: g.proveedor as string, planHuella, pedidos }
    : { transportadorId: g.mensajeroId as string, planHuella, pedidos };
}

/** El sugerido y sus alternativas (con su razón) primero; después los demás mensajeros disponibles. */
export function opcionesDe(g: GrupoPlan, disponibles: PlanDespachos['mensajerosDisponibles']): OpcionMensajero[] {
  const lista = Array.isArray(disponibles) ? disponibles : [];
  const app = new Map(lista.map((m) => [m.id, m.app]));
  const out: OpcionMensajero[] = [];
  const vistos = new Set<string>();
  const sumar = (id: string, nombre: string, razon: string | null): void => {
    if (!id || vistos.has(id)) return;
    vistos.add(id);
    out.push({ id, nombre, razon, app: app.get(id) ?? 'sin-dato' });
  };
  if (g.sugerido) {
    sumar(g.sugerido.id, g.sugerido.nombre, g.sugerido.razon);
    for (const a of g.sugerido.alternativas || []) sumar(a.id, a.nombre, a.razon);
  }
  for (const m of lista) sumar(m.id, m.nombre, null);
  return out;
}

/** El nombre de quien lleva el grupo: el mensajero elegido o la transportadora elegida. */
export function nombreDe(g: GrupoEditable, opciones: ReadonlyArray<OpcionMensajero>): string | null {
  if (g.tipo === 'transportadora') return g.transportadoras.find((t) => t.proveedor === g.proveedor)?.nombre ?? null;
  return opciones.find((o) => o.id === g.mensajeroId)?.nombre ?? null;
}

/**
 * Lotes de una aprobación: los grupos de mensajero van juntos en una petición; cada grupo de
 * transportadora va en la suya, uno tras otro (cada pedido es una llamada a la integración).
 */
export function lotesDe<T extends { tipo: TipoGrupo }>(gs: ReadonlyArray<T>): T[][] {
  const mensajeros = gs.filter((g) => g.tipo !== 'transportadora');
  return [...(mensajeros.length ? [mensajeros] : []), ...gs.filter((g) => g.tipo === 'transportadora').map((g) => [g])];
}

/**
 * "Aprobar los N grupos": solo si quedan al menos 2 grupos por aprobar y TODOS son de mensajero
 * (las transportadoras se aprueban de a una). null = no se ofrece.
 */
export function aprobarTodosDisponible(grupos: ReadonlyArray<GrupoEditable>): { grupos: number; pedidos: number } | null {
  if (grupos.length < 2 || grupos.some((g) => g.tipo === 'transportadora')) return null;
  if (grupos.some((g) => !conQuien(g) || !g.pedidos.length)) return null;
  return { grupos: grupos.length, pedidos: grupos.reduce((s, g) => s + g.pedidos.length, 0) };
}

/**
 * Se acabó el tiempo o no hubo respuesta: red caída, el proxy cortó, el servidor no estaba o pasaron
 * los 75 s del cliente. Un error con `code` en el cuerpo (p. ej. un 503 del interruptor) sí es una
 * respuesta del servidor: se trata como un error normal con su `message`.
 */
export function sinRespuesta(e: unknown): boolean {
  const err = e as { status?: number; error?: unknown; name?: string } | null;
  if (!err) return false;
  const progreso = typeof ProgressEvent !== 'undefined' && err.error instanceof ProgressEvent;
  if (err.name === 'TimeoutError' || err.status === 0 || progreso) return true;
  const cuerpo = err.error as { code?: unknown } | null | undefined;
  if (cuerpo && typeof cuerpo === 'object' && cuerpo.code !== undefined && cuerpo.code !== null) return false;
  return err.status === 502 || err.status === 503 || err.status === 504;
}

export function mensajeDe(e: unknown, defecto: string): string {
  const cuerpo = (e as { error?: { message?: string } } | null)?.error;
  const m = cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : '';
  return m && m.length < 200 ? m : defecto;
}

export const SIN_RESPUESTA =
  'Katuq no respondió a tiempo y no sé si alcanzó a enviar. Espera a que se actualice antes de volver a aprobar.';

/** Tras "sin respuesta", lo leído después todavía trae el grupo sin despachar: se puede reintentar. */
export const NO_SALIO_TODAVIA =
  'Ya se actualizó y todavía no aparece despachado. Puedes aprobarlo otra vez: si alcanzó a salir, Katuq no lo repite.';

// ── Lo que la persona ajustó ────────────────────────────────────────────────

/** Una firma corta (no criptográfica) para distinguir dos ajustes del mismo grupo. */
function firmaCorta(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function cuantos(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Las mismas plantillas del servidor (services/opttiaPropuestas/fuentes/despachos.js). */
function avisoClientes(n: number): string {
  return `Avisa a ${n === 1 ? 'su cliente' : 'los clientes'}, como en Despachos`;
}

function tarifaEnTexto(t: TarifaPlan | null | undefined): string {
  if (t && t.tipo === 'fija' && typeof t.valor === 'number' && Number.isFinite(t.valor)) return `${dinero(t.valor)} por pedido`;
  return (t && texto(t.texto, 120)) || 'Sin tarifa';
}

/**
 * La propuesta tal como quedó después de "Ajustar" (otro mensajero u otra transportadora, pedidos
 * sacados o traídos de otro grupo). Título, razón, consecuencias, pedidos y lo que ensaya la escena
 * salen del grupo ajustado, con las MISMAS plantillas del servidor: la tarjeta y la escena muestran
 * lo que de verdad se va a aprobar. Sin ajustes devuelve el mismo ítem (no se copia).
 */
export function ajustada(it: ItemCola, g: GrupoEditable | null | undefined, opciones: ReadonlyArray<OpcionMensajero>): ItemCola {
  const grupo = it.servidor?.grupo;
  if (it.tipo !== 'despachos' || !g || !grupo) return it;
  const esTransp = g.tipo === 'transportadora';
  const quienOriginal = esTransp ? grupo.transportadora?.proveedor ?? null : grupo.sugerido?.id ?? null;
  const quien = esTransp ? g.proveedor : g.mensajeroId;
  const ids = g.pedidos.map((p) => p.id);
  const mismosPedidos = ids.length === it.pedidos.length && ids.every((id, i) => it.pedidos[i].id === id);
  const mismoQuien = quien === quienOriginal;
  if (mismoQuien && mismosPedidos) return it;

  const n = g.pedidos.length;
  let titulo: string;
  let razon: string;
  let consecuencias: string[];
  let veh: string | null;
  if (esTransp) {
    const t = g.transportadoras.find((x) => x.proveedor === g.proveedor) ?? null;
    const nombre = (t && texto(t.nombre, 60)) || 'la transportadora';
    titulo = `${cuantos(n, 'pedido', 'pedidos')} por ${nombre}`;
    razon = mismoQuien ? it.razon : texto(t?.nota, 400) || tarifaEnTexto(t?.tarifa);
    consecuencias = [`Crea ${cuantos(n, 'orden', 'órdenes')} en ${nombre}`];
    veh = (t && texto(t.nombre, 60)) || null;
  } else {
    const o = opciones.find((x) => x.id === g.mensajeroId) ?? null;
    const pila = o ? nombreCorto(o.nombre) : '';
    titulo = pila
      ? `${pila} lleva ${cuantos(n, 'pedido', 'pedidos')} a ${g.zona}${it.horaLimite ? ` (${it.horaLimite})` : ''}`
      : `${cuantos(n, 'pedido', 'pedidos')} a ${g.zona}: escoge mensajero`;
    razon = mismoQuien || !o ? it.razon : texto(o.razon, 400) || 'Lo escogiste en Ajustar';
    consecuencias = ['Pasan a Despachado', pila ? `Le avisa a ${pila} en su app` : 'Le avisa al mensajero en su app', avisoClientes(n)];
    veh = o ? nombreCanonico(o.nombre) || null : null;
  }
  return {
    ...it,
    titulo,
    razon,
    consecuencias,
    pedidos: g.pedidos.map((p) => ({ id: p.id, nroPedido: p.nroPedido })),
    porCobrar: g.pedidos.reduce((s, p) => s + (p.porCobrar || 0), 0),
    ajuste: { veh, firma: firmaCorta(`${quien ?? ''}|${ids.join(',')}`) },
  };
}

/**
 * Qué le falta al grupo para poder aprobarlo (aparte del permiso del rol): pedidos y con quién
 * salen. null si nada. Lo dice la tarjeta junto al botón Aprobar, que queda deshabilitado.
 */
export function faltaParaAprobar(g: GrupoEditable | null | undefined): string | null {
  if (!g) return null;
  if (!g.pedidos.length) return 'El grupo quedó sin pedidos: devuelve alguno en Ajustar o pasa a la siguiente.';
  if (!conQuien(g)) return g.tipo === 'transportadora' ? 'Escoge la transportadora en Ajustar.' : 'Escoge el mensajero en Ajustar.';
  return null;
}

/**
 * Los grupos para ajustar con un plan nuevo, sin perder lo que la persona ya ajustó:
 * - un grupo que sigue (mismo id: mismos pedidos con su estado, mensajero y franja) conserva su
 *   ajuste aunque cambien otros grupos del plan; sus pedidos toman la huella nueva y se sueltan los
 *   que ya no están en el plan;
 * - un pedido que la persona pasó a otro grupo, o sacó, no vuelve a aparecer en su grupo de origen;
 * - lo sacado que ya no está en el plan se suelta;
 * - `seguir` (la hoja abierta cuyo grupo cambió de id) pasa al grupo que lo sucede el mensajero o la
 *   transportadora que escogió la persona, si sigue disponible (`seguido`).
 */
export function conservarAjustes(e: {
  frescos: ReadonlyMap<string, GrupoEditable>;
  previos: ReadonlyMap<string, GrupoEditable>;
  sacados: ReadonlyArray<PedidoEditable>;
  opciones: ReadonlyMap<string, ReadonlyArray<OpcionMensajero>>;
  seguir?: { de: string; a: string } | null;
}): { editables: Map<string, GrupoEditable>; sacados: PedidoEditable[]; seguido: boolean } {
  // Cada pedido del plan nuevo, con su huella nueva.
  const enPlan = new Map<string, PedidoEditable>();
  e.frescos.forEach((g) => g.pedidos.forEach((p) => enPlan.set(p.id, p)));
  const alDia = (p: PedidoEditable): PedidoEditable | null => {
    const nuevo = enPlan.get(p.id);
    return nuevo ? { ...p, huella: nuevo.huella } : null;
  };
  const vivo = (p: PedidoEditable | null): p is PedidoEditable => p !== null;

  const conservados = new Map<string, GrupoEditable>();
  const tomados = new Set<string>();
  e.frescos.forEach((_, id) => {
    const previo = e.previos.get(id);
    if (!previo) return;
    const pedidos = previo.pedidos.map(alDia).filter(vivo);
    pedidos.forEach((p) => tomados.add(p.id));
    conservados.set(id, { ...previo, pedidos });
  });
  const sacados = e.sacados.map(alDia).filter(vivo).filter((p) => !tomados.has(p.id));
  sacados.forEach((p) => tomados.add(p.id));

  const editables = new Map<string, GrupoEditable>();
  e.frescos.forEach((fresco, id) => {
    editables.set(id, conservados.get(id) ?? { ...fresco, pedidos: fresco.pedidos.filter((p) => !tomados.has(p.id)) });
  });

  let seguido = false;
  const s = e.seguir;
  const previo = s ? e.previos.get(s.de) : undefined;
  const destino = s ? editables.get(s.a) : undefined;
  if (s && previo && destino && !conservados.has(s.a) && previo.tipo === destino.tipo) {
    seguido = true;
    if (destino.tipo === 'transportadora') {
      const t = destino.transportadoras.find((x) => x.proveedor === previo.proveedor);
      if (t && t.proveedor !== destino.proveedor) editables.set(s.a, { ...destino, proveedor: t.proveedor, zona: `Por ${t.nombre}` });
    } else if (previo.mensajeroId && (e.opciones.get(s.a) ?? []).some((o) => o.id === previo.mensajeroId)) {
      editables.set(s.a, { ...destino, mensajeroId: previo.mensajeroId });
    }
  }
  return { editables, sacados, seguido };
}

// ── Cuándo se leyó lo que llegó ─────────────────────────────────────────────

/** Cuándo se leyó lo que trae una fuente y hasta cuándo el servidor lo sirve de memoria (reloj de ESTE navegador). */
export interface LecturaFuente {
  leidaMs: number;
  venceMs: number;
}

const TIPOS_SERVIDOR: ReadonlyArray<PropuestaServidor['tipo']> = ['despachos', 'produccion'];

/**
 * Pasa las horas del servidor (`generadoEn` y, por fuente, `leidoEn` y `venceEn`) al reloj de este
 * navegador por DIFERENCIA, sin suponer que los relojes coinciden y del lado seguro: la lectura se
 * ubica antes de que saliera la petición (nunca se cree más nueva de lo que es) y el vencimiento,
 * después de que llegó la respuesta. Una fuente sin esas horas cuenta como leída al pedir.
 */
export function lecturasDe(r: RespuestaPropuestas | null | undefined, enviadoMs: number, recibidoMs: number): Map<string, LecturaFuente> {
  const out = new Map<string, LecturaFuente>();
  const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const generado = numero(r?.generadoEn);
  const lecturas = (r && r.lecturas && typeof r.lecturas === 'object' ? r.lecturas : {}) as Record<string, { leidoEn?: unknown; venceEn?: unknown } | undefined>;
  for (const tipo of TIPOS_SERVIDOR) {
    const l = lecturas[tipo];
    const leido = numero(l?.leidoEn);
    const vence = numero(l?.venceEn);
    if (generado === null || leido === null || vence === null) {
      out.set(tipo, { leidaMs: enviadoMs, venceMs: recibidoMs });
      continue;
    }
    out.set(tipo, { leidaMs: enviadoMs - Math.max(0, generado - leido), venceMs: recibidoMs + Math.max(0, vence - generado) });
  }
  return out;
}

/** ¿Lo leído ya incluye lo que se vio cambiar en vivo a esa hora (reloj de este navegador)? */
export function incluyeCambio(l: LecturaFuente | null | undefined, cambioMs: number): boolean {
  return !!l && l.leidaMs > cambioMs;
}
