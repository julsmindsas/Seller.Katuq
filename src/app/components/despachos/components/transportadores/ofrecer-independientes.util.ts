/**
 * Lógica pura del interruptor "Ofrecer mis pedidos a mensajeros independientes de Katuq" de la pantalla
 * de transportadores: los textos de ayuda y cómo se interpreta el error del servidor. Sin Angular ni
 * acceso al DOM, para probarla con un spec sencillo.
 */

/** Código con el que el servidor rechaza encender la oferta sin tener definido el pago al mensajero. */
export const CODIGO_PAGO_REQUERIDO = 'PAGO_REQUERIDO';

/** Texto de respaldo si el servidor rechaza con `PAGO_REQUERIDO` pero no manda el mensaje. */
export const TEXTO_PAGO_REQUERIDO = 'Define primero cuánto le pagas al mensajero por entrega.';

const TEXTO_SIN_PERMISO = 'Solo un administrador de la empresa puede cambiar esto. Pídele a un administrador que lo haga.';
const TEXTO_GENERICO = 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.';

/** 7 -> "7"; 7.5 -> "7,5". Con dos decimales como máximo y coma decimal. */
function porcentajeVisible(valor: number): string {
  return String(Math.round(valor * 100) / 100).replace('.', ',');
}

/**
 * Cuánto cobra Katuq por cada entrega. Si el servidor no manda el porcentaje no se inventa uno: se dice
 * que hay una comisión sin dar la cifra.
 */
export function textoComision(porcentaje: unknown): string {
  const cifra =
    typeof porcentaje === 'number' && isFinite(porcentaje) && porcentaje >= 0 ? `${porcentajeVisible(porcentaje)} % ` : '';
  return `Katuq te cobra una comisión ${cifra ? 'de ' + cifra : ''}del valor del domicilio por cada entrega, con corte mensual.`;
}

/** Las frases de ayuda que van junto al interruptor, en el orden en que se leen. */
export function ayudaOfrecerIndependientes(porcentaje: unknown): string[] {
  return [
    'Los pedidos listos que no tengan mensajero propio se ofrecen a mensajeros independientes de tu misma ciudad.',
    'Ellos ganan lo que tengas definido en «Pago al mensajero por entrega».',
    textoComision(porcentaje),
    'Tú le pagas directamente al mensajero.',
  ];
}

export interface ErrorOfrecer {
  /** El servidor pide definir primero el pago al mensajero (400 `PAGO_REQUERIDO`). */
  pagoRequerido: boolean;
  /** Texto para la persona. El `error` que manda el servidor va tal cual. */
  texto: string;
}

/** Lee el error de `PUT /v1/logistica/mensajeros/config` al intentar cambiar la oferta a independientes. */
export function interpretarErrorOfrecer(err: unknown): ErrorOfrecer {
  const crudo = (err ?? {}) as { status?: unknown; error?: unknown };
  const cuerpo = crudo.error && typeof crudo.error === 'object' ? (crudo.error as Record<string, unknown>) : null;
  const delServidor = cuerpo && typeof cuerpo['error'] === 'string' && cuerpo['error'].trim() ? (cuerpo['error'] as string) : null;

  if (crudo.status === 400 && cuerpo?.['code'] === CODIGO_PAGO_REQUERIDO) {
    return { pagoRequerido: true, texto: delServidor ?? TEXTO_PAGO_REQUERIDO };
  }
  if (crudo.status === 403) {
    return { pagoRequerido: false, texto: TEXTO_SIN_PERMISO };
  }
  return { pagoRequerido: false, texto: delServidor ?? TEXTO_GENERICO };
}
