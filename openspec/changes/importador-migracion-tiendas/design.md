> **→ D-518 (21-oct), ampliación pendiente de aprobación:** `design-ampliacion.md` (formato actual de Shopify, IVA por producto, ofertas, partición y árbol de categorías), `design-ampliacion-ficha.md` («Nuevo», alt, SEO, HTML limpio y tope), `design-woocommerce.md` (fase 1c, guarda de la integración Woo y clientes de Woo), `design-fotos.md` (copia a Storage) y `design-ampliacion-plan-existencias.md` (plan gratis, productos sin control de existencias y ficha sin `variantes[].cantidad`). Donde la ampliación reemplaza algo de aquí, se marca «→ D-518».

## Context

D-498 (ticket 1245, F5-30, parte importador). El punto de partida está en la propuesta («Hoy»). Las citas salen del código leído el 2026-10-18 (backend `katuq_admin_back_firebase/functions`, `backend-aws-security`, `d8f1903b`), sin consultar producción. Las columnas de los exports salen de la documentación pública; 0.4 las confirma con archivos reales. **Mientras no lleguen, las pruebas usan fixtures SINTÉTICOS** (`functions/tests/storeMigration/fixtures/`, backend privado): productos e inventario de Shopify, el export anterior con `Variant Inventory Qty` y productos de WooCommerce, con esas columnas, sin datos personales ni clientes.

Para no pasar de 3 páginas por documento (Artículo XIII), el diseño se reparte así: este documento; `design-escritura.md` (categorías, productos, existencias y write-set); `design-clientes.md` (fase 1b) y `contracts/import-store-api.md` (contrato de cada ruta).

## Goals / Non-Goals

**Goals:** 500 productos de Shopify con fotos y variantes en menos de una hora, sin tocar lo existente. Simulación sin escrituras, reporte fila por fila y redirecciones listas al publicar. Con la bandera apagada, nada cambia.

**Non-Goals:** los de la propuesta. Tampoco se cambian `importProducts` (salvo la extracción de categorías, con su dorado), `importInventory`, `katuq-product-upsert`, `deleteImportBatch`, `services/flows/contracts/canonical-product.ts` ni `shopifyProductToCanonical`.

## Decisions

1. **Rutas nuevas en el router de onboarding** (pregunta 6): `POST /v1/onboarding/import-store/{dry-run,products,redirects,customers}` y `DELETE …/customers/:batchId` (1b). Cadena de la convención (`routers/onboarding.js:300-311`): `auth, requireJwtTenant, requireFeature(FEATURE_FLAGS.storeMigrationImport), ONLY_ADMIN`. La bandera va antes del rol: apagada, no se ejecuta nada más. Se registran en un `try`, como las otras rutas con bandera. La empresa sale del JWT.

2. **El front agrupa y el servidor interpreta.** El front lee el CSV con `xlsx`, agrupa por producto (`Handle`; en Woo, `ID`/`Parent`), recorta a las columnas conocidas y arma lotes por producto. El servidor reinterpreta cada grupo con lectores puros, en un registro por proveedor (`services/storeMigration/readers/`), sin `if` por proveedor (Artículo VI). El front usa un mapa de perfiles equivalente.

3. **Producto migrado** (`migrationProduct.js`, puro): la forma de `importProducts`, más `variantes[] { titulo, referencia, codigoBarras, atributos, cantidad, activo }` y `metadata.migration { source, handle, externalId, migrationId, axes, compareAtPrice }`.
   - **Ejes por nombre:** Talla/Size/Tamaño → `talla`; Color/Colour → `color`. Otro eje toma la clave libre (`option1`/`option2`). Con más de dos ejes, el producto se omite.
   - **Referencia:** el SKU si el producto tiene una sola variante con SKU; si no, el `Handle`.
   - **Precio:** el del export incluye IVA; el porcentaje lo elige el comercio (fórmula en `design-escritura.md`). → D-518: el comercio responde si su archivo incluye IVA (A2, pregunta 17). `Compare At Price` y `Sale price` van al reporte y a `metadata`, nunca a una lista de precios. → D-518: tarifa por producto (A2) y oferta en la lista Público (A3).
   - **Precio distinto por variante:** un producto por precio. → D-518: la llave es (regular, oferta, IVA) (A4). El grupo con más variantes conserva título y referencia; los demás llevan `-2`, `-3`… y los valores que los distinguen.
   - **Fotos:** `buildProductPhotos` (máximo 8); `Variant Image` pone el `color` de la foto. Un producto en `draft` entra inactivo. → D-518: con su `alt` (N2) y copiadas después a Storage (`design-fotos.md`).

