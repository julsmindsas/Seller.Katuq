# Plan 011 — Zonas de cobro como paquete (revisión v2)

> Estado: draft | in-review | **approved (v2)** | superseded
> Vinculado a `spec.md` (**approved v2**, ver D-051).
> Última actualización: 2026-08-05 (v2 — modelo paquete; aprobado en checkpoint, ver D-052)
>
> **⚠️ Supersede el plan v1** (endpoint `create-batch` que creaba N documentos, ver D-050). El multi-select de
> municipios con chips de v1 se **reutiliza**; cambia el modelo de almacenamiento, el consumo de envío y se
> agrega una migración de datos.

## 1. Resumen técnico
Una zona de cobro pasa a ser **un solo documento** en `zonacobro` con la lista de municipios embebida. El modal
`crear-zonas-cobro` (Angular 14, `extras/zonas-cobro`) crea/edita **una** zona con su valor único y su array de
municipios (chips reutilizados de v1). La lista `zonas-cobro` muestra **una fila por zona** (nombre, valor, nº de
municipios) con detalle expandible. Los endpoints `create`/`edit`/`all` cambian a la forma paquete; se
**elimina** `create-batch`. El consumo de envío en checkout (`pedidos.util.service`) y POS
(`pos-pedidos.util.service`) pasa a emparejar por **nombre de zona** (no `(ciudad + nombre)`). Un **script de
migración** consolida los documentos por-municipio existentes en paquetes (dry-run obligatorio antes de aplicar).
Un **normalizador** hace que los lectores toleren docs viejos (por-municipio) y nuevos (paquete) durante la
transición.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 011 v2 approved (D-051). |
| II — Spec captura intent | sí | la spec no nombra tecnología; el detalle técnico está aquí. |
| IV — Idempotencia | sí | create rechaza nombre duplicado (409); edit actualiza en sitio; migración agrupa por nombre y es reejecutable sin duplicar. |
| V — Eventos crudos antes de procesar | n/a | no hay webhooks. |
| VI — UI no acoplada a proveedor | sí | sin lógica por proveedor. |
| VII — Observabilidad | sí | endpoints devuelven resultado; el script de migración emite reporte estructurado (grupos, conflictos, dry-run vs apply); sin `console.log` de telemetría. |
| VIII — Test-first contratos | sí | contract test de `create`/`edit`/`all` (forma paquete) + test del planificador de migración ANTES de implementar. |
| IX — Estilo Angular | **parcial** | módulo Angular 14 legacy (NgModule + reactive forms + `*ngIf`). Se sigue el patrón por consistencia; desviación documentada (igual que v1). |
| X — Seguridad webhooks | n/a | sin webhooks. |
| XI — Datos sensibles fuera del log | sí | solo nombres de zona/municipios/conteos, sin PII. |
| XIV — Contrato vivo | sí | D-051 + SC-011-02 registrados. |
| **Regla proyecto — backfill con `--dry-run`** | sí | la migración corre **dry-run por defecto**; `--apply` explícito y con autorización del usuario (CLAUDE.md backend + Art. de datos). |

Ninguna desviación requiere enmienda (IX parcial por módulo legacy, ya documentado).

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend** (`Seller.Katuq`):
  - `extras/zonas-cobro/crear-zonas-cobro/*` — modal: crea/edita **una** zona con valor único + array de municipios (chips reutilizados de v1). Se quita la lógica de "single vs batch" y de "municipio base no removible".
  - `extras/zonas-cobro/zonas-cobro.component.*` — lista: **una fila por zona** + detalle expandible con sus municipios (buscador dentro del detalle si son muchos).
  - `shared/services/maestros/maestro.service.ts` — `createBillingZone`/`editBillingZone` cambian a la forma paquete; se elimina `createBillingZonesBatch`.
  - `components/ventas/service/pedidos.util.service.ts` — `getShippingCost`/`getShippingTaxCost` emparejan por `nombreZonaCobro`.
  - `components/pos/pos-service/pos-pedidos.util.service.ts` — mismas variantes para POS.
  - `shared/util/` (nuevo) — `normalizeZonaCobro(doc)`: si el doc trae `municipios[]` lo usa; si es legacy (`ciudad`), sintetiza `municipios:[{ciudad,codigoDane,departamento}]`. Usado por lista y lookup para tolerar ambos formatos durante la migración.
  - Invalidación de `sessionStorage['allBillingZone']` tras crear/editar (ya existe de v1).
