/**
 * Reglas puras de la tarjeta de Opttia (D-386, tarea 4.10): preguntas sugeridas, tope de
 * preguntas, "ocultar" aplicado al texto que escribe Opttia y qué acciones tienen un lugar en la
 * escena. Sin Angular y sin reloj propio (la hora entra por parámetro), para probarlas con node.
 *
 * Datos mínimos: la pantalla nunca manda datos de clientes a Opttia (solo la pregunta que escribe
 * la persona), y lo que Opttia devuelve ya viene sin ellos. Aquí solo se cuida lo que se MUESTRA.
 */
import { AccionOpttiaUi } from '../servicios/en-vivo-acciones';
import {
  EstadoEnVivo,
  PuntoOpttia,
  RespuestaPregunta,
  ResumenOpttia,
  TonoEnVivo,
  VistaEnVivo,
} from '../servicios/en-vivo.modelos';
import { diaDeColombia } from '../utilidades/formato';
import { IconoId } from '../utilidades/iconos';

/** Tope de caracteres de una pregunta (el servidor la corta igual). */
export const MAX_CARACTERES_PREGUNTA = 160;

/** Desde cuántos caracteres se muestra el contador "132 / 160". */
export const AVISO_CARACTERES = 120;

/** Tope de preguntas por usuario por hora (diseño 16): el servidor lo aplica; aquí solo se explica. */
export const MAX_PREGUNTAS_POR_HORA = 20;

/** Cuántas preguntas quedan para empezar a avisarlo. */
export const AVISAR_PREGUNTAS_RESTANTES = 5;

// ── Preguntas sugeridas ─────────────────────────────────────────────────────

const PREGUNTAS_KATUQ: ReadonlyArray<string> = [
  '¿Quién necesita ayuda ahora?',
  '¿Cómo vamos contra ayer?',
  '¿Quién despacha más rápido?',
  '¿Cuánto vendió Opttia hoy?',
  '¿Vamos para récord?',
];

const PREGUNTAS_COMERCIO: ReadonlyArray<string> = [
  '¿Qué despacho primero?',
  '¿Cómo voy contra ayer?',
  '¿Cuál es mi mejor canal hoy?',
  '¿Qué mensajero está libre?',
];

/** Cuando Katuq mira el tablero de un comercio ajeno: las mismas, en tercera persona. */
const PREGUNTAS_COMERCIO_AJENO: ReadonlyArray<string> = [
  '¿Qué despacha primero?',
  '¿Cómo va contra ayer?',
  '¿Cuál es su mejor canal hoy?',
  '¿Qué mensajero está libre?',
];

/** Las preguntas sugeridas de la vista: distintas para toda Katuq y para un comercio. */
export function preguntasSugeridas(vista: VistaEnVivo, soloLectura: boolean): ReadonlyArray<string> {
  if (vista === 'katuq') return PREGUNTAS_KATUQ;
  return soloLectura ? PREGUNTAS_COMERCIO_AJENO : PREGUNTAS_COMERCIO;
}

/** Título de la tarjeta según quién mira. */
export function tituloDeLaTarjeta(vista: VistaEnVivo, soloLectura: boolean): string {
  if (vista === 'katuq') return 'Lo que está pasando en Katuq, en palabras';
  return soloLectura ? 'Lo que Opttia diría de este comercio' : 'Opttia te recomienda';
}

// ── La pregunta ─────────────────────────────────────────────────────────────

/** La pregunta lista para enviar: sin espacios de las puntas y a lo sumo 160 caracteres. Vacía → null. */
export function prepararPregunta(texto: string | null | undefined): string | null {
  const limpia = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (!limpia) return null;
  return Array.from(limpia).slice(0, MAX_CARACTERES_PREGUNTA).join('');
}

// ── Tope de preguntas ───────────────────────────────────────────────────────

/** Máximo que se muestra de espera: el tope es por hora. */
const MAX_ESPERA_MIN = 60;

