# Documento de Merge - Sistema de Notificaciones

## Informacion del Merge

| Campo | Valor |
|-------|-------|
| **Fecha** | 2026-03-27 |
| **Rama origen** | `Notification` (frontend), `backend-notifications` (backend) |
| **Rama destino** | `feature/merge-Notifications` (frontend), `backend-notifications` (backend) |
| **Commits mergeados (frontend)** | 6 commits: `6bacc02e` → `edab8198` |
| **Commits mergeados (backend)** | 1 commit: `a46c21a` (Notification_SMS_Back_1) |

---

## PARTE 1: FRONTEND (Seller.Katuq)

### Commits Incluidos

| Commit | Mensaje | Descripcion |
|--------|---------|-------------|
| `6bacc02e` | Notificaciones Front 1.0 | Componente base de notificaciones |
| `f2e88a45` | Notificaciones Front 1.1 | Mejoras UI |
| `c8688470` | Notificaciones Front 1.2 | Integracion con backend |
| `b2fb316b` | Notificaciones-1.2 | Ajustes preferencias |
| `4fc5bd90` | Notification_email_1 | Email funcional, SMS deshabilitado |
| `edab8198` | Notification_SMS_Front_1 | SMS habilitado en UI |

### Resumen de Cambios: 22 archivos, +765 lineas, -1009 lineas

---

### 1. ARCHIVOS NUEVOS

#### `src/app/components/notificaciones/notificaciones.component.ts` (+186 lineas)
- **Descripcion:** Componente principal del panel de preferencias de notificaciones
- **Clase:** `NotificacionesComponent implements OnInit, OnDestroy`
- **Lineas 1-18:** Imports (Component, OnInit, OnDestroy, takeUntil, Subject, ToastrService, MaestroService)
- **Lineas 19-25:** Interface `NotificationPreferenceView` con campos: id, label, description, icon, channels (email, sms, whatsapp)
- **Lineas 26-45:** Decorador @Component y declaracion de variables: preferences (array de 6 categorias), empresaActual, isLoading, isSaving, destroy$
- **Lineas 46-90:** `ngOnInit()` - Inicializa las 6 categorias de notificacion:
  - `order_created` - Pedido creado
  - `payment_approved` - Pago aprobado
  - `order_produced` - Pedido producido
  - `order_dispatched` - Pedido despachado
  - `order_delivered` - Pedido entregado
  - `order_rejected` - Pedido rechazado
- **Lineas 91-137:** `loadPreferences()` - Carga empresa actual de localStorage, llama GET al backend, aplica valores de `notifications` y `sms_notifications` a los toggles
- **Lineas 139-155:** `toggleEmail(id)` y `toggleSms(id)` - Invierte el valor del canal y llama saveToFirestore()
- **Lineas 157-184:** `saveToFirestore()` - Construye objetos `notifications` y `sms_notifications`, llama PUT al backend, muestra toast de exito/error
- **Lineas 185-186:** `ngOnDestroy()` - Limpia subscripciones

#### `src/app/components/notificaciones/notificaciones.component.html` (+110 lineas)
- **Descripcion:** Template del panel con tabla de preferencias
- **Lineas 1-20:** Header con titulo "Preferencias de Notificaciones" y descripcion
- **Lineas 21-50:** Cabecera de tabla con columnas: Tipo de Notificacion, Email, SMS (activo), WhatsApp (decorativo/proximamente)
- **Lineas 51-95:** Loop `*ngFor` sobre preferences mostrando cada fila con:
  - Icono + nombre + descripcion de la categoria
  - Checkbox Email con `[checked]="pref.channels.email"` y `(change)="toggleEmail(pref.id)"`
  - Checkbox SMS con `[checked]="pref.channels.sms"` y `(change)="toggleSms(pref.id)"`
  - Checkbox WhatsApp deshabilitado con clase `td-decorative` y badge "Proximamente"
