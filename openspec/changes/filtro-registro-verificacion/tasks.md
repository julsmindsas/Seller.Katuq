## 0. Decisiones

- [x] 0.1 Daniel aprueba el alcance recortado ("filtro solo pa'l registro": código por correo antes de entrar) y la línea de nginx.
- [x] 0.2 Registrar D-323 en `specs/CONTRACT.md`.

## 1. IP real

- [x] 1.1 Confirmar que no haya CDN delante de `back.katuq.com`. (27-sep: el DNS apunta directo al EC2 y responde nginx; el `location /` no manda ni `X-Real-IP` ni `X-Forwarded-For`.)
- [x] 1.2 Prueba de `getClientIp` (`X-Real-IP`, luego `X-Forwarded-For`, luego `req.ip`) y el cambio.
- [x] 1.3 Con OK de Daniel: respaldo del `.conf`, `proxy_set_header X-Real-IP`, `nginx -t` y `reload`. Verificar la IP real en la auditoría.

## 2. Contrato primero

- [x] 2.1 Casos de riesgo:
  - los reales de pauta → `allow` (con datos de la misma forma: la lectura de los reales de producción se negó por datos personales; los calibra el modo sombra);
  - Aurora → `verify`, nunca `reject`;
  - honeypot y correo desechable → `reject`;
  - macros UTM, pagado sin identificador de clic, celulares en serie y repetidos.
- [x] 2.2 Casos de verificación:
  - `verify` responde sin token;
  - el código correcto entrega sesión una vez;
  - 5 intentos y vencimiento;
  - el reenvío no revela si el correo existe;
  - el inicio de sesión de una cuenta pendiente da `VERIFICACION_PENDIENTE`;
  - una empresa sin `accountVerification` entra como siempre.

## 3. Backend

- [x] 3.1 `config/registroDominios.js` y las señales como funciones puras en `registrationSecurity.js`: `verificationScore` y la decisión en tres niveles.
- [x] 3.2 `saveSurveyResponse`: el gate antes de Opttia, las coincidencias (celular, dispositivo, correo, IP diaria), Opttia en la zona gris, `accountVerification`, `registrationSignals`, `metricsExcluded`, la respuesta sin token en `verify` y el correo del código. La cuarentena desaparece.
- [x] 3.3 `POST /v1/registro/codigo` y `/confirmar`, con límites y la transacción de confirmar.
- [x] 3.4 El inicio de sesión con `VERIFICACION_PENDIENTE`.
- [x] 3.5 `metricsExcluded` en `computePlatformTotals` y en los resultados por campaña.
- [x] 3.6 Pruebas en verde.

## 4. Front

- [x] 4.1 `/registrarse`: `dispositivoId` aleatorio y `navigator.webdriver` en el envío; con `verificationRequired`, la pantalla del código (reenviar a los 60 s y aviso de Spam o Promociones).
- [x] 4.2 Inicio de sesión: con `VERIFICACION_PENDIENTE`, la misma pantalla.
- [x] 4.3 El píxel solo con `allow` o al confirmar.
- [x] 4.4 `npm run build` sin errores.

## 5. Despliegue (con OK de Daniel)

- [x] 5.1 Backend en sombra (umbral 1000), con la rama medida contra producción. Dos días de pauta y revisión de razones y puntajes.
- [x] 5.2 Front desde una copia limpia.
- [ ] 5.3 Umbral a 30 y prueba real con un registro falso controlado.
