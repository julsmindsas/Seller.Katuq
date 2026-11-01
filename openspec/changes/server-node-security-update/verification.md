# Verificación D-542 — preparación y programación sin corte

> Estado actual: ejecución única habilitada en el servidor para el 23-oct-2026 a las 23:00 Colombia; aún sin corte. [Verificación de timers y ensayos finales](scheduled-evidence.json). Las secciones iniciales conservan el informe histórico de preparación.

Fecha: 2026-10-23 (America/Bogota). Run ID `20261023T162255Z-d542`. **Preparación y ensayos completados; no se hizo el corte productivo.** [Evidencia estructurada sin secretos](evidence.json).

## Autorización y límites

Daniel aprobó diseño/tareas y pidió preparar respaldos, pruebas de compatibilidad y ensayo de reversión, sin corte hasta revisar resultados. No se cambian intérpretes, daemons, nativos, código, dependencias, startup units ni lanzadores activos de producción. `pm2 save` se utilizó únicamente para serializar la lista viva, después de respaldar los dumps anteriores; no reinicia aplicaciones.

## Respaldos e integridad

- Backup privado en servidor: `/var/backups/katuq-node22/20261023T162255Z-d542`, root-owned y directorios 0700; dumps/material sensible 0600. `checksums.json` valida 33 archivos: listas actuales y previas, módulos, units, runtimes y tres nativos. No hay dumps/secretos en el repositorio.
- Root PM2 ejecuta realmente Node **20.19.4**, SHA `43d6cf63f2a460b463eba6b19df5e9a259771c56f11b5130e04178a15bb99490`, preservado desde `/proc/1424/exe`. Ubuntu PM2 y las aplicaciones usan 20.20.0, SHA `d01614ef369e36eee9ab8d86fbfa93ddf44931010add45e5262a63e3ddda784e`.
- Node 22.23.4 se preparó en `/opt/katuq-node/node-v22.23.4-linux-x64`, root-owned sin escritura de grupo/otros; es dormante, fuera del PATH productivo. ABI 127, N-API 10.
- Reversión sin descargas: `/opt/katuq-node/node-v20.20.0-rollback/bin/node`, root-owned, hash idéntico al Node 20.20.0 respaldado. No reemplaza `/usr/bin/node`.
- Firma del SHASUMS oficial válida con fingerprint **5BE8A3F6C8A5C01D106C0AD820B1A390B168D356**. Tarball SHA-256 **1805bcd35e6815559bd2eb97db438d3fdb0eb3a5e6a977b7c1badca76337e9ce** verificado antes de extraer/ejecutar.
- `re2` original ABI115: **1db46a983204b59ee0be899b54eb61b98e82bbc67f00857b2b75d8ccd7b044a9**. Candidato ABI127, misma versión 1.21.4, compilado en laboratorio: **74171a20fd4517a5d68600ada04773fe82c2940ffd0390ab2feb49beb08980f3**. Bibliotecas dinámicas resueltas en host; el archivo productivo conserva el hash original.
- Compiler GCC13.3 y make se descargaron/extrajeron exclusivamente en staging; apt operó con `--download-only` y caché/logs propios. `/var/lib/dpkg/status` antes/después idéntico. No se instaló toolchain en el sistema.

## Aislamiento y línea base

- Laboratorio privado: `/var/tmp/katuq-node22/20261023T162255Z-d542`. Namespace independiente de red y PID, chroot con `/usr` readonly, sin home/credenciales/backups/sockets de producción; loopback propio y ninguna ruta externa. Se retiraron SYS_ADMIN, SYS_PTRACE, SYS_RAWIO, SYS_MODULE y SYS_CHROOT tras preparar montajes. Los permisos distintos se conservan con uid 0/1000 para el ensayo PM2.
- Copias independientes de API/Genkit y módulos; sin hardlinks ni env productivo. Package.json y lockfiles de ambos árboles coinciden con producción por hash. Una exclusión inicial demasiado amplia de `logs/` omitió código OpenTelemetry; se corrigió la copia antes de medir compatibilidad. Resultados iniciales se conservaron como diagnóstico y no como fallos de aplicación.
- Línea base HTTP: 60 sondeos por URL durante 120 s, cero fallos de transporte: raíz API 404, salud crones sin credencial 401, ADK health 200. Máximos observados: 0.637 s / 0.200 s / 0.102 s. Son comprobaciones sin sesión, no acreditan salud funcional autenticada.

## Compatibilidad

| Estado de copia | Resultado |
|---|---|
| Node 20.20.0 + re2 original | **26/26 PASS** |
| Node 22.23.4 + re2 original | **25/26 PASS**; fallo esperado `ERR_DLOPEN_FAILED`, ABI115 frente a ABI127 |
| Node 22.23.4 + re2 reconstruido | **26/26 PASS** |

