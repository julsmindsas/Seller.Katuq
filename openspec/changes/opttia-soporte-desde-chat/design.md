# Diseño aprobado — D-545

Estado: alcance/spec, diseño/contratos y tareas aprobados por Daniel el 23-oct-2026. Gate concreto del servicio compartido aprobado después mediante «si aprobado, aplica el diff y sigue con el MCP y el chat». Candidato local implementado y verificado; ver `verificacion.md`. No se autoriza publicación ni efectos productivos.

## 1. Decisión y recorrido

Reutilizar `create_support_ticket` y `services/soporte/crearTicket.js`. El agente solo organiza el reporte y solicita una propuesta por MCP. La confirmación la envía Angular directamente al MCP integrado existente (`POST /v1/opttia/mcp`), sin modelo, reanudación ADK ni segundo consumo del mensaje. No hay endpoint nuevo de alta o confirmación ni se usa el alta pública como respaldo.

Flujo: mensaje admitido → ADK decide preparar el reporte → MCP devuelve datos públicos y autorización privada separada → ADK entrega la tarjeta al navegador sin entregar la autorización al modelo → clic humano → MCP revalida identidad/permiso/contenido → registro central → herramienta existente → servicio habitual → número real.

No usar `/agui/basic/v1/interrupt` (no existe actualmente), ni `/agui/v2` para ganar escrituras, agentes o memoria. No embeber otra aplicación de soporte: una tarjeta nativa presenta los datos del MCP y conserva el encabezado D-540.

## 2. Acceso, bandera y lista cerrada

- `featureFlags.opttiaSupportTickets` en `companies`, booleano estricto, ausente/apagado = sin esta capacidad. Agregar al catálogo común frontend/backend; dueño Daniel, retiro/revisión el **2027-01-31**. Prueba inicial en FLORECER según D-385; encenderla requiere autorización de publicación/activación concreta, no la concede este diseño.
- Conservar auth, `requireJwtTenant`, identidad firmada resuelta sin ambigüedad, usuario activo, rol actual y empresa disponible. La capacidad de soporte se calcula aparte de los permisos comerciales, usando el criterio vigente de escritura de soporte del registro central (administrador o módulos autorizados `soporte`/`misTickets`, más restricciones de escritura de la empresa). No traducir nombres de roles a permisos ni reparar roles en este cambio.
- `req.opttia` y `/access` incluyen esta capacidad y anuncian `create_support_ticket` cuando está habilitada. Un usuario con solo soporte puede acceder al chat sin obtener herramientas comerciales. Cuota diaria sigue calculándose como hoy; cero cupo bloquea nuevos mensajes, no una confirmación ya admitida y vigente.
- Excepción por nombre exacto, no «permitir todas las escrituras». Cualquier otra escritura sigue denegada. La definición integrada de la herramienta excluye `comprobante` y los metadatos de confirmación del esquema que ve el modelo. El router rechaza `arguments.comprobante` en este carril, incluso si el modelo lo envía sin estar anunciado.
- Propuestas y ejecución pasan por `toolRegistry.executeTool`, no `tool.execute`. El contexto de esa llamada recibe `mcpUserEmail` canónico y el alcance mínimo requerido para esa herramienta; no se cambia el scope de lectura de las demás ni el contexto de otra petición. El registro revalida además sus controles vigentes. Julsmind no puede indicar otra empresa desde este chat.

## 3. Propuesta pública y autorización privada

Introducir un helper pequeño `services/opttiaSupportProposal.js`, sin persistencia ni caché, que normaliza los datos de la herramienta, valida y firma un sobre con propósito exclusivo. No sustituye la aprobación MCP genérica de otros canales.

Descomposición interna aplicada: `opttiaSupportMcp.js` concentra esquema/capacidad y puente de soporte, manteniendo el router pequeño. En Seller, `opttia-support-state.ts` separa la máquina de estados de transporte y presentación. No cambia el protocolo o alcance aprobado ni agrega endpoints.

