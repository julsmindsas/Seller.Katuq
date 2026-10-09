## Context

Verificado en el código el 2026-10-08 (front: rama `feature/venta-asistida-mejorada`; backend: `backend-aws-security`; todo sin commit en el árbol de trabajo). Esta propuesta se escribió **después** del código, que se leyó entero y se probó; nada se aplicó ni se desplegó desde aquí.

- **K.A.I. hoy** es `POST /v1/katuqintelligence/ia` (`Controller.KAI`). El navegador manda el texto de la consulta (`prompt`) y, si hay foto, la foto. Con foto el servidor hace **dos** consultas seguidas a Opttia: la primera describe la foto (800 tokens, 60 s) y la segunda arma el producto con esa descripción (4.000 tokens, 90 s). Devuelve lo que el modelo escriba, sin validar. No se toca.
- **Opttia** es `pedirJsonAOpttia` (`services/ai/opttiaJson.js`, sin cambios) hacia el ADK, `POST /api/ai/json`, por Bedrock. Se leyó el ADK del repositorio (solo lectura): acepta `image_base64` como data URL (hasta 12 M de caracteres, 413 si pasa), un mensaje de sistema (`system`, lo corta a 2.000 caracteres) y un prompt de hasta 20.000 caracteres, con 40 s por cada modelo de su cadena de respaldo. El servidor real puede tener código que no está en el repo, así que la primera llamada en FLORECER lo confirma; K.A.I. ya manda fotos por este mismo camino.
- **El límite de IA** es `validateAILimit('products')` (`middleware/subscriptionValidator.js`): descuenta un uso con una transacción sobre `aiUsage` **antes** de llamar al modelo, con un contador por empresa, usuario y día. En el plan gratis son 10 por día (`productGenerationsPerDay`); en los de pago, sin tope.
- **Las banderas por comercio** son el contrato común de las funciones nuevas: campo `featureFlags` del documento de la empresa en `companies`; ausente o distinto de `true` = apagada. `services/companyFeatureFlags.js` (`FEATURE_FLAGS`, `isFeatureEnabled`, `requireFeature`) y `company-features.service.ts` en el front, con el mismo catálogo cerrado. Se prenden con `scripts/set-company-feature.js` (simulación por defecto) y la ficha de la empresa no puede escribirlas. Es la Fundación (propuesta `banderas-por-comercio`): no es de esta propuesta, solo depende de ella. Esa propuesta documenta un hueco que afecta a esta función: la ficha de empresa quita la llave `featureFlags` completa, pero deja pasar la llave con punto (`featureFlags.<bandera>`); se cierra allá (tarea 3.2) antes de desplegar cualquier función con bandera.
- **Las categorías**: el formulario de producto toma las de la colección `categorias`, filtrada por `company`, y usa el primer documento (un árbol serializado). El servicio las lee del mismo lugar y con el mismo ayudante (`categoriaTreeHelper.leerArbol`).

## Goals / Non-Goals

**Goals**
- Que crear un producto sea elegir una foto, revisar y guardar.
- Que lo que entra al formulario ya venga revisado por el servidor, no por el modelo ni por el navegador.
- Que la función nazca apagada y que, apagada, no cambie nada ni cueste nada.
- Que la empresa y la bandera salgan de la sesión firmada y no de lo que escriba el cliente.
- Que ningún error le llegue al comercio con jerga.

**Non-Goals:** los de `proposal.md`.

## Decisions

1. **Ruta nueva, no cambiar `/ia`.** K.A.I. lo usan los comercios hoy; cambiarle el contrato (consulta armada por el navegador, respuesta libre) cambiaría a los clientes actuales. Alternativas descartadas: un parámetro nuevo en `/ia` (mezcla dos contratos y deja la consulta en manos del navegador) y reemplazar `/ia` (cambia lo que hoy funciona). Unificar las dos rutas después de la feria queda como pregunta abierta. **El endpoint nuevo necesita aprobación explícita.**

