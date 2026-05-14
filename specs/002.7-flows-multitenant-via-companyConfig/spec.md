# Spec 002.7 — Flows multi-tenant via `$companyConfig`

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Goal D-011: dejar `/flows` funcionando bien sin dañar lo que ya funciona.

## 1. Por qué

Los flows actuales (4 docs, todos OH MY STORE) son **per-tenant**: cada empresa duplica el flow con sus valores literales (`bodegaId: 'BOD-CEREZA-1'`). El nodo handler SÍ es dinámico — pero el flow no usa la dinamicidad porque el expressionEngine **no tiene** una variable que resuelva config de la integración por empresa.

**Esto bloquea:** onboarding de empresa nueva con Osmosis sin crear flow nuevo.

## 2. Criterios EARS

- **AC-01.** WHEN se ejecuta cualquier flow, THE expression engine SHALL exponer `$companyConfig.<provider>.<campo>` que resuelva al config de integración de la empresa al runtime (con cache 5min).
- **AC-02.** THE schema `PROVIDER_SCHEMAS.osmosis` SHALL incluir `bodegaCode` (business code) como optional, para que cada empresa configure su bodega virtual Cereza.
- **AC-03.** WHEN un nodo lee `bodegaId` de su params, THE system SHALL aceptar tanto literal como expression `{{ $companyConfig.osmosis.bodegaCode }}`.
- **AC-04.** IF el flow usa `$companyConfig.osmosis.bodegaCode` y la empresa no lo tiene configurado, THEN THE system SHALL throw VALIDATION antes de ejecutar el primer nodo (no fallar a mitad).
- **AC-05.** THE system SHALL eliminar defaults peligrosos en nodos handler (`default: 'cereza'`, `default: 'BOD-001'`) — si el flow no lo configura explícitamente, throw VALIDATION.
- **AC-06.** WHEN se actualiza la config de integración de una empresa, THE system SHALL invalidar el cache de `$companyConfig` para esa empresa.

## 3. Out of scope

- UI Angular para editar `bodegaCode` y otros campos del config (existe form genérico ya, basta exponer el campo).
- Migrar otros providers (Shopify, Aliaddo) — esta spec solo cubre Osmosis.
- Eliminar literalmente los flows OH MY STORE actuales — solo se actualizan a expressions.

## 4. Plan

1. Schema: `services/integrationConfigService.js` — añadir `bodegaCode` a `PROVIDER_SCHEMAS.osmosis.optional`.
2. ExpressionEngine: `services/flows/expressionEngine.js` — añadir `$companyConfig` resolver con cache.
3. Datos: cargar `bodegaCode: 'BOD-CEREZA-1'` en `integration_configs/OH MY STORE_osmosis`.
4. Flow docs: script que reemplaza literales por expressions en los 4 flows OH MY STORE.
5. Nodos: eliminar `default: 'cereza'` y `default: 'BOD-001'` en 4-5 archivos.
6. Test-run del flow `shopify-orders-to-cereza-7e6ab5a3` v19+ con expressions.

## 5. Riesgo + mitigación

- **R-01.** Si el reemplazo de literales se hace mal, los 4 flows quedan rotos. **Mitigación**: dry-run del script primero + backup del flow doc antes de update.
- **R-02.** `$companyConfig` puede crear loops si un nodo escribe en la config y otro lo lee mid-run. **Mitigación**: cache snapshot por run, no por request.
- **R-03.** El cache de 5min puede dar datos stale si alguien edita la config. **Mitigación**: invalidate explícito en `integrationConfigService.saveConfig`.

## 6. Métricas de éxito

- M-01. Flow `shopify-orders-to-cereza-7e6ab5a3` ejecuta sin literales `BOD-CEREZA-1` ni `cereza` en `params`.
- M-02. Cero regresiones en runs de OH MY STORE post-deploy (sample 50 runs en 24h).
- M-03. Onboarding de empresa nueva con Osmosis: configurar `integration_configs/{X}_osmosis` con su `bodegaCode` + duplicar flow doc del template — sin tocar código.
