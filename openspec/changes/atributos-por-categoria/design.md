## Context

D-495 (ticket 1234, F2-42). Los requisitos están en `specs/`. **Este diseño cubre F0 y F1 (aprobado y hecho).** F2 (facetas), F3 (plantilla), F4 (comparador) y F5 (feed) iban a sub-cambios propios; la **ampliación del 2026-10-21**, al final de este archivo y pendiente de aprobación, los diseña aquí. Backend `katuq_admin_back_firebase/functions/` (`backend-aws-security`), leído el 2026-10-18.

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

---

# Ampliación del 2026-10-21 — F2 a F5 y hallazgos (PENDIENTE DE APROBACIÓN)

> Lo de arriba (F0 y F1) está aprobado y hecho. Esta sección es nueva. Aplica D-518
> F2-42·1 a ·8. Backend `wt-back-tickets-web/functions` (`feature/tickets-web`, HEAD 097ede2e;
> líneas de HEAD). Front `wt-front-tickets-web/src`. El código vivo de cada punto está en
> `proposal.md`, «Ampliación», «Hoy, en el código». Revisión crítica del 21-oct aplicada.

## Goals / Non-Goals (ampliación)

- **Goals:** criterio 1 (facetas con conteos correctos), plantilla, comparador, feed y JSON-LD;
  1 s en caliente con 8.568 productos, de punta a punta (F2-42·5); sin escrituras nuevas fuera
  del write-set de F1; con la bandera apagada, catálogo, Kuvo, ficha, feed e importador
  idénticos a hoy.
- **Non-Goals:** disponibilidad (F2-42·1), valoración (F2-42·2), búsqueda en atributos y
  tolerante a errores (F2-42·8, TX-34·8), lectura mínima en frío (TX-34·7), interruptores
  propios de facetas o comparador (F2-42·7).

## Decisiones

### E0. La fuente de la tienda (pregunta 11, P18 de TX-34)
- El motor (E1) y el comparador (E9) no leen Firestore: reciben de **la fuente de la tienda**,
  por empresa, cada producto con `cd`, `activar`, canal web, categoría (`categorias`,
  `categoriasIndex`, `exposicion`), marca, ocasión, disponibilidad, `attributes`, precio de
  vitrina, oferta y precios por tipo de cliente.
- **Si se aprueba la proyección de TX-34 (D1, `indiceDeTienda`):** esa es la fuente. Ya trae
  `attributes` con la bandera y `preciosPorTipoCliente`; F2-42 no toca `getSearchIndex`.
- **Si no:** la fuente es `getSearchIndex` (+ `attributes` en la máscara) y el mapa de
  `cargarVitrinaDeEmpresa`, como se describe en E2 y E5.
- 9.2 y 9.3 (motor puro) no dependen de la decisión; 9.4 a 9.6 sí.
- **Hecho en 9.4 (3-nov, bloque F242-B06), pregunta 11 con la proyección:** `fuenteDeFacetas(company, marca)`
  (`controllers/sites.js`) decide por la bandera y no por el modo de `storeMobile.lightIndex`.
  - Bandera `categoryAttributes` ON, con el modo en `off`, `shadow` u `on`: la fuente de las facetas es
    `fuenteProy(company, false, {atributos: true})`. Es solo lectura de `products`. Con el modo en `off` es
    una lectura MÁS que las tres de hoy mientras el catálogo siga por el índice compartido; solo las reemplaza
    si el cableado (9.6) sirve, con la bandera ON, el catálogo, las facetas y los derivados desde esta misma
    fuente. El modo sigue decidiendo qué fuente sirve el resto de la tienda.
  - Bandera OFF, con cualquier modo: no hay fuente de facetas (`null`), no se piden atributos y no se calcula
    nada; el camino de hoy sigue por `conFuente` sin cambios.
  - `getSearchIndex` no cambia (prueba estática). La proyección suma `categoriasProducto` y
    `exposicionCategorias` a TODA entrada cuando se piden atributos, no solo a las que tienen `attributes`,
    porque la faceta de categoría cuenta a todos los productos por su ruta. Ese campo es memoria nueva de la
    proyección y entra en la medición de 9.9.
  - **Contrato para el cableado (9.6):** `indiceDeTienda` guarda un solo registro por empresa y pedir
    `atributos` sobre uno cargado sin ellos lo amplía (segunda lectura y otra `lista`). Con la bandera ON se
    piden `atributos` desde la primera vez (no una fuente sin ellos y otra con ellos en paralelo) y los
    derivados se arman sobre la misma `lista` que cuenta las facetas. Si la proyección falla, el catálogo
    se sirve sin facetas, como hoy.
  - **Orden de unión (9.11):** 9.2 y 9.3 (motor puro) → TX-34 D1 (proyección en modo sombra) → 9.4 → 9.5 y 9.6.
    El panel de filtros deslizable en celular es de `tienda-celular` de TX-34; F2-42 le entrega el mismo
    panel de facetas y no lo duplica.

### E1. Motor de facetas puro (`services/catalogo/facetas.js`)
- `filtrarYContar({productos, filtros, precioDe, derivados, esquemaFacetas})` →
  `{ids, total, facetas, rangoPrecio, filtrosActivos}`. No toca Firestore.
- Una sola pasada: cada producto evalúa el predicado de cada faceta activa y cuenta cuántos falla.
  - 0 fallos: entra al resultado y suma en todas las facetas.
  - 1 fallo: suma solo en la faceta que falló (así cada conteo aplica todo menos a sí mismo).
  - 2 o más: no suma.
  - Costo O(productos × facetas activas).
- O dentro de una faceta, Y entre facetas. Un valor múltiple suma en cada uno de sus valores.
- Recibe solo lo vendible y lo visible del plan (D-319): los conteos nunca cuentan productos
  ocultos, no publicados o fuera del plan.
- `consultarCatalogo` lo usa solo si recibe `conFacetas: true` y la empresa tiene la bandera
  (`marcaDeLaEmpresa(...).categoryAttributes`, regla D-385 de D5).
  - `conFacetas` lo pasan `catalogoPublico` y el render de la página; Kuvo (`catalogFor`) no, y
    queda idéntico.
  - Sin la bandera, el camino de hoy línea por línea, con instantánea (9.1).

