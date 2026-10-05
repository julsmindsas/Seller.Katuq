## Why

La pantalla **Flujos automatizados** (`/flows`) es la que decide si un comercio conecta su tienda solo o necesita a alguien de Katuq al lado. Hoy necesita a alguien al lado. El relevamiento del 2026-10-03 (código + Firestore real) deja tres problemas:

1. **Está escrita para ingenieros.** 140 textos visibles con *flow, run, trigger, nodo, cron expression, webhook, payload, `{{ $json }}`, rollback, edges*. Los estados salen en inglés tal cual (`success`, `failed`, `partial`). 96 de 136 parámetros de los pasos se muestran con su nombre interno (`nodeSlug`, `matchBy`). El historial muestra IDs de 36 caracteres, milisegundos y JSON crudo. La lista dice "No tenés flows todavía" en voseo.
2. **El camino que sí funciona no está protegido ni se puede configurar desde la pantalla.** Verificado en producción: los pedidos de Shopify de OH MY STORE entran porque Shopify le pega **directo** a `POST /v1/flows/triggers/webhook/<flowId>/<nodeId>` (3 corridas el 2-oct, todas bien, `triggeredBy: webhook`). La cola `shopify_webhook_events` y las Cloud Functions que la consumirían están **vacías/muertas** (ver memoria `backend-ec2-no-cloud-functions`). Ese endpoint, el que crea pedidos reales:
   - **no verifica ninguna firma**: el trigger de OMS no tiene `webhookSecret` y, aunque lo tuviera, el handler espera un header propio (`x-katuq-signature`) que Shopify nunca manda. Cualquiera que conozca la URL puede inyectar un pedido en Katuq y empujarlo a Cereza.
   - **no deduplica**: Shopify reintenta hasta 19 veces en 48 h si no recibe 200 a tiempo; cada reintento sería otro run.
   - **responde 200 aunque el run falle**, así que el proveedor nunca reintenta y el pedido se pierde en silencio (riesgo abierto desde D-068).
   - **la URL que muestra la pantalla está mal**: arma `https://<app>/api/webhooks/flow/<id>` (`flow-editor.component.ts:217`). El webhook de OMS se registró a mano en el admin de Shopify con la URL correcta; la pantalla nunca sirvió para eso.
3. **Los conectores mienten.** `POST /v1/integration/config/test` responde "Configuración recibida correctamente" para **todo** proveedor salvo SIIGO, World Office, Fullpi y Alegra (`integrationConfigController.js:436-439`). Shopify, WooCommerce y Cereza sí tienen pruebas reales, pero en otros endpoints que la pantalla de plantillas no usa. Además el catálogo de pasos que llega al front **no trae `credentials`** (0 coincidencias en `flows.fallback-catalog.ts`), así que el chequeo "integraciones necesarias" del asistente de plantillas siempre dice "no requiere integraciones". Y los pasos de World Office y Aliaddo declaran `worldoffice`/`aliaddo` mientras el conector se llama `world_office`/`aliaddo_fulfillment`.

Lo que sí funciona y **no se toca**: el motor de flows, los 9 flows activos (8 de OMS, 1 de Café Escobar), los dos flows mixtos hacia Shopify (D-134), el despachador de cron/polling, y el registro manual del webhook en Shopify.

## What Changes

**A. Blindar el camino de webhooks sin cambiarle la forma** (backend, todo aditivo y detrás de flags por empresa):
- Verificar la firma **del proveedor** en el endpoint del flow: `X-Shopify-Hmac-Sha256` o `X-WC-Webhook-Signature` sobre el `rawBody`, con el `webhookSecret` ya guardado en la integración de la empresa (OMS lo tiene). Primero en **modo sombra** (registra coincidencia/no coincidencia en `integration_audit`, no rechaza); se exige solo cuando la sombra muestre 0 falsos negativos durante 7 días.
- Deduplicar por id de entrega del proveedor (`X-Shopify-Webhook-Id`, `X-WC-Webhook-Delivery-ID`) reutilizando `shopify_webhook_dedup` y `wc_webhook_dedup`, que ya existen.
- Responder error HTTP cuando el run termina `failed` **solo** con la dedup encendida y por flag por flow, para que el proveedor reintente sin duplicar.
- Corregir la firma genérica (`x-katuq-signature`): `rawBody` + comparación en tiempo constante. Hoy ningún flow en producción la usa (verificado), así que no rompe a nadie.
- Un endpoint de **salud por flow** (en el router existente de flows): último aviso recibido, último barrido, última corrida, resultado y si la firma se está verificando. Es lo que la pantalla necesita para decir "hace 12 minutos, bien" sin ir a Firestore.

**B. Conectores honestos:**
- `config/test` delega a la prueba **real** donde existe (Shopify `verify`, WooCommerce `test-connection`, Cereza `status`) y responde "no se puede verificar automáticamente" donde no existe, en vez de "recibida correctamente".
- El generador del catálogo emite `credentials` y se corrigen los nombres (`world_office`, `aliaddo_fulfillment`). Se regenera el catálogo del front (hoy desfasado desde el 7-jul).
- Todos los parámetros de los pasos reciben `title` y `description` en español en su spec del backend (es de donde sale el catálogo).

