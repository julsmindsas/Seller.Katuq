# Tasks 015 — Amarrar la forma de pago con integración

> Estado: draft | in-review | **approved** | in-progress | done
> Vinculado a `plan.md` (**approved**, D-068).
> Última actualización: 2026-08-09
> Rama: `feature/pagos-metodos-unificados` (ambos repos). **Front + Back** (guardarraíl backend).
>
> **Progreso (2026-09-01):** ✅ T-01, T-02, T-04 · ✅ **T-03** (tests paridad front 19/19 + back 19/19) ·
> ✅ **T-05** (guardarraíl edit/editPos: 409 metodo_amarrado / integracion_amarrada, strip
> permitirInhabilitar, auditoría) · ✅ **T-06** (marcador deliberado en setDisponibilidad/inhabilitar) ·
> ✅ **T-07** (switches [disabled]+lock+tooltip, badge "Amarrado", select integración disabled+hint en modal) ·
> ✅ **T-08** (409 metodo_amarrado/integracion_amarrada → Swal claro, revierte el switch). ng serve OK.
> ⬜ Pendientes: **T-09** (E2E navegador, usuario) · **T-10** (cierre: OpenSpec + D-069 + .md clickup + commit).

## Convenciones
- `[P]` = paralelizable. `(deps: T-NN)` = dependencia.
- Amarre **derivado en lectura** (no se persiste). Marcador `permitirInhabilitar:true` = flag de **request**
  (se elimina del body antes del `.update`).
- Puras espejadas front (TS) / back (JS) con **la misma tabla de casos** (RT-03).
- Keywords pasarela = `['wompi','epayco','pasarela','tarjeta online']` (origen: `orders.js`, OQ-3).

---

### T-01 — Puras front: `esPasarelaPorNombre` + `evaluarAmarre` (deps: —) `[P]`
- **Input:** `shared/util/metodo-pago.util.ts`.
- **Output:**
  - `PASARELA_KEYWORDS` + `esPasarelaPorNombre(nombre: string): boolean` (case/acento-insensible razonable).
  - `AmarreInfo = { amarrado; motivo:'flag'|'pasarela'|null; bloqueaCanalOff; bloqueaQuitarFlag }`.
  - `evaluarAmarre(m:{nombre;integracion}, ctx:{hayPasarelaActiva:boolean}): AmarreInfo` según la regla del plan
    (pasarela → bloquea ambos; flag → bloquea canal-off, permite quitar flag; libre → nada).
- **Criterio de éxito:** los 3 estados y sus `bloquea*` salen correctos.
- **Archivos:** `metodo-pago.util.ts`.

### T-02 — Puras back: `services/pagosAmarre.js` (deps: —) `[P]`
- **Input:** nuevo `functions/services/pagosAmarre.js`.
- **Output:** `esPasarelaPorNombre` + `evaluarAmarre` en JS, **idénticas** a T-01 (misma lista, misma regla).
- **Criterio de éxito:** paridad total con T-01 (misma tabla de entradas/salidas).
- **Archivos:** `services/pagosAmarre.js`.

### T-03 — Tests de las puras (front + back) (deps: T-01, T-02) `[P]`
- **Output:**
  - Front: test autónomo ts-node (karma inoperante) de `esPasarelaPorNombre`/`evaluarAmarre`.
  - Back: `scripts/test-pagos-amarre.js` + npm `test:pagos-amarre` — **misma tabla de casos** que el front.
- **Criterio de éxito:** ambos verdes; los casos coinciden 1:1 (paridad).
- **Archivos:** `scripts/test-pagos-amarre.js`, `functions/package.json`, spec/script front.

### T-04 — Estado de pasarela: lectura front + resolución back (deps: —) `[P]`
- **Input:** `shared/services/ventas/metodos-pago.service.ts` (front); controlador backend (back).
- **Output:**
  - Front: `getEstadoPasarela(): Observable<{hayPasarelaActiva:boolean; provider?:string}>` **reutilizando**
    `GET /v1/integration/config` (o `/configurations`) vía servicio HTTP existente; deriva `hayPasarelaActiva` =
    hay provider de pago (`wompi`/`epayco`) con `status:'active'`. (OQ-2, sin endpoint nuevo.)
  - Back: helper `resolverHayPasarelaActiva(company)` que usa `PaymentGatewayService.getProviderInfo(company)`
    → `isConfigured === true` (fallback plataforma NO cuenta, R-01). Reutilizado por el guardarraíl (T-05).
- **Criterio de éxito:** front obtiene el booleano en 1 llamada; back lo resuelve sin contar el fallback.
- **Archivos:** `metodos-pago.service.ts`, `controllers/pagos.js` (helper interno).

### T-05 — Guardarraíl backend en `edit`/`editPos` (deps: T-02, T-04)
- **Input:** `functions/controllers/pagos.js` (`exports.edit`, `exports.editPos`).
- **Output:** antes del `.update`:
  1. Leer doc actual (`cd`) → `activoPrev`, `integracionPrev`, `nombre`.
  2. `hayPasarelaActiva = await resolverHayPasarelaActiva(company)`.
  3. `amarre = evaluarAmarre({nombre, integracion: integracionPrev}, {hayPasarelaActiva})`.
  4. **Canal-off:** si el body apaga (`activo`→false/'false') y `amarre.bloqueaCanalOff` y **no** viene
     `permitirInhabilitar` → `409 {error:'metodo_amarrado', motivo}`.
  5. **Quitar-flag:** si el body pone `integracion:'No'` y `amarre.bloqueaQuitarFlag` →
     `409 {error:'integracion_amarrada'}`.
  6. Borrar `permitirInhabilitar` del body; `.update` normal.
  7. Auditoría `PAYMENT_METHOD_LOCK_BLOCK` en cada 409 (via `handleLogger`, sin secretos).
