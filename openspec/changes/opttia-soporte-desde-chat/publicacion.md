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
