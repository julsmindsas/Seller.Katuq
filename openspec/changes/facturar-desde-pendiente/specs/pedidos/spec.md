## ADDED Requirements

### Requirement: Disponible por empresa
WHERE el comercio tiene encendida la bandera de facturar desde Pendiente (`featureFlags`, D-505), THE acción «Facturar» SHALL estar disponible también cuando el estado de pago del pedido es Pendiente. WHERE no la tiene, la regla SHALL quedar como hoy (solo Aprobado y PreAprobado).

#### Scenario: Comercio sin la bandera
- **WHEN** un usuario de un comercio sin la bandera abre un pedido Pendiente
- **THEN** «Facturar» no aparece, como hoy

### Requirement: Una sola regla para todos los lugares
THE regla de «cuándo se puede facturar» SHALL vivir en una sola función que lean el botón del detalle, el menú «⋯» de la fila, la tarjeta de «Opciones del pedido» y el resaltado «Sin factura». Ningún lugar SHALL conservar su propia copia de la lista de estados.

#### Scenario: Pedido Pendiente con la bandera
- **WHEN** un pedido Pendiente, sin factura y con integración configurada se abre con la bandera encendida
- **THEN** «Facturar» aparece en el detalle, en el «⋯» y en «Opciones del pedido»

### Requirement: Mismas validaciones de hoy
Para facturar desde Pendiente, THE pantalla SHALL exigir lo mismo que hoy: integración de facturación configurada, proveedor disponible para el pedido, sin factura ni facturación en curso y sin pagos en verificación. El estado Pendiente SHALL ser el único estado nuevo aceptado. Pospendiente, Rechazado, Precancelado y Cancelado SHALL seguir sin poder facturarse.

#### Scenario: Pospendiente
- **WHEN** el pedido está Pospendiente
- **THEN** «Facturar» no aparece

#### Scenario: Pedido con pago por revisar
- **WHEN** el pedido tiene un pago en verificación
- **THEN** «Facturar» no aparece y la tarjeta dice el motivo

### Requirement: Aviso antes de facturar sin pago
WHEN el usuario confirma la factura de un pedido Pendiente, THE ventana SHALL decir que el pedido aún no tiene pago registrado y qué le pasará al estado. THE factura SHALL NOT registrar pagos ni cambiar `faltaPorPagar`.

#### Scenario: Confirmación
- **WHEN** el usuario toca «Facturar» en un pedido Pendiente
- **THEN** ve «Este pedido aún no tiene pago registrado» antes de confirmar

### Requirement: Avance de estado
(Sujeto a la pregunta 1: si se aprueba la alternativa de no cambiar el estado, este requisito se elimina.) WHEN el usuario confirma la factura de un pedido Pendiente, Katuq SHALL pasar su estado de pago a PreAprobado por la edición normal del pedido (`POST /v1/orders/edit`) y SHALL mandar la factura solo si ese cambio salió bien. IF el servidor rechaza el cambio de estado (Tesorería, rol o pago en verificación), THEN Katuq SHALL NOT facturar y SHALL explicar el motivo. IF la factura falla después del cambio, THEN el pedido SHALL quedar PreAprobado sin factura y la pantalla SHALL decirlo.

#### Scenario: Un solo paso
- **WHEN** un vendedor factura un pedido Pendiente
- **THEN** el pedido queda PreAprobado, con su factura en curso, sin pasos manuales

#### Scenario: Tesorería no lo permite
- **WHEN** el servidor rechaza pasar el pedido a PreAprobado
- **THEN** no se emite factura, el pedido sigue Pendiente y el aviso explica por qué

### Requirement: Sin otros efectos en pedidos, inventario y numeración
THE cambio SHALL NOT escribir productos, variantes, precios, listas de precios, `inventory`, `inventoryMovement` ni Shopify por sí mismo. IF el cambio de estado dispara el camino de inventario de la edición (`order-edit`), THEN SHALL hacerlo solo por las reglas de hoy y el diseño SHALL declararlo. THE consecutivos de Katuq (`nroPedido`, órdenes de envío) SHALL NOT cambiar; la factura consume la numeración del proveedor como hoy. La factura automática del servidor SHALL NOT emitir una segunda factura si el pedido pasa a Aprobado después (`pedidoYaFacturado`).

#### Scenario: Productos, precios e inventario
- **WHEN** se factura un pedido Pendiente
- **THEN** `products`, precios y listas de precios quedan idénticos, y `inventory` e `inventoryMovement` solo cambian si el modo de inventario de la empresa ya lo hace al pasar a PreAprobado

#### Scenario: Aprobado después
- **WHEN** Tesorería aprueba el pago de un pedido ya facturado desde Pendiente
- **THEN** no se emite una segunda factura

### Requirement: Integraciones y cartera
WHERE la empresa envía pedidos a Cereza o Shopify, THE diseño SHALL declarar qué valor de `is_paid` sale al pasar a PreAprobado y SHALL obtener la aprobación de Daniel antes de encender la bandera para esa empresa. THE cartera y Tesorería SHALL seguir mostrando el pedido con su saldo pendiente.

#### Scenario: Pedido contra entrega
- **WHEN** un pedido contra entrega se factura desde Pendiente
- **THEN** el saldo por cobrar sigue igual y el diseño ya dijo qué recibe Cereza

### Requirement: Diseño
THE aviso y la ventana SHALL usar `openspec/specs/design-system/spec.md` y la regla de diseño Katuq (D-400): botón principal morado `#5F3FE0`, aviso en par fuerte/fondo suave, sin gradientes y sin scroll horizontal a 390 px.

#### Scenario: Celular
- **WHEN** el usuario factura desde un celular de 390 px
- **THEN** ve el aviso y los botones completos, sin scroll horizontal
