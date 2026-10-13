## Purpose

Define el papel de Opttia en el plan de despachos: lo explica y avisa lo urgente con un gasto acotado. No decide asignaciones. Por chat solo puede pedir una aprobación que la persona confirma con un botón.

## ADDED Requirements

### Requirement: Opttia explica el plan
Para cada plan, Opttia SHALL escribir un titular y hasta 4 puntos. Los puntos dicen por qué los grupos son así, apoyados en el perfil del comercio, y lo urgente: una franja por vencer, un mensajero sin la app abierta, pedidos con la fecha vencida que alguien debe revisar o un envío automático que falló.
- **Solo cifras del plan:** el texto MUST basarse en las cifras del plan. Una frase con un número que no esté en el plan se descarta.
- **Sin datos de clientes:** a Opttia MUST NOT llegarle ningún nombre, teléfono, documento ni dirección de clientes.

#### Scenario: Franja por vencer
- **WHEN** son las 9:20 y quedan 6 pedidos de la franja "7:00 a 10:00" sin despachar
- **THEN** el resumen dice que la franja vence en 40 minutos y quedan 6 pedidos

#### Scenario: Número inventado
- **WHEN** Opttia escribe "llevas 30 pedidos hoy" y el plan no tiene ese número
- **THEN** esa frase no se muestra

### Requirement: Opttia no decide
Las asignaciones, los grupos y lo que se despacha SHALL salir solo de las reglas del plan y de los ajustes de la persona. Lo que escriba Opttia MUST NOT cambiar un grupo, un mensajero ni un pedido. Ninguna escritura MUST ocurrir sin que una persona apruebe.

#### Scenario: Opttia sugiere otro mensajero en el texto
- **WHEN** el resumen de Opttia menciona a un mensajero distinto del sugerido
- **THEN** el grupo sigue con el mensajero que dicen las reglas o la persona, y nada se despacha por ese texto

### Requirement: Gasto acotado
Cada plan distinto SHALL pedir a lo sumo una explicación a Opttia, con un máximo de una llamada cada 10 minutos por comercio. Todas las pantallas del comercio comparten la misma explicación. Si Opttia no responde en 20 segundos, el plan se muestra sin el resumen y la pantalla sigue funcionando.

#### Scenario: Cinco pantallas abiertas
- **WHEN** cinco personas del mismo comercio abren la vista Despachos con el mismo plan
- **THEN** se pide a Opttia una sola explicación y las cinco ven el mismo texto

### Requirement: Plan y aprobación por chat
En el chat de Opttia dentro de Katuq y en Telegram, una persona con permiso de aprobar SHALL poder pedir "arma el plan de despachos". Opttia le muestra el mismo plan, armado con las mismas reglas, con los botones Aprobar y Descartar.
- **Cómo se aprueba:** solo con ese botón, atado a la cuenta de Katuq de quien lo toca y a su permiso.
- **Grupos de Telegram:** solo aprueba un miembro con la cuenta vinculada y con permiso.
- **WhatsApp:** muestra el plan, pero MUST NOT aprobar.
- **Texto del modelo:** que el modelo escriba "aprobado" o que la persona escriba "sí, hazlo" MUST NOT aprobar nada.

#### Scenario: La persona escribe "sí, despáchalo"
- **WHEN** en el chat la persona escribe "sí, despáchalo" en lugar de tocar el botón
- **THEN** Opttia le recuerda que debe tocar Aprobar y no se despacha nada

#### Scenario: Miembro sin permiso en un grupo de Telegram
- **WHEN** en un grupo de Telegram un miembro sin permiso de despachos toca Aprobar
- **THEN** la aprobación se rechaza y se le dice que no tiene permiso

### Requirement: Registro de lo aprobado por chat
Una aprobación desde el chat SHALL dejar en el historial del pedido el canal (chat de Katuq o Telegram) y el correo de quien aprobó, igual que una aprobación desde En vivo.

#### Scenario: Aprobado desde Telegram
- **WHEN** una persona aprueba un grupo desde Telegram
- **THEN** el historial de cada pedido del grupo muestra "plan de Opttia · Telegram" y su correo
