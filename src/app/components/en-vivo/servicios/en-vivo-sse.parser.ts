import type { MensajeStream, NombreMensajeStream } from './en-vivo.modelos';

/**
 * Parser del SSE de "En vivo" (diseño 5). Funciones PURAS: sin red, sin reloj, sin
 * Angular, para poder probarlas con node suelto (Karma del front está roto).
 *
 * Formato (norma SSE): bloques separados por una línea en blanco; cada línea es
 * `campo: valor`; `:` al inicio es un comentario (el latido de 20 s del servidor).
 *
 *   id: 42
 *   event: evento
 *   data: {"id":"42","tipo":"pedido_nuevo",...}
 *
 *   : latido
 */

/** Un bloque SSE ya separado en sus campos. */
export interface BloqueSse {
  /** Valor de `id:`; undefined si el bloque no lo trae. */
  id?: string;
  /** Valor de `event:`; 'message' si no lo trae (norma SSE). */
  evento: string;
  /** Las líneas `data:` unidas con salto de línea. */
  datos: string;
  /** Valor de `retry:` en ms, si venía y era un entero. */
  reintentoMs?: number;
}

export interface ResultadoParseoSse {
  /** Bloques completos, en el orden en que llegaron. */
  bloques: BloqueSse[];
  /** Bloques que solo traían comentarios (el latido). Sirven para saber que la conexión vive. */
  latidos: number;
  /** Texto sin terminar: va al principio del siguiente trozo. */
  resto: string;
}

interface BloqueLeido {
  bloque: BloqueSse | null;
  esLatido: boolean;
}

function leerBloque(texto: string): BloqueLeido {
  let id: string | undefined;
  let evento: string | undefined;
  let reintentoMs: number | undefined;
  const datos: string[] = [];
  let hayComentario = false;

  for (const linea of texto.split('\n')) {
    if (linea === '') continue;
    if (linea.charAt(0) === ':') {
      hayComentario = true;
      continue;
    }
    const posicion = linea.indexOf(':');
    const campo = posicion === -1 ? linea : linea.slice(0, posicion);
    let valor = posicion === -1 ? '' : linea.slice(posicion + 1);
    // La norma quita UN solo espacio inicial del valor.
    if (valor.charAt(0) === ' ') valor = valor.slice(1);

    switch (campo) {
      case 'data':
        datos.push(valor);
        break;
      case 'event':
        evento = valor;
        break;
      case 'id':
        // Un NUL invalida el id (norma).
        if (valor.indexOf('\u0000') === -1) id = valor;
        break;
      case 'retry':
        if (/^\d+$/.test(valor)) reintentoMs = parseInt(valor, 10);
        break;
      default:
        // Campo desconocido: se ignora.
        break;
    }
  }

  // Se despacha si trae datos o un nombre de evento (aunque no tenga datos: `event: reconectar`).
  if (datos.length > 0 || evento !== undefined) {
    const bloque: BloqueSse = { evento: evento !== undefined && evento !== '' ? evento : 'message', datos: datos.join('\n') };
    if (id !== undefined) bloque.id = id;
    if (reintentoMs !== undefined) bloque.reintentoMs = reintentoMs;
    return { bloque, esLatido: false };
  }
  return { bloque: null, esLatido: hayComentario };
}

/**
 * Separa lo acumulado en bloques completos. Llamarla con `resto + trozo nuevo` cada vez
 * que llega un trozo del stream.
 *
 * - Acepta `\n`, `\r\n` y `\r` como fin de línea.
 * - Un `\r` al final del trozo puede ser la mitad de un `\r\n` partido en dos: se deja
 *   en `resto` hasta ver el siguiente trozo.
 * - Un bloque sin la línea en blanco final NO se entrega: queda en `resto`.
 */
export function parsearSse(texto: string): ResultadoParseoSse {
  let crudo = texto;
  let colaCr = '';
  if (crudo.length > 0 && crudo.charAt(crudo.length - 1) === '\r') {
    colaCr = '\r';
    crudo = crudo.slice(0, -1);
  }

  const normal = crudo.replace(/\r\n?/g, '\n');
  const trozos = normal.split('\n\n');
  const resto = trozos.pop() as string;

  const bloques: BloqueSse[] = [];
  let latidos = 0;
  for (const trozo of trozos) {
    const leido = leerBloque(trozo);
    if (leido.bloque) bloques.push(leido.bloque);
    else if (leido.esLatido) latidos += 1;
  }
  return { bloques, latidos, resto: resto + colaCr };
}

// ── Del bloque al mensaje tipado ────────────────────────────────────────────

const NOMBRES_MENSAJE: ReadonlySet<string> = new Set<NombreMensajeStream>([
  'foto',
  'evento',
  'cifras',
  'radar',
  'opttia',
  'modo',
  'reconectar',
]);

export type Registro = Record<string, unknown>;

export function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Convierte un bloque en el mensaje del servidor. Devuelve null (se ignora) si el
 * nombre no es conocido, el JSON está roto o falta lo mínimo. Un mensaje malo nunca
 * debe tumbar el canal.
 */
export function interpretarBloque(bloque: BloqueSse): MensajeStream | null {
  if (!NOMBRES_MENSAJE.has(bloque.evento)) return null;
  const nombre = bloque.evento as NombreMensajeStream;

  let datos: unknown = {};
  if (bloque.datos.trim() !== '') {
    try {
      datos = JSON.parse(bloque.datos);
    } catch {
      return null;
    }
  }
  if (!esRegistro(datos)) return null;

  switch (nombre) {
    case 'foto':
      return { tipo: 'foto', datos: datos as unknown as Extract<MensajeStream, { tipo: 'foto' }>['datos'] };
    case 'evento': {
      // El id sale del JSON; si no, del campo `id:` del bloque.
      const id = typeof datos['id'] === 'string' && datos['id'] !== '' ? datos['id'] : bloque.id;
      if (!id || typeof datos['tipo'] !== 'string') return null;
      return { tipo: 'evento', datos: { ...datos, id } as unknown as Extract<MensajeStream, { tipo: 'evento' }>['datos'] };
    }
    case 'cifras':
      return { tipo: 'cifras', datos: datos as unknown as Extract<MensajeStream, { tipo: 'cifras' }>['datos'] };
    case 'radar':
      return { tipo: 'radar', datos: datos as unknown as Extract<MensajeStream, { tipo: 'radar' }>['datos'] };
    case 'opttia':
      return { tipo: 'opttia', datos: datos as unknown as Extract<MensajeStream, { tipo: 'opttia' }>['datos'] };
    case 'modo':
      return datos['modo'] === 'sondeo' || datos['modo'] === 'vivo'
        ? { tipo: 'modo', datos: datos as unknown as Extract<MensajeStream, { tipo: 'modo' }>['datos'] }
        : null;
    case 'reconectar':
      return { tipo: 'reconectar', datos: datos as unknown as Extract<MensajeStream, { tipo: 'reconectar' }>['datos'] };
    default:
      return null;
  }
}
