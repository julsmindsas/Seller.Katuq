/**
 * Ticket 1227 (F2-17): ajustes de estilo del sitio.
 *
 * ⚠️ ESPEJO de `functions/utils/siteBlocks.js` (`fichasDeAjustes`,
 * `seccionesAlternas`) y de `functions/utils/siteHtml.js` (`medidasDeAjustes`,
 * `variablesDeAjustes`) en katuq_admin_back_firebase. La página publicada la
 * arma el servidor; esto hace que la vista previa del editor muestre lo mismo.
 * Al tocar aquí, tocar allá.
 */
import { contraste, primarioAccesible } from "../sitios/contraste";

export interface AjustesEstilo {
  colorFondoAlterno?: string;
  colorBoton?: string;
  colorEnlace?: string;
  colorOferta?: string;
  colorEtiqueta?: string;
  botonForma?: "" | "recto" | "redondeado" | "pastilla";
  botonRelleno?: "" | "contorno";
  botonTamano?: "" | "chico" | "grande";
  fotoProporcion?: "" | "1:1" | "4:5" | "3:4";
  fotoAjuste?: "" | "encajar";
  columnasEscritorio?: number;
  columnasCelular?: number;
  etiquetas?: { descuento?: boolean; agotado?: boolean; nuevo?: boolean };
  segundaFoto?: boolean;
  logoPosicion?: "" | "centro";
  logoTamano?: "" | "chico" | "grande";
  menuMayusculas?: "" | "si" | "no";
  anchoContenido?: "" | "estrecho" | "amplio";
  espaciado?: "" | "compacto" | "amplio";
  tamanoTexto?: "" | "chico" | "grande";
  escalaTitulos?: "" | "sobria" | "grande";
}

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown): string => (HEX.test(String(v || "")) ? String(v) : "");

/** Opciones válidas de cada ajuste (las mismas que acepta `normalizarTema`). */
export const OPCIONES_AJUSTES = {
  botonForma: ["recto", "redondeado", "pastilla"],
  botonRelleno: ["contorno"],
  botonTamano: ["chico", "grande"],
  fotoProporcion: ["1:1", "4:5", "3:4"],
  fotoAjuste: ["encajar"],
  logoPosicion: ["centro"],
  logoTamano: ["chico", "grande"],
  menuMayusculas: ["si", "no"],
  anchoContenido: ["estrecho", "amplio"],
  espaciado: ["compacto", "amplio"],
  tamanoTexto: ["chico", "grande"],
  escalaTitulos: ["sobria", "grande"],
} as const;

/** El tema guardado con todos los ajustes presentes (el panel enlaza contra ellos). */
export function ajustesDeEstiloCompletos(t: any): Required<AjustesEstilo> {
  const a = t || {};
  const de = (k: keyof typeof OPCIONES_AJUSTES) => ((OPCIONES_AJUSTES[k] as readonly string[]).includes(a[k]) ? a[k] : "");
  const cols = Math.floor(Number(a.columnasEscritorio));
  const colsMovil = Math.floor(Number(a.columnasCelular));
  const e = a.etiquetas || {};
  return {
    colorFondoAlterno: hex(a.colorFondoAlterno),
    colorBoton: hex(a.colorBoton),
    colorEnlace: hex(a.colorEnlace),
    colorOferta: hex(a.colorOferta),
    colorEtiqueta: hex(a.colorEtiqueta),
    botonForma: de("botonForma"),
    botonRelleno: de("botonRelleno"),
    botonTamano: de("botonTamano"),
    fotoProporcion: de("fotoProporcion"),
    fotoAjuste: de("fotoAjuste"),
    columnasEscritorio: cols >= 2 && cols <= 5 ? cols : 0,
    columnasCelular: colsMovil === 1 || colsMovil === 2 ? colsMovil : 0,
    etiquetas: { descuento: e.descuento !== false, agotado: e.agotado !== false, nuevo: e.nuevo !== false },
    segundaFoto: a.segundaFoto !== false,
    logoPosicion: de("logoPosicion"),
    logoTamano: de("logoTamano"),
    menuMayusculas: de("menuMayusculas"),
    anchoContenido: de("anchoContenido"),
    espaciado: de("espaciado"),
    tamanoTexto: de("tamanoTexto"),
    escalaTitulos: de("escalaTitulos"),
  } as Required<AjustesEstilo>;
}

/** Fichas para `data-kq-ajustes` («boton-pastilla foto-45 sin-nuevo»). */
export function fichasDeAjustes(t: AjustesEstilo & { colorPrimario?: string } | null | undefined): string {
  const a = t || {};
  const f: string[] = [];
  const valor = (v: string | undefined, prefijo: string, mapa?: (x: string) => string) => {
    if (v) f.push(`${prefijo}-${mapa ? mapa(v) : v}`);
  };
  valor(a.botonForma, "boton");
  valor(a.botonRelleno, "boton");
  valor(a.botonTamano, "boton");
  valor(a.fotoProporcion, "foto", (x) => x.replace(":", ""));
  valor(a.fotoAjuste, "foto");
  valor(a.logoPosicion, "logo");
  valor(a.logoTamano, "logo");
  valor(a.menuMayusculas, "menu-mayusculas");
  valor(a.anchoContenido, "ancho");
  valor(a.espaciado, "aire");
  valor(a.tamanoTexto, "texto");
  valor(a.escalaTitulos, "titulos");
  const cols = Number(a.columnasEscritorio);
  if (cols >= 2 && cols <= 5) f.push("cols");
  const colsMovil = Number(a.columnasCelular);
  if (colsMovil === 1 || colsMovil === 2) f.push("cols-movil");
  const e = a.etiquetas || {};
  if (e.descuento === false) f.push("sin-descuento");
  if (e.agotado === false) f.push("sin-agotado");
  if (e.nuevo === false) f.push("sin-nuevo");
  if (a.segundaFoto === false) f.push("sin-foto2");
  if (hex(a.colorFondoAlterno)) f.push("alterno");
  if (hex(a.colorBoton)) f.push("color-boton");
  if (hex(a.colorEnlace)) f.push("color-enlace");
  if (hex(a.colorOferta)) f.push("color-oferta");
  if (hex(a.colorEtiqueta)) f.push("color-etiqueta");
  return f.join(" ");
}

