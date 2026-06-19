# Tasks 009 — Métricas de cliente en el detalle de cliente

> Estado: **in-progress**
> Vinculado a `plan.md` (estado: draft).
> Última actualización: 2026-06-18

> **Progreso 2026-06-18:** T-00..T-06 ✅ hechas (backend completo + 15 tests verdes: 10 unit `computeCustomerSummary.test.js` + 5 contract `customerSummary.contract.test.js`; service + modelo frontend). T-08/T-09 ✅ implementadas (subcomponente `app-customer-metrics` + flag `ENABLE_CUSTOMER_METRICS` + inserción en ficha). T-07 verificada: `documento` disponible vía `datos?.documento` en ficha `*ngIf="encontrado"`. Pendiente: validar build frontend, T-04 contra emulator (hecho con fake DB), T-10 medición p95 en prod.

## Convenciones
- `[P]` = tarea paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea debe ser shippable de forma independiente o bloquear de forma explícita.
- **Regla dura de esta feature:** solo LECTURA de `orders`. Ninguna tarea escribe en `orders` ni modifica funciones existentes; el código nuevo es aditivo.

## Tareas

### T-00 — Confirmar ubicación del código nuevo (decisión) `[P]`
- **Input:** plan §3.1, preferencia del usuario sobre aislamiento.
- **Output:** decisión: agregar a `controllers/orders.js` + `routers/orders.js` (convencional) **o** crear `controllers/customerMetrics.js` + `routers/customerMetrics.js` aislados.
- **Criterio de éxito:** decisión registrada en CONTRACT.md (D-XXX). Por defecto: agregar a orders (aditivo).
- **Archivos a tocar:** `specs/CONTRACT.md`.
- **Dependencias:** ninguna.

### T-01 — Función de cómputo pura `computeCustomerSummary(orders, {page, pageSize})` `[P]`
- **Input:** array de órdenes proyectadas (`totalPedididoConDescuento, estadoProceso, estadoPago, fechaCreacion, nroPedido`).
- **Output:** `{ metricas, pedidos, meta }` según plan §5. Sin I/O (testeable en aislamiento).
- **Criterio de éxito:** excluye `{Rechazado,Cancelado}` en estadoProceso/estadoPago; total inválido→0 + `meta.totalesInvalidos++`; `ticketPromedio`=0 si no hay pedidos; `ultimaCompra`=primer elegible por `fechaCreacion desc` o null; normaliza `fechaCreacion` a ISO; pagina sin recalcular agregados.
- **Archivos a tocar:** helper en `functions/services/` (ej. `customerMetricsService.js`).
- **Dependencias:** ninguna.

### T-02 — Unit tests de la lógica `[P]` (deps: T-01)
- **Input:** T-01.
- **Output:** suite unit con casos: happy, cliente sin pedidos, 1 cancelada + 1 rechazada excluidas, total no numérico, `"[object Object]"` NO excluido, paginación.
- **Criterio de éxito:** todos verdes; cobertura de los criterios EARS de §4.
- **Archivos a tocar:** `functions/tests/customerMetrics/computeCustomerSummary.test.js`.
- **Dependencias:** T-01.

### T-03 — Endpoint `getCustomerSummary` + ruta (deps: T-00, T-01)
- **Input:** decisión T-00, helper T-01.
- **Output:** `GET /v1/orders/customer-summary` con middleware `auth`; lee `company` del header, `documento`/`page`/`pageSize` de query; query proyectada con `.select()` y `orderBy fechaCreacion desc`; delega cómputo a T-01.
- **Criterio de éxito:** 200 happy; 200 cliente sin pedidos (métricas 0, items []); 400 si falta `documento` o `pageSize` fuera de rango; multi-tenant por `company`; NO descarga carrito.
- **Archivos a tocar:** `controllers/orders.js` (o `customerMetrics.js` según T-00) + `routers/orders.js`.
- **Dependencias:** T-00, T-01.

### T-04 — Contract tests del endpoint (deps: T-03)
- **Input:** T-03.
- **Output:** tests de forma de respuesta + status (200 happy, 200 sin pedidos, 400 sin documento) contra Firestore emulator con cliente sembrado (varias órdenes + 1 cancelada + 1 rechazada).
- **Criterio de éxito:** schema y status conformes al plan §5; exclusión verificada end-to-end.
- **Archivos a tocar:** `functions/tests/customerMetrics/customerSummary.contract.test.js`.
- **Dependencias:** T-03.

