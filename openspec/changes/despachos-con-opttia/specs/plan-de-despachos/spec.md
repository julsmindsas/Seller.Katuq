## Purpose

Arma, para cualquier comercio y en el momento en que se pide, el plan de despachos: qué pedidos salen, agrupados por zona y franja y con el mensajero o la transportadora sugeridos. Muestra también lo que va en un envío automático y lo que no entra al plan, con la razón. Usa el perfil de despacho del comercio y armarlo no escribe nada.

## ADDED Requirements

### Requirement: Pedidos que entran al plan
El plan SHALL incluir los pedidos de la empresa de la sesión que cumplan todo esto:
- **Estado:** uno de los estados despachables de Katuq: Empacado, Para despachar o Producido totalmente.
- **Entrega:** a domicilio.
- **Orden de envío:** todavía no tienen.
- **Cancelación:** no están cancelados, rechazados ni anulados, tampoco por el cliente desde WhatsApp.
- **Pago:** cumplen el mismo criterio que hoy usa la pantalla de Despachos para dejarlos despachar.
- **Fecha de entrega:** es hoy (hora de Colombia).

#### Scenario: Pedido de hoy listo
- **WHEN** un pedido está Empacado, es a domicilio, tiene fecha de entrega de hoy y no tiene orden de envío
- **THEN** aparece en un grupo del plan

#### Scenario: Pedido cancelado por WhatsApp
- **WHEN** el cliente canceló el pedido desde WhatsApp y el pedido sigue Empacado
- **THEN** el pedido no aparece en ningún grupo

### Requirement: Lo que no entra al plan, con su razón
El plan SHALL listar aparte los pedidos listos que no entran a un grupo, cada uno con una de estas razones:
- recoge en tienda;
- sin zona de cobro;
- ya está en una orden de envío;
- pago no apto;
- fecha de entrega vencida, de 1 a 15 días;
- fecha de entrega futura;
- le falta un dato que exige la transportadora;
- va en un envío automático.

Los pedidos con fecha vencida MUST NOT sumarse a un grupo, porque el mensajero no los vería en su lista de hoy. Se muestran con la razón "fecha vencida" para que alguien los revise en Despachos. Los pedidos de más de 15 días MUST NOT aparecer en el plan: los cubre el aviso de pedidos viejos de la IA de despachos (D-404).

#### Scenario: Pedido para recoger
- **WHEN** un pedido listo tiene una forma de entrega de recoger en tienda
- **THEN** aparece en "No entra al plan" con la razón "Recoge en tienda" y en ningún grupo

#### Scenario: Pedido de ayer
- **WHEN** un pedido sigue listo con fecha de entrega de ayer
- **THEN** aparece en "No entra al plan" con la razón "fecha vencida" y no se puede sumar a un grupo

#### Scenario: Pedido de hace 70 días
- **WHEN** un pedido sigue listo con fecha de entrega de hace 70 días
- **THEN** no aparece en el plan

### Requirement: Lo que va en un envío automático
Si el comercio tiene encendido un envío automático hacia una integración, sus pedidos SHALL mostrarse en "Envío automático" con uno de estos estados:
- **enviado;**
- **esperando una condición:** dice cuál;
- **falló:** dice el motivo en palabras, sin texto técnico.

Esos pedidos MUST NOT entrar a un grupo. El plan MUST NOT prender, apagar ni reemplazar un envío automático.

#### Scenario: Envío automático que falló
- **WHEN** el envío automático de un pedido falló por falta de un dato
- **THEN** el pedido aparece en "Envío automático" como "falló" y el motivo está en palabras

### Requirement: Grupos de mensajero por zona y franja
En un comercio con mensajeros, los pedidos del plan SHALL agruparse por zona de cobro y franja de entrega.
- **Tamaño:** un grupo MUST NOT pasar la capacidad registrada del mensajero sugerido. Si no tiene, o es menor que 2, el tope es el tamaño de grupo habitual del perfil del comercio. Un grupo más grande se parte en grupos seguidos.
- **Zonas pequeñas:** las zonas con 2 pedidos o menos se juntan con otra de la misma ciudad y franja.
- **Orden:** los grupos salen ordenados por la hora en que empieza su franja.

#### Scenario: Más pedidos que la capacidad
- **WHEN** una zona tiene 12 pedidos en la misma franja y el mensajero sugerido tiene capacidad 10
- **THEN** el plan arma un grupo de 10 y otro de 2, en ese orden

#### Scenario: Dos franjas en la misma zona
- **WHEN** una zona tiene pedidos de la mañana y de la tarde
- **THEN** quedan en grupos distintos, y primero el de la mañana

### Requirement: Mensajero sugerido con su razón
Cada grupo de mensajero SHALL sugerir un mensajero propio de la empresa que no esté fuera de línea en la app y SHALL decir la razón. El orden de preferencia es:
1. una regla de despacho guardada por el comercio, si aplica;
2. el que ya llevó esa zona hoy;
3. el que tiene la app conectada desde hace 30 minutos o menos;
4. el que ya despachó hoy;
5. el que más llevó esa zona en los últimos 14 días;
6. el de menos pedidos hoy.

Un mensajero MUST NOT recibir dos grupos de la misma franja mientras haya otro con señal de los puntos 2 a 4. Si ningún mensajero tiene señal, el grupo queda "sin sugerencia" y la persona escoge.

#### Scenario: La zona ya salió hoy
- **WHEN** en la mañana una zona salió con un mensajero que sigue en línea y a media mañana hay otro grupo de esa zona
- **THEN** el plan sugiere ese mensajero con la razón "Ya llevó esta zona hoy"

#### Scenario: Nadie con señal
- **WHEN** ningún mensajero ha despachado hoy, ni tiene la app conectada, ni llevó la zona en 14 días
- **THEN** el grupo aparece "sin sugerencia" y no se escoge uno al azar

### Requirement: Aviso de app no conectada
Si el mensajero sugerido o escogido no tiene la app conectada en ese momento, el grupo SHALL avisar que verá los pedidos cuando abra la app.

#### Scenario: Mensajero con la app cerrada
- **WHEN** el mensajero de un grupo está en línea pero su app lleva 2 horas sin conectarse
- **THEN** el grupo dice que verá los pedidos cuando abra la app

### Requirement: Plan determinista, fechado y sin escrituras
- **Mismo resultado:** con los mismos datos, el plan SHALL salir igual.
- **Fecha y huella:** cada plan MUST llevar la hora en que se armó y una huella de los pedidos que contiene.
- **Plan viejo:** se considera viejo cuando cambia alguno de sus pedidos o pasan 10 minutos.
- **Sin escrituras:** armar o mirar el plan MUST NOT escribir nada.
- **Aislamiento:** el plan MUST usar solo datos de la empresa de la sesión firmada.

#### Scenario: Abrir el plan diez veces
- **WHEN** una persona abre y actualiza la vista diez veces sin aprobar
- **THEN** no cambia ningún pedido, orden de envío, mensajero ni regla

#### Scenario: Sesión de otra empresa
- **WHEN** una sesión de la empresa A pide el plan indicando la empresa B
- **THEN** recibe el plan de A o un rechazo, nunca datos de B
