## Context

- **El registro de hoy** (`saveSurveyResponse`, `controllers/diagnostics.js`):
  - llama a Opttia para el diagnóstico (hasta 45 s) antes de cualquier control;
  - luego calcula `assessRegistrationRisk` (`services/registrationSecurity.js`): rechaza con 90 puntos o más, y deja en cuarentena de 50 a 89 (`activo:false`, 202 `PENDING_REVIEW`, sin flujo de salida);
  - con D-321 la persona elige su contraseña y entra de una vez.
- **La IP:** `getClientIp` ve la de nginx, así que el contador por IP es global.
- **Datos reales:** los 15 registros de pauta del 23 al 25-sep tienen 0 o 5 puntos, y Aurora 0.
- **Lo que se reusa:**
  - `utils/siteCuenta.js`: código de 6 dígitos, vence a los 15 min, 5 intentos, 60 s entre envíos, guardado con hash y sal. Ya lo usa la cuenta del comprador de las tiendas.
  - `templates/registro.js` para los correos del registro.
  - `pedirJsonAOpttia` para la consulta a Opttia.

## Decisions

1. **Tres niveles; las señales nuevas nunca rechazan.**
   - `riskScore` conserva las señales de hoy y el rechazo en 90.
   - `verificationScore` es `riskScore` más las señales nuevas.
   - La decisión: `reject` si `riskScore ≥ 90`; `verify` si `verificationScore ≥ REG_VERIFY_THRESHOLD` (30); `allow` en otro caso.
   - La cuarentena de 50 a 89 pasa a ser `verify`.
   - Puntajes de las señales nuevas:
     - celular en serie, 25; celular reusado, 15;
     - dominio inesperado, 30;
     - documento en serie o repetido, 20;
     - macro sin reemplazar, 20; pagado sin identificador de clic, 15;
     - dispositivo repetido, 30; IP repetida en 24 h, 10;
     - correo casi igual a otro, 20;
     - navegador automatizado, 25.
   - Con esos puntajes, Aurora queda en `verify` y ningún real de pauta llega a 30.
2. **Verificar = sin sesión hasta el código.** En `verify`:
   - se crean empresa, rol, usuario y configuración igual que hoy;
   - `companies.accountVerification = { status: "pending", score, reasons, requestedAt }`;
   - se guarda el desafío en `users.verificationChallenge` y se envía el código;
   - la respuesta es 200 `{ verificationRequired: true, email }`, **sin token**.
   - `POST /v1/registro/confirmar { email, codigo }` (público, con límite por IP y por correo) valida el código. En una transacción:
     1. marca `verified`;
     2. quita `metricsExcluded`;
     3. decide si el píxel sale (`registrationPixelSent`);
     4. entrega el token de sesión, igual que el inicio de sesión.
   - `POST /v1/registro/codigo { email }` reenvía el código y responde lo mismo exista o no el correo, para no confirmarle a nadie qué correos están registrados.
   - Alternativa descartada: dar sesión y limitar dentro de la app. Daniel pidió "solo pa'l registro".
3. **Inicio de sesión.** El endpoint que usa hoy la web (`POST /v1/authentication`, el único que compara contraseñas), al encontrar `accountVerification.status === "pending"` con la contraseña correcta, responde 403 `{ code: "VERIFICACION_PENDIENTE" }` (la misma llave del `EMPRESA_SIN_ACCESO` de siempre) y reenvía el código si ya pasaron los 60 s. El front muestra la misma pantalla del registro. Sin `accountVerification`, que es el caso de todas las empresas de antes, no cambia nada.
4. **Opttia en la zona gris**, con `verificationScore` de 10 a 29 y al menos una señal: `pedirJsonAOpttia` con un límite de 6 s. Si juzga incoherente (70 o más), suma 30. El diagnóstico de módulos corre **después** de la decisión y solo para `allow` o `verify`.
5. **IP real:** nginx pone `proxy_set_header X-Real-IP $remote_addr;`. `getClientIp` usa la misma regla de los limitadores (`utils/rateLimitKeys.js`): `X-Real-IP` si no es de un proxy nuestro, luego `X-Forwarded-For` de derecha a izquierda saltando nuestros proxies, luego `req.ip`. Con eso los limitadores "por visitante", que hoy cuentan a todos juntos, también quedan por visitante. Sin IP del visitante (llega la de nginx) no se cuenta nada por IP. "Misma IP en 24 h" se guarda como el último registro por IP en `registration_rate/ultimo_<ip>`. No hay CDN delante (verificado el 27-sep).
6. **Píxel y métricas:**
   - `registroCompleto()` sale en el registro solo si `allow`, o al confirmar con `{ firePixel, eventId }`, una sola vez por empresa.
   - `metricsExcluded: "suspicious"` mientras esté pendiente, y se respeta en `computePlatformTotals` y en los resultados por campaña.

## Risks / Trade-offs

- **[El correo del código cae en Spam, porque katuq.com falla DMARC]** → la pantalla lo dice, se puede reenviar, y solo afecta al nivel "verificar", que calibrado no toca a los reales. El arreglo del DNS lo mejora.
- **[Falsos positivos]** → pruebas de contrato con los 15 reales y con Aurora, y una semana en sombra (`REG_VERIFY_THRESHOLD=1000`) midiendo razones y puntajes antes de bajar a 30.
- **[Enumerar correos]** → el reenvío responde igual exista o no el correo, con límite por IP y por correo.

## Migration Plan

1. Nginx y `getClientIp`, con OK de Daniel.
2. Backend en sombra (`REG_VERIFY_THRESHOLD=1000`): guarda razones y puntajes sin mandar a nadie a verificar. Dos días de pauta.
3. Front: pantalla del código y píxel.
4. Bajar el umbral a 30. Prueba real con un registro falso controlado (correo de Julsmind): recibe el código, confirma, entra, y el píxel sale una vez.
5. Después, la tienda en 1 clic (D-324).
- **Reversa:** `REG_VERIFY_THRESHOLD=1000`, sin desplegar.
