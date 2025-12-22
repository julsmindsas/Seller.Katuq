# Modelos de Datos del Sistema de Logística Katuq

## Resumen Ejecutivo
Este documento contiene todos los modelos de datos, interfaces y estructuras relacionadas con el sistema de logística, pedidos y despachos de la plataforma Katuq Seller. Incluye las definiciones completas de pedidos, productos, clientes, transportadores, órdenes de envío y toda la cadena logística.

## 1. Modelo Principal de Pedidos

### Interface Pedido (Principal)
```typescript
export interface Pedido {
    // Identificación del pedido
    _id?: string;
    nroPedido?: string;
    referencia: string;
    nroPedidoReferencia?: string;
    company?: string;
    
    // Datos del cliente
    cliente?: Cliente;
    
    // Estado y proceso
    estadoProceso: EstadoProceso;
    estadoPago: EstadoPago;
    
    // Contenido del pedido
    carrito?: Carrito[];
    
    // Datos de precios y pagos
    porceDescuento?: number;
    totalPedidoSinDescuento?: number;
    totalEnvio?: number;
    totalDescuento?: number;
    totalImpuesto?: number;
    subtotal?: number;
    totalPedididoConDescuento?: number;
    anticipo?: number;
    faltaPorPagar?: number;
    
    // Pagos y transacciones
    formaDePago?: string;
    cuponAplicado?: string;
    PagosAsentados?: Pago[];
    pagoInformation?: PagoInformation;
    transaccionId?: any;
    pagoRecibido?: any;
    cambioEntregado?: any;
    
    // Facturación
    facturacion?: Facturacion;
    generarFacturaElectronica?: any;
    nroFactura?: string;
    fechaFactura?: string;
    pdfUrlInvoice?: string;
    
    // Entrega y envío
    envio?: Envio;
    fechaEntrega?: string;
    horarioEntrega?: string;
    formaEntrega?: string;
    
    // Logística y despacho
    transportador?: any;
    nroShippingOrder?: string;
    shippingOrder?: any;
    despachador?: UserLite;
    fechaYHorarioDespachado?: string;
    
    // Empacado
    empacador?: string;
    fechaHoraEmpacado?: string;
    
    // Personal y seguimiento
    asesorAsignado?: UserLite;
    entregado?: UserLite;
    
    // Fechas importantes
    fechaCreacion?: string;
    
    // Notas y observaciones
    notasPedido?: NotasPedido;
    
    // Configuraciones adicionales
    typeOrder?: string;
    bodegaId?: string;
    validacion?: boolean;
    channel?: Channel;
}
```

### Estados del Pedido
```typescript
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

export enum EstadoPago {
    Pendiente = 'Pendiente',
    Pospendiente = "Pospendiente",
    PreAprobado = 'PreAprobado',
    Aprobado = 'Aprobado',
    Rechazado = 'Rechazado',
    Precancelado = 'Precancelado',
    Cancelado = 'Cancelado'
}
```

## 2. Modelos de Entrega y Despacho

### Interface PedidoEntrega (Extendida para Despachos)
```typescript
export interface PedidoEntrega extends Pedido {
    // Datos de estado de entrega
    estadoEntrega?: string;
    
    // Datos de quien recibe
    quienRecibio?: string;
    telefono?: string;
    
    // Evidencias de entrega
    fotosEvidencia?: string[];
    fotoEvidencia?: string;
    signatureImage?: string;
    
    // Datos adicionales de entrega
    observacionesEntrega?: string;
    fechaRecepcion?: string;
    calificacion?: number;
}
```

### Interface PedidoPriorizado (Sistema de Priorización KAI)
```typescript
interface PedidoPriorizado extends Pedido {
    prioridad?: 'alta' | 'media' | 'baja';
    diasRestantes?: number;
    tiempoEstimadoEntrega?: number;
    factoresRiesgo?: string[];
    puntajeKAI?: number;
    optimizacionRuta?: boolean;
}
```

### Interface MetricasLogistica (KAI Analytics)
```typescript
interface MetricasLogistica {
    pedidosUrgentes: number;
    pedidosEnRiesgo: number;
    pedidosNormales: number;
    pedidosSinProducir: number;
    pedidosEnRuta: number;
    pedidosDespacho: number;
    porcentajeEntregasTiempo: number;
    tiempoPromedioDespacho: number;
    zonasConRetrasos: {[zona: string]: number};
    transportadoresEficiencia: {[transportador: string]: number};
    prediccionCargaProximosDias: {[fecha: string]: CargaDiaria};
    ubicacionesPedidos?: UbicacionPedido[];
}

interface CargaDiaria {
    confirmados: number;
    pendientesProduccion: number;
    total: number;
}

interface UbicacionPedido {
    nroPedido: string;
    estado: EstadoProceso;
    cliente: string;
    direccion: string;
    latitud?: number;
    longitud?: number;
    transportador?: string;
    fechaEntrega: string;
    horaEstimada?: string;
    distanciaRestante?: number; // en km
    tiempoEstimado?: number; // en minutos
}
```

