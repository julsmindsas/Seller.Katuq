# Tareas de implementación — D-545

Preparadas el 2026-10-23 tras la aprobación explícita de diseño de Daniel: «sí aprobado, prepara las tareas para implementarlo». **Implementación local autorizada** por su respuesta posterior «sí». Gate 2.3 aprobado después mediante «si aprobado, aplica el diff y sigue con el MCP y el chat». Esa fase no autorizaba publicación. Autorización posterior: «si aprobado, sube los cambios a git y despliega opttia, katuq lo despliego con otra sesión». Autoriza Git y despliegue solo ADK/Opttia; no activar la función ni abrir un ticket real. Evidencia local: `verificacion.md`; publicación: `publicacion.md`.

Referencias: `proposal.md`, spec `opttia-support-ticket-creation`, `design.md`, `contracts.md` y `findings.md`. `[P]` indica que una tarea no comparte archivos con las otras así marcadas; no se modifica el mismo archivo en paralelo. Los paths se refieren a Seller, backend Katuq (`functions/`) o Opttia (`adk_agent/`) según se indique.

## 0. Preparación después de aprobar estas tareas

- [x] 0.1 Registrar aprobación de tareas y línea base de los tres repositorios.
  - Entrada: aprobación humana, Git y reglas vigentes de Seller/backend/ADK y directorios afectados.
  - Salida: estado previo, archivos propios/ajenos identificados, comandos de pruebas seguros y write-set trazado hasta el servicio común de soporte.
  - Éxito: no se pisan cambios de POS, flags, historial de pedidos, recuperación de marca o Opttia nativo; sin credenciales en evidencias. Confirmar compatibilidad Angular 14 ratificada en el diseño.
  - Dependencias: aprobación de este archivo. No compilar/publicar desde una punta distinta sin revalidar.
  - Evidencia 23-oct: línea base y alcance preservado en `verificacion-local.md`.

## 1. Contratos primero, sin servicios reales

- [x] 1.1 Crear harness y contratos del backend para soporte integrado.
  - Entrada: contratos A–F y controles existentes de `/access`, MCP, registry y admisión.
  - Salida: fixtures y pruebas offline en `functions/tests/` de capacidad, schemas, sobre, persistencia e identidad; interceptar Firestore/RTDB/correo/Slack antes de importar el servicio y fallar ante I/O no previsto.
  - Éxito: casos nuevos reproducen el comportamiento faltante en rojo de forma controlada: solo-soporte, bandera apagada, tenant/rol/sesión alterados, comprobante en argumentos, huella de evidencias y dos confirmaciones concurrentes. Registrar el contador y los avisos esperados; cero tickets reales.
  - Dependencias: 0.1. No ejecutar por defecto suites MCP que consultan Firestore productivo.
  - Cierre 23-oct: contratos de sobre/persistencia, capacidad/flag y protocolo; VM sin I/O productivo, casos rojos reproducidos antes de implementar y suites finales verdes. Ver `verificacion.md`.

- [x] 1.2 [P] Añadir contratos ADK de borrador, metadata privada y eventos SSE.
  - Entrada: contratos B/C, adaptador MCP y endpoint básico actuales.
  - Salida: tests con cliente MCP y modelo falsos en `adk_agent/tests/`, con centinelas para sobre/comprobante/admisión y capturas de entradas al modelo.
  - Éxito: detectan en rojo las piezas faltantes y prueban forma del alias `_meta` del SDK Python; definen que aprobación pendiente no es un error real y que ninguna autorización termina en prompts, mensajes o trazas. Incluir simultaneidad entre dos empresas y limpieza del ContextVar.
  - Dependencias: 0.1; fixtures autocontenidas, sin importar los tests nuevos de 1.1.

- [x] 1.3 [P] Añadir contratos frontend de transporte y máquina de estados.
  - Entrada: contratos D/E, interceptor, `BaseService` canónico y chat existentes.
  - Salida: pruebas con HTTP/SSE simulados de handshake, headers, id JSON-RPC, errores, tarjeta y cambios de sesión/request.
  - Éxito: cubren JSON-only → 406, Accept JSON+SSE válido, respuesta 200 con `isError`, doble clic, permiso retirado, éxito solo con resultado real y cuota agotada después de admitir la propuesta. Sin llamadas al backend o modelo reales.
  - Dependencias: 0.1; archivos/fixtures independientes de 1.1 y 1.2.

