# Tareas — Fotos de producto uniformes, fase 1 (D-501)

> Se ejecutan después de aprobar `design.md`, `anexo.md` y la spec. Las secciones 0 a 6 son la fase 1 aprobada el 18-oct. **Las secciones 7 a 10 son la ampliación de D-518 (21-oct), pendiente de aprobación:** no se empieza ninguna antes de 7.0. La tarea 0.6 (interruptor a Firestore) aplica la regla ya aprobada de D-518 y va en el paso 3 de su orden de trabajo, sin esperar a 7.0.
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
> - **Cuándo va `[x]`:** la tarea cumple su criterio de éxito y ninguna de sus dependencias, directa o en cadena, espera el diff aprobado de una tarea sensible (3.1, 3.3, 4.5) ni el prerrequisito 0.5. Si el código está listo pero falta eso, va `[ ]` con su «Estado».

## 0. Prerrequisitos

- [x] **0.1** Daniel confirma los valores por defecto (anexo §F) y aprueba la colección nueva `product_photo_batches` y las rutas `/v1/product-photos/*`.
  - Éxito: la respuesta queda en `specs/CONTRACT.md`, bajo D-501.
  - Hecho: aprobación en bloque de diseño, specs, tareas y valores por defecto (CONTRACT, «D-495 a D-503», línea del 2026-10-18).
- **0.2 [P]** Medición de solo lectura: ¿fallan hoy las portadas WebP en WhatsApp y en el correo?
  - Éxito: el dato queda en la bitácora. Si no fallan, se reconsidera P7.
  - Nota (21-oct): para WhatsApp la documentación oficial de Cloud API ya responde (las imágenes van en JPEG o PNG; WebP solo en stickers). Falta medir el correo. Meta: lo resuelve aparte F2-20 (D-518 TX-37·7).
- **0.3 [P]** Script de solo lectura con `--dry-run`. Revisa:
  - los `provider` de `integration_configs` que escriben catálogo;
  - los tipos de nodo de los flows activos;
  - los escritores de `imagenesPrincipales`.
  - Éxito: el anexo §E queda confirmado y FLORECER, «sin sync».
  - Estado (2026-10-18): script listo, sin correr contra producción: `node scripts/auditar-fotos-uniformes.js --dry-run [--company "FLORECER"]` (backend; solo lee, rechaza `--execute`, imprime solo conteos). En el código, el registro del anexo §E quedó confirmado y ampliado (mappers de WooCommerce como sync; `controllers/diagnostics.js` como manual; cuatro archivos que no escriben `products`). Falta correrlo y anotar el resultado en la bitácora. Si el resultado cambia el anexo §E, se reabren 1.3, 1.5 y 2.3.
- **0.4 [P]** Conteo de solo lectura en FLORECER. Separa:
  - fotos del bucket propio con dueño de la empresa;
  - sin dueño;
  - de otra empresa;
  - de otro bucket o enlace externo;
  - texto legacy.
  - Éxito: el dato queda en la bitácora. Si `owner_unknown` es la mayoría, Daniel decide (D1).
  - → D-518 (TX-37·3): la fase 1b ya está decidida. El conteo sigue sirviendo para dimensionarla (tarea 8.0) y para saber si FLORECER sirve de piloto de 1b.
  - Estado (2026-10-18): el mismo script con `--company "FLORECER"` hace el conteo mirando solo metadatos (no descarga). Falta correrlo.
- **0.5** El cambio del backend privado sobre el lector del historial de producto está desplegado y verificado.
  - Bloquea: 3.1, 3.3 y 5.4.
  - Éxito: Daniel lo confirma en la bitácora.
  - Nota (21-oct): sigue abierto en el código. La revisión privada recomienda hacerlo ya, en un cambio propio (SD2).
