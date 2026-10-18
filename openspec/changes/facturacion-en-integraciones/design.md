## Context

D-500 (ticket 1260, FE-01). Requisitos en `specs/facturacion-proveedor/spec.md`. Leído en el código el 2026-10-18, sin
consultar Firestore. Backend relativo a `katuq_admin_back_firebase/functions/` (rama `backend-aws-security`); front, a `src/app/`.

- **Configuración:** `services/integrationConfigService.js` → `saveConfig` escribe en transacción
  `integration_configs/{empresa}_{provider}` (siempre `status: 'active'`), `integration_secrets` y `config_audit`, y cuenta
  las activas contra `maxIntegrations`. `prepareConfigUpdate` lo usan `saveConfig` (en la transacción) y `validateConfigUpdate`.
- **Consecutivos:** `services/accounting/dian/numbering.js` avanza `config.numbering.current`, `noteNumbering` y
  `fileSequence` en transacción sobre `{empresa}_dian`; `configUpdatePolicy.js` impide retroceder.
- **Quién decide hoy:** el front (`ORDEN_PROVEEDORES` y `evaluarProveedor` en `shared/services/facturacion/facturacion-automatica.util.ts`;
  `ventas/list/list.component.ts` calcula un solo `activeAccountingProvider` y usa `|| 'siigo'`). La factura automática de
  `controllers/orders.js` ("FACTURACIÓN AUTOMÁTICA SIIGO") lee la configuración de Siigo, exige `enableAutoInvoicing` y
  `!pedidoYaFacturado`, y llama a `createSiigoInvoiceBackground`: `SiigoDataMapper.mapOrderToInvoice`, escribe
  `orders.facturaSiigo` y, con `autoSyncInventory`, crea el ajuste de inventario en Siigo. No mira `status` de la configuración.
- **Facturar un pedido:** `from-order(-async)` (`controllers/accountingController.js`) reciben el proveedor en la URL y llaman a
  `accountingManager.createInvoiceFromOrder`, que pone el candado `facturacionEnProceso: {at, provider}` (TTL 3 min; sin
  vencimiento si trae `dianRequestId`) y escribe `facturacionElectronica`. Ninguno de los dos sabe el tipo de documento.
- **Certificado:** `xadesSigner.validateCertificate` da `expiresAt` y lanza si el .p12 o la contraseña no sirven;
  `dianXMLProvider.authenticate` ya lee un `config.certificateExpiresAt` que nadie escribe.
- **Piezas que se reusan:** `integrations-directorio.ts` y `estadoTarjeta`; `companyFeatureFlags.js` y
  `company-features.service.ts` (D-385); `config_audit` y `dian_auditoria` (`dian/auditoriaDian.js`, D-449).

## Goals / Non-Goals

**Goals:** los requisitos de la spec; sin elección guardada o con las banderas apagadas, todo igual que hoy.
**Non-Goals:** los de la propuesta; (b) y (c); emitir pruebas en producción; exigir el proveedor resuelto en las rutas de
facturación (aquí solo se mide); emisión automática de DIAN o World Office al aprobar el pago (espera FE-03).

## Hoja de ruta (Art. XIII)

