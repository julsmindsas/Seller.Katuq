## 1. Contrato primero (Artículo VIII)

- [x] 1.1 Leer `controllers/diagnostics.js` (`saveSurveyResponse`, 769-1474) y `tests/onboarding/defaultPasswordSecurity.contract.test.js` antes de tocar nada
- [x] 1.2 Escribir `tests/onboarding/registroConContrasena.contract.test.js` (backend). Casos:
  - con `registro.password` válido → usuario con hash bcrypt (`$2…`) y `mustChangePassword: false`
  - sin `password` → flujo actual, con temporal y `mustChangePassword: true`
  - `password` con formato inválido o igual al hash de `Katuq2025!`/`Default@123` → 422 sin crear nada
  - `surveyResponses`, la auditoría y el aviso interno no contienen `password`
  - en cuarentena → 202 y la contraseña elegida queda guardada con bcrypt
- [x] 1.3 Correr la prueba y confirmar que falla por las razones esperadas

## 2. Backend (repo katuq_admin_back_firebase)

- [x] 2.1 Al inicio de `saveSurveyResponse`: extraer `registro.password`, borrarlo del objeto y validar formato (`/^[A-Za-z0-9+/]{43}=$/`) y la lista de contraseñas por defecto conocidas → 422 `VALIDATION_ERROR` con `fields: ['password']`
- [x] 2.2 Al crear el usuario: con contraseña elegida guardar `bcrypt.hash(hash, 12)` y `mustChangePassword: false`; sin ella, el camino actual intacto
- [x] 2.3 `templates/registro.js` `correoBienvenida`: `contrasenaTemporal` opcional; sin ella el correo no lleva contraseña y trae el enlace de entrada y el de "Olvidé mi contraseña". Actualizar `tests/onboarding/registroCorreos.test.js`
- [x] 2.4 Confirmar que ningún `console`, `logger` ni auditoría imprime el cuerpo de `registro` con la contraseña (Artículo XI)
- [x] 2.5 Correr la prueba del contrato y las de `tests/onboarding/`: todas en verde
- [x] 2.6 Commit en el backend (solo los archivos del cambio, nunca `git add -A`) con el sello D-319

## 3. Frontend (este repo)

- [x] 3.1 `diagnostic-survey.component.ts`: control `password` en `registration` con las reglas mínimas (8 caracteres, al menos una letra y un número) y un quinto paso en `registrationQuestions`
- [x] 3.2 `saveProgress()` excluye `password`; al restaurar un borrador el campo queda vacío
- [x] 3.3 `diagnostic-survey.component.html` y `.scss`: paso "Crea tu contraseña" con lista de reglas que se marca al escribir y botón ver/ocultar, con los tokens del tema canónico (acento #5F3FE0, plano, sin gradientes)
- [x] 3.4 `katuq-quickstart.service.ts`: enviar `registro.password = utils.hash(plain)`, nunca el texto plano
- [x] 3.5 `AuthService`: exponer un método público que reuse `SignIn` para el registro, sin duplicar `handleSignInSuccess`
- [x] 3.6 Éxito 200: mostrar "Entrando a tu cuenta…", llamar al login de inmediato (quitar la espera de 8 s) y limpiar la contraseña de memoria. Si falla, ir a `/login` con el correo precargado y el mensaje de cuenta creada. 202 sin cambios
- [x] 3.7 Texto de la pantalla de éxito: quitar "revisa tu correo para ingresar" cuando la persona eligió su contraseña
- [x] 3.8 `npm run build` sin errores

## 4. Registro de la decisión

- [x] 4.1 Agregar la decisión en `specs/CONTRACT.md` (quedó como D-321: D-319 lo tomó otra sesión el mismo día): contexto (5 de 6 registros sin entrar), decisión (D1–D8) y siguiente paso

## 5. Despliegue y verificación (con OK de Daniel en cada paso)

- [x] 5.1 Backend a producción: medir `git log <prod>..origin/<rama>` antes de pullear y avisar si hay commits ajenos; `pm2 reload` y verificar que un registro sin `password` sigue funcionando
- [x] 5.2 Front a producción desde un worktree limpio del commit; verificar `version.json`
- [x] 5.3 Registro real de prueba (correo de Julsmind, con OK de Daniel):
  - entra directo al onboarding
  - el usuario queda con `$2…` y `mustChangePassword: false`
  - `surveyResponses` no tiene `password`
  - el correo de bienvenida no lleva contraseña (verificado por el contrato y el log de envío; la bandeja de prueba no estaba conectada)
  - volver a entrar con la misma contraseña funciona
- [x] 5.4 Eliminar la empresa de prueba (con OK de Daniel)
- [ ] 5.5 Seguir los registros de pauta de los 3 días siguientes: cuántos entran al panel el mismo día (antes: 1 de 6)

## 6. Retiro del camino de compatibilidad (Artículo XII)

- [ ] 6.1 A los 30 días del front nuevo en producción: quitar la contraseña temporal del registro y exigir `registro.password` (dueño: Claude; fecha: 2026-10-25)

## 7. Diseño nuevo de /registrarse (D10, aprobado 2026-09-24)

- [x] 7.1 Nuevo orden de los pasos y pasos elegidos por campo, no por número (sesión seller-katuq-44, 7635f051)
- [x] 7.2 En el registro corto, "Crear mi cuenta" crea la cuenta sin el resumen (seller-katuq-44, 1ef0f234)
- [x] 7.3 Capa visual: bienvenida, pasos, confirmación y columna de ejemplo; build sin errores y capturas en escritorio y celular (sesión videos, rama design/registro-visual)
- [x] 7.4 Publicar junto con el resto del front, con OK de Daniel

## 8. Copias viejas en los navegadores de anuncios (D11, 25-sep)

- [x] 8.1 Diagnóstico con datos: 2 de 2 registros de TikTok sin contraseña, user agent `open_news` (WebView de ByteDance); simulación de la web publicada con los user agents de `open_news`, TikTok Android y TikTok iOS: la contraseña viaja
- [x] 8.2 Front: recarga única con `?v=` si la versión publicada no es la cargada; `versionFront` en el envío
- [x] 8.3 Backend: mensaje de la web vieja con dónde buscar la contraseña y aviso interno "Escríbele"; versión de la web en el aviso
- [ ] 8.4 Publicar backend y front (con OK de Daniel)
- [ ] 8.5 Pauta: cambiar la URL de los anuncios de TikTok para saltarse la copia guardada (sesión "videos")
