/**
 * Cuentas puras de las escenas del mapa y de la ciudad de "En vivo" (D-386, 5.3/5.10/5.12): alturas,
 * agrupación por ciudad, nombres fijos sin encimarse, tonos de demanda, resolución de ciudades y
 * privacidad de nombres. Sin three ni DOM: se prueban con node suelto.
 */

import { diaDeColombia } from '../servicios/en-vivo-reglas';

// ── Geografía mínima (lo que usan estas cuentas del JSON de Colombia) ─────────

export interface GeoMinimo {
  departamentos: Array<{ dane: string; iso: string; nombre: string; inset?: boolean }>;
  /** DANE → [longitud, latitud, nombre]. */
  ciudades: Record<string, [number, number, string]>;
}

const sinAcentos = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Minúsculas, sin acentos, sin "D.C." ni signos: "Bogotá D.C." y "bogota" son la misma ciudad. */
export function normalizarNombre(s: string | null | undefined): string {
  return sinAcentos(String(s ?? ''))
    .toLowerCase()
    .replace(/\bd\.?\s?c\.?\b/g, ' ')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const indicePorNombre = new WeakMap<object, Map<string, string>>();

function indiceDeNombres(geo: GeoMinimo): Map<string, string> {
  let idx = indicePorNombre.get(geo);
  if (!idx) {
    idx = new Map();
    for (const [dane, c] of Object.entries(geo.ciudades)) idx.set(normalizarNombre(c[2]), dane);
    indicePorNombre.set(geo, idx);
  }
  return idx;
}

/**
 * Código DANE con el que se dibuja algo: el que viene si el mapa lo conoce (ciudad) o al menos
 * conoce su departamento; si no viene, el de la ciudad por su nombre. null = no se puede ubicar.
 */
export function resolverDane(geo: GeoMinimo, dane: string | null | undefined, nombre?: string | null): string | null {
  const d = (dane ?? '').trim();
  if (d && geo.ciudades[d]) return d;
  if (d.length >= 2 && geo.departamentos.some((x) => x.dane === d.slice(0, 2))) return d;
  const porNombre = normalizarNombre(nombre);
  if (porNombre) {
    const hit = indiceDeNombres(geo).get(porNombre);
    if (hit) return hit;
    const depto = geo.departamentos.find((x) => normalizarNombre(x.nombre) === porNombre);
    if (depto) return depto.dane;
  }
  return null;
}

/** Nombre para mostrar de un lugar: el del mapa, o el texto que trajo el pedido, o "Sin ciudad". */
export function nombreDeLugar(geo: GeoMinimo, dane: string | null | undefined, texto?: string | null): string {
  const d = (dane ?? '').trim();
  const c = d ? geo.ciudades[d] : undefined;
  if (c) return c[2].replace(/\s*D\.C\.$/, '');
  if (texto && texto.trim()) return texto.trim();
  const depto = d.length >= 2 ? geo.departamentos.find((x) => x.dane === d.slice(0, 2)) : undefined;
  return depto ? depto.nombre : 'Sin ciudad';
}

// ── Alturas ───────────────────────────────────────────────────────────────────

/** Columna de una ciudad en "Mi país": crece con los pedidos de hoy, con tope. */
export const alturaColumna = (pedidos: number): number => Math.min(5.5, 0.3 + Math.max(0, pedidos) * 0.26);

/** Torre de un comercio en el mapa de Katuq: crece con la raíz de lo vendido (relativo al que más vende). */
export const alturaTorre = (valor: number, maximo: number): number => 0.3 + 2.7 * Math.sqrt(Math.max(0, valor) / Math.max(1, maximo));

/** Edificio de un comercio en la ciudad de Katuq. */
export const alturaEdificio = (valor: number, maximo: number): number => 2.8 + 3.4 * Math.sqrt(Math.max(0, valor) / Math.max(1, maximo));

/** Lo que mide la altura: lo vendido, o los pedidos si "ocultar comercios y montos" está activo (sin dinero). */
export const valorDeAltura = (c: { n: number; ventas: number }, privado: boolean): number => (privado ? c.n : c.ventas);

// ── Comercios: tono, nombre y orden ───────────────────────────────────────────

export const TONOS_COMERCIO: ReadonlyArray<string> = ['accent', 'warn', 'pack', 'ok', 'info', 'slate'];

/** Tono estable de un comercio (el mismo siempre, entre sesiones y escenas). */
export function tonoDeComercio(empresa: string): string {
  let h = 2166136261;
  for (let i = 0; i < empresa.length; i++) { h ^= empresa.charCodeAt(i); h = Math.imul(h, 16777619); }
  return TONOS_COMERCIO[(h >>> 0) % TONOS_COMERCIO.length];
}

/** Letrero corto en mayúsculas para la fachada de un edificio. */
export function letreroDe(nombre: string, maximo = 22): string {
  const limpio = String(nombre ?? '').trim().toUpperCase();
  return limpio.length > maximo ? limpio.slice(0, maximo - 1).trimEnd() + '…' : limpio || 'COMERCIO';
}

/** "Comercio en Medellín" (ocultar comercios y montos); sin ciudad, "Comercio". */
export const nombreOculto = (ciudad: string | null | undefined): string => (ciudad && ciudad.trim() ? `Comercio en ${ciudad.trim()}` : 'Comercio');

export const nombreVisible = (nombre: string, ciudad: string | null | undefined, privado: boolean): string =>
  privado ? nombreOculto(ciudad) : nombre || nombreOculto(ciudad);

export interface ComercioPlano {
  empresa: string;
  nombre: string;
  dane: string | null;
  n: number;
  ventas: number;
}

/** De más a menos vendido (empata por pedidos y por nombre: el orden no baila entre fotos). */
export function ordenarPorVentas<T extends ComercioPlano>(lista: ReadonlyArray<T>): T[] {
  return lista.slice().sort((a, b) => b.ventas - a.ventas || b.n - a.n || a.empresa.localeCompare(b.empresa));
}

/** Comercios por ciudad, cada grupo en orden estable por empresa (para que las torres no cambien de lugar). */
export function agruparPorCiudad<T extends { empresa: string; dane: string | null }>(lista: ReadonlyArray<T>): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const c of lista) {
    if (!c.dane) continue;
    const g = grupos.get(c.dane);
    if (g) g.push(c); else grupos.set(c.dane, [c]);
  }
  grupos.forEach((g) => g.sort((a, b) => a.empresa.localeCompare(b.empresa)));
  return grupos;
}

