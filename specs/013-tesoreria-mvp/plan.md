# Plan 013 — Tesorería MVP (gestión de pagos con verificación de tesorero)

> Estado: **draft** (pendiente checkpoint humano junto con tasks.md)
> Vinculado a `spec.md` (approved 2026-07-02) y `findings.md`.
> Última actualización: 2026-07-02

## 1. Resumen técnico

Se **extiende** el flujo de pagos existente, no se crea un modelo paralelo: `order.PagosAsentados[]` sigue siendo la fuente de verdad del pedido (compat total con lectores), y la colección `payments` (que ya existe como espejo) se **normaliza y se indexa** para servir la cola de tesorería, el historial y la detección de duplicados cross-pedidos. Backend: router nuevo `/v1/treasury` (router + controller + service, patrón cotizaciones) con `requireRole` en toda decisión. Frontend: módulo lazy `components/tesoreria` (scaffold despachos) con pantalla de gestión + 3 modales. Todo detrás del flag por empresa `treasuryEnabled` (default OFF = comportamiento actual intacto).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec approved 2026-07-02 (D-073) |
| II — Spec captura intent | sí | spec sin tecnología; el cómo vive aquí |
| IV — Idempotencia | sí | review idempotente por (paymentId, acción); efectos de Aprobado protegidos (§5.1) |
| V — Eventos crudos antes de procesar | n/a | no hay webhook externo; cada pago persiste en `payments` + `treasury_audit` append-only antes de efectos |
| VI — UI no acoplada a proveedor | n/a | sin proveedor externo |
| VII — Observabilidad | sí | `treasury_audit` con correlationId + contadores de alertas; sin console.log |
| VIII — Test-first contratos | sí | `scripts/test-013-treasury.js` antes de implementar endpoints |
| IX — Estilo Angular | **parcial** | Angular 14 no soporta signals, `@if/@for` ni standalone pleno (llegaron en v16/v17). Se aplica lo posible: OnPush, lazy loading, HTTP solo en servicios (BaseService). Misma práctica de facto que specs 008/011 — nota registrada en D-073 |
| X — Seguridad webhooks | n/a | sin webhooks |
| XI — Datos sensibles fuera del log | sí | URLs de comprobantes y datos de cliente nunca en logs; auditoría guarda IDs |
| XII — Flags con dueño y retiro | sí (aclarado) | `treasuryEnabled` NO es flag de release: es **configuración de producto por empresa** (como `generarFacturaElectronica`), permanente por diseño. No lleva fecha de retiro |
| XIII — Spec ≤ 3 páginas | sí | CxC/export/recordatorios ya partidos a fase 2 |
| XIV — Contrato vivo | sí | D-073 registrada |
| XV — `integrations` inglés | n/a | no toca `integrations.<provider>` |

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend**: módulo lazy `src/app/components/tesoreria/` (module + routing + página `gestion-pagos` + modales `revisar-pago`, `registrar-pago`, `cambiar-estado-pago` + tab historial/alertas). Servicio `TreasuryService extends BaseService` → `/v1/treasury`. Cambios en `asentarpagomanual` (ventas + clon POS), `nav.service.ts` y recálculo de `list.component.ts`.
- **Backend**: `routers/treasury.js` + `controllers/treasury.js` + `services/treasury/treasuryService.js` + `services/treasury/fraudDetection.js` + `services/treasury/treasuryConstants.js`. Montado en `index.js` como `/v1/treasury`, auth siempre, `requireRole(['Tesorero','Administrador','Super Administrador'])` en decisiones.
- **Almacenamiento**: Firestore (`orders.PagosAsentados`, `payments` normalizada, `treasury_alerts`, `treasury_audit`, campo `treasuryEnabled` en doc de empresa). Storage: comprobantes siguen el patrón actual (FE sube directo, guarda URL).
- **Notificaciones**: reusa `notificationHooks`/`notification_queue` (tipos PAYMENT_* existentes) — se disparan desde los efectos de estado ya existentes, no se duplican.

### 3.2 Flujo (texto)
```
[Vendedor] asentarpagomanual (flag ON)
   → calcula SHA-256 del archivo (WebCrypto) + sube a Storage
   → POST /v1/treasury/payments/submit
        → transacción: doc `payments` (Pendiente) + push PagosAsentados (Pendiente)
          + order.estadoPago = Pospendiente + audit
        → fraudDetection (referencia + hash) → treasury_alerts + aiFlag (best-effort)
[Tesorero] pantalla /tesoreria (cola Pospendientes vía /orders/all/filter/optimized presets)
   → modal Revisar → POST /v1/treasury/payments/:id/review {approve|reject, motivo}
        → transacción: payments + PagosAsentados + anticipo/faltaPorPagar (server)
          + estadoPago (Aprobado|PreAprobado|Rechazado) + audit
        → efectos existentes de Aprobado (facturación Siigo/WO + notificaciones PAYMENT_*)
Flag OFF → todo igual que hoy (auto-aprobado), con enum normalizado.
```

