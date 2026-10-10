# AGENTS.md — Guía de trabajo de Seller.Katuq

Guía compartida para los agentes que trabajan en este repositorio. `CLAUDE.md` y `agent.md` remiten a este archivo para evitar reglas duplicadas. Comunicación y especificaciones en español; código e identificadores canónicos en inglés.

## Inicio de sesión y fuentes de verdad

Leer en este orden:

1. [`specs/CONTRACT.md`](specs/CONTRACT.md): contrato vivo, decisiones, bitácora y estado del trabajo. Revisar las entradas recientes y las decisiones del dominio afectado; el roadmap inicial puede conservar estados históricos.
2. [`SPEC-DRIVEN.md`](SPEC-DRIVEN.md): manual del método SDD.
3. [`specs/constitution.md`](specs/constitution.md): constitución; las enmiendas y excepciones deben estar registradas en el contrato.
4. [`openspec/config.yaml`](openspec/config.yaml): reglas obligatorias por artefacto, incluso sin comandos `/opsx:*`.
5. La spec y las tasks del trabajo activo en `openspec/changes/` o `specs/`.
6. Para Osmosis/Shopify/webhooks/inventario: [`findings.md`](specs/002-flows-osmosis-shopify-marco/findings.md) y su [`runbook`](specs/002-flows-osmosis-shopify-marco/runbook-debug-flow.md). Los findings son una fotografía fechada, no evidencia del estado actual: verificar los datos relevantes antes de corregir.
7. Para UI: [`openspec/specs/design-system/spec.md`](openspec/specs/design-system/spec.md).

Las decisiones aprobadas del contrato y las specs del dominio guían los cambios. Si una guía resume una regla antigua, contrastarla con su decisión vigente; no resolver contradicciones creando otra arquitectura. La memoria personal de un agente puede aportar contexto, pero las reglas compartidas deben estar en el repositorio.

## Método de trabajo: SDD y OpenSpec

SDD está adoptado desde 2026-05-13; OpenSpec lo instrumenta desde 2026-07-22 (D-130, adopción OpenSpec).

| Fase | Artefacto | Contenido | Checkpoint |
|------|-----------|-----------|------------|
| Especificar | `spec.md` / proposal + specs | Qué y por qué, EARS, NFRs, alcance; sin decisiones tecnológicas | Aprobación antes de planear |
| Planear | `plan.md` / design | Cómo, contratos, stack, fases y gates constitucionales | Aprobación antes de tasks |
| Descomponer | `tasks.md` | Pasos atómicos, dependencias y criterios de éxito | Aprobación antes de implementar |
| Implementar | Código y validación | Ejecutar las tasks aprobadas; registrar desvíos | Verificar antes de cerrar |

- `/opsx:propose "<idea>"` crea artefactos en `openspec/changes/<slug>/`; cada artefacto conserva su checkpoint humano.
- `/opsx:apply` implementa las tasks aprobadas.
- `/opsx:archive` consolida los deltas en `openspec/specs/`.
- `specs/` conserva el histórico aprobado; `CONTRACT.md` y `constitution.md` siguen siendo canon.
- Specs de máximo 3 páginas; dividir si crecen. No crear colecciones ni endpoints/módulos "v2" sin aprobación explícita.
- Cambios de comportamiento, especialmente del 360, requieren spec aprobada. Aplicar las exenciones de cambios triviales del manual; no inventar excepciones.
- En módulos sensibles (`orders`, inventario, consecutivos), aplicar un cambio a la vez con diff y aprobación según `openspec/config.yaml`.
- Registrar decisiones no triviales como D-XXX con fecha y razón; marcar las revertidas como SUPERSEDED, no borrarlas. Revisar los IDs existentes para evitar colisiones.
- Al cerrar una sesión sustantiva, actualizar la bitácora del contrato y seguir su convención de commit con sello.

## Reglas operativas y seguridad

Katuq está en producción con comercios reales. Leer el código y trazar el flujo frontend → interceptor → backend → Firestore antes de editar. Diagnosticar con evidencia; no atribuir un bug a una causa sin verificarla.

