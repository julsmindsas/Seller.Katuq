## Convenciones

- `[P]`: paralelizable con otras `[P]` (no comparten archivos). **Diff aprobado:** módulo sensible; un cambio a la vez, con el diff visto por Daniel antes de aplicarlo.
- Backend: `node tests/storeMigration/<archivo>` desde `functions/`, con simulador de Firestore que revienta ante una colección inesperada y red reemplazada; sin credenciales. Front: `node --test tests/migracion/<archivo>` con `ts-node`.
- Toda tarea de código cierra con `node --check` limpio o `npm run build` sin errores. Antes de editar se leen el archivo y su `git diff` (otras sesiones tocan `onboarding.js` y `sites.js`). Nada de `git add -A`.
- Sin relleno de datos: la simulación es el `--dry-run`. Ningún agente escribe en producción ni enciende banderas.

## 0. Compuertas (en este orden: specs → diseño → tareas)

- [x] 0.1 Daniel aprueba las cuatro specs de `specs/`. **Éxito:** `openspec validate importador-migracion-tiendas --strict` pasa (verificado el 2026-10-18) y la aprobación queda en la entrada de D-498 en `specs/CONTRACT.md`.
- [x] 0.2 Daniel confirma los valores por defecto (`design.md`, Open Questions 1 a 21) y aprueba `design.md`, `design-escritura.md`, `design-clientes.md` y `contracts/import-store-api.md`. Depende de 0.1. **Éxito:** D-498 registra los valores, la ampliación del write-set (pregunta 16) y la excepción al Artículo IX (Angular 14). Todo cambio va primero al documento.
- [x] 0.3 Daniel aprueba este `tasks.md`. Depende de 0.2.
  - *0.1 a 0.3:* aprobadas en bloque el 18-oct (CONTRACT, D-495 a D-503: «diseño, specs, tareas y valores por defecto»). Se marcan por D-518 T·3. Falta la anotación en el contrato con la fecha de la aprobación; la hace la sesión que edita el contrato (14.18).
- [ ] 0.4 Exports reales (productos, inventario aparte si existe y clientes de Shopify; productos de WooCommerce), anonimizados como fixtures en `functions/tests/storeMigration/fixtures/`, solo en el backend privado y sin datos personales reales. **Éxito:** columnas reales anotadas en `design.md`. Bloquea 1.7, 4.1 y 8.1.
  - *Estado 2026-10-19:* sin exports reales. Hay fixtures **sintéticos** (productos e inventario de Shopify, export anterior con `Variant Inventory Qty` y productos de WooCommerce) armados con las columnas de la documentación pública, sin datos personales y sin clientes. Se reemplazan por los reales cuando lleguen.
- [ ] 0.5 Verificar la tarea 3.2 de `banderas-por-comercio`. **Éxito:** estado anotado; sin cerrarla no se enciende nada.
- [x] 0.6 Acordar con D-495 quién toca primero `categoriaTreeHelper.js` y el bloque de categorías. **Éxito:** orden anotado aquí.
  - *Orden (2026-10-19):* sin choque de archivos. D-495 toca `controllers/categorias.js`, `routers/categorias.js` y `createCategoria`. Este cambio toca `services/catalogImport/categoryAssignment.js` (nuevo) y el bloque de categorías de `importProducts` (3.1). Ninguno de los dos modifica `categoriaTreeHelper.js`; los dos lo usan tal como está.
- [ ] 0.7 Concepto legal (Ley 1581) sobre el consentimiento traído de la tienda anterior. **Éxito:** queda en D-498; si dice que no, la fase 1b entra sin suscripciones (sale 9.2). Bloquea la sección 9.

## 1. Pruebas primero (Artículo VIII). Cada una debe fallar antes de implementar. Dependen de 0.3

- [x] 1.1 `[P]` `importStore.routes.contract.test.js`: cadena `auth, requireJwtTenant, requireFeature(FEATURE_FLAGS.storeMigrationImport), ONLY_ADMIN` (bandera antes del rol); cuerpos y respuestas de `contracts/import-store-api.md`; 400, 403 (bandera y rol), 404, 409 y el 413 de cada ruta.
  - *Estado:* en verde con 5.1. El cuerpo con otra empresa recibe 403 de `requireJwtTenant` (no se ignora: nunca manda).
- [x] 1.2 `[P]` `importStoreDryRun.noWrites.contract.test.js`: la simulación no escribe (cualquier escritura revienta) ni usa la red.
  - *Estado:* en verde. La única escritura permitida es el registro del paso en `migration_audit` (decisión 10 y 5.1); todo lo demás revienta.