Son 26 comprobaciones agregadas, no un conteo de cada assertion. Incluyen re2 (Unicode/capturas/reemplazo), sharp sobre imagen sintética en memoria, imports reales Express/axios/Firebase/ws/jwt-simple/Genkit, JWT/HMAC/UUID, sintaxis de los tres entrypoints y PM2, siete suites existentes con dobles (write-set inventario, stock transaccional, política inventario/pedido, identidad proveedor, webhooks de flows, HMAC/idempotencia de mensajería y JWT/tenant de WhatsApp) y build TypeScript real de Genkit en la copia. El API no tiene tsconfig: se reporta sintaxis/contratos, no un `tsc` inexistente.

El build de Genkit necesitó ampliar el heap de ensayo de 384 a 1024 MiB; el límite inicial abortó ambos runtimes. Con el límite corregido compilaron ambos. Es un ajuste del laboratorio, no un cambio de flags productivos. Los tests no acceden a datos/colas/proveedores reales.

## Ensayo de reversión y arranque

**PASS** con PM2 5.4.3 real, dos PM2_HOME aislados con uid 0/1000, API ficticia en cluster/ready y servicios ficticios en fork. Se usaron las instalaciones exactas de logrotate de cada usuario: sus árboles de dependencias difieren y se comprobaron por separado. PM2 y módulos no tienen nativos adicionales. No se conectó a sockets ni configuración de los daemons vivos.

| Grupo de laboratorio | Migración a 22 | Reversión a 20 |
|---|---:|---:|
| root: módulo + dos servicios fork | 8.626 s | **7.693 s** |
| ubuntu: módulo + API cluster/ready + re2 | 9.439 s | **5.387 s** |

Se indujo un fallo real del proceso de prueba (`exit 73`); la CLI devolvió 0 y PM2 mantuvo `online`, pero PID=0 y HTTP ausente. El check corregido de proceso real + HTTP detectó la caída. Se restauraron Node 20, el binario re2 original por hash, subdumps/dumps completos y fallback, configuración de módulos y bytes del archivo de arranque simulado, en orden ubuntu→root. Se comprobó salud y versión efectiva de cada daemon/hijo por el hash de `/proc/<pid>/exe`; las lecturas se hicieron como su propietario para mantener SYS_PTRACE retirado. Ambos daemons de ensayo quedaron apagados y la salida del namespace eliminó sus procesos restantes.

Los tiempos son de fixtures locales en una sola ejecución final y **no garantizan** los de producción. La restauración de units se ensayó sobre un archivo de lanzamiento simulado; no se arrancó systemd ni se instaló un drop-in productivo. Los gates de persistencia real y ventana permanecen pendientes.

También pasaron **6/6 pruebas de arranque** con los entrypoints copiados reales (API, Genkit, watcher en Node 20 y 22), Firebase reemplazado por transporte en memoria y red aislada. API respondió en 3300, envió un único ready y cerró con exit 0; Genkit respondió en 3890 y cerró sin forzar; watcher abrió su suscripción simulada y terminó por SIGINT. No se enviaron solicitudes a modelos ni proveedores reales. No se comparan conteos de escrituras de inicialización simuladas como una prueba de equivalencia de negocio: se observaron durante ventanas de arranque distintas y no se tocó Firestore real.

Los intentos iniciales del arnés se conservaron: ajuste de permisos para inspeccionar `/proc` como propietario y corrección del check que tomaba `online` como éxito. No se presentan como fallos de compatibilidad del producto. El resultado final incorpora ambas correcciones y las dos variantes reales del módulo.

## Candidatos, auditoría final y controles restantes

- Dumps candidatos completos y por aplicación en staging privado, generados primero con dry-run. Diff profundo contra los snapshots reales: solo `exec_interpreter`, `PATH` y `env.PATH`; preservados argumentos, variables, cwd, flags y timeouts. El helper rechaza PM2_HOME productivo para instalar dumps durante esta fase.
- Auditoría final PASS: mismos daemons y cinco aplicaciones, PIDs, runtimes, contadores de reinicio y uptime que antes; Node global, tres nativos, configuración de módulos, commits y archivos de entrada/package/lock comprobados sin cambios. Units/drop-ins y `/usr/local/bin/pm2` sin cambios. ADK/nginx activos y HTTP final 404/401/200 igual al baseline. Backups revalidados: **33/33**.
- Crontabs de root/ubuntu consultados sin referencias directas a Node; revisión de units propias identificó los dos PM2. Las coincidencias iSCSI son argumentos de `iscsiadm`, no procesos Node.js. Antes del corte se repetirá el inventario por concurrencia y para jobs futuros.
- API probado: `04060ac9bd78fecc031f70488bdddb018da0bff5`; Genkit: `944c5e2c490d49170001284a5a1cdfe8812c743c`. Cualquier drift requiere revalidar el candidato afectado.
- Sintaxis Bash/Node/Python y pruebas del helper de manifiestos verificadas. La spec se adaptó a los encabezados delta/scenarios que exige OpenSpec, sin cambiar los siete requisitos aprobados.

