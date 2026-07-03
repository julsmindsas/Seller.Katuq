# Plan 014 — Finanzas MVP (sección de menú + CxC Cartera)

> Estado: **draft** (vinculado a spec.md approved-by-goal 2026-07-02)
> Última actualización: 2026-07-02

## 1. Resumen técnico

Se **extiende** la infraestructura de tesorería (spec 013), no se crea un dominio paralelo: el cálculo de cartera vive en `treasuryService` (ya conoce pedidos + estados de pago + multi-tenant) expuesto como `GET /v1/treasury/cartera`. Frontend: módulo lazy nuevo `components/finanzas/cxc` (patrón tesorería) con 2 tabs server-driven. Menú: sección top-level "Finanzas" en `nav.service.ts` que agrupa la entrada existente de Tesorería (mismo path → conserva autorización, precedente D-075) + entrada nueva "Cartera (CxC)". Campos `creditLimit`/`payTermDays` se agregan al form de cliente (Firestore schemaless → sin cambio de modelo backend).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 014 escrita antes del código (checkpoints consolidados por goal, ver D-076) |
| IV — Idempotencia | sí | endpoint read-only |
| VII — Observabilidad | sí | errores con contexto; sin console.log |
| IX — Estilo Angular | parcial | mismo criterio 013 (Angular 14): OnPush, lazy, BaseService |
| XIII — Spec ≤ 3 páginas | sí | Factus/exportes/recordatorios fuera |
| XIV — Contrato vivo | sí | D-076 registrada |
| XV — integrations inglés | n/a | no toca `integrations.<provider>` |

## 3. Arquitectura

### 3.1 Backend (`katuq_admin_back_firebase/functions`)

- **`GET /v1/treasury/cartera`** — auth + `requireRole(['Tesorero','Administrador','Super Administrador'])` (mismo guard que `/metrics`).
- Nuevo `services/treasury/carteraService.js` (SRP: no engordar treasuryService) + handler en `controllers/treasury.js` + ruta en `routers/treasury.js`.
- Cálculo:
  1. Query pedidos activos — MISMA definición del KPI `carteraPendiente` de `treasuryService.getMetrics` (:1156-1169): `orders.where(company).where(estadoPago in [Pendiente, Pospendiente, PreAprobado, "Pago Parcial", "Procesando"])` con `select()` proyectado (+ campos de cliente/fechas/asesor).
  2. Saldo por pedido: `faltaPorPagar` con fallback `total − anticipo` (R-02 spec); saldos ≤ 0 se descartan.
  3. Query clientes de la company → mapa por documento: `{creditLimit, payTermDays, nombre}` (defaults 0).
  4. `payDueDate = fechaEntrega + payTermDays` (fallback fecha creación, R-03). `diasVencido = hoy − payDueDate`. Buckets: corriente ≤15, 16-30, 31-60, 60+.
  5. Agrupar por documento del cliente: saldo total, buckets, pedidos activos (lista con nroPedido, fechas, total, pagado, saldo, diasVencido), cupo usado %, DSO cliente.
  6. DSO: promedio de días de antigüedad ponderado por saldo (aproximación MVP documentada; DSO contable con ventas del período → fase 2).
  7. Respuesta: `{ kpis: {carteraTotal, clientesConSaldo, carteraVencida, pctVencida, dsoPromedio, excedenCupo, aging: {corriente, d16_30, d31_60, d60}}, clientes: [...] }`.
- Todo el agregado se computa en UNA pasada server-side (regla: métricas server-side, sin cache extra).

### 3.2 Frontend (`Seller.Katuq/src`)

