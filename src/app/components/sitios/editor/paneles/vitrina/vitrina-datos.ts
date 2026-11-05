/**
 * Reglas de la vitrina con pestañas del diseño nuevo (PLAN-V2 T15), las mismas del servidor
 * (`functions/utils/sitioModulos/vitrina.js`): el panel avisa lo mismo que la página hace.
 */

/** Una pestaña como la guarda el servidor. */
export interface PestanaVitrina {
  etiqueta: string;
  productoIds: string[];
}

export const TOPES_VITRINA = Object.freeze({ pestanas: 3, porPestana: 8, etiqueta: 30, columnas: 4 });

/** El nombre que toma la sección mientras no haya una fuente real de ventas. */
export const SIN_FUENTE_DE_VENTAS = "Destacados";

/** Un marcador de algo por llenar («[POR CONFIRMAR]»): nunca se publica. */
const MARCADOR = /\[[^\]]{2,}\]/;

/** Frases que afirman un orden por ventas o popularidad (sin tildes y en minúsculas, como el servidor). */
const AFIRMA_VENTAS = [
  /\bmas (elegid|vendid|pedid|comprad|popular|buscad|querid|preferid|desead|solicitad)/,
  /\blo que mas (se )?(lleva|compra|vende|pide|elige|prefiere)/,
  /\b(top|ranking)\b.{0,24}\b(venta|vendid)/,
  /\bbest ?-?sell/,
  /\bsuper ?ventas?\b/,
  /\bexitos? (de|en) ventas?\b/,
  /\b(favorit|preferid)[oa]s? de (nuestr[oa]s |l[oa]s )?(clientes|compradores|compradoras)\b/,
];

function sinTildes(texto: string): string {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿El texto afirma un orden por ventas o popularidad («Lo más elegido», «Más vendidos»…)? */
export function afirmaVentas(texto: string | null | undefined): boolean {
  const t = sinTildes(texto || "");
  return !!t && AFIRMA_VENTAS.some((r) => r.test(t));
}

export function tieneMarcador(texto: string | null | undefined): boolean {
  return MARCADOR.test(String(texto || ""));
}

/** Los productos de una pestaña que siguen en la vitrina (`idsVitrina`); sin la lista, todos los de la pestaña. */
export function idsDePestana(p: PestanaVitrina | null | undefined, idsVitrina?: string[]): string[] {
  const ids = (p && Array.isArray(p.productoIds) ? p.productoIds : []).filter((id) => typeof id === "string" && id);
  if (!idsVitrina) return ids;
  const enVitrina = new Set(idsVitrina);
  return ids.filter((id) => enVitrina.has(id));
}

/** ¿El nombre de la pestaña se publica? Sin marcadores y sin afirmar ventas (si no, la pestaña no sale). */
export function nombrePublicable(etiqueta: string | null | undefined): boolean {
  const e = String(etiqueta || "").trim();
  return !!e && !tieneMarcador(e) && !afirmaVentas(e);
}

/**
 * Una pestaña que la página pinta: con un nombre que se publica y con productos de la vitrina (la regla del servidor,
 * `pestanasPublicables`; allá además salen los agotados, que el panel no conoce).
 */
export function pestanaLista(p: PestanaVitrina | null | undefined, idsVitrina?: string[]): boolean {
  return !!p && nombrePublicable(p.etiqueta) && idsDePestana(p, idsVitrina).length > 0;
}

/** Las pestañas que la página pinta de una vitrina (sus `datos`). */
export function pestanasListas(datos: any): PestanaVitrina[] {
  const d = datos || {};
  const ids = Array.isArray(d.productoIds) ? d.productoIds : [];
  return (Array.isArray(d.pestanas) ? d.pestanas : []).filter((p: PestanaVitrina) => pestanaLista(p, ids));
}

/**
 * Cuántas tarjetas se ven en una rejilla de `columnas` sin dejar la última fila a medias: con más productos que
 * columnas, el múltiplo que cabe. En computador son las columnas del tema (4 por defecto) y en tableta, 2. En el celular
 * se ven todas (se deslizan).
 */
export function seVenEnComputador(n: number, columnas: number = TOPES_VITRINA.columnas): number {
  return n > columnas && n % columnas ? n - (n % columnas) : n;
}

/** Las columnas de computador del tema: «Columnas en computador» (2 a 5) o 4. */
export function columnasDelTema(tema: any): number {
  const c = Number((tema || {}).columnasEscritorio);
  return Number.isInteger(c) && c >= 2 && c <= 5 ? c : TOPES_VITRINA.columnas;
}

/**
 * Lo que el panel avisa de la cabecera de la sección, siempre con el diseño nuevo. Con pestañas (`conPestanas`), lo que
 * la página hace: los textos que afirman ventas no se publican así (el título se lee «Destacados») y los que traen un
 * marcador no salen. Sin pestañas la vitrina sale como siempre, con el texto tal cual: el aviso pide cambiarlo, porque
 * todavía no hay ventas reales que respalden «Lo más elegido».
 */
export function avisosDeCabecera(datos: any, conPestanas = true): string[] {
  const d = datos || {};
  const avisos: string[] = [];
  const titulo = [d.titulo, d.tituloSuave].filter(Boolean).join(" ");
  const cambiar = `Cámbialo por «${SIN_FUENTE_DE_VENTAS}» u otro nombre que no hable de ventas.`;
  if (afirmaVentas(titulo)) {
    avisos.push(
      conPestanas
        ? `«${titulo}» dice que son los que más se venden, y todavía no hay ventas reales que lo respalden: la sección se publica como «${SIN_FUENTE_DE_VENTAS}».`
        : `«${titulo}» dice que son los que más se venden, y todavía no hay ventas reales que lo respalden. ${cambiar}`
    );
  }
  if (afirmaVentas(d.etiqueta)) {
    avisos.push(
      conPestanas
        ? `El antetítulo «${d.etiqueta}» también dice que son los más vendidos: se lee «${SIN_FUENTE_DE_VENTAS}» (o no sale, si el título ya lo dice).`
        : `El antetítulo «${d.etiqueta}» dice que son los más vendidos. ${cambiar}`
    );
  }
  if (afirmaVentas(d.subtitulo)) {
    avisos.push(
      conPestanas
        ? `La línea de apoyo «${d.subtitulo}» no sale: habla de lo que más se vende.`
        : `La línea de apoyo «${d.subtitulo}» habla de lo que más se vende: cámbiala o quítala.`
    );
  }
  if (conPestanas) {
    for (const [campo, texto] of [["título", d.titulo], ["antetítulo", d.etiqueta], ["apoyo", d.subtitulo]]) {
      if (tieneMarcador(texto)) avisos.push(`El ${campo} tiene algo por llenar entre corchetes: no sale así.`);
    }
  }
  return avisos;
}