- Mantener auth middleware e interceptor; nunca retirarlos para probar.
- Webhooks: validar HMAC, idempotencia y persistencia del evento crudo según la constitución. No confiar en el payload para autorizar.
- No registrar tokens, credenciales ni datos personales completos; usar IDs o hashes y observabilidad estructurada.
- Backfills y migraciones de datos: ejecutar `--dry-run` primero.
- Toda tarea de código debe cerrar con build/compilación sin errores y los checks del cambio.
- Para cambios de backend, leer también las instrucciones de `katuq_admin_back_firebase`.

## Integraciones e inventario: guardarraíles críticos

### Campo canónico de integraciones

Usar `integrations.<provider>.*` en inglés (Artículo XV v2, D-009), nunca crear nuevas escrituras en `integraciones`. La lectura legacy y cualquier doble escritura temporal pertenecen al plan de migración aprobado `002.1`; no copiar schemas ciegamente. Campos copiados del proveedor en `snake_case`; derivados/internos en `camelCase`.

### Inventario no modifica productos ni precios (D-134)

Inventario puede leer `products` para resolver identidad, docId, referencia, SKU y nombre. Su write-set está cerrado: `inventory`, `inventoryMovement`, idempotencia/auditoría permitida e `InventoryLevel`/cantidad de la ubicación Shopify objetivo.

No crear, editar, activar o desactivar productos o variantes; títulos, descripciones, imágenes, categorías, flags comerciales, precios base, precios por cliente, catálogo o Price Lists. Si no se resuelve inequívocamente el producto/variante, registrar la inconsistencia y omitir la escritura.

OH MY STORE tiene los flows mixtos `cereza-products-to-shopify-a5156643` (producto Katuq + Shopify + stock + Price Lists) y `katuq-web-to-shopify` (producto Shopify + stock no-Cereza). No ampliar frecuencia, límites ni cobertura para corregir stock. Publicación ampliada de existencias: camino stock-only con flag por empresa, modo sombra y kill switch independientes.

Toda tarea de inventario/Shopify declara el write-set e incluye contract test que detecte escrituras fuera del alcance permitido. Las excepciones aprobadas, como D-371 para reintentos del flow mixto, solo aplican a su propuesta y alcance; no habilitan escrituras de catálogo desde inventario.

## Comandos

```bash
# Desarrollo local (Angular; backend según environment.ts)
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

Tanto `npm run build` como `npm run build:prod` incrementan la versión mediante `prebuild` y `prebuild:prod`. `npm run release` ejecuta `update-version`, compila producción y ejecuta `firebase deploy`. Revisar el diff de ambos environments después de compilar.

## Arquitectura

### Stack principal

- **Frontend**: Angular 14, TypeScript, SCSS
- **Backend principal**: Express/Node.js (repositorio separado, corre en `localhost:3300`)
- **ADK Backend**: Python/Flask para AI streaming (`localhost:8080`)
- **Base de datos**: Firebase Firestore + Realtime Database (via `@angular/fire`)
- **Deploy**: Firebase Hosting → `dist/cuba`

### Multi-tenant
Cada empresa (tenant) tiene sus propios datos. El usuario logueado lleva:

- `localStorage['user']` → token JWT, `company` (identificador de empresa; puede ser un string como `"OH MY STORE"`, no asumir docId), `nit`, `email`, `authorizationCode`, `rol`
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

### Tema visual canónico (D-131: design-system)

Aplicar `openspec/specs/design-system/spec.md`: acento `#5F3FE0`, tinta `#211F3A`, superficies lila, colores semánticos con fondo suave, radios 16/11/20px y sombras violeta difusas. Labels UPPERCASE muted; cards/stats/headers planos, sin gradientes ni border-left.

No introducir primarios paralelos (`#2196f3`, `#4361ee`, `#2563eb`, `#5c6ac4`, `#667eea`). La discrepancia con `_katuq-tokens.scss` (`#8b5cf6`) requiere propuesta OpenSpec antes de una migración masiva.

### Regla de diseño Katuq: pantallas nuevas y modernizadas (D-398, D-399, D-400)

