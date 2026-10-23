> **Estado:** DISEÑO, **pendiente de aprobación**. Tickets 1357 y 1358 (ALMARA FELICIDAD). Decisión **D-548**. La propuesta y las specs las aprobó Daniel el 2026-10-23 con las respuestas recomendadas. **La F0 está hecha** (Seller `27c3fc4a`, backend `9d2fa325`). Este documento diseña en detalle la **F1**; la F2 queda diseñada a nivel de puntos de escritura y reglas, y la F3 y la F4 en esbozo. Solo documento: sin código.

## Context

Verificado en el código el 23-oct, sin leer ni escribir producción. Backend en `backend-aws-security` (`9ab9074d`); front en `feature/venta-asistida-mejorada`.

- **El historial de hoy.** `GET /v1/productos/historial/:productoId` (`controllers/productos.js:2930-2955`, ruta `routers/productos.js:733`, solo `auth`):
  - filtra por `company == req.headers.company` (la cabecera, no el token) y `productoId`, ordena por `fecha` desc y trae 50;
  - índice compuesto `company, productoId, fecha` (snapshot de índices del 2026-04-25).
- **El único escritor de `productHistory`** son las fotos uniformes (D-501): `services/productPhotos/batchStore.js:193` y `:276`, con id automático y `{ company, productoId, campo, valorAnterior, valorNuevo, usuario, batchId, fotos, fecha, timestamp }`. El front solo lee (`shared/services/maestros/maestro.service.ts:635`).
- **`productCostHistory`** guarda costo antes y después (`controllers/productCosts.js:348-363, 478-492`; `services/purchasing/purchaseCostCapture.js:133-151`). El usuario sale de la cabecera `email`. No se ve en la ficha.
- **`date_edit` es el cursor del flow `katuq-product-changed`** (`services/flows/nodes/internal/katuq-product-changed.trigger.js:147-176, 247`): consulta `date_edit >= cursor` como texto. Este cambio no toca cuándo ni cómo se escribe.
- **No existe aviso de «producto editado» ni de «precio cambiado».** `notificationHooks` solo tiene eventos de pedidos y de bajo stock. Lo único es un log en `katuq-product-upsert.action.js:135`.
- **Quién ve costos hoy.** El backend no revisa rol en ninguna ruta de costos (`routers/fulfillmentIntegrations.js:2032-2036`, solo `auth`). En el front, la pestaña «Costo» vive en Listas de precios (menú `lista-precios/lista-precios`, `nav.service.ts:809`). La única regla de rol es `puedeVerMargen` de cotizaciones (`services/cotizaciones/margenCotizacion.js:76`).
- **Modelo de precios** (proyección de `productos.js:1640-1665`):
  - base: `precio.precioUnitarioSinIva`, `precio.precioUnitarioIva` (tarifa en texto), `precio.valorIva`, `precio.precioUnitarioConIva`;
  - por tipo de cliente: arreglo `preciosPorTipoCliente[] { tipoClienteId, precio, precioConIva }`;
  - por volumen: `precio.preciosVolumen[] { numeroUnidadesInicial, numeroUnidadesLimite, valorUnitarioPorVolumenSinIVA, valorUnitarioPorVolumenConIVA }`;
  - costo: `costoUnitario`, `costo{}`, `precio.costoUnitario`.
- **Modelo del historial del pedido (D-541).** Un módulo único que escribe con `create()`, id determinista, bandera por empresa con corte general en `config/feature_flags`, lectura paginada con cursor y candado de empresa (`services/orders/historialPedido/`, commit `9ab9074d`). Se reutiliza el diseño, no el código: su contexto y su catálogo son del pedido.

### Censo: quién escribe en `products` y qué fase lo cubre

Censo completo del 23-oct (todo archivo fuera de `tests/` que nombra la colección, por literal, constante o ayudante). **Ningún código de inventario escribe `products`** (D-134): `services/inventoryService.js` (329, 664, 1357, 1750, 1767), `services/inventory/*`, `controllers/inventory.js`, los nodos `*inventory-adjust` y `osmosis-stock-sweep`, `services/kuvo/*` y `tools/adjustStock.js` solo leen.

