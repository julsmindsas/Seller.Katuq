# Plan 013 — Selección de método de pago sin conflicto por id repetido

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, D-060). Aprobado en checkpoint 2026-08-06 (D-061).
> Última actualización: 2026-08-06

## 1. Resumen técnico
Dos frentes. **(A) Raíz:** en los 3 consumidores de selección de forma de pago (checkout e-commerce, asentar
pago manual e-commerce y POS) se cambia la identidad de `opcionPago.id` → **`opcionPago.cd`** (docId de
Firestore, único) en el `[value]`/`[id]`/`[for]` y en la resolución del método; al persistir se guarda el
**nombre** resuelto por `cd` (unifica el comportamiento; hoy POS guardaba el `id` crudo). **(B) Prevención:** el
backend **auto-genera un `id` único** al crear una forma de pago (`id = docId`), de modo que dos formas nunca
comparten `id`. **(C) Detección:** el script de reconciliación (spec 012) reporta además los `id` duplicados
existentes. Sin backfill (D-060): los duplicados actuales quedan inertes porque la selección ya no usa `id`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 013 approved (D-060). |
| II — Spec captura intent | sí | la spec no nombra tecnología. |
| IV — Idempotencia | sí | crear una forma asigna `id=docId` (único); reintentos no duplican identidad. |
| VI — UI no acoplada a proveedor | sí | selección genérica por `cd`, sin lógica por proveedor. |
| VII — Observabilidad | sí | auto-id y reporte de duplicados quedan registrados estructuradamente. |
| VIII — Test-first contratos | sí | contract test: create asigna `id` único; reporte de duplicados. |
| IX — Estilo Angular | sí (con salvedad) | Angular 14: se conserva `*ngIf/*ngFor` y el patrón existente (ver desviación Art. IX ya registrada). |
| XI — Datos sensibles fuera del log | sí | no se loguean secretos. |

> Sin colección nueva ni endpoint v2 → no dispara el gate del backend. Se endurecen `createPagos`/`createPagosPOS`
> (ya modificados en spec 012) para fijar `id=docId`.

## 3. Arquitectura

### 3.1 Backend — auto-generar `id` único
- `controllers/pagos.js` → `createPagos` y `createPagosPOS`: en vez de `collection.add(body)`, usar
  `const ref = collection.doc(); body.id = ref.id; await ref.set(body)`. Así **`id === cd`**, único por
  construcción. Mantiene la validación de nombre (spec 012) y `date_edit/user_edit/company`.
- **No** se toca `edit`/`pos/edit` (no reasigna id en edición → estable).

### 3.2 Frontend — selección por `cd` (3 consumidores)
Todos reciben las formas con `cd` incluido (`/v1/pagos/all`, `/pos/all`).

1. **Checkout e-commerce** (`checkout.component`):
   - HTML: `[for]="opcionPago.cd"`, `[id]="opcionPago.cd"`, `[value]="opcionPago.cd"`.
   - TS: valor por defecto `setValue(this.formasPago[0].cd)`; resolución
     `this.formasPago.find(fp => fp.cd === opcionSeleccionadaId)` → `formaDePago = método.nombre`.
2. **Asentar pago manual e-commerce** (`asentarpagomanual`):
   - HTML: `<option [value]="formaPago.cd">`.
   - TS: `find(f => f.cd == sel)` (ya guarda `formaPagoObj?.nombre`).
3. **Asentar pago manual POS** (`pos-asentarpagomanual`):
   - HTML: `<option [value]="formaPago.cd">`.
   - TS: resolver `find(f => f.cd == control.value)` y **guardar el `nombre`** (hoy guardaba el `id` crudo →
     se corrige la inconsistencia). Preselección en edición (`setValue`) tolerante: casar el valor guardado
     contra `cd` o `nombre` de las opciones (compat con registros viejos que guardaban `id`).

### 3.3 Detección de duplicados
- Ampliar `scripts/reconciliar-metodos-pago.js` (spec 012): por empresa+canal, reportar `id` repetidos
  (agrupar por `id`, listar los que aparezcan ≥2 veces). Solo lectura.

## 4. Modelo de datos
Sin cambios de esquema. `id` pasa a ser igual al `cd` (docId) en las formas **nuevas**; las existentes
conservan su `id` (posiblemente repetido) pero ya no se usa como identidad de selección.

## 5. Contratos (API)
- `POST /v1/pagos/create` y `/pos/create`: comportamiento igual, pero el doc creado tiene `id === docId`.
  Respuesta `{msg:'added'}` sin cambios. (Nota: hoy responden `{msg:'added'}` sin devolver el id; no hace falta
  devolverlo porque el front recarga la lista.)
- Lecturas `/all` y `/pos/all`: sin cambios (ya devuelven `cd`).

### 5.1 Idempotencia
- `id=docId` es único por construcción; reintentar crear no colisiona (además la unicidad de nombre de spec 012).

## 6. Estrategia de testing
- **Contract test (backend):** `createPagos` asigna `id` igual al docId y único (no acepta que 2 docs compartan
  id por construcción). Se amplía `test:pagos-metodos` o script aparte.
- **Report test:** el reconciliador detecta ids duplicados en un set de datos simulado (lógica pura).
- **E2E navegador:** con 2 formas de `id` repetido (dato de prueba), verificar en checkout que seleccionar una
  marca **solo esa**, y que la orden guarda el `formaDePago` correcto; ídem asentar pago manual (e-com y POS).
- **Unit:** N/A nueva lógica pura salvo el agrupador de duplicados (se cubre en el report test).

## 7. Fases de implementación
1. **Fase A — Backend:** auto-id (`id=docId`) en `createPagos`/`createPagosPOS`; `node --check` + reinicio :3300.
2. **Fase B — Reconciliador:** reporte de `id` duplicados (solo lectura).
3. **Fase C — Checkout:** cambiar radios y resolución a `cd` (arreglo del bug reportado).
4. **Fase D — Asentar pago manual e-com + POS:** opción `[value]=cd` + resolución por `cd` + POS guarda nombre.
5. **Fase E — E2E navegador** con datos de `id` repetido + verificación de que no hay regresión.

## 8. Plan de rollout
- Sin feature flag (corrección de bug + hardening). Reversible por rama.
- Rollback: revertir commits; no hay migración de datos (solo `id` de formas nuevas cambia de forma).

## 9. Riesgos técnicos
- **RT-01 (preselección POS en edición):** registros de pago viejos guardaban el `id` como `formaPago`; al
  pasar a guardar `nombre` y opciones por `cd`, editar un registro viejo podría no preseleccionar. Mitigación:
  matcher tolerante (cd || nombre || id) en `setValue`; es un flujo de edición marginal.
- **RT-02 (`id` string vs number):** al ser `id=docId` (string), verificar que ningún consumidor de formas de
  pago asuma `id` numérico. El campo es interno (confirmado); la selección ya no usa `id`.
- **RT-03 (valor por defecto checkout):** el control inicia en `'edo-ani'`; asegurar que `setValue(cd)` corre
  al cargar las formas para no dejar un valor inválido.

## 10. Open questions (técnicas) — RESUELTAS 2026-08-06 (D-061)
- [x] **OQ-1:** el contract test del auto-id se **agrega al `test:pagos-metodos` existente** (no se crea script
  nuevo). Se cubre la lógica pura del auto-id/duplicados dentro de esa suite.
