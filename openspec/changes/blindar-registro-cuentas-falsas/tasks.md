## 0. Antes de programar

- [ ] 0.1 Aprobación de Daniel a la propuesta y a las preguntas abiertas del diseño (cuarentena, plantilla de WhatsApp, Turnstile)
- [ ] 0.2 Registrar D-323 en `specs/CONTRACT.md` (verificar que siga libre al escribirlo)
- [ ] 0.3 Traer la rama del backend al día (`backend-aws-security` local va 15 commits atrás) sin pisar cambios de otras sesiones

## 0b. Fase 0: huecos urgentes (cada uno es un commit aparte y puede salir antes que el resto)

- [ ] 0b.1 Relay: contar en los logs de nginx las llamadas a `/v1/notifications/send` de los últimos 30 días; con ese dato, retirarlo o exigir `auth` y mandar solo al correo del token. Contract test: sin token da 401
- [ ] 0b.2 Tenant: test que muestre que hoy, con token de la empresa A y cabecera `company: B`, `/v1/sites/:id/publish` alcanza el sitio de B, usando empresas de prueba y solo en local. Luego montar `requireJwtTenant` en `/v1/sites` (autenticadas) y `/v1/whatsapp`, y comprobar que la web sigue funcionando
- [ ] 0b.3 Wompi: Daniel rota la llave privada y la de integridad de producción; quitar los valores por defecto de `plataforma.js` y fallar cerrado sin la variable de entorno

## 1. IP real (independiente, puede salir primero)

- [ ] 1.1 Confirmar si hay un CDN delante de `back.katuq.com` (`dig`, cabeceras de respuesta)
- [ ] 1.2 Test de `getClientIp`: `X-Real-IP` primero, luego el primer valor de `X-Forwarded-For`, luego `req.ip`
- [ ] 1.3 Cambiar `getClientIp` en `services/registrationSecurity.js`
- [ ] 1.4 Con OK de Daniel: respaldo del `.conf`, `proxy_set_header X-Real-IP $remote_addr;` en `location /`, `nginx -t` y `reload`
- [ ] 1.5 Verificar que un registro de prueba (o una petición de diagnóstico) deje la IP real en `registration_security_audit`

## 2. Contrato primero (Artículo VIII)

- [ ] 2.1 `tests/onboarding/registroRiesgo.contract.test.js` con casos reales y falsos:
  - los 15 registros de pauta del 23 al 25-sep, anonimizados → `allow`;
  - "la inglesa" (documento en serie) → `allow` con 25 puntos;
  - Aurora → `verify` y **no** `reject`;
  - honeypot y correo desechable → `reject`, como hoy;
  - `__CID__`, `{{ad.id}}` y `{adid}` → macro; `meta/paid` sin `fbclid` → sin clic; sin origen → ninguna;
  - celular con serie de 7, repetido, `3000000000` y un celular real → solo los tres primeros suman.
- [ ] 2.2 `tests/onboarding/verificacionCuenta.contract.test.js`: `requiereVerificacion` y el 403 `VERIFICACION_PENDIENTE` en cada acción limitada (publicar web, publicar desde Opttia, pasarela, campaña, correo de prueba y WhatsApp); una empresa sin `accountVerification` pasa
- [ ] 2.3 Correr las pruebas y confirmar que fallan por las razones esperadas

## 3. Backend: señales y decisión

- [ ] 3.1 `config/registroDominios.js`: lista de dominios desechables y de "fuera de lo esperado", ampliable con `REG_DOMINIOS_DESECHABLES_EXTRA` y `REG_DOMINIOS_INESPERADOS_EXTRA`
- [ ] 3.2 `registrationSecurity.js`: las señales nuevas como funciones puras y `assessRegistrationRisk` con `riskScore`, `verificationScore` y la decisión en tres niveles
- [ ] 3.3 `diagnostics.js`:
  - gate barato antes de Opttia;
  - consultas de coincidencia (celular, dispositivo, correo normalizado) y el contador diario de IP;
  - Opttia de coherencia en la zona gris;
  - diagnóstico de Opttia después de la decisión;
  - escritura de `accountVerification`, `registrationSignals` y `metricsExcluded`;
  - `verificationRequired` en la respuesta;
  - razones en la auditoría y en el aviso interno.
