# Diseño — Ampliación de la fase 1 por D-518 (TX-37·1, ·2, ·4, ·5 y D-505)

> **Estado: aprobado en bloque por Daniel el 21-oct** (front 014d1b62; cada pregunta abierta, con la recomendación escrita; falta asentarlo en `specs/CONTRACT.md`, tarea 7.0). Antes de esa aprobación ya iba A1, que aplica directamente la regla aprobada de D-518 («los interruptores … pasan a `config/feature_flags`») y va en el paso 3 de su orden de trabajo, sin esperar al resto (tarea 0.6). Amplía [`design.md`](design.md) (fase 1, aprobada el 18-oct y desplegada **apagada**, en `off`). Lo aprobado y lo hecho no cambia salvo donde este documento dice «reemplaza». La fase 1b está en [`design-fase-1b.md`](design-fase-1b.md) y la fase 2 en [`design-fase-2.md`](design-fase-2.md). Contratos nuevos: [`anexo.md`](anexo.md) §G. Código leído el 21-oct en `wt-back-tickets-web/functions` (rama `feature/tickets-web`, HEAD `097ede2e`) y `wt-front-tickets-web/src`; los archivos de fotos son iguales a los desplegados. Revisado el 21-oct contra la crítica (ver «Cambios tras la revisión» en `proposal.md`).

## A1. Interruptores a Firestore (D-505; D-518 «reglas que aplican a todos»)

**Hoy:** el modo sale de `PRODUCT_PHOTO_UNIFORM_MODE` en el `.env` (`services/productPhotos/settings.js:47-50`) y el proveedor de fondo de `BACKGROUND_REMOVAL_PROVIDER` (`services/media/backgroundRemoval.js:37` y `:69-71`). D-505 prohíbe interruptores en el `.env`.

**Reemplaza** la decisión 9 de `design.md` en cuanto a dónde vive el interruptor (sus valores y su efecto no cambian):

- Documento `config/feature_flags` (ya existe; lo leen `controllers/sites.js:4626` y `:4851`, `woocommerce-inventory-adjust.action.js:128` y `notificationHooks.js:1658`):
  - `productPhotoUniformMode`: `"off" | "shadow" | "on"`. Ausente, otro valor o error de lectura → `off`.
  - `backgroundRemovalProvider` y `backgroundRemovalUses` (fase 2, `design-fase-2.md` §F2.1).
- Lector nuevo `services/productPhotos/config.js`: `leerModo()` hace **una lectura del documento por llamada, sin caché**. Motivos: el requisito aprobado «al bajar el interruptor, el lote se detiene antes del siguiente producto» (`specs/product-photo-uniform/spec.md`, CA10) y la regla «sin caché extra». Cuesta una lectura por vista previa, por lote creado, por `GET /settings` y por producto del lote, que ya hace varias lecturas propias. Con el documento ausente o ilegible, `off`.
- `settings.modoDelServidor` pasa a `async leerModo()`. Lo esperan `routers/productPhotos.js:75-80` (`exigirModo`), `controllers/productPhotos.js` (`ajustes`, `crearLote` y la reversión con el modo en `off`) y `batchRunner.js:48`, `:243` y `:279`. El runner lo lee antes de cada producto, como hoy.
- La variable del `.env` deja de leerse. Hoy no está definida en producción (comentario 2 del ticket; CONTRACT, D-501 «SUBIDA APAGADA»), así que el modo efectivo no cambia: sigue en `off`.
- **Script** `scripts/set-product-photos-config.js`, como `set-nps-config.js`: simulación por defecto, `--execute` para escribir. Escribe **solo** sus llaves, con `update` y rutas de campo. Nunca reemplaza el documento: en él viven otros interruptores de la plataforma, entre ellos el de stock de WooCommerce y los de pago a cuotas. Una prueba exige que las demás llaves queden idénticas.
- Dueño: Daniel. Retiro: con la bandera, 2027-04-30 (Artículo XII, tarea 6.1).

