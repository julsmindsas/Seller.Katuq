# Idiomas del panel Seller: español, inglés, portugués y alemán de Suiza (ticket «Traducción», cd CMNdBkVZXgYoOCvqfGZc)

> Estado: **APROBADA por Daniel el 2026-10-21.** Recomendaciones 1 a 9 («Base + módulo por módulo», ver «Aprobación (2026-10-21)» al final) y, en bloque, `design.md`, las dos specs, `tasks.md` y la asignación de carpetas de D10 (tarea 0.2). Cada pregunta abierta se resuelve con la recomendación escrita. Decisión asentada como **D-532** en `specs/CONTRACT.md` (tarea 0.3).
>
> **Cómo citar el ticket:** por su `cd` (`CMNdBkVZXgYoOCvqfGZc`), no por el número 1231. El contrato ya usa «ticket 1231» en D-446 para otro ticket (estrellas del sitio). Informe de lectura: `entender/traduccion.md` de la sesión 571efb0a (2026-10-21).

## Por qué

Jairo pidió el 18-oct «TRADUCCIÓN Y ORTOGRAFIA DE LA PLATAFORMA: ESPAÑOL, INGLES, PORTUGUES, Y ALEMAN (EN ESPECIAL ALEMAN SUIZO)». Adjuntó la captura del selector de idioma del encabezado, que hoy ofrece «English (US)», «Español (CO)» y «Português (BR)». No hay alemán.

El ticket junta los dos que Daniel archivó el 16-oct sin hacer:

- **1181** (`urpQiIDjXO9W9FuQQ4fk`), «TERMINAR LA TRADUCCIÓN DE TODA LA PLATAFORMA A INGLES Y PORTUGUES». Resolución: «Traducir toda la plataforma a inglés y portugués es un trabajo grande. Si se retoma, se abre un ticket por módulo.»
- **1182** (`ZQy5r70gskWzdbp3NfBg`), «REVISAR Y MEJORAR LA ORTOGRAFÍA EN TODO EL SITIO». Resolución: «cada texto en español es también la clave de su traducción. Si se retoma, se abre un ticket por módulo.»

Esta propuesta retoma los dos con lo que Daniel pidió: trabajo por módulo y una forma de corregir el español sin romper las traducciones.

## Qué hay hoy (verificado el 2026-10-21 en `feature/tickets-web`)

- **La infraestructura funciona:** el traductor ya está montado (`app.module.ts`, idioma por defecto `es`), el selector guarda `lang` en el usuario (`POST /v1/users/edit`) y el login lo devuelve (`authentication.js:223`). El backend guarda `lang` sin lista blanca.
- **El contenido no:** solo 92 de 455 plantillas usan el pipe `translate` y hay cero `translate.instant`. Hay 1.183 `Swal.fire(`, 594 `toastr.*(` y 286 `messageService.add(` con el texto escrito a mano. Del menú lateral, 119 de 153 títulos no tienen traducción en `en.json`.
- **Diccionarios:** `es.json` 720 claves, casi todas con el propio texto en español como clave. A `en.json` le faltan 11 claves y 34 valores quedaron en español. A `pt.json` le faltan 17 y 94 valores siguen en español. `fr.json` (179) no se puede elegir. `de.json` no existe.
- **Restos:** `app.component.ts:100` declara `addLangs(['en','de','es','fr','pt','cn','ae'])`, con `de`, `cn` y `ae` sin diccionario.
- **PrimeNG** no recibe traducción: calendarios, filtros y paginadores salen con los textos por defecto de la librería (inglés), también en español.
- **Ortografía:** 11 claves visibles de `es.json` sin tilde («Usar Esta Direccion», «Accion», «Nombres/Razon Social»…). En las plantillas aparecen palabras sin tilde en unos 200 archivos (cota: el conteo mezcla identificadores).
- **Acople:** como la clave es el texto, corregir una tilde en la plantilla rompe la traducción en `en` y `pt` si no se renombra en todos los diccionarios a la vez.

## Qué cambia

