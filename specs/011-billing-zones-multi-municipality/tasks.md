# Tasks 011 — Zonas de cobro como paquete (revisión v2)

> Estado: draft | in-review | approved (v2) | in-progress | **done (implement + e2e; migración de prod a cargo de cada tienda)**
> Vinculado a `plan.md` (**approved v2**, ver D-052/D-053).
> Última actualización: 2026-08-06 (v2 — implement done, e2e 6/6 PASS, sellado D-053)
>
> **Progreso backend:** T-01 ✅ · T-02 ✅ (18/18) · T-03 ✅ · T-04 ✅ (unit 10/10) · T-05 ✅ dry-run OH MY STORE.
> **Datos prueba borrados:** 235 docs `prueba*` (2/3/5) eliminados de OH MY STORE (autorizado).
> **Progreso frontend:** T-06 ✅ (`zona-cobro.util.ts`) · T-07 ✅ (`MaestroService` paquete) · T-08 ✅ (lista: 1 fila/zona + detalle expandible con buscador) · T-09 ✅ (modal: crea/edita 1 zona-paquete, chips todos removibles, 409 manejado).
> **Build:** `tsc --noEmit` 0 errores + `ng serve` AOT `Compiled successfully`.
> T-10 ✅ envío por NOMBRE de zona: `pedidos.util.service` (5) + `pos-pedidos.util.service` (2) con `encontrarZonaPorNombre`.
> T-10b ✅ (hallado en e2e) **selector de zona** filtraba por `ciudad` raíz → ahora filtra por ciudad dentro de `municipios[]` vía nuevo `zonaCubreCiudad()`: `pedido-entrega`, `crear-ventas`, `clientes`.
> **T-12 e2e ✅ 6/6 PASS:** C1 (123 munic=1 doc) · C2 (editar valor, mismo doc) · C3 (agregar/quitar, 122 + Leticia multi-depto) · C4 (409 duplicado) · C5 (selector muestra zona + flete $35.000) · C6 (Zona Flash sin recargar).
> **Pendiente:** limpiar zonas de prueba E2E · T-13 (migración apply, requiere autorización — real está en OTRA empresa, no OH MY STORE) · T-11 unit (karma inoperante) · T-14 cierre (commits + sello).
>
> **⚠️ Supersede las tasks v1** (T-01..T-09, endpoint `create-batch` / alta N-docs). Lo implementado en v1 se
> reescribe hacia el modelo paquete; el multi-select de chips se reutiliza.

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de esa tarea.
- Repos: **BACK** = `katuq_admin_back_firebase/functions`, **FRONT** = `Seller.Katuq`. Rama `feature/zonas-de-cobro` en ambos.

## Tareas

### T-01 — Servicio puro `zonasCobroPackage.js` (test-first: lógica) `[P]`  · BACK
- **Input:** plan §3.1, §4, §5.
- **Output:** `functions/services/zonasCobroPackage.js` con funciones puras: `norm(s)`; `dedupeMunicipios(arr)` (por `codigoDane`, fallback `ciudad|departamento`); `validarZona({nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios})` (nombre no vacío, valor≥0, impuesto∈[0,100], municipios≥1); `calcularImpuestoTotal(valor, pct)` → `{impuesto, total}`; `normalizeZonaCobro(doc)` (envuelve legacy por-municipio como paquete de 1).
- **Criterio de éxito:** módulo sin dependencias de Firestore, `node --check` OK.
- **Dependencias:** ninguna.

### T-02 — Contract test forma paquete (test-first, rojo) `[P]`  · BACK
- **Input:** contrato §5 del plan.
- **Output:** `functions/scripts/test-zonascobro-package-contract.js` + npm `test:zonascobro-package`.
- **Criterio de éxito:** cubre (a) create paquete N municipios → 1 doc, `municipios.length===N`, impuesto/total server; (b) create nombre repetido → 409; (c) edit cambia valor + reemplaza municipios; (d) `/all` devuelve forma paquete y `normalizeZonaCobro` envuelve un doc legacy; (e) aislamiento multi-tenant; (f) 400 con payload inválido. Rojo hasta T-03 (o SKIP con guard emulador, patrón cotizaciones).
- **Dependencias:** ninguna (usa el contrato; el planificador puro de T-01 puede reusarse).

