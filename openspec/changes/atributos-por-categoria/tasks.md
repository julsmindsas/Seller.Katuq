> D-495 · Backend `katuq_admin_back_firebase/functions/` (`backend-aws-security`) · Front `Seller.Katuq/` (`feature/venta-asistida-mejorada`). Cubre F0 y F1. F2 a F5 van en sub-cambios (grupo 6).
>
> **Reglas:**
> - Se lee antes de editar.
> - Las pruebas van primero, en rojo.
> - Cada tarea cierra con sus pruebas y el build en verde.
> - **Con diff aprobado:** Daniel ve el diff y da OK, un cambio a la vez.
> - `[P]`: tareas en paralelo, sin archivos en común.
> - Nada se despliega ni se enciende sin OK de Daniel.

## 0. Antes de programar (F0)

- [x] 0.1 Daniel confirma o cambia las respuestas por defecto (`design.md`, Open Questions 1 a 12).
  - Dep: —.
  - Éxito: quedan anotadas en `design.md` y en la entrada D-495 de `CONTRACT.md`.
  - Hecho (2026-10-18): Daniel aprobó en bloque las respuestas por defecto (CONTRACT.md, «D-495 a D-503»).
- [x] 0.2 Daniel aprueba las dos specs (`specs/*/spec.md`), `design.md` y esta lista, y la excepción de `createCategoria` sin bandera (D3).
  - Dep: 0.1.
  - Éxito: aprobación y excepción con fecha en `CONTRACT.md`.
  - Revisión (2026-10-19): con la bandera apagada, la excepción escribe ahora `r[0]`, el documento que Maestros editó, y no el de D2. Daniel aprueba también los tres desvíos de `design.md` (D3, «Revisión del 2026-10-19»).
  - Hecho (2026-10-19): Daniel aprobó specs, design y tareas el 2026-10-18; hoy aprobó por separado la excepción de createCategoria (diff 3.2) y los desvíos de la revisión del 2026-10-19, incluido 3.3 sin mover date_edit.
- [x] 0.3 Prueba primero: `tests/catalogo/medirAtributosSoloLectura.test.js`. Falla si el script llama `set`, `update`, `delete`, `add`, `batch` o `runTransaction`.
  - Dep: 0.2.
  - Éxito: falla porque el script no existe.
- [x] 0.4 `scripts/medir-atributos-categoria.js --company "<X>" --dry-run`, solo lectura. Mide lo de `design.md` (Migration Plan):
  - documentos de `categorias` por empresa en todas las empresas;
  - tamaños, rutas, formas y ambiguos;
  - `attributes` en la raíz;
  - bytes del índice y del registro `{schemas, indice}`.
  - Dep: 0.3.
  - Éxito: 0.3 en verde; JSON sin datos personales.
- [x] 0.5 Correr 0.4 en FLORECER y OH MY STORE (más el conteo global) y anotar los números en `design.md`.
  - Hecho el 2026-10-18 (números en design.md, «Resultado de la medición»). Activa una parada: 4 empresas tienen más de un documento de `categorias`.
  - **Decisión de Daniel (2026-10-18): seguir con F1 tal cual.** D2 elige el documento; la bandera se enciende primero en FLORECER, y antes de encenderla en una de las 4 empresas con varios documentos se revisa su caso.
  - Dep: 0.4.
  - **Parar y volver al diseño** si:
    - alguna empresa tiene más de un documento de `categorias`;
    - el documento pasa de 700 KB;
    - algún producto ya tiene `attributes` en la raíz;
    - el registro proyectado con 30 atributos pasa de 250 KB por empresa.
- [x] 0.6 [P] Bandera `categoryAttributes` en `services/companyFeatureFlags.js` y `company-features.service.ts`. Dueño: Daniel. Retiro: 2027-04-30.
  - Dep: 0.2.
  - Éxito: la suite de banderas sigue en verde, y una prueba nueva deja la bandera apagada si falta o no vale `true`.
- [x] 0.7 Escalar a Daniel el endurecimiento de cómo resuelven la empresa los handlers existentes que tocan 3.2 y 3.4. Debe quedar como cambio en el openspec del backend privado, sin detalle en este repo.
  - Dep: 0.2.
  - Éxito: el cambio privado está nombrado y Daniel decidió si va antes de 5.1.
  - Estado (2026-10-19): cambio privado `atributos-endurecer-empresa-handlers` escrito en el openspec del backend. Falta que Daniel decida si va antes de 5.1.
  - Decisión de Daniel (2026-10-20): va antes de 5.1 y sale en el mismo despliegue. El detalle vive solo en el openspec privado del backend.

