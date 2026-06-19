# Spec 009 — Marco WhatsApp Kapso Notifications (Shared Sender + Prepago)

> Estado: **approved (defaults aplicados 2026-06-17)** — clarifications resueltas vía D-044..D-048, listo para abrir 009.1/plan.md
> Autor(es): Daniel + Claude
> Carpeta: `specs/009-whatsapp-kapso-notifications-marco/` (renumerada de 007 a 009 en D-043 para resolver colisión con `007-user-admin-credentials-delete`)
>
> **Esta es una spec MARCO**: define el target state del canal WhatsApp para notificaciones transaccionales y referencia 4 sub-specs hijas (009.1 a 009.4) donde vive el detalle implementable.

## 1. Por qué esta spec existe

Hoy el sistema de notificaciones de Katuq soporta IN_APP, EMAIL, SMS (labsMobile) y FIREBASE_REALTIME. La UI del módulo `/notificaciones` muestra una columna WhatsApp marcada como "próximamente" desde hace meses, y el comerciante no tiene cómo notificar al cliente final por el canal donde **realmente lee** sus mensajes (tasa de apertura WhatsApp ~98% vs email ~20% en Colombia).

El responsable producto fijó el goal el 2026-05-25:

> "Las notificaciones serían desde el número de Katuq, solo que en los templates se dice el comercio que lo disparó. Hay que colocar un medidor de mensajes consumidos porque las notificaciones de WhatsApp sí se cobran, pero se le trasladan al comercio, y no está integrado al plan: es algo adicional."

Auditoría del sistema actual (ver findings.md):

- **Frontend**: `notification.types.ts:67` enum `NotificationChannel` NO incluye `WHATSAPP`. UI `notificaciones.component.ts:33` ya tiene la columna pero `whatsapp-disabled` CSS la bloquea.
- **Backend**: `notificationQueue.js:54` ya tiene feature flag `ENABLE_WHATSAPP_NOTIFICATIONS`, `:315-325` ya tiene branch `case "WHATSAPP"` en el switch, `:595-604` es un placeholder con `// TODO: Implementar cuando se configure WhatsApp Business API`.
- **Datos del cliente**: campo `numero_celular_whatsapp` + `indicativo_celular_whatsapp` ya capturado en 8+ formularios (POS, checkout, clientes, despachos).
- **Templates**: `EMAIL_TEMPLATES` y `SMS_TEMPLATES` listos. No existe `WHATSAPP_TEMPLATES`.
- **Billing/usage**: no existe colección ni servicio. Hay que construirlo desde cero.

Esta spec define:
1. El target state del canal WhatsApp con sender compartido (Katuq) + branding por mensaje del comercio.
2. El sistema de medición de consumo + saldo prepago por comercio.
3. La descomposición en 4 sub-specs ejecutables (009.1..009.4).
4. Los criterios de aceptación operativa (sello `D-WA-MVP`).

## 2. El sistema target

```
        Cliente final (WhatsApp en su celular)
                       ▲   │
                       │   │
       texto outbound  │   │  texto inbound
       (utility/HSM)   │   │  (respuestas del cliente)
                       │   ▼
       ┌─────────── Kapso API ─────────────┐
       │  https://api.kapso.ai/meta/...    │
       │  1 phoneNumberId (Katuq)          │
       │  1 X-API-Key (Katuq)              │
       └────────▲──────────────┬───────────┘
                │              │
       outbound │              │ webhook entrante
                │              │ POST /v1/whatsapp/webhook
                │              ▼
       ┌─────────── Katuq ────────────────────┐
       │                                       │
       │  notificationQueue                    │
       │    → checkBalance(company)            │
       │    → renderTemplate(WHATSAPP, type)   │
       │    → sendWhatsAppNotification         │
       │    → registerUsage(company, costo)    │
       │                                       │
       │  whatsapp_usage (Firestore)           │
       │    docs por mensaje enviado           │
       │                                       │
       │  whatsapp_balance (Firestore)         │
       │    saldo prepago por comercio         │
       │                                       │
       │  whatsapp_topup_history               │
       │    recargas registradas               │
       │                                       │
       │  /notificaciones (UI)                 │
       │    medidor + historial + recarga      │
       └───────────────────────────────────────┘
```

