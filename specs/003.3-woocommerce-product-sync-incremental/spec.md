# Spec 003.3 — WooCommerce: sync incremental de productos (Woo → Katuq)

> Estado: **draft** (2026-05-20)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Bloquea 003.4. Depende de 003.1.

## 1. Contexto / Por qué

Hoy no existe sincronización automática entre WooCommerce y Katuq: el comerciante debe ejecutar manualmente `importAllProducts` desde el backend, sin webhook reactivo para actualizaciones ni eliminaciones. Esto rompe la promesa del 360 plug-and-play. La spec implementa sync **unidireccional** Woo → Katuq (D-016) vía cron paginado + webhooks reactivos, con soft delete (D-017) y descuento de stock vía `inventoryService.updateStock()` (R-WOO-02, evita doble conteo).

## 2. Objetivo de negocio

Cualquier cambio en el catálogo del comerciante en WooCommerce (crear, editar, eliminar producto; cambiar stock) aparece reflejado en Katuq en ≤ 60s vía webhook o ≤ 2× el intervalo del cron (default 30 min para intervalo 15) sin intervención manual.

## 3. User stories

- Como **comerciante**, quiero **que los productos nuevos que cree en mi WooCommerce aparezcan en Katuq automáticamente**, para no duplicar trabajo cargándolos a mano.
- Como **comerciante**, quiero **que cuando borre un producto en Woo, en Katuq se desactive pero NO se borre**, para que mis órdenes históricas que lo referencian sigan abiertas (D-017).
- Como **operador Katuq**, quiero **que el descuento de stock pase por `inventoryService.updateStock()`**, para evitar el doble conteo que sucede al escribir en `inventory` directamente (CLAUDE.md regla crítica).

## 4. Criterios de aceptación (notación EARS)

- **AC-003.3-01.** WHEN un cron de sync ejecuta (frecuencia configurada en `$companyConfig.woocommerce.syncIntervalMinutes`), THE system SHALL paginar `GET /products?per_page=100&page=N&modified_after={lastSyncedAt}` hasta agotar páginas y procesar cada producto vía `processors/products.js`.
- **AC-003.3-02.** WHEN llega un webhook `product.created` o `product.updated` (procesado en 003.2), THE system SHALL dispatchear al mismo `processors/products.handleProductUpserted(event)` que el cron, para garantizar idempotencia y consistencia.
- **AC-003.3-03.** WHEN un producto se borra en Woo (webhook `product.deleted` o aparece con `status: 'trash'` en sync), THE system SHALL setear `disponibilidad.activo: false` + `integrations.woocommerce.deletedAt: ISO` en el doc Katuq. NO eliminar el doc.
- **AC-003.3-04.** WHEN un producto previamente soft-deleted vuelve a aparecer en Woo con `status: 'publish'`, THE system SHALL setear `disponibilidad.activo: true` y limpiar `integrations.woocommerce.deletedAt`.
- **AC-003.3-05.** THE mapper de producto Woo → Katuq SHALL mapear: `wc.id → integrations.woocommerce.product_id (snake_case, Art XV v2)`, `wc.sku → identificacion.referencia`, `wc.name → crearProducto.titulo`, `wc.description → crearProducto.descripcion`, `wc.short_description → crearProducto.resumen`, `wc.regular_price → precio.precioUnitarioConIva`, `wc.categories[].name → exposicion.categorias[]`, `wc.tags[].name → exposicion.etiquetas[]`, `wc.images[].src → crearProducto.imagenesPrincipales[].urls`, `wc.modified_gmt → integrations.woocommerce.syncedAt`.
- **AC-003.3-06.** WHEN un producto Woo tiene variaciones (`wc.type === 'variable'`), THE system SHALL traer cada variación con `GET /products/{id}/variations` y crear/actualizar productos variant en Katuq con `producto.cd` del padre + `integrations.woocommerce.variation_id`.
- **AC-003.3-07.** THE system SHALL ajustar el stock de cada producto sincronizado vía `inventoryService.updateStock({productoId, idBodega: bodegaCodeFromConfig, quantity: wc.stock_quantity, source: 'woocommerce-sync'})`. NUNCA escribir directamente en `inventory` collection (R-WOO-02).
- **AC-003.3-08.** IF WooCommerce devuelve 429 (rate limit), THEN THE system SHALL aplicar backoff exponencial (1s, 3s, 9s, hasta 3 intentos) antes de skip-tick. Log estructurado con `companyId + 429_count`.
- **AC-003.3-09.** IF un producto N falla en el mapper, THEN THE system SHALL emitir log con `wooProductId + error.message` y CONTINUAR con producto N+1 (no abortar el batch).
- **AC-003.3-10.** THE system SHALL persistir el cursor de sync `integration_configs.{COMPANY}_woocommerce.syncCursor` con `{lastSyncedAt: ISO, lastProductId: number}` para que el próximo cron solo procese productos modificados después de ese timestamp (sync incremental, no full).

