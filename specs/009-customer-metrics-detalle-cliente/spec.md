# Spec 009 — Métricas de cliente en el detalle de cliente

> Estado: **in-review**
> Autor(es): jlbatty (con Claude)
> Última actualización: 2026-06-18

## 1. Contexto / Por qué
En la consulta individual de un cliente (módulo de clientes) no hay visión de su valor comercial.
El equipo necesita ver, al abrir un cliente, su comportamiento de compra. Un primer intento resultó
muy lento porque obligaba a leer las órdenes completas (carrito + producto anidado, 50–100 KB c/u).
Esta spec define la feature y su contrato de performance para que cargue rápido sin tocar el JSON pesado.

## 2. Objetivo de negocio
Al abrir el detalle de un cliente, el usuario ve en ≤1.5 s cuatro métricas correctas de ese cliente y la
lista de sus pedidos, calculadas sobre todas sus órdenes excepto las anuladas/rechazadas.

## 3. User stories
- Como **asesor/administrador** quiero ver el **valor promedio de transacción** de un cliente para dimensionar su ticket típico.
- Como **asesor/administrador** quiero ver el **valor total comprado (histórico)** de un cliente para conocer su valor de vida.
- Como **asesor/administrador** quiero ver el **valor y fecha de su última compra** para saber qué tan reciente/activo es.
- Como **asesor/administrador** quiero ver la **lista de pedidos relacionados** (con su número, fecha, estado y valor) para revisar su historial sin abrir cada orden.

## 4. Criterios de aceptación (notación EARS)

- WHEN el usuario abre el detalle de un cliente identificado por su documento THE system SHALL devolver: valor promedio de transacción, valor total histórico, valor y fecha de la última compra, cantidad de pedidos y la primera página de pedidos relacionados.
- THE system SHALL incluir en los cuatro cálculos **todos** los pedidos del cliente **excepto** los que estén anulados o rechazados.
- WHERE un pedido tenga `estadoProceso` en {`Rechazado`,`Cancelado`} o `estadoPago` en {`Cancelado`,`Rechazado`} THE system SHALL excluirlo de métricas y de la lista.
- THE system SHALL ordenar los pedidos relacionados del más reciente al más antiguo.
- WHEN un cliente no tiene pedidos elegibles THE system SHALL devolver métricas en cero y lista vacía (sin error).
- IF el valor total de un pedido elegible está ausente o no es numérico THEN THE system SHALL tratarlo como 0 en las sumas y registrarlo como dato a revisar (no romper el cálculo).
- THE system SHALL calcular las métricas **sin descargar el detalle del carrito ni de los productos** de las órdenes.
- THE system SHALL devolver el resumen en **una sola** llamada del frontend al backend.
- WHERE la lista de pedidos relacionados exceda el tamaño de página THE system SHALL paginarla sin recalcular los agregados.

## 5. Requisitos no funcionales

### 5.1 Performance
- Latencia p95 del endpoint de resumen ≤ 800 ms para clientes con ≤ 500 pedidos.
- El payload de cálculo por pedido NO incluye `carrito` ni `producto` (solo campos escalares).
- Reutiliza el índice existente `orders(company, cliente.documento, fechaCreacion DESC)`; no requiere índices nuevos.

### 5.2 Seguridad
- El endpoint exige autenticación y filtra por `company` del contexto (multi-tenant). Un cliente de una empresa nunca expone datos de otra.
- El `documento` recibido se sanitiza/valida antes de la consulta.

### 5.3 Observabilidad
- Log estructurado con company, documento (hash o parcial), nº de pedidos procesados, nº de excluidos y nº de pedidos con total inválido. Sin volcar PII completa en logs.

### 5.4 Accesibilidad (UI)
- Las tarjetas de métricas son legibles por lector de pantalla; estado de carga (skeleton) anunciado; formato de moneda localizado.

### 5.5 Resiliencia
- Si la consulta falla, la UI muestra estado de error en la sección de métricas sin tumbar el resto del detalle del cliente.

## 6. Out of scope (explícito)
- Mostrar estas métricas en el **listado** de clientes (sería N agregaciones; se evaluaría denormalizar contadores en otra spec).
- Gráficas/series temporales de compra.
- Métricas que requieran abrir el detalle del carrito (productos más comprados, etc.).
- Recalcular/normalizar los totales históricos de órdenes (se usa el valor guardado, validado al 99.9%).
- Cambios al comportamiento de creación/edición de órdenes (no se toca el 360).

## 7. Dependencias
- Colección `orders` y campo persistido `totalPedididoConDescuento`.
- Llave de unión `orders.cliente.documento` ↔ documento del cliente.
- Detalle de cliente existente en el módulo de clientes (donde se inyecta la UI).

## 8. [NEEDS CLARIFICATION] — RESUELTO (2026-06-18)
- [x] Tamaño de página de la lista de pedidos relacionados → **20** por página.
- [x] La "última compra" se determina por **`fechaCreacion`** del pedido (no fecha de entrega).
- [x] Contador de pedidos excluidos (anulados/rechazados) → **no se muestra en v1** (out of scope, ver §6).

## 9. Riesgos identificados
- R-01: **Órdenes huérfanas sin documento** (~0.7%: 34/5000 sin llave, 29 con string vacío). Esos pedidos no se asociarán a ningún cliente. Aceptable; se documenta.
- R-02: **Totales no fiables en casos raros** (~0.1%: 3 ausentes, 4 no numéricos en 5000). Mitigado por el criterio EARS de tratar como 0 + log.
- R-03: **Basura de datos `"[object Object]"`** en `estadoProceso`/`estadoPago` (4 casos). El filtro por strings exactos los deja FUERA del set de exclusión, por lo que contarían como válidos; impacto mínimo, se monitorea.
- R-04: Clientes con miles de pedidos elevarían lecturas. Mitigado: campos escalares + paginación de la lista; si se vuelve problema, denormalizar contadores (otra spec).

## 10. Métricas de éxito post-launch
- p95 del endpoint ≤ 800 ms en la primera semana.
- 0 incidencias de cruce de datos entre empresas.
- Tasa de error del endpoint < 1% en ventana de 7 días.

---

## Apéndice A — Hallazgos de verificación read-only (2026-06-18, muestra 5000 órdenes recientes)
- `totalPedididoConDescuento`: 99.9% presente y numérico (4991 > 0; 3 ausentes; 4 no numéricos).
- `cliente.documento`: 99.3% presente; `cliente.numero_identificacion`: 0% → unir por `documento`.
- Estados observados:
  - `estadoProceso`: Entregado, Despachado, Cerrado, SinProducir, ProducidoParcialmente, ParaDespachar, EnDespacho, Empacado, ProducidoTotalmente, EnProduccion, **Rechazado (12)**, **Cancelado (4)**, `[object Object]` (4).
  - `estadoPago`: Aprobado, PreAprobado, Pendiente, Pagado, **Cancelado (192)**, **Rechazado (5)**, `[object Object]` (4).
- Índice `orders(company, cliente.documento, fechaCreacion DESC)` ya existe (firestore.indexes.json:1846).
- Script: `functions/scripts/verify_customer_metrics_readonly.js` (read-only).

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