- **Backend** (`katuq_admin_back_firebase/functions`):
  - `controllers/zonascobro.js` — `create` (doc único con `municipios[]` + unicidad de nombre), `edit` (actualiza valor/impuesto/municipios), `all` (devuelve paquetes). Se **elimina** `createBatch`.
  - `routers/zonascobro.js` — se quita la ruta `create-batch`.
  - `services/zonasCobroPackage.js` (nuevo, lógica pura) — validación/normalización/cálculo impuesto+total, dedupe de municipios por `codigoDane` (fallback `ciudad|departamento`).
  - `scripts/migrate-zonacobro-to-package.js` (nuevo) — agrupa por `company + nombreZonaCobro`, consolida municipios, resuelve/valida conflictos de valor, **dry-run por defecto**.
- **Almacenamiento**: Firestore `zonacobro` — **cambio de esquema** (ver §4).

### 3.2 Flujo (texto)
```
Modal crear/editar zona:
  usuario ingresa nombre + valor + impuesto + arma lista de municipios (buscar+chip | agregar-todos-depto | seleccionar-todos)
    └─ Guardar
         ├─ crear → POST /v1/zonascobro/create { nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[] }
         │         └─ 409 si el nombre ya existe en la empresa
         └─ editar → PUT /v1/zonascobro/edit { cd, nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[] }
    └─ UI: 1 registro creado/actualizado + invalidar sessionStorage['allBillingZone']

Lista de zonas:
  GET /v1/zonascobro/all → [ { cd, nombreZonaCobro, valorZonaCobro, impuesto, total, municipios[] } ]
    └─ render: 1 fila por zona (nombre, valor, nº municipios) + expandir → municipios

Venta (checkout / POS):
  vendedor elige la zona por nombre → getShippingCost(allBillingZone) empareja por nombreZonaCobro
    └─ retorna zona.valorZonaCobro (e impuesto)

Migración (una vez):
  node scripts/migrate-zonacobro-to-package.js [--company X] [--apply]
    ├─ agrupa docs legacy por (company, nombreZonaCobro) → paquete { municipios[] }
    ├─ conflicto de valor (mismo nombre, distinto valor) → reporta; regla de consolidación (§9 RT-01)
    └─ dry-run: reporte; --apply: escribe paquetes + borra/inactiva los legacy (writeBatch, idempotente)
```

### 3.3 Decisiones técnicas (trazabilidad a requisito)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| 1 doc por zona con `municipios[]` embebido | §4 "una zona = un registro" + NFR 5.1 (1 escritura) | subcolección `municipios` (más lecturas, no aporta; las listas son acotadas). |
| Nombre de zona **único por empresa** (identidad) | §4 unicidad de nombre | permitir nombres repetidos (rompe la identidad del paquete y el lookup de envío). |
| Consumo de envío por **nombre de zona** | §4 "el vendedor elige por nombre" | seguir por `(ciudad+nombre)` (ya no hay doc por ciudad); auto-deducir por ciudad (fuera de alcance). |
| `normalizeZonaCobro` tolerante (legacy + paquete) | NFR 5.5 resiliencia | migración big-bang sin compat (ventana de inconsistencia si algo lee mientras migra). |
| Migración con **dry-run** + agrupar por nombre | §4 migración + regla de proyecto | backfill directo `--apply` sin verificación (prohibido). |
| Eliminar `create-batch` (no deprecar) | simplicidad; era local, sin prod | mantenerlo (código muerto que crea el modelo viejo). |

