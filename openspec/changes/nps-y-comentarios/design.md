## Context

Revisión del código del 17-oct, enfocada en qué se puede reutilizar. F = front (`Seller.Katuq/src/app`), B = backend (`katuq_admin_back_firebase/functions`).

- **Tickets: un solo camino de creación.** `B/services/soporte/crearTicket.js` → `crearTicketSoporte(cuerpo, actorEmail)`.
  - Lo usan la app de Support (`controllers/errorcenter.js:119`), el MCP (`tools/createSupportTicket.js`) y el Seller (`POST /v1/support/ticket/create`).
  - Asigna `nroTicket` en transacción y dispara los avisos (Slack, campana y correo al responsable o al comercio).
  - Guarda los campos extra del cuerpo (`{...body, ...ticketData}`).
  - Soporte ya maneja `motivo: 'idea' | 'soporte'`, "Mis ideas" y la calificación de la atención (`confirmacionResolucion.js:49`).
- **Creación de tickets en el Seller:** vive dentro de `F/components/soporte/soporte.component.ts:560-640`. Ahí se arman la identidad, el responsable vacío, el número con `ticketNotificaciones.siguienteNumero()`, el `ServiciosService.addTicket` y la notificación.
- **`surveyResponses`:** solo la escribe `diagnostics.saveSurveyResponse` (`B/controllers/diagnostics.js:808`), sin campo de tipo. Ningún código de producción la lee.
- **Motor de reportes:**
  - fuentes declarativas en `B/services/reports/sources/` (colección, `tenantFilter`, dimensiones y medidas con `count` y `avg`);
  - `firestore.engine.runQuery(spec, source, limit, companyId, ctx)`;
  - widgets `app-viz-kpi`, `app-viz-chart` y `app-viz-table`, declarados en `F/components/dashboard/dashboard.module.ts`, con ECharts.
  - **Hueco:** `routers/reports.js:20` toma la empresa del header.
- **Insights (D-405):** `B/controllers/modulosInsights.js:15` (lista de módulos), `services/insights/modulosInsights.js` (`calcularModulo`, `paraIA`) y `services/ai/explicarBloques.js`.
  - Panel `F/shared/components/modulo-ia` (standalone, input `modulo`), que solo carga al hacer clic.
  - Rutas con `auth` + `requireJwtTenant`.
- **Encuesta a compradores:**
  - `scheduleSatisfactionSurvey` (`B/services/notifications/notificationHooks.js:1818`), llamada en Entregado (`:1496`);
  - promotor en `cronService.js:2397`, cola `addToNotificationQueue` y preferencia `satisfaction_survey`.
- **Piezas sueltas:**
  - edad de la empresa: `resolverFechaCreacion` (`platformMetrics/companyAge.js:68`);
  - exclusiones: `motivoDeExclusion` (`activacion/pasos.js:33`);
  - plan: `esDePago` (`planRenewal.js:51`);
  - latido de crones: `conLatido` (`monitoring/jobHeartbeat.js:116`);
  - correo: `templates/registro.js` (`envolver`, `titulo`, `parrafo`, `boton`);
  - límites: `utils/rateLimitKeys.js` (`opcionesPorVisitante`);
  - CRM: tareas (`routers/crm.js`: `POST /leads/:id/tasks`, con `requireJwtTenant`).
- **Lo que no existe:** un util genérico de enlaces firmados (hay unas 20 implementaciones sueltas), una escala 0 a 10 y un componente de KPI fuera del constructor de reportes.

## Goals / Non-Goals

**Goals:**
- Un solo modelo para los dos públicos: la empresa que recibe la opinión es la dueña.
- Código nuevo mínimo, en piezas pequeñas con una sola responsabilidad.
- Lo que se extrae de código existente no cambia su comportamiento y queda cubierto por pruebas.
- La empresa siempre se toma del JWT y nunca se escribe en `orders`.

**Non-Goals:** los de la propuesta, más:
- migrar los enlaces firmados existentes al util nuevo;
- convertir el `if/else` de insights en un registro de módulos;
- cerrar los huecos de `/v1/reports/query` y `/v1/companies/overview` (van en otro cambio).

## Decisions

### 1. Datos: `surveyResponses` con `type: "nps"` (sin colección nueva)

```
surveyResponses/{id}
  type: "nps", audience: "merchant" | "buyer"
  company                 // la que RECIBE: "Julsmind" (fase 1) o el comercio (fase 2)
  respondentCompany?, userId?, role?, plan?, screen?, internal   // fase 1
  orderDocId?, nroPedido?, buyerEmailHash?, publicId?            // fase 2
  score: 0..10|null, segment, npsContribution: 100|0|-100
  comment?, ticketId?
  shownAt?, dismissals[], answeredAt?, sentAt?, expiresAt?
```

