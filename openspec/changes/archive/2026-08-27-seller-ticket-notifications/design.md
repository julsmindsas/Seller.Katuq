# Design — seller-ticket-notifications

## Context

Support (repo `katuq_support`, sesión 2026-08-25) ya publica todos los eventos del ciclo de vida del ticket con payload enriquecido (`type: TICKET_*`, `numero`, estados, `actionUrl`) en `ActualizacionTicket{nomComercial}` y encola correos idempotentes en `colaCorreos` (RTDB de `julsmind-katuq`, la misma que usa el Seller). El gestor de la campana del Seller (`notification-manager.service.ts`) ya soporta tipos, prioridad, leído-por-usuario y navegación por `actionUrl`. Falta la mitad del Seller: encolar correos y escribir su notificación de creación con el mismo contrato, y mapear los tipos `TICKET_*`.

## Goals / Non-Goals

**Goals:** correos encolados (comercio + equipo) al crear, consecutivo visible en el Seller, campana con eventos de ticket tipados/accionables, todo idempotente.

**Non-Goals:** consumidor de la cola (backend), rediseño visual (wdu9v78jh6), backend de Support.

## Decisions

1. **Servicio nuevo `TicketNotificacionesSellerService`** (espejo compacto del de Support): claves idempotentes deterministas + `crearSiNoExiste` vía transacción RTDB + plantilla HTML de correo Katuq + reserva del consecutivo (`contadores/tickets`, transacción). Se usa `AngularFireDatabase` como los servicios de notificaciones existentes.
   - *Alternativa descartada*: meter todo en `ServiciosService` — es el servicio legacy que la guía del repo pide no engordar.
   - *Alternativa descartada*: compartir código físico entre repos (paquete) — overhead injustificado para dos archivos; el contrato compartido queda documentado en la spec.
2. **Contrato del payload in-app** = el que ya emite Support: `{message, ticketId, numero, type, evento, estadoAnterior, estadoNuevo, actionUrl, actionText, timestamp, read}`. El `notification-manager` agrega el mapeo `TICKET_CREATED / TICKET_STATUS_CHANGED / TICKET_ASSIGNED / TICKET_REPLY / TICKET_CLOSED / TICKET_REOPENED` con ícono/severidad; los tipos desconocidos siguen cayendo al default actual (compatibilidad con notificaciones viejas).
3. **Correos del equipo operativo en `environment.soporte.correosEquipo`** (mismo esquema que Support: sgarcia@katuq.com + TODO correo de Daniel), no quemados en el código de componentes.
4. **El contador es el compartido `contadores/tickets`**: un solo consecutivo global para tickets creados desde Support y Seller (requisito de unicidad); la transacción RTDB resuelve la concurrencia entre ambas apps.
5. **Idempotencia de la creación**: clave `t{cd}_creacion` (cd del backend, único por ticket) — el reintento de la notificación tras un fallo de red no duplica ni correo ni campana.

## Risks / Trade-offs

- [El consumidor de `colaCorreos` no existe aún] → Los correos quedan encolados con registro; el criterio de "envío" se reporta como condicionado en ClickUp. Un solo consumidor servirá a ambas apps.
- [Reglas RTDB abiertas: cualquiera podría leer/escribir la cola] → Riesgo preexistente ya documentado (plan de reinicio, D-235 contexto); se cierra junto con las reglas en el trabajo de seguridad, no aquí.
- [Payload distinto entre apps si evolucionan por separado] → El contrato queda fijado en la spec `support-ticket-notifications`; cualquier cambio pasa por propuesta.

## Migration Plan

Solo frontend Seller: build + deploy estándar. Rollback = revertir commit. Sin migración de datos (las notificaciones viejas siguen mostrándose por el fallback de tipos).

## Open Questions

- Correo de Daniel para `correosEquipo` (mismo TODO que en Support) — no bloquea la implementación.
