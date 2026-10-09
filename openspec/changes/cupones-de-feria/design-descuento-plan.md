# (b) Descuento en el plan — diseño detallado, SIN parche

> **Estado:** diseño para aprobar. No hay código de (b) en este cambio.
> **Qué sí está hecho:** el cupón de pedidos (a) y la medición (c) ya traen el molde que (b) reutiliza (cupón con `beneficio`, ventana, `empresa.cupon`, canje con cupo). Un cupón `descuentoPlan` hoy **no se ofrece ni se canjea** (`BENEFICIO_NO_DISPONIBLE`).

## 1. Lo que pidió Daniel

- 30% de descuento en **cualquier plan** durante **6 meses**, pagando entre el 16 y el 18 de octubre, **100 cupos**.
- Pagando el año: **20% más 1 mes de regalo**. Hay que dejar la cuenta explícita (COP y USD) y decidir si el 20% va sobre el anual ya descontado.

## 2. Las cuentas

TRM de ejemplo: **4.000** (la que asume la tabla `BILLING_TIERS`; el cobro real usa la TRM del día, el precio en USD no cambia). Funciones reales del repo: `Math.round(priceUSD × TRM)` y `getBillingPeriodAmount` (anual = `round(mensual × 12 × 0,8)`).

| Plan | Mensual lista | Mensual con 30% | 6 meses con 30% (ahorro vs lista) | Anual lista (20% incluido) |
|---|---|---|---|---|
| Base (USD 27) | COP 108.000 · USD 27,00 | COP 75.600 · USD 18,90 | COP 453.600 · USD 113,40 (ahorra COP 194.400 · USD 48,60) | COP 1.036.800 · USD 259,20 |
| Origen (USD 47) | COP 188.000 · USD 47,00 | COP 131.600 · USD 32,90 | COP 789.600 · USD 197,40 (ahorra COP 338.400 · USD 84,60) | COP 1.804.800 · USD 451,20 |
| Esencia (USD 77) | COP 308.000 · USD 77,00 | COP 215.600 · USD 53,90 | COP 1.293.600 · USD 323,40 (ahorra COP 554.400 · USD 138,60) | COP 2.956.800 · USD 739,20 |
| Impulso (USD 147) | COP 588.000 · USD 147,00 | COP 411.600 · USD 102,90 | COP 2.469.600 · USD 617,40 (ahorra COP 1.058.400 · USD 264,60) | COP 5.644.800 · USD 1.411,20 |

### El anual: decisión recomendada — el 20% NO se acumula

El 20% del anual **ya existe** en el producto (`annualDiscountPercent: 20`, "Ahorra 20%" en la pantalla de pago). Leo "pagando el año: 20% más 1 mes de regalo" como **el anual con su 20% de siempre + 1 mes de regalo**. Comparación con Base (USD 27):

| Opción | Cobro del año | Descuento total contra 12 × lista | Servicio |
|---|---|---|---|
| Anual normal (hoy) | COP 1.036.800 · USD 259,20 | 20,0% | 12 meses |
| **A (recomendada). 20% de siempre + mes de regalo** | **COP 950.400 · USD 237,60** | 26,7% | 12 meses (pagas 11 de 12 mensualidades del plan anual) |
| B. 20% extra encima del anual (acumulado) | COP 829.440 · USD 207,36 | 36,0% | 12 meses |
| B + mes de regalo | COP 760.320 · USD 190,08 | 41,3% | 12 meses |

Por qué A: (1) es lo que dice la oferta, sin inventar un segundo 20%; (2) ya premia pagar el año: COP 950.400 contra COP 1.101.600 que cuesta el mismo año mes a mes con el cupón (6 × 75.600 + 6 × 108.000), o sea 13,7% menos; (3) con B el anual llegaría a 36% (41% con el regalo), más que cualquier otra cosa que se ofrece en la feria, y esa es una decisión de margen, no de código. Si Daniel quiere B, es **un número en el cupón** (`anual.porcentajeExtra: 20`); el diseño no cambia.

