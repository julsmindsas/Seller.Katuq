# Diseño — Facturación electrónica, hoja de ruta (D-499)

> Código leído el 2026-10-18, sin consultar Firestore. Backend relativo a `katuq_admin_back_firebase/functions/`.
> Requisitos EARS en `specs/envio-factura-idempotente/` (fase 0) y `specs/bandeja-facturacion/` (fase 1). Las fases
> 2 a 5 siguen en la tabla de la propuesta; cada una abre su cambio.

**Alcance (desvío; confirmar con Daniel).** La propuesta deja la fase 0 «fuera de esta hoja» y pide un cambio por
fase. Aquí se diseñan la **fase 0** (núcleo de FE-03) y la **fase 1** (FE-02) como dos entregas con sus propios
checkpoints. La alternativa es partirlas en dos cambios con este mismo contenido. Va a `CONTRACT.md` (tarea 0.3).

**JULS23–JULS40.** Que el set de habilitación (`dianXMLProvider.js:465`) consumiera esos números es poco probable:
exige ambiente habilitación (`:438`), que desde `444aa4f1` (2026-08-16) fuerza el rango SETP
(`integrationConfigService.js:273-284`), y JULS22 es de septiembre. Pesan más un avance manual de `current` (la
política impide retroceder, no avanzar) o envíos sin respuesta. Lo decide el reporte 0.5.

## División con D-500 (FE-01)

- **D-500 es dueño** del bloque de factura automática (`controllers/orders.js:3962-4040`, su decisión 11): banderas,
  sombra en `dian_auditoria` y arreglo del llamado roto. Aquí no hay regla automática propia.
- **D-499 es dueño** del candado (`candadoFactura.js`), la clave por envío y la verificación; D-500 los usa.
- **`resolve()` y descriptores son de D-500**; D-499 les suma `capabilities` (tarea 5.0).
- **`createInvoiceFromOrder(Async)` del controlador** lo tocan D-499 2.5 y D-500 2.9, en serie y nunca en paralelo.

Condiciones para el bloque: (a) `requestId = auto-<orderId>-paymentApproved`; (b) nunca factura POS: D-419 los
factura al crear la venta o no los factura; (c) declarar que `enableAutoInvoicing`, «al crear ventas» en el front
(`facturacion-automatica.util.ts:45-51`), pasa a cubrir pedidos web y e-commerce pagados después, con sombra por
`typeOrder`; (d) `invoicingInProgress` y `pedidoYaFacturado` leen el candado con `candadoFactura.js`; (e) «idéntico a
hoy» es no emitir: `AccountingManager.createInvoice` estático (`orders.js:312`) no existe (`accountingManager.js:2373`).

## Fase 0 — Núcleo de FE-03: un envío, una clave

Hoy el candado vence a los 3 min aunque el envío haya salido (`accountingManager.js:1528-1569`) y el error
(`:2077-2087`) y el éxito (`:2010`) lo borran sin confirmar el dueño; el compositor ya usa clave (`invoiceRequests.js`).

**0.1 Clave.** `from-order` y `from-order-async` aceptan `requestId` opcional (`^[a-zA-Z0-9-]{16,80}$`, como
`InvoiceRequests.ref`); mal formado → 400 `INVALID_REQUEST_ID` (hoy nadie lo manda). Sin clave, el servidor genera
`srv-<uuid>`. Siguen 201 (síncrono) y 202 (asíncrono), ahora con `requestId`. La clave de un envío aceptado devuelve
la factura existente (`replayed: true`). Repetida en curso: el síncrono da 409 `DUPLICATE_REQUEST`; el asíncrono, que
ya respondió 202, no reenvía y avisa «ya estaba en curso».

**0.2 Candado con estado.** Función pura `services/accounting/utils/candadoFactura.js`, única fuente de la regla.
`orders.facturacionEnProceso`: `{ at, provider, requestId, state, sentAt?, expectedTotal?, document?: { number,
cufe } }`. Se conserva el `dianRequestId` del compositor, que no vence. Sin `state` = `processing` viejo.

