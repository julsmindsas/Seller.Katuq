# Spec 003.6 — WooCommerce: suite de aceptación + sello D-WOO-360-MVP

> Estado: **draft** (2026-05-20)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Depende de 003.1, 003.2, 003.3, 003.4, 003.5.

## 1. Contexto / Por qué

Necesitamos un criterio binario y reproducible para declarar "WooCommerce 360 listo para piloto". Sin una suite E2E ejecutable, la decisión de invitar al primer comerciante real depende del feeling — patrón que el equipo ya repudió en 002.6. Esta sub-spec entrega 8 tests E2E binarios que cubren la promesa del marco 003. Cuando 8/8 PASS, se sella `D-WOO-360-MVP` en CONTRACT.md y se habilita la invitación a piloto.

## 2. Objetivo de negocio

Sello operativo `D-WOO-360-MVP` registrado en CONTRACT.md, demostrable contra fixtures + Firestore Emulator, que garantiza que cualquier comerciante puede completar onboarding + activar template + ver datos sincronizados sin intervención del equipo.

## 3. User stories

- Como **tech lead Katuq**, quiero **ejecutar `npm run test:wc-acceptance` y ver 8/8 PASS**, para tomar la decisión de invitar piloto con confianza.
- Como **operador**, quiero **monitorear el primer comercio piloto post-D-WOO-360-MVP** con el playbook ya conocido del 002, para detectar incidencias temprano.

## 4. Criterios de aceptación (notación EARS)

- **AC-003.6-01.** THE suite `scripts/test-woocommerce-360-acceptance.js` SHALL ejecutar 8 tests binarios en ≤ 5 min total y reportar `8/8 PASS` o falla específica con `testId, expected, actual`.
- **AC-003.6-02.** WHEN suite ejecuta Test 1 "Configurar Woo en /integrations", THE system SHALL: crear doc en `integration_configs/{TEST_COMPANY}_woocommerce.credentials` con `storeUrl, consumerKey, consumerSecret, bodegaCode` y verificar persistencia + cifrado de `consumerSecret`. PASS si doc existe y `bodegaCode === 'BOD-TEST-1'`.
- **AC-003.6-03.** WHEN Test 2 "HMAC rechaza POST sin firma", THE suite SHALL POSTear al endpoint webhook canónico sin cabecera `X-WC-Webhook-Signature` y verificar respuesta 401 + doc en `wc_webhook_rejected` collection.
- **AC-003.6-04.** WHEN Test 3 "Dedup retorna duplicate en segundo POST", THE suite SHALL POSTear 2× con mismo `X-WC-Webhook-Delivery-ID` y firma válida; primer POST retorna 200 `{accepted: true}`, segundo retorna 200 `{duplicate: true}`; doc en `wc_webhook_dedup` único.
- **AC-003.6-05.** WHEN Test 4 "Cron sync productos crea producto en Katuq", THE suite SHALL ejecutar `processors/products.syncBatch` con fixture mock de 5 productos Woo y verificar 5 docs en `products` collection con `integrations.woocommerce.product_id` poblado + `disponibilidad.activo: true`.
- **AC-003.6-06.** WHEN Test 5 "Webhook order.created crea pedido en Katuq", THE suite SHALL POSTear fixture firmado al endpoint canónico con topic `order.created`, esperar procesamiento worker, verificar doc en `orders` collection con `sourceOrder: 'woocommerce'` + `integrations.woocommerce.order_id` + `integrations.woocommerce.statusHistory[0]`.
- **AC-003.6-07.** WHEN Test 6 "Soft delete desactiva sin borrar", THE suite SHALL: (a) crear producto Katuq con `integrations.woocommerce.product_id: 999`, (b) procesar webhook `product.deleted` con id 999, (c) verificar `disponibilidad.activo: false` + `integrations.woocommerce.deletedAt` poblado + doc TODAVÍA EXISTE.
- **AC-003.6-08.** WHEN Test 7 "Flow falla con WC-CONFIG-MISSING", THE suite SHALL ejecutar nodo `woocommerce-fetch-products` con `ctx.$companyConfig.woocommerce = undefined`, verificar `nodeStates[id].error.code === 'WC-CONFIG-MISSING'` + mensaje friendly intacto.
- **AC-003.6-09.** WHEN Test 8 "Template plug-and-play activa flow en ≤ 2s", THE suite SHALL POSTear a `/v1/flows/instantiate-template` con `templateId: 'woo-sync-products-to-katuq'` + inputs válidos, medir latencia, verificar respuesta 200 con `flowId + bindingId` en ≤ 2s + docs persistidos atómicamente.
- **AC-003.6-10.** IF 8/8 PASS, THE script SHALL escribir en CONTRACT.md la decisión sello `D-WOO-360-MVP` con fecha actual + resumen de tests + hash del commit. IF cualquiera FALLA, NO escribir nada en CONTRACT.md y exit con código 1.