Toda pantalla nueva, o vieja que se toque, debe verse como "Regístrese" y "Todos los pedidos": plana, con fondo lila, tarjetas blancas y el acento `#5F3FE0`. No se crean estilos sueltos por pantalla; se usa la base que corresponde:

| Tipo de pantalla | Base obligatoria | Decisión |
|------------------|------------------|----------|
| Pública, sin menú (login, contraseñas, términos, resultados de pago, 404) | `shared/components/publica/`: `<app-publica-marco>` + `@include publica-piezas` (`PublicaModule`) | D-398 |
| Interna de lista o configuración (encabezado, acciones, tabla PrimeNG) | `shared/styles/_config-pagina.scss`: `@include config-pagina`, clases `cfg-pagina`, `cfg-cabeza`, `cfg-eyebrow`, `cfg-titulo`, `cfg-sub`, `cfg-acciones`, `cfg-btn` (`--sec`, `--peligro`), `cfg-card`, `cfg-aviso`, `cfg-vacio` | D-400 |
| Cualquier otra interna | Tokens y patrones de `openspec/specs/design-system/spec.md` | D-131, D-399 |

**Prohibido en pantallas de producto:**

- `linear-gradient`/`radial-gradient` decorativos en fondos, cards, headers, botones, pestañas o textos (`background-clip: text`). Solo se permiten en `katuq-flow`, Regístrese, skeleton/shimmer, fades sobre imágenes y brillos animados (D-399).
- Primarios paralelos: los cinco de arriba y también los azules sueltos `#3b82f6`, `#1d4ed8`, `#6366f1`, `#1976d2`, `#7366ff` y `rgba(102,126,234,…)`.
- La plantilla vieja: títulos azules `fc-secondary fs-24`, botón principal verde `btn-success`, encabezados de color fuerte, bloques negros y `border-left` de acento.

**Cómo se ve:**

- Botón principal morado, botones secundarios blancos con borde y avisos en par color fuerte / fondo suave.
- Labels y cabeceras de tabla en UPPERCASE muted.
- Estado vacío con ícono, título y texto corto.
- Radios de 16/11/20 px.

**Modernizar cambia solo la presentación.** No se tocan columnas, filtros, eventos, modales, servicios, validaciones ni textos funcionales. Si el rediseño exige cambiar comportamiento, se hace en un cambio aparte con su spec.

**Trampas de CSS global** (vienen de `src/assets/scss/base/_reset.scss` y similares; pisan el SCSS del componente):

- `[class*="p-"]` fuerza el `font-size` de cualquier clase que contenga "p-" (por ejemplo `chip--`, `step-`, `top-`, `help-`, `map-`). Ningún nombre de clase nuevo debe contener "p-".
- `span.ng-star-inserted` pinta de azul todo `span` creado por `*ngIf`, así que todo span con texto lleva color y tamaño propios. En pestañas PrimeNG sobre morado plano, el título `.p-tabview-title` necesita `color: inherit` o no se ve.
- `h1 { font-size: 1.5rem !important }`: el tamaño del título va con `!important`.
- `button:focus` quita el outline. Devolverlo con `:focus-visible { outline: 3px solid #7C5CFF !important }`.
- `a` y `p` traen `letter-spacing`: neutralizarlo con `letter-spacing: normal`.

**Antes de cerrar un cambio de diseño:**

1. Build de producción sin errores.
2. Contar `(linear|radial)-gradient(` y los primarios prohibidos del módulo tocado: no deben subir.
3. Revisar cada pantalla en el navegador a 1440 y 390 px, sin scroll horizontal y sin texto invisible.
4. Registrar la decisión en `specs/CONTRACT.md`.

### Entornos

- `src/environments/environment.ts` → configuración de desarrollo; actualmente `urlApi` apunta a `https://back.katuq.com`.
- `src/environments/environment.prod.ts` → producción (`https://back.katuq.com`).
- Para usar el backend local, configurar `urlApi` en `environment.ts` a `http://localhost:3300`. Verificar el destino antes de probar operaciones de escritura.

## Servicios locales y puertos

