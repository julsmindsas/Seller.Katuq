# sitios-acceso-agencia

> Capacidad nueva de D-503. «(por defecto N)» remite a la decisión N del design. Si Daniel decide otra cosa en la tarea 0.2, esta spec se ajusta y se vuelve a aprobar.

## ADDED Requirements

### Requirement: Solo el comercio otorga, cambia y revoca el acceso
Solo la familia administrador del comercio, con la empresa de su sesión firmada, SHALL poder otorgar acceso a Sitios a un correo. El acceso lleva el rol «Editor de agencia» o «Publicador de agencia» y una vigencia opcional, de 90 días por defecto. Solo esa familia SHALL poder cambiar el rol o la vigencia y revocarlo (por defecto 2 y 6).

#### Scenario: Otorgar
- **WHEN** un administrador del comercio otorga acceso a un correo
- **THEN** queda una concesión vigente con ese correo, el rol y la vigencia, y queda registrado quién la otorgó

#### Scenario: Quien no administra
- **WHEN** lo intenta un usuario del comercio que no es administrador, o alguien de otra empresa
- **THEN** el sistema lo rechaza y no escribe nada

#### Scenario: Correo con o sin cuenta
- **WHEN** se otorga acceso a un correo con cuenta en Katuq y a otro sin cuenta
- **THEN** las dos respuestas son iguales

#### Scenario: Destinos no aceptados
- **WHEN** quien otorga es la empresa plataforma, o el correo es suyo
- **THEN** el sistema lo rechaza

#### Scenario: Unicidad y tope
- **WHEN** ya existe una concesión vigente para ese correo, o el comercio ya tiene 50 vigentes (por defecto 14)
- **THEN** el sistema rechaza la nueva
- **AND** una concesión vencida queda marcada como vencida y no cuenta para ninguno de los dos límites

#### Scenario: Revocar dos veces
- **WHEN** se revoca una concesión ya revocada
- **THEN** la respuesta es la misma y no cambia nada

### Requirement: La agencia solo ve y abre los comercios que la autorizaron
«Mis comercios» SHALL listar solo las concesiones vigentes del correo de la sesión firmada. Para abrir un comercio, el sistema SHALL exigir todo esto:

- un usuario activo y una concesión vigente;
- un comercio que no sea la empresa plataforma ni la propia de la agencia;
- el acceso de agencia encendido en el comercio y el interruptor general encendido;
- que el comercio pueda entrar a Katuq.

La sesión delegada SHALL durar como máximo una hora y renovarse solo mientras se cumpla todo eso.

#### Scenario: Correo ajeno en la petición
- **WHEN** la pantalla pide los comercios de otro correo
- **THEN** el sistema responde con los del correo de la sesión firmada

#### Scenario: Sin condiciones
- **WHEN** la concesión venció o fue revocada, el comercio no puede entrar, o la cuenta propia de la agencia está en solo lectura
- **THEN** el sistema no abre la sesión delegada

#### Scenario: Comercio suspendido
- **WHEN** la agencia guarda en un comercio suspendido
- **THEN** el sistema rechaza la escritura, igual que a los usuarios del comercio

### Requirement: Solo Sitios, negado por defecto
WHILE la sesión es delegada, el sistema SHALL aceptar solo las acciones de Sitios aprobadas para el rol, y SHALL rechazar las demás sin leer ni escribir datos. Una acción nueva sin clasificar SHALL quedar rechazada, y la verificación automática SHALL fallar antes de que se publique.

#### Scenario: Lo permitido
- **WHEN** la agencia lista, abre, crea, duplica o genera sitios, edita borradores, diseña con KAI, busca productos, sube imágenes o lee el kit de marca
- **THEN** el sistema responde como a un usuario del comercio, dentro de esta spec (por defecto 12)

#### Scenario: Otros módulos
- **WHEN** la agencia llama a pedidos, inventario, clientes, escritura de productos, precios, pagos, suscripciones, consecutivos, usuarios, roles, integraciones u otra empresa
- **THEN** el sistema lo rechaza sin efecto

#### Scenario: Lo de Sitios que queda fuera
- **WHEN** la agencia pide algo de esto (por defecto 4, 5, 9 y 13):
  - contactos o leads, métricas o reseñas;
  - un correo de prueba, el acceso de un cliente o la prueba de medición;
  - borrar un sitio o editar el kit de marca;
  - la configuración comercial de la tienda o la IA de configuración inicial.
- **THEN** el sistema lo rechaza sin efecto, y la sesión propia de la agencia sigue abierta

### Requirement: La agencia edita la presentación, no la operación de la tienda
WHILE la sesión es delegada, al guardar un borrador o restaurar una versión, el sistema SHALL conservar la configuración comercial de la tienda y la medición, aunque la petición traiga otros valores (por defecto 13). La configuración comercial incluye bodega, medios de pago, envíos, mínimo de compra, cupones, promociones, condiciones confirmadas por el comercio, asesores y autonomía de KAI.

#### Scenario: Guardar con otra bodega
- **WHEN** la agencia guarda un borrador con otra bodega u otros medios de pago
- **THEN** se guardan sus cambios de presentación, y la configuración comercial queda como estaba

#### Scenario: Restaurar una versión
- **WHEN** el Publicador de agencia restaura una versión vieja
- **THEN** vuelve la presentación de esa versión, con la configuración comercial y la medición actuales

