## ADDED Requirements

### Requirement: Evento del producto (F1)
Cada vez que alguien o algo guarda un cambio en un producto, el sistema SHALL registrar exactamente un evento con:

- la fecha y la hora del servidor;
- el usuario, con su nombre, correo y rol de ese momento, o «Sistema» o la integración;
- el origen;
- el tipo de evento;
- los detalles: cada campo con su nombre legible, su valor antes y su valor después;
- el lote, cuando el cambio viene de una importación o de una acción masiva;
- el motivo, cuando la persona lo escribe.

Los cambios guardados en una misma acción SHALL quedar en un solo evento con varios detalles.

#### Scenario: Dos campos en un guardado
- **WHEN** una persona cambia el nombre y la marca de un producto y guarda una vez
- **THEN** queda un evento «Producto editado» con dos detalles, cada uno con su antes → después

### Requirement: Origen confiable (F1)
El origen SHALL ser uno de estos: Katuq (web o app), Importación, Claude/MCP, Opttia, Cereza, Shopify, WooCommerce, Siigo, Proveedor, Compras o Sistema. El servidor SHALL determinarlo a partir de la sesión o del canal autenticado, nunca de un dato libre que mande el cliente. IF no se puede determinar, THEN SHALL registrar «Sistema» y dejar una traza estructurada, sin datos personales, para corregir la clasificación.

#### Scenario: Cambio desde Claude
- **WHEN** una persona cambia la descripción de un producto con la herramienta de Katuq en Claude
- **THEN** el evento muestra el nombre de esa persona y el origen «Claude/MCP»

### Requirement: Precios y costos con variación (F1)
WHEN cambia el precio base, el precio de un tipo de cliente, un precio por volumen o el costo, el evento SHALL indicar:

- qué precio cambió: base, el tipo de cliente (Público, Mayoristas, Modelos…), el rango de volumen o el costo;
- el valor antes y el valor después;
- la variación en pesos y en porcentaje.

Quitar un precio SHALL quedar como «sin precio» en el después. Si al cambiar un tipo de cliente también cambia el precio base, el mismo evento SHALL mostrar los dos cambios.

#### Scenario: Caso GCJ1236 del 23-oct
- **WHEN** una persona sube el precio «Modelos» de GCJ1236 de $42.621 a $78.291
- **THEN** queda un evento «Precio cambiado», con la lista «Modelos», $42.621 → $78.291, +$35.670 (+83,7 %), la persona, la hora y el origen

### Requirement: Solo cambios reales
El sistema SHALL NOT registrar eventos cuando el guardado deja los mismos valores. Los campos técnicos SHALL NOT generar eventos por sí solos: índices de búsqueda, marcas de sincronización, identificadores externos, marcas internas y la propia fecha de última edición.

#### Scenario: Sincronización sin cambios
- **WHEN** una sincronización reescribe un producto con los mismos nombre, precios y estado
- **THEN** no queda ningún evento para ese producto

### Requirement: Creación, inactivación y eliminación (F1)
El sistema SHALL registrar:

- la **creación** de un producto, con un resumen de sus datos iniciales: referencia, nombre, categoría, estado y precios;
- cada cambio de **activo/inactivo** y de **disponible/agotado**;
- la **eliminación**, con la referencia y el nombre.

Al eliminar un producto, sus eventos anteriores SHALL conservarse.

#### Scenario: Producto inactivado por acción masiva
- **WHEN** una persona inactiva 30 productos con la acción masiva
- **THEN** quedan 30 eventos «Producto inactivado», uno por producto, con el mismo lote

### Requirement: Registro inmutable (F1)
Los eventos SHALL solo agregarse. Ninguna vía del sistema SHALL editarlos ni borrarlos, y ningún cliente SHALL escribirlos directamente. Una corrección SHALL ser un evento nuevo.

#### Scenario: Corrección de un error
- **WHEN** una persona corrige un precio que puso mal hace una hora
- **THEN** quedan los dos eventos, el del error y el de la corrección, en orden

### Requirement: Importaciones y acciones masivas (F1 precios, F2 productos)
WHEN una importación o una acción masiva cambia productos, el sistema SHALL registrar un evento por cada producto que cambió de verdad, todos con el mismo lote, el nombre del archivo o de la acción, y quien la ejecutó.

#### Scenario: Importación de precios
- **WHEN** una persona importa un Excel de precios que cambia 120 de 400 productos
- **THEN** quedan 120 eventos con el mismo lote y los otros 280 productos no tienen evento

### Requirement: Integraciones (F2)
WHEN una integración (Cereza, Shopify, WooCommerce, Siigo, un proveedor o compras) cambia un producto, el sistema SHALL registrar el evento con el origen de esa integración. Un mismo aviso o una corrida que se reintenta SHALL NOT duplicar el evento.

#### Scenario: Reintento de Shopify
- **WHEN** Shopify reenvía el mismo aviso de cambio de un producto
- **THEN** el historial muestra un solo evento

### Requirement: Productos anteriores reconstruidos (F2)
Para un producto sin eventos completos, el sistema SHALL armar al consultarlo, sin escribir nada:

- la última edición conocida, con quién y cuándo;
- los cambios de costo que ya existen en el registro de costos.

Todo lo armado SHALL quedar marcado «registro reconstruido».

#### Scenario: Producto editado antes de la F1
- **WHEN** el comercio abre el historial de un producto editado en septiembre
- **THEN** ve la última edición y los cambios de costo marcados «registro reconstruido»

### Requirement: El registro nunca bloquea el producto
Registrar un evento SHALL NOT demorar ni hacer fallar el guardado del producto, de la importación o de la sincronización. IF el registro falla, THEN el guardado SHALL completarse igual, y el sistema SHALL reintentar y dejar una traza estructurada con el identificador del producto y el tipo de evento, sin datos personales, y un conteo de fallas.

#### Scenario: Falla al registrar
- **WHEN** falla la escritura del evento de un cambio de precio
- **THEN** el precio queda guardado, la persona no ve error y la falla queda contada

### Requirement: Multiempresa, permisos y datos personales
Registrar y consultar eventos SHALL limitarse a la empresa de la sesión autenticada (la del token, no un encabezado). IF se pide el historial de un producto de otra empresa, THEN la respuesta SHALL ser la misma que si no existiera. Los eventos de costo SHALL verse solo por quien hoy puede ver costos. Los logs SHALL NOT contener datos personales completos.

#### Scenario: Vendedor sin acceso a costos
- **WHEN** un vendedor que no ve costos abre el historial de un producto
- **THEN** ve los cambios de nombre y precios, pero no los de costo

### Requirement: El inventario no escribe productos (D-134)
El registro de eventos SHALL NOT escribir productos, precios, listas, inventario ni movimientos. Los ajustes y movimientos de inventario SHALL NOT generar eventos de producto.

#### Scenario: Ajuste de existencias
- **WHEN** una persona ajusta las existencias de un producto en una bodega
- **THEN** el producto, sus variantes, sus precios y sus listas de precios siguen sin cambios y su historial no tiene evento nuevo
