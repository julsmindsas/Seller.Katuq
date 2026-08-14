# Tasks — encender-ledger-inventario

## 0. Preparación (sin producción)
- [x] 0.1 Revisar en la rama desplegada qué gates existen por bodega vs solo por empresa (`inventoryRolloutConfig`, config Osmosis `inventoryLedgerWarehouseCodes`/`inventoryLedgerAllWarehouses`) y documentar la matriz real de banderas.
- [x] 0.2 Umbral de promoción DEFINIDO con Daniel (2026-08-07, "dale"): 5 corridas sombra consecutivas sin divergencias no explicadas, mínimo 7 días.

## 1. Etapa A — Sombra en OMS (config, reversible)
- [x] 1.1 `companyConfig/OH MY STORE`: flags de sombra para ajustes y traslados. Verificar con un ajuste de prueba que el saldo lo siga escribiendo legacy y quede resumen en `inventory_audit`.
- [x] 1.2 HECHO (2026-08-10): `integration_configs/OH MY STORE_osmosis.config` con `inventoryLedgerMode=shadow`, `inventoryLedgerWarehouseCodes=[BOD-CEREZA-1,1A,1B,51]`, `allWarehouses=false` — verificado. La foto sigue APAGADA; si se reenciende, nace acotada.
- [x] 1.3a Observador diario construido (`functions/scripts/observacion-sombra-inventario.js`, solo lectura) e integrado con la evidencia persistida.
- [x] 1.3c Parche de persistencia de sombra (aprobado por Daniel 2026-08-07, desplegado `ae44152`): `shadowAuditService` guarda en `inventory_audit` el plan del ledger vs el saldo que dejó legacy con veredicto `divergente`, en los 4 endpoints (ajuste, lote, edición setTo, traslado); fire-and-forget, jamás frena la operación. Test puro 7 casos + smoke real (empresa sintética, rastro borrado). IMPORTANTE: el conteo hacia el umbral para manual/traslados ARRANCA 2026-08-07 con este parche — los días previos de sombra no tienen respaldo y no cuentan.
- [x] 1.3b AUTOMATIZADA (decisión de Daniel "con los flows", 2026-08-10): flow `inventario-verificacion-diaria-oms` corre 4:30am diario y persiste la evidencia; la lectura acumulada se hace al evaluar el umbral (~15-ago).

## 2. Etapa B — Promoción por origen (config, reversible)
- [ ] 2.1 Ajustes manuales → `transactional` (verificar `operationKey` llega desde la pantalla; pestañas viejas caen a legacy por diseño).
- [ ] 2.2 Traslados → `transactional` (probar un traslado real chico: 2 movimientos + idempotencia en una tx).
- [ ] 2.3 Fulfillment setTo → `transactional` (validación exacta de bodega, fallo cerrado ante ambigüedad).
- [ ] 2.4 Pedidos (huella `orders.inventoryEffect`) → sombra y luego transaccional; verificar con un pedido de prueba: descuento una vez, edición aplica diferencia, cancelación reintegra exacto.
- [ ] 2.5 Tras cada promoción: 3 días de monitoreo en `inventory_audit` antes de la siguiente.

## 3. Etapa C — Candados permanentes (código pequeño + contract test)
- [x] 3.1 Validación en frontera de escritura de movimientos: rechazar `idBodega` no-canónico y producto no resoluble (aplica también a caminos legacy). Test que intenta escribir un doc ID y espera rechazo.
- [x] 3.2 HECHO (2026-08-10, sesión roadmap, aprobado por Daniel): `warehouseDeletionGuard` desplegado — 409 con conteo y oferta de archivado; 8/8 test; smoke real: 9 de 13 bodegas OMS protegidas.
- [x] 3.3 HECHO (2026-08-10): 19 suites unitarias/contrato + 15 suites de emulador (cada una en proyecto demo aislado) = 34/34 PASS; build de producción del front sin errores. Acta en CONTRACT.

## 4. Remates de datos (dry-run primero, respaldo total)
- [x] 4.1 Café Escobar: drenar 5 filas duplicadas (58 uds) con el método D-151; verificación par por par post-apply.
- [x] 4.2 `channels.bodegasAsociadas` (campo muerto): grep de lectores en front/back/iOS = 0 usos → retirar el campo de los docs de canal (backup previo de los 4 docs OMS y equivalentes de otras empresas).

## 5. Cierre
- [ ] 5.1 Criterio de terminado: conciliación producto-a-producto de OMS ≥99% exacta en lo que Katuq controla; 0 movimientos nuevos sin `reason`; reintegro verificado con caso real.
- [ ] 5.2 Registrar bitácora en CONTRACT.md y archivar el change (`/opsx:archive`).
