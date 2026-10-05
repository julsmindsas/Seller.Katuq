## Why

El 25-sep a las 10:58 a. m. entró "Tienda Aurora" (`companies/yrtPuzPRJjSa8xZ6Ur5H`) con datos inventados: correo `mingzhang@qq.com`, celular `3001234567` y NIT `900123456`. Quedó con `documentoPorConfirmar: serie`, pero con riesgo 0 y sin cuarentena. Terminó el onboarding en 2 minutos y creó "Camiseta blanca" sin foto. Llegó por la pauta de TikTok con `utm_content=__CID__` (la macro sin reemplazar) y sin `ttclid`: alguien abrió a mano la URL del anuncio, lo más probable un revisor de TikTok. Además usaba Chrome 117 en Mac, una versión de 2023. No fue un ataque, pero muestra que **cualquiera entra con datos inventados**, y además el registro disparó `CompleteRegistration` a Meta y TikTok, así que la pauta aprende a traer registros falsos.

Daniel pidió "tomar todas las medidas necesarias para que no nos hackeen al menos así". El riesgo real no es una cuenta vacía. Es alguien que monta una tienda en `<slug>.katuq.com` para hacer phishing con nuestro dominio, o que usa Katuq para cobrar o mandar correos y WhatsApp a nombre de un negocio que no existe.

**Hallazgo grave al revisar el caso:** el límite de registros por IP no ve IPs. Las 20 auditorías de los últimos 30 días traen `::ffff:127.0.0.1` (la IP de nginx), porque Express corre con `trust proxy` en false y la cabecera `X-Forwarded-For` no llega. En la práctica el contador por IP es **global**: con 4 registros de cualquier persona en la misma hora, cada nuevo registro suma 35 puntos, y con 12 en la misma hora **todo registro se rechaza**, también los de pauta. Hoy no pasa porque el máximo fue 2 por hora, pero en cuanto suba el presupuesto se volvería un freno contra nosotros mismos.

**Huecos más graves que Aurora, encontrados leyendo el código** (rama `backend-aws-security` en origin; confirmados leyendo el código, sin probarlos contra producción). Van primero, como cambios aparte y pequeños:

1. **Relay de correo abierto.** `POST /v1/notifications/send` no tiene autenticación (`index.js:375`, `routers/notificationsSend.js:41`). Cualquiera en internet puede mandar desde el SMTP de Katuq un correo con asunto y HTML libres a cualquier destinatario: phishing con nuestro remitente, sin siquiera registrarse. El panel lo referencia en `notification.config.ts:787`.
2. **Una empresa puede tocar los sitios de otra.** El router de sitios (`/v1/sites`, solo `auth`) y el de WhatsApp toman la empresa de la cabecera `company`, que manda el cliente, y no del token firmado (`requireJwtTenant` no está montado ahí). `sites.publish` compara el sitio contra `req.headers.company`. Con una cuenta cualquiera, como Aurora, basta cambiar esa cabecera para editar o publicar la tienda de otro comercio. Es el "hackeo" real que preocupa.
3. **Llaves de producción de Wompi en el repositorio.** `services/paymentGateway/plataforma.js:23-32` trae como respaldo la llave privada y la de integridad de producción de la cuenta de Katuq. Hay que rotarlas y quitar el respaldo del código. Además, una tienda sin pasarela propia cobra en la cuenta de Katuq, así que una tienda falsa publicada recibiría pagos a nombre nuestro.
4. **Envíos libres con sesión.** `POST /v1/orders/sendEmail` y `POST /v1/contacts/email-generico` le permiten a cualquier usuario logueado mandar HTML libre a cualquier correo desde Katuq. `POST /v1/whatsapp/welcome-bonus` regala $20.000 de saldo de WhatsApp a toda empresa nueva.

## What Changes

- **Cierre de los 4 huecos de arriba (fase 0, antes que todo lo demás):**
  - el relay exige sesión y solo manda al correo del usuario autenticado, o se retira si nadie lo usa;
  - `/v1/sites` y `/v1/whatsapp` pasan por `requireJwtTenant`;
  - Daniel rota las llaves de Wompi y el código deja de tener respaldo;
  - los envíos libres y el bono de bienvenida quedan detrás de la verificación.
- **Nuevo nivel "entra, pero debe verificarse"**, entre "aprobado" y "rechazado". Quien cae ahí entra al panel y puede configurar y cargar productos, pero hasta verificar su celular (código por WhatsApp) o su correo (código por correo) **no puede**:
  - publicar tiendas ni páginas en `<slug>.katuq.com`, tampoco desde Opttia;
  - conectar pasarelas de pago;
  - mandar correos de campaña, de prueba o libres, ni WhatsApp (difusión, conversación nueva o respuesta), ni recibir el bono de saldo de WhatsApp.
- **Reglas deterministas nuevas** en el puntaje del registro. Sirven para mandar a verificar, **nunca para rechazar**:
  - celular en serie, repetido o ya usado por otra empresa;
  - dominio de correo fuera de lo esperado (qq.com, 163.com, mail.ru…), con una lista que se mantiene sin desplegar;
  - cédula o NIT en serie o repetidos (hoy es solo un aviso y ahora suma);
  - UTM con macros sin reemplazar (`__CID__`, `{{ad.id}}`), o pauta pagada sin identificador de clic (`fbclid`/`ttclid`);
  - mismo dispositivo, misma IP o correo casi igual a un registro reciente;
  - navegador automatizado.
