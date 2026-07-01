export interface CiudadCobertura {
  codigo: string;        // Código DANE
  nombre: string;        // Nombre municipio
  departamento: string;  // Departamento
}

/**
 * Integraciones de la bodega con sistemas externos (canónica en INGLÉS, Art. XV).
 * Espejo de `integrations.shopify.locationId`. SIIGO: id numérico de `GET /v1/warehouses`. (D-045/D-046)
 */
export interface BodegaIntegrations {
  siigo?: {
    warehouseId?: number | null;
    warehouseName?: string | null;
    mappedAt?: string | null;
  };
  [provider: string]: any;
}

export interface Bodega {
  id?: string;
  cd?: string;
  nombre: string;
  idBodega: string;
  integrations?: BodegaIntegrations;
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