- **Lineas 96-110:** Footer con boton guardar y spinner de carga

#### `src/app/components/notificaciones/notificaciones.component.scss` (+201 lineas)
- **Descripcion:** Estilos del panel de notificaciones
- **Lineas 1-30:** Estilos generales del contenedor y header
- **Lineas 31-80:** Estilos de la tabla responsive
- **Lineas 81-130:** Custom checkboxes con animaciones
- **Lineas 131-170:** Estilos de columnas por canal (email, sms, whatsapp)
- **Lineas 171-201:** Clases `.td-decorative`, `.badge-decorative`, `.disabled-email` para canales deshabilitados

#### `src/app/components/notificaciones/notificaciones.module.ts` (+21 lineas)
- **Descripcion:** Modulo Angular del componente
- **Imports:** CommonModule, TranslateModule, NotificacionesRoutingModule
- **Declarations:** NotificacionesComponent

#### `src/app/components/notificaciones/notificaciones-routing.module.ts` (+11 lineas)
- **Descripcion:** Routing lazy-loaded
- **Ruta:** path '' → NotificacionesComponent

#### `src/app/shared/routes/notifications-send.route.js` (+59 lineas)
- **Descripcion:** Utilidad para envio de notificaciones desde el frontend
- **Funciones:** buildNotificationPayload(), sendNotification()

#### `docs/integraciones/NOTIFICATION_SYSTEM.md` (+50 lineas)
- **Descripcion:** Documentacion basica del sistema de notificaciones

---

### 2. ARCHIVOS MODIFICADOS

#### `src/app/shared/routes/routes.ts` (+9 lineas)
- **Cambio:** Agrega ruta `/notificaciones` al array de rutas `content[]`
- **Lineas afectadas:** 263-271 (al final del array, antes de `];`)
- **Detalle:**
  ```typescript
  {
    path: "notificaciones",
    loadChildren: () => import("../../components/notificaciones/notificaciones.module")
      .then((m) => m.NotificacionesModule),
    canActivate: [AuthGuard],
    data: { title: "Notificaciones" },
  }
  ```

#### `src/app/shared/services/maestros/maestro.service.ts` (+8 lineas)
- **Cambio:** Agrega 2 metodos para preferencias de notificacion
- **Lineas afectadas:** ~428-434
- **Metodos nuevos:**
  - `getCompanyNotificationPreferences(companyName)` → GET `/v1/notification-preferences/company/{companyName}`
  - `saveCompanyNotificationPreferences(companyName, preferences)` → PUT `/v1/notification-preferences/company/{companyName}`

#### `src/app/shared/components/sidebar/sidebar.component.html` (+42/-lineas)
- **Cambio:** Agrega item "Notificaciones" en el menu lateral
- **Detalle:** Nuevo `<li>` con icono `fa-bell`, ruta `/notificaciones`, texto traducible

#### `src/app/shared/components/sidebar/sidebar.component.scss` (+13 lineas)
- **Cambio:** Estilos para el nuevo item de notificaciones en el sidebar

#### `src/app/shared/components/sidebar/sidebar.component.ts` (+3/-lineas)
- **Cambio:** Agrega flag para mostrar/ocultar seccion de notificaciones

#### `src/app/shared/services/notifications/notification-manager.service.ts` (+42/-lineas)
- **Cambio:** Ajustes en el servicio de notificaciones in-app
- **Detalle:** Mejoras en listeners de Firebase y procesamiento de notificaciones

#### `src/app/shared/services/notifications/notification-preferences.service.ts` (+10/-lineas)
- **Cambio:** Ajustes en carga de preferencias del usuario

#### `src/app/shared/services/notifications/notification.config.ts` (+14/-lineas)
- **Cambio:** Actualizacion de configuracion de canales

#### `src/app/shared/services/ventas/ventas.service.ts` (+9/-lineas)
- **Cambio:** Agrega `clienteEmail` al payload de notificaciones en 3 metodos
- **Lineas afectadas:** ~473, ~572, ~620
- **Detalle:** `clienteEmail: order.cliente?.correo_electronico_comprador`

