> **Estado:** TAREAS, pendientes de aprobación de Daniel. Decisión **D-551** (propuesta aprobada el 2026-10-23). Tickets de ALMARA FELICIDAD: **F1** 1347, 1346, 1348 y 1345 (secciones 0 a 9, en detalle); **F2** 1344, 1343 y 1342 (secciones 10 a 13, esquema); **F3** 1341 (secciones 14 a 17, esquema). Cada fase se aprueba, se publica y se verifica por separado: las tareas de F2 y F3 se detallan cuando F1 esté publicada. Sin código hasta aprobar `design.md` y este archivo.
>
> **Requisito previo duro: D-484** (`reportes-empresa-del-jwt`). La tarea 1.1 es una compuerta: nada de las secciones 2 en adelante empieza hasta que D-484 esté implementada, desplegada y verificada.
>
> **Reglas de todas las tareas:**
> - leer los archivos antes de editarlos; nada de fixes a ciegas;
> - **solo lectura sobre `orders`**: este cambio no escribe pedidos, productos, precios, costos ni inventario. Cada grupo de código se aplica con su diff a la vista y aprobación antes de pasar al siguiente, como en D-484;
> - **pruebas de contrato primero** (Artículo VIII): se escriben, se ve que fallan y después se implementa;
> - backend: `node --check` de los archivos tocados y sus pruebas en verde; no importar ni arrancar `index.js`, jobs ni proveedores reales para probar;
> - front: build en verde al cerrar cada tarea de código (`ng build --configuration=production --output-path <scratchpad>/…` mientras no se publique, para no mover la versión);
> - nunca `git add -A`: otras sesiones trabajan en los mismos working copies;
> - el front local apunta a producción: se prueba con la empresa demo FLORECER y, para medir, con consultas de solo lectura a ALMARA. No se guarda ni se exporta nada en empresas reales;
> - **toda tarea de front visible cierra revisando en el navegador a 1440×900 y a 390×844**, sin scroll horizontal ni texto invisible. Las capturas van al scratchpad, nunca al repo;
> - antes de cada tarea: `git pull` y `git status` de las carpetas que toca, y relectura de los `tasks.md` de D-474 (chat de Opttia, `opttia-chat-katuq-preguntas-de-negocio`), D-401 y D-394 (solo lectura, no se editan sus carpetas). **D-474 aparece dos veces en el contrato** (atribución, línea 10633, y chat de Opttia, línea 11029): en estas tareas D-474 es siempre el **chat de Opttia**;
> - los comentarios y cierres de ticket los hace la sesión principal con el flujo de tickets, en lenguaje de negocio.
>
> `[P]` = se puede hacer en paralelo con la otra `[P]` de su bloque (archivos distintos).

## Correspondencia con los tickets

| Ticket | Qué entrega | Tareas |
|---|---|---|
| 1347 lenguaje claro | español de negocio, fechas rápidas, plantillas, ayuda | 6.0 a 6.6 |
| 1346 métricas oficiales | una regla, fecha base, cuadre, definiciones, frescura | 2, 4, 5 y 6.7 |
| 1348 velocidad | leer el período, cancelar, tope, 500 filas, estimar | 3 y 6.8 |
| 1345 gráficos y exportes | marca, Top 10, detalle, Excel, PDF, PNG | 3.9 y 7 |

## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (2026-10-23), con las cinco respuestas de `design.md`: fecha de la venta = entrega con respaldo en creación; «Ventas» = valor guardado con IVA y envío sin pedidos caídos, y «Venta neta» sin IVA ni envío, con los valores raros en «por revisar»; velocidad leyendo solo el período y sumando en origen, sin guardar resultados y con los resúmenes diarios solo como excepción aprobada si ALMARA sigue sobre 5 s; costo vigente en la fecha de la venta, «no confiable» sobre el 5 %; resumen del lunes apagado, dos semanas en sombra y un solo mensaje con el de inventario.
- [x] 0.2 **D-551** registrada en `specs/CONTRACT.md` (propuesta aprobada, 2026-10-23). Todos los `D-XXX` de `proposal.md` y de las specs de este cambio se reemplazaron por D-551.
- [ ] 0.3 Aprobación de `design.md` y de este `tasks.md` (F1). Sin ella no se toca código. **Hecho cuando:** la aprobación y las respuestas a las 3 Open Questions del diseño están anotadas en `design.md`. La 1 (bandera `reportsOfficialMetrics`) bloquea 2.7 y 4.1; la 2 (tope de 30 s), 3.6; la 3 (fecha de factura), 2.6.
- [ ] 0.4 Aprobación de F2 y de F3 (con sus `tasks.md` ya detallados). **Hecho cuando:** cada una se aprueba cuando F1 esté publicada; hasta entonces las secciones 10 a 17 son solo esquema.

---

## F1 — Base (1347, 1346, 1348, 1345)

### 1. Verificación previa (solo lectura, antes de editar)

