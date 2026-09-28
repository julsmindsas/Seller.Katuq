## 0. Decisiones

- [ ] 0.1 Daniel aprueba el alcance recortado ("filtro solo pa'l registro": código por correo antes de entrar) y la línea de nginx.
- [ ] 0.2 Registrar D-323 en `specs/CONTRACT.md`.

## 1. IP real

- [ ] 1.1 Confirmar que no haya CDN delante de `back.katuq.com`.
- [ ] 1.2 Prueba de `getClientIp` (`X-Real-IP`, luego `X-Forwarded-For`, luego `req.ip`) y el cambio.
- [ ] 1.3 Con OK de Daniel: respaldo del `.conf`, `proxy_set_header X-Real-IP`, `nginx -t` y `reload`. Verificar la IP real en la auditoría.

## 2. Contrato primero

- [ ] 2.1 Casos de riesgo:
  - los 15 reales de pauta → `allow`;
  - Aurora → `verify`, nunca `reject`;
  - honeypot y correo desechable → `reject`;
  - macros UTM, pagado sin identificador de clic, celulares en serie y repetidos.
- [ ] 2.2 Casos de verificación:
  - `verify` responde sin token;
  - el código correcto entrega sesión una vez;
  - 5 intentos y vencimiento;
  - el reenvío no revela si el correo existe;
  - el inicio de sesión de una cuenta pendiente da `VERIFICACION_PENDIENTE`;
  - una empresa sin `accountVerification` entra como siempre.

## 3. Backend

- [ ] 3.1 `config/registroDominios.js` y las señales como funciones puras en `registrationSecurity.js`: `verificationScore` y la decisión en tres niveles.
- [ ] 3.2 `saveSurveyResponse`: el gate antes de Opttia, las coincidencias (celular, dispositivo, correo, IP diaria), Opttia en la zona gris, `accountVerification`, `registrationSignals`, `metricsExcluded`, la respuesta sin token en `verify` y el correo del código. La cuarentena desaparece.
- [ ] 3.3 `POST /v1/registro/codigo` y `/confirmar`, con límites y la transacción de confirmar.
- [ ] 3.4 El inicio de sesión con `VERIFICACION_PENDIENTE`.
- [ ] 3.5 `metricsExcluded` en `computePlatformTotals` y en los resultados por campaña.
- [ ] 3.6 Pruebas en verde.

## 4. Front

- [ ] 4.1 `/registrarse`: `dispositivoId` aleatorio y `navigator.webdriver` en el envío; con `verificationRequired`, la pantalla del código (reenviar a los 60 s y aviso de Spam o Promociones).
- [ ] 4.2 Inicio de sesión: con `VERIFICACION_PENDIENTE`, la misma pantalla.
- [ ] 4.3 El píxel solo con `allow` o al confirmar.
- [ ] 4.4 `npm run build` sin errores.

## 5. Despliegue (con OK de Daniel)

- [ ] 5.1 Backend en sombra (umbral 1000), con la rama medida contra producción. Dos días de pauta y revisión de razones y puntajes.
- [ ] 5.2 Front desde una copia limpia.
- [ ] 5.3 Umbral a 30 y prueba real con un registro falso controlado.
