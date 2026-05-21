# Spec 003 — Marco WooCommerce 360 Plug-and-Play

> Estado: **draft** (en redacción 2026-05-20, pendiente review humano)
> Autor(es): equipo Katuq + Claude
> Carpeta: `specs/003-woocommerce-360-marco/`
>
> **Esta es una spec MARCO**: define el target state del 360 WooCommerce y referencia 6 sub-specs hijas (003.1 a 003.6) donde vive el detalle implementable.

## 1. Por qué esta spec existe

El responsable producto fijó el goal el 2026-05-20:

> "Cualquier comercio cuando le nazca del culo integrar WooCommerce, se pueda integrar… muy fácil demasiado fácil para el usuario, no uses tecnisismos raros, el cron de sincronización debe ser fácil de configurar."

La auditoría real (`findings.md`) confirma que hoy es **imposible** cumplir ese goal sin trabajo formal:

- Backend WooCommerce esquelético (369 LOC, 7 exports) vs Shopify canónico (1240 LOC, 26 exports).
- 2 nodos `/flows` para WooCommerce (1 con bug bloqueante `TypeError` en runtime).
- HMAC SHA-256 desactivado (router línea 9 comentada) — viola Artículo X de constitución.
- Sin pipeline secure (dedup / queue / worker / processors) — viola Artículo IV (idempotencia).
- Sin templates plug-and-play en `flow_templates` — el comerciante hoy debe construir el flow desde cero, lo cual va contra "FACIIIIIL".
- Sin documentación orientada al comerciante (las 3 docs de /flows son técnicas).

Esta spec define:
1. El target state del 360 WooCommerce.
2. Los principios canónicos que cualquier sub-spec debe respetar.
3. La descomposición en 6 sub-specs ejecutables (003.1..003.6).
4. Los criterios de aceptación operativa (sello `D-WOO-360-MVP`).

## 2. El sistema target

```
                  WooCommerce (tienda del comerciante)
                       ▲   │
              push     │   │   webhook entrante
          outbound     │   │   (orders, products, customers)
        (fase 2 opt)   │   │
                       │   ▼
       ┌─────────── Katuq ────────────────┐
       │                                    │
       │   /integrations:                   │
       │     - WooCommerce config (1 vez)   │
       │     - Credenciales + bodegaCode    │
       │                                    │
       │   /flows:                          │
       │     - Templates plug-and-play      │
       │       (3 plantillas listas)        │
       │     - Comerciante elige + activa   │
       │     - Cero credenciales repetidas  │
       │       (lee de $companyConfig)      │
       │                                    │
       │   products / orders / inventory    │
       │     - canónica integrations.       │
       │       woocommerce.* (Art XV v2)    │
       │     - soft delete (D-017)          │
       │     - inventoryService.updateStock │
       │       (evita doble conteo)         │
       └────────────────────────────────────┘
```

### Reglas de fuente de verdad

| Datos | Fuente de verdad | Quién escribe en Katuq | Sub-spec |
|---|---|---|---|
| Catálogo WooCommerce | WooCommerce | `woocommerce-fetch-products` (cron) + webhook `product.*` | 003.3 |
| Stock WooCommerce | WooCommerce | sync incremental cron + webhook | 003.3 |
| Pedidos WooCommerce | WooCommerce | webhook `order.created` / `order.updated` | 003.2 |
| Estado del pedido en Katuq | Katuq | mapper de `services/woocommerce/processors/orders.js` | 003.2 |
| Credenciales | `/integrations` (1 vez) | `integrationConfigService` | 003.1 |

## 3. Criterios de aceptación EARS

### Onboarding (`/integrations`)

- **AC-WOO-01.** WHEN un comerciante abre `/integrations` y selecciona WooCommerce, THE system SHALL mostrar un formulario con campos `storeUrl, consumerKey, consumerSecret, webhookSecret, apiVersion, verifySsl, bodegaCode` además de instrucciones paso a paso (info-box) sobre cómo generar las credenciales en WooCommerce.
- **AC-WOO-02.** WHEN el comerciante hace click en "Probar conexión", THE system SHALL ejecutar un `GET` al endpoint público `/wc/{apiVersion}/system_status` y reportar resultado en ≤5s.
- **AC-WOO-03.** THE system SHALL mostrar la URL exacta del webhook entrante (`https://back.katuq.com/v1/woocommerce/webhook/{companyId}`) con un botón "copiar al portapapeles" e instrucciones para pegarla en `WooCommerce → Ajustes → Avanzado → Webhooks`.