La primera llamada conserva el comportamiento normal de `create_support_ticket`: propuesta, sin ticket ni avisos. En el transporte integrado, el router separa el comprobante genérico del contenido público. Emite un sobre HMAC con clave derivada del secreto existente y etiqueta `opttia-support-confirm-v1`: propósito, nonce criptográfico, hash de sesión/usuario/empresa, hash del contenido canónico, admisión original y comprobante MCP interno. No incluye el JWT de login. Caduca como máximo a los cinco minutos y nunca después de la admisión que financió la pregunta.

El sobre solo viaja en `CallToolResult._meta.katuqSupportProposal` hacia el adaptador y de allí por un evento SSE de UI. **MCP `_meta` no es, por sí solo, una frontera de confidencialidad:** el adaptador debe extraerlo, validarlo y retenerlo en el contexto efímero de la petición; devolver al modelo exclusivamente el contenido público. Probar ausencia del sobre/comprobante en todas las solicitudes al modelo, trazas y errores, no confiar en una instrucción de no usarlo.

`aprobacion_requerida` y `datos_faltantes` son estados de esta operación, no fallos del transporte; únicamente se manejan así si nombre y forma coinciden. Un error real de cualquier herramienta mantiene su tratamiento actual. Máximo una propuesta completa activa por respuesta; una segunda preparación requiere descartar/reemplazar explícitamente la anterior, nunca confirmar automáticamente.

La normalización compartida debe coincidir con lo que guarda el servicio: trim, tratamiento de NUL y límites. Para el carril integrado rechazar exceso de longitud antes de firmar, en lugar de truncar algo que la persona no vio. La huella incluye asunto, descripción y **cada URL de evidencia en su orden**, no solamente el número de archivos. Nunca registrar sobre, admisión, comprobante o texto completo del reporte como telemetría.

## 4. Confirmación por MCP, no por el modelo

`OpttiaSupportConfirmationService extends BaseService` usa la base canónica minúscula `base.service.ts`, HttpClient/interceptor y `postSinLoader`. Envía una llamada MCP a la herramienta exacta, sus datos canónicos y el sobre dentro de `params._meta.katuqSupportConfirmation`. Negocia/inicializa el transporte MCP sin almacenar conexiones o credenciales compartidas. Acepta únicamente respuestas del id de su llamada y distingue error HTTP, error JSON-RPC, `isError` y resultado de dominio.

El SDK instalado exige `Accept: application/json, text/event-stream` incluso al responder JSON. El interceptor actual fuerza solo JSON. Añadir opciones de contexto/headers **opcionales y compatibles** a `postSinLoader` y un `HttpContextToken` de transporte MCP; el interceptor cambia únicamente ese Accept para peticiones marcadas al endpoint canónico, sin alterar Bearer, empresa, validación de sesión o manejo de errores. Las demás peticiones conservan su comportamiento. Verificar negociación, cabecera de versión y preflight CORS con el protocolo soportado, sin hardcodear una versión no aceptada.

Antes de ejecutar, Katuq vuelve a comprobar bandera, acceso y empresa. Verifica firma, propósito, caducidad, vínculo al usuario/sesión y hash de todos los datos; valida la admisión original, sin reservar otra. El comprobante MCP genérico se extrae del sobre validado y se inyecta **solo en servidor**, junto con una intención idempotente de confianza, al ejecutar el registro central.

No aceptar una aprobación en texto, `confirm:true`, un id de sesión ADK, metadatos dentro de `arguments`, comprobantes de otro canal ni un sobre para otra herramienta. No poner secretos o autorizaciones en URL, almacenamiento del navegador o mensajes del modelo. Los sobres quedan únicamente en memoria del servicio; cambio de sesión/empresa/token, retirada de consentimiento o limpieza los descarta.

Cancelar una propuesta aún pendiente descarta sus datos/autorización localmente, sin llamada de escritura. Una vez enviada la confirmación, no ofrecer Cancelar como si pudiera deshacerla. Cerrar el chat o abortar HTTP no prueba que una escritura enviada se canceló: se conserva resultado incierto y se permite comprobar/reintentar la **misma** intención.

