## ADDED Requirements

### Requirement: Diccionario único de métricas
El sistema SHALL tener una sola definición, en lenguaje de negocio, de cada métrica que muestra.

Todas estas superficies SHALL usar esa definición:
- reportes;
- tablero;
- bienvenida;
- Opttia;
- informe ejecutivo;
- archivos exportados.

El diccionario SHALL definir al menos:
- Ventas;
- Venta neta;
- Pedidos;
- Pedidos que no cuentan;
- Ticket promedio;
- Unidades vendidas;
- Clientes nuevos;
- Clientes recurrentes;
- Saldo por cobrar;
- Cartera vencida;
- Días de vencimiento;
- Período anterior.

Definiciones (D-551): **Ventas** es el valor guardado del pedido, con IVA y envío, sin los pedidos que no cuentan. **Venta neta** es Ventas sin IVA ni envío.

#### Scenario: Misma venta en todas partes
- **WHEN** se consulta la venta de septiembre con el mismo período, la misma fecha base y los mismos filtros en el tablero, en un reporte, en el informe ejecutivo y en Opttia
- **THEN** las cuatro cifras son iguales

#### Scenario: Paridad con lo ya verificado
- **WHEN** se consulta ALMARA FELICIDAD de septiembre de 2026 por fecha de entrega, y por creación en los pedidos sin entrega
- **THEN** dan 1.334 pedidos, 52 que no cuentan y 1.282 válidos, las mismas cifras de la consola y del informe ejecutivo

### Requirement: Una sola regla de pedidos que no cuentan
El sistema SHALL usar una sola regla para decidir qué pedido no cuenta como venta: anulado, cancelado, rechazado o devuelto en el proceso, o cancelado, rechazado, fallido o reembolsado en el pago.

Cada resultado SHALL decir qué estados incluye y cuáles excluye.

#### Scenario: Cancelado en el pago
- **WHEN** un pedido tiene el proceso activo y el pago cancelado
- **THEN** no suma a Ventas en ninguna superficie

#### Scenario: Estados visibles
- **WHEN** la persona abre la definición de Ventas
- **THEN** ve la lista de estados que cuentan y de los que no cuentan

### Requirement: Fecha base elegible y en hora de Colombia
Cada resultado SHALL decir qué fecha usa: creación del pedido, entrega o factura. La persona SHALL poder cambiarla.

La fecha por omisión SHALL ser la de entrega o, si el pedido no tiene fecha de entrega, la de creación (D-551).

Todo corte por día, semana o mes SHALL hacerse en hora de Colombia.

#### Scenario: Pedido de noche
- **WHEN** un pedido se crea el 30 de septiembre a las 9 p. m., hora de Colombia
- **THEN** cuenta el 30 de septiembre y no el 1 de octubre

#### Scenario: Pedido de punto de venta
- **WHEN** se cuenta por fecha de entrega y un pedido de punto de venta no tiene fecha de entrega
- **THEN** cuenta por su fecha de creación, y la nota de la fecha base lo dice

### Requirement: Período anterior definido una vez
El período anterior SHALL calcularse así:
- si el rango es un mes calendario, completo o hasta hoy, son los mismos días del mes anterior;
- en cualquier otro caso, son los mismos días de largo inmediatamente antes.

#### Scenario: Mes en curso
- **WHEN** el 23 de octubre se compara "Este mes" contra el período anterior
- **THEN** se compara contra el 1 al 23 de septiembre

#### Scenario: Rango libre
- **WHEN** se compara el 10 al 16 de octubre
- **THEN** se compara contra el 3 al 9 de octubre

### Requirement: Valor guardado del pedido
El sistema SHALL contar cada pedido con su valor guardado, el mismo que usan el cobro y el informe ejecutivo. Ninguna pantalla SHALL recalcularlo a su manera.

IF un pedido tiene valores incoherentes (por ejemplo, un total de $1 con productos, un total que no es un número o lo pagado igual al doble del total o más), THEN el sistema SHALL contarlo con su valor guardado y listarlo en "Datos por revisar".

#### Scenario: Pedido con total de $1
- **WHEN** un pedido guarda un total de $1 y un anticipo de $88.000
- **THEN** aparece en "Datos por revisar" con su número y la diferencia

#### Scenario: Anticipo apenas por encima del total
- **WHEN** un pedido guarda un total de $111.201 y un anticipo de $121.200 (menos del doble)
- **THEN** se cuenta con su valor guardado y no aparece en "Datos por revisar"

#### Scenario: Anticipo del doble del total
- **WHEN** un pedido guarda un total de $93.200 y un anticipo de $186.400
- **THEN** aparece en "Datos por revisar" con su número y la diferencia de $93.200

### Requirement: Definición junto a cada cifra
Cada indicador y cada columna de medida SHALL tener un ícono (i) con su definición en una frase.

#### Scenario: Ícono de Venta neta
- **WHEN** la persona pasa el cursor o toca el (i) de Venta neta
- **THEN** lee la definición con lo que incluye y lo que excluye

### Requirement: Aviso cuando cambia una cifra guardada
WHEN la definición oficial cambia la cifra de un reporte guardado, el sistema SHALL avisarlo una vez, decir qué cambió (por ejemplo, "ya no cuenta pedidos cancelados") y permitir ver la diferencia.

#### Scenario: Reporte que bajó
- **WHEN** el dueño abre un reporte guardado que antes contaba cancelados
- **THEN** ve el aviso y la diferencia contra la cifra anterior

### Requirement: Cuadre con facturación
El sistema SHALL ofrecer una vista "Cuadre con facturación" que compare, mes por mes, la venta neta de Katuq con lo facturado electrónicamente. Si la empresa factura por un sistema contable conectado, también SHALL compararla con lo facturado allí.

La vista SHALL explicar la diferencia por causa, con los documentos de cada una:
- pedidos sin factura;
- facturas sin pedido;
- notas crédito;
- pedidos que no cuentan pero sí se facturaron;
- diferencias de valor.

La vista SHALL funcionar igual con cualquier proveedor de facturación.

WHERE la empresa no factura electrónicamente desde Katuq, la vista SHALL decirlo en vez de mostrar ceros.

#### Scenario: Mes que cuadra
- **WHEN** la venta neta de un mes y lo facturado coinciden
- **THEN** la vista lo dice con la cifra

#### Scenario: Mes con diferencia
- **WHEN** hay diferencia
- **THEN** la diferencia queda explicada línea por línea, y la suma de las causas da la diferencia total

### Requirement: Frescura de los datos
Cada reporte SHALL mostrar la fecha y la hora de los datos con que se calculó.

IF una sincronización que alimenta el reporte (tienda, sistema contable) lleva más del tiempo esperado sin correr, THEN el reporte SHALL avisarlo y decir desde cuándo.

#### Scenario: Sincronización atrasada
- **WHEN** la sincronización de facturas no corre desde hace dos días
- **THEN** el cuadre y los reportes de facturas muestran el aviso con la fecha de la última sincronización
