## Why

Para la feria de Effix (16 al 18 de octubre de 2026; todo listo el 15) salen funciones nuevas en varias partes de Katuq: la ficha de un producto desde una foto, las fotos por enlace al importar, comprar ahora contra entrega, el recordatorio y la confirmación por WhatsApp, la guía contra entrega con Envíame, el alistamiento y otras. Daniel fijó una regla para todas: **toda función nueva nace apagada para los comercios que ya operan (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS) y se enciende comercio por comercio**, probándola primero en FLORECER, la empresa demo.

Hoy no hay una forma común de cumplirla. Ya conviven interruptores de otra naturaleza: variables de entorno para toda la plataforma (`OFERTAS_MENSAJEROS_CRON_ENABLED`, `CARRITO_ABANDONADO_CRON_ENABLED`), una lista de empresas dentro de una variable de entorno (`ORDER_NOTIF_UNIFIED_COMPANIES`, que cambia reiniciando el servidor), las constantes del `FeatureFlagsService` del front (iguales para todos) y un ajuste propio del comercio (`companyConfig.mensajerosTomanPedidos`). Además, dos propuestas en curso eligieron uno propio (`codEnabled` en la configuración de Envíame; `empresa.cupon` en las ferias). Ninguno responde "¿esta empresa ya tiene esta función?" de la misma manera en el servidor y en la pantalla. Esta pieza es esa respuesta única: `alistamiento-picking-rutas`, `whatsapp-confirmacion-y-carrito` y `comprar-ahora-contra-entrega` dependen de ella (varias la llaman "la Fundación") y no la reimplementan.

El código ya está escrito en el árbol de trabajo (servicio de lectura y script para prender y apagar en el servidor, protección de la ficha de empresa, y servicio del front), con 65 pruebas en verde, pero **no tiene propuesta ni decisión registrada**, y las reglas del proyecto lo exigen (Art. I y XIV; `openspec/config.yaml` de los dos repos). Esta propuesta lo documenta tal como está, separa lo hecho de lo pendiente y deja a la vista lo que salió al leerlo contra el código real.

## Hallazgos al leer el código (para decidir antes de aprobar)

1. **La ficha todavía deja prender banderas campo por campo (el más importante).** El limpiador de la ficha y las rutas viejas quitan la llave `featureFlags` completa, pero una llave con punto (`featureFlags.<bandera>`) pasa: Firestore la lee como una ruta y escribe el campo anidado. Comprobado con el SDK real del repo: la escritura armada lista `featureFlags.<bandera>` entre los campos a cambiar. Alcanza por `PUT /v1/companies/:id` (un administrador, sobre su propia empresa) y por `POST /v1/companies/edit` (un administrador, sobre cualquier empresa, porque esa ruta identifica la empresa por el NIT del cuerpo). Las pruebas actuales no lo ven porque su Firestore simulado no interpreta puntos. El mismo hueco ya existía para los campos ajenos que son mapas, como `bloqueo.*`. Según el árbol, el módulo todavía no tiene commit ni está desplegado, así que no hay banderas en producción que prender; hay que cerrarlo antes de desplegar cualquier función con bandera (`tasks.md` 3.2; hunk exacto en `design.md`, decisión 11).
2. **El catálogo no coincide con lo que otras piezas esperan.** `pickingAlistamiento` (que `alistamiento-picking-rutas` da por sumada) no está en el archivo. `singleProductTemplate` (el nombre que usan `data/siteTemplates.js` y su prueba, y que `plantilla-tienda-un-producto` espera "de la Fundación") tampoco. El catálogo sí trae `singleStepStore`, pero es **otra función** (la tienda en un solo paso con IA, `services/sites/tiendaEnUnPasoContenido.js`): reusarla encendería dos funciones a la vez. La prueba fija el catálogo en exactamente 8 nombres. Con un catálogo cerrado, un nombre ausente es una función que nunca prende.
3. **La compuerta se puede falsificar en una ruta pública si se usa tal cual.** Sin sesión, `requireFeature` toma la empresa del encabezado `company`, que escribe quien llama. Está bien con la llave de servicio de un agente interno; en una ruta pública lo escribe el visitante. Hoy la única ruta con compuerta (`POST /v1/katuqintelligence/ficha-desde-foto`) exige sesión; las que vienen en la tienda pública deben pasar su propia resolución de la empresa, o el resolvedor debe cerrarse por defecto (pregunta abierta). Una propuesta hermana ya tropezó con esto en su parche (`plantilla-tienda-un-producto` decide la bandera con `req.headers.company`).
4. **Ninguna bandera tiene dueño ni fecha de retiro**, y el Artículo XII los exige al crearla.
5. **Prender una bandera no deja rastro persistente ni frena a los cuatro clientes actuales.** El script imprime antes y después en la terminal y nada más.
6. **Preexistente y fuera de alcance:** `POST /v1/companies/byName` y `GET /v1/companies/all` toman la empresa del cuerpo o del encabezado en lugar de la sesión; por lectura del código, devuelven la ficha completa (ahora también con `featureFlags`) de cualquier empresa a cualquier usuario con sesión. Es el mismo tipo de hueco que `cupones-de-feria` ya documentó en `POST /v1/companies/edit`.
7. **La Fundación está sin versionar.** `functions/services/companyFeatureFlags.js` y `functions/scripts/set-company-feature.js` no tienen historial en git (archivos sin seguimiento), y `plantilla-tienda-un-producto` reporta que el archivo del módulo ya se borró una vez por error hoy. De ella dependen tres componentes del front (`crear-producto-lite`, `crear-productos` e `import-modal` importan `CompanyFeaturesService`, que tampoco está versionado: sin él el front no compila) y el servidor (los dos consumidores que hay hoy en el árbol cargan el módulo con red de seguridad; el parche de `controllers/sites.js` de `plantilla-tienda-un-producto`, según esa propuesta, lo pide suelto al cargar y sin él no arranca el servidor). Versionarla es lo primero (`tasks.md` 1.5), antes o junto con cualquier consumidor.

