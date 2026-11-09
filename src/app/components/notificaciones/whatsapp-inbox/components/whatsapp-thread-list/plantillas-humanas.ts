/**
 * Texto para el comercio cuando la vista previa de un chat trae el nombre
 * técnico de una plantilla de WhatsApp (ticket 1528).
 */
const TEXTOS_PLANTILLA: Record<string, string> = {
  // Nombres reales de las plantillas que envía el backend (sin el sufijo _vN).
  katuq_order_created: 'Recibimos tu pedido',
  katuq_order_confirm: 'Confirmamos tu pedido',
  katuq_payment_approved: 'Tu pago fue aprobado',
  katuq_production_completed: 'Tu pedido está listo',
  katuq_order_dispatched: 'Te avisamos que tu pedido salió',
  katuq_order_delivered: 'Tu pedido fue entregado',
  katuq_order_rejected: 'Tu pedido no pudo procesarse',
  katuq_cobro_recordatorio: 'Recordatorio de pago',
  katuq_cart_reminder: 'Recordatorio de tu carrito',
  katuq_retomar_conversacion: 'Retomamos la conversación',
};

export const TEXTO_PLANTILLA_GENERICO = 'Mensaje automático de Katuq';

/** Nombre técnico de plantilla: una sola palabra en minúsculas con guiones bajos. */
export function esNombreTecnicoPlantilla(texto: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test((texto || '').trim());
}

/** Devuelve el texto humano si es un nombre de plantilla; si no, el mismo texto. */
export function textoHumanoDePlantilla(texto: string): string {
  const limpio = (texto || '').trim();
  if (!esNombreTecnicoPlantilla(limpio)) {
    return texto;
  }
  const base = limpio.replace(/_v\d+$/, '');
  return TEXTOS_PLANTILLA[base] || TEXTO_PLANTILLA_GENERICO;
}
