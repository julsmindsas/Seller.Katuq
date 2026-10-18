## Escritura: categorías, productos y existencias

Complemento de `design.md` (decisión 4). Lo que aquí se describe toca módulos sensibles: cada parte va en su propio diff aprobado (tareas 3.1, 6.1 y 6.2).

### Lo que se leyó en el código

- **Categorías** (`controllers/onboarding.js:2948-3119`): el bloque «PASO PREVIO» de `importProducts` lee `categorias`, responde 409 si el árbol es ilegible, resuelve las rutas con `categoriaTreeHelper` y guarda.
- **`katuq-product-upsert`:**
  - La búsqueda (`_findExisting`, `limit(1)`) y la creación (`doc().set()`) no van en una transacción (líneas 206-212 y 317-320).
  - Cuando el canónico no los trae, `_buildPayload` (240-266) completa `date_add`, `fecha`, `fechaCreacion` y `user_add`, y pone `user_edit: 'flow-engine'`.
  - **Siempre** escribe `exposicion`. Con `merge`, un mapa vacío reemplaza el campo entero (`@google-cloud/firestore`, `document.js:621`).
- **`importInventory`** hace un conteo absoluto (`planInventoryImportRow`): repetirlo después de una venta devuelve la bodega a la cantidad del archivo y deja un ajuste.

### 1. Categorías en tres partes

Van en `services/catalogImport/categoryAssignment.js`:

| Función | Tipo | Qué hace |
|---|---|---|
| `leerArbol(db, companyId)` | Lectura | Devuelve `{ docId, tree, corrupto }` |
| `resolverCategorias(products, tree)` | Pura | Devuelve `{ rutaPorKey, creadas }` y modifica el árbol que recibe |
| `guardarArbol(db, { docId, companyId, tree, actor })` | Escritura | Guarda, solo si hay `creadas` |

¿Quién llama a cada una?

- **`importProducts`:** las tres, en el mismo orden de hoy. Conserva su 409 y sus mensajes, y lo prueba el dorado.
- **La simulación:** `leerArbol` y `resolverCategorias`, sobre una copia del árbol, para contar `categories.new` sin escribir.
- **El lote `products`:** las tres.

Solo `guardarArbol` escribe en `categorias`. Se coordina con D-495 (tarea 0.6).

### 2. Productos

Se escriben con el `execute` de `katuq-product-upsert`, sin modificarlo.

- **Candado por empresa (Artículo IV):** antes de un lote de `products` o de `customers` se toma, en una transacción, un documento de `integration_idempotency` cuyo id sale de la empresa.
  - Si el documento existe y no ha vencido, la ruta responde 409 `IMPORT_IN_PROGRESS`.
  - Vence a los 10 minutos y se suelta en un `finally`.
  - Así, dos pestañas o un reintento después de un 504 no crean duplicados.
- **Lote repetido:** el registro de `migration_audit` de cada lote tiene un id determinista: empresa, `migrationId`, paso y lote. Si ese lote ya terminó, se devuelve el resultado guardado sin escribir nada.
- **Búsqueda:** se traen **todas** las coincidencias de la referencia en la empresa, con consultas `in` de a 30.
  - **0 coincidencias:** se crea con `matchBy: 'cd'` y sin `cd`. Así el upsert siempre crea y nunca fusiona con lo que otro proceso haya creado un instante antes.
  - **1 coincidencia, modo `create`:** se omite. Si su `metadata.migration.handle` coincide, se devuelve su `cd` para las redirecciones.
  - **1 coincidencia, modo `upsert`:** se manda su `cd`, así la búsqueda va por id.
  - **2 o más:** se omite como «referencia ambigua».
