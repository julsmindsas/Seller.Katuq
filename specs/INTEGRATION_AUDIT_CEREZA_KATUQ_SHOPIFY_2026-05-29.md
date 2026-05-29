
# Reporte Integral — Integración Bidireccional Cereza ↔ Katuq ↔ Shopify (Tenant OH MY STORE)

*Snapshot runtime: 2026-05-28/29 · Proyecto `julsmind-katuq` · Auditoría verificada adversarialmente sobre código + Firestore read-only*

---

## 1. Resumen ejecutivo

La integración está **operativa pero con deuda estructural seria** y un punto ciego de observabilidad. Los tres flujos corren en producción y el camino feliz funciona, pero la salud está sostenida por mitigaciones (MAX-WINS en lectura de stock, backfills manuales) y no por idempotencia robusta en la fuente. El canal de estados Cereza→Katuq depende exclusivamente del cron pull (el webhook entrante está muerto para este tenant). La canónica integrations EN/ES tiene lectores literales-ES que romperán silenciosamente ante un cambio de fase de migración.

**Top 3 riesgos:**
1. **Duplicados masivos de inventory** (CRITICAL): 1666 pares `(productoId,idBodega)` con 3709 docs redundantes, 100% atribuibles al path Osmosis (`_syncInventory` con `doc()` auto-id sin transacción ni docId determinístico). Corrompe la derivación de stock visible.
2. **Cron status-pull revierte estados del operador** (MEDIUM-alto impacto operativo): cada 30 min sobrescribe avances manuales legítimos (`Despachado→EnDespacho`, `Rechazado→EnDespacho`) porque Cereza nunca pasa de `pending` para este tenant. Evidencia viva: ORE-000352 "revivido" de `Rechazado` a `EnDespacho`.
3. **Lectores literales-ES + falla latente de MIGRATION_PHASE** (HIGH): si `INTEGRATIONS_MIGRATION_PHASE` sube a ≥4, el cron de status-pull deja de encontrar órdenes (`checked:0` sin error) y el sync de estados se detiene en silencio.

---

## 2. Diagrama de flujo bidireccional (ASCII)

```
================================================================================
 FLUJO A — PRODUCTOS + INVENTARIO:  Cereza ──► Katuq ──► Shopify
================================================================================
 Flow: cereza-products-to-shopify-a5156643   TRIGGER: POLLING cada 5 min (limit=30)

  [osmosis-product-changed]  polling      idemp: NO (lógica via syncCursor/lastSeenIds)
        │  state: flow_polling_state/{company}_{flow}_{node}  cursor=8253 ~ total
        ▼
  [katuq-canonical-mapper]   transform    mapping declarativo {{ }} sobre $json.raw
        ▼
  [katuq-product-upsert]     action       idemp: SÍ (match referencia/cd/codigoBarras)
        ▼
  [shopify-product-upsert]   action       idemp: parcial (matchBy sku + echo-guard)
        ▼
  [shopify-inventory-adjust] action       idemp: NO ESTABLE (idempotencyKey + Date.now())
                                          (*) inventario entrante va a SHOPIFY, no a Katuq.inventory

  PATH LEGACY PARALELO (no-flow):  syncAllProducts ──► _syncInventory ──► Katuq.inventory
        cron 0 */6 * * * COMENTADO en boot (no-op); reactivable por endpoint/script
        idemp: NO (query-then-create con doc() auto-id) ── FUENTE DE DUPLICADOS

================================================================================
 FLUJO B — ESTADOS:  Cereza ──► Katuq                  (PULL, no hay push destructivo)
================================================================================
 Flow: cereza-orders-status-pull-rdoavk0b    TRIGGER: CRON */30 * * * * (America/Bogota)

  [trigger schedule-cron]
        ▼
  [osmosis-orders-status-pull] action     idemp: SÍ (gate de igualdad estadoProceso)
        │  query orders WHERE integraciones.osmosis.isPushed==true  (lit. ES)
        │  por orden: getOrderById ─► OSMOSIS_TO_KATUQ_STATUS ─► db.update DIRECTO
        ▼  pending/confirmed/processing→EnDespacho · shipped→Despachado · delivered→Entregado · cancelled→Cancelado
   orders.{estadoProceso}     (NO pasa por upsert ni guard allowedFromProvider)

  WEBHOOK ENTRANTE  /v1/osmosis/webhook  ── MUERTO para OH MY STORE
        rechazado_missing_secret (sin webhookSecret); HMAC implementado pero nunca invocado

================================================================================
 FLUJO C — PEDIDOS:  Shopify ──► Katuq ──► Cereza
================================================================================
 Flow: shopify-orders-to-cereza-7e6ab5a3     TRIGGER: WEBHOOK orders/create (SIN HMAC)

  Shopify ─► flowsController.webhookTrigger   idemp: NO (no usa X-Shopify-Webhook-Id)
        │  persiste webhook_logs · startRun([{json:req.body}])
        ▼  (trigger SHORT-CIRCUITADO: flowExecutor:512-523 — guards del trigger no corren)
  [mapper]            canonical-mapper, targetSchema=order   (mapping declarativo)
        ▼
  [product-resolver]  resuelve carrito[*].producto.cd por SKU   (corre ANTES de persist)
        ▼
  [persist]           katuq-order-upsert   idemp: SÍ (match externalId, guard anti-checkout)
        ├──────────────────────────────────────────────┐
        ▼ (push pedido)                                  ▼ (ajuste inventario)
  [osmosis]  osmosis-order-create          [split-cart] split-array carrito
   idemp: SÍ (lookup osmosisOrderId)             ▼
   gates: requirePaid · nroPedido · cédula  [adj-mapper]  delta=-1, reason=sale
   éxito ─► estadoProceso=EnDespacho             │  referenciaPedido = $node[persist].nroPedido || $node[trigger].name
                                                 ▼
                                         [inventory-adjust]  katuq-inventory-adjust
                                          idemp: SÍ *SOLO SI* referenciaPedido resuelve
                                          key: inventory_adjust_idempotency
```

