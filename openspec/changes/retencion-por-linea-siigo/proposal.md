# Retención en la fuente distinta por renglón en la factura SIIGO

## Why

Ticket 1417 (ALMACEN BOMBAS). En la factura del pedido BAS-000049, el renglón del
servicio («SERVICIO PERFORACIÓN EN TORNO») debe llevar una retención en la fuente
del 4 %. Los productos llevan el 2,5 %. Katuq solo permite una retefuente para
toda la factura, así que el comercio separó el servicio en otro pedido
(BAS-000066, ticket 1418).

Lo medido el 2026-10-26, solo lectura:

| Hallazgo | Dato |
|----------|------|
| Facturas de Bombas leídas en SIIGO (11-ago a 26-oct) | 300 |
| Con retefuente | 252 (244 solo 2,5 %, 3 solo 4 %, 2 solo 3,5 %, 1 solo 1 %) |
| Con retefuente distinta entre renglones | 2 (FV-2-6310 y FV-2-6246: servicio al 4 % y productos al 2,5 %, aceptadas por la DIAN) |
| Retefuentes en su SIIGO | 2,5 % (id 3964), 4 % (3963), 3,5 % (3975 y 17482 «Servicios»), 1 %, 2 %, 6 %, 7 %, 10 %, 11 % |
| IVA de sus servicios en SIIGO | «IVA SERVICIOS 19 %» (3958); el de productos es «Iva 19 %» (16233) |

**Cómo funciona hoy.** En la ventana de factura se elige una retención por tipo
(`list.component.html:2404-2416`). `planRetenciones` rechaza dos del mismo tipo
(`siigoProvider.js:45`). `createInvoice` copia la retefuente elegida a todos los
renglones, menos el del envío (`siigoProvider.js:2522-2526`).

En cambio, el valor retenido, el pago y la vista previa ya se calculan renglón
por renglón (`valorRetenidoPorElCliente`, `siigoProvider.js:62-90`;
`resumenVistaPrevia`, `:99-176`). Si cada renglón trae su propia retefuente, las
cuentas salen bien y la vista previa muestra una línea por tarifa.

**Lo que no sabemos.** SIIGO guarda facturas con retefuentes distintas por
renglón, pero esas dos no las hizo Katuq: se hicieron en su pantalla. Su API pide
«un impuesto por tipo en cada renglón» y no dice nada de que dos renglones lleven
tarifas distintas. Hay que comprobarlo con la primera factura.

**El producto no sabe que es un servicio.** De los 1.287 productos de Bombas,
ninguno tiene `itemType: 'service'`. El servicio solo se distingue porque tiene
`disponibilidad.inventariable = false`. Por eso la tarifa no puede salir sola del
producto: la tiene que escoger quien factura.

## What Changes

1. **Ventana de factura.** La retefuente que se elige para la factura sigue siendo
   la de todos los renglones. Además, cada renglón puede tener otra tarifa o
   ninguna, con un selector pequeño en el renglón que ofrece las mismas
   retefuentes activas de su SIIGO. La vista previa muestra en cada renglón la
   tarifa que lleva y en el resumen el total de cada tarifa.
2. **Backend.** `preview` y la facturación aceptan, además de `retenciones`, un
   mapa opcional `retefuentePorLinea` (renglón → id de retefuente o `null`). Solo
   se aceptan ids de tipo Retefuente que estén activos en el catálogo de SIIGO de
   la empresa. Cada renglón lleva una sola retefuente. El renglón del envío no
   lleva. ReteIVA, ReteICA y Autorretención siguen a nivel de factura, como hoy.
3. **Sin cambios** en IVA, precios, pedidos, productos ni configuración. Si un
   renglón de servicio también debe llevar «IVA SERVICIOS 19 %», eso va en otro
   cambio. Aquí se anota como pregunta.
4. **Pruebas.** Se amplían `scripts/test-1054-observaciones-y-retenciones.js` y
   `test-1074-vista-previa-factura.js`, para revisar el payload, el pago
   (base + IVA − retenido) y la vista previa con dos tarifas en una misma factura.

## Riesgo y cómo se comprueba

Toca dinero: lo retenido cambia el valor a pagar y la factura va a la DIAN.

- Detrás de la bandera `invoiceItemWithholding`, solo para ALMACEN BOMBAS.
- La primera factura real se emite con el comercio avisado: un pedido con un
  servicio al 4 % y productos al 2,5 %.
  - Si SIIGO la rechaza, Katuq muestra su error y no se emite nada.
  - Si la acepta, se compara lo retenido con FV-2-6310.

## Preguntas para Daniel

1. ¿El selector por renglón está bien, o prefieres que el servicio tome el 4 %
   solo, marcando sus productos como servicio? Marcarlos sería un cambio de datos
   en sus productos.
2. ¿Metemos en este mismo cambio el «IVA SERVICIOS 19 %» del renglón de servicio,
   o va aparte?

## Decisiones de Daniel (2026-10-28, D-574)

1. **Selector por renglón,** sin marcar productos como servicio y sin cambios de datos.
2. **El IVA por renglón va en este mismo cambio.** Las facturas FV-2-6310 y FV-2-6246 llevan
   «IVA SERVICIOS 19%» en el servicio e «Iva 19%» en los productos. El IVA solo se cambia por
   otro del mismo porcentaje, así el total no cambia.
3. Daniel aprobó el diff con la condición de no afectar a los otros comercios.
   - Bandera `invoiceItemWithholding`, solo ALMACEN BOMBAS.
   - Sin la bandera, el servidor ignora `porLinea`.

**Cómo quedó:**
- `porLinea` = `{ renglón: { retefuente: id | null, iva: id } }`.
- La vista previa trae `ivaId`, `retefuenteId` y `esEnvio` por renglón.
- Las dos listas aparecen en cada renglón de la vista previa de la ventana de factura.

**Pruebas:**
- `impuestosPorLinea.test.js` 14/14, local.
- Las de SIIGO que ya existían, en verde.
- Vista previa real del BAS-000049 contra su SIIGO, sin emitir nada.

## Impact

- Backend: `controllers/accountingController.js` (`leerExtrasFactura`),
  `services/accounting/utils/siigoDataMapper.js` (`buildInvoiceConfig`,
  `mapOrderToInvoice`) y `services/accounting/providers/siigoProvider.js`
  (`planRetenciones`, `createInvoice`, `resumenVistaPrevia`).
- Front: la ventana de factura SIIGO en `src/app/components/ventas/list/`
  (`list.component.html`/`.ts`) y `integrations.service.ts`.
- Otros comercios: ninguno. Sin la bandera, el comportamiento es el de hoy.