- `npsContribution` hace que **NPS = promedio(npsContribution)**. Así el motor de reportes lo calcula con su `avg`, sin fórmula propia.
- **Fase 1:** un documento por usuario y ciclo. **Fase 2:** ID `buyer_<company>_<orderDocId>` con `create()`, que es idempotente.
- El correo del comprador no se copia, solo su hash. El teléfono se lee del pedido al mostrar el caso.
- Las fechas se guardan en el formato que el motor agrupa por mes (se verifica en la tarea 2.1).
- Índices: `(type, company, answeredAt)`, `(type, userId, shownAt)`, `(type, company, buyerEmailHash, sentAt)` y `publicId`.
- **Alternativa descartada:** una colección nueva. Pide aprobación y duplica el propósito de `surveyResponses`, que hoy nadie lee.

### 2. Dominio en `B/services/nps/`, en módulos pequeños

- `elegibilidad.js` (pura): compone `resolverFechaCreacion`, las exclusiones al estilo `motivoDeExclusion`, `esDePago` y la cadencia.
- `respuestas.js`: mostrar, responder, comentar y posponer. Calcula `segment` y `npsContribution` en un solo lugar.
- `ticketDetractor.js`:
  - llama a `crearTicketSoporte` con `canal: 'nps'`, `motivo: 'soporte'`, prioridad alta, y la nota y el contexto en la descripción;
  - la marca `ticketId` se escribe en una transacción, así que nunca hay dos tickets.
  - **Cuándo se crea:** al cerrar el segundo paso (comentario o cierre de la tarjeta). Si el usuario abandona, el siguiente `pendiente` de ese usuario completa los detractores de más de 10 minutos que no tienen ticket.
  - **Alternativa descartada:** crear el ticket con la nota y luego agregarle el comentario. Habría que extraer la lógica de comentarios del MCP y el notificador podría tratarlo como respuesta del equipo.
- `fuente.js`: la fuente `nps` del motor de reportes.
- **Router `B/routers/nps.js` → `/v1/nps`**, con `auth` + `requireJwtTenant`:
  - `GET /pendiente`, `POST /:id/respuesta`, `POST /:id/comentario`, `POST /:id/posponer`;
  - `GET /tablero` (familia Administrador, con el helper de roles existente), que corre especificaciones fijas con `runQuery(spec, fuenteNps, limite, req.tenant, ctx)` y devuelve `ReportResult`;
  - fase 2: `POST /publica/:token/respuesta` y `/comentario`, con límite por visitante.
- **Bandera** `NPS_COMERCIOS` = `apagada` | `internos` | `todos`, por variable de entorno como las demás banderas de modo. Dueño Daniel, revisión el 2026-12-31.

### 3. Motor de reportes: un filtro fijo genérico

- La fuente `nps` necesita `type == "nps"` además del tenant.
- Se agrega `baseFilters: [{column, op:'==', value}]` a la definición de fuente: lo aplica `firestore.engine` justo después de `tenantFilter`, y lo valida `spec-validator`. Es una mejora genérica, con prueba propia; las fuentes actuales no la usan, así que no cambian.
- **La fuente no se suma a `SOURCES`** (el constructor y el MCP) hasta que `/v1/reports/query` tome la empresa del JWT. Mientras tanto solo la usa `/v1/nps/tablero`, que la pasa directo a `runQuery`.

### 4. IA: módulo `satisfaccion` en insights

- Se agrega `satisfaccion` a la lista de módulos, con su rama en `calcularModulo` (cifras desde la fuente) y en `paraIA` (comentarios depurados, sin datos personales).
- **Narrativa:** `explicarBloques`, sin cambios.
- **Temas:** `services/ai/temasComentarios.js`, prompt y validación con `pedirJsonAOpttia`. Descarta las frases que no aparezcan literalmente en la entrada y reutiliza `frasesVerificadas.textoValido` para las cifras. Se llama desde el `POST /:modulo/explicar` existente, que ya consume cupo de IA con `validateAILimit`.
- **Front:** `<app-modulo-ia modulo="satisfaccion">` más su entrada en `ModuloIA`, `TITULOS` y `PREGUNTAS`.

### 5. Front, reutilizando

Angular 14: NgModule y `*ngIf` en los módulos existentes, la misma excepción al Artículo IX ya registrada. Lo nuevo y aislado va standalone, como `modulo-ia`.

- **Extracción 1, `TicketsSoporteService`** (`shared/services/soporte/`): toma de `soporte.component` el armado del ticket, el número, `addTicket` y la notificación.
  - `soporte.component` lo usa sin cambiar su comportamiento.
  - Compone `ServiciosService.addTicket` sin duplicar la URL.
