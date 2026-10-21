## Purpose

Historias de usuario (ticket TX-34, cd `Es2985T0VnVBc95LqY2D`):
- Como comprador en el celular, quiero encontrar lo que busco aunque escriba con un error, sin
  tildes o con el nombre de la marca, y ver sugerencias mientras escribo.
- Como comprador, quiero ordenar por lo más nuevo y lo más vendido, y no quedarme en una
  pantalla vacía cuando no hay resultados.

Requisitos no funcionales: el catálogo con búsqueda responde en 1 s o menos en caliente con
8.568 productos (F2-42·5); nunca se publican cantidades vendidas ni existencias; solo se
muestra lo vendible y visible del plan. Los requisitos marcados **(provisional, Pn)** aplican la
recomendación de la pregunta Pn.

## ADDED Requirements

### Requirement: Buscador tolerante
WHEN el comprador busca un término, THE system SHALL encontrar productos aunque el término no
tenga tildes, use otras mayúsculas o tenga un error de tipeo (una letra de más, de menos,
cambiada o dos vecinas intercambiadas) en palabras de 4 letras o más. THE system SHALL buscar en
el nombre, la referencia, la marca **(provisional, P17)** y la categoría y, WHERE el comercio
tiene encendidos los atributos por categoría, en los valores de atributos que muestra la ficha.
Cada palabra del término SHALL coincidir en algún campo. THE system SHALL NOT devolver productos
de categorías ocultas ni fuera del plan.

Fuente: ticket TX-34, viñeta 2; D-518 TX-34·8 y F2-42·8; F0-02 (ocultas fuera del buscador);
código del 21-oct (hoy solo una subcadena en título y referencia).

#### Scenario: Error de tipeo
- **WHEN** el comprador busca «tapete» y el producto se llama «Tapete Persa»
- **AND** también cuando escribe «tapte» o «TAPETE»
- **THEN** el producto aparece en los tres casos

#### Scenario: Por marca y categoría
- **WHEN** el comprador busca «tp-link router»
- **THEN** aparecen los productos de marca TP-Link de la categoría Routers

#### Scenario: Por atributo
- **WHEN** la tienda tiene encendidos los atributos y el comprador busca «wifi 6»
- **THEN** aparecen los productos con el atributo «Tecnología WiFi: WiFi 6»

### Requirement: Resultados ordenados por coincidencia
WHILE hay un término de búsqueda y el orden es «Lo más relevante», THE system SHALL ordenar
primero las coincidencias exactas, luego las que empiezan igual y luego las de un error, dando
más peso al nombre y a la referencia exacta que a la marca, la categoría y los atributos. Sin
término, «Lo más relevante» SHALL conservar el orden de hoy **(provisional, P3)**.

Fuente: D-518 TX-34·8 («ordena por coincidencia»); crítica del 21-oct («Lo más relevante» no
ordena nada).

#### Scenario: Exacta antes que aproximada
- **WHEN** el comprador busca «rosa» y existen «Rosa roja» y «Ropa de cama»
- **THEN** «Rosa roja» sale antes

### Requirement: Autocompletar
WHEN el comprador escribe 2 caracteres o más en un buscador de la tienda, THE system SHALL
mostrar debajo hasta 5 productos con foto y nombre, hasta 3 categorías y, si la tienda muestra
marcas, hasta 2 marcas, que se eligen con toque o con las flechas y Enter. THE system SHALL NOT
mostrar precios en la lista. IF la lista no se puede cargar, THEN buscar con Enter SHALL seguir
funcionando como hoy.

Fuente: ticket TX-34, viñeta 2 («buscador con autocompletar»); F2-44 (filtro de marcas apagado
por datos mal llenados); TX-35 (accesibilidad).

#### Scenario: Elegir con teclado
- **WHEN** el comprador escribe «cam», baja con la flecha a «Camisa lino» y pulsa Enter
- **THEN** llega a la ficha de «Camisa lino»

### Requirement: Orden por novedad y por más vendidos
THE system SHALL ofrecer el orden «Lo más nuevo», por la fecha de creación del producto, y «Lo
más vendido», por las unidades vendidas en los últimos 30 días, calculadas una vez por noche
**(provisional, P1 y P2)**, además de relevancia y precio. WHERE la tienda todavía no tiene
ventas calculadas, o el cálculo de la noche quedó incompleto, THE system SHALL NOT ofrecer «Lo
más vendido». THE system SHALL NOT mostrar
cantidades vendidas en ninguna parte del sitio.

Fuente: ticket TX-34, viñeta 3; D-518 TX-34·4; F2-45 y F2-18 (descartaron «más vendidos» por el
costo de calcularlo en cada visita); crítica del 21-oct (ranking truncado).

#### Scenario: Producto sin fecha
- **WHEN** el comprador ordena por «Lo más nuevo» y un producto viejo no tiene fecha de creación
- **THEN** ese producto sale al final

#### Scenario: Tienda nueva
- **WHEN** una tienda publicada hoy no tiene ventas calculadas
- **THEN** el selector de orden no muestra «Lo más vendido»

#### Scenario: Cálculo incompleto
- **WHEN** la tarea de la noche llega a su tope de lectura antes de leer todos los pedidos
- **THEN** la tienda no ofrece «Lo más vendido» hasta un cálculo completo

### Requirement: Búsqueda sin resultados con sugerencias
IF una búsqueda no encuentra productos, THEN THE system SHALL mostrar, además del mensaje, la
corrección del término cuando exista una que sí dé resultados («¿Quisiste decir…?»), hasta 4
categorías visibles y un enlace a todo el catálogo, y WHERE la tienda tiene WhatsApp, «Pregúntanos
por WhatsApp». WHEN el comprador envía la búsqueda (no mientras escribe), THE system SHALL
registrar la búsqueda sin resultado una vez por término y por visita, con el término saneado,
sin números de 5 cifras o más **(provisional, P8)**.

Fuente: ticket TX-34, viñeta 5 («búsqueda sin resultados (sugerencias)»); F3-25 (dejó fuera las
búsquedas sin resultado porque el evento no existía); crítica del 21-oct (la búsqueda corre
mientras se escribe).

#### Scenario: Corrección
- **WHEN** el comprador busca «tepetis» (dos errores) y no hay resultados
- **THEN** ve «¿Quisiste decir tapetes?» si ese término sí encuentra productos

#### Scenario: Sin nada que sugerir
- **WHEN** ninguna corrección da resultados
- **THEN** ve las categorías y «Ver todo el catálogo», nunca una categoría oculta