- [x] 1.3 `[P]` `importStoreProducts.writeSet.contract.test.js`: solo `products`, `categorias`, `migration_audit`, `integration_idempotency` y, desde 6.2, `inventory`/`inventoryMovement` únicamente por `importInventory` y nunca para omitidos; nunca `preciosPorTipoCliente`, listas, `integrations.*`, flows ni pedidos. En `create`, `matchBy: 'cd'` sin `cd`, nada existente cambia y la referencia ambigua se omite. En `upsert` se conservan `date_add`, `fecha`, `fechaCreacion`, `user_add`, `exposicion`, `marketplace`, `ciudades`, `disponibilidad`, `categorias` y `_precioManualOverride`; `user_edit` es el actor y, sin la casilla, `variantes[].cantidad` no cambia.
  - → D-518 (pendiente de aprobación): la prohibición de `preciosPorTipoCliente` pasa a «como máximo una fila, la del tipo Público de la empresa, en el mismo producto» (14.5). Además vigila `seo`, `alt`, `exposicion.nuevo: false` y `marketplace.paginaWeb`.
  - *Estado:* escrita y **en rojo hasta 6.1** (hoy `products` responde 501). La forma del producto y la actualización acotada ya pasan por el upsert real en la prueba de 4.2. El simulador ahora reemplaza un mapa vacío como Firestore (`simulador.test.js`), así que la condición de `exposicion` sí puede fallar; `migrationProduct.test.js` lo comprueba con un control sin la copia.
- [x] 1.4 `[P]` `importStoreRedirects.contract.test.js`: solo `draft.redirecciones` (`published` intacto); manuales primero y sin cambios; lo generado se reconoce por `metadata.migration.handle` y se actualiza; destino inexistente → `TARGET_MISSING`; tope 500 con sobrantes reportadas; sitio ajeno → 404; repetir no duplica.
  - *Estado:* escrita; en verde desde 7.1.
- [ ] 1.5 `[P]` `importStoreCustomers.writeSet.contract.test.js` (fase 1b): los casos de `design-clientes.md`, incluidos el correo suprimido en otra tienda, el celular con otro formato y la reversa con más de 500 documentos. **Parcial (B15):** el archivo existe con lector, normalización y consentimiento en verde; faltan ruta `customers` y reversa con más de 500 documentos (los cierra B16, 9.3).
- [x] 1.6 `[P]` Dorado de categorías: con lotes de prueba, `importProducts` escribe el mismo árbol, `categorias` y `categoriasIndex` que en `HEAD`, y responde el mismo 409. Los valores salen del código actual. El dorado de fotos sigue en verde.
  - *Estado:* `categoriasImportProducts.golden.test.js`, con los valores sacados de `HEAD` en `fixtures/dorado-categorias-importProducts.json`; en verde antes y después de 3.1.
- [ ] 1.7 `[P]` Pruebas de los lectores sobre los fixtures de 0.4: `shopifyProducts.test.js` y `wooProducts.test.js`. Cubren agrupación, ejes por nombre, separación por precio, más de dos ejes, color de la foto, estado, referencia, suma de cantidades y la tabla de precio sin IVA tomada del modal. Depende de 0.4.
  - *Estado:* escritas sobre los fixtures sintéticos. Shopify en verde; WooCommerce en verde desde F530-B09 (14.13). Sin marcar hasta repetirlas con los exports reales (0.4).
  - → D-518: Shopify suma la plantilla oficial actual (14.1). En `wooProducts.test.js`, «la oferta va al reporte y a metadata» cambia por la fila Público (14.5), y se suman la unión por SKU del padre y los tipos no soportados (14.13).
- [x] 1.8 `[P]` `importStoreGuard.contract.test.js`: 409 con `katuq-product-changed` → `shopify-product-upsert` y con `katuq-inventory-changed` → `shopify-inventory-adjust`, también en sombra; sin 409 sin flows o con flows que solo traen datos a Katuq. `PUBLISHING_NODE_TYPES` cubre todo nodo de acción de Shopify o Woo que publique productos, existencias o listas.
- [x] 1.9 `[P]` `importStoreConcurrency.contract.test.js`: dos envíos simultáneos (mismo lote o dos `migrationId`) dan un resultado y un 409 `IMPORT_IN_PROGRESS`, sin repetidos; un lote terminado reenviado devuelve `replayed: true` sin escribir; un candado vencido se vuelve a tomar.
  - *Estado:* escrita y **en rojo hasta 6.1**. Fija la interfaz del candado: `services/storeMigration/candado.js` con `idDelCandado(companyId)` y `VENCE_MS`. Incluye el aislamiento entre empresas (el mismo `migrationId` y el mismo lote desde otra empresa); el detalle está en la revisión privada del backend.

## 2. Bandera

- [x] 2.1 Agregar `storeMigrationImport` a `FEATURE_FLAG_NAMES` (backend) y a `COMPANY_FEATURE_FLAGS` (front), con dueño y retiro en un comentario. **Éxito:** las pruebas de banderas pasan y la bandera no está en `banderasEmpresaNueva`.
  - *Estado:* en los dos catálogos, con dueño y retiro el 2027-03-31; la prueba de banderas cuenta 25 y la verifica apagada por defecto.

## 3. Categorías. **Diff aprobado** (productos)

- [x] 3.1 Partir el bloque «PASO PREVIO» en `leerArbol`, `resolverCategorias` y `guardarArbol` (`services/catalogImport/categoryAssignment.js`). `importProducts` las llama en el mismo orden. Depende de 1.6 y 0.6. **Éxito:** 1.6 y el dorado de fotos en verde; el diff de `importProducts` solo cambia el bloque por las llamadas.
  - *Estado:* aplicado en el árbol, **sin marcar: espera que Daniel apruebe el diff**. Dorado de categorías, prueba de `categoryAssignment` y dorado de fotos en verde.
  - Aprobado por Daniel (2026-10-19).

