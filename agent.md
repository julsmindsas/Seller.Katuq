# Agent.md — Políticas de Desarrollo Katuq

> Reglas de operación para agentes de IA que trabajan en este proyecto. Complementa CLAUDE.md con políticas de comportamiento.

## Filosofía

Katuq es un sistema en producción con comercios reales. Cada cambio impacta operaciones de negocio. **Medir dos veces, cortar una.**

## Reglas de Oro

### 1. Entender antes de actuar
- **LEER** el código existente antes de proponer cambios
- **TRAZAR** el flujo completo (frontend → interceptor → backend → Firestore) antes de editar
- **VERIFICAR** con datos reales (endpoints de diagnóstico, Firestore directo) — nunca asumir

### 2. Respetar la arquitectura
- **Servicios Angular** para HTTP, nunca HttpClient directo en componentes. El interceptor agrega auth headers.
- **Strategy Pattern** en backend para integraciones (providers + managers)
- **KAI (Genkit)** para IA, no llamadas directas a Gemini API. Flujos en `kai/functions/src/agents/`
- **ADK** para agentes multi-departamento con AG-UI protocol. No mezclar ADK con Genkit.
- **Firestore audit collections** para telemetría, nunca console.log masivo

### 3. Nunca comprometer seguridad
- **Auth middleware** siempre presente en endpoints — nunca quitarlo ni "temporalmente"
- **HMAC** para webhooks — nunca confiar en payload sin verificar firma
- **Firestore transactions** para operaciones de inventario — evitar race conditions
- **Multi-tenancy** — todas las queries filtradas por `companyId`

### 4. Cambios en producción con cuidado
- **Inventario** (`inventoryService.js`): afecta POS, ventas, fulfillment, Shopify. Entender TODOS los flujos antes de tocar.
- **Precios/Totales**: verificar `_calculadoEnBackend`, `_precioManualOverride`, `precioUnitarioIva` (es string porcentaje)
- **Despachos**: `formaEntrega` SIEMPRE de `carrito[0].configuracion.datosEntrega.formaEntrega`

### 5. Diagnóstico antes de corrección
- Usar `/v1/inventory/diagnostico` para detectar inconsistencias de inventario
- Usar `/v1/inventory/reparar` para correcciones masivas (con auditoría automática)
- Usar `inventory_audit` collection para telemetría de operaciones
- **Nunca adivinar** la causa de un bug — verificar con datos

## Stack y Puertos

| Servicio | Puerto | Ubicación | Inicio |
|----------|--------|-----------|--------|
| Angular Frontend | 4200 | `Seller.Katuq/` | `npm start` |
| Backend Express | 3300 | `katuq_admin_back_firebase/functions/` | `node index.js` |
| KAI Genkit (flows) | 3890 | `kai/functions/` | `npx tsx --watch src/index.ts` |
| KAI REST API | 3891 | `kai/functions/` | (mismo proceso) |
| KAI WebSocket | 3892 | `kai/functions/` | (mismo proceso) |
| ADK (Python/Flask) | 8080 | `kai/adk_agent/` | `python main.py` |

## Convenciones de IDs

| Entidad | Campo | Tipo | Ejemplo |
|---------|-------|------|---------|
| Producto (frontend) | `producto.cd` | Firestore doc ID | `"6RqOXgVGH95f2O6sC8yZ"` |
| Bodega (negocio) | `idBodega` | Business code | `"BOD-001"` |
| Bodega (Firestore) | `doc.id` | Firestore doc ID | `"eSnsrFum5v2Lc4ZY8ukS"` |
| Canal-Bodega assoc | `bodegaId` | Firestore doc ID | `"l1h5f0RuneuiIx70gzDH"` |
| Inventario | `productoId` | Firestore doc ID | `"6RqOXgVGH95f2O6sC8yZ"` |
| Inventario | `idBodega` | Business code | `"BOD-001"` |
| Movimiento | `idBodega` | Business code | `"BOD-001"` |

**REGLA**: `inventory` y `inventoryMovement` usan business code en `idBodega`. NUNCA Firestore doc ID.

## Flujos Críticos

### Creación de pedido → Inventario
```
Frontend (crear-ventas) → POST /v1/orders/create
  → order.typeOrder = "E-commerce" | "POS"
  → order.channel = { name: "Venta Asistida", tipo: "E-commerce" }
  → order.bodegaId = business code ("BOD-001")

Backend (orders.js) → inventoryService.updateStock(order)
  → POS: updateByPOS() — directo por bodegaId
  → Canal: updateByChannel() — busca canal → bodegasAsociadas → resuelve → descuenta
  → Resultado: { success: true/false } — NO relanza error, la orden se crea igual
```

### Importación con KAI
```
Frontend (import-modal) → POST /v1/katuqintelligence/kai/column-mapping
  → Backend proxy → POST http://127.0.0.1:3890/columnMappingFlow (Genkit)
  → KAI analiza columnas con Gemini 2.5 Flash
  → Retorna mappings con confidence scores

Frontend transforma datos → POST /v1/onboarding/import-{customers|products|inventory}
  → Backend resuelve referencias → bulk write en Firestore
```

### Análisis IA (Central de Abastecimiento)
```
Frontend → POST /v1/katuqintelligence/kai/inventory-analysis
  → Backend proxy → POST http://127.0.0.1:3890/inventoryAnalysisFlow (Genkit)
  → KAI genera resumen ejecutivo con Gemini 2.5 Flash
  → Retorna { salud, resumen, sugerencias[] }
```

## Anti-Patterns

| Anti-Pattern | Consecuencia | Solución |
|-------------|-------------|----------|
| HttpClient directo en componente | Interceptor no agrega auth → 401 | Usar servicio existente |
| Quitar auth middleware para probar | Endpoint expuesto sin protección | Nunca, el interceptor envía tokens |
| console.log para telemetría | Logs ilegibles, no queryables | Firestore audit collection |
| Asumir bug sin datos | Cambios innecesarios, bugs nuevos | Endpoint diagnóstico primero |
| Firestore doc ID en `idBodega` | Movimientos huérfanos, totales incorrectos | Siempre business code |
| Editar inventoryService sin contexto | Rompe POS, ventas, fulfillment | Trazar flujo completo |
| `setTimeout` para sync parent-child | Race conditions | Callbacks/flags |
| Filtrar `active !== false` sin mostrar | Datos ocultos, confusión usuario | Mostrar todo con badge |

## ClickUp

- Workspace ID: `31545745`
- Proyecto inventario: ticket padre `86b8f1hd4` en lista OMS, folder MODO CRITICO
- Al cerrar ticket: agregar comentario técnico con detalle de lo que se hizo
- Tickets sin detalle suficiente: agregar comentario "Hace falta detalle"
