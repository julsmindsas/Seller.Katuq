/**
 * Fotos de producto uniformes — parte PURA (sin Angular, sin DOM). D-501, ticket 1252.
 *
 * Qué se manda al servidor (/v1/product-photos), cómo se recuerdan los ajustes, cómo se lee un
 * lote y qué texto ve la persona por cada código. Lo vigilan `tests/productos/fotos-uniformes.test.js`.
 *
 * TX-37 · 7.10 (D-518, anexo §G): la categoría viaja como `categoryPath` (ruta del árbol, de 1 a 3
 * nombres; incluye sus subcategorías), una selección de más de 100 productos es una serie de lotes
 * seguidos (`GET /series/:id`) y aquí están los mensajes de TODOS los códigos nuevos de §G (fase 1,
 * fase 1b y fase 2), para tocar este archivo una sola vez.
 *
 * TX-37 · 8.6 y 9.10 (D-518): origen de las fotos copiadas o adoptadas (fase 1b) y «Quitar fondo»
 * (fase 2): qué se manda (`settings.backgroundMode` y `backgroundScope`, solo si el servidor lo
 * ofrece), cuántos usos necesita y cuántos quedan, y los conteos del resumen. Nunca el nombre del
 * proveedor ni del modelo (Artículo VI).
 *
 * Reglas:
 *  - Los mensajes son para el comercio: sin jerga, sin nombres de proveedores (Artículo VI) y sin
 *    la palabra «token».
 *  - Quien manda es el servidor: la bandera `productPhotoUniform`, el interruptor del servidor y
 *    el rol se revisan allá. Aquí solo se decide qué se MUESTRA.
 */

import { parse } from 'flatted';

import { SEPARADOR, claveCategoria, claveDeRuta, documentoDeCategorias, rutasDelArbol } from '../catalogo/atributos-categoria';

export type ModoFotos = 'off' | 'shadow' | 'on';
export type Proporcion = '1:1' | '4:5' | '3:4';
export type Fondo = 'white' | 'light_gray' | 'brand';

export interface AjustesFotos {
  aspect: Proporcion;
  background: Fondo;
  marginPct: number;
}

export interface ConfigFotos {
  mode: ModoFotos;
  defaults: AjustesFotos;
  aspects: Proporcion[];
  backgrounds: Fondo[];
  brandColor: string | null;
  /** `maxSeriesProducts` (TX-37 · 7.8): tope de una serie; si falta, el de un lote (sin serie, nunca sin tope). */
  limits: { maxProducts: number; maxSeriesProducts?: number; maxPhotosPerProduct: number; previewMaxPhotos: number };
  canApply: boolean;
  /**
   * TX-37 · 9.10 (anexo §G.1): `available` = bandera, proveedor y uso en regla, y la persona es
   * administrador con el modo encendido; `previewAvailable` = además el modo en `on` (la vista previa
   * con «Quitar fondo» gasta usos). Un servidor anterior no lo manda: no se ofrece.
   */
  backgroundRemoval?: { available: boolean; previewAvailable: boolean } | null;
  /** Usos de «Quitar fondo» que le quedan a la empresa este mes; null = no se sabe o no aplica. */
  aiUsesLeft?: number | null;
}

/** De dónde salió una foto que se copió o adoptó (fase 1b): un enlace o un archivo sin dueño. */
export type OrigenCopia = 'link' | 'unowned';

export interface Muestra {
  productId: string;
  index: number;
  before: string;
  after: { dataUrl: string; warnings: string[] };
  /** Fase 1b: la foto se copiaría a las fotos de la empresa antes de uniformarla. */
  copiedFrom?: OrigenCopia;
}

export interface Omitida {
  productId?: string;
  index?: number;
  code: string;
}

export interface RespuestaVistaPrevia {
  success: boolean;
  samples: Muestra[];
  skipped: Omitida[];
  /** TX-37 · 7.6: productos de la selección resuelta por el servidor (por categoría, el conteo real). */
  selectionTotal?: number;
  /** Lotes de hasta 100 en que se partirá (= ceil(selectionTotal / 100)). */
  parts?: number;
  /** Productos de la empresa que no se pudieron ubicar en el árbol (conteo de toda la empresa, §G.3). */
  categoryUnresolved?: number;
  /**
   * Con «Quitar fondo» (anexo §G.1): usos que necesitan los productos de la vista previa (hasta 30),
   * el tope que gasta la vista previa, los que le quedan a la empresa y los que ya gastó esta vista.
   */
  aiUsesNeeded?: number;
  aiUsesPreviewMax?: number;
  aiUsesLeft?: number | null;
  aiUsesConsumed?: number;
  /** Por qué se detuvo la vista previa con «Quitar fondo» (`ai_quota`, `ai_unavailable`). */
  stopCode?: string | null;
}

export interface FotoDelResultado {
  index: number;
  status: string;
  code?: string;
  warnings?: string[];
  /** Fase 1b: de dónde se copió o adoptó (nunca la URL ni la ruta). */
  copiedFrom?: OrigenCopia;
}

export interface ResultadoProducto {
  productId: string;
  status: string;
  code: string | null;
  photos: FotoDelResultado[];
}

export type EstadoDeLote = 'waiting' | 'queued' | 'running' | 'done' | 'cancelled' | 'stopped' | 'failed';

export interface EstadoLote {
  batchId: string;
  type: 'uniform' | 'revert';
  /** `waiting` (TX-37 · 7.7): parte de una serie que espera a la anterior. */
  status: EstadoDeLote;
  mode: ModoFotos;
  stopCode: string | null;
  totals?: { products: number; categoryUnresolved?: number } | null;
  counters: Record<string, number>;
  metrics?: Record<string, number>;
  results: ResultadoProducto[];
  /** La parte de una serie, o null en un lote suelto. */
  series?: { id: string; part: number; parts: number } | null;
  /** La reversión de una serie lista hasta 101 productos; los contadores sí son completos. */
  resultsTruncated?: boolean;
}

export interface LoteCreado {
  success: boolean;
  /** Con serie, la parte 1. */
  batchId: string;
  mode: ModoFotos;
  totals: { products: number; categoryUnresolved?: number };
  existing?: boolean;
  /** Con «Quitar fondo»: usos que necesita el lote (en sombra, lo que costaría). */
  aiUsesNeeded?: number;
  /** TX-37 · 7.8: solo cuando la selección pasa de 100 productos. */
  seriesId?: string;
  parts?: number;
}

export interface ParteDeSerie {
  batchId: string;
  part: number;
  status: EstadoDeLote;
  stopCode: string | null;
  counters: Record<string, number>;
}

/** GET /series/:id (anexo §G.1): contadores y totales ya sumados entre las partes. */
export interface EstadoSerie {
  seriesId: string;
  type: 'uniform' | 'revert';
  mode: ModoFotos;
  status: 'queued' | 'running' | 'done' | 'cancelled' | 'stopped' | 'failed';
  stopCode: string | null;
  currentPart: number | null;
  totals: { products: number; categoryUnresolved?: number };
  counters: Record<string, number>;
  metrics?: Record<string, number>;
  parts: ParteDeSerie[];
}

