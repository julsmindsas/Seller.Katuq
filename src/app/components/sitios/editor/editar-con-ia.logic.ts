/**
 * Editar la página con IA desde el editor (bandera `landingPrompt`) — lógica pura del chat.
 *
 * El comercio escribe lo que quiere cambiar y el servidor devuelve la página cambiada; el editor la
 * pone en pantalla (entra a su historial) y NO guarda hasta que la persona toque Guardar. Quien
 * manda sobre la función es el servidor (`requireFeature('landingPrompt')`).
 */

export const INSTRUCCION_MIN = 3;
export const INSTRUCCION_MAX = 600;
/** Mensajes previos que viajan para dar contexto ("ahora ponlo más corto"). */
export const HISTORIAL_MAX = 6;

export interface MensajeEditarIA {
  rol: 'comercio' | 'ia';
  texto: string;
  error?: boolean;
}

/** Ideas para empezar: tocar una la pone en el cuadro. */
export const SUGERENCIAS_EDITAR_IA: ReadonlyArray<string> = [
  'Haz el título de la portada más llamativo',
  'Cambia los colores a tonos más elegantes',
  'Agrega preguntas frecuentes sobre envíos y pagos',
  'Pon el catálogo justo después de la portada',
];

export type ResultadoInstruccion = { ok: true; instruccion: string } | { ok: false; mensaje: string };

export function validarInstruccion(texto: string): ResultadoInstruccion {
  const instruccion = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  if (instruccion.length < INSTRUCCION_MIN) {
    return { ok: false, mensaje: 'Escribe qué quieres cambiar de la página (por ejemplo: «pon un título más llamativo»).' };
  }
  return { ok: true, instruccion: instruccion.slice(0, INSTRUCCION_MAX) };
}

/** Los últimos mensajes buenos, como los entiende el servidor. Los errores no se mandan. */
export function historialParaServidor(mensajes: MensajeEditarIA[]): { rol: 'comercio' | 'ia'; texto: string }[] {
  return (mensajes || [])
    .filter((m) => m && !m.error && typeof m.texto === 'string' && m.texto.trim())
    .slice(-HISTORIAL_MAX)
    .map((m) => ({ rol: m.rol, texto: m.texto.slice(0, 300) }));
}

/** El mensaje para el comercio cuando falla el envío. Sin jerga: el del servidor ya viene escrito para él. */
export function mensajeDeErrorEditarIA(error: any): string {
  const mensaje = error && error.error && typeof error.error.message === 'string' ? error.error.message.trim() : '';
  if (mensaje) return mensaje;
  if (error && error.status === 0) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return 'No pude aplicar el cambio esta vez. Inténtalo de nuevo en un momento.';
}