## 3. Modelos de Cliente y Direcciones

### Interface Cliente
```typescript
export interface Cliente {
    estado?: string;
    tipo_documento_comprador?: string;
    correo_electronico_comprador?: string;
    documento?: string;
    indicativo_celular_comprador?: string;
    numero_celular_comprador?: string;
    nombres_completos?: string;
    numero_celular_whatsapp?: string;
    apellidos_completos?: string;
    indicativo_celular_whatsapp?: string;
    datosFacturacionElectronica?: Facturacion;
    datosEntrega?: Entrega;
    notas?: Notas;
}
```

### Interface Facturacion
```typescript
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
```

### Interface Envio (Datos de Entrega)
```typescript
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
    latitud?: string;
    longitud?: string;
}
```

## 4. Modelos de Productos y Carrito

### Interface Producto
```typescript
export interface Producto {
    dimensiones?: Dimensiones;
    disponibilidad?: Disponibilidad;
    marketplace?: Marketplace;
    exposicion?: Exposicion;
    categorias?: Categoria;
    identificacion?: Identificacion;
    procesoComercial?: ProcesoComercial;
    ciudades?: Ciudades;
    cd?: string;
    crearProducto?: CrearProducto;
    precio?: Precio;
    date_edit?: string;
    variableForm?: string;
    rating?: number;
    otrosProcesos?: OtrosProcesos;
    bodegaId?: string; // Relaciona el producto con una bodega
}
```

### Interface Carrito
```typescript
export interface Carrito {
    estadoProcesoProducto?: EstadoProceso;
    producto?: Producto;
    configuracion?: Configuracion;
    cantidad?: number;
    notaProduccion?: Notas[];
}
```

### Interface Configuracion (Producto)
```typescript
export interface Configuracion {
    producto: Producto;
    datosEntrega: DatosEntrega;
    preferencias: Preferencia[];
    adiciones: Adicion[];
    tarjetas: Tarjeta[];
}
```

## 5. Modelos de Pagos y Transacciones

### Interface Pago
```typescript
export interface Pago {
    fecha?: string;
    formaPago?: string;
    valor?: number;
    numeroComprobante?: string;
    archivo?: string;
    notas?: string;
    numeroPedido?: string;
    fechaTransaccion?: string;
    valorTotalVenta?: number;
    valorRegistrado?: number;
    valorRestante?: number;
    archivoEvidencia?: string;
    usuarioRegistro?: string;
    estadoVerificacion?: string;
    fechaHoraSistema?: string;
    fechaHoraCarga?: string;
    fechaHoraAprobacionRechazo?: string;
}
```

### Interface PagoInformation
```typescript
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
    linkPago?: string;
    detalleIntegracion?: any;
}
```

## 6. Modelos de Notas y Comunicación

### Interface NotasPedido
```typescript
export interface NotasPedido {
    notasDespachos: Notas[];
    notasEntregas: Notas[];
    notasCliente: Notas[];
    notasProduccion: Notas[];
    notasFacturacionPagos: Notas[];
}
```

### Interface Notas
```typescript
export interface Notas {
    fecha?: string;
    nota?: string;
    descripcion?: string;
    producto?: string;
    usuario?: string;
    productoId?: string;
    fromFormulario?: boolean;
}
```

## 7. Modelos Específicos del POS

### Interface POSPedido (Punto de Venta)
```typescript
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
    _id?: string;
    fechaHoraEmpacado?: string;
    porceDescuento?: number;
    nroPedido?: string;
    empacador?: string;
    referencia: string;
    company?: string;
    cliente?: Cliente;
    carrito?: POSCarrito[];
    formaDePago?: string;
    cuponAplicado?: string;
    totalPedidoSinDescuento?: number;
    totalEnvio?: number;
    totalDescuento?: number;
    totalImpuesto?: number;
    anticipo?: number;
    faltaPorPagar?: number;
    subtotal?: number;
    totalPedididoConDescuento?: number;
    facturacion?: POSFacturacion;
    fechaEntrega?: string;
    horarioEntrega?: string;
    formaEntrega?: string;
    asesorAsignado?: UserLite;
    fechaCreacion?: string;
    estadoProceso: EstadoProceso;
    shippingOrder?: any;
    estadoPago: EstadoPago;
    nroFactura?: string;
    fechaFactura?: string;
    PagosAsentados?: POSPago[];
    validacion?: boolean;
    pagoInformation?: PagoInformation;
}
```

