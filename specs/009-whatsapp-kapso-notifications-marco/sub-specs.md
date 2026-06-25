# Sub-specs hijas — Roadmap de implementación

> Spec marco: [[009-whatsapp-kapso-notifications-marco]] (renumerada de 007 a 009 — ver D-043)
> Cada hija debe tener su propio `spec.md` aprobado antes de pasar a `plan.md` → `tasks.md` → `implement`.

## Orden de dependencias

```
009.1 ─┬─→ 009.2 ─→ 009.3 ─→ D-WA-MVP
       └─→ 009.4 ────────────┘
```

`009.1` desbloquea todo. `009.2` y `009.4` son independientes entre sí pero ambos requieren `009.1`. `009.3` requiere `009.2` para registrar usage al debitar saldo.

## 009.1 — whatsapp-kapso-sender

**Goal**: que el backend pueda enviar un mensaje de WhatsApp a través de Kapso al recibir una notificación con `channel: "WHATSAPP"`.

**Entregables**:
- `services/kapsoService.js` con `sendTemplate({phoneNumberId, to, templateName, language, parameters})`, `sendTextFreeform({phoneNumberId, to, body})`, `normalizePhone(phone)`, `getHealth()`.
- `services/notifications/whatsappTemplates.js` con map `WHATSAPP_TEMPLATES[NotificationType] = { templateName, language, paramBuilder(data) }` para los 6 tipos iniciales.
- Reemplazo del placeholder `notificationQueue.js:595-604` con implementación real que delega a `kapsoService`.
- Agregar enum `WHATSAPP` en `src/app/shared/services/notifications/notification.types.ts:67-74`.
- Agregar feature flag `whatsappNotifications` en `notification.config.ts:707-713`.
- ENV vars: `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_API_BASE_URL`, `ENABLE_WHATSAPP_NOTIFICATIONS`, `WHATSAPP_PRICE_COP=80` (D-044), `WHATSAPP_MIN_TOPUP_COP=50000` (D-045).
- Agregar `whatsapp_notifications` al `saveCompanyNotificationPreferences` + `loadPreferencesFromFirestore` en `notificaciones.component.ts`.
- Quitar `whatsapp-disabled` CSS de `notificaciones.component.html/scss`.
- Fix bug `case "WHATSAPP"` en `notificationQueue.js:317` — cambiar `"WEBHOOK"` por `"WHATSAPP"` en el segundo argumento de `checkUserPreferences`.
- SOP operacional `docs/integrations/kapso-template-rejection-sop.md` para flujo de templates rechazados por Meta (Daniel + Katuq Ops).

**Criterios de aceptación**:
- AC-WA-01 a AC-WA-04 del marco.
- AC-WA-16, AC-WA-17 del marco.
- Test manual: con `whatsapp_balance.balanceCOP` inflado en Firestore manualmente, encolar una notificación tipo `ORDER_DISPATCHED` → mensaje llega al cliente con `[OH MY STORE] Tu pedido KAT-XXX está en camino`.

**Out of scope**:
- Medición de consumo (009.2).
- Cualquier validación de saldo (009.3).
- Webhook entrante (009.4).

**Tamaño**: ~250 LOC backend + ~80 LOC frontend. **2-3 días.**

---

## 009.2 — whatsapp-usage-tracking

**Goal**: cada envío exitoso o fallido queda persistido en `whatsapp_usage` con costo y metadatos para auditoría y reporte mensual.

**Entregables**:
- Colección `whatsapp_usage` (schema en `findings.md`).
- `services/notifications/whatsappUsageService.js` con `registerSuccess({company, type, templateName, kapsoMessageId, recipientPhone, costoCOP})`, `registerFailure({company, type, error})`, `registerSkipped({company, type, reason})`, `getUsageMonth(company, yyyymm)`, `maskPhone(phone)`.
- Integración con `notificationQueue.sendWhatsAppNotification`: hook post-envío que llama al service apropiado.
- `whatsappUsageService.registerSuccess` debe ser **idempotente**: docId predictible `${notificationId}` + `.set({merge:false}, {failIfExists:true})` para evitar doble cargo si hay reintento.
- Cron mensual (sistema 002.8): job `whatsapp-billing-monthly-close` que congela el periodo anterior y genera doc en `whatsapp_billing_summary/{company}_{yyyymm}` con totales agregados.
- Cron anual (sistema 002.8): job `whatsapp-usage-purge-yearly` que purga docs individuales de `whatsapp_usage` con `sentAt < hoy - 365d` (D-047). El `whatsapp_billing_summary` queda como sustituto agregado para auditoría tributaria.