### E2. Datos por producto, sin lecturas nuevas (dato en memoria que requiere aprobación)
- Sin proyección de TX-34: la máscara de `getSearchIndex` suma `attributes` y la entrada guarda
  `attributesObj`. Es el único cambio del índice, para todas las empresas; F0 midió 0 productos
  con `attributes`. Con la proyección, este punto no aplica.
- `derivadosDeFacetas(fuente, registro)` calcula una vez por producto: `ruta` (con
  `rutaDelProducto` sobre `{categorias, exposicion}`), sus ancestros, la clave de marca y los
  valores válidos normalizados (`interpretarValor`).
- Se guarda en un `WeakMap` cuya llave es el arreglo de la fuente, junto con la versión de los
  esquemas. Muere cuando la fuente se recarga o se invalida; no agrega TTL ni lecturas.
- **Es un dato guardado en memoria**, y la regla «sin capas de cache nuevas»
  (`openspec/config.yaml`) y D-518 TX-34·7 lo tratan como algo que necesita aprobación
  (pregunta 3). Sin esto, cada consulta volvería a parsear 8.568 categorías.
- Cada recarga de la fuente recalcula los derivados de todos los productos: ese costo se mide en
  frío (E12), porque Osmosis, Shopify y WooCommerce invalidan en cada sincronización.
- **Hecho en 9.4:** `services/catalogo/derivadosFacetas.js` (puro). `derivadosDeFacetas(lista, registro)`
  devuelve un `Map` por `cd` con `ruta`, `ancestros`, `etiquetas`, `marca`, `marcaNombre`, `ocasiones`,
  `oferta` y `valores`. `valores` trae solo lo válido para el esquema efectivo de la ruta y solo de los
  atributos filtrables o comparables (el comparador de E9 lee de ahí; guardar también los comparables suma
  memoria por producto y se mide en 9.9). Los arreglos de multiselección también son inmutables. El `WeakMap` guarda el `Map` con la
  firma de los esquemas: otro contenido de esquemas recalcula; un registro renovado con el mismo contenido
  reutiliza. Los derivados son inmutables. `esquemaDeFacetas(registro)` entrega al motor solo los atributos
  `filterable`, con herencia.

### E3. Filtros en la dirección
- `cat=<routeKey>`; `marca=<nombre>` repetible; `precioMin`, `precioMax`, `oferta=1`,
  `ocasion`, `q`; atributos `a.<clave>=<valor>` repetible, rango `a.<clave>=<min>-<max>`, sí/no
  `a.<clave>=si|no`.
- Siguen sirviendo `categoria=<etiqueta>`, `categoriaSlug`, `/c/<slug>` y `/marca/<slug>`. Una
  etiqueta se convierte en ruta si una sola ruta termina en ella (`indice.etiquetas`); si no, se
  filtra exacto como hoy.
- Topes (claves y valores desconocidos se ignoran y nunca se devuelven): ver revisión privada.
- El script escribe el estado con `history.pushState` y lo relee en `popstate`.

### E4. Qué facetas salen
- **Categoría:** sin categoría, las raíces; con una, sus hijas y la miga para subir. Cuentan
  también los productos de las subcategorías. Sin corte de 24.
- **Marca:** solo si `mostrarMarcas` está encendido (F2-42·7). Sin corte de 40. En
  `/marca/<nombre>` no sale, porque la página es esa marca.
- **Precio** (si `mostrarPrecio`): el rango sale de lo filtrado sin aplicar el propio precio.
- **Oferta y ocasión:** como hoy, pero entran a «Limpiar todo», a la dirección y al cruce Y.
- **Atributos** con «usar como filtro» del esquema efectivo de la categoría elegida. Sin
  categoría (búsqueda, `/marca`, «Todo»): los de la ruta común más profunda de los resultados,
  si existe (pregunta 4).
  - `option` y `boolean`: lista con conteo.
  - `number`: lista con conteo si hay 12 valores distintos o menos; si no, rango (pregunta 7).
  - `text`: lista si hay 30 distintos o menos; si no, no es faceta.
- Sale un valor con conteo 0 solo si está marcado. El servidor no corta (tope de seguridad de
  500 valores por faceta, con registro). La pantalla muestra 10 y «Ver todas (N)».
- Categorías ocultas (F0-02) y plan gratis (D-319): ya filtrados antes, como hoy.

### E5. Precio que ve el cliente (F2-42·4) (dato en memoria que requiere aprobación)
- La fuente de la tienda da, además del precio de vitrina, `porTipoCliente:
  Map<tipoClienteId, Map<cd, precio>>` con la regla de `precioParaCliente`
  (`utils/vitrinaProducto.js:137`): fila activa con `precioConIva > 0`.
  - Sin proyección: `cargarVitrinaDeEmpresa` (`sites.js:8332`) lo arma en la MISMA pasada, porque
    ya lee `preciosPorTipoCliente` de todos los productos. Agranda `preciosVitrinaCache` (TTL de
    10 min) con todas las listas mayoristas: entra en la pregunta 3 y su memoria se mide (9.9).
  - Con proyección: ya viene en ella.
- `precioDe(cd) = porTipoCliente.get(sesion.categoriaId)?.get(cd) ?? vitrina.get(cd)`. La
  sesión sale de `clienteDeAcceso` como hoy.
- Con precio de lista el producto no cuenta «en oferta» (igual que `precioParaCliente`).
- Faceta, rango, orden y comparador usan `precioDe`. Con sesión la respuesta ya es
  `private, no-store` (`:9085`). El render del servidor no conoce la sesión: pinta el precio
  público y el script vuelve a pedir con la sesión (evento `kq-sesion`, como hoy).
- Solo con la bandera (pregunta 5).

### E6. Respuesta del catálogo
- Con facetas suma `facetas: {categorias, marcas, precio, atributos[]}` y `filtrosActivos[]`
  (etiqueta y valor para los chips). Sin facetas, el JSON de hoy.

### E7. Tienda (`utils/siteHtml.js`)
- Panel como `<form method="get">` con un `fieldset`/`legend` y casillas por faceta. Sin
  JavaScript, un botón «Aplicar» envía el formulario; con JavaScript, aplica al cambiar.
- `pintarFacetas(data)` repinta el panel en cada respuesta, además de la rejilla.
- Chips de filtros activos que se quitan uno a uno y «Limpiar todo», que deja la categoría o
  la marca de la página y quita lo demás.
