# sitios-acceso-agencia

> Capacidad nueva de D-503 (cambio D), aprobada el 18-oct. «(por defecto N)» remite a la decisión N del design. **D-518 la modifica:** el acceso es por invitación, como D-450 (F5-29·8); la medición y la pauta solo si el comercio lo permite en la concesión (F5-29·8); el interruptor general vive en la configuración de Firestore (D-505), y no se enciende hasta cerrar las reglas de Firebase del ticket 1320 (F5-29·10). Los requisitos marcados **[MODIFICADO D-518]** esperan la aprobación de su texto; los demás siguen aprobados. Para no pasar de 3 páginas (Artículo XIII), la invitación, que reemplaza el requisito aprobado «Solo el comercio otorga, cambia y revoca el acceso», está en la sub-spec `sitios-agencia-invitacion`.

## ADDED Requirements

### Requirement: La agencia solo ve y abre los comercios que la autorizaron [MODIFICADO D-518]
«Mis comercios» SHALL listar las concesiones vigentes y las invitaciones pendientes del correo de la sesión firmada. Para abrir un comercio, el sistema SHALL exigir todo esto:

- un usuario activo y una concesión vigente y aceptada;
- un comercio que no sea la empresa plataforma ni la propia de la agencia;
- el acceso de agencia encendido en el comercio y el interruptor general encendido;
- que el comercio pueda entrar a Katuq.

La sesión delegada SHALL durar como máximo una hora y renovarse solo mientras se cumpla todo eso.
Fuente: ticket 1253 («una agencia ve y edita solo los comercios que la autorizaron»); D-518 F5-29·8.

#### Scenario: Correo ajeno en la petición
- **WHEN** la pantalla pide los comercios de otro correo
- **THEN** el sistema responde con los del correo de la sesión firmada

#### Scenario: Sin condiciones
- **WHEN** la concesión venció, fue revocada o sigue sin aceptar, el comercio no puede entrar, o la cuenta propia de la agencia está en solo lectura
- **THEN** el sistema no abre la sesión delegada

#### Scenario: Comercio suspendido
- **WHEN** la agencia guarda en un comercio suspendido
- **THEN** el sistema rechaza la escritura, igual que a los usuarios del comercio

### Requirement: Solo Sitios, negado por defecto [MODIFICADO D-518]
WHILE la sesión es delegada, el sistema SHALL aceptar solo las acciones de Sitios aprobadas para el rol y el permiso de la concesión, y SHALL rechazar las demás sin leer ni escribir datos. Una acción nueva sin clasificar SHALL quedar rechazada, y la verificación automática SHALL fallar antes de que se publique.
Fuente: D-503; ticket 1253 (módulo «Constructor web»).

#### Scenario: Lo permitido
- **WHEN** la agencia lista, abre, crea, duplica o genera sitios, edita borradores, diseña con KAI, busca productos, sube imágenes, lee el kit de marca, compara versiones o recupera un borrador guardado [REVISADO]
- **THEN** el sistema responde como a un usuario del comercio, dentro de esta spec (por defecto 12)

#### Scenario: Otros módulos
- **WHEN** la agencia llama a pedidos, inventario, clientes, escritura de productos, precios, pagos, suscripciones, consecutivos, usuarios, roles, integraciones u otra empresa
- **THEN** el sistema lo rechaza sin efecto

#### Scenario: Lo de Sitios que queda fuera
- **WHEN** la agencia pide contactos, leads, métricas o reseñas; un correo de prueba o el acceso de un cliente; borrar un sitio o editar el kit de marca; el dominio propio; la configuración comercial de la tienda; o la IA de configuración inicial (por defecto 4, 5, 9 y 13)
- **THEN** el sistema lo rechaza sin efecto, y la sesión propia de la agencia sigue abierta

#### Scenario: Prueba de medición sin permiso [REVISADO]
- **WHEN** la agencia sin el permiso de medición envía la prueba de medición
- **THEN** el sistema lo rechaza sin efecto

### Requirement: La agencia edita la presentación; la medición solo con permiso [MODIFICADO D-518]
WHILE la sesión es delegada, al guardar un borrador o restaurar una versión, el sistema SHALL conservar la configuración comercial de la tienda (bodega, medios de pago, envíos, mínimo de compra, cupones, promociones, condiciones confirmadas, asesores y autonomía de KAI) y el dominio, aunque la petición traiga otros valores. WHERE la concesión incluye el permiso de medición y pauta, la agencia SHALL poder cambiar la medición (píxeles, identificadores y conversiones desde el servidor) y enviar la prueba de medición. Sin ese permiso, el sistema SHALL conservar la medición.
Fuente: D-503 (decisión 13); D-518 F5-29·8 y F5-29·5.

#### Scenario: Guardar con otra bodega
- **WHEN** la agencia guarda un borrador con otra bodega u otros medios de pago
- **THEN** se guardan sus cambios de presentación, y la configuración comercial queda como estaba

#### Scenario: Agencia de pauta autorizada
- **WHEN** el comercio dio el permiso de medición y la agencia pone su píxel de Meta
- **THEN** el píxel queda en el borrador y sale con la siguiente publicación

#### Scenario: Agencia sin permiso de medición
- **WHEN** la agencia sin ese permiso cambia el píxel
- **THEN** el píxel queda como estaba y la agencia ve que el comercio no le dio ese permiso

### Requirement: Publicar sigue la regla del comercio [MODIFICADO D-518]
El Editor de agencia SHALL NOT publicar, restaurar, programar, quitar de línea, unir sitios ni cambiar la dirección de un sitio publicado, aunque el comercio no haya restringido quién publica. El Publicador de agencia SHALL poder hacerlo solo si la lista de quién publica de ese sitio, la del comercio con la del sitio, está vacía o incluye «Publicador de agencia». La agencia SHALL NOT cambiar quién puede publicar.
Fuente: ticket 1253 («un editor no puede publicar»); D-503; D-518 F5-29·2.

