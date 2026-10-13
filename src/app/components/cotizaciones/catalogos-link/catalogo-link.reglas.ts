import { CatalogoLink, DatosCatalogo, EstadoCatalogo } from "./catalogo-link.modelos";

/** Misma regla que `catalogoVencido` del backend: con la fecha pasada, el link responde 404. */
export function catalogoVencido(cat: Pick<CatalogoLink, "fechaVencimiento">, ahora = new Date()): boolean {
  if (!cat.fechaVencimiento) return false;
  const fecha = new Date(cat.fechaVencimiento);
  return !isNaN(fecha.getTime()) && fecha < ahora;
}

export function estadoCatalogo(cat: Pick<CatalogoLink, "activo" | "fechaVencimiento">, ahora = new Date()): EstadoCatalogo {
  if (!cat.activo) return "apagado";
  return catalogoVencido(cat, ahora) ? "vencido" : "activo";
}

export const ETIQUETA_ESTADO: Record<EstadoCatalogo, string> = {
  activo: "Activo",
  apagado: "Apagado",
  vencido: "Vencido",
};

/** Link público del catálogo, en el mismo dominio desde el que se abrió la web (igual que `/c/<token>` de cotizaciones). */
export function armarLink(token: string | null | undefined, origen: string): string {
  if (!token) return "";
  return `${origen.replace(/\/+$/, "")}/cat/${token}`;
}

/**
 * El vencimiento se elige como día (`yyyy-mm-dd`) y vence al terminar ese día en la hora
 * local: si se guardara la medianoche, el catálogo se apagaría justo al empezar el día elegido.
 */
export function finDelDia(dia: string): string | null {
  if (!dia) return null;
  const [a, m, d] = dia.split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d, 23, 59, 59).toISOString();
}

/** Inverso de `finDelDia`, para mostrar en el campo de fecha. */
export function diaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = new Date(iso);
  if (isNaN(f.getTime())) return "";
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}`;
}

/**
 * Solo lo que cambió: el backend actualiza lo que llega, así que mandar el formulario entero
 * podría pisar una edición hecha desde la app mientras esta pantalla estaba abierta.
 */
export function cambiosCatalogo(original: CatalogoLink, nuevo: Required<Omit<DatosCatalogo, "activo">>): DatosCatalogo {
  const cambios: DatosCatalogo = {};
  const nombre = nuevo.nombre.trim();
  if (nombre && nombre !== original.nombre) cambios.nombre = nombre;
  const descripcion = nuevo.descripcion.trim();
  if (descripcion !== (original.descripcion || "")) cambios.descripcion = descripcion;
  if ((nuevo.fechaVencimiento || null) !== (original.fechaVencimiento || null)) {
    // Comparar por día: un mismo día puede venir con otra hora desde la app iOS.
    if (diaLocal(nuevo.fechaVencimiento) !== diaLocal(original.fechaVencimiento)) {
      cambios.fechaVencimiento = nuevo.fechaVencimiento || null;
    }
  }
  const antes = original.productoIds || [];
  const ahora = nuevo.productoIds;
  if (antes.length !== ahora.length || antes.some((id, i) => id !== ahora[i])) {
    cambios.productoIds = [...ahora];
  }
  return cambios;
}
