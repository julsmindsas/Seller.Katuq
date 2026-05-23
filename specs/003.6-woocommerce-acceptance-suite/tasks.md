# Tasks 003.6 — WooCommerce: acceptance suite + sello D-WOO-360-MVP

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md`.

## Convenciones
- `[P]` = paralelizable.
- `(deps: T-NN)` = dependencia explícita.

## Tareas

### T-01 — Estructura base + setup/teardown emulator `[P]`
- **Output:** scripts en `scripts/wc-acceptance/`.
- **Criterio de éxito:**
  - `setup-emulator.js` ejecuta `firebase emulators:exec --only firestore` y espera ready.
  - `teardown-emulator.js` cleanup tenant TEST_COMPANY.
  - `helpers/firestore-client.js` apunta a `http://localhost:8080`.
  - `helpers/http-client.js` axios con `baseURL: http://localhost:3300`.
- **Archivos:** `katuq_admin_back_firebase/functions/scripts/wc-acceptance/{setup,teardown}-emulator.js`, helpers.

### T-02 — `helpers/sign-hmac-fixture.js` (deps: ninguna) `[P]`
- **Output:** función `signFixture(body, secret) → 'X-WC-Webhook-Signature value'`.
- **Criterio de éxito:**
  - HMAC SHA-256 base64 sobre body string.
  - Test unitario contra fixture pre-firmado conocido.
- **Archivos:** `scripts/wc-acceptance/helpers/sign-hmac-fixture.js` (nuevo).

### T-03 — Test 1: Configurar Woo en /integrations (deps: T-01)
- **Output:** `scripts/wc-acceptance/tests/01-configure-integration.test.js`.
- **Criterio de éxito:**
  - Crea doc TEST tenant + escribe `integration_configs/WOO TEST_woocommerce`.
  - Lee doc y verifica `bodegaCode === 'BOD-TEST-1'`.
  - Verifica que `consumerSecret` está cifrado at-rest (no en plano).
- **Archivos:** tests/01.

### T-04 — Test 2: HMAC rechaza POST sin firma (deps: T-01)
- **Output:** `tests/02-hmac-rejects-unsigned.test.js`.
- **Criterio de éxito:**
  - POST sin cabecera signature → 401.
  - Doc en `wc_webhook_rejected` collection con metadata.

### T-05 — Test 3: Dedup retorna duplicate (deps: T-01, T-02)
- **Output:** `tests/03-dedup-second-post.test.js`.
- **Criterio de éxito:**
  - POST 1 con deliveryId='abc' + firma válida → 200 accepted.
  - POST 2 mismo deliveryId → 200 duplicate.
  - Único doc en `wc_webhook_dedup/abc_WOO TEST`.

### T-06 — Test 4: Cron sync productos (deps: T-01)
- **Output:** `tests/04-cron-sync-products.test.js`.
- **Criterio de éxito:**
  - Mock axios responde con fixture `wc-product-simple.json` × 5 (paginación).
  - Ejecuta `processors/products.syncBatch('WOO TEST')`.
  - Verifica 5 docs en `products` collection con `integrations.woocommerce.product_id` poblado.

### T-07 — Test 5: Webhook order.created (deps: T-01, T-02)
- **Output:** `tests/05-webhook-order-created.test.js`.
- **Criterio de éxito:**
  - POST fixture `wc-order-created.json` firmado al endpoint canónico.
  - `waitFor` hasta que doc en `orders` collection aparezca (timeout 30s).
  - Verificar `sourceOrder === 'woocommerce'` + `integrations.woocommerce.order_id` + `statusHistory[0]`.

### T-08 — Test 6: Soft delete (deps: T-01)
- **Output:** `tests/06-soft-delete.test.js`.
- **Criterio de éxito:**
  - Seed doc en `products` con `integrations.woocommerce.product_id: 999, disponibilidad.activo: true`.
  - Invocar `processors/products.handleProductDeleted({wcProductId: 999})`.
  - Verificar `disponibilidad.activo === false` + `integrations.woocommerce.deletedAt !== null` + doc existe.

