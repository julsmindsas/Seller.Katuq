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

- [x] **1.1 [P] Pruebas del catálogo (front).** `tests/i18n/app-language.test.js`, con el cargador de `tests/theme/cargar-ts.js`: cuatro idiomas con `htmlLang`; `idiomasVisibles` sin campo da `es`, `en`, `pt`; con `de` visible lo incluye; `normalizeAppLanguage('de', ['es','en','pt'])` da español; valores `fr`, `cn`, `ae` y basura dan español.
  - Criterio: falla antes de 1.6 y pasa después.
  - Dependencias: 0.2.
  - **Hecho (IDI-B00b, 2026-10-21):** escrita antes de 1.6: 18 de 26 casos en rojo; las 8 que pasaban fijan lo que no debía cambiar (cadena u objeto `{code}`, copia del catálogo, plantilla del selector). Después de 1.6, 26/26. Cubre también el selector (lista filtrada, `<html lang>` con `htmlLang`, un idioma oculto no llama `updateUser` ni toca `localStorage`), `auth.setLanguage` con los visibles del login y `SignOut` en español.
- [x] **1.2 [P] Prueba de contrato del login (backend).** `functions/tests/auth/visibleLanguages.contract.test.js` (Art. VIII), con Firestore simulado: `visibleLanguages` es un arreglo con `es` y solo códigos del catálogo; documento ausente o ilegible da `['es','en','pt']` y el login no falla; la empresa de prueba (sin importar mayúsculas ni espacios) recibe los cuatro; los demás campos de la respuesta no cambian.
  - Criterio: falla antes de 1.4 y pasa después.
  - Dependencias: 0.2.
  - **Hecho (IDI-B00a, 2026-10-21):** antes de tocar el login se escribió la caracterización `tests/auth/construirSesion.caracterizacion.test.js` (7/7 antes y después). La prueba de contrato daba 0/10 antes de 1.4 y 10/10 después; la corrección del bloque le sumó tres casos (arreglo vacío o sin códigos del catálogo da solo `es`, espacios internos en la empresa de prueba y lectura que no responde), 13/13. El arnés `tests/auth/_sesionHarness.js` usa una base falsa en memoria. Se corre con `npm run test:idiomas-login`.
- [x] **1.3 [P] Pruebas de la verificación.** `tests/i18n/i18n-check.test.js` con fixtures en `tests/i18n/fixtures/`: un caso por cada fila de la tabla de D6 (error o aviso) y un caso limpio.
  - Criterio: falla antes de 1.8 y pasa después.
  - Dependencias: 0.2.
  - **Hecho (IDI-B00c, 2026-10-21):** escrita antes de 1.8: 22 de 23 en rojo (la que pasaba, «con errores la salida es 1», pasaba porque `node` sale con 1 si falta el script; se le agregó que la salida nombre el error). Después de 1.8, 23/23. Fixtures (`tests/i18n/fixtures/<caso>/src/...` y `config.json`): `limpio`, `json-invalido`, `clave-duplicada` (también dentro de `primeng`), `clave-faltante` (en, pt y una anidada en de), `variables`, `eszett`, `clave-inexistente` (pipe, ternario entre paréntesis, `instant`, `get`, `stream`, arreglo de `get`; `form.get('x')` no cuenta y una plantilla con `${}` da aviso de clave dinámica), `texto-suelto` (el mismo componente en un módulo cerrado, uno abierto y uno fuera de alcance: nodos de texto, interpolaciones, atributos de D4 estáticos y enlazados, `Swal.fire` por objeto y por posición, `toastr`, `toastrService`, `messageService.add`; no cuentan iconos, `severity`, clases, argumentos de pipes como `date:'short'`, literales comparados ni nombres propios), `avisos` y `sin-de`. Cubre también las salidas 0, 1 y 2, `--modulo` por carpeta, nombre y bloque, `--json`, la configuración del repo, los scripts de `package.json` sin `prebuild`/`predeploy`, y que el repo real se revisa en menos de 30 s.
- [x] **1.4 Backend: idiomas visibles en el login.** `functions/services/appLanguages.js` (`idiomasVisibles(empresa)`) y el campo `visibleLanguages` en la respuesta de `controllers/authentication.js`. Log estructurado sin correo ni nombre si falla la lectura. Ningún otro cambio en el login.
  - Criterio: 1.2 en verde; `npm test` del backend sin regresiones en `tests/auth`.
  - Dependencias: 1.2.
  - **Hecho (IDI-B00a, 2026-10-21):** `services/appLanguages.js` es un lector independiente de `services/platformFlags.js`. El login solo suma el campo `visibleLanguages` y su `require`. En `tests/auth`, `passwordResetService.test.js` sigue en verde. `passwordResetRoutes.contract.test.js` ya fallaba antes del cambio y no es una regresión: su aserción busca `bcrypt.hash(temporaryPasswordHash, 12)` en `controllers/diagnostics.js`, que desde D-319 dice `bcrypt.hash(passwordHash, 12)` (la clave sigue guardada con bcrypt). Queda pendiente, fuera de este cambio, actualizar esa prueba con aprobación. La lectura de `config/feature_flags` tiene un tiempo límite de 2,5 s. El golden de `tests/sitios` sigue con 20/20 casos idénticos.
- [x] **1.5 Backend: script de configuración.** `functions/scripts/set-idiomas-visibles.js` con `--dry-run` (por defecto muestra el antes y el después sin escribir), `--visibles es,en,pt[,de]` y `--prueba <empresa>[,<empresa>]`. Solo escribe esos dos campos de `config/feature_flags` con `merge`.
  - Criterio: la corrida con `--dry-run` imprime el documento actual y el resultado; no se ejecuta contra producción en esta tarea.
  - Dependencias: 1.4.
  - **Hecho (IDI-B00a, 2026-10-21):** se probó con Firestore simulado (`tests/auth/setIdiomasVisibles.test.js`, 6/6). Sin `--execute` no escribe. Con `--execute` escribe solo los campos pedidos, con `merge`. `--prueba ninguna` vacía la lista, que es el interruptor de emergencia. No se corrió contra ninguna base real.
