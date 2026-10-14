/**
 * Contraste entre dos colores según WCAG 2.1 (ticket 1216). El texto normal
 * necesita al menos 4,5:1 sobre su fondo (nivel AA) para leerse bien.
 */

export const CONTRASTE_MINIMO = 4.5;

function luminancia(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const canal = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Razón de contraste (1 a 21), o null si algún color no es un hex válido. */
export function contraste(a: string, b: string): number | null {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return null;
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Aviso para el comercio si el texto no se lee sobre el fondo, o "". */
export function avisoContraste(texto: string, fondo: string): string {
  const r = contraste(texto, fondo);
  if (r === null || r >= CONTRASTE_MINIMO) return "";
  const valor = r.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return `El texto casi no se lee sobre el fondo (contraste ${valor} a 1; lo mínimo es 4,5 a 1). Elige un texto más oscuro o un fondo más claro.`;
}

/** ¿Dos ternas de colores son la misma (sin importar mayúsculas)? */
export function mismosColores(
  a: { colorPrimario?: string; colorSecundario?: string; colorTexto?: string } | null | undefined,
  b: { colorPrimario?: string; colorSecundario?: string; colorTexto?: string } | null | undefined
): boolean {
  if (!a || !b) return false;
  const n = (v?: string) => String(v || "").trim().toLowerCase();
  return n(a.colorPrimario) === n(b.colorPrimario) && n(a.colorSecundario) === n(b.colorSecundario) && n(a.colorTexto) === n(b.colorTexto);
}

/** Una combinación sirve si tiene los tres colores y no son todos iguales (tres negros = texto invisible). */
export function combinacionUsable(c: { colorPrimario?: string; colorSecundario?: string; colorTexto?: string } | null | undefined): boolean {
  if (!c) return false;
  const v = [c.colorPrimario, c.colorSecundario, c.colorTexto].map((x) => String(x || "").trim().toLowerCase());
  if (v.some((x) => !/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(x))) return false;
  return !(v[0] === v[1] && v[1] === v[2]);
}