- **Actualización acotada (modo `upsert`):**
  - **Lo que escribe el canónico:** `crearProducto.titulo` y `crearProducto.descripcion`; la galería, solo si llega al menos una foto válida; `precio`, con las guardas de D-069; `variantes[]` y `metadata.migration`.
  - **Lo que copia del documento existente para que no cambie:** `exposicion` (si no se copia, `_buildPayload` la borra), `date_add`, `fecha`, `fechaCreacion` y `user_add`.
  - **Lo que no toca:** `marketplace`, `ciudades`, `disponibilidad`, `categorias`, `categoriasIndex` ni `procesoComercial`. Las variables nativas las agrega el upsert solo si faltan (D-214).
  - **`variantes[]`:** cada variante conserva la `cantidad` de la variante existente con la misma referencia, salvo con `replaceExistingStock: true`. Una variante nueva trae la del archivo.
- **Autor:** `user_edit` (y `user_add` al crear) es el actor de la sesión, `actorDe(req)`, igual que en `importProducts`. Nunca queda `flow-engine`.
- **Avisos:** el logger que recibe el upsert junta los avisos en la respuesta del lote, sin `console.log`.

**Precio sin IVA.** El servidor reimplementa la fórmula del modal (`import-modal.component.ts:2734`, método privado):

- `sinIva = round2(conIva / (1 + iva/100))`
- `valorIva = round2(conIva − sinIva)`

Una tabla de casos con los valores que da el modal en el navegador (enteros, decimales, IVA 0, 5 y 19) fija que los dos cálculos coinciden (tarea 1.7). No se extrae la fórmula del modal, porque eso tocaría el importador de Excel.

### 3. Existencias

El handler `importInventory` se llama en proceso con la misma sesión. La empresa sale de `requireJwtTenant`. Recibe `{ inventory, defaultBodega: options.warehouse }` y su respuesta se captura. El módulo sensible queda sin diff y sus contract tests intactos.

- **Quién recibe existencias:**
  - Los productos **creados en ese lote**.
  - En modo `upsert`, los existentes, solo con `replaceExistingStock: true`.
  - Los omitidos no reciben nada, ni siquiera los ya migrados que devuelven su `cd`. Como el conteo es absoluto, repetir un lote después de una venta desharía la venta.
- **Cantidad:** la suma por producto. Las negativas cuentan 0 y van al reporte. En `variantes[].cantidad` queda la foto inicial (pregunta 2).
- **Si el conteo falla:** el reporte marca `INVENTORY_FAILED` con la referencia. Esas existencias se cargan con el importador de existencias que ya existe: reimportar en modo `create` omitiría el producto.
- **Orden de los diffs:** primero el controlador de productos sin existencias (6.1, aprobado y aplicado). Después la llamada a `importInventory` (6.2). Nunca los dos juntos.

### Write-set y contract tests

| Colección | Quién escribe | Prueba que lo vigila |
|---|---|---|
| `products` | Solo `katuq-product-upsert` | `importStoreProducts.writeSet`. No escribe `preciosPorTipoCliente`, listas, `integrations.*` ni flows. En `upsert` conserva fechas, `user_add`, `exposicion`, `marketplace`, `ciudades`, `disponibilidad` y `_precioManualOverride`. En `create` no toca lo existente |
| `categorias` | Solo `guardarArbol` | Dorado de categorías y dorado de `importProducts` |
| `inventory`, `inventoryMovement` | Solo `importInventory`, sin diff | Los contract tests actuales. Además, ningún archivo de `services/storeMigration` nombra esas colecciones, y los omitidos no generan movimiento |
| `sites` | Solo `draft.redirecciones`, en transacción | `importStoreRedirects` |
| `clients`, `email_subscribers` | Lote y reversa de clientes (1b) | `importStoreCustomers.writeSet` |
| `migration_audit` | Todas las rutas | Sin datos personales |
| `integration_idempotency` | Candado | Se suelta en `finally`; un candado vencido se puede volver a tomar |

Otras pruebas: `importStore.routes`, `importStoreDryRun.noWrites`, `importStoreGuard` e `importStoreConcurrency`.

**Nunca** se escriben Shopify, WooCommerce, Osmosis, `InventoryLevel`, precios por cliente, listas de precios, flows ni pedidos. La guarda de flows (`design.md`, decisión 6) impide que las existencias cargadas lleguen al `InventoryLevel` de la tienda anterior.
