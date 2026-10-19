## ADDED Requirements

### Requirement: Una pregunta por ciclo, por varios canales
Mientras un usuario elegible tenga la pregunta del ciclo sin responder, el sistema SHALL presentarla por los canales de este documento. Cuando el usuario responda en cualquiera de ellos, el sistema SHALL cerrar el ciclo y dejar de presentarla en todos.

#### Scenario: Responde por correo
- **WHEN** un administrador responde 8 desde el correo
- **THEN** al entrar al Seller ya no ve la ventana ni las tarjetas hasta el siguiente ciclo

### Requirement: Ventana al entrar
Cuando un usuario elegible entre al Seller y su ciclo no haya mostrado todavía la ventana, el sistema SHALL mostrar una ventana con la pregunta, la escala del 0 al 10 y el botón "Ahora no". La ventana SHALL salir una sola vez por ciclo, aunque el usuario la cierre sin responder.

#### Scenario: Primera vez del ciclo
- **WHEN** a un usuario le empieza el ciclo y entra al Seller
- **THEN** ve la ventana una vez; si la cierra, no vuelve a salir en ese ciclo

### Requirement: Tarjeta en Inicio
Mientras la pregunta esté pendiente y no pospuesta, el sistema SHALL mostrar en la página de inicio una tarjeta dentro de la página, que no flota ni tapa contenido, con la misma escala y la misma segunda pregunta de D-483.

#### Scenario: Cerró la ventana
- **WHEN** un usuario cierra la ventana sin responder y luego va a Inicio
- **THEN** ve la tarjeta con la pregunta dentro de la página

### Requirement: Tarjeta flotante cerrada
En las demás pantallas internas, mientras la pregunta esté pendiente y no pospuesta, el sistema SHALL mostrar un botón pequeño, "Califica a Katuq", que al tocarlo abre la tarjeta de D-483. Cerrado, SHALL NOT tapar contenido.

#### Scenario: Pantalla de pedidos
- **WHEN** un usuario con la pregunta pendiente trabaja en Todos los pedidos
- **THEN** ve solo el botón pequeño, y la tarjeta se abre cuando lo toca

### Requirement: Correo al administrador
Cuando un usuario de la familia Administrador de una empresa elegible cumpla 3 días con la pregunta del ciclo sin responder, el sistema SHALL enviarle un solo correo por ciclo con la pregunta y un enlace por cada nota del 0 al 10.

Si el administrador no entra al Seller, el sistema SHALL abrirle el ciclo y enviarle el correo cuando le toque: a los 14 días del registro de su empresa y luego cada 90 días.

El sistema SHALL enviar como máximo 200 correos de este tipo por día, y solo con el interruptor de correo encendido.

#### Scenario: Administrador que no entra
- **WHEN** una empresa cumple 14 días de registro y su administrador nunca ha vuelto a entrar
- **THEN** le llega un correo con la pregunta, y si responde, el ciclo queda cerrado

#### Scenario: Vendedor
- **WHEN** un usuario con rol Vendedor tiene la pregunta pendiente hace 5 días
- **THEN** no le llega correo; solo la ve dentro del Seller

### Requirement: Responder desde el enlace
Cuando el enlace del correo se abra, el sistema SHALL mostrar la página pública con la marca de Katuq y registrar la nota escogida. Después SHALL ofrecer la segunda pregunta según la nota, igual que la tarjeta. Una nota de 0 a 6 SHALL abrir el ticket de soporte de D-483, una sola vez.

El enlace SHALL vencer a los 30 días o cuando el ciclo ya tenga respuesta.

#### Scenario: Detractor por correo
- **WHEN** un administrador toca 3 en el correo y escribe "la factura falla"
- **THEN** queda la respuesta 3 con ese comentario y se abre un solo ticket de soporte

### Requirement: Encendido desde Firestore
El sistema SHALL leer del documento `config/nps` la etapa de comercios (apagada, internos o todos) y el interruptor de correo a comercios. Sin documento, o si no se puede leer, SHALL tomar "apagada" y el correo apagado.

#### Scenario: Bajar a internos sin desplegar
- **WHEN** alguien cambia la etapa a "internos" en `config/nps`
- **THEN** a los pocos minutos dejan de presentarse la ventana, las tarjetas y los correos a los comercios externos
