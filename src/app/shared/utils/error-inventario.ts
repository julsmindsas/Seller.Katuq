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
  // Ticket 1082: sin respuesta del servidor (reiniciándose en un despliegue, caído o
  // sin internet) Angular entrega status 0 o un 502/503/504 sin texto, y el error es
  // un ProgressEvent: mostrado tal cual salía "[object ProgressEvent]".
  const status = Number(error?.status);
  if (status === 0 || status === 502 || status === 503 || status === 504) {
    return 'No hubo respuesta de Katuq. Espera un minuto y, antes de volver a guardar, revisa en el inventario si el cambio ya quedó.';
  }
  const texto = [error?.error?.error, error?.error?.message, error?.error, error?.message]
    .find((t) => typeof t === 'string' && t.trim());
  return texto || '';
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

/**
 * Ticket 1071: el backend nombra los productos por su id interno ("Stock insuficiente para
 * producto FxXMzFMt9a5wlfQppPAP…"), que el usuario no reconoce en una lista de varios. Si el id
 * es de una de las líneas que se intentó guardar, se cambia por su referencia y nombre.
 * Devuelve HTML con el texto escapado y el producto en negrita.
 */
export function nombrarProductosEnError(
  mensaje: string,
  productos: { id: string; nombre: string }[],
): { html: string; nombrados: string[] } {
  const escapar = (t: string) =>
    t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let html = escapar(mensaje);
  const nombrados: string[] = [];
  for (const p of productos) {
    if (!p.id || nombrados.includes(p.nombre)) continue;
    // El id completo, no como pedazo de otra palabra (sin lookbehind: Safari viejo no lo soporta).
    const id = new RegExp(`(^|[^\\w-])${escapar(p.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'g');
    const nuevo = html.replace(id, (_m, antes) => `${antes}<strong>${escapar(p.nombre)}</strong>`);
    if (nuevo === html) continue;
    html = nuevo;
    nombrados.push(p.nombre);
  }
  return { html, nombrados };
}
