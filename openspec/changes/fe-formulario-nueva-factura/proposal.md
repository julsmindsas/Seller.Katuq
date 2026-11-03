# Facturación electrónica: mejoras al formulario de nueva factura

> **Estado: borrador — pendiente aprobación de Daniel**
> **Ticket:** 1492 (hallazgo M9, ALMARA FELICIDAD) · **Decisión:** D-623 (por registrar en `specs/CONTRACT.md`)
> **Origen:** diagnóstico QA del 30-oct (ALMARA / JULSMIND SAS)
> Solo propuesta: no se implementa nada hasta aprobar proposal, spec, plan y tasks, y en cada cambio sensible
> hasta que Daniel apruebe el diff.

## Por qué

El formulario de «Nueva factura» (factura libre) obliga a más clics y deja errores evitables: el IVA arranca en «Elige»,
no hay un campo para la orden de compra del cliente, el vencimiento se escribe como fecha y el medio de pago se elige
siempre desde cero. El ticket pide: (1) IVA por defecto según el concepto guardado o el comercio; (2) al elegir
«Crédito», pedir los días de plazo, calcular el vencimiento y hacerlo obligatorio; (3) campo de orden de compra o
referencia del cliente; (4) recordar el último medio de pago de cada cliente. Impacto: más clics, errores de digitación
y rechazos evitables.

El ticket tiene 0 comentarios y 1 adjunto (fecha de alta 2026-10-30T19:08:14Z), leídos completos.

## Qué ya existe (leído el 2026-11-03)

- **Tabla de conceptos con scroll horizontal:** corregido en el ticket 1487, commit `ea693d16` (3-nov): el Total y el
  botón de quitar quedan fijos a la derecha cuando la tabla no cabe (`invoice-composer.component.scss:127-129`). Es un
  hecho; no se repite aquí.
- **Vencimiento obligatorio con «Crédito»:** el formulario lo exige (`manual-invoice-form.component.ts:63-69`,
  campo «Vence» con mínimo hoy en `.html:167-171`) y el servidor también (`manualInvoice.js:69-78`,
  `invoicePayment.js:9-16`: fecha válida, de hoy en adelante). El campo aparece al elegir «Crédito», no antes.
- **IVA según el concepto guardado:** al escoger un concepto del catálogo se carga su tarifa
  (`invoice-concept-picker.component.ts:58`); el catálogo guarda 0/5/19 (`invoiceConcepts.js`). Lo que falta es el valor
  inicial de una línea escrita a mano: `taxRate` nace en `null` (`manual-invoice-form.component.ts:54`).
- **Referencia del cliente:** existen las observaciones (hasta 1000 caracteres) que viajan en el XML como
  `cbc:Note` (`invoiceObservations.js`, `ublBuilder.js:498`). El UBL **no** emite `OrderReference`
  (búsqueda sin resultados en `ublBuilder.js`).
- **Medio de pago:** nace vacío y obligatorio (`manual-invoice-form.component.ts:25`); nada recuerda lo usado antes.

## Riesgo encontrado: factura de pedido a crédito sin vencimiento

`invoicePayment.js:4` devuelve `{ meansId: isCredit ? '2' : '1', meansCode: '10' }` **sin `dueDate`** para todo lo que no
sea una factura libre revisada (`!order.dianRequestId || order.source !== 'manual'`). El XML solo escribe
`PaymentDueDate` si el modelo trae vencimiento (`ublBuilder.js:506`), así que una factura a crédito construida por
ese camino saldría con `PaymentMeans/ID = 2` y sin fecha de pago. Es la misma familia del rechazo CAN04 que el ticket
1242 corrigió para las notas, donde sí hay un respaldo (`ublBuilder.js:301-307`); en la factura no lo hay.

- **Lo que sí está cubierto:** la revisión del compositor detiene ese caso antes de reservar número
  (`invoicePreview.js:53`, «El pedido a crédito no tiene vencimiento fiscal disponible»). Pero eso deja un callejón sin
  salida: desde «Desde pedidos» un pedido a crédito **no se puede facturar** porque el formulario no pide el plazo.
- **Lo que no está cubierto:** `validacionesPrevias.js` no revisa el vencimiento, y `DianXMLProvider.createInvoice`
  admite facturas sin `dianRequestId` (`dianXMLProvider.js:146-160`). Cualquier otro llamador que lo alcance con un
  pedido a crédito podría enviar la factura sin fecha.
