# Evidencia de implementación en rama — ledger

Fecha: 2026-07-23. Rama local: `codex/inventory-stabilization-openspec`. No desplegado y sin cambios en Firestore productivo.

## Ledger general transaccional preparado

- `transactionalInventoryLedger` soporta delta, valor absoluto y traslado; saldo, movimiento(s) e idempotencia confirman en una sola transacción.
- Usa empresa, producto docId validado contra su tenant, business code de bodega, delta, `cantidadAntes`, `cantidadDespues`, fecha, actor, origen, `reason`, referencia, pedido, `operationId` e `idempotencyKey`.
- Una repetición de la misma operación devuelve el resultado previo. Reutilizar la llave con otro producto, cantidad, bodega o efecto falla con `IDEMPOTENCY_CONFLICT`.
- Un `setTo` repetido al mismo valor se vuelve no-op y no crea movimiento cero.
- El traslado descuenta origen, aumenta destino, crea salida e ingreso y confirma la barrera idempotente como una sola unidad.
- Producto de otra empresa, no-inventariable, bodega ausente/duplicada e inventario duplicado fallan cerrado.
- El enum runtime quedó centralizado y el contrato TypeScript ya incluye también `fullpi_sync`.
- El write-set del nuevo servicio está cerrado a lecturas de `products`/`warehouses` y escrituras en `inventory`, `inventoryMovement` e `inventory_adjust_idempotency`; contract tests bloquean escrituras a `products` y cualquier estructura de precios.

`transactionalAbsoluteStock` quedó como adaptador delgado del mismo ledger general; Osmosis ya no mantiene una segunda implementación contable.

## Osmosis detrás de bandera

- `inventoryLedgerMode` se declaró en la configuración pública de Osmosis.
- Cualquier valor ausente o desconocido conserva `legacy`; `shadow` calcula el efecto y conserva la escritura legacy, y solo `transactional` activa saldo+movimiento nuevos.
- La ruta antigua permanece disponible para rollback.
- La bandera omite la caché al inicio y se relee cada 10 segundos durante un sync largo.
- `shadow` y `transactional` ya no pueden abarcar todas las bodegas por accidente: requieren `inventoryLedgerWarehouseCodes` con business codes exactos o `inventoryLedgerAllWarehouses=true`. Ambos alcances simultáneos, una lista vacía o un modo inválido son rechazados.
- En canario mixto, solo la bodega incluida usa saldo+movimiento atómico; las demás bodegas del mismo producto conservan la escritura legacy. Si la configuración se escribió por fuera del validador y llega sin alcance, el camino nuevo falla cerrado, el legacy continúa y el cron alerta.
- La sombra usa la previsualización read-only del ledger general. No agrega saldo, movimientos ni escrituras en productos/precios; el saldo sigue el camino legacy vigente.
- Al terminar una corrida sombra completa o puntual se guarda un solo resumen en `inventory_audit` con conteos agregados (`examined`, `wouldChange`, `unchanged`, `netDelta`, `blocked`, causas y resultado del sync), sin SKU ni detalle de producto. Si esa auditoría falla, no se altera la operación legacy y el cron genera una alerta.
- El cron de Osmosis ya incluye en su cierre los totales de corridas sombra, cambios previstos, bloqueos y fallas de auditoría. Así la sombra real deja evidencia consultable en vez de perderse en consola.
- Un duplicado histórico aparece como `blocked` con causa `AMBIGUOUS_INVENTORY_IDENTITY`, sin frenar el escritor legacy mientras la bandera está en sombra.
- No se cambió la configuración de OH MY STORE ni se activó la bandera.

## Ajustes manuales y traslados preparados, sin activar

