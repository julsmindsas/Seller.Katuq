# Tareas — actualización Node 22.23.4

Fecha: 2026-10-23. D-542. **Diseño y tareas aprobados; Daniel autoriza corte único el 23-oct a las 23:00 America/Bogota directamente en servidor. La ejecución real sigue pendiente de la ventana.** No hay tareas paralelizables sobre producción. Solo se marcan como hechas las actividades con evidencia en verification.md.

Cada tarea indica entrada, salida/check y dependencia. Los resultados deben ir a `verification.md` cuando se ejecuten, separando evidencia aislada de evidencia productiva y sin secretos. No marcar checks por estar descritos.

## 0. Checkpoints documentales

- [x] **0.1 Alcance/spec:** Daniel aprobó el 23-oct pasar a 22.23.4 preservando comportamiento, con compatibilidad y rollback. Salida: aprobación registrada en proposal/CONTRACT. Dependencia: diagnóstico.
- [x] **0.2 Borradores solicitados:** preparar design, tasks y procedimiento de rollback. Check: consistencia entre ellos y con la spec; estado explícito de no ejecución. Dependencia: 0.1.
- [x] **0.3 Aprobar diseño:** Daniel aprobó explícitamente el diseño, 23-oct; autorización limitada a respaldos, pruebas y ensayo, sin corte. Dependencia: 0.2.
- [x] **0.4 Ratificar tareas:** Daniel aprobó explícitamente las tareas, con revisión de resultados antes de producción. Dependencia: 0.3.

- [x] **0.5 Programación autónoma autorizada:** tras recibir resultados, Daniel pide hacer la actualización y programarla directamente en servidor para el23-oct23:00 Colombia; habilita preparar/instalar el ejecutor y la intervención en esa ventana, con gates y reversión. La rutina local se sustituye por systemd. Ver scheduled-cutover.md.

## 1. Preflight y material reversible (sin cortar servicios)

- [ ] **1.1 Inventario fresco y coordinación (PARCIAL):** inventario y auditoría final verificados; congelar publicaciones durante la ventana aún no aplica ni se ha acordado. Entrada findings; salida host/DNS, árbol de procesos, runtimes reales, puertos, módulos, commits/hashes y consumidores programados. Check: ningún consumidor Node relevante sin dueño/runtime y ninguna publicación concurrente durante el corte. Dependencia: 0.4.
- [ ] **1.2 Salud base (PARCIAL):** 180 sondeos sin fallos y servicios activos; equivalente técnico de solo lectura implementado/verificado (API JSON + bootstrap + proceso/listeners + probe de metadatos con cuenta existente). Repetir línea base en la ventana. Entrada inventario; salida 2 minutos de status/latencias y métricas técnicas de procesos, memoria, errores y schedulers. Check: estado actual caracterizado y método autorizado de lectura protegida disponible o equivalente acordado. Dependencia: 1.1.
- [x] **1.3 Respaldo privado:** snapshots/dumps anteriores y actuales, módulos, systemd, Node 20, ejecutable antiguo root y nativos en backup privado; 33 archivos verificados. No se detuvieron procesos. Dependencia: 1.1 (inventario inicial verificado; coordinación de ventana aún pendiente).
- [x] **1.4 Node candidato íntegro:** firma oficial/fingerprint y SHA-256 verificados; runtime 22.23.4 x64/ABI127 en ruta versionada root-owned, sin cambiar Node global. Dependencia: 1.3.

## 2. Compatibilidad aislada y herramientas de operación

- [x] **2.1 Entorno aislado:** copias independientes API/Genkit y namespace de red/PID/montajes con chroot; sin rutas externas, .env/service accounts ni sockets/PM2_HOME productivos. /usr readonly y capacidades peligrosas retiradas. Dependencia: 1.3.
- [x] **2.2 Nativos:** PASS de re2/sharp con ambos ABIs preparados y cero nativos adicionales en PM2/módulos. Entrada inventario `.node` + candidato; salida resultados re2/sharp y demás nativos compatibles, comparación Node 20/22. Check: pruebas funcionales en memoria y ldd sin faltantes; hashes del original intactos. Dependencias: 1.4, 2.1.
- [x] **2.3 Artefacto re2 si se requiere:** fallo ABI115→127 reproducido; misma versión 1.21.4 compilada offline con GCC13.3 en overlay aislado de paquetes Ubuntu verificados por apt. No se instalaron paquetes en el host; dpkg status intacto. Artefacto y original hasheados; package/locks idénticos. Dependencia: 2.2 (fase de diagnóstico ejecutada antes del rebuild).
- [x] **2.4 Importaciones, compilación y contratos:** 26/26 comprobaciones PASS en ambos runtimes, incluidos siete archivos de contratos y build Genkit. Entrada copia compatible; salida matriz Node 20/22 para dependencias y tests existentes revisados (auth/tenant, pedidos, inventario, webhook/idempotencia, workers). Check: compilación/sintaxis apropiadas sin errores nuevos; fallos previos documentados y ningún test real de escritura. Dependencias: 2.2 y 2.3 si aplica.
- [x] **2.5 Entrypoints aislados:** 6/6 PASS (API/Genkit/watcher × Node20/22), sin cierre forzado. Entrada mocks y copias API/Genkit/watcher; salida arranque, listeners, ready y cierre. Check: ninguna conexión externa ni worker real, sin consumidores duplicados. Dependencia: 2.4.
- [x] **2.6 Helpers operativos con dry-run:** backup, aislamiento, generación de dumps, probes, ensayo y auditoría implementados/probados; ejecutor fechado y supervisor independiente implementados y ensayados con UID/GID/grupos preservados; timers instalados/habilitados y verificados, sin corte anticipado; evidencia en scheduled-evidence.json. Ver scheduled-cutover.md. Entrada diseño + manifests; salida scripts de preflight, generación/validación de dumps, corte, verificación y rollback que fijan usuario/PM2_HOME/PATH/Node, sin volcar env. Check: `bash -n`/`node --check`, tests de transformaciones allowlist, controles de PID/hash/estado y copias atómicas. La preparación solo instala archivos operativos y units/timers dedicados; no modifica servicios o PM2_HOME activos antes de la ventana. Dependencia: 2.1.
- [x] **2.7 Ensayo PM2 y reversión:** PASS con las dos variantes reales de logrotate; rollback ubuntu 5.387 s y root 7.693 s en laboratorio. Entrada PM2 5.4.3, dos PM2_HOME aislados, procesos/módulos ficticios y helpers; salida migración 20→22 y fallo inducido→20. Check: semántica real de auto-módulos/resurrect/.bak, secuencia por servicio, runtimes, persistencia y rollback ≤180 s por grupo, sin pérdida de entradas/env ni permisos. Dependencias: 2.6, 2.2.
- [x] **2.8 Gate técnico para programación:** evidencia de preparación disponible en verification.md/evidence.json; revisión del instalador/diff y salud protegida siguen pendientes, sin autorización de corte. Entrada resultados anteriores; salida matriz PASS/FAIL y comandos finales con rutas/hashes concretos. Check: todo requisito aplicable verde, respaldo materializado y rollback ensayado; sin fingir que un `online` o un 401 acredita salud completa. Dependencias: 2.4, 2.5, 2.7.

