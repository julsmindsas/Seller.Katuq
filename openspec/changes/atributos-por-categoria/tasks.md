> D-495 · Backend `katuq_admin_back_firebase/functions/` (`backend-aws-security`) · Front `Seller.Katuq/` (`feature/venta-asistida-mejorada`). Cubre F0 y F1 (grupos 0 a 5, aprobados).
> **Ampliación del 2026-10-21 (grupos 8 a 13, PENDIENTE DE APROBACIÓN; 8.1 a 8.4 y 8.6 no esperan esa aprobación, por el orden de D-518):** F2 a F5 y los hallazgos, en este mismo cambio (D-518 T·1). Se implementa en `feature/tickets-web` (backend `wt-back-tickets-web`, front `wt-front-tickets-web`), sin push ni despliegue sin OK de Daniel. El grupo 6 queda reemplazado.
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
  - Estado (2026-10-21): el código salió con F1, pero el cambio privado quedó parcial (bitácora, revisión del registro después del despliegue y H4). Sigue en 8.4; ver revisión privada.

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

- [x] 5.1 Backend con la bandera apagada en todas las empresas.
  - Dep: 3.7 y la decisión de 0.7.
  - Éxito: pantallas y fichas iguales, sin errores nuevos en el log.
  - Hecho (2026-10-20, anotado el 21-oct): backend 84e1081e en producción desde af1bd54c (CONTRACT.md, D-495 F1); las rutas nuevas responden 401 sin sesión. Queda abierto H3 (8.3): guardar el árbol responde 500 cuando falla.
- [x] 5.2 Front.
  - Dep: 4.5, 5.1.
  - Éxito: el candado de publicación pasa sin forzarlo.
  - Hecho (2026-10-20, anotado el 21-oct): df923adf publicado en 2026.10.20.5 (3ec0b1ea), el candado pasó sin forzar (CONTRACT.md). El vivo del 21-oct es 2026.10.20.11 y lo incluye.
- [ ] 5.3 Encender la bandera en FLORECER y crear Networking con 4 atributos, uno de cada tipo. **PENDIENTE DEL OK DE DANIEL** (no se enciende sin él).
  - Dep: 5.2, 8.1 (H1 en FLORECER).
  - Éxito:
    - criterio 2 cumplido;
    - JSON-LD: cada especificación en el Schema Markup Validator sin errores, y la prueba de resultados enriquecidos de Google sin errores ni advertencias nuevos (criterio de D-518 F2-42·6, aprobado el 21-oct; no espera 8.0);
    - revisión a 1440 y 390 px (cierra 4.5);
    - al apagarla, todo se esconde en 12 minutos o menos.
- [ ] 5.4 Bitácora de F1 en `CONTRACT.md`.
  - Dep: 5.3.

## 6. Sub-cambios F2 a F5 — REEMPLAZADO el 2026-10-21

> Los sub-cambios nunca se crearon. D-518 T·1: lo pendiente sigue en este ticket y en este cambio. 6.1 pasa al grupo 9, 6.2 al 10, 6.3 al 11 y 6.4 al 12. Se conservan abajo como estaban aprobados, sin marcar.

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
  - Dep: grupos 9 a 12 (antes 6.1 a 6.4).
- [ ] 7.2 Bitácora final y archivo del cambio: los deltas de `specs/` pasan a `openspec/specs/`.
  - Dep: 7.1.

---

# Ampliación del 2026-10-21 — PENDIENTE DE APROBACIÓN

> Reglas de arriba, más:
> - Primero las pruebas de caracterización, en verde con el código de hoy; después las nuevas, en rojo.
> - **Con diff aprobado:** maestro de categorías, productos (escritura de atributos), rutas con sesión (auth) y precios con sesión (lectura de listas). Un cambio a la vez.
> - Nada se enciende sin OK de Daniel: ni en FLORECER, ni en Baudio, ni en las 4 empresas con varios documentos de `categorias`.
> - Toda tarea de la tienda cierra con la suite de sitios con los mismos fallos previos y sin nuevos.
> - **Orden de D-518:** 8.1, 8.2 y 8.3 son del paso 3 (arreglos sin diseño nuevo). No dependen de 8.0; cada uno con su diff aprobado. Los grupos 9 a 12 son del paso 4 y esperan 8.0.

## 8. Hallazgos y aprobación

- [ ] 8.0 Daniel aprueba la ampliación (proposal, design, specs nuevas y estas tareas) y responde las preguntas 1 a 14 de la propuesta.
  - Dep: —.
  - Éxito: aprobación con fecha en `CONTRACT.md` (D-495).
