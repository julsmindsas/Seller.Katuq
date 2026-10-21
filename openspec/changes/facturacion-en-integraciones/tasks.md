# Tasks — facturacion-en-integraciones (D-500, cambio a)

Convenciones:
- `[P]` = paralelizable. **Dep.** = dependencias. **Éxito** = criterio verificable.
- **Sensible, con diff aprobado** = se muestra el diff y se espera aprobación explícita antes de aplicar, una tarea
  sensible a la vez: 2.8, 2.9, 3.3, 3.4, 4.4, 4.5, 5.1, 5.2 y 7.4.
- Las pruebas de la sección 1 se escriben primero, citan los escenarios de `specs/facturacion-proveedor/spec.md` que
  cubren y deben fallar antes del código (Art. VIII).
- Backend en `katuq_admin_back_firebase/functions/`; front en `src/app/`.
- Toda tarea de código cierra con `node --check` o build sin errores.

## 0. Prerrequisitos

- [x] 0.1 Daniel aprueba `specs/facturacion-proveedor/spec.md` y confirma los 13 valores por defecto de `design.md` (Open
  Questions), las dos banderas y el interruptor `INVOICING_SHADOW_MODE`. Se registran bajo D-500 en `specs/CONTRACT.md`,
  junto con la excepción parcial del Art. IX (Art. XIV). **Dep.** —. **Éxito:** entrada con fecha en el contrato.
- [ ] 0.2 El cambio privado del backend para las rutas que ya existen (guardar configuración y contables) está aprobado.
  No cubre las rutas nuevas, que nacen protegidas en 2.7. **Dep.** —. **Éxito:** referencia en la bitácora de D-500, sin
  detalle público. Bloquea que el Contador edite en 4.5 y 6.3.
- [ ] 0.3 Leer completos `integrationConfigService.js`, `configUpdatePolicy.js`, `dian/numbering.js`, `dian/invoiceRequests.js`,
  `accountingManager.js` (`createInvoiceFromOrder`), `controllers/accountingController.js` (from-order), `controllers/orders.js`
  (`createSiigoInvoiceBackground`, `createInventoryAdjustmentSiigo` y el bloque automático), `routers/accounting.js`,
  `routers/integrationConfig.js`, `companyFeatureFlags.js`, `platformMetrics/integrationsCensus.js`; y en el front
  `facturacion-automatica.*`, `integrations.component.ts`, `integrations-list.component.ts`, `integrations-directorio.ts`,
  `siigo-config.component.ts`, `facturacion-electronica.component.ts` y `list.component.ts`. **Dep.** —. **Éxito:** lista de
  lectura en el PR; ninguna edición.
- [ ] 0.4 Revisar índices de estas consultas contra la lista viva exportada (`firestore.indexes.json` del repo no trae
  ninguno de `config_audit`, `dian_documents` ni `dian_invoice_requests`):
  - `config_audit`: `configId ==` y orden por `timestamp` desc, `limit(50)` (historial del hub y del asistente);
  - `orders`: `company ==` y `facturacionEnProceso.at >=` (rango, decisión 9);
  - `dian_documents`: `companyId ==`, `status in` y fecha de los últimos 30 días (rango, decisión 5; el campo de fecha se
    confirma en 0.3);
  - `dian_invoice_requests`: `companyId ==` y `status in ['processing','uncertain']` (solo igualdad).

  **Dep.** 0.3. **Éxito:** PR de índices armado desde la lista viva exportada más los nuevos (nunca un despliegue parcial),
  o constancia de que ya existen.

## 1. Pruebas primero

Todas: **Dep.** 0.1, 0.3. **Éxito:** corren con `node` y fallan por código ausente (los casos viejos siguen verdes).

- [x] 1.1 [P] `tests/accounting/invoicingResolve.test.js`:
  - paridad con `evaluarProveedor` (DIAN, Siigo, WO, ninguno, inactivos);
  - sin elección = orden fijo: sin documento, `status` distinto de `'settings'`, sin `defaultProvider`, o documento creado
    solo por `check`;
  - `defaultProvider` desconocido → `CHOICE_INVALID`; con elección, inactivo o tipo no soportado → `null`, nunca otro;
  - notas siguen a la original; `documentTypeForOrder` (`POS` → `posInvoice`; lo demás → `orderInvoice`).
