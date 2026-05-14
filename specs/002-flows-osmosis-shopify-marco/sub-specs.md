# Sub-specs hijas de 002 — Plan de ejecución del 360

> Cada sub-spec se desarrolla en su propia carpeta `/specs/002.N-slug/spec.md` cuando se trabaje. Esta página es el roadmap maestro.

---

## Orden de ejecución (con razón)

```
002.2 (instrumentar errores) ──┐
                                ├──► 002.4 (fix bodega + inventario)
002.1 (migración a inglés)     │
   ├─ Fase 0-2 (audit + write) │
   ├─ Fase 3 (lectores)        │
   └─ Fase 4 (cleanup) ────────┤
                                │
                                ├──► 002.5 (consolidar flows)
                                │
                                ├──► 002.3 (resiliencia runs)
                                │
                                └──► 002.6 (tests end-to-end + cierre 360)
```

Razón: **002.2 primero** porque sin instrumentación de errores no podemos validar nada de lo demás. Luego **002.1 fases 0-2 en paralelo con 002.4** porque son independientes (compat layer + fix bodega no se pisan). Luego cierre.

---

## 002.1 — `migrate-to-english-integrations`

**Problema**: 8,219/8,311 productos OH MY STORE con AMBOS campos `integraciones` y `integrations`, schemas distintos. 16 órdenes con divergencia menor. Multiples nodos /flows escribiendo en idioma inconsistente.

**Decisión** (CONTRACT.md D-009): canónica = inglés (`integrations.<provider>.*`).

**Fases del plan staged**:

1. **Fase 0 — Audit exhaustivo**
   - Grep TODO el repo (back+front+scripts+queries) buscando `integraciones.` y `integrations.` con archivo:línea.
   - Para cada hit: clasificar (escritura/lectura/query), proveedor, archivo crítico vs script descartable.
   - Definir schema unificado por proveedor: `osmosis`, `shopify`, `aliaddo`, `woocommerce`, `siigo`, etc. Ejemplo Osmosis: `{ id: number, reference: string, nodeSlug: string, syncedAt: ISO, status: enum, isPushed: bool, ... }`.
   - Output: tabla en sub-spec con cada lugar a tocar.

2. **Fase 1 — Compat layer (escribir en ambos idiomas)**
   - Servicios oficiales escriben en `integrations.X` (nuevo) Y siguen escribiendo en `integraciones.X` (viejo) durante la transición.
   - Helper `writeIntegrationField(doc, provider, payload)` que hace ambas escrituras en un solo lugar.
   - Cero impacto operativo: los lectores actuales siguen funcionando.

3. **Fase 2 — Backfill consciente**
   - Script que recorre `products` y `orders` y para cada doc:
     - Si tiene solo `integraciones.X`: copiar a `integrations.X` con conversión de tipos (`id: number → string`, `lastSync: Timestamp → syncedAt: ISO`, etc.) según schema unificado.
     - Si tiene solo `integrations.X` (los Aliaddo): no tocar.
     - Si tiene ambos: validar schema unificado, mergear con prioridad campos del más reciente, escribir resultado en `integrations.X`.
   - Dry run primero. Reporte de docs procesados y conflictos.
   - Datos quedan coherentes en ambos campos.

4. **Fase 3 — Migrar lectores**
   - Frontend (`ventas/list:518`, `tracking-details-modal`, `osmosis-order-extras`, etc.): leer `integrations` con fallback a `integraciones`.
   - Backend services y queries: igual.
   - Cero rollback risk: los datos están en ambos lados.

5. **Fase 4 — Cleanup**
   - Servicios y nodos dejan de escribir en español.
   - Script borra campo `integraciones.*` de todos los docs.
   - Frontend deja de tener fallback.
   - Constitución y CONTRACT.md actualizados.

**Criterios EARS clave**:
- THE system SHALL escribir solo en `integrations.<provider>.*` post-fase 4.
- IF un lector encuentra solo `integraciones.<provider>` y no `integrations.<provider>`, THEN durante fase 3 SHALL leer del español; post-fase 4 SHALL escalar como bug.
- THE system SHALL preservar 100% de los datos en el backfill (zero data loss).

**Riesgos**: Aliaddo (83 prods solo en EN). Validar que el schema unificado los respeta. No tocar los UUIDs externos.

---

## 002.2 — `flow-runs-error-instrumentation`

**Problema**: 25/200 runs con `status: 'failed'` y `errors: []` vacío. Imposible debuggear. Verificado ejecutando `test-run` de `shopify-orders-to-cereza-7e6ab5a3`: el mapper falló y `nodeStates.mapper.error` quedó undefined.

**Implementación**:
- Modificar `services/flows/flowEngine.js` (o el handler de ejecución de nodo) para que cualquier excepción capture:
  ```js
  nodeState.error = {
    code: e.code || 'UNKNOWN',
    message: e.message,
    stack: (e.stack || '').substring(0, 2000),
    name: e.constructor.name,
  };
  nodeState.status = 'failed';
  nodeState.finishedAt = new Date().toISOString();
  ```
- Agregar también al `flow_run.errors[]` con `nodeId`, attempt, timestamp.
- Test: ejecutar el mismo `test-run` que ya falla y verificar que el error sale.

**Out of scope**: alertas / dashboards / Slack notifications. Solo capturar.

