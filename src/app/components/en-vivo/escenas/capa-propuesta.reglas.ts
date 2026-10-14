import type {
  ColorEscena,
  EfectoEscena,
  GrupoEnEscena,
  PropuestaEnEscena,
} from '../propuestas/propuestas.modelos';

/**
 * Reglas puras del ENSAYO de una propuesta de Opttia en la escena "Mi operación" (D-421, fase 1):
 * dónde se juntan los montones, cómo se pone la fila de producción, qué pedidos llevan la moneda,
 * de qué color va cada grupo, los topes y los puntos de la línea punteada. Sin three, sin Angular y
 * sin DOM: se prueba con node suelto. La capa 3D (`capa-propuesta.ts`) solo dibuja lo que esto decide.
 *
 * El ensayo no mueve nada real: son copias fantasma, anillos y líneas. Las cajas de verdad se quedan
 * en su estación hasta que llegan los eventos reales del canal en vivo.
 */

export interface Punto2 {
  x: number;
  z: number;
}

export interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/** A lo sumo 6 grupos (montones) a la vez: más se vuelve ruido. */
export const MAX_GRUPOS_ENSAYO = 6;
/** A lo sumo 40 copias fantasma en toda la escena. */
export const MAX_FANTASMAS = 40;
/** La fila de producción muestra a lo sumo 12 pedidos (lo mismo que manda el servidor). */
export const MAX_FILA = 12;
/** Cuánto dura el ensayo completo (s): después todo queda quieto, sin bucle. */
export const DURACION_ENSAYO_S = 2.5;
/** Cuánto tarda cada copia en llegar a su lugar (s). */
export const VUELO_FANTASMA_S = 0.9;
/** Espera máxima entre la salida de una copia y la siguiente (s). */
const ESCALON_MAX_S = 0.12;

/** Tamaño de una copia en el montón y en la fila (la caja real mide 0.86 × 0.72 × 0.86). */
export const ESCALA_MONTON = 0.66;
export const ESCALA_FILA = 0.8;
const ALTO_CAJA = 0.72;
const PASO_MONTON = 0.62;
/** Copias por capa de un montón (3 × 3). */
const POR_CAPA = 9;

/** Los colores que puede llevar un grupo (tokens del tema de En vivo). */
export const COLORES_GRUPO: ReadonlyArray<ColorEscena> = ['accent', 'info', 'pack', 'ok', 'warn', 'bad'];
/** Si el servidor no manda color: las chaquetas de las motos, en orden. */
const RESPALDO_MONTONES: ReadonlyArray<ColorEscena> = ['accent', 'info', 'pack', 'ok'];
/** Producción y cobro, si no traen color. */
const RESPALDO_FILA: ColorEscena = 'warn';
const RESPALDO_MONEDA: ColorEscena = 'warn';
/** Moneda: a lo sumo 6 cajas con aro y "$". */
const MAX_MONEDAS = 6;

/** Lugares fijos del mundo que usa el ensayo (la capa los arma desde `operacion.mundo`). */
export interface AnclasEnsayo {
  /** Primer montón de mensajero, frente al PICK; los demás siguen en fila con `pasoMontones`. */
  montones: Punto2;
  pasoMontones: number;
  /** Montón de la primera transportadora, frente al camión (las demás van con los de mensajero). */
  camion: Punto2;
  /** Primera copia de la fila de producción, frente a la banda; las demás siguen con `pasoFila`. */
  fila: Punto2;
  pasoFila: number;
}

/** Cómo sigue la línea punteada de un grupo. */
export type RutaGrupo = 'moto' | 'camion' | 'flecha' | 'casa';

export interface GrupoEnsayo {
  /** Id del grupo (el que entiende la tarjeta al tocar el montón). */
  id: string;
  color: ColorEscena;
  /** Centro del montón o de la fila; null en la moneda (el aro va sobre cada caja). */
  centro: Punto2 | null;
  /** Radio del aro que rodea el montón; 0 = sin aro. */
  radio: number;
  /** Zona que se puede tocar (alrededor de `centro`); null = no se toca. */
  golpe: { ancho: number; fondo: number } | null;
  /** Todos los pedidos del grupo (anillos finos bajo las cajas reales). */
  pedidos: string[];
  /** Cuántas copias fantasma lleva, ya con los topes. */
  fantasmas: number;
  /** Nombre del mensajero (moto) o de la transportadora (camión). */
  veh: string | null;
  transportadora: boolean;
  /** Texto de la etiqueta del montón ("Carlos · 4"); null = sin etiqueta. */
  etiqueta: string | null;
  ruta: RutaGrupo;
  /** El pedido cuya casa simbólica cierra la línea (la misma a la que irá la moto); null = no hay casa. */
  pedidoCasa: string | null;
  /** Alto del montón (para poner la etiqueta encima). */
  alto: number;
}