- Región `aria-live="polite"` con «N productos». Al limpiar, el foco va al título del catálogo.
- En celular, la hoja de filtros que ya existe; su forma de panel deslizable y su cierre con
  Escape o tocando fuera son de la capacidad `tienda-celular` de TX-34 (no de TX-34·5, que es el
  menú en cajón). F2-42 no duplica ese panel.
- Estilos con las variables del tema del sitio y `:focus-visible` (D-460); áreas de 44 px.
- Se revisa también con la plantilla `tecnologia-catalogo` de TX-36 (`data/siteTemplates.js:1141`).
- **Hecho en 9.7 (parte 1):** `utils/siteHtmlFacetas.js`. `vistaFacetas(h, M)` describe el panel una sola vez: el servidor la corre con un `h` que
  escribe HTML escapado y el navegador con otro que usa `createElement` y `textContent` (el script lleva su texto), así el HTML de una dirección
  compartida y el repintado son iguales por construcción y ningún valor entra como HTML (S2). El estado son los pares nombre=valor de la dirección;
  los enlaces y la dirección salen en un orden canónico. «Limpiar todo» quita todos los filtros y la búsqueda; deja solo lo que pone la ruta
  (`/c/<slug>`, `/marca/<slug>`) o `?categoria=`: la categoría de `?cat=` es un filtro y tiene su chip. La dirección con filtros solo se escribe en la
  página propia del catálogo (`?catalogo=1`, `/c/`, `/marca/`): el catálogo del inicio filtra sin cambiarla. La caché del HTML (`siteCacheClave.js`)
  distingue ahora `cat`, `a.<clave>` y las marcas u ocasiones repetidas (sin eso, una dirección con filtros recibía la copia de otra). Sin JavaScript, el
  rango numérico no se puede cambiar (un formulario no junta dos campos en `a.<clave>=min-max`); lo ya marcado viaja oculto y no se pierde, y el grupo del rango se oculta sin JavaScript para no ofrecer un control que no envía (decisión pendiente de Daniel: ampliar el lector de B05). El panel respeta `mostrarCategorias` y `mostrarPrecio` del bloque. La caché del HTML guarda con la clave base las páginas que no usaron los filtros (tiendas sin la bandera).

### E8. SEO de las direcciones con filtros
- Con filtros más allá de la categoría o la marca de la página: `robots noindex,follow` y
  canónica a la página de la categoría o la marca. El sitemap no cambia.
- **Hecho en 9.7 (parte 2):** «filtros más allá de la página» = cualquier `a.<clave>`, `q`, `ocasion`, `precioMin`,
  `precioMax`, `presupuesto` u `oferta` con valor, un `cat` o `marca` que NO nombre la propia categoría o marca de la
  página, o un chip que no sea la marca de la ruta; cuenta aunque el lector no reconozca el valor (una combinación
  inventada tampoco se indexa). `cat=` o `marca=` que nombran la propia página no son filtro extra (así el `noindex` nunca
  acompaña a una canónica que apunta a la misma dirección). `orden` y `pagina` siguen como hoy (`noindex`, sin canónica).
  La canónica es la página de la ruta (`/c/<slug>` aunque se haya elegido una subcategoría con `cat=`, `/marca/<slug>`);
  si la categoría de la ruta no está en la miga de lo elegido, se queda la de hoy (la categoría elegida, que es una página
  real) y, sin categoría ni marca, `/?catalogo=1` (con `?catalogo=1&cat=X`, la categoría X). Con `/marca/<slug>?marca=OTRA`
  manda la marca elegida, como hoy (decisión pendiente de Daniel). Solo con la bandera; si el motor de facetas cae al
  camino de hoy, la bandera se lee de la empresa y la regla sigue valiendo (S1 no se abre con el servicio degradado). Sin
  la bandera, nada cambia. `utils/siteHtml.js` deja salir la canónica junto al `noindex` solo cuando el controlador lo
  pide (`canonicaConNoindex`), contra el comentario de la cabecera (que lo evitaba en el resto de páginas; la señal de
  `noindex` con canónica a una página indexable es la que pide el diseño, y se vigila en Search Console antes de encender
  la bandera en un comercio con tráfico orgánico). La copia en caché de estas direcciones lleva siempre la clave con los filtros.

### E9. Comparador (F4)
- `GET /v1/sites/public/:slug/comparar?ids=a,b,c,d[&acceso=…]`, con el tope de `eventoLimiter`.
  - Sitio publicado, bloque de catálogo visible en lo publicado (como `catalogoPublico`,
    `:9043-9048`) y bandera; si no, 404.
  - Hasta 4 ids distintos; lo demás se ignora.
  - Candado: cada id debe estar en la fuente de la tienda de la empresa del sitio y pasar
    `esPublicableEnTienda` (`:8691`: activo, canal web, precio de vitrina mayor que 0, categoría
    no oculta de lo PUBLICADO) y `productosVisiblesDelPlan`. El candado de `productosPorIds`
    solo no basta. Lo que no pasa no viene, sin decir por qué. Detalle: ver revisión privada.
  - Devuelve vitrina, `precioDe` y `filas[]`: unión de los atributos «mostrar en comparador»,
    en el orden del primer producto, con `valores[]` (texto o null) y `difiere`. Los valores
    salen de los derivados de E2, no de los documentos.
  - Sin sesión, `public, max-age=60`; con `acceso` presente, `private, no-store`.
  - **Lecturas declaradas:** hasta 4 documentos por petición (`leerProductosDeTienda`), solo
    para foto, título y precio de vitrina, igual que `productosPorIds` (favoritos, hasta 30). No
    es una consulta de catálogo ni una vista de ficha; el requisito «La tienda no se vuelve más
    lenta» lo declara.
