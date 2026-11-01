# Reversión preparada — procedimiento para ensayar antes de producción

Fecha: 2026-10-23. D-542. **Aprobado y ensayado; corte autorizado para el23-oct23:00 America/Bogota, aún no ejecutado.** Los respaldos privados y runtimes de recuperación ya existen, con checksums verificados. El ensayo inicial restauró ubuntu en5.387s y root en7.693s con sus dos instalaciones exactas de logrotate; esos tiempos no garantizan el resultado productivo. La [adenda de ejecución programada](scheduled-cutover.md) concreta el ejecutor actual, watchdog y respaldos frescos en `/opt/katuq-node/operations/20261023-2300-cot/backup/`, generados antes de cortar. Ver [evidencia y límites](verification.md).

## Disparadores y orden

Revertir por falta de salud a los 90 s de la parada, crash/restart inesperado, errores nuevos críticos, duplicación, cierre forzado sin drenaje o tres sondeos consecutivos fallidos después de ready. Detener el avance. Objetivo a demostrar en ensayo: ≤180 s por grupo desde la decisión.

Solo root intervenido: revertir root. Ubuntu intervenido: revertir ubuntu primero y luego root si ya se migró. Si se instaló el lanzador común, restaurarlo al revertir el conjunto, para volver al estado base sin mezclar rutas manuales. Mantener el sondeo de salud y el registro de la ventana.

## Material obligatorio antes de tocar servicios

Un manifiesto privado debe concretar (sin comodines ni «último backup»):

| Dato | Valor o requisito |
|---|---|
| `RUN_ID` | Preparación actual: `20261023T162255Z-d542`. Revalidar y sellar antes del corte; no calcular otro ID al revertir. |
| `BACKUP_DIR` | `/var/backups/katuq-node22/20261023T162255Z-d542`, 0700 root-owned. |
| `NODE20` | `/usr/bin/node`, versión 20.20.0 y hash iguales al preflight; copia ejecutable de respaldo si no coincide. |
| `NODE22` | `/opt/katuq-node/node-v22.23.4-linux-x64/bin/node`, hash candidato. |
| `PM2_CLI` | `/usr/lib/node_modules/pm2/bin/pm2`, PM2 5.4.3 sin cambios y hash original. |
| `ubuntu/runtime20.json`, `root/runtime20.json` | Dumps completos generados de procesos vivos, validados y ensayados; pueden contener secretos. |
| `summary.json.native` y `checksums.json` | Destinos nativos originales, copia de respaldo, SHA-256, uid/gid y modo. El journal de corte deberá enumerar solo los realmente sustituidos; ahora ninguno. |
| `launch-original.tar` y `{usuario}/unit.private.txt` | Unidades originales y metadatos. No existían drop-ins `node22-runtime.conf` ni lanzador `/usr/local/bin/pm2`; el diff y hashes de los futuros archivos deben sellarse antes del corte. |
| `{usuario}/module_conf.json.before`, `modules.tar` y `jlist.private.json` | Configuración original, código y manifest de módulos autoarrancados. |

Respaldar también los dumps que existían antes de `save`, para auditoría. **La recuperación operativa utiliza el snapshot vivo validado**, no un dump preexistente que podría estar desactualizado. El manifiesto y todos los materiales se validan antes de la primera parada.

## Comandos base, desde shell ubuntu

Se invocan rutas absolutas para no depender del lanzador nuevo ni del PATH de sudo. El PATH se fija porque PM2 5.4.3 elige `node` para el daemon. Estas funciones son ejemplos concretos para el runbook aprobado, no se ejecutaron en esta sesión.

```bash
pm2_ubuntu_22() {
  env PM2_HOME=/home/ubuntu/.pm2 \
    PATH=/opt/katuq-node/node-v22.23.4-linux-x64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin \
    /opt/katuq-node/node-v22.23.4-linux-x64/bin/node \
    /usr/lib/node_modules/pm2/bin/pm2 "$@"
}
pm2_root_22() {
  sudo -H env PM2_HOME=/root/.pm2 \
    PATH=/opt/katuq-node/node-v22.23.4-linux-x64/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin \
    /opt/katuq-node/node-v22.23.4-linux-x64/bin/node \
    /usr/lib/node_modules/pm2/bin/pm2 "$@"
}
pm2_ubuntu_20() {
  env PM2_HOME=/home/ubuntu/.pm2 PATH=/usr/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/games:/usr/local/games:/snap/bin \
    /usr/bin/node /usr/lib/node_modules/pm2/bin/pm2 "$@"
}
pm2_root_20() {
  sudo -H env PM2_HOME=/root/.pm2 PATH=/usr/bin:/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/usr/games:/usr/local/games:/snap/bin \
    /usr/bin/node /usr/lib/node_modules/pm2/bin/pm2 "$@"
}
```

Si el hash/versión de `/usr/bin/node` cambió, no usar estas funciones 20: sustituir binario **y** primer directorio de PATH por la copia versionada validada, cuyo ejecutable debe llamarse `node`. No improvisar descargando otro runtime durante una caída.

