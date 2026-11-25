import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { escaparHtml } from './escapar-html';
import { DevolucionPagoVista } from './devolucion-pago';
import { DevolucionPagoService } from '../services/ventas/devolucion-pago.service';

/** Lo que la ventana necesita del pedido: id, valor, pasarela y transacción. */
export interface PedidoPorDevolver {
  id: string;
  valor?: number;
  pasarela?: string | null;
  transaccion?: string | null;
}

/**
 * D-723 / D-724: ventana «Marcar pago como devuelto» (lista de pedidos y tablero de Tesorería).
 * Pide la referencia de la pasarela (obligatoria), la fecha (hoy en Colombia, no futura) y una
 * observación; el servidor vuelve a validar todo. Devuelve el registro guardado o null si se cancela.
 */
export async function abrirMarcarDevuelto(
  servicio: DevolucionPagoService,
  pedido: PedidoPorDevolver,
): Promise<DevolucionPagoVista | null> {
  const valor = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
    .format(Number(pedido.valor) || 0);
  const pasarela = escaparHtml(pedido.pasarela || 'la pasarela');
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const result = await Swal.fire({
    title: 'Marcar pago como devuelto',
    html: `
      <p style="text-align:left">El cliente pagó <strong>${escaparHtml(valor)}</strong> con <strong>${pasarela}</strong>
      (transacción <strong>${escaparHtml(pedido.transaccion || 'sin número')}</strong>) y el pedido se canceló.</p>
      <p style="text-align:left" class="text-muted">Katuq no devuelve el dinero: hazlo primero en el panel de ${pasarela} y escribe aquí la referencia que te dio.</p>
      <label for="devRef" style="display:block;text-align:left;font-weight:600;margin-top:12px">Referencia de la devolución *</label>
      <input id="devRef" class="swal2-input" style="margin:6px 0 0;width:100%" maxlength="120" autocomplete="off" placeholder="Ej.: la referencia de la devolución en ${pasarela}">
      <label for="devFecha" style="display:block;text-align:left;font-weight:600;margin-top:12px">Fecha de la devolución</label>
      <input id="devFecha" type="date" class="swal2-input" style="margin:6px 0 0;width:100%" value="${hoy}" max="${hoy}">
      <label for="devObs" style="display:block;text-align:left;font-weight:600;margin-top:12px">Observación (opcional)</label>
      <textarea id="devObs" class="swal2-textarea" style="margin:6px 0 0;width:100%" maxlength="500"></textarea>
    `,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#5F3FE0',
    confirmButtonText: 'Marcar como devuelto',
    cancelButtonText: 'Cancelar',
    focusConfirm: false,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: () => {
      const referencia = ((document.getElementById('devRef') as HTMLInputElement)?.value || '').trim();
      const fechaDevolucion = ((document.getElementById('devFecha') as HTMLInputElement)?.value || '').trim();
      const observacion = ((document.getElementById('devObs') as HTMLTextAreaElement)?.value || '').trim();
      if (!referencia) {
        Swal.showValidationMessage('Escribe la referencia de la devolución.');
        return false;
      }
      return firstValueFrom(servicio.marcarDevuelto(pedido.id, { referencia, fechaDevolucion, observacion }))
        .catch((error) => {
          Swal.showValidationMessage(error?.error?.message || 'No pudimos guardar la devolución.');
          return null;
        });
    },
  });
  const registro = result.isConfirmed ? (result.value as DevolucionPagoVista | null) : null;
  if (!registro) return null;
  Swal.fire({
    icon: 'success',
    title: 'Pago marcado como devuelto',
    text: `Quedó registrado con la referencia ${registro.referencia}.`,
    confirmButtonColor: '#5F3FE0',
  });
  return registro;
}
