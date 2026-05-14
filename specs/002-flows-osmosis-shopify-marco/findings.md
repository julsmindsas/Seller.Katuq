# Findings 002 — Estado real del sistema /flows ↔ Osmosis ↔ Shopify ↔ webhook

> **Lectura obligatoria** antes de tocar nada. Datos verificados contra Firestore en vivo el 2026-05-13 (tenant: OH MY STORE).
> Si en una sesión futura el dato no coincide con la realidad, actualizar este documento ANTES de proceder.

---

## 0. Cómo se obtuvo cada dato

Todo lo que sigue tiene un comando reproducible. Si dudas de un número, vuelve a ejecutar.

```bash
# Desde katuq_admin_back_firebase/functions/
node -e "<query>"   # ver runbook-debug-flow.md para snippets completos
```

---

## 1. Productos OH MY STORE (8,311 docs)

### Por fuente

| Fuente | Cantidad | Cómo se identifica |
|---|---|---|
| Cereza/Osmosis | **8,221** | `integraciones.osmosis` poblado |
| Aliado fulfillment (Aliaddo) | **82** | `costoFuente: 'aliaddo-api'`, `metadata.origenImportacion: 'aliaddo_fulfillment'`, `integrations.fulfillment.id` (UUID), `metadata.idOriginal` (UUID externo) |
| Propios | **8** | sin integraciones |
| Mixto | 0 | — |

### Divergencia es vs en (CRÍTICO)

| Estado | Productos |
|---|---|
| Solo `integraciones` (ES) | 1 |
| Solo `integrations` (EN) | **83** ← Aliaddo y propios |
| Ambos campos IGUALES | **0** ← nunca son copias |
| Ambos DIVERGENTES (schemas distintos) | **8,219** |
| Ninguno | 8 |

**Por qué divergen** — sample real producto `00FDDRroT0YfDlxt7kIQ`:
```
ES integraciones.osmosis = { id: 39540 (number), reference, syncSource: 'osmosis', lastSync: Timestamp }
EN integrations.osmosis  = { id: '39540' (string), reference, nodeSlug: 'cereza', syncedAt: ISO string }
```

No son copias — son **dos schemas paralelos** escritos por procesos distintos. Backfill ciego es imposible. Toca mapping consciente (ver 002.1).

---

## 2. Bodegas OH MY STORE (11 warehouses)

| idBodega | Nombre | Tipo | Provider externo |
|---|---|---|---|
| **001** | BOGOTA | Aliaddo fulfillment | UUID `db224d2f-...` |
| **002** | PEREIRA | Aliaddo fulfillment | UUID `7884a665-...` |
| **003** | MEDELLIN | Aliaddo fulfillment | UUID `1712e02b-...` |
| **004** | BUCARAMANGA | Aliaddo fulfillment | UUID `125220a4-...` |
| **005** | CALI | Aliaddo fulfillment | UUID `bce12a8c-...` |
| **PRCPL-01** | Principal | Aliaddo fulfillment | UUID `4bfbe93e-...` |
| **BOD-CEREZA-1** | Guía Cereza | Osmosis virtual | `osmosisStorageCode: 1` |
| BOD-006 | Tránsito | manual | — |
| BOD-007 | Devoluciones | manual | — |
| BOD-008 | Pérdidas/Mermas | manual | — |
| BOD-100 | Tecnología CALI | manual | — |

**Campo del flag de fulfillment**: `bodega.fulfillmentId` (UUID externo) y `bodega.fulfillmentProvider: 'aliaddo_fulfillment'`. **NO existe** un campo `fulfillment: true`.

⚠️ **`BOD-010` NO existe en warehouses**. Pero el flow `shopify-orders-to-cereza-7e6ab5a3` lo tiene **hardcodeado** en su mapper (ver §4). Bug confirmado.

---

## 3. Inventario OH MY STORE (12,858 docs)

