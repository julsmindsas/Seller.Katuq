# Cantidades acumuladas por producto

- WHEN el mismo producto aparece en varias líneas, THE system SHALL comparar su cantidad total con el saldo real de la bodega efectiva sin mezclar configuraciones.
- IF la suma supera el saldo conocido, THEN THE system SHALL rechazar la compra antes de crear orden o descontar.
- WHEN el saldo real es conocido y positivo, THE system SHALL no rechazarlo por un total legacy desactualizado.
- WHEN los productos tienen distintos docIds, THE system SHALL validar cada uno por separado.
- THE system SHALL conservar venta de productos no inventariables y el comportamiento de respaldo ante error de lectura.
- THE system SHALL conservar producto, variantes, precio, listas maestras y saldo de inventario durante la validación.

Las reservas de compras simultáneas son un requisito aparte de esta validación por carrito.
