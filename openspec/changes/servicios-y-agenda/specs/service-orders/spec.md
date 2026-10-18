## ADDED Requirements

### Requirement: Un pedido solo de servicios no pide envío ni bodega
Cuando todas las líneas de un pedido son servicios, el sistema SHALL NOT exigir dirección de envío, ciudad de envío ni bodega, en la venta asistida y en el checkout de la tienda. Si alguna línea es un servicio a domicilio, SHALL pedir la dirección como "dónde se presta el servicio", sin costo de envío.

#### Scenario: Venta asistida de servicios en el local
- **WHEN** el vendedor arma un carrito con un corte y un tinte
- **THEN** el paso de envío no exige dirección y el pedido se crea sin bodega

#### Scenario: Tienda con servicio a domicilio
- **WHEN** el comprador paga una instalación a domicilio
- **THEN** el checkout pide la dirección donde se presta, sin cobrar envío

#### Scenario: Carrito con un producto físico
- **WHEN** el carrito tiene al menos un producto físico
- **THEN** se mantienen las exigencias actuales de dirección, ciudad, bodega y costo de envío

### Requirement: Los servicios no se despachan
El sistema SHALL marcar al crear el pedido si este requiere despacho. Un pedido sin líneas físicas SHALL NOT aparecer en la lista de despachos, en el plan de despachos, en las ofertas a mensajeros ni en el alistamiento.

#### Scenario: Pedido solo de servicios
- **WHEN** se crea un pedido con dos servicios
- **THEN** no aparece en Despachos ni se ofrece a los mensajeros

#### Scenario: Pedido mixto
- **WHEN** se crea un pedido con un aire acondicionado y su instalación
- **THEN** el pedido aparece en Despachos y el alistamiento lista solo el aire acondicionado

#### Scenario: Pedidos anteriores
- **WHEN** se consulta un pedido creado antes de este cambio
- **THEN** sigue apareciendo o no en Despachos como hoy

### Requirement: Cerrar un servicio prestado
El sistema SHALL permitir "Marcar como prestado" un pedido que no requiere despacho, llevándolo a Entregado sin pasar por Despachado. Para pedidos que requieren despacho, SHALL conservar las transiciones actuales.

#### Scenario: Prestado
- **WHEN** el comercio marca como prestado un pedido solo de servicios
- **THEN** el pedido queda Entregado y su historial registra quién y cuándo

#### Scenario: Pedido con productos
- **WHEN** alguien intenta llevar a Entregado un pedido mixto que no ha sido despachado
- **THEN** el sistema lo rechaza como hoy

### Requirement: La factura dice que es un servicio
Cuando la factura electrónica necesite crear en el sistema contable del comercio un ítem que allí no existe y que en Katuq es servicio, el sistema SHALL crearlo como servicio sin control de stock. SHALL NOT modificar ítems que ya existen en el sistema contable, y el ajuste automático de inventario contable SHALL omitir los servicios.

#### Scenario: Servicio nuevo en SIIGO
- **WHEN** se factura un pedido con un servicio que no existe en SIIGO
- **THEN** SIIGO lo recibe como servicio y sin control de stock

#### Scenario: Ítem que ya existe
- **WHEN** el servicio ya existe en el sistema contable como producto
- **THEN** la factura se emite con ese ítem tal como está

### Requirement: Precios, impuestos y consecutivos sin cambios
El sistema SHALL calcular precios, IVA, descuentos, cupones, consecutivos y cartera de un pedido con servicios exactamente igual que hoy.

#### Scenario: Mismo total
- **WHEN** se crea el mismo carrito antes y después de este cambio
- **THEN** el total, el IVA y el consecutivo siguen la misma regla

### Requirement: POS sin cambios
El POS SHALL seguir vendiendo servicios como hoy: el pedido nace Entregado y sin despacho.

#### Scenario: Venta en caja
- **WHEN** se cobra un servicio en el POS
- **THEN** el pedido nace Entregado