/** Corrimiento de una torre dentro de su ciudad cuando hay varias: en círculo, a 0.6 del centro. */
export function corrimientoEnCiudad(i: number, n: number): { dx: number; dz: number } {
  const ang = (i / Math.max(1, n)) * Math.PI * 2 + 0.7;
  const r = n > 1 ? 0.6 : 0;
  return { dx: Math.cos(ang) * r, dz: Math.sin(ang) * r };
}

// ── Nombres fijos sin encimarse ───────────────────────────────────────────────

export interface CandidatoNombre {
  id: string;
  /** Con qué se ordena (lo vendido, o los pedidos si es privado). */
  valor: number;
  dane: string;
  x: number;
  z: number;
}

export const NOMBRES_FIJOS = 5;
/** Distancia mínima (unidades del mundo) entre dos nombres fijos: Bogotá e Ibagué quedan más cerca que esto. */
export const DISTANCIA_MINIMA_NOMBRES = 2.3;

/**
 * Los nombres que quedan fijos sobre el mapa: el comercio que más vende de cada ciudad, en las
 * `maximo` ciudades que más venden, y sin que dos queden a menos de `distanciaMinima` (ciudades
 * vecinas: queda el del que más vende y el otro aparece al pasar el puntero).
 */
export function seleccionarNombresFijos<T extends CandidatoNombre>(
  candidatos: ReadonlyArray<T>,
  maximo = NOMBRES_FIJOS,
  distanciaMinima = DISTANCIA_MINIMA_NOMBRES,
): T[] {
  const lider = new Map<string, T>();
  for (const c of candidatos) {
    const actual = lider.get(c.dane);
    if (!actual || c.valor > actual.valor || (c.valor === actual.valor && c.id < actual.id)) lider.set(c.dane, c);
  }
  const lideres = [...lider.values()].sort((a, b) => b.valor - a.valor || (a.id < b.id ? -1 : 1));
  const elegidos: T[] = [];
  for (const c of lideres) {
    if (elegidos.length >= maximo) break;
    if (c.valor <= 0) continue;
    if (elegidos.some((e) => Math.hypot(e.x - c.x, e.z - c.z) < distanciaMinima)) continue;
    elegidos.push(c);
  }
  return elegidos;
}