export interface FantasmaEnsayo {
  pedidoId: string;
  /** Índice del grupo en `PlanEnsayo.grupos`. */
  grupo: number;
  destino: Punto3;
  escala: number;
  /** Número que lleva encima (fila de producción: 1..N); null = sin número. */
  numero: number | null;
  /** Cuándo sale (s desde que empieza el ensayo). */
  retraso: number;
}

export interface PlanEnsayo {
  id: string;
  efecto: EfectoEscena;
  grupos: GrupoEnsayo[];
  fantasmas: FantasmaEnsayo[];
  /** Pedidos que NO se atenúan: todos los de la propuesta. */
  destacados: string[];
  /**
   * Pedidos cuya caja real lleva un anillo del color del grupo (a lo sumo `MAX_FANTASMAS`): fino
   * (`aro: false`) o el aro grande del cobro (`aro: true`).
   */
  anillados: Array<{ pedidoId: string; grupo: number; aro: boolean }>;
}

/** Lo mínimo de la propuesta que el ensayo usa. */
export type PropuestaEnsayo = Pick<PropuestaEnEscena, 'id' | 'efecto' | 'pedidos' | 'grupos'>;

/** Color de la chaqueta de la moto que lleva el grupo (null = no hay moto en la escena). */
export type ChaquetaDe = (grupo: GrupoEnEscena) => string | null;

// ── utilidades ──────────────────────────────────────────────────────────────

export const limitar = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function esColorGrupo(c: unknown): c is ColorEscena {
  return typeof c === 'string' && (COLORES_GRUPO as ReadonlyArray<string>).includes(c);
}

/**
 * Color de un grupo: el de la chaqueta de la moto que lo llevará (así el anillo y la moto se ven
 * iguales); si no hay moto, el que mandó el servidor; si tampoco, el de respaldo.
 */
export function colorDeGrupo(color: string | null | undefined, chaqueta: string | null | undefined, respaldo: ColorEscena): ColorEscena {
  if (esColorGrupo(chaqueta)) return chaqueta;
  if (esColorGrupo(color)) return color;
  return respaldo;
}

/** "1234567 - Carlos Pérez" → "Carlos" (como lo rotula la moto). */
export function nombreCorto(nombre: string | null | undefined): string {
  const limpio = String(nombre ?? '')
    .replace(/^\s*\d{6,}\s*-\s*/, '')
    .replace(/\s*-\s*\d{6,}\s*$/, '')
    .trim();
  return limpio.split(/\s+/)[0] ?? '';
}

const cuantos = (n: number): string => `${n} ${n === 1 ? 'pedido' : 'pedidos'}`;

/** Lo que dice la etiqueta del montón: "Carlos · 4", "Coordinadora · 2" o "3 pedidos". */
export function etiquetaDeGrupo(g: Pick<GrupoEnEscena, 'veh' | 'transportadora'>, n: number): string {
  const veh = String(g.veh ?? '').trim();
  if (g.transportadora) return `${veh || 'Transportadora'} · ${n}`;
  const corto = nombreCorto(veh);
  return corto ? `${corto} · ${n}` : cuantos(n);
}

/**
 * Reparte `max` copias entre grupos por turnos (una a cada uno, y otra vuelta): así ningún grupo
 * queda sin copias cuando hay muchos pedidos.
 */
export function repartir(tamanos: ReadonlyArray<number>, max: number): number[] {
  const out = tamanos.map(() => 0);
  let quedan = Math.max(0, Math.floor(max));
  let avanzo = true;
  while (quedan > 0 && avanzo) {
    avanzo = false;
    for (let g = 0; g < tamanos.length && quedan > 0; g++) {
      if (out[g] < Math.max(0, tamanos[g])) {
        out[g]++;
        quedan--;
        avanzo = true;
      }
    }
  }
  return out;
}

/** Filas y columnas de una capa de `n` copias (a lo sumo 3 × 3), centradas. */
function rejilla(n: number): { cols: number; filas: number } {
  const enCapa = Math.max(1, Math.min(POR_CAPA, n));
  const cols = Math.min(3, enCapa);
  return { cols, filas: Math.ceil(enCapa / cols) };
}