### 3.3 Decisiones técnicas (trazabilidad)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Reusar `PagosAsentados` + normalizar colección `payments` como índice de tesorería | CA-01..05, CA-15; R-04 findings | Modelo nuevo `payment_records` (propuesta SQL de ClickUp): rompería todos los lectores actuales de PagosAsentados; migración innecesaria para MVP |
| Decisiones de pago SOLO por endpoints nuevos con `requireRole` server-side | CA-06 | Confiar en `getAvailablePaymentStates` del FE (hoy): sin enforcement real |
| Flag por empresa `treasuryEnabled` leído server-side en submit/review | CA-01, CA-02 | Flag por env global (no multi-tenant); cambio universal (rompe tenants) |
| Listado principal reusa `POST /v1/orders/all/filter/optimized` con presets | CA-14; regla no duplicar fuentes | Endpoint de listado nuevo: duplicaría el filtro por estadosPago ya optimizado |
| Efectos de Aprobado: reusar **`updateOrderInternal`** (ya exportada en `controllers/orders.js:4102`, firma `(orderData, userEmail, options)`) llamada desde treasuryService con require lazy (evita ciclo) — **actualizado 2026-07-02**: no hace falta extraer helper, la función core ya existe y dispara facturación + notificaciones + historial | CA-03; no duplicar facturación/notifs | Extraer helper `applyPaymentStateEffects` (refactor innecesario del monolito); duplicar lógica en treasury (drift); HTTP interno a /orders/edit (frágil) |
| Hash SHA-256 calculado en FE (WebCrypto) al subir; server deduplica por (company, archivoHash) y (company, referencia) | CA-11, CA-12 | Hash server-side descargando de Storage (costo/latencia; queda para capa 3 OCR fase 2). La capa referencia es 100% server-side |
| Recálculo client-side de estadoPago se desactiva cuando flag ON | R-01 | Mantener recálculo y "reconciliar": condición de carrera permanente |
| Fix divergencia `estadoPago="Pagado"/"Pago Parcial"` normalizando a enum canónico en el camino legacy | R-02, CA-14 (los filtros usan el enum) | Dejarlo: la cola de tesorería no vería esos pedidos |

## 4. Modelo de datos

**`payments` (normalizada — campos nuevos camelCase):** `company`, `orderId` (docId), `nroPedido`, `valor`, `formaPago`, `referencia`, `fechaTransaccion`, `archivoUrl`, `archivoHash` (SHA-256, opcional), `notas`, `estadoVerificacion` ('Pendiente'|'Aprobado'|'Rechazado'), `motivoRechazo`, `registradoPor` (email), `registradoRol`, `revisadoPor`, `revisadoAt`, `aiFlag` ('clear'|'duplicate'), `aiDetails` ({tipo, pedidosInvolucrados[], detalle}), `origen` ('vendedor'|'tesorero'|'pos'|'webhook'), `manual`, `createdAt`. Compat: los docs viejos de `payments` no se migran (el historial arranca desde el deploy; los pagos viejos se consultan por pedido como hoy).

**`treasury_alerts`:** `company`, `severity` ('high'|'medium'), `alertType` ('duplicate_file'|'duplicate_ref'), `message`, `orderIds[]`, `paymentId`, `resolved` (bool), `resolvedBy`, `resolvedAt`, `createdAt`.

**`treasury_audit` (append-only):** `company`, `orderId`, `paymentId?`, `entity` ('payment'|'orderPaymentState'), `previousState`, `newState`, `reason`, `changedBy`, `correlationId`, `createdAt`.

**Doc empresa:** `treasuryEnabled: boolean` (default ausente = false). Piloto se activa por script/superadmin.

**`order.PagosAsentados[]`:** sin campos nuevos — se usan los existentes (`estadoVerificacion`, `usuarioRegistro`, `fechaHoraAprobacionRechazo`, `archivo`). Se agrega `paymentId` (ref al doc `payments`) para correlacionar.

**Índices Firestore:** `payments(company, estadoVerificacion, createdAt desc)`, `payments(company, referencia)`, `payments(company, archivoHash)`, `treasury_alerts(company, resolved, createdAt desc)`.

## 5. Contratos (API)

Todos con auth + header `company`; decisiones además con `requireRole`.