2. **Una sola consulta y el prompt en el servidor.** El navegador manda solo `{ imagen }`. El prompt (español de Colombia, seis llaves, reglas por llave, categorías de la tienda, "lo que no se ve se deja vacío") y el mensaje de sistema (507 caracteres) se arman en el servidor, así que el navegador no puede cambiarlos. Hasta 1.500 tokens de salida y 55 s; el prompt base mide 1.579 caracteres y, aun con 5.000 categorías, 10.726 (el ADK acepta 20.000). Una consulta en vez de dos: menos espera y menos gasto.

3. **Lista cerrada de salida y saneado** (`sanearFicha`). La ficha se arma llave por llave (siete: `nombre`, `descripcion`, `categoria`, `colores`, `material`, `etiquetasSeo`, `imagenSinFondo`); lo demás que mande el modelo, incluido cualquier `precio`, no sale. Por qué: la IA lee texto escrito en las fotos y puede repetirlo. Los pasos, en `limpiarTexto`: se caen caracteres de control e invisibles, emojis, etiquetas HTML completas y **cualquier** `<` o `>` que sobre (también los de ancho completo: una etiqueta a medio abrir no es una etiqueta para el primer paso y el `>` de un HTML posterior la cerraría), markdown y encabezados. El nombre pierde montos (`$59.900`, `59.900 COP`, `59.900 pesos`); la descripción pierde las frases con precio, envío, garantía, devolución o reembolso (`peso` solo no cuenta: es el peso del producto) y se corta en un final de frase.

4. **La categoría es real o es nada** (`resolverCategoria`). Se aplanan solo las categorías **activas** (tope de 2.000 nodos, 6 niveles; al prompt van 300 líneas o 9.000 caracteres como máximo). Lo que conteste el modelo se vuelve a buscar en esa lista: por texto exacto (sin tildes, mayúsculas ni tipo de flecha) o por el último tramo si identifica UNA sola. Lo que se entrega son los nombres **originales** del comercio (con su emoji), que son los que compara el formulario. Si la lectura de `categorias` falla, la ficha sale igual sin categoría.

5. **La cadena de la ruta y su orden.** `auth` → `requireJwtTenant` (ya cubrían todo el router) → `requireFeature('productFromPhoto')` → `validarFotoFicha` → `validateAILimit('products')` → `fichaDesdeFoto`. Por qué ese orden: la bandera primero, para que apagada no pase nada (ni uso, ni IA, ni lecturas); la foto antes del límite, para que una foto que no sirve no cueste un uso; el límite antes de la IA, porque su reserva es transaccional y dos peticiones no pueden gastar el último uso. La prueba de la ruta fija el orden y que las 14 rutas anteriores siguen con los mismos manejadores.

6. **Falla cerrada y despliegue a medias.** El router y el controlador atienden 14 rutas de todos los comercios; un `require` suelto de un archivo que no llegó tumbaría el arranque de todos (PM2 reiniciando sin parar). Por eso: el router carga la compuerta dentro de un `try` y, si falla, la ruta responde siempre "función no activa"; el controlador carga el servicio **la primera vez que se usa** y, si no está, responde un aviso amable; y si faltan los manejadores, la ruta no se registra. El servicio y el recorte tampoco se cargan al arrancar.

7. **La empresa sale del token.** El manejador lee `req.tenant`, que deja `requireJwtTenant` desde la sesión firmada; sin él responde 403 sin leer nada. Ni el encabezado `company` ni el cuerpo cuentan. Las categorías se piden con `where("company", "==", tenant)`. La bandera se lee con la empresa del token, una lectura por petición, solo el campo `featureFlags`, sin caché.

8. **El recorte de fondo es una interfaz sin proveedor** (`services/media/backgroundRemoval.js`). Con `BACKGROUND_REMOVAL_PROVIDER` vacío —el estado de hoy— devuelve `null` sin hacer trabajo y sin llamar a nadie. Si algún día se registra un proveedor (`registerProvider`) corre en paralelo a la IA con 20 s de límite, su resultado se valida (PNG, WEBP o JPEG, hasta 12 M de caracteres) y **nunca** lanza hacia quien llama. Existe para fijar la forma del contrato (`imagenSinFondo`) sin cambiar la API después. Ningún componente usa hoy ese campo. Conectar un proveedor real necesita su propia propuesta (privacidad y costo).