## 4. Lógica pura (`functions/services/storeMigration/`)

- [ ] 4.1 `[P]` `readers/shopify.js` y el registro de lectores. Depende de 1.7. **Éxito:** 1.7 (Shopify) en verde.
  - *Estado:* hecho y en verde sobre los fixtures sintéticos; sin marcar hasta confirmarlo con los exports reales (0.4).
- [x] 4.2 `[P]` `migrationProduct.js`: el producto nuevo y el canónico de actualización acotada (`design-escritura.md`). **Éxito:** prueba unitaria con los casos de la decisión 3 y de la actualización.
- [x] 4.3 `[P]` `redirectPlan.js`: origen, destino, «probable», orden, tope y reconocimiento de lo generado. **Éxito:** prueba unitaria; el resultado pasa por `normalizarRedirecciones` sin perder entradas.

## 5. Simulación y guarda

- [x] 5.1 `dryRun.js`, `PUBLISHING_NODE_TYPES`, `controllers/importStore.js` (`dryRun`) y su ruta. La guarda lee `flow_trigger_bindings` y `flows/{id}.graph`; escribe `migration_audit`. Depende de 2.1, 3.1 y 4.x. **Éxito:** 1.1, 1.2 y 1.8 en verde; 2.000 productos de prueba en menos de 10 s.
  - *Estado:* hecho: 1.1, 1.2 y 1.8 en verde. 2.000 productos en unos 0,5 s, con una latencia supuesta de 150 ms por consulta a `products`: las 67 consultas van en paralelo, en tandas de 50 (en fila tardaban 10,8 s). Sin bodega elegida, la guarda de bodega solo bloquea si hay unidades por cargar. Ruta propia (`routers/importStore.js`) montada en `/v1/onboarding/import-store`. `products` y `redirects` validan, revisan la guarda y el sitio, y responden 501 hasta 6.1 y 7.1. Sin marcar porque depende de 3.1, que espera aprobación.
  - Hecho (2026-10-19), con 3.1 aprobado.

## 6. Lote de productos

- [x] 6.1 **Diff aprobado** (productos). Ruta `products` sin existencias: candado, lote repetido, guarda, categorías (3.1), todas las coincidencias y `katuq-product-upsert.execute` sin modificarlo. Depende de 5.1. **Éxito:** 1.3 y 1.9 en verde; `git diff` vacío en `katuq-product-upsert.action.js`.
  - *Estado (F530-B05):* hecho. `controllers/importStore.js` (ruta `products`), `services/storeMigration/candado.js` y `loteProductos.js`; `auditoria.js` guarda el lote terminado con la empresa en el id y lo compara al leerlo (M1). 1.3 y 1.9 en verde (con `pricesIncludeTax` y el write-set del lote ajustados a D-518); `katuq-product-upsert.action.js` sin diff. Sin existencias (6.2) ni fila Público (14.5). Un lote con productos que no se guardaron queda `partial` y no se reproduce.
- [x] 6.2 **Diff aprobado** (inventario), después de aplicar 6.1: `importInventory` en proceso, solo para los creados (o los existentes con la casilla), y `INVENTORY_FAILED` en el reporte. **Éxito:** contract tests de inventario sin cambios y en verde; `git diff` vacío en `importInventory` y sus pruebas.
  - *Estado (F530-B07):* hecho. `services/storeMigration/existencias.js` arma las filas (creados, o existentes con la casilla; nunca omitidos ni sin control ni cantidad cero) y `controllers/importStore.js` llama a `importInventory` en proceso con la sesión; `INVENTORY_FAILED` en `inventory.failed` e `issues`. `importInventory` y sus pruebas sin diff; caracterización 14.21a en verde antes y después. Un conteo fallido no marca el lote como parcial: se cargan con el importador de existencias.
- [x] 6.3 Repetición: el mismo archivo dos veces no duplica productos ni movimientos y devuelve los `cd`; con una venta en medio, la bodega conserva lo vendido.

## 7. Redirecciones

- [x] 7.1 Ruta `redirects` con fusión transaccional en `draft.redirecciones`. Depende de 4.3 y 6.1. **Éxito:** 1.4 en verde.
  - *Estado (F530-B08):* hecho. `services/storeMigration/redirectsPaso.js` + ruta en `controllers/importStore.js`; 1.4 en verde y `importStoreRedirects.paso.test.js` (fuera de la tienda web, handle distinto, 1 MiB, rastro). Sin tocar `sites.js`, `siteHtml.js` ni `siteTienda.js`. Falta, en B09 y B13: `probable`/`urls[]`/`productBase` de WooCommerce y `TARGET_HIDDEN_BY_PLAN`.

## 8. Front (fase 1a)

