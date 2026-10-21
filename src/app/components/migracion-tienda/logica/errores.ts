/**
 * Clasificación de errores del servidor y reintento de lotes (F5-30, tarea 8.1). Puro: la espera se
 * inyecta, así que se prueba sin relojes.
 *
 * Reglas del contrato:
 *  - 409 IMPORT_IN_PROGRESS: otro envío tiene el candado; se espera y se reenvía el MISMO lote
 *    (si ya había terminado, llega con `replayed: true`).
 *  - 429 RATE_LIMITED: se espera lo que diga `Retry-After`, o un tiempo largo por defecto.
 *  - Sin red o 5xx: se reintenta unas veces; reenviar un lote es seguro.
 *  - Guardas (WooCommerce, flows, árbol de categorías, bodega): no se arreglan reenviando.
 */
import { CodigoErrorImportador, ErrorImportador } from '../tipos';

/** Forma mínima de un `HttpErrorResponse`, para no depender de Angular. */
export interface ErrorHttpLike {
  status?: number;
  error?: { code?: string; message?: string } | string | null;
  headers?: { get?: (nombre: string) => string | null } | null;
}

const BLOQUEANTES: CodigoErrorImportador[] = [
  'FLOW_PUBLISHES_PRODUCTS',
  'WOO_INTEGRATION_ACTIVE',
  'CATEGORY_TREE_UNREADABLE',
  'WAREHOUSE_INVALID',
  'FEATURE_DISABLED',
  'SITE_NOT_FOUND',
  'SITE_TOO_LARGE',
  'TOO_MANY',
  'INVALID_PAYLOAD',
  'BATCH_NOT_FOUND',
];

const CONOCIDOS: CodigoErrorImportador[] = [...BLOQUEANTES, 'IMPORT_IN_PROGRESS', 'RATE_LIMITED'];

export const MENSAJES_ERROR: { [c in CodigoErrorImportador]: string } = {
  INVALID_PAYLOAD: 'El archivo no llegó con la forma esperada. Vuelve a subirlo desde «Traer mi tienda».',
  FEATURE_DISABLED: 'Traer tu tienda todavía no está habilitado para tu empresa.',
  SITE_NOT_FOUND: 'No encontramos ese sitio en tu empresa. Elige uno de tus sitios.',
  BATCH_NOT_FOUND: 'No encontramos esa importación de clientes en tu empresa.',
  FLOW_PUBLISHES_PRODUCTS: 'Tu empresa tiene un flujo que publica productos en otra tienda. Apágalo antes de traer tus productos para no pisar el catálogo.',
  WOO_INTEGRATION_ACTIVE: 'Tu empresa tiene la integración con WooCommerce activa. Desactívala antes de traer tu tienda para no duplicar productos.',
  CATEGORY_TREE_UNREADABLE: 'No pudimos leer las categorías de tu empresa. Inténtalo de nuevo en unos minutos.',
  WAREHOUSE_INVALID: 'Elige una bodega activa para cargar las existencias.',
  IMPORT_IN_PROGRESS: 'Hay otra importación en curso en tu empresa. Esperamos a que termine y seguimos.',
  TOO_MANY: 'Este envío es demasiado grande. Vuelve a intentarlo desde «Traer mi tienda».',
  RATE_LIMITED: 'Hiciste muchas solicitudes seguidas. Esperamos un momento y seguimos.',
  SITE_TOO_LARGE: 'El borrador de tu sitio ya es muy grande y no cabe más redirecciones.',
  NETWORK: 'No pudimos comunicarnos con Katuq. Revisa tu conexión.',
  SERVER: 'Katuq tuvo un problema al procesar este envío.',
  UNKNOWN: 'No pudimos completar este envío.',
};

const TOPE_RETRY_AFTER_MS = 120000;

function esperaDeCabecera(e: ErrorHttpLike): number | undefined {
  const crudo = e.headers && typeof e.headers.get === 'function' ? e.headers.get('Retry-After') : null;
  const s = crudo === null || crudo === undefined ? NaN : Number(crudo);
  return Number.isFinite(s) && s >= 0 ? Math.min(s * 1000, TOPE_RETRY_AFTER_MS) : undefined;
}

