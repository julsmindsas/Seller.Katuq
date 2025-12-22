# Resumen Completo de Katuq Seller Platform

## Visión General

**Katuq Seller** es una plataforma integral de gestión empresarial para el comercio electrónico desarrollada en **Angular 14**, que combina tecnologías modernas con inteligencia artificial para ofrecer una solución completa de administración de ventas, inventarios, producción y logística.

Es una plataforma **multi-tenant**, multi-canal y multi-bodega que permite a las empresas gestionar todo su ecosistema de ventas desde una única interfaz, con capacidades avanzadas de personalización y automatización.

---

## Arquitectura y Stack Tecnológico

### Frontend (Angular 14)
- **Framework**: Angular 14.3.0 con TypeScript 4.8.4
- **UI Framework**: PrimeNG 14.2.3 (componentes principales) + Bootstrap 5.3.8
- **Gráficos**: ApexCharts para visualizaciones analíticas
- **Estado**: Service-based state management con RxJS
- **Internacionalización**: ngx-translate (español, inglés, francés, portugués)
- **PWA**: Service Workers habilitados para capacidades offline
- **Editor**: CKEditor 5 para edición rich text
- **PDFs**: jsPDF + html2pdf.js para generación de documentos

### Backend (Firebase + Node.js)
- **Base de Datos**: Firebase Firestore (NoSQL)
- **Autenticación**: Firebase Authentication
- **Storage**: Firebase Storage para archivos multimedia
- **Functions**: Node.js backend con Express (puerto 3300)
- **Hosting**: Firebase Hosting con SPA routing
- **Integración Multi-Cloud**: AWS SQS + AWS X-Ray para mensajería y trazabilidad

### Arquitectura de Microservicios
- **Patrón**: Lazy-loaded feature modules
- **Comunicación**: HTTP + WebSockets + Server-Sent Events (SSE)
- **Interceptores**: HTTP interceptor para autenticación, logging y errores
- **Guards**: AuthGuard y AdminGuard para control de acceso

---

## Módulos Funcionales Principales

### 1. **Dashboard** (`/dashboards`)
Panel de control centralizado con:
- **KPIs en tiempo real**: Ventas, pedidos, inventario, producción
- **Gráficos analíticos**: Tendencias de ventas, productos más vendidos, rendimiento por canal
- **Métricas de negocio**: Tasa de conversión, ticket promedio, margen de ganancia
- **Widgets personalizables**: Configuración por rol de usuario

### 2. **Inventarios** (`/inventario`)
Sistema completo de gestión de inventarios:
- **Catálogo de productos**: Gestión de SKUs, variantes, imágenes, precios
- **Multi-bodega**: Gestión de múltiples ubicaciones de almacenamiento
- **Traslados**: Movimientos entre bodegas con trazabilidad
- **Recepciones**: Registro de entradas de mercancía
- **Control de stock**: Alertas de stock mínimo, predicción de reabastecimiento
- **Categorización**: Sistema jerárquico de categorías y subcategorías

**Modelos clave**:
- **Producto**: Identificación, dimensiones, disponibilidad, exposición, precios, marketplace
- **Bodega**: Ubicaciones físicas, capacidad, responsables
- **Traslado/Recepción**: Trazabilidad de movimientos

### 3. **Ventas** (`/ventas`)
Sistema integral de ventas multi-canal:

#### Canales de Venta:
- **Ventas Tradicionales** (`/crear-ventas`): Wizard paso a paso para creación de pedidos
- **POS (Point of Sale)** (`/pos`): Interfaz de punto de venta para retail
- **Venta Asistida** (`/venta-asistida`): Proceso guiado para asesores
- **Carga Masiva** (`/carga-ventas`): Importación de pedidos en lote

#### Componentes Clave:
- **Gestión de Clientes** (`/clientes`): CRUD completo, historial de compras, segmentación
- **Gestión de Pedidos** (`/pedidos`): Listado, filtros avanzados, exportación
- **Carrito de Compras**: Estado reactivo con localStorage persistence
- **Checkout**: Proceso de pago con múltiples métodos
- **Facturación**: Integración con facturación electrónica (Siigo)

