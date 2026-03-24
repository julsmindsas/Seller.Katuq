# CLAUDE.md — Katuq Platform (Frontend + Backend)

> Guía operativa para Claude Code. Este archivo es la referencia maestra para trabajar con este repositorio y el backend asociado.

## Identidad del Proyecto

**Katuq** es una plataforma e-commerce para vendedores colombianos. Dos repositorios:

| Repo | Stack | Ubicación |
|------|-------|-----------|
| **Seller.Katuq** (este repo) | Angular 14 frontend | `C:\sourcecodejuls\Seller.Katuq` |
| **katuq_admin_back_firebase** | Express/Node.js backend | `C:\sourcecodejuls\katuq_admin_back_firebase\functions\` |

Mercado: Colombia (direcciones DANE, facturación electrónica SIIGO, IVA, Wompi).

### Stack Completo

- **Frontend**: Angular 14.3.0 + TypeScript (strict) + PrimeNG 14.2 + ng-bootstrap 13 + Bootstrap 5.3
- **Backend**: Express.js + Node 20 + Firebase Admin SDK
- **Database**: Firebase Firestore + Realtime DB
- **Cache**: Redis Cloud (5min TTL default) — actualmente deshabilitado
- **Queue**: AWS SQS (notificaciones) con fallback a Firestore
- **Hosting**: Firebase Hosting (`dist/cuba`) + AWS EC2 (`back.katuq.com`)
- **AI**: Google Gemini via Genkit (v0.5.17) + KAI Agent System (puerto 3891)
- **Payments**: Wompi (principal) + ePayco (alternativo)

## Comandos de Desarrollo

```bash
npm start                    # Dev server localhost:4200 (4GB heap)
npm run start:8gb            # Dev server con 8GB heap
npm run build                # Build dev (4GB)
npm run build:prod           # Build producción (8GB, optimizado)
npm run release              # Version bump + build prod + firebase deploy
npm run actualizar-compilar  # Version bump + build dev
npm test                     # Tests unitarios (Karma/Jasmine) — NO configurados actualmente
npm run lint                 # TSLint
```

- Build output: `dist/cuba`
- Version auto-bump: `update-version.js` se ejecuta en `prebuild` hook
- Warnings de CommonJS deps son normales, no rompen el build
- `skipTests: true` en angular.json — no hay tests unitarios activos

---

## Arquitectura

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Angular | 14.3.0 |
| UI primaria | PrimeNG | 14.2 |
| UI secundaria | ng-bootstrap | 13.1 |
| CSS | Bootstrap + SCSS | 5.3.8 |
| Estado | RxJS BehaviorSubject | 7.x |
| Auth | Firebase Auth | 9.23 |
| HTTP | Angular HttpClient + Interceptors | 14.x |
| i18n | @ngx-translate | 14.0 |
| Charts | ApexCharts, ECharts | 3.54, 5.6 |
| Maps | Leaflet | 1.9 |
| Wizard | angular-archwizard | 7.0 |
| PDF | jsPDF + html2pdf | 2.5, 0.12 |
| Drag & Drop | dragula/ng2-dragula | 3.7 |
| Rich text | CKEditor 5 | 40.2 |
| AI | @google/genai | 1.16 |

### Layouts y Routing

Tres layouts en `app-routing.module.ts`:

| Layout | Uso | Componentes |
|--------|-----|-------------|
| **ContentComponent** | Standard (sidebar + header + footer) | La mayoría de rutas |
| **BlankComponent** | Full-screen sin chrome | video-agent, onboarding, agendamiento |
| **FullComponent** | Full-screen alternativo | Rutas especiales |

**Rutas lazy-loaded** definidas en `src/app/shared/routes/routes.ts`:

| Ruta | Módulo | Guard(s) | Dominio |
|------|--------|----------|---------|
| `/dashboards` | DashboardModule | Auth | Analytics, KPIs |
| `/ventas` | VentasModule | Auth | Ventas, pedidos, CRM **(módulo más grande)** |
| `/pos` | PosModule | Auth | Punto de venta (14 sub-componentes) |
| `/despachos` | DespachosModule | Auth | Envíos, logística, carriers |
| `/inventario` | InventarioCatalogoModule | Auth | Catálogo, stock, bodegas |
| `/produccion` | ProduccionModule | Auth + **Subscription** | Producción (Premium) |
| `/integrations` | IntegrationsModule | Auth + **Subscription** | Shopify, SIIGO, etc. (Premium) |
| `/empresas` | EmpresasModule | Auth | Config multi-tenant |
| `/usuarios` | UsuariosModule | Auth | Gestión de usuarios |
| `/productos` | ProductosModule | Auth | CRUD de productos |
| `/formasEntrega` | FormasEntregaModule | Auth | Métodos de entrega |
| `/lista-precios` | ListaPreciosModule | Auth | Precios por categoría cliente |
| `/picking-packing` | PickingPackingModule | Auth | Fulfillment en bodega |
| `/dropshipping` | DropshippingModule | Auth | Proveedores dropshipping |
| `/katuq-flow` | KatuqFlowModule | Auth | CRM pipeline |
| `/prospectos` | ProspectManagerModule | Auth | Gestión de leads |
| `/proceso` | ProcesoModule | Auth | Flujo de procesamiento |
| `/superadmin` | SuperadminModule | **Admin** | Admin global |
| `/rol` | RolModule | — | Roles y permisos |
| `/soporte` | SoporteModule | Auth | Tickets y feedback |
| `/chat` | ChatModule | Auth | Mensajería interna |
| `/ecommerce` | EcommeceModule | Auth | Catálogo e-commerce |

**Rutas públicas** (sin auth): `/login`, `/nuevo-registro`, `/video-agent`, `/servicios/agendamiento`, `/payment-callback`, `/subscription-callback`, `/terms-conditions`, `/privacy-policy`

### Guards (6 capas)

| Guard | Archivo | Verificación |
|-------|---------|-------------|
| AuthGuard | `shared/guards/auth.guard.ts` | Firebase auth token válido |
| AdminGuard | `shared/guard/admin.guard.ts` | Usuario existe en localStorage |
| SubscriptionGuard | `shared/guards/subscription.guard.ts` | Plan Premium (`data: { requiresPremium: true }`) |
| OnboardingGuard | `shared/guards/onboarding.guard.ts` | Solo admins acceden a onboarding |
| SecureInnerPagesGuard | `shared/guard/SecureInnerPagesGuard.guard.ts` | Previene acceso no autenticado |
| MasterDataGuard | `shared/guards/master-data.guard.ts` | Datos maestros cargados antes de ruta |

### HTTP Interceptors

Registrados en `app.module.ts`, se ejecutan en orden:

1. **HttpInterceptor2** (`shared/services/interceptor/http.interceptor.ts`)
   - Detecta URLs backend: `back.katuq.com`, `localhost:3300`, `100.27.36.49:3300`, GCP functions
   - Agrega headers: `Authorization: Bearer {token}`, `company`, `user` (NIT), `email`, `usage-code`
   - Auto-logout en 401/403 (excepto rutas públicas)
   - Throttle de errores de conexión (30s cooldown, toast bottom-right)
   - Rutas públicas excluidas: `/diagnostics/`, `/nuevo-registro`, `/video-agent`, `/agendamiento`

2. **LoaderInterceptor** (`shared/services/interceptor/loader.interceptor.ts`)
   - Muestra barra de carga en peticiones HTTP
   - Excluye llamadas a KatuqIntelligence (AI)

### Estado y Persistencia

**Sin NgRx.** Estado basado en servicios con RxJS:

```
Patrón principal:
Service → BehaviorSubject<T> → .asObservable() → Components subscriben
                             → localStorage sync (cart, session)
