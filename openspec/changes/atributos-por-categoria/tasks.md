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

- [ ] 0.1 Daniel confirma o cambia las respuestas por defecto (`design.md`, Open Questions 1 a 12).
  - Dep: —.
  - Éxito: quedan anotadas en `design.md` y en la entrada D-495 de `CONTRACT.md`.
- [ ] 0.2 Daniel aprueba las dos specs (`specs/*/spec.md`), `design.md` y esta lista, y la excepción de `createCategoria` sin bandera (D3).
  - Dep: 0.1.
  - Éxito: aprobación y excepción con fecha en `CONTRACT.md`.
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
  - Hecho el 2026-10-18 (números en design.md, «Resultado de la medición»). Activa una parada: 4 empresas tienen más de un documento de `categorias`. F1 espera la decisión de Daniel.
  - Dep: 0.4.
  - **Parar y volver al diseño** si:
    - alguna empresa tiene más de un documento de `categorias`;
    - el documento pasa de 700 KB;
    - algún producto ya tiene `attributes` en la raíz;
    - el registro proyectado con 30 atributos pasa de 250 KB por empresa.
- [x] 0.6 [P] Bandera `categoryAttributes` en `services/companyFeatureFlags.js` y `company-features.service.ts`. Dueño: Daniel. Retiro: 2027-04-30.
  - Dep: 0.2.
  - Éxito: la suite de banderas sigue en verde, y una prueba nueva deja la bandera apagada si falta o no vale `true`.
- [ ] 0.7 Escalar a Daniel el endurecimiento de cómo resuelven la empresa los handlers existentes que tocan 3.2 y 3.4. Debe quedar como cambio en el openspec del backend privado, sin detalle en este repo.
  - Dep: 0.2.
  - Éxito: el cambio privado está nombrado y Daniel decidió si va antes de 5.1.

## 1. Pruebas de F1, primero y en rojo

Las pruebas de contrato son `*.emulator.test.js` y corren contra el emulador de Firestore con un proyecto `demo-`, como `tests/inventory`. No usan `scripts/lib/firestoreFalsa.js`.

- [ ] 1.1 [P] `tests/catalogo/atributosCategoria.test.js` (D8.1). Cubre:
  - 6 formas, alias y etiquetas en cadena y divergentes;
  - `documentoDeCategorias` con varios documentos.
  - Dep: 0.2.
  - Éxito: falla porque el módulo no existe.
- [ ] 1.2 [P] `tests/catalogo/esquemasAtributos.contract.emulator.test.js` (D8.2). Cubre:
  - GET y PUT: 401 sin sesión, 403 con la bandera apagada, 409, 400 y 200;
  - `createCategoria`: conserva, renombra con versión+1, ignora el cuerpo y mantiene el id;
  - `create` y PUT simultáneos sin perder esquemas;
  - varios documentos;
  - `/all` sin `attributeSchemas*`.
  - Dep: 0.2.
  - Éxito: falla por las rutas inexistentes.
- [ ] 1.3 [P] `tests/productos/atributosWriteSet.contract.emulator.test.js` (D8.3). Cubre:
  - solo cambian `attributes.<key>`, `date_edit` y `user_edit`; las demás claves siguen; `null` borra;
  - `precio`, `preciosPorTipoCliente`, `variantes` e `integrations` quedan idénticos;
  - 401, 403 con la bandera apagada y 404 de otra empresa; sin `syncProduct`;
  - `/edit` con un POST intercalado (espía antes del `update`);
  - `/create`, `createMultiple` e `importProducts` con `attributes` en el cuerpo.
  - Dep: 0.2.
  - Éxito: falla, y el canario `update({attributes: {...}})` también la hace fallar.
- [ ] 1.4 [P] `tests/catalogo/escritoresDeAtributos.contract.test.js` (D8.4, estático): escritores permitidos e inventario sin `attributes`. No exige `merge`: las creaciones con id nuevo son legítimas.
  - Dep: 0.2.
  - Éxito: pasa hoy y falla con un escritor fuera de la lista (mutación temporal).
- [ ] 1.5 [P] `tests/sitios/fichaEspecificaciones.test.js` (D8.5), con instantánea de la ficha HTML y del JSON de `productoPublico` con la bandera apagada.
  - Dep: 0.2.
  - Éxito: los casos nuevos fallan y las instantáneas pasan.
- [ ] 1.6 [P] Front: fixture `atributos-esquemas.json`, copia del backend, y spec del espejo (corrido como spec único).
  - Dep: 0.2.
  - Éxito: falla porque las funciones no existen.

