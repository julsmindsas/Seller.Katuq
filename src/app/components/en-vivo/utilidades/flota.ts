import { MensajeroEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { claveDeNombre, diaDeColombia, nombrePropio } from './formato';

/** Un mensajero (moto) o una transportadora (camión) con lo que lleva ahora. */
export interface EntradaFlota {
  clave: string;
  nombre: string;
  tipo: 'mensajero' | 'transportadora';
  enRuta: boolean;
  /** Pedidos que lleva ahora. */
  pedidos: number;
  /** Instante (ms) de su salida más reciente con pedidos que aún lleva; null si no se sabe. */
  salioEn: number | null;
  pedidoIds: string[];
}

/** Hora (ms) en que salió el pedido; si no se vio, la de llegada. */
export function salidaDe(pedido: PedidoEnVivo): number | null {
  const ms = pedido.horas?.camino ?? pedido.tS ?? pedido.tC;
  return typeof ms === 'number' && Number.isFinite(ms) ? ms : null;
}

/**
 * ¿Salió el día de `referenciaMs` (hora de Colombia)? Un pedido de un mensajero propio que salió
 * otro día y sigue "despachado" no es alguien en la calle: es un pedido que nadie cerró. Sin
 * referencia no se filtra.
 */
export function salioElMismoDia(pedido: PedidoEnVivo, referenciaMs: number | null): boolean {
  if (referenciaMs === null) return true;
  const ms = salidaDe(pedido);
  return ms !== null && diaDeColombia(ms) === diaDeColombia(referenciaMs);
}

/** Un envío con transportadora tarda días; pasados 5 desde la salida, nadie lo cerró (igual que el radar del servidor). */
export const TRANSITO_MAXIMO_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * ¿Sigue en la calle a `referenciaMs`? Lo de un mensajero propio, si salió ese mismo día; lo de una
 * transportadora, si salió hace 5 días o menos. Lo demás sigue "despachado" porque nadie lo cerró.
 * Sin referencia no se filtra.
 */
export function sigueEnLaCalle(
  pedido: PedidoEnVivo,
  tipo: 'mensajero' | 'transportadora',
  referenciaMs: number | null
): boolean {
  if (referenciaMs === null) return true;
  if (tipo === 'mensajero') return salioElMismoDia(pedido, referenciaMs);
  const ms = salidaDe(pedido);
  return ms === null || referenciaMs - ms <= TRANSITO_MAXIMO_MS;
}

/**
 * Los pedidos sin los "en camino" que ya no siguen en la calle (`sigueEnLaCalle`; quien no es de
 * la flota cuenta como transportadora). Así el mapa pone en cada moto lo mismo que cuenta la flota.
 */
export function sinPedidosSinCerrar(
  pedidos: ReadonlyArray<PedidoEnVivo>,
  flota: ReadonlyArray<MensajeroEnVivo>,
  referenciaMs: number | null
): PedidoEnVivo[] {
  const propios = new Set(flota.map((m) => claveDeNombre(m.nombre)));
  return pedidos.filter(
    (p) =>
      p.etapa !== 'camino' ||
      !p.transportador ||
      sigueEnLaCalle(p, propios.has(claveDeNombre(p.transportador)) ? 'mensajero' : 'transportadora', referenciaMs)
  );
}

/**
 * Arma la flota para la pantalla: los mensajeros propios que manda el servidor (solo nombre y si
 * van en ruta) más lo que cada uno lleva, sacado de los pedidos "en camino" de la foto, y las
 * transportadoras que tienen pedidos en camino. Puro: la hora de "salió" viene de `horas.camino`.
 *
 * `actualizadoEn` y `mensajero.salioEn` (ms desde que salió, medido al armar la foto) son el
 * respaldo si el pedido no trae la hora en que se vio salir.
 *
 * A un mensajero propio solo se le cuenta lo que salió HOY (el día de `ahoraMs`, o de
 * `actualizadoEn`), y el tiempo es desde su salida más reciente, igual que "lleva X en la calle"
 * del servidor. Las transportadoras sí cuentan lo de días anteriores, porque un envío a otra
 * ciudad tarda días, pero solo hasta 5 (`sigueEnLaCalle`).
 */
export function armarFlota(
  flota: ReadonlyArray<MensajeroEnVivo>,
  pedidos: ReadonlyArray<PedidoEnVivo>,
  actualizadoEn: number | null,
  ahoraMs: number | null = actualizadoEn
): EntradaFlota[] {
  const enCamino = pedidos.filter((p) => p.etapa === 'camino' && !!p.transportador);
  const porTransportador = new Map<string, PedidoEnVivo[]>();
  for (const pedido of enCamino) {
    const clave = claveDeNombre(pedido.transportador);
    const lista = porTransportador.get(clave) ?? [];
    lista.push(pedido);
    porTransportador.set(clave, lista);
  }

  const salida: EntradaFlota[] = [];
  const propios = new Set<string>();

  for (const mensajero of flota) {
    const clave = claveDeNombre(mensajero.nombre);
    propios.add(clave);
    const suyos = (porTransportador.get(clave) ?? []).filter((p) => sigueEnLaCalle(p, 'mensajero', ahoraMs));
    const salidas = suyos.map((p) => p.horas.camino).filter((h): h is number => typeof h === 'number');
    const respaldo =
      actualizadoEn !== null && typeof mensajero.salioEn === 'number' ? actualizadoEn - mensajero.salioEn : null;
    const enRuta = mensajero.enRuta || suyos.length > 0;
    salida.push({
      clave,
      nombre: nombrePropio(mensajero.nombre) || mensajero.nombre,
      tipo: 'mensajero',
      enRuta,
      pedidos: suyos.length || (enRuta ? mensajero.pedidos ?? 0 : 0),
      salioEn: salidas.length > 0 ? Math.max(...salidas) : enRuta ? respaldo : null,
      pedidoIds: suyos.map((p) => p.id),
    });
  }

  porTransportador.forEach((todos, clave) => {
    if (propios.has(clave)) return;
    // Solo entra lo que el servidor marcó como transportadora externa; lo demás que no esté en la flota se omite.
    if (!todos.some((p) => p.tipoTransportador === 'transportadora')) return;
    const suyos = todos.filter((p) => sigueEnLaCalle(p, 'transportadora', ahoraMs));
    if (suyos.length === 0) return;
    const salidas = suyos.map((p) => p.horas.camino).filter((h): h is number => typeof h === 'number');
    salida.push({
      clave,
      nombre: suyos[0].transportador ?? clave,
      tipo: 'transportadora',
      enRuta: true,
      pedidos: suyos.length,
      salioEn: salidas.length > 0 ? Math.min(...salidas) : null,
      pedidoIds: suyos.map((p) => p.id),
    });
  });

  // Primero los que van en ruta; luego los de bodega, por nombre.
  return salida.sort(
    (a, b) => Number(b.enRuta) - Number(a.enRuta) || a.nombre.localeCompare(b.nombre, 'es')
  );
}
