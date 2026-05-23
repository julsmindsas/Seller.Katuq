# Spec 003.7 — Cleanup legacy WooCommerce

> Estado: **implementación done** (2026-05-21). Fase 1+2+4 ejecutadas; Fase 3 (refactor importAllProducts) **DEFERIDA** con razón documentada.

## 1. Por qué

Tras el deploy del 360 WooCommerce (specs 003.1..003.6) quedó código legacy
del controller original que NO se limpió: `mapWooProductToKatuq` y otros
helpers duplicados, 11 colecciones Firestore de audit-trail del controller
legacy sin readers verificados, alias `woocommerce-order-event` en el catálogo
de nodos /flows sin fecha de retiro. El usuario advirtió específicamente
sobre `importAllProducts` por riesgo de impacto en escenarios Katuq.

## 2. Objetivo

Reducir deuda técnica del WooCommerce stack sin romper escenarios en uso.
4 fases ejecutadas con riesgo creciente — paramos en Fase 3 al detectar shapes
incompatibles.

## 3. User stories

- Como **dev backend**, quiero **mappers puros del controller legacy
  extraídos a módulos testeables**, para no duplicar lógica entre el camino
  legacy y el nuevo pipeline.
- Como **operador prod**, quiero **saber cuántas colecciones WC legacy
  están huérfanas en Firestore**, para decidir archival sin sorpresas.
- Como **tech lead**, quiero **fechas concretas de retiro** registradas en
  CONTRACT.md para los símbolos legacy (Art XII de constitución).

## 4. Criterios de aceptación (notación EARS)

- **AC-003.7-01.** THE script `audit-wc-legacy-collections.js` SHALL contar
  docs + readers + writers + último doc por cada colección WC legacy de
  manera read-only.
- **AC-003.7-02.** WHEN un comerciante usa endpoints `/v1/woocommerceWebhook/*`
  legacy, THE system SHALL seguir respondiendo idéntico al comportamiento
  pre-cleanup (compat 100% — solo refactor mecánico).
- **AC-003.7-03.** THE helpers `parsePhone` y `mapWooCommerceLocation` SHALL
  vivir en `services/woocommerce/mappers/{phone,colombian-location}.js` y
  ser importados desde el controller legacy.
- **AC-003.7-04.** IF el refactor de `importAllProducts` introduce cambio de
  shape del doc Katuq generado, THEN THE refactor SHALL ser DEFERIDO y la
  divergencia DOCUMENTADA en CONTRACT.md para spec 003.8 separada.
- **AC-003.7-05.** THE CONTRACT.md SHALL registrar fecha de retiro real
  para: alias `woocommerce-order-event`, router legacy `/v1/woocommerceWebhook/*`,
  9 colecciones WC sin readers.

## 5. Requisitos no funcionales

- **Seguridad**: cleanup es read-only en Firestore. Cero risk de pérdida de datos.
- **Reversibilidad**: cada cambio en 1 commit separado para revert atómico.
- **Compatibilidad**: 100% — endpoints legacy responden igual.

## 6. Out of scope

- Eliminar las 9 colecciones huérfanas (decisión separada, requiere consulta
  con stakeholders por riesgo de jobs externos no auditados).
- Refactor de `importAllProducts` (Fase 3 deferida).
- Eliminación física del archivo `woo-order-trigger.trigger.js` (alias activo).
- Refactor del controller legacy `woocommerceWebhook.js` (queda 2775 LOC).

## 7. Resultados ejecutados

### Fase 1 — Audit (✅ done)

`scripts/audit-wc-legacy-collections.js` ejecutado contra prod
(`julsmind-katuq`). Resultados:

| Colección | Docs | Readers | Writers | Último doc | Acción |
|---|---|---|---|---|---|
| `woocommerceOrders` | 145 | 1 (getRawOrders) | 1 | 2026-03-25 | mantener |
| `woocommerceOrdersMapped` | 139 | 2 (getMappedOrders) | 1 | 2026-03-25 | mantener |
| `woocommerce_order_updated` | 106 | 0 | 1 | 2026-03-25 | ⚠️ huérfana — archival candidato |
| `woocommerce_order_deleted` | 0 | 0 | 1 | — | vacía — writer eliminable |
| `woocommerce_product_{created,updated,deleted}` | 0 c/u | 0 | 1 | — | vacía — writers eliminables |
| `woocommerce_customer_{created,updated,deleted}` | 0 c/u | 0 | 1 | — | vacía — writers eliminables |
| `woocommerce_add_to_cart` | 0 | 0 | 1 | — | vacía — writer eliminable |

