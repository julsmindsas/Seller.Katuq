/**
 * Fotos de producto uniformes — parte PURA (sin Angular, sin DOM). D-501, ticket 1252.
 *
 * Qué se manda al servidor (/v1/product-photos), cómo se recuerdan los ajustes, cómo se lee un
 * lote y qué texto ve la persona por cada código. Lo vigilan `tests/productos/fotos-uniformes.test.js`.
 *
 * Reglas:
 *  - Los mensajes son para el comercio: sin jerga, sin nombres de proveedores (Artículo VI) y sin
 *    la palabra «token».
 *  - Quien manda es el servidor: la bandera `productPhotoUniform`, el interruptor del servidor y
 *    el rol se revisan allá. Aquí solo se decide qué se MUESTRA.
 */

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
  limits: { maxProducts: number; maxPhotosPerProduct: number; previewMaxPhotos: number };
  canApply: boolean;
}

export interface Muestra {
  productId: string;
  index: number;
  before: string;
  after: { dataUrl: string; warnings: string[] };
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
}

export interface FotoDelResultado {
  index: number;
  status: string;
  code?: string;
  warnings?: string[];
}

export interface ResultadoProducto {
  productId: string;
  status: string;
  code: string | null;
  photos: FotoDelResultado[];
}

export interface EstadoLote {
  batchId: string;
  type: 'uniform' | 'revert';
  status: 'queued' | 'running' | 'done' | 'cancelled' | 'stopped' | 'failed';
  mode: ModoFotos;
  stopCode: string | null;
  totals?: { products: number } | null;
  counters: Record<string, number>;
  metrics?: Record<string, number>;
  results: ResultadoProducto[];
}

export interface LoteCreado {
  success: boolean;
  batchId: string;
  mode: ModoFotos;
  totals: { products: number };
  existing?: boolean;
}

export interface Exclusion {
  productId: string;
  index: number;
}

export type Seleccion =
  | { tipo: 'productos'; productIds: string[] }
  | { tipo: 'categoria'; categoryLabel: string };

export const AJUSTES_POR_DEFECTO: AjustesFotos = Object.freeze({ aspect: '1:1', background: 'white', marginPct: 8 }) as AjustesFotos;
export const PROPORCIONES: Proporcion[] = ['1:1', '4:5', '3:4'];
export const FONDOS: Fondo[] = ['white', 'light_gray', 'brand'];
/** El navegador recuerda el último ajuste (P1); no se escribe en la empresa. */
export const LLAVE_AJUSTES = 'katuq.fotosUniformes.ajustes';
/** El último lote, para poder revertirlo con el interruptor en pausa. */
export const LLAVE_ULTIMO_LOTE = 'katuq.fotosUniformes.ultimoLote';
export const INTERVALO_CONSULTA_MS = 2000;
export const TOPE_PRODUCTOS = 100;
export const ESTADOS_FINALES = ['done', 'cancelled', 'stopped', 'failed'];
const SIN_CATEGORIA = '__SIN_CATEGORIA__';

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
};

/** Avisos informativos (no impiden nada). */
export const MENSAJES_AVISO: Record<string, string> = {
  trim_skipped: 'No encontramos bordes que recortar',
  low_resolution: 'Se ve pequeña',
  blurry: 'Parece borrosa',
};

/** Por qué se detuvo un lote. */
export const MENSAJES_PARADA: Record<string, string> = {
  mode_changed: 'La función se pausó mientras corría el lote. Lo que ya se aplicó se puede revertir.',
  feature_off: 'La función se apagó para tu empresa mientras corría el lote. Lo que ya se aplicó se puede revertir.',
  unexpected: 'Algo falló a mitad del lote. Lo que ya se aplicó se puede revertir.',
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
  PHOTO_BUSY: 'Estamos procesando otras fotos. Intenta de nuevo en unos segundos.',
  PREVIEW_RUNNING: 'Ya estamos preparando una vista previa. Espera a que termine.',
  PREVIEW_RATE_LIMIT: 'Pediste muchas vistas previas seguidas. Espera unos minutos y vuelve a intentar.',
  PHOTO_UNIFORM_OFF: 'Uniformar fotos está en pausa por ahora. Puedes consultar y revertir lo que ya hiciste.',
  FEATURE_DISABLED: 'Esta función todavía no está activa para tu empresa.',
  ROLE_NOT_ALLOWED: 'Solo un administrador puede aplicar, cancelar o revertir fotos.',
  SIN_CONEXION: 'No hay conexión. Revisa tu internet e intenta de nuevo.',
  DESCONOCIDO: 'No se pudo completar. Inténtalo de nuevo en un momento.',
};

/** Códigos cuyo mensaje del servidor es más preciso que el nuestro (nombra la sincronización). */
const USAR_MENSAJE_DEL_SERVIDOR = new Set(['COMPANY_HAS_PRODUCT_SYNC', 'INVALID_SELECTION']);

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

/** Ajuste con el que abre el diálogo: el último recordado, o el del servidor, o el por defecto. */
export function ajustesIniciales(guardado: string | null | undefined, config?: Partial<ConfigFotos> | null): AjustesFotos {
  const hayMarca = !!(config && config.brandColor);
  if (guardado) {
    try {
      const recordado = ajustesValidos(JSON.parse(guardado), hayMarca);
      if (recordado) {
        return recordado;
      }
    } catch {
      // Lo guardado no sirve: se usa el ajuste por defecto.
    }
  }
  return ajustesValidos(config && config.defaults, hayMarca) || { ...AJUSTES_POR_DEFECTO };
}

