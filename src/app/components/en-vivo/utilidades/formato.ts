/**
 * Formato de cifras, horas y duraciones de "En vivo" (hora de Colombia, es-CO).
 * Funciones PURAS: sin Angular y sin reloj propio (la hora entra por parámetro).
 */

const ZONA_COLOMBIA = 'America/Bogota';
const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

const FORMATO_ENTERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const FORMATO_DECIMAL = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const FORMATO_HORA = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: ZONA_COLOMBIA });
const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: ZONA_COLOMBIA,
});
const FORMATO_DIA_MES = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: ZONA_COLOMBIA });

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
export function dineroCorto(n: number): string {
  const absoluto = Math.abs(n);
  if (absoluto >= 1e6) {
    const millones = (n / 1e6).toFixed(absoluto >= 1e7 ? 0 : 1).replace('.', ',').replace(',0', '');
    return `$${millones} M`;
  }
  if (absoluto >= 1e3) return `$${Math.round(n / 1e3)} mil`;
  return dinero(n);
}

/** Texto de un valor según su formato. Lo usan el conteo animado y el texto accesible. */
export function formatearCifra(valor: number, formato: FormatoCifra): string {
  switch (formato) {
    case 'dinero':
      return dinero(valor);
    case 'decimal':
      return decimal(valor);
    case 'ventas':
      return `${entero(valor)} ${Math.round(valor) === 1 ? 'venta' : 'ventas'}`;
    case 'pedidos':
      return `${entero(valor)} ${Math.round(valor) === 1 ? 'pedido' : 'pedidos'}`;
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

/** "3:40 p. m." en hora de Colombia. */
export function horaDeReloj(ms: number): string {
  return FORMATO_HORA.format(new Date(ms));
}

/** "jueves, 8 de octubre" en hora de Colombia. */
export function fechaLarga(ms: number): string {
  return FORMATO_FECHA.format(new Date(ms));
}

/** "25 de septiembre" desde un AAAA-MM-DD; si no se entiende, devuelve el texto tal cual. */
export function diaYMes(aaaammdd: string): string {
  const ms = Date.parse(`${aaaammdd}T12:00:00-05:00`);
  return Number.isFinite(ms) ? FORMATO_DIA_MES.format(new Date(ms)) : aaaammdd;
}

/** "3 p. m." para una hora 0 a 23. */
export function horaCorta(hora: number): string {
  return `${hora % 12 || 12} ${hora < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "ahora" · "hace 40 s" · "hace 3 min" · "hace 2 h". */
export function horaRelativa(ms: number | null, ahoraMs: number): string {
  if (ms === null || !Number.isFinite(ms)) return '';
  const segundos = Math.max(0, Math.round((ahoraMs - ms) / 1000));
  if (segundos < 8) return 'ahora';
  if (segundos < 60) return `hace ${segundos} s`;
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  return `hace ${Math.floor(minutos / 60)} h`;
}

/** "45 min" · "1 h 10 min". */
export function duracion(ms: number): string {
  const minutos = Math.max(0, Math.round(ms / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
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
