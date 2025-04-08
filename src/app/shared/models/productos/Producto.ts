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
}



