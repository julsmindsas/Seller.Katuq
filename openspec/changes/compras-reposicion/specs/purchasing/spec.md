# Spec delta — reposición sugerida (purchasing)

## ADDED Requirements

### Requirement: Sugerencia de reposición por bodega
El sistema SHALL calcular, por bodega, qué productos hay que comprar y en qué
cantidad, a partir del consumo diario observado y de lo que ya está pedido.

#### Scenario: producto que rota y va a quedar corto
- **WHEN** un producto tiene consumo diario mayor que cero y su saldo disponible
  es menor que el consumo proyectado para los días de cobertura objetivo más los
  días de entrega del proveedor
- **THEN** the system SHALL incluirlo en la sugerencia con la cantidad faltante
  redondeada hacia arriba

#### Scenario: lo que ya viene en camino no se vuelve a pedir
- **WHEN** existen órdenes de compra abiertas o parciales con unidades pendientes
  de recibir de ese producto en esa bodega
- **THEN** the system SHALL restar esas unidades de la necesidad antes de sugerir

#### Scenario: producto sin demanda registrada
- **WHEN** un producto no registra demanda en la ventana consultada
- **THEN** the system SHALL excluirlo de la sugerencia y contarlo aparte, para
  que quien mira sepa cuántos productos quedaron fuera por falta de datos y no
  crea que no hay nada que comprar

#### Scenario: se agota antes de que llegue el pedido
- **WHEN** la cobertura en días de un producto es menor que los días de entrega
  de su proveedor
- **THEN** the system SHALL marcarlo como urgente, distinto de los que solo están
  bajos

### Requirement: Días de entrega del proveedor
El maestro de proveedores SHALL guardar los días de entrega acordados, y la
sugerencia SHALL usarlos para proyectar la necesidad de los productos que se le
compran a ese proveedor.

#### Scenario: proveedor sin días de entrega definidos
- **WHEN** un proveedor no tiene días de entrega registrados
- **THEN** the system SHALL usar el valor por defecto de la empresa y dejar
  constancia de que fue un supuesto, no un dato

### Requirement: La sugerencia propone, una persona decide
El sistema SHALL NOT crear órdenes de compra automáticamente a partir de la
sugerencia.

#### Scenario: convertir la selección en órdenes
- **WHEN** una persona selecciona productos sugeridos y confirma
- **THEN** the system SHALL crear una orden de compra por proveedor con las
  líneas seleccionadas y su último costo conocido
- **AND** SHALL informar cuáles órdenes se crearon si alguna falla, en vez de
  reportar un fracaso total
