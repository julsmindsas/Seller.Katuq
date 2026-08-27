# Proposal — seller-ticket-notifications

Tareas origen: ClickUp [wdu9v78jh9](https://app.clickup.com/t/wdu9v78jh9) (urgente — correos de tickets a comercio, Daniel y Santiago) y [wdu9v78jh8](https://app.clickup.com/t/wdu9v78jh8) (alta — mejorar notificaciones in-app de soporte). Se proponen juntas porque comparten el mismo código de notificaciones.

## Why

Hoy el comercio no recibe correo por ningún evento de sus tickets, y las notificaciones in-app de tickets son pobres: la creación desde el Seller escribe solo `{message, ticketId}` con `push()` (duplicable en reintentos), sin tipo, número visible ni navegación — aunque el gestor de la campana (`notification-manager.service.ts`) ya soporta `type`, `actionUrl`, `actionText`, prioridad y leído-por-usuario. La app Support ya fue alineada (sesión 2026-08-25): escribe eventos enriquecidos en `ActualizacionTicket{nomComercial}` (el nodo que la campana escucha) y encola correos idempotentes en `colaCorreos`; falta que el Seller haga su parte en la creación y muestre bien los eventos.

## What Changes

- **Correos (jh9)**: al crear un ticket, el Seller encola en RTDB `colaCorreos` (misma cola que Support) un correo para el comercio (email del usuario logueado) y uno para el equipo operativo (Daniel/Santiago, configurados en environment) con plantilla Katuq: número visible, asunto, estado y fecha. Claves idempotentes (mismo patrón `crearSiNoExiste` de Support): reintentos no duplican. El registro de entrega (`estado: pendiente/enviado/fallido`) vive en cada entrada de la cola.
- **Consecutivo visible**: la creación reserva `nroTicket` del contador compartido RTDB `contadores/tickets` (transacción atómica; el mismo que ya usa Support) y lo muestra en la confirmación y en Mis Tickets.
- **In-app (jh8)**: la notificación de creación escrita al canal del comercio pasa a payload enriquecido — `type: TICKET_CREATED`, `numero`, `actionUrl: '/misTickets'`, `actionText` — y con clave idempotente en vez de `push()`. El `notification-manager` mapea los tipos `TICKET_*` (creado, cambio de estado, asignado, respuesta, cerrado, reabierto) con ícono/severidad propios para que el mensaje sea contextual y accionable; los eventos de estado/respuesta llegan solos porque Support ya los publica en ese nodo.

## Capabilities

### New Capabilities
- `support-ticket-notifications`: notificaciones de tickets hacia el comercio en Seller Center — correo en creación y cambios de estado (cola idempotente con registro de entrega) y campana in-app con mensajes tipados, número visible y navegación al ticket, sin duplicados ante reintentos.

### Modified Capabilities
<!-- ninguna: support-ticket-creation no cambia sus requisitos; esta capability es nueva -->

## Impact

- **Código**: `src/app/components/soporte/soporte.component.ts` (encolar correos, nroTicket, payload enriquecido), servicio nuevo `src/app/shared/services/ticket-notificaciones-seller.service.ts` (cola de correos + canal comercio idempotentes + consecutivo), `src/app/shared/services/notifications/notification-manager.service.ts` (mapear tipos `TICKET_*`), `environment*.ts` (correos del equipo operativo).
- **RTDB**: usa nodos ya existentes/compartidos con Support: `colaCorreos`, `ActualizacionTicket{nomComercial}`, `contadores/tickets`. No se crean colecciones Firestore.
- **Envío físico del correo**: FUERA de este cambio — requiere un consumidor de `colaCorreos` (Cloud Function/extensión en `julsmind-katuq` con SMTP). Hasta que exista, los correos quedan encolados con su registro. Es el mismo pendiente ya documentado en Support.

## No-goals

- El consumidor de la cola (backend/infra) y las pruebas de envío real.
- Rediseño visual de las pantallas (ClickUp wdu9v78jh6).
- Cambios en el backend de Support o en `katuq_admin_back_firebase`.

## Riesgos sobre módulos sensibles

No toca orders/inventory/consecutivos de pedidos ni el 360. El contador `contadores/tickets` es exclusivo de tickets de soporte. Write-set RTDB: `colaCorreos`, `ActualizacionTicket{nomComercial}`, `contadores/tickets`. Riesgo: si el consumidor de correos tarda en existir, el comercio no recibe emails aunque la tarea diga enviados — por eso el criterio de aceptación de "envío" queda explícitamente condicionado al consumidor y así se reporta en ClickUp.
