## Purpose

Historias de usuario (ticket F2-43, cd `UVaf50kn4UPbI358NGMk`, punto 1; D-518 F2-43·6):
- Como comercio que vende proyectos a la medida, quiero que un producto «para cotizar» no se
  pueda comprar al precio del catálogo por ningún camino de la tienda.
- Como comercio, quiero ver cada solicitud de la página en Cotizaciones con su asesor, su
  origen y una validez que cuadre.
- Como cliente que pide una cotización, quiero recibir constancia de que llegó.

Requisitos no funcionales: la decisión de bloquear la toma el servidor; todo queda limitado a
la empresa del sitio; sin datos personales en registros técnicos; la pantalla sigue el diseño
de las listas internas de Katuq. Los requisitos marcados **(provisional, Cn)** aplican la
recomendación de la pregunta Cn de la propuesta y cambian con su respuesta.

## ADDED Requirements

### Requirement: Un producto para cotizar no se compra
WHERE el comercio marcó un producto como «para cotizar» en su tienda, WHEN llega un pedido con
ese producto en cualquier línea por un camino de compra que usa esa tienda (la tienda o el
directorio de comercios **(provisional, C10)**), THE system SHALL rechazarlo sin crear pedido,
sin tomar número de pedido, sin contar en el tope del plan y sin tocar existencias, y SHALL
indicar cuáles productos se cotizan. WHEN la tienda recibe ese rechazo, THE system SHALL
quitar esos productos del carrito del comprador y explicarle que se piden con «Cotiza con un
asesor». THE system SHALL NOT ofrecer productos para cotizar en «Volver a pedir» ni en «Lo
que más pides». Un pedido sin productos para cotizar SHALL crearse exactamente igual que
antes del cambio.

Fuente: ticket F2-43, punto 1 («Cotizar en lugar de Agregar al carrito»); D-518, F2-43·6
(«bloquear la compra en el servidor»); D-475; pregunta C10 (directorio).

#### Scenario: Carrito armado antes de marcar el producto
- **WHEN** un comprador tiene en su carrito un producto que el comercio marcó después para
  cotizar y confirma el pedido
- **THEN** no se crea pedido, el producto sale del carrito y la tienda le explica que ese
  producto se cotiza con un asesor

#### Scenario: Volver a pedir
- **WHEN** un comprador con sesión abre un pedido anterior que incluía un producto que ahora
  se cotiza
- **THEN** «Volver a pedir» no lo agrega y lo cuenta entre los que ya no se pueden pedir así

#### Scenario: Nada se escribe al rechazar
- **WHEN** se rechaza un pedido por un producto para cotizar
- **THEN** pedidos, números de pedido, cupo del plan, existencias, el producto, sus
  variantes, su precio y sus listas de precios quedan sin cambios

#### Scenario: Pedido normal
- **WHEN** un comprador confirma un pedido sin productos para cotizar
- **THEN** el pedido se crea igual que antes del cambio

### Requirement: Asesor asignado siempre
WHEN llega una solicitud de cotización desde la página, THE system SHALL asignarla al asesor
que sigue en el turno de los configurados por el comercio. IF el comercio no configuró
asesores, THEN THE system SHALL asignarla al administrador de la empresa **(provisional,
C2)**, y SHALL NOT asignarla a un usuario de soporte de la plataforma. El asesor SHALL quedar con el nombre de su ficha de usuario cuando la tiene, y SHALL
recibir el aviso con el número de la cotización. IF la empresa no tiene un administrador
activo, THEN la cotización SHALL crearse igual, sin asesor, y quedar registrada para revisión.

Fuente: ticket F2-43, punto 1 («el asesor asignado») y criterio 1 («con su asesor»); D-518,
F2-43·6 («administrador de la empresa como asesor por defecto»).

#### Scenario: Comercio sin asesores
- **WHEN** un comercio sin asesores configurados recibe una solicitud
- **THEN** la cotización queda a nombre de su administrador y a él le llega el aviso

#### Scenario: Usuario de soporte en la empresa
- **WHEN** la empresa sin asesores tiene registrado un usuario de soporte de la plataforma
- **THEN** la cotización no queda a su nombre ni le llega el aviso

#### Scenario: Asesor con nombre
- **WHEN** la cotización se asigna a un asesor que tiene ficha de usuario en la empresa
- **THEN** el listado muestra su nombre, no su correo