### T-09 — Test 7: WC-CONFIG-MISSING (deps: T-01)
- **Output:** `tests/07-wc-config-missing.test.js`.
- **Criterio de éxito:**
  - Ejecutar nodo `woocommerce-fetch-products` con `ctx.$companyConfig.woocommerce = undefined`.
  - Verificar `nodeStates['fetch'].error.code === 'WC-CONFIG-MISSING'`.
  - Verificar mensaje friendly intacto.

### T-10 — Test 8: Template plug-and-play latencia (deps: T-01, 003.5 done)
- **Output:** `tests/08-template-instantiation-latency.test.js`.
- **Criterio de éxito:**
  - Seed template `woo-sync-products-to-katuq` en `flow_templates`.
  - POST `/v1/flows/instantiate-template` con inputs válidos.
  - Medir latencia ≤ 2s.
  - Verificar `flows/{generatedFlowId}` + `flow_trigger_bindings/{bindingId}` existen.

### T-11 — Runner principal `test-woocommerce-360-acceptance.js` (deps: T-03..T-10)
- **Output:** orquestador que corre los 8 tests + reporta + escribe sello.
- **Criterio de éxito:**
  - Args CLI: `--test=N`, `--keep-data`, `--dry-run`.
  - Output formateado con emojis y latencia por test.
  - Si `--dry-run` + 8/8 PASS: log "would write D-WOO-360-MVP".
  - Si NO dry-run + 8/8 PASS: escribe entrada en CONTRACT.md sección 3 (Decisiones) usando plantilla de plan.md §4.2 con `{DATE}` y `{GIT_HASH}` reales.
  - Si < 8/8 PASS: exit 1, NO escribir.
  - `npm run test:wc-acceptance` entry en package.json.
- **Archivos:** `scripts/test-woocommerce-360-acceptance.js` + entry package.json.

### T-12 — GitHub Actions workflow (deps: T-11) `[opcional MVP]`
- **Output:** `.github/workflows/wc-acceptance.yml`.
- **Criterio de éxito:**
  - Trigger: PR que toque `services/woocommerce/*` o `services/flows/nodes/woocommerce/*`.
  - Steps: instalar firebase-tools, ejecutar `npm run test:wc-acceptance:full`.
  - Comment en PR con resultado.
- **Archivos:** `.github/workflows/wc-acceptance.yml`.

### T-13 — Documentar en CLAUDE.md cómo correr la suite (deps: T-11)
- **Output:** sección añadida a `katuq_admin_back_firebase/functions/CLAUDE.md` o equivalente.
- **Criterio de éxito:**
  - Comandos exactos para devs.
  - Cómo interpretar PASS/FAIL.
  - Cómo agregar test 9° si se requiere en futuras specs.
- **Archivos:** modificar CLAUDE.md correspondiente.

## Orden de ejecución sugerido

```
Día 1: T-01 [P] T-02 [P]
Día 2: T-03 + T-04 + T-09 (en paralelo, los más simples)
Día 3: T-05 + T-06 + T-08 (deps T-01, T-02)
Día 4: T-07 (deps 003.2 done) + T-10 (deps 003.5 done)
Día 5: T-11 (runner) + T-13 (docs)
Día 6 (opcional): T-12 (CI workflow)
```

## Definition of Done

- Los 8 tests passing en local.
- Suite ejecutable como `npm run test:wc-acceptance` con exit 0 en 8/8.
- Si todos los sub-specs 003.1..003.5 están done, el sello D-WOO-360-MVP se escribe automáticamente.
- CONTRACT.md actualizado: spec 003.6 `approved → done` + sello D-WOO-360-MVP visible en sección Decisiones.
- README de specs: 003.6 marcada done.
- (Opcional MVP) CI workflow activo + corre en cada PR relevante.
