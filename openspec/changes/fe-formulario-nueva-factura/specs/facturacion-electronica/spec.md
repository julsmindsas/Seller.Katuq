## ADDED Requirements

> Alcance: formulario de nueva factura DIAN directa (factura libre y, en el plazo, factura desde un pedido).
> Ticket 1492, D-623. El scroll de la tabla de conceptos ya se corrigió en el ticket 1487 y no se vuelve a pedir.

### Requirement: Plazo a crédito con vencimiento calculado
Cuando la forma de pago es crédito, el sistema SHALL pedir los días de plazo, calcular el vencimiento a partir de la
fecha de hoy en Colombia, mostrarlo y exigirlo. El comercio SHALL poder ajustar la fecha; una fecha anterior a hoy
SHALL NOT permitir revisar la factura.

#### Scenario: Plazo de 30 días
- **WHEN** el comercio elige «Crédito» y un plazo de 30 días
- **THEN** el formulario muestra el vencimiento resultante (hoy más 30 días) y lo usa para la factura

#### Scenario: Sin plazo ni fecha
- **WHEN** el comercio elige «Crédito» y no indica plazo ni fecha
- **THEN** el formulario indica que falta el vencimiento y no deja revisar la factura

#### Scenario: Volver a contado
- **WHEN** el comercio cambia de «Crédito» a «Contado»
- **THEN** el plazo y el vencimiento se descartan y no viajan con la factura

#### Scenario: Borrador con vencimiento vencido
- **WHEN** el comercio abre un borrador cuyo vencimiento ya pasó
- **THEN** el formulario avisa y pide una fecha de hoy en adelante

### Requirement: Ninguna factura a crédito sin vencimiento
El sistema SHALL NOT emitir una factura a crédito sin fecha de vencimiento válida, sin importar de dónde proviene, y
SHALL detenerla antes de tomar consecutivo con un mensaje en lenguaje sencillo.

#### Scenario: Pedido a crédito sin vencimiento
- **WHEN** se intenta facturar un pedido a crédito que no tiene vencimiento
- **THEN** el sistema no toma consecutivo, no envía nada a la DIAN y le indica al comercio que falta el plazo

#### Scenario: Pedido a crédito con plazo indicado en la revisión
- **WHEN** el comercio indica el plazo de un pedido a crédito en la revisión
- **THEN** la factura se puede revisar y emitir con ese vencimiento

#### Scenario: Facturas que ya funcionan
- **WHEN** se emite una factura de contado o una factura libre a crédito con vencimiento válido
- **THEN** el documento enviado es idéntico al de antes de este cambio

### Requirement: IVA sugerido en cada línea
Al agregar una línea sin concepto guardado, el sistema SHALL sugerir el IVA de la línea anterior de la factura o, si es
la primera, el IVA más usado por el comercio en sus facturas aceptadas, SHALL marcarlo como sugerido y SHALL permitir
cambiarlo. Una línea con concepto guardado SHALL usar la tarifa de ese concepto.

#### Scenario: Segunda línea
- **WHEN** el comercio agrega una segunda línea y la primera tiene IVA 19 %
- **THEN** la nueva línea aparece con 19 % rotulado como sugerido y se puede cambiar

#### Scenario: Comercio sin historial
- **WHEN** el comercio no tiene facturas aceptadas y la línea no viene de un concepto guardado
- **THEN** el IVA queda sin elegir y el formulario lo exige

#### Scenario: Concepto guardado
- **WHEN** el comercio elige un concepto guardado con IVA 5 %
- **THEN** la línea toma 5 % y no lo rotula como sugerido

### Requirement: Orden de compra o referencia del cliente
El sistema SHALL ofrecer un campo opcional de orden de compra o referencia del cliente, de hasta 50 caracteres, y
SHALL mostrarlo en la revisión y en el documento de modo que el cliente pueda ubicarlo.

#### Scenario: Con referencia
- **WHEN** el comercio escribe «OC-4471»
- **THEN** la revisión la muestra y el documento la incluye

#### Scenario: Sin referencia
- **WHEN** el comercio deja el campo vacío
- **THEN** la factura sale exactamente como hoy

#### Scenario: Referencia muy larga o con caracteres no admitidos
- **WHEN** el texto excede 50 caracteres o trae caracteres no admitidos
- **THEN** el formulario lo rechaza con un mensaje claro y no deja revisar

### Requirement: Medio de pago recordado por cliente
Al elegir un cliente, el sistema SHALL precargar el medio de pago de su última factura aceptada del mismo comercio, y
SHALL permitir cambiarlo. Sin historial, el medio de pago SHALL quedar sin elegir y ser obligatorio. El sistema SHALL
NOT recordar medios de pago de otros comercios.

#### Scenario: Cliente con historial
- **WHEN** el comercio elige un cliente cuya última factura se pagó por transferencia
- **THEN** el medio de pago aparece preseleccionado en transferencia y se puede cambiar

#### Scenario: Cliente nuevo
- **WHEN** el cliente no tiene facturas aceptadas
- **THEN** el medio de pago queda sin elegir y el formulario lo exige

#### Scenario: Aislamiento entre comercios
- **WHEN** otro comercio facturó al mismo cliente con otro medio de pago
- **THEN** ese medio no se usa para precargar

## Preguntas abiertas

1. Daniel: ¿la orden de compra va primero como nota en las observaciones (sin XML nuevo) o directamente como
   referencia propia del documento?
2. Daniel: ¿plazos rápidos de 15, 30, 45 y 60 días, o los que el comercio defina?
3. Código: confirmar si algún llamador de producción emite facturas DIAN sin solicitud revisada (riesgo de
   `invoicePayment.js:4`) antes de decidir si el cambio 0 sale primero y solo.
