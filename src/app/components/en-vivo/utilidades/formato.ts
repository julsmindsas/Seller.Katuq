import { Traductor } from './traductor';

/**
 * Formato de cifras, horas y duraciones de "En vivo" (hora de Colombia).
 * Funciones PURAS: sin Angular y sin reloj propio (la hora entra por parámetro).
 *
 * Los textos (plurales, "hace 3 min", "a. m.") se traducen con el `Traductor` que pasa el componente.
 * Es OPCIONAL aquí porque estas funciones las usan muchas piezas: sin él, salen en español.
 */

/** Español de respaldo cuando quien llama no pasa traductor. Mismas claves que `es.json`. */
const ESPANOL_DE_RESPALDO: Readonly<Record<string, string>> = {
  'enVivo.formato.locale': 'es-CO',
  'enVivo.formato.venta': '{{n}} venta',
  'enVivo.formato.ventas': '{{n}} ventas',
  'enVivo.formato.pedido': '{{n}} pedido',
  'enVivo.formato.pedidos': '{{n}} pedidos',
  'enVivo.formato.dineroMiles': '${{n}} mil',
  'enVivo.formato.am': 'a. m.',
  'enVivo.formato.pm': 'p. m.',
  'enVivo.formato.ahora': 'ahora',
  'enVivo.formato.haceSegundos': 'hace {{n}} s',
  'enVivo.formato.haceMinutos': 'hace {{n}} min',
  'enVivo.formato.haceHoras': 'hace {{n}} h',
  'enVivo.formato.dias': '{{n}} días', // i18n-ignorar: respaldo sin traductor; en pantalla va la clave
  'enVivo.formato.unDiaYHoras': '1 día y {{n}} h', // i18n-ignorar: respaldo sin traductor; en pantalla va la clave
  'enVivo.formato.unDia': '1 día', // i18n-ignorar: respaldo sin traductor; en pantalla va la clave
};

const traductorDeRespaldo: Traductor = (clave, params) =>
  (ESPANOL_DE_RESPALDO[clave] ?? clave).replace(/\{\{(\w+)\}\}/g, (_, nombre: string) => String(params?.[nombre] ?? ''));

/** Idioma de las fechas y horas (`es-CO` o `en-US`), según el idioma activo. */
function idiomaDeFechas(t: Traductor): string {
  const locale = t('enVivo.formato.locale');
  return locale && locale !== 'enVivo.formato.locale' ? locale : 'es-CO';
}

const ZONA_COLOMBIA = 'America/Bogota';
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

const FORMATO_ENTERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const FORMATO_DECIMAL = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatosDeFecha = new Map<string, Intl.DateTimeFormat>();

/** Formateador de fechas por tipo e idioma (se crea una sola vez). */
function formatoDeFecha(tipo: 'hora' | 'fecha' | 'diaMes', locale: string): Intl.DateTimeFormat {
  const llave = `${tipo}|${locale}`;
  let formato = formatosDeFecha.get(llave);
  if (!formato) {
    const opciones: Intl.DateTimeFormatOptions =
      tipo === 'hora'
        ? { hour: 'numeric', minute: '2-digit' }
        : tipo === 'fecha'
        ? { weekday: 'long', day: 'numeric', month: 'long' }
        : { day: 'numeric', month: 'long' };
    formato = new Intl.DateTimeFormat(locale, { ...opciones, timeZone: ZONA_COLOMBIA });
    formatosDeFecha.set(llave, formato);
  }
  return formato;
}

/** Cómo se escribe el valor de una tarjeta de cifras. */
export type FormatoCifra = 'entero' | 'decimal' | 'dinero' | 'ventas' | 'pedidos';

export function entero(n: number): string {
  return FORMATO_ENTERO.format(Math.round(Number.isFinite(n) ? n : 0));
}

export function decimal(n: number): string {
  return FORMATO_DECIMAL.format(Number.isFinite(n) ? n : 0);
}

/** "$128.900". */
export function dinero(n: number): string {
  return `$${entero(n)}`;
}

/** "$3,4 M" · "$850 mil" · "$900". Para espacios chicos (gráficas, mini cifras). */
export function dineroCorto(n: number, t: Traductor = traductorDeRespaldo): string {
  const absoluto = Math.abs(n);
  if (absoluto >= 1e6) {
    const millones = (n / 1e6).toFixed(absoluto >= 1e7 ? 0 : 1).replace('.', ',').replace(',0', '');
    return `$${millones} M`;
  }
  if (absoluto >= 1e3) return t('enVivo.formato.dineroMiles', { n: Math.round(n / 1e3) });
  return dinero(n);
}

