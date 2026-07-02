# Tasks 013 — Tesorería MVP

> Estado: **draft** (pendiente checkpoint humano antes de implementar)
> Vinculado a `plan.md`. Tamaños: S (<1h) / M (1-3h) / L (3-6h). [P] = paralelizable dentro de su bloque.
> Repos: **BE** = `katuq_admin_back_firebase/functions`, **FE** = `Seller.Katuq/src`.

## Bloque 0 — Base backend (Fase A)

- [ ] **T-01 [S][P]** BE: `services/treasury/treasuryConstants.js` — estados de verificación, matriz de transiciones CA-09, motivos predefinidos por transición, roles autorizados (`Tesorero`, `Administrador`, `Super Administrador`).
- [ ] **T-02 [S][P]** BE: helper `isTreasuryEnabled(company)` (lee `treasuryEnabled` del doc empresa, default false) + script `scripts/seed-treasury-flag.js --company=X --dry-run`.
- [ ] **T-03 [M]** BE: contract tests `scripts/test-013-treasury.js` (patrón test-011): matriz de transiciones, normalización enum legacy, total/parcial→Aprobado/PreAprobado, dedup referencia/hash, roles por endpoint (RED antes de implementar).
- [ ] **T-04 [S]** BE: `routers/treasury.js` (auth + requireRole en decisiones, rutas fijas antes de dinámicas) + `controllers/treasury.js` esqueleto + montaje `index.js` `/v1/treasury`.
- [ ] **T-05 [S][P]** BE: índices en `firestore.indexes.json`: `payments(company,estadoVerificacion,createdAt)`, `payments(company,referencia)`, `payments(company,archivoHash)`, `treasury_alerts(company,resolved,createdAt)`.

## Bloque 1 — Lógica backend (Fase B)

- [ ] **T-06 [L]** BE: `treasuryService.submitPayment` — transacción Firestore: doc `payments` normalizado + push `PagosAsentados` (con `paymentId`) + `estadoPago=Pospendiente` (flag ON) | camino legacy auto-aprobado con **enum normalizado** (flag OFF). Audit + correlationId.
- [ ] **T-07 [M][P]** BE: `services/treasury/fraudDetection.js` — capa 1 (company+archivoHash) y capa 2 (company+referencia): crea `treasury_alerts` + marca `aiFlag/aiDetails`. Best-effort: su fallo nunca tumba el submit.
- [ ] **T-08 [L]** BE: `reviewPayment` (approve/reject) — idempotente por (paymentId, action), 409 en conflicto; recalcula `anticipo/faltaPorPagar` server-side; estadoPago total→Aprobado, parcial→PreAprobado, reject→Rechazado + motivo; **reusa `updateOrderInternal`** (ya exportada, `controllers/orders.js:4102`) con require lazy — dispara facturación + notificaciones PAYMENT_* + historial sin refactor.
- [ ] **T-09 [M][P]** BE: `directPayment` (tesorero desde cero, aprobado directo, mismo usuario registra+aprueba en audit).
- [ ] **T-10 [M][P]** BE: `changeOrderPaymentState` — matriz CA-09 + motivo obligatorio + audit.
- [ ] **T-11 [M][P]** BE: `GET /metrics` (KPIs server-side), `GET /payments` (historial paginado + filtros), `GET /alerts` + `POST /alerts/:id/resolve`.
- [ ] **T-12 [S][P]** BE: fix divergencia `integration.js:2588-2594` — `"Pagado"/"Pago Parcial"` → enum canónico; el endpoint legacy delega a `treasuryService` con warning `[DEPRECATED]` (patrón 003.2).
- [ ] **T-13 [S]** BE: contract tests VERDES + `node -c` + reinicio backend local verificado.

## Bloque 2 — Frontend módulo (Fase C)

- [ ] **T-14 [M]** FE: scaffold `components/tesoreria/` (module + routing, patrón despachos) + ruta lazy `tesoreria` en `shared/routes/routes.ts` (AuthGuard) + `TreasuryService extends BaseService`.
- [ ] **T-15 [L]** FE: página **Gestión de Pagos**: KPI cards server-side (patrón `.gm-card` flat border-left, skeleton) + `p-tabView` (Por Revisar / Sin Pago / Rechazados / Historial / Alertas) + `p-table` lazy sobre `/orders/all/filter/optimized` con presets + filtros (texto, vendedor, forma de pago, fechas) + fila de totales + motivo de rechazo inline en rojo.
- [ ] **T-16 [M][P]** FE: modal **Revisar Pago** (NgbModal): banner alerta duplicado, datos del pago + link comprobante, resumen total/aprobado/este pago/faltante, aviso parcial→PreAprobado, rechazo con motivo obligatorio, nota "verifica en el banco — la alerta no aprueba" (+ tip QR Verificador Nequi).
- [ ] **T-17 [M][P]** FE: modal **Registrar Pago** (tesorero): base asentarpagomanual + hash SHA-256 (WebCrypto) + indicador de falta por pagar → `POST /payments/direct`.
- [ ] **T-18 [M][P]** FE: modal **Cambiar Estado**: estados disponibles según matriz como cards + motivos radio + "Otro" textarea + confirmar deshabilitado hasta completar.
- [ ] **T-19 [M][P]** FE: tab **Historial** (GET /payments paginado, columnas ClickUp) + tab **Alertas** (lista con severidad, revisar→abre pago, resolver).

## Bloque 3 — Integración con lo existente (Fase D)

- [ ] **T-20 [M]** FE: `asentarpagomanual` (ventas): branch por `treasuryEnabled` → calcula hash, llama `/payments/submit`, NO recalcula estadoPago (usa el que responde el server), muestra "quedó en revisión de tesorería".
- [ ] **T-21 [S]** FE: espejo exacto en clon POS `pos-asentarpagomanual`.
- [ ] **T-22 [M]** FE: desactivar recálculo client-side de estadoPago cuando flag ON (`list.component.ts:3446-3587` + guardas en asentarpagomanual); `preAprobadoManual` se respeta como hoy.
- [ ] **T-23 [M]** FE+BE: menú `nav.service.ts` entrada "Tesorería" (icon dollar-sign) + badge contador Pospendientes (endpoint metrics) + rol **"Tesorero"** en maestro de roles/plantillas + path en `authorizedMenuItems`.

## Bloque 4 — Validación y sello (Fase E)

- [ ] **T-24 [S]** Contract tests + `npm run lint` + build FE OK + regresión flag OFF (asentar pago = comportamiento actual).
- [ ] **T-25 [M]** E2E manual con empresa piloto (flag ON via script T-02): vendedor sube comprobante → Pospendiente + badge menú → tesorero ve alerta si duplicado → aprueba → Aprobado + facturación/notificación disparadas → historial y `treasury_audit` completos → rechazo con motivo visible. Sello **D-TESORERIA-MVP** en CONTRACT.md + actualizar tareas ClickUp (comentario con estado, NO cerrar sin verificación de Daniel).

**Orden crítico:** T-01→T-06→T-08 y T-14→T-15 son la columna vertebral; el resto paraleliza dentro de su bloque. Bloque 3 requiere Bloques 1-2 completos.
