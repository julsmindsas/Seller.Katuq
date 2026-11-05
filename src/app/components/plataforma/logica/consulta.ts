import { FiltrosTabla, Listado } from '../plataforma.tipos';

/**
 * D-700 13.6 — Parámetros de la tabla de comercios. Todo va al servidor (filtros, orden y paginación):
 * ordenar no es un `sort` local. Solo viajan los filtros con valor.
 */
export const TAMANOS = [10, 25, 50, 100];

export function filtrosIniciales(): FiltrosTabla {
  return { q: '', ciclo: '', tipoCuenta: '', plan: '', orden: 'nombre', dir: 'asc', pagina: 1, tamano: 25 };
}

export function paramsDeFiltros(f: FiltrosTabla): Record<string, string> {
  const p: Record<string, string> = {};
  const q = (f.q || '').trim().slice(0, 100);
  if (q) p['q'] = q;
  if (f.ciclo) p['ciclo'] = f.ciclo;
  if (f.tipoCuenta) p['tipoCuenta'] = f.tipoCuenta;
  if (f.plan) p['plan'] = f.plan;
  p['orden'] = f.orden || 'nombre';
  p['dir'] = f.dir === 'desc' ? 'desc' : 'asc';
  p['pagina'] = String(Math.max(1, Math.floor(f.pagina || 1)));
  p['tamano'] = String(TAMANOS.includes(f.tamano) ? f.tamano : 25);
  return p;
}

export function queryString(params: Record<string, string | undefined | null>): string {
  const partes = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/** Alterna la dirección si es la misma columna; si no, empieza ascendente. Siempre vuelve a la página 1. */
export function ordenarPor(f: FiltrosTabla, columna: string): FiltrosTabla {
  const misma = f.orden === columna;
  return { ...f, orden: columna, dir: misma && f.dir === 'asc' ? 'desc' : 'asc', pagina: 1 };
}

/** El total que se muestra es el del servidor (paginación o resumen), nunca el conteo de las filas de la página. */
export function totalDelServidor(l: Listado | null): { total: number | null; comercios: number | null } {
  if (!l) return { total: null, comercios: null };
  const total = l.paginacion && typeof l.paginacion.total === 'number' ? l.paginacion.total : null;
  const c = l.resumen && l.resumen.comercios;
  return { total, comercios: c && typeof c.valor === 'number' ? c.valor : null };
}

/** Texto de «Último pago»: sin pagos dice «sin pagos» (no una fecha ni 0). */
export function textoUltimoPago(u: { estado: string; fecha: string | null } | null | undefined, formatoFecha: (f: string | null) => string): string {
  if (!u) return '—';
  if (u.estado === 'sin_pagos') return 'sin pagos';
  return u.fecha ? formatoFecha(u.fecha) : '—';
}
