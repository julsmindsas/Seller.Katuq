## Purpose

Opttia, la IA de Katuq, dentro de la pantalla En vivo: resume en palabras lo que está pasando, responde preguntas sobre lo que se ve, narra en la escena y muestra lo que vendió el bot de WhatsApp. Lo hace sin datos de clientes y con un gasto acotado.

## ADDED Requirements

### Requirement: Resumen de Opttia
La pantalla SHALL mostrar un resumen escrito por Opttia: un titular y hasta 4 puntos con lo más importante del momento.
- En toda Katuq: cómo va contra ayer y la proyección, quién lidera, la alerta más grave con su sugerencia, quién está en racha, lo vendido con Opttia y los tiempos.
- En un comercio: cómo va contra ayer, qué despachar primero, qué mensajeros están libres, su mejor canal y lo que le armó Opttia.

El resumen MUST renovarse a lo sumo cada 15 minutos en toda Katuq y cada 30 minutos por comercio, y solo mientras haya pantallas abiertas. Todas las pantallas que miran lo mismo MUST compartir el mismo resumen. Si Opttia no responde, la pantalla MUST seguir funcionando y mostrar el último resumen o ninguno, sin error técnico.

#### Scenario: Diez pantallas de toda Katuq
- **WHEN** hay diez pantallas de toda Katuq abiertas durante una hora
- **THEN** se piden a Opttia a lo sumo 4 resúmenes en esa hora

#### Scenario: Opttia caído
- **WHEN** Opttia no responde en 20 segundos
- **THEN** la tarjeta queda con el último resumen y la hora en que se escribió, y el resto de la pantalla sigue en vivo

### Requirement: Preguntas a Opttia
La pantalla SHALL tener un campo para preguntarle a Opttia sobre lo que se ve, con preguntas sugeridas para cada vista. La respuesta MUST basarse solo en los datos de la pantalla y SHALL ofrecer las acciones que apliquen: abrir un tablero, una lista o la ficha de un pedido. Cada usuario MUST tener un tope de 20 preguntas por hora. Al pasarlo, la pantalla dice cuándo puede volver a preguntar.

#### Scenario: Qué despacho primero
- **WHEN** un comercio pregunta "¿Qué despacho primero?" y tiene pedidos listos para salir
- **THEN** Opttia nombra el pedido que lleva más tiempo listo y un mensajero libre, y ofrece abrir su ficha

#### Scenario: Pregunta 21
- **WHEN** un usuario hace su pregunta número 21 en la misma hora
- **THEN** no se llama a Opttia, y la pantalla dice en cuántos minutos puede volver a preguntar

### Requirement: Narración en la escena
La pantalla SHALL mostrar sobre la escena una línea de Opttia que cambia cada 9 segundos. La línea muestra los eventos notables: un pedido armado por Opttia, un cambio en los primeros puestos de la carrera, una alerta nueva, un comercio que vuelve a vender o el camino al récord. Cuando no hay eventos notables, muestra los puntos del último resumen. Las líneas de eventos MUST armarse con plantillas, sin llamar a Opttia. Durante "Repetir el día" la narración MUST callarse.

#### Scenario: Cambio en la carrera
- **WHEN** un comercio sube al segundo puesto
- **THEN** la narración dice que pasó al comercio que tenía adelante y en qué puesto va

### Requirement: Opttia en la escena
Opttia SHALL estar dentro de las escenas 3D (operación, país, Colombia y ciudad) como un orbe que se mueve solo.
- Cada 16 segundos MUST volar hasta lo siguiente de su lista y señalarlo con un anillo, un rayo y una burbuja con su sugerencia. La lista son los puntos de "Atención ahora" o del radar, el comercio en racha y lo vendido por WhatsApp. Si el pedido o el mensajero se mueve, el orbe lo sigue.
- **Recorrido:** al tocar el orbe o el botón "Recorrido con Opttia", la cámara MUST seguirlo por hasta 5 puntos, 8 segundos cada uno, con "1 de 5", y volver a su vista al final. Arrastrar la cámara, abrir una ficha o "Repetir el día" MUST cortarlo. En modo pantalla SHALL hacer un recorrido solo cada 4 minutos.
- **Respuestas:** cuando una respuesta trae una acción, Opttia SHALL volar hasta eso en la escena, y la respuesta SHALL ofrecer "Verlo en la escena".
- **Sus ventas:** cuando llega un pedido "Con Opttia", el orbe SHALL ir hasta donde llega, con un destello.
- En el muro y en el tablero de pedidos, que no son 3D, Opttia MUST marcar la tarjeta de lo que señala.

Los textos del orbe MUST salir del radar y del último resumen, sin llamar al modelo, y respetar "ocultar". Con "reducir movimiento", el orbe MUST ir sin vuelo ni vaivén.

#### Scenario: Pedido listo hace rato
- **WHEN** el pedido #1023 lleva 2 horas listo y Carlos está en bodega
- **THEN** el orbe va hasta la caja de #1023, la marca y dice "#1023 lleva 2 h 6 min listo para salir. Carlos está en bodega: asígnaselo."

#### Scenario: Recorrido de toda Katuq
- **WHEN** un usuario de Katuq toca el orbe
- **THEN** la cámara sigue a Opttia por cada comercio con alerta y el que está en racha, con su sugerencia en cada uno

### Requirement: Vendido con Opttia
La pantalla SHALL mostrar cuánto se vendió hoy en pedidos que nacieron de una cotización armada por el bot de WhatsApp de Opttia y que una persona confirmó. Esos pedidos MUST llevar la marca "Con Opttia" en la lista, en las escenas y en la ficha.

#### Scenario: Cotización del bot convertida en pedido
- **WHEN** una persona convierte en pedido una cotización que armó el bot de WhatsApp
- **THEN** el pedido nuevo llega como "Con Opttia" y suma en "Vendido con Opttia hoy"

### Requirement: Sin datos de clientes para la IA
Lo que se le envía a Opttia MUST ser solo cifras y nombres de comercios. En la vista de un comercio, se envían solo sus cifras, los números de sus pedidos y el primer nombre de sus mensajeros. MUST NOT enviarse nombres, teléfonos, direcciones, documentos ni correos de clientes, ni la pregunta de un usuario de otra empresa.

#### Scenario: Prueba del envío
- **WHEN** corre la prueba de contrato de lo que se envía a Opttia
- **THEN** falla si aparece algún campo de cliente
