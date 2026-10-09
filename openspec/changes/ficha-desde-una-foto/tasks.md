## 0. Decisiones

- [x] 0.1 Regla de Daniel: toda función nueva nace apagada y se enciende por comercio con `featureFlags.<nombre>`; esta es `productFromPhoto`, y se prueba primero en FLORECER.
- [ ] 0.2 Daniel aprueba **esta propuesta**, incluido el endpoint nuevo `POST /v1/katuqintelligence/ficha-desde-foto` (el `config.yaml` exige aprobación explícita para endpoints nuevos) y el diff de los dos formularios de creación de productos (módulos sensibles: diff a la vista antes de integrar).
- [ ] 0.3 Responder las preguntas abiertas de `design.md`. Ninguna bloquea la prueba en FLORECER; la 2, 3, 4, 5 y 7 hay que decidirlas antes de encender la función en un comercio real.
- [x] 0.4 Registrar la decisión como D-385 en `specs/CONTRACT.md` (el número lo asigna quien haga el commit, mirando el contrato del remoto).
- [ ] 0.5 Confirmar el dueño (Daniel) y la fecha de retiro de la bandera: 2027-01-31 (Artículo XII), la misma que propone `banderas-por-comercio` para todas.

## 1. Fundación de banderas (dependencia; propuesta `banderas-por-comercio`, no es de esta)

- [x] 1.1 `productFromPhoto` está en el catálogo cerrado del backend (`functions/services/companyFeatureFlags.js`) y del front (`src/app/shared/services/company-features.service.ts`). Lo fijan `functions/tests/companies/companyFeatureFlags.test.js` (33) y `tests/productos/ficha-desde-foto-formularios.contract.test.js`.
- [x] 1.2 La ficha de la empresa descarta la llave `featureFlags` completa (`functions/controllers/companies.js` y `functions/services/companies/sanitizeCompanyUpdate.js`; `featureFlagsProtegidos.test.js`, 14) y `functions/scripts/set-company-feature.js` es la única vía de escritura, con simulación por defecto (`setCompanyFeature.test.js`, 18).
- [ ] 1.3 **Cerrar la llave con punto** (`featureFlags.productFromPhoto` pasa hoy por la ficha de empresa porque `sanitizarActualizacion` compara la llave entera): es la tarea 3.2 de `banderas-por-comercio`. Esta función **no se despliega ni se enciende antes**.
- [ ] 1.4 Integrar la Fundación **antes o junto con** esta función: sin ella los dos formularios no compilan (importan `CompanyFeaturesService`) y la ruta nueva queda cerrada para todos.

## 2. Servidor: la ficha (módulo sensible: rutas de K.A.I.; solo se agregaron líneas)

- [x] 2.1 Servicio `functions/services/ai/fichaDesdeFoto.js`: lista cerrada de salida sin precio, categoría real o vacía, textos limpios y con tope, una sola consulta a Opttia y errores en español para el comercio. Prueba `functions/tests/ai/fichaDesdeFoto.test.js` (46).
- [x] 2.2 La foto se valida por sus bytes y por tamaño (400 y 413) **antes** del límite de IA (`validarFotoAntesDelCupo`). Misma prueba.
- [x] 2.3 Manejador con la empresa del token (403 sin ella, sin leer nada) y lectura de `categorias` filtrada por esa empresa. Misma prueba.
- [x] 2.4 `functions/services/media/backgroundRemoval.js`: interfaz sin proveedor; devuelve `null`, nunca lanza, límite de 20 s y valida el resultado. Prueba `functions/tests/media/backgroundRemoval.test.js` (13).
- [x] 2.5 Ruta `POST /ficha-desde-foto` en `functions/routers/katuqintelligence.js` (+44 líneas) y manejadores en `functions/controllers/katuqintelligence.js` (+59), con la cadena bandera → foto → límite de IA → manejador y carga perezosa. Prueba de contrato `functions/tests/ai/fichaDesdeFotoRuta.test.js` (13): apagada = 403 sin gastar nada, empresa del token, las 14 rutas anteriores idénticas, despliegue a medias.
- [x] 2.6 `node --check` limpio en `fichaDesdeFoto.js`, `backgroundRemoval.js`, `controllers/katuqintelligence.js`, `routers/katuqintelligence.js` y `companyFeatureFlags.js` (2026-10-08).
- [ ] 2.7 Reinicio local del backend sin errores (no hay hot-reload). No se levantó el servidor al redactar esta propuesta.
- [ ] 2.8 Registrar las pruebas del backend como scripts `test:*` en `functions/package.json` (hoy se corren con `node tests/<ruta>.test.js` desde `functions/`; no se editó `package.json`).

