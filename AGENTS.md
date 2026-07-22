# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Desarrollo local (servidor Angular + backend Node en localhost:3300)
npm start                    # Dev server con 4GB de memoria
npm run start:8gb            # Dev server con 8GB (para equipos con más RAM)

# Build
npm run build                # Build de desarrollo
npm run build:prod           # Build de producción con 8GB (actualiza versión automáticamente)

# Deploy
npm run release              # Build prod + deploy a Firebase Hosting (dist/cuba)

# Versión
npm run update-version       # Incrementa versión en environment.ts y environment.prod.ts
                             # Formato: YYYY.MM.DD.buildNumber (ej: 2026.03.28.1)

# Lint
npm run lint
```

El build de producción siempre pasa por `prebuild:prod` → `update-version.js` que auto-incrementa la versión en ambos archivos de environment.

## Arquitectura

### Stack principal
- **Frontend**: Angular 14, TypeScript, SCSS
- **Backend principal**: Express/Node.js (repositorio separado, corre en `localhost:3300`)
- **ADK Backend**: Python/Flask para AI streaming (`localhost:8080`)
- **Base de datos**: Firebase Firestore + Realtime Database (via `@angular/fire`)
- **Deploy**: Firebase Hosting → `dist/cuba`

### Multi-tenant
Cada empresa (tenant) tiene sus propios datos. El usuario logueado lleva:
- `localStorage['user']` → token JWT, `company` (ID empresa), `nit`, `email`, `authorizationCode`, `rol`
- `localStorage['currentCompany']` → info de la empresa activa (`CompanyInformation`)

El interceptor HTTP (`HttpInterceptor2`) adjunta automáticamente `Authorization`, `company`, `user`, `usage-code` en cada request al backend de Katuq. Los endpoints 401/403 hacen logout y redirigen a `/login`.

### Capas de servicios

**`BaseService`** — clase base HTTP. Todos los servicios de dominio extienden de aquí. Lee `environment.urlApi` y expone `get<T>`, `post<T>`, `put<T>`, `delete<T>` con la URL base prepended.

**`ServiciosService`** — servicio legacy previo a BaseService. Contiene muchos métodos HTTP con `.toPromise()`. No extender; los servicios nuevos deben usar `BaseService`.

**`SecurityService`** — fuente de verdad para el contexto de empresa activa. Expone `getCompanyInformationLogged()` y `companyInformation$` (BehaviorSubject).

**`VentasService extends BaseService`** — todos los endpoints de pedidos/órdenes (`/v1/orders/*`), despachos, transportadores, POS, búsqueda de productos.

**`PedidosUtilService`** — carga y cachea los "maestros" (formaEntrega, tiempoEntrega, tipoEntrega, ocasiones, géneros, formasPago, categorías, adiciones) al hacer login. Se inicializa via `InitializationService` después del login.

**`NavService`** — sidebar navigation. Define la estructura del menú. `isSuperAdmin` se lee de `localStorage['user'].rol === 'Super Administrador'`.

### Routing y guards
- Todas las rutas protegidas usan `AuthGuard` (verifica `authService.isLoggedIn`)
- `AdminGuard` → solo para `/superadmin`
- `SubscriptionGuard` + `data: { requiresPremium: true }` → rutas premium (ej: producción)
- Todos los módulos son lazy-loaded via `loadChildren`

### Módulo de ventas (el más complejo)
Flujo principal: `crear-ventas` orquesta el ciclo de venta asistida:
1. `EcomerceProductsComponent` — catálogo de productos con búsqueda paginada del servidor
2. `CarritoComponent` — carrito activo
3. `CheckOutComponent` — checkout con datos de entrega
4. `PedidoEntregaComponent` / `PedidoFacturacionComponent` — entrega y facturación

El componente `crear-ventas` puede auto-invocar facturación electrónica (SIIGO/World Office) si `generarFacturaElectronica` está habilitado en la empresa.

### Sistema de tools para AI
`ToolRegistryService` mantiene un mapa de herramientas registradas. Los registradores implementan el token `TOOL_REGISTRARS`. El adaptador se inyecta via `TOOL_ADAPTER` (InjectionToken). Esto alimenta los voice/video agents y el KAI backend.

### AI / Agentes
- **Gemini Live**: `LiveAudioModule` / `GeminiAudioModule` para voz en tiempo real
- **Voice Agent**: `VoiceAgentModule` para ventas por voz
- **Video Agent**: `VideoAgentModule` con KAI backend (GCP Cloud Run) vía WebSocket
- **KAI Backend**: `adkBackendApi` (Python ADK) para AI streaming

### UI
Bootstrap 5 + PrimeNG 14 + ng-bootstrap. SweetAlert2 para diálogos de confirmación/progreso. ngx-toastr para notificaciones. Feather Icons + PrimeIcons + Font Awesome. El Service Worker está **desactivado** (comentado en `app.module.ts`).

### Entornos
- `environment.ts` → development (apunta a `localhost:3300` por defecto)
- `environment.prod.ts` → producción (`back.katuq.com`)
- Cambiar `urlApi` en `environment.ts` para apuntar a producción en local

## Servicios locales y puertos

| Servicio | Puerto | Ubicación | Cómo iniciar |
|----------|--------|-----------|--------------|
| Angular Frontend | 4200 | `Seller.Katuq/` | `npm start` |
| Backend Express | 3300 | `katuq_admin_back_firebase/functions/` | `node index.js` |
| KAI Genkit (flows + REST + WS) | 3890/3891/3892 | `kai/functions/` | `npx tsx --watch src/index.ts` |
| ADK Python/Flask | 8080 | `kai/adk_agent/` | `python main.py` |

## Convenciones de IDs críticas

| Entidad | Campo | Tipo | Correcto |
|---------|-------|------|---------|
| Producto | `producto.cd` | Firestore doc ID | `"6RqOXgVGH95f2O6sC8yZ"` |
| Bodega (negocio) | `idBodega` | Business code | `"BOD-001"` |
| Bodega (Firestore) | `doc.id` | Firestore doc ID | `"eSnsrFum5v2Lc4ZY8ukS"` |
| Inventario | `idBodega` | Business code | `"BOD-001"` |

**REGLA CRÍTICA**: `inventory` e `inventoryMovement` usan business code en `idBodega`. NUNCA Firestore doc ID. Mezclarlos genera movimientos huérfanos y totales incorrectos.

**REGLA CRÍTICA — DOBLE CONTEO**: La colección `inventory` tiene registros legacy donde `productoId` es la referencia del producto (ej: `"JCR4021"`) en vez del Firestore doc ID. Para el mismo producto+bodega pueden existir DOS documentos (uno con cada formato). **SIEMPRE** que leas `inventory` y sumes cantidades, debes:
1. Construir mapa `normId`: referencia→docId (desde `products.identificacion.referencia`)
2. Normalizar `inv.productoId` con `normId.get(inv.productoId) || inv.productoId`
3. Deduplicar con Set de `"${normalizedId}_${inv.idBodega}"` — si ya existe, SKIP
Sin esto, los totales se inflan ~60%. Ver `calcularMetricasPorBodega` en `controllers/inventory.js` como referencia del patrón.

**REGLA CRÍTICA — AISLAMIENTO PRODUCTOS/PRECIOS (D-134)**: inventario puede leer `products` para resolver docId, referencia, SKU y nombre, pero NUNCA puede crear, editar, activar o desactivar productos/variantes, títulos, imágenes, categorías, flags comerciales, precios, precios por cliente o listas de precios. En Shopify solo puede mutar `InventoryLevel`/cantidad. Si no resuelve el producto, reporta y omite; no lo crea desde inventario.

OH MY STORE tiene dos flows mixtos activos hacia Shopify: `cereza-products-to-shopify-a5156643` (producto Katuq + producto Shopify + stock + Price Lists) y `katuq-web-to-shopify` (producto Shopify + stock no-Cereza). No aumentar su frecuencia, límite o cobertura para corregir stock. La publicación ampliada de existencias debe ir por camino stock-only, flag por empresa y kill switch independientes.

## Flujos críticos

### Pedido → Inventario
```
Frontend (crear-ventas) → POST /v1/orders/create
  → order.typeOrder = "E-commerce" | "POS"
  → order.bodegaId = business code ("BOD-001")
Backend → inventoryService.updateStock(order)
  → POS: updateByPOS() — directo por bodegaId
  → Canal: updateByChannel() — canal → bodegasAsociadas → resuelve → descuenta
  → Resultado: { success } — NO relanza error, la orden se crea igual
```

### Importación con KAI
```
Frontend (import-modal) → POST /v1/katuqintelligence/kai/column-mapping
  → Backend proxy → POST http://127.0.0.1:3890/columnMappingFlow (Genkit)
  → KAI analiza columnas con Gemini 2.5 Flash → retorna mappings con confidence scores
Frontend transforma datos → POST /v1/onboarding/import-{customers|products|inventory}
```

### Diagnóstico de inventario
- `/v1/inventory/diagnostico` — detecta inconsistencias
- `/v1/inventory/reparar` — correcciones masivas (con auditoría automática)
- Colección `inventory_audit` en Firestore para telemetría

## Decisiones de arquitectura activas

- **Sin cache extra**: optimizar queries/índices en origen en vez de agregar capas de cache.
- **Sin console.log de telemetría**: usar colecciones Firestore de auditoría o observabilidad estructurada.
- **Nunca eliminar auth middleware** del backend ni el interceptor del frontend.
- **CRM es híbrido**: sirve tanto para Katuq mismo (empresas como leads) como para cada empresa (sus clientes como leads).
- **SCSS de diseño**: no usar gradientes en cards/stats — estilo plano con `border-left` de color acento.
- **Módulos con SRP**: evitar componentes monolíticos; separar en módulos pequeños con responsabilidad única.
- **Servicios Angular para HTTP**: nunca `HttpClient` directo en componentes — el interceptor agrega auth headers.
- **Strategy Pattern en backend** para integraciones (providers + managers).
- **KAI (Genkit)** para IA, no llamadas directas a Gemini API. Flujos en `kai/functions/src/agents/`.
- **ADK** para agentes multi-departamento con AG-UI protocol. No mezclar ADK con Genkit.
- **Firestore transactions** para operaciones de inventario — evitar race conditions.
- **Write-set inventario cerrado**: `inventory`, `inventoryMovement`, idempotencia/auditoría permitida e `InventoryLevel` Shopify. `products` y precios permanecen read-only.
- **Multi-tenancy**: todas las queries filtradas por `companyId`.
- `formaEntrega` en despachos SIEMPRE de `carrito[0].configuracion.datosEntrega.formaEntrega`.
- `precioUnitarioIva` es un string porcentaje — verificar `_calculadoEnBackend` y `_precioManualOverride` antes de editar lógica de precios.
- **`inventoryService.js`** es de alto impacto: afecta POS, ventas, fulfillment y Shopify. Trazar flujo completo antes de modificar.

## Anti-patterns

| Anti-Pattern | Consecuencia |
|-------------|-------------|
| `HttpClient` directo en componente | Interceptor no agrega auth → 401 |
| Quitar auth middleware "temporalmente" | Endpoint expuesto sin protección |
| `console.log` para telemetría | Logs ilegibles, no queryables |
| Asumir causa de bug sin datos | Usar endpoint de diagnóstico primero |
| Firestore doc ID en `idBodega` | Movimientos huérfanos, totales incorrectos |
| Sumar `inventory` sin normalizar `productoId` | Doble conteo ~60% — hay docs con docId Y referencia para mismo producto+bodega |
| Reusar un flow mixto producto/precio para ampliar stock | Ejecuta también catálogo, imágenes o Price Lists y viola D-134 |
| Crear/corregir producto desde inventario | Puede pisar maestros y precios productivos |
| `setTimeout` para sync parent-child | Race conditions — usar callbacks/flags |
| Filtrar `active !== false` sin mostrar inactivos | Datos ocultos, confusión de usuario |