- [ ] 8.1 [P] **H1 (solo lectura).** Para FLORECER y para Baudio Corporation Colombia SAS: simular `set-company-feature.js "<empresa>" categoryAttributes on` (sin `--execute`) y comparar `sitio.company` de su sitio con el `nomComercial`.
  - Dep: —.
  - Éxito: una sola empresa con ese nombre y el mismo texto en el sitio; si no, se para y se escala a Daniel.
- [ ] 8.2 [P] **H2 (solo lectura, luego lo que decida Daniel).**
  - Inventario en `design.md` H2 (hecho en el diseño); se vuelve a correr `grep` de `collection("categorias")` antes de cerrar por si apareció otro.
  - Para cada una de las 4 empresas con varios documentos: ¿el primer documento por id es el que elige D2 (`documentoQueEditaElMaestro` con la bandera)? Solo conteos e ids, sin contenido.
  - Si en alguna no coincide: script `--dry-run` de unificación y diff aprobado (pregunta 12), antes de encender la bandera en ella.
  - `leerArbol` es de D-498 (14.14); esta tarea no lo cambia. La transacción de `guardarArbol`, pregunta 13.
  - 14.14 y la transacción de `guardarArbol` (pregunta 13) hechas el 2026-10-21 en `feature/tickets-web`. Sigue abierta la revisión de solo lectura de las 4 empresas.
  - Dep: —.
  - Éxito: tabla de las 4 empresas (coincide / no coincide) en `design.md`; ninguna con la bandera encendida mientras no coincida.
- [ ] 8.3 **H3 (primero solo lectura, luego diff aprobado).**
  - Paso 1: consultar en el registro del servidor `catalogo.atributos.esquemas` con `operacion: "maestro"` y `resultado: "error"` desde el despliegue de `84e1081e`: empresas, cantidad y fechas.
  - Sin casos: prueba primero (el registro lleva el código del error, sin valores ni datos de la empresa; la respuesta de error es genérica, S7) y diff aprobado.
  - Con casos: además, medición `--dry-run` del tamaño del documento y de los campos que Maestros reenvía en esas empresas, reproducción en el emulador y arreglo en diff aparte (pregunta 9 si son las fotos).
  - Dep: —.
  - Éxito: se sabe si ha fallado y por qué; Maestros guarda o dice que no guardó, sin perder el árbol.
  - Avance (2026-10-21, `feature/tickets-web`, sin desplegar): arreglo de robustez hecho con prueba primero (`tests/catalogo/createCategoriaError.test.js`, 3 en rojo antes). Si la transacción falla, el árbol no cambia y la respuesta es genérica (`CATEGORY_TREE_SAVE_FAILED`, 500); documento de más de 1 MiB, 413 `CATEGORY_TREE_TOO_LARGE` con un mensaje que pide imágenes más livianas; contención agotada, 409. El registro lleva `codigo` (y `bytes` si es por tamaño), sin valores. Maestros muestra el mensaje del servidor. **Queda abierto el paso 1** (consultar el registro de producción): no se hizo desde aquí. Subir las fotos de categoría al almacenamiento sigue en un cambio aparte (pregunta 9).
  - Corrección tras la revisión (2026-10-21): el 413 también cubre el campo de más de 1.048.487 bytes y la petición de más de 10 MiB (antes daban 500 y el comercio reintentaba sin saber por qué), y Maestros responde 413 antes de escribir si el árbol pasa el tope. La importación de productos usa la misma respuesta genérica. Pruebas: `createCategoriaError` 8. **El arreglo de robustez no reemplaza el paso 1:** si el registro de producción muestra fallos con otra causa, esa causa sigue sin diagnosticar y la casilla sigue abierta.
- [ ] 8.4 [P] **H4.** Cerrar lo pendiente del cambio privado `atributos-endurecer-empresa-handlers` (bitácora y revisión del registro). H4 sigue en un cambio aparte. Ver revisión privada.
  - Dep: —.
  - Éxito: las casillas del cambio privado reflejan lo desplegado.
- [ ] 8.5 [P] Revisión de seguridad de la ampliación (`wt-back-tickets-web/openspec/changes/atributos-por-categoria-seguridad/`): Daniel la lee antes de los diffs de 9, 10 y 11.
  - Dep: 8.0.
- [ ] 8.6 [P] **Ticket 1234 (con autorización para escribir en el ticket).** Nota interna: disponibilidad y valoración quedan fuera (D-518 F2-42·1 y ·2; valoración, si se quiere, en un ticket propio), y corregir la resolución que remite a «F2-42b» (D-518 T·1).
  - Dep: —.
  - Éxito: la nota existe y la resolución no remite a un ticket inexistente.

## 9. F2 · Facetas

