## 1. Servicio compartido de facturación automática

- [x] 1.1 Leer `crear-ventas.component.ts` `cargarConfiguracionSiigo` (:858) y `encolarFacturacionSiigo` (:942-989), e `integrations.service.ts` (`createSiigoInvoiceFromOrderAsync`, `createAccountingInvoiceFromOrder`)
- [x] 1.2 Crear `shared/services/facturacion/facturacion-automatica.service.ts`: cargar el proveedor activo y su configuración, y encolar la factura de un pedido por la ruta asíncrona `/:provider/invoices/from-order-async`. Pruebas unitarias con el servicio HTTP simulado
- [x] 1.3 Venta asistida usa el servicio compartido sin cambiar su comportamiento. Mostrar el diff antes de aplicar (toca la creación del pedido)
- [x] 1.4 Build sin errores

## 2. Estado y validación en el POS

- [x] 2.1 Leer completo `pos-checkout.service.ts`, `pos-order-creator.service.ts` y la validación del checkout
- [x] 2.2 `PosCheckoutService`: estado `facturacion$` (perfil | consumidorFinal | ninguna); `setCustomer` preselecciona el predeterminado; limpiar en `clearCustomer` y `resetCheckout`
- [x] 2.3 Validar el perfil elegido en `validateCheckout` (razón social, tipo y número de documento, ciudad, correo; Consumidor Final no se valida). Pruebas unitarias de la validación
- [x] 2.4 Build sin errores

## 3. Pedido POS y cobro (módulo sensible: diff y aprobación antes de aplicar)

- [x] 3.1 `createPedidoObject` recibe la facturación y escribe `facturacion` y `generarFacturaElectronica`
- [x] 3.2 Quitar `nroFactura = nroPedido` en `processPurchase` y en la respuesta de `savePedido`; revisar que recibo y correo de confirmación no dependan de `nroFactura`
- [x] 3.3 En `savePedido`, reemplazar `processElectronicInvoice` por el encolado con el servicio compartido cuando `generarFacturaElectronica`; aviso "Factura en proceso" o advertencia "Factúrala desde Pedidos"
- [x] 3.4 Retirar `processElectronicInvoice` y el mapeo viejo de `facturacion.service.ts` si no tienen otros usuarios
- [x] 3.5 Build sin errores

## 4. UI del POS

- [x] 4.1 Modal `pos2/widgets/pos-facturacion/`: perfiles del cliente (predeterminado marcado), Consumidor Final y No requiere factura; enlace para agregar o corregir un perfil con el formulario único de cliente
- [x] 4.2 En `customer-section`, línea "Facturación: <opción>" con botón para cambiarla
- [x] 4.3 Tema "Todos los pedidos" (acento `#5F3FE0`, plano); textos con traducción EN/PT
- [x] 4.4 Build sin errores

## 5. Backend

- [x] 5.1 `controllers/orders.js` (~3960): la facturación automática al aprobar también salta si hay `facturacionElectronica.invoiceId` o `facturacionEnProceso` vigente. Prueba unitaria de la condición
- [x] 5.2 `node --check` y pruebas existentes de órdenes relacionadas

## 6. Cierre

- [x] 6.1 Registrar D-419 en `specs/CONTRACT.md`
- [ ] 6.2 Pruebas en navegador: venta POS con perfil predeterminado, con otro perfil, con Consumidor Final, sin factura; perfil incompleto bloquea el cobro; la venta sin factura se puede facturar desde Pedidos; venta asistida con factura sigue igual
- [ ] 6.3 Prueba de emisión real con el entorno de pruebas del proveedor o empresa de pruebas, con permiso explícito
- [ ] 6.4 Nota interna en el ticket 1171
