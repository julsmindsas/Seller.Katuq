## 0. Decisiones

- [x] 0.1 Daniel aprueba la propuesta, las specs y el diseño, y responde las 4 preguntas abiertas del diseño.
- [x] 0.2 Pasar D-483 de propuesta a aprobada en `specs/CONTRACT.md`: reutilización de `surveyResponses`, excepción al Artículo IX y el hallazgo de tenant en reportes.

## 1. Refactors sin cambio de comportamiento (cada uno se verifica solo)

- [x] 1.1 Prueba de "antes y después" del ticket que arma Soporte (campos, número, adjuntos y notificación); luego extraer `TicketsSoporteService` y hacer que `soporte.component` lo use. Crear un ticket real de prueba en FLORECER y compararlo.
- [x] 1.2 Extraer `ReportVizModule` con `app-viz-kpi`, `app-viz-chart` y `app-viz-table`, e importarlo en `dashboard.module`. Build y revisar el constructor de reportes en el navegador.
- [x] 1.3 `baseFilters` en las fuentes (`firestore.engine`, `spec-validator`) con prueba propia; las pruebas de las fuentes actuales siguen en verde.
- [x] 1.4 `npm run build:prod` y backend sin errores.

## 2. Backend fase 1 — contrato primero

- [x] 2.1 Pruebas de contrato:
  - elegibilidad (14 días, internos, excluidas, sin confirmar, Super Admin, 90 días y las dos posposiciones);
  - `npsContribution` y segmentos;
  - empresa solo del JWT (`TENANT_MISMATCH`);
  - un ticket por detractor, también con la vía de "siguiente visita";
  - los documentos del registro sin `type` quedan fuera;
  - la fuente `nps` no está en `SOURCES`.

  Verificar aquí el formato de fecha que agrupa el motor.
- [x] 2.2 `services/nps/elegibilidad.js` (puro) y `services/nps/respuestas.js`.
- [x] 2.3 `services/nps/ticketDetractor.js` sobre `crearTicketSoporte`.
- [x] 2.4 `services/nps/fuente.js` y `GET /v1/nps/tablero` con especificaciones fijas (NPS de 90 días, tendencia de 6 meses, reparto, lista y tasa de respuesta).
- [x] 2.5 `routers/nps.js` registrado en `index.js`; bandera `NPS_COMERCIOS` con dueño y fecha de retiro.
- [x] 2.6 Módulo `satisfaccion` en insights + `services/ai/temasComentarios.js`; prueba de que lo enviado no lleva correos, teléfonos ni empresa, y de que se descartan las frases inventadas.
- [x] 2.7 Índices de `surveyResponses` desplegados con Firebase CLI.
- [x] 2.8 Pruebas en verde y el backend arranca.

## 3. Front fase 1

- [x] 3.1 `FeedbackService extends BaseService` y modelos.
- [x] 3.2 Constante compartida de rutas públicas, usada por novedades (sin cambiar su comportamiento).
- [x] 3.3 `EscalaNpsComponent` (standalone, accesible por teclado y lector de pantalla).
- [x] 3.4 `NpsTarjetaComponent` en `app.component.html`; hoja inferior en celular.
- [x] 3.5 Botón "Opinar" en el header + `OpinarModalComponent` sobre `TicketsSoporteService`.
- [x] 3.6 `SatisfaccionComponent` en `crm/satisfaccion` con `ReportVizModule` y `app-modulo-ia`; entrada de menú en el CRM.
- [ ] 3.7 `npm run build:prod` sin errores; gradientes y primarios prohibidos sin subir; revisión a 1440 y 390 px.

## 4. Salida fase 1 (con OK de Daniel)

- [ ] 4.1 Publicar backend (`apagada`) y luego el front.
- [ ] 4.2 `internos` una semana: responder desde Julsmind y FLORECER, abrir un detractor de prueba, revisar la pantalla y KAI; captura como evidencia.
- [ ] 4.3 `todos`; revisar la tasa de respuesta a los 7 días.
- [ ] 4.4 Bitácora en `specs/CONTRACT.md`.

## 5. Fase 2 — compradores (cuando la fase 1 esté en `todos`)