export interface Exclusion {
  productId: string;
  index: number;
}

/** Por categoría manda la ruta del árbol (D-518 TX-37·4): la categoría y todas sus subcategorías. */
export type Seleccion =
  | { tipo: 'productos'; productIds: string[] }
  | { tipo: 'categoria'; categoryPath: string[] };

/** Una ruta del árbol para el paso «Elige la categoría». */
export interface RutaParaElegir {
  clave: string;
  nombres: string[];
  texto: string;
  nivel: number;
  /**
   * Dos nodos del árbol dan esta misma ruta: el servidor la rechaza (`enColision`, 400). Se muestra
   * deshabilitada, con el motivo, para que no se elija una opción que siempre falla.
   */
  repetida: boolean;
}

/** Lo último que este navegador aplicó: un lote suelto, una serie o la reversión de uno de ellos. */
export interface UltimoTrabajo {
  tipo: 'lote' | 'serie' | 'reversion';
  id: string;
}

/** «Quitar fondo» (fase 2): conservar el fondo (fase 1) o separarlo del producto. */
export type ModoFondo = 'keep' | 'replace';
/** `cover` = solo la portada (por defecto, la más barata); `all` = todas las fotos del producto. */
export type AlcanceFondo = 'cover' | 'all';

export interface AjusteQuitarFondo {
  quitar: boolean;
  alcance: AlcanceFondo;
}

export const ALCANCES_FONDO: AlcanceFondo[] = ['cover', 'all'];
export const ETIQUETAS_ALCANCE: Record<AlcanceFondo, string> = {
  cover: 'Solo la portada',
  all: 'Todas las fotos',
};
/** Nunca se recuerda entre aperturas: cada foto cuesta un uso del plan. */
export const QUITAR_FONDO_POR_DEFECTO: AjusteQuitarFondo = Object.freeze({ quitar: false, alcance: 'cover' }) as AjusteQuitarFondo;
/** Productos que la vista previa estima (el servidor mira los primeros 30). */
export const PRODUCTOS_DE_ESTIMACION = 30;

export const AJUSTES_POR_DEFECTO: AjustesFotos = Object.freeze({ aspect: '1:1', background: 'white', marginPct: 8 }) as AjustesFotos;
export const PROPORCIONES: Proporcion[] = ['1:1', '4:5', '3:4'];
export const FONDOS: Fondo[] = ['white', 'light_gray', 'brand'];
/** El navegador recuerda el último ajuste (P1); no se escribe en la empresa. */
export const LLAVE_AJUSTES = 'katuq.fotosUniformes.ajustes';
/** El último lote, para poder revertirlo con el interruptor en pausa. */
export const LLAVE_ULTIMO_LOTE = 'katuq.fotosUniformes.ultimoLote';
export const INTERVALO_CONSULTA_MS = 2000;
export const TOPE_PRODUCTOS = 100;
/**
 * Tope de una serie (P10): 20 lotes de 100. El servidor manda el suyo en `limits.maxSeriesProducts`;
 * si no lo manda (un servidor anterior a 7.8), el diálogo usa el de un lote, igual que el servidor.
 */
export const TOPE_SERIE = 2000;
/** Niveles de una ruta que acepta el servidor (`categoryPath` de 1 a 3 nombres). */
export const NIVELES_RUTA = 3;
export const ESTADOS_FINALES = ['done', 'cancelled', 'stopped', 'failed'];
const SIN_CATEGORIA = '__SIN_CATEGORIA__';
const LARGO_MAXIMO_NOMBRE = 120;
/** Separador visible de una ruta («Flores › Rosas»). */
export const SEPARADOR_VISIBLE = ' › ';
const PREFIJO_SERIE = 'serie:';
const PREFIJO_REVERSION = 'reversion:';

export const ETIQUETAS_PROPORCION: Record<Proporcion, string> = {
  '1:1': 'Cuadrada 1:1',
  '4:5': 'Vertical 4:5',
  '3:4': 'Vertical 3:4',
};

export const ETIQUETAS_FONDO: Record<Fondo, string> = {
  white: 'Blanco',
  light_gray: 'Gris claro',
  brand: 'Color de marca',
};

/** Por qué una foto no se uniformó. */
export const MENSAJES_OMISION: Record<string, string> = {
  external_link: 'Es un enlace externo o está en otro almacenamiento',
  legacy_format: 'Está guardada en un formato antiguo',
  not_owned: 'El archivo no es de tu empresa',
  owner_unknown: 'El archivo no tiene dueño registrado',
  product_integrated: 'El producto está vinculado a una integración que actualiza sus fotos (otra tienda o tu operador logístico)',
  flow_photos: 'Sus fotos llegan por una automatización',
  already_uniform: 'Ya estaba uniformada con estos ajustes',
  too_large: 'La foto pesa más de 15 MB',
  unreadable: 'No pudimos abrir la foto',
  timeout: 'La foto tardó demasiado en procesarse',
  changed_meanwhile: 'Alguien cambió sus fotos mientras se procesaban',
  original_missing: 'La foto original ya no está disponible',
  reprocessed_later: 'Se uniformó de nuevo después',
  photo_limit: 'Pasa el tope de 12 fotos por producto',
  excluded: 'Elegiste no uniformarla',
  // TX-37 · 7.10 (anexo §G.3). `category_unresolved` es un conteo de la empresa; ver textoSinUbicar.
  category_unresolved: 'No se pudo ubicar en tu árbol de categorías',
  // Fase 1b: fotos por enlace y sin dueño.
  download_failed: 'No se pudo descargar la foto del enlace',
  not_image: 'El enlace no lleva a una foto',
  not_adoptable: 'El archivo no tiene dueño registrado y no está guardado como foto de producto',
  // Fase 2: «Quitar fondo».
  background_input_invalid: 'La foto no tiene el tamaño o la forma que necesita «Quitar fondo». No se gastó ningún uso',
  background_unclear: 'No pudimos separar bien el producto del fondo. La foto quedó como estaba',
  background_unavailable: 'No pudimos quitar el fondo en este momento. La foto quedó como estaba y el uso se devolvió',
  // Se acabó el cupo a mitad de un producto: sus fotos que faltan quedan como estaban.
  ai_quota: 'Se acabaron los usos de «Quitar fondo» de este mes. La foto quedó como estaba',
};

/** Lo que pasaría con una foto en una simulación (sombra). */
export const MENSAJES_RESULTADO: Record<string, string> = {
  would_copy: 'Se copiaría a tus fotos antes de uniformarla',
  would_remove_background: 'Se le quitaría el fondo',
};