### T-03 — Endpoints `create`/`edit`/`all` forma paquete + quitar `create-batch` (verde) (deps: T-01, T-02)  · BACK
- **Output:** en `controllers/zonascobro.js`: `create` (doc único con `municipios[]`, unicidad de nombre en memoria → 409, whitelist, impuesto/total server), `edit` (actualiza valor/impuesto + reemplaza `municipios[]`, 409 si renombra a nombre de otra zona), `all` (aplica `normalizeZonaCobro`). Quitar `createBatch` del controller y la ruta `create-batch` de `routers/zonascobro.js`.
- **Criterio de éxito:** contract test T-02 verde. `node --check` OK + reinicio :3300. `delete` intacto. Sin residuos de `create-batch`.
- **Archivos:** `functions/controllers/zonascobro.js`, `functions/routers/zonascobro.js`.
- **Dependencias:** T-01, T-02.

### T-04 — Script de migración + unit del planificador (dry-run) (deps: T-01)  · BACK
- **Output:** `functions/scripts/migrate-zonacobro-to-package.js` (`--company`, `--apply` [default dry-run]) que agrupa docs por `company + nombreZonaCobro`, consolida municipios (dedupe), resuelve conflicto de valor por **moda → empate el mayor** y lo **reporta**, y en `--apply` escribe paquetes + elimina los legacy vía `writeBatch` (idempotente). Función planificadora pura testeable + npm `test:zonascobro-migrate` (agrupar, dedupe, detección de conflicto, idempotencia del plan).
- **Criterio de éxito:** dry-run imprime nº grupos / municipios / conflictos sin escribir; unit verde; reejecutar `--apply` en seco = 0 cambios.
- **Archivos:** `functions/scripts/migrate-zonacobro-to-package.js`, `functions/scripts/test-zonascobro-migrate.js`, `functions/package.json`.
- **Dependencias:** T-01.

### T-05 — Dry-run de migración en OH MY STORE + revisión (deps: T-03, T-04)  · BACK · CHECKPOINT
- **Output:** correr `migrate-zonacobro-to-package.js --company "OH MY STORE"` (dry-run) y compartir el reporte (grupos, conflictos de valor si los hay). **No aplica** todavía.
- **Criterio de éxito:** reporte revisado con el usuario; confirmar que la consolidación es correcta antes de la Fase G (T-13). Si hay conflictos, se listan para su visto bueno.
- **Dependencias:** T-03, T-04.

### T-06 — `normalizeZonaCobro` en frontend `[P]`  · FRONT
- **Output:** util `src/app/shared/util/zona-cobro.util.ts` (o equivalente) con `normalizeZonaCobro(doc)`: si trae `municipios[]` lo usa; si es legacy (`ciudad`), sintetiza `municipios:[{ciudad,codigoDane,departamento}]`.
- **Criterio de éxito:** `tsc --noEmit` OK; cubierto por unit en T-11.
- **Dependencias:** ninguna.

### T-07 — `MaestroService` forma paquete `[P]`  · FRONT
- **Output:** `createBillingZone`/`editBillingZone` envían `{nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[]}`; eliminar `createBillingZonesBatch` (ya no aplica).
- **Criterio de éxito:** métodos tipados; `tsc --noEmit` OK; sin referencias colgantes a `createBillingZonesBatch`.
- **Archivos:** `src/app/shared/services/maestros/maestro.service.ts`.
- **Dependencias:** ninguna.

### T-08 — Lista: una fila por zona + detalle expandible (deps: T-06, T-07)  · FRONT
- **Output:** `extras/zonas-cobro/zonas-cobro.component.{ts,html,scss}`: una fila por zona (nombre, valor, impuesto, total, **nº municipios**), fila expandible que muestra los municipios (con buscador dentro del detalle); acciones editar/borrar operan sobre la zona-paquete. Usa `normalizeZonaCobro` sobre `all`.
- **Criterio de éxito:** una zona = una fila; el detalle lista sus municipios; no hay N filas por zona; `tsc --noEmit` OK.
- **Archivos:** `src/app/components/extras/zonas-cobro/zonas-cobro.component.{ts,html,scss}`.
- **Dependencias:** T-06, T-07.

### T-09 — Modal: crear/editar UNA zona-paquete (deps: T-07)  · FRONT
- **Output:** `crear-zonas-cobro.component.{ts,html,scss}`: un solo formulario con nombre + valor + impuesto + **chips de municipios** (reutiliza el multi-select de v1: buscar+agregar con dedupe, "agregar todos del departamento", "seleccionar todos (N)" con confirmación en acciones masivas). `guardar()` → `createBillingZone`/`editBillingZone` con el array. Edición precarga **todos** los municipios (editables, sin "base no removible"). Invalida `sessionStorage['allBillingZone']` tras guardar. Quitar la lógica single/batch de v1.
- **Criterio de éxito:** crear/editar produce **un** registro con su lista; validaciones (valor≥0, impuesto 0–100, ≥1 municipio, nombre); mensaje claro si el backend responde 409 por nombre duplicado; `tsc --noEmit` OK.
- **Archivos:** `src/app/components/extras/zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component.{ts,html,scss}`.
- **Dependencias:** T-07.

