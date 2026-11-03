> **Estado:** borrador — pendiente aprobación de Daniel.
> **Ticket:** 1474 (OH MY STORE, crear la factura del pedido desde «Pendiente», no solo desde «Preaprobado»).
> **Decisión:** D-625.
> **Origen:** OH MY STORE (Jairo Arango, 29-oct).
> `design.md` y `tasks.md` se escriben después de aprobar esta propuesta. Sin código.

## Why

Hoy la acción «Facturar» solo aparece cuando el pago del pedido está Preaprobado. Para facturar un pedido «Pendiente», OH MY STORE tiene que primero pasarlo a mano a Preaprobado y después crear la factura: dos pasos por pedido. Piden poder facturar desde Pendiente en un solo paso, con las mismas validaciones de hoy, y que el pedido avance de estado solo.

El ticket no tiene comentarios ni adjuntos (leído completo el 3-nov; `date_add` 2026-10-29T23:27:20Z). Aquí «estado» es el **estado de pago** (`estadoPago`): Pendiente, Pospendiente, PreAprobado, Aprobado.

## Dónde está la regla (verificado en el código, solo lectura)

- **La única regla es de la pantalla**, no del servidor: `components/ventas/list/list.component.ts:1437-1457`, función `puedeFacturarSiigo`. El filtro es `estadosPermitidos = [Aprobado, PreAprobado]` (`:1443-1446`). Además exige integración de facturación configurada y que no tenga ya factura ni una en curso. (Nota: también deja facturar desde **Aprobado**, no solo Preaprobado.)
- Quienes la leen y se moverían con ella:
  - el botón del detalle (`list.component.html:622`) y el «⋯» de la fila (`list.component.ts:596`);
  - la tarjeta de «Opciones del pedido» (`acciones-pedido.estado.ts:102`, que consume `puedeFacturarSiigo`);
  - el resaltado «Sin factura» (`acciones-pedido.resaltada.ts:23`, conjunto `PAGADO = {Aprobado, PreAprobado}`, copia de la misma regla; y hoy para Pendiente resalta «Pagos»).
- **El servidor no tiene esa regla.** Las rutas `POST /v1/accounting/:provider/invoices/from-order` y `from-order-async` (`routers/accounting.js:573` y `:608`) no miran `estadoPago`; la vista previa DIAN solo rechaza Cancelado y Precancelado (`services/accounting/dian/invoicePreview.js:28`). Y la pantalla de Facturación electrónica ya trata un pedido que no está Aprobado como facturable con la etiqueta «Pago pendiente» (`facturacion-electronica.component.ts:697`, `ok: true, blocked: false`).
- Historia: D-078 anotó que «un Pospendiente no se auto-factura (correcto)»; la factura automática del servidor solo corre al pasar a Aprobado (`controllers/orders.js:4202-4230`) y salta si el pedido ya tiene factura (`pedidoYaFacturado`, D-419).

## Qué pasaría al facturar desde Pendiente

- **Factura.** La ventana de hoy (proveedor SIIGO, World Office o DIAN) y su camino asíncrono (`createAccountingInvoiceAsync`, responde 202 y avisa al terminar) no cambian. **La factura es un documento legal que consume un número del proveedor**; si el pedido nunca se paga, solo se corrige con nota crédito.
- **Pago.** Pendiente significa «sin pago registrado» (D-074). La factura saldría con la forma de pago y el vencimiento que escoja la persona (crédito, D-042). El `faltaPorPagar` no cambia: facturar no registra pagos.
- **Estado.** El cambio pedido es pasar `estadoPago` de Pendiente a PreAprobado al facturar, por el mismo camino de la edición (`POST /v1/orders/edit`). El servidor ya permite a los vendedores mover Pendiente/Pospendiente/PreAprobado (guard v3, D-074), pero **no** con pagos en verificación y, con Tesorería encendida, solo a los roles autorizados (`orders.js:3537-3650`). Si el estado no se puede cambiar, la factura no debe salir a medias (ver preguntas).
- **Inventario (no se toca su código, pero se mueve).** PreAprobado es «pago elegible» para inventario (`services/inventory/paymentInventoryPolicy.js`). Al pasar a elegible, el camino de edición (`executeOrderInventoryRollout`, `orders.js:3990`) puede **comprometer** stock si la empresa usa el libro transaccional; en modo legacy el descuento ya ocurrió al crear el pedido y no cambia. **Hay que verificar el modo de OH MY STORE antes de aprobar** (lectura de configuración, no de pedidos).
- **Integraciones.** El mismo estado alimenta `is_paid` hacia Cereza y Shopify (`osmosisOrderService.js:539`, `shopify/processors/_orderLogistics.js:88`). Un pedido que pasa a PreAprobado se enviaría como «pagado» y Cereza podría no cobrarlo contra entrega. Es el riesgo más importante para OH MY STORE.
- **Consecutivos.** Los consecutivos de Katuq (`nroPedido`, órdenes de envío) no cambian. La numeración de la factura es la del proveedor y se consume igual que hoy; lo nuevo es que puede consumirse sobre pedidos aún sin pago.
- **Cartera y Tesorería.** Un pedido PreAprobado sin pago se parece a los casos que D-078 y la cartera ya confunden (PreAprobado con saldo). Habría que decidir cómo se distingue «autorizado y facturado» de «pagado».