## 2. Backend Katuq: única excepción de escritura

- [x] 2.1 Incorporar bandera y capacidad de soporte independiente de ventas.
  - Entrada: 1.1 y catálogo vigente de flags/criterio de acceso a soporte del registro.
  - Salida: `opttiaSupportTickets` en catálogos frontend/backend y resolución de la capacidad en `/access`/admisión; sin escribir banderas o roles en Firestore.
  - Éxito: apagada por defecto y solo `true` la habilita; usuario solo-soporte autorizado obtiene esa herramienta y ninguna comercial; usuario sin soporte no la obtiene. Conservar usuario/empresa/rol vigentes y restricciones existentes de escritura. Dueño Daniel; revisión/retiro 2027-01-31.
  - Dependencias: 1.1. Coordinar los archivos de flags con cambios concurrentes; contratos correspondientes verdes.

- [x] 2.2 Implementar normalización, sobre privado y lectura verificada de admisión.
  - Entrada: 1.1, contrato C y `services/opttiaMcpGrant.js`.
  - Salida: helper `services/opttiaSupportProposal.js` y extensión compatible de la admisión, sin persistencia de propuestas ni secreto nuevo.
  - Éxito: firma con propósito separado, nonce de servidor, binding de persona/sesión/empresa y hash de datos íntegros; TTL no supera admisión/cinco minutos. Cambiar URL con igual cantidad de adjuntos, contenido, usuario, empresa o herramienta invalida el sobre. No truncar después de aprobar ni registrar credenciales; `verify` anterior conserva sus contratos.
  - Dependencias: 1.1. No implementar todavía helpers basándose solo en decodificar un recibo sin verificarlo.
  - Evidencia 23-oct: helper conectado al MCP/ADK/UI, regresiones y recorrido entre los tres repositorios verdes. `verificacion-local.md` conserva el bloque histórico previo; cierre en `verificacion.md`.

- [x] 2.3 Presentar y obtener aprobación del diff del servicio común de creación.
  - Entrada: diseño §5, contratos de persistencia de 1.1 y versión actual de `services/soporte/crearTicket.js`.
  - Salida: diff propuesto acotado a opción interna de intención/idempotencia y sus tests, sin aplicarlo al servicio hasta aprobarlo.
  - Éxito: quedan explícitos create condicional, recuperación por clave exacta, numeración y avisos; no cambia la fórmula/camino del contador ni los consumidores normales. Aprobación concreta registrada antes del siguiente paso.
  - Dependencias: 1.1 y 2.2. Gate humano adicional por servicio compartido y numeración; aprobar estas tareas no aprueba un diff aún no presentado.
  - Aprobación concreta 23-oct: Daniel «si aprobado, aplica el diff y sigue con el MCP y el chat». Se verificó la base fijada antes de aplicarlo; 12/12 contratos de persistencia verdes sobre el servicio ya modificado. No cambia la función del contador.

- [x] 2.4 Aplicar idempotencia opcional al alta habitual.
  - Entrada: diff aprobado en 2.3, contratos de 1.1 y helper de 2.2.
  - Salida: `crearTicketSoporte` acepta la intención solo por opciones internas, deriva clave opaca estable, consulta el resultado previo y crea condicionalmente tras reservar con el contador existente.
  - Éxito: misma aprobación concurrente crea un documento y una sola rama de avisos; reintento/ALREADY_EXISTS/respuesta perdida devuelve el mismo ticket o incierto sin alta alternativa. Permitir huecos sin resetear el contador. Cuerpo público no controla intención/docId; ruta sin intención y numeración preexistente conservan sus pruebas.
  - Dependencias: 2.3 aprobado. Contratos de persistencia y write-set verdes antes de continuar.

- [x] 2.5 Adaptar la herramienta MCP de soporte sin cambiar los demás canales.
  - Entrada: 2.2/2.4 y contratos de `create_support_ticket` existentes.
  - Salida: rama integrada de borrador `datos_faltantes`, preparación y creación con intención interna; normalización compartida, adjuntos acotados y autor canónico.
  - Éxito: preparar no guarda ni avisa; confirmar usa únicamente el servicio común. Duplicado reciente devuelve `ya_existia`. Sin contexto integrado se mantiene el contrato actual, incluida su confirmación; no incorpora prioridad/agente inventados ni lectura de tickets ajenos.
  - Dependencias: 2.4 y 1.1. Interceptar siempre creación/avisos en tests de la herramienta.

