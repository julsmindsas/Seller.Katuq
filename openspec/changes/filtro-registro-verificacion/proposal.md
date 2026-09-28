## Why

El 25-sep entró "Tienda Aurora" con datos inventados: correo `mingzhang@qq.com`, celular `3001234567` y NIT `900123456`. Quedó con riesgo 0, terminó la configuración inicial en 2 minutos y disparó `CompleteRegistration` a Meta y TikTok. Así la pauta aprende a traer registros falsos. El análisis completo está en la propuesta anterior "blindar el registro contra cuentas falsas".

Ahora que la tienda va a quedar publicada en 1 clic al terminar el registro (D-324), un registro falso podría montar una tienda en `<slug>.katuq.com` para estafar con nuestro dominio. Daniel pidió **"el filtro solo pa'l registro por ahora"**: el sospechoso verifica con un código por correo antes de entrar, sin modo limitado dentro de la app ni captcha. También eligió que el filtro salga **antes** que la tienda en 1 clic.

Además, el límite de registros por IP no ve IPs: todas llegan como la de nginx (`::ffff:127.0.0.1`), así que el contador es **global**. Con 12 registros de cualquier persona en una hora, se rechazaría **todo** registro, también los de pauta.

## What Changes

- **Tres niveles en el registro público:** aprobado (entra de una vez, como hoy), verificar o rechazado. Se rechaza solo por las señales definitivas de hoy: campo trampa, correo desechable y ráfaga desde la misma IP.
- **"Verificar" = código por correo antes de entrar.** Se crea la empresa, pero no hay sesión hasta escribir el código de 6 dígitos que llega al correo. Con el código correcto, entra directo a la configuración inicial. Reemplaza la cuarentena de hoy, que bloquea sin salida y sin flujo de aprobación.
- **Señales nuevas**, que mandan a verificar y nunca rechazan:
  - celular en serie, repetido o ya usado;
  - dominio de correo inesperado (lista ampliable sin desplegar);
  - documento en serie o repetido;
  - UTM con la macro sin reemplazar, o pauta pagada sin identificador de clic;
  - mismo dispositivo, IP o correo casi igual a otro registro reciente;
  - navegador automatizado.
  - Umbral de verificar: 30, ajustable sin desplegar, calibrado para que ningún registro real de pauta del 23 al 25-sep llegue.
- **Opttia solo en la zona gris** (puntaje de 10 a 29): una consulta corta de coherencia, que puede mandar a verificar pero nunca rechazar. El diagnóstico de Opttia pasa a correr después de la decisión, para que un bot no lo dispare.
- **IP real:** una línea en nginx (`X-Real-IP`), con OK de Daniel, y el registro la lee de ahí.
- **Píxel:** `CompleteRegistration` sale una sola vez, al aprobar o al confirmar el código. La empresa sin verificar queda fuera de las métricas hasta confirmar.

## Capabilities

### New Capabilities
- `registration-risk-signals`: las señales, los puntajes, la decisión en tres niveles, Opttia en la zona gris y la IP real.
- `signup-email-verification`: el código por correo antes de entrar, el inicio de sesión de quien no ha verificado, el píxel y las métricas.

### Modified Capabilities
- Ninguna archivada. Reemplaza la cuarentena del registro.

## Impact

- **Backend:**
  - `services/registrationSecurity.js`: las señales y los tres niveles;
  - `controllers/diagnostics.js` (`saveSurveyResponse`): el orden del gate, la respuesta `verificationRequired` sin sesión y la auditoría;
  - dos endpoints públicos con límite de frecuencia: `POST /v1/registro/codigo` (reenviar) y `POST /v1/registro/confirmar` (confirmar y entregar la sesión), que reusan `utils/siteCuenta.js`;
  - el inicio de sesión responde `VERIFICACION_PENDIENTE` a quien no ha verificado;
  - un correo con el código en `templates/registro.js`.
- **Front:** en `/registrarse`, la pantalla del código cuando llega `verificationRequired`; en el inicio de sesión, el mismo flujo si responde `VERIFICACION_PENDIENTE`; el píxel al confirmar.
- **Infraestructura:** una línea en el nginx de `back.katuq.com`, con OK de Daniel.
- **Datos:** sin colecciones nuevas. En `companies`: `accountVerification`, `registrationSignals`, `metricsExcluded` y `registrationPixelSent`. En `users`: `verificationChallenge`. Además, un contador diario en `registration_rate`.
- **Correo:** el código llega por el SMTP de Katuq, que hoy falla DMARC y puede caer en Spam. La pantalla lo avisa ("revisa Spam o Promociones") y permite reenviar. El arreglo del DNS de katuq.com sigue pendiente de Daniel y lo mejora.
- **Decisión:** D-323.
- **No-goals** (quedan en la propuesta anterior, en espera):
  - el modo limitado dentro de la app, el código por WhatsApp y el captcha;
  - la fase 0 (el relay de correo, la cabecera `company` en `/v1/sites` y `/v1/whatsapp`, las llaves de Wompi y el bono de WhatsApp);
  - borrar empresas;
  - revisar las empresas que ya existen.
