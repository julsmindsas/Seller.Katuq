## Why

En el POS el cajero no puede elegir a quién se le factura la venta ni decidir si se factura, y la facturación electrónica del POS no funciona: el pedido nunca marca que requiere factura, el camino de respaldo usa un mapeo viejo con datos de prueba fijos (documento 27391, nombre con " prueba") y además el POS escribe `nroFactura = nroPedido`, que hace que Pedidos y el backend traten la venta como "ya facturada" y no dejen facturarla después. Jairo lo reportó el 2026-10-10 (ticket 1171): las ventas del POS deben poder facturarse en Siigo automáticamente, como la venta asistida, y quedar en Pedidos como las demás.

## What Changes

- En el POS, junto al cliente, un control **"Facturación"** con tres opciones: un perfil de facturación del cliente (`clients.datosFacturacionElectronica[]`, preseleccionado el predeterminado), **Consumidor Final** o **No requiere factura**.
- Si la venta requiere factura, el pedido guarda `facturacion` (el perfil elegido o Consumidor Final) y `generarFacturaElectronica = true`, y al terminar el cobro se **encola la factura electrónica** con el proveedor contable configurado de la empresa (hoy Siigo), por la misma ruta asíncrona que ya usa la venta asistida. El cobro no espera a la factura.
- Si no requiere factura, el pedido queda con `generarFacturaElectronica = false` y sin `facturacion`; se puede facturar después desde Pedidos como cualquier pedido.
- Se valida el perfil elegido antes de cobrar (documento, razón social, correo y ciudad), para no mandar a facturar con datos incompletos.
- Se elimina `nroFactura = nroPedido` del POS: el número de factura solo lo escribe el backend cuando la factura se emite.
- Se retira el camino viejo `processElectronicInvoice` del POS (mapeo con datos de prueba fijos).
- Backend: la facturación automática al aprobar un pago (`orders.js`) también reconoce un pedido ya facturado o en facturación por la ruta nueva (`facturacionElectronica.invoiceId`, `facturacionEnProceso`), para que un pago POS por Wompi no termine en doble factura.
- Sin colecciones ni endpoints nuevos.

## Capabilities

### New Capabilities
- `pos-invoicing`: elección de datos de facturación en el POS, decisión de facturar o no, y emisión automática de la factura electrónica de la venta POS con el proveedor configurado, sin doble factura ni número de factura falso.

### Modified Capabilities
<!-- No hay specs previas del POS ni de facturación en openspec/specs/. -->

## Impact

- **Frontend (Seller.Katuq)**: `components/ventas/pos2/widgets/customer-section/*` (control de facturación), un modal nuevo pequeño `pos2/widgets/pos-facturacion/*` (lista de perfiles, Consumidor Final, No requiere factura), `shared/services/ventas/pos-checkout.service.ts` (estado de facturación, quitar `nroFactura`, encolar la factura), `shared/services/ventas/pos-order-creator.service.ts` (`facturacion` y `generarFacturaElectronica` en el pedido; quitar `processElectronicInvoice` y `nroFactura`), y un servicio compartido para encolar la factura que reutilizan POS y venta asistida.
- **Backend (katuq_admin_back_firebase)**: `controllers/orders.js` (guarda contra doble factura en la facturación automática al aprobar). La emisión usa la ruta existente `POST /v1/accounting/:provider/invoices/from-order-async`, que ya tiene candado de idempotencia (`ALREADY_INVOICED`, `INVOICING_IN_PROGRESS`).
- **Datos**: el pedido POS gana `facturacion` y `generarFacturaElectronica` (ya existen en el modelo de pedido y los usa la venta asistida). Deja de escribirse `nroFactura` en el POS.
- **Riesgos sobre módulos sensibles**: facturación electrónica (DIAN vía Siigo) y creación de pedidos POS. No toca inventario, productos, precios ni consecutivos. La factura puede rechazarse cuando el pedido ya está entregado: el cajero ve el aviso y se refactura desde Pedidos (posible porque ya no hay `nroFactura` falso). Las pruebas se hacen primero con el entorno de pruebas del proveedor, nunca con datos reales de la DIAN sin permiso.
- **Decisión a registrar**: D-419 en `specs/CONTRACT.md`.

## No-goals

- Documento equivalente electrónico del POS ante la DIAN (ticket FE-09 del backlog de facturación electrónica).
- Crear o editar perfiles de facturación desde el POS más allá de reutilizar el formulario de cliente existente.
- Facturar varias ventas POS en una sola factura (FE-23).
- Cambiar el cierre de caja o el panel lateral del POS (ticket 1173, de Julian).
- Reparar la función `createSiigoInvoiceBackground` del backend (hoy falla en silencio); solo se blinda contra doble factura.
