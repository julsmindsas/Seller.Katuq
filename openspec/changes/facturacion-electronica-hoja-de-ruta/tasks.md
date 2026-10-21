# Tareas — Facturación electrónica, hoja de ruta (D-499): fase 0 y fase 1

> Rutas del backend relativas a `katuq_admin_back_firebase/functions/`. `[P]` = paralelizable: no comparte archivos
> con otra `[P]` abierta. **SENSIBLE** = toca pedidos o consecutivos: se muestra el diff y se espera aprobación, una a
> la vez. Las pruebas se escriben primero y deben fallar. Nada escribe en Firestore de producción ni emite documentos
> reales sin orden de Daniel. Las fases 0 y 1 no tocan pagos, inventario, productos ni precios (D-134).

## 0. Decisiones y prerrequisitos

- [x] 0.1 D-499 registrada en `specs/CONTRACT.md` (tabla «D-495 a D-503»).
- [x] 0.2 Daniel confirma los 18 valores por defecto de `design.md` (el 1 es el desvío de alcance), el diseño y las
  dos specs. Sin esto no empieza ninguna tarea de código.
- [x] 0.3 Registrar en `CONTRACT.md`, coordinado con la sesión de D-500: el desvío de alcance o la partición, y la
  división con D-500 (dueño del bloque automático, condiciones (a)-(e), `capabilities`, orden de 2.5 frente a la 2.9 de
  D-500). Éxito: una entrada con fecha; D-500 ajusta su diseño sin que se toque su carpeta desde aquí.
- [ ] 0.4 Cambio privado del backend con los permisos de `verify-invoice`, `numbering-gaps` e `invoicing-tray`, y la
  revisión de las rutas existentes que toca 2.5 (`from-order` y `from-order-async`). Nada de eso se detalla aquí.
  Requisito antes de desplegar 2.5, 2.7, 2.9 y 5.1.
- [ ] 0.5 Con permiso de Daniel, solo lectura: buscar en los logs de producción `SIIGO_AUTO_INVOICE_ERROR` con
  «createInvoice is not a function» (`controllers/orders.js:312`). Éxito: evidencia en la bitácora, entregada a D-500.
- [ ] 0.6 La fase 1 empieza con `resolve()` de D-500 desplegado y la 5.0 hecha. La fase 0 no depende de D-500.

## 1. Fase 0: pruebas primero

- [x] 1.1 [P] Unitarias de `services/accounting/utils/candadoFactura.js`: cada fila de la tabla 0.2, candado viejo sin
  `state`, `dianRequestId` del compositor y clasificación de salidas (incluida `duplicate: true` de World Office →
  incierto). Dueño: `sentAt` rechazado si otro tomó el candado; éxito y error con candado ajeno no lo borran; éxito con
  otra factura en el pedido no la pisa. Éxito: rojo por módulo inexistente.
- [ ] 1.2 [P] Contract test de `from-order` (201) y `from-order-async` (202): 400 `INVALID_REQUEST_ID`; eco de la clave
  recibida o `srv-…`; réplica de una clave aceptada; 409 `DUPLICATE_REQUEST` en el síncrono; cuerpo de hoy sin clave;
  pedido de otra empresa y encabezado ajeno sin efecto. Éxito: rojo en validación y eco.
- [ ] 1.3 [P] Contract test de `verify-invoice`: schema; 200 `linked`/`cleared`/`stillUncertain`; DIAN `linked` deja
  registro `accepted`, asiento y archivos (o `artifactsAvailable: false`) y no escribe `dian_invoice_requests`; Siigo
  busca por la fecha de `sentAt` con `expectedTotal`, y ninguna o varias coincidencias dan `stillUncertain`; sin
  `verifyIssued` no libera sin `confirmNotIssued`; 409 `MANAGED_BY_INVOICE_REQUEST`, 409 `NOT_UNCERTAIN`; 404 con
  pedido de otra empresa.
- [ ] 1.4 [P] Pruebas de `dian/reporteConsecutivos.js` y contract test de `numbering-gaps`: seis clases, número devuelto
  y reusado, set de habilitación, rango vacío, tope de 2000, nunca escribe y un encabezado ajeno no cambia la empresa.
- [ ] 1.5 Contract test del write-set (Firestore, Storage y RTDB simulados) para `createInvoiceFromOrder` con
  estrategias simuladas (DIAN, Siigo, WO) y para `verify-invoice`. Primero fija la línea base de hoy; permite solo la
  lista del diseño y falla con `products`, precios, `inventory`, `inventoryMovement`, `pagos`, `payments` o `clients`.