- [x] **1.6 Front: catálogo y selector.** `app-language.utils.ts` (entrada `de`, `htmlLang`, tipo de `code`, `idiomasVisibles`, `normalizeAppLanguage(valor, visibles)`), `languages.component.{ts,html}` (lista filtrada; `<html lang>` con `htmlLang`), `app.component.ts` (`addLangs(['es','en','pt','de'])`, idioma con los visibles) y el punto del `auth.service` que aplica el idioma al entrar. El selector sigue guardando con `updateUser` y conserva la relectura del `user` de D-502.
  - Criterio: 1.1 en verde; `npm run test:theme` sigue en verde (`user-writers` cubre el selector); tsc sin errores.
  - Dependencias: 1.1, 1.4.
  - **Hecho (IDI-B00b, 2026-10-21):** caracterización antes y después: `test:theme` 27 en verde y 1 TODO previo (azul heredado de `dark-mode.scss`), igual en las dos corridas; `tests/onboarding/spanish-default.test.js` OK (su aserción sobre la línea del login se actualizó al nuevo llamado con `result.visibleLanguages`). `languages.component.html` no necesitó cambios: ya recorre `languages`, que ahora sale de los visibles. `guardarLenguaje` y la relectura de D-502 quedan iguales. La respuesta del login se sigue guardando completa en `localStorage['user']` (con `visibleLanguages`); como hoy, `lang` se guarda ahí ya normalizado, pero `users.lang` en el backend no se toca. Al elegir idioma, `users.lang` conserva la forma de antes (`{language, code, type, icon}`): `htmlLang` se deriva del `code` y no se guarda (`idiomaParaGuardar`, cubierto en 1.1). tsc sin errores.
- [x] **1.7 [P] Front: retirar restos.** Borrar `src/assets/i18n/fr.json`; confirmar con `grep` que nada carga `fr`, `cn` ni `ae`.
  - Dependencias: 0.2.
  - **Hecho (IDI-B00b, 2026-10-21):** `fr.json` borrado y `addLangs` reducido a `es`, `en`, `pt`, `de`. `grep` de `'fr'`, `'cn'`, `'ae'` en `src/app`, `index.html` y `angular.json`: solo queda `supportedLanguages` de `modules/video-agent/adapters/apple-adapter.ts`, la configuración de un adaptador del agente de video, que no carga diccionarios del panel. Ningún código pide `i18n/fr|cn|ae.json`.
