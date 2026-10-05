# Tareas — Automatizaciones sin tecnicismos

Orden deliberado: primero lo invisible que protege, después lo visible. Cada tarea de código cierra con build sin errores. El endpoint de webhook crea pedidos: ahí **un cambio a la vez, diff y aprobación explícita antes de aplicar**. Leer los archivos antes de editarlos.

## Fase 0 — Verdad escrita y red de seguridad (sin cambios de comportamiento)

- [ ] **0.1** Registrar en `specs/002-flows-osmosis-shopify-marco/findings.md` el camino real verificado el 3-oct (webhook directo al endpoint del flow; colas y Cloud Functions vacías; trigger de OMS sin secreto; 0 webhooks visibles por API). Citar `flow_runs` del 2-oct.
- [ ] **0.2** Confirmar que `req.rawBody` llega al router de flows (`index.js:243-248` vs orden de montaje de `routers/flows.js`). Si no llega, esa es la primera tarea de la fase 1 y bloquea el resto.
- [ ] **0.3** Golden test del endpoint: tomar el último payload real de `webhook_logs` (Café Escobar) y uno de Shopify desde `flow_runs`, y escribir una prueba que llame a `webhookTrigger` con `startRun` simulado y afirme: 200, `runId`, el mismo `[{json: body}]` que hoy. Es la prueba que no puede romperse en toda la fase 1.
- [ ] **0.4** Medir p95 de `durationMs` de las corridas `triggeredBy: webhook` de los últimos 30 días (`/v1/flows/:id/metrics`). Anotar el número en `design.md`; es la línea base del riesgo de los 5 s de Shopify.

## Fase 1 — Blindaje del webhook (backend, aditivo, por flag)

- [ ] **1.1** `services/flows/webhookGuards.js`: `leerFlags(companyId, provider)` desde `integration_configs` (defaults de `design.md §2`), `dedup(provider, deliveryId)` reutilizando `services/shopify/webhookDedup.js` y `services/woocommerce/webhookDedup.js`, `verificarFirmaProveedor(provider, rawBody, headers, secret)` delegando en `webhookSecurityService` y `woocommerce/helpers/auth.js`. Pruebas unitarias de cada función con payloads reales.
- [ ] **1.2** 🔒 **Sensible.** Capa 1 en `webhookTrigger`: dedup antes de `startRun`. Diff + aprobación. Golden test 0.3 en verde.
- [ ] **1.3** 🔒 **Sensible.** Capa 2: firma en sombra → `integration_audit {type:'flow_webhook_signature'}`. No rechaza. Diff + aprobación.
- [ ] **1.4** 🔒 **Sensible.** Firma genérica `x-katuq-signature` sobre `rawBody` con `timingSafeEqual`. Antes: confirmar de nuevo en Firestore que ningún trigger activo tiene `webhookSecret`. Diff + aprobación.
- [ ] **1.5** 🔒 **Sensible.** Capas 3 y 4 detrás de `signatureEnforce` y `failOnRunFailed` (default `false`; la 4 exige la 1 encendida). Diff + aprobación.
- [ ] **1.6** `GET /v1/flows/:id/health` (`routers/flows.js` detrás de `auth`, `flowRunsController.getHealth`) con la forma de `design.md §3`. Filtra por `companyId` del request; 403 si el flow es de otra empresa. `webhookUrl` armada con la URL pública del backend (variable existente o `SHOPIFY_WEBHOOK_BASE_URL`), nunca con el origen del front.
- [ ] **1.7** Prueba de 1.6: webhook / polling / cron / sin binding; empresa ajena → 403.
- [ ] **1.8** Contract test de aislamiento: ejecutar `webhookTrigger` con todas las capas encendidas sobre el payload de Shopify y **fallar** si el conjunto de colecciones escritas difiere de hoy más `integration_audit` y la dedup. En particular: cero escrituras en `products`, `inventory`, `inventoryMovement`, precios.
- [ ] **1.9** Deploy backend (worktree limpio, `pm2 restart katuq-api` del daemon correcto). Verificar con el siguiente pedido real de OMS: run `success`, un solo pedido, `integration_audit` con el resultado de la sombra. **Dejar 7 días.**

## Fase 2 — Conectores honestos y catálogo (backend)

- [ ] **2.1** `integrationConfigController.testConnection`: tabla de delegación de `design.md §4`. Shopify, WooCommerce y Cereza delegan a sus pruebas reales existentes; los demás responden `verifiable:false` con mensaje humano. Pruebas por proveedor con credenciales inválidas.
- [ ] **2.2** Especificaciones de pasos: `credentials` corregidas (`world_office`, `aliaddo_fulfillment`); `hidden:true` en `osmosis-stock-sweep` y `shopify-bulk-product-sync`; registrar `shopify-bulk-product-sync` en `ALL_NODES` si debe existir o borrarlo si no (decidir con el usuario, no en silencio).
- [ ] **2.3** `title` + `description` en español para los 96 parámetros sin título. Un commit por grupo (shopify, woocommerce, osmosis, katuq, siigo, worldoffice, fullpi, flow-control). Nombres de negocio, no de código: "Bodega de Katuq", no `bodegaCode`.
- [ ] **2.4** `scripts/generate-node-catalog.js` emite `credentials`, `hidden`, títulos y descripciones; filtra `hidden` en `GET /v1/flows/nodes/catalog` salvo superadmin. Regenerar `nodeCatalog.json`.
- [ ] **2.5** Front: regenerar `flows.fallback-catalog.ts` y agregar prueba de deep-equal contra `nodeCatalog.json` (ruta relativa al repo hermano; se salta si no existe).
- [ ] **2.6** Deploy backend. Verificar `config/test` de Shopify en OMS: verificada; con token alterado en una empresa de prueba: fallida con motivo.

