import { anclaValida } from "../../anclas-inicio";
import { promesaSinConfirmar, tieneMarcador } from "../fichas/fichas-datos";
export { tieneMarcador };

/**
 * Datos de las tarjetas «solución» (PLAN-V2 T14) en el editor: los mismos topes y reglas del módulo del servidor
 * (`functions/utils/sitioModulos/tarjetaSolucion.js`). El servidor normaliza al guardar; aquí solo se ayuda y se avisa.
 */

/** Los campos que la variante suma a cada tarjeta (los de v1 se editan con los campos de siempre). */
export interface TarjetaSolucion {
  titulo?: string;
  cuerpo?: string;
  imagen?: string;
  etiqueta?: string;
  incluye?: string[];
  ctaTexto?: string;
  ctaUrl?: string;
  productoIds?: string[];
  comboId?: string;
  /** El nombre corto de cada pieza («Tapo P110M»): sin él, la página lee el del catálogo. */
  nombres?: NombreCorto[];
  /** "<ancla>:<espacio>": el espacio de un plano de la misma página (contrato de T11). */
  plano?: string;
  superficie?: "" | "estructura";
  cta2Texto?: string;
  cta2Url?: string;
  /** El nombre corto de lo que la resuelve («Deco X50, paquete de 3»). */
  nota?: string;
  /** Rótulo sobre las piezas («Lo resuelve» si va vacío). */
  rotulo?: string;
  /** Descripción de la ilustración. */
  alt?: string;
}

/** El nombre corto de una pieza de la tarjeta (de las piezas o del kit). */
export interface NombreCorto {
  productoId: string;
  nombre: string;
}

export const TOPES_SOLUCION = Object.freeze({
  piezas: 4,
  /** Un kit de más de 10 piezas distintas no da total (la regla del plano). */
  piezasKit: 10,
  nombreCorto: 40,
  incluye: 8,
  textoIncluye: 90,
  nota: 60,
  alt: 120,
  cta2Texto: 30,
});

/** Un espacio de un plano de la página, como lo puede enlazar una tarjeta. */
export interface EspacioDePlano {
  /** "<ancla>:<espacio>". */
  valor: string;
  /** «Elige tu espacio › Local (Local comercial)». */
  texto: string;
  /** El combo del kit de ese espacio, si lo tiene. */
  comboId: string;
}

const ID_ESPACIO = /^[a-z0-9-]{1,20}$/;

/**
 * En el texto con formato (el «Texto» de la tarjeta), `[texto](destino)` es un enlace y no un dato por llenar: la misma
 * regla del servidor (`tarjetaSolucion.js`, MARCADOR_EN_FORMATO). En los demás campos vale `tieneMarcador`.
 */
