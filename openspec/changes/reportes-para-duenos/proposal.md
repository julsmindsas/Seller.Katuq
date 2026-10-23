## Why

ALMARA FELICIDAD (gerencia@almara.com.co) abrió el 22-oct ocho tickets para que los Reportes de Katuq le hablen al dueño del negocio: 1348, 1347, 1346, 1345 (F1), 1344, 1343, 1342 (F2) y 1341 (F3). Hoy Reportes habla como un ingeniero de datos, tarda con muchos datos, da cifras que no cuadran con otras pantallas y no avisa nada por sí solo.

Lo que muestra el código (solo lectura, 23-oct). Rutas del backend relativas a `katuq_admin_back_firebase/functions`:

- **Lee toda la historia de pedidos en cada consulta.** En pedidos, el filtro de fechas no se aplica al leer: se aplica en memoria (`services/reports/engine/firestore.engine.js:106-126`). El motor trae todos los pedidos de la empresa, agrupa y suma en el servidor y solo corta las filas al final (`:261-482`, corte en `:481-482`).
- **Ventas se cuentan de cuatro formas.**
  - Reportes suma todos los pedidos, cancelados incluidos (`services/reports/sources/orders.source.js`).
  - Dashboard y Opttia descartan los caídos con una regla (`services/salesMetricOrder.js:6-15`, `tools/_orderFilters.js:11-35`).
  - El cobro y el informe ejecutivo usan otra, que también descarta los devueltos y los fallidos (`services/subscriptionBillingUtils.js:8-30`).
  - La pantalla de Pedidos y la consola cuentan por fecha de entrega (D-345, D-346), y Reportes y Dashboard por fecha de creación.
- **Fechas en hora UTC, no de Colombia.** El constructor filtra con `T00:00:00.000Z` (`src/app/components/dashboard/builder/report-builder.component.ts:364, 367`) y el motor agrupa por día con la hora del servidor (`firestore.engine.js:46-71`). Un pedido del 30-sep a las 9 p. m. cae en octubre.
- **Valor guardado contra valor recalculado.** D-394 midió diferencias entre el informe ejecutivo (valor guardado del pedido) y el Excel del listado (valor recalculado): ALMARA −$1,9 M en septiembre, con pedidos guardados en $1 (DAD-013863).
- **Jerga en pantalla:**
  - plantillas con "persistLines=true en sync WO", "bucket" y "aging" (`src/app/components/dashboard/home/preset-reports.ts`);
  - tipos de gráfico, funciones y granularidades en inglés (`builder/report-builder.component.html:125, 171, 228`);
  - tarjetas que dicen "orders · table" (`home/dashboard-home.component.html:75, 77`).
- **Íconos que no existen.** La app solo carga Font Awesome 4.7 (`src/index.html:29`, `angular.json:113`). Las plantillas y los botones usan nombres de versiones 5 y 6 (`fa-coins`, `fa-chart-line`, `fa-file-excel`, `fa-floppy-disk`…), que no se dibujan. Eso explica las "plantillas sin ícono" y parte de los botones de exportar que "se ven grises".
- **Plantillas que no hacen nada.** Las 7 plantillas exigen World Office. El inicio las muestra todas (`dashboard-home.component.ts:32`). Si la empresa no tiene esa integración, el constructor se abre vacío sin decir por qué (`report-builder.component.ts:196-197`).
- **Las fórmulas dependen de los nombres en inglés.** Las fórmulas guardadas citan las columnas por su nombre visible, por ejemplo `[Total Pedido (sum)]` (`src/app/components/dashboard/model/calc-engine.ts:8, 306`). Si se traducen esos nombres sin más, se rompen las fórmulas guardadas.
- **Excel con un azul prohibido.** El encabezado del Excel usa `#2563EB` (`report-builder.component.ts:743, 824, 866`).

## Requisito previo obligatorio: `reportes-empresa-del-jwt` (D-484)

