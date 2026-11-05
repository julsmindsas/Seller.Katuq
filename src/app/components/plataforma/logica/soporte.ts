import { SIN_VALOR } from './formato';

/**
 * D-700 13.7c — Soporte de la ficha: los tickets archivados se muestran APARTE de los resueltos (no se suman).
 * Con la lista incompleta el servidor manda `null` y se pinta «—».
 */
export interface SoporteServidor {
  estado?: string;
  abiertos?: number | null;
  resueltos?: number | null;
  archivados?: number | null;
  total?: number | null;
  errores?: number | null;
  consultas?: number | null;
  sinClasificar?: number | null;
}

export function contadoresSoporte(s: SoporteServidor | null | undefined): Array<{ clave: string; rotulo: string; texto: string }> {
  const n = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : SIN_VALOR);
  const x = s || {};
  return [
    { clave: 'abiertos', rotulo: 'Abiertos', texto: n(x.abiertos) },
    { clave: 'resueltos', rotulo: 'Resueltos', texto: n(x.resueltos) },
    { clave: 'archivados', rotulo: 'Archivados', texto: n(x.archivados) },
    { clave: 'errores', rotulo: 'Errores', texto: n(x.errores) },
    { clave: 'consultas', rotulo: 'Consultas', texto: n(x.consultas) },
    { clave: 'sinClasificar', rotulo: 'Sin clasificar', texto: n(x.sinClasificar) },
  ];
}
