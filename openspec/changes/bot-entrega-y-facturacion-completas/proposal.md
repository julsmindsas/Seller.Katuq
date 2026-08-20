# Bot — preguntar a dónde va el domicilio y a nombre de quién se factura

## Why

Daniel lo probó y lo dijo directo: si elige domicilio, el bot **no pregunta
para dónde va**, y **nunca pregunta los datos de facturación**, como sí hace
venta asistida.

Al revisarlo el hueco es más hondo que la conversación:

1. **La dirección no se pregunta.** Si el cliente ya está registrado, el bot
   usa la dirección de su ficha sin confirmarla. Si es nuevo, pide "la
   dirección" como un texto suelto: sin ciudad, sin barrio, sin quién recibe.
2. **Y lo que se captura no llega estructurado.** La dirección termina como
   texto dentro de una nota de la cotización. Los campos `envio` y
   `facturacion` salen **vacíos**, y `cotizacionService` los lee de ahí al
   convertir a pedido — así que el pedido nace sin a dónde despachar y sin a
   quién facturar. El asesor tiene que releer la nota y volver a teclear todo.
3. **Facturación**: solo existe "a nombre de" con un NIT opcional, que también
   termina en la nota. Venta asistida captura razón social, tipo y número de
   documento, correo y dirección.

Un pedido tomado por el bot debería quedar tan despachable como uno tomado a
mano. Hoy no lo queda.

## What Changes

1. **Domicilio: se pregunta a dónde va, siempre.** Dirección y ciudad son
   obligatorias para cerrar un pedido a domicilio — también para el cliente
   registrado, a quien se le repite la que tenemos y se le pide confirmación.
   Opcionales, sin insistir: barrio o indicaciones para llegar, y quién recibe
   con su teléfono (por defecto, el cliente y el número del chat).
2. **Recoge en tienda no pregunta dirección** — se arma el `envio` de recogida
   con la misma forma que ya produce venta asistida.
3. **Facturación: se pregunta una vez.** "¿La factura va a tu nombre o a otro?"
   Si va a otro: nombre o razón social, tipo y número de documento, y correo.
   Si el cliente no quiere, se sigue sin repreguntar.
4. **Todo se guarda ESTRUCTURADO** en `envio` y `facturacion` de la cotización,
   con la forma canónica de venta asistida (`direccionEntrega`, `ciudad`,
   `barrio`, `nombres`, `celular`… / `nombres`, `tipoDocumento`, `documento`,
   `correoElectronico`…), además de la nota legible que ya existe.

## Capabilities

### New Capabilities
- `whatsapp-bot-datos-de-entrega`: el bot captura a dónde va el domicilio y lo
  deja estructurado en la cotización, lista para convertirse en pedido.

### Modified Capabilities
- `whatsapp-bot-cotizacion-configurada`: la cotización del bot lleva `envio` y
  `facturacion` con la forma de venta asistida, no solo una nota de texto.

## Impact

- **ADK**: herramientas `configurar_direccion_entrega` y
  `configurar_facturacion` (reemplaza a `facturar_a_nombre_de`, que se queda
  corta); instrucciones de preguntar la dirección al elegir domicilio y de
  ofrecer la facturación una sola vez.
- **Backend**: el cierre arma `envio`/`facturacion` canónicos y el gate de
  cierre exige dirección y ciudad cuando la entrega es a domicilio.
- **Qué NO entra**: `zonaCobro` y `valorZonaCobro` (el bot no promete el valor
  del domicilio — lo confirma el asesor, regla ya vigente), país,
  departamento, código postal y los alias de direcciones guardadas. Pedir 18
  campos por WhatsApp haría insoportable la conversación; el asesor completa
  lo que falte sobre datos que ya están.
- **Riesgo**: más preguntas antes de cerrar. Se acota pidiendo solo dirección
  y ciudad como obligatorias, y agrupándolas en un mismo mensaje con la fecha.
