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

// Modelo principal que representa la respuesta completa
export interface MovimientosResponse {
    movimientos: Movimiento[];
    pagination: Pagination;
}

// Información de paginación
export interface Pagination {
    total: number;
    limit: number;
    hasMore: boolean;
    lastDoc: string;
}

// Cada movimiento individual
export interface Movimiento {
    id: string;
    bodegaId: string;
    productoId: string;
    productDoc: ProductDoc;
    bodegaDoc: BodegaDoc;
    cantidad: number;
    tipo: string;
    tipoMovimiento: string;
    observaciones: string;
    ordenCompraId: string | null;
    company: string;
    usuario: string;
    fecha: Timestamp;
    producto: Producto;
    bodega: Bodega;
}

// Marca el formato de las fechas (timestamp)
export interface Timestamp {
    _seconds: number;
    _nanoseconds: number;
}

// Representa la información del producto en el movimiento
export interface ProductDoc {
    imagenesSecundarias: any[]; // Puedes ajustar el tipo si sabes que son strings, por ejemplo: string[]
    titulo: string;
    descripcion: string;
    fechaInicial: string;
    fechaFinal: string;
    caracAdicionales: string;
    garantiasProducto: string;
    restriccionesProducto: string;
    cuidadoConsumo: string;
    imagenesPrincipales: Imagen[];
}

// Definición para las imágenes (se puede reutilizar para otras secciones)
export interface Imagen {
    urls: string;
    nombreImagen: string;
    path: string;
    tipo: string;
}

// Información de la bodega asociada al movimiento
export interface BodegaDoc {
    id: string;
    nombre: string;
    idBodega: string;
    direccion: string;
    coordenadas: string;
    ciudad: string;
    departamento: string;
    pais: string;
    tipo: string;
    company: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Representa el objeto "producto" con toda su información anidada
export interface Producto {
    dimensiones: Dimensiones;
    exposicion: Exposicion;
    otrosProcesos: OtrosProcesos;
    user_edit: string;
    company: string;
    resumenProducto: string;
    embedding: Embedding;
    cd: string;
    kaiForm: any[];
    identificacion: Identificacion;
    procesoComercial: ProcesoComercial;
    marketplace: Marketplace;
    ciudades: Ciudades;
    crearProducto: ProductDoc;
    disponibilidad: Disponibilidad;
    precio: Precio;
    categorias: string; // Se mantiene como string, dada la estructura recibida
    date_edit: string;
}

// Dimensiones físicas del producto
export interface Dimensiones {
    largoProductoCm: string;
    altoProductoCm: string;
    anchoProductoCm: string;
    pesoUnitarioProductoKg: string;
}

// Datos de exposición del producto (mostrar en la plataforma, por ejemplo)
export interface Exposicion {
    activar: boolean;
    posicion: number;
    disponible: boolean;
    recomendado: boolean;
    destacado: boolean;
    oferta: boolean;
    nuevo: boolean;
    masvendido: boolean;
    etiquetas: string[];
}

// Información de otros procesos vinculados al producto
export interface OtrosProcesos {
    modulosfijos: any[];
    moduloComplementarios: any[];
    modulosVariables: ModulosVariables;
}

export interface ModulosVariables {
    produccion: any[];
}

// Datos adicionales que pueden emplearse en búsqueda o análisis
export interface Embedding {
    _values: number[];
}

// Información de identificación del producto
export interface Identificacion {
    tipoProducto: string;
    tipoReferencia: string;
    marca: string;
    referencia: string;
}

// Datos del proceso comercial relacionado al producto
export interface ProcesoComercial {
    ocasion: any[];
    genero: any[];
    colorDecoracion: any[];
    pago: any[];
    aceptaOcasion: boolean;
    aceptaGenero: boolean;
    generoMap: { [key: string]: any };
    ocasionesMap: { [key: string]: any };
    aceptaComentarios: boolean;
    aceptaColorDecoracion: boolean;
    llevaTarjeta: boolean;
    llevaArchivo: boolean;
    aceptaVariable: boolean;
    aceptaAdiciones: boolean;
    variablesForm: string;
    llevaCalendario: boolean;
}

// Datos para integración en marketplace o venta en múltiples canales
export interface Marketplace {
    campos: any[];
    sellerCenter: boolean;
    paginaWeb: boolean;
    puntoDeVenta: boolean;
}

// Información de las ciudades de origen y entrega
export interface Ciudades {
    ciudadesOrigen: Ciudad[];
    ciudadesEntrega: Ciudad[];
}

export interface Ciudad {
    value: string;
    label: string;
}

// Información sobre la disponibilidad del producto
export interface Disponibilidad {
    tipoEntrega: string;
    tiempoEntrega: string;
    cantidadMinVenta: string;
    inventarioSeguridad: string;
    inventariable: boolean;
    cantidadDisponible: number;
}

// Datos del precio del producto
export interface Precio {
    preciosVolumen: any[];
    precioUnitarioSinIva: number;
    precioUnitarioIva: string;
    valorIva: number;
    precioUnitarioConIva: number;
    precioPorVolumenSinIva: string;
    precioIvaPorVolumen: string;
    precioTotalVolumenConIva: string;
}

// Información de la bodega (puede ser la misma que BodegaDoc)
export interface Bodega {
    id: string;
    nombre: string;
    idBodega: string;
    direccion: string;
    coordenadas: string;
    ciudad: string;
    departamento: string;
    pais: string;
    tipo: string;
    company: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

