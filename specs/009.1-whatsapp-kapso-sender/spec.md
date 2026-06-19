# Spec 009.1 — WhatsApp Kapso Sender (adaptador + templates + enum)

> Estado: **draft** (en redacción 2026-06-17, pendiente review humano)
> Autor(es): Daniel + Claude
> Spec padre: [[009-whatsapp-kapso-notifications-marco]]
> Bloquea: 009.2, 009.3, 009.4

## 1. Contexto / Por qué

La spec marco 009 fijó el target state del canal WhatsApp (sender compartido Katuq, branding por mensaje, prepago, auto-respond). El sistema actual ya tiene andamiaje: feature flag, branch en switch dispatcher, placeholder con `// TODO`. Falta el **adaptador real al API de Kapso**, los **templates HSM mapeados**, el **enum frontend**, y la integración limpia con el flujo existente de `notificationQueue`.

Esta sub-spec entrega exclusivamente la capacidad de *enviar* un mensaje WhatsApp a través de Kapso al recibir una notificación con `channel: "WHATSAPP"`. Sin billing (009.3), sin usage tracking (009.2), sin webhook entrante (009.4). El criterio de éxito es: con `whatsapp_balance.balanceCOP` inflado manualmente en Firestore y los templates HSM aprobados, una notificación `ORDER_DISPATCHED` llega al cliente.

## 2. Objetivo de negocio

Al cierre de esta sub-spec, un operador de Katuq puede:
1. Configurar 3 ENV vars en backend → `ENABLE_WHATSAPP_NOTIFICATIONS=true` se activa.
2. Encolar una notificación con `channels: ["WHATSAPP"]` y el sistema la envía vía Kapso.
3. El cliente final recibe un mensaje WhatsApp con texto que empieza con `[NombreComercio]`.
4. El admin del comercio puede activar/desactivar el toggle WhatsApp por tipo en `/notificaciones`.

Resultado observable: 1 mensaje WhatsApp real entregado a un teléfono colombiano usando el número Katuq, con render correcto del nombre del comercio y los datos del pedido.

## 3. User stories

- Como **operador Katuq**, quiero configurar las credenciales Kapso una sola vez en ENV vars, para no tener que tocar `integration_configs/{company}` por empresa.
- Como **admin del comercio**, quiero ver la columna WhatsApp activa en `/notificaciones` y poder marcar qué tipos quiero enviar por ese canal, para tener el mismo control que ya tengo sobre Email y SMS.
- Como **cliente final**, quiero que el mensaje WhatsApp deje claro qué comercio me lo envía (no solo "Katuq"), para confiar en el remitente.
- Como **desarrollador backend**, quiero que el adaptador Kapso sea un servicio puro (sin dependencias del flujo de notificaciones), para poder probarlo aislado y reusarlo desde otros contextos (ej. 009.4 webhook entrante).

## 4. Criterios de aceptación (notación EARS)

### Configuración

- **AC-009.1-01.** THE system SHALL leer `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_API_BASE_URL` (default `https://api.kapso.ai`) al boot del backend.
- **AC-009.1-02.** WHEN cualquiera de `KAPSO_API_KEY` o `KAPSO_PHONE_NUMBER_ID` falta, THE system SHALL marcar el canal WhatsApp como deshabilitado en `getStatus()` con `reason: 'missing-config'` y `enabled: false`.
- **AC-009.1-03.** THE system SHALL leer `WHATSAPP_PRICE_COP` (default 80) y `WHATSAPP_MIN_TOPUP_COP` (default 50000) y exponerlos vía `getConfig()` para que 009.3 los consuma.

### Adaptador Kapso

- **AC-009.1-04.** THE `kapsoService` SHALL exponer `sendTemplate({ to, templateName, language, parameters })` que invoca `POST {baseUrl}/meta/whatsapp/v24.0/{phoneNumberId}/messages` con header `X-API-Key: {apiKey}` y body válido de WhatsApp Cloud API (messaging_product/to/type/template).
- **AC-009.1-05.** WHEN Kapso responde 2xx con `messages[0].id`, THE `kapsoService.sendTemplate` SHALL retornar `{ success: true, kapsoMessageId, raw: response.data }`.
- **AC-009.1-06.** WHEN Kapso responde 4xx, THE `kapsoService.sendTemplate` SHALL retornar `{ success: false, error: { code, message, retryable: false } }` sin lanzar excepción.
- **AC-009.1-07.** WHEN Kapso responde 5xx o falla red, THE `kapsoService.sendTemplate` SHALL reintentar con backoff exponencial (1s, 2s, 4s) máximo 3 veces y, si todos fallan, retornar `{ success: false, error: { code, message, retryable: true } }`.
- **AC-009.1-08.** THE `kapsoService.normalizePhone(phone, indicativo)` SHALL retornar el teléfono en formato E.164 sin signo `+` ni espacios (ej. `573001234567`), validando que tenga entre 10 y 15 dígitos tras limpiar.
- **AC-009.1-09.** IF `phone` está vacío o no se puede normalizar a E.164, THEN THE system SHALL retornar `{ success: false, error: { code: 'INVALID_PHONE' } }` sin invocar Kapso.