## Gates de publicación

**No hay autorización de corte.** La lectura protegida de salud, coordinación de ventana, preflight final sin drift y revisión de resultados/diff operativo (incluidos drop-ins/lanzador e instalador de corte) siguen pendientes. No se habilitó un ejecutor contra PM2_HOME productivo en esta preparación. Un ensayo de transportes simulados no reemplaza la validación de proveedores/operación real posterior a una intervención autorizada. Engines continúa declarando Node 20 en ambos proyectos; el runtime vulnerable sigue activo hasta un corte autorizado.


## Adenda — ejecución programada autorizada (23-oct, 23:00 Colombia)

Daniel solicitó ejecutar la actualización en esa ventana y después pidió instalarla directamente en el servidor. La restricción histórica «No hay autorización de corte» de este informe de preparación queda reemplazada por esa instrucción posterior, conservando los gates técnicos. Todavía no se ha hecho el corte. Ver [programación y reversión autónoma](scheduled-cutover.md).

Se detectaron publicaciones concurrentes: API700357a3377db2448392b2082fb8deac144e512c y repoGenkit4a61ae4a441d1053b139532761d5bd57d6a87c38 (cambios ADK, entrypointNode sin cambio). Copia refrescada sin secretos, locks sin cambio y comparación103.369 archivos de código/dependencias PASS; compatibilidad26/26 enNode20 y26/26 enNode22 y6/6 arranques aislados repetidos sobre el código actual. El watcher también arrancó conNode22 mientras la copia conservaba el re2ABI115, sin compartir transportes/productivos. La lectura operacional de crones con Node22 y Firebase real pasó sin sustituir el nativo productivo.

La versión final del ejecutor exige el manifiesto de los archivos probados en cada comprobación de código; una nueva publicación sin revalidación detiene la tarea. Solo se instalarán antes de la hora los archivos privados de operación y las units/timers dedicadas. El binario nativo, PATH/intérpretes activos, drop-ins y lanzador PM2 se mantienen para el corte.


## Programación instalada y verificada — 20:24 UTC del23-oct

**Lista y habilitada en el servidor**, una sola vez el23-oct a las23:00 America/Bogota (24-oct04:00UTC). [Evidencia sanitizada de programación](scheduled-evidence.json). Ambos timers activos/enabled; servicios de actualización y watchdog todavía inactive, estado privado `prepared`, sin grupos tocados. La rutina local de Codex quedó PAUSED y su prompt solo permite lectura si se reactiva por error.

El ejecutor final SHA256 `49fd2058438c4da0c36b43e336acd9b5dda4964928d4b6b64db220f84179dbc7` pasó3/3 casos con PM2 real y UID/GID/grupos explícitos: éxito, fallo de arranque con reversión de ambos grupos y watchdog tras congelar/terminar el ejecutor, limpiando también un comando huérfano. Los casos rechazan código/startup alterados y segunda ejecución; restauran runtime20, nativo y persistencia. El arnés se ajustó de un presupuesto de prueba8s al mismo90s operativo al añadir controles; un intento con8s revirtió correctamente por plazo, sin fallo productivo. Se conservan los intentos privados.

Antes de habilitar se corrigió la herencia de grupos de subprocesses: ubuntu no hereda el grupo0; se comprueban UID/GID efectivos y grupos reales en cada daemon/hijo. La primera instalación permaneció deshabilitada y se archivó sin cortar servicios antes de sustituirla. Los hashes de ejecutor/arnés local coinciden con los ensayados e instalados.

El guard de cron/timers verificó35 definiciones y rechazo de drift. Se sellaron153.855 archivos;103.369 de código/dependencias contrastados con la copia probada. Auditoría posterior a la activación: mismo inventario/PIDs/hashes/configuración/permisos productivos que el sello; nativo ABI115 intacto;33/33 respaldos iniciales revalidados y Node20/22 de recuperación/candidato disponibles. Drop-ins/lanzador y sustitución de re2 se mantienen diferidos a la ventana.

El corte productivo **no se ha ejecutado**. El resultado nocturno quedará en `/opt/katuq-node/operations/20261023-2300-cot/state.json`, `journal.jsonl` y journal de systemd. El trabajo materializa un respaldo fresco antes de parar procesos. Gates de preflight/observación/persistencia y aceptación real siguen dependiendo de esa ejecución; esta evidencia no los marca como superados por estar programados.