---

## 3. Detalle por camino

### Camino A — Productos + Inventario (Cereza → Katuq → Shopify)

**Pasos:** polling `osmosis-product-changed` (PAGE_SIZE=100, INGEST por ventana `[cursor,cursor+limit)` o DIFF si `cursor>=total`) → `katuq-canonical-mapper` (mapping declarativo) → `katuq-product-upsert` → `shopify-product-upsert` → `shopify-inventory-adjust`.

**Archivos clave:**
- `services/flows/nodes/osmosis/osmosis-product-changed.trigger.js` (trigger; `_pollAndEmit` L166, INGEST L210-307, DIFF L222-405, `_shouldEmit` L146-158, `_saveState` L115-131).
- `services/flows/nodes/internal/katuq-canonical-mapper.transform.js` (L86-97 resuelve mapping item-por-item; passthrough L142-147).
- `services/integrations/osmosis/osmosisProductSyncService.js` (`_mapOsmosisProductToKatuq` L212-315; `_syncInventory` L333-391 — path legacy).
- `services/integrations/osmosis/osmosisApiClient.js` (`getProducts` L153-159; OAuth2 client_credentials L91-102).
- `services/flows/nodes/shopify/shopify-product-upsert.action.js`; `services/flows/nodes/shopify/utils/mapper.js`.

**Campos mapeados críticos (mapping declarativo del flow, sobre `$json.raw`):** `company<-$companyId`; `titulo<-raw.data[0].name`; `descripcion<-raw.data[0].description` (strip HTML); `marca<-raw.data[0].manufacturer`; `referencia<-raw.reference`; `codigoBarras<-raw.data[0].barcode`; `variantes<-raw.price[]` (`referencia=ref+"-"+size-color`, `precio=Number(p.price)`); `imagenesPrincipales<-raw.images[]` (base `https://images2.guiacereza.com`).

**Gates:** trigger filtra `active` (L256) y `onlyWithStock` via `_totalStock<=0` (L260); anti-eco via `origin.provider='osmosis'` + Barrera 1 `skipIfOrigin`; `katuq-product-upsert` con `createIfMissing:true`.

**Qué se sincroniza:** título, descripción, marca, referencia, código de barras, precio, imágenes, `tipoProducto` (desde `type`), variantes (precio/sku/barcode).

**Qué NO se sincroniza:**
- **Categoría jerárquica** (`categoria`/`categorias`): la ruta productiva no la emite; solo mapea `type→tipoProducto`. (PARTIAL, low — ver §6.) `categorias:[type]` solo existe en `scripts/repopulate-empty-osmosis-products.js:43`, no en el flujo.
- **Variantes adicionales hacia Shopify**: solo se pushea `variantsInput[0]` (`shopify-product-upsert.action.js:251`); productos multi-variante pierden SKUs/precios de variantes 1..N. (CONFIRMED, medium.)
- **Inventario entrante a `Katuq.inventory`**: en este flow va a Shopify (`shopify-inventory-adjust`), NO a la colección `inventory`. La escritura a `inventory` solo la hace el path legacy `_syncInventory` (cron 6h comentado / endpoint / script).

---

### Camino B — Estados (Cereza → Katuq)

**Pasos:** cron `*/30 * * * *` → `osmosis-orders-status-pull` (wrapper delgado) → `osmosisOrderService.pullAndSyncPendingOrders`: query `orders WHERE company==X AND integraciones.osmosis.isPushed==true` (sin `.limit()`), filtra `FINAL_STATES_KATUQ={Entregado,Cancelado}` en memoria, loop secuencial `getOrderById` → `OSMOSIS_TO_KATUQ_STATUS` → `db.update` directo.

