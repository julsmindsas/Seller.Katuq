## ADDED Requirements

### Requirement: Resultado de las fotos
Cuando termina una importación con fotos, el sistema SHALL mostrar cuántas fotos se guardaron y en cuántos productos, cuántos enlaces de Google Drive o Dropbox se convirtieron en enlace directo y, por cada enlace que no se pudo guardar, la fila del Excel, la referencia del producto, la columna, el enlace (recortado) y qué hacer para corregirlo. Los productos SHALL guardarse de todos modos y los avisos de fotos SHALL NOT contarse como productos fallidos. Si hay más avisos de los que caben en la lista, la pantalla SHALL decir cuántos muestra.

#### Scenario: Un enlace malo entre varios buenos
- **WHEN** la fila 7 trae una página de Instagram como foto principal y la fila 8 un enlace bueno
- **THEN** ambos productos se guardan, el resumen cuenta la foto buena y la lista dice «Fila 7», su referencia, «Foto principal» y qué hacer

#### Scenario: Archivo sin fotos
- **WHEN** la persona importa un archivo sin enlaces de foto
- **THEN** la pantalla de resultado no muestra ningún bloque de fotos

### Requirement: Aviso cuando la función no está activa
Si un archivo trae fotos y la función no está activa para la empresa, el resultado SHALL decir cuántos productos se guardaron sin foto por esa razón y que pueden pedir la activación por soporte, y SHALL NOT tratarlo como un error de la importación.

#### Scenario: Pantalla abierta antes de apagar la función
- **WHEN** la persona importa un archivo con fotos y la función se apagó mientras tenía la pantalla abierta
- **THEN** los productos se guardan sin foto y el resultado dice cuántos fueron y cómo pedir la activación

### Requirement: Una falla con las fotos no tumba el producto
Si ocurre una falla inesperada al armar las fotos de un producto, entonces el sistema SHALL guardar el producto con las fotos que ya tenía (o sin ellas si es nuevo), avisar la fila con un mensaje que diga que el producto sí se guardó y que revise esa fila, y seguir con los demás productos.

#### Scenario: Falla en una fila
- **WHEN** el armado de fotos falla en una fila de un lote
- **THEN** esa fila queda guardada con sus fotos anteriores y avisada, y las demás filas del lote se importan normal
