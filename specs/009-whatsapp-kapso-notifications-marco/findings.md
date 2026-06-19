# Findings — Estado actual del sistema de notificaciones (pre 009)

> Auditoría 2026-05-25. Datos verificados contra el código real, no asumidos desde docs.
> Spec renumerada de 007 a 009 el 2026-06-17 (ver D-043 en CONTRACT.md) para resolver colisión con `007-user-admin-credentials-delete`.

## 1. Frontend Angular (`src/app/shared/services/notifications/`)

### Tipos y canales (`notification.types.ts`)
- **L67-74**: `enum NotificationChannel` = `IN_APP | EMAIL | PUSH | SMS | FIREBASE_REALTIME | WEBHOOK`. **NO existe `WHATSAPP`**.
- **L1-64**: `enum NotificationType` con 30+ tipos. Los 6 que el comerciante usa hoy en `/notificaciones`:
  - `ORDER_CREATED` (Pedido Confirmado)
  - `PAYMENT_APPROVED` (Pago Aprobado)
  - `PRODUCTION_COMPLETED` (Pedido Producido)
  - `ORDER_DISPATCHED` (Pedido Despachado)
  - `ORDER_DELIVERED` (Pedido Entregado)
  - `ORDER_PROCESS_REJECTED` (Pedido Rechazado)

### Configuración (`notification.config.ts`)
- **L677-713**: `NOTIFICATION_CONFIG.features` tiene flags para push/email/sms/realtime/notificationCenter. **NO existe `whatsappNotifications`**.
- **L689-697**: endpoints API base configurados: `/v1/notifications/send`, `/v1/notifications/history`, `/v1/notifications/seller`, `/v1/notification-preferences`, `/v1/notifications/mark-read`, `/v1/notifications/stats`.
- Templates por canal viven en `NOTIFICATION_TEMPLATES[type].templates[channel]`. **Slot `[NotificationChannel.WHATSAPP]` no se puede crear sin agregar primero el enum.**

### Manager (`notification-manager.service.ts`)
- **L707-744**: `sendNotification(notification)` itera `notification.channels` con un `switch` que solo maneja `IN_APP | FIREBASE_REALTIME | EMAIL | PUSH`. SMS y WhatsApp NO tienen handler frontend (lógica en backend).
- **L51-58**: arquitectura preparada para nuevos canales — agregar un `case WHATSAPP` es trivial pero el envío real lo hace el backend, igual que SMS.

### UI (`components/notificaciones/`)
- **`notificaciones.component.ts:13-19`**: interface `NotificationPreferenceView.channels` ya incluye `whatsapp: boolean` ✅
- **`notificaciones.component.ts:33`**: comentario explícito `// Categorías: Email y SMS funcionales; WhatsApp decorativo (próximamente)`.
- **`notificaciones.component.html:63-66, 107-108`**: columna WhatsApp renderiza con clase `whatsapp-disabled` que pinta el checkbox apagado y bloquea click.
- **`notificaciones.component.scss:186`**: regla `.whatsapp-disabled input[type="checkbox"]` deshabilita visual.
- **`notificaciones.component.ts:33-90`**: las 6 categorías ya tienen el slot `channels.whatsapp: false` por defecto.
- **`notificaciones.component.ts:178-207`**: `saveToFirestore()` solo persiste `notifications` (email), `sms_notifications`, `company_copy_notifications`. **Falta `whatsapp_notifications`**.

## 2. Backend Node/Express (`katuq_admin_back_firebase/functions/`)

### Queue (`services/notifications/notificationQueue.js`)
- **L54**: `this.whatsappEnabled = process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true'` ✅ feature flag ya existe.
- **L315-325**: switch `case "WHATSAPP"` ya existe en el dispatcher, llama `checkUserPreferences(notification, "WEBHOOK")` y luego `sendWhatsAppNotification(notification)`. **NOTA**: el parámetro `"WEBHOOK"` es probablemente bug — debería ser `"WHATSAPP"` cuando exista.
- **L595-604**: placeholder con `// TODO: Implementar cuando se configure WhatsApp Business API`. Solo loguea y retorna `false`.
- **L855-863**: `reloadConfig()` ya considera `whatsappEnabled` ✅
- **L1006-1007**: `getStatus()` ya expone `whatsappEnabled` ✅

