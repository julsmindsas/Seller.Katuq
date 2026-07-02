# Findings 013 — Tesorería MVP (datos REALES verificados)

> Verificado 2026-07-02 contra el código de ambos repos (4 agentes de exploración + búsqueda web).
> Fuentes: ClickUp lista "Tesorería (Gestión de Pagos)" (`901415301323`, folder ideas, workspace 31545745), código FE/BE, web (HighRadius, JPMorgan, Nequi/Infobae, TreasuryView).

## 1. Lo que YA existe (≈70% del modelo)

### Estados de pago — canónicos e idénticos a ClickUp
- FE: `src/app/components/ventas/modelo/pedido.ts:242-250` — enum `EstadoPago`: Pendiente, Pospendiente, PreAprobado, Aprobado, Rechazado, Precancelado, **Cancelado** (7; ClickUp lista 6 — Cancelado es extra del código).
- BE: `functions/models/Pedido.js:345-353` — mismo enum.
- POS reutiliza el mismo enum (`pos/pos-modelo/pedido.ts:3`).

### Modelo de pagos — ya trae los campos del flujo de aprobación
- `order.PagosAsentados: Pago[]` (`pedido.ts:58`, BE `Pedido.js:115-132`). Interface `Pago`: fecha, formaPago, valor, numeroComprobante, archivo (URL comprobante), archivoEvidencia, notas, valorTotalVenta, valorRegistrado, valorRestante, usuarioRegistro, **estadoVerificacion** (Pendiente/Aprobado/Rechazado/Cancelado — strings sueltos, sin enum), fechaHoraSistema, fechaHoraCarga, **fechaHoraAprobacionRechazo** (hoy solo se llena con fecha de registro).
- `order.anticipo` (suma de pagos), `order.faltaPorPagar`, `order.preAprobadoManual`, `order._estadoCalculadoEnFrontend`.
- Colección Firestore **`payments`**: espejo por cada pago manual (`integration.js:2597-2611`: ordenId, referencia, monto, metodoPago, estado:"COMPLETADO", registradoPor, company, manual:true). Los webhooks Wompi/ePayco también asientan con dedup por `numeroComprobante` (`integration.js:1180-1205, 2207-2229`).
- Colección `integrationEvents`: evento "PAGO_MANUAL" por asiento (`integration.js:2617-2631`).
- ⚠️ La colección `pagos` (routers/pagos.js) NO son pagos — es el **maestro de formas de pago**. No confundir.

### UI de registro de pago — el precursor directo
- Modal **asentarpagomanual**: `src/app/components/ventas/asentarpagomanual/asentarpagomanual.component.ts` + clon POS `pos/pos-asentarpagomanual/` (mismo selector).
- Flujo (`registrarTransaccion` líneas 146-319): form fecha/formaPago (maestro)/valor/numeroComprobante (required)/archivo (drag&drop)/notas → sube a Storage `comprobatensPago/{nroPedido}/{ts}_{file}` (sic, typo) vía AngularFireStorage → **`estadoVerificacion: "Aprobado"` HARDCODEADO (línea 186)** → push a PagosAsentados → recalcula estadoPago client-side (total→Aprobado, parcial→PreAprobado) → `editOrder`.
- Puntos de entrada: ventas/list (`AsentarPago()` :7540, 4 lugares del template), despachos (:2825), pos-list (:826).
- **Gancho previsto**: `ventas/list/list.component.ts:1377` — TODO "Implementar lógica cuando se tenga el módulo de tesorería" en `canViewPaymentHistory()`.

### Endpoints backend
- `POST /v1/integration/pagos/asentar` + `GET /v1/integration/pagos/orden/:orderId` (`routers/integration.js:315-316` → `controllers/integration.js:2504-2710`), con auth.
- `POST /v1/orders/edit` (`controllers/orders.js:3099+`): detecta cambio de estadoPago; al pasar a **Aprobado** dispara facturación Siigo/WO (:3308-3315), hooks PAYMENT_APPROVED/PAYMENT_REJECTED (:3455-3467), emails PAYMENT_Aprobado (:3517-3567), SMS (:3905-3920).
- Filtros por `estadosPago[]`: `/all/filter/optimized` (controller 928-1147, `where("estadoPago","in",...)`), `/pos/all/filter`.
- Historial de estados: `GET /v1/orders/:orderId/history` → colección `order_history`.
- 🐛 **Divergencia activa**: `asentarPagoManual` escribe `estadoPago="Pagado"/"Pago Parcial"` — FUERA del enum (`integration.js:2588-2594`). Corregir en el MVP.

### Roles y control de acceso existente
- FE `getAvailablePaymentStates()` (`list.component.ts:1443`): vendedores solo Pendiente/Pospendiente/PreAprobado/Aprobado; admins todos. **Solo UI, sin enforcement server-side**.
- Backend: patrón `requireRole`/`verifyRole` disponible (`routers/orders.js:10`, `routers/cotizaciones.js:31`).
- Menú: `nav.service.ts` MENUITEMS (:284) + `filterMenuItemsByAuthorization()` (:164) contra `localStorage['authorizedMenuItems']` — el path nuevo debe autorizarse en el maestro de roles o no aparece.

