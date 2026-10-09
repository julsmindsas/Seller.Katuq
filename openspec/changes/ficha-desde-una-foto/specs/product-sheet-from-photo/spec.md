## ADDED Requirements

### Requirement: Llenar el formulario con una sola foto
WHEN una persona de una empresa que tiene la función encendida elige una foto al crear un producto, el sistema SHALL leer la foto y proponer, en un solo paso, el título, la descripción, la categoría, las características (material y colores), las etiquetas de búsqueda y la imagen principal, y SHALL dejar todo a la vista para que la persona revise y corrija antes de guardar.

#### Scenario: Formulario vacío
- **WHEN** la persona elige una foto con el formulario vacío
- **THEN** el formulario se llena sin hacerle preguntas, la foto queda como imagen principal y un aviso dice qué se llenó y que revise y corrija lo que haga falta antes de guardar

#### Scenario: Nada se guarda solo
- **WHEN** la foto termina de leerse
- **THEN** el producto no se crea ni se modifica: queda en el formulario hasta que la persona lo guarde

#### Scenario: La misma foto otra vez
- **WHEN** la persona vuelve a elegir la misma foto
- **THEN** la lectura se repite, sin tener que elegir otra

### Requirement: Lo que la persona ya escribió se respeta
WHEN la foto trae una propuesta distinta para un campo que ya tiene algo escrito, el sistema SHALL preguntar una sola vez qué hacer —reemplazar con la foto o solo llenar lo vacío— y SHALL NOT cambiar ningún campo si la persona cierra o cancela la pregunta. Las etiquetas de búsqueda SHALL sumarse a las que ya hay, sin quitar ninguna de las de la persona.

#### Scenario: Solo llenar lo vacío
- **WHEN** el título ya está escrito, la descripción está vacía y la persona elige "Solo llenar lo vacío"
- **THEN** el título queda como estaba y la descripción se llena

#### Scenario: Reemplazar con la foto
- **WHEN** la persona elige "Reemplazar con la foto"
- **THEN** los campos con propuesta cambian, incluida la imagen principal, y la imagen anterior deja de ser la del producto

#### Scenario: Cancelar
- **WHEN** la persona cancela o cierra la pregunta
- **THEN** ningún campo, imagen ni etiqueta cambia

#### Scenario: El campo ya dice lo mismo
- **WHEN** un campo ya dice lo que propone la foto, aunque cambien las tildes, las mayúsculas o los espacios
- **THEN** no se pregunta por ese campo

### Requirement: La categoría solo se marca si existe
WHEN la foto sugiere una categoría, el sistema SHALL marcarla solo si es una de las categorías de la empresa. IF la categoría sugerida no existe en la empresa o no se puede identificar sin ambigüedad, THEN el sistema SHALL dejar la categoría sin marcar y avisar que la elija la persona.

#### Scenario: Categoría que la tienda no tiene
- **WHEN** la foto sugiere una categoría que la empresa no tiene
- **THEN** la categoría queda sin marcar y el aviso dice "No encontramos una categoría de su tienda que calce con la foto: elíjala usted."

#### Scenario: Categoría ya elegida
- **WHEN** la persona ya eligió una categoría y la foto sugiere otra
- **THEN** se le pregunta como con cualquier otro campo con algo escrito; si es la misma, no se pregunta

### Requirement: Solo al crear
WHERE el formulario sea el de edición de un producto existente, o la configuración de productos de dropshipping, el sistema SHALL NOT ofrecer "Llenar con una foto".

#### Scenario: Editar un producto
- **WHEN** la persona abre un producto existente para editarlo
- **THEN** no aparece "Llenar con una foto", aunque su empresa tenga la función encendida

### Requirement: Precio, referencia y existencias no se tocan
El sistema SHALL NOT llenar, cambiar ni proponer el precio, el IVA, la referencia, las dimensiones ni las cantidades disponibles de un producto.

#### Scenario: Formulario con precio y referencia escritos
- **WHEN** la persona ya escribió el precio y la referencia y llena el formulario con una foto
- **THEN** el precio, el IVA y la referencia quedan exactamente como estaban

### Requirement: Una lectura a la vez y sin mezclar productos
WHILE se lee una foto, el sistema SHALL impedir guardar el producto. WHILE se guarda un producto, el sistema SHALL NOT permitir pedir otra lectura. IF la respuesta llega cuando la persona ya guardó, pasó a registrar otro producto o salió de la pantalla, THEN el sistema SHALL descartarla sin llenar nada ni mostrar avisos.

#### Scenario: Guardar mientras se lee
- **WHEN** la persona intenta guardar mientras la foto se está leyendo
- **THEN** el botón de guardar está bloqueado y el producto no se guarda a medias

#### Scenario: Registrar otro producto
- **WHEN** la persona guarda, pulsa "Registrar otro" y después llega la lectura anterior
- **THEN** el formulario limpio del producto siguiente no se llena ni se avisa nada

#### Scenario: Salir de la pantalla
- **WHEN** la persona sale de la pantalla mientras se lee la foto
- **THEN** el resultado se descarta sin avisar nada

### Requirement: Si no sale, el formulario queda como estaba
IF la lectura falla o la foto no permite identificar un producto, THEN el sistema SHALL avisar qué pasó y qué hacer y SHALL dejar el formulario exactamente como estaba. WHEN la respuesta tarda más de 70 segundos, el sistema SHALL rendirse con un aviso y liberar el formulario.

#### Scenario: Foto sin producto
- **WHEN** la foto no muestra un producto identificable
- **THEN** el aviso dice "No logramos identificar el producto en esa foto. Pruebe con otra: el producto completo, de frente y con buena luz." y el formulario no cambia

#### Scenario: Se cae la conexión a mitad de la lectura
- **WHEN** no llega ninguna respuesta
- **THEN** a los 70 segundos aparece "Tardó demasiado", el botón de guardar se libera y lo que la persona había escrito sigue ahí

### Requirement: Lo que el formulario rápido no muestra se puede ver y quitar
WHERE el formulario rápido no tenga campos para las características (material y colores) ni para las etiquetas de búsqueda, el sistema SHALL mostrarlas en un resumen "También se guardará con el producto" con la opción "Quitar", SHALL guardarlas con el producto solo si la persona no las quita, y SHALL NOT arrastrarlas al producto siguiente cuando se registra otro.

#### Scenario: Quitar lo que sugirió la foto
- **WHEN** la persona pulsa "Quitar" en el resumen
- **THEN** las características y las etiquetas sugeridas desaparecen y el producto se guarda sin ellas

#### Scenario: Registrar otro producto
- **WHEN** la persona guarda y pulsa "Registrar otro"
- **THEN** el producto siguiente arranca sin las características ni las etiquetas de la foto anterior