- [x] **1.8 Front: `npm run i18n:check`.** `scripts/i18n-check.js` y `scripts/i18n-check.config.json` según D6; scripts `i18n:check` y `test:i18n` (`node --test tests/i18n/app-language.test.js tests/i18n/primeng-i18n.test.js tests/i18n/i18n-check.test.js`, archivos uno por uno para que corra en Windows; `primeng-i18n.test.js` ya está en el script desde IDI-B00b y no se quita). El objeto `primeng` se revisa como claves anidadas: debe estar completo en cada diccionario (el servicio completa con español lo que falte, pero `i18n:check` lo reporta).
  - Criterio: 1.3 en verde. Primera corrida guardada como línea base en esta tarea (errores y avisos por tipo).
  - Dependencias: 1.3.
  - **Hecho (IDI-B00c, 2026-10-21):** `scripts/i18n-check.js` en Node puro, sin dependencias, y `scripts/i18n-check.config.json` (lista permitida con Email, POS, SKU, NIT y los nombres propios de D4; `prefijosDinamicos: ["primeng."]`; `modulosCerrados: []`; `fueraDeAlcance` con las carpetas públicas de D10; `bloques` con el mapa de D10). Opciones: `--modulo <carpeta|bloque>[,…]` (lista los textos sueltos con archivo y línea aunque el módulo esté abierto), `--bloques` (tabla por bloque y carpeta), `--todo`, `--json`. Mientras no exista `de.json`, su falta es un aviso (`idiomasOpcionales: ["de"]`; se quita en IDI-B00f, 1.14). El objeto `primeng` se revisa aplanado (`primeng.today`…). Un texto que no se debe traducir se marca con un comentario `i18n-ignorar` en su línea o la anterior. Scripts `i18n:check` y `test:i18n` (66/66). No se engancha a `prebuild` ni a `predeploy` (2.8). Tarda menos de 1 s sobre 1.657 archivos de `src/app`. tsc sin errores.
  - **Corrección (IDI-B00c, 2026-10-21), tras la revisión del bloque:**
    - `claveInexistente` es error solo en `modulosCerrados`; fuera es el aviso `claveInexistenteAbierta`. Así se leen juntas D3 («las claves literales antiguas siguen vigentes hasta que se migra su módulo») y D6, y cada bloque y 1.16 pueden cerrar con `i18n:check` sin errores. 1.11 sigue siendo de 11 claves: las 1.130 claves literales que faltan en `es.json` se resuelven al migrar cada módulo. **Pendiente de ratificar por Daniel**; la alternativa (error en todo `src/app`) obligaría a un relleno de `es.json` que nadie aprobó.
    - Listas separadas: `nombresPropios` (D4) sirve para las dos revisiones; `igualesPermitidos` (`todos` y por idioma) solo para «igual al español»; `textosIgnorados` solo para textos sueltos. Un cognado agregado para pt («Total») no silencia `<th>Total</th>`.
    - Detecta además: el ternario sin paréntesis antes de `| translate` (las dos ramas son claves); plantillas en línea de los `.ts`; los receptores `swal`, `toast`, `toster`, `toastService` y `notificationService`; los atributos `ngbTooltip`, `alt`, `innerHTML`, `currentPageReportTemplate`, `defaultLabel`, `selectedItemsLabel`, `emptyMessage`, `emptyFilterMessage`, `chooseLabel`, `uploadLabel`, `cancelLabel`, `acceptLabel` y `rejectLabel` (lista configurable con `atributosTexto`).
    - Configuración ilegible o fallo inesperado: salida 2, nunca 1. Fixtures con `.gitkeep` en las carpetas `cerrado/` vacías, para que pasen en un clon limpio.
    - Bloques: `auth/login` (login real, ruta `/login`) y `shared/components/change-password` pasan a IDI-B02; `components/ventas/clientes` (formularios de cliente, `clientes-shared.module`) a IDI-B05, como dice la sección 6.
    - `--modulo IDI-Bxx` y `modulosCerrados` por bloque respetan la carpeta más específica (IDI-B03 no incluye `ventas/clientes`); por carpeta incluyen todo lo de debajo.
    - Pruebas: 29/29 (`node --test tests/i18n/i18n-check.test.js`), `test:i18n` 72/72, tsc sin errores.
  - **Línea base (2026-10-21, `feature/tickets-web`, después de la corrección):** `npm run i18n:check` sale con 1 solo por las 28 claves que faltan en en/pt (1.10). Diccionarios: es 763 claves (720 + 43 de `primeng`), en 939, pt 919, de no existe. 1.657 archivos de `src/app` en menos de 1 s.
    - Errores (28): `claveFaltante` 28 (en 11, pt 17; ninguna de `primeng`). `jsonInvalido`, `claveDuplicada`, `variablesDistintas`, `eszett`, `claveInexistente` y `textoSuelto`: 0 (ningún módulo cerrado).
    - Avisos (2.257): `claveInexistenteAbierta` 1.405 usos de 1.130 claves distintas que las plantillas piden con `| translate` y no están en `es.json` (hoy se ven porque el traductor muestra la clave, que es el texto en español; cada bloque deja en cero las de su módulo); `igualAlEspanol` 154 (en 40, pt 114); `claveSobrante` 360 (en 187, pt 173); `claveSinUso` 331; `claveDinamica` 6 (claves armadas por concatenación en `zona-gestion-modal`, `diagnostic-survey`, `inventarios` y `ventas/list`); `diccionarioAusente` 1 (de).
    - Textos sueltos (informativo): 20.192 (texto 11.063, interpolación 1.579, atributo 2.651, mensaje 4.899). Por bloque (texto e interpolación HTML / atributos / mensajes TS = total): B01 459/122/114 = 695; B02 388/58/39 = 485; B03 1.216/289/1.177 = 2.682; B04 520/99/234 = 853; B05 459/125/327 = 911; B06 1.149/217/468 = 1.834; B07 775/150/400 = 1.325; B08 860/211/622 = 1.693; B09 298/51/130 = 479; B10 707/87/162 = 956; B11 1.137/203/105 = 1.445; B12 3.712/839/828 = 5.379; sin bloque 962/200/293 = 1.455.
    - Por carpeta (HTML / atributos / TS):
      - **IDI-B01**: `notificaciones` 149/29/55, `dashboard` 87/15/43, `shared/upgrade-modal` 84/13/0, `shared/sidebar` 25/29/0, `shared/header` 35/17/0, `shared/plan-selector` 29/0/6, `shared/notification-center` 20/14/0, `shared/usage-widget` 18/2/0, `usuarios/edit-profile` 3/1/10, `shared/aviso-actualizacion` 8/1/0, `shared/bottom-navigation` 0/1/0, `shared/footer` 1/0/0; `shared/breadcrumb`, `shared/loader` y `nav.service.ts` 0 (los 153 títulos del menú van por la excepción D3 de 2.2).
      - **IDI-B02**: `pages/authentication` 165/46/24, `pricing` 76/5/10, `privacy-policy` 85/0/0, `payment-callback` 19/0/0, `subscription-callback` 19/0/0, `shared/change-password` 8/3/1, `terms-conditions` 7/1/0, `auth/login` 4/2/0, `shared/page-not-found` 5/0/0, `change-password` 0/0/4, `shared/publica` 0/1/0.
      - **IDI-B03**: `ventas` (sin `ventas/clientes`) 985/244/1.006, `proceso` 231/45/171.
      - **IDI-B04**: `pos` 440/84/163, `extras` 80/15/71.
      - **IDI-B05**: `crm` 186/88/130, `ventas/clientes` 150/26/132, `prospect-manager` 123/11/65.
      - **IDI-B06**: `productos` 806/111/269, `lista-precios` 203/41/111, `dropshipping` 89/28/45, `ecomerce` 51/37/43.
      - **IDI-B07**: `inventarios` 681/143/370, `compras` 94/7/30.
      - **IDI-B08**: `despachos` 517/132/529, `produccion` 172/49/46, `picking-packing` 119/17/10, `formas-entrega` 39/9/25, `tiempos-entrega` 13/4/12.
      - **IDI-B09**: `cotizaciones` 298/51/130.
      - **IDI-B10**: `facturacion-electronica` 341/52/104, `tesoreria` 134/15/32, `contabilidad` 133/15/24, `cartera` 60/3/2, `billing` 39/2/0.
      - **IDI-B11**: `sitios` 1.137/203/105.
      - **IDI-B12**: `integrations` 1.148/208/107, `empresas` 661/172/171, `onboarding` 461/176/222, `flows` 163/38/53, `nps` 196/18/34, `en-vivo` 151/43/9, `soporte` 116/30/46, `agenda` 112/31/18, `diagnostic-survey` 134/18/0, `shared/voice-agent` 93/5/34, `katuq-flow` 69/13/26, `centro-operaciones` 70/21/13, `usuarios` 51/10/36, `rol` 47/8/31, `kuvo` 76/0/0, `provider-dashboard` 49/12/10, `superadmin` 51/3/11, `shared/opttia-chat` 20/11/0, `shared/gemini-asistant` 25/3/0, `chat` 9/18/0, `shared/katuq-intelligence` 2/0/7, `shared/voice-interaction` 7/0/0, `maestros` 1/1/0, `shared/gemini` 0.
      - **Sin bloque** (D10 no las nombra; se migran en el primer bloque que las muestra, y conviene asignarlas al planificar cada bloque): `modules/marketing` 316/40/35, `modules/agent-builder` 249/49/37, `shared/import-modal` 111/21/45, `shared/services` 0/0/128, `modules/video-agent` 77/19/14, `shared/modulo-ia` 42/2/0, `welcome` 41/0/0, `welcome/negocio-3d` 28/15/0, `shared/floating-button` 18/16/0, `shared/import-components` 17/13/0, `shared/report-viz` 16/5/0, `shared/opinar-modal` 12/3/2, `app.component.ts` 0/0/11, `shared/codigo-correo` 11/0/0, `shared/images-manager` 3/0/8, `shared/adaptive-navigation` 6/2/0, `shared/guards` 0/0/8, `shared/nps-pregunta` 5/1/0, `shared/nps-tarjeta` 1/4/0, `shared/selector-equipo` 0/5/0, `shared/utils` 0/0/5, `shared/chat-form` 2/1/0, `shared/filters` 2/1/0, `shared/escala-nps` 2/0/0, `shared/visor-imagen` 0/2/0, `loader` 1/0/0, `shared/dynamic-field` 1/0/0, `shared/maestros-status` 1/0/0, `shared/novedad-modal` 0/1/0.
    - Lectura: los textos sueltos se cuentan con heurística (sin compilar Angular): pueden colarse unidades («cm», «kg») o correos de ejemplo en `placeholder`, que se marcan con `i18n-ignorar` o se agregan a `textosIgnorados` al cerrar cada módulo. El escenario «Falta una traducción» en alemán solo se puede verificar cuando exista `de.json`: en 1.14 se quita `de` de `idiomasOpcionales` (la prueba de configuración del repo falla si `de.json` existe y `de` sigue opcional).