**El mes de regalo como crédito en la factura anual** (1/12 del monto: Base COP 86.400): no mueve ninguna fecha. La alternativa, "un mes extra de calendario" (13 meses de servicio), obliga a tocar `calculateNextBilling`, `_nextFutureBillingDate`, el rango del ciclo y el aviso previo, y es donde más fácil se cobra de más o de menos. Se muestra al comprador como "Pagas 11 de 12 mensualidades del plan anual".

## 3. Cómo se cobra hoy y dónde engancha el descuento

**Alta (cobro inicial)** — todo sale de una cotización de un solo uso y 15 minutos:
`GET /v1/subscriptions/payment-config` → `getPremiumQuote` (`controllers/subscriptions.js:183`, escalón de entrada Base, TRM, `getBillingPeriodAmount`) → crea `subscription_quotes/{quoteId}` con `amountCOP` (~520) → `POST /create-payment-source` lee `quote.amountCOP` (~1774) → `subscriptionData.amount` / `invoiceData.amountCOP` (~1785/1808) → `reserveInitialPremiumUpgrade` → `billingService._chargePaymentSource(amount)` (~1997) → webhook `SubscriptionPaymentService._validatePayment` exige `amount_in_cents == subscription.amount × 100` (`subscriptionPaymentService.js:326`).

**Renovaciones** — `BillingService.processCompanyBilling` (`billingService.js:1697`): escalón por ventas (o `tierContratado`), TRM, `getBillingPeriodAmount` (~1838), prorrateo opcional (~1847; **apagado por decisión del negocio del 2026-09-15**, `BILLING_PRORRATEO_ENABLED`; no verifiqué la variable en el servidor), y después arma `invoiceBase` con `pricingLocked: true` (~1936-1970) que se escribe **antes** del POST. Un reintento lee esa factura (`lockedPricing`, ~1703) y **no recalcula** nada.

**Proyección** — `getCompanyBillingInfo` (`billingService.js:2591`, campo `projectedPeriodAmountCOP`) alimenta la pantalla de Facturación y el aviso previo del corte (`services/billing/avisoPrevioCorte.js:390/458`).

## 4. Diseño

### 4.1 Datos

- **Campaña** (`subscriptionPlans`, `tipoRegistro: "campana"`): `beneficio: "descuentoPlan"`, `descuento: { mensual: { porcentaje: 30, meses: 6 }, anual: { porcentajeExtra: 0, mesesRegalo: 1 } }`, `cupoMaximo: 100`, `vigenteDesde` / `vigenteHasta` = 16 y 18 de octubre en Bogotá (ventana de canje **y** de pago).
- **Empresa** (al canjear, congelado): `cupon = { campanaId, codigo, beneficio: "descuentoPlan", descuento: {…copia…}, pagarHasta, canjeadoEl }`.
- **Sello en cada documento de plata** que lleve descuento (`subscription_quotes`, `subscriptions`, `billing_invoices`): `descuentoCupon = { campanaId, codigo, tipo: "mensual"|"anual", porcentaje, mesesRegalo, montoListaCOP, descuentoCOP, montoCOP, ciclo, de }`. Es auditoría y es lo que permite contar ciclos.

### 4.2 Cuándo se gasta el cupo (decisión de Daniel)

| Opción | Cómo | Pro | Contra |
|---|---|---|---|
| **1. Al canjear (recomendada)** | El mismo `canjear` transaccional de (a): reserva el cupo al registrarse o con el script. Pagar dentro de la ventana activa el descuento. | Ya existe, probado con 10 canjes simultáneos; no toca el cobro. | Los 100 son "reservas": quien se registra y no paga gasta un cupo. |
| 2. Al pagar | Gastar el cupo en la aprobación del pago. | Son 100 descuentos reales. | Hay que tocar `processWompiTransaction` (la transacción más delicada) y devolver cupo si el pago cae. |
| 3. Mixta | Canjear con cupo grande (p. ej. 300) y tope duro de 100 facturas con descuento al cotizar. | Descuentos reales ≈ 100 sin tocar los pagos. | Un conteo de lectura: dos pagos simultáneos pueden pasarse por unos pocos. |

