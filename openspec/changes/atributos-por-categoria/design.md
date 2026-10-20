## Context

D-495 (ticket 1234, F2-42). Los requisitos están en `specs/`. **Este diseño cubre F0 y F1.** F2 (facetas), F3 (plantilla), F4 (comparador) y F5 (feed) tendrán sub-cambios propios. Backend `katuq_admin_back_firebase/functions/` (`backend-aws-security`), leído el 2026-10-18.

- **Maestro:** `categoria` es el árbol `flatted` de 3 niveles, sin ids. Nada garantiza un solo documento por empresa:
  - `onboarding.js:955` elige uno por puntaje y conserva los legacy;
  - `createCategoria` (`categorias.js:148`) borra `results[0]` y crea otro;
  - `diagnostics.js:430` hace `add`;
  - el front lee `r[0]` (`list.component.ts:294`, `crear-productos.component.ts:3001`).
- **Otros escritores del maestro:** Osmosis (`tx.update`), `onboarding.js:3101` (`categoria`), `:4352` (`categoria`, `categorias` plano e `importBatchId`) y `:978` (`set` con `merge`). `GET /v1/categorias/all` devuelve el documento entero y Maestros lo reenvía en `guardar()`.
- **Ruta del producto:** cadena `parent` en el formulario (`construirRuta`, `:1527`, llamada en `:2921`), `ruta` en el importador y arreglos de texto en OMS (forma 5).
- **Productos:**
  - `exports.edit` (`productos.js:1790`) hace `update({...snapshot, cd, ...body})` y llama `syncProduct`;
  - `createMultiple` e `importProducts` (`onboarding.js:3145`) arman el producto campo por campo; el import crea con `set` sobre un id nuevo (`:3406`);
  - `katuq-product-upsert` hace `set({...canonical}, {merge: true})`.
- **Tienda:**
  - `getSearchIndex` (`productos.js:83`) tiene registro por empresa y proceso, con TTL de 5 min;
  - `productoParaFicha` (`vitrinaProducto.js:273`) alimenta la ficha (`sites.js:6195`) y `productoPublico` (`:8238`, WebMCP);
  - `datosEstructurados` está en `siteHtml.js:5165`;
  - la ficha responde `max-age=60, stale-while-revalidate=300` (`:6754`) y hoy no lee `categorias`.
- **Pruebas:** `scripts/lib/firestoreFalsa.js` mezcla en profundidad en `update` y no entiende rutas con punto, `FieldValue.delete()` ni `batch()`. `tests/inventory/*.emulator.test.js` usan el emulador.

## Goals / Non-Goals

- **Goals:** criterio 2 con el write-set cerrado; ninguna lectura nueva por consulta del catálogo ni por vista de ficha; con la bandera apagada, respuestas idénticas (única excepción: `createCategoria`, D3).
- **Non-Goals:** los de la propuesta, más las facetas de disponibilidad y de valoración.

## Decisions

### D1. Modelo
- **`categorias.attributeSchemas`:** `routeKey → {attributes: AttributeDef[], aliases[]}`.
  - `routeKey` une con ` > ` los niveles pasados por `claveCategoria`. Si dos rutas dan la misma clave, no admiten atributos.
  - `aliases` guarda las claves viejas tras un renombre; solo las escribe el servidor.
- **`attributeSchemasVersion`:** entero.
- **`AttributeDef`:** `{key, label, type: text|number|option|boolean, options?, multiple?, unit?, required, filterable, comparable, section: specs|compatibility, order}`.
  - `key` cumple `^[a-z][a-z0-9_]{0,39}$`, es única en su rama y es inmutable.
- **`products.attributes`:** `key → valor`. El valor es texto (hasta 120 caracteres), número, opción (hasta 10 si es `multiple`) o booleano.
- **Topes:**
  - 30 atributos efectivos por ruta y 300 por empresa;
  - 40 opciones de hasta 60 caracteres, sin `;` ni `|`;
  - etiqueta de 60 caracteres y unidad de 12;
  - esquemas hasta 200 KB y documento por debajo de 900 KB.
