## ADDED Requirements

### Requirement: Toda función nueva nace apagada
WHILE la ficha de una empresa no traiga prendida la bandera de una función (el campo de banderas `featureFlags` no existe, la bandera no está, o vale algo distinto del verdadero booleano), el sistema SHALL tratar esa función como apagada para esa empresa. El texto "true", el número 1, un mapa o una lista SHALL NOT prenderla. Cada función SHALL tener su propia bandera: prender una SHALL NOT prender otra.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR o ALMACEN BOMBAS (sin banderas en su ficha) usan cualquier pantalla o servicio que ya existe
- **THEN** ven y reciben exactamente lo mismo que antes de que existieran las banderas, y no se escribe nada en su ficha

#### Scenario: Un valor que no es verdadero no la prende
- **WHEN** la bandera de una empresa vale "true" escrito como texto, 1, "on", falso, vacío o un mapa
- **THEN** la función sigue apagada para esa empresa

#### Scenario: Una bandera prendida no prende las demás
- **WHEN** FLORECER tiene prendida una bandera y otra en falso o ausente
- **THEN** solo la primera función está encendida para FLORECER

### Requirement: El catálogo de banderas es cerrado
El sistema SHALL reconocer únicamente las banderas de su catálogo. Una bandera fuera del catálogo SHALL estar siempre apagada, aunque la ficha de la empresa la traiga en verdadero. Sumar una bandera SHALL requerir agregarla al catálogo del servidor y al de la pantalla, con su dueño y su fecha de retiro.

#### Scenario: Nombre fuera del catálogo
- **WHEN** una ficha trae en verdadero una bandera que el catálogo no tiene
- **THEN** esa función está apagada y la ruta que la pida queda cerrada

### Requirement: Ante la duda se cierra
IF la empresa no existe, su nombre comercial viene vacío o lo tienen dos empresas, la lectura falla o la bandera no pertenece al catálogo, THEN el sistema SHALL responder que la función está apagada y SHALL NOT mostrar un error técnico a quien pregunta.

#### Scenario: Dos empresas con el mismo nombre comercial
- **WHEN** se pregunta por una bandera de un nombre comercial que tienen dos empresas
- **THEN** la función está apagada para ambas, aunque una de las dos la tenga prendida

#### Scenario: La lectura falla
- **WHEN** la base de datos no responde mientras se pregunta por una bandera
- **THEN** la función está apagada y la petición no termina en un error del servidor

### Requirement: La empresa de la bandera es la de la sesión firmada
WHEN una petición con sesión pregunta por una bandera, el sistema SHALL usar la empresa que el servidor firmó en la sesión y SHALL ignorar la empresa que la petición declare por su cuenta. IF la sesión no trae empresa, THEN el sistema SHALL responder apagada sin mirar lo que la petición declare. WHEN la ruta es pública, el sistema SHALL identificar la empresa por la dirección de la tienda, resuelta en el servidor, y SHALL NOT usar un dato que el visitante pueda escribir.

#### Scenario: Una empresa no usa la bandera de otra
- **WHEN** una sesión de ALMARA FELICIDAD declara en su petición que es FLORECER, que sí tiene la bandera prendida
- **THEN** la función responde como apagada y no se lee ni se escribe nada de FLORECER

#### Scenario: Ruta pública con una empresa inventada
- **WHEN** un visitante sin sesión escribe el nombre de FLORECER en un dato de su petición a una función que solo FLORECER tiene prendida
- **THEN** la función responde como apagada

### Requirement: El servidor manda; la pantalla solo decide qué muestra
WHEN una función apagada recibe una petición, el sistema SHALL rechazarla sin escribir nada y con un aviso en español claro que diga qué pasó y qué hacer, y SHALL NOT cerrar la sesión de quien la hizo. La pantalla SHALL ocultar los controles de una función apagada, pero ocultarlos SHALL NOT ser lo que impida usarla.

#### Scenario: Petición directa a una función apagada
- **WHEN** alguien de una empresa sin la bandera llama a la función sin pasar por la pantalla
- **THEN** recibe "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.", no se escribe nada y su sesión sigue abierta

#### Scenario: Una bandera prendida en otra función no abre esta
- **WHEN** una empresa tiene prendida la bandera A y llama a la función de la bandera B, apagada
- **THEN** la función B la rechaza con el mismo aviso

### Requirement: Apagar surte efecto de inmediato en el servidor
WHEN se apaga una bandera, el sistema SHALL dejar de ofrecer la función a esa empresa en la siguiente petición, sin reiniciar nada y sin esperar un vencimiento. Preguntar por una bandera SHALL NOT escribir nada y SHALL leer de la ficha solo el campo de banderas, nunca sus integraciones ni credenciales.

#### Scenario: Apagar y volver a preguntar
- **WHEN** la bandera de FLORECER pasa de prendida a apagada
- **THEN** la siguiente petición de FLORECER a esa función se rechaza
