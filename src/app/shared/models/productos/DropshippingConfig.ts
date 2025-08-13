export interface DropshippingProductConfig {
    enabled: boolean;
    supplierId: string;
    supplierName: string;
    supplierSku?: string;
    supplierProductUrl?: string;
    leadTimeDays?: number;
    margenPorcentaje?: number;
    margenFijo?: number;
    tipoMargen: 'porcentaje' | 'fijo';
    proveedorContacto?: string;
    proveedorTelefono?: string;
    proveedorEmail?: string;
    costoProveedor?: number;
    monedaProveedor?: string;
    condicionesEspeciales?: string;
    fechaConfiguracion?: string;
    usuarioConfiguracion?: string;
    activo?: boolean;
}

export interface DropshippingProvider {
    id: string;
    nombre: string;
    contacto?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    tiempoRespuestaPromedio?: number; // en horas
    confiabilidad?: number; // 1-5
    condicionesGenerales?: string;
    metodoPago?: string;
    activo: boolean;
    fechaCreacion: string;
    fechaActualizacion?: string;
}

export enum TipoProductoDropshipping {
    TRADICIONAL = 'tradicional',
    DROPSHIPPING = 'dropshipping',
    MIXTO = 'mixto'
}