La copia preparada para ese caso es `/opt/katuq-node/node-v20.20.0-rollback/bin/node`, con hash idéntico al respaldo 20.20.0 y permisos root-owned 0755. El ejecutable root original 20.19.4 también está preservado como evidencia; la reversión operacional ensayada selecciona 20.20.0 para ambos daemons.

El PATH mostrado reproduce los directorios observados en las unidades actuales, reordenados únicamente para fijar Node. Antes de ejecutar, compararlo con el PATH sellado de cada usuario y conservar sus directorios adicionales; no perder herramientas invocadas por los servicios.

## 1. Detener únicamente el grupo a restaurar

Identificar el daemon por usuario, PM2_HOME, PID y ejecutable; no confiar solo en un PID guardado que pueda haberse reutilizado. Si no existe, no llamar a PM2 para «consultarlo»: podría crear uno nuevo. El helper de implementación debe resolver esto antes de invocar las funciones.

- Ubuntu: parar `katuq-api` y verificar su salida; parar módulo restante y matar **solo** su daemon (`pm2_ubuntu_22 kill`) cuando no haya trabajo pendiente.
- Root: parar `shopify-watcher`, después `index`, comprobar cierre, y matar **solo** root (`pm2_root_22 kill`). Los nombres se contrastan con el inventario actual; una diferencia detiene el procedimiento para revisión.
- Confirmar por sistema operativo que ya no hay daemon ni hijos del grupo. No sustituir nativos mientras quede un consumidor vivo. No usar SIGKILL indiscriminado ni matar Python/nginx. Si no se logra drenar, declarar incidente y seguir el plan acordado para operaciones en vuelo.

## 2. Restaurar materiales del grupo antes de arrancar

1. Verificar integridad del snapshot de recuperación y del destino actual contra el journal. Si el destino cambió por otra sesión, no sobrescribirlo ciegamente.
2. Restaurar cada nativo realmente cambiado con temporal en el directorio destino y rename atómico. Conservar uid/gid/modo; comprobar SHA-256 original. No copiar todo node_modules ni ejecutar npm install/rebuild.
3. Restaurar `module_conf.json` y metadatos operativos solo si esta intervención los cambió. No restaurar/borrar logs, sockets o datos de negocio.
4. Restaurar el drop-in original del grupo; si no existía, retirar únicamente `node22-runtime.conf` creado por esta ejecución y con su hash esperado. No borrar otros drop-ins ni toda la unidad.
5. Instalar el dump vivo Node 20 validado en `dump.pm2` **y** `dump.pm2.bak`, con permisos 0600 y el propietario correcto. Para arranque secuencial, usar subdumps de una sola aplicación, generados y ensayados de ese mismo snapshot; finalizar con el dump completo después de verificar todo el grupo.
6. Ejecutar `sudo systemctl daemon-reload` tras restaurar unidades. No iniciar/reiniciar `pm2-ubuntu.service` ni `pm2-root.service`: el arranque se hará explícitamente a continuación.

La implementación debe generar los comandos de copia/rename con las rutas exactas del manifiesto y ofrecer `--dry-run`. El ensayo debe ejecutar esos mismos comandos con snapshots de prueba, no una reversión distinta. No se incluye una orden genérica `cp -r` ni `rm -rf` que pueda extender el alcance.

## 3. Levantar Node 20 y comprobar

- Ubuntu: con subdump de API instalado y su `.bak` igual, `pm2_ubuntu_20 resurrect`; comprobar también logrotate autoarrancado.
- Root: con subdump de `index`, `pm2_root_20 resurrect`; comprobarlo; después instalar subdump de watcher en ambos dumps y repetir `pm2_root_20 resurrect`; comprobar watcher y logrotate. No lanzar manualmente tareas de proveedor ni backfills.
- Por cada proceso/daemon: Node 20.20.0 efectivo, un solo grupo, mismos listeners/modos/nombres, ausencia de errores nuevos y vuelta a salud baseline. Genkit no se confunde con ADK.
- Solo después de salud: `pm2_ubuntu_20 save` / `pm2_root_20 save` para los grupos restaurados. Verificar que contienen la lista completa y fijar `.bak` a la lista final validada; no guardar una lista vacía o parcial.
- Si se había cambiado el lanzador común, restaurar su archivo original o retirar solo el archivo propio verificado; comprobar resolución de `pm2` para ubuntu y sudo. Verificar unidades/dumps y los runtimes persistidos, sin reboot de prueba.

## 4. Cierre de reversión

Registrar decisión y tiempos, procesos recuperados, hash de artefactos, pruebas que fallaron y exposición reintroducida. Conservar Node 22 y materiales de ensayo fuera del PATH activo para diagnóstico; no borrar evidencia ni reintentar el corte en bucle. Si no se recuperó un grupo al objetivo de 180 s, comunicarlo como incidente y preservar el último snapshot válido. La vuelta a Node 20 restablece disponibilidad, **no** resuelve el riesgo de seguridad.