- [x] 1.2 [P] `tests/accounting/invoicingSettings.contract.test.js`:
  - forma y códigos de las 5 rutas; 401 sin sesión y empresa tomada del token;
  - 403 por rol: Vendedor en `choice`, `check` y `history`; Contador permitido ahí; `summary` y `resolve` para toda la empresa;
  - 403 `FEATURE_DISABLED` con la bandera apagada; 409 por facturas en proceso o versión vieja;
  - `switchBlockedReason` nombra el pedido o el envío; un candado vencido no bloquea; un `uncertain` sí;
  - `check` no cambia `version` ni `config`; el resumen no trae secretos ni `issuer`.
- [x] 1.3 [P] `tests/accounting/invoicingWriteSet.test.js` (Firestore simulado):
  - los módulos nuevos no escriben numeración, `orders`, `products` ni inventario; la elección no cambia `maxIntegrations`;
  - `GET`/`DELETE /v1/integration/config/invoicing` se rechazan y no cambian `status`; `listConfigs(…, true)` y el censo
    omiten `_invoicing`.
- [x] 1.4 [P] Extender `tests/integrations/dianConfigPersistence.test.js`:
  - `certificateExpiresAt` sale del certificado (también si solo cambia la contraseña) y el del cliente se ignora;
  - certificado ilegible: el guardado pasa como hoy, `certificateExpiresAt: null`, sin secretos en el error;
  - `secretsChanged` trae solo nombres; `numbering.current` intacto y `preventRewind` sigue.
- [ ] 1.5 [P] `tests/accounting/autoInvoiceFollowsChoice.contract.test.js`:
  - modo 1: las mismas llamadas y escrituras que hoy;
  - modo 2: lo mismo, más un registro de sombra (solo con el interruptor encendido);
  - modo 3 con Siigo: una sola llamada a `createSiigoInvoiceBackground`, ninguna a `createInvoiceFromOrder`; `facturaSiigo`
    y el ajuste en Siigo (con `autoSyncInventory`) idénticos al modo 1;
  - modo 3 con DIAN, WO o `null`: ninguna emisión ni llamada a Siigo, un registro `factura_automatica_omitida`;
  - ya facturado: ninguna llamada; el bloque no agrega escrituras propias en `orders`.
- [x] 1.6 [P] `tests/accounting/seedInvoicingChoice.test.js`: la simulación no escribe; `--execute` escribe sobre documento
  ausente o sin elección y se niega con elección; `--revert` con compare-and-set de `version` y sin borrar `health`; nunca
  imprime secretos.
- [x] 1.7 [P] Specs del front de `facturacion-integracion.service.ts` y `resolverProveedor(documentType)`, con y sin bandera,
  y del cálculo de contadores del directorio (receta de un solo spec de Karma).
- [x] 1.8 [P] `tests/accounting/invoiceShadow.contract.test.js`, para `from-order` y `from-order-async`:
  - status y cuerpo 201/202 idénticos con la sombra encendida o apagada (salvo `timestamp`);
  - escrituras en `orders` idénticas; la sombra solo escribe `dian_auditoria`, un registro por factura (`igual`,
    `divergente` u `omitido`);
  - un error de la sombra no cambia la respuesta; con `INVOICING_SHADOW_MODE=off`, cero lecturas o escrituras extra.

## 2. Núcleo del servidor (banderas e interruptor apagados, sin cambio visible)

- [x] 2.1 `invoicingHub` e `invoicingAutoFollowsChoice` en `FEATURE_FLAG_NAMES` y `COMPANY_FEATURE_FLAGS`, y lectura de
  `INVOICING_SHADOW_MODE` (`off` si falta), con dueño Daniel y retiro 2027-03-31 en comentario. **Dep.** 0.1. **Éxito:** pasa
  la prueba del catálogo en los dos repos y el front compila.
- [x] 2.2 [P] `invoicing/documentTypes.js` y `descriptors/*` (puros, con `autoInvoicing.runner`). **Dep.** 1.1. **Éxito:**
  pasan sus casos de 1.1.
- [x] 2.3 `resolveInvoicingProvider.js`. **Dep.** 2.2. **Éxito:** 1.1 pasa completa.
- [x] 2.4 `invoicingSettings.js`: lectura por id; elección en transacción con compare-and-set; `health` con merge, sin
  `version`. **Dep.** 2.2. **Éxito:** pasan los casos de escritura de 1.2 y 1.3.