## 1. Pruebas de F1, primero y en rojo

Las pruebas de contrato son `*.emulator.test.js` y corren contra el emulador de Firestore con un proyecto `demo-`, como `tests/inventory`. No usan `scripts/lib/firestoreFalsa.js`.

- [x] 1.1 [P] `tests/catalogo/atributosCategoria.test.js` (D8.1). Cubre:
  - 6 formas, alias y etiquetas en cadena y divergentes;
  - `documentoDeCategorias` con varios documentos.
  - Dep: 0.2.
  - Éxito: falla porque el módulo no existe.
  - Hecho (2026-10-19): rojo sin el módulo y verde con 2.1 (35 casos, con el fixture compartido `tests/catalogo/fixtures/atributos-esquemas.json`).
  - Revisión (2026-10-19): el fixture suma 26 casos de `rutaDelProducto` con el índice que devuelve el GET. Incluye raíz repetida, renombre, forma 5 y lo que guarda el formulario. Se suma `documentoQueEditaElMaestro`: rojo sin la función y verde con ella (38 casos).
- [x] 1.2 [P] `tests/catalogo/esquemasAtributos.contract.emulator.test.js` (D8.2). Cubre:
  - GET y PUT: 401 sin sesión, 403 con la bandera apagada, 409, 400 y 200;
  - `createCategoria`: conserva, renombra con versión+1, ignora el cuerpo y mantiene el id;
  - `create` y PUT simultáneos sin perder esquemas;
  - varios documentos;
  - `/all` sin `attributeSchemas*`.
  - Dep: 0.2.
  - Éxito: falla por las rutas inexistentes.
  - Hecho (2026-10-19): rojo sin las rutas (14 de 15) y verde con 3.1 y 3.2 (15 casos), en el emulador local con proyecto `demo-`. Arnés en `tests/catalogo/emuladorAtributos.js`.
  - Revisión (2026-10-19): el GET trae `indice`. Caso nuevo: varios documentos sin la bandera, donde `create` escribe `r[0]` y no toca el documento con árbol. Ese caso falla si el servidor usa siempre D2 y pasa con el arreglo: 16 en verde con el emulador (Java 21 del JBR de Android Studio; el Java 1.8 del equipo no lo arranca).
- [x] 1.3 [P] `tests/productos/atributosWriteSet.contract.emulator.test.js` (D8.3). Cubre:
  - solo cambian `attributes.<key>`, `attributesEditedAt` y `attributesEditedBy`; las demás claves siguen, también `date_edit` y `user_edit`; `null` borra;
  - `precio`, `preciosPorTipoCliente`, `variantes` e `integrations` quedan idénticos;
  - 401, 403 con la bandera apagada y 404 de otra empresa; sin `syncProduct`;
  - `/edit` con un POST intercalado (espía antes del `update`);
  - `/create`, `createMultiple` e `importProducts` con `attributes` en el cuerpo.
  - Dep: 0.2.
  - Éxito: falla, y el canario `update({attributes: {...}})` también la hace fallar.
  - Hecho (2026-10-19): rojo antes de 3.3 y 3.4 y verde después (12 casos, emulador). El canario no pasa el verificador, y quitar la línea de 3.4 en `/edit` vuelve a poner en rojo el caso del POST intercalado. `createMultiple` llama a KAI y al bucket: su caso es estático.
  - Revisión (2026-10-19): `date_edit` debe seguir igual porque es el cursor de `katuq-product-changed`. La prueba sin emulador `tests/productos/atributosSinCursor.test.js` estaba en rojo con el manejador anterior. Hoy pasan las dos: 12 casos con emulador y 3 sin él.
- [x] 1.4 [P] `tests/catalogo/escritoresDeAtributos.contract.test.js` (D8.4, estático): escritores permitidos e inventario sin `attributes`. No exige `merge`: las creaciones con id nuevo son legítimas.
  - Dep: 0.2.
  - Éxito: pasa hoy y falla con un escritor fuera de la lista (mutación temporal).
  - Hecho (2026-10-19): la mutación se hace en memoria (un archivo falso en el recorrido), sin escribir en el árbol compartido. También vigila quién menciona `attributeSchemas`.
