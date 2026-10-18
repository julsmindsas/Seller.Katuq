## ADDED Requirements

### Requirement: La función nace apagada para cada comercio
WHERE la función «Traer mi tienda» está apagada para un comercio, THE system SHALL rechazar toda importación de tienda de ese comercio sin leer ni escribir nada, y SHALL ocultar el botón que la abre.

#### Scenario: Comercio sin la función
- **WHEN** un administrador de un comercio con la función apagada intenta importar
- **THEN** el sistema responde que la función no está disponible y no cambia nada

#### Scenario: Solo el administrador importa
- **WHEN** un usuario que no es administrador intenta importar con la función encendida
- **THEN** el sistema lo rechaza y no cambia nada

### Requirement: Cada producto llega completo, con sus variantes
THE system SHALL agrupar las filas del archivo exportado por producto. Un producto SHALL NOT quedar partido entre dos envíos. THE system SHALL reconocer los ejes de variante por su nombre (talla y color) y nunca por su posición en el archivo.

#### Scenario: Camiseta con doce variantes
- **WHEN** el archivo trae una camiseta en doce filas seguidas (cuatro tallas y tres colores)
- **THEN** queda un solo producto con doce variantes y la elección de talla y color al vender

#### Scenario: Color en el primer eje
- **WHEN** el archivo trae el color como primera opción y la talla como segunda
- **THEN** cada valor queda en su eje correcto

#### Scenario: Más de dos ejes
- **WHEN** un producto trae talla, color y material
- **THEN** el producto no se importa y el reporte dice el motivo y la fila

### Requirement: La referencia es estable
THE system SHALL usar como referencia el código de la variante cuando el producto tiene una sola variante con código, y si no, el identificador del producto en la tienda anterior. Importar el mismo archivo dos veces SHALL dar la misma referencia.

#### Scenario: Producto sin código
- **WHEN** un producto con tres tallas no trae código en ninguna
- **THEN** su referencia es su identificador en la tienda anterior

### Requirement: Precio con IVA y sin listas de precios
THE system SHALL tomar el precio del archivo como precio con IVA y calcular el valor sin IVA con el porcentaje que elige el comercio, igual que el importador de Excel. El precio de comparación y el precio de oferta SHALL ir al reporte y nunca a una lista de precios. IF las variantes de un producto tienen precios distintos, THEN THE system SHALL crear un producto por precio y avisarlo en el reporte.

#### Scenario: Tallas con precio distinto
- **WHEN** las tallas S a L cuestan 50.000 y la XL 55.000
- **THEN** quedan dos productos: el primero con S a L conserva el nombre y la referencia, y el segundo lleva «-2» y su talla en el nombre

### Requirement: Solo se crea lo nuevo, salvo que el comercio pida actualizar
THE system SHALL importar por defecto solo productos que no existan en Katuq y SHALL omitir y reportar los que ya existen. IF una referencia coincide con dos o más productos del comercio, THEN THE system SHALL omitirla como ambigua, sin adivinar. WHERE el comercio elige actualizar los existentes, THE system SHALL cambiar solo nombre, descripción, fotos, precio, variantes y origen de la migración. THE system SHALL conservar la fecha de creación, quién lo creó, si está activo o publicado, sus canales, ciudades, disponibilidad y categorías, y los precios curados a mano.

#### Scenario: Producto que ya existe
- **WHEN** se importa en el modo por defecto un producto cuya referencia ya existe
- **THEN** el producto existente queda igual y el reporte dice «ya existe»

#### Scenario: Actualizar un producto inactivo
- **WHEN** se actualiza un producto que estaba inactivo y fuera de la tienda web
- **THEN** sigue inactivo y fuera de la tienda web, conserva su fecha de creación y su lugar en el listado, y queda registrado quién lo actualizó

### Requirement: Existencias en la bodega que elige el comercio
THE system SHALL cargar las existencias de cada producto creado en la bodega que elige el comercio, como la suma de sus variantes. Las cantidades negativas SHALL contar como cero y quedar en el reporte. Un producto omitido SHALL NOT recibir existencias. Un producto existente SHALL recibirlas solo si el comercio marca que quiere reemplazarlas. La carga de existencias SHALL NOT cambiar el producto, sus variantes, su precio ni sus listas de precios.

#### Scenario: Las existencias no tocan el producto
- **WHEN** se cargan las existencias de un producto recién creado
- **THEN** solo cambian las existencias de esa bodega y su movimiento; el producto, sus variantes, su precio y sus listas de precios quedan exactamente como los dejó la creación

#### Scenario: Repetir después de una venta
- **WHEN** se importa un archivo, se vende una unidad y se vuelve a importar el mismo archivo
- **THEN** la bodega conserva la cantidad después de la venta y no aparece un ajuste nuevo

#### Scenario: Carga que falla
- **WHEN** falla la carga de existencias de un producto creado
- **THEN** el producto queda creado y el reporte dice qué referencia cargar con el importador de existencias

### Requirement: Fotos por enlace
THE system SHALL guardar hasta 8 fotos por producto a partir de los enlaces del archivo, sin descargarlas, y SHALL reportar las sobrantes y las rechazadas con su motivo. La foto de una variante SHALL quedar asociada a su color.

#### Scenario: Producto con once fotos
- **WHEN** un producto trae once enlaces válidos
- **THEN** se guardan las primeras ocho y el reporte cuenta tres sobrantes

### Requirement: Nada migrado se publica en otra plataforma
IF el comercio tiene una automatización activa que publica productos o existencias en Shopify o WooCommerce, aunque esté en modo de observación, THEN THE system SHALL avisarlo en la simulación y SHALL NOT importar productos hasta que se apague.

#### Scenario: Automatización de existencias en observación
- **WHEN** el comercio tiene una automatización que publica existencias en Shopify, en modo de observación
- **THEN** la simulación la muestra como bloqueo y la importación de productos se rechaza sin escribir

### Requirement: Sin duplicados por envíos simultáneos
IF llega un envío de productos o clientes mientras otro del mismo comercio está en curso, THEN THE system SHALL rechazarlo sin escribir. WHEN se reenvía un lote que ya terminó, THE system SHALL devolver el mismo resultado sin volver a escribir.

#### Scenario: Dos pestañas
- **WHEN** dos pestañas envían el mismo lote al mismo tiempo
- **THEN** uno se procesa, el otro recibe «importación en curso» y no hay productos repetidos

#### Scenario: Reintento después de un corte
- **WHEN** el navegador reenvía un lote porque no recibió la respuesta
- **THEN** recibe el resultado del primer envío y nada se duplica