- [x] 2.5 [P] `invoicingInProgress.js` (decisión 9). **Dep.** 0.4. **Éxito:** pasan los casos 409 y de motivo de 1.2.
- [x] 2.6 `invoicingSummary.js` (decisión 5). **Dep.** 2.3, 2.5. **Éxito:** pasan los casos de estado de 1.2.
- [x] 2.7 `controllers/invoicingSettingsController.js` y las rutas, antes de `/:provider/*`, con `auth`, `requireJwtTenant`,
  `requireRole(INVOICING_CONFIG_ROLES)` donde toca y `requireFeature('invoicingHub')`. **Dep.** 2.4, 2.6. **Éxito:** 1.2 pasa;
  `/dian/...` y `/:provider/invoices/*` responden igual (prueba de humo).
- [x] 2.8 **Sensible (consecutivos), con diff aprobado.** `prepareConfigUpdate`/`saveConfig`: `certificateExpiresAt` (decisión 8)
  y `secretsChanged`. **Dep.** 1.4. **Éxito:** 1.4 pasa y las suites DIAN siguen verdes.
- [x] 2.9 **Sensible (facturación de pedidos), con diff aprobado.** Sombra de la decisión 10 en `createInvoiceFromOrder` y su
  variante async, después de responder. **Dep.** 1.8, 2.3. **Éxito:** 1.8 pasa.
- [x] 2.10 [P] Id reservado `invoicing` en las rutas genéricas, `listConfigs` y el censo (decisión 1). **Dep.** 1.3. **Éxito:**
  pasan sus casos de 1.3; el listado de integraciones de una empresa sin elección no cambia.
- [x] 2.11 `node --check` de lo tocado y las suites `dianConfigPersistence`, `pedidoYaFacturado`, `reemplazarFactura`,
  `liberarFactura`, `dianAlertasPreventivas`. **Dep.** 2.1-2.10. **Éxito:** todo verde.

## 3. Front base (sin bandera = igual que hoy)

- [x] 3.1 `facturacion-integracion.service.ts`, que extiende `base.service.ts`. **Dep.** 1.7, 2.7. **Éxito:** pasa su spec.
- [x] 3.2 `FacturacionAutomaticaService.resolverProveedor(documentType)`. **Dep.** 3.1, 2.1. **Éxito:** 1.7 pasa; sin bandera,
  mismas peticiones que hoy.
- [x] 3.3 **Sensible (pedidos), con diff aprobado.** Venta asistida pasa `'orderInvoice'` y el POS `'posInvoice'`. **Dep.** 3.2.
  **Éxito:** sin bandera, la pestaña de red muestra las mismas peticiones.
- [x] 3.4 **Sensible (pedidos), con diff aprobado.** `list.component.ts` (decisión 12): con bandera, `orderInvoice` y
  `posInvoice` una vez por carga, cada fila según su `typeOrder`, sin `|| 'siigo'` y con el motivo si es `null`; sin bandera,
  el código de hoy. **Dep.** 3.2. **Éxito:** mismo proveedor que hoy en tres empresas de prueba (DIAN, Siigo y ninguna);
  con un proveedor elegido inactivo, no ofrece facturar con otro.
- [x] 3.5 `npm run build` sin errores. **Dep.** 3.1-3.4.

## 4. Pantallas con bandera

- [x] 4.1 Directorio (decisión 13): `bandera`, `reemplaza`, fuente `'facturacion'` y `entradasVisibles`. **Dep.** 3.1, 1.7.
  **Éxito:** con la bandera apagada, directorio, contadores, "Solo las mías" y "Otras conexiones" idénticos; encendida, una
  tarjeta con uno de los cuatro estados, contada una vez, y Siigo, WO y DIAN fuera de "Otras conexiones".
- [x] 4.2 Hub `/integrations/facturacion` (lazy, D-400, `OnPush`): proveedor, estados, selector por tipo (solo soportados),
  "Volver a…", bloqueo con su motivo, "Probar conexión" y botones según `canConfigure`. **Dep.** 4.1. **Éxito:** verificado
  en FLORECER con Administrador, Contador y Vendedor.
- [x] 4.3 [P] `facturacion-asistentes.registry.ts`. **Dep.** 4.2. **Éxito:** los componentes nuevos no comparan el proveedor
  con un texto fijo.
- [ ] 4.4 **Sensible (consecutivos: el formulario edita el rango), con diff aprobado.** Extraer `dian-config-form.ts` sin
  cambiar el comportamiento. **Dep.** 0.3. **Éxito:** el asistente viejo envía el mismo cuerpo (petición comparada).
- [ ] 4.5 **Sensible (consecutivos), con diff aprobado.** Asistente `facturacion/dian`: vencimiento del certificado, correo con
  `emailReady` e historial. **Dep.** 4.4, 2.8, 0.2. **Éxito:** el certificado nunca vuelve al navegador (red) y lo sensible
  queda deshabilitado para el Contador.
