## ADDED Requirements

> Alcance: factura DIAN directa (factura libre y factura desde un pedido). Ticket 1483, D-620. Los requisitos A y B
> no cambian el XML, el CUFE ni el valor que se envía a la DIAN; el requisito C solo aplica si se aprueba el cambio C.

### Requirement: Desglose del IVA por tarifa
Al revisar una factura, el sistema SHALL mostrar el IVA agrupado por tarifa (0 %, 5 %, 19 %), con la base y el
impuesto de cada una, y la suma SHALL coincidir con el IVA total de la factura.

#### Scenario: Factura con dos tarifas
- **WHEN** la factura tiene una línea al 19 % y otra al 5 %
- **THEN** la revisión muestra una fila por tarifa con su base y su IVA, y el total de IVA es la suma de las filas

#### Scenario: Factura sin IVA
- **WHEN** todas las líneas están al 0 %
- **THEN** la revisión muestra un aviso que dice que la factura no cobra IVA y sugiere confirmarlo con el contador, sin impedir emitir

### Requirement: Indicadores que explican el IVA en cero
Los indicadores del período SHALL informar cuántas facturas aceptadas no cobraron IVA y SHALL sumar las retenciones
registradas; solo SHALL decir «no registradas» cuando ninguna factura del período tiene retenciones.

#### Scenario: IVA generado en cero
- **WHEN** el IVA generado del período es $0 y hay facturas aceptadas
- **THEN** la tarjeta indica cuántas de esas facturas no cobraron IVA

#### Scenario: Retenciones registradas
- **WHEN** al menos una factura aceptada del período tiene retenciones
- **THEN** la tarjeta muestra la suma de las retenciones registradas en lugar de «no registradas»

### Requirement: Retenciones por factura
Con la función habilitada para la empresa, el sistema SHALL permitir registrar en la revisión de la factura, de forma
opcional, ReteFuente, ReteIVA y ReteICA como valor o porcentaje, y SHALL rechazar valores negativos o mayores que la
base sobre la que se aplican.

#### Scenario: Retención de fuente
- **WHEN** el comercio registra una ReteFuente del 2,5 % sobre una factura con base $1.000.000
- **THEN** la revisión muestra una retención de $25.000 y la guarda con la factura

#### Scenario: Valor inválido
- **WHEN** el comercio escribe una retención negativa o mayor que su base
- **THEN** el sistema la rechaza con un mensaje en lenguaje sencillo y no deja revisar la factura

#### Scenario: Función no habilitada
- **WHEN** la empresa no tiene habilitadas las retenciones
- **THEN** la factura se ve y se emite exactamente como hoy

### Requirement: Neto a pagar
La revisión y el detalle de la factura SHALL mostrar, por separado, el «Total a facturar» (valor del documento ante la
DIAN) y el «Neto a pagar» (total a facturar menos las retenciones registradas).

#### Scenario: Factura con retenciones
- **WHEN** una factura de $1.190.000 tiene retenciones por $49.700
- **THEN** la revisión muestra Total a facturar $1.190.000 y Neto a pagar $1.140.300

#### Scenario: Factura sin retenciones
- **WHEN** la factura no tiene retenciones
- **THEN** el neto a pagar es igual al total a facturar

### Requirement: Retenciones sugeridas sin aplicarlas solas
El sistema MAY sugerir las retenciones que el mismo cliente tuvo en su última factura del comercio, y SHALL rotular la
sugerencia con su origen. El sistema SHALL NOT aplicar una sugerencia sin que el comercio la confirme.

#### Scenario: Cliente con factura anterior con retenciones
- **WHEN** el comercio elige un cliente cuya última factura tuvo ReteFuente
- **THEN** la revisión ofrece repetirla como «según tu última factura» y solo la aplica si el comercio la acepta

#### Scenario: Cliente sin historial
- **WHEN** el cliente no tiene facturas con retenciones
- **THEN** no se sugiere ningún valor y el comercio puede escribirlos

### Requirement: Las retenciones no alteran el documento fiscal
Mientras no esté aprobado el cambio C, registrar retenciones SHALL NOT modificar el XML, el CUFE, el valor a pagar
enviado a la DIAN ni el consecutivo de la factura.

#### Scenario: Misma factura con y sin retenciones
- **WHEN** se emiten dos facturas idénticas, una con retenciones registradas y otra sin ellas
- **THEN** el XML y el CUFE de cada una se calculan con los mismos importes fiscales

#### Scenario: Cliente y cartera
- **WHEN** la factura tiene retenciones registradas
- **THEN** el saldo de cartera del pedido no cambia por ellas hasta que se apruebe el cambio de cartera (FE-21/FE-22)

### Requirement: Retenciones en el XML (solo si se aprueba el cambio C)
Si el contador y el Anexo Técnico lo confirman, el sistema SHALL informar las retenciones en el documento enviado a la
DIAN con el formato exigido, SHALL conservar sin cambio los totales e importes que ya declara, y SHALL validarlo con el
set de habilitación antes de usarlo en producción.

#### Scenario: Habilitación aprobada
- **WHEN** el set de habilitación con retenciones es aceptado por la DIAN
- **THEN** se permite activar el cambio para una empresa piloto con aprobación de Daniel

#### Scenario: Habilitación rechazada
- **WHEN** la DIAN rechaza algún documento del set
- **THEN** el cambio no se activa y las retenciones siguen siendo solo informativas

## Preguntas abiertas

1. Contador: ¿JULSMIND SAS es responsable de IVA y qué tarifa corresponde a sus conceptos (excluido, exento, gravado)?
2. Contador y Anexo Técnico v1.9: ¿`PayableAmount` incluye o excluye las retenciones? ¿Es obligatorio informarlas en el XML?
3. Daniel: ¿la sugerencia de retenciones por historial del cliente es suficiente para la primera versión?
4. Daniel: ¿las retenciones se capturan también en facturas desde pedido o solo en factura libre?
