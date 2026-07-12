# Findings 022 — Inventario REAL previo a la spec (2026-07-12)

> Verificado contra el código de ambos repos, no asumido. Rutas con `file:line`.

## 1. Scaffold `modules/marketing` existente (frontend) — ROTO pero reutilizable
- `src/app/modules/marketing/marketing.module.ts` declara **8 componentes + 6 servicios**; en disco solo existen `services/marketing.service.ts` y `guards/marketing.guard.ts`. Los otros **13 archivos NO existen**.
- **No está cableado**: ningún `loadChildren` en `app-routing.module.ts` lo referencia; nadie lo importa. Código muerto — no rompe build.
- `marketing.service.ts:15` apunta a `baseUrl = '/api/v1/marketing'` (URL **relativa** — no pega al backend, no lleva interceptor). Modela `MarketingMetrics` (campañas/clientes/performance/cartRecovery), `MarketingEvent` (14 tipos), `MarketingConfig`. Feature flag `ENABLE_MARKETING_MODULE` vía `FeatureFlagsService` (`:34`).
- Rutas previstas en el module: dashboard, campaigns, segments, segment-builder, email-templates, cart-recovery, automation, analytics.
- **Decisión del usuario (2026-07-12): REUSAR esta estructura**, completando solo lo del MVP.

## 2. Backend `/v1/analytics/*` — YA EXISTE una suite completa (montada y con auth)
- Router `functions/routers/analytics.js`, montado en `index.js:724` como `/v1/analytics`.
- Endpoints: `kpi/general`, `users`, `metrics/global`, `stores`, `engagement`, `ltv`, `growth`, `conversion`, `performance`, `categories`, **`marketing`**, `dashboard-core`, `dashboard-details`.
- **`GET /v1/analytics/marketing`** (`controllers/analytics.js:986`) existe pero es **semi-ficticio**:
  - Nuevos clientes: heurístico `nroPedido.endsWith('-1')` sobre orders de 3 meses.
  - Gasto marketing **inventado**: `clientesNuevos * 15000` (constante).
  - `efectividad_canales` **hardcodeada** (email 0.08, redes 0.12, search 0.15...).
- **🐛 BUG CROSS-TENANT (F-01)**: la query de orders en `getMarketingMetrics` (~`analytics.js:1000`) **NO filtra por `company`** — agrega pedidos de TODAS las empresas. Otros endpoints del mismo controller SÍ filtran (`:48,:50,:71,:188,:379`). Mismo patrón de fuga que D-068. **Debe corregirse en el MVP** (o antes).

## 3. Frontend BI existente — infra de charts reutilizable
- Dashboard gerencial: `src/app/components/dashboard/` + `src/app/shared/services/dashboard/analytics.service.ts` (`baseUrl = environment.urlApi + '/v1/analytics'`) — **ya consume la suite analytics correctamente** (con interceptor). Referencia de cómo debe consumir el módulo marketing.
- Hay además `src/app/services/analytics.service.ts` (duplicado — revisar en plan cuál es el canónico).

## 4. CRM (`/v1/crm`) — fuente de audiencias/embudo
- `src/app/components/crm/services/crm.service.ts` (`base = environment.urlApi + '/v1/crm'`): `getLeads` (paginado+filtros), `getLead`, `updatePipeline`, `getActivities`, `getTasks`, `createLead`, **`getStats()` → `CrmStats`**, `getStages`.
- Ya existen: conversión por vendedor según rol, contador "Mis tareas", cierre Ganado verificado contra compras reales (spec 011 + fixes `fca3d051`). El embudo del dashboard puede salir de `getStats`/`getStages` sin cálculo nuevo.

## 5. WhatsApp/Kapso — engagement del canal
- Endpoints reales: `GET /v1/whatsapp/conversations` (+ `messages`, `profile`, `orders`, `viewed`, `reply`, `rating`). No hay endpoint de stats agregadas — para "conversaciones iniciadas/respondidas" habría que agregar (o contar en el front sobre el listado, aceptable para MVP).
- Sub-specs 009.2 (usage-tracking) y 009.3 (billing) siguen pendientes — el medidor de consumo (`whatsapp-billing-meter`) puede mostrar datos que el backend aún no calcula.

## 6. Otras fuentes ya calculadas
- `descuentos-promociones` existe (`components/proceso/descuentos-promociones/`) — candidato a métrica "promos activas/uso".
- Suite `/v1/analytics/pedidos|logistica|inventario` también montada (`index.js:726-730`).
- Reportes BI BigQuery (`katuq_analytics`, vistas `v_*`) mencionados en `index.js:411` — motor de reportes dinámicos; evaluar en plan si el dashboard marketing lee de ahí o de Firestore directo.

## Conclusión para la spec
El MVP de dashboard NO parte de cero: **la suite `/v1/analytics` + CRM stats + charts del dashboard gerencial ya existen**. El trabajo real es: (a) corregir F-01 y volver honesto `getMarketingMetrics` (sin datos inventados), (b) completar los componentes del scaffold que correspondan al MVP, (c) cablear el módulo (routing + nav), (d) decidir qué métricas se muestran solo si son REALES (nada de efectividad de canales ficticia).