| # | Archivo:línea (función) | Qué escribe | Origen | Fase |
|---|---|---|---|---|
| 1 | `controllers/productos.js:447` (+477) `create` | producto completo | Katuq | **F1** |
| 2 | `productos.js:1895` `edit` | documento completo, incluidos precios, exposición y `disponibilidad.*` | Katuq | **F1** |
| 3 | `productos.js:2025` `delete` | borrado físico | Katuq | **F1** |
| 4 | `productos.js:2843` `deleteAllByCompany` | borra todo el catálogo (lote) | Katuq | **F1** |
| 5 | `productos.js:1800` `bulkUpdateField` | `precio.precioUnitarioIva/SinIva` o `disponibilidad.estado/activo` en todo el catálogo | Katuq | **F1** |
| 6 | `productos.js:3861` `updatePreciosTipoCliente` | `preciosPorTipoCliente` y, a veces, el precio base | Katuq | **F1** |
| 7 | `productos.js:3950` / `3957` `bulkPatch` | borrar; `exposicion.activar` / `exposicion.disponible` | Katuq (acción masiva) | **F1** |
| 9 | `controllers/productCosts.js:457` `updateProductCost` | costo | Katuq | **F1** |
| 13 | `productos.js:3363` `importPrecios` | precios por tipo de cliente (+ base) | Importación | **F1** |
| 14 | `productos.js:3530` `importPreciosUnitarios` | precio base (+ volumen) | Importación | **F1** |
| 15 | `productos.js:3664` `importPreciosVolumen` | precios por volumen | Importación | **F1** |
| 16 | `productos.js:3724` `limpiarPrecios` | borra precios por tipo de cliente | Importación | **F1** |
| 21 | `productCosts.js:335` `applyCostImport` | costo | Importación | **F1** |
| 22 | `tools/updateProduct.js:221` | nombre, descripción, marca, «se puede vender» | Claude/MCP | **F1** |
| 39 | `controllers/tiendaEnUnPaso.js:146` | llama a `create` (fila 1) | Katuq | **F1** (por la fila 1) |
| 8 | `services/catalogo/atributosProducto.js:110` | atributos | Katuq | F2 |
| 10, 11 | `services/productPhotos/batchStore.js:192, 275` | fotos (ya deja historial v1) | Katuq | F2 (pasa al modelo) |
| 23 | `tools/updateProductPhotos.js:259` | fotos | Claude/MCP | F2 |
| 12 | `productos.js:772` (+794) `createMultiple` | producto generado por IA | Importación | F2 |
| 17 | `controllers/onboarding.js:3304, 3307` `importProducts` | producto completo | Importación | F2 |
| 18 | `onboarding.js:1035` `createFirstProductOnboarding` | producto | Importación | F2 |
| 19 | `onboarding.js:1436` `createMinimalProduct` | producto mínimo | Importación | F2 |
| 20 | `controllers/diagnostics.js:757` `createInitialConfiguration` | producto de ejemplo del registro | Sistema | F2 |
| 26 | `services/fulfillmentProductImportService.js:174` | producto de Aliaddo | Proveedor | F2 |
| 27 | `services/flows/nodes/internal/katuq-product-upsert.action.js:306, 320, 336` | producto canónico | Cereza (flows) | F2 |
| 30, 31 | `services/integrations/osmosis/osmosisProductSyncService.js:457, 470` | actualizar / crear | Cereza | F2 |
| 33 | `services/shopify/helpers/product.js:193` | crea desde una línea de pedido | Shopify | F2 |
| 34 | `services/shopify/processors/products.js:63, 71` | `shopifyData.*`; marca de borrado en Shopify | Shopify | F2 |
| 35 | `controllers/woocommerceIntegration.js:418, 477, 672, 739, 750` | importación completa | WooCommerce | F2 |
| 36 | `controllers/woocommerceWebhook.js:1038` | crea desde una línea de pedido | WooCommerce | F2 |
| 37 | `services/woocommerce/processors/products.js:67, 71, 128, 280, 283` | alta, cambio, baja, variaciones | WooCommerce | F2 |
| 38 | `services/purchasing/purchaseCostCapture.js:113` | costo al recibir una compra | Compras | F2 |
| 24 | `services/accounting/utils/codigoSiigo.js:191` | `integrations.siigo.productCode` | Siigo | sin evento (campo técnico) |
| 25 | `services/ecommerce/ecommerceAdapter.js:439, 467` | `integrations.<prov>` | Shopify/Woo | sin evento (técnico) |
| 28 | `services/flows/nodes/shopify/shopify-pricelist-sync.action.js:139` | marca de sincronización | Shopify | sin evento (técnico) |
| 29 | `services/flows/nodes/shopify/shopify-product-upsert.action.js:689, 890, 921` | ids y marcas de atención de Shopify | Shopify | sin evento (técnico) |
| 32 | `services/shopifyService.js:348` | ids de Shopify | Shopify | sin evento (técnico) |
| 40 | `controllers/companies.js:1699` `deleteCompany` | borra la empresa completa | Sistema | sin evento (se borra la empresa) |
| 41 | `services/cronService.js:727` | marcas de embeddings (cron apagado) | Sistema | sin evento (técnico) |