## 5. Requisitos no funcionales

### 5.1 Performance
- Suite total ≤ 5 min.
- Cada test individual ≤ 60s.

### 5.2 Seguridad
- Tests corren contra `TEST_COMPANY` aislada (Firestore Emulator preferido, NUNCA contra producción).
- Fixtures con credenciales sintéticas (no reales).
- `consumerSecret` cifrado verificable (Test 1 chequea cifrado at-rest).

### 5.3 Observabilidad
- Cada test emite log con `testId, status, durationMs`.
- Si falla: imprime `expected vs actual` + path a snapshot de Firestore (si aplica).

### 5.4 Resiliencia
- Si Firestore Emulator no está corriendo, el script aborta con mensaje claro `'Start Firestore Emulator with: firebase emulators:start'`.
- Tests independientes: cualquiera puede correr aislado con `npm run test:wc-acceptance -- --test=5`.

## 6. Out of scope (explícito)

- Tests contra Woo sandbox real (requiere credenciales sandbox no disponibles en MVP).
- Tests de carga / stress (deuda separada).
- Tests de UX visual (Cypress/Playwright cubierto en sub-specs individuales).
- Validación cross-browser de UI templates.

## 7. Dependencias

- **003.1..003.5 DONE** — sin esto cada sub-spec, los tests no pasan.
- Firestore Emulator instalable y ejecutable (`firebase-tools`).
- Fixtures `fixtures/woocommerce/wc-*.json` creados en 003.3 T-01.
- Script base inspirado en `scripts/test-360-acceptance.js` (spec 002.6, ya existe).

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.6-01** (heredada Q-WOO-06): tenant para tests = Firestore Emulator (default) o tenant aislado real "WOO TEST". Decisión: **Emulator** para CI/CD reproducible; **tenant real** opcional para sanity check manual pre-piloto.
- [ ] **Q-003.6-02**: ¿el script escribe directo en CONTRACT.md o emite un PR? Default propuesto: **escribe directo** (script tiene permisos, consistente con cómo se generó D-360-CLOSED). Operador hace git review post-suite.

## 9. Riesgos identificados

- **R-003.6-01** (Medio): Firestore Emulator puede comportarse distinto a producción en transacciones grandes. Mitigación: anotar las diferencias conocidas + reproducir tests críticos contra `WOO TEST` tenant real una vez.
- **R-003.6-02** (Bajo): suite falla por timing flaky en Test 5 (latencia worker async). Mitigación: usar `await waitFor(...)` con timeout generoso (30s) en lugar de `setTimeout` fijo.

## 10. Métricas de éxito post-launch

- **M-003.6-01**: D-WOO-360-MVP sellado en CONTRACT.md.
- **M-003.6-02**: Primer comerciante piloto invitado en ≤ 7 días post-sello.
- **M-003.6-03**: Comerciante piloto completa onboarding sin contacto con soporte (M-WOO-02 del marco).
- **M-003.6-04**: Suite ejecutable en CI en cada PR que toque `services/woocommerce/*` o `services/flows/nodes/woocommerce/*`.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
