# Diseño: idiomas del panel Seller (ticket cd CMNdBkVZXgYoOCvqfGZc, D-540)

> Aprobado en bloque por Daniel el 2026-10-21 (tarea 0.2), junto con las specs, `tasks.md` y la asignación de carpetas de D10 tal como está escrita. Toda pregunta abierta se resuelve con la recomendación escrita. Las recomendaciones de fondo están en `proposal.md`, «Aprobación (2026-10-21)».

## Contexto

Lo que ya existe y no se reemplaza (verificado el 2026-10-21):

| Pieza | Dónde | Qué hace |
|---|---|---|
| Traductor | `app.module.ts:76-77,130-136` | `@ngx-translate/core` 14 con `TranslateHttpLoader`, `defaultLanguage: 'es'` |
| Catálogo de idiomas | `shared/utils/app-language.utils.ts` | `APP_LANGUAGES` (`en`, `es`, `pt`), `normalizeAppLanguage` (desconocido → `es`) |
| Selector | `shared/components/header/elements/languages/*` | Cambia el idioma y lo guarda con `MaestroService.updateUser` (`POST /v1/users/edit`) |
| Arranque | `app.component.ts:96-100`, `auth.service` | Aplica `user.lang` al iniciar y al entrar |
| Login | `wt-back-tickets-web/functions/controllers/authentication.js:223` | Devuelve `lang: userData.lang \|\| userData.idioma \|\| 'es'` |
| Bandera de Suiza | `assets/scss/vendors/flag-icon/_flag-icon-list.scss:43` | `flag-icon-ch` ya existe |

No se cambia de librería ni se agrega otra capa de traducción. Angular 14.3 no tiene signals ni `@if`: el código nuevo sigue el estilo de los módulos que toca (excepción acotada al Art. IX, a registrar en el D-540).

## D1. Catálogo de idiomas

`APP_LANGUAGES` pasa a cuatro entradas. La nueva es `{ language: 'Deutsch', code: 'de', type: 'CH', icon: 'ch', htmlLang: 'de-CH' }`. El tipo de `code` pasa a `'es' | 'en' | 'pt' | 'de'`, y cada entrada suma `htmlLang` (`es-CO`, `en-US`, `pt-BR`, `de-CH`), que se escribe en `<html lang>` para lectores de pantalla y separación de sílabas. El valor guardado en `users.lang` sigue siendo el mismo objeto o el código: `de`. El archivo es `src/assets/i18n/de.json`.

`app.component.ts` declara solo los idiomas reales: `addLangs(['es', 'en', 'pt', 'de'])`. Se borra `src/assets/i18n/fr.json`.

## D2. Idioma oculto hasta la revisión (D-505)

Dos campos nuevos en el documento existente **`config/feature_flags`**:

| Campo | Tipo | Ausente o inválido | Uso |
|---|---|---|---|
| `visibleAppLanguages` | arreglo de códigos | `['es', 'en', 'pt']` | Idiomas que ve todo el mundo. `es` siempre se agrega. Los códigos que no están en el catálogo se ignoran, así que `[]` deja solo el español. Inválido es que no sea un arreglo o que traiga algún elemento que no es texto. Es configuración permanente |
| `appLanguagePreviewCompanies` | arreglo de identificadores de empresa (`users.empresa`) | `[]` | Empresas de prueba que ven **todos** los idiomas del catálogo, para que el revisor nativo trabaje sobre la aplicación real. Bandera temporal (Art. XII): dueño Daniel, se retira cuando de-CH se publique o el 2027-06-30 |

**Quién la lee:** el login. Un servicio pequeño del backend, `services/appLanguages.js` (`idiomasVisibles(empresa)`), lee el documento una vez por login, con un tiempo límite de 2,5 s, compara la empresa sin mayúsculas ni espacios de más y devuelve el arreglo. El login (`construirSesion`) lo agrega a la respuesta como `visibleLanguages`; la confirmación del registro (`controllers/registroVerificacion.js`) reusa `construirSesion`, así que también lo devuelve. Si la lectura falla o vence el tiempo límite, devuelve el valor por defecto, deja un log estructurado sin datos personales y **el login sigue**: nunca falla por esto.

