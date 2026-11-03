## ADDED Requirements

### Requirement: Disponible por empresa y con interruptor global
WHERE el comercio tiene encendida la bandera de seguimiento de sesiones y el interruptor global está encendido, THE sistema SHALL registrar sesiones y tiempo conectado. WHERE no, SHALL comportarse exactamente como hoy.

#### Scenario: Comercio sin la bandera
- **WHEN** un usuario de un comercio sin la bandera inicia sesión
- **THEN** recibe su token como siempre, no se guarda ninguna sesión y no se envían latidos

### Requirement: Cada inicio de sesión tiene un identificador
WHEN un usuario inicia sesión por cualquiera de los dos caminos de login, THE servidor SHALL crear una sesión y agregar su identificador (`sid`) al token firmado. IF crear la sesión falla, THEN el login SHALL entregar el token igual, sin `sid`.

#### Scenario: Falla el guardado
- **WHEN** la base no responde al crear la sesión
- **THEN** el usuario entra con normalidad y esa sesión no se mide

### Requirement: La autenticación no cambia
THE servidor SHALL NOT aceptar ni rechazar ninguna petición por el contenido de las sesiones en esta propuesta. THE middleware de autenticación, el candado de empresa y el interceptor SHALL conservar su comportamiento. Un token sin `sid` SHALL seguir siendo válido hasta su vencimiento.

#### Scenario: Token anterior a la publicación
- **WHEN** un usuario con un token emitido antes de publicar hace una petición
- **THEN** la petición se autoriza igual que hoy y no genera sesión

### Requirement: Latido de actividad
WHILE la pestaña está visible y el usuario tuvo actividad (clic, teclado o navegación) en los últimos 5 minutos, THE front SHALL enviar un latido cada 5 minutos. THE servidor SHALL tomar el `sid` y la empresa del token firmado, nunca del cuerpo, y SHALL ignorar los latidos que lleguen con menos de 1 minuto de diferencia. IF el latido falla, THEN SHALL perderse en silencio sin avisar al usuario ni reintentar.

#### Scenario: Pestaña abierta sin uso
- **WHEN** el usuario deja la pestaña abierta 40 minutos sin tocarla
- **THEN** no se envían latidos y esos minutos no suman al tiempo conectado

#### Scenario: Intento de suplantar
- **WHEN** una petición de latido trae en el cuerpo el `sid` de otro usuario
- **THEN** el servidor usa solo el `sid` del token y no modifica la sesión ajena

### Requirement: Tiempo conectado
THE sistema SHALL calcular el tiempo conectado sumando los intervalos entre latidos consecutivos que no excedan 10 minutos, asignando cada intervalo al día (hora de Colombia) del latido que lo cierra. THE vistas SHALL mostrar el tiempo por día, semana y mes, el primer ingreso y la última actividad.

#### Scenario: Hueco largo
- **WHEN** hay latidos a las 9:00, 9:05 y 11:00
- **THEN** se cuentan 5 minutos entre las 9:00 y las 9:05 y ninguno entre las 9:05 y las 11:00

### Requirement: Sesiones abiertas
THE sistema SHALL considerar abierta una sesión sin cierre cuya última actividad sea de los últimos 10 minutos. Varias pestañas del mismo navegador SHALL contar como una sola sesión. THE vista SHALL mostrar de cada sesión navegador, sistema, tipo de equipo, inicio y última actividad, y SHALL marcar al usuario con 2 o más equipos distintos a la vez.

#### Scenario: Dos equipos
- **WHEN** el mismo correo está activo en un computador con Chrome y en un celular
- **THEN** la vista del administrador muestra 2 sesiones abiertas y la marca de equipos distintos

#### Scenario: Dos pestañas
- **WHEN** el usuario abre Katuq en tres pestañas del mismo navegador
- **THEN** cuenta 1 sesión abierta

### Requirement: Cierre de la sesión
WHEN el usuario cierra sesión, THE front SHALL avisar al servidor y la sesión SHALL quedar cerrada con motivo `salio`. IF pasan 10 minutos sin actividad, THEN SHALL quedar `inactiva`, con cierre en su última actividad; IF el token vence, SHALL quedar `vencio`.

#### Scenario: Cierre sin avisar
- **WHEN** el usuario cierra el navegador sin salir
- **THEN** la sesión deja de contar como abierta a los 10 minutos y se cierra como `inactiva`

### Requirement: Datos mínimos
THE sistema SHALL guardar solo empresa, correo, horas, segundos activos por día, navegador, sistema y tipo de equipo. THE sistema SHALL NOT guardar IP, ubicación, páginas visitadas, endpoints, contenido ni el token, y SHALL NOT escribir estos datos en la consola.

#### Scenario: Revisión del registro
- **WHEN** se inspecciona una fila de sesión
- **THEN** no contiene dirección IP, ruta visitada ni token

### Requirement: Quién ve qué
THE usuario SHALL ver solo sus propias sesiones. THE administrador de un comercio SHALL ver solo a los usuarios de la empresa de su token. THE equipo Katuq SHALL ver el resumen por comercio y el detalle por usuario solo con el guardia de equipo Katuq. THE servidor SHALL aplicar esto en cada consulta; esconder una opción en la pantalla no basta.

#### Scenario: Administrador de otro comercio
- **WHEN** un administrador pide las sesiones de un usuario de otro comercio
- **THEN** el servidor responde sin datos de ese usuario

### Requirement: Retención
THE sistema SHALL conservar las filas de sesión 13 meses. WHEN una fila supera ese plazo, SHALL borrarse, solo con el visto bueno de Daniel para el borrado programado.

#### Scenario: Fila vencida
- **WHEN** corre la limpieza y una sesión tiene 14 meses
- **THEN** se borra y las de 12 meses quedan

### Requirement: Costo de escritura acotado
THE sistema SHALL escribir como máximo una vez cada 5 minutos por sesión activa, actualizando siempre la misma fila. THE sistema SHALL NOT agregar escrituras a `apiUsage` ni a las fichas de `users`. THE consultas de las vistas SHALL limitarse por empresa y rango de fechas.

#### Scenario: Una hora de uso
- **WHEN** un usuario trabaja una hora seguida
- **THEN** su sesión se actualiza como máximo 12 veces y no se crea ninguna fila nueva

### Requirement: Aviso a los usuarios
THE sistema SHALL ofrecer a cada usuario «Mis sesiones» y SHALL explicar qué se mide y para qué. THE bandera SHALL NOT encenderse en un comercio sin que el texto esté publicado.

#### Scenario: Usuario curioso
- **WHEN** un usuario abre «Mis sesiones»
- **THEN** ve sus sesiones, sus datos mínimos y el texto de qué se mide

### Requirement: Cerrar otras sesiones queda fuera
THE sistema SHALL NOT cerrar, expulsar ni limitar sesiones en esta propuesta. Esa capacidad SHALL tener su propia spec y aprobación, porque cambia la validación del token.

#### Scenario: Cuenta compartida detectada
- **WHEN** la vista marca un usuario con 3 equipos a la vez
- **THEN** solo informa; ninguna sesión se cierra ni se bloquea

### Requirement: Diseño
THE pantallas SHALL usar `_config-pagina.scss` (D-400) y los tokens de `openspec/specs/design-system/spec.md`: plano, sin gradientes, acento `#5F3FE0`, sin primarios paralelos, ninguna clase con «p-», foco con `:focus-visible`. 

#### Scenario: Celular
- **WHEN** el administrador abre la vista en 390 px
- **THEN** ve la lista sin scroll horizontal ni texto invisible