9. **Front en tres piezas.**
   - `ficha-desde-foto.mapper.ts` es puro (sin Angular ni DOM) y concentra las reglas: qué campos se llenan (`planificarFicha`), cuáles se respetan, cómo se busca la categoría (por opciones planas en el rápido y por el nodo REAL del árbol en el completo), los avisos de error y el tratamiento de la foto. Los dos formularios usan las mismas reglas.
   - `FichaDesdeFotoService extends BaseService` hace lo común: revisa el uso del plan en el cliente, prepara la foto, pide la ficha, cancela a los 70 s (más que los 55 s del servidor y los 60 s del proxy) y traduce cada falla a un aviso. Los 401 y 403 los avisa el interceptor global y no se repiten.
   - Cada formulario pone los valores. La foto va en dos copias: una **reducida** a la IA (lado mayor 1.568 px, JPG al 85 %) y la imagen del producto, que es la original si es JPG, PNG o WEBP de hasta 5 MB, o un JPG reducido a 2.048 px si no. La imagen se sube al **guardar**, por el camino de siempre (en el completo, a la misma cola de imágenes pendientes, convertida a WebP).
   - Vigencia: cada pantalla cuenta (`generacionFicha`) las veces que dejó de ser "el producto de esta lectura" (se guarda, se registra otro, se sale). Una ficha que llega con otro número se descarta sin llenar ni avisar.

10. **Dónde viaja lo que el formulario rápido no muestra.** Material y colores se redactan ("Material: cuero. Colores: negro y café.") y viajan como `caracAdicionales`; las etiquetas, como `exposicion.etiquetas` (hasta 10). Los dos campos ya existían y arrancan vacíos, así que **el payload sin usar la función es idéntico al de hoy**. "Registrar otro" los limpia.

11. **UI según el sistema de diseño** (`openspec/specs/design-system/spec.md`).
    - *Formulario rápido* (ya sigue el tema canónico): sección tintada igual que K.A.I., con `pi-camera`, el chip "Nuevo", botón primario de acento `#5F3FE0`, ayuda `lite-ayuda` y el resumen "También se guardará con el producto" con "Quitar". Plano, sin degradados, y con los tokens del componente (`--k-accent`, `--k-ink`).
    - *Formulario completo* (legacy): un solo botón `mp-btn--ghost` en el encabezado, con el mismo estilo de "Vista previa" que ya tiene al lado. **Desviación justificada:** rediseñar ese encabezado está fuera del alcance.
    - *Avisos:* SweetAlert (nunca `confirm`), con botón principal `#5F3FE0` y secundario `#8f8bab`; el aviso final es un toast de 7 s que no tapa la pantalla.
    - *Accesibilidad:* el selector de archivo oculto se abre con el botón; `aria-label` en el input, `aria-busy` mientras lee y `role="status"` en el "Esto tarda unos segundos". En el celular, `accept="image/*"` ofrece cámara o galería.
    - *Nombre:* el texto sigue diciendo K.A.I., como la sección vecina.
    - *Desvío menor:* el borde `#ded4ff` del resumen se heredó del bloque de K.A.I. y no está en la tabla del tema (ver pregunta 13).

12. **Estilo Angular 14.** Los componentes ya existen con módulo; el código nuevo usa `*ngIf` y campos, como ellos (`@if` no existe en esa versión). El servicio es `providedIn: 'root'`. Las banderas se leen con el servicio compartido, nunca de `localStorage` dentro del componente (lo vigila una prueba). El servicio de banderas memoriza solo el resultado de interpretar el texto del almacenamiento y lo recalcula cuando el texto cambia; no guarda datos aparte.

## Contrato de la ruta

`POST /v1/katuqintelligence/ficha-desde-foto` · cuerpo `{ "imagen": "data:image/jpeg;base64,..." }` · 200 `{ success: true, ficha }`

```
ficha = {
  nombre: string,
  descripcion: string,
  categoria: { nombre, ruta: string[], etiqueta } | null,
  colores: string[],
  material: string | null,
  etiquetasSeo: string[],
  imagenSinFondo: string | null     // hoy siempre null
}
```