### Requirement: Origen visible en el listado
THE system SHALL mostrar en el listado de Cotizaciones, al lado del número, el origen «Web»
de las cotizaciones que nacen en la página, como ya muestra los de bot y catálogo. Mostrarlo
SHALL NOT cambiar columnas, filtros ni acciones del listado.

Fuente: ticket F2-43, criterio 1 («con su asesor y origen»); D-518, F2-43·6.

#### Scenario: Solicitud desde la página
- **WHEN** el comercio abre el listado con una cotización pedida desde su página
- **THEN** ve el distintivo «Web» junto a su número

### Requirement: Validez coherente
THE system SHALL dar a cada cotización que nace en la página una validez de 15 días, con la
fecha de vencimiento igual a la fecha de creación más 15 días, de modo que el número de días
y la fecha que muestra el listado digan lo mismo.

WHEN el asesor abre un borrador cuya fecha de vencimiento ya pasó, THE system SHALL proponerle
una nueva fecha igual a hoy más los días de validez y avisarle del cambio, para que no la envíe
vencida **(provisional, C11)**.

Fuente: D-518, F2-43·6 («validez de 15 días coherente»); pregunta C11.

#### Scenario: Fecha del listado
- **WHEN** se crea una cotización desde la página el 1 de noviembre
- **THEN** su validez es de 15 días y el listado muestra que vence el 16 de noviembre

#### Scenario: Borrador completado tarde
- **WHEN** el asesor abre el 20 de noviembre ese borrador para completarlo
- **THEN** el editor le propone vencer el 5 de diciembre y le avisa del cambio

### Requirement: Acuse automático al cliente
IF el cliente dejó su correo al pedir la cotización, THEN THE system SHALL enviarle un correo
con la marca de la tienda que confirme que su solicitud llegó, con el número de la
cotización, el producto, la cantidad y el asesor que lo atenderá. Ese correo SHALL salir una
sola vez por cotización, SHALL NOT llevar precios ni nada de lo que escribió el cliente en el
formulario (ni siquiera su nombre), y SHALL NOT demorar ni impedir la creación de la
cotización. WHERE el comercio apagó
ese correo en su tienda, THE system SHALL NOT enviarlo. IF el cliente no dejó correo, THEN la
solicitud SHALL funcionar como hoy.

Fuente: ticket F2-43, punto 1 («respuesta automática al cliente»); D-518, F2-43·6 («correo
automático al cliente si dejó correo»).

#### Scenario: Cliente con correo
- **WHEN** un cliente pide una cotización y deja su correo
- **THEN** recibe un solo correo con el número de su cotización y su asesor, sin precios

#### Scenario: Envío repetido
- **WHEN** el envío del acuse se intenta dos veces para la misma cotización
- **THEN** el cliente recibe un solo correo

### Requirement: Formulario que crea cotización
WHERE el comercio configuró un formulario de su página, en el inicio o en otra página, para
crear cotizaciones **(provisional, C12)**, WHEN un visitante lo envía, THE system SHALL crear
una cotización en borrador, con asesor, origen, campaña, validez y acuse iguales a los de una
solicitud de producto, y SHALL NOT crear un prospecto. La plantilla Tecnología SHALL traer su
formulario «Pedir cotización» configurado así. Los formularios configurados como prospecto y
el boletín SHALL funcionar como antes, y el conteo de contactos del sitio SHALL seguir
contando los dos. THE system SHALL decidir con la configuración publicada del formulario que
se envió, no con lo que diga la página del visitante.

Fuente: D-518, F2-43·6 («que la plantilla Tecnología cree cotización»); TX-36, cd
`Am2CZ98bvTePFdx6KYRL`.

#### Scenario: Sitio con la plantilla Tecnología
- **WHEN** un visitante envía «Cotiza para tu empresa» en un sitio nuevo con esa plantilla
- **THEN** aparece una cotización en borrador en Cotizaciones y no un prospecto en el CRM

#### Scenario: Formulario de contacto
- **WHEN** un visitante envía un formulario configurado como prospecto
- **THEN** el prospecto se crea como antes y no hay cotización

## [NEEDS CLARIFICATION]
C1 orden de unión; C2 qué administrador; C3 validez del bot y del catálogo; C4 sitios ya
publicados; C5 precio visible; C6 WhatsApp; C7 asesores sin usuario; C8 atributo del
producto; C9 cotizaciones ya creadas; C10 directorio de comercios; C11 borrador abierto
tarde; C12 opción para cualquier formulario.