- [ ] 9.1 Caracterización (verde hoy): `consultarCatalogo` y `catalogoPublico` sin la bandera (JSON y HTML con categoría, marca, `/c`, `/marca`, búsqueda, ocasión, oferta y sesión mayorista), Kuvo `catalogFor` y el conteo de lecturas por consulta.
  - Dep: 8.0.
- [ ] 9.2 [P] Pruebas en rojo: `tests/catalogo/facetas.test.js` (design E1, E4, prueba 2).
  - Dep: 8.0.
- [ ] 9.3 `services/catalogo/facetas.js` (E1, E4). No depende de la fuente de la tienda.
  - Dep: 9.2.
  - Éxito: 9.2 en verde.
- [ ] 9.4 **Con diff aprobado (fuente de la tienda).** Según la pregunta 11:
  - con la proyección de TX-34: `derivadosDeFacetas` sobre ella, después de que TX-34 D1 esté unida;
  - sin ella: `getSearchIndex` suma `attributes` a la máscara y `attributesObj` a la entrada, y `derivadosDeFacetas` atado al índice (E2).
  - Dep: 9.1, 9.3, preguntas 3 y 11.
  - Éxito: 9.1 sigue en verde; consumidores del índice sin cambios.
- [ ] 9.5 **Con diff aprobado (precios con sesión, solo lectura).** `porTipoCliente` en la fuente de la tienda y `precioDe` (E5).
  - Dep: 9.1, preguntas 3 y 11.
  - Éxito: prueba de precio mayorista en rojo antes y verde después; sin sesión, idéntico.
- [ ] 9.6 **Con diff aprobado (catálogo público).** `consultarCatalogo` con `conFacetas` y la bandera; parámetros y topes (E3); respuesta (E6); `/marca` sin corte (E4, H5).
  - Dep: 9.3, 9.4, 9.5.
  - Éxito: `catalogoFacetas.contract.test.js` en verde; 9.1 en verde.
- [ ] 9.7 **Con diff aprobado (tienda).** Panel en formulario, `pintarFacetas`, chips, «Limpiar todo», dirección con `pushState`/`popstate`, `aria-live` y `noindex` con canónica (E7, E8).
  - Dep: 9.6.
  - Éxito: instantánea sin la bandera igual; navegador a 1440 y 390 px sin desplazamiento horizontal, con una plantilla común y con `tecnologia-catalogo` (TX-36).
- [ ] 9.8 [P] `scripts/medir-facetas.js --dry-run` y su prueba de que no escribe (E12).
  - Dep: 9.3.
- [ ] 9.9 Medir (E12): fuente sintética de 8.568 productos en la prueba y OH MY STORE en solo lectura.
  - p95 de `catalogoPublico` de punta a punta en caliente, con y sin sesión;
  - costo en frío de derivados y `porTipoCliente` por recarga;
  - frecuencia de recarga en OH MY STORE y en un comercio con Shopify o WooCommerce;
  - memoria de derivados y `porTipoCliente` por empresa.
  - Dep: 9.6, 9.8.
  - Éxito: p95 de 1 s o menos (F2-42·5), derivados de 500 ms o menos por recarga y 20 MB o menos por empresa. Si no, se para y se vuelve al diseño.
- [ ] 9.10 Accesibilidad: axe-core WCAG 2.1 A/AA del catálogo con facetas y de las pestañas de F1, a 1280 y 390 px (E13).
  - Dep: 9.7.
  - Éxito: 0 fallas.
- [ ] 9.11 Coordinación con TX-34 según la pregunta 11:
  - con la proyección: F2-42 no amplía `getSearchIndex`; el orden de unión es 9.2-9.3 → TX-34 D1 → 9.4-9.6;
  - sin ella: TX-34 busca en los atributos con el `attributesObj` de 9.4 (F2-42·8) y su lectura mínima conserva `attributes`;
  - en los dos casos, el panel de filtros en celular es de `tienda-celular` de TX-34 y F2-42 no lo duplica.
  - Dep: pregunta 11.
  - Éxito: nota con el orden en las dos propuestas (la de TX-34 la edita quien la atiende).
- [ ] 9.12 Piloto del criterio 1 en FLORECER (con OK de Daniel), luego aceptación en Baudio con sus datos (pregunta 8), `mostrarMarcas` encendido y, si su sitio la usa, la plantilla `tecnologia-catalogo`.
  - Dep: 5.3, 9.6 a 9.10, 8.1.
  - Éxito: en «Networking» de Baudio, cada conteo de marca, precio, tecnología WiFi y velocidad es igual a lo que aparece al marcarlo.

## 10. F3 · Plantilla por categoría

