import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
  EnDespacho: 'pedidoMercanciaDevuelta.proceso.enDespacho',
  Despachado: 'pedidoMercanciaDevuelta.proceso.despachado',
  Entregado: 'pedidoMercanciaDevuelta.proceso.entregado',
  Cerrado: 'pedidoMercanciaDevuelta.proceso.cerrado',
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
export async function preguntarSiVolvio(proceso: string, translate: TranslateService): Promise<boolean | null> {
  const estado = translate.instant(NOMBRE_PROCESO[proceso] || NOMBRE_PROCESO['Despachado']);
  const r = await Swal.fire({
    icon: 'question',
    title: translate.instant('pedidoMercanciaDevuelta.titulo'),
    text: translate.instant('pedidoMercanciaDevuelta.texto', { estado }),
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: translate.instant('pedidoMercanciaDevuelta.siVolvio'),
    denyButtonText: translate.instant('pedidoMercanciaDevuelta.noClienteLoTiene'),
    cancelButtonText: translate.instant('pedidoMercanciaDevuelta.cancelar'),
    confirmButtonColor: '#5F3FE0',
    denyButtonColor: '#6B6880',
    reverseButtons: false,
  });
  if (r.isConfirmed) return true;
  if (r.isDenied) return false;
  return null;
}
