## ADDED Requirements

### Requirement: Pregunta NPS dentro del Seller, sin bloquear
Cuando un usuario elegible entra al Seller, el sistema SHALL mostrarle una tarjeta con la pregunta "Del 0 al 10, ¿qué tan probable es que le recomiendes Katuq a otro negocio?" y once opciones del 0 al 10. La tarjeta SHALL NOT bloquear la pantalla ni impedir seguir trabajando.

La tarjeta SHALL NOT aparecer:
- en páginas públicas (login, registro, contraseñas, términos, resultados de pago, encuestas públicas);
- en la misma visita en que se muestra una novedad.

#### Scenario: Usuario elegible entra al Seller
- **WHEN** un usuario elegible entra a una pantalla interna y no tiene novedades pendientes
- **THEN** ve la tarjeta y puede seguir usando la pantalla sin responder

#### Scenario: Hay una novedad pendiente
- **WHEN** al usuario le toca ver una novedad
- **THEN** la tarjeta no aparece en esa visita

### Requirement: Segunda pregunta según la nota
Al escoger una nota, el sistema SHALL registrarla de inmediato y mostrar una pregunta abierta opcional según la nota:
- 0 a 6: "¿Qué es lo primero que deberíamos arreglar?";
- 7 u 8: "¿Qué nos falta para que nos des un 10?";
- 9 o 10: "¿Qué es lo que más te sirve de Katuq?".

El comentario SHALL ser opcional y de máximo 1.000 caracteres. Al enviarlo o cerrar, la tarjeta SHALL agradecer y desaparecer.

#### Scenario: Responde la nota y cierra sin comentar
- **WHEN** el usuario escoge 8 y cierra la tarjeta sin escribir
- **THEN** la nota 8 queda registrada como respuesta completa, sin comentario

### Requirement: El detractor abre un ticket de soporte
Cuando un comercio responde con nota de 0 a 6, el sistema SHALL abrir un solo ticket de soporte por el mismo camino que usan la app de Support y el MCP. El ticket SHALL llevar:
- la nota y el comentario, si lo hay;
- la empresa, el usuario, su rol, su plan y la pantalla;
- la marca de que viene de la encuesta;
- prioridad alta.

La respuesta SHALL quedar enlazada al ticket. Si el usuario no termina el segundo paso, el ticket SHALL abrirse igual con lo que haya.

#### Scenario: Detractor con comentario
- **WHEN** un comercio responde 4 y escribe "la factura con SIIGO falla cada semana"
- **THEN** se abre un ticket con la nota 4, ese texto, la empresa y su plan, y aparece en el tablero del equipo con los avisos de siempre

#### Scenario: Detractor que cierra la pestaña
- **WHEN** un comercio responde 2 y cierra el navegador sin comentar
- **THEN** el ticket se abre igual con la nota, sin comentario, a más tardar en su siguiente visita al Seller, y nunca hay dos tickets por la misma respuesta

#### Scenario: Promotor
- **WHEN** un comercio responde 9
- **THEN** no se abre ningún ticket

### Requirement: A quién se le pregunta
El sistema SHALL considerar elegible a un usuario solo si:
- su empresa lleva al menos 14 días desde el registro;
- su empresa no es Julsmind ni FLORECER, salvo en la etapa "solo internos";
- su empresa no está excluida de métricas;
- su empresa confirmó su correo;
- el usuario no es Super Administrador.

#### Scenario: Empresa recién registrada
- **WHEN** entra un usuario de una empresa registrada hace 5 días
- **THEN** no ve la tarjeta

### Requirement: Cadencia por usuario
El sistema SHALL preguntar a cada usuario como máximo una vez cada 90 días, contados desde su última respuesta.

"Ahora no", o cerrar la tarjeta sin escoger nota, SHALL posponer la pregunta 7 días. Tras dos posposiciones en el mismo ciclo, SHALL esperar al siguiente ciclo.

La cadencia SHALL valer en cualquier navegador o dispositivo.

#### Scenario: Respondió hace 30 días
- **WHEN** un usuario que respondió hace 30 días entra desde otro computador
- **THEN** no ve la tarjeta

#### Scenario: Pospone dos veces
- **WHEN** toca "Ahora no" dos veces en el mismo ciclo
- **THEN** no vuelve a ver la tarjeta hasta el siguiente ciclo de 90 días

### Requirement: Lo que se registra
Cada respuesta SHALL guardar:
- la nota y el comentario;
- el comercio que respondió, el usuario y su rol;
- el plan de la empresa al responder;
- la pantalla y la fecha.

#### Scenario: Comparar por plan
- **WHEN** una empresa pasa de plan gratis a premium después de responder
- **THEN** esa respuesta sigue contando como del plan gratis

### Requirement: Encendido por etapas
El sistema SHALL permitir tres estados sin cambiar código: apagada, solo internos (Julsmind y FLORECER, sin la espera de 14 días, sin contar en el NPS ni abrir tickets) y todos.

#### Scenario: Apagada
- **WHEN** el estado es "apagada"
- **THEN** nadie ve la tarjeta y no se registra nada
