
import { CentroTrabajo, PiezasProduccion, Produccion } from '../productos/otrosprocesos';
import { Producto } from '../productos/Producto';
export interface PedidoParaProduccion {
    producto: Producto;
    cantidad: number;
    configuracion: Configuracion;
    orderId: string;
    nroPedido: string;
    estadoPago: string;
    fechaCompra: string;
    fechaEntrega: any | null;
    formaEntrega: string | null;
    horarioEntrega: string | null;
    estadoProceso: string;
}

export interface PedidosParaProduccionEnsamble2 {
    nombreProceso: string;
    nombreArticulo: string;
    cantidadArticulo: number;
    produccion: Produccion;
    centroTrabajo: CentroTrabajo;
    referenciaProducto: string;
    nombreProducto: string;
    cantidadProducto: number;
    cantidadTotalProductoEnsamble: number;
    // configuracion: Configuracion;
    orderId: string;
    nroPedido: string;
    estadoPago: string;
    fechaCompra: string;
    fechaEntrega: string | null;
    formaEntrega: string | null;
    horarioEntrega: string | null;
    estadoProceso: string;
}

export interface Detalle {
    nombreProceso: string;
    centroTrabajo: CentroTrabajo; // Asumiendo que CentroTrabajo es otra interfaz definida
    cantidadArticulo: number;
    nroPedido: string;
}

export interface DetallePedido {
    orderId: string;
    nroPedido: string;
    piezasProducidas?: number;
    estadoPago: string;
    fechaCompra: string;
    fechaEntrega: string | null;
    formaEntrega: string | null;
    horarioEntrega: string | null;
    estadoProceso: string;
    cantidad: number;
    proceso: string;
    cantidadArticulosPorPedido: number;
    piezasPorRepartir?: number;
    historialPiezasProducidas?: PiezasProduccion[]

}

export interface PedidosParaProduccionEnsamble {
    estadoProductoArticulo?: string;
    detallePedido: DetallePedido[];
    nombreProducto: string;
    nombreArticulo: string;
    tracking: [];
    detalles: Detalle[];
    cantidadTotalProducto: number;
    cantidadTotalProductoEnsamble: number;
    piezasProducidas?: number;
}

export interface Configuracion {
    preferencias: Preferencia[];
    adiciones: Adicion[];
    tarjetas: Tarjeta[];
    producto: Producto;
    cantidad: number;
    datosEntrega: DatosEntrega;
}

export interface Preferencia {
    tipo: string;
    subtitulo: string;
    valorIva: number;
    porcentajeIva: number;
    titulo: string;
    imagen: string;
    cantidad: number;
    precioTotalConIva: number;
    valorUnitarioSinIva: number;
    paraProduccion?: boolean;
}

export interface Adicion {
    tipo: string;
    subtitulo: string;
    valorIva: number;
    porcentajeIva: string;
    titulo: string;
    imagen: string;
    cantidad: number;
    precioTotalConIva: number;
    valorUnitarioSinIva: number;
    referencia: Referencia;
}

export interface Referencia {
    // Completa según los datos de referencia que tengas.
}

export interface Tarjeta {
    de: string;
    para: string;
    mensaje: string;
}

export interface DatosEntrega {
    ocasion: string | null;
    horarioEntrega: string | null;
    genero: string | null;
    fechaEntrega: string | null;
    observaciones: string;
    colores: string[];
    tipoEntrega: string | null;
    formaEntrega: string | null;
}
