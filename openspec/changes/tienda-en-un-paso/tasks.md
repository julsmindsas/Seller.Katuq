## 0. Decisiones

- [x] 0.1 Daniel pidió la función (8-oct) con las reglas de diseño: precio siempre del comercio, trabajo con avance en el sitio, IA por Opttia, cupos antes de empezar, productos por la creación manual, empresa y usuario del token, sin descargar direcciones.
- [x] 0.2 Verificar contra el código actual (`design.md`, Context).
- [ ] 0.3 Registrar la decisión como D-??? en `specs/CONTRACT.md` (el número lo asigna quien haga el commit).
- [ ] 0.4 Daniel aprueba las rutas nuevas (`openspec/config.yaml` pide aprobación explícita para endpoints nuevos).

## 1. Backend

- [x] 1.1 `tiendaEnUnPasoContenido.js`: validación de la solicitud, precio, producto, filtros de la IA y diseño, interrupciones. Prueba `tests/sitios/tiendaEnUnPasoContenido.test.js` (37).
- [x] 1.2 `tiendaEnUnPaso.js`: cupos, idempotencia, trabajo, avance, reintento. Prueba `tests/sitios/tiendaEnUnPaso.test.js` (46 escenarios, con mutaciones comprobadas).
- [x] 1.3 `controllers/tiendaEnUnPaso.js` y las dos rutas en `routers/onboarding.js` detrás de `requireFeature('singleStepStore')`. Prueba `tests/sitios/tiendaEnUnPasoRuta.test.js` (13).
- [x] 1.4 Contrato del write-set: solo `sites`, `products`, `site_events`, `companies` (primera publicación) y `aiUsage`; jamás inventario, movimientos, pedidos, consecutivos, pagos, bodegas ni categorías.

## 2. Front

- [x] 2.1 `tienda-en-un-paso.logic.ts` (puro), `tienda-en-un-paso.service.ts` (BaseService) y `tienda-en-un-paso.component.*`.
- [x] 2.2 Entrada en "Crear página" y tarjeta "creándose" en la lista, solo con la bandera. Prueba `tests/sitios/tienda-en-un-paso.test.js` (48).
- [ ] 2.3 `npm run build` sin errores. **No se corrió** (regla de la sesión: nada de builds ni tsc); correrlo al integrar.
- [ ] 2.4 Revisión visual en móvil y escritorio con el servidor corriendo.
- [ ] 2.5 Subir en el mismo commit `ficha-desde-foto.service.ts` y `company-features.service.ts` (siguen sin commit y este componente los usa).

## 2b. Correcciones de la revisión (9-oct)

- [x] 2b.1 Enlaces de la IA: `[texto](destino)`, `//`, esquemas y dominios sueltos vuelven al texto de la plantilla.
- [x] 2b.2 Un solo trabajo sin terminar por empresa de verdad: revisión posterior a crear el sitio por `createTime` del servidor; el que cede borra su sitio y sus fotos; las fotos de otra solicitud igual no se borran.
- [x] 2b.3 Vigilante global en el latido (techo + 60 s): el trabajo colgado queda `failed` con mensaje amable y se puede reintentar; el que despierta tarde no escribe ni gasta.
- [x] 2b.4 El cupo de IA usa la misma llave que `validateAILimit` (encabezado `user`), sin escribirla en logs.
- [x] 2b.5 La tarjeta de la lista vuelve a ser la de siempre con la bandera apagada.
- [x] 2b.6 Huella del formulario: el mismo `requestId` con otros datos responde 409; el front genera un `requestId` nuevo si el formulario cambió.
- [x] 2b.7 Precio en pesos enteros (misma regla en servidor y front, con prueba cruzada); el precio guardado se revalida antes de crear el producto.
- [x] 2b.8 Un producto que terminó de crearse después del tiempo máximo cuenta como creado (al agotarse el tiempo y antes de los textos, también en el reintento).
- [x] 2b.9 Metadatos de la foto sin empresa ni correo; token de foto con una subllave del secreto.
- [x] 2b.10 Búsqueda de pendientes sin el tope de 20 y sin índices nuevos.
- [x] 2b.11 Pruebas nuevas para lo que sobrevivía a mutaciones (ficha reusada, `failed` bloquea, latido limpiado, `active.has`, techo entre pasos, topes de espera, `published`/`missing`, sondeo de la lista).
- [ ] 2b.12 No corregido a propósito: `/v1/sites/all` devuelve `creationProgress` crudo (es del propio comercio y `sites.js` no se toca aquí); `flush` se traga los errores de escritura (el avance se vuelve a escribir en el siguiente cambio y en cada latido).

## 3. Prueba de punta a punta en FLORECER (con la bandera prendida solo ahí)

- [ ] 3.1 `node scripts/set-company-feature.js` en simulación y con `--apply` para `singleStepStore` en FLORECER.
- [ ] 3.2 Con 3 fotos y precios: responde al instante, el avance pasa por los cuatro pasos y la tienda queda publicada en `<slug>.katuq.com` con los precios escritos.
- [ ] 3.3 Con una foto borrosa: se omite con aviso y el resto sigue.
- [ ] 3.4 Solo con la descripción: borrador diseñado, sin publicar, con el aviso de qué falta.
- [ ] 3.5 Cerrar la ventana a mitad de camino: la tarjeta dice "Creándose" y termina sola.
- [ ] 3.6 Reiniciar el servidor a mitad de camino: queda "sin terminar", "Retomar" termina sin duplicar productos (contar productos en Firestore).
- [ ] 3.7 Una empresa sin la bandera (ALMARA): las dos rutas dan 403 y la lista se ve igual.
- [ ] 3.8 Borrar la tienda de prueba y sus productos.