- [ ] 3.4 `services/ai/prompts/coherenciaRegistroPrompt.js` y su prueba con respuesta simulada, falla y tiempo agotado
- [ ] 3.5 Quitar la cuarentena si Daniel aprueba D2; si no, conservarla de 70 a 89
- [ ] 3.6 Pruebas en verde y commit solo con los archivos del cambio, con el sello D-323

## 4. Backend: límites y verificación

- [ ] 4.1 `utils/verificacionCuenta.js` (lista de acciones sensibles) y su uso en `middleware/soloLectura.js` más el chequeo explícito en `publicarSitioDesdeOpttia` (leer cada archivo antes de editarlo)
- [ ] 4.2 Endpoints `POST /v1/account-verification/code` y `/confirm` (auth, rate limit por empresa), reusando `utils/siteCuenta.js`
- [ ] 4.3 Plantilla de autenticación `katuq_codigo_verificacion` en Kapso y su envío con `kapsoService.sendTemplate`; correo con `services/email` y una plantilla en `templates/registro.js`
- [ ] 4.4 Al confirmar: transacción que verifica, quita `metricsExcluded:suspicious` y devuelve el píxel una sola vez
- [ ] 4.5 Excluir `metricsExcluded` de los conteos: `services/platformMetrics/computePlatformTotals.js` (panorama de plataforma) y `controllers/promociones.js resultadoCampana` (registros por campaña)
- [ ] 4.6 Pruebas en verde y commit

## 5. Frontend

- [ ] 5.1 `/registrarse`: `dispositivoId` aleatorio en `localStorage` y `navigator.webdriver` en el cuerpo; no disparar `registroCompleto()` si `verificationRequired`
- [ ] 5.2 Franja en `header.component.html`, con el patrón de `subscription-banner` y los tokens del tema canónico; se lee de `currentCompany.accountVerification`
- [ ] 5.3 Ventana "Verifica tu cuenta": elegir WhatsApp o correo, el código, los intentos restantes y el reenvío a los 60 s. Usa un servicio que extiende `BaseService`
- [ ] 5.4 `limites-plan.service.ts manejar()`: con `VERIFICACION_PENDIENTE` ofrecer la verificación en lugar del error
- [ ] 5.5 Al verificar: `PixelesPautaService.registroCompleto({ eventID })` si el servidor lo pide, y refrescar `currentCompany`
- [ ] 5.6 `npm run build` sin errores y capturas en escritorio y celular

## 6. Despliegue (con OK de Daniel en cada paso)

- [ ] 6.1 Backend con `REG_VERIFY_THRESHOLD=1000` (sombra): medir `git log <prod>..origin/<rama>` y avisar si hay commits ajenos; `pm2 reload`
- [ ] 6.2 Dos días de pauta en sombra: revisar las razones y los puntajes en `registration_security_audit`; ajustar si algún real llega a 30
- [ ] 6.3 Front desde un worktree limpio; cambiar la URL de los anuncios (`&v=AAAAMMDD`) por las copias viejas en caché
- [ ] 6.4 Bajar el umbral a 30. Prueba real con un registro falso controlado (correo de Julsmind): entra, ve la franja, no puede publicar, verifica por WhatsApp, publica y el píxel sale una vez
- [ ] 6.5 Borrar la empresa de prueba (con OK de Daniel)

## 7. Datos

- [ ] 7.1 Script `scripts/marcar-metricas-excluidas.js --dry-run` para Aurora (`yrtPuzPRJjSa8xZ6Ur5H`, `suspicious`); correrlo real solo con OK de Daniel. Nada se borra

## 8. Fase 2 opcional

- [ ] 8.1 Turnstile en modo sombra una semana, si Daniel lo aprueba
