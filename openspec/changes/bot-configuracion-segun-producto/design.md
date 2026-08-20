# Diseño — el bot respeta el perfil de cada producto

## Context

`producto.procesoComercial` (modelo `ProcesoComercial`) declara por producto:
`configProcesoComercialActivo`, `llevaCalendario`, `llevaTarjeta`,
`llevaArchivo`, `aceptaAdiciones`, `aceptaVariable` + `variablesForm` (JSON con
las variables y sus opciones), `aceptaComentarios`, `aceptaOcasion`,
`aceptaGenero`, `aceptaColorDecoracion`, `permitePrecioManual`. Venta asistida
lo usa para decidir qué paneles muestra y qué campos valida. El bot hoy lo
ignora por completo.

## Goals / Non-Goals

**Goals:**
- Preguntar solo lo que el producto declara, y exigir solo eso para cerrar.
- Capturar las variables (talla/color) por el mecanismo nativo.

**Non-Goals:**
- `llevaArchivo` (adjuntar un archivo por WhatsApp es otra fase),
  `permitePrecioManual` (el bot nunca fija precios) y
  `aceptaColorDecoracion`/`aceptaGenero`/`aceptaOcasion` quedan para después
  si Daniel los pide: se leen, pero por ahora solo se usan para NO preguntar
  de más.
- Cambiar `procesoComercial` o la UI de productos. Solo lectura.

## Decisions

**D1 — El perfil se arma en el backend, por producto del carrito.** El
despachador ya lee `products` en el cierre; ahora lo hace también al armar el
turno, solo para los ids que están en el carrito (no el catálogo). Por cada
uno manda: `{productoId, nombre, pideFecha, aceptaAdiciones, llevaTarjeta,
aceptaComentarios, variables: [{nombre, opciones[]}]}`. Producto sin
`procesoComercial` o con `configProcesoComercialActivo: false` → todo en
false: **no requiere nada**, que es el caso de la venta simple.

**D2 — El gate de cierre se calcula, no se asume.** Hoy exige forma+fecha
siempre. Pasa a: se exigen **solo si algún producto del carrito tiene
`llevaCalendario`**. Si ninguno, el pedido cierra sin fecha (y el mensaje de
"falta la entrega" no aparece). Las **variables declaradas sí son
obligatorias**: sin elegir, no se cierra — un pedido sin talla no se puede
producir.

**D3 — Las variables viajan por el mecanismo nativo.** Lo elegido entra como
**preferencias del ítem** (`configuracion.preferencias`), que es como venta
asistida lo guarda y como producción lo lee. **Prohibido** inventar un campo
`variante` — regla dura ya registrada en el contrato.

**D4 — El agente recibe el perfil masticado, no los flags crudos.** En vez de
`aceptaAdiciones: false`, el prompt dice en prosa qué se puede preguntar de
cada producto y qué no. Un flag suelto invita al modelo a interpretarlo; una
frase clara, no.

**D5 — Botones donde hay elección cerrada.** Variables (las opciones son
literalmente una lista), adiciones (nombre + precio) y **confirmación de
cierre** ("Confirmar pedido" / "Sigo comprando"). Ya está verificado con un
cliente real que WhatsApp los muestra.

## Risks / Trade-offs

- **`variablesForm` es un JSON de forma incierta** (el campo es `any` y se
  parsea con un helper). Se lee defensivamente: si no se puede interpretar, el
  producto se trata como sin variables y se registra — mejor vender sin
  preguntar la talla que no vender.
- **Catálogos mixtos**: productos viejos sin `procesoComercial` conviven con
  nuevos. El default "no requiere nada" es el seguro: no bloquea ventas.
- **Contexto más grande** por el perfil, pero acotado a lo que el cliente ya
  puso en el carrito.
