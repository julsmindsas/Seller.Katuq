## ADDED Requirements

### Requirement: Aviso al 80 % del plan gratis
Cuando una empresa del plan gratis llega al 80 % de su tope de pedidos del ciclo mensual, el sistema SHALL avisarle una vez en ese ciclo. El tope es 15 por omisión, o el que le dé su cupón. El aviso dice:
- cuántos pedidos le quedan;
- cuándo se reinicia el cupo;
- qué gana con premium.

El aviso SHALL llevar un enlace directo a la página de pago del plan.

#### Scenario: Pedido 12 del mes
- **WHEN** una empresa gratis registra su pedido número 12 del ciclo
- **THEN** recibe, a más tardar 15 minutos después, un correo "Te quedan 3 pedidos este mes" con el enlace para pasar a premium, y ve el mismo aviso dentro de Katuq

#### Scenario: Pedido 13 del mismo ciclo
- **WHEN** la misma empresa registra el pedido 13
- **THEN** no recibe otro aviso del 80 %

### Requirement: Aviso al llegar al tope
Cuando la empresa gratis llega a su tope de pedidos del ciclo, el sistema SHALL avisarle una vez en ese ciclo que llegó al tope, qué pasa con los pedidos nuevos y cómo seguir vendiendo sin tope.

#### Scenario: Pedido 15
- **WHEN** una empresa gratis llega a 15 pedidos en el ciclo
- **THEN** recibe un único aviso de tope con el enlace al pago

### Requirement: Ciclo nuevo, avisos nuevos
Al reiniciarse el ciclo mensual, los avisos SHALL quedar disponibles otra vez.

#### Scenario: Mes siguiente
- **WHEN** empieza el nuevo ciclo y la empresa vuelve a llegar a 12 pedidos
- **THEN** recibe el aviso del 80 % de ese ciclo

### Requirement: A quién no le llega
El sistema SHALL NOT enviar estos avisos a:
- empresas con premium, pagado o promocional;
- cuentas de prueba o excluidas de métricas;
- empresas que se dieron de baja de los correos de Katuq.

Además, SHALL NOT enviar más de un correo de Katuq al día a la misma empresa, contando la secuencia de activación.

#### Scenario: Premium promocional
- **WHEN** una empresa con premium promocional llega a 12 pedidos
- **THEN** no recibe ningún aviso

### Requirement: Solo lee los pedidos
El aviso SHALL leer el contador de pedidos del plan, sin escribirlo. SHALL NOT tocar la creación de pedidos, el contador mensual, los límites ni el cobro.

#### Scenario: Contract test
- **WHEN** corren las pruebas del aviso
- **THEN** fallan si el código escribe en `orders`, en `currentMonthOrders`, en los límites del plan o en las suscripciones

### Requirement: Encendido por pasos
El aviso SHALL tener los modos apagado (por omisión), sombra y envío, como la secuencia de activación. SHALL medir: avisos enviados, clics y empresas que pagaron dentro de los 14 días siguientes.

#### Scenario: Medición
- **WHEN** el Super Admin consulta las métricas del aviso
- **THEN** ve, por mes, los avisos enviados, los clics y cuántas de esas empresas pagaron en 14 días