- [ ] 8.1 `[P]` Lógica pura en `src/app/components/migracion-tienda/logica/`, probada en `tests/migracion/`: ningún producto partido entre lotes, inventario unido por `Handle`, suma de respuestas, CSV sin datos personales y sin `if` por proveedor. Depende de 0.4.
- [ ] 8.2 `MigracionTiendaService` (`providedIn: 'root'`, `extends BaseService`, `postSinLoader`) y `MigracionTiendaGuard`. **Éxito:** sin `HttpClient` en componentes ni `HttpClientModule` en el módulo.
- [ ] 8.3 Módulo lazy `migrar-tienda`, un componente standalone OnPush por paso (D-400), con avisos de guardas, sobrantes, `INVENTORY_FAILED` y descarga del reporte. Botón «Traer mi tienda» en Mis sitios y Productos, solo con la bandera. Depende de 8.1 y 8.2.
- [ ] 8.4 `npm run build:prod` sin errores; no suben los conteos de gradientes ni de primarios prohibidos; revisión a 1440 y 390 px.

## 9. Fase 1b: clientes. **Diff aprobado.** Requiere 0.7 y las respuestas 3, 4 y 19 a 21

- [x] 9.1 `readers/shopifyCustomers.js` y su normalización, con prueba sobre el fixture. Depende de 0.4. Hecho en B15 (`readers/shopifyCustomers.js`, fixture `shopify-clientes.csv` sintético; las columnas siguen sin export real, 0.4).
- [x] 9.2 El origen `importacion` y `registrarImportacion` (`design-clientes.md`). **Éxito:** las pruebas de suscripción existentes y la nueva, en verde. Hecho en B15: origen `importacion`, `registrarImportacion` y la bandera `storeMigrationCustomerConsent` (D-505), APAGADA: sin el concepto legal 0.7 los clientes entran sin suscripción.
- [ ] 9.3 Las rutas `customers` y `DELETE customers/:batchId`. Depende de 9.1, 9.2 y 6.1. **Éxito:** 1.5 en verde.
- [ ] 9.4 El paso de clientes en el front, con la casilla de declaración. Build sin errores.

## 10. Fase 1c: WooCommerce

- [ ] 10.1 `readers/woocommerce.js` y su perfil en el front. Depende de 0.4 y 4.1. **Éxito:** 1.7 (Woo) en verde, sin cambios en las rutas.
  - → D-518: el alcance pasa a la tarea 14.13 (`design-woocommerce.md`).
  - *Estado (F530-B09):* el lector de WooCommerce del backend está hecho y `wooProducts.test.js` pasa a verde (ver 14.13). Queda el perfil del front (F530-F01).

## 11. Revisión

- [ ] 11.1 Revisión independiente (otra sesión o una persona) del diff del backend —aislamiento entre empresas, write-set, datos personales, concurrencia y repetición— y del front.
- [ ] 11.2 En verde las pruebas 1.x y las existentes de onboarding, inventario, sitios, flows y suscripciones; el backend local reinicia sin errores; `openspec validate --strict` pasa si cambió algún documento.

## 12. FLORECER (la bandera la enciende Daniel)

- [ ] 12.1 Daniel corre `node scripts/set-company-feature.js "FLORECER" storeMigrationImport on`, en simulación y luego con `--execute`; después, volver a entrar.
- [ ] 12.2 Simular el export real de 500 productos: conteos coherentes y el conteo de `products` igual. Medir el tiempo de la simulación con Firestore real (la prueba de 5.1 solo supone la latencia).
- [ ] 12.3 Importar y **medir el tiempo** (menos de una hora). Revisar fotos, variantes, «Opción elegida» en venta asistida y existencias.
- [ ] 12.4 Editar un producto migrado: se conservan `variantes[]` y `metadata.migration`. Publicar: `/products/<handle>` da 301 y las manuales siguen; medir el tamaño del sitio (pregunta 5).
- [ ] 12.5 Repetir: nada se duplica. Apagar la bandera: 403 y el botón desaparece.

## 13. Cierre

- [ ] 13.1 Commit por repo, archivo por archivo, con el sello; registrar en D-498 la medición y los desvíos.
- [ ] 13.2 Encender comercio por comercio, nunca OH MY STORE. **Requisito:** la ficha sin `variantes[].cantidad` aprobada e implementada (pregunta 2). Si la medición cumple, pasa a `banderasEmpresaNueva`.
  - → D-518: ese requisito queda en este cambio como E3 (14.22), según la pregunta 18 de la ampliación.
- [ ] 13.3 Retirar la bandera el 2027-03-31 (Artículo XII) y abrir las propuestas aparte: ficha sin `variantes[].cantidad`, borrado por `migrationId`, Wix y copia de fotos.
  - → D-518: la copia de fotos entra en esta entrega (14.15). Wix y las páginas siguen en este mismo ticket hasta que un comercio traiga un export real (F5-30·1; T·1: no se crean tickets «b»).

## 14. Ampliación D-518 (21-oct). NUEVO, pendiente de aprobación

Diseños: `design-ampliacion.md` (A1 a A5), `design-ampliacion-ficha.md` (N1 a N5), `design-woocommerce.md` (W1 a W5), `design-fotos.md` (P1 a P5) y `design-ampliacion-plan-existencias.md` (E1 a E3). Contrato: `contracts/import-store-api-d518.md`. Specs: `store-migration-catalog-fidelity`, `store-migration-photos`, `store-migration-woocommerce`, `store-migration-plan-stock` y los requisitos marcados «→ D-518». Seguridad: la ampliación de la revisión privada del backend (`importador-migracion-tiendas-seguridad`). Todo va en la rama `feature/tickets-web` de los dos repos, sin push ni despliegue (D-518).

