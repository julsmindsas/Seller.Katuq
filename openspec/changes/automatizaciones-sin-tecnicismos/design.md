# Diseño — Automatizaciones sin tecnicismos

## 1. El camino canónico de webhooks (y por qué no se cambia)

Verificado el 2026-10-03 contra producción:

```
Shopify (webhook creado a mano en el admin)
  └─ POST back.katuq.com/v1/flows/triggers/webhook/shopify-orders-to-cereza-7e6ab5a3/trigger
       └─ flowsController.webhookTrigger  →  flowEngine.startRun(flowId, [{json: body}])   (sincrónico)
            └─ mapper → product-resolver → katuq-order-upsert → osmosis-order-create
```

- `flow_runs` del 2-oct: 3 corridas `success`, `triggeredBy: webhook`. `shopify_webhook_events`, `integration_events`, `dispatch_jobs`: **0 documentos**. `listWebhooks('OH MY STORE')` por API: 0 (el webhook es de la tienda, no de la app).
- `flows.triggers[0]` = `{nodeId:'trigger', type:'webhook', config:{provider:'shopify', topic:'orders/create'}}`. **Sin `webhookSecret`.**
- Café Escobar (WooCommerce) entra por el mismo endpoint (`triggeredBy: webhook`, última el 22-sep).

Alternativas descartadas:
- *Revivir la cola + Cloud Functions*: el backend corre en EC2; habría que montar un consumidor in-process nuevo y cambiar la URL registrada en Shopify. Más piezas, cero ganancia para el comercio.
- *Responder 202 y correr después*: pierde la posibilidad de decirle al proveedor "falló, reintenta". Se descarta mientras p95 < 4 s.

## 2. Blindaje del endpoint, en capas y en orden

Todo vive en `controllers/flowsController.js` (`webhookTrigger`) con helpers nuevos en `services/flows/webhookGuards.js`. Orden de activación **obligatorio**; cada capa tiene flag independiente en `integration_configs/{company}_{provider}.config.flowWebhook.*`:

| Capa | Qué hace | Flag | Default |
| --- | --- | --- | --- |
| 1. Dedup | Lee `X-Shopify-Webhook-Id` / `X-WC-Webhook-Delivery-ID`; `create()` en `shopify_webhook_dedup` / `wc_webhook_dedup` (TTL 48 h / 24 h, ya existen). Si ya existe → **200 `{duplicate:true}`** sin correr. Sin header → se trata como nuevo (igual que hoy el middleware de Shopify). | `dedup` | `true` tras medir |
| 2. Firma del proveedor, sombra | Si `trigger.config.provider ∈ {shopify, woocommerce}` y la integración tiene `webhookSecret`: calcula HMAC-SHA256 base64 sobre `req.rawBody` (reutiliza `webhookSecurityService.validateHmac` y `woocommerce/helpers/auth.js`). Escribe `integration_audit {type:'flow_webhook_signature', match:boolean, provider, flowId}`. **No rechaza.** | `signatureShadow` | `true` |
| 3. Firma exigida | Igual que 2, pero 401 si no coincide. Solo se enciende por empresa cuando la sombra lleva 7 días con `match:true` en el 100 % de los avisos. | `signatureEnforce` | `false` |
| 4. Respuesta honesta | Si `runCtx.status === 'failed'` → **500 `{code:'FLOW_RUN_FAILED', runId}`** para que el proveedor reintente. `partial` sigue 200 (hubo escritura parcial; un reintento duplicaría). Requiere capa 1 encendida; el código lo verifica y si no, ignora el flag. | `failOnRunFailed` | `false` |

Firma genérica (`x-katuq-signature`, para "cuando otro sistema avise"): pasa a `rawBody` + `crypto.timingSafeEqual`. Hoy **ningún** flow en producción tiene `webhookSecret` en su trigger (verificado), así que no hay cliente que romper. El `rawBody` ya se captura en `index.js:243-248`.

`rawBody` en `/v1/flows/*`: confirmar que el `express.json({verify})` global cubre el router de flows antes de tocar nada (tarea 1.1).

## 3. Salud por automatización

`GET /v1/flows/:id/health` en `routers/flows.js` (detrás del `auth` existente), controller `flowRunsController.getHealth`. Solo lectura. Devuelve:

```
{
  mode: 'webhook' | 'polling' | 'cron' | 'manual',
  lastSignalAt,            // webhook: último run con triggeredBy=webhook; polling: flow_polling_state.lastPolledAt; cron: binding.lastTriggeredAt
  lastRun: { startedAt, status, statusReason, durationMs, itemCount },
  signature: { configured: boolean, shadowMatchRate7d: number|null, enforced: boolean },   // solo webhook
  expectedEveryMin: number|null,   // polling/cron
  silentForMin: number|null,       // ahora - lastSignalAt
  webhookUrl                       // la correcta, armada en el backend con la URL pública real
}
```

Fuentes: `flow_runs` (índice `flowId+startedAt` ya existe por `/runs`), `flow_polling_state/{company}_{flow}_{node}`, `flow_trigger_bindings`, `integration_audit` (sombra). Sin colecciones nuevas. El semáforo del tablero se calcula en el front con `silentForMin` vs `expectedEveryMin` (para webhook no hay "ausente": un día sin pedidos es normal; se muestra "último aviso hace X").

## 4. Conectores honestos

`controllers/integrationConfigController.js` `testConnection`: tabla de delegación por proveedor, sin tocar los handlers reales:

| Proveedor | Delegar a | Resultado |
| --- | --- | --- |
| shopify | `shopifyService.verify(companyId)` (hoy `GET /verify/:companyId`) | real |
| woocommerce | `woocommerceIntegration.testConnection(body)` | real |
| osmosis | `osmosisIntegrationController.status` | real |
| siigo, world_office, fullpi | como hoy | real |
| resto | `{success:false, verifiable:false, message:'Este proveedor no permite verificar la conexión automáticamente. Guarda y prueba con una operación real.'}` | honesto |

El front muestra tres estados: verificada / falló (con el mensaje del proveedor en lenguaje humano) / no verificable.

## 5. Catálogo de pasos

- `scripts/generate-node-catalog.js`: emitir `credentials`, `hidden` y los `title`/`description` de cada parámetro. Marcar `hidden:true` en `osmosis-stock-sweep` y `shopify-bulk-product-sync` (pasos de operación, no de comercio) y excluirlos del catálogo del editor salvo superadmin.
- Especificaciones: `credentials:'world_office'` y `'aliaddo_fulfillment'`; agregar `title`+`description` en español a los 96 parámetros que no lo tienen. `PROVIDER_ALIASES` del front queda como red, no como fuente.
- Regenerar `nodeCatalog.json` y `flows.fallback-catalog.ts`; prueba de deep-equal entre ambos en el repo del front (hoy se desfasan en silencio).

## 6. Frontend

### Glosario único
`src/app/components/flows/vocab/flows.vocab.ts` exporta `VOCAB` (términos, estados, motivos). El canvas lo recibe como prop `vocab` del web component (`main.tsx` → `flowStore`), igual que `connectedProviders`. Un solo lugar; sin textos sueltos.

| Hoy | Pasa a |
| --- | --- |
| Flujos automatizados / flow | Automatizaciones / automatización |
| run / Runs | ejecución / Historial |
| trigger / "Programación del trigger" | "Cuándo arranca" |
| nodo / nodes / edges | paso / pasos / conexiones |
| cron expression / polling | "cada cierto tiempo" (selector); cron crudo en Avanzado |
| webhook / "URL pública del webhook" | "cuando la tienda avisa" / "dirección que debes pegar en tu tienda" |
| test-run / Ejecutar | "Probar ahora" |
| activar/desactivar / draft | Encender / Apagar / Borrador |
| success / failed / partial / running / cancelled | Bien / Falló / Con pendientes / Corriendo / Cancelada |
| node_failed / error_port_items / no_items / ok | "Un paso falló" / "Algunos registros no pasaron" / "No había nada nuevo" / "Todo bien" |
| `{{ $json.x }}` / Expresión | "Usar un dato del paso anterior" (el picker ya existe) |
| rollback / diff | "Volver a la versión anterior" / "Comparar" (sin cambios funcionales) |

### Módulos (SRP, lazy)
- `flows-tablero` (lista): tarjeta = nombre, "de → a" con logos de conectores (derivados de los grupos de los pasos), semáforo, "última vez hace X · Bien · 3 pedidos", interruptor, "Historial", "Abrir". Fuente: `list` + `health` por tarjeta (una llamada por tarjeta, 9 flows por empresa como máximo real hoy; si crece, `health` acepta `?ids=`).
- `flows-cuando-arranca` (componente dentro del editor, reemplaza el panel de schedule/webhook): tres modos. En *cuando la tienda avisa*: la URL viene de `health.webhookUrl` (nunca más `window.location.origin`), instrucciones por proveedor en 4 pasos con captura, "último aviso recibido hace X" y estado de la firma ("protegida" / "verificando" / "sin proteger: pega el secreto en Integraciones").
- `flows-plantillas`: catálogo por objetivo (título = frase en primera persona, subtítulo = de → a, logos), asistente de 3 pasos. El paso 1 usa el `config/test` honesto. Entrada desde `/integrations` al guardar un conector con plantillas: toast con acción "Encender automatización".
- `flows-historial`: lista relativa, motivo humano, pasos con `displayName`, "Reintentar" cableado a `retryRun`; "Detalles técnicos" plegado con runId, nodeId, JSON y stack.
- Editor visual = `Modo avanzado` (botón en el encabezado). Sin cambios de comportamiento en el canvas salvo: títulos de parámetros desde el catálogo, estados en español vía `vocab`, colores.

### Tema
Tokens de `openspec/specs/design-system/spec.md` en `_flows-tokens.scss` compartido por los 6 SCSS; `styles.css` del canvas reemplaza `#2563eb` (18) y `#5E72E4` por el acento y los semánticos; sin `border-left`; sin el gradiente de plantillas; radios 16/11; chips fondo-suave + borde lila.

### Build del canvas
`package.json` raíz: `"build:flow-canvas": "cd packages/flow-canvas && npm run build && node scripts/patch-reactflow-dist.js && cp dist/flow-canvas.{js,css} ../../src/assets/flow-canvas/"`. El parche del vendor pasa de "a mano" a script versionado. Sin esto no se toca el canvas.

## 7. Orden de construcción

1. Backend A (dedup → sombra), salud, conectores honestos, catálogo. Deploy. **Nada visible cambia para el comercio.**
2. Siete días de sombra en OMS y Café Escobar; leer `integration_audit`.
3. Front: glosario + tablero + historial + cuándo arranca + plantillas + tema. Deploy desde worktree limpio. Verificar en FLORECER y OMS con captura.
4. Firma exigida en OMS (flag). Luego `failOnRunFailed` en OMS. Un flag a la vez, un día entre cada uno.
