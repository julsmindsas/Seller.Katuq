## ADDED Requirements

### Requirement: Opttia propone y la persona aprueba en la escena
Cuando el comercio tiene alguna operación de Opttia en sombra o encendida y hay trabajo pendiente, la pantalla del comercio SHALL mostrar las propuestas de Opttia dentro de la escena, en Mi operación, Mi país y Pedidos.
- **Operaciones:** despachar está en `despachos-en-vivo`. Arrancar producción, cobrar pedidos sin pago y la bandera de cada operación están en `operaciones-de-opttia`.
- **Cola:** SHALL ordenarse por prioridad (urgente, importante, cuando puedas), luego por hora límite y luego por valor. Se muestra una tarjeta a la vez.
- **Contador:** el botón del orbe SHALL contar las ideas, por ejemplo "Opttia tiene 3 ideas · 1 urgente". Su halo late dos veces cuando llega algo nuevo.
- **Arranque:** la primera propuesta SHALL arrancar sola, salvo que la persona esté arrastrando la cámara, tenga una ficha abierta o haya aprobado algo en los últimos 8 segundos.
- **Ensayo:** el orbe SHALL volar a lo que toca y la escena SHALL ensayar la propuesta con copias fantasma, anillos y líneas punteadas. El resto de las cajas baja al 40 %. Las cajas reales MUST NOT moverse, y los eventos en vivo siguen animándose encima.
- **Tarjeta:**
  - eyebrow, por ejemplo "OPTTIA PROPONE · 1 DE 3 · URGENTE";
  - título y razón;
  - frase de Opttia, opcional;
  - efectos reales de aprobar;
  - botones Aprobar, Ajustar y Después, y en el menú, "No hoy".
- **Quién arma qué:** las acciones, los pedidos, las cifras y los efectos MUST salir de los datos. Opttia solo redacta la frase.
- **Resultado:** lo que pasó después de aprobar SHALL animarse solo con los eventos reales del canal en vivo.
- **Siguiente:** cuando termina, la tarjeta SHALL pasar sola a la siguiente propuesta a los 2 segundos, con Aprobar bloqueado durante 1,5 segundos.
- **Doble vía:** pasar el puntero por un grupo SHALL resaltar su montón, y tocar un montón en la escena SHALL enfocar su fila en la tarjeta.
- **Sin escena 3D:** sin WebGL, la tarjeta SHALL funcionar sola y listar los números de pedido. Con "reducir movimiento", los fantasmas MUST NOT volar: solo se ven anillos y líneas.

#### Scenario: Llega con tres ideas
- **WHEN** la persona abre Mi operación y la cola tiene 3 propuestas, una urgente
- **THEN** el botón del orbe dice "Opttia tiene 3 ideas · 1 urgente" y la tarjeta de la urgente se abre sola con su ensayo

#### Scenario: Recorrido automático
- **WHEN** el orbe recorre la escena por su cuenta con una propuesta abierta
- **THEN** nada se aprueba; aprobar exige el toque y la confirmación de una persona

### Requirement: Propuestas sin ruido
Mientras haya propuestas en la cola, la pantalla SHALL evitar el ruido con estas reglas:
- **Urgente que llega después:** SHALL subir el contador y entrar de siguiente, sin quitarle la tarjeta a la persona.
- **Nadie toca nada:** si pasan 45 segundos sin tocar nada, el ensayo SHALL retirarse y solo queda el contador. Tocar el botón del orbe vuelve a ensayar.
- **"Después":** SHALL posponer la propuesta 30 minutos para esa persona.
- **"No hoy":** SHALL ocultarla en ese navegador hasta que cambie su huella.
- **Cola vacía:** SHALL decir "Todo al día. Te aviso si sale algo".
- **Saludo:** SHALL salir una sola vez, con plantilla, por ejemplo "Buenos días: 3 para hoy, 1 urgente". Si hay algo urgente y el sonido está prendido, suena un tono suave una vez.
- **Señales sin operación:** las que no traen una operación siguen en la ronda normal del orbe, sin tarjeta.
- **Teclado y lectores de pantalla:**
  - ← y → recorren la cola;
  - Enter aprueba, también en dos pasos;
  - Esc es "Después";
  - el foco SHALL verse;
  - el lector de pantalla SHALL anunciar solo la llegada de una propuesta nueva.

#### Scenario: Llega algo urgente mientras la persona mira
- **WHEN** la persona revisa una propuesta importante y llega una urgente
- **THEN** el contador sube y la urgente queda de siguiente; la tarjeta abierta no cambia