**Módulos sensibles:**
- La ampliación **no toca** pedidos, pagos, reserva, consecutivos ni auth.
- **Inventario:** `importInventory` y sus pruebas no cambian, pero sí qué productos y qué cantidades le entrega el lote (A1, W2 y E2). Eso entra en el diff aprobado de 6.2, con la caracterización de 14.21a antes.
- `utils/vitrinaProducto.js` y `utils/limitesPlan.js` están en el camino de la tienda; `vitrinaProducto.js`, además, en el del cobro (`checkoutCore.js:108`). Sus cambios (14.7, 14.8, 14.9, 14.20 y 14.22) van con diff aprobado y con caracterización en verde antes y después.
- `products` se escribe con diff aprobado, como en 6.1.

### Compuertas

- [ ] 14.0a Daniel aprueba A1 (lector de Shopify con el formato actual) y A5 (árbol de categorías). Son los arreglos sin diseño nuevo del orden de trabajo 3 de D-518. **Éxito:** queda en `specs/CONTRACT.md`. Bloquea solo 14.1, 14.2, 14.21a, 14.3a y 14.14.
  - Aprobadas por Daniel el 2026-10-21 («dale pues y aprobado todo»; sección «Aprobación (2026-10-21)» de `proposal.md`). Por eso se hizo la 14.14. **Falta solo el registro en `specs/CONTRACT.md`**, que hace la sesión que cierra; la casilla se marca entonces.
- [ ] 14.0 Daniel aprueba el resto de la ampliación y responde las preguntas 1 a 19 de `proposal.md` («Ampliación D-518»). **Éxito:** queda en `specs/CONTRACT.md` bajo D-518/D-498. La sesión que edita el contrato anota también T·3 (0.1 a 0.3). Bloquea las demás tareas de esta sección.

### Arreglos sin diseño nuevo (después de 14.0a)

- [ ] 14.1 `[P]` Pruebas primero (Artículo VIII) del lector:
  - la plantilla oficial de Shopify (pública, sin datos personales) entra como fixture `shopify-plantilla-oficial.csv`;
  - `shopifyProducts.test.js` suma: camiseta en un producto con 12 variantes; e-book partido en 3 por precio; perfume activo y fuera de la tienda web; el mismo catálogo con encabezados viejos da lo mismo.
  - **Éxito:** las nuevas en rojo; las de hoy, igual.
- [ ] 14.2 Lector de Shopify con la tabla de alias (`readers/comun.js`, `readers/shopify.js`): códigos de barras con prefijo, `Status`, `Published on online store` y `format` en la simulación. Depende de 14.1. **Éxito:** 14.1 en verde; los fixtures sintéticos siguen en verde.
- [ ] 14.21a `[P]` **Caracterización del mapeo de cantidades** (solo pruebas; antes de 14.3a, 14.13, 14.21b y del diff de 6.2): una tabla fija qué cantidad recibe `importInventory` en cada caso (Shopify actual y anterior, inventario aparte y Woo). **Éxito:** en verde con el código de hoy; los contract tests de inventario sin cambios.
- [x] 14.3a CSV de inventario de Shopify: alias `Option 1 Value`. Depende de 14.21a. **Éxito:** la unión por opciones funciona con los dos nombres y las cantidades de los fixtures no cambian.
- [x] 14.14 **Diff aprobado (categorías).** `leerArbol` con `documentoQueEditaElMaestro` (A5). El dorado de `importProducts` suma varios documentos con y sin `categoryAttributes`. **Éxito:** sin la bandera, el dorado no cambia.
  - Hecho (2026-10-21, `feature/tickets-web`, sin desplegar; Daniel aprobó A5 y la pregunta 13 de D-495 con «aprobado todo»): `leerArbol` lee los documentos de la empresa y elige con `documentoQueEditaElMaestro` (la bandera solo se consulta si hay más de uno). `guardarArbol` guarda en una transacción que vuelve a leer el documento y repite las rutas del archivo sobre el árbol fresco, así no pisa lo que Maestros guardó en el intervalo; si el documento quedó ilegible o de otra empresa no escribe, e `importProducts` responde el mismo 409. Sin documento, `add` como siempre. Pruebas: `tests/storeMigration/categoriasArbolMaestro.test.js` (9, rojo antes del arreglo) y el dorado sin cambios (4).
  - Corrección tras la revisión (2026-10-21):
    - La transacción sigue el texto aprobado de la pregunta 13: si Maestros no cambió nada en el intervalo, guarda lo mismo que antes (byte a byte); si cambió algo, parte del árbol fresco y **solo agrega las rutas que crearon categorías**. No recrea nombres que Maestros renombró ni repite `consecutivo` sobre nodos que ya existían.
    - `guardarArbol` devuelve lo resuelto sobre el árbol guardado y `importProducts` lo usa: los productos llevan el nodo que quedó en el maestro (por ejemplo, la categoría que Maestros creó con su consecutivo) y `categoriasCreadas` dice lo que de verdad nació.
    - Un fallo de Firestore al guardar el árbol responde un mensaje genérico (413 tamaño, 409 contención, 500 otro) sin escribir productos.
    - El dorado de `importProducts` ahora suma varios documentos con y sin `categoryAttributes`, comparados contra el escenario congelado de HEAD (solo cambia el id del documento): 6 pruebas. `categoriasArbolMaestro`: 12 pruebas.
  - **Comportamiento declarado:** si a una categoría creada le falta el padre porque Maestros lo renombró en el intervalo, el padre se crea con el nombre del archivo y sale en `categoriasCreadas`. Una ruta que no creó nada y que Maestros renombró conserva el nodo leído al empezar, como los productos que ya tenían esa categoría.
  - **Riesgo declarado (fuera de la pregunta 13, sin cambio):** Maestros (`createCategoria`) reemplaza el árbol completo con el que el navegador cargó al abrir la pantalla, sin comparar versión. Si una importación crea categorías mientras Maestros está abierto, el siguiente guardado de Maestros las borra y los productos quedan con una categoría que el maestro ya no tiene. Resolverlo (versión u otra protección en Maestros) cambia el comportamiento de Maestros y necesita su propia spec.

