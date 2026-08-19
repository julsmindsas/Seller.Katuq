# Diseño — opciones tocables

## Context

Katuq envía por el proxy Meta de Kapso
(`{baseUrl}/meta/whatsapp/v24.0/{phoneNumberId}/messages`) con `type: "text"`
e `image`. Meta soporta además `type: "interactive"` en dos sabores: `button`
(≤3 opciones, título ≤20 chars) y `list` (1 botón que abre un menú, ≤10 filas
en total, título de fila ≤24, descripción ≤72). La respuesta vuelve como
`type: "interactive"` con `button_reply.{id,title}` o `list_reply.{id,title}`.
`extractTextBody` del webhook YA los traduce a texto; el despachador todavía
los corta en el gate de medios.

## Goals / Non-Goals

**Goals:**
- Menos tecleo para el cliente y **cero ambigüedad** al elegir de un conjunto
  cerrado (entrega, pago, sí/no, producto de una búsqueda).
- Nunca romper la conversación: si el interactivo no se puede enviar, va texto.

**Non-Goals:**
- Botones de URL/llamada, catálogo nativo de WhatsApp, flows de Meta.
- Reemplazar el texto libre: el cliente siempre puede escribir.
- Botones en plantillas de campaña (fuera de ventana) — es otro camino.

## Decisions

**D1 — El agente propone con etiqueta + valor canónico.** Herramienta
`ofrecer_opciones(pregunta, opciones)` donde cada opción es
`{etiqueta, valor, descripcion?}`: `etiqueta` es lo que ve el cliente
("Recoge en tienda"), `valor` es lo que significa para el sistema
(`entrega:Recoge en tienda`, `pago:Nequi`, `adicion:Chocolates`,
`producto:<id>`, `si` / `no`). El agente saca los valores de las listas que ya
tiene en su contexto (maestros) — no los inventa.

**D2 — El backend valida, recorta y elige el formato.** Antes de enviar:
descarta opciones cuyo valor no exista en el maestro correspondiente, recorta
títulos a los límites de Meta (20 / 24 / 72) y decide: **≤3 opciones → botones;
4 a 10 → lista; >10 → se recorta a 10 y se avisa en el log**. Cero opciones
válidas → texto plano. Es el mismo criterio de la foto de producto: el modelo
pide, el servidor decide, y el fallo degrada sin que el cliente lo note.

**D3 — El `id` del botón manda sobre el texto.** El id que viaja es el `valor`
canónico (prefijado por tipo). Cuando vuelve, el despachador lo aplica
DIRECTO: `entrega:Recoge en tienda` fija la forma sin pasar por el emparejado
difuso; `adicion:Chocolates` la suma; `producto:<id>` se resuelve contra el
catálogo. Esto es lo que mata de raíz el problema de "recogen" vs "recoge".
El `title` viaja igual como texto del turno, para que el agente vea la
conversación completa y el buzón muestre lo mismo que el cliente tocó.

**D4 — Un id ajeno o vencido no hace daño.** Los ids no se firman ni se
guardan: se validan contra los maestros al volver, igual que un texto
dictado. Un id inventado por un cliente curioso cae en la misma validación de
siempre y se ignora — no hay privilegio por venir de un botón.

**D5 — Se cobra un mensaje.** El interactivo sale por el mismo camino de
salida (ventana, no-contactar, dedup, cobro, usage): un mensaje, un cobro.

**D6 — Sobriedad.** Las instrucciones limitan el uso a **conjuntos cerrados y
cortos**: entrega, pago, sí/no, y resultados de búsqueda. Nada de botones para
"¿en qué te ayudo?" — ahí el texto libre es mejor y una conversación llena de
botones se siente máquina.

## Risks / Trade-offs

- **Kapso podría no reenviar `interactive`.** No hay forma de saberlo sin
  probar en producción. Mitigación: si el envío falla, se reintenta el mismo
  turno como TEXTO con las opciones enumeradas ("1. Domicilio  2. Recoge") y
  queda un log claro; el cliente no ve nada raro. Un solo flag de env apaga la
  función entera.
- **Fatiga de botones**: se acota por instrucciones (D6) y porque el agente
  decide, no es automático en cada pregunta.
- **Títulos largos** (adiciones con nombres kilométricos): se recortan; si el
  recorte deja dos opciones con el mismo título visible, esa opción se
  descarta antes que confundir.
