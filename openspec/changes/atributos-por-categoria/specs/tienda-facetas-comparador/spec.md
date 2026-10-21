## ADDED Requirements

> D-495 (ticket 1234, F2-42). «La función» es la bandera por comercio. Fase entre corchetes.
>
> **Ampliación del 2026-10-21 (pendiente de aprobación, D-518):** los requisitos de F2
> («Filtros con conteo correcto dentro de una categoría», «Filtros visibles, limpiables y
> compartibles»), F4 («Comparador de hasta 4 productos») y F5 («Feed con detalles técnicos»),
> aprobados el 18-oct, pasan reescritos a `tienda-facetas`, `tienda-comparador` y
> `catalogo-feed-atributos`. Cambios: sin interruptores extra (F2-42·7), facetas también en
> búsqueda y marca (F2-42·3), precio del cliente mayorista (F2-42·4), meta de 1 s (F2-42·5) y
> Meta y JSON-LD según la documentación oficial (F2-42·6). El texto aprobado queda en el
> historial de git (f6417dcd). Los requisitos de F1 siguen abajo; cambian, marcados, el de los
> buscadores (criterio), el de la función apagada (plazo del feed) y el de velocidad (lectura del
> comparador).

### Requirement: La ficha muestra las especificaciones sin escribirlas a mano [F1, criterio 2]

WHERE la función está encendida y el producto tiene valores válidos, THE system SHALL mostrar en la ficha de la tienda las pestañas «Especificaciones» y «Compatibilidad», con etiqueta, valor y unidad en el orden definido en la categoría, números en formato colombiano y «Sí»/«No». IF una sección no tiene valores, THEN THE system SHALL omitirla. IF el producto no tiene ningún valor, THEN THE system SHALL mostrar la ficha igual a hoy. Sin JavaScript, las dos secciones SHALL verse una debajo de la otra.

#### Scenario: Criterio 2 del ticket

- **WHEN** un visitante abre la ficha de un router de «Networking > Routers» con sus valores cargados
- **THEN** ve la tabla de especificaciones con «Tecnología WiFi», «Velocidad (Mbps)» y «Puertos LAN»
- **AND** el comercio no escribió esa tabla en la descripción

#### Scenario: Valor huérfano

- **WHEN** el producto guarda un valor cuyo atributo ya no existe en su categoría
- **THEN** ese valor no aparece en la ficha

### Requirement: Los buscadores reciben las especificaciones [F1; criterio AMPLIADO el 21-oct, pendiente]

WHEN la ficha muestra especificaciones, THE system SHALL publicarlas en los datos estructurados del producto como propiedades adicionales, cada una con nombre, valor y, si tiene, unidad. THE system SHALL NOT sumar errores ni advertencias a la prueba de resultados enriquecidos de Google frente a la ficha sin especificaciones.

*Fuente: ticket 1234 («atributos incluidos en los datos estructurados para SEO»); D-518 F2-42·6 («el JSON-LD se valida con el Schema Markup Validator»); schema.org `additionalProperty` (Product → PropertyValue). Google no lista esa propiedad entre las de producto, así que no se promete un resultado enriquecido por ella.*

#### Scenario: Validador de schema.org

- **WHEN** la ficha de un producto con especificaciones se pasa por el Schema Markup Validator
- **THEN** cada especificación aparece como propiedad del producto con su nombre, su valor y su unidad, sin errores

#### Scenario: Prueba de Google sin retroceso

- **WHEN** la misma ficha se pasa por la prueba de resultados enriquecidos de Google
- **THEN** no aparecen errores ni advertencias que no tuviera la ficha sin especificaciones

### Requirement: Con la función apagada la tienda queda como hoy [F1–F5; plazo del feed AMPLIADO el 21-oct, pendiente]

WHILE la función está apagada para el comercio, THE system SHALL responder el catálogo, la ficha, los datos del producto para agentes y el feed exactamente como hoy, y SHALL NOT ofrecer facetas de atributos ni comparador. WHEN se apaga la función, THE system SHALL dejar de mostrar todo lo anterior en la tienda en máximo 12 minutos, y SHALL volver al feed de hoy en máximo 35 minutos.

*Fuente del cambio: el feed se guarda 30 minutos en cachés intermedias (pregunta 14 de la propuesta).*

#### Scenario: Apagar en caliente

- **WHEN** se apaga la función de un comercio que ya mostraba especificaciones
- **THEN** en máximo 12 minutos la ficha, los datos para agentes y el catálogo vuelven a ser los de hoy
- **AND** los atributos y valores guardados siguen intactos

### Requirement: La tienda no se vuelve más lenta [F1–F5]

THE system SHALL NOT sumar lecturas a la base de datos por cada consulta del catálogo ni por cada vista de ficha; solo se permite la recarga periódica por tienda que ya existe. Un cambio de atributos SHALL verse en la tienda en el mismo plazo en que hoy se ve un cambio de producto. La meta de tiempo de las facetas está en `tienda-facetas`. La comparación de productos, que es una consulta aparte, SHALL leer a lo sumo los productos comparados (declarado el 21-oct, pendiente).

#### Scenario: Muchas visitas a fichas

- **WHEN** una tienda con la función encendida recibe cientos de vistas de ficha en 5 minutos
- **THEN** los atributos se leen a lo sumo una vez por recarga periódica, no una vez por vista
