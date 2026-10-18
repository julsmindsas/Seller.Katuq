# Tareas — Fotos de producto uniformes, fase 1 (D-501)

> Se ejecutan después de aprobar `design.md`, `anexo.md` y la spec.
>
> - **Marcas:**
>   - `[P]`: paralelizable; no comparte archivos con otra `[P]` del grupo.
>   - **Sensible:** escribe `products` (catálogo). D-134 no aplica, porque es la regla de inventario. Aun así, por D-501 y la regla de tareas de `openspec/config.yaml` («un cambio a la vez con diff y aprobación explícita»), estas tareas van con diff aprobado y de a una.
> - **Cierre de cada tarea de código:** pruebas en verde.
>   - Backend: el módulo carga (`node -e "require('./routers/productPhotos')"`) y las suites existentes siguen en verde.
>   - Front: `npm run build` sin errores y revisión del diff de los dos `environment`.
> - **Límites:**
>   - leer los archivos antes de editarlos;
>   - sin commit, push ni despliegue fuera de 5.x;
>   - nada en Firestore real salvo lo indicado.

## 0. Prerrequisitos

- **0.1** Daniel confirma los valores por defecto (anexo §F) y aprueba la colección nueva `product_photo_batches` y las rutas `/v1/product-photos/*`.
  - Éxito: la respuesta queda en `specs/CONTRACT.md`, bajo D-501.
- **0.2 [P]** Medición de solo lectura: ¿fallan hoy las portadas WebP en WhatsApp y en el correo?
  - Éxito: el dato queda en la bitácora. Si no fallan, se reconsidera P7.
- **0.3 [P]** Script de solo lectura con `--dry-run`. Revisa:
  - los `provider` de `integration_configs` que escriben catálogo;
  - los tipos de nodo de los flows activos;
  - los escritores de `imagenesPrincipales`.
  - Éxito: el anexo §E queda confirmado y FLORECER, «sin sync».
- **0.4 [P]** Conteo de solo lectura en FLORECER. Separa:
  - fotos del bucket propio con dueño de la empresa;
  - sin dueño;
  - de otra empresa;
  - de otro bucket o enlace externo;
  - texto legacy.
  - Éxito: el dato queda en la bitácora. Si `owner_unknown` es la mayoría, Daniel decide (D1).
- **0.5** El cambio del backend privado sobre el lector del historial de producto está desplegado y verificado.
  - Bloquea: 3.1, 3.3 y 5.4.
  - Éxito: Daniel lo confirma en la bitácora.

## 1. Pruebas primero (en rojo)

Backend: `functions/tests/productPhotos/`, con `node tests/productPhotos/<archivo>.test.js`. Front: `tests/productos/`, con `node --test`. Todas usan dobles en memoria.

- **1.1 [P]** `routes.contract.test.js`:
  - esquemas y códigos de las 7 rutas (anexo §A);
  - orden de la cadena;
  - bandera apagada → 403; modo `off` → 503 solo en `POST /preview` y `POST /batches`; consultar, cancelar y revertir funcionan en `off` y `shadow`;
  - rol no admin → 403; lote de otra empresa → 404;
  - dos vistas previas simultáneas de la misma empresa → 429 `PREVIEW_RUNNING`; la undécima en 10 min → 429 `PREVIEW_RATE_LIMIT`.
  - Depende de: 0.1.
- **1.2 [P]** `writeset.contract.test.js`, con dobles que registran cada escritura. Exige:
  - **vista previa:** cero escrituras;
  - **lote `shadow`:** cero escrituras fuera de `product_photo_batches` (nada en `products`, `productHistory` ni Storage);
  - **lote `on`:** en `products`, solo `crearProducto.imagenesPrincipales`, `user_edit` y `date_edit` (cadena ISO); en cada foto, solo `urls`, `path`, `original` y `processed`, con el mismo orden y largo;
  - **reversión en cualquier modo:** lo mismo, sin Storage;
  - **historial:** con los tipos del anexo §C (`fecha` y `timestamp` en ISO, textos cortos, `fotos` sin rutas);
  - **resultados:** en la subcolección, sin rutas;
  - **Storage:** solo en la carpeta de la empresa, con precondición de no existir y sin `delete`;
  - **nunca:** precios, `preciosPorTipoCliente`, `inventory`, `inventoryMovement`, `integrations`, `exposicion`, categorías, variantes ni `companies`.
  - Depende de: 0.1.
