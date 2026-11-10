import { EstadoOpttiaPlataforma, MePlataforma } from '../plataforma.tipos';
import { TEXTOS } from '../plataforma.textos';

/**
 * D-700 23.5 y 25.4 — Lógica pura de Opttia de plataforma (sin Angular, sin red): quién ve los botones, cómo se lee el
 * flujo de eventos y qué texto fijo se muestra en cada error. Todo lo que llega del servidor se trata como TEXTO.
 */

export const MAX_PREGUNTA = 500;
export const ESPERA_PREGUNTA_MS = 100000;
export const ESPERA_RESUMEN_MS = 60000;

/** Lo que dice `GET /me`. Sin respuesta o sin la llave, nada se muestra (falla cerrado). */
export function estadoOpttia(me: MePlataforma | null | undefined): EstadoOpttiaPlataforma {
  const o = me && me.opttia;
  // El servidor da `autorizado` solo con Opttia de plataforma encendida (opttiaEstado.js: autorizado implica activo), así que
  // no hay un estado «apagada» que dibujar: sin autorización no se ve nada.
  const autorizado = !!(o && o.autorizado === true);
  return { autorizado, activo: autorizado, narrativa: autorizado && o!.narrativa === true };
}

/** Quita espacios de los extremos y recorta al tope. */
export function limpiarPregunta(texto: unknown): string {
  return typeof texto === 'string' ? texto.replace(/\s+/g, ' ').trim().slice(0, MAX_PREGUNTA) : '';
}

/** ¿Hay un comercio al que fijar la pregunta? (cualquier valor que no sea vacío/nulo cuenta como «sí»). */
export function hayComercio(companyDocId?: string | null): boolean {
  return companyDocId !== null && companyDocId !== undefined && companyDocId !== '';
}

/** Forma del id de comercio que acepta el servidor. Solo evita enviar basura; quien decide es el servidor. */
export function comercioValido(companyDocId: unknown): companyDocId is string {
  return typeof companyDocId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(companyDocId);
}

/**
 * Cuerpo cerrado: solo el último mensaje del usuario y, si hay, el comercio. Nunca `company`.
 * Si se pidió un comercio y su id no es válido devuelve `null`: NO se degrada a pregunta general de plataforma.
 */
export function cuerpoPregunta(texto: string, companyDocId?: string | null): { messages: Array<{ role: 'user'; content: string }>; companyDocId?: string } | null {
  const cuerpo: { messages: Array<{ role: 'user'; content: string }>; companyDocId?: string } = { messages: [{ role: 'user', content: limpiarPregunta(texto) }] };
  if (hayComercio(companyDocId)) {
    if (!comercioValido(companyDocId)) return null;
    cuerpo.companyDocId = companyDocId;
  }
  return cuerpo;
}

/** Dirección del chat de plataforma del ADK, igual que la del chat básico. */
export function direccionPlataforma(env: { opttiaApi?: string; urlApi?: string }): string {
  return `${(env.opttiaApi || `${env.urlApi || ''}/adk`).replace(/\/$/, '')}/agui/platform/v1`;
}

/** Token de la sesión (`localStorage['user'].token`). Sin almacenamiento o sin token, `null`. */
export function tokenDeSesion(almacen: { getItem(k: string): string | null } | null | undefined): string | null {
  try {
    const crudo = almacen ? almacen.getItem('user') : null;
    const t = crudo ? JSON.parse(crudo).token : null;
    return typeof t === 'string' && t.trim() ? t : null;
  } catch {
    return null;
  }
}

export type EventoPanel =
  | { tipo: 'acceso'; restantesDia: number | null; usosMax: number | null }
  | { tipo: 'inicio' }
  | { tipo: 'texto'; delta: string }
  | { tipo: 'fin' }
  | { tipo: 'error'; mensaje: string };

