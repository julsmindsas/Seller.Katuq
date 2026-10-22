/**
 * Fechas y horas de la Agenda (D-491), siempre en hora de Colombia (UTC-5, sin
 * horario de verano), igual que el backend. Funciones puras.
 */

const BOGOTA_MS = 5 * 60 * 60 * 1000;
const DIA_MS = 86400000;
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const NOMBRES_DIAS: { clave: string; corto: string; largo: string }[] = [
  { clave: '1', corto: 'agenda.dias.lunesCorto', largo: 'agenda.dias.lunes' },
  { clave: '2', corto: 'agenda.dias.martesCorto', largo: 'agenda.dias.martes' },
  { clave: '3', corto: 'agenda.dias.miercolesCorto', largo: 'agenda.dias.miercoles' },
  { clave: '4', corto: 'agenda.dias.juevesCorto', largo: 'agenda.dias.jueves' },
  { clave: '5', corto: 'agenda.dias.viernesCorto', largo: 'agenda.dias.viernes' },
  { clave: '6', corto: 'agenda.dias.sabadoCorto', largo: 'agenda.dias.sabado' },
  { clave: '7', corto: 'agenda.dias.domingoCorto', largo: 'agenda.dias.domingo' },
];

export function esFecha(fecha: string | null | undefined): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || ''));
  if (!m) return false;
  const d = new Date(`${fecha}T12:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export function hoyBogota(ahoraMs: number = Date.now()): string {
  return new Date(ahoraMs - BOGOTA_MS).toISOString().slice(0, 10);
}

export function minutoActualBogota(ahoraMs: number = Date.now()): number {
  const d = new Date(ahoraMs - BOGOTA_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function sumarDias(fecha: string, n: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + n * DIA_MS).toISOString().slice(0, 10);
}

/** 1 (lunes) … 7 (domingo), como guarda el horario. */
export function diaDeSemana(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** El lunes de la semana de esa fecha. */
export function inicioDeSemana(fecha: string): string {
  return sumarDias(fecha, 1 - diaDeSemana(fecha));
}

export function diasDeLaSemana(fecha: string): string[] {
  const lunes = inicioDeSemana(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** "2026-10-19" → "lun 19 oct". */
export function fechaCorta(fecha: string): string {
  if (!esFecha(fecha)) return fecha || '';
  const d = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}

/** "2026-10-19" → "lunes 19 de octubre". */
export function fechaLarga(fecha: string): string {
  if (!esFecha(fecha)) return fecha || '';
  const d = new Date(`${fecha}T12:00:00Z`);
  const mes = new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' }).format(d);
  return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()} de ${mes}`;
}

/** "8:00" o "08:00" → 480; inválida → NaN. */
export function minutos(hora: string | null | undefined): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hora || '').trim());
  if (!m) return NaN;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 24 || mi > 59) return NaN;
  return h * 60 + mi;
}

/** 480 → "08:00". */
export function hora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/** "14:30" → "2:30 p. m." para leer rápido. */
export function horaLegible(h: string | null | undefined): string {
  const m = minutos(h);
  if (isNaN(m)) return h || '';
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${sufijo}`;
}

/** Primer y último minuto de atención entre varios días, con márgenes por defecto. */
export function rangoDelDia(hours: Record<string, string[][]>, fechas: string[]): [number, number] {
  let ini = Infinity;
  let fin = -Infinity;
  for (const f of fechas) {
    for (const [a, b] of hours[String(diaDeSemana(f))] || []) {
      const x = minutos(a);
      const y = minutos(b);
      if (!isNaN(x)) ini = Math.min(ini, x);
      if (!isNaN(y)) fin = Math.max(fin, y);
    }
  }
  if (!isFinite(ini) || !isFinite(fin) || ini >= fin) return [8 * 60, 18 * 60];
  return [Math.floor(ini / 60) * 60, Math.ceil(fin / 60) * 60];
}

/** Un identificador para no duplicar una cita si se toca dos veces "Agendar". */
export function nuevoRequestId(): string {
  const azar = Math.random().toString(36).slice(2, 10);
  return `agenda-${Date.now().toString(36)}-${azar}`;
}
