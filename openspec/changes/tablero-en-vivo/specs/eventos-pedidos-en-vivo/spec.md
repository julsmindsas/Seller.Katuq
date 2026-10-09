## Purpose

Detecta en el servidor, para cada empresa, los cambios de sus pedidos recientes: llegadas, cambios de estado, salidas, entregas, rechazos, cancelaciones y pagos. Se los entrega a la pantalla "En vivo" por un canal autenticado, sin depender de que cada camino que escribe pedidos avise.

## ADDED Requirements

### Requirement: Eventos de pedido
El sistema SHALL emitir un evento por cada cambio observado en un pedido de la empresa creado en los últimos 7 días (hora de Colombia):

| Evento | Cuándo |
|---|---|
| `pedido_nuevo` | aparece un pedido que no estaba en la foto anterior |
| `cambio_estado` | cambia `estadoProceso`; lleva estado y etapa anteriores y nuevos |
| `salida` | el pedido entra a Despachado o a despacho de última milla; lleva el nombre del transportador y si es mensajero propio o transportadora |
| `entregado` | el pedido entra a Entregado o Cerrado |
| `rechazado` | el pedido entra a Rechazado |
| `cancelado` | el pedido entra a un estado de cancelado o anulado |
| `pago_confirmado` | `estadoPago` pasa a Aprobado o Pagado |
| `asignado` | cambia el transportador de un pedido que todavía no ha salido |

Un cambio que no toca esos campos MUST NOT emitir evento.

#### Scenario: Cambio hecho por la app de mensajeros
- **WHEN** la app de mensajeros marca Entregado un pedido sin escribir ninguna fecha de actualización
- **THEN** se emite `entregado` para ese pedido

#### Scenario: Cambio hecho por Shopify, Envíame, flows o picking
- **WHEN** cualquiera de esos caminos cambia `estadoProceso`
- **THEN** se emite el mismo evento que si el cambio viniera del Seller

#### Scenario: Pedido viejo
- **WHEN** cambia de estado un pedido creado hace más de 7 días
- **THEN** no se emite evento, y la foto tampoco lo cuenta en las etapas

#### Scenario: Entrar a la pantalla no inventa eventos
- **WHEN** alguien abre la pantalla y la empresa ya tiene 30 pedidos hoy
- **THEN** no se emiten 30 `pedido_nuevo`; esos pedidos llegan en la foto

### Requirement: Foto del momento
El sistema SHALL entregar a pedido una foto con: cifras de hoy (ventas, pedidos, ticket promedio, ventas y pedidos por hora de hoy y de ayer, pedidos por canal), conteo por etapa de los pedidos de la ventana, pedidos activos con su etapa, flota (nombre y si está en ruta) y los eventos recientes que el servidor conserve. Las ventas MUST calcularse con la misma regla que "Ventas de hoy" de la bienvenida, sin cancelados.

#### Scenario: Misma cifra que la bienvenida
- **WHEN** el mismo usuario consulta la foto y la bienvenida en el mismo minuto
- **THEN** las ventas y los pedidos de hoy coinciden

### Requirement: Canal en vivo autenticado
El canal en vivo SHALL exigir la sesión del usuario en el encabezado de autorización, igual que el resto de la API. La empresa MUST salir del token, nunca de un encabezado o parámetro. Solo los roles con la entrada `en-vivo` en sus menús MUST recibir datos. La única excepción son las sesiones de Katuq (Julsmind en el token): pueden pedir la foto y el canal de una empresa por parámetro, en solo lectura y sin el filtro D-349. En cualquier otra sesión ese parámetro MUST ignorarse.

#### Scenario: Sin sesión
- **WHEN** se abre el canal sin token o con token vencido
- **THEN** responde 401 y no abre el canal

#### Scenario: Empresa ajena en el encabezado
- **WHEN** el token es de la empresa A y el encabezado `company` dice B
- **THEN** responde 403 sin abrir el canal, y nunca llegan eventos de B

#### Scenario: Rol sin la entrada
- **WHEN** el rol no tiene `en-vivo`
- **THEN** responde 200 con `disponible: false` y no abre el canal

#### Scenario: Comercio que pide otra empresa por parámetro
- **WHEN** un usuario de la empresa A abre el canal con el parámetro de empresa B
- **THEN** solo llegan eventos de A

#### Scenario: Katuq abre un comercio
- **WHEN** un usuario de Julsmind abre el canal con el parámetro de FLORECER
- **THEN** llegan los eventos de FLORECER, marcados como solo lectura

### Requirement: Alcance por vendedor
Cuando la empresa tenga activo "cada vendedor ve solo sus métricas" (D-349), el sistema SHALL entregar a cada vendedor solo la foto y los eventos de sus pedidos, con la misma regla de la bienvenida.

#### Scenario: Pedido de otro vendedor
- **WHEN** cambia de estado un pedido asignado a otro vendedor
- **THEN** el vendedor no recibe el evento y los directivos sí

### Requirement: Datos mínimos
Cada evento y la foto SHALL llevar solo: id y número del pedido, nombre corto del cliente (nombre e inicial del apellido), ciudad y barrio, canal, monto, estados y etapas, nombre del transportador y la hora del cambio. MUST NOT llevar teléfono, dirección, documento, correo, ni datos del mensajero distintos de su nombre y si va en moto o camión.

#### Scenario: Cliente con dirección completa
- **WHEN** entra un pedido con teléfono y dirección del cliente
- **THEN** el evento lleva "Laura M." y "Bogotá · Chapinero", sin teléfono ni dirección

### Requirement: Orden, identidad y reconexión
Cada evento SHALL llevar un identificador único y la hora del cambio, y los eventos de un mismo pedido MUST llegar en orden. El canal MUST mandar un latido al menos cada 25 segundos. Al reiniciarse el servidor, MUST avisar a las pantallas para que reconecten, sin dejar el reinicio esperando. Un evento recibido dos veces MUST poder descartarse por su identificador.

#### Scenario: Reinicio del servidor
- **WHEN** se despliega el backend con pantallas abiertas
- **THEN** las pantallas reconectan solas, piden la foto y siguen en vivo, y el reinicio no espera a que se cierren

### Requirement: Carga acotada
El sistema SHALL observar los pedidos de una empresa una sola vez, sin importar cuántas pantallas tenga abiertas, y MUST dejar de observarla cuando lleve 2 minutos sin pantallas. Cada usuario MUST tener un máximo de 3 canales abiertos. Si el servidor llega a su tope de empresas observadas, las pantallas nuevas MUST quedar en modo de respaldo: foto cada 30 segundos, sin canal en vivo.

#### Scenario: Diez pantallas de la misma empresa
- **WHEN** la empresa abre la pantalla en diez equipos
- **THEN** se observa la empresa una sola vez y los diez reciben los mismos eventos

#### Scenario: Tope de empresas
- **WHEN** se alcanza el tope y otra empresa abre la pantalla
- **THEN** esa pantalla muestra "Actualiza cada 30 s" y sus cifras se actualizan con la foto

### Requirement: Solo lectura
Este dominio MUST NOT escribir en `orders`, `inventory`, `inventoryMovement`, `products`, precios, listas de precios, Realtime DB ni en ninguna otra colección.

#### Scenario: Prueba del write-set
- **WHEN** corre la prueba de contrato del detector, la foto y el canal
- **THEN** falla si se intenta cualquier escritura en Firestore o Realtime DB