### Webhook entrante (WooCommerce → Katuq)

- **AC-WOO-04.** WHEN WooCommerce envía un POST al endpoint del webhook con cabecera `X-WC-Webhook-Signature` válida (HMAC SHA-256 base64 sobre el body usando `webhookSecret`), THE system SHALL responder 200 en ≤3s y persistir el evento crudo antes de procesar.
- **AC-WOO-05.** IF la firma no valida, THEN THE system SHALL responder 401 y NO persistir el evento como válido (Artículo X).
- **AC-WOO-06.** THE system SHALL ser idempotente: dos POST con el mismo `X-WC-Webhook-Delivery-ID` resultan en una sola escritura efectiva en Firestore (segundo POST retorna 200 con `{duplicate: true}`).

### Sync de productos (Woo → Katuq unidireccional, D-016)

- **AC-WOO-07.** WHEN una plantilla `woo-sync-products-to-katuq` está activa, THE system SHALL ejecutar un cron con la frecuencia configurada en `$companyConfig.woocommerce.syncIntervalMinutes` (default 15 min) que pagine `GET /products` de WooCommerce y upsertee a la colección `products` de Katuq.
- **AC-WOO-08.** WHEN un producto se actualiza en WooCommerce, THE system SHALL reflejarlo en Katuq en ≤2× el intervalo del cron vía sync, o en ≤60s vía webhook `product.updated`.
- **AC-WOO-09.** WHEN un producto se borra en WooCommerce (webhook `product.deleted` o `status: 'trash'`), THE system SHALL setear `disponibilidad.activo: false` en el doc Katuq (soft delete, D-017) y NO borrar el documento.

### Pedidos (WooCommerce → Katuq)

- **AC-WOO-10.** WHEN llega un webhook `order.created` válido, THE system SHALL crear el doc en `orders` de Katuq con `sourceOrder: 'woocommerce'`, mapear estado y campos, y descontar stock de la bodega configurada en `$companyConfig.woocommerce.bodegaCode`.
- **AC-WOO-11.** WHEN llega `order.updated`, THE system SHALL acumular el cambio en `integrations.woocommerce.statusHistory[]` (patrón D-006 usado en spec 001) y actualizar el estado mapeado en Katuq.

### Canónica de campos

- **AC-WOO-12.** THE system SHALL escribir todos los campos de integración WooCommerce en INGLÉS (`integrations.woocommerce.*`). Campos copiados literalmente del payload WooCommerce usan `snake_case` (`product_id`, `order_id`); campos derivados/internos usan `camelCase` (`lastSyncedAt`, `isPushed`, `pushedAt`). (Artículo XV v2).

### Multi-tenant y plug-and-play (`/flows`)

- **AC-WOO-13.** WHEN un comerciante hace click en "Crear desde plantilla" en `/flows` y elige una plantilla WooCommerce, THE system SHALL mostrar 2-5 inputs simples (intervalo, bodega, estado inicial, toggle crear cliente) sin exponer terminología técnica (nodo, expresión, binding, cron-expression).
- **AC-WOO-14.** IF un nodo WooCommerce ejecuta y la config `integrations.woocommerce` no existe para esa empresa, THEN THE system SHALL fallar el nodo con `nodeStates[id].error.code = 'WC-CONFIG-MISSING'` y un mensaje friendly que diga "Conectá tu tienda WooCommerce en /integrations primero".
- **AC-WOO-15.** THE system SHALL NO contener lógica `if (provider === 'woocommerce')` en componentes UI de `/flows` o `/integrations` (Artículo VI). Las diferencias por proveedor viven en adapters: nodos, mappers, processors.

## 4. Requisitos no funcionales

### 4.1 Performance
- Webhook entrante: latencia p95 ≤ 800ms (medido desde recepción hasta 200 OK, persistencia incluida).
- Sync productos: ≥ 100 productos/min con paginación `per_page=100`. Throughput limitado por rate-limit de WooCommerce (sin throttle declarado oficialmente; usar backoff exponencial si llega 429).
- UI `/integrations`: form WooCommerce renderiza en ≤200ms desde click.