- **Opciones:** son texto. Si se renombra una, los valores viejos se ocultan. *Por defecto.*

### D2. Núcleo puro (`services/catalogo/atributosCategoria.js`)
- **`documentoDeCategorias(docs)`:** recorre en el orden de Firestore (por id) y toma el primero de mayor puntaje: árbol legible (2), arreglo `categorias` (1), nada (0). Es el puntaje de onboarding. Lo usan los lectores y escritores nuevos y `createCategoria`; el front lo espeja sobre `/all`.
- **`rutaDelProducto`:**
  1. `categorias.ruta`;
  2. cadena `parent`;
  3. etiquetas sueltas: cada una vale si una sola ruta termina en ella. Si las rutas forman una cadena, gana la más profunda; si divergen o una etiqueta tiene varias rutas, queda `ambigua` (*por defecto*);
  4. `aliases`.
- **`indiceDeRutas`, `esquemaEfectivo`, `validarEsquemas`, `validarValores` y `valoresVisibles`:** el esquema efectivo pone primero los ancestros. Al leer solo se muestra lo válido, y lo huérfano se conserva.
- Sin `if` por proveedor (Artículo VI). El front espeja `documentoDeCategorias`, `esquemaEfectivo`, el tipo y `rutaDelProducto` (este con el índice que devuelve el GET de esquemas), con el mismo fixture JSON; manda el servidor.

### D3. Endpoints y write-set
- **Endpoints nuevos:**
  - van detrás de `auth` y toman la empresa del token (`req.userInfo.company`);
  - sin sesión de usuario, por ejemplo con llave de servicio, responden 401 antes de `requireFeature("categoryAttributes")`.
- **Handlers existentes que se tocan:** conservan cómo resuelven la empresa. Su endurecimiento va en un cambio del backend privado (tarea 0.7).

| Endpoint | Hace |
|---|---|
| `GET /v1/categorias/attribute-schemas` (nuevo) | Devuelve `{version, schemas, indice}` del documento elegido. `indice` trae rutas, etiquetas y colisiones del árbol, sin imágenes |
| `PUT` misma ruta `{version, schemas}` (nuevo) | `runTransaction`: esquemas, versión+1 y `date_edit`/`user_edit`. Otra versión → 409. Ruta inexistente → 400, salvo una huérfana previa. Invalida el registro. No toca `categoria` |
| `POST /v1/productos/attributes` `{cd, attributes}` (nuevo) | `update` por ruta: `attributes.<key>`, y `null` → `FieldValue.delete()`. Otra empresa → 404; inválido → 400 con detalle. Responde `{written, removed, missing}`, sin `syncProduct` y sin mover `date_edit` |
| `GET /v1/categorias/all` | Quita `attributeSchemas*`: los 11 `getCategorias()` reciben lo de hoy |
| `POST /v1/categorias/create` (sin bandera) | `runTransaction`: toma el documento que Maestros editó (con la bandera, el de D2; sin ella, `r[0]`, el primero por id), conserva esquemas, aliases y versión, ignora los del cuerpo y aplica `renombres: [{de, a}]` (versión+1 si cambian). `tx.set` sobre ese documento, o `add` si no hay. Invalida el registro |
| `POST /v1/productos/edit` y `/create` | `attributes` sale de `updateData` y de `productData` antes del `update`, para no reescribir el snapshot. En `create`, del cuerpo |

- **Excepción declarada:** `createCategoria` cambia para todas las empresas, también las de D-385, porque borrar y crear perdería esquemas. Con un documento el resultado es el de hoy, con id estable. Se registra en la tarea 0.2.
- **Write-set:**
  - en `categorias`: `attributeSchemas`, `attributeSchemasVersion` y `date_edit`/`user_edit`;
  - en `products`: `attributes.<key>`, `attributesEditedAt` y `attributesEditedBy`.