**Corrección registrada:** `design.md` («Despliegue»), anexo §F D3 y la tarea 5.2 decían desplegar en `shadow`. Se desplegó sin la variable, o sea en `off` (CONTRACT, D-501 «SUBIDA APAGADA»). El desvío queda anotado en los tres archivos; su asiento en `specs/CONTRACT.md` lo hace quien apruebe (tarea 0.6).

## A2. Excluir solo las integraciones que escriben fotos (TX-37·5)

**Reemplaza** la decisión 5 de `design.md` y la regla `product_integrated` de la decisión 4.

- **Producto** (`eligibility.js:77-79`): hoy cualquier llave en `integrations` o `integraciones` lo saca (`:79`). Pasa a sacarlo solo si tiene la llave de un proveedor que escribe fotos: `osmosis`, `shopify`, `woocommerce`, `fulfillment` o `aliaddo` (el operador logístico que alimenta `fulfillmentProductImportService.js`), en `integrations` o, por lectura legacy (Artículo XV), en `integraciones`. Así `integrations.siigo.productCode` (D-504) ya no saca a los productos de ALMACEN BOMBAS. La lista es una constante compartida con el detector.
- **Empresa, integraciones** (`syncDetector.js:61-67`): `integration_configs` activo de esos proveedores → 409, como hoy.
- **Empresa, flows** (`syncDetector.js:38` y `:55-60`): hoy basta un nodo con «product» en el tipo. Pasa a una **lista cerrada** `NODOS_QUE_EXCLUYEN`, sacada del código y no de prefijos:
  - el nodo que escribe las fotos en Katuq: `katuq-product-upsert` (`katuq-product-upsert.action.js:306`, `set` con `merge`). En `services/flows/nodes/` ningún otro nodo escribe las fotos de `products` (`shopify-pricelist-sync` escribe `products`, pero solo `integrations.shopify.preciosSincronizadosEn`: no excluye);
  - los nodos que leen o llevan productos de esos proveedores, porque la foto uniformada se mezclaría con su catálogo (no-goal «Shopify» de D-501): `osmosis-product-changed`, `osmosis-product-fetch`, `shopify-product-changed`, `shopify-product-upsert`, `shopify-bulk-product-sync`, `woocommerce-product-changed`, `woocommerce-fetch-products` y `woocommerce-product-upsert`.
  - No excluyen los nodos de pedidos, existencias, inventario, envíos, pagos o facturación (`osmosis-order-*`, `osmosis-stock-*`, `shopify-order-*`, `shopify-inventory-*`, `aliaddo-fulfillment-create`, `siigo-*`, etc.), ni `katuq-product-changed` solo.
  - **`sub-flow`:** se sigue el `flowId` (hasta 3 niveles) y se aplica la misma lista al flow invocado. Si el `flowId` es una expresión que no se puede resolver sin correr el flow, el flow **excluye** (criterio conservador).
  - **Prueba de registro de nodos:** todo tipo registrado en `services/flows/nodes/index.js` debe estar clasificado como «excluye» o «no excluye». Un nodo nuevo sin clasificar hace fallar la prueba, igual que `writersRegistry.contract`.
- **Siguen fuera** OH MY STORE (flows de Cereza y Shopify, con `katuq-product-upsert` y `shopify-product-upsert`) y CAFE ESCOBAR (`integration_configs` de WooCommerce), como dice D-518. Las pruebas lo fijan con sus formas de flow e integración.
- Depende de la auditoría 0.3 corrida con datos reales (tipos de nodo de los flows activos). Es **sensible**: amplía quién recibe escrituras en `products` (por ejemplo, ALMACEN BOMBAS). Diff aprobado por Daniel (tarea 7.5).

## A3. Categoría por ruta exacta, con sus subcategorías (TX-37·4)

