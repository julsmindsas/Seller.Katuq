# Diseño — Node 22.23.4 en producción

Fecha: 2026-10-23. D-542. **Diseño/tareas aprobados; corte único autorizado el23-oct23:00 America/Bogota directamente en servidor.** Ver la [adenda operativa](scheduled-cutover.md) para ejecutor, temporizadores, salud equivalente y recuperación independiente.

Daniel aprobó el alcance y pidió preparar diseño y tareas juntos. Se entregan tareas candidatas, subordinadas a aprobar este diseño; no se omite su checkpoint antes de implementar.

Posteriormente aprobó diseño/tareas y autorizó respaldos y ensayos, prohibiendo el corte hasta revisar resultados. Tras recibirlos, aclaró que la tarea es para hacer la actualización y pidió ejecutarla directamente en el servidor a las23:00. Esa autorización posterior habilita la secuencia de §5 en la ventana, conservando sus controles y sin adelantarla. El estado real se registra en verification.md.

## 1. Decisión técnica y límites

Instalar el tarball oficial **Node 22.23.4 linux-x64 glibc**, en directorio versionado y root-owned `/opt/katuq-node/node-v22.23.4-linux-x64`. Conservar `/usr/bin/node` 20.20.0 y el paquete NodeSource durante la ventana de reversión. No reemplazar binarios globales, ejecutar apt upgrade, npm install general, git pull, actualizar PM2, cambiar versiones de dependencias o recompilar/publicar código de aplicación.

Solo se prepara una copia independiente de las dependencias desplegadas para comprobar compatibilidad. Si un nativo falla por ABI, se construye **la misma versión** para Node 22 en el entorno aislado. En la ventana se sustituye únicamente el artefacto nativo necesario, con su original respaldado. No se comparte una copia por hardlinks con producción. Una incompatibilidad que exija cambiar código o versiones bloquea el gate y vuelve a revisión de alcance.

El manifiesto nativo debe identificar **todos sus consumidores y cuándo lo cargan**, incluidos imports transitivos del watcher desde el árbol del API. No probar root con un árbol candidato y luego arrancarlo en producción con otro ABI. Si ambos daemons necesitan versiones incompatibles del mismo artefacto durante la transición, la secuencia root→ubuntu aquí propuesta queda bloqueada: presentar una revisión de diseño/ventana para detener juntos sus consumidores o aislar sus dependencias, con aprobación antes de ampliar la parada.

El runtime actual de cada daemon y sus hijos se mide por PID, `/proc/<pid>/exe` con permisos adecuados, hash/version del ejecutable y estado PM2; `node --version` de la shell no sirve como aceptación. Todos los procesos de larga duración del alcance, incluidos módulos y daemons, deben terminar en 22.23.4. No se puede declarar el servidor saneado mientras quede un proceso fuera del inventario o sin versión acreditada.

## 2. Inventario, concurrencia y respaldo

Revalidar DNS/host y capturar fecha, commits/hashes, procesos, modo, argumentos, cwd, intérprete, wait_ready, timeouts, listeners y árbol de hijos. Revisar timers, crontabs y otros supervisores para detectar consumidores de Node fuera de PM2, sin imprimir sus secretos. Coordinar una ventana sin despliegues de otras sesiones; si cambian commits, dependencias, procesos o configuración desde el snapshot, invalidar el candidato y repetir las comprobaciones afectadas.

Respaldar en `/var/backups/katuq-node22/<run-id>/`, root-owned, directorios 0700 y archivos sensibles 0600:

- Por usuario: dumps existentes antes de save, snapshot actual de procesos y el dump de reversión generado de la lista viva; ambos dumps y `module_conf.json`, unidades systemd/drop-ins y sus propietarios/modos. Los dumps contienen secretos: no se adjuntan al repo ni al chat.
- Manifest de módulos automáticos: logrotate no necesariamente pertenece al dump de aplicaciones. Registrar su configuración y comprobar su restauración aparte.
- Hash y copia del Node 20.20.0 actual; copia del ejecutable antiguo del daemon root vía `/proc` si aún existe (evidencia; no asumir su versión). La reversión operativa usa el Node 20.20.0 conocido y conservado.
- Cada artefacto nativo que vaya a sustituirse, hash antes/después, propietario/modo y ruta real; respaldar el destino de symlinks y registrar su relación. No modificar otros `.node`.
- Script CLI y árbol PM2 5.4.3 con hashes; no se actualizan. También cualquier lanzador `pm2` existente que el diseño vaya a sustituir.

