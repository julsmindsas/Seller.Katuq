import { ComercioEnVivo, EventoEnVivo } from '../../servicios/en-vivo.modelos';
import { dineroCorto } from '../../utilidades/formato';
import { claseDeComercio, ciudadVisible, inicialesVisibles, nombreVisible } from './nombres';

/**
 * El comercio del momento: el que más pedidos recibió en los últimos 30 minutos. El modelo real no
 * trae las llegadas por comercio (solo `porHora` en dinero y `ultimoEvento`), así que se cuentan los
 * eventos `pedido_nuevo` que la pantalla ya tiene (los de la foto, hasta 60, más los que llegan en
 * vivo). Con mucho movimiento la ventana de eventos puede quedarse corta: el conteo es un MÍNIMO
 * fiel, nunca inventa pedidos.
 */

export const VENTANA_MOMENTO_MS = 30 * 60 * 1000;
/** Margen para relojes un poco adelantados entre el servidor y la pantalla. */
const MARGEN_RELOJ_MS = 60 * 1000;

export interface Momento {
  empresa: string;
  nombre: string;
  nombreReal: string;
  iniciales: string;
  clase: string;
  /** Ciudad del comercio ("" con la privacidad: ya va en el nombre). */
  ciudad: string;
  pedidos: number;
  /** "$420 mil" de lo que entró en esos 30 minutos; null con la privacidad o si no se sabe. */
  ventas: string | null;
  /** "3 pedidos en 30 min" sin el número (el número va en grande). */
  unidad: string;
  etiqueta: string;
}

/** Llave del comercio de un evento de toda Katuq (el router la aplana en `empresa`; también viene en `comercio`). */
export function empresaDeEvento(evento: EventoEnVivo): string | null {
  return evento.empresa ?? evento.comercio?.empresa ?? null;
}

interface Acumulado {
  pedidos: number;
  ventas: number;
  nombre: string;
  ciudad: string | null;
}

export function comercioDelMomento(
  comercios: ReadonlyArray<ComercioEnVivo>,
  eventos: ReadonlyArray<EventoEnVivo>,
  ahoraMs: number,
  ocultar: boolean
): Momento | null {
  const desde = ahoraMs - VENTANA_MOMENTO_MS;
  const hasta = ahoraMs + MARGEN_RELOJ_MS;
  const cuentas = new Map<string, Acumulado>();

  for (const evento of eventos) {
    if (evento.tipo !== 'pedido_nuevo') continue;
    const empresa = empresaDeEvento(evento);
    if (!empresa) continue;
    const ms = Date.parse(evento.hora);
    if (!Number.isFinite(ms) || ms <= desde || ms > hasta) continue;
    const previo = cuentas.get(empresa);
    const monto = typeof evento.monto === 'number' && Number.isFinite(evento.monto) ? evento.monto : 0;
    if (previo) {
      previo.pedidos += 1;
      previo.ventas += monto;
    } else {
      cuentas.set(empresa, {
        pedidos: 1,
        ventas: monto,
        nombre: evento.nombreComercio ?? evento.comercio?.nombre ?? empresa,
        ciudad: evento.ciudadComercio ?? evento.comercio?.ciudad ?? null,
      });
    }
  }

  // Más pedidos; a igual cantidad, más dinero; y al final la llave, para que el resultado sea siempre el mismo.
  const ordenadas = Array.from(cuentas.entries()).sort(
    (a, b) => b[1].pedidos - a[1].pedidos || b[1].ventas - a[1].ventas || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
  );
  if (ordenadas.length === 0) return null;
  const [empresa, cuenta] = ordenadas[0];
  // La identidad buena es la de las cifras; el evento solo respalda si el comercio aún no está ahí.
  const fila = comercios.find((c) => c.empresa === empresa);
  const identidad = { nombre: fila?.nombre ?? cuenta.nombre, ciudad: fila?.ciudad ?? cuenta.ciudad };
  const nombre = nombreVisible(identidad, ocultar);
  const pedidosTexto = `${cuenta.pedidos} ${cuenta.pedidos === 1 ? 'pedido' : 'pedidos'}`;
  return {
    empresa,
    nombre,
    nombreReal: String(identidad.nombre ?? '').trim() || empresa,
    iniciales: inicialesVisibles(identidad, ocultar),
    clase: claseDeComercio(empresa),
    ciudad: ocultar ? '' : ciudadVisible(identidad.ciudad),
    pedidos: cuenta.pedidos,
    ventas: ocultar || cuenta.ventas <= 0 ? null : dineroCorto(cuenta.ventas),
    unidad: cuenta.pedidos === 1 ? 'pedido en 30 min' : 'pedidos en 30 min',
    etiqueta: `Comercio del momento: ${nombre}, ${pedidosTexto} en 30 minutos. Abrir su tablero`,
  };
}
