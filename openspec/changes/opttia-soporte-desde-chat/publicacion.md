# D-545 — Entrega Git y despliegue de solo Opttia

23-oct-2026. Autorización de Daniel: «si aprobado, sube los cambios a git y despliega opttia, katuq lo despliego con otra sesión».

## Lote y límites

- Backend Katuq: `aea0ab2d`, rama `backend-aws-security`, subido a origin. Catorce archivos propios de soporte/MCP/tests. No se desplegó ni se reinició su API, PM2 o Hosting desde esta sesión.
- Opttia/ADK: `4a61ae4a441d1053b139532761d5bd57d6a87c38`, rama `codex/opttia-support-tickets`, subido a origin. Seis archivos, tres productivos. Basado en producción `944c5e2`, sin audio/scripts posteriores, marca D-511, mensajes 1354 ni cotizaciones/auth nativos. El checkout original combinado se conserva intacto; no hacer pull/merge ciego para reintroducir esos candidatos.
- Seller: fuentes y pruebas D-545 + artefactos en `81d675c4`, rama `feature/venta-asistida-mejorada`; entrada D-545 de CONTRACT y cierre operacional en commit documental posterior. Se excluyen los documentos/cambios concurrentes y `src/assets/version.json` generado; no es el dist autorizado para Hosting. La otra sesión debe recompilar desde la punta integrada y aplicar los candados habituales.
- Publicar no habilita `opttiaSupportTickets`, concede permisos ni autoriza un ticket/aviso real. Activación y prueba operacional 6.3/6.4 permanecen pendientes. No se alteraron secretos, modelos o paquetes.

## Verificación del lote separado

Backend 57/57 y catálogo 39/39; Seller 16/16, build productivo previo de las mismas fuentes propias exit0 (evidencia histórica `verificacion.md`). ADK separado 26/26 local, incluyendo stock/MCP fixture; E2E de los tres repositorios verde apuntando explícitamente a la rama aislada, con modelo, almacenamiento y avisos simulados. Cero tickets reales.

En EC2, antes de reiniciar: 25/25 soporte/chat básico/política sobre el candidato en worktree privado, con el Python/librerías productivos: Python3.12, ADK1.23.0, MCP1.29.0, Pydantic2.12.5. Dos avisos de deprecación del Runner, sin errores. No se instaló ni actualizó ningún paquete. Compilación de los tres archivos limpia.

## Respaldo, intento y estado

Respaldo privado verificado: `/home/ubuntu/opttia-deploy-backups/d545.qyrBif/`. Conserva commit/rama, fuentes anteriores, waitlist/diff, `.env` y unidad systemd; pruebas y candidato en directorio privado. No se versionan sus contenidos sensibles. Scripts acotados y revisados en `qa/prepare-opttia-release.sh` y `qa/deploy-opttia-release.sh`.

Primer intento: el gate de salud de aproximadamente31s venció; se ejecutó reversión automática a `944c5e2`, solo por código/systemd. Salud interna/externa200 y servicio activo después de volver. Revisión del journal: cero tracebacks/tipos de excepción detectados; no se certificó la causa ni se ocultó el intento fallido. El arranque anterior restaurado tardó20s hasta primer listener y26s hasta el siguiente. Se amplió la espera acotada de salud, sin cambiar runtime/configuración.

Segundo intento **aprobado**: revisión viva `4a61ae4a441d1053b139532761d5bd57d6a87c38`, rama explícita, systemd `kai-adk` activo/running, PID1676954 y NRestarts0. Arranques registrados 18:56:39/18:56:46 UTC; salud interna y pública HTTP200. Tres SHA-256 idénticos al commit local:

| Archivo ADK | SHA-256 |
|---|---|
| endpoints/katuq_basic_chat_endpoint.py | 652fc6a3800823606d25147347cbc99dc75cb4ce90ec158fa6b14632da1c7c8f |
| tools/katuq_authenticated_mcp.py | 4df0453fed68552b4c7761139f0257c6b3fe24a88d29b6e82ef98783e319636d |
| services/katuq_support_chat.py | b82b6d14e5cb94b603c504a6e105c8ba1e7aaf7385ea5dd5a95b2b0b8a2017e8 |

POST público `/adk/agui/basic/v1` sin Bearer devuelve SSE RUN_ERROR exigiendo sesión, sin admisión/modelo/alta. Journal del PID nuevo: cero tracebacks/tipos de excepción de arranque detectados. Comparación binaria de `.env` y waitlist contra respaldo sin cambios; solo persiste el cambio previo de waitlist en Git. No se imprimieron credenciales, textos de negocio ni el journal completo. Estas comprobaciones acreditan arranque/protocolo, no una conversación real autorizada o el alta real de soporte.

## Entrega para la otra sesión de Katuq

