## ADDED Requirements

<!-- F3 (ticket 1341). Las alertas no tienen cálculo propio: reutilizan la Central de Abastecimiento
     (D-401), los insights de clientes y cartera (D-405), el tablero (metas) y la rentabilidad (F2), y
     salen por los mismos canales de los envíos programados. -->

### Requirement: Alertas configurables
El sistema SHALL permitir activar estas alertas, cada una con su umbral y su canal:
- **Ventas bajas:** ventas del día o de la semana por debajo de lo normal. Lo normal es el promedio del mismo día o de la misma semana en las últimas 4 semanas.
- **Cartera vencida:** un cliente o una factura que pasa de 30, 60 o 90 días de vencida.
- **Producto estrella por agotarse:** según su ritmo de venta.
- **Meta en riesgo:** cuando la proyección de cierre no alcanza la meta del mes.
- **Caída de margen** de un producto o de un canal, WHERE la rentabilidad esté disponible.

#### Scenario: Ventas bajas
- **WHEN** las ventas de un martes son 40 % menores que el promedio de los últimos 4 martes y el umbral es 30 %
- **THEN** se genera la alerta de ventas bajas con las dos cifras

### Requirement: Mismas cifras que los módulos
Cada alerta SHALL usar el cálculo del módulo dueño del dato y SHALL NOT tener una regla propia:
- **por agotarse:** la misma lista de la Central de Abastecimiento;
- **vencidas:** la misma cartera de tesorería;
- **meta en riesgo:** la misma proyección del tablero;
- **margen:** la rentabilidad de Reportes.

#### Scenario: Producto por agotarse
- **WHEN** llega la alerta de un producto por agotarse
- **THEN** ese producto también aparece como urgente en la Central de Abastecimiento ese mismo día

### Requirement: Cada alerta explica y lleva a actuar
Cada alerta SHALL decir:
- qué pasó, con la cifra;
- contra qué se compara.

También SHALL traer un enlace al detalle donde se actúa: cobrar, reponer o revisar el precio.

#### Scenario: Factura a 60 días
- **WHEN** una factura pasa de 60 días de vencida
- **THEN** la alerta dice el cliente, el valor y los días, y enlaza a la cartera para cobrar

### Requirement: Sin saturar
El sistema SHALL:
- agrupar las alertas en un solo mensaje por canal y por ventana de envío;
- no repetir la misma alerta mientras su situación no cambie;
- permitir silenciar una alerta o un tipo de alerta por un tiempo o del todo.

#### Scenario: Cinco alertas el mismo día
- **WHEN** en un día se generan cinco alertas para el mismo dueño
- **THEN** recibe un solo mensaje con las cinco

#### Scenario: Alerta silenciada
- **WHEN** el dueño silencia "ventas bajas" por una semana
- **THEN** no la recibe esa semana, y las demás siguen llegando

### Requirement: Alertas con permisos
Una alerta SHALL llegar solo a quien puede ver ese dato, con el alcance de su rol.

#### Scenario: Margen y vendedor
- **WHEN** se genera una alerta de caída de margen
- **THEN** no llega a ningún rol que no esté autorizado para ver la rentabilidad

### Requirement: Apagadas por omisión y medibles
Las alertas SHALL estar apagadas por omisión en cada empresa y SHALL pasar un período en sombra antes de enviarse.

El sistema SHALL registrar las alertas generadas, enviadas, silenciadas y abiertas, sin datos personales en el registro.

#### Scenario: Aceptación del ticket
- **WHEN** una semana corre con las alertas activas
- **THEN** el dueño recibe solo los avisos que requieren acción, agrupados, y cada uno lleva al detalle
