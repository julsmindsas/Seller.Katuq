# Intervención única en servidor — D-542

Daniel autoriza: «Déjala programada directamente en el servidor para hoy a las 11pm, sin depender de mi computador encendido, con las verificaciones y la reversión listas». Ventana: **2026-10-23 23:00 America/Bogota = 2026-10-24 04:00 UTC**. Esta autorización posterior reemplaza el límite anterior de preparación; no permite ejecutar antes de la ventana.

## Ejecutor y write-set

Servidor verificado: `back.katuq.com`, `13.222.206.185`. Operación privada root-owned: `/opt/katuq-node/operations/20261023-2300-cot/`. El [instalador](scripts/install-schedule.py) separa preview, instalación y activación del temporizador; nunca inicia directamente el corte.

- `katuq-node22-20261023.timer` activa una vez `katuq-node22-20261023.service` en la fecha exacta; sin repetición ni ejecución tardía otro día.
- `katuq-node22-20261023-watchdog.timer` inicia tres segundos después un supervisor independiente. `ExecStopPost` del servicio también activa recuperación al fallar/interrumpirse el ejecutor.
- Ejecutable [scheduled-cutover.py](scripts/scheduled-cutover.py), configuración/estado/sello privados, copia del nativo ABI127, evidencia y respaldo fresco. Candado exclusivo y estado persistente impiden ejecución simultánea o repetida.
- Solo durante el corte: dumps y fallback de cada PM2_HOME; `re2.node` enumerado; dos drop-ins `node22-runtime.conf`; `/usr/local/bin/pm2` fijado a Node22. No cambiar `/usr/bin/node`, PM2, dependencias, código de negocio, auth, nginx o ADK.

Los archivos de systemd del trabajo se instalan antes; los drop-ins/lanzador de PM2 se escriben **solo después de recuperar ambos grupos en Node22**. `daemon-reload` valida persistencia sin arrancar unidades PM2 vivas ni reiniciar el host. Se conserva Node20 como reversión dormante.

## Controles y reversión

Un guard previo compara las definiciones de cron y temporizadores/servicios contra el sello, sin incluir los propios del trabajo. Preflight verifica reloj/NTP, host/DNS, lista completa/PIDs/propietarios/configuración y ejecutables reales, integridad de runtimes/nativo, huella de código/dependencias/módulos y unidades, capacidad y herramientas de publicación concurrentes. Un cambio invalida el sello. Dos minutos de línea base y respaldo fresco con checksums preceden a la primera parada. Se vuelve a verificar la huella entre grupos y al terminar.

La salud combina respuesta y schema reales de `/api-docs.json`, rechazo401 de crones sin sesión, proxy/nginx/ADK, PID/hash/version de cada daemon/hijo, listeners, arranque de crones/WooCommerce/flows una sola vez, conexión TLS del watcher y detección de errores críticos/reinicios. No hay llave de servicio configurada para el endpoint protegido de crones; no se inventa un JWT ni se debilita auth. El [probe operacional](scripts/scheduler-probe.cjs) consulta **solo lectura** los metadatos de los bindings activos con la cuenta de servicio existente, mantiene los secretos en el host y exporta hashes de IDs/tiempos. Esta combinación es la verificación técnica equivalente elegida dentro del alcance autorizado; no acredita una transacción de negocio completa.

El lanzador preserva UID, GID y grupos suplementarios reales de cada daemon y comprueba esos permisos también en sus hijos. Root primero y cinco minutos de observación; después ubuntu y sustitución atómica del único nativo necesario, sin consumidores antiguos. Cada recuperación tiene presupuesto90s; salud fallida, cierre forzado, proceso duplicado o error crítico detienen el avance. Tres fallos consecutivos posteriores al arranque disparan reversión. La observación final se amplía a30min para observar crones frecuentes sin invocarlos artificialmente. Los de intervalo largo se registran como pendientes si no corresponde un tick durante la ventana.

El rollback restaura ubuntu y después root según los grupos tocados, nativo ABI115, configuración de módulos, dumps/fallback y persistencia anterior, con objetivo180s por grupo. Se comprueba runtime efectivo, listas y HTTP. Un fallo de recuperación queda como `rollback_failed`; no hay reintentos ciegos ni un resultado de éxito simulado. El watchdog detecta un presupuesto vencido o heartbeat ausente, termina solo el ejecutor si es necesario y ejecuta la recuperación bajo el mismo candado. `KillMode=process` evita que systemd elimine las aplicaciones PM2 restauradas junto con el ejecutor.

## Pruebas y operación

El [arnés](scripts/cutover-rehearsal.py) ejecuta este mismo programa contra PM2 5.4.3, uid0/1000, módulos reales copiados, fork/cluster/ready, HTTP y re2 real dentro del laboratorio sin red externa, credenciales o sockets productivos. Casos: éxito20→22; fallo de arranque22→rollback20; ejecutor congelado/terminado→watchdog→rollback20. Comprueba también rechazo de drift y de segunda ejecución, nativo y archivo de persistencia restaurados. El instalador exige hashes idénticos entre el ejecutor probado e instalado.

La copia ensayada se contrasta archivo por archivo con código/dependencias actuales; los metadatos sensibles y manifiestos permanecen privados. Los resultados iniciales de la mañana se conservan como históricos, separados de la revalidación posterior a publicaciones concurrentes.

Consultar en el servidor:

```bash
sudo systemctl list-timers --all katuq-node22-20261023\*
sudo systemctl status katuq-node22-20261023.service katuq-node22-20261023-watchdog.service
sudo cat /opt/katuq-node/operations/20261023-2300-cot/state.json
sudo journalctl -u katuq-node22-20261023.service -u katuq-node22-20261023-watchdog.service
```

El estado/journal son privados y no contienen dumps, tokens ni logs de negocio completos. La rutina de Codex queda pausada para evitar una ejecución duplicada. No depende de SSH, Codex ni del equipo de Daniel una vez armado.

Referencias: [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html), [systemd.service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html), [fechas y zonas](https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html).
