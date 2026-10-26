# Delta: seller-language (ticket cd CMNdBkVZXgYoOCvqfGZc, D-560)

> Idioma del panel Seller: qué idiomas se ofrecen, cuándo se muestra uno nuevo y qué no cambia con el idioma. Aprobada en bloque por Daniel el 2026-10-21 (tarea 0.2), antes de cualquier código (Artículo I).

## ADDED Requirements

### Requirement: Idiomas del panel
El sistema DEBERÁ (SHALL) ofrecer el panel en español de Colombia, inglés de Estados Unidos, portugués de Brasil y alemán estándar de Suiza. El español DEBERÁ (SHALL) ser el idioma por defecto y estar siempre disponible. El alemán DEBERÁ (SHALL) mostrarse en el selector como «Deutsch (CH)» con la bandera de Suiza.

#### Scenario: Selector con los idiomas visibles
- **GIVEN** una plataforma con español, inglés, portugués y alemán visibles
- **WHEN** el usuario abre el selector de idioma del encabezado
- **THEN** ve «English (US)», «Español (CO)», «Português (BR)» y «Deutsch (CH)», cada uno con su bandera

#### Scenario: Idiomas retirados
- **WHEN** el usuario abre el selector
- **THEN** no aparecen francés, chino ni árabe

### Requirement: Idioma por usuario
CUANDO (WHEN) el usuario elige un idioma en el selector, el sistema DEBERÁ (SHALL) mostrar el panel en ese idioma sin recargar la página y recordarlo para sus siguientes sesiones, en cualquier equipo. CUANDO (WHEN) el usuario entra o recarga, el sistema DEBERÁ (SHALL) mostrar el panel en el idioma que eligió. La elección de un usuario NO DEBERÁ (SHALL NOT) cambiar el idioma de otros usuarios de su empresa.

#### Scenario: Cambiar de idioma
- **GIVEN** un usuario con el panel en español
- **WHEN** elige «English (US)»
- **THEN** el encabezado, el menú y la pantalla actual pasan a inglés en lo que ya esté traducido, sin recargar

#### Scenario: Otra sesión
- **GIVEN** un usuario que eligió portugués
- **WHEN** entra desde otro equipo
- **THEN** el panel abre en portugués

#### Scenario: Compañero de la misma empresa
- **GIVEN** dos usuarios de la misma empresa
- **WHEN** uno elige inglés
- **THEN** el otro sigue viendo el panel en el idioma que eligió él

### Requirement: Idioma oculto hasta su revisión
MIENTRAS (WHILE) un idioma no esté habilitado en la configuración de la plataforma, el sistema NO DEBERÁ (SHALL NOT) ofrecerlo en el selector. DONDE (WHERE) la configuración nombre una empresa como empresa de prueba de idiomas, el sistema DEBERÁ (SHALL) ofrecer a sus usuarios todos los idiomas, también los ocultos. El alemán DEBERÁ (SHALL) nacer oculto. Habilitar u ocultar un idioma NO DEBERÁ (SHALL NOT) requerir una nueva versión del panel; el cambio DEBERÁ (SHALL) aplicarse a cada usuario a más tardar en su siguiente inicio de sesión.

#### Scenario: Alemán oculto para un comercio
- **GIVEN** el alemán sin habilitar y un comercio que no es empresa de prueba
- **WHEN** un usuario del comercio abre el selector
- **THEN** ve solo español, inglés y portugués

#### Scenario: Revisor en la empresa de prueba
- **GIVEN** el alemán sin habilitar y la empresa del revisor nombrada como empresa de prueba
- **WHEN** el revisor entra y abre el selector
- **THEN** ve «Deutsch (CH)» y puede usar el panel en alemán

#### Scenario: Habilitar el alemán
- **GIVEN** el alemán revisado
- **WHEN** la plataforma lo habilita en su configuración
- **THEN** los usuarios ven «Deutsch (CH)» desde su siguiente inicio de sesión, sin publicar una versión nueva

