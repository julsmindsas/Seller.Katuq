# Runbook de activación segura — OH MY STORE

Estado: **preparado, no ejecutado**. Este documento no autoriza despliegue, export en nube, cambio de flags ni escritura productiva.

## Candidata provisional

El backup local verificado del `2026-07-22T21:18:59Z` señala `BOD-CEREZA-1A` (storage `1A`) como primera candidata para **sombra fresca**: 1.711 grupos lógicos y cero duplicados contradictorios en ese corte. No es una autorización de canario. La bodega debe revalidarse después del backup fresco.

No usar `BOD-CEREZA-1` como primer canario: concentra 2.036 grupos con cantidades contradictorias y un producto no resoluble.

## Regla principal

Se cambia una sola capacidad y una sola bodega a la vez. Inventario Osmosis, ciclo de pedidos, publicación Shopify y Logística/Cereza tienen flags y huellas separadas; nunca entran juntos al primer canario.

## Gate 0 — antes de desplegar

Todos los puntos deben quedar con responsable, hora y evidencia:

1. Confirmar rama/commit candidato y que los flags productivos sigan en `legacy`/`off`.
2. Confirmar PITR y `earliestVersionTime` del Firestore productivo.
3. Elegir un `snapshot-time` de minuto completo dentro de la ventana PITR y ejecutar un export consistente. Un export administrado normal no certifica el instante. Fuente: [documentación oficial de Firestore](https://firebase.google.com/docs/firestore/manage-data/export-import).
4. Tomar inmediatamente el backup lógico OMS con saldos, movimientos, pedidos mínimos, barreras, bodegas, canales, configuración pública y flows; verificar conteos y SHA-256.
5. Restaurar el backup lógico en Firestore Emulator `demo-*` y comprobar conteos/hashes.
6. Construir primero los índices nuevos de `inventoryMovement` y esperar estado listo antes de publicar lectores que los requieren.
7. Repetir baseline read-only. Si hubo movimientos después del corte o cambió el candidato, repetir export/backup.
8. Registrar URI, corte, hashes, versión, responsable de rollback y aprobador en F0 de Control Maestro.

Si falta uno, el Gate 0 sigue cerrado.

## Despliegue seguro

1. Publicar índices y luego backend/frontend con todos los comportamientos nuevos apagados.
2. Confirmar que una empresa sin configuración explícita sigue en legacy.
3. Observar un ciclo normal antes de cambiar un flag.
4. No cambiar en esta ventana `shopifyOrderLogisticsMode`, publicación Shopify stock-only, productos ni Price Lists.

## Sombra Osmosis — una bodega

Configuración permitida:

```yaml
inventoryLedgerMode: shadow
inventoryLedgerAllWarehouses: false
inventoryLedgerWarehouseCodes:
  - <BUSINESS_CODE_APROBADO>
```

La lista usa `warehouses.idBodega`, nunca el doc ID Firestore. La sombra conserva la escritura legacy actual, previsualiza solo la bodega elegida y deja una auditoría agregada por corrida.

Período mínimo: tres corridas completas del sync Osmosis y al menos 24 horas. Para cada corrida se exige:

- auditoría `osmosis_inventory_shadow_run` guardada;
- alcance configurado, sin conflicto y con una sola bodega;
- `scopeBlockedProducts = 0`;
- `blocked = 0` para la bodega candidata;
- cero cambios atribuibles en `products`, precios o Price Lists;
- cero movimientos nuevos creados por la sombra;
- cron sin solapamiento ni deterioro grave frente a su duración base;
- diagnóstico read-only posterior sin divergencias nuevas fuera de la escritura legacy ya conocida y cuantificada por esa corrida.

`wouldChange` no es por sí solo un error: indica que el proveedor informó un valor diferente y el legacy lo habría escrito. Los bloqueos, la falta de auditoría o un alcance incorrecto sí cierran el gate.

## Criterios de aborto inmediato

Ante cualquiera de estos casos:

- movimiento en una bodega fuera de la allowlist;
- doble movimiento, saldo sin movimiento o movimiento sin saldo en la ruta nueva;
- `AMBIGUOUS_INVENTORY_IDENTITY`, bodega desconocida o Firestore doc ID en el candidato;
- auditoría sombra ausente/fallida;
- escritura en producto, categoría, variante, precio o Price List;
- llamada no autorizada a Shopify o Cereza;
- error de configuración, aumento anormal de latencia o crones superpuestos.

Acción:

1. Cambiar solo `inventoryLedgerMode` a `legacy`.
2. Confirmar la relectura del kill switch —máximo esperado en el código: 10 segundos—.
3. No borrar movimientos, auditorías ni huellas.
4. No ejecutar reparación masiva.
5. Adjuntar evidencia y causa en F3; tomar backup nuevo si hubo efecto productivo.

## Canario transaccional — requiere otra aprobación

Solo después de aprobar la sombra:

```yaml
inventoryLedgerMode: transactional
inventoryLedgerAllWarehouses: false
inventoryLedgerWarehouseCodes:
  - <MISMO_BUSINESS_CODE_APROBADO>
```

Las demás bodegas continúan legacy. El canario pasa únicamente si:

- cada cambio de la bodega elegida tiene saldo y un movimiento con el mismo antes/delta/después;
- reintentos no duplican efectos;
- no aparece ningún movimiento fuera del alcance;
- productos, precios, listas, Shopify y Logística permanecen sin cambios atribuibles;
- el backup de la ventana sigue vigente.

Promover a `inventoryLedgerAllWarehouses=true` es una decisión distinta y exige un nuevo checkpoint. Almacén Bombas comienza desde sombra propia; nunca hereda flags de OMS.
