export interface Disponibilidad {
    inventarioSeguridad: number;
    tiempoEntrega: string;
    tipoEntrega: string;
    cantidadMinVenta: number;
    cantidadDisponible: number;
    inventariable: boolean;
    cantidadReservada?: number; // (opcional) cantidad reservada para pedidos pendientes
    totalVentas?: number; // campo para registrar ventas totales
}
