/**
 * Ticket 1097 (ALMACEN BOMBAS): un combo se ve como UNA línea en la cotización y
 * en los documentos del pedido, y el comercial decide si lo abre.
 *
 * Por dentro nada cambia (D-147): el combo sigue siendo una línea por producto,
 * cada una con su precio, su IVA y su descuento. Inventario descuenta cada
 * producto y SIIGO factura cada uno, igual que antes. Lo único nuevo es la marca
 * `combo` en esas líneas, que dice a qué combo pertenecen y si se ven juntas.
 */
export interface ComboLinea {
  /** Id del combo en el maestro (`combos`). */
  id: string;
  /** Nombre del combo cuando se agregó: es lo que lee el cliente. */
  nombre: string;
  /** Instancia del combo: el mismo combo agregado dos veces son dos grupos. */
  grupo: string;
  /** Unidades de este producto por cada combo (las que entraron al agregarlo). */
  cantidadPorCombo: number;
  /** true = el comercial lo abrió y cada producto se ve en su propia fila. */
  abierto?: boolean;
  /** Ticket 1116: descripción del combo cuando se agregó; la ve el cliente bajo el nombre. */
  descripcion?: string;
}

export interface FilaLinea<T> {
  tipo: "linea";
  item: T;
  /** Posición de la línea en el arreglo original (para editarla o quitarla). */
  indice: number;
}

export interface FilaCombo<T> {
  tipo: "combo";
  combo: ComboLinea;
  lineas: T[];
  indices: number[];
  /** Cuántos combos son (ver `cantidadDeCombos`). */
  cantidad: number;
}

export type FilaAgrupada<T> = FilaLinea<T> | FilaCombo<T>;

/** Identificador de una instancia nueva del combo dentro del documento. */
export function nuevoGrupoCombo(comboId: string): string {
  const azar = Math.random().toString(36).slice(2, 8);
  return `${comboId || "combo"}-${Date.now().toString(36)}${azar}`;
}

/** La marca de combo de una línea, o null si no entró por un combo (o viene incompleta). */
export function comboDeLinea(item: any): ComboLinea | null {
  const c = item?.combo;
  if (!c || typeof c !== "object") return null;
  if (typeof c.grupo !== "string" || !c.grupo) return null;
  if (typeof c.nombre !== "string" || !c.nombre.trim()) return null;
  return c as ComboLinea;
}

/**
 * Cuántos combos representan las líneas del grupo. Al agregarlo cada producto
 * entra con `cantidadPorCombo`; si todas las líneas están multiplicadas por el
 * mismo entero, ese es el número de combos. Si alguien cambió la cantidad de un
 * solo producto con el combo abierto, ya no es un múltiplo limpio: se cuenta
 * como 1 (un paquete con ese contenido) y el valor sigue siendo la suma real.
 */
export function cantidadDeCombos(lineas: any[]): number {
  const factores = (lineas || []).map((l) => {
    const base = Number(comboDeLinea(l)?.cantidadPorCombo) || 1;
    return (Number(l?.cantidad) || 0) / base;
  });
  if (!factores.length) return 1;
  const k = factores[0];
  const iguales = factores.every((f) => Math.abs(f - k) < 1e-9);
  return iguales && Number.isInteger(k) && k >= 1 ? k : 1;
}

/**
 * Filas para pintar: las líneas de un combo cerrado se juntan en una sola fila,
 * ubicada donde estaba su primer producto; lo demás queda igual y en su orden.
 * Un combo abierto devuelve sus productos como filas normales.
 */
export function agruparLineasCombo<T>(items: T[]): FilaAgrupada<T>[] {
  const filas: FilaAgrupada<T>[] = [];
  const porGrupo = new Map<string, FilaCombo<T>>();
  (items || []).forEach((item, indice) => {
    const combo = comboDeLinea(item);
    if (!combo || combo.abierto) {
      filas.push({ tipo: "linea", item, indice });
      return;
    }
    const fila = porGrupo.get(combo.grupo);
    if (fila) {
      fila.lineas.push(item);
      fila.indices.push(indice);
      return;
    }
    const nueva: FilaCombo<T> = { tipo: "combo", combo, lineas: [item], indices: [indice], cantidad: 1 };
    porGrupo.set(combo.grupo, nueva);
    filas.push(nueva);
  });
  porGrupo.forEach((fila) => (fila.cantidad = cantidadDeCombos(fila.lineas)));
  return filas;
}

/** ¿Es la primera línea de un combo abierto? (ahí va el encabezado con "Cerrar combo"). */
export function iniciaComboAbierto(items: any[], indice: number): boolean {
  const combo = comboDeLinea(items?.[indice]);
  if (!combo || !combo.abierto) return false;
  return !items.slice(0, indice).some((it) => comboDeLinea(it)?.grupo === combo.grupo);
}

/** Cuántas líneas tiene el grupo de este combo. */
export function lineasDelGrupo(items: any[], grupo: string): number {
  return (items || []).filter((it) => comboDeLinea(it)?.grupo === grupo).length;
}

/**
 * Valor único si todas las líneas coinciden (por ejemplo el % de IVA del combo),
 * o null si varían: ahí el documento dice "Varios" en vez de inventar un promedio.
 */
export function valorComun(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = valores[0];
  return valores.every((x) => Math.abs(x - v) < 1e-9) ? v : null;
}
