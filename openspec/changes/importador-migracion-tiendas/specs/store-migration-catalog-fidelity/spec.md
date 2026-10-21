## ADDED Requirements

> **NUEVO (D-518, 21-oct), pendiente de aprobación de Daniel.** Cada requisito dice su fuente.

### Requirement: Se lee el archivo de exportación actual y el anterior
THE system SHALL leer el archivo de productos de Shopify con los nombres de columna que usa hoy la plantilla oficial de Shopify y con los nombres anteriores, y SHALL dar el mismo resultado con los dos. IF el archivo de existencias trae las ubicaciones como columnas, THEN THE system SHALL rechazarlo en la simulación y pedir el formato por estados.

Fuente: criterio 1 del requerimiento («export REAL… en el formato actual de la plantilla oficial»); hallazgo del 21-oct (la plantilla oficial da 3 de 3 productos inválidos); ayuda oficial de Shopify sobre el CSV de productos y el de inventario.

#### Scenario: Plantilla oficial de Shopify
- **WHEN** el comercio simula la plantilla oficial de productos de Shopify
- **THEN** la camiseta queda como un producto con doce variantes de talla y color, y ningún producto sale inválido por el precio

#### Scenario: Mismo catálogo en los dos formatos
- **WHEN** se simula el mismo catálogo con los encabezados actuales y con los anteriores
- **THEN** los conteos y los productos son iguales

### Requirement: El IVA es el de cada producto
THE system SHALL importar como exento, con IVA de 0 %, el producto que el archivo marca sin impuesto, y SHALL aplicar a los demás la tarifa que elige el comercio. La simulación SHALL mostrar cuántos productos quedan exentos.

Fuente: D-518 F5-30·5; antecedente del ticket #1020 (cd D7eUZxj67Bn6ORMgSRcb), donde una sola tarifa para todo el catálogo dejó facturas con un IVA que no existía.

#### Scenario: Producto sin impuesto en Shopify
- **WHEN** una variante trae «no cobra impuesto» y el comercio eligió 19 %
- **THEN** el producto queda con IVA de 0 % y la tienda no muestra «Precio con IVA incluido»

#### Scenario: Estado de impuesto en WooCommerce
- **WHEN** un producto de WooCommerce trae estado de impuesto «ninguno»
- **THEN** queda con IVA de 0 %

#### Scenario: Clase de impuesto de WooCommerce
- **WHEN** un producto gravado de WooCommerce trae la clase «tarifa cero», y otro una clase a la que el comercio no le asignó tarifa
- **THEN** el primero queda con IVA de 0 %, y el segundo no se importa y el reporte pide asignar la tarifa de su clase

Fuente adicional (clase de impuesto): crítica del 21-oct a la ampliación; el mismo antecedente del #1020. [NEEDS CLARIFICATION: pregunta 4]

### Requirement: El comercio dice si sus precios incluyen IVA
IF el archivo trae productos gravados, THEN THE system SHALL pedirle al comercio, antes de importar, que diga si los precios del archivo ya incluyen el IVA, y SHALL mostrarle un ejemplo con un producto del archivo. WHEN el comercio dice que no lo incluyen, THE system SHALL sumarles el IVA de su tarifa. THE system SHALL NOT importar productos gravados sin esa respuesta.

Fuente: crítica del 21-oct (en WooCommerce los precios se cargan sin impuesto por defecto, y Shopify tiene un ajuste para incluirlo); decisión 3 de `design.md`, que lo daba por hecho. [NEEDS CLARIFICATION: pregunta 17]

#### Scenario: Tienda que cargaba precios sin IVA
- **WHEN** el comercio dice que sus precios no incluyen IVA, con tarifa del 19 %, y un producto gravado vale 50.000 en el archivo
- **THEN** el producto queda en 59.500 con IVA, y un producto exento del mismo archivo queda en su precio

### Requirement: La oferta se ve como precio antes y ahora
WHEN un producto trae precio de oferta vigente, THE system SHALL guardar como precio del producto el precio regular y SHALL registrar la oferta en la lista de precios del público, con su fecha de fin si el archivo la trae. En Shopify, cuál de sus dos precios es el regular lo fija la pregunta 2; la tienda en línea muestra y cobra lo mismo con las dos respuestas. La tienda en línea SHALL mostrar el precio tachado, el porcentaje y el ahorro, y SHALL cobrar la oferta. IF el comercio no tiene una única lista del público, THEN THE system SHALL NOT cargar la oferta y SHALL decirlo en la simulación. THE system SHALL NOT escribir ninguna otra lista de precios ni la de un producto que no se importó en ese envío.