### T-10 — Consumo de envío por nombre de zona (checkout + POS) (deps: T-06)  · FRONT
- **Output:** en `components/ventas/service/pedidos.util.service.ts` y `components/pos/pos-service/pos-pedidos.util.service.ts`: `getShippingCost`/`getShippingTaxCost` (y variantes `...Invoice`) emparejan por `nombreZonaCobro === pedido.envio.zonaCobro` (normalizado) → retornan `valorZonaCobro`/`impuesto` de la zona. Mantener la prioridad del `valorZonaCobro` ya persistido en el pedido. Aplicar `normalizeZonaCobro` a las zonas antes de emparejar.
- **Criterio de éxito:** el flete se resuelve por nombre de zona; pedidos con `valorZonaCobro` propio siguen intactos; `tsc --noEmit` OK.
- **Archivos:** los dos `*pedidos.util.service.ts`.
- **Dependencias:** T-06.

### T-11 — Unit tests frontend `[P]` (deps: T-08, T-09, T-10)  · FRONT
- **Output:** specs para `normalizeZonaCobro`, agrupación/detalle de la lista, add/remove de chips en el modal, lookup de envío por nombre de zona.
- **Criterio de éxito:** specs verdes (o documentar estado del harness karma, como en spec 010).
- **Dependencias:** T-08, T-09, T-10.

### T-12 — E2E local navegador (deps: T-03, T-08, T-09, T-10)  · FRONT+BACK
- **Output:** checklist verificado contra OH MY STORE (back :3300 + front :4200): (1) crear zona "todos los de un departamento" → **1 fila** con N municipios adentro; (2) editar el **valor** → aplica a la zona (1 update); (3) agregar/quitar municipios en edición → se refleja; (4) nombre duplicado → rechazado (409) con aviso; (5) en la venta elegir la zona por nombre → **flete correcto** (checkout y POS); (6) zona nueva disponible sin recargar (caché invalidada).
- **Criterio de éxito:** 0 discrepancias; verificación read-only en Firestore (`scripts/verify-zonascobro-readonly.js`).
- **Dependencias:** T-03, T-08, T-09, T-10.

### T-13 — Migración `--apply` en OH MY STORE (deps: T-05, T-12)  · BACK · REQUIERE AUTORIZACIÓN
- **Output:** con visto bueno del usuario, correr `migrate-zonacobro-to-package.js --company "OH MY STORE" --apply` + verificación read-only (zonas consolidadas, municipios preservados, 0 legacy remanentes).
- **Criterio de éxito:** los 257 (+ los de prueba) docs por-municipio quedan consolidados en paquetes sin pérdida de cobertura; reejecutar = 0 cambios.
- **Dependencias:** T-05, T-12.

### T-14 — Cierre (deps: T-01..T-13)  · FRONT+BACK
- **Output:** bitácora del módulo actualizada; `CONTRACT.md` con sello de cierre (D-0XX si aplica); commits sellados en `feature/zonas-de-cobro` (ambos repos) con confirmación del usuario.
- **Criterio de éxito:** DoD cumplido.
- **Dependencias:** todas.

## Orden de ejecución sugerido
1. **T-01, T-02** en paralelo (`[P]`, lógica pura + contract test rojo).
2. **T-03** al terminar T-01 y T-02 (endpoints verdes).
3. **T-04** al terminar T-01 (migración + unit); **T-06, T-07** en paralelo (front base).
4. **T-05** (dry-run + checkpoint) al terminar T-03 y T-04.
5. **T-08** (lista) y **T-09** (modal) al terminar T-06/T-07; **T-10** (envío) al terminar T-06.
6. **T-11** al terminar T-08/T-09/T-10.
7. **T-12** (e2e) al terminar T-03, T-08, T-09, T-10.
8. **T-13** (migración apply) al terminar T-05 y T-12, con autorización.
9. **T-14** cierre.

## Definition of Done (DoD)
- Contract test `test:zonascobro-package` verde + unit del migrador verde + build front del módulo OK.
- E2E local (T-12) PASS con 0 discrepancias resumen↔Firestore.
- Migración aplicada (T-13) con 0 legacy remanentes y sin pérdida de cobertura.
- CONTRACT.md sellado + bitácora del módulo + commits en ambos repos con autorización.
