# Plan 009 — Métricas de cliente en el detalle de cliente

> Estado: **draft**
> Vinculado a `spec.md` (estado: in-review).
> Última actualización: 2026-06-18

## 1. Resumen técnico
Un único endpoint de backend resuelve el resumen del cliente leyendo sus órdenes con **proyección de
campos escalares** (sin `carrito` ni `producto`), apoyado en el índice existente
`orders(company, cliente.documento, fechaCreacion DESC)`. El backend excluye anulados/rechazados, calcula
los 4 agregados y devuelve también la página de pedidos. El frontend hace **una** llamada al abrir el
detalle del cliente y pinta tarjetas + tabla. Sin colección nueva, sin dual-write, sin índices nuevos.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 009 in-review antes del plan |
| II — Spec captura intent | sí | criterios EARS testeables |
| IV — Idempotencia | n/a | endpoint de solo lectura, sin efectos |
| V — Eventos crudos antes de procesar | n/a | no hay ingest de eventos |
| VI — UI no acoplada a proveedor | sí | feature interna, sin proveedor externo |
| VII — Observabilidad | sí | log estructurado con conteos (§5.3 spec) |
| VIII — Test-first contratos | sí | contract tests del endpoint antes del happy path (§6) |
| IX — Estilo Angular | sí | HTTP vía servicio (`BaseService`), no `HttpClient` en componente; SCSS plano con `border-left` |
| X — Seguridad webhooks | n/a | no hay webhook |
| XI — Datos sensibles fuera del log | sí | documento parcial/hash en logs, sin PII completa |

Sin "no" que requiera enmienda. (Lectura de `orders` sin spec de 360 no aplica: no se cambia comportamiento de creación/edición — Art. del 360 sólo cubre escritura/flows.)

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular)**: módulo de clientes, componente de detalle (`components/ventas/clientes/clientes.component.*`). Nueva sección de tarjetas + tabla de pedidos. Consumo vía método nuevo en `VentasService` (extiende `BaseService`).
- **Backend**: nueva función `getCustomerSummary` en `controllers/orders.js` + ruta `GET /customer-summary` en `routers/orders.js` (middleware `auth`).
- **Almacenamiento**: lectura de `orders` con `.select(...)` (proyección). Reutiliza índice existente.
- **Cola/eventos**: ninguno.