**Archivos clave:**
- `services/flows/nodes/osmosis/osmosis-orders-status-pull.action.js` (`execute` L47-94).
- `services/integrations/osmosis/osmosisOrderService.js` (`OSMOSIS_TO_KATUQ_STATUS` L25-32; `pullAndSyncPendingOrders` L174-234; gate de escritura L203; `update` L211-214).
- `services/integrations/osmosis/osmosisApiClient.js` (`getOrderById` L248-252).
- Webhook entrante (muerto): `controllers/osmosisWebhookController.js` (L73-78 `rejected_missing_secret`; L80-89 token plano); `services/integrations/osmosis/osmosisWebhookService.js` (`verifySignature` L56-73, **nunca invocada**; tabla DISTINTA `OSMOSIS_TO_KATUQ_STATUS` L10-17 sin `EnDespacho`).

**Campos mapeados críticos:** `estadoProceso<-_mapOsmosisStatusToKatuq(osmosisOrder.status)`; integración via `writeIntegrationFieldDotPaths('osmosis', {status, lastStatusSync, lastNote?})` (EN+ES). Decisión usuario 2026-05-26: `pending/confirmed/processing→EnDespacho`.

**Gates:** escribe solo si `newKatuqStatus && newKatuqStatus !== currentKatuqStatus` (L203) — **sin validación de progresión topológica**; filtra estados finales.

**Qué se sincroniza:** estado de proceso desde Cereza, metadatos de integración, notas.

**Qué NO se sincroniza / no funciona:**
- El **webhook entrante** no opera para este tenant (sin `webhookSecret` → rechazo garantizado). El pull cron es el único canal Cereza→Katuq.
- El camino feliz (`shipped→Despachado`, `delivered→Entregado`) **nunca se ha ejecutado en prod**: las 17 órdenes pushed siguen `pending` en Cereza.

---

### Camino C — Pedidos (Shopify → Katuq → Cereza)

**Pasos (orden REAL del grafo):** `trigger → mapper → product-resolver → persist → {osmosis | split-cart → adj-mapper → inventory-adjust}`.

**Archivos clave:**
- `controllers/flowsController.js` (`webhookTrigger` L433-496; HMAC solo si `config.webhookSecret` L446-456; persistencia `webhook_logs` L464-490; `startRun` L493; correlación run L500-508).
- `services/flows/flowExecutor.js` (short-circuit triggers L512-523; decisión partial/success L419-469).
- `services/flows/nodes/internal/katuq-canonical-mapper.transform.js` (L117-163; `_applyMappingToItem` L86-96 — **contexto NO incluye `$node`**).
- `services/flows/nodes/internal/katuq-order-upsert.action.js` (guard anti-checkout L146-167; `_findOrderByExternalId` L88-116 con POISON_VALUES L100; UPDATE L180-265; `allowedFromProvider` L202; propagación nroPedido/cd L241-265).
- `services/flows/nodes/osmosis/osmosis-order-create.action.js` (idempotencia L459-553; requirePaid L562-586; nroPedido L591-609; cédula L614-693; push L711; post-push `EnDespacho` L725-762; `is_paid` L183-185; `_extractCerezaWarehouseCode` L305-312).
- `services/flows/nodes/internal/katuq-inventory-adjust.action.js` (guard idempotencia L183-201, 229-248, 332-345).

**Campos mapeados críticos:** `estadoProceso` (cancel/voided/refunded→`Cancelado`, else `ParaDespachar`); `estadoPago` (paid→`Aprobado`); **cédula desde `billing_address.company`** (cliente la pone en campo "Empresa"); `cliente.numero_celular_comprador<-customer.phone||shipping_address.phone`, indicativo hardcode `"57"`; `PagosAsentados` (`numeroComprobante:String($json.id)`); `bodegaId<-$companyConfig.osmosis.bodegaCode="BOD-CEREZA-1"` → warehouse `"1"`; `carrito[].identificacion.referencia=sku||product_id`. `adj-mapper`: `referenciaPedido=$node["persist"].json[0].nroPedido || $node["trigger"].json[0].name`.

**Gates:** anti-checkout (orderId numérico `/^\d+$/`); idempotencia already_exists; requirePaid (default true); nroPedido vacío; cédula faltante (escribe `requiereAtencionLogistica:true, motivoAtencion:'falta_cedula'`); inventory-adjust idempotencia solo si `referenciaPedido` no vacío Y `delta!=null && setTo==null`.

**Qué se sincroniza:** pedido pagado → Cereza con cédula, warehouse, pagos; decremento de inventario.

**Qué NO se sincroniza:** checkouts/drafts (sin orderId numérico) → skip; pedidos no pagados → `not_paid`; pedidos sin cédula → bandera de atención logística, no push. El `$node` no está en el contexto del mapper item-por-item — riesgo de que `referenciaPedido` resuelva vacío (raíz del triple-decremento).

---

## 4. Tabla de idempotencia por hop

