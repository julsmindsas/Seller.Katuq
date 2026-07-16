# Spec 023 — Fix búsqueda/filtros de productos truncan resultados en catálogos grandes

> Estado: **approved** (checkpoint humano 2026-07-14: alcance ampliado confirmado, clarifications resueltas en conversación)
> Autor(es): Claude + usuario
> Última actualización: 2026-07-14

## 1. Contexto / Por qué
OH MY STORE reportó que un producto recién creado ("ELIXIR ANESTY 30ML...", ref `EX-CLA-6028-ANESTY-30ML`) "no aparecía" al buscarlo en el catálogo de Productos. Verificado en Firestore (solo lectura): **el producto existe, está activo, correctamente asociado a la empresa, sin duplicados**. La causa real está en `controllers/productos.js:exports.getAll` — cuando se busca por texto (`searchTerm`) o por `categoria`/`subcategoria`, el backend trae como máximo **500 documentos de Firestore sin `orderBy`** y **recién después** filtra en memoria por el término buscado. OH MY STORE tiene **8.368 productos** — si el producto buscado no cae dentro de esos primeros 500 (orden arbitrario de Firestore), la búsqueda da 0 resultados aunque el producto exista y coincida exactamente. Ver `findings.md` para la evidencia completa.

**Ampliación de alcance (decisión del usuario, 2026-07-14):** la misma investigación encontró 4 bugs más en el flujo de creación/listado de productos que, aunque no aplicaron a este caso puntual, pueden producir el mismo síntoma ("el producto no aparece") en otros casos. El usuario pidió resolver todos en la misma spec.

## 2. Objetivo de negocio
Cualquier comerciante puede crear un producto y encontrarlo siempre que exista, sin importar el tamaño de su catálogo ni el paso del formulario de creación en el que quedó — sin falsos negativos de búsqueda, sin campos que cambien de valor en silencio, y sin errores que hagan pensar que algo no se guardó cuando sí se guardó.

## 3. User stories
- Como comerciante con catálogo grande quiero buscar un producto por referencia o nombre y encontrarlo si existe, para gestionar mi catálogo sin dudar si el sistema perdió datos.
- Como equipo Katuq quiero que ninguna búsqueda de catálogo tenga un tope arbitrario silencioso, para no repetir este incidente en otro comercio con catálogo grande.
- Como comerciante quiero que un producto recién creado sea visible por defecto (o que el sistema me avise claramente si quedó oculto), para no perder tiempo pensando que el sistema falló.
- Como comerciante quiero que la referencia que yo escribo sea la que queda guardada (o que se me avise si cambió), para poder ubicar mis productos por su SKU real.
- Como comerciante quiero que si falla un paso secundario de la creación (ej. embedding de búsqueda semántica) el producto igual quede guardado y se me informe correctamente, para no perder confianza en el sistema.

## 4. Criterios de aceptación (notación EARS)

### 4.1 Búsqueda/filtros de catálogo (hallazgo original)
- WHEN un usuario busca productos por texto (`searchTerm`) THE system SHALL devolver todos los productos de la empresa que cumplan el criterio, sin importar el tamaño total del catálogo.
- WHEN un usuario filtra por `categoria` o `subcategoria` (filtros que hoy se resuelven en memoria) THE system SHALL aplicar la misma garantía de cobertura completa.
- IF una búsqueda requiere filtrado en memoria por falta de índice adecuado THEN THE system SHALL recorrer/consultar el catálogo completo de la empresa (vía cache o paginación interna), nunca una muestra arbitraria truncada.
- WHERE por razones de performance se aplique algún límite THE system SHALL comunicarlo explícitamente en la respuesta (`truncated: true` o equivalente) — nunca fallar en silencio.
- THE system SHALL mantener sin cambios los filtros que ya usan `where` nativo de Firestore (`estado`, `disponibilidad`, `tipoProducto`, rango de precio, `ultimaEdicion`) — ya son correctos y no truncan.
- THE system SHALL responder en un tiempo razonable (definir umbral en `plan.md`) para catálogos de al menos ~10.000 productos por empresa.

### 4.2 Visibilidad por defecto de un producto recién creado
- WHEN un usuario crea un producto sin marcar explícitamente el campo "Activar" THE system SHALL advertir de forma clara e inequívoca (antes de guardar) que el producto no será visible en el catálogo por defecto — nunca guardar en silencio con este campo indefinido/omitido.
- THE system SHALL validar realmente el campo "Activar" en el submit del formulario (hoy `Validators.required` no bloquea `false`) o, alternativamente, decidir explícitamente su default junto con el usuario.

### 4.3 Referencia/SKU no cambia en silencio
- WHEN se crea un producto con una referencia que ya existe en OTRA empresa (no la del usuario) THE system SHALL permitirla tal cual (la unicidad de referencia es por empresa, no global) — la validación de duplicados SHALL estar scoped por `company`.
- IF por alguna razón el sistema debe generar una referencia distinta a la ingresada THEN THE system SHALL informarlo explícitamente al usuario en la respuesta, nunca cambiarla en silencio.