- **No verificado:** no pude confirmar que algún llamador de producción llegue hoy a ese camino (la factura automática
  omite DIAN, `autoInvoiceFollowsChoice.js`), ni reproduje el rechazo con la DIAN para facturas. Es un riesgo de
  código, no un incidente comprobado. Un respaldo barato es rechazar antes de reservar número un crédito sin
  vencimiento.

## Qué cambia

Cuatro cambios pequeños, en este orden; el 1 es el único que toca el pago de la factura:

0. **Guardia de vencimiento (módulo sensible, solo servidor).** Si la forma de pago es crédito y no hay vencimiento
   válido, la factura se detiene antes de tomar consecutivo, con un mensaje claro. No cambia el XML de las facturas
   que hoy salen bien. Un cambio, con diff aprobado por Daniel.
1. **Plazo a crédito.** Al elegir «Crédito» el formulario ofrece plazos rápidos (15, 30, 45, 60 días y «otro»), calcula
   el vencimiento con la fecha de hoy de Colombia y lo muestra; la fecha sigue editable y obligatoria. En «Desde pedidos»
   a crédito se pide el plazo en la revisión, lo que cierra el callejón (requiere que el servidor acepte el vencimiento
   del pedido; es el cambio 0 ampliado y va junto con él).
2. **IVA por defecto, sugerido y visible.** Una línea nueva toma el IVA de la línea anterior de la factura o, si es la
   primera, el IVA más usado en las facturas aceptadas del comercio (lectura de lo ya guardado, sin nueva
   configuración). Se rotula «sugerido» y es editable. Va **después** del desglose de IVA de D-620 para que un 19 % o
   un 0 % puesto por defecto se vea en la revisión y no pase inadvertido.
3. **Orden de compra o referencia del cliente.** Campo opcional (máx. 50 caracteres). **Primera versión recomendada:**
   se antepone a las observaciones como «Orden de compra: X», sin XML nuevo. **Opción posterior:** `OrderReference`
   propio, que sí modifica el XML y requiere su propio cambio con diff aprobado y prueba de habilitación.
4. **Medio de pago recordado.** Al elegir el cliente, el medio de pago se precarga con el de su última factura aceptada
   (código 10/42/47/48/49), leído de `dian_invoice_requests` con el mismo patrón del historial de conceptos
   (`invoiceConcepts.js`). Editable; sin historial, sigue vacío y obligatorio. No se recuerda la forma (contado/crédito).

## Capabilities

- `facturacion-electronica` (delta en `specs/facturacion-electronica/spec.md`): condiciones de pago, IVA sugerido,
  referencia del cliente y medio de pago recordado de la factura libre.

## Impact (write-set)

- **Front (`src/app/components/facturacion-electronica/composer/`):** `manual-invoice-form.component.*`,
  `invoice-composer.component.*`, `invoice-composer.models.ts`, `invoice-customer-picker.component.*`,
  `assets/i18n/es.json`. HTTP por `DianInvoiceService` (`BaseService`).
- **Backend (`functions/services/accounting/dian/`):** 0 y 1: `invoicePayment.js`, `validacionesPrevias.js`,
  `invoicePreview.js`. 2: lectura de historial junto a `invoiceConcepts.js`. 3: `invoiceObservations.js` o
  `invoiceRequests.js` (campo opcional). 4: `invoiceCustomer.js` (devuelve el último medio).
- **Datos:** solo colecciones existentes (`dian_invoice_requests`, `dian_documents`); **sin colecciones ni endpoints
  nuevos**. No escribe `orders`, inventario, productos, precios ni consecutivos.
- **Nota de versión (D-567):** una por cada mejora visible.

## Riesgos (módulo sensible)

- XML DIAN y pago de la factura: el cambio 0/1 toca `invoicePayment.js`, que decide `PaymentMeans`; **un cambio a la
  vez, con diff aprobado por Daniel**. Las facturas libres que hoy se aceptan deben producir el mismo XML.
- Un IVA por defecto equivocado repite el problema del ticket 1483; por eso se sugiere, se rotula y se muestra desglosado.
- El plazo se calcula con la fecha del formulario; si el borrador se emite días después, el vencimiento puede quedar
  pasado: se avisa al restaurar el borrador y el servidor ya lo rechaza.
- Pruebas nuevas locales, sin credenciales ni datos reales (D-566).

## No-goals

- Corregir el scroll de la tabla (ticket 1487, hecho).
- Retenciones, desglose de IVA y neto a pagar (D-620, ticket 1483); INC y exportación.
- Documentos no DIAN (Siigo, World Office); notas crédito/débito.
- Cambiar numeración, cartera o recibos; calcular el vencimiento de pedidos desde reglas de cartera.
