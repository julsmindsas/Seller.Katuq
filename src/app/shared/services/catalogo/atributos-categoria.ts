import { parse } from 'flatted';

/**
 * Atributos por categoría (D-495, ticket 1234): ESPEJO del núcleo del servidor
 * (functions/services/catalogo/atributosCategoria.js). Manda el servidor; el front
 * solo repite lo que necesita para pintar:
 *  - qué documento de `categorias` usar cuando /v1/categorias/all trae varios (D2);
 *  - el esquema efectivo de una ruta (primero los ancestros);
 *  - las claves de ruta y la ruta del producto (`rutaDelProducto`, D2): ruta, cadena
 *    parent, etiquetas y alias, con el índice de rutas que devuelve
 *    GET /v1/categorias/attribute-schemas (el del mismo documento que usa el servidor).
 *    Así la pestaña «Especificaciones» pinta los campos que POST /v1/productos/attributes
 *    acepta (revisión 2026-10-19).
 * Se prueba con el mismo fixture del backend (tests/productos/fixtures/atributos-esquemas.json).
 */

export type AttributeType = 'text' | 'number' | 'option' | 'boolean';
export type AttributeSection = 'specs' | 'compatibility';

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  options?: string[];
  multiple?: boolean;
  unit?: string;
  required: boolean;
  filterable: boolean;
  comparable: boolean;
  section: AttributeSection;
  order: number;
}

export interface AttributeSchema {
  attributes: AttributeDef[];
  /** Claves viejas tras un renombre. Solo las escribe el servidor. */
  aliases?: string[];
}

/** routeKey → esquema de esa ruta. */
export type AttributeSchemas = Record<string, AttributeSchema>;

/** Índice de rutas del árbol (GET /attribute-schemas): sin imágenes. */
export interface IndiceDeRutas {
  /** clave de ruta → nombres de cada nivel, como se escriben en el árbol. */
  rutas: Record<string, string[]>;
  /** clave del último nivel → claves de ruta que terminan en él. */
  etiquetas: Record<string, string[]>;
  /** claves que producen dos nodos: no admiten atributos. */
  colisiones: string[];
}

export type EstadoDeRuta =
  | 'porRuta'
  | 'porParent'
  | 'porEtiquetas'
  | 'porAlias'
  | 'sinCategoria'
  | 'fueraDelArbol'
  | 'ambigua'
  | 'enColision';

/** `{estado, ruta}` si se resolvió; `{estado, motivo}` si no (sin ruta no hay atributos). */
export interface ResolucionDeRuta {
  estado: EstadoDeRuta;
  ruta?: string;
  motivo?: string;
}

export interface AtributoEfectivo extends AttributeDef {
  /** Ruta que lo define. */
  origen: string;
  /** Viene de un ancestro: en la subcategoría es de solo lectura. */
  heredado: boolean;
}

export type ValorAtributo = string | number | boolean | string[] | null;

export const SEPARADOR = ' > ';
export const TOPE_ATRIBUTOS_POR_RUTA = 30;
export const PATRON_CLAVE = /^[a-z][a-z0-9_]{0,39}$/;

const esObjeto = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const textoDe = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
/** El índice llega como JSON: se mira solo lo propio (una categoría «constructor» no es una ruta). */
const propio = (o: unknown, k: string): boolean => esObjeto(o) && Object.prototype.hasOwnProperty.call(o, k);

/** Igual que `claveCategoria` del servidor: sin espacios de más y en minúscula. */
export function claveCategoria(v: unknown): string {
  return String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function claveDeRuta(nombres: unknown[] | null | undefined): string {
  return (Array.isArray(nombres) ? nombres : []).map(claveCategoria).filter(Boolean).join(SEPARADOR);
}

function arbolLegible(datos: any): boolean {
  const raw = datos && datos.categoria;
  if (Array.isArray(raw)) return true;
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    return Array.isArray(parse(raw));
  } catch {
    return false;
  }
}

/** Árbol legible 2, arreglo `categorias` 1, nada 0. */
export function puntajeCategorias(datos: any): number {
  if (arbolLegible(datos)) return 2;
  if (datos && Array.isArray(datos.categorias) && datos.categorias.length) return 1;
  return 0;
}

