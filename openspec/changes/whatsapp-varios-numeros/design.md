## Context

**Lo que hay hoy en el canal** (medido el 2026-10-15):

- **Un solo número por comercio.** El número propio vive en `ownCredentials` dentro de
  `integration_configs/{company}_kapso` y ningún comercio lo usa: todos salen por el número
  compartido de Katuq (`KAPSO_API_KEY` y `KAPSO_PHONE_NUMBER_ID` en el entorno). El bot
  piloto de ALMARA también corre sobre ese número compartido, habilitado por variables de
  entorno.
- **Credenciales resueltas seis veces.** `kapsoService` arma "credencial propia o global"
  en seis métodos distintos.
- **Webhook sin evento crudo ni cierre.** El webhook (`controllers/whatsappWebhook.js`) no
  guarda el evento crudo antes de procesarlo (Art. V) y, si falta el secreto, no verifica
  la firma.
- **La empresa se adivina.** Se deduce por número propio, por reparto (D-094) o por la
  regla del piloto.
- **Chats sin dueño.** Se arman en memoria a partir de `whatsapp_inbound` y
  `whatsapp_usage`, y su clave es `phoneHash = sha256(tel|company)`. Lo único parecido a
  "tomar" un chat es la sesión del bot: dura 7 días y no bloquea a nadie.
- **Canales en paralelo, sin abstracción común.** WhatsApp y Meta (Instagram y Messenger)
  repiten por separado la identidad, la configuración, los chats, el envío, la ventana de
  24 h y el webhook.
- **Buzón del front.** Usa `fetch` sin interceptor en unos diez sitios, y de ahí salen los
  401 que hay en producción.

**Moldes de Katuq que este cambio sigue:**

| Pieza | Molde | Dónde está |
|---|---|---|
| Strategy por proveedor | manager con descubrimiento de providers y provider delgado que delega en un cliente | `services/accounting/accountingManager.js`, `providers/_baseAccountingProvider.js`, `shippingProviders/fullpiProvider.js` → `services/integrations/fullpi/` |
| Webhook | firma, reserva atómica, evento crudo, 200 y proceso aparte, con reintento | `routers/woocommerce.js` + `webhookDedup` / `webhookQueue` / `webhookWorker` |
| Idempotencia | se reutiliza `services/integration-core/idempotency.js` (`integration_idempotency`, `create()` atómico) | — |
| Evento crudo | se reutiliza la colección `integrationRawEvents` | ya la usa Wompi |
| Bandera por comercio | `companies.featureFlags` + `requireFeature` (catálogo cerrado, dueño y retiro, Art. XII) | `services/companyFeatureFlags.js` |
| Equipo y alcance | `listarComerciales`, `esRolComercial` y la familia Administrador | `services/crm/crmAcceso.js`, `middleware/requireRole.js` |
| Dueño único | transacción con la semántica de `tomadaPor` y de "un agente, un rol" | `whatsappBotSessionService.mutarSesion`, `services/soporte/equipoTicket.js` |
| Módulo HTTP | router delgado, controller y servicio de dominio, montados en `index.js` | `routers/insights.js`, `routers/analyticsEnVivo.js` (`crearRouter(deps)` con prueba de contrato) |

## Goals / Non-Goals

**Goals:**

- Crear el **dominio Mensajería**: un manager de canales con Strategy, en el que Kapso
  WhatsApp es el primer provider. Meta (Instagram y Messenger) debe poder entrar después
  como provider **sin tocar el manager** (Art. VI).
- Hacer de la **línea** (número de WhatsApp, más adelante una cuenta de Instagram o una
  página) la unidad de dueño, de asignación a vendedores y de envío. Representar el número
  compartido de Katuq como una línea más, para que exista un solo camino que resuelva las
  credenciales.
- Que el dueño del chat y la visibilidad se resuelvan en el servidor, con transacción.
- Dejar intacto, sin regresiones, todo lo que corre hoy sobre el número compartido:
  notificaciones, buzón de ALMARA y bot piloto.

**Non-Goals:**

- Migrar Meta a provider de mensajería y unificar los buzones de WhatsApp y Meta. Es el
  siguiente cambio; este deja las piezas compartidas listas.