- `manual` y `transfer` tienen flags independientes en `companyConfig/{company}`. Documento ausente, valor desconocido, apagador general o falla de lectura conservan `legacy`.
- `ingresarProducto` y `editarProducto` soportan sombra read-only y ruta transaccional. El camino anterior permanece intacto para rollback.
- `moverProducto` soporta preview y traslado atómico: origen, destino, dos movimientos e idempotencia confirman juntos.
- El frontend manda `operationKey` en ajustes y traslados. `ingresar-multiples` ya tiene preview y transacción multi-SKU: hasta 200 productos, orden determinista, rechazo de duplicados y reversión total si uno falla.
- Una pestaña o cliente antiguo que no mande `operationKey` cae por petición a `legacy` y reporta `MISSING_OPERATION_KEY`; no bloquea la operación durante la transición.
- Se corrigió una inconsistencia real: unas pantallas mandan claves como `SALIDA_AJUSTE` y otras etiquetas como `Salida por ajuste de inventario`. La política ahora reconoce ambas y rechaza valores sin dirección, evitando interpretar una salida como entrada.
- Las rutas nuevas solo leen el producto para identidad, tenant e inventariabilidad. No modifican producto, precio base ni listas de precios.

## Colecciones de movimiento aclaradas y congeladas

- `inventoryMovement` es el ledger activo.
- `inventoryProductHistory` conserva evidencia y lectores legacy, pero su único escritor exportado —sin ruta HTTP activa— ahora responde `410 LEGACY_INVENTORY_HISTORY_FROZEN`.
- `inventory_movements` estaba vacía en el respaldo de OMS, pero no era código muerto: dos herramientas MCP registradas aún la usaban. `adjust_stock` ahora exige `operationKey` y llama al ledger atómico; `get_inventory_movements` consulta `inventoryMovement` con aliases históricos de before/after.
- No queda ningún acceso ejecutable `collection("inventory_movements")` ni escritor hacia `inventoryProductHistory`; las colecciones no se eliminan.

## Historial y BI sobre la misma verdad

- La medición del respaldo OMS encontró 1.668/1.668 documentos de `inventoryMovement` con `fecha` Firestore Timestamp y ninguno con `createdAt` como fecha principal. Por eso la consulta indexada canónica usa `fecha`; el normalizador de respuesta tolera Timestamp, Timestamp serializado, ISO y los campos históricos conocidos sin reescribir documentos.
- Los lectores por bodega y producto dejaron de consultar `createdAt`; además se corrigieron el parámetro real de ruta `idProducto`, el cursor que devolvía un snapshot en vez de su ID y las rutas antiguas del servicio Angular.
- La primera página Angular ahora manda el mismo `limit` que muestra la tabla. Antes mostraba 10, el backend tomaba 20 y el cursor de la segunda página podía saltar diez movimientos.
- El endpoint general ordena en Firestore siempre por `fecha`, como exige el filtro de rango, limita páginas a 200 y valida que el cursor pertenezca a la misma empresa. La respuesta incluye `fechaISO` estable sin retirar el `fecha` anterior.
- La pantalla y el Excel ya no dependen de `fecha._seconds`. Sin búsqueda libre, la exportación recorre todas las páginas del rango y respeta producto, bodega y tipo; con búsqueda conserva el filtro y exporta la respuesta filtrada del backend. Ya no toma silenciosamente solo la primera página normal.
- `analyticsInventario` dejó de leer `inventoryProductHistory`: snapshot y período usan `inventoryMovement`. El snapshot normaliza referencia→docId y deduplica producto+bodega prefiriendo el documento canónico, evitando el doble conteo legacy.
- Se corrigió una clasificación falsa del BI: el texto `inventario` contenía la secuencia `venta`, por lo que un ingreso podía contarse también como salida. Ahora `tipo = INGRESO|ENTRADA|SALIDA` manda y las etiquetas históricas usan palabras completas.
- El lector y el BI son read-only. Pruebas de contrato bloquean escrituras a `inventory`, `products`, precios o colecciones legacy desde estos módulos.
- Se declararon los índices compuestos de `inventoryMovement` necesarios para fecha + filtros. En un despliegue futuro deben construirse primero y verificarse listos antes de publicar el backend; en esta rama no se desplegó ningún índice ni código.

Pruebas aprobadas: `PASS inventory movement reader compatibility`, `PASS emulator: historial usa fecha, pagina y aísla tenant sin escribir stock/productos`, `PASS emulator: controlador de historial filtra, ordena y pagina sin fuga tenant`, `PASS emulator: BI usa inventoryMovement y deduplica inventario legacy`, contrato de seguridad, `node --check` y TypeScript Angular.

## Pedidos y flow Shopify preparados