/** Convierte lo que lanza el cliente HTTP en un error de la pantalla. Nunca copia el cuerpo de la petición. */
export function clasificarError(entrada: unknown): ErrorImportador {
  const e = (entrada && typeof entrada === 'object' ? entrada : {}) as ErrorHttpLike;
  const status = typeof e.status === 'number' ? e.status : 0;
  const cuerpo = e.error && typeof e.error === 'object' ? e.error : null;
  const crudo = cuerpo && typeof cuerpo.code === 'string' ? cuerpo.code : '';
  const mensajeServidor = cuerpo && typeof cuerpo.message === 'string' ? cuerpo.message : '';

  let code: CodigoErrorImportador;
  if (CONOCIDOS.includes(crudo as CodigoErrorImportador)) code = crudo as CodigoErrorImportador;
  else if (status === 429) code = 'RATE_LIMITED';
  else if (status === 0) code = 'NETWORK';
  else if (status >= 500) code = 'SERVER';
  else code = 'UNKNOWN';

  const retryable = code === 'IMPORT_IN_PROGRESS' || code === 'RATE_LIMITED' || code === 'NETWORK' || code === 'SERVER';
  const blocking = BLOQUEANTES.includes(code);
  // El mensaje del servidor es en español y sin jerga (contrato); se prefiere sobre el nuestro.
  const message = mensajeServidor || MENSAJES_ERROR[code];
  const retryAfterMs = esperaDeCabecera(e);
  return retryAfterMs === undefined ? { code, status, message, retryable, blocking } : { code, status, message, retryable, blocking, retryAfterMs };
}

export interface OpcionesReintento {
  maxIntentos?: number;
  esperaBaseMs?: number;
  esperaMaximaMs?: number;
  esperar?: (ms: number) => Promise<void>;
  /** Aviso a la pantalla antes de cada espera. */
  alEsperar?: (error: ErrorImportador, intento: number, esperaMs: number) => void;
}

export type ResultadoEnvio<T> = { ok: true; valor: T; intentos: number } | { ok: false; error: ErrorImportador; intentos: number };

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Espera antes del intento siguiente: la del servidor, o 2, 4, 8… segundos con tope; 30 s en RATE_LIMITED. */
export function esperaDeReintento(error: ErrorImportador, intento: number, base = 2000, maxima = 30000): number {
  if (error.retryAfterMs !== undefined) return error.retryAfterMs;
  if (error.code === 'RATE_LIMITED') return maxima;
  return Math.min(base * 2 ** (intento - 1), maxima);
}

/** Envía un lote; ante un error reintentable espera y reenvía el mismo lote. Lo demás se devuelve tal cual. */
export async function enviarConReintento<T>(enviar: () => Promise<T>, opciones: OpcionesReintento = {}): Promise<ResultadoEnvio<T>> {
  const maxIntentos = opciones.maxIntentos === undefined ? 5 : Math.max(1, opciones.maxIntentos);
  const esperar = opciones.esperar || dormir;
  let intento = 0;
  for (;;) {
    intento++;
    try {
      return { ok: true, valor: await enviar(), intentos: intento };
    } catch (crudo) {
      const error = clasificarError(crudo);
      if (!error.retryable || intento >= maxIntentos) return { ok: false, error, intentos: intento };
      const ms = esperaDeReintento(error, intento, opciones.esperaBaseMs, opciones.esperaMaximaMs);
      if (opciones.alEsperar) opciones.alEsperar(error, intento, ms);
      await esperar(ms);
    }
  }
}

export interface AvanceLotes<T> {
  /** Respuestas de los lotes terminados, en orden. */
  respuestas: T[];
  /** Índice (desde 0) del primer lote sin terminar; igual al total si todos terminaron. */
  siguiente: number;
  detenido: { lote: number; error: ErrorImportador } | null;
}

/**
 * Envía los lotes en orden, de a uno. Se detiene en el primer lote que no se pudo enviar (guarda,
 * error propio o reintentos agotados) y devuelve desde dónde seguir: la persona reintenta ese lote,
 * no toda la importación. `desde` y `previas` permiten reanudar.
 */
export async function procesarLotes<L, T>(
  lotes: L[],
  enviar: (lote: L, numero: number) => Promise<T>,
  opciones: OpcionesReintento & { desde?: number; previas?: T[]; alTerminar?: (numero: number, respuesta: T) => void } = {},
): Promise<AvanceLotes<T>> {
  const respuestas: T[] = opciones.previas ? [...opciones.previas] : [];
  for (let i = opciones.desde || 0; i < lotes.length; i++) {
    const r = await enviarConReintento(() => enviar(lotes[i], i + 1), opciones);
    if ('error' in r) return { respuestas, siguiente: i, detenido: { lote: i + 1, error: r.error } };
    respuestas.push(r.valor);
    if (opciones.alTerminar) opciones.alTerminar(i + 1, r.valor);
  }
  return { respuestas, siguiente: lotes.length, detenido: null };
}
