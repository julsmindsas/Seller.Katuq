## Context

- **Cobro POS hoy**: `payment-selector` → `PosCheckoutService.openPaymentFlow` (`shared/services/ventas/pos-checkout.service.ts:115`) → modal de pago → `processPurchase` (:216) → `PosOrderCreatorService.createPedidoObject(customer, paymentMethod, warehouse)` (`pos-order-creator.service.ts:29-82`) → fija `estadoPago=Aprobado`, `estadoProceso=Entregado` y **`nroFactura = nroPedido`** (:242) → `savePedido` (:110) → `createOrder`. En la respuesta vuelve a copiar `nroFactura = referencia` (:149). En :157 llama a `processElectronicInvoice` si `pedido.generarFacturaElectronica`, que nadie fija: código muerto, con un mapeo viejo (`facturacion.service.ts:28-97`) de datos de prueba fijos.
- **`nroFactura` bloquea**: con él, Pedidos oculta "Facturar" (`list.component.ts:1023`, `:2050`), Facturación electrónica lo excluye (`facturacion-electronica.component.ts:778`, `invoice-order-picker.component.ts:78`), la vista previa del backend responde `ALREADY_INVOICED` (`invoicePreview.js:26`).
- **Venta asistida factura así**: `cargarConfiguracionSiigo()` (`crear-ventas.component.ts:858`) toma el primer proveedor configurado de `['dian','siigo','world_office']`; tras crear el pedido, `encolarFacturacionSiigo(orderId, nroPedido)` (:942-989) llama a `POST /v1/accounting/siigo/invoices/from-order-async` (o al síncrono para otros proveedores) con `documentTypeId`, `paymentTypeId`, `costCenterId`, `sellerId` de la configuración.
- **Backend**: `createInvoiceFromOrderAsync` (`accountingController.js:1943`) responde 202 y llama a `AccountingManager.createInvoiceFromOrder`, que en una transacción rechaza si ya hay `facturacionElectronica.invoiceId` (`ALREADY_INVOICED`) o un `facturacionEnProceso` reciente (`INVOICING_IN_PROGRESS`), y al emitir escribe `nroFactura`, `facturacionElectronica{...}` y `pdfUrlInvoice`. El resultado se avisa por RTDB (`INVOICE_CREATED` / `INVOICE_FAILED`).
- **Facturación automática al aprobar** (`orders.js:3923-3998`): solo en la transición de `estadoPago` a Aprobado y solo revisa `facturaSiigo` (:3960). Un POS en efectivo nace Aprobado (no la dispara); un POS por Wompi nace Pendiente y pasa a Aprobado (sí entra).
- **Perfiles de facturación**: `clients.datosFacturacionElectronica[]` con `predeterminado` (D-406). El cliente que usa el POS ya los trae (`pos-order-creator.service.ts:101`). Consumidor Final: datos fijos de `pedido-facturacion.component.ts:676`.

## Goals / Non-Goals

**Goals:** elegir perfil, Consumidor Final o No requiere factura en el POS; encolar la factura al cobrar con el proveedor configurado; no escribir `nroFactura` falso; no emitir doble factura.

**Non-Goals:** documento equivalente POS (FE-09), facturación agrupada, cierre de caja, reparar `createSiigoInvoiceBackground`.

## Decisions

1. **Modal propio y liviano en el POS, no `app-pedido-facturacion`.**
   - Ese componente depende del `FormGroup` completo del cliente, llama a `editClient` y a `modalService.dismissAll()` en modo edición (cerraría el modal del POS), y no tiene "No requiere factura".
   - El modal nuevo (`pos2/widgets/pos-facturacion/`) solo lista: perfiles del cliente (predeterminado marcado), Consumidor Final y No requiere factura. Para agregar o corregir un perfil abre el formulario único de cliente (`CrearClienteModalComponent`, pestaña Facturación, D-406) y al volver recarga los perfiles.

