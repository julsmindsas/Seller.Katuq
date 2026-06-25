# Spec 009.5.1 — WhatsApp Contact Profile Panel

> Estado: **draft**
> Autor(es): Daniel + Claude
> Última actualización: 2026-06-17
> Spec padre: [[009.5-whatsapp-conversations-viewer]]
> Decisiones fijas: D-050 LEAD-SCORING-MANUAL-STARS, D-051 CRM-BRIDGE-OPT-IN, D-052 ORDERS-READ-ONLY, D-053 RATING-STAGING-30D

## 1. Contexto / Por qué
Hoy el operador del comercio abre un hilo WhatsApp en 009.5 y no ve quién está del otro lado: si es cliente registrado, qué pedidos lleva ni si vale la pena guardarlo en CRM. Cambiar de pantalla para verificar rompe el flujo de atención y reduce conversión Lead.

## 2. Objetivo de negocio
Al abrir un hilo WhatsApp, el del comercio ve identidad + últimos 10 pedidos + Lead asociado en un panel lateral, puede calificar 1-5 estrellas y guardar como Lead sin salir del hilo. Resultado: ≥40 % de los hilos tienen interacción con el panel y ≥10 % de los Leads nuevos del CRM se originan desde acá.

## 3. User stories
- Como **admin del comercio** quiero ver de un vistazo si el contacto WhatsApp ya es cliente y cuánto me ha comprado para priorizar mi atención.
- Como **agente customer service** quiero calificar al contacto con estrellas y guardarlo en CRM sin abandonar el hilo para no perder el contexto de la conversación.
- Como **owner del CRM** quiero que los Leads nacidos en WhatsApp queden trazados con `source=whatsapp_thread` para medir el canal.

## 4. Criterios de aceptación (notación EARS)
- AC-009.5.1-01: WHEN el operador abre un hilo en el viewer THE system SHALL renderizar el panel lateral con 3 secciones (Identidad, Historial, Lead) en ≤500 ms (p95).
- AC-009.5.1-02: THE system SHALL mostrar SIEMPRE el teléfono enmascarado (`+57***1234`); nunca el número completo en UI ni logs.
- AC-009.5.1-03: WHEN el contacto está en colección `clientes` del mismo `company` THE system SHALL mostrar `clienteNombre` con link a `/clientes/detalle/:id`; de lo contrario muestra `profileName` con badge "no verificado".
- AC-009.5.1-04: THE system SHALL listar máximo 10 pedidos del contacto ordenados por `fechaCreacion desc` con `nroPedido`, fecha relativa, estado, total y link al detalle de venta.
- AC-009.5.1-05: WHILE el contacto no tenga Lead en CRM THE system SHALL mostrar el botón "Guardar en CRM" en la sección Lead.
- AC-009.5.1-06: WHEN el operador hace click en una estrella (1-5) THE system SHALL persistir el rating con debounce 250 ms y registrar quién+cuándo lo asignó.
- AC-009.5.1-07: IF ya existe Lead asociado al teléfono+company THEN el rating SHALL escribirse en `lead.score`; de lo contrario SHALL escribirse en colección de staging con TTL 30 días.
- AC-009.5.1-08: WHEN el operador envía el form "Guardar en CRM" y ya existe Lead para `(company, phone)` THE system SHALL responder 409 con `leadId` existente y ofrecer "Ver lead existente"; no SHALL crear duplicado.
- AC-009.5.1-09: WHEN se crea Lead desde el panel y existe rating en staging THE system SHALL migrar el rating a `lead.score` y marcar `migratedToLeadId`.
- AC-009.5.1-10: THE system SHALL filtrar TODAS las consultas (perfil, pedidos, lead, rating) por `company` extraído del JWT server-side; nunca aceptar `company` del cliente.
- AC-009.5.1-11: IF un usuario del `company A` solicita `phoneHash` perteneciente a `company B` THEN THE system SHALL responder 404 (no 403, evitar enumeración).
- AC-009.5.1-12: THE system SHALL escribir en `whatsapp_access_audit` una fila por cada acción (`view_contact_profile`, `view_contact_orders`, `save_as_lead`, `rate_contact`) con `userId`, `phoneHash`, `correlationId`, `timestamp`.
- AC-009.5.1-13: WHERE el feature flag `WHATSAPP_INBOX_VIEWER_ENABLED` está desactivado para el `company` THE system SHALL ocultar el panel completo (no renderiza).
- AC-009.5.1-14: THE star-rating component SHALL cumplir WCAG AA: tap-target ≥44 px, `role="radiogroup"`, navegación por teclado (←/→/Enter/Esc) y focus visible.
- AC-009.5.1-15: IF el endpoint de Lead/CRM falla (4xx no-409 / 5xx / timeout >3 s) THEN el panel SHALL seguir mostrando Identidad + Historial intactas; la sección Lead SHALL renderizar **inline** dentro de su propio card (no modal, no toast) un mensaje "No pudimos cargar la información del CRM" + botón "Reintentar" que reintenta solo la llamada a CRM sin recargar el panel completo.

## 5. Requisitos no funcionales

### 5.1 Performance
- Panel render p95 ≤500 ms cargando perfil + pedidos + lead en paralelo (Promise.all).
- Cache 60 s sobre Identidad por `phoneHash`; pedidos snapshot al abrir el hilo (sin polling).

### 5.2 Seguridad
- Filtro `company` server-side desde JWT en los 4 endpoints; nunca confiar en body/query.
- Máscara de teléfono en UI y logs; `phoneHash` (SHA-256 con `company` como salt) en lugar de E.164.
- Rate-limit por usuario: GET perfil 30/min, GET pedidos 20/min, POST save-as-lead 10/min, PATCH rating 30/min.
- Normalización de latencia entre 200/404 (≥50 ms) para mitigar enumeración por timing.

