# Lectura del recorrido existente — 2026-10-23

Diagnóstico local, definición del conector MCP disponible y pruebas offline. No se invocó la herramienta para crear o proponer un ticket real, ni se certifica publicación de esta capacidad.

## Lo que ya existe

- Backend `functions/tools/createSupportTicket.js`: `create_support_ticket`, audiencia de comercio admitida por el registro. Recibe asunto, descripción, adjuntos ya disponibles y comprobante; primero devuelve `status: aprobacion_requerida`. Usa `context.mcpCompany` y `context.mcpUserEmail` para la empresa y autor. El texto no elige empresa, prioridad ni agente.
- `functions/services/mcp/confirmacion.js`: propuesta y comprobante ligados a empresa, herramienta y huella, con caducidad. `functions/services/mcp/apps/confirmar/src/confirmar.js` hace el segundo llamado al pulsar aprobar en el host MCP. Ese host no es automáticamente la UI Angular del chat integrado.
- `functions/services/soporte/crearTicket.js` es el único servicio común a MCP y `controllers/errorcenter.js::registerSupportApp`. Reserva el número en el contador compartido de tickets (D-507) y dispara los avisos existentes.
- `functions/tools/toolRegistry.js`: creación declarada como escritura, módulos `soporte`/`misTickets`; `executeTool` aplica scopes, audiencia, disponibilidad de escritura y permiso vigente de la persona. No sustituirlo por una llamada directa a `tool.execute` al incorporar esta escritura.
- El formulario web es más amplio que el contrato MCP actual (tipo de solicitud, clasificación y prioridad elegida). Reusar el alta no implica prometer paridad de todos los campos ni cambiar ese contrato sin alcance aprobado.

## Cortes del chat integrado

- `functions/services/opttiaAccessPolicy.js` no incluye creación de tickets. `routers/opttia.js` lista solo acciones `view`, niega las demás y ejecuta el transporte integrado con scope de lectura. Un usuario que solo tenga soporte tampoco pasa hoy el chequeo de herramientas del chat.
- El router integrado pasa `userEmail`, mientras soporte necesita el campo canónico `mcpUserEmail`. La identidad debe viajar en el contrato correcto, no como argumento inventado por el modelo.
- `adk_agent/endpoints/katuq_basic_chat_endpoint.py` crea un agente de consulta, sin escrituras ni reanudación propia. `tools/katuq_authenticated_mcp.py` transforma un resultado MCP marcado como error en una excepción. El router actual también marca `success:false` como error, aunque una propuesta pendiente usa precisamente ese valor: aprobación pendiente y error real deben distinguirse para esta acción concreta.
- `src/app/shared/services/opttia-chat.service.ts` muestra interrupciones genéricas, pero `respondToInterrupt` exige token de reanudación y publica a `${endpoint}/interrupt`; el endpoint básico inspeccionado no implementa esa ruta. No es un flujo de confirmación de soporte funcional por el solo hecho de que ya haya botones.
- `opttia-chat.component.html` anuncia solo lectura. La presentación deberá explicar la excepción acotada de soporte sin prometer agentes completos. El lanzador está ahora en el encabezado, D-540: no revertir ese cambio concurrente.

## Gates que debe cerrar el diseño

- La credencial de aprobación no debe quedar a disposición del modelo para la segunda llamada. La aprobación debe estar ligada también a usuario/sesión y contenido íntegro de las evidencias, no solo su cantidad.
- La búsqueda actual de ticket reciente se hace antes de crear. Eso no prueba exclusión atómica de dos confirmaciones concurrentes; evitar duplicados de una misma aprobación es un criterio pendiente, no una garantía ya acreditada.
- Caducidad de la admisión y de la propuesta, revocación de rol y cambio de empresa deben ser coherentes. No cobrar una respuesta adicional del modelo para que la persona pulse confirmar.
- El alcance no incluye la consola interna de soporte, comentarios, cierre, asignación o subida de archivos nuevos; no abrir otras escrituras incidentalmente ni reutilizar el carril de agentes completos.
- La activación, permiso por rol y pruebas de publicación se separan de las propuestas pendientes D-532 y de recuperación de marca.

## Comprobación realizada

`node functions/tests/support/numeroUnicoTicket.test.js`: **7/7**, con Firestore y Realtime Database falsos en las operaciones probadas. Prueba numeración compartida y rechazo al fallar la reserva; no crea tickets ni verifica el chat. El módulo de correo se inicializa al importar el servicio y avisó falta de credenciales SMTP locales; no se ejecutó creación ni envío de un mensaje de soporte.