// ── Demanda por departamento ──────────────────────────────────────────────────

/** Pedidos de hoy por departamento (clave: los 2 primeros dígitos del DANE) a partir de las ciudades. */
export function demandaPorDepartamento(ciudades: ReadonlyArray<{ dane: string; pedidos: number }>): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of ciudades) {
    const k = c.dane.slice(0, 2);
    m.set(k, (m.get(k) ?? 0) + Math.max(0, c.pedidos));
  }
  return m;
}

/** Cuánto del acento se mezcla con el color de la tierra: nada sin pedidos, de 0.10 a 0.58 con ellos. */
export const mezclaDeDemanda = (n: number, maximo: number): number => (n > 0 ? 0.1 + 0.48 * Math.sqrt(n / Math.max(1, maximo)) : 0);

const aRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const t = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(t, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 0, 255];
};

/** Mezcla lineal de dos colores `#rrggbb` (k = 0 es `a`, k = 1 es `b`). */
export function mezclarHex(a: string, b: string, k: number): string {
  const [r0, g0, b0] = aRgb(a);
  const [r1, g1, b1] = aRgb(b);
  const f = Math.min(1, Math.max(0, k));
  const c = (x: number, y: number): string => Math.round(x + (y - x) * f).toString(16).padStart(2, '0');
  return `#${c(r0, r1)}${c(g0, g1)}${c(b0, b1)}`;
}

/** Los cuatro tonos de la leyenda de demanda (de menos a más pedidos). */
export function coloresDeLeyenda(tierra: string, acento: string): string[] {
  return [1, 2, 3, 4].map((i) => mezclarHex(tierra, acento, mezclaDeDemanda(i, 4)));
}

// ── Pedidos de hoy por ciudad (Mi país) ───────────────────────────────────────

export interface PedidoParaMapa {
  id: string;
  tC: number | null;
  cancelado: boolean;
  dane?: string | null;
  ciudad: string | null;
}

/**
 * Pedidos de hoy por ciudad. Los cancelados y rechazados no cuentan; los que no se pueden ubicar
 * van aparte (cuentan en las cifras, no se dibujan).
 */
export function contarPedidosDeHoy(
  geo: GeoMinimo,
  pedidos: ReadonlyArray<PedidoParaMapa>,
  dia: string,
): { porCiudad: Map<string, number>; porPedido: Map<string, string>; sinCiudad: number; total: number } {
  const porCiudad = new Map<string, number>();
  const porPedido = new Map<string, string>();
  let sinCiudad = 0;
  let total = 0;
  for (const p of pedidos) {
    if (p.cancelado) continue;
    if (p.tC === null || p.tC === undefined || diaDeColombia(p.tC) !== dia) continue;
    total++;
    const dane = resolverDane(geo, p.dane, p.ciudad);
    if (!dane) { sinCiudad++; continue; }
    porCiudad.set(dane, (porCiudad.get(dane) ?? 0) + 1);
    porPedido.set(p.id, dane);
  }
  return { porCiudad, porPedido, sinCiudad, total };
}

/** La ciudad con más pedidos (la bodega, si nadie dice cuál es). Empata por código para que no cambie. */
export function ciudadConMasPedidos(porCiudad: ReadonlyMap<string, number>): string | null {
  let mejor: string | null = null;
  let n = -1;
  porCiudad.forEach((v, k) => { if (v > n || (v === n && mejor !== null && k < mejor)) { mejor = k; n = v; } });
  return mejor;
}

// ── Ráfagas ────────────────────────────────────────────────────────────────────

/**
 * Detecta una ráfaga de eventos: con más de `umbral` en `ventanaMs`, los siguientes se dibujan en
 * "modo ligero" (pulso sin tarjeta, sin arcos ni confeti). El reloj entra por parámetro.
 */
export class DetectorRafaga {
  private readonly marcas: number[] = [];

  constructor(private readonly umbral = 10, private readonly ventanaMs = 1000) {}

  /** Registra un evento y dice si ya es una ráfaga. */
  registrar(ahoraMs: number): boolean {
    this.marcas.push(ahoraMs);
    while (this.marcas.length && ahoraMs - this.marcas[0] > this.ventanaMs) this.marcas.shift();
    return this.marcas.length > this.umbral;
  }

  limpiar(): void {
    this.marcas.length = 0;
  }
}

