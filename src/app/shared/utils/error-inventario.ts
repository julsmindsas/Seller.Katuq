/**
 * Lectura de los errores que devuelve el módulo de inventario del backend.
 *
 * Por qué existe: el backend usa DOS redacciones para el mismo caso —
 * "El producto está marcado como no-inventariable…" en la ruta de un solo
 * producto y "Producto <id> es no-inventariable…" en la de varios. Las
 * pantallas reconocían solo la segunda, así que desde que un producto suelto
 * empezó a viajar por la ruta individual (2026-08) el aviso bueno dejó de
 * verse y el usuario recibía un error genérico. Aquí se entienden ambas, y
 * cualquier pantalla nueva hereda el comportamiento sin repetir la lógica.
 */

export interface ErrorInventarioLeido {
  /** Texto que el backend realmente devolvió (vacío si no vino ninguno). */
  mensajeBackend: string;
  /** El problema, en una frase. */
  motivo: string;
  /** Qué hacer al respecto, si el backend lo indicó. Va aparte del error. */
  sugerencia: string;
  /** El producto no admite stock porque está marcado como no-inventariable. */
  esNoInventariable: boolean;
  /** Id del producto culpable, cuando el backend lo nombra. */
  productoId: string | null;
}

/** Extrae el mensaje del backend sin importar en qué campo venga. */
export function mensajeDeErrorBackend(error: any): string {
  return (
    error?.error?.error ||
    error?.error?.message ||
    error?.error ||
    error?.message ||
    ''
  ).toString();
}

export function leerErrorInventario(error: any): ErrorInventarioLeido {
  const mensajeBackend = mensajeDeErrorBackend(error).trim();
  const esNoInventariable = /no[-\s]?inventariable/i.test(mensajeBackend);
  // Solo la redacción de la ruta múltiple nombra el producto.
  const conId = /Producto\s+(\S+)\s+es no[-\s]?inventariable/i.exec(mensajeBackend);

  // El backend a veces pega una instrucción a continuación del error ("Si
  // necesita… use…"). Leerlas juntas satura; el problema va primero y el
  // consejo debajo.
  const corte = mensajeBackend.search(/\bSi (necesita|desea|quiere)\b/i);
  const motivo = corte > 0 ? mensajeBackend.slice(0, corte).trim() : mensajeBackend;
  const sugerencia = corte > 0 ? mensajeBackend.slice(corte).trim() : '';

  return {
    mensajeBackend,
    motivo,
    sugerencia,
    esNoInventariable,
    productoId: conId ? conId[1] : null,
  };
}
