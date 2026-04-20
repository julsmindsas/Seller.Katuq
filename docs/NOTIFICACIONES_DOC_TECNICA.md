# Documentacion Tecnica - Sistema de Notificaciones Katuq

## 1. Arquitectura General

El sistema de notificaciones de Katuq permite enviar notificaciones multicanal (Email, SMS) a los clientes cuando cambian los estados de sus pedidos. Cada empresa puede configurar individualmente que canales y estados activan notificaciones.

### 1.1 Componentes

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular 14)                 │
│  Seller.Katuq / rama: feature/merge-Notifications       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Panel de Notificaciones (/notificaciones)      │    │
│  │  - Toggle Email por estado                      │    │
│  │  - Toggle SMS por estado                        │    │
│  │  - WhatsApp (deshabilitado, proximamente)       │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │ HTTP GET/PUT                    │
└────────────────────────┼────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────┐
│                    BACKEND (Express/Node.js)             │
│  katuq_admin_back_firebase / rama: backend-notifications│
│                                                         │
│  ┌─────────────────────┴───────────────────────────┐    │
│  │  Preferencias API                               │    │
│  │  GET/PUT /v1/notification-preferences/company/  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Envio Directo (sin cola)                       │    │
│  │  - sendDirectTemplateEmail()                    │    │
│  │  - sendDirectSms()                              │    │
│  │  - sendDirectCreatedSms()                       │    │
│  │  - saveEmailPreview() → Firebase Storage        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  URL Corta para SMS                             │    │
│  │  GET /v1/e/:id → redirect a Storage             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Servicios                                      │    │
│  │  - smsService.js (labsMobile)                   │    │
│  │  - smsTemplates.js (templates SMS)              │    │
│  │  - emailTemplates.js (templates Email)          │    │
│  │  - templateHelpers.js (render HTML)             │    │
│  │  - brandingService.js (logo/colores empresa)    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Almacenamiento                                 │    │
│  │  - Firestore: company_notification_preferences  │    │
│  │  - Firestore: email_previews (metadata)         │    │
│  │  - Firebase Storage: HTML de emails             │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Flujo de Notificacion (Pedido Editado)

```
1. Frontend llama PUT /v1/orders/:id (cambio de estado)
2. controllers/orders.js → edit()
3. setImmediate (no bloquea la respuesta HTTP):
   a. sendDirectTemplateEmail() → genera HTML, envia email, guarda preview en Storage
   b. sendDirectSms() → usa el link del preview como linkPedido en el SMS
4. El SMS llega al cliente con URL corta: https://back.katuq.com/v1/e/{docId}
5. Cliente abre el link → redirect a Storage → ve el email completo
```

### 1.3 Flujo de Notificacion (Pedido Creado)

```
1. Frontend llama POST /v1/orders (crear pedido)
2. controllers/orders.js → create()
3. El email legacy del frontend (con carrito, productos) se envia normalmente
4. setImmediate:
   a. notificationHooks.onOrderCreated() → encola en Firestore
   b. saveEmailPreview(emailHtml) → guarda el HTML legacy en Storage
   c. sendDirectCreatedSms(order, previewUrl) → SMS con link al preview
```

---

## 2. Estados que Generan Notificaciones

### 2.1 Estados de Proceso (estadoProceso)

| Estado | Notifica al Cliente | Template Email | Template SMS |
|--------|-------------------|----------------|--------------|
| SinProducir | No | - | - |
| EnProduccion | No | - | - |
| ProducidoParcialmente | No | - | - |
| ProducidoTotalmente | Si | ORDER_ProducidoTotalmente | ORDER_ProducidoTotalmente |
| ParaDespachar | No | - | - |
| Empacado | No | - | - |
| Despachado | Si | ORDER_Despachado | ORDER_Despachado |
| Entregado | Si | ORDER_Entregado | ORDER_Entregado |
| Rechazado | Si | ORDER_Rechazado | ORDER_Rechazado |

### 2.2 Estados de Pago (estadoPago)

| Estado | Notifica al Cliente | Template Email | Template SMS |
|--------|-------------------|----------------|--------------|
| Pendiente | No | - | - |
| PreAprobado | No | - | - |
| Aprobado | Si | PAYMENT_Aprobado | PAYMENT_Aprobado |
| Rechazado | No | - | - |
| Cancelado | No | - | - |

### 2.3 Creacion de Pedido

| Evento | Template Email | Template SMS |
|--------|---------------|--------------|
| Pedido creado | Email legacy (frontend) | ORDER_CREATED |

---

## 3. Preferencias por Empresa

### 3.1 Estructura en Firestore

**Collection:** `company_notification_preferences`
**Document ID:** nombre de la empresa (ej: "Tienda Demo KAI Import")

