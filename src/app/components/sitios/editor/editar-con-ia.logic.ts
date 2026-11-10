/**
 * Editar la página con IA desde el editor (bandera `landingPrompt`) — lógica pura del chat.
 *
 * El comercio escribe lo que quiere cambiar y el servidor devuelve la página cambiada. En una página de siempre el
 * editor la pone en pantalla de una vez (entra a su historial). En una página del diseño nuevo, Opttia edita por
 * OPERACIONES (como lo hacemos a mano) y el servidor devuelve una PROPUESTA: qué cambia, qué no y por qué; la página
 * no cambia hasta que la persona toca «Aplicar cambios». Lo aplicado se autoguarda como cualquier cambio del editor y
 * «Deshacer» (o Ctrl+Z) lo quita. Quien manda sobre la función es el servidor (`requireFeature('landingPrompt')`).
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

/** Lo que Opttia no hizo de lo que se pidió, y por qué (en palabras de cualquiera, lo escribe el servidor). */
export interface RechazoIA {
  texto: string;
  motivo: string;
}

/**
 * Una propuesta de Opttia sobre una página del diseño nuevo. `contenido` es la página como quedaría (solo en memoria:
 * no se guarda en la conversación) y `huella` la de la página cuando se pidió: si la persona la cambió mientras Opttia
 * pensaba, la propuesta ya no se aplica (se pide de nuevo).
 */
export interface PropuestaIA {
  estado: 'pendiente' | 'aplicada' | 'descartada' | 'vencida';
  pagina: number;
  huella: string;
  contenido?: { bloques: any[]; tema: any; tiendaCambios: { [clave: string]: any } };
}

export interface MensajeEditarIA {
  rol: 'comercio' | 'ia';
  texto: string;
  error?: boolean;
  /** Lo que cambió en la página con este mensaje (o, en una propuesta, lo que cambiaría). */
  cambios?: CambioIA[];
  /** Lo que no se hizo y por qué. */
  rechazos?: RechazoIA[];
  /** Lo que conviene saber (promesas que se confirman al publicar, plano oculto…). */
  avisos?: string[];
  /** Diseño nuevo: la propuesta que la persona aplica o descarta. */
  propuesta?: PropuestaIA;
  /** La sección que la persona señaló en «¿Dónde?» (solo para mostrarla en su mensaje). */
  lugar?: string;
  /** Cuántas imágenes acompañaron el mensaje (solo para mostrar "📎 2 imágenes"). */
  adjuntos?: number;
  /** Ticket 1248: pendientes del checklist con su botón para corregir (no se guardan en la conversación). */
  pendientes?: { texto: string; critico?: boolean; ir?: () => void }[];
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
      ...(Array.isArray(m.rechazos) && m.rechazos.length ? { rechazos: m.rechazos.slice(0, 12) } : {}),
      ...(Array.isArray(m.avisos) && m.avisos.length ? { avisos: m.avisos.slice(0, 8) } : {}),
      // La página propuesta no se guarda en el navegador: tras recargar, una propuesta pendiente ya no se puede aplicar.
      ...(m.propuesta ? { propuesta: { estado: m.propuesta.estado === 'pendiente' ? 'vencida' : m.propuesta.estado, pagina: m.propuesta.pagina, huella: '' } } : {}),
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
  // D-688: pedidos de diseño de toda la página.
  'Haz que mi página se vea más profesional',
  'Dale a toda la página un estilo elegante',
  'Haz el título de la portada más llamativo',
  'Cambia los colores a tonos más elegantes',
  'Agrega preguntas frecuentes sobre envíos y pagos',
  'Pon el catálogo justo después de la portada',
  'Pon la portada a pantalla completa',
  'Agrega una sección que cuente nuestra historia',
  // Ticket 1248.
  'Muestra el botón de WhatsApp solo en celular',
  '¿Por qué no puedo publicar?',
];

/**
 * Diseño nuevo (PLAN-V2 T27): ideas para una página con `tema.sistemaVisual: 2`. El servidor solo aplica lo del diseño
 * nuevo en esas páginas (bandera `siteDesignV2`); en las demás, las ideas son las de siempre.
 */
export const SUGERENCIAS_EDITAR_IA_V2: ReadonlyArray<string> = [
  // D-688: pedidos de diseño de toda la página.
  'Haz que mi página se vea más profesional',
  'Dale a toda la página un estilo moderno y limpio',
  'Pon la portada como carrusel con fotos que ya tengo, cada una con su texto',
  'Arma la vitrina con pestañas: en la casa, en el negocio y para moverte',
  'Ponle un ícono a cada categoría',
  'Pon el catálogo en el inicio con 8 productos',
  'Convierte el contacto en un cotizador por pasos',
  'Ponle nombre a las preguntas frecuentes y agrégalas al menú',
  'Sube el movimiento de la página a expresivo',
  '¿Por qué no puedo publicar?',
];

/** Las ideas para empezar según el diseño de la página. */
export function sugerenciasEditarIA(disenoNuevo: boolean): ReadonlyArray<string> {
  return disenoNuevo ? SUGERENCIAS_EDITAR_IA_V2 : SUGERENCIAS_EDITAR_IA;
}

/**
 * Ticket 1248: «¿por qué no puedo publicar?», «¿qué me falta para publicar?».
 * Se responde con el checklist real del editor, sin IA. Una orden («publica la
 * página») no entra: eso es el botón Publicar.
 */
export function preguntaPorPublicar(texto: string): boolean {
  return /(por ?qu[eé]|no (puedo|me deja|se puede)|qu[eé] (me )?falta|qu[eé] necesito)[^.]{0,40}public/i.test(String(texto || ''));
}

/**
 * Huella corta de un valor (la de la página cuando se pidió una propuesta). No es criptográfica: solo dice si la página
 * cambió entre el pedido y el clic en «Aplicar cambios».
 */
export function huellaDe(valor: any): string {
  const texto = JSON.stringify(valor === undefined ? null : valor);
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return `${texto.length.toString(36)}.${(h >>> 0).toString(36)}`;
}

/** Las claves de la tienda que la edición por operaciones lee o cambia (lo demás de la tienda no viaja). */
export const CLAVES_TIENDA_IA: ReadonlyArray<string> = ['fichas', 'categoriasInfo', 'fotoGenerica', 'promesasConfirmadas', 'categoriasOcultas', 'categoriasMostradas'];

export function tiendaParaIA(tienda: any): { [clave: string]: any } {
  const t = tienda && typeof tienda === 'object' ? tienda : {};
  const salida: { [clave: string]: any } = {};
  for (const k of CLAVES_TIENDA_IA) if (t[k] !== undefined) salida[k] = t[k];
  return salida;
}

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
