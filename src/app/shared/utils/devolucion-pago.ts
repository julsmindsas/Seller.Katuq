/**
 * Devoluciones de pagos de pasarela, a mano (D-723). Espejo de la regla del backend
 * (`services/orders/devolucionPago.js`, función `vista`): solo decide qué se MUESTRA; al marcar
 * «Devuelto» el servidor vuelve a validar todo.
 *
 * «Pago por devolver»: estado de pago Cancelado o Precancelado + un pago aprobado que asentó el
 * aviso de una pasarela (Wompi, ePayco, Bold) + cancelado desde que el comercio encendió la función.
 */

export interface DevolucionPagoVista {
  estado: 'por_devolver' | 'devuelto';
  valor?: number;
  pasarela?: string;
  transaccion?: string;
  referencia?: string;
  fechaDevolucion?: string;
  observacion?: string | null;
  marcadoPor?: string | null;
  marcadoEn?: string;
}

const ESTADOS_CANCELADOS = ['Cancelado', 'Precancelado'];
const PASARELAS: Record<string, string> = { wompi: 'Wompi', epayco: 'ePayco', bold: 'Bold' };

const texto = (v: any) => (v === undefined || v === null ? '' : String(v)).trim();

export function pasarelaDePago(pago: any): string | null {
  if (!pago || typeof pago !== 'object') return null;
  const nombre = texto(pago.proveedor || pago.formaPago).toLowerCase();
  if (!PASARELAS[nombre]) return null;
  const delAviso = pago.usuarioCarga === 'Sistema Webhook'
    || pago.usuarioRegistro === 'epayco_webhook'
    || pago.origen === 'pasarela';
  return delAviso ? PASARELAS[nombre] : null;
}

function aMs(valor: any): number {
  if (!valor) return NaN;
  if (typeof valor?.toDate === 'function') return valor.toDate().getTime();
  if (typeof valor === 'object' && Number.isFinite(valor._seconds)) return valor._seconds * 1000;
  return new Date(valor).getTime();
}

/** Estado de la devolución del pedido, o null si no aplica. `desde`: ISO de activación. */
export function devolucionPagoDe(pedido: any, desde: string | null): DevolucionPagoVista | null {
  if (!pedido) return null;
  const registrada = pedido.devolucionPago;
  if (registrada && registrada.estado === 'devuelto') return { ...registrada, estado: 'devuelto' };
  if (!ESTADOS_CANCELADOS.includes(pedido.estadoPago)) return null;
  const pagos = (Array.isArray(pedido.PagosAsentados) ? pedido.PagosAsentados : [])
    .filter((p: any) => p && p.estadoVerificacion === 'Aprobado' && pasarelaDePago(p));
  if (!pagos.length) return null;
  const inicio = aMs(desde);
  // `fechaAnulacion` la sella el servidor; justo después de cancelar en esta pantalla el pedido local
  // solo trae `fechaCancelacion` (la manda el front) hasta que se recarga.
  const cancelado = aMs(pedido.fechaAnulacion || pedido.fechaCancelacion);
  if (!Number.isFinite(inicio) || !Number.isFinite(cancelado) || cancelado < inicio) return null;
  return {
    estado: 'por_devolver',
    valor: pagos.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0),
    pasarela: pasarelaDePago(pagos[0]) || undefined,
    transaccion: texto(pagos[0].numeroComprobante),
  };
}

/** Administrador (toda la familia), Super Administrador y Tesorería: los mismos del servidor. */
export function puedeMarcarDevolucion(rol: any): boolean {
  const r = String(rol || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(r) || r === 'tesorero' || r === 'tesoreria';
}
