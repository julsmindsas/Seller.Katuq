import { Producto } from "src/app/shared/models/productos/Producto";
import { UserLite } from "src/app/shared/models/User/UserLite";
import { Cliente, DatosEntrega, EstadoPago, EstadoProceso, Tarjeta } from "../../ventas/modelo/pedido";

export interface POSPedido {
    generarFacturaElectronica?: any;
    pdfUrlInvoice?: any;
    cambioEntregado?: number;
    bodegaId?: string;
    pagoRecibido?: number;
    entregado?: UserLite;
    transportador?: any;
    typeOrder?: string;
    nroShippingOrder?: string;
    despachador?: UserLite;
    fechaYHorarioDespachado?: string;
    _id?: string,
    fechaHoraEmpacado?: string
    porceDescuento?: number;
    nroPedido?: string,
    empacador?: string,
    referencia: string,
    company?: string,
    cliente?: Cliente,
    carrito?: POSCarrito[],
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
    facturacion?: POSFacturacion,
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
    PagosAsentados?: POSPago[],
    validacion?: boolean,
    pagoInformation?: PagoInformation,
}
export interface POSPago {
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


export interface POSCarrito {
    estadoProcesoProducto?: EstadoProceso;
    producto?: Producto,
    configuracion?: POSConfiguracion,
    cantidad?: number
}




export interface POSFacturacion {
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


export interface POSEntrega {
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



//Configuracion de producto
export interface POSConfiguracion {
    producto: Producto;
    datosEntrega: DatosEntrega;
    preferencias: POSPreferencia[];
    adiciones: POSAdicion[];
    tarjetas: Tarjeta[];
}




export interface Fecha {
    year: number;
    month: number;
    day: number;
}

export interface POSPreferencia {
    titulo: string;
    subtitulo: string;
    valorUnitarioSinIva: number;
    valorIva: number;
    porcentajeIva: string;
    precioTotalConIva: number;
    imagen: string;
    tipo: string;
}

export interface POSAdicion {
    titulo: string;
    subtitulo: string;
    valorUnitarioSinIva: number;
    valorIva: number;
    porcentajeIva: number;
    precioTotalConIva: number;
    imagen: string;
    tipo: string;

}

// fin configuracion de producto

export interface PagoInformation {
    metodo: string;
    monto: number;
    moneda: string;
    estado: string;
    fecha: string;
    hora: string;
    referencia: string;
    tipo: string;
    id: string;
    integridad?: string;
}
