# Tareas — Fotos de producto uniformes, fase 1 (D-501)

> Se ejecutan después de aprobar `design.md`, `anexo.md` y la spec. Las secciones 0 a 6 son la fase 1 aprobada el 18-oct. **Las secciones 7 a 10 son la ampliación de D-518 (21-oct), aprobada en bloque por Daniel el 21-oct** (front 014d1b62, «diseños aprobados…»; falta asentarla en `specs/CONTRACT.md`, tarea 7.0). La tarea 0.6 (interruptor a Firestore) aplica la regla ya aprobada de D-518 y va en el paso 3 de su orden de trabajo, sin esperar a 7.0.
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
  - Requisito agregado por 7.5 (21-oct, TX37-B03) para que 0.3 sirva de compuerta de 7.5: además de los tipos de los flows activos, contar los de los flows que esos invocan por `sub-flow` (aunque estén pausados), mostrar `clasificarNodo` junto a cada tipo (excluye, no excluye o fuera del registro) y contar los `sub-flow` cuyo `flowId` es una expresión, está vacío, no existe o es de otra empresa, porque ahora excluyen. Va en `scripts/auditar-fotos-uniformes.js` (fuera del bloque TX37-B03).
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

## 7. Ampliación de la fase 1 (D-518) — aprobada en bloque el 21-oct

Diseño: `design-ampliacion.md`. Marcas como arriba. **Sensible** = escribe `products` o el registro de lotes que gobierna esas escrituras: diff aprobado por Daniel, de a uno. Pedidos, pagos, reserva, inventario y consecutivos no se tocan.

- **7.0** Daniel aprueba la ampliación (`design-ampliacion.md`, `design-fase-1b.md`, `design-fase-2.md`, las specs nuevas y el anexo §G) y responde las preguntas 1 a 14 de `proposal.md`. Éxito: queda en `specs/CONTRACT.md` bajo D-518.
  - Estado (21-oct): aprobada en bloque por Daniel el 21-oct, con cada pregunta abierta resuelta por la recomendación escrita (front 014d1b62). Falta asentarla en `specs/CONTRACT.md` (en esta rama D-518 es D-531, ver la renumeración); queda sin `[x]` hasta entonces.
- [x] **7.1 [P]** Caracterización, sin cambiar código: `syncDetector` y `elegibilidadProducto` con las formas de OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS (con `integrations.siigo`) y FLORECER. Éxito: en verde contra el código de hoy.
  - Hecho (21-oct, TX37-B03): backend `tests/productos/productPhotos/exclusionIntegraciones.caracterizacion.test.js`, 12 casos en verde contra el código de antes de 7.5 (incluye un flow que solo avisa y dos que solo llevan pedidos); esa versión queda en su propio commit (backend de4bca60). Con 7.5 cambian solo los 3 casos marcados «CAMBIA CON 7.5» y se agrega 1 (cada flow mixto de OH MY STORE la deja fuera por sí solo), que pasa con los dos códigos: 13 casos.
- [x] **7.2 [P]** Caracterización de `batchStore`: `crearLote` (candado, `BATCH_RUNNING`, idempotencia, cierre del lote de uniformar al revertir en `off`, `:81`), `cerrarLote` y `pedirCancelacion` (cierre sin arriendo, `:249`). Éxito: en verde contra el código de hoy.
  - Hecho (21-oct, TX37-B05): backend `tests/productos/productPhotos/batchStore.caracterizacion.test.js`, 10 casos que fijan escritura por escritura (ruta, operación y campos) lo que hacen hoy `crearLote`, `cerrarLote`, `pedirCancelacion` y `lotesPorRetomar`. En verde contra el código de antes de 7.7 y, sin cambiar una línea del archivo (misma huella sha256), en verde después: un lote suelto (≤ 100) escribe exactamente lo mismo.
- **7.3 [P]** Pruebas en rojo: `routes.contract` con `categoryPath` y rutas de serie; `batchRunner` con partes encadenadas, parada en cascada **por cada camino de cierre** (`cerrarLote`, revertir en `off`, cancelar sin arriendo, falla), `detectarSync` al empezar cada parte (`company_has_sync`) y `waiting` fuera de la retoma; adaptador del índice a `rutaDelProducto` y ruta por prefijo (`sinCategoria` cuenta como `category_unresolved`); `NODOS_QUE_EXCLUYEN` contra el registro de nodos y `sub-flow` resuelto y sin resolver; `possible_watermark` con `watermark-vectors.v1.json`; front: entradas y progreso de serie. Depende de: 7.0.
  - Parte de TX37-B03 (21-oct): `NODOS_QUE_EXCLUYEN` contra el registro de nodos y `sub-flow` resuelto y sin resolver, en backend `tests/productos/productPhotos/nodosQueExcluyen.test.js` (16 casos; contra el código de antes fallan 12; con 7.5 pasan todos). Incluye que la vista de escritores de `REGISTRO_ESCRITORES` coincida con `NODOS_QUE_EXCLUYEN` para todo nodo que escribe `imagenesPrincipales`. El resto de 7.3 sigue en sus bloques.
  - Parte de TX37-B04 (21-oct), en rojo antes del código: `categoriaPorRuta.test.js` (10 casos: adaptador, prefijo, «Flores» sin «Flores secas», subcategorías, alias, `sinCategoria`/`ambigua`/`enColision`/`fueraDelArbol` como `category_unresolved`, ruta pedida y partes); 3 casos nuevos de `routes.contract` con `categoryPath` (vista previa, lote, `categoryLabel` como `[categoryLabel]` y 400 `INVALID_SELECTION`); `marcaDeAgua.test.js` (11 casos) con `watermark-vectors.v1.json` (14 vectores sintéticos dibujados con sharp). Corrector (21-oct): `categoriaPorRuta.test.js` sube a 12 casos (ruta pedida resuelta por alias, fuera del árbol o en colisión; `category_unresolved` de toda la empresa), `routes.contract` a 4 casos de 7.6 (ruta fuera del árbol o repetida dice por qué, en la vista previa y en el lote), `marcaDeAgua.test.js` a 12 (foto con transparencia sobre fondo oscuro) y `indiceParaRuta.contract.test.js` nuevo (2 casos: `getSearchIndex` y `getCatalogSchemas` reales con la máscara de `select`). Falta lo del front (B06, B07).
  - Parte de TX37-B05 (21-oct), en rojo antes del código (19 casos rojos de 65 en las tres suites): `batchRunner.test.js` suma 11 casos de serie (creación en una transacción con `waiting` y candado en la parte 1; reintento con la misma llave, también si la selección cruza los 100 entre reintentos; partes encadenadas; parada en cascada por **cada** camino de cierre: falla, `cerrarLote` del runner por modo y por cancelación con arriendo, cancelar sin arriendo y revertir en `off`; `detectarSync` al empezar cada parte con `company_has_sync`; retoma que ignora `waiting`; tope de 2.000; reversión de la serie con 150 productos); `routes.contract` suma 3 (POST /batches con más de 100, GET /series/:id, 404 `SERIES_NOT_FOUND` de otra empresa y rutas de serie en `off`) y el rol no admin cubre `/series/:id/cancel` y `/revert`; `writeset.contract` suma 2 (la serie solo escribe `product_photo_batches` fuera de los productos; las partes `waiting` nunca tocan `products` ni Storage).
    - Corrector B05 (21-oct): `batchRunner` sube a 35 casos. Contra el código del implementador fallan 5: cancelar durante el último producto de una parte (la serie seguía con la parte 2), `POST /series/:id/cancel` cuando la parte cierra `done` y encadena entre la lectura y la cancelación (respondía 200 `done` y la serie seguía), retoma por turnos (una serie no deja esperando el lote de otra empresa), «Revertir con el interruptor apagado» con `POST /series/:id/revert` sobre una serie a medias (escenario de la spec) y la línea de registro de la serie. El sexto, categoría de 340 productos (4 partes de 100, 100, 100 y 40 con su `categoryPath`, `categoryUnresolved` una vez), pasa con los dos códigos: solo agrega cobertura. `routes.contract` cambia el assert de `limits` de `GET /settings` («CAMBIA CON 7.8»). Falta lo del front (B06, B07).
  - Parte de TX37-B07 (21-oct): front, entradas. `tests/productos/fotos-uniformes-entradas.test.js` (22 casos): la ruta de la lista como `categoryPath` (con subcategoría y con los nombres del servidor), la barra masiva con más de 100, las dos entradas del editor del sitio y la del detalle de Catálogos por link solo con la bandera, la proporción del estilo y la recarga al cerrar con cambios. Con esto queda la parte del front de 7.3; el `[x]` sigue esperando el diff aprobado de 7.7.