## 8. Modelos de Producción

### Interface PedidoParaProduccion
```typescript
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
```

### Interface DetallePedido
```typescript
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
    historialPiezasProducidas?: PiezasProduccion[];
}
```

## 9. API Endpoints de Logística

### LogisticaServiceV2 (Endpoints principales)
```typescript
// Transportadores
getTransportadores(): Observable<any> // GET /v1/logistica/vendors/all
getTransportadora(id: number): Observable<any> // POST /v1/logistica/vendors
createTrasportadora(transportadora: any): Observable<any> // POST /v1/logistica/vendors/create
updateTrasportadora(transportadora: any): Observable<any> // POST /v1/logistica/vendors/update
deleteTrasportadora(id: any): Observable<any> // POST /v1/logistica/vendors/delete

// Órdenes de envío
getShippingOrders(): Observable<any> // GET /v1/logistica/shippingorders/all
getShippingOrder(id: number): Observable<any> // POST /v1/logistica/shippingorders/get
createShippingOrder(shippingOrder: any): Observable<any> // POST /v1/logistica/shippingorders/create
dispatchShippingOrder(shippingOrder: any): Observable<any> // POST /v1/logistica/shippingorders/dispatch
```

## 10. Modelos de Configuración

### Interface Channel (Canal de Venta)
```typescript
export interface Channel {
    id?: string;
    name?: string;
    tipo?: string;
    activo?: boolean;
    createdAt?: string;
}
```

### Interface DatosEntrega
```typescript
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
```

### Interface Fecha
```typescript
export interface Fecha {
    year: number;
    month: number;
    day: number;
}
```

## 11. Interfaces de Apoyo

### Interface UserLite
```typescript
export interface UserLite {
    name?: string;
    nit?: string;
    // Otras propiedades específicas del usuario
}
```

### Interface Preferencia
```typescript
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
```

### Interface Adicion
```typescript
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
```

### Interface Tarjeta
```typescript
export interface Tarjeta {
    para: string;
    mensaje: string;
    de: string;
}
```

## 12. Flujos de Negocio Principales

### Flujo de Creación de Pedido
1. **Selección de productos** → Carrito
2. **Datos del cliente** → Cliente, Facturacion, Envio
3. **Configuración de entrega** → DatosEntrega, fechas, horarios
4. **Procesamiento de pago** → PagoInformation, EstadoPago
5. **Confirmación** → Pedido con EstadoProceso.SinProducir

### Flujo de Producción
1. **SinProducir** → **ProducidoParcialmente** → **ProducidoTotalmente**
2. **Empacado** → Asignación de empacador y fecha
3. **ParaDespachar** → Listo para asignar transportador

### Flujo de Despacho
1. **Creación de orden de envío** → ShippingOrder
2. **Asignación de transportador** → Vendor/Transportador
3. **Despacho** → EstadoProceso.Despachado
4. **Entrega** → EstadoProceso.Entregado + evidencias

### Flujo de Priorización KAI
1. **Análisis de fechas** → diasRestantes
2. **Evaluación de factores de riesgo** → factoresRiesgo[]
3. **Asignación de prioridad** → alta/media/baja
4. **Optimización de rutas** → optimizacionRuta
5. **Métricas de desempeño** → MetricasLogistica

## 13. Consideraciones Técnicas

### Patrones de Diseño
- **Herencia de interfaces**: PedidoEntrega extends Pedido
- **Composición**: Pedido contiene Cliente, Carrito[], Envio, etc.
- **Enumeraciones tipadas**: EstadoProceso, EstadoPago
- **Opcionalidad**: Uso extensivo de campos opcionales (?)

### Escalabilidad
- **Separación por módulos**: POS, Ventas, Despachos, Producción
- **Servicios especializados**: LogisticaServiceV2, VentasService
- **Estados inmutables**: Tracking completo de cambios de estado

### Integraciones
- **Facturación electrónica**: generarFacturaElectronica, pdfUrlInvoice
- **Pasarelas de pago**: PagoInformation con múltiples métodos
- **Mapas y geolocalización**: latitud, longitud en direcciones
- **IA/Analytics**: Sistema KAI para priorización y métricas

---

**Documento generado para**: Análisis de Sistema de Logística Katuq
**Fecha**: Diciembre 2024
**Propósito**: Documentación completa para desarrollo de empresa logística con IA 