- [x] 1.5 [P] `tests/sitios/fichaEspecificaciones.test.js` (D8.5), con instantánea de la ficha HTML y del JSON de `productoPublico` con la bandera apagada.
  - Dep: 0.2.
  - Éxito: los casos nuevos fallan y las instantáneas pasan.
  - Hecho (2026-10-19): las instantáneas (`tests/sitios/instantaneas/`) se tomaron antes de tocar el código, con un producto que ya trae `attributes`. Los casos nuevos fallaban; con 3.5 pasan los 13.
- [x] 1.6 [P] Front: fixture `atributos-esquemas.json`, copia del backend, y spec del espejo (corrido como spec único).
  - Dep: 0.2.
  - Éxito: falla porque las funciones no existen.
  - Hecho (2026-10-19): `tests/productos/fixtures/atributos-esquemas.json` (copia idéntica) y `tests/productos/atributos-categoria-espejo.test.js` (`node --test`, el Karma del repo está roto). Falló sin el espejo y pasa con 4.2.
  - Revisión (2026-10-19): el fixture se copió de nuevo y la copia es idéntica. Los casos de `rutaDelProducto`, la colisión y los nombres tipo «constructor» fallaron sin el espejo nuevo (4 de 8) y pasan con él.

## 2. Núcleo puro

- [x] 2.1 `services/catalogo/atributosCategoria.js` (D2).
  - Dep: 1.1.
  - Éxito: 1.1 en verde.
  - Hecho (2026-10-19): 1.1 en verde. Los renombres se aplican de la ruta más profunda a la más corta, así que padre e hijo renombrados a la vez quedan bien.

## 3. Backend F1

- [x] 3.1 **Con diff aprobado (maestro).** GET y PUT `/v1/categorias/attribute-schemas` en `routers/categorias.js`. Llevan `auth`, 401 sin sesión, `requireFeature`, transacción con versión, topes e `invalidateSearchIndex`.
  - Dep: 2.1, 1.2, 0.6.
  - Éxito: la parte de GET y PUT de 1.2 en verde.
  - Estado (2026-10-19): implementado en el árbol, 1.2 en verde. Espera la aprobación del diff.
  - Revisión (2026-10-19): el GET devuelve también `indice` (`services/catalogo/esquemasAtributos.js`), que forma parte del mismo diff.
  - Aprobado por Daniel (2026-10-19).
- [x] 3.2 **Con diff aprobado (maestro).** `createCategoria` en `runTransaction` (D3) y `getcategorias` sin `attributeSchemas*`.
  - Dep: 2.1, 1.2, 0.7.
  - Éxito: 1.2 completo en verde; las pruebas de onboarding e importación de categorías no cambian.
  - Estado (2026-10-19): implementado en el árbol, 1.2 completo en verde y `test:maestros` en verde. Espera la aprobación del diff y la decisión de 0.7.
  - Revisión (2026-10-19): sin la bandera escribe `r[0]` (`documentoQueEditaElMaestro` y `banderaEncendida` en `services/catalogo/compuertas.js`), así el árbol de `r[0]` no reemplaza al documento bueno en las 4 empresas con varios documentos. Con la bandera, el de D2.
  - Aprobado por Daniel (2026-10-19), con la respuesta 500 cuando falla.
- [x] 3.3 **Con diff aprobado (productos).** `POST /v1/productos/attributes`, con `auth`, 401 sin sesión y `requireFeature`. Escribe por ruta, sin `syncProduct`, e invalida índice y paginación.
  - Dep: 2.1, 1.3, 0.6.
  - Éxito: la parte del endpoint de 1.3 en verde, y 1.4 en verde con el archivo permitido.
  - Estado (2026-10-19): implementado en el árbol (`services/catalogo/atributosProducto.js`), 1.3 y 1.4 en verde. Espera la aprobación del diff.
  - Revisión (2026-10-19): ya no mueve `date_edit`/`user_edit` y escribe `attributesEditedAt`/`attributesEditedBy`. Mover `date_edit` reenviaba el producto a Shopify por `katuq-product-changed` → `katuq-web-to-shopify`. **Lo decide Daniel con el diff:** se aprueba así, o se vuelve a `date_edit` aceptando el reenvío y se corrigen el requisito y los textos.
  - Aprobado por Daniel (2026-10-19): sin reenviar a las tiendas conectadas (attributesEditedAt/attributesEditedBy, sin date_edit).
