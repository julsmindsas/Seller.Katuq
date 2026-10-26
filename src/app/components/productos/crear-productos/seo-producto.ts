/**
 * Campos SEO opcionales del formulario de producto (F5-30, F530-F03, 14.16): título y descripción
 * para buscadores. Puro y sin Angular. Los límites son los del servidor (70 y 320); el servidor
 * vuelve a sanear. NO toca `crearProducto`: el texto alternativo de las fotos (`alt`) sigue donde está.
 */
export const SEO_MAX_TITULO = 70;
export const SEO_MAX_DESCRIPCION = 320;

export interface SeoProducto {
  titulo: string;
  descripcion: string;
}

const limpiar = (v: unknown, max: number): string =>
  String(v === undefined || v === null ? '' : v)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

/** SEO que trae un producto guardado (o vacío). */
export function seoDeProducto(producto: { seo?: { titulo?: unknown; descripcion?: unknown } } | null | undefined): SeoProducto {
  const s = (producto && producto.seo) || {};
  return { titulo: limpiar(s.titulo, SEO_MAX_TITULO), descripcion: limpiar(s.descripcion, SEO_MAX_DESCRIPCION) };
}

/**
 * Lo que se agrega al cuerpo al guardar. Si no hay texto y el producto no tenía SEO, no se manda
 * nada (el producto queda igual que hoy). Si lo tenía y se vació, se manda `{}` para quitarlo.
 */
export function seoParaGuardar(valor: Partial<SeoProducto> | null | undefined, teniaSeo: boolean): { seo?: Partial<SeoProducto> } {
  const titulo = limpiar(valor && valor.titulo, SEO_MAX_TITULO);
  const descripcion = limpiar(valor && valor.descripcion, SEO_MAX_DESCRIPCION);
  if (!titulo && !descripcion) return teniaSeo ? { seo: {} } : {};
  return { seo: { ...(titulo ? { titulo } : {}), ...(descripcion ? { descripcion } : {}) } };
}