- [ ] 1.1 **Compuerta D-484.** Releer `openspec/changes/reportes-empresa-del-jwt/tasks.md` y la entrada D-484 de `specs/CONTRACT.md`; confirmar que `routers/reports.js` en `origin` usa `requireJwtTenant` en las rutas con sesión, que `npm run test:reportes-empresa-jwt` pasa y que el backend está desplegado (arranque limpio y una consulta de reportes con la cabecera `company` cambiada da 403). **Hecho cuando:** hay una nota fechada con el commit de `origin`, el resultado de la prueba y la respuesta del 403 en producción. Si algo falta, se **para** aquí y se avisa; no se avanza.
- [ ] 1.2 `git pull` y `git status` de `functions/services/reports/`, `functions/services/metricas/`, `functions/routers/reports.js`, `functions/services/billing/informeEjecutivo/`, `src/app/components/dashboard/` y `src/app/shared/report-viz/`. Relectura de los `tasks.md` de D-474 (chat), D-401 y D-394. **Hecho cuando:** lo que otras sesiones tengan sin commitear en esas carpetas está identificado y su sesión avisada, y no hay `services/metricas/` previo (si existe, se lee y se adapta este plan).
- [ ] 1.3 **Línea base de velocidad** (solo lectura, ALMARA): con el motor de hoy, medir la plantilla de ventas del mes, y 12 meses de pedidos por mes y canal, 3 veces cada una. Anotar `meta.durationMs`, `totalDocsScanned` y la memoria del proceso. **Hecho cuando:** la tabla de tiempos y lecturas está en el scratchpad y confirma o corrige que hoy se leen todos los pedidos de la empresa en cada consulta.
- [ ] 1.4 **Línea base de cifras.** Con un script de solo lectura, sacar de Firestore las cifras de ALMARA de septiembre de 2026 por fecha de entrega (con creación para los POS sin entrega) y comparar con lo que muestran hoy el reporte, el dashboard, el informe ejecutivo y Opttia. **Hecho cuando:** hay una tabla de cuatro cifras contra la de referencia, y se confirma o corrige 1.334 pedidos, 52 que no cuentan y 1.282 válidos. Las diferencias de cada superficie quedan explicadas por causa (cuentan o no los cancelados, devueltos y fallidos; fecha base; zona horaria).
- [ ] 1.5 **Inventario de consumidores** de `isCancelledOrder`, `salesMetricOrder` y `isBillableSubscriptionOrder` (unos 30 archivos): clasificar cada uno en «métrica de venta» (migra en la sección 4) u «operación» (despachos, producción, logística, `updateOrderStatus`: no se toca). **Hecho cuando:** la lista con archivo, línea y clasificación está en el scratchpad y se le muestra a Daniel junto con el diff de 4.1.
- [ ] 1.6 **Índices vivos** (`firebase firestore:indexes --project julsmind-katuq`) para `orders`: `company` + `fechaEntrega` y `company` + `fechaCreacion`, y el de `dian_documents` y `accounting_documents` por empresa y fecha. En ALMARA, contar cuántos pedidos tienen `fechaEntrega` y `fechaCreacion` como texto ISO, como Timestamp o ausentes. **Hecho cuando:** la lista de índices existentes y faltantes y el conteo de tipos de fecha están en el scratchpad. Si falta un índice, se anota con la autorización para desplegarlo (como D-541 5.1); no se crea aquí.
- [ ] 1.7 **Línea base de diseño y capturas.** Contar `(linear|radial)-gradient(` y los primarios prohibidos en `components/dashboard` y `shared/report-viz`, y tomar capturas del «antes» del inicio de Reportes, el constructor y la vista de un reporte a 1440 y 390 px. **Hecho cuando:** los conteos y las capturas están en el scratchpad.
- [ ] 1.8 **Fuentes de la fecha de factura y de la frescura** (solo lectura): por proveedor (DIAN propio, SIIGO, World Office) confirmar qué campo da la fecha de la factura y de la nota crédito, cómo se enlaza con el pedido, y de dónde se lee el último registro de ejecución de su sincronización (`routers/cronHealth.js`, monitor de trabajos). **Hecho cuando:** hay una tabla por proveedor con campo, enlace y registro de ejecución, o «no existe» donde no haya. Lo que no exista **no se avisa ni se ofrece** (design D2 y D9). Responde la Open Question 3.

### 2. Reglas compartidas, `services/metricas/` (backend, puro; 1346)

- [ ] 2.1 **Pruebas de contrato primero**, `functions/tests/metricas/*.test.js`, con las tablas de casos del spec: período anterior (mes calendario completo, mes en curso del 23-oct contra 1 al 23 de septiembre, rango libre del 10 al 16 contra el 3 al 9), pedido del 30-sep a las 9 p. m. cuenta el 30-sep, hora de Colombia con `TZ=UTC` y con `TZ=America/Bogota`, regla de pedidos que no cuentan (proceso anulado, cancelado, rechazado o devuelto; pago cancelado, rechazado, fallido o reembolsado), pedido con proceso activo y pago cancelado, venta neta, `porRevisar` con el pedido de $1 y anticipo de $88.000, y lector que solo hace consultas con empresa y rango. *Depende de:* 1.1 y 1.2. **Hecho cuando:** existen y **fallan** por ausencia de los módulos.
- [ ] 2.2 `[P]` `services/metricas/periodo.js`: `limitesDelPeriodo`, `diaBogota`, `semanaDe` y `periodoAnterior`, **movidos** desde `informeEjecutivo/pedidos.js` y `calculo.js`, que pasan a importarlos. **Mostrar el diff y esperar aprobación.** *Depende de:* 2.1. **Hecho cuando:** las pruebas de período pasan y la salida del informe ejecutivo de ALMARA de septiembre, generada con el código nuevo y con el viejo sobre los mismos pedidos, es **idéntica byte a byte**.
- [ ] 2.3 `[P]` `services/metricas/pedidoCuenta.js`: `cuentaComoVenta`, `motivoQueNoCuenta` y la lista de estados que cuentan y que no, **envolviendo** `getBillingOrderExclusionReason` sin editar `subscriptionBillingUtils.js`. *Depende de:* 2.1. **Hecho cuando:** las pruebas de la regla pasan y una prueba compara el resultado con el de `isBillableSubscriptionOrder` sobre una lista de combinaciones de estados (deben coincidir en todas).
- [ ] 2.4 `services/metricas/valores.js`: `ventasDelPedido` y `porRevisar`. Calibrar los motivos de «por revisar» contando, con un script de solo lectura, cuántos pedidos de ALMARA de septiembre cae en cada uno, y comparar la venta neta mensual con la del informe ejecutivo. *Depende de:* 2.2 y 2.3. **Hecho cuando:**
  - las pruebas pasan, incluido el pedido de $1 con anticipo de $88.000 en «por revisar» y contado con su valor guardado;
  - el conteo por motivo está en el scratchpad y ningún motivo marca más del 2 % de los pedidos sin explicación (si lo hace, se ajusta el motivo y se anota);
  - la venta neta de septiembre coincide con la del informe, o la diferencia queda explicada por campo (design D1).
- [ ] 2.5 `[P]` `services/metricas/diccionario.js` con las 12 definiciones (Ventas, Venta neta, Pedidos, Pedidos que no cuentan, Ticket promedio, Unidades vendidas, Clientes nuevos, Clientes recurrentes, Saldo por cobrar, Cartera vencida, Días de vencimiento, Período anterior). *Depende de:* 2.3 y 2.4. **Hecho cuando:** una prueba comprueba que cada una trae nombre, frase, qué incluye, qué excluye y su campo de origen, y que «Ventas» lista los estados de 2.3.
- [ ] 2.6 `services/metricas/lectorPedidos.js` (design D2): las cuatro consultas de entrega, la de creación con descarte, `select` de campos, flujo, `Set` de ids, señal de cancelar y fecha de vencimiento. La base `factura` solo si 1.8 la confirmó. *Depende de:* 2.2, 2.3 y 1.6. **Hecho cuando:**
  - con una base de datos falsa, la prueba comprueba que **toda** consulta lleva `company` y un rango de fecha, y que no hay una sola sin rango;
  - un pedido POS sin entrega entra por creación y uno con entrega fuera del período no entra;
  - un pedido leído dos veces se cuenta una;
  - con 1.334 pedidos de prueba que reproducen septiembre (1.282 válidos y 52 que no cuentan) la paridad da exacta.