No se ejecutó `tests/mcp/createSupportTicket.test.js`: su suite declara lecturas contra Firestore y requiere interceptar correctamente el servicio para evitar tickets reales. Las nuevas pruebas del recorrido integrado deberán ser offline primero, con persistencia y notificaciones interceptadas.

No hubo cambios de producto, permisos, datos de negocio, build, commit, push o despliegue. Hay trabajo concurrente en POS, estilos, flags, historial de pedidos y Opttia nativo; se preservó.

## Preparación del diseño después de aprobar el alcance

Daniel aprobó el alcance/spec el 23-oct («sí»). Se prepararon `design.md` y `contracts.md`, no tareas ni código. Comprobaciones adicionales locales:

- `CallToolRequestSchema` y `CallToolResultSchema` del SDK Node instalado preservan `_meta` con objetos de prueba en memoria. No se envió un comprobante real ni se ejecutó una herramienta.
- Handshake de `Server` + `WebStandardStreamableHTTPServerTransport` con `Request` en memoria, sin escuchar puertos, red o Firestore: aceptar solo `application/json` devuelve **406**; aceptar `application/json, text/event-stream` devuelve **200**. Dos aserciones aprobadas. El SDK exige ambos aunque `enableJsonResponse` esté encendido.
- El interceptor Angular fuerza `Accept: application/json`. Por eso el diseño incluye contexto HTTP MCP opt-in y opciones compatibles de `postSinLoader`, manteniendo autenticación y empresa; no un bypass del interceptor.
- El notificador existente usa `support_notificaciones` para deduplicar intentos de correo. No hay que inventar un canal de avisos; el alta condicional de la misma intención evita una segunda llamada de creación. No se certifica entrega de SMTP/Slack ni recuperación automática ante una caída después de guardar.
- La ruta Seller disponible es `/misTickets`; no se encontró un parámetro de detalle que el chat pueda inventar. Se usa la lista existente y el número real del resultado.

La propuesta de compatibilidad Angular 14 del diseño necesita ratificación: OnPush/RxJS/plantillas compatibles, en vez de introducir APIs de Angular moderno no instaladas. No se declaró aprobada ni implementada esa excepción.

## Tareas preparadas después de aprobar el diseño

Posteriormente, Daniel aprobó el diseño y pidió «sí aprobado, prepara las tareas para implementarlo». Quedan ratificados el diseño/contratos y su excepción acotada de compatibilidad Angular 14; la nota anterior describe el estado previo, no una implementación.

`tasks.md` contiene **24 tareas**, todas pendientes, con entrada, salida, criterio de éxito y dependencias. Se separan contratos offline, backend/MCP, ADK, Seller, validación del candidato y gates de publicación/activación/prueba real. Se mantiene la aprobación concreta del diff del servicio de alta compartido antes de aplicarlo.

Validación de esta fase: OpenSpec estricto válido, diff documental sin incidencias y comprobación local de 24 IDs únicos, todas las casillas sin ejecutar y cuatro campos obligatorios por tarea. No se ejecutaron pruebas de producto, builds, llamadas al modelo o escrituras remotas durante la preparación de tareas.

## Implementación local tras aprobar las tareas

Daniel respondió «sí» y autorizó implementar localmente. Primer bloque: helper de sobre/normalización y extensión compatible de admisión; 28/28 contratos/regresiones verdes y cinco JS propios sin errores de sintaxis. Harness de persistencia sin importar Firebase/correo reales: 4/12 verdes y 8 rojos contra el servicio sin cambiar; 12/12 contra el diff propuesto aplicado solo en memoria. No se certifica todavía el recorrido del chat.

Se presenta `crearTicket.idempotency.proposed.patch` para el gate adicional 2.3; servicio real intacto y su numeración sin cambios. Pendiente aprobación concreta antes de aplicar. Alcance exacto, hashes, comandos, limitaciones y tareas aún pendientes en `verificacion-local.md`. Sin tickets/avisos reales, publicación, activación, modificación de roles o llamadas a modelos.

## Cierre después de aprobar el diff concreto

Daniel autorizó «si aprobado, aplica el diff y sigue con el MCP y el chat». Diff aplicado después de verificar su base; recorrido implementado en los tres repositorios. Evidencia actual: `verificacion.md` (el apartado anterior es histórico). Pruebas Node/flags/ADK/Seller y E2E loopback verdes, build producción sin errores, QA del chat real con proveedor ficticio a 390/1440. Se preservaron mensajes/fechas de Opttia y otros cambios concurrentes. No se publicaron o activaron funciones, no se crearon tickets reales ni se enviaron avisos; gates operacionales separados.
