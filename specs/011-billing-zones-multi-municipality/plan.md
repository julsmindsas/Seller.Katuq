# Plan 011 — Alta múltiple de zonas de cobro por municipio

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, ver D-049).
> Última actualización: 2026-07-30 (aprobado en checkpoint — ver D-050)

## 1. Resumen técnico
El modal `crear-zonas-cobro` (Angular 14, `extras/zonas-cobro`) gana una selección múltiple de municipios (lista de chips removibles) alimentada por `DaneCodesService`. Al guardar con >1 municipio (o desde una acción masiva) el frontend llama a un **nuevo endpoint backend `POST /v1/zonascobro/create-batch`** que crea una zona por municipio con el mismo nombre/valor/impuesto, **valida duplicados de forma autoritativa** (mismo municipio + mismo nombre, por empresa) omitiéndolos, y devuelve un **resumen** (creadas / omitidas / fallidas). En edición se precarga el municipio original (no removible) y los añadidos se crean vía el mismo batch. Tras el alta se invalida la caché local `allBillingZone`. El esquema NO cambia (1 zona = 1 municipio).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 011 approved (D-049). |
| II — Spec captura intent | sí | la spec no nombra tecnología; el detalle técnico está aquí. |
| IV — Idempotencia | sí | el dup-check (empresa+municipio+nombre) hace que reintentar el batch no duplique. |
| V — Eventos crudos antes de procesar | n/a | no hay webhooks. |
| VI — UI no acoplada a proveedor | sí | no hay lógica por proveedor. |
| VII — Observabilidad | sí | el endpoint responde el resumen creadas/omitidas/fallidas; log estructurado del resultado, sin `console.log` de telemetría (regla backend). |
| VIII — Test-first contratos | sí | contract test del `create-batch` ANTES de implementarlo. |
| IX — Estilo Angular | **parcial** | el módulo es preexistente (Angular 14, NgModule + reactive forms + `*ngIf`). Se sigue el patrón del módulo por consistencia y para no reescribirlo; Art. IX (signals/standalone/`@if`) aplica a código nuevo greenfield. Desviación documentada aquí. |
| X — Seguridad webhooks | n/a | sin webhooks. |
| XI — Datos sensibles fuera del log | sí | no se loguea PII; solo conteos/municipios. |

Ninguna desviación requiere enmienda: IX es "parcial" por trabajar sobre un módulo legacy (se documenta, no se enmienda la constitución).

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend** (`Seller.Katuq`): `extras/zonas-cobro/crear-zonas-cobro/*` (modal), `shared/services/maestros/maestro.service.ts` (nuevo método batch), `shared/services/dane-codes.service.ts` (posible método "todos los municipios"), invalidación de `sessionStorage['allBillingZone']`.
- **Backend** (`katuq_admin_back_firebase/functions`): `controllers/zonascobro.js` (nuevo `createBatch`), `routers/zonascobro.js` (nueva ruta), colección `zonacobro` (sin cambios de esquema).
- **Almacenamiento**: Firestore `zonacobro`. Escrituras por lote (`writeBatch`, máx 500/chunk → ~1122 = 3 chunks).

### 3.2 Flujo (texto)
```
Modal: usuario arma lista de municipios (buscar+chip | agregar-todos-depto | seleccionar-todos)
  └─ Guardar
       ├─ 1 municipio  → create (endpoint actual, sin cambios)
       └─ >1 municipio → confirmación si vino de acción masiva → maestro.createBillingZonesBatch(payload)
             └─ POST /v1/zonascobro/create-batch  { nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, municipios[] }
                   ├─ carga zonas de la empresa → Set(`ciudadNorm||nombreNorm`)
                   ├─ por municipio: dup? → omitidas[] ; else writeBatch.set(...) + Set.add
                   └─ respuesta { creadas, omitidas[], fallidas[] }
       └─ UI: resumen (conteos + ver detalle) + invalidar sessionStorage['allBillingZone']
Edición: precarga municipio original (chip fijo) + añadidos → editBillingZone(base) + create-batch(añadidos)
```

### 3.3 Decisiones técnicas (trazabilidad a requisito)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Endpoint `create-batch` en backend | §4 creación en lote + NFR 5.1 (no N interacciones) | loop frontend N×`/create` (frágil, ~1122 requests) — descartado por el usuario (D-050). |
| Dup-check autoritativo server-side | §4 "omitir duplicados" + NFR 5.5 idempotencia | solo frontend contra lista cargada (falla con caché stale/concurrencia) — descartado (D-050). |
| Dup-key normalizada (trim + lower) `ciudad||nombreZonaCobro` | §4 omitir duplicados | match exacto (arrastra el gap case-sensitive); normalizar solo dentro de este flujo, sin tocar el lookup del checkout (out of scope). |
| Cargar zonas de la empresa en memoria para el dup-check | NFR 5.1 sin índices nuevos | query compuesta `company==+nombre==` (requeriría índice); las zonas por empresa son pocas (decenas/cientos). |
| `writeBatch` por chunks de 500 | NFR 5.1 lote grande | escrituras sueltas en loop (lento, no atómico por chunk). |
| No feature flag | riesgo bajo (mejora UI aditiva) | flag (añade obligación Art. XII de retiro sin beneficio claro); rollback = git revert. |

