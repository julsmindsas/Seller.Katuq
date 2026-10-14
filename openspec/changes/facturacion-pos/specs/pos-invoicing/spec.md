## ADDED Requirements

### Requirement: Elegir los datos de facturación de la venta POS
El POS SHALL ofrecer, para la venta en curso, tres opciones de facturación: un perfil de facturación del cliente seleccionado, Consumidor Final o No requiere factura.

#### Scenario: Cliente con perfil predeterminado
- **WHEN** el cajero selecciona un cliente que tiene un perfil de facturación marcado como predeterminado
- **THEN** el POS preselecciona ese perfil para la venta y lo muestra junto al cliente

#### Scenario: Cliente sin perfiles
- **WHEN** el cajero selecciona un cliente sin perfiles de facturación
- **THEN** el POS ofrece Consumidor Final y No requiere factura, y permite agregar un perfil al cliente

#### Scenario: Cambiar de opción
- **WHEN** el cajero abre "Facturación" y elige otro perfil, Consumidor Final o No requiere factura
- **THEN** la venta en curso usa esa opción

#### Scenario: Cambiar de cliente
- **WHEN** el cajero cambia el cliente de la venta
- **THEN** la opción de facturación se recalcula para el nuevo cliente

### Requirement: Validar el perfil antes de cobrar
Cuando la venta requiere factura, el POS SHALL validar el perfil elegido antes de cobrar y SHALL NOT dejar cobrar con un perfil incompleto.

#### Scenario: Perfil incompleto
- **WHEN** el perfil elegido no tiene documento válido, razón social, correo o ciudad
- **THEN** el POS indica qué falta y no inicia el cobro hasta corregirlo o elegir otra opción

#### Scenario: Consumidor Final
- **WHEN** la opción es Consumidor Final
- **THEN** el POS cobra sin pedir más datos de facturación

### Requirement: Factura automática al terminar el cobro
Cuando la venta requiere factura, el sistema SHALL guardar los datos de facturación en el pedido y, tras crearlo, SHALL encolar la factura electrónica con el proveedor contable configurado de la empresa, sin hacer esperar al cajero.

#### Scenario: Venta facturada en Siigo
- **WHEN** el cajero cobra una venta con un perfil válido y la empresa tiene Siigo configurado
- **THEN** el pedido se crea con esos datos de facturación, la factura se encola en Siigo y el cajero ve que la factura se está generando

#### Scenario: Empresa sin proveedor contable
- **WHEN** la venta requiere factura pero la empresa no tiene proveedor contable configurado
- **THEN** el pedido se crea igual, el cajero ve un aviso de que no se pudo facturar y la venta queda disponible para facturar desde Pedidos

#### Scenario: Factura rechazada
- **WHEN** el proveedor rechaza la factura de una venta POS ya cobrada
- **THEN** el pedido queda sin número de factura y se puede facturar de nuevo desde Pedidos

#### Scenario: Venta sin factura
- **WHEN** el cajero cobra con la opción No requiere factura
- **THEN** el pedido se crea sin datos de facturación, no se encola ninguna factura y queda disponible para facturar después desde Pedidos

### Requirement: Sin número de factura falso
El POS SHALL NOT escribir el número de pedido como número de factura; el número de factura SHALL escribirlo solo el sistema contable cuando la factura se emite.

#### Scenario: Pedido POS recién creado
- **WHEN** se crea un pedido POS
- **THEN** el pedido no tiene `nroFactura` hasta que se emita su factura

#### Scenario: Facturar después desde Pedidos
- **WHEN** una venta POS sin factura aparece en Pedidos
- **THEN** la opción Facturar está disponible para ese pedido

### Requirement: Sin doble factura
El sistema SHALL emitir como máximo una factura por pedido POS, aunque el cobro se reintente o el pago se apruebe después por un medio en línea.

#### Scenario: Pago en línea aprobado después
- **WHEN** una venta POS con factura encolada se aprueba luego por Wompi
- **THEN** la facturación automática al aprobar reconoce que el pedido ya tiene factura o está en facturación y no emite otra

#### Scenario: Reintento
- **WHEN** se pide facturar dos veces el mismo pedido POS
- **THEN** la segunda solicitud se rechaza como ya facturada o en facturación

### Requirement: Alcance de datos
El cambio SHALL escribir solo `facturacion`, `generarFacturaElectronica` y los campos de facturación que ya escribe el sistema contable en el pedido, y SHALL NOT modificar inventario, productos, precios ni consecutivos.

#### Scenario: Venta POS facturada
- **WHEN** se cobra y factura una venta POS
- **THEN** el inventario, los productos, los precios y los consecutivos se comportan exactamente como en una venta POS sin factura