- [ ] **1.9 Front: textos de PrimeNG.** `src/app/shared/services/i18n/primeng-i18n.service.ts` (D5), arrancado una vez en `app.component.ts`, y el objeto `primeng` en `es.json`, `en.json` y `pt.json` (solo textos; sin `dateFormat` ni `firstDayOfWeek`).
  - Criterio: en el navegador, un calendario y un filtro de tabla de Todos los pedidos aparecen en español, inglés y portugués al cambiar de idioma, sin recargar.
  - Dependencias: 1.6.
  - **Hecho en código y pruebas (IDI-B00b, 2026-10-21):** `PrimengI18nService.iniciar()` (idempotente) pide `translate.get('primeng')` al iniciar y en cada `onLangChange`; quita `dateFormat` y `firstDayOfWeek` aunque el diccionario los traiga, ignora la clave cruda si falta el objeto y no toca las opciones de filtro de `produccion/dashboard` (`setTranslation` de PrimeNG 14 mezcla y no las pisa). Completa con el `primeng` de español cada texto que le falte al idioma activo (respaldo por texto). `tests/i18n/primeng-i18n.test.js` 17/17, con un `PrimeNGConfig` simulado que mezcla como PrimeNG 14 y detecta cualquier reasignación de `filterMatchModeOptions`. Objeto `primeng` con 43 textos en `es`, `en` y `pt`, agregado al final de cada diccionario con la sangría de cada archivo y sin tocar el resto. **Sin marcar:** falta el criterio en el navegador, que queda escrito en 1.16.
