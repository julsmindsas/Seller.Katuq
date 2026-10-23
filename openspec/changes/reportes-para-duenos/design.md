> **Estado:** DISEÑO, pendiente de aprobación de Daniel. Decisión **D-551** (propuesta aprobada el 2026-10-23). Tickets de ALMARA FELICIDAD: 1347, 1346, 1348 y 1345 (F1, en detalle); 1344, 1343 y 1342 (F2, esquema); 1341 (F3, esquema). Sin código hasta aprobar este diseño y `tasks.md`. **Requisito previo duro: D-484** (`reportes-empresa-del-jwt`), que se está terminando: ninguna tarea de este cambio empieza hasta que esté implementada, desplegada y verificada.

## Context

- **Pantallas y servicios que toca.** Front: `src/app/components/dashboard/` (inicio, constructor, vista de un reporte, panel de control), `src/app/shared/report-viz/` y `shared/services/dashboard/reports.service.ts`. Backend (`katuq_admin_back_firebase/functions`): `routers/reports.js`, `services/reports/` (motor, fuentes, PDF, repositorio), las reglas de ventas que ya existen y el informe ejecutivo.
- **Lo que dice el código hoy (23-oct, solo lectura) y manda en el diseño:**
  - **El motor lee toda la historia.** `runQuery` arma la consulta con la empresa y los filtros que Firestore puede resolver, y manda a memoria cualquier filtro de fecha de `orders` (`firestore.engine.js:106-126`, porque los campos mezclan texto ISO y Timestamp). Después guarda todos los documentos en `rawDocs`, los filtra, guarda un arreglo de valores por grupo y recién entonces suma y corta (`:361-482`). Solo hay `select()` de los campos necesarios. `meta.totalDocsScanned` ya dice cuántos leyó. `HARD_LIMIT` es 10.000 filas (`spec-validator.js:18`).
  - **Ya existe la lectura rápida por período.** El informe ejecutivo (`services/billing/informeEjecutivo/pedidos.js`) lee `orders` con la empresa y un rango de `fechaEntrega`, en flujo y con 18 campos, con dos consultas (texto ISO y Timestamp) y los límites en medianoche de Colombia (`limitesDelPeriodo`). Es el patrón que reutiliza este diseño. `tools/getOrderAnalytics.js` también lee por rango de `fechaCreacion` con `orderBy`.
  - **Los índices de rango ya existen** para `company` + `fechaEntrega` (`firestore.indexes.json`, varias entradas). El de `company` + `fechaCreacion` lo usa `getOrderAnalytics`. Se confirma contra el servidor vivo en la tarea 1.6.
  - **Hay cuatro reglas de «pedido caído».**
    - `isCancelledOrder` (`tools/_orderFilters.js:11-35`) cuenta como caídos el proceso Rechazado, Cancelado, Anulado o Precancelado, y el pago Cancelado, Precancelado, Rechazado, Anulado o Reembolsado. No incluye Devuelto ni Fallido.
    - La regla del cobro (`getBillingOrderExclusionReason` en `services/subscriptionBillingUtils.js:8-30` y `:86`) agrega devuelto y fallido, y es la que ya usan el informe ejecutivo y la consola de D-345. **Es la que pide la spec.**
    - `salesMetricOrder` (`services/salesMetricOrder.js`) usa la primera y además recalcula el total si el pedido no lo trae.
    - Reportes (`orders.source.js`) no usa ninguna: suma todo.
    - Casi 30 archivos importan alguna de las reglas (tools MCP, analíticas, despachos, producción, logística). No todos son métricas de venta.
  - **Fechas.** El constructor manda `T00:00:00.000Z` (`report-builder.component.ts:376, 627`) y el motor agrupa con los getters locales del servidor (`truncateDate`, `:35-62`), que en EC2 es UTC. La dimensión `fecha_dia` de `orders` es la fecha de **creación**. No hay una dimensión «fecha de la venta».
  - **Etiquetas.** `inferColumns` construye `label: 'Total pedido (sum)'` (`:514-538`), y `calc-engine.ts` resuelve las fórmulas por ese texto exacto (`labelToField`, `:306`). Ya existe `model/report-labels.ts` con `VIZ_LABELS`, `AGG_LABELS` y `GRANULARITY_LABELS`, solo para mostrar.
  - **Facturas.** Katuq factura con DIAN propio (`dian_documents`, indicadores en `accountingController.js:2394`, que lee **todos** los documentos y **todos** los pedidos de la empresa en cada consulta) y, según la empresa, con SIIGO o World Office (`accounting_documents`, poblado por sincronización). Hay un resumen por período en `services/accounting/dian/indicadoresFacturacion.js`.
  - **Costos.** El costo vigente vive en el producto (`precio.costoUnitario`, `fulfillment.costoCompra`) y cada cambio queda en `productCostHistory` (`controllers/productCosts.js`, `services/purchasing/purchaseCostCapture.js:133`). El margen de las cotizaciones guarda una foto del costo y se limita con `puedeVerMargen` (`services/cotizaciones/margenCotizacion.js:76`).
  - **Resumen del lunes.** El de inventario (D-401) vive en `services/inventory/digest/` (`semana.js`, `motor.js`, `destinatarios.js`), con modos apagada, sombra y envío, y hoy su interruptor global está en el `.env` (`INVENTARIO_DIGEST`). D-505 manda las banderas nuevas a Firestore.
  - **Ya hecho de 1347.** Los 13 arreglos rápidos de la propuesta están en el commit `9a50d29a` del Seller. Quedan sin hacer el `#2563EB` del Excel (3 sitios en `report-builder.component.ts`) y los íconos de Font Awesome 5/6 que siguen en `view/report-view.component.html` (`fa-file-excel`, `fa-file-image`, `fa-file-pdf`, `fa-pen`, `fa-triangle-exclamation`, `fa-circle-exclamation`) y en `viz-table.component.ts` (`fa-xmark`).
