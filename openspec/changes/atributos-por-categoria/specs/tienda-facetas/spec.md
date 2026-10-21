## ADDED Requirements

> D-495, ampliación del 2026-10-21 (F2), **pendiente de aprobación**. Ticket 1234 (F2-42, cd
> `E4M12SqXLlyFBNHbflf8`). «La función» es la bandera `categoryAttributes` del comercio; no hay
> otro interruptor (D-518 F2-42·7). Fuera: disponibilidad (F2-42·1), valoración (F2-42·2) y
> búsqueda dentro de los atributos, que es de TX-34 (F2-42·8).

### Requirement: Conteos correctos después de filtrar [F2, criterio 1]

WHERE la función está encendida, THE system SHALL ofrecer en el catálogo filtros por categoría, marca, precio, oferta, ocasión y por los atributos marcados «usar como filtro», y SHALL mostrar junto a cada valor cuántos productos verá el visitante al marcarlo. Cada conteo SHALL calcularse con todos los filtros activos menos el de su propio grupo, sumando (O) los valores marcados dentro de un grupo y cruzando (Y) los grupos, y solo sobre lo vendible y lo que el plan deja ver.

*Fuente: ticket 1234, criterio 1, literal: «En la categoría Networking de Baudio se puede filtrar por marca, precio, tecnología WiFi y velocidad, con conteos correctos»; comentario 1 (los conteos se calculan antes de filtrar). El piloto se hace en FLORECER; el criterio se acepta en la tienda de Baudio.*

#### Scenario: Criterio 1 del ticket

- **WHEN** el visitante entra a «Networking» en la tienda de Baudio, con el filtro de marcas encendido
- **THEN** puede filtrar por marca, precio, tecnología WiFi y velocidad
- **AND** cada conteo es igual al número de productos que aparecen al marcar ese valor

#### Scenario: Un grupo no se cuenta contra sí mismo

- **WHEN** el visitante marca «WiFi 6» en «Tecnología WiFi»
- **THEN** los conteos de «Marca» cuentan solo productos «WiFi 6»
- **AND** «WiFi 5» sigue visible con su conteo y se puede sumar a la selección

#### Scenario: Varias marcas a la vez

- **WHEN** el visitante marca dos marcas
- **THEN** ve los productos de las dos y los conteos de los atributos cuentan sobre ambas

### Requirement: La categoría incluye sus subcategorías [F2]

WHEN el visitante elige una categoría, THE system SHALL mostrar también los productos de sus subcategorías, y SHALL contar en cada categoría los productos de sus subcategorías.

*Fuente: comentario 1 del ticket (un producto de «Networking > Routers» no sale en «Networking»).*

#### Scenario: Subcategoría

- **WHEN** el visitante elige «Networking»
- **THEN** aparecen los productos de «Networking > Routers»

### Requirement: El rango de precio es el de lo filtrado [F2]

WHEN hay filtros activos, THE system SHALL ofrecer como piso y tope del filtro de precio los de los productos que cumplen los demás filtros, sin contar el propio filtro de precio.

*Fuente: ticket 1234 («rango de precio»); D-518, ampliación pedida («rango de precio del filtro»).*

#### Scenario: Rango dentro de una categoría

- **WHEN** el visitante entra a «Networking» y la tienda tiene productos de $5.000 a $9.000.000
- **THEN** el rango ofrecido es el de los productos de «Networking»

### Requirement: Todos los valores, sin cortes [F2]

THE system SHALL ofrecer todos los valores de cada filtro que tengan productos, sin dejar por fuera categorías o marcas por cantidad, y MAY mostrar primero los de más productos con la opción de ver todos. WHEN el visitante abre la página de una marca que está en la tienda, THE system SHALL mostrarla, sin importar cuántas marcas tenga la tienda.

*Fuente: D-518, ampliación pedida («sin cortes de 24/40»).*

#### Scenario: Tienda con 60 marcas

- **WHEN** una tienda tiene 60 marcas y el visitante abre «Ver todas»
- **THEN** ve las 60 con su conteo, y la página de la marca 55 se abre