### Templates HSM

- **AC-009.1-10.** THE `whatsappTemplates.js` SHALL exportar `WHATSAPP_TEMPLATES[NotificationType]` con `{ templateName, language, paramBuilder(data) }` para los 6 tipos iniciales: ORDER_CREATED, PAYMENT_APPROVED, PRODUCTION_COMPLETED, ORDER_DISPATCHED, ORDER_DELIVERED, ORDER_PROCESS_REJECTED.
- **AC-009.1-11.** THE primer parámetro de TODOS los templates SHALL ser siempre `data.nombreComercio` para que el cliente final identifique al comercio.
- **AC-009.1-12.** IF el `NotificationType` recibido no está mapeado en `WHATSAPP_TEMPLATES`, THEN THE system SHALL marcar la notificación como SKIPPED con razón `NO_TEMPLATE_MAPPED` y NO debitar saldo ni invocar Kapso.

### Integración con `notificationQueue`

- **AC-009.1-13.** THE `notificationQueue.sendWhatsAppNotification` SHALL reemplazar el placeholder de `notificationQueue.js:595-604` con una implementación que: (a) resuelve el template y parámetros via `whatsappTemplates`, (b) normaliza el teléfono, (c) invoca `kapsoService.sendTemplate`, (d) retorna `{ success, kapsoMessageId?, error? }` al dispatcher.
- **AC-009.1-14.** THE bug en `notificationQueue.js:317` SHALL ser corregido: el switch `case "WHATSAPP"` actualmente llama `checkUserPreferences(notification, "WEBHOOK")`. El segundo argumento DEBE ser `"WHATSAPP"`.
- **AC-009.1-15.** WHEN una notificación tiene `channels` que incluye `WHATSAPP` y el comercio NO tiene `whatsapp_notifications[type] === true`, THE system SHALL skipear el envío silenciosamente (status `SKIPPED_USER_PREF_OFF`) sin debitar saldo.

### Frontend

- **AC-009.1-16.** THE `enum NotificationChannel` en `src/app/shared/services/notifications/notification.types.ts` SHALL incluir el valor `WHATSAPP = 'WHATSAPP'` antes del valor `WEBHOOK`.
- **AC-009.1-17.** THE `NOTIFICATION_CONFIG.features` en `notification.config.ts` SHALL incluir `whatsappNotifications: boolean` (default `true` para empresas con WhatsApp activado, `false` para el resto).
- **AC-009.1-18.** THE `notificaciones.component.ts` SHALL persistir `whatsapp_notifications: { [type]: boolean }` en el doc de empresa via `saveCompanyNotificationPreferences`, y leerlo via `loadPreferencesFromFirestore`, con el mismo patrón que `sms_notifications`.
- **AC-009.1-19.** THE CSS `whatsapp-disabled` en `notificaciones.component.scss:186` y la clase aplicada en `notificaciones.component.html:63-66, 107-108` SHALL ser eliminados; el checkbox de la columna WhatsApp queda interactivo.

### SOP operacional

- **AC-009.1-20.** THE documento `docs/integrations/kapso-template-rejection-sop.md` SHALL describir el flujo cuando Meta rechaza un template (quién escala, en qué timeframe, plan B con SMS, dónde se registra el rechazo). Este es el follow-up de la clarification abierta del marco sobre política de rechazos.

## 5. Requisitos no funcionales

### 5.1 Performance
- Latencia p95 `kapsoService.sendTemplate` ≤ 1.5s bajo carga normal (≤ 10 envíos concurrentes/empresa).
- Throughput sostenido ≥ 50 mensajes/seg agregado backend (limitado por Kapso/Meta, no por Katuq).
- Render del modal `/notificaciones` con la columna WhatsApp interactiva ≤ 600ms.

### 5.2 Seguridad
- `KAPSO_API_KEY` NO se loguea en plano nunca. El logger redacta el header `X-API-Key` antes de imprimir.
- `KAPSO_API_KEY` NO se expone al frontend bajo ninguna ruta (`/v1/notifications/status` retorna solo `whatsappEnabled: boolean`).
- Teléfono se enmascara en logs: `+57***1234` (mostrando solo últimos 4 dígitos).
- ENV vars validadas al boot con esquema (string non-empty, baseUrl URL válida).

### 5.3 Observabilidad
- Logs estructurados con `correlationId = notificationId` por cada envío.
- Métricas Firestore (deferidas a 009.2 — usage tracking): por ahora solo `console.error` estructurado con `{ event: 'whatsapp_send', success, errorCode, latencyMs }`.
- Endpoint `GET /v1/notifications/status` retorna `whatsapp: { enabled, configured, lastSuccessAt?, lastFailureAt? }`.

