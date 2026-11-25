import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { escaparHtml } from './escapar-html';
import { AvisoPago, DevolucionPagoService } from '../services/ventas/devolucion-pago.service';

/**
 * D-725: ventana «Avisos de pago» del pedido. Muestra cada aviso que la pasarela mandó (Wompi,
 * ePayco y luego Bold): cuándo, qué estado reportó, transacción, monto, si la firma pasó y qué hizo
 * Katuq. Solo lectura, para soporte, Administración y Tesorería.
 */
export async function abrirAvisosPago(servicio: DevolucionPagoService, pedido: { _id: string; nroPedido?: string }): Promise<void> {
  Swal.fire({ title: 'Avisos de pago', text: 'Cargando…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  let datos;
  try {
    datos = await firstValueFrom(servicio.avisos(pedido._id));
  } catch (error: any) {
    Swal.fire({ icon: 'error', title: 'Avisos de pago', text: error?.error?.message || 'No pudimos cargar los avisos de pago.', confirmButtonColor: '#5F3FE0' });
    return;
  }
  const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) : '—');
  const colorAccion: Record<string, string> = { aplicado: '#15803D', ignorado: '#B45309', rechazado: '#B91C1C', fallo: '#B91C1C' };
  const firma = (f: AvisoPago['firma']) => (f === 'valida' ? '✔ Válida' : f === 'invalida' ? '✘ Inválida' : '— Sin revisar');
  const r = datos.resumen;
  const filas = datos.avisos.map((a) => `
    <tr>
      <td style="white-space:nowrap">${escaparHtml(fecha(a.fecha))}</td>
      <td>${escaparHtml(a.pasarela || '')}</td>
      <td><strong>${escaparHtml(a.estadoReportado || '—')}</strong></td>
      <td style="font-size:12px;word-break:break-all">${escaparHtml(a.transaccion || '—')}</td>
      <td style="text-align:right;white-space:nowrap">${a.monto === null ? '—' : escaparHtml(pesos.format(a.monto))}</td>
      <td style="white-space:nowrap;color:${a.firma === 'invalida' ? '#B91C1C' : '#4B5563'}">${firma(a.firma)}</td>
      <td style="color:${colorAccion[a.tipo] || '#211F3A'};font-weight:600">${escaparHtml(a.accion || '')}</td>
    </tr>`).join('');
  const tabla = datos.avisos.length
    ? `<div style="overflow-x:auto;text-align:left"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#F4F1FD;color:#6B6890;font-size:11px;text-transform:uppercase">
          <th style="padding:8px">Fecha</th><th style="padding:8px">Pasarela</th><th style="padding:8px">Estado que reportó</th>
          <th style="padding:8px">Transacción</th><th style="padding:8px;text-align:right">Monto</th><th style="padding:8px">Firma</th>
          <th style="padding:8px">Qué hizo Katuq</th></tr></thead>
        <tbody>${filas}</tbody></table></div>`
    : '<p>Este pedido no tiene avisos de pago de ninguna pasarela.</p>';
  Swal.fire({
    title: `Avisos de pago · ${escaparHtml(datos.pedido.nroPedido || pedido.nroPedido || '')}`,
    width: 1000,
    html: !datos.avisos.length ? tabla : `
      <p style="text-align:left;margin-bottom:12px">${r.total} aviso(s): <strong style="color:#15803D">${r.aplicados} aplicado(s)</strong>,
        <strong style="color:#B45309">${r.ignorados} ignorado(s)</strong>, <strong style="color:#B91C1C">${r.rechazados} rechazado(s) por firma</strong>
        y <strong style="color:#B91C1C">${r.fallidos} fallido(s)</strong>. Del más reciente al más viejo.</p>
      ${tabla}`,
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#5F3FE0',
  });
}
