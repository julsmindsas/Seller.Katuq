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

#### Scenario: Un solo producto

- **WHEN** el visitante tiene un solo producto y pulsa «Comparar (1)»
- **THEN** no se abre la comparación y ve «Elige al menos 2 productos para comparar»

#### Scenario: Quinto producto

- **WHEN** el visitante ya tiene 4 productos y agrega otro
- **THEN** ve «Máximo 4 productos» y la comparación sigue con los 4

### Requirement: Dónde aparece el comparador [F4]

THE system SHALL mostrar el botón «Comparar» en las tarjetas del catálogo y en la ficha, y SHALL NOT mostrarlo en otras tarjetas (bloque «productos», venta cruzada), que no pasan por los candados del catálogo. THE system SHALL NOT mostrar el comparador en la vista previa del editor ni en una tienda sin un bloque de catálogo visible publicado, aunque la función esté encendida. THE system SHALL mantener la barra «Comparar (n)» sin cruzarse con el aviso de cookies, el carrito, WhatsApp ni KAI. Cada aviso («Máximo 4 productos», «Quitado de la comparación», «Comparación vacía») SHALL anunciarse a los lectores de pantalla aunque la barra se esconda, y WHEN la barra se esconde con el foco adentro THE system SHALL pasar el foco a un botón de producto. WHEN la selección cambia en otra pestaña de la misma tienda, THE system SHALL reflejarla en la que está abierta.

*Fuente: revisión del bloque F242-B14 (3-nov-2026); ticket 1250 (TX-35).*

#### Scenario: Tienda sin catálogo visible

- **WHEN** la función está encendida pero el sitio publicado no tiene un bloque de catálogo visible
- **THEN** la tienda no muestra botón ni barra, y la comparación responde «no encontrado»

### Requirement: Productos de distintas categorías [F4]

WHEN la comparación tiene productos de categorías distintas, THE system SHALL mostrar todos los atributos comparables de todos, con una marca de «no aplica» donde la categoría de un producto no tiene ese atributo, distinta de «sin dato» donde la categoría lo tiene pero el producto no lo cargó; un «no aplica» no cuenta como valor distinto al resaltar.

*Fuente: diseño (pregunta 6 de la propuesta, por aprobar).*

#### Scenario: Router y repetidor

- **WHEN** se comparan un router y un repetidor
- **THEN** «Puertos LAN» del repetidor dice que no aplica

### Requirement: Solo productos que la tienda vende [F4]

THE system SHALL entregar para la comparación datos solo de productos que el catálogo de la tienda mostraría: de la misma empresa del sitio publicado con catálogo visible, activos, publicados en la web, con precio de venta al público, fuera de categorías ocultas y visibles en el plan. IF un producto pedido no cumple, THEN THE system SHALL dejarlo fuera sin entregar ningún dato suyo. THE system SHALL leer para cada comparación, con la tienda ya cargada, a lo sumo los productos comparados (más el sitio y, con sesión, el cliente); la primera petición después de que se vence la carga periódica de la tienda puede leer más, como ya ocurre en el catálogo.

*Fuente: comentario 1 del ticket y propuesta aprobada del 18-oct («mismos candados del catálogo»); ticket 1214 (F0-02: categorías ocultas); ticket 1244 (F5-28: precios mayoristas nunca visibles sin sesión).*

#### Scenario: Producto de otra empresa

- **WHEN** la comparación incluye el id de un producto de otra empresa
- **THEN** ese producto no aparece y no se entrega ningún dato suyo

#### Scenario: Producto sin precio al público

- **WHEN** la comparación incluye un producto que el catálogo de la tienda no muestra porque no tiene precio al público
- **THEN** ese producto no aparece y no se entrega ningún dato suyo

### Requirement: Precio del cliente en la comparación [F4]

WHILE el visitante tiene sesión de cliente con lista de precios, THE system SHALL mostrar en la comparación el precio de su lista. THE system SHALL NOT entregar ese precio a quien no tiene sesión, ni guardarlo donde otro visitante lo pueda recibir. IF el bloque de catálogo del sitio oculta los precios, THEN THE system SHALL NOT entregar ningún precio en la comparación, ni con sesión.

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
