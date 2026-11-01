## ADDED Requirements

### Requirement: Consulta flexible de ventas
WHEN una persona con permiso de ver ventas hace en el chat de Opttia una pregunta de ventas que agrupa, filtra, ordena o compara, the system SHALL ofrecer una sola consulta de solo lectura que:
- agrupe hasta por dos de estos criterios: día, semana, mes, día de la semana, hora, vendedor, canal, tipo de pedido, estado, estado de pago, forma de pago, forma de entrega, ciudad, departamento, bodega, transportador, cupón, producto o categoría;
- calcule una o varias de estas medidas: ventas, pedidos, ticket promedio, unidades, descuentos, envíos cobrados y saldo por cobrar;
- filtre por cualquiera de esos criterios;
- ordene por cualquier medida y devuelva entre 1 y 50 filas.

#### Scenario: Mejor vendedor del mes
- **WHEN** un administrador pregunta "¿quién fue el mejor vendedor de septiembre?"
- **THEN** Opttia agrupa por vendedor del 1 al 30 de septiembre y responde con el primero, su total y su número de pedidos

#### Scenario: Canal que más vende
- **WHEN** la persona pregunta "¿qué canal vende más este mes?"
- **THEN** Opttia agrupa por canal y responde con el ranking de ventas de cada canal

#### Scenario: Filtro por un vendedor
- **WHEN** un administrador pregunta "¿cuánto vendió Laura la semana pasada?"
- **THEN** Opttia filtra por esa vendedora y responde su total, pedidos y ticket promedio de la semana pasada

#### Scenario: Productos con filtro
- **WHEN** la persona pregunta "¿qué productos se venden más en Medellín?"
- **THEN** Opttia agrupa por producto, filtra por la ciudad Medellín y responde unidades e ingresos por producto

#### Scenario: Cuándo se vende
- **WHEN** la persona pregunta "¿qué día de la semana vendemos más?" o "¿a qué hora entran más pedidos?"
- **THEN** Opttia agrupa por día de la semana o por hora en hora de Colombia

#### Scenario: Rol sin permiso de ventas
- **WHEN** la persona no tiene permiso de ver ventas
- **THEN** la consulta no está disponible para ella y Opttia no responde cifras de ventas

### Requirement: Comparación con el período anterior
WHEN la pregunta compara contra otro período ("¿cómo vamos frente al mes pasado?"), the system SHALL calcular en la misma consulta el período anterior del mismo largo y devolver, para el total y para cada fila, el valor anterior y la variación en porcentaje.

#### Scenario: Este mes contra el anterior
- **WHEN** la persona pregunta "¿cómo vamos este mes frente al mes pasado?"
- **THEN** Opttia responde ventas y pedidos de los dos períodos y la variación, con una sola consulta

#### Scenario: Período anterior sin ventas
- **WHEN** el período anterior no tiene ventas
- **THEN** la variación se informa como "sin ventas en el período anterior", no como un porcentaje infinito o cero

### Requirement: Mismas cifras que Katuq
The system SHALL contar con las mismas reglas que ya usa Katuq:
- **Ventas y pedidos:** como el Dashboard. Pedidos de la empresa por fecha de creación en hora de Colombia, sin cancelados, con el mismo total por pedido y el mismo vendedor por pedido.
- **Unidades e ingresos por producto o categoría:** como la consulta de productos más vendidos, sumando las líneas del pedido.

#### Scenario: Paridad con el Dashboard
- **WHEN** se consulta el mismo rango en Opttia y en el Dashboard con el mismo usuario
- **THEN** el total de ventas, el número de pedidos y las ventas de cada vendedor coinciden

#### Scenario: Paridad con productos más vendidos
- **WHEN** se agrupa por producto en el mismo rango que la consulta de productos más vendidos
- **THEN** las unidades y los ingresos de cada producto coinciden

#### Scenario: Pedido de noche
- **WHEN** un pedido se crea el 30 de septiembre a las 9 p. m. de Colombia
- **THEN** cuenta en el 30 de septiembre, aunque en hora universal ya sea 1 de octubre

#### Scenario: Pedido cancelado
- **WHEN** un pedido del rango está cancelado
- **THEN** no suma a ninguna medida, salvo que la persona pida explícitamente ver los cancelados

#### Scenario: Ventas por línea
- **WHEN** se agrupa o filtra por producto o categoría
- **THEN** la respuesta aclara que esas ventas suman las líneas de los productos, sin envío ni descuentos del pedido

### Requirement: Pedidos sin dato visibles
WHEN un pedido no tiene el dato por el que se agrupa (por ejemplo, pedidos de Shopify sin vendedor o pedidos sin ciudad), the system SHALL sumarlo en una fila "Sin <criterio>" separada y no atribuirlo a ninguna persona, canal o lugar.

#### Scenario: Pedidos de Shopify sin vendedor
- **WHEN** el rango incluye pedidos de Shopify sin asesor y se agrupa por vendedor
- **THEN** esos pedidos aparecen en "Sin vendedor asignado" y no como un vendedor más del ranking

### Requirement: Rango claro
The system SHALL usar los últimos 30 días cuando la pregunta no menciona fechas, y SHALL devolver siempre el rango usado para que Opttia lo diga en la respuesta.

#### Scenario: Pregunta sin fechas
- **WHEN** la persona pregunta "¿qué ciudad compra más?"
- **THEN** la respuesta dice que es de los últimos 30 días, con las fechas

### Requirement: Valores que no existen
IF un filtro no coincide con ningún valor del rango (por ejemplo, un vendedor mal escrito), THEN the system SHALL decirlo y devolver hasta cinco valores existentes parecidos, sin inventar cifras.

#### Scenario: Nombre mal escrito
- **WHEN** la persona pregunta por "Lora" y en el rango existe "Laura Gómez"
- **THEN** Opttia dice que no encontró "Lora" y pregunta si se refiere a Laura Gómez

### Requirement: Resultado parcial advertido
IF el rango tiene más pedidos que el tope de lectura de la consulta, THEN the system SHALL marcar el resultado como parcial y Opttia SHALL decirlo y sugerir un rango más corto.

#### Scenario: Empresa con muchos pedidos
- **WHEN** el rango supera el tope de lectura
- **THEN** la respuesta advierte que las cifras son parciales

### Requirement: Solo lectura y datos mínimos
The system SHALL calcular sin escribir en ninguna colección y SHALL NOT agrupar por cliente ni devolver nombres, documentos, correos, teléfonos o direcciones de compradores.

#### Scenario: Sin escrituras
- **WHEN** se ejecuta la consulta
- **THEN** no hay escrituras en Firestore

#### Scenario: Sin datos de compradores
- **WHEN** se devuelve cualquier agrupación
- **THEN** no incluye datos personales de compradores