- [x] 3.4 **Con diff aprobado (productos).** `exports.edit` quita `attributes` de `updateData` y de `productData`; `exports.create`, del cuerpo.
  - Dep: 1.3, 0.7.
  - Éxito: 1.3 completo en verde; las suites de productos no cambian.
  - Estado (2026-10-19): implementado en el árbol, 1.3 completo en verde. Espera la aprobación del diff y la decisión de 0.7.
  - Aprobado por Daniel (2026-10-19).
- [x] 3.5 **Con diff aprobado (índice y ficha públicos).** Cambios:
  - `getCatalogSchemas` en el registro de `getSearchIndex`;
  - `marcaDeLaEmpresaSinCache` con `limit(2)` y regla D-385;
  - `productoParaFicha` con esquema opcional;
  - ficha y `productoPublico`;
  - pestañas y `additionalProperty`.
  - Dep: 2.1, 1.5.
  - Éxito: 1.5 en verde; la suite de sitios queda con los mismos fallos previos, sin nuevos.
  - Estado (2026-10-19): implementado en el árbol, 1.5 en verde y la suite de sitios con los mismos 3 fallos previos. Estilos y script de las pestañas solo en la ficha que las lleva (la hoja compartida no cambia). Espera la aprobación del diff.
  - Aprobado por Daniel (2026-10-19).
- [x] 3.6 Logs de D7 en 3.1, 3.2 y 3.3, con prueba de que no llevan valores.
  - Dep: 3.1 a 3.3.
  - Éxito: ningún `console.log` nuevo (grep).
  - Estado (2026-10-19): hecho (`services/catalogo/log.js` y `tests/catalogo/logAtributos.test.js`, en verde; ningún `console.log` nuevo). Se marca cuando se aprueben 3.1 a 3.3.
  - Hecho (2026-10-19), con 3.1 a 3.3 aprobados.
- [x] 3.7 `node --check` y suites relacionadas, también las del emulador: banderas, onboarding, `importProductsPhotos`, productos, sitios y catálogo.
  - Dep: 3.1 a 3.6.
  - Éxito: verde, o los mismos fallos previos documentados.
  - Estado (2026-10-19): `node --check` limpio y emulador en verde. Fallan pruebas que no son de este cambio: tres de sitios (los fallos previos), `companies/soloLectura` (rutas de contabilidad y logística), dos de fotos por `services/storeMigration` y `onboarding/tiendaAlRegistrarse` (puerta de publicación del sitio). Se marca cuando se aprueben 3.1 a 3.5.
  - Hecho (2026-10-19), corridas después del pull: solo los fallos previos (tres de sitios y tiendaAlRegistrarse). Los dos de fotos se corrigieron registrando migrationProduct.js como escritor manual en syncDetector.js.

## 4. Front F1

- [x] 4.1 [P] `CatalogAttributesService extends BaseService`, con `getSchemas`, `saveSchemas` y `saveProductAttributes`.
  - Dep: 3.1, 3.3.
  - Éxito: compila, sin `HttpClient` en componentes.
  - Estado (2026-10-19): hecho en `src/app/shared/services/catalogo/catalog-attributes.service.ts`; compila (`tsc` sin errores) y ningún componente usa `HttpClient`. Se marca cuando se aprueben 3.1 y 3.3.
  - Hecho (2026-10-19), con 3.1 y 3.3 aprobados.
- [x] 4.2 [P] Espejo: `documentoDeCategorias`, `esquemaEfectivo` y tipo.
  - Dep: 1.6.
  - Éxito: 1.6 en verde.
  - Hecho (2026-10-19): `src/app/shared/services/catalogo/atributos-categoria.ts`, 1.6 en verde.
  - Revisión (2026-10-19): `rutaDeNodo` se reemplaza por `rutaDelProducto`, espejo de D2 con etiquetas, alias, ambiguas y colisión, y por `nombresDeRuta`. Usa el índice del GET.
- [x] 4.3 **Con diff aprobado (maestro).** Maestros:
  - acción "Atributos" y `CategoriaAtributosComponent` (standalone, OnPush);
  - deshabilitada con el árbol sucio;
  - `WeakMap` de renombres;
  - con la bandera, documento elegido por el espejo.
  - Dep: 4.1, 4.2, 3.2.
  - Éxito: renombrar "Networking" conserva los atributos de "Networking > Routers"; sin la bandera, todo queda como hoy.
  - Estado (2026-10-19): implementado en el árbol (`categoria-atributos/` y `list.component`), con `tests/productos/atributos-componentes.test.js` y `atributos-editor.test.js` en verde. Espera la aprobación del diff y la revisión en el navegador (4.5).
  - Aprobado por Daniel (2026-10-19).
