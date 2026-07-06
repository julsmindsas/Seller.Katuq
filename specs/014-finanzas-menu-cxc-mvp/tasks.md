# Tasks 014 — Finanzas MVP (menú + CxC Cartera)

> Estado: **in-progress** (2026-07-02, sesión autónoma por goal — ver D-076)
> Repos: **BE** = `katuq_admin_back_firebase/functions`, **FE** = `Seller.Katuq/src`.

## Bloque A — Backend cartera

- [x] **T-01 [M]** BE: `services/treasury/carteraService.js` — cálculo completo (query pedidos activos + mapa clientes + buckets aging + agrupación + KPIs + DSO ponderado). Funciones puras exportadas para tests. Tolera formas legacy: `cliente` string JSON, campo `client`, `asesorAsignado` string.
- [x] **T-02 [S]** BE: contract tests `scripts/test-014-cartera.js` — **53/53 PASS**. Ajuste de semántica: "vencida" = >15 días (fuera de corriente), coherente con barra aging + diseño ClickUp.
- [x] **T-03 [S]** BE: handler `getCartera` en `controllers/treasury.js` + `GET /cartera` en `routers/treasury.js` (auth + requireRole TREASURY_DECISION).

## Bloque B — Frontend CxC

- [x] **T-04 [M]** FE: scaffold `components/cartera/` (module + routing + página con p-tabView) + ruta lazy `cartera` en `shared/routes/routes.ts` + `CarteraService extends BaseService` (`shared/services/cartera/`). Implementado por agente angular-ux-craftsman (Opus), revisado por coordinador.
- [x] **T-05 [L]** FE: tab **Cartera por Cliente** — 4 KPI cards flat, filtros client-side, cards con cupo semáforo + mini-bar aging + DSO, detalle expandible (CA-11), empty states, manejo 403/errores con retry, OnPush + trackBy.
- [x] **T-06 [M]** FE: tab **Aging** — 5 KPIs con acentos por rango, barra segmentada (oculta label en segmentos angostos), p-table ordenable con footer de totales.

## Bloque C — Menú + cliente

- [x] **T-07 [S]** FE: `nav.service.ts` — sección "Finanzas" (submenu con hijos asignables: Tesorería path intacto + Cartera nueva con badge NUEVO). `role-templates.ts`: path `cartera` agregado a plantillas Tesorero Y Contador (su descripción ya mencionaba cartera). Ruta lazy `cartera` en routes.ts.
- [x] **T-08 [S]** FE: `crear-cliente-modal` — controles `creditLimit`/`payTermDays` en initForm + inputs con ayuda contextual + defaults 0 en el branch de creación (reset()). Persisten via getRawValue() (backend permisivo, sin cambio).

## Bloque D — Validación + deploy

- [x] **T-09 [S]** Contract tests 53/53 PASS + `tsc --noEmit` limpio + build FE prod verde (solo warnings preexistentes).
- [ ] **T-10 [M]** Deploy BE: commit `1604c43` pusheado a `backend-aws-security`. ⚠️ **SSH a EC2 bloqueado por el clasificador de permisos de la sesión autónoma** — pendiente que Daniel ejecute/apruebe: `cd /home/ubuntu/katuq_admin_back_firebase && git pull origin backend-aws-security && pm2 restart katuq-api`.
- [x] **T-11 [M]** Deploy FE: commit `035ce114` + `firebase deploy --only hosting` (versión **2026.07.02.16**, sin stash — los cambios de despachos ya estaban en prod desde builds anteriores del día). Verificado: main.js servido contiene "Cartera (CxC)" y versión .16. Bitácora D-076 en CONTRACT.md. Comentarios ClickUp bloqueados por permisos (escritura externa) — pendiente manual.
