import {
  AtributoEfectivo,
  AttributeDef,
  AttributeSchemas,
  IndiceDeRutas,
  PATRON_CLAVE,
  claveCategoria,
  esquemaEfectivo,
  rutaDelProducto,
} from './atributos-categoria';

/**
 * Hoja «Especificaciones» del Seller (D-495, ticket 1234, F2-42, F3; design.md E10).
 * Lógica PURA, sin Angular ni Excel: la plantilla de importación, la lectura de la hoja y el
 * export de Productos la usan (tareas 10.4 y 10.5); aquí solo se arman y leen matrices y filas.
 * ESPEJO de lo que hace el servidor en POST /v1/productos/attributes/lote
 * (functions/services/catalogo/atributosLote.js): manda el servidor, que vuelve a validar todo.
 *
 * Reglas (iguales a las del lote):
 *  - Primera columna `Referencia (SKU)`; luego una por atributo efectivo de la categoría:
 *    `Etiqueta (unidad) [clave]`, o `Etiqueta (SI/NO) [clave]` en los sí/no. La clave entre
 *    corchetes es la que manda al leer: el comercio puede cambiar la etiqueta sin romper nada.
 *  - Celda vacía = no cambia (no viaja). `(borrar)` = borra ese valor (null).
 *  - Valores múltiples (lista de varias opciones) separados por `;` (D1 ya prohíbe `;` en las
 *    opciones). Un texto con `;` se deja tal cual: solo se parte donde el esquema dice «varias».
 *  - Un valor que no es válido NO se corrige aquí: viaja como está y el servidor rechaza la fila
 *    con el motivo y las opciones válidas (E10, resultado por fila).
 *  - Fila sin referencia: se avisa. Fila con referencia y todo vacío: no se manda (sin cambios).
 *  - El export filtra por ruta con rutaDelProducto (atributos-categoria.ts) sobre el índice del
 *    GET de esquemas: la categoría elegida y sus subcategorías.
 */

export const HOJA_ESPECIFICACIONES = 'Especificaciones';
export const COLUMNA_REFERENCIA = 'Referencia (SKU)';
export const MARCA_BORRAR = '(borrar)';
export const SEPARADOR_VALORES = ';';
/** Filas por petición del lote (TOPES_LOTE.filas del servidor). */
export const TOPE_FILAS_POR_PETICION = 200;
/** Largo máximo de un atributo de texto (TOPES.largoTexto del servidor), solo para la ayuda. */
export const LARGO_MAXIMO_TEXTO = 120;

type Definicion = Pick<AttributeDef, 'key' | 'type'> & Partial<AttributeDef>;

const esObjeto = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
const una = (t: unknown) => String(t ?? '').replace(/\s+/g, ' ').trim();
const MARCA_BORRAR_RE = /^\(borrar\)$/i;
const CLAVE_FINAL = /\[([^\[\]]*)\]\s*$/;

// ── Encabezados ─────────────────────────────────────────────────────────────

/** `Etiqueta (unidad) [clave]`; en los sí/no `Etiqueta (SI/NO) [clave]`. */
export function encabezadoDeAtributo(def: Definicion): string {
  const etiqueta = una(def.label) || def.key;
  const unidad = def.type === 'number' ? una(def.unit) : '';
  const aviso = def.type === 'boolean' ? ' (SI/NO)' : unidad ? ` (${unidad})` : '';
  return `${etiqueta}${aviso} [${def.key}]`;
}

/** La clave entre corchetes al final del encabezado, o null si no hay una con forma de clave. */
export function claveDeEncabezado(encabezado: unknown): string | null {
  if (typeof encabezado !== 'string') return null;
  const m = CLAVE_FINAL.exec(encabezado.trim());
  return m && PATRON_CLAVE.test(m[1]) ? m[1] : null;
}

export function encabezadosDeHoja(esquema: Definicion[]): string[] {
  return [COLUMNA_REFERENCIA, ...(esquema || []).map(encabezadoDeAtributo)];
}

const esColumnaReferencia = (h: string): boolean => ['referencia (sku)', 'referencia', 'sku'].includes(sinTildes(una(h).toLowerCase()));
const marcaSiNo = (h: string): boolean => /\(\s*si\s*\/\s*no\s*\)/i.test(h);

// ── Plantilla e instrucciones ───────────────────────────────────────────────

