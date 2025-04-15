import { Bodega } from "./bodega.model";

export interface ProductoRecepcion {
  productoId: string;
  referencia: string;
  cantidad: number;
}

export interface Recepcion {
  id?: string;
  bodegaId: string;
  bodegaDoc: Bodega;
  tipoMovimiento: string;
  productos: ProductoRecepcion[];
  fechaRecepcion?: Date;
  usuario?: string;
}