## 5. Idempotencia dentro del alta habitual

Extender `crearTicketSoporte` con una opción interna de idempotencia, no un campo controlable desde el cuerpo público. Sin esa opción los demás consumidores mantienen su recorrido. La herramienta la recibe únicamente del contexto validado del MCP integrado.

- Derivar un docId opaco de ticket de la empresa, identidad e intención firmadas. Leer ese documento exacto antes de reservar un número; si existe, verificar su procedencia/huella y devolverlo sin reservar ni avisar de nuevo.
- Si no existe, usar **la misma** `reservarNroTicket` de hoy y publicar mediante creación condicional (`create`, no `set` que sobrescribe). Dos confirmaciones concurrentes pueden reservar números diferentes; solo una crea ese ticket. Se aceptan huecos del contador, nunca tickets o números repetidos. No resetear/decrementar el contador ni usar un contador nuevo.
- Ante ALREADY_EXISTS o una respuesta de escritura incierta, releer el docId exacto. Si coincide con la intención, devolver el ticket guardado; si no se puede acreditar el resultado, responder incierto, no éxito ni un ticket nuevo con otro id.
- La búsqueda habitual por asunto reciente sigue antes de crear. Devolver `ya_existia` es lectura, no una creación encubierta. La garantía concurrente de este cambio es una creación por **misma intención aprobada**; no promete unificar dos reportes distintos autorizados a la vez.
- Solo el ganador del alta llama al logger/avisos habituales. El notificador de correo existente ya usa su bitácora idempotente; no crear un segundo envío desde Angular o ADK. No prometer entrega de correo/Slack: siguen siendo best-effort y una caída después de guardar no revierte el ticket. No se crea un outbox nuevo.

El documento guarda metadatos mínimos de intención/aprobación (id opaco, hash, identificador interno del autor y fecha), sin sobre, comprobante o JWT. La numeración se conserva intacta; el diff del servicio compartido se revisa antes de aplicarlo por ser común a varios consumidores.

## 6. Datos incompletos, evidencias y límites

Para aclaraciones, la misma herramienta puede devolver `datos_faltantes` **solo en contexto integrado**, con borrador parcial y la pregunta necesaria, sin firma ni escritura; los contratos de otros canales no cambian. El agente usa ese resultado para preguntar, no un detector de intenciones por regex.

Angular conserva un único borrador de soporte efímero y tipado. Lo envía como datos no confiables separados de la pregunta cuando contesta una aclaración; no envía el historial general del chat ni resultados comerciales previos. Límites: asunto 200, descripción 4000, pregunta actual 2000 caracteres. Cambiar de sesión/empresa o cancelar limpia el borrador. Cada nuevo mensaje al modelo consume su cuota normal; confirmar/cancelar no.

No subir, descargar, escanear ni anexar automáticamente documentos de marca. El conjunto opcional de evidencias proviene de referencias que la persona aportó explícitamente al reporte, no de documentos recuperados o links inventados por el agente. El adaptador valida URLs HTTP(S), longitud/cantidad acotadas (10, 2048 caracteres por URL), y que sean un subconjunto de esas referencias; no las visita. Si no hay evidencia verificable para esta petición, adjuntos vacíos; el usuario conserva el formulario habitual para subir archivos nuevos. Se muestran todas las evidencias antes de aprobar y la firma cubre sus valores exactos.

Conservar modelo, cuota diaria, cobro mensual y máximo de cuatro consultas del mensaje básico. Las comprobaciones de cuota del modelo siguen en su recorrido actual; este cambio no certifica ni rediseña el metering global. La confirmación usa la admisión ya emitida y no llama de nuevo a `/admit`, a `consume_credit` ni al modelo; al caducar debe revisarse otra propuesta. Protección de ráfagas de confirmaciones separada del consumo de mensajes, ligada a sesión/usuario/empresa e intención.

## 7. UI y estados verificables