#### Estados del Pedido:
**Estado de Proceso**:
- `SinProducir` → `EnProduccion` → `ProducidoParcialmente`/`ProducidoTotalmente`
- `ParaDespachar` → `Empacado` → `EnDespacho` → `Despachado` → `Entregado`
- Estados especiales: `Rechazado`, `Cerrado`
- **Dropshipping**: `SolicitadoProveedor` → `AceptadoProveedor` → `DespachadoProveedor` → `EnTransitoProveedor`

**Estado de Pago**:
- `Pendiente` → `PreAprobado` → `Aprobado`
- Estados alternativos: `Rechazado`, `Cancelado`, `Precancelado`, `Pospendiente`

#### Modelo de Pedido (Pedido):
```typescript
{
  nroPedido, referencia, cliente, carrito[],
  estadoProceso, estadoPago, formaDePago,
  totalPedidoSinDescuento, totalDescuento, totalEnvio, subtotal,
  facturacion, envio, asesorAsignado, fechaCreacion,
  bodegaId, transportador, pagoInformation, channel,
  historialEstadoProceso[], fotosEvidencia[], shippment
}
```

### 4. **POS (Point of Sale)** (`/pos`)
Sistema completo de punto de venta con **14 componentes especializados**:

#### Componentes Principales:
- **Interfaz Principal**: Grid de productos con búsqueda y filtros
- **Selección de Cliente**: Búsqueda rápida, creación express
- **Categorías**: Navegación por categorías de productos
- **Resumen de Carrito**: Vista en tiempo real con totales
- **Selector de Pago**: Efectivo, tarjeta, billeteras digitales (Wompi)
- **Procesadores de Pago**: Componentes especializados por método
- **Cierre de Caja**: Reconciliación de efectivo al final del día

#### Características:
- **Búsqueda Inteligente**: Por nombre, SKU, código de barras
- **Modo Offline**: Funcionalidad básica sin conexión
- **Impresión**: Tickets de venta, facturas
- **Descuentos**: Aplicación de cupones y descuentos manuales
- **Multi-bodega**: Selección de bodega de origen

### 5. **Producción** (`/produccion`)
Gestión completa del ciclo de producción:

#### Funcionalidades:
- **Dashboard de Producción**: Vista de órdenes pendientes, en proceso, completadas
- **Tracking de Procesos**: Seguimiento en tiempo real de cada artículo
- **Asignación de Tareas**: Distribución de trabajo por operario/estación
- **Métricas de Rendimiento**: Tiempo de producción, eficiencia, cuellos de botella
- **Cierre de Artículos**: Marcado de productos terminados
- **Panel de Métricas**: Breadcrumb con KPIs de producción

#### Estados de Producción:
- Órdenes `SinProducir` → `EnProduccion` → `ProducidoParcialmente`/`ProducidoTotalmente`
- Trazabilidad completa con usuario, fecha y notas por cambio de estado

### 6. **Despachos** (`/despachos`)
Sistema de fulfillment y logística:

#### Componentes:
- **Órdenes de Despacho**: Listado optimizado con paginación
- **Generación de Órdenes**: Creación de guías de envío
- **Análisis de Despachos**: Métricas de rendimiento logístico
- **Mapa de Ubicaciones**: Visualización geográfica de entregas
- **Detalle de Entrega**: Información completa de cada envío
- **Imprimir PDF**: Generación de documentos de despacho

#### Integraciones de Transporte:
- **Enviame**: Integración con courier (tracking, cancelación, cotización)
- Gestión de transportadores personalizados
- Tracking en tiempo real
- Evidencia de entrega (fotos, firmas)

#### Características:
- **Empaquetado**: Sistema de picking & packing
- **Zonificación**: Gestión de zonas de cobro
- **Asignación de Mensajeros**: Distribución de rutas
- **Historial de Envíos**: Trazabilidad completa

### 7. **Empresas** (`/empresas`)
Configuración multi-empresa:
- **Multi-tenant**: Soporte para múltiples empresas en una instancia
- **Módulos Variables**: Configuración dinámica de funcionalidades por empresa
- **Personalización**: Logos, colores, términos y condiciones
- **Usuarios por Empresa**: Gestión de equipos y roles
- **Configuración de Procesos**: Adaptación de flujos por empresa

