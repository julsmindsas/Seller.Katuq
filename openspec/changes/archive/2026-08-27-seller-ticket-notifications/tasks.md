# Tasks — seller-ticket-notifications

## 1. Servicio de notificaciones del Seller

- [x] 1.1 Crear `src/app/shared/services/ticket-notificaciones-seller.service.ts`: `crearSiNoExiste` (transacción RTDB), `siguienteNumero()` sobre `contadores/tickets`, `encolarCorreosCreacion(datos)` (comercio + equipo, plantilla HTML Katuq, estado pendiente/intentos/creadoEn) y `notificarCreacionComercio(datos)` con payload enriquecido e idempotente en `ActualizacionTicket{nomComercial}`.
- [x] 1.2 Agregar `soporte: { urlApp, correosEquipo }` a `environment.ts` y `environment.prod.ts` (sgarcia@katuq.com + TODO correo de Daniel).

## 2. Flujo de creación (soporte.component)

- [x] 2.1 Reservar `nroTicket` antes de `addTicket` y enviarlo en el payload; mostrar el número visible (nroTicket o cd de respaldo) en la confirmación.
- [x] 2.2 En el éxito de `addTicket`: reemplazar la notificación simple del canal del comercio por `notificarCreacionComercio` y encolar los correos con `encolarCorreosCreacion` (claves idempotentes con el cd).
- [x] 2.3 Mostrar `nroTicket` en la lista de Mis Tickets cuando exista.

## 3. Campana (notification-manager)

- [x] 3.1 Mapear los tipos `TICKET_CREATED`, `TICKET_STATUS_CHANGED`, `TICKET_ASSIGNED`, `TICKET_REPLY`, `TICKET_CLOSED`, `TICKET_REOPENED` con ícono y severidad propios, manteniendo el fallback actual para tipos desconocidos.
- [x] 3.2 Verificar que el mensaje muestre el número visible del ticket y que `actionUrl` navegue a Mis Tickets.

## 4. Cierre

- [x] 4.1 Build sin errores (`npm run build`) y prueba manual: crear ticket → campana con "Ticket #N creado" accionable → entradas en `colaCorreos` (comercio + equipo) sin duplicados al reintentar → cambio de estado desde Support aparece en la campana del Seller.
- [x] 4.2 Registrar decisión D-XXX en `/specs/CONTRACT.md` (contrato de payload compartido con Support, contador compartido, cola de correos) con bitácora.