- Tienda: botón «Comparar» en la tarjeta (servidor y script) y en la ficha, solo con la bandera.
  - Selección en `localStorage` por sitio, envuelta en try/catch.
  - Barra flotante «Comparar (n)»; el quinto avisa «Máximo 4».
  - Diálogo con tabla (`role="dialog"`, foco atrapado, Esc cierra) y primera columna fija; en
    390 px la tabla se desplaza dentro de su caja, no la página.
  - **Hecho en 11.3 y 11.4 (copia local, 3-nov, B14):** `utils/siteHtmlComparador.js`. El servidor escribe el botón (tarjeta del catálogo y ficha; las del bloque «productos» y de venta cruzada no lo llevan); el script del navegador pone el mismo botón en las tarjetas que arma (gancho de `ficha(p,pos)` en `script()`), guarda la selección en
    `localStorage` con la clave `kq_cmp_<slug>` (ids con el patrón de `sanitizar.idFirestore`, a lo sumo 4, todo en try/catch: si falla, la selección
    vive en memoria), pinta la barra «Comparar (n)» (con `n` menor de 2 no abre y avisa), el aviso «Máximo 4 productos» (región `role=status`) y el
    diálogo. La tabla se pide a `/comparar` con la sesión del cliente si la hay (el navegador no calcula ningún precio) y todo texto del servidor entra con
    `textContent` (S2); la foto y el enlace solo se usan si son `https:` o una ruta propia. Filas con valores distintos: fondo suave y el texto «Valores
    distintos» (no solo color); «—» con «No aplica» (texto oculto) frente a «Sin dato». Lo que el servidor ya no entrega se saca de la selección. La
    columna de las características y el encabezado quedan fijos (`position: sticky`); en celular el cuadro ocupa la pantalla y solo la caja de la tabla
    se desplaza. Sin la bandera `comparador` no llega a `siteHtml.js` y el HTML y el script salen idénticos a los de hoy. Estilos con las variables del
    tema, sin degradados. Revisión: los avisos van a una región `role=status` siempre presente (no se esconde con la barra); al vaciar, el foco pasa
    al último botón de producto; la barra se apila con el aviso de cookies, el carrito, WhatsApp y KAI (variable `--kq-cmp-alto` para KAI); dos
    pestañas comparten la selección (evento `storage`); `activo()` es la única condición que enciende el comparador.

### E10. Plantilla por categoría (F3)
- **Seller, importador** (`import-modal`, solo productos y con la bandera): al descargar se
  puede elegir una categoría (rutas del GET de esquemas). Se suma la hoja «Especificaciones»:
  - `Referencia (SKU)` y una columna por atributo efectivo, `Etiqueta (unidad) [clave]`, o
    `(SI/NO)` en los sí/no. La clave entre corchetes es la que manda al leer.
  - En «Instrucciones», tipo, unidad y opciones válidas de cada atributo. Los valores múltiples
    se separan con `;` (D1 ya prohíbe `;` en las opciones).
- **Lectura:** se lee aparte, como «Precios por volumen». Vacía = no cambia; `(borrar)` borra
  (pregunta 2). Una fila sin referencia se avisa. Sin la bandera, la hoja se ignora en silencio,
  como hoy cualquier hoja que el importador no conoce.
- **Escritura:** `POST /v1/productos/attributes/lote` `{filas: [{fila, referencia, attributes}]}`,
  hasta 200 por petición, con la cadena de F1 (sesión de usuario, empresa del token, bandera).
  - La referencia se resuelve en **Firestore**, no en el índice en memoria: `products` con
    `company` de la sesión e `identificacion.referencia in [...]`, por tandas de 30, con `select`
    de referencia, `categorias`, `exposicion` y `attributes`. Así los productos que la misma
    importación acaba de crear se encuentran (`importProducts` no invalida el índice, y otro
    proceso lo tendría viejo hasta 5 min). Repetida o inexistente: error de fila.
  - Cada fila se valida contra el esquema de la ruta DEL PRODUCTO (`validarValores`) y se
    escribe como en 3.3 (`attributes.<clave>`, `attributesEditedAt/By`), sin `syncProduct` ni
    `date_edit`. Un solo `invalidateSearchIndex` al final.
  - Respuesta por fila `{fila, estado, escritos, borrados, errores[]}`; el modal la muestra y la
    deja bajar en Excel como «Filas rechazadas».
- Si el archivo trae filas en «Plantilla», `importProducts` corre como hoy y los atributos van
  después, en su `next`, sin `setTimeout`. Un archivo con solo «Especificaciones» no llama
  `importProducts`: así no se pisan campos (aviso de `productos.component.ts:215-240`).
- **Export** (Productos): con la bandera, se elige una categoría y se suma la misma hoja con los
  productos exportados cuya ruta (espejo de `rutaDelProducto` con el `indice` del GET de
  esquemas) es esa categoría o una subcategoría. Los valores salen de los documentos completos
  que el export ya trae (`fetchAllProductosParaExport`, hidratados con `db.getAll`): **sin ruta
  nueva** y sin valores viejos del índice.

### E11. Feed y JSON-LD (F5)
- Con la bandera, en `feedProductos`, sin lecturas nuevas (los documentos ya se leen en `:1856`
  y los esquemas vienen del registro):
  - `g:product_type`: la ruta con los nombres como los escribió el comercio, unida con ` > `,
    hasta 750 caracteres. Sin ruta, lo de hoy. Es el campo de Meta (`product_type`, 750) y de
    Google: un solo feed (F2-20).
  - `g:product_detail` por cada valor visible: `section_name` «Especificaciones» o
    «Compatibilidad», `attribute_name` la etiqueta, `attribute_value` el texto con la unidad;
    cada uno de 1 a 150 caracteres (se corta), hasta 100 por producto.
  - Se omiten los atributos cuya etiqueta normalizada repite un atributo propio del feed
    (marca, precio, envío, GTIN, referencia, título, descripción): Google lo prohíbe
    (pregunta 10).
- Sin la bandera, feed idéntico (instantánea 12.1).
- **Plazo de apagado:** el feed responde `public, max-age=1800` (`:1899`). Al apagar la bandera
  vuelve al de hoy en 35 min o menos (5 de la marca + 30 de caché), no en 12. Se declara en la
  spec y no se toca la caché (pregunta 14).
- JSON-LD: queda el de F1. Se valida con el Schema Markup Validator (cada `PropertyValue` con
  `name`, `value` y `unitText`) y con la prueba de resultados enriquecidos de Google, que no debe
  sumar errores ni advertencias frente a hoy. Google no lista `additionalProperty` entre sus
  propiedades de producto: no se promete resultado enriquecido por las especificaciones.

### E12. Velocidad (F2-42·5) y medición
- **Meta:** `catalogoPublico` con facetas, de punta a punta en el servidor y en caliente (fuente
  de la tienda cargada), p95 de 1 s o menos con los 8.568 productos de OH MY STORE. Incluye lo
  que la consulta ya hace además del motor: leer los 12 documentos de la página,
  `conCalificaciones`, `productosVisiblesDelPlan` y, con sesión, `clienteDeAcceso` y la segunda
  lectura de los 12 documentos. La página cumple además la meta de TX-34 medida como TX-34·6.
