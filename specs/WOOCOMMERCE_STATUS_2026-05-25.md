# Estado WooCommerce vs Shopify — Katuq (2026-05-25)

> Snapshot post-sesión Shopify-Cereza. Compara el estado actual de WC contra
> los fixes recientes desplegados para Shopify, identifica gaps y propone
> plan accionable. Fuentes: `services/woocommerce/`, `services/shopify/`,
> Firestore (`flows`, `integration_configs`, `wc_webhook_events`, `orders`,
> `osmosis_push_log`), `Seller.Katuq/specs/CONTRACT.md`.

---

## TL;DR

- **WooCommerce está ~70% implementado en código** (specs 003.1..003.7 + 004
  marcadas done, D-WOO-360-MVP sellado 8/8 acceptance).
- **WooCommerce NO está siendo usado en producción**: 3 comerciantes con
  config (CAFE ESCOBAR, Mi Campo Verde, Tienda Demo KAI), **0 flows
  instanciados**, **0 webhooks procesados** (`wc_webhook_events` vacía),
  solo 4 pedidos históricos con `sourceOrder: 'woocommerce'`.
- **Gaps críticos vs Shopify (post-sesión 2026-05-24/25)**:
  1. NO existe `services/woocommerce/mappers/order.js` (Shopify lo tiene
     con `FULFILLMENT_STATUS_MAP`, `buildPagosAsentadosFromShopify`, cédula
     desde `billing.company`, normalización de teléfono).
  2. NO existe guard anti-checkout en `woocommerce-order-created.trigger.js`.
  3. NO se replicó el patrón `_persistPushFailure` (observabilidad) en el
     flujo WC→Cereza (que tampoco existe como flow instanciado).
  4. HMAC sigue desactivado en el router LEGACY (D-022).
- **Comerciante candidato piloto**: **Mi Campo Verde** (`shop.micampoverde.com`,
  config active, 1 pedido legítimo histórico).

---

## 1. Matriz de paridad WC vs Shopify