### Requirement: Quién ve las propuestas
Cuando la pantalla pide propuestas, el servidor y la pantalla SHALL limitarlas así:
- **Empresa:** las propuestas SHALL calcularse siempre con la empresa de la sesión, nunca con un parámetro de la pantalla.
- **Quién no las ve:** MUST NOT verlas:
  - Katuq mirando otro comercio;
  - una sesión de solo lectura;
  - un vendedor que solo ve lo suyo (D-349);
  - un comercio con Opttia apagado.
- **Quién decide:** el servidor SHALL decidir, en cada propuesta, si la persona puede aprobarla.
- **Sin error:** cuando la función no aplica, la pantalla SHALL seguir sin error y sin avisos de suscripción.
- **Gasto:** las propuestas de un comercio SHALL compartirse entre sus pantallas por un tiempo corto. La pantalla SHALL pedirlas solo con la escena visible: después de eventos que las afecten, con espera, y como respaldo cada 5 minutos.
- **Televisor:** el ensayo se ve, pero sin botones (ocultos), con "Apruébalo desde tu celular" y respetando "ocultar". Pide a lo sumo cada 5 minutos. Cuando llega una salida aprobada en otro dispositivo, muestra "Aprobado desde el celular".

#### Scenario: Katuq mira otro comercio
- **WHEN** personal de Katuq abre el tablero de otro comercio en solo lectura
- **THEN** no hay tarjeta ni contador, y no se piden propuestas

## MODIFIED Requirements

### Requirement: Opttia en la escena
Opttia SHALL estar dentro de las escenas 3D (operación, país, Colombia y ciudad) como un orbe que se mueve solo.
- **Ronda:** cada 16 segundos MUST volar hasta lo siguiente de su lista y señalarlo con un anillo, un rayo y una burbuja con su sugerencia. La lista son los puntos de "Atención ahora" o del radar, el comercio en racha y lo vendido por WhatsApp. Si el pedido o el mensajero se mueve, el orbe lo sigue.
- **Propuesta:** mientras haya una propuesta en la tarjeta (requisito "Opttia propone y la persona aprueba en la escena"), el orbe SHALL quedarse señalándola sin soltarla solo, y la ronda se pausa. Cortar el recorrido o arrastrar la cámara MUST NOT retirar la propuesta.
- **Recorrido:** al tocar el orbe o el botón "Recorrido con Opttia", la cámara MUST seguirlo por hasta 5 puntos, 8 segundos cada uno, con "1 de 5", y volver a su vista al final. Arrastrar la cámara, abrir una ficha o "Repetir el día" MUST cortarlo. En modo pantalla SHALL hacer un recorrido solo cada 4 minutos, y le dedica unos 20 segundos a cada propuesta.
- **Respuestas:** cuando una respuesta trae una acción, Opttia SHALL volar hasta eso en la escena, y la respuesta SHALL ofrecer "Verlo en la escena".
- **Sus ventas:** cuando llega un pedido "Con Opttia", el orbe SHALL ir hasta donde llega, con un destello.
- **Muro y tablero de pedidos:** como no son 3D, Opttia MUST marcar la tarjeta de lo que señala, también las de los pedidos de la propuesta.

Los textos del orbe MUST salir del radar, del último resumen o de la propuesta, sin llamar al modelo, y respetar "ocultar". Con "reducir movimiento", el orbe MUST ir sin vuelo ni vaivén.

#### Scenario: Pedido listo hace rato
- **WHEN** el pedido #1023 lleva 2 horas listo, Carlos está en bodega y no hay propuesta abierta
- **THEN** el orbe va hasta la caja de #1023, la marca y dice "#1023 lleva 2 h 6 min listo para salir. Carlos está en bodega: asígnaselo."

#### Scenario: Propuesta abierta
- **WHEN** la tarjeta propone el grupo de Carlos y pasan 16 segundos
- **THEN** el orbe sigue sobre el grupo de Carlos y no salta al siguiente punto de la ronda

### Requirement: Narración en la escena
La pantalla SHALL mostrar sobre la escena una línea de Opttia que cambia cada 9 segundos.
- **Qué muestra:** los eventos notables: un pedido armado por Opttia, un cambio en los primeros puestos de la carrera, una alerta nueva, un comercio que vuelve a vender o el camino al récord. Cuando no hay eventos notables, muestra los puntos del último resumen.
- **Sin modelo:** las líneas de eventos MUST armarse con plantillas, sin llamar a Opttia.
- **Cuándo calla:** MUST callarse durante "Repetir el día" y mientras haya una tarjeta de Opttia a la vista.

#### Scenario: Cambio en la carrera
- **WHEN** un comercio sube al segundo puesto
- **THEN** la narración dice que pasó al comercio que tenía adelante y en qué puesto va

#### Scenario: Tarjeta abierta
- **WHEN** hay una tarjeta de Opttia a la vista y llega un evento notable
- **THEN** la narración no lo dice mientras la tarjeta siga abierta
