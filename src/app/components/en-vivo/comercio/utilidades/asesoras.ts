import { CifraPorAsesor } from '../../servicios/en-vivo.modelos';
import { dineroCorto } from '../../utilidades/formato';
import { COLORES_BARRAS } from './productos';

/**
 * Ventas de hoy por asesora (ticket 1580). El servidor ya suma, ordena (de mayor a menor venta, con
 * «Sin asesor» al final) y decide quién lo ve; aquí solo se arman las filas y el ancho de las
 * barras. Puro.
 */

/** Nombre con el que el servidor agrupa los pedidos sin asesora. */
export const SIN_ASESOR = 'Sin asesor';

export interface FilaAsesora {
  /** Estable entre repintados (el nombre). */
  clave: string;
  posicion: number | null;
  nombre: string;
  /** La fila de los pedidos sin asesora: el nombre se traduce y no lleva posición. */
  sinAsesor: boolean;
  pedidos: number;
  /** "$850 mil"; vacío con "ocultar clientes y montos". */
  valorTexto: string;
  /** Ancho de la barra, 0 a 100, contra la asesora con más ventas (o más pedidos si se ocultan los montos). */
  ancho: number;
  color: string;
}

export function filasAsesoras(porAsesor: ReadonlyArray<CifraPorAsesor> | null | undefined, ocultar: boolean): FilaAsesora[] {
  const lista = (porAsesor ?? []).filter((a) => !!a && !!a.nombre && a.pedidos > 0);
  const medida = (a: CifraPorAsesor) => (ocultar ? a.pedidos : Math.max(0, a.ventas));
  const mayor = Math.max(1, ...lista.map(medida));
  let posicion = 0;
  return lista.map((a, i) => {
    const sinAsesor = a.nombre === SIN_ASESOR;
    if (!sinAsesor) posicion += 1;
    return {
      clave: a.nombre,
      posicion: sinAsesor ? null : posicion,
      nombre: a.nombre,
      sinAsesor,
      pedidos: a.pedidos,
      valorTexto: ocultar ? '' : dineroCorto(a.ventas),
      ancho: Math.round((medida(a) / mayor) * 1000) / 10,
      color: sinAsesor ? 'var(--ev-slate)' : COLORES_BARRAS[i % COLORES_BARRAS.length],
    };
  });
}
