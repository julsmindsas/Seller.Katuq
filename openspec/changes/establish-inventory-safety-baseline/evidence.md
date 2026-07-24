# Evidencia Gate 0 — inventario

## Auditoría read-only de colecciones (2026-07-22)

Proyecto verificado: `julsmind-katuq`. No hubo escrituras Firestore.

| Colección | Global | OH MY STORE | Último dato global observado | Veredicto |
|---|---:|---:|---|---|
| `inventoryMovement` | 23.122 | 1.668 | 2026-07-22 | Ledger activo |
| `inventoryProductHistory` | 1.670 | 0 | 2025-05-02 | Legado; aún tiene lectores de analítica |
| `inventory_movements` | 0 | 0 | nunca | Colección vacía creada por tools MCP; no es ledger operativo |

Decisión respaldada por datos: los movimientos nuevos pertenecen a `inventoryMovement`. Las otras dos colecciones no se borran durante estabilización.

## Ensayo de respaldo lógico OMS

Corte recuperable ampliado: `2026-07-22T21:18:59Z`. Ruta temporal fuera del repositorio: `/private/tmp/oh-my-store-inventory-backup-20260722-orders/oh-my-store-20260722T211859Z`.

| Artefacto | Documentos |
|---|---:|
| `inventory` | 24.543 |
| `inventoryMovement` | 1.668 |
| `inventoryProductHistory` | 0 |
| `inventory_movements` | 0 |
| `inventory_audit` | 306 |
| Barreras `inventory_adjust_idempotency` | 5 |
| Fallas de webhook proyectadas sin metadata sensible | 4 |
| `warehouses` | 17 |
| `channels` | 4 |
| Asociaciones canal–bodega | 12 |
| Identidad de `products` | 8.402 |
| Proyección de pedidos para inventario | 440 |
| Lookups idempotentes de pedidos Shopify | 4 |
| Deduplicación Shopify vigente al corte | 0 |
| Configuraciones públicas de integración | 6 |
| `flows` | 8 |
| `flow_trigger_bindings` | 5 |
| `flow_polling_state` | 2 |

Todos los archivos pasaron conteo y SHA-256 contra el manifiesto. La proyección de pedidos conserva solamente identidad, estados, bodega, canal y cantidades; excluye clientes y precios. Los campos sensibles de integraciones se redactaron. Este es un ensayo, no el backup de la ventana de activación.

Una revisión posterior encontró que documentos legacy de movimientos pueden traer URLs de imagen con tokens en el query string y correos de actor dentro de snapshots embebidos. El ensayo temporal no debe compartirse ni usarse como backup fresco. El script quedó endurecido: `inventoryMovement`, las dos historias legacy y `inventory_audit` pasan por redacción; se eliminan secretos por nombre de campo, firmas/tokens dentro de URLs y correos operativos. El backup de la ventana debe generarse otra vez con esta versión y volver a pasar hash + restore.

La restauración se repitió en Firestore Emulator con proyecto aislado `demo-katuq-inventory-restore`, usando el OpenJDK 21 ya instalado por Homebrew. Se restauraron y releyeron todas las colecciones del manifiesto, incluidos pedidos, asociaciones y barreras de idempotencia; cada conteo y cada documento comparado coincidió. Resultado: `PASS backup + restore aislado`. El emulador se apagó limpiamente al terminar.

Este ensayo no reemplaza el backup fresco ni el export administrado de la ventana de activación.

## Diagnóstico de identidad OMS

Ejecución read-only con el conciliador nuevo sobre el mismo estado productivo:

- 24.543 documentos origen.
- 12.666 grupos lógicos producto–bodega.
- 8.179 grupos con más de un documento.
- 6.141 grupos duplicados con la misma cantidad.
- 2.038 grupos duplicados con cantidades diferentes: quedan ambiguos; no se suman ni se escoge ganador.
- 582 grupos con bodega no reconocida por el maestro.
- 381 registros con `productoId` por referencia, resolubles a docId.
- 1 producto no resoluble.

La clasificación actual certifica únicamente la **identidad**. Todavía no certifica saldo contable: faltan ledger, pedidos y evidencia del proveedor.

## Cobertura del ledger OMS

Sobre los 1.668 documentos de `inventoryMovement`:

- 1.668 tienen fecha canónica y delta firmado.
- 8 tienen `reason`; 1.660 no lo tienen.
- 8 tienen cantidad antes/después con el contrato vigente `cantidadAntes`/`cantidadDespues`; los otros 1.660 no guardan ese par.
- 0 tienen clave de idempotencia/operación.
- 264 tienen referencia `ordenId`.
- Cobertura temporal observada: 2025-10-19 a 2026-07-22.
- Identidad de bodega en movimientos: 827 business codes válidos, 245 Firestore doc IDs y 596 valores que no coinciden con el maestro actual.

Por eso el diagnóstico retorna `certifiable: false`, `overallConfidence: incomplete` y `minimumCertifiableAt: null`. No se infiere un saldo histórico exacto.

La primera versión del diagnóstico solo reconocía los alias históricos `stockAnterior`/`stockNuevo` y `cantidadAnterior`/`cantidadNueva`; por eso reportó cero. La prueba sobre el respaldo encontró los 8 registros del flow con `cantidadAntes`/`cantidadDespues`, y el conciliador quedó corregido con test unitario. Esto mejora la lectura de evidencia, pero no vuelve certificable el historial.

Hallazgos confirmados en código que explican esa evidencia:

- `inventoryService.updateByChannel` y su variante de webhook guardan en movimientos el Firestore doc ID de la bodega (`idBodega: d.inv.bodegaId` / `fb.firestoreId`) aunque `inventory` usa el business code.
- Venta/POS cambia el saldo dentro de transacción, pero confirma los movimientos en un batch posterior; una falla intermedia puede dejar saldo sin ledger.
- `updateByPOS` busca la bodega por `idBodega` sin filtro de empresa antes de descontar.
- El retry de fallas webhook vuelve a entregar la orden completa al escritor; requiere idempotencia/filtrado por efecto antes de considerarse seguro.

Estos escritores no se modifican en Gate 0. Se corrigen uno por vez en F1/F2 después de aprobar la línea base.

## Evidencia pedido–movimiento OMS

El diagnóstico ampliado del `2026-07-22T21:30:28Z` separó efectos de pedidos y no los confundió con el saldo:

- 440 pedidos y 590 líneas inventariables observadas.
- 224 pedidos tienen alguna evidencia de efecto: 220 por ledger y 4 por barrera idempotente del flow.
- 216 pedidos no tienen evidencia enlazable dentro de la cobertura histórica disponible.
- 248 líneas coinciden con el efecto esperado; 321 no se pueden conciliar.
- 14 líneas no resuelven identidad de producto.
- 7 movimientos `FLOW_SALE` no guardaron referencia al pedido.
- Existe una secuencia confirmada de 3 descuentos para el mismo producto y bodega en menos de 3 minutos, neto `-3`; corresponde a la repetición histórica que motivó el guard idempotente.

El resultado sigue siendo `incomplete`: esta evidencia sirve para localizar el daño, no para inventar un saldo histórico.

## Evidencia de proveedor y flows OMS

El mismo diagnóstico encontró:

- 1 configuración Shopify activa, 1 canal Shopify y 12 asociaciones canal–bodega.
- 2 flows activos que publican stock a Shopify; ambos mezclan producto y stock.
- `cereza-products-to-shopify-a5156643` publica stock de Cereza hacia Shopify sin pasar primero por `katuq-inventory-adjust`.
- No existe documento persistido de mapping de locations para el camino `shopifyService.syncInventory`.
- Los dos pollers seguían activos; último tick observado: `2026-07-22T21:28:03Z`.
- No hay readback de cantidades de Shopify ni auditoría durable suficiente para certificar igualdad Katuq↔Shopify.

Además, el contract test reforzado encontró que caminos stock-only escribían `products`. En la rama se retiraron esas escrituras: la operación de inventario ya no persiste variante/precio/cache en el producto y la huella de `shopifyService.syncInventory` va a `inventory_audit`. Esto aún no está desplegado.

## Comparación de dos cortes durante la operación

Entre `2026-07-22T21:18:59Z` y `2026-07-22T21:31:04Z` (725 segundos):

- `inventory` pasó de 24.543 a 24.554 documentos: 11 nuevos.
- 483 documentos fueron tocados; 99 cambiaron cantidad.
- El cambio neto observado fue `-715` unidades.
- Los 11 documentos nuevos y los 99 cambios de cantidad declaran `syncSource: osmosis`.
- `inventoryMovement` permaneció exactamente en 1.668 documentos y con el mismo SHA-256.

Prueba de causa: `osmosisProductSyncService._syncInventory` hace `set(..., merge:true)` directo sobre `inventory`, pero no registra el antes/después en `inventoryMovement`. Este escritor explica por qué el saldo cambia mientras el historial no cambia. No se apagó ni modificó en producción.