- [ ] **0.6** D-505 / D-518 (reglas comunes), sin esperar a 7.0: `services/productPhotos/config.js` con `leerModo()` **sin caché**; `leerModo` asíncrono en el router, el controlador y el runner (el runner lo relee antes de cada producto); `scripts/set-product-photos-config.js` con simulación por defecto y escritura solo por rutas de campo. Diseño: `design-ampliacion.md` §A1.
  - Pruebas primero, en rojo: sin documento → `off` y 503 `PHOTO_UNIFORM_OFF`; error de lectura → `off`; bajar a `off` en Firestore detiene el lote antes del siguiente producto (sin esperar caché); el script en simulación no escribe; con `--execute` las demás llaves de `config/feature_flags` (stock de WooCommerce, pago a cuotas) quedan idénticas.
  - Éxito: esas pruebas y las suites de `tests/productos/productPhotos/` en verde; `grep PRODUCT_PHOTO_UNIFORM_MODE functions/` solo en comentarios y pruebas; el desvío de 5.2 (`off` en vez de `shadow`) asentado en `specs/CONTRACT.md` bajo D-501 por quien lo apruebe.
  - Depende de: D-518 (aprobada). Sin despliegue fuera de 5.x.
  - **Estado (21-oct, bloque TX37-B02, commit local sin push ni despliegue):** código y pruebas hechos en el backend: `services/productPhotos/config.js` (`leerModo` y `leerConfigFondo`, una lectura por llamada, sin caché; sin documento, valor no exacto o error → `off` y valores por defecto; un error de lectura deja la línea estructurada `feature_flags_read_failed` con el id del lote), `settings.leerModo` (sale `modoDelServidor`), `exigirModo` asíncrono en el router, el controlador (`ajustes`, `crearLote`, reversión en `off`) y el runner (relee antes de cada producto y en la retoma), siempre sobre el mismo `db` que usan, y `scripts/set-product-photos-config.js` (simulación por defecto; con `--execute`, `update` solo de sus tres llaves; sin documento no lo crea; compara por contenido las demás llaves antes y después y no imprime sus valores). Pruebas en verde: `config.test.js` (11), `setProductPhotosConfig.test.js` (9), 4 casos nuevos en `routes.contract` (20) y 5 en `batchRunner` (18, incluida la retoma sin documento); las 13 suites de `tests/productos/productPhotos/` en verde. En el commit, `PRODUCT_PHOTO_UNIFORM_MODE` queda solo en comentarios y pruebas. El modo efectivo sigue en `off` (el documento no tiene la llave).
    - Falta para `[x]`: (1) asentar en `specs/CONTRACT.md`, bajo D-501, el desvío de 5.2 (`off` en vez de `shadow`), quien lo apruebe; (2) que Daniel resuelva el cruce con otro cambio en curso, sin commit, en el mismo worktree (`services/platformFlags.js`, `scripts/platform-flags.js`): lee `productPhotoUniformMode` y `backgroundRemovalProvider` con caché de 30 s y vuelve al `.env` si falta la llave, contra §A1 y §G.4. Fotos uniformes ya no lo usa, pero mientras exista, el grep del criterio encuentra la variable en ese archivo.
    - Para el visto bueno de Daniel: la decisión 8 de `design.md` («un backend local apuntado a producción no toma lotes») se apoyaba en que ese proceso no tenía la variable de modo. Con el modo en Firestore, todos los procesos que leen la misma base ven el mismo modo, y lo que frena la retoma en un backend local es no tener `CRON_ENABLED=true`. Es consecuencia directa de §A1 (D-505); queda anotado en `batchRunner.js`.

## 1. Pruebas primero (en rojo)

Backend: `functions/tests/productPhotos/`, con `node tests/productPhotos/<archivo>.test.js`. Front: `tests/productos/`, con `node --test`. Todas usan dobles en memoria.

> Nota de implementación (2026-10-18): por el alcance de archivos de la sesión en paralelo, las pruebas del backend quedaron en `functions/tests/productos/productPhotos/` (dobles compartidos en `_dobles.js` y `_mundo.js`), más `auditoria.test.js` para el script de 0.3/0.4.

- [x] **1.1 [P]** `routes.contract.test.js`:
  - esquemas y códigos de las 7 rutas (anexo §A);
  - orden de la cadena;
  - bandera apagada → 403; modo `off` → 503 solo en `POST /preview` y `POST /batches`; consultar, cancelar y revertir funcionan en `off` y `shadow`;
  - rol no admin → 403; lote de otra empresa → 404;
  - dos vistas previas simultáneas de la misma empresa → 429 `PREVIEW_RUNNING`; la undécima en 10 min → 429 `PREVIEW_RATE_LIMIT`.
  - Depende de: 0.1.