### 4.4 Falla de paso secundario no debe reportar error del guardado completo
- IF un paso no crítico posterior a guardar el producto (ej. generación de embedding para búsqueda semántica) falla THEN THE system SHALL responder éxito con el producto creado y un aviso claro de qué sub-paso falló, nunca un error 500 genérico que sugiera que nada se guardó.

### 4.5 Inventario inicial de un producto nuevo
- WHEN se crea un producto marcado como `inventariable` THE system SHALL dejar explícito (en el formulario o en la respuesta) que necesita carga de stock antes de ser visible en catálogos filtrados por bodega — evitando que el comerciante concluya erróneamente que el producto "no existe".

## 5. Requisitos no funcionales

### 5.1 Performance
- Búsqueda por texto en catálogo de ~8.000-10.000 productos: latencia aceptable a definir en plan (hoy no hay índice de texto en Firestore; ya existe un `searchIndexCache` en memoria por company en el mismo archivo, `controllers/productos.js:32-104`, usado hoy solo por `quickSearch`).

### 5.2 Seguridad
- Sin cambios: toda query sigue filtrando por `company` (multi-tenant intacto).

### 5.3 Observabilidad
- Loguear cuando una búsqueda recorre un catálogo grande (ej. > 2.000 docs), para detectar cuellos de botella futuros antes de que se conviertan en incidentes.

### 5.4 Accesibilidad
- N/A (sin cambios de UI).

### 5.5 Resiliencia
- El fix no debe romper ningún filtro que hoy funciona correctamente (los nativos de Firestore).
- Si se reusa `searchIndexCache`, debe quedar invalidado correctamente en creates/updates/deletes (ya existe `invalidateSearchIndex(company)`, verificar cobertura completa en plan).

## 6. Out of scope (explícito)
- No se agrega motor de búsqueda de texto completo externo (Algolia/Elastic) — se resuelve con lo que ya existe en el proyecto (`searchIndexCache`).
- No se toca `categoriasIndex` (spec 020) — ya funciona correctamente vía `array-contains-any`.
- No se rediseña el formulario de creación de productos más allá de lo necesario para 4.2/4.3/4.4/4.5 (sin refactor visual/UX general del formulario).
- No se implementa carga de stock inicial automática en la creación (4.5 solo exige comunicarlo claramente, no resolver el flujo de inventario completo — eso ya lo cubre el módulo de Inventario existente).
- No se cambia la política de unicidad de referencia en sí (sigue siendo única por empresa) — solo se corrige el scope de la validación (4.3).

## 7. Dependencias
- [[019-venta-asistida-catalogo-performance]] y [[020-indice-categoria-venta-asistida]] — mismo archivo (`productosPaginated.js`/`productos.js`), mismo patrón de cache ya establecido.

## 8. [NEEDS CLARIFICATION]
- [x] Mecanismo de fix de búsqueda: reusar `searchIndexCache` (ya construido, ya usado por `quickSearch`, ya probado con 8.368 productos, field-mask liviano + cache 5min) también para `getAll`. **Resuelto 2026-07-14** — confirmado que no compromete el objetivo de carga rápida (es más liviano que el `.limit(500)` actual de documentos completos).
- [x] El mismo fix aplica a `categoria`/`subcategoria`/`exposicion`/`tipoEntrega`/etc. (línea 688 del archivo, mismo cap de 500). **Resuelto 2026-07-14.**
- [x] Alcance ampliado a los 4 hallazgos secundarios (4.2-4.5). **Resuelto 2026-07-14** — decisión explícita del usuario ("resolver todo lo posible").

## 9. Riesgos identificados
- R-01: `searchIndexCache` tiene su propio TTL/invalidación (`invalidateSearchIndex`) — verificar en plan que cubra TODOS los paths de escritura (create, edit, bulkPatch, delete, sync Osmosis/Shopify/Woo) antes de confiar en él para el listado general; si algún sync externo no invalida, el listado podría mostrar datos con hasta 5 min de desfase.
- R-02: cambiar la validación de "Activar" (4.2) a bloqueante podría romper flujos existentes (ej. `createMultiple`/KAI bulk, que hoy no setea este campo explícitamente) — revisar en plan todos los callers antes de bloquear.
- R-03: acotar la validación de referencia duplicada a `company` (4.3) es más permisivo que hoy (antes bloqueaba cross-tenant) — confirmar que no hay ningún caso de negocio real que dependiera de unicidad global (no debería haberlo; referencia/SKU es un concepto por comercio).

## 10. Métricas de éxito post-launch
- 0 falsos negativos de búsqueda en OH MY STORE (8.368 productos) y al menos 2 empresas grandes más, incluyendo el caso real `EX-CLA-6028-ANESTY-30ML`.
- Tiempo de respuesta de búsqueda por texto dentro del umbral definido en plan, medido contra el catálogo más grande de producción.
- 0 productos creados con referencia distinta a la ingresada sin aviso explícito.
- 0 respuestas 500 al crear un producto cuando el producto sí quedó guardado.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
