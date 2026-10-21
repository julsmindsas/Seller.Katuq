# Diseño — Fase 2: quitar o reemplazar el fondo con IA (TX-37·6)

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Aplica D-518 TX-37·6: «Diseñarla ya con el recorte de fondo de Bedrock, con costo por foto confirmado y cupo por plan. Se enciende con el OK de Daniel del costo». Es también la «propuesta propia (privacidad y costo)» que pedía `ficha-desde-una-foto/design.md` (decisión 8) para conectar un proveedor real a `services/media/backgroundRemoval.js`. Va después de la fase 1 en `on`. Respeta lo aprobado en D-501 sobre el gasto: «la vista previa solo cobra la muestra. Lo procesado se guarda como la foto que se aplicará (no es caché), y aplicar no vuelve a pagar» (`proposal.md`, Fase 2). Seguridad: **ver revisión privada**. Revisado el 21-oct contra la crítica.

## Qué resuelve

La fase 1 solo recorta bordes de color parejo (`trim`, `utils/productPhotoUniform.js:237-266`). Un fondo de escena o de color a sangre (el verde lima de Almara) queda como un recuadro dentro del lienzo. La fase 2 separa el producto de su fondo y lo pone sobre el fondo uniforme elegido (blanco, gris claro o el color de la marca). Es el título del ticket: «con IA: quitar o unificar fondo».

## Costo por foto (lista oficial de AWS)

Lista de precios pública de AWS (`AmazonBedrock`, `us-east-1`, publicada el 2026-10-16; la verificaron el autor y la crítica), modelo **Amazon Nova Canvas**, imagen a imagen (`I2I`), que es el tipo del recorte de fondo:

| Resolución | Estándar | Premium |
|---|---|---|
| Hasta 1024 × 1024 | **US$0,04** por imagen | US$0,06 |
| Hasta 2048 × 2048 | US$0,06 | US$0,08 |

- **Diseño:** la foto va al modelo a 1024 px o menos de lado mayor (franja de US$0,04). La máscara que devuelve se agranda y se aplica a la foto original a su resolución (el lienzo llega hasta 1920 px). Pregunta 7.
- **Lo que falta confirmar:** con qué franja cobra AWS la tarea de recorte. La tarea 9.1 corre 10 fotos de FLORECER con la autorización de Daniel y compara la factura (Cost Explorer, `usagetype` `USE1-NovaCanvas-I2I-*`) con la tabla. Si no coincide, se corrige este documento antes de pedir el OK.
- **Escala:** 100 productos con 3 fotos = 300 usos ≈ US$12. Una categoría de 340 productos ≈ US$13,60 solo con la portada y ≈ US$40,80 con 3 fotos cada uno. OH MY STORE sigue fuera (TX-37·5).

## Decisiones

### F2.1 Proveedor e interruptores (D-505, D-257)

- **Camino:** backend → ADK (Opttia) → Bedrock. El backend no llama al modelo (D-257). Proveedor `opttia` en `backgroundRemoval.js` (`registerProvider`, `:54-66`) que hace `POST` al ADK con `X-Bot-Token`, como `services/ai/opttiaJson.js`.
- **ADK** (repo `kai/adk_agent`, hoy sin modelos de imagen): ruta nueva `POST /api/ai/background-removal` junto a `/api/ai/json` (`endpoints/site_design_endpoint.py:138`). Recibe bytes en base64, nunca una URL. Llama `amazon.nova-canvas-v1:0` con `taskType: "BACKGROUND_REMOVAL"` y devuelve PNG con transparencia. Se despliega por systemd (`kai-adk`), no por PM2.
- **Interruptores en `config/feature_flags`** (D-505, D-518), no en el `.env`, con el mismo lector sin caché y el mismo script por rutas de campo de `design-ampliacion.md` §A1:
  - `backgroundRemovalProvider`: `""` (hoy) o `"opttia"`. Reemplaza `BACKGROUND_REMOVAL_PROVIDER` (`backgroundRemoval.js:37,69-71`). `getProviderName` e `isConfigured` (`:69`, `:96`) pasan a ser asíncronas; sus llamadores se ajustan.
  - `backgroundRemovalUses`: lista de usos permitidos; nace `["productPhotos"]`. `removeBackground` recibe `{ uso }` y, si el uso no está, devuelve `null` sin llamar a nadie. Así encender el proveedor **no** enciende el recorte en «ficha desde una foto» (`services/ai/fichaDesdeFoto.js:721`), donde nadie usa el resultado (`imagenSinFondo`) y solo sería gasto. Pregunta 8.
