## Purpose

Historias de usuario (ticket TX-34, cd `Es2985T0VnVBc95LqY2D`):
- Como comprador que llega desde WhatsApp o redes al celular, quiero moverme por la tienda y
  comprar con el pulgar, sin ampliar la página ni desplazarme de lado.
- Como comercio, quiero que la vista previa del editor en «Celular» muestre lo que verá mi
  comprador.

Requisitos no funcionales: accesible con teclado y lector de pantalla (TX-35); respeta los
ajustes de Estilo del comercio (F2-17); sin cambios en computador. Los requisitos marcados
**(provisional, Pn)** aplican la recomendación de la pregunta Pn de la propuesta.

## ADDED Requirements

### Requirement: Menú en cajón lateral en celular
WHERE la pantalla mide 767 px o menos y la página tiene menú, THE system SHALL mostrar en la
cabecera un botón «Menú» que abre un panel lateral con las categorías visibles, los enlaces del
menú del comercio, «Mi cuenta» y «Favoritos» si la tienda vende, y WhatsApp si está configurado
**(provisional, P16)**, en lugar de la fila horizontal de categorías y los enlaces sueltos.
WHEN el comprador toca ✕, pulsa Escape, toca fuera del panel o sigue un enlace, THE system
SHALL cerrarlo y devolver el foco al botón «Menú». THE system SHALL NOT mostrar en el panel una
categoría que el comercio ocultó. IF el navegador no ejecuta JavaScript, THEN el botón SHALL
desplegar la misma lista dentro de la cabecera. Desde 768 px y en el modo conversión, la
cabecera SHALL verse como hoy.

Fuente: ticket TX-34, viñeta 1 («menú en cajón lateral claro»); D-518 TX-34·5; F1-10 («menú
propio para celular», no construido); F0-02 (categorías ocultas); F2-19 (modo conversión).

#### Scenario: Abrir y cerrar con teclado
- **WHEN** el comprador enfoca «Menú», pulsa Enter y luego Escape
- **THEN** el panel se abre con el foco dentro, se cierra y el foco vuelve a «Menú»

#### Scenario: Categoría oculta
- **WHEN** el comercio oculta la categoría «Insumos internos»
- **THEN** no aparece en el panel ni en ningún otro menú del sitio

#### Scenario: Tienda sin categorías
- **WHEN** la página no tiene catálogo y el menú tiene 6 enlaces
- **THEN** los enlaces van dentro del panel y la cabecera ocupa una sola línea

#### Scenario: Sin JavaScript
- **WHEN** el navegador no ejecuta JavaScript y el comprador toca «Menú»
- **THEN** ve las categorías y los enlaces debajo de la cabecera, sin cambiar de página

### Requirement: La vista previa del editor muestra lo mismo
WHEN el comercio elige «Celular» en la vista previa del editor, THE system SHALL mostrar el
cajón lateral, los campos de 16 px y las áreas táctiles de esta spec igual que el sitio
publicado.

Fuente: D-518 TX-34·5 («también en la vista previa del editor»); crítica del 21-oct
(`sitio-render` es espejo del render publicado y no tiene los 16 px de D-461).

#### Scenario: Previa en celular
- **WHEN** el comercio cambia la previa a «Celular» en una tienda con categorías
- **THEN** ve el botón «Menú» y no la fila horizontal

### Requirement: Áreas táctiles de 44 px
WHILE la pantalla mide 767 px o menos, THE system SHALL dar a cada control interactivo del sitio
publicado un área de toque de al menos 44 × 44 px: sumar y restar en el carrito, «Quitar», cerrar
paneles, flechas de página y de fila, botones de la cabecera, chips de filtro, favoritos,
«Avísame», «Filtrar», «Menú» y los botones del aviso de cookies.

Fuente: ticket TX-34, viñeta 1 («áreas táctiles de al menos 44 px»); código del 21-oct
(carrito 26 px, flechas 40 px, cabecera ~31 px).

#### Scenario: Cambiar la cantidad en el carrito
- **WHEN** el comprador abre el carrito a 360 px
- **THEN** «+», «−» y «Quitar» miden cada uno 44 × 44 px o más

### Requirement: Textos legibles sin zoom
WHILE la pantalla mide 767 px o menos, THE system SHALL NOT mostrar en el recorrido de compra
textos de menos de 12 px, y los controles con texto SHALL medir 14 px o más
**(provisional, P20)**.

Fuente: ticket TX-34, viñeta 1 («textos legibles sin zoom»); código del 21-oct («Quitar» con
0,8 rem en el carrito).

#### Scenario: «Quitar» en el carrito
- **WHEN** el comprador abre el carrito a 360 px
- **THEN** «Quitar» se lee en 14 px o más sin ampliar la página

### Requirement: Elementos fijos que no se tapan
WHILE la pantalla mide 767 px o menos, THE system SHALL mantener visibles y sin cruzarse la barra
de compra de la ficha, el carrito flotante, el botón de WhatsApp, el aviso de cookies y el
asesor KAI, y SHALL NOT tapar con ninguno de ellos el botón principal de la pantalla.

Fuente: ticket TX-34, viñeta 1 («botón de compra fijo»); D-255 (barra de la ficha); F3-26,
D-463 (aviso de cookies encendido en sitios nuevos, fijo en celular); crítica del 21-oct.

#### Scenario: Ficha con aviso de cookies
- **WHEN** un comprador nuevo abre una ficha a 390 px y no ha respondido el aviso de cookies
- **THEN** ve la barra de compra, el aviso y el carrito sin que se crucen, y puede agregar al
  carrito

### Requirement: Panel de filtros deslizable que se cierra como se espera
WHILE la pantalla mide 899 px o menos, THE system SHALL abrir los filtros en un panel con
«Filtrar». WHEN el comprador toca ✕, pulsa Escape o toca fuera del panel, THE system SHALL
cerrarlo y devolver el foco a «Filtrar».

Fuente: ticket TX-34, viñeta 1 («filtros en panel deslizable»); código del 21-oct (hoy solo
cierra con ✕ o al elegir un chip). «Limpiar todo» y los conteos son de F2-42.

#### Scenario: Cerrar tocando fuera
- **WHEN** el comprador abre «Filtrar» y toca el fondo oscuro
- **THEN** el panel se cierra y los filtros elegidos siguen aplicados

### Requirement: Compra completa en celular, probada
THE system SHALL permitir una compra completa (portada, búsqueda o catálogo, ficha, carrito,
checkout y paso a la pasarela) a 360 y 390 px sin ampliar la página y sin desplazamiento
horizontal: en cada paso el ancho del contenido es igual al de la pantalla y cada campo de texto
mide 16 px o más. Esto SHALL quedar como una prueba automatizada repetible que también comprueba
las áreas de 44 px, los textos legibles y los elementos fijos, en todas las plantillas
publicables.

Fuente: ticket TX-34, criterio 2; comentario 1 del 16-oct (revisión a mano en 5 sitios, sin
catálogo ni pasarela); crítica del 21-oct (sin prueba en el repositorio).

#### Scenario: Plantilla con catálogo grande
- **WHEN** la prueba recorre la plantilla «Tecnología — Catálogo grande» a 360 px
- **THEN** ningún paso tiene desplazamiento horizontal ni campos de menos de 16 px

#### Scenario: Regresión
- **WHEN** un cambio deja un botón del carrito en 30 px
- **THEN** la prueba falla y nombra el control y la plantilla