- **1.3 [P]** `writersRegistry.contract.test.js`: falla si un archivo de `controllers/`, `services/`, `tools/` o `utils/` escribe `imagenesPrincipales` sin estar en el anexo §E.
  - Depende de: 0.3.
- **1.4 [P]** `photoUniform.test.js`, con fotos generadas por `sharp` en la prueba. Cubre:
  - proporciones y margen;
  - que no agranda;
  - `trim_skipped`;
  - transparencia;
  - salida sin EXIF ni GPS;
  - SVG y bytes basura rechazados;
  - tiempo límite;
  - nombres de variantes;
  - JPEG de portada;
  - **lienzo de 900 px:** `urls` = `-w900.webp`, que existe;
  - **un solo token por foto,** con el que `srcsetDe(urls)` arma URLs que existen;
  - el cálculo de calidad contra `photo-quality-vectors.v1.json`.
  - Depende de: —.
- **1.5 [P]** `eligibility.test.js` (incluye tenant):
  - producto de otra empresa;
  - `integrations` e `integraciones`;
  - `exposicion.imagenes`;
  - texto legacy;
  - URL `/o/…` de otro bucket → `external_link`;
  - archivo de otra empresa → `not_owned`;
  - sin dueño → `owner_unknown`;
  - `original.path` ajeno al reprocesar y al revertir;
  - foto excluida;
  - `already_uniform`;
  - empresa con sync → `COMPANY_HAS_PRODUCT_SYNC`, también con un nodo `shopify-bulk-product-sync`.
  - Depende de: 0.3.
- **1.6 [P]** `batchRunner.test.js`:
  - arriendo vencido retomado sin repetir;
  - modo releído en cada producto (bajar a `off` o a `shadow` para el lote como `stopped`);
  - bandera apagada → `feature_off`;
  - lote `shadow` que no escribe aunque suba el modo;
  - sin `CRON_ENABLED=true`, no retoma;
  - con el modo en `off`, solo toma lotes de reversión;
  - dos llaves distintas → un solo lote activo (`BATCH_RUNNING`);
  - cancelación;
  - tope 422.
  - Depende de: 0.1.
- **1.7 [P]** Front:
  - `photo-quality.test.js`: cálculo puro contra la misma versión de los vectores, copiada al repo;
  - `fotos-uniformes.test.js`: mapper con mensajes por código y ajustes;
  - `fotos-uniformes-componentes.test.js`: pasos, consulta hasta el estado final, cierre que cancela la consulta y modo `off` que solo ofrece revertir;
  - `producto-conserva-llaves-de-foto.test.js`: guardar conserva `original` y `processed`.
  - Depende de: 0.1.

Éxito de 1.x: cada prueba existe y falla.

## 2. Piezas sin escritura

- **2.1 [P]** `utils/productPhotoUniform.js` y `photo-quality-vectors.v1.json`, sin modificar `utils/siteImagenes.js`.
  - Depende de: 1.4.
  - Éxito: 1.4 en verde.
- **2.2 [P]** `settings.js` y `eligibility.js`, con el lector puro `{ bucket, path }` y la regla de pertenencia. `findCompanyDocs` debe dar exactamente 1, y `controllers/media.js` queda sin cambios.
  - Depende de: 1.5.
  - Éxito: 1.5 en verde, salvo los casos de sync.
- **2.3 [P]** `syncDetector.js`, con el criterio amplio y la lista del anexo §E.
  - Depende de: 0.3, 1.3 y 1.5.
  - Éxito: 1.3 y 1.5 en verde.
- **2.4 [P]** `photoStorage.js`:
  - lee con la regla de pertenencia;
  - escribe con un token por foto, `metadata.company` y precondición de no existir;
  - no tiene función de borrar.
  - Depende de: 2.1 y 2.2.
  - Éxito: la parte de Storage de 1.2 en verde.
- **2.5 [P]** Bandera `productPhotoUniform`, con dueño y retiro en el comentario, en `services/companyFeatureFlags.js:54` y `company-features.service.ts:11`. No va en `banderasEmpresaNueva.js`.
  - Depende de: 0.1.
  - Éxito: las pruebas de banderas existentes, en verde.

## 3. Escritura y lote

- **3.1 Sensible.** `batchStore.js`: transacción por producto con `changed_meanwhile`, `products`, `productHistory`, resultado y contadores; también el candado al crear y al liberar.
  - Depende de: 0.5, 1.2, 2.2 y 2.4.
  - Éxito: 1.2 en verde en `on`; diff aprobado por Daniel.
