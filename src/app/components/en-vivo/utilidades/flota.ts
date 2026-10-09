import { MensajeroEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { claveDeNombre } from './formato';

/** Un mensajero (moto) o una transportadora (camión) con lo que lleva ahora. */
export interface EntradaFlota {
  clave: string;
  nombre: string;
  tipo: 'mensajero' | 'transportadora';
  enRuta: boolean;
  /** Pedidos que lleva ahora. */
  pedidos: number;
  /** Instante (ms) en que salió con el pedido más viejo que aún lleva; null si no se sabe. */
  salioEn: number | null;
  pedidoIds: string[];
}

/**
 * Arma la flota para la pantalla: los mensajeros propios que manda el servidor (solo nombre y si
 * van en ruta) más lo que cada uno lleva, sacado de los pedidos "en camino" de la foto, y las
 * transportadoras que tienen pedidos en camino. Puro: la hora de "salió" viene de `horas.camino`.
 *
 * `actualizadoEn` y `mensajero.salioEn` (ms desde que salió, medido al armar la foto) son el
 * respaldo si el pedido no trae la hora en que se vio salir.
 */
export function armarFlota(
  flota: ReadonlyArray<MensajeroEnVivo>,
  pedidos: ReadonlyArray<PedidoEnVivo>,
  actualizadoEn: number | null
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
    const suyos = porTransportador.get(clave) ?? [];
    const salidas = suyos.map((p) => p.horas.camino).filter((h): h is number => typeof h === 'number');
    const respaldo =
      actualizadoEn !== null && typeof mensajero.salioEn === 'number' ? actualizadoEn - mensajero.salioEn : null;
    const enRuta = mensajero.enRuta || suyos.length > 0;
    salida.push({
      clave,
      nombre: mensajero.nombre,
      tipo: 'mensajero',
      enRuta,
      pedidos: suyos.length || (enRuta ? mensajero.pedidos ?? 0 : 0),
      salioEn: salidas.length > 0 ? Math.min(...salidas) : enRuta ? respaldo : null,
      pedidoIds: suyos.map((p) => p.id),
    });
  }

  porTransportador.forEach((suyos, clave) => {
    if (propios.has(clave)) return;
    // Solo entra lo que el servidor marcó como transportadora externa; lo demás que no esté en la flota se omite.
    if (!suyos.some((p) => p.tipoTransportador === 'transportadora')) return;
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