### 3.2 Diagrama (texto)
```
[Detalle Cliente] --(1 GET /v1/orders/customer-summary?documento=X&page=1)--> [orders.getCustomerSummary]
   query: where company==hdr AND cliente.documento==X orderBy fechaCreacion desc
          .select(totalPedididoConDescuento, estadoProceso, estadoPago, fechaCreacion, nroPedido)
   compute en memoria: excluir {Rechazado,Cancelado} -> sum, count, avg, last, slice(page)
   <-- { metricas, pedidos, meta }
[Detalle Cliente] pinta tarjetas (avg, total, última, #pedidos) + tabla paginada
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Query proyectada con `.select()` escalar | EARS §4 "sin descargar carrito/producto"; NFR perf | Traer doc completo (lento, JSON 50–100 KB) |
| Cálculo en backend (no aggregation nativa) | EARS exclusión por 2 estados (no-in + orderBy no combinan bien) | `count()/sum()/average()` nativos: no aplican con la exclusión multi-estado |
| Excluir por strings exactos {Rechazado,Cancelado} en estadoProceso/estadoPago | Apéndice A: no existe "Anulado"; "Cancelado" real | `not-in` en query (índice nuevo + límites de Firestore) |
| Unir por `cliente.documento` | Apéndice A: 99.3% cobertura, numero_identificacion 0% | Unir por email/numero_identificacion (sin datos) |
| Leer todas las órdenes del cliente y paginar en memoria | Agregados necesitan el set completo; payload escalar es liviano | Doble query (lista paginada + aggregation): más viajes, inconsistencia con exclusión |
| Una sola llamada del frontend | EARS "una sola llamada"; NFR perf | N requests por métrica (N+1) |

## 4. Modelo de datos

**Lectura (proyección por orden):** `totalPedididoConDescuento`, `estadoProceso`, `estadoPago`, `fechaCreacion`, `nroPedido`.

**Reglas de cómputo:**
- Excluida si `estadoProceso ∈ {Rechazado, Cancelado}` **o** `estadoPago ∈ {Cancelado, Rechazado}`.
- `total` por orden = `Number(totalPedididoConDescuento)` si es numérico; si no, `0` y `meta.totalesInvalidos++`.
- `valorTotal` = Σ total elegibles. `totalPedidos` = nº elegibles. `ticketPromedio` = `totalPedidos ? valorTotal/totalPedidos : 0`.
- `ultimaCompra` = primer elegible en orden `fechaCreacion desc` (`{valor, fecha, nroPedido}`), o `null`.

## 5. Contratos (API)

### Endpoint
`GET /v1/orders/customer-summary` — middleware `auth`.
- Headers: `company` (lo agrega el interceptor del frontend), `Authorization`.
- Query: `documento` (requerido, string), `page` (default 1), `pageSize` (default 20, máx 100).

### Respuesta 200
```json
{
  "documento": "1020433874",
  "metricas": {
    "ticketPromedio": 994320,
    "valorTotal": 38778471,
    "ultimaCompra": { "valor": 356800, "fecha": "2026-06-10T...", "nroPedido": "DAD-001234" },
    "totalPedidos": 39
  },
  "pedidos": {
    "page": 1, "pageSize": 20, "total": 39,
    "items": [
      { "nroPedido": "DAD-001234", "fechaCreacion": "2026-06-10T...", "estadoProceso": "Entregado", "estadoPago": "Aprobado", "total": 356800 }
    ]
  },
  "meta": { "procesados": 41, "excluidos": 2, "totalesInvalidos": 0 }
}
```

### 5.1 Idempotencia
- Solo lectura; sin efectos secundarios. Repetir la llamada es seguro.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | OK (incluye cliente sin pedidos: métricas en 0, items []) | objeto resumen |
| 400 | `documento` ausente/vacío o `pageSize` fuera de rango | `{ error }` |
| 401/403 | sin auth / sin company en contexto | (middleware `auth`) |
| 500 | fallo de consulta | `{ error, details }` |

## 6. Estrategia de testing
- **Contract tests (primero)**: forma de respuesta y status (200 happy, 200 cliente sin pedidos, 400 sin documento).
- **Unit (lógica de cómputo)**: exclusión de estados (incluye `[object Object]` que NO debe excluirse), total inválido → 0 + `meta.totalesInvalidos`, avg con 0 pedidos, selección de última compra.
- **Integration**: contra Firestore emulator con un cliente sembrado (varias órdenes + 1 cancelada + 1 rechazada).
- **E2E (frontend)**: abrir detalle de cliente → una sola request → tarjetas y tabla con valores esperados; estado de error aislado.

## 7. Fases de implementación
1. **Fase A** — `getCustomerSummary` (controller) + ruta con `auth`; validación de `documento`/paginación.
2. **Fase B** — contract tests + unit de la lógica de cómputo (test-first).
3. **Fase C** — happy path: query proyectada + cómputo + paginación en memoria.
4. **Fase D** — manejo de errores (400/500) + casos borde (sin pedidos, totales inválidos, basura de estado).
5. **Fase E** — log estructurado con conteos (procesados/excluidos/totalesInvalidos), sin PII.
6. **Fase F** — UI: método en `VentasService`, tarjetas (avg, total, última, #pedidos) + tabla paginada, skeleton y estado de error.
7. **Fase G** — rollout detrás de feature flag; verificar p95 con clientes reales (ALMARA FELICIDAD tiene clientes con 90–130 pedidos).

## 8. Plan de rollout
- **Feature flag**: `feature.customerMetrics` (frontend), dueño: jlbatty. Retiro tras 2 semanas estable.
- Dark launch del endpoint (desplegado pero UI tras flag) → activar para usuarios internos → 100%.
- **Rollback**: apagar flag (oculta la sección). El endpoint es read-only, sin migración que revertir.

## 9. Riesgos técnicos
- RT-01: Cliente con miles de pedidos → muchas lecturas escalares por request. Mitigación: paginación + límite de monitoreo; si escala, denormalizar contadores (otra spec). Ver R-04 spec.
- RT-02: `fechaCreacion` mezcla string ISO y Timestamp → ordenamiento/serialización inconsistente. Mitigación: normalizar a ISO en la respuesta.
- RT-03: Interceptación TLS local impide correr scripts/seed contra prod desde la máquina; usar emulator para tests (ver memoria de entorno).
- RT-04: La basura `"[object Object]"` en estados NO se excluye (no matchea strings exactos) → contaría como válido. Aceptado; se monitorea con `meta`.

## 10. Open questions (técnicas)
- ¿`pageSize` máximo 100 es suficiente, o la tabla usará scroll infinito? (no bloquea; default 20).
- ¿El detalle de cliente actual siempre tiene el `documento` disponible al abrir? Confirmar en `clientes.component.ts` antes de cablear la UI (Fase F).