| Estado | `code` | Cuándo | Mensaje al comercio |
|---|---|---|---|
| 400 | `FOTO_INVALIDA` | no es imagen real, base64 roto, bytes que no son una foto | "No pudimos leer esa foto. Suba una imagen JPG, PNG o WEBP e intente de nuevo." |
| 413 | `FOTO_MUY_GRANDE` | más de 9.000.000 de caracteres (unos 6,7 MB) | "La foto pesa demasiado. Suba una de menos de 8 MB…" |
| 422 | `FICHA_SIN_DATOS` | la IA no identifica el producto o contesta basura | "No logramos identificar el producto en esa foto. Pruebe con otra…" |
| 503 | `IA_NO_DISPONIBLE` | la consulta a Opttia falla o vence | "No pudimos leer la foto en este momento. Intente de nuevo en un minuto…" |
| 500 | `FICHA_ERROR` | error inesperado, o el servicio no cargó | "Algo salió mal al preparar la ficha del producto. Intente de nuevo…" |
| 403 | `SIN_EMPRESA` | la sesión no trae empresa | "No pudimos identificar su empresa en esta sesión. Cierre sesión…" |
| 403 | `FEATURE_DISABLED` | bandera apagada (trae `feature: "productFromPhoto"`) | "Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos." |
| 403 | `AI_LIMIT_REACHED` | el plan no tiene usos (forma del límite compartido) | ver pregunta 4 |

El 403 de la bandera no lleva `error` ni nombra el token, así que el interceptor lo muestra tal cual y **no** cierra la sesión (`esSesionInvalida`); el título con el que lo muestra, "Suscripción", es la tarea 4.5 de `banderas-por-comercio`. Las respuestas del servidor traen solo el mensaje redactado para el comercio; el error técnico real se queda en el registro del servidor.

Topes: nombre 100 caracteres; descripción 1.000 y tres párrafos; material 60; color 30 (hasta tres palabras) y 6 colores; etiqueta 40 (hasta cuatro palabras) y 10 etiquetas; foto de la IA 1.568 px; imagen del producto 2.048 px; original hasta 15 MB. El aviso 413 del servidor dice 8 MB aunque el tope real es de unos 6,7 MB; desde la pantalla no se alcanza porque la copia que viaja ya va reducida.

## Qué escribe y qué lee

| Qué | Cómo |
|---|---|
| Lee `categorias` | `where company == empresa del token`; primer documento |
| Lee `companies` (`featureFlags`) | la compuerta, por `nomComercial` del token; una lectura por petición; sin caché |
| Lee `companies` (plan) | el límite de IA, para saber el tope |
| **Escribe `aiUsage`** | el contador del plan por empresa + usuario + día (ya existía; el mismo de K.A.I.). Es lo **único** que escribe la ruta |
| No escribe | `products`, variantes, precios, listas de precios, `inventory`, `inventoryMovement`, ni toca los flujos hacia Shopify |

El producto se escribe cuando la persona guarda el formulario, por el guardado de siempre, con `caracAdicionales` y `exposicion.etiquetas` que ya existían.

## Pruebas

| Spec | Pruebas (todas en verde el 2026-10-08) |
|---|---|
| `product-sheet-from-photo` | front: `tests/productos/ficha-desde-foto.test.js` (42), `ficha-desde-foto-componentes.test.js` (59: los dos formularios y el servicio corriendo con formularios reactivos reales) y `ficha-desde-foto-formularios.contract.test.js` (16) |
| `product-sheet-content-rules` | back: `functions/tests/ai/fichaDesdeFoto.test.js` (46) |
| `product-sheet-photo-and-plan` | back: `fichaDesdeFoto.test.js` (foto, prompt, errores), `fichaDesdeFotoRuta.test.js` (el orden de la cadena y el uso del plan) y `functions/tests/media/backgroundRemoval.test.js` (13); front: `ficha-desde-foto.test.js` y `-componentes.test.js` (foto y avisos) |
| `product-sheet-feature-flag` | back: `fichaDesdeFotoRuta.test.js` (13: apagada, JWT, rutas viejas, despliegue a medias), y de la Fundación `companyFeatureFlags.test.js` (33), `featureFlagsProtegidos.test.js` (14), `setCompanyFeature.test.js` (18); front: `ficha-desde-foto-formularios.contract.test.js` |

