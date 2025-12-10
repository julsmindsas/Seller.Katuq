export interface CiudadCobertura {
  codigo: string;        // Código DANE
  nombre: string;        // Nombre municipio
  departamento: string;  // Departamento
}

export interface Bodega {
  id?: string;
  nombre: string;
  idBodega: string;
  direccion?: string;
  coordenadas?: string;
  ciudad?: string;
  departamento?: string;
  pais?: string;
  tipo: 'Física' | 'Transaccional';
  coberturaNacional?: boolean;
  ciudadesCobertura?: CiudadCobertura[];
  // Campos de fulfillment
  fulfillmentId?: string;           // UUID del proveedor
  fulfillmentProvider?: string;     // Nombre del proveedor (aliaddo, etc.)
  origenFulfillment?: boolean;      // true si fue importada
  fulfillmentCode?: string;         // Código original del fulfillment
}