- **Costo en frío:** cuánto suma calcular los derivados (E2) y `porTipoCliente` (E5) a cada
  recarga de la fuente, sobre los 1,5 a 7,6 s en frío que ya midió TX-34 en FLORECER.
- **Frecuencia de recarga:** cuántas veces por hora se invalida la fuente en OH MY STORE y en un
  comercio con Shopify o WooCommerce, contada en solo lectura en los registros de sincronización
  (o, si no alcanza, por productos con `date_edit` en las últimas 24 h).
- **Memoria:** bytes de los derivados y de `porTipoCliente` por empresa (pregunta 3).
- **Regla de parada:** se para y se vuelve al diseño si el p95 de punta a punta pasa de 1 s, si
  los derivados suman más de 500 ms a la recarga en frío de OH MY STORE, o si la memoria pasa
  de 20 MB por empresa.
- `scripts/medir-facetas.js --company "<X>" --dry-run`: lee la fuente, precios y esquemas con las
  mismas máscaras (solo lectura), corre 6 escenarios 30 veces (motor y respuesta armada, con y
  sin sesión simulada) y da p50 y p95, costo en frío y bytes. Prueba de que no escribe, como 0.3.
- Registro `catalogo.facetas` `{company, productos, facetas, duracionMs}` solo si pasa de 500 ms.

### Resultado de la medición de E12 (bloque F242-B10, 2026-11-03; solo lectura)

> **Los datos son de la copia `katuq_dev` del día (D-579), NO de producción.** Antes de encender hay que repetir la
> corrida en una copia fresca. Script: `functions/scripts/medir-facetas.js` (backend `wt-back-tickets-web`). Exige
> `--dry-run`, no escribe (toda la base pasa por una envoltura que bloquea y anota cualquier escritura), se niega si
> `PGDATABASE` no es `katuq_dev` y solo enciende `categoryAttributes` **en memoria** para poder medir una empresa que la
> tiene apagada. En la copia, OH MY STORE tiene 8.608 productos (en octubre eran 8.568) y 3 tipos de cliente con
> precios de lista; FLORECER, 2.171 productos y ninguno. Ninguna de las dos tiene atributos cargados: por eso el
> script repite el motor con **atributos simulados en memoria** (30 % de los productos y 4 atributos por categoría
> raíz), que es el peor caso que debe aguantar.

**Resultado: CUMPLE. Ninguna regla de parada se activa.** 8 escenarios (catálogo completo, categoría raíz, categoría
profunda con marca, dos atributos marcados, rango de precio con orden, búsqueda con orden, el cruce más pesado de tres
grupos a la vez —categoría, marca, atributos y precio— y la búsqueda con el buscador encendido por memoria, que incluye los
valores de atributos) x 30 corridas, en caliente, con y sin una sesión simulada (el tipo de cliente con más precios de lista).
Una corrida cuenta solo si devuelve el catálogo con facetas y con resultados: una respuesta rápida que sea un 404, un 500,
una salida sin facetas o un escenario vacío deja el resultado en INCOMPLETO, no en CUMPLE.

**Qué es medido y qué es estimado.** Solo `catalogoPublico` (script con `--slug`, o la prueba de CI) es de punta a punta.
En OH MY STORE no hay un sitio publicado en la copia, así que allí «sin sesión» es la respuesta armada
(`consultarCatalogo`), que no busca el sitio ni las categorías ocultas, y «con sesión» es **una suma de p95 sueltos**
(respuesta armada + segunda lectura de 12 documentos + acceso del cliente): **estimado**. Los números de punta a punta de
verdad son los de la fuente sintética. El script marca cada uno en `reglas.p95PuntaAPunta.origen`.

| Regla de E12 | Tope | OH MY STORE (copia katuq_dev) | Fuente sintética de 8.568 (peor caso) |
|---|---|---|---|
| p95 sin sesión | 1.000 ms | 18 ms (la respuesta armada completa: motor, 12 documentos y calificaciones; **no es de punta a punta**) | 19 a 37 ms (`catalogoPublico` real sobre una base falsa, medido de punta a punta) |
| p95 con sesión | 1.000 ms | 27 ms (**estimado**: respuesta armada + segunda lectura de 12 documentos + acceso del cliente) | 34 a 69 ms (medido de punta a punta) |
| p95 con atributos simulados | 1.000 ms | 18 ms (**estimado**: motor + 12 documentos + acceso) | ya incluido arriba: la fuente trae atributos en el 30 % |
| Derivados + `porTipoCliente` en cada recarga en frío | 500 ms | 26 ms (derivados 22, listas 4); con atributos simulados 65 ms | 30 a 35 ms (derivados 19 a 23, listas 11) |
| Memoria que F2-42 suma por empresa | 20 MB | 6,8 MB (atributos y categorías retenidos 3,5; `porTipoCliente` 1,3; derivados 1,9) | 13,5 MB (6,0 + 5,3 + 2,2) |
| CPU p95 de una consulta | 200 ms (Q-S2) | 20 a 40 ms como máximo (cuatro corridas) | 108 ms como máximo (incluye el costo de la base falsa) |

- **Fuente sintética:** 8.568 productos, 180 rutas en forma 5 (arreglos de texto sin ruta), **12 tipos de cliente con
  precio de lista en cada producto** (el peor caso de `porTipoCliente`), atributos en el 30 % y 10 % en oferta. La
  Firestore falsa recorre todas las claves en cada consulta: el número es conservador. Se corrió dos veces.
- **El motor es barato; lo caro de la página sigue siendo la lectura:** el motor responde en 3 a 5 ms p95 con los
  8.608 productos de OH MY STORE (hasta 20 ms con los atributos simulados); la respuesta armada, en 13 a 18 ms,
  de los cuales 7 a 9 ms son la lectura de los 12 documentos.
- **Costo en frío de F2-42 por recarga de la proyección:** 26 ms de CPU (65 ms con atributos simulados) más la
  lectura ampliada de `products` (atributos, categorías y listas): entre 0,2 y 0,4 s más en cinco corridas,
  sobre unos 3,1 s que ya tardaba la lectura de TX-34 en OH MY STORE (FLORECER: 0,04 a 0,08 s sobre 0,9 s). La petición
  que dispara la recarga paga ese costo completo; es el de TX-34 y no entra en la meta, que es «en caliente».
