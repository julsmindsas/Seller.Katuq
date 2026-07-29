# Delta: tax-strategy-per-country

## ADDED Requirements

### Requirement: Los impuestos de una línea son una lista, no tarifas fijas
THE system SHALL representar los impuestos de cada línea como una lista de impuestos, donde cada uno lleva su código, su base gravable, su tarifa y su monto, sin depender de un conjunto cerrado de tarifas conocidas.

#### Scenario: Línea con un solo impuesto
- **GIVEN** una línea gravada con un único impuesto
- **WHEN** se calculan sus totales
- **THEN** la línea registra un impuesto con su código, base, tarifa y monto

#### Scenario: Línea con varios impuestos simultáneos
- **GIVEN** una línea gravada con varios impuestos que tienen bases distintas entre sí
- **WHEN** se calculan sus totales
- **THEN** la línea registra cada impuesto por separado con su propia base y monto, y el total de la línea es la suma de todos

#### Scenario: Tarifa desconocida para el catálogo actual
- **GIVEN** una línea con una tarifa que no pertenece al conjunto usado hoy en Colombia
- **WHEN** se calculan sus totales
- **THEN** el impuesto se registra igual, sin perderse ni agruparse en otra tarifa

### Requirement: La estrategia de impuestos la determina el país de la empresa
THE system SHALL resolver qué impuestos aplican y cómo se calculan mediante la estrategia correspondiente al país declarado en el perfil de la empresa.

#### Scenario: Empresa colombiana
- **GIVEN** una empresa cuyo perfil declara Colombia
- **WHEN** se calculan los totales de un pedido
- **THEN** se aplica la estrategia colombiana

#### Scenario: País sin estrategia implementada
- **GIVEN** una empresa cuyo perfil declara un país para el que aún no existe estrategia
- **WHEN** se intenta calcular sus totales
- **THEN** el sistema rechaza el cálculo indicando que el país no está habilitado, en lugar de aplicar la estrategia de otro país

### Requirement: Los números de Colombia no cambian
THE system SHALL producir, para cualquier pedido de una empresa colombiana, exactamente los mismos totales, desglose y montos de impuesto que producía antes de esta capacidad.

#### Scenario: Verificación contra los casos de referencia
- **GIVEN** el conjunto de casos de referencia acordados para el cálculo de IVA colombiano
- **WHEN** se calculan con la estrategia de país
- **THEN** todos los resultados coinciden con los valores de referencia, sin que estos hayan sido modificados

#### Scenario: Jerarquía de precio vigente
- **GIVEN** un pedido con precio manual, precio por tipo de cliente y precio por volumen concurrentes
- **WHEN** se calculan sus totales
- **THEN** se resuelve con la misma jerarquía vigente y el impuesto se ancla al precio sin impuesto resuelto

### Requirement: Separación entre impuestos de producto e impuestos de liquidación
THE system SHALL calcular en dos momentos distintos los impuestos que dependen de lo que se vende y los que dependen de cómo se paga, conservando ambos en el documento.

#### Scenario: Impuesto que depende del medio de pago
- **GIVEN** una empresa cuya estrategia de país contempla un impuesto asociado al medio de pago
- **WHEN** se registra el pago del pedido
- **THEN** ese impuesto se calcula en ese momento, se suma al documento y queda identificado como impuesto de liquidación

#### Scenario: Pedido armado y aún sin pagar
- **GIVEN** el mismo pedido antes de registrarse el pago
- **WHEN** se consultan sus totales
- **THEN** muestra los impuestos de producto y no muestra impuestos de liquidación

#### Scenario: País sin impuestos de liquidación
- **GIVEN** una empresa cuya estrategia de país no contempla impuestos asociados al medio de pago
- **WHEN** se registra el pago
- **THEN** los totales del pedido no cambian

### Requirement: Tipo de documento fiscal según el canal de venta
THE system SHALL determinar el tipo de documento fiscal a emitir a partir del canal de la venta y de la estrategia del país de la empresa.

#### Scenario: País con un solo tipo de documento
- **GIVEN** una empresa de un país cuya estrategia contempla un único tipo de documento
- **WHEN** se emite el documento de una venta por cualquier canal
- **THEN** se emite ese tipo

#### Scenario: País que distingue venta presencial de venta a distancia
- **GIVEN** una empresa de un país cuya estrategia contempla un tipo de documento para venta presencial y otro para venta a distancia
- **WHEN** se emite el documento de una venta presencial y el de una venta a distancia
- **THEN** cada una obtiene el tipo de documento que le corresponde