## Fase 3 — Frontend: la pantalla para comercios

- [ ] **3.1** `npm run build:flow-canvas` en el raíz + `packages/flow-canvas/scripts/patch-reactflow-dist.js` (el parche del vendor, versionado). Probar: build limpio → bundle idéntico al de `src/assets/` salvo el parche.
- [ ] **3.2** `flows.vocab.ts` con la tabla de `design.md §6`; prop `vocab` en el web component (`main.tsx`, `flowStore.ts`); canvas lee estados y etiquetas desde ahí. Reemplazar los 140 textos inventariados el 3-oct (lista en el informe de la sesión). Grep final: cero `flow|run|trigger|nodo|cron|webhook|payload|\$json|rollback|edge` en HTML/TSX fuera de "Detalles técnicos" y Modo avanzado.
- [ ] **3.3** `FlowsService.getHealth(id)` (extiende `BaseService`; nunca `HttpClient` directo).
- [ ] **3.4** Componente `flows-tablero`: tarjetas con de → a, logos, semáforo, última vez relativa, interruptor, Historial, Abrir. Sin versión, conteo de nodos ni IDs. Estado codificado en forma además de color.
- [ ] **3.5** Componente `flows-cuando-arranca`: tres modos; webhook con URL de `health.webhookUrl`, instrucciones por proveedor (Shopify: Configuración → Notificaciones → Webhooks → Crear; WooCommerce: Ajustes → Avanzado → Webhooks), "último aviso hace X", estado de la firma. Cron crudo bajo Avanzado. Eliminar el cálculo con `window.location.origin` (`flow-editor.component.ts:217`).
- [ ] **3.6** Componente `flows-historial`: filas relativas, motivo humano, pasos por nombre, "Reintentar" cableado a `retryRun`, "Detalles técnicos" plegado. Confirmaciones con Swal (nunca `confirm()`; hoy hay 3 `confirm()` en flows).
- [ ] **3.7** Plantillas por objetivo: títulos en primera persona, de → a con logos, asistente de 3 pasos usando `config/test` honesto y `credentials` del catálogo. Eliminar la rama muerta de `sessionStorage 'katuq.flow.prefill'` o hacer que el editor la lea (una de las dos).
- [ ] **3.8** `/integrations` → automatizaciones: al guardar un conector con plantillas, toast con acción "Encender automatización" → `/flows/templates?provider=`. Los botones "Conectar" de flows pasan `?provider=` y el formulario lo abre. Quitar la tarjeta falsa `flows` del catálogo de integraciones o convertirla en enlace a `/flows`.
- [ ] **3.9** Tema: `_flows-tokens.scss` + reemplazo en los 6 SCSS y en `styles.css` del canvas (18 × `#2563eb`, `#5E72E4`, gradiente, `border-left`). Grep final según el escenario "Auditoría de estilos".
- [ ] **3.10** Editor visual como Modo avanzado: botón en el encabezado; títulos de parámetros desde el catálogo; subtítulo técnico del panel (`spec.type · vN`) solo en avanzado.
- [ ] **3.11** Pantalla angosta: tablero en una columna, historial con desplazamiento interno, sin scroll lateral del cuerpo.
- [ ] **3.12** `tsc --noEmit` + `ng build --configuration production` desde worktree limpio. Deploy a Hosting. Verificar en FLORECER (sin flows: estado vacío y plantillas) y OMS (9 flows: tablero, historial real, cuándo arranca con URL correcta). Captura de antes/después.

## Fase 4 — Cierre y rollout de los flags

- [ ] **4.1** Leer 7 días de `integration_audit` de la sombra en OMS y Café Escobar. Si 100 % `match:true`: encender `signatureEnforce` en OMS. Si no: corregir el secreto en Integraciones con el comercio y repetir la sombra.
- [ ] **4.2** Un día después, encender `failOnRunFailed` en OMS. Verificar con el siguiente pedido real.
- [ ] **4.3** Café Escobar: mismo orden (4.1 → 4.2).
- [ ] **4.4** CONTRACT.md: D-350 pasa de propuesta a decisión con fecha de cada flag encendido; bitácora. Memoria: actualizar `flows-module-audit` y `backend-ec2-no-cloud-functions` con el camino canónico.
- [ ] **4.5** `/opsx:archive`.
