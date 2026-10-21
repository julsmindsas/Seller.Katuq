## ADDED Requirements

> D-495, ampliación del 2026-10-21 (F5), **pendiente de aprobación**. Ticket 1234 (F2-42) y
> ticket 1229 (F2-20: un solo feed que leen Google y Meta). Reemplaza el requisito «Feed con
> detalles técnicos [F5]» de `tienda-facetas-comparador`, aprobado el 18-oct.

### Requirement: Detalles técnicos para Google [F5]

WHERE la función está encendida, WHEN se genera el catálogo de productos de la tienda, THE system SHALL incluir por cada especificación visible del producto un detalle con la sección («Especificaciones» o «Compatibilidad»), el nombre del atributo y su valor con la unidad. Cada nombre y cada valor SHALL tener de 1 a 150 caracteres y SHALL haber como máximo 100 detalles por producto. THE system SHALL NOT incluir como detalle un atributo que repita lo que el catálogo ya publica en su propio campo, como marca, precio, envío, código de barras o referencia.

*Fuente: ticket 1234 («atributos incluidos … en los catálogos de Google y Meta (F2-20)»); Google Merchant Center, atributo `product_detail` (support.google.com/merchants/answer/9218260): `section_name` recomendado, `attribute_name` y `attribute_value` obligatorios, 1 a 150 caracteres, hasta 100, sin repetir otros atributos ni precio, envío o fechas.*

#### Scenario: Router con especificaciones

- **WHEN** un router con «Tecnología WiFi: WiFi 6» y «Velocidad: 1.200 Mbps» entra al catálogo
- **THEN** trae dos detalles en la sección «Especificaciones», uno por atributo, con el valor y la unidad

#### Scenario: Atributo que repite la marca

- **WHEN** el comercio definió un atributo «Marca»
- **THEN** ese atributo no sale como detalle, porque la marca ya va en su propio campo

### Requirement: Tipo de producto con la ruta completa [F5]

WHERE la función está encendida, THE system SHALL publicar como tipo de producto la ruta completa de su categoría, con los nombres como los escribió el comercio y de la más general a la más específica, hasta 750 caracteres. IF el producto no tiene una ruta clara, THEN THE system SHALL publicar el tipo de producto de hoy.

*Fuente: D-518 F2-42·6 («a Meta, `product_type` con la ruta completa»); Meta, campos del catálogo (`product_type`, 750 caracteres, «Home & Garden > Kitchen & Dining > …»); Google, `product_type`.*

#### Scenario: Router en el catálogo de Meta

- **WHEN** Meta lee el catálogo de una tienda con la función encendida
- **THEN** el tipo de producto del router es «Networking > Routers», no «routers»

### Requirement: Sin la función el catálogo es el de hoy [F5]

WHILE la función está apagada para el comercio, THE system SHALL publicar el catálogo de productos idéntico al de hoy. IF un producto no tiene especificaciones, THEN THE system SHALL publicar su entrada como hoy, salvo el tipo de producto. WHEN se apaga la función, THE system SHALL publicar el catálogo de hoy en máximo 35 minutos.

*Fuente: D-385; requisito «Con la función apagada la tienda queda como hoy». El plazo de 35 minutos (no 12) es porque el catálogo para Google y Meta se guarda 30 minutos en cachés intermedias; pendiente de la pregunta 14.*

#### Scenario: Comercio sin la función

- **WHEN** un comercio con la función apagada publica su catálogo
- **THEN** el catálogo es idéntico al de hoy

### Requirement: Validación en las plataformas [F5]

WHEN se enciende la función en el comercio piloto, THE system SHALL quedar validado en Merchant Center y en el administrador de catálogos de Meta sin errores ni advertencias nuevos frente al catálogo anterior.

*Fuente: tarea 6.4 aprobada el 18-oct («Daniel lo valida en Merchant Center y en Meta»); Meta no documenta `product_detail`, así que solo se exige que no cause errores.*

#### Scenario: Revisión en Meta

- **WHEN** Daniel carga el catálogo del piloto en Meta
- **THEN** no aparecen errores nuevos y el tipo de producto muestra la ruta
