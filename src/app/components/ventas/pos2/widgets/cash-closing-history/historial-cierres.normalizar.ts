/**
 * Ticket 1173: el historial de cierres de caja se pintó para el formato viejo
 * (cierres armados desde los pedidos). El backend hoy responde el formato nuevo
 * (`cashClosings`): formas de pago como `{ tipo, valor, cantidadTransacciones }`,
 * `usuarioEmail`, `fechaCierre`, `totalUnidades` y sin `totalDias`,
 * `promedioDiario`, `usuariosCierre` ni la lista de pedidos. Sin esto, las formas
 * de pago salían como "$NaN" y el resumen quedaba en blanco.
 *
 * Normaliza ambos formatos a lo que la pantalla muestra. Puro: no toca servicios.
 */

/** Valor de una forma de pago: número (formato viejo) u objeto `{ valor }` (nuevo). */
export function valorFormaPago(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v && typeof v === 'object') {
    const n = Number((v as { valor?: unknown; total?: unknown }).valor ?? (v as { total?: unknown }).total);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** `{ efectivo: { valor: 4500 } }` → `{ efectivo: 4500 }` (claves sin espacios sobrantes). */
export function formasPagoComoNumeros(formas: unknown): { [k: string]: number } {
  const out: { [k: string]: number } = {};
  if (!formas || typeof formas !== 'object') return out;
  for (const [clave, v] of Object.entries(formas as { [k: string]: unknown })) {
    const k = String(clave || '').trim() || 'Sin especificar';
    out[k] = (out[k] || 0) + valorFormaPago(v);
  }
  return out;
}

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Deja la respuesta (vieja o nueva) con los campos que pinta la pantalla.
 * `periodo` = las fechas que pidió el usuario (YYYY-MM-DD), para el título.
 */
export function normalizarHistorialCierres(data: any, periodo: { fechaInicio: string; fechaFin: string }): any {
  const respuesta = data && typeof data === 'object' ? data : {};
  const historial: any[] = Array.isArray(respuesta.historial) ? respuesta.historial : [];

  for (const item of historial) {
    item.fecha = item.fecha || item.fechaCierre || item.fechaCreacion || '';
    item.usuarioCierre = item.usuarioCierre || item.usuarioEmail || 'Sin registrar';
    item.formasPago = formasPagoComoNumeros(item.formasPago);
    item.cantidadProductos = num(item.cantidadProductos) ?? num(item.totalUnidades);
    item.totalVentas = num(item.totalVentas) ?? 0;
    item.efectivoInicial = num(item.efectivoInicial) ?? 0;
    item.efectivoFinal = num(item.efectivoFinal) ?? 0;
  }

  const resumen = respuesta.resumenGeneral && typeof respuesta.resumenGeneral === 'object' ? respuesta.resumenGeneral : {};
  const dias = new Set(historial.map((i) => String(i.fecha || '').slice(0, 10)).filter(Boolean));
  const totalVentas = num(resumen.totalVentas) ?? historial.reduce((s, i) => s + (i.totalVentas || 0), 0);
  const totalDias = num(resumen.totalDias) ?? dias.size;
  const formas: { [k: string]: number } = {};
  for (const item of historial) {
    for (const [k, v] of Object.entries(item.formasPago as { [k: string]: number })) formas[k] = (formas[k] || 0) + v;
  }

  respuesta.historial = historial;
  respuesta.resumenGeneral = {
    ...resumen,
    totalDias,
    totalVentas,
    promedioDiario: num(resumen.promedioDiario) ?? (totalDias ? Math.round(totalVentas / totalDias) : 0),
    usuariosCierre: Array.isArray(resumen.usuariosCierre) && resumen.usuariosCierre.length
      ? resumen.usuariosCierre
      : Array.from(new Set(historial.map((i) => i.usuarioCierre).filter((u) => u && u !== 'Sin registrar'))),
    formasPago: Object.keys(formas).length ? formas : formasPagoComoNumeros(resumen.formasPago),
  };
  respuesta.fechaInicio = periodo.fechaInicio || respuesta.fechaInicio || '';
  respuesta.fechaFin = periodo.fechaFin || respuesta.fechaFin || '';
  return respuesta;
}