- **7.4** Movida a **0.6** (21-oct): el traslado a Firestore es del paso 3 del orden de D-518 y no espera la aprobación de la ampliación.
- **7.5 Sensible** (amplía quién recibe escrituras en `products`). TX-37·5: regla de producto en `eligibility.js` y lista cerrada `NODOS_QUE_EXCLUYEN` con `sub-flow` resuelto en `syncDetector.js`, más la prueba de registro de nodos. Éxito: 7.1 cambia solo en los casos que D-518 cambia (BOMBAS entra; un flow que solo avisa o solo lleva pedidos no excluye) y OH MY STORE y CAFE ESCOBAR siguen fuera; diff aprobado. Depende de: 0.3 corrida contra producción (tipos de nodo de los flows activos), 7.1 y 7.3.
  - Estado (21-oct, TX37-B03): código y pruebas listos y revisados, en commit local del backend (de4bca60 la caracterización de antes, 30b4af73 el cambio; sin push ni despliegue).
    - Una sola lista de proveedores que escriben fotos (`osmosis`, `shopify`, `woocommerce`, `fulfillment`, `aliaddo`) para el producto (`integrations` e `integraciones` legacy) y para `integration_configs`.
    - Lista cerrada: 9 nodos excluyen y 56 no excluyen, contra los 64 tipos del registro. `REGISTRO_ESCRITORES` usa el mismo criterio: `katuq-product-resolver-by-ref` pasa a «no escribe» (solo lee `products`).
    - `sub-flow` resuelto hasta 3 niveles, solo entre los flows de la misma empresa y sin lecturas nuevas. Un `flowId` no resoluble, inexistente o de otra empresa excluye.
    - Un tipo fuera del registro conserva el criterio de antes («product» en el tipo). Casi nunca decide: un tipo sin handler no corre, así que no escribe.
    - Escenarios de la spec por las rutas y el lote reales (`exclusionIntegraciones.endpoint.test.js`, 3 casos): CAFE ESCOBAR recibe 409 con «WooCommerce» en vista previa y lote sin leer ni procesar fotos; el producto con `integrations.siigo` entra a la vista previa y al lote, y el de `integrations.fulfillment` se omite.
    - **Para la aprobación de Daniel, criterios que §A2 no enumera:** (a) quedan en «no excluye» `http-request`, `kai-agent-invoke`, `katuq-customer-upsert`, `katuq-canonical-mapper`, `katuq-product-resolver-by-ref`, `worldoffice-balances-sync`, `worldoffice-documents-sync`, `shopify-pricelist-sync` y `fullpi-*` (ninguno escribe fotos; si Daniel quiere que un flow con `http-request` o `kai-agent-invoke` que reacciona a productos excluya, se agrega a la lista); (b) un `sub-flow` de 4.º nivel excluye, y un `flowId` de otra empresa o inexistente también (§A2 solo nombra la expresión); (c) el flow invocado cuenta aunque esté pausado; (d) el respaldo «product» para tipos fuera del registro.
    - La caracterización 7.1 cambia solo en BOMBAS, en el flow que solo avisa y en el de pedidos con `katuq-product-resolver-by-ref`. OH MY STORE y CAFE ESCOBAR siguen en 409.
    - Falta: diff aprobado por Daniel y 0.3 contra producción. Si los tipos de nodo reales difieren, se reabre. Hay además un punto que sigue en la revisión privada (ver revisión privada); no cambia este código.
- [x] **7.6 [P]** TX-37·4: `productosDeCategoria` por ruta con `rutaDelProducto` de D-495, el adaptador `{ categorias: categoriasRaw, exposicion: exposicionObj }` y el árbol de `getCatalogSchemas`. Éxito: pruebas de ruta en verde, incluida la del adaptador (sin él, el lote queda vacío). Depende de: 7.3.
  - Estado (21-oct, TX37-B04; commit local del backend, sin push ni despliegue): pieza pura `services/productPhotos/categoriaPorRuta.js` y `controllers/productPhotos.js` (sin tocar `controllers/productos.js`: solo `getSearchIndex` y `getCatalogSchemas`, sin lecturas ni cachés nuevas).
    - `POST /preview` y `POST /batches` aceptan `categoryPath` (1 a 3 nombres; si llega, manda él). `categoryLabel` vale `[categoryLabel]`. Lo inválido da 400 `INVALID_SELECTION`.
    - La vista previa responde además `selectionTotal`, `parts` (= ceil(n/100)) y `categoryUnresolved`. El lote por categoría guarda `selection.categoryPath` y `totals.categoryUnresolved`. Con más de 100 sigue el 422 `BATCH_TOO_LARGE` hasta las series (7.7, 7.8).
    - `categoryUnresolved` cuenta todos los productos de la empresa que no se pueden ubicar en el árbol, como dicen §A3, el anexo §G.3 («incluye sin categoría») y el escenario «Producto sin ubicar»: es el mismo número con cualquier categoría. 7.10/7.11 lo muestran con el texto de §A3, «N productos no se pudieron ubicar en tu árbol de categorías», sin atarlo a la categoría elegida. Es un conteo, no un código por producto (anexo §G.3 corregido).
    - La ruta pedida se resuelve con las mismas reglas que la de cada producto (un nombre viejo vale por el vigente). Si no está en el árbol, o dos nodos dan la misma ruta, la vista previa y el lote responden 400 `INVALID_SELECTION` con un mensaje que lo dice (antes la vista previa salía vacía). Una ruta del árbol sin productos: vista previa 200 con `selectionTotal: 0` y lote 400 «no tiene productos».
    - Para 7.12: el front arma hoy las opciones con `data.nombre || label` y con `r[0]` de `getCategorias()`; el servidor usa `label || data.nombre` y el documento que elige D-495. Al pasar a `categoryPath`, el front debe usar el mismo orden (`label` primero) y el mismo documento, o un nodo con los dos nombres distintos dará el 400 de «no está en tu árbol».
    - Cambio de comportamiento a propósito: `categoryLabel: "Flores"` ya no toma «Flores secas». `[categoryLabel]` es una ruta de primer nivel; el front de hoy manda `filtros.categoria`, que es de primer nivel, así que sigue funcionando hasta que pase a `categoryPath` (7.10/7.12).