- [ ] 10.0 [P] **Caracterización del Seller (verde hoy).** Instantáneas con `node --test` de:
  - la plantilla que descarga `import-modal` (hojas, encabezados, fila de ejemplo e instrucciones);
  - el payload que manda a `import-products` con un archivo fijo (con y sin «Precios por volumen»);
  - el libro que arma el export de `productos.component` con productos fijos.
  - Dep: 8.0.
  - Éxito: verdes con el código de hoy; son la base del «idéntico sin la bandera» de 10.4 y 10.5.
- [ ] 10.1 [P] Pruebas en rojo: `tests/productos/atributosLote.contract.emulator.test.js` (prueba 5), con el write-set de 1.3 por fila y el caso del producto recién creado.
  - Dep: 8.0.
- [ ] 10.2 **Con diff aprobado (productos y auth).** `POST /v1/productos/attributes/lote` con la cadena de F1, resolviendo referencias en Firestore (E10). No hay ruta nueva de lectura.
  - Dep: 10.1.
  - Éxito: 10.1 en verde; 1.3 y 1.4 siguen en verde; ningún escritor nuevo de `attributes` fuera de la lista.
- [ ] 10.3 [P] Front: espejo de la hoja «Especificaciones» (encabezados con clave, `;`, vacía y `(borrar)`) y del filtro del export por ruta, con `node --test`.
  - Dep: 8.0.
- [ ] 10.4 **Con diff aprobado (importador del Seller).** Descargar con categoría, leer la hoja aparte, llamar el lote en el `next` de la importación o solo, y mostrar el resultado por fila (E10).
  - Dep: 10.0, 10.2, 10.3.
  - Éxito: sin la bandera, 10.0 en verde (la hoja se ignora sin aviso, como hoy); un archivo con solo «Especificaciones» no llama `import-products`.
- [ ] 10.5 Export de Productos con la hoja «Especificaciones», armada con los documentos que el export ya trae (E10).
  - Dep: 10.0, 10.3.
  - Éxito: sin la bandera, 10.0 en verde; exportar «Networking», corregir y reimportar cambia solo los atributos (prueba en FLORECER con OK de Daniel).
- [ ] 10.6 Cierre de diseño: `npm run build:prod` sin errores, gradientes y primarios prohibidos sin subir, ninguna clase con «p-», navegador a 1440 y 390 px.
  - Dep: 10.4, 10.5.

## 11. F4 · Comparador

- [ ] 11.1 [P] Pruebas en rojo: `tests/sitios/comparador.contract.test.js` (prueba 4), con precio de vitrina en 0 y bloque de catálogo oculto.
  - Dep: 8.0.
- [ ] 11.2 **Con diff aprobado (ruta pública).** `GET /public/:slug/comparar` (E9): candado con `esPublicableEnTienda` y el plan sobre la fuente de la tienda, atributos de los derivados, hasta 4 documentos para la vitrina.
  - Dep: 11.1, 9.4, 9.5.
  - Éxito: 11.1 en verde.
- [ ] 11.3 **Con diff aprobado (tienda).** Botón «Comparar» en tarjeta y ficha, barra, diálogo y tabla (E9).
  - Dep: 11.2.
  - Éxito: sin la bandera, instantáneas iguales; 390 px sin desplazamiento de la página, también con `tecnologia-catalogo`.
- [ ] 11.4 Accesibilidad del comparador: axe-core en 0 fallas, foco atrapado y Esc.
  - Dep: 11.3.

## 12. F5 · Feed y JSON-LD

- [ ] 12.1 Caracterización: instantánea de `feedProductos` sin la bandera.
  - Dep: 8.0.
- [ ] 12.2 [P] Pruebas en rojo: `tests/sitios/feedAtributos.test.js` (prueba 6).
  - Dep: 8.0.
- [ ] 12.3 **Con diff aprobado (feed).** `g:product_type` con la ruta y `g:product_detail` (E11). La caché del feed no cambia (pregunta 14).
  - Dep: 12.1, 12.2.
  - Éxito: 12.1 y 12.2 en verde.
- [ ] 12.4 JSON-LD: Schema Markup Validator y prueba de resultados enriquecidos de Google sin errores nuevos en una ficha de FLORECER (con 5.3).
  - Dep: 5.3.
- [ ] 12.5 Daniel valida el feed del piloto en Merchant Center y en Meta (antes 6.4).
  - Dep: 12.3, 9.12.
  - Éxito: sin errores ni advertencias nuevos; `product_type` con la ruta; al apagar, el feed vuelve al de hoy en 35 min o menos.

## 13. Cierre de la ampliación

- [ ] 13.1 Bitácora en `CONTRACT.md` por fase (F2, F3, F4, F5) y comentario técnico en el ticket 1234.
  - Dep: cada fase.
- [ ] 13.2 Cuando todo esté encendido y probado: 7.1 y 7.2.