/**
 * En cuántos minutos puede volver a preguntar, si la respuesta es la del tope de 20 por hora
 * (`reintentarEnMin`). Siempre entero entre 1 y 60. null si la respuesta no es del tope.
 */
export function minutosParaReintentar(respuesta: Pick<RespuestaPregunta, 'reintentarEnMin'> | null | undefined): number | null {
  const valor = respuesta?.reintentarEnMin;
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  return Math.min(MAX_ESPERA_MIN, Math.max(1, Math.ceil(valor)));
}

/** "Podrás volver a preguntar en 7 min" · "en 1 min". */
export function textoReintento(minutos: number): string {
  const n = Math.max(1, Math.round(minutos));
  return `Podrás volver a preguntar en ${n} min`;
}

/** Minutos que faltan (hacia arriba) hasta `hastaMs`; 0 si ya pasó. */
export function minutosRestantes(hastaMs: number, ahoraMs: number): number {
  const falta = hastaMs - ahoraMs;
  return falta > 0 ? Math.ceil(falta / 60000) : 0;
}

/**
 * El tope de preguntas visto desde la pantalla. El servidor es quien cuenta (20 por usuario por
 * hora): al pasarlo responde con `reintentarEnMin` y NO llama a Opttia. Aquí solo se recuerda
 * hasta cuándo no se pregunta (para no gastar viajes) y qué decir mientras tanto. Sin reloj propio:
 * la hora entra por parámetro.
 */
export class TopeDePreguntas {
  private hastaMs: number | null = null;

  /** ¿Está cerrado el campo de preguntas? */
  get activo(): boolean {
    return this.hastaMs !== null;
  }

  /** Cierra las preguntas por `minutos` (entre 1 y 60). */
  bloquear(minutos: number, ahoraMs: number): void {
    this.hastaMs = ahoraMs + Math.min(MAX_ESPERA_MIN, Math.max(1, Math.round(minutos))) * 60000;
  }

  /** "Podrás volver a preguntar en 7 min", con los minutos que faltan ahora; vacío si no hay tope. */
  texto(ahoraMs: number): string {
    if (this.hastaMs === null) return '';
    return textoReintento(Math.max(1, minutosRestantes(this.hastaMs, ahoraMs)));
  }

  /** Abre de nuevo si ya pasó el tiempo. Devuelve true solo en el momento en que se abrió. */
  liberarSiPaso(ahoraMs: number): boolean {
    if (this.hastaMs === null || minutosRestantes(this.hastaMs, ahoraMs) > 0) return false;
    this.hastaMs = null;
    return true;
  }

  liberar(): void {
    this.hastaMs = null;
  }
}

/** "Te queda 1 pregunta esta hora" / "Te quedan 3 preguntas esta hora". Vacío si quedan muchas o ninguna. */
export function textoPreguntasRestantes(restantes: number | null | undefined): string {
  if (typeof restantes !== 'number' || !Number.isFinite(restantes)) return '';
  const n = Math.floor(restantes);
  if (n <= 0 || n > AVISAR_PREGUNTAS_RESTANTES) return '';
  return n === 1 ? 'Te queda 1 pregunta esta hora' : `Te quedan ${n} preguntas esta hora`;
}

// ── "Ocultar" aplicado al texto de Opttia ───────────────────────────────────

export interface OpcionesMascara {
  /** Cambia los montos ($128.900, $3,4 M, $850 mil, 4 millones de pesos) por "$•••". */
  montos: boolean;
  /** Nombres de comercios a esconder (solo toda Katuq con "ocultar comercios y montos"). */
  comercios?: ReadonlyArray<string>;
}

const MONTO_CON_SIGNO = /\$\s?\d(?:[\d.,]*\d)?(?:\s?(?:millones|millón|mil|M|k)(?![\p{L}\p{N}]))?/giu;
const MONTO_EN_PALABRAS = /\d(?:[\d.,]*\d)?\s?(?:millones|millón|mil)\s+de\s+pesos/giu;

function escaparParaRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** true si lo que va antes en el texto cierra una frase (o no hay nada): el reemplazo va con mayúscula. */
function abreFrase(antes: string): boolean {
  const resto = antes.replace(/\s+$/, '');
  return resto === '' || /[.!?¿¡]$/.test(resto);
}

/**
 * Aplica "ocultar" a un texto que escribió Opttia: los montos pasan a "$•••" y los nombres de
 * comercio, a "un comercio". Puro. Sin opciones activas devuelve el texto tal cual.
 */
export function enmascarar(texto: string | null | undefined, opciones: OpcionesMascara): string {
  let salida = String(texto ?? '');
  if (!salida) return '';

  if (opciones.montos) {
    salida = salida.replace(MONTO_CON_SIGNO, () => '$•••').replace(MONTO_EN_PALABRAS, () => '$••• pesos');
  }

  const nombres = Array.from(new Set((opciones.comercios ?? []).map((n) => String(n ?? '').trim()).filter((n) => n.length >= 3)));
  nombres.sort((a, b) => b.length - a.length);
  for (const nombre of nombres) {
    try {
      const patron = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaparParaRegExp(nombre)})(?![\\p{L}\\p{N}])`, 'giu');
      salida = salida.replace(patron, (_todo: string, previo: string, _nombre: string, posicion: number) => {
        const quien = abreFrase(salida.slice(0, posicion + previo.length)) ? 'Un comercio' : 'un comercio';
        return `${previo}${quien}`;
      });
    } catch {
      // Un nombre raro que no arma el patrón: se deja pasar, no se rompe la tarjeta.
    }
  }
  return salida;
}

/**
 * La máscara que pide "ocultar" para lo que se ve ahora. En un comercio: solo montos (a Opttia no
 * se le manda ni se le recibe nada de clientes). En toda Katuq: montos y nombres de comercios
 * ("ocultar comercios y montos"). Sin "ocultar": no esconde nada.
 */
export function mascaraDe(
  estado: Pick<EstadoEnVivo, 'vista' | 'cifrasGlobal'>,
  ocultar: boolean
): OpcionesMascara {
  if (!ocultar) return { montos: false };
  const comercios = estado.vista === 'katuq' ? (estado.cifrasGlobal?.comercios ?? []).map((c) => c.nombre) : [];
  return { montos: true, comercios };
}

// ── Resumen ─────────────────────────────────────────────────────────────────

const ICONO_POR_TONO: Readonly<Record<TonoEnVivo, IconoId>> = {
  acento: 'trofeo',
  ok: 'check',
  aviso: 'alerta',
  peligro: 'alerta',
  info: 'pulso',
  neutro: 'ia',
};

/** Icono del punto de un resumen según su tono. */
export function iconoDeTono(tono: TonoEnVivo | string | null | undefined): IconoId {
  return (tono && Object.prototype.hasOwnProperty.call(ICONO_POR_TONO, tono) && ICONO_POR_TONO[tono as TonoEnVivo]) || 'ia';
}

/** Puntos del resumen que se pintan: hasta 4, sin los que vienen vacíos. */
export function puntosDelResumen(resumen: ResumenOpttia | null | undefined): PuntoOpttia[] {
  const puntos = Array.isArray(resumen?.puntos) ? (resumen as ResumenOpttia).puntos : [];
  return puntos.filter((p) => p && typeof p.texto === 'string' && p.texto.trim() !== '').slice(0, 4);
}

/** Titular y puntos como líneas sueltas (la narración recorre esto cuando no hay eventos). */
export function lineasDelResumen(resumen: ResumenOpttia | null | undefined, mascara: OpcionesMascara): string[] {
  if (!resumen) return [];
  const lineas: string[] = [];
  if (typeof resumen.titular === 'string' && resumen.titular.trim()) lineas.push(resumen.titular.trim());
  for (const punto of puntosDelResumen(resumen)) lineas.push(punto.texto.trim());
  return lineas.map((l) => enmascarar(l, mascara));
}

/** Milisegundos en que Opttia escribió el resumen; null si la hora no se entiende. */
export function instanteDelResumen(resumen: ResumenOpttia | null | undefined): number | null {
  if (!resumen || typeof resumen.generadoEn !== 'string') return null;
  const ms = Date.parse(resumen.generadoEn);
  return Number.isFinite(ms) ? ms : null;
}

/** "Actualizado hace 40 s" · "Actualizado hace 3 min" · "Actualizado hace 2 h" · "Actualizado ahora". */
export function textoActualizado(generadoMs: number | null, ahoraMs: number): string {
  if (generadoMs === null) return '';
  const segundos = Math.max(0, Math.round((ahoraMs - generadoMs) / 1000));
  if (segundos < 8) return 'Actualizado ahora';
  if (segundos < 60) return `Actualizado hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `Actualizado hace ${minutos} min`;
  return `Actualizado hace ${Math.floor(minutos / 60)} h`;
}

