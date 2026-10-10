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

/** Un renglón de "Esto cambié", ya en palabras de cualquiera (lo arma el servidor). */
export interface CambioIA {
  icono: string;
  texto: string;
  /** Muestras de color para pintar (nunca se le muestran códigos a la persona). */
  colores?: string[];
}

export interface MensajeEditarIA {
  rol: 'comercio' | 'ia';
  texto: string;
  error?: boolean;
  /** Lo que cambió en la página con este mensaje. */
  cambios?: CambioIA[];
  /** Cuántas imágenes acompañaron el mensaje (solo para mostrar "📎 2 imágenes"). */
  adjuntos?: number;
}

// ── Archivos que se le muestran a la IA ─────────────────────────────────────────────────────────
export const MAX_REFERENCIAS = 3;
export const MAX_MB_ARCHIVO = 20;

/** "imagen", "pdf" o null si no se puede usar. */
export function clasificarArchivo(archivo: { type?: string; name?: string; size?: number } | null | undefined): 'imagen' | 'pdf' | null {
  if (!archivo) return null;
  const tipo = String(archivo.type || '').toLowerCase();
  const nombre = String(archivo.name || '').toLowerCase();
  if (/^image\/(jpeg|jpg|png|webp)$/.test(tipo) || /\.(jpe?g|png|webp)$/.test(nombre)) return 'imagen';
  if (tipo === 'application/pdf' || nombre.endsWith('.pdf')) return 'pdf';
  return null;
}

/** Por qué no se puede usar un archivo, en palabras de cualquiera; '' si sí se puede. */
export function problemaConArchivo(archivo: { type?: string; name?: string; size?: number } | null | undefined): string {
  if (!clasificarArchivo(archivo)) return 'Ese archivo no lo puedo ver. Usa una foto o captura (JPG, PNG o WebP) o un PDF.';
  if (Number((archivo as any).size) > MAX_MB_ARCHIVO * 1024 * 1024) return `Ese archivo pesa más de ${MAX_MB_ARCHIVO} MB. Prueba con una captura de pantalla.`;
  return '';
}

/** Lo que se le muestra a la persona mientras la IA trabaja, según cuánto lleva. */
export function textoAvance(segundos: number, imagenes: number): string {
  if (imagenes > 0 && segundos < 4) return imagenes === 1 ? 'Mirando tu imagen…' : `Mirando tus ${imagenes} imágenes…`;
  if (imagenes > 0 && segundos < 9) return 'Entendiendo los colores, la letra y el estilo…';
  if (segundos < 12) return 'Aplicando los cambios a tu página…';
  return 'Ya casi: dejando todo en orden…';
}

// ── La conversación se recuerda en este navegador (sin imágenes) ────────────────────────────────
export const MENSAJES_GUARDADOS = 30;

export function llaveConversacion(siteId: string): string {
  return `katuq:editor-ia:${siteId}`;
}

export function serializarConversacion(mensajes: MensajeEditarIA[]): string {
  return JSON.stringify(
    (mensajes || []).slice(-MENSAJES_GUARDADOS).map((m) => ({
      rol: m.rol,
      texto: String(m.texto || '').slice(0, 1200),
      ...(m.error ? { error: true } : {}),
      ...(Array.isArray(m.cambios) && m.cambios.length ? { cambios: m.cambios.slice(0, 12) } : {}),
      ...(m.adjuntos ? { adjuntos: m.adjuntos } : {}),
    })),
  );
}

export function leerConversacion(texto: string | null | undefined): MensajeEditarIA[] {
  try {
    const datos = JSON.parse(String(texto || '[]'));
    if (!Array.isArray(datos)) return [];
    return datos
      .filter((m) => m && (m.rol === 'comercio' || m.rol === 'ia') && typeof m.texto === 'string')
      .slice(-MENSAJES_GUARDADOS);
  } catch (_) {
    return [];
  }
}

/** Ideas para empezar: tocar una la pone en el cuadro. */
export const SUGERENCIAS_EDITAR_IA: ReadonlyArray<string> = [
  'Haz el título de la portada más llamativo',
  'Cambia los colores a tonos más elegantes',
  'Agrega preguntas frecuentes sobre envíos y pagos',
  'Pon el catálogo justo después de la portada',
  'Pon la portada a pantalla completa',
  'Agrega una sección que cuente nuestra historia',
];

/** Tipo plano a propósito: el proyecto compila sin `strictNullChecks` y ahí una unión no se estrecha con `!ok`. */
export interface ResultadoInstruccion {
  ok: boolean;
  instruccion: string;
  mensaje: string;
}

export function validarInstruccion(texto: string): ResultadoInstruccion {
  const instruccion = String(texto == null ? '' : texto).replace(/\s+/g, ' ').trim();
  if (instruccion.length < INSTRUCCION_MIN) {
    return { ok: false, instruccion: '', mensaje: 'Escribe qué quieres cambiar de la página (por ejemplo: «pon un título más llamativo»).' };
  }
  return { ok: true, instruccion: instruccion.slice(0, INSTRUCCION_MAX), mensaje: '' };
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
