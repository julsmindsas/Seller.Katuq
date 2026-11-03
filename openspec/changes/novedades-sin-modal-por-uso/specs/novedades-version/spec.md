## ADDED Requirements

### Requirement: Sin ventana automática de novedades
El Seller SHALL NOT abrir por su cuenta una ventana, capa o diálogo con las notas de versión cuando el usuario entra a una versión nueva.

#### Scenario: Entrar a una versión con notas
- **WHEN** el usuario carga una versión publicada que trae notas que le aplican
- **THEN** la pantalla queda libre para trabajar y las notas solo se ven cuando el usuario abre la pestaña «Novedades»

### Requirement: Novedades en la campana
El Seller SHALL mostrar las novedades en una pestaña «Novedades» del centro de notificaciones, separada de los avisos operativos. WHEN hay al menos una novedad que le aplica al usuario y que no ha visto, the Seller SHALL marcar la campana con un punto sin número.

#### Scenario: Hay novedades sin ver
- **WHEN** existe una novedad que le aplica al usuario con fecha posterior a la última que vio
- **THEN** la campana muestra el punto, la pestaña «Novedades» también lo muestra, y el contador de avisos no cambia

#### Scenario: Abrir la pestaña
- **WHEN** el usuario abre la pestaña «Novedades»
- **THEN** ve las novedades que le aplican de los últimos 45 días, de la más nueva a la más vieja, con su etiqueta (Nuevo, Mejora, Corrige) y su fecha, y el punto desaparece

#### Scenario: Nada que mostrar
- **WHEN** ninguna novedad de los últimos 45 días le aplica al usuario
- **THEN** la pestaña muestra un estado vacío corto y la campana no lleva punto

### Requirement: Solo lo que el usuario usa
Una nota SHALL poder declarar uno o varios módulos (rutas del menú). WHEN una nota no declara módulos, the Seller SHALL mostrarla a todos. WHEN una nota declara módulos, the Seller SHALL mostrarla solo si al menos uno de sus módulos cumple las dos condiciones: está en el menú del usuario (permisos de su rol y banderas de su empresa) y el usuario abrió esa pantalla, o una pantalla dentro de ella, en los últimos 90 días.

#### Scenario: Comercio que no usa facturación electrónica
- **WHEN** una nota pertenece a «facturacion-electronica» y el usuario nunca ha abierto esa pantalla
- **THEN** la nota no aparece ni en la pestaña ni en la píldora de versión nueva, y no enciende el punto

#### Scenario: Módulo que el usuario usa
- **WHEN** una nota pertenece a «ventas/ventas-pos» y el usuario abrió el POS hace 10 días
- **THEN** la nota aparece en la pestaña y, si es nueva para él, enciende el punto

#### Scenario: Módulo fuera de su menú
- **WHEN** el usuario abrió una pantalla hace un mes pero hoy su rol ya no la tiene en el menú
- **THEN** las notas de ese módulo no le aparecen

#### Scenario: Navegador sin historial
- **WHEN** el usuario entra desde un navegador donde no hay registro de pantallas usadas
- **THEN** solo ve las notas generales hasta que abra los módulos

### Requirement: El uso queda en el navegador
El registro de pantallas usadas SHALL guardarse solo en el navegador del usuario, separado por usuario y empresa, y SHALL NOT enviarse al servidor ni a terceros. WHEN el navegador no permite guardar, the Seller SHALL seguir funcionando y mostrar solo las notas generales.

#### Scenario: Dos empresas en el mismo navegador
- **WHEN** un usuario entra con dos empresas distintas en el mismo navegador
- **THEN** el uso y las novedades vistas de una empresa no cuentan para la otra

### Requirement: Píldora de versión nueva con notas que aplican
WHEN la píldora «Versión nueva» ofrece ver las notas de la versión por cargar, the Seller SHALL mostrar solo las notas que le aplican al usuario con la misma regla. WHEN ninguna le aplica, the Seller SHALL NOT ofrecer el botón de ver notas.

#### Scenario: Versión nueva solo con notas de un módulo que no usa
- **WHEN** se publica una versión cuyas notas son todas de un módulo que el usuario no usa
- **THEN** la píldora ofrece actualizar, pero no ofrece ver notas

### Requirement: Notas con módulo válido
WHEN se arma la versión, the build SHALL avisar por consola de cada nota cuyo módulo no corresponde a ninguna ruta del menú del Seller, sin frenar el build.

#### Scenario: Módulo mal escrito
- **WHEN** una nota declara el módulo «facturacion-electronia»
- **THEN** el build muestra un aviso con el texto de la nota y el módulo desconocido