- **7.7 Sensible.** Series en `batchStore`: crear las partes y el candado en una transacción; **una sola función de cierre** que usan `cerrarLote`, `crearLote` (`:81`) y `pedirCancelacion` (`:249`), y que encadena o para en cascada. Éxito: 7.2 en verde salvo lo que el diff aprobado cambia; casos de serie de 1.2 y 1.6 en verde, uno por camino de cierre. Depende de: 7.2 y 7.3.
  - Estado (21-oct, TX37-B05; backend sin commit, sin push ni despliegue): `crearSerie` (parte 1 `queued`, partes 2..N `waiting`, candado en la parte 1, ids `<serieId>-p<k>` con el hash de `batchStore.idDeLote`, `series: { id, part, parts }`, cada parte con sus ≤ 100 productos, solo sus fotos excluidas y `totals.products` de la parte), `leerSerie` (consulta por igualdad en `series.id`) y `cerrarEnTx`, la única función de cierre que usan los tres caminos. `tomarArriendo` no toma una parte `waiting`. Tope en `settings.LIMITS.maxSeriesProducts` = 2.000 (P10).
    - La caracterización 7.2 no cambia (misma huella). Cambian a propósito 2 asserts existentes que fijaban el 422 `BATCH_TOO_LARGE` con 101 productos (§A4 «Hoy»): `batchRunner` («tope (CAMBIA CON 7.7)») y `routes.contract` («POST /batches: 202…»); ahora 101 es una serie y 2.001 da 422 `SERIES_TOO_LARGE`.
    - **Para la aprobación de Daniel, criterios que §A4 no enumera:** (a) si la misma llave ya creó una serie y el reintento trae ≤ 100 productos (la categoría cambió entre reintentos), devuelve esa serie, y al revés; por eso `crearLote` lee además `<id>-p1` (una lectura más, ninguna escritura); (b) un `done` solo encadena si el candado era de esa parte o estaba libre; si apuntaba a otro lote, las que esperan se cierran `series_stopped` en vez de dejar dos lotes activos; (c) cancelar directamente una parte `waiting` (POST /batches/:id/cancel con su id) la cierra `cancelled` y la cascada cierra las siguientes; la parte en curso termina y la serie llega a un estado final; (d) el `stopCode` de la serie es el de la primera parte que no terminó `done`.
    - Corrector (21-oct): (e) en una parte de serie, un `done` con la cancelación ya pedida (leída en la transacción de cierre) cierra `cancelled` y no encadena; un lote suelto sigue cerrando `done` (caracterización intacta); (f) `cerrarLoteYSeguir` devuelve el estado final y la parte que encadenó, y `cerrarLote` sigue devolviendo `true`/`false`; (g) `leerSerie` filtra también por `company` en la consulta (dos igualdades, sin índice compuesto).
    - Falta: diff aprobado por Daniel.
- **7.8** Runner, controlador y rutas de serie (`GET`, `cancel`, `revert`); `detectarSync` antes de empezar cada parte; la reversión de la serie lee los resultados parte por parte. Éxito: `routes.contract` y `batchRunner` en verde. Depende de: 0.6, 7.6 y 7.7.
  - Estado (21-oct, TX37-B05, revisado por el corrector; backend en commit local, sin push ni despliegue): `routes.contract` (27), `batchRunner` (35), `writeset.contract` (9) y `batchStore.caracterizacion` (10) en verde, y las otras 16 suites de `tests/productos/productPhotos/` también. Queda sin `[x]` hasta que se apruebe el diff de 7.7.
    - Corrector: la retoma corre una parte por turno y pone la siguiente al final de la fila; `POST /series/:id/cancel` vuelve a leer la serie si la parte que vio ya cerró y cancela la que quedó activa; el cierre por `company_has_sync` o en cascada deja una línea `series_stopped` con `correlationId` = id de la serie (gate VII); si faltara `maxSeriesProducts` en settings, el tope cae a 100 (sin serie, nunca sin tope).
    - Límite conocido: con el modo en `off`, una parte de uniformar que quedó `queued` sin arriendo no se retoma (decisión 8). La serie queda a medias hasta que el modo vuelve, alguien la cancela (la cierra de una vez) o la revierte en `off` (la cierra en la misma llamada).
    - Runner: al cerrar `done` una parte, `ejecutar` sigue con la siguiente (ya `queued`); el modo se relee antes de cada producto; antes de empezar cada parte de uniformar corre `detectarSync` y, si aparece un sync, cierra `stopped`/`company_has_sync` sin tocar productos.
    - `POST /batches` con más de 100 → 202 `{ batchId (parte 1), seriesId, parts, mode, totals, existing }`; con ≤ 100 la respuesta no cambia. `GET /batches/:id` suma `series` (o `null`) y puede responder el estado nuevo `waiting`.
    - `GET /series/:id` → `{ seriesId, type, mode, status, stopCode, currentPart, settings, totals, counters (suma), metrics, parts: [{ batchId, part, status, stopCode, counters }], createdAt, finishedAt }`. `status`: `queued` o `running` mientras alguna parte no es final; después `done`, o el estado de la primera parte que no terminó `done`.
    - `POST /series/:id/cancel` (admin) cancela la parte en curso; `POST /series/:id/revert` (admin) crea un lote `revert` con `revertOf` = id de la serie y `selection.batchOf` (la parte de cada producto), sin tope de 100. Las tres responden 404 `SERIES_NOT_FOUND` si la serie es de otra empresa (empresa solo del token) y no dependen del modo.
    - Para 7.10/7.11: `GET /batches/:id` del lote de reversión de una serie lista hasta 101 resultados (`leerResultados`) y trae `resultsTruncated: true` cuando hay más; los contadores sí son completos, así que el diálogo usa los contadores para ese lote. `GET /settings` suma `limits.maxSeriesProducts` (2.000) para avisar antes de aplicar.
- [x] **7.9 [P]** `possible_watermark`: función pura y su lugar en los avisos de `procesarFoto`. Éxito: vectores en verde; sin cambio de tiempo medible en `photoUniform.test.js`. Depende de: 7.3.
  - Estado (21-oct, TX37-B04; backend sin commit): `analizarMarcaDeAgua` y `posibleMarcaDeAgua` en `utils/productPhotoUniform.js`, con los umbrales de §A6 en `LIMITES`. El aviso va al final de `warnings` en `procesarFoto` y el lote lo guarda en el resumen y en `processed.quality.warnings` (sombra y `on`); cuenta en `photosWarned`. Nunca bloquea, y si la muestra no se puede sacar no hay aviso. El aviso al subir en el editor no cambia.
    - La muestra se mira siempre sobre blanco: en JPEG y en toda foto con transparencia sale de los bytes (aplanada en blanco), así el aviso no depende del fondo elegido; sin transparencia, de la imagen de trabajo, que es lo mismo.
    - Costo: en JPEG la muestra de 256 px se decodifica ya reducida y en paralelo con la de calidad; en los demás formatos sin transparencia sale de la imagen de trabajo, mientras corre el recorte. Medido alternando versión vieja y nueva: por foto, JPEG 136,4 → 136,6 ms y PNG 142,7 → 145,0 ms; `photoUniform.test.js`, 8 corridas, mediana ≈ 3,46 s → ≈ 3,49 s, dentro del ruido entre corridas.
    - Vectores solo sintéticos. §A6 pide también recortes del adjunto del 1259 (cd `3UrH47Mko7eruBnF4tak`, «catalogo-por-link-vitrina-publica.jpg»): siguen pendientes, porque no hubo permiso para recortarlo en esta sesión. Las fotos del adjunto son miniaturas de unos 90 px de una captura, así que sirven poco para calibrar; la calibración real se hace en sombra con fotos de Almara. El vector `verde-lima-almara` imita su caso (fondo verde lima y logo claro abajo a la derecha).
    - El mensaje «Posible marca de agua o logo» ya está en `MENSAJES_AVISO` del mapper del front (adelantado de 7.10), para que el diálogo no pinte un aviso vacío si el backend sale antes.
