export interface MovimientoInventario {
    productId: string;
    productRef: string;
    cantidadCambio: number;
    clienteDocumento: string;
    tipoMovimiento: 'in' | 'out';
    origenMovimiento: string;
    fecha: string;
    ordenId: string;
    usuario: string;
    company: string;
    canal: string;
    ubicacion: string;
}