**Criterios de aceptación**:
- AC-WA-05 y AC-WA-06 del marco.
- Test: enviar 2 notificaciones del mismo tipo a la misma orden con bug que cause reintento → debe haber 1 solo doc en `whatsapp_usage` y 1 sola debitación.

**Out of scope**:
- Lógica de saldo (009.3).

**Tamaño**: ~150 LOC backend + 2 cron configs. **1-2 días.**

---

## 009.3 — whatsapp-billing-prepago

**Goal**: comerciante tiene saldo prepago, cada envío exitoso debita en transacción Firestore, llegando a umbrales 80%/0% recibe email, sin saldo se bloquea envío sin debitar.

**Entregables**:
- Colección `whatsapp_balance` (un doc por empresa): `{company, balanceCOP, totalRecargadoHistoricoCOP, totalConsumidoHistoricoCOP, lastTopupAt, alertSent80Pct: boolean, alertSent0Pct: boolean, accountStatus: 'active' | 'closing' | 'closed'}`.
- Colección `whatsapp_topup_history`: `{company, amountCOP, registeredBy, registeredAt, source: 'manual_admin' | 'gateway', notes}`.
- `services/notifications/whatsappBillingService.js` con `getBalance(company)`, `canSend(company, costoCOP)`, `debit(company, costoCOP, notificationId)` (en transacción atómica con registro en `whatsapp_usage` de 009.2), `topup(company, amountCOP, source, registeredBy)` (validar `amountCOP >= WHATSAPP_MIN_TOPUP_COP` en primera recarga del comercio — D-045), `checkThresholds(company, balanceAntes, balanceDespues)` → dispara emails, `markClosing(company)` (D-048).
- Guard en `notificationQueue.sendWhatsAppNotification`: antes de llamar Kapso, `if (!canSend(company, precio)) return skipped`.
- Endpoint `POST /v1/whatsapp/topup` (auth: superadmin Katuq). Body: `{company, amountCOP, notes}`. Rechaza `amountCOP < WHATSAPP_MIN_TOPUP_COP` para primera recarga del comercio.
- Endpoint `GET /v1/whatsapp/balance/:company` (auth: admin del comercio o superadmin).
- Endpoint `GET /v1/whatsapp/usage?company=X&from=...&to=...` (paginado, auth: admin del comercio o superadmin).
- UI medidor: nuevo componente `whatsapp-meter` en `/notificaciones` con saldo, mensajes/mes, gráfico 6 meses, botón "Solicitar recarga", precio fijo visible (`$80 COP / mensaje` — D-044).
- Email templates: `whatsapp-low-balance-80.html`, `whatsapp-no-balance.html`, `whatsapp-account-closing-30d.html`, `whatsapp-account-closing-7d.html` (D-048: avisos pre-cierre del saldo no reembolsable).

**Criterios de aceptación**:
- AC-WA-08, AC-WA-09, AC-WA-10, AC-WA-11, AC-WA-12, AC-WA-13 del marco.
- Test: bajar saldo a $0 manualmente → próximas notificaciones tipo `ORDER_DISPATCHED` se marcan SKIPPED_NO_BALANCE y NO llegan al cliente, pero email + SMS si están activos sí llegan.
- Test: intentar topup con `amountCOP = 30000` (debajo del mínimo) en primera recarga → backend rechaza 400 con `MIN_TOPUP_BELOW_THRESHOLD`.

**Out of scope**:
- Pasarela de pago real (futuro 009.5).
- Cron de barrido pre-cierre de cuenta (se incluye en 002.8 cuando el módulo de gestión de cuentas exponga `closingScheduledAt`).

**Tamaño**: ~280 LOC backend + ~330 LOC frontend. **3-4 días.**

---

## 009.4 — whatsapp-inbound-autoresponder

**Goal**: si el cliente responde por WhatsApp al número Katuq, recibe respuesta automática redirigiéndolo al canal del comercio.

