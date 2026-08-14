# Diseño — cotización configurada desde el chat

## Context

La cotización guarda `items: Carrito[]` — la misma forma del carrito de venta
asistida, con `configuracion.datosEntrega` (tipoEntrega, formaEntrega,
fechaEntrega `{year,month,day}`, horarioEntrega, ocasión, observaciones...),
`adiciones`, `preferencias` y `tarjetas`. La conversión a pedido
(`cotizacion-convert.service`) copia esa configuración al carrito de crear-ventas
tal cual. El bot hoy manda ítems sin `configuracion`; el maestro `formaEntrega`
es una colección por company (como `pagos`, que el bot ya lee con caché).

## Goals / Non-Goals

**Goals:**
- Que la cotización del bot llegue con entrega, fecha, pago, dedicatoria y
  facturación — lista para convertir sin perseguir al cliente.
- Validación server-side de TODO: el modelo anota, el backend decide.

**Non-Goals:**
- Cobrar o prometer el valor del domicilio (zonas/tarifas: lo confirma el asesor).
- Horario/franja de entrega, ocasión, colores, preferencias y adiciones (la
  conversación no aguanta tanto interrogatorio; quedan para el asesor).
- Crear o editar maestros. Solo lectura de `formaEntrega` y `pagos`.
- Cambiar el editor de cotizaciones.

## Decisions

**D1 — El agente anota, el backend valida contra los maestros.** Herramientas
locales nuevas en ADK (cerradas sobre el turno, como las del carrito):
`configurar_entrega(forma, fecha)`, `elegir_metodo_pago(nombre)`,
`poner_dedicatoria(mensaje)`, `facturar_a_nombre_de(nombre, nit)`. Escriben en
`EstadoTurno.entrega/pago/dedicatoria/facturacion`. El backend valida: la forma
contra el maestro `formaEntrega` del comercio (match por nombre, sin tildes),
la fecha parseada y FUTURA (hoy incluido), el pago contra `pagos`. Lo inválido
se descarta con log y el agente lo vuelve a preguntar — nunca llega a la
cotización.

**D2 — La config viaja al agente y sobrevive entre turnos.** El contexto del
turno lleva las opciones reales (`formasEntrega` con nombre, `formasPago` que ya
va) y lo YA configurado. Lo validado se persiste en la sesión del bot (llave
`entrega` + `pago` + `dedicatoria` + `facturacion` en el doc de sesión, mismo
mecanismo del carrito) — si la conversación se corta y vuelve, no se repregunta.

**D3 — Aterrizaje con la forma canónica de venta asistida.** En el cierre, cada
ítem sale con `configuracion: { producto, datosEntrega: { formaEntrega,
fechaEntrega: {year,month,day}, observaciones }, adiciones: [], preferencias: [],
tarjetas: [...] }` — arrays SIEMPRE presentes (el template del carrito los lee
sin safe-navigation; la conversión ya se protege de eso, pero nacemos bien). El
método de pago y la facturación van en el doc de la cotización
(`metodoPagoPreferido`, `facturarA`) y repetidos en la nota del pedido para que
el asesor los vea sin abrir nada. `fechaEntrega` guarda además la observación
"configurado por el bot de WhatsApp".

**D4 — Gates de cierre.** No se cierra sin `forma` y `fecha` de entrega
validadas. Con forma tipo domicilio, la dirección confirmada ya era requisito.
Pago, dedicatoria y facturación son OPCIONALES: el bot los ofrece una vez y
sigue — el interrogatorio mata la venta.

**D5 — "¿Domicilio o recogen?" con las opciones del comercio.** El lector del
maestro `formaEntrega` (nuevo, con caché 5 min como `formasDePago`) entrega los
nombres reales. La clasificación domicilio/recoge se infiere del nombre
(contiene "recog"/"tienda" → recoge), igual que hace crear-ventas. Si el
comercio no tiene maestro, el bot pregunta en genérico (Domicilio / Recoger) y
lo anota como texto.

## Risks / Trade-offs

- **Más turnos por venta** (2–3 preguntas extra) = más costo por conversación y
  más fricción. Mitigación: entrega y fecha se preguntan JUNTAS en un solo
  mensaje cuando se pueda, y lo opcional no se insiste.
- **Formatos de fecha dictados por humanos** ("el viernes", "24 de diciembre"):
  el agente la normaliza a YYYY-MM-DD en la herramienta; el backend la parsea y
  si no es válida o quedó en el pasado, se repregunta. Nunca se adivina.
- **Maestros vacíos o rotos** no bloquean la venta: degradan a texto libre en
  observaciones y el asesor completa (mejor una cotización imperfecta que un
  bot trabado).