- Migrar `{company}_kapso` a `integrationConfigService` / `integration_secrets`. Es deuda
  registrada; las líneas nuevas no guardan secretos (ver D3).
- Cambiar la clave de la sesión del bot.

## Decisions

### D1. Dominio `services/messaging/`, con Strategy

```
services/messaging/
  messagingManager.js            # singleton; descubre providers/*Provider.js; resuelve {strategy, line}
  providers/_baseMessagingProvider.js
  providers/kapsoWhatsappProvider.js   # delgado: delega en services/integrations/kapso/*
  lines/linesService.js          # registro, asignación de vendedores, alcance
  threads/threadOwnership.js     # dueño único por transacción
  inbound/inboundProcessor.js    # evento normalizado → persistir → dueño → bot
  access/messagingAccess.js      # alcance del usuario (familia Administrador / vendedor)
services/integrations/kapso/
  kapsoPlatformClient.js         # API Platform: customers, setup_links, phone_numbers, webhooks
```

**Contrato del provider** (`_baseMessagingProvider`, cada método lanza error si el
provider no lo implementa):

- Conexión y webhooks: `providerName`, `channel`, `createConnectLink(company, opts)`,
  `confirmLine(company, params)`, `refreshLine(line)`, `registerLineWebhook(line)` y
  `disableLineWebhook(line)`.
- Webhook entrante: `verifyWebhook(rawBody, headers)` y `parseWebhook(payload)`. Este
  último devuelve eventos normalizados:
  `{type: 'message.inbound'|'message.echo'|'message.status', lineExternalId, contact:{id, name}, message:{id, type, text, timestamp}, raw}`.
- Envío: `sendText`, `sendTemplate`, `sendInteractive`, `sendImage` y `markRead`, todos
  con la forma `(line, payload)`.
- Plantillas: `listTemplates(line)` y `registerBaseTemplates(line)`.

**El manager** sigue a `accountingManager`: carga `providers/*Provider.js` con
`readdirSync`, aísla cada `require` y resuelve con `#strategies.get(line.provider)`, sin
`if/else` por proveedor.

**Por qué este molde:** es el más reciente y el más mantenido del código (DIAN entró así
en julio y Fullpi en agosto). **Alternativa descartada:** seguir creciendo
`kapsoService`, que ya tiene 1.000 líneas y seis resoluciones de credenciales copiadas.

### D2. `kapsoService` se queda como cliente de mensajes y deja de decidir credenciales

Los seis bloques "credencial propia o global" se cambian por una sola resolución:
`messagingManager.resolveSendLine({company, lineId})`.

- **Con `lineId`:** la línea registrada del comercio, que debe estar conectada.
- **Sin `lineId`:** la regla de hoy, en el mismo orden (`ownCredentials` y luego el número
  compartido).

`kapsoService` recibe la línea ya resuelta, y sus firmas públicas solo suman el parámetro
opcional `lineId`, así que quienes lo llaman no cambian. `kapsoWhatsappProvider` delega
los envíos en `kapsoService` y la parte Platform en `kapsoPlatformClient`. Es el mismo
reparto de `fullpiProvider`: el adaptador es delgado y la plomería vive en el cliente.

### D3. Línea: `messaging_lines/{provider}_{externalId}` (colección nueva, aprobada)

El id del documento es, por ejemplo, `kapso_1113367011867331`.

- **Campos:** `provider`, `channel` (`whatsapp`), `externalId` (el `phoneNumberId`),
  `company`, `displayName` (lo pone el comercio), `displayPhone`, `verifiedName`,
  `accountId` (WABA), `connectionType` (`coexistence` | `dedicated`), `status`
  (`connected` | `disconnected`), `sellers[]` (`{email, nombre}`), `botEnabled`,
  `connectedAt/By` y `updatedAt`.
- **El id del documento da la exclusividad.** El registro se hace con `create()`, y Kapso
  además confirma que el número pertenece al customer del comercio. Al llegar un mensaje,
  la empresa sale de leer un solo documento.