### SMS como referencia (`services/smsService.js`)
- Wrapper de labsMobile, ~170 LOC. **Patrón a replicar para Kapso**:
  - Constructor: lee ENV vars, calcula `this.enabled = !!(this.username && this.apiKey)`.
  - `normalizePhone(phone)`: limpia caracteres no numéricos, agrega prefijo país.
  - `sendSms(phone, message)`: POST axios con auth Basic + body JSON, retorna `{success, messageId, error}`.
  - `getBalance()`: consulta saldo proveedor (en Kapso aplica para reconciliación opcional, no es bloqueante).
  - `getHealth()`: estado para `/v1/notifications/status`.

### Templates SMS (`services/notifications/smsTemplates.js`)
- ~70 LOC. **Patrón a replicar para WhatsApp HSM**:
  - Objeto `SMS_TEMPLATES` con keys = `NotificationType` y values `{message: "string con {{var}}"}`.
  - Función `renderSmsTemplate(type, data)` con interpolación regex `\{\{(\w+)\}\}`.
  - Limpia dobles espacios y patrones rotos por variables vacías.
- **Diferencia clave WhatsApp**: el body no se envía como texto libre; se envía como **template HSM** referenciado por nombre + array de parámetros. El "rendering" en Katuq solo arma los parámetros, no el mensaje completo.

### Email handler como referencia (`services/notifications/emailNotificationHandler.js`)
- Endpoint `POST /v1/notifications/send` recibe `{type: 'email', toEmail, notification}` y delega a nodemailer.
- **L81-88**: lista `BACKEND_HANDLED_TYPES` con tipos que se manejan con templates nuevos del backend (evita duplicados con sistema legacy del frontend). El comportamiento de filtrado se aplica también a SMS y se aplicaría a WhatsApp.

### Datos del cliente — ya disponibles
Campo `numero_celular_whatsapp` + `indicativo_celular_whatsapp` capturado en:
- `src/app/components/pos/pos-crear-ventas/pos-crear-ventas.component.ts:463`
- `src/app/components/pos/pos-list/list.component.ts:287`
- `src/app/components/produccion/dashboard/dashboard.component.ts:338`
- `src/app/components/ventas/clientes/clientes.component.html:221`
- `src/app/components/ventas/checkout/checkout.component.html:149-150`
- `katuq_admin_back_firebase/functions/services/shopify/mappers/order.js:274-275` (autopoblado desde Shopify)
- `katuq_admin_back_firebase/functions/services/paymentGateway/providers/wompiProvider.js:144` (referencia)
- `katuq_admin_back_firebase/functions/services/paymentGateway/providers/epaycoProvider.js:82` (referencia)

**Conclusión**: el dato existe, no hace falta nueva captura UX. Sí hace falta normalización antes de enviar (similar a `smsService.normalizePhone`).

### Templates frontend — bloque WhatsApp ya parcial
- `services/notifications/templateHelpers.js:477-479`: bloque opcional WhatsApp ya armado en bloques de email del cliente.
- `services/notifications/templates/components/customerData.js:19-21`: bloque WhatsApp en datos del cliente para email.
- **Reuso**: no hay templates HSM aún; estos solo se usan en email actual. No bloquea esta spec.

## 3. Persistencia actual de preferencias

### Colección Firestore: `companies/{nomComercial}` (o subcolección equivalente según `maestroService.saveCompanyNotificationPreferences`)
Shape actual:
```jsonc
{
  "notifications": {                  // email
    "order_created": true,
    "payment_approved": true,
    ...
  },
  "sms_notifications": {              // SMS
    "order_created": false,
    ...
  },
  "company_copy_notifications": {     // copia BCC a la empresa
    "order_created": true,
    ...
  }
  // 👇 falta agregar:
  // "whatsapp_notifications": { "order_created": false, ... }
}
```

### Colección Firestore: `notification_preferences/{userId|company}`
Usada por `notificationQueue.checkUserPreferences()` (`notificationQueue.js:394-441`). Shape:
```jsonc
{
  "globalEnabled": true,
  "types": {
    "ORDER_DISPATCHED": {
      "channels": ["EMAIL", "SMS"]  // 👈 falta agregar "WHATSAPP" cuando aplique
    }
  }
}
```

## 4. Lo que NO existe y hay que crear

