## Why

D-483 dejó publicada (apagada) la pregunta NPS a los comercios dentro del Seller, con su tablero para Julsmind. Al revisarla, Daniel (18-oct): "eso no es un sistema NPS". Lo que espera:

- **un módulo NPS propio** en el menú, donde se crean las encuestas, se escogen las preguntas y cuándo se envían, y se ven los resultados;
- **para cada comercio**: que cada uno mida a sus propios compradores, con su tablero y el seguimiento de cada cliente;
- **avisos y seguimiento**: aviso inmediato cuando llega un detractor, un responsable y el registro de si se resolvió.

Hoy un comercio no tiene cómo saber qué tan contentos están sus compradores. La encuesta posterior a la entrega existe en el código pero nunca funcionó: el enlace lleva a una página que no existe y el envío está apagado.

## What Changes

**Módulo "NPS" en el menú** (familia Administrador, y los roles a los que el administrador les dé la ruta). Tres pestañas:

- **Resultados.** El tablero que ya existe (NPS de 90 días, tendencia, reparto, comentarios y temas con KAI), ahora para cada comercio y filtrable por encuesta.
- **Encuestas.** Crear, editar, pausar y activar encuestas:
  - la pregunta NPS (escala 0 a 10, texto editable con el nombre del comercio);
  - la pregunta abierta según la nota (tres textos editables);
  - hasta tres preguntas adicionales opcionales (opción única o texto corto);
  - **cuándo se envía:** después de que el pedido queda Entregado (de 1 a 30 días después), o con un **enlace y QR** para compartir donde el comercio quiera (tienda, redes, mostrador);
  - el **responsable** de los detractores.
- **Seguimiento.** Cada detractor es un caso con responsable, estado (Nuevo, Contactado, Resuelto o Sin solución), notas y fecha de cierre. Muestra los casos abiertos, los vencidos y el tiempo promedio de cierre.

**Avisos.** Cuando llega un detractor:

- aviso en la campana del comercio;
- correo al responsable, con la nota, el comentario, el pedido y el contacto del comprador.

Los casos que llevan 48 horas sin respuesta se recuerdan al responsable.

**Envío a compradores** (correo, el canal que ya existe), reutilizando la encuesta posterior a la entrega:

- se arreglan la programación y el enlace;
- el enlace va firmado y lleva a una página pública donde se responde;
- una encuesta por pedido y una cada 30 días por comprador.

**Lo de D-483 se integra:** la encuesta de Julsmind a sus comercios es una encuesta más de Julsmind, con el canal "dentro del Seller". Sus detractores entran al mismo Seguimiento y siguen abriendo el ticket de soporte.

## Capabilities

### New Capabilities
- `nps-surveys`: crear y configurar encuestas (preguntas, canal, momento de envío, responsable, estado).
- `nps-buyer-delivery`: envío a compradores después de la entrega, enlace y QR, y la página pública para responder.
- `nps-follow-up`: casos de seguimiento de detractores, avisos y recordatorios.
- `nps-results`: el tablero por comercio y por encuesta.

### Modified Capabilities
- Ninguna de `openspec/specs/`. Este cambio amplía `openspec/changes/nps-y-comentarios/` (D-483): `voice-of-customer-dashboard` pasa a `nps-results`, y `buyer-nps` lo reemplazan `nps-buyer-delivery` y `nps-surveys`.

## Impact

**Reutiliza:**

| Necesidad | Se reutiliza |
|---|---|
| Respuestas | `surveyResponses` con `type: "nps"` (D-483), más `surveyId` |
| Cálculo, tablero y temas | `services/nps/tablero.js`, la fuente `nps` del motor de reportes, `SatisfaccionComponent` y KAI (`temasComentarios`) |
| Escala y página pública | `EscalaNpsComponent`, `<app-publica-marco>` |
| Envío después de la entrega | `scheduleSatisfactionSurvey`, `scheduled_notifications`, el promotor del cron, `notification_queue` y su canal de correo |
| Campana | el nodo de la campana del comercio (`ActualizacionTicket{comercio}`) con escritura idempotente (`crearSiNoExiste`) |
| Responsables | la lista de usuarios de la empresa (`/v1/users/all`) |
| Encendido por etapas | bandera por comercio (`companyFeatureFlags`) |

**Lo nuevo:**

- la colección `npsSurveys`, una por encuesta (**pide aprobación**: ver Decisiones);
- el estado del caso dentro de la misma respuesta (sin colección de casos);
- las plantillas de correo (encuesta y aviso al responsable);
- la página pública `encuesta/:token`;
- el módulo `nps` en el front.

**Módulos sensibles:** pedidos solo se lee al quedar Entregado; no se escribe en `orders`. Si algo falla, el pedido se actualiza igual.

**Decisiones que necesitan aprobación:**

1. **Colección nueva `npsSurveys`** para guardar las encuestas. La alternativa es un campo dentro de `companies`, que se vuelve grande y lo pisa la ficha de empresa; no se recomienda.
2. **Canales de la primera entrega:** correo, más enlace y QR. WhatsApp va después: necesita una plantilla aprobada por Meta y cobra del saldo del comercio.
3. **Planes:** todos los planes durante la salida; decidir después si el plan gratis tiene límite.

**No-goals:**

- WhatsApp y SMS en esta entrega;
- envío periódico a la base de clientes del CRM, que va después;
- encuestas CSAT o CES por módulo;
- premios por responder;
- publicar el NPS en la tienda;
- tocar pedidos.

**Riesgos:**

- entregabilidad del correo (SPF, DKIM y DMARC de Katuq, ver memoria del 23-sep);
- respuestas falsas por el enlace abierto, que se mitigan con límite por visitante y marca del canal;
- fatiga si coinciden con las opiniones de producto de la tienda (un solo correo por pedido, aprobado en D-483);
- datos personales en los comentarios, que se depuran antes de KAI.
