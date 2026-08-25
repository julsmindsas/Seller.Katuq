# Proposal — fix-seller-ticket-creation

Tarea origen: ClickUp [wdu9v78jh7](https://app.clickup.com/t/wdu9v78jh7) — "Seller Center — hacer funcional la creación de tickets" (urgente).

## Why

Los comercios crean tickets de soporte desde `/soporte` que "desaparecen": el formulario lee `currentCompany` de **sessionStorage** (`soporte.component.ts:389`) pero el login lo persiste en **localStorage** (`app.component.ts:299`, `security.service.ts:16`), así que en una sesión nueva el ticket se crea con `tienda: undefined`; como "Mis Tickets" filtra por `task.tienda === currentCompany.nomComercial` (`mis-tickets.component.ts:30-38`, misma fuente frágil), el ticket creado nunca aparece y el comercio percibe el flujo como roto. Además se envía el objeto `CompanyInformation` completo a un API público, la notificación in-app pasa el objeto entero como `ticketId` (`servicios.service.ts:1005`) sin notificar el canal del comercio (`ActualizacionTicket{nomComercial}`, el que escucha `notification-manager.service.ts:339`), y `nombreUsuarioReporta` se precarga de `currentUser?.name`, campo que no existe en `localStorage.user`.

## What Changes

- La empresa activa se resuelve SIEMPRE vía `SecurityService.getCompanyInformationLogged()` (fuente canónica según CLAUDE.md) tanto en `soporte.component` como en `mis-tickets.component`; se elimina la lectura directa de `sessionStorage`.
- El payload del ticket pasa a datos mínimos trazables: `tienda`/`company` = `nomComercial` (string), `nit` = NIT de la empresa, y el email del usuario que reporta; deja de enviarse el objeto `CompanyInformation` completo.
- `nombreUsuarioReporta` se precarga desde los campos que sí existen en `localStorage.user` (email) y permanece editable.
- La confirmación de creación muestra el número del ticket y su estado inicial ("Pendiente"), y la navegación a Mis Tickets ocurre al cerrar la confirmación.
- Ante error de red el formulario conserva los datos, informa el fallo y permite reintentar; el guard `isSubmitting` existente previene el doble envío.
- Al crear, se notifica correctamente: `notificaciones` (equipo, con `ticketId = cd`) y el canal propio del comercio `ActualizacionTicket{nomComercial}` para que la campana del Seller lo muestre.
- Si el formulario está inválido al intentar enviar, los campos con error se marcan visiblemente (hoy el botón solo se deshabilita sin explicación).

## Capabilities

### New Capabilities
- `support-ticket-creation`: creación de tickets de soporte desde Seller Center — identidad de empresa canónica, payload mínimo trazable, confirmación con número y estado, manejo de error con reintento seguro, notificación in-app al crear, y visibilidad garantizada del ticket en Mis Tickets.

### Modified Capabilities
<!-- ninguna: no existen specs previas de soporte en openspec/specs/ -->

## Impact

- **Código**: `src/app/components/soporte/soporte.component.ts|html`, `src/app/components/soporte/mis-tickets/mis-tickets.component.ts`, `src/app/shared/services/servicios.service.ts` (métodos `addTicket`/`addNotification`; se agrega notificación al canal del comercio). Sin cambios de backend.
- **API**: se sigue usando `POST https://api.katuq.com/v1/support/ticket/create` (backend de Support, repo aparte). El contrato no cambia; solo se reduce el payload.
- **RTDB**: escribe en nodos existentes `notificaciones` y `ActualizacionTicket{nomComercial}`. No se crean colecciones nuevas.

## No-goals

- **Consecutivo numérico de ticket**: `cd` lo genera el backend de Support (hoy es doc ID de Firestore). Es la tarea ClickUp wdu9v78jhe; aquí se muestra el `cd` recibido tal cual.
- **Correos y rework profundo de notificaciones**: tareas ClickUp wdu9v78jh8/wdu9v78jh9.
- **Cambios de backend** (`katuq_admin_back_firebase` o backend de Support).
- **Rediseño visual del formulario**: tarea ClickUp wdu9v78jh6; aquí solo feedback de validación con los tokens del design-system.

## Riesgos sobre módulos sensibles

No toca `orders`, `inventory`, consecutivos de pedidos, ni el 360 (Osmosis/Shopify/Webhook). El único write-set es: POST al API de tickets de Support + push a los dos nodos RTDB de notificaciones ya existentes. Riesgo residual: tickets históricos creados con `tienda: undefined` seguirán sin aparecer en Mis Tickets (dato ya perdido; se documenta, no se migra).