Mantener un manifiesto sin secretos para auditoría y un journal de cambios con precondición, acción, resultado y deshacer. La reversión verifica esos hashes, no usa copias improvisadas después de la caída.

## 3. Integridad, compatibilidad y ensayo

Descargar tarball y SHASUMS firmados desde nodejs.org. Verificar firma con las claves de release oficiales verificadas por fingerprint y el SHA-256 del archivo antes de extraer/ejecutar. Headers para compilar nativos también deben verificarse. No usar `curl | bash`, claves elegidas solo por nombre ni mirrors sin verificar. Registrar origen, fingerprint y hashes.

Construir el candidato en un entorno Linux x86_64/glibc compatible, sin credenciales de negocio, sin `.env` productivo y sin acceso a Firestore, colas o proveedores reales. Usar mocks locales o emulador con proyecto demo y bloqueo de salida externa. Copiar código y dependencias exactos, incluidos los entrypoints no versionados que realmente ejecuta PM2; preservar su confidencialidad.

En producción no se encontraron `make` ni `g++` en el PATH consultado. No instalar toolchain allí para resolverlo. Si `re2` necesita compilar, hacerlo en un builder aislado compatible, con fuentes/dependencias fijadas y headers verificados; registrar toolchain, ABI y bibliotecas dinámicas. Un prebuilt requiere procedencia/integridad acreditadas y el mismo gate funcional. Si no hay builder o artefacto verificable, **no hay go**.

| Prueba | Criterio de éxito |
|---|---|
| Runtime | Versión exacta 22.23.4, arquitectura x64, ABI/N-API registrados y bibliotecas sin faltantes. |
| `re2@1.21.4` | Carga y casos match/no-match, Unicode, captura y reemplazo; el original sigue funcionando con Node 20 en la copia de reversión. |
| `sharp@0.33.5` | Transformar una imagen sintética en memoria, comprobar tamaño/formato y lectura del resultado. No fotos reales. |
| Resto de nativos | Inventario completo por API, Genkit, PM2 y módulos; cargar/probar cada nativo usado en su plataforma, sin intentar cargar binarios musl en glibc. |
| Dependencias JS | Importación y rutas realmente usadas de auth/HTTP, Firebase SDK, WebSocket y Genkit en entorno aislado. No importar entrypoints con side effects en producción. |
| Compilación | `node --check` de los entrypoints/copias afectados y build válido del proyecto cuando exista configuración de compilación; Genkit en su copia. El API declara `tsc` sin tsconfig: documentar el check real, no afirmar que ese comando es un build válido. |
| Contratos existentes | Allowlist revisada de tests de auth/tenancy, pedidos, inventario, webhooks/idempotencia y colas con mocks; comparar Node 20 vs 22 y explicar fallos previos. Ningún test contra servicios reales. |
| Arranque aislado | API cluster + ready/cierre, Genkit y watcher con transportes simulados; sin doble consumidor ni cambios de negocio. Si el aislamiento no es demostrable, no arrancarlos para probar. |
| PM2 5.4.3 | Reproducir dos PM2_HOME de ensayo, módulos y procesos ficticios, startup, corte, arranque secuencial y save; no conectar el ensayo a los sockets de los daemons vivos. |
| Reversión | Provocar fallo de arranque, restaurar binario nativo/Node 20/dumps/unidades y repetir salud. Medir tiempo real y conservar evidencia. |

La declaración `engines.node = "20"` del API y Genkit se conserva porque el alcance excluye cambios de código. Se documenta como discrepancia operacional pendiente; las pruebas no la convierten automáticamente en compatibilidad. Si hay una validación estricta que impida el arranque, detenerse y presentar su diff por separado; no usar `--force` ni cambiarla silenciosamente.

## 4. PM2 y persistencia

Fuente verificada del **PM2 5.4.3 instalado**: `lib/Client.js` crea el daemon con `spawn('node', ...)` si encuentra Node en PATH. `ClusterMode.js` usa `cluster.fork()`. Por tanto, cambiar solo `exec_interpreter` o ejecutar la CLI con el Node nuevo no garantiza que la API cluster cambie de runtime.

Todas las llamadas de intervención usan usuario/PM2_HOME explícitos y PATH con `.../node-v22.23.4-linux-x64/bin` primero, además de ejecutar esa CLI mediante el binario absoluto. Para root usar `sudo -H env ...`; para ubuntu el contexto ubuntu. No trasladar los procesos de usuario ni crear un tercer daemon. No usar `pm2 update`, `reload all` ni `systemctl start/restart pm2-*`: esconderían el alcance y/o resucitarían la lista equivocada.