- **Ojo con el margen de los 500 ms:** la regla de E12 cuenta solo derivados y `porTipoCliente` (26 a 65 ms). Si a eso
  se le suma la lectura ampliada de `products`, la recarga en frío de OH MY STORE queda entre 0,3 y 0,47 s: pegada al tope.
  El script lo avisa como advertencia cuando la suma pasa del 80 % del tope (en la última corrida: 473 ms), sin cambiar el
  veredicto. Esa lectura se midió con pocas cargas (3 por tipo): repetirla antes de encender.
- **Memoria, el margen más corto:** la fuente sintética gasta 1,6 KB por producto con 12 tipos de cliente (20 MB
  alcanzan para unos 12.700 productos así); OH MY STORE, 0,8 KB por producto con 3 tipos (unos 25.000 productos). Un comercio con más de unos
  12.000 productos y muchos tipos de cliente con lista en cada uno se acerca al tope: volver a medirlo antes de
  encenderle la bandera. Las categorías crudas que ahora retiene toda entrada con atributos son la parte más grande
  (3,5 MB en OH MY STORE): si algún comercio pasa el tope, se guarda la ruta ya resuelta en vez del crudo
  (nota de 9.4).
- **Frecuencia de recarga (recurso alternativo de E12, `date_edit` en las últimas 24 h):** OH MY STORE tuvo 530
  productos editados en 12 de las 24 horas, hasta 131 a 158 en una sola. `date_edit` es un **piso**: Osmosis, Shopify y
  WooCommerce invalidan la proyección en cada sincronización sin tocar `date_edit`. El **techo** es 12 recargas por hora
  (el TTL de 5 minutos), unos 0,3 a 0,44 s extra de F2-42 cada una, es decir 4 a 5 s de trabajo por hora, entre 0,1 y
  0,15 % de un núcleo. **Estas cifras son por instancia de la función**: cada instancia activa guarda su propia
  proyección, paga su lectura en frío y su memoria. FLORECER: 0 productos editados.
- **Q-S2:** la CPU por consulta queda lejos de los 200 ms. La decisión y su texto para Daniel están en la revisión
  privada de seguridad.
- **Qué no se midió:** el comercio con Shopify o WooCommerce (los registros de sincronización de producción quedan
  bloqueados) y `catalogoPublico` de punta a punta sobre un sitio real publicado (OH MY STORE no tiene sitio en la
  copia; el script lo mide con `--slug`, y con sesión con un token en la variable de entorno `MEDIR_FACETAS_ACCESO`; la
  prueba de CI lo mide sobre la fuente sintética). Tampoco se mide el orden «más vendido», que lee ventas de los pedidos.
- **Búsqueda con el buscador encendido:** en OH MY STORE el motor responde en 5 ms p95 (8 ms con los atributos
  simulados, que sí entran en la búsqueda) y el cruce de tres grupos, en 3 ms (6 ms con simulados). Ninguna de las dos
  empresas tiene hoy el buscador encendido ni atributos reales visibles.

### E13. Accesibilidad (TX-35, #1250)
- Panel, chips, pestañas de F1 (teclado con flechas) y comparador: axe-core con reglas
  WCAG 2.1 A/AA en 0 fallas a 1280 y 390 px, como D-460; foco visible y nombres accesibles
  (cada casilla dice el valor y su conteo).
- **Hecho en 9.10 (copia local, 3-nov, B12):** 0 fallas de axe (WCAG 2.1 A/AA) DENTRO del catálogo con facetas y de las
  pestañas de F1, a 1280 y 390 px, con tres tiendas. En la página entera quedan dos fallas que la tienda ya tenía con y
  sin bandera y que no se tocaron para no cambiar el HTML ni la hoja de todas las tiendas: el enlace «Ir al inicio» del
  encabezado y el contraste de «Plazo de entrega» y «Quedan pocas unidades». Decisión pendiente de Daniel. El comparador
  (F4): 0 fallas de axe (comparador y página entera, salvo esas dos) cerrado y abierto, a 1280 y 390 px, con tres tiendas (B14, 11.4).

## Hallazgos (H1, H2 y H3 son del paso 3 de D-518 y no esperan la aprobación de la ampliación)

- **H1. Empresa única.** La tienda lee la bandera con `where("nomComercial","==", sitio.company)`
  y `limit(2)` (`marcaDeLaEmpresaSinCache`, `sites.js:7661`): con dos documentos, o con un
  `sitio.company` que no sea igual al `nomComercial`, queda apagada sin aviso.
  `requireFeature` y `set-company-feature.js` normalizan el nombre y rechazan homónimos
  (`services/companyFeatureFlags.js:221-254`). Antes de 5.3 y de Baudio: simular
  `set-company-feature.js` y comparar `sitio.company` con el `nomComercial`, en solo lectura.
- **H2. Quién toma el primer documento de `categorias`.** Solo importa en las 4 empresas con
  varios documentos y con la bandera encendida: ahí Maestros y `createCategoria` usan
  `documentoQueEditaElMaestro` (D2) y estos toman el primero por id:
  - `categoryAssignment.leerArbol` (`:103`) y `guardarArbol` (`update` sin transacción, `:164`).
    **Dueño: D-498** (`importador-migracion-tiendas/design-ampliacion.md:116-119`, tarea 14.14).
    Este cambio no lo duplica; 8.2 depende de él. La transacción de `guardarArbol`, pregunta 13.
  - `importCategories` («Importar categorías» de Maestros): `limit(1)` (`onboarding.js:3710`) y
    `update` (`:4241`).
  - Osmosis `_ensureCategoriasEnMaestro`: `limit(1)` (`osmosisProductSyncService.js:774`).
  - Solo lectura: `checkCategoriesExist` (`onboarding.js:1952`), `tiendaEnUnPaso.loadCategories`
    (`tiendaEnUnPaso.js:220`), `fichaDesdeFoto` (`fichaDesdeFoto.js:435`).
  - **Arreglo propuesto (pregunta 12):** revisar en solo lectura si, en cada una de las 4
    empresas, el primer documento es el mismo que elige D2. Si lo es, ningún lector choca y basta
    14.14. Si no, unificar con un script `--dry-run` antes de encender la bandera en esa empresa.