- [x] **1.2 [P]** `writeset.contract.test.js`, con dobles que registran cada escritura. Exige:
  - **vista previa:** cero escrituras;
  - **lote `shadow`:** cero escrituras fuera de `product_photo_batches` (nada en `products`, `productHistory` ni Storage);
  - **lote `on`:** en `products`, solo `crearProducto.imagenesPrincipales`, `user_edit` y `date_edit` (cadena ISO); en cada foto, solo `urls`, `path`, `original` y `processed`, con el mismo orden y largo;
  - **reversión en cualquier modo:** lo mismo, sin Storage;
  - **historial:** con los tipos del anexo §C (`fecha` y `timestamp` en ISO, textos cortos, `fotos` sin rutas);
  - **resultados:** en la subcolección, sin rutas;
  - **Storage:** solo en la carpeta de la empresa, con precondición de no existir y sin `delete`;
  - **nunca:** precios, `preciosPorTipoCliente`, `inventory`, `inventoryMovement`, `integrations`, `exposicion`, categorías, variantes ni `companies`.
  - Depende de: 0.1.
- [x] **1.3 [P]** `writersRegistry.contract.test.js`: falla si un archivo de `controllers/`, `services/`, `tools/` o `utils/` escribe `imagenesPrincipales` sin estar en el anexo §E.
  - Depende de: 0.3.
- [x] **1.4 [P]** `photoUniform.test.js`, con fotos generadas por `sharp` en la prueba. Cubre:
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
- [x] **1.5 [P]** `eligibility.test.js` (incluye tenant):
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
- [x] **1.6 [P]** `batchRunner.test.js`:
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
- [x] **1.7 [P]** Front:
  - `photo-quality.test.js`: cálculo puro contra la misma versión de los vectores, copiada al repo;
  - `fotos-uniformes.test.js`: mapper con mensajes por código y ajustes;
  - `fotos-uniformes-componentes.test.js`: pasos, consulta hasta el estado final, cierre que cancela la consulta y modo `off` que solo ofrece revertir;
  - `producto-conserva-llaves-de-foto.test.js`: guardar conserva `original` y `processed`.
  - Depende de: 0.1.

Éxito de 1.x: cada prueba existe y falla.

> Estado (2026-10-18): las pruebas se escribieron antes del código. En ese momento solo `writersRegistry.contract` se corrió en rojo (faltaba `batchStore.js`).
>
> El rojo de las demás se comprobó después, el mismo día: cada archivo se corrió contra el árbol sin el cambio (`git archive HEAD` en una carpeta temporal, con los `node_modules` del repo). Resultado:
> - Los 7 archivos del backend fallan porque no encuentran sus módulos (`routers/productPhotos`, `controllers/productPhotos`, `services/productPhotos/*`, `utils/productPhotoUniform` y `scripts/auditar-fotos-uniformes`).
> - Del front, `photo-quality`, `fotos-uniformes` y `fotos-uniformes-componentes` fallan por lo mismo.
> - `producto-conserva-llaves-de-foto` falla en su caso D-501 (el botón y el aviso). Sus otros 3 casos pasan antes del cambio porque protegen algo que ya funcionaba: guardar ya conservaba las llaves de cada foto.
>
> Hoy están todas en verde. La revisión del 2026-10-18 sumó casos a 1.2 y 1.6, que se vieron en rojo antes de su arreglo: un lote que corría dos veces en un proceso, el modo `off` en la retoma y el historial de una reversión directa.

## 2. Piezas sin escritura

- [x] **2.1 [P]** `utils/productPhotoUniform.js` y `photo-quality-vectors.v1.json`, sin modificar `utils/siteImagenes.js`.
  - Depende de: 1.4.
  - Éxito: 1.4 en verde.
- [x] **2.2 [P]** `settings.js` y `eligibility.js`, con el lector puro `{ bucket, path }` y la regla de pertenencia. `findCompanyDocs` debe dar exactamente 1, y `controllers/media.js` queda sin cambios.
  - Depende de: 1.5.
  - Éxito: 1.5 en verde, salvo los casos de sync.
- [x] **2.3 [P]** `syncDetector.js`, con el criterio amplio y la lista del anexo §E.
  - Depende de: 0.3, 1.3 y 1.5.
  - Éxito: 1.3 y 1.5 en verde.
- [x] **2.4 [P]** `photoStorage.js`:
  - lee con la regla de pertenencia;
  - escribe con un token por foto, `metadata.company` y precondición de no existir;
  - no tiene función de borrar.
  - Depende de: 2.1 y 2.2.
  - Éxito: la parte de Storage de 1.2 en verde.
- [x] **2.5 [P]** Bandera `productPhotoUniform`, con dueño y retiro en el comentario, en `services/companyFeatureFlags.js:54` y `company-features.service.ts:11`. No va en `banderasEmpresaNueva.js`.
  - Depende de: 0.1.
  - Éxito: las pruebas de banderas existentes, en verde.
  - Hecho (2026-10-18) por otra sesión en paralelo, en los dos catálogos; `tests/companies/companyFeatureFlags.test.js` en verde.

