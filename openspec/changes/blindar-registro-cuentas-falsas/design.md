## Context

Así corre hoy `saveSurveyResponse` (backend `controllers/diagnostics.js`, rama `backend-aws-security`):

1. Saca la contraseña y **llama a Opttia para el diagnóstico** (hasta 45 s), antes de cualquier control.
2. Valida el formato (422), lee el contador `registration_rate/{ip}_{hora}` y calcula `assessRegistrationRisk` (`services/registrationSecurity.js`).
3. Con el honeypot lleno, 200 silencioso. Con 90 puntos o más, 403 `REGISTRATION_BLOCKED`. Entre 50 y 89, **cuarentena**: `activo:false` y `requiresManualReview`, responde 202 `PENDING_REVIEW` y no hay flujo de aprobación.
4. Crea `companies`, el rol, `users` y la configuración. `documentoPareceInventado` marca `documentoPorConfirmar`, pero no suma al riesgo (D-322).

En el front, `diagnostic-survey.component.ts:901` dispara `PixelesPautaService.registroCompleto()` salvo que `pendingReview` sea verdadero (`katuq-quickstart.service.ts:194`). El origen de campaña (`utm_*`, `fbclid`, `ttclid`, `landing`) viaja como `origenCampana`. No se manda nada del dispositivo.

**Datos verificados (lectura en Firestore, 25-sep):**
- Aurora: `riskScore: 0`, `riskReasons: []`, auditoría `type: allowed` con IP `::ffff:127.0.0.1` y UA Chrome 117 en Mac. Su origen fue `tiktok/paid/registros-tiktok-v2/__CID__`, sin `ttclid`. A la hora de la segunda lectura ya aparecía `activo:false`: alguien la desactivó a mano en ese rato.
- Las 20 auditorías de 30 días traen `127.0.0.1` o `::1`. Los documentos de `registration_rate` son todos `__ffff_127_0_0_1_<hora>`. El propio código lo sabe: `index.js:158` tiene `trust proxy` en false, y `routers/oauth.js:110` y `routers/sites.js:205` ya esquivan limitar por IP por eso mismo. El registro es el único que no lo hace.
- Los 15 registros de pauta del 23 al 25-sep traen `fbclid` o `ttclid` (100 %). Tienen 5 puntos (correo gratis) o 0.

## Goals / Non-Goals

**Goals:** que un registro con datos inventados no pueda publicar, cobrar ni enviar mensajes a nombre de Katuq hasta demostrar un celular o un correo reales; que no se le cuente a la pauta; y todo sin perder registros reales.

**Non-Goals:** revisar las empresas existentes; captcha en esta fase; arreglar el correo (DMARC).

## Decisions

### D1. Tres niveles, y las señales nuevas nunca rechazan
`assessRegistrationRisk` separa dos cosas:
- `riskScore` guarda solo las señales de hoy y conserva el rechazo a 90, excepto que la cuarentena desaparece (D2).
- `verificationScore` es `riskScore` más las señales nuevas.

La decisión queda así:
- `reject` si `riskScore ≥ REG_REJECT_THRESHOLD` (90);
- `verify` si `verificationScore ≥ REG_VERIFY_THRESHOLD` (30, variable de entorno);
- `allow` en cualquier otro caso.

Puntos de las señales nuevas, calibrados para que Aurora quede en "verificar" (110) y ningún registro real de pauta llegue a 30:

| Señal (razón guardada) | Puntos |
|---|---|
| `mobile_sequence` (serie de 7+) / `placeholder_mobile` (ya existe, se amplía) | 25 |
| `mobile_reused` (otra empresa con el mismo `celular`) | 15 |
| `unexpected_email_domain` | 30 |
| `document_sequence` / `document_repeated` (`documentoPareceInventado`) | 20 |
| `utm_unreplaced_macro` | 20 |
| `paid_without_click_id` | 15 |
| `device_reused_30d` | 30 |
| `ip_reused_24h` | 10 (NAT de operadores móviles: débil a propósito) |
| `email_near_duplicate_30d` | 20 |
| `automated_browser` (`navigator.webdriver`) | 25 |