#### Scenario: Editor sin restricción
- **WHEN** un Editor de agencia publica en un comercio que no restringió quién publica
- **THEN** el sistema lo rechaza y lo publicado no cambia

#### Scenario: Publicador permitido
- **WHEN** un Publicador de agencia publica con permiso
- **THEN** el sitio sale y el historial muestra «Nombre (Agencia X)»

#### Scenario: Cambiar quién publica
- **WHEN** la agencia intenta cambiar quién puede publicar
- **THEN** el sistema lo rechaza

### Requirement: Revocar corta al instante [MODIFICADO D-518]
WHEN el comercio revoca la concesión, o esta vence, el sistema SHALL rechazar la siguiente acción de esa agencia en ese comercio, aunque la sesión delegada no haya vencido. WHEN se apaga el interruptor general, el sistema SHALL rechazar la siguiente acción de toda agencia. IF no puede verificar la concesión, THEN el sistema SHALL rechazar la acción.
Fuente: ticket 1253 («otorga y revoca»); D-503; D-505 (interruptor en la configuración).

#### Scenario: Revocar en plena edición
- **WHEN** el comercio revoca mientras la agencia edita
- **THEN** el siguiente guardado se rechaza y la agencia vuelve a «Mis comercios», con su sesión propia intacta

#### Scenario: Programada de una concesión revocada
- **WHEN** llega la hora de una publicación que programó una agencia ya revocada
- **THEN** no sale, y el comercio ve por qué (por defecto 10)

#### Scenario: Cambio de rol o de permiso
- **WHEN** el comercio cambia el rol o quita el permiso de medición
- **THEN** la siguiente acción de la agencia usa lo nuevo

### Requirement: Sin datos sensibles en la lista de sitios
WHEN la agencia lista o abre sitios, el sistema SHALL entregar la vista segura que recibe el editor, sin secretos y sin contadores de contactos y pedidos.
Fuente: D-503.

#### Scenario: Lista y detalle
- **WHEN** la agencia lista los sitios y abre uno
- **THEN** ninguna respuesta trae secretos ni esos contadores

### Requirement: Lo que hace la agencia queda a nombre del comercio
Los pedidos y el reporte de KAI de un sitio creado por la agencia SHALL ir al comercio (por defecto 11). La agencia SHALL NOT ocupar un usuario del plan, y «Diseñar con KAI» SHALL gastar el cupo del comercio (por defecto 5). Su primera publicación SHALL contar como la del comercio (por defecto 15).
Fuente: D-503.

#### Scenario: Pedido en un sitio de la agencia
- **WHEN** entra un pedido por un sitio que creó la agencia
- **THEN** el pedido no queda a nombre de nadie de la agencia

### Requirement: Auditoría sin credenciales [MODIFICADO D-518]
El sistema SHALL registrar las invitaciones, aceptaciones, cambios y revocaciones, las sesiones emitidas y negadas, las acciones negadas y las escrituras de la agencia, nunca con credenciales. Cada registro lleva la concesión, el correo, la empresa de la agencia y el comercio; los guardados del borrador se agrupan por sitio cada 10 minutos. El administrador del comercio SHALL ver los últimos 100 registros de cada agencia.
Fuente: D-503; Artículos VII y XI.

#### Scenario: Actividad
- **WHEN** el administrador abre la actividad de una agencia
- **THEN** ve la invitación, las sesiones y las escrituras, sin credenciales

### Requirement: Cada pestaña trabaja con un comercio
WHILE una pestaña está en modo agencia, el sistema SHALL mostrar solo Sitios, con el marco «Editando *Comercio* como *Agencia* · rol». Cualquier otra pantalla con sesión SHALL llevar a Sitios. Las demás pestañas SHALL seguir con su propia sesión.
Fuente: D-503.

#### Scenario: Dos comercios en dos pestañas
- **WHEN** la agencia abre un comercio en una pestaña y otro en otra
- **THEN** cada pestaña lee y guarda solo en su comercio

#### Scenario: Cambia la sesión propia o se vuelve a la lista
- **WHEN** la sesión propia se cierra o cambia en otra pestaña, o la agencia pulsa «Volver a mis comercios»
- **THEN** la sesión delegada termina

### Requirement: Encendido por comercio, y nada cambia para los demás [MODIFICADO D-518]
WHERE el comercio no tiene encendido el acceso de agencia, el sistema SHALL comportarse igual que antes. Para quien no está en modo agencia, la sesión, las pantallas, la navegación y las peticiones SHALL quedar idénticas. Con el interruptor general apagado, el sistema SHALL negar las invitaciones nuevas y las sesiones delegadas.
Fuente: D-503; Artículo XII.

#### Scenario: Usuario normal
- **WHEN** un usuario trabaja sin modo agencia
- **THEN** todo es como antes de este cambio

### Requirement: La agencia no escribe fuera de Sitios
Por una acción de la agencia, el sistema SHALL NOT escribir pedidos, pagos, inventario, movimientos, consecutivos, productos, precios, usuarios, roles, suscripciones ni la ficha de la empresa, salvo la marca de primera publicación.
Fuente: D-503; D-134; AGENTS.md.

#### Scenario: Recorrido de escrituras
- **WHEN** se ejecuta cada acción permitida a la agencia
- **THEN** solo cambian los sitios, las concesiones con su auditoría, las métricas de Sitios y el registro de uso de siempre
