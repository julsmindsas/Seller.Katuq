/**
 * Rutero de Envíos (openspec `rutero-envios`, fase 1). Funciones puras, sin I/O: con los mismos
 * pedidos y opciones sale la misma ruta.
 *
 * Método (el usual en ruteo de última milla): «agrupar primero, rutear después».
 *  1. Reparto: barrido angular desde el punto de salida, cortando en el hueco más grande, en
 *     grupos parejos (tope de paradas por ruta).
 *  2. Orden: las franjas de entrega mandan (urgente, luego la que vence antes). Dentro de cada
 *     franja, vecino más cercano y mejora 2-opt. Lo que no tiene franja se intercala donde menos
 *     recorrido agrega (inserción más barata).
 *  3. Distancia en línea recta (haversine) por un factor urbano; el tiempo sale de una velocidad
 *     media y unos minutos por parada. Es un estimado: no conoce calles ni tráfico.
 */

export interface Punto { lat: number; lng: number; }

export interface FranjaRutero {
  clave: string;
  inicioMin: number | null;
  finMin: number | null;
  urgente: boolean;
  etiqueta: string;
}

export interface ParadaRutero extends Punto {
  id: string;
  cliente: string;
  direccion: string;
  estado: string;
  franja: FranjaRutero;
  porCobrar: number;
  zona?: string;
  /** Celular de quien recibe; solo para el enlace «Avisar» del navegador. Nunca va a Opttia. */
  telefono?: string;
}

export interface OpcionesRutero {
  salida: Punto;
  rutas: number;
  /** Tope de paradas por ruta; 0 = sin tope. */
  maxParadas: number;
  velocidadKmh: number;
  minutosPorParada: number;
  factorUrbano: number;
  /** Minuto del día en que salen (540 = 9:00 a. m.). */
  horaSalidaMin: number;
  regresa: boolean;
}

export interface ParadaEnRuta extends ParadaRutero {
  /** Minuto del día estimado de llegada. */
  llegadaMin: number;
  /** Llega después de que cierra su franja. */
  tarde: boolean;
  /** Minutos de espera si llega antes de que abra su franja. */
  esperaMin: number;
  kmDesdeAnterior: number;
}

export interface RutaRutero {
  id: string;
  nombre: string;
  color: string;
  paradas: ParadaEnRuta[];
  km: number;
  minutos: number;
  porCobrar: number;
  tarde: number;
  finMin: number;
}

export interface ResultadoRutero {
  rutas: RutaRutero[];
  /** Paradas que no cupieron por el tope. */
  sinRuta: ParadaRutero[];
}

export const OPCIONES_POR_DEFECTO: Omit<OpcionesRutero, 'salida'> = {
  rutas: 1,
  maxParadas: 0,
  velocidadKmh: 22,
  minutosPorParada: 6,
  factorUrbano: 1.3,
  horaSalidaMin: 9 * 60,
  regresa: true,
};

/** Colores de ruta: acento del sistema de diseño y semánticos; ninguno de los primarios prohibidos. */
export const COLORES_RUTA = ['#5F3FE0', '#1E874B', '#D9820A', '#C2255C', '#0B7285', '#8E27B0', '#A0522D', '#5A6B78', '#2F9E44', '#E8590C'];

const SIN_FRANJA: FranjaRutero = { clave: 'sin-franja', inicioMin: null, finMin: null, urgente: false, etiqueta: 'Sin franja' };
const URGENTE: FranjaRutero = { clave: 'urgente', inicioMin: null, finMin: null, urgente: true, etiqueta: 'Lo antes posible' };
const PALABRAS_URGENCIA = /\b(MAS PRONTO|LO ANTES POSIBLE|LO MAS RAPIDO|INMEDIAT\w*|URGENTE|YA MISMO|DE UNA)\b/;
const CONECTOR = /^\s*(-|–|A|AL|Y|HASTA|TO)\s*$/;

function aMinutos(h: number, min: number, mer: string | null): number {
  let hora = h;
  if (mer === 'PM' && hora < 12) hora += 12;
  if (mer === 'AM' && hora === 12) hora = 0;
  return hora * 60 + min;
}