### T-05 — Observabilidad (deps: T-03)
- **Input:** T-03.
- **Output:** log estructurado con `company`, `documento` parcial/hash, `procesados`, `excluidos`, `totalesInvalidos`. Sin PII completa.
- **Criterio de éxito:** log emitido en cada llamada; sin documento completo ni datos sensibles en el log.
- **Archivos a tocar:** mismo controller de T-03.
- **Dependencias:** T-03.

### T-06 — Método en `VentasService` `[P]` (deps: T-03)
- **Input:** contrato del endpoint.
- **Output:** `getCustomerSummary(documento, page?, pageSize?)` en `VentasService` (extiende `BaseService`, sin `HttpClient` directo).
- **Criterio de éxito:** retorna el tipado del resumen; el interceptor agrega `company`/auth.
- **Archivos a tocar:** `src/app/shared/services/ventas/ventas.service.ts` + interfaz `CustomerSummary` (modelo).
- **Dependencias:** T-03.

### T-07 — Confirmar disponibilidad de `documento` en detalle de cliente `[P]`
- **Input:** `clientes.component.ts`.
- **Output:** confirmación de que al abrir el detalle se tiene el `documento` del cliente (open question plan §10).
- **Criterio de éxito:** punto donde disparar la carga identificado; si falta documento, definir fallback.
- **Archivos a tocar:** (solo lectura/análisis) `src/app/components/ventas/clientes/clientes.component.ts`.
- **Dependencias:** ninguna.

### T-08 — UI: tarjetas + tabla en el detalle de cliente (deps: T-06, T-07)
- **Input:** servicio T-06, punto de carga T-07.
- **Output:** sección con 4 tarjetas (ticket promedio, valor total, última compra, # pedidos) + tabla paginada de pedidos (nro, fecha, estado, valor). Skeleton al cargar; estado de error aislado.
- **Criterio de éxito:** una sola request al abrir; SCSS plano con `border-left` de acento (sin gradientes); accesible (labels/aria, moneda localizada); error no tumba el resto del detalle.
- **Archivos a tocar:** `clientes.component.html/ts/scss` (o subcomponente nuevo `customer-metrics`).
- **Dependencias:** T-06, T-07.

### T-09 — Feature flag + rollout (deps: T-08)
- **Input:** UI T-08.
- **Output:** `feature.customerMetrics` que oculta/muestra la sección. Endpoint desplegado (dark) antes de activar UI.
- **Criterio de éxito:** flag apagado = sección oculta y sin requests; encender para internos → 100%. Rollback = apagar flag.
- **Archivos a tocar:** config de flags del frontend + `clientes.component`.
- **Dependencias:** T-08.

### T-10 — Validación de performance en datos reales (deps: T-03)
- **Input:** endpoint desplegado.
- **Output:** medición p95 con clientes de ALMARA FELICIDAD (algunos con 90–130 pedidos).
- **Criterio de éxito:** p95 ≤ 800 ms; si excede, registrar y evaluar denormalización (otra spec).
- **Archivos a tocar:** ninguno (medición). Opcional: anotar en CONTRACT.md.
- **Dependencias:** T-03.

## Orden de ejecución sugerido
1. T-00, T-01, T-07 en paralelo (`[P]`).
2. T-02 al terminar T-01.
3. T-03 al terminar T-00 + T-01.
4. T-04 y T-05 al terminar T-03; T-06 en paralelo.
5. T-08 al terminar T-06 + T-07.
6. T-09 al terminar T-08.
7. T-10 tras desplegar T-03.

## Definition of Done
- Contract tests + unit verdes (T-02, T-04).
- Verificación de constitución sin "no" pendientes (plan §2).
- Observabilidad emitiendo en staging (T-05).
- p95 ≤ 800 ms verificado (T-10).
- `CONTRACT.md` actualizado con D-XXX (T-00) y cualquier desvío.
- Confirmado: cero escrituras a `orders`; solo código aditivo.
- Spec/plan a `approved` (sin cambios) o `superseded` (si cambian).
