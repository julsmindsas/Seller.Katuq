export interface Cliente {
  id?: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: DireccionEntrega;
}

export interface DireccionEntrega {
  calle: string;
  numero: string;
  complemento?: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  pais: string;
  referencias?: string;
}

export interface ProductoPedido {
  productoId: string;
  nombre: string;
  sku: string;
  precio: number;
  cantidad: number;
  descuento?: number;
  impuestos?: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  nroPedido: string;
  cliente?: {
    nombre: string;
    direccion?: {
      calle: string;
      numero: string;
      ciudad: string;
      estado: string;
      codigoPostal: string;
      pais?: string;
    };
  };
  productos: {
    productoId: string;
    nombre: string;
    sku: string;
    cantidad: number;
    precio: number;
    subtotal: number;
  }[];
  estadoProceso: 'pendiente' | 'picking' | 'packing' | 'enviado' | 'entregado' | 'cancelado';
  estadoPago?: 'pendiente' | 'completado' | 'cancelado';
  fechaCreacion: Date | string;
  total: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  pagina: number;
  porPagina: number;
} 