- **7.10 [P]** Front: servicio y mapper (`categoryPath`, rutas de serie, mensajes de los códigos nuevos). Depende de: 7.8.
  - Adelantado por TX37-B03 (21-oct): el mensaje de `product_integrated` ya dice «vinculado a una integración que actualiza sus fotos (otra tienda o tu operador logístico)», porque con 7.5 el código cubre también al operador logístico.
  - Estado (21-oct, TX37-B06, revisado por el corrector; front en commit local, sin push ni despliegue): código y pruebas listos. Sin marcar: depende de 7.8, que espera el diff aprobado de 7.7.
    - `product-photos.service.ts` (BaseService, todo sin la pantalla de carga): `verSerie`, `cancelarSerie`, `revertirSerie` y `arbolDeCategorias` (el mismo `/v1/categorias/all` del maestro, para el paso de categoría).
    - **Desvío registrado (corrector B06):** el pedido decía «el servicio existente del árbol de categorías de D-495». No hay un servicio que sirva tal cual: `MaestroService.getCategorias` usa `HttpClient` legacy con la pantalla de carga global y `CatalogAttributesService` (`/attribute-schemas`) exige la bandera `categoryAttributes`. Por eso `arbolDeCategorias` lee el mismo `/v1/categorias/all` y reutiliza las funciones puras de D-495 (`documentoDeCategorias`, `rutasDelArbol`), que eligen el mismo documento y los mismos nombres que el servidor. Si cambia cómo el maestro lee el árbol, hay que cambiar también este método. La vista previa y el lote mandan `categoryPath` (lo arma el mapper).
    - `product-photos.mapper.ts`: por categoría viaja siempre `categoryPath` (`categoryLabel` vale `[categoryLabel]`, como en el servidor); validación de la ruta igual a `normalizarRuta`; conteo del servidor (`selectionTotal`, `parts`, `categoryUnresolved`) y por selección el de los productos elegidos (la vista previa solo manda 3); tope de la serie de `limits.maxSeriesProducts` (si falta, 100, como el servidor: corrector B06); progreso y resumen de una serie con los contadores sumados; la reversión de una serie con `resultsTruncated` cuenta con los contadores; rutas para elegir con `documentoDeCategorias` y `rutasDelArbol` de D-495 (mismo documento y `label` primero, como pidió 7.6), hasta 3 niveles y sin repetidas.
    - Mensajes sin jerga, sin «token» y sin proveedor ni modelo de **todos** los códigos de §G: `category_unresolved`, `series_stopped`, `company_has_sync`, `SERIES_TOO_LARGE`, `SERIES_NOT_FOUND`, `possible_watermark`; de la fase 1b `download_failed`, `not_image`, `not_adoptable`, `would_copy`; de la fase 2 `background_input_invalid`, `background_unclear`, `background_unavailable`, `would_remove_background`, `AI_QUOTA_INSUFFICIENT`, `ai_quota`, `ai_unavailable`. `AI_QUOTA_INSUFFICIENT` usa el mensaje del servidor (dice cuántos usos quedan), salvo que hable de «token». Así 8.6 y 9.10 no vuelven a tocar el mapper para los textos.
    - Cambia a propósito (pruebas marcadas «CAMBIA CON 7.10»): el cuerpo por categoría pasa de `categoryLabel` a `categoryPath`, y el subtítulo pierde «· hasta 100 productos por lote» y dice «y sus subcategorías».
    - Corrector B06 (mapper): (a) sin `maxSeriesProducts`, el tope es el de un lote (100), como `topeDeSerie` del servidor; el aviso SERIES_TOO_LARGE se arma con el tope que aplica (`textoExcede`), así no bloquea en 100 diciendo 2.000; (b) una ruta que dan dos nodos del árbol (misma clave, como `indiceDeRutas`) sale `repetida`, porque el servidor la rechaza con `enColision`; (c) el resumen lista los avisos por código (`avisos`), y el de una serie puede listar motivos y avisos con los lotes de sus partes; (d) un mensaje del servidor que nombra un proveedor o un modelo (Nova, Bedrock, Canvas, Amazon, AWS, Titan, Opttia, Claude, Gemini, OpenAI, GPT) o dice «token» no se muestra; (e) `detieneLaConsulta` (403/404) y `mensajeDeConsultaCortada` (con FEATURE_DISABLED, la parada `feature_off`); (f) lo último se guarda también como `reversion:<id>`.
- **7.11** Front: diálogo con progreso de serie; paso de categoría solo si la pregunta 4 dice sí; proporción sugerida solo si la pregunta 13 dice sí. Depende de: 7.10.
  - Estado (21-oct, TX37-B06, revisado por el corrector; front en commit local, sin push ni despliegue): código y pruebas listos (preguntas 4 y 13: sí, aprobadas en bloque). Sin marcar: depende de 7.10.
    - Entradas nuevas del diálogo: `categoryPath`, `elegirCategoria` (sin productos ni categoría, primero el paso «Categoría» con buscador; el árbol se trae una vez) y `proporcionSugerida` (empieza en ella salvo «Del estilo»; sin ella, P1 con lo recordado). `categoryLabel` sigue para la lista de hoy hasta 7.12.
    - Vista previa: conteo del servidor («340 productos · se harán 4 lotes seguidos de hasta 100») y «N productos no se pudieron ubicar en tu árbol de categorías» (conteo de la empresa, sin atarlo a la categoría elegida).
    - Serie: `timer` + `switchMap` + `takeUntil` sobre `GET /series/:id` hasta el estado final («Parte 2 de 4 · 130 de 340 productos» y el estado de cada lote); «Cancelar los lotes» y «Revertir todos los lotes» (el lote de reversión se sigue con `GET /batches/:id`); el navegador recuerda `serie:<id>` para retomarla o revertirla en pausa (un id sin prefijo sigue siendo un lote, como en D-501).
    - Más de 2.000 (conteo del servidor o 422 del servidor): no se aplica y, si es una categoría, «Elegir una subcategoría» lista solo sus subcategorías y vuelve directo a la vista previa con la ruta nueva.
    - Diseño: clases `fu-*` sin «p-», cada `span` con color y tamaño, `:focus-visible` también en el buscador y en las categorías; degradados y primarios prohibidos de `components/productos/`: 0 antes y 0 después. Falta la revisión a 1440 y 390 px (7.13).
    - Pruebas: `fotos-uniformes.test.js` (20) y `fotos-uniformes-componentes.test.js` (21), con `photo-quality` y `producto-conserva-llaves-de-foto`: 51 en verde; tsc sin errores. Es la parte del front de 7.3 «entradas y progreso de serie» (falta la de las entradas de 7.12).
    - Corrector B06 (diálogo):
      - El resumen dice qué aviso tiene cada foto («Posible marca de agua o logo», requisito de D-518 TX-37·2), no solo la cifra. En una serie, al terminar, lee una vez cada lote que corrió (`GET /batches/:id`, hasta 20) para listar motivos y avisos; si alguno falla, lo dice y quedan las cifras del total.
      - Si `GET /series/:id` o `GET /batches/:id` responde 403 o 404, deja de consultar y lo dice («No pudimos seguir el avance»; con la bandera apagada, la parada `feature_off`). Sin conexión o con un 5xx sigue reintentando.
      - La reversión, de un lote o de una serie, se guarda como lo último de este navegador: al volver a abrir se retoma su avance, también en pausa, y ya no se ofrece revertir otra vez lo mismo. Antes, otro clic creaba otro lote de reversión.
      - Una ruta repetida del árbol se ve deshabilitada y dice por qué. El estado vacío manda a «Inventarios y productos › Categorías de productos»: el menú «Maestros › Categorías» no existe.
      - Pruebas: 24 en `fotos-uniformes.test.js` y 25 en `fotos-uniformes-componentes.test.js`. Con `photo-quality` y `producto-conserva-llaves-de-foto`, 59 en verde. tsc sin errores. Degradados y primarios prohibidos de `components/productos/`: 0 antes y 0 después.