export function etiquetaHora(totalMin: number): string {
  const t = Math.max(0, Math.round(totalMin));
  const h24 = Math.floor(t / 60) % 24;
  const m = t % 60;
  const sufijo = h24 < 12 ? 'a. m.' : 'p. m.';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

/**
 * Franja de entrega leída del texto libre del pedido ("EN LA MAÑANA 7:00AM A 10:00AM", "9-1 pm",
 * "LO MAS PRONTO POSIBLE"). Mismo criterio que el plan de despachos del backend
 * (services/despachos/franjas.js): si cambia allá, cambia aquí.
 */
export function leerFranja(texto: string | null | undefined): FranjaRutero {
  const t = String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim();
  if (!t) return SIN_FRANJA;

  const HORA = /(\d{1,2})(?:[:.](\d{2}))?\s*(A\.?\s?M\.?|P\.?\s?M\.?)?/g;
  const horas: Array<{ h: number; min: number; mer: string | null; conMinutos: boolean; inicio: number; fin: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = HORA.exec(t)) !== null) {
    const h = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    if (h > 24 || min > 59) continue;
    const mer = m[3] ? (m[3].replace(/[\s.]/g, '').startsWith('P') ? 'PM' : 'AM') : null;
    horas.push({ h, min, mer, conMinutos: !!m[2], inicio: m.index, fin: m.index + m[0].length });
  }
  for (let i = 0; i + 1 < horas.length; i++) {
    const a = horas[i];
    const b = horas[i + 1];
    if (!CONECTOR.test(t.slice(a.fin, b.inicio))) continue;
    const pareceHora = a.conMinutos || b.conMinutos || a.mer || b.mer || b.h > 12;
    if (!pareceHora) continue;
    let inicio = aMinutos(a.h, a.min, a.mer);
    let fin = aMinutos(b.h, b.min, b.mer);
    if (!a.mer && b.mer === 'PM' && inicio + 12 * 60 <= fin) inicio += 12 * 60;
    if (!b.mer && fin <= inicio && fin + 12 * 60 > inicio) fin += 12 * 60;
    if (fin <= inicio || fin > 24 * 60) continue;
    return { clave: `${inicio}-${fin}`, inicioMin: inicio, finMin: fin, urgente: false, etiqueta: `${etiquetaHora(inicio)} a ${etiquetaHora(fin)}` };
  }
  return PALABRAS_URGENCIA.test(t) ? URGENTE : SIN_FRANJA;
}

/** Kilómetros en línea recta entre dos puntos. */
export function kmEntre(a: Punto, b: Punto): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function largo(inicio: Punto, puntos: Punto[]): number {
  let total = 0;
  let previo = inicio;
  for (const p of puntos) { total += kmEntre(previo, p); previo = p; }
  return total;
}

/** Vecino más cercano desde `inicio` y mejora 2-opt (camino abierto, con el inicio fijo). */
export function ordenarPorCercania<T extends Punto>(inicio: Punto, puntos: T[]): T[] {
  if (puntos.length < 2) return puntos.slice();
  const pendientes = puntos.slice();
  const orden: T[] = [];
  let actual: Punto = inicio;
  while (pendientes.length) {
    let mejor = 0;
    let mejorKm = Infinity;
    for (let i = 0; i < pendientes.length; i++) {
      const km = kmEntre(actual, pendientes[i]);
      if (km < mejorKm) { mejorKm = km; mejor = i; }
    }
    actual = pendientes[mejor];
    orden.push(pendientes.splice(mejor, 1)[0]);
  }
  return dosOpt(inicio, orden);
}

/** 2-opt: invierte tramos mientras el recorrido baje. Acotado para que nunca trabe la pantalla. */
function dosOpt<T extends Punto>(inicio: Punto, ruta: T[]): T[] {
  const r = ruta.slice();
  const n = r.length;
  if (n < 3) return r;
  let mejoro = true;
  let vueltas = 0;
  while (mejoro && vueltas < 60) {
    mejoro = false;
    vueltas++;
    for (let i = 0; i < n - 1; i++) {
      const antes = i === 0 ? inicio : r[i - 1];
      for (let j = i + 1; j < n; j++) {
        const despues = j + 1 < n ? r[j + 1] : null;
        const actual = kmEntre(antes, r[i]) + (despues ? kmEntre(r[j], despues) : 0);
        const nuevo = kmEntre(antes, r[j]) + (despues ? kmEntre(r[i], despues) : 0);
        if (nuevo + 1e-9 < actual) {
          let a = i;
          let b = j;
          while (a < b) { const tmp = r[a]; r[a] = r[b]; r[b] = tmp; a++; b--; }
          mejoro = true;
        }
      }
    }
  }
  return r;
}

