# Plan 003.6 — WooCommerce: suite de aceptación + sello D-WOO-360-MVP

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md`.

## 1. Resumen técnico

Crear `scripts/test-woocommerce-360-acceptance.js` análogo a `scripts/test-360-acceptance.js` (002.6, existente). 8 tests E2E secuenciales contra Firestore Emulator + axios mock para Woo API. Sello `D-WOO-360-MVP` escrito a CONTRACT.md tras 8/8 PASS. Integrable en CI como `npm run test:wc-acceptance`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | |
| II — Spec captura intent | sí | |
| IV — Idempotencia | sí | Tests usan fixtures con dedup keys controladas. |
| V — Eventos crudos | sí | Tests verifican que `wc_webhook_log` persiste raw antes de procesar. |
| VI — UI no acoplada a proveedor | n/a | Suite backend. |
| VII — Observabilidad | sí | Logs estructurados + reporte final. |
| VIII — Test-first | sí (este es la materialización) | |
| IX — Angular | n/a | |
| X — Seguridad webhooks | sí | Test 2 valida HMAC rechaza. |
| XI — Datos sensibles fuera del log | sí | Fixtures con datos sintéticos. |
| XIII — ≤ 3 páginas | sí | |
| XV v2 — Canónica INGLÉS | sí | Tests verifican docs en `integrations.woocommerce.*` (no `integraciones`). |

## 3. Arquitectura

### 3.1 Componentes

```
katuq_admin_back_firebase/functions/
├── scripts/test-woocommerce-360-acceptance.js     (NUEVO — runner principal)
├── scripts/wc-acceptance/
│   ├── setup-emulator.js                          (start emulator, seed test tenant)
│   ├── teardown-emulator.js                       (cleanup)
│   ├── helpers/
│   │   ├── firestore-client.js                    (cliente test)
│   │   ├── http-client.js                         (axios apuntado a endpoint local)
│   │   └── sign-hmac-fixture.js                   (firmar payloads con webhookSecret de test)
│   └── tests/
│       ├── 01-configure-integration.test.js
│       ├── 02-hmac-rejects-unsigned.test.js
│       ├── 03-dedup-second-post.test.js
│       ├── 04-cron-sync-products.test.js
│       ├── 05-webhook-order-created.test.js
│       ├── 06-soft-delete.test.js
│       ├── 07-wc-config-missing.test.js
│       └── 08-template-instantiation-latency.test.js
└── package.json (script entry)
```

### 3.2 Diagrama de ejecución de la suite

```
[npm run test:wc-acceptance]
       │
       ▼
[scripts/test-woocommerce-360-acceptance.js]
       │
       ├──► [setup-emulator.start] (firebase emulators:start --only firestore en background)
       │
       ├──► [setup-emulator.seedTestTenant] (crea TEST_COMPANY + integration_configs)
       │
       ├──► [loop: ejecutar Tests 01..08 secuencialmente]
       │       │
       │       ├──► test passes → log "✅ PASS Test N"
       │       └──► test fails → log "❌ FAIL Test N: expected X actual Y"
       │
       ├──► [reporte final: N/8 PASS]
       │
       ├──► IF 8/8: 
       │       ├──► escribir D-WOO-360-MVP en CONTRACT.md (sección Decisiones)
       │       └──► exit 0
       │
       ├──► IF < 8/8:
       │       └──► exit 1
       │
       └──► [teardown-emulator.stop]
```

### 3.3 Decisiones técnicas

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Suite en JS plano (no Jest) | AC-003.6-01, consistencia con 002.6 | Jest: overhead de framework + harness adicional para emulator |
| Tests secuenciales (no paralelos) | Aislamiento de estado en Emulator | Paralelos: contamination entre tests, flakes |
| Firestore Emulator (no producción) | NFR 5.2 seguridad | Producción: riesgo de contaminar datos reales |
| Sello D-WOO-360-MVP escrito por script | AC-003.6-10, automatización | Manual: humano olvida marcar |
| HTTP client apuntado a endpoint local (backend en localhost:3300) | E2E real | Mocks de express: no valida router real |

## 4. Modelo de datos

### 4.1 TEST_COMPANY seed

```json
{
  "company": "WOO TEST",
  "name": "WooCommerce Test Tenant",
  "createdForTests": true,
  "integration_configs/WOO TEST_woocommerce.credentials": {
    "storeUrl": "https://wc-mock.test",
    "consumerKey": "ck_test_xxx",
    "consumerSecret": "<será cifrado>",
    "webhookSecret": "wc_webhook_secret_test_2026",
    "bodegaCode": "BOD-TEST-1",
    "apiVersion": "wc/v3",
    "verifySsl": false,
    "syncIntervalMinutes": 15
  }
}
```

### 4.2 D-WOO-360-MVP template (escrito post-suite)

```markdown
### 2026-MM-DD — D-WOO-360-MVP: Sello operativo WooCommerce 360 plug-and-play