### Lo demás (después de 14.0)

- [ ] 14.1b `[P]` `importStore.routes.contract` suma los códigos y las rutas de `contracts/import-store-api-d518.md` (incluidas `photos/pending`, `runId`, `pricesIncludeTax` y `taxClassMap`). **Éxito:** en rojo hasta sus tareas. _Parcial (F530-B01): RATE_LIMITED y WOO_INTEGRATION_ACTIVE en verde en `routes`/`Guard`; el resto en rojo declarado en `importStore.d518Pendiente.contract.test.js` con el bloque que lo cierra._
- [x] 14.3b Rechazo del export «Available» (`INVENTORY_FORMAT_UNSUPPORTED`), según la pregunta 9. **Éxito:** prueba con los dos formatos.
- [ ] 14.4 IVA por producto (A2): lectores, `precioSinIvaDesdeConIva` con la tarifa del producto, `products.taxExempt`, clases de Woo (`zero-rate` al 0 %, `taxClassMap`, `TAX_CLASS_UNMAPPED`) y `pricesIncludeTax` (pregunta 17). **Éxito:** exento al 0 % con `precioUnitarioIva: "0"`; gravado con la tarifa elegida; con `pricesIncludeTax: false`, 50.000 al 19 % queda en 59.500; sin la respuesta y con gravados, `products` da 400.
- [x] 14.5 **Diff aprobado (productos).** Oferta en la lista Público (A3):
  - la simulación lee `tiposPrecios` con `active == true` (`offers.publicList`);
  - `nuevoProducto` y `actualizacionAcotada` arman la fila; en Shopify, el precio base según la pregunta 2;
  - `importStoreProducts.writeSet`: como máximo una fila, del tipo Público y de la misma empresa; nunca `tiposPrecios`; en `upsert`, `OFFER_KEPT` y `PRICE_SHADOWED_BY_PUBLIC_LIST`;
  - `wooProducts.test.js` se actualiza.
  - **Éxito:** escrituras de prueba en verde, y `git diff` vacío en `katuq-product-upsert.action.js`.
  - *Estado (F530-B06):* parcial. Hecho: el lote lee `tiposPrecios` de la empresa del token y escribe como máximo una fila Público (`loaded`/`kept`/`skipped`), con `OFFER_KEPT`, `PRICE_SHADOWED_BY_PUBLIC_LIST` y aviso global si la lista falta o es ambigua; `importStoreProducts.oferta.test.js` y el write-set (M7, seo, `nuevo:false`, `paginaWeb`) en verde; upsert sin diff. Falta solo el caso de oferta de `wooProducts.test.js`, que se cierra con el lector de WooCommerce (B09, 14.13); al cerrarlo se marca [x].
  - *Estado (F530-B09):* cerrada. El caso de oferta de `wooProducts.test.js` ya está en verde: la oferta de Woo (`Sale price` con sus fechas) llega al lote como antes/ahora y se escribe en la fila Público (`importStoreWoo.integracion.test.js`).
- [x] 14.6 Partición por (regular, oferta, IVA) (A4) en `separarPorPrecio` (`readers/comun.js`). **Éxito:** tallas con distinta oferta dan dos productos.
- [x] 14.7 **Diff aprobado (tienda).** «Nuevo» (N1):
  - Estado: hecho en el backend (`fechaDeNovedad` + `esNuevo`, prueba `tests/sitios/fechaDeNovedad.test.js`). Pendiente de la fila de la tienda: proyección/select de TX-34 y orden `novedad` en `sites.js` (espera la fila de la tienda).
  - `nuevoProducto` con `exposicion.nuevo: false` y `metadata.migration.originCreatedAt`;
  - `fechaDeNovedad` en `utils/vitrinaProducto.js` y `esNuevo` con ella.
  - **Caracterización antes:** `tests/sitios/detalleComercialProducto.test.js` y `precioSelectorVariantes.test.js` en verde; una prueba nueva fija que un producto no migrado de 10 días sigue «Nuevo», y otra que un migrado leído solo con los campos del `select` de TX-34 D1 más `metadata.migration.migrationId` y `originCreatedAt` no sale «Nuevo».
  - **Éxito:** la suite de `tests/sitios` igual a la base.
