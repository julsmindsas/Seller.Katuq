# Retiro en punto

- WHEN el comprador elige un punto guardado y habilitado, THE system SHALL aceptar el retiro sin pedir dirección ni ciudad de domicilio.
- WHEN el punto tiene bodega propia, THE system SHALL usarla para comprobar saldo y crear el pedido, incluso si falta la bodega general.
- IF la bodega efectiva no pertenece a la empresa, THEN THE system SHALL rechazar la compra antes de crear pedido o reservar.
- WHEN se confirma un retiro, THE system SHALL mostrar la dirección del local, marcar retiro en cada línea y cobrar envío cero.
- IF el punto no tiene ciudad, THEN THE system SHALL dejarla vacía sin tomar la ciudad del domicilio del comprador.
- THE system SHALL conservar el domicilio auténtico del comprador sin añadir el local a su perfil ni a sus datos fiscales.
- WHEN el comprador pide domicilio, THE system SHALL conservar requisitos de dirección/ciudad y costo/bodega existentes.
- THE system SHALL conservar IVA, cupón, adiciones, preferencias, productos, variantes, precios y listas maestras.