| Métrica | Valor | Comentario |
|---|---|---|
| Total docs `inventory` | 12,858 | Más que productos (8,311) por duplicación |
| Docs con `productoId = Firestore docId` (correcto) | 12,477 | |
| Docs con `productoId = referencia (SKU string)` (legacy) | **381** | |
| **Duplicados (mismo producto+bodega)** | **1,666** | ~13% de inflación. CLAUDE.md advierte que infla totales hasta 60% si se suman sin normalizar. |
| Docs con stock > 0 | 3,342 (26%) | Confirma "2,200 productos cargados esta semana" del usuario |
| Stock total acumulado | 254,609 unidades | |

Distribución por bodega:
| Bodega | Docs | syncSource |
|---|---|---|
| BOD-CEREZA-1 | 11,891 | osmosis |
| 001-005, BOD-009/010/011 | ~75-194 c/u | (sin syncSource → manual / Aliaddo) |
| BOD-100, PRCPL-01 | 1-2 | manual |

`BOD-009`, `BOD-010`, `BOD-011` aparecen en `inventory` pero NO en `warehouses`. Bodegas fantasma.

---

## 4. Flows OH MY STORE

### 4 flows definidos en la colección `flows`

| flowId | name | status | nodos |
|---|---|---|---|
| `cereza-orders-status-pull-rdoavk0b` | Cereza → Katuq: pull estados pedidos | active | (ver subcollection) |
| `cereza-products-to-shopify-a5156643` | OH MY STORE — Cereza → Shopify (Productos + Inventario) | active | trigger:`osmosis-product-changed` → mapper → `katuq-product-upsert` → `shopify-product-upsert` → `shopify-inventory-adjust` |
| `shopify-orders-to-cereza-7e6ab5a3` | Shopify → Cereza (Pedidos) | **active** | trigger:`shopify-order-created` → mapper → `product-resolver` → persist:`katuq-order-upsert` → osmosis:`osmosis-order-create` |
| `shopify-orders-to-osmosis` | Shopify → Osmosis (Pedidos) | **inactive** | trigger:`shopify-order-created` → lookup:`katuq-order-lookup` → `osmosis-order-create` |

### ⚠️ Bugs confirmados en `shopify-orders-to-cereza-7e6ab5a3` (active, v17)

1. **`bodegaId: "BOD-010"` HARDCODEADO** en el mapper. La bodega no existe en `warehouses`. Debería ser `BOD-CEREZA-1`.
2. **NO tiene nodo `katuq-inventory-adjust`** después del push a Osmosis. **El stock de Katuq no se descuenta** cuando se vende por Shopify y se manda a Cereza.
3. **El mapper falla en test-run** (ejecutado contra payload Shopify simulado, ver runbook). Pero **el error real NO se guarda** en `nodeStates.mapper.error` — solo `status: 'failed'`. Imposible de debuggear.

### Stats de runs (sample 200)

| status | count |
|---|---|
| success | 145 |
| partial | 30 |
| failed | 25 |

→ **27.5% de los runs son problemáticos**. Esto es "se escrachan los crones" del usuario.

### Causa raíz de los `failed` (verificada en run real)

Run real `06a329db-07d6-4fa8-a650-78f441fe8efa`:
```json
{
  "code": "BACKEND_RESTART",
  "message": "Run marcado como zombie por runCleanupService — el backend probablemente reinició mientras se ejecutaba.",
  "retryable": false
}
```

**No son bugs de flow**. Son reinicios de Cloud Functions (deploy, reciclaje de instancia, OOM). Cuando el backend muere mid-run, queda zombie → `flowRunZombieCleanup` (cada 30 min) lo barre como `failed` con cero info útil.

---

## 5. Quién escribe `integraciones` vs `integrations` (mapa completo)

### Servicios oficiales (escriben SOLO en español, deben migrarse a inglés)

| Archivo | Líneas | Campo escrito |
|---|---|---|
| `services/integrations/osmosis/osmosisOrderService.js` | 79-86, 100-103, 139-141, 187-193 | `integraciones.osmosis.*` |
| `services/integrations/osmosis/osmosisWebhookService.js` | 226-270 | `integraciones.osmosis.*` |
| `services/integrations/osmosis/osmosisProductSyncService.js` | 148, 294 | `integraciones.osmosis` |

