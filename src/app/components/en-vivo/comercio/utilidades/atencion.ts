import { claveDeTexto, primerNombre } from '../../servicios/en-vivo-reglas';
import { AlertaRadar, claseTonoCss, RadarEnVivo, TipoAlertaRadar } from '../../servicios/en-vivo.modelos';
import { EntradaFlota } from '../../utilidades/flota';
import { IconoId } from '../../utilidades/iconos';

/**
 * "Atención ahora" y "Lo próximo" del comercio (diseño 18). El SERVIDOR calcula qué necesita
 * atención (`radar.atencion`, ya con D-349); aquí solo se ordena, se rotula y se decide a dónde
 * lleva cada punto (la ficha del pedido o la del mensajero). Todo puro.
 */

/** Cuántas cosas muestra el panel flotante "Lo próximo". */
export const MAX_PROXIMOS = 3;

/** A dónde lleva un punto de atención. */
export type AccionAtencion =
  | { tipo: 'pedido'; pedidoId: string; numero: string | null }
  | { tipo: 'mensajero'; nombre: string; pedidoIds: string[] };

export interface ItemAtencion {
  /** Estable entre repintados: sirve de `trackBy` y para saber cuáles son nuevos. */
  clave: string;
  /** 3 = grave, 2 = revisar, 1 = informativa. */
  sev: 1 | 2 | 3;
  /** Clase del tema (`t-bad`, `t-warn`...), con `tonoCss` del backend. */
  clase: string;
  icono: IconoId;
  titulo: string;
  texto: string;
  /** La sugerencia de Opttia, con mayúscula inicial. */
  sugerencia: string;
  accion: AccionAtencion | null;
  /** "Ver el pedido" o "Ver al mensajero" ('' si el punto no lleva a ninguna parte). */
  etiquetaAccion: string;
  /** Texto para lectores de pantalla del botón de la acción. */
  ariaAccion: string;
  /** Llegó después del primer pintado: entra resaltado. */
  nuevo: boolean;
}

const ICONO_POR_TIPO: Readonly<Record<TipoAlertaRadar, IconoId>> = {
  listo: 'alerta',
  demorado: 'reloj',
  mensajero: 'moto',
  sin_pago: 'tarjeta',
  racha: 'fuego',
  silencio: 'reloj',
  atascado: 'alerta',
  rechazos: 'equis',
};

/** Primera letra en mayúscula ("yeison está en bodega" → "Yeison está en bodega"). */
export function conMayuscula(texto: string | null | undefined): string {
  const limpio = String(texto ?? '').trim();
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
}

/**
 * A dónde lleva una alerta. Con `pedidoId` abre el pedido (también en "listo", cuya `mensajero` es
 * solo el sugerido); sin él, con `mensajero` abre al mensajero: del primer nombre que manda el
 * servidor se busca el completo en la flota (y lo que lleva), y si no está queda el primer nombre.
 */
export function resolverAccion(alerta: AlertaRadar, flota: ReadonlyArray<EntradaFlota>): AccionAtencion | null {
  if (alerta.pedidoId) return { tipo: 'pedido', pedidoId: alerta.pedidoId, numero: alerta.numero ?? null };
  if (!alerta.mensajero) return null;

  const buscado = claveDeTexto(alerta.mensajero);
  const candidatos = flota.filter((e) => e.tipo === 'mensajero' && claveDeTexto(primerNombre(e.nombre)) === buscado);
  // "Lleva X en la calle" habla de quien va en ruta: si hay dos con el mismo nombre, ese.
  const elegido = (alerta.tipo === 'mensajero' ? candidatos.find((e) => e.enRuta) : undefined) ?? candidatos[0];
  return elegido
    ? { tipo: 'mensajero', nombre: elegido.nombre, pedidoIds: elegido.pedidoIds.slice() }
    : { tipo: 'mensajero', nombre: alerta.mensajero, pedidoIds: [] };
}

function claveDe(alerta: AlertaRadar): string {
  return `${alerta.tipo}|${alerta.pedidoId ?? alerta.mensajero ?? alerta.numero ?? ''}`;
}

/**
 * Los puntos de `radar.atencion`, del más urgente al menos urgente (el servidor ya los manda
 * así; se ordena por gravedad, sin mover los del mismo nivel). Sin radar o sin `atencion` queda vacío.
 */
export function armarAtencion(radar: RadarEnVivo | null | undefined, flota: ReadonlyArray<EntradaFlota>): ItemAtencion[] {
  const lista = radar?.atencion ?? [];
  return lista
    .map((alerta, orden) => ({ alerta, orden }))
    .sort((a, b) => b.alerta.sev - a.alerta.sev || a.orden - b.orden)
    .map(({ alerta }) => {
      const accion = resolverAccion(alerta, flota);
      return {
        clave: claveDe(alerta),
        sev: alerta.sev,
        clase: claseTonoCss(alerta.tono),
        icono: ICONO_POR_TIPO[alerta.tipo] ?? 'alerta',
        titulo: alerta.titulo,
        texto: alerta.texto ?? '',
        sugerencia: conMayuscula(alerta.sugerencia),
        accion,
        etiquetaAccion: accion ? (accion.tipo === 'pedido' ? 'Ver el pedido' : 'Ver al mensajero') : '',
        ariaAccion: accion
          ? accion.tipo === 'pedido'
            ? `Ver el pedido${accion.numero ? ` ${accion.numero}` : ''}`
            : `Ver al mensajero ${accion.nombre}`
          : '',
        nuevo: false,
      };
    });
}

/** Las más urgentes que llevan a algún lado (el panel "Lo próximo"). */
export function masUrgentes(items: ReadonlyArray<ItemAtencion>, maximo: number = MAX_PROXIMOS): ItemAtencion[] {
  return items.filter((i) => i.accion !== null).slice(0, Math.max(0, maximo));
}

/** Cuántos puntos piden atención de verdad (grave o por revisar; la racha y lo informativo no cuentan). */
export function contarUrgentes(items: ReadonlyArray<ItemAtencion>): number {
  return items.filter((i) => i.sev >= 2).length;
}

/** "3 por atender" · "Todo al día". */
export function textoUrgentes(urgentes: number): string {
  return urgentes > 0 ? `${urgentes} por atender` : 'Todo al día';
}

/**
 * Marca como `nuevo` los puntos que no estaban en el pintado anterior. `previas` null = primer
 * pintado: nada es nuevo (lo que ya estaba al abrir la pantalla no entra resaltado).
 */
export function marcarNuevos(items: ReadonlyArray<ItemAtencion>, previas: ReadonlySet<string> | null): ItemAtencion[] {
  return items.map((i) => ({ ...i, nuevo: previas !== null && !previas.has(i.clave) }));
}
