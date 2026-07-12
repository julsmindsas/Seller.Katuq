# Sub-specs de 021 — Enrutamiento multi-tenant por subdominio (Nivel A)

> 021 es el **spec MARCO**. La arquitectura compartida vive en `021/plan.md` (backbone técnico común). Cada feature de abajo es una **sub-spec hija** con su propio `spec.md → plan.md → tasks.md` y un **dueño único**. Registrado en CONTRACT.md D-088 (split Artículo XIII).

## Por qué se parte
El plan monolítico mezclaba 7 frentes (datos, endpoint, infra, frontend, handoff, seguridad, URLs). Para un equipo de 6 personas eso es un cuello de botella: un solo dueño, un solo PR gigante, cero paralelismo. Partido, cada quien toma una hija con contrato claro y se integran por los endpoints/flags.

## Mapa de sub-specs

| # | Feature | Capa | Depende de | Ola | Tamaño | Dueño sugerido |
|---|---|---|---|---|---|---|
| **021.1** | **Slug de tenant** — campo `subdomain` en `companies`, auto-generación desde `nomComercial` (colisión→sufijo), reservados, `PUT /companies/:id/subdomain` (superadmin), backfill `--dry-run` | BE + UI superadmin | — | **1** | M | P1 (BE) |
| **021.2** | **Resolución `subdominio→company`** — `GET /v1/tenant/resolve/:slug` público, cache, 404 reservado/inactivo, contract test | BE | 021.1 | **2** | S | P1 (BE) |
| **021.3** | **Infra wildcard** — reverse proxy `*.katuq.com` + TLS wildcard → Firebase single-site, runbook de renovación | Ops/DevOps | — | **1** | M | P6 (Ops) |
| **021.4** | **Tenant resolver frontend** — `TenantResolverService` en `APP_INITIALIZER`, interceptor toma `company` del tenant resuelto, branding (logo/nombre), login directo por subdominio | FE | 021.2 (+021.3 para probar real) | **3** | M | P4 (FE) |
| **021.5** | **Login central + handoff** — `POST /v1/tenant/handoff` + `/redeem` (BE), ruta `/auth/handoff` + redirect (FE), token stateless un-solo-uso | Full-stack | 021.2, 021.4 | **4** | M | P4 (FE) + P2 (BE) |
| **021.6** | **Endurecimiento tenant↔JWT + CORS wildcard** — middleware `enforceCompanyMatch` (flag), regex CORS `*.katuq.com` | BE / seguridad | 021.4 | **4** | M | P5 (BE) |
| **021.7** | **URLs tenant-aware** — helper `resolveTenantBaseUrl(company)` + inventario y rewire de las ~23 URLs hardcodeadas (pagos Wompi/ePayco, callbacks suscripción, plantillas de correo) | BE | 021.1 | **2-3** | L | P3 (BE) |
| **021.8** | **Observabilidad + rollout + aceptación** — logs + métrica de mismatch, orquestación de flags, suite E2E, piloto Demo KAI (patrón 002.6/003.6) | Full-stack / QA | todas | **5** | M | P6 (Ops) + rotación |

## Grafo de dependencias
```
021.1 (slug) ──┬─► 021.2 (resolve) ──► 021.4 (FE resolver) ──┬─► 021.5 (login+handoff) ──► 021.8 (cierre)
               │                                             └─► 021.6 (seguridad+CORS) ──┘
               └─► 021.7 (URLs tenant-aware) ─────────────────────────────────────────────┘
021.3 (infra) ──────────────────────────────────────────────► (gate del piloto E2E de 021.8)

Ruta crítica: 021.1 → 021.2 → 021.4 → 021.5 → 021.8  (5 olas)
Paralelas:    021.3 (infra) desde el día 1 · 021.7 (URLs) tras 021.1
```

## Plan de olas para 6 personas

| Ola | Arranca en paralelo | Quién | Los demás mientras tanto |
|---|---|---|---|
| **1** | 021.1 (slug) · 021.3 (infra) | P1, P6 | P2–P5 escriben `spec.md`/contract tests de su hija (test-first, Art. VIII) y revisan el `plan.md` marco |
| **2** | 021.2 (resolve) · 021.7 (URLs) | P1, P3 | P4 prepara scaffolding FE contra el contrato de 021.2 (mock) |
| **3** | 021.4 (tenant resolver FE) | P4 | P2/P5 preparan handoff y `enforceCompanyMatch` contra contratos |
| **4** | 021.5 (login+handoff) · 021.6 (seguridad+CORS) | P4+P2, P5 | P3 cierra 021.7; P1 apoya reviews |
| **5** | 021.8 (cierre + piloto Demo KAI) | P6 + rotación | todos: E2E, fix de integración |

Notas:
- **021.3 (infra) no bloquea el desarrollo** de 021.2/021.4/021.5 (se mockea el host / se prueba en `localhost` con `?tenant=`), pero **sí bloquea el piloto E2E** de 021.8. Levantarla temprano quita riesgo.
- **021.7 (URLs) es prerequisito para habilitar pagos** en un tenant con subdominio (R-01: el retorno de pasarela debe volver al mismo origen). No se enciende `subdomainRoutingEnabled` en un comercio con pagos hasta que 021.7 esté listo.
- Cada hija integra por **contrato + feature flag**, no por rama compartida gigante. Un PR por hija, revisable.
- Tamaños: S ≈ 1-2 días, M ≈ 3-5 días, L ≈ 1-1.5 semanas (1 persona). Con las olas, el marco cabe en ~2-3 semanas de calendario.

## Estado
- **021 marco:** `spec.md` approved + `plan.md` draft (backbone arquitectónico compartido).
- **021.1–021.8:** por crear (`spec.md` de cada una). Siguiente paso: generar las specs de la **Ola 1** (021.1 y 021.3) para que P1 y P6 arranquen, más los scaffolds del resto.
