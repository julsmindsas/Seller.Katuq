# Bot — preguntar solo lo que ese producto necesita

## Why

Hoy el bot pregunta lo mismo para todo: entrega, fecha, adiciones, tarjeta.
Pero en Katuq **cada producto declara qué necesita** en `procesoComercial`:
`llevaCalendario`, `aceptaAdiciones`, `llevaTarjeta`, `aceptaVariable` (talla,
color), `aceptaComentarios`, `aceptaOcasion`, `aceptaGenero`,
`aceptaColorDecoracion` — y un interruptor maestro,
`configProcesoComercialActivo`. Venta asistida ya respeta eso: muestra solo
los paneles que aplican.

Consecuencias de no mirarlo, dos y ninguna menor:

1. **El bot pide lo que no corresponde.** A quien compra una vela suelta le
   ofrece globos y le pide fecha de entrega como si fuera un desayuno
   sorpresa. Cansa y hace ver desordenado al comercio.
2. **Y peor: bloquea ventas.** El cierre exige hoy forma y fecha SIEMPRE. Un
   producto con `llevaCalendario: false` no tiene por qué pedirlas — pero el
   bot no cierra hasta tenerlas. Es un candado sobre una puerta que no existe.

Al revés también falta: un producto con **variables** (talla, color) hoy se
vende sin preguntarlas, y esa elección es justo la que después no llega a
producción (ver la regla dura de que talla y color viajan por el mecanismo
nativo de variables/preferencias).

## What Changes

1. **El contexto del turno lleva, por cada producto del carrito, qué acepta**:
   calendario, adiciones, tarjeta, variables (con sus opciones), comentarios,
   ocasión, género, color. Sale de `procesoComercial` del producto, que el
   backend ya lee.
2. **El agente pregunta SOLO eso.** Si el producto no acepta adiciones, no las
   menciona; si no lleva tarjeta, no ofrece dedicatoria; si no acepta
   comentarios, no pide notas.
3. **Las variables se preguntan y son obligatorias** cuando el producto las
   declara: sin talla o color elegidos no se cierra, porque el pedido saldría
   incompleto a producción.
4. **El gate de cierre se vuelve por producto**: forma y fecha se exigen solo
   si algún producto del carrito lleva calendario. Si ninguno lo lleva, el
   pedido cierra sin ellas.
5. **Más opciones tocables** (ya se confirmó que WhatsApp las muestra): al
   elegir variable, al ofrecer adiciones, y **al confirmar el cierre**
   ("Confirmar pedido" / "Sigo comprando").

## Capabilities

### New Capabilities
- `whatsapp-bot-perfil-de-producto`: el bot conoce y respeta lo que cada
  producto declara en `procesoComercial`; variables obligatorias; gate de
  cierre calculado según el carrito real.

### Modified Capabilities
- `whatsapp-bot-producto-configurado`: adiciones y preferencias solo cuando el
  producto las acepta.
- `whatsapp-bot-interactivo`: opciones tocables también para variables,
  adiciones y confirmación de cierre.

## Impact

- **Backend**: el despachador lee `procesoComercial` de los productos del
  carrito (misma lectura de `products` que ya hace el cierre) y arma el perfil;
  el gate de cierre pasa a depender del perfil; el cierre guarda las variables
  elegidas por el mecanismo nativo (preferencias/variables del ítem), NUNCA en
  un campo inventado.
- **ADK**: el contexto trae el perfil por producto; herramienta
  `elegir_variable(producto_id, variable, valor)`; instrucciones de "preguntá
  solo lo que el producto acepta" y de confirmar el cierre con botones.
- **Riesgos**: productos sin `procesoComercial` (o con
  `configProcesoComercialActivo: false`) deben tratarse como "no requiere
  nada" y cerrar sin fricción — hoy el catálogo tiene de los dos tipos, así
  que el default importa; y el perfil crece el contexto, aunque solo con los
  productos que el cliente ya puso en el carrito (no el catálogo entero).