const MARCADOR_EN_FORMATO = /\[[^\]]{2,}\](?!\()/;
export function tieneMarcadorEnFormato(texto: string | null | undefined): boolean {
  return MARCADOR_EN_FORMATO.test(String(texto || ""));
}

/**
 * ¿El plano pinta este espacio? La misma regla de `plano.js` (`sePinta`): con nombre sin marcador y con líneas o combo.
 * Un espacio a medias se guarda pero no sale en la página, así que una tarjeta no puede llevar a él.
 */
export function espacioSePinta(e: any): boolean {
  if (!e || typeof e.id !== "string" || !ID_ESPACIO.test(e.id)) return false;
  const nombre = String(e.nombre || "").trim();
  return !!nombre && !tieneMarcador(nombre) && ((Array.isArray(e.lineas) && e.lineas.length > 0) || !!e.comboId);
}

/** Los bloques de la página donde está `bloque` (el inicio o una página propia). */
export function bloquesDeSuPagina(contenido: any, bloque: any): any[] {
  if (!contenido) return [];
  const inicio: any[] = Array.isArray(contenido.bloques) ? contenido.bloques : [];
  if (!bloque || inicio.includes(bloque)) return inicio;
  for (const p of Array.isArray(contenido.paginas) ? contenido.paginas : []) {
    if (p && Array.isArray(p.bloques) && p.bloques.includes(bloque)) return p.bloques;
  }
  return inicio;
}

/**
 * Los espacios de los planos visibles de una lista de bloques, con la forma del contrato de T11 (un bloque `plano` con
 * su ancla propia y sus `espacios[].id`), solo los que el plano pinta. Es la misma regla de `espaciosDePlanos` del
 * servidor.
 */
export function espaciosDePlanos(bloques: any[]): EspacioDePlano[] {
  const salida: EspacioDePlano[] = [];
  for (const b of bloques || []) {
    if (!b || b.visible === false || b.tipo !== "plano") continue;
    const ancla = anclaValida(b.estilo && b.estilo.ancla);
    if (!ancla) continue;
    const titulo = String((b.datos && b.datos.titulo) || "Plano").trim().replace(/[.:;,]+$/, "");
    for (const e of (b.datos && b.datos.espacios) || []) {
      if (!espacioSePinta(e)) continue;
      const nombre = String(e.nombre || e.id).trim();
      // Como la página: un detalle con algo entre corchetes no se lee.
      const detalle = tieneMarcador(e.detalle) ? "" : String(e.detalle || "").trim();
      salida.push({ valor: `${ancla}:${e.id}`, texto: `${titulo} › ${nombre}${detalle ? ` (${detalle})` : ""}`, comboId: e.comboId || "" });
    }
  }
  return salida;
}

/** ¿Hay un plano visible en la página que todavía no tiene ancla? Sin ancla no se puede enlazar. */
export function hayPlanoSinAncla(bloques: any[]): boolean {
  return (bloques || []).some((b) => b && b.visible !== false && b.tipo === "plano" && !anclaValida(b.estilo && b.estilo.ancla));
}

/** Qué la resuelve: el kit de un combo, unas piezas o nada (la nota sola). */
export type FuenteSolucion = "kit" | "piezas" | "nada";

export function fuenteDe(t: TarjetaSolucion | null | undefined): FuenteSolucion {
  if (t && t.comboId) return "kit";
  if (t && Array.isArray(t.productoIds) && t.productoIds.length) return "piezas";
  return "nada";
}

/**
 * Lo que la página no publica de esta tarjeta (la misma regla del servidor): textos con un marcador entre corchetes y
 * promesas sin confirmar. Un título así deja la tarjeta fuera.
 */
export function avisosDeTextos(t: TarjetaSolucion | null | undefined, confirmadas: string[] | null | undefined): string[] {
  if (!t) return [];
  const salida: string[] = [];
  const revisar = (texto: string | undefined, donde: string, conFormato = false) => {
    const v = String(texto || "").trim();
    if (!v) return;
    if (conFormato ? tieneMarcadorEnFormato(v) : tieneMarcador(v)) salida.push(`${donde}: «${v}» tiene un dato por llenar entre corchetes y no se publica.`);
    else if (promesaSinConfirmar(v, confirmadas)) salida.push(`${donde}: «${v}» promete algo que no has confirmado y no se publica.`);
  };
  revisar(t.titulo, "El título");
  revisar(t.etiqueta, "El antetítulo");
  revisar(t.cuerpo, "El texto", true);
  revisar(t.nota, "El resumen");
  revisar(t.alt, "La descripción de la ilustración");
  (t.nombres || []).forEach((n) => n && tieneMarcador(n.nombre) && salida.push(`El nombre corto «${n.nombre}» tiene un dato por llenar entre corchetes: se lee el del catálogo.`));
  (t.incluye || []).forEach((x, k) => revisar(x, `La línea ${k + 1} de «Lo que incluye»`));
  revisar(t.ctaTexto, "El botón");
  revisar(t.cta2Texto, "El segundo enlace");
  return salida;
}

/** Las líneas de «Lo que incluye» que la página publica (sin marcadores ni promesas sin confirmar). */
export function lineasPublicables(t: TarjetaSolucion | null | undefined, confirmadas: string[] | null | undefined): number {
  return ((t && t.incluye) || []).filter((x) => {
    const v = String(x || "").trim();
    return !!v && !tieneMarcador(v) && !promesaSinConfirmar(v, confirmadas);
  }).length;
}

/** El nombre corto de una pieza en la tarjeta, o "". */
export function nombreCortoDe(t: TarjetaSolucion | null | undefined, productoId: string): string {
  const n = ((t && t.nombres) || []).find((x) => x && x.productoId === productoId);
  return n ? String(n.nombre || "") : "";
}

/**
 * Escribe (o borra, con "") el nombre corto de una pieza y deja solo los de las piezas que la tarjeta usa hoy (`vigentes`):
 * al cambiar de piezas o de kit no quedan nombres sueltos.
 */
export function ponerNombreCorto(t: TarjetaSolucion, productoId: string, nombre: string, vigentes: string[]): void {
  const limpio = String(nombre || "").slice(0, TOPES_SOLUCION.nombreCorto);
  const otros = (t.nombres || []).filter((x) => x && x.productoId !== productoId && vigentes.includes(x.productoId) && String(x.nombre || "").trim());
  t.nombres = limpio.trim() ? [...otros, { productoId, nombre: limpio }] : otros;
}