/** Dónde va la copia `i` de un montón de `n` (centrado sobre `centro`, en capas de 3 × 3). */
export function lugarEnMonton(centro: Punto2, i: number, n: number): Punto3 {
  const capa = Math.floor(i / POR_CAPA);
  const enEstaCapa = Math.min(POR_CAPA, n - capa * POR_CAPA);
  const { cols, filas } = rejilla(enEstaCapa);
  const j = i - capa * POR_CAPA;
  const col = j % cols;
  const fila = Math.floor(j / cols);
  const alto = ALTO_CAJA * ESCALA_MONTON;
  return {
    x: centro.x + (col - (cols - 1) / 2) * PASO_MONTON,
    y: alto / 2 + capa * (alto + 0.02),
    z: centro.z + (fila - (filas - 1) / 2) * PASO_MONTON,
  };
}

/** Radio del aro que rodea un montón de `n` copias. */
export function radioMonton(n: number): number {
  const { cols, filas } = rejilla(n);
  return (Math.max(cols, filas) * PASO_MONTON) / 2 + 0.42;
}

/** Alto de un montón de `n` copias. */
export function altoMonton(n: number): number {
  const capas = Math.max(1, Math.ceil(n / POR_CAPA));
  return capas * (ALTO_CAJA * ESCALA_MONTON + 0.02);
}

/** Dónde va la copia `i` de la fila de producción. */
export function lugarEnFila(inicio: Punto2, paso: number, i: number): Punto3 {
  return { x: inicio.x + i * paso, y: (ALTO_CAJA * ESCALA_FILA) / 2, z: inicio.z };
}

/** Cuándo sale cada copia: escalonadas para que todo el ensayo quepa en `DURACION_ENSAYO_S`. */
export function retrasoDe(j: number, total: number): number {
  if (total <= 1) return 0;
  const escalon = Math.min(ESCALON_MAX_S, (DURACION_ENSAYO_S - VUELO_FANTASMA_S) / (total - 1));
  return j * escalon;
}

/** Avance (0..1) de una copia en su vuelo. Con "reducir movimiento" ya está en su lugar. */
export function avanceFantasma(reloj: number, retraso: number, reducir: boolean): number {
  if (reducir) return 1;
  return limitar((reloj - retraso) / VUELO_FANTASMA_S, 0, 1);
}

/** Los grupos de la propuesta; si no trae, uno solo con todos sus pedidos. */
function gruposDe(p: PropuestaEnsayo, respaldo: ColorEscena): GrupoEnEscena[] {
  const conPedidos = (p.grupos ?? []).filter((g) => g && Array.isArray(g.pedidos) && g.pedidos.length > 0);
  if (conPedidos.length) return conPedidos;
  const pedidos = (p.pedidos ?? []).filter((x) => !!x);
  return pedidos.length ? [{ id: p.id, pedidos, veh: null, transportadora: false, color: respaldo }] : [];
}

function sinRepetir(ids: ReadonlyArray<string>): string[] {
  return [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))];
}

// ── un armador por efecto (registro cerrado, sin if/else por tipo) ──────────

type Armador = (p: PropuestaEnsayo, chaquetaDe: ChaquetaDe, anclas: AnclasEnsayo) => PlanEnsayo;

/** Despachos: un montón por grupo frente al PICK (o frente al camión si es de transportadora). */
const armarMontones: Armador = (p, chaquetaDe, anclas) => {
  const fuente = gruposDe(p, RESPALDO_MONTONES[0]).slice(0, MAX_GRUPOS_ENSAYO);
  const reparto = repartir(fuente.map((g) => sinRepetir(g.pedidos).length), MAX_FANTASMAS);
  let enFila = 0;
  let camionUsado = false;
  const grupos: GrupoEnsayo[] = fuente.map((g, k) => {
    const pedidos = sinRepetir(g.pedidos);
    let centro: Punto2;
    if (g.transportadora && !camionUsado) {
      centro = { x: anclas.camion.x, z: anclas.camion.z };
      camionUsado = true;
    } else {
      centro = { x: anclas.montones.x + enFila * anclas.pasoMontones, z: anclas.montones.z };
      enFila++;
    }
    const chaqueta = g.transportadora ? null : chaquetaDe(g);
    const radio = radioMonton(Math.max(1, reparto[k]));
    return {
      id: g.id,
      color: colorDeGrupo(g.color, chaqueta, RESPALDO_MONTONES[k % RESPALDO_MONTONES.length]),
      centro,
      radio,
      golpe: { ancho: radio * 2, fondo: radio * 2 },
      pedidos,
      fantasmas: reparto[k],
      veh: g.veh ? String(g.veh) : null,
      transportadora: !!g.transportadora,
      etiqueta: etiquetaDeGrupo(g, pedidos.length),
      ruta: g.transportadora ? 'camion' : 'moto',
      pedidoCasa: g.transportadora ? null : pedidos[0] ?? null,
      alto: altoMonton(reparto[k]),
    };
  });
  const total = reparto.reduce((a, b) => a + b, 0);
  const fantasmas: FantasmaEnsayo[] = [];
  grupos.forEach((g, k) => {
    for (let i = 0; i < g.fantasmas; i++) {
      fantasmas.push({
        pedidoId: g.pedidos[i],
        grupo: k,
        destino: lugarEnMonton(g.centro as Punto2, i, g.fantasmas),
        escala: ESCALA_MONTON,
        numero: null,
        retraso: retrasoDe(fantasmas.length, total),
      });
    }
  });
  return cerrarPlan(p, 'montones', grupos, fantasmas, false);
};

