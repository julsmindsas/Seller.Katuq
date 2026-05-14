# Spec 002.5 — Consolidar 2 flows duplicados Shopify → Osmosis

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloqueado por: 002.4 (el active será modificado allí, decidir antes de tocar)
> Bloquea: 002.6

## 1. Contexto / Por qué

Auditoría 2026-05-13 reveló DOS flows que cumplen el mismo propósito en OH MY STORE:

| flowId | status | versión | nodos | lo que hace |
|---|---|---|---|---|
| `shopify-orders-to-cereza-7e6ab5a3` | active | v17 | trigger:`shopify-order-created` → mapper → `product-resolver` → persist:`katuq-order-upsert` → osmosis:`osmosis-order-create` | Pipeline completo: recibe webhook Shopify, mapea a canónico, resuelve productos, persiste en Katuq, pushea a Osmosis |
| `shopify-orders-to-osmosis` | inactive | v1 | trigger:`shopify-order-created` → lookup:`katuq-order-lookup` → push:`osmosis-order-create` | Asume orden ya creada en Katuq, solo pushea (más limpio pero incompleto) |

El **active hace todo**, el **inactive parece la versión "limpia" alguien diseñó pero nunca terminó de activar**.

Tener 2 flows con el mismo trigger es peligroso: si alguien activa el inactive sin desactivar el active, se procesan los webhooks 2 veces.

## 2. Objetivo de negocio

Un único flow oficial activo para "pedido Shopify → push a Osmosis". Política para que esto no se repita.

## 3. User stories

- **US-1.** Como **dev en sesión futura**, quiero abrir la lista de flows y ver UN flow activo por concepto, no dos versiones competidoras.
- **US-2.** Como **operador**, quiero saber con confianza qué flow procesa cada webhook Shopify (sin ambigüedad).

## 4. Decisión recomendada

**Mantener `shopify-orders-to-cereza-7e6ab5a3` como ÚNICO flow activo** (post fixes de 002.4) y **archivar `shopify-orders-to-osmosis`** porque:
- El active ya tiene 17 versiones de iteración, mappings refinados, conocimiento operacional acumulado.
- El inactive nunca corrió en producción (`updatedBy: undefined`, version 1).
- Tirar 17 versiones de mejoras por una v1 limpia no compensa.

Sin embargo: el inactive tiene un detalle bueno (asume orden ya creada → menos acoplamiento). Esa idea se puede absorber post-360 si hace falta refactorizar.

## 5. Criterios de aceptación EARS

- **AC-01.** WHEN un evento `shopify-order-created` llega para OH MY STORE, THE system SHALL ser procesado por exactamente UN flow activo (`shopify-orders-to-cereza-7e6ab5a3`).
- **AC-02.** THE system SHALL marcar `shopify-orders-to-osmosis` como `status: 'archived'` (nuevo estado) o renombrar a `shopify-orders-to-osmosis-DEPRECATED-2026-05-13` para que no aparezca en la UI de flows activos.
- **AC-03.** WHEN se inspeccione el flow archivado, THE system SHALL mostrar la decisión (link a esta spec) en el campo `description` o `metadata.archivedReason`.
- **AC-04.** IF en el futuro se necesita el comportamiento del inactive (push sin upsert), SHALL crearse como nodo nuevo o flag del flow activo, NO como flow paralelo.

## 6. Plan de implementación

### Fase 1 — Validación previa
1. Confirmar que `shopify-orders-to-osmosis` no tiene runs recientes (sample query `flow_runs.where('flowId', '==', 'shopify-orders-to-osmosis')`).
2. Confirmar que ningún cron / webhook handler externo lo invoca por nombre.

### Fase 2 — Archivado
- Update doc `flows/shopify-orders-to-osmosis`:
  ```js
  await db.collection('flows').doc('shopify-orders-to-osmosis').update({
    status: 'archived',
    archivedAt: FieldValue.serverTimestamp(),
    archivedBy: 'spec-002.5',
    archivedReason: 'Consolidado: shopify-orders-to-cereza-7e6ab5a3 es el flow oficial. Ver specs/002.5-consolidar-flows-shopify-to-osmosis/',
    metadata: { ...(d.metadata || {}), supersededBy: 'shopify-orders-to-cereza-7e6ab5a3' },
  });
  ```
- Verificar que la lista de flows en frontend filtra los `archived` (probable: cambio en `flowsService` para excluir `archived`).

### Fase 3 — Documentar política
- Agregar al CLAUDE.md de flows (o al runbook): "Si encuentras 2 flows con el mismo trigger en la misma empresa, NO crees uno nuevo — extiende el activo."

## 7. Out of scope

- Refactorizar el active a un diseño "más limpio". Eso es spec separada si surge.
- Auditar otras empresas para ver si tienen los 2 flows también — solo OH MY STORE en alcance del 360.

## 8. Riesgos

- **R-01.** Si en el futuro alguien quiere reactivar el inactive (porque es más simple), tendría que des-archivarlo primero. Documentado.
- **R-02.** El `status: 'archived'` puede no ser respetado por todos los runners. Verificar.

## 9. Dependencias

- 002.4 (fix bodega + inventario al active) — debe estar implementado y validado antes de archivar el inactive (no vaya a ser que la solución sea reactivar el inactive).

## 10. Métricas de éxito

- **M-01.** Cero runs nuevos del flow archivado en 7 días post-archivado.
- **M-02.** Cero confusión de devs futuros: la lista de flows muestra UN flow Shopify→Osmosis activo.