- Módulo lazy `src/app/components/cartera/` (module + routing + página + componentes de tab), patrón flat idéntico a `components/tesoreria/` — desvío menor vs primer borrador (`finanzas/cxc`): se sigue la convención real del repo (módulos top-level planos).
- `CarteraService extends BaseService` (`shared/services/cartera/`) → `GET /v1/treasury/cartera`.
- Página con `p-tabView`:
  - **Tab Cartera por Cliente**: 4 KPI cards (patrón `.gm-card` flat border-left), filtros client-side sobre la respuesta (búsqueda, riesgo, vendedor), cards por cliente con barra de cupo + mini-bar aging, click → detalle de pedidos (expand/modal).
  - **Tab Aging**: 5 KPIs, barra segmentada horizontal, p-table por cliente con footer de totales.
- Ruta lazy `cartera` en `shared/routes/routes.ts` con AuthGuard.
- Menú `nav.service.ts`: header `{headTitle1: 'Finanzas'}` + submenu `{title: 'Finanzas', type: 'sub', children: [Tesorería (path existente `tesoreria`), Cartera (CxC) (path nuevo `cartera`)]}` — se saca Tesorería de Operaciones; los hijos de un sub entran individualmente al pickList del maestro de roles.
- `role-templates.ts`: plantilla "Tesorero" incluye el path nuevo.
- Form de cliente: campos `creditLimit` (COP) y `payTermDays` (días) en la sección de datos comerciales del modal crear/editar cliente (se persisten con el doc del cliente — schemaless).

### 3.3 Decisiones técnicas

| Decisión | Razón | Alternativas descartadas |
|---|---|---|
| Endpoint en `/v1/treasury` | reusa auth+rol+dominio pagos; CxC "son los mismos datos de Tesorería agrupados por NIT" (ClickUp) | Router `/v1/finance` nuevo (más superficie sin beneficio MVP) |
| Filtros client-side sobre respuesta agregada | la respuesta ya viene agrupada por cliente (cientos, no miles); evita N queries | Filtros server-side paginados (innecesario para agregado por cliente) |
| DSO = edad promedio ponderada por saldo | no requiere segunda query de ventas del período | DSO contable (ventas 90d): segunda query pesada, fase 2 |
| Tesorería conserva path `tesoreria` | autorización por rol intacta (lección D-075 Descuentos) | mover path (rompería `authorizedMenuItems` de tenants) |

## 4. Contratos (API)

| Endpoint | Rol | Función |
|---|---|---|
| `GET /v1/treasury/cartera` | Tesorero/Admin/Super | Cartera agrupada por cliente + KPIs + aging, todo server-side |

Errores: 401 sin auth, 403 sin rol, 500 con mensaje contextual.

## 5. Estrategia de testing

- Contract tests puros `scripts/test-014-cartera.js` (patrón test-013): bucketing de aging (bordes 15/30/60), fallbacks de saldo y fecha, cupo usado/excede, agrupación por documento, DSO ponderado, tolerancia a estados legacy fuera de enum.
- Build FE verde + lint.
- E2E manual contra empresa piloto (ALMARA tiene 652 pedidos activos con cartera $72.4M — dato real D-073) — verificación visual de KPIs vs métricas de tesorería.

## 6. Fases

1. **Fase A** — Backend: carteraService + contract tests + ruta/controller.
2. **Fase B** — Frontend: módulo CxC + servicio + 2 tabs + detalle.
3. **Fase C** — Menú Finanzas + role-templates + campos cliente (creditLimit/payTermDays).
4. **Fase D** — Validación (tests + build) + deploy (BE: EC2 pm2; FE: Firebase Hosting) + bitácora D-076.

## 7. Riesgos técnicos

- Query de clientes por company puede ser grande → traer solo campos necesarios / mapa en memoria por request (aceptable MVP).
- Pedidos legacy `estadoPago` "Pagado"/"Pago Parcial" ya normalizados por 013 en writers; el cálculo además los tolera por lectura.
- Backend sin hot-reload: reiniciar proceso local en cada prueba.
- Deploy backend a EC2: NO `sudo pm2` (2 daemons; solo el de `ubuntu` sirve — memoria del proyecto).