function pesoFranja(f: FranjaRutero): number {
  return f.urgente ? -1 : f.inicioMin == null ? Number.MAX_SAFE_INTEGER : f.finMin!;
}

/**
 * Orden de una ruta: primero las franjas (urgente, luego la que vence antes), cada una ordenada por
 * cercanía desde donde quedó la anterior; lo que no tiene franja se intercala donde menos agrega.
 */
export function ordenarParadas(salida: Punto, paradas: ParadaRutero[]): ParadaRutero[] {
  const conFranja = paradas.filter(p => p.franja.urgente || p.franja.inicioMin != null);
  const libres = paradas.filter(p => !p.franja.urgente && p.franja.inicioMin == null);
  if (!conFranja.length) return ordenarPorCercania(salida, libres);

  const grupos = new Map<string, ParadaRutero[]>();
  for (const p of conFranja) {
    if (!grupos.has(p.franja.clave)) grupos.set(p.franja.clave, []);
    grupos.get(p.franja.clave)!.push(p);
  }
  const claves = Array.from(grupos.keys()).sort((a, b) => {
    const fa = grupos.get(a)![0].franja;
    const fb = grupos.get(b)![0].franja;
    return pesoFranja(fa) - pesoFranja(fb) || (fa.inicioMin || 0) - (fb.inicioMin || 0);
  });
  const orden: ParadaRutero[] = [];
  let desde = salida;
  for (const clave of claves) {
    const tramo = ordenarPorCercania(desde, grupos.get(clave)!);
    orden.push(...tramo);
    desde = tramo[tramo.length - 1];
  }
  // Inserción más barata de lo que no tiene franja
  for (const libre of ordenarPorCercania(salida, libres)) {
    let mejorPos = orden.length;
    let mejorExtra = kmEntre(orden[orden.length - 1], libre);
    for (let i = 0; i < orden.length; i++) {
      const antes = i === 0 ? salida : orden[i - 1];
      const extra = kmEntre(antes, libre) + kmEntre(libre, orden[i]) - kmEntre(antes, orden[i]);
      if (extra < mejorExtra) { mejorExtra = extra; mejorPos = i; }
    }
    orden.splice(mejorPos, 0, libre);
  }
  return orden;
}

/** Reparto por barrido angular desde la salida, cortando en el hueco más grande. */
export function repartir(paradas: ParadaRutero[], opciones: OpcionesRutero): { grupos: ParadaRutero[][]; sinRuta: ParadaRutero[] } {
  const k = Math.max(1, Math.min(Math.floor(opciones.rutas) || 1, Math.max(1, paradas.length)));
  if (!paradas.length) return { grupos: [], sinRuta: [] };
  const conAngulo = paradas.map(p => ({
    p,
    angulo: Math.atan2(p.lat - opciones.salida.lat, (p.lng - opciones.salida.lng) * Math.cos((opciones.salida.lat * Math.PI) / 180)),
    km: kmEntre(opciones.salida, p),
  })).sort((a, b) => a.angulo - b.angulo || a.km - b.km || a.p.id.localeCompare(b.p.id));

  // Empezar después del hueco angular más grande: así ninguna ruta queda partida en dos lados
  let corte = 0;
  let mayor = -1;
  for (let i = 0; i < conAngulo.length; i++) {
    const sig = conAngulo[(i + 1) % conAngulo.length];
    const hueco = i + 1 < conAngulo.length ? sig.angulo - conAngulo[i].angulo : sig.angulo + 2 * Math.PI - conAngulo[i].angulo;
    if (hueco > mayor) { mayor = hueco; corte = (i + 1) % conAngulo.length; }
  }
  const enOrden = conAngulo.slice(corte).concat(conAngulo.slice(0, corte)).map(x => x.p);

  const tope = opciones.maxParadas > 0 ? Math.floor(opciones.maxParadas) : Infinity;
  const caben = Math.min(enOrden.length, k * tope);
  // Si no caben todas, quedan por fuera las más lejanas a la salida
  let entran = enOrden;
  let sinRuta: ParadaRutero[] = [];
  if (caben < enOrden.length) {
    const lejanas = new Set(enOrden.slice().sort((a, b) => kmEntre(opciones.salida, b) - kmEntre(opciones.salida, a) || a.id.localeCompare(b.id))
      .slice(0, enOrden.length - caben).map(p => p.id));
    sinRuta = enOrden.filter(p => lejanas.has(p.id));
    entran = enOrden.filter(p => !lejanas.has(p.id));
  }
  const grupos: ParadaRutero[][] = [];
  const base = Math.floor(entran.length / k);
  let sobran = entran.length % k;
  let i = 0;
  for (let g = 0; g < k; g++) {
    const tam = base + (sobran > 0 ? 1 : 0);
    if (sobran > 0) sobran--;
    if (tam > 0) grupos.push(entran.slice(i, i + tam));
    i += tam;
  }
  return { grupos, sinRuta };
}

