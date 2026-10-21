## ADDED Requirements

> **NUEVO (D-518, 21-oct), pendiente de aprobación de Daniel.** Fase 1c. Cada requisito dice su fuente.

### Requirement: Un producto variable de WooCommerce llega como un solo producto
WHEN el archivo de WooCommerce trae un producto variable con sus variaciones, THE system SHALL importarlo como un solo producto con sus variantes, sus ejes reconocidos por nombre, sus categorías, sus fotos y sus existencias sumadas. Una variación SHALL quedar unida a su producto aunque el archivo la relacione por código y no por número.

Fuente: D-518 F5-30·8 («el CSV usa variantes»); criterio del requerimiento sobre WooCommerce; esquema oficial del CSV de WooCommerce (la columna del padre usa el código cuando existe).

#### Scenario: Camisa con cuatro variaciones
- **WHEN** el archivo trae una camisa variable con cuatro variaciones de talla y color
- **THEN** queda un producto con cuatro variantes, elegibles en la ficha y en venta asistida

#### Scenario: Variación ligada por código
- **WHEN** las variaciones nombran a su padre por el código del producto
- **THEN** quedan en el mismo producto que las ligadas por número

#### Scenario: Las existencias de WooCommerce no tocan el producto
- **WHEN** se cargan las existencias de un producto variable importado de WooCommerce
- **THEN** solo cambian las existencias de la bodega elegida y su movimiento; el producto, sus variantes, su precio y sus listas de precios quedan exactamente como los dejó la creación

#### Scenario: Producto sin control de existencias
- **WHEN** un producto de WooCommerce no trae cantidad y figura en existencia
- **THEN** se importa como producto que se vende sin existencias y no recibe ninguna (`store-migration-plan-stock`)

#### Scenario: Archivo exportado en español
- **WHEN** el archivo viene de una tienda en español, con los encabezados traducidos
- **THEN** se lee igual que el de una tienda en inglés

### Requirement: Un comercio con la integración de WooCommerce activa no importa
IF el comercio tiene activa la integración con WooCommerce, THEN THE system SHALL decirlo en la simulación y SHALL rechazar toda importación de productos, fotos, redirecciones y clientes, sin escribir nada, hasta que se defina cómo se sincronizan los productos con esa integración.

Fuente: D-518 F5-30·8; WP-INT 5 (#1290, cd nnb7LeK1CNIB3k2ybrb4), que todavía no define la llave ni el manejo de los productos variables.

#### Scenario: CAFE ESCOBAR intenta importar
- **WHEN** un comercio con la integración de WooCommerce activa sube su archivo
- **THEN** la simulación muestra el bloqueo con un mensaje sin jerga y la importación no empieza

#### Scenario: Integración apagada
- **WHEN** la integración del comercio está inactiva y no tiene automatizaciones que publiquen
- **THEN** puede importar su archivo de WooCommerce

### Requirement: Lo que WooCommerce no permite traer queda en el reporte
IF el archivo trae productos agrupados o externos, variaciones sin su producto, variaciones que valen para cualquier valor de un eje o atributos que no definen variantes, THEN THE system SHALL dejarlos por fuera o sin ese dato y SHALL decir en el reporte la fila y el motivo.

Fuente: requisito del reporte del ticket; D-214 (no se ofrecen variantes parciales).

#### Scenario: Producto agrupado
- **WHEN** el archivo trae un producto agrupado
- **THEN** no se importa y el reporte dice por qué

### Requirement: Las direcciones viejas de WooCommerce se reconstruyen con aviso
WHEN se generan las redirecciones de un catálogo de WooCommerce, THE system SHALL usar la dirección real que pegue el comercio y, si no la pegó, SHALL armar la dirección probable a partir del nombre del producto con la misma regla de la tienda anterior y marcarla «probable» en el reporte. THE system SHALL usar la base de direcciones de la tienda anterior, que el comercio confirma o que se deduce de una dirección de ejemplo, y SHALL avisar cuando la supone.

Fuente: esquema oficial del CSV de WooCommerce (no trae la dirección del producto); `design.md`, nota del 19-oct; crítica del 21-oct (una tienda en español usa otra base y la redirección compara la dirección exacta).

#### Scenario: Sin direcciones pegadas
- **WHEN** el comercio no pega las direcciones de sus productos
- **THEN** cada redirección de producto queda marcada «probable» y el reporte explica cómo revisarla

#### Scenario: Tienda en español
- **WHEN** el comercio pega como ejemplo `/producto/camisa-azul/` y su producto se llama «Men's Shirt»
- **THEN** la redirección generada sale de `/producto/mens-shirt` hacia la ficha del producto en Katuq

### Requirement: Los clientes de WooCommerce entran sin autorización
WHERE la pregunta 19 deja los clientes de WooCommerce en esta entrega, WHEN el comercio importa el archivo de clientes de WooCommerce, THE system SHALL tratarlos como los de Shopify (sin duplicados, por lotes que se pueden deshacer y sin datos personales en los registros) y SHALL NOT crear ninguna autorización de correo, porque ese archivo no trae el consentimiento.

Fuente: D-518 F5-30·1 («clientes»); ayuda oficial de WooCommerce, informe de clientes (trae teléfono y correo, sin consentimiento). [NEEDS CLARIFICATION: pregunta 19]

#### Scenario: Cliente de WooCommerce con correo
- **WHEN** se importa un cliente de WooCommerce con correo
- **THEN** queda en los clientes del comercio y no recibe campañas hasta que se suscriba
