## 0. Decisiones

- [ ] 0.1 Daniel aprueba la propuesta, las specs y el diseño, y responde las 3 preguntas abiertas (colección `npsSurveys`, canales y planes).
- [ ] 0.2 Pasar D-490 de propuesta a aprobada en `specs/CONTRACT.md`.

## 1. Backend: encuestas

- [ ] 1.1 Pruebas de contrato de `encuestas.js`: validación, una sola encuesta de entrega activa, sin activar sin responsable, sin eliminar con respuestas, empresa solo del JWT.
- [ ] 1.2 `services/nps/encuestas.js` y las rutas `/v1/nps/encuestas` (familia Administrador).
- [ ] 1.3 La encuesta virtual de Julsmind a comercios en el listado, leyendo `NPS_COMERCIOS`.
- [ ] 1.4 Bandera `npsModulo` en `companyFeatureFlags.js` y en el front, con dueño y fecha de retiro.
- [ ] 1.5 Índice de `npsSurveys` desplegado.

## 2. Backend: casos y avisos

- [ ] 2.1 Pruebas de `casos.js`: transiciones, nota obligatoria al cerrar, historial, permisos (administrador o responsable) y respuestas de prueba sin caso.
- [ ] 2.2 `casos.js` y las rutas `/v1/nps/casos`.
- [ ] 2.3 `avisos.js`: campana idempotente y correo `NPS_CASO_NUEVO`. Probar que un caso no se avisa dos veces y que, si el aviso falla, el caso queda igual.
- [ ] 2.4 Recordatorio diario con `conLatido` y la plantilla `NPS_CASO_RECORDATORIO`.
- [ ] 2.5 Los detractores de la encuesta a comercios (D-483) abren caso con el número de ticket.

## 3. Backend: envío y página pública

- [ ] 3.1 Trazar todas las vías de Entregado hasta `processOrderNotifications` y anotar el resultado en la bitácora antes de tocar nada.
- [ ] 3.2 `utils/enlaceFirmado.js` con pruebas: firma, vencimiento y token alterado.
- [ ] 3.3 Pruebas de `entrega.js`: días configurados, una por pedido, 30 días por comprador, encuesta pausada que no envía, sin correo no programa, y **ninguna escritura en `orders`**.
- [ ] 3.4 `entrega.js` sobre `scheduleSatisfactionSurvey`, más el promotor con `conLatido` y `NPS_COMPRADORES`.
- [ ] 3.5 Si 3.1 encontró vías sin el hook: cambio aparte en pedidos, con diff y aprobación.
- [ ] 3.6 `publica.js` y las rutas públicas, con límite por visitante. Pruebas: un GET no registra, las preguntas vistas se guardan y se puede cambiar la nota.
- [ ] 3.7 Plantilla `SATISFACTION_SURVEY` rehecha. Un solo correo por pedido cuando hay opiniones de producto.
- [ ] 3.8 `/v1/nps/tablero` con filtros de encuesta y canal, y las respuestas adicionales. El KPI `satisfaccionGlobal` sale de la misma cuenta.
- [ ] 3.9 Pruebas en verde (`npm run test:nps`) y el backend arranca.

## 4. Front

- [ ] 4.1 Módulo lazy `components/nps` con su ruta y la entrada "NPS" del menú (bandera, roles); `crm/satisfaccion` redirige.
- [ ] 4.2 Resultados (lo que hoy es `SatisfaccionComponent`): filtros y respuestas adicionales, y del comentario al caso.
- [ ] 4.3 Encuestas: lista y editor con vista previa, QR descargable y confirmación (Swal) al cambiar la encuesta de entrega.
- [ ] 4.4 Seguimiento: lista con indicadores, y el caso con estado, reasignar, notas e historial.
- [ ] 4.5 Página pública `encuesta/:ref` y la lista de rutas públicas.
- [ ] 4.6 Tipo `NPS_DETRACTOR` en la campana.
- [ ] 4.7 Build de producción sin errores; gradientes y primarios prohibidos sin subir; revisión a 1440 y 390 px.

## 5. Salida (con OK de Daniel)

- [ ] 5.1 Publicar el backend apagado y luego el front.
- [ ] 5.2 FLORECER: encuesta de entrega con un pedido real y encuesta por enlace; responder como comprador, revisar el caso, el aviso, el correo y el recordatorio. Guardar capturas como evidencia.
- [ ] 5.3 SPF, DKIM y DMARC verificados; encender `NPS_COMPRADORES`.
- [ ] 5.4 Encender `npsModulo` a los comercios por grupos.
- [ ] 5.5 Bitácora en `specs/CONTRACT.md`.

## 6. Después

- [ ] 6.1 WhatsApp con plantilla aprobada (cobra del saldo del comercio).
- [ ] 6.2 Envío periódico a la base de clientes del CRM.
- [ ] 6.3 Retención: borrar el texto de los comentarios a los 24 meses (heredado de D-483).