| Candado | Llega | Resultado |
|---|---|---|
| ninguno | X | toma `processing(X)` |
| `processing(X)` | X | sin segundo envío; `duplicate_request` |
| `processing(Y)` de menos de 3 min | X | `INVOICING_IN_PROGRESS` |
| `processing(Y)` de 3 min o más, sin `sentAt` | X | toma `processing(X)` |
| `processing(Y)` de 3 min o más, con `sentAt` | X | pasa a `uncertain` |
| `uncertain` | cualquiera | `INVOICING_UNCERTAIN` |

**Dueño.** Tres escrituras van en transacción y solo si `facturacionEnProceso.requestId` es el propio:
1. `sentAt` (con `expectedTotal` y, en DIAN, `document`) por un gancho `beforeSend` que la estrategia llama justo
   antes de la red. Si la estrategia no lo tiene, el manager lo escribe antes de `strategy.createInvoice` (`:1892`).
   Si otro tomó el candado, no se envía (`LOCK_LOST`) y DIAN devuelve el número, como hoy antes de enviar.
2. El éxito escribe la factura si el pedido no tiene otra y borra solo su propio candado. Si ya hay otra factura, no
   la pisa y anota `duplicate_detected`.
3. La limpieza del error y el paso a `uncertain` solo tocan el candado propio.

**Salidas.** Si se acepta: `facturacionElectronica` (+ `requestId`). Si falla antes de enviar, se borra el candado.
Rechazo confirmado (`DIAN_REJECTED` o validación del proveedor): se borra y pasa a «Por refacturar». Quedan inciertos
`NETWORK_ERROR`, `DUPLICATED_DOCUMENT` sin recuperación, la respuesta `duplicate: true` sin `invoiceId` de World Office
(`worldOfficeProvider.js:785-798`; hoy deja ese texto en `nroFactura`) y DIAN sin respuesta. **`invoiceIdempotency`**
apagada deja todo como hoy y solo anota `*_shadow`; encendida, bloquea.

**0.3 Verificar.** `POST /v1/accounting/orders/:orderId/verify-invoice`, hermano de `release-invoice`
(`routers/accounting.js:122`): empresa del token, rol de facturación, límite estricto. Body `{ confirmNotIssued?,
motivo? }`. Respuestas: 200 `{ state: 'linked'|'cleared'|'stillUncertain', invoice?, candidates? }`, 404,
409 `NOT_UNCERTAIN` y 409 `MANAGED_BY_INVOICE_REQUEST` con `requestId` si el candado es del compositor (eso se verifica
con `GET /dian/invoice-requests/:requestId`). Despacha por el método `verifyIssued` de la estrategia:
- **DIAN:** `getDocumentStatus` (`dianXMLProvider.js:585`) recibe el CUFE del candado como `trackId` (en
  `SendBillSync` el trackId es el CUFE). Si fue aceptada, `linked` completa lo que la emisión hace después de
  responder (`:201-240`): registro `accepted` en `dian_documents` con `requestId`, libro interno
  (`recordDianDocument`, idempotente) y archivos con `getXmlByDocumentKey`, reusando la lógica de `RecoverDocuments`
  sin depender de `dian_invoice_requests`. Si los archivos fallan, queda `artifactsAvailable: false` y se reintenta sin
  emitir. El vínculo replica `canLink` de `InvoiceRequests.accept` solo sobre `orders`. Rechazada o inexistente →
  `cleared`; el número queda gastado y sale en 0.5.
- **Siigo:** busca por la fecha de `sentAt` en Colombia y el `expectedTotal` del candado, no por «hoy» ni por
  `invoiceData` (`accountingManager.js:2139-2181`), con `#facturaYaVinculadaAOtroPedido` (D-145, D-237). Una
  coincidencia → `linked`; ninguna o varias → `stillUncertain` con `candidates`, salvo `confirmNotIssued`.
