# Spec delta — inventory-insights

## ADDED Requirements

### Requirement: Una sola medida de demanda
El sistema SHALL calcular la demanda de cada producto con la misma regla en la pantalla de inteligencia de inventario, en "Qué comprar" y en el informe de indicadores: ventas reales netas de devoluciones de clientes.

#### Scenario: una devolución al proveedor no es demanda
- **WHEN** un producto tiene salidas por devolución al proveedor o por ajuste de bodega en la ventana
- **THEN** the system SHALL excluirlas de la demanda y de los días para agotarse

#### Scenario: la pantalla y "Qué comprar" coinciden
- **WHEN** un producto aparece como urgente en la pantalla de inteligencia
- **THEN** the system SHALL mostrarlo con el mismo consumo diario y la misma cobertura que "Qué comprar" para esa bodega

#### Scenario: salidas sin motivo reconocible
- **WHEN** hay salidas sin motivo reconocible en la ventana
- **THEN** the system SHALL decirlo en la pantalla y no presentar la cobertura como exacta

### Requirement: La IA no produce cifras
El sistema SHALL calcular con código toda cantidad, monto y número de días mostrados; la IA SHALL limitarse a ordenar, elegir una acción de una lista cerrada y redactar la frase.

#### Scenario: la IA nombra un producto que no estaba en la lista
- **WHEN** la respuesta de la IA incluye un producto que el código no le entregó
- **THEN** the system SHALL descartar ese elemento antes de mostrarlo

#### Scenario: la IA trae una cifra distinta a la calculada
- **WHEN** la frase de la IA contradice la cantidad o el monto calculados
- **THEN** the system SHALL mostrar la cifra calculada y no el texto de la IA

#### Scenario: Opttia no responde
- **WHEN** Opttia falla o tarda más del tiempo permitido
- **THEN** the system SHALL mostrar las listas calculadas sin la frase de la IA y avisar que el texto no está disponible

### Requirement: Qué comprar ya
El sistema SHALL mostrar los productos urgentes de "Qué comprar" con la cantidad calculada, las ventas en riesgo hasta que llegue el pedido y una frase del motivo.

#### Scenario: se agota antes de que llegue el pedido
- **WHEN** la cobertura de un producto es menor que los días de entrega de su proveedor
- **THEN** the system SHALL listarlo primero, con las ventas en riesgo estimadas y marcadas como estimación

#### Scenario: pasar a la orden
- **WHEN** la persona selecciona productos de la lista y confirma
- **THEN** the system SHALL llevarlos al flujo de órdenes de compra existente, sin crear la orden por sí solo

#### Scenario: empresa sin demanda registrada
- **WHEN** un producto no tiene demanda en la ventana
- **THEN** the system SHALL contarlo aparte y mostrar cuántos quedaron fuera por falta de datos

### Requirement: Capital parado con acción concreta
El sistema SHALL identificar el inventario dormido y el sobrestock, calcular la plata que libera, y asignar a cada producto una acción de la lista cerrada: trasladar, promocionar, liquidar o revisar.

#### Scenario: traslado posible
- **WHEN** otra bodega tiene cobertura menor que el umbral de urgencia para el mismo producto
- **THEN** the system SHALL permitir la acción "trasladar", con origen, destino y cantidad calculados

#### Scenario: traslado sin destino
- **WHEN** ninguna bodega necesita el producto
- **THEN** the system SHALL NOT proponer "trasladar" para ese producto

#### Scenario: costo desconocido
- **WHEN** un producto no tiene costo registrado
- **THEN** the system SHALL mostrar sus unidades, no inventar un monto, y contar cuántos productos faltan de costo

### Requirement: Avisos de anomalías
El sistema SHALL detectar con código un catálogo cerrado de anomalías de inventario, y la IA SHALL priorizarlas y explicarlas sin modificar datos.

#### Scenario: catálogo de detecciones
- **WHEN** existe stock negativo, salidas sin motivo, doble conteo legacy o ajustes manuales fuera del rango habitual de la empresa
- **THEN** the system SHALL listar cada caso con el producto, la bodega y la evidencia

#### Scenario: nada que avisar
- **WHEN** el código no detecta ninguna anomalía
- **THEN** the system SHALL decir que no hay avisos y no generar ninguno

#### Scenario: reparar
- **WHEN** la persona quiere corregir una anomalía
- **THEN** the system SHALL enviarla al flujo de diagnóstico y reparación existente, que audita y confirma

### Requirement: Una sola entrada y lecturas acotadas
El sistema SHALL reemplazar los dos análisis con IA actuales por una sola pantalla, y SHALL leer solo lo necesario por consulta.

#### Scenario: retiro de los análisis anteriores
- **WHEN** la pantalla nueva esté en producción
- **THEN** the system SHALL dejar de exponer los dos botones de análisis IA anteriores

#### Scenario: lecturas acotadas
- **WHEN** se calcula una consulta
- **THEN** the system SHALL leer el inventario y los movimientos una sola vez (no una vez por pantalla y otra por sugerencia), los productos solo cuando tienen inventario, y los movimientos solo de la ventana pedida

#### Scenario: tiempo de respuesta
- **WHEN** se consulta la empresa con más inventario
- **THEN** the system SHALL responder dentro del tiempo objetivo fijado tras medirlo en producción (pregunta abierta del diseño)

#### Scenario: aislamiento por empresa
- **WHEN** una persona abre la pantalla
- **THEN** the system SHALL calcular solo con datos de la empresa de su sesión

### Requirement: Inventario no modifica productos ni precios
El sistema SHALL NOT escribir productos, variantes, precios, listas de precios ni datos de Shopify en ninguna parte de esta capacidad.

#### Scenario: productos y precios intactos
- **WHEN** se ejecuta cualquier cálculo o análisis de esta capacidad
- **THEN** producto, variantes, precio y listas de precios SHALL permanecer sin cambios