### 8. **Usuarios y Roles** (`/usuarios`, `/rol`)
Sistema de gestión de acceso:
- **CRUD de Usuarios**: Creación, edición, activación/desactivación
- **Sistema de Roles**: Permisos granulares por módulo
- **Multi-empresa**: Usuarios con acceso a múltiples empresas
- **Guards**: Control de acceso a rutas (AuthGuard, AdminGuard)

### 9. **Dropshipping** (`/dropshipping`)
Gestión de modelo dropshipping:
- **Gestión de Proveedores**: Catálogo de proveedores, productos, precios
- **Solicitudes a Proveedores**: Flujo automatizado de pedidos
- **Estados Específicos**: Ciclo de vida completo del pedido dropshipping
- **Márgen de Ganancia**: Configuración de precios de reventa
- **Sincronización**: Actualización automática de inventario de proveedores

### 10. **Integraciones** (`/integrations`)
Hub de integraciones con servicios externos:
- **Facturación Electrónica**: Siigo (Colombia)
- **Pagos**: Wompi (gateway de pagos)
- **Mensajería**: Servicios de correo electrónico
- **Logística**: Enviame
- **APIs**: Webhooks y endpoints configurables

---

## Servicios Core y Arquitectura

### Servicios Principales

#### 1. **VentasService**
Gestión completa de ventas:
- CRUD de pedidos (`createOrder`, `editOrder`, `getOrders`)
- Filtrado y búsqueda avanzada
- Validación de números de pedido
- Analytics: top productos, ventas por fecha
- Gestión de pre-pedidos en localStorage
- Paginación optimizada con `PaginatedOrdersRequest`

#### 2. **CartSingletonService**
Estado global del carrito:
- **BehaviorSubject** para reactividad
- Persistencia en localStorage
- Operaciones: add, remove, clear, update
- Cálculo automático de totales
- Sincronización multi-componente

#### 3. **PosCheckoutService**
Orquestación del proceso POS:
- Workflow de selección de cliente
- Flujo de pago multimodal
- Integración con Wompi
- Gestión de modales
- Selección de bodega

#### 4. **KatuqIntelligenceService**
Inteligencia Artificial integrada:
- **Gemini AI Integration** (`@google/genai`)
- **Product Retrieval**: Búsqueda semántica de productos
- **Analytics AI**: Generación de gráficos predictivos
- **Streaming SSE**: Respuestas en tiempo real
- **Voice Agent**: Asistente de voz para ventas

#### 5. **NotificationManagerService**
Sistema de notificaciones multi-canal:
- **Tipos**: Sistema, email, in-app, push
- **Prioridades**: Low, Normal, High, Urgent
- **Canales**: Email, In-app, Push, SMS
- **Eventos**: Pedidos, pagos, inventario, producción
- **Analytics**: Trazabilidad de notificaciones enviadas

#### 6. **ProduccionService**
Gestión de producción:
- Listado de órdenes por estado
- Actualización de estados de producción
- Asignación de operarios
- Métricas de rendimiento
- Trazabilidad de procesos

#### 7. **InventarioService**
Administración de inventarios:
- CRUD de productos
- Gestión de stock por bodega
- Traslados entre bodegas
- Alertas de stock mínimo
- Sincronización de disponibilidad

#### 8. **BaseService**
Servicio base con funcionalidades compartidas:
- HTTP methods genéricos (get, post, put, delete)
- Manejo de errores centralizado
- Logging y trazabilidad
- Interceptación de requests

### Servicios Especializados

- **AuthService**: Autenticación Firebase, manejo de sesiones
- **PaymentService**: Procesamiento de pagos, Wompi integration
- **ShipmentPreparationService**: Preparación de envíos, picking & packing
- **ColombiaAddressService**: Manejo de direcciones colombianas (DANE codes)
- **CacheService**: Caché de datos maestros (30 minutos)
- **SecurityService**: Encriptación, validación de datos sensibles
- **AnalyticsService**: Métricas de negocio, reportes
- **FeatureFlagsService**: Feature toggles para A/B testing

---

## Sistema de Notificaciones Inteligente (Backend)

