# Findings — Spec 023

> Datos reales verificados vía script read-only contra Firestore de producción (`julsmind-katuq`). Sin escrituras.

## Caso real reportado por el usuario

Producto: **ELIXIR ANESTY 30ML LUBRICANTE ÍNTIMO ANAL DESENSIBILIZANTE**, ref `EX-CLA-6028-ANESTY-30ML`, empresa **OH MY STORE**.

Script: `functions/scripts/check-producto-elixir-anesty.js` (read-only, queda en el repo como diagnóstico reusable, sin escrituras).

Resultado — **el producto EXISTE, único, correctamente formado**:

```
docId: AAgaZpjrdODZl8MiDHyU
company: OH MY STORE
titulo: ELIXIR ANESTY 30ML LUBRICANTE ÍNTIMO ANAL DESENSIBILIZANTE
identificacion.referencia: EX-CLA-6028-ANESTY-30ML
exposicion.activar: true
disponibilidad.inventariable: false
date_edit: 2026-07-09T01:05:31.733Z
user_edit: director@ohmystore.shop
```

- Búsqueda por `identificacion.referencia == EX-CLA-6028-ANESTY-30ML` SIN filtro de company: **1 resultado** (no hay colisión cross-tenant en este caso puntual).
- Búsqueda por `company == OH MY STORE` + misma referencia: **1 resultado**, mismo doc.
- Scan completo de OH MY STORE (**8.368 productos**) buscando "ANESTY" en título/referencia: **1 match**, mismo doc.

**Conclusión: no hay pérdida de datos ni duplicado. El producto está activo y bien formado. El problema es 100% del lado de la búsqueda/listado.**

## Causa raíz — `controllers/productos.js:exports.getAll` (líneas 633-803)

```js
// líneas 687-690
const needsInMemory = searchTerm || categoria || subcategoria || exposicion || tipoEntrega ||
                      tiempoEntrega || canal || aceptaAdiciones || aceptaCalendario || permitePrecioManual;
const readLimit = needsInMemory ? 500 : offset + pageSize;
...
// línea 696
const queryPromises = needsInMemory
  ? [baseQuery.limit(readLimit).get()]   // <-- SIN orderBy, tope de 500 SIEMPRE
  : [baseQuery.count().get(), baseQuery.limit(readLimit).get()];
...
// líneas 706-714
if (searchTerm) {
  const term = searchTerm.toLowerCase();
  filtered = filtered.filter(p =>
    p.crearProducto?.titulo?.toLowerCase().includes(term) ||
    p.identificacion?.referencia?.toLowerCase().includes(term) ||
    p.identificacion?.marca?.toLowerCase().includes(term)
  );
}
```

Cuando el usuario busca por texto (o filtra por `categoria`/`subcategoria`/`exposicion`/`tipoEntrega`/`tiempoEntrega`/`canal`/`aceptaAdiciones`/`aceptaCalendario`/`permitePrecioManual` — TODOS estos disparan `needsInMemory`), el backend:

1. Trae **como máximo 500 documentos** de la colección `products` de esa empresa (`baseQuery.limit(500).get()`), **sin ningún `orderBy`** — el orden es el que Firestore decida internamente, no garantizado ni relacionado con relevancia.
2. **Recién después** filtra esos 500 en memoria por el texto buscado.

Con **8.368 productos** en OH MY STORE, cualquier búsqueda de texto tiene una probabilidad alta de que el documento buscado no esté entre esos 500 — la búsqueda devuelve **0 resultados sin ningún aviso**, aunque el producto exista y coincida exactamente. Esto **no depende de si el producto está activo/inactivo, ni de cuándo se creó** — depende únicamente de si Firestore lo incluyó en el corte arbitrario de 500.

Este comportamiento **no es exclusivo de OH MY STORE**: cualquier empresa con más de ~500 productos activos puede sufrir el mismo falso negativo al buscar.

## Mecanismo ya existente que sí cubre el catálogo completo

`controllers/productos.js:32-104` — `searchIndexCache`: `Map<company, {data, loadedAt}>` que carga **todo** el catálogo de la empresa una vez y lo cachea en memoria, invalidado por `invalidateSearchIndex(company)` (llamado en `create`, `edit`, `bulkPatch`, `limpiarPrecios`, `importPrecios`, etc. — verificar cobertura completa en plan). Hoy **solo lo usa `quickSearch`** (`exports.quickSearch`, línea 2299), no `getAll`. Es el candidato natural para resolver este bug sin rediseñar el endpoint.

## Hallazgos secundarios de la misma investigación (AHORA en scope — el usuario pidió resolver todo lo posible, 2026-07-14)

1. **Checkbox "Activar" nace en `false` sin bloqueo real** — `crear-productos.component.ts:402` (`activar: [false, [Validators.required]]`). `Validators.required` de Angular **no invalida `false`** (solo `null`/`undefined`), así que el formulario nunca bloquea el guardado aunque el checkbox quede sin marcar. Combinado con el filtro por defecto `estado: 'activo'` del listado (`productos.component.ts:62`) y el post-filtro de la búsqueda rápida (`productos.component.ts:571-575`), un producto creado sin marcar "Activar" queda invisible en la vista por defecto — **no aplicó en este caso** (el producto SÍ tiene `activar:true`), pero es un bug real y afectará a otros productos/empresas.
2. **Validación de referencia duplicada sin scope de `company`** — `productos.js:258-262` (`create`) y `369-389` (`generarReferenciaUnica`, usado por `createMultiple`). Consulta `identificacion.referencia` global (todas las empresas). Si otro tenant ya usa esa referencia, el producto se guarda con una referencia **distinta a la ingresada, sin avisar**. No aplicó en este caso puntual (la referencia es única globalmente), pero es una fuga de comportamiento cross-tenant real.
3. **Update de embedding fuera del `try/catch`** — `productos.js:301`. Si ese segundo `.update()` falla, el backend responde 500 aunque el producto **ya se creó** en el `.add()` de la línea 272 — el usuario puede pensar que no se guardó.
4. **Producto inventariable sin registro inicial en `inventory`** — el endpoint `create` nunca escribe en la colección `inventory`. Si el producto se crea con `disponibilidad.inventariable: true` (default del form, línea 320 de `crear-productos.component.ts`) y nadie carga stock, queda invisible en venta asistida filtrada por bodega (`productosPaginated.js:967-974`). No aplicó en este caso (el producto tiene `inventariable: false`).