- [x] 4.4 **Con diff aprobado (productos).** Pestaña "Especificaciones" con `EspecificacionesProductoComponent` (standalone, OnPush), llamada en el `next`, sin `setTimeout`, y aviso si falla.
  - Dep: 4.1, 4.2, 3.3.
  - Éxito: crear y editar guardan `products.attributes`; sin la bandera, el payload de `/create` y `/edit` es idéntico.
  - Estado (2026-10-19): implementado en el árbol (`especificaciones-producto/` y `crear-productos`), con las pruebas del front en verde. Espera la aprobación del diff y la revisión en el navegador (4.5).
  - Revisión (2026-10-19): la pestaña resuelve la categoría como el servidor, sobre `stringify` del control, que es lo que guardan /create y /edit. Si no hay ruta, dice por qué: sin categoría, ambigua, en colisión o fuera del árbol. Hay 4 pruebas nuevas en `atributos-componentes.test.js`: raíz repetida, renombre, forma 5 y avisos. Fallan con la lógica anterior y pasan con la nueva.
  - Aprobado por Daniel (2026-10-19). La prueba de ficha-desde-foto suma el nombre del componente nuevo a su arnés.
- [ ] 4.5 Cierre de diseño:
  - `npm run build:prod` sin errores;
  - gradientes y primarios prohibidos sin subir;
  - ninguna clase con "p-";
  - navegador a 1440 y 390 px.
  - Dep: 4.3, 4.4.
  - Éxito: los cuatro puntos anotados.
  - Estado (2026-10-19): en los archivos nuevos y tocados no hay gradientes, primarios prohibidos ni clases con "p-". Faltan el build de producción (lo corre el orquestador) y la revisión a 1440 y 390 px.
  - Build (2026-10-19): ng build de producción sin errores (307 s, solo advertencias previas). La revisión a 1440 y 390 px se hace con la bandera prendida en FLORECER (5.3).
  - Build (2026-10-19): ng build --configuration=production sin errores (307 s, solo advertencias previas). Falta la revisión a 1440 y 390 px, que se hace con la bandera prendida en FLORECER (5.3).

## 5. Piloto F1 (cada paso con OK de Daniel)

- [ ] 5.1 Backend con la bandera apagada en todas las empresas.
  - Dep: 3.7 y la decisión de 0.7.
  - Éxito: pantallas y fichas iguales, sin errores nuevos en el log.
- [ ] 5.2 Front.
  - Dep: 4.5, 5.1.
  - Éxito: el candado de publicación pasa sin forzarlo.
- [ ] 5.3 Encender la bandera en FLORECER y crear Networking con 4 atributos, uno de cada tipo.
  - Dep: 5.2.
  - Éxito:
    - criterio 2 cumplido;
    - JSON-LD válido en la prueba de resultados enriquecidos de Google;
    - al apagarla, todo se esconde en 12 minutos o menos.
- [ ] 5.4 Bitácora de F1 en `CONTRACT.md`.
  - Dep: 5.3.

## 6. Sub-cambios F2 a F5

Cada sub-cambio lleva su `design.md` y su `tasks.md` (3 páginas o menos), se aprueba aparte y cumple los requisitos de `specs/` de este cambio.

- [ ] 6.1 `atributos-por-categoria-f2-facetas`: índice con `rutaCat` y valores filtrables, facetas en `consultarCatalogo` y panel. Incluye instantánea sin bandera (también Kuvo), conteo de lecturas igual al de hoy y piloto del criterio 1.
  - Dep: 5.4, 0.5.
- [ ] 6.2 `atributos-por-categoria-f3-plantilla`: prueba en el emulador con el mismo archivo con y sin columnas, y diff aprobado sobre `importProducts`.
  - Dep: 5.4.
- [ ] 6.3 `atributos-por-categoria-f4-comparador`: contrato con los candados de `productosPorIds`, y 404 con la bandera apagada.
  - Dep: 5.4.
- [ ] 6.4 `atributos-por-categoria-f5-feed`: feed idéntico sin atributos; Daniel lo valida en Merchant Center y en Meta.
  - Dep: 5.4, 6.1.

## 7. Cierre

- [ ] 7.1 Retirar `categoryAttributes` antes del 2027-04-30: encendida para todos o eliminada.
  - Dep: 6.1 a 6.4.
- [ ] 7.2 Bitácora final y archivo del cambio: los deltas de `specs/` pasan a `openspec/specs/`.
  - Dep: 7.1.