### Resultado de H1 y H2 (bloque F242-B04, 2026-11-03; solo lectura)

> **Los datos son de la copia `katuq_dev` del día (D-579), NO de producción.** Los números de
> producción pueden ser distintos; antes de encender hay que repetir la corrida en una copia
> fresca el día de encender. Script: `functions/scripts/verificar-atributos-empresa.js`
> (backend `wt-back-tickets-web`), que exige `--dry-run`, no escribe, se niega si `PGDATABASE` no es
> `katuq_dev` y se detiene si el adaptador de Postgres no queda instalado. Imprime solo conteos, ids de
> documentos, estados y el texto de `sitio.company`. Este documento es público: las empresas de H2 van con
> alias (A a D); los nombres reales quedan en el informe privado.

**H1 · empresa única** (una sola empresa por `nomComercial` y el mismo texto en `sitio.company`):

| Empresa | Documentos con ese `nomComercial` | Sitios (estado) | `sitio.company` = `nomComercial` | Simulación de `set-company-feature.js` (sin `--execute`) | Resultado |
|---|---|---|---|---|---|
| FLORECER | 1 | 2 (borrador, borrador) | Sí, en los 2 | Encendería solo `categoryAttributes`, con `merge` | **Coincide** |
| Baudio Corporation Colombia SAS | 1 | 0 (ningún sitio tiene un `company` parecido) | No hay con qué comparar | Encendería solo `categoryAttributes`, con `merge` | **PARAR y escalar a Daniel**: no se cumple el criterio (falta el sitio); no encender hasta comparar `sitio.company` con el `nomComercial` |

- El script imprime el texto exacto de `sitio.company` (en FLORECER, idéntico al `nomComercial` en sus 2 sitios) y lista los
  sitios cuyo `company` se parece pero no es igual (hoy ninguno). En toda la copia hay 134 empresas y 14 sitios. Ninguna de
  las dos empresas tiene homónimos, ni siquiera a ojo (mayúsculas, tildes o espacios).
- La bandera `categoryAttributes` está apagada (ausente) en las dos.
- La tienda compara el texto exacto y `requireFeature` lo recorta y cae al id: el script revisa las dos
  rutas y la prueba comprueba que la simulación da lo mismo que `applyChange` de `set-company-feature.js`.
- **Regla de parada:** con dos documentos o un texto distinto en `sitio.company`, el veredicto es
  «PARAR y escalar a Daniel». Sin sitio tampoco se cumple el criterio: **Baudio queda en PARAR** (la conclusión del script
  lo trae como bloqueo para encender, no como aviso) hasta que tenga sitio y se compare su `sitio.company`.

**H2 · primer documento de `categorias`** (empresas con más de un documento; solo conteos e ids):

| Empresa | Documentos | Forma de cada documento | Primero por id = `limit(1)` = D2 con bandera = sin bandera = «crear» de onboarding | `set-company-feature.js` (simulación sin `--execute`) | Resultado |
|---|---|---|---|---|---|
| Empresa A | 2 | árbol legible, árbol legible | Sí | Se niega: no existe una empresa con ese nombre | **Coincide por desempate** (D2 elige el primero por id) |
| Empresa B | 3 | árbol legible (los 3) | Sí | Encendería solo `categoryAttributes` (hoy apagada) | **Coincide por desempate** |
| Empresa C | 2 | árbol legible, árbol legible | Sí | Encendería solo `categoryAttributes` (hoy apagada) | **Coincide por desempate** |
| Empresa D | 2 | árbol legible, árbol legible | Sí | Se niega: no existe una empresa con ese nombre | **Coincide por desempate** |

- Son 4 empresas con varios documentos, la misma cantidad de la medición del 18-oct en producción (los
  nombres de aquella medición no quedaron escritos, así que no se pueden cotejar; en la copia hay 136 empresas con
  `categorias` y 141 documentos). Como todos los documentos son árboles legibles, D2 desempata
  por id y elige el primero: ningún lector choca con Maestros. Es una coincidencia por desempate, no por
  diseño: si alguno de esos documentos pierde el árbol, deja de coincidir (el script lo detecta).
- **Dos de las 4 (A y D) no tienen una empresa en `companies` con ese nombre** (el `company` de sus
  documentos de categorías no es un `nomComercial` existente ni un id): el script corre la misma resolución que
  `set-company-feature.js`, que se niega («no existe»), así que la bandera no se enciende. Queda como aviso para Daniel, no como bloqueo.
- Ninguna de las 4 tiene la bandera encendida. Ninguna se enciende sin el OK de Daniel.
- **Inventario de lectores y escritores vuelto a correr** (`collection("categorias")` y constantes, sobre
  `functions/` sin pruebas ni `node_modules`, y también las listas de nombres de colección): 15 archivos y
  29 aperturas, y la prueba falla si aparece uno nuevo. El inventario de arriba cambió de línea y suma tres
  lectores que no estaban escritos (todos toman el primero por id, solo leen y coinciden hoy):
  - `arbolDeCategorias` de `sites.js` (categorías permitidas de las cuotas, `limit(1)`);
  - `nodoDeCategoria` de `services/mcp/productos/altaProducto.js` (`limit(1)`);
  - `rutasDeCategorias` de `tools/updateProduct.js` (`limit(1)`).
  Además, `createCategoriesOnboarding` (`onboarding.js:955`) elige por su propio puntaje (hoja con `categoria`
  gana), no por `documentoQueEditaElMaestro`; hoy da el mismo documento. Las líneas movidas:
  `importCategories` `limit(1)` en `onboarding.js:3757` y `update` en `:4288`; `checkCategoriesExist` en `:1955`.
  Un escritor más, que no es de producción: `scripts/clone-company.js` copia el documento de `categorias` de una
  empresa a otra desde una lista de colecciones (si se corre sobre una empresa que ya tiene árbol, crea un segundo
  documento). El inventario ya lo vigila.
  Límite del grep: no ve nombres armados en tiempo de ejecución ni colecciones leídas con un nombre que llega de afuera.
- **Si algún día no coincide:** el script de unificación con `--dry-run` queda **pendiente y bloqueado**
  (escribe en el dato de producción): espera revisión de diseño de Daniel (pregunta 12).
