# Tareas: idiomas del panel Seller (ticket cd CMNdBkVZXgYoOCvqfGZc, D-532)

> Reglas para todas las tareas:
>
> - Leer cada archivo antes de editarlo y hacer `git pull --rebase` al empezar. Nada de cambios a ciegas.
> - **Solo textos** (`design.md`, D9): ningún bloque cambia columnas, filtros, eventos, modales, servicios, validaciones, rutas, estilos ni datos guardados. Si hace falta cambiar comportamiento, va en otro cambio con su spec.
> - Toda tarea de código cierra con `npx tsc --noEmit -p tsconfig.app.json` sin errores y, al cierre de cada bloque, con `npm run i18n:check`, `npm run test:i18n` y `npm run build:prod` sin errores. No se avanza con el build roto. Revisar después el diff de `environment.ts` y `environment.prod.ts` (el build sube la versión).
> - Cada bloque sale en sus propios commits, con el sello de bloque en el mensaje (`IDI-B00` … `IDI-B12`) y la bitácora de `CONTRACT.md` al día.
> - **[S] sensible:** pantallas de pedidos, POS, inventario o despachos. Diff aprobado por Daniel antes de unirse, un bloque a la vez. **Nunca lleva `[P]`.**
> - `[P]`: se puede hacer en paralelo porque no comparte archivos con otra `[P]`.
> - Ninguna tarea escribe en Firestore salvo 1.15 y 14.2, que van con `--dry-run` primero y orden de Daniel. Ninguna prueba llama a `back.katuq.com` con escrituras.
> - Las pruebas manuales que crean datos (pedidos, ventas POS, ajustes, sitios) se hacen en la empresa de prueba de 1.15, nunca en un comercio real ni en OH MY STORE.
> - Los tickets de Support solo se leen desde los agentes. Comentarlos o cerrarlos lo hace la persona que Daniel indique.
> - Backend: trabajar en `wt-back-tickets-web` y leer antes sus instrucciones (`AGENTS.md`/`CLAUDE.md` del backend).

## 0. Aprobación y apertura

- [x] **0.1 Decisión de fondo.** Daniel, 2026-10-21: «Base + módulo por módulo». Aprueba las recomendaciones 1 a 9 del informe (`proposal.md`, «Aprobación (2026-10-21)»).
- [x] **0.2 Aprobar los artefactos.** Daniel aprueba `design.md`, las specs `seller-language` y `seller-translation-coverage`, este `tasks.md` y la asignación de carpetas de `design.md` D10.
  - Criterio: aprobación anotada en `CONTRACT.md` bajo el D-532. Sin 0.2 no hay código (Art. I).
  - Dependencias: 0.1.
  - **Hecho:** aprobados en bloque por Daniel el 2026-10-21, incluida la asignación de carpetas de D10 tal como está escrita. Cada pregunta abierta se resuelve con la recomendación escrita. Anotado en D-532.
- [x] **0.3 Asentar la decisión.** D-532 en `specs/CONTRACT.md` con fecha, la cita del ticket por su `cd` (no «1231», que D-446 ya usa), las recomendaciones aprobadas, la excepción acotada al Art. IX y la bandera temporal `appLanguagePreviewCompanies` (dueño Daniel, retiro al publicar de-CH o el 2027-06-30). Número: el siguiente libre en `feature/tickets-web` (hoy sería D-532; D-520 a D-529 están reservados para la rama principal). Verificar que nadie lo tomó antes de escribirlo.
  - Dependencias: 0.2.
  - **Hecho (2026-10-21):** `grep -oE "D-5[0-9]{2}" specs/CONTRACT.md | sort -u` daba como último D-531; D-532 estaba libre y quedó asentado con su línea de bitácora.
- [ ] **0.4 Preguntar a Jairo para quién es el alemán.** Qué comercio o mercado en Suiza y qué módulos usa. La respuesta fija el orden de la revisión nativa (sección 14), no el de los bloques.
  - Dependencias: ninguna. No bloquea el bloque base.
- [ ] **0.5 Revisor nativo de de-CH.** Daniel decide persona o agencia y aprueba el costo. Para pt-BR, solo se agenda antes de vender en Brasil.
  - Dependencias: ninguna. Bloquea solo 14.1.

