## ADDED Requirements

### Requirement: Bandera por operación
Cada operación que Opttia propone, salvo despachar, SHALL tener por comercio su propia bandera para pasar a encendido. Sin esa bandera, la operación sigue como en la fase 1.
- **Arrancar producción:**
  - apagada si el comercio no tiene ni el plan de despachos de D-410 ni la bandera de producción;
  - en sombra con el plan de despachos encendido, como en la fase 1;
  - encendida con su propia bandera, aunque el comercio no tenga el plan de despachos. Encendida gana sobre sombra.
- **Cobrar pedidos sin pago:**
  - señal con "Abrir pedido", como en la fase 1;
  - encendido con "Abrir WhatsApp", con su propia bandera.
- **Despachar** sigue con la bandera de su plan (D-410).
- **Por comercio:** cada bandera SHALL encenderse comercio por comercio, con el visto bueno de Daniel. El primero es FLORECER.
- **Sin desplegar:** apagar la bandera de un comercio SHALL devolver la operación a su modo de la fase 1. El interruptor general SHALL seguir apagando todas las propuestas.
- **Revisión en el servidor:** cada aprobación y cada pedido de enlace MUST volver a revisar la bandera, el interruptor general y el de Opttia de la empresa.

#### Scenario: Encendido solo en FLORECER
- **WHEN** la producción está encendida en FLORECER y en sombra en ALMARA FELICIDAD
- **THEN** solo en FLORECER la tarjeta de producción trae Aprobar; en ALMARA FELICIDAD dice "Así lo haría Opttia"

#### Scenario: Apagar la bandera
- **WHEN** Daniel apaga la producción encendida de FLORECER
- **THEN** la tarjeta vuelve a "Así lo haría Opttia" sin desplegar, y una aprobación que llegue después no cambia ningún pedido

### Requirement: Arrancar producción
La cola SHALL incluir una propuesta de producción cuando se cumplen todas estas condiciones:
- la operación no está apagada en el comercio;
- el comercio produce, es decir, algún pedido pasó por producción en los últimos 90 días;
- hay pedidos sin producir, no cancelados, que se entregan hoy o mañana, en hora de Colombia;
- la persona puede verla: en sombra, solo la familia Administrador; encendida, la familia Administrador o un rol con Pedidos o Despachos en su menú. Un vendedor que solo ve lo suyo (D-349) MUST NOT verla.

La propuesta dice, por ejemplo, "5 pedidos se entregan mañana y nadie los ha empezado". Es urgente si alguno se entrega hoy. La escena los pone en fila numerada frente a la banda, con su hora de entrega, hasta 12.

- **En sombra:** SHALL decir "Así lo haría Opttia · pronto podrás aprobarlo", MUST NOT tener botón de aprobar y MUST NOT escribir nada.
- **Encendida:** aprobar SHALL pedir los dos toques, con el efecto real en el segundo ("Confirmar: 5 pedidos pasan a En producción"). Pasa los pedidos de "Sin producir" a "En producción" con las mismas reglas de la pantalla de pedidos. Además:
  - el servidor SHALL revisar cada pedido otra vez al aprobar. Si ya está en producción, SHALL decir "Ya estaba en producción" sin cambiarlo. Si cambió desde que se propuso, se canceló, ya no se entrega hoy o mañana o pasó a otro estado, MUST quedar fuera con su razón;
  - aprobar lo mismo dos veces (doble toque, dos personas o un reintento) SHALL cambiar cada pedido una sola vez. Mientras otra persona lo aprueba, SHALL decir "Lo está aprobando <persona>";
  - una aprobación SHALL llevar a lo sumo 50 pedidos; los demás salen en la siguiente propuesta;
  - el pedido SHALL guardar quién lo aprobó y que vino de una propuesta de Opttia, y su historial de estados, quién hizo el cambio;
  - MUST NOT avisar al cliente; solo avisa al equipo del comercio;
  - MUST NOT cambiar inventario, productos, precios ni otros datos del pedido;
  - si un pedido no se puede pasar, SHALL quedar como estaba y poder aprobarse otra vez;
  - el resultado SHALL decirse por pedido, en palabras, y la escena lo anima solo con los eventos reales.
