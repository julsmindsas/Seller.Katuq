## ADDED Requirements

### Requirement: La ficha nunca trae un precio
El sistema SHALL entregar solo los campos de la ficha (nombre, descripción, categoría, colores, material, etiquetas de búsqueda e imagen sin fondo) y SHALL NOT entregar un precio ni ningún otro dato, aunque la IA lo escriba. El nombre SHALL NOT llevar montos de dinero, y la descripción SHALL NOT llevar frases sobre precio, envío, garantía ni devoluciones, porque son compromisos del comercio y no se deducen de una foto.

#### Scenario: La IA escribe un precio
- **WHEN** la IA responde con un campo de precio, o con "Camiseta básica 59.900 COP" como nombre
- **THEN** el precio no sale en ninguna parte y el nombre queda "Camiseta básica"

#### Scenario: Frases que son compromisos del comercio
- **WHEN** la descripción trae "Envío gratis a todo el país. Garantía de un año." junto con frases buenas
- **THEN** esas frases se eliminan y el resto de la descripción se conserva

#### Scenario: El peso de un producto no es un precio
- **WHEN** la descripción dice "con peso balanceado"
- **THEN** la frase se conserva: solo se descartan los "pesos" como moneda

### Requirement: La categoría es de la empresa o no hay categoría
El sistema SHALL elegir la categoría solo entre las categorías activas de la empresa que pide la ficha, y SHALL entregarla con el nombre exacto con que la empresa la escribió. IF lo que contesta la IA no coincide con una categoría de la empresa, o coincide con varias, THEN la categoría SHALL ir vacía.

#### Scenario: Categoría inventada
- **WHEN** la IA contesta una categoría que la empresa no tiene
- **THEN** la ficha trae la categoría vacía

#### Scenario: Categoría desactivada
- **WHEN** la empresa tiene la categoría "Velas" desactivada
- **THEN** no se le ofrece a la IA y nunca sale en la ficha, ni ella ni lo que cuelga de ella

#### Scenario: Categoría de otra empresa
- **WHEN** otra empresa tiene la categoría "Velas" y esta no
- **THEN** la ficha de esta empresa nunca la trae

#### Scenario: Categoría con emoji o formato
- **WHEN** la empresa llamó a su categoría "🕯️ Velas"
- **THEN** la ficha la entrega con ese mismo nombre, para que el formulario la reconozca

### Requirement: No se inventa lo que no se ve
El sistema SHALL dejar vacío lo que no se distingue en la foto: sin material evidente, el material SHALL ir vacío; sin colores distinguibles, la lista de colores SHALL ir vacía; y las etiquetas SHALL NOT rellenarse para llegar a un número. Los colores SHALL ser los del producto, sin repetidos y sin códigos como "#ff0000". Las etiquetas SHALL ir sin "#", sin repetidos (aunque cambien tildes o mayúsculas), sin precios y sin repetir el nombre completo del producto.

#### Scenario: Material que no se ve
- **WHEN** la IA contesta "no se ve" o "no aplica" como material
- **THEN** el material queda vacío

#### Scenario: Pocas etiquetas buenas
- **WHEN** la IA devuelve tres etiquetas buenas
- **THEN** salen tres: no se completan hasta cinco

#### Scenario: Foto que no muestra un producto
- **WHEN** la IA contesta que la foto no muestra un producto
- **THEN** la ficha no se entrega y la persona recibe el aviso de que no se pudo identificar el producto

### Requirement: Texto limpio y con tope
El sistema SHALL entregar todos los textos sin marcas de código (ningún "<" ni ">", ni siquiera una etiqueta sin cerrar), sin formato de markdown, sin emojis y sin caracteres invisibles, y SHALL respetar estos topes: nombre de hasta 100 caracteres; descripción de hasta 1.000 caracteres y tres párrafos como máximo; material de hasta 60 caracteres; hasta 6 colores; y hasta 10 etiquetas.

#### Scenario: Texto hostil dentro de la foto
- **WHEN** la foto trae escrito un texto con una etiqueta de código a medio abrir y la IA lo repite
- **THEN** ningún texto de la ficha lleva "<" ni ">"

#### Scenario: Descripción larga
- **WHEN** la IA escribe más de 1.000 caracteres o más de tres párrafos
- **THEN** la ficha trae la descripción recortada, de preferencia en un final de frase, con tres párrafos como máximo

### Requirement: Una lectura por foto y siempre la misma forma
WHEN se pide la ficha de una foto, el sistema SHALL consultar a la IA una sola vez y SHALL entregar siempre la misma estructura de ficha, con vacío en lo que no se pudo determinar.

#### Scenario: Ficha parcial
- **WHEN** la IA solo identifica el nombre del producto
- **THEN** la ficha trae el nombre y lo demás vacío, sin error

#### Scenario: Respuesta con campos de más
- **WHEN** la IA agrega campos que no son de la ficha
- **THEN** esos campos no salen
