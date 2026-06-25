# Tasks 007 — Venta asistida, Paso 1 (Cliente) ligero y sin callejones

> Estado: **in-progress** (aprobado 2026-06-05; Fase A backend T-01..T-03 en curso)
> Vinculado a `plan.md` (**approved**, D-038).
> Última actualización: 2026-06-05

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea debe ser shippable de forma independiente o bloquear de forma explícita.
- OQ resueltas: cron reconcile = conteo por empresa + muestreo (OQ-1); build inicial por empresa empezando por las chicas (OQ-2); `cliente-store` solo venta asistida, no POS (OQ-3).

## Tareas

### Backend — índice de búsqueda (Fases A–E)

### T-01 — Normalizador de texto de búsqueda `[P]`
- **Input:** strings de documento, nombres, apellidos, correo, celular.
- **Output:** `services/clientSearch/normalize.js` puro: `lowercase` + sin tildes + trim; celular → solo dígitos.
- **Criterio de éxito:** unit tests verdes ("Pérez"→"perez", "JUAN"→"juan", "+57 300-1"→"573001").
- **Archivos a tocar:** `functions/services/clientSearch/normalize.js`, `functions/tests/clientSearch/normalize.test.js`.
- **Dependencias:** ninguna.

### T-02 — `clientSearchIndexService` (upsert/delete/query) (deps: T-01)
- **Input:** normalizador + doc de cliente.
- **Output:** servicio que escribe doc en `clients_search_index` (docId = `cd`, `{merge:false}`), borra por `cd`, y consulta por prefijo (N range-queries por `*Norm` + merge + dedup por `cd` + ranking).
- **Criterio de éxito:** integration test (Emulator): upsert→query "juan" devuelve el cliente; "perez" lo encuentra por apellido; delete lo quita.
- **Archivos a tocar:** `functions/services/clientSearch/clientSearchIndexService.js`, `functions/tests/clientSearch/index.test.js`.
- **Dependencias:** T-01.

### T-03 — Índices Firestore compuestos `[P]`
- **Input:** campos `*Norm` consultados por rango.
- **Output:** entradas `(company ASC, <campoNorm> ASC)` en `firestore.indexes.json`.
- **Criterio de éxito:** `firebase deploy --only firestore:indexes` sin error; queries del T-02 no lanzan `FAILED_PRECONDITION`.
- **Archivos a tocar:** `firestore.indexes.json`.
- **Dependencias:** ninguna (coordinar nombres de campo con T-02).

### T-04 — Contract tests de `POST /v1/clients/search` (deps: T-02)
- **Input:** contrato del §5 del plan.
- **Output:** tests que fijan: 400 con term<2, 200 con `[]`, schema de cada item, ranking documento-exacto-primero.
- **Criterio de éxito:** tests rojos contra el `searchClients` actual (full-scan) salvo donde ya coincide; sirven de gate para T-05.
- **Archivos a tocar:** `functions/tests/clients/search.contract.test.js`.
- **Dependencias:** T-02.

### T-05 — Reescribir `searchClients` sobre el índice (deps: T-04)
- **Input:** `clientSearchIndexService.query`.
- **Output:** `controllers/clients.js#searchClients` consulta el índice (no full-scan). Fallback temporal al comportamiento actual si el índice está vacío para la empresa (rollout seguro).
- **Criterio de éxito:** contract tests (T-04) verdes; p95 ≤ 300 ms en empresa de 7.212 (medido en staging/emulator con dataset).
- **Archivos a tocar:** `controllers/clients.js`.
- **Dependencias:** T-04.

### T-06 — Script de construcción inicial del índice (deps: T-02)
- **Input:** colección `clients` (read-only).
- **Output:** `scripts/build-clients-search-index.js` — `--dry-run` por defecto, `--company` para acotar, `--apply` para escribir. Idempotente. Escribe SOLO `clients_search_index`.
- **Criterio de éxito:** dry-run reporta ~10.267 totales; `--apply --company` sobre empresa chica deja paridad 1:1 (count clients == count índice) antes de correr ALMARA.
- **Archivos a tocar:** `functions/scripts/build-clients-search-index.js`.
- **Dependencias:** T-02. **Nunca tocar `clients`.**