| Endpoint | Rol | Función |
|---|---|---|
| `POST /v1/treasury/payments/submit` | cualquier usuario autenticado | Registra pago de vendedor. Flag ON → Pendiente + Pospendiente; flag OFF → legacy auto-aprobado (enum normalizado). Responde `{payment, estadoPago, alerts[]}` |
| `POST /v1/treasury/payments/:id/review` | Tesorero/Admin/Super | `{action:'approve'\|'reject', motivo}`. Aprueba (total→Aprobado, parcial→PreAprobado) o rechaza (motivo obligatorio) |
| `POST /v1/treasury/payments/direct` | Tesorero/Admin/Super | Pago desde cero, aprobado directo, registra mismo usuario como registrador+aprobador |
| `POST /v1/treasury/orders/:orderId/payment-state` | Tesorero/Admin/Super | Cambio manual validando matriz de transiciones CA-09 + motivo |
| `GET /v1/treasury/metrics` | Tesorero/Admin/Super | KPIs server-side: recaudadoHoy, carteraPendiente, porRevisar, sinPago, alertasActivas, rechazados |
| `GET /v1/treasury/payments` | Tesorero/Admin/Super | Historial paginado con filtros (fecha, estado, formaPago, texto) |
| `GET /v1/treasury/alerts` / `POST /v1/treasury/alerts/:id/resolve` | Tesorero/Admin/Super | Lista/resuelve alertas |

Listado de pedidos de la pantalla: **reusa** `POST /v1/orders/all/filter/optimized` con presets de `estadosPago`.

### 5.1 Idempotencia
- Clave: `(paymentId, action)`. Re-aplicar la misma decisión → 200 `{alreadyDecided:true}` sin efectos. Decisión contraria sobre pago ya decidido → 409.
- Transición de estadoPago fuera de la matriz CA-09 → 409.
- Efectos de Aprobado (facturación/notificaciones) pasan por el guard existente del flujo orders (no re-factura si ya hay `nroFactura`).
- Escrituras `payments` + `PagosAsentados` + `estadoPago` en **transacción Firestore** (decisión de arquitectura del proyecto).

### 5.2 Errores
| Código | Cuándo |
|---|---|
| 400 | body inválido, motivo faltante en reject/cambio manual |
| 401/403 | sin auth / sin rol para decidir |
| 404 | pago o pedido inexistente en la company |
| 409 | decisión conflictiva, transición no permitida |
| 500 | error interno (fraudDetection NUNCA tumba el submit: best-effort con registro en audit) |

## 6. Estrategia de testing
- **Contract tests primero**: `scripts/test-013-treasury.js` (patrón test-011): puras (matriz de transiciones, normalización enum, cálculo aprobación total/parcial, dedup por referencia/hash) + integración con Emulator (SKIP sin emulador).
- **Integration**: submit→review→efectos con Firestore Emulator.
- **E2E manual** (checklist en tasks): empresa piloto flag ON, flujo completo vendedor→tesorero→factura/notificación + alerta de duplicado real.
- **Regresión flag OFF**: asentar pago en empresa sin flag = comportamiento idéntico al actual.

## 7. Fases de implementación
1. **Fase A — Backend base**: constantes/transiciones + flag helper + router/controller vacíos + contract tests (rojo) + índices.
2. **Fase B — Backend lógica**: submit + fraudDetection + review + direct + change-state + metrics/history/alerts + helper `applyPaymentStateEffects` + fix enum legacy + audit. Tests verdes.
3. **Fase C — Frontend módulo**: scaffold + servicio + pantalla (KPIs, tabs, tabla, filtros, totales) + 3 modales + historial/alertas.
4. **Fase D — Integración**: asentarpagomanual (ventas + POS) branch por flag + hash + menú/rol Tesorero + badge + desactivar recálculo FE con flag ON.
5. **Fase E — Validación y sello**: tests + build + E2E piloto + bitácora CONTRACT.md (sello D-TESORERIA-MVP).

## 8. Plan de rollout
- `treasuryEnabled` default OFF → deploy sin impacto en ningún tenant.
- Piloto: 1 empresa de prueba (definir con Daniel en Fase E).
- Rollback: flag OFF restaura el comportamiento legacy al instante (el camino legacy no se elimina).
- El rol "Tesorero" se crea en el maestro de roles; el menú solo aparece con el path autorizado.

## 9. Riesgos técnicos
- Extraer `applyPaymentStateEffects` de `controllers/orders.js` (monolito ~5000 líneas): refactor mínimo, mover-sin-cambiar, con regresión manual del flujo editar pedido.
- Doble escritura `payments` ↔ `PagosAsentados`: obligatoria la transacción; si diverge, la fuente de verdad del pedido es `PagosAsentados`.
- `archivoHash` es best-effort desde el cliente (un FE alterado puede omitirlo) — la capa de referencia es server-side pura; hash server-side llega con OCR fase 2.
- Clon POS de asentarpagomanual: tocar ambos o extraer base compartida (evaluar costo en implementación; mínimo: cambio espejado).
- Backend sin hot-reload (memoria del proyecto): reiniciar proceso en cada prueba local.

## 10. Open questions (técnicas)
- Ninguna bloqueante. Naming del flag: `treasuryEnabled` (identifiers en inglés, acuerdo 2026-05-13).
