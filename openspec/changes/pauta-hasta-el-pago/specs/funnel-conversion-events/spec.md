## ADDED Requirements

### Requirement: Tres momentos del embudo llegan a Meta desde el servidor
El sistema SHALL avisarle a Meta, por la API de conversiones del píxel de Katuq, estos momentos de cada empresa registrada por el registro público:

| Momento | Evento | Cuándo |
|---|---|---|
| Registro | `CompleteRegistration` | registro aprobado o correo confirmado |
| Primer pedido real | `PrimerPedido` (propio) | primer pedido de venta asistida, POS o tienda con valor mayor a cero, sin contar los de ejemplo |
| Primer pago | `Subscribe` | primer pago aprobado de la suscripción, con su valor en COP |

Cada evento SHALL salir una sola vez por empresa, aunque el proceso corra muchas veces o se reinicie.

#### Scenario: Primer pedido de una tienda nueva
- **WHEN** una empresa registrada desde un anuncio recibe su primer pedido de tienda por $80.000
- **THEN** Meta recibe un `PrimerPedido` de esa empresa, una sola vez, a más tardar 15 minutos después

#### Scenario: Segundo pago
- **WHEN** una empresa que ya pagó paga su segundo mes
- **THEN** no se manda otro `Subscribe`

### Requirement: Sin doble conteo con el píxel
El evento de registro del servidor SHALL llevar el mismo identificador que ya usa el navegador (`reg-<id de la empresa>`). Los demás SHALL llevar identificadores estables por empresa (`pp-<id>` y `pago-<id>`).

#### Scenario: El navegador y el servidor mandan el registro
- **WHEN** el píxel y el servidor envían el `CompleteRegistration` de la misma empresa
- **THEN** Meta lo cuenta una vez

### Requirement: Solo empresas que cuentan
El sistema SHALL NOT enviar eventos de:
- empresas excluidas de métricas;
- empresas sin correo confirmado;
- cuentas de prueba;
- empresas registradas antes del encendido.

#### Scenario: Registro sospechoso sin confirmar
- **WHEN** una empresa quedó pendiente de confirmar su código
- **THEN** no se envía ningún evento de ella hasta que confirme

### Requirement: Datos personales resumidos
El correo y el teléfono SHALL viajar solo resumidos con SHA-256, con la normalización que pide Meta. Ningún otro dato personal SHALL salir.

Si Daniel lo aprueba, el identificador de clic (`fbc`) guardado al registrarse SHALL acompañar los eventos.

#### Scenario: Contenido del evento
- **WHEN** se arma cualquier evento
- **THEN** lleva el correo y el teléfono resumidos, el id del evento y la fecha, pero no el nombre, el NIT, la dirección ni el nombre del negocio

### Requirement: Encendido por pasos
El envío SHALL tener tres modos: apagado (por omisión), sombra y envío.
- En sombra, el sistema SHALL anotar qué habría enviado, sin llamar a Meta.
- En envío, SHALL llamar a Meta.

Un modo de prueba SHALL poder mandar los eventos con el código de prueba del Administrador de eventos, para que no entren en las métricas reales.

#### Scenario: Sombra
- **WHEN** el modo es sombra y una empresa tiene su primer pedido
- **THEN** queda anotado que se habría enviado `PrimerPedido`, sin llamar a Meta

### Requirement: Un fallo de Meta no afecta la operación
El envío SHALL correr fuera del registro, de los pedidos y del pago. Un error o una demora de Meta SHALL NOT bloquear, demorar ni deshacer ninguna de esas operaciones.

Un envío que quedó a medias SHALL quedar como incierto y SHALL NOT reintentarse solo.

#### Scenario: Meta caído
- **WHEN** Meta no responde durante una hora
- **THEN** los registros, los pedidos y los pagos funcionan igual, y los eventos fallidos quedan anotados con su error