- [ ] 14.8 **Diff aprobado (tienda).** Texto alternativo (N2):
  - Estado (F530-B14, parcial): hecho el lector, el saneo al importar y al editar (`utils/textoSeguroPagina.js`, `exports.edit`), `todasLasImagenes` con `alt` y la caracterización de la edición (`tests/productos/editarSeoAlt.test.js`). Pendiente, espera la fila de la tienda: uso del alt en ficha y tarjeta (`siteHtml.js`) y las pruebas M6 de render (escritas como `todo` en `tests/sitios/altFotoVitrina.test.js`).
  - el lector toma el alt de cada foto; `todasLasImagenes` lo pasa; la ficha y la tarjeta lo usan;
  - **caracterización del formulario de producto del Seller** (`crear-productos.component.ts:3295-3296`): un producto con `alt` se edita y se guarda, y el `alt` sigue ahí.
  - **Éxito:** pruebas en verde.
- [ ] 14.9 **Diff aprobado (tienda).** SEO (N3). Espera a que F2-41 haga commit de `controllers/sites.js`.
  - Estado (F530-B14, parcial): `seo` en la raíz con saneo 70/320 al importar y al editar, con prueba (`tests/storeMigration/seoAltSaneo.test.js`). Pendiente, espera la fila de la tienda: `fichaSeo`, canónica por título y escape en `<title>`/meta/JSON-LD (`sites.js`, `siteHtml.js`); campos SEO del formulario del Seller solo si la pregunta 6 los aprueba (F530-F03).
  - `seo` en la raíz del producto desde el lector;
  - `fichaSeo` lo usa; la URL canónica pasa a armarse con el título del producto (`producto.titulo`) y no con `fichaSeo.titulo`; la ruta y el JSON-LD siguen con el título;
  - los campos del formulario del Seller, solo si la pregunta 6 los aprueba;
  - prueba: un título SEO no cambia la canónica.
  - **Éxito:** en verde.
