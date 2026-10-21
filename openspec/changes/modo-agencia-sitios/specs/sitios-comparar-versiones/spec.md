# sitios-comparar-versiones

> **NUEVA (D-518, 21-oct), pendiente de aprobación del texto.** Cambio B. Cubre «comparar» del ticket 1253, que D-467 (TX-33) mandó aquí y que D-478 no hizo, y el historial «de cada página». «·N» es la decisión F5-29·N de D-518. Depende de la versión sin secretos del cambio A.

## ADDED Requirements

### Requirement: Ver qué cambia antes de restaurar
WHEN alguien abre una versión del historial, THE system SHALL mostrar en palabras lo que cambiaría en la página pública si se restaura esa versión, comparada con lo publicado ahora. Los cambios SHALL ir agrupados por página (Inicio y cada página propia) y, dentro de cada página, por sección. Las frases SHALL ser las mismas que usa KAI al contar lo que cambió.
Fuente: ·4; descripción del ticket («historial… comparar y restaurar»); D-467 (TX-33, ticket 1248).

#### Scenario: Restaurar una versión vieja
- **WHEN** el comercio abre la versión del 3 de octubre
- **THEN** ve, por ejemplo, «Inicio: Textos de Portada: «Llegó la temporada»», «Inicio: Se quitó: Testimonios» y «Página /nosotros: Nueva sección: Galería», antes de confirmar

#### Scenario: Sin diferencias
- **WHEN** la versión es igual a lo publicado en todo lo que restaurar cambiaría
- **THEN** el sistema dice «Esta versión es igual a lo que está publicado» y no ofrece restaurar

#### Scenario: Solo cambió una foto [REVISADO]
- **WHEN** entre la versión y lo publicado solo cambió una foto, un producto, un enlace o un video de una sección
- **THEN** el sistema no dice «igual»: muestra «Otros cambios en <sección>» y ofrece restaurar

### Requirement: Qué se compara y qué no
THE system SHALL comparar secciones agregadas, quitadas, ocultas, reordenadas o con textos y diseño distintos; páginas agregadas o quitadas; colores, letras y estilo; título y descripción para buscadores; enlaces de campaña y redirecciones. THE system SHALL NOT listar la configuración de la tienda ni la medición, porque restaurar las conserva, y SHALL decirlo en una línea. IF hay un cambio que no sabe nombrar en palabras, THEN THE system SHALL mostrarlo como «Otros cambios en <sección>», y SHALL NOT decir que la versión es igual mientras haya cualquier diferencia fuera de la tienda y la medición.
Fuente: ·4; ·6 (restaurar conserva tienda y pauta). [REVISADO]

#### Scenario: Versión con otra tienda
- **WHEN** la versión tenía otros medios de pago
- **THEN** la comparación no los lista y muestra «La tienda y la medición se quedan como están hoy»

#### Scenario: Muchos cambios
- **WHEN** hay más cambios de los que caben en la vista
- **THEN** se muestran los primeros de cada página y un «y N cambios más en esta página»

### Requirement: Historial del sitio con la vista por página
THE system SHALL mantener un solo historial por sitio. Cada versión SHALL decir qué páginas cambiaron respecto de la publicación anterior. THE system SHALL permitir filtrar el historial por una página para ver solo las versiones que la cambiaron. THE system SHALL NOT restaurar una página suelta: restaurar siempre devuelve el sitio completo.
Fuente: ·9; descripción del ticket («historial de versiones de cada página»).

#### Scenario: Filtrar por página
- **WHEN** el comercio elige la página «/nosotros» en el historial
- **THEN** ve solo las publicaciones que cambiaron esa página, con fecha, autor y el resumen de lo que cambió

#### Scenario: Versiones anteriores a este cambio
- **WHEN** una versión se guardó antes de existir el resumen por página
- **THEN** aparece como «sin resumen» en la lista, y abrirla igual muestra la comparación completa

### Requirement: Comparar es de lectura
THE system SHALL permitir ver y filtrar comparaciones a cualquier usuario del comercio que pueda abrir el editor, solo sobre publicaciones del historial, y SHALL NOT cambiar el borrador, lo publicado ni el historial al hacerlo.
Fuente: ·4; principio de mínimo efecto. [REVISADO: forma EARS]

#### Scenario: Editor sin permiso de publicar
- **WHEN** un editor sin permiso abre una versión
- **THEN** ve la comparación, pero no el botón «Restaurar»

### Requirement: Rendimiento y tamaño
WHEN alguien abre una comparación, THE system SHALL responder en menos de 2 segundos para un sitio de hasta 20 páginas. La lista del historial SHALL cargar sin traer el contenido de las versiones.
Fuente: NFR propio de esta propuesta (el ticket no da cifra); límite de 20 versiones de D-478.

#### Scenario: Sitio grande
- **WHEN** se compara una versión de un sitio con 20 páginas
- **THEN** la respuesta llega en menos de 2 segundos y el historial no se pone lento