// ── Cámara automática ──────────────────────────────────────────────────────────

export interface AccionesCamara {
  enfocar: (x: number, y: number, z: number, zoom: number) => void;
  soltar: () => void;
  /** Gira la cámara `rad` radianes respecto de donde estaba. */
  girar: (rad: number) => void;
}

/** Cuánto dura un foco y cuánto antes de que acabe puede reemplazarlo otro evento. */
export const FOCO_MS = 4200;
export const FOCO_REEMPLAZO_MS = 2400;

/**
 * Cámara automática del modo pantalla: un vaivén lento y un foco breve donde pasó algo. Con
 * "reducir movimiento" o apagada no hace nada. El reloj entra por parámetro (se prueba suelto).
 */
export class CamaraAutomatica {
  private activa = false;
  private focoHasta = 0;
  private enFoco = false;
  private giroActual = 0;

  constructor(private readonly acciones: AccionesCamara) {}

  get encendida(): boolean {
    return this.activa;
  }

  fijar(activa: boolean): void {
    if (this.activa === activa) return;
    this.activa = activa;
    if (!activa) this.apagar();
  }

  private apagar(): void {
    if (this.giroActual) { this.acciones.girar(-this.giroActual); this.giroActual = 0; }
    if (this.enFoco) { this.acciones.soltar(); this.enFoco = false; }
    this.focoHasta = 0;
  }

  /** Mira (con zoom) al lugar donde pasó algo, si no hay un foco reciente que cortar. */
  enfocar(x: number, y: number, z: number, zoom: number, ahoraMs: number, reducir: boolean): void {
    if (!this.activa || reducir) return;
    if (ahoraMs < this.focoHasta - FOCO_REEMPLAZO_MS) return;
    this.acciones.enfocar(x, y, z, zoom);
    this.enFoco = true;
    this.focoHasta = ahoraMs + FOCO_MS;
  }

  /** Un cuadro: el vaivén y soltar el foco cuando se cumple su tiempo. `t` en segundos. */
  paso(t: number, ahoraMs: number, reducir: boolean): void {
    if (!this.activa || reducir) return;
    const objetivo = Math.sin(t * 0.07) * 0.3;
    const d = objetivo - this.giroActual;
    if (Math.abs(d) > 0.0004) { this.acciones.girar(d); this.giroActual = objetivo; }
    if (this.enFoco && ahoraMs > this.focoHasta) { this.acciones.soltar(); this.enFoco = false; }
  }
}

// ── Salidas agrupadas (un vehículo con "N pedidos") ───────────────────────────

export interface GrupoSalida<T> {
  clave: string;
  items: T[];
}

/**
 * Junta las salidas de un mismo transportador que llegan casi juntas (el despacho masivo) para
 * dibujarlas como una sola: un arco por destino y una etiqueta "N pedidos". Una salida espera
 * `ventanaMs` por si llegan hermanas. El reloj entra por parámetro.
 */
export class AgrupadorSalidas<T> {
  private readonly pendientes = new Map<string, { desde: number; items: T[] }>();

  constructor(private readonly ventanaMs = 600) {}

  get cantidad(): number {
    return this.pendientes.size;
  }

  agregar(clave: string, item: T, ahoraMs: number): void {
    const g = this.pendientes.get(clave);
    if (g) g.items.push(item);
    else this.pendientes.set(clave, { desde: ahoraMs, items: [item] });
  }

  /** Los grupos que ya cumplieron su ventana (o todos con `todos`); salen de la espera. */
  sacar(ahoraMs: number, todos = false): Array<GrupoSalida<T>> {
    const listos: Array<GrupoSalida<T>> = [];
    this.pendientes.forEach((g, clave) => {
      if (todos || ahoraMs - g.desde >= this.ventanaMs) {
        listos.push({ clave, items: g.items });
        this.pendientes.delete(clave);
      }
    });
    return listos;
  }

  limpiar(): void {
    this.pendientes.clear();
  }
}

/** Clave de agrupación de una salida: quién la lleva (mensajero o transportadora) y de qué comercio. */
export function claveDeSalida(
  comercio: string | null | undefined,
  tipo: string | null | undefined,
  transportador: string | null | undefined,
): string {
  const nombre = (transportador ?? '').trim().toLowerCase();
  return `${comercio ?? ''}|${tipo === 'transportadora' ? 'transportadora' : 'mensajero'}|${nombre}`;
}

