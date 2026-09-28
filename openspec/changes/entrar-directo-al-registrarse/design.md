## Context

Hoy, al terminar `/registrarse`:

1. `saveSurveyResponse` (backend `controllers/diagnostics.js:769`) crea la empresa, el rol y el usuario. El usuario queda con `password = bcrypt(SHA256-base64(temporal), 12)` y `mustChangePassword: true`. La contraseña temporal (`Kt1!` más 16 caracteres aleatorios) solo viaja en el correo de bienvenida.
2. La respuesta 200 no trae sesión (`{message, companyName, userEmail, credentialsEmailSent, promocion}`); la 202 es la cuarentena.
3. El front muestra "revisa tu correo" y a los 8 s redirige a `/login` (`diagnostic-survey.component.ts:735` y `783-801`).
4. El inicio de sesión (`POST /v1/authentication`, `controllers/authentication.js:30`) recibe `utils.hash(plain)` y lo compara con `bcrypt.compare` cuando lo guardado empieza por `$2`. Con `mustChangePassword` manda a `/change-password`. Una empresa inactiva (cuarentena) responde 403 `EMPRESA_SIN_ACCESO`.
5. `AuthService.handleSignInSuccess` (`auth.service.ts:74-176`, privado) guarda la sesión y enruta a `/onboarding` si no está completo.

El correo de notificaciones@katuq.com falla DMARC y cae en spam: 5 de los 6 registros por pauta del 23 y 24-sep nunca entraron.

## Goals / Non-Goals

**Goals:**
- Quien se registra y queda aprobado entra al panel sin esperar ni abrir correos.
- Reusar el inicio de sesión existente sin crear otro camino para emitir sesiones.
- Mantener compatibles los navegadores que tengan el front viejo en caché.

**Non-Goals:**
- Cambiar el formato de contraseñas del sistema, el login o "Olvidé mi contraseña".
- Arreglar SPF, DKIM y DMARC de katuq.com.
- Rediseñar el onboarding o la primera pantalla.

## Decisions

### D1. El front abre la sesión con el login de siempre, no el endpoint de registro
Tras un 200 del registro, el front llama `AuthService.SignIn(correo, utils.hash(contraseña), '')` con la contraseña que la persona acaba de escribir y que conserva en memoria. Así hereda todo lo que ya hace el login: token de 24 h, menú, `currentCompany`, bloqueo de empresas inactivas y enrutamiento a `/onboarding`.

- **Alternativa descartada: que `saveSurveyResponse` devuelva el token.** Obliga a duplicar o extraer la armada de la respuesta del login (menú, `estadoEmpresa`, `puedeEscribir`, `bienvenidaPath`), que hoy vive inline en `auth()`. Además convierte un endpoint público sin limitador en emisor de sesiones.
- Con D1 el backend del login no se toca y el endpoint público no entrega nada nuevo.

### D2. La contraseña viaja como hash y se guarda igual que en el login
El front manda `registro.password = utils.hash(plain)` (SHA256 en base64, 44 caracteres), nunca el texto plano. El backend guarda `bcrypt.hash(hash, 12)`, como ya hace con la temporal, y deja `mustChangePassword: false`.

- **Validación en el backend:** el hash cumple `/^[A-Za-z0-9+/]{43}=$/` (la misma que usa `updateDefaultPassword`) y no es el hash de una contraseña por defecto conocida (`Katuq2025!`, `Default@123`). Si no, responde 422 `VALIDATION_ERROR` sin crear nada.
- **Trade-off:** el servidor no puede medir la fuerza porque recibe un hash. La fuerza la garantiza el formulario. Mandar el texto plano solo en el registro rompería la convención del login.

### D3. Quitar la contraseña antes de escribir `surveyResponses`
`saveSurveyResponse` escribe el cuerpo completo en `surveyResponses` **antes** del anti-abuso (líneas 776-803). La contraseña se extrae y se borra de `surveyResponse.registro` al inicio del controlador, antes de esa escritura, de la llamada a la IA, de la auditoría de seguridad y del aviso a administradores.

### D4. Reglas de contraseña en el formulario: mínimas, para no frenar el registro
Mínimo 8 caracteres, con al menos una letra y un número. Se muestran como lista que se va marcando al escribir y el campo tiene botón de ver u ocultar. No se exigen mayúscula ni símbolo: la meta es que el registro no se caiga en este paso.

- **Alternativa:** la regla estricta de `change-password` (mayúscula, minúscula, número y símbolo `@$!%*?&`). Es más segura, pero agrega un paso difícil justo donde hoy se pierde gente. Queda como pregunta abierta para Daniel.

### D5. El campo va como último paso del registro y no entra al borrador
Se agrega un quinto paso ("Crea tu contraseña") después del celular, dentro del mismo flujo de un campo por pantalla. Vive como control del formulario `registration`, pero `saveProgress()` lo excluye explícitamente para que nunca quede en `localStorage`.

### D6. Pantalla de éxito: "Entrando a tu cuenta…" en vez de "revisa tu correo"
Tras el 200 se muestra la confirmación con un indicador de "Entrando…" y se llama al login de inmediato, sin la espera fija de 8 s. `handleSignInSuccess` enruta como en cualquier login.

- **Si el login falla** (red, respuesta honeypot que no creó nada o cualquier error): navega a `/login` con el correo precargado y el mensaje "Tu cuenta quedó creada. Entra con tu correo y la contraseña que acabas de crear".
- **202 (en revisión):** no se intenta el login y se muestra la pantalla de revisión actual.

