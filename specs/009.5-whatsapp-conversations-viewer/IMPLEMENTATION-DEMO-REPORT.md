# Spec 009.5 — Visor de Conversaciones WhatsApp (Demo Mock) — Reporte de Implementación

**Fecha:** 2026-06-17
**Rama destino:** `feature/009.5-viewer-demo-mock`
**Autor:** Claude (subagente orquestado)

---

## 1. Estado

**Compila:** Sí. `npx tsc --noEmit -p tsconfig.app.json` retorna exit 0, sin errores ni warnings.
**Fase fallida:** Ninguna. Recon → Scaffold → Components → Wiring → Verify completaron en orden, sin fase Fix.

---

## 2. Qué se creó

Módulo nuevo bajo `src/app/components/notificaciones/whatsapp-inbox/`:

- `whatsapp-inbox.module.ts`
- `whatsapp-inbox-routing.module.ts`
- `whatsapp-inbox.service.ts` (mock service que sirve los hilos demo)
- `models/whatsapp-thread.model.ts`
- `pipes/phone-mask.pipe.ts`
- `data/demo-threads.data.ts` (5 hilos seed)
- `components/whatsapp-inbox-shell/` (`.ts`, `.html`, `.scss`) — layout master-detail
- `components/whatsapp-thread-list/` (`.ts`, `.html`) — listado con búsqueda + filtro
- `components/whatsapp-thread-detail/` (`.ts`, `.html`) — visor de mensajes + toggle de contacto

---

## 3. Qué se modificó (aditivo)

Solo dos archivos, ambos con inserciones puramente aditivas (sin tocar rutas/menús existentes):

- `src/app/shared/routes/routes.ts` — nueva ruta lazy:
  - `path: 'notificaciones/whatsapp/inbox'`
  - `loadChildren: () => import('../../components/notificaciones/whatsapp-inbox/whatsapp-inbox.module').then(m => m.WhatsappInboxModule)`
  - `canActivate: [AuthGuard]`, `data: { title: 'Conversaciones WhatsApp' }`
- `src/app/shared/services/nav.service.ts` — nuevo `child` agregado al grupo existente "Notificaciones":
  - `{ path: '/notificaciones/whatsapp/inbox', title: 'Conversaciones WhatsApp', type: 'link', icon: 'message-circle' }`

No se tocaron `notification.types.ts`, `notification.config.ts`, ni `modules-catalog.ts` (eso queda para 009.1).

---

## 4. Cómo probarlo

```bash
git checkout feature/009.5-viewer-demo-mock
npm start
```

Luego en el navegador:

1. Login normal con un usuario de cualquier empresa.
2. Sidebar → grupo **Notificaciones** → click **Conversaciones WhatsApp**.
3. Se carga el visor en `/notificaciones/whatsapp/inbox` con 5 hilos demo y header con badge "Demo".
4. Click en cualquier hilo → carga el detalle con los mensajes mock y el badge unread desaparece.
5. Toggle "Contacto" en el detalle → abre/cierra el panel de perfil del cliente.
6. Búsqueda + chip "Solo con respuesta entrante" filtran la lista en cliente.
7. Resize a <1024px → solo se ve la lista; al elegir un hilo, solo el detalle. Botón "← Volver" regresa a la lista.

> Nota: el ítem del menú quedó en el grupo "Notificaciones" (no en "Gestión Comercial") porque ese grupo ya existía y reusarlo evita crear un `headTitle` nuevo. Si Daniel prefiere otro grupo, mover en `nav.service.ts` es un one-liner.

---

## 5. Qué NO se hizo (esperado)

- No hay backend ni endpoint real. El `WhatsappInboxService` sirve los hilos desde `demo-threads.data.ts` (in-memory).
- No hay integración con Kapso (ni proveedor de WhatsApp) — sin webhooks, sin polling, sin envío de mensajes.
- No hay persistencia: refrescar la página resetea el estado "leído" del badge.
- No se implementaron specs **009.1** (catálogo de módulos / tipos), **009.2**, **009.3**, ni **009.4** (esos siguen pendientes en su roadmap).
- No se añadió permiso/feature flag — la ruta está protegida solo por `AuthGuard`, cualquier usuario logueado la ve.

---

## 6. Riesgos / cosas a revisar

- **Ubicación del menú:** quedó bajo "Notificaciones". Confirmar si va ahí o en "Gestión Comercial" antes de demo a cliente.
- **Sin gating por empresa:** la entrada aparece en el sidebar para todos los tenants. Para piloto, considerar un check rápido en `nav.service.ts` o introducir el feature flag de 009.1 antes de salir a prod.
- **Badge "Demo" visible:** confirmar que el sello "Demo" en el header sea aceptable para mostrar al cliente piloto, o cambiarlo por "Beta" / quitarlo.
- **Modelo `WhatsappThread`:** usa `contactName` (no `clienteNombre`/`profileName`). Cuando llegue el backend real (009.2/009.3) habrá que mapear o extender el modelo — no romper el contrato de la lista.
- **Filtro "Solo con respuesta entrante":** evalúa `lastDirection === 'inbound'`. Si el backend real emite otro enum, ajustar.
- **`flags.inboundTruncatedAt90d`:** el banner amarillo solo aparece si algún hilo trae el flag. Validar que el backend (cuando exista) realmente lo emita o quitar el banner.
- **Estado "leído" cliente-only:** marcar como leído solo bajaba el `unreadCount` localmente. Cuando se integre Kapso habrá que llamar a un endpoint `markRead` y resolver el race entre UI optimista y respuesta del server.
- **Accesibilidad:** revisar focus management al navegar lista→detalle en mobile (ahora el botón "← Volver" devuelve foco implícitamente, pero no se probó con screen reader).
