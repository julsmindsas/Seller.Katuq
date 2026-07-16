# Tasks 023 — Fix búsqueda/creación de productos en catálogos grandes

> Estado: **approved**
> Vinculado a `plan.md` (approved 2026-07-14).
> Última actualización: 2026-07-14

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea debe ser shippable de forma independiente o bloquear de forma explícita.

## Tareas

### T-01 — Contract test: `getAll` no trunca búsqueda `[P]`
- **Input:** endpoint actual `GET /v1/productos/all` con `searchTerm`.
- **Output:** test que crea (o usa fixture de) un catálogo simulado >500 productos con un match "al final" del corte arbitrario actual, y falla contra el código de hoy (rojo intencional, confirma que reproduce el bug).
- **Criterio de éxito:** el test falla contra el código actual (Fase pre-fix) y debe pasar al cerrar T-04.
- **Archivos a tocar:** `functions/scripts/test-productos-getall-search.js` (o ubicación de tests existente del proyecto).
- **Dependencias:** ninguna.

### T-02 — Contract test: `create` — warnings + no-500 en fallo de embedding `[P]`
- **Input:** endpoint `POST /v1/productos/create`.
- **Output:** 3 casos: (a) referencia duplicada en OTRA empresa → debe permitirse tal cual, sin `warnings`; (b) referencia duplicada en la MISMA empresa → nueva referencia + `warnings[0].code===PRODUCT_REFERENCE_CHANGED`; (c) `embed()`/su `update()` posterior simulado en falla → debe responder 200 con el producto creado, nunca 500.
- **Criterio de éxito:** los 3 casos fallan contra el código actual (rojo intencional) y deben pasar al cerrar T-06/T-07.
- **Archivos a tocar:** script de test nuevo, mismo patrón que otros `test-*.js` del proyecto (ver `scripts/test-siigo-discount-mapping.js` como referencia de estilo).
- **Dependencias:** ninguna.

### T-03 — Ampliar field-mask de `getSearchIndex` (Fase A) (deps: T-01)
- **Input:** `getSearchIndex()` actual (`controllers/productos.js:39-104`), que ya trae 12 campos vía `.select(...)`.
- **Output:** field-mask ampliado con los campos que hoy solo se leen en memoria desde documentos completos: `precio.precioUnitarioConIva`, `disponibilidad.tiempoEntrega`, `exposicion.soloPos`, `integrations.shopify.id` (con fallback `integraciones.shopify.id`), `procesoComercial.aceptaAdiciones`, `procesoComercial.llevaCalendario`, `procesoComercial.permitePrecioManual`. Índice (`index.push({...})`) extendido con esos campos.
- **Criterio de éxito:** `node -c` OK; el índice cargado para una empresa de prueba incluye los campos nuevos con los valores correctos (verificado con log/console de prueba).
- **Archivos a tocar:** `controllers/productos.js` (función `getSearchIndex`).
- **Dependencias:** T-01 (test debe existir primero, aunque siga en rojo hasta T-04).

### T-04 — Reescribir rama `needsInMemory` de `getAll` (Fase B) (deps: T-03)
- **Input:** `exports.getAll` actual (`controllers/productos.js:633-803`), rama `else` con `needsInMemory`/`readLimit=500`.
- **Output:** la rama `needsInMemory` deja de hacer `baseQuery.limit(500).get()`; en su lugar: (1) resuelve candidatos vía `getSearchIndex(company)` completo (sin cap) aplicando ahí TODOS los filtros hoy in-memory (`searchTerm`, `categoria`, `subcategoria`, `exposicion`, `tipoEntrega`, `canal`, `aceptaAdiciones`, `aceptaCalendario`, `permitePrecioManual`); (2) pagina (`offset`/`pageSize`) sobre la lista de `cd` ya filtrada; (3) hidrata SOLO la página visible con documentos reales (`db.getAll(...)` por los docIds de esa página, o `where(FieldPath.documentId(),'in',chunk)` en lotes ≤10 si se prefiere mantener `Query` en vez de `getAll`). Log estructurado (`console.log`) cuando el catálogo recorrido por el índice supera ~2.000 productos (Art. VII observabilidad).
- **Criterio de éxito:** T-01 pasa en verde. Filtros nativos existentes (`estado`, `disponibilidad`, `tipoProducto`, precio, `ultimaEdicion`) sin regresión (test manual o script de regresión rápido contra una empresa de prueba).
- **Archivos a tocar:** `controllers/productos.js` (`exports.getAll`).
- **Dependencias:** T-03.

### T-05 — Auditoría de invalidación de cache en todos los writers (Fase C) (deps: T-04)
- **Input:** lista de paths de escritura sobre `products`: `create`, `edit`, `bulkPatch`, `delete`, `importPrecios`, `limpiarPrecios`, `updatePreciosTipoCliente`, `createMultiple`, sync Osmosis (`osmosisProductSyncService.js`), sync Shopify/WooCommerce, fulfillment import.
- **Output:** tabla de cobertura (cada writer → ¿llama `invalidateSearchIndex`/`invalidatePaginationCache`? sí/no) + fix de cualquier gap encontrado (agregar la llamada faltante).
- **Criterio de éxito:** 100% de los writers listados invalidan ambos caches; verificado leyendo cada archivo, sin asumir.
- **Archivos a tocar:** los que tengan gaps (a determinar durante la auditoría).
- **Dependencias:** T-04 (para no auditar sobre una implementación que todavía va a cambiar).