/** Producción: copias numeradas en fila frente a la banda, con una flecha a "En producción". */
const armarFila: Armador = (p, _chaquetaDe, anclas) => {
  const fuente = gruposDe(p, RESPALDO_FILA);
  if (!fuente.length) return cerrarPlan(p, 'fila', [], [], false);
  const pedidos = sinRepetir(fuente.flatMap((g) => g.pedidos)).slice(0, Math.min(MAX_FILA, MAX_FANTASMAS));
  const n = pedidos.length;
  const primero = lugarEnFila(anclas.fila, anclas.pasoFila, 0);
  const ultimo = lugarEnFila(anclas.fila, anclas.pasoFila, Math.max(0, n - 1));
  const grupo: GrupoEnsayo = {
    id: fuente[0].id,
    color: colorDeGrupo(fuente[0].color, null, RESPALDO_FILA),
    centro: { x: (primero.x + ultimo.x) / 2, z: anclas.fila.z },
    radio: 0,
    golpe: { ancho: Math.abs(ultimo.x - primero.x) + anclas.pasoFila + 0.4, fondo: 1.3 },
    pedidos,
    fantasmas: n,
    veh: null,
    transportadora: false,
    etiqueta: null,
    ruta: 'flecha',
    pedidoCasa: null,
    alto: ALTO_CAJA * ESCALA_FILA,
  };
  const fantasmas: FantasmaEnsayo[] = pedidos.map((id, i) => ({
    pedidoId: id,
    grupo: 0,
    destino: lugarEnFila(anclas.fila, anclas.pasoFila, i),
    escala: ESCALA_FILA,
    numero: i + 1,
    retraso: retrasoDe(i, n),
  }));
  return cerrarPlan(p, 'fila', [grupo], fantasmas, false);
};

/** Cobro: un aro con "$" sobre cada caja sin pago (sin copias) y una línea hasta su casa. */
const armarMoneda: Armador = (p) => {
  const fuente = gruposDe(p, RESPALDO_MONEDA).slice(0, MAX_GRUPOS_ENSAYO);
  let quedan = MAX_MONEDAS;
  const grupos: GrupoEnsayo[] = [];
  for (const g of fuente) {
    if (quedan <= 0) break;
    const pedidos = sinRepetir(g.pedidos).slice(0, quedan);
    quedan -= pedidos.length;
    grupos.push({
      id: g.id,
      color: colorDeGrupo(g.color, null, RESPALDO_MONEDA),
      centro: null,
      radio: 0,
      golpe: null,
      pedidos,
      fantasmas: 0,
      veh: null,
      transportadora: false,
      etiqueta: '$',
      ruta: 'casa',
      pedidoCasa: pedidos[0] ?? null,
      alto: 0,
    });
  }
  return cerrarPlan(p, 'moneda', grupos, [], true);
};

function cerrarPlan(p: PropuestaEnsayo, efecto: EfectoEscena, grupos: GrupoEnsayo[], fantasmas: FantasmaEnsayo[], aro: boolean): PlanEnsayo {
  const destacados = sinRepetir([...(p.pedidos ?? []), ...grupos.flatMap((g) => g.pedidos)]);
  const anillados: PlanEnsayo['anillados'] = [];
  grupos.forEach((g, k) => g.pedidos.forEach((id) => {
    if (anillados.length < MAX_FANTASMAS && !anillados.some((a) => a.pedidoId === id)) anillados.push({ pedidoId: id, grupo: k, aro });
  }));
  return { id: p.id, efecto, grupos, fantasmas, destacados, anillados };
}