## 3. Escritura y lote

- **3.1 Sensible.** `batchStore.js`: transacción por producto con `changed_meanwhile`, `products`, `productHistory`, resultado y contadores; también el candado al crear y al liberar.
  - Depende de: 0.5, 1.2, 2.2 y 2.4.
  - Éxito: 1.2 en verde en `on`; diff aprobado por Daniel.
  - Estado (2026-10-18): código listo (`services/productPhotos/batchStore.js`) y 1.2 en verde en `on`. Sin marcar: falta 0.5 y que Daniel apruebe el diff.
  - 2026-10-18: Daniel aprobó subir el código apagado, con lo que agregó la revisión (decisión 8 y `photo_limit`). Sigue sin marcar hasta 0.5; encender `on` espera 0.5 y su orden.
  - Qué escribe cada modo:
    - **Uniformar:** escribe `products` y `productHistory` solo en `on`.
    - **Revertir:** escribe `products` en cualquier modo (D4), en cuanto la bandera está encendida.
    - **Historial de la reversión:**
      - por lote, solo existe si el lote de origen corrió en `on`, porque solo ese deja fotos `uniformed`;
      - la directa (`POST /revert`) lo escribe solo si la foto salió de un lote `on` de la empresa.

      Como `on` espera a 0.5, antes de 0.5 no se escribe `productHistory`, aunque la bandera esté encendida en sombra (D8).
  - Revertir con el modo en `off` cierra (`stopped`/`mode_changed`) el lote de uniformar que quedó activo sin arriendo, en la misma transacción que crea la reversión. Así, el orden de la reversa (`off` → revertir) no se traba con `BATCH_RUNNING`. Lo agregó la revisión del 2026-10-18 y espera el visto bueno de Daniel con el diff.
- [ ] **3.2** `batchRunner.js`: arriendo, semáforo compartido, modo efectivo releído, `CRON_ENABLED`, topes y cancelación.
  - Depende de: 3.1.
  - Éxito: 1.6 en verde y 1.2 en verde en `shadow`.
  - Estado (2026-10-18): código listo, con 1.6 y 1.2 en verde. Queda sin marcar porque depende de 3.1.
  - Lo que agregó la revisión:
    - un lote corre una sola vez a la vez por proceso: `ejecutar` anota en memoria los lotes en curso, y cada corrida firma el arriendo con su propio dueño;
    - dos retomas no se solapan;
    - con el modo en `off`, la retoma solo toma reversiones y deja intactos los lotes de uniformar (decisión 8).
- **3.3 Sensible.** Reversión por lote, por producto y por foto, en cualquier modo.
  - Depende de: 0.5 y 3.1.
  - Éxito: los casos de reversión de 1.2 en verde; diff aprobado.
  - Estado (2026-10-18): código listo (lote `revert` en `batchRunner.js`, `POST /revert` en el controlador) y los casos de reversión de 1.2 en verde en `off` y `shadow`. Sin marcar: falta 0.5 y el diff aprobado. La reversión directa escribe historial solo si la foto salió de un lote `on` de la empresa. Una foto con llaves de procesada guardadas a mano (por ejemplo, por `/v1/productos/edit`) se revierte sin historial; ver 3.1.
  - 2026-10-18: subida apagada con el visto bueno de Daniel (ver 3.1). Sigue sin marcar hasta 0.5.
- [ ] **3.4** `controllers/productPhotos.js` y `routers/productPhotos.js`, con la compuerta en `try`, el modo solo en vista previa y lotes, los topes de la vista previa y el montaje en `index.js`.
  - Depende de: 2.3, 2.5, 3.2 y 3.3.
  - Éxito: 1.1 en verde; `/v1/media` y `/v1/productos` sin cambios en el diff.
  - Estado (2026-10-18): código listo y 1.1 en verde; `/v1/media` y `/v1/productos` sin cambios. Sin marcar: depende de 3.2 y 3.3.
- [ ] **3.5** Observabilidad: una línea JSON con `correlationId`, sin `console.log` de telemetría, sin URLs con token ni imágenes.
  - Depende de: 3.4.
  - Éxito: grep limpio en `services/productPhotos/`.
  - Estado (2026-10-18): grep limpio. Sin marcar: depende de 3.4.

## 4. Front