### Requirement: Preferencia que ya no se ofrece
SI (IF) el idioma guardado de un usuario está oculto o no existe, ENTONCES (THEN) el sistema DEBERÁ (SHALL) mostrar el panel en español sin borrar la preferencia guardada. CUANDO (WHEN) ese idioma vuelve a habilitarse, el sistema DEBERÁ (SHALL) mostrarlo de nuevo en el idioma que el usuario había elegido.

#### Scenario: Se oculta el alemán
- **GIVEN** un usuario de la empresa de prueba con el alemán elegido
- **WHEN** la empresa deja de ser de prueba y el usuario vuelve a entrar
- **THEN** ve el panel en español y su preferencia sigue guardada como alemán

#### Scenario: Valor antiguo o desconocido
- **GIVEN** un usuario con un idioma guardado que el panel no conoce (por ejemplo, francés)
- **WHEN** entra
- **THEN** ve el panel en español

#### Scenario: Falla al leer la configuración
- **GIVEN** que la configuración de idiomas no se puede leer
- **WHEN** un usuario entra
- **THEN** el inicio de sesión funciona y el selector ofrece español, inglés y portugués

### Requirement: Textos de los componentes estándar
El sistema DEBERÁ (SHALL) mostrar en el idioma elegido los textos propios de los componentes estándar del panel: nombres de días y meses de los calendarios, botones de los calendarios, operadores y botones de los filtros de tabla, mensajes de tabla vacía y textos de carga de archivos.

#### Scenario: Calendario en español
- **GIVEN** un usuario con el panel en español
- **WHEN** abre un selector de fecha
- **THEN** los meses y los días aparecen en español

#### Scenario: Filtro de tabla en alemán
- **GIVEN** un usuario de la empresa de prueba con el panel en alemán
- **WHEN** abre el filtro de una columna
- **THEN** los operadores y los botones aparecen en alemán

### Requirement: Nunca una clave en pantalla
El sistema NO DEBERÁ (SHALL NOT) mostrar al usuario el identificador interno de un texto. SI (IF) a un idioma le falta la traducción de un texto, ENTONCES (THEN) el sistema DEBERÁ (SHALL) mostrar ese texto en español.

#### Scenario: Traducción faltante
- **GIVEN** un texto traducido al español y sin traducción al portugués
- **WHEN** un usuario con el panel en portugués abre la pantalla
- **THEN** ve ese texto en español, legible

### Requirement: El idioma no cambia el comportamiento ni los datos
El idioma elegido NO DEBERÁ (SHALL NOT) cambiar los datos que se guardan o se envían, los estados, los cálculos, las validaciones, los permisos ni las opciones del menú. Los datos que el comercio escribió (productos, categorías, clientes, formas de entrega y demás) DEBERÁN (SHALL) mostrarse como los escribió. Los nombres propios de productos y servicios externos no DEBERÁN (SHALL NOT) traducirse.

#### Scenario: Pedido creado en inglés
- **GIVEN** un usuario con el panel en inglés
- **WHEN** crea un pedido con la venta asistida
- **THEN** el pedido queda guardado igual, con los mismos estados y valores, que si lo hubiera creado en español

#### Scenario: Favoritos del menú
- **GIVEN** un usuario con favoritos en el menú
- **WHEN** cambia de idioma y vuelve
- **THEN** conserva los mismos favoritos y las mismas secciones plegadas

### Requirement: Lo que ve el comprador sigue en español
El idioma del panel NO DEBERÁ (SHALL NOT) cambiar el idioma de lo que ven los clientes del comercio: tienda en línea, catálogo y cotización públicos, correos, mensajes de WhatsApp y documentos PDF. Tampoco DEBERÁ (SHALL NOT) cambiar el formato de números, monedas y fechas.

#### Scenario: Correo al comprador
- **GIVEN** un vendedor con el panel en alemán
- **WHEN** un comprador recibe el correo de su pedido
- **THEN** el correo llega en español, como hoy
