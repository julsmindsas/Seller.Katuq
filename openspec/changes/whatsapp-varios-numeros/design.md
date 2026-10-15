## Context

Lo que hay hoy en el código, medido el 2026-10-15:

- **Un número por comercio.** La configuración vive en
  `integration_configs/{company}_kapso`. El número propio es un solo objeto
  (`ownCredentials`) y `whatsappCompanyConfig.resolveCredentials(company)` devuelve una
  sola pareja `{apiKey, phoneNumberId}`; si no hay, usa el número compartido de Katuq
  (`KAPSO_API_KEY` y `KAPSO_PHONE_NUMBER_ID`). Ningún comercio tiene número propio:
  ALMARA y los demás usan el compartido, y el bot piloto de ALMARA entra por variables
  de entorno.
- **Entrada.** El webhook (`controllers/whatsappWebhook.js`) llega en formato Meta
  (`kind: "meta"`) y se verifica con `KAPSO_WEBHOOK_SECRET`. `persistInbound` decide la
  empresa por número propio (D-116), por reparto a quien le escribió hace poco (D-094) o
  por piloto. `whatsapp_inbound` ya guarda `metadata.phoneNumberId`, pero nadie lo lee.
- **Chats.** No hay colección de chats. `getThreads` agrupa en memoria `whatsapp_inbound`
  y `whatsapp_usage` de 90 días por teléfono canónico. `phoneHash` es
  `sha256(phone|company)`: no incluye el número.
- **Salida.** `whatsappOutboundService.enviarTexto` siempre envía por el número de
  `resolveCredentials`. La ventana de 24 horas se mide por `(company, phone)`. El envío
  descuenta $80 del saldo.
- **Tomar un chat.** Solo existe `tomadaPor` en la sesión del bot, que caduca a los 7
  días y no bloquea a nadie.
- **Buzón del front.** La lista y la respuesta usan `fetch` con encabezados armados a
  mano. Algunos llamados responden 401 en producción (`bot/sesiones`, `viewed`); se
  arreglan en este cambio porque se tocan.
- **Kapso.** Ofrece un customer por comercio, enlaces de conexión (`setup_links`), un
  webhook **por número**, coexistencia con el celular y API de asignación de
  conversaciones. Pero esa API asigna a usuarios de Kapso, no de Katuq.

## Goals / Non-Goals

**Goals:**
- Tratar cada número conectado como entidad propia con dueño único: entrada, salida,
  ventana y chats separados por número.
- Que el dueño del chat y la visibilidad se decidan en el servidor.
- Dejar intacto todo lo que hoy corre sobre el número compartido.

**Non-Goals:**
- Reemplazar el modelo del número compartido o `ownCredentials`.
- Cambiar la llave de sesión del bot.
- Usar el inbox o las asignaciones de Kapso.

## Decisions

### D1. Registro global de números: `whatsapp_phone_numbers/{phoneNumberId}`

Colección nueva, con un documento por número y el `phoneNumberId` como id del documento.

- **Campos:** `company`, `displayPhoneNumber`, `verifiedName`, `label`, `wabaId`,
  `kapsoCustomerId`, `connectionType` (`coexistence` | `dedicated`), `status`
  (`connected` | `disconnected`), `sellers[]` (emails), `botEnabled`, `connectedAt`,
  `connectedBy`, `updatedAt`.
- **Por qué el id es el `phoneNumberId`:** la exclusividad sale gratis. El registro se
  hace con `create()`, que falla si el documento ya existe, así que un número no puede
  quedar en dos comercios. Al llegar un mensaje, la empresa se resuelve con una lectura
  directa por id, sin consulta.
- **Alternativas descartadas:**
  - Un arreglo en `integration_configs/{company}_kapso`: obliga a consultar todos los
    comercios para saber de quién es un número y no garantiza la exclusividad.
  - Una subcolección: necesita un índice de collection group.

### D2. Dueño de cada chat: `whatsapp_threads/{phoneNumberId}_{phoneHash}`

Colección nueva, solo para chats de números registrados en D1.

- **Campos:** `company`, `phoneNumberId`, `phoneHash`, `ownerEmail`, `ownerName`,
  `ownerSince`, y `assignmentLog[]` (las últimas 20 entradas con `{accion, por, a, en}`).
- El `phoneHash` ya incluye el comercio y el `phoneNumberId` es de un solo comercio, así
  que el id no choca entre comercios.
- **Los mensajes no se copian.** Siguen en `whatsapp_inbound` y `whatsapp_usage`; esta
  colección guarda solo el dueño.
- **Alternativas descartadas:**
  - Reutilizar la sesión del bot: caduca a los 7 días y es de otro dominio.
  - Las asignaciones de Kapso: piden usuarios de Kapso.

### D3. Un solo dueño, por transacción

`tomar`, `responder` (cuando el chat no tiene dueño), `soltar` y `pasar` son
transacciones de Firestore sobre el documento del chat.

- Responder a un chat sin dueño lo toma dentro de la misma transacción, antes de
  enviar. El que llega segundo recibe 409 con el nombre del dueño.