const ARMADORES: Readonly<Record<EfectoEscena, Armador>> = {
  montones: armarMontones,
  fila: armarFila,
  moneda: armarMoneda,
};

/**
 * El plan del ensayo de una propuesta: grupos (con color, lugar, etiqueta y ruta), copias fantasma
 * (con destino, escala, número y retraso) y qué pedidos quedan sin atenuar. null si el efecto no se
 * conoce o la propuesta no trae pedidos.
 */
export function armarEnsayo(p: PropuestaEnsayo | null | undefined, chaquetaDe: ChaquetaDe, anclas: AnclasEnsayo): PlanEnsayo | null {
  if (!p) return null;
  const armar = ARMADORES[p.efecto];
  if (!armar) return null;
  const plan = armar(p, chaquetaDe, anclas);
  return plan.grupos.length ? plan : null;
}

// ── rutas y puntos de la línea ──────────────────────────────────────────────

/** Lugares del mundo por donde pasan las líneas (carril de salida y parqueo frente a las casas). */
export interface LugaresRuta {
  /** z del carril por donde salen las motos. */
  carrilZ: number;
  /** x por donde se sale de la escena. */
  salidaX: number;
  /** Corrimiento en x del parqueo frente a la casa y su z. */
  parqueoDx: number;
  parqueoZ: number;
}

/**
 * Ruta de la línea de un montón: hasta la moto (o el camión) y, si hay casa, por el carril hasta
 * la casa simbólica (el mismo camino que hará la moto). Sin vehículo a la vista, va hacia la salida.
 */
export function rutaMonton(desde: Punto2, veh: Punto2 | null, casa: Punto2 | null, l: LugaresRuta): Punto2[] {
  if (!veh) return [desde, { x: desde.x, z: l.carrilZ }, { x: l.salidaX, z: l.carrilZ }];
  if (!casa) return [desde, veh];
  const x = casa.x + l.parqueoDx;
  return [desde, veh, { x: veh.x, z: l.carrilZ }, { x, z: l.carrilZ }, { x, z: l.parqueoZ }];
}

/** Ruta de la caja a su casa (cobro): por el carril, como iría la moto. */
export function rutaACasa(desde: Punto2, casa: Punto2 | null, l: LugaresRuta): Punto2[] {
  if (!casa) return [];
  const x = casa.x + l.parqueoDx;
  return [desde, { x: desde.x, z: l.carrilZ }, { x, z: l.carrilZ }, { x, z: l.parqueoZ }];
}

/** Flecha de producción: por la banda desde "Sin producir" hasta "En producción" y entra a la estación. */
export function rutaFlecha(desde: Punto2, hasta: Punto2, bandaZ: number, finZ: number): Punto2[] {
  return [{ x: desde.x, z: bandaZ }, { x: hasta.x, z: bandaZ }, { x: hasta.x, z: finZ }];
}

export function largoRuta(ruta: ReadonlyArray<Punto2>): number {
  let L = 0;
  for (let i = 1; i < ruta.length; i++) L += Math.hypot(ruta[i].x - ruta[i - 1].x, ruta[i].z - ruta[i - 1].z);
  return L;
}

/**
 * Puntos de una línea punteada a lo largo de `ruta`, cada `paso` (si no caben `max`, se separan
 * más). Escribe x,z en `out` (sin crear objetos) y devuelve cuántos puso.
 */
export function puntosAlCamino(ruta: ReadonlyArray<Punto2>, paso: number, max: number, out: Float32Array): number {
  const cap = Math.min(Math.max(0, Math.floor(max)), Math.floor(out.length / 2));
  if (ruta.length < 2 || cap <= 0) return 0;
  const L = largoRuta(ruta);
  if (L < 1e-6) return 0;
  const p = Math.max(paso, L / cap);
  let n = 0;
  let d = p / 2;
  let seg = 1;
  let acum = 0;
  let largo = Math.hypot(ruta[1].x - ruta[0].x, ruta[1].z - ruta[0].z);
  while (d <= L && n < cap) {
    while (d > acum + largo && seg < ruta.length - 1) {
      acum += largo;
      seg++;
      largo = Math.hypot(ruta[seg].x - ruta[seg - 1].x, ruta[seg].z - ruta[seg - 1].z);
    }
    const a = ruta[seg - 1];
    const b = ruta[seg];
    const t = largo > 1e-9 ? limitar((d - acum) / largo, 0, 1) : 0;
    out[2 * n] = a.x + (b.x - a.x) * t;
    out[2 * n + 1] = a.z + (b.z - a.z) * t;
    n++;
    d += p;
  }
  return n;
}
