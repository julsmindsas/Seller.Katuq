/**
 * «Dejar todo listo»: lo que falta para que un domicilio llegue a los mensajeros independientes, en un solo
 * lugar. Lógica pura, sin Angular, para probarla con un spec sencillo.
 */

/** Pago fijo máximo por entrega que acepta el servidor. */
export const PAGO_FIJO_MAX = 500000;

/** Lo que ya está hecho, tal como lo dicen la configuración de domicilios y la de mensajeros. */
export interface EstadoPreparacion {
  domiciliosActivados: boolean;
  pagoDefinido: boolean;
  ofreceAIndependientes: boolean;
}

/** Los pasos que faltan, en el orden en que se hacen. Vacío: todo está listo. */
export type PasoPreparacion = 'activar' | 'pago' | 'ofrecer';

export function pasosQueFaltan(e: EstadoPreparacion): PasoPreparacion[] {
  const pasos: PasoPreparacion[] = [];
  if (!e.domiciliosActivados) pasos.push('activar');
  if (!e.pagoDefinido) pasos.push('pago');
  if (!e.ofreceAIndependientes) pasos.push('ofrecer');
  return pasos;
}

/** El pago que escribió la persona sirve: un número entero de 1 a PAGO_FIJO_MAX. */
export function pagoValido(valor: unknown): boolean {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 && n <= PAGO_FIJO_MAX;
}

/** Frase corta de lo que se va a activar, para el botón y el aviso. */
export function textoPasos(pasos: PasoPreparacion[]): string[] {
  const frases: Record<PasoPreparacion, string> = {
    activar: 'Activar los domicilios',
    pago: 'Definir cuánto le pagas al mensajero por entrega',
    ofrecer: 'Mostrar tus domicilios a los mensajeros independientes'
  };
  return pasos.map(p => frases[p]);
}
