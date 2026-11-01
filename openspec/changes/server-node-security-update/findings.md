# Diagnóstico del runtime — solo lectura

Fecha: 2026-10-23, aproximadamente 10:46–10:51 COT. No se instalaron paquetes ni se reiniciaron servicios.

## Identidad verificada

- DNS `back.katuq.com` corresponde a producción documentada en MANUAL-EC2 y `CLAUDE.md` del backend. El alias SSH `lightsail` es staging: también se consultó su versión, pero no se modificó.
- Producción: Ubuntu 24.04.3 LTS, Linux x86_64; `/usr/bin/node` 20.20.0, paquete NodeSource `20.20.0-1nodesource1`.
- La caché apt solo ofrece la rama 20 (candidato 20.20.2); esto no demuestra disponibilidad de un parche para el aviso de octubre. No se ejecutó apt update ni apt install.
- Checkout backend `backend-aws-security`, commit `04060ac9bd78fecc031f70488bdddb018da0bff5`. Se observaron archivos sin seguimiento; no se tocaron. Antes de intervenir debe releerse el commit por sesiones concurrentes.

## Procesos

| Gestor | Proceso | Estado | Runtime reportado |
|---|---|---|---|
| PM2 ubuntu 5.4.3 | katuq-api (cluster, wait_ready=true) | online | 20.20.0 |
| PM2 ubuntu | pm2-logrotate | online | 20.20.0 |
| PM2 root 5.4.3 | index (Genkit legacy) | online | 20.20.0 |
| PM2 root | shopify-watcher | online | 20.20.0 |
| PM2 root | pm2-logrotate | online | 20.20.0 |
| systemd | kai-adk (Python) | active | no aplica |
| systemd | nginx | active | no aplica |

Ambos servicios de arranque `pm2-ubuntu` y `pm2-root` están habilitados, pero inactivos mientras los daemons viven. No se deben iniciar para comprobarlos: resucitarían procesos. `/proc/1424/exe` del daemon root apunta a `/usr/bin/node (deleted)`; no se determinó la versión de ese inode antiguo. Verificar solo `node --version` no acredita el runtime de los procesos existentes.

## Compatibilidad y capacidad

- El package.json desplegado declara `engines.node = "20"`; el salto soportado más pequeño es 22 y requiere tratamiento explícito de compatibilidad, no una actualización patch.
- Nativos encontrados: `re2@1.21.4` (`build/Release/re2.node`), `sharp@0.33.5` (binarios linux x64 glibc/musl). Su presencia no demuestra que puedan cargarse con el candidato; falta probarlo sin arrancar la aplicación.
- Runtime actual: ABI 115, N-API 9. Verificar especialmente los módulos vinculados al ABI de Node.
- Disco libre observado: 38 GB; memoria disponible: ~1.9 GiB; sin swap. Evitar levantar una segunda aplicación completa con workers productivos para probar.

## Línea base HTTP sin credenciales

| URL | Estado observado |
|---|---|
| `https://back.katuq.com/` | 404 |
| `https://back.katuq.com/v1/health/crons` | 401 |
| `https://back.katuq.com/adk/health` | 200 |

404 en raíz y 401 sin sesión son la línea base, no un fallo probado. Estos checks no acreditan salud funcional de inventario, pedidos ni autenticación completa. No se fabricaron sesiones ni se enviaron escrituras de prueba.

## Fuente y límite del diagnóstico

El aviso oficial [21-oct-2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) incluye CVE-2026-111497 (Brotli, posible ejecución de código), entre otras. [22.23.4](https://nodejs.org/en/blog/release/v22.23.4) contiene las correcciones. Node 20 terminó soporte el 30-abr-2026 según [el calendario oficial](https://github.com/nodejs/Release#release-schedule).

Este inventario no investiga indicadores de intrusión ni descarta un compromiso previo. Está pendiente aclarar si Daniel se refiere al aviso público o a evidencia de explotación. La detección de intrusión cambiaría el alcance y exigiría preservar evidencia antes de reiniciar.

## Adenda de diseño — 2026-10-23, ~11:03 COT

- Daniel pidió consultar la web y posteriormente aprobó el alcance para preparar diseño y tareas. No aportó indicadores concretos de intrusión; no se interpreta como confirmación de ausencia de compromiso.
- Se reconsultó producción: mismo commit `04060ac9bd78fecc031f70488bdddb018da0bff5`, Node 20.20.0 y los cinco procesos PM2 anteriores en línea con los mismos PIDs. Sin drop-ins en las unidades PM2. Ninguna instalación, parada o cambio remoto realizado en esta fase.
- PM2 5.4.3 instalado declara Node `>=12.0.0`, pero esto no prueba compatibilidad funcional con 22. `lib/Client.js` usa `spawn('node', ...)` cuando encuentra Node en PATH; `process.execPath` es fallback. Por ello ejecutar la CLI con Node 22 sin fijar PATH puede conservar el daemon viejo. `ClusterMode.js` usa `cluster.fork()`.
- `lib/API/Startup.js` restaura por nombre desde `dump.pm2` y recurre a `.bak` si no puede leer/parsear el primero. Algunas salidas de error muestran la lista sin asegurar éxito. Se requieren checks de procesos reales y dumps/fallbacks candidatos consistentes.
- `re2@1.21.4` depende de `nan` y carga directamente `./build/Release/re2.node`; no asumir estabilidad de ABI. `sharp@0.33.5` admite `>=21` en engines, aún requiere prueba funcional. Genkit también declara `engines.node = "20"`.
- API node_modules: ~1.4 GB; Genkit: ~618 MB; re2: ~37 MB. `make` y `g++` no aparecieron en PATH. El API declara build `tsc`, pero no tiene tsconfig en functions. No se ejecutó ese supuesto build ni se afirma compilación exitosa.
- El watcher activo es un listener Firestore con consultas de lectura. La coincidencia textual `.add()` corresponde a su `Set` en memoria, **no** a escritura Firestore; se descartó el indicio inicial. Su output existente contiene datos de negocio y no se debe volcar como evidencia pública. Sus reconexiones/arranque requieren ensayo con mocks.
- `/usr/local/bin/pm2` no existía en la consulta. Las unidades fijan PM2_HOME por usuario y resucitan vía `/usr/lib/node_modules/pm2/bin/pm2`, con PATH que resuelve el Node global. Sus comandos stop/reload también usan esa CLI por shebang. El diseño propone drop-ins y un lanzador dedicado, ambos reversibles, sin activar esas unidades durante la intervención.