const MAX_MENSAJE_ERROR = 300;
/** Mensajes fijos que el ADK de plataforma puede mandar en `RUN_ERROR` y que ya están escritos en los textos del front. */
const MENSAJES_CONOCIDOS = new Set<string>([TEXTOS.opttia.errorTiempo, TEXTOS.opttia.errorGeneral, TEXTOS.opttia.errorCupo, TEXTOS.opttia.errorAcceso, TEXTOS.opttia.errorPregunta, TEXTOS.opttia.errorSesion]);

/** Un evento del flujo (ya convertido de JSON) → lo que le importa al panel. Lo desconocido se ignora. */
export function interpretarEvento(ev: unknown): EventoPanel | null {
  if (!ev || typeof ev !== 'object') return null;
  const e = ev as Record<string, unknown>;
  switch (e['type']) {
    case 'platform:ACCESS': {
      const a = (e['access'] && typeof e['access'] === 'object' ? e['access'] : {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      return { tipo: 'acceso', restantesDia: num(a['restantesDia']), usosMax: num(a['usosMax']) };
    }
    case 'RUN_STARTED': return { tipo: 'inicio' };
    case 'TEXT_MESSAGE_CONTENT': return typeof e['delta'] === 'string' ? { tipo: 'texto', delta: e['delta'] } : null;
    case 'RUN_FINISHED': return { tipo: 'fin' };
    case 'RUN_ERROR': {
      // Nunca se pinta el texto del servidor: solo una lista cerrada de mensajes fijos; el resto, el genérico.
      const m = typeof e['message'] === 'string' ? e['message'].trim().slice(0, MAX_MENSAJE_ERROR) : '';
      return { tipo: 'error', mensaje: MENSAJES_CONOCIDOS.has(m) ? m : TEXTOS.opttia.errorGeneral };
    }
    default: return null;
  }
}

/** Lector de líneas `data:` de un flujo SSE por trozos. `alimentar` devuelve los eventos completos; lo parcial espera al siguiente trozo. */
export class LectorSse {
  private resto = '';

  alimentar(trozo: string, fin = false): EventoPanel[] {
    this.resto += trozo;
    const lineas = this.resto.split(/\r?\n/);
    this.resto = fin ? '' : (lineas.pop() || '');
    const salida: EventoPanel[] = [];
    for (const l of lineas) {
      if (!l.startsWith('data:')) continue;
      const crudo = l.slice(5).trim();
      if (!crudo || crudo === '[DONE]') continue;
      try {
        const ev = interpretarEvento(JSON.parse(crudo));
        if (ev) salida.push(ev);
      } catch { /* un evento parcial o no JSON no derriba la respuesta */ }
    }
    return salida;
  }
}

/** Error HTTP antes del flujo → texto fijo. Nunca el cuerpo de la respuesta. */
export function textoErrorHttp(estado: number): string {
  const t = TEXTOS.opttia;
  if (estado === 401) return t.errorSesion;
  if (estado === 403) return t.errorAcceso;
  if (estado === 429) return t.errorCupo;
  if (estado === 400 || estado === 422) return t.errorPregunta;
  return t.errorGeneral;
}

/**
 * Error del resumen mensual → texto fijo en español, elegido SOLO por el estado HTTP. Los códigos internos del servidor
 * no viajan en el front (es público) y el cuerpo de la respuesta nunca se muestra.
 */
export function textoErrorResumen(estado?: number): string {
  const t = TEXTOS.resumenMensual.errores;
  switch (estado) {
    case 403: return t.acceso;
    case 409: return t.enCurso;
    case 422: return t.solicitud;
    case 429: return t.cupo;
    case 503: return t.noDisponible;
    default: return TEXTOS.resumenMensual.errorGeneral;
  }
}

/** Texto del cupo restante o `null` si el servidor no lo dijo. */
export function textoRestantes(n: number | null | undefined, resumen = false): string | null {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
  return (resumen ? TEXTOS.resumenMensual : TEXTOS.opttia).restantes(Math.floor(n));
}