**Hoy:** `productosDeCategoriaPorDefecto` (`controllers/productPhotos.js:91-101`) busca la etiqueta como subcadena en `categoriasRaw`: «Flores» también toma «Flores secas».

**Nuevo:**
- La petición manda `categoryPath`: la ruta del árbol, de 1 a 3 nombres (`["Flores", "Rosas"]`). `categoryLabel` se sigue aceptando por compatibilidad y vale `[categoryLabel]`.
- **Árbol y alias:** `getCatalogSchemas(company)` (`controllers/productos.js:233-249`, exportada en `:3993`) da `{ indice, schemas }` del documento de `categorias` que elige D-495. No se agrega otra lectura ni otra caché.
- **Ruta de cada producto:** `rutaDelProducto` de D-495 (`services/catalogo/atributosCategoria.js:327-334`) espera `producto.categorias` y `producto.exposicion.categorias` (`formaDeCategorias`, `:241-256`). El índice de búsqueda (`getSearchIndex`) trae esos datos con otros nombres (`categoriasRaw` y `exposicionObj`, `controllers/productos.js:185` y `:190`). Un adaptador puro los pasa: `{ categorias: p.categoriasRaw, exposicion: p.exposicionObj }`. Sin él, todos saldrían `sinCategoria` y el lote quedaría vacío; una prueba lo fija.
- **Entra** si su ruta resuelta (clave normalizada) es la elegida o **empieza** por ella más el separador: la categoría y todas sus subcategorías. «Flores» no toma «Flores secas».
- **No entra en silencio:** un producto con estado `sinCategoria`, `ambigua`, `enColision` o `fueraDelArbol` se cuenta como `category_unresolved` y el diálogo lo dice («3 productos no se pudieron ubicar en tu árbol de categorías»).
- La lista de productos sigue filtrando por subcadena (cambiarla es otro comportamiento). Por eso el diálogo muestra el conteo del servidor, no el de la lista.

## A4. Categorías y selecciones grandes: series de lotes de 100 (TX-37·4)

**Hoy:** más de 100 productos → 422 `BATCH_TOO_LARGE` (`controllers/productPhotos.js:257`).

**Nuevo:** una **serie** parte la selección en lotes seguidos de hasta 100. No hay colección nueva: todo vive en `product_photo_batches`.
- **Crear** (`POST /batches`, misma ruta): si la selección resuelta pasa de 100, en **una** transacción se crean la parte 1 (`queued`), las partes 2..N con `status: "waiting"` y el candado apuntando a la parte 1. Ids deterministas: `<serieId>-p<k>`, con `serieId` = hash de empresa + `idempotencyKey` (mismo esquema que `batchStore.js:44`). Reintentar devuelve la misma serie. Cada parte guarda `series: { id, part, parts }` y sus ≤ 100 `productIds`.
- **Una sola función de cierre.** Hoy hay tres caminos que cierran un lote: `cerrarLote` (`batchStore.js:219-233`), `crearLote` cuando revierte con el modo en `off` (`:81`) y `pedirCancelacion` sin arriendo (`:249`). Los tres pasan a usar la misma pieza interna, que en la misma transacción:
  - con `done`: pasa la siguiente parte de `waiting` a `queued` y le mueve el candado; el proceso la lanza y, si se cae, la retoma la de siempre (`lotesPorRetomar` filtra por `queued`/`running`; `waiting` no entra);
  - con `cancelled`, `stopped` o `failed`: cierra todas las partes `waiting` de la serie con `stopped` y `stopCode: "series_stopped"`. Lo hecho queda reversible.
  - Así `GET /series/:id` siempre llega a un estado final y el diálogo deja de consultar.