## 1. Bloque base (IDI-B00)

No cambia textos de pantallas salvo las 11 claves de 1.11.

- [ ] **1.1 [P] Pruebas del catálogo (front).** `tests/i18n/app-language.test.js`, con el cargador de `tests/theme/cargar-ts.js`: cuatro idiomas con `htmlLang`; `idiomasVisibles` sin campo da `es`, `en`, `pt`; con `de` visible lo incluye; `normalizeAppLanguage('de', ['es','en','pt'])` da español; valores `fr`, `cn`, `ae` y basura dan español.
  - Criterio: falla antes de 1.6 y pasa después.
  - Dependencias: 0.2.
- [x] **1.2 [P] Prueba de contrato del login (backend).** `functions/tests/auth/visibleLanguages.contract.test.js` (Art. VIII), con Firestore simulado: `visibleLanguages` es un arreglo con `es` y solo códigos del catálogo; documento ausente o ilegible da `['es','en','pt']` y el login no falla; la empresa de prueba (sin importar mayúsculas ni espacios) recibe los cuatro; los demás campos de la respuesta no cambian.
  - Criterio: falla antes de 1.4 y pasa después.
  - Dependencias: 0.2.
  - **Hecho (IDI-B00a, 2026-10-21):** antes de tocar el login se escribió la caracterización `tests/auth/construirSesion.caracterizacion.test.js` (7/7 antes y después). La prueba de contrato daba 0/10 antes de 1.4 y 10/10 después; la corrección del bloque le sumó tres casos (arreglo vacío o sin códigos del catálogo da solo `es`, espacios internos en la empresa de prueba y lectura que no responde), 13/13. El arnés `tests/auth/_sesionHarness.js` usa una base falsa en memoria. Se corre con `npm run test:idiomas-login`.
- [ ] **1.3 [P] Pruebas de la verificación.** `tests/i18n/i18n-check.test.js` con fixtures en `tests/i18n/fixtures/`: un caso por cada fila de la tabla de D6 (error o aviso) y un caso limpio.
  - Criterio: falla antes de 1.8 y pasa después.
  - Dependencias: 0.2.
- [x] **1.4 Backend: idiomas visibles en el login.** `functions/services/appLanguages.js` (`idiomasVisibles(empresa)`) y el campo `visibleLanguages` en la respuesta de `controllers/authentication.js`. Log estructurado sin correo ni nombre si falla la lectura. Ningún otro cambio en el login.
  - Criterio: 1.2 en verde; `npm test` del backend sin regresiones en `tests/auth`.
  - Dependencias: 1.2.
  - **Hecho (IDI-B00a, 2026-10-21):** `services/appLanguages.js` es un lector independiente de `services/platformFlags.js`. El login solo suma el campo `visibleLanguages` y su `require`. En `tests/auth`, `passwordResetService.test.js` sigue en verde. `passwordResetRoutes.contract.test.js` ya fallaba antes del cambio y no es una regresión: su aserción busca `bcrypt.hash(temporaryPasswordHash, 12)` en `controllers/diagnostics.js`, que desde D-319 dice `bcrypt.hash(passwordHash, 12)` (la clave sigue guardada con bcrypt). Queda pendiente, fuera de este cambio, actualizar esa prueba con aprobación. La lectura de `config/feature_flags` tiene un tiempo límite de 2,5 s. El golden de `tests/sitios` sigue con 20/20 casos idénticos.
- [x] **1.5 Backend: script de configuración.** `functions/scripts/set-idiomas-visibles.js` con `--dry-run` (por defecto muestra el antes y el después sin escribir), `--visibles es,en,pt[,de]` y `--prueba <empresa>[,<empresa>]`. Solo escribe esos dos campos de `config/feature_flags` con `merge`.
  - Criterio: la corrida con `--dry-run` imprime el documento actual y el resultado; no se ejecuta contra producción en esta tarea.
  - Dependencias: 1.4.
  - **Hecho (IDI-B00a, 2026-10-21):** se probó con Firestore simulado (`tests/auth/setIdiomasVisibles.test.js`, 6/6). Sin `--execute` no escribe. Con `--execute` escribe solo los campos pedidos, con `merge`. `--prueba ninguna` vacía la lista, que es el interruptor de emergencia. No se corrió contra ninguna base real.
