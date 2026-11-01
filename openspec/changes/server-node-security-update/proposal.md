# Actualización acotada de seguridad del runtime del servidor

Fecha: 2026-10-23 (America/Bogota). Estado: alcance, diseño y tareas aprobados por Daniel; preparación y pruebas autorizadas, corte productivo pendiente de revisión de resultados. D-542.

**Aprobación:** «Sí, apruebo el alcance. Prepara el diseño y las tareas para pasar a Node 22.23.4 de manera quirúrgica, con pruebas de compatibilidad y reversión lista». Esta instrucción autoriza redactar ambos artefactos en esta sesión; no se interpreta como aprobación del diseño aún no presentado ni como autorización para intervenir producción.

**Aprobación posterior:** «Apruebo el diseño y las tareas. Prepara los respaldos y ejecuta las pruebas de compatibilidad y el ensayo de reversión; no hagas el corte en producción hasta revisar los resultados». Se ejecuta únicamente esa preparación; no se instalan drop-ins/lanzadores activos ni se reinician servicios productivos.

## Por qué

Daniel solicitó actualizar Node.js en el servidor de Katuq «de manera quirúrgica». El diagnóstico de solo lectura confirmó Node 20.20.0 en producción. Esta rama terminó soporte el 30 de abril de 2026 y no recibió las correcciones oficiales del 21 de octubre. La versión corregida de la rama soportada más cercana es 22.23.4 LTS. No se ha establecido que exista una intrusión: este diagnóstico verifica exposición y topología, no realiza análisis forense.

## Alcance aprobado

Actualizar el runtime de los servicios Node del servidor de producción, conservando el comportamiento y el código actualmente desplegados. Comprobar compatibilidad y reversibilidad antes de sustituir procesos activos; intervenir de forma secuencial y verificar cada servicio antes del siguiente. La preparación de diseño y tareas conserva los checkpoints humanos del repositorio.

La aceptación cubre API, Genkit legacy, watcher activo, ambos daemons PM2 y sus módulos. Excluir uno debe quedar explícitamente registrado como exposición pendiente. ADK es Python y solo requiere comprobar que continúa operativo. El diseño determinará el mecanismo y cualquier ventana necesaria; no se promete interrupción cero sin verificarlo.

## No-goals

- Desplegar commits nuevos de la aplicación o modificar lógica de negocio, autenticación, pedidos, inventario, precios o integraciones.
- Actualizar indiscriminadamente paquetes npm, PM2, el sistema operativo o nginx; habilitar/deshabilitar workers o flows.
- Escribir datos de negocio, cambiar secretos o realizar backfills.
- Actualizar staging u otros servidores dentro de esta intervención.
- Dar por resuelta una posible intrusión mediante una actualización de runtime.

## Riesgos y condiciones

- Es un salto mayor 20 → 22, fuera de la exención de dependencia patch del Artículo I; requiere aprobación de spec, diseño y tareas.
- Hay módulos nativos y dos gestores de procesos de usuarios distintos. La compatibilidad y el runtime efectivo de cada proceso deben verificarse, incluyendo persistencia para el próximo arranque.
- Reiniciar servicios arranca sus workers habituales: evitar instancias duplicadas, repetir operaciones o cambiar su configuración; comprobar salud y errores.
- Una reversión restaura disponibilidad pero reintroduce exposición: debe informarse y dejar el cambio pendiente.
- El write-set de esta tarea excluye escrituras directas de negocio. Los efectos normales de servicios ya activos no constituyen pruebas autorizadas de escritura.

## Fuentes

- [Aviso oficial del 21-oct](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
- [Release 22.23.4](https://nodejs.org/en/blog/release/v22.23.4).
- [Calendario oficial](https://github.com/nodejs/Release#release-schedule).
- [Evidencia de solo lectura](findings.md).
- Spec de aceptación: `specs/server-runtime-security/spec.md`.
- [Diseño](design.md), [tareas](tasks.md) y [procedimiento de reversión](rollback.md), aprobados para preparación y ensayo; ejecución y límites en [verificación](verification.md).