4. **Escritura** (categorías, productos y existencias): ver `design-escritura.md`.

5. **Simulación** (`dryRun.js`): solo lee productos por referencia, el árbol de categorías, las bodegas, el borrador del sitio y los flows. Calcula los conteos con las mismas funciones puras que el lote.

6. **Guarda `FLOW_PUBLISHES_PRODUCTS`:** nada migrado puede terminar publicado en la tienda anterior.
   - Hay dos caminos. `katuq-product-changed` emite productos. `katuq-inventory-changed` alimenta `shopify-inventory-adjust`, que, si el producto no tiene `integrations.shopify`, busca la variante por SKU (`shopify-inventory-adjust.action.js:386-399`), y la referencia migrada suele ser ese SKU.
   - Por cada enlace activo de la empresa (`flow_trigger_bindings`) se lee `flows/{flowId}.graph`. El enlace no basta: el que escribe `activate` (`flowsController.js:363-376`) no guarda `nodeType`, y `publicar` vive en el grafo (así lo hace `triggerBindingsReader.js:116-118`).
   - Si el grafo tiene un nodo de `PUBLISHING_NODE_TYPES`, la simulación avisa y `products` responde 409. Esos nodos son `shopify-product-upsert`, `shopify-inventory-adjust`, `shopify-bulk-product-sync`, `shopify-pricelist-sync`, `woocommerce-product-upsert` y `woocommerce-inventory-adjust`.
   - Bloquea aunque el flow esté en sombra: si lo encienden después, publicaría lo migrado.
   - Se revisa en la simulación y en cada lote. Una prueba compara la lista con el registro de nodos.

7. **Redirecciones:** el front manda `{ handle, cd }` de lo creado o ya migrado, más las colecciones.
   - El servidor verifica que cada producto sea de la empresa y que su `metadata.migration.handle` coincida. El destino es `rutaDeProducto(crearProducto.titulo, cd)`; el de una colección, `rutaDeCategoria`, solo si la categoría existe.
   - Una transacción sobre `sites/{siteId}` fusiona manuales, productos y colecciones, en ese orden. Pasa por `normalizarRedirecciones` y escribe solo `draft.redirecciones`.
   - **Lo generado se reconoce sin cambiar el formato**, porque `normalizarRedirecciones` (`utils/siteBlocks.js:1805`) solo guarda `{desde, hacia}`:
     - es generada la entrada cuyo `desde` es la ruta de producto de la plataforma anterior y cuyo `hacia` apunta a un producto de la empresa con ese `metadata.migration.handle`; se reemplaza;
     - lo demás es manual: se conserva y cuenta en `conflictsWithManual`;
     - si `hacia` apunta a un producto que ya no existe, el reporte pide borrarla en el editor;
     - en colecciones, una entrada idéntica no cambia y una distinta cuenta como manual.
   - Lo que no cabe en las 500 va al reporte. Se activan al publicar (D-479).

8. **Clientes (fase 1b):** ver `design-clientes.md`.

9. **Bandera `storeMigrationImport`** (D-385):
   - Nace apagada y se enciende a mano con `scripts/set-company-feature.js`, que simula por defecto.
   - Primero FLORECER; nunca OH MY STORE.
   - Dueño: Daniel. Retiro: 2027-03-31.

10. **Observabilidad:** cada petición deja en `migration_audit` (la colección de `MigrationTool.js:613`) `{ service: "storeMigration", companyId, migrationId, step, lot, source, counts, durationMs, result, actor, fileDigest }`. `companyId` es el campo que esa colección ya usa. `actor` es el `sub` del token (`req.user`), nunca un correo. El `migrationId` es el `correlationId` (Artículo VII). El log solo lleva errores, con su código y el `migrationId`; nunca filas, correos ni teléfonos (Artículo XI).

