import { Traductor } from '../utilidades/traductor';

/** Traductor por defecto de las escenas hasta que el componente anfitrión les pasa el real: devuelve la clave. */
export const traductorVacio: Traductor = (clave) => clave;

/** "1 pedido" / "3 pedidos" (dos claves: el singular y el plural no se arman pegando palabras). */
export function pedidosTexto(n: number, t: Traductor): string {
  return t(n === 1 ? 'enVivo.escenas.pedidoUno' : 'enVivo.escenas.pedidoOtros', { n });
}
