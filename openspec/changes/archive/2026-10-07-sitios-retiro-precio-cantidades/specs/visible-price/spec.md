# Precio visible coherente con el checkout

- WHEN se elige talla/color, THE system SHALL conservar el precio de la lista pública o del comprador y los extras independientes.
- WHEN una sesión se aplica después de renderizar la ficha, THE system SHALL reflejar su precio en ficha y botón y usarlo al recalcular opciones/adiciones.
- IF la sesión no cambia el precio público promocionado, THEN THE system SHALL conservar su presentación válida.
- WHEN se recupera un carrito con precio base conocido, THE system SHALL actualizar su precio vigente conservando extras, cantidad, variante y configuración.
- WHILE responde una consulta de precios, IF el carrito cambia, THEN THE system SHALL conservar la edición posterior.
- WHEN termina una consulta de una sesión reemplazada o cerrada, THE system SHALL ignorar su respuesta y conservar los precios de la sesión vigente.
- THE system SHALL mantener el texto completo de la variante y dejar productos, precios y listas maestras sin cambios.