| Componente | Ubicación nueva | Tamaño estimado |
|---|---|---|
| Servicio Kapso | `functions/services/kapsoService.js` | ~150 LOC |
| Templates HSM map | `functions/services/notifications/whatsappTemplates.js` | ~80 LOC |
| Service de usage tracking | `functions/services/notifications/whatsappUsageService.js` | ~120 LOC |
| Service de billing/saldo | `functions/services/notifications/whatsappBillingService.js` | ~200 LOC |
| Router endpoints | `functions/routers/whatsapp.js` | ~80 LOC |
| Webhook entrante controller | `functions/controllers/whatsappWebhook.js` | ~120 LOC |
| Componente UI medidor | `src/app/components/notificaciones/whatsapp-meter/` | ~250 LOC (TS+HTML+SCSS) |
| Service Angular wallet WA | `src/app/shared/services/notifications/whatsapp-billing.service.ts` | ~80 LOC |
| Colecciones Firestore nuevas | `whatsapp_usage`, `whatsapp_balance`, `whatsapp_topup_history`, `whatsapp_inbound`, `whatsapp_billing_summary` | 5 colecciones |

**Total estimado código nuevo**: ~1100 LOC backend + ~330 LOC frontend.

## 5. Dependencias externas — estado

| Dependencia | Estado | Quién |
|---|---|---|
| Cuenta Kapso de Katuq con API key | **PENDIENTE** | Daniel |
| Número WhatsApp Business verificado por Meta | **PENDIENTE** | Daniel |
| Display name verificado "Katuq Notificaciones" | **PENDIENTE** | Daniel |
| 6 templates HSM aprobados por Meta | **PENDIENTE** | Daniel + Meta (1-3 días/template) |
| Política TyC actualizada con cláusula opt-in WhatsApp | **PENDIENTE** | Daniel + legal |
| Precio fijo por mensaje en COP | **RESUELTO 2026-06-17** ($80 COP — D-044) | Daniel |
| Mínimo de recarga inicial | **RESUELTO 2026-06-17** ($50.000 COP — D-045) | Daniel |
| Retención `whatsapp_usage` | **RESUELTO 2026-06-17** (1 año — D-047) | — |
| Política saldo no usado al cerrar cuenta | **RESUELTO 2026-06-17** (no reembolsable — D-048) | Daniel + legal |
| Firma webhook entrante | **RESUELTO 2026-06-17** (HMAC SHA-256 con `KAPSO_WEBHOOK_SECRET` — D-046; ajustable a Bearer en 009.4 si Kapso solo expone Bearer) | — |

**Bloqueante real**: el código se puede preparar pero NO se puede activar `ENABLE_WHATSAPP_NOTIFICATIONS=true` en producción sin los 4 ítems de onboarding Meta/Kapso resueltos (los 4 primeros). Lo financiero/legal ya está cerrado con defaults.

## 6. Compatibilidad con sistema existente

- ✅ Notificaciones legacy (`ActualizacionTicket`, `notification_queue` en RTDB) NO se tocan.
- ✅ SMS labsMobile NO se toca.
- ✅ Email nodemailer NO se toca.
- ✅ Feature flag permite habilitar/deshabilitar canal completo sin afectar otros.
- ✅ Preferencias por tipo: si comerciante NO activa WhatsApp para un tipo, no consume saldo ni envía.
- ⚠️ Agregar `WHATSAPP` al enum frontend rompe binarios cliente cacheados — al deploy del frontend nuevo, usuarios deben recargar. Mitigación: el toggle solo aparece tras recargar; no es bug, es eventual consistency normal.

## 7. Referencias Kapso (de docs.kapso.ai/docs/build-with-ai)

- **Endpoint REST**: `POST https://api.kapso.ai/meta/whatsapp/v24.0/{phoneNumberId}/messages`
- **Auth**: header `X-API-Key: YOUR_API_KEY`
- **Body texto libre** (solo dentro ventana 24h del último mensaje del cliente):
  ```json
  {"messaging_product":"whatsapp","to":"57300...","type":"text","text":{"body":"..."}}
  ```
- **Body template HSM** (sin ventana, requiere template aprobado por Meta):
  ```json
  {"messaging_product":"whatsapp","to":"57300...","type":"template","template":{"name":"order_confirmation","language":{"code":"es"},"components":[{"type":"body","parameters":[{"type":"text","text":"OH MY STORE"},{"type":"text","text":"KAT-123"}]}]}}
  ```
- **Webhooks de entrada**: soportado, mecanismo de firma a confirmar con docs.
- **Pricing Meta Colombia (referencia 2026)**: utility ~$0.0055 USD, marketing ~$0.0125 USD, service ~$0.005 USD por conversación 24h.
- **Pricing Kapso**: pendiente confirmar tarifa por mensaje.
