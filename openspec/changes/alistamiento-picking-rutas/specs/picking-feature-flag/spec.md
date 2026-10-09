## ADDED Requirements

### Requirement: El alistamiento nace apagado
WHILE una empresa no tiene prendida la bandera `pickingAlistamiento` (campo ausente, en `false` o con cualquier valor distinto del booleano `true`), el sistema SHALL tratar el alistamiento como no disponible para esa empresa: SHALL responder 403 (`FEATURE_DISABLED`) a iniciar y a completar, tanto el picking como el packing, sin escribir nada; SHALL NOT ofrecer la entrada "Picking y packing" en su menú; y SHALL llevar a la página de inicio, con un aviso claro, a quien abra una dirección del alistamiento.

#### Scenario: Con la bandera apagada nada cambia
- **WHEN** ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR o ALMACEN BOMBAS (sin la bandera) piden iniciar o completar un picking o un packing
- **THEN** el servidor responde 403 "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos." y no escribe en `picking`, `packing`, `inventory`, `inventoryMovement` ni `orders`

#### Scenario: Sin entrada en el menú ni pantalla
- **WHEN** un usuario de una empresa sin la bandera abre el menú, o escribe la dirección de la pantalla de picking o de packing
- **THEN** el menú no muestra "Picking y packing" aunque su rol lo incluya, y la dirección lo lleva a la página de inicio con el aviso "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos."

#### Scenario: Un valor que no es `true` no la prende
- **WHEN** la bandera de la empresa vale el texto "true", el número 1, `false`, o la empresa tiene prendida otra función pero no esta
- **THEN** el alistamiento sigue apagado para esa empresa

#### Scenario: Empresa que no existe o con el nombre repetido
- **WHEN** la empresa de la sesión no existe en `companies` o hay dos con el mismo nombre comercial
- **THEN** el alistamiento está apagado (ante la duda se cierra)

### Requirement: La bandera es de cada comercio y sale de la sesión firmada
El sistema SHALL leer la bandera del documento de la empresa que trae el token firmado y SHALL rechazar con 403, antes de mirar la bandera, una petición cuyo encabezado o cuerpo nombre otra empresa. La llave de servicio, que no trae empresa en el token, SHALL ser rechazada en las rutas del alistamiento.

#### Scenario: Una empresa no usa la bandera de otra
- **WHEN** una sesión de ALMARA FELICIDAD manda el encabezado de FLORECER, que sí la tiene prendida
- **THEN** el sistema responde 403 y no lee ni escribe nada

### Requirement: Se enciende por comercio, primero en la empresa demo
WHEN la bandera se prende para FLORECER con el script de banderas, el alistamiento SHALL funcionar para los usuarios de FLORECER y SHALL NOT cambiar nada para las demás empresas.

#### Scenario: FLORECER prendida, las demás no
- **WHEN** la bandera está en `true` solo para FLORECER
- **THEN** FLORECER ve el menú y la pantalla y sus rutas llegan al servidor, y ALMARA FELICIDAD sigue recibiendo 403 y sin entrada en el menú

#### Scenario: La bandera llega después del inicio de sesión
- **WHEN** el usuario inicia sesión y la empresa, con su bandera prendida, llega unos instantes después
- **THEN** el menú se vuelve a calcular y muestra "Picking y packing" sin recargar la página

#### Scenario: La bandera no cambia
- **WHEN** la empresa llega con la misma bandera con la que se calculó el menú
- **THEN** el menú no se vuelve a calcular

### Requirement: Las consultas de estado solo leen
El sistema SHALL responder las consultas de estado del picking y del packing sin pedir la bandera, y sin escribir, siempre con el candado de empresa.

#### Scenario: Consulta con la bandera apagada
- **WHEN** una empresa sin la bandera consulta el estado del alistamiento de su propio pedido
- **THEN** recibe la respuesta de siempre (o 404 si el pedido no se empezó a alistar) y no se escribe nada