function valorDeEjemplo(def: Definicion): string | number {
  switch (def.type) {
    case 'number':
      return 10;
    case 'boolean':
      return 'SI';
    case 'option': {
      const opciones = def.options || [];
      return def.multiple ? opciones.slice(0, 2).join(`${SEPARADOR_VALORES} `) : opciones[0] || '';
    }
    default:
      return 'Texto';
  }
}

/** La hoja de la plantilla: encabezados y una fila de ejemplo (como la hoja de precios por volumen). */
export function hojaDePlantilla(esquema: Definicion[]): (string | number)[][] {
  const defs = esquema || [];
  return [encabezadosDeHoja(defs), ['PROD001', ...defs.map(valorDeEjemplo)]];
}

const TEXTO_DE_TIPO: Record<string, string> = { text: 'Texto', number: 'Número', option: 'Lista de opciones', boolean: 'Sí / No' };
const OPCIONES_EN_AYUDA = ' · ';

function nombreDeOrigen(origen: string, indice?: IndiceDeRutas | null): string {
  const nombres = indice && esObjeto(indice.rutas) && Array.isArray(indice.rutas[origen]) ? indice.rutas[origen] : null;
  return nombres && nombres.length ? nombres[nombres.length - 1] : origen.split(' > ').pop() || origen;
}

/**
 * Filas (4 columnas, como la hoja «Instrucciones» del importador) que explican la hoja:
 * reglas generales y, por atributo, tipo, unidad y valores válidos.
 */
export function instruccionesDeEspecificaciones(esquema: (Definicion & Partial<AtributoEfectivo>)[], indice?: IndiceDeRutas | null): string[][] {
  const filas: string[][] = [
    [`HOJA "${HOJA_ESPECIFICACIONES}" (opcional)`, '', '', ''],
    ['', '', 'Una fila por producto. Escriba la Referencia (SKU) de un producto que ya existe (o que crea en esta misma importación).', ''],
    ['', '', 'Celda vacía: no cambia nada. Para borrar un valor escriba (borrar). La clave entre corchetes al final del encabezado es la que manda: no la cambie.', ''],
    ['', '', `Si una lista permite varias opciones, sepárelas con ${SEPARADOR_VALORES} (por ejemplo: Windows${SEPARADOR_VALORES} macOS). Los números llevan punto decimal y sin la unidad.`, ''],
    ['', '', 'Solo se cambian las especificaciones: el precio, las existencias y los demás datos del producto no se tocan.', ''],
    ['Columna', 'Tipo', 'Unidad', 'Qué va acá'],
  ];
  for (const d of esquema || []) {
    const partes: string[] = [];
    if (d.type === 'text') partes.push(`Texto libre, hasta ${LARGO_MAXIMO_TEXTO} caracteres.`);
    else if (d.type === 'number') partes.push('Un número, con punto decimal.');
    else if (d.type === 'boolean') partes.push('Escriba SI o NO.');
    else if (d.type === 'option') {
      partes.push(d.multiple ? `Una o varias opciones separadas con ${SEPARADOR_VALORES}.` : 'Una sola opción.');
      partes.push(`Opciones válidas: ${(d.options || []).join(OPCIONES_EN_AYUDA)}.`);
    }
    if (d.required) partes.push('Obligatorio en la categoría.');
    if (d.heredado && d.origen) partes.push(`Viene de «${nombreDeOrigen(d.origen, indice)}».`);
    filas.push([encabezadoDeAtributo(d), TEXTO_DE_TIPO[d.type] || '', d.type === 'number' ? una(d.unit) : '', partes.join(' ')]);
  }
  return filas;
}

// ── Lectura ─────────────────────────────────────────────────────────────────

export type ValorDeCelda = string | number | boolean | string[] | null;

export interface FilaDeLote {
  /** Número de fila en Excel (el encabezado es la 1). */
  fila: number;
  referencia: string;
  attributes: Record<string, ValorDeCelda>;
}

export interface AvisoDeFila {
  fila: number;
  motivo: 'sin_referencia' | 'referencia_repetida';
  mensaje: string;
  /** La referencia repetida (para que quien pinta el aviso lo traduzca sin parsear el mensaje). */
  referencia?: string;
}

export interface ColumnaLeida {
  encabezado: string;
  clave: string;
}

