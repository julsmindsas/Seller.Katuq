# Spec 009.5 — WhatsApp Conversations Viewer (READ-ONLY)

> Estado: **draft** | in-review | approved | superseded
> Autor(es): Daniel + Claude
> Última actualización: 2026-06-17
> Spec padre: [[009-whatsapp-kapso-notifications-marco]]
>
> 📝 **Enmienda 009.5.1 abierta el 2026-06-17 (panel de contacto)** — ver `specs/009.5.1-whatsapp-contact-profile-panel/`. La enmienda agrega el panel lateral de identidad + últimos 10 pedidos + lead/score sin alterar el alcance del viewer. Ratificada bajo el mismo feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` (D-053).
>
> ⚠️ **COLISIÓN DE SLOT**: 009.5 estaba reservado en `sub-specs.md` y `spec.md` para "Pasarela de pago real" y "Display name dinámico". Esta spec propone reusar el slot 009.5 para el viewer; la renumeración (009.5=viewer, 009.6=pasarela pago, 009.7=display name) debe registrarse como **D-049** en CONTRACT.md antes de pasar a plan.md.

## 1. Contexto / Por qué

El comerciante ya envía notificaciones WhatsApp (009.1) y registra consumo (009.2), y desde 009.4 los clientes pueden responder. Hoy esas respuestas se guardan en `whatsapp_inbound` solo para auditoría — el comerciante **no las ve**. Sin visibilidad, el comercio percibe el canal como "fire-and-forget" y pierde confianza en Katuq como hub de comunicación.

## 2. Objetivo de negocio

Que el comerciante pueda **abrir un hilo por cliente final** dentro de Katuq y ver, en orden cronológico, qué le envió (de `whatsapp_usage`) y qué le respondió (de `whatsapp_inbound`), sin esperar al inbox bidireccional (009.6) ni al bot KAI (009.7). Habilita visibilidad operativa y reduce el tiempo a primera respuesta humana al re-contactar al cliente por otro canal.

## 3. User stories

- Como **admin del comercio** quiero **ver el listado de hilos WhatsApp con mis clientes** para **detectar quién me respondió y necesita atención**.
- Como **agente de customer service del comercio** quiero **abrir un hilo y ver el historial completo** para **entender el contexto antes de re-contactar al cliente por otro canal**.
- Como **superadmin Katuq** quiero **auditar hilos cross-tenant solo con scope explícito** para **resolver incidencias sin exponer datos a otros comercios**.

## 4. Criterios de aceptación (EARS)

- **AC-009.5-01.** THE system SHALL exponer la ruta `/notificaciones/whatsapp/inbox` registrada en `routes.ts` con `AuthGuard` y entrada en `nav.service.ts` bajo "Gestión Comercial" titulada "Conversaciones WhatsApp".
- **AC-009.5-02.** WHEN un usuario sin la action `view` sobre el módulo `whatsapp_conversations` intenta entrar a la ruta, THE system SHALL redirigir a `/forbidden` y NO renderizar el módulo.
- **AC-009.5-03.** WHEN el comerciante abre `/notificaciones/whatsapp/inbox`, THE system SHALL listar hilos paginados (pageSize 20, max 50) agrupados por cliente, ordenados por `lastMessageAt` desc, filtrados server-side por `company` extraído del JWT — NUNCA del query param.
- **AC-009.5-04.** THE system SHALL identificar cada hilo en el frontend solo por `phoneHash` (SHA-256 determinístico con `companyId` como salt) — el teléfono completo NUNCA viaja al cliente.
- **AC-009.5-05.** THE system SHALL mostrar por hilo: `clienteNombre` (si hay match en colección `clientes` filtrada por `company`), `profileName` de WhatsApp con disclaimer "no verificado" si no hay match, máscara `+57***1234`, `lastMessageAt`, `lastDirection`, `lastPreview` (≤80 chars), `unreadCount`.
- **AC-009.5-06.** WHEN el comerciante escribe en el buscador, THE system SHALL filtrar server-side por nombre cliente o teléfono normalizado con `debounceTime(350)` y `distinctUntilChanged` antes de la query.
- **AC-009.5-07.** WHEN el comerciante activa el filtro "Solo con respuesta entrante", THE system SHALL retornar únicamente hilos con al menos un doc en `whatsapp_inbound` para `(company, recipientPhoneNormalized)`.
- **AC-009.5-08.** WHEN el comerciante selecciona un hilo, THE system SHALL cargar el detalle cronológico ascendente uniendo `whatsapp_usage` (outbound) + `whatsapp_inbound` (inbound), paginado por cursor descendente (pageSize 50, max 100).
- **AC-009.5-09.** THE system SHALL renderizar cada mensaje con burbuja direccional: outbound a la derecha con badge `status` (sent/delivered/read/failed) leído directamente de `whatsapp_usage.status`; inbound a la izquierda con `messageType`.
- **AC-009.5-10.** WHEN el mensaje es media (image/audio/document/video/sticker), THE system SHALL renderizar placeholder textual (`[Imagen]`, `[Audio 0:15]`, `[Documento: factura.pdf]`) con botón "Descargar" que invoca el endpoint de media diferido — la media NUNCA se descarga en el render inicial.
- **AC-009.5-11.** WHEN el comerciante invoca "Marcar leído", THE system SHALL escribir `viewedByCompanyAt` en todos los `whatsapp_inbound` del hilo que aún no lo tengan, de forma idempotente, sin sincronizar a Kapso/Meta.
- **AC-009.5-12.** IF el `phoneHash` solicitado NO pertenece al `company` del JWT, THEN THE system SHALL responder 404 sin distinguir "no existe" vs "no autorizado" (no leakear existencia cross-tenant).
- **AC-009.5-13.** WHILE el rango de mensajes solicitado cruza la frontera TTL de 90 días de `whatsapp_inbound`, THE system SHALL retornar el flag `inboundTruncatedAt90d` y la UI SHALL mostrar banner: "Las respuestas de tu cliente mayores a 90 días ya no están disponibles. Tus envíos siguen visibles hasta 1 año."
- **AC-009.5-14.** WHEN el listado o detalle no tiene resultados, THE system SHALL mostrar empty state explícito ("Aún no hay conversaciones / No hay mensajes en este rango") con CTA hacia `/notificaciones` para activar tipos WhatsApp.
- **AC-009.5-15.** THE system SHALL aplicar polling cada 30s al listado y 15s al hilo abierto SOLO mientras la pestaña esté visible (Page Visibility API: pausa en `hidden`, reanuda al `focus`). NUNCA `onSnapshot` global.
- **AC-009.5-16.** THE system SHALL cumplir layout responsivo Master-Detail vía Angular CDK BreakpointObserver: ≥1024px ambos paneles, 768-1023px sidebar colapsable, <768px ruta-driven (listado y detalle como vistas separadas).
- **AC-009.5-17.** THE system SHALL cumplir WCAG AA: foco visible en todos los controles, navegación completa por teclado en listado y detalle, contraste de burbujas ≥ 4.5:1, anuncios ARIA de `unreadCount` y de "marcar leído".

## 5. Requisitos no funcionales

### 5.1 Performance
- Listado `GET /v1/whatsapp/threads` p95 ≤ 700ms con pageSize 20 sobre comercio piloto (50K msgs/mes).
- Detalle `GET /v1/whatsapp/threads/:phoneHash/messages` p95 ≤ 500ms con pageSize 50.
- Test de aceptación piloto OH MY STORE: sesión de 5 min consume < 100 lecturas Firestore por usuario.

### 5.2 Seguridad
- Filtro `company` server-side desde JWT decoded en middleware auth; el endpoint rechaza cualquier intento de override por query/body.
- `phoneHash = SHA-256(phoneE164 || '|' || companyId)` — `companyId` ES el salt; aísla tenants automáticamente.
- Rate-limit por endpoint: listado 10 req/min/usuario; detalle 20 req/min/usuario; media 5 req/min/usuario. Excedente → 429.
- Brute-force protection: log estructurado de patrones >10 404s/h desde misma IP, alerta a ops.
- PATCH `/viewed` requiere RBAC `markRead` sobre módulo `whatsapp_conversations` y deja audit row en `whatsapp_access_audit` (`{userId, role, company, phoneHash, action, timestamp, ipAddress}`).
- Teléfono completo NUNCA viaja al frontend ni se loguea; logs solo `phoneHash` o máscara `+57***1234`.

### 5.3 Observabilidad
- Logs estructurados con `correlationId` por request, incluyendo `phoneHash` (no teléfono).
- Métricas: tiempo de respuesta por endpoint, hilos vistos/día/empresa, hits a flag `inboundTruncatedAt90d`, ratio 404 vs 200 por IP.
- Colección `whatsapp_access_audit` con retención 90 días para forensics y compliance LOPD.

### 5.4 Accesibilidad
- WCAG 2.1 nivel AA, navegación 100% por teclado, anuncios ARIA (`role="log"` en lista de mensajes, `aria-live="polite"` en updates de polling).
- Contraste ≥ 4.5:1 en burbujas, badges y empty state.

### 5.5 Resiliencia
- Endpoints idempotentes (`/viewed` se puede llamar N veces sin efecto adicional).
- Empty state explícito si 009.1/009.2/009.4 aún no produjeron datos para el comercio piloto.
- Media: si Kapso devuelve URL expirada (Meta ~5min TTL), el endpoint regenera y reintenta 1 vez antes de 410.
- Polling con jitter ±5s para evitar thundering herd cuando varios usuarios del mismo comercio tienen la pestaña abierta.

## 6. Out of scope (explícito)

- Responder al cliente desde Katuq (es **009.6**, inbox bidireccional).
- Bot KAI / respuestas inteligentes (es **009.7**).
- Render nativo de media en burbuja (MVP usa placeholders + descarga diferida).
- Etiquetas custom, vistas saved-filters, asignación de agente, ownership/round-robin.
- Métricas avanzadas (tiempo primera respuesta, SLA, hilos abiertos/cerrados).
- Real-time con WebSocket / `onSnapshot` global.
- Exportar conversación a PDF/CSV.
- Notas internas, merge/split de hilos, transcripción de audios, OCR.
- Notificación push al comerciante al llegar un inbound (canal IN_APP existente, ortogonal).
- Webhook "leído por agente" hacia Kapso/Meta (`viewedByCompanyAt` es solo Katuq-side).
- Pasarela de pago real (renumerada a 009.6) y display name dinámico por comercio (renumerada a 009.7), pendientes de D-049.

## 7. Dependencias

- **[[009.1-whatsapp-kapso-sender]]** en estado approved-pending-validation (envío real produce `whatsapp_usage` con `status`).
- **[[009.2-whatsapp-usage-tracking]]** debe agregar el campo determinístico `recipientPhoneNormalized` (E.164 sin `+`) al insertar y backfill ejecutado para docs históricos — **bloqueante duro de implementación**.
- **[[009.4-whatsapp-inbound-autoresponder]]** en estado approved-pending-validation (persistencia de `whatsapp_inbound` con `recipientPhoneNormalized`).
- Design system Katuq (tokens SCSS, border-left 4px, NO gradientes).
- `nav.service.ts` y `modules-catalog.ts` para registro de módulo permission.
- Composite indexes Firestore obligatorios (deploy Phase 0 del plan): `(company, recipientPhoneNormalized, sentAt desc)` en `whatsapp_usage` y `(company, recipientPhoneNormalized, receivedAt desc)` en `whatsapp_inbound`.

## 8. [NEEDS CLARIFICATION]

- [ ] **Salt rotación para phoneHash**: ¿basta `companyId` como salt determinístico o se requiere rotación anual? **Default**: `companyId` only (aísla tenants sin operación de rotación).
- [ ] **Rate-limit por IP vs por usuario** en detalle: **Default**: por usuario autenticado, 20 req/min.
- [ ] **Ventana de retención `whatsapp_access_audit`**: **Default**: 90 días (mismo TTL que inbound, coherente).
- [ ] **Roles que ven el viewer por defecto al activar el módulo**: **Default**: admin del comercio + rol "customer service"; vendedores NO por defecto (configurable en `modules-catalog.ts`).
- [ ] **Confirmación slot 009.5** (renumeración pasarela pago → 009.6, display name → 009.7) — checkpoint Daniel + D-049 en CONTRACT.md **antes** de plan.md.

## 9. Riesgos identificados

- **R-01**: Sin datos visibles hasta que 009.1/009.2/009.4 estén implementados y produciendo mensajes. **Mitigación**: empty state explícito + seeder de datos demo (script `scripts/seed-whatsapp-demo.js`) para QA/UAT antes del piloto.
- **R-02**: PII teléfonos del cliente final. **Mitigación**: `phoneHash` opaco al frontend + máscara `+57***1234` + audit log en `whatsapp_access_audit` + sanitización en loggers (regla "ningún log puede contener `+57[0-9]{10}`").
- **R-03**: Costo Firestore si la paginación está mal hecha. **Mitigación**: composite indexes obligatorios deploy Phase 0; cursor-based paginación; polling 30s/15s (no `onSnapshot`); test de aceptación "<100 lecturas Firestore por sesión de 5 min" en piloto.
- **R-04**: Asimetría TTL (inbound 90d / outbound 365d). **Mitigación**: banner permanente + flag `inboundTruncatedAt90d` server-side; documentado como NFR conocido y heredado de D-047.
- **R-05**: Colisión de slot 009.5 con pasarela de pago y display name. **Mitigación**: D-049 en CONTRACT.md antes de plan.md; checkpoint humano con Daniel.
- **R-06**: Acoplamiento UI a Kapso. **Mitigación**: `WhatsappInboxService extends BaseService` devuelve modelos abstractos (`WhatsappMessage` con `direction/status/messageType` genéricos); el mapper Kapso→modelo vive en backend.
- **R-07**: HttpClient directo en módulo lazy → 401 silencioso. **Mitigación**: test unitario del servicio que assert `extends BaseService`; PR checklist obligatorio.

## 10. Métricas de éxito post-launch

- **Time-to-first-resolution** del comercio al re-contactar un cliente que respondió ≤ 4h en el percentil 50 durante los primeros 30 días.
- **% de comercios con WhatsApp activado** que entran al viewer al menos 1x/semana ≥ 60% a los 30 días.
- **0 incidentes cross-tenant** (logs de 404 por mismatch hash↔company sin escalación a fuga real).
- **0 logs con teléfono completo en plaintext** detectados en grep semanal de logs de prod.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] D-049 registrada en CONTRACT.md con renumeración 009.5/009.6/009.7.
- [ ] 009.2 confirmó adición de `recipientPhoneNormalized` (sin esto, 009.5 no entra a plan).
- [ ] Composite indexes Firestore listados en `firestore.indexes.json` antes de implementación.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, accesibilidad, resiliencia.
- [ ] Out of scope explícito (009.6/009.7 nombrados).
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de pasar a plan.
