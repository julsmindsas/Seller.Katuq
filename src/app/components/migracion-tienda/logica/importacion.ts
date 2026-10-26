/**
 * Lectura de los archivos de la tienda anterior en el navegador (F5-30, tarea 8.1): detección del
 * proveedor y del formato por TABLA de alias (`perfiles.ts`), agrupación por producto y unión del
 * CSV de inventario. Puro y sin `if` por proveedor: todo lo propio de cada plataforma está en los
 * perfiles. El servidor interpreta; aquí solo se reconoce, se filtra a las columnas conocidas y
 * se agrupa sin partir un producto.
 */
import { ArchivoCsv, FilaLeida, leerCsv } from './csv';
import { Alias, PerfilInventario, PerfilProveedor, PERFILES } from './perfiles';
import { FilaEnvio, GrupoEnvio } from '../tipos';

export type FormatoArchivo = 'current' | 'legacy' | 'mixed' | null;

/** Nombre de columna comparable: sin BOM, espacios de más ni mayúsculas. */
export function normalizarEncabezado(s: string): string {
  return String(s === undefined || s === null ? '' : s).replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const sinTildes = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type MapaEncabezados = Map<string, string>;

function mapaDe(encabezados: string[]): MapaEncabezados {
  const mapa: MapaEncabezados = new Map();
  for (const h of encabezados) {
    const n = normalizarEncabezado(h);
    if (n && !mapa.has(n)) mapa.set(n, h);
  }
  return mapa;
}

const tieneAlguna = (mapa: MapaEncabezados, alias: Alias): boolean => alias.some((x) => mapa.has(normalizarEncabezado(x)));

/** Primer alias con valor en la fila (el actual antes que el anterior). */
export function valorDeColumna(fila: FilaLeida, mapa: MapaEncabezados, alias: Alias): string {
  for (const x of alias) {
    const h = mapa.get(normalizarEncabezado(x));
    if (h === undefined) continue;
    const v = fila.valores[h];
    if (v !== undefined && v.trim() !== '') return v.trim();
  }
  return '';
}

export interface Deteccion {
  perfil: PerfilProveedor | null;
  formato: FormatoArchivo;
  /** Idioma de los encabezados cuando el perfil lo distingue (WooCommerce); si no, null. */
  idioma: 'es' | 'en' | null;
}

/** Reconoce el proveedor por las columnas mínimas de cada perfil. Sin coincidencia: `perfil: null`. */
export function detectarArchivo(encabezados: string[]): Deteccion {
  const mapa = mapaDe(encabezados);
  const perfil = PERFILES.find((p) => p.minimas.every((g) => tieneAlguna(mapa, g))) || null;
  if (!perfil) return { perfil: null, formato: null, idioma: null };
  // Una marca cuenta solo si no es también del otro formato (p. ej. «Title» no existe en las marcas).
  const actual = perfil.marcasActual.some((m) => mapa.has(normalizarEncabezado(m)));
  const anterior = perfil.marcasAnterior.some((m) => mapa.has(normalizarEncabezado(m)));
  let formato: FormatoArchivo = null;
  if (actual && anterior) formato = 'mixed';
  else if (actual) formato = 'current';
  else if (anterior) formato = 'legacy';
  const idioma = perfil.basesRedireccion ? (tieneAlguna(mapa, perfil.soloEspanol) ? 'es' : 'en') : null;
  return { perfil, formato, idioma };
}

/** Encabezados del archivo que el servidor conoce; el resto no sale del navegador. */
export function encabezadosConocidos(conocidas: readonly Alias[], encabezados: string[]): string[] {
  const permitidos = new Set<string>();
  for (const grupo of conocidas) for (const x of grupo) permitidos.add(normalizarEncabezado(x));
  return encabezados.filter((h) => permitidos.has(normalizarEncabezado(h)));
}

export function aFilaEnvio(fila: FilaLeida, columnas: string[]): FilaEnvio {
  const salida: FilaEnvio = { _row: fila._row };
  for (const h of columnas) {
    const v = fila.valores[h];
    if (v !== undefined && v !== '') salida[h] = v;
  }
  return salida;
}

export interface ProductosAgrupados {
  grupos: GrupoEnvio[];
  /** Números de fila sin la columna que agrupa (no se envían). */
  filasSinClave: number[];
}

/**
 * Agrupa las filas por producto: el handle de Shopify, el ID de WooCommerce con sus variaciones
 * unidas por `Parent` (`id:<ID>` o SKU del padre). Una variación sin padre queda en un grupo
 * `orphan:<padre>` que el servidor avisa como ORPHAN_VARIATION. El orden es el del archivo.
 */
export function agruparProductos(archivo: ArchivoCsv, perfil: PerfilProveedor): ProductosAgrupados {
  const mapa = mapaDe(archivo.encabezados);
  const columnas = encabezadosConocidos(perfil.conocidas, archivo.encabezados);
  const grupos = new Map<string, GrupoEnvio>();
  const filasSinClave: number[] = [];
  const nuevoGrupo = (key: string): GrupoEnvio => {
    let g = grupos.get(key);
    if (!g) {
      g = { key, rows: [], inventoryRows: [] };
      grupos.set(key, g);
    }
    return g;
  };

  const v = perfil.variaciones;
  const variaciones: FilaLeida[] = [];
  const porSku = new Map<string, string>();
  for (const fila of archivo.filas) {
    const esVariacion = v !== null && v.valoresVariacion.includes(sinTildes(valorDeColumna(fila, mapa, v.tipo).split(',')[0]));
    if (esVariacion) {
      variaciones.push(fila);
      continue;
    }
    const key = valorDeColumna(fila, mapa, perfil.clave);
    if (!key) {
      filasSinClave.push(fila._row);
      continue;
    }
    nuevoGrupo(key).rows.push(aFilaEnvio(fila, columnas));
    if (v) {
      const sku = valorDeColumna(fila, mapa, v.sku);
      if (sku && !porSku.has(sku)) porSku.set(sku, key);
    }
  }
  if (v) {
    for (const fila of variaciones) {
      const padre = valorDeColumna(fila, mapa, v.padre);
      const id = /^id:/i.test(padre) ? padre.replace(/^id:/i, '').trim() : porSku.get(padre) || (grupos.has(padre) ? padre : '');
      const destino = id && grupos.has(id) ? id : `orphan:${padre || valorDeColumna(fila, mapa, v.id) || fila._row}`;
      nuevoGrupo(destino).rows.push(aFilaEnvio(fila, columnas));
    }
  }
  return { grupos: [...grupos.values()], filasSinClave };
}

export type CodigoInventario = 'INVENTORY_NOT_SUPPORTED' | 'INVENTORY_UNKNOWN_FORMAT' | 'INVENTORY_FORMAT_UNSUPPORTED';

export interface RechazoInventario {
  code: CodigoInventario;
  message: string;
}

export const MENSAJES_INVENTARIO: { [c in CodigoInventario]: string } = {
  INVENTORY_NOT_SUPPORTED: 'Esa plataforma trae las existencias dentro del archivo de productos. No hace falta un archivo de inventario.',
  INVENTORY_UNKNOWN_FORMAT: 'No reconocemos este archivo de inventario. Súbelo tal como lo exporta tu tienda, con la columna «Handle».',
  INVENTORY_FORMAT_UNSUPPORTED:
    'Este inventario viene con una columna por ubicación y no trae las cantidades que necesitamos. Vuelve a exportarlo desde Productos > Inventario > Exportar, eligiendo la opción por estados (con la columna «Available»), y súbelo de nuevo.',
};

/** Rechazo de entrada del CSV de inventario: sin la columna de cantidades («Available») no se carga nada. */
export function validarInventario(encabezados: string[], inventario: PerfilInventario | null): RechazoInventario | null {
  if (!inventario) return { code: 'INVENTORY_NOT_SUPPORTED', message: MENSAJES_INVENTARIO.INVENTORY_NOT_SUPPORTED };
  const mapa = mapaDe(encabezados);
  if (!tieneAlguna(mapa, inventario.clave)) return { code: 'INVENTORY_UNKNOWN_FORMAT', message: MENSAJES_INVENTARIO.INVENTORY_UNKNOWN_FORMAT };
  if (!tieneAlguna(mapa, inventario.disponible)) return { code: 'INVENTORY_FORMAT_UNSUPPORTED', message: MENSAJES_INVENTARIO.INVENTORY_FORMAT_UNSUPPORTED };
  return null;
}

export interface UnionInventario {
  /** Filas de inventario puestas en algún producto. */
  unidas: number;
  /** Filas cuyo handle no está en el archivo de productos (no se envían). */
  sinProducto: number;
}

/**
 * Une las filas de inventario al grupo del mismo handle (`URL handle` o `Handle`, sin importar
 * mayúsculas). Modifica los grupos recibidos. No parte ningún producto.
 */
export function unirInventario(grupos: GrupoEnvio[], archivo: ArchivoCsv, inventario: PerfilInventario): UnionInventario {
  const mapa = mapaDe(archivo.encabezados);
  const columnas = encabezadosConocidos(inventario.conocidas, archivo.encabezados);
  const porClave = new Map<string, GrupoEnvio>();
  for (const g of grupos) porClave.set(g.key.toLowerCase(), g);
  let unidas = 0;
  let sinProducto = 0;
  for (const fila of archivo.filas) {
    const key = valorDeColumna(fila, mapa, inventario.clave).toLowerCase();
    const g = key ? porClave.get(key) : undefined;
    if (!g) {
      sinProducto++;
      continue;
    }
    g.inventoryRows.push(aFilaEnvio(fila, columnas));
    unidas++;
  }
  return { unidas, sinProducto };
}

export type ResultadoLectura =
  | { ok: false; code: 'UNKNOWN_FORMAT' | CodigoInventario; message: string }
  | {
      ok: true;
      perfil: PerfilProveedor;
      formato: FormatoArchivo;
      idioma: 'es' | 'en' | null;
      grupos: GrupoEnvio[];
      filasLeidas: number;
      filasSinClave: number[];
      inventario: UnionInventario | null;
    };

export const MENSAJE_FORMATO_DESCONOCIDO =
  'No reconocemos las columnas del archivo. Súbelo tal como lo exporta tu tienda: el CSV de productos de Shopify, o el de WooCommerce (Productos > Exportar).';

/** Lee el CSV de productos (y el de inventario, si hay). Un rechazo no deja ningún dato a medias. */
export function leerTienda(textoProductos: string, textoInventario?: string | null): ResultadoLectura {
  const productos = leerCsv(textoProductos);
  const det = detectarArchivo(productos.encabezados);
  if (!det.perfil) return { ok: false, code: 'UNKNOWN_FORMAT', message: MENSAJE_FORMATO_DESCONOCIDO };
  const { grupos, filasSinClave } = agruparProductos(productos, det.perfil);

  let inventario: UnionInventario | null = null;
  if (textoInventario !== undefined && textoInventario !== null && textoInventario.trim() !== '') {
    const csvInventario = leerCsv(textoInventario);
    const rechazo = validarInventario(csvInventario.encabezados, det.perfil.inventario);
    if (rechazo) return { ok: false, code: rechazo.code, message: rechazo.message };
    inventario = unirInventario(grupos, csvInventario, det.perfil.inventario as PerfilInventario);
  }
  return { ok: true, perfil: det.perfil, formato: det.formato, idioma: det.idioma, grupos, filasLeidas: productos.filas.length, filasSinClave, inventario };
}