/**
 * El documento que usa el servidor: el primero de mayor puntaje en el orden en que
 * llegan (/v1/categorias/all los entrega en el orden de Firestore, por id).
 */
export function documentoDeCategorias<T>(docs: T[] | null | undefined): T | null {
  let elegido: T | null = null;
  let mejor = -1;
  for (const doc of Array.isArray(docs) ? docs : []) {
    const puntaje = puntajeCategorias(doc);
    if (puntaje > mejor) {
      elegido = doc;
      mejor = puntaje;
    }
  }
  return elegido;
}

const enColision = (indice: IndiceDeRutas | null | undefined, clave: string): boolean =>
  !!indice && Array.isArray(indice.colisiones) && indice.colisiones.includes(clave);
const existeRuta = (indice: IndiceDeRutas | null | undefined, clave: string): boolean => !!indice && propio(indice.rutas, clave);

/**
 * Atributos de una ruta: primero los de los ancestros; cada nivel por `order`. Con el
 * índice, una ruta en colisión no tiene atributos (como en el servidor).
 */
export function esquemaEfectivo(
  schemas: AttributeSchemas | null | undefined,
  ruta: string,
  indice?: IndiceDeRutas | null,
): AtributoEfectivo[] {
  if (!esObjeto(schemas) || typeof ruta !== 'string' || !ruta) return [];
  if (enColision(indice, ruta)) return [];
  const partes = ruta.split(SEPARADOR);
  const vistas = new Set<string>();
  const salida: AtributoEfectivo[] = [];
  for (let i = 1; i <= partes.length; i++) {
    const origen = partes.slice(0, i).join(SEPARADOR);
    const nivel = propio(schemas, origen) && Array.isArray(schemas[origen].attributes) ? schemas[origen].attributes : [];
    const ordenados = [...nivel]
      .filter(esObjeto)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.key).localeCompare(String(b.key)));
    for (const d of ordenados) {
      if (vistas.has(d.key)) continue;
      vistas.add(d.key);
      salida.push({ ...(d as AttributeDef), origen, heredado: i < partes.length });
    }
  }
  return salida;
}

const etiquetaDeNodo = (n: any): string => (esObjeto(n) ? textoDe(n['label']) || textoDe(n['data'] && n['data'].nombre) : '');

// ── Ruta del producto (espejo de rutaDelProducto del servidor, D2) ──────────────

interface FormaDeCategorias {
  forma: string;
  ruta?: string[];
  cadena?: string[];
  etiquetas?: string[];
}

function formaDeValor(v: unknown): FormaDeCategorias {
  if (Array.isArray(v)) {
    if (!v.length) return { forma: 'vacia' };
    if (v.every((x) => typeof x === 'string')) {
      // Forma 5: arreglo de textos (OH MY STORE).
      const etiquetas = v.map(textoDe).filter(Boolean);
      return etiquetas.length ? { forma: 'arregloDeTextos', etiquetas } : { forma: 'sinEtiquetas' };
    }
    // Forma 4: arreglo de nodos sin label (onboarding).
    const nodos = v.filter(esObjeto);
    const conRuta = nodos.find((x) => Array.isArray(x['ruta']) && x['ruta'].some((r: unknown) => textoDe(r)));
    if (conRuta) return { forma: 'arregloDeNodos', ruta: conRuta['ruta'].map(textoDe).filter(Boolean) };
    const etiquetas = nodos.map(etiquetaDeNodo).filter(Boolean);
    return etiquetas.length ? { forma: 'arregloDeNodos', etiquetas } : { forma: 'sinEtiquetas' };
  }
  if (esObjeto(v)) {
    // Forma 1: el nodo del formulario o del importador.
    const ruta = Array.isArray(v['ruta']) ? v['ruta'].map(textoDe).filter(Boolean) : [];
    if (ruta.length) return { forma: 'nodoConRuta', ruta };
    if (esObjeto(v['parent'])) {
      const cadena: string[] = [];
      for (let n: any = v, i = 0; esObjeto(n) && i < 5; n = n['parent'], i++) {
        const etiqueta = etiquetaDeNodo(n);
        if (etiqueta) cadena.unshift(etiqueta);
      }
      if (cadena.length > 1) return { forma: 'nodoConParent', cadena };
    }
    const etiqueta = etiquetaDeNodo(v);
    return etiqueta ? { forma: 'nodoSoloEtiqueta', etiquetas: [etiqueta] } : { forma: 'sinEtiquetas' };
  }
  return { forma: 'sinEtiquetas' };
}