Tercer corte verificado: `2026-07-22T21:41:45Z`. Su manifiesto y archivos pasaron conteos y SHA-256 (`PASS integridad local del backup`). Frente al corte de `21:31:04Z`, en 641 segundos:

- `inventory` pasó de 24.554 a 24.559 documentos: 5 nuevos, todos `syncSource: osmosis` y todos en `BOD-CEREZA-1A`.
- 340 documentos fueron tocados; 81 cambiaron cantidad, todos atribuidos a Osmosis.
- El cambio neto observado fue `+232` unidades.
- `inventoryMovement` siguió en 1.668 documentos y su contenido no cambió.

Los tres cortes `21:18:59Z`, `21:31:04Z` y `21:41:45Z` cubren más de dos ciclos del poller de 10 minutos y más de cuatro del poller de 5 minutos. El patrón saldo-sin-ledger se repite en ambos intervalos. El tercer corte no reemplaza el export administrado ni el backup fresco de la ventana de activación.

Volumen leído por corte: 35.426, 35.437 y 35.442 documentos, respectivamente; 106.305 lecturas documentales observadas en total para esta serie. No se activó escritor nuevo ni se ejecutó reparación.

## Barrera de reparación

Se encontró que `POST /v1/inventory/reparar` estaba sin middleware `auth` y la UI lo presentaba como reparación directa. En la rama de estabilización quedó:

- autenticado obligatoriamente;
- dry-run por defecto;
- sin batches, deletes ni auditoría lateral durante el dry-run;
- aplicación real bloqueada con `INVENTORY_GATE0_REQUIRED` hasta completar backup + restore;
- UI renombrada a diagnóstico y explícita en que no modifica datos.

## Control Maestro ClickUp

- Programa: `wdu9v770d1`
- F0 Gate 0: `wdu9v773mm`
- F1 Ledger: `wdu9v773mn`
- F2 Pedidos/Venta/Shopify: `wdu9v773mq`
- F3 OMS Cereza + Shopify stock-only: `wdu9v773mt`
- F4 Fecha de corte existente: `wdu9v76exg`
- F5 Almacén Bombas y rollout: `wdu9v773mu`

El Gate 0 quedó en curso; las demás fases no se adelantaron ni se marcaron como iniciadas.

El procedimiento de la ventana quedó fijado en `runbook-oms.md`: primero PITR con `snapshot-time`, backup lógico fresco y restore; después despliegue con flags apagados; luego sombra Osmosis limitada a un business code durante tres corridas y mínimo 24 horas. Cualquier falta de auditoría, movimiento fuera del alcance, doble efecto o escritura de catálogo exige volver a `legacy` sin borrar evidencia. El runbook está preparado, no ejecutado.

## Comparación local de bodegas Cereza para canario

El analizador read-only verificó manifiesto, hashes y conteos del backup `2026-07-22T21:18:59Z`; no se conectó a Firebase ni imprimió productos.

| Storage | Business code | Grupos lógicos | Conflictos duplicados | Evidencia histórica de movimientos | Decisión provisional |
|---|---|---:|---:|---:|---|
| `1` | `BOD-CEREZA-1` | 8.244 | 2.036 | 35; solo 8 con antes/después | Bloqueada |
| `1A` | `BOD-CEREZA-1A` | 1.711 | 0 | 4, todos con ID Firestore de bodega y sin antes/después | Primera candidata a sombra fresca |
| `1B` | `BOD-CEREZA-1B` | 1.181 | 0 | 0 | Candidata secundaria |
| `51` | `BOD-CEREZA-51` | 558 | 0 | 0 | Candidata secundaria |

`BOD-CEREZA-1A` se escoge solo como candidata provisional por cobertura y ausencia de conflicto en ese corte. Antes de cualquier sombra se repite el análisis sobre el backup fresco; antes de canario se exigen tres corridas sombra, mínimo 24 horas y cero bloqueos. Producción permaneció sin cambios.

## Pruebas de seguridad de la línea base

- El diagnóstico no contiene escrituras Firestore ni transacciones/batches de escritura.
- Cada consulta queda filtrada por `company` o `companyId`, según la colección.
- La conciliación reconoce los tres contratos históricos de cantidad antes/después.
- Pasaron conciliación, respaldo y contract test de write-set; `node --check` pasó en controlador, conciliador y runner read-only.
- `openspec validate --changes --strict`: 8 cambios válidos, 0 fallos.