```json
{
  "notifications": {
    "order_created": true,
    "payment_approved": false,
    "order_produced": true,
    "order_dispatched": true,
    "order_delivered": true,
    "order_rejected": false
  },
  "sms_notifications": {
    "order_created": false,
    "payment_approved": false,
    "order_produced": false,
    "order_dispatched": true,
    "order_delivered": true,
    "order_rejected": false
  },
  "company": "Tienda Demo KAI Import",
  "updatedAt": "2026-03-27T..."
}
```

### 3.2 Endpoints API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/v1/notification-preferences/company/:companyName` | Obtener preferencias |
| PUT | `/v1/notification-preferences/company/:companyName` | Guardar preferencias |

### 3.3 Logica de Defaults

Todas las preferencias son `false` por defecto (opt-in). Cada empresa activa individualmente los canales y estados que desea.

---

## 4. Canales de Envio

### 4.1 Email

- **Proveedor:** Nodemailer con SMTP
- **Templates:** HTML renderizado con variables dinamicas
- **Archivos:** `services/notifications/templates/` (14 templates modulares)
- **Preview:** Los emails se guardan en Firebase Storage como HTML publico
- **Branding:** Logo y colores por empresa via `brandingService.js`

### 4.2 SMS

- **Proveedor:** labsMobile (API REST)
- **Endpoint API:** `https://api.labsmobile.com/json/send`
- **Auth:** Basic Auth (usuario + API key)
- **Servicio:** `services/smsService.js`
- **Templates:** `services/notifications/smsTemplates.js`
- **Limite:** 160 caracteres por mensaje

#### Templates SMS

| Tipo | Mensaje |
|------|---------|
| ORDER_CREATED | `{empresa}: Tu pedido #{nro} ha sido confirmado por {total}. Detalles: {link}` |
| PAYMENT_Aprobado | `{empresa}: El pago de tu pedido #{nro} ha sido aprobado. Detalles: {link}` |
| ORDER_ProducidoTotalmente | `{empresa}: Tu pedido #{nro} ha sido producido y esta listo para despacho. Detalles: {link}` |
| ORDER_Despachado | `{empresa}: Tu pedido #{nro} esta en camino. Guia: {guia}. Detalles: {link}` |
| ORDER_Entregado | `{empresa}: Tu pedido #{nro} ha sido entregado. Gracias por tu compra! Detalles: {link}` |
| ORDER_Rechazado | `{empresa}: Tu pedido #{nro} no pudo ser procesado. Detalles: {link}` |

### 4.3 WhatsApp

- **Estado:** Deshabilitado (proximamente)
- **UI:** Columna decorativa en el panel de notificaciones
- **Proveedor planeado:** B2Chat

---

## 5. URL Corta para SMS

### 5.1 Problema
Las URLs de Firebase Storage son muy largas (~120 caracteres), dejando poco espacio para el mensaje SMS (limite 160 chars).

### 5.2 Solucion

```
URL larga:  https://storage.googleapis.com/julsmind-katuq.appspot.com/email_previews/...
URL corta:  https://back.katuq.com/v1/e/abc123xyz (~42 chars)
```

### 5.3 Flujo

1. `saveEmailPreview()` guarda HTML en Storage + metadata en Firestore `email_previews`
2. Captura el `docRef.id` del documento de Firestore
3. Si `BACKEND_PUBLIC_URL` existe, retorna `{BACKEND_PUBLIC_URL}/v1/e/{docId}`
4. Si no existe (desarrollo local), retorna la URL de Storage directa
5. `GET /v1/e/:id` busca el documento y hace `redirect 301` a la URL de Storage

### 5.4 Endpoint

```
GET /v1/e/:id
- Busca en Firestore collection email_previews por document ID
- Si existe y tiene storageUrl → redirect 301
- Si no existe → 404 con HTML amigable
```

---

## 6. Estructura de Archivos

### 6.1 Frontend

```
src/app/components/notificaciones/
├── notificaciones-routing.module.ts    # Ruta lazy-loaded
├── notificaciones.module.ts            # Modulo Angular
├── notificaciones.component.ts         # Logica del panel
├── notificaciones.component.html       # Template con toggles Email/SMS/WhatsApp
└── notificaciones.component.scss       # Estilos

src/app/shared/
├── routes/routes.ts                    # Ruta /notificaciones con AuthGuard
├── services/maestros/maestro.service.ts  # getCompanyNotificationPreferences()
│                                         # saveCompanyNotificationPreferences()
└── services/notifications/
    ├── notification.types.ts           # Enums y tipos
    ├── notification.config.ts          # Configuracion
    ├── notification-manager.service.ts # Gestion de notificaciones in-app
    └── notification-preferences.service.ts  # Preferencias del usuario
```

### 6.2 Backend