### 5.4 Accesibilidad (UI)
- La columna WhatsApp en `/notificaciones` cumple WCAG AA: contraste del checkbox ≥ 4.5:1, focus ring visible, label `aria-label="WhatsApp para {tipoNotificacion}"`.
- Estado deshabilitado del toggle (cuando la empresa no tiene WhatsApp activado a nivel global) se comunica con `aria-disabled="true"` y mensaje visible.

### 5.5 Resiliencia
- Retries idempotentes: si Kapso retorna 5xx, los retries usan el MISMO `Idempotency-Key: ${notificationId}` para que Kapso no envíe duplicado al cliente.
- Sin reintento para 4xx (`INVALID_PHONE`, `TEMPLATE_NOT_APPROVED`, `RATE_LIMIT_EXCEEDED` → marcar SKIPPED con throttle de 60s).
- Si las ENV vars faltan al boot, el backend NO crashea — solo deja el canal deshabilitado.

## 6. Out of scope (explícito)

- **Medición de consumo y persistencia en `whatsapp_usage`** → spec 009.2.
- **Validación de saldo y debit transaccional** → spec 009.3.
- **Webhook entrante de Kapso y auto-respond** → spec 009.4.
- **Pasarela de pago para recarga de saldo** → futuro spec 009.5.
- **Templates marketing** (solo utility por ahora).
- **Configuración Kapso por empresa** (sender es global Katuq, definido en marco 009 D-038).
- **Display name dinámico por comercio** (Meta no lo permite con sender compartido).

## 7. Dependencias

- **Spec marco** [[009-whatsapp-kapso-notifications-marco]] aprobada (✅).
- **Cuenta Kapso Katuq + número WhatsApp Business verificado** (Daniel — bloqueante de activación, NO de implementación). El código se puede mergear con `ENABLE_WHATSAPP_NOTIFICATIONS=false`.
- **6 templates HSM aprobados por Meta** (Daniel + Meta, 1-3 días por template). Sin esto, el envío real falla con `TEMPLATE_NOT_APPROVED`.
- **Cláusula opt-in en TyC del comercio** (Daniel + legal). Sin esto, no se debe activar en producción.
- **Sistema de feature flags por empresa** (ya existe en `notification.config.ts` — extender, no crear).

## 8. [NEEDS CLARIFICATION]

- [ ] **Idempotency-Key de Kapso**: ¿Kapso soporta header `Idempotency-Key` o tiene otro mecanismo? Verificar en docs Kapso o pedir muestra real. **Default tentativo**: enviarlo y aceptar que Kapso lo ignore si no aplica (no rompe nada).
- [ ] **Rate limit Kapso por cuenta**: ¿cuántos msg/seg/min permite Kapso antes de 429? Verificar al activar cuenta. **Default conservador**: throttle local 50 msg/seg agregado backend hasta saber.
- [ ] **¿Hay diferencia de pricing Kapso entre template HSM y texto libre (24h window)?** En MVP solo usamos HSM, así que esto se difiere; importante para 009.3 si se decide soportar texto libre.

## 9. Riesgos identificados

- **R-01**: el placeholder en `notificationQueue.js:595-604` ya retorna `false` (todo SKIPPED). Si el reemplazo introduce un bug que retorna `true` cuando falla, podría debitar saldo sin enviar mensaje. **Mitigación**: el `success` del adaptador SOLO se setea a `true` cuando Kapso confirma `messages[0].id`. Tests unitarios cubren los 3 paths (2xx, 4xx, 5xx).
- **R-02**: agregar `WHATSAPP` al enum frontend rompe binarios cliente cacheados (eventual consistency). **Mitigación**: el toggle solo aparece tras recargar; aceptado como UX normal.
- **R-03**: si Daniel demora los templates HSM, esta sub-spec se puede mergear pero NO se puede demostrar end-to-end. **Mitigación**: aceptamos `done con pendiente de validación productiva` igual que se hizo con spec 001.
- **R-04**: el fix del bug `case "WHATSAPP"` que pasa `"WEBHOOK"` puede revelar que ese branch siempre estuvo dead code; verificar que ningún consumo dependa del comportamiento erróneo.

## 10. Métricas de éxito post-launch (de esta sub-spec)

- 1 mensaje real entregado en sandbox antes de cerrar `done` (con templates aprobados).
- 0 errores en `node -c` y `tsc --noEmit` del backend y frontend.
- Suite de tests unitarios `services/__tests__/kapsoService.test.js` con 100% paths (2xx, 4xx, 5xx, retry, INVALID_PHONE).
- 0 strings `KAPSO_API_KEY` en stdout/stderr al loguear envíos (validado por test).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en los criterios EARS más allá de los necesarios para identificar puntos de integración.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, accesibilidad UI, resiliencia.
- [ ] Out of scope explícito (queda claro qué entrega 009.1 vs 009.2/3/4).
- [ ] Daniel confirma o ajusta los defaults de NEEDS CLARIFICATION antes de pasar a 009.1/plan.md.