- [x] **1.10 Front: completar `en.json` y `pt.json`.** Agregar las 11 claves que faltan en `en` y las 17 de `pt`; traducir los 34 valores de `en` y los 94 de `pt` que siguen en español, salvo los de la lista permitida. Las claves sobrantes (en `en`/`pt` y no en `es`) solo se reportan: se borran en el bloque de su módulo.
  - Criterio: `i18n:check` sin errores de claves faltantes en `en` y `pt`; avisos de «igual al español» solo en la lista permitida.
  - Dependencias: 1.8.
  - **Nota de IDI-B00c (2026-10-21):** `i18n:check` cuenta 40 valores de `en` y 114 de `pt` iguales al español, no 34 y 94. La diferencia: 7 textos de `primeng` agregados en IDI-B00b (en `reject`; pt `equals`, `lt`, `before`, `apply`, `cancel`, `weekHeader`) y cognados legítimos (Total, URL, Logo, General, Marketplace). Los cognados que deban quedar iguales se agregan a `igualesPermitidos.<idioma>` del config, no a `nombresPropios`, para no silenciar textos sueltos.
  - **Hecho (IDI-B00d, 2026-10-21):** prueba nueva `tests/i18n/diccionarios.test.js`, escrita antes del cambio (9 de 13 en rojo; las 4 que pasaban fijan el formato, el tratamiento y que `de` no se exige aún). Después de la corrección, 14/14.
    - Claves: `en` suma las 11 que faltaban y `pt` las 17 (entre ellas `notificaciones.*` y «Próximamente»). Se agregaron agrupadas antes de `primeng`, en el orden de `es.json`, en en-US neutro y pt-BR con «você». `notificaciones.privacy_note_1` sigue terminando en espacio y `privacy_note_2` empieza con espacio: la plantilla pone el enlace entre las dos. «Email», «SMS» y «WhatsApp» no se traducen (D4).
    - Iguales al español: se revisaron uno por uno los 40 de `en` y los 114 de `pt`. En `en` ninguno estaba en español: son siglas, nombres técnicos o piezas de la plantilla Cuba («Ui-Kits», «Popover», «Error 404»…), ya en inglés. En `pt` se corrigieron 8 valores: «Despachos» y «Depachos» → «Envios» y «Despacho» → «Envio» (glosario de D7); «IVA 19%» → «IVA 19%:», que había perdido los dos puntos; «Número de celular WhatsApp:» → «Número de WhatsApp:»; «Planta de Fábrica» → «Planta industrial»; «Colapso» → «Recolher»; «Pegajoso» → «Fixo». «Sedes» se deja igual: ya es portugués correcto y sus hermanas dicen «Nome da Sede», «Horários das Sedes».
    - Glosario de D7 en todo el diccionario (corrección de IDI-B00d), para que un concepto tenga un solo término por idioma: en `pt`, «Despacho» → «Envio» en sus 7 valores («Ordem de envio», «Enviar a ordem», «Enviado por»…), «armazéns» → «depósitos», «Inventário» → «Estoque» (7) y «Faturação» (pt-PT) → «Faturamento» (6); en `en`, «Dispatch» → «Shipment» (9, «Despachador» → «Shipped by») y «Client» → «Customer» (6). Una prueba recorre todas las claves de `en` y `pt`, sobrantes incluidas. «Transportador» no está en el glosario y queda igual.
    - Lista permitida: el resto ya es portugués o inglés correcto e igual al español («Documento:», «Imprimir», «Cliente», «Buscar»…) y pasa a `igualesPermitidos.pt` o `.en`. Las siglas y los nombres técnicos van a `igualesPermitidos.todos` (DV, RUT, URL, PDF, JSON, Seller Center y las piezas de la plantilla). «IVA» va solo en `pt`: en de-CH el impuesto es «MWST» y el chequeo debe avisar. Corrección de IDI-B00d en `scripts/i18n-check.js`: `nombresPropios` y `todos` se quitan por palabra, pero la frase de `igualesPermitidos.<idioma>` tiene que ser el resto completo del valor (sin signos ni números). Antes, palabras cortas de la lista («de», «Tipo», «Valor») silenciaban frases enteras en español como «Valor de Pedidos»; `i18n-check.test.js` tiene un caso para eso. La prueba de diccionarios exige que cada frase de `en`, `pt` y `todos` siga en uso con la misma regla.
    - Resultado: `i18n:check` sale con 0. Quedan 0 errores y 0 `igualAlEspanol`. Avisos: `claveSobrante` 360, sin cambios. `claveSinUso` pasa de 331 a 342, por las 11 `comun.*` que todavía nadie usa. No se borró ninguna clave: es pasa de 721 a 732 claves de primer nivel, en de 897 a 919 y pt de 877 a 905.
    - Formato: UTF-8 sin BOM y sin CRLF. La sangría sigue a la de cada archivo: hoy `es.json` usa 4 espacios en las claves de primer nivel y `en.json`/`pt.json` usan 2, aunque D7 dice «sangría de 4». El final de archivo queda como hoy (`en` y `pt` con salto de línea final, `es` sin él).
    - Desvío aceptado del criterio «diff solo en `src/assets/i18n/{en,es,pt}.json»: cambian además `scripts/i18n-check.config.json` (la lista permitida, como pide la nota de IDI-B00c), `scripts/i18n-check.js` y `tests/i18n/i18n-check.test.js` (la regla de valor completo), la prueba nueva y este archivo. No cambia ningún `.html`, `.scss` ni `.ts` de `src/app`.
    - **Resuelto en IDI-B00e:** `tests/i18n/diccionarios.test.js` ya está en `test:i18n` (junto con `ortografia-claves.test.js`), y la aserción de `i18n-check.test.js` lo exige.
- [ ] **1.11 [S] Front: corregir las 11 claves con faltas de `es.json`.** «Generar Facturación Electrónica», «Dirección de facturación seleccionada:», «Usar esta dirección», «Los datos de facturación electrónica…», «Cantidad mínima de venta:», «Acción», «Ecommerce/Configuración catálogo/adiciones», «Conoce tu código postal», «Número de teléfono fijo», «Horarios de disponibilidad página web», «Nombres/Razón social». Se renombran a la vez en los cuatro diccionarios y en cada plantilla o `.ts` que las use (hoy en `pos-pedido-facturacion`, `pedido-facturacion`, `pos-crear-ventas`, `conf-product-to-cart` y `crear-empresa`, entre otros: buscar con `grep -F`). **Excepción D3:** si una clave es título del menú o valor que se guarda o compara, no se renombra: se corrige solo su valor en `es.json`.
  - Criterio: `i18n:check` sin claves usadas que falten; las pantallas afectadas muestran el texto corregido en español y la misma traducción en `en`/`pt`. Diff aprobado por Daniel (toca plantillas de POS y ventas).
  - Dependencias: 1.10.
  - **Implementado (IDI-B00e, 2026-10-21); sin marcar hasta que Daniel apruebe el diff (bloque [S]) y hasta que `de.json` (1.14) nazca con las claves corregidas.**
    - **Diccionarios `es`, `en` y `pt`:** las 11 claves viejas ya no existen. Ocho se renombraron en su misma línea, con el valor de `en`/`pt` intacto y en `es` el texto corregido. Tres claves corregidas ya existían («Generar Facturación Electrónica», «Los datos de facturación electrónica son iguales a los del cliente», «Número de teléfono fijo»). En esos casos se borró la vieja y la corregida queda con la traducción que el usuario veía: en `en`, «Los datos de facturación electrónica…» vuelve a «Electronic billing data are same as the customer's» (corrección de la revisión: la corregida traía otro texto y cambiaba la pantalla). Única excepción, sin efecto visible: `pt` de «Número de teléfono fijo» conserva «Número de telefone fixo», porque ninguna pantalla pide esa clave ni la vieja.
    - **Plantillas:** solo `ventas/facturacion/pedido-facturacion.component.html:110, 209 y 327` pedían una clave vieja al traductor. `git diff -w` muestra únicamente el literal de la clave.
    - **D3:** ninguna de las 11 es título del menú, ruta ni valor que se guarde o se compare. «Ecommerce/Configuración catálogo/adiciones» y «Horarios de disponibilidad página web» no aparecen en `nav.service.ts` ni en ningún `.ts`. El único literal en `.ts` es el `header: "Acción"` de `despachos/generar-orden`, que solo se muestra: la visibilidad se compara por `field`.
    - **Caracterización de `pedido-facturacion`, antes y después:** cambian solo tres textos.
      - `es` de 209 y 327 pasa de «Conoce Tu Código Postal» a «Conoce tu código postal».
      - `en` de 110 no cambia: sigue «Electronic billing data are same as the customer's» (mejorar el inglés queda para IDI-B03, con su propio diff).
      - Además, `despachos/generar-orden.html:288` («Acción») y `ventas/catalogo/conf-product-to-cart.html:986` («Cantidad mínima de venta:») ya pedían la clave corregida y no la encontraban. Ahora tienen traducción.
    - **`i18n:check`:** 0 errores; avisos de 2.114 a 2.107 (`claveInexistenteAbierta` 1.405 → 1.403, `claveSinUso` 342 → 337).
    - **Prueba:** `tests/i18n/ortografia-claves.test.js` (10 casos en la primera versión, 9 en rojo antes del cambio).
    - **Textos escritos directo en la plantilla (corrección de la revisión):** los mismos textos, sin el traductor, se corrigen en el sitio para que la pantalla muestre la ortografía buena; solo cambia el literal (`git diff -w`). La extracción a clave sigue en el bloque de cada módulo.
      - `pos/pos-facturacion/pos-pedido-facturacion.html:12, 27, 73, 180 y 300`; `pos/pos-crear-ventas.html:340 y 459`; `pos/pos-catalogo/conf-product-to-cart.html:22` (extracción en IDI-B04).
      - `ventas/entrega/pedido-entrega.html:1212` (IDI-B03a).
      - `empresas/crearEmpresa/crear-empresa.html:207-208, 463-464, 670-671 y 824` (IDI-B12d).
      - `despachos/dispatch-rules-config.html:181 y 258` (IDI-B08b) y `integrations/shopify-dashboard/sync-logs.component.html:67` (IDI-B12a), «Accion» → «Acción».
      - Queda sin tocar `shared/components/import-modal.component.ts:645`, `header: 'Nombre/Razon Social'`: no es una de las 11 claves y es la cabecera de una columna del importador que se usa para mapear columnas (D3). Lo recoge IDI-B12b (importador).
    - **Prueba:** `ortografia-claves.test.js` (11 casos) ya está en `test:i18n`. Compara `en`/`pt` contra el valor que tenía la clave vieja, sin números de línea, y revisa que ninguna plantilla muestre los textos viejos.
    - **IDI-B00f (2026-10-21):** `de.json` (1.14) nació con las 11 claves corregidas y sin las viejas; lo fija `tests/i18n/aleman.test.js`. 1.11 sigue sin marcar solo por la aprobación del diff [S] de Daniel.
- [x] **1.12 Front: claves `comun.*`.** Crear los textos repetidos (Guardar, Cancelar, Aceptar, Cerrar, Buscar, Eliminar, Editar, Sí, No, Cargando…, Sin resultados) en los cuatro diccionarios. No se cambia ninguna plantilla en esta tarea. **Marcada por `es`, `en` y `pt`; en `de` no está cerrada: la copia se crea con `de.json` en 1.14.**
  - Dependencias: 1.8.
  - **Hecho en es, en y pt (IDI-B00d, 2026-10-21):**
    - Hay 11 claves: `comun.guardar`, `cancelar`, `aceptar`, `cerrar`, `buscar`, `eliminar`, `editar`, `si`, `no`, `cargando` y `sinResultados`.
    - Van agrupadas y seguidas, justo antes de `primeng`, con la sangría de las líneas vecinas: 4 espacios en `es.json` y 2 en `en.json` y `pt.json`, como hoy.
    - Cada valor sale de su clave literal antigua en cada idioma: «Guardar», «Cancelar», «Aceptar», «Cerrar», «Buscar», «Eliminar», «Editar», «Si» (es «Sí»), «No» y «Cargando...». La prueba lo compara mientras la clave antigua exista.
    - `sinResultados` no tenía clave literal. Queda «Sin resultados», «No results» y «Nenhum resultado», como dice esta tarea.
    - No se tocó ninguna plantilla.
    - La copia en `de` llega con `de.json` en IDI-B00f (1.14). `diccionarios.test.js` la exige en cuanto `de.json` exista, pero solo cuida el flujo normal cuando entre en `test:i18n` (pendiente de 1.10).
    - **Cerrada en `de` (IDI-B00f, 2026-10-21):** `de.json` trae las 11 `comun.*` («Speichern», «Abbrechen», «Akzeptieren», «Schliessen», «Suchen», «Löschen», «Bearbeiten», «Ja», «Nein», «Wird geladen...», «Keine Ergebnisse»), iguales a su clave literal antigua en `de`. Las comprueban `diccionarios.test.js` y `aleman.test.js`, ya en `test:i18n`.
- [ ] **1.13 Backend: borrador con Opttia.** `functions/scripts/i18n-borrador.js` y `services/ai/prompts/traduccionPanelPrompt.js` según D8. Primera corrida con `--dry-run`.
  - Criterio: con `--dry-run` cuenta las claves y muestra el primer lote sin llamar a Opttia; con un lote real de 20 claves devuelve JSON con las mismas variables y sin «ß». No escribe en Firestore ni imprime el token.
  - Dependencias: 0.2.
  - **Implementado (IDI-B00f, 2026-10-21); sin marcar porque falta el lote real de 20 claves.**
    - `services/ai/prompts/traduccionPanelPrompt.js`: glosario de D7 (en, pt-BR y de-CH), tratamiento por idioma («Sie» en de-CH), nombres propios de D4, conservar `{{x}}`, `{x}` y el HTML, espacios y signos, «ss» en vez de «ß», comillas «» y términos suizos («Offerte», «MWST», «Quartier», «Transporteur»). Función pura exportada `validarTraducciones(lote, respuesta, idioma)`: rechaza claves que faltan, tipos o longitudes distintos, vacíos, variables perdidas o agregadas, etiquetas HTML distintas y «ß» en de-CH; copia los espacios del inicio y del final del original.
    - `scripts/i18n-borrador.js`: lotes de 80 (`--lote`), `--entrada`, `--base`, `--idioma de-CH|en|pt-BR`, `--solo-faltantes` (con `--base`), `--limite N`, `--salida` (nunca la entrada) y `--dry-run`. Escribe en el orden de `es.json`, con 4 espacios y los arreglos de `primeng` en una línea; lo rechazado no se escribe (lo marca `i18n:check`) y sale con 1. Solo desarrollo: se niega (salida 2) con `NODE_ENV=production`, con un `KAI_ADK_URL` que no sea local o sin `WHATSAPP_BOT_TOKEN`; nunca imprime el token; no toca Firestore; ningún controlador, ruta ni servicio lo importa.
    - Prueba `functions/tests/ai/traduccionPanelPrompt.test.js` 18/18 (`node tests/ai/traduccionPanelPrompt.test.js`), con un llamador simulado: prompt con glosario y reglas, validador (variables, HTML, «ß», tipos), `--dry-run` sin llamar ni escribir, corrida simulada, `--base`/`--solo-faltantes`/`--limite` y las negativas de entorno. Mutaciones comprobadas: sin la regla de «ß» fallan 2; sin la de variables, 3.
    - Primera corrida, `--dry-run` sobre el `es.json` real: 771 claves (728 + 43 de `primeng`) en 10 lotes; primer lote de 80 claves y prompt de 5.498 caracteres.
    - **Lote real de 20 claves: no se pudo.** En el entorno del agente no hay ADK local (`127.0.0.1:8080` rechaza la conexión) ni token; el script sale con 2 y no se llamó a ningún servicio de producción. Se marca cuando alguien lo corra en desarrollo: `node scripts/i18n-borrador.js --entrada <es.json> --idioma de-CH --limite 20 --salida <archivo temporal>`.
    - Falta agregar el script `test:i18n-borrador` al `package.json` del backend: tenía cambios sin commit de otro agente (laboratorio de tienda) y no se tocó.
    - **Corrección (IDI-B00f, 2026-10-21):** el validador compara las etiquetas HTML con sus atributos (un `href`, `class` o `routerLink` cambiado se rechaza) y rechaza los arreglos con elementos vacíos (días y meses de `primeng`). El script no corre en una máquina con la unidad systemd `kai-adk` (en producción el ADK escucha justo en 127.0.0.1:8080) y lee el token y `KAI_ADK_URL` también de `functions/.env`, como el backend. Las pruebas del token buscan el valor real y una de ellas pasa por el `pedirJsonAOpttia` real con `fetch` simulado (cabecera `X-Bot-Token`, envoltura `{ success, data }`). Prueba 21/21; cada regla nueva comprobada rompiéndola a propósito.
- [x] **1.14 Front: `de.json` en borrador.** Todas las claves de `es.json` (incluidos `primeng` y `comun.*`) con 1.13 y el glosario de D7, revisadas por quien hace el bloque. Anotar en esta tarea: «borrador, sin revisión nativa».
  - Criterio: `i18n:check` sin errores para `de`.
  - Dependencias: 1.11, 1.12, 1.13.
  - **Hecho (IDI-B00f, 2026-10-21): borrador, sin revisión nativa (de-CH pendiente de revisión nativa).** de-CH sigue oculto en el selector (D2) hasta esa revisión (0.5, 14.x).
    - `src/assets/i18n/de.json`: las 771 claves de `es.json` en su mismo orden (728 de primer nivel, incluidas `comun.*`, `notificaciones.*` y las 11 de 1.11 ya corregidas, más las 43 de `primeng`). UTF-8 sin BOM, 4 espacios (D7), arreglos en una línea y salto de línea final.
    - Opttia no respondía en el entorno del agente (ver 1.13), así que lo tradujo el agente con las reglas del prompt de 1.13 y lo validó con el mismo `validarTraducciones` (0 rechazos). Alemán estándar de Suiza: «ss» (Schliessen, Grösser, Vergrössern, Begrüssung, Tabellengrössen), comillas «», «Sie», glosario de D7 (Bestellung, Versand, Lager, Lagerbestand, Kunde, E-Rechnung) y términos suizos: MWST por IVA, «Total», «Quartier» por barrio, «Transporteur», «Identitätskarte», «Handelsregisterauszug». Los nombres propios de D4 no se tradujeron.
    - `notificaciones.privacy_note_1`/`_2`: la plantilla pone el enlace y un «.» entre las dos, así que en alemán la frase termina en el enlace («Details finden Sie in unserer [Datenschutzerklärung].»).
    - Piezas de la plantilla Cuba (claves en inglés, sin uso real) traducidas desde su sentido en inglés.
    - `scripts/i18n-check.config.json`: `idiomasOpcionales` queda vacío (la falta de `de.json` pasa de aviso a error) e `igualesPermitidos.de` suma «Editor» y «Total».
    - Pruebas: `tests/i18n/aleman.test.js` (15 casos, en `test:i18n`): claves y orden de `es`, tipos y longitudes, variables, espacios de las piezas unidas, sin «ß», comillas, «Sie», glosario de D7, MWST y nombres propios, `comun.*`, las 11 de 1.11, `primeng` e `i18n:check` sin errores ni avisos de `de` (salvo `claveSinUso`, que es de `es`). En `i18n-check.test.js`, caso nuevo: con `idiomasOpcionales` vacío, la falta de `de.json` es error y sale con 1. Con una «ß» puesta a mano, `i18n:check` da 2 errores `eszett` y `aleman.test.js` falla.
    - Resultado: `i18n:check` 0 errores (2.106 avisos, ninguno de `de` salvo `claveSinUso`); `test:i18n` 114/114.
    - **Si Daniel rechaza o cambia el diff [S] de 1.11:** `es.json` vuelve a tener claves que `de.json` no trae e `i18n:check` dará `claveFaltante` en `de`. Se corrige en ese mismo cambio, con `node scripts/i18n-borrador.js --entrada <es.json> --base <de.json> --solo-faltantes --idioma de-CH --salida <de.json>` (o a mano con las mismas reglas), y se ajusta el caso de 1.11 de `aleman.test.js`. Hasta entonces 1.14 sigue cerrada.
- [ ] **1.15 Configuración de prueba (Firestore, por orden de Daniel).** Con 1.5: `--dry-run` primero; luego `visibleAppLanguages: ['es','en','pt']` y `appLanguagePreviewCompanies: ['Julsmind']` (o la empresa que indique Daniel).
  - Criterio: un usuario de Julsmind ve «Deutsch (CH)» tras entrar; un usuario de FLORECER no.
  - Dependencias: 1.4 desplegado, 1.6, 1.14.
- [ ] **1.16 Cierre del bloque base.** tsc, `i18n:check`, `test:i18n`, `test:theme`, pruebas del backend y `build:prod` en verde. En el navegador, a 1440 y 390 px: selector con tres idiomas para un comercio y cuatro para la empresa de prueba; cambiar de idioma sin recargar; recargar conserva el idioma; cerrar sesión deja el login en español; un calendario y un filtro de tabla de Todos los pedidos en español, inglés y portugués al cambiar de idioma sin recargar (criterio de 1.9, que se marca aquí). Bitácora en `CONTRACT.md`, incluida la de IDI-B00b (catálogo con de-CH oculto, `fr.json` retirado, `PrimengI18nService`), que no se pudo escribir en su bloque porque el archivo tenía cambios de otro agente.
  - Dependencias: 1.1 a 1.15.
  - **Parte local hecha (IDI-B00f, 2026-10-21); sin marcar hasta producción.**
    - En verde: tsc (`flock … tsc --noEmit -p tsconfig.app.json`, salida 0), `npm run i18n:check` (0 errores), `npm run test:i18n` 114/114, `npm run test:theme` 83/83 (79 + 4 de otro bloque de tema), backend `npm run test:idiomas-login` (caracterización 7/7, contrato 13/13, script 6/6) y `node tests/ai/traduccionPanelPrompt.test.js` 21/21 (tras la corrección).
    - Bitácora en `CONTRACT.md` (entrada «IDI-B00f y cierre del bloque base»), con las atrasadas de IDI-B00b e IDI-B00d, y el bloque base en D-532.
    - **Espera producción o a Daniel:**
      - `npm run build:prod` (no lo corren los agentes) y revisar después el diff de `environment.ts` y `environment.prod.ts`.
      - Desplegar el backend de IDI-B00a (`visibleLanguages` en el login) y el front.
      - 1.15 por orden de Daniel: `set-idiomas-visibles.js --visibles es,en,pt --prueba Julsmind`, primero simulado.
      - En el navegador, a 1440 y 390 px, con la empresa de prueba y con un comercio: selector con cuatro y tres idiomas; cambiar sin recargar; recargar conserva el idioma; cerrar sesión deja el login en español; calendario y filtro de Todos los pedidos en es, en y pt (criterio de 1.9).
      - 1.13: el lote real de 20 claves en un entorno con ADK local.
      - 1.11: aprobación del diff [S] de Daniel.
      - de-CH en el selector para todos: solo después de la revisión nativa (0.5 y sección 14).

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

`pages/authentication` 13/1/12, `auth/login` (el login real del panel, ruta `/login`; agregado por IDI-B00c), `change-password` (también `shared/components/change-password`), `payment-callback`, `subscription-callback`, `terms-conditions`, `privacy-policy`, `pricing`, `shared/components/{publica,page-not-found}`. Sin sesión no hay preferencia: se ven en español hasta que llegue el idioma por empresa (Ola 0). Las que se ven con sesión (cambio obligatorio de contraseña, resultados de pago y suscripción) sí cambian. El texto legal de términos y privacidad no se traduce en este bloque (es un documento legal; su versión en otro idioma la decide Daniel aparte).

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

`crm` 4/1/59, `prospect-manager` 1/0/33 y los formularios de cliente de `shared` (incluido el formulario único de cliente, que ya trae EN/PT: se conservan sus claves). En el código viven en `components/ventas/clientes` (`clientes-shared.module`); la configuración de `i18n:check` los asigna a este bloque y no a IDI-B03 (IDI-B00c).

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