Los scripts de `functions/scripts/` que escriben productos (precios, costos, activación, integraciones) son de una sola vez y quedan fuera de las fases. Un script **nuevo** que cambie precio, costo o estado usa el registrador con origen «Sistema» y lote = nombre del script (regla en `functions/scripts/README` en la F2).

**Hallazgos fuera de alcance**, anotados para cambios aparte (no se arreglan aquí):

- `GET /v1/osmosis/products/sync` sin `auth` (`routers/osmosisIntegration.js:91-96`).
- `POST /v1/fulfillment/import-products` toma `companyId` del cuerpo (`routers/fulfillmentIntegrations.js:1600`).
- Las filas 5, 6, 7, 9, 13-16 y 21 toman la empresa de la cabecera y no revisan rol. La fila 5 cambia IVA o estado de todo el catálogo.
- `limpiarPrecios` no espera el `batch.commit()` del lote de 500 (`productos.js:3724`).
- `date_edit` se guarda como Timestamp en las filas 17 y 19 y vacío en la 33: el flow `katuq-product-changed` no ve esos productos.

## Decisiones de Daniel (23-oct)

| # | Pregunta | Decisión | Dónde se aplica |
|---|---|---|---|
| 1 | ¿Dónde se guardan los eventos? | **Ampliar `productHistory`**, que ya existe, con versión de registro | D1 |
| 2 | ¿Las sincronizaciones dejan evento? | **Sí, desde la F2**, solo con cambios reales y agrupadas por corrida | D3, F2 |
| 3 | ¿Volver al valor anterior? | **F4**, se decide después de usar F1 a F3 | F4 |
| 4 | ¿Bandera y quién exporta? | Bandera por empresa (D-505), ALMARA primero; exporta solo la familia Administrador | D9, F3 |

## Goals / Non-Goals

**Goals (F1):**

- Un evento inmutable por guardado que cambie de verdad un producto, sus precios o su costo, desde el panel, la importación de precios y costos, las acciones masivas y Claude.
- El servidor fija actor, origen y hora; la empresa sale del producto leído.
- Un solo módulo escribe; si falla, el producto se guarda igual.
- Lectura paginada, limitada a la empresa del token, con los costos solo para quien los puede ver.
- Pestaña «Historial» rehecha e historial por fila en las cuatro pestañas de Listas de precios.
- Lo que la propuesta dejó pendiente de la F0 (ver D10).

**Non-Goals (F1):**

- Integraciones, importación de productos, fotos y atributos (F2).
- Reconstruir productos anteriores (F2).
- Reporte, exportación y aviso (F3); revertir (F4).
- Existencias o movimientos de inventario.
- Cambiar qué guarda cada escritor en `products`, `date_edit` o `user_edit`, o quién puede editar.
- Arreglar los hallazgos fuera de alcance.

## Decisions

### D1. `productHistory`, versión 2

- **Misma colección.** Los registros de fotos de hoy quedan como versión 1 (sin `schemaVersion`). Los nuevos llevan `schemaVersion: 2`.
- **Campos (inglés, como D-541):**