## 5. Requisitos no funcionales

### 5.1 Performance
- Throughput sync ≥ 100 productos/min con paginación `per_page=100`. Limitado por rate-limit de WooCommerce (sin throttle oficial documentado).
- Webhook `product.updated`: procesar y reflejar en Katuq en ≤ 60s p95.

### 5.2 Seguridad
- Webhook ya validado por 003.2 (HMAC + dedup).
- Cron auto-autenticado (corre como servicio backend, no expuesto a usuarios).

### 5.3 Observabilidad (Art VII)
- Logs estructurados con `correlationId = syncRunId` (uuid v7) por cada ejecución de cron.
- Métricas por empresa: `products_synced_per_run, errors_per_run, duration_ms_per_run`.
- Si > 10 errores en 1 run, escalar a `severity: WARN` en provider-dashboard.

### 5.4 Resiliencia (Art IV)
- Si cron falla mid-batch, el cursor NO avanza → próximo tick re-procesa desde último cursor exitoso.
- Operaciones idempotentes: re-procesar mismo producto N veces = mismo estado final.
- Si WooCommerce está down, skip-tick con log + no marcar run como failed.

## 6. Out of scope (explícito)

- Sync bidireccional Katuq → Woo (D-016, difiere a 003.8 si piloto pide).
- Sync de customers (fase 2, el `order.created` ya trae customer embebido).
- Sync de cupones / códigos descuento.
- Refunds y cancellations.
- Importación masiva ad-hoc (el endpoint `importAllProducts` existente sigue disponible para uso manual desde admin; esta spec NO lo reemplaza, lo complementa).
- Fulfillment Katuq → Woo (fase 2).

## 7. Dependencias

- **003.1 done** — `bodegaCode` en schema.
- **003.2 done** — webhook entrante secure pipeline (para webhooks `product.*`).
- **002.7 done** — `$companyConfig.woocommerce.syncIntervalMinutes` disponible en runtime.
- **002.9 done** — cron catchup post-restart (asegura que cron no pierde ticks por restart EC2).
- `inventoryService.updateStock()` (existente) — normaliza productoId, evita doble conteo.
- `woocommerceService.getWooCommerceApiClient(companyId)` (existente).

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.3-01** (heredada Q-WOO-03 del marco): mapping borrador en AC-003.3-05. ¿Hay campos custom Katuq que NO se pueden derivar de Woo? Default: dejar `producto.peso, producto.dimensiones` vacíos si Woo no los provee; el comerciante los completa manual en Katuq.
- [ ] **Q-003.3-02**: cuando el cron arranca por primera vez en una empresa, `syncCursor.lastSyncedAt` es null. ¿Full sync o limitar a últimos 90 días? Default propuesto: **full sync paginado** (con log de progreso); si el catálogo es enorme (>10k productos) el comerciante puede pausar y ajustar cursor manual.
- [ ] **Q-003.3-03**: para productos variables, ¿cada variación es un doc Katuq separado con `productoPadre.cd`, o se mantiene como subcollection? Default propuesto: doc separado con `productoPadre.cd` (consistente con cómo Aliaddo ya lo maneja).

## 9. Riesgos identificados

- **R-003.3-01** (Alto): doble conteo en `inventory` (deuda registrada del 002) — mitigado por uso obligatorio de `inventoryService.updateStock()` (AC-003.3-07). Si algún processor escribe directo, el bug se infla. **Code review estricto** en T-XX.
- **R-003.3-02** (Medio): mapper puede perder campos custom del comerciante (ej. metafields WC). Mitigación: log "campos no mapeados" con `wooProductId` para auditoría manual.
- **R-003.3-03** (Bajo): `modified_after` puede ser unreliable si WooCommerce tiene desfase horario con Katuq. Mitigación: usar `modified_gmt` siempre (UTC) + tolerancia 5min al cursor.

## 10. Métricas de éxito post-launch

- **M-003.3-01**: 100% de productos del comerciante reflejados en Katuq en ≤ 24h post-onboarding.
- **M-003.3-02**: latencia p95 webhook `product.updated` → reflejado en Katuq ≤ 60s.
- **M-003.3-03**: 0 escrituras directas a `inventory` collection desde código Woo (auditable con grep).
- **M-003.3-04**: tasa de productos con error de mapping ≤ 1% del catálogo del comerciante.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
