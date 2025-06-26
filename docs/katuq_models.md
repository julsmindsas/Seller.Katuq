# Modelos de Datos Relevantes – Katuq Seller

Este documento compila las definiciones **completas** de los modelos TypeScript más relevantes del proyecto Katuq Seller.  Sirve como referencia para integraciones con otros modelos LLM y para comprender la estructura de datos principal de la plataforma.

---

## Índice
1. [Producto y Modelos Relacionados](#producto)
2. [Pedido y Modelos Relacionados](#pedido)
3. [POS Pedido y PagoInformation](#pos-pedido)
4. [UserLite](#userlite)

---

## <a name="producto"></a>Producto y Modelos Relacionados

```typescript
// src/app/shared/models/productos/Producto.ts
import { Categoria } from "./Categoria";
import { Ciudades } from "./Ciudades";
import { CrearProducto } from "./CrearProducto";
import { Dimensiones } from "./Dimensiones";
import { Disponibilidad } from "./Disponibilidad";
import { Exposicion } from "./Exposicion";
import { Identificacion } from "./Identificacion";
import { Marketplace } from "./Marketplace";
import { Precio } from "./Precio";
import { ProcesoComercial } from "./ProcesoComercial";
import { OtrosProcesos } from "./otrosprocesos";

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

export interface ProductoCarrito {
  dimensiones: Dimensiones;
  disponibilidad: Disponibilidad;
  exposicion: Exposicion;
  categorias: Categoria;
  identificacion: Identificacion;
  cd: string;
  crearProducto: CrearProducto;
  precio: Precio;
  date_edit: string;
  variableForm: string;
  rating: number;
  bodegaId?: string;
}
```

### Dimensiones
```typescript
// src/app/shared/models/productos/Dimensiones.ts
export interface Dimensiones {
  altoProductoCm: string;
  anchoProductoCm: string;
  largoProductoCm: string;
  pesoUnitarioProductoKg: string;
}
```

### Disponibilidad
```typescript
// src/app/shared/models/productos/Disponibilidad.ts
export interface Disponibilidad {
  inventarioSeguridad: number;
  tiempoEntrega: string;
  tipoEntrega: string;
  cantidadMinVenta: number;
  cantidadDisponible: number;
  inventariable: boolean;
  cantidadReservada?: number; // Cantidad reservada para pedidos pendientes
  totalVentas?: number;        // Ventas totales
}
```

### Identificacion
```typescript
// src/app/shared/models/productos/Identificacion.ts
export interface Identificacion {
  marca: string;
  tipoProducto: string;
  tipoReferencia: string;
  codigoBarras: string;
  referencia: string;
}
```

### Precio
```typescript
// src/app/shared/models/productos/Precio.ts
export interface Precio {
  precioUnitarioConIva?: number;
  precioIvaPorVolumen?: string;
  preciosVolumen?: any[];
  valorIva?: number;
  precioPorVolumenSinIva?: string;
  precioUnitarioSinIva?: number;
  precioUnitarioIva?: string;
  precioTotalVolumenConIva?: string;
}
```

### Exposicion
```typescript
// src/app/shared/models/productos/Exposicion.ts
export interface Exposicion {
  activar: boolean;
  posicion: number;
  masvendido: boolean;
  nuevo: boolean;
  etiquetas: string[];
  recomendado: boolean;
  oferta: boolean;
  soloPos: boolean;
  destacado: boolean;
  disponible: boolean;
}
```

### Categoria & Relacionados
```typescript
// src/app/shared/models/productos/Categoria.ts
import { CategoriaData } from "./CategoriaData";

export interface Categoria {
  data: CategoriaData;
  children: CategoriaData[];
  label: string;
}

// src/app/shared/models/productos/CategoriaData.ts
import { Data } from "./Data";

export interface CategoriaData {
  data?: Data;
  children: any;
  label: string;
}

// src/app/shared/models/productos/Data.ts
export interface Data {
  posicion: number;
  imagen: string;
  nombre: string;
  activo: boolean;
}
```

### Ciudades & Ciudad
```typescript
// src/app/shared/models/productos/Ciudades.ts
import { Ciudad } from "./Ciudad";

export interface Ciudades {
  ciudadesEntrega: Ciudad[];
  ciudadesOrigen: Ciudad[];
}

// src/app/shared/models/productos/Ciudad.ts
export interface Ciudad {
  label: string;
  value: string;
}
```

### CrearProducto
```typescript
// src/app/shared/models/productos/CrearProducto.ts
import { Imagen } from "./Imagen";

export interface CrearProducto {
  referencia: string;
  descripcion: string;
  garantiasProducto: string;
  restriccionesProducto: string;
  fechaInicial: string;
  imagenesSecundarias: any[];
  fechaFinal: string;
  titulo: string;
  caracAdicionales: string;
  cuidadoConsumo: string;
  imagenesPrincipales: Imagen[];
  paraProduccion?: any;
}
```

### Imagen
```typescript
// src/app/shared/models/productos/Imagen.ts
export interface Imagen {
  path: string;
  urls: string;
  tipo: string;
  nombreImagen: string;
}
```

### Marketplace
```typescript
// src/app/shared/models/productos/Marketplace.ts
import { Campo } from "./Campo";

export interface Marketplace {
  campos: Campo[];
}

// src/app/shared/models/productos/Campo.ts
export interface Campo {
  nameMP: string;
  activo: boolean;
}
```

### ProcesoComercial
```typescript
// src/app/shared/models/productos/ProcesoComercial.ts
export interface ProcesoComercial {
  llevaTarjeta: boolean;
  ocasion: [];
  aceptaColorDecoracion: boolean;
  colorDecoracion: string;
  variablesForm: any;
  genero: [];
  llevaCalendario: boolean;
  llevaArchivo: boolean;
  aceptaAdiciones: boolean;
  aceptaVariable: boolean;
  pago: any[];
  aceptaComentarios: boolean;
  configProcesoComercialActivo?: boolean;
  aceptaGenero?: boolean;
  aceptaOcasion?: boolean;
}
```

### OtrosProcesos y Relacionados
```typescript
// src/app/shared/models/productos/otrosprocesos.ts
import { UserLogged } from "../User/UserLogged";

export interface OtrosProcesos {
  moduloComplementarios: any[];
  modulosVariables: ModulosVariables;
  modulosfijos: any[];
}

export interface ModulosVariables {
  produccion: Produccion[];
}

export interface Produccion {
  estadoArticulo?: EstadoProcesoItem;
  cantidadUnitaria: number;
  titulo: string;
  procesos: Proceso[];
}

export interface Proceso {
  piezasProducidas: number;
  centrosTrabajo: CentroTrabajo[];
  nombre: string;
  piezasPorPedido: number;
  historialPiezasProducidas: PiezasProduccion[];
  estadoProceso: EstadoProcesoItem;
}

export enum EstadoProcesoItem {
  ProducidasTotalmente = "Producidas Totalmente",
  ProducidasParcialmente = "Producidas Parcialmente",
  SinProducir = "Sin Producir",
}

export interface PiezasProduccion {
  fecha: string;
  piezasProducidas: number;
  personaResponsable: UserLogged;
  proceso: string;
}

export interface CentroTrabajo {
  cd: string;
  company: string;
  nombre: string;
}
```

---

## <a name="pedido"></a>Pedido y Modelos Relacionados

```typescript
// src/app/components/ventas/modelo/pedido.ts
// (se incluyen importaciones originales para contexto)
import {
  Producto,
  ProductoCarrito,
} from "../../../shared/models/productos/Producto";
import { UserLite } from "../../../shared/models/User/UserLite";
import { PagoInformation } from "../../pos/pos-modelo/pedido";

export interface Pedido {
  generarFacturaElectronica?: any;
  pdfUrlInvoice?: string;
  pagoRecibido?: any;
  cambioEntregado?: any;
  transaccionId?: any;
  bodegaId?: string;
  entregado?: UserLite;
  transportador?: any;
  nroShippingOrder?: string;
  despachador?: UserLite;
  fechaYHorarioDespachado?: string;
  _id?: string;
  fechaHoraEmpacado?: string;
  porceDescuento?: number;
  typeOrder?: string;
  nroPedido?: string;
  empacador?: string;
  referencia: string;
  nroPedidoReferencia?: string;
  company?: string;
  cliente?: Cliente;
  notasPedido?: NotasPedido;
  carrito?: Carrito[];
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
  facturacion?: Facturacion;
  envio?: Envio;
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
  PagosAsentados?: Pago[];
  validacion?: boolean;
  pagoInformation?: PagoInformation;
  channel?: Channel;
  _estadoCalculadoEnFrontend?: boolean;
  preAprobadoManual?: boolean;
}

export interface Channel {
  id?: string;
  name?: string;
  tipo?: string;
  activo?: boolean;
  createdAt?: string;
}

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

export enum EstadoPago {
  Pendiente = "Pendiente",
  Pospendiente = "Pospendiente",
  PreAprobado = "PreAprobado",
  Aprobado = "Aprobado",
  Rechazado = "Rechazado",
  Precancelado = "Precancelado",
  Cancelado = "Cancelado",
}

export enum EstadoProceso {
  SinProducir = "SinProducir",
  Producido = "Producido",
  Empacado = "Empacado",
  Despachado = "Despachado",
  Rechazado = "Rechazado",
  Entregado = "Entregado",
  ProducidoTotalmente = "ProducidoTotalmente",
  ProducidoParcialmente = "ProducidoParcialmente",
  ParaDespachar = "ParaDespachar",
  Cerrado = "Cerrado",
}

export enum EstadoProcesoFiltros {
  SinProducir = "SinProducir",
  Empacado = "Empacado",
  Despachado = "Despachado",
  Entregado = "Entregado",
  Rechazado = "Rechazado",
  ProducidoTotalmente = "ProducidoTotalmente",
  ProducidoParcialmente = "ProducidoParcialmente",
  ParaDespachar = "ParaDespachar",
  Cerrado = "Cerrado",
}

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

export interface NotasPedido {
  notasDespachos: Notas[];
  notasEntregas: Notas[];
  notasCliente: Notas[];
  notasProduccion: Notas[];
  notasFacturacionPagos: Notas[];
}

export interface Carrito {
  estadoProcesoProducto?: EstadoProceso;
  producto?: Producto;
  configuracion?: Configuracion;
  cantidad?: number;
  notaProduccion?: Notas[];
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
  apellidos?: string;
  barrio?: string;
  indicativoOtroNumero?: string;
  especificacionesInternas?: string;
  nombres?: string;
  otroNumero?: string;
  pais?: string;
  direccionEntrega?: string;
  indicativoCel?: string;
  ciudad?: string;
  observaciones?: string;
  alias?: string;
  celular?: string;
  departamento?: string;
  codigoPV?: string;
  nombreUnidad?: string;
}

export interface Notas {
  fecha?: string;
  nota?: string;
  descripcion?: string;
  producto?: string;
  usuario?: string;
  productoId?: string;
  fromFormulario?: boolean;
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
  latitud?: string;
  longitud?: string;
}

// Configuración de producto dentro de un pedido
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
```

*Nota:* Se han com
*Nota:* Se incluyen todas las interfaces derivadas del modelo **Pedido** para ofrecer una referencia completa en este documento.
*Nota:* Se incluyen todas las interfaces derivadas del modelo **Pedido** para ofrecer una referencia completa en este documento.
*Nota:* Se incluyen todas las interfaces derivadas del modelo **Pedido** para ofrecer una referencia completa en este documento.

---

## <a name="pos-pedido"></a>POS Pedido & PagoInformation

```typescript
// src/app/components/pos/pos-modelo/pedido.ts (extracto relevante)
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

---

## <a name="userlite"></a>UserLite

```typescript
// src/app/shared/models/User/UserLite.ts
export interface UserLite {
  email: string;
  nit: string;
  name: string;
}
```

---

> Última actualización automática: 2025-06-26 