Generar de cada dump vivo un candidato completo y subdumps de un solo servicio. Conservar todo salvo `exec_interpreter` para procesos Node y PATH efectivo (tanto top-level como `env` cuando exista); fijarlos al candidato sin perder el resto de variables, flags, cwd, modos, límites, ready y timeouts. Rechazar intérpretes distintos de Node, nombres repetidos inesperados, rutas inexistentes o diferencias no permitidas. No alterar el snapshot de reversión.

El ensayo debe demostrar la semántica de módulos y `resurrect`. Arrancar un daemon limpio puede iniciar logrotate automáticamente. Después se instala atómicamente en su PM2_HOME el subdump del siguiente servicio en **ambos** `dump.pm2` y `dump.pm2.bak` y se usa `resurrect`; verificar estado real, no solo exit code (el código PM2 puede devolver lista aunque falle una restauración). Así se inician los servicios de negocio uno por uno. Tras completar el grupo, `save` y validar el dump completo; copiar el final validado a `.bak` para evitar fallback a lista vieja o incompleta.

Persistencia por servicio con drop-in root-owned `node22-runtime.conf`: PATH candidato primero y ExecStart/ExecReload/ExecStop usando Node 22 absoluto + CLI PM2 5.4.3 actual, conservando User, PM2_HOME, PIDFile, tipo, dependencias y demás unidad base. Limitar permisos de `/opt` para que ubuntu no pueda reemplazar un binario ejecutado por root. Verificar unidades y hacer `daemon-reload`, **sin arrancar las unidades** mientras sus daemons existen.

Al terminar ambos grupos, un lanzador root-owned `/usr/local/bin/pm2` fijará Node/PATH 22 y reenviará los argumentos a la CLI ya instalada; conservará usuario y PM2_HOME. Primero comprobar que no se sobrescribe otro lanzador, que el PATH de ubuntu y sudo lo selecciona y que su hash corresponde al candidato ensayado. Este cambio evita que un futuro `pm2` manual cree un daemon con Node 20. El lanzador no actualiza el paquete PM2 ni el Node global. Su diff y reversión forman parte del gate de publicación.

## 5. Ventana y secuencia

La unidad mínima de parada es un **daemon y su grupo**: todos sus procesos se detienen al cambiarlo; los servicios de negocio se restauran secuencialmente. No se promete continuidad por un simple reload: el cluster necesita el runtime nuevo del daemon. No se levanta una segunda API con workers productivos para ocultar el corte.

1. Gate documental: diseño, tareas, diff de scripts/artefactos operativos y ventana aprobados; compatibilidad y ensayo de rollback verdes. No coordinar enviando mensajes a terceros sin autorización.
2. Preflight fresco, backups/manifest verificados, sondeo de salud activo, supervisión local independiente (watchdog + ExecStopPost, adenda de ejecución desatendida) y journal abierto. No comenzar si hay cambios concurrentes, errores previos sin caracterizar, operaciones largas que impidan drenar o capacidad insuficiente.
3. Grupo root primero (sin parar API): detener procesos por nombre uno a uno y verificar salida/drenaje antes de matar su daemon. Confirmar que no quedan hijos; instalar subdumps candidatos y arrancar daemon/módulo; después `index`, comprobar, y después `shopify-watcher`, comprobar. No cambiar ni ejecutar manualmente flows. Guardar/validar lista completa.
4. Gate de salud root durante 5 minutos antes del grupo ubuntu. Si falla, revertir root y terminar.
5. Grupo ubuntu: drenar/parar `katuq-api` según timeouts existentes y confirmar ausencia de consumidores del grupo; parar módulo/daemon. Sustituir el nativo necesario mediante archivo temporal + rename atómico en el mismo filesystem, verificando hashes/propiedad. Arrancar nuevo daemon/módulo y luego API con su subdump; verificar ready, listeners, procesos y salud. Guardar lista completa.
6. Con ambos grupos sanos, completar/validar drop-ins y lanzador, save/dumps finales, observación de 15 minutos y al menos un tick de los schedulers activos que deban observarse (si tarda más, dejar explícita esa comprobación pendiente; no lanzar un flow a mano). No declarar aceptación completa mientras falte un gate obligatorio.

