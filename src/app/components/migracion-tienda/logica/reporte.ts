/**
 * Reporte descargable de la importación (F5-30, tarea 8.1): una fila por producto o aviso con
 * fila del archivo, producto, resultado y motivo. NUNCA lleva correos, teléfonos ni direcciones:
 * cada fila se arma campo por campo (lista blanca), sin copiar objetos del servidor, y los textos
 * del «detalle» salen de esta tabla, no de la respuesta.
 */
import { TotalesProductos } from './sumas';

export type Resultado = 'Creado' | 'Actualizado' | 'Omitido' | 'Aviso' | 'Error';

export interface FilaReporte {
  fila: number | null;
  producto: string;
  referencia: string;
  resultado: Resultado;
  motivo: string;
}

/** Explicación en español sencillo de cada código del contrato. */
export const DETALLE_POR_CODIGO: { [codigo: string]: string } = {
  EXISTS: 'Ya existe un producto con esa referencia en Katuq; no se tocó.',
  ALREADY_MIGRATED: 'Ya se había traído en una importación anterior; no se repitió.',
  AMBIGUOUS_REFERENCE: 'Hay varios productos con esa referencia en Katuq; no se sabe cuál actualizar.',
  TOO_MANY_AXES: 'Tiene más de dos opciones (por ejemplo talla, color y material); Katuq admite dos.',
  ARCHIVED: 'Estaba archivado en la tienda anterior.',
  GIFT_CARD: 'Es una tarjeta de regalo; no se trae.',
  DUPLICATED_IN_FILE: 'Aparece más de una vez en el archivo.',
  INVALID: 'Le falta un dato necesario, por ejemplo el precio.',
  TYPE_NOT_SUPPORTED: 'Es de un tipo de producto que Katuq no trae (agrupado, externo).',
  WRITE_FAILED: 'No se pudo guardar; al reenviar el lote se reintenta.',
  UNKNOWN: 'Sin detalle.',
  INVENTORY_FAILED: 'El producto se creó, pero no se pudieron cargar sus existencias. Cárgalas con el importador de existencias.',
  PRICE_PER_VARIANT: 'Se separó en varios productos porque sus variantes tienen precio, oferta o IVA distintos.',
  PHOTO_REJECTED: 'Una foto no es válida y no se trajo.',
  PHOTO_OVER_LIMIT: 'Tiene más fotos de las que admite Katuq; se trajeron las primeras.',
  OFFER_NO_PUBLIC_LIST: 'No hay un tipo de cliente «Público»; las ofertas no se cargaron.',
  OFFER_AMBIGUOUS_LIST: 'Hay varios tipos de cliente «Público»; las ofertas no se cargaron.',
  OFFER_SCHEDULED: 'La oferta empieza más adelante; no se trajo.',
  OFFER_EXPIRED: 'La oferta ya venció; solo se trajo el precio normal.',
  OFFER_INVALID: 'La oferta no se pudo calcular; no se trajo.',
  OFFER_KEPT: 'Ya tenía su oferta en Katuq; no se tocó.',
  PRICE_SHADOWED_BY_PUBLIC_LIST: 'El producto tiene precio propio para el público; el precio nuevo no se verá en la tienda en línea.',
  TAX_CLASS_UNMAPPED: 'Usa una clase de impuesto sin IVA asignado; no se trajo.',
  NOT_TRACKED: 'No llevaba control de existencias; entra sin existencias.',
  TRACKING_MIXED: 'Algunas variantes llevaban control de existencias y otras no; entra con control.',
  STOCK_UNKNOWN: 'El archivo no trae sus existencias; entra en cero.',
  NEGATIVE_STOCK: 'Tenía existencias negativas; entra en cero.',
  VARIATION_ANY_VALUE: 'Una variación aceptaba «cualquier» valor; no se trajo.',
  ORPHAN_VARIATION: 'Es una variación cuyo producto no está en el archivo.',
  ATTRIBUTES_NOT_IMPORTED: 'Tiene atributos que no son talla ni color; no se trajeron.',
  EXTRA_CATEGORIES: 'Estaba en varias categorías; solo se trajo la primera.',
  PLAN_LIMIT: 'Tu plan limita los productos visibles en la tienda; los que pasan del límite quedan guardados pero ocultos.',
  TARGET_HIDDEN_BY_PLAN: 'La dirección antigua de este producto no se redirige: por tu plan, el producto quedó oculto en la tienda.',
  BASE_ASSUMED: 'No sabíamos cómo empiezan las direcciones de tus productos; usamos la base más común. Pega unas direcciones reales para afinarla.',
  SLUG_PROBABLE: 'Las direcciones de WooCommerce se armaron con el nombre del producto; son probables, no seguras.',
  NOT_MIGRATED: 'Este producto no se trajo en esta importación; no se tocó.',
  TARGET_MISSING: 'La redirección apuntaba a un producto que ya no existe.',
  CATEGORY_MISSING: 'La categoría no existe en Katuq; no se redirige.',
  WAREHOUSE_MISSING: 'Falta elegir la bodega de las existencias.',
  WAREHOUSE_INVALID: 'La bodega elegida no está activa.',
  UNKNOWN_FORMAT: 'No se reconocen las columnas del archivo.',
  LEGACY_FORMAT: 'El archivo usa los encabezados anteriores de Shopify.',
  MIXED_FORMAT: 'El archivo mezcla encabezados nuevos y anteriores.',
  TOO_MANY_ROWS: 'Tiene demasiadas filas para un solo envío y no se pudo traer.',
  NO_CONTACT: 'No tiene correo ni celular.',
  DUPLICATE_IN_FILE: 'Se repite en el archivo.',
};