### Arquitectura Backend
**Ubicación**: `katuq_admin_back_firebase/functions/`

### Problema Resuelto: Eliminación de Spam de Notificaciones

#### Flujo Anterior (Problemático):
```
Actualización de Pedido → SQS → Firestore → Email Spam
                        ↓
                    Notificaciones duplicadas/innecesarias
```

#### Flujo Actual (Optimizado):
```
Actualización de Pedido → controllers/orders.js
                        ↓
                notificationHooks.detectOrderChanges()
                        ↓
            Comparación estado anterior vs. nuevo
                        ↓
        Solo estados relevantes → notificationQueue.js
                        ↓
            Email al cliente (estados finales)
```

### Configuración Inteligente (.env)
```bash
# Solo notificar al cliente en estos estados
CUSTOMER_NOTIFY_STATES=ProducidoTotalmente,Despachado,Entregado,Rechazado
CUSTOMER_NOTIFY_PAYMENT_STATES=Aprobado

# Modo de pruebas (redirige emails a dirección de test)
NOTIFICATIONS_PUBLIC_MODE=false
NOTIFICATIONS_TEST_EMAIL=test@example.com

# Feature flags
ENABLE_ORDER_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
```

### Estados que Notifican vs. Estados Internos
**Notifican al Cliente**:
- `ProducidoTotalmente`, `Despachado`, `Entregado`, `Rechazado`
- `Aprobado` (pago)

**No Notifican** (estados internos):
- `SinProducir`, `EnProduccion`, `ProducidoParcialmente`, `ParaDespachar`, `Empacado`

### Componentes del Sistema de Notificaciones
- **handlers/sqsListener.js**: Listener de AWS SQS con prevención de spam
- **services/notifications/notificationHooks.js**: Lógica inteligente de detección
- **services/notifications/notificationQueue.js**: Templates de email y cola
- **controllers/orders.js**: Integración con updates de pedidos

### Templates de Email
- `ORDER_ProducidoTotalmente`: Notificación de producción completa
- `ORDER_Despachado`: Envío con número de tracking
- `ORDER_Entregado`: Confirmación de entrega
- `ORDER_Rechazado`: Explicación de rechazo
- `PAYMENT_Aprobado`: Confirmación de pago

---

## Modelos de Datos Principales

### 1. Producto (Producto.ts)
```typescript
{
  identificacion: {sku, nombre, descripcion},
  dimensiones: {alto, ancho, largo, peso},
  disponibilidad: {stock, reservado, disponible},
  exposicion: {imagenes[], videos[]},
  precio: {precioBase, precioVenta, descuento, impuesto},
  categorias: {id, nombre, nivel},
  marketplace: {publicado, canales[]},
  bodegaId: string,
  procesoComercial: {tipoProducto, esVariable, variantes[]},
  otrosProcesos: {dropshipping, produccionBajo demanda}
}
```

### 2. Pedido (Pedido.ts)
```typescript
{
  _id, nroPedido, referencia,
  cliente: {documento, nombres, correo, celular, datosFacturacion, datosEntrega},
  carrito: [{producto, configuracion, cantidad, estadoProcesoProducto}],
  estadoProceso, estadoPago, formaDePago,
  totales: {sinDescuento, descuento, envio, impuesto, subtotal},
  facturacion, envio, fechaEntrega, horarioEntrega,
  asesorAsignado, bodegaId, transportador,
  pagoInformation, channel, historialEstadoProceso[],
  fotosEvidencia[], signatureImage, shippment: {trackingNumber, status, provider}
}
```

### 3. Cliente (Cliente.ts)
```typescript
{
  documento, tipo_documento, nombres_completos, apellidos_completos,
  correo_electronico, numero_celular, indicativo_celular,
  datosFacturacionElectronica: {direccion, ciudad, departamento, codigoPostal},
  datosEntrega: [{alias, direccion, ciudad, barrio, observaciones}],
  notas, estado
}
```

### 4. POSPedido (POS específico)
```typescript
{
  nroPedido, cliente, productos[],
  pagoInformation: {metodoPago, valorRecibido, cambio, transaccionId},
  total, bodegaId, cajero: UserLite, fechaHora, channel: {name: 'POS'}
}
```

