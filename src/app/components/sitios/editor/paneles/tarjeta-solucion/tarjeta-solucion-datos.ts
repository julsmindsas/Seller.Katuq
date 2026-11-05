import { anclaValida } from "../../anclas-inicio";
import { promesaSinConfirmar, tieneMarcador } from "../fichas/fichas-datos";

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
  /** "<ancla>:<espacio>": el espacio de un plano de la misma página (contrato de T11). */
  plano?: string;
  superficie?: "" | "estructura";
  cta2Texto?: string;
  cta2Url?: string;
  /** El nombre corto de lo que la resuelve («Deco X50, paquete de 3»). */
  nota?: string;
  /** Descripción de la ilustración. */
  alt?: string;
}

export const TOPES_SOLUCION = Object.freeze({
  piezas: 4,
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
 * su ancla propia y sus `espacios[].id`). Es la misma regla de `espaciosDePlanos` del servidor.
 */
export function espaciosDePlanos(bloques: any[]): EspacioDePlano[] {
  const salida: EspacioDePlano[] = [];
  for (const b of bloques || []) {
    if (!b || b.visible === false || b.tipo !== "plano") continue;
    const ancla = anclaValida(b.estilo && b.estilo.ancla);
    if (!ancla) continue;
    const titulo = String((b.datos && b.datos.titulo) || "Plano").trim().replace(/[.:;,]+$/, "");
    for (const e of (b.datos && b.datos.espacios) || []) {
      if (!e || typeof e.id !== "string" || !ID_ESPACIO.test(e.id)) continue;
      const nombre = String(e.nombre || e.id).trim();
      const detalle = String(e.detalle || "").trim();
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
  const revisar = (texto: string | undefined, donde: string) => {
    const v = String(texto || "").trim();
    if (!v) return;
    if (tieneMarcador(v)) salida.push(`${donde}: «${v}» tiene un dato por llenar entre corchetes y no se publica.`);
    else if (promesaSinConfirmar(v, confirmadas)) salida.push(`${donde}: «${v}» promete algo que no has confirmado y no se publica.`);
  };
  revisar(t.titulo, "El título");
  revisar(t.etiqueta, "El antetítulo");
  revisar(t.cuerpo, "El texto");
  revisar(t.nota, "El nombre corto");
  (t.incluye || []).forEach((x, k) => revisar(x, `La línea ${k + 1} de «Lo que incluye»`));
  revisar(t.ctaTexto, "El botón");
  revisar(t.cta2Texto, "El segundo enlace");
  return salida;
}
