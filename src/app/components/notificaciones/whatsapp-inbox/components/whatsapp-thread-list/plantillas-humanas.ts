/**
 * Texto para el comercio cuando la vista previa de un chat trae el nombre
 * técnico de una plantilla de WhatsApp (ticket 1528) o el tipo interno de un
 * envío (REPLY_INBOUND, BOT_REPLY…) en vez de lo que se dijo.
 *
 * Sin `traducir` devuelve el texto en español (así lo usa la lista de la
 * bandeja); con él, el del idioma de la pantalla.
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

/**
 * Tipos internos de un envío (en MAYÚSCULA) que una respuesta vieja del servidor
 * puede mandar como vista previa cuando el mensaje no guardó su texto.
 */
const TEXTOS_TIPO_ENVIO: Record<string, string> = {
  REPLY_INBOUND: 'Respuesta enviada',
  BOT_REPLY: 'Respuesta del asistente',
  SYSTEM_REPLY: 'Aviso automático',
  ORDER_CONFIRM_REPLY: 'Confirmación de pedido',
  BUSINESS_APP_ECHO: 'Mensaje enviado desde el celular',
  BUSINESS_APP_HISTORY: 'Mensaje enviado desde el celular',
};

export const TEXTO_PLANTILLA_GENERICO = 'Mensaje automático de Katuq';
const TEXTO_TIPO_GENERICO = 'Mensaje enviado';

const CLAVE_PLANTILLA_GENERICA = 'notificaciones.wa2.plantillas.generico';
const CLAVE_TIPO_GENERICO = 'notificaciones.wa2.tiposEnvio.generico';

/** Traductor opcional (por ejemplo `k => translate.instant(k)`). */
export type Traductor = (clave: string) => string;

/** Quita los corchetes con que el servidor envuelve el nombre de la plantilla («[katuq_x_v2]»). */
function sinCorchetes(texto: string): string {
  const limpio = (texto || '').trim();
  const m = /^\[([^\]]+)\]$/.exec(limpio);
  return m ? m[1].trim() : limpio;
}

function esNombrePlantilla(texto: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(texto);
}

function esTipoEnvio(texto: string): boolean {
  return /^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(texto);
}

/**
 * Nombre técnico de plantilla o de tipo de envío: una sola palabra con guiones
 * bajos, toda en minúsculas o toda en MAYÚSCULAS, con o sin corchetes.
 */
export function esNombreTecnicoPlantilla(texto: string): boolean {
  const limpio = sinCorchetes(texto);
  return esNombrePlantilla(limpio) || esTipoEnvio(limpio);
}

/** Devuelve el texto humano si es un nombre técnico; si no, el mismo texto. */
export function textoHumanoDePlantilla(texto: string, traducir?: Traductor): string {
  const limpio = sinCorchetes(texto);
  if (esTipoEnvio(limpio)) {
    const conocido = !!TEXTOS_TIPO_ENVIO[limpio];
    if (traducir) return traducir(conocido ? `notificaciones.wa2.tiposEnvio.${limpio}` : CLAVE_TIPO_GENERICO);
    return TEXTOS_TIPO_ENVIO[limpio] || TEXTO_TIPO_GENERICO;
  }
  if (!esNombrePlantilla(limpio)) {
    return texto;
  }
  const base = limpio.replace(/_v\d+$/, '');
  const conocida = !!TEXTOS_PLANTILLA[base];
  if (traducir) return traducir(conocida ? `notificaciones.wa2.plantillas.${base}` : CLAVE_PLANTILLA_GENERICA);
  return TEXTOS_PLANTILLA[base] || TEXTO_PLANTILLA_GENERICO;
}