| Hop (nodo) | ¿Idempotente? | Llave / mecanismo | Colección |
|---|---|---|---|
| Ingesta webhook (`flowsController.webhookTrigger`) | **NO** | — (no usa `X-Shopify-Webhook-Id`); dedup canónico bypasseado | — (`webhook_logs` solo audita) |
| Trigger polling Osmosis (`osmosis-product-changed`) | NO (lógica) | `syncCursor` + `lastSeenIds` Map | `flow_polling_state` |
| `katuq-product-upsert` | **SÍ** | match `referencia`/`cd`/`codigoBarras` | `products` |
| `shopify-product-upsert` | Parcial | matchBy sku + echo-guard | `products` / `shopify_sync_locks` |
| `shopify-inventory-adjust` | **NO estable** | `idempotencyKey + Date.now()` (L242, no determinista); efecto idempotente solo en `setTo` | (header HTTP Shopify) |
| `katuq-order-upsert` | **SÍ** | match `integraciones/integrations.shopify.orderId` (externalId) + POISON guard L100 | `orders` |
| `osmosis-order-create` | **SÍ** | lookup `integraciones.osmosis.osmosisOrderId` / `nroPedido` / `shopify.orderId` | `orders` (+ `osmosis_push_log`) |
| `katuq-inventory-adjust` | **SÍ (solo si refPedido resuelve)** | `{company}_{referenciaPedido}_{productoId}_{bodega}_{reason}`; `tx.get`+`tx.set` misma tx | `inventory_adjust_idempotency` |
| `osmosis-orders-status-pull` (cron) | **SÍ** | gate de igualdad `estadoProceso !==` (no usa webhookId) | `orders` |
| `_syncInventory` (path legacy) | **NO** | query-then-create con `doc()` auto-id, sin tx | `inventory` ← **fuente de duplicados** |
| Webhook Osmosis entrante (muerto) | SÍ (si operara) | `osmosis_webhook_log/{company}/events/{webhookId}` | `osmosis_webhook_log` |

---

## 5. Máquina de estados de un pedido

```
                       (mapper CREATE)
        ┌─────────────► ParaDespachar ──────────┐
        │              estadoPago=Aprobado       │
   [Shopify pagado]                              │ (osmosis-order-create push OK)
        │                                        ▼  _updateKatuqOrder L413/416
        │                                    EnDespacho ◄──────────────┐
        │                                        │                     │ (pull: pending/
        │                  (Cereza shipped)      │                     │  confirmed/processing)
        │                  pull L211-214 ────────┤                     │
        │                                        ▼                     │
        │                                   Despachado ────────────────┘ (RETROCESO BUG:
        │                                        │      pull regresa a EnDespacho si Cereza
        │                  (Cereza delivered)    │      reporta processing)
        │                  pull ──────────────── ▼
        │                                    Entregado  [FINAL]
        │
   RAMAS CANCELACIÓN/RECHAZO:
        ├─ mapper: cancelled_at||voided||refunded ──► Cancelado  [FINAL]
        ├─ pull: cancelled ──► Cancelado  [FINAL]
        └─ Rechazado (operador) ──► [BUG] pull lo "revive" a EnDespacho mientras Cereza=pending
```

**Quién escribe cada transición:**

| Transición | Escritor | Archivo:línea |
|---|---|---|
| `(nuevo) → ParaDespachar` + `Aprobado` | `katuq-canonical-mapper` (CREATE via `katuq-order-upsert`) | mapper declarativo + `katuq-order-upsert.action.js:267-270` |
| `ParaDespachar → EnDespacho` | `osmosis-order-create` (post-push) | `osmosis-order-create.action.js:413/416` |
| `* → EnDespacho` (pending/confirmed/processing) | cron `osmosis-orders-status-pull` (`db.update` directo) | `osmosisOrderService.js:211-214` |
| `EnDespacho → Despachado` (shipped) | cron pull | `osmosisOrderService.js:25-32, 211-214` |
| `Despachado → Entregado` (delivered) | cron pull | `osmosisOrderService.js:211-214` |
| `→ Cancelado` (entrada) | mapper (cancel/voided/refunded) o cron pull (cancelled) | mapper / `osmosisOrderService.js` |
| **RETROCESO** `Despachado→EnDespacho`, `Rechazado→EnDespacho` | cron pull (sin validación topológica, `db.update` directo) | `osmosisOrderService.js:203` |

Nota: el cron pull **NO pasa por el guard `allowedFromProvider`** (`katuq-order-upsert.action.js:202-205`), y aunque pasara no bloquearía el retroceso porque `EnDespacho` está en la allowlist. Estados finales `{Entregado, Cancelado}` están protegidos por `FINAL_STATES_KATUQ` (L35).

---

## 6. Bugs y deuda RANKED (solo CONFIRMED / PARTIAL)

### CRITICAL