**Criterios EARS**:
- WHEN un nodo lanza excepción, THE system SHALL guardar `error.message`, `error.code`, `error.stack` en `nodeStates[nodeId].error`.
- THE system SHALL agregar entry en `flow_run.errors[]` con timestamp ISO y `nodeId`.

---

## 002.3 — `flow-runs-resilience-vs-restart`

**Problema**: Causa raíz de los `failed` confirmados: `BACKEND_RESTART → zombie`. Los runs en memoria mueren cuando Cloud Functions se recicla.

**Opciones**:
- **A. Quick win**: reducir ventana de detección de zombie de 30min a 3min. Reintentar automáticamente al menos 1 vez.
- **B. Estructural**: persistir checkpoint por nodo en `flow_runs.nodeStates[id].checkpointData`. Al detectar zombie, reanudar desde último checkpoint OK en lugar de re-ejecutar desde cero.
- **C. Migrar a Pub/Sub**: cada nodo es un mensaje, sobrevive reinicios nativamente. Mucho trabajo, fuera del 360 inmediato.

**Decisión sugerida**: **A + B** para el 360. **C** queda como deuda futura.

**Criterios EARS**:
- IF un `flow_run` está en `running` por más de 3 min sin actualizar `lastHeartbeatAt`, THEN THE system SHALL marcarlo como `zombie` y reintentar.
- THE system SHALL persistir `checkpointData` por nodo después de cada `success`. WHEN se reintenta un zombie, SHALL reanudar desde el siguiente nodo no-completado.

---

## 002.4 — `shopify-to-cereza-bodega-y-inventario`

**Problema doble**:
1. `shopify-orders-to-cereza-7e6ab5a3` mapea `bodegaId: "BOD-010"` (no existe en `warehouses`).
2. El mismo flow no tiene nodo `katuq-inventory-adjust` después del push a Osmosis. El stock de Katuq no se descuenta.

**Implementación**:
- En el flow doc Firestore (o vía script de fix), cambiar el mapper:
  ```diff
  - "bodegaId": "BOD-010"
  + "bodegaId": "BOD-CEREZA-1"
  ```
- Agregar nodo `katuq-inventory-adjust` entre `osmosis` y final del flow:
  ```json
  {
    "id": "inventory-adjust",
    "type": "katuq-inventory-adjust",
    "params": {
      "operation": "delta",
      "delta": "-{{ item.cantidad }}",
      "idBodega": "BOD-CEREZA-1",
      "productoIdField": "producto.cd"
    }
  }
  ```
- Validar con test-run que stock se descuenta.
- Backfill (decisión separada): ¿qué hacer con las órdenes ya pusheadas que no descontaron stock? Probablemente nada (datos pasados quedan como están).

**Criterios EARS**:
- THE system SHALL configurar `bodegaId: 'BOD-CEREZA-1'` en pedidos pushed a Cereza desde el flow Shopify→Cereza.
- WHEN se ejecuta `osmosis-order-create` con éxito, THE system SHALL descontar stock equivalente del inventario `BOD-CEREZA-1` por cada item del pedido.
- IF el descuento de stock falla, THEN THE system SHALL registrar el error en la orden pero NO revertir el push (Osmosis ya recibió).

---

## 002.5 — `consolidar-flows-shopify-to-osmosis`

**Problema**: dos flows hacen lo mismo:
- `shopify-orders-to-cereza-7e6ab5a3` (active, 5 nodos, v17, hace todo el pipeline)
- `shopify-orders-to-osmosis` (inactive, 3 nodos, v1, asume orden ya creada)

**Decisión recomendada**: archivar el inactive (renombrar `shopify-orders-to-osmosis-DEPRECATED-2026-05-13`), mantener el active como única fuente. Documentar en sub-spec por qué se eligió.

**Criterios EARS**:
- THE system SHALL tener UN único flow activo para el flujo Shopify→Cereza por empresa.
- IF se necesita un comportamiento adicional, SHALL extender el flow existente, no duplicar.

---

## 002.6 — `cierre-360-aceptacion-operativa`

**Problema**: cómo verificar que el 360 está cerrado de verdad. Sin tests sistémicos no se sabe.

**Plan**:
- Construir 8 tests end-to-end ejecutables contra OH MY STORE (no producción de otros tenants):
  1. Webhook entrante: simular evento Cereza con cambio de estado, verificar persistencia + actualización de orden.
  2. Webhook entrante: simular `delivered` con `evidence.url`, verificar `evidenciasEntrega[]` poblado.
  3. Push outbound: crear orden Shopify simulada `paid`, verificar push a Cereza con `BOD-CEREZA-1` y `isPushed: true`.
  4. Push outbound: reenviar la misma orden, verificar idempotencia (no doble push).
  5. Sync productos: triggerear `osmosis-product-changed`, verificar producto en Katuq + Shopify.
  6. Inventario: verificar que push de orden descuenta stock de `BOD-CEREZA-1`.
  7. Migración inglés: verificar que cualquier orden/producto nuevo tiene `integrations.<provider>` y NO `integraciones`.
  8. Resiliencia: matar el backend mientras corre un flow, verificar que se reanuda en <5min.
- Cada test pasa o falla con criterio binario.
- Reporte de ejecución en `findings.md` actualizado.

**Sello**: cuando los 8 tests pasen, marcar spec 002.* como `done`. CONTRACT.md sella D-360-CLOSED.