2. **Estado de facturación en `PosCheckoutService`.** Un `BehaviorSubject<FacturacionPos>` con `{ modo: 'perfil' | 'consumidorFinal' | 'ninguna', datos?: Facturacion }`.
   - `setCustomer` fija el predeterminado; si no hay perfiles, `ninguna` (decisión por defecto; el cajero elige Consumidor Final si quiere facturar).
   - `clearCustomer` y `resetCheckout` lo limpian.
   - `createPedidoObject` recibe la facturación como cuarto parámetro y escribe `facturacion` y `generarFacturaElectronica`.

3. **Validación del perfil en `validateCheckout`.** Reglas de `validarDatosFacturacion` aplicadas al perfil elegido: razón social de al menos 3 caracteres, tipo y número de documento (NIT `^\d{6,12}(-\d)?$`), ciudad, correo. Consumidor Final no se valida.

4. **Servicio compartido para encolar la factura** (`shared/services/facturacion/facturacion-automatica.service.ts`): extrae `cargarConfiguracionSiigo` y `encolarFacturacionSiigo` de `crear-ventas` para que POS y venta asistida usen lo mismo.
   - Usa **siempre la ruta asíncrona** `/:provider/invoices/from-order-async` (existe para todos los proveedores), para no bloquear el cobro con un proveedor síncrono.
   - Venta asistida pasa a usar el servicio sin cambiar su comportamiento.
   - Alternativa descartada: copiar el código en el POS (dos copias divergirían).

5. **Quitar `nroFactura = nroPedido`** en `processPurchase` (:242) y en la respuesta de `savePedido` (:149). El número que muestra el recibo del POS es `nroPedido`; se revisa que el recibo y el correo de confirmación no lean `nroFactura`.

6. **Quitar `processElectronicInvoice`** del POS y el mapeo de `facturacion.service.ts` si no tiene otros usuarios (se verifica con búsqueda; si los tiene, solo se deja de llamar desde el POS).

7. **Guarda contra doble factura en el backend** (`orders.js:3960`): además de `facturaSiigo`, salta la facturación automática si el pedido tiene `facturacionElectronica.invoiceId` o `facturacionEnProceso` vigente. Cambio de una condición, con prueba.

8. **Aviso del resultado**: el POS muestra "Factura en proceso" al cobrar. Si falla el encolado (sin proveedor, error de red), toastr de advertencia con "Factúrala desde Pedidos". El resultado final (`INVOICE_FAILED`) ya llega a las notificaciones de la empresa; no se agrega un canal nuevo.

9. **UI** con el tema "Todos los pedidos" (acento `#5F3FE0`, plano).

## Risks / Trade-offs

- [Factura rechazada con el pedido ya entregado] → El pedido queda sin `nroFactura` y se refactura desde Pedidos; el cajero ve el aviso.
- [Doble factura por Wompi] → Guarda en `orders.js` más el candado de `createInvoiceFromOrder`.
- [Cambiar `nroFactura` afecta pantallas que hoy muestran el número de pedido como factura] → Se revisan recibo, correo y lista de pedidos POS; el número visible pasa a ser el de la factura real cuando exista.
- [Refactor de la venta asistida al servicio compartido] → Mismo comportamiento; se prueba una venta asistida con factura antes de cerrar.
- [Emitir facturas reales a la DIAN] → Pruebas con el entorno de pruebas del proveedor o con permiso explícito sobre una empresa de pruebas.

## Migration Plan

- Sin migración de datos. Las ventas POS anteriores con `nroFactura = nroPedido` siguen como están; si alguna necesita factura, se trata caso a caso (fuera de alcance).
- Despliegue: backend primero (la guarda es compatible), luego el front.
- Rollback: revertir el front vuelve al POS sin facturación; los pedidos creados en el intervalo quedan con `facturacion` y con o sin factura según el resultado.

## Open Questions

- ¿Sin perfiles, la opción por defecto debe ser "No requiere factura" (propuesta) o "Consumidor Final"?
- ¿Las ventas POS anteriores con `nroFactura = nroPedido` necesitan una limpieza para poder facturarlas? (Requiere script con `--dry-run` y permiso.)
