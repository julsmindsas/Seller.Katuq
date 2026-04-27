export interface Precio {
    precioUnitarioConIva?: number;
    precioIvaPorVolumen?: string;
    preciosVolumen?: any[];
    valorIva?: number;
    precioPorVolumenSinIva?: string;
    precioUnitarioSinIva?: number;
    precioUnitarioIva?: string;
    precioTotalVolumenConIva?: string;
    /** Costo de compra del producto (sin IVA). Importado desde proveedores
     *  de fulfillment (ej. Aliaddo `priceBuy` / `cost`). Útil para márgenes. */
    costoUnitario?: number;
}