- Si el número tiene un solo vendedor, el chat se crea a su nombre al llegar el primer
  mensaje del cliente.
- El chequeo de dueño está en el servidor, en la ruta de respuesta; el front solo lo
  refleja.

### D4. El número viaja en el chat

El chat se identifica en la API con `phoneHash` más el parámetro `numero` (el
`phoneNumberId`).

- Sin `numero`, la API se comporta como hoy: número compartido, sin dueño y con la
  visibilidad actual. Esto evita duplicar rutas y conserva los enlaces existentes.
- **Agrupación en `getThreads`:** en lugar de agrupar solo por teléfono canónico, agrupa
  por `(número, teléfono canónico)`. El número sale de:
  - `metadata.phoneNumberId` en los mensajes que entran;
  - el campo nuevo `phoneNumberId` en `whatsapp_usage` para los que salen.
  - Los documentos viejos, sin número, se tratan como del número compartido.

### D5. Entrada: la empresa sale primero del registro D1

En `persistInbound`, se busca primero `whatsapp_phone_numbers/{metadata.phone_number_id}`.

- **Si existe y está `connected`:** la empresa es la del documento, sin reparto y sin
  inferencia. Si el número tiene un solo vendedor, se crea el chat a su nombre (D3).
- **Si no existe:** el camino actual (D-116, D-094, piloto) sigue igual.
- **Webhooks:** cada número nuevo recibe su webhook en Kapso al confirmarse
  (`POST /platform/v1/whatsapp/phone_numbers/{id}/webhooks`):
  - misma URL y mismo formato (`kind: "meta"`) que el actual;
  - el `secret_key` es el mismo `KAPSO_WEBHOOK_SECRET`. Lo genera Katuq, así que no hace
    falta buscar la clave de cada número antes de verificar la firma.
- **Idempotencia:** es la de hoy, por id de mensaje.

### D6. Mensajes desde el celular (coexistencia)

Los ecos de los mensajes que salen de la app del celular se guardan como salientes:

- en `whatsapp_usage`, con `origin: "business_app"`, `phoneNumberId` y `costoCOP: 0`;
- **sin descontar saldo.**

El formato del eco en `kind: "meta"` (campo `smb_message_echoes`) se confirma con un
número real antes de cerrar la tarea (Art. VIII). Si no llega en ese formato, se usa un
segundo webhook `kind: "kapso"` solo para `whatsapp.message.sent` con
`origin = business_app`.

### D7. Salida por el número del chat

`resolveCredentials(company, phoneNumberId)`:

- **Con número:** se exige que el documento D1 sea del comercio y esté `connected`. Se
  usa la llave de la plataforma (`KAPSO_API_KEY`), porque el número vive en el proyecto
  Kapso de Katuq.
- **Sin número:** el comportamiento actual.

En `enviarTexto`:

- recibe `phoneNumberId`;
- mide la ventana con los mensajes del cliente a ese número;
- guarda en `whatsapp_usage` el `phoneNumberId` y `sentBy` (el email);
- descuenta como hoy.

**Plantillas:** se leen del WABA del número. Al conectar se registra una plantilla
UTILITY de retomar conversación en ese WABA, con el mismo mecanismo de
`scripts/kapso-registrar-plantillas.js`.

### D8. Conexión del número

Endpoints, todos solo para la familia Administrador:

- `POST /v1/whatsapp/numbers/setup-link`:
  - crea el customer de Kapso del comercio la primera vez (`external_customer_id` igual
    al comercio) y lo guarda en `integration_configs/{company}_kapso.kapsoCustomerId`;
  - crea el enlace con `language: "es"`, `meta_billing_mode: "partner_managed"` (Katuq
    paga a Meta, decisión de Daniel), las conexiones `coexistence` y `dedicated`, y el
    regreso a `/integrations/whatsapp/numeros/retorno`.
- `POST /v1/whatsapp/numbers/confirm`:
  - consulta `GET /platform/v1/whatsapp/phone_numbers?customer_id=…&phone_number_id=…`;
  - solo si Kapso lo confirma, crea D1, el webhook (D5) y la plantilla (D7);
  - los datos del regreso del navegador nunca se usan directamente.
- `GET /v1/whatsapp/numbers`: la lista del comercio. Disponible para cualquier usuario
  del comercio, con `habilitado` según las banderas.
- `PATCH /v1/whatsapp/numbers/:id`: `label`, `sellers` y `botEnabled`. Solo un número
  por comercio puede tener `botEnabled`.
- `DELETE /v1/whatsapp/numbers/:id`: pasa el número a `disconnected` y desactiva su
  webhook. **No** lo borra de Kapso ni de Meta; eso queda manual.

### D9. Visibilidad y rutas del chat

**Quién ve qué:**
- La familia Administrador se determina con el mismo criterio de
  `middleware/requireRole.js`.
- Para los demás usuarios, los números visibles son los D1 del comercio con su email en
  `sellers`, más los chats D2 con `ownerEmail` igual al suyo.
- `getThreads` filtra después de agrupar.
- `getMessages`, `reply`, `viewed`, `profile`, `orders` y las rutas del bot validan el
  mismo alcance cuando llega `numero`, y responden 403 si no corresponde.