**Por qué en el login y no en un endpoint nuevo:** `openspec/config.yaml` pide aprobación para endpoints nuevos; la respuesta del login ya trae `lang` y la preferencia de tema. Es una lectura de documento por login.

**Por qué no una bandera por empresa (`companies.featureFlags`):** la revisión nativa es del idioma, no del comercio. Publicar de-CH es una sola decisión para todos. La lista de empresas de prueba cubre la etapa previa.

**En el front:**
- `visibleLanguages` se guarda en `localStorage['user']` como el resto de la respuesta del login.
- `idiomasVisibles(user)` filtra `APP_LANGUAGES`. Sin el campo (sesiones abiertas antes del cambio) usa `['es', 'en', 'pt']`.
- `normalizeAppLanguage(valor, visibles)` devuelve español si el idioma guardado no es visible. **No se reescribe `users.lang`:** si de-CH se oculta y se vuelve a mostrar, el usuario lo recupera.
- El efecto de cambiar la configuración llega en el siguiente inicio de sesión. Es suficiente porque el idioma nace oculto; si hiciera falta efecto inmediato, iría en otro cambio.

**Interruptor de emergencia:** quitar `de` de `visibleAppLanguages` (y vaciar `appLanguagePreviewCompanies`). Los usuarios con alemán ven español al volver a entrar.

## D3. Claves

- **Claves semánticas por módulo**, planas y con puntos, como ya hace `notificaciones.*`: `<carpeta del módulo>.<pantalla>.<elemento>`. El prefijo es el nombre de la carpeta del repo en `camelCase` (`lista-precios` → `listaPrecios`, `en-vivo` → `enVivo`), para encontrarla sin buscar; el resto va en inglés y `camelCase` (`ventas.orderList.columnStatus`, `despachos.detail.confirmDelivered`). El texto en español es el **valor** en `es.json`: corregir una tilde ya no cambia la clave.
- **`comun.*`** para los textos que se repiten en todos los módulos (Guardar, Cancelar, Aceptar, Cerrar, Buscar, Sí, No, Cargando…). Se crean en el bloque base con las que ya existan como claves literales.
- **`primeng`** es la única clave anidada (un objeto), porque se le entrega entera a PrimeNG (D5).
- **Claves literales antiguas:** siguen vigentes hasta que se migra su módulo. Al migrarlo, las que ya nadie usa se borran de los cuatro diccionarios en el mismo commit.
- **Excepción: textos que son identidad.** Los títulos del menú (`nav.service.ts`) se usan como identidad: favoritos y secciones plegadas se guardan por título, y el código compara `item.title === "Mensajes"`. Esos títulos **no cambian**: siguen siendo claves literales en español, la ortografía se corrige solo en el valor de `es.json` y `en`/`pt`/`de` traducen bajo la misma clave. La misma regla vale para cualquier texto que se guarde, se compare o viaje al backend (estados, opciones guardadas, `badgeValue`): se traduce lo que se muestra, nunca el valor.
- **Parámetros:** `{{nombre}}` con `translate.instant(clave, { nombre })`. Nunca se arma una frase pegando fragmentos traducidos (el orden de las palabras cambia en alemán).
- **Plurales:** el traductor no trae ICU. Donde el texto cambia con la cantidad, dos claves (`.one` y `.other`) y el componente elige; nada más.

## D4. Cómo se extrae un texto

