## Why

Hoy no sabemos qué tan contentos están los comercios con Katuq ni qué les duele. Lo que llega son tickets de soporte (cuando algo ya se rompió) y lo que cada quien oye en llamadas. No hay una nota que se pueda seguir mes a mes.

Del lado de los compradores de cada comercio, la encuesta posterior a la entrega quedó a medias:
- la plantilla, la programación y el trabajo que la envía existen;
- la preferencia que la enciende está apagada por defecto y el trabajo está apagado desde el 20-ago;
- el enlace del correo lleva a una página que no existe y no va firmado.

El servicio de KPIs devuelve "satisfacción global" 4,5 cuando no hay calificaciones (`controllers/analytics.js:147`). Ninguna pantalla lo muestra hoy, pero quien lo lea recibe una nota que nadie dio.

Daniel, 17-oct: "necesitamos un sistema NPS para saber la satisfacción de nuestros clientes y poder tomar decisiones rápidas, y algo para que comenten". Se hace para los dos públicos, por fases, **reutilizando lo que ya existe** y con buena arquitectura.

## Principio de diseño: la empresa que recibe la opinión es la dueña de los datos

- En la fase 1, los comercios opinan sobre Katuq: la respuesta pertenece a **Julsmind**.
- En la fase 2, los compradores opinan sobre un comercio: la respuesta pertenece a **ese comercio**.

Es el mismo modelo del CRM, que ya es híbrido. Con él, una sola pantalla, un solo cálculo y los mismos permisos por empresa sirven para las dos fases. Además entran sin código nuevo el motor de reportes, el panel de IA de los módulos y las consultas por el MCP ("¿cómo va mi NPS?").

## What Changes

**Fase 1 — Comercios que usan Katuq**

- **La pregunta, dentro del Seller.** Una tarjeta que no bloquea: "Del 0 al 10, ¿qué tan probable es que le recomiendes Katuq a otro negocio?". Después sigue una pregunta abierta según la nota:
  - 0 a 6: "¿qué es lo primero que deberíamos arreglar?";
  - 7 y 8: "¿qué nos falta para que nos des un 10?";
  - 9 y 10: "¿qué es lo que más te sirve?".
- **Cuándo.** Desde los 14 días de registrada la empresa y luego cada 90 días por usuario. "Ahora no" la pospone 7 días.
- **No se le pregunta** a Julsmind, a FLORECER, a las cuentas excluidas de métricas ni a las que no han confirmado su correo.
- **Detractor = ticket de soporte.** Cada nota de 0 a 6 abre un ticket por el camino único que ya usan la app de Support, el MCP y el Seller. El equipo lo ve en su tablero de siempre, con responsable, estados, avisos y la calificación de la atención al cerrar. No se crea otro sistema de seguimiento.
- **"Opinar".** Un botón en el header, a mano en cualquier pantalla. Es un atajo de un solo campo que crea el mismo ticket que Soporte:
  - "Una idea" queda como idea y se ve en "Mis ideas", con las respuestas del equipo;
  - "Algo no funciona" queda como soporte.

  Guarda sola la pantalla desde donde se escribió.
- **Pantalla "Satisfacción de clientes".** En el CRM, para la empresa que recibe las opiniones; en la fase 1 la ve Julsmind:
  - NPS de 90 días con el número de respuestas, tendencia mensual, reparto y comentarios, todo dibujado con los widgets del constructor de reportes;
  - el panel de IA de los módulos (KAI) explica qué está pasando y agrupa los comentarios en temas.

**Fase 2 — Compradores de cada comercio**

- **Se termina la encuesta que quedó a medias**, sobre las mismas piezas: la programación al quedar Entregado, la cola de notificaciones, la plantilla y la preferencia "Encuesta de satisfacción".
  - Sale 3 días después de la entrega.
  - La escala 0 a 10 va dentro del correo y el enlace va firmado.
  - Abre una página pública para comentar.
