export interface Traslado {
  bodegaOrigenId: string;
  bodegaDestinoId: string;
  productoId: string;
  cantidad: number;
  fecha?: Date;
  estado?: 'Pendiente' | 'Completado' | 'Cancelado';
  observaciones?: string;
} 