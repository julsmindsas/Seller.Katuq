/**
 * Informe ejecutivo de ventas (ticket 1125, D-394): lo que el botón de la consola
 * necesita antes y después de pedirlo al servidor.
 */

/** Fecha como la pide el servidor y como la entrega `<input type="date">`: AAAA-MM-DD. */
const aIso = (anio: number, mes: number, dia: number): string =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/** El mes anterior completo, que es el período por omisión del servidor. */
export function periodoMesAnterior(ahora: Date = new Date()): { desde: string; hasta: string } {
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const anioAnterior = mes === 0 ? anio - 1 : anio;
  const mesAnterior = mes === 0 ? 11 : mes - 1;
  return { desde: aIso(anioAnterior, mesAnterior, 1), hasta: aIso(anioAnterior, mesAnterior, ultimoDia) };
}

/** `null` si el rango sirve; si no, qué decirle a quien lo escribió. */
export function validarPeriodo(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Escribe las dos fechas.';
  if (desde > hasta) return 'La fecha de inicio no puede ser posterior a la de fin.';
  return null;
}

/** Lo que se le muestra al operador cuando el servidor no entregó el PDF. */
export function mensajeErrorInforme(estado: number, mensajeServidor?: string): string {
  if (estado === 403) return mensajeServidor || 'No tienes permiso para ver el informe de esta empresa.';
  if (estado === 404) return 'No encontramos la empresa.';
  if (estado === 422) return mensajeServidor || 'El informe no cuadra y no se entrega. Quedó registrado para revisión.';
  if (estado === 400) return mensajeServidor || 'El período no es válido.';
  return 'No se pudo armar el informe. Intenta de nuevo en un momento.';
}