- [ ] **1.6 Front: catálogo y selector.** `app-language.utils.ts` (entrada `de`, `htmlLang`, tipo de `code`, `idiomasVisibles`, `normalizeAppLanguage(valor, visibles)`), `languages.component.{ts,html}` (lista filtrada; `<html lang>` con `htmlLang`), `app.component.ts` (`addLangs(['es','en','pt','de'])`, idioma con los visibles) y el punto del `auth.service` que aplica el idioma al entrar. El selector sigue guardando con `updateUser` y conserva la relectura del `user` de D-502.
  - Criterio: 1.1 en verde; `npm run test:theme` sigue en verde (`user-writers` cubre el selector); tsc sin errores.
  - Dependencias: 1.1, 1.4.
- [ ] **1.7 [P] Front: retirar restos.** Borrar `src/assets/i18n/fr.json`; confirmar con `grep` que nada carga `fr`, `cn` ni `ae`.
  - Dependencias: 0.2.
- [ ] **1.8 Front: `npm run i18n:check`.** `scripts/i18n-check.js` y `scripts/i18n-check.config.json` según D6; scripts `i18n:check` y `test:i18n` (`node --test tests/i18n/app-language.test.js tests/i18n/i18n-check.test.js`, archivos uno por uno para que corra en Windows).
  - Criterio: 1.3 en verde. Primera corrida guardada como línea base en esta tarea (errores y avisos por tipo).
  - Dependencias: 1.3.
- [ ] **1.9 Front: textos de PrimeNG.** `src/app/shared/services/i18n/primeng-i18n.service.ts` (D5), arrancado una vez en `app.component.ts`, y el objeto `primeng` en `es.json`, `en.json` y `pt.json` (solo textos; sin `dateFormat` ni `firstDayOfWeek`).
  - Criterio: en el navegador, un calendario y un filtro de tabla de Todos los pedidos aparecen en español, inglés y portugués al cambiar de idioma, sin recargar.
  - Dependencias: 1.6.
- [ ] **1.10 Front: completar `en.json` y `pt.json`.** Agregar las 11 claves que faltan en `en` y las 17 de `pt`; traducir los 34 valores de `en` y los 94 de `pt` que siguen en español, salvo los de la lista permitida. Las claves sobrantes (en `en`/`pt` y no en `es`) solo se reportan: se borran en el bloque de su módulo.
  - Criterio: `i18n:check` sin errores de claves faltantes en `en` y `pt`; avisos de «igual al español» solo en la lista permitida.
  - Dependencias: 1.8.
- [ ] **1.11 [S] Front: corregir las 11 claves con faltas de `es.json`.** «Generar Facturación Electrónica», «Dirección de facturación seleccionada:», «Usar esta dirección», «Los datos de facturación electrónica…», «Cantidad mínima de venta:», «Acción», «Ecommerce/Configuración catálogo/adiciones», «Conoce tu código postal», «Número de teléfono fijo», «Horarios de disponibilidad página web», «Nombres/Razón social». Se renombran a la vez en los cuatro diccionarios y en cada plantilla o `.ts` que las use (hoy en `pos-pedido-facturacion`, `pedido-facturacion`, `pos-crear-ventas`, `conf-product-to-cart` y `crear-empresa`, entre otros: buscar con `grep -F`). **Excepción D3:** si una clave es título del menú o valor que se guarda o compara, no se renombra: se corrige solo su valor en `es.json`.
  - Criterio: `i18n:check` sin claves usadas que falten; las pantallas afectadas muestran el texto corregido en español y la misma traducción en `en`/`pt`. Diff aprobado por Daniel (toca plantillas de POS y ventas).
  - Dependencias: 1.10.
- [ ] **1.12 Front: claves `comun.*`.** Crear los textos repetidos (Guardar, Cancelar, Aceptar, Cerrar, Buscar, Eliminar, Editar, Sí, No, Cargando…, Sin resultados) en los cuatro diccionarios. No se cambia ninguna plantilla en esta tarea.
  - Dependencias: 1.8.