- **Línea base de diseño:** se mide en la tarea 1.7 (gradientes y primarios prohibidos de `components/dashboard` y `shared/report-viz`). No deben subir.

## Goals / Non-Goals

**Goals:**
- **F1 (1347, 1346, 1348, 1345):** Reportes en español de negocio; una sola definición de cada cifra en todas las superficies; velocidad leyendo solo el período; gráficos y exportes de marca.
- **F2 (1344, 1343, 1342):** preguntas listas, tablero gerencial y rentabilidad. Solo esquema aquí.
- **F3 (1341):** las preguntas a Opttia y los envíos programados dentro de D-474 y del informe ejecutivo. Solo esquema aquí.

**Non-Goals:** los de la propuesta:
- cambiar cómo se crea, edita, cobra o factura un pedido (el cuadre muestra diferencias, no las corrige);
- escribir productos, precios o costos;
- un chat o un motor de preguntas nuevo;
- contabilidad completa;
- cambiar qué datos personales expone hoy el constructor;
- caché de resultados.

## Decisiones de Daniel (2026-10-23)

1. **Fecha de la venta:** la de entrega; si el pedido no la tiene, la de creación. Creación y factura quedan para elegir.
2. **«Ventas»:** valor guardado del pedido, con IVA y envío, sin pedidos caídos. **«Venta neta»:** sin IVA ni envío. Los valores raros van a «por revisar» y no se recalculan.
3. **Velocidad:** leer solo el período y sumar en origen. Resúmenes diarios precalculados solo como excepción aprobada si ALMARA sigue por encima de 5 s. **Nunca se guardan resultados** (AGENTS.md, «Sin cache extra»).
4. **Costo:** el vigente en la fecha de la venta. «No confiable» si los productos sin costo pesan más del 5 % de la venta.
5. **Resumen del lunes:** apagado por omisión, dos semanas en sombra y un solo mensaje junto con el de inventario.

## Decisions — F1

### D1. Un módulo de reglas, `services/metricas/`

Funciones puras, sin lecturas de Firestore, que el Reportes, el tablero, la bienvenida, las tools de Opttia, el informe ejecutivo y los exportes importan. Es la única fuente de la definición.

