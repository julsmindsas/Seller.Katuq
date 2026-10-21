## ADDED Requirements

> **NUEVO (D-518, 21-oct), pendiente de aprobación de Daniel.** Reemplaza el no-goal «copiar las fotos» de la propuesta aprobada el 18-oct. Cada requisito dice su fuente.

### Requirement: Las fotos quedan en el almacenamiento de Katuq
WHEN termina la importación de los productos, THE system SHALL copiar al almacenamiento de Katuq, a nombre del comercio, cada foto importada que siga en la tienda anterior, y SHALL hacer que el producto use la copia. La foto SHALL conservar su orden, su color y su texto alternativo. THE system SHALL NOT cambiar ningún otro dato del producto.

Fuente: D-518 F5-30·2; criterio del ticket («con fotos»); crítica del requerimiento (las fotos quedaban en el servicio de la tienda que el comercio quiere cerrar).

#### Scenario: Comercio que cierra su tienda anterior
- **WHEN** termina la copia y el comercio cierra su tienda de Shopify
- **THEN** todas las fotos copiadas se siguen viendo en la ficha y en la tienda

#### Scenario: El resto del producto no cambia
- **WHEN** se copian las fotos de un producto
- **THEN** su nombre, precio, listas de precios, existencias, categorías y estado quedan exactamente igual

### Requirement: Una foto que no se puede copiar no frena la importación
IF una foto no se puede descargar, no es una imagen o pesa más de lo permitido, THEN THE system SHALL dejarla como estaba, seguir con las demás y decir en el reporte el producto, la posición de la foto y el motivo, sin mostrar la dirección de origen.

Fuente: D-518 F5-30·2; requisito del reporte del ticket («lo que no se pudo importar, con el motivo»).

#### Scenario: Enlace muerto
- **WHEN** una de las ocho fotos de un producto ya no existe en la tienda anterior
- **THEN** las otras siete quedan copiadas y el reporte pide reemplazar la que falló

### Requirement: Repetir o retomar la copia no duplica
WHEN el comercio repite o retoma la copia de fotos de una importación, THE system SHALL copiar solo las que siguen pendientes y SHALL NOT crear copias repetidas. IF el comercio cambió una foto mientras se copiaba, THEN THE system SHALL conservar el cambio del comercio.

Fuente: Artículo IV de la constitución; D-518 F5-30·2.

#### Scenario: Pestaña cerrada a mitad de camino
- **WHEN** el comercio cierra la pestaña con la mitad de las fotos copiadas y después elige «Copiar fotos pendientes»
- **THEN** se copia solo la otra mitad y ninguna foto queda dos veces

#### Scenario: Foto cambiada durante la copia
- **WHEN** el comercio reemplaza una foto del producto mientras su copia está en curso
- **THEN** el producto conserva la foto que puso el comercio

### Requirement: Solo las fotos de esa importación y de ese comercio
THE system SHALL copiar solo fotos de productos creados o actualizados por esa importación del mismo comercio. IF se pide copiar un producto de otro comercio o de otra importación, THEN THE system SHALL rechazarlo sin revelar nada de él.

Fuente: multi-tenancy (AGENTS.md); revisión de seguridad privada.

#### Scenario: Producto ajeno
- **WHEN** la petición incluye un producto que no es de esa importación
- **THEN** ese producto no cambia y el reporte solo dice que no corresponde

### Requirement: El comercio sabe si quedan fotos por copiar
WHILE haya fotos de una importación sin copiar, THE system SHALL mostrarle al comercio cuántas faltan, la opción de terminar la copia y el aviso de no cerrar su tienda anterior hasta que termine.

Fuente: D-518 F5-30·2; riesgo de cierre de la tienda anterior.

#### Scenario: Volver otro día
- **WHEN** el comercio vuelve a «Traer mi tienda» con fotos pendientes
- **THEN** ve el número de fotos pendientes y puede terminar la copia
