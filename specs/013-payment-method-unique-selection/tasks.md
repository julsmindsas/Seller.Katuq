# Tasks 013 — Selección de método de pago sin conflicto por id repetido

> Estado: draft | in-review | approved | in-progress | **done**
> Vinculado a `plan.md` (**approved**, D-061).
> Última actualización: 2026-08-06 (cierre D-062 — E2E navegador 4/4 OK)
> Rama: `feature/pagos-metodos-unificados` (misma del lote; ya creada en ambos repos).
>
> **Progreso:** ✅ T-01 (backend `id=docId`) · ✅ T-04 (checkout por `cd`) · ✅ T-02 (helper `idsDuplicados`
> + 3 casos en `test:pagos-metodos` → **10/10**) · ✅ T-03 (reconciliador reporta `[ID DUPLICADO]`; corrida
> real: `id="4"` compartido por **CXC NOMINA** y **BOLD** en OH MY STORE) · ✅ T-05 (asentar e-com por `cd`) ·
> ✅ T-06 (asentar POS por `cd`; guarda el nombre resuelto — corrige que antes guardaba el id; preselección
> tolerante en edición). `ng serve` Compiled successfully. Back :3300, front :4200 arriba.
> **🔵 T-07 (E2E navegador) — la ejecuta el usuario.** Dato de prueba: CXC NOMINA/BOLD (id="4"). Luego T-08 cierre.

## Convenciones
- `[P]` = paralelizable. `(deps: T-NN)` = dependencia.
- Arreglo de raíz = identificar la forma por **`cd`** (docId único), no por `id`.

---

### T-01 — Backend: auto-generar `id` único al crear (deps: —)
- **Input:** `controllers/pagos.js` (`createPagos`, `createPagosPOS`).
- **Output:** crear el doc con `const ref = collection.doc(); body.id = ref.id; await ref.set(body)` →
  `id === cd` (único por construcción). Mantiene validación de nombre (spec 012) y `company/date_edit/user_edit`.
- **Criterio de éxito:** una forma creada tiene `id` igual a su docId; imposible que dos compartan `id`.
- **Archivos:** `functions/controllers/pagos.js`.

### T-02 — Backend: contract test del auto-id (deps: T-01)
- **Input:** `scripts/test-pagos-unicidad-contract.js` (suite `test:pagos-metodos`).
- **Output:** añadir aserciones de lógica pura: (a) un helper `idsDuplicados(docs)` agrupa por `id` y devuelve
  los repetidos; (b) verificar que la política "id = docId" implica unicidad. (La generación real de docId se
  valida en E2E; aquí se cubre la detección de duplicados y la invariante.)
- **Criterio de éxito:** `npm run test:pagos-metodos` verde con los casos nuevos.
- **Archivos:** `functions/scripts/test-pagos-unicidad-contract.js` (+ helper si se extrae a `services/pagosUnicidad.js`).
- **Dependencias:** T-01.

### T-03 — Backend: reconciliador reporta ids duplicados (deps: —) `[P]`
- **Input:** `scripts/reconciliar-metodos-pago.js` (spec 012).
- **Output:** por empresa+canal, agrupar por `id` y reportar los `id` que aparezcan ≥2 veces (con nombres y cd).
  Solo lectura.
- **Criterio de éxito:** corrida read-only lista los ids duplicados (o "sin duplicados").
- **Archivos:** `functions/scripts/reconciliar-metodos-pago.js`.

### T-04 — Frontend: checkout selecciona por `cd` (deps: —)
- **Input:** `ventas/checkout/checkout.component.{html,ts}`.
- **Output:**
  - HTML (≈727-729): `[for]="opcionPago.cd"`, `[id]="opcionPago.cd"`, `[value]="opcionPago.cd"`.
  - TS: valor por defecto `setValue(this.formasPago[0].cd)` (≈232); resolución
    `this.formasPago.find(fp => fp.cd === opcionSeleccionadaId)` (≈841) → `formaDePago = método.nombre`.
- **Criterio de éxito:** con 2 formas de `id` repetido, seleccionar una marca **solo esa** y la orden guarda el
  `formaDePago` correcto.
- **Archivos:** `checkout.component.html`, `checkout.component.ts`.

### T-05 — Frontend: asentar pago manual e-commerce por `cd` (deps: —) `[P]`
- **Input:** `ventas/asentarpagomanual/asentarpagomanual.component.{html,ts}`.
- **Output:** `<option [value]="formaPago.cd">` (≈153) + `find(f => f.cd == sel)` (≈168). Sigue guardando
  `formaPagoObj?.nombre`.
- **Criterio de éxito:** registra el método correcto aunque haya ids repetidos.
- **Archivos:** los dos del componente.

### T-06 — Frontend: asentar pago manual POS por `cd` + guardar nombre (deps: —) `[P]`
- **Input:** `pos/pos-asentarpagomanual/asentarpagomanual.component.{html,ts}`.
- **Output:** `<option [value]="formaPago.cd">` (≈59); en la construcción del `Pago` (≈117/186) resolver
  `find(f => f.cd == control.value)` y guardar el **nombre** (hoy guarda el `id` crudo). Preselección de edición
  (`setValue`, ≈177) con **matcher tolerante** (casar contra `cd` o `nombre`) para no romper registros viejos.
- **Criterio de éxito:** registra el nombre correcto por `cd`; editar un pago viejo no rompe.
- **Archivos:** los dos del componente.

### T-07 — E2E navegador (usuario) (deps: T-01,T-04,T-05,T-06)
- **Output:** crear **2 formas con el mismo `id`** (o usar dos existentes que lo compartan) y verificar:
  (1) en checkout, seleccionar una marca **solo una** (no varias); (2) la orden guarda el `formaDePago`
  correcto; (3) asentar pago manual e-com y POS registran el método correcto. Recordar Ctrl+Shift+R.
- **Criterio de éxito:** 0 casos de selección múltiple; método correcto en los 3 flujos.

### T-08 — Cierre (deps: T-07)
- **Output:** bitácora de cierre en `CONTRACT.md` (D-062) + **`.md` en carpeta `clickup`** con el nombre de la
  rama al inicio + commit con OK del usuario.
- **Criterio de éxito:** contrato actualizado, entregable ClickUp guardado, commit hecho.

---

## Orden de ejecución sugerido
1. **T-01** + **T-03** + **T-04** + **T-05** + **T-06** en paralelo (archivos distintos); **T-02** tras T-01.
2. **T-07** cuando estén T-01/T-04/T-05/T-06. **T-08** al final.

## Definition of Done
- `test:pagos-metodos` verde (con casos de duplicados). Reconciliador reporta ids duplicados.
- Los 3 consumidores seleccionan/resuelven por `cd`; checkout no marca varias a la vez con ids repetidos.
- `id` de formas nuevas = docId (único). Sin backfill de existentes (D-060).
- `CONTRACT.md` actualizado + `.md` ClickUp con nombre de rama.