### 4.3 Función pura (`services/billing/descuentoCupon.js`)

`calcularDescuento({ cupon, periodo, montoListaCOP, cobroInicial, ciclosMensualesPagados, ahora })` → `null` o el sello. Reglas:

1. Sin `cupon.beneficio === "descuentoPlan"` → `null`.
2. **Cobro inicial:** exige `ahora <= pagarHasta` y `ciclosMensualesPagados < meses`. Mensual → `montoCOP = round(lista × (100 − p) / 100)`. Anual → `base = round(lista × (100 − extra) / 100)`, `regalo = round(base / 12 × mesesRegalo)`, `montoCOP = base − regalo`. Trimestral → `null` (el pago con tarjeta solo ofrece mensual y anual).
3. **Renovación:** solo mensual, y solo si `1 <= ciclosMensualesPagados < meses` (haber pagado el cobro inicial con descuento es condición: quien pagó después de la ventana nunca lo tiene).
4. Guardas: monto entero ≥ 1.000, porcentaje en (0, 90], `descuentoCOP > 0`; si algo no cuadra devuelve `null` (precio de lista) y se registra.

### 4.4 Dónde se aplica (tres puntos, todos **después** de escalón, periodo y prorrateo)

1. **Cotización** (`getPaymentConfig`, tras `getPremiumQuote`, ~504): si la empresa trae `cupon` y no es el monto de prueba local, aplica el descuento, lo **guarda en el documento de la cotización** y devuelve `initialAmountCOP` ya con descuento más `descuentoCupon` (para que la pantalla muestre "lista → con tu cupón"). Sin cupón la respuesta es idéntica en llaves.
2. **Alta** (`createPaymentSource`, ~1785/1808/1834): solo **copia** `quote.descuentoCupon` a la suscripción, la factura `INITIAL-…` y el intento. El monto ya sale de `quote.amountCOP`; no se recalcula nada.
3. **Renovación** (`processCompanyBilling`, entre el prorrateo y el monto de prueba, ~1880): con `lockedPricing` reutiliza el sello de la factura congelada; sin él calcula, **guarda el sello en `invoiceBase`** (se escribe antes del POST) y usa el monto con descuento en la suscripción, en `_chargePaymentSource` y en el enlace de pago manual. No se aplica si viene `amountOverrideCOP` (pruebas).
4. **Lectura** (`getCompanyBillingInfo`, ~2645): suma el mismo descuento a `projectedPeriodAmountCOP`, para que la pantalla y el aviso previo no anuncien el precio de lista.

### 4.5 Contar los ciclos sin contador

`ciclosMensualesPagados` = facturas de la empresa con `status == "paid"`, `descuentoCupon.campanaId == cupon.campanaId` y `descuentoCupon.tipo == "mensual"`. Se consulta por `companyId` (campo único) y se filtra en memoria, como ya hace el código. No hay contador que se desincronice ni que haya que decrementar de forma idempotente cuando llegan dos webhooks: lo que cuenta es la factura pagada. Una factura anual no cuenta para los ciclos mensuales.

### 4.6 Congelado en tres momentos

1. Al **canjear**: el `cupon` de la empresa es una copia; editar la campaña después no la cambia.
2. En la **cotización** (15 minutos, un solo uso): el monto con descuento queda en el documento y de ahí pasa a `subscription.amount`. Quien cotiza a las 11:58 p. m. del 18 y paga a las 12:05 a. m. conserva el precio que vio.
3. En la **factura del ciclo** (`pricingLocked`): cualquier reintento, recuperación de un envío incierto o enlace de pago repetido usa `invoice.amountCOP` (verificado en `_recoverUnidentifiedAutomaticInvoice`, `billingService.js:859`).

### 4.7 Casos borde

