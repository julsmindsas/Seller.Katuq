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