function formaDeTexto(raw: string): FormaDeCategorias {
  const texto = raw.trim();
  if (!texto) return { forma: 'vacia' };
  let json: unknown;
  let esJson = true;
  try {
    json = JSON.parse(texto);
  } catch {
    esJson = false;
  }
  if (!esJson || json === null || typeof json !== 'object') {
    if (esJson && json === null) return { forma: 'vacia' };
    // Forma 2: texto plano, con comas o sin ellas (WooCommerce).
    const etiquetas = texto.split(',').map(textoDe).filter(Boolean);
    return etiquetas.length ? { forma: 'textoPlano', etiquetas } : { forma: 'sinEtiquetas' };
  }
  if (Array.isArray(json) && !json.length) return { forma: 'vacia' };
  // Un arreglo de textos se lee como JSON: flatted solo vería el primero.
  if (Array.isArray(json) && json.every((x) => typeof x === 'string')) return formaDeValor(json);
  let desdeFlatted: FormaDeCategorias = { forma: 'sinEtiquetas' };
  try {
    desdeFlatted = formaDeValor(parse(texto));
  } catch {
    // No era flatted (un objeto JSON plano): se usa el JSON.
  }
  return desdeFlatted.forma !== 'sinEtiquetas' ? desdeFlatted : formaDeValor(json);
}

/** Las 6 formas del campo `categorias`; las de `exposicion.categorias` (forma 6) se suman a las etiquetas. */
function formaDeCategorias(producto: any): FormaDeCategorias {
  const raw = producto ? producto.categorias : undefined;
  const expo: string[] =
    producto && esObjeto(producto.exposicion) && Array.isArray(producto.exposicion.categorias)
      ? producto.exposicion.categorias.map(textoDe).filter(Boolean)
      : [];
  let valor: FormaDeCategorias;
  if (raw === undefined || raw === null) valor = { forma: 'vacia' };
  else if (typeof raw === 'string') valor = formaDeTexto(raw);
  else valor = formaDeValor(raw);
  return { forma: valor.forma, ruta: valor.ruta, cadena: valor.cadena, etiquetas: [...(valor.etiquetas || []), ...expo] };
}

/** alias → clave vigente. Un alias que aparece en dos claves no se usa (ambiguo). */
function mapaDeAlias(schemas: AttributeSchemas | null | undefined): Map<string, string> {
  const mapa = new Map<string, string>();
  const repetidos = new Set<string>();
  if (!esObjeto(schemas)) return mapa;
  for (const clave of Object.keys(schemas)) {
    const esquema = propio(schemas, clave) ? schemas[clave] : null;
    const aliases = esquema && Array.isArray(esquema.aliases) ? esquema.aliases : [];
    for (const a of aliases) {
      if (typeof a !== 'string' || !a) continue;
      if (mapa.has(a) && mapa.get(a) !== clave) repetidos.add(a);
      mapa.set(a, clave);
    }
  }
  repetidos.forEach((a) => mapa.delete(a));
  return mapa;
}

/** Cambia el prefijo viejo más largo por el vigente. */
function porAlias(clave: string, alias: Map<string, string>): string {
  const partes = clave.split(SEPARADOR);
  for (let i = partes.length; i > 0; i--) {
    const vigente = alias.get(partes.slice(0, i).join(SEPARADOR));
    if (vigente) return [vigente, ...partes.slice(i)].join(SEPARADOR);
  }
  return '';
}

function resolverClave(
  clave: string,
  estado: EstadoDeRuta,
  indice: IndiceDeRutas | null | undefined,
  alias: Map<string, string>,
): ResolucionDeRuta {
  if (existeRuta(indice, clave)) {
    return enColision(indice, clave) ? { estado: 'enColision', motivo: 'ruta_en_colision' } : { estado, ruta: clave };
  }
  const vigente = porAlias(clave, alias);
  if (vigente && existeRuta(indice, vigente)) {
    return enColision(indice, vigente) ? { estado: 'enColision', motivo: 'ruta_en_colision' } : { estado: 'porAlias', ruta: vigente };
  }
  return { estado: 'fueraDelArbol', motivo: 'ruta_no_esta_en_el_arbol' };
}

