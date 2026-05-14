# Spec 002 — Marco del 360: Osmosis ↔ Katuq ↔ Shopify ↔ webhook

> Estado: **done — pending real-traffic validation** (sello 2026-05-13, ver D-360-CLOSED en CONTRACT.md)
> Autor(es): equipo Katuq + Claude
> Fecha: 2026-05-13
> Carpeta: `specs/002-flows-osmosis-shopify-marco/`
>
> **Esta es una spec MARCO**: define el target state del 360 y referencia 6 sub-specs hijas (002.1 a 002.6) donde vive el detalle implementable.

## 1. Por qué esta spec existe

El responsable de producto declaró el 2026-05-13 como goal de la sesión:
> "Mi prioridad es dejar listo y funcionando la integración de Osmosis-Katuq-Shopify y webhook, todo el 360, y no tocar más nada. Si eso implica organizar el desorden, se debe hacer."

La auditoría real (`findings.md`) demuestra que el sistema 360 está **parcialmente roto** en formas que solo se ven con datos ejecutados, no leyendo docs. Esta spec define:
1. El target state del 360.
2. Los principios canónicos que cualquier sub-spec debe respetar.
3. La descomposición en 6 sub-specs ejecutables.
4. Los criterios de aceptación operativa (cuándo se considera "cerrado").

## 2. El sistema target (no el actual)

```
                       Cereza/Osmosis (proveedor)
                            ▲   │
                            │   │
                  push      │   │   webhook entrante
              outbound      │   │   (estados, evidencia)
                            │   ▼
       ┌────────────────  Katuq  ──────────────────┐
       │                    │                        │
       │           ┌────────┼─────────┐              │
       │           │        │         │              │
       │      productos  pedidos  inventario        │
       │     (catálogo)              (stock)         │
       │                                              │
       │   bodegas: 001-005 + PRCPL-01 (Aliaddo)      │
       │            BOD-CEREZA-1 (virtual Osmosis)    │
       │            BOD-006/007/008/100 (manual)      │
       │                                              │
       │           ▲                  │               │
       │           │                  │               │
       │     pedidos pagados     productos +          │
       │     (auto push a        inventario           │
       │      Osmosis desde      (sync visible        │
       │      BOD-CEREZA-1)      en Shopify)          │
       │           │                  │               │
       └───────────┼──────────────────┼───────────────┘
                   │                  │
                   └─── Shopify ──────┘
```

### Reglas de fuente de verdad

| Datos | Fuente de verdad | Quién escribe |
|---|---|---|
| Catálogo Cereza | Osmosis | `osmosisProductSyncService` (cron 6h) + webhook entrante |
| Stock virtual Cereza | Osmosis (BOD-CEREZA-1) | `osmosisProductSyncService._syncInventory` |
| Stock real Aliaddo (001-005, PRCPL-01) | Aliaddo | `fulfillmentSyncService` |
| Stock manual (BOD-006/007/008/100) | Operador | UI Katuq |
| Pedidos Shopify | Shopify | webhook Shopify → flow `shopify-orders-to-cereza` |
| Estado de pedido pushed a Osmosis | Osmosis | webhook entrante (spec 001) |
| Evidencia de entrega | Osmosis | webhook entrante (spec 001) |

## 3. Criterios de aceptación EARS (criterio del 360 cerrado)

### Webhook entrante (Cereza → Katuq)
- **AC-360-01.** WHEN Cereza envía un webhook con `Authorization: Bearer <webhookSecret>` válido y body conforme al schema `OsmosisWebhookEvent`, THE system SHALL responder 200 en ≤3s y persistir el evento en `osmosis_webhook_log/{companyId}/events/{eventId}`. (Cubierto por spec 001).
- **AC-360-02.** WHEN el evento es `order.status_updated` con `status: 'delivered'` y `data.evidence`, THE system SHALL acumular la evidencia en `integrations.osmosis.evidenciasEntrega[]` aunque la orden ya esté en estado final.

### Push outbound (Katuq → Cereza)
- **AC-360-03.** WHEN un pedido Shopify llega a Katuq con `financial_status: paid` y aún no tiene `integrations.osmosis.isPushed`, THE system SHALL pushearlo automáticamente a Osmosis usando `BOD-CEREZA-1` como bodega de salida.
- **AC-360-04.** IF el push a Osmosis falla, THEN THE system SHALL registrar el error en `integrations.osmosis.error` con timestamp y NO marcar `isPushed: true`.
- **AC-360-05.** THE system SHALL ser idempotente: pushear el mismo pedido dos veces NO crea dos órdenes en Osmosis.

