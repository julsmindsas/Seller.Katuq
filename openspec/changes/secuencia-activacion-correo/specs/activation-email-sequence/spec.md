## ADDED Requirements

### Requirement: Secuencia por comportamiento que se detiene sola
El sistema SHALL enviar a cada empresa registrada desde el encendido, como máximo, tres correos, cada uno solo si no ha dado el paso:
- a la hora del registro, sin producto propio: el de subir producto;
- a las 24 horas, con producto y sin tienda publicada: el de la tienda en 1 clic;
- a los 3 días de publicar, sin pedidos de la tienda: el de compartirla.

El producto de ejemplo del registro SHALL NOT contar como producto propio. Cuando la empresa da el paso, el sistema SHALL NOT enviarle ese correo ni los anteriores.

#### Scenario: Registro sin producto
- **WHEN** pasa una hora del registro y la empresa solo tiene el producto de ejemplo
- **THEN** recibe "Sube tu primer producto en 2 minutos" con su nombre y un enlace directo a crear producto

#### Scenario: Ya publicó su tienda
- **WHEN** a las 24 horas la empresa ya tiene la tienda publicada
- **THEN** no recibe el correo de la tienda en 1 clic

#### Scenario: Tienda sin pedidos
- **WHEN** pasan 3 días desde que publicó y la tienda no tiene pedidos
- **THEN** recibe cómo compartirla en Instagram y WhatsApp, con su enlace

### Requirement: A quién no le llega
El sistema SHALL NOT enviar la secuencia a:
- empresas registradas antes del encendido;
- empresas marcadas en `metricsExcluded`;
- empresas que no han confirmado su correo;
- empresas que se dieron de baja.

El sistema SHALL NOT enviar más de un correo al día a la misma empresa.

#### Scenario: Registrados que ya contactó Jairo
- **WHEN** se enciende la secuencia
- **THEN** los registros anteriores al encendido no reciben ningún correo de la secuencia

#### Scenario: Dos pasos vencidos el mismo día
- **WHEN** a una empresa le tocan dos correos el mismo día
- **THEN** recibe uno y el otro sale al día siguiente, si todavía aplica

### Requirement: Baja en un clic
Cada correo SHALL traer un enlace para dejar de recibir la secuencia, que funcione sin iniciar sesión y con un solo clic.

#### Scenario: Darse de baja
- **WHEN** alguien toca "No quiero recibir más estos correos"
- **THEN** no recibe ningún otro correo de la secuencia, y los correos de su cuenta (códigos, pedidos) siguen llegando

### Requirement: Nunca dos veces
El sistema SHALL NOT enviar el mismo paso dos veces a la misma empresa, aunque el trabajo se interrumpa o corra dos veces al tiempo.

#### Scenario: Envío interrumpido
- **WHEN** el servidor se reinicia a mitad de un envío
- **THEN** ese paso queda como incierto y no se reintenta

### Requirement: Sombra y medición
En modo sombra, el sistema SHALL calcular y guardar a quién le llegaría cada correo sin enviarlo. El Super Admin SHALL ver por paso:
- a cuántos les llegaría en sombra;
- enviados;
- abiertos, si el remitente lo permite;
- clics;
- cuántos dieron el paso en los 7 días siguientes;
- bajas.

#### Scenario: Revisar antes de encender
- **WHEN** la secuencia está en sombra por dos días
- **THEN** el Super Admin ve cuántos correos habrían salido de cada paso, sin que se haya enviado ninguno
