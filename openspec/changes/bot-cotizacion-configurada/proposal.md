# Bot — la cotización sale configurada como la real

## Why

El bot ya cierra dejando una cotización, pero llega "pelada": solo productos y
cantidades. La cotización real de venta asistida lleva la configuración del
pedido — fecha de entrega, domicilio o recoge, método de pago, datos de
facturación, dedicatoria — y esa configuración viaja intacta cuando la
cotización se convierte en pedido (los ítems de la cotización tienen la misma
forma del carrito de venta asistida, `configuracion` incluida; la conversión ya
la copia). Hoy el vendedor tiene que perseguir al cliente para completar lo que
el bot pudo haber preguntado en el chat.

## What Changes

Durante la conversación, ANTES de cerrar, el bot pregunta y captura:

1. **¿Domicilio o recogen en tienda?** — con las formas de entrega REALES del
   comercio (maestro `formaEntrega`), no opciones inventadas. Si es domicilio,
   la dirección y ciudad ya se piden hoy; el VALOR del domicilio no lo promete
   el bot — lo confirma el asesor.
2. **Fecha de entrega** — se valida que sea real y futura; queda en
   `configuracion.datosEntrega.fechaEntrega` con el mismo formato de venta
   asistida.
3. **Método de pago preferido** — el bot ya informa los medios de pago
   (colección `pagos`); ahora guarda cuál eligió el cliente.
4. **Dedicatoria opcional** — si el cliente quiere tarjeta con mensaje (los
   comercios de detalles viven de esto), va en `configuracion.tarjetas`.
5. **Facturación** — por defecto con los datos del cliente; si pide factura a
   otro nombre/NIT, queda registrado.

Todo aterriza en la cotización con la MISMA forma que produce venta asistida:
`configuracion.datosEntrega` en cada ítem, `tarjetas` en la configuración, y el
método de pago y la facturación en el documento de la cotización. Así el
editor, el link público y la conversión a pedido la tratan como una cotización
hecha a mano.

**El agente sigue sin escribir nada**: anota la configuración en el estado del
turno (herramientas locales nuevas) y el BACKEND valida contra los maestros
reales — una fecha inválida, una forma de entrega que el comercio no tiene o
un método de pago inexistente mueren en el backend, jamás llegan a la
cotización.

**Gates de cierre ampliados**: sin fecha y forma de entrega no se cierra (y
con domicilio, sin dirección confirmada tampoco — eso ya existe).

## Capabilities

### New Capabilities
- `whatsapp-bot-pedido-configurado`: captura conversacional de entrega
  (forma + fecha), método de pago, dedicatoria y facturación; validación
  server-side contra maestros; aterrizaje en la cotización con la forma
  canónica de venta asistida.

### Modified Capabilities
- `whatsapp-bot-conversacion`: el cierre exige además fecha y forma de
  entrega; la configuración parcial sobrevive entre turnos en la sesión.

## Impact

- **Backend**: despachador (contexto de formas de entrega + validación y
  persistencia de la config en la sesión), cierre (ítems con `configuracion`
  completa + campos de pago/facturación en la cotización), lector del maestro
  `formaEntrega` (solo lectura, con caché como `pagos`).
- **ADK**: herramientas locales `configurar_entrega`, `elegir_metodo_pago`,
  `poner_dedicatoria`, `facturar_a_nombre_de`; instrucciones del flujo de
  preguntas (una por mensaje, sin interrogatorio).
- **Write-set NO cambia**: sigue siendo solo `cotizaciones` + contador. Los
  maestros (`formaEntrega`, `pagos`) son solo lectura.
- **Frontend**: nada obligatorio (el editor ya muestra ítems de carrito); se
  revisa que el link público pinte fecha/entrega si están.
- **Riesgo**: más preguntas = conversación más larga. Se mitiga preguntando
  solo lo esencial (entrega y fecha), dejando pago/dedicatoria/facturación
  como opcionales que el bot ofrece sin insistir.