- **Nunca a "Producido totalmente":** la propuesta MUST NOT llevar un pedido a ese estado, porque ese estado sí le avisa al cliente.

#### Scenario: Comercio que no produce
- **WHEN** un comercio cuyos pedidos pasan de sin producir a despacho sin pasar por producción tiene pedidos para mañana
- **THEN** no aparece la propuesta de producción

#### Scenario: Persona que no es Administrador, en sombra
- **WHEN** una persona de ventas abre Mi operación en un comercio que produce y tiene la producción en sombra
- **THEN** no ve la propuesta; solo ve las que puede usar

#### Scenario: Aprobar en FLORECER
- **WHEN** la producción está encendida en FLORECER y una persona de Administrador aprueba "5 pedidos se entregan mañana" con dos toques
- **THEN** los 5 pasan a En producción, el pedido dice que vino de Opttia y quién lo aprobó, el equipo recibe su aviso y el cliente no recibe nada

#### Scenario: Un pedido se canceló antes de confirmar
- **WHEN** entre la propuesta y la confirmación se cancela el #1043
- **THEN** los demás pasan a En producción y el resultado dice que el #1043 quedó fuera porque se canceló

#### Scenario: Dos celulares aprueban lo mismo
- **WHEN** dos personas aprueban la misma propuesta casi al mismo tiempo
- **THEN** cada pedido cambia una sola vez, y la segunda persona ve "Lo está aprobando…" o "Ya estaba en producción"

### Requirement: Cobrar pedidos sin pago
Cuando el radar marca un pedido sin pago, la cola SHALL incluir una señal, por ejemplo "El #1045 lleva 2 h sin pago". El radar marca un pedido cuando lleva más de 90 minutos sin pago y sin salir. La señal:
- tiene prioridad importante;
- MUST NOT escribir nada en Katuq;
- se retira sola cuando llega el pago.

Según el modo de la operación:
- **Señal (sin su bandera):** el botón es "Abrir pedido", que abre su ficha.
- **Encendido:** para la familia Administrador o un rol con Pedidos o Despachos en su menú, el botón principal SHALL ser "Abrir WhatsApp", y "Abrir pedido" pasa a secundario. Al tocarlo:
  - el teléfono del cliente SHALL pedirse en ese momento, solo para ese pedido y con la sesión de la persona. Un vendedor que solo ve lo suyo solo lo obtiene para sus pedidos;
  - SHALL abrir WhatsApp con el recordatorio ya escrito. El texto sale de una plantilla con el primer nombre del cliente, el comercio, el número de pedido y el saldo, sin pasar por Opttia;
  - la persona decide si lo envía. Katuq MUST NOT enviar nada ni guardar el teléfono o el mensaje;
  - si el pedido ya no tiene saldo, se canceló o no tiene un celular válido, SHALL decir por qué y dejar "Abrir pedido";
  - "Ya pagó / no aplica" SHALL descartarla por hoy para esa persona.

Privacidad:
- el monto MUST NOT verse con "ocultar";
- en televisor, con "ocultar" y durante "Repetir el día", "Abrir WhatsApp" MUST NOT existir y el teléfono MUST NOT pedirse;
- en televisor MUST NOT verse nombre ni teléfono del cliente.

#### Scenario: Llega el pago
- **WHEN** la señal del #1045 está en la cola y llega el pago confirmado
- **THEN** la señal sale de la cola y la escena muestra la confirmación con el evento real

#### Scenario: Abrir WhatsApp
- **WHEN** el cobro está encendido y una persona de Administrador toca "Abrir WhatsApp" en la señal del #1045
- **THEN** se abre WhatsApp con "Hola Ana, te escribimos de <comercio> por tu pedido #1045…" listo para enviar, y Katuq no envía nada

#### Scenario: Televisor
- **WHEN** la pantalla está en modo televisor y la cola tiene una señal de cobro
- **THEN** no hay "Abrir WhatsApp" y la pantalla no pide ningún teléfono
