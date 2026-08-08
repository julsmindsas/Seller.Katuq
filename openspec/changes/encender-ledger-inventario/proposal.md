# Propuesta: encender el libro contable de inventario por etapas (Fase 1 del roadmap WMS)

## Why

La estabilización de inventario (D-153) quedó desplegada en producción el 2026-08-05 con todo lo transaccional **dormido tras banderas**: el ledger atómico (saldo + movimiento + idempotencia confirman juntos o ninguno), la huella única del pedido y los claims del push. Mientras duerma, el descuento y el reintegro siguen por los caminos legacy: funcionan (verificado D-148..152), pero sin la garantía de "exactamente una vez" ni el rechazo duro de identidades ambiguas — el mismo tipo de deuda que produjo los 1.906 movimientos mal etiquetados y los 11.876 duplicados que hubo que limpiar a mano.

Esta propuesta es la Fase 1 del roadmap WMS aprobado como dirección el 2026-08-06 (ver artifact "Katuq → WMS · Roadmap por fases" y D-154): encender lo ya instalado, por etapas, con evidencia en cada paso. Es la fase de MENOR desarrollo del roadmap — es encendido + observación — y es prerrequisito de todas las demás (reservas, corte certificado, materia prima, piso de bodega).

## What Changes

- **Etapa A — Sombra en OMS**: `inventoryLedgerMode=shadow` en la config de Osmosis y flags de sombra para ajustes/traslados en `companyConfig/OH MY STORE`. El ledger calcula y compara SIN escribir; cada corrida deja resumen agregado en `inventory_audit`. Se observa 1–2 semanas.
- **Etapa B — Canario transaccional por origen**: promover origen por origen (ajustes manuales → traslados → Fullpi setTo → pedidos), bodega por bodega donde aplique, solo si la sombra de ese origen estuvo limpia. Reversa = volver la bandera a `legacy` (inmediata, sin deploy).
- **Etapa C — Candados permanentes**: (1) toda escritura nueva de movimiento rechaza identidad ambigua (doc ID donde va business code, producto no resoluble); (2) no se puede borrar/desactivar una bodega con stock o historia — se archiva.
- **Remates de datos incluidos**: drenar las 5 filas duplicadas de Café Escobar (58 uds) con el método D-151 (dry-run → apply, respaldo total) y limpiar el campo muerto `bodegasAsociadas` embebido en `channels` (la fuente real es `channelWarehouseAssociations`).

## Capabilities

### New Capabilities
- `inventory-ledger-rollout`: encendido gobernado (sombra → canario → transaccional) del ledger ya desplegado, con evidencia, umbrales y reversa por bandera.

### Modified Capabilities
Ninguna — no se escribe código nuevo de contabilidad: se opera el ya probado (12/12 unitarias + 15/15 emulador sobre el árbol fusionado).

## Impact

- Config: `integration_configs/OH MY STORE_osmosis` (modo ledger), `companyConfig/OH MY STORE` (flags ajustes/traslados), por empresa y por bodega.
- Código: solo los 2 candados de la Etapa C (validación en frontera de escritura + guard de borrado de bodega) — pequeños, con contract test.
- Datos: los 2 remates (Escobar, campo muerto), ambos con dry-run y respaldo.
- Sin colecciones nuevas, sin "v2", write-set de inventario cerrado (products/precios read-only). Decisiones de programa: D-134, D-153, D-154.

## No-goals

- No tocar los flows mixtos de Cereza ni reencender la foto Cereza→Katuq (eso es Fase 2, con la regla "la foto no pisa compromisos").
- No implementar reservas, corte certificado, materia prima, ubicaciones ni lotes (fases 2–6, cada una con su propuesta).
- No encender nada global: siempre por empresa/bodega/origen, con kill switch.

## Riesgos

- La sombra puede revelar divergencias legacy↔ledger que exijan criterio antes de promover: ese es justamente su trabajo; se documentan y se decide con Daniel.
- Un origen promovido a transaccional NO cae a legacy ante error (queda reintentable, por diseño anti-doble-mano): implica monitorear `inventory_audit` los primeros días de cada promoción.