- **Alternativa descartada: sumar todo al `riskScore` actual.** Aurora habría llegado a 110 y quedado **rechazada**, y un real con dos datos raros también. Rechazar es para las señales definitivas.

### D2. La cuarentena se reemplaza por "verificar" (recomendado; decisión de Daniel)
Hoy un puntaje de 50 a 89 deja la empresa inactiva, sin sesión y sin flujo para aprobarla: en la práctica el registro se pierde. Con los límites de D4, lo que la cuarentena protegía (que la cuenta haga daño) queda cubierto, y la persona puede destrabarse sola en un minuto.
- **Opción B:** mantener la cuarentena para 70–89. Es más conservadora, pero conserva el hueco de aprobación.

### D3. Opttia solo en la zona gris, después del gate barato
Se llama a Opttia si hay al menos una señal y `verificationScore` está entre `REG_OPTTIA_MIN` (10) y 29. Se usa `pedirJsonAOpttia(prompt, { maxTokens: 300, timeoutMs: 6000 })` de `services/ai/opttiaJson.js`, con un prompt nuevo en `services/ai/prompts/coherenciaRegistroPrompt.js`. El prompt recibe nombre, dominio del correo (no el correo completo), sector y respuestas, y devuelve `{ score: 0-100, reason }`. Si `score ≥ 70`, se suman 30 puntos (razón `opttia_incoherent`). Si falla, no suma y queda `opttia_unavailable` en la auditoría.

El diagnóstico de módulos recomendados, que también es de Opttia, se mueve **después** de la decisión y solo corre para `allow` o `verify`.
- **Alternativa descartada: meter la coherencia en el prompt del diagnóstico.** Hoy ese prompt corre para todos y tarda hasta 45 s; mezclarlo ata la seguridad a su tiempo y a su formato.

### D4. El gate va en la guardia que ya corre en toda escritura
`middleware/auth.js:69` llama a `soloLectura.guardiaSoloLectura` (`middleware/soloLectura.js:230`) en toda petición autenticada que escribe. Esa guardia ya lee la empresa **del token firmado**, no de la cabecera, y cachea su estado 60 s (`leerEstado` :203, `olvidar` :180).

Se extiende así:
- `leerEstado` también devuelve `accountVerification.status`.
- Un módulo puro, `utils/verificacionCuenta.js`, trae la lista de acciones sensibles (método + ruta) y `requiereVerificacion(estado, req)`.
- Si la empresa está `pending` y la ruta está en la lista, responde 403 `{ codigo: 'VERIFICACION_PENDIENTE', message }`.
- Al verificar se llama a `olvidar`.

La lista de acciones sensibles:
- `POST /v1/sites/:id/publish`;
- `/v1/sites/:id/correos/prueba`;
- `POST|PUT /v1/integration/config` con proveedor de categoría PAYMENT, y el `/connect` legado;
- `/v1/marketing/email/campanas/:id/programar|prueba`;
- `/v1/whatsapp/start-conversation`, `/campaigns/broadcast`, `/welcome-bonus` y `/conversations/:hash/reply`;
- `/v1/orders/sendEmail` y `/v1/contacts/email-generico`.

**Opttia y el MCP no pasan por `auth.js`** (`middleware/mcpAuth.js`), así que `publicarSitioDesdeOpttia` (`controllers/sites.js:5507`) lleva además el chequeo explícito, al lado de `planDe`. El 403 lleva `codigo` y no menciona "token", así que el interceptor del panel no cierra la sesión (`http.interceptor.ts:146`).
- **Alternativa descartada: un gate por controlador.** Son más de 10 archivos y algunos leen la empresa de la cabecera; un camino nuevo quedaría abierto por olvido.

### D4b. Fase 0: los huecos que no dependen del registro
- **Relay** `POST /v1/notifications/send`: si en 30 días de logs no tiene llamadas legítimas, se retira. Si las tiene, pasa a exigir `auth` y manda **solo** al correo del token (se ignora `toEmail`).
- **Tenant por cabecera**: montar `requireJwtTenant` (`middleware/tenant.js:42`) en `/v1/sites` (rutas autenticadas, no las `/public/*`) y en `/v1/whatsapp`. Antes, una prueba que demuestre que cambiar la cabecera `company` da 403 `TENANT_MISMATCH`.
- **Llaves de Wompi**: Daniel las rota en el panel de Wompi. El código deja de tener valores por defecto y, si falta la variable de entorno, falla cerrado. El historial de git conserva las viejas, por eso hay que rotarlas.

