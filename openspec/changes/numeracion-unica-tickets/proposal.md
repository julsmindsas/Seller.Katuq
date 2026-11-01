# Numeración única de tickets de soporte

## Por qué

Ticket de soporte [1243, bCWjNHTFzXNWjwQJQwQL](https://support.katuq.com/tickets/ticket/bCWjNHTFzXNWjwQJQwQL), consultado por MCP el 20-oct-2026. Su evidencia muestra dos asuntos distintos con el número 1241: «Error de cuenta contable iva» y «Web · F4-27 · KAI dentro de la web». No demuestra dos copias del mismo ticket.

El MCP confirmó que `uTCgddxjj6i1J4sqr2Ao` tiene el número 1241. El código local confirma dos fuentes de numeración: Seller reserva en `contadores/tickets` de Realtime Database; `services/soporte/crearTicket.js` acepta el número recibido y, si falta, calcula el mayor de `support.nroTicket` más uno. El problema ya estaba anotado en `nps-y-comentarios/tasks.md`. Falta verificar el backend efectivamente publicado en `api.katuq.com` y el cliente Support antes de implementar.

## Qué cambia

- Cada ticket nuevo recibe un número visible único entre todos los canales de soporte, incluso con aperturas simultáneas.
- La confirmación, la lista, las notificaciones y los correos muestran el número realmente guardado.
- Los clientes anteriores que envían un número no pueden introducir otra colisión.
- Los tickets históricos conservan sus identificadores, contenido, números y enlaces; los repetidos existentes se distinguen por su identificador técnico.

## Capacidad

`support-ticket-numbering`: numeración coherente al crear tickets desde Seller, Support, MCP y NPS.

## Fuera de alcance

- Renumerar, borrar, fusionar o archivar tickets históricos.
- Cambiar asignaciones, estados, autenticación, permisos o políticas de correo.
- Rediseñar Support o añadir colecciones o endpoints.
- Modificar pedidos, pagos, facturación, inventario o sus consecutivos.
- Resolver los tickets 1239 (Opttia), 1240 (correo), 1242 (nota crédito) o 1244 (Opinar/NPS).

## Riesgos y condiciones

- Es un consecutivo: se requiere diseño y tareas aprobados y, después, aprobación explícita del diff antes de aplicarlo, según `openspec/config.yaml`.
- La compatibilidad incluye Support y clientes ya publicados. Verificar sus consumidores y el destino productivo antes de elegir la solución.
- La validación debe cubrir concurrencia, números recibidos de clientes antiguos, todos los canales y paridad entre número persistido y mostrado.
- El diagnóstico no autoriza modificar datos históricos ni enviar tickets/correos de prueba a comercios reales.

## Estado

Propuesta y spec pendientes de aprobación. Sin diseño, tareas, implementación ni despliegue. D-507 en `specs/CONTRACT.md`.
