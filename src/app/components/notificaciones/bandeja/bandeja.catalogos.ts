import { ColorEtiqueta, EtiquetaChat } from "../../../shared/services/messaging/messaging.models";

/** Límites de la fase E (D-728): los mismos del servidor. */
export const MAX_MOTIVOS = 20;
export const MIN_MOTIVO = 2;
export const MAX_MOTIVO = 40;
export const MAX_CIERRE_AUTO_HORAS = 720;
export const MAX_ETIQUETAS_CATALOGO = 30;
export const MIN_ETIQUETA = 2;
export const MAX_ETIQUETA = 30;
/** Etiquetas que puede llevar un chat. */
export const MAX_ETIQUETAS_CHAT = 5;
export const MAX_RAPIDOS = 50;
export const MAX_TEXTO_RAPIDO = 1000;
export const REGEX_COMANDO = /^\/[a-z0-9_]{2,30}$/;

export const COLORES_ETIQUETA: ColorEtiqueta[] = ["morado", "verde", "ambar", "rojo", "azul", "gris"];

/** Sin acentos ni mayúsculas, para comparar nombres repetidos. */
export function clave(texto: string): string {
  return (texto || "").trim().toLowerCase();
}

/** Un chip de etiqueta ya resuelto contra el catálogo. */
export interface MarcaEtiqueta {
  id: string;
  nombre: string;
  color: ColorEtiqueta;
}

/** Ids del chat contra el catálogo; los que ya no existen se ignoran. */
export function marcasDe(ids: string[] | undefined, catalogo: EtiquetaChat[]): MarcaEtiqueta[] {
  const porId = new Map((catalogo || []).filter((e) => !!e.id).map((e) => [e.id as string, e]));
  const marcas: MarcaEtiqueta[] = [];
  for (const id of ids || []) {
    const e = porId.get(id);
    if (e) marcas.push({ id, nombre: e.nombre, color: e.color });
  }
  return marcas;
}
