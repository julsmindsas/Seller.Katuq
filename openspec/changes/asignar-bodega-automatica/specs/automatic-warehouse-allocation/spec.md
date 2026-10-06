# Delta: automatic-warehouse-allocation

## ADDED Requirements

### Requirement: Asignación automática solo cuando nadie escogió bodega
CUANDO se cree un pedido sin una bodega escogida por una persona (pedido de integración o pedido sin bodega), el sistema DEBERÁ (SHALL) asignar una bodega a cada línea antes de guardarlo y antes de descontar inventario. CUANDO una persona o la configuración de la tienda escogió la bodega, el sistema NO DEBERÁ (MUST NOT) cambiarla.

#### Scenario: Venta asistida con bodega escogida
- **GIVEN** un pedido de venta asistida con bodega BOD-003
- **WHEN** se crea
- **THEN** todas sus líneas quedan en BOD-003, igual que hoy

#### Scenario: Comercio con una sola bodega
- **GIVEN** un comercio con una sola bodega física y un pedido de su tienda en Shopify
- **WHEN** se crea
- **THEN** todas las líneas quedan en esa bodega y el pedido se comporta igual que hoy

### Requirement: Cero configuración
CUANDO el canal del pedido tenga bodegas asociadas de la misma empresa, el sistema DEBERÁ (SHALL) escoger entre ellas; CUANDO no las tenga o el canal no se reconozca, DEBERÁ escoger entre todas las bodegas de la empresa. EN NINGÚN CASO DEBERÁ asignar ventas a bodegas transaccionales, inactivas o de otra empresa.

#### Scenario: Canal sin bodegas asociadas
- **GIVEN** el canal Shopify de OH MY STORE sin bodegas asociadas
- **WHEN** entra un pedido Shopify
- **THEN** las candidatas son las bodegas físicas de OH MY STORE, sin Merma, Devoluciones ni Tránsito

### Requirement: Cada producto sale de una bodega de su proveedor
El sistema DEBERÁ (SHALL) asignar cada línea solo a una bodega cuyo proveedor coincida con el del producto: Cereza con Cereza, Fullpi con Fullpi, propio con propia.

#### Scenario: Pedido mezclado ORE-001393
- **GIVEN** un pedido con GCC411 (Cereza), JCR4026 (Fullpi) y el Elixir Anesty (propio, no inventariable, vendido antes desde BOD-102)
- **WHEN** se asigna
- **THEN** GCC411 queda en una bodega Cereza con existencias, JCR4026 en una bodega Fullpi con existencias y el Elixir en BOD-102

### Requirement: La menor cantidad de bodegas, cerca del cliente
El sistema DEBERÁ (SHALL) preferir una sola bodega si cubre todas las líneas; si no, la menor cantidad de bodegas; y entre opciones equivalentes, la bodega de la ciudad de entrega. Una línea NO DEBERÁ (MUST NOT) dividirse entre bodegas.

#### Scenario: Una bodega tiene todo
- **GIVEN** dos bodegas propias y una de ellas con existencias de todas las líneas
- **WHEN** se asigna
- **THEN** todo el pedido queda en esa bodega

#### Scenario: Desempate por ciudad
- **GIVEN** un producto Cereza con existencias en Cereza Medellín y Cereza Bogotá, y envío a "Bogotá D.C."
- **WHEN** se asigna
- **THEN** la línea queda en Cereza Bogotá

### Requirement: Nunca bloquea la venta
CUANDO ninguna bodega compatible tenga existencias suficientes, el sistema DEBERÁ (SHALL) asignar la compatible con más unidades, crear el pedido igual y dejar el faltante registrado y visible.

#### Scenario: Sin existencias suficientes
- **GIVEN** una línea de 3 unidades y la mejor bodega compatible con 1
- **WHEN** se crea el pedido
- **THEN** el pedido se crea, la línea queda en esa bodega y el faltante aparece en el registro de la asignación

### Requirement: El inventario se descuenta de la bodega de cada línea
CUANDO se descuente o se reintegre inventario de un pedido con bodega por línea, el sistema DEBERÁ (SHALL) hacerlo en la bodega de cada línea, por cualquier camino (ledger, legacy o flow).

#### Scenario: Sin negativos fantasma
- **GIVEN** el pedido mezclado ya asignado
- **WHEN** se descuenta el inventario
- **THEN** ninguna bodega Cereza queda con existencias negativas de JCR4026 ni del Elixir

### Requirement: Varias bodegas queda visible
CUANDO un pedido quede asignado a más de una bodega y no exista despacho por partes, el sistema DEBERÁ (SHALL) marcarlo como que requiere atención por varias bodegas.

#### Scenario: Pedido mezclado en la lista
- **GIVEN** un pedido asignado a tres bodegas
- **WHEN** el operador abre "Todos los pedidos"
- **THEN** el pedido muestra el aviso de atención con el motivo "varias bodegas"

### Requirement: Producto y precios intactos
EL sistema NO DEBERÁ (MUST NOT) crear, editar, activar o desactivar productos, variantes, precios, precios por cliente ni listas de precios al asignar bodegas o descontar inventario.

#### Scenario: Contract test del write-set
- **GIVEN** la asignación y el descuento de un pedido mezclado en emulador
- **WHEN** se inspeccionan las escrituras
- **THEN** solo se escribieron `orders`, `inventory`, `inventoryMovement` y auditoría/idempotencia
