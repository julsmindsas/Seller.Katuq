## Context

- **El dominio Mensajería ya existe (D-437).**
  - `messagingManager` descubre los providers en `services/messaging/providers/*Provider.js` y resuelve por `line.provider`. Hoy el único provider es `kapsoWhatsappProvider`.
  - `_baseMessagingProvider` ya define el contrato: `createConnectLink`, `confirmLine`, `refreshLine`, `registerLineWebhook`, `disableLineWebhook`, `resolveLineCredentials`, `verifyWebhook`, `parseWebhook`, los `send*`, `markRead` y `listTemplates`. Su comentario ya preveía Meta como segundo provider.
- **Kapso ya habla el formato de Meta.**
  - `kapsoService` envía a `${baseUrl}/meta/whatsapp/v24.0/{phoneNumberId}/messages` con `X-API-Key`. El cuerpo es el de Cloud API.
  - `kapsoWhatsappProvider.parseWebhook` ya entiende `entry[].changes[]` (`eventosMeta`).
  - Por eso la salida directa es la misma llamada a `graph.facebook.com/{versión}/{phoneNumberId}/messages` con `Authorization: Bearer <llave de la línea>`.
- **Instagram y Facebook ya conectan con Meta directo (D-170).**
  - Inicio de sesión para empresas con `config_id` (`meta-channels.component.ts`).
  - Cambio de código por llave (`metaSendService.intercambiarCodigoPorCuenta`).
  - Llave cifrada con `secretsCrypto` (`metaCompanyConfig`).
  - Webhook firmado en `/v1/meta/webhook`, que falla cerrado sin `META_APP_SECRET`.
- **Datos:** desde el 1-nov (D-579) viven en Postgres detrás del adaptador. Las colecciones que se nombran aquí son de esa API.
- **Meta, verificado el 9-nov en su documentación:**
  - la versión 2 y la 3 del registro insertado se retiraron el 15-oct-2026, así que va la 4 o una superior;
  - para compartir el número del celular se usa `featureType: whatsapp_business_app_onboarding`;
  - hay que sincronizar contactos e historial antes de 24 horas;
  - los campos de webhook necesarios son `account_update`, `history`, `smb_app_state_sync` y `smb_message_echoes`;
  - en ese modo el número no se registra con `/register`;
  - un número compartido con el celular tiene un tope de 20 mensajes por segundo;
  - el proveedor de tecnología no comparte línea de crédito: cada cliente paga con su tarjeta.

## Goals / Non-Goals

**Goals:**
- Un provider `metaWhatsappProvider` que cumpla el contrato completo, sin condicionales por proveedor fuera de él.
- Conexión del número con dos modos, compartido con el celular o nuevo, y confirmación del lado del servidor.
- La salida y la entrada directas reutilizan el camino único actual: ventana, no-contactar, dueño del chat, sin duplicados, bot y bajas.
- Dejar la solicitud de revisión de los cuatro permisos lista para un solo envío.

**Non-Goals:**
- Apagar Kapso o migrar el número compartido de Julsmind. Eso va en un cambio aparte, después del piloto.
- Unificar los buzones de Instagram y Facebook en el dominio Mensajería (queda de D-437).
- Ser socio de soluciones de Meta, o compartir línea de crédito.
- Cobrar por la plataforma en las líneas directas. Si se quiere, es otra decisión de precios.
- Tocar pedidos, inventario, consecutivos o facturación.

## Decisions

### D1. Un provider más, no un servicio aparte
`services/messaging/providers/metaWhatsappProvider.js`, con `providerName = "meta"` y `channel = "whatsapp"`. La línea es `messaging_lines/meta_{phoneNumberId}`.
- **Por qué:** D-437 dejó el manager listo para esto (Artículo VI de la constitución).
- **Alternativa descartada:** extender `metaSendService`. Mezclaría Instagram y Facebook, que todavía no están en el dominio, con WhatsApp.

### D2. Conectar con el registro insertado, no con un enlace
El contrato de `createConnectLink` hoy devuelve `{url, expiresAt}`. Se amplía con una forma alternativa:
- `{ kind: "embedded_signup", appId, configId, graphVersion, featureType, estado }`, donde `featureType` es `whatsapp_business_app_onboarding` en el modo celular y nulo en el modo nuevo;
- el conector de Meta en `connector-registry.ts` carga el SDK de Facebook **solo en esa pantalla**, abre `FB.login` con `config_id`, escucha el `postMessage` `WA_EMBEDDED_SIGNUP` (que trae `waba_id` y `phone_number_id`) y manda `{code, wabaId, phoneNumberId, estado}` a `POST /v1/messaging/lines/confirm`;
- el `estado` es el mismo código de un solo uso que ya usa Kapso.
- **Alternativa descartada:** la redirección por URL que usan Instagram y Facebook. El registro insertado de WhatsApp entrega `waba_id` y `phone_number_id` solo por el evento de la ventana.

