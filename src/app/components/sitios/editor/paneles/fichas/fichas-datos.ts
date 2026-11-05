/**
 * Datos de Tienda › Fichas de producto (PLAN-V2 T08) en el editor: los mismos topes y reglas del módulo del servidor
 * (`functions/utils/sitioModulos/ficha.js`). El servidor normaliza al guardar; aquí solo se ayuda y se avisa.
 */

export interface AsesorTienda {
  id: string;
  nombre?: string;
  especialidad?: string;
  foto?: string;
  /** Autorizó publicar su nombre y su foto. Sin esto la página dice «Un técnico de {negocio}». */
  autorizado?: boolean;
}

export interface PreguntaFicha {
  pregunta?: string;
  respuesta?: string;
  /** Id de un asesor de `tienda.asesores`. */
  asesor?: string;
  /** AAAA-MM-DD. */
  fecha?: string;
}

export interface FichaProducto {
  productoId: string;
  ideal?: string;
  datos?: string[];
  pasos?: string[];
  preguntas?: PreguntaFicha[];
}

export const TOPES_FICHAS = Object.freeze({
  fichas: 200,
  conDetalle: 40,
  asesores: 6,
  datos: 3,
  pasos: 5,
  preguntas: 5,
  ideal: 90,
  dato: 20,
  paso: 120,
  pregunta: 200,
  respuesta: 600,
  nombre: 60,
  especialidad: 60,
});

/** ¿La ficha lleva pasos o preguntas? (cuenta para el tope de 40, igual que el servidor). */
export function tieneDetalle(f: FichaProducto | null | undefined): boolean {
  if (!f) return false;
  const pasos = (f.pasos || []).some((x) => !!String(x || "").trim());
  const preguntas = (f.preguntas || []).some((q) => !!q && (!!String(q.pregunta || "").trim() || !!String(q.respuesta || "").trim()));
  return pasos || preguntas;
}

const sinTildes = (v: string) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Un id corto y estable para un asesor nuevo, a partir de su nombre (el servidor exige `a-z0-9-`, hasta 24). */
export function idDeAsesor(nombre: string, usados: string[]): string {
  const base =
    sinTildes(nombre)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/g, "") || "asesor";
  let id = base;
  for (let k = 2; usados.includes(id); k++) id = `${base}-${k}`.slice(0, 24);
  return id;
}

/** Hoy en Colombia, AAAA-MM-DD. */
export function hoyColombia(): string {
  const ahora = new Date(Date.now() - 5 * 3600 * 1000);
  return ahora.toISOString().slice(0, 10);
}

/**
 * Frases que prometen condiciones de venta. Es la MISMA lista del servidor (`functions/utils/siteListoParaVender.js`,
 * PROMESAS y MARCADOR): si cambia allá, se cambia aquí. Una frase así no se publica en la ficha hasta que el comercio
 * confirme que la cumple (`tienda.promesasConfirmadas`).
 */
const PROMESAS: RegExp[] = [
  /env[ií]os?\s+(gratis|sin costo|a todo el pa[ií]s|nacional(es)?|a toda colombia)/i,
  /a todo el pa[ií]s|a toda colombia|cobertura nacional/i,
  /entrega(s|mos)?\s+(el\s+)?(mismo d[ií]a|hoy|inmediata|en\s+\d+\s*(h|horas?|d[ií]as?))/i,
  /llega(n)?\s+(hoy|ma[ñn]ana|el mismo d[ií]a|en\s+\d+)/i,
  /antes de las\s+\d{1,2}(\s*(:\d{2})?\s*(am|pm|a\.?\s?m\.?|p\.?\s?m\.?))?/i,
  /\bgarant[ií]as?\b|garantizad[oa]s?/i,
  /devoluci[oó]n(es)?\s+(gratis|sin costo)|devolvemos (tu|su) dinero|lo cambiamos|cambios (gratis|sin costo|sin drama)/i,
  /\d{1,2}\s*%\s*(de\s+)?(descuento|dcto|off)/i,
];
const MARCADOR = /\[confirma[^\]]*\]/i;

export function esPromesa(texto: string): boolean {
  const t = String(texto || "");
  return MARCADOR.test(t) || PROMESAS.some((re) => re.test(t));
}

export function clavePromesa(texto: string): string {
  return sinTildes(texto).replace(/\s+/g, " ").slice(0, 200);
}

/** ¿La frase promete algo y el comercio todavía no lo confirmó? Entonces no se publica. */
export function promesaSinConfirmar(texto: string, confirmadas: string[] | null | undefined): boolean {
  if (!String(texto || "").trim() || !esPromesa(texto)) return false;
  const claves = (confirmadas || []).map(clavePromesa);
  return !claves.includes(clavePromesa(texto));
}

/**
 * Misma normalización de la imagen que el selector de productos y el backend: hay productos sincronizados de Osmosis
 * que guardan la ruta relativa, no la URL completa.
 */
export function primeraImagen(crear: any): string | null {
  const candidatas = [...((crear && crear.imagenesPrincipales) || []), ...((crear && crear.imagenesSecundarias) || [])];
  for (const img of candidatas) {
    const ruta = typeof img === "string" ? img : img && img.urls;
    if (!ruta || typeof ruta !== "string") continue;
    const limpia = ruta.trim();
    if (!limpia) continue;
    if (/^https?:\/\//i.test(limpia) || limpia.startsWith("data:") || limpia.startsWith("//")) return limpia;
    return `https://images2.guiacereza.com${limpia.startsWith("/") ? "" : "/"}${limpia}`;
  }
  return null;
}