Integrar el commit backend `aea0ab2d` (ya en su rama), revisar solo sus archivos/hunks y desplegar según manual EC2. El código Seller quedó en `81d675c4`, en `feature/venta-asistida-mejorada`, todavía sin desplegar; el cierre documental no cambia código. No publicar directamente el build local sucio `2026.10.23.8`: actualizar desde la punta sin pisar cambios concurrentes, compilar de nuevo y revisar metadatos/candado. Mantener bandera apagada durante ambos despliegues. El soporte nuevo no está disponible al usuario hasta tener los componentes Katuq y una activación piloto expresamente autorizada.

Verificación Git: se prepara una entrada selectiva del contrato, sin las demás secciones concurrentes. El primer intento de preparar esa entrada agotó el buffer de lectura del documento; no se staged ese archivo y se cerró en el commit documental posterior. El patch histórico aprobado contiene líneas de contexto vacías con un espacio, propias del formato unified diff: se conserva byte a byte (no es whitespace del código productivo); los checks de código y documentos restantes no se exceptúan.

La publicación de Opttia usa su rama explícita; futuros despliegues desde `feat/claude-agent-sdk` deben integrar D-545 o podrían retirar esta capacidad. No adelantar el trabajo de marca o cotizaciones como parte de esa integración. Reversión de Opttia: revisión respaldada y restart de `kai-adk`, conservando datos, entorno y waitlist; sin reset --hard ni rollback de contadores/tickets.

## 27-oct-2026 — Primera comprobación: Katuq publicado y FLORECER activado

Daniel pidió: «revisa si ya quedó desplegado katuq y sigue con la activación del piloto para probar que opttia cree tickets desde el chat». Autoriza este piloto y una prueba identificada como QA por el recorrido normal; se avisó que generará las notificaciones habituales. No autoriza extender la función a otros comercios, alterar roles, fabricar sesiones, borrar/cerrar tickets o corregir una identidad ajena.

Comprobación actual, sin reinicios/despliegues:

- Seller público `2026.10.27.7`, publicada `2026-10-27T16:53:56.010Z`, fuente `b215fcdcb055c31d272056adbf4404832c0e532f`, metadato de árbol limpio. Su fuente contiene `81d675c4`. Bundle público `main.8278310f52f1888a.js`, SHA256 `1955202cf3d876066b12a28b3d6339a77234fe539664d634c2c4c14e28653f76`, contiene `katuq:SUPPORT_PROPOSAL`, `katuqSupportConfirmation` y `app-opttia-support-ticket`.
- Backend productivo `1c9ddaedb55f5124e596380a48c37315b1e5235a`, rama `backend-aws-security`, contiene `aea0ab2d`; `katuq-api` online como ubuntu, PID2632433, entrypoint/directorio correctos. Siete archivos de la integración sin modificaciones remotas contra HEAD. Router/puente/firma/admisión/herramienta conservan los hashes previos; el servicio común amplió el prefijo de intención para D-549 sin retirar los controles D-545. Regresiones locales existentes:57/57 verdes con persistencia/modelos falsos, sin pruebas nuevas en Git (D-566).
- Opttia continúa en `4a61ae4a441d1053b139532761d5bd57d6a87c38`, rama aislada; tres hashes sin cambios, systemd activo, PID1676954 y NRestarts0. Health público200; MCP integrado sin sesión401. Esta comprobación no consumió cuota ni llamó a un modelo.

Activación: `node scripts/set-company-feature.js FLORECER opttiaSupportTickets on --dry-run` resolvió inequívocamente `1RVP9U8fGdHQ0p6Omj5S`, antes ausente. Después se ejecutó el mismo comando con `--execute`; relectura `true` y demás banderas conservadas. Consulta posterior de empresas con ese booleano devuelve **solo FLORECER**, activo y no suspendido. Dueño Daniel y revisión/retiro2027-01-31 siguen en el contrato/catálogo. No se escribieron roles, plan, permisos, secretos o configuración de otros comercios. Reversión acotada si se solicita o el piloto presenta una falla: apagar únicamente esa bandera con el mismo script (simulación primero), preservando tickets y contador.

Prueba de navegador pendiente: la pestaña Edge inicialmente figuraba en login; después apareció una sesión de Daniel de **Julsmind**, no FLORECER. En una pestaña propia separada se abrió el chat sin enviar mensajes: muestra Julsmind y «No se pudo validar el usuario en esta empresa». No se usa esa sesión para otro tenant ni se intenta fabricar/editar JWT o storage. Se pidió al usuario dejar iniciada una sesión legítima de FLORECER, sin compartir contraseña. Captura acotada al chat, sin cifras del tablero: `/Users/danielga/.codex/visualizations/2026/09/03/01a06913-e34d-7df3-abba-b0b27c2aca1f/opttia-support-pilot-20261027/sesion-otro-comercio.png`.

Todavía **cero consultas al modelo, propuestas, tickets o avisos reales de esta comprobación**. La activación de configuración está hecha; falta acceso autenticado del piloto y recorrido preparar→cancelar sin alta→preparar→Crear ticket→número guardado/reintento. No marcar6.3/6.4 completas ni certificar operación a partir de salud, bundle o mocks. Se conservan cambios ajenos de CONTRACT (incluidos conflictos ya presentes); sin commit/push nuevo, cambios de producto, build o despliegue en esta sesión. La nota de versión D-567 se incorpora al subir un cambio visible; aquí solo se ejecutó el piloto ya publicado, sin nueva versión.

