# Tasks 011.1 — Borrado múltiple de zonas de cobro

> Estado: **in-progress** | Basado en `plan.md` (approved). D-054.

## Backend
- [x] **T-01** — `planDeleteBatch({ownedCds, cds, all})` (lógica pura) en `services/zonasCobroPackage.js`
      + `chunk()`. Intersección con `ownedCds`; `all` → todos.
- [x] **T-02** — `controllers/zonascobro.js` → `deleteBatch`: lee zonas de `company` (header), arma
      `ownedCds`, aplica `planDeleteBatch`, borra en `writeBatch` troceado ≤ 400. Responde
      `{msg, deleted, ignored}`. `400` si no hay `all` ni `cds`.
- [x] **T-03** — `routers/zonascobro.js` → `router.post('/delete-batch', auth, Controller.deleteBatch)`.
- [x] **T-04** — Test `scripts/test-zonascobro-delete-batch.js` + npm `test:zonascobro-delete-batch` → **12/12**.
      Regresión `test:zonascobro-package` 18/18.
- [x] **T-05** — `node --check` OK + backend local reiniciado (:3300); ruta verificada (401, montada).

## Frontend
- [x] **T-06** — `maestro.service.ts` → `deleteBillingZonesBatch(payload)`.
- [x] **T-07** — `zonas-cobro.component.ts` → `seleccionadas`, `borrarSeleccionadas()` (conteo zonas+munis),
      `borrarTodas()` (Swal input `ELIMINAR`), conservado `deleteBillingZone`.
- [x] **T-08** — `zonas-cobro.component.html` → `[(selection)]`, columna checkbox (header = página visible,
      body por fila), toolbar "Eliminar seleccionadas (N)" + "Eliminar TODAS". Basura por fila conservada.
- [x] **T-09** — `Compiled successfully`. `colspan` 8→9 en expansión y emptymessage.

## Cierre
- [ ] **T-10** — E2E navegador (usuario): borrar selección en una página; "Eliminar TODAS" con `ELIMINAR`;
      verificación read-only del conteo en Firestore. **← PENDIENTE (lo prueba el usuario)**
- [x] **T-11** — Registrado **D-054** + bitácora en `specs/CONTRACT.md`.
- [x] **T-12** — `.md` de cierre: `clickup/feature-zonas-de-cobro__011.1-borrado-multiple.md`.