**[C-1] `_syncInventory` crea duplicados con `doc()` auto-id (sin docId determinístico ni transacción)** — *confirmed*
- **Evidencia:** `osmosisProductSyncService.js:333-391` abre `db.batch()` (no `runTransaction`), hace query `WHERE company+productoId+idBodega LIMIT 1` (L353-359) y en rama not-found crea con `db.collection(INVENTORY_COLLECTION).doc()` auto-id + `batch.set` (L373). Datos vivos: 12860 docs inventory, 9151 pares únicos, **1666 pares con N≥2**, hasta 21 copias en un par, 4979 docs con `cantidad=0`. Atribución 100% al path Osmosis: los 5375 docs duplicados tienen `syncSource:'osmosis'` + `idBodega` prefijo `BOD-CEREZA`; cero traen schema dual de woo/shopify. Viola REGLA DURA de docId canónico (`functions/CLAUDE.md`); el processor WooCommerce lo hace bien (`services/woocommerce/processors/inventory.js:50,76`).
- **Matiz (no baja severidad):** dentro de UNA corrida no-solapada el batch es atómico; los duplicados nacen de corridas solapadas/repetidas (cron 6h sin mutex + endpoint manual `GET /v1/osmosis/products/sync` + `scripts/run-osmosis-sync.js`) y reintentos a través del tiempo.
- **Impacto:** inventory es single-source-of-truth; `productStockHelper` deriva `cantidadDisponible` en cada GET. 1666 pares fragmentados corrompen stock visible en frontend/POS/marketplace → drift sistemático. Mitigado en lectura por MAX-WINS (`productStockHelper.js:75-112`), fuente sigue sucia.
- **Fix:** (1) docId determinístico `${productoId}_${idBodega}` + `set(merge:true)` (elimina la query); (2) guard de concurrencia en cron (`cronService.js:1271-1317`) + lock Firestore para endpoint/script; (3) cleanup de 1666 pares vía `scripts/cleanup-inventory-duplicates.js` o consolidación transaccional; (4) backfill one-shot a docId determinístico.

### HIGH

**[H-1] `osmosisOrderService` lee `integraciones` (ES) con path literal: se rompe si `MIGRATION_PHASE>=4`** — *confirmed*
- **Evidencia:** `osmosisOrderService.js:179` query con `.where('integraciones.osmosis.isPushed','==',true)` literal; `:193` lee `order.integraciones.osmosis.osmosisOrderId` literal. `integrationFieldHelper.js:23` default fase 1; `:52-53` escribe ES solo si `MIGRATION_PHASE<4`. `.env` NO contiene `INTEGRATIONS_MIGRATION_PHASE`. El helper `readIntegrationField` (EN→ES fallback) existe pero NO se usa para reads de osmosis. Alcance MÁS amplio que el claim: mismas lecturas literales-ES en `pushOrderToOsmosis` (:64-68), `syncOrderStatus` (:134) y `osmosisWebhookService.js:193`.
- **Impacto:** al subir a fase 4, la query del pull cron (`cronService.js:1326-1356`, cada 30 min) devuelve 0 docs para órdenes nuevas (escritas solo EN), retorna `{checked:0}` sin error → **sync de estados Cereza→Katuq se detiene en silencio**. Afecta también push-dedup, status-push y webhook fallback.
- **Fix:** reemplazar lecturas literales por `readIntegrationField`; para la query (L179), elegir path según `MIGRATION_PHASE` o correr dos queries (EN + ES) deduplicadas por doc.id; aplicar a `osmosisWebhookService.js:193`; warning si `checked:0` mientras existen órdenes EN-only.

### MEDIUM

**[M-1] Cron status-pull puede retroceder estados y no aplica guard de provider** — *confirmed*
- **Evidencia:** `osmosisOrderService.js:203` usa `newKatuqStatus !== currentKatuqStatus` sin progresión topológica; `:211-214` escribe `db.update` directo (no pasa por `orderRepository` ni guard `allowedFromProvider`). `OSMOSIS_TO_KATUQ_STATUS` mapea `processing→EnDespacho`; si operador avanzó a `Despachado` y Cereza reporta `processing`, sobrescribe a `EnDespacho`. **Daño vivo confirmado:** ORE-000352 (`uWZb4GHjQWWP6KBC2eWw`) revivido de `Rechazado` a `EnDespacho` el 2026-05-29T01:00; antes `Despachado→SinProducir`, `Cerrado→SinProducir` (era anterior del mapeo).
- **Matiz:** el guard `allowedFromProvider` NO prevendría este retroceso aunque corriera, porque `EnDespacho` está en la allowlist; la causa raíz es la ausencia de orden topológico en AMBOS paths.
- **Impacto:** cada 30 min revierte progreso del operador; ventana ≤30 min. Solo afecta órdenes donde el operador va por delante de Cereza; finales protegidos.
- **Fix:** rank ordinal de estados + permitir solo avances (`newRank > curRank`), excepto `Cancelado` (ground truth); en retroceso, actualizar solo metadatos de integración sin tocar `estadoProceso` + log `status_pull_skipped_backward`; centralizar en helper compartido con `katuq-order-upsert`.