### Reglas operativas

| Aspecto | Decisión |
|---|---|
| **Display name del remitente** | "Katuq Notificaciones" (fijo, Meta no permite cambio per-mensaje). Cliente final ve "Katuq" como sender; texto del mensaje incluye `[NombreComercio]` al inicio. |
| **Templates HSM** | 1 set global aprobado por Katuq en Meta Business Manager. 6 templates iniciales: ORDER_CREATED, PAYMENT_APPROVED, PRODUCTION_COMPLETED, ORDER_DISPATCHED, ORDER_DELIVERED, ORDER_PROCESS_REJECTED. Parámetro `{{1}}` siempre = nombreComercio. |
| **Opt-in compliance Meta** | Cláusula en TyC del comercio: "Al usar Katuq, autorizas que las notificaciones WhatsApp salgan del número Katuq en tu nombre y aceptas la política Meta WhatsApp Business." |
| **Modelo de cobro** | **Prepago**: comercio recarga saldo, se debita por mensaje enviado exitosamente (status `sent` desde Kapso). Sin saldo → mensaje no se envía. |
| **Precio por mensaje** | **Fijo único** en COP definido por Katuq (cubre costo Meta utility/marketing + fee Kapso + markup). Visible al comercio antes de recargar. |
| **Acción al agotar saldo** | Bloquear envíos WhatsApp del comercio (los demás canales siguen). Email al admin del comercio al llegar a 80% y al 0% de saldo. |
| **Respuestas entrantes** | Auto-respond MVP: `"Hola, soy un canal automático de notificaciones de Katuq. Para atención, contacta a [NombreComercio] al [email/web del comercio]"`. No se ruta al inbox del comercio en MVP. |

## 3. Criterios de aceptación EARS

### Configuración global (Katuq, no per-empresa)

- **AC-WA-01.** THE system SHALL leer credenciales Kapso desde ENV vars `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_API_BASE_URL` al boot del backend.
- **AC-WA-02.** WHEN cualquiera de esas 3 ENV vars falta, THE system SHALL deshabilitar el canal WhatsApp completo y registrarlo en `/v1/notifications/status` con `whatsapp: { enabled: false, reason: 'missing-config' }`.
- **AC-WA-03.** THE system SHALL mantener un único set de templates HSM mapeados por tipo de notificación en `whatsappTemplates.js`, con keys idénticas a `NotificationType` enum.

### Envío de mensajes

- **AC-WA-04.** WHEN una notificación encolada tiene `channel: "WHATSAPP"` y el comercio tiene `whatsapp_notifications[type] === true`, THE system SHALL invocar `POST https://api.kapso.ai/meta/whatsapp/v24.0/{phoneNumberId}/messages` con type `template`, name del template aprobado, y `{{1}}=nombreComercio` como primer parámetro.
- **AC-WA-05.** WHEN Kapso responde 2xx con `messageId`, THE system SHALL persistir un doc en `whatsapp_usage` con `{ company, type, templateName, kapsoMessageId, costoCOP, sentAt, recipientPhoneMasked }` y debitar `costoCOP` del saldo del comercio en transacción Firestore.
- **AC-WA-06.** WHEN Kapso responde 4xx/5xx, THE system SHALL marcar la notificación como FAILED, registrar el error en `whatsapp_usage` con `status: 'failed'` y `costoCOP: 0`, y NO debitar saldo.
- **AC-WA-07.** THE system SHALL aplicar throttle por empresa: máximo 100 mensajes WhatsApp por minuto (protege rate limit Kapso/Meta y previene runaway billing por bug).

