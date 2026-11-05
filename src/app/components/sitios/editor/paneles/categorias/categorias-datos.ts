import { contraste, esOscuro, mezclar } from "../../../contraste";

/**
 * Datos de Tienda › Nombres de categorías (tanda N2) en el editor: las mismas reglas del módulo `bandas` del servidor
 * (`functions/utils/sitioModulos/bandas.js`). El servidor normaliza al guardar; aquí solo se ayuda y se avisa.
 */

/** Una entrada de `tienda.categoriasInfo` (DISENO §3.0). El panel edita `etiqueta` y conserva lo demás. */
export interface InfoCategoria {
  /** El nombre de la categoría en el maestro, tal como lo entrega el catálogo (sin tildes y en minúscula). */
  categoria: string;
  /** El nombre curado que se publica (≤40). */
  etiqueta?: string;
  icono?: string;
  /**
   * La foto de la categoría: la «foto genérica» de sus productos sin foto y, además, la de su baldosa en «Compra por
   * categoría». Una URL subida por el editor a la carpeta de sitios.
   */
  imagen?: string;
  imagen2?: string;
  descripcion?: string;
  chips?: string[];
}

/** Topes del servidor (`bandas.js`): 120 categorías con nombre (cierre de N2) y 40 caracteres por nombre. */
export const TOPES_CATEGORIAS = Object.freeze({ entradas: 120, etiqueta: 40 });

/** La clave con que se compara una categoría: sin tildes, en minúscula y sin espacios de más (igual que el servidor). */
export function claveCategoria(nombre: string | null | undefined): string {
  return String(nombre == null ? "" : nombre)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ¿El nombre va todo en MAYÚSCULAS? No avisa por una sigla sola de hasta 4 letras («ONT», «NVR», «WIFI»): esas se
 * escriben así. Sí avisa por una palabra larga («SWITCH») o por varias («CAMARAS PAN/TILT»).
 */
export function vaEnMayusculas(texto: string | null | undefined): boolean {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  if (!t || t !== t.toLocaleUpperCase("es-CO") || t === t.toLocaleLowerCase("es-CO")) return false;
  const palabras = t.split(" ").filter((p) => /\p{L}/u.test(p));
  return palabras.length > 1 || palabras.some((p) => p.replace(/[^\p{L}]/gu, "").length > 4);
}

/**
 * Cómo sale hoy el nombre del maestro con el diseño nuevo: con mayúscula inicial (y en minúscula si venía todo en
 * MAYÚSCULAS). Es la misma regla de `nombreDelMaestro` en el servidor; las tildes no se inventan.
 */
export function nombreDelMaestro(nombre: string | null | undefined): string {
  let t = String(nombre == null ? "" : nombre).replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/\p{L}/u.test(t) && t === t.toLocaleUpperCase("es-CO")) t = t.toLocaleLowerCase("es-CO");
  return t.charAt(0).toLocaleUpperCase("es-CO") + t.slice(1);
}

/** Palabras cortas del español que nunca son siglas: en un nombre en MAYÚSCULAS se pasan a minúscula. */
const PALABRAS_CORTAS = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "lo", "los", "o", "u", "y", "e", "con", "sin", "por", "su", "sus", "mi", "tu", "un", "una"]);

/**
 * Pasa un nombre en MAYÚSCULAS a mayúscula inicial («CÁMARAS PAN/TILT» → «Cámaras pan/tilt») sin bajar las siglas: se
 * conservan las palabras con dígitos («L3», «RJ45», «4G») y las de hasta 3 letras que no son palabras del español («USB»,
 * «ONT», «NVR»). Así «SWITCH ADMINISTRABLE L3» queda «Switch administrable L3» y «ADAPTADOR USB A RJ45», «Adaptador USB a
 * RJ45». No inventa tildes.
 */
export function mayusculaInicial(texto: string | null | undefined): string {
  const palabras = String(texto || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!palabras.length) return "";
  const salida = palabras.map((p, k) => {
    const letras = p.replace(/[^\p{L}]/gu, "");
    const esSigla = /\d/.test(p) || (letras.length >= 2 && letras.length <= 3 && !PALABRAS_CORTAS.has(letras.toLocaleLowerCase("es-CO")));
    if (esSigla && p === p.toLocaleUpperCase("es-CO")) return p;
    const baja = p.toLocaleLowerCase("es-CO");
    return k === 0 ? baja.charAt(0).toLocaleUpperCase("es-CO") + baja.slice(1) : baja;
  });
  return salida.join(" ");
}

/** Un marcador de algo por llenar («[NOMBRE]»): la página no lo publica. */
export function tieneMarcador(texto: string | null | undefined): boolean {
  return /\[[^\]]{2,}\]/.test(String(texto || ""));
}

/** ¿La entrada cura algo, además de nombrar su categoría? Las vacías no se guardan (el servidor tampoco las guarda). */
export function curaAlgo(c: InfoCategoria | null | undefined): boolean {
  if (!c) return false;
  return (
    !!String(c.etiqueta || "").trim() ||
    !!c.icono ||
    !!c.imagen ||
    !!c.imagen2 ||
    !!String(c.descripcion || "").trim() ||
    (Array.isArray(c.chips) && c.chips.some((x) => !!String(x || "").trim()))
  );
}

// ── Foto genérica (productos sin foto) ────────────────────────────────────────────────────────────────────────────

/** El ícono por defecto de la placa de un producto sin foto: una caja (el mismo de `functions/utils/siteFotoGenerica.js`). */
export const TRAZO_PLACA_DEFECTO = "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9";

/** Los colores con que la página dibuja la placa de un producto sin foto, calculados con los colores de la página. */
export interface ColoresPlaca {
  pagina: string;
  fondo: string;
  disco: string;
  icono: string;
  marca: string;
  borde: string;
  texto: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * La misma cuenta del servidor (`tokensDeSuperficie`): el fondo de la placa es la superficie 2 de la página, el disco es el
 * acento al 12 % (14 % en oscuro), el ícono es el acento si se lee sobre la página y, si no, la tinta, y la marca va en el
 * texto 3. Sirve para dibujar «cómo queda» con los colores reales del tema; la página manda.
 */
export function coloresDePlaca(tema: any): ColoresPlaca {
  const color = (v: any, defecto: string) => (HEX.test(String(v || "").trim()) ? String(v).trim() : defecto);
  const pagina = color(tema && tema.colorSecundario, "#ffffff");
  const texto = color(tema && tema.colorTexto, "#222222");
  const primario = color(tema && tema.colorPrimario, "#111111");
  const oscuro = esOscuro(pagina);
  const fondo = mezclar(texto, pagina, oscuro ? 0.085 : 0.04) || "#f4f4f5";
  return {
    pagina,
    texto,
    fondo,
    disco: mezclar(primario, fondo, oscuro ? 0.14 : 0.12) || fondo,
    icono: (contraste(primario, pagina) || 0) >= 4.5 ? primario : texto,
    marca: mezclar(texto, pagina, 0.62) || texto,
    borde: mezclar(texto, pagina, 0.1) || "#e4e4e7",
  };
}
