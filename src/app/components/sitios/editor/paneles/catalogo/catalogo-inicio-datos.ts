/**
 * Datos del panel «Sección del catálogo en el inicio» (diseño nuevo): las mismas reglas del módulo `catalogoInicio` del
 * servidor (`functions/utils/sitioModulos/catalogoInicio.js`). El servidor normaliza al guardar; aquí solo se ayuda y se avisa.
 */

/** Cuántos productos se ven en el inicio: una, dos o tres filas de 4 (12 es lo que trae la primera página del catálogo). */
export const CANTIDADES_INICIO: readonly number[] = [4, 8, 12];

/** Lo que sale si el comercio no elige. */
export const CANTIDAD_INICIO_POR_DEFECTO = 8;

/** Topes del servidor (`normalizarExtra`). */
export const TOPES_CATALOGO_INICIO = Object.freeze({ etiqueta: 40, titulo: 80, subtitulo: 160 });

/** Cuántos productos pide el comercio (4, 8 o 12; 8 si no eligió). */
export function cantidadInicio(datos: { inicioCantidad?: any } | null | undefined): number {
  const n = Number(datos && datos.inicioCantidad);
  return CANTIDADES_INICIO.includes(n) ? n : CANTIDAD_INICIO_POR_DEFECTO;
}

/** Un marcador de algo por llenar («[NOMBRE]»): la página no lo publica. */
export function conMarcador(texto: string | null | undefined): boolean {
  return /\[[^\]]{2,}\]/.test(String(texto || ""));
}