### Saldo y bloqueo

- **AC-WA-08.** WHEN una notificación WhatsApp se va a procesar y `whatsapp_balance[company].balanceCOP < precioMensaje`, THE system SHALL skipear el envío con status `SKIPPED_NO_BALANCE`, NO debitar nada, NO marcar como FAILED, y registrar la causa en `whatsapp_usage`.
- **AC-WA-09.** WHEN el saldo de un comercio cruza el umbral 80% → 79% (ej. de $100k restantes a $99k de $500k recargados), THE system SHALL enviar email al admin de la empresa con asunto "Tu saldo WhatsApp está por agotarse" UNA SOLA VEZ por ciclo de recarga.
- **AC-WA-10.** WHEN el saldo de un comercio cruza el umbral 0%, THE system SHALL enviar email "Saldo WhatsApp agotado" UNA SOLA VEZ y bloquear envíos WhatsApp hasta próxima recarga.

### Medidor / UI

- **AC-WA-11.** WHEN un admin del comercio abre `/notificaciones`, THE system SHALL mostrar: saldo restante en COP, mensajes enviados este mes, costo acumulado este mes, gráfico últimos 6 meses, botón "Recargar saldo".
- **AC-WA-12.** THE system SHALL exponer `GET /v1/whatsapp/usage?company=X&from=YYYY-MM-DD&to=YYYY-MM-DD` que retorna lista paginada de envíos con `{type, sentAt, recipientPhoneMasked, costoCOP, status}`.
- **AC-WA-13.** THE system SHALL exponer `POST /v1/whatsapp/topup` que registra una recarga manual (admin Katuq) o vía pasarela (futuro) y suma al saldo del comercio en transacción atómica.

### Webhook entrante + auto-respond

- **AC-WA-14.** WHEN Kapso entrega un mensaje entrante via `POST /v1/whatsapp/webhook` con firma válida, THE system SHALL responder al cliente con el auto-respond template apuntando al comercio dueño del último mensaje saliente al mismo número.
- **AC-WA-15.** THE system SHALL persistir mensajes entrantes en `whatsapp_inbound` para auditoría, con TTL 90 días, sin re-rutear al inbox del comercio en MVP.

### Preferencias por empresa

- **AC-WA-16.** WHEN un admin del comercio activa el toggle WhatsApp para un tipo en `/notificaciones`, THE system SHALL persistir `whatsapp_notifications[type] = true` en doc del comercio (similar al patrón actual de `sms_notifications`).
- **AC-WA-17.** WHEN un admin del comercio desactiva el toggle WhatsApp para un tipo, THE system SHALL persistir `false` y los envíos futuros de ese tipo se omiten silenciosamente (no consumen saldo).

## 4. Requisitos no funcionales

### 4.1 Performance
- Latencia p95 de envío Katuq→Kapso ≤ 1.5s.
- Procesamiento de webhook entrante p95 ≤ 800ms (responder 200 a Kapso rápido, encolar auto-respond).
- Render del medidor en `/notificaciones` p95 ≤ 600ms (cache 60s del saldo).

### 4.2 Seguridad
- `KAPSO_API_KEY` solo en ENV vars del backend, nunca expuesto al frontend.
- Webhook entrante valida firma HMAC de Kapso (o token Bearer si Kapso no firma — clarificar en sub-spec 009.4).
- Teléfono del cliente se enmascara en logs y `whatsapp_usage` (`+57***12345` formato).
- Endpoint `/v1/whatsapp/topup` solo accesible por admin Katuq via JWT con rol superadmin.
- Endpoint `/v1/whatsapp/usage` filtra server-side por `company === req.user.company` (multi-tenant strict).