| Campo | Qué guarda |
|---|---|
| `schemaVersion` | `2` |
| `company` | `company` del producto leído (nunca la cabecera) |
| `productoId` | doc id del producto (mismo nombre que la versión 1, para el índice de hoy) |
| `productRef`, `productName` | referencia y nombre al momento del evento |
| `type`, `tags` | tipo principal y todos los tipos del guardado (D2) |
| `occurredAt` | hora del servidor (Timestamp) |
| `fecha` | la misma hora en texto ISO, para que la consulta de hoy siga ordenando (compatibilidad v1) |
| `recordedAt` | `serverTimestamp()` |
| `actor` | `{ kind, name, email, role }`; `kind` ∈ `user`, `system`, `integration` |
| `origin`, `channel` | listas cerradas (D4) |
| `details` | `[{ field, before, after }]` con `field` del catálogo cerrado |
| `prices` | `[{ kind, listId, listName, before, after, beforeWithTax, afterWithTax, diff, diffPct }]` para base, tipo de cliente, volumen y costo; `kind` ∈ `base`, `customer_type`, `volume`, `cost` |
| `batch` | `{ id, kind, name, total }` en importaciones y acciones masivas |
| `reason`, `reasonStatus` | motivo (hasta 500) y `given` / `not_required` |
| `snapshot` | resumen inicial (creación) o final (eliminación): referencia, nombre, categoría, estado, precios |
| `correctsEventId` | reservado para la F4 |

- **Ids deterministas:** `{productoId}__{opId}`. `opId` se genera una vez por petición o por lote (uuid del servidor) y se reutiliza en los reintentos internos. Un reintento del navegador es otra petición, pero ya no encuentra cambios reales y no deja evento.
- **Índices** (se crean antes de encender la bandera, con el CLI y sin `--force`):
  - `company ASC, productoId ASC, occurredAt DESC` y `… ASC`;
  - `company ASC, productoId ASC, tags CONTAINS, occurredAt DESC` (historial desde precios y costos).
- **Sin índice simple** (`fieldOverrides`): `details`, `prices`, `snapshot`, `actor`.
- **Retención:** indefinida.

### D2. Tipos de evento y un evento por guardado

| `type` | Cuándo | Título |
|---|---|---|
| `product_created` | alta por cualquier vía de la F1 | «Producto creado» |
| `product_deleted` | borrado (también el masivo) | «Producto eliminado» |
| `cost_changed` | cambia el costo | «Costo cambiado» |
| `price_changed` | cambia base, tipo de cliente o volumen (también quitarlo) | «Precio cambiado» |
| `product_deactivated` / `product_activated` | cambia «se puede vender» | «Producto inactivado» / «activado» |
| `product_sold_out` / `product_available` | cambia disponible / agotado | «Marcado agotado» / «disponible» |
| `product_edited` | cambia un dato del catálogo cerrado | «Producto editado» |

- **Prioridad del `type`:** eliminado > creado > costo > precio > activo > disponible > editado. `tags` lleva todos.
- **Las rutas exactas** de «se puede vender» (`exposicion.activar` y/o `disponibilidad.activo`) y de disponible/agotado (`exposicion.disponible` y/o `disponibilidad.estado`) se confirman con productos reales de ALMARA en la tarea 1.1, mirando cuál muestra la pantalla.
- **Catálogo cerrado de campos de la F1:** nombre, descripción, marca, categoría, referencia, código de barras, tarifa de IVA, precio base, precios por tipo de cliente, precios por volumen, costo, se puede vender, disponible. Cualquier otro campo no genera evento por sí solo.

### D3. Solo cambios reales

`diferencias(previo, final)` es una función pura:

- compara solo los campos del catálogo;
- normaliza antes de comparar: números y textos numéricos (`"42621"` = `42621`), pesos redondeados a la unidad, textos recortados, arreglos de precios **por clave** (`tipoClienteId`; rango `inicial-límite` en volumen), no por posición;
- **ignora** índices de búsqueda, embeddings, marcas de sincronización, `integrations.*` e `integraciones.*`, ids externos, `ultimaEdicionPorMcp`, `date_edit`, `user_edit`, `attributesEditedAt` y **todas las existencias** (`disponibilidad.cantidadDisponible` y parecidas: el historial no registra stock);
- quitar un precio queda como `after: null` («sin precio»);
- variación: `diff = after − before`, `diffPct` con un decimal; si `before` es 0 o nulo, sin porcentaje.
- Sin diferencias, no hay evento.

### D4. Actor y origen: listas cerradas que fija el servidor