| Archivo | Contenido |
|---|---|
| `periodo.js` | `limitesDelPeriodo`, `diaBogota`, `semanaDe` (lunes a domingo) y `periodoAnterior(desde, hasta)`. Se **mueven** desde `informeEjecutivo/pedidos.js` y `calculo.js`, que pasan a importarlos sin cambiar su resultado. El período anterior es: mes calendario completo o hasta hoy, los mismos días del mes anterior; cualquier otro rango, los mismos días de largo inmediatamente antes |
| `pedidoCuenta.js` | `cuentaComoVenta(pedido)` y `motivoQueNoCuenta(pedido)`, que **envuelven** `getBillingOrderExclusionReason`. La regla del cobro no se copia ni se edita: así no pueden divergir. Exporta además la lista de estados que cuentan y los que no, para mostrarla |
| `valores.js` | `ventasDelPedido(pedido)` → `{ ventas, iva, envio, ventaNeta }` con los valores **guardados** (`totalPedididoConDescuento`, `totalImpuesto`, `totalEnvio`), sin recalcular; `ventaNeta = ventas − iva − envio`. `porRevisar(pedido)` devuelve el motivo si el pedido es incoherente: total no numérico, total menor que lo ya pagado (`anticipo`) o total de $1 con líneas. La lista de motivos se calibra con ALMARA en la tarea 2.4; un pedido por revisar **se cuenta con su valor guardado** y además se lista |
| `diccionario.js` | Las 12 definiciones del spec: nombre, frase, qué incluye, qué excluye y de qué campos sale. El front las lee de `GET /v1/reports/metricas` |

- **Descartado:** reescribir `isCancelledOrder` en su sitio. Lo importan módulos que no son de ventas (`updateOrderStatus`, despachos, logística), y cambiarlo ahí movería su comportamiento. La migración de las superficies de venta es la sección 4 de las tareas, una por una.
- **Venta neta y el informe ejecutivo:** el informe suma `subtotal` (bruto − descuentos + envío) e `iva` por separado. La tarea 2.4 comprueba que `ventaNeta` del diccionario, sumada por mes, da el mismo número que el informe de ALMARA de septiembre; si no, el diccionario explica la diferencia con el campo que difiere y no se fuerza.

### D2. Fecha de la venta: un lector de pedidos por período

`services/metricas/lectorPedidos.js` expone `leerPedidos({ db, empresa, desde, hasta, base, campos, porPedido, señal, vence })`, en flujo y con `select`:

- `base = 'entrega'` (por omisión): se hacen **cuatro** consultas de rango, todas con `where('company','==',empresa)`:
  1. `fechaEntrega` en texto ISO dentro del período;
  2. `fechaEntrega` como Timestamp dentro del período;
  3. `fechaCreacion` en texto ISO dentro del período, y se **conservan solo los que no traen `fechaEntrega`** (los POS);
  4. lo mismo con Timestamp.

  Un pedido leído dos veces se cuenta una (`Set` de ids). Las consultas 2 y 4 casi siempre vuelven vacías y cuestan una lectura cada una, como hoy en el informe. El costo para ALMARA es de unas 2.700 lecturas por mes (entregados del mes más creados del mes), la misma magnitud que D-345.
- `base = 'creacion'`: consultas 3 y 4 sin el descarte.
- `base = 'factura'`: **solo si** la tarea 1.8 confirma de dónde sale la fecha de factura de cada proveedor. Hasta entonces la opción no se ofrece y el selector dice «Factura (próximamente)», sin cifras.
- La paridad con lo ya verificado (ALMARA, septiembre: 1.334 pedidos, 52 caídos, 1.282 válidos) es la prueba de aceptación de este lector (tarea 2.6 con datos de prueba y 8.4 con producción).
- **Índices:** si falta alguno, no se crea desde aquí. La tarea 1.6 lo detecta y se pide autorización para desplegarlo como en D-541 5.1. El motor conserva su respaldo actual (leer sin el rango y filtrar en memoria) solo como degradación con aviso, nunca en silencio.

### D3. Motor: leer el período y sumar en origen

- **Entrada nueva:** `spec.periodo = { desde: 'AAAA-MM-DD', hasta: 'AAAA-MM-DD', base }`. Los días son días de Colombia. El motor lo manda al lector de D2 cuando la fuente es `orders`. Para las demás fuentes, el rango se aplica con su campo de fecha como hoy.
- **Reportes guardados (compatibilidad):** si `spec.periodo` no está y hay filtros `gte`/`lte` sobre la fecha, el motor toma los 10 primeros caracteres del valor como día de Colombia y los trata como `periodo` con la base de creación (la dimensión que traían). Esto corrige las 5 horas de desfase y **puede mover cifras**; por eso `meta.reglaVersion` y el aviso de D8. Un reporte guardado sin ninguna fecha corre como hoy (historia completa), con el tope de D5.
- **Acumuladores incrementales.** Se reemplazan `rawDocs`, `filteredDocs` y los arreglos de valores por grupo por acumuladores: suma, cantidad, mínimo, máximo, conjunto de distintos y promedio como suma/cantidad. Memoria proporcional a los grupos, no a los pedidos. Los filtros que Firestore no resuelve se aplican sobre el flujo del período, ya no sobre la historia.
  - **Prueba de paridad:** un conjunto de reportes de ejemplo (todas las funciones y granularidades) corre con el motor viejo y el nuevo sobre los mismos documentos falsos y da filas y totales idénticos (tarea 3.2).
