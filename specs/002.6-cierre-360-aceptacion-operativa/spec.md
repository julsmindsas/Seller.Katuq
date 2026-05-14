# Spec 002.6 — Cierre del 360: checklist de aceptación operativa

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloqueado por: 002.1, 002.2, 002.3, 002.4, 002.5
> Es la ÚLTIMA spec de la familia 002. Su sello cierra el goal D-010.

## 1. Contexto / Por qué

El goal del usuario (D-010) dice "dejar listo y funcionando todo el 360 y no tocar más nada". Sin un test sistémico no se puede afirmar que el 360 esté cerrado.

Esta spec **no implementa código nuevo de producto**. Es una spec de **validación end-to-end** + **documentación final** + **sello de cierre**.

## 2. Objetivo de negocio

Tener un checklist binario (pasa/falla) de los 8 escenarios que validan el 360. Cuando los 8 pasan, el goal se considera cerrado y se marca en `CONTRACT.md` con D-360-CLOSED.

## 3. Los 8 tests del 360 (criterios EARS)

Cada test es un script Node ejecutable contra OH MY STORE en sandbox o producción según indicación.

### Test 1 — Webhook entrante: cambio de estado básico
- **AC-T1.** WHEN se envía POST al webhook con `Authorization: Bearer <secret>` válido y body `{event:'order.status_updated', data:{external_id:<nroPedido_real>, status:'shipped'}}`, THEN el sistema responde 200 en ≤3s y la orden Katuq queda con `estadoProceso: 'Despachado'` Y `integrations.osmosis.statusHistory[]` con la entrada correspondiente.

### Test 2 — Webhook entrante: delivered con evidencia URL
- **AC-T2.** WHEN se envía evento `order.status_updated` con `status:'delivered'` y `data.evidence: {url:'https://...', note:'X'}`, THEN orden queda en `Entregado` Y `integrations.osmosis.evidenciasEntrega[]` tiene la evidencia con todos los campos preservados.

### Test 3 — Webhook entrante: token inválido
- **AC-T3.** WHEN se envía con `Authorization: Bearer TOKEN_FALSO`, THEN el sistema responde 200 (siempre 200 al webhook) PERO el log `osmosis_webhook_log/{companyId}/events/{evtId}` queda en `status: 'rejected_invalid_token'` Y la orden NO se modifica.

### Test 4 — Push outbound: pedido Shopify pagado → push automático
- **AC-T4.** WHEN se simula evento `shopify-order-created` con `financial_status: 'paid'`, THEN el flow `shopify-orders-to-cereza-7e6ab5a3` ejecuta sin errores Y la orden Katuq creada tiene `bodegaId: 'BOD-CEREZA-1'` Y `integrations.osmosis.isPushed: true`.

### Test 5 — Push outbound: idempotencia
- **AC-T5.** WHEN se ejecuta T4 dos veces con el mismo `shopifyOrderId`, THEN se crea una sola orden en Katuq Y se hace un solo push a Osmosis (no duplicado).

### Test 6 — Inventario descontado correctamente
- **AC-T6.** WHEN T4 ejecuta con éxito, THEN el doc `inventory` para el SKU vendido en `BOD-CEREZA-1` tiene `cantidad` reducida en la cantidad del pedido Y existe un `inventoryMovement` con `tipo: 'EGRESO'` y `motivo: 'Venta Shopify → Cereza'`.

### Test 7 — Migración inglés: nuevo doc tiene canónica EN
- **AC-T7.** WHEN T4 crea una orden nueva, THEN el doc `orders` tiene `integrations.osmosis.*` poblado Y (post-fase 4 de spec 002.1) NO tiene `integraciones.osmosis.*`.

### Test 8 — Resiliencia: zombie detectado y recuperado
- **AC-T8.** WHEN se ejecuta un flow y se mata el process mid-execution (simular restart), THEN en ≤5min el run aparece como `zombie`, en ≤6min hay un retry con `attempt: 2`, y este retry termina en `success` saltando los nodos ya completados (no duplica side effects).