**Entregables**:
- Endpoint `POST /v1/whatsapp/webhook` (auth: validación firma HMAC SHA-256 con `KAPSO_WEBHOOK_SECRET` — D-046). Si Kapso solo expone Bearer, fallback documentado en esta sub-spec sin reescritura.
- Controller `whatsappWebhook.js`: parsea evento, persiste en `whatsapp_inbound` (TTL 90 días), busca último envío al mismo `recipientPhone` en `whatsapp_usage` (últimos 30 días), identifica comercio dueño.
- Auto-respond template HSM `whatsapp_inbound_redirect` (aprobado por Meta) con parámetros `{{1}}=nombreComercio, {{2}}=email|web del comercio`. Enviado via mismo `kapsoService` pero NO consume saldo (es respuesta de soporte, decisión negocio).
- Endpoint `GET /v1/whatsapp/inbound?company=X&from=...` para que el comercio pueda ver mensajes entrantes históricos en su panel (read-only, audit only).
- Configuración del webhook URL en consola Kapso (manual, doc para Daniel).

**Criterios de aceptación**:
- AC-WA-14, AC-WA-15 del marco.
- Test: enviar `ORDER_DISPATCHED` desde OH MY STORE al +57300X → cliente responde "¿dónde está mi pedido?" → recibe auto-respond apuntando a `pedidos@ohmystore.com` o `ohmystore.com/contacto`.

**Out of scope**:
- Rutear mensaje entrante al inbox del comercio (futuro 009.6).
- Bot de respuesta inteligente con KAI/Bedrock (futuro 009.7).

**Tamaño**: ~200 LOC backend. **1-2 días.**

---

---

## 009.5.1 — whatsapp-contact-profile-panel (enmienda de 009.5)

**Goal**: que al abrir un hilo en el viewer (009.5), el operador vea identidad + últimos 10 pedidos + Lead asociado en panel lateral, y pueda calificar 1-5 estrellas y guardar como Lead sin salir del hilo.

**Naturaleza**: enmienda de 009.5 (mismo feature flag `WHATSAPP_INBOX_VIEWER_ENABLED`, ver D-053). NO altera el alcance del viewer ni introduce respuesta bidireccional (eso sigue siendo 009.6).

**Decisiones fijas**: D-050 (lead scoring manual 1-5 estrellas), D-051 (CRM bridge opt-in), D-052 (order history read-only), D-053 (mismo feature flag que 009.5).

**Entregables**:
- Backend: 4 endpoints — `GET /v1/whatsapp/contact/:phoneHash/profile`, `GET /v1/whatsapp/contact/:phoneHash/orders`, `POST /v1/whatsapp/contact/:phoneHash/save-as-lead`, `PATCH /v1/whatsapp/contact/:phoneHash/rating`. Todos filtran `company` server-side desde JWT.
- Colección `whatsapp_contact_rating_staging` (TTL 30 días) para ratings de contactos sin Lead aún en CRM.
- Frontend: componente `whatsapp-contact-panel` con 3 secciones (Identidad, Historial, Lead) integrado en el viewer 009.5 como panel lateral.
- Audit rows en `whatsapp_access_audit` para acciones `view_contact_profile | view_contact_orders | save_as_lead | rate_contact`.

**Criterios de aceptación**: AC-009.5.1-01..15 (ver `specs/009.5.1-whatsapp-contact-profile-panel/spec.md`).

**Out of scope**:
- Respuesta bidireccional (sigue siendo 009.6).
- Bot KAI (009.7).
- Edición masiva de Leads, asignación de agente, ownership.

**Tamaño estimado**: ~200 LOC backend + ~250 LOC frontend. **2-3 días.**

---

## Resumen total

| Sub-spec | Tamaño | Días | Bloqueante de |
|---|---|---|---|
| 009.1 | 250 BE + 80 FE | 2-3 | 009.2, 009.3, 009.4 |
| 009.2 | 150 BE | 1-2 | 009.3 |
| 009.3 | 280 BE + 330 FE | 3-4 | sello MVP |
| 009.4 | 200 BE | 1-2 | sello MVP |
| 009.5.1 | 200 BE + 250 FE | 2-3 | — (enmienda de 009.5) |
| **Total** | **~1740 LOC** | **9-14 días** | — |

**Sello operativo**: `D-WA-MVP` cuando las 4 sub-specs están done + acceptance suite ejecutada con 1 comercio piloto (OH MY STORE).