1. **Paraguas con bloques.** Este ticket queda como paraguas. El trabajo sale en un bloque base (`IDI-B00`) y doce bloques de módulo (`IDI-B01` a `IDI-B12`), cada uno con su commit y su cierre, igual que T·1 o TX37-B0x. No se abren veinte tickets.
2. **Bloque base, sin tocar textos de pantallas:**
   - Alemán estándar de Suiza (`de-CH`, sin «ß»), mostrado como **«Deutsch (CH)»** con la bandera de Suiza. Entra al selector **oculto**: solo se muestra cuando la plataforma lo habilita en su configuración en Firestore (D-505), después de la revisión nativa. Mientras tanto lo ven únicamente las empresas de prueba que la configuración nombre, para que el revisor trabaje sobre la aplicación real.
   - Verificación automática de los diccionarios (`npm run i18n:check`).
   - Textos de PrimeNG en los cuatro idiomas.
   - Retiro de `fr.json` y de `fr`, `cn` y `ae` de los idiomas declarados.
   - `en.json` y `pt.json` completos, y las 11 claves con faltas de `es.json` corregidas y renombradas en todos los diccionarios y en las plantillas que las usan.
3. **Doce bloques de módulo**, en orden de uso: (1) shell; (2) páginas públicas; (3) ventas; (4) POS; (5) clientes y CRM; (6) productos, catálogo y listas de precios; (7) inventarios; (8) despachos y picking; (9) cotizaciones; (10) facturación electrónica, cartera y tesorería; (11) sitios y editor; (12) integraciones, onboarding, flows, NPS, agenda, en-vivo y superadmin. En cada uno: textos del HTML y de `Swal`/`toastr`/`messageService` al traductor con claves semánticas por módulo, ortografía del español, traducción a `en`, `pt` y `de`, `i18n:check` y `tsc`.
4. **Regla de todos los bloques: solo textos.** No cambian columnas, filtros, eventos, modales, servicios, validaciones, rutas ni datos guardados.
5. **Traducciones:** borrador generado en desarrollo con Opttia (D-257), nunca en tiempo de ejecución. Revisión de una persona nativa **obligatoria para de-CH** antes de mostrarlo en el selector; recomendada para pt-BR antes de vender en Brasil.

## Capacidades

### Nuevas
- `seller-language`: elegir el idioma del panel, qué idiomas se ofrecen, cuándo se oculta uno y qué no cambia con el idioma.
- `seller-translation-coverage`: qué significa que un módulo quede traducido, la ortografía del español, la verificación automática y la revisión de las traducciones.

### Modificadas
- Ninguna. `design-system` no cambia: los bloques no tocan estilos.

## Impacto

- **Front (`wt-front-tickets-web`):** `shared/utils/app-language.utils.ts`, `shared/components/header/elements/languages/*`, `app.component.ts`, `auth.service` (aplicar idioma al entrar), un servicio nuevo de textos de PrimeNG, `src/assets/i18n/*.json`, `scripts/i18n-check.js`, `package.json`. Después, plantillas y componentes de cada módulo, solo en sus textos.
- **Backend (`wt-back-tickets-web`):** un servicio nuevo de solo lectura, `services/appLanguages.js`, y un cambio pequeño en el login (`controllers/authentication.js`) para devolver los idiomas visibles leídos de `config/feature_flags`. Un script de configuración, `scripts/set-idiomas-visibles.js`, que simula por defecto y, con `--execute` y por orden de Daniel, escribe solo los dos campos de `config/feature_flags`. Un script de desarrollo para el borrador con Opttia que no escribe en Firestore. Sin endpoints ni colecciones nuevas.
- **Firestore:** dos campos nuevos en el documento existente `config/feature_flags` (D-505). Ninguna colección nueva.

## No-goals

- **Lo que ve el comprador:** tienda pública, catálogo y cotización públicos, correos al comprador, plantillas de WhatsApp, PDF y mensajes de error del backend siguen en español. Dependen del «idioma de presentación» por empresa de la Ola 0 (`enable-multi-country-multi-currency`, capacidad `company-locale-profile`) y tendrán su propio bloque.
- **Formatos de número, moneda y fecha** (CHF, `1'234.50`, `LOCALE_ID`, primer día de la semana): son de la Ola 0. Este cambio solo traduce textos.
- **Idioma por empresa en el panel:** el panel sigue siendo por usuario (`users.lang`). No se mezcla con el idioma de presentación de la empresa.
- **Datos del comercio:** nombres de productos, categorías, maestros, formas de entrega y demás datos que el comercio escribe se muestran como los escribió.
- **Suizo alemán hablado** (dialecto): no tiene forma escrita estándar. Se usa alemán estándar con convenciones suizas.
- **Francés, chino y árabe:** se retiran los restos; no se agregan.
- **Búsqueda del menú por el texto traducido:** hoy busca por el título en español. Cambiarlo es comportamiento y va aparte si se pide.
- **Cambiar estados, valores o identificadores** que hoy son textos en español y se guardan o se comparan (estados del pedido, títulos del menú usados como identidad, opciones guardadas): se traduce solo lo que se muestra.