```

| Servicio | Estado | Persistencia |
|----------|--------|-------------|
| CartSingletonService | Carrito global | localStorage `'carrito'` |
| ServiciosService | Sesión usuario | localStorage (token, company, email, NIT) |
| CacheService | Cache genérico | Memoria (TTL configurable) |
| PedidosUtilService | Datos maestros | Memoria (30-min TTL) |
| LogisticaServiceV2 | Órdenes envío | Memoria (5-min TTL, invalidado tras mutations) |

---

## Módulos Críticos — Guía de Trabajo

### Ventas (Módulo más grande — ~20,800 LOC)

**Flujo de venta asistida** (wizard en `crear-ventas/`):

```
Step 1: Cliente → Buscar/crear cliente, autocompletar categoría
Step 2: Catálogo → EcomerceProductsComponent, agregar al carrito
Step 3: Carrito → CarritoComponent, cantidades, notas de producción
Step 4: Entrega → PedidoEntregaComponent + PedidoFacturacionComponent
Step 5: Pago → CheckOutComponent, método de pago, cupones
Step 6: Confirmación → ConfirmComponent, preview factura
```

**Componentes clave:**

| Componente | LOC | Función |
|-----------|------|---------|
| `list.component.ts` | **9,257** | Listado de pedidos, filtros, export, recálculo de precios |
| `crear-ventas.component.ts` | **4,707** | Wizard de venta asistida (6 pasos) |
| `checkout.component.ts` | 1,057 | Paso de pago, integración Wompi |
| `pedido-entrega.component.ts` | 1,100 | Datos de envío/entrega |
| `carrito.component.ts` | 614 | Display del carrito, precio manual |
| `pedido-facturacion.component.ts` | 631 | Datos de facturación |

### Despachos (Segundo más complejo)

| Componente | LOC | Función |
|-----------|------|---------|
| `despachos.component.ts` | **7,417** | Orquestador de envíos, selección de carrier |
| `generar-orden.component.ts` | **2,482** | Crear/editar órdenes de envío |

**Patrón parent-child:**
- Comunicación: `@Input`/`@Output` EventEmitters + `@ViewChild` refs
- Dos modos de envío: `mensajeroPropio` (propio) vs `transportadora` (Enviame/Prindel)
- **REGLA**: `formaEntrega` SIEMPRE viene de `carrito[0].configuracion.datosEntrega.formaEntrega`, NUNCA del pedido root

### POS (Punto de Venta)

14 sub-componentes: product-category, customer-section, cart-summary, payment-selector, cash/card/ewallet-payment, cash-closing. Flujo multi-lane con múltiples métodos de pago.

---

## Servicios Críticos — Qué Hace Cada Uno

| Servicio | Ubicación | Responsabilidad |
|----------|-----------|----------------|
| **CartSingletonService** | `shared/services/ventas/cart.singleton.service.ts` | Estado global del carrito (BehaviorSubject + localStorage `'carrito'`) |
| **VentasService** | `shared/services/ventas/ventas.service.ts` | CRUD de pedidos, gestión de productos, analytics |
| **PaymentService** | `shared/services/ventas/payment.service.ts` | Cálculos de pago, escalado de precios, integración Wompi |
| **PosCheckoutService** | `shared/services/ventas/pos-checkout.service.ts` | Flujo POS, pagos Wompi, gestión de clientes |
| **PedidosUtilService** | `components/ventas/service/pedidos.util.service.ts` | Cálculos de precios, cache de datos maestros (30-min TTL) |
| **LogisticaServiceV2** | `shared/services/despachos/logistica.service.v2.ts` | Órdenes de envío, cache 5-min (invalidado tras mutaciones) |
| **AuthService** | `shared/services/firebase/auth.service.ts` | Firebase Authentication |
| **ServiciosService** | `shared/services/servicios.service.ts` | Utilidades globales (1023 LOC), signOut, session |
| **FacturacionIntegracionService** | `shared/services/integraciones/facturas/facturacion.service.ts` | Facturación electrónica SIIGO |
| **FulfillmentService** | `shared/services/fulfillment/fulfillment.service.ts` | Integración Aliaddo (inventario externo) |
| **IntegrationsService** | `components/integrations/integrations.service.ts` | Factory multi-tenant para integraciones |
| **NavService** | `shared/services/nav.service.ts` | Estado de navegación y sidebar (904 LOC) |
| **GeocodingService** | `shared/services/geocoding.service.ts` | GeoBlr + OpenRouteService + Google Maps (726 LOC) |
| **KatuqIntelligenceService** | (AI) | Funcionalidades de IA con Gemini API |
| **MaestroService** | `shared/services/maestros/maestro.service.ts` | Datos maestros (bodegas, carriers, métodos de pago) |
| **CacheService** | `shared/services/cache/cache.service.ts` | Cache genérico con expiración |
| **BaseService** | `shared/services/BaseService.ts` | Clase base para HTTP (get/post/put/delete con `environment.urlApi`) |

---

## Modelo de Datos — Reglas CRÍTICAS

### Pedido (Orden) — NUNCA equivocarse aquí

**Archivo**: `src/app/components/ventas/modelo/pedido.ts`

```
Pedido {
  referencia          → OBLIGATORIO, identificador único de la orden
  cliente: Cliente
  carrito: Carrito[]  → Array de líneas de producto
  estadoPago: EstadoPago
  estadoProceso: EstadoProceso

  // TOTALES — Convención Katuq (MEMORIZAR):
  totalPedidoSinDescuento   = productos BRUTO (sin descuento, sin envío)
  totalDescuento            = monto del descuento
  totalEnvio                = costo de envío
  subtotal                  = productos - descuento + envío
  totalImpuesto             = IVA total
  totalPedididoConDescuento = subtotal + IVA = TOTAL FINAL
                              (nota: el typo "Pedidido" es intencional, NO corregir)
  faltaPorPagar             = total - anticipo
  anticipo                  = suma de PagosAsentados válidos

  _calculadoEnBackend: boolean  → Si true: NO recalcular en frontend
  channel: Channel              → Origen: {id:'shopify', name:'Shopify', tipo:'ecommerce'}
  integrations.shopify          → Metadata de Shopify (orderId, orderNumber)
}
```

### Carrito (Línea de producto)

```
Carrito {
  producto: Producto
  configuracion: Configuracion {
    datosEntrega: { formaEntrega, fechaEntrega, genero, ocasion, colores }
    preferencias: Preferencia[]   → Add-ons con precio
    adiciones: Adicion[]          → Add-ons con precio
    tarjetas: Tarjeta[]           → Tarjetas de regalo
  }
  cantidad: number
  estadoProcesoProducto: EstadoProceso   → Estado POR producto individual
  notaProduccion: Notas[]
  _precioManualOverride?: number         → Precio custom (si permitePrecioManual=true)
  _ivaManualOverride?: number            → IVA custom
}
```

### Producto — Campos para Display

```
producto.crearProducto.titulo                         → Nombre
producto.crearProducto.imagenesPrincipales[0].urls    → Imagen principal
producto.identificacion.referencia                    → SKU/Referencia
producto.identificacion.marca                         → Marca/Vendor
producto.precio.precioUnitarioConIva                  → Precio con IVA
producto.precio.precioUnitarioSinIva                  → Precio sin IVA
producto.precio.precioUnitarioIva                     → ⚠️ PORCENTAJE como STRING ("19", "5", "0")
producto.precio.valorIva                              → Valor monetario del IVA por unidad
producto.precio.preciosVolumen                        → Rangos de precio por volumen
producto.disponibilidad.cantidadDisponible             → Stock
producto.procesoComercial.permitePrecioManual          → Permite precio manual override
producto.preciosPorTipoCliente[]                      → Precios por categoría de cliente
```

### REGLA CRÍTICA: precioUnitarioIva

```
⚠️ precioUnitarioIva es un STRING con el PORCENTAJE: "0", "5", "8", "19"
⚠️ NO es el valor monetario del IVA
⚠️ Si se pone un valor monetario aquí, TODOS los cálculos de IVA se rompen
⚠️ Fórmula: IVA = (valorConDescuento / (1 + %IVA/100)) * (%IVA/100)
```

### Lógica de Precios (Prioridad)

```
1. _precioManualOverride   → Si permitePrecioManual=true y tiene valor
2. preciosPorTipoCliente   → Precio por categoría del cliente
3. preciosVolumen          → Descuento por volumen según cantidad
4. precioUnitarioConIva    → Precio base estándar
```

**Patrón en código:**
```typescript
if (itemCarrito._precioManualOverride != null
    && producto?.procesoComercial?.permitePrecioManual === true) {
  // Usar precio manual
} else {
  // Lógica normal: categoría → volumen → base
}
```

### Estados del Pedido

**EstadoPago**: `Pendiente`, `Pospendiente`, `PreAprobado`, `Aprobado`, `Rechazado`, `Precancelado`, `Cancelado`

**EstadoProceso**: `SinProducir`, `EnProduccion`, `ProducidoParcialmente`, `ProducidoTotalmente`, `ParaDespachar`, `Empacado`, `EnDespacho`, `Despachado`, `Entregado`, `Rechazado`, `Cerrado`

**Estados dropshipping**: `SolicitadoProveedor`, `AceptadoProveedor`, `RechazadoProveedor`, `DespachadoProveedor`, `EnTransitoProveedor`

**Notificaciones al cliente** (solo estos estados): `ProducidoTotalmente`, `Despachado`, `Entregado`, `Rechazado`, `Aprobado` (pago)

**Sin notificación** (internos): `SinProducir`, `EnProduccion`, `ProducidoParcialmente`, `ParaDespachar`, `Empacado`

---

## Integraciones de Terceros

### Pagos — Wompi

- **Tipo**: Pasarela de pagos colombiana (tarjeta, PSE, efectivo, e-wallet)
- **Env dev**: `pub_test_*` con `test_integrity_*`
- **Env prod**: `pub_prod_*` (separado para suscripciones)
- **Widget**: `new WidgetCheckout({ currency: "COP", amountInCents, reference, publicKey, signature })`
- **Callbacks**: `/payment-callback` (pedidos), `/subscription-callback` (suscripciones)
- **Montos**: Siempre en centavos (× 100)

### Facturación — SIIGO

- **Tipo**: Facturación electrónica DIAN (Colombia)
- **API**: Backend proxy `GET/POST /v1/invoice/siigo/*`
- **Mapping**: Pedido Katuq → Order SIIGO (document, customer, seller, items, payments)
- **IVA**: Se extrae de `precioUnitarioIva` (porcentaje string)
- **Premium**: Requiere SubscriptionGuard

### E-Commerce — Shopify

- **API**: GraphQL Admin API 2026-01
- **OAuth**: client_credentials, requiere dominio `.myshopify.com`
- **Store**: ohmystore-shop.myshopify.com
- **Sync**: Strategy pattern via ecommerceAdapter con fallback UPDATE→CREATE automático
- **Webhooks**: 11 topics (orders, products, fulfillments, inventory, refunds)
- **GID**: Usar `numericId()`, NO `fromGid()` para IDs simples
- Ver `memory/shopify-integration.md` para referencia completa

### Envíos — Enviame + Prindel

- **Enviame**: Agregador multi-carrier (tarifas, tracking, cancelaciones)
- **Prindel**: Courier regional
- **Componentes**: `despachos/components/enviame/`

### Fulfillment — Aliaddo

- **Tipo**: Centro de fulfillment externo (inventario + órdenes)
- **IDs**: Katuq usa Firestore IDs; Aliaddo usa UUIDs (`integrations.fulfillment.id`)
- **Bodegas**: Match por `fulfillmentId` (UUID) o `idBodega` (código)
- **Movimientos**: `INGRESO_COMPRA`, `SALIDA_VENTA`, `AJUSTE_POSITIVO`, `AJUSTE_NEGATIVO`, `INGRESO_FULFILLMENT`

### Geocoding

Tres providers con fallback:
1. **GeoBlr** — Prioridad (Latinoamérica)
2. **OpenRouteService** — Routing y direcciones
3. **Google Maps** — Fallback geocoding y display

### AI — Google Gemini

- **SDK**: `@google/genai` v1.16
- **Uso**: Voice agent, chat, audio streaming, tool calling para inventario
- **Backend**: Python Flask (ADK) en Cloud Run
- **WebSocket**: `wss://kai-video-agent-*.run.app` para live audio

---

## Sistema de Estilos

### Arquitectura SCSS

```
styles.scss (entry point)
├── @import app.scss
│   └── @import style.scss
│       └── $primary override ANTES de @import bootstrap
│           └── @import _variables.scss
│               └── @import _katuq-tokens.scss (FUENTE DE VERDAD)
├── PrimeNG CSS
├── primeng-overrides.scss
├── dark-mode.scss
└── responsive.scss
```

### Katuq Design Tokens

**Archivo**: `src/assets/scss/utils/_katuq-tokens.scss`

| Token | Valor | Uso |
|-------|-------|-----|
| Primary | `#8b5cf6` (Purple) | Botones, links, acciones principales |
| Primary Light | `#a78bfa` | Hover states, fondos suaves |
| Accent | `#00e5cc` (Cyan) | Acentos, highlights |
| Error | `#d12b38` | Errores, rechazos |
| Warning | `#D35400` | Advertencias |
| Success | `#27AE60` | Confirmaciones, aprobados |

**Convenciones CSS**:
- **Variables CSS**: `:root` en `styles.scss` usa interpolación `#{$katuq-*}` desde tokens
- **Bootstrap override**: `$primary` se sobreescribe en `style.scss` ANTES de importar Bootstrap
- **PrimeNG override**: En `primeng-overrides.scss` (botones, focus rings, paginator, checkboxes)
- **Import en componentes**: `@import '../../../../../assets/scss/utils/katuq-tokens';` (ajustar profundidad)
- **Badge style**: Tinted minimalist (fondo claro, texto oscuro, borde sutil, sin box-shadow)
- **Módulo despachos**: Completamente migrado a tokens Katuq (cero Material Blue `#2196F3`)

---

## Convenciones de Código

### Naming

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Archivos | `kebab-case` | `crear-ventas.component.ts` |
| Clases/Interfaces | `PascalCase` | `Producto`, `Pedido`, `Cliente` |
| Variables/Métodos | `camelCase` | `totalPedidoSinDescuento` |
| CSS | BEM | `.card__header--active` |
| SCSS files | `_kebab-case.scss` | `_katuq-tokens.scss` |

### Patrones Obligatorios

1. **Lógica de negocio en servicios**, componentes delgados
2. **Unsubscribe**: Usar `takeUntil(this.destroy$)` en subscripciones (patrón existente en generar-orden)
3. **trackBy**: En todos los `*ngFor` para rendimiento
4. **PrimeNG primero**: Usar PrimeNG como UI library principal. ng-bootstrap y ngx-datatable solo para casos específicos
5. **Traducciones**: `{{ 'Texto' | translate }}` con archivos en `src/assets/i18n/` (es, en, fr, pt — 733 keys)

### Anti-Patterns Conocidos (NO Repetir)

| Anti-Pattern | Solución |
|-------------|----------|
| `setTimeout` para sincronizar emisiones parent→child | Callback pattern con flags |
| Leer `this.pedidosSeleccionados` en parent | Siempre preferir `event.pedidos` del child |
| `p-calendar` con `appendTo="body"` en modales ng-bootstrap | Quitar `appendTo="body"`, modal `overflow: visible` |
| Modal `overflow: hidden` bloquea dropdowns | `overflow-x: hidden; overflow-y: auto` |
| `modalService.dismissAll()` destruye child components | Reset state ANTES de dismiss |
| Subscripciones sin unsubscribe | `takeUntil(this.destroy$)` pattern |
| Leer `formaEntrega` del pedido root | SIEMPRE de `carrito[0].configuracion.datosEntrega.formaEntrega` |

---

## Backend API

### URLs Base

| Entorno | URL |
|---------|-----|
| Producción | `https://back.katuq.com` |
| Local | `http://localhost:3300` |
| ADK (Python/Flask) | `http://localhost:8080` (local) / `https://back.katuq.com/adk` (prod) |
| KAI WebSocket | `wss://kai-video-agent-295918419655.us-central1.run.app` |

### Endpoints Principales

| Ruta | Método | Uso |
|------|--------|-----|
| `/v1/pedidos/*` | CRUD | Órdenes |
| `/v1/productos/*` | CRUD | Productos |
| `/v1/inventarios/*` | CRUD | Stock |
| `/v1/logistica/shippingorders/pedido-refs` | GET | Refs ultraligeras (sin fetch de orders) |
| `/v1/logistica/shippingorders/*` | CRUD | Órdenes de envío |
| `/v1/suscripciones/*` | CRUD | Planes |
| `/v1/integraciones/*` | CRUD | Integraciones (Siigo, Shopify, Aliaddo) |
| `/v1/invoice/siigo/*` | GET/POST | Facturación electrónica |
| `/v1/accounting/:provider/price-lists` | GET | Listas de precios (cache 7 días) |
| `/diagnostics/saveSurveyResponse` | POST | Encuesta onboarding (público) |

### Auth Headers (inyectados por HttpInterceptor2)

```
Authorization: Bearer {token}    → Firebase ID token
company: {companyId}             → Tenant/empresa actual
user: {NIT}                      → NIT del usuario
email: {email}                   → Email del usuario
usage-code: {code}               → Código de autorización
```

---

## Deployment

- **Hosting**: Firebase Hosting con SPA rewrites (`firebase.json`)
- **Build**: `dist/cuba`
- **Proyecto Firebase**: `julsmind-katuq`
- **PWA**: Service Worker habilitado en producción
- **Versión actual**: Se auto-incrementa con cada build (formato: `YYYY.MM.DD.N`)
- **Release completo**: `npm run release` = version bump + build prod + firebase deploy

### Environments

| Variable | Dev | Prod |
|----------|-----|------|
| `production` | true (en environment.ts principal) | true |
| `urlApi` | `http://localhost:3300` (comentado) / `https://back.katuq.com` | `https://back.katuq.com` |
| `wompi.public_key` | `pub_test_*` | `pub_prod_*` |

---

## Optimizaciones Existentes

### Cache Strategy

| Cache | TTL | Invalidación |
|-------|-----|-------------|
| PedidosUtilService (maestros) | 30 min | Automática por TTL |
| LogisticaServiceV2 (shipping) | 5 min | Tras create/update/dispatch |
| CartSingletonService | Persistente | Manual (clearCart) |
| CacheService (genérico) | Configurable | Por expiración |
| Accounting price-lists | 7 días | Backend |

### Firestore Cost Optimization

- **pedido-refs endpoint**: Solo lee `shipping_orders`, NO hace batch de orders → O(1) lookup via Map
- **Lazy load**: Full `ordenesExistentes` solo cuando se activa toggle "Mostrar en órdenes"
- **Parent data reuse**: Cuando `usarPedidosPadre=true`, usa `@Input` del parent (sin HTTP)

---

## Shared Module

`src/app/shared/shared.module.ts` exporta:

- **50+ servicios** registrados como providers
- **Layout**: Header, Sidebar, Footer components
- **10 directivas**: OnlyNumbers, OnlyAlphabets, RoleBasedVisibility, ImageFallback, SafeImage, SafeTableStyle, DisableKeyPress, ImageOptimizer, NgbdSortableHeader, ShowOptions
- **3 pipes**: SafeHtml, Markdown, OrderBy
- **Re-exports**: FormsModule, ReactiveFormsModule, NgbModule, TranslateModule, módulos PrimeNG

---

## Modelos (44 archivos en `src/app/shared/models/`)

| Carpeta | Modelos Clave |
|---------|--------------|
| `ventas/` | Pedido, Carrito, Producto (en `modelo/pedido.ts`) |
| `productos/` | CrearProducto, Precio, Categoria, Disponibilidad, Dimensiones, ProcesoComercial |
| `empresa/` | Empresa, Company interface |
| `integraciones/facturacion/siigo/` | FacturaSiigo, Customer, Address, Item |
| `fulfillment/` | FulfillmentModel (Aliaddo stock, sync, orders) |
| `inventarios/` | Bodega, Recepcion, Traslado |
| `pos/` | Order, POS session, Common interfaces |
| `produccion/` | Produccion order |
| `integration.model.ts` | Schema genérico de integración |

---

## Sistema de Inventario

### Arquitectura

| Colección | Clave | Campos |
|-----------|-------|--------|
| `inventory` | company + idBodega (business code) + productoId (Firestore ID) | cantidad, bodegaDoc, productoDoc |
| `inventoryMovement` | company + ordenId + productoId | tipo, tipoMovimiento, cantidad, idBodega |
| `warehouses` | company + idBodega | nombre, tipo, fulfillmentId |
| `channelWarehouseAssociations` | company + channelId | bodegaId (**Firestore doc ID**) |
| `inventory_audit` | company + action | Telemetría de operaciones |

### IDs — REGLA CRÍTICA

- `idBodega` en `inventory`/`inventoryMovement` = **business code** (`"BOD-001"`)
- `bodegaId` en `channelWarehouseAssociations` = **Firestore doc ID** (`"l1h5f0RuneuiIx70gzDH"`)
- `productoId` en `inventory` = **Firestore doc ID** del producto (= `producto.cd` en frontend)
- **NUNCA** escribir un Firestore doc ID en el campo `idBodega` de `inventory`

### Flujos de Inventario

- **POS**: `updateByPOS()` — usa `order.bodegaId` (business code) directo
- **Venta Asistida/E-commerce**: `updateByChannel()` — busca canal → obtiene bodegasAsociadas (Firestore IDs) → resuelve a bodegaData.idBodega (business code)
- **No inventariable**: `disponibilidad.inventariable === false` → movimiento se registra pero stock NO se descuenta
- **Cancelación/Rechazo**: `restoreStock()` automático — busca movimientos SALIDA y crea INGRESO de devolución
- **Remover producto de pedido**: `restoreProductStock()` — devuelve inventario de 1 producto específico

### Endpoints de Inventario (creados Mar 2026)

| Endpoint | Método | Función |
|----------|--------|---------|
| `/v1/inventory/diagnostico` | GET | Detecta inconsistencias (bodegas/productos fantasma, stock negativo) |
| `/v1/inventory/reparar` | POST | Corrige idBodega incorrecto, elimina huérfanos |
| `/v1/inventory/central-abastecimiento` | GET | Inteligencia: rotación, críticos, dormidos, sugerencias traslado |
| `/v1/katuqintelligence/kai/inventory-analysis` | POST | Análisis IA via KAI (Genkit + Gemini 2.5 Flash) |
| `/v1/onboarding/import-inventory` | POST | Importación masiva (referencia → productoId automático) |
| `/v1/orders/restore-product-inventory` | POST | Devolver inventario de producto removido de pedido |

### Frontend — Módulo Inventario

| Ruta | Componente | Función |
|------|-----------|---------|
| `/inventario/inventario-catalogo` | InventarioCatalogoComponent | Vista consolidada, ajuste rápido (ingreso/retiro), importar |
| `/inventario/central-abastecimiento` | CentralAbastecimientoComponent | Inteligencia de inventario + análisis KAI |
| `/inventario/traslados` | TrasladosComponent | Traslados masivos (múltiples productos) |
| `/inventario/recepcion-mercancia` | RecepcionMercanciaComponent | Ingreso/salida de mercancía |
| `/inventario/historial-movimientos` | HistorialMovimientosComponent | Historial con filtros y paginación lazy |
| `/inventario/bodegas` | BodegasComponent | Maestro de bodegas (incluye inactivas con badge) |

---

## Reglas para Claude al Trabajar en Este Proyecto

### SIEMPRE

1. **Leer el archivo antes de editarlo** — el código es complejo y tiene convenciones específicas
2. **Respetar el typo `totalPedididoConDescuento`** — es intencional, usado en toda la base de código
3. **Usar PrimeNG** como UI library principal para nuevos componentes
4. **Mantener `_precioManualOverride`** en cualquier flujo de precios
5. **Verificar `_calculadoEnBackend`** antes de recalcular totales
6. **Usar tokens de `_katuq-tokens.scss`** para colores, no hardcodear hex
7. **Agregar `takeUntil(this.destroy$)`** a subscripciones nuevas
8. **Usar `trackBy`** en nuevos `*ngFor`
9. **Lógica de negocio en servicios**, no en componentes
10. **Usar servicios existentes** (InventarioService, VentasService, etc.) para HTTP — nunca HttpClient directo en componentes. El interceptor agrega headers de auth.
11. **Usar Firestore audit collections** para telemetría — nunca console.log masivo
12. **Mantener auth middleware** en todos los endpoints — nunca quitarlo ni temporalmente

### NUNCA

1. **No corregir el typo `totalPedididoConDescuento`** — rompería todo
2. **No tratar `precioUnitarioIva` como valor monetario** — es porcentaje string
3. **No leer `formaEntrega` del pedido root** — siempre de `carrito[0].configuracion.datosEntrega.formaEntrega`
4. **No usar `setTimeout` para sincronizar parent-child** — usar callbacks/flags
5. **No usar `appendTo="body"` en PrimeNG dentro de modales ng-bootstrap**
6. **No hacer `modalService.dismissAll()` sin resetear estado antes**
7. **No agregar dependencias de Next.js, React, o Vercel** — este es un proyecto Angular 14
8. **No actualizar Angular** sin instrucción explícita — hay dependencias legacy atadas a v14
9. **No crear archivos de test** — skipTests está activo, los tests no se ejecutan
10. **No escribir Firestore doc ID en `idBodega`** de inventory/inventoryMovement — siempre business code
11. **No quitar auth middleware** de endpoints — el interceptor envía tokens automáticamente
12. **No usar console.log para telemetría** — usar `inventory_audit` u otra colección Firestore
13. **No asumir bugs sin datos** — usar endpoint de diagnóstico para verificar antes de cambiar código
14. **No hacer cambios en inventoryService sin entender el flujo completo** — afecta POS, ventas, fulfillment, Shopify

### AL CREAR COMPONENTES NUEVOS

- Seguir estructura de módulo lazy-loaded existente
- Registrar en el routing module correspondiente con guards apropiados
- Importar SharedModule para acceso a servicios/directivas/pipes
- SCSS: importar `_katuq-tokens` y usar variables de diseño
- i18n: agregar strings en `src/assets/i18n/es.json` (y opcionalmente en en, fr, pt)

### AL TOCAR PRECIOS/TOTALES

1. Verificar si `_calculadoEnBackend === true` → NO recalcular
2. Chequear `_precioManualOverride` antes de aplicar lógica de precios
3. `precioUnitarioIva` es STRING con porcentaje ("19"), no monto
4. Respetar prioridad: manual → categoría cliente → volumen → base
5. Montos Wompi en centavos (× 100)

---
---

# BACKEND — katuq_admin_back_firebase

> Ubicación: `C:\sourcecodejuls\katuq_admin_back_firebase\functions\`

## Arquitectura Backend

### Entry Point y Setup

**Archivo**: `index.js` (939 LOC)

Express.js con Firebase Admin SDK, Node 20. Middleware chain:

```
1. helmet()              → Security headers (CSP, HSTS, X-Frame-Options)
2. cors()                → 15+ orígenes permitidos (katuq.com, localhost, Claude, Vercel)
3. express.json(100MB)   → Body parser con rawBody para HMAC de webhooks
4. express.urlencoded()  → Form parsing
5. usageTracker          → Analytics por compañía
6. morganBody()          → Log de HTTP (solo errores 500+)
7. rate-limit            → 100 req/15min (deshabilitado en producción)
```

**Server**: Puerto 3300 local / Firebase Cloud Functions en producción

### Estructura de Archivos

```
functions/
├── index.js (939 LOC)          Entry point, Express setup, 86 routers
├── config.js                   JWT secret, API keys
├── serviceAccountKey.json      Firebase service account
├── .env                        Variables de entorno
├── controllers/ (85 files)     Request handlers (~55K LOC)
├── routers/ (86 files)         Endpoint definitions (~14K LOC)
├── services/ (61 files)        Business logic (~17K LOC)
├── middleware/ (11 files)      Auth, rate-limit, multi-tenant
├── handlers/ (3 files)         SQS listener, WebSocket, agent executor
├── utils/ (25+ files)          Helpers, cache, event bus
├── docs/                       API documentation
└── tests/                      Jest test suites
```

### Routers Principales (86 archivos)

| Ruta API | Dominio | Auth | Notas |
|----------|---------|------|-------|
| `/v1/orders` | Pedidos CRUD | JWT | Performance middleware (warn >2s, error >5s) |
| `/v1/productos` | Productos CRUD | JWT | Trigger sync e-commerce |
| `/v1/inventario` | Stock/Bodegas | JWT | Transacciones Firestore atómicas |
| `/v1/logistica` | Shipping providers | JWT | Enviame, Prindel |
| `/v1/logistics` | Integraciones logística | JWT | Carriers externos |
| `/v1/fulfillment` | Aliaddo fulfillment | JWT | Sync inventario |
| `/v1/fulfillment/webhook` | Webhooks Aliaddo | HMAC | Status updates |
| `/v1/accounting` | SIIGO/Alegra | JWT | Facturación electrónica |
| `/v1/invoice` | Facturas | JWT | Creación/consulta |
| `/v1/shopify` | Shopify OAuth/REST | JWT | Config + sync |
| `/v1/shopifyWebhook` | Webhooks Shopify | HMAC | Orders, products, inventory |
| `/v1/woocommerceWebhook` | Webhooks WooCommerce | HMAC | Orders, products |
| `/v1/integration/config` | Config integraciones | JWT | CRUD credentials |
| `/v1/pagos` | Métodos de pago | JWT | Wompi, ePayco |
| `/v1/subscriptions` | Suscripciones | JWT | Tier limits |
| `/v1/notifications` | Control notificaciones | JWT | Feature flags dinámicos |
| `/v1/fcm` | Push notifications | JWT | Firebase Cloud Messaging |
| `/v1/katuqintelligence` | AI Document Q&A | JWT | Gemini API |
| `/api/kai` | KAI Agent System | API Key | Proxy a puerto 3891 |
| `/v1/agent-builder` | Agent Builder | JWT | Crear agentes custom |
| `/v1/mcp` | MCP Protocol | OAuth 2.0 | Claude integration |
| `/v1/login` | Autenticación | — | Login público |
| `/v1/users` | Usuarios CRUD | JWT | Gestión de usuarios |
| `/v1/roles` | Roles | JWT | RBAC |
| `/v1/companies` | Empresas | JWT | Multi-tenant |
| `/v1/dashboard` | Analytics | JWT | Logistics monitoring |
| `/v1/analytics/*` | Reportes | JWT | Pedidos, logística |
| `/v1/cron-jobs` | Tareas programadas | JWT | Background jobs |
| `/v1/dropshipping/*` | Dropshipping | JWT | Proveedores, órdenes |
| `/v1/crm-movil` | CRM Mobile | JWT | Endpoints móvil |
| `/oauth` | OAuth 2.0 | — | Authorization server |
| `/api/rpc` | A2A Protocol | API Key | JSON-RPC 2.0 (KAI agents) |

### Middleware de Autenticación

| Middleware | Mecanismo | Header | Uso |
|-----------|-----------|--------|-----|
| **auth.js** (JWT) | Bearer token, 24h expiry | `Authorization: Bearer {token}` | Clientes web |
| **API Key** | Static key bypass | `X-API-Key` | Agentes internos (KAI) |
| **Firebase Auth** | OAuth2 + Custom Claims | — | Login flow |
| **OAuth 2.0** | Authorization code + PKCE | — | MCP/External |
| **multiTenant.js** | Extrae company de headers | `company` header | Todos los endpoints |
| **verifyRole.js** | RBAC por rol | — | Endpoints restringidos |
| **subscriptionValidator.js** | Verifica tier del plan | — | Features Premium |

### Servicios Críticos del Backend

#### Capa de Negocio (Strategy Pattern)

| Manager | Providers | Propósito |
|---------|-----------|----------|
| **ecommerceAdapter.js** | shopifyProvider, woocommerceProvider | Sync multi-canal de productos/inventario |
| **fulfillmentManager.js** | aliaddoProvider | Sync inventario con fulfillment externo |
| **accountingManager.js** | siigoProvider | Facturación electrónica DIAN |
| **logisticsManager.js** | enviameProvider, prindelProvider, partnerLogisticaProvider | Envíos y tracking |
| **paymentGateway/index.js** | wompiProvider, epaycoProvider | Links de pago y verificación |

#### Shopify Services (`services/shopify/`)

| Servicio | LOC | Función |
|----------|-----|---------|
| **shopifyApiService.js** | 363 | REST API client con rate limiting (2 req/s) + cache 5min |
| **shopifyGraphqlService.js** | 389 | GraphQL client con leaky bucket throttling (~50 cost/s) |
| **shopifyProductService.js** | 568 | Product CRUD via GraphQL, guarda `integrations.shopify.id` en Firestore |
| **shopifyInventoryService.js** | 517 | Sync bidireccional con echo prevention (30s lock window) |
| **shopifyLocationService.js** | 327 | Map bodegas Katuq → Shopify locations |
| **shopifyBulkService.js** | 289 | Bulk operations async (JSONL) |
| **shopifyWebhookRegistration.js** | 278 | Registro de 11 webhook topics |

#### Fulfillment Services

| Servicio | LOC | Función |
|----------|-----|---------|
| **fulfillmentOrderService.js** | 579 | Determina si orden debe sync con Aliaddo (`origenFulfillment=true`) |
| **fulfillmentSyncService.js** | 1,195 | Sync inventario Katuq ↔ Aliaddo, crea movimientos de ajuste |
| **fulfillmentProductImportService.js** | 917 | Import masivo de productos Aliaddo → Katuq |
| **aliaddoProvider.js** | 200+ | API client: `/items/{id}/stock`, `/sales-remissions` |

#### Notification System (`services/notifications/`)

| Servicio | LOC | Función |
|----------|-----|---------|
| **notificationHooks.js** | 1,119 | Detecta cambios de estado del pedido, solo emite para estados customer-facing |
| **notificationQueue.js** | 1,052 | Cola de procesamiento async (5 workers, 30s timeout) |
| **emailTemplates.js** | 930 | 10+ templates HTML (ORDER_CREATED, DESPACHADO, ENTREGADO, etc.) |
| **templateLiteralsRenderer.js** | 829 | Renderizado avanzado de templates |
| **CircuitBreaker.js** | 249 | Fault tolerance para email (5 failures → OPEN, 30s → HALF_OPEN) |

**Feature flags** (env vars):
```
ENABLE_ORDER_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_WHATSAPP_NOTIFICATIONS=false
CUSTOMER_NOTIFY_STATES=ProducidoTotalmente,Despachado,Entregado,Rechazado
CUSTOMER_NOTIFY_PAYMENT_STATES=Aprobado
```

#### Otros Servicios Clave

| Servicio | LOC | Función |
|----------|-----|---------|
| **orderCalculationService.js** | 272 | Cálculo de totales consistente con frontend |
| **inventoryService.js** | 1,165 | Deducción de stock post-orden (Firestore transactions) |
| **integrationConfigService.js** | 658 | CRUD de credenciales por proveedor (encriptado en Firestore) |
| **webhookSecurityService.js** | 562 | Validación HMAC por proveedor + dedup (10K cache, 1hr TTL) |
| **accountingManager.js** | 1,335 | Orquestador de proveedores contables (SIIGO) |
| **kaiIntegrationService.js** | 969 | Integración Gemini AI |
| **cronService.js** | 1,249 | Tareas programadas (sync, cleanup, reportes) |
| **email.js** | 326 | Email via SendGrid + SMTP fallback |
| **redisCache.js** | 363 | Redis wrapper (DESHABILITADO actualmente) |

### Colecciones Firestore Principales

| Colección | Propósito | Campos Clave |
|-----------|----------|-------------|
| `orders` | Pedidos | `nroPedido`, `carrito[]`, `estadoProceso`, `estadoPago`, `bodegaId` |
| `products` | Catálogo | `crearProducto`, `precio`, `identificacion.referencia`, `integrations.shopify.id`, `integrations.fulfillment.id` |
| `inventory` | Stock por bodega | `company`, `idBodega`, `productoId`, `cantidad` |
| `inventory_movements` | Log de movimientos | `tipo`, `productId`, `bodegaId`, `cantidad`, `timestamp` |
| `warehouses` | Bodegas/Ubicaciones | `idBodega`, `nombre`, `origenFulfillment`, `fulfillmentId`, `fulfillmentProvider` |
| `companies` | Empresas (tenants) | `nomComercial`, `nit`, `branding`, `subscription` |
| `integration_configs` | Credenciales de proveedores | `provider`, `config`, `status` — por `{companyId}_{providerName}` |
| `integration_secrets` | API keys encriptadas | Datos sensibles separados de config |
| `shipping_orders` | Órdenes de envío | `nroShippingOrder`, `pedidoIds[]`, `status` |
| `notification_queue` | Cola de notificaciones | `type`, `channel`, `status`, `attempts` |
| `integration_raw_events` | Log de webhooks | `provider`, `eventType`, `payload` (30-day TTL) |
| `channelWarehouseAssociations` | Mapeo canal→bodega | `channelId`, `bodegaId` |
| `fulfillment_sync_logs` | Log de sync | `companyId`, `bodegaId`, `resultado` |

### Patrones de Arquitectura Backend

| Patrón | Implementación | Archivos |
|--------|---------------|----------|
| **Strategy** | Providers intercambiables | ecommerceAdapter, fulfillmentManager, accountingManager, logisticsManager |
| **Circuit Breaker** | Fault tolerance para APIs externas | CircuitBreaker.js, ResilientHttpClient.js |
| **Leaky Bucket** | Rate limiting para Shopify GraphQL | shopifyGraphqlService.js (~50 cost/s) |
| **Worker Pool** | Procesamiento concurrent de notificaciones | NotificationWorkerPool (5 workers, 30s timeout) |
| **Multi-Tenant** | Aislamiento por compañía | multiTenant middleware + company header |
| **Event Bus** | Comunicación inter-servicio | LocalEventBus + SQS propagation |
| **Adapter** | Compatibilidad legacy | LegacyConfigAdapter.js |
| **Transaction** | Operaciones atómicas de inventario | Firestore `runTransaction()` |

### Variables de Entorno Críticas (.env)

```
# Core
NODE_ENV=production
GOOGLE_AI_API_KEY=...

# AWS SQS (Cola de notificaciones)
QUEUE_PROVIDER=aws
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/.../katuq-notifications

# Redis Cache (actualmente deshabilitado)
REDIS_ENABLED=true
REDIS_HOST=redis-16593.crce220.us-east-1-4.ec2.cloud.redislabs.com
REDIS_DEFAULT_TTL=300
REDIS_ORDERS_TTL=180

# Notificaciones
ENABLE_ORDER_NOTIFICATIONS=false
CUSTOMER_NOTIFY_STATES=ProducidoTotalmente,Despachado,Entregado,Rechazado

# MCP OAuth
MCP_OAUTH_CLIENT_ID=katuq-mcp-client
```

### Reglas para Claude al Trabajar en el Backend

#### SIEMPRE

1. **Usar el Strategy pattern** para nuevos proveedores (crear provider + registrar en manager)
2. **Validar webhooks con HMAC** — nunca confiar en payload sin verificar firma
3. **Usar Firestore transactions** para operaciones de inventario (evitar race conditions)
4. **Respetar multi-tenancy** — todas las queries filtradas por `companyId`
5. **Loguear operaciones de integración** — guardar en `integration_raw_events`
6. **Respetar los feature flags** de notificaciones — verificar env vars antes de enviar
7. **Usar `integrationConfigService`** para leer credenciales, nunca hardcodear
8. **`_calculadoEnBackend = true`** al crear pedidos desde webhooks — evita que frontend recalcule

#### NUNCA

1. **No exponer secrets en logs** — usar `includeSecrets=false` por defecto en `getConfig()`
2. **No hacer sync de inventario sin echo prevention** — usar `syncLockMap` (30s window)
3. **No crear facturas SIIGO sin validar estado de pago** — solo para `Aprobado`
4. **No procesar webhooks duplicados** — verificar `eventId` en cache de dedup
5. **No escribir valores `undefined` en Firestore** — build objects condicionalmente
6. **No ignorar rate limits de Shopify** — REST: 2 req/s, GraphQL: leaky bucket ~50 cost/s
7. **No hacer `rawBody` parsing manual** — ya configurado en Express setup para HMAC

##### AL AGREGAR NUEVA INTEGRACIÓN — Guía Completa

El backend usa el patrón **Strategy + Manager con auto-discovery**. Para agregar una nueva integración, seguir estos pasos exactos:

**Paso 1: Crear el Provider** (archivo `*Provider.js` en la carpeta del dominio)

```javascript
// services/{dominio}/providers/nuevoProvider.js
// IMPORTANTE: El nombre del archivo DEBE terminar en "Provider.js" y NO empezar con "_"
// El manager lo descubre automáticamente con fs.readdirSync("*Provider.js")

const BaseProvider = require('./_baseProvider');  // Importar la base class del dominio

class NuevoProvider extends BaseProvider {
    constructor() {
        super();
        this.providerName = 'nuevo';         // OBLIGATORIO: Identificador único, lowercase
        this.defaultTimeout = 30000;          // 30 segundos
        this.maxRetries = 3;
        this.retryDelay = 1000;               // 1s inicial, exponencial
        this.defaultApiUrl = 'https://api.nuevo.com/v1';
    }

    // Validar config antes de cualquier operación
    #validateConfig(config) {
        if (!config) throw new Error('Config es requerida');
        if (!config.apiKey) throw new Error('apiKey es requerida');
    }

    // Construir headers para la API externa
    #buildHeaders(config) {
        return {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    // Hacer request con retry y timeout
    async #makeRequest(method, url, data, headers, config, httpClient) {
        const timeout = config.timeout || this.defaultTimeout;
        try {
            const response = await httpClient.request({
                method, url, data, headers, timeout
            });
            return response;
        } catch (error) {
            const categorized = this.#categorizeError(error);
            if (categorized.retryable) {
                // Retry con exponential backoff
                for (let i = 0; i < this.maxRetries; i++) {
                    await new Promise(r => setTimeout(r, this.retryDelay * Math.pow(2, i)));
                    try {
                        return await httpClient.request({ method, url, data, headers, timeout });
                    } catch (retryErr) { /* continue */ }
                }
            }
            throw error;
        }
    }

    // OBLIGATORIO: Categorizar errores para el manager
    #categorizeError(error) {
        const status = error?.response?.status;
        if (!status || status === 0) return { type: 'NETWORK', code: 'NETWORK_ERROR', message: error.message, retryable: true };
        if (status === 401 || status === 403) return { type: 'AUTH', code: 'AUTH_ERROR', message: 'Credenciales inválidas', retryable: false };
        if (status === 422 || status === 400) return { type: 'VALIDATION', code: 'VALIDATION_ERROR', message: error.response?.data?.message || error.message, retryable: false };
        if (status === 429) return { type: 'RATE_LIMIT', code: 'RATE_LIMIT', message: 'Rate limit excedido', retryable: true };
        if (status >= 500) return { type: 'SERVER', code: 'SERVER_ERROR', message: error.message, retryable: true };
        return { type: 'OTHER', code: 'UNKNOWN', message: error.message, retryable: false };
    }

    // Implementar los métodos de la base class
    // SIEMPRE retornar el formato normalizado:
    async operacion(params, config, httpClient, companyId, options = {}) {
        this.#validateConfig(config);
        try {
            const result = await this.#makeRequest(/*...*/);
            return {
                success: true,
                provider: this.providerName,
                // ...datos específicos de la operación
            };
        } catch (error) {
            const categorized = this.#categorizeError(error);
            return {
                success: false,
                provider: this.providerName,
                error: categorized.message,
                errorCode: categorized.code,
                errorType: categorized.type,
                retryable: categorized.retryable
            };
        }
    }
}