**Ninguna tarea de este cambio empieza hasta que `openspec/changes/reportes-empresa-del-jwt/` esté implementado, desplegado y verificado.** Hoy tiene 0 de 26 tareas.

Hoy `/v1/reports` toma la empresa de la cabecera `company`, que manda el navegador (`routers/reports.js:20-27`). Con ella cambiada se leen datos de otra empresa y se puede publicar en ella un enlace que lee sin sesión (`reports.js:45-56`). Cada fase de este cambio agranda ese hueco:

- F1 agrega exportes con marca y bajar al detalle;
- F2 agrega enlaces para socios y tableros por rol;
- F3 manda reportes a destinatarios externos.

## What Changes

### F1 — Base (primero; en este orden)

1. **1347, lenguaje claro.**
   - Todo en español de negocio, con estos nombres:
     - Agrupar por, Comparar por y Qué medir;
     - Tabla, Tabla dinámica, Barras, Líneas, Torta e Indicador.
   - Fechas rápidas y comparación con el período anterior o con el mismo período del año pasado.
   - Plantillas reescritas, con ícono y agrupadas por tema. Las que la empresa no puede correr no aparecen como disponibles.
   - Reportes guardados con nombre automático y favoritos.
   - "Vista clásica" explicada.
   - Recorrido guiado y ayuda en cada campo.
   - Las fórmulas guardadas siguen funcionando.
2. **1346, una sola definición de cada métrica.**
   - Un diccionario único que usan reportes, tablero, bienvenida, Opttia (D-474), informe ejecutivo (D-394) y exportes.
   - Una sola regla de pedidos que no cuentan y una fecha base visible y elegible, en hora de Colombia.
   - Ícono (i) con la definición de cada cifra.
   - Vista "Cuadre con facturación", con la diferencia explicada por causa.
   - Hora de los datos y aviso si una sincronización va atrasada.
3. **1348, velocidad.**
   - Leer solo el período pedido.
   - Primeras 500 filas con "Ver más".
   - Tabla dinámica de 30 columnas como máximo, con "Otros".
   - Aviso antes de una consulta pesada, progreso, Cancelar y tiempo máximo.
   - Metas: plantillas en 2 s y 12 meses en 5 s.
4. **1345, gráficos y exportes.**
   - Paleta de marca, pesos colombianos, Top 10 + "Otros" e indicadores con variación y tendencia.
   - Bajar al detalle.
   - Excel, PDF y PNG con logo, período, filtros y totales, listos para mandar a un socio.

### F2 — Valor (después de F1)

5. **1344, "¿Qué quieres saber hoy?".**
   - Preguntas listas por tema.
   - Asistente de 3 pasos y lectura en palabras.
   - El constructor pasa a "Modo avanzado".
   - Cada pregunta responde igual que el módulo dueño del dato:
     - reponer y "no se mueven" = Central de Abastecimiento (D-401);
     - clientes que dejaron de comprar y cartera = D-405.
6. **1343, tablero gerencial.**
   - Indicadores clave con filtro global, metas y proyección de cierre.
   - Permisos por rol: reutiliza D-349 para el vendedor.
   - Enlaces con vencimiento.
   - Vista de celular.
7. **1342, rentabilidad.**
   - Costo de lo vendido, utilidad bruta y margen, por producto, canal, vendedor y más.
   - Aviso de calidad cuando faltan costos.
   - Solo para roles autorizados, con la misma regla del margen de cotizaciones (`services/cotizaciones/margenCotizacion.js:76`).

### F3 — Proactivo (después de F2): 1341 entra en lo que ya existe

1341 **no abre un chat, un motor ni un resumen nuevos**:

- **"Pregúntale a Opttia" es el chat de D-474.**
  - La caja en Reportes y en el tablero abre ese mismo chat con la pregunta escrita.
  - La consulta flexible de ventas de D-474 responde con las métricas del diccionario de F1.
  - La respuesta trae un gráfico y los botones "Guardar como reporte" y "Fijar en el tablero". Guarda la persona con el botón, no Opttia, así que el chat sigue siendo de solo consulta, como pide D-474.
  - Se escribe como requisitos agregados a la capacidad `opttia-chat-answers` de D-474.
