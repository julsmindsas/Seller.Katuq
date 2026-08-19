# Tareas — opciones tocables

## 1. Backend — envío

- [x] 1.1 `kapsoService.sendInteractive({to, cuerpo, opciones, company})`:
      formato Meta `interactive` tipo `button` (≤3) o `list` (≤10 filas),
      títulos recortados (20/24/72), mock-mode, credenciales por comercio.
      Tests de la forma exacta del payload y de la elección botones/lista.
- [x] 1.2 Camino de salida: `enviarTexto` acepta `opciones` y delega en
      sendInteractive (mismo cobro, dedup, ventana y usage). Si el envío
      interactivo falla, reintento como TEXTO con las opciones enumeradas.
      Tests del fallback.

## 2. Backend — recepción

- [x] 2.1 Webhook: el payload del bot lleva `opcionId` cuando el mensaje es
      `interactive` (button_reply / list_reply). Tests.
- [x] 2.2 Despachador: `interactive` deja de caer en el aviso de medios y se
      atiende como texto; el `opcionId` se aplica DIRECTO sobre los maestros
      (entrega, pago, adición, producto) sin emparejado difuso; un id
      desconocido se ignora y manda el texto. Tests de cada tipo de id.

## 3. ADK

- [x] 3.1 Herramienta `ofrecer_opciones(pregunta, opciones)` con
      etiqueta/valor/descripción; anota en el estado del turno; el endpoint
      las devuelve. Tests puros.
- [x] 3.2 Instrucciones: cuándo conviene ofrecer opciones (conjunto cerrado y
      corto: entrega, pago, sí/no, resultados de búsqueda) y cuándo NO
      (preguntas abiertas); los valores salen de las listas del contexto.
      Tests de instrucciones.

## 4. Verificación

- [x] 4.1 Suites backend + ADK en verde.
- [ ] 4.2 Prueba real en el piloto: confirmar que Kapso reenvía los
      interactivos; si no, verificar que la degradación a texto se ve limpia.
- [ ] 4.3 CONTRACT.md + memoria al día.
