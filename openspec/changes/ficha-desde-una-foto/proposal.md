## Why

Crear un producto en Katuq es llenar a mano título, descripción, categoría, características y etiquetas. La sección K.A.I. del formulario ayuda, pero con una foto hace **dos** consultas seguidas a la IA (primero describe la foto, luego arma el producto), el texto de la consulta lo arma el navegador y lo que contesta el modelo llega a la pantalla sin ninguna revisión del servidor: el formulario rápido, por ejemplo, rellena el precio y la disponibilidad con lo que el modelo escriba, y solo se protege con las guardas que la propia pantalla le pone.

Para la feria Effix (16 al 18 de octubre de 2026; todo listo el 15) se construyó **"Llenar con una foto"**: la persona elige UNA foto del producto, el formulario se llena con su ficha, y ella revisa, corrige y guarda. Es una de las funciones nuevas de la feria y, como todas, nace apagada y se enciende por comercio.

Esta propuesta se escribe **después** del código: ya está en el árbol de trabajo de los dos repositorios, sin commit, y no tenía propuesta ni decisión registrada. Las reglas del proyecto (Artículo I de la constitución y el `config.yaml` del front y del back) la exigen antes de integrarlo. Lo que sigue describe el código real, leído y probado el 2026-10-08. No se midió producción: no se leyó ni se escribió nada allá.

## What Changes

**Regla de Daniel:** toda función nueva nace **apagada** para los comercios que ya operan (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS) y se enciende comercio por comercio con `featureFlags.productFromPhoto` en el documento de la empresa. Se prueba primero en FLORECER (empresa demo). Ausente o distinta del booleano `true`, la función está apagada y todo queda **idéntico** a hoy.

### Lo que ve el comercio, con la bandera encendida

| | Qué pasa |
|---|---|
| Dónde | Solo al **crear** un producto. Formulario rápido: una sección "Llenar con una foto". Formulario completo: un botón en el encabezado. No sale al editar un producto ni en la configuración de dropshipping |
| Un solo paso | La persona elige la foto (JPG, PNG o WEBP; otros formatos que el navegador pueda abrir, como los del iPhone, se reducen a JPG) y el formulario se llena: título, descripción, categoría, material y colores (como "Características adicionales"), etiquetas de búsqueda y la foto como imagen principal |
| Nada se guarda solo | Todo queda a la vista para revisar. El producto se guarda cuando la persona pulsa Guardar, por el guardado de siempre |
| Lo escrito se respeta | Solo se llenan los campos vacíos. Si la foto trae algo distinto para un campo que ya tiene texto, se pregunta **una sola vez**: "Reemplazar con la foto" o "Solo llenar lo vacío". Cancelar no cambia nada. Las etiquetas se suman, nunca se quita una de la persona |
| Categoría | Siempre una categoría real de la empresa. Si ninguna calza, queda sin marcar y el aviso le dice que la elija |
| Precio | Nunca: ni precio, ni IVA, ni referencia, ni existencias. Si la IA escribe uno (o "envío gratis", "garantía", "devoluciones"), el servidor lo quita |
| Si falla | Un aviso en español claro que dice qué pasó y qué hacer; el formulario queda como estaba |
| Plan | Cada lectura cuenta un uso de la IA de productos del plan (en el plan gratis hoy son 10 por día y por usuario) |

### Lo que cambia en el servidor

- Una ruta **nueva y aparte** de la de K.A.I.: `POST /v1/katuqintelligence/ficha-desde-foto`. Va detrás de la sesión firmada, de la bandera, de la revisión de la foto y del límite de IA del plan, en ese orden. **Requiere aprobación explícita** (regla del `config.yaml`: nada de endpoints nuevos paralelos sin ella).
- Un servicio que hace **una sola** consulta a Opttia con la foto adentro, arma el prompt en el servidor y entrega la ficha **ya revisada**: lista cerrada de campos, sin precio, categoría real o vacía, textos limpios y con tope.
- Un módulo de recorte de fondo que hoy es **solo una interfaz sin proveedor**: devuelve vacío, no llama a nadie y nunca rompe la ficha.

