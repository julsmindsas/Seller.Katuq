export interface Producto {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  ubicacion?: string;
}

export interface PickingResponse {
  _id: string;
  ordenId: string;
  estado: 'pendiente' | 'en_proceso' | 'completado';
  productos: Producto[];
  fechaCreacion: Date | string;
  fechaActualizacion: Date | string;
  fechaCompletado?: Date | string;
}

export interface PickingRequest {
  ordenId: string;
  bodegaId: string;
  productos: Producto[];
}

export interface PickingCompletarRequest {
  pickingId: string;
  productos: Producto[];
} 