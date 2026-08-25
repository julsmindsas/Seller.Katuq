# Design — fix-seller-ticket-creation

## Context

El flujo de soporte del Seller Center vive en `src/app/components/soporte/` (formulario `soporte.component`, listado `mis-tickets.component`) y persiste contra el backend de Support (`POST https://api.katuq.com/v1/support/ticket/create`, repo aparte) vía `ServiciosService` (legacy). Las notificaciones in-app usan RTDB: `notificaciones` (equipo de soporte, app Support) y `ActualizacionTicket{nomComercial}` (campana del Seller, la escucha `notification-manager.service.ts:339`). El diagnóstico con evidencia `file:line` está en el proposal: la raíz del bug es leer `currentCompany` de `sessionStorage` cuando el login lo persiste en `localStorage`.

## Goals / Non-Goals

**Goals:**
- Que un ticket creado quede siempre asociado a la empresa correcta y aparezca en Mis Tickets.
- Payload mínimo trazable (nomComercial + NIT + email del reportante), sin el objeto empresa completo.
- Confirmación con número/estado, error de red con reintento seguro, notificaciones correctas al crear.

**Non-Goals:**
- Consecutivo numérico (backend de Support — ClickUp wdu9v78jhe), correos (wdu9v78jh8/jh9), rediseño visual (wdu9v78jh6), cambios de backend, migración de tickets históricos con `tienda: undefined`.

## Decisions

1. **Fuente de empresa: `SecurityService.getCompanyInformationLogged()`** en ambos componentes.
   - *Alternativa descartada*: leer `localStorage['currentCompany']` directo — repetiría el patrón frágil que causó el bug y CLAUDE.md ya define a SecurityService como fuente de verdad.
2. **`ServiciosService` se mantiene como transporte** (métodos `addTicket`/`getTickets` existentes); se corrige `addNotification` para recibir `ticketId: string` y se agrega `addTicketNotificationForCompany(message, ticketId, nomComercial)` que escribe en `ActualizacionTicket{nomComercial}`.
   - *Alternativa descartada*: crear un servicio nuevo extendiendo `BaseService` — `BaseService` apunta a `environment.urlApi` (back.katuq.com) y este flujo golpea el API de Support (host distinto); mover el transporte es rework sin valor para esta urgencia y las reglas piden no crear módulos "v2" sin aprobación.
3. **Canal del comercio = `nomComercial`** (no NIT): es lo que la campana del Seller ya escucha y lo que existe en RTDB real (`ActualizacionTicketOH MY STORE`). Queda registrado que la app Support hoy publica por NIT y no llega al Seller — alinear Support a `nomComercial` se hace en las tareas de notificaciones (jh8/jh9), no aquí.
4. **Sin empresa resuelta → bloquear envío** con mensaje de re-login, en vez de crear un ticket huérfano (dato perdido irrecuperable, como los históricos con `tienda: undefined`).
5. **Validación visible**: `markAllAsTouched()` al intentar enviar + mensajes por campo con los tokens del design-system (acento `#5F3FE0`, semánticos par fuerte/fondo-suave, plano sin gradientes). El botón deja de estar `disabled` por invalidez (solo por `isSubmitting`) para que el intento de envío dispare el feedback.
   - *Alternativa descartada*: mantener el botón deshabilitado sin explicación — es exactamente la queja de "no funciona".
6. **Navegar a Mis Tickets al cerrar el Swal de éxito** (hoy navega de inmediato y el usuario no alcanza a leer el número).

## Risks / Trade-offs

- [El backend de Support acepta cualquier payload; reducirlo podría omitir un campo que Support lee] → Verificado contra `katuq_support`: backlog/tablero/detalle usan `tienda`, `company` (string), `asunto`, `status`, `prioridad`, `ticketComments`, `historyStatus`, `usuarioMesaAyuda`, `cd`; el objeto empresa completo no se usa en ninguna vista. `nit` se agrega (hoy Support lo espera para notificaciones).
- [Reintento tras timeout cuando el servidor sí creó el ticket → duplicado] → Mitigación parcial: guard `isSubmitting` + navegación al listado tras éxito. La idempotencia real requiere soporte del backend (fuera de alcance; queda anotado para wdu9v78jhe/backend).
- [Tickets históricos con `tienda: undefined` siguen invisibles] → Aceptado y documentado; migrar datos viejos no hace parte de esta urgencia.

## Migration Plan

Solo frontend: build + deploy estándar (`npm run release`). Rollback = revertir el commit. Sin cambios de datos ni de contrato.

## Open Questions

- Ninguna bloqueante. (La unificación NIT vs nomComercial entre Support y Seller se decide en las tareas de notificaciones.)