// ── Alertas del radar sobre los comercios ─────────────────────────────────────

export interface AlertaParaAnillo {
  sev: number;
  tono: string;
  comercio: string | null;
  empresa?: string;
}

/**
 * Tono del anillo de alerta de cada comercio: la alerta más grave (mayor `sev`) que lo señala. Una
 * alerta se asigna por `empresa`; si no la trae, por el nombre del comercio. Devuelve empresa → tono
 * en el vocabulario del tema (`bad`, `warn`...). Se ignoran las informativas (sev 1).
 */
export function alertasPorComercio(
  alertas: ReadonlyArray<AlertaParaAnillo> | null | undefined,
  comercios: ReadonlyArray<{ empresa: string; nombre: string }>,
  tonoCss: (tono: string) => string,
): Map<string, string> {
  const salida = new Map<string, string>();
  const gravedad = new Map<string, number>();
  const porNombre = new Map<string, string>();
  for (const c of comercios) porNombre.set(normalizarNombre(c.nombre), c.empresa);
  for (const a of alertas ?? []) {
    if (!a || a.sev < 2) continue;
    const empresa = a.empresa && comercios.some((c) => c.empresa === a.empresa)
      ? a.empresa
      : porNombre.get(normalizarNombre(a.comercio));
    if (!empresa) continue;
    if ((gravedad.get(empresa) ?? 0) >= a.sev) continue;
    gravedad.set(empresa, a.sev);
    salida.set(empresa, tonoCss(a.tono));
  }
  return salida;
}

// ── Comercios que dibujan las escenas de Katuq ────────────────────────────────

/** Un comercio tal como lo dibujan las escenas de Katuq (sale de `cifrasGlobal.comercios`). */
export interface ComercioDibujo {
  empresa: string;
  nombre: string;
  /** Código DANE de la ciudad del comercio, ya resuelto contra el mapa (null = no se puede ubicar). */
  dane: string | null;
  /** Nombre de su ciudad (para "Comercio en <ciudad>"). */
  ciudad: string;
  n: number;
  ventas: number;
  tono: string;
}

export interface ComercioDeCifras {
  empresa: string;
  nombre: string;
  ciudad: string | null;
  dane: string | null;
  n: number;
  ventas: number;
}

/** Los comercios de las cifras de toda Katuq, con su ciudad resuelta contra el mapa y su tono estable. */
export function prepararComercios(geo: GeoMinimo, comercios: ReadonlyArray<ComercioDeCifras>): ComercioDibujo[] {
  return comercios.map((c) => {
    const dane = resolverDane(geo, c.dane, c.ciudad);
    return {
      empresa: c.empresa,
      nombre: (c.nombre || '').trim() || c.empresa,
      dane,
      ciudad: nombreDeLugar(geo, dane, c.ciudad),
      n: c.n,
      ventas: c.ventas,
      tono: tonoDeComercio(c.empresa),
    };
  });
}

/** Cuántos comercios dibuja cada escena: los que más venden (la ciudad tiene 16 lotes; el país admite más torres). */
export const MAX_TORRES = 80;
export const MAX_EDIFICIOS = 16;

// ── Lotes de la ciudad de Katuq ───────────────────────────────────────────────

/**
 * Qué comercio ocupa cada lote de la ciudad. Los que ya tenían lote lo conservan (el edificio no
 * "baila" cuando cambia el orden de ventas); los que entran toman los lotes que quedaron libres, en
 * orden de ventas. `elegidos` ya viene de más a menos vendido y recortado al número de lotes.
 */
export function asignarLotes(previo: ReadonlyMap<string, number>, elegidos: ReadonlyArray<{ empresa: string }>, lotes = MAX_EDIFICIOS): Map<string, number> {
  const salida = new Map<string, number>();
  const ocupados = new Set<number>();
  for (const c of elegidos) {
    const s = previo.get(c.empresa);
    if (s !== undefined && s >= 0 && s < lotes && !ocupados.has(s)) { salida.set(c.empresa, s); ocupados.add(s); }
  }
  let libre = 0;
  for (const c of elegidos) {
    if (salida.has(c.empresa)) continue;
    while (libre < lotes && ocupados.has(libre)) libre++;
    if (libre >= lotes) break;
    salida.set(c.empresa, libre);
    ocupados.add(libre);
  }
  return salida;
}
