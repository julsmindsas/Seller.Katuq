## Why

Daniel, 19-oct: el NPS es ante todo para que **los comercios califiquen a Katuq**. Esa parte (fase 1, D-483) está construida, pero nunca se prendió para todos. Su único canal era una tarjeta flotante, y el 18-oct se apagó porque tapaba la pantalla. Daniel escogió preguntar por cuatro canales y prenderlo para todos los comercios.

## What Changes

- **Una sola pregunta por usuario y por ciclo de 90 días.** La cadencia de D-483 no cambia. La pregunta pasa de un canal a otro hasta que el usuario responda, y responder en cualquiera la cierra en todos:
  1. **Ventana al entrar**: la primera vez del ciclo, una ventana con la escala del 0 al 10 y el botón "Ahora no".
  2. **Tarjeta en Inicio**: mientras siga pendiente, una tarjeta dentro de la página de inicio. No flota.
  3. **Tarjeta flotante**: en las demás pantallas, la tarjeta de D-483, pero cerrada como un botón pequeño ("Califica a Katuq") que se abre al tocarlo. No tapa contenido.
  4. **Correo al administrador**: a los usuarios de la familia Administrador que no hayan respondido a los 3 días de empezar su ciclo, un solo correo por ciclo con la pregunta y los enlaces del 0 al 10, como la encuesta al comprador. También le llega al administrador que no entra al Seller, cuando le toca.
- "Ahora no" en la ventana o en una tarjeta pospone 7 días, como hoy (máximo 2 veces). El correo no se pospone.
- **Prendido para todos los comercios** (etapa "todos"). Siguen las exclusiones de D-483: menos de 14 días de registro, cuentas internas, empresas sin verificar o excluidas de métricas, y Super Administrador.
- **D-505**: los interruptores del NPS pasan del `.env` a Firestore, en el documento `config/nps`. Son cuatro: la etapa de comercios, el correo a comercios (con interruptor propio), el envío a compradores y el responsable de los casos de comercios. `ENCUESTA_SECRET` es un secreto y sigue en el `.env`.
- La página pública `/encuesta/<enlace>` acepta también la pregunta de Katuq. Lleva la marca de Katuq y la misma pregunta abierta según la nota, y el detractor abre el ticket de soporte igual que en la tarjeta.

## Capabilities

### New Capabilities
- `merchant-nps-channels`: cómo y por dónde se le pregunta a un comercio por Katuq (ventana, Inicio, flotante, correo), el orden entre canales y el encendido desde Firestore.

### Modified Capabilities
- `merchant-nps` (cambio `nps-y-comentarios`, sin archivar): "Pregunta NPS dentro del Seller" deja de ser una sola tarjeta y pasa a los cuatro canales; "Encendido por etapas" se lee de Firestore.

## No-goals

- No cambia la encuesta a compradores ni el módulo NPS por comercio (D-490).
- No se usa WhatsApp.
- No cambian las preguntas, la cadencia de 90 días ni el ticket del detractor.
- No toca pedidos, inventario ni consecutivos.

## Riesgos

- **Correo en spam.** El dominio katuq.com falla DMARC desde el 23-sep. Por eso el correo tiene su propio interruptor y arranca apagado hasta verificar SPF, DKIM y DMARC. Los tres canales dentro del Seller salen de una vez.
- **Cansar al comercio.** La ventana sale una sola vez por ciclo y la flotante queda cerrada. Ningún canal aparece en la misma visita que una novedad (regla de D-483).
- **Muchos tickets al prender para todos.** Los detractores abren tickets de prioridad alta en el tablero de soporte. Si llegan demasiados, se baja a "internos" en `config/nps` sin desplegar.
- **Volumen de correo.** El envío diario tiene un tope (200 por día) para no dañar la reputación del dominio.

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - `services/nps/respuestas.js`: canal de presentación, ventana o tarjeta.
  - `services/nps/elegibilidad.js`: la etapa sale de `config/nps`.
  - `services/nps/publica.js`: atiende también a la audiencia de comercios.
  - Un cron nuevo de correo a comercios en `initNpsJobs`.
  - `services/notifications/templates/nps.js`: el correo con la marca de Katuq.
  - Un lector de `config/nps` con caché corto.
- **Front**:
  - `nps-tarjeta`: modo ventana y modo flotante cerrado.
  - Una tarjeta nueva en Inicio que reutiliza la escala del 0 al 10.
  - `encuesta-publica`: marca de Katuq.
- **Datos**: ninguna colección nueva. `config/nps` es un documento de la colección `config`, que ya existe (D-505). Las respuestas siguen en `surveyResponses`.
- **Decisión**: D-506 en `specs/CONTRACT.md`.