- **Hora de Colombia:** `truncateDate` se reescribe con aritmética sobre la fecha desplazada −5 h y getters UTC, sin depender de la zona del servidor. Una prueba corre con `TZ=UTC` y con `TZ=America/Bogota` y da lo mismo.
- **Regla de pedidos que no cuentan:** `orders.source.js` declara `reglaVentas: true`. El motor aplica `cuentaComoVenta` sobre el flujo y devuelve en `meta`: `reglaVersion: 'ventas-v1'`, `excluidos` (cuántos y por motivo) y `porRevisar` (la lista de números de pedido y la diferencia, solo los 100 primeros y el total). `spec.incluirCaidos: true` los deja entrar; lo usa el aviso de cifras que cambian y la vista «Pedidos que no cuentan».
- **Dimensión nueva `fecha_base`** en `orders.source.js` (fecha de entrega, o de creación si no hay), calculada por el lector. `fecha_dia` (creación) se conserva para los reportes guardados. Las plantillas nuevas usan `fecha_base`.
- **Vendedor restringido:** el filtro `sellerField` y `soloMisMetricas` de hoy se conservan tal cual y se aplican también al detalle (D6).

### D4. Cancelar, tope de tiempo y consulta lenta

- **Cancelar:** el router escucha `req.on('close')` y activa una señal que el flujo revisa por cada documento; al activarse se destruye el flujo y no se calcula más. El front cancela con `takeUntil` sobre la petición. «Dejar la pantalla como estaba» es una responsabilidad del front: conserva el resultado anterior y solo lo reemplaza cuando llega el nuevo.
- **Tope:** `vence = ahora + 30 s` (la spec recomienda 30 s; la pregunta 2 la confirma). Al pasarlo, el motor corta y el router responde `408` con `{ code: 'CONSULTA_MUY_GRANDE', mensaje, sugerencias: ['período', 'filtro', 'menos columnas'] }`. Nunca queda cargando sin fin.
- **Consulta lenta registrada:** si dura más de 5 s, se cancela o se corta por tiempo, se escribe **una fila en `audit_log_access`** (colección existente, ya usada por D-484 para los rechazos) con `tipo: 'reporte_consulta_lenta'`, `empresa`, `fuente`, `desde`, `hasta`, `registrosLeidos`, `duracionMs` y `motivo`. Sin datos personales ni resultado, sin `console.log` de telemetría y sin esperar la escritura (si falla, la respuesta no cambia). No se crea ninguna colección.

### D5. Aviso antes de una consulta pesada

`POST /v1/reports/estimar` recibe el mismo `spec` y responde `{ registros, pesada, filtroSugerido }`. Cuenta con la **consulta de agregación `count()`** de Firestore sobre el mismo rango y la misma empresa (una lectura por cada 1.000 entradas del índice, no por documento). `pesada` es verdadero con más de 50.000 registros; `filtroSugerido` es el mes en curso con la misma base. El front llama a `estimar` solo cuando el período no existe o supera 90 días, y deja seguir sin filtro. Las fuentes que no son `orders` usan su mismo rango; si no se puede contar, no se avisa (nunca se inventa una cifra).

### D6. Detalle y exportes

- **Bajar al detalle:** `POST /v1/reports/detalle` recibe el `spec` y la clave de la fila, la barra o la porción. Corre **el mismo motor y el mismo `sellerField`**, devuelve los pedidos (o clientes o productos) que forman ese valor y su suma, que debe dar el valor de partida. Hasta 500 filas con «Ver más». Respeta `req.tenant` (D-484) y el alcance del vendedor.
- **Exportes:** el Excel y el PNG salen del resultado que ya está en pantalla, así que no pueden diferir. El PDF sigue en el backend (`pdf/report-pdf.generator.js`) y recibe el mismo resultado ya calculado. Un resultado de más de 10.000 filas avisa **antes** de exportar y sugiere un filtro.
- **Marca:** el Excel y el PDF usan el logo y el nombre de la empresa del kit de marca que ya existe (`getBrandKit`), el acento `#5F3FE0` en lugar de `#2563EB` (Excel) y del índigo `#1a237e` (PDF), pesos con formato colombiano y filas de totales. Se verifica contra `openspec/specs/design-system/spec.md`.

