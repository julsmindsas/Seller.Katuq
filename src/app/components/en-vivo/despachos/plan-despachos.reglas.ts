/**
 * Cuántos pedidos están listos para salir, contados con lo que En vivo ya tiene (D-410): sirve
 * para la insignia de "Despachos" y para el aviso de Opttia sin leer nada más del servidor.
 * Mismos estados despachables que la pantalla de Despachos y que el plan.
 */
export const ESTADOS_LISTOS: ReadonlyArray<string> = ['Empacado', 'ParaDespachar', 'ProducidoTotalmente'];

export function contarListos(pedidos: ReadonlyArray<{ estadoProceso: string | null }>): number {
  return pedidos.reduce((n, p) => n + (p.estadoProceso && ESTADOS_LISTOS.includes(p.estadoProceso) ? 1 : 0), 0);
}
