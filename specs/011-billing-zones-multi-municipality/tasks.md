# Tasks 011 — Alta múltiple de zonas de cobro por municipio

> Estado: draft | in-review | approved | **in-progress** | done
> Vinculado a `plan.md` (**approved**, ver D-050).
> Última actualización: 2026-07-30 (aprobado; implementación iniciada)

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de esa tarea.
- Repos: **BACK** = `katuq_admin_back_firebase/functions`, **FRONT** = `Seller.Katuq`. Rama `feature/zonas-de-cobro` en ambos.

## Tareas

### T-01 — Contract test del batch (test-first, rojo) `[P]`  · BACK
- **Input:** contrato §5 del plan.
- **Output:** `functions/scripts/test-zonascobro-batch-contract.js` + script npm `test:zonascobro-batch`.
- **Criterio de éxito:** cubre (a) N municipios → `creadas=N`; (b) reejecutar → todas `omitidas` (idempotencia); (c) municipio con zona de mismo nombre preexistente → omitida; (d) aislamiento por empresa; (e) 400 con payload inválido. Rojo hasta T-02 (o SKIP con guard emulador, como el patrón de cotizaciones).
- **Archivos:** `functions/scripts/test-zonascobro-batch-contract.js`, `functions/package.json`.
- **Dependencias:** ninguna.

### T-02 — Endpoint `create-batch` (verde) (deps: T-01)  · BACK
- **Output:** `createBatch` en `controllers/zonascobro.js` + ruta `POST /create-batch` en `routers/zonascobro.js`.
- **Criterio de éxito:** dup-check en memoria (`company + ciudadNorm + nombreNorm`), **whitelist** de campos, `writeBatch` por chunks de 500, cálculo servidor de `impuesto/total`, validación (municipios≥1, valor≥0, impuesto∈[0,100], nombre no vacío), respuesta `{creadas, omitidas[], fallidas[]}`. Contract test T-01 verde. `node --check` OK + reinicio :3300. `create/edit/delete` intactos.
- **Archivos:** `functions/controllers/zonascobro.js`, `functions/routers/zonascobro.js`.
- **Dependencias:** T-01.

### T-03 — Servicio frontend batch `[P]`  · FRONT
- **Output:** `MaestroService.createBillingZonesBatch(payload)` (extiende patrón de `createBillingZone`, apunta a `/v1/zonascobro/create-batch`).
- **Criterio de éxito:** método tipado que envía `{nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[]}` y retorna el resumen; `tsc --noEmit` OK.
- **Archivos:** `src/app/shared/services/maestros/maestro.service.ts`.
- **Dependencias:** ninguna.

### T-04 — "Todos los municipios" en DaneCodesService `[P]`  · FRONT
- **Input:** verificar si ya existe un método para el total (~1122); resuelve open question #1 del plan.
- **Output:** método `getTodosLosMunicipios()` (o equivalente) sobre `colombia-dane-codes` si no existe; expone el conteo total.
- **Criterio de éxito:** devuelve la lista completa + `count`; `tsc --noEmit` OK.
- **Archivos:** `src/app/shared/services/dane-codes.service.ts` (+ `shared/data/colombia-dane-codes` solo si hace falta lectura).
- **Dependencias:** ninguna.

### T-05 — UI multi-select (chips) en el modal (deps: T-03, T-04)  · FRONT
- **Output:** en `crear-zonas-cobro.component.{ts,html,scss}`: `municipiosSeleccionados: MunicipioDane[]`; `seleccionarMunicipioDane` hace push con dedupe (por `codigo`); chip removible por municipio; `agregarTodosDelDepartamento()` (usa `getMunicipiosByDepartamento`, dedupe); `seleccionarTodosMunicipios()` con conteo (T-04); confirmación (Swal) con la cantidad SOLO en acciones masivas.
- **Criterio de éxito:** se ven/quitan chips; agregar-todos no duplica; el textbox Ciudad de solo lectura queda reemplazado por los chips; `tsc --noEmit` OK.
- **Archivos:** `src/app/components/extras/zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component.{ts,html,scss}`.
- **Dependencias:** T-03, T-04.

### T-06 — Guardar/editar + resumen + caché (deps: T-02, T-05)  · FRONT
- **Output:** `guardar()`: 1 municipio → `createBillingZone` actual; >1 → `createBillingZonesBatch` → UI de resumen (conteos creadas/omitidas/fallidas + ver detalle). Edición: precargar municipio base **no removible** + añadidos → `editBillingZone(base)` + `createBillingZonesBatch(añadidos)`. Tras éxito: **invalidar `sessionStorage['allBillingZone']`**. Validaciones de formulario (valor≥0, impuesto 0–100, ≥1 municipio, nombre).
- **Criterio de éxito:** flujo completo funciona contra el backend T-02; caché invalidada; resumen correcto.
- **Archivos:** `.../crear-zonas-cobro.component.{ts,html}` (y el/los componente(s) que cachean `allBillingZone` si aplica la invalidación centralizada).
- **Dependencias:** T-02, T-05.

### T-07 — Unit tests frontend `[P]` (deps: T-05, T-06)  · FRONT
- **Output:** specs para dedupe de chips, `agregarTodosDelDepartamento` sin duplicar, mapeo del resumen.
- **Criterio de éxito:** specs verdes (o documentar el estado del harness karma, como en spec 010).
- **Archivos:** `crear-zonas-cobro.component.spec.ts`.
- **Dependencias:** T-05, T-06.

### T-08 — E2E local navegador (deps: T-02, T-06)  · FRONT+BACK
- **Output:** checklist verificado contra OH MY STORE (back :3300 + front :4200): (1) agregar todos los municipios de un departamento → confirmar → conteo creadas correcto; (2) reintentar → todas omitidas; (3) municipio con nombre repetido → omitido con aviso; (4) zonas nuevas visibles sin recargar (caché invalidada); (5) editar una zona + agregar 1 municipio → base actualizada + añadido creado.
- **Criterio de éxito:** 0 discrepancias; resumen coincide con Firestore.
- **Dependencias:** T-02, T-06.

### T-09 — Cierre (deps: T-01..T-08)  · FRONT+BACK
- **Output:** bitácora del módulo actualizada; `CONTRACT.md` con el sello de cierre (D-0XX si aplica); commits sellados en `feature/zonas-de-cobro` (ambos repos) con confirmación del usuario.
- **Criterio de éxito:** DoD cumplido.
- **Dependencias:** todas.

## Orden de ejecución sugerido
1. **T-01, T-03, T-04** en paralelo (`[P]`, repos/archivos distintos).
2. **T-02** al terminar T-01.
3. **T-05** al terminar T-03 y T-04.
4. **T-06** al terminar T-02 y T-05.
5. **T-07** (paralelo) y **T-08** al terminar T-06.
6. **T-09** al final.

## Definition of Done
- Contract test del batch verde (o SKIP documentado por falta de emulador).
- E2E local (T-08) PASS con 0 discrepancias resumen↔Firestore.
- Verificación de constitución sin "no" pendientes (Art. IX = parcial documentado).
- `sessionStorage['allBillingZone']` se invalida tras el alta (criterio de caché).
- `CONTRACT.md` actualizado con cualquier desvío. Spec/plan quedan `approved`.
- Deploy EC2 y PRs quedan fuera de la DoD (se coordinan aparte, como en spec 010).
