/**
 * Errores al enviar un archivo por Instagram o Facebook, en palabras del comercio. Función pura, sin Angular.
 *
 * Lee el código que manda el servidor (`code` o `error`) y devuelve la clave de traducción que lo explica (todas
 * aceptan el parámetro `canal`). Nunca usa el `message` del servidor. Un código desconocido o un 5xx caen en la
 * clave genérica. El servidor sigue decidiendo qué se puede enviar; esto solo cambia cómo se cuenta.
 */
const CLAVES_POR_CODIGO: Record<string, string> = {
  // 200 `{success:false, motivo}` de metaSendService (no salió nada).
  ventana_cerrada: 'notificaciones.redes3.errores.ventana',
  sin_conexion: 'notificaciones.meta.failNotConnected',
  contacto_desconocido: 'notificaciones.meta.failUnknownContact',
  rechazado_por_meta: 'notificaciones.meta.failRejected',
  FUERA_DE_ALCANCE: 'notificaciones.redes3.errores.sinAcceso',
  NO_SE_PUDO_REVISAR: 'notificaciones.redes3.errores.noSePudoRevisar',
  FEATURE_DISABLED: 'notificaciones.redes3.errores.sinBandeja',
  RATE_LIMIT_EXCEEDED: 'notificaciones.redes3.errores.muyRapido',
  TOO_MANY_REQUESTS: 'notificaciones.redes3.errores.muyRapido',
  MENSAJE_MUY_LARGO: 'notificaciones.redes3.errores.textoLargo',
  // multipartAdjunto.js: el campo de texto pasa el tope de multer (422, viene en `error`).
  MEDIA_TEXTO_LARGO: 'notificaciones.redes3.errores.textoLargo',
  // redes.js: con kind=voice el archivo no es un audio que la red acepte (422).
  MEDIA_VOZ_NO_VALIDA: 'notificaciones.redes3.adjuntos.voz.noSoportado',
  MEDIA_NO_DISPONIBLE: 'notificaciones.redes3.errores.generico',
  MEDIA_VACIO: 'notificaciones.redes3.errores.vacio',
  MEDIA_MUY_PESADO: 'notificaciones.redes3.errores.pesado',
  MEDIA_TIPO_NO_PERMITIDO: 'notificaciones.redes3.errores.tipo',
  MEDIA_ID_INVALIDO: 'notificaciones.redes3.errores.idInvalido',
  MEDIA_OCUPADO: 'notificaciones.redes3.errores.ocupado',
  META_RECHAZO_ADJUNTO: 'notificaciones.redes3.errores.rechazado',
  MEDIA_RECHAZADO: 'notificaciones.redes3.errores.rechazado',
  MEDIA_SUBIDA_FALLIDA: 'notificaciones.redes3.errores.subidaFallida',
  CHAT_CON_DUENO: 'notificaciones.whatsapp.detail.ownedByOther',
};

export const CLAVE_ERROR_ARCHIVO_RED = 'notificaciones.redes3.errores.generico';

/** Código del cuerpo de un error HTTP (`code` o `error`), si es texto. */
export function codigoDeError(err: any): string {
  const cuerpo = err?.error && typeof err.error === 'object' && !(err.error instanceof Blob) ? err.error : {};
  const c = cuerpo.code || cuerpo.error;
  return typeof c === 'string' ? c : '';
}

/** Clave de traducción para un error del envío de un archivo. */
export function claveDeErrorArchivoRed(err: any): string {
  const status = Number(err?.status);
  if (status === 0) return 'notificaciones.redes3.errores.sinConexion';
  const codigo = codigoDeError(err);
  if (codigo && CLAVES_POR_CODIGO[codigo]) return CLAVES_POR_CODIGO[codigo];
  if (status === 413) return 'notificaciones.redes3.errores.pesado';
  if (status === 415) return 'notificaciones.redes3.errores.tipo';
  if (status === 429) return 'notificaciones.redes3.errores.muyRapido';
  if (status === 403) return 'notificaciones.redes3.errores.sinAcceso';
  if (status === 404) return 'notificaciones.redes3.errores.noEncontrado';
  return CLAVE_ERROR_ARCHIVO_RED;
}