- [ ] **4.1 [P]** `product-photos.service.ts` (extiende `base.service.ts`, con `SKIP_LOADER`), `product-photos.mapper.ts`, `photo-quality.ts` y `photo-quality-canvas.ts`.
  - Depende de: 1.7 y 3.4.
  - Éxito: las pruebas puras de 1.7 en verde.
  - Estado (2026-10-18): código listo y pruebas en verde. Sin marcar: depende de 3.4.
- [ ] **4.2** Diálogo standalone OnPush en `components/productos/fotos-uniformes/`, según el design-system. Clases `fu-*` sin «p-».
  - Depende de: 4.1.
  - Éxito: la prueba del componente, en verde.
  - Estado (2026-10-18): código listo y prueba en verde. Sin marcar: depende de 4.1.
  - La revisión agregó la retoma: al volver a abrir el diálogo en el mismo navegador, si el último lote sigue activo, se ve su progreso. En pausa no se retoma un lote de uniformar, porque no avanzaría. El texto de «aplicando» ya no promete más que eso y le pide a quien edita el producto que espere antes de guardar.
- [ ] **4.3** Botón en la barra masiva (`productos.component.html:418`), visible con la bandera y una selección.
  - Depende de: 4.2.
  - Éxito: el diff se limita al botón y a abrir el diálogo.
  - Estado (2026-10-18): hecho. Sin marcar: depende de 4.2.
- [ ] **4.4** Botón «Uniformar fotos de esta categoría» junto al filtro, solo con la bandera y una categoría real en `filtros.categoria`. Manda `categoryLabel` y muestra el tope de 100. (→ D-518: la tarea 7.12 lo cambia a `categoryPath` y quita el tope.)
  - Depende de: 4.2.
  - Éxito: el diff se limita al botón.
  - Estado (2026-10-18): hecho. Sin marcar: depende de 4.2.
- **4.5 Sensible.** Editor `crear-productos`: botón en la pestaña Imágenes (producto guardado y bandera) y aviso en `processSelectedFiles`. El guardado no cambia.
  - Depende de: 4.2.
  - Éxito: `producto-conserva-llaves-de-foto.test.js` en verde; diff aprobado.
  - Estado (2026-10-18): código listo y la prueba en verde; `guardarProductos` y `editarProducto` sin cambios. Al cerrar el diálogo con cambios, el editor trae las fotos nuevas del producto (`/v1/productos/by-ids`) para que guardar no devuelva las viejas. Sin marcar: falta el diff aprobado.
  - 2026-10-18: Daniel aprobó subir el back y el front apagados. El botón y el aviso no salen sin la bandera.
- **4.6** Cierre:
  - `npm run build` sin errores;
  - degradados y primarios prohibidos de `components/productos/` sin subir;
  - revisión a 1440 y 390 px.
  - Depende de: 4.3, 4.4 y 4.5.
  - Estado (2026-10-18): `npx tsc --noEmit -p tsconfig.app.json` sin errores; degradados y primarios prohibidos de `components/productos/`: 0 antes y 0 después. Faltan el build (lo corre el orquestador) y la revisión a 1440 y 390 px en el navegador.
  - 2026-10-18: `ng build --configuration=production` sin errores. Falta la revisión a 1440 y 390 px, que necesita la bandera encendida en una empresa de prueba.

## 5. Verificación y despliegue

- **5.1** Revisión independiente de back y front contra el write-set y la seguridad. Los hallazgos ajenos van al backend privado.
  - Depende de: 3.5 y 4.6.
- **5.2** `git pull`, commit por ruta y despliegue del backend con la bandera apagada y `PRODUCT_PHOTO_UNIFORM_MODE=shadow`; luego el front.
  - **Desvío (registrado el 21-oct):** el backend salió en `off`, sin la variable (CONTRACT, D-501 «SUBIDA APAGADA»). Por D-505 ya no se pone en el `.env`: la sombra se enciende en `config/feature_flags.productPhotoUniformMode` después de 0.6. Sigue pendiente confirmar qué proceso tiene `CRON_ENABLED=true`.
  - Depende de: 5.1 y la autorización de Daniel.
  - Éxito: las rutas responden 403 sin la bandera y Daniel confirma qué proceso de producción tiene `CRON_ENABLED=true`.
- **5.3** (Depende además de 0.6.) Daniel enciende FLORECER (simulación y `--execute`). Se corre un lote en sombra de unos 20 productos para calibrar P8 y medir `msPerPhoto` y la latencia del API.
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