### 4.2 Seguridad (Artículo X)
- HMAC SHA-256 obligatorio en webhook entrante. Rechazar payload sin firma con 401.
- Rate-limit por origen: 60 req/min por `companyId` en endpoint webhook.
- Allowlist de IPs opcional (WooCommerce no la publica oficialmente — config por empresa si la quieren).
- Credenciales (`consumerSecret`, `webhookSecret`) cifradas at-rest con `INTEGRATION_ENCRYPTION_KEY` (servicio `integrationConfigService` ya lo hace para otros proveedores).
- NUNCA loguear `consumerSecret` ni `webhookSecret` en claro (Artículo XI).

### 4.3 Observabilidad (Artículo VII)
- Logs estructurados con `correlationId` (mismo `X-WC-Webhook-Delivery-ID` cuando aplique).
- Métrica de runs por status (success/partial/failed) por hora para flows WooCommerce activos.
- Entrada en `provider-dashboard` cuando un webhook afecta una orden o producto identificable.

### 4.4 Accesibilidad (UI)
- Form `/integrations`: navegación completa por teclado, labels asociadas a inputs (`for=id`), mensajes de error con `role="alert"`.
- Modal "Crear desde plantilla" en `/flows`: WCAG AA, contraste ≥ 4.5:1, foco visible en cada paso.

### 4.5 Resiliencia (Artículo IV)
- Idempotencia obligatoria en webhook (clave: `X-WC-Webhook-Delivery-ID`, TTL 24h en `wc_webhook_dedup` collection).
- Reintentos en cliente HTTP WooCommerce: 3 attempts con backoff exponencial (1s, 3s, 9s) para 5xx y 429.
- Si WooCommerce está caído al cron de sync: skip ese tick, log estructurado, sin marcar `flow_run` como failed; reintentar al próximo tick.

## 5. Out of scope (explícito)

- **OAuth via `/wc-auth/v1/authorize`** — D-019 lo difiere. Si piloto lo pide, abrir spec 003.7.
- **Sync bidireccional Katuq → Woo** — D-016. Difiere a spec 003.8 si piloto lo pide.
- **Migración de tenants Woo legacy** — sin tenants Woo conocidos hoy. Si aparecen, spec 003.9.
- **Soporte WooCommerce multisite (WPMU)** — fuera del MVP.
- **Sync de customers** — fase 2; el `order.created` ya trae datos del customer embebidos.
- **Refunds y cancellations** — fase 2.
- **Fulfillment Katuq → Woo** — fase 2 (requiere bidireccional).
- **UI de configuración de cron del template fuera de los inputs definidos** — la frecuencia de sync se configura al instanciar el template, no se cambia desde un panel separado en MVP.

## 6. Sub-specs hijas (ver `sub-specs.md` para detalle)

| # | Sub-spec | Bloquea | Prioridad |
|---|---|---|---|
| 003.1 | `woocommerce-integration-schema-ux` | 003.2, 003.3 | 🔴 P0 (sin config no hay sync) |
| 003.2 | `woocommerce-webhook-secure-pipeline` | 003.4 | 🔴 P0 (sin HMAC viola Art X) |
| 003.3 | `woocommerce-product-sync-incremental` | 003.4 | 🔴 P0 (sync es la promesa al usuario) |
| 003.4 | `woocommerce-flow-nodes` | 003.5 | 🔴 P0 (sin nodos no hay templates) |
| 003.5 | `woocommerce-templates-plug-and-play` | 003.6 | 🔴 P0 (es el "FACIIIIIL" del goal) |
| 003.6 | `woocommerce-acceptance-suite` | — | 🟢 último (sella D-WOO-360-MVP) |

## 7. Dependencias

- **001 osmosis-webhook-inbound** debe estar `approved` (lo está).
- **002.2 flow-runs-error-instrumentation** debe estar `done` (lo está) — necesario para `AC-WOO-14`.
- **002.7 flows-multitenant-via-companyConfig** debe estar `done` (lo está) — base del patrón `$companyConfig.woocommerce.*`.
- **002.9 flow-cron-catchup-on-boot** debe estar `done` (lo está) — para AC-WOO-07 cron resiliente.
- Acceso a Firestore con credenciales admin (`serviceAccountKey.json`).
- Acceso al frontend Angular Seller.Katuq + backend Node `katuq_admin_back_firebase`.
- Documentación oficial WooCommerce REST API v3: https://woocommerce.github.io/woocommerce-rest-api-docs/

## 8. [NEEDS CLARIFICATION]

> Preguntas abiertas que pueden surgir al redactar sub-specs. Si quedan abiertas, no se planea esa sub-spec.