**Total**: 2 activas, 1 huérfana (106 docs), 8 vacías (writers sin uso real).

### Fase 2 — Extracción mappers (✅ done)

- `services/woocommerce/mappers/phone.js` — `parsePhone(phone)` puro.
- `services/woocommerce/mappers/colombian-location.js` — `mapWooCommerceLocation`
  con departamentos ISO 3166-2:CO + `getDepartmentName/getCountryName`.
- `controllers/woocommerceWebhook.js` (2839→2775 LOC): definiciones locales
  ELIMINADAS, imports al top, llamadas internas siguen funcionando 1:1.
- Verificación: `node -c controllers/woocommerceWebhook.js` ✅.

### Fase 3 — Refactor `importAllProducts` (❌ DEFERIDO)

Diff de shape entre `mapWooProductToKatuq` legacy vs `mappers/product.toKatuq`
nuevo:

| Campo | Legacy | Mío (003.3) |
|---|---|---|
| `precio.precioUnitarioConIva` | `number` | `string` |
| `precio.{precioUnitarioSinIva,precioUnitarioIva,porcentajeIva}` | sí (cálculo IVA 19%) | **faltan** |
| `disponibilidad.estado` | `bool` | **falta** (uso `activo`) |
| `disponibilidad.tipoEntrega` | `'Envío'` | **falta** |
| `integrations.woocommerce.id` | `number` | uso `product_id` (Art XV v2 snake_case) |
| `integrations.woocommerce.externalData.{...}` | anidado | flat |
| `integrations.woocommerce.lastSyncAt` | serverTimestamp | uso `syncedAt` ISO |
| `crearProducto.imagenesPrincipales[].name` | sí | uso `.alt` |
| `resumenProducto` | sí | **falta** |

**Decisión**: NO refactorizar `importAllProducts`. Refactor cambiaría
shape de docs Katuq existentes (~145 órdenes + N productos importados),
rompería frontend lectores y jobs internos. Costo > beneficio.

**Deuda registrada**: Spec 003.8 futura para armonizar shapes (requiere
migración de datos + actualizar lectores Angular + plan de rollout).

### Fase 4 — CONTRACT.md + fechas retiro (✅ done)

- D-022..D-025 registradas en CONTRACT.md con audit detallado.
- Fechas de retiro propuestas:
  - Alias nodo `woocommerce-order-event`: **2026-08-21** (90 días).
  - Router `/v1/woocommerceWebhook/*`: **post-piloto real + 60 días** (sin
    fecha absoluta — depende de migración del piloto).
  - 9 colecciones sin readers: **revisar tras piloto** (esperar 1 ciclo
    operativo para confirmar 0 dependencias externas).

## 8. Dependencias

- 003.1..003.6 done (todos los archivos del 003).
- Acceso a Firestore admin (serviceAccountKey.json) para audit script.

## 9. Riesgos

- **R-003.7-01**: las 9 colecciones huérfanas pueden tener consumidores
  externos (KAI, dashboards, jobs scheduled). Mitigación: no eliminar
  writers en este spec, solo documentar.
- **R-003.7-02**: el shape divergente de `mapWooProductToKatuq` significa que
  tenants que usen AMBOS paths (importAllProducts + sync incremental 003.3)
  van a tener docs mezclados. Mitigación: documentar que tenants nuevos
  deben usar SOLO el sync incremental.

## 10. Métricas

- **M-003.7-01**: 2775 LOC del controller legacy (era 2839, -2.3%).
- **M-003.7-02**: 2 nuevos módulos puros testeables: `mappers/phone`,
  `mappers/colombian-location`.
- **M-003.7-03**: 0 cambios de comportamiento en endpoints legacy.
- **M-003.7-04**: 9 colecciones identificadas como candidatas a archival
  (registradas en CONTRACT.md para revisión post-piloto).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] Audit re-ejecutado tras 30 días — los 0 readers siguen siendo 0.
- [ ] Fechas de retiro confirmadas con stakeholders.
- [ ] Decisión sobre eliminar writers de las 8 colecciones vacías (1 line
  change c/u en el controller, riesgo mínimo).
