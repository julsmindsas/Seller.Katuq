## 0. Decisiones

- [x] 0.1 Daniel aprueba la propuesta, las specs y el diseño, y responde las 3 preguntas abiertas (colección `npsSurveys`, canales y planes).
- [x] 0.2 Pasar D-490 de propuesta a aprobada en `specs/CONTRACT.md`.

## 1. Backend: encuestas

- [x] 1.1 Pruebas de contrato de `encuestas.js`: validación, una sola encuesta de entrega activa, sin activar sin responsable, sin eliminar con respuestas, empresa solo del JWT.
- [x] 1.2 `services/nps/encuestas.js` y las rutas `/v1/nps/encuestas` (familia Administrador).
- [x] 1.3 La encuesta virtual de Julsmind a comercios en el listado, leyendo `NPS_COMERCIOS`.
- [x] 1.4 Bandera `npsModulo` en `companyFeatureFlags.js` y en el front, con dueño y fecha de retiro.
- [x] 1.5 Índice de `npsSurveys` desplegado.

## 2. Backend: casos y avisos

- [x] 2.1 Pruebas de `casos.js`: transiciones, nota obligatoria al cerrar, historial, permisos (administrador o responsable) y respuestas de prueba sin caso.
- [x] 2.2 `casos.js` y las rutas `/v1/nps/casos`.
- [x] 2.3 `avisos.js`: campana idempotente y correo `NPS_CASO_NUEVO`. Probar que un caso no se avisa dos veces y que, si el aviso falla, el caso queda igual.
- [x] 2.4 Recordatorio diario con `conLatido` y la plantilla `NPS_CASO_RECORDATORIO`.
- [x] 2.5 Los detractores de la encuesta a comercios (D-483) abren caso con el número de ticket.

## 3. Backend: envío y página pública

- [x] 3.1 Trazar todas las vías de Entregado hasta `processOrderNotifications` y anotar el resultado en la bitácora antes de tocar nada.
- [x] 3.2 `utils/enlaceFirmado.js` con pruebas: firma, vencimiento y token alterado.
- [x] 3.3 Pruebas de `entrega.js`: días configurados, una por pedido, 30 días por comprador, encuesta pausada que no envía, sin correo no programa, y **ninguna escritura en `orders`**.
- [x] 3.4 `entrega.js` sobre `scheduleSatisfactionSurvey`, más el promotor con `conLatido` y `NPS_COMPRADORES`.
- [x] 3.5 Si 3.1 encontró vías sin el hook: cambio aparte en pedidos, con diff y aprobación.
- [x] 3.6 `publica.js` y las rutas públicas, con límite por visitante. Pruebas: un GET no registra, las preguntas vistas se guardan y se puede cambiar la nota.
- [x] 3.7 Plantilla `SATISFACTION_SURVEY` rehecha. Un solo correo por pedido cuando hay opiniones de producto.
- [x] 3.8 `/v1/nps/tablero` con filtros de encuesta y canal, y las respuestas adicionales. El KPI `satisfaccionGlobal` sale de la misma cuenta.
- [x] 3.9 Pruebas en verde (`npm run test:nps`) y el backend arranca.

## 4. Front

- [x] 4.1 Módulo lazy `components/nps` con su ruta y la entrada "NPS" del menú (bandera, roles); `crm/satisfaccion` redirige.
- [x] 4.2 Resultados (lo que hoy es `SatisfaccionComponent`): filtros y respuestas adicionales, y del comentario al caso.
- [x] 4.3 Encuestas: lista y editor con vista previa, QR descargable y confirmación (Swal) al cambiar la encuesta de entrega.
- [x] 4.4 Seguimiento: lista con indicadores, y el caso con estado, reasignar, notas e historial.
- [x] 4.5 Página pública `encuesta/:ref` y la lista de rutas públicas.
- [x] 4.6 Tipo `NPS_DETRACTOR` en la campana.
- [x] 4.7 Build de producción sin errores; gradientes y primarios prohibidos sin subir; revisión a 1440 y 390 px.

## 5. Salida (con OK de Daniel)

- [x] 5.1 Publicar el backend apagado y luego el front. Salieron el 18-oct: backend 834ccc80 y front 2026.10.18.4.
- [ ] 5.2 FLORECER: encuesta de entrega con un pedido real y encuesta por enlace; responder como comprador, revisar el caso, el aviso, el correo y el recordatorio. Guardar capturas como evidencia.
  - 18-oct: bandera `npsModulo` prendida a FLORECER; encuestas "Después de la entrega" (1 día) y "QR del mostrador" activas. Respuesta 3/10 por el QR: caso abierto, campana al instante, correo al responsable enviado, Contactado → nota → Resuelto con nota de cierre, Resultados con NPS −100. Pedido de prueba CER-000013 (cliente "PRUEBA Claude BORRAR") creado por Venta asistida y pasado a Entregado: encuesta programada para el 19-oct 9:00 a. m. Colombia (`scheduled_notifications/nps_Mn5P951Rn5UTsVwxiMrB`). Falta: confirmar que llega el correo y responderlo, y el recordatorio de 48 h.