- **Por qué es channel-agnostic:** el mismo documento sirve mañana para una cuenta de
  Instagram (`meta_ig_<id>`).
- **Las líneas no guardan secretos.** Los números conectados por enlace viven en el
  proyecto Kapso de Katuq y se operan con la llave de la plataforma. El
  `kapsoCustomerId` del comercio se guarda en el documento que ya existe,
  `integration_configs/{company}_kapso`.
- **Alternativa descartada:** una subcolección bajo `integration_configs`. Exige un índice
  de collection group para el webhook y deja la línea atada a un proveedor.

### D4. Dueño del chat: `messaging_threads/{lineDocId}__{contactHash}` (colección nueva, aprobada)

- **Campos:** `company`, `lineId`, `channel`, `contactHash`, `owner {email, nombre, desde}`
  o `null`, y `log[]` con las 20 últimas entradas `{accion, por, a, en}`.
- **`contactHash` es el `phoneHash` actual de WhatsApp** (`sha256(tel|company)`), para no
  romper hashes ni enlaces existentes. En el dominio vive un helper de identidad
  (`messaging/identity.js`) que hoy envuelve `whatsappPhoneHash` y mañana `metaIdentityHash`.
- **No se copian mensajes.** Siguen en `whatsapp_inbound` y `whatsapp_usage`, que reciben
  el campo nuevo `lineId`.
- **Reglas en `threadOwnership`** (todas por `runTransaction`):
  - `tomar`: solo si el chat no tiene dueño y el usuario es vendedor de la línea o de la
    familia Administrador.
  - `soltar`: solo el dueño o la familia Administrador.
  - `asignar`: solo la familia Administrador, y el destino debe ser un usuario del
    comercio (`listarComerciales`).
  - `reclamarParaResponder`: toma el chat dentro de la misma transacción del envío si no
    tiene dueño. Si el dueño es otra persona, devuelve 409 con su nombre.
  - Al primer entrante de una línea con **un solo** vendedor, el chat se crea a su nombre.
- **Por qué con transacción:** soporte asigna con PUT y gana el último que escribe (está
  aceptado en su diseño), y aquí eso es justamente lo que hay que evitar.

### D5. Webhook nuevo de mensajería, con el molde de WooCommerce

Ruta `POST /v1/messaging/webhook/:provider`, con router y controller delgados:

1. `strategy.verifyWebhook(rawBody, headers)` **falla cerrado**: sin secreto o con firma
   mala responde 401.
2. Reserva por id de mensaje con `idempotency.checkAndReserve(sha256(provider:messageId))`
   (Art. IV).
3. Guarda el evento crudo en `integrationRawEvents` con
   `{proveedor:'KAPSO', tipo, datos, procesado:false, intentos:0}`. Los encabezados se
   filtran y se guardan sin la firma (Art. V).
4. Responde 200. Kapso exige respuesta en menos de 10 s.
5. `inboundProcessor` procesa en segundo plano y marca el evento `procesado` o `error`.
6. Un barrido en `cronService`, cada minuto, reintenta los pendientes de más de 60 s con
   un máximo de 5 intentos; después los marca `dead`.

**Qué hace `inboundProcessor`:**

- `message.inbound`: busca la línea, escribe en `whatsapp_inbound` con la forma de hoy más
  `lineId` (para que el buzón y el bot lo lean igual), asegura el chat (D4) y, si la línea
  tiene `botEnabled` y el chat no tiene dueño, despacha al bot existente.
- `message.echo` (coexistencia): lo escribe en `whatsapp_usage` como saliente con
  `origin:'business_app'`, `lineId` y `costoCOP:0`, sin descontar saldo.

**El webhook viejo (`/v1/whatsapp/webhook`) no cambia.** Sigue atendiendo el número
compartido. Las líneas nuevas registran su webhook en Kapso hacia la URL nueva, con un
secreto de mensajería propio de la plataforma (`MESSAGING_KAPSO_WEBHOOK_SECRET`).

### D6. Salida por la línea del chat

`whatsappOutboundService.enviarTexto` recibe `lineId`.

- **Dentro de la misma transacción:** con `reclamarParaResponder` (D4) decide quién es el
  dueño.