- [x] 2.6 Conectar preparación y confirmación en el MCP integrado existente.
  - Entrada: 2.1/2.2/2.5 y contratos A–D.
  - Salida: `/v1/opttia/mcp` anuncia esquema integrado cerrado y usa `toolRegistry.executeTool`; separa propuesta pública/metadata privada y verifica confirmación desde `params._meta` antes de inyectar el comprobante en servidor.
  - Éxito: solo nombre exacto autorizado; `arguments.comprobante`, aprobaciones textuales, otra herramienta/contexto o sobre alterado se rechazan. Revalidar acceso/flag al confirmar, scope mínimo de esa llamada y `mcpUserEmail` correcto. Confirmación no vuelve a llamar `/admit` ni consume mensaje; rate-limit separado, caducidad coherente y JSON-RPC de error sin eco de credenciales. Otras escrituras y API legacy siguen bloqueadas.
  - Dependencias: 2.1–2.5, ejecutado después de cualquier edición previa del mismo router. Pruebas de MCP/acceso/cuotas en verde.

## 3. Opttia/ADK: preparar, nunca aprobar

- [x] 3.1 Adaptar descubrimiento y retorno MCP a metadata privada de UI.
  - Entrada: 1.2 y contratos del backend en 2.6.
  - Salida: cambios acotados en `tools/katuq_authenticated_mcp.py`, con resultado público separado de la propuesta privada y borrador de la petición.
  - Éxito: el modelo no recibe sobre, comprobante, admisión ni metadata de confirmación; no puede enviar aprobación como argumento. Estados pendientes solo se aceptan para soporte con forma válida; errores reales no se convierten en éxito. Máximo una propuesta activa, presupuesto actual y contexto aislado entre empresas/canales conservados.
  - Dependencias: 2.6 y 1.2.

- [x] 3.2 Emitir el flujo básico de borrador/propuesta/resultado, sin reanudación general.
  - Entrada: 3.1, contratos B/E y endpoint `katuq_basic_chat_endpoint.py`.
  - Salida: `supportDraft` acotado, instrucciones de soporte y eventos `katuq:SUPPORT_DRAFT`/`katuq:SUPPORT_PROPOSAL`/resultado verificado en el carril básico.
  - Éxito: preguntas naturales preparan un reporte fiel o piden aclaración; no autoaprueban ni afirman creación. Datos del borrador son no confiables, sin identidad editable ni historial general. Mantener modelo, cuota diaria/mensual y cuatro consultas; sin `/agui/v2`, nueva ruta `/interrupt` ni escrituras desde ADK. Stream abortado no se anuncia como ticket cancelado si ya se envió confirmación.
  - Dependencias: 3.1. Contratos ADK verdes con modelo/transportes falsos y regresiones de marca/presupuesto/canales independientes preservadas.

## 4. Seller: confirmación humana en el chat

- [x] 4.1 Habilitar transporte HTTP MCP opt-in sin quitar el interceptor.
  - Entrada: 1.3, contrato D, `base.service.ts` e interceptor vigentes.
  - Salida: contexto de transporte MCP y opciones opcionales/compatibles de `postSinLoader` para contexto/headers.
  - Éxito: solo peticiones marcadas al endpoint canónico conservan Accept JSON+SSE y versión negociada; Bearer/empresa y manejo de 401/403 se mantienen. Peticiones existentes sin opciones no cambian; handshake y preflight probados con HTTP simulado. No usar la clase legacy `BaseService.ts` ni HttpClient en un componente.
  - Dependencias: 1.3. No editar el mismo archivo en paralelo con otro cambio; contratos de no regresión del interceptor verdes.

- [x] 4.2 Implementar el servicio de confirmación MCP dedicado.
  - Entrada: 4.1, contrato D y backend 2.6.
  - Salida: `OpttiaSupportConfirmationService extends BaseService`, confirmación por MCP existente y resultados tipados.
  - Éxito: envía solo la intención revisada y metadata privada tras el evento de clic; valida id/versión/errores HTTP, JSON-RPC e `isError`; sin modelo, segundo `/admit`, credenciales compartidas, alta pública o reintento automático con otra intención. Resultado incierto conserva la misma intención para un reintento seguro.
  - Dependencias: 4.1 y 2.6.