11. **Front:** módulo lazy `components/migracion-tienda/`, en la ruta `migrar-tienda` (`AuthGuard` + `MigracionTiendaGuard`).
    - Un componente standalone OnPush por paso.
    - `MigracionTiendaService extends BaseService`, con `providedIn: 'root'` y `postSinLoader`. El módulo no importa `HttpClientModule`; es la trampa que explica `ImportApiService`.
    - La lógica pura (`migracion-archivos.ts`, `-perfiles.ts`, `-reporte.ts`) se prueba con `node --test`.
    - Diseño D-400 (`config-pagina`, clases `cfg-*`, ninguna con «p-»). El botón «Traer mi tienda» aparece en Mis sitios y en Productos solo con la bandera.

## Gates constitucionales

- **I, XIV:** D-498 aprobada; specs, valores por defecto y diseño se aprueban antes de las tareas (0.1 a 0.3).
- **II:** las specs no nombran tecnología.
- **III, IX:** excepción al Artículo IX, porque Angular 14 no trae signals ni `@if`: se usa `*ngIf` con standalone y OnPush. Se registra en `CONTRACT.md` (0.2), como en D-318.
- **IV:** candado, lote repetido sin escribir, referencia determinista, solo crear, fusión por `desde` y un consentimiento que solo crea.
- **V, X:** no hay webhooks. **VI:** lectores y perfiles por proveedor. **VII, XI:** auditoría con `migrationId`, sin datos personales. **VIII:** contract tests primero. **XII:** dueño y retiro. **XIII:** documentos partidos. **XV:** no se escribe `integrations` ni `integraciones`.

## Fases

| Fase | Contenido | Depende de |
|---|---|---|
| **1a** | Shopify: productos, variantes, fotos, existencias, simulación, reporte y redirecciones | 0.1 a 0.4 |
| **1b** | Clientes y consentimiento | 1a, preguntas 3, 4 y 19 a 21, revisión legal (0.7) |
| **1c** | Lector de WooCommerce | 1a y un archivo real |
| 2 | Wix y páginas (XML de WordPress). → D-518: copiar las fotos pasa a esta entrega (`design-fotos.md`) | Un export real de un comercio que lo necesite (F5-30·1) |
| Aparte | Precio o stock por variante, ficha sin `variantes[].cantidad`, borrar productos por `migrationId`, mapper de Woo, contrato canónico | Propuestas propias (D-214) |

## Risks / Trade-offs

- Otro proceso (formulario, Cereza) crea la misma referencia entre la búsqueda y la creación → residual; la siguiente simulación la marca ambigua.
- El editor del sitio abierto con una copia vieja borra lo generado al guardar → el reporte lo advierte y el paso se repite.
- `variantes[].cantidad` queda quieta (pregunta 2). → D-518: propuesta E3 para la ficha de un producto migrado (pregunta 18 de la ampliación). Tiempo sin medir → FLORECER. Fotos en el CDN anterior → ~~fase 2~~ → D-518: se copian en esta entrega.

## Migration Plan

Aprobar specs, valores y diseño → archivos reales → pruebas, implementación y revisión → desplegar apagado y encender FLORECER → medir y decidir por comercio. No hay relleno de datos: la simulación es el `--dry-run`.

**Reversa:** apagar la bandera. Clientes y autorizaciones salen con `DELETE import-store/customers/:batchId`; las redirecciones, en el editor. Los productos quedan normales, identificables por `metadata.migration.migrationId`; borrarlos en masa es otra propuesta, con `--dry-run`.

## Notas de implementación (2026-10-19)

Lo que el código decidió donde este documento no bajaba al detalle. Se revisa con los exports reales (0.4).