- [ ] 2.7 Bandera `reportsOfficialMetrics` en `FEATURE_FLAGS` de `services/companyFeatureFlags.js` y en `COMPANY_FEATURE_FLAGS` del front, con su comentario: dueño Daniel, retiro 2027-04-30, Artículo XII. *Depende de:* 0.3. **Hecho cuando:** `node --check` pasa y una prueba confirma que una empresa sin la bandera la lee como apagada.
- [ ] 2.8 Correr todo lo de la sección 2 y el script `npm run test:metricas` (nuevo en `package.json`). **Hecho cuando:** todo en verde. Mostrar el diff completo y esperar aprobación; luego commit con sello y push a la rama del backend.

### 3. Motor de reportes y rutas (1348, 1346, 1345)

- [ ] 3.1 **Pruebas de contrato primero** del motor y las rutas nuevas: solo lee el período y la empresa; acumuladores iguales al motor viejo; cancelar detiene la lectura; el tope devuelve 408 con `CONSULTA_MUY_GRANDE`; `estimar` no lee documentos; `detalle` suma el valor del que parte y respeta `sellerField`; la consulta lenta escribe una fila sin datos personales; ninguna ruta escribe fuera de `reports` y `audit_log_access`. *Depende de:* 2.8. **Hecho cuando:** existen y fallan contra el código actual (un caso: «el motor leyó 18.000 documentos para un período de 1.300»).
- [ ] 3.2 Acumuladores incrementales en `firestore.engine.js` (design D3), en lugar de `rawDocs`, `filteredDocs` y los arreglos por grupo. **Mostrar el diff y esperar aprobación.** *Depende de:* 3.1. **Hecho cuando:** un conjunto de reportes de ejemplo (todas las funciones —suma, promedio, conteo, conteo sin repetir, mínimo y máximo— y todas las granularidades) da filas y totales **idénticos** al motor viejo sobre los mismos documentos falsos, y la memoria con 100.000 documentos sintéticos queda proporcional a los grupos.
- [ ] 3.3 `[P]` `truncateDate` con aritmética sobre la fecha desplazada −5 h y getters UTC. *Depende de:* 3.1. **Hecho cuando:** la prueba da el mismo resultado con `TZ=UTC` y con `TZ=America/Bogota`, y el pedido del 30-sep a las 9 p. m. cae en septiembre en día, semana (lunes a domingo) y mes.
- [ ] 3.4 `spec.periodo` y su respaldo para reportes guardados, y la dimensión `fecha_base` en `orders.source.js`. **Mostrar el diff y esperar aprobación.** *Depende de:* 3.2 y 2.6. **Hecho cuando:**
  - con `periodo`, el motor lee solo ese rango por el lector de 2.6 y `meta.totalDocsScanned` es del tamaño del período;
  - un reporte guardado con filtros `gte`/`lte` de la forma vieja se interpreta como días de Colombia y `meta` marca el cambio;
  - un reporte sin fecha corre como hoy;
  - `fecha_dia` (creación) sigue existiendo.
- [ ] 3.5 Regla de ventas en `orders.source.js` (`reglaVentas: true`) y `meta` (`reglaVersion: 'ventas-v1'`, `excluidos` por motivo, `porRevisar`, `calculadoAt`, `registrosLeidos`), con `spec.incluirCaidos`. **Mostrar el diff y esperar aprobación.** *Depende de:* 3.4 y 0.3 (respuesta 1). **Hecho cuando:** con la bandera encendida, ALMARA de septiembre da 1.282 válidos y 52 excluidos con su desglose por estado; con la bandera apagada, el motor responde como antes (sin regla), y con `incluirCaidos: true` da 1.334.
- [ ] 3.6 Cancelar y tope (design D4): señal desde `req.on('close')`, vencimiento de 30 s y `408` con `{ code, mensaje, sugerencias }`. *Depende de:* 3.2 y 0.3 (respuesta 2). **Hecho cuando:** la prueba comprueba que, al cerrar la conexión, el flujo se destruye y no se leen más documentos, y que una consulta que supera el tope recibe el 408 con las tres sugerencias.
- [ ] 3.7 `[P]` `POST /v1/reports/estimar` (design D5), con `count()` y sin leer documentos. *Depende de:* 3.4. **Hecho cuando:** la prueba comprueba que no se leyó ningún documento, que más de 50.000 da `pesada: true` con `filtroSugerido` del mes en curso, y que si no se puede contar la ruta responde sin cifra y sin aviso.
- [ ] 3.8 `[P]` Registro de consultas lentas en `audit_log_access` (design D4): más de 5 s, cancelada o cortada por tiempo, sin esperar la escritura. *Depende de:* 3.6. **Hecho cuando:** la prueba comprueba los 7 campos del spec, que no hay datos personales ni resultado, y que una escritura que falla deja la misma respuesta.
- [ ] 3.9 `POST /v1/reports/detalle` (design D6). **Mostrar el diff y esperar aprobación.** *Depende de:* 3.5. **Hecho cuando:** la suma del detalle de la barra de un canal da el valor de la barra; un vendedor con «solo mis métricas» solo ve sus pedidos; con la cabecera `company` cambiada responde 403.
- [ ] 3.10 Etiquetas: `inferColumns` devuelve `label` visible y `claveFormula`; las fuentes ganan `etiquetaNegocio` y `alias` (design D7). *Depende de:* 3.2. **Hecho cuando:** una prueba comprueba que todo `alias` es único entre las columnas de una fuente (sin colisiones) y que `claveFormula` es exactamente el texto que genera hoy el motor.
- [ ] 3.11 `[P]` `GET /v1/reports/metricas` (el diccionario) y `GET /v1/reports/por-revisar?desde&hasta&base`. *Depende de:* 2.5 y 3.5. **Hecho cuando:** las dos rutas responden con `auth, requireJwtTenant`, no leen la empresa de la cabecera y `por-revisar` devuelve el número del pedido, su valor guardado y la diferencia.
- [ ] 3.12 **Contract test de solo lectura:** con un espía de Firestore, falla si el motor, el lector, `estimar`, `detalle`, `metricas` o `por-revisar` escriben fuera de `reports` y `audit_log_access`. *Depende de:* 3.9 y 3.11. **Hecho cuando:** pasa, y se probó que falla al agregarle a propósito una escritura en `orders`.
- [ ] 3.13 Correr las pruebas de las secciones 2 y 3 y las de D-484 (`test:reportes-empresa-jwt`). **Hecho cuando:** todo en verde en un comando. Mostrar el diff completo y esperar aprobación; luego commit con sello y push a la rama del backend.