const DETALLE_GENERICO = 'Revisa este caso en tu tienda anterior.';
const CORREO = /[^\s@]+@[^\s@]+/;

/** Texto de una celda: sin saltos, sin fórmulas ejecutables y sin correos. */
export function limpiarCelda(valor: unknown): string {
  let s = valor === undefined || valor === null ? '' : String(valor);
  s = s.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  if (CORREO.test(s)) return '[oculto]';
  // Una celda que empieza por = + - @ se abriría como fórmula en una hoja de cálculo.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s;
}

const celdaCsv = (valor: unknown): string => {
  const s = limpiarCelda(valor);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const filaNumero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null);

/** Filas del reporte a partir de los totales. Solo copia campos permitidos. */
export function filasDeReporte(t: TotalesProductos): FilaReporte[] {
  const filas: FilaReporte[] = [];
  const referenciaDe = new Map<string, string>();
  for (const p of t.productos) {
    if (p.referencia) referenciaDe.set(p.key, p.referencia);
    const resultado: Resultado = p.action === 'created' ? 'Creado' : p.action === 'updated' ? 'Actualizado' : 'Omitido';
    filas.push({ fila: filaNumero(p.row), producto: p.key, referencia: p.referencia || '', resultado, motivo: p.action === 'skipped' ? p.reason || 'UNKNOWN' : '' });
  }
  for (const f of t.inventario.fallidas) {
    filas.push({ fila: null, producto: f.key, referencia: f.referencia || referenciaDe.get(f.key) || '', resultado: 'Error', motivo: f.code });
  }
  for (const a of t.avisos) {
    const key = a.key || '';
    filas.push({ fila: filaNumero(a.row), producto: key, referencia: referenciaDe.get(key) || '', resultado: 'Aviso', motivo: a.code });
  }
  return filas;
}

export const ENCABEZADOS_REPORTE = ['Fila', 'Producto', 'Referencia', 'Resultado', 'Motivo', 'Detalle'];

/** CSV del reporte (con BOM para que Excel lea las tildes). */
export function reporteCsv(t: TotalesProductos): string {
  const lineas = [ENCABEZADOS_REPORTE.join(',')];
  for (const f of filasDeReporte(t)) {
    const detalle = f.motivo ? DETALLE_POR_CODIGO[f.motivo] || DETALLE_GENERICO : '';
    lineas.push([f.fila === null ? '' : f.fila, f.producto, f.referencia, f.resultado, f.motivo, detalle].map(celdaCsv).join(','));
  }
  return `﻿${lineas.join('\r\n')}\r\n`;
}