## What Changes

Un solo contrato, en cinco partes. Todas están escritas; `tasks.md` dice qué falta.

| Parte | Qué hace |
|---|---|
| **Dónde vive la bandera** | Campo `featureFlags` en el documento de la empresa (colección `companies`, que ya existe): un mapa de nombre a booleano. Ausente, o con cualquier valor distinto del booleano `true`, la función está apagada. El texto `"true"`, el número 1, `{}` o una lista no la prenden. |
| **Lectura en el servidor** (`functions/services/companyFeatureFlags.js`) | Catálogo cerrado de nombres. `isFeatureEnabled(empresa, bandera)` para servicios, crones y webhooks, y `requireFeature(bandera)` como compuerta de una ruta (después de `auth`): apagada, responde 403 `FEATURE_DISABLED` con un mensaje claro y no escribe nada. Ante cualquier duda responde "apagada" y nunca lanza. Solo lee, y solo el campo `featureFlags`. |
| **Escritura controlada** (`functions/scripts/set-company-feature.js`) | La única vía para prender o apagar. Simula por defecto; con `--execute` escribe solo esa bandera (con `merge`), relee y verifica. Se niega si la empresa no existe, hay dos con el mismo nombre comercial o `featureFlags` no es un mapa. |
| **La ficha de empresa no toca las banderas** (`controllers/companies.js`, `sanitizeCompanyUpdate.js`) | Guardar, crear o editar una empresa ignora `featureFlags`: un administrador de comercio no se prende funciones y una ficha abierta hace rato no revierte una bandera recién cambiada. Una empresa nueva nace con todo apagado. |
| **Lectura en la pantalla** (`company-features.service.ts`, `CompanyInformation.ts`) | `isEnabled(bandera)` e `isEnabled$(bandera)` leen la empresa completa que guarda el inicio de sesión y solo le creen a las banderas si esa empresa es la de la sesión. Decide qué se **muestra**; quien manda es el servidor. |

**Catálogo hoy** (cerrado; se amplía en el servidor y en el front a la vez):