- [ ] 14.10 `[P]` Descripción limpia (N4) con `descripcionSegura` en los lectores. **Éxito:** la prueba 1.2 de la revisión privada en verde.
- [x] 14.11 `[P]` Tope de 20 simulaciones cada 15 minutos por empresa (N5) en `routers/importStore.js`. **Éxito:** las pruebas 1.3 y 2.1 de la revisión privada en verde; con la bandera apagada sigue el 403.
- [ ] 14.12 `[P]` Guarda `WOO_INTEGRATION_ACTIVE` (W1) en la simulación y en `products`, `photos`, `redirects` y `customers`. `importStoreGuard` suma los casos activa e inactiva. **Éxito:** en verde; nunca se lee `integration_secrets`. _Parcial (F530-B01): hecho en simulación, `products` y `redirects` (`revisarWoo` exportada); falta `photos` (F530-B10) y `customers` (F530-B15/B16)._
- [ ] 14.13 Lector de WooCommerce (W2) y redirecciones probables (W3). Reemplaza la 10.1. Depende de 14.4 a 14.6 y de 14.21a.
  - encabezados del wiki y en español (`UNKNOWN_FORMAT` si faltan las mínimas); `Published` con los valores del wiki;
  - la regla de `sanitize_title` («Men's Shirt» → `mens-shirt`) y la base de direcciones (`productBase`, `categoryBase`, `BASE_ASSUMED`).
  - **Éxito:** `wooProducts.test.js` ampliado en verde; perfil del front sin `if` por proveedor.
  - *Estado (F530-B09):* parcial. Hecho en el backend: `readers/woocommerce.js` (tabla de alias en inglés y español, tipos, ejes por nombre, unión por SKU del padre, oferta con fechas, IVA por estado y clase con `taxClassMap`, existencias E2, estado, fotos, categorías), `slugProbable` (`sanitize_title`), bases y `urls[]` en `redirects` (`BASE_ASSUMED`, `SLUG_PROBABLE`), `wooProducts.test.js` ampliado (18 pruebas) e `importStoreWoo.integracion.test.js`. Los encabezados en español son una suposición hasta el export real (0.4). Falta el perfil del front sin `if` por proveedor (F530-F01, tareas 8.x): al cerrarlo se marca [x].
- [x] 14.15 **Diff aprobado (productos).** Rutas `photos` y `photos/pending` (`design-fotos.md`):
  - contrato e `importStorePhotos.writeSet.contract.test.js` en rojo primero;
  - `runId` en la llave del lote: retomar con otro `runId` copia lo pendiente; repetir el mismo lote devuelve `replayed`;
  - `photos/pending` solo lee y responde números; índice compuesto de `migration_audit` en `firestore.indexes.json`;
  - usa `photoCopy.js` de TX-37 (su tarea 8.1, que se adelanta si hace falta, con su revisión privada);
  - el archivo nuevo entra en `manual` de `syncDetector.js`.
  - Depende de 6.1 y de TX-37 8.1.
  - Hecho (F530-B10): `photoCopyStep.js`, `POST photos` y `GET photos/pending`; pruebas `importStorePhotos.writeSet` y `importStorePhotos.security`. El índice compuesto está solo en `firestore.indexes.json` (el despliegue de índices sigue bloqueado; se confirma en 12.2).
  - **Éxito:** contrato en verde; ningún log ni rastro con la URL.
- [ ] 14.16 Front (con 8.x):
  - paso «Copiar fotos» con progreso, aviso de no cerrar la tienda anterior y «Copiar fotos pendientes» (lee `photos/pending`);
  - aviso de la lista Público con su botón (pregunta 1); aviso del plan gratis (`PLAN_LIMIT`);
  - IVA «para los productos gravados», la pregunta obligatoria «¿tus precios incluyen IVA?» con el ejemplo, y la asignación de las clases de Woo;
  - formato detectado; pegar direcciones reales de Woo y confirmar la base;
  - campos SEO del formulario de producto (si se aprueba la pregunta 6).
  - Regla de diseño D-400; ninguna clase nueva con «p-».
  - **Éxito:** `npm run build:prod` sin errores; no suben los gradientes ni los primarios prohibidos; revisión a 1440 y 390 px.
- [ ] 14.17 FLORECER (con 12.x): medir de punta a punta con 500 productos (simulación, productos, existencias, **fotos** y redirecciones) y anotar el tiempo de la copia. **Éxito:** menos de 60 minutos, o la decisión de Daniel sobre la concurrencia.
- [ ] 14.18 Higiene, **solo Daniel o quien él autorice** (este cambio no actualiza tickets, otras propuestas ni el contrato):
  - **Resolución de F2-16** (#1226, cd jfhD2Pfc95VcRaoGIXbv). Solo se cambia la parte de su segunda frase sobre las variantes; lo demás (personalización, adicionales, galería, opiniones, relacionados, entrega y lo que quedó fuera) se conserva. Hoy dice: «tiene variantes (talla, color, sabor) con su foto, precio y disponibilidad, y estos cambian al elegir la variante». Texto propuesto: «tiene variantes (talla, color, sabor) con su foto y su disponibilidad, que cambian al elegir la variante. El precio es el del producto: una variante con otro precio se maneja como otro producto (D-214); el precio por variante no está hecho».
  - **Nota en WP-INT 5** (#1290): el importador CSV usa `variantes[]`, y un comercio con la integración activa no importa hasta su decisión.
  - **Nota en WP-INT 3** (#1288): la llave del cliente (pregunta 11).
  - **TX-34 (`tienda-celular-y-velocidad`):** el `select` de la proyección (D1) suma `metadata.migration.migrationId` y `metadata.migration.originCreatedAt`, y el orden `novedad` (D6), la insignia y el cupo del plan gratis usan `fechaDeNovedad` (N1).
  - **CONTRACT:** anotar T·3 y las aprobaciones de 14.0a y 14.0.
  - La resolución de F5-30 ya se corrigió el 21-oct (14:20 UTC): no remite a «F5-30b». Verificado con `get_support_ticket`.
- [ ] 14.19 Validación de documentos: `openspec validate importador-migracion-tiendas --strict`. La CLI no está instalada en esta máquina (21-oct); se corre donde esté. **Éxito:** pasa sin errores.
- [x] 14.20 **Diff aprobado (tienda).** Plan gratis (E1, pregunta 15): `plan` y `PLAN_LIMIT` en la simulación; `idsVisibles` con `fechaDeNovedad`; `TARGET_HIDDEN_BY_PLAN` en `redirects`. **Caracterización antes:** una empresa gratis sin migrados ve los mismos 50 productos que hoy. **Éxito:** `importStoreDryRun.noWrites` en verde y una empresa gratis con 38 productos que importa 500 sigue viendo sus 38.
  - Estado: hecho en el importador (`limitesPlan.idsVisibles` ordena con la fecha de origen y el migrado sin fecha va al final; `TARGET_HIDDEN_BY_PLAN` en `redirects`; `currentDisplaced` da 0). Pendiente de la fila de la tienda: `productosVisiblesDelPlan` (sites.js) solo selecciona `createdAt`/`fechaCreacion`, así que debe sumar `metadata` a su `select` para que el cupo real reconozca lo migrado.
- [x] 14.21b Productos sin control de existencias, **E2** (pregunta 16). Depende de 14.21a. Lee `Inventory tracker`, `Continue selling…`, `Stock`, `In stock?` y `Backorders allowed?`; `inventariable: false`, sin filas para `importInventory`, `NOT_TRACKED` y `TRACKING_MIXED`. **Éxito:** el e-book y el perfume de la plantilla entran vendibles y sin movimiento; los contract tests de inventario sin cambios.
- [x] 14.22 **Diff aprobado (tienda), si la pregunta 18 lo deja aquí.** Ficha de un producto migrado sin integración (E3): cada talla sigue la disponibilidad del producto. **Caracterización antes:** `precioSelectorVariantes`, `detalleComercialProducto` y «un producto de Cereza con una talla en 0 sigue agotado en esa talla». **Éxito:** suite de `tests/sitios` igual a la base, más el caso nuevo.
- [ ] 14.23 **Diff aprobado (clientes), si la pregunta 19 lo deja aquí.** `readers/wooCustomers.js` (W5) con la normalización de 9.1; con `source: "woocommerce"`, `customers` nunca crea autorizaciones. Va con la sección 9 y su concepto legal (0.7). **Éxito:** 1.5 ampliada en verde.