### D7. Correo de bienvenida sin contraseña cuando la eligió la persona
`templates/registro.js` `correoBienvenida` recibe `contrasenaTemporal` opcional. Si no viene, el bloque de credenciales cambia a "Entra con tu correo y la contraseña que creaste", más el enlace de entrada y el de "Olvidé mi contraseña". El aviso interno ya no lleva contraseña y no cambia.

### D8. Compatibilidad: sin `registro.password`, todo sigue como hoy
Si no llega contraseña: temporal, `mustChangePassword: true` y correo con credenciales. El camino se retira cuando el front nuevo lleve 30 días desplegado. La tarea de retiro queda en el plan (Artículo XII).

### D9. Artículo IX (signals, `@if`, OnPush) no aplica aquí
El proyecto corre en Angular 14, sin signals ni control flow nativo, y el componente existente usa formularios reactivos y `*ngIf`. Se sigue su estilo para no mezclar paradigmas en un mismo componente.

### D10. Diseño nuevo de /registrarse (aprobado por Daniel el 2026-09-24)
Prototipo aprobado: https://claude.ai/artifact/FPrj4XQeifaXRwQ5i8EV2P. Dos columnas en escritorio: el formulario y una tienda de ejemplo con un aviso de "Pedido nuevo", que muestra qué obtiene la persona. En celular va el formulario primero.
- **Bienvenida:** un solo botón principal. El diagnóstico pasa a ser un enlace.
- **Pasos:** "Paso N de 5" con barra, etiqueta, ayuda por campo, errores en par fuerte/fondo suave, prefijo +57 y Enter para avanzar.
- **Orden:** nombre → correo → celular → cédula/NIT → contraseña, con el documento al final porque es donde más gente abandona.
- **Resumen:** en el registro corto el último paso crea la cuenta sin "Revisa tus datos".
- **Confirmación:** corta, con "Entrando a tu cuenta…".
- **Alcance:** solo HTML y SCSS del componente, bajo `.reg-layout`. El diagnóstico largo conserva su vista. Tema canónico (#5F3FE0, plano, sin gradientes) con la tipografía de marca Geometr415 que ya usa la pantalla.

## Risks / Trade-offs

- **[Riesgo]** La contraseña queda en memoria del componente hasta el login. → Se limpia justo después del intento de login y nunca se escribe en `localStorage`, `sessionStorage` ni en el borrador.
- **[Riesgo]** El login no tiene limitador y la contraseña del registro es más débil que la de `change-password`. → Igual que hoy para cualquier usuario. El limitador del login queda fuera de alcance, anotado como pendiente.
- **[Riesgo]** El honeypot responde 200 falso y el front intentaría entrar. → El login falla, cae al fallback de `/login` y el bot no obtiene nada.
- **[Trade-off]** Sin validar fuerza en el servidor (D2). → Se acepta por coherencia con el login; la validación de formato y de contraseñas por defecto sí va en el servidor.
- **[Observación, fuera de alcance]** `updateDefaultPassword` guarda el hash SHA256 sin bcrypt (`controllers/users.js:393-398`). Merece su propia propuesta.

## Migration Plan

1. **Backend primero:** acepta `registro.password` opcional (D2, D3, D7, D8). Con el front viejo todo sigue igual. Se despliega con la rama de producción real, verificando `git log` contra lo que está desplegado.
2. **Front después:** paso de contraseña, envío del hash, login inmediato y fallback. Se publica desde un worktree limpio.
3. **Verificación en producción:** un registro real de prueba entra directo al onboarding. El usuario queda con `mustChangePassword: false` y un hash que empieza por `$2`. `surveyResponses` no tiene el campo `password` y el correo de bienvenida no lleva contraseña. Se borra la empresa de prueba al final, con OK de Daniel.
4. **Rollback:** revertir el front devuelve el comportamiento de hoy. El backend es compatible hacia atrás, así que no necesita revertirse.

## Decisiones de Daniel (2026-09-24)

- Reglas de contraseña: **mínimas** (8 caracteres, al menos una letra y un número), D4.
- Propuesta **aprobada** para implementar. OK de Daniel antes de cada despliegue a producción.
- Registro de prueba en producción **autorizado** con un correo de Julsmind; la empresa de prueba se borra al terminar.

### D11. Copias viejas guardadas por los navegadores de anuncios (25-sep)
El 24-sep llegaron 2 registros sin contraseña desde el navegador de `open_news`, un WebView de ByteDance donde TikTok Ads muestra anuncios por la red Pangle. Esas apps guardan una copia completa de la página del anuncio (HTML y JS) y la muestran aunque ya se haya publicado otra versión. Así corrió la web 24.1, que no tenía el paso de contraseña. Nuestras cabeceras están bien: `index` con `no-cache` y el paquete de la versión anterior ya no existe en Hosting. Simulando la web publicada con los user agents de `open_news` y de TikTok en Android e iOS, la contraseña sí viaja.
- **Front:** al abrir el registro se compara `environment.version` con `assets/version.json?t=`. Si no coinciden, recarga UNA vez con `?v=<versión>`, una dirección que la copia no tiene. Así se protegen las próximas publicaciones; la copia de la 24.1 no tiene este código.
- **Backend (para las copias que ya andan sueltas):** sin contraseña elegida, el `message` del 200, que la web vieja muestra en su éxito, dice que busque la contraseña en Spam o Promociones. El aviso interno llega con el asunto "Escríbele: … se registró y no entró", para que alguien le escriba en la primera hora.
- **Pauta:** cambiar la URL de los anuncios de TikTok (por ejemplo, agregar `&v=20260925`) obliga a esas apps a bajar la página de nuevo.
- El envío lleva `versionFront`, que queda en `surveyResponses` y en el aviso interno. Así una copia vieja se detecta sin adivinar.
