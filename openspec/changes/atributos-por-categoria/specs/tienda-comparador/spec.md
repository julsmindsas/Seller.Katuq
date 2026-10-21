## ADDED Requirements

> D-495, ampliación del 2026-10-21 (F4), **pendiente de aprobación**. Ticket 1234 (F2-42).
> «La función» es la bandera `categoryAttributes`; el comparador no tiene interruptor propio
> (D-518 F2-42·7).

### Requirement: Comparar hasta 4 productos [F4]

WHERE la función está encendida, THE system SHALL permitir agregar productos a una comparación desde las tarjetas del catálogo y desde la ficha, hasta 4, y SHALL mostrarlos lado a lado con los atributos marcados «mostrar en comparador», resaltando los que tienen valores distintos. IF el visitante intenta agregar un quinto, THEN THE system SHALL avisarle que el máximo es 4 y no agregarlo. THE system SHALL guardar la selección solo en el navegador del visitante.

*Fuente: ticket 1234 («comparador de hasta 4 productos lado a lado»).*

#### Scenario: Comparar routers

- **WHEN** el visitante agrega tres routers y abre la comparación
- **THEN** ve los tres con «Tecnología WiFi», «Velocidad (Mbps)» y «Puertos LAN» en filas
- **AND** las filas con valores distintos están resaltadas

#### Scenario: Quinto producto

- **WHEN** el visitante ya tiene 4 productos y agrega otro
- **THEN** ve «Máximo 4 productos» y la comparación sigue con los 4

### Requirement: Productos de distintas categorías [F4]

WHEN la comparación tiene productos de categorías distintas, THE system SHALL mostrar todos los atributos comparables de todos, con una marca de «no aplica» donde un producto no tiene ese atributo.

*Fuente: diseño (pregunta 6 de la propuesta, por aprobar).*

#### Scenario: Router y repetidor

- **WHEN** se comparan un router y un repetidor
- **THEN** «Puertos LAN» del repetidor dice que no aplica

### Requirement: Solo productos que la tienda vende [F4]

THE system SHALL entregar para la comparación datos solo de productos que el catálogo de la tienda mostraría: de la misma empresa del sitio publicado con catálogo visible, activos, publicados en la web, con precio de venta al público, fuera de categorías ocultas y visibles en el plan. IF un producto pedido no cumple, THEN THE system SHALL dejarlo fuera sin entregar ningún dato suyo. THE system SHALL leer para cada comparación a lo sumo los productos comparados.

*Fuente: comentario 1 del ticket y propuesta aprobada del 18-oct («mismos candados del catálogo»); ticket 1214 (F0-02: categorías ocultas); ticket 1244 (F5-28: precios mayoristas nunca visibles sin sesión).*

#### Scenario: Producto de otra empresa

- **WHEN** la comparación incluye el id de un producto de otra empresa
- **THEN** ese producto no aparece y no se entrega ningún dato suyo

#### Scenario: Producto sin precio al público

- **WHEN** la comparación incluye un producto que el catálogo de la tienda no muestra porque no tiene precio al público
- **THEN** ese producto no aparece y no se entrega ningún dato suyo

### Requirement: Precio del cliente en la comparación [F4]

WHILE el visitante tiene sesión de cliente con lista de precios, THE system SHALL mostrar en la comparación el precio de su lista. THE system SHALL NOT entregar ese precio a quien no tiene sesión, ni guardarlo donde otro visitante lo pueda recibir.

*Fuente: D-518 F2-42·4; ticket 1244 (F5-28).*

#### Scenario: Con y sin sesión

- **WHEN** un cliente mayorista compara dos productos y después otra persona, sin sesión, compara los mismos
- **THEN** el cliente ve los precios de su lista y la otra persona ve los precios públicos

### Requirement: Comparación accesible y en celular [F4]

THE system SHALL permitir abrir, recorrer y cerrar la comparación con el teclado, con el foco dentro de ella mientras está abierta y visible en todo momento. WHEN la comparación se abre en un celular de 390 px, THE system SHALL mantener visible la columna de los nombres de los atributos y desplazar solo la tabla, sin desplazamiento horizontal de la página. La revisión automática de accesibilidad SHALL dar cero fallas.

*Fuente: ticket 1250 (TX-35); ticket 1249 (TX-34: «sin zoom ni desplazamiento horizontal»).*

#### Scenario: Celular

- **WHEN** se comparan 4 productos a 390 px
- **THEN** la página no se desplaza de lado y la tabla sí, con los nombres de los atributos a la vista

### Requirement: Con la función apagada no hay comparador [F4]

WHILE la función está apagada para el comercio, THE system SHALL NOT mostrar el botón ni la barra de comparación, y SHALL responder «no encontrado» a cualquier pedido de comparación.

*Fuente: D-385 (todo nace apagado); requisito «Con la función apagada la tienda queda como hoy».*

#### Scenario: Comercio sin la función

- **WHEN** alguien pide la comparación de productos de un comercio con la función apagada
- **THEN** recibe «no encontrado»
