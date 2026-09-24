## ADDED Requirements

### Requirement: Los pedidos de la tienda cuentan en el tope del plan
Cada pedido creado desde la tienda de una empresa gratis SHALL sumar en el mismo tope mensual de pedidos de su plan que ya usa la venta asistida. Las empresas de pago SHALL NOT tener tope.

#### Scenario: Pedido 15 del mes por la tienda
- **WHEN** una empresa gratis con 14 pedidos en el mes recibe uno por la tienda
- **THEN** el pedido se crea normal y el conteo del mes queda en 15

### Requirement: Al tope, la tienda pasa a WhatsApp
Cuando una empresa gratis alcanzó su tope del mes, su tienda SHALL seguir abierta mostrando productos, pero el botón de compra SHALL cambiar a "Pídelo por WhatsApp", con el resumen del carrito ya escrito, hasta el mes siguiente o hasta que la empresa mejore su plan. Si la tienda no tiene WhatsApp, SHALL mostrar cómo contactar al comercio. En ningún caso SHALL cobrarse un pedido que no se pueda crear.

#### Scenario: Comprador llega con el tope alcanzado
- **WHEN** un comprador abre el checkout de una tienda gratis que ya tiene 15 pedidos en el mes
- **THEN** ve "Pídelo por WhatsApp" con su carrito resumido y no ve ninguna forma de pago en línea

#### Scenario: El tope se alcanza mientras alguien compra
- **WHEN** el comprador confirma y el servidor encuentra el tope alcanzado
- **THEN** no se crea pedido ni se cobra, y el comprador ve la opción de WhatsApp con su carrito

#### Scenario: Mes nuevo
- **WHEN** empieza el mes siguiente
- **THEN** la tienda vuelve a recibir pedidos en línea sin que nadie haga nada

### Requirement: El comercio sabe que llegó al tope
El comercio gratis SHALL ver en su panel cuántos pedidos le quedan en el mes y, al llegar al tope, un aviso de que su tienda está recibiendo por WhatsApp, con la opción de mejorar el plan.

#### Scenario: Aviso en el panel
- **WHEN** el comercio entra con el tope alcanzado
- **THEN** ve el aviso con los pedidos del mes y el botón para mejorar el plan