- [ ] **Q-WOO-01** (003.1): ¿el picker `bodegaCode` muestra TODAS las bodegas del comercio, o solo las activas (`bodega.activa === true`)? Default propuesto: solo activas.
- [ ] **Q-WOO-02** (003.2): ¿cómo capturamos el `webhookSecret` cuando WooCommerce lo autogenera al crear el webhook? Opciones: (a) el comerciante lo pega manualmente desde Woo, (b) primer POST sin firma se acepta y se persiste el secret detectado, (c) endpoint dedicado de "instalar webhook" desde Katuq que llama a WC API y guarda el secret retornado. Default propuesto: (a) en MVP, (c) en fase 2.
- [ ] **Q-WOO-03** (003.3): ¿qué campos del producto Woo se mapean exactamente al modelo Katuq `products`? Mapping borrador en findings.md §3 pero requiere revisión humano con producto real.
- [ ] **Q-WOO-04** (003.4): ¿el nodo `woocommerce-order-status-update` debe permitir adjuntar `note` (visible al cliente) o solo cambio de estado? Default propuesto: ambos, con toggle "visible al cliente".
- [ ] **Q-WOO-05** (003.5): ¿los 3 templates van en `flow_templates` collection como docs separados o como un array? Confirmar contra cómo Shopify guarda sus templates hoy (si los tiene).
- [ ] **Q-WOO-06** (003.6): ¿qué tenant usamos para tests E2E sin piloto? Opciones: (a) OH MY STORE con datos mock, (b) crear "WOO TEST" tenant nuevo, (c) Firestore Emulator. Default propuesto: (c) para tests automáticos + (b) para validación manual pre-piloto.

## 9. Riesgos identificados

- **R-WOO-01** (Alto): HMAC de WooCommerce mal interpretado — sin doc oficial sobre el algoritmo exacto. Mitigación: 003.2 incluye fixture firmado a mano contra WC sandbox para validar antes de mergear.
- **R-WOO-02** (Medio): doble conteo de inventario (deuda registrada del 002, fuera de scope). Mitigación: mapper Woo NO escribe `inventory` directo, usa `inventoryService.updateStock()` que ya normaliza `productoId` (CLAUDE.md regla crítica).
- **R-WOO-03** (Medio): WooCommerce REST API no documenta rate-limit oficial. Mitigación: backoff exponencial + circuit breaker si 429 >5 veces en 1min para esa empresa.
- **R-WOO-04** (Bajo): Templates pueden tentar a "WooBuilder.component" especial violando Art VI. Mitigación: `flow_templates` collection se lee dinámicamente desde Firestore — agregar/quitar templates NO requiere cambios en código UI.
- **R-WOO-05** (Bajo): cron DUP-2 latente del 002 (auto-curado). Si reaparece, no es bloqueante (idempotencia cubre).

## 10. Métricas de éxito post-launch

- **M-WOO-01**: 100% de criterios EARS de §3 verde en suite 003.6.
- **M-WOO-02**: Primer comercio piloto completa onboarding (`/integrations` + activar template) en ≤10 min sin contacto con soporte.
- **M-WOO-03**: 0 webhooks aceptados sin firma válida en 30 días post-launch (verificable en logs).
- **M-WOO-04**: Tasa de runs `failed`/`partial` en flows WooCommerce ≤ 5% sostenido (mismo umbral que 002).
- **M-WOO-05**: Cero divergencias `integraciones.woocommerce` / `integrations.woocommerce` post-launch (auditable con script equivalente al de 002.1).

## 11. Glosario rápido

- **360 WooCommerce**: ciclo completo `WooCommerce ↔ Katuq` funcionando sin intervención manual del comerciante post-onboarding.
- **`bodegaCode`**: business code de la bodega destino para inventario sincronizado desde Woo (ej. `BOD-WOO-1`). Análogo a `BOD-CEREZA-1` para Osmosis.
- **Template plug-and-play**: doc en `flow_templates` collection que el comerciante instancia con 2-5 inputs simples para crear un flow funcional sin armar nodos manualmente.
- **`$companyConfig.woocommerce`**: snapshot de la config de integración de la empresa, accesible vía expressionEngine en cualquier nodo del flow (patrón 002.7).
- **HMAC SHA-256 (WooCommerce)**: firma base64 calculada con `webhookSecret` sobre el body crudo del POST. Cabecera: `X-WC-Webhook-Signature`.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec (axios, etc.).
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de pasar a planes de sub-specs.