### 4. Una sola regla en las demás superficies de venta (1346; una por una, con diff y aprobación)

- [ ] 4.1 `salesMetricOrder` y las tools de ventas (`getSalesToday`, `getSalesByPeriod`, `getTopProducts`, `getTopCustomers`, `getOrderAnalytics`): usan `cuentaComoVenta` y reciben la fecha base por parámetro, con la de entrega por omisión **solo con la bandera encendida**. *Depende de:* 3.13, 1.5 y 0.3 (respuesta 1). **Hecho cuando:** con la bandera apagada las pruebas existentes (`tests/operational-metrics.test.js` y las de las tools) dan lo mismo que antes; encendida, la venta de ALMARA de septiembre en `get_sales_by_period` da 1.282 y 1.334 con los caídos.
- [ ] 4.2 Dashboard y bienvenida (`controllers/analytics.js`). *Depende de:* 4.1. **Hecho cuando:** encendida, la cifra de ventas de septiembre es la misma que en 4.1 y en un reporte; apagada, igual que antes.
- [ ] 4.3 Informe ejecutivo: confirmar que importa `periodo.js` y la regla del cobro sin cambio de resultado. *Depende de:* 2.2 y 3.13. **Hecho cuando:** la salida de septiembre de ALMARA es idéntica a la de 2.2 y `tests/billing` del informe pasa.
- [ ] 4.4 Entrega a D-474 (chat de Opttia): dejar a la otra sesión el diccionario y el lector listos y una nota con las funciones a usar. **No se edita** `opttia-chat-katuq-preguntas-de-negocio`. *Depende de:* 3.13. **Hecho cuando:** la nota está en el scratchpad y la sesión de D-474 la recibió.
- [ ] 4.5 Prueba de paridad entre superficies con la bandera encendida: un reporte, el dashboard, el informe ejecutivo y `get_sales_by_period`, con el mismo período, base y filtros, dan la **misma** cifra de Ventas en datos de prueba. *Depende de:* 4.1, 4.2 y 4.3. **Hecho cuando:** la prueba pasa y falla si una superficie suma por su cuenta (se probó cambiando una a propósito).

### 5. Cuadre con facturación y frescura (1346)

- [ ] 5.1 **Pruebas de contrato primero**, `functions/tests/reports/cuadre.test.js`: mes que cuadra, mes con diferencia (cada una de las 5 causas), invariante «la suma de las causas es la diferencia total» con tolerancia `0,011`, empresa que no factura desde Katuq (lo dice, no muestra ceros), funcionamiento igual con los tres proveedores. *Depende de:* 3.13 y 1.8. **Hecho cuando:** existen y fallan por ausencia del servicio.
- [ ] 5.2 `services/reports/cuadre/fuentes/` con la interfaz `facturasDelPeriodo` y los adaptadores de `dian_documents` y `accounting_documents` (solo los proveedores confirmados en 1.8). El de DIAN lee por rango de fecha del documento, no la colección completa. *Depende de:* 5.1. **Hecho cuando:** la prueba comprueba que cada consulta lleva empresa y rango, y que un proveedor no confirmado en 1.8 no se ofrece.
- [ ] 5.3 `clasificarDiferencias` (pura) con las cinco causas. *Depende de:* 5.1 y 2.4. **Hecho cuando:** pasan los casos de 5.1 y la invariante se verifica además con 200 casos generados al azar.
- [ ] 5.4 `GET /v1/reports/cuadre?mes=AAAA-MM`, solo lectura, con `auth, requireJwtTenant` y `req.tenant`. **Mostrar el diff y esperar aprobación.** *Depende de:* 5.2 y 5.3. **Hecho cuando:** para ALMARA (solo lectura) el cuadre de septiembre responde con diferencia explicada línea por línea y suma de causas igual a la diferencia, y con la cabecera cambiada da 403.
- [ ] 5.5 Frescura: `meta.calculadoAt` en todos los resultados y el aviso de sincronización atrasada **solo** para las fuentes con registro de ejecución confirmado en 1.8. *Depende de:* 5.4. **Hecho cuando:** con una ejecución de hace dos días simulada, el cuadre trae el aviso con la fecha; sin registro, no avisa nada.
- [ ] 5.6 Diff completo, pruebas de la sección 5 y de la 3.12 en verde, aprobación y commit con sello. **Hecho cuando:** el commit existe y 3.12 sigue en verde con la ruta nueva.

### 6. Front: lenguaje claro, definiciones y velocidad en pantalla (1347, 1346, 1348)

- [x] 6.0 Arreglos rápidos de 1347 (solo texto y presentación, exención D-400), publicados en el commit **`9a50d29a`** del Seller (2026-10-23). Hechos:
  - [x] constructor: «Información de», «Datos para agrupar» y «Datos para medir» (1);
  - [x] «Agrupar por», «Comparar por» y «Qué medir», sin «pivot Excel» (2);
  - [x] «+ Fórmula» en el botón, el modal y los avisos (3);
  - [x] comparación: «Sin comparación», «Mes anterior (mismas fechas)» y «Mismo período del año pasado» (4);
  - [x] función, granularidad y tipo de vista en español, con los valores internos intactos, vía `model/report-labels.ts` (5);
  - [x] estado vacío sin jerga y milisegundos a segundos (6);
  - [x] columna de comparación «(mes anterior)» solo en el texto (7);
  - [x] hojas «Gráficas» y «Tabla dinámica», «Período» (8);
  - [x] tarjetas «Pedidos · Barras» en lugar de «orders · table» (9);
  - [x] fechas `dd/MM/yyyy` en el inicio (10);
  - [x] «Panel de control» con su explicación, y estado vacío sin jerga (11);
  - [x] nombres y descripciones de las 7 plantillas en lenguaje de negocio (12);
  - [x] íconos de Font Awesome 5/6 por equivalentes de 4.7 en el inicio, las plantillas y el constructor (13).

  Verificado en el código el 2026-10-23: el commit está en `feature/venta-asistida-mejorada`. Lo que quedó fuera de esos 13 pasa a 6.1 (íconos de la vista de un reporte) y a 7.7 (el `#2563EB` del Excel).