- **Orígenes:** `web` «Katuq», `import` «Importación», `mcp` «Claude/MCP», `opttia` «Opttia», `cereza` «Cereza», `shopify` «Shopify», `woocommerce` «WooCommerce», `siigo` «Siigo», `supplier` «Proveedor», `purchasing` «Compras», `system` «Sistema».
- **Canal** (opcional): `bulk_action` «Acción masiva», `price_import` «Importación de precios», `cost_import` «Importación de costos», `single_step_store` «Tienda en un paso».
- **Reglas** (`contexto.js`, mismo criterio que D-541 D4):
  1. Sesión JWT: el actor sale de `req.userInfo` (nombre, correo, rol), **nunca** de la cabecera `email`. La App se ve como Katuq (decisión 1 de D-541).
  2. Importaciones y acciones masivas: misma sesión, origen `import` o `web` con su canal.
  3. MCP: `oauth` → `mcp` con la persona; `servicekey` → `opttia`; `apikey` → `mcp` sin persona.
  4. Sin clasificar → `system` y la traza `producto.historial.origen_sin_clasificar { company, productoId, fuente }`.
- Si el actor es `user` y le falta el nombre o el rol, el escritor lee `users` por correo **y empresa** (1 lectura).

### D5. Módulo único: `functions/services/productos/historialProducto/`

```
constantes.js  colección, versión, tipos, orígenes, canales, catálogo de campos y rutas
etiquetas.js   textos de negocio: tipos, campos («Precio Modelos»), orígenes, canales
contexto.js    actor, origen y canal desde req, MCP y sistema
diferencias.js funciones PURAS: diferencias, variación, prioridad, ids, foto de alta y de baja
escritor.js    el ÚNICO archivo nuevo que escribe en productHistory (create con reintentos)
lectura.js     página: eventos v2, registros v1 de fotos y filtro de costos
log.js         registro estructurado con lista cerrada de campos
index.js       API pública
```

- **API:** `registrar({ previo, final, contexto, lote, motivo })` y `registrarLote([...])`. Nunca lanzan y quien llama no las espera.
- **Qué hace `escritor`** (igual que D-541 D5.2): bandera de la empresa y corte general; valida catálogos; recorta textos; `create()` con hasta 4 intentos solo ante errores transitorios; `ALREADY_EXISTS` cuenta como éxito; la falla final va a `integration_audit` (`type: 'product_history_write_failed'`, sin datos personales) y a un log de error.
- **Lotes:** `registrarLote` escribe con `BulkWriter` limitado a `create()` sobre esta colección, de a 500, en segundo plano. La acción masiva de 30 productos deja 30 eventos con el mismo `batch.id`.

### D6. Dónde se engancha (F1)

Regla común: **el antes es lo guardado al momento del cambio.**

- Si el escritor ya lee el producto antes de escribir (filas 2, 6, 9 y 22), se usa esa lectura.
- Si escribe sin leer (importaciones y masivas: filas 4, 5, 7, 13-16 y 21), se leen los productos del lote con `getAll` en bloques de 100 **antes** del batch. Son las mismas lecturas que hace la importación para encontrar cada producto por referencia; si ya las hace, se reutilizan (tarea 1.3 lo confirma por escritor).
- El evento se arma **después** de que la escritura confirmó, con `final = previo + lo escrito`.
- Donde el escritor usa transacción, el antes sale de la lectura transaccional.
- Un escritor sin transacción tiene una ventana pequeña entre leer y escribir: si otra persona guarda en medio, el antes puede quedar viejo. Se acepta y queda en Riesgos.

| Punto | Fila del censo | Qué agrega |
|---|---|---|
| P1 | 1 `create` (+ 39) | `product_created` con `snapshot` |
| P2 | 2 `edit` | evento combinado del guardado |
| P3 | 3 `delete` | `product_deleted` con `snapshot` (lee antes de borrar) |
| P4 | 4 `deleteAllByCompany` | `product_deleted` por producto, un lote |
| P5 | 5 `bulkUpdateField` | `price_changed` o `product_(de)activated` por producto, un lote |
| P6 | 6 `updatePreciosTipoCliente` | `price_changed` (tipo de cliente y, si cambió, base) |
| P7 | 7 `bulkPatch` | activo, disponible o eliminado por producto, un lote |
| P8 | 9 `updateProductCost` | `cost_changed` |
| P9 | 13 `importPrecios`, 14 `importPreciosUnitarios`, 15 `importPreciosVolumen` | `price_changed` por producto que cambió, lote con el nombre del archivo |
| P10 | 16 `limpiarPrecios` | `price_changed` con `after: null` |
| P11 | 21 `applyCostImport` | `cost_changed` por producto, lote |
| P12 | 22 `update_product` | evento combinado, origen `mcp` |