### T-07 — Enganchar sync del índice en escritores de cliente (deps: T-02)
- **Input:** controllers de cliente + otros escritores.
- **Output:** `createClient`/`editClient`/`deleteClient` invocan `clientSearchIndexService` tras escribir. Auditar y enganchar también `onboarding import-customers` y cualquier otro escritor (gemini, order-tools).
- **Criterio de éxito:** crear/editar/borrar un cliente refleja el cambio en la búsqueda sin correr el build; lista de escritores auditada en el PR.
- **Archivos a tocar:** `controllers/clients.js`, `controllers/onboarding*.js` (según auditoría).
- **Dependencias:** T-02.

### T-08 — Cron de reconciliación anti-drift (deps: T-06, T-07)
- **Input:** patrón `cron_jobs_config` (002.8).
- **Output:** job que compara **conteo por empresa** clients vs índice + **muestreo** de N docs; si hay desfase, re-upserta los faltantes (OQ-1). Registrado en `cron_jobs_config`.
- **Criterio de éxito:** test: borrar 1 doc del índice a mano → el cron lo detecta y recrea en la siguiente corrida.
- **Archivos a tocar:** `services/cron*`, seed de `cron_jobs_config`.
- **Dependencias:** T-06, T-07.

### T-09 — Observabilidad búsqueda/índice `[P]` (deps: T-05)
- **Input:** puntos de búsqueda y escritura de índice.
- **Output:** logs estructurados (latencia, count resultados, empresa) **sin PII** + métrica de error.
- **Criterio de éxito:** una búsqueda y un upsert producen log estructurado sin documento/teléfono/correo en claro.
- **Archivos a tocar:** `controllers/clients.js`, `services/clientSearch/*`.
- **Dependencias:** T-05.

### Frontend — `cliente-step` (Fase F)

### T-10 — `cliente-store` (estado único del cliente activo) `[P]`
- **Input:** contrato `pedidoGral.cliente` que el wizard consume.
- **Output:** `cliente-store.service.ts` con `activeCustomer$` (BehaviorSubject), `searchState$`, y acciones set/clear/replace. Sin estado disperso.
- **Criterio de éxito:** unit test: setCustomer emite; clear limpia; replace descarta envío/facturación previos.
- **Archivos a tocar:** `src/app/components/ventas/cliente-step/cliente-store.service.ts` (+ spec).
- **Dependencias:** ninguna.

### T-11 — `cliente-search.service` frontend `[P]`
- **Input:** endpoint `/v1/clients/search`.
- **Output:** servicio (vía interceptor auth) con debounce, **sin `distinctUntilChanged`**, minLength unificado (2), manejo de error reintenable.
- **Criterio de éxito:** re-buscar el mismo término dispara nueva consulta; error no inutiliza el campo.
- **Archivos a tocar:** `src/app/components/ventas/cliente-step/cliente-search.service.ts` (+ spec).
- **Dependencias:** ninguna (mock del endpoint).

### T-12 — Componente `cliente-step` standalone OnPush (deps: T-10, T-11)
- **Input:** store + search service.
- **Output:** UI del Paso 1: buscador, barra de cliente activo, formulario crear/editar (campos mínimos T-13), notas, selector de categoría. `*ngIf`/`*ngFor`, OnPush. Fallback "sin match → crear con lo escrito".
- **Criterio de éxito:** E2E del §6 del plan (re-buscar, crear-desde-texto, seleccionar→avanzar, cambiar cliente sin contaminar).
- **Archivos a tocar:** `src/app/components/ventas/cliente-step/cliente-step.component.{ts,html,scss}`.
- **Dependencias:** T-10, T-11, T-13.