- [ ] 6.1 Lo que quedó del 1347 más rápido:
  - íconos de 5/6 que siguen en `view/report-view.component.html` (`fa-file-excel`, `fa-file-image`, `fa-file-pdf`, `fa-pen`, `fa-triangle-exclamation`, `fa-circle-exclamation`) y `shared/report-viz/viz-table.component.ts` (`fa-xmark`);
  - `tests/reportes/terminos-prohibidos.test.js`, que recorre los HTML y los textos de `dashboard/` y falla con un término de la lista del spec (códigos de fuente, BAR/table/pivot/kpi, sum/avg/count, day/month, WO/FV/CxC, persistLines/bucket/aging).

  *Depende de:* 1.7. **Hecho cuando:** la prueba pasa; `grep` de los íconos de 5/6 en esas carpetas da 0; y a 1440 y 390 px el botón de exportar, editar y los avisos de la vista de un reporte muestran su ícono.
- [ ] 6.2 Etiquetas visibles y fórmulas guardadas (design D7): `calc-engine.ts` resuelve una referencia por la clave de hoy, la etiqueta nueva o un alias; `traducirFormula(expresion, columnas)`; los encabezados usan `label` y las fórmulas siguen guardando su texto. Pruebas `node --test` con `ts-node` (como `tests/ventas/precio-congelado-por-fecha.test.js`). *Depende de:* 3.10. **Hecho cuando:**
  - la fórmula `[Total Pedido (sum)] / [Pedidos (count)]` da el mismo valor antes y después y se lee «[Total de pedidos (Suma)] / [Pedidos (Conteo)]»;
  - todas las fórmulas de los reportes de FLORECER (copiadas en solo lectura al fixture) dan el mismo resultado;
  - los encabezados de «Mes» y «Total de pedidos» no llevan la función ni la granularidad en inglés;
  - un alias repetido en una fuente hace fallar la prueba.
- [ ] 6.3 `[P]` `periodos.ts` (puro): Hoy, Ayer, Esta semana (lunes a domingo), Este mes, Mes anterior, Últimos 30 días, Este año y Personalizado, más la comparación (Sin comparación, Período anterior, Mismo período del año pasado). El selector manda `periodo` con días de Colombia (ya no `T00:00:00.000Z`). *Depende de:* 3.4. **Hecho cuando:** una prueba con la **misma tabla de casos** de `periodo.js` (el 23-oct «Este mes» cubre 1 al 23 de octubre y se compara contra 1 al 23 de septiembre; rango del 10 al 16 contra 3 al 9) pasa en el front y en el backend, y a 1440 y 390 px el subtítulo dice el período.
- [ ] 6.4 Plantillas (design D7): `preset-reports.ts` por tema (Ventas, Productos, Clientes, Cartera, Inventario), título en pregunta o beneficio, frase e ícono visible; cinco plantillas nuevas de pedidos con `fecha_base`: por mes, por canal, por vendedor, por forma de pago y por ciudad; las que dependen de una integración que la empresa no tiene se muestran atenuadas con lo que se necesita y no abren el constructor. *Depende de:* 3.4, 3.5 y 6.1. **Hecho cuando:** una empresa sin World Office (FLORECER con la integración apagada, o un doble en la prueba) ve las cinco de pedidos disponibles y las de WO atenuadas con el mensaje; ninguna plantilla abre un constructor vacío; y a 1440 y 390 px todas tienen ícono visible.
- [ ] 6.5 `[P]` Nombre automático («Ventas por mes · 2026») y favoritos (`favoritoPor` en el mismo documento de `reports`); fecha de última actualización `dd/MM/yyyy`. *Depende de:* 6.4. **Hecho cuando:** dos reportes guardados sin nombre quedan con nombres distintos que los describen, ninguno «Nuevo reporte»; un favorito sube arriba y se conserva al recargar; el guardado de FLORECER se hace con `POST /v1/reports` bloqueado en DevTools y el payload solo trae los campos esperados.
- [ ] 6.6 `[P]` Recorrido guiado de primera visita (saltable y repetible), «¿Qué es esto?» por zona y dato, ejemplo precargado en el estado vacío. Sin librería nueva si el proyecto ya tiene una; si no, un componente propio OnPush. *Depende de:* 6.2. **Hecho cuando:** en un navegador sin datos guardados el recorrido sale una vez, saltarlo no lo vuelve a mostrar solo, «repetir» lo reabre, y a 390 px los globos caben sin scroll horizontal.
- [ ] 6.7 Definiciones y avisos (design D8): `InfoMetricaComponent` con el ícono (i) accesible por teclado junto a cada indicador y cada columna de medida; aviso de cifra cambiada con «Ver la diferencia» (reglas: una vez por reporte y versión en `localStorage`); `reglaVersion` al guardar; hora de los datos y «Actualizar»; vista «Datos por revisar»; vista «Cuadre con facturación». Todo detrás de la bandera donde cambia cifras. *Depende de:* 3.5, 3.11 y 5.4. **Hecho cuando:**
  - en FLORECER con la bandera encendida, el (i) de «Venta neta» muestra incluye y excluye;
  - un reporte guardado antes del cambio muestra el aviso una sola vez y la diferencia contra la cifra anterior;
  - «Datos por revisar» lista el pedido de prueba de $1;
  - el cuadre explica la diferencia por causa;
  - con la bandera apagada no aparece nada de esto;
  - a 1440 y 390 px todo se ve completo, sin scroll horizontal.
- [ ] 6.8 Velocidad en pantalla (design D5 y D4): primeras 500 filas con «Ver más»; tabla dinámica de 30 columnas como máximo con «Otros» y el aviso; llamada a `estimar` cuando no hay período o supera 90 días, con «Filtrar por este mes» a un clic y «Seguir sin filtro»; progreso con el tiempo transcurrido y botón «Cancelar» (cancela la petición y conserva el resultado anterior); mensaje del tope de 30 s con sugerencias. *Depende de:* 3.6, 3.7 y 6.3. **Hecho cuando:**
  - un resultado de 3.000 filas muestra 500 y «Ver más», y el Excel de 7.7 trae las 3.000;
  - con 200 productos en «Comparar por» se ven 29 y «Otros», con el aviso;
  - corrida sin período muestra el aviso y «Filtrar por este mes» deja el período puesto;
  - «Cancelar» a los 10 s deja la pantalla como estaba y en Network la petición queda cancelada;
  - el 408 muestra el mensaje con sugerencias y no un indicador de carga sin fin;
  - a 1440 y 390 px no hay scroll horizontal.
