export interface OrdenDropshipping {
  id?: string;
  numero_orden: string;
  pedido_id: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  cliente_info: ClienteDropshipping;
  productos: ProductoOrdenDropshipping[];
  direccion_envio: DireccionEnvio;
  estado: EstadoOrdenDropshipping;
  subtotal: number;
  costo_envio: number;
  total: number;
  comision_proveedor: number;
  ganancia_neta: number;
  fecha_creacion: string;
  fecha_envio_proveedor?: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  tracking_number?: string;
  notas?: string;
  archivos_adjuntos?: string[];
}

export interface ProductoOrdenDropshipping {
  producto_id: string;
  sku_proveedor: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  atributos?: { [key: string]: any };
}

export interface ClienteDropshipping {
  nombre: string;
  email: string;
  telefono?: string;
  documento?: string;
}

export interface DireccionEnvio {
  nombre_destinatario: string;
  direccion_linea1: string;
  direccion_linea2?: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  pais: string;
  telefono?: string;
  instrucciones_entrega?: string;
}

export type EstadoOrdenDropshipping = 
  | 'pendiente' 
  | 'enviado_proveedor' 
  | 'confirmado_proveedor'
  | 'procesando' 
  | 'enviado' 
  | 'en_transito'
  | 'entregado' 
  | 'cancelado'
  | 'devuelto';

export interface OrdenDropshippingSummary {
  total_ordenes: number;
  ordenes_pendientes: number;
  ordenes_en_proceso: number;
  ordenes_entregadas: number;
  valor_total_mes: number;
  ganancia_total_mes: number;
}