### D3. Confirmar del lado del servidor
`confirmLine` hace cuatro cosas en orden:
1. Cambia el `code` por la llave de la empresa en `/oauth/access_token`, con el secreto de la app.
2. Con esa llave lee `/{wabaId}/phone_numbers` y exige que `phoneNumberId` esté ahí. Si no está, responde `LINE_NOT_CONFIRMED`.
3. Lee el `debug_token` y exige que el permiso concedido cubra esa `waba_id`.
4. Devuelve la línea normalizada: número visible, nombre verificado, calidad, `wabaId` y `modo`.

La llave se guarda cifrada con `secretsCrypto` dentro de la línea (`credencialesCifradas`) y nunca sale en `publicView`.

### D4. Dejar la línea operativa: pasos idempotentes con estado
`registerLineWebhook` hace `POST /{wabaId}/subscribed_apps`. Después vienen pasos según el modo:
- **Número nuevo:** `POST /{phoneNumberId}/register` con un PIN de dos pasos generado y guardado cifrado.
- **Número del celular:** `POST /{phoneNumberId}/smb_app_data` dos veces, una con `smb_app_state_sync` y otra con `history`, cada una una sola vez.

Cada paso deja su marca en la línea (`pasos.suscrita`, `pasos.registrada`, `pasos.contactos`, `pasos.historial`). Si uno falla, la línea queda `por_terminar` y «Reintentar» corre solo los pasos que faltan. La sincronización tiene un plazo de 24 horas: un cron de 15 minutos, encendido solo si hay líneas `por_terminar` (D-505, horario fijo), reintenta y avisa al comercio si el plazo se vence.

### D5. Un solo webhook para WhatsApp de Meta
En la app, el objeto `whatsapp_business_account` apunta a `/v1/messaging/webhook/meta`. El webhook de Instagram y Facebook sigue en `/v1/meta/webhook` y no se toca.
- Se agrega `GET /v1/messaging/webhook/:provider` para el saludo, delegado al provider (`verifyHandshake`). Kapso no lo implementa y responde 404.
- `verifyWebhook` valida `X-Hub-Signature-256` con `META_APP_SECRET` y falla cerrado.
- `parseWebhook` reutiliza el parseo `eventosMeta`, movido de Kapso a `services/messaging/providers/_metaFormato.js`.
- Agrega tres tipos de evento:
  - `message.echo` para `smb_message_echoes`;
  - `message.history`, que entra marcado como historia, sin bot y sin cobro;
  - `template.status` para `message_template_status_update`.
- La línea se resuelve por `metadata.phone_number_id`. Si nadie la tiene, se descarta con registro.
- La idempotencia y el evento crudo usan `integration-core/idempotency` e `integrationRawEvents`, como hoy.

Campos que se suscriben: `messages`, `smb_message_echoes`, `history`, `smb_app_state_sync`, `account_update` y `message_template_status_update`.

### D6. Salida: la credencial de la línea decide la URL y la cabecera
`resolveLineCredentials` devuelve `{ authHeader: {Authorization: "Bearer …"}, baseUrl: "https://graph.facebook.com/{v}", phoneNumberId, billing: "meta_directo" }`.
- `kapsoService` deja de armar a mano `X-API-Key` y la ruta `/meta/whatsapp/v24.0`: los toma de lo que resuelve cada provider. Kapso devuelve los suyos, así que su comportamiento no cambia (lo cubren las pruebas golden de D-437).
- La descarga de medios usa la misma credencial (`GET /{mediaId}` y después la URL con la misma cabecera).
- **Alternativa descartada:** un `metaWhatsappService` paralelo a `kapsoService`. Duplicaría la ventana, el no-contactar y el registro, que es justo lo que D-437 unificó.

### D7. Cobro: lo decide la línea
En `whatsappOutboundService`, `costoCOP = 0` y no se valida saldo cuando `credenciales.billing === "meta_directo"`. Igual se registra el uso, con `billingMode: "meta_directo"`, para tener historial y métricas. Kapso y el número compartido siguen igual.
- **Modifica D-437:** allá Katuq le pagaba a Meta; ahora eso aplica solo a las líneas de Kapso.