**[M-2] Webhook entrante de estados muerto para OH MY STORE (sin `webhookSecret`); HMAC no se usa** — *confirmed*
- **Evidencia:** `integration_configs/'OH MY STORE_osmosis'`: `status=active`, `webhookSecret=undefined`. `osmosisWebhookController.js:73-78`: sin secret → `rejected_missing_secret` + return (rechaza todo webhook real). `:80-89` auth por **token en texto plano** (`provided !== webhookSecret`), no HMAC. `verifySignature` (`osmosisWebhookService.js:56-73`) implementada correctamente pero `grep` confirma que **nunca se invoca** (código muerto). Los 7 docs en `osmosis_webhook_log/OH MY STORE/events` son sintéticos (`__test360_*`, `test-evt-*`). Tabla de mapeo del webhook DIVERGE del pull (`processing→EnProduccion` vs `→EnDespacho`).
- **Impacto:** deuda de arquitectura + drift de seguridad. SIN pérdida funcional (cron pull cubre la sincronización). Si se habilita el webhook, riesgo de flapping entre dos canales con mapeos divergentes.
- **Fix:** (A) cablear `verifySignature` con raw body (`express.raw`) o documentar/eliminar; (B) generar/persistir `webhookSecret` para desbloquear el canal; alerta cuando se marque `rejected_missing_secret` (hoy responde 200 silenciosamente).

**[M-3] Solo se pushea `variantsInput[0]`: multi-variante pierde variantes** — *confirmed*
- **Evidencia:** `shopify-product-upsert.action.js:246-249` TODO explícito; `:251` `const v0 = variantsInput[0]`; bloque 252-275 solo sincroniza v0 al default variant. CREATE (L219-229) no envía `variantsInput` → Shopify auto-crea 1 variante. No hay llamada a `productVariantsBulkCreate`/`productOptionsCreate`.
- **Matiz:** el mapper (`mapper.js:188-205`) SÍ produce N entradas, pero con opción genérica `Title` (no size/color estructurado).
- **Impacto:** pérdida de datos real para multi-variante; acotada (~80% del catálogo Cereza es mono-variante, según el propio código).
- **Fix:** implementar el TODO — CREATE con `productVariantsBulkCreate` (strategy `REMOVE_STANDALONE_VARIANT`); UPDATE comparando por SKU; `optionValues` estructurados (Talla/Color); fallback v0 solo si `length===1`.

**[M-4] Idempotencia de inventory-adjust apenas ejercida en producción (1 doc, backfilled) + triple-decremento real** — *partial*
- **Evidencia:** `inventory_adjust_idempotency` tiene **count=1 global**: `OH_MY_STORE_ORE-000352_M9ZJQF2icuJlzTlwRi2k_BOD-CEREZA-1_sale`, con `_backfilledByCleanup:true` — campo que **ningún código del repo escribe** (el handler L333-344 no lo añade) → backfill por script de remediación fuera del árbol, no actuación del guard. El triple-decremento **ocurrió en prod**: 3 movimientos `FLOW_SALE` para ORE-000352 (00:49:32 `0→-1`, 00:49:33 `-1→-2`, 00:52:16 `-2→-3`), revertido a las 01:14:41 (`reversal_duplicate_decrement` +2 → -1). Causa: orden Shopify `1155` llegó como 3 webhooks; `referenciaPedido` resolvió vacío en runtime (`$node` no está en el contexto del mapper item-por-item) → `_idempotencyEnabled=false` (`katuq-inventory-adjust.action.js:194-196`).
- **Impacto:** el guard existe pero cobertura runtime = 0; el único stock negativo del tenant (`wQueLOeusXw8mGxImk5b`, ref `JRC4202`, `cantidad=-1`) es la secuela.
- **Fix:** test de integración (Firestore Emulator) que dispare N veces el mismo pedido y asegure 1 decremento + N-1 `skippedIdempotent` + doc SIN `_backfilledByCleanup`; smoke check post-deploy buscando docs orgánicos; verificar que `referenciaPedido` y `delta` lleguen poblados (resolver del contexto `$node`); versionar el script de remediación dentro del repo.

### LOW

**[L-1] `is_paid` del payload Osmosis marca pagados los pedidos 'Cancelado'** — *confirmed*
- **Evidencia:** `osmosis-order-create.action.js:183-185` `is_paid = ...|| ['PreAprobado','Cancelado'].includes(estadoPago)` incluye `Cancelado`; el gate `_requirePaid` (:564-566) usa lista distinta `['PreAprobado','Aprobado']`. `refunded→Cancelado` (`mappers/order.js:23-31`) → marcar `is_paid:true` es semánticamente incorrecto.
- **Matiz (reachability estrecha):** con `requirePaid:true` (default) el pedido reembolsado se skipea (`not_paid`) antes de construir el payload; pedidos ya existentes van por `isCancelEvent` → `updateOrderStatus('cancelled')`. El flag buggy solo llega a Cereza con `requirePaid===false` explícito + pedido nuevo + totalmente reembolsado.
- **Fix:** unificar en helper `isOrderPaid()` que excluya `refunded/voided/partially_refunded`; test de regresión.