- **Bandera por comercio** nueva `productPhotoBackground`, en los dos catálogos de banderas, nace apagada y exige además `productPhotoUniform`. Dueño: Daniel. Retiro: 2027-06-30 (Artículo XII).
- **Modo:** el mismo `productPhotoUniformMode` de la fase 1.
- **Encendido:** solo con el OK de Daniel al costo (tarea 9.1) y la revisión de privacidad (F2.5). Antes de eso, `backgroundRemovalProvider` queda vacío y la opción no aparece.

### F2.2 Proceso de una foto con «Quitar fondo»

Ajuste nuevo del lote `settings.backgroundMode`: `"keep"` (fase 1, por defecto) o `"replace"`, y `settings.backgroundScope`: `"cover"` (solo la portada) o `"all"` (pregunta 6). Con `"replace"`:
1. Se lee el original (o la copia de la fase 1b) con la regla de pertenencia de siempre.
2. **Recorte guardado:** se calcula la huella del origen (SHA-256 de sus bytes, 16 caracteres) y se busca `Productos/uniformes/<companyDocId>/recortes/<huella>-<versión del modelo>.png` con `metadata.company` de la empresa. Si existe, se usa y **no se paga**. La ruta no depende del lote ni de `processed`, así que sirve también después de revertir y para lo que pagó la vista previa.
3. Se valida **antes de gastar**, como `validarFotoAntesDelCupo` (`fichaDesdeFoto.js:783-790`). Además de formato y tamaño, los topes de entrada del modelo según su documentación oficial (Amazon Nova, «Supported image resolutions»): cada lado entre 320 y 4.096 px, proporción entre 1:4 y 4:1, menos de 4.194.304 píxeles, PNG o JPEG de 8 bits por canal y sin píxeles transparentes. La foto se aplana y se convierte a PNG antes de enviarla (las fotos del formulario están en WebP). Si no cumple, `background_input_invalid` y no cuesta.
4. Se descuenta un uso del cupo (F2.3) y se reduce a 1024 px de lado mayor para el modelo.
5. Se pide el recorte, con el tope de 20 s y la validación de salida que ya tiene `backgroundRemoval.js` (`:111-131`, `:134-140`). La llamada **no** ocupa el semáforo de CPU de `sharp` (`concurrency.js`): tiene su propio límite por proceso (2 llamadas a la vez). Solo el trabajo de `sharp` antes y después toma el turno de CPU.
6. **Falla del proveedor** (respuesta vacía, error o tiempo agotado): el uso **se devuelve** (F2.3) y la foto queda `background_unavailable`. Si fallan 3 fotos seguidas del mismo lote, el lote o la serie se detienen con `stopCode: "ai_unavailable"`, sin gastar más.
7. **Control de calidad:** si el producto ocupa menos del 3 % o más del 98 % del área, el recorte falló: la foto se omite con `background_unclear` y queda como estaba. El uso se pagó y **no** se devuelve; el recorte se guarda igual (marcado como dudoso) para no volver a pagar el mismo resultado.
8. Logos y marcas sobre el fondo (F2.4).
9. La máscara se agranda a la foto original. El producto queda sobre el fondo elegido, sin transparencia en el resultado: la tienda, los feeds y la portada JPEG necesitan fondo opaco. Pregunta 9.
10. Sigue la tubería de la fase 1 sin cambios: recorte por la máscara, lienzo, WebP, portada JPEG y sin EXIF.