/** De dónde salió una foto copiada o adoptada (fase 1b), en el resumen y en la vista previa. */
export const MENSAJES_ORIGEN: Record<OrigenCopia, string> = {
  link: 'Copiada desde un enlace',
  unowned: 'Adoptada de un archivo sin dueño registrado',
};
/** Lo mismo, en una simulación o en la vista previa: todavía no se copió. */
export const MENSAJES_ORIGEN_SIMULADO: Record<OrigenCopia, string> = {
  link: 'Se copiaría desde un enlace',
  unowned: 'Se adoptaría un archivo sin dueño registrado',
};

/** Avisos informativos (no impiden nada). */
export const MENSAJES_AVISO: Record<string, string> = {
  trim_skipped: 'No encontramos bordes que recortar',
  low_resolution: 'Se ve pequeña',
  blurry: 'Parece borrosa',
  // TX-37 · 7.9 (D-518 TX-37·2): lo detecta el servidor; adelantado de 7.10 para que el chip no salga vacío.
  possible_watermark: 'Posible marca de agua o logo',
};

/** Por qué se detuvo un lote. */
export const MENSAJES_PARADA: Record<string, string> = {
  mode_changed: 'La función se pausó mientras corría el lote. Lo que ya se aplicó se puede revertir.',
  feature_off: 'La función se apagó para tu empresa mientras corría el lote. Lo que ya se aplicó se puede revertir.',
  unexpected: 'Algo falló a mitad del lote. Lo que ya se aplicó se puede revertir.',
  // TX-37 · 7.10 (anexo §G.2).
  series_stopped: 'Este lote no empezó porque la serie se detuvo antes. Lo que ya se aplicó se puede revertir.',
  company_has_sync: 'Se detuvo porque tu empresa activó una sincronización que actualiza las fotos de los productos. Lo que ya se aplicó se puede revertir.',
  ai_quota: 'Se detuvo porque se acabaron los usos de «Quitar fondo» de este mes. Lo que ya se aplicó se puede revertir.',
  ai_unavailable: 'Se detuvo porque no pudimos quitar el fondo varias veces seguidas. Los usos de esas fotos se devolvieron y lo que ya se aplicó se puede revertir.',
};

/** Errores del servidor, por código. */
export const MENSAJES_ERROR: Record<string, string> = {
  INVALID_SETTINGS: 'Revisa los ajustes: proporción, fondo y margen (de 0 a 20 %).',
  INVALID_SELECTION: 'Elige los productos o la categoría que quieres uniformar.',
  BATCH_NOT_FOUND: 'No encontramos ese lote.',
  COMPANY_HAS_PRODUCT_SYNC: 'Tus productos se actualizan con una sincronización, así que esta función no está disponible por ahora.',
  COMPANY_AMBIGUOUS: 'No pudimos identificar tu empresa. Escríbenos por soporte.',
  BATCH_RUNNING: 'Ya hay un lote de fotos en curso. Espera a que termine o cancélalo.',
  BATCH_TOO_LARGE: 'Puedes uniformar hasta 100 productos por lote. Elige menos o divide la categoría.',
  // TX-37 · 7.10 (anexo §G.1). Con el tope del servidor, el diálogo arma el texto con textoExcede.
  SERIES_TOO_LARGE: textoExcede(TOPE_SERIE),
  SERIES_NOT_FOUND: 'No encontramos esa serie de lotes.',
  AI_QUOTA_INSUFFICIENT: 'No te alcanzan los usos de «Quitar fondo» de este mes para este lote. Elige menos productos o quita el fondo solo de la portada.',
  // TX-37 · 9.10 (anexo §G.1). El mensaje del servidor (que dice cuántos usos quedan) se usa si no nombra a un proveedor.
  BACKGROUND_UNAVAILABLE: 'Quitar fondo no está disponible para tu empresa por ahora. Escríbenos por soporte.',
  ADMIN_ONLY: 'Solo un administrador puede probar Quitar fondo, porque gasta usos de tu plan.',
  PHOTO_BUSY: 'Estamos procesando otras fotos. Intenta de nuevo en unos segundos.',
  PREVIEW_RUNNING: 'Ya estamos preparando una vista previa. Espera a que termine.',
  PREVIEW_RATE_LIMIT: 'Pediste muchas vistas previas seguidas. Espera unos minutos y vuelve a intentar.',
  PHOTO_UNIFORM_OFF: 'Uniformar fotos está en pausa por ahora. Puedes consultar y revertir lo que ya hiciste.',
  FEATURE_DISABLED: 'Esta función todavía no está activa para tu empresa.',
  ROLE_NOT_ALLOWED: 'Solo un administrador puede aplicar, cancelar o revertir fotos.',
  SIN_CONEXION: 'No hay conexión. Revisa tu internet e intenta de nuevo.',
  DESCONOCIDO: 'No se pudo completar. Inténtalo de nuevo en un momento.',
};

/**
 * Códigos cuyo mensaje del servidor es más preciso que el nuestro: nombra la sincronización, dice
 * por qué la ruta no sirve (TX-37 · 7.6) o cuántos usos quedan y cuántos necesita el lote (fase 2).
 */
const USAR_MENSAJE_DEL_SERVIDOR = new Set(['COMPANY_HAS_PRODUCT_SYNC', 'INVALID_SELECTION', 'AI_QUOTA_INSUFFICIENT', 'BACKGROUND_UNAVAILABLE']);

/**
 * Un mensaje del servidor con alguna de estas palabras no se muestra (se usa el nuestro): «token» y
 * los nombres de proveedores o modelos (Artículo VI). Palabras completas, para no tocar «renovar».
 */
const PROHIBIDO_EN_MENSAJE = /token|\bnova\b|bedrock|canvas|amazon|\baws\b|opttia|\btitan\b|anthropic|claude|gemini|openai|\bgpt/i;

const SUGERENCIA_SIN_CUPO = 'Elige menos productos o quita el fondo solo de la portada.';