Los cierres usan la configuración actual; no alargar timeouts silenciosamente ni aceptar un SIGKILL de un proceso con trabajo sin evaluar. Una caída de salud o un cierre forzado dispara no-go/reversión. Los crones habituales pueden producir sus efectos normales: se monitorean sin escrituras artificiales ni repeticiones para «validar».

## 6. Salud, tiempos y decisión

- Sondeos cada 2 s desde antes de la parada, con timeouts acotados y registro de status/latencia, sin cuerpos de negocio. API raíz 404 y `/v1/health/crons` 401 sin sesión son baseline; ADK `/adk/health` 200. Estos estados no bastan como salud funcional.
- Además: endpoint protegido de solo lectura con sesión operativa ya autorizada, si está disponible, sin extraer/fabricar credenciales; en su ausencia queda gate bloqueado hasta acordar una verificación equivalente. API ready + crones/worker inicializados una vez, watcher conectado y Genkit escuchando en sus puertos esperados; conteos/IDs técnicos sin PII.
- Cada daemon y proceso deben mostrar ejecutable 22.23.4 y árbol esperado; no daemons huérfanos, consumidores duplicados, nueva ráfaga de errores, reinicios espontáneos o memoria creciendo sin estabilizar. Ningún nuevo error de ABI, librería, auth, TLS, OOM o conexión a proveedores.
- Baseline previo: 2 minutos. Presupuesto inicial de recuperación de cada grupo: **90 s** desde la parada; sin salud completa al límite, iniciar rollback. Tras ready, tres sondeos fallidos consecutivos, crash/restart inesperado, duplicación o error crítico obligan a revertir sin esperar el plazo. ADK/nginx no se reinician.
- Objetivo de rollback: grupo recuperado en **≤180 s** desde la decisión. El ensayo debe cumplirlo; si no, ajustar diseño/ventana antes de producción. No es una garantía aún medida.
- Una falla de ubuntu revierte ubuntu y, en orden inverso, el root ya migrado para volver a un estado base único. Si el rollback también falla, detener acciones repetitivas, preservar evidencia, informar y seguir el procedimiento de incidente con el último snapshot válido; nunca ocultar el resultado como éxito.

## 7. Write-set y gate constitucional

Write-set operacional cerrado: directorio versionado de Node, respaldos y staging, nativos enumerados/hasheados si se requieren, dumps/módulos/configuración de lanzamiento PM2, drop-ins dedicados y lanzador `pm2`. No escrituras directas en Firestore, Shopify, catálogo, precios, órdenes ni inventario; no cambia lógica de esos dominios. Los tests de negocio existentes operan solo con dobles/emulador y no requieren nuevos contract tests de integración externa por este cambio de runtime.

Constitución: I–III alcance/spec/diseño/tareas aprobados, ejecución autorizada en la ventana con gates y reversión, y exención patch no utilizada; IV–V/X idempotencia/webhooks no se modifican; VI/IX UI fuera de alcance; VII/XI evidencia con IDs técnicos, secretos en respaldos privados; VIII contratos existentes aislados antes de cutover; XII sin flags; XIII un solo cambio, spec breve; XIV D-542 actualizado; XV esquema de integraciones intacto. Sin módulos, endpoints, colecciones, motores IA ni caches nuevos.

Limitaciones explícitas: Node 20 permanece instalado exclusivamente para reversión y no debe usarse en tareas operativas nuevas; comandos `node` fuera del lanzador siguen resolviéndolo. Antes de cerrar, inventariar jobs/scripts y fijar el runtime de todo consumidor activo aprobado; si aparece otro, detenerse a incorporar y validar su alcance. La retirada del paquete y la alineación posterior de engines requieren su revisión y no se simulan como hechas. Esto no es un análisis forense ni limpia un compromiso previo.

## 8. Referencias y entregables

- [Evidencia](findings.md), [tareas candidatas](tasks.md), [reversión](rollback.md).
- [Node 22.23.4 y SHASUMS firmados](https://nodejs.org/en/blog/release/v22.23.4).
- [Verificación oficial de releases](https://github.com/nodejs/node#verifying-binaries).
- [PM2: cambio de Node requiere actualizar su arranque](https://pm2.keymetrics.io/docs/usage/update-pm2/), [startup y persistencia](https://pm2.keymetrics.io/docs/usage/startup/).
- PM2 5.4.3: código instalado `lib/Client.js`, `lib/God/ClusterMode.js`, `lib/API/Startup.js`, leído en producción sin modificar.
