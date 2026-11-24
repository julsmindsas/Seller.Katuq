import { escaparHtml } from './escapar-html';

/**
 * Referencia de un pedido en DistriSex (D-718), tal como se muestra junto al
 * número del pedido en «Todos los pedidos» y en Despachos.
 *
 * Con el pedido ya enviado: `DSX-<número>` y, en el tooltip, su estado allá, la
 * transportadora y la última consulta (se actualiza cada 30 min). Sin enviar:
 * «DSX sin enviar» con el mensaje con el que DistriSex o Katuq lo rechazó.
 * El tooltip es HTML: todo dato que venga de fuera se escapa.
 */
export interface ReferenciaDistrisex {
  label: string;
  tooltip: string;
  alerta: boolean;
}

const ESTADOS: Record<string, string> = {
  'pending': 'Pendiente',
  'on-hold': 'En revisión',
  'processing': 'En proceso',
  'completed': 'Aprobado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
  'failed': 'Fallido',
};

function fecha(valor: any): string {
  if (!valor) { return ''; }
  const segundos = valor?._seconds ?? valor?.seconds;
  const d = segundos != null ? new Date(segundos * 1000) : new Date(valor);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

/** @param pedido el pedido de Katuq (lee `integrations.distrisex`) */
export function referenciaDistrisex(pedido: any): ReferenciaDistrisex | null {
  const dsx = pedido?.integrations?.distrisex;
  if (!dsx) { return null; }
  const parts: string[] = [];

  if (!dsx.orderId) {
    if (!dsx.error) { return null; }
    parts.push('<strong>DistriSex no recibió el pedido</strong>');
    parts.push(escaparHtml(dsx.error.message || dsx.error.code || 'Sin detalle del error.'));
    const intento = fecha(dsx.lastErrorAt);
    if (intento) { parts.push(`Último intento: ${intento}`); }
    return { label: 'DSX sin enviar', tooltip: parts.join('<br>'), alerta: true };
  }

  const estado = String(dsx.status || '').toLowerCase();
  parts.push('<strong>DistriSex</strong>');
  if (dsx.status) {
    parts.push(`Estado: <b>${escaparHtml(ESTADOS[estado] || dsx.status)}</b>`);
  }
  if (dsx.carrier) {
    parts.push(`Transportadora: ${escaparHtml(dsx.carrier)}`);
  }
  const alerta = dsx.needsAttention === true;
  if (alerta) {
    parts.push(estado === 'cancelled'
      ? '⚠️ DistriSex canceló este pedido.'
      : '⚠️ Cancelado en Katuq, pero DistriSex lo sigue teniendo activo: avisa a tu asesor de DistriSex.');
  }
  const consulta = fecha(dsx.lastStatusSync);
  if (consulta) { parts.push(`Última consulta: ${consulta}`); }
  return { label: `DSX-${dsx.orderId}`, tooltip: parts.join('<br>'), alerta };
}
