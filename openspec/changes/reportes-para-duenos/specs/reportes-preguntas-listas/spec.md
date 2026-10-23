## ADDED Requirements

### Requirement: Inicio "¿Qué quieres saber hoy?"
El inicio de Reportes SHALL mostrar tarjetas por tema: Ventas, Productos, Clientes, Cartera, Inventario, Canales y Vendedores. Cada tarjeta SHALL traer preguntas listas que se responden con un clic.

Las preguntas listas SHALL incluir al menos estas:
- ¿Cuánto vendí este mes vs. el mes pasado?
- ¿Qué productos se venden más y cuáles no se mueven?
- ¿Quién me debe y desde cuándo?
- ¿Qué canal o vendedor vende más?
- ¿Qué clientes dejaron de comprar?
- ¿Qué días y horas vendo más?
- ¿Qué productos debo reponer?

#### Scenario: Pregunta de un clic
- **WHEN** el dueño toca "¿Cuánto vendí este mes vs. el mes pasado?"
- **THEN** ve las ventas de los dos períodos, la variación y un gráfico, sin configurar nada

### Requirement: La misma respuesta que el módulo dueño del dato
Cada pregunta lista SHALL dar la misma respuesta que la pantalla de Katuq dueña de ese dato:
- reponer y productos que no se mueven: la Central de Abastecimiento;
- clientes que dejaron de comprar: los clientes en alerta del módulo de clientes;
- quién me debe: la cartera de tesorería, con el mismo total;
- ventas, canales, vendedores, días y horas: el diccionario de métricas.

#### Scenario: Cartera
- **WHEN** el dueño toca "¿Quién me debe y desde cuándo?"
- **THEN** el total coincide con el de la pantalla de Cartera del mismo día

#### Scenario: Productos sin integración contable
- **WHEN** una empresa sin sistema contable conectado toca "¿Qué productos se venden más?"
- **THEN** la respuesta sale de los pedidos de Katuq y coincide con "productos más vendidos" del mismo período

### Requirement: Temas según permisos y datos disponibles
IF el rol de la persona no puede ver un tema, THEN ese tema SHALL decir qué permiso falta y SHALL NOT mostrar cifras.

IF la empresa no tiene los datos que exige una pregunta (por ejemplo, cartera sin facturas registradas), THEN la pregunta SHALL decir qué se necesita para responderla.

El alcance "cada vendedor ve solo sus métricas" SHALL aplicarse a toda pregunta de ventas.

#### Scenario: Vendedor
- **WHEN** un vendedor con "solo sus métricas" toca "¿Qué canal vende más?"
- **THEN** la respuesta cuenta solo sus pedidos y lo dice

#### Scenario: Rol sin cartera
- **WHEN** una persona sin permiso de cartera entra a Reportes
- **THEN** la tarjeta Cartera dice que su rol no tiene acceso y que lo pida a un administrador

### Requirement: Asistente de tres pasos
El sistema SHALL ofrecer, para un reporte nuevo, un asistente de tres pasos con vista previa en vivo:
1. **¿Qué quieres medir?** Ventas en $, Unidades, Pedidos, Ticket promedio o Saldo por cobrar. Margen solo WHERE la rentabilidad esté disponible y el rol esté autorizado.
2. **¿Cómo lo quieres ver?** Por día, semana o mes, producto, categoría, cliente, vendedor, canal o ciudad.
3. **¿De qué período?** Las fechas rápidas y la comparación.

El sistema SHALL recomendar el tipo de gráfico, y la persona SHALL poder cambiarlo.

#### Scenario: Aceptación del ticket
- **WHEN** un dueño sin capacitación quiere "ventas del mes por producto, comparado con el mes anterior"
- **THEN** lo obtiene en menos de un minuto con el asistente

#### Scenario: Recomendación de gráfico
- **WHEN** la persona elige "Ventas en $" por mes
- **THEN** el asistente propone líneas, y la persona puede cambiar a barras

### Requirement: Lectura en palabras
Debajo de cada resultado, el sistema SHALL mostrar una lectura de dos o tres frases con lo más importante: total, variación, el primero del ranking y lo que más creció.

Cada cifra de la lectura SHALL estar en el resultado. IF falta el dato para comparar, THEN la lectura SHALL decirlo y SHALL NOT inventarlo.

#### Scenario: Lectura del mes
- **WHEN** se ven las ventas de octubre por producto y canal
- **THEN** la lectura dice, por ejemplo, "Vendiste $41,4 M, 12 % más que el mes anterior. Bombones fue el producto #1 y Almara Online el canal que más creció", y cada cifra coincide con la tabla

### Requirement: Constructor como "Modo avanzado"
El constructor de hoy SHALL quedar como "Modo avanzado", al que se entra con un botón desde el inicio de Reportes.

Los reportes ya guardados SHALL abrir y calcular igual que antes.

#### Scenario: Reporte viejo
- **WHEN** se abre un reporte guardado antes del cambio
- **THEN** abre en "Modo avanzado" con la misma configuración y las mismas cifras

### Requirement: Plantillas por tipo de negocio
El sistema SHALL ofrecer paquetes de plantillas por tipo de negocio que el comercio puede activar o desactivar: tienda de regalos, retail, restaurante y distribuidora.

#### Scenario: Activar un paquete
- **WHEN** un restaurante activa su paquete
- **THEN** ve en el inicio las preguntas de ese paquete, además de las generales

### Requirement: Guardar o fijar una respuesta
Cualquier respuesta (pregunta lista o asistente) SHALL poder guardarse como reporte o fijarse en el tablero con un clic.

#### Scenario: Fijar en el tablero
- **WHEN** el dueño toca "Fijar en el tablero" en una respuesta
- **THEN** la respuesta aparece en su tablero con el mismo período relativo (por ejemplo, "este mes")