- **Los envíos programados y el resumen del lunes extienden el informe ejecutivo de D-394.**
  - Usan el mismo cálculo y la misma regla de cuadre: si un bloque no suma, no sale.
  - Se agregan la frecuencia semanal, diaria y mensual, el envío por WhatsApp y la notificación en Katuq.
  - Si la empresa también tiene el resumen de inventario (D-401), el dueño recibe **un solo** mensaje del lunes.
  - Se escribe como requisitos agregados a la capacidad `informe-ejecutivo-mensual`.
- **Las alertas reutilizan los cálculos que ya existen:**
  - "por agotarse" = Central de Abastecimiento (D-401);
  - vencidas = cartera de tesorería (D-405);
  - meta en riesgo = tablero de F2.
  - Viajan en el mismo envío. La capacidad nueva `reportes-alertas` solo define umbrales, agrupación y silencio.

## Velocidad y la regla "Sin cache extra" (1348)

El ticket pide un caché ("si nada cambió, mostrar el último resultado") y pre-agregados diarios. AGENTS.md prohíbe capas de caché nuevas, y `openspec/config.yaml` exige aprobación para cualquier colección nueva. Esta propuesta no los incluye. La spec pide solo comportamiento: tiempos, Cancelar y la hora del cálculo. La forma de cumplirlo queda en la pregunta 3. Primero se lee solo el período y se suma en origen, y se mide con ALMARA (unos 1.330 pedidos por mes, D-345). Los resúmenes precalculados entran solo si eso no llega a la meta, como excepción registrada, igual que D-345 con `companyMetrics`.

## Capabilities

### New Capabilities

- `reportes-lenguaje-claro` (F1, 1347)
- `reportes-metricas-oficiales` (F1, 1346)
- `reportes-velocidad` (F1, 1348)
- `reportes-graficos-exportes` (F1, 1345)
- `reportes-preguntas-listas` (F2, 1344)
- `reportes-tablero-gerencial` (F2, 1343)
- `reportes-rentabilidad` (F2, 1342)
- `reportes-alertas` (F3, 1341)

### Modified Capabilities

- Ninguna de `openspec/specs/`.
- F3 agrega requisitos a dos capacidades que proponen cambios todavía sin archivar:
  - `opttia-chat-answers` (D-474, `opttia-chat-katuq-preguntas-de-negocio`);
  - `informe-ejecutivo-mensual` (D-394).
- Al archivar, se juntan con ellas.
- El escenario de D-474 "margen por costo = dato que Katuq no guarda" deja de valer cuando salga F2, y se debe actualizar al archivar D-474.

## Impact

- **Backend (`katuq_admin_back_firebase/functions`):**
  - `services/reports/` (motor, fuentes, PDF), `routers/reports.js` y las funciones de ventas que ya existen (`services/salesMetricOrder.js`, `tools/_orderFilters.js`, `services/subscriptionBillingUtils.js`);
  - indicadores de facturación (`controllers/accountingController.js:2394`);
  - informe ejecutivo (`services/billing/informeEjecutivo/*`), resumen de inventario (`services/inventory/digest/*`) e insights (`/v1/insights/:modulo`);
  - historial de costos (`controllers/productCosts.js`, `services/purchasing/purchaseCostCapture.js`).
- **Front (`Seller.Katuq`):** `src/app/components/dashboard/**`, `src/app/shared/report-viz/**`, `src/app/shared/services/dashboard/reports.service.ts` y la entrada del menú (`nav.service.ts:907-908`).
- **ADK:** solo lo que ya cambia D-474. F3 no agrega herramientas nuevas fuera de las de D-474.
- **Datos:**
  - solo lectura de `orders`, `products`, inventario, cartera y facturación;
  - escrituras solo de reportes guardados, metas (F2) y preferencias de envío (F3);
  - sin colecciones nuevas sin aprobación explícita (ver pregunta 3).