**Rutas nuevas:**
- `POST /v1/whatsapp/conversations/:phoneHash/tomar?numero=`
- `POST /v1/whatsapp/conversations/:phoneHash/soltar?numero=`
- `POST /v1/whatsapp/conversations/:phoneHash/asignar?numero=`, con body `{email}` y
  solo para la familia Administrador.

### D10. Bot

- Para los números D1, `porNumeroPropio` es `true` solo si `botEnabled`.
- El despachador agrega una compuerta: si el chat D2 tiene `ownerEmail`, el bot no
  responde.
- La llave de sesión sigue siendo `phoneHash`. Es seguro porque el bot está en un solo
  número por comercio.

### D11. Front

En la configuración (`whatsapp-kapso-config`):
- tarjeta "Números" (`cfg-card`) con la lista, el estado, el número y el nombre;
- el botón "Conectar número", que sale al enlace de Kapso en la misma pestaña;
- un selector múltiple de vendedores tomado de los usuarios del comercio, y los
  interruptores de bot y desconectar;
- una ruta de regreso que llama a `confirm` y vuelve a la lista con el resultado.

En el buzón:
- un chip con el número en cada chat, la línea "Atiende: …" y los botones Tomar, Soltar
  y Pasar (este solo para administradores);
- el redactor en solo lectura si el usuario no es el dueño;
- un filtro por número;
- `sendReply` y la lista pasan a `WhatsappInboxService` sobre `BaseService`, con
  interceptor y sin `fetch` directo.

Todo con el design-system: plano, acento #5F3FE0, sin clases con "p-" y con cada
`span` de un `*ngIf` con color y tamaño propios.

### D12. Banderas (Art. XII)

- Global: `WHATSAPP_MULTINUMBER_ENABLED`.
- Por comercio: `integration_configs/{company}_kapso.multiNumber.enabled`.
- Con cualquiera de las dos apagada, la pantalla y los endpoints D8 responden
  `habilitado: false`: no se conectan ni se editan números.
- La entrada sí consulta D1 siempre (ver riesgos): un número ya registrado nunca vuelve
  al reparto D-094.
- Se retiran 30 días después de abrirlo a todos los comercios.

## Risks / Trade-offs

- **[El número aparece con la bandera apagada y su mensaje cae al reparto D-094]** →
  En el webhook, D1 se consulta siempre, sin depender de la bandera: es solo una lectura
  por id, y si el número está registrado su empresa queda fija. La bandera solo apaga la
  pantalla y la conexión.
- **[Coexistencia menos estable: desconexiones y ecos que llegan tarde]** → Se muestra
  el estado del número, que se refresca contra Kapso al abrir la pantalla. El comercio
  elige `dedicated` si necesita estabilidad.
- **[Meta rechaza o reclasifica la plantilla de retomar conversación]** → El chat sigue
  funcionando dentro de la ventana de 24 horas. La pantalla avisa que el número aún no
  tiene plantilla aprobada.
- **[Costo: Katuq paga a Meta y Kapso cobra el 5% de facturación administrada]** → La
  tarifa D-044 ($80) cubre de sobra la tarifa de servicio de Meta. Se revisa con el
  primer mes de datos.
- **[Plan Kapso: el Pro admite 3 números]** → Antes de abrir a comercios hay que pasar
  al plan Platform. Es una tarea de Daniel en la consola de Kapso.
- **[Pocos permisos para el administrador en pleno trabajo]** → El administrador no
  escribe en un chat con dueño sin pasárselo primero, a propósito: es la regla de
  "no pisarse". Pasárselo es un clic.
- **[Escala del filtro en memoria de `getThreads`]** → Ya tiene una ventana de 90 días
  (D-117). Con varios números el volumen por comercio crece, pero en la misma colección
  y con los mismos índices. Se mide en el piloto.

## Migration Plan

1. Backend con las banderas apagadas: registro D1, entrada, salida y rutas. Las pruebas
   de contrato pasan con payloads reales de Kapso guardados como fixtures.
2. Índices nuevos: `whatsapp_phone_numbers (company)` y
   `whatsapp_threads (company, ownerEmail)`. Se crean con Firebase CLI y un archivo que
   contenga solo los nuevos.
3. Front con las banderas apagadas: se ve igual que antes.
4. Piloto en Julsmind con un número de prueba de Daniel. **Daniel hace el inicio de
   sesión en Meta.** Se prueba: conectar dos números, asignar, un cliente que escribe a
   los dos, la carrera entre dos vendedores, pasar un chat, el eco desde el celular, el
   descuento de saldo y el 403 por enlace directo.
5. Encender en el primer comercio que Daniel indique.
6. **Reversa:** apagar la bandera del comercio. Los números siguen registrados y sus
   mensajes siguen entrando a su comercio. Para soltarlos del todo, desconectarlos.

## Open Questions

- Si `X-Idempotency-Key` de Kapso se mantiene entre reintentos. No cambia el diseño,
  porque la idempotencia es por id de mensaje.
- Cuántos números caben por WABA. Lo limita Meta, no Katuq.
