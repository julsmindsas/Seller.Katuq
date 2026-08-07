# Tasks — encender-ledger-inventario

## 0. Preparación (sin producción)
- [x] 0.1 Revisar en la rama desplegada qué gates existen por bodega vs solo por empresa (`inventoryRolloutConfig`, config Osmosis `inventoryLedgerWarehouseCodes`/`inventoryLedgerAllWarehouses`) y documentar la matriz real de banderas.
- [x] 0.2 Umbral de promoción DEFINIDO con Daniel (2026-08-07, "dale"): 5 corridas sombra consecutivas sin divergencias no explicadas, mínimo 7 días.

## 1. Etapa A — Sombra en OMS (config, reversible)
- [x] 1.1 `companyConfig/OH MY STORE`: flags de sombra para ajustes y traslados. Verificar con un ajuste de prueba que el saldo lo siga escribiendo legacy y quede resumen en `inventory_audit`.
- [ ] 1.2 Config Osmosis OMS: `inventoryLedgerMode=shadow` con alcance de bodegas explícito. (La foto sigue APAGADA — la sombra de Osmosis solo actúa si algún día corre un sync manual autorizado.)
- [x] 1.3a Observador diario construido: `functions/scripts/observacion-sombra-inventario.js` (solo lectura; verifica etiqueta canónica, producto resoluble, un solo doc por par y saldo no negativo; exit 1 si diverge). Primera corrida 2026-08-07: LIMPIA (1/5). HALLAZGO: la sombra de manual/traslados NO persiste su evidencia en `inventory_audit` — solo viaja en la respuesta HTTP; persistirla requiere un parche chico en el controller (pendiente de aprobación de Daniel).
- [ ] 1.3b Revisión diaria durante la ventana (correr el observador cada día; 5 limpias consecutivas / mínimo 7 días habilitan promover ajustes manuales).

## 2. Etapa B — Promoción por origen (config, reversible)
- [ ] 2.1 Ajustes manuales → `transactional` (verificar `operationKey` llega desde la pantalla; pestañas viejas caen a legacy por diseño).
- [ ] 2.2 Traslados → `transactional` (probar un traslado real chico: 2 movimientos + idempotencia en una tx).
- [ ] 2.3 Fulfillment setTo → `transactional` (validación exacta de bodega, fallo cerrado ante ambigüedad).
- [ ] 2.4 Pedidos (huella `orders.inventoryEffect`) → sombra y luego transaccional; verificar con un pedido de prueba: descuento una vez, edición aplica diferencia, cancelación reintegra exacto.
- [ ] 2.5 Tras cada promoción: 3 días de monitoreo en `inventory_audit` antes de la siguiente.

## 3. Etapa C — Candados permanentes (código pequeño + contract test)
- [x] 3.1 Validación en frontera de escritura de movimientos: rechazar `idBodega` no-canónico y producto no resoluble (aplica también a caminos legacy). Test que intenta escribir un doc ID y espera rechazo.
- [ ] 3.2 Guard de bodegas: impedir borrar bodega con stock o historia; ofrecer archivado. Ajuste en pantalla Bodegas para mostrar el motivo.
- [ ] 3.3 Correr `test:inventory-safety-contract` y suites de emulador tocadas; build sin errores.

## 4. Remates de datos (dry-run primero, respaldo total)
- [x] 4.1 Café Escobar: drenar 5 filas duplicadas (58 uds) con el método D-151; verificación par por par post-apply.
- [x] 4.2 `channels.bodegasAsociadas` (campo muerto): grep de lectores en front/back/iOS = 0 usos → retirar el campo de los docs de canal (backup previo de los 4 docs OMS y equivalentes de otras empresas).

## 5. Cierre
- [ ] 5.1 Criterio de terminado: conciliación producto-a-producto de OMS ≥99% exacta en lo que Katuq controla; 0 movimientos nuevos sin `reason`; reintegro verificado con caso real.
- [ ] 5.2 Registrar bitácora en CONTRACT.md y archivar el change (`/opsx:archive`).