### D5. Campos, sin colecciones nuevas
- `companies.accountVerification`: `{ status: 'pending'|'verified', score, reasons[], requestedAt, verifiedAt, method: 'whatsapp'|'email' }`. Solo existe en empresas que cayeron en "verificar"; su ausencia equivale a verificada, así que las empresas de antes no cambian.
- `companies.registrationSignals`: `{ deviceIdHash, normalizedEmail, ipHash }` para buscar coincidencias con consultas de igualdad (índice simple automático).
- `companies.metricsExcluded` (bool) y `metricsExclusionReason` (`suspicious` o `test`).
- `companies.registrationPixelSent` (bool) para que el píxel no se repita.
- `users.verificationChallenge`: `{ hash, channel, attempts, expiresAt, lastSentAt }`, que reusa `utils/siteCuenta.js` (código de 6 dígitos, 15 min, 5 intentos, 60 s entre envíos, hash con sal).
- `registration_rate/{ip}_{AAAAMMDD}`: contador diario junto al horario que ya existe.

### D6. Verificación y píxel
- `POST /v1/account-verification/code` `{channel}` y `POST /v1/account-verification/confirm` `{code}`, con auth y rate limit por empresa.
- WhatsApp sale por `kapsoService.sendTemplate` con una plantilla de autenticación nueva (`katuq_codigo_verificacion`) en el número de Julsmind. El correo usa `services/email`.
- Al confirmar, el servidor pone `status:'verified'`, quita `metricsExcluded` si el motivo era `suspicious` y responde `{ firePixel: true, eventId: companyId, origen }` solo si `registrationPixelSent` era falso. Lo marca en la misma transacción.
- El front dispara `registroCompleto({ eventID })`.
- La respuesta del registro lleva `verificationRequired: true`. El front no dispara el píxel e inicia sesión igual.

### D7. IP real
Nginx: `proxy_set_header X-Real-IP $remote_addr;` en `location /` de `back.katuq.com`. `getClientIp` lee `X-Real-IP` primero; nginx lo pisa, así que un cliente no puede falsearlo. Solo si falta, cae al primer valor de `X-Forwarded-For`. Antes hay que confirmar que no haya un CDN delante; si lo hay, se usa su cabecera.

### D8. Captcha invisible (fase 2, opcional)
Cloudflare Turnstile (gratis hasta 1 M de verificaciones al mes), en modo sombra una semana: se guarda si pasó, sin actuar. Así se mide qué pasa en los WebView de anuncios (open_news/Pangle). Después, un token ausente o inválido suma a "verificar" y nunca rechaza.
- **Beneficio:** frena los registros por script.
- **Costo:** un script externo, una llamada de ~100 ms y el riesgo de fallar en esos WebView.
- No habría frenado a Aurora, porque fue una persona.

## Risks / Trade-offs

- **Falsos positivos** → umbral 30 medido contra 15 registros reales: 0 afectados. Además quedan contract tests con esos casos.
- **Plantilla de WhatsApp sin aprobar** → el código por correo sirve desde el primer día.
- **Nginx** → respaldo del `.conf`, `nginx -t` y `reload`, con OK de Daniel.
- **Condición de carrera en el píxel** → se marca `registrationPixelSent` en una transacción.

## Migration Plan

1. Nginx y `getClientIp` (independiente; puede salir primero).
2. Backend con `REG_VERIFY_THRESHOLD=1000`: registra razones y puntajes sin limitar a nadie (sombra) durante 2 días de pauta.
3. Front: franja, verificación y píxel.
4. Bajar el umbral a 30.
5. Script `--dry-run` y luego real para marcar a Aurora.

**Rollback:** `REG_VERIFY_THRESHOLD=1000` sin desplegar.

## Open Questions

- D2: ¿cuarentena fuera (recomendado) o se conserva de 70 a 89?
- ¿Quién crea y somete la plantilla de WhatsApp en Meta (Daniel o Claude vía Kapso)?
- ¿Turnstile entra en esta propuesta o queda para después?
