import { Cifra } from '../plataforma.tipos';

/**
 * D-700 13.8 — Formato de cifras. Funciones puras: `null` es «—» (nunca 0) y la hora es la de Colombia
 * (UTC-5 fijo, sin horario de verano). No usan `Intl` para que el resultado sea igual en cualquier equipo.
 */
export const SIN_VALOR = '—';

const ROTULOS_ESTADO: Record<string, string> = {
  reconstruido: 'Reconstruido',
  en_curso: 'En curso',
  parcial: 'Parcial',
  sin_dato: 'Sin dato',
  no_disponible: 'No disponible',
  sin_pagos: 'Sin pagos',
};

export function rotuloEstado(estado: string | null | undefined): string | null {
  return estado && ROTULOS_ESTADO[estado] ? ROTULOS_ESTADO[estado] : null;
}

const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function conMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `$ 1.234.567` (pesos sin decimales). `null` → «—». */
export function formatearCop(valor: number | null | undefined): string {
  if (!esNumero(valor)) return SIN_VALOR;
  const r = Math.round(Math.abs(valor));
  return `${valor < 0 && r !== 0 ? '-' : ''}$ ${conMiles(String(r))}`;
}

/** Entero o con un decimal si lo tiene (coma decimal). `null` → «—». */
export function formatearNumero(valor: number | null | undefined): string {
  if (!esNumero(valor)) return SIN_VALOR;
  const r = Math.round(valor * 10) / 10;
  const [e, d] = String(Math.abs(r)).split('.');
  return `${r < 0 ? '-' : ''}${conMiles(e)}${d ? ',' + d : ''}`;
}

/** Un ratio (0,052) como `5,2 %`. `null` → «—». */
export function formatearRatio(valor: number | null | undefined): string {
  if (!esNumero(valor)) return SIN_VALOR;
  const p = Math.round(valor * 1000) / 10;
  return `${String(p).replace('.', ',')} %`;
}

export interface CifraPintada {
  texto: string;
  insignia: string | null;
  nulo: boolean;
}

/** Lo que la pantalla pinta de una cifra del servidor. Sin valor: «—» más la insignia de su estado. */
export function pintarCifra(c: Cifra | null | undefined): CifraPintada {
  if (!c || typeof c !== 'object') return { texto: SIN_VALOR, insignia: rotuloEstado('sin_dato'), nulo: true };
  // Un objeto sin `valor` (p. ej. «no disponible» con su motivo) es una cifra sin dato con su propio estado.
  if (!('valor' in c)) return { texto: SIN_VALOR, insignia: rotuloEstado(String((c as Cifra).estado)) || rotuloEstado('sin_dato'), nulo: true };
  const nulo = !esNumero(c.valor) || c.estado === 'sin_dato' || c.estado === 'no_disponible';
  const insignia = rotuloEstado(String(c.estado));
  if (nulo) return { texto: SIN_VALOR, insignia: insignia || rotuloEstado('sin_dato'), nulo: true };
  const v = c.valor as number;
  const texto = c.unidad === 'COP' ? formatearCop(v) : c.unidad === 'ratio' ? formatearRatio(v) : formatearNumero(v);
  return { texto, insignia: c.estado === 'ok' ? null : insignia, nulo: false };
}

const DOS = (n: number) => String(n).padStart(2, '0');
const SOLO_DIA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Fecha en hora de Colombia. Un día suelto (`AAAA-MM-DD`) no se corre de zona; un instante se pasa a UTC-5
 * (así el 1 de noviembre a las 03:00 UTC es el 31 de octubre a las 22:00). No válido → «—».
 */
export function fechaCo(valor: string | number | Date | null | undefined, conHora = true): string {
  if (valor === null || valor === undefined || valor === '') return SIN_VALOR;
  if (typeof valor === 'string') {
    const m = SOLO_DIA.exec(valor);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const ms = valor instanceof Date ? valor.getTime() : typeof valor === 'number' ? valor : Date.parse(valor);
  if (!Number.isFinite(ms)) return SIN_VALOR;
  const d = new Date(ms - 5 * 3600000);
  const dia = `${DOS(d.getUTCDate())}/${DOS(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return conHora ? `${dia} ${DOS(d.getUTCHours())}:${DOS(d.getUTCMinutes())}` : dia;
}

/** `2026-11` → `nov 2026`. Otra cosa → «—». */
export function mesLegible(mes: string | null | undefined): string {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(mes || ''));
  return m ? `${MESES[Number(m[2]) - 1]} ${m[1]}` : SIN_VALOR;
}

/** Antigüedad del corte en horas, para el aviso de datos viejos. */
export function textoAntiguedad(horas: number | null | undefined): string {
  if (!esNumero(horas)) return SIN_VALOR;
  if (horas < 1) return 'hace menos de una hora';
  if (horas < 48) return `hace ${Math.round(horas)} h`;
  return `hace ${Math.round(horas / 24)} días`;
}

/** Sí / No / «—» (sin dato). */
export function textoSiNo(v: boolean | null | undefined): string {
  return v === true ? 'Sí' : v === false ? 'No' : SIN_VALOR;
}

/** Texto simple o «—» si no hay. */
export function textoONulo(v: unknown): string {
  return v === null || v === undefined || v === '' ? SIN_VALOR : String(v);
}