| Bandera | Estado en el código |
|---|---|
| `productFromPhoto` | Cableada: la ruta `POST /v1/katuqintelligence/ficha-desde-foto` y los dos formularios de producto |
| `productImportPhotos` | Cableada: `importProducts` y el modal de importación |
| `buyNowCod`, `whatsappCartRecovery`, `whatsappOrderConfirmation`, `enviameCodGuide` | Sin consumidor todavía; cada una la usa su propia propuesta (`enviame-contra-entrega-y-rastreo` propone además otro interruptor, `codEnabled`) |
| `singleStepStore` | En escritura por otra sesión (tienda en un solo paso con IA): `services/sites/tiendaEnUnPasoContenido.js`, solo piezas puras; la orquestación no está en el árbol |
| `product3d` | Sin consumidor en el código |
| `pickingAlistamiento`, `singleProductTemplate` | **No están en el catálogo**, aunque otras piezas las nombran (hallazgo 2) |

### Qué NO cambia para ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS

- No se escribe nada en sus fichas: sin migración y sin relleno. Que el campo no exista es, por definición, "todo apagado" (`companyFeatureFlags.test.js` fija apagadas todas las banderas del catálogo para una empresa sin el campo; con `{}` también queda apagada).
- Guardar su ficha escribe exactamente los mismos campos de siempre (`featureFlagsProtegidos.test.js`: "sin featureFlags en el cuerpo, la ficha escribe exactamente los mismos campos de siempre").
- La empresa que llena la sesión (`/v1/companies/byName`) sigue llegando sin el campo `featureFlags`, porque su ficha no lo tiene.
- La Fundación por sí sola no cambia ninguna pantalla ni ruta. Las pantallas y rutas existentes solo cambian en lo que cada función nueva agrega detrás de su bandera, y eso lo declara la propuesta de cada función. Las rutas nuevas con compuerta les responden 403 (antes no existían).
- Lo único medible: cada pregunta de bandera es una lectura de un documento de `companies`, y la hace solo el código nuevo que pregunta.

## Capabilities

### New Capabilities
- `company-feature-flags`: la lectura de la bandera. Nace apagada, catálogo cerrado, se cierra ante la duda, la empresa sale de la sesión firmada y el servidor manda.
- `company-feature-flag-control`: cómo se prende y se apaga una bandera, y por qué la ficha de empresa no puede tocarla.
- `company-feature-flag-interface`: qué muestra la pantalla según la bandera de la empresa de la sesión.

### Modified Capabilities
- Ninguna archivada.

## Impact

- **Backend (`katuq_admin_back_firebase/functions`):**
  - nuevos: `services/companyFeatureFlags.js` y `scripts/set-company-feature.js`;
  - editados: `controllers/companies.js` (una línea en `createCompany` y otra en `editCompany`) y `services/companies/sanitizeCompanyUpdate.js` (un nombre en la lista de campos ajenos);
  - pruebas nuevas en `tests/companies/`: `companyFeatureFlags` (33), `setCompanyFeature` (18) y `featureFlagsProtegidos` (14).
