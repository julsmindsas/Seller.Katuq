import { esTipoNuevoSitio } from "./paneles/tipos-nuevos";

/**
 * P0-19: las anclas que existen en el inicio publicado, con la misma regla que el servidor (`anclasDelInicio` en
 * `functions/utils/siteHtml.js`). Una sola copia para el editor y para los paneles del diseño nuevo (PLAN-V2 T06), así
 * el aviso «Esa sección no existe» dice lo mismo en todos lados:
 *  - cada bloque visible lleva `seccion-N` por su posición; en el diseño nuevo, su ancla propia (`estilo.ancla`) la
 *    reemplaza, salvo en los bloques de id fijo y en las vitrinas;
 *  - los bloques de id fijo suman ese id (catálogo, contacto, categorías…);
 *  - una vitrina suma `productos` (la primera) o `productos-N` solo si tiene productos que se publican (P0-13); en el
 *    diseño nuevo, si tiene ancla propia, esa en vez de su id fijo (tanda N1, como `renderSitio`), y la primera sigue
 *    respondiendo también a `productos`, que pasa a su cabecera (cierre de N1);
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
    const propia = opciones.disenoNuevo && !ID_FIJO_DE_BLOQUE[b.tipo] ? anclaValida(b.estilo && b.estilo.ancla) : "";
    ids.add(b.tipo === "productos" ? `seccion-${i}` : propia || `seccion-${i}`);
    if (b.tipo === "productos") {
      if (vitrina(b)) {
        ids.add(propia || (i === primeraVitrina ? "productos" : `productos-${i}`));
        // Cierre de N1: con ancla propia, la primera vitrina sigue respondiendo a «#productos» (en su cabecera).
        if (propia && i === primeraVitrina) ids.add("productos");
      }
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

/**
 * Las páginas propias del sitio como las responde el servidor: una ruta de un solo tramo (`/empresas`) es una página
 * que el comercio creó o un 404 («Esta página no existe o se retiró»). `/`, `/gracias`, `/pagar`, `/baja`, `/p/…`,
 * `/c/…`, `/marca/…`, `/l/…` y `/r/…` las atiende el sitio por su cuenta; lo de varios tramos no se revisa aquí.
 */
const RUTAS_DEL_SITIO = new Set(["p", "c", "marca", "l", "r", "gracias", "pagar", "baja"]);

/**
 * ¿Este destino es una página interna de un solo tramo (`/empresas`, `/evora`) que el sitio no tiene? El servidor la
 * publica igual y quien la toca llega a un 404, así que el editor lo avisa. Lo que no es una ruta así (`#ancla`,
 * `https://…`, `/?catalogo=1`, `/c/mesh`, `/p/…`) no se revisa.
 */
export function paginaInternaQueNoExiste(url: string, paginas: ReadonlyArray<{ ruta?: string } | null> | null | undefined): boolean {
  const crudo = String(url || "").trim();
  if (!crudo.startsWith("/") || crudo.startsWith("//")) return false;
  const ruta = crudo.split(/[?#]/)[0];
  const m = /^\/([A-Za-z0-9-]{1,60})\/?$/.exec(ruta);
  if (!m) return false;
  const tramo = m[1].toLowerCase();
  if (RUTAS_DEL_SITIO.has(tramo)) return false;
  return !(paginas || []).some((p) => !!p && String(p.ruta || "").toLowerCase() === tramo);
}

/** Un destino que el menú, la barra o un botón puede ofrecer: el valor que se escribe y cómo se llama la sección. */
export interface DestinoDeInicio {
  valor: string;
  texto: string;
}

/**
 * Los destinos con nombre del inicio, para el `<datalist>` de todos los campos «A dónde lleva»: las anclas propias de
 * las secciones (`#kits`) y los ids fijos (`#catalogo`, `#contacto`…). No ofrece `#seccion-N`: ese número cambia al mover
 * u ocultar una sección y es justo lo que el ancla con nombre viene a evitar.
 */
export function destinosDelInicio(bloques: any[], opciones: OpcionesAnclas & { nombreDe: (bloque: any) => string }): DestinoDeInicio[] {
  const visibles = (bloques || []).filter((b) => b && b.visible !== false && (opciones.disenoNuevo || !esTipoNuevoSitio(b.tipo)));
  const salida: DestinoDeInicio[] = [];
  const vistos = new Set<string>();
  const poner = (valor: string, texto: string) => {
    if (vistos.has(valor)) return;
    vistos.add(valor);
    salida.push({ valor, texto });
  };
  for (const b of visibles) {
    const fijo = ID_FIJO_DE_BLOQUE[b.tipo];
    const propia = opciones.disenoNuevo && !fijo ? anclaValida(b.estilo && b.estilo.ancla) : "";
    const titulo = String((b.datos && (b.datos.titulo || b.datos.etiqueta)) || "").trim().slice(0, 40);
    const nombre = `${opciones.nombreDe(b)}${titulo ? ` · ${titulo}` : ""}`;
    if (propia) poner(`#${propia}`, nombre);
    else if (fijo) poner(`#${fijo}`, nombre);
  }
  return salida;
}