### Recálculo client-side de estadoPago (RIESGO R-01)
- `list.component.ts:3446-3587`: recalcula al cargar; nunca toca estados finales ["Aprobado","Rechazado","Cancelado","Precancelado"] — pero **Pospendiente y PreAprobado sí se recalculan** salvo `preAprobadoManual`.
- `asentarpagomanual` recalcula tras registrar/editar/eliminar; `utils/priceCalculations.js:155-177` (BE) también deriva PreAprobado.
- POS contado: `pos-checkout.service.ts:229` → Aprobado+Entregado directo (se conserva, decisión POS).

## 2. Patrones a replicar

- **Módulo backend nuevo**: cotizaciones (`routers/cotizaciones.js` + `controllers/cotizaciones.js` + `services/cotizacionService.js`, montado `index.js:642`) — auth siempre, verifyRole en rutas sensibles, rutas fijas antes de `/:id`, contador transaccional por empresa.
- **Módulo frontend nuevo**: scaffold despachos (`module + routing + página + components/ + services/ + interfaces/`), lazy en `shared/routes/routes.ts` con AuthGuard; HTTP solo vía servicio que extienda `BaseService`.
- **Listado**: p-table lazy server-side (`tabla-pedidos.component.html:4-9` + `getOrdersByFilterOptimized`), tabs `p-tabView`, filtros `<app-shared-filters>`.
- **KPI cards**: `.gm-card` + `.gm-accent-*` (`global-metrics.component.scss:66-85`) — flat, border-left, SIN gradientes. Métricas server-side (patrón `metricasLogistica` de despachos).
- **Tokens listos**: `src/assets/scss/utils/_katuq-tokens.scss:139-154` ya tiene `$badge-pago-pendiente/aprobado/rechazado/preaprobado-*`.
- **Modales**: NgbModal para forms (89 usos), Swal.fire solo confirmaciones, toast para no-bloqueantes.
- **Notificaciones**: `notification_queue` (EMAIL/WHATSAPP/SMS) + IN_APP a RTDB (`notificationHooks.js:1594-1655`); tipos PAYMENT_* ya existen.
- **Storage**: FE directo con AngularFireStorage (patrón actual comprobantes); BE `admin.storage().bucket()` para generados.
- **Auditoría**: colección dedicada estilo `inventory_audit`.

## 3. ClickUp — mapa de tareas (workspace 31545745, folder ideas)

| Tarea | ID | En MVP 013 |
|---|---|---|
| Backend: flujo estados + modelo de datos | 86b9b73r1 | ✅ (adaptado a Firestore/PagosAsentados, no SQL) |
| Pantalla principal "Gestión de Pagos" | 86b9b738u | ✅ (sin payTermDays/payDueDate — fase 2) |
| Modal "Revisar Pago" | 86b9b73bh | ✅ |
| Modal "Registrar Pago" (tesorero) | 86b9b73d8 | ✅ |
| Modal "Cambiar Estado" con motivo | 86b9b73fx | ✅ |
| IA Anti-Fraude capas 1-2 (hash + referencia) | 86b9b73xh | ✅ (capa 3 OCR: fase 2) |
| Tabs Historial + IA Anti-Fraude | 86b9b73zp | ✅ Historial / panel IA reducido a lista de alertas |
| Menú Finanzas completo | 86b9b7jv4 | Parcial: solo entrada Tesorería con badge |
| Exportar cartera | 86b9b73mc | ❌ fase 2 |
| Recordatorios multicanal | 86b9b73hp | ❌ fase 2 |
| Lista CxC completa (5 tareas) | 901415302224 | ❌ fase 2 |
| Roadmap post-MVP | 86b9b741w | ❌ (conciliación, cupo, OCR, recibo PDF…) |

Nota ClickUp: el modelo propuesto en las tareas es SQL (`payment_records`, `payment_state_changes`, `ai_fraud_alerts`) — se adapta al stack real: `PagosAsentados` + colección `payments` indexada + colecciones de auditoría/alertas Firestore.

## 4. Web — conclusiones que moldean la spec

- **Segregación de funciones** es el control #1 (JPMorgan/TMS): quien registra nunca aprueba; enforcement server-side.
- **Fraude Colombia**: "falso Nequi" y apps generadoras de comprobantes (NequiDz V2) hacen inútil la verificación visual; la única prueba es el dinero en la cuenta. Nequi ofrece **QR Verificador** (~30s, sin login) — sugerirlo en la UI de revisión.
- **Comprobante reciclado**: sin unicidad por referencia+archivo por tenant, el fraude interno es trivial → capas 1-2 en MVP.
- **Contraentrega**: existe el estado real "recaudo en tránsito" (transportadora recaudó, no ha consignado) — hoy se aproxima con PreAprobado manual; estado propio queda fase 2.
- **No sobre-construir** (TreasuryView): sin bank APIs, forecasting ni multi-moneda en MVP.
- Fuentes: highradius.com (cash application), jpmorgan.com (treasury workflows), infobae.com + nequi.com.co (fraude/QR verificador), treasuryview.com (TMS pyme), envioclick.com (contraentrega), moonflow.ai/colektia.com (cobranza Colombia).