- Creación/edición de pedidos, Venta Asistida, POS y canal clasifican su origen y usan `orders.inventoryEffect` solo en modo `transactional`; `legacy` y `shadow` conservan el escritor anterior.
- Shopify create/update/paid/cancel/refund vuelve a conciliar el pedido persistido y una falla transaccional queda reintentable sin caer al escritor legacy.
- El flow activo OMS `shopify-orders-to-cereza-7e6ab5a3` sí contenía un segundo delta en `katuq-inventory-adjust`. En modo transaccional el nodo ya no lleva una contabilidad separada: delega el pedido completo a `orders.inventoryEffect`.
- En el mismo nodo, los `setTo` de proveedor usan el ledger general detrás del flag `import`; en legacy/sombra se conserva el comportamiento vigente.
- La validación de bodega usa coincidencia exacta y única en `warehouses.idBodega`; se retiró la regla heurística que podía rechazar códigos alfanuméricos largos legítimos.

## Pruebas

Firestore Emulator, proyecto aislado `demo-katuq-inventory-ledger`:

- primera escritura: saldo y movimiento coinciden;
- repetición del mismo snapshot: cero escritura adicional;
- dos operaciones concurrentes al mismo valor: un solo efecto y un solo movimiento;
- fallo inyectado al serializar la escritura de saldo: no queda saldo ni movimiento;
- fallo inyectado después de preparar el saldo y al serializar el movimiento: la transacción revierte y no queda ninguno;
- reuso de la misma llave con un efecto distinto: `IDEMPOTENCY_CONFLICT`, sin cambio;
- traslado exitoso: dos saldos y dos movimientos consistentes; reintento: cero efecto adicional;
- traslado sin stock: no cambia origen, destino, movimientos ni idempotencia;
- duplicado docId/referencia: `AMBIGUOUS_INVENTORY_IDENTITY`, sin escoger ni sumar;
- producto ajeno y no-inventariable: rechazados sin escrituras;
- intento de otra empresa sobre el mismo documento: `TENANT_MISMATCH`, sin cambio;
- decremento: delta negativo y dirección `SALIDA` correctos;
- ruta Osmosis sin bandera: `legacy`;
- ruta `shadow`: reporta `examined`, `wouldChange`, `unchanged` y `netDelta`, no agrega movimiento y conserva el saldo legacy;
- canario de dos bodegas en un mismo producto: solo el business code autorizado creó movimiento; la otra bodega conservó legacy;
- `transactional` sin allowlist ni promoción total: cero movimientos nuevos y fallback explícito a legacy;
- cambio fresco de kill switch `transactional → legacy → transactional`: obedecido sin usar la caché de cinco minutos;
- colección `products`: cero documentos escritos.

Resultados: `PASS emulator: ledger general atómico, idempotente, transferible y fail-closed`, `PASS emulator: flag off + kill switch fresco + saldo/ledger atómico y multi-tenant` y `PASS emulator: Osmosis deja una auditoría agregada por sombra sin tocar saldo, movimientos, productos ni precios`.

Prueba adicional del flow: `PASS emulator: flow Shopify delega al pedido y sync proveedor usa ledger`. Cubrió ejecución repetida, devolución al cancelar, código largo de bodega, `setTo` Fullpi y ausencia de escrituras sobre productos/precios.

Prueba de orígenes: `PASS emulator: Venta Asistida/POS/pago tardío/despacho usan una sola huella`. Cubrió compromiso, espera, transición elegible, despacho sin inventario, cambio entre estados elegibles y reversa exacta.

Smoke del controlador real: `PASS emulator: controller create/edit HTTP shape usa una sola huella`. Cubrió creación de Venta Asistida, transición `Aprobado → Pagado` sin repetición, salida a `Rechazado` con devolución exacta y cero cambios en producto/precios, usando solo un proyecto Firestore Emulator `demo-*`.

Pruebas adicionales aprobadas: política manual clave/etiqueta, plan puro, conciliación, backup, configuración fail-safe, contrato de seguridad, `node --check`, TypeScript Angular y `git diff --check`.

## Gate pendiente

No se permite activar OMS todavía. Faltan export administrado + backup fresco de la ventana, observación real en modo sombra y aprobación explícita del canario de una sola bodega.