### D8. Configuración e interruptores (D-505)
- **Global en `config/meta_whatsapp`:**
  - `conexionDirecta`, el interruptor (por defecto apagado);
  - `configIdWhatsapp`, el `config_id` del inicio de sesión de WhatsApp;
  - `graphVersion`;
  - `versionRegistro`, que es 4 o superior.
- **Por comercio:** `companies.featureFlags.whatsappMetaDirecto`.
- **En el `.env`, solo secretos que ya existen:** `META_APP_ID`, `META_APP_SECRET` y `META_WEBHOOK_VERIFY_TOKEN`.
- El `config_id` no es secreto: llega al front en la respuesta de `connect`, no en `environment.ts`.

### D9. Plantillas
`createTemplate(line, plantilla)` hace `POST /{wabaId}/message_templates`, y `listTemplates` hace `GET` de lo mismo. Los dos están en el contrato del provider, así que Kapso implementa el suyo con lo que ya tiene. La pantalla de plantillas existente (`plantillasMeta`, `whatsappTemplateBuilder`) deja de suponer Kapso y llama al manager con la línea escogida. El estado se actualiza con el evento `template.status`.

### D10. Pantalla: los dos modos
En `integrations/messaging-lines`, «Conectar número» abre un paso previo con dos tarjetas:
- **«Usar el número de mi celular».** Avisa que el celular debe tener WhatsApp Business actualizado y estar a mano, y que se desvinculan WhatsApp Web y las computadoras. También que en la app dejan de funcionar las listas de difusión y algunas funciones de catálogo.
- **«Un número nuevo para Katuq».** Avisa que el número no puede estar en ninguna app de WhatsApp.

Se usan las bases `cfg-*` (D-400), el acento `#5F3FE0` y sin gradientes. Si la bandera está apagada, la pantalla queda como hoy.

## Risks / Trade-offs

- **[El cobro cambia para el comercio]:** el comercio tiene que poner su tarjeta en Meta, lo que es fricción nueva. → Mitigación: el paso aparece dentro de la ventana de Meta y la línea muestra «Falta el medio de pago en Meta» si Meta lo reporta (`account_update`). Kapso sigue disponible para quien prefiera el saldo prepago.
- **[Plazo de 24 h del modo celular]:** si se vence, el comercio tiene que repetir la conexión. → Mitigación: la sincronización corre apenas se confirma, más el cron de reintento y un aviso.
- **[Colombia en el modo celular]:** la documentación no publica la lista de países. → Mitigación: probarlo primero con el número de Julsmind (tarea 1.4). Si no está disponible, la tarjeta del celular se oculta por el interruptor global y queda solo el número nuevo.
- **[Romper Kapso al generalizar `kapsoService`]:** → Mitigación: las 126 pruebas golden del número compartido y las de líneas tienen que pasar sin cambios antes de seguir.
- **[Rechazo de la revisión otra vez]:** → Mitigación: guion por permiso con las tres tomas que pidió el revisor, ensayo completo antes de grabar y lista de verificación (tareas 7.x).
- **[Llave de la empresa sin vencimiento]:** si se filtra, da acceso a la cuenta de WhatsApp del comercio. → Mitigación: cifrado, nunca en logs ni en respuestas, y se borra al desconectar.

## Migration Plan

1. Configurar Meta con el número de Julsmind. No necesita revisión, porque la cuenta es del mismo negocio.
2. Desplegar en este orden:
   - índices: ninguno nuevo, porque `messaging_lines` ya está indexada por `company`;
   - el backend con el interruptor global apagado;
   - el front;
   - por último el documento `config/meta_whatsapp`.
3. Piloto: Julsmind y FLORECER con la bandera encendida, probando los dos modos.
4. Grabar los cuatro videos y enviar la solicitud.
5. Con la aprobación, encender la bandera comercio por comercio.

**Para volver atrás:** apagar `conexionDirecta`. Las líneas directas dejan de ofrecerse y las existentes se pueden desconectar. Kapso nunca se apagó.

## Open Questions

- ¿Está habilitado en Colombia el modo celular? Se resuelve en la prueba 1.4.
- ¿Versión 4 o 5 del registro insertado? En la 5 el modo celular viene por defecto. Se decide al configurar Meta (tarea 1.2) y queda en `config/meta_whatsapp.versionRegistro`.