### 4.3 Observabilidad
- Logs estructurados con `correlationId` por envío (incluye `kapsoMessageId` cuando se conoce).
- Métricas: total enviados/día/empresa, % success, latencia Kapso, saldo agotado/día.
- Alerta: si % failed > 10% en 15 min, notificar superadmin (Slack/email).
- Dashboard Firestore: query agregada de `whatsapp_usage` para reporte mensual de facturación.

### 4.4 Resiliencia
- Idempotencia: si se reintenta una notificación, debitar saldo UNA SOLA VEZ usando docId predictible `${notificationId}` en `whatsapp_usage` con `.set({merge:false}, {failIfExists:true})`.
- Reintentos: backoff exponencial 3 intentos para errores 5xx de Kapso; sin reintento para 4xx (cliente mandó mal el template).
- Caída de Kapso: encolar en `notification_queue` con TTL 24h; si Kapso vuelve dentro de la ventana, procesar; si no, marcar FAILED.
- Cierre mensual: cron del sistema (002.8) que congela el `whatsapp_usage` del mes anterior y genera doc de resumen en `whatsapp_billing_summary` para auditoría.

## 5. Out of scope (explícito)

- **Display name dinámico por comercio**: no es posible con Meta WhatsApp Business sin un número por comercio (futuro spec 009.5 si algún comercio premium lo solicita).
- **Inbox del comercio para conversaciones**: en MVP las respuestas del cliente NO se rutean al comercio. Auto-respond redirige a email/web del comercio.
- **Pasarela de pago para recargar saldo**: en MVP la recarga es manual por admin Katuq vía endpoint `/v1/whatsapp/topup`. Integración con Wompi/Epayco se difiere a sub-spec 009.5.
- **Templates marketing/promocionales**: solo templates utility (transaccionales por orden/pago/despacho). Templates marketing requieren opt-in explícito por cliente y se difieren.
- **Notificaciones internas (al comerciante)**: WhatsApp solo va al cliente final; las notificaciones al comerciante siguen por IN_APP/EMAIL.
- **Plan multi-tenant con credenciales Kapso por empresa**: out of scope. Una cuenta Kapso para todos.

## 6. Dependencias

- **Cuenta Kapso de Katuq** activa con phoneNumberId verificado por Meta (Daniel).
- **Templates HSM aprobados** por Meta Business Manager (Daniel + Meta, 1-3 días por template). Bloqueante de implementación.
- **Política TyC actualizada** con cláusula opt-in WhatsApp (Daniel + legal).
- **Definir precio fijo por mensaje** en COP antes de poner en producción (Daniel).
- Spec **004 (user-docs-flows)**: alinear vocabulario amigable en UI medidor (sin tecnisismos como "HSM", "phoneNumberId").
- Sistema de **crones dinámicos (002.8)** para cron mensual de cierre de billing.

## 7. Clarifications resueltas (2026-06-17, defaults aplicados — D-044..D-048)

- [x] **Precio fijo por mensaje = $80 COP** (D-044). Cubre Meta utility (~$30 COP) + fee Kapso (~$15 COP) + markup Katuq (~$35 COP, margen ~44%). Revisable por decisión nueva si Meta/Kapso suben precio.
- [x] **Mínimo de recarga inicial = $50.000 COP** (D-045). ≈ 625 mensajes utility. Suficiente para 1-2 meses de un comercio promedio sin fricción de microrecargas.
- [x] **Webhook entrante = HMAC SHA-256** con `KAPSO_WEBHOOK_SECRET` (D-046). Tentativo según docs Kapso; si la consola Kapso solo expone Bearer, se ajusta en 009.4 sin cambiar el resto.
- [x] **Retención de `whatsapp_usage` = 1 año** (D-047). Razón: auditoría tributaria DIAN exige retener soportes de gastos transferidos al comerciante. Después de 1 año los docs se mueven a `whatsapp_billing_summary` agregado por mes y se purgan los individuales.
- [x] **Saldo no usado al cerrar cuenta = no reembolsable** (D-048). Patrón estándar SaaS prepago (Twilio, AWS credits). Mitigación: cláusula explícita en TyC + email pre-cierre 30/7 días recordando saldo disponible.
- [ ] **Rate limit real de Kapso** por minuto/día/cuenta — diferido a sub-spec 009.1 (verificar empíricamente con account activa). Default conservador AC-WA-07: 100 msg/min/empresa.
- [ ] **Política de templates rechazados por Meta** — operacional, no bloquea código. Daniel + Katuq Ops escalan a Meta. Documentar SOP en sub-spec 009.1 entregables.