- **Opttia para los casos dudosos**: se consulta una sola vez por `POST /api/ai/json` y solo si el puntaje queda en zona gris. Juzga si nombre, correo, negocio y sector tienen sentido juntos y devuelve puntaje y razón. Puede mandar a verificar, nunca rechazar. Si falla o tarda, el registro sigue igual.
- **Cuarentena reemplazada por verificación** (recomendado): la cuarentena de hoy bloquea el inicio de sesión y no tiene flujo de aprobación, así que ese registro se pierde. Con los límites nuevos, el riesgo que evitaba queda cubierto. El rechazo sigue igual para las señales definitivas: honeypot, correo desechable y ráfaga de IP.
- **Píxeles**: un registro que debe verificarse no dispara `CompleteRegistration` al registrarse. Lo dispara al verificar, una sola vez, con `eventID` para que Meta y TikTok no lo cuenten doble.
- **Métricas**: la empresa lleva `metricsExcluded` con su motivo (`suspicious` o `test`), y los conteos de registros y empresas lo respetan. Al verificar se quita la marca de sospechoso. Aurora queda marcada; no se borra nada.
- **IP real**: nginx pasa la IP del visitante y el registro la lee de ahí. Así el límite por IP vuelve a ser por persona y no global.
- **El gate barato va primero**: la llamada de diagnóstico a Opttia hoy corre antes del anti-abuso. Se mueve después, para que un bot no la dispare.
- **Opcional, con costo y beneficio (fase 2)**: captcha invisible Cloudflare Turnstile en el envío del registro. Primero en modo sombra, sin bloquear.

## Capabilities

### New Capabilities
- `registration-risk-signals`: las señales, los puntajes y la decisión del registro público (aprobado, verificar o rechazado), con Opttia solo para la zona gris y la IP real.
- `unverified-account-limits`: qué no puede hacer una cuenta sin verificar, cómo se verifica (WhatsApp o correo), el aviso en el panel, los píxeles al verificar y la exclusión de métricas.

### Modified Capabilities
- Ninguna archivada. `self-registration-access` (del cambio `entrar-directo-al-registrarse`, todavía sin archivar) describe la cuarentena con 202. Si se aprueba reemplazarla, al archivar ese cambio sus escenarios de "en revisión" pasan a "verificar": el registro entra con sesión y con límites.

## Impact

- **Backend** (`katuq_admin_back_firebase`):
  - `services/registrationSecurity.js`: reglas nuevas y decisión en tres niveles.
  - `controllers/diagnostics.js` (`saveSurveyResponse`): orden del gate, campos nuevos en `companies` y respuesta con `verificationRequired`.
  - Un módulo puro nuevo, `utils/verificacionCuenta.js`, para la regla de "¿puede hacer esto?".
  - El gate en `middleware/soloLectura.js`, que ya corre en toda escritura autenticada y lee la empresa del token, más un chequeo explícito en la publicación desde Opttia, que no pasa por ese middleware.
  - Fase 0: `routers/notificationsSend.js`, `requireJwtTenant` en `/v1/sites` y `/v1/whatsapp`, y `services/paymentGateway/plataforma.js`.
  - Dos endpoints autenticados para pedir y confirmar el código.
- **Frontend** (este repo):
  - `/registrarse` manda un identificador de dispositivo y la señal de navegador automatizado, y no dispara el píxel si hay que verificar.
  - Una franja en el header con el botón "Verificar ahora".
  - Una ventana con el código.
  - `limites-plan.service.ts` maneja el código nuevo `VERIFICACION_PENDIENTE`.
  - El píxel sale al verificar.
- **Infraestructura**: una línea en el nginx de `back.katuq.com` (`proxy_set_header X-Real-IP`), con OK de Daniel.
- **WhatsApp**: hace falta una plantilla de autenticación aprobada por Meta en el número de Julsmind, a unos USD 0,01 por código en Colombia.
- **Datos**: sin colecciones nuevas. Todo vive en `companies` y `users`, más un contador diario en la colección existente `registration_rate`.
- **Privacidad**: el identificador de dispositivo es aleatorio (no es huella del navegador) y se guarda con hash. La política de privacidad debe mencionar "señales antifraude del registro (IP, dispositivo)"; se coordina con la sesión que la está editando.
- **Decisión**: se registra como D-323 en `specs/CONTRACT.md` al aprobarse.

## No-goals

- No revisa ni limita retroactivamente las empresas que ya existen, salvo marcar a Aurora en métricas.
- No borra ninguna empresa (Aurora incluida) sin OK de Daniel.
- No cambia el inicio de sesión, el plan gratis ni los límites de D-319.
- No arregla la entregabilidad del correo (SPF, DKIM y DMARC de katuq.com). Por eso WhatsApp es el canal principal para verificar.
- No toca pedidos, inventario ni consecutivos.

## Riesgos

- **Falsos positivos que cuestan registros pagados.** Contra los 15 registros de pauta reales del 23 al 25-sep, las reglas nuevas mandan a verificar a **0**. Todos tienen su `fbclid`/`ttclid` y ninguno tiene celular o correo raros. La peor coincidencia fue "la inglesa" (documento en serie), con 25 puntos, por debajo de 30. Aun así, quien cae en verificar **entra igual**: solo le falta publicar y cobrar, y verificar toma un minuto.
- **La plantilla de WhatsApp no la aprueba Meta a tiempo**: queda el código por correo, que puede caer en spam. Mientras tanto la cuenta sigue limitada, no bloqueada.
- **Atribución de pauta**: el píxel que sale al verificar puede salir desde otro dispositivo o más tarde, y Meta y TikTok lo atribuyen peor. Es preferible a enseñarle a la pauta a traer registros falsos.
- **Nginx en producción**: el cambio de cabecera es de una línea y se prueba con `nginx -t`, pero toca el proxy de todo el API. Va con respaldo del archivo y reload, sin restart.