- [ ] **1.13 Backend: borrador con Opttia.** `functions/scripts/i18n-borrador.js` y `services/ai/prompts/traduccionPanelPrompt.js` según D8. Primera corrida con `--dry-run`.
  - Criterio: con `--dry-run` cuenta las claves y muestra el primer lote sin llamar a Opttia; con un lote real de 20 claves devuelve JSON con las mismas variables y sin «ß». No escribe en Firestore ni imprime el token.
  - Dependencias: 0.2.
- [ ] **1.14 Front: `de.json` en borrador.** Todas las claves de `es.json` (incluidos `primeng` y `comun.*`) con 1.13 y el glosario de D7, revisadas por quien hace el bloque. Anotar en esta tarea: «borrador, sin revisión nativa».
  - Criterio: `i18n:check` sin errores para `de`.
  - Dependencias: 1.11, 1.12, 1.13.
- [ ] **1.15 Configuración de prueba (Firestore, por orden de Daniel).** Con 1.5: `--dry-run` primero; luego `visibleAppLanguages: ['es','en','pt']` y `appLanguagePreviewCompanies: ['Julsmind']` (o la empresa que indique Daniel).
  - Criterio: un usuario de Julsmind ve «Deutsch (CH)» tras entrar; un usuario de FLORECER no.
  - Dependencias: 1.4 desplegado, 1.6, 1.14.
- [ ] **1.16 Cierre del bloque base.** tsc, `i18n:check`, `test:i18n`, `test:theme`, pruebas del backend y `build:prod` en verde. En el navegador, a 1440 y 390 px: selector con tres idiomas para un comercio y cuatro para la empresa de prueba; cambiar de idioma sin recargar; recargar conserva el idioma; cerrar sesión deja el login en español. Bitácora en `CONTRACT.md`.
  - Dependencias: 1.1 a 1.15.

## Bloques de módulo: receta común

Cada bloque `IDI-B0x` sigue los mismos siete pasos (`design.md`, D3, D4 y D9) sobre las carpetas de su fila en D10:

1. **Línea base:** `npm run i18n:check -- --modulo <carpetas>`; anotar en la tarea cuántos textos sueltos hay en HTML y en `Swal`/`toastr`/`messageService`.
2. **HTML:** textos, atributos (`placeholder`, `title`, `aria-label`, `pTooltip`, `label`, `header`) y estados vacíos al pipe `translate`, con claves `<prefijo>.*` o `comun.*`. Columnas y opciones definidas en el `.ts` guardan la clave y la plantilla la traduce.
3. **TypeScript:** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant(clave, params)`, solo dentro de manejadores y respuestas. Los mensajes del servidor quedan como llegan. Ningún valor que se guarde, se compare o se envíe cambia.
4. **Ortografía:** tildes, mayúsculas y puntuación del español en los valores de `es.json`.
5. **Traducciones:** `en` y `pt` revisadas por quien hace el bloque; `de` en borrador con 1.13 y el glosario. Borrar las claves literales antiguas que el módulo ya no usa, en los cuatro diccionarios.
6. **Cerrar el módulo:** agregarlo a los módulos cerrados de `scripts/i18n-check.config.json`. `i18n:check` (cero textos sueltos en el módulo), tsc, `test:i18n` y `build:prod` en verde.
7. **Revisión «solo textos»** (D9): diff solo en `.html`, `.ts` del módulo y diccionarios; en el navegador, en `es` y `en` a 1440 y 390 px, ninguna clave cruda ni texto desbordado; `de` con la empresa de prueba. Commit con el sello del bloque y bitácora.

Tamaños medidos el 2026-10-21 (plantillas / con pipe / mensajes en TS) para dimensionar cada bloque.

## 2. IDI-B01 Shell: encabezado, menú, perfil, notificaciones e inicio

Carpetas de D10. `shared` tiene 58 plantillas (5 con pipe) y 136 mensajes; `notificaciones` 11/1/32; `dashboard` 4/1/21. Menú: 153 títulos, 119 sin traducción en `en.json`.

- [ ] **2.1 Línea base** (receta, paso 1).
- [ ] **2.2 Menú.** Los 153 títulos de `nav.service.ts` siguen siendo claves literales (excepción D3: favoritos, secciones plegadas y `item.title === "Mensajes"` usan el título). Se agregan a los cuatro diccionarios y se corrige su ortografía solo en el valor de `es.json`. Los `aria-label` armados por concatenación del sidebar (`'Ir a ' + …`) pasan a claves con parámetro. `badgeValue: "Próximamente"` se traduce al mostrarse, no en el dato.
  - Criterio: con el panel en inglés, todo el menú visible está en inglés; favoritos y secciones plegadas se conservan al cambiar de idioma.
- [ ] **2.3 HTML** del encabezado, perfil (`usuarios/edit-profile`), notificaciones e inicio (receta, paso 2).
- [ ] **2.4 Mensajes en TS** (receta, paso 3), incluido el aviso «Tienes notificaciones pendientes» de `app.component.ts`.
- [ ] **2.5 Ortografía** (receta, paso 4).
- [ ] **2.6 Traducciones en/pt/de** (receta, paso 5).
- [ ] **2.7 Cierre:** `i18n:check`, tsc, `test:i18n`, `test:theme`, `build:prod` y revisión (receta, pasos 6 y 7).
- [ ] **2.8 Decidir si `i18n:check` pasa al `predeploy`.** Propuesta a Daniel con el tiempo que tarda y los avisos que quedan. Si aprueba, se agrega en el mismo commit.
  - Dependencias de 2.x: bloque base cerrado (1.16).

## 3. IDI-B02 Páginas públicas

`pages/authentication` 13/1/12, `change-password`, `payment-callback`, `subscription-callback`, `terms-conditions`, `privacy-policy`, `pricing`, `shared/components/{publica,page-not-found}`. Sin sesión no hay preferencia: se ven en español hasta que llegue el idioma por empresa (Ola 0). Las que se ven con sesión (cambio obligatorio de contraseña, resultados de pago y suscripción) sí cambian. El texto legal de términos y privacidad no se traduce en este bloque (es un documento legal; su versión en otro idioma la decide Daniel aparte).

- [ ] **3.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **3.2 HTML** (con la base `publica` de D-398). Textos y atributos al pipe `translate` con claves `authentication.*`, `publica.*` o `comun.*` (receta, paso 2).
- [ ] **3.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **3.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **3.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **3.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **3.7 Revisión «solo textos»** (receta, paso 7) y commit.
  - Dependencias: 2.7.

## 4. IDI-B03 Ventas [S]

`ventas` 49/24/297 y `proceso` 16/6/70: venta asistida, todos los pedidos, checkout, entrega y facturación, canales, combos, descuentos, géneros, ocasiones y tipos de cliente. No se traducen estados del pedido, `typeOrder`, `formaEntrega` ni ningún valor que viaje a `/v1/orders/*` o a la facturación electrónica: solo su etiqueta.

- [ ] **4.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **4.2 HTML.** Textos y atributos al pipe `translate` con claves `ventas.*`, `proceso.*` o `comun.*` (receta, paso 2).
- [ ] **4.3 Mensajes en TS** (`crear-ventas` y su facturación automática: solo textos de los diálogos). `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **4.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **4.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **4.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **4.7 Revisión «solo textos»** (receta, paso 7), diff aprobado por Daniel y commit. Prueba manual: crear un pedido en inglés y comparar el documento guardado con uno creado en español.
  - Dependencias: 2.7. Uno a la vez con los demás [S].

## 5. IDI-B04 POS [S]

`pos` 12/4/57 y `extras` 6/5/26 (formas de pago, configuración del POS, zonas de cobro).

- [ ] **5.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **5.2 HTML.** Textos y atributos al pipe `translate` con claves `pos.*`, `extras.*` o `comun.*` (receta, paso 2).
- [ ] **5.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **5.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **5.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **5.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **5.7 Revisión «solo textos»** (receta, paso 7), diff aprobado por Daniel y commit. Prueba manual: una venta POS en portugués con descuento de inventario igual que en español.
  - Dependencias: 4.7.

## 6. IDI-B05 Clientes y CRM

`crm` 4/1/59, `prospect-manager` 1/0/33 y los formularios de cliente de `shared` (incluido el formulario único de cliente, que ya trae EN/PT: se conservan sus claves).

- [ ] **6.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **6.2 HTML.** Textos y atributos al pipe `translate` con claves `crm.*`, `prospectManager.*` o `comun.*` (receta, paso 2).
- [ ] **6.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **6.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **6.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **6.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **6.7 Revisión «solo textos»** (receta, paso 7) y commit.
  - Dependencias: 2.7.

## 7. IDI-B06 Productos, catálogo y listas de precios

`productos` 7/3/105, `ecomerce` 4/3/21, `lista-precios` 7/0/44 y `dropshipping` 6/1/20. Solo textos del panel: no se traducen nombres, descripciones ni categorías de productos, ni nada que se publique en la tienda o en Shopify.

- [ ] **7.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **7.2 HTML.** Textos y atributos al pipe `translate` con claves `productos.*`, `ecomerce.*`, `listaPrecios.*`, `dropshipping.*` o `comun.*` (receta, paso 2).
- [ ] **7.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **7.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **7.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **7.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **7.7 Revisión «solo textos»** (receta, paso 7) y commit.
  - Dependencias: 2.7.

## 8. IDI-B07 Inventarios [S]

`inventarios` 21/5/166 y `compras` 2/0/12. Write-set del bloque: ninguno (solo textos). No cambian `inventory`, `inventoryMovement`, `products`, precios ni la publicación a Shopify; los motivos de movimiento que se guardan no se traducen.

- [ ] **8.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **8.2 HTML.** Textos y atributos al pipe `translate` con claves `inventarios.*`, `compras.*` o `comun.*` (receta, paso 2).
- [ ] **8.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **8.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **8.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **8.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **8.7 Revisión «solo textos»** (receta, paso 7), diff aprobado por Daniel y commit. Prueba manual: un ajuste en inglés deja el mismo movimiento que en español.
  - Dependencias: 5.7. Uno a la vez con los demás [S].

## 9. IDI-B08 Despachos y picking [S]

`despachos` 23/11/242, `picking-packing` 4/0/6, `formas-entrega` 7/6/8, `tiempos-entrega` 2/2/4 y `produccion` 4/1/21. Los estados del despacho y los textos que viajan a transportadoras o a WhatsApp no se traducen.

- [ ] **9.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **9.2 HTML.** Textos y atributos al pipe `translate` con claves `despachos.*`, `pickingPacking.*`, `formasEntrega.*`, `tiemposEntrega.*`, `produccion.*` o `comun.*` (receta, paso 2).
- [ ] **9.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **9.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **9.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **9.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **9.7 Revisión «solo textos»** (receta, paso 7), diff aprobado por Daniel y commit.
  - Dependencias: 8.7.

## 10. IDI-B09 Cotizaciones

`cotizaciones` 4/0/72. Solo el panel: la cotización pública y su PDF siguen en español (Ola 0).

- [ ] **10.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **10.2 HTML.** Textos y atributos al pipe `translate` con claves `cotizaciones.*` o `comun.*` (receta, paso 2).
- [ ] **10.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **10.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **10.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **10.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **10.7 Revisión «solo textos»** (receta, paso 7) y commit.
  - Dependencias: 2.7.

## 11. IDI-B10 Facturación electrónica, cartera y tesorería

`facturacion-electronica` 7/0/40, `cartera` 3/0/1, `tesoreria` 7/0/14, `contabilidad` 1/0/13 y `billing` 1/1/0. No se traduce nada que viaje a DIAN, Siigo o World Office (conceptos, notas, consecutivos): solo la pantalla.

- [ ] **11.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **11.2 HTML.** Textos y atributos al pipe `translate` con claves `facturacionElectronica.*`, `cartera.*`, `tesoreria.*`, `contabilidad.*`, `billing.*` o `comun.*` (receta, paso 2).
- [ ] **11.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **11.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **11.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **11.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **11.7 Revisión «solo textos»** (receta, paso 7) y commit. Prueba manual: con el envío interceptado (sin emitir), comparar lo que se mandaría a DIAN, Siigo o World Office en inglés y en español: debe ser idéntico.
  - Dependencias: 2.7.

## 12. IDI-B11 Sitios y editor

`sitios` 6/0/142. Solo los textos del editor y de las pantallas del panel. Los textos por defecto de bloques y plantillas que terminan en la tienda del comercio no se traducen (los ve el comprador).

- [ ] **12.1 Línea base.** `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **12.2 HTML.** Textos y atributos al pipe `translate` con claves `sitios.*` o `comun.*` (receta, paso 2).
- [ ] **12.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **12.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **12.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **12.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **12.7 Revisión «solo textos»** (receta, paso 7) y commit. Prueba manual: publicar un sitio con el panel en inglés deja la tienda igual que antes.
  - Dependencias: 2.7.

## 13. IDI-B12 Integraciones, onboarding, flows, NPS, agenda, en-vivo, superadmin y resto

`integrations` 15/0/56, `onboarding` 17/0/112, `flows` 6/0/29, `nps` 6/0/22, `agenda` 4/0/10, `en-vivo` 46/0/2, `superadmin` 1/0/9, más `empresas` 10/4/56, `rol`, `usuarios`, `maestros`, `soporte`, `katuq-flow`, `centro-operaciones`, `kuvo`, `chat`, `provider-dashboard`, `diagnostic-survey` y los asistentes de `shared` (D10). Por tamaño puede salir en sub-bloques (`IDI-B12a`, `b`…) con la misma receta, uno por carpeta grande. Las respuestas de Opttia y KAI no se traducen: llegan del asistente.

- [ ] **13.1 Línea base y partición en sub-bloques** (anotada aquí). `npm run i18n:check -- --modulo <carpetas>`; anotar aquí los conteos (receta, paso 1).
- [ ] **13.2 HTML.** Textos y atributos al pipe `translate` con claves una por carpeta (`integrations.*`, `onboarding.*`, `flows.*`, `nps.*`, `agenda.*`, `enVivo.*`, `superadmin.*`…) o `comun.*` (receta, paso 2).
- [ ] **13.3 Mensajes en TS.** `Swal.fire`, `toastr.*` y `messageService.add` a `translate.instant` (receta, paso 3).
- [ ] **13.4 Ortografía.** Tildes, mayúsculas y puntuación del español en `es.json` (receta, paso 4).
- [ ] **13.5 en/pt/de.** `en` y `pt` revisadas; `de` en borrador con Opttia; borrar claves literales que el módulo ya no usa (receta, paso 5).
- [ ] **13.6 Cierre.** Módulo en la lista de cerrados; `npm run i18n:check` con cero textos sueltos, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y `npm run build:prod` sin errores (receta, paso 6).
- [ ] **13.7 Revisión «solo textos»** (receta, paso 7) y commit por sub-bloque.
  - Dependencias: 2.7.

## 14. Publicar de-CH

- [ ] **14.1 Revisión nativa registrada.** El revisor de 0.5 revisa, con la empresa de prueba, el glosario de D7, el shell (IDI-B01), las páginas públicas (IDI-B02) y los módulos del comercio de 0.4. Sus correcciones entran a `de.json` en un commit. Anotar aquí fecha, responsable y bloques revisados.
  - Dependencias: 0.4, 0.5, 2.7, 3.7 y los bloques de los módulos del comercio.
- [ ] **14.2 Habilitar (Firestore, por orden de Daniel).** Con 1.5: `--dry-run` y luego `visibleAppLanguages: ['es','en','pt','de']`.
  - Criterio: un usuario de un comercio cualquiera ve «Deutsch (CH)» tras entrar. Interruptor de emergencia probado: quitar `de` lo oculta en el siguiente inicio de sesión y el usuario ve español.
  - Dependencias: 14.1.
- [ ] **14.3 Retirar la bandera temporal (Art. XII).** Quitar `appLanguagePreviewCompanies` del documento y su lectura en `services/appLanguages.js` (y de la prueba 1.2), al publicar de-CH o el 2027-06-30, lo que pase primero. Registrar en `CONTRACT.md`.
  - Dependencias: 14.2 o la fecha.
- [ ] **14.4 pt-BR (recomendación, sin fecha).** Revisión nativa del portugués antes de vender en Brasil, con la misma mecánica de 14.1.

## 15. Cierre del paraguas

- [ ] **15.1** Los doce bloques y la sección 14 cerrados o, si Daniel lo decide, los pendientes pasados a un cambio nuevo con su motivo.
- [ ] **15.2** `/opsx:archive`: consolidar `seller-language` y `seller-translation-coverage` en `openspec/specs/`.
- [ ] **15.3** Bitácora final en `CONTRACT.md` y resolución del ticket `CMNdBkVZXgYoOCvqfGZc` con el detalle técnico, por la persona que Daniel indique.