- **Ventana de 24 h:** se calcula con los entrantes de ese contacto en esa línea.
- **Envío:** sale por `kapsoService` con `lineId` (D2).
- **Registro:** `whatsapp_usage` guarda `lineId` y `sentBy`.
- **Cobro:** descuenta el saldo como hoy (D-044, decisión de Daniel: Katuq paga a Meta).
- **Plantillas:** se leen del WABA de la línea. Al conectarla, el provider registra la
  plantilla UTILITY "retomar conversación" (`registerBaseTemplates`).

### D7. Conexión de líneas

Endpoints en `routers/messaging.js` → `controllers/messaging.js`, con
`auth + requireJwtTenant + requireFeature('whatsappMultiNumero')`. Los que escriben exigen
además `requireRole(['Administrador'])` (familia Administrador).

| Ruta | Qué hace |
|---|---|
| `GET /v1/messaging/lines` | Líneas del comercio, más el equipo asignable (`listarComerciales`) y `puedeAdministrar` |
| `POST /v1/messaging/lines/connect` | `strategy.createConnectLink`. Crea el customer de Kapso la primera vez y el enlace con `language:'es'`, `meta_billing_mode:'partner_managed'`, conexiones `coexistence` y `dedicated`, y regreso a `/integrations/kapso/retorno` |
| `POST /v1/messaging/lines/confirm` | `strategy.confirmLine` **consulta a Kapso** (`phone_numbers?customer_id&phone_number_id`); no confía en el regreso del navegador. Luego hace `create()` de la línea, registra el webhook y la plantilla base |
| `PATCH /v1/messaging/lines/:lineId` | Cambia `displayName`, `sellers` y `botEnabled` (como máximo una línea con bot por comercio) |
| `DELETE /v1/messaging/lines/:lineId` | Pasa la línea a `disconnected` y apaga su webhook. No la borra de Kapso ni de Meta |
| `POST /v1/messaging/threads/:threadId/{tomar,soltar,asignar}` | Cambios de dueño del chat (D4) |

### D8. Alcance y buzón

`messagingAccess.alcance(req, tenant)` devuelve
`{esAdmin, email, lineasVisibles:Set, chatsPropios:Set}`. `esAdmin` usa la familia
Administrador de `requireRole`. Para los demás, las líneas visibles son las suyas en
`sellers`, más los chats D4 que tiene a su nombre.

Las rutas del buzón de WhatsApp que ya existen (`/v1/whatsapp/conversations*`) aceptan
`?lineId=`:

- **Con `lineId`:** se aplica el alcance (403 si no corresponde) y se agrupa por
  `(lineId, contacto)`.
- **Sin `lineId`:** el comportamiento de hoy, que es el número compartido.
- **En la lista:** cada chat trae `line {id, displayName, displayPhone}` y `owner`. Se
  corrige `status`/`statusFilter` y se respeta `page`.

### D9. Bandera

`whatsappMultiNumero` en `companyFeatureFlags.FEATURE_FLAG_NAMES` y en
`COMPANY_FEATURE_FLAGS` del front. Dueño: Daniel. Se retira 30 días después de tenerla
encendida para todos (Art. XII). Se prende con `scripts/set-company-feature.js`.

**La entrada de una línea registrada no depende de la bandera.** Si un número ya está
registrado, su empresa queda fija aunque la bandera esté apagada. La bandera solo cierra
la pantalla y las rutas de administración.

### D10. Front

- **Conectar y volver, genérico.** Una ruta `/integrations/:provider/retorno` con
  `IntegrationConnectReturnComponent`, que se saca del `MetaOauthReturnComponent`: avisa
  por `postMessage` (`{tipo:'integration_connect', provider, params}`) y se cierra.
  - Más un `connector-registry.ts` al estilo de `provider-registry.ts`, con la
    descripción de cómo se conecta cada provider.
  - Kapso lo usa desde ya. Meta conserva `meta/retorno`, que está registrada en Meta, y
    se pasa al registro cuando se toque.