| Servicio | Puerto | Ubicación | Cómo iniciar |
|----------|--------|-----------|--------------|
| Angular Frontend | 4200 | `Seller.Katuq/` | `npm start` |
| Backend Express | 3300 | `katuq_admin_back_firebase/functions/` | `node index.js` |
| ~~KAI Genkit~~ (**OBSOLETO desde D-257, 2026-09-03**; sigue en prod como `index` de pm2 root solo por los flows viejos) | 3890 | `kai/functions/` | no levantar para trabajo nuevo |
| ADK Python/Flask | 8080 | `kai/adk_agent/` | `python main.py` |

## Convenciones de IDs críticas

| Entidad | Campo | Tipo | Correcto |
|---------|-------|------|---------|
| Producto | `producto.cd` | Firestore doc ID | `"6RqOXgVGH95f2O6sC8yZ"` |
| Bodega (negocio) | `idBodega` | Business code | `"BOD-001"` |
| Bodega (Firestore) | `doc.id` | Firestore doc ID | `"eSnsrFum5v2Lc4ZY8ukS"` |
| Asociación canal-bodega | `bodegaId` | Firestore doc ID de bodega | Resolver a business code antes de escribir inventario |
| Inventario | `productoId` | Firestore doc ID; referencia en registros legacy | Normalizar antes de sumar |
| Inventario | `idBodega` | Business code | `"BOD-001"` |

**REGLA CRÍTICA**: `inventory` e `inventoryMovement` usan business code en `idBodega`. NUNCA Firestore doc ID. Mezclarlos genera movimientos huérfanos y totales incorrectos.

**REGLA CRÍTICA — DOBLE CONTEO**: La colección `inventory` tiene registros legacy donde `productoId` es la referencia del producto (ej: `"JCR4021"`) en vez del Firestore doc ID. Para el mismo producto+bodega pueden existir DOS documentos (uno con cada formato). **SIEMPRE** que leas `inventory` y sumes cantidades, debes:

1. Construir mapa `normId`: referencia→docId (desde `products.identificacion.referencia`)
2. Normalizar `inv.productoId` con `normId.get(inv.productoId) || inv.productoId`
3. Deduplicar con Set de `"${normalizedId}_${inv.idBodega}"` — si ya existe, SKIP

Sin esto, los totales pueden inflarse; la magnitud depende de los datos del tenant. Ver `calcularMetricasPorBodega` en `controllers/inventory.js` como referencia del patrón.

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
  → Backend arma el prompt (services/ai/columnMappingPrompts.js) → POST http://127.0.0.1:8080/api/ai/json (Opttia/ADK, Bedrock)
  → retorna mappings con confidence scores (D-257; Genkit ya no participa)