Cada enganche es **una línea** en el escritor existente: no cambia lo que se guarda en `products`, ni `date_edit`, ni `user_edit`.

### D7. Inmutabilidad: tres candados

1. **Código:** solo `escritor.js` escribe eventos v2, solo con `create()` (o `BulkWriter.create`). Un contract test recorre `functions/**/*.js` (con `scripts/`) y falla si aparece `productHistory` fuera de una lista permitida: `constantes.js`, el escritor v1 de fotos (`batchStore.js`, hasta la F2) y la lectura de hoy (`productos.js:2930`, que pasa a delegar en `lectura.js` en la tarea 4.1). También falla si hay `set`, `update`, `delete`, `FieldValue.delete` o `recursiveDelete` sobre la colección.
2. **Firestore:** `create()` falla si el id existe.
3. **Reglas:** se suma `productHistory` a la exclusión del comodín que prepara D-541 (tarea 5.2 de D-541; mismo ruleset). **Gate:** ALMARA no se enciende sin esa regla publicada; FLORECER sí, para probar.

Una corrección es otro evento. Nada se edita.

### D8. Lectura

- **Mismo endpoint, crece compatible:** `GET /v1/productos/historial/:productoId`.
  - Sin `vista`: responde lo de hoy, idéntico.
  - `?vista=eventos&limite=50&orden=desc|asc&cursor=…&tipo=precios|costo`: el formato nuevo.
- **Candado:** se suma `requireJwtTenantOrPlatform` a la ruta (`routers/productos.js:733`). El producto debe ser de la empresa del token; si no, 404 igual que inexistente, con `registrarIntentoAjeno` (`utils/mismaEmpresa.js`). Julsmind entra a cualquiera.
- **Plan:** `products/{id}` (1 lectura) → página `company ==`, `productoId ==`, `orderBy(occurredAt)`, `orderBy(__name__)`, `startAfter`, `limit(51)`. Los registros v1 de fotos (no tienen `occurredAt`) se leen aparte por el índice de hoy (`fecha`, tope 100) y se mezclan por hora como «Fotos actualizadas».
- **Costos:** quien no puede ver costos (D9) no recibe eventos `cost_changed` ni el detalle de costo de un evento combinado.
- **Respuesta:** la de D-541 D8.4 adaptada: `resumen` (referencia, nombre, total de cambios, último cambio) y `eventos[]` con `titulo`, `fecha`, `actor { nombre, rol }`, `origen`, `canal`, `detalles[] { etiqueta, antes, despues, clase }`, `precios[] { etiqueta, antes, despues, diferencia, porcentaje }`, `lote`, `motivo`, `fuente` (`evento` o `fotos`). Sin correo del actor, salvo que no tenga nombre.
- **Índice faltante o error:** responde la vista de antes y deja un log. La pantalla nunca se rompe.

### D9. Permisos y bandera

- **Ver el historial:** quien abre la ficha del producto.
- **Ver costos en el historial:** familia Administrador, `puedeVerMargen`, o rol con el menú `lista-precios/lista-precios` (donde vive la pestaña «Costo» hoy). Se resuelve con `menusDelRol` como `services/mcp/permisoDeEscritura.js`. Ver Open Questions 1.
- **Exportar (F3):** solo la familia Administrador (`isAdminFamilyRole`).
- **Bandera `productHistoryLog`** en `FEATURE_FLAG_NAMES` y `COMPANY_FEATURE_FLAGS`. Apagada: no se escribe, `vista=eventos` responde la vista de antes y el front muestra la pestaña de hoy. Corte general `config/feature_flags.productHistoryLog === false`. Dueño Daniel, retiro 2027-04-30 (Artículo XII). Primero FLORECER, luego ALMARA.

### D10. Pantallas de la F1

