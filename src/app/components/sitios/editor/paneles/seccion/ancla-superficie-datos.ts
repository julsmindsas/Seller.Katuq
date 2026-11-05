import { ID_FIJO_DE_BLOQUE, anclaValida } from "../../anclas-inicio";

/**
 * Qué bloques pintan el ANCLA propia (`estilo.ancla`) y la SUPERFICIE (`estilo.superficie`) de «Estilo de esta
 * sección». Sale de leer el servidor (`siteBlocks.normalizarEstilo` las guarda en todo bloque; `siteHtml.renderSitio`
 * y `siteEstilosV2.marcasDeBloqueV2` las pintan sobre la raíz `<section|header|footer|aside>` de cada bloque) y de
 * pintar un bloque de cada tipo con las dos puestas (informe «editor-arreglos»):
 *  - el ancla reemplaza el `id="seccion-N"` de la raíz: la pintan todos los tipos con raíz de sección salvo los de id
 *    fijo (catálogo, categorías, destacado, sucursales, agenda, formulario: el servidor ni la guarda) y el popup (no es
 *    una sección, es un diálogo);
 *  - la superficie pinta `data-superficie` en esa misma raíz, y la hoja del diseño nuevo da el fondo y el texto de
 *    «alterna» y «estructura» a cualquier elemento que la lleve.
 * No se ofrece donde otro control ya la gobierna (el plano y el formulario traen la suya en su panel) ni donde la
 * superficie no se vería: la portada pinta su foto y su velo encima, y las barras (anuncio, encabezado, pie) toman el
 * color de estructura del tema.
 */
const SIN_ANCLA = new Set<string>(["popup", "plano", "separador", "anuncio", "encabezado"]);
const SIN_SUPERFICIE = new Set<string>(["popup", "plano", "formulario", "hero", "separador", "anuncio", "encabezado", "footer"]);

/** El bloque lleva un `<section>` de verdad: una burbuja de WhatsApp flotante no es una sección. */
function esFlotante(b: any): boolean {
  return !!b && b.tipo === "whatsapp" && !!b.datos && b.datos.flotante === true;
}

/** ¿Este bloque pinta un ancla propia? */
export function puedeTenerAncla(b: any): boolean {
  return !!b && !SIN_ANCLA.has(b.tipo) && !ID_FIJO_DE_BLOQUE[b.tipo] && !esFlotante(b);
}

/** ¿Este bloque pinta una superficie propia (Claro / Alterno / Oscuro)? */
export function puedeTenerSuperficie(b: any): boolean {
  return !!b && !SIN_SUPERFICIE.has(b.tipo) && !esFlotante(b);
}

/** Si el bloque ya trae un id fijo (`#contacto`), el que se usa para enlazarlo; vacío si no. */
export function anclaFijaDe(b: any): string {
  return (b && ID_FIJO_DE_BLOQUE[b.tipo]) || "";
}

/** Nombres cortos que sugiere el panel para el ancla de cada tipo, si el título no da uno. */
const SUGERIDAS: { [tipo: string]: string } = {
  faq: "preguntas",
  productos: "destacados",
  promo: "destacado-imagen",
  resenas: "opiniones-clientes",
  ubicacion: "donde-estamos",
  suscripcion: "boletin",
  contador: "oferta",
  columnas: "columnas",
  galeria: "galeria",
  video: "video",
  instagram: "instagram",
  marcas: "marcas",
  texto: "sobre-nosotros",
  seccion: "seccion",
  hero: "inicio",
  banner: "banners",
  imagen: "imagen",
  botones: "botones",
  buscador: "buscar",
  whatsapp: "escribenos",
  footer: "pie",
};

/** «Preguntas frecuentes» → «preguntas-frecuentes»: minúsculas, sin tildes, guiones, hasta 40 caracteres. */
export function anclaDeTexto(texto: string): string {
  const base = String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return anclaValida(base);
}

/** Candidatas para el ancla de una sección: del título que ya tiene o de su tipo; la primera libre se ofrece. */
export function candidatasDeAncla(b: any): string[] {
  const d = (b && b.datos) || {};
  const lista = [anclaDeTexto(d.titulo), anclaDeTexto(d.etiqueta), anclaValida(SUGERIDAS[b && b.tipo] || "")];
  return lista.filter((a, i) => !!a && lista.indexOf(a) === i);
}
