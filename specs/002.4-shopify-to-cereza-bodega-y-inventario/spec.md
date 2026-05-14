# Spec 002.4 — Fix `BOD-010` fantasma + nodo de inventario faltante en flow Shopify→Cereza

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloquea: 002.6
> Bloqueado por: 002.2 (necesita captura de errores para validar)

## 1. Contexto / Por qué

El flow `shopify-orders-to-cereza-7e6ab5a3` (active, v17) tiene DOS bugs operativos confirmados:

**Bug A — `bodegaId: "BOD-010"` HARDCODEADO en mapper**:
```json
{
  "id": "mapper",
  "type": "katuq-canonical-mapper",
  "params": {
    "mapping": {
      "bodegaId": "BOD-010",  // ← bodega que NO existe en warehouses
      ...
    }
  }
}
```

`BOD-010` no aparece en las 11 bodegas de OH MY STORE. Las órdenes Shopify se persisten con un idBodega fantasma. El flujo target (D-010) dice que estos pedidos deben surtir desde `BOD-CEREZA-1` (bodega virtual Osmosis).

**Bug B — Falta nodo de descuento de inventario**:

Nodos del flow:
```
trigger → mapper → product-resolver → persist → osmosis
```

NO hay `katuq-inventory-adjust`. Cuando se vende por Shopify y se mete a Cereza, **el stock de Katuq no se descuenta**. Si llega otro pedido por el mismo SKU, Katuq sigue creyendo que tiene el inventario completo. Operativamente: **se sobre-vende**.

## 2. Objetivo de negocio

Cuando un pedido Shopify se pushea a Cereza para despacho, queda registrado contra `BOD-CEREZA-1` Y el stock virtual de Cereza en Katuq se descuenta de manera consistente.

## 3. User stories

- **US-1.** Como **operador**, quiero que cada pedido Shopify enviado a Cereza aparezca asignado a la bodega correcta (`BOD-CEREZA-1`), para no romper reportes.
- **US-2.** Como **administrador de catálogo**, quiero que el stock virtual de Cereza en Katuq refleje las ventas, para que no se vendan productos sin stock.

## 4. Criterios de aceptación EARS

### Bodega
- **AC-01.** WHEN el flow `shopify-orders-to-cereza-7e6ab5a3` procesa un pedido Shopify, THE system SHALL persistir la orden Katuq con `bodegaId: 'BOD-CEREZA-1'`.
- **AC-02.** IF la orden Shopify ya tiene un `bodegaId` asignado por otro proceso, THEN THE system SHALL NO sobrescribir si el valor es válido en `warehouses`. Si es `BOD-010` u otro valor inválido, SHALL corregir a `BOD-CEREZA-1`.

### Inventario
- **AC-03.** WHEN el nodo `osmosis-order-create` ejecuta con éxito (orden creada en Cereza), THE system SHALL ejecutar inmediatamente `katuq-inventory-adjust` con operación `delta` negativo equivalente a la cantidad de cada item en `BOD-CEREZA-1`.
- **AC-04.** WHILE el descuento de stock se procesa, THE system SHALL usar transacción Firestore para garantizar atomicidad por item.
- **AC-05.** IF el descuento de stock falla para uno o más items, THEN THE system SHALL marcar el run como `partial` y registrar el error en `nodeStates.inventory-adjust.error` (depende de 002.2). NO revertir el push a Osmosis (Cereza ya recibió).
- **AC-06.** IF un item no tiene `producto.cd` o el producto no existe en `inventory` para `BOD-CEREZA-1`, THEN THE system SHALL agregar advertencia al log pero continuar con los demás items.

### Backfill
- **AC-07.** THE system SHALL identificar las órdenes Katuq existentes con `bodegaId: 'BOD-010'` y registrar su cantidad. Decisión sobre re-asignar bodega y/o descontar stock retroactivamente queda en `Out of scope` (depende de criterio operativo).

## 5. Requisitos no funcionales

### 5.1 Resiliencia
- Si el push a Osmosis es success pero el inventory-adjust falla, el sistema queda en estado coherente (orden con `isPushed: true` pero inventario no descontado). Se debe poder re-ejecutar `inventory-adjust` solo, sin reintento del push.