- [ ] 6.9 Build de producción sin errores y la prueba de 6.1 en verde tras cada tarea de esta sección. **Hecho cuando:** el build termina en verde y el diff solo tiene archivos de este cambio.

### 7. Gráficos y exportes (1345)

- [ ] 7.1 `[P]` Paleta de marca y formato de gráficos en `shared/report-viz/`: colores del sistema de diseño legibles en modo claro y oscuro, pesos colombianos ($41.400), ejes abreviados ($1,2 M, $350 mil), etiquetas de valor, tooltips claros y leyenda solo con más de una serie. *Depende de:* 1.7. **Hecho cuando:** con un resultado de ventas por canal, a 1440 y 390 px y en modo claro y oscuro, cada barra muestra su valor en pesos, el eje dice «$1,2 M», no hay leyenda con una serie, y los conteos de gradientes y primarios no suben.
- [ ] 7.2 `[P]` `topConOtros(filas, n)` puro en `shared/report-viz/`: barras de mayor a menor con las 10 mayores y «Otros» (cambiable a 20 o a todas), tortas con 6 porciones (5 más «Otros») y porcentaje de cada una. *Depende de:* 7.1. **Hecho cuando:** una prueba con 80 productos da 10 más «Otros» y el total del gráfico no cambia; una torta con 12 categorías da 5 más «Otros» con los porcentajes sumando 100 %.
- [ ] 7.3 Indicador con valor grande, variación contra el período anterior (↑ verde, ↓ rojo) y mini tendencia; si el período anterior no tiene datos, lo dice. *Depende de:* 6.3 y 7.1. **Hecho cuando:** el indicador de ventas del mes muestra «↑ 12 % vs. mes anterior» con datos de prueba y «Sin datos del período anterior» cuando no los hay, a 1440 y 390 px.
- [ ] 7.4 `[P]` Título y subtítulo automáticos con período, fecha base y filtros («1–23 oct 2026 · por fecha de entrega · canal Almara Online»), y fechas en español («may 2026», «lun 20»). *Depende de:* 6.3. **Hecho cuando:** el subtítulo de un reporte filtrado por canal en octubre dice exactamente eso, en pantalla y en los tres exportes.
- [ ] 7.5 Bajar al detalle: clic en una barra, porción, punto o fila abre los pedidos, clientes o productos que forman el valor, con exportar. *Depende de:* 3.9 y 7.1. **Hecho cuando:** en FLORECER el clic en la barra de un canal muestra los pedidos del canal y su suma da el valor de la barra; un usuario con «solo mis métricas» (cuenta de prueba) solo ve los suyos; a 390 px la tabla del detalle no genera scroll horizontal de la página.
- [ ] 7.6 `[P]` Estados vacíos (ícono, título y frase: «No hay ventas en este período») y adaptación a tableta y celular de gráficos y tablas. *Depende de:* 7.1. **Hecho cuando:** a 1440, 768 y 390 px no hay scroll horizontal de la página y el estado vacío se ve completo.
- [ ] 7.7 Excel listo para enviar: encabezado con logo y nombre de la empresa (kit de marca existente), título, período, filtros y fecha; encabezados con el acento `#5F3FE0` (reemplaza los 3 `#2563EB` de `report-builder.component.ts`), fila congelada, formato de moneda, miles y fechas, columnas ajustadas, fila de totales, filtros activados y hoja de gráfico cuando hay gráfico. *Depende de:* 7.4 y 6.8. **Hecho cuando:** `grep` de `#2563EB` en `dashboard/` da 0; abrir el archivo de un reporte de ventas por producto muestra todo lo anterior sin retoques; y la fila de totales coincide con el total en pantalla.
- [ ] 7.8 PDF de marca en el backend (`pdf/report-pdf.generator.js`): plantilla de marca con el acento `#5F3FE0` (reemplaza el índigo `#1a237e`), horizontal si la tabla es ancha, gráfico, resumen en palabras con cifras que existen en el reporte, número de página y pie «Generado con Katuq · <fecha>». **Mostrar el diff y esperar aprobación.** *Depende de:* 7.4. **Hecho cuando:** una tabla de 12 columnas sale horizontal con número de página y el pie; una prueba comprueba que cada cifra del resumen existe en el resultado; y `grep` del índigo en el generador da 0.
- [ ] 7.9 `[P]` PNG en alta resolución (2x) con título, período y logo. *Depende de:* 7.4. **Hecho cuando:** el PNG sale a 2x con los tres elementos y el gráfico completo, sin recortes por desborde.
- [ ] 7.10 Nombres de archivo («Ventas-por-producto_may-2026.xlsx») y botones de exportar activos cuando se puede; sin resultado, «Ejecuta el reporte para poder exportarlo»; resultado de más de 10.000 filas avisa antes de exportar y sugiere un filtro. *Depende de:* 7.7, 7.8 y 7.9. **Hecho cuando:** los tres archivos de un reporte llevan el mismo nombre base, los botones se ven activos a 1440 y 390 px, y el aviso sale con un resultado de prueba de 12.000 filas.
- [ ] 7.11 «Exporte igual a la pantalla»: prueba que compara las cifras del Excel, el PDF y el PNG de un reporte con las de la pantalla, y que un exporte no incluye una columna que la persona no ve. *Depende de:* 7.10. **Hecho cuando:** la prueba pasa en tres reportes de ejemplo (con y sin tabla dinámica) y las dos filas de totales coinciden.
- [ ] 7.12 Build de producción sin errores y conteos de 1.7 en `components/dashboard` y `shared/report-viz`. **Hecho cuando:** build en verde, gradientes sin subir, primarios en 0 y clases nuevas con «p-» en 0.

### 8. Verificación de F1