- **World Office:** trae `getInvoice` y `listInvoices` (`:923-977`), pero falta la recuperación. Hasta evaluarla
  (tarea 2.10) no tiene `verifyIssued` y solo libera con `confirmNotIssued: true`.

Eventos `uncertain_linked`/`uncertain_cleared` con el usuario en `accounting_invoice_errors` y, en DIAN, en `dian_auditoria`.

**0.4 Proveedor DIAN.** Gancho `beforeSend` con `{ number, cufe }`. Toda auditoría lleva `requestId` y
`submittedToDian`, y el error después de enviar lleva `document`. El set anota sus números. `dian/numbering.js` no cambia.

**0.5 Reporte de saltos (solo lectura).** `dian/reporteConsecutivos.js` + `GET /v1/accounting/dian/numbering-gaps`
(empresa del token; Administrador o Contador). Clasifica `[from, current-1]` en aceptado, rechazado, enviado sin
respuesta, devuelto y reusado, habilitación o sin registro, con evidencia de `dian_documents`, `dian_invoice_requests`
y cambios de rango en `config_audit`. Máximo 2000 números. `scripts/dian-reporte-saltos.js` explica JULS23–JULS40.

## Fase 1 — FE-02, la bandeja única

Requiere `resolve()` de D-500 y `capabilities` en sus descriptores (`reinvoice`, `notes`, `verifyIssued`,
`documentLedger`, `requiresBuyerEmail`; tarea 5.0), con `verifyIssued` igual al método de la estrategia (paridad).

**1.1 Estados** (`services/accounting/estadoFacturacion.js`, pura): `toInvoice` (con motivos como `CANCELLED` o
`MISSING_EMAIL`), `inProgress`, `uncertain`, `invoiced`, `toReinvoice` (último error después del último éxito, rechazo
DIAN sin `reemplazadaPor`, factura liberada sin nueva) y `posWithoutDocument` (D-419, aparte). Un candado con
`dianRequestId` toma el estado de su `dian_invoice_requests` (lectura por id, `invoiceRequests.js:96-127`) y
devuelve `verify: { kind: 'invoiceRequest', requestId }`.

**1.2 Lectura.** `GET /v1/accounting/invoicing-tray?view=&from=&to=&cursor=&limit=50` (`auth`, `requireJwtTenant`,
`requireFeature(invoicingTray)`, límite de lectura) → `{ provider: { id, name, source, capabilities }, counts,
countsPartial, items: [{ orderId, orderNumber, createdAt, customer: { name, documentMasked }, total, typeOrder, state,
reasons[], invoice, verify }], nextCursor }`. **Costo acotado, sin caché ni estado guardado:** `inProgress` y
`uncertain` salen de una consulta sobre el campo del candado; `toReinvoice`, de `accounting_invoice_errors`; el resto,
de recorrer la ventana (30 días, máximo 90) con tope de 2000 lecturas por carga (si se llega, `countsPartial: true`) y
de 500 pedidos por página. `dian_documents`, solo con `documentLedger`. El costo por empresa se estima antes de
encender fuera de FLORECER (4.5). Índices con la receta viva, sin `--force`.

**1.3 Acciones.** «Facturar» usa `from-order-async` con el proveedor de la bandeja y un `requestId` por pedido. El
tope real es `strictRateLimit`: 50 escrituras por IP cada 15 min (`routers/accounting.js:31-38`), compartido con
otras rutas. Por eso la bandeja envía en serie, hasta 20 por tanda, para ante un 429 y deja marcados los que faltan.
«Verificar» va a donde diga `verify`. «Refacturar» usa D-407 en Siigo/WO y nota más liberar en DIAN. Lo que el
proveedor no soporta se oculta (Art. VI).