| Caso | Qué pasa |
|---|---|
| Paga el 19 (ventana cerrada) | Precio de lista; el cupón queda sin efecto y las renovaciones tampoco lo tienen (no hay factura inicial con sello) |
| Cobro inicial rechazado, reintenta dentro de la ventana | Cotización nueva con descuento; lo rechazado no cuenta como pagado |
| Sube, baja y vuelve a subir dentro de la ventana | Máximo `meses` facturas con descuento en total (cada factura pagada con sello cuenta) |
| Mensual → pide cambiar a anual | El descuento mensual se pierde (el sello mensual no sirve al cambiar de periodicidad); sin regalo, porque el regalo es del cobro inicial |
| Escalón pactado (`tierContratado`) | Se descuenta el monto del escalón pactado |
| Cortesía (`cobroCortesia`) / premium promocional | No se cobra: no aplica |
| Empresa con cupón de pedidos (a) | No recibe descuento: son beneficios distintos |
| Monto de prueba local o `amountOverrideCOP` | Sin descuento y sin sello |
| Factura electrónica y comprobantes | Documentan lo cobrado; las membresías van sin IVA (`membershipInvoicing.js`), así que el descuento no cambia impuestos |

### 4.8 Textos para el comprador

- Mensual: "Con tu cupón EFFIXPLAN pagas $75.600 en vez de $108.000 durante 6 meses. Después vuelve el valor de tu plan."
- Anual: "Pagas el año con tu 20% de siempre y te regalamos 1 mes: $950.400 en vez de $1.036.800."
- Vencida la ventana: "El descuento de la feria terminó el 18 de octubre. Puedes activar tu plan al valor normal."

## 5. Casos de prueba (matriz que debe quedar en verde antes de entregar el parche)

Base USD 27, TRM 4.000, periodo mensual salvo que se indique.

| # | Caso | Esperado |
|---|---|---|
| 1 | **Sin cupón**: mensual, anual, trimestral, escalón pactado y enlace manual (volcado completo de Firestore y de los envíos a Wompi, comparado con el original) | Idéntico, byte a byte |
| 2 | Cobro inicial mensual, cupón vigente | COP 75.600; cotización, suscripción y factura sellan `descuentoCupon`; `initialAmountCOP` = 75.600 |
| 3 | Cobro inicial el 18 a las 23:59:59 / el 19 a las 00:00 (Bogotá) | 75.600 / 108.000 |
| 4 | Renovaciones 2 a 6 | 75.600, `ciclo` 2 a 6 |
| 5 | Renovación 7 | 108.000, sin sello |
| 6 | Reintento del ciclo con todo cambiado (porcentaje y meses del cupón, facturas pagadas, TRM, ventas) | Mismo monto a Wompi, mismo sello |
| 7 | Prorrateo encendido con salto de escalón | Tramos sin cambio (83.613 + 69.548 = 153.161 en el prototipo); descuento sobre el total: 107.213; `prorrateo` idéntico |
| 8 | Anual inicial (opción A) / con `porcentajeExtra: 20` | 950.400 / 760.320 |
| 9 | Anual, segundo año | 1.036.800, sin sello |
| 10 | Trimestral con cupón | Precio de lista |
| 11 | Escalón pactado `esencia` | 308.000 → 215.600 |
| 12 | Monto de prueba local y `amountOverrideCOP` | Sin descuento, sin sello |
| 13 | 10 canjes simultáneos con cupo 3 (ya probado en (a)) y 101 con cupo 100 | Exactamente 3 y 100 |
| 14 | Cobro inicial rechazado y reintento dentro / fuera de la ventana | Con descuento / de lista; lo rechazado no cuenta |
| 15 | Sube-baja-sube dentro de la ventana | Nunca más de 6 facturas con descuento |
| 16 | Cupón editado en la campaña después del canje | La empresa conserva sus términos |
| 17 | `_validatePayment` con el monto descontado (webhook y recuperación) | Acepta; con el monto de lista, rechaza |
| 18 | Empresa con cupón de pedidos | Sin descuento |
| 19 | Respuesta de `payment-config` sin cupón | Mismas llaves y valores que hoy |
| 20 | El descuento nunca deja el monto por debajo de 1.000 | Precio de lista y aviso en el registro |

## 6. Lo que sí demostré (prototipo descartable, no entregado)

