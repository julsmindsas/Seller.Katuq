import { esTipoNuevoSitio } from "./paneles/tipos-nuevos";

/**
 * P0-19: las anclas que existen en el inicio publicado, con la misma regla que el servidor (`anclasDelInicio` en
 * `functions/utils/siteHtml.js`). Una sola copia para el editor y para los paneles del diseño nuevo (PLAN-V2 T06), así
 * el aviso «Esa sección no existe» dice lo mismo en todos lados:
 *  - cada bloque visible lleva `seccion-N` por su posición; en el diseño nuevo, su ancla propia (`estilo.ancla`) la
 *    reemplaza, salvo en los bloques de id fijo y en las vitrinas;
 *  - los bloques de id fijo suman ese id (catálogo, contacto, categorías…);
 *  - una vitrina suma `productos` (la primera) o `productos-N` solo si tiene productos que se publican (P0-13);
 *  - un tipo nuevo de los módulos solo existe con el diseño nuevo.
 */

/** Ids fijos por tipo de bloque (`ID_FIJO_DE_BLOQUE`, `functions/utils/siteBlocks.js`). */
export const ID_FIJO_DE_BLOQUE: { readonly [tipo: string]: string } = Object.freeze({
  categorias: "categorias",
  destacado: "destacado",
  sucursales: "sucursales",
  agenda: "agenda",
  formulario: "contacto",
  catalogo: "catalogo",
  explorar: "catalogo",
  ficha: "producto",
  gracias: "gracias",
});

const ANCLAS_RESERVADAS = new Set<string>([...Object.values(ID_FIJO_DE_BLOQUE), "productos", "opiniones", "top"]);

/** El ancla propia de una sección si sirve (`anclaValida` del servidor); vacío si no. */
export function anclaValida(valor: unknown): string {
  const a = typeof valor === "string" ? valor.trim() : "";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(a)) return "";
  if (/^(?:seccion|productos)-\d+$/.test(a) || /^(?:kq|lead-)/.test(a) || ANCLAS_RESERVADAS.has(a)) return "";
  return a;
}

export interface OpcionesAnclas {
  /** ¿El sitio usa el diseño nuevo (`tema.sistemaVisual === 2`)? */
  disenoNuevo: boolean;
  /**
   * ¿Esta vitrina se publica? Por defecto, si tiene productos elegidos. El editor afina con los productos que ya cargó
   * (una vitrina con todos agotados no se publica).
   */
  vitrinaSePublica?: (bloque: any) => boolean;
}

/** Las anclas del inicio, como las pinta el servidor. */
export function anclasDelInicio(bloques: any[], opciones: OpcionesAnclas): Set<string> {
  const vitrina =
    opciones.vitrinaSePublica ||
    ((b: any) => {
      const d = (b && b.datos) || {};
      return ((d.productoIds || []).length || (d.productos || []).length) > 0;
    });
  const visibles = (bloques || []).filter((b) => b && b.visible !== false && (opciones.disenoNuevo || !esTipoNuevoSitio(b.tipo)));
  const primeraVitrina = visibles.findIndex((b) => b.tipo === "productos");
  const ids = new Set<string>();
  visibles.forEach((b, i) => {
    const propia =
      opciones.disenoNuevo && !ID_FIJO_DE_BLOQUE[b.tipo] && b.tipo !== "productos" ? anclaValida(b.estilo && b.estilo.ancla) : "";
    ids.add(propia || `seccion-${i}`);
    if (b.tipo === "productos") {
      if (vitrina(b)) ids.add(i === primeraVitrina ? "productos" : `productos-${i}`);
    } else if (ID_FIJO_DE_BLOQUE[b.tipo]) {
      ids.add(ID_FIJO_DE_BLOQUE[b.tipo]);
    }
  });
  return ids;
}

/** ¿Este destino es un ancla del inicio que no existe? «#top» siempre sirve; lo que no es ancla, no se revisa. */
export function anclaSinDestino(url: string, bloques: any[], opciones: OpcionesAnclas): boolean {
  const m = /^#(.+)$/.exec(String(url || "").trim());
  if (!m || m[1].toLowerCase() === "top") return false;
  return !anclasDelInicio(bloques, opciones).has(m[1]);
}