### Qué NO cambia para ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR y ALMACEN BOMBAS

Sin la bandera (el estado de los cuatro), y verificado con pruebas:

- Los dos formularios de producto son los mismos: mismas secciones, mismos botones, mismo guardado. Lo guardado lleva `caracAdicionales` y `etiquetas` vacías, como siempre.
- K.A.I. y `POST /ia` quedan intactos, y las otras 13 rutas del mismo grupo también (mismos métodos, mismo orden, mismos manejadores).
- Quien llame la ruta nueva por la vía directa recibe "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.", sin gastar un uso del plan, sin consultar a la IA y sin leer categorías.
- La ficha y el recorte se cargan **la primera vez que se usan**, no al arrancar el API: aunque un despliegue llegue a medias, el API arranca igual.
- No hay llamadas nuevas a la IA ni a ningún tercero, ni escrituras nuevas.
- Los flujos de OH MY STORE hacia Shopify (`cereza-products-to-shopify-a5156643` y `katuq-web-to-shopify`), los productos, los precios, las listas de precios y el inventario no se tocan.

## Capabilities

### New Capabilities
- `product-sheet-from-photo`: el flujo en los dos formularios: un paso, lo escrito se respeta, categoría real, solo al crear, una lectura a la vez y sin mezclar productos.
- `product-sheet-content-rules`: lo que la ficha puede y no puede traer: nunca un precio, categoría de la empresa o nada, no se inventa, texto limpio y con tope.
- `product-sheet-photo-and-plan`: qué fotos se aceptan, qué sale hacia la IA, qué no se guarda, el uso del plan y los avisos sin jerga.
- `product-sheet-feature-flag`: nace apagada, se enciende por comercio, la empresa sale de la sesión firmada, un despliegue a medias no tumba nada y la función no toca productos, precios ni inventario.

### Modified Capabilities
- Ninguna archivada. K.A.I. (`POST /ia`) conserva su comportamiento.

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - Nuevos: `services/ai/fichaDesdeFoto.js` (805 líneas), `services/media/backgroundRemoval.js` (196), y sus pruebas en `tests/ai/` y `tests/media/`.
  - Modificados, **solo agregando**: `controllers/katuqintelligence.js` (+59 líneas: dos funciones nuevas que cargan el servicio al primer uso) y `routers/katuqintelligence.js` (+44: la compuerta y la ruta).
  - Se reutilizan sin cambios: `services/ai/opttiaJson.js`, `services/categoriaTreeHelper.js`, `middleware/subscriptionValidator.js` (`validateAILimit`) y `middleware/tenant.js`.
  - Dependen de la Fundación de banderas por comercio (propuesta `banderas-por-comercio`: el contrato común de las funciones nuevas, fuera de esta propuesta): `services/companyFeatureFlags.js` y `scripts/set-company-feature.js`, más el candado que impide que un comercio se escriba su propia bandera (`controllers/companies.js`, `services/companies/sanitizeCompanyUpdate.js`).
- **Front** (`Seller.Katuq`):
  - Nuevos: `src/app/shared/services/productos/ficha-desde-foto.service.ts` (274 líneas) y `ficha-desde-foto.mapper.ts` (669, la parte pura), y tres archivos de pruebas en `tests/productos/`.
  - Modificados: `crear-producto-lite.component.{html,scss,ts}` y `crear-productos.component.{html,ts}`.
  - Dependen de la Fundación: `company-features.service.ts` y el campo opcional `featureFlags` de `CompanyInformation.ts`.
