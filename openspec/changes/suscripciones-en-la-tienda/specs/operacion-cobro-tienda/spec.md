> **[21-oct]** Partida de `cobro-recurrente-tienda` por el límite de 3 páginas (Artículo
> XIII). Los cuatro requisitos se aprobaron el 18-oct (D-497, D-518 T·3); lo único nuevo es la
> fuente de cada uno y que el interruptor vive en la configuración de la plataforma (D-505),
> pendiente de aprobación en la tarea 0.9. Ticket F2-43: cd `UVaf50kn4UPbI358NGMk`.

## ADDED Requirements

### Requirement: Interruptor global del cobro
THE system SHALL tener un interruptor global del cobro con tres posiciones: apagado, prueba (solo cuenta lo que cobraría) y cobro, y otro aparte para los avisos. IF el valor falta o no se reconoce, THEN THE system SHALL comportarse como apagado. En apagado y en prueba, THE system SHALL NOT aceptar altas ni enviar cobros nuevos. En todas las posiciones, THE system SHALL seguir aplicando las confirmaciones de cobros ya enviados, para no dejar dinero cobrado sin pedido.

Fuente: D-385; D-497 D7; **[21-oct]** D-505 (vive en la configuración de la plataforma, no en el entorno).

#### Scenario: Modo prueba
- **WHEN** el cobro diario corre en prueba
- **THEN** no envía ningún cobro a la pasarela y su resumen dice cuántos habría hecho

#### Scenario: Valor desconocido
- **WHEN** el interruptor tiene un valor mal escrito
- **THEN** no se acepta ninguna alta y no se envía ningún cobro

### Requirement: Conciliación y cuadre
Cada día, THE system SHALL confirmar los cobros pendientes o inciertos, terminar los pedidos de los períodos pagados que no lo tengan y alertar de lo que siga incierto. El resumen diario SHALL contar suscripciones revisadas, cobros enviados, aprobados, rechazados e inciertos, pedidos creados, omitidas y errores. En cada mes, los cobros aprobados SHALL igualar a los pedidos generados, o la diferencia SHALL aparecer como alerta.

Fuente: D-497 D7; Constitución, Artículo VII.

#### Scenario: Pedido pendiente tras un aprobado
- **WHEN** un período quedó pagado sin pedido por una caída
- **THEN** la conciliación del día siguiente crea su pedido una sola vez

### Requirement: Observabilidad del cobro
Cada cobro, consulta y notificación SHALL dejar un registro estructurado con la clave del intento como identificador de correlación, el resultado (éxito, error o reintento) y la latencia, sin datos personales.

Fuente: Constitución, Artículos VII y XI.

#### Scenario: Rastrear un cobro
- **WHEN** soporte busca la clave de un intento
- **THEN** encuentra el envío, la respuesta, la notificación y el pedido de ese período

### Requirement: Confirmación de la pasarela
WHEN llega una notificación de pago de una suscripción, THE system SHALL guardar el evento crudo antes de procesarlo, validarlo solo con el secreto de la cuenta del comercio dueño, confirmar la transacción con la pasarela y exigir que la clave, el monto y la moneda coincidan con el intento guardado. IF no valida o no coincide, THEN THE system SHALL ignorarla y registrar el motivo. Un aviso atrasado SHALL NOT revertir un período ya pagado. IF llega un aprobado para una suscripción cerrada, THEN THE system SHALL registrar el período como pagado y alertar al comercio.

Fuente: Constitución, Artículos V y X; D-497 D6.

#### Scenario: Secreto de otra cuenta
- **WHEN** llega una notificación de suscripción firmada con un secreto que no es el del comercio dueño
- **THEN** se ignora y no cambia nada

#### Scenario: Monto distinto
- **WHEN** la transacción confirmada tiene un monto distinto al del intento
- **THEN** se ignora, se registra el motivo y no se crea pedido

#### Scenario: Aviso fuera de orden
- **WHEN** llega «pendiente» después de «aprobado» para el mismo cobro
- **THEN** el período sigue pagado

#### Scenario: Las demás notificaciones no cambian
- **WHEN** llegan notificaciones de enlaces de pago, POS o planes de Katuq
- **THEN** se procesan exactamente igual que antes del cambio
