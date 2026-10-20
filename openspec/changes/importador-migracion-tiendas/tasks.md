## Convenciones

- `[P]`: paralelizable con otras `[P]` (no comparten archivos). **Diff aprobado:** módulo sensible; un cambio a la vez, con el diff visto por Daniel antes de aplicarlo.
- Backend: `node tests/storeMigration/<archivo>` desde `functions/`, con simulador de Firestore que revienta ante una colección inesperada y red reemplazada; sin credenciales. Front: `node --test tests/migracion/<archivo>` con `ts-node`.
- Toda tarea de código cierra con `node --check` limpio o `npm run build` sin errores. Antes de editar se leen el archivo y su `git diff` (otras sesiones tocan `onboarding.js` y `sites.js`). Nada de `git add -A`.
- Sin relleno de datos: la simulación es el `--dry-run`. Ningún agente escribe en producción ni enciende banderas.

## 0. Compuertas (en este orden: specs → diseño → tareas)

- [ ] 0.1 Daniel aprueba las cuatro specs de `specs/`. **Éxito:** `openspec validate importador-migracion-tiendas --strict` pasa (verificado el 2026-10-18) y la aprobación queda en la entrada de D-498 en `specs/CONTRACT.md`.
- [ ] 0.2 Daniel confirma los valores por defecto (`design.md`, Open Questions 1 a 21) y aprueba `design.md`, `design-escritura.md`, `design-clientes.md` y `contracts/import-store-api.md`. Depende de 0.1. **Éxito:** D-498 registra los valores, la ampliación del write-set (pregunta 16) y la excepción al Artículo IX (Angular 14). Todo cambio va primero al documento.
- [ ] 0.3 Daniel aprueba este `tasks.md`. Depende de 0.2.
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
  - *Estado:* escrita y **en rojo hasta 6.1** (hoy `products` responde 501). La forma del producto y la actualización acotada ya pasan por el upsert real en la prueba de 4.2. El simulador ahora reemplaza un mapa vacío como Firestore (`simulador.test.js`), así que la condición de `exposicion` sí puede fallar; `migrationProduct.test.js` lo comprueba con un control sin la copia.
- [x] 1.4 `[P]` `importStoreRedirects.contract.test.js`: solo `draft.redirecciones` (`published` intacto); manuales primero y sin cambios; lo generado se reconoce por `metadata.migration.handle` y se actualiza; destino inexistente → `TARGET_MISSING`; tope 500 con sobrantes reportadas; sitio ajeno → 404; repetir no duplica.
  - *Estado:* escrita; el 404 ya pasa y el resto queda **en rojo hasta 7.1**.
- [ ] 1.5 `[P]` `importStoreCustomers.writeSet.contract.test.js` (fase 1b): los casos de `design-clientes.md`, incluidos el correo suprimido en otra tienda, el celular con otro formato y la reversa con más de 500 documentos.
- [x] 1.6 `[P]` Dorado de categorías: con lotes de prueba, `importProducts` escribe el mismo árbol, `categorias` y `categoriasIndex` que en `HEAD`, y responde el mismo 409. Los valores salen del código actual. El dorado de fotos sigue en verde.
  - *Estado:* `categoriasImportProducts.golden.test.js`, con los valores sacados de `HEAD` en `fixtures/dorado-categorias-importProducts.json`; en verde antes y después de 3.1.
- [ ] 1.7 `[P]` Pruebas de los lectores sobre los fixtures de 0.4: `shopifyProducts.test.js` y `wooProducts.test.js`. Cubren agrupación, ejes por nombre, separación por precio, más de dos ejes, color de la foto, estado, referencia, suma de cantidades y la tabla de precio sin IVA tomada del modal. Depende de 0.4.
  - *Estado:* escritas sobre los fixtures sintéticos. Shopify en verde; WooCommerce **en rojo hasta 10.1**. Sin marcar hasta repetirlas con los exports reales (0.4).
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

- [ ] 6.1 **Diff aprobado** (productos). Ruta `products` sin existencias: candado, lote repetido, guarda, categorías (3.1), todas las coincidencias y `katuq-product-upsert.execute` sin modificarlo. Depende de 5.1. **Éxito:** 1.3 y 1.9 en verde; `git diff` vacío en `katuq-product-upsert.action.js`.
- [ ] 6.2 **Diff aprobado** (inventario), después de aplicar 6.1: `importInventory` en proceso, solo para los creados (o los existentes con la casilla), y `INVENTORY_FAILED` en el reporte. **Éxito:** contract tests de inventario sin cambios y en verde; `git diff` vacío en `importInventory` y sus pruebas.
- [ ] 6.3 Repetición: el mismo archivo dos veces no duplica productos ni movimientos y devuelve los `cd`; con una venta en medio, la bodega conserva lo vendido.

## 7. Redirecciones

- [ ] 7.1 Ruta `redirects` con fusión transaccional en `draft.redirecciones`. Depende de 4.3 y 6.1. **Éxito:** 1.4 en verde.

## 8. Front (fase 1a)

- [ ] 8.1 `[P]` Lógica pura en `src/app/components/migracion-tienda/logica/`, probada en `tests/migracion/`: ningún producto partido entre lotes, inventario unido por `Handle`, suma de respuestas, CSV sin datos personales y sin `if` por proveedor. Depende de 0.4.
- [ ] 8.2 `MigracionTiendaService` (`providedIn: 'root'`, `extends BaseService`, `postSinLoader`) y `MigracionTiendaGuard`. **Éxito:** sin `HttpClient` en componentes ni `HttpClientModule` en el módulo.
- [ ] 8.3 Módulo lazy `migrar-tienda`, un componente standalone OnPush por paso (D-400), con avisos de guardas, sobrantes, `INVENTORY_FAILED` y descarga del reporte. Botón «Traer mi tienda» en Mis sitios y Productos, solo con la bandera. Depende de 8.1 y 8.2.
- [ ] 8.4 `npm run build:prod` sin errores; no suben los conteos de gradientes ni de primarios prohibidos; revisión a 1440 y 390 px.

## 9. Fase 1b: clientes. **Diff aprobado.** Requiere 0.7 y las respuestas 3, 4 y 19 a 21

- [ ] 9.1 `readers/shopifyCustomers.js` y su normalización, con prueba sobre el fixture. Depende de 0.4.
- [ ] 9.2 El origen `importacion` y `registrarImportacion` (`design-clientes.md`). **Éxito:** las pruebas de suscripción existentes y la nueva, en verde.
- [ ] 9.3 Las rutas `customers` y `DELETE customers/:batchId`. Depende de 9.1, 9.2 y 6.1. **Éxito:** 1.5 en verde.
- [ ] 9.4 El paso de clientes en el front, con la casilla de declaración. Build sin errores.

## 10. Fase 1c: WooCommerce

- [ ] 10.1 `readers/woocommerce.js` y su perfil en el front. Depende de 0.4 y 4.1. **Éxito:** 1.7 (Woo) en verde, sin cambios en las rutas.

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
- [ ] 13.3 Retirar la bandera el 2027-03-31 (Artículo XII) y abrir las propuestas aparte: ficha sin `variantes[].cantidad`, borrado por `migrationId`, Wix y copia de fotos.