- **Antes de empezar cada parte**, el runner vuelve a correr `detectarSync`, porque una serie puede durar horas. Si aparece un sync que excluye, la parte cierra `stopped` con `stopCode: "company_has_sync"` y la cascada cierra las demás.
- **Revertir la serie:** un lote `revert` (`revertOf` = id de la serie) que recorre los resultados de cada parte por separado (`leerResultados` lee hasta 101 por lote, `batchStore.js:126`). No usa `sharp` ni Storage, así que no lleva tope de 100.
- **Tope de la serie** (pregunta 3): 2.000 productos (20 partes). Más, 422 `SERIES_TOO_LARGE` con «Elige una subcategoría».
- Rutas nuevas: `GET /series/:id`, `POST /series/:id/cancel` y `POST /series/:id/revert` (anexo §G.1).

## A5. Entradas: editor del sitio y Catálogos por link (TX-37·1)

El **mismo** diálogo standalone (`components/productos/fotos-uniformes/`, entradas `productIds` y `categoryLabel`, `fotos-uniformes.component.ts:84-88`) se abre desde:

1. **Editor del sitio, sección «Productos»** (`sitios/editor/sitio-editor.component.html:728-760`): botón «Uniformar fotos de estos productos» con `b.datos.productoIds`. Al cerrar con cambios, el editor vuelve a pedir las miniaturas de `elegidosDelBloque` (`sitio-editor.component.ts:4755`).
2. **Catálogos por link, detalle** (`cotizaciones/catalogos-link/detalle/catalogo-link-detalle.component.html:15`): «Uniformar fotos de este catálogo» en `cfg-acciones`, solo con el catálogo guardado. Hasta 200 productos (`MAX_PRODUCTOS_CATALOGO`, `catalogo-link.modelos.ts:50`): una serie de 2 lotes. Al cerrar con cambios, recarga el detalle.
3. **Lista de productos** (`productos.component.html:190-196`): el botón de categoría manda `categoryPath` (`[categoria]` o `[categoria, subcategoria]` según los filtros) y pierde el «· hasta 100». La selección masiva también acepta más de 100.
4. **Solo si Daniel lo confirma (pregunta 4):** editor del sitio, sección «Catálogo completo» (`sitio-editor.component.html:1009-1030`): «Uniformar fotos por categoría», con un paso para elegir la categoría del árbol. D-518 nombra la sección de productos y Catálogos por link; esta entrada es una recomendación.

**Proporción sugerida (pregunta 13; TX-37·1 no la pide):** desde el editor del sitio, el diálogo podría proponer la `fotoProporcion` del estilo (`sitio-editor.component.ts:326-331`, mismos valores 1:1, 4:5 y 3:4; F2-17, ticket 1227 cd `wtFbA7dCMwLIOa2GAsgg`) si no es «Del estilo». Sin el OK de Daniel, el diálogo empieza en el valor por defecto P1.

Todo detrás de `productPhotoUniform` (`company-features.service.ts`) y con el rol del servidor: quien no es administrador ve la vista previa pero no «Aplicar» (`canApply`, `controllers/productPhotos.js:169`). UI: `openspec/specs/design-system/spec.md`; botones secundarios con la clase de cada pantalla (`btn-fantasma` en el editor, `cfg-btn cfg-btn--sec` en catálogos); clases nuevas `fu-*` sin «p-»; cada `span` con color y tamaño; `:focus-visible`. Sin nombre de proveedor (Artículo VI).

## A6. Marca de agua o logo: detectar y avisar (TX-37·2, fase 1 sin IA)

**Hoy:** nada lo trata. Las fotos de Almara (adjunto del ticket 1259, cd `3UrH47Mko7eruBnF4tak`) traen «Almara» abajo a la derecha sobre fondo blanco, negro o verde lima.

