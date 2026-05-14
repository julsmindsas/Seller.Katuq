# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🟢 Metodología activa: Spec-Driven Development (SDD)

**Este proyecto trabaja con SDD desde 2026-05-13.** Cualquier sesión de Claude DEBE respetar el flujo y la ceremonia. Si una sesión "se salta" SDD pone en riesgo el goal D-360-CLOSED y rompe la cadena de decisiones registradas.

### Lectura obligatoria al iniciar sesión (en este orden)
1. **`/SPEC-DRIVEN.md`** — manual canon del método (4 fases, EARS, contrato vivo, guardarrailes).
2. **`/specs/CONTRACT.md`** — contrato vivo: roadmap priorizado + decisiones D-001..D-XXX + bitácora. **Es el primer archivo a abrir**, nunca asumir nada antes de leerlo.
3. **`/specs/constitution.md`** — 15 artículos inmutables. Especialmente:
   - **Artículo XV v2 — Canónica de integraciones = INGLÉS (`integrations.<provider>`)**, NO `integraciones`. Ver `~/.claude/.../memory/canonical-integrations-english.md`.
   - **Artículo XIII** — specs ≤ 3 páginas. Si crece, partir en sub-specs.
4. **`/specs/002-flows-osmosis-shopify-marco/findings.md`** — datos REALES de OH MY STORE (productos, bodegas, flows, runs). Si una sesión asume algo del código sin chequear esto, corre riesgo de equivocarse como pasó en sesiones previas.

### Las 4 fases SDD (no se saltan)
1. **`spec.md`** — qué y por qué (criterios EARS, NFRs, sin tecnología). Checkpoint humano antes de planear.
2. **`plan.md`** — cómo (stack, contratos, fases, gates contra constitución). Checkpoint humano antes de tasks.
3. **`tasks.md`** — pasos atómicos paralelizables. Checkpoint humano antes de implementar.
4. **`implement`** — código que respeta las tasks aprobadas. Cualquier desvío se registra en CONTRACT.md.

### Ceremonia mínima por sesión
- **Al iniciar**: leer CONTRACT.md + última spec activa.
- **Al decidir algo no trivial**: registrar como D-XXX en CONTRACT.md con fecha y razón. Decisiones revertidas se marcan SUPERSEDED, no se borran.
- **Al hacer un cambio**: si toca código del 360 (Osmosis/Shopify/Webhook/inventario), debe haber spec aprobada.
- **Al cerrar**: actualizar CONTRACT.md con la bitácora de la sesión + commit con sello.

### Estructura de specs
```
/SPEC-DRIVEN.md                    ← manual canon
/specs/
├── README.md                      ← índice
├── constitution.md                ← principios inmutables (15 artículos)
├── CONTRACT.md                    ← roadmap + decisiones + bitácora (PRIMER archivo)
├── templates/                     ← spec/plan/tasks templates
├── 001-osmosis-webhook-inbound/   ← spec piloto, status: approved-pending-validation
├── 002-flows-osmosis-shopify-marco/  ← spec MARCO del 360 (D-360-CLOSED)
│   ├── spec.md
│   ├── findings.md                ← datos REALES verificados (NO asumir desde docs)
│   ├── sub-specs.md               ← roadmap de sub-specs hijas
│   └── runbook-debug-flow.md      ← snippets ejecutables reusables
└── 002.{1..6}-<slug>/             ← 6 sub-specs hijas (todas done excepto Fase 4 de 002.1)
```

### Memoria persistente vinculada
- `canonical-integrations-english.md` — REGLA DURA: campo en INGLÉS, no español.
- `oh-my-store-test-tenant.md` — `company` es string libre `"OH MY STORE"`, no docId.
- `cereza-osmosis-integration.md` — Osmosis = API de Cereza.
- `sdd-adoption.md` — adopción SDD desde 2026-05-13.

### Lo que NO se hace bajo SDD
- Cambiar comportamiento del 360 sin spec aprobada.
- Asumir desde docs viejos sin verificar contra Firestore real (usar el runbook).
- Decidir canónica entre español/inglés en cada sesión — está cerrado en INGLÉS, ver Artículo XV v2.
- Crear flows duplicados — ver Artículo VI (no acoplar UI a proveedor) y D-008/002.5.
- Ejecutar scripts de backfill sin `--dry-run` primero.

---

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
| `setTimeout` para sync parent-child | Race conditions — usar callbacks/flags |
| Filtrar `active !== false` sin mostrar inactivos | Datos ocultos, confusión de usuario |
