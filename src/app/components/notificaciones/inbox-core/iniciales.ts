/**
 * Iniciales para el avatar de un contacto, de cualquier canal. Funciones puras: sin Angular.
 *
 * Toma la primera letra o cifra de cada palabra (máximo dos), recorriendo el texto por caracteres completos:
 * un emoji o una letra con tilde nunca quedan partidos (antes salía «�»). Quita «@» y los símbolos, así
 * «@mafe_92» da «M» y no «@». Sin nada que sirva devuelve '' para que la vista ponga el ícono de persona.
 */
const LETRA_O_CIFRA = new RegExp("[\\p{L}\\p{N}]", "u");

export function inicialesDe(nombre: string | null | undefined): string {
  const palabras = String(nombre || "")
    .replace(/@+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letras: string[] = [];
  for (const palabra of palabras) {
    const primera = Array.from(palabra).find((c) => LETRA_O_CIFRA.test(c));
    if (primera) letras.push(primera.toLocaleUpperCase());
    if (letras.length === 2) break;
  }
  return letras.join("");
}

/** Cantidad de tonos de avatar (las clases `--t0` a `--t5` de cada lista). */
export const TONOS_AVATAR = 6;

/**
 * Tono estable para el avatar de un contacto: la misma clave da siempre el mismo tono, así dos chats sin nombre
 * se distinguen también por el color. Es un hash corto del texto, no guarda nada.
 */
export function tonoDe(clave: string | null | undefined): number {
  const texto = String(clave || "");
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h) % TONOS_AVATAR;
}