const ALTERNABLES = new Set([
  "texto", "columnas", "botones", "galeria", "productos", "categorias", "destacado", "contador",
  "suscripcion", "instagram", "marcas", "sucursales", "agenda", "formulario", "faq", "resenas", "ubicacion",
]);

/** Índices de las secciones que llevan el fondo alterno (una sí, una no). */
export function seccionesAlternas(bloques: { tipo: string; estilo?: any }[], t: AjustesEstilo | null | undefined): Set<number> {
  const salida = new Set<number>();
  if (!hex((t || {}).colorFondoAlterno)) return salida;
  let n = 0;
  (bloques || []).forEach((b, i) => {
    const e = (b && b.estilo) || {};
    if (!b || !ALTERNABLES.has(b.tipo) || e.fondo || e.fondoImagen) return;
    if (n++ % 2 === 1) salida.add(i);
  });
  return salida;
}

const FACTOR_AIRE: { [k: string]: number } = { compacto: 0.65, amplio: 1.35 };
const FACTOR_TITULOS: { [k: string]: number } = { sobria: 0.85, grande: 1.2 };
const ANCHO_LECTURA: { [k: string]: string } = { estrecho: "820px", amplio: "1240px" };

/** Multiplica espaciado y escala de títulos del estilo de página; fija el ancho de lectura. */
export function medidasDeAjustes(vars: { [k: string]: string }, t: AjustesEstilo | null | undefined): { [k: string]: string } {
  const a = t || {};
  const por = (valor: string, factor?: number) => {
    const m = /^([\d.]+)(rem|px)?$/.exec(String(valor));
    return m && factor ? `${Math.round(Number(m[1]) * factor * 1000) / 1000}${m[2] || ""}` : valor;
  };
  const salida = { ...vars };
  const aire = FACTOR_AIRE[a.espaciado || ""];
  if (aire) {
    salida["--sitio-aire"] = por(vars["--sitio-aire"], aire);
    salida["--sitio-aire-ancho"] = por(vars["--sitio-aire-ancho"], aire);
  }
  const titulos = FACTOR_TITULOS[a.escalaTitulos || ""];
  if (titulos) salida["--sitio-titulo-escala"] = por(vars["--sitio-titulo-escala"], titulos);
  if (ANCHO_LECTURA[a.anchoContenido || ""]) salida["--sitio-ancho"] = ANCHO_LECTURA[a.anchoContenido || ""];
  return salida;
}

/** Colores extra siempre legibles y columnas, como variables CSS. */
export function variablesDeAjustes(
  t: (AjustesEstilo & { colorPrimario?: string; colorSecundario?: string; colorTexto?: string }) | null | undefined
): { [k: string]: string } {
  const a = t || {};
  const fondo = hex(a.colorSecundario) || "#ffffff";
  const texto = hex(a.colorTexto) || "#222222";
  const legible = (c: string) => ((contraste(c, fondo) || 0) >= 4.5 ? c : texto);
  const vars: { [k: string]: string } = {};
  const alterno = hex(a.colorFondoAlterno);
  if (alterno) {
    vars["--sitio-fondo-alterno"] = alterno;
    vars["--sitio-texto-alterno"] =
      (contraste(texto, alterno) || 0) >= 4.5
        ? texto
        : (contraste("#ffffff", alterno) || 0) >= (contraste("#111111", alterno) || 0)
        ? "#ffffff"
        : "#111111";
  }
  const boton = hex(a.colorBoton);
  if (boton) {
    const b = primarioAccesible(boton);
    vars["--sitio-boton"] = b.fondo;
    vars["--sitio-sobre-boton"] = b.texto;
  }
  const enlace = hex(a.colorEnlace);
  if (enlace) vars["--sitio-enlace"] = legible(enlace);
  const oferta = hex(a.colorOferta);
  if (oferta) vars["--sitio-oferta"] = legible(oferta);
  const etiqueta = hex(a.colorEtiqueta);
  if (etiqueta) {
    const e = primarioAccesible(etiqueta);
    vars["--sitio-etiqueta"] = e.fondo;
    vars["--sitio-sobre-etiqueta"] = e.texto;
  }
  if (a.botonRelleno === "contorno") {
    vars["--sitio-contorno"] = legible(primarioAccesible(boton || hex(a.colorPrimario) || "#111111").fondo);
  }
  const cols = Number(a.columnasEscritorio);
  if (cols >= 2 && cols <= 5) vars["--sitio-cols"] = String(cols);
  const colsMovil = Number(a.columnasCelular);
  if (colsMovil === 1 || colsMovil === 2) vars["--sitio-cols-movil"] = String(colsMovil);
  return vars;
}
