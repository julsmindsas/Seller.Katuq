## ADDED Requirements

### Requirement: La empresa de un reporte es la de la sesión
Cuando un usuario con sesión consulta, lista, abre, guarda, edita o borra reportes, o pide las fuentes o los vendedores del constructor, el sistema SHALL usar la empresa de la sesión verificada en el servidor. Nunca SHALL usar una empresa que mande el navegador.

Si la solicitud trae una empresa distinta a la de la sesión, en una cabecera o en el cuerpo, el sistema SHALL rechazarla con "sin acceso" (403) antes de leer o escribir datos. La comparación ignora mayúsculas y espacios.

Si la solicitud no trae empresa, el sistema SHALL usar la de la sesión.

#### Scenario: Comercio pide los pedidos de otra empresa
- **WHEN** un usuario de la empresa A corre una consulta de pedidos enviando la empresa B en la cabecera
- **THEN** recibe 403 con el código `TENANT_MISMATCH` y no se consulta ningún dato de B

#### Scenario: Consulta normal
- **WHEN** un usuario de la empresa A corre una consulta y su navegador envía la empresa A
- **THEN** recibe los datos de A, igual que hoy

#### Scenario: Misma empresa con otra escritura
- **WHEN** la sesión dice "OH MY STORE" y la cabecera dice " oh my store "
- **THEN** la consulta se atiende con la empresa "OH MY STORE" de la sesión

#### Scenario: Guardar en otra empresa
- **WHEN** un usuario de la empresa A guarda, edita o borra un reporte enviando la empresa B
- **THEN** recibe 403 y en B no se crea, cambia ni borra nada

### Requirement: Sin empresa en la sesión no hay reportes
IF la sesión no contiene una empresa válida, THEN el sistema SHALL rechazar toda operación de reportes con sesión con "sin acceso" (403), aunque la solicitud traiga una empresa.

Esto incluye el acceso por llave de servicio, que no lleva empresa en la sesión.

#### Scenario: Llave de servicio contra reportes
- **WHEN** un cliente se autentica con la llave de servicio y pide una consulta de reportes con la empresa B en la cabecera
- **THEN** recibe 403 con el código `TENANT_NOT_IN_JWT` y no se consulta nada

### Requirement: Nadie publica un enlace sobre otra empresa
Solo SHALL quedar publicado un reporte guardado por un usuario de la empresa dueña.

El enlace público de un reporte SHALL seguir funcionando sin sesión, solo sobre la empresa dueña del reporte, como hoy.

#### Scenario: Intento de publicar en otra empresa
- **WHEN** un usuario de la empresa A intenta guardar un reporte público enviando la empresa B
- **THEN** recibe 403 y no aparece ningún enlace público nuevo que lea datos de B

#### Scenario: Enlace público legítimo
- **WHEN** alguien sin sesión abre el enlace de un reporte que la empresa A publicó
- **THEN** ve los datos de A, igual que hoy

### Requirement: La visibilidad usa la identidad de la sesión
Cuando el sistema lista los reportes guardados, SHALL decidir cuáles ve el usuario con el correo y el rol de la sesión. Ignora los correos o roles que mande el navegador.

Ningún reporte que el usuario ve hoy por ser suyo, público o compartido con su correo SHALL dejar de aparecerle.

#### Scenario: Cabecera con el correo de otra persona
- **WHEN** un vendedor lista los reportes enviando en la cabecera el correo de su gerente
- **THEN** ve solo los reportes suyos, los públicos y los compartidos con su correo o su rol

#### Scenario: Reporte compartido por rol
- **WHEN** un reporte se compartió con el rol "Vendedor" y lo lista un usuario con ese rol en su sesión
- **THEN** el reporte aparece en su lista

### Requirement: El filtro del vendedor y la consulta miran la misma empresa
Cuando la empresa tiene encendido "cada vendedor ve solo sus métricas", el sistema SHALL decidir ese filtro y correr la consulta con la misma empresa de la sesión.

#### Scenario: Vendedor con métricas propias
- **WHEN** un usuario de ventas de una empresa con "solo sus métricas" corre un reporte de pedidos
- **THEN** ve solo sus pedidos de su empresa, y cambiar la cabecera no altera ni la empresa ni el filtro

### Requirement: Los rechazos quedan registrados
Cada rechazo por empresa SHALL quedar en el registro de accesos denegados con:
- la operación;
- el motivo;
- de dónde vino la empresa pedida;
- el correo de la sesión, si lo hay.

El registro SHALL NOT guardar el token ni datos del reporte.

Si el registro falla, el rechazo SHALL responderse igual.

#### Scenario: Rechazo auditado
- **WHEN** se rechaza una consulta porque la cabecera pide otra empresa
- **THEN** queda una entrada con la ruta, el código `TENANT_MISMATCH`, el origen `header.company` y el correo de la sesión, sin el token

#### Scenario: Falla el registro
- **WHEN** escribir el registro falla
- **THEN** el usuario recibe el mismo 403 y nada más se rompe