- **7.12** Front, entradas: sección «Productos» del editor del sitio (y «Catálogo completo» si la pregunta 4 dice sí); detalle de Catálogos por link; lista con `categoryPath` y sin «· hasta 100». Éxito: cada diff se limita al botón, abrir el diálogo y recargar al cerrar. Depende de: 7.11.
  - Estado (21-oct, TX37-B07; front sin commit, sin push ni despliegue): código y pruebas listos (pregunta 4: sí; pregunta 13: sí). Sin marcar: depende de 7.11, que espera la cadena de 7.7.
    - Todo detrás de `productPhotoUniform` (`CompanyFeaturesService.isEnabled`); el servidor sigue decidiendo el modo y el rol.
    - Pieza pura nueva `components/productos/fotos-uniformes/fotos-uniformes-entradas.ts`: `rutaDeFiltros` e `idsParaUniformar`.
    - **Editor del sitio, «Productos»:** botón `btn-fantasma` «Uniformar fotos de estos productos» (solo con productos elegidos) con `b.datos.productoIds` sin repetir. Al cerrar con cambios llama a `resolverProductosDePrevia()`, que vuelve a pedir las miniaturas de `elegidosDelBloque` y la vista previa. Proporción sugerida: `contenido.tema.fotoProporcion` («Del estilo» = `''` no sugiere nada).
    - **Editor del sitio, «Catálogo completo»:** «Uniformar fotos por categoría» abre el diálogo en el paso de elegir la categoría (`elegirCategoria`), con la misma proporción sugerida.
    - **Catálogos por link, detalle:** «Uniformar fotos de este catálogo» en `cfg-acciones` (`cfg-btn cfg-btn--sec`), con `catalogo.productoIds` guardados. Solo con el catálogo creado y con productos guardados (sin ellos el botón no sale). Con cambios sin guardar el botón se ve y, al tocarlo, avisa «Guarda los cambios antes de uniformar las fotos.» (toastr, visible también en el celular) y no abre, porque recargar al cerrar los perdería: es la lectura de «solo con el catálogo guardado» de la spec. Hasta 200 productos: serie de 2. Al cerrar con cambios, `cargar(id)`.
    - **Lista de productos:** el botón de categoría manda `categoryPath` (`[categoria]` o `[categoria, subcategoria]`) y pierde «· hasta 100» y el tooltip del tope. Con una subcategoría filtrada dice «Uniformar fotos de esta subcategoría». Sale cuando ya llegaron las categorías (`categoriasCargadas`, también si `/v1/categorias` falla), porque los filtros se restauran de sesión antes. La barra masiva ya pasaba toda la selección: una prueba fija que pasa más de 100.
    - Nota de B04 resuelta sin cambiar el filtro: la lista arma sus opciones con `r[0]` y `data.nombre` primero, y el servidor usa el documento de D-495 y `label` primero. `rutaDeFiltros` busca cada nivel en el documento que elige el servidor (`documentoDeCategorias`), por el nombre del filtro y luego por el del servidor, y manda el del servidor. Un nivel que no aparece viaja con el nombre del filtro (los niveles ya traducidos se conservan) y el servidor responde con su mensaje (400 `INVALID_SELECTION`). Para eso la lista guarda los documentos que ya recibía (`categoriasDocs`); el filtro no cambia.
    - El diálogo se cuelga del `body` con `appAlBody` en el editor y en Catálogos por link, para quedar encima del menú y de la barra superior. `SitiosModule` y `CatalogosLinkModule` importan `FotosUniformesComponent`, y Catálogos por link también `AlBodyModule`.
    - Diseño: la única clase nueva es `fu-entrada-sitio` (sin «p-», con `:focus-visible` y `letter-spacing: normal`). Los textos van dentro de los botones, sin `span` nuevos creados por `*ngIf`, salvo el `span` de `cfg-btn`, que ya trae color y tamaño.
    - Pruebas: `fotos-uniformes-entradas.test.js` (22). Con las 4 de fotos, 81 en verde.
    - Corrector B07 (21-oct):
      - Editor del sitio: con el diálogo abierto, `atajos()` no actúa. Antes, Escape cerraba también la sección de detrás y Ctrl+Z, Ctrl+Y o Ctrl+S deshacían, rehacían o guardaban el sitio por detrás del diálogo.
      - `rutaDeFiltros` traduce con el documento que elige D-495 aunque no sea `r[0]`, y si la subcategoría no aparece conserva la categoría traducida.
      - Lista: el botón espera a las categorías y dice «subcategoría» cuando hay una filtrada.
      - Catálogos por link: el botón no se deshabilita con un `title` que no se ve en el celular; sin productos no sale y con cambios sin guardar avisa con un mensaje visible.
      - Prueba nueva: cada `[entrada]` y `(salida)` de `<app-fotos-uniformes>` en las tres plantillas existe como `@Input`/`@Output` del diálogo standalone, y `appAlBody` y `FotosUniformesComponent` están en los módulos. No reemplaza el build AOT de 7.13.
      - Pruebas: `fotos-uniformes-entradas.test.js` (25). Con las 4 de fotos, 84 en verde; `tests/sitios/` 113 en verde; tsc sin errores (con candado).
- **7.13** Cierre: `npm run build:prod` sin errores; degradados y primarios prohibidos de `components/productos/`, `components/sitios/` y `components/cotizaciones/` sin subir; revisión a 1440 y 390 px con la bandera en una empresa de prueba. Depende de: 7.12.
  - Estado (21-oct, TX37-B07): hecha la parte de código. tsc sin errores (con candado). Degradados y primarios prohibidos: 0 antes y 0 después en `productos/`, `sitios/` y `cotizaciones/`. Pruebas de fotos en verde.
    - Bloqueado: `npm run build:prod` (no se corre en esta sesión) y la revisión en el navegador a 1440 y 390 px con la bandera encendida en una empresa de prueba. Hasta el build no se compilan las plantillas: el tsc no las revisa.

## 8. Fase 1b: fotos externas y sin dueño (D-518 TX-37·3) — aprobada en bloque el 21-oct

Diseño: `design-fase-1b.md`. Seguridad: revisión privada del backend (`fotos-uniformes-producto-seguridad`), que bloquea 8.1, 8.4 y 8.5.

