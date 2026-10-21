/**
 * «Uniformar fotos» — entradas al diálogo (TX-37 · 7.12, D-518 TX-37·1 y TX-37·4). Parte PURA, sin
 * Angular ni DOM; la vigila `tests/productos/fotos-uniformes-entradas.test.js`.
 *
 * Quién abre el diálogo y con qué:
 *  - la lista de productos, con la categoría filtrada como RUTA (`categoryPath`): `[categoria]` o
 *    `[categoria, subcategoria]`;
 *  - el editor del sitio, con los productos elegidos de la sección «Productos» (o el paso de
 *    categoría desde «Catálogo completo»);
 *  - el detalle de un catálogo por link guardado, con sus productos.
 *
 * Aquí solo se arma lo que se manda; quien decide es el servidor (bandera, interruptor y rol).
 */

import { parse } from 'flatted';

import { documentoDeCategorias } from '../../../shared/services/catalogo/atributos-categoria';

/** Lo que la lista de productos usa para «Sin categoría» (`ProductosComponent.SIN_CATEGORIA`). */
export const SIN_CATEGORIA_FILTRO = '__SIN_CATEGORIA__';

const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
/** Nombre con el que la lista de productos arma su filtro (`data.nombre` primero). */
const nombreDelFiltro = (n: any): string => (n && typeof n === 'object' ? texto(n.data && n.data.nombre) || texto(n.label) : '');
/** Nombre con el que el servidor arma la ruta (`label` primero, como `etiquetaDeNodo` de D-495). */
const nombreDelServidor = (n: any): string => (n && typeof n === 'object' ? texto(n.label) || texto(n.data && n.data.nombre) : '');

function arbolDe(doc: any): any[] {
  const raw = doc && doc.categoria;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const arbol = parse(raw);
    return Array.isArray(arbol) ? arbol : [];
  } catch {
    return [];
  }
}

/**
 * La ruta de la categoría filtrada en la lista de productos, lista para `categoryPath`.
 *
 * - Sin categoría real (vacía o «Sin categoría»): `null` (no hay botón).
 * - Con subcategoría: `[categoria, subcategoria]`; si no, `[categoria]`.
 * - La lista arma sus opciones con el PRIMER documento de categorías y el nombre `data.nombre`
 *   primero; el servidor usa el documento que elige D-495 (`documentoDeCategorias`) y el `label`
 *   primero. Cada nivel se busca en ESE documento, primero por el nombre del filtro y luego por el
 *   del servidor, y viaja el nombre del servidor; así un nodo con `label` y `data.nombre`
 *   distintos, o un primer documento que no es el del servidor, no da «no está en tu árbol».
 * - Un nivel que no se encuentra viaja con el nombre del filtro (y los de abajo también): los
 *   niveles ya traducidos se conservan y el servidor responde con su mensaje.
 */
export function rutaDeFiltros(categoria: unknown, subcategoria?: unknown, docs?: unknown): string[] | null {
  const cat = texto(categoria);
  if (!cat || cat === SIN_CATEGORIA_FILTRO) return null;
  const sub = texto(subcategoria);
  const nombres = sub && sub !== SIN_CATEGORIA_FILTRO ? [cat, sub] : [cat];

  const lista = Array.isArray(docs) ? docs : [];
  const elegido = documentoDeCategorias(lista);
  if (!elegido) return nombres;
  const traducidos: string[] = [];
  let nivel: any[] = arbolDe(elegido);
  for (const nombre of nombres) {
    const nodo =
      nivel.find((n) => nombreDelFiltro(n) === nombre) || nivel.find((n) => nombreDelServidor(n) === nombre);
    const delServidor = nombreDelServidor(nodo);
    if (!nodo || !delServidor) {
      traducidos.push(nombre);
      nivel = [];
      continue;
    }
    traducidos.push(delServidor);
    nivel = Array.isArray(nodo.children) ? nodo.children : [];
  }
  return traducidos;
}

/** Los ids de productos que se mandan (texto no vacío, sin repetir, en el mismo orden). */
export function idsParaUniformar(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const id of ids) {
    const limpio = texto(id);
    if (!limpio || vistos.has(limpio)) continue;
    vistos.add(limpio);
    salida.push(limpio);
  }
  return salida;
}