/** Texto de un valor según su formato. Lo usan el conteo animado y el texto accesible. */
export function formatearCifra(valor: number, formato: FormatoCifra, t: Traductor = traductorDeRespaldo): string {
  switch (formato) {
    case 'dinero':
      return dinero(valor);
    case 'decimal':
      return decimal(valor);
    case 'ventas':
      return t(Math.round(valor) === 1 ? 'enVivo.formato.venta' : 'enVivo.formato.ventas', { n: entero(valor) });
    case 'pedidos':
      return t(Math.round(valor) === 1 ? 'enVivo.formato.pedido' : 'enVivo.formato.pedidos', { n: entero(valor) });
    default:
      return entero(valor);
  }
}

// ── Tiempo ──────────────────────────────────────────────────────────────────

/** Hora del día en Colombia (0 a 23). */
export function horaDeColombia(ms: number): number {
  return new Date(ms - DESFASE_COLOMBIA_MS).getUTCHours();
}

/** Día de Colombia como AAAA-MM-DD. */
export function diaDeColombia(ms: number): string {
  return new Date(ms - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}

/** "3:40 p. m." en hora de Colombia ("3:40 PM" en inglés). */
export function horaDeReloj(ms: number, t: Traductor = traductorDeRespaldo): string {
  return formatoDeFecha('hora', idiomaDeFechas(t)).format(new Date(ms));
}

/** "jueves, 8 de octubre" en hora de Colombia ("Thursday, October 8" en inglés). */
export function fechaLarga(ms: number, t: Traductor = traductorDeRespaldo): string {
  return formatoDeFecha('fecha', idiomaDeFechas(t)).format(new Date(ms));
}

/** "25 de septiembre" desde un AAAA-MM-DD; si no se entiende, devuelve el texto tal cual. */
export function diaYMes(aaaammdd: string, t: Traductor = traductorDeRespaldo): string {
  const ms = Date.parse(`${aaaammdd}T12:00:00-05:00`);
  return Number.isFinite(ms) ? formatoDeFecha('diaMes', idiomaDeFechas(t)).format(new Date(ms)) : aaaammdd;
}

/** "3 p. m." para una hora 0 a 23. */
export function horaCorta(hora: number, t: Traductor = traductorDeRespaldo): string {
  return `${hora % 12 || 12} ${t(hora < 12 ? 'enVivo.formato.am' : 'enVivo.formato.pm')}`;
}

/** "ahora" · "hace 40 s" · "hace 3 min" · "hace 2 h". */
export function horaRelativa(ms: number | null, ahoraMs: number, t: Traductor = traductorDeRespaldo): string {
  if (ms === null || !Number.isFinite(ms)) return '';
  const segundos = Math.max(0, Math.round((ahoraMs - ms) / 1000));
  if (segundos < 8) return t('enVivo.formato.ahora');
  if (segundos < 60) return t('enVivo.formato.haceSegundos', { n: segundos });
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return t('enVivo.formato.haceMinutos', { n: minutos });
  return t('enVivo.formato.haceHoras', { n: Math.floor(minutos / 60) });
}

/** "45 min" · "1 h 10 min"; desde 24 h, en días: "1 día y 3 h" · "6 días" (no "143 h 49 min"). */
export function duracion(ms: number, t: Traductor = traductorDeRespaldo): string {
  const minutos = Math.max(0, Math.round(ms / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const horasSueltas = horas % 24;
    if (dias > 1) return t('enVivo.formato.dias', { n: dias });
    return horasSueltas ? t('enVivo.formato.unDiaYHoras', { n: horasSueltas }) : t('enVivo.formato.unDia');
  }
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

// ── Comparaciones y nombres ─────────────────────────────────────────────────

/** Variación en % contra una referencia (entero). null si la referencia es 0: no hay contra qué comparar. */
export function variacionPct(actual: number, referencia: number): number | null {
  if (!Number.isFinite(actual) || !Number.isFinite(referencia) || referencia <= 0) return null;
  return Math.round(((actual - referencia) / referencia) * 100);
}

/** "+12 %" · "-5 %". */
export function textoPct(pct: number): string {
  return `${pct >= 0 ? '+' : '-'}${Math.abs(pct)} %`;
}

/** Iniciales de un nombre: "Carlos Rojas" → "CR". */
export function iniciales(nombre: string | null | undefined): string {
  const partes = String(nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '?';
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0];
  return letras.toUpperCase();
}

/** Compara nombres sin tildes ni mayúsculas ("Yeison Pérez" = "yeison perez"). */
export function claveDeNombre(nombre: string | null | undefined): string {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** "EnPacking" → "en packing" (para estados que el servidor manda en CamelCase). */
export function estadoLegible(estado: string | null | undefined): string {
  if (!estado) return '';
  return estado
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .toLowerCase();
}