/**
 * Recalcula kilómetros, horas de llegada y totales de una ruta con el orden que tenga.
 * `tramosKm` (fase 3) son los kilómetros por calles reales de cada tramo, uno por parada y, si la ruta
 * regresa, uno más de vuelta. Sin ellos se usa la línea recta por el factor urbano.
 */
export function medirRuta(ruta: { id: string; nombre: string; color: string; paradas: ParadaRutero[] }, opciones: OpcionesRutero, tramosKm?: number[] | null): RutaRutero {
  const esperados = ruta.paradas.length + (opciones.regresa && ruta.paradas.length ? 1 : 0);
  const reales = tramosKm && tramosKm.length === esperados && tramosKm.every(k => Number.isFinite(k) && k >= 0) ? tramosKm : null;
  const minPorKm = 60 / Math.max(1, opciones.velocidadKmh);
  let reloj = opciones.horaSalidaMin;
  let km = 0;
  let previo: Punto = opciones.salida;
  let tarde = 0;
  const paradas: ParadaEnRuta[] = ruta.paradas.map((p, i) => {
    const tramo = reales ? reales[i] : kmEntre(previo, p) * opciones.factorUrbano;
    km += tramo;
    reloj += tramo * minPorKm;
    const llegadaMin = reloj;
    const esperaMin = p.franja.inicioMin != null && llegadaMin < p.franja.inicioMin ? p.franja.inicioMin - llegadaMin : 0;
    const esTarde = p.franja.finMin != null && llegadaMin > p.franja.finMin;
    if (esTarde) tarde++;
    reloj += esperaMin + opciones.minutosPorParada;
    previo = p;
    return { ...p, llegadaMin, tarde: esTarde, esperaMin, kmDesdeAnterior: tramo };
  });
  if (opciones.regresa && paradas.length) {
    const vuelta = reales ? reales[reales.length - 1] : kmEntre(previo, opciones.salida) * opciones.factorUrbano;
    km += vuelta;
    reloj += vuelta * minPorKm;
  }
  return {
    id: ruta.id,
    nombre: ruta.nombre,
    color: ruta.color,
    paradas,
    km,
    minutos: reloj - opciones.horaSalidaMin,
    porCobrar: paradas.reduce((s, p) => s + (p.porCobrar || 0), 0),
    tarde,
    finMin: reloj,
  };
}

export function armarRutas(paradas: ParadaRutero[], opciones: OpcionesRutero): ResultadoRutero {
  const { grupos, sinRuta } = repartir(paradas, opciones);
  const rutas = grupos.map((grupo, i) => medirRuta({
    id: `r${i + 1}`,
    nombre: `Ruta ${i + 1}`,
    color: COLORES_RUTA[i % COLORES_RUTA.length],
    paradas: ordenarParadas(opciones.salida, grupo),
  }, opciones));
  return { rutas, sinRuta };
}

/** Recorrido de un orden dado, con el mismo factor urbano (para comparar antes y después). */
export function kmDeOrden(salida: Punto, paradas: Punto[], opciones: Pick<OpcionesRutero, 'factorUrbano' | 'regresa'>): number {
  if (!paradas.length) return 0;
  const ida = largo(salida, paradas);
  const vuelta = opciones.regresa ? kmEntre(paradas[paradas.length - 1], salida) : 0;
  return (ida + vuelta) * opciones.factorUrbano;
}
