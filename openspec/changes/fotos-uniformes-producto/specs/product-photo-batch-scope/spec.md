> **[D-518, pendiente de aprobación]** Capacidad nueva de la ampliación del 21-oct: desde dónde se uniforma y qué entra en un lote. Diseño: `design-ampliacion.md` §A3 a §A5.

## ADDED Requirements

### Requirement: Uniformar desde el editor del sitio
WHERE la empresa tiene encendida la función, el editor del sitio SHALL ofrecer «Uniformar fotos» en la sección de productos elegidos, con esos productos, el mismo diálogo, la misma vista previa y las mismas reglas que la lista de productos. WHEN el diálogo se cierra después de aplicar o revertir, el editor SHALL mostrar las fotos nuevas de los productos de la sección.

Fuente: D-518 TX-37·1 («El mismo diálogo se abre desde la sección de productos del sitio y desde Catálogos por link»); ticket 1252, «Herramienta en el catálogo y en el editor».

#### Scenario: Sección de productos elegidos
- **WHEN** una administradora de FLORECER abre la sección «Productos» de su sitio, con 8 productos elegidos, y toca «Uniformar fotos de estos productos»
- **THEN** ve la vista previa de esos productos y, al aplicar y cerrar, la sección muestra las fotos uniformadas

#### Scenario: Comercio sin la función
- **WHEN** un comercio sin la función abre el editor de su sitio
- **THEN** no ve ninguna opción nueva

### Requirement: Uniformar desde un catálogo por link
WHERE la empresa tiene encendida la función, el detalle de un catálogo por link guardado SHALL ofrecer «Uniformar fotos de este catálogo» con los productos del catálogo, y SHALL mostrar las fotos nuevas al cerrar.

Fuente: D-518 TX-37·1; ticket 1252, criterio 2 («las fotos procesadas se usan en … el catálogo digital»); ticket 1259 (cd 3UrH47Mko7eruBnF4tak), que muestra el problema en un catálogo por link.

#### Scenario: Catálogo de 150 productos
- **WHEN** una administradora uniforma las fotos de un catálogo por link con 150 productos
- **THEN** el diálogo le dice que se harán 2 lotes seguidos y, al terminar, el catálogo muestra las fotos uniformadas

### Requirement: La categoría se elige por su ruta e incluye sus subcategorías
WHEN se uniforma una categoría, el sistema SHALL incluir los productos de esa categoría y de todas sus subcategorías, comparando la ruta completa en el árbol del comercio, y SHALL NOT incluir productos de otra categoría cuyo nombre solo contenga el elegido. IF un producto no tiene categoría o no se puede ubicar con certeza en el árbol, THEN el sistema SHALL dejarlo fuera y decir cuántos fueron.

Fuente: D-518 TX-37·4 («La categoría se compara por ruta exacta con sus subcategorías»); ticket 1252, criterio 1.

#### Scenario: Nombre parecido
- **WHEN** FLORECER uniforma la categoría «Flores», y tiene además la categoría «Flores secas»
- **THEN** entran «Flores» y sus subcategorías, y no entra ningún producto de «Flores secas»

#### Scenario: Subcategoría
- **WHEN** se uniforma «Flores» y existe «Flores › Rosas»
- **THEN** los productos de «Rosas» también entran

#### Scenario: Producto sin ubicar
- **WHEN** 3 productos de la empresa tienen una categoría que no está en su árbol
- **THEN** no entran al lote y el diálogo dice que 3 productos no se pudieron ubicar

### Requirement: Categorías y selecciones grandes en lotes seguidos
WHEN una categoría o una selección pasa del tope de un lote, el sistema SHALL partirla sola en lotes seguidos, uno a la vez, y SHALL mostrar el avance de la serie completa. IF un lote de la serie se cancela, se detiene o falla por cualquier motivo, THEN el sistema SHALL cerrar los que faltan sin procesarlos, SHALL mostrar la serie como terminada y SHALL dejar reversible lo ya aplicado. IF mientras corre la serie la empresa activa una integración que escribe fotos, THEN el sistema SHALL detener la serie antes del siguiente lote. WHEN una persona revierte la serie, el sistema SHALL revertir todos sus lotes. IF la selección pasa del tope de una serie, THEN el sistema SHALL pedir que se elija una parte más pequeña, sin procesar nada.

Fuente: D-518 TX-37·4 («El sistema parte solo en lotes seguidos de 100»); D-518 TX-37·5 (exclusión por integraciones que escriben fotos); ticket 1252, criterio 1 («una categoría completa en pocos clics»).

#### Scenario: Categoría de 340 productos
- **WHEN** una administradora aplica a una categoría de 340 productos
- **THEN** se hacen 4 lotes seguidos (100, 100, 100 y 40) con un solo clic, y el diálogo muestra la parte en curso y el total

#### Scenario: Cancelar a mitad
- **WHEN** cancela en el segundo lote
- **THEN** el segundo para al cerrar el producto en curso, el tercero y el cuarto no empiezan, la serie queda terminada y lo aplicado se puede revertir

#### Scenario: Revertir con el interruptor apagado
- **WHEN** el interruptor general se apaga con una serie a medias y un administrador revierte
- **THEN** los lotes que esperaban quedan cerrados, la serie se ve terminada y vuelven las fotos originales de lo aplicado

#### Scenario: Reintento
- **WHEN** el navegador manda dos veces la misma serie
- **THEN** existe una sola serie

### Requirement: Catálogo completo del sitio (pendiente de la pregunta 4)
**[Solo si Daniel lo confirma]** WHERE la empresa tiene encendida la función, la sección de catálogo completo del editor del sitio SHALL ofrecer «Uniformar fotos por categoría», con un paso para elegir la categoría y las mismas reglas que la lista de productos.

Fuente: recomendación de esta ampliación (pregunta 4); ticket 1252, «Herramienta … en el editor». D-518 TX-37·1 no nombra esta sección.

#### Scenario: Elegir la categoría
- **WHEN** una administradora abre «Uniformar fotos por categoría» desde la sección de catálogo completo y elige «Flores»
- **THEN** el diálogo sigue igual que desde la lista de productos, con «Flores» y sus subcategorías