Sin red ni Firestore real: dobles en memoria. Los del front se corren con `node --test` (cargan el mapper con `ts-node` en `transpileOnly`, y los componentes transpilados); los del back, con `node tests/<ruta>.test.js` desde `functions/`.

## Risks / Trade-offs

- **[Llave con punto en la ficha de empresa]** → un administrador podría prenderse la función con `featureFlags.productFromPhoto` por la ficha de su empresa. Se cierra en la Fundación (`banderas-por-comercio`, tarea 3.2) y esta función no se despliega ni se enciende antes.
- **[El uso del plan se gasta aunque falle]** → es el comportamiento de K.A.I. y de la reserva transaccional del límite. La pantalla refresca el contador en los dos casos. Devolver el uso exige tocar el límite compartido (pregunta 3).
- **[El tope gratis se esquiva con el encabezado `user`]** → hueco previo del límite compartido; la ruta lo hereda. No se corrigió aquí porque cambia el comportamiento de todas las rutas de IA (pregunta 2).
- **[Sin tope de gasto en planes de pago]** → la bandera por comercio es el freno. Se enciende de a una empresa.
- **[Texto de la foto repetido por la IA: enlaces o teléfonos]** → la persona revisa antes de guardar; HTML, precio, envío, garantía y devoluciones ya se quitan (pregunta 6).
- **[Etiquetas y características hacia Shopify y WooCommerce]** → viajan al guardar, como las escritas a mano. Apagada la bandera, nada cambia; en FLORECER se confirma antes que no haya integraciones de catálogo encendidas.
- **[El ADK de producción difiere del repo]** → se verificó contra el repo; la primera llamada en FLORECER lo confirma, y K.A.I. ya usa el mismo camino con fotos.
- **[Foto de una persona o con datos personales]** → el prompt pide ignorar a quien sostiene el producto y devuelve vacío si la foto es solo una persona; la foto no se guarda en el servidor. K.A.I. ya enviaba fotos a Opttia por el mismo camino, pero no se revisó que la política de privacidad mencione las fotos de productos (pregunta 8).
- **[La lectura tarda]** → tope de 55 s en el servidor y de 70 s en el cliente, con aviso y formulario liberado. Una foto pesada con mala señal en el celular es el caso más lento: por eso la copia que va a la IA se reduce antes de enviarla.
- **[Imagen huérfana en el completo]** → "Reemplazar con la foto" saca la principal ya subida de la lista pero no la borra del almacenamiento: es la opción segura (nunca se borra nada).
- **[Front sin compilar]** → las pruebas no corren Angular de verdad; `npm run build` es tarea pendiente antes de integrar.
- **[Dos caminos para lo mismo en el formulario rápido]** → K.A.I. (texto o foto) y "Llenar con una foto" conviven; K.A.I. no se tocó.

## Migration Plan

1. Revisión independiente del código, `npm run build` del front sin errores (tareas 4 y 3.7) y la Fundación integrada con la llave con punto cerrada (tareas 1.3 y 1.4).
2. Commit en los dos repositorios, **solo** los archivos de esta función, con `git add` por ruta (nunca `-A`: otras sesiones editan los mismos repositorios).
3. Desplegar el **backend primero**: la ruta nace cerrada (responde "función no activa" a todos). Después el front: el botón no sale sin la bandera. La unidad de despliegue es la rama, no el commit: medir qué más viaja con ella. Leer `MANUAL-EC2` y la nota de los dos daemons de PM2 antes; el prod real es 13.222.206.185 (rama `backend-aws-security`).
4. Encender solo FLORECER: `node scripts/set-company-feature.js "FLORECER" productFromPhoto on` (simulación) y luego con `--execute`. Verificación en la tarea 5.
5. Los clientes actuales se deciden uno por uno, después de la feria. Cada uno va con su propia aprobación.
6. **Reversa:** `set-company-feature.js "<empresa>" productFromPhoto off --execute` cierra la ruta al instante para esa empresa; el botón desaparece cuando la persona vuelve a iniciar sesión. Si el problema fuera el despliegue del backend, quitar la ruta es revertir los dos archivos que se modificaron (solo se agregaron líneas) y las 14 rutas anteriores no dependen de ella.