**C. La pantalla, para gente que vende, no para gente que programa:**
- Se llama **Automatizaciones**. Un glosario único (front Angular y canvas React leen el mismo mapa) reemplaza la jerga: automatización, paso, "cuándo arranca", "cada cuánto", "cuando la tienda avisa", "probar ahora", encender/apagar, ejecución; estados en español en todos lados.
- **Lista como tablero**: qué hace (de dónde a dónde, con logos), última vez que corrió en lenguaje relativo, semáforo (bien / con pendientes / falló / sin señales hace X / apagada), interruptor y "ver historial". Sin versión, sin conteo de nodos, sin IDs.
- **"Cuándo arranca"** con tres modos: *cuando pase algo en la tienda* (instrucciones paso a paso por proveedor con la **URL correcta**, botón copiar y "último aviso recibido hace X"), *cada cierto tiempo* (cada 5/15/30 min, cada hora) y *todos los días a las…*. El cron crudo queda bajo "Avanzado".
- **Plantillas por objetivo** ("Recibir los pedidos de mi Shopify", "Mandar mis productos a Shopify", "Recibir pedidos de WooCommerce"…) con asistente de 3 pasos: conectar (prueba real), cuándo arranca, encender. Al guardar un conector que tiene plantillas, se ofrece encenderlas.
- **Historial** humano: "hoy 15:09 · bien · 1 pedido", motivo del fallo en una frase, pasos por su nombre; JSON, stack y IDs bajo "Detalles técnicos" plegado. Botón "Reintentar" (el método ya existe, no está cableado).
- El editor visual completo se conserva como **Modo avanzado**.
- Tema canónico (acento `#5F3FE0`, plano, sin `border-left`, sin `#2563eb`) en los 6 SCSS y en el CSS del canvas.
- Script único `npm run build:flow-canvas` en el raíz que compila, aplica el parche del vendor y copia a `assets/` (hoy son 4 pasos a mano).

### No-goals

- **No se cambia el motor** (`flowExecutor`, cortocircuito de triggers, reintentos por nodo) ni ningún flow activo. OMS y Café Escobar siguen corriendo igual durante y después del cambio.
- **No se migra el camino Shopify → flows a colas ni a Cloud Functions.** El camino directo funciona; se blinda.
- **No se automatiza el registro del webhook en Shopify/WooCommerce.** Sigue siendo manual, pero con instrucciones correctas en pantalla. Automatizarlo requiere decidir alcance de la app de Shopify y va aparte.
- **No multi-cuenta** (`credentialRef`, dos tiendas Shopify por empresa). Propuesta aparte.
- **No se toca el webhook entrante de Cereza** (`/v1/osmosis/webhook`, compara token en texto plano, sin HMAC). Se anota como riesgo y va en su propia propuesta.
- **No se crean colecciones ni endpoints "v2".** La salud por flow se monta en el router de flows existente; la dedup reutiliza las colecciones existentes.
- No se agregan alertas (correo/WhatsApp). Eso lo cubre `monitor-trabajos-programados`.
- No se rediseñan el comparador de versiones ni el asistente IA: ninguna ruta de la app llega a ellos hoy; quedan como están.

### Write-set declarado

Esta propuesta **no escribe** `products`, catálogo, precios, listas de precios, `inventory`, `inventoryMovement` ni `InventoryLevel`. Lo que escribe:

| Permitido | Prohibido |
| --- | --- |
| `integration_audit` (resultado de la firma en sombra) | `products`, variantes, precios, Price Lists |
| `shopify_webhook_dedup`, `wc_webhook_dedup` (ya existen) | `inventory`, `inventoryMovement`, `InventoryLevel` |
| `flows.triggers[].config` y `flows.graph` del flow que el **usuario** edita | `orders` fuera de lo que el run ya hacía |
| `flow_trigger_bindings` (igual que hoy al activar) | flows de otra empresa; los dos flows mixtos de OMS |

## Capabilities

### New Capabilities
- `webhook-flow-verificado`: firma del proveedor, dedup por entrega y respuesta honesta en el endpoint de webhook de flows, con sombra y flag.
- `salud-por-automatizacion`: consulta única por flow con último aviso, último barrido, última corrida y estado de la firma.
- `automatizaciones-ux`: glosario, tablero, "cuándo arranca", plantillas por objetivo, historial humano, tema canónico.

### Modified Capabilities
- `integraciones-prueba-conexion`: `config/test` deja de responder éxito falso.
- `catalogo-de-pasos`: emite `credentials`, títulos y descripciones; nombres de proveedor alineados con el conector.

## Riesgos

- **El endpoint crea pedidos (módulo sensible `orders`).** Todo cambio ahí va un cambio a la vez, con diff, en sombra y con flag. Orden obligatorio: dedup → firma sombra → firma exigida → error-en-fallo. Nunca al revés: responder error sin dedup produce pedidos duplicados en el reintento.
- **El secreto guardado puede no ser el que firma.** Un webhook creado en el admin de Shopify firma con el secreto de la tienda, no con el de la app. Por eso la sombra: si la tasa de "no coincide" es 100 %, el secreto está mal y **no se exige** hasta corregirlo en la integración.
- **Shopify corta a los 5 s.** El run corre sincrónico dentro del request. Hoy tarda 1-3 s. Si la dedup o la firma suman latencia, se mide p95 antes y después; si supera 4 s se detiene el rollout.
- **Renombrar es global.** El cambio de vocabulario llega a todas las empresas a la vez. Es texto, no comportamiento; se revisa con una lista de pantalla por pantalla antes de desplegar.
- **El canvas se compila a mano.** Sin el script del punto C, cualquier cambio en el canvas vuelve a arriesgar el drift que ya pasó en mayo.

## Decisión a registrar

**D-350 (2026-10-03, propuesta — pendiente de aprobación del usuario):** `/flows` pasa a *Automatizaciones* para comercios no técnicos; el webhook directo proveedor → flow se declara **el camino canónico** (las Cloud Functions y la cola de Shopify son código muerto y no se reviven) y se blinda con firma del proveedor, dedup y respuesta honesta, en sombra y por flag; los conectores dejan de responder éxito falso. Sin cambios al motor ni a los flows activos.