## 2. Núcleo puro

- [ ] 2.1 `services/catalogo/atributosCategoria.js` (D2).
  - Dep: 1.1.
  - Éxito: 1.1 en verde.

## 3. Backend F1

- [ ] 3.1 **Con diff aprobado (maestro).** GET y PUT `/v1/categorias/attribute-schemas` en `routers/categorias.js`. Llevan `auth`, 401 sin sesión, `requireFeature`, transacción con versión, topes e `invalidateSearchIndex`.
  - Dep: 2.1, 1.2, 0.6.
  - Éxito: la parte de GET y PUT de 1.2 en verde.
- [ ] 3.2 **Con diff aprobado (maestro).** `createCategoria` en `runTransaction` (D3) y `getcategorias` sin `attributeSchemas*`.
  - Dep: 2.1, 1.2, 0.7.
  - Éxito: 1.2 completo en verde; las pruebas de onboarding e importación de categorías no cambian.
- [ ] 3.3 **Con diff aprobado (productos).** `POST /v1/productos/attributes`, con `auth`, 401 sin sesión y `requireFeature`. Escribe por ruta, sin `syncProduct`, e invalida índice y paginación.
  - Dep: 2.1, 1.3, 0.6.
  - Éxito: la parte del endpoint de 1.3 en verde, y 1.4 en verde con el archivo permitido.
- [ ] 3.4 **Con diff aprobado (productos).** `exports.edit` quita `attributes` de `updateData` y de `productData`; `exports.create`, del cuerpo.
  - Dep: 1.3, 0.7.
  - Éxito: 1.3 completo en verde; las suites de productos no cambian.
- [ ] 3.5 **Con diff aprobado (índice y ficha públicos).** Cambios:
  - `getCatalogSchemas` en el registro de `getSearchIndex`;
  - `marcaDeLaEmpresaSinCache` con `limit(2)` y regla D-385;
  - `productoParaFicha` con esquema opcional;
  - ficha y `productoPublico`;
  - pestañas y `additionalProperty`.
  - Dep: 2.1, 1.5.
  - Éxito: 1.5 en verde; la suite de sitios queda con los mismos fallos previos, sin nuevos.
- [ ] 3.6 Logs de D7 en 3.1, 3.2 y 3.3, con prueba de que no llevan valores.
  - Dep: 3.1 a 3.3.
  - Éxito: ningún `console.log` nuevo (grep).
- [ ] 3.7 `node --check` y suites relacionadas, también las del emulador: banderas, onboarding, `importProductsPhotos`, productos, sitios y catálogo.
  - Dep: 3.1 a 3.6.
  - Éxito: verde, o los mismos fallos previos documentados.

## 4. Front F1

- [ ] 4.1 [P] `CatalogAttributesService extends BaseService`, con `getSchemas`, `saveSchemas` y `saveProductAttributes`.
  - Dep: 3.1, 3.3.
  - Éxito: compila, sin `HttpClient` en componentes.
- [ ] 4.2 [P] Espejo: `documentoDeCategorias`, `esquemaEfectivo` y tipo.
  - Dep: 1.6.
  - Éxito: 1.6 en verde.
- [ ] 4.3 **Con diff aprobado (maestro).** Maestros:
  - acción "Atributos" y `CategoriaAtributosComponent` (standalone, OnPush);
  - deshabilitada con el árbol sucio;
  - `WeakMap` de renombres;
  - con la bandera, documento elegido por el espejo.
  - Dep: 4.1, 4.2, 3.2.
  - Éxito: renombrar "Networking" conserva los atributos de "Networking > Routers"; sin la bandera, todo queda como hoy.
- [ ] 4.4 **Con diff aprobado (productos).** Pestaña "Especificaciones" con `EspecificacionesProductoComponent` (standalone, OnPush), llamada en el `next`, sin `setTimeout`, y aviso si falla.
  - Dep: 4.1, 4.2, 3.3.
  - Éxito: crear y editar guardan `products.attributes`; sin la bandera, el payload de `/create` y `/edit` es idéntico.
- [ ] 4.5 Cierre de diseño:
  - `npm run build:prod` sin errores;
  - gradientes y primarios prohibidos sin subir;
  - ninguna clase con "p-";
  - navegador a 1440 y 390 px.
  - Dep: 4.3, 4.4.
  - Éxito: los cuatro puntos anotados.

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
