> **[21-oct] Nueva, pendiente de aprobación.** Ampliación de D-496 por D-518 (F4-40·2 «métricas de KAI» y F4-40·9). Ticket F4-40, cd `PrDNIoDwRacCPQVcHmx1`, «Métricas». Las métricas de atención (conversaciones, resueltas sin humano, tiempo de respuesta y satisfacción) son de [CONV] H, cd `W2xiIYg4v6midJ35AKfE`.

## ADDED Requirements

### Requirement: «Vendido con Opttia» cuenta lo que vendió KAI

Fuente: F4-40·9; tarea 6.8 de D-496.

THE system SHALL contar como vendido con Opttia en «En vivo»:

- el pedido que se generó desde una cotización hecha por el bot, sabiendo cuál es por el pedido que la cotización registró al convertirse;
- el pedido directo creado por el bot.

THE system SHALL NOT contar un pedido que no viene de ninguno de esos dos caminos. «En vivo» SHALL seguir siendo de solo lectura.

#### Scenario: Cotización del bot convertida en venta asistida

- **WHEN** un vendedor convierte en pedido una cotización hecha por el bot
- **THEN** ese pedido aparece como vendido con Opttia

#### Scenario: Pedido directo del bot

- **WHEN** el bot crea un pedido directo
- **THEN** el pedido aparece como vendido con Opttia

#### Scenario: Pedido sin relación con KAI

- **WHEN** un vendedor crea un pedido desde cero
- **THEN** no aparece como vendido con Opttia

### Requirement: Lo que hizo KAI se puede contar

Fuente: «Métricas» del ticket; F4-40·2.

THE system SHALL permitir contar, por comercio y por período:

- los pedidos creados por KAI;
- las cotizaciones creadas por KAI (ya existe con el asesor KAI, D-481);
- las ventas atribuidas a KAI;
- los pagos que entraron después de un recordatorio de KAI;
- las citas agendadas por KAI desde la conversación.

Cada uno SHALL distinguirse por una marca guardada en el registro al crearlo, no por inferencia.

#### Scenario: Pago recuperado

- **WHEN** un cliente paga después del recordatorio de KAI
- **THEN** el pedido queda marcado como recuperado por KAI

### Requirement: Ventas de la tienda asistidas por KAI

Fuente: F4-40·2 («WhatsApp y web… métricas de KAI»); F4-27 (cd `R4HukFBWSj9PuhCjgQdQ`) prometía «carritos armados por KAI, ventas atribuidas a KAI».

WHEN un comprador termina una compra en la tienda con al menos un producto que KAI le agregó al carrito, THE system SHALL registrar en la medición de la tienda que ese pedido fue asistido por KAI. THE system SHALL NOT cambiar el pedido por eso.

#### Scenario: KAI agregó un producto y el comprador pagó

- **WHEN** el comprador acepta la sugerencia de KAI, la agrega con su botón y compra
- **THEN** la medición de la tienda cuenta ese pedido como asistido por KAI

#### Scenario: Compra sin KAI

- **WHEN** el comprador arma su carrito sin usar a KAI
- **THEN** el pedido no cuenta como asistido por KAI

## [NEEDS CLARIFICATION]

- Dónde ve el comercio estas cifras y si los pedidos del bot entran en «¿De dónde vienen tus ventas?» (F3-25, cd `uub6icHMX86eicw6Iont`). Preguntas 12 y 13 de `proposal.md`.