## 8. Riesgos identificados

- **R-01**: Display name "Katuq" puede generar confusión/desconfianza del cliente final del comercio. Mitigación: texto del mensaje empieza siempre con `[NombreComercio]` + opcional firma "Notificación de Katuq.com".
- **R-02**: Spam de un comercio afecta el rating del número compartido y puede degradar a TODOS los comercios. Mitigación: throttle por empresa (AC-WA-07) + monitoreo de bounces (deuda futura).
- **R-03**: Meta puede rechazar templates si la redacción incumple política utility (ej. usar lenguaje promocional). Mitigación: revisar lineamientos antes de someter, mantener plan B con SMS.
- **R-04**: Saldo prepago crea fricción de adopción. Mitigación: dar saldo inicial de bienvenida ($20.000 COP = ~250 mensajes utility) al activar el toggle WhatsApp.
- **R-05**: Si Kapso cambia precios o degrada servicio, Katuq paga la diferencia hasta ajustar precio al comercio. Mitigación: contratar Kapso con condiciones claras + alerta automática si margen baja del X%.

## 9. Métricas de éxito post-launch

- ≥ 10 comercios con WhatsApp activado en los primeros 30 días post-MVP.
- Tasa de envíos exitosos ≥ 98% (vs FAILED) en los primeros 30 días.
- Tasa de auto-respond inbound entregado ≥ 95%.
- 0 incidentes de saldo debitado sin envío exitoso (idempotencia perfecta).
- Margen Katuq ≥ 40% por mensaje (precio cobrado vs costo Meta+Kapso).

## 10. Sub-specs hijas

| Sub-spec | Slug | Scope | Bloqueante de |
|---|---|---|---|
| **009.1** | whatsapp-kapso-sender | Implementación del adaptador Kapso, enum WHATSAPP, placeholder→real, templates HSM mapeados, ENV vars, feature flag, integración con `notificationQueue`. | 009.2, 009.3, 009.4 |
| **009.2** | whatsapp-usage-tracking | Colección `whatsapp_usage`, helper `whatsappUsageService`, registro idempotente, máscara de teléfono, query agregada por mes/empresa. | 009.3 |
| **009.3** | whatsapp-billing-prepago | Colección `whatsapp_balance` + `whatsapp_topup_history`, endpoints `/v1/whatsapp/topup` y `/v1/whatsapp/usage`, transacciones atómicas saldo/usage, umbrales 80%/0% con emails, UI medidor en `/notificaciones`. | 009.4 |
| **009.4** | whatsapp-inbound-autoresponder | Webhook entrante `POST /v1/whatsapp/webhook`, validación firma, persistencia `whatsapp_inbound`, lookup último envío para identificar comercio, envío auto-respond con datos del comercio. | — |

Orden de implementación: 009.1 → 009.2 → 009.3 → 009.4.

Sello operativo `D-WA-MVP` se sella cuando:
1. Las 4 sub-specs están done.
2. Acceptance suite (1 comercio piloto) pasa: enviar 5 tipos de notificación con saldo, agotar saldo y validar bloqueo, recargar y reactivar, recibir respuesta y auto-respond entregado.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en los criterios EARS (solo en findings.md).
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de pasar a plan.
- [ ] Daniel confirmó precio fijo por mensaje + mínimo de recarga.
- [ ] Daniel envió templates HSM a Meta para aprobación (al menos los 6 base).