#### `src/app/components/notification/notification.component.ts` (+6/-lineas)
- **Cambio:** Ajustes menores en componente de notificacion

#### `src/app/app-routing.module.ts` (-5 lineas)
- **Cambio:** Elimina ruta de test `notification-test`
- **Lineas eliminadas:** 87-91 (ruta + loadChildren del modulo de test)

#### `src/assets/i18n/es.json` (+12/-lineas)
- **Cambio:** Agrega traducciones en espanol
- **Claves nuevas:** `Notificaciones`, `Preferencias de Notificaciones`, `Mensaje de texto`, `Proximamente`, `Guardar`, etc.

---

### 3. ARCHIVOS ELIMINADOS

#### `src/app/components/notification-test/notification-test.component.ts` (-294 lineas)
- **Razon:** Componente de pruebas, ya no necesario

#### `src/app/components/notification-test/notification-test.module.ts` (-17 lineas)
- **Razon:** Modulo del componente de test eliminado

#### `src/app/shared/services/notifications/notification-analytics.service.ts` (-652 lineas)
- **Razon:** Servicio de analiticas de notificaciones eliminado (no se usa en produccion)

---

### 4. ARCHIVOS EXCLUIDOS DEL MERGE

| Archivo | Razon |
|---------|-------|
| `src/environments/environment.ts` | Se conservo el de la rama destino (configuracion de urlApi local/produccion) |
| `.claude/settings.local.json` | Archivo local de configuracion, no relevante |

---

## PARTE 2: BACKEND (katuq_admin_back_firebase)

### Commit: `a46c21a` - Notification_SMS_Back_1

### Resumen: 5 archivos modificados, +400 lineas, -126 lineas

---

### 1. `functions/controllers/orders.js` (+361/-45 lineas)

#### Funciones nuevas agregadas:

**`STORAGE_BUCKET` (linea 32)**
- Constante: `process.env.FIREBASE_STORAGE_BUCKET || "julsmind-katuq.appspot.com"`

**`DEFAULT_NOTIFICATION_PREFS` (lineas 33-36)**
- Objeto con 6 claves de preferencia, todas `false` por defecto

**`loadCompanyNotificationPrefs(company, channel)` (lineas 44-55)**
- Carga preferencias de una empresa desde Firestore
- Parametro `channel`: `'notifications'` o `'sms_notifications'`
- Retorna defaults si no existe el documento
- Reemplaza codigo duplicado que estaba en 3 funciones

**`saveEmailPreview(html, orderData, templateType)` (lineas 62-85)**
- Guarda HTML en Firebase Storage como archivo publico
- Guarda metadata en Firestore collection `email_previews`
- Retorna URL corta si `BACKEND_PUBLIC_URL` existe, sino URL de Storage directa
- Formato URL corta: `{BACKEND_PUBLIC_URL}/v1/e/{docRef.id}`

**`sendDirectSms(orderData, previousOrderData, previewUrl)` (lineas 3269-3354)**
- Envia SMS para cambios de estado (no para creacion)
- Verifica `ENABLE_SMS_NOTIFICATIONS`, `ALLOWED_NOTIFICATION_COMPANIES`, preferencias SMS
- Detecta cambios de estadoProceso y estadoPago
- Mapea estados a templates SMS
- Redirige a telefono de test si `NOTIFICATIONS_PUBLIC_MODE=false`
- Usa `smsService.sendSms()` para enviar via labsMobile

**`sendDirectCreatedSms(orderData, previewUrl)` (lineas 3360-3411)**
- Envia SMS para pedido recien creado (ORDER_CREATED)
- Misma logica de filtrado que sendDirectSms
- Template fijo: ORDER_CREATED

#### Funciones modificadas:

**`sendDirectTemplateEmail()` (lineas ~3042, 3149-3155)**
- Linea 3042: Reemplazado bloque de 15 lineas de carga de preferencias por `loadCompanyNotificationPrefs(company, 'notifications')`
- Lineas 3149-3155: Agrega `saveEmailPreview()` despues de enviar email, retorna `lastPreviewUrl`
- Ahora retorna `previewUrl` (antes no retornaba nada)

**`sendDirectCreatedEmail()` (lineas ~3257)**
- Agrega `saveEmailPreview()` despues de enviar email
- Retorna `previewUrl`

**`edit()` (lineas 3430-3445)**
- Modificado el bloque `setImmediate`:
  - Antes: solo llamaba `sendDirectTemplateEmail()`
  - Ahora: captura `previewUrl` de email y lo pasa a `sendDirectSms()`
  ```javascript
  let previewUrl = null;
  previewUrl = await sendDirectTemplateEmail(req.body, result.previousOrderData);
  await sendDirectSms(req.body, result.previousOrderData, previewUrl);
  ```

**`editByTransporter()` (lineas 3614-3627)**
- Mismo cambio que edit(): agrega llamada a `sendDirectSms()` con previewUrl

**`create()` (lineas 4503-4525)**
- Reestructurado el bloque `setImmediate`:
  1. `notificationHooks.onOrderCreated(order)` - hooks existentes
  2. `saveEmailPreview(emailHtml, order, "ORDER_CREATED")` - guarda preview del email legacy
  3. `sendDirectCreatedSms(order, previewUrl)` - SMS con link al preview

**`sendEmail()` (lineas ~6788-6802)**
- Agrega LEGACY SKIP para empresas en `ALLOWED_NOTIFICATION_COMPANIES`
- Si la empresa usa templates nuevos, retorna `200 { skipped: true }` sin enviar email

---

### 2. `functions/controllers/notificationPreferences.js` (+137/-126 lineas)

**Cambio completo:** Reordenacion de rutas para fix de bug critico

**Bug:** Las rutas genericas `/:userId` (linea 10) interceptaban las rutas especificas `/company/:companyName` (linea 84) porque Express evalua las rutas en orden.

**Antes (roto):**
```
GET  /:userId                    ← linea 10 (intercepta todo)
PUT  /:userId                    ← linea 38
PUT  /:userId/types/:type        ← linea 59
GET  /company/:companyName       ← linea 84 (nunca se alcanzaba)
PUT  /company/:companyName       ← linea 122
```

**Despues (corregido):**
```
GET  /company/:companyName       ← linea 14 (especifica primero)
PUT  /company/:companyName       ← linea 52
GET  /:userId                    ← linea 78 (generica despues)
PUT  /:userId                    ← linea 105
PUT  /:userId/types/:type        ← linea 126
```

---

### 3. `functions/index.js` (+14 lineas)

**Cambio:** Agrega endpoint de URL corta para SMS

**Lineas 540-552:** Nuevo endpoint `GET /v1/e/:id`
```javascript
app.get("/v1/e/:id", async (req, res) => {
  const doc = await admin.firestore().collection("email_previews").doc(req.params.id).get();
  if (!doc.exists || !doc.data().storageUrl) {
    return res.status(404).send("...Este enlace ya no está disponible...");
  }
  res.redirect(301, doc.data().storageUrl);
});
```

---

### 4. `functions/routers/notifications.js` (-29 lineas)

**Cambio:** Eliminado endpoint duplicado `GET /email-view/:id`

**Lineas eliminadas:** 144-171 (endpoint `/v1/notifications/email-view/:id`)
- **Razon:** Hacia lo mismo que `/v1/e/:id` en index.js
- **Beneficio:** Elimina codigo duplicado y el anti-pattern de `require('firebase-admin')` dentro del handler

---

### 5. `functions/services/notifications/smsTemplates.js` (+6/-6 lineas)