## What Changes

1. `puedeFacturarSiigo` acepta también Pendiente (y solo con las mismas condiciones de hoy: integración, proveedor disponible, sin factura ni facturación en curso, sin pagos en verificación).
2. Al confirmar la factura de un pedido Pendiente, la pantalla primero pasa el pago a PreAprobado por la edición normal y luego manda la factura. Si el cambio de estado falla, no se factura y se explica el motivo.
3. El resaltado y la tarjeta de «Opciones del pedido» siguen la misma regla (una sola función, no dos copias).
4. La ventana de confirmación avisa en una línea: «Este pedido aún no tiene pago registrado. Al facturar quedará Preaprobado.»
5. Con bandera por empresa (`featureFlags`, D-505), primero OH MY STORE. Sin la bandera todo queda como hoy.

Sin cambios en el servidor, ni endpoints nuevos.

## Capabilities

### New Capabilities
- `facturar-desde-pendiente`: facturar un pedido Pendiente en un paso (spec en `specs/pedidos/spec.md`).

### Modified Capabilities
- Ninguna archivada. La regla de «Facturar» pasa a ser configurable por bandera.

## No-goals

- Cambiar la facturación electrónica, la ventana de factura, los proveedores o su numeración.
- Cambiar la factura automática al aprobar un pago, Tesorería o las reglas de aprobación.
- Facturar Pospendiente, Rechazado, Precancelado o Cancelado (ver pregunta 2).
- Registrar pagos o cambiar el saldo al facturar.
- Escribir productos, precios, inventario o Shopify desde esta acción.
- Crear colecciones, endpoints o módulos «v2».

## Riesgos (módulos sensibles: `orders`, inventario, facturación, consecutivos)

- **Un solo cambio a la vez y con diff aprobado por Daniel.** `orders`, inventario y facturación son sensibles; no se mezcla con D-541/D-547 (que tocan los mismos archivos) y se hace `git pull` antes.
- **Factura sin pago, irreversible.** Se anula solo con nota crédito. Mitigación: aviso claro, bandera por empresa y piloto.
- **Estado y factura desincronizados.** La factura es asíncrona (202). Se cambia el estado primero (reversible, es lo que hoy se hace a mano) y, si la factura falla, el pedido queda PreAprobado sin factura, igual que hoy tras el primer paso manual.
- **`is_paid` hacia Cereza y Shopify** y **stock transaccional** (arriba): se verifican antes de aprobar.
- **Doble clic.** Se conserva la marca `_facturando` y el candado `ALREADY_INVOICED` del servidor.

## Preguntas para Daniel o el comercio

1. **¿Avanzar a PreAprobado o solo permitir facturar?** El ticket pide avanzar el estado. Alternativa más segura: permitir facturar desde Pendiente sin cambiar el estado de pago, y que el pedido siga Pendiente hasta que Tesorería o el vendedor lo apruebe. Recomendado: alternativa segura primero; avanzar solo si OH MY STORE confirma que lo necesita para despachar o para Cereza.
2. **¿Qué pasa con Pospendiente?** (pago subido sin revisar). Recomendado: queda fuera; ya tiene su cola de Tesorería.
3. **¿Quién puede?** Con Tesorería apagada, los vendedores ya pueden pasar a PreAprobado. Si OH MY STORE tiene Tesorería encendida, ¿solo los roles de tesorería? Recomendado: los mismos permisos que el servidor aplica hoy al cambio de estado.
4. **Cereza y Shopify.** ¿Se acepta que el pedido salga «pagado» (`is_paid`) al quedar PreAprobado? Si hay pedidos contra entrega o CXC nómina, probablemente no.
5. **Inventario.** ¿Cuál es el modo de inventario de OH MY STORE (legacy, sombra o transaccional)? Con transaccional, Pendiente a PreAprobado compromete stock.
6. **Si la factura falla** después de pasar a PreAprobado, ¿el pedido se queda en PreAprobado (recomendado, es el estado de hoy tras el paso manual) o se devuelve a Pendiente?
7. **Nota crédito.** Si el pedido facturado se cancela sin pago, ¿el comercio asume la nota crédito a mano (hoy así)?
8. **¿Para quién sale?** Recomendado: bandera por empresa, OH MY STORE primero, y revisión de 10 pedidos reales con Jairo antes de abrirlo a otros.
