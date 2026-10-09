## Why

Daniel pidió (9-oct, para Effix) que un comercio pueda armar su tienda conversando con Opttia. El estudio del código mostró que el chat flotante de Katuq es de **solo consulta a propósito** (cinco candados: herramientas solo de lectura, recibo de cupo "read", política del ADK, sin memoria entre mensajes y sin tarjetas de confirmación), y que dar escritura al modelo cambiaría esas invariantes y exige revisión de seguridad. Daniel aprobó el camino mínimo y seguro: **el chat propone, el comercio confirma con un clic, y la tienda se crea por la pantalla y el endpoint que ya existen** (`singleStepStore`, D-385). El modelo no recibe ningún poder de escritura.

## What Changes

- **Herramienta de lectura nueva** `get_single_step_store_link` (back, `tools/getSingleStepStoreLink.js`): recibe el nombre del negocio y una frase de qué vende, las valida con las reglas de la tienda en un paso y devuelve un enlace a Mis páginas con esos datos precargados. No escribe nada, no crea nada, no gasta cupo de IA de productos.
- **La herramienta solo existe con la bandera `singleStepStore` prendida y para un administrador**: se filtra al armar la lista de herramientas del chat (`routers/opttia.js`) y se vuelve a revisar al llamarla (por nombre) y dentro de la propia herramienta. Con la bandera apagada el modelo ni la ve ni puede invocarla.
- **Pantalla** (front, `sitios-lista`): abre la tienda en un paso con nombre y descripción precargados cuando llega el enlace (`/sitios?tiendaEnUnPaso=1&nombre=…&descripcion=…`). El comercio revisa, puede agregar fotos con precio y da el clic. Solo con la bandera prendida; apagada, el enlace no hace nada.
- **Chip de sugerencia** en el chat ("Crear mi tienda") cuando la herramienta está disponible.
- El enlace nunca lleva fotos ni precios; con Shopify o WooCommerce el servidor ya se niega con fotos (D-385), y la herramienta lo avisa.

**No cambia:** los candados de solo lectura del chat, el ADK (puede ir sin tocarlo; una línea de prompt es opcional), pedidos, cobro, inventario ni checkout.

## Capabilities

### New Capabilities
- `chat-store-link`: la herramienta de lectura del chat que entrega el enlace precargado, su compuerta por bandera y rol, y la precarga en pantalla.

## Impact

- Back: `tools/getSingleStepStoreLink.js` (nuevo), `tools/toolRegistry.js` (registro), `services/opttiaAccessPolicy.js` (herramientas con compuerta), `routers/opttia.js` (filtro y revisión al llamar), `services/sites/tiendaEcommerceGuard.js` (la revisión de Shopify/Woo, compartida).
- Front: `sitios-lista` (query params), `tienda-en-un-paso` (entradas de precarga), chat de Opttia (chip).
- Límite a decir de frente: el chat no recuerda turnos; el comercio debe dar nombre y qué vende en **un** mensaje. Conversación de varios turnos, escritura desde el chat, tarjeta con botón dentro del chat y fotos por el chat quedan fuera (no entran antes del 15-oct).