- **Front (`Seller.Katuq`):** nuevo `src/app/shared/services/company-features.service.ts` y un campo opcional `featureFlags` en `src/app/shared/models/User/CompanyInformation.ts`. Sin pantallas nuevas.
- **Quién la consume hoy:** `routers/katuqintelligence.js` (`productFromPhoto`), `controllers/onboarding.js` (`productImportPhotos`) y, en el front, `crear-producto-lite`, `crear-productos` e `import-modal`. Todas con la bandera apagada por defecto.
- **Datos:** sin colecciones nuevas, sin índices, sin migración. Un campo opcional nuevo, `featureFlags`, en `companies`.
- **Write-set:** lo único que escribe este cambio es `companies/{id}.featureFlags.<bandera>`, solo desde el script y con `merge`. No toca `products`, variantes, precios, listas de precios, `inventory`, `inventoryMovement` ni pedidos (la prueba de `setCompanyFeature` verifica que el documento no cambia salvo esa clave y que no hay `update` ni `delete`). Los dos controladores editados solo **dejan de escribir** un campo.
- **Módulos sensibles:** no toca pedidos, inventario ni consecutivos. Pero la bandera será la compuerta de funciones que sí los tocan (compra rápida, alistamiento): cada una lo declara en su propia propuesta y debe probar que, apagada, su camino es idéntico al de hoy. Una bandera **solo cubre lo nuevo**: nunca se pone detrás de una bandera algo que hoy funciona para todos, porque si la lectura falla la función se apagaría.
- **Verificación contra la constitución:**
  - I (spec primero): esta propuesta.
  - VIII (contract test primero): las tres pruebas existen; la de la llave con punto va primero y hoy fallaría.
  - IX: el servicio del front no hace HTTP; RxJS solo en `isEnabled$`; signals, `@if` y OnPush no aplican a un servicio nuevo en un proyecto Angular 14.
  - XI: ni el módulo ni el script registran datos personales ni credenciales (solo nombre comercial, id del documento y banderas).
  - **XII: incumplido hoy** (ninguna bandera tiene dueño ni fecha de retiro): tarea 5.4.
  - XIII: cada spec cabe en 3 páginas.
  - XIV: decisión **D-385** (el número lo asigna quien haga el commit, mirando `specs/CONTRACT.md` del remoto).
  - XV: el campo y los nombres van en inglés.

## Riesgos

- **Pérdida o despliegue a medias de la Fundación** (hallazgo 7): sin versionar, puede perderse; y un consumidor que llegue a producción sin ella no compila (front) o deja la función cerrada, o tumba el arranque si pide el módulo suelto (servidor).
- **Llave con punto** (hallazgo 1): un administrador podría prenderse funciones por la ficha. Se cierra antes de desplegar cualquier función con bandera.
- **Nombres que el catálogo no tiene** (hallazgo 2): una función quedaría apagada para siempre sin que nadie lo note.
- **Compuerta falsificable en una ruta pública** (hallazgo 3): una compuerta que se salta con un encabezado no protege nada.
- **Una lectura de `companies` por pregunta** en rutas calientes (render de la tienda, compra rápida): no hay caché, por regla del proyecto y para que apagar surta efecto de inmediato. Las propuestas hermanas ya lo midieron en el render de la tienda.
- **Nombre comercial repetido:** esa empresa nunca prendería la función (se cierra ante la duda). Falta contar en producción cuántos nombres se repiten (tarea 6.1).
- **Prender en un cliente real por error:** el script pide nombre exacto y `--execute`, pero no tiene confirmación extra ni lista de clientes protegidos (hallazgo 5).
- **Módulos sensibles:** este cambio no toca pedidos, inventario ni consecutivos. `companies` es el registro maestro del tenant (plan, credenciales, bloqueo), por eso el único escritor nuevo es el script, con `merge` sobre una sola clave, y los controladores solo dejan de escribir un campo.

## No-goals

- Una pantalla para prender o apagar banderas. Hoy es solo el script; una consola de plataforma sería otra propuesta, con su ruta, su permiso y su registro.
- Banderas por usuario, por rol, por porcentaje o por fecha.
- Una caché de banderas: cada pregunta lee el valor vigente.
- Un historial persistente de cambios de bandera en Firestore (sería una colección nueva; requiere aprobación explícita).
- Reemplazar las variables de entorno globales, el `FeatureFlagsService` del front ni los ajustes propios del comercio (`companyConfig.*`).
- Prender cualquier bandera en un comercio real.
- Corregir el hueco general de `POST /v1/companies/edit` ni el de `byName` y `all` (hallazgo 6): solo se cierra lo que toca a las banderas.
- Cambiar planes, límites o precios.
- Crear colecciones, endpoints `v2` o cachés.

## Decisión

**D-385**: banderas por comercio como contrato común de las funciones nuevas. `companies.featureFlags.<nombre>`, catálogo cerrado, solo `true` prende, se cierra ante la duda, la empresa sale de la sesión firmada, solo el script escribe, la ficha no las toca y la pantalla solo decide qué muestra. El número lo asigna quien haga el commit mirando `specs/CONTRACT.md` del remoto (el árbol local llega a D-377 y, al 2026-10-08, el remoto traía commits que este árbol no tenía).