- [ ] 8.1 Backend: todas las pruebas de las secciones 2, 3 y 5, `test:reportes-empresa-jwt` y las del informe ejecutivo, en un solo comando; `node --check` de lo tocado. Front: build de producción, pruebas `node --test` de 6.1, 6.2, 6.3 y 7.2. **Hecho cuando:** todo en verde.
- [ ] 8.2 Conteos de diseño de 1.7 en ambas carpetas. **Hecho cuando:** gradientes sin subir, primarios en 0 y clases con «p-» en 0.
- [ ] 8.3 Navegador a 1440×900 y 390×844, y a 1366×768: inicio, constructor, vista de un reporte, «Datos por revisar», cuadre, detalle y los tres exportes; con la bandera apagada y encendida; con teclado en el (i) y en el recorrido. **Hecho cuando:** sin scroll horizontal, sin texto invisible, sin piezas encimadas, con el foco visible, y las capturas del «después» guardadas junto a las de 1.7.
- [ ] 8.4 **Paridad de producción** con `scripts/verificar-paridad-reportes.js` (solo lectura, ALMARA, septiembre de 2026): reporte, dashboard, informe ejecutivo y Opttia. *Depende de:* 4.5. **Hecho cuando:** las cuatro dan 1.334 pedidos, 52 que no cuentan y 1.282 válidos, y la misma cifra de Ventas y de Venta neta; la salida queda en el scratchpad.
- [ ] 8.5 **Velocidad después**: repetir las mediciones de 1.3 con la versión nueva. **Hecho cuando:** la plantilla de ventas del mes tarda 2 s o menos, los 12 meses por mes y canal tardan 5 s o menos, y `registrosLeidos` es del tamaño del período; las dos tablas (antes y después) quedan juntas. Si no llega, se **para** y se lleva a Daniel la excepción de resúmenes diarios precalculados como propuesta aparte (no se implementa aquí).
- [ ] 8.6 Prueba de solo lectura de punta a punta: con el espía, recorrer los 3 exportes, el detalle, el cuadre y `por-revisar`. **Hecho cuando:** cero escrituras fuera de `reports` y `audit_log_access`.
- [ ] 8.7 Recorrido manual de la lista de términos prohibidos (spec «Revisión de aceptación») por todas las pantallas de Reportes y los archivos exportados. **Hecho cuando:** ningún término aparece y la lista recorrida queda anotada.

### 9. Despliegue, encendido y cierre de F1 (cada paso con autorización; fuera del modo auto)

- [ ] 9.1 Backend en producción con `reportsOfficialMetrics` apagada en todas partes: commit y push antes, luego `git pull` y `pm2 restart katuq-api`, según MANUAL-EC2. **Hecho cuando:** arranque limpio en `pm2 logs`; una consulta de reportes de ALMARA responde igual que antes con la bandera apagada; `estimar` responde; ninguna escritura nueva en Firestore.
- [ ] 9.2 Front en producción con el candado de publicación: `git pull`, build desde la punta y despliegue enseguida. **Hecho cuando:** el lenguaje claro, los gráficos y los exportes se ven en producción a 1440 y 390 px y las cifras no cambian con la bandera apagada.
- [ ] 9.3 FLORECER encendida: `scripts/set-company-feature.js` en simulación y luego con `--execute`. **Hecho cuando:** el aviso de cifra cambiada, «Datos por revisar» y el cuadre funcionan en FLORECER y el apagado devuelve las cifras de antes (ensayo de reversa).
- [ ] 9.4 ALMARA FELICIDAD encendida, con la paridad de 8.4 en verde y el OK de Daniel. Observación de 5 días hábiles. **Hecho cuando:** pasan los 5 días sin errores en `pm2 logs` ni quejas, el registro de consultas lentas no trae nada nuevo sin explicar, y Daniel confirma.
- [ ] 9.5 Resto de comercios, por tandas y con el OK de Daniel. **Hecho cuando:** todas encendidas o las que Daniel indique, anotadas en `specs/CONTRACT.md`.
- [ ] 9.6 **Retiro de la bandera (Artículo XII):** registrar en `specs/CONTRACT.md` que `reportsOfficialMetrics` tiene dueño Daniel y se retira a más tardar el **2027-04-30** (encendida para todos o eliminada, y retirada la rama de «reglas de antes»), con la tarea de seguimiento abierta. Se hace **antes** de 9.4. **Hecho cuando:** la entrada existe con fecha y dueño.
- [ ] 9.7 Ticket 1347, según el flujo de tickets: verificar en producción, evidencia del antes y el después y comentario en lenguaje de negocio. **Hecho cuando:** Resuelto con evidencia. Lo hace la sesión principal.
- [ ] 9.8 Ticket 1346: ídem, con la cifra común de septiembre y el cuadre de ALMARA como evidencia. **Hecho cuando:** Resuelto con evidencia.
- [ ] 9.9 Ticket 1348: ídem, con las dos tablas de tiempos (1.3 y 8.5). **Hecho cuando:** Resuelto con evidencia.
- [ ] 9.10 Ticket 1345: ídem, con los tres archivos exportados de un reporte. **Hecho cuando:** Resuelto con evidencia.
- [ ] 9.11 Bitácora de D-551 en `specs/CONTRACT.md` (sesión principal, revisando antes `origin`): commits, despliegue, mediciones y lo que queda para F2. **Hecho cuando:** la entrada existe. El cambio **no se archiva** hasta cerrar F3.

---

## F2 — Valor (1344, 1343, 1342) · ESQUEMA, se detalla al cerrar F1

*Depende de:* F1 publicada y verificada, y de las capacidades `reportes-preguntas-listas`, `reportes-tablero-gerencial` y `reportes-rentabilidad`. Cada capacidad con su bandera por empresa (`reportsDashboard`, `reportsProfitability`), dueño Daniel y retiro fechado.

### 10. Preguntas listas (1344)

- [ ] 10.1 Verificación previa: qué calcula hoy cada módulo dueño (Central de Abastecimiento de D-401, cartera y clientes de D-405) para reutilizar su función y no repetirla. *Salida:* tabla pregunta → módulo dueño → función.
- [ ] 10.2 Pruebas de contrato: cada pregunta da la misma respuesta que su módulo dueño con los mismos datos. 
- [ ] 10.3 `services/reports/preguntas/catalogo.js` y su ruta, con permisos por rol y por datos disponibles («te falta el permiso X» / «necesitas Y»).
- [ ] 10.4 Asistente de tres pasos con vista previa y «Lectura en palabras» por plantillas de texto (cada cifra citada está en el resultado).
- [ ] 10.5 Inicio «¿Qué quieres saber hoy?», constructor como «Modo avanzado» y «Guardar como reporte / Fijar en el tablero» con un clic.
- [ ] 10.6 Paquetes de plantillas por tipo de negocio, activables en `companyConfig/{empresa}`.
- [ ] 10.7 Verificación a 1440 y 390 px, build, diff, aprobación y commit.

