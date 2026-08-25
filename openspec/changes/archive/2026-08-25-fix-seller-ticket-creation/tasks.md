# Tasks — fix-seller-ticket-creation

## 1. Identidad de empresa canónica

- [x] 1.1 En `soporte.component.ts`: inyectar `SecurityService`, resolver la empresa activa con `getCompanyInformationLogged()` al enviar; si no hay empresa, bloquear el envío con mensaje de re-login (sin crear ticket). Eliminar la lectura de `sessionStorage['currentCompany']`.
- [x] 1.2 En `mis-tickets.component.ts`: misma fuente canónica para el filtro por `nomComercial`; eliminar `sessionStorage['currentCompany']`.
- [x] 1.3 Precargar `nombreUsuarioReporta` desde `localStorage.user.email` (campo editable), eliminando la referencia a `currentUser?.name`.

## 2. Payload mínimo trazable

- [x] 2.1 En `onSubmit`: construir el ticket con `tienda` y `company` = `nomComercial` (string), `nit` = NIT de la empresa y correo del reportante; dejar de enviar el objeto `CompanyInformation` completo.

## 3. Confirmación, validación y errores

- [x] 3.1 Quitar `ticketForm.invalid` del `[disabled]` del botón; en `onSubmit` con formulario inválido, `markAllAsTouched()` y mensajes visibles por campo (tokens del design-system, sin gradientes).
- [x] 3.2 Confirmación de éxito con número de ticket y estado "Pendiente"; navegar a `/misTickets` solo al cerrar la confirmación.
- [x] 3.3 En error de red: conservar datos del formulario, mostrar el error, rehabilitar el botón (reset de `isSubmitting`) para reintento seguro.

## 4. Notificaciones al crear

- [x] 4.1 En `servicios.service.ts`: corregir `addNotification` para que registre `ticketId` como string (el `cd`), y agregar `addTicketNotificationForCompany(message, ticketId, nomComercial)` que escribe en `ActualizacionTicket{nomComercial}`.
- [x] 4.2 En `onSubmit` (éxito): notificar `notificaciones` con `ticketId = response.result.cd` y el canal del comercio con `nomComercial`.

## 5. Cierre

- [x] 5.1 Build sin errores (`npm run build`) y prueba manual del flujo: crear ticket en pestaña nueva → confirmación con número → aparece de primero en Mis Tickets.
- [x] 5.2 Registrar la decisión D-XXX en `/specs/CONTRACT.md` (fuente canónica de empresa en soporte + canal comercio por `nomComercial` + payload mínimo) con bitácora de la sesión.