- **Pestaña «Historial»** de la ficha (`crear-productos.component.html:2052-2091`): con la bandera, `<app-historial-producto [productoId]>`; sin ella, la de hoy sin cambios.
- **Historial por fila** en «Precio tipo clientes», «Precio unitario», «Precio por volumen» y «Costo» (`lista-precios.component.html`): acción «Historial» que abre un diálogo con `tipo=precios` o `tipo=costo`. La acción de «Costo» solo aparece si la persona puede ver costos.
- **Componentes** en `components/productos/historial-producto/`, OnPush; `HistorialProductoComponent` (contenedor con «Ver más»), `HistorialProductoEventoComponent` y `historial-producto.util.ts` (agrupar por día en hora de Colombia, COP, variación con signo «−»). Servicio `shared/services/productos/historial-producto.service.ts extends BaseService`. Modelo en `shared/models/historial-producto.model.ts`.
- **Excepción acotada del Artículo IX**, como D-054 y D-541: Angular 14.3 no tiene signals ni `@if`; se usan `*ngIf` y RxJS.
- **Aspecto:** el de D-541 D10 (tarjeta blanca radio 16, días en mayúscula muted, ícono en azulejo de 32 px con par semántico). Precio y costo: pastilla `#efe9ff` con «$42.621 → $78.291 (+$35.670, +83,7 %)» en `tabular-nums`. Estados de carga (esqueleto), error con «Reintentar» y vacío «Este producto aún no tiene cambios registrados». Prefijo `hp-`, sin «p-» en ningún nombre de clase.
- **Pendientes de la F0 que pasan a la F1** (la F0 hecha cubrió Listas de precios y precios por tipo de cliente):
  - «Última edición» en hora de Colombia y con quién en el listado de productos (`productos.component.html:774`) y en la ficha (`crear-productos.component.html:2079`);
  - el usuario del token, no de la cabecera, en costo (`productCosts.js:168, 267, 416`), importar precios (`productos.js:3349`), limpiar precios (`:3727`) y acciones masivas (`:3952`). La F1 lo necesita para el actor del evento.

### D11. Datos personales y logs (Artículo XI)

- Los eventos guardan nombre y correo del actor solo en Firestore. La respuesta manda nombre y rol.
- Logs con lista cerrada `{ company, productoId, eventId, tipo, origen, resultado, intentos, duracionMs, codigoError, lote }`; nunca nombres, correos, precios ni motivos.

### D12. Rendimiento y costo

- **Escritura:** 1 `create` por producto cambiado, 1-2 lecturas de bandera por petición (no por producto: se lee una vez por lote) y 0-1 de `users`. En segundo plano.
- **Lecturas extra** de las importaciones que hoy no leen: 1 por producto del lote. Se mide en FLORECER con un Excel de 400 filas antes de ALMARA.
- **Lectura:** 1 producto, 1 bandera, hasta 51 eventos, hasta 100 v1 y 0-1 de rol. Meta p95 < 1,5 s (spec), medida con `producto.historial.lectura { eventos, v1, duracionMs }` en 30 aperturas.

## F2–F4 (esbozo; cada fase tendrá diseño y tareas propios antes de implementarse)

- **F2:**
  - **Integraciones** (filas 26, 27, 30, 31, 33-38) con el mismo registrador y solo cambios reales.
  - **Idempotencia:** id del evento desde el id del aviso o de la corrida (`{productoId}__{proveedor}_{eventoId}`, Artículo IV). Antes de enganchar Cereza o Shopify se contrasta con `specs/002-flows-osmosis-shopify-marco/findings.md` y se mide el volumen (OH MY STORE, 8.311 productos) en modo sombra: contar lo que se escribiría sin escribir.
  - **Fotos y atributos** (8, 10, 11, 23): las fotos de D-501 pasan a la versión 2 sin romper su contract test (`tests/productos/productPhotos/writeset.contract.test.js`).
  - **Importación de productos y alta inicial** (12, 17-20).
  - **Reconstruido al leer:** última edición conocida (`date_edit`, `user_edit`) y `productCostHistory`, marcados «registro reconstruido».
  - **Filtros** por tipo, usuario y origen.
- **F3:** reporte de cambios de la empresa (filtros por fechas, usuario, producto, lista y origen; índice `company, occurredAt`), exportación a Excel solo para la familia Administrador, y **aviso nuevo** de precio o costo cambiado a la campana de los administradores (no existe hoy: se diseña como tipo nuevo de notificación del Seller).
- **F4 (solo si Daniel la aprueba después):** volver al valor anterior de un precio o costo con vista previa, como un cambio nuevo que lleva `correctsEventId`.

## Pruebas

