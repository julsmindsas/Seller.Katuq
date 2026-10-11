# Diseño: IA de despachos

Backend `katuq_admin_back_firebase/functions`; front este repo. Reusa las piezas de la IA de inventarios (D-401).

## Piezas que se reutilizan

| Pieza | Dónde |
|---|---|
| Estados listos para despachar | `READY_STATES` en `services/shippingQueueMetrics.js` |
| Cancelados | `isCancelledOrder` en `tools/_orderFilters.js` |
| Fechas (texto o Timestamp, día de Colombia) | `dateMillis`, `colombiaDay` en `services/operationalMetricDates.js` |
| Validación de frases de la IA | se extrae de `inventoryInsightsExplain.js` a `services/ai/frasesVerificadas.js` (mismo código, dos usuarios) |
| Opttia, cupo, herramienta MCP, política | igual que inventario |

## Decisiones

1. **`services/logistics/dispatchInsights.js`**: `leerPedidosActivos` (una consulta: `company` + `estadoProceso in [ProducidoTotalmente, ParaDespachar, EnDespacho, Empacado, Despachado]`, con `select` de los campos necesarios) y funciones puras `normalizarPedido`, `queDespacharHoy`, `despachadosSinCerrar`, `detectarAvisosDespacho`, más `calcularDispatchInsights`.
2. **Normalización en un punto:** transportador = texto o `{nombre|id}`; fecha de despacho = `fechaYHorarioDespachado` o `fechaDespacho`; zona = `envio.zonaCobro` o `zonaCobro`; ciudad = `envio.ciudad`; saldo = `faltaPorPagar`; total = `totalPedididoConDescuento` (con el typo real).
3. **Tramos** por día de Colombia: `vencidoReciente` (1–3 días), `hoy`, `manana`, `atrasado` (4–15 días); `vencidoViejo` (> 15 días) va a avisos; más allá de mañana no entra. Ciudades normalizadas ("Bogotá D.C." = "BOGOTA"; "N/A" = sin ciudad). La frase dice "por cobrar", no "contraentrega" (hay ventas a crédito).
4. **Sin cerrar:** "Despachado" con fecha de despacho (o, si no hay, la pactada) de hace más de 3 días.
5. **Avisos** (catálogo cerrado): `sin_fecha`, `sin_destino`, `sin_transportador`, `problema_transportadora` (`requiresAttention` o `failureReason`), `estancado` (Empacado/EnDespacho con `fechaHoraEmpacado` de hace más de 2 días), `vencido_viejo`.
6. **IA:** `services/ai/dispatchInsightsExplain.js` + prompt; la entrada lleva número de pedido, ciudad, zona, tramo, montos y transportador (nombre del mensajero o transportadora, que es del comercio), nunca nombre/teléfono/dirección del cliente. Misma guarda de números.
7. **Endpoints:** `GET /v1/logistica/insights` (sin cupo) y `POST /v1/logistica/insights/explicar` (cupo de chat), con `auth` + `requireJwtTenant`.
8. **MCP:** `get_dispatch_insights` (solo lectura) en `toolRegistry`, `opttiaAccessPolicy` (`despachos/view`) y la lista de Opttia en el ADK.
9. **Front:** componente `app-despachos-ia` en el módulo de despachos, en lugar de las "Recomendaciones KAI" fijas; botón "Explicar con Opttia" y chips al chat.

## Pruebas

Puras (tramos, sin cerrar, avisos, normalización), IA (id inventado, número inventado, Opttia caído, sin datos del cliente en la entrada), punta a punta con Firestore falso (una sola consulta, `select`), contrato de solo lectura y herramienta MCP sin red.