- [ ] 1.6 Línea base en verde antes de tocar código, con conteos anotados: `test:dian-invoice` (la «emisión DIAN» de la
  bitácora), `test:dian-config`, `test:dian-bandeja`, `test:liberar-factura`, `test:reemplazar-factura`,
  `test:pedido-ya-facturado` y `node --test tests/integrations/dianRecovery.test.js tests/integrations/dianDocumentStorage.test.js`.

## 2. Fase 0: implementación (orden fijo para las SENSIBLE)

- [x] 2.1 `candadoFactura.js` hasta poner 1.1 en verde. Depende de 1.1.
- [x] 2.2 **SENSIBLE (pedidos).** `accountingManager.createInvoiceFromOrder`: `options.requestId`, gancho `beforeSend`
  o `sentAt` antes de `strategy.createInvoice`, las tres escrituras con dueño, `expectedTotal`, réplica, `uncertain`
  y `duplicate: true` como incierto. Bandera apagada: solo `*_shadow`. Leer completo `accountingManager.js:1487-2190`.
  Depende de 2.1, 2.8 y 1.5. Éxito: 1.1 y 1.5 en verde, 1.6 sin regresión.
- [x] 2.3 **SENSIBLE (pedidos).** `utils/pedidoYaFacturado.js` usa `candadoFactura.js` y deja de copiar `LOCK_TTL_MS`:
  un `uncertain` bloquea aunque tenga más de 3 min. Depende de 2.1. Éxito: `test:pedido-ya-facturado` con casos nuevos.
- [ ] 2.4 **SENSIBLE (consecutivos).** `providers/dianXMLProvider.js`: `beforeSend` con `{ number, cufe }`,
  `requestId` y `submittedToDian` en toda auditoría, `error.document` después de enviar y números del set anotados.
  `dian/numbering.js` sin cambios (el diff lo prueba). Depende de 2.2. Éxito: `test:dian-invoice` sin regresión.
- [ ] 2.5 **SENSIBLE (entrada de facturación de pedidos).** `controllers/accountingController.js`: `from-order` y
  `from-order-async` validan y pasan `requestId`, responden la réplica y el duplicado, y suman `INVOICING_UNCERTAIN` a
  `guardCodes`. Mismo archivo que la 2.9 de D-500: en serie, y la segunda rebasa sobre la primera. Depende de 2.2 y 1.2.
- [ ] 2.6 **SENSIBLE (pedidos y consecutivos).** `verifyIssued` en las estrategias. DIAN: `getDocumentStatus` con el
  CUFE y la lógica de archivos sacada de `RecoverDocuments` sin depender de `dian_invoice_requests`. Siigo: búsqueda
  por la fecha de `sentAt` y `expectedTotal`. Depende de 2.2 y 2.4.
- [ ] 2.7 **SENSIBLE (pedidos).** Ruta, controlador y método del manager de `verify-invoice`, con eventos en
  `accounting_invoice_errors` y `dian_auditoria`. Depende de 2.6 y 0.4. Éxito: 1.3 y 1.5 en verde.
- [x] 2.8 [P] Bandera `invoiceIdempotency` en `services/companyFeatureFlags.js` y `company-features.service.ts`, con
  dueño, fecha de retiro y prueba de catálogo.
- [ ] 2.9 `reporteConsecutivos.js`, controlador propio, ruta `numbering-gaps` y `scripts/dian-reporte-saltos.js` (solo
  lectura, sin `--execute`). Toca `routers/accounting.js`, así que va después de la 2.7. Depende de 1.4.
- [ ] 2.10 Con permiso de Daniel, solo lectura: evaluar si `listInvoices` de World Office (`listarDocumentoVenta`)
  encuentra un documento por cliente, fecha y total, con un volcado real. Si sirve, se abre una tarea SENSIBLE para
  su `verifyIssued`; si no, sigue con `confirmNotIssued`. Éxito: conclusión en la bitácora.
- [ ] 2.11 **SENSIBLE (venta asistida y POS facturan por aquí).** Front: `requestId` por clic en
  `FacturacionAutomaticaService.encolar`, en Facturar y Refacturar de `ventas/list/list.component.ts` y en
  `queueInvoice` de la bandeja actual; «Verificar» cuando `state` es `uncertain`. Depende de 2.5.
- [ ] 2.12 Cierre técnico: `node --check` de lo tocado, suites de 1.x y 1.6 en verde y `npm run build` del front.

## 3. Fase 0: verificación y salida

- [x] 3.1 Con permiso de lectura de Daniel: correr `dian-reporte-saltos.js` para Julsmind y anotar en `CONTRACT.md`
  la causa de JULS23–JULS40, con evidencia, o decir que nada lo explica. Revisar con `git log` las fechas del
  forzado SETP (`444aa4f1`) frente al salto.