Tarjeta pequeña con asunto, descripción, empresa, autor, evidencias y caducidad, escapados por Angular. Estados: borrador incompleto, pendiente de revisar, confirmando, creado/existente, cancelado, vencido, sin permiso y resultado incierto. Un `success:false` no aparece como ticket creado. Tras éxito, mostrar número real y botón **Ver mis tickets** hacia `/misTickets` (ruta existente; no inventar un deep link de detalle). El chat no afirma creación basándose en la prosa del agente: el resultado estructurado manda.

Separar la tarjeta/presentación de la llamada HTTP; el componente del chat coordina eventos. Candidatos: `opttia-support-ticket.component.*`, servicio de confirmación y tipos compartidos. No convertir `OpttiaInterrupt` en un permiso universal ni reutilizar a ciegas su ruta `/interrupt`. La tarjeta usa `#5F3FE0`, fondo blanco/lila plano, labels muted, radios 16/11 px, foco visible y sin clases nuevas que contengan `p-`. Conservar encabezado y comportamiento móvil actuales.

La acción pendiente se identifica también por request y sesión: un stream anterior no puede sustituir una tarjeta nueva ni confirmar en otra empresa. Una consulta independiente invalida la propuesta anterior; responder una aclaración del mismo reporte conserva únicamente su borrador acotado. Durante confirmación no se envía otra acción sobre esa misma tarjeta. Desactivar botones ante doble clic es UX; la exclusión real está en servidor.

## 8. Compatibilidad, pruebas y publicación

Contratos primero: schemas MCP/metadata, estados y permisos; después integración con dobles de persistencia/notificaciones, concurrencia y UI; al final pruebas de helpers. Casos obligatorios: solo soporte sin ventas, bandera apagada, rol revocado, tenant falsificado, comprobante desde modelo, cambio de evidencia con misma cantidad, expiración con cupo final consumido, dos clics/concurrentes, respuesta perdida tras guardar y cambio de sesión mientras llega SSE. Centinelas de prueba deben demostrar que el modelo y logs nunca reciben autorizaciones.

El SDK MCP instalado conservó `_meta` en un `tools/call` y en `CallToolResult` al validar schemas en memoria. Eso acredita la forma del protocolo, no ejecución ni aprobación segura. Validar también su lectura con el SDK Python y el ciclo de transporte del navegador con mocks. La prueba de negociación en memoria (sin red ni datos) y las regresiones del interceptor deben acompañar el transporte, no limitarse a dar por bueno el JSON del request.

Verificación futura de código: `node --check`, suites de soporte/numeración/MCP y cuotas, compilación Python y tests ADK sin red, build Angular de producción y revisión visual a 390/1440 px sin scroll horizontal. Revisar los environments modificados por el build. Ningún test abre un ticket real o envía correo/Slack salvo prueba operacional explícitamente autorizada.

Publicación independiente: backend con bandera apagada → ADK → frontend → salud y compatibilidad → autorización de activar un comercio. Desactivar bandera corta propuestas y confirmaciones inmediatamente. Reversión conserva tickets ya creados y números reservados; nunca borra evidencia ni retrocede el contador.

## 9. Gate constitucional y alcance de esta aprobación

Artículos I/II/XIV: spec y diseño aprobados, tareas preparadas y registro en contrato; implementación solo después de aprobarlas. IV/VII/VIII: creación condicional, auditoría existente y contratos antes de implementación. XI: metadatos privados excluidos de modelos/logs. XV: sin escritura de integraciones.

**Compatibilidad ratificada con este diseño (Artículo IX):** el proyecto sigue en Angular 14, sin signals ni control flow de Angular moderno. Excepción acotada aprobada con el diseño: componente OnPush, RxJS para eventos/HTTP y plantillas compatibles con Angular 14, sin migrar framework ni reescribir las pantallas. Registrada en D-545 del contrato antes de implementar; no es una excepción general para otros módulos.

No se necesita nueva colección, endpoint, permiso general de escritura, cache ni schema de inventario. No se cambian datos/roles de los comercios en esta fase. La implementación de flags y el servicio compartido deben preservar sus modificaciones concurrentes. El diseño no autoriza commit, despliegue, activación ni creación de un ticket productivo.
