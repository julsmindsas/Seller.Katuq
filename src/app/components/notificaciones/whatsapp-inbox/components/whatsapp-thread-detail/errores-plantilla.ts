/**
 * Errores de «Enviar plantilla» desde el chat (POST /v1/whatsapp/conversations/:phoneHash/plantilla), en
 * palabras del comercio. Función pura, sin Angular.
 *
 * Primero mira los códigos propios de esta ruta (los de `start-conversation`: no contactar, saldo, datos de la
 * plantilla) y lo demás lo resuelve el traductor del chat (`claveDeErrorChat` de errores-envio.ts): sin conexión,
 * FUERA_DE_ALCANCE, CHAT_CON_DUENO, LINE_LOOKUP_FAILED, 404… Nunca usa el `message` del servidor.
 */
import { claveDeErrorChat } from "../../errores-envio";

export const CLAVE_ERROR_PLANTILLA_GENERICA = "notificaciones.cierre2.plantilla.errores.generico";

const CLAVES_PLANTILLA: Record<string, string> = {
  // 422: el cliente pidió no recibir mensajes (lista de no contactar).
  opted_out: "notificaciones.cierre2.plantilla.errores.noContactar",
  // 503: no se pudo leer la lista de no contactar o el saldo; no se envió nada.
  OPTOUT_UNAVAILABLE: "notificaciones.cierre2.plantilla.errores.noSePudoRevisar",
  SALDO_NO_DISPONIBLE: "notificaciones.cierre2.plantilla.errores.noSePudoRevisar",
  // 402: saldo o cuenta.
  INSUFFICIENT_BALANCE: "notificaciones.wa2.errores.sinSaldo",
  ACCOUNT_NOT_ACTIVE: "notificaciones.cierre2.plantilla.errores.cuentaInactiva",
  // 400 / 422: datos del envío.
  missing_fields: "notificaciones.cierre2.plantilla.errores.elige",
  invalid_variables: "notificaciones.cierre2.plantilla.errores.datos",
  invalid_phone_hash: "notificaciones.wa2.errores.noEncontrado",
  not_found: "notificaciones.wa2.errores.noEncontrado",
  invalid_line_id: "notificaciones.wa2.errores.linea",
  // 400: el proveedor no envió la plantilla (el saldo reservado se devuelve).
  send_failed: "notificaciones.wa2.errores.whatsappRechazo",
  // 429 del freno de envíos.
  RATE_LIMIT_EXCEEDED: "notificaciones.redes3.errores.muyRapido",
  TOO_MANY_REQUESTS: "notificaciones.redes3.errores.muyRapido",
};

/** Clave de traducción para un error del envío de una plantilla desde el chat. */
export function claveDeErrorPlantilla(err: any): string {
  const cuerpo = err?.error && typeof err.error === "object" ? err.error : {};
  const codigo = String(cuerpo.code || cuerpo.error || "");
  if (codigo && CLAVES_PLANTILLA[codigo]) return CLAVES_PLANTILLA[codigo];
  if (Number(err?.status) === 429) return "notificaciones.redes3.errores.muyRapido";
  return claveDeErrorChat(err, CLAVE_ERROR_PLANTILLA_GENERICA);
}