### Sync de productos
- **AC-360-06.** WHEN un producto cambia en Cereza, THE system SHALL reflejarlo en Katuq (`products` collection) en menos de 6h vía cron, o en menos de 60s vía webhook entrante (spec 001).
- **AC-360-07.** WHEN el producto Cereza tiene stock > 0 Y está activo, THE system SHALL crearlo/actualizarlo en Shopify vía flow `cereza-products-to-shopify-a5156643`.

### Inventario
- **AC-360-08.** WHEN un pedido se pushea a Osmosis desde `BOD-CEREZA-1`, THE system SHALL descontar el stock correspondiente en Katuq antes o como parte del mismo flujo.
- **AC-360-09.** WHILE Cereza es la fuente de verdad de stock virtual, THE system SHALL NO sobrescribir stock de bodegas Aliaddo (001-005, PRCPL-01) con datos de Cereza.

### Canónica de campos
- **AC-360-10.** THE system SHALL escribir todos los campos de integraciones en INGLÉS (`integrations.<provider>.*`). Lecturas pueden tener fallback temporal a español durante migración.
- **AC-360-11.** WHILE existan documentos con campos `integraciones.<provider>` legacy, THE system SHALL leer ambos campos pero priorizar `integrations.<provider>` cuando ambos existan.

### Operativo (crones + observabilidad)
- **AC-360-12.** WHEN un nodo de flow falla, THE system SHALL guardar `error.message`, `error.code` y `error.stack` (truncado a 2000 chars) en `nodeStates[nodeId].error`. Sin esto el debug es imposible.
- **AC-360-13.** IF el backend reinicia mid-run, THEN THE system SHALL detectar zombies en menos de 5min y reintentar automáticamente al menos una vez.
- **AC-360-14.** THE system SHALL emitir métricas de `flow_runs` por status (success/partial/failed/zombie) por hora. La tasa de runs problemáticos no debe exceder 5% sostenido.

## 4. Out of scope (explícito)

- Doble conteo de `inventory` (1,666 duplicados + 381 legacy). Registrado como deuda en CONTRACT.md, no se ataca en spec 002. Se atacará después con su propia spec.
- Refactor del schema de productos completo (datos de aliado vs propios vs cereza). Solo se toca lo que es necesario para el 360.
- UI de configuración de crones por usuario. Pospuesto.
- Soporte para nuevos proveedores de e-commerce (MercadoLibre, etc.).
- Investigación de por qué órdenes Shopify llegan canceladas en alta proporción.

## 5. Sub-specs hijas (ver `sub-specs.md` para detalle)

| # | Sub-spec | Bloquea | Prioridad |
|---|---|---|---|
| 002.1 | `migrate-to-english-integrations` | 002.4, 002.5, 002.6 | 🔴 P0 (canónica) |
| 002.2 | `flow-runs-error-instrumentation` | 002.3, 002.6 | 🔴 P0 (sin esto debug ciego) |
| 002.3 | `flow-runs-resilience-vs-restart` | 002.6 | 🟠 P1 |
| 002.4 | `shopify-to-cereza-bodega-y-inventario` | 002.6 | 🔴 P0 (operativo crítico) |
| 002.5 | `consolidar-flows-shopify-to-osmosis` | 002.6 | 🟡 P2 |
| 002.6 | `cierre-360-aceptacion-operativa` | — | 🟢 último |

## 6. Dependencias

- **001 osmosis-webhook-inbound** debe estar en `approved` (lo está).
- Acceso a Firestore con credenciales de admin (lo tenemos, `serviceAccountKey.json`).
- Acceso al frontend Angular Seller.Katuq (lo tenemos).

## 7. Métricas de éxito post-launch

- **M-360-01.** 100% de los criterios EARS de §3 verde.
- **M-360-02.** En 7 días post-cierre: cero rollbacks por bug introducido por la migración.
- **M-360-03.** Reducción de runs `failed/partial` en flow_runs de 27.5% a ≤5% en 30 días.
- **M-360-04.** Cero pedidos Shopify pagados que NO se hayan pushado a Osmosis en 7 días.
- **M-360-05.** Cero divergencias nuevas `integraciones`/`integrations` post-migración.

## 8. Glosario rápido

- **360**: ciclo completo Cereza ↔ Katuq ↔ Shopify ↔ webhook funcionando sin intervención manual.
- **BOD-CEREZA-1**: bodega virtual que representa el catálogo Cereza dentro de Katuq.
- **canónica `integrations`**: campo en inglés (singular del concepto), no `integraciones`. Decisión D-009 del CONTRACT.md.
- **zombie run**: `flow_run` que estaba en `running` cuando el backend murió y queda colgado hasta que `flowRunZombieCleanup` lo barre.
- **divergencia es/en**: dos campos `integraciones.X` y `integrations.X` con valores o schemas distintos en el mismo doc.