### 5. Bodega (bodega.model.ts)
```typescript
{
  id, nombre, direccion, ciudad, departamento,
  responsable: UserLite, capacidad, tipo,
  activa, ubicacionGPS: {lat, lng}
}
```

---

## Características Distintivas

### 1. **Inteligencia Artificial Integrada**
- **Katuq Intelligence**: Asistente AI powered by Google Gemini
- **Voice Agent**: Asistente de voz para ventas
- **Product Retrieval Semántico**: Búsqueda inteligente de productos
- **Analytics Predictivos**: Predicción de ventas, reabastecimiento
- **Chat**: Sistema de chat con soporte AI

### 2. **Multi-Canal y Omnicanal**
- Ventas en línea, POS físico, venta asistida, WhatsApp, redes sociales
- Inventario unificado entre canales
- Trazabilidad de canal en cada pedido

### 3. **Gestión Colombiana Específica**
- Direcciones estructuradas (códigos DANE)
- Facturación electrónica (Siigo)
- Pasarelas de pago locales (Wompi)
- Impuestos IVA configurables
- Zonas de cobro por ciudad/departamento

### 4. **Sistema de Tours Interactivos**
- **driver.js**: Onboarding guiado por módulo
- Tours contextuales para nuevos usuarios
- Feature discovery progresivo

### 5. **PWA y Offline-First**
- Service Workers para funcionamiento sin conexión
- Caché de productos y pedidos
- Sincronización al recuperar conexión

### 6. **Personalización Empresarial**
- Módulos activables por empresa
- Variables de configuración dinámicas
- Branding personalizado
- Flujos de trabajo configurables

### 7. **Sistema de Prospectos y CRM**
- **Prospect Manager** (`/prospectos`): Gestión de leads
- **Katuq Flow CRM** (`/katuq-flow`): Flujos de venta automatizados
- Segmentación de clientes
- Historial de interacciones

### 8. **Soporte Técnico Integrado**
- **Tickets** (`/soporte`, `/misTickets`): Sistema de soporte
- **Ideas** (`/misIdeas`): Sugerencias de mejoras
- Chat en vivo con equipo de soporte

---

## Flujo de Trabajo Típico

### Creación y Fulfillment de Pedido

1. **Captura del Pedido**
   - Cliente realiza pedido en POS, web o asesor lo crea
   - Sistema valida stock en bodega seleccionada
   - Carrito se guarda en `CartSingletonService`

2. **Checkout y Pago**
   - Selección de método de pago
   - Integración con Wompi o registro manual
   - Estado cambia a `Pendiente` → `PreAprobado` → `Aprobado`

3. **Producción** (si aplica)
   - Pedido aparece en módulo de producción con estado `SinProducir`
   - Operario marca `EnProduccion`
   - Al completar productos: `ProducidoParcialmente` o `ProducidoTotalmente`
   - Cliente recibe **notificación de producción completa**

4. **Despacho**
   - Pedido pasa a `ParaDespachar`
   - Picking & Packing: `Empacado`
   - Generación de guía de envío: `EnDespacho`
   - Entrega a transportador: `Despachado` → **notificación de envío**
   - Tracking disponible para cliente

5. **Entrega**
   - Mensajero entrega pedido: `Entregado` → **notificación de entrega**
   - Evidencia: fotos, firma digital
   - Pedido se cierra automáticamente

### Sistema de Notificaciones Inteligente
- Solo se envían emails en estados **relevantes para el cliente**
- Estados internos (`EnProduccion`, `Empacado`) no generan spam
- Sistema compara estado anterior vs. nuevo antes de notificar
- Templates personalizados por tipo de evento

---

## Tecnologías y Dependencias Clave

### UI/UX
- PrimeNG (tablas, formularios, diálogos, calendarios)
- Bootstrap 5 (grid, utilities)
- Feather Icons + PrimeIcons
- ngx-toastr (notificaciones toast)
- SweetAlert2 (confirmaciones)
- driver.js (tours interactivos)

