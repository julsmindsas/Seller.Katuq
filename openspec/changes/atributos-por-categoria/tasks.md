> D-495 · Backend `katuq_admin_back_firebase/functions/` (`backend-aws-security`) · Front `Seller.Katuq/` (`feature/venta-asistida-mejorada`). Cubre F0 y F1 (grupos 0 a 5, aprobados).
> **Ampliación del 2026-10-21 (grupos 8 a 13; Daniel la aprobó en bloque el 2026-10-21 y falta su fila con fecha en `CONTRACT.md`; 8.1 a 8.4 y 8.6 no esperan esa aprobación, por el orden de D-518):** F2 a F5 y los hallazgos, en este mismo cambio (D-518 T·1). Se implementa en `feature/tickets-web` (backend `wt-back-tickets-web`, front `wt-front-tickets-web`), sin push ni despliegue sin OK de Daniel. El grupo 6 queda reemplazado.
>
> **Estado al 2026-11-03 (bloque F242-B19):** todo lo implementado vive en la copia local de la rama `feature/tickets-aws-claude-1`, sin push ni despliegue. Todo está detrás de `categoryAttributes` (apagada) **salvo H5** (commit de back `7d135b76`, tarea 9.6): ese cambio actúa sin la bandera y modifica el HTML de las tiendas con 25 a 40 marcas (`/marca/<nombre>` ya no da 404 fuera de las 40 primeras, el bloque de marcas gana «Ver todas (N)» y el autocompletado deja de cortar en 40). Si se une la rama, H5 se revisa y se decide aparte; no es inerte. Convención: una tarea «Con diff aprobado» se marca `[x]` solo cuando Daniel aprueba el diff, como en F1; mientras tanto lleva «Hecho en local» y queda sin marcar. Las tareas BLOQUEADAS dicen por qué. La lista exacta de lo que falta y los commits están en «Resumen de evidencia al 2026-11-03», al final.
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
  - **BLOQUEADA** (2026-11-03, B19): espera el OK de Daniel para encender; nada se enciende. Antes: 8.1 (FLORECER coincide; repetir H1 y H2 en una copia fresca el día de encender) y, para ver F2 a F5 con la bandera, que Daniel apruebe los diffs de las tareas 9 a 12. Cierra también 4.5 (revisión a 1440 y 390 px).
- [ ] 5.4 Bitácora de F1 en `CONTRACT.md`.
  - Dep: 5.3.
  - **BLOQUEADA** (2026-11-03, B19): depende de 5.3 y escribe en `CONTRACT.md`, que asigna el orquestador.

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
  - **BLOQUEADA** (2026-11-03, B19): depende de que los grupos 9 a 12 estén aprobados, encendidos y probados (5.3, 9.12, 12.5). Plazo: 2027-04-30.
- [ ] 7.2 Bitácora final y archivo del cambio: los deltas de `specs/` pasan a `openspec/specs/`.
  - Dep: 7.1.
  - **BLOQUEADA** (2026-11-03, B19): depende de 7.1; archivar mueve los deltas de `specs/` a `openspec/specs/` y escribe en `CONTRACT.md`.

---

# Ampliación del 2026-10-21 — APROBADA EN BLOQUE EL 2026-10-21; DIFFS PENDIENTES

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
  - **BLOQUEADA solo por la fila del contrato** (2026-11-03, B19): Daniel aprobó la ampliación en bloque el **2026-10-21** y cada pregunta abierta quedó resuelta con la recomendación escrita (proposal, design, specs y estas tareas). Falta la entrada con fecha en `CONTRACT.md` (D-495/D-518), que asigna el orquestador. No se marca hasta que exista. La aprobación de la ampliación no es la aprobación de cada diff: esos siguen uno por uno.
- [ ] 8.1 [P] **H1 (solo lectura).** Para FLORECER y para Baudio Corporation Colombia SAS: simular `set-company-feature.js "<empresa>" categoryAttributes on` (sin `--execute`) y comparar `sitio.company` de su sitio con el `nomComercial`.
  - Dep: —.
  - Éxito: una sola empresa con ese nombre y el mismo texto en el sitio; si no, se para y se escala a Daniel.
  - Avance (2026-11-03, bloque F242-B04, copia `katuq_dev`, NO producción): `functions/scripts/verificar-atributos-empresa.js --dry-run` (solo lectura). FLORECER: 1 documento y el mismo texto en sus 2 sitios, coincide. Baudio: 1 documento, sin sitio con qué comparar: **PARAR y escalar a Daniel**, no encender hasta comparar `sitio.company` cuando tenga sitio. Tabla en `design.md` (H1/H2). Sigue sin marcar: falta repetirlo en una copia fresca el día de encender.
  - Cierre (2026-11-03, B19): FLORECER cumple el criterio. **Baudio BLOQUEADA** (sin sitio no hay con qué comparar; escalar a Daniel). Por eso 8.1 sigue sin marcar. Commits: back `wt-back-tickets-web` `67d7d05a`, front `wt-front-tickets-web` `53884e4f`.
- [x] 8.2 [P] **H2 (solo lectura, luego lo que decida Daniel).**
  - Inventario en `design.md` H2 (hecho en el diseño); se vuelve a correr `grep` de `collection("categorias")` antes de cerrar por si apareció otro.
  - Para cada una de las 4 empresas con varios documentos: ¿el primer documento por id es el que elige D2 (`documentoQueEditaElMaestro` con la bandera)? Solo conteos e ids, sin contenido.
  - Si en alguna no coincide: script `--dry-run` de unificación y diff aprobado (pregunta 12), antes de encender la bandera en ella.
  - `leerArbol` es de D-498 (14.14); esta tarea no lo cambia. La transacción de `guardarArbol`, pregunta 13.
  - 14.14 y la transacción de `guardarArbol` (pregunta 13) hechas el 2026-10-21 en `feature/tickets-web`. La revisión de solo lectura de las 4 empresas quedó hecha el 2026-11-03 (B04, ver abajo).
  - Dep: —.
  - Éxito: tabla de las 4 empresas (coincide / no coincide) en `design.md`; ninguna con la bandera encendida mientras no coincida.
  - Avance (2026-11-03, bloque F242-B04, copia `katuq_dev`, NO producción): las 4 empresas coinciden por desempate (todos sus documentos son árboles legibles y D2 desempata por id, igual que el lector de onboarding); 2 de ellas no tienen empresa en `companies` con ese nombre. El grep se volvió a correr: 15 archivos, 29 aperturas, 3 lectores no escritos antes y un escritor manual (`clone-company.js`). Tabla en `design.md`. Script de unificación `--dry-run`: no hace falta hoy; si algún día no coincide queda bloqueado (escribe en el dato de producción): espera revisión de diseño de Daniel.
  - Hecho (2026-11-03, B19): la tabla de las 4 empresas está en `design.md` (todas coinciden por desempate), el inventario con `grep` se volvió a correr y ninguna tiene la bandera encendida; se cumple el criterio. Los datos son de `katuq_dev`, no de producción: esta casilla dice «la comprobación de unicidad se hizo y coincide», NO «verificado en producción». Repetir `verificar-atributos-empresa.js --dry-run` en una copia fresca el día de encender es requisito de 5.3 y 9.12. 8.1 sigue abierta por otra razón: Baudio no tiene sitio con qué comparar. Commits: back `wt-back-tickets-web` `67d7d05a`, front `wt-front-tickets-web` `53884e4f`.
- [ ] 8.3 **H3 (primero solo lectura, luego diff aprobado).**
  - Paso 1: consultar en el registro del servidor `catalogo.atributos.esquemas` con `operacion: "maestro"` y `resultado: "error"` desde el despliegue de `84e1081e`: empresas, cantidad y fechas.
  - Sin casos: prueba primero (el registro lleva el código del error, sin valores ni datos de la empresa; la respuesta de error es genérica) y diff aprobado.
  - Con casos: además, medición `--dry-run` del tamaño del documento y de los campos que Maestros reenvía en esas empresas, reproducción en el emulador y arreglo en diff aparte (pregunta 9 si son las fotos).
  - Dep: —.
  - Éxito: se sabe si ha fallado y por qué; Maestros guarda o dice que no guardó, sin perder el árbol.
  - Avance (2026-10-21, `feature/tickets-web`, sin desplegar): arreglo de robustez hecho con prueba primero (`tests/catalogo/createCategoriaError.test.js`, 3 en rojo antes). Si la transacción falla, el árbol no cambia y la respuesta es genérica (`CATEGORY_TREE_SAVE_FAILED`, 500); documento de más de 1 MiB, 413 `CATEGORY_TREE_TOO_LARGE` con un mensaje que pide imágenes más livianas; contención agotada, 409. El registro lleva `codigo` (y `bytes` si es por tamaño), sin valores. Maestros muestra el mensaje del servidor. **Queda abierto el paso 1** (consultar el registro de producción): no se hizo desde aquí. Subir las fotos de categoría al almacenamiento sigue en un cambio aparte (pregunta 9).
  - Corrección tras la revisión (2026-10-21): el 413 también cubre el campo de más de 1.048.487 bytes y la petición de más de 10 MiB (antes daban 500 y el comercio reintentaba sin saber por qué), y Maestros responde 413 antes de escribir si el árbol pasa el tope. La importación de productos usa la misma respuesta genérica. Pruebas: `createCategoriaError` 8. **El arreglo de robustez no reemplaza el paso 1:** si el registro de producción muestra fallos con otra causa, esa causa sigue sin diagnosticar y la casilla sigue abierta.
  - **Paso 1 BLOQUEADA** (2026-11-03, B19): consultar el registro de producción no se puede desde aquí (no se lee producción ni se entra al registro del servidor). Lo hace quien tenga el acceso, con OK de Daniel. El arreglo de robustez está hecho en local; no reemplaza el paso 1.