## 4. Modelo de datos
Sin cambios. Cada doc `zonacobro` sigue: `{ ciudad, codigoDane?, departamento?, nombreZonaCobro, valorZonaCobro, impuestoZonaCobro, impuesto, total, company, date_add, user_add, date_edit?, user_edit? }`. El batch escribe **solo estos campos** (whitelist) — corrige de paso que el `create` actual persiste `req.body` completo sin filtrar (se replica el whitelist en el batch; el `create` legacy no se toca en esta spec).

## 5. Contratos (API)

### `POST /v1/zonascobro/create-batch`  (auth requerida; headers `company`, `email`)
Request:
```jsonc
{
  "nombreZonaCobro": "Domicilio Zona 1",
  "valorZonaCobro": 8000,
  "impuestoZonaCobro": 19,            // porcentaje
  "municipios": [                      // 1..N
    { "ciudad": "Medellín", "codigoDane": "05001", "departamento": "Antioquia" }
  ]
}
```
Response 200:
```jsonc
{
  "creadas": 40,
  "omitidas": [ { "ciudad": "Medellín", "codigoDane": "05001", "motivo": "duplicado" } ],
  "fallidas": [ { "ciudad": "…", "error": "…" } ]
}
```
El backend calcula `impuesto = valor × (impuestoZonaCobro/100)` y `total = valor + impuesto` por zona (misma fórmula que el modal actual, líneas 143-144). No confía en `impuesto/total` del cliente.

### 5.1 Idempotencia
- Clave lógica: `company + ciudadNorm + nombreZonaCobroNorm`.
- Comportamiento ante duplicado: **omitir** (no crea, no sobrescribe) y listar en `omitidas`. Reintentar el batch completo es seguro.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | proceso completado (aunque haya omitidas/fallidas) | `{creadas, omitidas[], fallidas[]}` |
| 400 | payload inválido (sin municipios, valor<0, impuesto∉[0,100], nombre vacío) | `{error}` |
| 401/403 | sin auth / sin company | (middleware existente) |

## 6. Estrategia de testing
- **Contract test (primero, Art. VIII)** `functions/scripts/test-zonascobro-batch-contract.js`: (a) crea N municipios → `creadas=N`; (b) reejecutar → todas en `omitidas` (idempotencia); (c) municipio con zona de mismo nombre preexistente → omitida; (d) aislamiento: no crea en otra empresa; (e) validación 400.
- **Unit (frontend)**: dedupe al agregar chips, "agregar todos del departamento" sin duplicar, mapeo del resumen.
- **E2E (local navegador contra OH MY STORE)**: agregar todos los municipios de un departamento → confirmar → verificar conteo creadas + omitidas + que aparecen sin recargar (caché invalidada). Editar una zona y agregar 1 municipio → se crea el añadido, la base se actualiza.

## 7. Fases de implementación
1. **Fase A — Backend batch (test-first):** contract test (red) → `createBatch` en `controllers/zonascobro.js` (dup-check en memoria + whitelist + `writeBatch` por chunks + validación) → ruta en `routers/zonascobro.js` (green). `node --check` + reiniciar :3300.
2. **Fase B — Servicios frontend:** `maestro.service.ts.createBillingZonesBatch()`; en `dane-codes.service.ts`, método "todos los municipios" si no existe (para "seleccionar todos (N)").
3. **Fase C — UI multi-select:** chips removibles reemplazan el textbox Ciudad; buscar+agregar (dedupe), botón "agregar todos los del departamento", checkbox/botón "seleccionar todos (N)"; confirmación con conteo en acciones masivas.
4. **Fase D — Guardar/editar + resumen + caché:** `guardar()` decide single vs batch; edición con municipio base fijo + añadidos; UI de resumen (conteos + ver detalle); invalidar `sessionStorage['allBillingZone']`.
5. **Fase E — Tests + verificación:** unit + e2e local; validar build (`ng build` del módulo).
6. **Fase F — Cierre:** bitácora del módulo + CONTRACT.md (sello) + commits sellados en `feature/zonas-de-cobro` (ambos repos), con confirmación del usuario.

## 8. Plan de rollout
- Sin feature flag (mejora aditiva de UI + endpoint nuevo no invasivo). Rollback = revertir los commits de la rama.
- El endpoint `create-batch` es aditivo; `create/edit/delete` actuales quedan intactos.

## 9. Riesgos técnicos
- **RT-01:** ~1122 escrituras → mitigado con `writeBatch` (chunks 500) + confirmación con conteo. Vigilar límite de tamaño de request (payload de 1122 municipios ~ decenas de KB, aceptable).
- **RT-02:** dup-check en memoria asume pocas zonas por empresa; si una empresa tuviera miles, cargar todo sería costoso. Mitigación: aceptable para el volumen actual; si crece, paginar/consultar por nombre.
- **RT-03:** `DaneCodesService` podría no exponer "todos los municipios" → Fase B lo añade sobre `colombia-dane-codes`.
- **RT-04:** el `create` legacy persiste `req.body` completo (sin whitelist); el batch NO replica ese defecto (whitelist explícito). No se corrige el `create` legacy aquí (fuera de alcance) pero se evita propagarlo.

## 10. Open questions (técnicas)
- [ ] ¿`DaneCodesService` ya tiene un método para "todos los municipios" (~1122)? Verificar en Fase B; si no, agregarlo leyendo `colombia-dane-codes`.
- [ ] Backend usa OpenSpec (`/openspec/`): ¿se requiere además un change en `openspec/changes/` para el endpoint, o basta el registro en `CONTRACT.md` (canon compartido)? Propuesta: registrar en CONTRACT.md (D-050) como canon; opcional espejar en OpenSpec si el equipo backend lo pide.