- **HTML:** `{{ 'ventas.x.y' | translate }}`; atributos con `[placeholder]`, `[title]`, `[attr.aria-label]`, `[pTooltip]`, `[label]`, `[header]` y el pipe. `[innerHTML]` con el pipe solo para textos fijos nuestros.
- **TypeScript (`Swal.fire`, `toastr.*`, `messageService.add`):** se inyecta `TranslateService` y se usa `translate.instant(clave, params)` en `title`, `text`, `html`, `confirmButtonText`, `cancelButtonText`, `summary` y `detail`.
- **`instant` solo después de cargar el diccionario:** dentro de manejadores de eventos, respuestas HTTP y diálogos. Lo que se arma al iniciar el componente (columnas, opciones de un `p-dropdown`, pestañas) guarda la **clave** y la plantilla la pasa por el pipe. Así también cambia en vivo si el usuario cambia de idioma.
- **Mensajes del servidor** (`err.error.message`): se muestran como llegan, en español. Los mensajes del backend están fuera de alcance (Ola 0).
- **Datos del comercio:** no se traducen.
- **Nombres propios que no se traducen:** Katuq, Opttia, KAI, POS, SKU, NIT, DIAN, Siigo, World Office, Shopify, WooCommerce, WhatsApp, Wompi, Addi, Sistecrédito.

## D5. Textos de PrimeNG

Servicio nuevo `src/app/shared/services/i18n/primeng-i18n.service.ts` (`providedIn: 'root'`). Al iniciar y en cada `translate.onLangChange` pide `translate.get('primeng')` y llama `PrimeNGConfig.setTranslation(...)`. Lo arranca una sola vez `app.component.ts`; el selector no lo llama, porque el cambio de idioma ya dispara `onLangChange`.

El objeto `primeng` de cada diccionario trae **solo textos**: nombres de días y meses, `today`, `clear`, `weekHeader`, los operadores de filtro (`startsWith`, `contains`, `equals`, `dateIs`…), `apply`, `matchAll`, `matchAny`, `addRule`, `removeRule`, `accept`, `reject`, `choose`, `upload`, `cancel`, `emptyMessage`, `emptyFilterMessage`, `weak`, `medium`, `strong`, `passwordPrompt`. **No** lleva `dateFormat` ni `firstDayOfWeek`: son formato y pertenecen a la Ola 0. Consecuencia visible: en español los calendarios pasan del inglés de la librería al español. Es texto, no comportamiento.

## D6. Verificación automática: `npm run i18n:check`

`scripts/i18n-check.js`, Node puro y sin compilar Angular. Configuración en `scripts/i18n-check.config.json`: valores que pueden ser iguales al español (`Email`, `POS`, `SKU`, marcas), prefijos de clave dinámicos permitidos y la lista de **módulos cerrados** con sus carpetas.

| Revisión | Resultado |
|---|---|
| JSON válido, sin claves duplicadas (se detectan leyendo el texto, porque `JSON.parse` las pisa) | error |
| Toda clave de `es.json` existe en `en`, `pt` y `de` | error |
| Las variables `{{x}}` de cada valor son las mismas en los cuatro idiomas | error |
| `de.json` no contiene «ß» | error |
| Toda clave literal usada en el código (`'…' \| translate`, `instant('…')`, `get('…')`, `stream('…')`) existe en `es.json` | error |
| En un módulo cerrado no aparecen textos sueltos nuevos (nodos de texto del HTML sin pipe; literales en `Swal.fire`, `toastr.*`, `messageService.add` y en los atributos de D4) | error |
| Valores de `en`, `pt` o `de` iguales al español y fuera de la lista permitida | aviso |
| Claves de `en`, `pt` o `de` que no están en `es` (sobrantes), claves que nadie usa | aviso |

`--modulo <carpeta>` imprime los textos sueltos de un módulo aunque no esté cerrado: es la línea base y el criterio de salida de cada bloque. Sale con código 1 si hay errores. No se engancha a `prebuild` en el bloque base, para no frenar trabajos ajenos; se decide en el cierre del bloque 1 (tarea 2.8) si pasa al `predeploy`.

## D7. Diccionarios y estilo

- `es.json` es la referencia. Mismo formato que hoy (UTF-8 sin BOM, sangría de 4 espacios). Las claves nuevas se agrupan por módulo.
- **Tratamiento:** el español sigue con «tú», como el panel hoy; portugués de Brasil con «você»; inglés neutro de EE. UU.; alemán con «Sie».
- **de-CH:** alemán estándar, «ss» en vez de «ß», comillas «», términos suizos de negocio cuando existen («Offerte» por cotización).
- **Glosario base** (el revisor nativo lo confirma antes de publicar de-CH):