**El recorte guardado** (paso 2) lleva `metadata.company`, `productoId` y la versión del modelo, **sin** token de descarga: no es público y solo lo lee el servidor. `processed.cutoutPath` lo anota, solo como referencia.

**Vista previa y sombra** (→ D-518 reemplaza, solo con «Quitar fondo», el requisito aprobado «Vista previa sin escrituras» y la prueba «vista previa: cero escrituras» de la tarea 1.2):
- **Solo con el modo en `on`.** La vista previa con «Quitar fondo» paga hasta 3 usos y **guarda los recortes** (paso 2): al aplicar, esas fotos no se vuelven a pagar, como dice D-501. Antes de pedirla, el diálogo dice «La vista previa usa hasta 3 de tus N usos del mes». No escribe `products`, historial ni lotes.
- **Solo para administradores** (P18): ver la vista previa sin IA sigue abierto a cualquiera con la bandera (P9), pero gastar el cupo no.
- **Con el modo en `shadow`** la vista previa no ofrece «Quitar fondo» y el lote **no** llama al modelo: cuenta las fotos que lo usarían (`would_remove_background`) y los usos que costaría, descontando las que ya tienen recorte guardado. Así la sombra sigue sin escribir Storage.

### F2.3 Cupo por plan

- Nuevo uso de IA `photoBackgrounds` en `services/aiLimitsService.js` (`getFeatureLimit`, `:27-47`): mensual y **por empresa** (con el usuario fijo de empresa, como `pageEdits` en `controllers/paginaConIA.js:138-148`), campo `photoBackgrounds`.
- Límite `photoBackgroundsPerMonth` en `config/subscriptionLimits.js` (`ai`), en `freemium`, `paid` y el alias `premium` (hoy `getLimitsForPlan` devuelve `paid` para todo plan que no es `freemium`, `:123-128`; `premium` se llena igual por si alguien lo lee). **Si el valor falta o no es un entero ≥ 0, vale 0**, nunca `-1` ni ilimitado (hoy `pageEdits` ausente vale `-1`, `:36-42`): cada foto tiene costo real. Valores: pregunta 6.
- **Devolución:** función nueva `devolverAILimit(company, userId, feature, amount)`, transaccional, que resta sin bajar de 0. Solo se usa en el paso 6 de F2.2 (el proveedor no respondió); nunca por una foto de mala calidad.
- La empresa sale del JWT (`req.tenant`), no de la cabecera.
- **Al crear el lote** se estima cuántas fotos usarán el modelo (las elegibles según `backgroundScope`, sin recorte guardado). Si pasan de los usos que quedan: 422 `AI_QUOTA_INSUFFICIENT`, con «Te quedan N usos este mes y este lote necesita M. Elige menos productos o quita el fondo solo de la portada».
- **Durante el lote**, si el cupo se acaba (otro lote u otra persona lo usó): el lote o la serie para (`stopped`, `stopCode: "ai_quota"`). Lo hecho queda reversible. No se mezcla un pedazo con IA y otro sin IA en la misma categoría. Pregunta 10.
- El descuento es transaccional (`consumeAILimit`, `:146-200`). Si el proceso se cae entre el descuento y el guardado del recorte, la retoma paga otra vez esa foto: riesgo aceptado y medido en `metrics.aiUsesConsumed`.

### F2.4 Marca de agua y logo (TX-37·2, la parte de «quitarlos con IA»)

Con el fondo ya separado, un logo **sobre el fondo** (el «Almara» de la esquina) aparece en la máscara como una pieza suelta. Se descarta con la misma regla de la fase 1 (`possible_watermark`, `design-ampliacion.md` §A6), ahora sobre la máscara: componente pequeño, separado del producto y en esquina o franja de borde. No cuesta un uso extra.
- **No entra:** un logo o una marca semitransparente **encima del producto**. Quitarlo exige pintar lo que hay debajo (otra tarea del modelo, con otro costo) y puede alterar el producto. Sigue el aviso. Si Daniel lo quiere, va en otra propuesta.

