## ADDED Requirements

### Requirement: Las direcciones viejas llevan al producto nuevo
WHEN termina la importación de productos, THE system SHALL generar redirecciones permanentes desde las direcciones de producto y de colección de la tienda anterior hacia el producto y la categoría equivalentes en el sitio Katuq que elige el comercio. Una colección SHALL redirigir solo si su categoría existe.

#### Scenario: Producto de Shopify
- **WHEN** se importó el producto con dirección `/products/camiseta-basica`
- **THEN** el borrador del sitio tiene una redirección de esa dirección a la ficha del producto en Katuq

#### Scenario: Colección sin dirección conocida
- **WHEN** el archivo no trae la dirección de una colección y el comercio no la pegó
- **THEN** se genera con la dirección probable a partir del nombre y se marca «probable»

### Requirement: Las redirecciones manuales mandan
THE system SHALL conservar sin cambios toda redirección escrita a mano por el comercio y SHALL ponerla antes que las generadas. IF una redirección generada choca con una manual, THEN THE system SHALL dejar la manual y contar el choque en el reporte.

#### Scenario: Choque con una manual
- **WHEN** el comercio ya había redirigido `/products/gorra` a su página de promociones
- **THEN** esa redirección queda igual y el reporte cuenta un choque

### Requirement: Tope de redirecciones
THE system SHALL guardar como máximo 500 redirecciones por sitio, con las manuales primero, luego los productos y al final las colecciones. Las que no quepan SHALL ir al reporte.

#### Scenario: Catálogo grande
- **WHEN** hay 20 manuales, 500 productos y 40 colecciones
- **THEN** quedan las 20 manuales y 480 de productos, y el reporte lista las 60 que no cupieron

### Requirement: Repetir el paso corrige sin duplicar
WHEN se repite el paso de redirecciones, THE system SHALL reconocer las que generó antes por el origen registrado en el producto, SHALL actualizar su destino y SHALL NOT duplicar ninguna. IF una redirección apunta a un producto que ya no existe, THEN THE system SHALL pedir en el reporte que se borre en el editor.

#### Scenario: Repetir sin cambios
- **WHEN** se repite el paso con los mismos productos
- **THEN** el sitio queda con las mismas redirecciones

#### Scenario: Destino que cambió
- **WHEN** un producto migrado cambió de nombre y se repite el paso
- **THEN** su redirección apunta a la dirección nueva de la ficha

### Requirement: Solo el borrador del sitio
THE system SHALL escribir las redirecciones solo en el borrador del sitio del mismo comercio. Se activan cuando el comercio publica. IF el sitio es de otro comercio, THEN THE system SHALL rechazar el paso sin cambiar nada.

#### Scenario: Sitio publicado intacto
- **WHEN** se generan las redirecciones
- **THEN** el sitio publicado no cambia hasta que el comercio publique