- [ ] 3.2 Desplegar el back y luego el front (candado de publicación). Dos semanas de sombra; contar `uncertain_shadow`
  y `duplicate_shadow` por empresa.
- [ ] 3.3 Con orden de Daniel: encender `invoiceIdempotency` en Julsmind, FLORECER y las demás, una línea por empresa.
- [ ] 3.4 Salida: dos envíos del mismo pedido en menos de 1 s dan una factura (estrategia simulada y, con permiso,
  habilitación o empresa de pruebas); saltos explicados; cero `uncertain` sin verificar de más de 24 h.

## 4. Fase 1: pruebas primero

- [x] 4.1 [P] Leer cómo marca D-419 la venta «No requiere factura» (`pos-order-creator.service.ts:167`) y si llega al
  pedido. Escribir las pruebas de `estadoFacturacion.js`: seis estados, factura liberada, rechazo DIAN sin
  `reemplazadaPor`, `facturaSiigo` viejo, pedido cancelado y candado del compositor según su `dian_invoice_requests`.
  Si la marca no llega al pedido, se avisa a Daniel antes de 5.1: guardarla es un cambio aparte de D-419.
- [ ] 4.2 [P] Contract test de `invoicing-tray`: schema, 403 `FEATURE_DISABLED`, empresa del token, documento
  enmascarado, ventana máxima, cursor, tope de lecturas con `countsPartial` y `verify` del compositor.
- [x] 4.3 [P] Prueba de paridad: `capabilities.verifyIssued` de cada descriptor coincide con el método de su estrategia.
- [ ] 4.4 Contract test: la bandeja no escribe nada.
- [ ] 4.5 [P] Con permiso de Daniel, solo lectura: por empresa candidata, contar con agregación `count()` los pedidos de
  30 y 90 días y estimar las lecturas por carga. Éxito: tabla en la bitácora; es la compuerta de 6.2.

## 5. Fase 1: implementación

- [x] 5.0 Coordinada con D-500, después de su tarea 2.2: `capabilities` (`reinvoice`, `notes`, `verifyIssued`,
  `documentLedger`, `requiresBuyerEmail`) en `services/accounting/invoicing/descriptors/*`, sin cambiar `resolve()`.
  Éxito: 4.3 y las pruebas de D-500 en verde.
- [ ] 5.1 `estadoFacturacion.js`, servicio y controlador propios de la bandeja y ruta de lectura; índices con la receta
  viva. Depende de 4.1, 4.2, 0.4 y 0.6. Éxito: 4.1, 4.2 y 4.4 en verde.
- [x] 5.2 [P] Bandera `invoicingTray` en los dos catálogos, con dueño y fecha.
- [ ] 5.3 [P] Front: `InvoicingTrayService extends BaseService` (`getTray`, `verifyInvoice`), con HTTP simulado.
- [ ] 5.4 Front: componente standalone OnPush `facturacion-electronica/invoicing-tray/` con pestañas por estado,
  acciones por capacidades, envío en serie de hasta 20 que para ante un 429, aviso de conteos parciales, estado vacío,
  base D-400 y sin «p-». Depende de 5.3.
- [ ] 5.5 [P] Todos los pedidos: proveedor, número y chip «Verificar», leídos del pedido. Solo presentación.
- [ ] 5.6 Cierre técnico del backend: `node --check` de lo tocado, 4.x y la línea base 1.6 en verde.
- [ ] 5.7 Cierre de diseño: `npm run build:prod` sin errores; conteo de gradientes y primarios prohibidos sin subir;
  revisión a 1440 y 390 px sin scroll horizontal ni texto invisible.

## 6. Fase 1: verificación y salida

- [ ] 6.1 Desplegar el back y luego el front. Con orden de Daniel, encender `invoicingTray` en FLORECER y revisar las
  pestañas con datos reales, en solo lectura.
- [ ] 6.2 Con la tabla de 4.5 revisada por Daniel, encender empresa por empresa.
- [ ] 6.3 Salida: con Siigo y con DIAN se factura desde la bandeja (emisión real solo con permiso, en una empresa de
  pruebas); cada pedido muestra su factura; «Por refacturar» lista rechazos y errores.

## 7. Cierre

- [ ] 7.1 Bitácora y decisiones en `CONTRACT.md`; commits por archivo, sin `git add -A`.
- [ ] 7.2 Abrir el cambio de la fase 2 (FE-08) con proposal, design, specs y tasks.
- [ ] 7.3 Retirar `invoiceIdempotency` e `invoicingTray` en la fecha fijada (Art. XII). El retiro de
  `createSiigoInvoiceBackground` y `createInventoryAdjustmentSiigo` es de D-500, dueño del bloque.