- [ ] 8.4 [P] **H4.** Cerrar lo pendiente del cambio privado `atributos-endurecer-empresa-handlers` (bitácora y revisión del registro). H4 sigue en un cambio aparte. Ver revisión privada.
  - Dep: —.
  - Éxito: las casillas del cambio privado reflejan lo desplegado.
  - Avance parcial (2026-11-03, bloque F242-B03): las casillas del cambio privado ya reflejan lo desplegado (la tarea 0.7 de este documento salió con F1 en 84e1081e). Siguen abiertos, y por eso 8.4 queda sin marcar: varias tareas del cambio privado (pruebas, bitácora del contrato, revisión del registro de un día) y H4 como cambio propio. Detalle en la revisión privada.
  - Cierre documental (2026-11-03, B19): las casillas del cambio privado reflejan lo desplegado; H4 queda como P6 de la revisión privada (sin diff, espera revisión de diseño de Daniel) y H6 (documentos) está hecho en este cambio: 5.1 y 5.2 en `[x]` y las casillas que no se pueden cerrar sin contrato ni ticket marcadas BLOQUEADA. Commits: back `wt-back-tickets-web` `9506ae1c`, front `wt-front-tickets-web` `ba2c9316`.
- [ ] 8.5 [P] Revisión de seguridad de la ampliación (`wt-back-tickets-web/openspec/changes/atributos-por-categoria-seguridad/`): Daniel la lee antes de los diffs de 9, 10 y 11.
  - Dep: 8.0.
  - Estado (2026-11-03, B19): la revisión privada está al día con lo implementado (P1 y P5a hechas; P3, P4, P5b, P5c y P6 abiertas). Espera que Daniel la lea; su aprobación en bloque del 21-oct no sustituye la lectura de cada diff.
- [ ] 8.6 [P] **Ticket 1234 (con autorización para escribir en el ticket).** Nota interna: disponibilidad y valoración quedan fuera (D-518 F2-42·1 y ·2; valoración, si se quiere, en un ticket propio), y corregir la resolución que remite a «F2-42b» (D-518 T·1).
  - Dep: —.
  - Éxito: la nota existe y la resolución no remite a un ticket inexistente.
  - **BLOQUEADA** (2026-11-03, B19): exige escribir en el ticket 1234, y las sesiones de esta fila no pueden comentar ni actualizar tickets. Texto sugerido para quien lo atienda: «Disponibilidad y valoración quedan fuera de F2-42 (D-518 F2-42·1 y ·2); valoración, si se quiere, en un ticket propio. La resolución del 20-oct remite a un ticket F2-42b que no existe: lo pendiente sigue en este ticket».

## 9. F2 · Facetas

- [x] 9.1 Caracterización (verde hoy): `consultarCatalogo` y `catalogoPublico` sin la bandera (JSON y HTML con categoría, marca, `/c`, `/marca`, búsqueda, ocasión, oferta y sesión mayorista), Kuvo `catalogFor` y el conteo de lecturas por consulta.
  - Dep: 8.0.
  - Hecho (3-nov, bloque F242-B01): prueba local `tests/sitios/caracterizacionTiendaPublica.test.js` (fuera de git, D-566) en verde con el código de antes de Q-S1 y de después; cubre además `feedProductos` (12.1) y Q-S1.
- [x] 9.2 [P] Pruebas en rojo: `tests/catalogo/facetas.test.js` (design E1, E4, prueba 2).
  - Dep: 8.0.
  - Hecho (3-nov, bloque F242-B05): prueba local `tests/catalogo/facetas.test.js` (fuera de git, D-566), 57 de 57 en verde: O/Y, conteos sin el propio grupo, subcategorías, precio, números y texto con sus topes, ruta común, tope de 500, propiedad con semilla fija, lector con topes y estático sin firebase. Desvío del método: el código se escribió antes que las pruebas; se compensó con 10 mutaciones, cada una hizo fallar al menos una prueba.
- [x] 9.3 `services/catalogo/facetas.js` (E1, E4). No depende de la fuente de la tienda.
  - Dep: 9.2.
  - Éxito: 9.2 en verde.
  - Hecho (3-nov, bloque F242-B05): `services/catalogo/facetas.js` (motor puro) y `services/catalogo/filtrosFacetas.js` (lector con topes). Nada cableado: el catálogo no cambia. Pendiente para 9.5/9.6: leer los `a.<clave>` en dos fases cuando no hay categoría (`leerAtributos`) y pasar `rutaConocida` y `indice` al cablear.
