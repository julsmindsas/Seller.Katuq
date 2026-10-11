## ADDED Requirements

### Requirement: Un solo formulario de cliente en todo el seller center
El sistema SHALL capturar y editar clientes únicamente a través del formulario unificado de cliente, en las pantallas Crear cliente, Listado de clientes (editar), venta asistida larga, venta asistida única, cotizaciones, CRM y facturación electrónica.

#### Scenario: Mismos campos en todas las pantallas
- **WHEN** un usuario abre el formulario de cliente desde cualquiera de esas pantallas
- **THEN** ve las mismas pestañas Contacto, Entrega, Facturación y Notas, con los mismos campos y las mismas validaciones

#### Scenario: Pantallas que abren el formulario en modal siguen funcionando
- **WHEN** cotizaciones, CRM o facturación electrónica abren el formulario y el usuario guarda
- **THEN** reciben el mismo resultado que hoy (`{ cliente, action }` con `created`, `updated`, `existing_found` o `draft`)

### Requirement: Contacto es obligatorio; las demás pestañas son opcionales
El formulario SHALL exigir solo los datos de la pestaña Contacto para guardar, y SHALL permitir guardar sin direcciones, sin perfiles de facturación y sin notas.

#### Scenario: Cliente rápido en venta asistida
- **WHEN** el vendedor llena Contacto y guarda sin abrir las otras pestañas
- **THEN** el cliente se crea y el pedido continúa con ese cliente

#### Scenario: Reglas de Contacto vigentes
- **WHEN** el usuario intenta guardar sin celular ni teléfono fijo, o con NIT y sin apellidos
- **THEN** el formulario aplica las mismas reglas de hoy: exige al menos un teléfono y no exige apellidos con NIT

#### Scenario: Pestaña incompleta señalada
- **WHEN** el usuario empieza a llenar una dirección o un perfil de facturación y deja campos obligatorios vacíos
- **THEN** la pestaña muestra un indicador de error y el guardado se bloquea hasta completar o descartar ese elemento

### Requirement: Nombre de usuario de WhatsApp en Contacto
El formulario SHALL ofrecer el campo `whatsappUsername` junto al número de WhatsApp, opcional, y SHALL guardarlo en el documento del cliente sin el prefijo `@`.

#### Scenario: Guardar username
- **WHEN** el usuario escribe `@maria.flores` en el campo y guarda
- **THEN** el cliente queda con `whatsappUsername = "maria.flores"`

#### Scenario: Username inválido
- **WHEN** el usuario escribe un valor con espacios o menor de 3 caracteres
- **THEN** el campo marca error y el guardado se bloquea hasta corregirlo o vaciarlo

### Requirement: Varias direcciones de entrega
El formulario SHALL permitir agregar, editar y eliminar una o varias direcciones de entrega en la pestaña Entrega, usando la dirección estructurada y la zona de cobro existentes, y SHALL guardarlas en `datosEntrega[]` con la forma canónica camel.

#### Scenario: Agregar segunda dirección
- **WHEN** un cliente ya tiene una dirección y el usuario agrega otra y guarda
- **THEN** `datosEntrega[]` queda con las dos direcciones, la anterior intacta

#### Scenario: Dirección legacy en forma snake
- **WHEN** se abre un cliente cuyo `datosEntrega[]` trae elementos con `direccion_entrega` y `ciudad_municipio_entrega`
- **THEN** la pestaña Entrega los muestra correctamente y, al guardar, los reescribe en la forma canónica sin perder ninguna clave original

#### Scenario: Eliminar dirección
- **WHEN** el usuario elimina una dirección y guarda
- **THEN** esa dirección desaparece de `datosEntrega[]` y las demás se conservan

### Requirement: Varios perfiles de facturación electrónica
El formulario SHALL permitir agregar, editar y eliminar uno o varios perfiles en la pestaña Facturación, con alias, razón social, tipo y número de documento, correo y dirección, y SHALL permitir marcar uno como predeterminado.

#### Scenario: Perfil predeterminado
- **WHEN** el cliente tiene dos perfiles y uno está marcado como predeterminado
- **THEN** venta asistida y cotizaciones lo preseleccionan al elegir los datos de facturación

#### Scenario: Copiar desde Contacto
- **WHEN** el usuario pulsa "usar los datos del cliente" en un perfil nuevo
- **THEN** el perfil se llena con nombre, tipo y número de documento y correo de Contacto, editables

### Requirement: Notas del cliente
El formulario SHALL permitir agregar notas en la pestaña Notas, cada una con fecha y usuario que la escribió, y SHALL mostrarlas de la más reciente a la más antigua.

#### Scenario: Agregar nota
- **WHEN** el usuario escribe una nota y guarda el cliente
- **THEN** `notas[]` recibe `{ fecha, nota, usuario }` con la fecha del día y el correo del usuario

### Requirement: Guardado del documento completo
El formulario SHALL enviar al backend el documento completo del cliente, incluidos los tres arreglos íntegros, en una sola llamada a crear o editar, y SHALL avisar del resultado con un solo mensaje.

#### Scenario: Edición desde el listado
- **WHEN** el usuario edita contacto, agrega una dirección y una nota, y pulsa Guardar una vez
- **THEN** el cliente queda con los tres cambios y el listado se refresca con ellos

#### Scenario: Documento ya registrado
- **WHEN** el usuario crea un cliente con un documento que ya existe en la empresa
- **THEN** el formulario avisa, carga el cliente existente para editarlo y no crea un duplicado

### Requirement: Formulario inline y en modal con el mismo componente
El formulario SHALL poder mostrarse inline dentro de una pantalla o dentro de un modal, con el mismo componente y la misma lógica, y SHALL informar el resultado por el mecanismo del modo en que se abrió.

#### Scenario: Inline en Crear cliente
- **WHEN** el usuario entra a Crear cliente
- **THEN** el formulario carga abierto en la pestaña Contacto, con el botón Etiquetas visible y el buscador de existentes plegado

#### Scenario: Inline en venta asistida
- **WHEN** el vendedor crea un cliente desde cualquiera de las dos ventas asistidas
- **THEN** al guardar, el pedido toma ese cliente y el formulario se oculta, como hoy

### Requirement: Multi-tenancy y módulos sensibles
El formulario SHALL operar solo sobre clientes de la empresa del usuario y SHALL NOT escribir pedidos, inventario, productos ni precios.

#### Scenario: Aislamiento por empresa
- **WHEN** se busca un documento existente antes de crear
- **THEN** la búsqueda y la creación se hacen con la empresa del usuario autenticado

#### Scenario: Sin efectos sobre inventario
- **WHEN** se crea o edita un cliente desde venta asistida
- **THEN** `inventory`, `inventoryMovement`, `products` y listas de precios no cambian
