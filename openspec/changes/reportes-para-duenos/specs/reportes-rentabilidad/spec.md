## ADDED Requirements

### Requirement: Métricas de rentabilidad
El diccionario de métricas SHALL agregar estas definiciones:
- **Costo de lo vendido:** suma de unidades vendidas por costo unitario, con el método de costo vigente.
- **Utilidad bruta:** venta neta menos costo de lo vendido.
- **Margen bruto (%):** utilidad bruta dividida por venta neta.
- **Margen después de descuentos y cupones:** el margen calculado sobre lo que efectivamente se cobró después de descuentos y cupones.

Las cifras SHALL cuadrar: en cualquier agrupación, la suma de la utilidad bruta de las filas SHALL dar la utilidad bruta total.

#### Scenario: Cuadre del mes
- **WHEN** con costos cargados el dueño ve el margen bruto del mes por producto y por canal
- **THEN** el total es la venta neta menos el costo de lo vendido, y coincide en las dos agrupaciones

### Requirement: Rentabilidad en todas las vistas
La rentabilidad SHALL estar disponible por producto, categoría, combo, cliente, canal, vendedor, sede y período, en el constructor, en las preguntas listas y en el tablero.

#### Scenario: Por vendedor
- **WHEN** la gerente agrupa la utilidad bruta del mes por vendedor
- **THEN** ve la utilidad y el margen de cada vendedor, y la suma da el total

### Requirement: Plantillas de rentabilidad
El sistema SHALL ofrecer estas plantillas:
- ¿Qué productos me dejan más plata?
- Productos que vendo mucho pero con poco margen.
- ¿Qué canal es más rentable?
- Impacto de los descuentos en mi margen.

WHERE las comisiones de pasarela o de marketplace estén registradas, "¿Qué canal es más rentable?" SHALL restarlas. IF no lo están, THEN SHALL decirlo.

#### Scenario: Canal sin comisiones registradas
- **WHEN** el dueño abre "¿Qué canal es más rentable?" y no hay comisiones registradas
- **THEN** ve el margen por canal y la nota de que no incluye comisiones

### Requirement: Costo de combos y adiciones
El costo de un combo SHALL ser la suma del costo de los productos que lo forman, por su cantidad.

Las adiciones SHALL sumar su propio costo a la línea donde se vendieron.

#### Scenario: Combo
- **WHEN** se vende un combo de 2 productos de costo $5.000 y $3.000
- **THEN** el costo de lo vendido de esa línea es $8.000 por combo

### Requirement: Método de costo explícito
El sistema SHALL usar un método de costo único, fijado en D-XXX, y SHALL mostrarlo en la definición de cada cifra de rentabilidad.

Recomendado: el costo vigente del producto en la fecha de la venta, según el historial de costos que alimentan las compras y el cargue de costos.

Un cambio de costo posterior a la venta SHALL NOT cambiar la rentabilidad de ventas ya hechas.

#### Scenario: Costo que cambia
- **WHEN** el costo de un producto sube el 10 de octubre
- **THEN** las ventas del 1 al 9 se calculan con el costo anterior, y las del 10 en adelante con el nuevo

### Requirement: Calidad de los datos de costo
Junto a toda cifra de rentabilidad, el sistema SHALL mostrar qué porcentaje de la venta neta del período corresponde a productos sin costo cargado. También SHALL ofrecer la lista de esos productos, ordenada por venta, con acceso para completarlos.

IF los productos sin costo superan el umbral de D-XXX (recomendado: 5 % de la venta neta), THEN la rentabilidad SHALL marcarse como "no confiable". En ese caso SHALL NOT presentarse como cifra definitiva en el tablero, en Opttia ni en los envíos.

#### Scenario: Faltan costos
- **WHEN** el 12 % de la venta del mes es de productos sin costo
- **THEN** el margen aparece como "no confiable: falta el costo de 34 productos que suman el 12 % de la venta", con la lista

#### Scenario: Costos completos
- **WHEN** todos los productos vendidos tienen costo
- **THEN** el margen se muestra sin advertencia

### Requirement: Rentabilidad solo para roles autorizados
La rentabilidad (costo, utilidad y margen) SHALL verse solo en los roles autorizados, con la misma regla que ya decide quién ve el margen de las cotizaciones.

Para los demás roles, el sistema SHALL quitarla de reportes, tablero, exportes, enlaces compartidos y respuestas de Opttia.

#### Scenario: Vendedor
- **WHEN** un vendedor abre un reporte guardado que incluye margen
- **THEN** no ve las columnas de costo, utilidad ni margen, y el reporte le avisa que su rol no las incluye

### Requirement: Solo lectura
El cálculo de rentabilidad SHALL NOT escribir en productos, costos, precios, listas de precios, pedidos ni inventario.

#### Scenario: Sin escrituras
- **WHEN** se calcula la rentabilidad de un período
- **THEN** producto, variantes, precio, costo y listas de precios quedan sin cambios, y no hay escrituras en pedidos ni en inventario
