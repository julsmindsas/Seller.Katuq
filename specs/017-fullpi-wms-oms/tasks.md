# Tasks — Spec 017 Fullpi WMS

> **Status:** draft — checkpoint consolidado con spec.md + plan.md.
> Repo: `katuq_admin_back_firebase` (rama `backend-aws-security`), salvo T-11 (frontend).

## F1 — Núcleo del servicio (paralelizables entre sí tras T-01)

- [ ] **T-01** `integrationConfigService.js`: entrada `fullpi` en `PROVIDER_SCHEMAS`
      (`required:['apiUrl']`, `sensitive:['secret']`, `optional:['bodegaCode','statusMap','codigoBodegaWms','shippingMethodMap']`)
      + bloque en `validateConfig`.
- [ ] **T-02** `services/integrations/fullpi/fullpiApiClient.js`: axios por company (cache 5 min),
      secret desde `getConfig(companyId,'fullpi',true)` como query param; `createOrders`, `getOrders`, `getInventory`;
      401 → error tipado `FULLPI_UNAUTHORIZED` (sin retry loop).
- [ ] **T-03** `services/integrations/fullpi/fullpiStatusPolicy.js`: `FULLPI_TO_KATUQ` defaults
      (`TRANSITO NACIONAL→Despachado`, `Entregado→Entregado`, `No entregado/RETURNED→registro sin cambio de estado hasta confirmar tabla real`),
      merge con `config.statusMap`, `canApplyProviderStatus` anti-regresión, desconocido → `{action:'noop'}`.
- [ ] **T-04** `services/integrations/fullpi/fullpiOrderService.js`:
      `_mapKatuqOrderToFullpi` (payload del PDF, requeridos completos),
      `pushPendingPaidOrders(companyId)` (query candidatos → batch → success/failed por ítem →
      `integrations.fullpi` vía `integrationFieldHelper` + `fullpi_sync_log`; "already exist" = ya-creado),
      `pullAndSyncPendingOrders(companyId)` (rango fechas desde último sync, match `idOrden==nroPedido`,
      `ultimo=1` → policy → `estadoProceso` + `orderNotificationService.notifyStatusChange`).
- [ ] **T-05** Tests puros `scripts/test-017-fullpi.js`: mapper (requeridos, contraentrega vs pagado,
      shipping_method default), policy (anti-regresión, desconocido=noop, override config), parsing
      success/failed/already-exist. Sin red, sin emulador.

## F2 — Nodos /flows (secuencial tras F1)

- [ ] **T-06** `services/flows/nodes/fullpi/fullpi-orders-push.action.js` — wrapper delgado de
      `pushPendingPaidOrders`; error port por ítem con `statusReason`.
- [ ] **T-07** `services/flows/nodes/fullpi/fullpi-orders-status-pull.action.js` — wrapper de
      `pullAndSyncPendingOrders` (espejo de `osmosis-orders-status-pull`).
- [ ] **T-08** `services/flows/nodes/fullpi/fullpi-inventory-changed.trigger.js` — polling
      `getInventory`, diff vs `flow_polling_state`, emite `CanonicalInventoryAdjustment`
      (`reason:'fullpi_sync'`, `bodegaCode` desde `{{ $companyConfig.fullpi.bodegaCode }}`, parseInt de quantity).
- [ ] **T-09** Registro: `nodes/fullpi/index.js` (registerAll) + import/registro en `nodes/index.js` +
      3 types en `contracts/node-catalog.ts` + `'fullpi_sync'` en `ALLOWED_REASONS` de
      `katuq-inventory-adjust.action.js`.
- [ ] **T-10** `npm run generate:node-catalog` → commit `nodeCatalog.json`.
- [ ] **T-11** (FE) Regenerar `flows.fallback-catalog.ts` con el mismo script + `tsc --noEmit`.

## F3 — Provisioning OMS (tras F2)

- [ ] **T-12** Bodega `BOD-FULLPI-1` ("Fullpi") en `warehouses` de OMS + doc
      `integration_configs/OH MY STORE_fullpi` (apiUrl pruebas, bodegaCode, statusMap vacío) —
      script seed con `--dry-run` primero.
- [ ] **T-13** Seeds de los 3 flows (A push 10 min / B tracking 30 min / C inventario 30 min),
      **inactivos** — activar = toggle en /flows.
- [ ] **T-14** Registrar D-082 en CONTRACT.md + bitácora + commits con sello.

## F4 — Go-live (bloqueada por correo de Fullpi: secret + cobertura + tabla estados + codigoBodega)

- [ ] **T-15** Guardar secret real en `integration_secrets` (script, nunca en chat/código) +
      confirmar dominio real del API.
- [ ] **T-16** Prueba dirigida contra ambiente de pruebas: 1 orden de prueba → verificar en WMS →
      status pull → inventario (validar match SKU↔referencia con datos reales).
- [ ] **T-17** Completar `statusMap` con la tabla real + activar flows en OMS + monitoreo runs 48h.
