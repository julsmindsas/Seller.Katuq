/**
 * Catálogos por link (D-141, pantalla web D-416).
 *
 * Contrato de `/v1/catalogos/*` tal como lo devuelve `controllers/catalogos.js`
 * del backend. El catálogo guarda solo los ids: precio, nombre y existencias
 * se resuelven contra el maestro al pedir el detalle.
 */
export interface CatalogoLink {
  id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  fechaVencimiento?: string | null;
  publicToken?: string;
  productoIds: string[];
  vistasCount?: number;
  solicitudesCount?: number;
  fechaCreacion?: string;
  /** Solo viene en el detalle (`GET /:id`). */
  productos?: ProductoVitrina[];
}

/** Producto tal como lo ve el comprador (`utils/vitrinaProducto.js`). */
export interface ProductoVitrina {
  productoId: string;
  titulo: string;
  referencia?: string;
  imagen?: string | null;
  precioConIva?: number;
  disponible: boolean;
}

export type EstadoCatalogo = "activo" | "apagado" | "vencido";

/** Lo que se puede crear o editar. Al editar se mandan solo los campos que cambiaron. */
export interface DatosCatalogo {
  nombre?: string;
  descripcion?: string;
  fechaVencimiento?: string | null;
  productoIds?: string[];
  activo?: boolean;
}

export interface RespuestaCatalogos<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const MAX_PRODUCTOS_CATALOGO = 200;