## 7. Ampliación de la fase 1 (D-518) — NUEVO, pendiente de aprobación

Diseño: `design-ampliacion.md`. Marcas como arriba. **Sensible** = escribe `products` o el registro de lotes que gobierna esas escrituras: diff aprobado por Daniel, de a uno. Pedidos, pagos, reserva, inventario y consecutivos no se tocan.

- **7.0** Daniel aprueba la ampliación (`design-ampliacion.md`, `design-fase-1b.md`, `design-fase-2.md`, las specs nuevas y el anexo §G) y responde las preguntas 1 a 14 de `proposal.md`. Éxito: queda en `specs/CONTRACT.md` bajo D-518.
- **7.1 [P]** Caracterización, sin cambiar código: `syncDetector` y `elegibilidadProducto` con las formas de OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS (con `integrations.siigo`) y FLORECER. Éxito: en verde contra el código de hoy.
- **7.2 [P]** Caracterización de `batchStore`: `crearLote` (candado, `BATCH_RUNNING`, idempotencia, cierre del lote de uniformar al revertir en `off`, `:81`), `cerrarLote` y `pedirCancelacion` (cierre sin arriendo, `:249`). Éxito: en verde contra el código de hoy.
- **7.3 [P]** Pruebas en rojo: `routes.contract` con `categoryPath` y rutas de serie; `batchRunner` con partes encadenadas, parada en cascada **por cada camino de cierre** (`cerrarLote`, revertir en `off`, cancelar sin arriendo, falla), `detectarSync` al empezar cada parte (`company_has_sync`) y `waiting` fuera de la retoma; adaptador del índice a `rutaDelProducto` y ruta por prefijo (`sinCategoria` cuenta como `category_unresolved`); `NODOS_QUE_EXCLUYEN` contra el registro de nodos y `sub-flow` resuelto y sin resolver; `possible_watermark` con `watermark-vectors.v1.json`; front: entradas y progreso de serie. Depende de: 7.0.
- **7.4** Movida a **0.6** (21-oct): el traslado a Firestore es del paso 3 del orden de D-518 y no espera la aprobación de la ampliación.
- **7.5 Sensible** (amplía quién recibe escrituras en `products`). TX-37·5: regla de producto en `eligibility.js` y lista cerrada `NODOS_QUE_EXCLUYEN` con `sub-flow` resuelto en `syncDetector.js`, más la prueba de registro de nodos. Éxito: 7.1 cambia solo en los casos que D-518 cambia (BOMBAS entra; un flow que solo avisa o solo lleva pedidos no excluye) y OH MY STORE y CAFE ESCOBAR siguen fuera; diff aprobado. Depende de: 0.3 corrida contra producción (tipos de nodo de los flows activos), 7.1 y 7.3.
- **7.6 [P]** TX-37·4: `productosDeCategoria` por ruta con `rutaDelProducto` de D-495, el adaptador `{ categorias: categoriasRaw, exposicion: exposicionObj }` y el árbol de `getCatalogSchemas`. Éxito: pruebas de ruta en verde, incluida la del adaptador (sin él, el lote queda vacío). Depende de: 7.3.
- **7.7 Sensible.** Series en `batchStore`: crear las partes y el candado en una transacción; **una sola función de cierre** que usan `cerrarLote`, `crearLote` (`:81`) y `pedirCancelacion` (`:249`), y que encadena o para en cascada. Éxito: 7.2 en verde salvo lo que el diff aprobado cambia; casos de serie de 1.2 y 1.6 en verde, uno por camino de cierre. Depende de: 7.2 y 7.3.
- **7.8** Runner, controlador y rutas de serie (`GET`, `cancel`, `revert`); `detectarSync` antes de empezar cada parte; la reversión de la serie lee los resultados parte por parte. Éxito: `routes.contract` y `batchRunner` en verde. Depende de: 0.6, 7.6 y 7.7.
- **7.9 [P]** `possible_watermark`: función pura y su lugar en los avisos de `procesarFoto`. Éxito: vectores en verde; sin cambio de tiempo medible en `photoUniform.test.js`. Depende de: 7.3.
- **7.10 [P]** Front: servicio y mapper (`categoryPath`, rutas de serie, mensajes de los códigos nuevos). Depende de: 7.8.
- **7.11** Front: diálogo con progreso de serie; paso de categoría solo si la pregunta 4 dice sí; proporción sugerida solo si la pregunta 13 dice sí. Depende de: 7.10.
- **7.12** Front, entradas: sección «Productos» del editor del sitio (y «Catálogo completo» si la pregunta 4 dice sí); detalle de Catálogos por link; lista con `categoryPath` y sin «· hasta 100». Éxito: cada diff se limita al botón, abrir el diálogo y recargar al cerrar. Depende de: 7.11.
- **7.13** Cierre: `npm run build:prod` sin errores; degradados y primarios prohibidos de `components/productos/`, `components/sitios/` y `components/cotizaciones/` sin subir; revisión a 1440 y 390 px con la bandera en una empresa de prueba. Depende de: 7.12.