### 5.2 Idempotencia
- Re-ejecutar el flow con el mismo `shopifyOrderId` no descuenta stock dos veces (proteger por `inventory_movements` con clave de idempotencia compuesta `flow_run_id + nodeId + itemIndex`).

### 5.3 Observabilidad
- Cada descuento emite `inventoryMovement` doc con `tipo: 'EGRESO'`, `motivo: 'Venta Shopify → Cereza'`, `referenciaPedido: nroPedido`.

## 6. Out of scope

- Backfill de stock para órdenes históricas con `BOD-010` (decisión operativa separada).
- Migrar otras integraciones que también escriben `bodegaId` hardcodeado (verificar si las hay).
- Cambio de bodega para órdenes Aliaddo (no aplica este flow).

## 7. Plan de implementación

### Fase 1 — Verificación pre-cambio
1. Contar cuántas órdenes Katuq tienen `bodegaId: 'BOD-010'` (confirmar el daño actual).
2. Verificar que `BOD-CEREZA-1` existe en `warehouses` para OH MY STORE (✅ ya verificado en findings).
3. Verificar que la colección `inventory` tiene docs para productos Cereza en `BOD-CEREZA-1` (✅ 11,891 docs verificados).

### Fase 2 — Modificación del flow
1. Editar el doc Firestore `flows/shopify-orders-to-cereza-7e6ab5a3`:
   - En el nodo `mapper.params.mapping`, cambiar `"bodegaId": "BOD-010"` → `"bodegaId": "BOD-CEREZA-1"`.
   - Agregar nodo nuevo `inventory-adjust` después de `osmosis`:
     ```json
     {
       "id": "inventory-adjust",
       "type": "katuq-inventory-adjust",
       "position": { "x": 1200, "y": 140 },
       "params": {
         "operation": "delta",
         "deltaPath": "negative-of-cantidad",
         "idBodega": "BOD-CEREZA-1",
         "productoIdField": "producto.cd",
         "iterateField": "carrito",
         "idempotencyKey": "{{ $runId + $nodeId + $itemIndex }}"
       }
     }
     ```
   - Agregar edge `osmosis → inventory-adjust`.
   - Bumping version: v17 → v18.
3. Test-run con payload Shopify simulado. Verificar:
   - Orden creada con `bodegaId: 'BOD-CEREZA-1'`.
   - `nodeStates['inventory-adjust'].status: 'success'`.
   - Doc en `inventoryMovement` creado.
   - Doc en `inventory` con cantidad reducida.
4. Re-ejecutar el mismo payload (idempotencia): segundo run no debe descontar dos veces.

### Fase 3 — Activación
- Promover cambio a flow doc principal en producción.
- Monitor 24h: tasa de runs success/failed/partial.
- Si tasa de partial sube por inventory-adjust falla en docs sin stock previo, ajustar AC-06.

## 8. Dependencias

- **002.2** (captura de errores) ya implementada para poder validar AC-05 y AC-06.
- Nodo `katuq-inventory-adjust` existe (verificado en `services/flows/nodes/internal/katuq-inventory-adjust.action.js`).

## 9. Riesgos

- **R-01.** Si `katuq-inventory-adjust` no soporta `iterateField` para descontar por cada item del carrito, hay que adaptar params o agregar nodo `loop`. Verificar en código del nodo.
- **R-02.** Si la operación de descuento falla por race con otra venta, el partial debe poder reintentarse manualmente.
- **R-03.** Cambiar `BOD-010` → `BOD-CEREZA-1` puede romper reportes que filtran por bodega. Validar con stakeholder operativo.

## 10. Métricas de éxito

- **M-01.** 100% de pedidos Shopify nuevos tienen `bodegaId: 'BOD-CEREZA-1'` post-cambio.
- **M-02.** Cero docs `orders` nuevos con `bodegaId: 'BOD-010'` post-cambio.
- **M-03.** Stock virtual `BOD-CEREZA-1` decrece coherentemente con ventas Shopify (validar con muestra manual de 10 órdenes).
- **M-04.** Cero casos de doble descuento por re-ejecución (validar con re-runs de prueba).
