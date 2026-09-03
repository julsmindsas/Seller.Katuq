import { Categoria } from "./Categoria";
import { Ciudades } from "./Ciudades";
import { CrearProducto } from "./CrearProducto";
import { Dimensiones } from "./Dimensiones";
import { Disponibilidad } from "./Disponibilidad";
import { Exposicion } from "./Exposicion";
import { Identificacion } from "./Identificacion";
import { Marketplace } from "./Marketplace";
import { Precio } from "./Precio";
import { ProcesoComercial } from "./ProcesoComercial";
import { OtrosProcesos } from "./otrosprocesos";
import { DropshippingProductConfig } from "./DropshippingConfig";

export interface PrecioPorTipoCliente {
  tipoClienteId: string;
  tipoClienteNombre: string;
  precio: number; // Precio sin IVA
  porcentajeIva: number;
  valorIva: number;
  precioConIva: number;
  activo: boolean;
  /**
   * Solo para mostrar: la descripción del tipo de cliente, resuelta desde el
   * catálogo al pintar. NO se guarda en el producto — las descripciones son
   * párrafos largos y no caben en una tabla; van al tooltip.
   */
  tipoClienteDescripcion?: string;
}

/**
 * Información de auditoría cuando se aplica un precio por categoría de cliente.
 * Se usa para rastrear que el precio fue modificado y cuál era el precio original.
 */
export interface PrecioAplicadoPorCategoria {
  tipoClienteId: string;
  tipoClienteNombre: string;
  precioOriginalConIva: number;
  precioOriginalSinIva: number;
}

export interface Producto {
  dimensiones?: Dimensiones;
  disponibilidad?: Disponibilidad;
  marketplace?: Marketplace;
  exposicion?: Exposicion;
  categorias?: Categoria;
  identificacion?: Identificacion;
  procesoComercial?: ProcesoComercial;
  ciudades?: Ciudades;
  cd?: string;
  crearProducto?: CrearProducto;
  precio?: Precio;
  /** Costo unitario vigente del producto. Puede venir plano desde backend o dentro de precio/costo. */
  costoUnitario?: number;
  costoFuente?: string;
  costo?: {
    costoUnitario?: number;
    valor?: number;
    fechaVigencia?: string;
    fuente?: string;
  };
  date_edit?: string;
  variableForm?: string;
  rating?: number;
  otrosProcesos?: OtrosProcesos;
  bodegaId?: string; // Agregado para relacionar el producto con una bodega
  dropshippingConfig?: DropshippingProductConfig; // Configuración dropshipping opcional
  preciosPorTipoCliente?: PrecioPorTipoCliente[]; // Lista de precios por tipo de cliente
  _precioAplicadoPorCategoria?: PrecioAplicadoPorCategoria; // Auditoría de precio aplicado por categoría (temporal, no se guarda en BD)
  /** Feature B — precio unitario con IVA ya rebajado por una promoción automática vigente (lo inyecta el backend del catálogo). */
  precioPromocional?: number;
  /** Feature B — metadatos de la promoción automática aplicada al producto en el catálogo. */
  promocionAplicada?: PromocionAplicada;
}

/** Feature B — promoción automática de catálogo aplicada a un producto. */
export interface PromocionAplicada {
  promocionId: string;
  nombre?: string;
  tipo: 'porcentaje' | 'valor_fijo';
  valor: number;
  aplicaA?: 'categoria' | 'producto_especifico';
  precioBase: number;
}

export interface ProductoCarrito {
  
  dimensiones: Dimensiones;
  disponibilidad: Disponibilidad;
  exposicion: Exposicion;
  categorias: Categoria;
  identificacion: Identificacion;
  cd: string;
  crearProducto: CrearProducto;
  precio: Precio;
  date_edit: string;
  variableForm: string;
  rating: number;
  bodegaId?: string; // Agregado para relacionar el producto con una bodega
  dropshippingConfig?: DropshippingProductConfig; // Configuración dropshipping opcional
  _precioAplicadoPorCategoria?: PrecioAplicadoPorCategoria; // Auditoría de precio aplicado por categoría (temporal, no se guarda en BD)
}
