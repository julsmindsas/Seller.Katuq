# Tasks 003.5 — WooCommerce: templates plug-and-play

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md`.

## Convenciones
- `[P]` = paralelizable.
- `(deps: T-NN)` = dependencia explícita.

## Tareas

### T-01 — Definir schema de `flow_templates` (deps: ninguna) `[P]`
- **Output:** validador Firestore/JSON Schema + ejemplos de los 3 docs Woo.
- **Criterio de éxito:**
  - Schema documentado en `services/flows/templateSchema.js` (nuevo).
  - 3 fixtures `fixtures/flow-templates/woo-{sync-products,orders,stock-katuq-to-woo}.json`.
  - Validador que rechaza templates con jerga técnica en `displayNameAmigable` o `descripcionAmigable` (regex `\b(trigger|nodo|binding|expression|cron|webhook)\b`, exceptuando "webhook entrante" como término aceptable).
- **Archivos:** `services/flows/templateSchema.js` (nuevo), `tests/fixtures/flow-templates/*.json`.

### T-02 — `scripts/seed-woocommerce-templates.js` (deps: T-01)
- **Output:** script idempotente que upsertea 3 docs en `flow_templates`.
- **Criterio de éxito:**
  - `npm run seed:woocommerce-templates` ejecuta sin errores.
  - Idempotente: correr 2× no crea duplicados ni rompe.
  - Validates contra T-01 schema antes de escribir.
  - Logs claros: "✅ Seeded woo-sync-products-to-katuq (created|updated)".
- **Archivos:** `scripts/seed-woocommerce-templates.js` (nuevo) + entry en `package.json`.

### T-03 — Endpoint `POST /v1/flows/instantiate-template` (deps: T-01)
- **Output:** controller + ruta.
- **Criterio de éxito:**
  - Valida body `{templateId, inputs}`.
  - Verifica config Woo existe (`integration_configs.{COMPANY}_woocommerce`) → si no, 412 friendly.
  - Valida inputs contra schema del template (required, tipos).
  - Interpola `{{variable}}` en `flowSpec` con inputs.
  - `db.runTransaction`: crea `flows/{flowId}` + `flow_trigger_bindings/{bindingId}`.
  - Invoca `cronService.loadDynamicJobsFromFirestore` post-transacción (no en ella).
  - Response 200 con `{success, flowId, bindingId, message}`.
  - Tests contract: 4 escenarios (success, config faltante, inputs inválidos, template no existe).
- **Archivos:**
  - `controllers/flowTemplates.js` (nuevo).
  - `routers/flows.js` o equivalente (registrar ruta).

### T-04 — Endpoints `pause` / `resume` de bindings (deps: T-03) `[P]`
- **Output:** 2 endpoints REST.
- **Criterio de éxito:**
  - `POST /v1/flow-trigger-bindings/:id/pause` setea `status='inactive'` + `cronService.stopJob(id)`.
  - `POST /v1/flow-trigger-bindings/:id/resume` setea `status='active'` + `cronService.reloadJob(id)`.
  - Tests contract.
- **Archivos:** extender `controllers/flowTemplates.js` o `controllers/flows.js`.

### T-05 — Verificar componente `flow-templates/` existente (deps: ninguna) `[P]`
- **Output:** documento `flow-templates-component-audit.md` (no commiteado, sirve para Tasks siguientes).
- **Criterio de éxito:**
  - Lee `Seller.Katuq/src/app/components/flows/flow-templates/*.ts` y reporta: ¿tiene filtro por provider? ¿modal de configuración? ¿API de instanciación?
  - Decide: extender vs reescribir parcial. Si reescribir, abrir spec 003.5.1.
- **Archivos:** lectura, no escritura.

### T-06 — Frontend: extender `flow-templates.component` con filtro provider (deps: T-05) `[P con T-07]`
- **Output:** UI con chip selector "Todos | Shopify | WooCommerce | Osmosis | Wompi".
- **Criterio de éxito:**
  - HTML: `<div class="provider-chips">...</div>` con cada chip clickeable.
  - TS: `selectedProvider$ = signal | BehaviorSubject; filteredTemplates$ = templates$ | combineLatest`.
  - Default: "Todos".
  - Test: snapshot con chip seleccionado renderiza cards filtradas.
- **Archivos:**
  - `Seller.Katuq/src/app/components/flows/flow-templates/flow-templates.component.{ts,html,scss}`.

### T-07 — Frontend: modal de configuración inputs (deps: T-05) `[P con T-06]`
- **Output:** modal con form dinámico generado desde `template.inputs[]`.
- **Criterio de éxito:**
  - Cada tipo de input (`slider`, `picker-bodega`, `toggle`, `select`) tiene componente correspondiente.
  - Validators dinámicos (required).
  - Submit deshabilitado mientras form inválido.
  - Vocabulario: "Activar sincronización" (no "Crear flow") y "Cancelar".
- **Archivos:**
  - `flow-templates/template-config-modal.component.{ts,html,scss}` (nuevo).

### T-08 — Frontend: service `instantiate-template.service.ts` (deps: T-03, T-07)
- **Output:** servicio Angular para invocar endpoint backend.
- **Criterio de éxito:**
  - `instantiateTemplate(templateId, inputs) → Observable<{success, flowId, bindingId}>`.
  - Manejo de 412: redirige a `/integrations` con toast amigable.
  - Manejo de 400: muestra errores debajo de cada input.
  - Unit test con HttpClientTestingModule.
- **Archivos:**
  - `Seller.Katuq/src/app/components/flows/flow-templates/instantiate-template.service.ts` (nuevo).

### T-09 — Frontend: integrar modal + servicio + flujo completo (deps: T-06, T-07, T-08)
- **Output:** click "Activar" en modal dispara servicio + cierra modal + toast.
- **Criterio de éxito:**
  - On success: toast "✅ Sincronización activada" + cierra modal + refresh lista de flows.
  - On error: muestra error en modal sin cerrarlo.
- **Archivos:** `flow-templates.component.ts` (cablear).

### T-10 — Tests E2E (Cypress) flujo "Activar template Woo" (deps: T-02, T-09) `[opcional MVP]`
- **Output:** test E2E completo.
- **Criterio de éxito:**
  - Login → /integrations → configurar Woo (con fixtures) → /flows → "Crear desde plantilla" → chip WooCommerce → seleccionar "Sincronizar productos" → completar inputs → "Activar" → verificar toast + nuevo flow en lista + binding en Firestore.
- **Archivos:** `cypress/e2e/flows/woocommerce-template-activation.cy.ts` (nuevo).

### T-11 — Audit vocabulario amigable en UI templates (deps: T-09)
- **Output:** script grep que detecta jerga técnica.
- **Criterio de éxito:**
  - `npm run audit:templates-vocabulary` corre `grep -rEn "(trigger|nodo|binding|expression|cron expression|companyConfig)" Seller.Katuq/src/app/components/flows/flow-templates/`.
  - Retorna 0 hits.
- **Archivos:** `scripts/audit-templates-vocabulary.sh` + `package.json`.

## Orden de ejecución sugerido

```
Día 1: T-01 → T-02 + T-05 (audit) en paralelo
Día 2: T-03 → T-04 + T-06 + T-07 en paralelo (deps satisfechas)
Día 3: T-08 → T-09 → T-11
Día 4: T-10 (opcional MVP)
```

## Definition of Done

- 3 docs en `flow_templates` collection (verificable Firestore).
- Endpoint instantiate-template con 4/4 contract tests verdes.
- UI con chip provider + modal config + toast amigable.
- E2E test verde (T-10) o skip declarado en CONTRACT.md.
- `npm run audit:templates-vocabulary` retorna 0 hits.
- CONTRACT.md actualizado: spec 003.5 `approved → done`.
- README de specs actualizado.