- [x] 4.3 Incorporar estados y ciclo de vida del reporte al servicio del chat.
  - Entrada: 3.2/4.2, contratos E y `OpttiaChatService`.
  - Salida: estado tipado de un único borrador/propuesta de soporte por sesión/request, eventos SSE y conexión al servicio de confirmación.
  - Éxito: aclarar el mismo reporte conserva solo su borrador; una consulta independiente descarta la propuesta anterior. Stream viejo/cambio de sesión o empresa/retirada de consentimiento no restaura autorizaciones. Token solo en memoria, nunca storage o mensajes. Cupo cero tras admitir permite confirmar propuesta vigente; confirmar/cancelar no contabilizan otro mensaje. Cancelación después de enviar no promete deshacer una escritura.
  - Dependencias: 3.2 y 4.2.

- [x] 4.4 Añadir tarjeta y acciones de soporte en el chat existente.
  - Entrada: 4.3, diseño §7 y design-system canónico.
  - Salida: tarjeta pequeña OnPush y enlace con `opttia-chat.component.*`; sin llamadas HTTP dentro del componente.
  - Éxito: asunto, descripción, empresa, autor, evidencias y caducidad legibles; Crear ticket/Cancelar con foco y estados submitting/created/existing/expired/revoked/uncertain correctos. El número procede del servidor y Ver mis tickets navega a `/misTickets`. Texto escapado, sin gradientes/primarios paralelos o nuevas clases con `p-`; no reintroducir lanzador flotante ni alterar encabezado/móvil D-540. No se usa la prosa del modelo como prueba de creación.
  - Dependencias: 4.3. Mantener la excepción acotada Angular 14 aprobada en el diseño, sin migrar framework.

## 5. Verificación y candidato, sin publicación implícita

- [x] 5.1 Verificar el recorrido completo y sus rechazos con dobles aislados.
  - Entrada: 2.6/3.2/4.4 y contratos 1.1–1.3.
  - Salida: evidencia E2E simulada de mensaje → propuesta → clic → mismo MCP → ticket; suite de seguridad y write-set, sin datos/servicios productivos.
  - Éxito: permitir solo-soporte autorizado, bloquear escritura ajena/tenant falso/cambio de rol/flag apagado; cero escritura antes del clic. Cambiar evidencias con igual cantidad invalida; dos confirmaciones concurrentes y respuesta perdida no duplican ticket/avisos. Centinelas prueban ausencia de autorizaciones en prompts/logs; cuota/modelo no se consumen al confirmar. El test del servicio común detecta escrituras en pedidos/inventario/productos/precios/pagos como fallo.
  - Dependencias: 2.6, 3.2 y 4.4. Una simulación no certifica razonamiento real del modelo ni producción.

- [x] 5.2 Cerrar compilación y regresiones proporcionales de los tres repositorios.
  - Entrada: 5.1 y diff propio del candidato.
  - Salida: `node --check` limpio; suites seguras de soporte/numeración/MCP/acceso/cuotas; compilación Python y tests ADK aislados; build Angular de producción sin errores.
  - Éxito: incluir rutas existentes de soporte web/MCP sin intención, cuotas, canales y marca. Revisar ambos environments por el incremento automático de versión, sin revertir cambios ajenos. Tests con red/costos/escrituras reales quedan opt-in y separados; no contarlos como aprobados si no se ejecutaron. Si falta runtime o hay fallo real, conservar el bloqueo y evidencia, no declararlo verde.
  - Dependencias: 5.1. Consultar instrucciones y comandos vigentes de cada repo antes de ejecutar; no reiniciar producción para validar compilación.

- [x] 5.3 Revisar visualmente el chat a 390 y 1440 px con datos ficticios.
  - Entrada: 4.4/5.2 y estados simulados de la tarjeta.
  - Salida: capturas/evidencia de review, confirmando, éxito/existente, error, vencida y cuota final consumida; teclado y navegación a Mis tickets.
  - Éxito: sin scroll horizontal/texto invisible; Crear ticket/Cancelar accesibles y no dobles envíos. Encabezado actual intacto, sin botón flotante reintroducido. Comparar conteos de gradientes/colores prohibidos con línea base del módulo: no aumentan. Ninguna captura contiene credenciales o datos reales de clientes.
  - Dependencias: 5.2. No cambiar estilos globales de otra sesión para resolver esta tarjeta.