## Open Questions

1. **Endpoint nuevo.** `POST /v1/katuqintelligence/ficha-desde-foto` es una ruta paralela a `/ia`. El `config.yaml` pide aprobación explícita para endpoints nuevos. ¿Se aprueba como ruta aparte, o se quiere unificar con `/ia` después de la feria?
2. **El usuario del tope de IA sale de un encabezado.** `validateAILimit` toma `req.headers.user` o `req.body.userId`, no el usuario de la sesión firmada, y con él arma el contador. Contradice la regla de que empresa y usuario salen del JWT. Quien cambie ese encabezado reparte su consumo y esquiva los 10 usos diarios del plan gratis. Es previo y de todas las rutas de IA. Recomendación: tomar el usuario de `req.user` (el `sub` del token) en un cambio aparte, porque toca a todas las rutas de IA. La empresa sí es la del token, porque `requireJwtTenant` la reescribe.
3. **¿Devolver el uso cuando la lectura falla?** Hoy un 503 (Opttia caído) o un 422 (no identificó el producto) cuestan un uso, y el plan gratis tiene 10 al día. Recomendación: devolverlo en esos dos casos. Requiere tocar el límite compartido.
4. **Mensaje del tope sin jerga.** El límite compartido responde "Has alcanzado el límite de N usos de **products**" y el interceptor lo muestra tal cual. La pantalla casi siempre se adelanta con su propio aviso, pero no si hay otra pestaña u otro usuario. Contradice "sin jerga". Recomendación: un texto propio para productos en el límite compartido (solo cambia el mensaje).
5. **Planes de pago sin tope.** ¿Se quiere un tope diario por empresa para esta ruta antes de encenderla en clientes reales?
6. **Enlaces y teléfonos escritos en la foto.** El servidor no los filtra. ¿Se quitan igual que el precio?
7. **Etiquetas de IA hacia Shopify y WooCommerce.** Al guardar, las etiquetas y características sugeridas por la foto se sincronizan como cualquier otra. ¿Está bien, o las de la IA no deben sincronizarse?
8. **Recorte de fondo y privacidad.** El recorte es una interfaz sin proveedor y el campo `imagenSinFondo` no lo usa ningún componente. ¿Se deja o se retira hasta que haya proveedor? Cualquier proveedor real saca las fotos de los comercios a un tercero y necesita su propia propuesta. Aparte: ¿la política de privacidad publicada el 25 de septiembre menciona las fotos de productos que ya van a Opttia (con K.A.I. y con esta función)? No se revisó.
9. **Medición.** No hay forma de saber cuántas fichas salen bien o dan 422 o 503, por empresa (solo el contador del plan y un `console.error` de los fallos técnicos). El proyecto prohíbe `console.log` para telemetría. ¿Se quiere medirlo para la feria, con una propuesta aparte que use auditoría?
10. **Español en el contrato.** Los campos de la respuesta (`nombre`, `descripcion`, `etiquetasSeo`…), los códigos de error (`FICHA_SIN_DATOS`…), los identificadores y el nombre de la ruta están en español, contra la regla "código y campos canónicos en inglés". Siguen el esquema de producto, que ya es en español, pero el contrato aún no se ha publicado: renombrar ahora es barato, después no.
11. **Bandera.** Dueño Daniel y fecha de retiro 2027-01-31 (Artículo XII) son una propuesta, la misma que `banderas-por-comercio` propone para todas las banderas; falta confirmarlos.
12. **Producción.** Confirmar con la primera llamada en FLORECER que el ADK real acepta la foto y el mensaje de sistema (tarea 5.8).
13. **Estilo.** ¿Se deja el borde `#ded4ff` del resumen (igual que K.A.I.) o se alinea con `#d9cffb` de la tabla del tema? Se resolvería junto con la reconciliación de colores que el sistema de diseño ya tiene abierta.
