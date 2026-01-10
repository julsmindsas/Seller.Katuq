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
  date_edit?: string;
  variableForm?: string;
  rating?: number;
  otrosProcesos?: OtrosProcesos;
  bodegaId?: string; // Agregado para relacionar el producto con una bodega
  dropshippingConfig?: DropshippingProductConfig; // Configuración dropshipping opcional
  preciosPorTipoCliente?: PrecioPorTipoCliente[]; // Lista de precios por tipo de cliente
  _precioAplicadoPorCategoria?: PrecioAplicadoPorCategoria; // Auditoría de precio aplicado por categoría (temporal, no se guarda en BD)
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