### Requirement: Filtros visibles, limpiables y compartibles [F2]

WHEN hay filtros activos, THE system SHALL mostrarlos como chips que se quitan uno a uno, ofrecer «Limpiar todo» y llevarlos en la dirección de la página. WHEN otra persona abre esa dirección, THE system SHALL mostrar los mismos filtros, productos y conteos. WHEN el visitante usa «atrás» en el navegador, THE system SHALL volver al filtro anterior.

*Fuente: ticket 1234 («“Limpiar todo”»); comentario 1 (no hay «Limpiar todo»).*

#### Scenario: Compartir una búsqueda filtrada

- **WHEN** el visitante copia la dirección con «WiFi 6» y una marca marcadas y otra persona la abre
- **THEN** la otra persona ve los mismos filtros, productos y conteos

#### Scenario: Limpiar todo

- **WHEN** el visitante pulsa «Limpiar todo» dentro de «Networking»
- **THEN** quedan los productos de «Networking», sin ningún otro filtro

### Requirement: Facetas en búsqueda y en la página de una marca [F2]

WHERE la función está encendida, THE system SHALL ofrecer los mismos filtros con conteo en los resultados de una búsqueda y en la página de una marca. IF no hay una categoría elegida, THEN THE system SHALL ofrecer los atributos de la categoría que comparten todos los resultados, si la hay. THE system SHALL mostrar el filtro de marca solo cuando el comercio tiene encendido el filtro de marcas de su catálogo.

*Fuente: D-518 F2-42·3 y F2-42·7; ticket 1236 (F2-44: «cada marca tiene su página con productos filtrables»).*

#### Scenario: Búsqueda de routers

- **WHEN** el visitante busca «router» y todos los resultados están en «Networking > Routers»
- **THEN** puede filtrar por los atributos de «Networking > Routers», con conteo

### Requirement: Precio del cliente mayorista [F2]

WHILE el visitante tiene sesión de cliente con lista de precios, THE system SHALL filtrar, calcular el rango y ordenar con el precio que ese cliente ve. THE system SHALL NOT mostrar ni usar precios de lista a quien no tiene sesión.

*Fuente: D-518 F2-42·4; ticket 1244 (F5-28: «precios mayoristas nunca visibles para visitantes no autenticados»).*

#### Scenario: Cliente mayorista ordena por precio

- **WHEN** un cliente con su lista ordena «Networking» de menor a mayor precio
- **THEN** el orden y el rango siguen los precios de su lista, que son los que ve

### Requirement: Rápido con miles de productos [F2]

WHEN la tienda ya tiene su catálogo cargado, THE system SHALL responder la consulta completa del catálogo con filtros y conteos (productos de la página, precios, calificaciones y, si hay sesión, precios del cliente) en 1 segundo o menos con un catálogo de 8.568 productos, y la página SHALL cumplir la meta de velocidad de TX-34.

*Fuente: D-518 F2-42·5; ticket 1234 («búsqueda y filtrado rápidos aun con miles de productos»); ticket 1249 (TX-34).*

#### Scenario: Catálogo grande

- **WHEN** un cliente con sesión filtra por tres grupos en un catálogo de 8.568 productos ya cargado
- **THEN** la respuesta completa llega en 1 segundo o menos en el 95 % de las consultas

### Requirement: Filtros accesibles [F2]

THE system SHALL permitir usar los filtros, los chips y «Limpiar todo» solo con el teclado, con foco visible y con un nombre que diga el valor y su conteo, y SHALL anunciar el nuevo total de productos al filtrar. La revisión automática de accesibilidad SHALL dar cero fallas en computador y en celular.

*Fuente: ticket 1250 (TX-35: WCAG 2.1 AA, «navegación completa con teclado; foco visible»).*

#### Scenario: Teclado

- **WHEN** una persona marca «WiFi 6» con el teclado
- **THEN** oye o ve «WiFi 6, 12 productos» y luego el nuevo total