## 8. Fase 1b: fotos externas y sin dueño (D-518 TX-37·3) — NUEVO, pendiente de aprobación

Diseño: `design-fase-1b.md`. Seguridad: revisión privada del backend (`fotos-uniformes-producto-seguridad`), que bloquea 8.1, 8.4 y 8.5.

- **8.0 [P]** Conteo de solo lectura con `--dry-run` (el script de 0.3/0.4, solo metadatos, sin descargar) en FLORECER y, si Daniel lo autoriza (pregunta 11), en ALMARA FELICIDAD: `external_link`, `owner_unknown` y `not_owned` por empresa. Éxito: el dato queda en la bitácora.
- **8.1 [P]** `services/productPhotos/photoCopy.js`, con sus pruebas de contrato en rojo primero: controles de descarga de la revisión privada, regla de adopción (`not_adoptable`), límite de 4 descargas por proceso dentro de la pieza y descargas fuera del semáforo de CPU. Es la pieza que usa F5-30 (D-518 F5-30·2). Éxito: contrato en verde; ningún log con la URL.
- [x] **8.2 [P]** Tienda en un paso: caracterización de `savePhoto` en verde; luego `metadata.company` y el comentario corregido. Éxito: la caracterización cambia solo en los metadatos.
  - Hecho (2026-10-21, bloque TX37-B01, backend sin push): caracterización en verde antes del cambio; después cambia solo en los metadatos (token y empresa, nunca el correo). Prueba de punta a punta: la foto guardada pasa la regla de pertenencia con la empresa del producto.
- [x] **8.3 [P]** `get_product_photo_upload_url`: caracterización en verde; luego el metadato obligatorio en la URL firmada. Éxito: ídem.
  - Hecho (2026-10-21, bloque TX37-B01, backend sin push): la URL firmada exige el metadato obligatorio; prueba con doble de Storage y con el firmador real sin red. Falta confirmarlo en una subida real de prueba cuando Daniel lo autorice (detalle en la revisión privada).
- [ ] **8.4 Sensible.** `update_product_photos`: caracterización en verde (listar, agregar por ruta y por enlace, quitar, tope, aviso de sync); luego el sellado con `company` y, según la pregunta 5, la copia del enlace. Éxito: diff aprobado.
  - Estado (2026-10-21): caracterización en verde y sellado con `company` hechos en el bloque TX37-B01 (backend, sin push), con las pruebas de la revisión privada en verde. Falta el diff aprobado por Daniel y la copia del enlace (pregunta 5), que va en el bloque TX37-B09 con `photoCopy`.
- **8.5 Sensible.** Lote y vista previa: copiar (`on`) o medir (`shadow`, vista previa) las fotos `external_link` y `owner_unknown` adoptables, omitir sin leer las no adoptables también en la vista previa, y escribir `copiedFrom`. `writeset.contract` suma las carpetas `copias` y la prohibición de `setMetadata` y `delete`. Éxito: diff aprobado; contrato en verde. Depende de: 7.8 y 8.1.
- **8.6 [P]** Front: mensajes de `download_failed`, `not_image`, `not_adoptable`, `would_copy` y el origen en el resumen. Depende de: 8.5.
- **8.7** Sombra de 1b en FLORECER (después de 5.3) y `on` con unos 10 productos con fotos externas o sin dueño, por orden de Daniel. Revertir y comprobar que vuelve la copia.

## 9. Fase 2: quitar el fondo con IA (D-518 TX-37·6) — NUEVO, pendiente de aprobación

Diseño: `design-fase-2.md`. Requiere la fase 1 en `on` (5.4). **Nada sale a un proveedor de IA sin 9.1 y 9.2.**

