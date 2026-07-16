# Plan 023 — Fix búsqueda/creación de productos en catálogos grandes

> Estado: **draft**
> Vinculado a `spec.md` (approved 2026-07-14).
> Última actualización: 2026-07-14

## 1. Resumen técnico
El fix central (4.1) reemplaza el `.limit(500)` sin `orderBy` de `productos.js:getAll` por el `searchIndexCache` ya existente (field-mask liviano, cache 5min, invalidado en writes) ampliado con los campos que hoy solo se leen en la rama in-memory (precio, tiempoEntrega, canal, adiciones, calendario, precio manual). Los candidatos se resuelven sobre el índice completo (sin cap), se pagina sobre esa lista, y **solo la página visible** se hidrata con el documento real (`getAll()` batch por docIds). Los 4 fixes restantes (4.2-4.5) son cambios puntuales y acotados en `create()` y en el formulario de creación — sin nueva infraestructura.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | `spec.md` approved antes de este plan. |
| II — Spec captura intent | sí | Sin librerías/frameworks nombrados en spec.md. |
| IV — Idempotencia | N/A | Sin integraciones externas nuevas. La creación de producto sigue sin ser idempotente por diseño (no es un webhook reintentable) — fuera de alcance. |
| V — Eventos crudos antes de procesar | N/A | No hay webhook involucrado. |
| VI — UI no acoplada a proveedor | sí | Sin lógica `if (provider===...)` nueva. |
| VII — Observabilidad | sí | Se agrega log cuando el índice de búsqueda recorre catálogos grandes (Fase B) + `warnings[]` explícito en vez de fallas silenciosas (Fases D/E/F). |
| VIII — Test-first contratos | sí | Contract test de `getAll` (no-truncamiento) y de `create` (warnings/referencia) antes de tocar el código de producción (Fase H, pero se escriben junto con cada fase, no al final). |
| IX — Estilo Angular | parcial | El único cambio de frontend (Fase G, confirmación SweetAlert2 antes de guardar) es acotado dentro de `crear-productos.component.ts`, un componente NgModule existente — no se hace refactor arquitectónico a standalone/signals (fuera de alcance de un bug-fix). |
| X — Seguridad webhooks | N/A | No aplica. |
| XI — Datos sensibles fuera del log | sí | Los logs nuevos (Fase B) solo incluyen `company` y conteos, nunca datos de producto/cliente. |

Ningún "no" — sin enmienda requerida.

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Backend**: `controllers/productos.js` (`getAll`, `create`, `generarReferenciaUnica`, `getSearchIndex`/`searchIndexCache`).
- **Frontend**: `crear-productos.component.ts` (confirmación antes de guardar), `productos.component.ts` (consumo de `warnings`/`truncated` si se decide mostrarlos — ver 3.3).
- **Almacenamiento**: Firestore, colección `products` (sin cambios de esquema, solo de campos de respuesta HTTP).
- **Cola/eventos**: ninguno.