### 5.3 Observabilidad
- Logs estructurados con `correlationId`, `userId`, `company`, `phoneHash`, `endpoint`, `latencyMs`, `status`.
- `whatsapp_access_audit` 90 días de retención con `action` enum y metadata (`leadId`, `previousScore`, `newScore`).
- Métricas: `panel_render_ms_p95`, `save_as_lead_count`, `rate_contact_count`, `409_duplicate_lead_count`.

### 5.4 Accesibilidad
- WCAG AA: contraste ≥4.5:1, tap-target ≥44 px, focus visible, `aria-checked` por estrella, `aria-live=polite` en feedback de save.

### 5.5 Resiliencia
- Si CRM endpoint falla, panel degrada mostrando Identidad + Pedidos; sección Lead muestra error suave + reintentar.
- Idempotencia en PATCH rating (mismo score = no-op `alreadyApplied:true`).
- POST save-as-lead idempotente por `(company, phone)`: 409 con leadId existente, jamás crea duplicado.

## 6. Out of scope (explícito)
- Scoring automático con IA/ML (se difiere a sub-spec futura 009.5.2).
- Responder dentro del hilo desde el panel (lo cubre 009.6).
- Edición completa del Lead (nombre, email, owner, stage) desde el panel — solo CREATE + RATE; edición vive en módulo CRM.
- Historial de actividades del Lead dentro del panel (queda en CRM detail; futura 009.5.3).
- Mostrar más de 10 pedidos inline; paginación queda en `/ventas/list` filtrado por teléfono.
- Migración masiva de ratings históricos a Leads existentes.

## 7. Dependencias

### 7.1 Specs y datos
- [[009.5-whatsapp-conversations-viewer]] implementado: el panel monta dentro de su shell de detalle.
- Módulo CRM Katuq existente: colección `leads`, endpoints `importLead`, `addActivity`, modelo `CrmLead` (se extiende con campos opcionales).
- Colección `orders` con campo `cliente.numero_celular_whatsapp` poblado (verificar formato E.164 en findings).
- Colección `whatsapp_usage` y `whatsapp_inbound` para reverse-lookup `phoneHash → phoneE164` server-side.
- Feature flag heredado `WHATSAPP_INBOX_VIEWER_ENABLED` (no se crea uno nuevo).
- Índice compuesto Firestore en `orders`: `(company ASC, cliente.numero_celular_whatsapp ASC, fechaCreacion DESC)`.

### 7.2 Librerías y dependencias permitidas (ya presentes en el proyecto)
- **Angular 14** + **TypeScript** + **SCSS** (stack base).
- **PrimeNG 14**: componentes `p-dialog` (SaveAsLeadDialog) y `p-accordion` (orquestador del panel).
- **@angular/cdk/layout** (`BreakpointObserver`) para responsive lateral/tab/sheet (heredado de 009.5).
- **RxJS** (`debounceTime`, `Promise.all` equivalente con `forkJoin`) para coalescing del rating y carga paralela del panel.
- **Feather icons** + tipografía base de Katuq.
- NO se introducen librerías nuevas. Cualquier librería adicional requiere enmienda en CONTRACT.md antes de mergear (Art XII).

## 8. [NEEDS CLARIFICATION]
- [ ] ¿`orders.cliente.numero_celular_whatsapp` está siempre en E.164 o hay variaciones legacy? **Default tentativo**: backfill mínimo + fallback a comparación normalizada server-side.
- [ ] ¿`leads.phone` está normalizado a E.164 en la colección actual? **Default tentativo**: normalizar en el endpoint save-as-lead y dejar campo `phoneNormalized` adicional.
- [ ] ¿Permitimos múltiples Leads por teléfono cuando uno está archivado (`activo=false`)? **Default tentativo**: NO — 1 teléfono → 1 Lead por company, activo o no; 409 con opción "reactivar".

## 9. Riesgos identificados
- R-01: La colección `leads` tiene shape distinto al esperado (campos `phone`, `source`, `stage` con nombres diferentes). **Mitigación**: auditoría en T-01 del findings antes de iniciar plan.
- R-02: `cliente.numero_celular_whatsapp` no está normalizado en `orders` legacy. **Mitigación**: fallback comparando con `cliente.indicativo_celular_whatsapp + numero_celular_whatsapp` concatenados; backfill opcional fase B.
- R-03: Carga del panel ralentiza el detalle del hilo. **Mitigación**: queries paralelas (`Promise.all`), cache 60 s en identidad, snapshot único de pedidos por apertura.
- R-04: Cross-tenant leak por timing attack al diferenciar 200/404. **Mitigación**: padding ≥50 ms en todas las respuestas; test de latencia en NFR.
- R-05: Click-flood en estrellas genera N actividades CRM y filas audit. **Mitigación**: debounce 250 ms front + coalesce backend (si última actividad `score_changed` del mismo user < 30 s, actualizar en vez de crear).

## 10. Métricas de éxito post-launch
- ≥40 % de los hilos abiertos tienen al menos una interacción con el panel (rating o save-as-lead), ventana 30 días post-launch.
- ≥10 % de los Leads nuevos del CRM tienen `source=whatsapp_thread`, ventana 60 días.
- 0 incidentes cross-tenant reportados en `whatsapp_access_audit` (filas con `company` mismatch), ventana continua.
- p95 render panel ≤500 ms medido en Real User Monitoring, ventana semanal.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, accesibilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
