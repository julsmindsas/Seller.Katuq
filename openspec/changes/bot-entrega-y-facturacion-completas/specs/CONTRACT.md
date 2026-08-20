
## D-219 (2026-08-20) — El bot pregunta a dónde va el domicilio, y la cotización lo lleva estructurado

**El reporte de Daniel, textual:** "no me pregunta para dónde va si escojo
domicilio, no me pregunta cuáles son los datos de facturación, y así como en
venta asistida".

**Lo que se encontró al revisarlo era más hondo que la conversación:**

1. **La dirección no se preguntaba.** Al cliente registrado se le usaba la de
   su ficha sin confirmar; al nuevo se le pedía "la dirección" como un texto
   suelto, sin ciudad, sin barrio, sin quién recibe.
2. **Y lo poco que se capturaba no llegaba estructurado.** Terminaba como
   texto dentro de una nota. Los campos `envio` y `facturacion` de la
   cotización salían **vacíos**, y `cotizacionService.convertirCotizacionAPedido`
   los lee de ahí: el pedido nacía sin a dónde despachar y sin a quién
   facturar, aunque el cliente sí hubiera dictado su dirección en el chat. El
   asesor tenía que releer la nota y volver a teclear todo.
3. **Facturación**: solo existía "a nombre de" con un NIT opcional, también en
   la nota.

**Decisión (propuesta `bot-entrega-y-facturacion-completas`).**

1. **Domicilio: dirección y ciudad son obligatorias para cerrar.** También
   para el cliente registrado, a quien se le REPITE la que tenemos y se le
   pide que confirme — no se asume. Opcionales sin insistir: barrio o cómo
   llegar, y quién recibe con su teléfono.
2. **Recoge en tienda no pregunta dirección**, y arma el `envio` de recogida
   con los `"N/A"` que ya produce venta asistida.
3. **Facturación se ofrece una vez**: razón social, tipo y número de documento
   y correo. Si no quiere, no se repregunta y el pedido cierra igual.
4. **Todo va estructurado** en `envio` y `facturacion` con la forma canónica
   tomada del código de venta asistida (no inventada), además de la nota.

**Tres decisiones de criterio que vale registrar:**

- **Lo no preguntado va vacío, nunca adivinado.** Rellenar "Colombia" o una
  zona de cobro por defecto sería inventar sobre datos que un humano lee como
  confirmados. El valor del domicilio lo sigue poniendo el asesor.
- **La ciudad NO se valida contra un maestro.** El comercio despacha a donde
  quiera y el bot no conoce su cobertura: rechazar "Támesis" por no estar en
  una lista sería tumbar una venta legítima.
- **La dirección se copia tal cual la dijo el cliente.** No se corrige ni se
  completa: una dirección adivinada es peor que una copiada literal, que el
  asesor puede confirmar.
- **Qué NO entró y por qué**: `zonaCobro`/`valorZonaCobro`, país,
  departamento, código postal y alias de direcciones guardadas. Pedir 18
  campos por WhatsApp haría insoportable la conversación; el asesor completa
  eso sobre datos que ya existen. Tampoco se escribe en la ficha del cliente —
  el write-set del bot sigue cerrado en `cotizaciones`.

**Estado: aplicado y verificado en producción.** Backend `5a21063`, ADK
`e4e3dfd`. 11 suites del backend y 88 tests del canal en verde.

Ensayo contra prod:

- "Lo quiero a domicilio, cierra el pedido" → **no cierra**; contesta *"Para
  cerrar a domicilio necesito la dirección y la ciudad. ¿A dónde te lo
  enviamos?"*. Antes cerraba un pedido que nadie podía despachar.
- Dictando dirección y factura en un mensaje, quedó anotado:
  `{direccion: "calle 45 numero 10-20 apto 301", ciudad: "Medellin", barrio:
  "Laureles", forma: "Envio a Domicilio"}` y `{nombre: "Julsmind SAS",
  tipoDocumento: "NIT", documento: "901234567", correo: "pagos@julsmind.com"}`
  — la dirección tal cual la dijo, sin corregir.
