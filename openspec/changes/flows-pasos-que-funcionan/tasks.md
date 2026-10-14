## 0. Línea base (antes de tocar código)

- [x] 0.1 Prueba de regresión del webhook de OH MY STORE. Corre el grafo real de `shopify-orders-to-cereza-7e6ab5a3` (copia sin secretos en `tests/flows/fixtures/`) con un pedido de ejemplo y con Firestore, Cereza e inventario simulados. Guarda como "foto" los pasos ejecutados, los datos que recibe cada paso y la respuesta HTTP. Debe pasar sobre el código actual.
- [x] 0.2 Script de solo lectura `scripts/flows-mapa-activos.js`, que corre Daniel o se autoriza. Por cada flow activo lista:
  - comercio, pasos de inicio y bindings;
  - si usa Repetir, Elegir o `$node` por notas;
  - si tiene pasos no disponibles o `triggers` vacíos.

  Pegar el resultado en `design.md › Open Questions`.
- [x] 0.3 Convertir `services/flows/__tests__` a un runner que se pueda correr con `npm test`, sin cambiar las pruebas.

## 1. Catálogo como aviso

- [x] 1.1 `nodeRegistry.getSpec(type)` desde el `spec` de cada módulo.
- [x] 1.2 `validator.validate(flow, { level: 'structure' | 'catalog' })`. `startRun` usa `structure`.
- [x] 1.3 `nodeExecutor` fija explícitamente el timeout de 30 s y la no idempotencia, sin leer el catálogo.
- [x] 1.4 `update` y `create` devuelven los `warnings` del nivel catálogo sin bloquear. `activate` bloquea los errores del nivel catálogo con mensajes de negocio: paso y campo.
- [x] 1.5 Prueba de que `nodeCatalog.json` y los specs de los módulos coinciden en tipos y campos obligatorios. Arreglar el desfase de `osmosis-stock-sweep` y de los demás pasos que la prueba encuentre.
- [x] 1.6 La prueba 0.1 sigue verde.

## 2. Motor: bandera, sombra y reglas

- [x] 2.1 Bandera `flowsMotorCorregido` en `companyFeatureFlags` (y en el arreglo del front) más la variable `FLOWS_MOTOR_MODO` (`off|sombra`, por defecto `sombra`).
- [x] 2.2 Puertos `done` y `default` correctos bajo `on`. En `sombra`, se anota la diferencia.
- [x] 2.3 Saltar ramas vacías, en cascada, con estado `skipped/sin_datos` bajo `on`. En `sombra`, se anota la diferencia. Los pasos de inicio quedan exentos.
- [x] 2.4 Escribir `flow_runs/{runId}.sombra` al final de la ejecución, con una sola escritura.
- [x] 2.5 `$node` por id, con las notas como alias sin pisar ids.
- [x] 2.6 `ctx.paramsForItem(i)` disponible. Ningún paso lo usa todavía.
- [x] 2.7 Esperar con límite `max(30 s, ms + 5 s)`, sin reintento por tiempo.
- [x] 2.8 Pruebas de cada regla en `off`, `sombra` y `on`. La prueba 0.1 sigue idéntica en los tres modos.

## 3. Pasos de inicio, encender, apagar, borrar y horario (backend)

- [x] 3.1 `triggerKind` en el spec de cada paso de inicio, más `derivarTriggers(graph)`. `activate` lo reutiliza solo cuando no hay triggers.
- [x] 3.2 `create` y `update` derivan los triggers solo si el body y el documento guardado no los tienen. Quitan los triggers huérfanos y lo avisan. Los demás quedan byte a byte iguales; lo comprueba una prueba con los triggers de OH MY STORE.
- [x] 3.3 `update` ignora `status`. `activate` y `deactivate` devuelven `{ flow }`.
- [x] 3.4 `remove` apaga los bindings en el mismo batch.
- [x] 3.5 `update` sincroniza el horario del binding solo si el flow está activo y el valor cambió.

## 4. Pasos no disponibles

- [x] 4.1 `NO_DISPONIBLES` en el registro, `disponible:false` en el catálogo y el error `PASO_NO_DISPONIBLE` con mensaje de negocio, solo si 0.2 confirma que ningún flow activo los usa. Si alguno los usa, parar y consultar.
- [x] 4.2 La paleta del lienzo oculta los pasos con `disponible:false`. Requiere recompilar el bundle y reaplicar el parche del vendor.

## 5. Frontend

- [x] 5.1 El guardado del editor deja de mandar `status`.
- [x] 5.2 `flows.service` desenvuelve `{ flow }` de encender y apagar. El editor y la lista muestran el estado real.
- [x] 5.3 El horario se guarda en `config.cronExpression`. Al cargar, se lee también `config.cron` por compatibilidad.
- [x] 5.4 Mostrar los `warnings` del guardado y los errores de encendido con su detalle, en lenguaje de negocio.
- [x] 5.5 Agregar al catálogo de respaldo los dos pasos que faltan: `katuq-inventory-changed` y `katuq-inventory-observe`.
- [x] 5.6 Build de producción sin errores.