- **Nunca:** `precio`, `preciosPorTipoCliente`, `variantes`, `integrations`, inventario, Price Lists ni flows (D-134). Tampoco `date_edit` del producto: es el cursor de `katuq-product-changed`, que alimenta el flow mixto `katuq-web-to-shopify` y reenviaría el producto a Shopify.
- **Revisión del 2026-10-19 (desvíos; se aprueban con los diffs de 3.1, 3.2 y 3.3):**
  - **Marca propia en `products`.** POST `/v1/productos/attributes` escribía `date_edit`/`user_edit`. Eso reenviaba el producto a Shopify y rompía el requisito «no reenviar el producto a las tiendas conectadas» de `specs/` (lo mismo que costó el ticket 1088). Ahora escribe `attributesEditedAt`/`attributesEditedBy`, y el producto no se reordena en las listas por `date_edit`. La alternativa la decide Daniel: volver a `date_edit`, aceptar el reenvío y corregir el requisito y los textos.
  - **El GET trae `indice`.** La pestaña «Especificaciones» resolvía la ruta solo por `ruta` y `parent`, mientras el servidor también usa etiquetas y alias. En raíces repetidas, en categorías renombradas y en la forma 5, la pestaña pintaba campos que el POST rechazaba, o no mostraba los que sí aceptaba. Ahora espeja `rutaDelProducto` con el índice del mismo documento que elige el servidor.
  - **`createCategoria` sin la bandera escribe `r[0]`.** Maestros, sin la bandera, edita y manda `r[0]`. Si el servidor escribía el documento de D2, en las empresas con varios documentos (4 en la medición) el árbol de `r[0]` reemplazaba al documento bueno cuando `r[0]` no tenía árbol legible. Con la bandera, los dos usan D2.

### D4. Seller
- **`CatalogAttributesService extends BaseService`:** `getSchemas`, `saveSchemas` y `saveProductAttributes`. El GET se hace solo con la bandera, al abrir el modal o la pestaña.
- **Maestros:**
  - con la bandera, elige el documento con el espejo;
  - la acción "Atributos" abre `CategoriaAtributosComponent` (standalone, OnPush), con lo heredado en solo lectura y una vista previa;
  - se deshabilita mientras el árbol esté sucio;
  - los renombres salen de un `WeakMap`.
- **Producto:**
  - pestaña "Especificaciones" con `EspecificacionesProductoComponent` (standalone, OnPush). Resuelve la categoría con el espejo de `rutaDelProducto` sobre lo que guardará el formulario. Si no hay ruta, dice por qué: sin categoría, ambigua, en colisión o fuera del árbol;
  - `saveProductAttributes` va en el `next` de crear y editar, sin `setTimeout`;
  - si falla, el aviso lo dice.
- **Obligatorio:** avisa y no bloquea. *Por defecto.*
- **Estilo:** design-system y `cfg-*` (D-400), sin gradientes, sin clases con "p-" y con color propio en cada span.

### D5. Tienda
- **Bandera:** `marcaDeLaEmpresaSinCache` pasa a `limit(2)` y solo da `categoryAttributes` (`isFlagOn`) si hay un único documento (regla D-385). Lo demás sigue con `docs[0]`.
- **`getCatalogSchemas(company)`:** se adelanta de F2 y usa el mismo registro de `getSearchIndex`.
  - En frío lee `select("categoria","attributeSchemas")` y guarda solo `{schemas, indice}`, sin el árbol ni sus imágenes.
  - Con el registro caliente, la vista de ficha no hace ninguna lectura más.
- **Datos:** `productoParaFicha(doc, categoriaId, esquema?)` sigue pura. Sin esquema devuelve lo de hoy.
  - La ficha y `productoPublico` pasan el esquema solo con la bandera y con `attributes`. Por defecto, el JSON también trae `especificaciones`.