## 3. Front: los dos formularios

- [x] 3.1 Parte pura `src/app/shared/services/productos/ficha-desde-foto.mapper.ts`: reglas de relleno, categoría, foto y avisos. Prueba `tests/productos/ficha-desde-foto.test.js` (42).
- [x] 3.2 `src/app/shared/services/productos/ficha-desde-foto.service.ts`: extiende `BaseService`, tope de 70 s, SweetAlert, refresca el contador de usos. Probado en `tests/productos/ficha-desde-foto-componentes.test.js` (bloques "servicio" y "prepararFoto").
- [x] 3.3 Formulario rápido, `crear-producto-lite.component.{html,scss,ts}`: sección con resumen y "Quitar"; el payload sin usar la función es el de siempre. Probado en `ficha-desde-foto-componentes.test.js` (59 en total).
- [x] 3.4 Formulario completo, `crear-productos.component.{html,ts}`: botón en el encabezado, descripción en HTML, nodo real del árbol de categorías e imagen a la cola de pendientes. Misma prueba.
- [x] 3.5 Contrato de cómo quedaron conectados (bandera, solo al crear, `BaseService`, sin `confirm`, sin precios, estilos planos): `tests/productos/ficha-desde-foto-formularios.contract.test.js` (16).
- [ ] 3.6 Registrar las pruebas del front como script de `package.json` (hoy: `node --test tests/productos/`; no se editó `package.json`).
- [ ] 3.7 `npm run build` sin errores. **No se compiló**: las pruebas no corren Angular de verdad y un error de plantilla o de tipos solo aparece al compilar.
- [ ] 3.8 Revisión visual con el servidor corriendo. Con la bandera apagada, las dos pantallas son idénticas a las de hoy; con la bandera prendida (FLORECER), tema, foco y `aria-busy` correctos, en celular y en escritorio.

## 4. Revisión independiente

- [ ] 4.1 Revisión de código por alguien que no escribió la función: el servicio, la ruta y los dos formularios. Puntos a mirar: el saneado del texto (`limpiarTexto`, `FRASE_PROHIBIDA`), que la empresa salga solo del token, el orden de la cadena, que apagada no cambie nada, y los dos formularios al guardar, al registrar otro y al salir de la pantalla.
- [ ] 4.2 Resolver los hallazgos y volver a correr las pruebas (72 del backend, 117 del front).

## 5. Verificación en FLORECER (front local apuntando a producción; con el backend ya desplegado)