| Repo | Archivo | Qué fija |
|---|---|---|
| Back | `tests/productos/historialProducto.diferencias.test.js` | Catálogo, normalización, arreglos por clave, quitar precio, variación y porcentaje (caso GCJ1236: +$35.670, +83,7 %), campos ignorados, stock ignorado, prioridad y `tags` |
| Back | `tests/productos/historialProducto.contexto.test.js` | Actor del token y nunca de la cabecera; MCP; sin clasificar → Sistema más traza |
| Back | `tests/productos/historialProducto.escritor.test.js` | Bandera apagada = cero escrituras; corte general; solo `create`; `ALREADY_EXISTS` = éxito; reintentos; falla → `integration_audit`; nunca lanza; lote de 30 con el mismo `batch.id` |
| Back | `tests/productos/historialProducto.inmutable.contract.test.js` | Escaneo de D7.1 |
| Back | `tests/productos/historialProducto.writeset.contract.test.js` | El módulo solo escribe `productHistory.create` e `integration_audit.create`; ningún módulo de inventario lo importa; un ajuste de existencias no deja evento ni cambia producto, variantes, precios o listas (D-134) |
| Back | `tests/productos/historialProducto.puntos.contract.test.js` | P1-P12 por inspección; con el registrador roto, cada escritor guarda en `products` exactamente lo mismo que sin el enganche |
| Back | `tests/productos/historialProducto.lectura.test.js` | 404 ajeno con rastro; empresa del token; costos ocultos sin permiso; mezcla con v1; páginas estables; índice faltante → vista de antes |
| Back | Regresión | `tests/productos/productPhotos/*`, `tests/orders/preciosPorTipoFase0.test.js`, pruebas de `katuq-product-changed` y de importación de precios |
| Front | `tests/productos/historial-producto.util.test.js` | Día en hora de Colombia, hora con segundos, COP, variación con signo |
| Front | Build | `npm run build` sin errores; gradientes y primarios prohibidos no suben |

## Risks / Trade-offs

- **Muchos escritores.** Se enganchan uno a la vez, con diff aprobado; con la bandera apagada no se escribe nada; la prueba de puntos fija que el producto se guarda igual.
- **El antes en escritores sin transacción** puede quedar viejo si dos personas guardan el mismo producto en el mismo segundo. Se acepta en la F1; el evento sigue diciendo quién escribió qué valor.
- **Costo de lecturas en importaciones grandes** (1 lectura por fila cuando el escritor no lee hoy). Se mide antes de ALMARA.
- **Volumen de las sincronizaciones** (F2): sin «solo cambios reales» una corrida podría dejar miles de eventos. La F2 mide en sombra antes de encender.
- **`date_edit`:** no se toca; la prueba de puntos lo verifica.
- **Reglas abiertas** (D-513): gate antes de ALMARA, compartido con D-541.
- **Hallazgos de seguridad** del censo: quedan anotados para cambios aparte; el historial no confía en la cabecera aunque el escritor sí lo haga.

## Migration Plan

1. Backend con la bandera apagada: módulo, enganches P1-P12, lectura y bandera. Commit y push antes de desplegar; `git pull` y reinicio. Sin efecto visible.
2. Índices y `fieldOverrides`; regla de exclusión publicada (con D-541).
3. Front: pestaña, historial por fila y «Última edición». Build de producción y publicación con el candado.
4. FLORECER encendida: prueba con escrituras reales (crear, editar precio, importar 400 filas, inactivar 30, borrar).
5. ALMARA encendida (OK de Daniel y regla publicada). Observación de 5 días hábiles: fallas = 0, p95 < 1,5 s, eventos sin dobles en 10 productos revisados, el flow de Shopify igual.
6. **Revertir:** bandera de la empresa o corte general; revertir commits si hace falta. Los eventos escritos quedan inertes.
7. **Retiro (2027-04-30):** encendida para todos o eliminada.

## Open Questions

1. **¿Quién ve los cambios de costo en el historial?** Recomendado: familia Administrador, quien pasa `puedeVerMargen` (gerencia) y quien tiene el menú «Lista de precios», que es quien ve la pestaña «Costo» hoy. Alternativa: solo familia Administrador y gerencia.
2. **Las acciones masivas** (activar, inactivar, agotado, eliminar) **entran en la F1**, porque el escenario de la spec «Producto inactivado por acción masiva» es de la F1, aunque la tabla de fases de la propuesta las ponía en la F2. ¿De acuerdo?
