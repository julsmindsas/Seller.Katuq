## Purpose

Permite dejar guardada una venta asistida incompleta y retomarla después, sin perderla
al empezar otra venta y sin crear un pedido mientras tanto.

## ADDED Requirements

### Requirement: Guardar la venta en curso como borrador

Cuando la venta asistida tenga un cliente o al menos un producto, el sistema SHALL
permitir guardarla como borrador con todo su estado: cliente, productos con su
configuración, entrega, facturación, ciudad, bodega y notas. Después de guardar, la
pantalla SHALL quedar lista para una venta nueva.

#### Scenario: Venta a la que le falta la dirección

- **WHEN** el vendedor tiene cliente y tres productos, le falta la dirección y pulsa "Guardar borrador"
- **THEN** el borrador queda en "Mis borradores" con el cliente, los tres productos y el total estimado
- **AND** la venta asistida queda vacía para atender a otro cliente

### Requirement: Un borrador no es un pedido

El sistema SHALL NOT asignar número de pedido, descontar ni reservar inventario,
facturar ni mostrar en pedidos o reportes una venta guardada como borrador.

#### Scenario: Inventario intacto

- **WHEN** se guarda un borrador con 5 unidades de un producto
- **THEN** las existencias de ese producto no cambian
- **AND** el siguiente pedido creado conserva el consecutivo que le correspondía

### Requirement: Retomar un borrador

El sistema SHALL cargar el borrador en la venta asistida tal como quedó. Al cargarlo,
SHALL volver a calcular los precios y las existencias, y SHALL avisar qué productos
cambiaron de precio, ya no existen o no tienen existencias.

#### Scenario: Producto que subió de precio

- **WHEN** el vendedor retoma un borrador y un producto subió de precio desde que lo guardó
- **THEN** la venta muestra el precio vigente
- **AND** un aviso dice qué producto cambió y cuánto

### Requirement: El borrador se borra al crear el pedido

Cuando se cree el pedido desde un borrador retomado, el sistema SHALL eliminar ese
borrador. Si la creación del pedido falla, el borrador SHALL seguir existiendo.

#### Scenario: Pedido creado

- **WHEN** el vendedor retoma un borrador y crea el pedido
- **THEN** el pedido queda creado y el borrador ya no aparece en "Mis borradores"

### Requirement: Visibilidad por usuario y empresa

El sistema SHALL mostrar a cada vendedor solo sus borradores. A la familia
Administrador SHALL mostrarle los de toda su empresa. Ningún usuario SHALL ver ni
retomar borradores de otra empresa. El filtro SHALL aplicarse en el servidor con la
empresa del token.

#### Scenario: Vendedor

- **WHEN** Ana (vendedora) abre "Mis borradores"
- **THEN** ve solo los borradores que ella guardó

#### Scenario: Administrador retoma el de otro

- **WHEN** un administrador retoma un borrador que guardó Ana
- **THEN** puede completarlo y crear el pedido
- **AND** el pedido queda creado por el administrador

### Requirement: Vencimiento

El sistema SHALL eliminar los borradores que lleven 30 días sin modificarse. En la
lista SHALL mostrar "vence en N días" cuando falten 7 días o menos.

#### Scenario: Borrador olvidado

- **WHEN** un borrador cumple 30 días sin cambios
- **THEN** deja de aparecer en la lista y se elimina