export interface LecturaDeHoja {
  filas: FilaDeLote[];
  avisos: AvisoDeFila[];
  /** Filas con referencia y todas las celdas de atributos vacías: no se mandan. */
  sinCambios: number[];
  columnas: ColumnaLeida[];
  /** Encabezados que no traen `[clave]` (notas del comercio, por ejemplo): se ignoran. */
  columnasSinClave: string[];
  /** Claves que tienen más de una columna: gana la primera. */
  columnasRepetidas: string[];
  /**
   * Solo informativo: con `esquema`, las claves de las columnas que el esquema recibido no tiene.
   * No se quitan (el servidor decide por la categoría de cada producto y rechaza la fila con el
   * motivo); B17 puede avisarle al comercio antes de mandar.
   */
  columnasFueraDelEsquema: string[];
  /** Referencias que aparecen en más de una fila a mandar: el servidor las rechazaría a todas, aquí no se mandan. */
  referenciasRepetidas: string[];
  /** false si la hoja no tiene la columna de referencia: no hay nada que leer. */
  hayReferencia: boolean;
}

function referenciaDe(celda: unknown): string {
  if (typeof celda === 'number') return Number.isFinite(celda) ? String(celda) : '';
  return typeof celda === 'string' ? celda.trim() : '';
}

const SI = ['si', 'yes', 'true', 'verdadero', '1'];
const NO = ['no', 'false', 'falso', '0'];

function valorDeCelda(celda: unknown, def: Definicion | undefined, siNoPorEncabezado: boolean): ValorDeCelda | undefined {
  if (celda === null || celda === undefined) return undefined;
  const tipo = def ? def.type : siNoPorEncabezado ? 'boolean' : null;
  if (typeof celda === 'boolean') return celda;
  if (typeof celda === 'number') {
    if (!Number.isFinite(celda)) return undefined;
    if (tipo === 'boolean' && (celda === 1 || celda === 0)) return celda === 1;
    return tipo === 'text' || tipo === 'option' ? String(celda) : celda;
  }
  const t = typeof celda === 'string' ? celda.trim() : una(celda);
  if (!t) return undefined;
  if (MARCA_BORRAR_RE.test(t)) return null;
  if (tipo === 'boolean') {
    const n = sinTildes(t.toLowerCase());
    return SI.includes(n) ? true : NO.includes(n) ? false : t;
  }
  if (tipo === 'option' && def && def.multiple) {
    const partes = t.split(SEPARADOR_VALORES).map((x) => x.trim()).filter(Boolean);
    return partes.length ? partes : undefined;
  }
  return t;
}

/**
 * Lee las filas de la hoja (como las entrega `XLSX.utils.sheet_to_json`: un objeto por fila con
 * el encabezado como clave). `esquema`: los atributos de la categoría, para saber qué es una
 * lista de varias opciones y qué es un sí/no; sin él, el sí/no se reconoce por `(SI/NO)` en el
 * encabezado y los `;` no se parten.
 *
 * El número de fila sale de `__rowNum__` que pone SheetJS (propiedad no enumerable): así cuenta
 * bien aunque `sheet_to_json` salte filas totalmente en blanco. Sin él (arreglos armados a mano)
 * se usa la posición + 2.
 */
