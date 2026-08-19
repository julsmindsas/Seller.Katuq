# Bot — opciones tocables (botones y listas de WhatsApp)

## Why

Hoy todo el pedido se arma escribiendo, y ahí se pierde gente: la clienta
tiene que teclear "domicilio", "Nequi", el nombre exacto de una adición. Eso
es fricción pura y además es la **causa raíz de los dos bugs que ya costaron
cierres**: el bot tuvo que adivinar si "recogen en tienda" era "Recoge en
tienda", y "sal" casi cae en "Salsa de la casa". Con un botón, la respuesta
llega con un **identificador exacto** — no hay nada que emparejar.

WhatsApp lo soporta de fábrica (mensajes interactivos de Meta: hasta 3
botones de respuesta, o una lista de hasta 10 opciones) y **cuesta lo mismo
que un mensaje de texto**. Katuq ya manda por el formato Meta de Kapso, así
que es el mismo camino de salida.

**Y hay un hueco abierto ahora mismo:** el webhook ya sabe leer la respuesta
de un botón (`interactive.button_reply`), pero el bot corta todo lo que no sea
texto — si hoy mandáramos botones, el bot le contestaría a su propia clienta
"por ahora solo leo texto". Esta propuesta lo cierra.

## What Changes

1. **El bot puede ofrecer opciones tocables** donde hoy pregunta abierto:
   - **Entrega**: "¿Domicilio o recoges?" con las formas reales del maestro.
   - **Medios de pago**: lista con los del comercio.
   - **Adiciones**: "¿Le sumamos chocolates por $12.000?" → Sí / No.
   - **Productos encontrados**: lista con nombre y precio en la descripción.
   - **Cierre**: "¿Cerramos el pedido?" → Sí, cerrar / Sigo comprando.
2. **La respuesta de un botón se atiende como un mensaje más** (hoy se
   ignora): el turno entra con el texto del botón Y con su identificador.
3. **El identificador manda sobre el texto**: si el cliente tocó el botón de
   "Recoge en tienda", el backend aplica esa forma del maestro **sin pasar por
   el emparejado difuso**. El texto libre sigue funcionando igual que hoy.
4. **El agente propone, el backend dispone**: el agente anota qué opciones
   quiere ofrecer; el backend las valida contra los maestros reales, respeta
   los límites de Meta (3 botones / 10 filas de lista, títulos de 20 y 24
   caracteres) y **decide botones o lista**. Si algo no cuadra —opciones
   inventadas, títulos largos, proveedor sin soporte— sale **texto plano con
   las opciones enumeradas**: la conversación nunca se rompe por esto.

## Capabilities

### New Capabilities
- `whatsapp-bot-interactivo`: envío de botones y listas con opciones validadas
  contra los maestros, degradación a texto, y atención de la respuesta tocada
  (identificador exacto por encima del texto).

### Modified Capabilities
- `whatsapp-bot-conversacion`: los mensajes de tipo interactivo dejan de caer
  en el aviso de "solo leo texto" y se atienden como un turno normal.

## Impact

- **Backend**: `kapsoService.sendInteractive` (formato Meta: `button` y
  `list`); camino de salida acepta `opciones` (mismo cobro: un mensaje);
  webhook pasa el `id` de la opción tocada; despachador deja pasar
  `interactive`, aplica el id sobre los maestros y valida/recorta lo que el
  agente propuso.
- **ADK**: herramienta `ofrecer_opciones(pregunta, opciones)` — etiquetas y un
  valor canónico por opción; instrucciones de cuándo conviene (elegir entre
  pocas cosas conocidas) y cuándo no (preguntas abiertas).
- **Sin cambios de frontend**: el buzón ya muestra el texto del botón como
  mensaje del cliente.
- **Riesgos**: (1) hay que confirmar en producción que Kapso reenvía
  `type: interactive` — si no lo soporta, la degradación a texto deja todo
  funcionando igual y se ve en un log; (2) los interactivos solo valen dentro
  de la ventana de 24 h, que es justo donde vive el bot; (3) no abusar: una
  conversación llena de botones se siente robot — se usan donde hay opciones
  cerradas, no para todo.