**Cambio:** Agrega `{{linkPedido}}` a todos los templates SMS

**Antes:**
```
"Tu pedido #{{nroPedido}} ha sido confirmado por {{totalPagarFormateado}}. Te mantendremos informado del estado."
```

**Despues:**
```
"Tu pedido #{{nroPedido}} ha sido confirmado por {{totalPagarFormateado}}. Detalles: {{linkPedido}}"
```

**Templates modificados (6):**
| Template | Linea | Cambio |
|----------|-------|--------|
| ORDER_CREATED | 10 | Reemplaza texto final por `Detalles: {{linkPedido}}` |
| PAYMENT_Aprobado | 14 | Reemplaza texto final por `Detalles: {{linkPedido}}` |
| ORDER_ProducidoTotalmente | 18 | Agrega `Detalles: {{linkPedido}}` |
| ORDER_Despachado | 22 | Reemplaza `Transportador: {{transportador}}.` por `Guia: {{guiaRastreo}}.` + link |
| ORDER_Entregado | 26 | Reemplaza texto final por `Detalles: {{linkPedido}}` |
| ORDER_Rechazado | 30 | Reemplaza texto final por `Detalles: {{linkPedido}}` |

---

### 6. `functions/services/notifications/notificationQueue.js` (+1/-1 linea)

**Cambio:** Actualiza fecha de PRODUCTION_CUTOFF

**Linea 267:**
- Antes: `new Date('2026-03-16T23:25:00.000Z')`
- Despues: `new Date('2026-03-18T23:59:00.000Z')`
- **Proposito:** Ignorar notificaciones encoladas antes del deploy a produccion

---

## PARTE 3: CONFIGURACION .env

### Variables agregadas en esta iteracion

| Variable | Valor | Archivo | Descripcion |
|----------|-------|---------|-------------|
| `BACKEND_PUBLIC_URL` | `https://back.katuq.com` | `.env` linea 35 | URL base para generar URLs cortas en SMS |
| `FIREBASE_STORAGE_BUCKET` | (usa default) | `orders.js` linea 32 | Variable opcional, fallback a `julsmind-katuq.appspot.com` |

### Variables existentes relevantes

| Variable | Valor actual | Para produccion | Descripcion |
|----------|-------------|-----------------|-------------|
| `NOTIFICATIONS_PUBLIC_MODE` | `false` | Cambiar a `true` | Modo test vs produccion |
| `ENABLE_SMS_NOTIFICATIONS` | `true` | `true` | SMS habilitado |
| `ENABLE_EMAIL_NOTIFICATIONS` | `true` | `true` | Email habilitado |
| `ALLOWED_NOTIFICATION_COMPANIES` | `Tienda Demo KAI Import` | Vaciar para todas | Filtro de empresas |
| `LABSMOBILE_USERNAME` | `gerencia@almara.com.co` | Verificar | Usuario labsMobile |
| `LABSMOBILE_API_KEY` | `2kPK...YRJP` | Verificar | API Key labsMobile |
| `LABSMOBILE_SENDER` | `Katuq` | `Katuq` | Remitente SMS |
| `NOTIFICATIONS_TEST_EMAIL` | `santygarciamartinez03@gmail.com` | N/A (solo test) | Email de pruebas |
| `NOTIFICATIONS_TEST_PHONE` | `573024218994` | N/A (solo test) | Telefono de pruebas |

### Checklist para deploy a produccion

- [ ] Cambiar `NOTIFICATIONS_PUBLIC_MODE=true` en el servidor
- [ ] Agregar `BACKEND_PUBLIC_URL=https://back.katuq.com` en el servidor
- [ ] Verificar que `LABSMOBILE_USERNAME` y `LABSMOBILE_API_KEY` son correctas
- [ ] Decidir si quitar el filtro `ALLOWED_NOTIFICATION_COMPANIES` (vaciar = todas las empresas)
- [ ] Verificar saldo de creditos en labsMobile