- **3.2** `batchRunner.js`: arriendo, semáforo compartido, modo efectivo releído, `CRON_ENABLED`, topes y cancelación.
  - Depende de: 3.1.
  - Éxito: 1.6 en verde y 1.2 en verde en `shadow`.
- **3.3 Sensible.** Reversión por lote, por producto y por foto, en cualquier modo.
  - Depende de: 0.5 y 3.1.
  - Éxito: los casos de reversión de 1.2 en verde; diff aprobado.
- **3.4** `controllers/productPhotos.js` y `routers/productPhotos.js`, con la compuerta en `try`, el modo solo en vista previa y lotes, los topes de la vista previa y el montaje en `index.js`.
  - Depende de: 2.3, 2.5, 3.2 y 3.3.
  - Éxito: 1.1 en verde; `/v1/media` y `/v1/productos` sin cambios en el diff.
- **3.5** Observabilidad: una línea JSON con `correlationId`, sin `console.log` de telemetría, sin URLs con token ni imágenes.
  - Depende de: 3.4.
  - Éxito: grep limpio en `services/productPhotos/`.

## 4. Front

- **4.1 [P]** `product-photos.service.ts` (extiende `base.service.ts`, con `SKIP_LOADER`), `product-photos.mapper.ts`, `photo-quality.ts` y `photo-quality-canvas.ts`.
  - Depende de: 1.7 y 3.4.
  - Éxito: las pruebas puras de 1.7 en verde.
- **4.2** Diálogo standalone OnPush en `components/productos/fotos-uniformes/`, según el design-system. Clases `fu-*` sin «p-».
  - Depende de: 4.1.
  - Éxito: la prueba del componente, en verde.
- **4.3** Botón en la barra masiva (`productos.component.html:418`), visible con la bandera y una selección.
  - Depende de: 4.2.
  - Éxito: el diff se limita al botón y a abrir el diálogo.
- **4.4** Botón «Uniformar fotos de esta categoría» junto al filtro, solo con la bandera y una categoría real en `filtros.categoria`. Manda `categoryLabel` y muestra el tope de 100.
  - Depende de: 4.2.
  - Éxito: el diff se limita al botón.
- **4.5 Sensible.** Editor `crear-productos`: botón en la pestaña Imágenes (producto guardado y bandera) y aviso en `processSelectedFiles`. El guardado no cambia.
  - Depende de: 4.2.
  - Éxito: `producto-conserva-llaves-de-foto.test.js` en verde; diff aprobado.
- **4.6** Cierre:
  - `npm run build` sin errores;
  - degradados y primarios prohibidos de `components/productos/` sin subir;
  - revisión a 1440 y 390 px.
  - Depende de: 4.3, 4.4 y 4.5.

## 5. Verificación y despliegue

- **5.1** Revisión independiente de back y front contra el write-set y la seguridad. Los hallazgos ajenos van al backend privado.
  - Depende de: 3.5 y 4.6.
- **5.2** `git pull`, commit por ruta y despliegue del backend con la bandera apagada y `PRODUCT_PHOTO_UNIFORM_MODE=shadow`; luego el front.
  - Depende de: 5.1 y la autorización de Daniel.
  - Éxito: las rutas responden 403 sin la bandera y Daniel confirma qué proceso de producción tiene `CRON_ENABLED=true`.
- **5.3** Daniel enciende FLORECER (simulación y `--execute`). Se corre un lote en sombra de unos 20 productos para calibrar P8 y medir `msPerPhoto` y la latencia del API.
  - Depende de: 5.2.
  - Éxito: las mediciones quedan registradas y el API no se degrada.
- **5.4** Modo `on`, por decisión de Daniel. Lote de unos 10 productos y revisión de:
  - la tienda;
  - `feed.xml`;
  - el catálogo por link;
  - las cotizaciones;
  - WhatsApp;
  - el correo;
  - la pestaña Historial;
  - D-488 a 1440 y 390 px.

  Luego se revierte el lote y se comprueba el resultado.
  - Depende de: 0.5 y 5.3.
- **5.5** Bitácora de D-501 en `specs/CONTRACT.md` y, si está autorizado, comentario en el ticket 1252.
  - Depende de: 5.4.

## 6. Retiro (Artículo XII)

- **6.1** El 2027-04-30, Daniel decide: dejar la función para todos y quitar la bandera, o retirarla.
  - Depende de: 5.4.

Las fases 1b, 2, S y X tendrán sus propias tareas.
