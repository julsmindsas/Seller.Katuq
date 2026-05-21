# Plan 003.4 — WooCommerce: nodos `/flows` multi-tenant

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md`.

## 1. Resumen técnico

Crear 10 nodos en `services/flows/nodes/woocommerce/` siguiendo patrón Shopify (con spec object, execute async, retry policy `_isRetryable`). Cada nodo lee credenciales **siempre** de `ctx.$companyConfig.woocommerce.*` (patrón 002.7). Triggers se suscriben al eventBus filtrando por `provider: 'woocommerce'`. Actions invocan `services/woocommerce/*` (existente + ampliado en 003.3). Helper compartido `_requireWooConfig(ctx)` centraliza el chequeo y throw friendly de `WC-CONFIG-MISSING`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | |
| II — Spec captura intent | sí | |
| IV — Idempotencia | sí | Actions WC ya idempotentes (createProduct con sku, updateProduct con id). |
| V — Eventos crudos | n/a directo (cubierto 003.2) | |
| VI — UI no acoplada a proveedor | sí | Nodos van en carpeta `woocommerce/` siguiendo patrón. Editor `/flows` carga dinámicamente desde registry — no hay `if (provider === 'woocommerce')` en UI. |
| VII — Observabilidad | sí | Logger por nodo + métricas + correlationId. |
| VIII — Test-first | sí | Cada nodo con unit test antes de implementación. |
| IX — Angular | n/a | Backend nodos. |
| X — Seguridad webhooks | n/a (003.2) | |
| XI — Datos sensibles fuera del log | sí | Logger reusa sanitize.js de 003.2. |
| XIII — ≤ 3 páginas | sí | |
| XV v2 — Canónica INGLÉS | sí | `spec.type` en kebab-case inglés. Output `integrations.woocommerce.*` snake_case para copiados / camelCase para derivados. |

## 3. Arquitectura

### 3.1 Componentes a crear

```
services/flows/nodes/woocommerce/
├── _helpers.js                                      (compartido: _requireWooConfig, _isRetryable, _wcError)
├── woocommerce-order-created.trigger.js             (NUEVO — webhook bridge canónico)
├── woocommerce-order-updated.trigger.js             (NUEVO)
├── woocommerce-product-changed.trigger.js           (NUEVO — bundle created/updated/deleted)
├── woocommerce-inventory-changed.trigger.js         (NUEVO)
├── woocommerce-product-upsert.action.js             (REUBICA — viene de woo-product-upsert.action.js)
├── woocommerce-order-create.action.js               (NUEVO)
├── woocommerce-order-status-update.action.js        (NUEVO)
├── woocommerce-inventory-adjust.action.js           (NUEVO)
├── woocommerce-fetch-products.action.js             (NUEVO — paginado, usado por templates 003.5)
└── woocommerce-fulfillment-create.action.js         (NUEVO — opcional, fase 2 si piloto)
```

Compatibilidad legacy:
- `woo-order-trigger.trigger.js` y `woo-product-upsert.action.js` quedan como aliases con `spec.type` mapeado al nuevo, deprecation warning en log al ejecutarse. Se eliminan 30 días post-launch.

### 3.2 Diagrama de ejecución típica (action)

```
[runtime engine ejecuta nodo X]
            │
            ▼
[node.execute(ctx)]
            │
            ▼
[_helpers._requireWooConfig(ctx)]
            │
   ┌────────┴───────────┐
   │                    │
   ▼ falta config      ▼ ok
throw {code:'WC-CONFIG-MISSING',message:'...'}
   │                    ▼
   ▼            [build axios client (cached via woocommerceService.getApiClient)]
[capturado por                  │
 002.2 _buildNodeErrorObject]   ▼
   │                    [llamar service WC]
   ▼                            │
[nodeStates[id].error =         ▼
 {code,message,stack}]   ┌──────┴──────┐
   │                     │             │
   ▼                     ▼ ok          ▼ error retryable (5xx/429/timeout)
[edge 'error' rutea      [emit         throw → engine retry
 al siguiente nodo]       result en
                          json]        ▼ error 4xx
                                       [emit a output port 'error' con json]
```

### 3.3 Decisiones técnicas

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Helper compartido `_requireWooConfig` | AC-003.4-02, AC-003.4-03, DRY | Inline en cada nodo: 10 archivos con misma lógica, error-prone |
| Nuevos nodos con nombres canónicos `woocommerce-*` | AC-003.4-01, consistencia Shopify | Mantener nombres `woo-*` legacy: rompe convención |
| Aliases legacy con deprecation warning 30 días | Compat, R-003.4-02 | Breaking immediato: rompe tenants con flows Woo ya existentes |
| Retry policy idéntica a Shopify (`_isRetryable`) | AC-003.4-Resiliencia, consistency | Custom Woo policy: divergencia injustificada |
| `ctx.$companyConfig` precargado por flowExecutor | AC-003.4-02, 002.7 | Load lazy en cada nodo: round trip Firestore por nodo, mata performance |

## 4. Modelo de datos

### 4.1 spec object estándar de cada nodo (basado en `woo-product-upsert.action.js` actual)

```js
const spec = {
  type: 'woocommerce-X',                 // kebab-case canónico
  category: 'trigger' | 'action' | 'transform',
  group: 'woocommerce',
  displayName: 'WooCommerce · <nombre amigable>',
  description: '<una línea>',
  icon: 'pi-shopping-bag',
  color: '#7f54b3',                      // morado WooCommerce
  version: 1,
  inputs: [{ name: 'main' }],            // o vacío para triggers
  outputs: [{ name: 'main' }, { name: 'error', isError: true }],
  credentials: ['woocommerce'],
  schema: { type: 'object', properties: { ... } },  // params del nodo
  idempotent: true | false,
  timeoutMs: 30000,
};
```

### 4.2 `ctx.$companyConfig.woocommerce` (heredado 002.7)

```js
{
  storeUrl: 'https://mitienda.com',
  consumerKey: 'ck_xxx',
  consumerSecret: 'cs_xxx',  // viene cifrado at-rest, descifrado en getCompanyConfigSnapshot
  bodegaCode: 'BOD-WOO-1',
  apiVersion: 'wc/v3',
  syncIntervalMinutes: 15
}
```

Sin esto presente: throw `WC-CONFIG-MISSING`.

## 5. Contratos

### 5.1 `_helpers._requireWooConfig(ctx) → wcConfig | throws`

```js
function _requireWooConfig(ctx) {
  const cfg = ctx && ctx.$companyConfig && ctx.$companyConfig.woocommerce;
  if (!cfg || !cfg.storeUrl || !cfg.consumerKey || !cfg.consumerSecret) {
    const err = new Error('Conectá tu tienda WooCommerce en /integrations primero');
    err.code = 'WC-CONFIG-MISSING';
    err.retryable = false;
    throw err;
  }
  return cfg;
}
```

### 5.2 Schemas de params por nodo (resumen, detalle en tasks)

| Nodo | params schema |
|---|---|
| `woocommerce-order-created.trigger` | (sin params, suscripción) |
| `woocommerce-order-updated.trigger` | (sin params) |
| `woocommerce-product-changed.trigger` | `{ events: ['created','updated','deleted'] }` |
| `woocommerce-inventory-changed.trigger` | (sin params) |
| `woocommerce-product-upsert.action` | `{ matchBy: 'sku'\|'wooId', publishStatus }` (heredado actual) |
| `woocommerce-order-create.action` | `{ status: 'pending'\|'processing'\|... }` |
| `woocommerce-order-status-update.action` | `{ wooOrderId, status, note?, noteVisibleToCustomer? }` (Q-003.4-01) |
| `woocommerce-inventory-adjust.action` | `{ wooProductId?, sku?, quantity, variationId? }` |
| `woocommerce-fetch-products.action` | `{ batchSize: 100, modifiedAfter? }` |
| `woocommerce-fulfillment-create.action` | (placeholder fase 2) |

## 6. Estrategia de testing

- **Contract tests** (primero): cada nodo con fixture de input + ctx + verificar output esperado. Mock de `services/woocommerce*`.
- **Integration**: flow simple `fetch-products → product-upsert` contra Firestore Emulator + mock axios.
- **E2E**: cubierto en 003.6 (suite acceptance).
- **Unit**: `_requireWooConfig` con 5 escenarios (config completa, missing storeUrl, missing consumerKey, missing consumerSecret, todo missing).

## 7. Fases de implementación

1. **Fase A — `_helpers.js`** `[P]`. Unit tests.
2. **Fase B — triggers** `[P]` (4 archivos paralelos, todos suscriptores eventBus).
3. **Fase C — actions de productos** `[P]` (upsert reubicar + fetch-products + inventory-adjust).
4. **Fase D — actions de órdenes** `[P]` (order-create + order-status-update).
5. **Fase E — action fulfillment-create placeholder** (deja stub que throw "not implemented in MVP").
6. **Fase F — aliases legacy + deprecation warnings**.
7. **Fase G — registry verify**: confirmar que los 10 nodos aparecen en `nodeRegistry.getAll()` con `provider: 'woocommerce'`.

## 8. Plan de rollout

- **Feature flag**: no necesario, los nodos solo se activan al instanciar templates 003.5 o flows manuales.
- **Canary**: tenant interno usando template `woo-sync-products-to-katuq` 7 días.
- **Rollback**: eliminar archivos de nodos (registry recarga). Sin cambios destructivos.

## 9. Riesgos técnicos

- **R-Plan-01**: registry puede requerir registro explícito en `index.js` o similar. Mitigación: verificar primero, ajustar plan si autoload no funciona.
- **R-Plan-02**: triggers que se suscriben al eventBus pueden generar memory leaks si no se dispose correctamente al cancelar flow. Mitigación: implementar `dispose(ctx)` en cada trigger.
- **R-Plan-03**: `companyConfigService.getCompanyConfigSnapshot` puede devolver config sin `bodegaCode` si schema 003.1 no se actualizó. Mitigación: gate en CI — no mergear 003.4 si 003.1 no está `done`.

## 10. Open questions técnicas

- Confirmar mecanismo exacto de suscripción al eventBus (verificar `woo-order-trigger.trigger.js:onWooWebhook` actual).
- Decidir si nodos deben tener un campo `examples` en su spec para preview en editor (consistencia con Shopify si lo tiene).