/** «2.000»: miles con punto, sin depender del idioma del navegador. */
function conMiles(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** SERIES_TOO_LARGE con el tope que de verdad aplica (el del servidor). */
export function textoExcede(tope: number): string {
  return `Puedes uniformar hasta ${conMiles(tope)} productos a la vez. Elige una subcategoría o menos productos.`;
}

function esObjeto(valor: unknown): valor is Record<string, any> {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

/** Un ajuste válido, o null. `brand` solo si la empresa tiene color de marca. */
export function ajustesValidos(valor: unknown, hayColorDeMarca = true): AjustesFotos | null {
  if (!esObjeto(valor)) {
    return null;
  }
  const { aspect, background, marginPct } = valor;
  if (!PROPORCIONES.includes(aspect)) {
    return null;
  }
  if (!FONDOS.includes(background) || (background === 'brand' && !hayColorDeMarca)) {
    return null;
  }
  if (typeof marginPct !== 'number' || !Number.isInteger(marginPct) || marginPct < 0 || marginPct > 20) {
    return null;
  }
  return { aspect, background, marginPct };
}

/**
 * La proporción que sugiere quien abre el diálogo (pregunta 13, P20: la `fotoProporcion` del estilo
 * del sitio), o null. «Del estilo» (`''`) u otro valor no sugiere nada.
 */
export function proporcionSugeridaValida(valor: unknown): Proporcion | null {
  return typeof valor === 'string' && (PROPORCIONES as string[]).includes(valor) ? (valor as Proporcion) : null;
}

/**
 * Ajuste con el que abre el diálogo: el último recordado, o el del servidor, o el por defecto (P1).
 * Con una proporción sugerida válida (TX-37 · 7.11, pregunta 13), empieza en ella; el fondo y el
 * margen siguen la misma regla. La persona la puede cambiar.
 */
export function ajustesIniciales(guardado: string | null | undefined, config?: Partial<ConfigFotos> | null, sugerida?: unknown): AjustesFotos {
  const hayMarca = !!(config && config.brandColor);
  let base: AjustesFotos | null = null;
  if (guardado) {
    try {
      base = ajustesValidos(JSON.parse(guardado), hayMarca);
    } catch {
      // Lo guardado no sirve: se usa el ajuste por defecto.
    }
  }
  base = base || ajustesValidos(config && config.defaults, hayMarca) || { ...AJUSTES_POR_DEFECTO };
  const aspecto = proporcionSugeridaValida(sugerida);
  return aspecto ? { ...base, aspect: aspecto } : base;
}

/** Una ruta del árbol tal como la acepta el servidor (1 a 3 nombres sin vacíos), o null. */
export function rutaValida(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > NIVELES_RUTA) {
    return null;
  }
  const nombres: string[] = [];
  for (const v of valor) {
    if (typeof v !== 'string') return null;
    const nombre = v.trim();
    if (!nombre || nombre.length > LARGO_MAXIMO_NOMBRE || nombre === SIN_CATEGORIA) return null;
    nombres.push(nombre);
  }
  return nombres;
}

/**
 * La selección a partir de las entradas del diálogo: la ruta (`categoryPath`), si no la etiqueta
 * vieja (`categoryLabel`, que vale `[categoryLabel]`, igual que en el servidor), si no los productos.
 */
export function seleccionDeEntradas(entradas: { productIds?: string[] | null; categoryPath?: unknown; categoryLabel?: string | null }): Seleccion {
  const ruta = rutaValida(entradas.categoryPath);
  if (ruta) {
    return { tipo: 'categoria', categoryPath: ruta };
  }
  const etiqueta = String(entradas.categoryLabel || '').trim();
  if (etiqueta) {
    return { tipo: 'categoria', categoryPath: [etiqueta] };
  }
  return { tipo: 'productos', productIds: Array.isArray(entradas.productIds) ? entradas.productIds : [] };
}

export function seleccionValida(sel: Seleccion | null | undefined): boolean {
  if (!sel) {
    return false;
  }
  if (sel.tipo === 'productos') {
    return Array.isArray(sel.productIds) && sel.productIds.length > 0;
  }
  return !!rutaValida(sel.categoryPath);
}

function partesDeSeleccion(sel: Seleccion): Record<string, unknown> {
  return sel.tipo === 'productos'
    ? { productIds: [...new Set(sel.productIds)] }
    : { categoryPath: rutaValida(sel.categoryPath) || [] };
}

/** ¿Se ofrece «Quitar fondo» (aplicar el lote o simularlo)? Lo dice el servidor; sin eso, no. */
export function quitarFondoDisponible(config: ConfigFotos | null | undefined): boolean {
  return !!config && config.mode !== 'off' && config.canApply === true && !!config.backgroundRemoval && config.backgroundRemoval.available === true;
}

/** ¿La vista previa puede usar «Quitar fondo»? Solo en `on` y para administradores: gasta usos. */
export function vistaPreviaConFondoDisponible(config: ConfigFotos | null | undefined): boolean {
  return quitarFondoDisponible(config) && config!.mode === 'on' && config!.backgroundRemoval!.previewAvailable === true;
}

/**
 * Lo que se suma a `settings` con «Quitar fondo». Si no se pidió o no hay permiso, `{}`: los
 * `settings` y su huella quedan idénticos a los de la fase 1 (el servidor no guarda las llaves).
 */
export function ajustesDeFondo(fondo: AjusteQuitarFondo | null | undefined, permitido: boolean): Record<string, string> {
  if (!permitido || !fondo || fondo.quitar !== true) {
    return {};
  }
  return { backgroundMode: 'replace', backgroundScope: fondo.alcance === 'all' ? 'all' : 'cover' };
}

/**
 * Cuerpo de POST /preview: hasta 3 productos (la vista previa toma 3 fotos como máximo). `fondo`
 * (ya filtrado con `ajustesDeFondo`) agrega «Quitar fondo»; la vista previa con IA gasta hasta 3 usos.
 */
export function cuerpoVistaPrevia(sel: Seleccion, ajustes: AjustesFotos, fondo: Record<string, string> = {}): Record<string, unknown> {
  const partes = partesDeSeleccion(sel);
  if (Array.isArray(partes['productIds'])) {
    partes['productIds'] = (partes['productIds'] as string[]).slice(0, 3);
  }
  return { ...partes, settings: { ...ajustes, ...fondo } };
}

/** Cuerpo de POST /batches. `fondo` igual que en la vista previa (en sombra el servidor solo cuenta). */
export function cuerpoLote(sel: Seleccion, ajustes: AjustesFotos, excluidas: Exclusion[], llave: string, fondo: Record<string, string> = {}): Record<string, unknown> {
  return {
    ...partesDeSeleccion(sel),
    settings: { ...ajustes, ...fondo },
    excluded: (excluidas || []).map((e) => ({ productId: e.productId, index: e.index })),
    idempotencyKey: llave,
  };
}

/** Llave de idempotencia para un clic (8 a 100 caracteres seguros). */
export function nuevaLlave(ahora: number = Date.now(), azar: () => number = Math.random): string {
  const aleatorio = Math.floor(azar() * 1e12).toString(36).padStart(8, '0');
  return `fu-${ahora.toString(36)}-${aleatorio}`;
}

export function codigoDeError(err: any): string | null {
  const cuerpo = err && err.error;
  if (esObjeto(cuerpo) && typeof cuerpo['code'] === 'string') {
    return cuerpo['code'];
  }
  return null;
}

/** Texto para la persona a partir de un error HTTP. Nunca muestra detalles técnicos. */
export function mensajeDeError(err: any): string {
  if (!err) {
    return MENSAJES_ERROR['DESCONOCIDO'];
  }
  if (err.status === 0) {
    return MENSAJES_ERROR['SIN_CONEXION'];
  }
  const codigo = codigoDeError(err);
  const delServidor = esObjeto(err.error) && typeof err.error['message'] === 'string' ? err.error['message'] : '';
  if (codigo && USAR_MENSAJE_DEL_SERVIDOR.has(codigo) && delServidor && !PROHIBIDO_EN_MENSAJE.test(delServidor)) {
    // Sin cupo: siempre con la salida (menos productos o solo la portada), aunque el servidor no la diga.
    return codigo === 'AI_QUOTA_INSUFFICIENT' && !/elige menos/i.test(delServidor) ? `${delServidor} ${SUGERENCIA_SIN_CUPO}` : delServidor;
  }
  if (codigo && MENSAJES_ERROR[codigo]) {
    return MENSAJES_ERROR[codigo];
  }
  return MENSAJES_ERROR['DESCONOCIDO'];
}

export function motivoDeOmision(code: string | null | undefined): string {
  return (code && (MENSAJES_OMISION[code] || MENSAJES_RESULTADO[code])) || 'No se pudo uniformar';
}

/** Lo que pasaría en una simulación (`would_copy`, `would_remove_background`), o ''. */
export function textoDeResultado(code: string): string {
  return MENSAJES_RESULTADO[code] || '';
}

/** Por qué se detuvo un lote o una serie, por su `stopCode`. */
export function textoDeParada(stopCode: string | null | undefined): string {
  return MENSAJES_PARADA[stopCode || 'unexpected'] || MENSAJES_PARADA['unexpected'];
}

export function textoDeAviso(code: string): string {
  return MENSAJES_AVISO[code] || '';
}

export function esFinal(status: string | null | undefined): boolean {
  return !!status && ESTADOS_FINALES.includes(status);
}

/**
 * ¿Este error de GET /batches/:id o /series/:id corta la consulta? Un 403 (la bandera se apagó) o un
 * 404 (no existe o no es de la empresa) no se arreglan reintentando; sin conexión o un 5xx, sí.
 */
export function detieneLaConsulta(err: any): boolean {
  return !!err && (err.status === 403 || err.status === 404);
}

/** Qué se dice cuando la consulta se corta: con la bandera apagada, la parada `feature_off`. */
export function mensajeDeConsultaCortada(err: any): string {
  return codigoDeError(err) === 'FEATURE_DISABLED' ? MENSAJES_PARADA['feature_off'] : mensajeDeError(err);
}

export interface MotivoResumen {
  code: string;
  texto: string;
  cantidad: number;
}

export interface ResumenLote {
  titulo: string;
  tono: 'exito' | 'alerta' | 'info' | 'error';
  enSombra: boolean;
  uniformadas: number;
  habrian: number;
  revertidas: number;
  omitidas: number;
  conAviso: number;
  motivos: MotivoResumen[];
  /**
   * TX-37 · 8.6: de dónde salieron las fotos copiadas o adoptadas (fase 1b). Solo lo que aparece
   * en los resultados leídos; el total sale de `copiadas` y `habriaCopiado`.
   */
  origenes: MotivoResumen[];
  /** TX-37 · 8.6 y 9.10: lo que se haría en una simulación (`would_copy`, `would_remove_background`). */
  simulados: MotivoResumen[];
  /** Fotos copiadas / que se copiarían, según los contadores del servidor (completos). */
  copiadas: number;
  habriaCopiado: number;
  /** Usos de «Quitar fondo» gastados, devueltos y, en sombra, los que costaría. */
  usosGastados: number;
  usosDevueltos: number;
  usosSimulados: number;
  /** Fotos por cada aviso de calidad (p. ej., «Posible marca de agua o logo», D-518 TX-37·2). */
  avisos: MotivoResumen[];
  parada: string | null;
  puedeRevertir: boolean;
  /**
   * Las listas de motivos y avisos no están completas: la reversión de una serie lista hasta 101
   * productos, o no se pudo leer algún lote de una serie. Las cifras sí son del total.
   */
  motivosIncompletos?: boolean;
}

/** Lo común al resumen de un lote y al de una serie. */
function armarResumen(
  base: { type: 'uniform' | 'revert'; status: string; mode: ModoFotos; stopCode: string | null; counters: Record<string, number> | null | undefined; metrics?: Record<string, number> | null },
  omitidas: number,
  conAviso: number,
  motivos: MotivoResumen[],
  avisos: MotivoResumen[],
  sufijoCancelado: string,
  detalle: { origenes: MotivoResumen[]; simulados: MotivoResumen[] } = { origenes: [], simulados: [] },
): ResumenLote {
  const k = base.metrics || {};
  const entero = (v: unknown): number => Math.max(0, Math.trunc(Number(v) || 0));
  const c = base.counters || {};
  const enSombra = base.type === 'uniform' && base.mode === 'shadow';
  const uniformadas = Number(c['photosUniformed']) || 0;
  const habrian = Number(c['photosWouldUniform']) || 0;
  const revertidas = Number(c['photosReverted']) || 0;
  const parada = base.status === 'stopped' || base.status === 'failed' ? textoDeParada(base.stopCode) : null;

  let titulo: string;
  let tono: ResumenLote['tono'];
  if (base.type === 'revert') {
    titulo = revertidas === 1 ? 'Volvió 1 foto original' : `Volvieron ${revertidas} fotos originales`;
    tono = revertidas > 0 ? 'exito' : 'info';
  } else if (enSombra) {
    titulo = habrian === 1 ? 'Simulación: se uniformaría 1 foto' : `Simulación: se uniformarían ${habrian} fotos`;
    tono = 'info';
  } else {
    titulo = uniformadas === 1 ? '1 foto uniformada' : `${uniformadas} fotos uniformadas`;
    tono = uniformadas > 0 ? 'exito' : 'alerta';
  }
  if (base.status === 'cancelled') {
    titulo = `${sufijoCancelado} · ${titulo}`;
    tono = 'alerta';
  }
  if (parada) {
    tono = base.status === 'failed' ? 'error' : 'alerta';
  }
  return {
    titulo,
    tono,
    enSombra,
    uniformadas,
    habrian,
    revertidas,
    omitidas,
    conAviso,
    motivos,
    origenes: detalle.origenes,
    simulados: detalle.simulados,
    copiadas: entero(k['photosCopied']),
    habriaCopiado: entero(k['photosWouldCopy']),
    usosGastados: entero(k['aiUsesConsumed']),
    usosDevueltos: entero(k['aiUsesRefunded']),
    usosSimulados: entero(k['aiUsesWouldConsume']),
    avisos,
    parada,
    puedeRevertir: base.type === 'uniform' && uniformadas > 0,
  };
}

/** Fotos omitidas según los contadores (cuando no hay resultados por producto, o vienen cortados). */
function omitidasPorContadores(c: Record<string, number> | null | undefined): number {
  const k = c || {};
  return (Number(k['photosSkipped']) || 0) + (Number(k['photosExcluded']) || 0);
}

/** Motivos y avisos por código, contados en los resultados de uno o varios lotes. */
function contarResultados(lotes: (EstadoLote | null | undefined)[]): { motivos: Map<string, number>; avisos: Map<string, number>; origenes: Map<string, number>; simulados: Map<string, number>; conAviso: number } {
  const motivos = new Map<string, number>();
  const avisos = new Map<string, number>();
  const origenes = new Map<string, number>();
  const simulados = new Map<string, number>();
  let conAviso = 0;
  for (const lote of lotes) {
    for (const r of (lote && lote.results) || []) {
      if (r.code) {
        motivos.set(r.code, (motivos.get(r.code) || 0) + 1);
      }
      for (const f of r.photos || []) {
        if (f.status === 'skipped' && f.code) {
          motivos.set(f.code, (motivos.get(f.code) || 0) + 1);
        }
        if (f.status === 'excluded') {
          motivos.set('excluded', (motivos.get('excluded') || 0) + 1);
        }
        // Lo que se haría en una simulación (el estado de la foto, no una omisión).
        if (f.status === 'would_copy' || f.status === 'would_remove_background') {
          simulados.set(f.status, (simulados.get(f.status) || 0) + 1);
        }
        if (f.copiedFrom === 'link' || f.copiedFrom === 'unowned') {
          origenes.set(f.copiedFrom, (origenes.get(f.copiedFrom) || 0) + 1);
        }
        if (Array.isArray(f.warnings) && f.warnings.length) {
          conAviso++;
          for (const w of new Set(f.warnings)) {
            if (typeof w === 'string' && w) avisos.set(w, (avisos.get(w) || 0) + 1);
          }
        }
      }
    }
  }
  return { motivos, avisos, origenes, simulados, conAviso };
}

function ordenarMotivos(mapa: Map<string, number>, texto: (code: string) => string): MotivoResumen[] {
  return [...mapa.entries()]
    .map(([code, cantidad]) => ({ code, texto: texto(code), cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Texto de un aviso en el resumen; un código que el front no conoce sale como aviso de calidad. */
function textoDeAvisoEnResumen(code: string): string {
  return textoDeAviso(code) || 'Aviso de calidad';
}

/** Texto del origen de una foto copiada o adoptada; en una simulación, en condicional. */
export function textoDeOrigen(origen: string | null | undefined, simulado = false): string {
  if (origen !== 'link' && origen !== 'unowned') {
    return '';
  }
  return (simulado ? MENSAJES_ORIGEN_SIMULADO : MENSAJES_ORIGEN)[origen];
}

/** Los orígenes y las fotos simuladas del resumen, ya con su texto. */
function detalleDeResumen(origenes: Map<string, number>, simulados: Map<string, number>, enSombra: boolean): { origenes: MotivoResumen[]; simulados: MotivoResumen[] } {
  return {
    origenes: ordenarMotivos(origenes, (c) => textoDeOrigen(c, enSombra)),
    simulados: ordenarMotivos(simulados, textoDeResultado),
  };
}

/** Lo que se cuenta en el resumen de un lote terminado (o en curso). */
export function resumenDeLote(lote: EstadoLote | null | undefined): ResumenLote | null {
  if (!lote) {
    return null;
  }
  const { motivos, avisos, origenes, simulados, conAviso } = contarResultados([lote]);
  // La reversión de una serie lista hasta 101 productos: el total sale de los contadores (B05).
  const incompletos = lote.resultsTruncated === true;
  const omitidas = incompletos ? omitidasPorContadores(lote.counters) : [...motivos.values()].reduce((t, n) => t + n, 0);
  const resumen = armarResumen(
    lote,
    omitidas,
    incompletos ? Number((lote.counters || {})['photosWarned']) || conAviso : conAviso,
    ordenarMotivos(motivos, motivoDeOmision),
    ordenarMotivos(avisos, textoDeAvisoEnResumen),
    'Lote cancelado',
    detalleDeResumen(origenes, simulados, lote.type === 'uniform' && lote.mode === 'shadow'),
  );
  if (incompletos) {
    resumen.motivosIncompletos = true;
  }
  return resumen;
}

/** Partes de una serie que corrieron (las que esperan o no empezaron no tienen resultados). */
export function partesConResultados(serie: EstadoSerie | null | undefined): ParteDeSerie[] {
  return (serie && Array.isArray(serie.parts) ? serie.parts : []).filter(
    (p) => p.status !== 'waiting' && p.status !== 'queued' && !(p.status === 'stopped' && p.stopCode === 'series_stopped'),
  );
}

/**
 * Resumen de una serie (TX-37 · 7.11). Las cifras salen de los contadores sumados de
 * `GET /series/:id`, que no trae resultados por producto. Con `lotes` (el `GET /batches/:id` de cada
 * parte que corrió, leído al terminar), también lista los motivos y los avisos por foto, como el
 * resumen de un lote (D-518 TX-37·2: el aviso de marca de agua va en el resumen). Si falta alguno,
 * la lista se marca incompleta.
 */
export function resumenDeSerie(serie: EstadoSerie | null | undefined, lotes?: (EstadoLote | null | undefined)[] | null): ResumenLote | null {
  if (!serie) {
    return null;
  }
  const c = serie.counters || {};
  const leidos = (lotes || []).filter((l): l is EstadoLote => !!l);
  const { motivos, avisos, origenes, simulados } = contarResultados(leidos);
  const resumen = armarResumen(
    serie,
    omitidasPorContadores(c),
    Number(c['photosWarned']) || 0,
    ordenarMotivos(motivos, motivoDeOmision),
    ordenarMotivos(avisos, textoDeAvisoEnResumen),
    'Serie cancelada',
    detalleDeResumen(origenes, simulados, serie.type === 'uniform' && serie.mode === 'shadow'),
  );
  if (Array.isArray(lotes) && leidos.length < partesConResultados(serie).length) {
    resumen.motivosIncompletos = true;
  }
  return resumen;
}

export interface ProgresoSerie {
  /** Parte en curso (1..partes); al terminar, la última que corrió. */
  parte: number;
  partes: number;
  hechos: number;
  total: number;
  porcentaje: number;
}

/** Avance de una serie: la parte en curso y los productos hechos de todas las partes. */
export function progresoDeSerie(serie: EstadoSerie | null | undefined): ProgresoSerie {
  const partes = serie && Array.isArray(serie.parts) ? serie.parts.length : 0;
  const total = Number(serie && serie.totals && serie.totals.products) || 0;
  const hechos = Math.min(total, Number(serie && serie.counters && serie.counters['products']) || 0);
  let parte = Number(serie && serie.currentPart) || 0;
  if (!parte && serie && Array.isArray(serie.parts)) {
    const corridas = partesConResultados(serie);
    parte = corridas.length ? Math.max(...corridas.map((p) => Number(p.part) || 0)) : 1;
  }
  return { parte: Math.min(Math.max(parte, partes ? 1 : 0), partes), partes, hechos, total, porcentaje: total ? Math.round((hechos / total) * 100) : 0 };
}

/** «Parte 2 de 4 · 130 de 340 productos». */
export function textoDeProgresoSerie(p: ProgresoSerie): string {
  return `Parte ${p.parte} de ${p.partes} · ${p.hechos} de ${p.total} productos`;
}

/** Avance de un lote: productos hechos / total. */
export function progresoDeLote(lote: EstadoLote | null | undefined): { hechos: number; total: number; porcentaje: number } {
  const total = Number(lote && lote.totals && lote.totals.products) || 0;
  const hechos = Math.min(total, Number(lote && lote.counters && lote.counters['products']) || 0);
  return { hechos, total, porcentaje: total ? Math.round((hechos / total) * 100) : 0 };
}

/** ¿Se puede aplicar? Interruptor del servidor encendido (shadow u on) y rol administrador. */
export function puedeAplicar(config: ConfigFotos | null | undefined): boolean {
  return !!config && config.mode !== 'off' && config.canApply === true;
}

/** Con el interruptor en pausa, el diálogo solo ofrece revertir. */
export function soloRevertir(config: ConfigFotos | null | undefined): boolean {
  return !!config && config.mode === 'off';
}

/**
 * D-501: al volver a abrir el diálogo, ¿se retoma la consulta del último lote de este navegador?
 * Solo si sigue activo. En pausa (`off`) el servidor no retoma lotes de uniformar, así que uno de
 * esos no avanzaría: se queda la pausa, que ofrece revertir. Vale igual para una serie (TX-37 · 7.11).
 */
export function debeRetomarse(lote: Pick<EstadoLote, 'type' | 'status'> | null | undefined, config: ConfigFotos | null | undefined): boolean {
  if (!lote || !config || esFinal(lote.status)) return false;
  return !soloRevertir(config) || lote.type === 'revert';
}

export function estaExcluida(lista: Exclusion[], productId: string, index: number): boolean {
  return (lista || []).some((e) => e.productId === productId && e.index === index);
}

/** «No uniformar esta»: agrega o quita la foto de la lista de excluidas (lista nueva). */
export function alternarExclusion(lista: Exclusion[], productId: string, index: number): Exclusion[] {
  return estaExcluida(lista, productId, index)
    ? lista.filter((e) => !(e.productId === productId && e.index === index))
    : [...(lista || []), { productId, index }];
}

/** «Flores › Rosas». */
export function textoDeRuta(ruta: string[] | null | undefined): string {
  return (Array.isArray(ruta) ? ruta : []).map((n) => String(n).trim()).filter(Boolean).join(SEPARADOR_VISIBLE);
}

/** Subtítulo del diálogo. Sin tope: más de 100 productos es una serie (TX-37 · 7.11). */
export function textoDeSeleccion(sel: Seleccion | null | undefined): string {
  if (!sel) {
    return '';
  }
  if (sel.tipo === 'categoria') {
    return `Categoría «${textoDeRuta(sel.categoryPath)}» y sus subcategorías`;
  }
  const n = new Set(sel.productIds).size;
  return n === 1 ? '1 producto' : `${n} productos`;
}

/** Lotes de hasta `tope` en que se parte una selección (igual que `partesDe` del servidor). */
export function partesDe(n: number, tope: number = TOPE_PRODUCTOS): number {
  const total = Number(n) || 0;
  return total > 0 ? Math.ceil(total / tope) : 0;
}

/**
 * Tope de una serie: el del servidor si es válido. Si falta, el de un lote (100), como hace el
 * servidor (revisión B05: «sin serie, nunca sin tope»), para no prometer una serie que no se crea.
 */
export function topeDeSerie(config: ConfigFotos | null | undefined): number {
  const n = config && config.limits ? Number(config.limits.maxSeriesProducts) : NaN;
  return Number.isInteger(n) && n > 0 ? n : TOPE_PRODUCTOS;
}

export interface ConteoSeleccion {
  /** Productos que entran (por categoría, el conteo del servidor). null = todavía no se sabe. */
  total: number | null;
  partes: number;
  /** Productos de la empresa sin ubicar en el árbol (solo por categoría). */
  sinUbicar: number;
  /** Pasa del tope de una serie: no se puede aplicar (SERIES_TOO_LARGE). */
  excede: boolean;
}

/**
 * Cuántos productos entran y en cuántos lotes. Por categoría manda el servidor (`selectionTotal`,
 * `parts`, `categoryUnresolved` de la vista previa): la lista filtra por subcadena y el servidor por
 * ruta (§A3). Por selección, los productos elegidos.
 */
export function conteoDeSeleccion(sel: Seleccion | null | undefined, vista: RespuestaVistaPrevia | null | undefined, config: ConfigFotos | null | undefined): ConteoSeleccion {
  const tope = topeDeSerie(config);
  if (!sel) {
    return { total: null, partes: 0, sinUbicar: 0, excede: false };
  }
  if (sel.tipo === 'productos') {
    const total = new Set(sel.productIds || []).size;
    return { total, partes: partesDe(total), sinUbicar: 0, excede: total > tope };
  }
  const total = vista && Number.isInteger(vista.selectionTotal) ? Number(vista.selectionTotal) : null;
  const partes = vista && Number.isInteger(vista.parts) ? Number(vista.parts) : partesDe(total || 0);
  const sinUbicar = vista && Number.isInteger(vista.categoryUnresolved) && Number(vista.categoryUnresolved) > 0 ? Number(vista.categoryUnresolved) : 0;
  return { total, partes, sinUbicar, excede: total !== null && total > tope };
}

/** «340 productos · se harán 4 lotes seguidos de hasta 100». */
export function textoDeConteo(conteo: ConteoSeleccion): string {
  if (conteo.total === null) {
    return '';
  }
  const productos = conteo.total === 1 ? '1 producto' : `${conteo.total} productos`;
  if (conteo.total === 0) {
    return 'No hay productos en esta categoría';
  }
  if (conteo.partes <= 1) {
    return `${productos} · un solo lote`;
  }
  return `${productos} · se harán ${conteo.partes} lotes seguidos de hasta ${TOPE_PRODUCTOS}`;
}

/** §A3: «N productos no se pudieron ubicar en tu árbol de categorías» (conteo de la empresa). */
export function textoSinUbicar(n: number | null | undefined): string {
  const k = Number(n) || 0;
  if (k <= 0) {
    return '';
  }
  return k === 1
    ? '1 producto no se pudo ubicar en tu árbol de categorías'
    : `${k} productos no se pudieron ubicar en tu árbol de categorías`;
}

/** El árbol del documento de categorías (flatted, o ya como arreglo). */
function arbolDelDocumento(doc: any): unknown[] {
  const raw = doc && doc.categoria;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const arbol = parse(raw);
    return Array.isArray(arbol) ? arbol : [];
  } catch {
    return [];
  }
}

/**
 * Rutas para el paso «Elige la categoría» (pregunta 4): del mismo documento de categorías que usa el
 * servidor (`documentoDeCategorias`, D-495) y con el mismo nombre de cada nodo (`label` primero), en
 * el orden del árbol, hasta 3 niveles y una vez cada una. Una ruta que dan dos nodos (misma clave,
 * como cuenta `indiceDeRutas` del servidor) sale `repetida`: el servidor la rechaza.
 */
export function rutasParaElegir(docs: unknown): RutaParaElegir[] {
  const doc = documentoDeCategorias(Array.isArray(docs) ? docs : []);
  const todas = rutasDelArbol(arbolDelDocumento(doc));
  const veces = new Map<string, number>();
  for (const r of todas) {
    if (r.clave) veces.set(r.clave, (veces.get(r.clave) || 0) + 1);
  }
  const vistas = new Set<string>();
  const salida: RutaParaElegir[] = [];
  for (const r of todas) {
    if (!r.clave || r.nombres.length > NIVELES_RUTA || vistas.has(r.clave)) continue;
    vistas.add(r.clave);
    salida.push({ clave: r.clave, nombres: [...r.nombres], texto: textoDeRuta(r.nombres), nivel: r.nombres.length, repetida: (veces.get(r.clave) || 0) > 1 });
  }
  return salida;
}

/** Subcategorías (de cualquier nivel) de una ruta: para elegir una más pequeña (SERIES_TOO_LARGE). */
export function subrutasDe(rutas: RutaParaElegir[], ruta: string[] | null | undefined): RutaParaElegir[] {
  const clave = claveDeRuta(ruta || []);
  if (!clave) return [...(rutas || [])];
  const prefijo = clave + SEPARADOR;
  return (rutas || []).filter((r) => r.clave.startsWith(prefijo));
}

/** Filtro del buscador del paso de categoría (sin importar mayúsculas ni espacios de más). */
export function filtrarRutas(rutas: RutaParaElegir[], texto: string | null | undefined): RutaParaElegir[] {
  const q = claveCategoria(texto);
  if (!q) return [...(rutas || [])];
  return (rutas || []).filter((r) => r.clave.includes(q));
}

/**
 * Lo que se guarda en el navegador para retomar o revertir: el id del lote, «serie:<id>» o, al
 * revertir, «reversion:<id del lote de reversión>» (se retoma al volver a abrir y ya no ofrece
 * revertir otra vez lo mismo).
 */
export function valorUltimoTrabajo(t: UltimoTrabajo): string {
  if (t.tipo === 'serie') return `${PREFIJO_SERIE}${t.id}`;
  if (t.tipo === 'reversion') return `${PREFIJO_REVERSION}${t.id}`;
  return t.id;
}

/** Lee lo guardado. Un id sin prefijo (como guardaba D-501) es un lote. */
export function leerUltimoTrabajo(valor: string | null | undefined): UltimoTrabajo | null {
  const v = String(valor || '').trim();
  if (!v) return null;
  for (const [prefijo, tipo] of [[PREFIJO_SERIE, 'serie'], [PREFIJO_REVERSION, 'reversion']] as const) {
    if (v.startsWith(prefijo)) {
      const id = v.slice(prefijo.length);
      return id ? { tipo, id } : null;
    }
  }
  return { tipo: 'lote', id: v };
}

/** «Solo la portada» / «Todas las fotos» (cualquier otro valor cae en la portada). */
export function alcanceValido(valor: unknown): AlcanceFondo {
  return valor === 'all' ? 'all' : 'cover';
}

/** Usos que quedan, si se saben (entero ≥ 0). */
export function usosQueQuedan(valor: unknown): number | null {
  const n = typeof valor === 'number' ? valor : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

function usos(n: number): string {
  return n === 1 ? '1 uso' : `${conMiles(n)} usos`;
}

/** «Te quedan 480 usos este mes», o '' si no se sabe. */
export function textoUsosQueQuedan(quedan: unknown): string {
  const n = usosQueQuedan(quedan);
  return n === null ? '' : `Te quedan ${usos(n)} de «Quitar fondo» este mes`;
}

/**
 * Antes de pedir la vista previa con «Quitar fondo» (P17, D-518): gasta hasta 3 usos. Con los que
 * quedan, «hasta 3 de tus 480 usos del mes»; si no se saben, sin la cifra. Nunca más que lo que queda.
 */
export function avisoCostoVistaPrevia(max: number | null | undefined, quedan: unknown): string {
  const base = Number.isInteger(max) && Number(max) > 0 ? Number(max) : 3;
  const n = usosQueQuedan(quedan);
  if (n === null) {
    return `La vista previa usa hasta ${base} de tus usos del mes`;
  }
  if (n === 0) {
    return 'No te quedan usos este mes: la vista previa se verá sin quitar el fondo';
  }
  return `La vista previa usa hasta ${Math.min(base, n)} de tus ${usos(n)} del mes`;
}

/**
 * Los usos que necesita lo que se ve en la vista previa y los que quedan. Con más de 30 productos
 * la cifra es de los primeros 30: se dice, y se avisa que el lote completo se revisa al aplicar.
 */
export function textoUsosNecesarios(necesarios: unknown, quedan: unknown, totalProductos: number | null | undefined): string {
  const n = usosQueQuedan(necesarios);
  if (n === null) {
    return '';
  }
  const parcial = Number(totalProductos) > PRODUCTOS_DE_ESTIMACION;
  const base = parcial
    ? `Los primeros ${PRODUCTOS_DE_ESTIMACION} productos necesitan hasta ${usos(n)}`
    : `Necesita hasta ${usos(n)} de «Quitar fondo»`;
  const q = usosQueQuedan(quedan);
  return `${base}${q === null ? '' : ` · te quedan ${conMiles(q)}`}${parcial ? '. Si el lote completo no alcanza, te lo decimos antes de empezar.' : ''}`;
}

/** En sombra no se gasta nada: solo lo que costaría. */
export function textoUsosSimulados(necesarios: unknown): string {
  const n = usosQueQuedan(necesarios);
  return n === null ? '' : `Al aplicar de verdad usaría hasta ${usos(n)} de «Quitar fondo». Por ahora no se gasta ninguno`;
}

/** Ajustes en palabras, para el resumen y los avisos. */
export function textoDeAjustes(a: AjustesFotos): string {
  return `${ETIQUETAS_PROPORCION[a.aspect]}, fondo ${ETIQUETAS_FONDO[a.background].toLowerCase()}, margen ${a.marginPct} %`;
}

/** Estado de cada parte de una serie, en palabras (resumen y avance). */
export function textoDeParte(p: Pick<ParteDeSerie, 'status' | 'stopCode'>): string {
  switch (p.status) {
    case 'done': return 'Terminado';
    case 'cancelled': return 'Cancelado';
    case 'stopped': return p.stopCode === 'series_stopped' ? 'No empezó' : 'Detenido';
    case 'failed': return 'Falló';
    case 'running': return 'En curso';
    case 'queued': return 'En cola';
    case 'waiting': return 'En espera';
    default: return '';
  }
}
