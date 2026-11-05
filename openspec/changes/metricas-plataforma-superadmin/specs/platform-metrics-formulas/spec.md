## ADDED Requirements

Todas las ventanas se miden en hora de Colombia. Una «ventana móvil de N días» termina en el momento del corte y cuenta N × 24 horas hacia atrás. El universo es «comercios reales» salvo que se diga otra cosa.

### Requirement: Fórmulas del tablero
El sistema SHALL calcular cada métrica así, tratando los datos ausentes como «—»:

- **Altas por mes**: comercios reales cuya fecha de alta real cae en el mes. Sin alta real no cuentan.
- **Conversión a pago por cohorte**: de los comercios dados de alta en el mes M, los que tienen su primer pago aprobado dentro de [60 días] de su alta, entre los dados de alta en M. Una cohorte con menos de [60 días] de vida se rotula «en curso».
- **Bajas y churn**: bajas del mes = comercios reales que pasan a cancelado o eliminado en el mes. Churn = bajas ÷ activas al inicio del mes.
- **Comercios con venta en 30 días**: comercios reales con al menos una venta válida creada en la ventana móvil de 30 días.
- **GMV**: suma del valor de pedido (con impuesto, envío y descuento tal como lo cobra la suscripción) de las ventas válidas del periodo.
- **Ticket promedio global**: GMV ÷ número de ventas válidas (media ponderada, no promedio de promedios).
- **Ingresaron en 7 y 30 días**: comercios reales con al menos un ingreso de usuario en la ventana móvil. Se rotula «ingreso», no «uso».
- **Adopción de un módulo**: comercios reales activos que usaron el módulo en [30 días] ÷ comercios reales activos.
- **Ingreso en 7 y 30 días**: cobrado (`platform-billing-truth`) con fecha efectiva en la ventana móvil.

#### Scenario: Ticket global
- **WHEN** un comercio grande tiene 1 000 pedidos y uno pequeño tiene 2
- **THEN** el ticket global es el GMV total entre 1 002, no el promedio de los dos tickets

#### Scenario: Cohorte en curso
- **WHEN** una cohorte tiene 20 días de vida
- **THEN** su conversión se rotula «en curso» y no como definitiva

#### Scenario: Adopción
- **WHEN** hay 40 comercios activos y 10 usaron facturación electrónica en 30 días
- **THEN** la adopción es 25 %

### Requirement: Por cobrar, contratado y su fuente
**Por cobrar** SHALL ser la suma del saldo de las facturas pendientes (vencidas y por vencer) de comercios reales en estado que se cobra, netas de pagos manuales vigentes y con el monto completo de la factura en los planes anuales. **Mora** SHALL ser solo la parte vencida. **Contratado** SHALL partir del escalón pactado vigente del comercio; el plan anual se expresa en su equivalente mensual. IF un comercio de pago no tiene escalón pactado ni ventas que lo determinen, THEN su contratado SHALL ser «—» y no se le supone el escalón pagado más bajo. Como la tabla de planes está en dólares, el contratado SHALL mostrarse en pesos con la TRM del día, rotulada.

#### Scenario: Por cobrar anual
- **WHEN** un comercio tiene una factura anual pendiente
- **THEN** por cobrar suma su monto completo, no un mes

#### Scenario: Comercio de pago sin ventas ni escalón
- **WHEN** un comercio con plan de pago no tiene escalón pactado ni ventas
- **THEN** su contratado es «—» y se avisa en la calidad de datos

### Requirement: Tarjeta, lista y exportación coinciden
La franja, la lista y la exportación SHALL usar las mismas fórmulas, universo y corte. La suma de una columna de la lista SHALL coincidir con su tarjeta.

#### Scenario: Cuadre
- **WHEN** el Super Administrador suma la columna «por cobrar» de la lista
- **THEN** coincide con la tarjeta del mismo corte

### Requirement: Vista por entrega
La vista «por entrega» SHALL aplicar las mismas fórmulas cambiando únicamente la fecha que asigna cada pedido a un mes, y SHALL rotularse en cada cifra.

#### Scenario: Misma fórmula
- **WHEN** se activa «por entrega»
- **THEN** solo cambia a qué mes pertenece cada pedido; universo y venta válida son los mismos
