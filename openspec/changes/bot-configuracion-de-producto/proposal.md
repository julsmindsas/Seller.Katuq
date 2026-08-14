# Bot — configurar el producto como en venta asistida

## Why

En venta asistida cada producto del carrito se configura: adiciones con precio
(chocolates, globo, flores extra), preferencias (color, sabor), ocasión y
observaciones. El bot ya configura el PEDIDO (entrega, fecha, pago,
dedicatoria) pero los productos van "pelados": un cliente que quiere el
peluche CON chocolates y globo hoy no puede pedirlo por el chat, y el comercio
pierde justo la parte del ticket con mejor margen — las adiciones.

La infraestructura ya está: el maestro `adiciones` existe por comercio (con
`esAdicion`/`esPreferencia`, precio sin IVA e IVA propios), y el cálculo de la
cotización YA suma lo que venga en `configuracion.adiciones/preferencias` de
cada ítem — solo hay que llenarlo conversando, con precios del maestro.

## What Changes

1. **El bot ofrece y agrega adiciones** por producto: cuando el cliente agrega
   algo (o pregunta), el bot conoce las adiciones disponibles del comercio con
   su PRECIO REAL y puede sumarlas al producto ("¿le sumamos los chocolates
   por $12.000?"). Es además el complemento natural de la venta persuasiva ya
   aprobada.
2. **Preferencias**: color, sabor u opción del producto, elegidas del maestro.
3. **Ocasión y observaciones por producto**: "es para un cumpleaños",
   "sin maní por alergia" — texto que el asesor y producción necesitan ver.
4. **El total siempre cuadra**: el bot canta el total CON adiciones usando los
   precios del maestro; al cerrar, cada adición aterriza en
   `configuracion.adiciones` con el objeto COMPLETO del maestro
   (valorUnitarioSinIva, porcentajeIva) y el controlador de cotizaciones ya
   la suma como lo hace con venta asistida. **El modelo jamás fija un precio**:
   anota nombres, el backend adjunta el objeto real del maestro.
5. **Coherencia con la entrega**: las adiciones del maestro traen restricción
   de entrega (solo domicilio / solo recoge / ambas — venta asistida las
   filtra igual); el backend valida y descarta la adición incompatible con la
   entrega acordada, avisando en la nota.

Las adiciones elegidas viven en la línea del carrito de la sesión (por
nombre), sobreviven entre turnos y se limpian con el cierre, como todo lo
demás. Write-set intacto; el maestro `adiciones` es solo lectura.

## Capabilities

### New Capabilities
- `whatsapp-bot-producto-configurado`: adiciones y preferencias del maestro
  por producto (precio server-side), ocasión y observaciones, coherencia con
  la forma de entrega, y aterrizaje con la forma canónica que la cotización
  ya sabe sumar.

### Modified Capabilities
- `whatsapp-bot-conversacion`: el resumen del carrito incluye las adiciones
  con su precio y el total real; la sugerencia persuasiva puede ser una
  adición del maestro (antes solo productos de la búsqueda).

## Impact

- **Backend**: lector del maestro `adiciones` (caché 5 min, split
  adición/preferencia, con precios); líneas del carrito de la sesión aceptan
  `adiciones`/`preferencias` por NOMBRE (saneadas); el cierre resuelve cada
  nombre contra el maestro y adjunta el objeto completo; validación de
  compatibilidad con la entrega.
- **ADK**: herramientas `agregar_adicion(producto_id, nombre)`,
  `quitar_adicion`, `elegir_preferencia`, `anotar_ocasion_u_observacion`;
  el contexto lleva las adiciones disponibles (nombre + precio, tope 30);
  instrucciones para ofrecer con criterio y cantar el total con adiciones.
- **Frontend**: nada — el editor de cotizaciones y la conversión a pedido ya
  entienden `configuracion.adiciones`.
- **Riesgo**: catálogos de adiciones grandes inflan el contexto (tope 30,
  ordenadas por `posicion` como en venta asistida); y el total que canta el
  bot debe salir SOLO de los precios que le dimos — instrucción explícita +
  el total real siempre lo recalcula la cotización.