### F2.5 Privacidad

- La foto viaja del backend al ADK y a Bedrock, dentro de AWS, por el mismo camino que ya usa Opttia para texto e imágenes (ficha desde una foto). No se guarda en el ADK.
- **Antes de encender:** Daniel confirma que la política de privacidad publicada cubre las fotos de producto procesadas por un proveedor de IA (pendiente desde `ficha-desde-una-foto/design.md`, pregunta 8). Tarea 9.2.
- La pantalla dice «Quitar fondo», nunca el nombre del modelo ni del proveedor (Artículo VI).

## Write-set de la fase 2

| Escribe | Solo lee | Nunca |
|---|---|---|
| Lo de la fase 1 por producto, más `processed.backgroundMode` y `processed.cutoutPath`; el recorte en `Productos/uniformes/<companyDocId>/recortes/…` (lote en `on` y vista previa en `on`); `aiUsage` (campo `photoBackgrounds`) por `consumeAILimit` y `devolverAILimit`; `config/feature_flags` solo por el script, con `--execute` y por rutas de campo | El original o la copia propia; el recorte guardado; el plan de la empresa | Otro campo de `aiUsage`; `companies`; precios, inventario, categorías, `integrations`, `exposicion`; archivos ajenos; borrar |

`writeset.contract.test.js` suma: en sombra, cero llamadas al proveedor, cero descuentos y cero archivos; con el uso fuera de `backgroundRemovalUses`, cero llamadas; un lote sin cupo no escribe `products`; la vista previa con «Quitar fondo» solo escribe el recorte y `aiUsage`, nunca `products`, historial ni lotes; con recorte guardado, cero descuentos.

## Pruebas primero

- **Caracterización:** `consumeAILimit` y `getFeatureLimit` con los usos de hoy (`voice`, `video`, `chat`, `products`, `pageEdits`) intactos; `removeBackground` sin proveedor sigue devolviendo `null` sin trabajo (pruebas existentes de `backgroundRemoval`).
- **Contrato:** la ruta del ADK (token, tamaño, sin URL, salida PNG) con el modelo simulado; el proveedor `opttia` con respuestas buenas, lentas, vacías y basura; la llamada fuera del semáforo de CPU y con su límite de 2.
- **Puras:** topes de entrada del modelo; control de calidad de la máscara; máscara agrandada; logo suelto descartado; sin transparencia en la salida.
- **Lote:** estimación del cupo con `backgroundScope`, `AI_QUOTA_INSUFFICIENT`, parada `ai_quota`; 3 fallas seguidas → `ai_unavailable` con los usos devueltos; reuso del recorte sin pagar, también después de revertir y después de la vista previa; `photoBackgroundsPerMonth` ausente → 0 en todos los planes.

## Riesgos

- **Calidad:** vidrio, pelo, productos blancos sobre blanco. La vista previa, la exclusión por foto y la reversión siguen; la tarea 9.1 lo mide con fotos reales.
- **Costo descontrolado:** acotado por el cupo mensual por empresa (techo real, porque el limitador de vistas previas vive en memoria por proceso), la estimación al crear, la sombra sin llamadas, el recorte guardado y la vista previa con IA solo para administradores.
- **ADK caído o lento:** el uso se devuelve, la foto queda como estaba y a la tercera falla seguida el lote para (`ai_unavailable`).
- **Cupo contra «una categoría completa»:** con un cupo bajo, una categoría grande se rechaza al crear el lote. Pregunta 6.
- **Región:** Nova Canvas en `us-east-1`. Si el ADK usa otra región para Bedrock, la tarea 9.1 lo confirma.
