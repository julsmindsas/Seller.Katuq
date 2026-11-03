/**
 * Menú en cajón lateral de la vista previa «Celular» del editor (TX-34, bloque TX34-B18, design.md D8).
 *
 * ⚠️ ESPEJO de `functions/utils/siteCajonLateral.js` y de `BLOQUES.encabezado` en `functions/utils/siteHtml.js`
 * (repositorio del backend). Es solo presentación: decide QUÉ lleva el panel; abrir y cerrar es estado del componente.
 * Si cambia el contenido del panel publicado, cambia aquí.
 */

export interface ContenidoMenu {
  /** Nombres de categoría (los mismos de la fila de la cabecera) o los de ejemplo si la empresa aún no tiene. */
  categorias: string[];
  /** true si `categorias` son de ejemplo (la empresa no tiene categorías todavía). */
  categoriasDeEjemplo: boolean;
  /** Enlaces del menú del comercio (los de la cabecera). */
  enlaces: { etiqueta: string }[];
  /** La tienda vende: «Mi cuenta» y «Favoritos». */
  tienda: boolean;
  /** Teléfono de WhatsApp del bloque de WhatsApp de la página ("" si no hay). */
  whatsapp: string;
}

export const CATEGORIAS_DE_EJEMPLO = ["tus categorías", "salen aquí", "al publicar"];
/** Cuántas categorías pinta la fila de la cabecera de la previa; el panel pinta las mismas. */
export const MAX_CATEGORIAS_MENU = 8;

/** Igual que `whatsappColombia` del servidor: solo dígitos y prefijo 57 si son 10. */
function digitosWhatsapp(telefono: any): string {
  const d = String(telefono || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) return d;
  if (d.length === 10) return `57${d}`;
  return d;
}

/** El WhatsApp del panel: el del primer bloque de WhatsApp visible con un número válido (10 a 15 dígitos). */
export function whatsappDelMenu(bloques: any[] | null | undefined): string {
  const bloque = (bloques || []).find((b) => b && b.tipo === "whatsapp" && b.visible !== false && b.datos && b.datos.telefono);
  const tel = bloque ? digitosWhatsapp(bloque.datos.telefono) : "";
  return /^\d{10,15}$/.test(tel) ? tel : "";
}

/**
 * Lo que lleva el panel de una cabecera, o `null` si no hay nada que mostrar (entonces no hay botón «Menú»,
 * igual que en la página publicada).
 */
export function contenidoDelMenu(
  d: any,
  ctx: { categorias?: { nombre: string }[] | null; tiendaActiva?: boolean; bloques?: any[] | null }
): ContenidoMenu | null {
  const datos = d || {};
  const reales = (ctx.categorias || []).map((c) => c && c.nombre).filter(Boolean).slice(0, MAX_CATEGORIAS_MENU) as string[];
  const conCategorias = !!datos.mostrarCategorias;
  const categoriasDeEjemplo = conCategorias && reales.length === 0;
  const contenido: ContenidoMenu = {
    categorias: conCategorias ? (reales.length ? reales : CATEGORIAS_DE_EJEMPLO) : [],
    categoriasDeEjemplo,
    enlaces: (datos.enlaces || []).filter((e: any) => e && e.etiqueta).map((e: any) => ({ etiqueta: String(e.etiqueta) })),
    tienda: !!(datos.mostrarCarrito && ctx.tiendaActiva),
    whatsapp: whatsappDelMenu(ctx.bloques),
  };
  const hayAlgo = contenido.categorias.length > 0 || contenido.enlaces.length > 0 || contenido.tienda || !!contenido.whatsapp;
  return hayAlgo ? contenido : null;
}
