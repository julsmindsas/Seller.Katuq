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

/** Una pestaña que la página pinta: con nombre y con productos. */
export function pestanaLista(p: PestanaVitrina | null | undefined): boolean {
  return !!p && !!String(p.etiqueta || "").trim() && !tieneMarcador(p.etiqueta) && (p.productoIds || []).length > 0;
}

/** Cuántas tarjetas se ven en computador: sin fila huérfana (con más de 4, un múltiplo de 4). */
export function seVenEnComputador(n: number, columnas = TOPES_VITRINA.columnas): number {
  return n > columnas && n % columnas ? n - (n % columnas) : n;
}

/**
 * Lo que el panel avisa de la cabecera de la sección: los textos que afirman ventas no se publican así (el título se
 * lee «Destacados») y los que traen un marcador no salen.
 */
export function avisosDeCabecera(datos: any): string[] {
  const d = datos || {};
  const avisos: string[] = [];
  const titulo = [d.titulo, d.tituloSuave].filter(Boolean).join(" ");
  if (afirmaVentas(titulo)) {
    avisos.push(`«${titulo}» dice que son los que más se venden, y todavía no hay ventas reales que lo respalden: la sección se publica como «${SIN_FUENTE_DE_VENTAS}».`);
  } else if (!String(d.titulo || "").trim()) {
    avisos.push(`Sin título, la sección se publica como «${SIN_FUENTE_DE_VENTAS}».`);
  }
  if (afirmaVentas(d.etiqueta)) avisos.push(`El antetítulo «${d.etiqueta}» también dice que son los más vendidos: se lee «${SIN_FUENTE_DE_VENTAS}» (o no sale, si el título ya lo dice).`);
  if (afirmaVentas(d.subtitulo)) avisos.push(`La línea de apoyo «${d.subtitulo}» no sale: habla de lo que más se vende.`);
  for (const [campo, texto] of [["título", d.titulo], ["antetítulo", d.etiqueta], ["apoyo", d.subtitulo]]) {
    if (tieneMarcador(texto)) avisos.push(`El ${campo} tiene algo por llenar entre corchetes: no sale así.`);
  }
  return avisos;
}