- **Extracción 2, `ReportVizModule`** (`shared/report-viz/`): declara y exporta los tres widgets. `dashboard.module` lo importa en vez de declararlos.
- **Nuevos:**
  - `EscalaNpsComponent` (standalone): radiogroup accesible de 0 a 10. Lo usan la tarjeta y la página pública.
  - `NpsTarjetaComponent`: junto a `<app-novedad-modal>`. Pide `pendiente` en `NavigationEnd` solo si `NovedadesService.getPendiente()` es nulo, con una bandera y no con `setTimeout`.
  - `OpinarModalComponent` (NgbModal, fuera de `.page-body`): botón en el header que llama a `TicketsSoporteService` con `canal: 'opinar'`. La pantalla de origen va en el ticket y como pie de la descripción, para que el equipo la vea sin cambiar Support.
  - `SatisfaccionComponent` en `crm/satisfaccion`: `cfg-pagina`, widgets de `ReportVizModule` y `app-modulo-ia`. En la fase 2, botón "Crear seguimiento" con el servicio existente del CRM.
- **`FeedbackService extends BaseService`** para `/v1/nps`.
- **Rutas públicas:** constante compartida que usan el modal de novedades, la tarjeta y la página pública.

### 6. Fase 2: compradores

- **`scheduleSatisfactionSurvey`:**
  - se programa a +3 días;
  - crea el documento `buyer_…` y aplica la regla de 30 días con `buyerEmailHash`;
  - mantiene `scheduled_notifications`;
  - **primera tarea:** confirmar que todas las vías de Entregado pasan por `processOrderNotifications`.
- **Promotor:** se envuelve con `conLatido`. Se enciende con `NPS_COMPRADORES`, que reemplaza a `SATISFACTION_SURVEY_CRON_ENABLED`.
- **`utils/enlaceFirmado.js`:** `firmar(prefijo, id, venceMs)` / `leer(prefijo, token)`, con HMAC-SHA256, `timingSafeEqual` y vencimiento. Sigue el patrón de `activacion/enlaces.js` y `siteResenas`. Secreto `ENCUESTA_SECRET`. El enlace solo lleva el `publicId` aleatorio.
- **Plantilla `SATISFACTION_SURVEY`:** se rehace con las piezas de `registro.js`, plana y con la escala como tabla de enlaces.
- **Página `encuesta/:token`:** sobre `<app-publica-marco>`. Registra la nota por POST al cargar; con GET los antivirus contarían respuestas falsas.
- **Un solo correo:** salida temprana en `invitarACalificar`; los enlaces de opinión se generan con `siteResenas`.
- **KPI:** `satisfaccionGlobal` sale de la misma función de cálculo.

## Risks / Trade-offs

- [Mezclar dos tipos de documento en `surveyResponses`] → Todo lector filtra por `type`. Los documentos del registro no tienen `type` y quedan fuera solos. Una prueba lo cubre.
- [Las extracciones rompen Soporte o el tablero de reportes] → Prueba de "antes y después" del ticket que arma Soporte y build de `dashboard`. Van en tareas separadas, antes de lo nuevo.
- [El hueco de tenant de reportes expone la fuente] → La fuente no se registra hasta el arreglo. Una prueba falla si aparece en `SOURCES` sin él.
- [Tickets de detractores llenan el tablero] → Uno por respuesta, con `canal: 'nps'`, que el equipo puede filtrar. El volumen esperado es bajo.
- [Solo opinan los que siguen; fatiga; datos personales; DMARC] → Igual que en la propuesta: nunca coinciden con una novedad, se depura antes de KAI y se verifica el DNS antes de la fase 2.

## Migration Plan

1. **Refactors** sin cambio de comportamiento: `TicketsSoporteService`, `ReportVizModule` y `baseFilters`. Se publican y se verifican solos.
2. **Fase 1:**
   1. Backend con `NPS_COMERCIOS=apagada`.
   2. Front.
   3. `internos` una semana.
   4. `todos`.
3. **Fase 2:**
   1. Backend con `NPS_COMPRADORES=apagada`.
   2. Prueba en FLORECER con un pedido real.
   3. `encendida`.
4. **Reversa:** la bandera en `apagada`. Los refactors se revierten por commit.

## Open Questions

Resueltas por Daniel el 17-oct (aprobó las recomendaciones):

1. El ticket del detractor le llega al comercio como cualquier ticket de Soporte: acuse y luego las respuestas del equipo.
2. Un solo correo por pedido cuando están activas la encuesta y las opiniones de tienda.
3. Los comentarios se guardan 24 meses; después se borra el texto y queda la nota.
4. El cambio para que `/v1/reports/query` y `/v1/companies/overview` tomen la empresa del JWT se abre aparte.