- **Pestañas:** `role="tablist"` con etiqueta, valor y unidad.
  - Sin JS se ven las dos secciones; la vacía no sale.
  - Formato es-CO y tema del sitio.
- **JSON-LD:** `additionalProperty` (`PropertyValue`).
- **Tiempos:** un esquema nuevo se ve en 5 min o menos por proceso. Apagar la bandera tarda 12 min o menos: 5 de la marca, más 60 s y 300 s de caché compartida.

### D6. Bandera (Artículo XII)
- `featureFlags.categoryAttributes`, apagada por omisión.
- Dueño: Daniel. Retiro: 2027-04-30.
- Al apagarla, el Seller la esconde en el próximo inicio de sesión y la tienda en 12 min o menos. Los datos se conservan.

### D7. Observabilidad (Artículos VII y XI)
`logger`, sin valores ni datos personales:
- `catalogo.atributos.esquemas` `{company, documentos, rutas, definiciones, bytes, resultado, duracionMs}`;
- `catalogo.atributos.producto` `{company, productoId, escritos, borrados, invalidos, resultado, duracionMs}`.

### D8. Pruebas primero (Artículo VIII)
Las de contrato corren en el emulador (`*.emulator.test.js`, proyecto `demo-`), porque la falsa dejaría pasar justo los errores que se buscan.
1. **`atributosCategoria.test.js`:** 6 formas, alias, etiquetas en cadena y divergentes, `documentoDeCategorias`, herencia, topes y validación al leer.
2. **`esquemasAtributos.contract.emulator.test.js`:**
   - 401, 403, 409, 400 y 200;
   - `create` conserva, renombra con versión+1, ignora el cuerpo y mantiene el id;
   - `create` y PUT simultáneos sin pérdida;
   - varios documentos: con la bandera, el de D2; sin ella, `create` escribe `r[0]` y no toca el documento con árbol;
   - el GET trae el índice;
   - `/all` sin esquemas.
3. **`atributosWriteSet.contract.emulator.test.js`:**
   - solo cambian `attributes.<key>`, `attributesEditedAt` y `attributesEditedBy`; las demás claves siguen, también `date_edit` y `user_edit`;
   - `precio`, `preciosPorTipoCliente`, `variantes` e `integrations` quedan idénticos;
   - responde 401, 403 y 404, sin `syncProduct`;
   - `/edit` no pisa un POST que entra entre su lectura y su `update` (espía);
   - `/create`, `createMultiple` e `importProducts` ignoran el `attributes` del cuerpo;
   - canario: `update({attributes: {...}})` la hace fallar.
4. **`escritoresDeAtributos.contract.test.js` (estático):** solo los archivos permitidos escriben `attributes`; inventario no lo menciona.
5. **`fichaEspecificaciones.test.js`:** orden, unidades, sección vacía y `additionalProperty`. Con la bandera apagada, la ficha y `productoPublico` quedan idénticos.
6. **Front:** espejo con el mismo fixture, que incluye los casos de `rutaDelProducto` y el índice que devuelve el GET.

### D9. Gates
I: por aprobar. II: specs sin tecnología. IV: idempotente por clave. V y X: no aplican. VI: D2. VII y XI: D7. VIII: D8. IX: standalone OnPush, sin signals (excepción registrada). XII: D6. XIII: sub-cambios. XV: `integrations` intacto.

## Risks / Trade-offs
- **Escritores dinámicos (riesgo aceptado):** `katuq-product-upsert` copia lo que mapee un flow, y la prueba estática no lo ve. La lectura solo muestra lo válido; los flows de OMS no se tocan.
- **Varios documentos, maestro cerca de 1 MiB, forma 5 ambigua:** D2, lectura solo en frío y conteo; F0 frena si hace falta.