## 4. Modelo de datos (CAMBIO DE ESQUEMA)

**Antes (v1, por-municipio):**
```jsonc
{ ciudad, codigoDane, departamento, nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, impuesto, total, company, date_add, user_add }
```
**Ahora (v2, paquete):**
```jsonc
{
  nombreZonaCobro: "FLOTA UNIADES GRANDES",   // identidad, único por company
  valorZonaCobro: 39000,
  impuestoZonaCobro: 0,                         // porcentaje
  impuesto: 0,                                  // = valor × %/100 (server)
  total: 39000,                                 // = valor + impuesto (server)
  municipios: [                                 // 1..N, sin duplicar por codigoDane
    { ciudad: "Cali", codigoDane: "76001", departamento: "Valle del Cauca" }
  ],
  company: "OH MY STORE",
  activo: true,
  date_add, user_add, date_edit?, user_edit?
}
```
- Se **quitan** del nivel raíz `ciudad`/`codigoDane`/`departamento` (pasan a `municipios[]`). Una zona puede
  abarcar varios departamentos (ej. "seleccionar todos").
- Whitelist de campos en create/edit (no persistir `req.body` completo — el defecto del `create` legacy no se
  propaga).
- Órdenes históricas guardan su propio `envio.valorZonaCobro`/`zonaCobro` → **no se ven afectadas** por el
  cambio (el lookup por nombre sigue resolviendo para pedidos nuevos).

## 5. Contratos (API)

### `POST /v1/zonascobro/create`  (auth; headers `company`, `email`)
Request: `{ nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios:[{ciudad, codigoDane, departamento}] }`
Respuestas: `201 {cd, ...zona}` · `409 {error:"nombre de zona ya existe"}` · `400 {error}` (municipios vacío, valor<0, impuesto∉[0,100], nombre vacío) · `401/403` middleware.

### `PUT /v1/zonascobro/edit`  (auth)
Request: `{ cd, nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[] }`
- Actualiza valor/impuesto (aplica a toda la zona) y reemplaza la lista de municipios por la enviada.
- `409` si se renombra a un nombre que ya usa **otra** zona de la empresa. `200 {ok}`.

### `GET /v1/zonascobro/all`  (auth)
Response: `[ { cd, nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, impuesto, total, municipios[] } ]`.
Aplica `normalizeZonaCobro` para envolver docs legacy aún no migrados como paquetes de 1 municipio.

### `DELETE /v1/zonascobro/delete`  — sin cambios (borra el doc de zona completo).

### Lookup de envío (frontend, no HTTP)
`getShippingCost(allBillingZone)`: empareja `item.nombreZonaCobro === pedido.envio.zonaCobro` (normalizado
trim+lower) → retorna `item.valorZonaCobro`. `getShippingTaxCost` análogo → `item.impuesto`. La ciudad del
pedido queda como dato informativo (validación opcional de pertenencia, no bloqueante).

### Migración `scripts/migrate-zonacobro-to-package.js`
`--company <name>` (default todas) · `--apply` (default dry-run). Salida: nº grupos, municipios por grupo,
conflictos de valor, docs a escribir/borrar. Idempotente (reejecutar tras `--apply` = 0 cambios).

## 6. Estrategia de testing (test-first, Art. VIII)
- **Contract test backend** `functions/scripts/test-zonascobro-package-contract.js`: (a) create paquete N
  municipios → 1 doc, `municipios.length===N`, impuesto/total server-calculados; (b) create nombre repetido →
  409; (c) edit cambia valor + municipios; (d) `/all` devuelve forma paquete y normaliza un doc legacy; (e)
  aislamiento multi-tenant; (f) validación 400.
- **Unit del planificador de migración** (lógica pura `zonasCobroPackage`/migrador): agrupar por nombre,
  dedupe de municipios, detección de conflicto de valor, idempotencia del plan.
- **Unit frontend**: agrupación de la lista, add/remove de municipios en el modal, `normalizeZonaCobro`, lookup
  por nombre de zona.
