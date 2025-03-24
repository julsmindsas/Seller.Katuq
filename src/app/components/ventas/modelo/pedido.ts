import { Producto, ProductoCarrito } from "../../../shared/models/productos/Producto";
import { UserLite } from "../../../shared/models/User/UserLite";
import { PagoInformation } from "../../pos/pos-modelo/pedido";

export interface Pedido {
    entregado?: UserLite;
    transportador?: any;
    nroShippingOrder?: string;
    despachador?: UserLite;
    fechaYHorarioDespachado?: string;
    _id?: string,
    fechaHoraEmpacado?: string
    porceDescuento?: number;
    nroPedido?: string,
    empacador?: string,
    referencia: string,
    nroPedidoReferencia?: string,
    company?: string,
    cliente?: Cliente,
    notasPedido?: NotasPedido,
    carrito?: Carrito[],
    formaDePago?: string,
    cuponAplicado?: string,
    totalPedidoSinDescuento?: number,
    totalEnvio?: number,
    totalDescuento?: number,
    totalImpuesto?: number,
    anticipo?: number,
    faltaPorPagar?: number,
    subtotal?: number,
    totalPedididoConDescuento?: number,
    facturacion?: Facturacion,
    envio?: Envio,
    fechaEntrega?: string,
    horarioEntrega?: string,
    formaEntrega?: string,
    asesorAsignado?: UserLite,
    fechaCreacion?: string,
    estadoProceso: EstadoProceso,
    shippingOrder?: any,
    estadoPago: EstadoPago,
    nroFactura?: string,
    fechaFactura?: string,
    PagosAsentados?: Pago[],
    validacion?: boolean,
    pagoInformation?: PagoInformation,
}
export interface Pago {
    fecha: string;
    formaPago: string;
    valor: number;
    numeroComprobante: string;
    archivo: string;
    notas: string;
    numeroPedido: string;
    fechaTransaccion: string;
    valorTotalVenta: number;
    valorRegistrado: number;
    valorRestante: number;
    archivoEvidencia: string;
    usuarioRegistro: string;
    estadoVerificacion: string;
    fechaHoraSistema: string;
    fechaHoraCarga: string;
    fechaHoraAprobacionRechazo: string;
}

export enum EstadoPago {
    Pendiente = 'Pendiente',
    Pospendiente = "Pospendiente",
    PreAprobado = 'PreAprobado',
    Aprobado = 'Aprobado',
    Rechazado = 'Rechazado',
    Precancelado = 'Precancelado',
    Cancelado = 'Cancelado'

}
export enum EstadoProceso {
    SinProducir = 'SinProducir',
    Producido = 'Producido',
    Empacado = 'Empacado',
    Despachado = 'Despachado',
    Rechazado = 'Rechazado',
    Entregado = 'Entregado',
    ProducidoTotalmente = "ProducidoTotalmente",
    ProducidoParcialmente = "ProducidoParcialmente",
    ParaDespachar = "ParaDespachar"
}

export enum EstadoProcesoFiltros {
    SinProducir = 'SinProducir',
    Empacado = 'Empacado',
    Despachado = 'Despachado',
    Entregado = 'Entregado',
    Rechazado = 'Rechazado',
    ProducidoTotalmente = "ProducidoTotalmente",
    ProducidoParcialmente = "ProducidoParcialmente",
    ParaDespachar = "ParaDespachar"
}

export interface Cliente {
    estado?: string,
    tipo_documento_comprador?: string,
    correo_electronico_comprador?: string,
    documento?: string,
    indicativo_celular_comprador?: string,
    numero_celular_comprador?: string,
    nombres_completos?: string,
    numero_celular_whatsapp?: string,
    apellidos_completos?: string,
    indicativo_celular_whatsapp?: string,
    datosFacturacionElectronica?: Facturacion,
    datosEntrega?: Entrega,
    notas?: Notas,
}


export interface NotasPedido {
    notasDespachos: Notas[],
    notasEntregas: Notas[],
    notasCliente: Notas[],
    notasProduccion: Notas[],
    notasFacturacionPagos: Notas[]
}

export interface Carrito {
    estadoProcesoProducto?: EstadoProceso;
    producto?: Producto,
    configuracion?: Configuracion,
    cantidad?: number
    notaProduccion?: Notas[]
}

export interface Facturacion {
    tipoDocumento: string;
    codigoPostal: string;
    indicativoCel: string;
    ciudad: string;
    direccion: string;
    alias: string;
    documento: string;
    celular: string;
    departamento: string;
    correoElectronico: string;
    nombres: string;
    pais: string;
}


export interface Entrega {
    apellidos?: string,
    barrio?: string,
    indicativoOtroNumero?: string,
    especificacionesInternas?: string,
    nombres?: string,
    otroNumero?: string,
    pais?: string,
    direccionEntrega?: string,
    indicativoCel?: string,
    ciudad?: string,
    observaciones?: string,
    alias?: string,
    celular?: string,
    departamento?: string,
    codigoPV?: string,
    nombreUnidad?: string,
}

export interface Notas {
    fecha?: string,
    nota?: string,
}

export interface Envio {
    apellidos: string;
    barrio: string;
    indicativoOtroNumero: string;
    especificacionesInternas: string;
    nombres: string;
    otroNumero: string;
    pais: string;
    direccionEntrega: string;
    indicativoCel: string;
    ciudad: string;
    observaciones: string;
    alias: string;
    celular: string;
    departamento: string;
    codigoPV: string;
    nombreUnidad: string;
    zonaCobro: string;
}


//Configuracion de producto
export interface Configuracion {
    producto: Producto;
    datosEntrega: DatosEntrega;
    preferencias: Preferencia[];
    adiciones: Adicion[];
    tarjetas: Tarjeta[];
}


export interface DatosEntrega {
    tipoEntrega: string;
    formaEntrega: string;
    fechaEntrega: Fecha;
    horarioEntrega: string;
    genero: number[];
    ocasion: string;
    colores: string[];
    observaciones: string;
}

export interface Fecha {
    year: number;
    month: number;
    day: number;
}

export interface Preferencia {
    titulo: string;
    subtitulo: string;
    valorUnitarioSinIva: number;
    valorIva: number;
    porcentajeIva: string;
    precioTotalConIva: number;
    imagen: string;
    tipo: string;
}

export interface Adicion {
    titulo: string;
    subtitulo: string;
    valorUnitarioSinIva: number;
    valorIva: number;
    porcentajeIva: number;
    precioTotalConIva: number;
    imagen: string;
    tipo: string;

}

export interface Tarjeta {
    para: string;
    mensaje: string;
    de: string;
}

// fin configuracion de producto