### Funcionalidades Especiales
- **ApexCharts**: Gráficos interactivos
- **Leaflet**: Mapas de ubicaciones
- **html2canvas + jsPDF**: Generación de PDFs
- **ngx-barcode**: Generación de códigos de barras
- **ngx-datatable**: Tablas avanzadas con sorting, filtering, paginación
- **crypto-js**: Encriptación de datos sensibles
- **hammerjs**: Gestos táctiles
- **mousetrap**: Atajos de teclado

### Multimedia
- **@ctrl/ngx-emoji-mart**: Selector de emojis
- **@ks89/angular-modal-gallery**: Galería de imágenes
- **CKEditor**: Editor rich text

### Backend y Cloud
- Firebase 9 (Firestore, Auth, Storage, Hosting)
- AWS SQS (cola de mensajes)
- AWS X-Ray (trazabilidad)
- Node.js + Express (backend functions)

---

## Comandos de Desarrollo

```bash
# Desarrollo
npm start                          # Servidor dev (puerto 4200)

# Compilación
npm run build                      # Build desarrollo
npm run build:prod                 # Build producción (optimizado)

# Versionamiento y Deploy
npm run update-version             # Actualizar versión
npm run actualizar-compilar        # Update version + build
npm run release                    # Version + build:prod + deploy Firebase

# Pruebas
npm test                          # Unit tests (Karma + Jasmine)
npm run lint                      # Linting (TSLint)
npm run e2e                       # Tests E2E (Protractor)

# Backend
cd katuq_admin_back_firebase/functions
npm run start-express             # Servidor Express (puerto 3300)
node index.js                     # Ejecución directa
```

---

## Seguridad y Autenticación

- **Firebase Authentication**: Login, registro, recuperación de contraseña
- **JWT Tokens**: Autenticación en requests HTTP
- **Guards**: Control de acceso por ruta y rol
- **Encriptación**: Datos sensibles encriptados con crypto-js
- **CORS**: Configurado en Firebase functions
- **Validación**: Validación de inputs en frontend y backend
- **Rate Limiting**: Control de requests en backend

---

## Escalabilidad y Rendimiento

### Frontend
- **Lazy Loading**: Todos los módulos cargan bajo demanda
- **Service Workers**: Caché de assets estáticos
- **Image Optimization**: Servicio de proxy de imágenes
- **Virtual Scrolling**: Para listas largas (ngx-datatable)
- **Paginación Server-Side**: Para pedidos y productos

### Backend
- **Firestore Indexes**: Optimización de queries
- **Caché**: Datos maestros cacheados 30 minutos
- **SQS Queue**: Procesamiento asíncrono de notificaciones
- **Multi-Cloud**: Distribución de carga entre Firebase y AWS

---

## Internacionalización (i18n)

- **Idiomas soportados**: Español, Inglés, Francés, Portugués
- **ngx-translate**: Gestión de traducciones
- **Archivos de idioma**: JSON en `assets/i18n/`
- **Cambio dinámico**: Sin recargar la aplicación

---

## Conclusión: ¿Qué es Katuq?

**Katuq Seller** es una **plataforma empresarial integral de gestión de comercio electrónico** que unifica:

1. **Gestión Omnicanal**: Ventas en múltiples canales desde una única plataforma
2. **Inteligencia Artificial**: Asistentes conversacionales, búsqueda semántica, analytics predictivos
3. **Automatización Inteligente**: Sistema de notificaciones contextual, workflows configurables
4. **Trazabilidad Total**: Desde la captura del pedido hasta la entrega final
5. **Multi-Tenant**: Soporte para múltiples empresas con configuración independiente
6. **Flexibilidad**: Arquitectura modular adaptable a diferentes modelos de negocio
7. **Localización**: Diseñado específicamente para el mercado colombiano y latinoamericano

Es una solución que combina lo mejor de:
- **ERP** (gestión empresarial)
- **CRM** (gestión de clientes)
- **WMS** (gestión de almacenes)
- **OMS** (gestión de pedidos)
- **POS** (punto de venta)
- **AI Platform** (inteligencia artificial)

Todo en una **única aplicación web progresiva**, con arquitectura moderna, escalable y mantenible.

---

**Versión**: 1.1.0
**Última actualización**: 2025
**Framework**: Angular 14.3.0
**Licencia**: Privada
