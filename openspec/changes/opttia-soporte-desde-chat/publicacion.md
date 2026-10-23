# D-545 — Entrega Git y despliegue de solo Opttia

23-oct-2026. Autorización de Daniel: «si aprobado, sube los cambios a git y despliega opttia, katuq lo despliego con otra sesión».

## Lote y límites

- Backend Katuq: `aea0ab2d`, rama `backend-aws-security`, subido a origin. Catorce archivos propios de soporte/MCP/tests. No se desplegó ni se reinició su API, PM2 o Hosting desde esta sesión.
- Opttia/ADK: `4a61ae4a441d1053b139532761d5bd57d6a87c38`, rama `codex/opttia-support-tickets`, subido a origin. Seis archivos, tres productivos. Basado en producción `944c5e2`, sin audio/scripts posteriores, marca D-511, mensajes 1354 ni cotizaciones/auth nativos. El checkout original combinado se conserva intacto; no hacer pull/merge ciego para reintroducir esos candidatos.
- Seller: fuentes y pruebas D-545, artefactos del cambio y solo la sección D-545 de CONTRACT. Se excluyen los documentos/cambios concurrentes y `src/assets/version.json` generado; no es el dist autorizado para Hosting. La otra sesión debe recompilar desde la punta integrada y aplicar los candados habituales.
- Publicar no habilita `opttiaSupportTickets`, concede permisos ni autoriza un ticket/aviso real. Activación y prueba operacional 6.3/6.4 permanecen pendientes. No se alteraron secretos, modelos o paquetes.

## Verificación del lote separado

Backend 57/57 y catálogo 39/39; Seller 16/16, build productivo previo de las mismas fuentes propias exit0 (evidencia histórica `verificacion.md`). ADK separado 26/26 local, incluyendo stock/MCP fixture; E2E de los tres repositorios verde apuntando explícitamente a la rama aislada, con modelo, almacenamiento y avisos simulados. Cero tickets reales.

En EC2, antes de reiniciar: 25/25 soporte/chat básico/política sobre el candidato en worktree privado, con el Python/librerías productivos: Python3.12, ADK1.23.0, MCP1.29.0, Pydantic2.12.5. Dos avisos de deprecación del Runner, sin errores. No se instaló ni actualizó ningún paquete. Compilación de los tres archivos limpia.

## Respaldo, intento y estado

Respaldo privado verificado: `/home/ubuntu/opttia-deploy-backups/d545.qyrBif/`. Conserva commit/rama, fuentes anteriores, waitlist/diff, `.env` y unidad systemd; pruebas y candidato en directorio privado. No se versionan sus contenidos sensibles. Scripts acotados y revisados en `qa/prepare-opttia-release.sh` y `qa/deploy-opttia-release.sh`.

Primer intento: el gate de salud de aproximadamente31s venció; se ejecutó reversión automática a `944c5e2`, solo por código/systemd. Salud interna/externa200 y servicio activo después de volver. Revisión del journal: cero tracebacks/tipos de excepción detectados; no se certificó la causa ni se ocultó el intento fallido. El arranque anterior restaurado tardó20s hasta primer listener y26s hasta el siguiente. Se amplió la espera acotada de salud, sin cambiar runtime/configuración. Segundo intento en verificación; no dar por publicado hasta registrar salud/hash/rechazo sin sesión.

## Entrega para la otra sesión de Katuq

Integrar el commit backend `aea0ab2d` (ya en su rama), revisar solo sus archivos/hunks y desplegar según manual EC2. Seller está en `feature/venta-asistida-mejorada`; el SHA definitivo de entrega se registra al cierre. No publicar directamente el build local sucio `2026.10.23.8`: actualizar desde la punta sin pisar cambios concurrentes, compilar de nuevo y revisar metadatos/candado. Mantener bandera apagada durante ambos despliegues. El soporte nuevo no está disponible al usuario hasta tener los componentes Katuq y una activación piloto expresamente autorizada.

La publicación de Opttia usa su rama explícita; futuros despliegues desde `feat/claude-agent-sdk` deben integrar D-545 o podrían retirar esta capacidad. No adelantar el trabajo de marca o cotizaciones como parte de esa integración. Reversión de Opttia: revisión respaldada y restart de `kai-adk`, conservando datos, entorno y waitlist; sin reset --hard ni rollback de contadores/tickets.
