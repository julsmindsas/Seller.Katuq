## ADDED Requirements

### Requirement: Una sola vía prende o apaga una bandera
El sistema SHALL ofrecer una única vía para prender o apagar la bandera de una empresa: una operación del equipo técnico que nombra la empresa y la bandera. Ningún guardado de la ficha de empresa, alta ni petición de un usuario SHALL poder cambiar una bandera.

#### Scenario: Ninguna otra vía
- **WHEN** un usuario, con cualquier rol, intenta cambiar una bandera desde una pantalla o con una llamada al servidor
- **THEN** la bandera no cambia

### Requirement: La operación simula por defecto
WHEN se pide prender o apagar una bandera sin confirmar de forma explícita que se quiere escribir, la operación SHALL mostrar la empresa, cómo estaba el campo de banderas y cómo quedaría, y SHALL NOT escribir nada. IF se pide a la vez simular y escribir, THEN la operación SHALL simular.

#### Scenario: Simulación en FLORECER
- **WHEN** el equipo pide prender una bandera de FLORECER sin confirmar
- **THEN** ve el "antes" y el "después (simulado)" y la ficha de FLORECER no cambia

### Requirement: Escribe solo la bandera pedida y lo verifica
WHEN se confirma la escritura, la operación SHALL cambiar únicamente esa bandera de esa empresa, SHALL conservar las demás banderas y todo el resto de la ficha, SHALL releer lo escrito y SHALL avisar y fallar si lo releído no coincide con lo pedido. IF la bandera ya estaba como se pide, THEN la operación SHALL NOT escribir. Al apagar, la operación SHALL dejar la bandera en falso, sin borrar la ficha ni las otras banderas.

#### Scenario: Se conserva todo lo demás
- **WHEN** FLORECER tiene prendida la bandera A y se prende la B
- **THEN** quedan prendidas A y B, y ningún otro campo de FLORECER ni de otra empresa cambió

#### Scenario: Muestra solo lo necesario
- **WHEN** la operación termina
- **THEN** lo que muestra de la ficha es el nombre comercial, su identificador y el campo de banderas, nada de sus integraciones ni credenciales

### Requirement: Se niega ante la duda
IF la empresa no existe, hay más de una con ese nombre comercial, el campo de banderas existe pero no es un mapa, o la bandera no está en el catálogo, THEN la operación SHALL negarse con un mensaje que diga qué encontró y SHALL NOT escribir nada.

#### Scenario: Nombre repetido
- **WHEN** se pide prender una bandera para un nombre comercial que tienen dos empresas
- **THEN** la operación se niega, dice cuáles son y no escribe en ninguna

### Requirement: La ficha de empresa no escribe banderas
WHEN el formulario de la empresa, una edición o un alta traigan banderas, ya sea como bloque completo o campo por campo, el sistema SHALL ignorarlas y SHALL guardar lo demás igual que antes. Una empresa nueva SHALL nacer con todas las funciones apagadas.

#### Scenario: Con la bandera apagada nada cambia al guardar la ficha
- **WHEN** ALMACEN BOMBAS, sin banderas, guarda su ficha
- **THEN** se escriben exactamente los mismos campos de siempre y la ficha sigue sin banderas

#### Scenario: Un administrador no se prende funciones
- **WHEN** el administrador de un comercio manda en su ficha sus banderas en verdadero, como bloque completo o campo por campo
- **THEN** la ficha se guarda sin ellas y las funciones siguen apagadas

#### Scenario: Una ficha abierta hace rato no revierte una bandera
- **WHEN** alguien guarda una ficha cargada antes de que se cambiara una bandera
- **THEN** la bandera conserva el valor que tiene hoy

#### Scenario: Una edición que cae a crear no siembra banderas
- **WHEN** una edición con un NIT que no existe termina creando una empresa nueva y trae banderas
- **THEN** la empresa nace sin banderas

#### Scenario: Un administrador no toca otra empresa
- **WHEN** el administrador de un comercio manda banderas, completas o campo por campo, dirigidas a la empresa de otro comercio
- **THEN** la ficha de esa otra empresa no cambia