### 11. Tablero gerencial (1343)

- [ ] 11.1 Verificación previa: dónde guardar tableros y metas **sin colecciones nuevas** (tablero como documento de `reports` con `tipo: 'tablero'`; metas en `companyConfig/{empresa}`) y cómo hereda `alcanceMetricas` (D-349). Si no alcanza, se pide aprobación explícita.
- [ ] 11.2 Pruebas de contrato: permisos por rol, alcance del vendedor, metas separadas de las de cotizaciones, Excel de metas con filas inválidas (no carga a medias), enlaces con vencimiento y revocación, y el enlace externo sin documentos, teléfonos, correos ni direcciones.
- [ ] 11.3 Indicadores clave con filtro global de período y de sede o canal, variación y tendencia (sobre el diccionario de F1).
- [ ] 11.4 Metas, avance y proyección de cierre.
- [ ] 11.5 Tablero configurable por rol y por persona, y como página de inicio.
- [ ] 11.6 Enlaces con `expiraEn` y `revocadoEn` en el índice público existente; el endpoint público los comprueba antes de responder.
- [ ] 11.7 Vista de celular. Retiro de «Panel de control» cuando el tablero cubra sus indicadores.
- [ ] 11.8 Verificación a 1440 y 390 px, build, diff, aprobación y commit.

### 12. Rentabilidad (1342)

- [ ] 12.1 Verificación previa (solo lectura): cobertura de costos en ALMARA (porcentaje de la venta con producto sin costo), forma de `productCostHistory` y de las líneas de combos y adiciones.
- [ ] 12.2 Pruebas de contrato: `costoEnFecha` (un cambio de costo posterior no cambia ventas ya hechas), utilidad por agrupación que suma a la total, combo = suma de sus productos por cantidad, adiciones con su costo, «no confiable» sobre el 5 %, solo lectura.
- [ ] 12.3 `services/reports/rentabilidad/` con `costoEnFecha`, lectura del historial por lote de productos y métricas del diccionario.
- [ ] 12.4 Visibilidad con la regla de `puedeVerMargen`: se quita de reportes, tablero, exportes, enlaces y respuestas de Opttia para los demás roles.
- [ ] 12.5 Plantillas de rentabilidad, aviso de calidad del costo y lista de productos sin costo con acceso para completarlos (sin escribir desde Reportes).
- [ ] 12.6 Actualizar el escenario de D-474 «margen por costo = dato que Katuq no guarda» al archivar.
- [ ] 12.7 Verificación a 1440 y 390 px, build, diff, aprobación y commit.

### 13. Verificación, despliegue y cierre de F2

- [ ] 13.1 Pruebas completas, conteos de diseño y paridad (la rentabilidad suma igual por producto, canal y vendedor).
- [ ] 13.2 Backend con las banderas apagadas, front con el candado, FLORECER, ALMARA con el OK de Daniel y observación de 5 días hábiles.
- [ ] 13.3 Retiro fechado de las dos banderas registrado antes de encender ALMARA.
- [ ] 13.4 Tickets 1344, 1343 y 1342 y bitácora de D-551.

---

## F3 — Proactivo (1341) · ESQUEMA, se detalla al cerrar F2

*Depende de:* F2 publicada, **D-474 (chat de Opttia)** y el informe ejecutivo (D-394) vigentes. 1341 no crea un chat, un motor ni un resumen nuevos.

### 14. «Pregúntale a Opttia» dentro de D-474

- [ ] 14.1 Coordinar con la sesión de D-474: requisitos agregados a su capacidad `opttia-chat-answers` (este cambio no edita su carpeta).
- [ ] 14.2 La caja en Reportes y en el tablero abre el chat de D-474 con la pregunta escrita.
- [ ] 14.3 La consulta flexible de ventas usa el diccionario de F1 (y la rentabilidad solo con `puedeVerMargen`).
- [ ] 14.4 La respuesta trae gráfico y los botones «Guardar como reporte» y «Fijar en el tablero»; guarda la persona con el botón y el chat sigue siendo de solo consulta.

### 15. Envíos programados y resumen del lunes (extiende el informe ejecutivo)

- [ ] 15.1 Verificación previa: qué hacen hoy `informeEjecutivo/index.js` y `inventory/digest/` (reserva de la semana, destinatarios, modos) y cómo pasar los interruptores de `.env` a `config/{doc}` en Firestore (D-505).
- [ ] 15.2 Pruebas de contrato: mismo cálculo y misma regla de cuadre que el informe («si un bloque no suma, no sale»), un solo mensaje del lunes con el de inventario, destinatarios con los permisos de quien recibe, apagado por omisión.
- [ ] 15.3 Frecuencias semanal, diaria y mensual; WhatsApp (plantilla aprobada por Meta) y notificación en Katuq.
- [ ] 15.4 **Dos semanas en sombra:** se calcula y se guarda lo que se enviaría, sin enviar; Daniel revisa los destinatarios reales y las cifras.
- [ ] 15.5 Encendido por empresa con su bandera, dueño y retiro fechado; ALMARA primero.

### 16. Alertas

- [ ] 16.1 Umbrales, agrupación y silencio (`reportes-alertas`), reutilizando «por agotarse» (D-401), vencidas (D-405) y meta en riesgo (tablero).
- [ ] 16.2 Pruebas de contrato: cada alerta da la misma cifra que su módulo dueño, llega solo a quien ve ese dato, y se agrupa y silencia sin saturar.
- [ ] 16.3 Registro de alertas generadas, enviadas, silenciadas y abiertas, sin datos personales; apagadas por omisión y con su período en sombra.

### 17. Cierre de F3

- [ ] 17.1 Verificación completa, despliegue por pasos con autorización y observación en ALMARA.
- [ ] 17.2 Ticket 1341 y bitácora de D-551.
- [ ] 17.3 `/opsx:archive` con F1, F2 y F3 verificadas. Las capacidades pasan a `openspec/specs/` y, con ellas, los requisitos agregados a `opttia-chat-answers` e `informe-ejecutivo-mensual` se juntan con los de sus cambios. **Hecho cuando:** `npx openspec validate --strict` pasa sobre las specs archivadas.
