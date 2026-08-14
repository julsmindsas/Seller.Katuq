# Diseño — producto configurado desde el chat

## Context

Maestro `adiciones` por company: `{nombre, esAdicion, esPreferencia,
valorUnitarioSinIva, porcentajeIva, posicion, tipoEntrega}` (tipoEntrega:
"SOLO DOMICILIO" | "SOLO RECOGE" | "ENVIO A DOMICILIO Y RECOGE"). El
controlador de cotizaciones suma `configuracion.adiciones` y
`configuracion.preferencias` de cada ítem con `valorUnitarioSinIva` y
`porcentajeIva` × cantidad. Venta asistida filtra adiciones por forma de
entrega. La sesión del bot guarda el carrito como líneas
`{productoId, referencia, nombre, cantidad, precioUnitario}`.

## Goals / Non-Goals

**Goals:**
- Adiciones y preferencias reales, con precio del maestro, elegidas conversando.
- Total correcto en el chat Y en la cotización (una sola fuente: el maestro).
- Ocasión/observaciones por producto para producción y el asesor.

**Non-Goals:**
- Horarios de entrega por adición, tallas/variantes de producto, y adiciones
  "por producto" (el maestro es por comercio; venta asistida también lo usa así).
- Editar el maestro. Solo lectura.

## Decisions

**D1 — El agente anota NOMBRES; el backend adjunta el objeto del maestro.**
Lector `adicionesDelComercio(company)` (caché 5 min): dos listas ordenadas por
`posicion` — adiciones (esAdicion) y preferencias (esPreferencia) — con
`{nombre, precioConIva}` para el agente (tope 30 c/u). Las herramientas ADK
anotan nombres en la línea del carrito (`adiciones: ["Chocolates"]`,
`preferencias: [...]`). `sanear_carrito` y `reemplazarCarrito` los aceptan
como strings cortos. En el CIERRE, cada nombre se resuelve contra el maestro
(normalizado, sin tildes): el objeto completo (con valorUnitarioSinIva e IVA
del maestro) entra a `configuracion.adiciones`; un nombre que no matchea se
DESCARTA con log — jamás entra un precio dictado por el modelo.

**D2 — El precio que canta el bot sale de la lista que le dimos.** El
contexto lleva `precioConIva` ya calculado (valorUnitarioSinIva × (1+IVA)) y
las instrucciones exigen usar SOLO esos valores al sumar. El total legal lo
recalcula igual el controlador de cotizaciones — si el modelo suma mal, la
cotización sale bien y la diferencia se ve en el link.

**D3 — Compatibilidad con la entrega, en el cierre.** Si la entrega acordada
es recoge y la adición es "SOLO DOMICILIO" (o viceversa), la adición se
descarta en el cierre y la nota lo dice ("la adición X no aplica para
recoge"). No se bloquea el pedido por una adición: mejor cotización sin la
adición que venta caída. El contexto del agente ya puede filtrarlas cuando la
entrega esté acordada (mismo criterio de venta asistida).

**D4 — Ocasión y observaciones van en datosEntrega del ítem.** Herramienta
`anotar_ocasion_u_observacion(producto_id, ocasion, observacion)` → la línea
del carrito guarda `ocasion`/`observacion` (texto corto saneado) → el cierre
los pone en `configuracion.datosEntrega.ocasion` y concatena la observación
del producto con la observación estándar del bot.

**D5 — La sugerencia persuasiva puede ser una adición.** Las instrucciones de
venta ya limitan a "una sugerencia por momento, solo cosas reales con precio
real": las adiciones del contexto cuentan como reales. Mismo guardarraíl: un
"no" y no se vuelve a ofrecer.

## Risks / Trade-offs

- **Contexto más gordo** (hasta 60 nombres+precios): tope 30 por lista y
  nombres a 60 chars. Si un comercio tiene más, entran las primeras por
  `posicion` (el orden que el comercio ya cura para venta asistida).
- **El modelo suma mal**: mitigado por D2 — la cotización recalcula del
  maestro; el chat puede errar el total por poco pero el documento nunca.
- **Nombres ambiguos** ("Chocolates" vs "Chocolates premium"): el match del
  cierre exige igualdad normalizada o inclusión no ambigua; ambigüedad =
  descarte con log (y el agente ve los nombres EXACTOS en su contexto).
