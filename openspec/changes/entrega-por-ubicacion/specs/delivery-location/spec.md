## ADDED Requirements

### Requirement: Entrega por ubicación sin nomenclatura
El modal de dirección de entrega SHALL ofrecer el modo "Solo ubicación", en el que la entrega se registra con ciudad obligatoria, referencia opcional y un punto en el mapa, sin exigir nomenclatura.

#### Scenario: Finca sin dirección
- **WHEN** el usuario elige "Solo ubicación", selecciona la ciudad Yumbo, escribe la referencia "Finca El Lago, vía Yumbo" y marca un punto
- **THEN** el modal confirma la entrega sin pedir calle, carrera ni número

#### Scenario: Falta el punto
- **WHEN** el usuario elige "Solo ubicación" y confirma sin haber marcado un punto
- **THEN** el modal no se cierra y le indica que marque la ubicación

#### Scenario: Falta la ciudad
- **WHEN** el usuario marca un punto pero no selecciona ciudad
- **THEN** el modal no se cierra y le indica que la ciudad es obligatoria

### Requirement: Formas de indicar el punto
El modal SHALL permitir indicar el punto de tres formas: clic en el mapa, pegar un enlace de Google Maps o unas coordenadas, y usar la ubicación del dispositivo.

#### Scenario: Enlace largo de Google Maps
- **WHEN** el usuario pega un enlace de Google Maps que contiene las coordenadas (formatos `@lat,lng`, `q=lat,lng`, `ll=lat,lng` o `query=lat,lng`)
- **THEN** el modal ubica el punto en esas coordenadas, lo muestra en el mapa y guarda el enlace pegado

#### Scenario: Coordenadas pegadas
- **WHEN** el usuario pega texto con la forma `lat, lng` (por ejemplo `3.5841, -76.4925`)
- **THEN** el modal ubica el punto en esas coordenadas

#### Scenario: Enlace que no se puede leer
- **WHEN** el usuario pega un enlace sin coordenadas, como `maps.app.goo.gl/...`
- **THEN** el modal le indica que abra el enlace y copie las coordenadas o marque el punto en el mapa, y no guarda ningún punto

#### Scenario: Ubicación del dispositivo
- **WHEN** el usuario pulsa "Usar mi ubicación" y el navegador concede el permiso
- **THEN** el modal ubica el punto en la posición del dispositivo

#### Scenario: Punto fuera de Colombia o inválido
- **WHEN** el punto indicado es `0,0`, está fuera de Colombia o no es un número válido
- **THEN** el modal lo rechaza con un mensaje y no lo guarda

### Requirement: Ubicación como complemento de la dirección
En los modos urbana, manzana y rural, el modal SHALL permitir corregir el punto obtenido por geocodificación, y SHALL guardar ese punto corregido como ubicación de la entrega.

#### Scenario: Corregir el punto de una dirección
- **WHEN** el usuario escribe una dirección, el sistema la geocodifica y el usuario mueve el punto a la entrada correcta de la finca
- **THEN** la entrega guarda la dirección escrita y el punto corregido

### Requirement: Origen de la ubicación y conservación
Cada entrega SHALL registrar el origen de su punto (`geocodificada`, `manual`, `enlace` o `gps`), y el sistema SHALL NOT volver a geocodificar, mover ni borrar un punto cuyo origen sea distinto de `geocodificada`.

#### Scenario: Editar una entrega con punto manual
- **WHEN** el usuario abre a editar una entrega cuyo punto es de origen `manual` y cambia solo la referencia
- **THEN** el punto se conserva igual

#### Scenario: Geocodificación que falla
- **WHEN** el usuario edita una entrega con punto de origen `enlace` y la geocodificación de la dirección escrita falla
- **THEN** el punto se conserva y no aparece vacío

#### Scenario: Despachos no pisa un punto manual
- **WHEN** en Despachos se fuerza la geocodificación de los pedidos de la lista
- **THEN** los pedidos con punto de origen distinto de `geocodificada` conservan su punto

#### Scenario: Venta asistida conserva el punto
- **WHEN** el vendedor edita o guarda una entrega en la venta asistida
- **THEN** el pedido conserva latitud, longitud, coordenadas, origen y enlace de esa entrega

### Requirement: Entrega completa con dirección o ubicación
El sistema SHALL considerar completa una entrega que tenga ciudad y, además, dirección escrita o un punto válido.

#### Scenario: Solo ubicación es completa
- **WHEN** una entrega tiene ciudad y punto válido pero no tiene dirección escrita
- **THEN** se puede guardar en el cliente y usar en un pedido

#### Scenario: Ni dirección ni punto
- **WHEN** una entrega tiene ciudad pero no tiene dirección ni punto
- **THEN** no se puede guardar

#### Scenario: Entregas actuales
- **WHEN** se abre una entrega guardada antes de este cambio, con dirección y sin origen de ubicación
- **THEN** se trata como hoy: completa si tiene dirección y ciudad, y su punto se considera de origen `geocodificada`

### Requirement: Texto de dirección nunca vacío
Cuando una entrega no tenga dirección escrita, el sistema SHALL guardar en el texto de dirección la referencia o, si no hay referencia, "Ubicación: lat, lng", para que la guía de envío, las notificaciones y las transportadoras reciban un texto.

#### Scenario: Con referencia
- **WHEN** se guarda una entrega solo con ubicación y la referencia "Finca El Lago, vía Yumbo"
- **THEN** el texto de dirección es "Finca El Lago, vía Yumbo"

#### Scenario: Sin referencia
- **WHEN** se guarda una entrega solo con ubicación y sin referencia
- **THEN** el texto de dirección es "Ubicación: 3.5841, -76.4925" con las coordenadas del punto

#### Scenario: Despacho por Enviame
- **WHEN** se despacha por Enviame un pedido cuya entrega es solo ubicación
- **THEN** la calle que se envía a Enviame no está vacía

### Requirement: Abrir la ubicación en un mapa
El detalle de entrega del pedido y Despachos SHALL mostrar un acceso "Abrir en Maps" cuando la entrega tenga un punto, y la guía de envío propia de Katuq SHALL incluir el enlace de esa ubicación.

#### Scenario: Abrir desde el pedido
- **WHEN** el usuario pulsa "Abrir en Maps" en un pedido con punto
- **THEN** se abre Google Maps en una pestaña nueva con ese punto

#### Scenario: Pedido sin punto
- **WHEN** la entrega del pedido no tiene punto
- **THEN** no aparece el acceso "Abrir en Maps"

#### Scenario: Guía de envío
- **WHEN** se genera la guía de envío propia de Katuq para un pedido con punto
- **THEN** la guía muestra el enlace de la ubicación

### Requirement: Alcance de datos
El cambio SHALL escribir solo los campos de entrega de `clients.datosEntrega[]` y de `orders.envio`, y SHALL NOT crear colecciones ni modificar inventario, productos, precios ni consecutivos.

#### Scenario: Guardar un pedido con entrega por ubicación
- **WHEN** se crea un pedido con una entrega solo por ubicación
- **THEN** el inventario, los productos, los precios y los consecutivos se comportan exactamente como en un pedido con dirección escrita
