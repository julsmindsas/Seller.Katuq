## ADDED Requirements

### Requirement: La pantalla muestra una función solo con su bandera prendida
WHILE la bandera de una función no esté prendida para la empresa de la sesión, la pantalla SHALL NOT mostrar los controles, menús ni avisos de esa función, y SHALL NOT dejar huecos, candados ni textos de "próximamente". WHEN la bandera esté prendida, la pantalla SHALL mostrarla.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** un usuario de OH MY STORE, sin banderas, abre cualquier pantalla
- **THEN** ve las mismas pantallas, menús y controles de siempre

#### Scenario: FLORECER con la bandera prendida
- **WHEN** un usuario de FLORECER inicia sesión con una bandera prendida
- **THEN** ve los controles de esa función y solo de esa

### Requirement: Nunca se presta la bandera de una empresa a otra
WHEN la empresa guardada en el navegador no es la de la sesión actual, o no hay sesión, la pantalla SHALL tratar todas las funciones como apagadas.

#### Scenario: Restos de un inicio de sesión anterior
- **WHEN** alguien de ALMARA FELICIDAD inicia sesión en un navegador donde quedó guardada FLORECER con una bandera prendida
- **THEN** no ve esa función mientras no se cargue su propia empresa

### Requirement: Sin datos legibles, todo apagado
IF el navegador bloquea el almacenamiento, los datos guardados no se pueden leer o el campo de banderas no tiene la forma esperada, THEN la pantalla SHALL tratar todas las funciones como apagadas y SHALL seguir funcionando.

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador está en una ventana privada que bloquea el almacenamiento
- **THEN** la pantalla funciona como siempre, sin funciones nuevas y sin errores visibles

#### Scenario: Valor que no es verdadero
- **WHEN** la ficha guardada trae una bandera con el texto "true", el número 1 o un mapa
- **THEN** la pantalla no muestra esa función

### Requirement: La pantalla se entera al iniciar sesión
WHEN la empresa llega unos instantes después del inicio de sesión, la pantalla SHALL volver a decidir qué mostrar sin recargar. Un cambio de bandera hecho con la sesión abierta SHALL verse en el siguiente inicio de sesión.

#### Scenario: La empresa llega tarde
- **WHEN** el usuario de FLORECER inicia sesión y su empresa, con la bandera prendida, llega unos instantes después
- **THEN** el control de la función aparece sin recargar la página

#### Scenario: Se prende con la sesión abierta
- **WHEN** se prende una bandera de FLORECER mientras su usuario tiene la sesión abierta
- **THEN** el control aparece cuando vuelve a iniciar sesión; mientras tanto, si llegara a la función por otra vía, el servidor la rechaza con el aviso estándar

### Requirement: El aviso habla de negocio
Todo texto que la pantalla muestre por una función apagada SHALL decir qué pasó y qué hacer, en español claro, y SHALL NOT usar las palabras "bandera" ni "feature flag", ni códigos técnicos.

#### Scenario: Aviso estándar
- **WHEN** el servidor rechaza una función apagada
- **THEN** quien lo ve lee "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos." y nada más técnico
