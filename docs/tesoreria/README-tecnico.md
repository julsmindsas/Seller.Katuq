# Tesorería — Documentación técnica de operación

> Spec canónica: `specs/013-tesoreria-mvp/` (spec + plan + tasks + findings).
> Decisiones: D-073 (apertura + implementación + deploy), D-074 (incidente piloto + guards v2/v3), D-075 (menú + visibilidad Pospendiente) en `specs/CONTRACT.md`.
> Manual de usuario final: `docs/manuales/tesoreria/manual-tesoreria.md`.

## Arquitectura

```
FE Angular (components/tesoreria + asentarpagomanual con branch por flag)
   │  TreasuryService extends BaseService → /v1/treasury
BE Express (routers/treasury.js → controllers/treasury.js → services/treasury/*)
   │  treasuryService reusa updateOrderInternal (controllers/orders.js:4102)
   │  con { skipTreasuryGuard: true } → efectos existentes (facturación
   │  Siigo/WO al Aprobar, notificaciones PAYMENT_*, order_history)
Firestore: orders.PagosAsentados[] (fuente de verdad del pedido)
           payments (espejo normalizado, cola/historial/dedup)
           treasury_alerts · treasury_audit (append-only, correlationId)
           companies.treasuryEnabled (flag por empresa)
```

## Flag por empresa

- Campo `treasuryEnabled: boolean` en `companies` — **lookup por `nomComercial`** (así resuelve el multi-tenant `authentication.js`; los docs NO tienen campo `id`). Ausente = false.
- OFF (default): comportamiento legacy intacto (auto-aprobación, sin updateOrderInternal en submit).
- ON: pago del vendedor → `estadoVerificacion:"Pendiente"` + pedido `Pospendiente`; decisiones solo por `/v1/treasury`.
- Activar: `node scripts/seed-treasury-flag.js --company="NOMCOMERCIAL" [--off] [--apply]` (dry-run default).
- Cache in-memory TTL 60s (`isTreasuryEnabledCached`) para el guard en el hot path de edición.
- FE: `GET /v1/treasury/config` cacheado por sesión (`shareReplay`) — activar el flag requiere recargar la app.

## Endpoints `/v1/treasury` (auth siempre; [ROL] = Tesorero|Administrador|Super Administrador via requireRole)

| Endpoint | Rol | Función |
|---|---|---|
| `GET /config` | auth | `{treasuryEnabled}` |
| `POST /payments/submit` | auth | Registra pago (vendedor/POS). ON→Pendiente+Pospendiente; OFF→legacy con enum canónico. Corre fraudDetection (best-effort) |
| `POST /payments/:id/review` | [ROL] | `{action, motivo}`. Claim **transaccional** (evita doble aprobación→doble factura). Total→Aprobado, parcial→PreAprobado; reject deriva por anticipo + matriz (no fuerza Rechazado si otros pagos cubren) |
| `POST /payments/direct` | [ROL] | Pago del tesorero, aprobado directo |
| `POST /orders/:orderId/payment-state` | [ROL] | Cambio manual: matriz CA-09 + motivo; resuelve pagos Pendientes huérfanos al ir a estado terminal |
| `GET /metrics` | [ROL] | KPIs server-side (incluye valores legacy "Pago Parcial"/"Procesando" en cartera) |
| `GET /payments` | [ROL] | Historial paginado |
| `GET /alerts` · `POST /alerts/:id/resolve` | [ROL] | Alertas anti-fraude |

El listado de pedidos de la pantalla reusa `POST /v1/orders/all/filter/optimized` con presets de `estadosPago`. **Gotcha**: el backend compara fechas como string — el FE envía `fechaFinal = día+1` para incluir pedidos de hoy.

## Guard de tesorería (v3) — `updateOrderInternal`, controllers/orders.js

Con flag ON, en TODO edit genérico (`/orders/edit`, `/edit-multiple-orders`):
1. **Decisiones de pago protegidas para TODOS los roles**: `estadoVerificacion`, `motivoRechazo`, `paymentId`, `aiFlag/aiDetails` de pagos existentes se restauran del doc; pagos nuevos entran forzados a `Pendiente` (`sanitizeTreasuryFields`, pura, con tests).
2. **estadoPago**: con pagos `Pendiente` en el pedido, NADIE lo cambia por este camino (cola de tesorería). Sin pendientes: roles de tesorería libre; vendedores solo entre `Pendiente/Pospendiente/PreAprobado` (D-074 — autorizar entrega es su flujo diario), nunca `Aprobado` ni cierres.
3. **Montos server-side**: `anticipo = computeApprovedAnticipo(pagos)` (pagos sin `estadoVerificacion` = legacy = cuentan como aprobados) y `faltaPorPagar` se recalculan siempre — el body no puede inflarlos.
4. Strip auditado en `treasury_audit` (`BLOCKED:*`), fail-open ante error del guard.
5. Los flujos del módulo pasan `options.skipTreasuryGuard = true`.