- **Decisiones:** D-XXX en `specs/CONTRACT.md`, una por fase. ⚠️ D-474 aparece dos veces en el contrato: atribución en la línea 10633 y chat de Opttia en la 11029. Hay que renumerar una antes de citar D-474 en tareas.

## Constitución

- **Art. II:** las specs no eligen tecnología.
- **Art. III:** se quita la confianza en la cabecera (prerrequisito D-484), aunque "siempre funcionó así".
- **Art. VI:** el cuadre con facturación no depende del proveedor (SIIGO, World Office o DIAN propio).
- **Art. VII y XI:** consultas lentas, canceladas y envíos quedan registrados, sin datos personales ni tokens.
- **Art. XII:** cada bandera de envío o alerta tiene fecha de retiro.
- **Art. XIII:** una spec por capacidad, de 3 páginas como máximo.

## No-goals

- **Pedidos:** no se cambia cómo se crea, edita, cobra o factura un pedido. El cuadre muestra diferencias; no las corrige.
- **Productos:** no se escriben productos, precios ni costos desde Reportes. La rentabilidad solo lee el costo.
- **Opttia:** no se crea un chat nuevo ni un segundo motor de preguntas, y Opttia no guarda ni programa nada por sí mismo.
- **Contabilidad:** no hay contabilidad completa (gastos, nómina, utilidad neta). Solo utilidad bruta.
- **Datos personales:** no se cambia qué datos personales expone hoy el constructor (documento y correo del cliente en `orders.source.js`). Queda anotado para un cambio aparte.
- **Caché:** no hay caché de resultados (ver la sección de velocidad).

## Riesgos (módulos sensibles)

- **Cifras que cambian.** Al aplicar el diccionario, un reporte guardado puede bajar, por ejemplo al dejar de contar cancelados. La spec exige avisarlo una vez y poder comparar con la cifra anterior. Prueba de paridad: ALMARA, septiembre por entrega, 1.334 pedidos, 52 caídos y 1.282 válidos, igual que D-345 y D-394.
- **`orders` es solo lectura.** Un contract test falla si Reportes, el tablero, Opttia o un envío escriben en pedidos, productos, precios o inventario.
- **Fuga entre vendedores y entre empresas.** Los envíos, los enlaces y el detalle se calculan con los permisos de quien recibe. Depende de D-484 y D-349.
- **Rentabilidad con costos incompletos.** Se marca como "no confiable" en vez de mostrar un margen inflado.
- **WhatsApp.** Tiene costo por mensaje y plantillas aprobadas por Meta. Va apagado por omisión, en sombra dos semanas, como D-401.

## Quick wins de 1347 (solo texto y presentación; exención D-400)

No cambian cálculos, filtros, servicios ni datos guardados. Se pueden publicar ya, sin esperar esta spec.