### 3.2 Diagrama (flujo de `getAll` con `searchTerm`/filtros in-memory)
```
Request (searchTerm o categoria/subcategoria/exposicion/tipoEntrega/canal/...)
  → getSearchIndex(company)          [cache 5min, field-mask ampliado, TODO el catálogo]
  → aplicar TODOS los filtros in-memory sobre el índice completo (sin cap)
  → paginar (offset, pageSize) sobre la lista de candidatos ya filtrada
  → hidratar SOLO la página visible con documentos reales (getAll() por docId, batches ≤300)
  → responder { products, pagination, truncated: false }
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Reusar/ampliar `searchIndexCache` en vez de recorrer Firestore en cada búsqueda | §4.1 | (a) subir el `.limit()` a un número más alto — sigue siendo un tope arbitrario, solo pospone el bug; (b) motor de búsqueda externo (Algolia/Elastic) — over-engineering para este bug, fuera de alcance por spec §6 |
| Ampliar el field-mask del índice (no crear un segundo cache) | §4.1 | Cache separado por tipo de filtro — más complejidad de invalidación sin beneficio real |
| Hidratar solo la página visible (no todo el resultado filtrado) | NFR 5.1 (performance) | Hidratar todos los candidatos — desperdicia lecturas de Firestore si hay 3.000 candidatos y el usuario ve 20 |
| `warnings[]` aditivo en la respuesta de `create` (4.3/4.5) en vez de bloquear la creación | §4.3, §4.5 | Bloquear el guardado — cambia comportamiento existente y podría romper flujos automatizados (KAI bulk, imports) que no pueden "confirmar" un diálogo |
| Confirmación SweetAlert2 en frontend para 4.2 (no bloqueo duro de backend) | §4.2 | Backend fuerza `activar:true` por default — decisión de negocio que no nos corresponde tomar unilateralmente; podría haber comercios que sí quieren crear productos inactivos a propósito (ej. pre-carga de catálogo antes de lanzar) |
| `.where('company','==',company)` en la validación de referencia duplicada (4.3) | §4.3 | Mantener global — ya se identificó como bug (Art. XV-adyacente: scoping multi-tenant), sin caso de negocio que dependa de unicidad cross-tenant |

## 4. Modelo de datos
Sin cambios de esquema en Firestore. Cambios aditivos en payloads de respuesta HTTP únicamente (ver §5).

## 5. Contratos (API/eventos)

### `GET /v1/productos/all` (existente, sin cambio de firma de request)
Respuesta — agrega campo aditivo:
```json
{
  "products": [...],
  "pagination": { "...": "sin cambios" },
  "truncated": false
}
```
- `truncated` (nuevo, opcional, default `false`): `true` solo si por alguna razón excepcional no se pudo recorrer el catálogo completo (ej. falla al cargar el índice) — nunca se omite en silencio (§4.1).

### `POST /v1/productos/create` (existente, sin cambio de firma de request)
Respuesta — agrega campo aditivo `warnings` (mismo patrón ya usado en el proyecto para SIIGO, ver D-045):
```json
{
  "...producto...": "sin cambios",
  "warnings": [
    { "code": "PRODUCT_REFERENCE_CHANGED", "originalReference": "X", "assignedReference": "Y" },
    { "code": "PRODUCT_INVENTORY_PENDING", "message": "Producto inventariable sin stock cargado — no aparecerá en catálogos filtrados por bodega hasta cargar inventario." }
  ]
}
```
- Ambos códigos son opcionales y solo aparecen cuando aplican. Un frontend que no los lea sigue funcionando igual que hoy (compatibilidad hacia atrás).

### 5.1 Idempotencia
N/A — sin cambios en la naturaleza de las operaciones (siguen sin ser reintentables/idempotentes, igual que hoy).

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | Búsqueda/creación exitosa (con o sin `warnings`) | `{ products/producto, ...}` |
| 500 | Falla real de Firestore (conexión, permisos) | `{ error }` — **ya NO** se dispara por una falla no-crítica de embedding (Fase E) |

## 6. Estrategia de testing
- **Contract tests primero** (Fase H, pero escritos junto a cada fase que tocan):
  - `getAll` con `searchTerm`: catálogo simulado >500 productos (o contra empresa de prueba real grande), confirmar que un producto "al final" del catálogo SÍ aparece.
  - `create`: caso de referencia duplicada cross-company (debe permitirse, sin cambio de referencia) vs. same-company (debe seguir generando una nueva + `warnings[0].code===PRODUCT_REFERENCE_CHANGED`).
  - `create`: falla simulada de `embed()` y de su `update()` posterior → debe responder 200 con el producto creado, no 500.
- **Integration**: contra Firestore Emulator o cuenta de prueba, no producción.
- **E2E real (solo lectura + 1 escritura de prueba controlada, con autorización del usuario):** reproducir el caso `EX-CLA-6028-ANESTY-30ML` — confirmar que con el fix, buscar esa referencia en OH MY STORE (8.368 productos) sí la encuentra.
- **Unit**: normalización de texto (`normalizarTexto`), matching de filtros sobre el índice ampliado.

## 7. Fases de implementación
1. **Fase A** — Ampliar field-mask de `getSearchIndex`/`searchIndexCache` con los campos que hoy solo se leen en memoria desde documentos completos: `precio.precioUnitarioConIva`, `disponibilidad.tiempoEntrega`, `exposicion.soloPos`, `integrations.shopify.id` (o legacy `integraciones.shopify.id`), `procesoComercial.aceptaAdiciones`, `procesoComercial.llevaCalendario`, `procesoComercial.permitePrecioManual`. Sin cambiar el contrato de invalidación existente.
2. **Fase B** — Reescribir la rama `needsInMemory` de `getAll`: resolver candidatos desde el índice completo (sin `.limit(500)`), aplicar TODOS los filtros in-memory ahí, paginar sobre el resultado ya filtrado, hidratar solo la página visible con `db.getAll()` batch. Log estructurado cuando el catálogo recorrido supera un umbral (ej. 2.000 productos).
3. **Fase C** — Auditoría de cobertura de `invalidateSearchIndex`/`invalidatePaginationCache`: confirmar que TODOS los paths de escritura la disparan (create, edit, bulkPatch, delete, importPrecios, limpiarPrecios, updatePreciosTipoCliente, sync Osmosis/Shopify/Woo/fulfillment). Cerrar cualquier gap encontrado (Riesgo R-01 de spec.md).
4. **Fase D** — Fix 4.3: agregar `.where('company','==',company)` a la validación de referencia duplicada en `create()` y threading de `company` a `generarReferenciaUnica` (usado por `createMultiple`). Exponer `warnings[].code=PRODUCT_REFERENCE_CHANGED` cuando aplique.
5. **Fase E** — Fix 4.4: separar el `try/catch` del `update()` de embedding del de `embed()` — una falla en cualquiera de los dos pasos no-críticos debe responder 200 con el producto creado.
6. **Fase F** — Fix 4.5: agregar `warnings[].code=PRODUCT_INVENTORY_PENDING` en la respuesta de `create` cuando `disponibilidad.inventariable !== false` y no exista ningún doc en `inventory` para ese `productoId`.
7. **Fase G** — Fix 4.2 (frontend): en `guardarProductos()`, si `exposicion.activar !== true`, mostrar confirmación SweetAlert2 explicando la consecuencia ("no será visible en el catálogo hasta que lo actives") con opción de cancelar (ir a activarlo) o continuar. No se bloquea el guardado — es una decisión informada del usuario.
8. **Fase H** — Testing de regresión completo (contract + integration + E2E real acotado) + verificación del caso real reportado.
9. **Fase I** — Rollout (ver §8).

## 8. Plan de rollout
- **Sin feature flag** — son fixes de bug que hacen el sistema estrictamente más correcto (nunca menos), sin cambio de contrato para consumidores existentes (todos los campos nuevos son aditivos/opcionales). Introducir un flag agregaría complejidad sin beneficio real dado el bajo riesgo de regresión (Art. XII: evitar flags que no aporten).
- **Canary manual**: desplegar y hacer smoke-test dirigido contra OH MY STORE (el caso real, mayor catálogo conocido) antes de considerar la spec cerrada.
- **Rollback**: revert de commit único (todos los cambios son aditivos y acotados a `productos.js` + `crear-productos.component.ts`) — sin necesidad de backfill ni migración de datos.

## 9. Riesgos técnicos
- Ver R-01/R-02/R-03 en `spec.md` §9 (cobertura de invalidación de cache, validación de "Activar" no bloqueante para bulk/KAI, permisividad cross-tenant de referencia).
- **Nuevo:** ampliar el field-mask del índice aumenta levemente el tamaño en memoria por empresa — aceptable dado que ya se cachea el catálogo completo hoy (mismo orden de magnitud, más campos livianos tipo string/boolean/number, no arrays de imágenes).

## 10. Open questions (técnicas)
- Ninguna abierta — las 2 de producto ya se resolvieron en `spec.md` §8. Si durante la Fase C (auditoría de invalidación) aparece algún path de escritura sin cubrir, se resuelve ahí mismo (no bloquea el resto de fases).