| es | en | pt | de-CH |
|---|---|---|---|
| Pedido | Order | Pedido | Bestellung |
| Venta asistida | Assisted sale | Venda assistida | Begleiteter Verkauf |
| Despacho | Shipment | Envio | Versand |
| Bodega | Warehouse | Depósito | Lager |
| Cotización | Quote | Orçamento | Offerte |
| Cliente | Customer | Cliente | Kunde |
| Cartera | Receivables | Contas a receber | Debitoren |
| Factura electrónica | E-invoice | Fatura eletrônica | E-Rechnung |
| Inventario | Inventory | Estoque | Lagerbestand |

## D8. Borrador con Opttia (solo en desarrollo)

Script del backend `functions/scripts/i18n-borrador.js` con un prompt en `services/ai/prompts/traduccionPanelPrompt.js` (glosario, tratamiento, «no traducir nombres propios», conservar `{{x}}` y HTML, sin «ß»). Llama a `pedirJsonAOpttia` (D-257) por lotes de unas 80 claves.

- Entrada: `--entrada es.json --base de.json --idioma de-CH --solo-faltantes --salida <archivo>`.
- `--dry-run` (la primera corrida) cuenta las claves y muestra el primer lote sin llamar a Opttia.
- Valida variables y «ß» antes de escribir. No escribe en Firestore, no corre en producción ni en tiempo de ejecución. El token interno se lee del entorno y nunca se imprime.
- El resultado es un **borrador**: lo revisa quien hace el bloque y, para de-CH, el revisor nativo.

## D9. «Solo textos»: cómo se revisa cada bloque

1. El diff toca solo `.html`, `.ts` del módulo y `src/assets/i18n/*.json`. Ningún `.scss`, ruta, servicio, modelo ni llamada HTTP.
2. En los `.ts`, los únicos cambios son la inyección de `TranslateService` y literales que pasan a `instant`. Se revisa con `git diff -w`.
3. Ningún valor que se guarde, se compare o se envíe cambia (D3, excepción).
4. Si un texto en alemán no cabe, se acorta la traducción; no se toca el CSS.
5. Revisión en el navegador en `es` y `en` a 1440 y 390 px: ninguna clave cruda, nada desbordado. `de` se mira con una empresa de prueba de D2.
6. En los bloques 3, 4, 7 y 8 (pedidos e inventario), el diff lo aprueba Daniel antes de unirse, uno a la vez.

## D10. Bloques y carpetas

| Bloque | Carpetas |
|---|---|
| IDI-B01 Shell | `shared/components/{header,sidebar,bottom-navigation,breadcrumb,footer,notification-center,aviso-actualizacion,upgrade-modal,plan-selector,usage-widget,loader}`, `shared/services/nav.service.ts`, `components/usuarios/edit-profile`, `components/notificaciones`, `components/dashboard` |
| IDI-B02 Públicas | `pages/authentication`, `components/{change-password,payment-callback,subscription-callback,terms-conditions,privacy-policy,pricing}`, `shared/components/{publica,page-not-found}` |
| IDI-B03 Ventas | `components/ventas`, `components/proceso` |
| IDI-B04 POS | `components/pos`, `components/extras` |
| IDI-B05 Clientes y CRM | `components/crm`, `components/prospect-manager`, formularios de cliente de `shared` |
| IDI-B06 Productos | `components/productos`, `components/ecomerce`, `components/lista-precios`, `components/dropshipping` |
| IDI-B07 Inventarios | `components/inventarios`, `components/compras` |
| IDI-B08 Despachos y picking | `components/despachos`, `components/picking-packing`, `components/formas-entrega`, `components/tiempos-entrega`, `components/produccion` |
| IDI-B09 Cotizaciones | `components/cotizaciones` |
| IDI-B10 Facturación, cartera y tesorería | `components/{facturacion-electronica,cartera,tesoreria,contabilidad,billing}` |
| IDI-B11 Sitios | `components/sitios` (solo el editor y sus pantallas del panel) |
| IDI-B12 Resto | `components/{integrations,onboarding,flows,nps,agenda,en-vivo,superadmin,empresas,rol,usuarios,maestros,soporte,katuq-flow,centro-operaciones,kuvo,chat,provider-dashboard,diagnostic-survey}` y los asistentes de `shared` (Opttia, KAI, voz) |