/** Clave de un resumen: cambia solo cuando Opttia escribió uno nuevo. */
export function claveDelResumen(resumen: ResumenOpttia | null | undefined): string {
  return resumen ? `${resumen.generadoEn}|${resumen.titular}` : '';
}

// ── Vendido con Opttia ──────────────────────────────────────────────────────

/** Lo vendido hoy en pedidos que nacieron de una cotización armada por el bot de WhatsApp de Opttia. */
export interface VendidoConOpttia {
  pedidos: number;
  ventas: number;
}

/**
 * "Vendido con Opttia hoy" de lo que se mira. Toda Katuq: `cifrasGlobal.opttia`. Un comercio:
 * `cifras.conOpttia` si el servidor ya lo manda; si no, se cuenta con los pedidos de hoy marcados
 * `ia` (la foto trae también los activos de días anteriores, por eso se filtra por el día de
 * Colombia de la fecha de creación). null si no hay ninguno.
 */
export function vendidoConOpttia(
  estado: Pick<EstadoEnVivo, 'vista' | 'cifras' | 'cifrasGlobal' | 'pedidos'>
): VendidoConOpttia | null {
  if (estado.vista === 'katuq') {
    const g = estado.cifrasGlobal?.opttia;
    return g && g.pedidos > 0 ? { pedidos: g.pedidos, ventas: g.ventas } : null;
  }
  const cifras = estado.cifras;
  if (!cifras) return null;
  if (cifras.conOpttia) {
    return cifras.conOpttia.pedidos > 0 ? { pedidos: cifras.conOpttia.pedidos, ventas: cifras.conOpttia.ventas } : null;
  }
  let pedidos = 0;
  let ventas = 0;
  for (const p of estado.pedidos) {
    if (!p.ia || p.cancelado || p.tC === null || diaDeColombia(p.tC) !== cifras.dia) continue;
    pedidos++;
    ventas += p.monto;
  }
  return pedidos > 0 ? { pedidos, ventas } : null;
}

// ── Acciones y escena ───────────────────────────────────────────────────────

/**
 * ¿Alguna acción apunta a algo que existe en la escena (un pedido, un mensajero o un comercio)?
 * Las listas ("ver los pedidos de WhatsApp") no tienen lugar en la escena. Con esto se decide si
 * la respuesta ofrece "Verlo en la escena".
 */
export function tieneObjetivoEnEscena(acciones: ReadonlyArray<AccionOpttiaUi>): boolean {
  return acciones.some((a) => a.accion.tipo === 'abrir-pedido' || a.accion.tipo === 'abrir-mensajero' || a.accion.tipo === 'abrir-comercio');
}