## Migration Plan
- **Datos:** sin migración.
- **Medición** (`scripts/medir-atributos-categoria.js --dry-run`, solo lectura): documentos de `categorias` por empresa (en todas, con máscara `company`), tamaño del documento y del árbol, rutas, colisiones, formas, ambiguos, productos con `attributes` en la raíz, y bytes del índice y del registro con 10 y 30 atributos.
- **Resultado de la medición (2026-10-18, producción, solo lectura, `bc5c93d2`):** solo conteos y bytes; KB = 1000 bytes.

  | | FLORECER | OH MY STORE |
  |---|---|---|
  | Documentos de `categorias` | 1 | 1 |
  | Documento / árbol (KB) | 31,9 / 12,3 | 19,6 / 19,4 |
  | Rutas · hojas · profundidad | 104 · 90 · 3 | 147 · 147 · 1 |
  | Colisiones · etiquetas con varias rutas | 0 · 6 | 0 · 0 |
  | Productos | 2166 | 8568 |
  | Con `attributes` en la raíz | 0 | 0 |
  | Ruta resuelta por `ruta` · `parent` · etiquetas | 66 · 906 · 1141 | 12 · 0 · 8455 |
  | Sin categoría · fuera del árbol · ambigua | 30 · 12 · 11 | 99 · 2 · 0 |
  | Índice de rutas (KB) | 12,8 | 10,7 |
  | Registro con 30 atributos, típico / peor caso con topes (KB) | 115,7 / 212,8 | 113,6 / 210,8 |

  - **Global:** 138 documentos de `categorias` para 133 empresas, todos con `company`. 129 empresas tienen 1 documento, 3 tienen 2 y 1 tiene 3.
  - **Paradas:** ni FLORECER ni OH MY STORE activan ninguna. En las dos, el documento está lejos de 700 KB, ningún producto tiene `attributes` en la raíz y el registro con 30 atributos queda por debajo de 250 KB, también en el peor caso.
  - **Parada activa: «más de un documento de `categorias`» (4 empresas, en el conteo global).** D2 ya define cuál se elige (`documentoDeCategorias`), pero la regla de 0.5 manda volver al diseño, así que F1 queda detenida hasta que Daniel decida si D2 basta para esas 4 empresas o si se resuelve antes de encender la bandera en ellas.
  - **Decisión de Daniel (2026-10-18): seguir con F1 tal cual.** La bandera se enciende primero en FLORECER; antes de encenderla en una de esas 4 empresas se revisa su caso.
  - **Revisión del 2026-10-19:** desde el despliegue (5.1) y con la bandera apagada, `createCategoria` escribe `r[0]` en esas 4 empresas, como hacía antes, y no el documento de D2. Antes de encender la bandera en una de ellas, se revisa que `r[0]` y el documento de D2 coincidan. Si no coinciden, se unifican, porque al encenderla Maestros pasa a editar el de D2.
- **Encendido**, cada paso con OK de Daniel: backend apagado, front, FLORECER y el comercio del ticket.
- **Reversa:** `scripts/set-company-feature.js`.

## Open Questions (por defecto; confirmar con Daniel)
1. Disponibilidad: solo lo vendible, sin filtro.
2. Valoración: fuera de esta fase.
3. Compatibilidad: `section: "compatibility"`.
4. Nombres de D1.
5. Endpoint propio, sin `syncProduct`.
6. `categoryAttributes`, con retiro el 2027-04-30.
7. Medir en OMS y FLORECER; probar en FLORECER.
8. Feed y marca resueltos en `5cbbe72f`; queda `g:product_type` (F5).
9. Opciones como texto; obligatorio sin bloqueo; etiquetas según D2.
10. `productoPublico` con especificaciones.
11. El endurecimiento de los handlers existentes se decide antes de desplegar F1 (0.7).
12. F2 a F5 en sub-cambios; se archiva al cerrarlos.