**1.4 Pantalla.** Componente standalone OnPush `facturacion-electronica/invoicing-tray/` con `InvoicingTrayService
extends BaseService`; pestañas DIAN actuales con `documentLedger`. Con la bandera apagada, todo queda como hoy. Base
D-400, chips con fondo suave, estado vacío, sin gradientes ni clases con «p-». En Todos los pedidos solo se muestra lo
que ya trae el pedido.

## Write-set, banderas y observabilidad

- **La emisión escribe (hoy y después):** en `orders`, sus campos de hoy (`nroFactura`, `facturacionElectronica`,
  `pdfUrlInvoice`, `facturasReemplazadas`, fechas) más `facturacionEnProceso.*` y `requestId`; además
  `accounting_invoice_errors`, `siigo_mapping_alerts`, `dian_documents`, `dian_auditoria`, `{empresa}_dian` solo por
  `numbering.js` (`numbering.current`, `fileSequence`), el libro interno vía `bookkeepingService`
  (`accounting_journal_entries` y sus tres colecciones hermanas), Storage (`documentPackage`) y el aviso RTDB
  `ActualizacionTicket{empresa}`. `verify-invoice` escribe un subconjunto; bandeja y reporte, nada.
- **Nunca:** `products`, precios ni listas, `inventory`, `inventoryMovement`, `pagos`, `payments`, cartera ni
  `clients` (D-134). El contract test 1.5 parte de la línea base de hoy y falla ante algo prohibido o fuera de la lista.
- **Banderas** `invoiceIdempotency` e `invoicingTray`, en los dos catálogos (dueño Daniel; retiro 2027-03-31 o 30 días
  después de encenderlas; Art. XII). Migración: ninguna.
- **Observabilidad:** `requestId` como `correlationId`, `durationMs` y `type` (`success`, `error`, `uncertain`,
  `duplicate_request`, `duplicate_detected`, `*_shadow`). Sin `console.log` de telemetría.

**Gates.** I, XIV: specs y diseño aprobados antes del código · IV: clave y candado con dueño · V, X: sin webhooks ·
VI: `verifyIssued`/`capabilities` · VII: `correlationId` · VIII: contract tests primero · IX parcial: Angular 14,
standalone y OnPush · XI: documento enmascarado; permisos en el cambio privado · XII: banderas con fecha · XIII: dos
entregas · XV: inglés.

## Valores por defecto (confirmar con Daniel)

1. **Alcance:** fases 0 y 1 en este cambio, en dos entregas (o partirlas).
2. **FE-03:** su núcleo se reabre y va primero.
3. **Orden:** bandeja → documento → cartera → escala → recepción.
4. **FE-09** en la fase 4; mientras, factura a Consumidor Final.
5. **«No requiere factura»** se queda en el POS, aparte en la bandeja.
6. **Nómina:** se conecta con Siigo o un proveedor; no se emite.
7. **FE-17:** software propio; Proveedor Tecnológico o marca blanca se evalúan antes de vender.
8. **FE-22:** el pago va a la factura más vencida y luego a lo no facturado.
9. **Notas Siigo/WO:** en su sistema; Katuq libera o refactura.
10. **Envío incierto:** no vence; se verifica o se confirma con `confirmNotIssued`.
11. **Siigo** sin coincidencia única sigue incierto.
12. **World Office:** sin verificación hasta evaluar `listInvoices`; su 409 queda incierto.
13. **Automática:** dueño D-500; D-499 aporta clave fija, candado y condiciones (a)-(e).
14. **Automática:** nunca POS; `enableAutoInvoicing` cubre pedidos pagados después.
15. **Capacidades:** `verifyIssued` por estrategia; las cinco en los descriptores de D-500.
16. **Bandeja:** 30 días (máx. 90), 2000 lecturas por carga, sin caché.
17. **Límite de escritura** sin cambios; la bandeja para ante un 429.
18. **Tres endpoints nuevos**, sin colecciones nuevas.