**Motivo del guard**: bundles FE cacheados pre-deploy recalculaban estadoPago client-side contando pagos EN REVISIÓN y persistían `Aprobado` sin tesorero (incidente DAD-010860/837/854, D-074). El FE nuevo además trata `Pospendiente` como estado intocable del recálculo.

## Anti-fraude (fraudDetection.js)

- Capa 1: `archivoHash` (SHA-256 calculado en FE con WebCrypto antes del upload) — query `payments(company, archivoHash)`.
- Capa 2: `referencia` repetida cross-pedido — `payments(company, referencia)`; ignora docs legacy sin `estadoVerificacion` (tenían `referencia = nroPedido`, falsas alertas).
- Best-effort: un fallo NUNCA tumba el submit (audit `FRAUD_CHECK_ERROR`). Solo alerta (`treasury_alerts` + `aiFlag` en el pago) — jamás bloquea.

## Colecciones

- `payments`: espejo por pago. Campos nuevos camelCase (`estadoVerificacion`, `archivoHash`, `revisadoPor`, `aiFlag`, `origen` ∈ vendedor|tesorero|pos|webhook…) + legacy conservados (`ordenId`, `monto`, `estado`). Docs pre-tesorería no migrados (historial arranca en el deploy).
- `treasury_alerts`: `severity`, `alertType` (duplicate_file|duplicate_ref), `orderIds[]`, `resolved`.
- `treasury_audit`: append-only — toda transición/decisión/strip con `changedBy`, `correlationId`.
- ⚠️ `pagos` (colección) NO son pagos: es el maestro de formas de pago.
- Índices compuestos en `firestore.indexes.json` (raíz del repo backend). **Gotcha**: un range sin `orderBy` exige índice ASC — las queries usan `orderBy("createdAt","desc")` explícito para casar con los índices DESC.

## Estados fuera de enum (R-02, corregido)

Los writers legacy escribían `"Pagado"/"Pago Parcial"/"Procesando"` (fuera del enum `EstadoPago`). Normalizados: webhooks Wompi/ePayco, creación POS, `orderService`, `integrationControllerV2` (→ Aprobado/PreAprobado/Pendiente). Docs históricos con esos strings siguen contando en las métricas de cartera.

## Menú y roles

- Ítem: `{ path: "tesoreria", title: "Tesorería", type: "link", icon: "dollar-sign" }` en la sección Operaciones de `nav.service.ts`.
- El sidebar filtra por `authorizedMenuItems` = `roles.menus` del rol (colección `roles`, lookup rol+empresa en el login). El admin lo asigna en Configuración → Roles (los links top-level entran al catálogo desde el fix en `getChildrenMenus`); plantilla **"Tesorero"** disponible (`role-templates.ts`).
- Asignación por consola: `node scripts/seed-role-menu-items.js --company="X" --roles="Administrador" [--apply]`.
- Tras asignar: **relogin** (el menú se arma en el login).

## Scripts y tests

| Script (functions/scripts/) | Uso |
|---|---|
| `test-013-treasury.js` | 75 contract tests puros + 6 integración (SKIP sin emulador). `node scripts/test-013-treasury.js` |
| `seed-treasury-flag.js` | Activar/desactivar flag por empresa (dry-run default) |
| `seed-role-menu-items.js` | Agregar ítems de menú a roles (dry-run default) |
| `repair-013-almara-pospendiente.js` | Reparación D-074: pedidos auto-aprobados por bundles viejos → Pospendiente (dry-run default) |

## Deploy

- **Backend**: branch `backend-aws-security` → EC2 `git pull` + `pm2 restart katuq-api` (como ubuntu, NO sudo pm2). Sin hot-reload.
- **Índices**: `firebase deploy --only firestore:indexes --project julsmind-katuq` desde la RAÍZ del repo backend con el `firebase` GLOBAL (⚠️ `npx firebase` falla silencioso: firebase-tools no está en las deps del backend). Tardan minutos en construirse.
- **Frontend**: `npm run release` (build prod + Firebase Hosting). ⚠️ Los bundles cacheados en navegadores abiertos sobreviven horas al deploy — toda protección nueva debe ser server-side.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| "No se pudieron cargar los indicadores" | Índice Firestore faltante/en construcción | Ver `FAILED_PRECONDITION` en logs pm2; deploy de índices y esperar |
| Pago asentado y pedido "sigue Pendiente" | Badge viejo (pre-fix decía "Pendiente" para Pospendiente) o lista sin refrescar | Verificar contra Firestore/`treasury_audit`; refrescar |
| Vendedor no ve PreAprobado | Bundle cacheado | Ctrl+Shift+R |
| KPI "por revisar" ≠ pedidos en la cola | Pagos Pendientes en pedidos que salieron de Pospendiente (legado pre-guard) | `repair-013-almara-pospendiente.js` o decidirlos vía cambio manual |
| Menú no aparece tras asignar rol | El menú se carga en el login | Cerrar sesión y volver a entrar |
| Pedido aprobado sin tesorero | Revisar `treasury_audit` (strip `BLOCKED:*` ausente ⇒ camino con skipGuard o rol admitido) | Auditar con el doc y `_estadoCalculadoEnFrontend` |