Con un doble de Firestore y de Wompi y las funciones reales de `billingService.js`, cambiando solo el cálculo del monto de la renovación (≈15 líneas) en una copia de trabajo:

- **Sin cupón, cinco escenarios** (mensual, anual, trimestral, escalón pactado, enlace de pago manual): lo escrito en Firestore y lo enviado a Wompi es **idéntico** al código actual (volcado de 14.209 caracteres comparado completo).
- **Con cupón, segunda factura:** 108.000 → 75.600; la suscripción y el envío a Wompi llevan 75.600 (7.560.000 centavos); la factura lleva el sello.
- **Reintento con todo cambiado** (cupón de 30% y 6 meses a 5% y 1 mes, dos facturas pagadas de más, TRM de 4.000 a 5.000, ventas de 5 M a 400 M): Wompi recibió **7.560.000 otra vez**.
- **Después de 6 facturas con descuento:** 108.000 sin sello. **Anual:** 1.036.800, el descuento mensual no aplica.
- **Prorrateo encendido** con salto de escalón a mitad del ciclo: tramos intactos y el descuento va sobre el total (107.213 = `round(153.161 × 0,7)`).

## 7. Qué falta para poder entregarlo como parche

1. **El cobro inicial de punta a punta no está demostrado.** No existe ninguna prueba de comportamiento de `getPaymentConfig` ni de `createPaymentSource` (solo comprobaciones de texto en `subscriptionBilling.contract.test.js`). Hay que construir ese arnés (cotización → suscripción → envío a Wompi → `_validatePayment`) antes de tocar esos dos endpoints.
2. **La prueba que debería probar el reintento está en rojo desde antes** (`subscriptionBillingRetrySafety.test.js`, aserción de `_calculateMonthlySales` desactualizada). Hay que dejarla en verde en un cambio aparte y primero.
3. **Pantallas que anuncian el monto:** `getCompanyBillingInfo` / aviso previo (4.4 punto 4), el modal de pago y la landing/registro del cupón. Sin ellas el comprador vería un precio y se le cobraría otro más bajo.
4. **Ensayo con Wompi sandbox y el emulador** (`scripts/simulateSubscriptionRenewal.js` ya lo permite) antes de producción.
5. **Decisiones de Daniel** (sección 8). Cambian código: cuándo se gasta el cupo, el anual y cómo se entrega el mes de regalo, quién puede canjear.

## 8. Decisiones que necesito de Daniel

1. **Cupo:** ¿se gasta al canjear (recomendado), al pagar o mixto? (4.2)
2. **Anual:** ¿el 20% no se acumula (recomendado, opción A) o se acumula (B)? ¿El mes de regalo como crédito de 1/12 (recomendado) o como mes extra de calendario?
3. **Quién puede canjear:** ¿solo cuentas nuevas por el enlace, o también las que ya existen? (si es lo segundo: el script (a2) a pedido, o un endpoint nuevo)
4. **Un solo código para el stand:** ¿una persona puede tener el cupón de pedidos y el del descuento? Hoy el registro acepta un código; juntarlos pide que `beneficio` admita una lista.
5. **Si el descuento se reparte:** ¿se aplica también al escalón pactado (propuesto: sí) y a quien cambie de mensual a anual (propuesto: se pierde el mensual)?

## 9. Orden de implementación cuando se apruebe (un cambio a la vez)

1. Arreglar la prueba roja de reintentos (una aserción) — cambio aparte.
2. Arnés de comportamiento del cobro inicial (sin cambiar código de producción).
3. Módulo puro `descuentoCupon.js` + sus pruebas.
4. Renovaciones (`processCompanyBilling`) con la prueba de volcado idéntico sin cupón.
5. Cotización + paso al alta.
6. Canje del cupón `descuentoPlan` (extiende `cuponCampana.js`).
7. Proyección y aviso previo.
8. Front: modal de pago, landing y registro.
9. Ensayo con el emulador y Wompi sandbox.
10. Despliegue: backend, front, y el cupón al final. Reversa: "Apagar" el cupón (corta canjes) y revertir; las facturas ya selladas conservan su monto.