function porEtiquetas(etiquetas: string[], indice: IndiceDeRutas | null | undefined, alias: Map<string, string>): ResolucionDeRuta {
  const candidatas: string[] = [];
  for (const etiqueta of etiquetas) {
    const clave = claveCategoria(etiqueta);
    let rutas: string[] =
      indice && propio(indice.etiquetas, clave) && Array.isArray(indice.etiquetas[clave]) ? indice.etiquetas[clave] : [];
    if (!rutas.length) {
      // Etiqueta vieja de una categoría renombrada: el alias cuyo último nivel es esta etiqueta.
      const viejas = Array.from(alias.keys()).filter((a) => a.split(SEPARADOR).pop() === clave);
      rutas = Array.from(new Set(viejas.map((a) => alias.get(a) as string))).filter((c) => existeRuta(indice, c));
    }
    if (rutas.length > 1) return { estado: 'ambigua', motivo: 'etiqueta_con_varias_rutas' };
    if (rutas.length === 1 && !candidatas.includes(rutas[0])) candidatas.push(rutas[0]);
  }
  if (!candidatas.length) return { estado: 'fueraDelArbol', motivo: 'etiquetas_sin_ruta' };
  const segmentos = (c: string) => c.split(SEPARADOR);
  const masProfunda = candidatas.reduce((a, b) => (segmentos(b).length > segmentos(a).length ? b : a));
  const base = segmentos(masProfunda);
  const enCadena = candidatas.every((c) => segmentos(c).every((s, i) => s === base[i]));
  if (!enCadena) return { estado: 'ambigua', motivo: 'etiquetas_divergentes' };
  if (enColision(indice, masProfunda)) return { estado: 'enColision', motivo: 'ruta_en_colision' };
  return { estado: 'porEtiquetas', ruta: masProfunda };
}

/**
 * Ruta de categoría del producto, igual que el servidor: `categorias.ruta` > cadena
 * `parent` > etiquetas (una sola ruta por etiqueta; en cadena gana la más profunda; si
 * divergen, ambigua) > alias. Recibe el producto tal como lo leerá el servidor.
 */
export function rutaDelProducto(
  producto: unknown,
  indice: IndiceDeRutas | null | undefined,
  schemas: AttributeSchemas | null | undefined,
): ResolucionDeRuta {
  const forma = formaDeCategorias(producto);
  const alias = mapaDeAlias(schemas);
  if (forma.ruta && forma.ruta.length) return resolverClave(claveDeRuta(forma.ruta), 'porRuta', indice, alias);
  if (forma.cadena && forma.cadena.length) return resolverClave(claveDeRuta(forma.cadena), 'porParent', indice, alias);
  if (!forma.etiquetas || !forma.etiquetas.length) return { estado: 'sinCategoria' };
  return porEtiquetas(forma.etiquetas, indice, alias);
}

/** Nombres vigentes de una ruta (como se escriben en el árbol); si no está, sus claves. */
export function nombresDeRuta(indice: IndiceDeRutas | null | undefined, clave: string): string[] {
  if (!clave) return [];
  return indice && propio(indice.rutas, clave) && Array.isArray(indice.rutas[clave]) ? [...indice.rutas[clave]] : clave.split(SEPARADOR);
}

export interface RutaDelArbol {
  clave: string;
  nombres: string[];
}

/** Cada nodo del árbol con su ruta, en el orden del árbol (máximo 10 niveles). */
export function rutasDelArbol(arbol: unknown): RutaDelArbol[] {
  const salida: RutaDelArbol[] = [];
  const visitar = (lista: unknown, padres: string[], nivel: number) => {
    if (!Array.isArray(lista) || nivel > 10) return;
    for (const n of lista) {
      const nombre = etiquetaDeNodo(n);
      if (!nombre) continue;
      const nombres = [...padres, nombre];
      salida.push({ clave: claveDeRuta(nombres), nombres });
      visitar((n as any).children, nombres, nivel + 1);
    }
  };
  visitar(arbol, [], 1);
  return salida;
}