- [x] 5.4 Preparar el cierre del candidato y su evidencia trazable.
  - Entrada: 5.1–5.3, diffs y resultados exactos.
  - Salida: informe de verificación del cambio y bitácora en `specs/CONTRACT.md`, con archivos, comandos, casos pasados/fallidos, límites y publicación pendiente.
  - Éxito: diferenciar offline, prueba con modelo real (si hubo autorización y se ejecutó), UI simulada y prueba operacional pendiente. Modelo real solo con fixtures y sin ticket/avisos, antes de certificar comportamiento si se autoriza esa evaluación. No marcar el objetivo productivo completo ni afirmar que se crearon tickets reales a partir de mocks. Revisión de diff y `git diff --check` acotados.
  - Dependencias: 5.1–5.3. Sin commit/push/despliegue automático.

## 6. Publicación y prueba operacional — autorización separada

- [x] 6.1 Obtener aprobación concreta de publicación y preparar reversión.
  - Entrada: candidato verificado 5.4, instrucciones vigentes de despliegue y estado remoto/local actualizado.
  - Salida: commits/archivos a publicar acordados, respaldos, hashes, estado de bandera y receta de retorno; coordinación con sesiones concurrentes.
  - Éxito: no arrastrar cambios ajenos sin aprobación, no forzar el candado de Hosting ni usar `git pull` para pisar un árbol sucio. Respaldo/reversión preservan tickets y contador. Commit/push/publicación requieren la autorización explícita correspondiente.
  - Dependencias: 5.4 y autorización de publicación. Esta tarea no está autorizada por aprobar las tareas de implementación local.
  - Cierre 23-oct: autorización posterior explícita de Git y solo Opttia; lote ADK separado de cambios ajenos sobre revisión productiva, pruebas locales y 25/25 con runtime productivo antes de reiniciar. Respaldo privado/reversión en `publicacion.md`; Katuq queda para otra sesión y no se hereda activación/ticket real.

- [ ] 6.2 Publicar los componentes con la función todavía apagada.
  - Entrada: 6.1 autorizado y versiones concretas identificadas.
  - Salida: backend Katuq → ADK → Seller, siguiendo sus manuales y gates de salud entre componentes; sin activación de comercios.
  - Éxito: backend/ADK/Hosting sanos, hashes/versiones coinciden y `/mcp` sigue cerrado sin sesión. ADK se gestiona por systemd, no por el PM2 legacy. Compatibilidad con clientes sin soporte nuevo comprobada; ante falla, aplicar la reversión acordada sin borrar datos.
  - Dependencias: 6.1. Coordinar previamente si otra sesión cambia runtime o despliega los mismos servicios.

- [ ] 6.3 Autorizar y ejecutar la activación piloto por comercio.
  - Entrada: 6.2 sano y autorización del comercio piloto; FLORECER primero según canon, sin extender a todos automáticamente.
  - Salida: simulación del script de flags existente, comprobación de empresa exacta y aplicación autorizada de `opttiaSupportTickets`.
  - Éxito: solo la bandera prevista cambia; usuario autorizado de soporte obtiene la capacidad sin herramientas comerciales nuevas. Apagarla bloquea nuevas propuestas y confirmaciones; no se alteran roles, planes u otras banderas. Registrar dueño y revisión/retiro 2027-01-31.
  - Dependencias: 6.2 y autorización explícita de activación; `--dry-run` antes de escribir configuración.

- [ ] 6.4 Ejecutar prueba operacional autorizada y cerrar publicación.
  - Entrada: 6.3, sesión legítima del piloto y permiso explícito para abrir un ticket controlado que genera los avisos normales.
  - Salida: evidencia del chat real: preparar sin alta, cancelar sin alta, confirmar una vez y verificar número/ticket/tablero; reintento sin duplicado y rechazo al retirar acceso/bandera en un entorno autorizado.
  - Éxito: propósito y datos de prueba acordados, sin mensajes sorpresa al equipo ni datos sensibles en evidencia. Verificar el guardado real; no asumir entrega de correo/Slack. Restaurar configuración de prueba autorizada y dejar las limitaciones/remanentes documentados. No borrar/cerrar un ticket de prueba ni tocar un rol real sin autorización específica.
  - Dependencias: 6.3 y autorización de la prueba con efectos reales. Si no se autoriza, informar este gate pendiente, sin declararlo completado.

## Criterio de salida

Implementación local terminada = tareas 0–5 verificadas y evidencia honesta, con bandera apagada. Funcionamiento publicado comprobado = además 6.1–6.4 según sus autorizaciones. No se marca completado lo que esté pendiente de prueba, permiso o publicación.