- **E2E local (OH MY STORE)**: crear zona "todos los de un departamento" → **1 fila** con N municipios adentro;
  editar el valor → aplica a la zona; en la venta elegir la zona → flete correcto; correr migración en dry-run y
  revisar el reporte antes de aplicar.

## 7. Fases de implementación
1. **Fase A — Backend modelo + endpoints (test-first):** contract test (red) → `services/zonasCobroPackage.js`
   (validación/normalización/cálculo/dedupe) → `create`/`edit`/`all` forma paquete + unicidad de nombre → quitar
   `create-batch` de controller/router (green). `node --check` + reiniciar :3300.
2. **Fase B — Migración (dry-run primero):** `scripts/migrate-zonacobro-to-package.js` + unit del planificador →
   correr **dry-run** contra OH MY STORE → revisar grupos/conflictos con el usuario. (Aplicar en Fase G.)
3. **Fase C — Frontend lista:** `zonas-cobro.component` a una fila por zona + detalle expandible de municipios.
4. **Fase D — Frontend modal:** `crear-zonas-cobro` crea/edita **una** zona (valor único + chips de municipios,
   reutilizando el multi-select de v1); quitar lógica single/batch y base-no-removible.
5. **Fase E — Consumo de envío:** `pedidos.util.service` + `pos-pedidos.util.service` emparejan por nombre de
   zona; `normalizeZonaCobro` en los lectores; verificar invalidación de caché.
6. **Fase F — Tests + verificación:** unit + build (`ng build` del módulo) + e2e local en navegador.
7. **Fase G — Migración apply + cierre:** con autorización del usuario, `--apply` en OH MY STORE + verificación
   read-only; bitácora del módulo + CONTRACT.md (sello) + commits sellados en `feature/zonas-de-cobro` (ambos
   repos).

## 8. Plan de rollout
- **Orden seguro:** primero backend + normalizador tolerante (lee legacy y paquete) → frontend → **al final** la
  migración de datos. Así nada se rompe si se corre por partes.
- Sin feature flag (el normalizador cubre la transición). Rollback = revertir commits; los docs legacy siguen
  legibles vía `normalizeZonaCobro` aunque no se haya migrado.
- Migración: dry-run → revisión → `--apply` off-hours o primero en un tenant de prueba si el usuario lo prefiere.

## 9. Riesgos técnicos
- **RT-01 (conflicto de valor en migración) — RESUELTO (usuario, 2026-08-05):** gana el **valor de la mayoría**
  de los municipios del grupo (moda); empate → el **mayor**; SIEMPRE reportado en el dry-run para revisión humana
  antes de `--apply`.
- **RT-02 (pedidos con zona sin nombre):** si algún pedido trae `envio.ciudad` pero no `zonaCobro`, el lookup por
  nombre no resuelve. Mitigación: mantener el `valorZonaCobro` ya persistido en el pedido como prioridad (el
  código actual ya lo hace) + fallback informativo por ciudad dentro de `municipios[]`.
- **RT-03 (tamaño del doc):** una zona "todos los del país" embebe ~1078 municipios (~cientos de KB). Bajo el
  límite de 1 MiB de Firestore, pero se valida en el contract test con el peor caso.
- **RT-04 (unicidad sin índice):** la unicidad de nombre se valida en memoria contra las zonas de la empresa
  (pocas). Sin índice compuesto nuevo.

## 10. Open questions (técnicas)
- [x] **RT-01 — consolidación de valor en migración:** RESUELTO (usuario) → moda de los municipios; empate → el
  mayor; siempre reportado en dry-run.
- [x] **Detalle de la lista con muchos municipios:** RESUELTO (default) → expandir + buscador dentro del detalle;
  paginar solo si molesta en uso real.
- [ ] Backend usa OpenSpec (`/openspec/`): registrar en `CONTRACT.md` (canon compartido) y espejar en
  `openspec/changes/` solo si el equipo backend lo pide (igual que v1).