- **Mismas reglas de envío:** máximo una encuesta por pedido y una cada 30 días por comprador y comercio, solo con correo.
- **El comercio ve la misma pantalla "Satisfacción de clientes"** con sus compradores. Ante un detractor puede crear un seguimiento en su CRM.
- **El KPI "satisfacción global"** devuelve el NPS real de los compradores, o vacío.
- **Un solo correo por pedido** cuando la tienda también pide opiniones de producto: la página de gracias invita a calificar los productos.

## Capabilities

### New Capabilities
- `merchant-nps`: la pregunta a comercios en el Seller, la cadencia y el ticket automático del detractor.
- `feedback-inbox`: el atajo "Opinar" sobre los tickets de soporte.
- `voice-of-customer-dashboard`: el cálculo, la pantalla "Satisfacción de clientes", los temas con KAI y el acceso por empresa.
- `buyer-nps`: la encuesta posterior a la entrega, el enlace firmado, la página pública y el seguimiento en el CRM.

### Modified Capabilities
- Ninguna de `openspec/specs/`. `support-ticket-creation` se reutiliza tal cual.

## Impact

**Qué se reutiliza y qué se agrega:**

| Necesidad | Se reutiliza | Se agrega |
|---|---|---|
| Guardar respuestas | `surveyResponses` (hoy solo la escribe el registro y nadie la lee) | el campo `type: "nps"` y los índices |
| Comentarios y seguimiento | `crearTicketSoporte`, tablero de Support, avisos, "Mis ideas", MCP, calificación de la atención | el atajo "Opinar" y el ticket automático |
| Cálculo y pantalla | motor de reportes + widgets KPI, gráfica y tabla | la fuente `nps` y un filtro fijo genérico en el motor |
| IA | módulo de insights + `explicarBloques` + panel `app-modulo-ia` | el módulo `satisfaccion` y el agrupador de temas |
| Elegibilidad | `resolverFechaCreacion`, el patrón `motivoDeExclusion`, `esDePago` | una función pura que los compone |
| Encuesta a compradores | `scheduleSatisfactionSurvey`, el promotor, `scheduled_notifications`, la cola, la preferencia, las piezas de correo de `registro.js`, `conLatido` | el enlace firmado, la página pública y la regla de 30 días |
| Seguimiento del comercio | tareas del CRM | el botón que las crea |

- **Refactors sin cambio de comportamiento:**
  - la creación de tickets del componente de Soporte pasa a un servicio que usan Soporte y "Opinar";
  - los widgets del constructor de reportes pasan a un módulo compartido;
  - nace un util genérico de enlaces firmados con vencimiento, que usa la encuesta. Hoy hay unas 20 implementaciones sueltas; no se migran en este cambio.
- **Sin colecciones nuevas.**
- **Módulo sensible — pedidos (fase 2):** solo lectura del pedido al quedar Entregado, sin ninguna escritura en `orders`. Si algo falla, el pedido se actualiza igual.
- **Seguridad, encontrado al revisar:**
  - `POST /v1/reports/query` (`routers/reports.js:20`) toma la empresa del header que manda el navegador;
  - `GET /v1/companies/overview` hace lo mismo.

  Este cambio no pasa por esas rutas: el NPS llama al motor desde su propio endpoint con la empresa de la sesión. Cerrar los dos huecos es otro cambio, y se recomienda hacerlo antes de exponer la fuente `nps` en el constructor de reportes.
- **Decisión:** D-483 (reservada en el contrato como propuesta).
- **No-goals:**
  - encuestas por WhatsApp o SMS;
  - encuestas por módulo (CSAT/CES);
  - premios por responder;
  - publicar el NPS;
  - correo a comercios que ya no entran;
  - resumen semanal propio (el NPS puede entrar después al informe ejecutivo mensual);
  - migrar las implementaciones existentes de enlaces firmados;
  - tocar pedidos.
- **Riesgos:**
  - solo opinan los que siguen entrando;
  - fatiga si coinciden con las novedades;
  - datos personales en los comentarios;
  - entregabilidad del correo en la fase 2.