- **8.0 [P]** Conteo de solo lectura con `--dry-run` (el script de 0.3/0.4, solo metadatos, sin descargar) en FLORECER y, si Daniel lo autoriza (pregunta 11), en ALMARA FELICIDAD: `external_link`, `owner_unknown` y `not_owned` por empresa. Éxito: el dato queda en la bitácora.
- [x] **8.1 [P]** `services/productPhotos/photoCopy.js`, con sus pruebas de contrato en rojo primero: controles de descarga de la revisión privada, regla de adopción (`not_adoptable`), límite de 4 descargas por proceso dentro de la pieza y descargas fuera del semáforo de CPU. Es la pieza que usa F5-30 (D-518 F5-30·2). Éxito: contrato en verde; ningún log con la URL.
  - Hecho (2026-10-21, bloque TX37-B08, backend sin push): `services/productPhotos/photoCopy.js` y `tests/productos/productPhotos/photoCopy.contract.test.js` (35 casos, en rojo antes de crear la pieza), con los controles de la revisión privada en verde y ningún log ni metadato con la URL. API para F5-30: `copiarDesdeEnlace` y `copiarDesdeArchivoSinDueno` (o `crearCopiador` para inyectar Storage); para el lote, en dos pasos: `descargarEnlace` / `leerArchivoSinDueno` (no escriben) y `guardarCopia`. `writeset.contract` suma un control del código del módulo (ver revisión privada). Todavía no se conecta al lote ni a la vista previa: eso es 8.5 (bloque TX37-B09).
  - Corrección (2026-10-21, TX37-B08): 40 casos en verde tras la revisión del corrector (controles adicionales en la revisión privada). La vista previa puede pedir la descarga con `conTope: true`: si no hay turno de red en 20 s sale `busy: true` (para responder PHOTO_BUSY). El desvío de B1 (la copia no es del lado del servidor) quedó anotado en `design-fase-1b.md`. Requisito para B09 y F5-30: `empresa` y `companyDocId` salen los dos de la empresa validada de la sesión.
- [x] **8.2 [P]** Tienda en un paso: caracterización de `savePhoto` en verde; luego `metadata.company` y el comentario corregido. Éxito: la caracterización cambia solo en los metadatos.
  - Hecho (2026-10-21, bloque TX37-B01, backend sin push): caracterización en verde antes del cambio; después cambia solo en los metadatos (token y empresa, nunca el correo). Prueba de punta a punta: la foto guardada pasa la regla de pertenencia con la empresa del producto.
- [x] **8.3 [P]** `get_product_photo_upload_url`: caracterización en verde; luego el metadato obligatorio en la URL firmada. Éxito: ídem.
  - Hecho (2026-10-21, bloque TX37-B01, backend sin push): la URL firmada exige el metadato obligatorio; prueba con doble de Storage y con el firmador real sin red. Falta confirmarlo en una subida real de prueba cuando Daniel lo autorice (detalle en la revisión privada).
- [ ] **8.4 Sensible.** `update_product_photos`: caracterización en verde (listar, agregar por ruta y por enlace, quitar, tope, aviso de sync); luego el sellado con `company` y, según la pregunta 5, la copia del enlace. Éxito: diff aprobado.
  - Estado (2026-10-21): caracterización en verde y sellado con `company` hechos en el bloque TX37-B01 (backend, sin push), con las pruebas de la revisión privada en verde. Falta el diff aprobado por Daniel y la copia del enlace (pregunta 5), que va en el bloque TX37-B09 con `photoCopy`.
  - Estado (2026-10-21, TX37-B09, backend en commit local, sin push): la copia del enlace está hecha y nace APAGADA. Solo actúa con el interruptor nuevo `config/feature_flags.productPhotoCopyMode` en `on` (D-505). Ausente, en `off` o en `shadow`, la herramienta guarda el enlace como antes, sin red ni Storage, y la caracterización de B01 queda idéntica, sin casos «CAMBIA CON 8.4».
    - Con el interruptor en `on`, proponer no descarga nada. Al aprobar, el enlace se copia con `photoCopy` a `Productos/copias/<companyDocId>/<productoId>/` con `metadata.company` de la empresa del conector, y la foto queda con la URL y la ruta de la copia. Una URL del almacenamiento de Katuq no se descarga: pasa por la regla de pertenencia (ver revisión privada).
    - La escritura va en una transacción que comprueba que las fotos no cambiaron mientras se copiaba. Si cambiaron, responde `cambio_mientras_tanto` y no escribe; la copia queda sin uso.
    - Sin turno de descarga en el plazo responde `ocupado`. Si no se puede copiar responde `copia_fallida` con su `code`, y si la empresa no se resuelve, `empresa_no_resuelta`. En esos casos no escribe nada.
    - La foto de la herramienta no lleva `copiedFrom` (anexo §G.3 lo define para el lote).
    - Pruebas: `copiaEnlaceMcp.test.js` (11) y `herramientasFotos.caracterizacion` (20, sin cambios).
    - Sigue sin [x]: falta el diff aprobado por Daniel (`b09-diff-8.4-aprobacion.patch`, sobre la base común `b09-diff-comun-aprobacion.patch` con el interruptor). Se aprueba sin depender de 8.5.
- **8.5 Sensible.** Lote y vista previa: copiar (`on`) o medir (`shadow`, vista previa) las fotos `external_link` y `owner_unknown` adoptables, omitir sin leer las no adoptables también en la vista previa, y escribir `copiedFrom`. `writeset.contract` suma las carpetas `copias` y la prohibición de `setMetadata` y `delete`. Éxito: diff aprobado; contrato en verde. Depende de: 7.8 y 8.1.
  - Estado (2026-10-21, TX37-B09, backend en commit local, sin push): hecho y probado. Sin [x] hasta el diff aprobado por Daniel (`b09-diff-8.5-aprobacion.patch`, sobre la base común `b09-diff-comun-aprobacion.patch`; no depende de 8.4). Pruebas en rojo antes del código: `fase1b.lote.test.js` (13 casos, 0/13 contra HEAD) y casos nuevos en `writeset.contract` y `eligibility`.
    - **Interruptor propio (corrector B09, D-505):** `config/feature_flags.productPhotoCopyMode` (`off` | `shadow` | `on`; ausente o inválido = `off`). Se cambia con `scripts/set-product-photos-config.js --copia`. El lote usa el menor entre este interruptor y su propio modo: con el lote en `on` y el interruptor en `shadow`, las fotos de 1b solo se miden (`would_copy`). En `off`, el lote y la vista previa no cambian frente a la fase 1: no se descarga nada y el enlace y el sin dueño se omiten como antes. Encender la fase 1 (5.3, 5.4) ya no enciende 1b; 8.7 lo enciende aparte. El interruptor se lee solo si el producto tiene fotos de 1b.
    - Contrato para 8.6 (front):
      - la foto de un resultado lleva `copiedFrom: "link" | "unowned"`, nunca la URL ni la ruta;
      - en sombra su estado es `would_copy`;
      - la muestra de la vista previa lleva `copiedFrom` cuando se copiaría;
      - `GET /batches/:id` y `GET /series/:id` suman `metrics.photosCopied` y `metrics.photosWouldCopy`;
      - códigos de omisión que pueden llegar de 1b: `download_failed`, `not_image` y `not_adoptable` (nuevos), y `too_large` y `unreadable` (ya existían; el mapper de 7.10 los tiene).
    - Una foto `would_copy` cuenta también en `counters.photosWouldUniform`, y en `on` la copiada cuenta en `photosUniformed`: los contadores de siempre suman todas las fotos que se uniformarían.
    - Vista previa: cada descarga o lectura de una foto por copiar cuenta para su tope de 3 fotos aunque falle. Sin turno de red responde `PHOTO_BUSY`.
    - Lote: la espera del turno de descarga tiene plazo. Si no hay turno, renueva el arriendo y reintenta hasta 3 veces; después omite la foto con su código.
    - Caracterización: con el interruptor apagado, el caso «lote on» de `writeset.contract` es idéntico al de antes. La adopción con una copia va en un caso aparte con el interruptor en `on`. `batchStore.caracterizacion` 10/10 sin cambios.
    - Pruebas del corrector: `fase1b.lote` 19 (interruptor apagado, `shadow` con el lote en `on`, variantes de URL del almacenamiento propio, reversión de una foto, descargas lentas sin frenar otra vista previa, reintento del turno), `writeset.contract` 13, `eligibility` 12, `config` 12 y `setProductPhotosConfig` 10.