**[L-2] `idempotencyKey` de `shopify-inventory-adjust` incluye `Date.now()` → no idempotente entre reintentos** — *confirmed*
- **Evidencia:** `shopify-inventory-adjust.action.js:242` `idempotencyKey: flow-inventory-adjust-${compositeId}-${Date.now()}`; `executeGraphQL` (`shopifyService.js:250`) la envía como header HTTP `Idempotency-Key`. Hermano `shopify-order-create.action.js:102` usa patrón correcto (nroPedido estable).
- **Matiz:** reintentos dentro de una invocación comparten clave (closure); el modo dominante `setTo` es idempotente por naturaleza (set absoluto); riesgo real solo en `mode=delta`.
- **Fix:** clave determinista basada en `ctx.runId/flowId + compositeId + idx` o derivada de inputs; migrar deltas a `inventoryAdjustQuantities`.

### Deuda transversal (no-bug, observabilidad/higiene)

- **"Verde mentiroso" / observabilidad fuera del status del run:** hops no-op (`not_paid`, `missing_cedula`, `skipped_already_exists`, `skipped_idempotent`, `shopify_checkout_or_draft`) emiten item por `main` → run marcado `success` aunque el pedido nunca llegó a Cereza. La observabilidad real vive en `osmosis_push_log`, banderas `requiereAtencionLogistica` y `webhook_logs`. Un operador mirando solo el run NO detecta los skips. (`flowExecutor.js:419-469`.)
- **Ingesta webhook SIN dedup por delivery:** dedup canónico (`webhookDedup`/`webhookQueue`) y bridge `onShopifyWebhook` MUERTOS para OH MY STORE (`shopify_webhook_dedup=0`, `dispatch_jobs=0`). Toda la idempotencia recae en guards por-hop, y `order-upsert`/`osmosis-create` no son transaccionales (query `.limit(1)`+write) → ventana de carrera real ante el patrón de 4 runs en ~1s.
- **`flow_echo_guard` con 4965 docs sin purgar:** las marcas Osmosis nunca se consumen (ningún trigger lee `wasRecentlyPushed` con esa key); las Shopify se borran al leerse pero los triggers están short-circuitados. TTL policy de Firestore sobre `expiresAt` aparentemente inactiva → riesgo de crecimiento ilimitado.

---

## 7. Salud runtime (números reales OH MY STORE)

**orders (total 331):**
- `sourceOrder`: shopify 32; ausente 299 (carga histórica/Cereza).
- `estadoProceso`: Despachado 178, Cerrado 46, Entregado 30, ParaDespachar 29, EnDespacho 17, SinProducir 9, Cancelado 3, Rechazado 3, (none) 16.
- `estadoPago`: PreAprobado 226, Cancelado 73, Pendiente 12, Aprobado 3, Rechazado 1, (none) 16.
- Shopify pusheados a Cereza: **16 de 32 (50%)**. Los 16 no-pusheados = 15 `Cancelado` + 1 `Pendiente` (ORE-000205). **0 órdenes pagadas (Aprobado/PreAprobado) sin pushear** → el gate funciona; NO hay pérdida de pushes.
- Órdenes con `integraciones.osmosis.isPushed==true`: **17** (EN/ES coinciden); 16 no-terminales consultadas por el cron cada 30 min. **Las 17 siguen `status:pending` en Cereza** (camino feliz nunca ejecutado).

**products (total 8312):**
- con `integraciones/integrations.osmosis.id` (Cereza): **8221 (98.9%)**.
- con `integrations.shopify.productId` (linkeado): **5905 (71.0%)** — ~2407 sin linkear; muchos via `linkedBy:"dry-run-connector-2026-05-27"`.
- `marketplace.paginaWeb=true`: 8310; con `paginaWeb=true AND stock>0`: **2211**.
- `requiereAtencionShopify=true`: **0**.

**inventory (total 12860 docs):**
- `cantidad < 0`: **1 solo doc** (`wQueLOeusXw8mGxImk5b`, ref `JRC4202`, `BOD-CEREZA-1`, `-1`) — secuela del triple-decremento de la orden 1155.
- **Duplicados: 1666 keys / 3709 docs redundantes**; distribución de copias: 2→862, 3→202, 4→344, 5→115, 6→44, 7→46, 8→18, 9→20, 10→6, 12→3, 13→3, 14→2, 21→1. Mayoría en `BOD-CEREZA-1` con `cantidad=0`. **Sin consolidar.**

**inventoryMovement:**
- `FLOW_SALE` histórico total = **3**, los 3 en últimas 48h, todos del mismo producto `M9ZJQF2icuJlzTlwRi2k`/`BOD-CEREZA-1`, todos con **`referenciaPedido=undefined`** → triple-decremento `0→-3`.