- **Criterio de éxito:** apagar canal casual y Sí→No con pasarela activa dan 409; encender/posición/nombre/
  inhabilitar-deliberado pasan. `node --check` OK; reinicio :3300.
- **Archivos:** `controllers/pagos.js`.
- **Dependencias:** T-02, T-04.

### T-06 — Servicio front: marcador deliberado + manejo 409 (deps: T-04) `[P]`
- **Input:** `metodos-pago.service.ts`.
- **Output:** `inhabilitar`/`inhabilitarMetodo`/`rehabilitarMetodo` incluyen `permitirInhabilitar:true` en el
  payload del edit; el `setDisponibilidad(false)` del **toggle** NO lo incluye. (El manejo visual del 409 va en
  el componente, T-08.)
- **Criterio de éxito:** Inhabilitar pasa el guardarraíl; el toggle queda sujeto a él.
- **Archivos:** `metodos-pago.service.ts`.

### T-07 — UI pantalla: switches `[disabled]` + badges + modal (deps: T-01, T-04)
- **Input:** `components/extras/metodos-pago/metodos-pago.component.{ts,html}`.
- **Output:**
  - Al cargar: combinar `getMetodosUnificados()` + `getEstadoPasarela()`; calcular `amarre` por fila (guardarlo
    en la fila o en un mapa por `clave`).
  - Switch de canal **encendido** con `bloqueaCanalOff` → `[disabled]` + tooltip motivo. Encender nunca bloquea.
  - Columna Integración: badge "🔒 Amarrado — pasarela activa" / "🔒 Amarrado — integración (Sí)".
  - Modal editar: `select Integración` `[disabled]` cuando `bloqueaQuitarFlag` + nota de cómo liberar.
- **Criterio de éxito:** amarre visible y coherente por fila; controles bloqueados según motivo.
- **Archivos:** `metodos-pago.component.ts`, `.html` (+ scss badge).
- **Dependencias:** T-01, T-04.

### T-08 — UI: manejo de 409 por amarre (Swal) (deps: T-05, T-07)
- **Input:** `metodos-pago.component.ts` (`manejarError` y flujos de toggle/guardado).
- **Output:** mapear `409 metodo_amarrado` → "Método amarrado a una integración activa. Para bajarlo usa
  Inhabilitar."; `409 integracion_amarrada` → "No puedes quitar la integración: hay una pasarela activa
  vinculada." Sin romper la recarga; revertir el estado visual del switch si el backend rechazó.
- **Criterio de éxito:** un intento por carrera cae a Swal claro y el switch no queda inconsistente.
- **Archivos:** `metodos-pago.component.ts`.

### T-09 — E2E navegador (usuario) (deps: T-05..T-08)
- **Output (5 casos):**
  1. Método con **pasarela activa** (nombre con "Wompi" + empresa con config activa): switch canal
     **deshabilitado**, badge 🔒 "pasarela activa", `Integración` no editable; intento por API → 409.
  2. Método con `Integración=Sí` **sin** pasarela: switch deshabilitado, badge 🔒 "integración (Sí)"; pasar
     `Integración` a **No** en el modal → **liberado** → el switch ya se puede apagar.
  3. **Inhabilitar** un método amarrado (con confirmación) → baja (escape deliberado, D-067).
  4. **Encender** un canal apagado de un método amarrado → permitido.
  5. Cambios reflejados en checkout/POS **sin recargar** (caché invalidada). Recordar Ctrl+Shift+R.
- **Criterio de éxito:** los 5 casos PASS.

### T-10 — Cierre (deps: T-09)
- **Output:** propuesta **OpenSpec** backend `openspec/changes/payment-method-integration-lock/` + bitácora
  **D-069** en `CONTRACT.md` + **`.md` en carpeta `clickup`** con el nombre de la rama al inicio + commit con OK
  del usuario (ambos repos).
- **Criterio de éxito:** artefactos cerrados; push pendiente de OK.

---

## Orden de ejecución sugerido
1. **T-01**, **T-02**, **T-04** en paralelo → **T-03** (tests puras).
2. **T-05** (guardarraíl, tras T-02+T-04) y **T-06** en paralelo.
3. **T-07** (tras T-01+T-04) → **T-08** (tras T-05+T-07).
4. **T-09** (E2E usuario) cuando estén T-05..T-08. **T-10** al final.

## Definition of Done
- Puras `esPasarelaPorNombre`/`evaluarAmarre` con **paridad** front/back y tests verdes.
- Front: switches de canal encendidos bloqueados + badges de amarre + `Integración` no editable con pasarela
  activa; 409 manejado con Swal.
- Back: `edit`/`editPos` rechazan apagado casual (409 `metodo_amarrado`) y Sí→No con pasarela activa
  (409 `integracion_amarrada`); Inhabilitar deliberado pasa (marcador). Auditoría registrada.
- Sin cambios de esquema ni endpoints nuevos (estado de pasarela vía endpoint existente).
- E2E 5/5. `CONTRACT.md` (D-069) + `.md` ClickUp con nombre de rama + OpenSpec backend.
