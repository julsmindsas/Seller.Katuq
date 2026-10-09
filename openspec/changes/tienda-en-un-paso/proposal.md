## Why

Daniel, 8-oct (Effix es del 16 al 18 de octubre; todo debe quedar listo el 15): "el comercio describe su negocio o sube hasta 3 fotos, y la tienda queda lista con productos, textos y diseño".

Hoy eso existe por partes, y ninguna hace el recorrido completo:

- **Tienda en 1 clic** (D-324, `POST /v1/onboarding/tienda`): arma y publica la tienda, pero solo con los productos que YA existen y sin IA.
- **Diseño con IA** del editor (`/v1/sites/:id/disenar-ia`) y `crearSitioDesdeOpttia`: escriben textos y diseño, pero la tienda nace apagada, sin bodega ni formas de pago.
- **Ficha desde una foto** (`/v1/katuqintelligence/ficha-desde-foto`, bandera `productFromPhoto`): una foto, un producto, a mano y de una en una.

Juntarlas tarda más de 2 minutos (tres lecturas de IA por foto más textos y diseño), así que no cabe en una sola petición.

## What Changes

- **Un solo paso, en "Crear página".** Con la bandera `singleStepStore` prendida, la primera opción del asistente es "Tu tienda en minutos con IA": nombre del negocio, una frase de qué vende, hasta 3 fotos con su precio y el botón "Crear mi tienda".
- **El servidor responde al instante** con el id del sitio y sigue en segundo plano. El avance vive en el propio sitio (`sites.creationProgress`: estado, paso, productos listos, mensaje) y el navegador lo consulta con un GET cada 3 segundos. Cerrar la ventana no cancela nada.
- **Los productos nacen por la creación manual** (`controllers/productos.create`): referencia, índice de categoría, imágenes y sincronización con otras tiendas como siempre. El precio es el que escribió el comercio; sin existencias (`inventariable: false`) para no escribir inventario.
- **Textos y diseño por Opttia**, con tres frenos: lo que escribe la IA no puede traer precios, enlaces ni teléfonos; no puede esconder la vitrina; y la barra de anuncios no se toma de la IA.
- **Publica solo con al menos un producto con precio.** Con solo la descripción (o si todas las fotos fallan) la página queda como borrador diseñado y se dice qué falta.
- **Idempotente y a prueba de reinicios.** Un doble clic o un reintento no duplica productos ni sitios; si el servidor se reinicia a medias, el sitio queda "interrumpido" y se retoma sin repetir nada.
- **Cupos antes de empezar:** lecturas de fotos del plan, páginas con Opttia del mes y tienda publicada del plan gratis. Si no alcanza, mensaje claro y no se gasta nada.

## Capabilities

### New Capabilities
- `single-step-store`: tienda con productos, textos y diseño a partir de un nombre, una frase y hasta 3 fotos con precio.

### Modified Capabilities
- Ninguna archivada. Se apoya en `tienda-al-registrarse` (D-324: la misma tienda lista y honesta, `tiendaInicialDe`) y en `limites-plan-gratis-tiendas` (los cupos de Opttia y de tiendas publicadas).

## Impact

- **Backend (nuevos):** `functions/services/sites/tiendaEnUnPaso.js` (trabajo, cupos, avance), `tiendaEnUnPasoContenido.js` (reglas puras), `functions/controllers/tiendaEnUnPaso.js`. **Editado:** `functions/routers/onboarding.js` (dos rutas detrás de `requireFeature('singleStepStore')`).
- **Front (nuevos):** `components/sitios/tienda-en-un-paso/` (componente, servicio por `BaseService`, lógica pura). **Editados:** `sitios.module.ts`, `sitios-lista.component.{ts,html,scss}` (entrada y tarjeta "creándose").
- **Datos, sin colecciones nuevas:** `sites.creationProgress`, `sites.origen = "tienda-en-un-paso"`, `products.singleStepRequestId` y `products.fechaCreacion`, un evento `site_events` (`opttia_pagina`, id fijo) y las fotos en `Productos/tep_…` del mismo almacenamiento de siempre.
- **Rutas nuevas:** `POST /v1/onboarding/tienda-en-un-paso` y `GET /v1/onboarding/tienda-en-un-paso/:siteId` (las pidió Daniel; la regla de "sin endpoints nuevos" pide su aprobación, aquí explícita).
- **No-goals:**
  - no toca inventario, movimientos, pedidos, consecutivos, categorías ni productos que ya existen;
  - no cambia plantillas, rutas ni comportamiento de la tienda en 1 clic, del asistente ni del editor;
  - no conecta pasarelas: la tienda nace con las formas de pago del comercio y sin cobrar en la cuenta de Katuq;
  - no hay cola, colección ni proceso nuevo: el trabajo corre en el proceso de la API.
- **Riesgos:** ver `design.md` (el trabajo muere con un reinicio, plan de pago sin tope de IA, IVA en 0 %, empresas con catálogo grande).

## Apagado por defecto (regla de Daniel)

Nace APAGADA para ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS. Se enciende por comercio con `featureFlags.singleStepStore: true` en el documento de la empresa (`scripts/set-company-feature.js`) y se prueba primero en FLORECER. Con la bandera ausente las dos rutas responden 403 `FEATURE_DISABLED`, el front no dibuja nada y ninguna ruta, plantilla ni comportamiento existente cambia.