### T-06 — Fix scope `company` en referencia duplicada (Fase D) (deps: T-02) `[P]`
- **Input:** `create()` líneas 258-269 y `generarReferenciaUnica()` líneas 369-389 (`controllers/productos.js`).
- **Output:** ambas queries agregan `.where('company','==',company)`. `generarReferenciaUnica` recibe `company` como parámetro nuevo (thread desde `createMultiple`). Cuando se regenera una referencia, se agrega `warnings: [{code:'PRODUCT_REFERENCE_CHANGED', originalReference, assignedReference}]` a la respuesta de `create`.
- **Criterio de éxito:** T-02 casos (a) y (b) pasan en verde.
- **Archivos a tocar:** `controllers/productos.js` (`create`, `generarReferenciaUnica`, `createMultiple`).
- **Dependencias:** T-02.

### T-07 — Separar try/catch del embedding (Fase E) (deps: T-02) `[P]`
- **Input:** `create()` líneas 279-301, el `.update(updatePayload)` de línea 301 fuera del try/catch de `embed()`.
- **Output:** el `.update(updatePayload)` queda en su propio try/catch; si falla, se loguea warning (mismo patrón que el `catch` de `embed()` ya existente) y la función continúa — responde 200 con el producto creado (sin `embedding` si falló).
- **Criterio de éxito:** T-02 caso (c) pasa en verde.
- **Archivos a tocar:** `controllers/productos.js` (`exports.create`).
- **Dependencias:** T-02.

### T-08 — `warnings` de inventario pendiente (Fase F) (deps: T-02) `[P]`
- **Input:** `create()`, después de crear el producto exitosamente.
- **Output:** si `disponibilidad.inventariable !== false` (default truthy), consultar (lectura liviana, `count()` o `limit(1)`) si existe algún doc en `inventory` con `productoId == newProductRef.id` para la `company`; si no existe ninguno, agregar `warnings: [{code:'PRODUCT_INVENTORY_PENDING', message:'...'}]` a la respuesta.
- **Criterio de éxito:** creando un producto inventariable sin stock, la respuesta incluye el warning; creando uno con `inventariable:false`, no lo incluye.
- **Archivos a tocar:** `controllers/productos.js` (`exports.create`).
- **Dependencias:** T-02.

### T-09 — Frontend: confirmación no bloqueante para "Activar" (Fase G) `[P]`
- **Input:** `guardarProductos()` (`crear-productos.component.ts:1218-1340`).
- **Output:** antes de llamar a `this.service.createProduct(...)`, si `this.exposicion.value.activar !== true`, mostrar SweetAlert2 (patrón ya usado en el proyecto) explicando: "Este producto no será visible en el catálogo hasta que lo actives. ¿Deseas continuar de todas formas?" con botones "Continuar sin activar" / "Volver y activar". Si el usuario cancela, hace scroll al tab "Exposición" (mismo patrón que el scroll de referencia en línea 1257).
- **Criterio de éxito:** creando un producto sin marcar "Activar", aparece el diálogo; confirmando, se guarda igual (comportamiento no bloqueado); cancelando, vuelve al formulario sin guardar.
- **Archivos a tocar:** `crear-productos.component.ts`.
- **Dependencias:** ninguna (independiente del backend).

### T-10 — Testing de regresión + E2E real del caso reportado (deps: T-04, T-05, T-06, T-07, T-08)
- **Input:** todos los fixes anteriores desplegados en local/staging.
- **Output:** (1) contract tests T-01/T-02 en verde; (2) regresión manual de filtros existentes (`estado`, `disponibilidad`, `tipoProducto`, precio, `ultimaEdicion`) sin cambios de comportamiento; (3) verificación real (solo lectura + búsqueda, sin escritura nueva) contra OH MY STORE: buscar `EX-CLA-6028-ANESTY-30ML` en el listado de Productos y confirmar que aparece.
- **Criterio de éxito:** los 3 puntos anteriores en verde, documentados en `CONTRACT.md`.
- **Archivos a tocar:** ninguno (solo verificación).
- **Dependencias:** T-04, T-05, T-06, T-07, T-08.

### T-11 — Smoke-test canary + cierre (deps: T-10, T-09)
- **Input:** build backend + frontend con todos los fixes.
- **Output:** smoke-test manual dirigido contra OH MY STORE (mayor catálogo conocido, 8.368 productos) en un entorno seguro (local apuntando a prod en modo lectura, o staging) antes de dar la spec por cerrada. Confirmar con el usuario antes de cualquier commit/push/deploy real (ver `[[feedback_db_caution_zero_write]]`).
- **Criterio de éxito:** usuario confirma en navegador que la búsqueda del producto real funciona y que no hay regresiones visibles en el listado de Productos.
- **Archivos a tocar:** ninguno.
- **Dependencias:** T-10, T-09.

## Orden de ejecución sugerido
1. T-01 y T-02 en paralelo (`[P]`, test-first, Art. VIII).
2. T-03 al terminar T-01 → T-04 al terminar T-03 (cadena del fix central de búsqueda).
3. T-06, T-07, T-08 en paralelo entre sí al terminar T-02 (`[P]`, distintas secciones de `create()` — coordinar si se edita en la misma sesión para no pisarse).
4. T-09 en paralelo con todo lo anterior (`[P]`, frontend, sin dependencias de backend).
5. T-05 al terminar T-04 (audita la implementación ya reescrita).
6. T-10 al terminar T-04/T-05/T-06/T-07/T-08.
7. T-11 al terminar T-10 y T-09.

## Definition of Done
- Todos los contract tests (T-01, T-02) verdes.
- Verificación de constitución sin "no" pendientes (ya confirmado en `plan.md`).
- `CONTRACT.md` actualizado con el cierre de sesión y cualquier desvío encontrado durante T-05 (auditoría de invalidación).
- Caso real `EX-CLA-6028-ANESTY-30ML` verificado en navegador por el usuario (T-11).
- Commit **solo con autorización explícita del usuario** — sin push/deploy sin autorización aparte (patrón del proyecto).
