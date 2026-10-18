## ADDED Requirements

### Requirement: Código SIIGO guardado en el producto

WHEN Katuq arma un ítem de factura SIIGO y el producto tiene
`integrations.siigo.productCode`, THE SYSTEM SHALL usar ese código para buscar
el producto en SIIGO, antes que la referencia.

#### Scenario: Producto con código guardado
- **WHEN** el producto `GLD-00-01-4SSFR` tiene `integrations.siigo.productCode = "GLD-01-4SSFR"`
- **THEN** la factura lleva el producto SIIGO `GLD-01-4SSFR` y no se crea ninguno nuevo

#### Scenario: Producto sin código guardado
- **WHEN** el producto no tiene `integrations.siigo.productCode`
- **THEN** se busca por la referencia, igual que hoy

### Requirement: Equivalencia única antes de crear

WHEN la referencia no existe en SIIGO y el producto no tiene código guardado,
THE SYSTEM SHALL buscar en SIIGO el código equivalente por la regla
marca + referencia sin los bloques de dos dígitos. Si hay exactamente uno, lo
usa y lo guarda en el producto. Si hay cero o más de uno, crea el producto como
hoy.

#### Scenario: Un solo equivalente
- **WHEN** se factura `HCP-00-00-F21U3` y SIIGO solo tiene `HCP-00-F21U3`
- **THEN** la factura usa `HCP-00-F21U3` y el producto queda con ese código guardado

#### Scenario: Dos equivalentes
- **WHEN** la regla encuentra dos productos en SIIGO
- **THEN** no adivina: crea el producto con la referencia de Katuq, como hoy

### Requirement: Escritura acotada en el producto

THE SYSTEM SHALL escribir en `products` solo `integrations.siigo.productCode`,
`integrations.siigo.productCodeSource` e `integrations.siigo.productCodeAt`,
con dot-notation, sin tocar referencia, precios ni catálogo.

#### Scenario: Contract test del write-set
- **WHEN** se guarda un código SIIGO en un producto
- **THEN** el update solo contiene esas tres rutas