// OBLIGATORIO: Exportar instancia (para shipping/fulfillment) o clase (para ecommerce)
module.exports = new NuevoProvider();
```

**Paso 2: Agregar schema en `integrationConfigService.js`**

```javascript
// En PROVIDER_SCHEMAS agregar:
nuevo: {
    required: ['apiKey', 'apiUrl'],           // Campos obligatorios
    optional: ['testMode', 'webhookSecret'],  // Campos opcionales
    sensitive: ['apiKey', 'webhookSecret'],    // Se encriptan con AES-256-CBC
},
```

**Paso 3: Crear router y controller**

```javascript
// routers/nuevoIntegration.js
const router = express.Router();
const controller = require('../controllers/nuevoController');
const { isAuth } = require('../middleware/auth');

router.get('/status', isAuth, controller.getStatus);
router.post('/sync', isAuth, controller.sync);
// Si tiene webhooks (sin auth, con HMAC):
router.post('/webhook', controller.handleWebhook);

module.exports = router;
```

```javascript
// controllers/nuevoController.js
const manager = require('../services/{dominio}Manager');

exports.getStatus = async (req, res) => {
    try {
        const companyId = req.headers.company;
        const result = await manager.getStatus(companyId, 'nuevo');
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
```

**Paso 4: Registrar router en `index.js`**

```javascript
app.use('/v1/nuevo', require('./routers/nuevoIntegration'));
```

**Paso 5: Si tiene webhooks, agregar validación HMAC en `webhookSecurityService.js`**

```javascript
// En el switch de validateSignature(), agregar caso:
case 'nuevo':
    const hmac = crypto.createHmac('sha256', config.webhookSecret);
    hmac.update(rawBody);
    const expected = hmac.digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
```

**Paso 6: Frontend — Agregar en IntegrationsComponent**

El frontend auto-detecta providers desde la API `/v1/integration/config`. Solo agregar:
- Logo en `src/assets/images/logos/nuevo.svg`
- Traducción en `src/assets/i18n/es.json`: `"Nuevo Provider": "Nuevo Provider"`

**Checklist de calidad:**

- [ ] Provider file termina en `Provider.js` y NO empieza con `_`
- [ ] `providerName` es lowercase y único
- [ ] Implementa `#categorizeError()` con tipos: NETWORK, AUTH, VALIDATION, RATE_LIMIT, SERVER
- [ ] Retorna formato normalizado: `{ success, provider, ...data, error?, retryable? }`
- [ ] `#validateConfig()` valida campos requeridos antes de operar
- [ ] Schema agregado en `PROVIDER_SCHEMAS` de integrationConfigService
- [ ] Campos sensibles marcados en `sensitive` array (se encriptan)
- [ ] Si tiene webhooks: HMAC validation + timing-safe comparison
- [ ] Logging con emojis del patrón existente: 📦 inicio, ✅ éxito, ❌ error
- [ ] No escribe valores `undefined` a Firestore

---

## Mapa de Integraciones — Patrones por Proveedor

### Tabla Resumen

| Proveedor | Auth | Patrón | Base Class | Dirección | Error Handling | Cache | Rate Limit |
|-----------|------|--------|-----------|-----------|---------------|-------|-----------|
| **Shopify** | OAuth 2.0 Bearer | Strategy (wrapper) | — | Bidireccional | Axios interceptor + retry | Client 5min + counters | Header-aware (2 req/s REST, leaky bucket GraphQL) |
| **WooCommerce** | OAuth 1.0a Basic | Strategy (wrapper) | — | Bidireccional | Service-level | Service | Per-request |
| **Aliaddo** | OAuth 2.0 Bearer | Strategy | BaseFulfillmentProvider | Bidireccional | `#categorizeError()` + 3 retries exponential | Map 30min + tokens | ResilientHttpClient |
| **SIIGO** | OAuth 2.0 user+key | Strategy | BaseAccountingProvider | Katuq→SIIGO | `#categorizeError()` + 3 retries | Map 24h + tokens | ResilientHttpClient |
| **World Office** | JWT estático | Strategy | BaseAccountingProvider | Katuq→WO + DIAN | `#categorizeError()` + 3 retries | Map 7d + masterData | 500 req/s |
| **Wompi** | API Key | Simple provider | BasePaymentProvider | Katuq→Wompi + webhook | Try/catch básico | Ninguno | Ninguno |
| **Enviame** | API Key Bearer | Strategy | BaseShippingProvider | Bidireccional | Fallback a default warehouse | Warehouse config | 30s timeout |
| **Prindel** | API Key/Token | Strategy | BaseShippingProvider | Bidireccional | Base-level | — | 30s timeout |
| **MCP** | OAuth 2.0 DCR + API Key | Server SDK | — | Client→Server | Tool-level | — | — |

### Detalle por Integración

#### Shopify — La más compleja

```
Frontend: IntegrationsService → POST /v1/integration/config (config CRUD)
Backend:  ecommerceAdapter → shopifyProvider → shopifyProductService
                                             → shopifyInventoryService
                                             → shopifyGraphqlService (leaky bucket ~50 cost/s)
                                             → shopifyApiService (2 req/s, client cache 5min)
Webhooks: shopifyWebhookMiddleware (HMAC-SHA256) → shopifyWebhook controller
          11 topics: orders(create/update/cancel), products(create/update/delete),
          fulfillments(create/update), inventory_levels/update, refunds/create
GID:      Usar numericId(), NO fromGid() para IDs simples
Echo:     syncLockMap con ventana de 30s previene loops infinitos de inventario
Fallback: UPDATE sin integración ID → automáticamente intenta CREATE
```

#### Aliaddo — Fulfillment externo

```
Frontend: FulfillmentService → GET/POST /v1/fulfillment/* (stock, sync, import)
Backend:  fulfillmentManager → aliaddoProvider (extiende BaseFulfillmentProvider)
          → fulfillmentOrderService (determina si orden debe sync: origenFulfillment=true)
          → fulfillmentSyncService (reconcilia stock Katuq vs Aliaddo)
API:      https://app.aliaddo.net/v1 — Bearer token (persistente, no expira)
ID Map:   Katuq Firestore ID → integrations.fulfillment.id (Aliaddo UUID)
Bodega:   Match por fulfillmentId (UUID) o idBodega (código)
Precio:   priceSell > priceBuy (fallback si priceSell = 0)
Movimientos: INGRESO_COMPRA, SALIDA_VENTA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, INGRESO_FULFILLMENT
```

#### SIIGO — Facturación electrónica DIAN

```
Frontend: FacturacionService → POST /v1/invoice/siigo/invoice/create (legacy)
          IntegrationsService → POST /v1/accounting/siigo/invoices/from-order-async (nuevo, async)
Backend:  accountingManager → siigoProvider (extiende BaseAccountingProvider)
          → siigoDataMapper (Katuq Pedido → SIIGO Invoice)
API:      https://api.siigo.com/v1 — OAuth 2.0 (username + access_key, 24h expiry)
Headers:  Partner-Id: 'Katuq'
Auto:     Pedido con estadoPago=Aprobado → crea factura en background
IVA:      Mapea precioUnitarioIva ("19") a tax IDs de SIIGO (ej: 6856)
⚠️ HARDCODED: Document type 27391, Seller 329 (en FacturacionService frontend)
```

#### Wompi — Pasarela de pagos colombiana

```
Frontend: PaymentService → WidgetCheckout (⚠️ DIRECTO, no proxy backend)
          Usa public_key embebida en environment.ts
Backend:  paymentGateway → wompiProvider (extiende BasePaymentProvider)
          → generatePaymentLink() — POST /v1/payment_links
          → verifyTransaction() — GET /v1/transactions/{id}
API:      https://api.wompi.co/v1
Integrity: SHA256(reference + amountInCents + currency + integritySecret)
Montos:   Siempre en centavos COP (× 100)
Webhook:  x-event-checksum — properties dotted-path + timestamp + secret
Callback: /payment-callback (frontend route)
⚠️ DIRECTO: Frontend llama Wompi directamente (no proxy), solo backend para verificación
```

#### Enviame — Carrier de envíos

```
Frontend: LogisticaServiceV2 → GET/POST /v1/logistica/* (cache 5min manual)
Backend:  logisticsManager → enviameProvider (extiende BaseShippingProvider)
          → ResilientHttpClient (circuit breaker + retry)
          → ResponseNormalizer (estandariza respuestas de carriers)
API:      Bearer token con apiKey
Webhook:  enviameWebhook.js → status updates de envíos
Bodega:   Valida existencia en Enviame antes de crear envío
Dirección: Parser colombiano (calle, barrio, ciudad DANE)
```

#### Notificaciones — Sistema Smart

```
Backend:  notificationHooks.js → detecta cambios de estado del pedido
          notificationQueue.js → 5 workers concurrentes, 30s timeout
          CircuitBreaker.js → 5 fallas → OPEN, 60s → HALF_OPEN, 3 éxitos → CLOSED
          emailTemplates.js → 10+ templates HTML con branding
Queue:    AWS SQS (primario) → Firestore (fallback)
Estados:  Solo customer-facing: ProducidoTotalmente, Despachado, Entregado, Rechazado, Aprobado
Feature:  ENABLE_ORDER_NOTIFICATIONS=false (actualmente DESHABILITADO)
```

#### Credenciales — IntegrationConfigService

```
Backend:  integrationConfigService.js — hub centralizado para TODAS las integraciones
Storage:  integration_configs (public) + integration_secrets (encriptado AES-256-CBC)
Cache:    5min TTL por company/provider
Audit:    config_audit collection (changelog de modificaciones)
⚠️ BUG:  Default encryption key hardcodeada si env var falta
⚠️ FALTA: Key rotation mechanism
```

#### Webhook Security — Validación centralizada

```
Backend:  webhookSecurityService.js — valida HMAC por proveedor
Shopify:     HMAC-SHA256 via x-shopify-hmac-sha256 (base64)
WooCommerce: HMAC-SHA256 via x-wc-webhook-signature (base64)
Wompi:       SHA256 via x-event-checksum (properties + timestamp)
ePayco:      SHA256 via x_signature (field en payload)
VirtualStore: Bearer token match
Dedup:    In-memory cache 10K eventos, 1hr TTL (⚠️ se pierde en restart)
Seguridad: crypto.timingSafeEqual() para comparación timing-safe
```

### Inconsistencias Detectadas

| # | Área | Problema | Impacto |
|---|------|----------|---------|
| 1 | **BaseService.ts** | Usa `environment.apiUrl` (undefined) en lugar de `environment.urlApi` | Solo funciona porque interceptor agrega headers por URL pattern |
| 2 | **Company ID** | IntegrationsService lee de localStorage; LogisticaServiceV2 depende de Bearer token | Inconsistencia en contexto multi-tenant |
| 3 | **Wompi frontend** | Llama API directamente (no proxy) con public_key embebida | Exposición de keys, sin control backend |
| 4 | **Gemini frontend** | API key embebida en environment.ts | Seguridad — debería proxy por backend |
| 5 | **Error handling** | Aliaddo/SIIGO: `#categorizeError()` sofisticado; Wompi: try/catch básico | Sin contrato unificado de errores |
| 6 | **Caching** | IntegrationsService: LRU con stats; LogisticaServiceV2: Map manual; Fulfillment: ninguno | Sin estrategia consistente |
| 7 | **Rate limiting** | Shopify: header-aware; ResilientHttpClient: token bucket; Wompi: ninguno | Diferentes estrategias por proveedor |
| 8 | **Auth patterns** | OAuth 2.0, API Key, Basic Auth, Bearer — sin capa de abstracción | 4 mecanismos de auth coexisten |
| 9 | **Retry logic** | Backend: 3 retries exponential (Aliaddo, SIIGO); Frontend: ninguno | Frontend falla silenciosamente |
| 10 | **Dedup webhooks** | In-memory cache se pierde en restart del servidor | Puede procesar webhooks duplicados post-deploy |
| 11 | **SIIGO hardcoded** | Document type 27391, Seller 329 en frontend FacturacionService | Debería ser configurable por empresa |
| 12 | **Code duplication** | ShopifyProvider wraps shopifyProductService; WoocommerceProvider wraps woocommerceService | Dos capas innecesarias |

### Diagrama de Flujo de Datos

```
                    ┌─────────────────────────────────────────┐
                    │          KATUQ FRONTEND (Angular)        │
                    │                                         │
                    │  IntegrationsService ──┐                │
                    │  FulfillmentService  ──┤ HttpClient     │
                    │  FacturacionService  ──┤ + Interceptor  │
                    │  LogisticaServiceV2  ──┘ (Bearer token) │
                    │                                         │
                    │  PaymentService ─────── Wompi Widget ◄──┤── DIRECTO (no proxy)
                    │  KatuqIntelligence ──── Gemini SSE  ◄───┤── DIRECTO (API key)
                    └────────────┬────────────────────────────┘
                                 │ HTTP + Auth Headers
                                 ▼
                    ┌─────────────────────────────────────────┐
                    │       KATUQ BACKEND (Express/Node)       │
                    │                                         │
                    │  ┌─── Middleware Chain ─────────────┐   │
                    │  │ Helmet → CORS → JSON → Auth →    │   │
                    │  │ MultiTenant → UsageTracker       │   │
                    │  └─────────────────────────────────-┘   │
                    │                                         │
                    │  ┌─── Managers (Strategy Pattern) ──┐   │
                    │  │ ecommerceAdapter ─┬─ shopifyProv  │   │
                    │  │                  └─ woocommProv   │   │
                    │  │ fulfillmentMgr ──── aliaddoProv   │   │
                    │  │ accountingMgr ───── siigoProv     │   │
                    │  │ logisticsMgr ──┬─── enviameProv   │   │
                    │  │               └─── prindelProv    │   │
                    │  │ paymentGateway ─┬── wompiProv     │   │
                    │  │                └── epaycoProv     │   │
                    │  └──────────────────────────────────┘   │
                    │                                         │
                    │  integrationConfigService ◄── Firestore │
                    │  (credentials: AES-256-CBC encrypted)   │
                    │                                         │
                    │  webhookSecurityService ◄── Webhooks    │
                    │  (HMAC validation per provider)         │
                    │                                         │
                    │  notificationHooks ──► SQS/Firestore    │
                    │  (smart state detection)                │
                    └─────────────────────────────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     ┌────────────┐    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
     │  Shopify    │    │   Aliaddo    │     │    SIIGO     │     │ World Office │
     │  GraphQL +  │    │   REST API   │     │   REST API   │     │  REST API +  │
     │  Webhooks   │    │   Webhooks   │     │   (no hooks) │     │  DIAN (2-step│
     └────────────┘    └──────────────┘     └──────────────┘     └──────────────┘
            │                    │
            ▼                    ▼
     ┌────────────┐    ┌──────────────┐
     │  Enviame   │    │   Wompi      │
     │  Webhooks  │    │   Webhooks   │
     └────────────┘    └──────────────┘
```

#### World Office — Facturación Electrónica DIAN (2 pasos)

```
Frontend: IntegrationsService → POST /v1/integration/config (config CRUD)
          list.component.ts → checkInvoicingIntegration() detecta WO
Backend:  accountingManager → worldOfficeProvider (extiende BaseAccountingProvider)
          → worldOfficeDataMapper (Katuq Pedido → WO Documento)
API:      https://api.worldoffice.cloud/api/v1
Auth:     JWT estático (obtenido del panel WO) — Header: Authorization: Bearer {jwt}
          NO es OAuth — el token no expira automáticamente

Facturación (2 pasos, diferente a SIIGO):
  Paso 1: POST /api/v1/documentos        → Crear documento tipo "FV" → retorna { id }
  Paso 2: POST /api/v1/documentos/facturaElectronica/{id} → Enviar a DIAN
  Paso 3: GET  /api/v1/documentos/visualizarDocumento/{id} → PDF (opcional)

Paginación: TODOS los GET requieren query param 'paginacionWo' como JSON:
  { "columnaOrdenar": "id", "pagina": 1, "registrosPorPagina": 100, "orden": "ASC" }

Campos REQUERIDOS para crear documento (CrearDocumentoEncabezadoPojo):
  fecha, prefijo (ID numérico), documentoTipo ("FV"), idEmpresa, idTerceroExterno,
  idTerceroInterno, idFormaPago, idMoneda, porcentajeDescuento (bool),
  porcentajeTodosRenglones (bool), renglones[]

Renglones REQUERIDOS:
  idInventario, unidadMedida (código), cantidad, valorUnitario, valorTotal, idBodega

Campos REQUERIDOS para crear tercero (CrearTerceroAPIPojo):
  idTerceroTipoIdentificacion, identificacion, primerNombre, primerApellido,
  direccion, idCiudad (ID numérico de ciudad en WO)

Campos REQUERIDOS para crear inventario (CrearInventarioPojo):
  codigo, descripcion, idUnidadMedida, idInventarioClasificacion,
  idCentroCosto, idInventarioGrupo, idInventarioTipoImpuestoVenta, idContabilizacion

Config necesaria (integrationConfigService schema):
  required: apiToken, idEmpresa
  optional: idTerceroInterno, idFormaPago, prefijo, idMoneda, idBodega,
            idCiudadDefault, unidadMedidaDefault, concepto, sendToDian, sendEmail,
            enableAutoInvoicing, testMode

Documentación API: https://developer.worldoffice.cloud/documentacion.html#/
Swagger JSON:      https://developer.worldoffice.cloud/swagger.json
```

---

## Buenas Prácticas de Integración — Estándares de Calidad

> Estas reglas aplican para TODA nueva integración con proveedores externos.
> Seguir estos estándares garantiza consistencia, mantenibilidad y confiabilidad.

### 1. Siempre Leer la Documentación API Primero

- **ANTES de escribir código**, obtener la especificación completa de la API (Swagger/OpenAPI si existe)
- Verificar campos **requeridos vs opcionales** de cada endpoint — no asumir
- Documentar las URLs, auth, rate limits y formatos de respuesta en CLAUDE.md
- Si la API tiene paginación obligatoria (como World Office), implementarla desde el inicio

### 2. Strategy Pattern Obligatorio

Todo proveedor externo se integra mediante el **Strategy Pattern**:

```
BaseProvider (contrato/interfaz)
  └── ConcreteProvider (implementación específica)
        └── DataMapper (transformaciones de datos)
```

**Checklist de un nuevo provider:**
- [ ] Archivo termina en `Provider.js`, NO empieza con `_`
- [ ] Extiende la base class del dominio (`BaseAccountingProvider`, `BaseShippingProvider`, etc.)
- [ ] Implementa `providerName` como string lowercase único
- [ ] Implementa `#validateConfig()`, `#buildHeaders()`, `#makeRequest()`, `#categorizeError()`
- [ ] Implementa `findOrCreateCustomer()` y `findOrCreateProduct()` si el Manager los llama
- [ ] DataMapper tiene método `mapOrderToInvoice()` (o equivalente que el Manager espere)
- [ ] Schema agregado en `PROVIDER_SCHEMAS` de `integrationConfigService.js`
- [ ] Provider agregado en `supportedProviders` del router correspondiente
- [ ] Manager selecciona DataMapper dinámicamente (NO hardcodear un mapper específico)

### 3. Error Handling Estandarizado

Todo provider DEBE implementar `#categorizeError()` que retorne:

```javascript
{
    code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SERVER_ERROR',
    type: 'NETWORK' | 'AUTH' | 'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SERVER',
    message: string,       // Mensaje legible para logs/UI
    retryable: boolean,    // ¿Se puede reintentar?
    details?: any          // Errores de validación del API
}
```

**Retries**: Implementar exponential backoff con jitter para errores retryable (429, 5xx, network).

### 4. Respuestas Normalizadas

Todo método público DEBE retornar formato consistente:

```javascript
// Éxito:
{ success: true, provider: 'nombre', ...datos, timestamp: new Date().toISOString() }

// Error:
{ success: false, provider: 'nombre', error: msg, errorCode: code, errorType: type, retryable: bool }
```

**NUNCA** retornar `undefined` como valor de campo — omitir el campo o usar `null`.

### 5. Configuración y Seguridad

- **Credenciales sensibles** (tokens, keys, secrets) van en `sensitive[]` del schema → se encriptan con AES-256-CBC
- **NUNCA** hardcodear credenciales en código — siempre leer de `integrationConfigService.getConfig()`
- **NUNCA** exponer secrets en logs — usar `includeSecrets=false` por defecto
- Validar config con `#validateConfig()` al inicio de CADA método público

### 6. Cache Strategy

| Tipo de dato | TTL recomendado | Ejemplo |
|-------------|----------------|---------|
| Tokens de auth | Hasta expiración - 5min buffer | OAuth tokens |
| Datos maestros (impuestos, cuentas, tipos) | 7 días | `GET /taxes`, `GET /accounts` |
| Listas de precios | 7 días | `GET /price-lists` |
| Datos operacionales (clientes, productos) | Sin cache o 5min | Búsquedas por ID |
| Configuración de integración | 5 min (ya manejado por integrationConfigService) | Config por company |

### 7. Frontend — Agregar Nueva Integración al Modal

Al agregar un provider al frontend, modificar estos **5 puntos exactos**:

| # | Archivo | Método/Sección | Cambio |
|---|---------|---------------|--------|
| 1 | `integrations.service.ts` | `getCategoryForProvider()` | Agregar `case 'nuevo':` |
| 2 | `integrations.service.ts` | `getAvailableIntegrations()` | Agregar entrada en categoría |
| 3 | `integrations.component.ts` | `resetForm()` + `editIntegration()` | Agregar `case` en ambos switches |
| 4 | `integrations.component.ts` | `createNuevoForm()` + `buildCredentials()` | Crear form + mapear campos |
| 5 | `integrations.component.html` | `*ngIf="selectedIntegrationType === 'nuevo'"` | Agregar sección de formulario |

**Regla de oro**: Todo `formControlName` en el HTML DEBE existir en el `FormGroup`. Verificar con:
```bash
# Campos en HTML
grep -o 'formControlName="[^"]*"' integrations.component.html | sort -u
# Campos en FormGroup
grep -A30 "createNuevoForm" integrations.component.ts | grep -E "^\s+\w+:"
```

### 8. Facturación Multi-Provider

El `accountingManager.createInvoiceFromOrder()` es el orquestador genérico. Para que un nuevo provider contable funcione con facturación:

1. **Provider** debe implementar: `findOrCreateCustomer()`, `findOrCreateProduct()`, `createInvoice()`
2. **DataMapper** debe implementar: `mapOrderToInvoice(pedido, invoiceConfig)` (interfaz que el Manager llama)
3. **Manager** debe tener el mapper registrado en `dataMappers`:
   ```javascript
   const dataMappers = {
       siigo: () => require('./utils/siigoDataMapper'),
       world_office: () => require('./utils/worldOfficeDataMapper'),
       nuevo: () => require('./utils/nuevoDataMapper'),  // ← agregar aquí
   };
   ```
4. **Frontend** `list.component.ts` debe detectar el provider en `checkInvoicingIntegration()` y enrutarlo via `createAccountingInvoiceFromOrder(provider, orderId)`

### 9. Documentación de APIs Externas

Al integrar un API externo, documentar en CLAUDE.md:

```markdown
#### NombreProvider — Descripción corta
Base URL: https://api.ejemplo.com
Auth: [tipo] — [detalles]
Rate Limit: [límites]
Documentación: [URL]

Endpoints principales:
  POST /recurso     → Crear
  GET  /recurso     → Listar (paginación: [formato])
  GET  /recurso/{id} → Obtener
  PUT  /recurso/{id} → Actualizar

Campos REQUERIDOS para [operación principal]:
  [lista de campos con tipos]

Diferencias clave con otros providers:
  [lo que hace diferente a este provider]
```

### 10. Testing de Integraciones

Aunque `skipTests: true` está activo en este proyecto, al desarrollar integraciones:

- Usar `POST /v1/accounting/:provider/test` para validar conexión antes de operar
- Implementar `testMode` en config para usar ambientes sandbox cuando existan
- Probar el flujo completo: config → test connection → create customer → create invoice
- Verificar que errores de API se categorizan correctamente (401→AUTH, 422→VALIDATION, etc.)