## 4. Plan de implementación

### Construir suite ejecutable
- Crear `scripts/test-360-acceptance.js` con 8 funciones (`test1` a `test8`).
- Cada test es **autocontenido**: setup (crear data de prueba), ejecutar, verificar, cleanup.
- Cada test reporta `{name, status: 'PASS'|'FAIL', durationMs, evidence}`.
- Reporte final consolidado: tabla con 8 filas + totals.

### Output esperado
```
=== Test 360 Acceptance ===
Tenant: OH MY STORE
Ejecutado: 2026-05-XX 18:23:45
─────────────────────────────────────────────────────
Test 1 — Webhook estado básico .................. PASS (1.2s)
Test 2 — Webhook delivered + evidence ............ PASS (1.5s)
Test 3 — Webhook token inválido .................. PASS (0.8s)
Test 4 — Shopify paid → push automático .......... PASS (4.3s)
Test 5 — Push idempotente ........................ PASS (4.1s)
Test 6 — Inventario descontado ................... PASS (4.5s)
Test 7 — Doc nuevo canónica inglés ............... PASS (1.0s)
Test 8 — Resiliencia zombie ...................... PASS (315s)
─────────────────────────────────────────────────────
8/8 PASS  ✅
```

### Cierre
Cuando los 8 tests pasen:
1. Actualizar `CONTRACT.md` con decisión D-360-CLOSED + fecha + ejecutor.
2. Sellar specs 001, 002, 002.1-002.6 como `done`.
3. Commit final con mensaje `feat(360): cierre operativo Osmosis-Katuq-Shopify-webhook`.
4. Push a ambos repos.
5. Notificar al usuario.

## 5. Out of scope

- Tests automatizados en CI/CD (esto es one-shot de cierre).
- Carga de stress / performance.
- Tests para tenants distintos a OH MY STORE.

## 6. Dependencias

Todas las sub-specs anteriores implementadas:
- 002.1 fases 0-4 completadas (canónica inglés).
- 002.2 implementada (captura errores).
- 002.3 implementada (resiliencia).
- 002.4 implementada (bodega + inventario).
- 002.5 ejecutada (flow archivado).

## 7. Riesgos

- **R-01.** Test 8 (zombie) requiere matar process — riesgo de afectar otros runs en producción. Ejecutar en ventana de bajo tráfico o usar emulador.
- **R-02.** Tests crean docs reales en producción. Cleanup riguroso al final de cada test (borrar `__test_*` docs).
- **R-03.** Si Test 4 falla porque no llega webhook real desde Shopify (problema infraestructura), distinguir entre "bug del flow" y "Shopify caído".

## 8. Definition of Done del 360

| Item | Verificación |
|---|---|
| Spec 001 cerrada como `done` | Verificar status en `001-osmosis-webhook-inbound/spec.md` |
| Spec 002 marco cerrada como `done` | Idem |
| Specs 002.1 a 002.6 cerradas como `done` | Idem |
| 8/8 tests del Test 360 PASS | Output del script |
| Cero docs nuevos `orders` con `integraciones` (sin `integrations`) | Query post-deploy |
| Cero docs nuevos `products` con `integraciones` (sin `integrations`) | Query post-deploy |
| `flow_runs` con `failed` por BACKEND_RESTART en últimos 7 días = 0 | Query post-deploy |
| Frontend `osmosis-order-extras` muestra evidencia + historial correctamente | Validación visual con orden real |
| Memoria persistente actualizada | Verificar `~/.claude/.../memory/` |
| CONTRACT.md sellado con D-360-CLOSED | Diff |
| Commits a Seller.Katuq + katuq_admin_back_firebase con sello del 360 | git log |

Cuando TODO está ✅: el 360 cierra. No se toca más nada salvo cambios de requerimientos.
