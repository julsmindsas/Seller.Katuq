# Plan — Spec 017 Fullpi WMS

> **Status:** draft — checkpoint consolidado con spec.md.
> Basado en el blueprint verificado de la integración Osmosis (plantilla canónica) — ver findings del 2026-07-05.

## Decisiones de arquitectura

1. **Slug:** `fullpi`. Canónica `integrations.fullpi.*` (Art. XV v2), escrita vía
   `integrationFieldHelper.writeIntegrationFieldNested('fullpi', ...)`.
2. **Config/secrets:** entrada `fullpi` en `PROVIDER_SCHEMAS` de `integrationConfigService.js`:
   `required: ['apiUrl']`, `sensitive: ['secret']`, `optional: ['bodegaCode', 'statusMap', 'codigoBodegaWms']`.
   Doc `integration_configs/OH MY STORE_fullpi` + secret AES-GCM en `integration_secrets`.
3. **Servicio** `services/integrations/fullpi/` (espejo de osmosis, SIN authService — el secret
   va como query param en cada request):
   - `fullpiApiClient.js` — axios, instancia cacheada por company, 3 métodos:
     `createOrders(ordersArray)`, `getOrders(fechaInicio, fechaFin)`, `getInventory()`.
     401 → alerta secret inválido (no retry-loop).
   - `fullpiOrderService.js` — `pushPendingPaidOrders(companyId)` (query pedidos pagados/contraentrega
     con bodega Fullpi sin `integrations.fullpi.wmsOrderId` → batch al API → procesa success[]/failed[]),
     `pullAndSyncPendingOrders(companyId)` (getOrders por rango → match por idOrden=nroPedido →
     status_history con ultimo=1 → policy → estadoProceso + notifyStatusChange del punto único).
   - `fullpiStatusPolicy.js` — tabla `FULLPI_TO_KATUQ` (defaults conservadores + override por empresa
     desde `config.statusMap`), `canApplyProviderStatus` anti-regresión (copiado del patrón Osmosis),
     estado desconocido → no-op + doc en `fullpi_sync_log` (CA-09).
4. **Mapper Katuq → payload Fullpi** (dentro de fullpiOrderService, `_mapKatuqOrderToFullpi`):
   `idOrden=nroPedido`, buyer desde cliente, receiver desde datosEntrega, montos desde totales,
   `currency_ID:'COP'`, `payment_Type`: contraentrega → `"Pago contraentrega"`, pagado → `"Pagado"`,
   `shipping_method`: default `"NORMAL (3 A 5 DIAS)"` (mapa por formaEntrega en config),
   `products[]`: `sku=identificacion.referencia`, `cantidad`; `codigoBodega` desde config; `update:0`.
5. **Nodos /flows** `services/flows/nodes/fullpi/` — wrappers delgados (regla D-068/feedback):
   - `fullpi-orders-push.action` → `fullpiOrderService.pushPendingPaidOrders` (gate requirePaid interno).
   - `fullpi-orders-status-pull.action` → `fullpiOrderService.pullAndSyncPendingOrders`.
   - `fullpi-inventory-changed.trigger` (polling) → `fullpiApiClient.getInventory()`, diff vs
     `flow_polling_state`, emite `CanonicalInventoryAdjustment` `{productoId, bodegaCode, setTo, reason:'fullpi_sync'}`.
   - El inventario lo ESCRIBE el nodo genérico existente `katuq-inventory-adjust`
     (solo se agrega `'fullpi_sync'` a `ALLOWED_REASONS`). Cero código nuevo de escritura de inventario.
   - Registro: `nodes/fullpi/index.js` + `nodes/index.js` + types en `contracts/node-catalog.ts` +
     `npm run generate:node-catalog` (regenera `nodeCatalog.json` y el fallback Angular).
6. **Flows seed para OMS** (inactivos hasta tener secret — /flows es el toggle):
   - **A. Pedidos → Fullpi:** `schedule-cron` (cada 10 min) → `fullpi-orders-push`.
     (Sweep idempotente en vez de trigger por evento: no pierde pedidos, reintenta solo lo no-pusheado.)
   - **B. Tracking:** `schedule-cron` (cada 30 min) → `fullpi-orders-status-pull`.
   - **C. Inventario:** `fullpi-inventory-changed` (poll 30 min) → `katuq-inventory-adjust`.
7. **Bodega Katuq dedicada** para Fullpi (business code nuevo, ej. `BOD-FULLPI-1`) mapeada al
   `codigoBodega` del WMS cuando llegue el correo. Nada de Firestore doc IDs en `idBodega`.
8. **Fase 2 (no ahora):** `shippingProviders/fullpiProvider.js` para push manual desde Despachos
   (mismo patrón osmosisProvider → delega en fullpiOrderService).

## Gates contra constitución

- Art. XV v2 (canónica EN) ✓ — `integrations.fullpi`. Art. VI (UI no acoplada a provider) ✓ —
  todo por /flows y config. Secrets nunca en código/params ✓. Strategy sin if/else por provider ✓ —
  no se toca ningún orquestador. Spec ≤3 páginas ✓.

## Fases

| Fase | Contenido | Bloqueada por |
|---|---|---|
| **F1** | Schema config + apiClient + orderService + statusPolicy + mapper + tests puros (contract tests estilo `test-014`) | — |
| **F2** | 3 nodos + registro + catálogo regenerado (BE json + FE fallback) | F1 |
| **F3** | Seeds de flows OMS (inactivos) + bodega BOD-FULLPI-1 + config/secret placeholder | F2 |
| **F4** | Secret real → pruebas contra ambiente de pruebas → tabla de estados real → activar flows → E2E | correo de Fullpi |

## Riesgos

- **Tabla de estados incompleta** (PDF solo trae ejemplos) → policy conservadora + config override (CA-09).
- **Dominio con typo en el PDF** (`tientiempresa` vs `tiendiempresa`) → `apiUrl` es config, se confirma con el correo.
- **SKU match**: `sku` del WMS debe corresponder a `identificacion.referencia` de Katuq — validar con datos reales en F4 antes de activar inventario.
- **quantity como string** en el API → parseInt defensivo en el trigger.