- **Líneas.** Un componente `messaging-lines/` dentro de `IntegrationsModule`, montado en
  la tarjeta de WhatsApp con `cfg-card` y sobre `MessagingLinesService extends BaseService`.
  - Lleva la lista, "Conectar número", el selector de vendedores, el bot y el botón de
    desconectar.
  - Se ve solo con `CompanyFeaturesService.isEnabled('whatsappMultiNumero')`.
- **Equipo compartido.** `shared/components/selector-equipo` (`p-multiSelect` o
  `p-dropdown` con filtro) recibe el equipo del endpoint de líneas. El CRM lo adopta
  cuando se toque.
- **Rol.** `shared/utils/roles.ts` reúne en una sola utilidad las tres copias de
  `esRolAdministrador`, siguiendo `requireRole.js`. `NavService` y `PricingModeService`
  delegan en ella.
- **Buzón.** Componentes de presentación compartidos en
  `components/notificaciones/inbox-core/`, que no dependen del canal:
  - `chat-dueno`: "Atiende: …", Tomar, Soltar, Pasar y el motivo del modo lectura.
  - `chip-linea`.
  - WhatsApp los usa ya; Meta los adopta en el cambio de unificación.
- **Servicio del buzón.** `WhatsappInboxService` deja `fetch` y `HttpClient` directos, pasa
  todo por `BaseService` (que suma `patch`) y agrega `lineId` a las rutas del chat. Se
  quitan la caída a datos de demostración y los `console.log`.
- **Diseño.** `config-pagina`, pares semánticos, ninguna clase con "p-", y cada span de un
  `*ngIf` con color y tamaño propios.

## Risks / Trade-offs

- **Tocar `kapsoService` puede afectar las notificaciones y el bot del número
  compartido.** Mitigación: sin `lineId`, la resolución es la misma de hoy y en el mismo
  orden. Además, la suite completa `tests/notifications` y una prueba de contrato nueva
  ("sin lineId sale por el mismo número que antes") deben pasar antes de desplegar.
- **Dos webhooks conviven (el viejo y el de mensajería).** Mitigación: cada número tiene
  un solo webhook en Kapso. El compartido sigue en el viejo y las líneas nuevas usan el
  nuevo. El viejo se migra cuando el número compartido pase a ser una línea (cambio
  aparte).
- **El eco de coexistencia puede no llegar en el formato documentado.** Mitigación: hay
  fixture y prueba de contrato. Lo que no se pueda confirmar se valida con un número real
  en el piloto (tarea 6.3). El provider normaliza ambos formatos de Kapso (`kind: kapso`
  v2 con `origin`).
- **Meta puede rechazar la plantilla base.** Mitigación: dentro de la ventana el chat
  funciona igual, y la pantalla avisa si la línea no tiene plantilla.
- **Costos.** Katuq paga a Meta, Kapso cobra el 5 % de facturación administrada y hace
  falta el plan Platform para pasar de 3 números. Mitigación: la tarifa D-044 cubre el
  servicio, y se revisa con el primer mes de datos.
- **Al administrador le toma un paso más.** No escribe en un chat ajeno sin pasárselo a sí
  mismo. Es a propósito: es la regla de "no pisarse".

## Migration Plan

1. Backend con la bandera apagada en todos los comercios. Las pruebas de contrato pasan
   con fixtures de Kapso.
2. Índices nuevos en un archivo con solo los nuevos, sin `--force`:
   `messaging_lines (company)`, `messaging_threads (company, owner.email)`,
   `integrationRawEvents (proveedor, procesado, timestamp)`.
3. Front: con la bandera apagada se ve igual que antes.
4. Piloto en Julsmind. Daniel conecta dos números de prueba (el inicio de sesión en Meta lo
   hace él) y se corre la prueba completa.
5. Encender en el primer comercio que indique Daniel.
6. Reversa: apagar la bandera. Las líneas siguen registradas y sus mensajes siguen
   llegando a su comercio. Para soltarlas del todo, desconectarlas.

## Open Questions

- ¿El `X-Idempotency-Key` de Kapso se mantiene igual entre reintentos? No cambia el
  diseño, porque la reserva es por id de mensaje.
- Cuántos números caben por WABA lo define Meta, no Katuq.