### Desvíos registrados (2026-10-13)

- **0.1:** la foto está en `tests/flows/fixtures/golden-webhooks-vivos.json`. Cubre pedido de una bodega y pedido repartido de OH MY STORE (v29), y el pedido de CAFE ESCOBAR. Se compara en `off`, `sombra` y `on`, y además exige `diferencias = []`.
- **0.3:** el comando es `npm run test:flows` (`tests/flows/correrTodas.js`). Hoy da 22/23: falla `shopifyPrecioTachado.test.js`, que ya fallaba antes de D-413 y es de precios, fuera de alcance.
- **1.2:** el catálogo sale de `nodeRegistry.listSpecs()`. No se creó `contracts/node-catalog.js`: hacerlo activaría la validación del registry contra un catálogo desfasado y podría tumbar el registro de pasos.
- **1.5:** `nodeCatalog.json` se regeneró. Entró `osmosis-stock-sweep` y se actualizaron los ajustes de 5 pasos. Los pasos sin ajustes llevan esquema vacío. Por eso `nodeCatalogCoverage` vuelve a pasar.
- **2.4:** el campo quedó como `flow_runs.motor = { modo, diferencias }`, no `sombra`. En `off` no se escribe.
- **2.7:** el límite de Esperar quedó fijo en 305 s (su tope de 5 min + 5 s), en vez de `ms + 5 s`.
- **3.1:** no se agregó `triggerKind` a los specs. `derivarTriggers` lo respeta si existe y, si no, usa la regla que ya tenía `activate`.
- **4.2:** sin recompilar el lienzo. `GET /nodes/catalog` y el catálogo de respaldo del front omiten los no disponibles.
- **2.1:** la bandera es solo de backend; el front no la consulta.

## 6. Despliegue y verificación

- [x] 6.1 Diff de la rama del backend contra producción. Avisar si arrastra cambios de otras sesiones.
- [x] 6.2 Desplegar el backend en `sombra`, sin bandera en ningún comercio. Verificar los siguientes pedidos de OH MY STORE:
  - ejecución `success` como antes;
  - `sombra.diferencias` vacía;
  - mismo pedido en Katuq y en Cereza.
- [x] 6.3 Desplegar el front.
- [~] 6.4 Bandera en FLORECER: probar en el navegador los escenarios de la spec (webhook hecho a mano, Repetir, Elegir, rama vacía, Esperar 45 s, encender y mover, borrar, horario).
- [ ] 6.5 Después de una semana de sombra, presentar a Daniel el reporte por comercio. Encender OH MY STORE solo con su visto bueno.
- [x] 6.6 Registrar D-413 en `specs/CONTRACT.md` con lo desplegado y lo verificado. Actualizar la bitácora.

### Verificación (13-oct)

- **6.1:** el backend desplegado (`6c0a820`) solo traía D-413; lo de otras sesiones ya estaba en producción. Otra sesión tenía Kuvo puesto a mano en el servidor sin commit; el pull no tocaba esos archivos y Kuvo siguió respondiendo.
- **6.2:** en sombra, entre las 19:49 UTC del 13-oct y las 00:30 del 14-oct, hubo 101 corridas de OH MY STORE, todas `success`.
  - El webhook de pedidos de Shopify corrió sin diferencias.
  - En los flows de revisión periódica (productos y existencias a Shopify, inventario Fullpi), la sombra anota `rama_vacia` en pasos que hoy corren con 0 registros. Los 5 pasos afectados (`katuq-canonical-mapper`, `katuq-product-upsert`, `shopify-product-upsert`, `shopify-inventory-adjust`, `katuq-inventory-adjust`) no hacen nada con 0 registros, así que saltarlos no cambia ningún resultado.
- **6.3:** front 2026.10.13.1. Lo publicó la sesión de D-410 desde la misma carpeta y con el mismo código; se verificaron los avisos en el paquete servido.
- **6.4, parcial:** bandera encendida en FLORECER y probada en el navegador:
  - webhook hecho a mano, que deriva su paso de inicio;
  - Repetir, donde «Al terminar» entrega 1 registro de cierre y «Cada uno» 3;
  - encender bloqueado con el motivo, y al encender el botón cambia sin recargar;
  - apagar con confirmación;
  - borrar, que deja el binding `inactive`.
  - Faltan Elegir, Esperar 45 s y horario. La vista a 390 px no se pudo revisar porque Chrome no achicó la ventana.
- **Hallazgo corregido (`1522b08`, desplegado):** los avisos del servidor decían «IF» y «condition». Ahora usan los nombres del editor (`services/flows/nombresDeNegocio.js`, copia de `Sg`, `wc` y `ZS` de `flow-canvas.js`).