### Requirement: Publicar sigue la regla del comercio
El Editor de agencia SHALL NOT publicar, restaurar, programar, quitar de línea, unir sitios ni cambiar la dirección o el dominio de un sitio publicado. Esto vale aunque el comercio no haya restringido quién publica. El Publicador de agencia SHALL poder hacerlo solo si el comercio no restringió quién publica, o si incluyó «Publicador de agencia». La agencia SHALL NOT cambiar quién puede publicar.

#### Scenario: Editor sin restricción
- **WHEN** un Editor de agencia publica en un comercio que no restringió quién publica
- **THEN** el sistema lo rechaza y lo publicado no cambia

#### Scenario: Publicador permitido
- **WHEN** un Publicador de agencia publica con permiso
- **THEN** el sitio sale y el historial muestra «Nombre (Agencia X)»

#### Scenario: Cambiar quién publica
- **WHEN** la agencia intenta cambiar quién puede publicar
- **THEN** el sistema lo rechaza

### Requirement: Revocar corta al instante
WHEN el comercio revoca la concesión, o esta vence, el sistema SHALL rechazar la siguiente acción de esa agencia en ese comercio, aunque la sesión delegada no haya vencido. IF no puede verificar la concesión, THEN el sistema SHALL rechazar la acción.

#### Scenario: Revocar en plena edición
- **WHEN** el comercio revoca mientras la agencia edita
- **THEN** el siguiente guardado se rechaza y la agencia vuelve a «Mis comercios», con su sesión propia intacta

#### Scenario: Programada de una concesión revocada
- **WHEN** llega la hora de una publicación que programó una agencia ya revocada
- **THEN** no sale, y el comercio ve por qué (por defecto 10)

#### Scenario: Cambio de rol
- **WHEN** el comercio cambia el rol
- **THEN** la siguiente acción de la agencia usa el rol nuevo

### Requirement: Sin datos sensibles en la lista de sitios
WHEN la agencia lista o abre sitios, el sistema SHALL entregar la vista segura que recibe el editor, sin secretos y sin contadores de contactos y pedidos.

#### Scenario: Lista y detalle
- **WHEN** la agencia lista los sitios y abre uno
- **THEN** ninguna respuesta trae secretos ni esos contadores

### Requirement: Lo que hace la agencia queda a nombre del comercio
- Los pedidos y el reporte de KAI de un sitio creado por la agencia SHALL ir al comercio (por defecto 11).
- La agencia SHALL NOT ocupar un usuario del plan, y «Diseñar con KAI» SHALL gastar el cupo del comercio (por defecto 5).
- Su primera publicación SHALL contar como la del comercio (por defecto 15).

#### Scenario: Pedido en un sitio de la agencia
- **WHEN** entra un pedido por un sitio que creó la agencia
- **THEN** el pedido no queda a nombre de nadie de la agencia

### Requirement: Auditoría sin credenciales
El sistema SHALL registrar las concesiones otorgadas, cambiadas y revocadas, las sesiones emitidas y negadas, las acciones negadas y las escrituras de la agencia, nunca con credenciales.

- Cada registro lleva la concesión, el correo, la empresa de la agencia y el comercio.
- Los guardados del borrador se agrupan por sitio cada 10 minutos.
- El administrador del comercio SHALL ver los últimos 100 registros de cada agencia.

#### Scenario: Actividad
- **WHEN** el administrador abre la actividad de una agencia
- **THEN** ve las concesiones, las sesiones y las escrituras, sin credenciales

### Requirement: Cada pestaña trabaja con un comercio
WHILE una pestaña está en modo agencia, el sistema SHALL mostrar solo Sitios, con el marco «Editando *Comercio* como *Agencia* · rol». Cualquier otra pantalla con sesión SHALL llevar a Sitios. Las demás pestañas SHALL seguir con su propia sesión.

#### Scenario: Dos comercios en dos pestañas
- **WHEN** la agencia abre un comercio en una pestaña y otro en otra
- **THEN** cada pestaña lee y guarda solo en su comercio

#### Scenario: Cambia la sesión propia o se vuelve a la lista
- **WHEN** la sesión propia se cierra o cambia en otra pestaña, o la agencia pulsa «Volver a mis comercios»
- **THEN** la sesión delegada termina

### Requirement: Encendido por comercio, y nada cambia para los demás
WHERE el comercio no tiene encendido el acceso de agencia, el sistema SHALL comportarse igual que antes. Para quien no está en modo agencia, la sesión, las pantallas, la navegación y las peticiones SHALL quedar idénticas. Con el interruptor general apagado, el sistema SHALL negar las sesiones delegadas nuevas.

#### Scenario: Usuario normal
- **WHEN** un usuario trabaja sin modo agencia
- **THEN** todo es como antes de este cambio

### Requirement: La agencia no escribe fuera de Sitios
Por una acción de la agencia, el sistema SHALL NOT escribir pedidos, pagos, inventario, movimientos, consecutivos, productos, precios, usuarios, roles, suscripciones ni la ficha de la empresa, salvo la marca de primera publicación.

#### Scenario: Recorrido de escrituras
- **WHEN** se ejecuta cada acción permitida a la agencia
- **THEN** solo cambian los sitios, las concesiones con su auditoría, las métricas de Sitios y el registro de uso de siempre