### D7. Front: lenguaje, plantillas y ayuda (1347)

- **Etiquetas visibles sin romper fórmulas.** El backend deja de armar un único `label`. Cada columna lleva `label` (el visible: «Total de pedidos», «Mes») y `claveFormula` (el texto de hoy, `Total pedido (sum)`). Cada medida y dimensión de las fuentes gana `etiquetaNegocio` y `alias` (nombres anteriores). `calc-engine.ts` resuelve una referencia por cualquiera de los tres nombres, y una función pura `traducirFormula(expresion, columnas)` muestra una fórmula guardada con los nombres nuevos. **El texto guardado no se reescribe** hasta que la persona edite y guarde, y lo nuevo se guarda con los nombres nuevos (que el motor también acepta). Prueba: la fórmula `[Total Pedido (sum)] / [Pedidos (count)]` da el mismo valor antes y después y se lee «[Total de pedidos (Suma)] / [Pedidos (Conteo)]».
- **Período y comparación:** `periodos.ts` (puro) con Hoy, Ayer, Esta semana (lunes a domingo), Este mes, Mes anterior, Últimos 30 días, Este año y Personalizado, en hora de Colombia; y la comparación con las dos opciones del spec. Su tabla de casos es la misma que la de `periodo.js` del backend (una prueba en cada repo con los mismos casos).
- **Plantillas:** `preset-reports.ts` pasa a tema (Ventas, Productos, Clientes, Cartera, Inventario), pregunta o beneficio como título y una frase. Las 7 de hoy exigen World Office. Se agregan al menos cinco de pedidos, con `fecha_base` y la regla de ventas: ventas por mes, por canal, por vendedor, por forma de pago y por ciudad. Una plantilla cuya fuente no está en `GET /sources` de la empresa se muestra atenuada con lo que se necesita («Necesitas conectar World Office») y no abre el constructor.
- **Nombre automático y favoritos:** el nombre sale de la medida, la agrupación y el período («Ventas por mes · 2026»). El favorito es un campo `favoritoPor: [correo]` del mismo documento de `reports`; no hay colección nueva.
- **Ayuda:** recorrido guiado con un componente propio y sin librería nueva (si el proyecto ya tiene una, se usa), el «¿Qué es esto?» por zona y el ejemplo precargado. «Panel de control» (la vista clásica) ya tiene su explicación (`9a50d29a`) y se retira en F2.
- **Prueba de términos prohibidos:** `tests/reportes/terminos-prohibidos.test.js` recorre las plantillas HTML y los textos de `dashboard/` y falla si aparece uno de la lista del spec. Se corre en cada tarea de front.

### D8. Definición junto a cada cifra y aviso de cambio

- Un componente pequeño, `InfoMetricaComponent` (ícono (i) con la definición del diccionario, accesible con teclado), junto a cada indicador y cada columna de medida.
- **Aviso de cifra que cambió:** el reporte guardado lleva `reglaVersion` (campo nuevo del mismo documento, ausente en los viejos). Al abrirlo, si no coincide con `ventas-v1`, el front muestra el aviso una vez y ofrece «Ver la diferencia»: corre el reporte con `incluirCaidos: true` y muestra las dos cifras. Que ya se vio se guarda en `localStorage` por reporte y versión (una comodidad por usuario, no un dato compartido), y al guardar el reporte se escribe la versión nueva.
- **Hora de los datos:** `meta.calculadoAt` y el botón «Actualizar». **No se guarda el resultado**: «Actualizar» vuelve a calcular.
- **Datos por revisar:** `GET /v1/reports/por-revisar?desde&hasta&base` lista los pedidos de `porRevisar` con su número, su valor guardado y la diferencia.

### D9. Cuadre con facturación

- **Servicio:** `services/reports/cuadre/` con una sola función pura de clasificación y una interfaz de fuente de facturas, para que funcione igual con cualquier proveedor:

  ```js
  // Cada adaptador devuelve las facturas y notas del período ya normalizadas.
  facturasDelPeriodo({ db, empresa, desde, hasta }) →
    [{ id, numero, fecha, tipo: 'factura' | 'nota_credito', valorNeto, pedidoId | null, estado }]
  ```

  Hay un adaptador para `dian_documents` y otro para `accounting_documents`. El de DIAN lee por rango de fecha del documento, **no** la colección completa como `getDianIndicadores`. Si la empresa no factura electrónicamente desde Katuq, la vista lo dice.