Las carpetas que no figuran en los doce módulos del informe (dashboard, proceso, extras, compras, dropshipping, produccion, contabilidad, empresas, rol, usuarios y otras) quedan asignadas como dice la tabla. Daniel aprobó esta asignación tal como está escrita (tarea 0.2, 2026-10-21). **Fuera de alcance:** `catalogo-publico`, `cotizacion-publica`, `sitio-publico`, `sitio-render`, `encuesta-publica`, `report-public`, `promo-campana` (las ve el comprador: Ola 0) y `sample`. Los componentes de `shared` que usan varios módulos se migran en el primer bloque que los muestra.

## D11. Pruebas

- **Front:** `tests/i18n/app-language.test.js` (catálogo, `idiomasVisibles`, `normalizeAppLanguage` con visibles; usa el cargador de `tests/theme/cargar-ts.js`) y `tests/i18n/i18n-check.test.js` (fixtures con cada error de D6). Script `test:i18n`.
- **Backend:** `tests/auth/visibleLanguages.contract.test.js`: la respuesta del login trae `visibleLanguages`, un arreglo con `es`, solo códigos del catálogo; documento ausente, ilegible, con tipos inválidos o que no responde da el valor por defecto y el login no falla; la empresa de prueba ve `de`. Se escribe antes del cambio (Art. VIII). Antes de tocar el login, la caracterización `tests/auth/construirSesion.caracterizacion.test.js` fija la respuesta actual (arnés `tests/auth/_sesionHarness.js`). El script de D2 se prueba con `tests/auth/setIdiomasVisibles.test.js`. Las tres corren con `npm run test:idiomas-login`.
- **Cada bloque:** `npm run i18n:check`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run test:i18n` y build de producción.

## Contratos

- **Respuesta del login** (y de la confirmación del registro, que reusa `construirSesion`): campo nuevo `visibleLanguages: string[]` (subconjunto de `es`, `en`, `pt`, `de`; siempre incluye `es`). Los demás campos no cambian.
- **`config/feature_flags`:** `visibleAppLanguages: string[]`, `appLanguagePreviewCompanies: string[]`. Solo lectura desde el login. Se escriben a mano o con `functions/scripts/set-idiomas-visibles.js` (primero `--dry-run`), por orden de Daniel.
- **`users.lang`:** sin cambios de forma; acepta `de`.

## Write-set

`config/feature_flags` (dos campos, por script o a mano) y `users.lang` (como hoy, desde el selector). Nada más. Ninguna escritura en `orders`, `products`, precios, `inventory` ni `inventoryMovement`.

## Gates de la constitución

| Artículo | Estado |
|---|---|
| I, II | Specs sin tecnología; código solo después de 0.2 |
| VII | La falla al leer la configuración deja log estructurado; no hay integración crítica nueva |
| VIII | Prueba de contrato del login antes del cambio (1.2) |
| IX | Parcial: Angular 14.3, se sigue el estilo de cada módulo (excepción en el D-540) |
| XI | El log de D2 no lleva correo ni nombre; el script de D8 no imprime el token |
| XII | `appLanguagePreviewCompanies`: dueño Daniel, retiro al publicar de-CH o el 2027-06-30 (tarea 14.3) |
| XIII | Dos specs de menos de tres páginas |
| XIV | D-540 y bitácora (0.3 y cierre de cada bloque) |

## Reversión

Cada bloque es un commit propio y se revierte solo. Si falta una traducción, el traductor muestra el español. Para ocultar un idioma basta con la configuración de D2.