export function seleccionValida(sel: Seleccion | null | undefined): boolean {
  if (!sel) {
    return false;
  }
  if (sel.tipo === 'productos') {
    return Array.isArray(sel.productIds) && sel.productIds.length > 0;
  }
  const etiqueta = String(sel.categoryLabel || '').trim();
  return !!etiqueta && etiqueta !== SIN_CATEGORIA;
}

function partesDeSeleccion(sel: Seleccion): Record<string, unknown> {
  return sel.tipo === 'productos'
    ? { productIds: [...new Set(sel.productIds)] }
    : { categoryLabel: String(sel.categoryLabel).trim() };
}

/** Cuerpo de POST /preview: hasta 3 productos (la vista previa toma 3 fotos como máximo). */
export function cuerpoVistaPrevia(sel: Seleccion, ajustes: AjustesFotos): Record<string, unknown> {
  const partes = partesDeSeleccion(sel);
  if (Array.isArray(partes['productIds'])) {
    partes['productIds'] = (partes['productIds'] as string[]).slice(0, 3);
  }
  return { ...partes, settings: { ...ajustes } };
}

/** Cuerpo de POST /batches. */
export function cuerpoLote(sel: Seleccion, ajustes: AjustesFotos, excluidas: Exclusion[], llave: string): Record<string, unknown> {
  return {
    ...partesDeSeleccion(sel),
    settings: { ...ajustes },
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
  if (codigo && USAR_MENSAJE_DEL_SERVIDOR.has(codigo) && delServidor && !/token/i.test(delServidor)) {
    return delServidor;
  }
  if (codigo && MENSAJES_ERROR[codigo]) {
    return MENSAJES_ERROR[codigo];
  }
  return MENSAJES_ERROR['DESCONOCIDO'];
}

export function motivoDeOmision(code: string | null | undefined): string {
  return (code && MENSAJES_OMISION[code]) || 'No se pudo uniformar';
}

export function textoDeAviso(code: string): string {
  return MENSAJES_AVISO[code] || '';
}

export function esFinal(status: string | null | undefined): boolean {
  return !!status && ESTADOS_FINALES.includes(status);
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
  parada: string | null;
  puedeRevertir: boolean;
}

/** Lo que se cuenta en el resumen de un lote terminado (o en curso). */
export function resumenDeLote(lote: EstadoLote | null | undefined): ResumenLote | null {
  if (!lote) {
    return null;
  }
  const c = lote.counters || {};
  const motivos = new Map<string, number>();
  let conAviso = 0;
  for (const r of lote.results || []) {
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
      if (Array.isArray(f.warnings) && f.warnings.length) {
        conAviso++;
      }
    }
  }
  const enSombra = lote.type === 'uniform' && lote.mode === 'shadow';
  const uniformadas = Number(c['photosUniformed']) || 0;
  const habrian = Number(c['photosWouldUniform']) || 0;
  const revertidas = Number(c['photosReverted']) || 0;
  const omitidas = [...motivos.values()].reduce((t, n) => t + n, 0);
  const parada = lote.status === 'stopped' || lote.status === 'failed'
    ? MENSAJES_PARADA[lote.stopCode || 'unexpected'] || MENSAJES_PARADA['unexpected']
    : null;

  let titulo: string;
  let tono: ResumenLote['tono'];
  if (lote.type === 'revert') {
    titulo = revertidas === 1 ? 'Volvió 1 foto original' : `Volvieron ${revertidas} fotos originales`;
    tono = revertidas > 0 ? 'exito' : 'info';
  } else if (enSombra) {
    titulo = habrian === 1 ? 'Simulación: se uniformaría 1 foto' : `Simulación: se uniformarían ${habrian} fotos`;
    tono = 'info';
  } else {
    titulo = uniformadas === 1 ? '1 foto uniformada' : `${uniformadas} fotos uniformadas`;
    tono = uniformadas > 0 ? 'exito' : 'alerta';
  }
  if (lote.status === 'cancelled') {
    titulo = `Lote cancelado · ${titulo}`;
    tono = 'alerta';
  }
  if (parada) {
    tono = lote.status === 'failed' ? 'error' : 'alerta';
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
    motivos: [...motivos.entries()]
      .map(([code, cantidad]) => ({ code, texto: motivoDeOmision(code), cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    parada,
    puedeRevertir: lote.type === 'uniform' && uniformadas > 0,
  };
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
 * esos no avanzaría: se queda la pausa, que ofrece revertir.
 */
export function debeRetomarse(lote: EstadoLote | null | undefined, config: ConfigFotos | null | undefined): boolean {
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

export function textoDeSeleccion(sel: Seleccion | null | undefined): string {
  if (!sel) {
    return '';
  }
  if (sel.tipo === 'categoria') {
    return `Categoría «${String(sel.categoryLabel).trim()}» · hasta ${TOPE_PRODUCTOS} productos por lote`;
  }
  const n = sel.productIds.length;
  return n === 1 ? '1 producto' : `${n} productos`;
}

/** Ajustes en palabras, para el resumen y los avisos. */
export function textoDeAjustes(a: AjustesFotos): string {
  return `${ETIQUETAS_PROPORCION[a.aspect]}, fondo ${ETIQUETAS_FONDO[a.background].toLowerCase()}, margen ${a.marginPct} %`;
}