- **Clasificación (pura):** recibe la venta neta por pedido (D1) y las facturas, y reparte la diferencia en: pedidos sin factura, facturas sin pedido, notas crédito, pedidos que no cuentan pero sí se facturaron y diferencias de valor. **Invariante probada:** la suma de las causas es la diferencia total, con la tolerancia de centavos del informe (`0,011`).
- **Ruta:** `GET /v1/reports/cuadre?mes=AAAA-MM`, solo lectura y con `req.tenant`.
- **Frescura:** cada resultado trae `meta.calculadoAt`. El aviso de sincronización atrasada lee el último registro de ejecución de la sincronización correspondiente en lo que ya existe (monitor de trabajos programados, `routers/cronHealth.js`); si no hay un registro confiable para esa fuente, **no** se avisa nada (la tarea 1.8 lo confirma por fuente).

### D10. Una sola superficie de cifras

El diccionario no sirve de nada si cada pantalla suma por su cuenta. La sección 4 de las tareas migra, **una por una y con la prueba de paridad de ALMARA**, las superficies de venta:

1. `salesMetricOrder` y las tools de ventas de Opttia (`getSalesToday`, `getSalesByPeriod`, `getTopProducts`, `getTopCustomers`, `getOrderAnalytics`): usan `cuentaComoVenta` y la fecha base por parámetro, con la de entrega por omisión.
2. El dashboard y la bienvenida (`controllers/analytics.js`).
3. El informe ejecutivo, que ya usa la regla del cobro y la entrega: solo cambia de dónde importa `periodo.js`. Su salida de septiembre de ALMARA debe quedar **idéntica** byte a byte.
4. El chat de D-474 (`opttia-chat-katuq-preguntas-de-negocio`, otra sesión): se le deja la definición lista; este cambio no edita su carpeta.

No se tocan las superficies operativas (despachos, producción, logística, `updateOrderStatus`). El cobro no cambia.

### D11. Bandera por empresa, `reportsOfficialMetrics`

La regla única cambia cifras que los comercios ya conocen (por ejemplo, deja de contar devueltos). Por eso, con D-505, sale con una bandera en `companies.featureFlags`:

- **Encendida:** Reportes, dashboard, Opttia y exportes usan el diccionario, la fecha de entrega y la hora de Colombia, y los reportes guardados muestran el aviso de D8.
- **Apagada:** todo se comporta como hoy. El lenguaje claro (1347), los gráficos y exportes (1345) y la velocidad que no cambia cifras (leer solo el período, cancelar, tope, estimar) **no dependen de la bandera**.
- Dueño Daniel; retiro a más tardar el 2027-04-30 (Artículo XII), con su tarea. Se enciende con `scripts/set-company-feature.js`: primero FLORECER, luego ALMARA con la paridad verificada y después el resto.

### D12. Solo lectura y write-set

| Se escribe | Dónde |
|---|---|
| Reportes guardados (con `reglaVersion` y `favoritoPor`) | colección `reports` existente, por el repositorio de hoy |
| Consultas lentas | `audit_log_access`, existente |

Un contract test con un espía de Firestore falla si el motor, el lector, el cuadre, el detalle o los exportes escriben en `orders`, `products`, precios, listas de precios, inventario o cualquier colección fuera de esas dos. Los datos personales del constructor (documento y correo del cliente en `orders.source.js`) no cambian y quedan anotados para un cambio aparte.

## Decisions — F2 (esquema; se detallará al cerrar F1)