- **Datos, sin colecciones nuevas:** el servicio **lee** `categorias` (filtrado por la empresa de la sesión) y la compuerta lee un campo de `companies`. Lo único que la ruta **escribe** es el contador de usos de IA del plan (`aiUsage`), el mismo que ya usa K.A.I.
- **Write-set declarado:** nunca `products`, variantes, precios, listas de precios, `inventory` ni `inventoryMovement`, y ningún flujo hacia Shopify. Lo fija una prueba de contrato (`fichaDesdeFotoRuta.test.js`: la única colección que toca el servicio es `categorias`, sin escrituras ni transacciones). El producto se escribe únicamente cuando la persona lo guarda, por el guardado de siempre.
- **Módulos sensibles tocados:** los dos formularios de **creación de productos** (el guardado y el consecutivo de la referencia no se tocan: lo prueban `ficha-desde-foto-componentes.test.js` y el contrato de formularios) y el grupo de rutas de K.A.I. (se agrega una ruta; las 14 de siempre quedan idénticas). **No** toca pedidos, inventario ni consecutivos. Va con diff y aprobación explícita antes de integrarlo.
- **Pruebas corridas el 2026-10-08, todas en verde:** backend 72 (`fichaDesdeFoto.test.js` 46, `fichaDesdeFotoRuta.test.js` 13, `backgroundRemoval.test.js` 13) y front 117 (`ficha-desde-foto.test.js` 42, `ficha-desde-foto-componentes.test.js` 59, `ficha-desde-foto-formularios.contract.test.js` 16). La Fundación de banderas suma 65 más (33, 14 y 18). `node --check` limpio en los cinco archivos del backend. **No se compiló el front** ni se levantó el backend.
- **Verificación contra la constitución:**
  - I (spec primero): esta propuesta.
  - II: las specs no nombran tecnología; va en `design.md`.
  - IV: la lectura no crea ni cobra nada fuera del contador de usos del plan; repetirla gasta otro uso (ver pregunta abierta 3 de `design.md`).
  - VIII: la ruta tiene prueba de contrato.
  - IX: HTTP por un servicio que extiende `BaseService`; el resto del artículo (signals, `@if`, OnPush) no aplica a componentes que ya existen en Angular 14, donde `@if` no existe: el código nuevo sigue el estilo de cada formulario.
  - XI: ni la foto ni la respuesta de la IA se escriben en ningún registro; solo el mensaje del error técnico.
  - XII: bandera con dueño y fecha de retiro (ver Decisión).
  - XIII: cada spec cabe en 3 páginas.
  - XIV: decisión D-385 (abajo).

## Risks

