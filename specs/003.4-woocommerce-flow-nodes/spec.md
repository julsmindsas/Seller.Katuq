# Spec 003.4 — WooCommerce: nodos `/flows` multi-tenant

> Estado: **draft** (2026-05-20)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Bloquea 003.5. Depende de 003.2 y 003.3.

## 1. Contexto / Por qué

Hoy existen solo 2 nodos `/flows` WooCommerce (1 stub trigger + 1 action con bug fixed): muy lejos de la paridad con Shopify (4 triggers + 5 actions = 9 nodos). Además, los nodos actuales declaran `credentials: ['woocommerce']` pero NO leen credenciales de `$companyConfig.woocommerce.*` (B-WOO-6), lo cual rompe multi-tenancy y obliga a hardcodear configuración por empresa (viola D-011 y patrón 002.7).

## 2. Objetivo de negocio

Tener 10 nodos `/flows` WooCommerce multi-tenant que cualquier empresa puede usar instanciando una plantilla (003.5), sin tocar código ni hardcodear credenciales. Si la empresa no configuró Woo en `/integrations`, el nodo falla con un error friendly y trazable.

## 3. User stories

- Como **diseñador de flows**, quiero **arrastrar nodos WooCommerce al canvas sin pegar Consumer Key/Secret en parámetros**, para que la integración respete multi-tenant.
- Como **operador Katuq**, quiero **que un flow Woo que se ejecuta sin config falle con `WC-CONFIG-MISSING` y mensaje friendly**, para diagnosticar en 5 segundos en lugar de bucear stack traces.
- Como **comerciante**, quiero **que si activo un template Woo sin haber completado `/integrations`, vea un mensaje "Conectá tu tienda WooCommerce en /integrations primero" en lugar de un error técnico**.

## 4. Criterios de aceptación (notación EARS)

- **AC-003.4-01.** THE registry de `/flows` SHALL exponer 10 nodos WooCommerce: 4 triggers (`woocommerce-order-created`, `woocommerce-order-updated`, `woocommerce-product-changed`, `woocommerce-inventory-changed`) + 6 actions (`woocommerce-product-upsert`, `woocommerce-order-create`, `woocommerce-order-status-update`, `woocommerce-inventory-adjust`, `woocommerce-fetch-products`, `woocommerce-fulfillment-create`).
- **AC-003.4-02.** WHEN un nodo WooCommerce ejecuta, THE system SHALL leer credenciales SIEMPRE de `ctx.$companyConfig.woocommerce.{storeUrl, consumerKey, consumerSecret, bodegaCode, apiVersion}`. NUNCA de `node.parameters` ni hardcodeado.
- **AC-003.4-03.** IF `ctx.$companyConfig.woocommerce` está ausente o le faltan `storeUrl`, `consumerKey`, `consumerSecret`, THEN THE node SHALL throw error con `code: 'WC-CONFIG-MISSING'` y `message: 'Conectá tu tienda WooCommerce en /integrations primero'`. El error se captura en `nodeStates[id].error` (patrón 002.2).
- **AC-003.4-04.** WHEN trigger `woocommerce-order-created` recibe evento del eventBus (originado en webhook 003.2), THE node SHALL emitir item con `json: { wooOrder, companyId, deliveryId, receivedAt }`.
- **AC-003.4-05.** WHEN action `woocommerce-fetch-products` ejecuta con `params: { batchSize, cursor }`, THE node SHALL invocar `services/woocommerce/queries.getProducts(companyId, {perPage: batchSize, modifiedAfter: cursor})` y emitir items con `json: wcProduct` por cada producto del batch.
- **AC-003.4-06.** WHEN action `woocommerce-product-upsert` ejecuta con item `json: katuqProduct`, THE node SHALL invocar `services/woocommerceService.findProductBySku` y luego `createProduct` o `updateProduct` según corresponda, retornar el resultado en `json: wcResult`.
- **AC-003.4-07.** WHEN action `woocommerce-inventory-adjust` ejecuta con item `json: {wooProductId, quantity}` o `{sku, quantity}`, THE node SHALL invocar `services/woocommerceService.syncInventory` y emitir confirmación.
- **AC-003.4-08.** WHEN action `woocommerce-order-status-update` ejecuta con `params: {wooOrderId, status, note?}`, THE node SHALL hacer PUT `/orders/{id}` con `status` y opcionalmente `customer_note` (Q-WOO-04 default: toggle "visible al cliente" expone `customer_note` vs `note` interna).
- **AC-003.4-09.** THE spec de cada nodo SHALL declarar `credentials: ['woocommerce']` para que el editor `/flows` UI muestre advertencia visual si no hay integración Woo configurada para esa empresa.
- **AC-003.4-10.** WHEN un trigger Woo se registra en `flow_trigger_bindings` con `kind: 'webhook'`, THE webhook entrante (003.2) SHALL rutear a este binding usando `companyId + topic` match (multi-tenant aware).