export function leerHoja(filas: unknown, esquema?: Definicion[] | null): LecturaDeHoja {
  const salida: LecturaDeHoja = { filas: [], avisos: [], sinCambios: [], columnas: [], columnasSinClave: [], columnasRepetidas: [], columnasFueraDelEsquema: [], referenciasRepetidas: [], hayReferencia: false };
  const objetos = (Array.isArray(filas) ? filas : []).map((f) => (esObjeto(f) ? f : null));
  const defs = new Map<string, Definicion>();
  for (const d of Array.isArray(esquema) ? esquema : []) if (esObjeto(d) && typeof d.key === 'string') defs.set(d.key, d);

  const encabezados: string[] = [];
  const vistos = new Set<string>();
  for (const f of objetos) {
    if (!f) continue;
    for (const h of Object.keys(f)) {
      if (!vistos.has(h)) {
        vistos.add(h);
        encabezados.push(h);
      }
    }
  }
  const colReferencia = encabezados.find(esColumnaReferencia);
  salida.hayReferencia = colReferencia !== undefined;
  const claves = new Set<string>();
  for (const h of encabezados) {
    if (h === colReferencia) continue;
    const clave = claveDeEncabezado(h);
    if (!clave) {
      if (!esColumnaReferencia(h)) salida.columnasSinClave.push(h);
    } else if (claves.has(clave)) {
      if (!salida.columnasRepetidas.includes(clave)) salida.columnasRepetidas.push(clave);
    } else {
      claves.add(clave);
      salida.columnas.push({ encabezado: h, clave });
      if (defs.size && !defs.has(clave)) salida.columnasFueraDelEsquema.push(clave);
    }
  }
  if (colReferencia === undefined) return salida;

  objetos.forEach((f, i) => {
    if (!f) return;
    const fila = typeof (f as any).__rowNum__ === 'number' ? (f as any).__rowNum__ + 1 : i + 2;
    const referencia = referenciaDe(f[colReferencia]);
    const attributes: Record<string, ValorDeCelda> = {};
    for (const c of salida.columnas) {
      const v = valorDeCelda(f[c.encabezado], defs.get(c.clave), marcaSiNo(c.encabezado));
      if (v !== undefined) attributes[c.clave] = v;
    }
    const conValores = Object.keys(attributes).length > 0;
    if (!referencia) {
      if (conValores) salida.avisos.push({ fila, motivo: 'sin_referencia', mensaje: `Fila ${fila}: falta la Referencia (SKU), no se sabe a qué producto pertenecen las especificaciones.` });
      return;
    }
    if (!conValores) salida.sinCambios.push(fila);
    else salida.filas.push({ fila, referencia, attributes });
  });

  // Referencias repetidas (espejo de `referencia_repetida` del lote): el servidor solo las ve
  // dentro de una misma petición y aquí se parte en peticiones, así que se detectan antes de partir.
  const cuenta = new Map<string, number>();
  for (const f of salida.filas) cuenta.set(f.referencia, (cuenta.get(f.referencia) || 0) + 1);
  if (Array.from(cuenta.values()).some((n) => n > 1)) {
    const buenas: FilaDeLote[] = [];
    for (const f of salida.filas) {
      if ((cuenta.get(f.referencia) || 0) > 1) {
        if (!salida.referenciasRepetidas.includes(f.referencia)) salida.referenciasRepetidas.push(f.referencia);
        salida.avisos.push({ fila: f.fila, motivo: 'referencia_repetida', referencia: f.referencia, mensaje: `Fila ${f.fila}: la Referencia (SKU) ${f.referencia} aparece más de una vez en el archivo, no se cargó ninguna de esas filas.` });
      } else buenas.push(f);
    }
    salida.filas = buenas;
    salida.avisos.sort((a, b) => a.fila - b.fila);
  }
  return salida;
}

/** Parte las filas en peticiones del tamaño que acepta el servidor. */
export function partirEnLotes<T>(filas: T[], tope: number = TOPE_FILAS_POR_PETICION): T[][] {
  const n = Number.isInteger(tope) && tope > 0 ? tope : TOPE_FILAS_POR_PETICION;
  const lista = Array.isArray(filas) ? filas : [];
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += n) lotes.push(lista.slice(i, i + n));
  return lotes;
}

// ── Export ──────────────────────────────────────────────────────────────────

export interface ProductoDeRuta {
  producto: any;
  /** Clave de la ruta en que cayó el producto. */
  ruta: string;
}

/**
 * Los productos cuya ruta (rutaDelProducto, igual que el servidor) es la categoría elegida o
 * una subcategoría. `sinRuta`: los que no se pudieron ubicar (ambigua, fuera del árbol, sin
 * categoría), que no entran.
 */
export function productosDeLaCategoria(
  productos: unknown,
  ruta: string,
  indice: IndiceDeRutas | null | undefined,
  schemas: AttributeSchemas | null | undefined,
): { incluidos: ProductoDeRuta[]; sinRuta: number } {
  const incluidos: ProductoDeRuta[] = [];
  let sinRuta = 0;
  const elegida = claveCategoria(ruta);
  for (const producto of Array.isArray(productos) ? productos : []) {
    const r = rutaDelProducto(producto, indice, schemas);
    if (!r.ruta) {
      sinRuta++;
      continue;
    }
    if (elegida && (r.ruta === elegida || r.ruta.startsWith(`${elegida} > `))) incluidos.push({ producto, ruta: r.ruta });
  }
  return { incluidos, sinRuta };
}

const igualSinMayusculas = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const opcionDe = (def: Definicion, v: unknown): string | null =>
  typeof v === 'string' ? (def.options || []).find((o) => o === v.trim()) || (def.options || []).find((o) => igualSinMayusculas(o, v.trim())) || null : null;