- **Módulos sensibles.** Los dos formularios de creación de productos y el grupo de rutas de K.A.I. los usan todos los comercios: un error ahí llega a todos aunque la bandera esté apagada. Lo acotan: solo se agregaron líneas, lo nuevo va detrás de la bandera (en pantalla y en el servidor), el servicio se carga al primer uso y las pruebas fijan que apagada todo queda igual (72 del backend y 117 del front). No toca pedidos, inventario ni consecutivos; sí toca el alta de productos, y por eso va con diff y aprobación explícita.
- **La ficha de empresa todavía deja prender banderas escritas campo por campo.** Quita la llave `featureFlags` completa, pero una llave con punto (`featureFlags.productFromPhoto`) pasa y Firestore la escribe como campo anidado: un administrador de comercio podría prenderse la función por la ficha de su empresa. Es el hallazgo 1 de `banderas-por-comercio` (se confirmó leyendo `sanitizarActualizacion`, que compara la llave entera). No es de esta función, pero **esta función no se despliega ni se enciende hasta que se cierre** (tarea 3.2 de esa propuesta).
- **El uso del plan se gasta aunque la lectura falle.** El límite de IA descuenta antes de consultar y no devuelve el uso si Opttia cae o no reconoce el producto. Con 10 usos al día en el plan gratis, un fallo cuesta un uso real. Es el mismo comportamiento de K.A.I.; devolverlo exige tocar el límite compartido (pregunta abierta).
- **El tope de IA del plan gratis se puede esquivar.** El contador se arma con el usuario que viene en un encabezado del navegador, no con el de la sesión firmada; cambiarlo reparte el consumo en otros contadores. Es un hueco previo del límite compartido que esta ruta hereda.
- **Sin tope de gasto en los planes de pago:** su límite de IA es ilimitado, así que el único freno de esta ruta es la bandera por comercio.
- **La IA puede repetir texto escrito en la foto.** El servidor quita HTML, precio, envío, garantía y devoluciones, pero no enlaces ni teléfonos; lo cubre que la persona revisa antes de guardar.
- **Las etiquetas y características de la foto viajan a Shopify y WooCommerce** al guardar el producto, igual que si las hubiera escrito la persona (el mapeo de Shopify copia `exposicion.etiquetas` a sus etiquetas). En los cuatro clientes actuales no ocurre porque la bandera está apagada; en la prueba de FLORECER hay que confirmar que no tenga integraciones de catálogo encendidas.
- **Producción puede diferir del repositorio del ADK.** Se verificó contra el ADK del repo (solo lectura): acepta la foto, el mensaje de sistema y el prompt. El servidor real puede tener código que no está ahí; la primera llamada en FLORECER lo confirma, y K.A.I. ya manda fotos por el mismo camino.
- **Si algún día se conecta un servicio de recorte de fondo,** las fotos de los comercios saldrían a un tercero (privacidad y costo). Hoy no hay ninguno y cualquiera necesita su propia propuesta.
- **El formulario completo deja en el almacenamiento** la imagen principal que "Reemplazar con la foto" saca de la lista (nunca se borra nada).
- **La bandera llega al iniciar sesión:** una empresa a la que se enciende en caliente ve el botón cuando vuelve a entrar, aunque el servidor ya la atiende.
- **La calidad depende del modelo:** una categoría equivocada pero real, o un color mal leído, son posibles. Por eso el aviso final dice "Revise y corrija lo que haga falta antes de guardar".
- **El front no se compiló.** Las pruebas son de lógica pura, de contrato leyendo los fuentes y de los componentes transpilados; un error de plantilla o de tipos solo aparece con `npm run build`.

## No-goals

- Quitar el fondo de la foto con un proveedor externo (queda la interfaz sin proveedor; la fase 2 necesita su propia propuesta).
- Cambiar K.A.I., `POST /ia` o el límite de IA compartido.
- Llenar o proponer precio, IVA, referencia, existencias, dimensiones o variantes, o crear el producto solo: siempre lo guarda la persona.
- Ofrecerlo al editar un producto, en la configuración de dropshipping o en la carga masiva (la carga masiva con fotos es otra función, `productImportPhotos`, con su propia propuesta: `importar-productos-con-fotos`).
- Leer varias fotos de un mismo producto: es UNA foto.
- Una pantalla para que el comercio encienda la bandera (la enciende el equipo con el script de banderas).
- Medir el uso de la función (no hay telemetría; el proyecto prohíbe `console.log` para eso).
- Tocar Shopify, WooCommerce, Siigo, pedidos o inventario.

## Decisión

Se registrará como **D-385** en `specs/CONTRACT.md` (el número lo asigna quien haga el commit, mirando el contrato del remoto).

Texto sugerido para el contrato:

> **D-385 (2026-10-08) — Ficha técnica del producto desde una sola foto, detrás de la bandera `productFromPhoto`.** Los formularios de producto (rápido y completo) ofrecen "Llenar con una foto" solo a las empresas con `featureFlags.productFromPhoto === true`; nace apagada para todas y se prueba en FLORECER. Una ruta nueva (`POST /v1/katuqintelligence/ficha-desde-foto`) hace una sola consulta a Opttia y entrega la ficha revisada: lista cerrada de campos, sin precio, categoría real de la empresa o vacía, textos limpios. No toca productos, precios ni inventario; el producto lo guarda la persona. El recorte de fondo queda como interfaz sin proveedor. Pendientes: revisión independiente, compilar el front y verificar en FLORECER.

**Bandera:** dueño Daniel; fecha de retiro propuesta **2027-01-31** (Artículo XII), la misma que propone `banderas-por-comercio` para todas las banderas; por confirmar. Al llegar la fecha se decide por empresa: dejarla encendida y retirar la bandera, o quitar la función.
