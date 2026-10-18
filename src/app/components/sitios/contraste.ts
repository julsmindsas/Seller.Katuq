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

/**
 * Espejo de `primarioAccesible` (functions/utils/contrasteColor.js): el color de
 * un botón y el texto que va encima. Si el blanco no alcanza 4,5:1, oscurece
 * apenas el color; si haría falta mucho, lo conserva y el texto va oscuro.
 */
export function primarioAccesible(color: string): { fondo: string; texto: string } {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || "").trim());
  if (!m) return { fondo: color, texto: "#ffffff" };
  const original = `#${m[1].toLowerCase()}`;
  if ((contraste(original, "#ffffff") || 0) >= CONTRASTE_MINIMO) return { fondo: original, texto: "#ffffff" };
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (d) h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h /= 6;
  const aHex = (L: number) => {
    const canal = (t: number, p: number, q: number) => {
      let x = t;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    let rgb: number[];
    if (s === 0) rgb = [L, L, L];
    else {
      const q = L < 0.5 ? L * (1 + s) : L + s - L * s;
      const p = 2 * L - q;
      rgb = [canal(h + 1 / 3, p, q), canal(h, p, q), canal(h - 1 / 3, p, q)];
    }
    return "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0")).join("");
  };
  for (let paso = 0.005; paso <= 0.12 + 1e-9; paso += 0.005) {
    const candidato = aHex(Math.max(0, l - paso));
    if ((contraste(candidato, "#ffffff") || 0) >= CONTRASTE_MINIMO) return { fondo: candidato, texto: "#ffffff" };
  }
  return { fondo: original, texto: "#111111" };
}

/** Aviso para el comercio si el texto no se lee sobre el fondo, o "". */
export function avisoContraste(texto: string, fondo: string): string {
  const r = contraste(texto, fondo);
  if (r === null || r >= CONTRASTE_MINIMO) return "";
  const valor = r.toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return `El texto casi no se lee sobre el fondo (contraste ${valor} a 1; lo mínimo es 4,5 a 1). Elige un texto más oscuro o un fondo más claro.`;
}

/**
 * Ticket 1250: aviso si el texto blanco de los botones no se lee sobre el color
 * principal. No bloquea: la página publicada lo corrige sola (un tono apenas más
 * oscuro o el texto encima en oscuro), igual que `primarioAccesible` del servidor.
 */
export function avisoContrastePrincipal(primario: string): string {
  const r = contraste("#ffffff", primario);
  if (r === null || r >= CONTRASTE_MINIMO) return "";
  return "Tu color principal es claro para botones con texto blanco. En la página publicada lo ajustamos solos (un tono un poco más oscuro o el texto en oscuro) para que todos puedan leerlos.";
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
