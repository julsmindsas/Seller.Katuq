## 1. Contratos y fixtures (antes del código, Art. VIII)

- [x] 1.1 Fixtures de Kapso en `tests/messaging/fixtures/`, sin teléfonos reales: listado de `phone_numbers` por customer, respuesta de `setup_links`, creación de webhook por número, mensaje entrante y eco de coexistencia en los formatos `meta` y `kapso` v2. Lo que no se pueda capturar se marca como pendiente para 6.3.
- [x] 1.2 Prueba de contrato del manager: carga los providers por descubrimiento; un provider que no implementa el contrato lanza error; sin `if` por proveedor.
- [x] 1.3 Prueba de contrato de `kapsoService`: sin `lineId`, cada método sale con las mismas credenciales y el mismo número que antes (`ownCredentials` y luego el compartido); con `lineId` de otro comercio o desconectada, rechaza.
- [x] 1.4 Prueba de contrato del webhook de mensajería: firma mala o secreto ausente responden 401 sin escribir nada; un reintento del mismo mensaje no duplica; el evento crudo queda antes de procesar; un número registrado se atribuye solo a su comercio.
- [x] 1.5 Prueba de contrato del dueño: dos respuestas simultáneas a un chat sin dueño hacen que salga una y la otra reciba 409 con el nombre; quien no es dueño (incluida la familia Administrador) recibe 409; solo la familia Administrador asigna.
- [x] 1.6 Prueba de contrato del alcance: un vendedor no lista ni abre por enlace chats de líneas ajenas (403); la familia Administrador ve todo; sin `lineId` todo sigue como antes.

## 2. Backend: dominio de mensajería

- [x] 2.1 `services/messaging/providers/_baseMessagingProvider.js` y `messagingManager.js` (molde `accountingManager`), con `resolveSendLine` y `messaging/identity.js`.
- [x] 2.2 `services/integrations/kapso/kapsoPlatformClient.js`: customers, setup_links, phone_numbers y webhooks por número, con la llave de plataforma. Las llaves solo van en encabezados y nunca al log.
- [x] 2.3 `providers/kapsoWhatsappProvider.js`, delgado: conexión y confirmación (con verificación contra Kapso), webhooks, `verifyWebhook` y `parseWebhook` en los dos formatos, envíos delegados en `kapsoService` y plantillas base.
- [x] 2.4 `kapsoService`: los seis bloques de credenciales pasan a `messagingManager.resolveSendLine({company, lineId})`, y se agrega `lineId` opcional a sus firmas.
- [x] 2.5 `lines/linesService.js`: registro con `create()`, edición (vendedores, nombre y bot, con un solo bot por comercio) y desconexión; `messagingAccess.js`.
- [x] 2.6 `threads/threadOwnership.js`: `tomar`, `soltar`, `asignar`, `reclamarParaResponder` y `asegurarChat` por transacción, con `log` de 20 entradas.
- [x] 2.7 `inbound/inboundProcessor.js`: entrante → `whatsapp_inbound` con `lineId` → asegurar chat → bot si aplica; eco → `whatsapp_usage` sin cobro.
- [x] 2.8 Webhook `POST /v1/messaging/webhook/:provider`: verificar, reservar (`integration-core/idempotency`), guardar el crudo en `integrationRawEvents`, responder 200 y procesar; barrido de reintentos en `cronService`.
- [x] 2.9 `routers/messaging.js` + `controllers/messaging.js` (D7), montados en `index.js`, con `auth`, `requireJwtTenant`, `requireFeature('whatsappMultiNumero')` y `requireRole` para escribir.
- [x] 2.10 Bandera `whatsappMultiNumero` en `FEATURE_FLAG_NAMES`, con dueño y retiro.
- [x] 2.11 Buzón de WhatsApp con `?lineId=`: `getThreads`, `getMessages`, `reply`, `viewed`, `profile`, `orders` y rutas del bot con alcance; agrupación por `(lineId, contacto)`; `line` y `owner` en la lista; corrección de `statusFilter` y `page`. `enviarTexto` con `lineId`, ventana por línea y `sentBy`.
- [x] 2.12 Bot: en líneas registradas, `porNumeroPropio` sale de `botEnabled`; un chat con dueño no lo atiende el bot.
- [x] 2.13 Índices nuevos en un archivo con solo los nuevos, sin `--force`.
- [x] 2.14 Toda la sección 1 y la suite `tests/notifications` completa, en verde.

## 3. Front

- [x] 3.1 `BaseService.patch`; `shared/utils/roles.ts` (familia Administrador) con `NavService` y `PricingModeService` delegando en ella.
- [x] 3.2 Bandera `whatsappMultiNumero` en `COMPANY_FEATURE_FLAGS`.
- [x] 3.3 `connector-registry.ts` y la ruta genérica `/integrations/:provider/retorno` con `IntegrationConnectReturnComponent` (antes de `**`).
- [x] 3.4 `MessagingLinesService extends BaseService` y el componente `messaging-lines/` en la tarjeta de WhatsApp: lista, conectar (ventana y aviso de regreso), confirmar, vendedores con `selector-equipo`, bot y desconectar.
- [x] 3.5 `shared/components/selector-equipo`.
- [x] 3.6 `WhatsappInboxService`: todo pasa por `BaseService` (sin `fetch` ni `HttpClient` directos en el servicio ni en los componentes del buzón), `lineId` en las rutas del chat, sin datos de demostración ni `console.log`.
- [x] 3.7 `inbox-core/` con `chat-dueno` y `chip-linea`; el buzón de WhatsApp los usa, agrega el filtro por línea y el modo lectura con su motivo.
- [ ] 3.8 (build OK, sin aumento de gradientes; FALTA revisión en navegador 1440/390 con datos reales, va con 6.3) `npm run build` de producción sin errores; el conteo de gradientes y primarios prohibidos no sube; revisión a 1440 y 390 px.

## 4. Despliegue con la bandera apagada

- [x] 4.1 Backend: `ff-only`, HEAD verificado y `pm2 restart katuq-api`. Comprobar que el buzón de ALMARA responde como antes, que `GET /v1/messaging/lines` da 403 de función apagada y que el webhook nuevo responde 401 sin firma.
- [x] 4.2 Front: `git pull`, versión mayor que la viva, `verify-dist-prod` y publicar.

## 5. Kapso (Daniel)

- [ ] 5.1 Plan Platform si se van a superar 3 números, y confirmar que el proyecto admite `meta_billing_mode: partner_managed`.
- [ ] 5.2 Poner `MESSAGING_KAPSO_WEBHOOK_SECRET` en el `.env` de producción (lo genera Daniel o se deja el comando).

## 6. Piloto y encendido

- [ ] 6.1 Encender `whatsappMultiNumero` en Julsmind.
- [ ] 6.2 Daniel conecta dos números de prueba (el inicio de sesión en Meta lo hace él).
- [ ] 6.3 Prueba completa con capturas: un cliente que escribe a los dos números (dos chats); una línea con dos vendedores y carrera entre ellos; pasar y soltar; eco desde el celular sin cobro; saldo descontado por envío; plantilla fuera de la ventana; 403 por enlace directo. Completar los fixtures pendientes de 1.1.
- [ ] 6.4 Encender en el primer comercio que indique Daniel.
- [ ] 6.5 Cierre en `specs/CONTRACT.md`; retiro de la bandera 30 días después de tenerla encendida para todos.