### Nodos /flows (estado mixto)

| Archivo | Comportamiento |
|---|---|
| `nodes/osmosis/osmosis-order-create.action.js:346-370` | 🔴 Escribe AMBOS con comentario "frontend lee integrations" (FALSO en código actual) |
| `nodes/shopify/shopify-product-upsert.action.js:362, 524` | ✅ Solo `integrations` (inglés, ya canónico) |
| `nodes/shopify/shopify-inventory-adjust.action.js:382` | ✅ Solo `integrations` |
| `nodes/shopify/utils/mapper.js:88` | ✅ Solo `integrations` |
| `nodes/internal/katuq-order-upsert.action.js` | Lee de ambos, escribe en `integraciones` |
| `nodes/internal/katuq-canonical-mapper.transform.js` | Emite según template del flow (mixto) |

### Frontend (lee español)

| Archivo:línea | Qué lee |
|---|---|
| `Seller.Katuq/src/app/components/ventas/list/list.component.ts:518` | `pedido.integraciones.osmosis.id` |
| `Seller.Katuq/src/app/components/despachos/components/enviame/tracking-details/tracking-details-modal.component.ts:298-305` | `pedido.integrations \|\| pedido.integraciones` (acepta ambos pero mayormente español) |
| `Seller.Katuq/src/app/components/despachos/components/osmosis-order-extras/osmosis-order-extras.component.ts` (creado en esta sesión) | `pedido.integraciones.osmosis.evidenciasEntrega` etc. |

---

## 6. Webhook entrante de Cereza (spec 001)

| Métrica | Valor |
|---|---|
| Eventos en `osmosis_webhook_log/OH MY STORE/events/` | 4 (3 pruebas mías + 1 rejected_invalid_token) |
| Eventos reales de Cereza recibidos | **0** (Cereza aún no ha disparado nada en producción) |
| `webhookSecret` cargado en `integration_secrets/OH MY STORE_osmosis` | ✅ sí (set 2026-05-13) |

---

## 7. Órdenes OH MY STORE (sample 248)

| Métrica | Valor |
|---|---|
| Canales | Venta Asistida 209 / Shopify 23 / unknown 16 |
| sourceOrder | shopify 23 / (none) 225 |
| estadoPago | Cancelado 62 / PreAprobado 152 / Pendiente 16 / Aprobado 1 |
| Con integración Osmosis pushed | 10 |
| Con `integraciones` y `integrations` divergentes | 16 (timestamps de microsegundos distintos — escrituras secuenciales del mismo handler) |

⚠️ Las 5 órdenes Shopify muestreadas estaban TODAS canceladas. Investigar tasa de cancelación es importante pero NO bloquea el 360.

---

## 8. Hallazgos cruzados — el resumen ejecutivo

| # | Hallazgo | Sub-spec que lo aborda |
|---|---|---|
| 1 | Errores de nodo NO se loguean en `nodeStates[id].error` | 002.2 |
| 2 | Reinicios de backend dejan runs zombies | 002.3 |
| 3 | `BOD-010` hardcodeado (bodega fantasma) | 002.4 |
| 4 | Falta nodo `katuq-inventory-adjust` después del push Osmosis | 002.4 |
| 5 | Dos flows Shopify→Osmosis desalineados | 002.5 |
| 6 | 8,219 productos con divergencia es/en (schemas distintos) | 002.1 |
| 7 | Doble escritura intencional en `osmosis-order-create.action.js:359-367` | 002.1 |
| 8 | Doble conteo inventario (1,666 docs duplicados, 381 legacy productoId) | (separado, no en 002 — registrado en CONTRACT.md como deuda) |
| 9 | Bodegas fantasma `BOD-009/010/011` en `inventory` pero no en `warehouses` | 002.4 (lo cubre al fixear BOD-010) |
| 10 | 27.5% de runs failed/partial sin error visible | 002.2 + 002.3 |
