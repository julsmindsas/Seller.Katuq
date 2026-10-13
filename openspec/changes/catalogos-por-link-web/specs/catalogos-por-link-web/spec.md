## ADDED Requirements

### Requirement: Acceso desde el menú Cotizaciones
El sistema SHALL mostrar la entrada "Catálogos por link" dentro del menú Cotizaciones a todo usuario que ya pueda ver Cotizaciones, sin exigir que alguien edite los permisos del rol.

#### Scenario: Usuario con acceso a Cotizaciones
- **WHEN** un usuario cuyo rol incluye la pantalla de Cotizaciones abre el menú
- **THEN** ve "Catálogos por link" bajo Cotizaciones

#### Scenario: Usuario sin acceso a Cotizaciones
- **WHEN** un usuario cuyo rol no incluye Cotizaciones abre el menú
- **THEN** no ve "Catálogos por link"

#### Scenario: La entrada del constructor no cambia
- **WHEN** cualquier usuario abre "Mi página web"
- **THEN** la entrada "Catálogos" sigue abriendo las páginas del constructor, igual que antes

### Requirement: Lista de catálogos de la empresa
El sistema SHALL listar solo los catálogos de la empresa con la que inició sesión, del más nuevo al más viejo. Cada uno SHALL mostrar su nombre, cuántos productos tiene, su estado (Activo, Apagado o Vencido), las vistas y los pedidos recibidos.

#### Scenario: Empresa con catálogos
- **WHEN** el vendedor entra a "Catálogos por link"
- **THEN** ve sus catálogos con nombre, productos, estado, vistas y pedidos recibidos

#### Scenario: Catálogo vencido
- **WHEN** un catálogo está activo y su fecha de vencimiento ya pasó
- **THEN** su estado aparece como "Vencido" y no como "Activo"

#### Scenario: Sin catálogos
- **WHEN** la empresa no tiene catálogos
- **THEN** se muestra un estado vacío que explica para qué sirven y ofrece crear el primero

#### Scenario: Falla al cargar
- **WHEN** no se puede traer la lista
- **THEN** se muestra un mensaje que dice qué pasó y ofrece reintentar, sin jerga técnica

### Requirement: Crear un catálogo
El sistema SHALL permitir crear un catálogo con nombre obligatorio, descripción y fecha de vencimiento opcionales, y entre 1 y 200 productos elegidos con buscador, foto y precio de referencia.

#### Scenario: Creación válida
- **WHEN** el vendedor escribe un nombre, elige al menos un producto y guarda
- **THEN** el catálogo queda creado y activo, y se abre su detalle

#### Scenario: Faltan datos
- **WHEN** el nombre está vacío o no hay productos elegidos
- **THEN** el botón Guardar queda deshabilitado y se indica qué falta

#### Scenario: Más de 200 productos
- **WHEN** el vendedor intenta pasar de 200 productos
- **THEN** el sistema no lo permite y explica el límite

### Requirement: Compartir el link
El sistema SHALL generar el link público del catálogo cuando se pida, y SHALL permitir copiarlo y compartirlo por WhatsApp. El link SHALL usar el dominio desde el que el vendedor abrió la web.

#### Scenario: Primer link
- **WHEN** el vendedor pide el link de un catálogo que todavía no tiene
- **THEN** se genera y se muestra completo, listo para copiar

#### Scenario: Link existente
- **WHEN** el catálogo ya tiene link
- **THEN** se muestra el mismo link de siempre, sin generar uno nuevo

#### Scenario: Copiar
- **WHEN** el vendedor toca Copiar
- **THEN** el link queda en el portapapeles y se confirma con un aviso

#### Scenario: Catálogo apagado o vencido
- **WHEN** el catálogo está apagado o vencido
- **THEN** junto al link se advierte que el comprador no lo podrá abrir

### Requirement: Prender y apagar
El sistema SHALL permitir prender y apagar un catálogo. Apagar SHALL pedir confirmación, porque el link deja de abrir para cualquiera que lo tenga.

#### Scenario: Apagar
- **WHEN** el vendedor apaga un catálogo y confirma
- **THEN** el catálogo queda Apagado y la vista lo refleja sin recargar la página

#### Scenario: Prender
- **WHEN** el vendedor prende un catálogo apagado
- **THEN** queda Activo, salvo que esté vencido, en cuyo caso se avisa que hay que cambiar la fecha

### Requirement: Editar datos y productos
El sistema SHALL permitir cambiar el nombre, la descripción, la fecha de vencimiento y los productos de un catálogo. Al guardar SHALL enviar solo lo que cambió, y SHALL deshabilitar Guardar cuando no haya cambios.

#### Scenario: Cambiar productos
- **WHEN** el vendedor agrega o quita productos y guarda
- **THEN** el detalle muestra la lista nueva y el link sigue siendo el mismo

#### Scenario: Sin cambios
- **WHEN** el vendedor abre la edición y no modifica nada
- **THEN** Guardar está deshabilitado y no se envía nada

### Requirement: Productos que el comprador no ve
El detalle SHALL listar los productos con su foto, precio actual y disponibilidad, y SHALL avisar cuántos no ve el comprador por estar agotados.

#### Scenario: Productos agotados
- **WHEN** un catálogo de 3 productos tiene 1 agotado
- **THEN** el detalle dice "1 sin existencias: el comprador no lo ve" y marca ese producto como Agotado

### Requirement: Los pedidos llegan como cotizaciones
El detalle SHALL explicar que lo que pide el comprador llega como cotización, con acceso directo a la lista de cotizaciones.

#### Scenario: Ir a las cotizaciones
- **WHEN** el vendedor toca el acceso a cotizaciones desde el detalle
- **THEN** se abre la lista de cotizaciones

### Requirement: Sin efectos fuera del catálogo
La pantalla SHALL escribir solo en el catálogo (crear, editar, generar link). No SHALL modificar productos, precios, inventario, pedidos ni cotizaciones.

#### Scenario: Editar no toca el maestro
- **WHEN** se crea, edita, apaga o comparte un catálogo
- **THEN** producto, variantes, precio, listas de precios e inventario permanecen sin cambios