- [ ] 5.3 `ENCUESTA_SECRET` propio en el `.env` de producción (hoy se firma con `SECRET_TOKEN`); SPF, DKIM y DMARC verificados; encender `NPS_COMPRADORES`.
  - 18-oct: `ENCUESTA_SECRET` propio y `NPS_COMPRADORES=encendida` en EC2 (respaldo `.env.bak-nps-*`), API reiniciada. Falta SPF/DKIM/DMARC.
- [ ] 5.4 Encender `npsModulo` a los comercios por grupos.
  - 18-oct: sin el módulo, la pantalla de NPS explica que todavía no está disponible para la empresa y no llama al servidor (antes salía vacía con un aviso titulado "Suscripción"). La regla "Julsmind siempre o la bandera" quedó en `npsDisponible` (menú y pantalla). Se apagó `NPS_COMERCIOS` (tarjeta "Tu opinión") a pedido de Daniel.
- [ ] 5.6 D-505 (19-oct): mover los interruptores `NPS_COMERCIOS`, `NPS_COMPRADORES` y `NPS_RESPONSABLE_COMERCIOS` del `.env` a Firestore (`config/nps`), con el mismo valor por omisión (apagado). `ENCUESTA_SECRET` es secreto y se queda en el `.env`.
- [ ] 5.5 Bitácora en `specs/CONTRACT.md`.

## 6. Después

- [ ] 6.1 WhatsApp con plantilla aprobada (cobra del saldo del comercio).
- [ ] 6.2 Envío periódico a la base de clientes del CRM.
- [ ] 6.3 Retención: borrar el texto de los comentarios a los 24 meses (heredado de D-483).

## Avance y desvíos (18-oct)

- **1.5:** no hace falta índice compuesto. Las encuestas y los casos se consultan solo con igualdades (`company`, `canal`, `estado`, `type`, `caso.estado`).
- **2.5:** el caso de un comercio detractor se abre al cerrar la tarjeta, junto con el ticket, o en el barrido de 10 minutos. Su responsable sale de `NPS_RESPONSABLE_COMERCIOS` (env); sin ella, lo ven los administradores de Julsmind.
- **3.1, rastreo de las vías de Entregado:**
  - **Llegan a `processOrderNotifications`:** Fullpi, Osmosis (webhook y pull) y Enviame (`handleDeliveryCompleted`).
  - **No llegan:** la web, la venta asistida, el MCP y Logística (`updateOrderInternal`), la app de mensajeros (`editByTransporter`), el cambio masivo (`editBatch`), el POS al crear, WooCommerce, Aliaddo y Enviame `handleDeliveryUpdated`.
  - `updateOrderInternal` y las notificaciones unificadas sí llaman `invitarACalificar` al pasar a Entregado.
  - **Hallazgo:** la rama legacy de Enviame pasa `_id` vacío.
- **3.4, desvío:** la encuesta se programa desde `services/sitios/invitacionResena.invitarACalificar`, que ya recorre las vías principales. Así no hubo que tocar `orders.js` para la mayoría de pedidos. También se programa desde `scheduleSatisfactionSurvey` (Fullpi, Osmosis y Enviame). `create()` evita la doble programación.
- **3.5, aprobado y aplicado (Daniel, 18-oct):** diff en `controllers/orders.js` para la app de mensajeros (`editByTransporter`) y el cambio masivo (`editBatch`). Llama `invitarACalificar`, que también cumple lo que el ticket 1231 prometió para el mensajero. La prueba `tests/nps/viasEntregado.contract.test.js` falla si alguna vía deja de llamarla.
- **Agregado:** el backend exige la bandera `npsModulo` para las encuestas y para programar envíos (Julsmind siempre). Las encuestas con más de 7 días de atraso no se envían (`vencida`).
- **3.7:** si la encuesta queda programada, la invitación a calificar no sale aparte: los enlaces de producto van en la respuesta de `POST /publica/comentario` (`opinionesProducto`).
- **3.8:** `satisfaccionGlobal` es el NPS real o null; el promedio viejo de calificaciones pasa a `calificacionPromedio`. El endpoint de KPIs todavía toma la empresa del header, lo que queda para D-484.
- **Pruebas:** `npm run test:nps` (contrato del módulo, 15 pruebas, más las de D-483).
- **Front (18-oct):**
  - módulo lazy `components/nps` con un marco de pestañas y pantallas standalone, más la página pública `components/encuesta-publica`;
  - en el menú, "NPS" con Resultados, Encuestas y Seguimiento. Resultados y Encuestas son de la familia Administrador; Seguimiento, de quien tenga la ruta, y el responsable lo abre desde el correo;
  - la pantalla `crm/satisfaccion` de D-483 se movió a Resultados y la ruta vieja redirige;
  - se arregló el tamaño de la segunda pregunta de la tarjeta de D-483, que una regla global de `label` dejaba en 11 px;
  - build de producción sin errores; 0 gradientes y 0 primarios prohibidos en lo agregado; revisado a 1440 y 390 px con el backend simulado.
  - **Pendiente:** el panel de KAI de Resultados calcula sobre todas las encuestas, sin los filtros.
