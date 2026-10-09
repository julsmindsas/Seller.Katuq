## ADDED Requirements

### Requirement: Bandera por comercio, apagada de fábrica
Mientras la bandera `featureFlags.productImportPhotos` de la empresa esté ausente, tenga un valor distinto de `true` o no se pueda leer, la importación de productos SHALL comportarse exactamente como antes: la plantilla, el mapeo y el resultado no ofrecen fotos por enlace, y el servidor responde y guarda lo mismo. El servidor SHALL decidir con la empresa de la sesión y en cada lote; la pantalla solo usa la bandera para mostrar u ocultar.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** una empresa sin la bandera (por ejemplo ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR o ALMACEN BOMBAS) descarga la plantilla, importa productos sin columnas de foto y mira el resultado
- **THEN** la plantilla, el mapeo y el resultado son los de siempre, el servidor responde y guarda lo mismo que antes y ni siquiera consulta la bandera

#### Scenario: Celdas de foto con la bandera apagada
- **WHEN** a una empresa sin la bandera le llega un lote con celdas de foto (una pestaña abierta antes de apagarla, o una petición armada a mano)
- **THEN** las fotos se ignoran, los productos se guardan exactamente como si no las trajeran y el resultado avisa cuántos productos quedaron sin foto porque la función no está activa para su empresa

#### Scenario: La bandera no se puede leer
- **WHEN** no se puede leer la bandera (la empresa no existe o la lectura falla)
- **THEN** se considera apagada y la importación sigue como siempre

#### Scenario: Apagar la bandera
- **WHEN** el equipo de Katuq apaga la bandera de una empresa
- **THEN** desde el siguiente lote el servidor ignora los enlaces de foto, sin desplegar nada; la pantalla deja de ofrecerlos la próxima vez que la persona inicia sesión

### Requirement: Dos columnas opcionales de foto
Donde la bandera esté encendida, la plantilla de productos SHALL incluir la columna «Foto principal (URL)» y la columna «Fotos adicionales (URLs separadas por coma, espacio o salto de linea)», con su explicación en la hoja de instrucciones, y el mapeo de columnas SHALL ofrecerlas siempre, aunque ninguna columna del archivo parezca de fotos. Ninguna de las dos SHALL ser obligatoria. El mapeo SHALL sugerir una columna solo si su nombre parece de fotos y alguna de sus primeras filas trae un enlace.

#### Scenario: Plantilla de Katuq con las dos columnas llenas
- **WHEN** la persona sube la plantilla con ambas columnas llenas
- **THEN** el mapeo las reconoce por su nombre y las muestra como opcionales

#### Scenario: Columna «Imagen» con nombres de archivo
- **WHEN** el archivo trae una columna «Imagen» con valores como «camisa.jpg» y ningún enlace
- **THEN** no se sugiere como foto; si la persona la escoge a mano, el resultado le dice, fila por fila, que eso es el nombre de un archivo y no un enlace

#### Scenario: Columna que la sugerencia automática (KAI) llamaba imagen
- **WHEN** KAI reconoce una columna como imagen del producto
- **THEN** se trata como «Foto principal (URL)», o como «Fotos adicionales» si era la secundaria, para que el servidor la valide

### Requirement: Lo que queda guardado en cada producto
Cuando un producto trae al menos un enlace válido, el sistema SHALL guardar sus fotos en la galería principal del producto, con la portada primero (el primer enlace válido de la columna principal; si no hay, el primero de los adicionales), sin repetir enlaces y con un máximo de 8 fotos por producto; lo que sobre SHALL avisarse. Cada foto SHALL llevar un nombre armado con el título del producto y su posición, y SHALL quedar marcada como enlace, sin archivo propio que borrar. El sistema SHALL NOT cambiar por causa de las fotos ningún otro dato del producto (precio, categoría, identificación, existencias).

#### Scenario: Producto con tres enlaces buenos
- **WHEN** un producto trae un enlace directo en la columna principal y dos más en la de adicionales
- **THEN** queda con tres fotos en ese orden, la primera como portada, y el resto de su ficha igual a como entraría sin fotos

#### Scenario: Más de ocho enlaces, o un enlace repetido
- **WHEN** un producto trae diez enlaces válidos, uno de ellos repetido
- **THEN** el repetido cuenta una sola vez, el producto guarda ocho y el resultado avisa que las demás se dejaron por fuera

### Requirement: Actualizar productos que ya existen
Cuando el archivo actualiza un producto existente, la hoja SHALL mandar solo en lo que dice: sin ningún enlace válido el producto SHALL conservar todas sus fotos; con solo portada SHALL cambiar la portada y conservar las demás; con solo adicionales SHALL conservar la portada y las adicionales SHALL reemplazar a las otras. Un enlace que ya era foto del producto SHALL conservar la foto que había. Importar dos veces el mismo archivo SHALL dejar las mismas fotos. Las filas que el modo de importación omite («solo crear nuevos» o «solo actualizar existentes») SHALL NOT tocar el producto ni generar avisos de fotos.

#### Scenario: Fila sin foto
- **WHEN** una fila de un producto que ya tiene fotos trae las celdas de foto vacías, o solo enlaces que no sirven
- **THEN** el producto conserva sus fotos y los enlaces que no sirven se reportan

#### Scenario: Solo la portada
- **WHEN** la fila trae únicamente una portada nueva
- **THEN** cambia la portada y las demás fotos siguen en su orden

#### Scenario: Mismo archivo dos veces
- **WHEN** se importa dos veces el mismo archivo
- **THEN** no se duplica ninguna foto y no cambia ninguna

#### Scenario: Importar sin las columnas de foto (comportamiento de hoy)
- **WHEN** la persona importa un archivo que actualiza productos que ya existen y no asigna ninguna columna de foto
- **THEN** pasa lo de siempre (el producto queda con la lista de fotos vacía) y la pantalla se lo advierte antes de importar

### Requirement: Aislamiento entre empresas
El sistema SHALL leer la bandera de la empresa de la sesión y SHALL NOT tomarla del contenido de la petición. La bandera encendida de una empresa SHALL NOT valer para otra. La importación SHALL NOT leer ni modificar productos de otra empresa, aunque tengan la misma referencia.

#### Scenario: Dos empresas, una con la bandera
- **WHEN** una empresa sin la bandera importa un archivo con fotos mientras otra la tiene encendida
- **THEN** a la primera se le ignoran las fotos y se le avisa; la segunda no se ve afectada

#### Scenario: Misma referencia en otra empresa
- **WHEN** una empresa importa la referencia «REF-A» con fotos y otra empresa tiene un producto con esa misma referencia
- **THEN** el producto de la otra empresa queda intacto

### Requirement: Las fotos importadas se ven en la tienda
Cuando se guarda una foto por enlace, las páginas públicas de la tienda del comercio SHALL mostrarla en el mismo orden en que quedó en el producto (portada primero), y SHALL seguir pudiendo mostrar fotos de cualquier sitio público seguro.

#### Scenario: Tienda de FLORECER
- **WHEN** se importa un producto con tres fotos y se abre su tienda pública
- **THEN** la tienda muestra la portada primero y la segunda foto de la galería