- **8.6 [P]** Front: mensajes de `download_failed`, `not_image`, `not_adoptable`, `would_copy` y el origen en el resumen. Depende de: 8.5.
- **8.7** Sombra de 1b en FLORECER (después de 5.3) y `on` con unos 10 productos con fotos externas o sin dueño, por orden de Daniel. Revertir y comprobar que vuelve la copia.

## 9. Fase 2: quitar el fondo con IA (D-518 TX-37·6) — aprobada en bloque el 21-oct

Diseño: `design-fase-2.md`. Requiere la fase 1 en `on` (5.4). **Nada sale a un proveedor de IA sin 9.1 y 9.2.**

- **9.1** Medir el costo real: con la autorización de Daniel, 10 fotos de FLORECER por la ruta del ADK (tarea 9.5) en un entorno de prueba. Comparar la factura (`USE1-NovaCanvas-I2I-*`) con la tabla de `design-fase-2.md` y medir la calidad con la máscara a 1024 px. Éxito: costo por foto en la bitácora y **OK de Daniel al costo** (D-518 TX-37·6).
- **9.2** Daniel confirma que la política de privacidad cubre las fotos de producto procesadas por IA. Éxito: queda en la bitácora.
- **9.3 [P]** Caracterización: `consumeAILimit` y `getFeatureLimit` con los usos de hoy; pruebas actuales de `backgroundRemoval` en verde.
- **9.4 [P]** Pruebas en rojo: ruta del ADK (token, tamaño, sin URL, PNG); proveedor `opttia` fuera del semáforo de CPU y con su límite de 2; lista `backgroundRemovalUses`; topes de entrada del modelo (`background_input_invalid` sin gastar); control de calidad de la máscara; logo suelto descartado; estimación del cupo con `backgroundScope`, `AI_QUOTA_INSUFFICIENT` y parada `ai_quota`; 3 fallas seguidas → `ai_unavailable` con los usos devueltos; reuso del recorte por la huella (después de la vista previa y después de revertir, sin descuento); `photoBackgroundsPerMonth` ausente → 0; vista previa con «Quitar fondo» solo admin y solo en `on`; sombra sin llamadas ni archivos.
    - **Estado de 9.4 (bloque TX37-B12, 21-oct):** hechas las piezas puras con pruebas: `functions/utils/productPhotoBackground.js` (topes de entrada del modelo, huella de 16 caracteres, reducción a 1024 px, control de calidad de la máscara 3 %-98 %, máscara agrandada, logo suelto con los umbrales de `possible_watermark`, composición sobre fondo opaco y encadenado con `procesarFoto`) y `tests/productos/productPhotos/photoBackground.test.js` (37). Corregido tras revisión: la máscara usa el alfa solo si varía (si es constante, el gris); `aplicarRecorte` repite los topes del modelo sobre el original, exige la misma proporción que la foto enviada (2 %), reevalúa la calidad tras quitar logos y devuelve `background_color_invalid` en vez de lanzar; la composición une la máscara con `joinChannel` (sin bucle por píxel). **Corrección B13 (21-oct):** lo que faltaba (cupo, paradas, reuso del recorte, vista previa y sombra) está en `quitarFondo.lote.test.js` y `quitarFondo.piezas.test.js`; con eso 9.4 queda hecha y probada, y se cierra junto con 9.8 cuando Daniel apruebe el diff. Desvío: si la reducción a 1024 px dejara el lado menor bajo 320 (proporción de más de 3,2:1), se reduce solo hasta 320 para que lo enviado cumpla el tope.
- **9.5** ADK (repo `kai/adk_agent`): `POST /api/ai/background-removal`. Se despliega por systemd (`kai-adk`) solo por orden de Daniel. Depende de: 9.4.
- **9.6** `backgroundRemoval.js`: proveedor desde `config/feature_flags` (sin caché), `getProviderName` e `isConfigured` asíncronas, lista de usos y proveedor `opttia`. `fichaDesdeFoto` pasa su uso y queda sin recorte. Depende de: 0.6 y 9.4.
    - **Estado (bloque TX37-B10, corregido y con commit el 21-oct):** hecha con pruebas en rojo primero. El proveedor y los usos se leen con `leerConfigFondo` en cada llamada (sin caché, valores exactos) y ya no se lee la variable del `.env` ni el lector con caché de la plataforma. `getProviderName` e `isConfigured` son asíncronas (sus únicos llamadores eran pruebas). `removeBackground(foto, { uso })` acepta data URL o bytes y devuelve `null` sin llamar si el uso no está en la lista. Proveedor `opttia` en un módulo propio, registrado y apagado (proveedor `""` por defecto); límite propio de 2 llamadas a la vez, fuera del semáforo de CPU, con la espera dentro del plazo de 20 s. `fichaDesdeFoto` pide con su uso y, con los usos por defecto, queda sin recorte. Detalles del contrato con el ADK: ver revisión privada. Corrección: el plazo de 20 s es total (incluye la lectura de `config/feature_flags`, así un Firestore lento no retiene la ficha), un turno que llega con el plazo vencido no dispara la llamada, la respuesta del ADK se lee por partes con tope y la prueba «fuera del semáforo» llena el semáforo de CPU de verdad. Pruebas: `tests/media/backgroundRemovalOpttia.test.js` (18, con un ADK falso local; sin ADK ni Bedrock reales), `backgroundRemoval.test.js` adaptada (13, casos «CAMBIA CON 9.6»), `fichaDesdeFoto.test.js` (+1). La parte de 9.4 que le toca a este bloque (proveedor, límite de 2 y lista de usos) queda cubierta; el resto de 9.4 va con 9.7 y 9.8. Sigue `[ ]` porque 0.6 y 9.4 no están cerradas. Falta que 9.5 (ruta del ADK) exista para probar contra el ADK real con la orden de Daniel. Antes de agregar `fichaDesdeFoto` a `backgroundRemovalUses`, ese camino necesita cupo y bandera (hoy no los tiene): decisión de Daniel.
