# Propuesta: IA de inventarios que entregue valor

> Estado: **APROBADA** (Daniel, 9-oct: "dale candela", con las cinco decisiones tal cual). Diseño y tareas escritos; falta su aprobación antes de implementar.

## Por qué

Hoy hay dos "análisis con IA" de inventario y ninguno le sirve a un comercio. Revisado en el código (no probado con datos reales):

1. **Central de Abastecimiento (botón IA).** Recibe listas que el código ya armó (20 críticos, 20 dormidos, 10 traslados, 5 de rotación) y devuelve un párrafo y tres frases sueltas. La "salud" la fija una regla del prompt, no la IA. Las frases no dicen qué producto ni cuánto, y no hay botón para actuar.
2. **Botón IA del catálogo de inventario.** Solo recibe totales por bodega (unidades, cuántos sin stock, cuántos con 5 o menos), sin una sola venta. Aun así pide "tendencia" y "días para agotarse", y el prompt fija esos días en 7, 14 o 30: son inventados.

Hay además un problema de fondo, **la IA parte de números distintos entre sí**:

- La Central cuenta como demanda **toda** salida de inventario. Eso incluye devoluciones al proveedor, ajustes y salidas de bodega que no son ventas.
- El informe de indicadores y "Qué comprar" (en producción desde agosto) cuentan solo demanda real: ventas netas de devoluciones de clientes, sin ruido de bodega.
- Resultado: la Central puede marcar "crítico" un producto que "Qué comprar" no sugiere, o al revés. Una IA que opina sobre números que el comercio no reconoce pierde la confianza.
- La Central también lee completos el inventario, los productos y los movimientos de salida de la ventana en cada clic, y la sugerencia de reposición vuelve a leer lo mismo por su lado.

## Qué cambia

**Principio: el código calcula, la IA prioriza y explica.** Toda cifra (cantidades, plata, días) sale de código determinista sobre **una sola medida de demanda**: la del informe de indicadores. La IA recibe una lista corta y ya ordenada, y devuelve la decisión en palabras del comercio. Lo que invente (un producto que no estaba en la lista, una cifra) se descarta antes de mostrarlo. Si Opttia no responde, la pantalla muestra igual las listas calculadas.

Cuatro piezas, en una sola pantalla que **reemplaza los dos botones actuales**:

1. **Qué comprar ya.** Los urgentes de "Qué comprar", con cantidad (del código), ventas en riesgo hasta que llegue el pedido y una frase de por qué. Pasa a la orden con el flujo que ya existe. La IA no cambia cantidades.
2. **Capital parado.** Dormidos y sobrestock, con la plata que se libera y una acción de una lista cerrada: trasladar, promocionar, liquidar o revisar. "Trasladar" solo aparece si otra bodega realmente lo necesita.
3. **Avisos de anomalías.** Un catálogo cerrado de detecciones por código (stock negativo, salidas sin motivo, doble conteo legacy, ajustes manuales fuera de lo normal). La IA las prioriza y las explica; no repara nada.
4. **Preguntarle a Opttia.** El chat que ya existe, con herramientas de solo lectura sobre el inventario de la empresa y preguntas sugeridas en la pantalla.

Y el **resumen semanal por correo**, cada lunes, con las mismas tres primeras piezas y el cambio frente a la semana anterior.

## Decisiones que necesito de Daniel

1. **Sin colecciones nuevas.** La configuración del resumen y el resumen de la semana anterior (para comparar) viven en el documento de la empresa, como la secuencia de activación. *Recomendado.* La alternativa es una colección propia, que requiere tu aprobación explícita.
2. **Correo primero.** WhatsApp exige plantilla aprobada por Meta y consentimiento del comercio: va como cambio aparte.
3. **Bandera por empresa, apagada por omisión, y dos semanas en sombra** (se calcula y se guarda, no se envía) para revisar con datos reales de ALMARA y Café Escobar antes de encender el envío.
4. **A quién le llega:** al dueño y a los administradores de la empresa que tengan correo, con enlace para dejar de recibirlo.
5. **Preguntarle a Opttia queda en solo lectura** en esta versión. Ajustar stock por chat es otra decisión.

## Write-set (inventario)

Esta propuesta **no escribe** `products`, variantes, precios, listas de precios ni Shopify. Lee `inventory`, `inventoryMovement`, `products`, `warehouses` y órdenes de compra. Escribe únicamente el estado del resumen semanal en el documento de la empresa. Cada tarea de código lleva un contract test que falla si algo escribe fuera de ese alcance.

## No-goals

- No cambia el cálculo de "Qué comprar", ni crea órdenes sin que una persona las confirme.
- No repara inconsistencias: la reparación sigue siendo el flujo existente, con auditoría y confirmación.
- No agrega WhatsApp, alertas inmediatas ni escritura por chat.
- No llama a modelos directos ni usa Genkit: todo va por Opttia (una pasada de prompt a JSON, y el chat por el ADK).
- No agrega capas de caché: se reducen las lecturas completas en origen.

## Riesgos

- **Módulo sensible (inventario):** todo es lectura salvo el estado del resumen. La normalización de `productoId` y la deduplicación (doble conteo) deben usarse en cada suma; hay contract test.
- **Comercios sin demanda registrada** (OH MY STORE: 30 productos con demanda sobre 13.350 filas de inventario): verán pocas sugerencias. La pantalla y el correo dicen cuántos productos quedaron fuera por falta de datos, en vez de inventar.
- **Costo desconocido:** hay empresas con miles de productos sin costo; la plata liberable solo se calcula con costo conocido y se avisa cuántos faltan.
- **Costo y límites de IA:** un resumen semanal es una llamada por empresa; solo corre en empresas con la bandera. El chat consume el cupo de mensajes del plan.
- **Correo a comercios reales:** por eso la sombra previa y la baja con un clic. Hoy el dominio de correo falla DMARC; se reporta, no se arregla aquí.

## Impact

- **Backend:** una función única de "lo que importa en el inventario" que reusa el informe de indicadores y la sugerencia de reposición; se retiran los dos análisis actuales; una herramienta MCP de solo lectura para el chat; un cron semanal (con el registro de crones configurable que ya existe).
- **Frontend:** la pantalla de Central de Abastecimiento con tema canónico (plano, acento `#5F3FE0`); se quita el botón IA del catálogo; chips de preguntas hacia el chat de Opttia.
- **No cambia:** inventario transaccional, pedidos, consecutivos, Shopify, precios.

## Capabilities

- `inventory-insights` — medida única de demanda; qué comprar, capital parado y anomalías con IA verificada.
- `inventory-ask` — preguntas de inventario a Opttia, solo lectura.
- `inventory-weekly-digest` — resumen semanal por correo, en sombra y con bandera.
