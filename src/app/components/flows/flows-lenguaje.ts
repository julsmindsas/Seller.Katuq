// Lenguaje de Automatizaciones para personas no técnicas (rediseño 2026-10-07,
// parte C de la propuesta D-350 "automatizaciones-sin-tecnicismos").
//
// Solo traduce y resume lo que ya trae cada automatización (graph, triggers,
// status). No cambia el motor, ni los flows, ni lo que se guarda.

import {
  FlowGraph,
  FlowNode,
  FlowSpec,
  FlowStatus,
  FlowTemplate,
  FlowTriggerBinding,
  NodeSpec,
  RunStatus,
  RunStatusReason,
} from './interfaces/flow.interface';

export interface SistemaVisible {
  clave: string;
  nombre: string;
  /** Logo en assets; sin logo se muestra la inicial. */
  logo?: string;
  /** Proveedor en Integraciones que debe estar conectado para que funcione. */
  integracion?: string;
  /** Color de marca para el punto de la etiqueta. */
  color: string;
}

const L = 'assets/images/logos/';

/** Prefijo del tipo de paso → sistema que el comercio reconoce. */
const SISTEMAS: { [prefijo: string]: SistemaVisible } = {
  shopify: { clave: 'shopify', nombre: 'Shopify', color: '#5E8E3E', integracion: 'shopify' },
  woocommerce: { clave: 'woocommerce', nombre: 'WooCommerce', color: '#7F54B3', integracion: 'woocommerce' },
  osmosis: { clave: 'osmosis', nombre: 'Cereza', color: '#C0392B', logo: L + 'guiacereza.svg', integracion: 'osmosis' },
  siigo: { clave: 'siigo', nombre: 'SIIGO', color: '#0B6FB8', integracion: 'siigo' },
  worldoffice: { clave: 'worldoffice', nombre: 'World Office', color: '#E30613', integracion: 'world_office' },
  fullpi: { clave: 'fullpi', nombre: 'Fullpi', color: '#0F9D8A', integracion: 'fullpi' },
  aliaddo: { clave: 'aliaddo', nombre: 'Aliaddo', color: '#FF6600', integracion: 'aliaddo_fulfillment' },
  enviame: { clave: 'enviame', nombre: 'Envíame', color: '#00A3E0', integracion: 'enviame' },
  wompi: { clave: 'wompi', nombre: 'Wompi', color: '#1B1B6B', integracion: 'wompi' },
  katuq: { clave: 'katuq', nombre: 'Katuq', color: '#5F3FE0' },
  kai: { clave: 'kai', nombre: 'Opttia', color: '#5F3FE0' },
  http: { clave: 'http', nombre: 'Otro sistema', color: '#6f6b8f' },
  webhook: { clave: 'webhook', nombre: 'Otro sistema', color: '#6f6b8f' },
};

/** Pasos de control (si, repetir, esperar…): no son un sistema. */
const PASOS_DE_CONTROL = new Set([
  'if', 'switch', 'loop', 'merge', 'split-array', 'delay', 'error-handler', 'sub-flow', 'schedule-cron',
]);

export function sistemaDePaso(tipo: string): SistemaVisible | null {
  const t = String(tipo || '').toLowerCase();
  if (!t || PASOS_DE_CONTROL.has(t)) return null;
  if (t === 'http-request') return SISTEMAS['http'];
  if (t === 'webhook-listener') return SISTEMAS['webhook'];
  return SISTEMAS[t.split('-')[0]] || null;
}

/** Sistemas que una automatización necesita conectados en Integraciones. */
export function integracionesNecesarias(graph: FlowGraph | undefined): SistemaVisible[] {
  const vistos = new Map<string, SistemaVisible>();
  for (const n of graph?.nodes || []) {
    const s = sistemaDePaso(n.type);
    if (s?.integracion && !vistos.has(s.integracion)) vistos.set(s.integracion, s);
  }
  return Array.from(vistos.values());
}