**Nuevo aviso `possible_watermark`**, informativo como `low_resolution` y `blurry` (nunca bloquea):
- Función pura nueva en `utils/productPhotoUniform.js`, sobre la foto reducida a 256 px (la misma reducción que ya se hace para el laplaciano, pero en color):
  1. **Borde liso:** al menos el 90 % de los píxeles del marco exterior está a menos de 24 del color mediano del borde. Si no, la foto tiene escena y no se opina (límite honesto: no hay aviso).
  2. **Máscara** de lo que difiere de ese color; componentes conexos tras dilatar 2 px (las letras de un logo se juntan).
  3. **Aviso** si, además del componente mayor (el producto), hay uno que ocupa entre 0,05 % y 5 % del área, no toca al producto y cae entero en una esquina (25 % exterior de cada eje) o en una franja de borde (15 % exterior).
- Se calcula en la vista previa, en el lote (sombra y `on`) y en el resumen. Al subir en el editor, el aviso de siempre (resolución y nitidez) no cambia: la detección es del servidor.
- No detecta marcas semitransparentes sobre el producto. Quitar las que están sobre el fondo va en la fase 2 (`design-fase-2.md` §F2.4).
- Vectores de prueba: sintéticos y recortes del adjunto del 1259; versión `watermark-vectors.v1.json`.

## Write-set de la ampliación

| Cambio | Escribe | Solo lee | Nunca |
|---|---|---|---|
| A1 | `config/feature_flags`: solo `productPhotoUniformMode` (y en la fase 2 sus dos llaves), solo por el script con `--execute` y por rutas de campo | `config/feature_flags` | Las demás llaves de `config/feature_flags`; `.env` |
| A2, A3, A6 | nada nuevo (cambian reglas puras) | `products`, `categorias`, `flows`, `integration_configs` | lo mismo que `design.md` |
| A4 | `product_photo_batches`: partes `waiting`, `series`, candado | igual | lo mismo que `design.md` |
| A5 | nada en el servidor; front sin cambios de guardado | `sites`, `catalogos` (ya los lee cada pantalla) | `sites`, `catalogos` |

Por producto, el lote escribe exactamente lo de `design.md` («Write-set cerrado»). `writeset.contract.test.js` suma: una serie solo escribe `product_photo_batches` fuera de los productos; las partes `waiting` nunca tocan `products`.

## Pruebas primero (antes del código)

- **Caracterización:** `syncDetector` y `elegibilidadProducto` con las formas de OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS (con `integrations.siigo`) y FLORECER, fijando lo que deciden hoy; `crearLote` (con el cierre en `off`), `cerrarLote` y `pedirCancelacion` de `batchStore` tal como están.
- **Contrato:** `routes.contract` con `categoryPath`, las rutas de serie y el modo leído de Firestore (sin documento → 503 `PHOTO_UNIFORM_OFF`); `batchRunner` con el modo releído sin caché en cada producto (bajar a `off` en Firestore detiene el lote antes del siguiente), partes encadenadas, parada en cascada **por cada uno de los tres caminos de cierre**, `detectarSync` al empezar cada parte y retoma que ignora `waiting`; el script de A1 deja intactas las demás llaves de `config/feature_flags`.
- **Puras:** adaptador del índice a `rutaDelProducto`; ruta por prefijo (incluye subcategorías, «Flores» no toma «Flores secas», `category_unresolved` con `sinCategoria`); `NODOS_QUE_EXCLUYEN` contra el registro de nodos, `sub-flow` resuelto y sin resolver; `possible_watermark` contra sus vectores.
- **Front:** el botón de cada entrada solo con la bandera; el diálogo con serie (partes y progreso).

## Gates constitucionales

I y XIV: D-518 y la aprobación de esta ampliación. II: las specs nuevas van sin tecnología. IV: series idempotentes por `idempotencyKey`. VI: sin proveedor en pantalla. VII: `correlationId` = id de lote o serie. VIII: contratos antes. IX: excepción de Angular 14 (componente standalone OnPush, como el diálogo actual). XI: sin URLs con token en logs. XII: el interruptor se retira con la bandera. XV: `integrations` solo se lee; `integraciones`, solo lectura legacy.
