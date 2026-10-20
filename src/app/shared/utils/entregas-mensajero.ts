/**
 * Seguimiento del mapa de despachos: qué pedidos lleva cada mensajero.
 *
 * La app solo manda `pendientes` (un número) y `pedidoActual` (un pedido) a `active_users/<clave>`; la lista
 * sale de los pedidos que el Seller ya tiene, los que siguen en manos del mensajero.
 *
 * Cómo se une un pedido con un mensajero:
 * - Mensajero de empresa: la clave es `nombre_empresa` y el pedido guarda el nombre. Se arma la clave con la
 *   MISMA regla de la app (todo lo que no sea letra o número pasa a `_`, minúsculas) y se compara completa.
 * - Mensajero independiente: la clave es `nombre_<id de su ficha>_julsmind_independientes` y el pedido que
 *   tomó trae `transportadorId`. Se une por id, nunca por nombre: en todo el país puede haber dos
 *   "Juan Pérez", y uno no debe verse por llevar el pedido del otro.
 *
 * Un independiente solo aparece en el mapa de un comercio mientras lleva un pedido de ese comercio.
 */
import { claveEmpresa } from './ubicacion-mensajero';

/** Estados en los que el pedido sigue en manos del mensajero (los mismos que cuenta el servidor). */
export const ESTADOS_EN_MANO = ['Empacado', 'ParaDespachar', 'EnDespacho', 'Despachado'];

/** Empresa con la que se registran los mensajeros independientes (`EMPRESA_INDEPENDIENTES` en el servidor). */
export const CLAVE_INDEPENDIENTES = claveEmpresa('Julsmind Independientes');

export interface EntregaAsignada {
  nroPedido: string;
  cliente: string;
  direccion: string;
  estado: string;
  /** Nombre del mensajero tal como lo guarda el pedido. */
  transportador: string;
  /** Id de la ficha del mensajero; lo trae el pedido que el mensajero tomó él mismo. */
  transportadorId?: string;
  /** El pedido lo tomó un mensajero independiente. */
  independiente?: boolean;
}

/** Nombre del mensajero de un pedido: el texto guardado o el objeto `{nombre}` / `{nombres, apellidos}`, sin el celular. */
export function nombreDeTransportador(valor: unknown): string {
  let texto = '';
  if (typeof valor === 'string') {
    texto = valor;
  } else if (valor && typeof valor === 'object') {
    const t = valor as any;
    texto = String(t.nombre || [t.nombres, t.apellidos].filter(Boolean).join(' ') || '');
  }
  return texto
    .trim()
    .replace(/^\s*\d{6,}\s*-\s*/, '')
    .replace(/\s*-\s*\d{6,}\s*$/, '')
    .trim();
}

/** La entrega de un pedido que sigue en manos de un mensajero; null si no tiene o ya la entregó. */
export function entregaAsignada(pedido: any): EntregaAsignada | null {
  if (!pedido || !ESTADOS_EN_MANO.includes(pedido.estadoProceso)) return null;
  const transportador = nombreDeTransportador(pedido.transportador) || nombreDeTransportador(pedido.transportadorNombre);
  const transportadorId = typeof pedido.transportadorId === 'string' && pedido.transportadorId.trim()
    ? pedido.transportadorId.trim()
    : undefined;
  if (!transportador && !transportadorId) return null;
  return {
    nroPedido: String(pedido.nroPedido || ''),
    cliente: String(pedido.cliente?.nombres_completos || pedido.cliente?.apellidos_completos || 'Cliente sin nombre'),
    direccion: String(pedido.envio?.direccionEntrega || ''),
    estado: String(pedido.estadoProceso),
    transportador,
    transportadorId,
    independiente: pedido.asignacionMensajero?.independiente === true
  };
}

/** La clave que la app arma para `active_users`: `nombre_empresa` con todo lo demás convertido en `_`. */
export function claveDeMensajero(nombre: string, nombreEmpresa: string): string {
  return `${nombre}_${nombreEmpresa}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function normalizada(clave: string | null | undefined): string {
  return String(clave || '').toLowerCase().replace(/_+/g, '_');
}

/** ¿La clave es de un mensajero independiente? */
export function esClaveIndependiente(clave: string | null | undefined): boolean {
  return normalizada(clave).endsWith('_' + CLAVE_INDEPENDIENTES);
}

/** Los pedidos de la lista que lleva el mensajero de esa clave de `active_users`. */
export function entregasDeMensajero(
  clave: string | null | undefined,
  nombreEmpresa: string | null | undefined,
  entregas: EntregaAsignada[] | null | undefined
): EntregaAsignada[] {
  const propia = normalizada(clave);
  if (!propia || !entregas?.length) return [];
  if (esClaveIndependiente(propia)) {
    return entregas.filter(e => !!e.transportadorId
      && propia.endsWith(`_${e.transportadorId.toLowerCase()}_${CLAVE_INDEPENDIENTES}`));
  }
  if (!nombreEmpresa) return [];
  return entregas.filter(e => !e.independiente && !!e.transportador
    && claveDeMensajero(e.transportador, nombreEmpresa) === propia);
}

/**
 * Nombre para mostrar de un independiente: sale del pedido que lleva, porque su clave trae el id de la
 * ficha en medio del nombre. Si no se puede, queda vacío y el mapa usa el de la clave.
 */
export function nombreDeIndependiente(entregas: EntregaAsignada[]): string {
  return entregas.find(e => !!e.transportador)?.transportador || '';
}

/** "Para despachar", "En camino": cómo se ve el estado en la lista de un mensajero. */
export function etiquetaEstadoEntrega(estado: string): string {
  switch (estado) {
    case 'Empacado': return 'Empacado';
    case 'ParaDespachar': return 'Para despachar';
    case 'EnDespacho': return 'En despacho';
    case 'Despachado': return 'En camino';
    default: return estado;
  }
}