```
functions/
├── .env                                # Configuracion (NO en git)
├── controllers/
│   ├── orders.js                       # create(), edit(), editByTransporter()
│   │                                   # saveEmailPreview(), sendDirectTemplateEmail()
│   │                                   # sendDirectSms(), sendDirectCreatedSms()
│   │                                   # loadCompanyNotificationPrefs()
│   └── notificationPreferences.js      # CRUD preferencias empresa/usuario
├── routers/
│   ├── notifications.js                # /pause, /resume, /status, /preview
│   └── notificationsSend.js            # POST /v1/notifications/send
├── services/
│   ├── smsService.js                   # labsMobile API (envio SMS)
│   ├── brandingService.js              # Logo/colores por empresa
│   └── notifications/
│       ├── smsTemplates.js             # Templates SMS con variables
│       ├── emailTemplates.js           # Templates Email legacy
│       ├── templateHelpers.js          # Render HTML, bloques opcionales
│       ├── notificationHooks.js        # Deteccion de cambios de estado
│       ├── notificationQueue.js        # Cola de notificaciones (Firestore)
│       └── templates/                  # 14 templates modulares HTML
│           ├── base.js
│           ├── ORDER_CREATED.js
│           ├── ORDER_Despachado.js
│           ├── ORDER_Entregado.js
│           ├── ORDER_ProducidoTotalmente.js
│           ├── ORDER_Rechazado.js
│           ├── PAYMENT_Aprobado.js
│           ├── index.js
│           └── components/             # Componentes reutilizables
│               ├── banner.js
│               ├── customerData.js
│               ├── shippingData.js
│               ├── productList.js
│               ├── totals.js
│               └── footer.js
└── index.js                            # Registro de rutas Express + /v1/e/:id
```

---

## 7. Configuracion del Entorno (.env)

### 7.1 Variables de Notificaciones

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `ENABLE_ORDER_NOTIFICATIONS` | `true` | Habilita el sistema de notificaciones |
| `ENABLE_EMAIL_NOTIFICATIONS` | `true` | Habilita envio de emails |
| `ENABLE_SMS_NOTIFICATIONS` | `true` | Habilita envio de SMS |
| `ENABLE_WHATSAPP_NOTIFICATIONS` | `false` | WhatsApp deshabilitado |
| `ENABLE_SYSTEM_NOTIFICATIONS` | `false` | Notificaciones del sistema |

### 7.2 Filtro de Empresas

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `ALLOWED_NOTIFICATION_COMPANIES` | `Tienda Demo KAI Import` | Solo estas empresas pueden enviar notificaciones (vacio = todas) |

### 7.3 labsMobile (SMS)

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `LABSMOBILE_USERNAME` | `gerencia@almara.com.co` | Usuario API labsMobile |
| `LABSMOBILE_API_KEY` | `2kPK...YRJP` | API Key labsMobile |
| `LABSMOBILE_SENDER` | `Katuq` | Nombre remitente del SMS |

### 7.4 URL Corta

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `BACKEND_PUBLIC_URL` | `https://back.katuq.com` | Base URL para generar URLs cortas en SMS |

### 7.5 Modo Test vs Produccion

| Variable | Desarrollo | Produccion | Descripcion |
|----------|-----------|------------|-------------|
| `NOTIFICATIONS_PUBLIC_MODE` | `false` | `true` | `false` = emails/SMS van al test, `true` = van al cliente real |
| `NOTIFICATIONS_TEST_EMAIL` | `santygarciamartinez03@gmail.com` | - | Email de pruebas |
| `NOTIFICATIONS_TEST_PHONE` | `573024218994` | - | Telefono de pruebas |

### 7.6 Smart Notification Rules

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `CUSTOMER_NOTIFY_STATES` | `ProducidoTotalmente,Despachado,Entregado,Rechazado` | Estados de proceso que notifican al cliente |
| `CUSTOMER_NOTIFY_PAYMENT_STATES` | `Aprobado` | Estados de pago que notifican al cliente |

---

## 8. Seguridad

- **Modo test:** En desarrollo, TODOS los emails/SMS se redirigen a las credenciales de test (nunca llegan al cliente)
- **Filtro de empresas:** `ALLOWED_NOTIFICATION_COMPANIES` limita que empresas pueden enviar notificaciones
- **Preferencias opt-in:** Todo deshabilitado por defecto, cada empresa activa lo que necesita
- **URL corta sin auth:** El endpoint `/v1/e/:id` es publico (necesario para que clientes abran el link del SMS)
- **Credenciales en .env:** No se commitean al repositorio (gitignore)

---

## 9. Dependencias Externas

| Servicio | Uso | Configuracion |
|----------|-----|---------------|
| Firebase Storage | Almacena HTML de emails como archivos publicos | Bucket: `julsmind-katuq.appspot.com` |
| Firebase Firestore | Preferencias, metadata de previews, cola | Collections: `company_notification_preferences`, `email_previews` |
| labsMobile | Envio de SMS | API REST con Basic Auth |
| AWS SQS | Cola de mensajes (legacy) | `katuq-notifications` queue |
| Nodemailer | Envio de emails SMTP | Configurado en .env |