## Riesgos y módulos sensibles

- **Ventas, POS, despachos e inventario** (bloques 3, 4, 7 y 8) tocan pantallas de `orders` e inventario. El riesgo es cambiar sin querer un valor que se guarda o se compara al traducir su etiqueta. Mitigación: solo se traduce la presentación; cada bloque de estos módulos va con diff aprobado por Daniel antes de unirse, uno a la vez, y con la revisión «solo textos» de `design.md`. No hay escritura en `products`, precios, `inventory` ni `inventoryMovement`: el write-set de datos de todo el cambio es solo `config/feature_flags` (dos campos) y `users.lang` como hoy.
- **Consecutivos y facturación electrónica** (bloque 10): los textos que viajan a DIAN, Siigo o World Office no se traducen; solo la pantalla.
- **`translate.instant` antes de cargar el diccionario** devuelve la clave. Regla en `design.md`: `instant` solo en manejadores de eventos y respuestas; lo que se arma al iniciar usa el pipe o `stream`.
- **Claves que faltan:** el traductor muestra el español cuando falta una traducción, pero muestra la clave cruda si falta en `es.json`. `i18n:check` lo bloquea.
- **Calidad del alemán:** un borrador automático sin revisar puede ser incorrecto o inapropiado. Por eso de-CH nace oculto y solo se muestra con la revisión nativa registrada.
- **Tamaño:** son unas 363 plantillas y unos 2.060 mensajes. Cada bloque es independiente y se puede pausar sin dejar nada roto: lo no migrado sigue en español.

## Constitución

- **Art. I y II:** specs sin tecnología; nada de código antes de la tarea 0.2.
- **Art. VIII:** el campo nuevo del login lleva prueba de contrato antes de implementarse (tarea 1.2).
- **Art. IX:** Angular 14.3 no tiene signals ni `@if`. Los módulos existentes siguen en NgModule y sus directivas; el servicio nuevo de PrimeNG es un servicio raíz pequeño. Excepción acotada, a registrar en el D-532.
- **Art. XII:** la lista de empresas de prueba de idiomas ocultos es una bandera temporal: dueño Daniel, se retira cuando de-CH se publique o el 2027-06-30, lo que pase primero (tarea 14.3). La lista de idiomas visibles es configuración permanente, no una bandera temporal.
- **Art. XIII:** dos specs de menos de tres páginas; los bloques de módulo no agregan requisitos nuevos, aplican los mismos.
- **Art. XIV:** D-532 y bitácora en `CONTRACT.md`.

## Observación lateral

Al leer `controllers/users.js` (`editUser`) para este informe apareció un punto de seguridad ajeno a la traducción. No se detalla aquí y no entra en este cambio: va en su propia propuesta del backend.

## Aprobación (2026-10-21)

Daniel decidió el 2026-10-21: **«Base + módulo por módulo»**. Con eso aprobó las recomendaciones 1 a 9 del informe:

1. Retomar el trabajo con este ticket como paraguas y un bloque por módulo (no un ticket por módulo).
2. Alemán estándar de Suiza (`de-CH`, sin «ß»), mostrado como «Deutsch (CH)» con la bandera `ch`.
3. Preguntarle a Jairo para qué comercio o mercado es el alemán; si hay uno concreto, sus módulos se revisan primero en alemán.
4. Solo el panel Seller en esta entrega. Tienda pública, correos, WhatsApp y PDF quedan para el idioma por empresa de la Ola 0.
5. Borrador con Opttia en desarrollo y revisión nativa obligatoria antes de mostrar de-CH en el selector (persona o agencia, con el costo aprobado por Daniel). Para pt-BR, revisión nativa antes de vender en Brasil.
6. Claves semánticas por módulo para lo nuevo y lo que se migre.
7. Ortografía por módulo, dentro de cada bloque, más una pasada sobre las 11 claves de `es.json` en el bloque base.
8. Retirar `fr.json` y `cn`/`ae`.
9. Idioma por usuario en el panel; el idioma de lo que ven los clientes del comercio queda para la Ola 0. No se mezclan.

Queda pendiente, sin bloquear el bloque base: a quién va dirigido el alemán (pregunta a Jairo, tarea 0.4) y quién hace la revisión nativa y con qué costo (Daniel, tarea 0.5). Las dos solo condicionan la publicación de de-CH (sección 14 de `tasks.md`).
