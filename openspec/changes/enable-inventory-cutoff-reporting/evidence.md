# Evidencia de implementación en rama — fecha de corte

Fecha inicial: 2026-07-23. Última validación local: 2026-07-26. Rama local: `codex/inventory-stabilization-openspec`. No desplegado y sin lecturas nuevas de producción.

## Motor de confianza preparado

- `inventoryCutoffReport` reconstruye `saldoCorte = saldoAncla - deltas posteriores`, pero solo marca una fila `certified` cuando el ancla está verificada, el corte no antecede `certifiedFrom` y la cadena `cantidadAntes → cantidadDespues` llega sin huecos hasta el saldo ancla.
- Producto se normaliza referencia→docId de manera collision-safe; referencias repetidas no se atribuyen por adivinanza.
- Bodega usa exclusivamente el business code. Firestore doc ID, código ausente/desconocido o maestro duplicado quedan visibles como causa.
- Duplicados producto+bodega con cantidades distintas quedan `ambiguous`. Duplicados equivalentes se deduplican y quedan como advertencia.
- Un movimiento sin fecha, motivo, delta o before/after no se rellena: la fila queda `incomplete` y, si el delta existe, la cantidad se rotula `estimate`.
- El cálculo es puro. No importa Firebase, no abre red y no puede escribir inventario, movimientos, pedidos, productos, precios, listas o configuración.

## Medición OMS sobre el backup existente

Backup local verificado: corte de captura `2026-07-22T21:18:59.182Z`, final `2026-07-22T21:19:58.342Z` (59 segundos, export secuencial por colección).

Corte solicitado para la prueba: fin del `2026-07-21` en Colombia = `2026-07-22T04:59:59.999Z`.

- Resultado global: `NOT_CERTIFIABLE_WITH_THIS_BACKUP`.
- Fecha mínima certificable: ninguna.
- 12.684 filas lógicas: 0 certificadas, 2.107 ambiguas y 10.577 incompletas.
- 2.038 filas con inventario duplicado y cantidades contradictorias.
- 6.141 filas con duplicados equivalentes.
- 587 filas con código de bodega que no existe en el maestro y 81 con Firestore doc ID donde debía ir business code.
- 18 filas con movimiento pero sin saldo ancla.
- 13 movimientos posteriores al corte; ninguno tiene la pareja before/after completa del ledger nuevo.

La integridad criptográfica del backup sí está comprobada, pero eso no lo vuelve una foto atómica: las colecciones se exportaron una tras otra. Por esa razón el motor marca `ANCHOR_NOT_VERIFIED` y no presenta una estimación como exacta.

La documentación oficial de Firestore aclara que una exportación administrada normal tampoco es una foto exacta del inicio. Para el primer ancla se exige PITR con `snapshot-time`, que sí representa una vista consistente del instante indicado. No se verificó todavía si PITR está habilitado en el proyecto y no se inició ninguna exportación en nube.

## Pruebas

- `PASS inventory cutoff: certificado, ambiguo e incompleto sin inventar exactitud`.
- `PASS inventory safety contract: auth + dry-run + write-set cerrado`.
- `PASS emulator: pantalla/export de corte coinciden, aíslan tenant y no escriben operación`.
- La prueba de cursor cubre primera página, página siguiente, límite máximo e invalidez fail-closed.
- Angular TypeScript, `npm run build`, `node --check`, `git diff --check` y `openspec validate --changes --strict` pasaron localmente el 2026-07-26.
- El analizador corre únicamente contra archivos locales con hash y conteo validados.

## Superficie read-only preparada

- `GET /v1/inventory/cutoff-report` exige autenticación y empresa, recibe `fechaCorte`, filtros, `limit` y cursor opaco.
- La vista de inventario permite escoger una fecha, ver cantidad, confianza y explicación sencilla por producto–bodega, además de paginar.
- `GET /v1/inventory/export-excel?fechaCorte=...` usa el mismo servicio de consulta. El archivo contiene `Inventario al corte` y `Metadatos y confianza`.
- La captura viva se rotula `SEQUENTIAL_LIVE_READ`, mantiene `anchorVerified=false` y no puede presentarse como certificada. PITR sigue siendo un gate separado.
- El lector consulta únicamente `inventory`, `inventoryMovement`, identidad mínima de `products` y `warehouses`, siempre por empresa. No lee ni escribe precios.

## Pendiente

- Falta confirmar PITR y capturar el primer ancla verificada con `snapshot-time` después de estabilizar el ledger.
- Falta probar traslado, reversa, export grande y comparación contra muestras manuales.
- La superficie está lista en rama, pero no está desplegada ni habilitada en OMS.
- Ningún archivo actual debe rotularse como inventario histórico certificado.