/** Lo que se escribe en la celda: solo valores válidos para el esquema del producto; lo demás, vacío. */
function celdaDeExport(def: Definicion | undefined, valor: unknown): string | number {
  if (!def || valor === null || valor === undefined) return '';
  switch (def.type) {
    case 'number':
      return typeof valor === 'number' && Number.isFinite(valor) ? valor : '';
    case 'boolean':
      return typeof valor === 'boolean' ? (valor ? 'SI' : 'NO') : '';
    case 'option': {
      const lista = Array.isArray(valor) ? valor : [valor];
      const validas: string[] = [];
      for (const v of lista) {
        const o = opcionDe(def, v);
        if (o && !validas.includes(o)) validas.push(o);
      }
      if (!def.multiple) return validas.length === 1 && !Array.isArray(valor) ? validas[0] : '';
      return validas.join(`${SEPARADOR_VALORES} `);
    }
    default:
      return typeof valor === 'string' ? valor.trim() : '';
  }
}

export interface HojaDeExportacion {
  /** Encabezados y una fila por producto. Solo la referencia si no hay atributos que exportar. */
  filas: (string | number)[][];
  columnas: AtributoEfectivo[];
  incluidos: number;
  sinReferencia: number;
  sinRuta: number;
  /** Claves cuyo tipo cambia entre subcategorías: la celda de los productos de otro tipo sale vacía. */
  clavesConTipoDistinto: string[];
}

/**
 * La hoja «Especificaciones» del export: los productos de la categoría elegida y de sus
 * subcategorías, con los valores de los documentos que el export ya trae (sin leer nada más).
 * Columnas: los atributos de la categoría elegida y, después, los de las subcategorías que
 * traen productos (si una clave aparece dos veces, gana la primera definición; el producto cuya
 * definición es de otro tipo deja esa celda vacía, para que al reimportar no viaje un valor que el
 * encabezado no describe: vacía = no cambia).
 */
export function hojaDeExportacion(
  productos: unknown,
  ruta: string,
  indice: IndiceDeRutas | null | undefined,
  schemas: AttributeSchemas | null | undefined,
): HojaDeExportacion {
  const { incluidos, sinRuta } = productosDeLaCategoria(productos, ruta, indice, schemas);
  const conReferencia = incluidos
    .map((x) => ({ ...x, referencia: referenciaDe(x.producto && x.producto.identificacion && x.producto.identificacion.referencia) }))
    .filter((x) => x.referencia);
  const sinReferencia = incluidos.length - conReferencia.length;

  const porRuta = new Map<string, AtributoEfectivo[]>();
  const esquemaDe = (r: string): AtributoEfectivo[] => {
    if (!porRuta.has(r)) porRuta.set(r, esquemaEfectivo(schemas, r, indice));
    return porRuta.get(r) as AtributoEfectivo[];
  };
  const columnas: AtributoEfectivo[] = [];
  const claves = new Set<string>();
  const sumar = (r: string) => {
    for (const d of esquemaDe(r)) {
      if (claves.has(d.key)) continue;
      claves.add(d.key);
      columnas.push(d);
    }
  };
  const elegida = claveCategoria(ruta);
  if (elegida && indice && esObjeto(indice.rutas) && Object.prototype.hasOwnProperty.call(indice.rutas, elegida)) sumar(elegida);
  for (const x of conReferencia) sumar(x.ruta);

  const filas: (string | number)[][] = [encabezadosDeHoja(columnas)];
  const clavesConTipoDistinto: string[] = [];
  if (columnas.length) {
    for (const x of conReferencia) {
      const propios = new Map(esquemaDe(x.ruta).map((d) => [d.key, d]));
      const attrs = esObjeto(x.producto.attributes) ? x.producto.attributes : {};
      filas.push([
        x.referencia,
        ...columnas.map((c) => {
          if (!Object.prototype.hasOwnProperty.call(attrs, c.key)) return '';
          const propio = propios.get(c.key);
          if (propio && propio.type !== c.type) {
            if (!clavesConTipoDistinto.includes(c.key)) clavesConTipoDistinto.push(c.key);
            return '';
          }
          return celdaDeExport(propio, attrs[c.key]);
        }),
      ]);
    }
  }
  return { filas, columnas, incluidos: conReferencia.length, sinReferencia, sinRuta, clavesConTipoDistinto };
}