- [x] 4.6 Siigo con un solo asistente: con la bandera, el `case 'siigo'` lleva a `/integrations/siigo`. **Dep.** 4.3. **Éxito:**
  mismo endpoint y mismo cuerpo que hoy.
- [x] 4.7 Pantalla operativa: estado, "Ver en Integraciones" según `canConfigure` y próximo número con su resolución.
  **Dep.** 3.1. **Éxito:** sin la bandera, igual que hoy.
- [ ] 4.8 Textos EN y PT, trampas de CSS global y conteo de gradientes y primarios prohibidos (no sube). **Dep.** 4.1-4.7.
  **Éxito:** revisado en 1440 y 390 px, sin scroll horizontal ni texto invisible.
- [x] 4.9 `npm run build:prod` sin errores, sin dos builds a la vez. **Dep.** 4.8.

## 5. Factura automática (pedidos)

- [ ] 5.1 **Sensible (pedidos), con diff aprobado.** Preparar y mostrar el diff del bloque de `controllers/orders.js`
  (decisión 11: Siigo por `createSiigoInvoiceBackground`; DIAN, WO y `null` solo anotan). **Dep.** 1.5, 2.3. **Éxito:**
  aprobación explícita de Daniel.
- [ ] 5.2 **Sensible (pedidos), con diff aprobado.** Aplicarlo. **Dep.** 5.1. **Éxito:** 1.5 pasa; `node --check` y las
  pruebas de órdenes relacionadas, en verde.

## 6. Migración y encendido (en producción, solo con orden de Daniel)

- [ ] 6.1 Primero el script con `--dry-run`: escribir `scripts/invoicing/seed-invoicing-choice.js` y simular Julsmind.
  **Dep.** 1.6, 2.4. **Éxito:** 1.6 pasa; la salida muestra la elección propuesta, sin secretos.
- [ ] 6.2 Desplegar backend y front con banderas apagadas; luego Daniel enciende `INVOICING_SHADOW_MODE=on`. **Dep.** 2.11,
  3.5, 4.9, 5.2. **Éxito:** versión viva sin cambios para nadie; aparecen registros `proveedor_sombra` en `dian_auditoria`.
- [ ] 6.3 FLORECER con `invoicingHub` y DIAN en habilitación: tarjeta, elección, bloqueo, roles y asistentes. **Dep.** 6.2,
  0.2. **Éxito:** checklist en la bitácora.
- [ ] 6.4 Julsmind: Daniel revisa 6.1; `--execute` en hora tranquila, bandera encendida, resumen y vista previa de solo
  lectura. **Dep.** 6.3. **Éxito:** "Conectado" y el mismo próximo número; no se emitió nada.
- [ ] 6.5 Revisar `dian_auditoria` después de 7 días. **Dep.** 6.4. **Éxito:** informe en la bitácora con registros en cada
  día con facturas y cada `divergente` explicado.
- [ ] 6.6 Encender `invoicingAutoFollowsChoice` empresa por empresa. **Dep.** 6.5. **Éxito:** con Siigo, el primer pago
  aprobado se factura una vez y como antes; con DIAN, no sale factura de Siigo y queda la omisión registrada.

## 7. Cierre y retiro

- [ ] 7.1 Bitácora en `specs/CONTRACT.md` y commit con sello; al cerrar, `/opsx:archive` consolida `facturacion-proveedor`.
  **Dep.** 6.4.
- [ ] 7.2 Comentario técnico en ClickUp (ticket 1260), si está autorizado. **Dep.** 7.1.
- [ ] 7.3 Propuestas aparte: exigir el proveedor resuelto en las rutas de facturación, y emitir DIAN o WO al aprobar el pago
  (después de FE-03). **Dep.** 6.5.
- [ ] 7.4 **Sensible (pedidos y consecutivos), con diff aprobado.** Retiro de las banderas y del interruptor (2027-03-31,
  Art. XII):
  - quitar el asistente DIAN viejo, `ORDEN_PROVEEDORES` del front, el `|| 'siigo'` y el `case 'siigo'` del modal;
  - conservar el orden fijo del servidor como respaldo de las empresas sin elección.

  **Dep.** 6.6. **Éxito:** compila, las pruebas siguen verdes y tres empresas de prueba facturan con el mismo proveedor.
- [ ] 7.5 Abrir `dian-varias-resoluciones` (b), que espera FE-03, y `dian-marca-pdf` (c), cada uno con su proposal y su
  spec. **Dep.** 7.1.
