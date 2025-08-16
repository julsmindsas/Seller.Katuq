export interface ProductoDropshipping {
  id?: string;
  proveedor_id: string;
  proveedor_nombre?: string;
  producto_original_id?: string;
  sku_proveedor: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precio_proveedor: number;
  precio_venta: number;
  margen_ganancia: number;
  stock_proveedor?: number;
  stock_minimo?: number;
  tiempo_procesamiento: number;
  imagen_url?: string;
  imagenes?: string[];
  dimensiones?: ProductoDimensiones;
  peso?: number;
  atributos?: { [key: string]: any };
  activo: boolean;
  sincronizado: boolean;
  fecha_ultima_sincronizacion?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ProductoDimensiones {
  largo?: number;
  ancho?: number;
  alto?: number;
  unidad?: 'cm' | 'in';
}

export interface ImportacionProductos {
  proveedor_id: string;
  archivo?: File;
  url_catalogo?: string;
  productos: ProductoDropshipping[];
  estado: 'pendiente' | 'procesando' | 'completado' | 'error';
  errores?: string[];
}