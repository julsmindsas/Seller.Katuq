# Delta: order-currency-integrity

## ADDED Requirements

### Requirement: Toda orden nace con moneda explícita
WHEN se crea una orden o una cotización, THE system SHALL registrar en ella la moneda en que se expresan sus montos, tomada del perfil de la empresa.

#### Scenario: Orden creada en venta asistida
- **GIVEN** una empresa con perfil de país asignado
- **WHEN** se crea una orden por cualquier canal
- **THEN** la orden queda con la moneda del perfil registrada en ella

#### Scenario: Orden sin moneda
- **GIVEN** una solicitud de creación de orden que no puede resolver la moneda de la empresa
- **WHEN** intenta confirmarse
- **THEN** el sistema la rechaza y no crea la orden

### Requirement: La moneda de la orden es inmutable
THE system SHALL impedir que la moneda registrada en una orden o cotización cambie después de creada, incluso si el perfil de la empresa cambia luego.

#### Scenario: Cambio de perfil posterior
- **GIVEN** una orden creada con una moneda y una empresa cuyo perfil se modifica después
- **WHEN** se consulta o edita esa orden
- **THEN** conserva la moneda con la que nació

### Requirement: Par de monedas y tasa congelada cuando se liquida en otra moneda
WHERE la moneda en que se cobra difiere de aquella en que se expresan los precios, THE system SHALL registrar en la orden ambas monedas y la tasa de cambio utilizada, con la fecha de esa tasa.

#### Scenario: Precio expresado en moneda local y cobro en divisa
- **GIVEN** una empresa que expresa precios en su moneda local y cobra en divisa
- **WHEN** se confirma la orden
- **THEN** la orden registra moneda de presentación, moneda de liquidación, tasa aplicada y fecha de la tasa

#### Scenario: Reproducción posterior del documento
- **GIVEN** una orden liquidada meses atrás con una tasa determinada
- **WHEN** se vuelve a generar su documento
- **THEN** los montos coinciden exactamente con los originales, usando la tasa congelada y no la vigente

#### Scenario: Operación en una sola moneda
- **GIVEN** una empresa que expresa y cobra en la misma moneda
- **WHEN** se confirma la orden
- **THEN** la orden registra esa moneda sin exigir tasa de cambio

### Requirement: Ningún total se presenta ni se agrega sin moneda
THE system SHALL acompañar de su moneda todo total que se muestre o se exporte, y SHALL abstenerse de sumar montos de monedas distintas en un mismo indicador.

#### Scenario: Reporte de una empresa
- **GIVEN** un reporte de ventas de una empresa
- **WHEN** se presenta el total
- **THEN** aparece acompañado de la moneda de esa empresa

#### Scenario: Intento de agregación entre monedas
- **GIVEN** un conjunto de órdenes con más de una moneda
- **WHEN** se solicita un total agregado
- **THEN** el sistema devuelve los totales separados por moneda en lugar de una suma única

### Requirement: Las órdenes históricas quedan con moneda asignada
THE system SHALL asignar moneda a las órdenes y cotizaciones creadas antes de esta capacidad, mediante un proceso que se ejecuta primero en modo simulación.

#### Scenario: Simulación antes de escribir
- **GIVEN** el conjunto de órdenes históricas sin moneda
- **WHEN** se ejecuta el proceso en modo simulación
- **THEN** informa cuántas órdenes cambiarían y con qué moneda, sin modificar ninguna

#### Scenario: Asignación efectiva
- **GIVEN** una simulación revisada y aprobada
- **WHEN** se ejecuta el proceso en modo definitivo
- **THEN** las órdenes históricas quedan con la moneda de la empresa a la que pertenecen y sus montos no cambian