| Componente | Shopify | WooCommerce | Estado |
|---|---|---|---|
| `services/<provider>Service.js` (core) | 26 exports, 1240 LOC | 7 exports, 369 LOC | 🟡 27% |
| `mappers/order.js` | ✅ 18K LOC con todos los fixes 2026-05-24/25 | ❌ NO EXISTE (lógica embebida en controller legacy 2775 LOC) | 🔴 **CRÍTICO** |
| `mappers/product.js` | ✅ 4.9K LOC | ✅ 4.6K LOC | 🟢 paridad |
| `mappers/variant.js` | ✅ 5.6K LOC | ✅ 3.2K LOC | 🟢 |
| `mappers/phone.js` (normalize +57) | ✅ embebido en order.js (commit `ca2601c`) | ✅ standalone | 🟢 |
| `processors/orders.js` | ✅ 263 LOC con idempotencia secundaria | 🟡 89 LOC (puente al controller legacy) | 🟡 |
| `processors/products.js` | ✅ 8.1K LOC | ✅ 11.5K LOC | 🟢 |
| `processors/inventory.js` | ✅ 791B | ✅ 4.1K LOC | 🟢 |
| `webhookDedup.js` (Firestore SHA-256) | ✅ 2.6K | ✅ 2.5K | 🟢 paridad |
| `webhookQueue.js` (PubSub) | ✅ 2.3K | ✅ 2.4K | 🟢 paridad |
| `webhookWorker.js` | Cloud Function `shopifyWebhookWorker` | ✅ `webhookWorker.js` 7.5K + Cloud Function `wcWebhookWorker` | 🟢 paridad |
| HMAC service | ✅ `webhookSecurityService.js` activo | ✅ `helpers/auth.js` (activo en route canónica, **desactivado en legacy**) | 🟡 |
| Flow trigger nodes | 4 (`order-created`, `order-updated`, `product-changed`, `inventory-changed`) | 5 (los 4 anteriores + `woo-order-trigger` legacy) | 🟢 |
| Flow action nodes | 5 (order-create, product-upsert, fulfillment-create, bulk-product-sync, inventory-adjust) | 6 (los 5 anteriores + variantes) | 🟢 |
| Flow templates seeded | ✅ activos en prod | ✅ 3 templates (`woo-sync-products-to-katuq`, `woo-orders-to-katuq`, `woo-stock-katuq-to-woo`) | 🟢 |
| Flows INSTANCIADOS por comerciante | ✅ 3 activos (OH MY STORE) | ❌ **0 flows activos** | 🔴 |
| Cola `<provider>_webhook_events` | ✅ poblada | 🟡 colección creada pero vacía | 🟡 |
| Webhook entrante real | ✅ activo (#1154 procesado hace minutos) | ❌ ningún webhook procesado en prod | 🔴 |
| `osmosis_push_log` integración Cereza | ✅ activo (kind: success/error) | ❌ no aplica (sin flows WC→Cereza) | n/a |

---

## 2. Fixes recientes Shopify (2026-05-24/25) SIN equivalente WC

Estos son los cambios que hice en esta sesión para Shopify. Cada uno
representa una **deuda accionable** si querés activar WC con un piloto:

| Fix Shopify (commit) | Equivalente WC | Acción |
|---|---|---|
| Mapper `FULFILLMENT_STATUS_MAP: null/unfulfilled → 'ParaDespachar'` (`5cbf15d` + `4062c23`) | ❌ no existe mapper de orders WC canónico | Crear `services/woocommerce/mappers/order.js` con map equivalente desde WC `status` (`pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`, `trash`) al enum frontend |
| `buildPagosAsentadosFromShopify()` asienta `PagosAsentados[]` cuando paid (`d737297`+`90a6424`) | ❌ no existe | Espejar lógica. WC indica pago via `status=processing/completed` + `payment_method_title` + `total` |
| Cédula leída de `billing_address.company` en mapping declarativo flow Firestore (`shopify-orders-to-cereza`) | ❌ no hay flow WC→Cereza instanciado | Crear flow `woocommerce-orders-to-cereza` con mapping declarativo que lea `billing.company` (WC usa mismo campo, patrón Colombia idéntico) |
| Phone normalization (no duplicar `+57`) en `mapKatuqOrderToOsmosis` (`ca2601c`) | ✅ existe `services/woocommerce/mappers/phone.js` standalone | Validar que se invoque desde el mapper de orders cuando se cree |
| Guard anti-checkout en `shopify-order-created.trigger.js:114-126` (`f70228a`) | ❌ no existe en `woocommerce-order-created.trigger.js` | Replicar: skip si `$json.id` no es numérico válido o `line_items` vacío. **WC también dispara webhooks de drafts/borradores.** |
| Logging exhaustivo a `webhook_logs` desde `flowsController.webhookTrigger` (`b2708cb`+`3aba187`) | ✅ ya cubre cualquier flow (incluido futuro WC) | Sin cambio necesario; con activar un flow WC, automáticamente loguea |
| `katuq-order-upsert`: propagar `nroPedido`+`cd`+integraciones en UPDATE (`4b74613`) | ✅ aplica a cualquier flow | Sin cambio necesario |
| `katuq-order-upsert`: merge `PagosAsentados` con dedupe (`6908ba8`) | ✅ aplica a cualquier flow | Sin cambio necesario |
| `katuq-order-upsert`: guard v2 anti-checkout específico Shopify (`d023412`) | ⚠️ específico Shopify — para WC habría que ampliar | Extender guard para detectar también shape WC (`status` indefinido + `line_items` vacío) |
| `osmosis-order-create`: helper `_persistPushFailure` + bandera `requiereAtencionLogistica` + `osmosis_push_log` (`8a67bf3`) | ✅ aplica a cualquier flow que pushe a Cereza | Sin cambio necesario; con activar flow WC→Cereza, automáticamente trazado |
| `osmosis-order-create`: gate cédula con resolución de docId (`52706f6`) | ✅ aplica a cualquier flow | Sin cambio necesario |
| `osmosis-order-create`: warehouse extracción numérica `BOD-CEREZA-N → N` (`e5bcb15`) | ✅ aplica a cualquier flow | Sin cambio necesario |

**Conclusión sección 2**: los nodos genéricos del flow engine (upsert/osmosis-create/expressionEngine) **ya están listos para WC**. Lo que falta es **(a)** el mapper de orders WC y **(b)** el flow instanciado por comerciante con el mapping declarativo.

---

## 3. Bugs vivos en código WC

| # | Bug | Ubicación | Severidad | Notas |
|---|---|---|---|---|
| B-WC-1 | **HMAC desactivado en router LEGACY** | `routers/woocommerceWebhook.js:22` (line `// router.use(verifyWooCommerceSignature)`) | 🔴 Alto | Cualquier POST sin firma se acepta. Viola Art X de constitución. La route canónica nueva (`/v1/woocommerce/webhook/:companyId`) SÍ valida. Pendiente retirar legacy + 60 días (D-025). |
| B-WC-2 | **`controllers/woocommerceWebhook.js` 2775 LOC monolítico** | Todo el archivo | 🟡 Medio | Mezcla mapper + processor + handler + side-effects. Bloquea adopción de patrones canónicos. Refactor → `mappers/order.js` (D-024 abre la deuda). |
| B-WC-3 | **Nodo legacy `woo-order-trigger.trigger.js` sin uso** | `services/flows/nodes/woocommerce/woo-order-trigger.trigger.js` | 🟢 Bajo | Alias deprecated, no se invoca. Retirar tras D-025 (post-30 días). |
| B-WC-4 | **Soft delete no verificable en `productDeleted` legacy** | `controllers/woocommerceWebhook.js` función `productDeleted` | 🟡 Medio | Spec 003.3 dice "soft delete" (`disponibilidad.activo: false`). Código actual probablemente borra/marca `status: deleted` directo. Auditar. |

---

## 4. Estado runtime en producción

### 4.1 Comerciantes con `integration_configs.woocommerce`

| Comerciante | Store URL | Enabled | Status | Creado |
|---|---|---|---|---|
| CAFE ESCOBAR | `https://cafeescobar.shop` | true | active | 2025-01-23 |
| Mi Campo Verde | `https://shop.micampoverde.com` | true | active | 2025-01-09 |
| Tienda Demo KAI Import | `https://web-test.synko.com.co` | true | active | 2026-02-02 |

### 4.2 Flows WC activos en Firestore

**0 flows instanciados.** Templates seedeados pero ningún comerciante los activó vía `/flows/templates/:id/install`.

### 4.3 Templates de flow WC (en `flow_templates` collection)

| Template ID | Nombre | Tag | Listo para usar |
|---|---|---|---|
| `woo-orders-to-katuq` | Recibir pedidos de WooCommerce | recomendada | ✅ |
| `woo-sync-products-to-katuq` | Sincronizar productos WC → Katuq | recomendada | ✅ |
| `woo-stock-katuq-to-woo` | Empujar stock Katuq → WooCommerce | fase2 | ✅ (uso opcional) |

### 4.4 Cola `wc_webhook_events`

```
pending: 0, processing: 0, processed: 0, failed: 0, dead: 0
```

**Cero eventos procesados históricamente.** La cola está creada pero nunca recibió tráfico real.

### 4.5 Pedidos `sourceOrder='woocommerce'` en `orders`

| nroPedido | Company | estadoPago | estadoProceso | Comentario |
|---|---|---|---|---|
| 243 | Mi Campo Verde | processing | pendiente | Legítimo |
| 1054 | LA PASTELIDOG | completed | completado | Legítimo |
| — | (sin company) | — | pendiente | Test/incompleto |
| — | (sin company) | — | pendiente | Test/incompleto |

**Total: 4 pedidos**, 2 reales históricos y 2 incompletos.

### 4.6 Telemetría

- `webhook_logs.provider = 'woocommerce'`: **0 docs**
- `osmosis_push_log` con pedido WC: **0 entries** (no aplica, sin flow WC→Cereza)

---

## 5. Plan de acción priorizado (paridad Shopify)

### Fase 1 — Pre-piloto (1-1.5 días)

1. **Crear `services/woocommerce/mappers/order.js`** — espejo de Shopify `mappers/order.js`.
   - Map `status` WC (`pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`) → enum frontend (`SinProducir`, `ParaDespachar`, `Despachado`, `Cancelado`, `Rechazado`).
   - `buildPagosAsentadosFromWoo()` para `status === 'completed'`.
   - Extracción cédula de `billing.company` (WC también lo usa para Colombia).
   - Reusar `services/woocommerce/mappers/phone.js` standalone.
   - `mapWcOrderToKatuq(wcOrder, companyId, ctx)` y `mapWcOrderStatusUpdate(wcOrder)` análogos.

2. **Guard anti-checkout** en `woocommerce-order-created.trigger.js`.
   - Si `$json.id` no es numérico válido o `line_items` vacío → return `{main: [[]]}`.
   - Necesario porque WC dispara webhooks también para `order.draft` y a veces `order.cart` (apps).

3. **Reactivar / retirar definitivamente** el router legacy `routers/woocommerceWebhook.js`.
   - Si hay comerciantes usándolo todavía → activar HMAC (line 22).
   - Si no → retornar 410 Gone y migrar al canónico (D-025 dice esperar 30 días post-piloto).

### Fase 2 — Piloto (Mi Campo Verde)

4. **Instanciar 2 flows para Mi Campo Verde** vía `flow_templates`:
   - `woo-orders-to-katuq` (webhook orders → Katuq + push opcional a Cereza si aplica).
   - `woo-sync-products-to-katuq` (cron 15min sync productos).

5. **Crear flow `woocommerce-orders-to-cereza`** (si el comerciante usa Cereza, espejo de `shopify-orders-to-cereza-7e6ab5a3`):
   - Trigger: `woocommerce-order-created`.
   - Mapper: `katuq-canonical-mapper` con mapping declarativo en Firestore (mismas reglas que Shopify: estadoProceso='ParaDespachar', estadoPago paid → 'Aprobado', PagosAsentados[], cédula desde billing.company, etc.).
   - Persist: `katuq-order-upsert` con `matchBy: externalId`.
   - Push: `osmosis-order-create` con `requirePaid: true`.

6. **Webhook URL en WooCommerce admin** del comerciante:
   - `https://back.katuq.com/v1/flows/triggers/webhook/<flowId>/trigger`.
   - Mismo patrón que Shopify (sin endpoint dedicado, todo vía flow).

### Fase 3 — Validación end-to-end

7. **Test E2E sintético** (igual al que hicimos hoy con #E2E-PAID para Shopify):
   - POST con payload WC orders/create pending → verificar doc creado.
   - POST con payload WC orders/updated status=completed → verificar push a Cereza (si aplica) y `osmosis_push_log` poblado.

8. **Monitorear primeras 24-48h** con queries Firestore + tooling existente:
   - `webhook_logs` (provider='flow-webhook', payloadId real).
   - `osmosis_push_log` (success/error).
   - `wc_webhook_events` (status=processed).
   - Bandera `requiereAtencionLogistica` en docs WC para detectar fallas.

---

## 6. Esfuerzo estimado

| Fase | Esfuerzo Claude |
|---|---|
| 1. Pre-piloto (mapper + guard + decisión legacy) | 1-1.5 días |
| 2. Piloto (instanciar 2-3 flows + webhook + mapping declarativo) | 0.5 días + tiempo del comerciante |
| 3. Validación + monitoreo | 0.5 días |
| **Total para pasar de "código listo" a "piloto real corriendo"** | **~2-2.5 días** |

Sin contar tiempo del comerciante para configurar webhooks en su WooCommerce admin (5-10 min).

---

## 7. Referencias

- Specs SDD WC: `/Seller.Katuq/specs/003-woocommerce-360-marco/` (marco + 003.1..003.7).
- Spec 004: `/Seller.Katuq/specs/004-user-docs-flows/` (guía no-técnica).
- Memoria: `360-woocommerce-summary.md` (resumen post-WOO-360-MVP).
- Memoria: `legacy-mapper-shape-divergence-trap.md` (trampa al consolidar mappers).
- Decisiones activas: `CONTRACT.md` D-015..D-025 + D-WOO-360-MVP.
- Patrón canónico a replicar: `services/shopify/` completo + `flows/shopify-orders-to-cereza-7e6ab5a3` doc en Firestore.

---

**Última actualización**: 2026-05-25. Generado tras cerrar Shopify→Katuq→Cereza
end-to-end (#1154 → orderId Cereza 68, validado con E2E sintético + pedido real).
