export interface Producto {
  productoId: string;
  nombre: string;
  sku: string;
  cantidad: number;
  ubicacion?: string;
  /** Solo en alistamientos que ya se leyeron del servidor. */
  cantidadRecolectada?: number;
  recolectado?: boolean;
}

export interface PickingResponse {
  /** Id del alistamiento (lo manda el servidor como `id`). */
  _id: string;
  ordenId: string;
  /** Código de negocio de la bodega (BOD-001), nunca el id interno. */
  bodegaId?: string;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
  productos: Producto[];
  fechaInicio?: Date | string;
  fechaCompletado?: Date | string;
  /** Resumen del pedido que viene junto con el estado. */
  pedido?: { id?: string; nroPedido?: string; estadoProceso?: string };
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

/** Respuesta de iniciar y de completar: el servidor solo devuelve el id del alistamiento. */
export interface PickingAccionRespuesta {
  message: string;
  pickingId: string;
}