## 3. Revisión del corte y persistencia candidata

- [x] **3.1 Diff operativo:** artefactos concretos de scheduled-cutover.md/install-schedule.py revisados/probados;4 units validadas con systemd-analyze, hashes sellados.  entrada helpers probados; salida diff sanitizado de nativos (hashes), PATH/intérpretes, dumps, drop-ins y lanzador. Check: write-set exacto del diseño; ningún git pull, npm/apt upgrade, cambio de app/env/negocio ni retiro de auth. Dependencia: 2.8.
- [x] **3.2 Aprobar ventana/publicación:** Daniel autorizó el23-oct23:00 Colombia la ejecución directa en servidor, con bloqueos por concurrencia/drift y reversión automática; no depende de un operador/SSH vivo. El journal privado conserva el resultado.  entrada diff y duración medida en ensayo; salida aprobación humana de la intervención concreta y canal de atención del operador. Check: pausa de publicaciones concurrentes y criterios de go/no-go aceptados. Dependencia: 3.1.
- [ ] **3.3 Revalidar y sellar snapshot:** entrada servidor justo antes del corte; salida manifiesto final + backups verificados y sondeo activo. Check: si hay drift, invalidar candidatos afectados y repetir sus gates antes de seguir. Dependencia: 3.2.

## 4. Intervención secuencial en producción

- [ ] **4.1 Grupo root:** entrada snapshot/candidato sellados; salida root PM2 + logrotate en 22, después index y watcher uno por uno. Check: viejos procesos drenados, ningún huérfano, runtimes reales y lista completa persistida. Incumplimiento → rollback root y fin de secuencia. Dependencia: 3.3.
- [ ] **4.2 Gate root:** entrada 4.1; salida 5 minutos de estabilidad técnica y salud de Genkit/watcher, API/ADK sin regresión. Check: sin errores/restarts/duplicación ni nuevas operaciones manuales de negocio. Dependencia: 4.1.
- [ ] **4.3 Grupo ubuntu:** entrada gate root; salida API y PM2/logrotate en 22 tras drenaje y sustitución mínima del nativo si aplica. Check: no consumidores antes de cambiar `.node`; ready/listeners/salud en ≤90 s, hash/version correctos, sin regresión auth. Fallo → rollback ubuntu y root conforme runbook. Dependencia: 4.2.
- [ ] **4.4 Persistencia final:** entrada ambos grupos sanos; salida drop-ins/lanzador/dumps y `.bak` completos con rutas 22. Check: unidades válidas y daemon-reload sin start/restart, resolución pm2 ubuntu/sudo, permisos root-owned y ningún job aprobado usando Node 20; sin reboot. Dependencia: 4.3.
- [ ] **4.5 Observación final:** entrada persistencia; salida 15 minutos sin fallos y evidencia del scheduler acordado, lectura protegida y contraste de procesos/hashes. Check: aceptación de spec completa; si un tick requiere más tiempo, esperar o registrar explícitamente pendiente sin dar cierre completo. Dependencia: 4.4.

## 5. Cierre

- [ ] **5.1 Evidencia y contrato:** entrada verificación final; salida matriz real, versiones/PIDs/ejecutables, duración de cortes, decisiones y pendientes en verification/CONTRACT. Check: código y lockfiles no cambiaron, no datos de negocio de prueba, ningún secreto publicado. Dependencia: 4.5 o rollback documentado.
- [ ] **5.2 Retención y pendientes:** entrada resultado; salida ubicación privada de respaldo y reglas de uso de Node 22, inventario de Node 20 dormante y discrepancia engines, decisión de retención/retiro pendiente. Check: nada eliminado que quite la reversión y ninguna automatización creada sin solicitud. Dependencia: 5.1.
- [ ] **5.3 Versionar solo lo propio si Daniel lo autoriza:** entrada documentación/scripts revisados; salida commit con sello conforme CONTRACT. Check: no incluir cambios de otras sesiones, backups, dumps, credenciales ni artefactos binarios de producción; sin push/deploy implícito. Dependencia: 5.1.
