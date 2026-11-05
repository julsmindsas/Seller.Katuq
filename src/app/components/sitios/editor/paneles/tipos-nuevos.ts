/**
 * Los tipos de bloque que crean los módulos del diseño nuevo (PLAN-V2 T03). Es la misma lista de `TIPOS_NUEVOS` del
 * servidor (`functions/utils/sitioModulos/index.js`): el servidor no los pinta en el diseño de siempre ni los deja
 * componer a mano (no son lienzo), así que el editor y el espejo tampoco.
 *
 * Va en un archivo propio, sin importaciones, para que el espejo (`sitio-render`, que también usa la página pública) la
 * lea sin traer el registro de paneles.
 */
export const TIPOS_NUEVOS_SITIO: readonly string[] = Object.freeze(["plano", "guia", "comparador", "pedidoRapido", "soporte"]);

/** ¿Es un tipo nuevo de un módulo? */
export function esTipoNuevoSitio(tipo: string | null | undefined): boolean {
  return !!tipo && TIPOS_NUEVOS_SITIO.includes(tipo);
}