- **1344, «¿Qué quieres saber hoy?».** Catálogo de preguntas en `services/reports/preguntas/catalogo.js`: cada una declara su tema, su texto y **el módulo dueño que la responde** (reponer y «no se mueven» = Central de Abastecimiento, D-401; clientes que dejaron de comprar y cartera = D-405), y delega en ese cálculo en lugar de repetirlo. Asistente de tres pasos en el front con vista previa. La «lectura en palabras» se arma con plantillas de texto sobre el resultado, sin modelo de lenguaje: cada cifra citada está en el resultado y, si falta el dato, lo dice. El constructor pasa a «Modo avanzado». Paquetes por tipo de negocio como listas de ids de plantilla activables, guardadas en `companyConfig/{empresa}`.
- **1343, tablero.** Tablero y metas **sin colecciones nuevas**: el tablero es un documento de `reports` con `tipo: 'tablero'`, y las metas de ventas van en `companyConfig/{empresa}` (D-505), con nombre distinto del de las metas de cotizaciones. Permisos por rol con `alcanceMetricas` (D-349). Enlaces con vencimiento y revocación: se agregan `expiraEn` y `revocadoEn` al índice público existente (`reportPublicIndex`), y el endpoint público los comprueba antes de devolver nada; el enlace externo nunca incluye documentos, teléfonos, correos ni direcciones. Vista de celular. Se retira «Panel de control» cuando el tablero cubra sus indicadores.
- **1342, rentabilidad.** `services/reports/rentabilidad/`: función pura `costoEnFecha(historial, productoId, fecha)` sobre `productCostHistory` (una lectura por lote de productos del período, nunca por línea), costo de combo = suma de sus productos por cantidad, adiciones con su costo, y porcentaje de la venta neta con producto sin costo. Mayor al 5 %: «no confiable», que no se presenta como definitivo en tablero, Opttia ni envíos. Visible solo con la regla de `puedeVerMargen`; para los demás roles se quita de reportes, tablero, exportes, enlaces y Opttia. Solo lectura. Al archivar se actualiza el escenario de D-474 «margen por costo = dato que Katuq no guarda».
- **Bandera propia por capacidad** (`reportsDashboard`, `reportsProfitability`), con la misma política de dueño y retiro, ALMARA primero.

## Decisions — F3 (esquema)

- **1341 no abre un chat, un motor ni un resumen nuevos.**
  - **«Pregúntale a Opttia»** abre el chat de D-474 con la pregunta escrita. Los requisitos van como cambios a `opttia-chat-answers`. La consulta flexible de ventas de D-474 responde con el diccionario de F1; «Guardar como reporte» y «Fijar en el tablero» los hace la persona con el botón, así que el chat sigue siendo de solo consulta.
  - **Envíos programados y resumen del lunes** extienden el informe ejecutivo (D-394): misma regla de cuadre («si un bloque no suma, no sale»), frecuencias semanal, diaria y mensual, WhatsApp y notificación en Katuq.
  - **Un solo mensaje del lunes** junto con el de inventario (`services/inventory/digest/`): el motor del informe y el de inventario comparten la reserva de la semana, para que el dueño reciba uno.
  - **Interruptores en Firestore** (`config/{doc}`), no en el `.env` como hoy el de inventario (D-505). Apagado por omisión y **dos semanas en sombra**: se calcula y se guarda lo que se enviaría, sin enviar, y Daniel revisa los destinatarios reales, como hizo con D-401 el 11-oct.
  - **Alertas:** reutilizan los cálculos de los módulos dueños («por agotarse» = D-401, vencidas = D-405, meta en riesgo = tablero de F2). La capacidad `reportes-alertas` solo define umbrales, agrupación y silencio.
  - **Externos:** después, solo el PDF y con aprobación del administrador.

## Gates constitucionales

| Artículo | Cumplimiento |
|---|---|
| I–II | Propuesta y specs aprobadas. Diseño y tareas esperan aprobación. Las specs no eligen tecnología |
| III | D-484 es requisito previo: ninguna tarea corre sin él. Toda ruta nueva lleva `auth, requireJwtTenant` y usa `req.tenant`; el detalle y el cuadre no leen la empresa de la cabecera |
| IV, V, X | No aplica: sin webhooks ni proveedores nuevos |
| VI | El cuadre usa una interfaz por proveedor y no depende de SIIGO, World Office ni DIAN |
| VII | Consultas lentas, canceladas y detenidas quedan en `audit_log_access`, sin datos personales ni resultado |
| VIII | Pruebas de contrato primero en cada grupo (secciones 2, 3 y 5 de las tareas), antes de implementar |
| IX | Los componentes nuevos de front son OnPush, con RxJS para HTTP y `*ngIf`/`*ngFor` (Angular 14, sin signals). La excepción acotada es la de D-054, D-541, D-543 y D-547; no cambia la constitución. `report-builder.component.ts` (1.470 líneas) no crece: lo nuevo va en componentes y utilidades aparte |
| XI | Sin datos personales en logs ni en registros de consulta lenta |
| XII | `reportsOfficialMetrics` y las banderas de F2 y F3, con dueño Daniel y retiro fechado y con tarea |
| XIII–XV | Una spec por capacidad, de 3 páginas como máximo. La decisión queda en CONTRACT. Sin integraciones nuevas |

## Verificación