| Cambio | Contenido | Depende de | Sensible |
|---|---|---|---|
| **(a) este** | Fases 0-5 | Cambio privado del backend solo para rutas existentes | Pedidos (2.9, 3.x, 5.x); configuración DIAN (2.8, 4.4, 4.5, 7.4) |
| (b) `dian-varias-resoluciones` | `config.resolutions[]`; migrar `numbering` con compare-and-set | (a) fases 1-3, FE-03 (#1261) | Consecutivos |
| (c) `dian-marca-pdf` | Logo y color en `dian/documentPackage.js` | (a) fase 3 | No |

Fases: **0** prerrequisitos · **1** pruebas · **2** servidor con banderas apagadas · **3** front base · **4** pantallas ·
**5** factura automática · **6** migración y encendido.

## Decisions

1. **La elección vive en `integration_configs/{empresa}_invoicing`** (`provider: 'invoicing'`, `status: 'settings'`). No usa
   cupo y se lee por id. `{ companyId, provider, status, version, config: { defaultProvider, byDocumentType: { orderInvoice?,
   posInvoice?, manualInvoice? }, previousDefaultProvider }, health: { <provider>: { checkedAt, ok, code } }, createdAt,
   updatedAt, createdBy, updatedBy }`.
   - **Elección guardada** = el documento existe, `status === 'settings'` y hay `config.defaultProvider`. Sin documento, con
     otro `status` o sin `defaultProvider` → sin elección (`source: 'legacyOrder'`). `defaultProvider` fuera del catálogo →
     `null` con `CHOICE_INVALID` (no cae a otro).
   - `version` solo la suben `PUT choice` y el script. `check` escribe `health.<provider>` con merge; si el documento no
     existe lo crea con `status: 'settings'`, `version: 0` y sin `config`. Nunca toca `version` ni `config`.
   - `invoicing` es un id reservado: `saveConfig` lo rechaza (no tiene esquema); `GET`/`DELETE /v1/integration/config/:provider`
     responden 400 `PROVIDER_NOT_SUPPORTED`; `listConfigs` (también con `includeInactive`) y `platformMetrics/integrationsCensus.js`
     omiten `status: 'settings'`. **Por defecto (confirmar con Daniel).**

2. **Tipos** (`services/accounting/invoicing/documentTypes.js`): `orderInvoice`, `posInvoice`, `manualInvoice` (hoy solo DIAN),
   `creditNote`, `debitNote`. `documentTypeForOrder(order)`: `typeOrder === 'POS'` → `posInvoice`; si no, `orderInvoice`. Lo
   usan la sombra, la factura automática y la lista. Membresía (D-272) fuera. **Por defecto (confirmar con Daniel).**

3. **Descriptores** puros (`invoicing/descriptors/{dian,siigo,worldOffice,index}.js`): `id`, `name`, `documentTypes`,
   `environments`, `selectable` (World Office: `'whenConfigured'`), `isConfigured` (replica `evaluarProveedor`),
   `computeStatus`, `autoInvoicing: { configFlag: 'enableAutoInvoicing', runner }` con `runner: 'siigoLegacy'` (Siigo) o
   `'none'` (DIAN y World Office, hasta FE-03), `derivedFields`. Alegra será un descriptor más su estrategia.

4. **Una sola función:** `invoicing/resolveInvoicingProvider.js`, `resolve(company, documentType, { originalInvoice })` →
   `{ provider, source: 'choice'|'legacyOrder'|'originalInvoice'|'none', autoInvoicing, reason }`.
   - Notas: proveedor de la original, o `null` con `ORIGINAL_PROVIDER_UNKNOWN`.
   - Con `invoicingHub` y elección guardada: `byDocumentType[tipo] || defaultProvider`; si no soporta el tipo o no está
     activo, `null` con `DOCUMENT_TYPE_NOT_SUPPORTED` o `CHOSEN_PROVIDER_INACTIVE`. **Nunca cae a otro. Por defecto (confirmar).**
   - Sin elección o sin bandera: primero activo y configurado de `['dian','siigo','world_office']`.

5. **Estado** (`invoicingSummary.js`), en orden `unconfigured` → `error` → `testing` → `connected`. DIAN: `testing` en
   `habilitacion`; `error` si vence el certificado o la resolución, si no se puede abrir (`CERTIFICATE_UNREADABLE`), si
   `current > to` o con rechazos sin resolver en producción (`dian_documents` `rejected`/`failed` sin `reemplazadaPor`, 30
   días). Siigo y World Office: `testing` con `testMode`; `error` si falló la última prueba en `health`. Sin llamadas
   externas; sin `certificateExpiresAt`, se calcula al vuelo como D-448, sin escribir. Devuelve `reasons[{code,message}]`,
   `emailReady` y de DIAN solo `{ prefix, nextNumber, resolutionNumber, validTo }`.

6. **Contratos HTTP** en `routers/accounting.js`, antes de `/:provider/*` (`controllers/invoicingSettingsController.js`). Las
   cinco rutas nacen con `auth`, `requireJwtTenant`, `requireRole` y `requireFeature('invoicingHub')`, en ese orden; errores
   `{ success:false, code, message }`. `INVOICING_CONFIG_ROLES` = familia Administrador más `Contador`.

   | Ruta | Rol | Respuesta | Escribe |
   |---|---|---|---|
   | `GET …/invoicing/summary` | Toda la empresa | Decisión 5 + `canConfigure`, `canSwitch`, `switchBlockedReason` | Nada |
   | `GET …/invoicing/resolve?documentType=` | Toda la empresa | Decisión 4 | Nada |
   | `PUT …/invoicing/choice` | `INVOICING_CONFIG_ROLES` | `{ version }`; 409 `INVOICING_IN_PROGRESS`/`VERSION_CONFLICT`; 400 `PROVIDER_NOT_CONFIGURED`/`DOCUMENT_TYPE_NOT_SUPPORTED` | `_invoicing.config`, `version`, `config_audit` |
   | `POST …/invoicing/check` | `INVOICING_CONFIG_ROLES` | `{ provider, ok, code }` vía `validateCredentials` | `_invoicing.health` |
   | `GET …/invoicing/history?provider=` | `INVOICING_CONFIG_ROLES` | Últimos 50 de `config_audit` de ese `configId` | Nada |

   `PUT choice`: transacción con compare-and-set de `version`; guarda `previousDefaultProvider`.

7. **Permisos.** Administrador: todo. Contador: elegir, datos tributarios, correo, probar e historial; no certificado, campos
   `sensitive` del esquema, ambiente ni numeración (sale de `PROVIDER_SCHEMAS[p].sensitive`, sin `if (provider)`). Los demás:
   solo el resumen. Las rutas nuevas lo aplican aquí (decisión 6); el cambio privado cubre solo rutas que ya existen, como
   la de guardar configuración que usará el Contador. **Por defecto (confirmar con Daniel).**

8. **Certificado** (sensible; diff aprobado). En `prepareConfigUpdate` (DIAN) se descarta `certificateExpiresAt` del cliente.
   Si llegan certificado o contraseña nuevos, se calcula con `validateCertificate`; si lanza, el guardado sigue como hoy con
   `certificateExpiresAt: null` (sin 400, sin secretos en el error ni en el log) y el resumen muestra `CERTIFICATE_UNREADABLE`.
   `config_audit` suma `secretsChanged` (solo nombres). `numbering` no se toca. **Por defecto (confirmar con Daniel).**

9. **Cambiar sin borrar.** Solo cambia la elección. `invoicingInProgress.js` revisa los proveedores que dejan de usarse:
   - pedidos con `company ==` y `facturacionEnProceso.at >= ahora − 3 min` (rango sobre texto ISO, que ordena bien; el
     proveedor se filtra en memoria). Un candado vencido no entra en el rango, así que no tapa uno vigente;
   - si DIAN deja de usarse: `dian_invoice_requests` de la empresa en `processing`/`uncertain` (cubre los candados con
     `dianRequestId`). `uncertain` no vence solo, igual que `invoiceRequests.status`: se levanta al consultar su estado.
   - Cualquier resultado bloquea; `limit(5)` basta. `switchBlockedReason` = `{ code, orderId|requestId, nroPedido, since }`
     y el hub enlaza "Consultar estado" en Facturas y notas. **Por defecto (confirmar con Daniel).**

10. **Banderas y sombra.** `invoicingHub` (pantallas, elección, resolvedor) e `invoicingAutoFollowsChoice` (pedidos), en los
    dos catálogos. Interruptor general `INVOICING_SHADOW_MODE=off|on` en el servidor, apagado por omisión (D-385); con `off`
    no hay lecturas ni escrituras extra. Dueño Daniel; retiro de los tres el 2027-03-31 (Art. XII).
    Sombra: tras responder, `from-order(-async)` lee el pedido (`documentTypeForOrder`), llama a `resolve` y anota **cada**
    resultado en `dian_auditoria` (`accion: 'proveedor_sombra'`, `detalle: { resultado: 'igual'|'divergente'|'omitido',
    documentType, urlProvider, resolvedProvider, source, reason, correlationId }`). Una escritura por factura; un día con
    facturas y sin registros indica que no corrió. Nunca cambia la respuesta 201/202 ni `orders`; un error de la sombra se
    traga. **Por defecto (confirmar con Daniel).**

11. **Factura automática** (sensible; diff aprobado), en `controllers/orders.js`:
    - **Modo 1** (sin elección o sin `invoicingHub`): idéntico a hoy.
    - **Modo 2** (elección y bandera 2 apagada): modo 1, más `factura_automatica_sombra` con lo que haría el modo 3 (solo
      con el interruptor encendido).
    - **Modo 3** (las dos): `resolve(company, documentTypeForOrder(pedido))`, conservando `pedidoYaFacturado`.
      Con `runner: 'siigoLegacy'` y `autoInvoicing`, llama a `createSiigoInvoiceBackground` como hoy (`facturaSiigo` y ajuste
      en Siigo con `autoSyncInventory`); no pasa por `createInvoiceFromOrder`. Con `runner: 'none'` (DIAN, World Office) o
      `null`: no emite, no factura con Siigo y anota `factura_automatica_omitida` con el motivo.
    - Diferencia aceptada: Siigo elegido pero desactivado deja de facturar automático (hoy el bloque no mira `status`).
    - Emitir DIAN o World Office al aprobar el pago: propuesta aparte, después de FE-03 (Art. IV). **Por defecto (confirmar).**

12. **Front.** `facturacion-integracion.service.ts` extiende `base.service.ts`. `FacturacionAutomaticaService.resolverProveedor(documentType)`:
    con bandera pregunta al servidor y arma el mismo `ProveedorContable`; sin bandera, el util de hoy.
    - `list.component.ts`, con bandera: resuelve `orderInvoice` y `posInvoice` una vez por carga y cada fila usa el de su
      `typeOrder`; sin `|| 'siigo'`; con `null`, facturar queda deshabilitado con el motivo. Sin bandera, idéntico.
    - Módulo lazy `components/integrations/facturacion/` (hub y `facturacion/dian`), componentes nuevos con `OnPush`;
      `facturacion-asistentes.registry.ts` (proveedor → ruta o modal).
    - `dian-config-form.ts` sale de `integrations.component.ts` y lo comparten los dos asistentes. Siigo: un solo asistente
      (`siigo-config.component`); con bandera, el `case 'siigo'` lleva allá.
    - Asistente DIAN: datos tributarios → certificado con vencimiento → habilitación → rango (el de hoy hasta b) → correo → historial.

13. **UI.** Hub con D-400. Estados: Conectado `#1E874B/#E6F7EE`, En pruebas `#1E6FD9/#E7F1FF`, Con error `#D64545/#FDECEC`,
    Sin configurar `#5A6B78/#eef0f3`. Sin gradientes, primarios prohibidos ni clases con "p-"; color propio en spans de `*ngIf`.
    Directorio: `EntradaDirectorio` suma `bandera?` y `reemplaza?: string[]`, y `FuenteEstado` suma `'facturacion'` (estado del
    resumen). Un getter `entradasVisibles` alimenta `totalConectadas`, `totalParaConectar`, "Solo las mías" y la búsqueda;
    `idsDirectorio` conserva `siigo`, `world_office` y `dian`, para que no caigan en "Otras conexiones".

14. **Observabilidad** sin `console.log` de telemetría: sombras y omisiones en `dian_auditoria` con `correlationId`
    (`orderId` o `requestId`); elección y certificado en `config_audit`.

15. **Script** `scripts/invoicing/seed-invoicing-choice.js "<empresa>" <provider> [--execute|--revert]`, genérico (D-410).
    Simula por omisión e imprime solo datos públicos. Se niega si el proveedor no está activo; avisa si Siigo factura
    automático. `--execute`, en transacción: sin documento o sin `defaultProvider` (p. ej. creado por `check`) escribe la
    elección y sube `version`; con elección, se niega. `--revert` quita `config` solo si `version` es la que dejó (conserva
    `health`). Julsmind: DIAN en todo; `numbering` → lista es de (b). **Por defecto (confirmar con Daniel).**

## Write-set y contract tests (primero, Art. VIII)

| Escritor | Escribe | Nunca |
|---|---|---|
| `PUT choice`, script | `_invoicing.config`, `version`, `config_audit` | Numeración, `orders`, `products`, inventario, precios |
| `check` | `_invoicing.health` | `version`, `config`, lo demás |
| `saveConfig` DIAN | `config.certificateExpiresAt`, `config_audit.secretsChanged` | Secretos en claro, numeración fuera de la política |
| Sombras | `dian_auditoria` | `orders`; cambios en la respuesta |
| Automática modo 3 | Siigo: lo de hoy (`facturaSiigo`, `updatedAt`, ajuste en Siigo). DIAN/WO/`null`: solo `dian_auditoria` | Campos nuevos en `orders`; emisión DIAN/WO |

Pruebas en `tests/accounting/` (cada una cita los escenarios de la spec que cubre): `invoicingResolve`,
`invoicingSettings.contract`, `invoicingWriteSet`, `autoInvoiceFollowsChoice.contract`, `invoiceShadow.contract`,
`seedInvoicingChoice` y la extensión de `tests/integrations/dianConfigPersistence`.

## Gates constitucionales

I, II y XIV: D-500, spec EARS sin tecnología y lo técnico solo aquí · IV: compare-and-set, transacción del script, candado del
pedido; sin emisión automática nueva antes de FE-03 · V y X: sin webhooks · VI: descriptores y registro · VII: auditoría con
`correlationId` · VIII: contract tests primero, también de la sombra · **IX parcial**: módulo NgModule lazy, RxJS en vez de
signals y `*ngIf` en vez de `@if`, porque Angular 14 no los tiene (precedente `extras/zonas-cobro`, D-054); `OnPush` sí se
cumple. La excepción se registra bajo D-500 (tarea 0.1) · XI: secretos nunca al navegador ni al log · XII: dos banderas y un
interruptor con dueño, fecha y tarea de retiro · XIII: (a)/(b)/(c) · XV: campos nuevos en inglés y `camelCase`.

## Risks / Trade-offs

- **[Guardar DIAN durante una emisión]** → reintento transaccional y `preventRewind`, cubiertos por prueba.
- **[Resolvedor distinto del front]** → sombra con registro por factura y tabla de paridad antes de usarlo.
- **[Proveedor elegido desactivado]** → `null` con motivo y "Con error"; nunca factura con otro.
- **[Envío DIAN incierto viejo]** → bloquea el cambio hasta consultarlo; el motivo dice cuál es.
- **[Costo de la sombra]** → una lectura del pedido, las de `resolve` y una escritura por factura, solo con el interruptor encendido.

## Migration Plan

1. Backend con banderas e interruptor apagados. 2. Front con bandera apagada. 3. Daniel enciende `INVOICING_SHADOW_MODE`.
4. FLORECER con DIAN en habilitación. 5. Julsmind: simulación → revisión → `--execute` en hora tranquila → bandera → vista
previa, sin emitir. 6. Bandera 2 empresa por empresa tras 7 días de sombra con registros diarios y cada divergencia explicada.
Despliegue según `MANUAL-EC2`, por Daniel o con su orden. **Reversa:** apagar la bandera y `--revert`; ninguna configuración
de proveedor se toca.

## Open Questions → valor por defecto (confirmar con Daniel)

| # | Por defecto | Razón |
|---|---|---|
| 1 Contador | Elige y edita lo no sensible; certificado, claves, ambiente y numeración solo Administrador | El certificado da poder de firma |
| 2 Tipos | `orderInvoice`, `posInvoice`, `manualInvoice`; notas siguen a la original; membresía fuera | La membresía es de Katuq |
| 3 Automática | Sigue la elección con bandera 2; Siigo por su camino de hoy; DIAN/WO no emiten al aprobar el pago hasta FE-03 | Toca pedidos; Art. IV |
| 4 Resoluciones | Una activa por tipo y prefijo más una en cola. Se cierra en (b) | Menos riesgo |
| 5 Partir | Sí: (a), (b), (c) | Art. XIII |
| 6 Dónde | `{empresa}_invoicing`, `status: 'settings'`, id reservado en las rutas genéricas | Sin cupo ni formularios que lo pisen |
| 7 Julsmind/Siigo | Lo dice la simulación; elección DIAN; se para si Siigo factura automático | No se consultó Firestore |
| 8 World Office | En el selector solo si ya está configurado | No dejar sin salida a quien lo usa |
| 9 FE-03 antes de (b) | Sí | Sin idempotencia por envío se puede duplicar (D-499) |
| 10 Proveedor inactivo | Si el elegido está inactivo o no soporta el tipo, no sale la factura; nunca se usa otro | Facturar con otro proveedor es peor que no facturar |
| 11 Sombra | Registra todo resultado; interruptor general apagado al nacer; exigir el proveedor va aparte | Distinguir "sin divergencias" de "no corrió" |
| 12 Certificado ilegible | Se guarda como hoy, sin vencimiento, y queda "Con error" | No cambia un guardado que hoy pasa |
| 13 Envío incierto | No vence solo; bloquea el cambio hasta consultarlo | Nunca vencer un candado que puede duplicar |