- **Rutas:** router propio `routers/importStore.js`, montado en `index.js` en `/v1/onboarding/import-store` (antes de `/v1/onboarding` y dentro de un `try`). Mismas rutas y misma cadena de la decisión 1; no toca `routers/onboarding.js`, que editan otras sesiones. Hasta 6.1 y 7.1, `products` y `redirects` validan, revisan la guarda y el sitio, y responden 501 `NOT_AVAILABLE_YET`. Un cuerpo con otra empresa recibe 403 de `requireJwtTenant`.
- **Simulación:** escribe solo su registro en `migration_audit`. Sin `siteId`, `redirects` es `null`. `photos.valid` cuenta las fotos que entran (hasta 8 por producto). `total` cuenta cada producto separado por precio, y `withoutSku` los productos sin SKU en ninguna variante. Los avisos de un grupo omitido entero (por ejemplo, las fotos de un producto que ya existe) no van al reporte: solo el motivo de la omisión. Sin bodega elegida, `WAREHOUSE_INVALID` solo aparece si hay unidades por cargar, con un mensaje que pide elegirla. Las consultas de coincidencias van en paralelo, en tandas de 50; el tiempo con Firestore real se mide en 12.2 (la prueba supone 150 ms por consulta).
- **Lector de Shopify:** la referencia es el SKU solo si el producto tiene **una** variante y trae SKU. La categoría sale de `Type` y, si falta, del último nivel de `Product Category`. La cantidad sale de «Available» en el CSV de inventario (no de «On hand», que incluye lo comprometido), sumada en todas las ubicaciones. `externalId` es el `Handle`, porque el CSV no trae el id del producto. «Title / Default Title» no es un eje.
- **Contrato:** cada fila puede traer `_row` (su número en el archivo) para el reporte.
- **WooCommerce (1c):** el exportador por defecto no trae el *slug*. Las redirecciones `/product/<slug>` necesitan otra fuente (otra columna o la dirección pegada por el comercio).
- **Actualización acotada:** si el producto existente no tiene `user_add` ni fechas de creación, el upsert las completa con el actor y la fecha de hoy. No se evita sin modificarlo.

## Open Questions — valores por defecto *(confirmar con Daniel)*

1. **Precio por variante:** un producto por precio.
2. **`variantes[].cantidad`:** foto inicial que en un producto migrado no se actualiza nunca: una talla en 0 queda agotada y una vendida sigue a la venta. La propuesta de ficha sin ese campo es requisito de 13.2.
3. **Clientes sin cédula:** sin documento, por celular o correo.
4. **Consentimiento:** origen `importacion` con evidencia y declaración; solo crea. Sujeto a la revisión legal (0.7).
5. **Tope de 500 redirecciones:** no se sube; primero productos.
6. **Rutas:** las cinco `import-store/*`, con la reversa de clientes.
7. **Bandera:** solo a mano; retiro el 2027-03-31.
8. **Wix:** en la siguiente entrega. → D-518 F5-30·1: cuando un comercio traiga un export real.
9. **Más de dos ejes:** se omite.
10. **Comparación y oferta:** solo reporte y `metadata`. → D-518 F5-30·4: oferta en la lista Público (A3); `metadata.migration.compareAtPrice` se conserva.
11. **Existencias:** solo productos creados; en `upsert`, con casilla.
12. **Inventario:** en proceso, sin diff (alternativa: servicio extraído con diff aprobado).
13. **Límites:** 2.000 productos por simulación; 25 por lote; 2.000 productos y 1.000 colecciones en redirecciones; 500 clientes por lote.
14. **Referencia:** SKU si hay una sola variante con SKU; si no, `Handle`.
15. **Archivados y tarjetas de regalo:** se omiten y se reportan.
16. **Write-set ampliado:** `migration_audit` e `integration_idempotency` (aprobación explícita, `openspec/config.yaml`).
17. **Guarda de flows:** 409 ante cualquier nodo que publique en Shopify o Woo, aun en sombra.
18. **Actualización acotada:** solo los bloques de `design-escritura.md`.
19. **Teléfono y correo (1b):** celular de 10 dígitos con +57; correo en minúsculas.
20. **Reversa de clientes (1b):** borra los clientes del lote y las autorizaciones que siguen en `importacion`.
21. **Correo suprimido en otra tienda (1b):** no se crea la autorización.