## 5. Requisitos no funcionales

### 5.1 Performance
- Cada ejecución de nodo Woo: latencia p95 ≤ 2s (excluye latencia de WooCommerce API, que es externa).
- Nodo `woocommerce-fetch-products` con `batchSize=100`: < 5s p95 (incluye llamada Woo).

### 5.2 Seguridad
- Credenciales sensibles (`consumerSecret`) NUNCA en logs ni en `nodeStates[id].output` (sanitizado por logger de 003.2).
- Validación de `ctx.companyId` contra config antes de cualquier llamada API.

### 5.3 Observabilidad (Art VII)
- Cada nodo emite log estructurado con `correlationId = runId`, `nodeId`, `companyId`, `latencyMs`, `result`.
- Métricas: `wc_node_executions_per_min` por `nodeType + status`.

### 5.4 Resiliencia
- Retry policy heredada de Shopify pattern: 408, 429, 5xx, ECONNRESET, ETIMEDOUT → throw retryable (engine reintenta).
- Errores 4xx (excepto 408, 429) → no retryable, emit a `error` output port.

## 6. Out of scope (explícito)

- Implementación de cron sync per se — se materializa como template en 003.5 usando estos nodos.
- UI custom de nodos en editor `/flows` (no se acopla UI a proveedor, Art VI).
- Wizards de configuración de parámetros del nodo (los parámetros van en `node.parameters` JSON estándar como cualquier otro nodo).
- Soporte para legacy `woo-order-trigger.trigger.js` post-migración: se deprecia con warning 30 días, luego se elimina.

## 7. Dependencias

- **003.2 done** — webhook secure pipeline (alimenta `woocommerce-order-created.trigger` via eventBus).
- **003.3 done** — `queries.getProducts`, `mappers/product`, `processors/products` disponibles para que `woocommerce-fetch-products` los use.
- **002.7 done** — `$companyConfig` precargado en `flowExecutor` antes del BFS.
- **002.2 done** — captura de errores en `nodeStates[id].error` para que `WC-CONFIG-MISSING` se vea.
- `services/woocommerceService.js` (existente, ampliado en 003.3 fase B).
- Registry de nodos `services/flows/nodes/registry.js` o equivalente — verificar dónde se registran nodos hoy.

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.4-01** (heredada Q-WOO-04): `woocommerce-order-status-update` con toggle "visible al cliente" → `params: { status, note?, noteVisibleToCustomer?: boolean }`. Default propuesto: agregar el toggle.
- [ ] **Q-003.4-02**: `woocommerce-fetch-products` retorna items uno por uno o como array? Default propuesto: **uno por uno** (más flexible para flows posteriores que usen `katuq-product-upsert` por item).
- [ ] **Q-003.4-03**: Para nodos action que invocan WC API y reciben 5xx → retry automático del engine o emit a `error` port? Default propuesto: retry para 5xx/429/timeout, emit error para 4xx (excepto 408, 429). Consistente con `woo-product-upsert.action.js:_isRetryable` actual.

## 9. Riesgos identificados

- **R-003.4-01** (Medio): registry de nodos puede no soportar 10 nuevos sin refactor. Mitigación: ver `services/flows/nodes/registry.js` antes de plan; si registry usa autoloading por carpeta, agregar archivos es suficiente.
- **R-003.4-02** (Medio): cambios en `woo-order-trigger.trigger.js` y `woo-product-upsert.action.js` pueden romper flows Woo existentes (si los hay en algún tenant). Mitigación: nuevos nodos canónicos como `woocommerce-order-created`, mantener nombres legacy como alias con warning.
- **R-003.4-03** (Bajo): `companyConfigService.getCompanyConfigSnapshot` puede no incluir `bodegaCode` si no está en schema 003.1. Verificar post-003.1 done.

## 10. Métricas de éxito post-launch

- **M-003.4-01**: 10 nodos Woo visibles en editor `/flows` con `provider: 'woocommerce'`.
- **M-003.4-02**: 0 nodos Woo en producción leyendo credenciales desde `node.parameters` (auditable con grep + inspección de flows activos).
- **M-003.4-03**: tasa de errores `WC-CONFIG-MISSING` ≤ 5% del total de ejecuciones Woo (errores legítimos por onboarding incompleto).
- **M-003.4-04**: latencia p95 de cada nodo Woo ≤ 2s (excluyendo latencia WC).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