## 27-oct-2026 — ALMARA autorizada y creación real del ticket #1424

**Cambio autorizado por Daniel:** «probemos con ALMARA SIN PROBLEMA». Excepción acotada a probar en ALMARA sin esperar una sesión de FLORECER, no autorización general para habilitar todos los comercios. Se anunció el reporte de QA y sus avisos normales. El usuario inició una sesión legítima de ALMARA en Edge; se reutilizó en una pestaña propia, sin exportar tokens, pedir contraseña, cambiar tenant en storage, fabricar JWT o modificar permisos.

Activación ALMARA: el script canónico con `--dry-run` resolvió `ALMARA FELICIDAD/ct9emhY6ZE1u9Y6IJCPb`, con bandera ausente. El mismo script con `--execute` guardó y releyó solo `opttiaSupportTickets:true`; resto de banderas conservadas. En el chat real: ALMARA visible, plan con mensajes ilimitados, acceso validado, sugerencia Reportar un problema de Katuq y leyenda de tickets con confirmación. Consulta final global de esta bandera: **ALMARA FELICIDAD y FLORECER**, nadie más. No se alteró el plan para obtener cupo ni se habilitó otra herramienta comercial.

Reporte controlado: asunto exacto **QA-OPTTIA-20261027 - Prueba de soporte desde el chat**. Descripción de prueba técnica autorizada, declarando que no es un incidente real ni afecta pedidos/pagos/inventario; sin adjuntos ni datos de clientes. Tres mensajes reales al chat básico y un solo clic de creación, sin usar el formulario habitual para simular el resultado del chat.

| Paso | Evidencia real |
|---|---|
| Antes del mensaje | Consulta exacta empresa+asunto:0 documentos |
| Primera preparación por Opttia | Tarjeta con empresa/autor correctos, datos revisables, caducidad y Crear ticket/Cancelar; todavía0 documentos |
| Cancelar | Propuesta descartada; consulta exacta posterior0 documentos |
| Segunda preparación y clic Crear ticket | Tarjeta «Ticket #1424 creado», estado Pendiente; confirmación por el MCP existente |
| Lectura independiente | Un documento en `support`, empresa ALMARA FELICIDAD, `canal:mcp`, intención integrada presente, fecha `2026-10-27T17:27:07.809Z`, número1424 |
| Repetir reporte mediante nueva consulta | Tarjeta estructurada «Ticket #1424 existente», sin botón de otra creación; consulta exacta sigue en1 documento |
| Avisos habituales | Siete marcas de alta en `support_notificaciones`, mismo conteo antes/después de repetir; no certifica entrega SMTP/Slack |
| Ver mis tickets | Navegación real a `/misTickets`, fila y detalle con #1424/asunto QA visibles |

DocId opaco de trazabilidad: `opttia_b150e54b5a3bcef28fd64cff0c6ede27d1815276823e82e9b1a7348bd989f27a`. Las lecturas de comprobación estuvieron limitadas a empresa+asunto exactos y al prefijo de avisos de ese ticket; sin exponer destinatarios, autorizaciones privadas o contenido de otros tickets. No se borró/cerró ni asignó el reporte; continúa Pendiente como evidencia. No se retrocedió el contador ni se invocaron avisos adicionales desde esta verificación.

**Límites:** repetir una consulta y recibir el duplicado reciente no prueba el replay de la misma intención, una respuesta perdida, revocación productiva o concurrencia real. Esos controles conservan57/57 pruebas offline, pero no se certifican como ejecutados en producción. No se tocaron roles ni se interrumpió temporalmente soporte del comercio para ampliar la prueba.6.3 completa para los dos pilotos autorizados;6.4 básica real aprobada y sus escenarios adicionales pendientes. No se extiende disponibilidad a todos los comercios.

**Hallazgos de UX, sin cambiar código:** la respuesta textual al duplicado mostró el docId técnico y «La herramienta devolvió…», aunque la tarjeta se mantuvo correcta con número/estado/enlace. Debe pulirse la comunicación, sin confundir ese id con una credencial. Además, la primera captura tras éxito quedó sobre una parte anterior del mensaje por el scroll; se desplazó el chat para mostrar el resultado. Captura final útil: `/Users/danielga/.codex/visualizations/2026/09/03/01a06913-e34d-7df3-abba-b0b27c2aca1f/opttia-support-pilot-20261027/almara-ticket-1424-existente.png`, solo chat, comercio y ticket de QA; sin correo/credenciales ni datos del tablero.

No hubo build, cambios productivos de código, reinicios, despliegue, commit o push en esta prueba. Documentación local y estados actualizados; cambios concurrentes de CONTRACT conservados. Los arneses/pruebas nuevas siguen fuera de Git según D-566. Las banderas de ambos pilotos quedan encendidas conforme a las autorizaciones; apagar solo la que se requiera con el script canónico y simulación previa conserva el ticket y su número.
