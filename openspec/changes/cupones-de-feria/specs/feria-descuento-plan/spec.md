> **Estado: diseño, sin implementar.** Estos requisitos describen lo que (b) debe cumplir cuando se apruebe; hoy el sistema se niega a ofrecer o canjear un cupón de descuento. Las cuentas y las decisiones abiertas están en `design-descuento-plan.md`.

## ADDED Requirements

### Requirement: Descuento mensual por seis meses
Una empresa que canjeó un cupón de descuento y paga su plan mensual dentro de la ventana de pago del cupón SHALL recibir el porcentaje de descuento del cupón (30%) sobre cada uno de sus primeros seis cobros mensuales, cualquiera sea el escalón que le toque. Pasados los seis cobros con descuento, el cobro SHALL volver al valor de su plan.

#### Scenario: Seis cobros con descuento
- **WHEN** una empresa de escalón Base paga el cobro inicial dentro de la ventana y renueva cinco meses seguidos
- **THEN** los seis cobros son de COP 75.600 en vez de COP 108.000 (a TRM 4.000) y el séptimo vuelve a COP 108.000

#### Scenario: Paga después de la ventana
- **WHEN** una empresa con el cupón paga su primer cobro después del cierre de la ventana
- **THEN** paga el valor de su plan y sus renovaciones tampoco llevan descuento

### Requirement: Anual con el 20% de siempre y un mes de regalo
Una empresa que paga el año dentro de la ventana SHALL pagar el valor anual de su plan, que ya incluye el 20% de descuento anual, menos un mes de regalo equivalente a un doceavo de ese valor. El 20% anual SHALL NOT acumularse con otro 20% salvo que el cupón lo defina expresamente. El regalo SHALL aplicarse solo al primer cobro anual.

#### Scenario: Base anual con el mes de regalo
- **WHEN** una empresa de escalón Base paga el año dentro de la ventana
- **THEN** paga COP 950.400 (USD 237,60 a TRM 4.000) en vez de COP 1.036.800, y al año siguiente paga COP 1.036.800

### Requirement: El monto con descuento queda congelado
El monto con descuento SHALL quedar fijo desde que se cotiza o se factura el ciclo: un reintento de cobro, la recuperación de un envío incierto o un enlace de pago repetido SHALL cobrar exactamente el mismo valor, aunque después cambien la TRM, las ventas, los términos del cupón o la cantidad de facturas pagadas. Los términos del cupón SHALL copiarse a la empresa al canjear.

#### Scenario: Reintento con todo cambiado
- **WHEN** un cobro mensual con descuento es rechazado y al día siguiente la TRM y las ventas son otras y el cupón de la campaña fue editado
- **THEN** el reintento cobra el mismo valor del primer intento

### Requirement: El prorrateo y los escalones no se alteran
El descuento SHALL calcularse después del escalón, la periodicidad y el prorrateo por salto de escalón, sobre el total del ciclo. El desglose del prorrateo SHALL quedar igual que sin descuento y el descuento SHALL quedar escrito aparte, con el valor de lista, el descuento y el valor cobrado.

#### Scenario: Salto de escalón a mitad del ciclo
- **WHEN** una empresa con el cupón cruza un tope de ventas a mitad del ciclo con el prorrateo encendido
- **THEN** los tramos son los mismos que sin cupón y el total cobrado es el total prorrateado menos el porcentaje del cupón

### Requirement: Ningún cliente actual cambia
Una empresa sin cupón de descuento SHALL recibir el mismo monto, los mismos documentos y los mismos envíos a Wompi que antes de este cambio, en todos los periodos y escalones, incluidos el escalón pactado y el cobro por enlace de pago. Una empresa con un cupón de pedidos SHALL NOT recibir descuento.

#### Scenario: Cliente de pago existente
- **WHEN** corre la renovación de una empresa de pago que nunca canjeó un cupón
- **THEN** lo escrito en Firestore y lo enviado a Wompi es idéntico al de antes del cambio

### Requirement: Cien cupos y una ventana de pago
El cupón SHALL tener un cupo máximo (100) que no se pasa con canjes simultáneos y una ventana de pago del 16 al 18 de octubre en hora de Bogotá. Quien cotice dentro de la ventana SHALL conservar el precio cotizado durante los minutos de vigencia de la cotización.

#### Scenario: Ciento un canjes
- **WHEN** ciento una personas canjean a la vez un cupón de cien cupos
- **THEN** exactamente cien lo obtienen

### Requirement: El comprador ve el descuento antes de pagar
La pantalla de pago SHALL mostrar el valor de lista, el descuento y el valor que se le va a cobrar, y SHALL decir cuántos cobros llevan descuento. La proyección del próximo cobro y el aviso previo del corte SHALL usar el mismo valor con descuento.

#### Scenario: Cotización con cupón
- **WHEN** una empresa con el cupón abre la pantalla de pago dentro de la ventana
- **THEN** ve "COP 75.600 en vez de COP 108.000 durante 6 meses" y el botón de pagar cobra COP 75.600
