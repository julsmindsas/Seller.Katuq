## ADDED Requirements

<!-- F3 (ticket 1341). Estos requisitos se agregan a la capacidad `opttia-chat-answers` que propone D-474
     (openspec/changes/opttia-chat-katuq-preguntas-de-negocio). No crean otro chat ni otra consulta:
     usan el mismo chat de Opttia de Katuq y su consulta flexible de ventas. -->

### Requirement: Pregúntale a Opttia desde Reportes y el tablero
El sistema SHALL ofrecer en Reportes y en el tablero una caja "Pregúntale a Opttia" que abra el mismo chat de Opttia de Katuq con la pregunta ya escrita.

WHEN la respuesta trae cifras que se pueden graficar, el sistema SHALL mostrar con esas mismas cifras:
- un gráfico;
- una explicación de 2 o 3 frases;
- los botones "Guardar como reporte" y "Fijar en el tablero".

El guardado SHALL hacerlo la persona con el botón. Opttia SHALL NOT guardar, fijar ni programar nada por sí mismo.

#### Scenario: Pregunta con comparación
- **WHEN** el dueño escribe "¿cuánto vendí en bombones el mes pasado comparado con el anterior?"
- **THEN** Opttia responde con las dos cifras y la variación, muestra un gráfico con esas cifras y ofrece guardarlo o fijarlo

#### Scenario: Guardar la respuesta
- **WHEN** el dueño toca "Guardar como reporte"
- **THEN** queda un reporte guardado que, al abrirlo, da las mismas cifras para el mismo período

### Requirement: Opttia usa las métricas oficiales
Toda cifra de Opttia SHALL usar el diccionario de métricas de Reportes: la misma definición, la misma regla de pedidos que no cuentan, la misma fecha base y el mismo período anterior.

Con el mismo período y los mismos filtros, la cifra de Opttia SHALL ser igual a la del tablero y a la de un reporte.

#### Scenario: Venta del mes
- **WHEN** el dueño pregunta a Opttia la venta de septiembre y luego la ve en el tablero con el mismo período y la misma fecha base
- **THEN** las dos cifras son iguales, y Opttia dice qué fecha base usó

### Requirement: Preguntas ambiguas
IF una pregunta admite varias lecturas que cambian la cifra (fecha base, "el mes pasado" contra "los últimos 30 días", un producto con nombre parecido a otros), THEN Opttia SHALL proponer de 2 a 3 interpretaciones para que la persona elija. No SHALL gastar consultas en las demás antes de esa elección.

#### Scenario: Producto ambiguo
- **WHEN** la persona pregunta por "bombones" y existen "Bombones x6" y "Bombones x12"
- **THEN** Opttia pregunta si se refiere a uno, al otro o a los dos juntos

### Requirement: Rentabilidad en Opttia
WHERE la rentabilidad de Reportes esté disponible y el rol de la persona esté autorizado, Opttia SHALL responder utilidad y margen con las mismas cifras y la misma advertencia de calidad de datos.

IF el rol no está autorizado, THEN Opttia SHALL explicar la falta de permiso como en cualquier otro módulo.

Este requisito reemplaza, desde que salga la rentabilidad, el ejemplo de D-474 que trata el margen por costo como un dato que Katuq no guarda.

#### Scenario: Margen con costos incompletos
- **WHEN** una gerente autorizada pregunta el margen del mes y faltan costos por encima del umbral
- **THEN** Opttia da el margen marcado como "no confiable" y dice qué falta

#### Scenario: Vendedor pregunta el margen
- **WHEN** un vendedor pregunta "¿qué margen me dejan mis ventas?"
- **THEN** Opttia dice que su rol no tiene acceso a la rentabilidad y que lo pida a un administrador

### Requirement: Permisos en lo que se guarda desde Opttia
Un reporte o un bloque del tablero creado desde una respuesta de Opttia SHALL calcularse siempre con los permisos y el alcance de quien lo abre, no con los de quien lo guardó.

#### Scenario: Reporte compartido
- **WHEN** una gerente guarda desde Opttia un ranking de vendedores y un vendedor restringido lo abre
- **THEN** el vendedor ve solo su fila
