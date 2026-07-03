# Tasks 014 — Finanzas MVP (menú + CxC Cartera)

> Estado: **in-progress** (2026-07-02, sesión autónoma por goal — ver D-076)
> Repos: **BE** = `katuq_admin_back_firebase/functions`, **FE** = `Seller.Katuq/src`.

## Bloque A — Backend cartera

- [x] **T-01 [M]** BE: `services/treasury/carteraService.js` — cálculo completo (query pedidos activos + mapa clientes + buckets aging + agrupación + KPIs + DSO ponderado). Funciones puras exportadas para tests. Tolera formas legacy: `cliente` string JSON, campo `client`, `asesorAsignado` string.
- [x] **T-02 [S]** BE: contract tests `scripts/test-014-cartera.js` — **53/53 PASS**. Ajuste de semántica: "vencida" = >15 días (fuera de corriente), coherente con barra aging + diseño ClickUp.
- [x] **T-03 [S]** BE: handler `getCartera` en `controllers/treasury.js` + `GET /cartera` en `routers/treasury.js` (auth + requireRole TREASURY_DECISION).

## Bloque B — Frontend CxC

- [ ] **T-04 [M]** FE: scaffold `components/finanzas/cxc/` (module + routing + página `cartera` con p-tabView) + ruta lazy `finanzas/cartera` en `shared/routes/routes.ts` + `CarteraService extends BaseService`.
- [ ] **T-05 [L]** FE: tab **Cartera por Cliente** — 4 KPI cards flat, filtros (texto, riesgo, vendedor), cards por cliente (saldo, barra cupo semáforo, mini-bar aging, DSO, pedidos activos), detalle expandible de pedidos (CA-11).
- [ ] **T-06 [M]** FE: tab **Aging** — 5 KPIs, barra horizontal segmentada con montos, tabla por cliente con footer de totales.

## Bloque C — Menú + cliente

- [x] **T-07 [S]** FE: `nav.service.ts` — sección "Finanzas" (submenu con hijos asignables: Tesorería path intacto + Cartera nueva con badge NUEVO). `role-templates.ts`: path `cartera` agregado a plantillas Tesorero Y Contador (su descripción ya mencionaba cartera). Ruta lazy `cartera` en routes.ts.
- [x] **T-08 [S]** FE: `crear-cliente-modal` — controles `creditLimit`/`payTermDays` en initForm + inputs con ayuda contextual + defaults 0 en el branch de creación (reset()). Persisten via getRawValue() (backend permisivo, sin cambio).

## Bloque D — Validación + deploy

- [ ] **T-09 [S]** Contract tests PASS + build FE prod verde.
- [ ] **T-10 [M]** Deploy BE (commit → push → EC2 `git pull` + `pm2 restart katuq-api`) + verificar 401/403 en `/v1/treasury/cartera`.
- [ ] **T-11 [M]** Deploy FE (`npm run release` con stash de cambios ajenos de despachos) + verificación visual en prod + bitácora D-076 en CONTRACT.md + comentario en tasks ClickUp (NO cerrarlas — regla del proyecto).