| # | Dónde (`src/app/components/dashboard/`) | Cambio |
|---|---|---|
| 1 | `builder/report-builder.component.html:70, 78, 94` | "Fuente de datos" → "Información de"; "Dimensiones" → "Datos para agrupar"; "Medidas" → "Datos para medir" |
| 2 | `builder/report-builder.component.html:117, 138, 141, 160, 120, 167` | "Filas" → "Agrupar por"; "Columnas" → "Comparar por" (se quita "(pivot Excel)"); "Valores" → "Qué medir"; "Arrastra una dimensión/medida" → "Arrastra un dato" |
| 3 | `builder/report-builder.component.html:161-162`; `builder/report-builder.component.ts:448, 466, 508` | "+ Cálculo" → "+ Fórmula", también en el modal y en el aviso |
| 4 | `builder/report-builder.component.html:22-24` | "Sin comparar" → "Sin comparación"; "vs mes anterior" → "Mes anterior (mismas fechas)"; "vs año anterior" → "Mismo período del año pasado" |
| 5 | `builder/report-builder.component.html:125, 146, 171, 228` | Mostrar en español la granularidad (Día, Semana, Mes…), la función (Suma, Promedio, Conteo…) y el tipo (Tabla, Barras, Torta, Indicador…). El valor interno no cambia |
| 6 | `builder/report-builder.component.html:192, 235` | Estado vacío sin "filas, columnas y valores"; "N ms" → segundos |
| 7 | `builder/report-builder.component.ts:653` | Columna de comparación "(mes_anterior)" → "(mes anterior)". Solo el texto; la clave de `:652` no cambia |
| 8 | `builder/report-builder.component.ts:801, 862, 995` | Hojas "Graficas" → "Gráficas" y "Pivot" → "Tabla dinámica"; "Periodo" → "Período" |
| 9 | `home/dashboard-home.component.html:52, 75, 77` | Fuente y tipo en español ("Pedidos · Barras"), no "orders · table" |
| 10 | `home/dashboard-home.component.html:78` | `date:'short'` sale en formato de EE. UU. (no hay locale español fuera de cotizaciones) → `dd/MM/yyyy` |
| 11 | `home/dashboard-home.component.html:10, 28` | "Vista clásica" con un texto que la explique; estado vacío sin jerga |
| 12 | `home/preset-reports.ts:29-30, 47-48, 65-66, 86-87, 110-111, 128-129, 146-147` | Nombres y descripciones en lenguaje de negocio (`:146` → "¿Quién te debe y desde cuándo?"; `:30` sin "persistLines") |
| 13 | `home/preset-reports.ts:49, 67, 113, 130`; `home/dashboard-home.component.html:23, 37, 67-69, 71, 78, 107, 110, 120`; `builder/report-builder.component.html:30, 33, 36, 50, 60, 101, 117, 138, 160, 187, 191, 224-227` | Íconos de Font Awesome 5/6 → equivalentes de 4.7 (`bar-chart`, `line-chart`, `pie-chart`, `tachometer`, `file-excel-o`, `floppy-o`, `magic`…) |

**No son quick wins (van con la spec):**

- traducir "(sum)" en los encabezados que arma el backend (`firestore.engine.js:514, 526, 538`), porque rompe las fórmulas guardadas;
- ocultar las plantillas que la empresa no puede correr, porque cambia el comportamiento;
- las fechas rápidas;
- el nombre automático;
- el recorrido guiado.

Fuera de 1347 y del mismo tipo: el `#2563EB` del Excel (`report-builder.component.ts:743, 824, 866`) → `#5F3FE0`.

## Preguntas para Daniel

1. **Fecha por omisión de "ventas".** *Recomendado:* entrega, o creación si el pedido no tiene entrega (como el POS), que es tu estándar del 8-oct. Creación y factura quedan para elegir. El Dashboard y D-474 se alinean.
2. **Qué es "venta".** *Recomendado:* "Ventas" = valor guardado del pedido, con IVA y envío, sin los pedidos caídos. "Venta neta" = sin IVA ni envío. Los pedidos con valores raros (DAD-013863 en $1) van a "por revisar"; no se recalculan.
3. **Velocidad sin romper "Sin cache extra".** *Recomendado:* leer solo el período y sumar en origen. Resúmenes diarios precalculados solo si ALMARA no baja de 5 s, como excepción aprobada. Nunca guardar resultados.
4. **Costo para la rentabilidad.** *Recomendado:* el costo vigente en la fecha de la venta, del historial que alimentan compras y el cargue por Excel, sin tocar pedidos. "No confiable" si los productos sin costo pesan más del 5 % de la venta.
5. **Resumen del lunes.** *Recomendado:* correo y WhatsApp a quien lo active, apagado por omisión y dos semanas en sombra, en un solo mensaje con el de inventario. Los externos van después: solo el PDF y con aprobación del administrador.
