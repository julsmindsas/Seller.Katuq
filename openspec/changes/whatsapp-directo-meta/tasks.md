## 1. Meta: dejar la app lista (sin código)

- [ ] 1.1 En la app `katuq`:
  - agregar el producto WhatsApp;
  - confirmar que el número y la cuenta de WhatsApp de Julsmind quedan a nombre del negocio Julsmind y no de Kapso. Si son de Kapso, anotarlo: su migración va aparte.
- [ ] 1.2 Crear la configuración de inicio de sesión para empresas de WhatsApp, con los activos «Cuenta de WhatsApp Business» y los permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
  - Anotar el `config_id` y escoger la versión del registro insertado (4 o 5).
- [ ] 1.3 Suscribir el objeto `whatsapp_business_account` a `https://back.katuq.com/v1/messaging/webhook/meta`, con los campos `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`, `account_update` y `message_template_status_update`.
  - Se hace después de desplegar la tarea 3.1, para que Meta pueda verificar.
- [ ] 1.4 Probar con el número de Julsmind si el modo celular está disponible en Colombia, y anotar el resultado en el contrato.

## 2. Backend: el provider

- [ ] 2.1 Mover el parseo `eventosMeta` de `kapsoWhatsappProvider` a `providers/_metaFormato.js`, sin cambiar su comportamiento.
  - Las pruebas de líneas y las golden de D-437 pasan igual.
- [ ] 2.2 Crear `metaWhatsappProvider` con las funciones de conexión: `createConnectLink` (D2), `confirmLine` (D3), `refreshLine`, `registerLineWebhook` y los pasos por modo (D4), y `disableLineWebhook`.
  - Pruebas locales (D-566): código manipulado, número ajeno, paso que falla, reintento.
- [ ] 2.3 Agregar al provider las funciones de entrada y salida:
  - `verifyHandshake` y `verifyWebhook` con `X-Hub-Signature-256`, que fallan cerrado;
  - `parseWebhook` con `message.echo`, `message.history` y `template.status`;
  - `resolveLineCredentials` (D6).
  - Pruebas locales: firma inválida, aviso repetido, eco, historial y línea desconocida.
- [ ] 2.4 Agregar `createTemplate` y `listTemplates` al contrato base y a los dos providers (D9).
- [ ] 2.5 `kapsoService`: tomar la URL, la cabecera y la versión de la credencial que resuelve cada provider, también en la descarga de medios (D6).
  - Las 126 pruebas golden, las de notificaciones (23) y las de bot siguen en verde.
- [ ] 2.6 `whatsappOutboundService`: costo 0 y sin validar saldo cuando la línea es `meta_directo`; el uso se registra con `billingMode` (D7).
  - Prueba: con saldo 0, una línea directa envía y una de Kapso se bloquea.
- [ ] 2.7 `inboundProcessor`: el historial entra marcado como historia, sin bot y sin cobro; el eco del celular suelta el bot como hoy.
- [ ] 2.8 Cron de 15 minutos con horario fijo para las líneas `por_terminar` (D4): reintenta y avisa si se vence el plazo de 24 horas.
- [ ] 2.9 Configuración: leer `config/meta_whatsapp` y `companies.featureFlags.whatsappMetaDirecto` (D8). Script `scripts/meta-whatsapp-ajustes.js`, que simula por omisión, para escribir el documento global.

## 3. Backend: rutas

- [ ] 3.1 Agregar `GET /v1/messaging/webhook/:provider` (saludo); el `POST` que ya existe queda igual.
- [ ] 3.2 Pasar a `POST /v1/messaging/lines/connect` el modo escogido (`celular` | `nuevo`), y a `POST /v1/messaging/lines/confirm`, `{code, wabaId, phoneNumberId, estado}`. Validar ambos con la bandera.
- [ ] 3.3 Agregar `POST /v1/messaging/lines/:lineId/reintentar`, que corre solo los pasos que faltan.
- [ ] 3.4 Correr todas las suites de mensajería y de WhatsApp, y `node --check` de los archivos tocados.

## 4. Frontend

- [ ] 4.1 Agregar el conector `meta` a `connector-registry.ts`: carga el SDK de Facebook solo en la pantalla de líneas, `FB.login` con `config_id` y escucha `WA_EMBEDDED_SIGNUP`.
- [ ] 4.2 En `messaging-lines`, agregar el paso previo con las dos tarjetas y sus avisos (D10), y los estados «Por terminar», «Por reconectar» y «Falta el medio de pago en Meta», con «Reintentar».
- [ ] 4.3 En la pantalla de plantillas, escoger la línea y crear la plantilla por el manager. El estado de aprobación se ve en vivo.
- [ ] 4.4 Agregar una nota de versión en `notas-version.json` con `modulos` de Integraciones y del buzón.
- [ ] 4.5 Hacer el build de producción sin errores y revisar a 1440 y 390 px. No deben subir los gradientes ni los primarios prohibidos.

## 5. Despliegue y piloto

- [ ] 5.1 Hacer commit y push de los dos repos. Las pruebas nuevas se quedan fuera de git (D-566) y su resultado va en el mensaje del commit.
- [ ] 5.2 Desplegar el backend con el interruptor global apagado, después el front y después `config/meta_whatsapp`. Verificar el saludo del webhook (tarea 1.3).
- [ ] 5.3 Encender la bandera en Julsmind y FLORECER, con el OK de Daniel.
- [ ] 5.4 Prueba real con el modo celular: el historial entra sin bot, el mensaje entrante llega, la respuesta desde el buzón llega al teléfono y la respuesta desde el celular se ve en el buzón.
- [ ] 5.5 Prueba real con un número nuevo: conexión, envío, plantilla creada y aprobada, y desconexión limpia.

## 6. Instagram y Facebook

- [ ] 6.1 Reconectar en FLORECER la página y la cuenta de Instagram de prueba y comprobar que el buzón recibe y responde. Es la base de los videos 3 y 4.

## 7. Solicitud de revisión a Meta

- [ ] 7.1 Verificar en el panel:
  - las URL de privacidad, condiciones y borrado de datos responden 200;
  - el ícono, la categoría y la plataforma web están puestos;
  - la revisión anual de uso de datos está al día.
- [ ] 7.2 Ensayar sin grabar cada guion de `revision-meta.md`, con los dos teléfonos de prueba, las notificaciones personales silenciadas y la sesión de prueba.
- [ ] 7.3 Grabar los cuatro videos en pantalla completa, cada uno en una toma continua, con subtítulos en inglés. Revisarlos contra las tres tomas obligatorias antes de subirlos.
- [ ] 7.4 Pegar las descripciones y las instrucciones para el revisor de `revision-meta.md`, subir los videos y revisar las casillas de certificación una por una. Daniel envía la solicitud.
- [ ] 7.5 Registrar en el contrato la fecha del envío y, al llegar, la respuesta de Meta por permiso.