Fuente: D-518 F5-30·4; crítica del requerimiento (en Woo se importaba el precio regular de un producto en oferta, y el tachado de Shopify se perdía); D-445 (el precio antes y ahora sale de la lista del público).

#### Scenario: Producto de Shopify con precio de comparación
- **WHEN** una camiseta trae precio 79.900 y precio de comparación 99.900
- **THEN** la tienda muestra 99.900 tachado, 79.900, «-20 %» y cobra 79.900, y la simulación dice qué precio cobrarán la venta asistida y el punto de venta a un cliente sin lista

[NEEDS CLARIFICATION: pregunta 2, qué precio de Shopify es el regular]

#### Scenario: Precio actualizado tapado por la lista del público
- **WHEN** el comercio actualiza un producto que ya tenía precio en la lista del público
- **THEN** la lista no cambia y el reporte dice que la tienda en línea seguirá mostrando el precio de la lista

#### Scenario: Oferta de WooCommerce que empieza después
- **WHEN** la oferta del archivo empieza la semana próxima
- **THEN** el producto queda a precio regular y el reporte dice que la oferta no se cargó y por qué

#### Scenario: Comercio sin lista del público
- **WHEN** el comercio no tiene un tipo de cliente del público
- **THEN** la simulación dice cuántas ofertas se perderían y cómo crear la lista antes de importar

### Requirement: Variantes de distinto precio quedan en productos separados
IF las variantes de un producto difieren en precio regular, oferta o IVA, THEN THE system SHALL crear un producto por cada combinación y SHALL avisarlo en el reporte.

Fuente: D-518 F5-30·7; D-214 (Katuq cobra el precio del producto).

#### Scenario: Tallas con oferta distinta
- **WHEN** la talla S está en oferta y la talla M no, con el mismo precio regular
- **THEN** quedan dos productos y el reporte explica la separación

### Requirement: Lo importado no sale como nuevo
THE system SHALL NOT mostrar como «Nuevo» un producto importado, salvo que el archivo traiga su fecha de creación en la tienda anterior y esa fecha esté dentro del período de novedad.

Fuente: D-518 F5-30·6; crítica del requerimiento (500 productos viejos saldrían «Nuevo» durante 45 días).

#### Scenario: Catálogo viejo importado hoy
- **WHEN** se importa un producto sin fecha de creación en el archivo
- **THEN** la tienda no le pone la insignia «Nuevo», y un producto creado a mano hace diez días la conserva

### Requirement: Cada foto conserva su texto alternativo
WHEN el archivo trae el texto alternativo de una foto, THE system SHALL guardarlo con esa foto y la tienda SHALL usarlo como descripción de la imagen. Sin él, la imagen SHALL describirse con el nombre del producto, como hoy.

Fuente: D-518 F5-30·6; la propuesta aprobada prometía leerlo y el lector no lo hacía.

#### Scenario: Foto con texto alternativo
- **WHEN** la primera foto trae «Camiseta verde con estampado de la banda»
- **THEN** la ficha describe la foto principal con ese texto

### Requirement: Título y descripción para buscadores
WHERE el archivo trae título o descripción para buscadores, THE system SHALL guardarlos en el producto, y la ficha SHALL usarlos en lugar del nombre y la descripción. La dirección de la ficha y su dirección canónica SHALL seguir saliendo del nombre del producto. WHERE se aprueban los campos en el formulario del producto (pregunta 6), el comercio SHALL poder ver, cambiar y borrar esos dos textos.

Fuente: D-518 F5-30·3; ticket F1-14 (#1255): título y meta descripción editables por producto.

#### Scenario: Producto con SEO de Shopify
- **WHEN** un producto trae título SEO «Camiseta vintage de la banda | Envío gratis»
- **THEN** la página del producto lleva ese título para Google, y su dirección sigue siendo la del nombre del producto

### Requirement: La descripción entra limpia
THE system SHALL quitar de la descripción importada todo lo que no sea texto con formato básico antes de guardarla.

Fuente: D-518 F5-30·9 (revisión de seguridad privada, M2).

#### Scenario: Descripción con contenido activo
- **WHEN** la descripción trae contenido que se ejecutaría en el navegador
- **THEN** el producto guarda solo el texto y su formato básico

### Requirement: Un producto oculto en la tienda en línea sigue oculto
IF el archivo marca un producto activo como no publicado en la tienda en línea, THEN THE system SHALL importarlo activo y fuera de la tienda web.

Fuente: columna «Published on online store» de la plantilla oficial de Shopify y «Visibility in catalog» de WooCommerce.

#### Scenario: Activo pero no publicado
- **WHEN** el perfume de la plantilla trae estado activo y «no publicado en la tienda en línea»
- **THEN** queda activo en Katuq y no aparece en la tienda web