/** Pasos desde los que arranca: los de los triggers o, si no hay, los que nadie alimenta. */
function pasosIniciales(graph: FlowGraph, triggers: FlowTriggerBinding[] | undefined, catalogo?: Map<string, NodeSpec>): FlowNode[] {
  const nodos = graph?.nodes || [];
  const porId = new Map(nodos.map((n) => [n.id, n]));
  const desdeTriggers = (triggers || []).map((t) => porId.get(t.nodeId)).filter((n): n is FlowNode => !!n);
  if (desdeTriggers.length) return desdeTriggers;
  const desdeCatalogo = nodos.filter((n) => catalogo?.get(n.type)?.category === 'trigger');
  if (desdeCatalogo.length) return desdeCatalogo;
  const conEntrada = new Set((graph?.edges || []).map((e) => e.target));
  return nodos.filter((n) => !conEntrada.has(n.id)).slice(0, 1);
}

/** De dónde salen los datos y a dónde llegan, en el orden en que pasan. */
export function recorrido(
  graph: FlowGraph | undefined,
  triggers?: FlowTriggerBinding[],
  catalogo?: Map<string, NodeSpec>,
): { de: SistemaVisible | null; a: SistemaVisible[] } {
  if (!graph || !(graph.nodes || []).length) return { de: null, a: [] };
  const porId = new Map(graph.nodes.map((n) => [n.id, n]));
  const salidas = new Map<string, string[]>();
  for (const e of graph.edges || []) {
    salidas.set(e.source, [...(salidas.get(e.source) || []), e.target]);
  }
  const orden: SistemaVisible[] = [];
  let primerTipo = '';
  const visitados = new Set<string>();
  const cola = pasosIniciales(graph, triggers, catalogo).map((n) => n.id);
  while (cola.length) {
    const id = cola.shift()!;
    if (visitados.has(id)) continue;
    visitados.add(id);
    const tipo = porId.get(id)?.type || '';
    const s = sistemaDePaso(tipo);
    if (s && !orden.length) primerTipo = tipo;
    if (s && !orden.some((o) => o.nombre === s.nombre)) orden.push(s);
    cola.push(...(salidas.get(id) || []));
  }
  // Pasos sueltos (sin conexión) también cuentan.
  for (const n of graph.nodes) {
    const s = sistemaDePaso(n.type);
    if (s && !orden.some((o) => o.nombre === s.nombre)) orden.push(s);
  }
  // Si el primer paso de un sistema ENVÍA (p. ej. "fullpi-orders-push" con horario),
  // los datos salen de Katuq hacia ese sistema, no al revés.
  const envia = /-(push|create|upsert|adjust|update|sync)$/.test(primerTipo) &&
    catalogo?.get(primerTipo)?.category !== 'trigger';
  if (envia && orden[0]?.clave !== 'katuq') {
    const sinKatuq = orden.filter((o) => o.clave !== 'katuq');
    orden.splice(0, orden.length, SISTEMAS['katuq'], ...sinKatuq);
  }
  const de = orden[0] || null;
  const a = orden.slice(1);
  // Toda automatización vive en Katuq: si solo aparece otro sistema (p. ej. un paso
  // de Cereza que trae estados y los escribe en Katuq por dentro), el destino es Katuq.
  if (de && !a.length && de.clave !== 'katuq') a.push(SISTEMAS['katuq']);
  return { de, a };
}

function cadaMinutos(min: number): string {
  if (!min || min < 1) return 'Cada cierto tiempo';
  if (min < 60) return `Cada ${min} min`;
  if (min === 60) return 'Cada hora';
  if (min % 60 === 0) return `Cada ${min / 60} horas`;
  return `Cada ${min} min`;
}

