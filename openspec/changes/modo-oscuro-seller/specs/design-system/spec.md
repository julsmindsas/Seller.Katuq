# Delta: design-system (D-502, ticket 1180)

> Cubre las fases 0 y 1 de `modo-oscuro-seller`. Se aprueba en la tarea 0.1, antes de cualquier código (Artículo I). Las fases 2 y 3 extienden el requisito de contraste pantalla por pantalla, cada una con su delta.

## ADDED Requirements

### Requirement: Tema oscuro por usuario, solo dentro del marco con menú
MIENTRAS (WHILE) el usuario tenga una sesión con el tema oscuro elegido y la pantalla se muestre dentro del marco con menú, el sistema DEBERÁ (SHALL) pintar superficies, textos y acentos con el juego oscuro. SI (IF) la pantalla se muestra sin el marco con menú o no hay sesión, ENTONCES (THEN) el sistema DEBERÁ (SHALL) mostrarla en claro, aunque la sesión tenga el oscuro elegido.

#### Scenario: Pantalla con menú y oscuro elegido
- **GIVEN** un usuario con sesión y el tema oscuro elegido
- **WHEN** abre una pantalla con menú, por ejemplo Todos los pedidos
- **THEN** la pantalla se ve en oscuro

#### Scenario: Pantalla sin menú con la misma sesión
- **GIVEN** el mismo usuario
- **WHEN** abre términos y condiciones, el registro o un agente de voz o video
- **THEN** la pantalla se ve en claro

#### Scenario: Recarga sin pasar por el claro
- **GIVEN** un usuario con el oscuro elegido en una pantalla con menú
- **WHEN** recarga la página
- **THEN** la aplicación se ve en oscuro desde que arranca, también mientras termina de cargar la pantalla, sin mostrar antes el claro

### Requirement: Cerrar sesión vuelve al claro
CUANDO (WHEN) se cierra la sesión, porque el usuario la cierra o porque dejó de ser válida, el sistema DEBERÁ (SHALL) mostrar la pantalla siguiente en claro, sin recargar la página y sin restos del oscuro.

#### Scenario: Cerrar sesión en oscuro
- **GIVEN** un usuario en oscuro dentro del marco
- **WHEN** cierra la sesión
- **THEN** el inicio de sesión se ve en claro, igual que si se hubiera recargado

### Requirement: El tema responde al botón y no al sistema operativo
El sistema DEBERÁ (SHALL) decidir el tema solo con la preferencia que el usuario eligió en Katuq. Ninguna pieza de la interfaz DEBERÁ (SHALL NOT) cambiar de tema por la preferencia de color del sistema operativo.

#### Scenario: Sistema operativo en oscuro y Katuq en claro
- **GIVEN** un equipo con el sistema operativo en oscuro y un usuario con Katuq en claro
- **WHEN** abre una pantalla con barra inferior, filtros, chat o un modal
- **THEN** todas esas piezas se ven en claro; y al revés, con el sistema en claro y Katuq en oscuro, se ven en oscuro

### Requirement: La preferencia se conserva
CUANDO (WHEN) el usuario cambia el tema, el sistema DEBERÁ (SHALL) aplicarlo de inmediato y conservarlo en ese navegador. SI (IF) el servidor no guarda la preferencia, ENTONCES (THEN) el sistema DEBERÁ (SHALL) mantener la sesión abierta y el tema elegido; en el siguiente inicio de sesión manda la preferencia guardada en el servidor. MIENTRAS (WHILE) la sesión siga abierta, guardar otros datos del perfil (idioma, foto o instrucciones del asistente) NO DEBERÁ (SHALL NOT) cambiar el tema elegido, tampoco después de recargar.

#### Scenario: El servidor no guarda la preferencia
- **GIVEN** un usuario cuyo rol no puede guardar su tema en el servidor
- **WHEN** prende el oscuro y después recarga la página
- **THEN** sigue en oscuro y con la sesión abierta

#### Scenario: Cambiar el idioma después del tema
- **GIVEN** un usuario que acaba de prender el oscuro
- **WHEN** cambia el idioma, navega a otra pantalla y recarga
- **THEN** sigue en oscuro en todos los pasos

#### Scenario: Otro usuario en el mismo navegador
- **GIVEN** un navegador donde un usuario dejó el oscuro elegido
- **WHEN** inicia sesión otro usuario que eligió el claro
- **THEN** la aplicación se ve en claro

### Requirement: Paleta oscura de la marca y accesible
MIENTRAS (WHILE) el tema oscuro esté activo, el sistema DEBERÁ (SHALL) usar el morado de la marca: el relleno del botón principal en `#5F3FE0` con texto blanco y, para texto e íconos de acento sobre superficies oscuras, un tinte claro del mismo morado. Los colores semánticos DEBERÁN (SHALL) usar su versión clara. El sistema NO DEBERÁ (SHALL NOT) usar el azul cielo heredado (`#6AB5E8` y sus variantes) como acento. En el marco con menú, en Inicio y en cada pantalla desde la fase que la adapta, el sistema DEBERÁ (SHALL) cumplir en oscuro un contraste mínimo de 4,5:1 en texto, y de 3:1 en texto grande, bordes de controles e indicador de foco, sobre cualquier superficie del tema.

#### Scenario: Botón principal en oscuro
- **GIVEN** el tema oscuro activo
- **WHEN** se muestra un botón principal
- **THEN** su relleno es `#5F3FE0` y su texto es blanco

#### Scenario: Enlace o ícono de acento sobre una tarjeta oscura
- **GIVEN** el tema oscuro activo
- **WHEN** se muestra un texto o ícono de acento sobre cualquier superficie oscura
- **THEN** usa el tinte claro del morado y su contraste es de al menos 4,5:1

### Requirement: El claro no cambia y los tamaños son los mismos en los dos temas
MIENTRAS (WHILE) el tema claro esté activo, el sistema DEBERÁ (SHALL) verse igual que antes de este cambio. Cambiar de tema NO DEBERÁ (SHALL NOT) cambiar el tamaño de letra ni los espaciados de los componentes.

#### Scenario: Comparación en claro
- **GIVEN** las capturas en claro tomadas antes del cambio
- **WHEN** se toman de nuevo después de cada fase
- **THEN** son iguales

#### Scenario: Tablas y botones al alternar
- **GIVEN** una pantalla con tabla, campos y botones
- **WHEN** el usuario alterna el tema
- **THEN** el tamaño de letra y los espaciados de esos componentes no cambian

### Requirement: Una sola fuente de colores por tema
El sistema DEBERÁ (SHALL) tomar los colores de cada tema de un único juego de valores compartido por todas las pantallas. Una pantalla NO DEBERÁ (SHALL NOT) definir su propio juego oscuro.

#### Scenario: Pantalla nueva o modernizada
- **GIVEN** una pantalla que se crea o se moderniza
- **WHEN** necesita colores de superficie, texto o acento
- **THEN** los toma del juego compartido y se ve bien en los dos temas sin reglas propias de oscuro
