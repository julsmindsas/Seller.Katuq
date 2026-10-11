export interface Proveedor {
  id?: string;
  _id?: string;
  /** D-403: el servidor nunca devuelve la clave completa; `api_config.api_key` llega enmascarada. */
  tiene_api_key?: boolean;
  nombre: string;
  contacto: string;
  email: string;
  telefono?: string;
  direccion?: string;
  api_config?: ApiConfig;
  comision_porcentaje: number;
  tiempo_procesamiento_dias: number;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface ApiConfig {
  endpoint?: string;
  api_key?: string;
  tipo_integracion: 'manual' | 'api' | 'csv' | 'webhook';
  configuracion_adicional?: { [key: string]: any };
}

export interface ProveedorSummary {
  id: string;
  nombre: string;
  productos_activos: number;
  ordenes_pendientes: number;
  total_ventas_mes: number;
}