- **9.1** Medir el costo real: con la autorización de Daniel, 10 fotos de FLORECER por la ruta del ADK (tarea 9.5) en un entorno de prueba. Comparar la factura (`USE1-NovaCanvas-I2I-*`) con la tabla de `design-fase-2.md` y medir la calidad con la máscara a 1024 px. Éxito: costo por foto en la bitácora y **OK de Daniel al costo** (D-518 TX-37·6).
- **9.2** Daniel confirma que la política de privacidad cubre las fotos de producto procesadas por IA. Éxito: queda en la bitácora.
- **9.3 [P]** Caracterización: `consumeAILimit` y `getFeatureLimit` con los usos de hoy; pruebas actuales de `backgroundRemoval` en verde.
- **9.4 [P]** Pruebas en rojo: ruta del ADK (token, tamaño, sin URL, PNG); proveedor `opttia` fuera del semáforo de CPU y con su límite de 2; lista `backgroundRemovalUses`; topes de entrada del modelo (`background_input_invalid` sin gastar); control de calidad de la máscara; logo suelto descartado; estimación del cupo con `backgroundScope`, `AI_QUOTA_INSUFFICIENT` y parada `ai_quota`; 3 fallas seguidas → `ai_unavailable` con los usos devueltos; reuso del recorte por la huella (después de la vista previa y después de revertir, sin descuento); `photoBackgroundsPerMonth` ausente → 0; vista previa con «Quitar fondo» solo admin y solo en `on`; sombra sin llamadas ni archivos.
- **9.5** ADK (repo `kai/adk_agent`): `POST /api/ai/background-removal`. Se despliega por systemd (`kai-adk`) solo por orden de Daniel. Depende de: 9.4.
- **9.6** `backgroundRemoval.js`: proveedor desde `config/feature_flags` (sin caché), `getProviderName` e `isConfigured` asíncronas, lista de usos y proveedor `opttia`. `fichaDesdeFoto` pasa su uso y queda sin recorte. Depende de: 0.6 y 9.4.
- **9.7 Sensible (cupo del plan).** `photoBackgrounds` en `aiLimitsService.js` (ausente o inválido = 0, nunca `-1`), `devolverAILimit` transaccional y `photoBackgroundsPerMonth` en `freemium`, `paid` y `premium` de `config/subscriptionLimits.js`, con los valores de la pregunta 6. Éxito: 9.3 igual; diff aprobado.
- **9.8 Sensible.** Lote y vista previa con `backgroundMode: "replace"`: recorte guardado por la huella, validar antes de gastar (topes del modelo), cupo y devolución, llamada fuera del semáforo, parada `ai_unavailable`, máscara, logo y la tubería de la fase 1. Éxito: diff aprobado; 9.4 en verde. Depende de: 9.6 y 9.7.
- **9.9 [P]** Bandera `productPhotoBackground` en los dos catálogos (dueño Daniel, retiro 2027-06-30).
- **9.10** Front: «Quitar fondo» en el diálogo (solo admin y en `on` para la vista previa), alcance portada o todas, usos que necesita y que quedan, y aviso del costo de la vista previa. Depende de: 9.8 y 9.9.
- **9.11** Por orden de Daniel, después de 9.1 y 9.2: `backgroundRemovalProvider = "opttia"`, sombra y luego `on` con unos 10 productos de FLORECER. Revisar tienda, catálogo por link, `feed.xml` y cotizaciones, y revertir.

## 10. Bitácora y retiro de la ampliación

- **10.1** Bitácora de cada fase en `specs/CONTRACT.md` (D-518) y, si está autorizado, comentario en el ticket 1252 (cd `GByRqDwAl5X7d7qwObGP`). Por D-518 T·1, corregir el texto de la resolución del ticket, que remite a «TX-37b», un ticket que no existe: lo pendiente sigue en el mismo ticket.
- **10.2** Retiro (Artículo XII): `productPhotoUniformMode` con la bandera de la fase 1 (6.1, 2027-04-30); `productPhotoBackground` y `backgroundRemovalUses` el 2027-06-30.

**Dependencias de otros cambios:** TX-37·7 (F2-20, feed JPEG para Meta) es un arreglo aparte; la revisión de Meta de 5.4 depende de él. TX-37·8 (TX-34, `tienda-celular-y-velocidad`) pinta el `srcset` de las variantes que genera este cambio; las variantes de las fotos no uniformadas las decide su P6. F5-30 (`importador-migracion-tiendas`) usa `photoCopy` (8.1) y su límite de descargas por proceso. La revisión privada del backend (`fotos-uniformes-producto-seguridad`) bloquea 8.1, 8.4, 8.5 y 9.5 a 9.8.