Frontend transforma datos → POST /v1/onboarding/import-{customers|products|inventory}
```

### Análisis IA de inventario

`POST /v1/katuqintelligence/kai/inventory-analysis` → prompt en `services/ai/prompts/inventarioPrompt.js` → `pedirJsonAOpttia` → ADK/Bedrock. Retorna `{ salud, resumen, sugerencias[] }`. Migrado según la adenda D-257; no usar `inventoryAnalysisFlow` de Genkit.

### Diagnóstico de inventario

- `/v1/inventory/diagnostico` — detecta inconsistencias
- `/v1/inventory/reparar` — correcciones masivas (con auditoría automática)
- Colección `inventory_audit` en Firestore para telemetría

## Decisiones de arquitectura activas

- **Sin cache extra**: optimizar queries/índices en origen en vez de agregar capas de cache.
- **Sin console.log de telemetría**: usar colecciones Firestore de auditoría o observabilidad estructurada.
- **Nunca eliminar auth middleware** del backend ni el interceptor del frontend.
- **CRM es híbrido**: sirve tanto para Katuq mismo (empresas como leads) como para cada empresa (sus clientes como leads).
- **SCSS de diseño**: no usar gradientes en cards/stats — estilo plano tintado según `openspec/specs/design-system/spec.md` (chips con fondo suave + borde lila; el patrón viejo de `border-left` de acento queda superseded por D-131).
- **Módulos con SRP**: evitar componentes monolíticos; separar en módulos pequeños con responsabilidad única.
- **Servicios Angular para HTTP**: nunca `HttpClient` directo en componentes — el interceptor agrega auth headers.
- **Strategy Pattern en backend** para integraciones (providers + managers).
- **IA vía Opttia/ADK (D-257 y adenda, 2026-09-03)**: no llamar directamente a modelos ni agregar flows a Genkit o usarlo como respaldo.
  - Una pasada (prompt → JSON): `services/ai/opttiaJson.js` (`pedirJsonAOpttia`) en el backend → `POST /api/ai/json` del ADK/Bedrock. Autenticación interna: `X-Bot-Token` con `WHATSAPP_BOT_TOKEN`; nunca exponer su valor.
  - Conversación: orquestadores del ADK para Telegram, WhatsApp, video/voz y multi-departamento. Un canal nuevo es un adaptador de transporte en `channels/<canal>/`; usar `channels/telegram/` como referencia.
  - Genkit es legacy. Verificar qué consumidores quedan en el código y migrarlos a ADK cuando se intervengan; no mezclar motores en un mismo caso de uso.
- **Dónde corre cada uno en producción**: **ADK corre por systemd, NO por PM2** (`sudo systemctl restart kai-adk`), puerto 8080, expuesto como `back.katuq.com/adk`; se despliega con `cd ~/kai && git pull` + restart. Genkit (obsoleto) sigue como proceso `index` de **PM2 del daemon root** (`sudo pm2 restart index`), puerto 3890, solo por los flows viejos. Revisar solo `pm2 list` da la falsa impresión de que ADK no está desplegado.
- **Firestore transactions** para operaciones de inventario — evitar race conditions.
- **Multi-tenancy**: toda query debe quedar limitada a la empresa autenticada. Usar el campo real de cada colección (`company` o `companyId`) y el contexto validado de la sesión; no asumir que ambos nombres son intercambiables.
- `formaEntrega` en despachos SIEMPRE de `carrito[0].configuracion.datosEntrega.formaEntrega`.
- `precioUnitarioIva` es un string porcentaje — verificar `_calculadoEnBackend` y `_precioManualOverride` antes de editar lógica de precios.
- **`inventoryService.js`** es de alto impacto: afecta POS, ventas, fulfillment y Shopify. Trazar flujo completo antes de modificar.
- **Write-set de inventario cerrado**: solo `inventory`, `inventoryMovement`, idempotencia/auditoría permitida e `InventoryLevel` Shopify. `products` y precios son read-only para este dominio.

## Anti-patterns

| Anti-Pattern | Consecuencia |
|-------------|-------------|
| `HttpClient` directo en componente | Interceptor no agrega auth → 401 |
| Quitar auth middleware "temporalmente" | Endpoint expuesto sin protección |
| `console.log` para telemetría | Logs ilegibles, no queryables |
| Asumir causa de bug sin datos | Usar endpoint de diagnóstico primero |
| Firestore doc ID en `idBodega` | Movimientos huérfanos, totales incorrectos |
| Sumar `inventory` sin normalizar `productoId` | Totales inflados por docs con docId y referencia para el mismo producto+bodega |
| Reusar un flow mixto de producto/precios para ampliar sync de stock | Reejecuta catálogo, imágenes o Price Lists y viola el aislamiento D-134 |
| Crear/corregir producto desde una operación de inventario | Mezcla dominios y puede pisar maestros o precios de producción |
| `setTimeout` para sync parent-child | Race conditions — usar callbacks/flags |
| Filtrar `active !== false` sin mostrar inactivos | Datos ocultos, confusión de usuario |

## Seguimiento en ClickUp

Contexto existente: workspace `31545745`; ticket padre de inventario `86b8f1hd4`, lista OMS, folder MODO CRITICO.

Cuando la tarea incluya seguimiento autorizado en ClickUp:

- Al cerrar un ticket, agregar comentario técnico con el detalle de lo realizado.
- Si no tiene detalle suficiente, agregar el comentario "Hace falta detalle".
