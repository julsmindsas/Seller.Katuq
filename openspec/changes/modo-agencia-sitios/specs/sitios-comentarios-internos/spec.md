# sitios-comentarios-internos

> Capacidad nueva de D-503 (cambio C), aprobada el 18-oct. **D-518 F5-29·7 la modifica:** los comentarios y «Pedir aprobación» son para cualquier equipo, no solo con agencia. Los requisitos marcados **[MODIFICADO D-518]** esperan la aprobación de su texto; los demás siguen aprobados. Ya no depende de `sitios-acceso-agencia`: la agencia participa solo cuando ese cambio esté encendido. «(por defecto N)» remite a la decisión N del design.

## ADDED Requirements

### Requirement: Comentar, responder y resolver dentro del editor [MODIFICADO D-518]
Los usuarios del comercio, con cualquier rol que pueda abrir el editor, SHALL poder comentar el sitio, una página o una sección, responder un comentario y marcarlo como resuelto. WHERE el comercio tiene encendido el acceso de agencia, las agencias con concesión vigente SHALL poder hacer lo mismo. La lista SHALL mostrar los 200 comentarios más recientes del sitio.
Fuente: descripción del ticket 1253 («comentarios internos para aprobación»); D-518 F5-29·7.

#### Scenario: Comentar una sección
- **WHEN** alguien comenta una sección
- **THEN** el comentario aparece junto a esa sección, con el autor, la fecha y, si viene de una agencia, «Nombre (Agencia X)»

#### Scenario: Comercio sin agencia
- **WHEN** un empleado de un comercio que no usa agencias comenta
- **THEN** el comentario se guarda y lo ven los demás usuarios del comercio

#### Scenario: Responder
- **WHEN** alguien responde un comentario
- **THEN** la respuesta queda dentro de ese hilo

#### Scenario: Quién resuelve
- **WHEN** el autor, un administrador del comercio o quien puede publicar marca un comentario como resuelto
- **THEN** queda resuelto, con quién y cuándo
- **AND** si lo intenta otra persona, el sistema lo rechaza

### Requirement: Solo el comercio y sus agencias vigentes los ven
El sistema SHALL mostrar los comentarios solo a los usuarios del comercio y a las agencias con concesión vigente para ese comercio. Ninguna página publicada, vista previa compartible ni ruta pública SHALL mostrarlos.
Fuente: D-503; TX-32 (vista compartible, D-477); D-458 (lo interno se filtra en el servidor).

#### Scenario: Agencia revocada
- **WHEN** el comercio revoca la concesión de una agencia
- **THEN** en su siguiente acción la agencia ya no ve ni crea comentarios

#### Scenario: Otra empresa
- **WHEN** una persona de otra empresa pide los comentarios de un sitio
- **THEN** recibe la misma respuesta que si el sitio no existiera

#### Scenario: Página pública
- **WHEN** un visitante abre la página publicada o la vista compartible
- **THEN** no aparece ningún comentario ni rastro de ellos

### Requirement: Texto seguro y con límites
El sistema SHALL guardar los comentarios como texto plano, con un máximo de 2.000 caracteres, y SHALL mostrarlos sin interpretar formato. Cada persona SHALL poder crear como máximo 30 comentarios cada 10 minutos.
Fuente: D-503; Artículo XI.

#### Scenario: Texto con código
- **WHEN** alguien escribe etiquetas o código en un comentario
- **THEN** se muestran como texto y no se ejecutan

#### Scenario: Demasiados comentarios
- **WHEN** alguien pasa de 30 comentarios en 10 minutos
- **THEN** el sistema rechaza los siguientes y le dice cuándo puede seguir

### Requirement: Pedir aprobación [MODIFICADO D-518]
WHEN quien no puede publicar ese sitio pide aprobación, sea empleado del comercio o agencia, el sistema SHALL dejar un comentario de pedido de aprobación dirigido a quien puede publicar. También SHALL sumar uno al contador de pedidos abiertos del sitio, en la misma operación. Resolver el pedido SHALL restar uno, y el contador nunca baja de cero. Mis sitios SHALL avisar qué sitios tienen pedidos abiertos. No se envían correos ni notificaciones (por defecto 7).
Fuente: descripción del ticket 1253; D-518 F5-29·7. «Pedir aprobación» reemplaza el «avísale» del aviso de falta de permiso de D-478.

#### Scenario: Empleado sin permiso pide aprobación
- **WHEN** un usuario con rol «Marketing», que no está en la lista de quién publica, pulsa «Pedir aprobación»
- **THEN** queda el pedido en el sitio y Mis sitios muestra el aviso a quien puede publicar

#### Scenario: Editor de agencia pide aprobación
- **WHEN** un Editor de agencia pulsa «Pedir aprobación»
- **THEN** queda el pedido en el sitio y Mis sitios muestra el aviso al comercio

#### Scenario: Dos pedidos resueltos a la vez
- **WHEN** dos personas resuelven pedidos del mismo sitio al mismo tiempo
- **THEN** el contador queda igual al número de pedidos que siguen abiertos

### Requirement: El mensaje de falta de permiso remite a Comentarios solo cuando existen
WHERE el comercio tiene los comentarios encendidos, el sistema SHALL responder «Pide aprobación desde Comentarios» cuando rechace una publicación por falta de permiso. Si no los tiene, SHALL mantener el mensaje actual.
Fuente: D-503.

#### Scenario: Comercio sin comentarios
- **WHEN** a un usuario de un comercio sin comentarios se le niega publicar
- **THEN** ve el mensaje de siempre

### Requirement: Encendido propio, independiente de la agencia [MODIFICADO D-518]
WHERE el comercio no tiene encendidos los comentarios del editor, el sistema SHALL ocultar el panel de comentarios y «Pedir aprobación», y el editor SHALL comportarse igual que antes. Los comentarios SHALL poder encenderse sin el acceso de agencia.
Fuente: D-518 F5-29·7. Reemplaza «Encendido con el acceso de agencia» del 18-oct.

#### Scenario: Comentarios apagados
- **WHEN** un usuario de un comercio sin los comentarios encendidos abre el editor
- **THEN** no ve comentarios ni «Pedir aprobación», y nada más cambia

#### Scenario: Comentarios sin agencia
- **WHEN** un comercio tiene los comentarios encendidos y el acceso de agencia apagado
- **THEN** sus empleados comentan y piden aprobación, y ninguna agencia ve nada

### Requirement: Escrituras acotadas
Al comentar, responder, resolver o pedir aprobación, el sistema SHALL escribir solo los comentarios del sitio, su contador de pedidos abiertos y, si actúa una agencia, su auditoría.
Fuente: D-503; AGENTS.md, módulos sensibles.

#### Scenario: Recorrido de escrituras
- **WHEN** se ejecuta cada acción de comentarios
- **THEN** no cambia el borrador, lo publicado, los pedidos ni ningún otro registro
