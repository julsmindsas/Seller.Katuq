## ADDED Requirements

### Requirement: Referencias visuales en el chat del editor
El chat del editor SHALL aceptar hasta 3 imágenes (JPG, PNG o WebP) o 1 PDF por mensaje como referencia de diseño. WHEN se adjunta un PDF, el sistema SHALL usar solo sus primeras 3 páginas. IF un archivo no es imagen o PDF, o supera 20 MB, THEN el sistema SHALL rechazarlo con un mensaje claro y SHALL NOT enviarlo.

#### Scenario: Captura de una página que le gusta
- **WHEN** el comercio adjunta una captura y escribe "quiero que se vea así"
- **THEN** la página toma colores, letra, estilo y orden parecidos a la captura, y el chat muestra qué cambió

### Requirement: Inspirarse sin copiar
WHEN una referencia contiene textos, logos o nombres de otra marca, el sistema SHALL NOT copiarlos en la página. Las imágenes de referencia SHALL NOT guardarse después del análisis.

#### Scenario: Referencia de una marca conocida
- **WHEN** la captura es de la página de otra marca
- **THEN** la página adopta el estilo, pero los textos siguen siendo los del comercio

### Requirement: Mismas reglas que el chat de texto
Los cambios que vienen de una referencia SHALL pasar por la misma lista blanca del chat (textos permitidos, tema validado, orden completo, secciones permitidas) y SHALL NOT guardarse hasta que el comercio toque Guardar.

#### Scenario: Deshacer un rediseño
- **WHEN** el comercio aplica un rediseño desde una imagen y toca "Deshacer el último cambio"
- **THEN** la página vuelve exactamente a como estaba

### Requirement: Colores legibles
IF los colores resultantes no tienen contraste suficiente entre texto y fondo, THEN el sistema SHALL ajustarlos antes de devolver la página.

#### Scenario: Paleta pálida
- **WHEN** la referencia sugiere texto gris claro sobre blanco
- **THEN** el texto queda con un tono que se lee

### Requirement: Fotos del comercio en la página (Fase B)
WHEN el comercio adjunta una foto y pide usarla en la portada o en la galería, el sistema SHALL subirla al almacenamiento de la página y SHALL ponerla en esa sección.

#### Scenario: Foto para la portada
- **WHEN** el comercio adjunta la foto de su local y escribe "usa esta foto en la portada"
- **THEN** la portada muestra esa foto