**flow_runs (ratios all-time):**
- `shopify-orders-to-cereza-7e6ab5a3`: 258 total (success 150, partial 100, failed 8). Multi-webhook: **258 runs / 56 orderIds distintos → 49 órdenes (87.5%) reprocesadas**, amplificación ~4.6x; picos 19, 13, 13, 12 runs/pedido.
- `cereza-products-to-shopify-a5156643`: 341 total (success 94, **partial 138 ≈40%, failed 109 ≈32%**). Partial mayormente BENIGNO (terminal sin items, no errores). Failed reales: 48× zombie por restart PM2, 4× DNS `ENOTFOUND osmosis-api.guiacereza.tech`, 3× token, 3× socket hang up, 1× HTTP 429.
- `cereza-orders-status-pull-rdoavk0b`: 1482 total (1463 success / 19 failed) — cron sano. Últimas 48h: 112 (esperado ~96, incluye solapes), 111 success / 1 failed (`BACKEND_RESTART`).

**Push logs:**
- `osmosis_push_log`: **3 docs, todos success, 0 errores** (logging reciente/parcial — solo 3 pese a 16 órdenes con osmosisOrderId; fallos de push aparecen como `failed`/network en `flow_runs`, no aquí → cobertura incompleta).
- `shopify_push_log`: 116 docs, todos success, 0 errores.

**webhook_logs (provider `flow-webhook`, total 41):** shopify-orders 37 + woo 4. runStatus: success 29, partial 3, **sin runStatus 9** (correlación best-effort falló). **9 con `payloadId:null` pero `hasLineItems:true`** → checkouts/junk sin `id` numérico que igual ejecutaron el flow.

**inventory_adjust_idempotency:** 1 doc (backfilled, ver M-4).

**Síntesis:** Stock negativo masivo NO (1 doc). Duplicados inventory SÍ y grave. Runs partial crónicos SÍ pero mayormente benignos. Errores de push recurrentes NO persistidos (cobertura de logging incompleta). Multi-webhook + idempotencia incompleta SÍ — riesgo activo.

---

## 8. Recomendaciones priorizadas

1. **[Primero] Reparar `_syncInventory` + consolidar duplicados (C-1).** Es el daño de datos más grande, vivo y creciente, y corrompe el single-source-of-truth de stock. Fix de bajo esfuerzo (docId determinístico + `merge:true` elimina la query) y alto retorno; encadenar con `cleanup-inventory-duplicates.js` para los 1666 pares + backfill. Bloquea cualquier confianza en stock visible.

2. **[Segundo] Detener el retroceso de estados del cron pull (M-1).** Impacto operativo diario y silencioso: revierte el trabajo del operador cada 30 min mientras Cereza no avance de `pending`. Rank ordinal + solo-avances es contenido y de bajo riesgo. Daño ya documentado en órdenes reales (ORE-000352).

3. **[Tercero] Blindar lectores literales-ES contra MIGRATION_PHASE (H-1).** Falla latente pero de alta gravedad: cuando se dispare, el sync de estados se rompe en silencio (`checked:0`). Migrar a `readIntegrationField` + query resiliente a fase + warning. Hacerlo ANTES de cualquier avance de la migración EN.

4. **[Cuarto] Cerrar el gap de idempotencia de inventory-adjust en runtime (M-4) + dedup de webhook por delivery.** El triple-decremento ya ocurrió; el guard nunca actuó orgánicamente porque `referenciaPedido` resuelve vacío (contexto `$node` ausente en el mapper). Arreglar la resolución de `referenciaPedido`, añadir test con emulador, y considerar dedup por `X-Shopify-Webhook-Id` en la ingesta (87.5% de órdenes se reprocesan ~4.6x).

5. **[Quinto] Eliminar el "verde mentiroso" / observabilidad (deuda transversal).** Distinguir runs con skips silenciosos del éxito real; un dashboard sobre `osmosis_push_log` + banderas `requiereAtencionLogistica` para que logística vea qué pedidos NO llegaron a Cereza. Completar la cobertura de `osmosis_push_log` (hoy 3 docs vs 16 órdenes pushed).

6. **[Sexto, deuda planificada] Decidir el webhook entrante de estados (M-2):** habilitarlo (generar `webhookSecret` + cablear HMAC, unificando mapeo con el pull para evitar flapping) o documentarlo como deprecated y eliminar el código muerto `verifySignature`. Programar TTL policy en `flow_echo_guard` (4965 docs).

7. **[Cuando toque multi-variante] Implementar el TODO de variantes Shopify (M-3)** y los fixes de idempotencia/semántica de bajo riesgo: `idempotencyKey` determinista (L-2) e `isOrderPaid()` unificado (L-1).

---

*Nota de calibración: hallazgos marcados `refuted` (p.ej. "INGEST nunca llega a DIFF" — cursor 8253 == total 8253, ya en DIFF) NO se incluyen en §6. Premisas no verificables desde el repo (orden de paginación DESC de la API Osmosis, efectividad real de webhooks emitidos por Cereza, cifras `~96% catálogo sin sincronizar`) se marcan como **unverifiable** y no se reportan como bug.*