- [ ] 5.1 Trazar todas las vías de Entregado (Katuq, mensajero, Fullpi, Osmosis, Enviame) hasta `processOrderNotifications`; dejar el resultado en la bitácora antes de tocar nada.
- [ ] 5.2 Pruebas de contrato: +3 días, una por pedido, 30 días por comprador, sin correo no se programa, cancelación, token alterado o vencido, el GET no registra, y **ninguna escritura en `orders`**.
- [ ] 5.3 `utils/enlaceFirmado.js` con pruebas.
- [ ] 5.4 Reescribir `scheduleSatisfactionSurvey` y el promotor (`conLatido`, `NPS_COMPRADORES`).
- [ ] 5.5 Si 5.1 encontró vías sin el hook: llamarlo desde `updateOrderInternal`, en segundo plano. Cambio aparte, con diff y aprobación (pedidos).
- [ ] 5.6 Plantilla con las piezas de `registro.js`; endpoints públicos con límite por visitante.
- [ ] 5.7 Página `encuesta/:token` con `<app-publica-marco>` y `EscalaNpsComponent`.
- [ ] 5.8 Un solo correo (si se aprueba): salida temprana en `invitarACalificar` y enlaces de opinión en la página de gracias.
- [ ] 5.9 "Crear seguimiento" en `SatisfaccionComponent` con el servicio del CRM.
- [ ] 5.10 `satisfaccionGlobal` desde la función de cálculo.
- [ ] 5.11 Build sin errores; SPF, DKIM y DMARC verificados; FLORECER con un pedido real; luego `encendida` (con OK de Daniel).
- [ ] 5.12 Bitácora en `specs/CONTRACT.md`.

## 6. Después

- [ ] 6.1 Cuando `/v1/reports/query` tome la empresa del JWT (otro cambio): sumar la fuente `nps` a `SOURCES` para el constructor y el MCP.
- [ ] 6.2 2026-12-31: retirar `NPS_COMERCIOS` y `NPS_COMPRADORES`.
- [ ] 6.3 Retención (aprobada el 17-oct): tarea programada que borra el texto de los comentarios con más de 24 meses y deja la nota. Debe estar antes de 2028-10.
- [ ] 6.4 Cambio aparte: `/v1/reports/query` y `/v1/companies/overview` toman la empresa del JWT.

## Avance y desvíos (17-oct)

- **1.1:** la prueba de antes y después corre con esbuild + Jasmine (`ng test` no arranca en este equipo: falta `quill` en node_modules). Pendiente el ticket real en FLORECER, al probar en el navegador.
- **1.2:** build sin errores; falta revisar el constructor de reportes en el navegador. `app-viz-chart` ganó una entrada opcional `colors` (sin ella, igual que antes).
- **2.1:** `npm run test:nps` (fuente con filtro fijo, contrato y tablero con el motor real). El motor agrupa por mes las fechas ISO con la hora del servidor.
- **2.6, desvío:** el resumen y los temas salen de una sola llamada a Opttia (`temasComentarios`), no de `explicarBloques` más otra. Opttia solo titula y agrupa ids; las citas son los comentarios mismos, así que no puede inventar frases. El resumen se valida con `textoValido`.
- **2.7, desvío:** no hacen falta índices compuestos. La cadencia consulta por `userId` (índice automático) y el tablero usa solo igualdades (`company`, `type`, `internal`); las fechas se filtran en memoria, como en el resto del motor.
- **Agregados:**
  - `/v1/nps` está en las rutas siempre permitidas de `soloLectura`: un comercio pausado o suspendido también puede opinar;
  - el tablero acepta `?pruebas=1` para revisar la pantalla en la etapa "internos" con las respuestas de Julsmind y FLORECER, marcadas;
  - los documentos de la fase 1 guardan `userEmail` y `userName` para el acuse del ticket al comercio.
- **Hallazgo previo, sin cambiar:** el Seller numera los tickets con el contador de Realtime Database y el backend (MCP y ahora el detractor) con el mayor número de Firestore + 1. Pueden repetirse números visibles.
- **Hallazgo previo:** `tests/companies/soloLectura.test.js` falla por dos rutas POST de contabilidad y logística sin clasificar, ajenas a este cambio.
- **Front fase 1 (17-oct):**
  - la tarjeta pide `/pendiente` una vez por carga y por usuario, sin `setTimeout`; las llamadas van en fila para que el comentario no se adelante a una nota cambiada;
  - en celular, "Opinar" va en el menú de la cuenta (en la barra no cabe a 390 px);
  - el menú "Satisfacción de clientes" sale solo a la familia Administrador de Julsmind en la fase 1; en la fase 2 se abre a cada comercio;
  - `app-viz-chart` ganó otra entrada opcional, `compacta` (leyenda abajo), sin cambio para el constructor;
  - el panel de KAI no tiene el interruptor de respuestas de prueba: siempre las excluye;
  - specs puras: `rutas-publicas.spec.ts`, `opinar-modal.component.spec.ts`, `tickets-soporte.service.spec.ts` (esbuild + Jasmine).
  - Revisado en Chrome headless a 1440 y 390 px con el backend simulado; falta el navegador real con el backend publicado.