- **Contexto:** suite `scripts/test-woocommerce-360-acceptance.js` ejecutada con 8/8 PASS contra Firestore Emulator + commit hash {GIT_HASH}.
- **Decisión:** Spec 003 marco + sub-specs 003.1..003.6 done. Goal del usuario "cualquier comerciante WooCommerce puede integrar facilísimo" CUMPLIDO técnicamente.
- **Habilitado:** invitación a primer comerciante piloto (M-WOO-02 del marco).
- **Tests passing (8/8):**
  - ✅ Test 1: Configurar Woo en /integrations
  - ✅ Test 2: HMAC rechaza POST sin firma
  - ✅ Test 3: Dedup retorna duplicate en segundo POST
  - ✅ Test 4: Cron sync productos crea producto en Katuq
  - ✅ Test 5: Webhook order.created crea pedido en Katuq
  - ✅ Test 6: Soft delete desactiva sin borrar
  - ✅ Test 7: Flow falla con WC-CONFIG-MISSING
  - ✅ Test 8: Template plug-and-play activa flow en ≤ 2s
- **Compromiso post-sello:** monitorear con `flow-cron-monitoring-playbook.md` durante primer mes con piloto. Cualquier ajuste futuro va por nueva spec.
```

## 5. Contratos

### 5.1 `scripts/test-woocommerce-360-acceptance.js` CLI

```bash
npm run test:wc-acceptance              # corre los 8 tests
npm run test:wc-acceptance -- --test=5  # corre solo el test 5
npm run test:wc-acceptance -- --keep-data  # no limpia tenant TEST post-suite
npm run test:wc-acceptance -- --dry-run    # ejecuta tests pero NO escribe D-WOO-360-MVP
```

### 5.2 Exit codes

- `0`: 8/8 PASS, sello escrito.
- `1`: < 8/8 PASS, sello NO escrito.
- `2`: error de setup (emulator no inicia, dependencias rotas).

### 5.3 Output esperado

```
🧪 WooCommerce 360 Acceptance Suite — 2026-05-XX
🏗️  Firestore Emulator iniciado en :8080
🌱 TEST_COMPANY 'WOO TEST' seedeado

▶ Test 1: Configurar Woo en /integrations
   ✅ PASS (245ms)
▶ Test 2: HMAC rechaza POST sin firma
   ✅ PASS (89ms)
▶ Test 3: Dedup retorna duplicate
   ✅ PASS (412ms)
▶ Test 4: Cron sync productos
   ✅ PASS (1.2s)
▶ Test 5: Webhook order.created crea pedido
   ✅ PASS (892ms)
▶ Test 6: Soft delete
   ✅ PASS (310ms)
▶ Test 7: WC-CONFIG-MISSING
   ✅ PASS (78ms)
▶ Test 8: Template plug-and-play latencia
   ✅ PASS (1.8s — bajo umbral de 2s)

═══════════════════════════════════════════
🎉 8/8 PASS — Total: 5.2s
📝 D-WOO-360-MVP escrito en CONTRACT.md
═══════════════════════════════════════════
```

## 6. Estrategia de testing

Auto-testing de la suite:
- **Unit tests** sobre helpers (sign-hmac-fixture, firestore-client wrappers).
- **Sanity check** manual: correr suite contra Emulator vacío esperando que 8/8 pasen.

## 7. Fases de implementación

1. **Fase A — Helpers + setup/teardown** `[P]`.
2. **Fase B — Test 1, 2, 7** (más simples, prep) `[P]`.
3. **Fase C — Test 3, 6** (dedup + soft delete) `[P]`.
4. **Fase D — Test 4, 5** (cron sync + webhook order) (deps: 003.3 done, 003.2 done).
5. **Fase E — Test 8** (template instanciación) (deps: 003.5 done).
6. **Fase F — Runner principal + reporte + escritura D-WOO-360-MVP**.
7. **Fase G — Integrar en CI** (GitHub Actions workflow).

## 8. Plan de rollout

- **Pre-merge**: correr suite contra Emulator en cada PR.
- **Post-merge sub-specs 003.x**: rotar piloto interno antes de invitar real.
- **Rollback**: la suite no genera cambios al backend ni frontend; eliminar el script no rompe nada.

## 9. Riesgos técnicos

- **R-Plan-01**: Firestore Emulator puede tener race condition con worker async del Test 5. Mitigación: `waitFor(predicate, {timeout: 30000})` polling cada 500ms.
- **R-Plan-02**: backend debe estar corriendo en localhost para que los tests E2E funcionen — agregar `firebase-tools` y `concurrently` en devDeps + script `npm run test:wc-acceptance:full` que arranca backend + emulator + suite en una sola línea.
- **R-Plan-03**: escritura a CONTRACT.md desde script puede generar conflictos si humanos editan en paralelo. Mitigación: warning previo "git pull antes de correr", lock check via `git status` antes de escribir.

## 10. Open questions técnicas

- Decidir si CI ejecuta suite o solo unit tests en pre-merge. Default propuesto: unit tests en pre-merge, suite completa en merge a `main`.
- Decidir si la suite es opcional para PR de hotfix urgente. Default propuesto: opcional con flag `[skip-acceptance]` en commit message.
