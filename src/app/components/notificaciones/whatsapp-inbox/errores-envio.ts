/**
 * Errores del chat de WhatsApp en palabras del comercio. Función pura, sin Angular.
 *
 * Lee el código que manda el servidor (`error.code` o `error.error`) y devuelve la clave de traducción que
 * lo explica. Nunca devuelve el `message` del servidor: viene en otro idioma, con siglas («HSM») o con
 * voseo. Un código que no conoce (o un 5xx) cae en la clave genérica que pasa quien llama.
 *
 * El servidor sigue decidiendo qué se puede enviar; esto solo cambia cómo se cuenta el error.
 */
const CLAVES_POR_CODIGO: Record<string, string> = {
  OUTSIDE_24H_WINDOW: "notificaciones.wa2.errores.ventana",
  NO_BALANCE: "notificaciones.wa2.errores.sinSaldo",
  inbound_lookup_failed: "notificaciones.wa2.errores.revisarVentana",
  line_lookup_failed: "notificaciones.wa2.errores.linea",
  LINE_LOOKUP_FAILED: "notificaciones.wa2.errores.linea",
  FUERA_DE_ALCANCE: "notificaciones.wa2.errores.sinAcceso",
  THREAD_NOT_FOUND: "notificaciones.wa2.errores.noEncontrado",
  invalid_text: "notificaciones.wa2.errores.textoInvalido",
  kapso_send_failed: "notificaciones.wa2.errores.whatsappRechazo",
  debit_failed_after_send: "notificaciones.wa2.errores.cobro",
  CHAT_CON_DUENO: "notificaciones.whatsapp.detail.ownedByOther",
  ownedByOther: "notificaciones.whatsapp.detail.ownedByOther",
};

export const CLAVE_ERROR_ENVIO_GENERICA = "notificaciones.wa2.errores.generico";

/** Clave de traducción para un error HTTP del chat. `generica` se usa con un 5xx o un código desconocido. */
export function claveDeErrorChat(err: any, generica: string = CLAVE_ERROR_ENVIO_GENERICA): string {
  const status = Number(err?.status);
  if (status === 0) return "notificaciones.wa2.errores.sinConexion";
  const cuerpo = err?.error && typeof err.error === "object" ? err.error : {};
  const codigo = String(cuerpo.code || cuerpo.error || "");
  if (codigo && CLAVES_POR_CODIGO[codigo]) return CLAVES_POR_CODIGO[codigo];
  if (status === 404) return "notificaciones.wa2.errores.noEncontrado";
  return generica;
}