- **H3. 500 al guardar el árbol, cuando falla.** Desde 3.2, si la transacción (o la lectura de la
  bandera) falla, `createCategoria` responde 500 (`controllers/categorias.js:204-209`). Antes
  borraba el documento y respondía 200 aunque `add` fallara
  (`84e1081e^:controllers/categorias.js:166-180`): el árbol se perdía en silencio. **Ninguna
  fuente nombra una empresa ni un fallo observado**; el comentario 3, el contrato y el informe de
  D-518 dicen que ahora «responde 500 cuando falla».
  - Paso 1, solo lectura: buscar en el registro del servidor `catalogo.atributos.esquemas` con
    `operacion: "maestro"` y `resultado: "error"` desde el despliegue de `84e1081e` (empresas,
    cantidad y fechas).
  - Si no hay casos: H3 queda como robustez (S7 de la revisión privada y el código del error en
    el registro, sin valores), con diff aprobado.
  - Si hay casos: medir en solo lectura la forma del documento de esas empresas y reproducir en
    el emulador. Hipótesis, en orden: más de 1 MiB (Maestros guarda la foto de la categoría como
    `data:` dentro del árbol, `list.component.ts`, `selectImage`; fallaría igual con el código
    viejo); un valor que Firestore no admite en el cuerpo; contención con otro escritor. El
    arreglo va en un diff aparte (pregunta 9).
- **H4. Tarea 0.7 parcial.** El código salió con F1; en el cambio privado quedan sin marcar la
  bitácora, la revisión del registro posterior y H4. Ver revisión privada.
- **H5. Marcas cortadas en 40.** `/marca/<nombre>` se resuelve sobre la lista cortada
  (`sites.js:8891-8895`) y el bloque de marcas (`marcasDeTienda`, `:8997`) también corta en 40.
  Con E4 deja de haber corte en las facetas; para todas las tiendas, pregunta 1.
- **H6. Documentos.** 5.1 y 5.2 se marcan hechas (CONTRACT.md, D-495 F1); la resolución del
  ticket remite a «F2-42b», que no existe, y F2-42·1 pide anotar en el ticket que disponibilidad
  y valoración quedan fuera (tarea 8.6, la hace quien atiende el ticket, D-518 T·1).

## Pruebas (Artículo VIII; caracterización primero)

1. **Caracterización, antes de tocar código (en verde con el código de hoy):**
   - backend: `consultarCatalogo` y `catalogoPublico` sin bandera (JSON y HTML de la página, con
     categoría, marca, `/c`, `/marca`, búsqueda y sesión mayorista), Kuvo `catalogFor`,
     `feedProductos`, importador (dorado de D-498) y `createCategoria` (1.2);
   - **front (10.0):** plantilla que descarga `import-modal` (hojas, encabezados, ejemplo e
     instrucciones), payload que manda a `import-products` con un archivo fijo, y libro que arma
     el export de `productos.component` con productos fijos. Hoy no hay ninguna.
2. **`facetas.test.js` (puro):** O/Y, sí mismo excluido, subcategorías, rango, múltiples,
   ruta común, números lista/rango, topes, conteo = resultado al marcar (propiedad sobre
   catálogos sintéticos), y que un producto no vendible o fuera del plan nunca cuenta.
3. **`catalogoFacetas.contract.test.js`:** con la bandera, criterio 1 sobre un fixture
   «Networking»; precio mayorista; ocultas y plan; Kuvo igual.
4. **`comparador.contract.test.js`:** 404 sin bandera, sin publicar o sin bloque de catálogo
   visible; otra empresa, plan, oculto, inactivo, precio de vitrina en 0, quinto id, caché con y
   sin `acceso`.
5. **`atributosLote.contract.emulator.test.js`:** write-set de 1.3 por fila, referencia
   repetida o inexistente, producto creado en la misma importación (índice viejo) encontrado,
   vacía no cambia, `(borrar)`, sin `syncProduct` ni `date_edit`, 401 y 403.
6. **`feedAtributos.test.js`:** `product_detail` (límites y omisiones) y `product_type` con ruta.
7. **Velocidad:** `medir-facetas` sobre una fuente sintética de 8.568 productos en CI y sobre OH
   MY STORE en solo lectura (E12).
8. **Front:** espejo de la hoja «Especificaciones» (encabezados con clave, `;`, vacía y
   `(borrar)`) y del export por ruta, con `node --test` como 1.6.

## Gates (ampliación)

I: por aprobar. II: specs sin tecnología. IV: lote idempotente por clave. V y X: no aplican.
VI: sin `if` por proveedor. VII y XI: E12 y logs sin valores. VIII: pruebas de arriba.
IX: el Seller sigue con la excepción registrada (standalone, OnPush, sin signals). XII: la misma
bandera, retiro 2027-04-30. XIII: 4 specs nuevas de menos de 3 páginas. XV: `integrations`
intacto. D-505: ningún interruptor nuevo; solo `categoryAttributes` (Firestore).
«Sin capas de cache nuevas» (`openspec/config.yaml`): E2 y E5 guardan datos en memoria sin TTL
ni lecturas nuevas; se declaran y esperan la pregunta 3.

## Encendido y reversa

- Todo nace detrás de `categoryAttributes`. Orden, cada paso con OK de Daniel: 5.3 (F1 en
  FLORECER) → F2 en FLORECER → F3 y F4 → F5 → Baudio con H1 resuelto y `mostrarMarcas` en su
  sitio.
- En las 4 empresas con varios documentos, H2 (pregunta 12) antes de encender y revisión de cada
  caso.
- Reversa: apagar la bandera; la tienda vuelve a hoy en 12 minutos o menos (D5) y el feed en 35
  o menos (E11). Los datos quedan.

## Riesgos (ampliación)

- Con el índice compartido (sin proyección), `attributesObj` lo agranda para todos sus
  consumidores. Hoy 0 productos con valores; los topes de D1 acotan el peor caso.
- Recargas frecuentes de la fuente en comercios sincronizados: cada una recalcula derivados y
  precios por tipo de cliente (E12 lo mide y tiene parada).
- La faceta de marca depende de `mostrarMarcas`: para el criterio 1 en Baudio hay que encenderlo.
- Meta puede ignorar `g:product_detail`; se revisa el catálogo en el administrador de Meta.
- Un comercio que cambia una categoría de nombre: los alias de F1 resuelven las rutas viejas.
- `guardarArbol` de D-498 sin transacción puede pisar un renombre hecho en Maestros durante una
  importación (pregunta 13).
