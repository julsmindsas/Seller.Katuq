## ADDED Requirements

### Requirement: La función nace apagada
WHILE una empresa no tiene prendida la bandera `productFromPhoto` (campo ausente, en `false` o con cualquier valor distinto del booleano `true`), el sistema SHALL tratar "Llenar con una foto" como no disponible para esa empresa: SHALL NOT mostrarla en ninguno de los dos formularios de producto, y SHALL rechazar cualquier petición de ficha con el aviso "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.", sin descontar un uso del plan, sin consultar a la IA y sin leer las categorías.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** una empresa sin la bandera usa los formularios de producto, K.A.I. y el guardado
- **THEN** ve las mismas pantallas, los mismos botones y los mismos pasos de siempre, el producto se guarda con el mismo contenido (características adicionales y etiquetas vacías si la persona no las escribió) y las demás consultas de K.A.I. responden igual que antes

#### Scenario: Los clientes actuales
- **WHEN** ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR o ALMACEN BOMBAS, sin la bandera, piden una ficha por la vía directa
- **THEN** reciben el aviso de función no activa y no se descuenta ningún uso del plan, no se consulta a la IA y no se lee ninguna categoría

#### Scenario: Un valor que no es `true` no la prende
- **WHEN** la bandera vale el texto "true", el número 1 o `false`, o la empresa solo tiene prendida otra función
- **THEN** la función sigue apagada

#### Scenario: Ante la duda se cierra
- **WHEN** la empresa no existe, hay dos con el mismo nombre comercial o no se puede leer su bandera
- **THEN** la función está apagada

### Requirement: Se enciende por comercio, primero en la empresa demo
WHEN la bandera se prende para una empresa, el sistema SHALL ofrecer la función a las personas de esa empresa y SHALL NOT cambiar nada para las demás.

#### Scenario: FLORECER prendida, las demás no
- **WHEN** la bandera está en `true` solo para FLORECER
- **THEN** las personas de FLORECER ven "Llenar con una foto" y pueden usarla, y las de ALMARA FELICIDAD no ven nada distinto y reciben el aviso de función no activa si piden una ficha por la vía directa

#### Scenario: Sesión ya abierta
- **WHEN** la bandera se prende mientras una persona tiene la sesión abierta
- **THEN** el sistema ya atiende sus peticiones y la pantalla muestra la función cuando la persona vuelve a iniciar sesión

#### Scenario: Se vuelve a apagar
- **WHEN** la bandera de una empresa vuelve a `false`
- **THEN** el sistema deja de atender sus peticiones al instante y la pantalla deja de mostrar la función en el siguiente inicio de sesión

### Requirement: La empresa sale de la sesión firmada
El sistema SHALL decidir la empresa de una petición solo por la sesión firmada de la persona, y SHALL NOT aceptar el nombre de otra empresa que mande el navegador (en un encabezado o en el cuerpo). WHEN la petición no trae una empresa en la sesión firmada, por ejemplo la de una llave de servicio, el sistema SHALL rechazarla sin leer nada.

#### Scenario: Poner el nombre de otra empresa para prender la función
- **WHEN** una persona de CAFE ESCOBAR, sin la bandera, manda el nombre de FLORECER, que sí la tiene
- **THEN** la petición se rechaza y no se consulta a la IA

#### Scenario: Leer las categorías de otra empresa
- **WHEN** una persona de FLORECER manda el nombre de ALMARA FELICIDAD
- **THEN** la ficha usa solo las categorías de FLORECER

#### Scenario: Llave de servicio
- **WHEN** un agente interno con llave de servicio, sin empresa en la sesión, pide una ficha
- **THEN** se rechaza sin leer categorías ni consultar a la IA

### Requirement: Nadie se prende la función solo
El sistema SHALL NOT permitir que una empresa escriba su propia bandera desde la ficha de su empresa ni desde su alta; las banderas solo las cambia el equipo de Katuq con el procedimiento de banderas.

#### Scenario: La ficha de la empresa trae banderas
- **WHEN** un administrador de un comercio guarda la ficha de su empresa y la petición trae una bandera encendida
- **THEN** la bandera se ignora y la función sigue como estaba

#### Scenario: La bandera llega escrita campo por campo
- **WHEN** la petición trae la bandera escrita como un campo suelto de la empresa, y no dentro de las banderas
- **THEN** también se ignora y la función sigue como estaba

### Requirement: Un despliegue a medias no tumba el sistema
IF en un despliegue incompleto falta alguno de los archivos de la función, THEN el sistema SHALL arrancar igual, SHALL dejar la consulta de fichas cerrada o con un aviso amable, y SHALL mantener idéntico todo lo demás que ya funcionaba.

#### Scenario: Falta el archivo de banderas
- **WHEN** el sistema arranca sin el archivo de las banderas
- **THEN** arranca, la consulta de fichas responde siempre "función no activa" y todo lo demás queda idéntico

#### Scenario: Falta el servicio de la ficha
- **WHEN** el sistema arranca sin el servicio de la ficha y una empresa con la bandera encendida pide una ficha
- **THEN** recibe un aviso amable de que lo intente de nuevo, sin gastar un uso del plan ni ver el error técnico

#### Scenario: Llegó la entrada de la consulta y no lo que la atiende
- **WHEN** el sistema arranca con la consulta de fichas declarada pero sin quien la atienda
- **THEN** arranca, la consulta de fichas no queda disponible y todo lo demás queda idéntico

### Requirement: La función no toca productos, precios ni inventario
El sistema SHALL NOT crear, cambiar ni borrar productos, variantes, precios, listas de precios, inventario ni movimientos de inventario al leer una foto, ni tocar los flujos hacia Shopify. Lo único que SHALL escribir es el contador de usos de IA del plan, el mismo de las demás consultas de IA. Los datos del producto SHALL guardarse solo cuando la persona guarde el formulario, por el guardado de siempre.

#### Scenario: Lectura de una foto
- **WHEN** se lee una foto con la función encendida
- **THEN** no se crea ni cambia ningún producto, precio, lista de precios ni existencia, y solo cambia el contador de usos de IA del plan

#### Scenario: Producto de OH MY STORE
- **WHEN** OH MY STORE, con sus flujos hacia Shopify activos, crea productos por los formularios de siempre
- **THEN** esos flujos y esos productos se comportan exactamente igual que antes de esta función