- **9.7 Sensible (cupo del plan).** `photoBackgrounds` en `aiLimitsService.js` (ausente o inválido = 0, nunca `-1`), `devolverAILimit` transaccional y `photoBackgroundsPerMonth` en `freemium`, `paid` y `premium` de `config/subscriptionLimits.js`, con los valores de la pregunta 6. Éxito: 9.3 igual; diff aprobado. **Estado (bloque TX37-B11, 21-oct):** hecha y probada, sin [x] hasta que Daniel apruebe el diff. `photoBackgrounds` mensual y por empresa en `getFeatureLimit` (ausente o inválido = 0, nunca `-1`), `devolverAILimit` transaccional (no baja de 0, no crea documentos, escribe solo ese campo), `llaveCupoEmpresa(req)` (empresa solo de `req.tenant`, usuario fijo `_empresa`) y `photoBackgroundsPerMonth` en `freemium` (10), `paid` (500) y `premium` (500). Los usos de hoy quedan idénticos (`tests/ai/aiLimitsCaracterizacion.test.js`, en verde antes y después). Pruebas: `tests/ai/cupoFondoFotos.test.js` (14). Nada llama aún a estas funciones: las usa 9.8. **Notas para 9.8/9.10:** `devolverAILimit` no es idempotente, así que 9.8 devuelve una sola vez por solicitud (bandera local, con prueba) y solo cuando el proveedor no respondió; cruza mes sin recuperar el uso del mes anterior (borde aceptado); `consumeAILimit` acepta `amount` no entero, 9.8 siempre cobra enteros; `getAIUsageStats` aún no incluye `photoBackgrounds`: 9.10 lo agrega o lee con `checkAILimit`.
- **9.8 Sensible.** Lote y vista previa con `backgroundMode: "replace"`: recorte guardado por la huella, validar antes de gastar (topes del modelo), cupo y devolución, llamada fuera del semáforo, parada `ai_unavailable`, máscara, logo y la tubería de la fase 1. Éxito: diff aprobado; 9.4 en verde. Depende de: 9.6 y 9.7. **Estado (bloque TX37-B13, 21-oct):** hecha y probada, sin [x] hasta que Daniel apruebe el diff. Ajustes `settings.backgroundMode` (`keep` por defecto | `replace`) y `settings.backgroundScope` (`cover` por defecto | `all`): un valor inválido es `INVALID_SETTINGS`; con `keep` no se guarda ninguna de las dos llaves (mismos `settings` y mismo `settingsHash` que la fase 1). Con `replace` se exige la bandera `productPhotoBackground`, el proveedor configurado y el uso permitido (422 `BACKGROUND_UNAVAILABLE`). Nuevo `services/productPhotos/fondoFoto.js` (una sola pieza para el lote y la vista previa): recorte guardado por la huella (`photoStorage.leerRecorte`/`guardarRecorte`, `Productos/uniformes/<cid>/recortes/<huella>-nova-canvas-v1.png`, `metadata.company`, `dudoso`, sin token, precondición de no existir, solo se reusa si `metadata.company` es la empresa), validar antes de gastar, descuento del cupo de la EMPRESA antes de llamar, llamada fuera del semáforo de CPU, devolución única si el proveedor no responde (`background_unavailable`), `background_unclear` sin devolución y con el recorte guardado como dudoso. Paradas del lote o la serie: `ai_quota` (sin cupo a mitad; la cascada cierra las partes que esperan con `series_stopped`) y `ai_unavailable` (3 fallas seguidas; los usos ya se devolvieron o el proveedor se quitó a mitad). Antes de cada producto se mira la bandera (`feature_off`). `processed.backgroundMode` (`replace` | `keep`) y `processed.cutoutPath` solo en lotes con `replace`; `metrics.aiUsesConsumed`, `aiUsesRefunded` y `aiUsesWouldConsume` (también en `GET /batches/:id`, `GET /series/:id`). Sombra: cero llamadas, cero descuentos y cero archivos; las fotos salen `would_remove_background`. `POST /preview` con `replace`: 403 `ADMIN_ONLY` si no es administrador, 422 `BACKGROUND_UNAVAILABLE` si el modo no es `on`; paga hasta 3 usos, guarda los recortes y solo escribe eso (más el cupo): nunca `products`, historial ni lotes; responde `settings`, `aiUsesNeeded`, `aiUsesLeft`, `aiUsesConsumed` y, si se detuvo, `stopCode`. `GET /settings` suma `aiUsesLeft` y `backgroundRemoval: { available, previewAvailable }`. `POST /batches` con `replace` en `on` rechaza con 422 `AI_QUOTA_INSUFFICIENT` (`aiUsesNeeded`, `aiUsesLeft`) sin crear el lote. **Desvíos y límites para que Daniel los vea:** (1) la estimación es una cota superior: cuenta las fotos elegibles según el alcance pero no abre los archivos, así que no descuenta los recortes que ya estén guardados (aplicar puede costar menos); (2) en sombra la estimación no rechaza; (3) código nuevo de omisión `ai_quota` para las fotos del producto donde se acabó el cupo, que el front (9.10) debe traducir; (4) códigos de error nuevos `BACKGROUND_UNAVAILABLE`, `ADMIN_ONLY` y `AI_QUOTA_INSUFFICIENT` (el mensaje de 403 no lleva la palabra «token»); (5) si el cupo se acaba o el proveedor cae en medio de un producto, las fotos de ese producto que faltan se omiten y el lote para: no se mezcla un pedazo con IA y otro sin IA. Pruebas: `tests/productos/productPhotos/quitarFondo.lote.test.js` (37) y `quitarFondo.piezas.test.js` (9), con dobles (proveedor, cupo, Firestore y Storage); 13 mutaciones del código nuevo las hacen fallar. Las suites de productPhotos, writeset, routes.contract y batchStore.caracterizacion siguen idénticas. Falta: probar contra el ADK real (9.5) con la orden de Daniel. Correcciones del revisor (B13): la vista previa paga como máximo 3 usos; un reintento de POST /batches con lote ya creado no vuelve a pedir cupo; la estimación usa el plan del lote (con 1b) y descuenta los recortes guardados cuando no alcanza el cupo; la devolución se reintenta una vez.
- [x] **9.9 [P]** Bandera `productPhotoBackground` en los dos catálogos (dueño Daniel, retiro 2027-06-30).
    - **Estado (bloque TX37-B10, corregido y con commit el 21-oct):** hecha. Está en `FEATURE_FLAG_NAMES` del backend y en `COMPANY_FEATURE_FLAGS` del front, fuera de `banderasEmpresaNueva.js`. «Exige `productPhotoUniform`» queda en código, no solo en el comentario: `FEATURE_FLAG_REQUIRES` (backend, usado por `isFlagOn`, `isFeatureEnabled`, `readFeatureFlags` y `requireFeature`) y `COMPANY_FEATURE_REQUIRES` (front, usado por `isEnabled` e `isEnabled$`). Sola no prende. Las demás banderas no tienen requisito y no cambian. Pruebas: `tests/companies/companyFeatureFlags.test.js` (40; el catálogo pasa de 38 a 39) y `tests/productos/fotos-uniformes-bandera-fondo.test.js` del front (4; la comparación con el backend se salta si no está al lado, salvo con `KATUQ_EXIGIR_BACK=1`).
- **9.10** Front: «Quitar fondo» en el diálogo (solo admin y en `on` para la vista previa), alcance portada o todas, usos que necesita y que quedan, y aviso del costo de la vista previa. Depende de: 9.8 y 9.9.
- **9.11** Por orden de Daniel, después de 9.1 y 9.2: `backgroundRemovalProvider = "opttia"`, sombra y luego `on` con unos 10 productos de FLORECER. Revisar tienda, catálogo por link, `feed.xml` y cotizaciones, y revertir.

## 10. Bitácora y retiro de la ampliación

- **10.1** Bitácora de cada fase en `specs/CONTRACT.md` (D-518) y, si está autorizado, comentario en el ticket 1252 (cd `GByRqDwAl5X7d7qwObGP`). Por D-518 T·1, corregir el texto de la resolución del ticket, que remite a «TX-37b», un ticket que no existe: lo pendiente sigue en el mismo ticket.
- **10.2** Retiro (Artículo XII): `productPhotoUniformMode` con la bandera de la fase 1 (6.1, 2027-04-30); `productPhotoBackground` y `backgroundRemovalUses` el 2027-06-30.

**Dependencias de otros cambios:** TX-37·7 (F2-20, feed JPEG para Meta) es un arreglo aparte; la revisión de Meta de 5.4 depende de él. TX-37·8 (TX-34, `tienda-celular-y-velocidad`) pinta el `srcset` de las variantes que genera este cambio; las variantes de las fotos no uniformadas las decide su P6. F5-30 (`importador-migracion-tiendas`) usa `photoCopy` (8.1) y su límite de descargas por proceso. La revisión privada del backend (`fotos-uniformes-producto-seguridad`) bloquea 8.1, 8.4, 8.5 y 9.5 a 9.8.