- **Paridad de cifras:** ALMARA FELICIDAD, septiembre de 2026, por fecha de entrega y por creación en los pedidos sin entrega: 1.334 pedidos, 52 que no cuentan y 1.282 válidos, iguales en un reporte, el dashboard, el informe ejecutivo y Opttia. Un script de solo lectura (`scripts/verificar-paridad-reportes.js`) hace la comparación contra Firestore real y entrega las cifras de cada superficie.
- **Velocidad:** con ALMARA, la plantilla de ventas del mes en 2 s o menos y 12 meses por mes y canal en 5 s o menos, medidas **antes** (tarea 1.3) y **después** (tarea 8.5), con los registros leídos que informa `meta.totalDocsScanned`. Si no se llega, el siguiente paso es la excepción de resúmenes diarios precalculados de la pregunta 3 de la propuesta, que **requiere aprobación aparte** y no se implementa en este cambio.
- **Pruebas `node --test` / `node`:** regla de pedidos, período anterior, hora de Colombia con dos `TZ`, lector (solo consultas con rango y empresa), acumuladores contra el motor viejo, fórmulas guardadas, clasificación del cuadre con su invariante, contract test de solo lectura y paridad del informe ejecutivo.
- **Navegador:** 1440×900 y 390×844 en inicio, constructor, vista de un reporte, cuadre y exportes; sin scroll horizontal ni texto invisible; la lista de términos prohibidos recorrida a mano además de la prueba.
- **Build de producción** sin errores; los gradientes y primarios prohibidos de `components/dashboard` y `shared/report-viz` no suben.

## Risks / Trade-offs

- **[Cifras que bajan]** Aplicar la regla única cambia reportes guardados. Mitigación: bandera por empresa, aviso una vez con «Ver la diferencia», paridad de ALMARA antes de encender y encendido por pasos.
- **[Una regla compartida con módulos que no son de ventas]** Por eso se envuelve y no se edita (D1); la migración es una a una (D10).
- **[Lectura doble por la fecha de entrega]** Las consultas 3 y 4 leen los pedidos creados en el período aunque su entrega caiga fuera. Es la lectura mínima para dar la venta de los POS sin entrega; se mide en 1.3 y 8.5 y, si pesa, se discute la excepción de resúmenes precalculados.
- **[Fórmulas guardadas]** Si una etiqueta nueva coincide con una vieja de otra columna, la referencia sería ambigua. La prueba de la tarea 6.2 revisa los alias de todas las fuentes y falla ante cualquier colisión.
- **[`report-builder.component.ts` de 1.470 líneas]** Cada cambio sensible se hace con diff aprobado y se mueve a utilidades puras con prueba, sin refactor masivo.
- **[Sesiones paralelas]** D-474 (chat de Opttia), D-401 y el informe ejecutivo tocan las mismas reglas. Antes de cada tarea: `git pull`, `git status` de las carpetas y lectura de los `tasks.md` de esas decisiones, sin editar los ajenos.
- **[Costo de WhatsApp y plantillas de Meta]** Solo F3; va apagado y en sombra.

## Migration Plan

1. **F1, en este orden** (el de la propuesta, que es el de los tickets): 1347 (lenguaje, sin cifras), 1346 (reglas y cuadre), 1348 (velocidad) y 1345 (gráficos y exportes). En el código, la base técnica es el módulo `services/metricas/` y el motor (secciones 2 a 5 de las tareas); el front sigue (6 y 7).
2. Backend con las banderas apagadas (MANUAL-EC2, con autorización); luego el front con el candado de publicación; FLORECER; ALMARA con la paridad y el OK de Daniel; después el resto.
3. **Rollback:** apagar `reportsOfficialMetrics` devuelve las cifras de hoy sin tocar datos. Lo demás de F1 se revierte con su commit.
4. **F2 y F3** se diseñan en detalle y se aprueban por separado cuando F1 esté publicada y verificada.

## Open Questions

1. **Bandera `reportsOfficialMetrics`** (D11). Recomendado: bandera por empresa, ALMARA después de la paridad y retiro el 2027-04-30. La alternativa es encender para todos de una vez; es más simple, pero cambia las cifras de todos los reportes guardados el mismo día.
2. **Tiempo máximo de una consulta** (D4). La spec recomienda 30 s y la propuesta no lo confirmó. Recomendado: 30 s, y 5 s como umbral del registro de consultas lentas.
3. **Fecha de factura como base** (D2). Depende de lo que confirme la tarea 1.8 por proveedor. Recomendado: no ofrecerla hasta que cada proveedor la tenga verificada; entrega y creación bastan para los tickets de ALMARA.