function leerCron(expr: string): string {
  const partes = String(expr || '').trim().split(/\s+/);
  if (partes.length < 5) return 'Con horario fijo';
  const [min, hora, dia, mes, semana] = partes;
  const cadaN = /^\*\/(\d+)$/;
  if (cadaN.test(min) && hora === '*' && dia === '*' && mes === '*' && semana === '*') {
    return cadaMinutos(Number(min.match(cadaN)![1]));
  }
  if (/^\d+$/.test(min) && cadaN.test(hora) && dia === '*' && mes === '*' && semana === '*') {
    return cadaMinutos(Number(hora.match(cadaN)![1]) * 60);
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hora) && dia === '*' && mes === '*') {
    const hh = `${Number(hora)}:${String(Number(min)).padStart(2, '0')}`;
    return semana === '*' ? `Todos los días a las ${hh}` : `Algunos días a las ${hh}`;
  }
  return 'Con horario fijo';
}

/** Cuándo arranca, en una frase corta. */
export function cuandoArranca(
  flow: Pick<FlowSpec, 'graph' | 'triggers'> | FlowTemplate,
  catalogo?: Map<string, NodeSpec>,
): string {
  const graph = flow.graph;
  const triggers = (flow as any).triggers as FlowTriggerBinding[] | undefined;
  const inicio = pasosIniciales(graph, triggers, catalogo)[0];
  const binding = (triggers || [])[0];
  const params = inicio?.params || {};
  const cron = binding?.config?.cronExpression || params.cronExpression;
  const minutos = binding?.config?.intervalMinutes ?? params.intervalMinutes;
  const tipo = binding?.type || (cron ? 'cron' : typeof minutos === 'number' ? 'polling' : undefined);

  if (tipo === 'cron' || cron) return leerCron(cron);
  if (tipo === 'polling' || typeof minutos === 'number') return cadaMinutos(Number(minutos));
  if (tipo === 'webhook' || /webhook|created|updated|event/.test(inicio?.type || '')) {
    const s = sistemaDePaso(inicio?.type || '');
    return s && s.clave !== 'webhook' ? `Cuando ${s.nombre} avisa` : 'Cuando otro sistema avisa';
  }
  if (tipo === 'event') return 'Cuando algo cambia en Katuq';
  if (tipo === 'manual') return 'Solo cuando la corres tú';
  return inicio ? 'Cuando pasa algo' : 'Sin definir';
}

export function textoEstadoAutomatizacion(status: FlowStatus): string {
  return { active: 'Encendida', inactive: 'Apagada', draft: 'Sin terminar', error: 'Con error' }[status] || 'Sin terminar';
}

export function textoEstadoCorrida(status: RunStatus | string | undefined): string {
  const m: { [k: string]: string } = {
    success: 'Bien', partial: 'Con pendientes', failed: 'Falló', running: 'Corriendo', cancelled: 'Cancelada',
  };
  return m[String(status || '')] || 'Sin dato';
}

export function textoMotivo(reason: RunStatusReason | string | undefined): string {
  const m: { [k: string]: string } = {
    node_failed: 'Un paso falló',
    error_port_items: 'Algunos registros no pasaron',
    no_items: 'No había nada nuevo',
    ok: 'Todo pasó',
  };
  return m[String(reason || '')] || '';
}

export function textoOrigenCorrida(triggeredBy: string | undefined): string {
  const t = String(triggeredBy || '').toLowerCase();
  if (t.includes('webhook')) return 'Un aviso del otro sistema';
  if (t.includes('cron') || t.includes('poll') || t.includes('schedule')) return 'La revisión programada';
  if (t.includes('retry')) return 'Un reintento';
  if (t.includes('manual') || t.includes('test')) return 'La corriste tú';
  return 'Arranque automático';
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "hace 5 min", "hoy 15:09", "ayer 10:20" o "12 oct 08:30". */
export function cuandoFue(iso: string | undefined | null): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '';
  const ahora = new Date();
  const min = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  const hh = `${fecha.getHours()}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (mismoDia(fecha, ahora)) return `hoy ${hh}`;
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (mismoDia(fecha, ayer)) return `ayer ${hh}`;
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${hh}`;
}

export function duracionLegible(ms: number | undefined | null): string {
  if (typeof ms !== 'number' || ms < 0) return '';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
  return `${Math.round(ms / 60000)} min`;
}

export function inicialDe(nombre: string): string {
  return (nombre || '?').trim().charAt(0).toUpperCase();
}
