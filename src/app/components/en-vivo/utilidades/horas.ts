import { CifraPorHora } from '../servicios/en-vivo.modelos';

/** Cuántas horas muestran las gráficas de "hoy contra ayer". */
export const HORAS_VISIBLES = 15;

/**
 * Las horas (0 a 23) que muestra la gráfica: arranca 9 horas antes de la actual, sin salirse
 * del día. Las horas posteriores a la actual quedan como "futuras".
 */
export function ventanaHoras(horaActual: number, cantidad: number = HORAS_VISIBLES): number[] {
  const hora = Math.min(23, Math.max(0, Math.floor(horaActual)));
  const inicio = Math.min(Math.max(0, hora - 9), Math.max(0, 24 - cantidad));
  return Array.from({ length: cantidad }, (_, i) => inicio + i);
}

const FILA_VACIA = (hora: number): CifraPorHora => ({ hora, ventas: 0, pedidos: 0, ventasAyer: 0, pedidosAyer: 0 });

/** La fila de una hora; si el servidor no la mandó, una en ceros. */
export function filaDeHora(porHora: ReadonlyArray<CifraPorHora>, hora: number): CifraPorHora {
  return porHora.find((f) => f.hora === hora) ?? FILA_VACIA(hora);
}

/** La hora de hoy con más ventas (o pedidos). null si hoy no hay nada. */
export function mejorHora(
  porHora: ReadonlyArray<CifraPorHora>,
  clave: 'ventas' | 'pedidos'
): { hora: number; valor: number; pedidos: number } | null {
  let mejor: CifraPorHora | null = null;
  for (const fila of porHora) {
    if (fila[clave] > 0 && (mejor === null || fila[clave] > mejor[clave])) mejor = fila;
  }
  return mejor ? { hora: mejor.hora, valor: mejor[clave], pedidos: mejor.pedidos } : null;
}

/** Tope "redondo" para el eje de una gráfica: 1, 2, 2,5, 5 o 10 por una potencia de 10. */
export function escalaBonita(valor: number): number {
  if (!(valor > 0)) return 1;
  const exponente = Math.pow(10, Math.floor(Math.log10(valor)));
  const fraccion = valor / exponente;
  const paso = fraccion <= 1 ? 1 : fraccion <= 2 ? 2 : fraccion <= 2.5 ? 2.5 : fraccion <= 5 ? 5 : 10;
  return paso * exponente;
}