### T-13 — Validación de campos mínimos + condicional factura (deps: T-10)
- **Input:** D-Q03.
- **Output:** form con obligatorios = tipo+documento, nombres, celular; apellidos/WhatsApp opcionales (WhatsApp copia celular); correo obligatorio solo si la venta genera factura electrónica (validado en paso facturación, no bloquea Paso 1).
- **Criterio de éxito:** unit test de validadores cubre los 3 casos.
- **Archivos a tocar:** `cliente-step.component.ts` (form).
- **Dependencias:** T-10.

### T-14 — Integrar `cliente-step` en `crear-ventas` preservando contrato (deps: T-12)
- **Input:** `activeCustomer$`.
- **Output:** `crear-ventas` consume el store y mapea a `pedidoGral.cliente` + derivados (`documentoBuscar`, etc.); el Paso 1 viejo queda detrás del flag.
- **Criterio de éxito:** pasos 2-6 funcionan igual que hoy con un cliente seleccionado vía el nuevo Paso 1 (regresión E2E).
- **Archivos a tocar:** `crear-ventas.component.{ts,html}`.
- **Dependencias:** T-12.

### T-15 — Adelgazar SCSS del Paso 1 `[P]` (deps: T-12)
- **Input:** SCSS actual (4.507 LOC) en la parte del Paso 1.
- **Output:** estilos del `cliente-step` acotados a su componente; borrar reglas muertas del Paso 1 en `crear-ventas.component.scss`.
- **Criterio de éxito:** Paso 1 interactivo ≤ 1,5 s en perfil de referencia (CPU 4× + Slow 4G); sin regresión visual.
- **Archivos a tocar:** `cliente-step.component.scss`, `crear-ventas.component.scss`.
- **Dependencias:** T-12.

### Rollout (Fase G)

### T-16 — Feature flag `ventasStep1V2` (deps: T-14)
- **Input:** flag por empresa/usuario.
- **Output:** `ventasStep1V2` (default off) alterna entre Paso 1 viejo y `cliente-step`. Dueño + fecha de retiro registrados (Art. XII).
- **Criterio de éxito:** off = comportamiento actual intacto; on = nuevo Paso 1.
- **Archivos a tocar:** config de flags + `crear-ventas`.
- **Dependencias:** T-14.

### T-17 — Limpieza de código muerto del Paso 1 (deps: T-16)
- **Input:** validación en producción con flag on.
- **Output:** eliminar `buscar()` huérfano, `data[]` mock (185-224) y `getClientByDocument` redundantes del Paso 1 en `crear-ventas`.
- **Criterio de éxito:** build/lint verdes; sin referencias colgando; flag retirado tras +14 días estable.
- **Archivos a tocar:** `crear-ventas.component.ts`.
- **Dependencias:** T-16 (solo tras validar).

## Orden de ejecución sugerido
1. **Paralelo:** T-01, T-03, T-10, T-11.
2. T-02 (tras T-01) → T-04 → T-05.
3. T-06 y T-07 (tras T-02), luego T-08.
4. T-09 (tras T-05).
5. **Frontend:** T-13 (tras T-10) → T-12 (tras T-10/T-11/T-13) → T-14.
6. T-15 en paralelo tras T-12.
7. T-16 (tras T-14) → validar → T-17.

> Backend (T-01..T-09) y frontend (T-10..T-15) avanzan en paralelo; se unen en el rollout. El backend del índice no afecta nada en producción hasta que `searchClients` lo consuma (T-05) y haya datos (T-06).

## Definition of Done
- Contract tests (T-04) + integration + E2E verdes.
- Verificación de constitución sin "no" pendientes (Art. IX = desviación registrada D-038, no bloqueante).
- Observabilidad emitiendo (T-09), sin PII.
- Búsqueda p95 ≤ 300 ms verificada; Paso 1 sin callejones (E2E).
- `clients` sin modificar; índice reconstruible.
- `CONTRACT.md` actualizado con cualquier desvío.