- [ ] 5.1 Prender la bandera solo en FLORECER: `node scripts/set-company-feature.js "FLORECER" productFromPhoto on` (simulación) y después con `--execute`. Lo hace Daniel o quien tenga el permiso: esta propuesta no escribe en producción.
- [ ] 5.2 Cerrar sesión y volver a entrar (la bandera llega al iniciar sesión): aparece "Llenar con una foto" en los dos formularios y solo al crear.
- [ ] 5.3 Con sesiones de prueba que Daniel autorice de ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS: ninguna ve el botón y las pantallas son las de siempre. No abrir sesiones de clientes reales sin su permiso.
- [ ] 5.4 Formulario rápido, vacío: una foto real de un producto llena todo, la categoría es una real y la foto queda como imagen principal; al guardar, el producto queda con sus características y etiquetas.
- [ ] 5.5 Formulario rápido con datos escritos: una sola pregunta; "Solo llenar lo vacío" respeta lo escrito; "Reemplazar" cambia (la imagen incluida); cancelar no toca nada. Probar también "Quitar" y "Registrar otro".
- [ ] 5.6 Formulario completo: lo mismo, con la descripción en el editor, la categoría marcada en el árbol y las etiquetas en su pestaña; no cambia de pestaña si la persona estaba en otra.
- [ ] 5.7 Fotos que no sirven: un PDF, una imagen enorme, una foto sin producto (aviso amable de que no se identificó) y una foto de iPhone según el navegador.
- [ ] 5.8 **Primera llamada real a Opttia desde producción:** confirmar que el ADK real acepta la foto y el mensaje de sistema, y medir el tiempo (debe quedar bajo los 55 s del servidor).
- [ ] 5.9 Una foto con un precio y un "envío gratis" escritos: ni el precio ni esas frases entran al formulario.
- [ ] 5.10 Con una empresa del plan gratis de prueba (FLORECER es premium y no muestra el tope), agotar los usos y ver el aviso. No cambiar el plan de ninguna empresa real sin que Daniel lo decida.
- [ ] 5.11 Antes de guardar el producto de prueba, confirmar que FLORECER no tiene integraciones de catálogo encendidas (Shopify, WooCommerce) para que no suba a una tienda real; al terminar, desactivar los productos de prueba.
- [ ] 5.12 Apagar la bandera (`off --execute`) y comprobar que el servidor responde "función no activa" y que el botón desaparece al volver a iniciar sesión: todo vuelve a ser como hoy.

## 6. Cierre

- [ ] 6.1 Registrar la decisión con su número en `specs/CONTRACT.md`, con la bitácora de la sesión.
- [ ] 6.2 Commit en los dos repositorios: solo los archivos de esta función y de su Fundación, con `git add` por ruta (nunca `-A`: otras sesiones editan los mismos repositorios).
- [ ] 6.3 Desplegar el backend primero y el front después, según el plan de `design.md`. Leer `MANUAL-EC2` y la nota de los dos daemons de PM2 antes; el prod real es 13.222.206.185 y la unidad de despliegue es la rama, no el commit.
- [ ] 6.4 Después de la feria, decidir cliente por cliente si se enciende, cada uno con su aprobación.
- [ ] 6.5 Retirar la bandera según el plan: dueño Daniel, fecha propuesta 2027-01-31 (Artículo XII).
- [ ] 6.6 Registrar en la memoria del proyecto.

## Avance (2026-10-08)

- Código leído entero y probado sin tocar ningún repositorio: backend 72 pruebas (46, 13 y 13), front 117 (42, 59 y 16) y Fundación 65 (33, 14 y 18), todas en verde. `node --check` limpio en los cinco archivos del backend.
- No se compiló el front ni se levantó el backend.
- `openspec validate ficha-desde-una-foto --strict` pasa. Las cuatro specs caben en 3 páginas (la mayor, unas 1.100 palabras).
- Se verificó contra el ADK del repositorio (solo lectura) que `/api/ai/json` acepta la foto (hasta 12 M de caracteres), el mensaje de sistema (corta a 2.000) y el prompt (hasta 20.000); el prompt de la función mide 1.579 caracteres y con 5.000 categorías 10.726.
- Lo que el código dejó en duda quedó en las preguntas abiertas de `design.md`: endpoint nuevo, usuario del tope de IA tomado de un encabezado, uso que no se devuelve al fallar, mensaje del tope con jerga, planes de pago sin tope, enlaces y teléfonos en el texto, etiquetas hacia Shopify y WooCommerce, recorte de fondo sin proveedor, medición, contrato en español y el borde heredado de K.A.I.
