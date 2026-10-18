import Swal from 'sweetalert2';

/**
 * Ticket 1299 (D-493): al cancelar el pago de un pedido que ya salió, Katuq no
 * devuelve el inventario porque entiende que el cliente tiene el producto. Si
 * el pedido volvió (marcado Entregado por error, devuelto en la puerta), quien
 * cancela lo confirma y el servidor lo devuelve a la bodega de donde salió.
 *
 * Las listas son las del backend: services/inventory/devolucionPorPagoCancelado.js.
 */
const PAGOS_QUE_DEVUELVEN = ['Cancelado', 'Precancelado', 'Rechazado'];
const PROCESOS_CON_MERCANCIA_AFUERA = ['EnDespacho', 'Despachado', 'Entregado', 'Cerrado'];

const NOMBRE_PROCESO: Record<string, string> = {
  EnDespacho: 'en despacho',
  Despachado: 'despachado',
  Entregado: 'entregado',
  Cerrado: 'cerrado',
};

/** ¿Hay que preguntar si el producto volvió antes de guardar este cambio de pago? */
export function debePreguntarSiVolvio(pagoActual: string, pagoNuevo: string, proceso: string): boolean {
  return (
    !!pagoNuevo &&
    pagoNuevo !== pagoActual &&
    PAGOS_QUE_DEVUELVEN.includes(pagoNuevo) &&
    !PAGOS_QUE_DEVUELVEN.includes(pagoActual) &&
    PROCESOS_CON_MERCANCIA_AFUERA.includes(proceso)
  );
}

/**
 * Pregunta "¿El producto volvió a la bodega?".
 * @returns true (volvió), false (el cliente lo tiene) o null (no guardar).
 */
export async function preguntarSiVolvio(proceso: string): Promise<boolean | null> {
  const estado = NOMBRE_PROCESO[proceso] || 'despachado';
  const r = await Swal.fire({
    icon: 'question',
    title: '¿El producto volvió a la bodega?',
    text: `El pedido figura como ${estado}. Si el producto regresó, Katuq lo devuelve al inventario de la bodega de donde salió.`,
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Sí, volvió',
    denyButtonText: 'No, el cliente lo tiene',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#5F3FE0',
    denyButtonColor: '#6B6880',
    reverseButtons: false,
  });
  if (r.isConfirmed) return true;
  if (r.isDenied) return false;
  return null;
}