- [ ] 9.4 **Con diff aprobado (fuente de la tienda).** Según la pregunta 11:
  - con la proyección de TX-34: `derivadosDeFacetas` sobre ella, después de que TX-34 D1 esté unida;
  - sin ella: `getSearchIndex` suma `attributes` a la máscara y `attributesObj` a la entrada, y `derivadosDeFacetas` atado al índice (E2).
  - Dep: 9.1, 9.3, preguntas 3 y 11.
  - Éxito: 9.1 sigue en verde; consumidores del índice sin cambios.
  - Hecho (3-nov, bloque F242-B06): `services/catalogo/derivadosFacetas.js` (puro, `WeakMap` por `lista`), `fuenteDeFacetas` en `controllers/sites.js` (bandera ON con el modo en off, shadow u on lee la proyección con atributos; bandera OFF no pide nada) y las categorías del producto en toda entrada de la proyección con atributos. Pruebas locales `tests/catalogo/derivadosFacetas.test.js` y `tests/sitios/fuenteFacetas.test.js` (fuera de git, D-566). `getSearchIndex` sin cambios (prueba estática). Nada cableado al catálogo todavía (9.6). La memoria y el costo en frío de los derivados se miden en 9.9, junto con las categorías que ahora retiene toda entrada de la proyección con atributos (si pasa el tope de 20 MB por empresa, se guarda la ruta ya resuelta en lugar del crudo). Para 9.6: con la bandera ON, pedir `atributos` desde el primer momento (el registro de `indiceDeTienda` se amplía y relee si se pide después) y armar los derivados sobre la misma `lista` que cuenta; si la proyección falla, el catálogo sale sin facetas.
  - Estado (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (espera revisión de diseño de Daniel), como 9.6. Commits: back `wt-back-tickets-web` `4e9a858f`, front `wt-front-tickets-web` `cc9120cb`.
- [ ] 9.5 **Con diff aprobado (precios con sesión, solo lectura).** `porTipoCliente` en la fuente de la tienda y `precioDe` (E5).
  - Dep: 9.1, preguntas 3 y 11.
  - Éxito: prueba de precio mayorista en rojo antes y verde después; sin sesión, idéntico.
  - Hecho en la copia local (3-nov, bloque F242-B07), a la espera de que Daniel apruebe el diff antes de unir: `indiceDeTienda(company, {listas: true})` arma `porTipoCliente` en la misma pasada de lectura (sin lecturas ni TTL nuevos) y `services/sites/preciosPorLista.js` (puro) da `precioDeFn(registro, sesion)` y `enOfertaFn`. `porTipoCliente` es propiedad no enumerable del registro: no sale al serializarlo ni al copiarlo. La sesión se acepta solo con la forma que devuelve `clienteDeAcceso` (`cd` y `categoriaId`). Prueba local `tests/sitios/precioMayoristaFacetas.test.js` (12 de 12 al hacerlo y 13 de 13 con la corrección, fuera de git, D-566; en rojo antes). Falta para 9.6: pasar `listas: true` en `fuenteProy` cuando haya bandera y sesión, y que el catálogo use `precioDeFn` para faceta de precio, rango y orden. El camino sin proyección (`cargarVitrinaDeEmpresa`) no se amplió: las facetas solo leen de la proyección (pregunta 11). La memoria (productos x tipos de cliente) se mide en 9.9 con el tope de 20 MB. Obligatorio en 9.6 (revisión de B07): pedir `atributos` y `listas` juntos en la primera lectura (ampliar relee products); pasar `listas: true` solo con la bandera `categoryAttributes` encendida y una sesión válida de `clienteDeAcceso` (la opción no verifica la bandera por sí sola); con `acceso` presente la respuesta es `private, no-store` y el render del servidor no usa la sesión; prueba de catálogo «Cliente mayorista ordena por precio» (orden y rango con precios de lista). Corrección de B07: una fila con `precioConIva` ausente o de texto ya no se guarda como NaN ni consume el tipo (prueba 9 de la prueba local).
  - Estado (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (precios con sesión: espera revisión de diseño de Daniel). La prueba local quedó en 13 de 13 (la 9.ª es la de NaN). Commits: back `wt-back-tickets-web` `740a05b7`, front `wt-front-tickets-web` `8124747d`.
- [ ] 9.6 **Con diff aprobado (catálogo público).** `consultarCatalogo` con `conFacetas` y la bandera; parámetros y topes (E3); respuesta (E6); `/marca` sin corte (E4, H5).
  - Dep: 9.3, 9.4, 9.5.
  - Éxito: `catalogoFacetas.contract.test.js` en verde; 9.1 en verde.
  - Avance parcial (2026-11-03, bloque F242-B08, H5, pregunta 1; para todas las tiendas, fuera de `categoryAttributes`): `/marca/<nombre>` y `?marca=` se resuelven contra todas las marcas (antes, solo las 40 primeras: 404), el bloque de marcas recibe todas con tope de seguridad de 500 (aviso estructurado sin nombres) y muestra 24 más «Ver todas (N)», el panel muestra la marca elegida aunque pase de la 30 y el autocompletado ya no corta en 40. Con 24 marcas o menos el HTML es idéntico; con 25 a 40 el bloque gana «Ver todas». Pruebas locales (D-566). Sigue sin marcar: faltan `conFacetas`, los topes de E3 y la respuesta E6.
  - Hecho en la copia local (3-nov, bloque F242-B09), a la espera de que Daniel apruebe el diff antes de unir (catálogo público y precios con sesión): `services/sites/catalogoFacetas.js` (toda la lógica nueva) y ganchos mínimos en `controllers/sites.js`. `consultarCatalogo(company, {conFacetas, filtros, sesion, conMarcas, conPrecio})`: solo `catalogoPublico` y el render de la página pasan `conFacetas`; Kuvo (`catalogFor`) no. Con `categoryAttributes` ON lee la proyección con atributos (y con listas si hay sesión válida, en la MISMA lectura), filtra y cuenta con `filtrarYContar` (B05) sobre lo vendible y lo visible del plan, ordena y pagina como hoy y suma `facetas` y `filtrosActivos` (E6). Con la bandera OFF, sin proyección o ante cualquier falla devuelve `null` y sigue el camino de hoy línea por línea (instantáneas de B01 en verde). Los campos de hoy (`categorias` planas, `marcas`, `rangoPrecio`, `categoria`, `marca`) se conservan para la tienda actual; el panel nuevo (9.7) usa `facetas`. Con la bandera, `acceso` presente (válido o no) responde `private, no-store`; el render del servidor nunca pasa la sesión. Lector con topes (B05); una `categoria=` por nombre que no existe u oculta da cero resultados como hoy; `cat=`, `marca=` y `ocasion=` desconocidos se ignoran y no se devuelven. Registro `catalogo.facetas` (`company`, `productos`, `facetas`, `duracionMs`) solo si pasa de 500 ms. Prueba local `tests/sitios/catalogoFacetas.contract.test.js` (29 de 29, fuera de git, D-566; 26 de 28 en rojo antes del código, 5 mutaciones (plan gratis, precio de lista, vendible, oferta con lista, orden) hacen fallar al menos una prueba). Pendiente (otros bloques): el panel (9.7), la medición (9.8/9.9) y el limitador propio (Q-S2). No toca `productosPorIds`. Corrección de la revisión (3-nov, mismo bloque): la búsqueda `q` es un filtro más del cruce Y y los valores marcados se validan contra todo lo vendible (una marca que existe ya no se descarta en silencio porque la búsqueda no la traiga; `/marca/<slug>` y `/c/<slug>` con una búsqueda sin resultados siguen siendo 200); `marca=` y `ocasion=` por nombre que no existen dan cero como hoy (`cat=` y `a.<clave>` desconocidos se siguen ignorando); en shadow el contador del buscador se mide sobre la misma población que hoy; una categoría oculta (con o sin tilde) no sale en la miga ni como chip y no se puede elegir; el aviso de tope de 500 valores queda registrado sin valores. Sin marcar [x] hasta que Daniel apruebe el diff y se responda Q-S2 (limitador propio, revisión de seguridad P5; va con 9.9/B10).
  - **Atención, H5 no está detrás de la bandera** (commit `7d135b76`): cambia el HTML de toda tienda con 25 a 40 marcas aunque `categoryAttributes` esté apagada. Es la única parte de este cambio que actúa sin bandera; si Daniel aprueba el resto y no H5, se separa ese commit.
  - Estado de cierre (2026-11-03, B19): hecho en local (H5 y facetas); sin marcar hasta el diff aprobado (catálogo público y precios con sesión: espera revisión de diseño de Daniel). Q-S2 ya está decidida (ver 9.9: no se agrega limitador propio). Commits: back `wt-back-tickets-web` `7d135b76` (H5), `04a427ec` (facetas); front `wt-front-tickets-web` `5710b5d2`, `21f60123`.
- [ ] 9.7 **Con diff aprobado (tienda).** Panel en formulario, `pintarFacetas`, chips, «Limpiar todo», dirección con `pushState`/`popstate`, `aria-live` y `noindex` con canónica (E7, E8).
  - Dep: 9.6.
  - Éxito: instantánea sin la bandera igual; navegador a 1440 y 390 px sin desplazamiento horizontal, con una plantilla común y con `tecnologia-catalogo` (TX-36).
  - Parte 1 hecha en la copia local (3-nov, bloque F242-B11), a la espera de que Daniel apruebe el diff (tienda); la casilla sigue sin marcar hasta la parte 2 (B12: `noindex` con canónica, revisión automática de accesibilidad y la revisión visual de las pestañas). Nuevo `utils/siteHtmlFacetas.js` (toda la interfaz) y ganchos mínimos: `utils/siteHtml.js` (el panel y los chips solo si la respuesta trae `facetas`; tres ganchos en el script del catálogo, que sin la bandera no escriben nada), `controllers/sites.js` (`__fx`: lo que la dirección dice de la página) y `utils/siteCacheClave.js` (la caché del HTML ahora distingue `cat`, `a.<clave>` y las marcas u ocasiones repetidas; sin esos parámetros la clave es la de siempre). Qué hace: panel como `<form method="get">` con `fieldset`/`legend`; sin JavaScript, «Aplicar» (y Enter) envía el formulario, las categorías son botones de envío y los chips y «Limpiar todo» son enlaces; con JavaScript aplica al cambiar, `pintarFacetas` repinta panel, chips y total en cada respuesta, `pushState`/`popstate` (solo en la página propia del catálogo), región `aria-live` y foco al título al limpiar. El panel se describe UNA vez (`vistaFacetas`) y el servidor y el script lo pintan con la misma función. La hoja de celular es la de `tienda-celular` (TX-34), sin duplicarla. Pruebas locales fuera de git (D-566): `tests/sitios/facetasPanel.test.js` (29 de 29, en rojo antes del código) y `facetasPanel.navegador.test.js` (32 de 32 en Chromium, 1440 y 390 px, `moda-coleccion` y `tecnologia-catalogo`, con la revisión automática axe sin fallas en el catálogo); las instantáneas sin la bandera, `catalogoFacetas.contract` y `marcasSinCorte` siguen en verde. Cambio de comportamiento declarado: con la bandera, el panel viejo (chips de una sola selección) se reemplaza por el de facetas. Corrección de la revisión (3-nov, mismo bloque): el panel respeta `mostrarCategorias` y `mostrarPrecio` del bloque como el panel viejo; la clave de la caché escapa `&`, `%` y caracteres de control (un valor ya no imita otro parámetro) y las direcciones con filtros de una tienda SIN la bandera comparten la copia de la portada (la entrada recuerda si la página usó los filtros); el aria-live se vacía y se reescribe si el total no cambia; contraste sin transparencias y nombre accesible de las categorías que contiene el texto visible (axe); el rango numérico, que sin JavaScript no puede enviarse, se oculta sin JavaScript (decisión pendiente de Daniel: ampliar el lector de B05 para aceptarlo); sin la función muerta `conUi` y con un marcador más estricto para activar el script. Sigue para B12: `noindex` con canónica. Parte 2 hecha en la copia local (3-nov, bloque F242-B12), a la espera del mismo diff aprobado: `noindex,follow` con canónica (E8) en `controllers/sites.js` (`filtrosMasAllaDeLaPagina`, `canonicaConNoindex`) y una excepción de una línea en la cabecera de `utils/siteHtml.js` (la canónica sale también con `noindex` solo en estas direcciones). Con la bandera, una dirección de catálogo con `cat`, `a.<clave>`, `marca`, `q`, `ocasion`, precio u oferta (aunque el lector no reconozca el valor: son combinaciones infinitas) lleva `<meta name="robots" content="noindex,follow">` y `<link rel="canonical">` a la página de la categoría o la marca de la ruta (`/c/<slug>`, `/marca/<slug>`) o, si no hay, a `/?catalogo=1`; sin filtros extra y sin la bandera la cabecera es la de hoy (lo que ya llevaba `noindex` lo sigue llevando, sin canónica). El sitemap no cambia (prueba: idéntico antes y después de visitar direcciones con filtros y con la bandera encendida y apagada). `cat=` o `marca=` que nombran la propia página no cuentan como filtro extra, y si el motor de facetas cae al camino de hoy la bandera se lee de la empresa (la dirección con filtros sigue sin indexarse; su copia en caché lleva la clave con los filtros). Pruebas locales fuera de git (D-566): `tests/sitios/facetasSeoYAxe.test.js` (17 de 17; fallan con la función en `false`, sin leer la bandera cuando el motor cae o sin la clave de caché propia). Riesgo a vigilar antes de encender en un comercio con tráfico orgánico: `noindex` junto a una canónica hacia una página indexable (lo pide E8; hay que mirar Search Console).
  - Estado de cierre (2026-11-03, B19): partes 1 y 2 hechas en local; sin marcar hasta el diff aprobado (tienda pública: espera revisión de diseño de Daniel). Decisiones suyas que siguen abiertas: el rango numérico sin JavaScript, el `noindex` con canónica (mirar Search Console) y los textos de presentación. Commits: back `wt-back-tickets-web` `abddb00f` (parte 1), `23fb504b` (parte 2); front `wt-front-tickets-web` `d68d3737`, `2ae52179`.
- [x] 9.8 [P] `scripts/medir-facetas.js --dry-run` y su prueba de que no escribe (E12).
  - Dep: 9.3.
  - Hecho (3-nov, bloque F242-B10): `functions/scripts/medir-facetas.js` (backend). Exige `--dry-run`, rechaza cualquier otra opción, se niega si `PGDATABASE` no es `katuq_dev` (D-579) y si el adaptador de Postgres no se instaló; lee la proyección con atributos y listas, los esquemas y los precios con las mismas máscaras de la tienda (`indiceDeTienda`, `getCatalogSchemas`); toda la base pasa por una envoltura que bloquea y anota cualquier escritura; la bandera `categoryAttributes` se enciende solo en memoria. Corre 8 escenarios x 30 veces (los 6 de siempre, el cruce de tres grupos y la búsqueda con el buscador encendido por memoria; motor y respuesta armada, con y sin sesión simulada); una respuesta que no sea el catálogo con facetas, o vacía, deja el resultado en INCOMPLETO, da p50, p95 y CPU, el costo en frío de derivados y `porTipoCliente`, la memoria y la frecuencia de recarga por `date_edit`, y escribe el veredicto (CUMPLE, PARAR o INCOMPLETO) y la propuesta de Q-S2. Cambio mínimo en `controllers/sites.js`: `depsFacetas` en `_test`. Pruebas locales (D-566): `tests/catalogo/medirFacetasSoloLectura.test.js` (10 de 10; fallan con tres mutaciones: la envoltura deja pasar `set`, el script escribe, la bandera no se enciende en memoria; la envoltura cubre también `db.doc`, subcolecciones, `collectionGroup` y `admin.app().firestore()`).
  - Commits (2026-11-03, B19): back `wt-back-tickets-web` `d303d354`, front `wt-front-tickets-web` `d9c7cb50`.
- [x] 9.9 Medir (E12): fuente sintética de 8.568 productos en la prueba y OH MY STORE en solo lectura.
  - p95 de `catalogoPublico` de punta a punta en caliente, con y sin sesión;
  - costo en frío de derivados y `porTipoCliente` por recarga;
  - frecuencia de recarga en OH MY STORE y en un comercio con Shopify o WooCommerce;
  - memoria de derivados y `porTipoCliente` por empresa.
  - Dep: 9.6, 9.8.
  - Éxito: p95 de 1 s o menos (F2-42·5), derivados de 500 ms o menos por recarga y 20 MB o menos por empresa. Si no, se para y se vuelve al diseño.
  - Hecho (3-nov, bloque F242-B10; medido sobre el código de 9.6 ya en la rama, commit local 04a427ec del backend, sin unir ni desplegar; 9.6 sigue sin marcar hasta que Daniel apruebe ese diff, y si el diff cambia se repite la corrida): **CUMPLE, sin parada.** Números en `design.md`, «Resultado de la medición de E12». Resumen: OH MY STORE (copia katuq_dev, 8.608 productos, 3 tipos de cliente) p95 de 18 ms sin sesión (respuesta armada, no de punta a punta), 27 ms con sesión (ESTIMADO, suma de p95) y 18 ms con atributos simulados (estimado); derivados + `porTipoCliente` 26 ms en frío (65 ms con atributos simulados; con la lectura ampliada de `products` suma 0,3 a 0,47 s, cerca del tope); memoria de F2-42 6,8 MB; CPU p95 máxima de 20 a 40 ms. Fuente sintética de 8.568 productos con 12 tipos de cliente y atributos en el 30 %, `catalogoPublico` de punta a punta (medido): p95 de 19 a 37 ms sin sesión y de 34 a 69 ms con sesión; derivados + listas 30 a 35 ms; memoria 13,5 MB (el margen más corto: unos 12.700 productos con 12 tipos de cliente llegan a 20 MB); CPU p95 máxima de 108 ms. Prueba de CI local `tests/sitios/velocidadFacetas.ci.test.js` (4 de 4; falla con un retraso que lleve el p95 sobre 1 s, y una respuesta rápida que no sea el catálogo con facetas no cuenta como CUMPLE).
  - Q-S2 (límite de consultas por CPU): la CPU queda lejos del umbral; la recomendación y su respuesta pendiente de Daniel están en la revisión privada de seguridad. Se vuelve a medir antes de encender en cada comercio nuevo, si un comercio pasa de unos 12.000 productos, cuando 5 tiendas o más tengan la bandera o si cambia el motor.
  - **Alcance de la marca `[x]`:** la medición se hizo y cumple los umbrales con las condiciones escritas aquí (el p95 de OH MY STORE es el de la respuesta armada, no de punta a punta, y el valor con sesión es un estimado; solo la fuente sintética se midió de punta a punta). NO es la puerta de velocidad para encender: se repite sobre el diff aprobado de 9.6, con un sitio real y en una copia fresca (9.12).
  - Bloqueado (no se hizo): frecuencia de recarga de un comercio con Shopify o WooCommerce, que pide los registros de sincronización de producción; se usó el recurso alternativo de E12 (productos con `date_edit` en 24 h) solo en OH MY STORE y FLORECER. Tampoco se midió `catalogoPublico` sobre un sitio publicado real (OH MY STORE no tiene sitio en la copia); el script lo mide con `--slug`. Repetir todo en una copia fresca el día de encender, y de nuevo si cambia el diff de 9.6.
  - Q-S2 decidida (2026-11-03, B19): CPU de 20 a 40 ms contra el umbral de 200 ms; no se agrega limitador propio y se vuelve a medir con las condiciones de arriba (el limitador por sitio queda propuesto, no activado, en la revisión privada). Commits: back `wt-back-tickets-web` `d303d354`, front `wt-front-tickets-web` `d9c7cb50`.
- [ ] 9.10 Accesibilidad: axe-core WCAG 2.1 A/AA del catálogo con facetas y de las pestañas de F1, a 1280 y 390 px (E13).
  - Dep: 9.7.
  - Éxito: 0 fallas.
  - Sin marcar: depende de 9.7 (diff de la tienda sin aprobar) y la página entera conserva 2 fallas previas (abajo). Hecho en la copia local (3-nov, bloque F242-B12; el diff de 9.7 sigue esperando a Daniel): `tests/sitios/facetasSeoYAxe.navegador.test.js` (Chromium del laboratorio; 28 pruebas, fuera de git). Alcance: el criterio «0 fallas» se cumple DENTRO de `#catalogo` y `[data-kq-specs]`, no en la página entera. axe con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a` y `wcag21aa`: **0 fallas** en `#catalogo` (sin filtros, con la hoja de celular abierta y con filtros, chips y «Limpiar todo») y en `[data-kq-specs]` (primera y segunda pestaña), con una tienda de pruebas, la plantilla común `moda-coleccion` y `tecnologia-catalogo` (TX-36), a 1280 y 390 px. Pestañas: `role=tablist/tab/tabpanel` con nombres, flechas, Inicio, Fin, Tab al panel, foco de 3 px, sin JavaScript se ven las dos secciones. Cambios de presentación solo con la bandera: pestañas de 44 px de alto (`CSS_ESPECIFICACIONES`, que solo viaja en la ficha con especificaciones) y borde de los campos de precio, de «Aplicar», del buscador de la tienda y del selector de orden (dentro del catálogo con facetas) con el color del texto al 50 % (el borde del tema es negro al 8-14 % y en `tecnologia-catalogo` desaparecía; WCAG 1.4.11, 3:1, que axe no mide y la prueba sí). Revisión visual a 1440 y 390 px con capturas en el scratchpad, no en git. Gradientes y primarios prohibidos de los módulos tocados: sin cambio (`siteHtml.js` 10 y 0, `siteHtmlFacetas.js` 0 y 0, `sites.js` 0 y 0, antes y después).
  - Fuera de este bloque, ya presentes con y sin la bandera (no se tocaron porque cambiarían el HTML o la hoja de todas las tiendas y las instantáneas sin bandera deben quedar iguales): el enlace «Ir al inicio» del encabezado (`label-content-name-mismatch`, texto visible distinto del nombre accesible) y el contraste de «Plazo de entrega» y «Quedan pocas unidades» (F2-45) en plantillas oscuras. Quedan para decidir con Daniel. (El borde del buscador y del selector de orden en plantillas oscuras ya se corrigió, solo con la bandera, en el catálogo con facetas.)
  - Estado de cierre (2026-11-03, B19): sin marcar porque depende de 9.7 y de la decisión de Daniel sobre las dos fallas de la página entera. Commits: back `wt-back-tickets-web` `23fb504b`, front `wt-front-tickets-web` `2ae52179`.
- [ ] 9.11 Coordinación con TX-34 según la pregunta 11:
  - con la proyección: F2-42 no amplía `getSearchIndex`; el orden de unión es 9.2-9.3 → TX-34 D1 → 9.4-9.6;
  - sin ella: TX-34 busca en los atributos con el `attributesObj` de 9.4 (F2-42·8) y su lectura mínima conserva `attributes`;
  - en los dos casos, el panel de filtros en celular es de `tienda-celular` de TX-34 y F2-42 no lo duplica.
  - Dep: pregunta 11.
  - Éxito: nota con el orden en las dos propuestas (la de TX-34 la edita quien la atiende).
  - Nota de F2-42 (3-nov, bloque F242-B06), solo texto: el camino con la proyección quedó así. F2-42 no amplía `getSearchIndex` ni el índice compartido del Seller, el feed y KAI. Orden de unión: 9.2 y 9.3 (motor puro, ya unidos) → TX-34 D1 (proyección en modo sombra, ya unida) → 9.4 (fuente y derivados, hecho) → 9.5 y 9.6. La búsqueda dentro de los atributos (F2-42·8) la hace TX-34 con `indiceDeTienda(company, {atributos: true})`, que ya suma `attributes` y sus valores a las palabras. El panel de filtros deslizable en celular es de `tienda-celular` de TX-34: F2-42 le entrega el mismo panel de facetas y no lo duplica. Falta que quien atiende la propuesta de TX-34 deje su nota con el mismo orden.
  - Estado (2026-11-03, B19): la parte de F2-42 está hecha (orden de unión en `design.md` E0 y en la nota de arriba). **Sigue sin marcar** porque falta la nota con el mismo orden en la propuesta de TX-34 (`tienda-celular-y-velocidad`, P18 dice solo que las facetas leen de la proyección): la edita quien atiende TX-34, y este bloque no la toca. Commits: back `wt-back-tickets-web` `4e9a858f`, front `wt-front-tickets-web` `cc9120cb`.
- [ ] 9.12 Piloto del criterio 1 en FLORECER (con OK de Daniel), luego aceptación en Baudio con sus datos (pregunta 8), `mostrarMarcas` encendido y, si su sitio la usa, la plantilla `tecnologia-catalogo`.
  - Dep: 5.3, 9.6 a 9.10, 8.1.
  - Éxito: en «Networking» de Baudio, cada conteo de marca, precio, tecnología WiFi y velocidad es igual a lo que aparece al marcarlo.
  - **BLOQUEADA** (2026-11-03, B19): necesita encender la bandera en FLORECER y luego aceptar en Baudio con sus datos (sin sitio hoy, ver 8.1); nada se enciende sin el OK de Daniel y los diffs de 9.4 a 9.7 aprobados.

## 10. F3 · Plantilla por categoría

- [x] 10.0 [P] **Caracterización del Seller (verde hoy).** Instantáneas con `node --test` de:
  - la plantilla que descarga `import-modal` (hojas, encabezados, fila de ejemplo e instrucciones);
  - el payload que manda a `import-products` con un archivo fijo (con y sin «Precios por volumen»);
  - el libro que arma el export de `productos.component` con productos fijos.
  - Dep: 8.0.
  - Éxito: verdes con el código de hoy; son la base del «idéntico sin la bandera» de 10.4 y 10.5.
  - Hecho (3-nov, bloque F242-B16): `tests/productos/seller-caracterizacion.test.js` (9 pruebas, local, fuera de git por D-566) corre el código real de `import-modal.component.ts` y `productos.component.ts` sin Angular y sin mover una línea (carga el archivo transpilado en un contexto aislado; `XLSX.writeFile` guarda el libro en vez de escribirlo). Instantáneas en `tests/productos/fixtures/seller-caracterizacion.snap.json`: plantilla de productos (con y sin columnas de foto), de clientes, inventario y categorías; payload a `import-products` con un archivo fijo, con y sin «Precios por volumen» (con errores de rango); y el libro del export (completo, seleccionados, filtrados, contrato de columnas). Una prueba fija que una hoja «Especificaciones» hoy se ignora sin aviso nuevo y sin cambiar el payload.
  - Commits (2026-11-03, B19): front `wt-front-tickets-web` `865bdc78`.
- [x] 10.1 [P] Pruebas en rojo: `tests/productos/atributosLote.contract.emulator.test.js` (prueba 5), con el write-set de 1.3 por fila y el caso del producto recién creado.
  - Dep: 8.0.
  - Commits (2026-11-03, B19): back `wt-back-tickets-web` `51625f4f`, front `wt-front-tickets-web` `a558894c`. Prueba local `atributosLote.contract.emulator.test.js` (24 de 24 en el emulador).
- [ ] 10.2 **Con diff aprobado (productos y auth).** `POST /v1/productos/attributes/lote` con la cadena de F1, resolviendo referencias en Firestore (E10). No hay ruta nueva de lectura.
  - Dep: 10.1.
  - Éxito: 10.1 en verde; 1.3 y 1.4 siguen en verde; ningún escritor nuevo de `attributes` fuera de la lista.
  - Hecho (2026-11-03, solo en la copia local, sin push ni despliegue; el diff queda por aprobar por Daniel): `services/catalogo/atributosLote.js`, ruta en `routers/productos.js`, lector de cuerpo de 2 MB en `middleware/atributosLoteCuerpo.js` (montado en `index.js` antes del lector global) y evento `catalogo.atributos.lote` en el registro. Prueba 10.1: 24 de 24 en el emulador; 1.3 (12) y esquemas (16) siguen verdes; la excepción de `indiceTienda.js` en 1.4 es solo para la asignación en memoria.
  - Estado (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (productos y auth: espera revisión de diseño de Daniel). Commits: back `wt-back-tickets-web` `51625f4f`, front `wt-front-tickets-web` `a558894c`.
- [x] 10.3 [P] Front: espejo de la hoja «Especificaciones» (encabezados con clave, `;`, vacía y `(borrar)`) y del filtro del export por ruta, con `node --test`.
  - Dep: 8.0.
  - Hecho (3-nov, bloque F242-B16): `src/app/shared/services/catalogo/hoja-especificaciones.ts` (puro, sin Angular ni Excel; reutiliza `atributos-categoria.ts`) y `tests/productos/hoja-especificaciones.test.js` (28 pruebas, local). Encabezados `Etiqueta (unidad) [clave]` / `(SI/NO)`; la clave manda al leer; vacía no cambia; `(borrar)` borra; varias opciones con `;` solo donde el esquema dice «varias»; fila sin referencia se avisa; instrucciones con tipo, unidad y opciones; `partirEnLotes` de 200; filtro del export por ruta (categoría y subcategorías) con `rutaDelProducto`. Aún no se cablea a ninguna pantalla (10.4 y 10.5).
  - Correcciones de la revisión: el número de fila sale de `__rowNum__` de SheetJS (cuenta bien con filas en blanco); las referencias repetidas en el archivo se avisan y no se mandan (el servidor solo las ve dentro de una petición de 200); `columnasFueraDelEsquema` informa las claves que el esquema no tiene (no se quitan); en el export, la celda de un producto cuyo atributo cambia de tipo entre subcategorías sale vacía. Para 10.4: `leerHoja` necesita el esquema de la categoría, y los textos al comercio de este módulo están fijos en español: decidir ahí si van por i18n.
  - Commits (2026-11-03, B19): front `wt-front-tickets-web` `865bdc78`.
- [ ] 10.4 **Con diff aprobado (importador del Seller).** Descargar con categoría, leer la hoja aparte, llamar el lote en el `next` de la importación o solo, y mostrar el resultado por fila (E10).
  - Dep: 10.0, 10.2, 10.3.
  - Éxito: sin la bandera, 10.0 en verde (la hoja se ignora sin aviso, como hoy); un archivo con solo «Especificaciones» no llama `import-products`.
  - Hecho (3-nov, bloque F242-B17, solo en la copia local, sin push; el diff queda por aprobar por Daniel): `import-modal.component.ts/.html/.scss`, `catalog-attributes.service.ts` (`saveProductAttributesBatch` por `BaseService`) y `importacion-especificaciones.ts` (lógica pura). Con la bandera `categoryAttributes`: selector de categoría en la plantilla (suma la hoja «Especificaciones» con la heredada y sus instrucciones), lectura aparte de la hoja, lote en tandas de 200 después de `import-products` (con `await`, sin temporizadores), archivo con solo «Especificaciones» sin llamar `import-products`, resultado por fila (campo y opciones válidas), Excel «Filas rechazadas», 401/403/404 sin tumbar los productos y reintento de lo que no llegó. Apagada: la hoja se ignora en silencio y 10.0 sigue idéntica. Pruebas locales (no van a git): 38 del componente y 26 de la lógica pura, más las 9 de 10.0 sin cambios.
  - Correcciones de la revisión: con «Solo crear nuevos» las especificaciones de los productos que no se tocaron no se mandan (si el servidor omitió más de los 50 que identifica, no se manda ninguna fila y se avisa); una clave de lista única en una categoría y de varias en otra parte «A; B» por `;`; los avisos de fallo ya no dicen «los productos ya quedaron guardados» cuando solo se cargó la hoja; avisos de lectura y «sin respuesta» por i18n; el título de «cargando» es el de las especificaciones al reintentar; se avisan columnas sin `[clave]`; el aviso al padre aplazado sale también al destruir el componente o antes de pisarlo con otra importación.
  - Desvíos para Daniel: (1) el aviso `importComplete` se aplaza hasta cerrar el diálogo cuando hubo especificaciones (el padre cierra el modal al recibirlo); (2) un archivo con solo «Especificaciones» no avisa al padre. Pendiente: revisión visual a 1440 y 390 px (va con 10.6).
  - Estado (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (importador del Seller: espera revisión de diseño de Daniel) y la revisión visual (10.6). Commits: front `wt-front-tickets-web` `daff1e09`.
- [ ] 10.5 Export de Productos con la hoja «Especificaciones», armada con los documentos que el export ya trae (E10).
  - Dep: 10.0, 10.3.
  - Éxito: sin la bandera, 10.0 en verde; exportar «Networking», corregir y reimportar cambia solo los atributos (prueba en FLORECER con OK de Daniel).
  - Hecho (3-nov, bloque F242-B18, solo en la copia local, sin push; el diff queda por aprobar por Daniel): `productos.component.ts/.html` y `src/assets/i18n/*` (claves `productos.exportarEspecificaciones.*`). Con la bandera `categoryAttributes` el diálogo de exportar ofrece elegir una categoría con atributos (lista del GET de esquemas, que se pide al abrir el diálogo) y el libro suma la hoja «Especificaciones» DESPUÉS de las de siempre, con los productos exportados (todos los filtrados o los seleccionados) cuya ruta es esa categoría o una subcategoría; los valores salen de los documentos que el export ya trae (`fetchAllProductosParaExport`) o de los seleccionados: ninguna ruta de lectura nueva, ninguna escritura, ningún valor del índice. Formato de `hoja-especificaciones.ts` (B16): los mismos encabezados que la plantilla del importador, así que la hoja exportada se reimporta tal cual por B17. Sin categoría elegida, sin esquemas o con la bandera apagada, el libro es el de hoy (instantánea de 10.0 idéntica y el servicio de atributos ni se toca). Si la categoría no tiene productos en lo exportado, el libro sale sin la hoja y se avisa. Pruebas locales (no van a git): `tests/productos/exportar-especificaciones.test.js` (15) y las de 10.0, B16 y B17 siguen en verde (120 en total).
  - Correcciones de la revisión (3-nov, bloque F242-B18): la hoja ubica cada producto con el TEXTO original de `categorias` (el que lee el servidor), no con el objeto que arma `normalizeProducts`: un nodo sin `parent` que no es raíz ya no queda «fuera del árbol»; el export avisa lo que deja fuera (productos sin referencia, productos que no se pudieron ubicar, atributos con tipo distinto entre subcategorías) y el aviso «sin productos» solo sale cuando de verdad no hay ninguno; el selector también ofrece las categorías padre sin atributos propios cuando una subcategoría los tiene; textos en alemán con «du» y comillas «». Prueba local del ciclo completo (exportar «Networking», corregir una celda, subir solo esa hoja al importador real): el lote lleva solo fila, referencia y attributes, no se llama a `import-products` y no hay avisos ni columnas fuera del esquema.
  - Hecho en local; sin marcar hasta la prueba real «exportar Networking, corregir y reimportar» en FLORECER y el diff aprobado por Daniel (espera revisión de diseño de Daniel).
  - Commits (2026-11-03, B19): front `wt-front-tickets-web` `ee48982c`.
- [ ] 10.6 Cierre de diseño: `npm run build:prod` sin errores, gradientes y primarios prohibidos sin subir, ninguna clase con «p-», navegador a 1440 y 390 px.
  - Dep: 10.4, 10.5.
  - Avance (3-nov, bloque F242-B18): `tsc --noEmit` y `ngc --noEmit` sobre `tsconfig.app.json` sin errores (con candado). Gradientes y primarios prohibidos: 0 antes y 0 después en `import-modal` y `productos` (ts, html y scss). Clases nuevas: solo las de Bootstrap ya usadas (`form-select`, `form-text`, `fw-semibold`, `mt-3`), ninguna con «p-». i18n por script de Python bajo candado, solo claves `productos.exportarEspecificaciones.*` (es, en, pt, de). Sin tocar `notas-version.json`. Sin marcar: faltan `npm run build:prod` (el encargo prohíbe compilar con `ng build`) y la revisión visual a 1440 y 390 px del importador y del diálogo de exportar, que necesitan la app en el navegador (con la bandera encendida en FLORECER, con OK de Daniel).
  - **BLOQUEADA** (2026-11-03, B19): faltan `npm run build:prod` (prohibido compilar con `ng build`) y la revisión a 1440 y 390 px con la bandera encendida en FLORECER. Espera revisión de diseño de Daniel. Las comprobaciones hechas (tsc, gradientes, primarios, clases con «p-») están arriba.

## 11. F4 · Comparador

- [x] 11.1 [P] Pruebas en rojo: `tests/sitios/comparador.contract.test.js` (prueba 4), con precio de vitrina en 0 y bloque de catálogo oculto.
  - Dep: 8.0.
  - Hecho (2026-11-03, bloque F242-B13, copia local, la prueba no va a git, D-566): 28 pruebas, todas en rojo antes del código (`compararPublico` no existía). Cubren 404 iguales, el candado por producto, hasta 4 ids, `Cache-Control`, precio con y sin sesión, filas, lecturas, ninguna escritura y el registro sin valores. Con 5 mutaciones del código, 4 hacen fallar pruebas; la del plan gratis la cubre dos veces (el servicio y `leerProductosDeTienda`).
  - Commits (2026-11-03, B19): back `wt-back-tickets-web` `5960553c`, front `wt-front-tickets-web` `7c61a137`.
- [ ] 11.2 **Con diff aprobado (ruta pública).** `GET /public/:slug/comparar` (E9): candado con `esPublicableEnTienda` y el plan sobre la fuente de la tienda, atributos de los derivados, hasta 4 documentos para la vitrina.
  - Dep: 11.1, 9.4, 9.5.
  - Éxito: 11.1 en verde.
  - Avance (2026-11-03, bloque F242-B13, copia local, sin unir): `GET /public/:slug/comparar` con el mismo limitador que `/catalogo`, manejador `compararPublico` y `services/sites/comparador.js`; 11.1 en verde (32 de 32 tras la corrección). Sigue sin marcar hasta el diff aprobado de Daniel (ruta pública nueva, precios con sesión). Decisiones que Daniel confirma: si el bloque oculta los precios, la comparación tampoco los entrega; el registro `catalogo.comparador` (sin ids, títulos ni valores) solo sale si tarda más de 500 ms.
  - Corrección de la revisión (2026-11-03): el registro `catalogo.comparador` sale solo si tarda más de 500 ms (como `catalogo.facetas`); el documento se vuelve a mirar (activo y precio de vitrina mayor que 0) antes de entregar; cada fila trae `aplica[]` («no aplica» frente a «sin dato») y `difiere` solo cuenta a los que aplica; 32 pruebas en verde. La spec `tienda-comparador` recoge tres precisiones que Daniel confirma con el diff: lecturas «con la tienda cargada», marca «no aplica» y sin precios si el bloque los oculta.
  - Estado de cierre (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (ruta pública nueva y precios con sesión: espera revisión de diseño de Daniel). Commits: back `wt-back-tickets-web` `5960553c`, front `wt-front-tickets-web` `7c61a137`.
- [ ] 11.3 **Con diff aprobado (tienda).** Botón «Comparar» en tarjeta y ficha, barra, diálogo y tabla (E9).
  - Dep: 11.2.
  - Éxito: sin la bandera, instantáneas iguales; 390 px sin desplazamiento de la página, también con `tecnologia-catalogo`.
  - Avance (2026-11-03, bloque F242-B14, copia local, sin unir): `utils/siteHtmlComparador.js` (botón, script del navegador y estilos) con ganchos mínimos en `utils/siteHtml.js` (tarjeta del servidor y del script, ficha, y el script/estilos solo si hay algo que comparar) y `comparador: true` en `controllers/sites.js` solo con `categoryAttributes`, un bloque de catálogo visible en lo publicado y fuera de la vista previa. Prueba `comparadorTienda.test.js` (local, D-566): 36 pruebas en verde con Chromium, 5 mutaciones del código la hacen fallar. Sigue sin marcar hasta el diff aprobado de Daniel (la tienda pública). Decisiones que Daniel confirma: «Comparar (1)» no abre nada y pide elegir otro (`aria-disabled`); en la vista previa del editor no sale; la barra se aparta unos segundos mientras sale el aviso «Agregado» del carrito.
  - Corrección de la revisión (2026-11-03, B14): (1) la barra entra en la pila de elementos fijos: en celular va a lo ancho encima del aviso de cookies y KAI sube sobre ella, en escritorio sube sobre el aviso de cookies; probado a 360, 390, 768 y 1280 px con cookies, WhatsApp, KAI y carrito (sin la regla, la prueba falla). (2) El botón vuelve a ser solo del catálogo y de la ficha, como dice la spec: las tarjetas del bloque «productos» y de venta cruzada NO lo llevan (no tienen los candados del catálogo y el producto desaparecería de la tabla). (3) La condición que enciende el comparador (`activo()` en `utils/siteHtmlComparador.js`) tiene prueba propia: bandera, catálogo oculto, sin bloque de catálogo y vista previa. (4) Dos pestañas de la misma tienda comparten la selección (evento `storage`). Pruebas: 46 en verde.
  - Estado de cierre (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (tienda pública: espera revisión de diseño de Daniel). Commits: back `wt-back-tickets-web` `cbe90086`, front `wt-front-tickets-web` `6bad6721`.
- [ ] 11.4 Accesibilidad del comparador: axe-core en 0 fallas, foco atrapado y Esc.
  - Dep: 11.3.
  - Avance (2026-11-03, bloque F242-B14, copia local): axe-core WCAG 2.1 A/AA en 0 fallas con el comparador cerrado (botones y barra) y abierto, a 1280 y 390 px, con la tienda de pruebas y las plantillas `moda-coleccion` y `tecnologia-catalogo` (comparador y página entera; solo las dos fallas que la tienda ya tenía con y sin bandera, anotadas en E13). Foco atrapado con Tab y Mayús+Tab, Esc y tocar fuera cierran y el foco vuelve a la barra, `:focus-visible` de 3 px y áreas de 44 px medidos. Sigue sin marcar porque depende de 11.3.
  - Corrección de la revisión (2026-11-03, B14): los avisos («Máximo 4 productos», «Quitado de la comparación», «Comparación vacía») salen de una región `role=status` que existe desde que carga la página y no se esconde con la barra; al pulsar «Vaciar» el foco pasa al último botón de producto en vez de caer a `body`. **Sigue sin marcar por una decisión de Daniel:** la spec pide cero fallas de axe y en la página entera quedan las dos que la tienda ya tenía con y sin bandera (enlace «Ir al inicio»; contraste de «Plazo de entrega» y «Quedan pocas unidades»). Arreglarlas cambia el HTML y la hoja de todas las tiendas, así que Daniel decide entre arreglarlas en un cambio aparte o registrar la excepción. La prueba solo tolera esas dos; cualquier otra falla la rompe.
  - Estado de cierre (2026-11-03, B19): sin marcar por 11.3 y por la decisión de Daniel sobre las dos fallas de la página entera. Commits: back `wt-back-tickets-web` `cbe90086`, front `wt-front-tickets-web` `6bad6721`.

## 12. F5 · Feed y JSON-LD

- [x] 12.1 Caracterización: instantánea de `feedProductos` sin la bandera.
  - Dep: 8.0.
  - Hecho (3-nov, bloque F242-B01): en la misma prueba local de 9.1.
  - Commits (2026-11-03, B19): front `wt-front-tickets-web` `ea1ff720` (casilla); la prueba es local.
- [x] 12.2 [P] Pruebas en rojo: `tests/sitios/feedAtributos.test.js` (prueba 6).
  - Dep: 8.0.
  - Hecho (3-nov, bloque F242-B15): la prueba local (D-566) estuvo en rojo antes del código (12 de 18 fallaban) y hoy corre 20 de 20.
  - Commits (2026-11-03, B19): back `wt-back-tickets-web` `86658d46`, front `wt-front-tickets-web` `8ed9246b`.
- [ ] 12.3 **Con diff aprobado (feed).** `g:product_type` con la ruta y `g:product_detail` (E11). La caché del feed no cambia (pregunta 14).
  - Dep: 12.1, 12.2.
  - Éxito: 12.1 y 12.2 en verde.
  - Avance (3-nov, bloque F242-B15, commit local en el backend, sin unir ni desplegar; **sigue sin marcar hasta que Daniel apruebe el diff**, que cambia el catálogo público para Google y Meta, solo con `categoryAttributes`): `utils/feedCatalogo.js` (funciones puras) y `feedProductos` en `controllers/sites.js`. Con la bandera: `g:product_type` con la ruta completa («Networking > Routers», 750) y un `g:product_detail` por valor visible («Especificaciones» o «Compatibilidad», nombre y valor de 1 a 150 caracteres sin partir un carácter, hasta 100; sin los caracteres que el XML no admite; todo con `esc`). Se omiten las etiquetas que el catálogo ya publica en su propio campo, también sus variantes. Sin la bandera, plan gratis o falla del registro: el feed de hoy, con la misma caché (`public, max-age=1800`; apagado en 35 min). Lecturas nuevas: ninguna de `products`; con la bandera el feed pide el registro de esquemas (`getCatalogSchemas`, el de la ficha: una lectura de `categorias` con `select` por empresa, en caché `SEARCH_INDEX_TTL`; consulta por `company`, sin índice nuevo). Pruebas (locales): `feedAtributos` 20/20 (4 mutaciones iniciales y 2 de la corrección la rompen), `feedCatalogo` 5, `feedMarcaReferencia` 3, `feedFotoJpeg` 16, instantánea 12.1 sin bandera idéntica (`caracterizacionTiendaPublica` 18/18), `consultarCatalogo.golden` y `catalogoFacetas.contract` en verde. Decisiones que Daniel confirma con el diff: (a) la lista de etiquetas omitidas (marca, precio, envío, GTIN/EAN/UPC/código de barras, referencia/MPN/SKU/número de parte, título, descripción, condición, disponibilidad, estado, stock, enlace, imagen) y que se omite por palabra, así que «Marca compatible» también se omite; (b) si algún nivel de la ruta es una categoría oculta de la tienda o excluida del catálogo, sale el `product_type` de hoy (enmienda a la spec `catalogo-feed-atributos`).
  - Corrección de la revisión (3-nov, B15): las etiquetas propias se comparan por palabra (variantes como «Marca del producto» o «Número de parte») y se añadieron condición, disponibilidad, estado, stock, enlace e imagen; la guarda de la ruta cubre también `feedCategoriasExcluidas`; el tipo y el esquema por ruta se calculan una vez por feed; la prueba de «contrato» por expresiones regulares se quitó (el escape y la bandera ya tienen pruebas de comportamiento). Sin medición de tiempo del feed completo: se mide antes de encender en un comercio grande.
  - Estado de cierre (2026-11-03, B19): hecho en local; sin marcar hasta el diff aprobado (feed para Google y Meta: espera revisión de diseño de Daniel). Commits: back `wt-back-tickets-web` `86658d46`, front `wt-front-tickets-web` `8ed9246b`.
- [ ] 12.4 JSON-LD: Schema Markup Validator y prueba de resultados enriquecidos de Google sin errores nuevos en una ficha de FLORECER (con 5.3).
  - Dep: 5.3.
  - **BLOQUEADA** (2026-11-03, B19): necesita 5.3 (bandera encendida en FLORECER) y una ficha real; se corre con el validador público de Schema Markup y la prueba de resultados enriquecidos de Google, que son externos.
- [ ] 12.5 Daniel valida el feed del piloto en Merchant Center y en Meta (antes 6.4).
  - Dep: 12.3, 9.12.
  - Éxito: sin errores ni advertencias nuevos; `product_type` con la ruta; al apagar, el feed vuelve al de hoy en 35 min o menos.
  - **BLOQUEADA** (2026-11-03, B19): la valida Daniel en Merchant Center y Meta con el feed del piloto; depende de 12.3 aprobada y de 9.12.

## 13. Cierre de la ampliación

- [ ] 13.1 Bitácora en `CONTRACT.md` por fase (F2, F3, F4, F5) y comentario técnico en el ticket 1234.
  - Dep: cada fase.
  - **BLOQUEADA** en lo que escribe en `CONTRACT.md` y en el ticket 1234 (2026-11-03, B19): las entradas D-XXX las asigna el orquestador y los tickets no se comentan desde esta fila.
  - Parte sin contrato, hecha (B19): «Resumen de evidencia al 2026-11-03» al final de este archivo y en `design.md`; incluye el texto que sigue.
  - Texto para el comentario técnico del ticket 1234 (quien lo atienda): F2 a F5 están implementados en la copia local detrás de `categoryAttributes` (facetas con conteos, panel y chips, comparador de hasta 4 productos, feed con `product_type` de ruta y `product_detail`, carga masiva por Excel con plantilla y export por categoría); nada está unido, desplegado ni encendido; cada diff espera la aprobación de Daniel; disponibilidad y valoración quedan fuera.
- [ ] 13.2 Cuando todo esté encendido y probado: 7.1 y 7.2.

## Resumen de evidencia al 2026-11-03 (bloque F242-B19)

> Fuente: `git log` de `feature/tickets-aws-claude-1` en los dos repos (todos los hashes se verificaron con `git cat-file`). Back = `wt-back-tickets-web`, front = `wt-front-tickets-web`. Nada tiene push, despliegue ni bandera encendida. Las pruebas son locales y no van a git (D-566); los números son los de la corrida de hoy.

**Hecho y marcado `[x]` en este grupo:** 8.2, 9.1, 9.2, 9.3, 9.8, 9.9, 10.0, 10.1, 10.3, 11.1, 12.1, 12.2 (más 5.1 y 5.2 de F1, ya marcadas). Ojo con el alcance de 8.2 (datos de `katuq_dev`) y de 9.9 (medición, no puerta para encender).

**Aviso de H5:** todo lo anterior vive detrás de `categoryAttributes` (apagada) excepto H5 (back `7d135b76`, tarea 9.6), que cambia el HTML de las tiendas con 25 a 40 marcas sin la bandera. Se decide aparte de las facetas.

**Convención de marcas (aclaración de B19):** B19 desmarcó 9.4, 9.5, 10.2 y 10.4, que bloques anteriores habían dejado en `[x]`, porque su título dice «Con diff aprobado» y el diff no está aprobado. Si Daniel prefiere que `[x]` signifique «hecha y probada en local», se vuelven a marcar esas cuatro, sin otro cambio.

**Hecho en local y sin marcar hasta que Daniel apruebe el diff** (la regla de «Con diff aprobado»): 9.4, 9.5, 9.6, 9.7, 9.10, 10.2, 10.4, 10.5, 11.2, 11.3, 11.4, 12.3.

**BLOQUEADAS:** 5.3, 5.4, 7.1, 7.2, 8.0 (solo la fila de `CONTRACT.md`; aprobada el 2026-10-21), 8.1 (Baudio sin sitio), 8.3 paso 1, 8.6, 9.12, 10.6, 12.4, 12.5, 13.1 (contrato y ticket). Abiertas sin bloqueo propio: 8.4 (H4 aparte), 8.5 (la lee Daniel), 9.11 (falta la nota en la propuesta de TX-34), 13.2, 4.5.

| Bloque | Tareas | Commits back | Commits front | Pruebas locales de hoy |
|---|---|---|---|---|
| B01 | 9.1, 12.1 | `381251cf` | `ea1ff720` | `caracterizacionTiendaPublica` 18/18; `consultarCatalogo.golden` 4/4 |
| B02 | 10.1, 10.2 | `51625f4f` | `a558894c` | `atributosLote.contract.emulator` 24/24 (emulador de Firestore) |
| B03 | 8.4, H6 | `9506ae1c` | `ba2c9316` | solo Markdown |
| B04 | 8.1, 8.2 | `67d7d05a` | `53884e4f` | `verificarAtributosEmpresa` 29 verificaciones |
| B05 | 9.2, 9.3 | `8ede46ef` | `1ec3564a` | `facetas` 58/58 |
| B06 | 9.4, 9.11 | `4e9a858f` | `cc9120cb` | `derivadosFacetas` 19/19; `fuenteFacetas` 14/14 |
| B07 | 9.5 | `740a05b7` | `8124747d` | `precioMayoristaFacetas` 13/13 |
| B08 | 9.6 (H5) | `7d135b76` | `5710b5d2` | `marcasSinCorte` 15/15 |
| B09 | 9.6 | `04a427ec` | `21f60123` | `catalogoFacetas.contract` 37/37 |
| B10 | 9.8, 9.9 | `d303d354` | `d9c7cb50` | `medirFacetasSoloLectura` 10/10; `velocidadFacetas.ci` 4/4 |
| B11 | 9.7 (1) | `abddb00f` | `d68d3737` | `facetasPanel` 29/29; `facetasPanel.navegador` 32 OK (Chromium, 1440 y 390 px) |
| B12 | 9.7 (2), 9.10 | `23fb504b` | `2ae52179` | `facetasSeoYAxe` 17/17 |
| B13 | 11.1, 11.2 | `5960553c` | `7c61a137` | `comparador.contract` 32/32 |
| B14 | 11.3, 11.4 | `cbe90086` | `6bad6721` | `comparadorTienda` 47 OK (Chromium) |
| B15 | 12.2, 12.3 | `86658d46` | `8ed9246b` | `feedAtributos` 20/20 |
| B16 | 10.0, 10.3 | no aplica | `865bdc78` | `seller-caracterizacion` 9/9; `hoja-especificaciones` 33/33 |
| B17 | 10.4 | no aplica | `daff1e09` | `importador-especificaciones` 38/38; `importacion-especificaciones` 26/26 |
| B18 | 10.5 | no aplica | `ee48982c` | `exportar-especificaciones` 20/20; `exportar-reimportar-especificaciones` 1/1 |

**Sin regresión en F1:** `atributosCategoria` 39/39 y `escritoresDeAtributos.contract` 5/5.

**Fallos previos que no son de este cambio** (se midieron en una copia de `HEAD` sin los cambios, B12 y B14): `carritoWhatsapp` caso 46, `fichaEspecificaciones` (hash de estilos y videos) y `tiendaEnUnPaso` (Opttia caído).

**Lo que falta, en orden de dependencia:**

1. Daniel lee la revisión de seguridad privada (8.5) y aprueba, uno por uno, los diffs: fuente y precios de la tienda (9.4, 9.5), catálogo público (9.6), tienda (9.7, 11.3), ruta pública del comparador (11.2), lote de atributos (10.2), importador y export del Seller (10.4, 10.5) y feed (12.3).
2. Daniel decide: las dos fallas de accesibilidad de la página entera (9.10, 11.4); el rango numérico sin JavaScript (9.7); `noindex` con canónica y Search Console (9.7); textos de presentación de facetas y comparador; la lista de etiquetas que el feed omite (12.3); la referencia con espacios al borde en el lote (10.2); H4 como cambio propio (8.4); el limitador por sitio, que queda propuesto y no activado (9.9).
3. El orquestador asigna las entradas D-XXX en `CONTRACT.md` (8.0, 5.4, 13.1) y quien atiende el ticket 1234 deja la nota de 8.6 y el comentario técnico de 13.1.
4. Quien atiende TX-34 deja la nota con el orden de unión (9.11).
5. Repetir H1, H2 y la medición de E12 en una copia fresca; arreglar Baudio (sitio) y cargar su `mostrarMarcas`.
6. `npm run build:prod` y la revisión a 1440 y 390 px del importador y del export (10.6, 4.5), con la bandera encendida en FLORECER (5.3) con el OK de Daniel.
7. Piloto en FLORECER (5.3, 9.12), JSON-LD (12.4), feed en Merchant Center y Meta (12.5), retiro de la bandera antes del 2027-04-30 (7.1, 7.2).
