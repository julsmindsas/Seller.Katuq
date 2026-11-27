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
  // Archivos (bandeja única)
  MEDIA_VACIO: "notificaciones.wa2.adjuntos.errores.vacio",
  MEDIA_MUY_PESADO: "notificaciones.wa2.adjuntos.errores.pesado",
  MEDIA_TIPO_NO_PERMITIDO: "notificaciones.wa2.adjuntos.errores.tipo",
  MEDIA_TEXTO_LARGO: "notificaciones.wa2.adjuntos.errores.textoLargo",
  MEDIA_AUDIO_CON_TEXTO: "notificaciones.wa2.adjuntos.errores.audioConTexto",
  MEDIA_VOZ_NO_VALIDA: "notificaciones.wa2.adjuntos.errores.vozNoValida",
  MEDIA_ID_INVALIDO: "notificaciones.wa2.adjuntos.errores.idInvalido",
  MEDIA_RECHAZADO: "notificaciones.wa2.adjuntos.errores.rechazado",
  MEDIA_SUBIDA_FALLIDA: "notificaciones.wa2.adjuntos.errores.subidaFallida",
  MEDIA_OCUPADO: "notificaciones.wa2.adjuntos.errores.ocupado",
  FEATURE_DISABLED: "notificaciones.wa2.adjuntos.errores.sinBandeja",
};

export const CLAVE_ERROR_ENVIO_GENERICA = "notificaciones.wa2.errores.generico";

/** Clave de traducción para un error HTTP del chat. `generica` se usa con un 5xx o un código desconocido. */
export function claveDeErrorChat(err: any, generica: string = CLAVE_ERROR_ENVIO_GENERICA): string {
  const status = Number(err?.status);
  if (status === 0) return "notificaciones.wa2.errores.sinConexion";
  const cuerpo = err?.error && typeof err.error === "object" ? err.error : {};
  const codigo = String(cuerpo.code || cuerpo.error || "");
  // Un video que WhatsApp no acepta (.mov u otro códec): se sugiere MP4 o enviarlo como documento.
  if (codigo === "MEDIA_TIPO_NO_PERMITIDO" && cuerpo.sugerencia === "documento") {
    return "notificaciones.wa2.adjuntos.errores.videoComoDocumento";
  }
  if (codigo && CLAVES_POR_CODIGO[codigo]) return CLAVES_POR_CODIGO[codigo];
  if (status === 413) return "notificaciones.wa2.adjuntos.errores.pesado";
  if (status === 404) return "notificaciones.wa2.errores.noEncontrado";
  return generica;
}
