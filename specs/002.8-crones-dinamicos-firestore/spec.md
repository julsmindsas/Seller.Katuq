# Spec 002.8 — Crones dinámicos vía Firestore (registrables sin redeploy)

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Goal D-011: dejar `/flows` funcionando bien sin dañar lo que ya funciona — incluye que crones se puedan ajustar/registrar dinámicamente.

## 1. Por qué

Hoy los 7 crones del sistema (`fullInventorySync`, `osmosisProductSync`, `osmosisOrderSync`, etc.) están **hardcoded en `cronService.js:14-30`**. Cambiar `*/30 * * * *` a `*/15 * * * *` requiere editar código + redeploy de Cloud Functions. El operador no puede autoservir.

Adicionalmente, **no existe forma de registrar un cron nuevo sin código** — bloqueante para crear crones por empresa o por flow específico.

## 2. Criterios EARS

- **AC-01.** THE system SHALL leer las definiciones de crones desde colección Firestore `cron_jobs_config` al boot del backend.
- **AC-02.** WHEN el backend arranca, THE system SHALL cargar todos los docs activos (`enabled: true`) de `cron_jobs_config` y registrarlos en el scheduler.
- **AC-03.** WHEN se actualiza un doc de `cron_jobs_config` (vía endpoint REST o consola), THE system SHALL recargar ese cron sin requerir restart del backend (hot-reload).
- **AC-04.** THE system SHALL exponer endpoints REST autenticados:
  - `GET /v1/admin/cron-jobs` — lista todos los crones config.
  - `GET /v1/admin/cron-jobs/:id` — detalle uno.
  - `POST /v1/admin/cron-jobs` — crear nuevo.
  - `PATCH /v1/admin/cron-jobs/:id` — actualizar (frecuencia, enabled, params).
  - `DELETE /v1/admin/cron-jobs/:id` — eliminar (soft delete `enabled: false`).
  - `POST /v1/admin/cron-jobs/:id/run` — disparar manualmente una vez.
- **AC-05.** THE system SHALL mantener compat con los 7 crones hardcoded actuales — al primer boot, hace seed automático de `cron_jobs_config` con los valores actuales si la colección está vacía.
- **AC-06.** THE system SHALL validar el cron expression (formato IANA) antes de aceptar create/update — rechazar `999 * * * *` con 400.
- **AC-07.** WHEN un cron config tiene `companyId`, THE system SHALL ejecutarlo solo para esa empresa (los crones globales tienen `companyId: null`).

## 3. Schema de `cron_jobs_config`

```typescript
{
  id: string;                  // doc ID, slug ej. 'osmosis-product-sync'
  name: string;                // human readable ej. 'Sync productos Osmosis'
  description?: string;
  cronExpression: string;      // ej. '0 */6 * * *'
  timezone: string;            // ej. 'America/Bogota'
  enabled: boolean;
  handler: string;             // identificador del handler ej. 'osmosisProductSync'
  handlerParams?: object;      // params específicos del handler
  companyId?: string | null;   // null = global; string = solo esa empresa
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  // metadata operativa
  lastRunAt?: Timestamp;
  lastRunStatus?: 'success' | 'error';
  lastRunError?: string;
  totalRuns?: number;
  totalErrors?: number;
}
```

## 4. Out of scope

- UI Angular para administrar crones — endpoint REST suficiente para sesión actual; UI futura.
- Workflow de aprobación de crones (ej. cambios sensibles requieren review).
- Histórico detallado de ejecuciones (lo que existe en logs sirve).
- Cron expressions exóticos (años, segundos) — solo IANA estándar.

## 5. Plan

1. **`services/cronJobsConfigService.js` (NUEVO)**: CRUD + cache + validación cron-expression.
2. **`services/cronService.js`**: refactor mínimo para que `init*Job` consulte `cronJobsConfigService` antes de crear el `cron.schedule`. Si no hay doc en Firestore, hace seed con el default hardcoded actual (preserva compat).
3. **`controllers/cronJobsAdminController.js` + `routers/cronJobsAdmin.js` (NUEVOS)**: endpoints REST.
4. **Hot-reload**: listener Firestore `onSnapshot` en `cron_jobs_config` que cuando detecta cambio, llama `_reloadCronJob(id)` en cronService.
5. **Seed inicial**: al primer boot post-deploy, si `cron_jobs_config` está vacío, crea los 7 docs con los valores hardcoded actuales (preserva comportamiento).

## 6. Riesgos

- **R-01.** Si el listener Firestore se corta, los hot-reloads dejan de funcionar y solo se actualiza al boot. **Mitigación**: log + alert si pérdida de listener; aceptar reload manual via `POST /:id/run` o restart.
- **R-02.** Si alguien crea un cron `* * * * *` (cada segundo) por error, satura. **Mitigación**: validador rechaza expresiones con frecuencia <30s.
- **R-03.** Hot-reload puede perderse si el backend está mid-restart. **Mitigación**: al boot siempre re-lee toda la colección (autoridad final).
- **R-04.** Eliminar un cron desde Firestore puede dejar runs en curso colgados. **Mitigación**: delete = soft delete (`enabled: false`). Hard delete requiere flag explícito.

## 7. Métricas de éxito

- M-01. Cero crones hardcoded post-deploy (todos viven en `cron_jobs_config`).
- M-02. Cambiar la frecuencia de `osmosisProductSync` de 6h a 3h sin redeploy = update via `PATCH /v1/admin/cron-jobs/osmosis-product-sync`.
- M-03. Crear cron nuevo (ej. `osmosis-stock-pull` cada 15min para una empresa específica) sin tocar código.
- M-04. Cero regresiones operativas en los 7 crones existentes en 7 días post-deploy.
