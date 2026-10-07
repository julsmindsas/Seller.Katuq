# Reserva confirmada de un pedido repetido

- WHEN un comprador vuelve a enviar una compra ya registrada y la reserva de esa orden está confirmada, THE system SHALL conservar el saldo y no generar otro movimiento de salida por ese reenvío.
- WHEN el pedido es nuevo, THE system SHALL conservar la reserva existente al crear.
- IF la reserva anterior no está confirmada, THEN THE system SHALL conservar el intento de reserva para permitir recuperación.
- IF falla la primera reserva y un reenvío posterior consigue reservar, THEN THE system SHALL confirmar ese descuento y omitirlo en otro reenvío posterior.
- THE system SHALL conservar el precio, variantes, catálogo y listas de precios; no deberá escribir en esos maestros al verificar o ejecutar la reserva.
- THE system SHALL conservar aislamiento de empresa, business code de bodega, autenticación y respuesta del pedido.

Alcance: reenvíos secuenciales después de una reserva confirmada. Las peticiones simultáneas y fallos entre descuento y confirmación quedan fuera de esta corrección.
