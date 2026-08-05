# Diseño: ciclo de pedido e inventario

## Context

Existen dos caminos principales:

```text
Venta Asistida → crear pedido Katuq → efecto inventario → Logística → proveedor
Shopify → webhook/flow → crear o actualizar pedido → pago → efecto inventario + proveedor
```

Crear una guía no equivale a vender otra vez. El inventario se relaciona con el compromiso comercial; el push al proveedor es una consecuencia logística reintentable.

## Goals / Non-Goals

**Goals:**

- Un solo efecto por línea de pedido y transición.
- Pago tardío de Shopify cubierto.
- Despacho manual sin efecto contable duplicado.
- Fallos visibles y reintentables sin falsos despachos.

**Non-Goals:**

- Crear un nuevo motor de órdenes.
- Rediseñar la interfaz de Logística.
- Unificar todos los estados comerciales de Katuq.
- Reparar automáticamente pedidos históricos.

## Decisions

### 1. Matriz canónica del efecto

| Origen / transición | Efecto de inventario | Envío a Cereza |
|---|---|---|
| Venta Asistida o POS creado en `Pagado`, `Aprobado` o `PreAprobado` | Comprometer/descontar una vez | Manual desde Logística |
| Venta Asistida o POS creado en otro estado | Sin efecto hasta entrar al conjunto elegible | No automático |
| Shopify llega `Pagado`, `Aprobado` o `PreAprobado` | Comprometer/descontar una vez | Evaluar envío automático si además es elegible |
| Shopify llega en otro estado de pago | Sin efecto | No |
| Shopify pasa después a `Pagado`, `Aprobado` o `PreAprobado` | Comprometer/descontar una vez | Evaluar envío automático |
| Cambia entre `Pagado`, `Aprobado` y `PreAprobado` | Ningún efecto adicional | No repetir envío |
| Sale de los estados que comprometen | Liberar exactamente el efecto aplicado una vez | Procesar cancelación según proveedor |
| Crear guía o reintentar push | Ninguno | Reintento idempotente |
| Aumentar/disminuir cantidad | Solo delta | Actualizar según contrato permitido |
| Cancelar/rechazar | Liberar una vez | Cancelar/registrar según provider |

Decisión confirmada por Daniel el 2026-07-23: `Pagado`, `Aprobado` y `PreAprobado` forman el conjunto de estados que comprometen inventario. Cualquier otro estado no compromete. Entrar al conjunto descuenta una vez; permanecer dentro no vuelve a descontar; salir libera una vez únicamente si existe un efecto aplicado.

La elegibilidad del envío automático a Cereza se evalúa aparte: además del pago requiere configuración y mapping válidos. Un cambio entre estados que ya comprometen no repite el push.

### 2. Inventario y despacho tienen idempotencias diferentes

El efecto de inventario usa una clave por pedido, línea, bodega y revisión del efecto. El push usa la identidad del pedido y su operación externa. Reintentar el proveedor no vuelve a ejecutar el efecto de inventario.

Alternativa descartada: una sola clave para todo el flow. Impide distinguir un reintento logístico de un cambio legítimo de cantidad.

### 3. `orders/paid` activa la misma transición que un pedido inicialmente pagado

El bridge de Shopify debe enrutar el pago tardío al flujo canónico de “pedido listo para comprometer y despachar”. El upsert de orden, el ledger y el push validan idempotencia de forma independiente.

La implementación llama `LogisticsManager.createShipment(..., "osmosis", ...)`; no llama el API de Cereza desde el ledger ni desde el processor. El rollout se controla con `integration_configs.config.shopifyOrderLogisticsMode = off | shadow | active`, ausente equivale a `off`; `paidOrderAutoPushMode` se conserva como alias de compatibilidad. La identidad logística vive en `orders/{orderId}.logisticsEffect.osmosis`, separada de `inventoryEffect`, con claim temporal para excluir eventos concurrentes y permitir retry después de un fallo.

La cancelación usa otra huella, `orders/{orderId}.logisticsEffect.osmosisCancellation`. Si Shopify cancela mientras el push está en vuelo y aún no existe ID externo, la huella queda `waiting_for_external_id`. Al terminar el push se persiste el ID sin avanzar un pedido terminal y se ejecuta una sola cancelación externa. Crear/cancelar guía nunca escribe inventario.

### 4. Push exitoso exige confirmación externa

Un pedido solo queda enviado/despachado al proveedor cuando la respuesta válida trae su identificador externo y este se persiste. HTTP 200 con resultados parciales no basta. Un fallo deja estado de atención, error resumido y posibilidad de retry.

### 5. Bodega no mapeada o configuración incompleta falla cerrado

El cambio `osmosis-push-multibodega-carrier` debe resolver `osmosisStorageCode` y `carrier_code`. Si falta alguno, no se adivina una bodega ni se marca despacho. La operación queda pendiente con atención visible.

### 6. Cambios y reversas se calculan desde efectos aplicados

No se confía únicamente en el carrito actual. El sistema compara el efecto ya registrado por línea con la nueva cantidad y aplica solo la diferencia. Una reversa referencia los movimientos originales.

### 7. El estado por sí solo no autoriza una devolución

La transición desde un estado que compromete hacia uno que no compromete solicita una liberación, pero Katuq solo suma unidades si encuentra el efecto aplicado de esa línea. Un pedido pendiente que nunca descontó puede cancelarse sin crear una entrada ficticia. La reversa usa su propia llave idempotente y enlaza los movimientos originales.

### 8. El ciclo de inventario no escribe maestros ni precios

Los datos del producto contenidos en el pedido sirven como referencia de la línea. Este cambio no actualiza `products`, variantes, categorías, imágenes, disponibilidad comercial ni precios. Tampoco recalcula listas de precios. Cualquier sincronización de catálogo permanece en su flujo y cambio OpenSpec propios.

### 9. La huella aplicada vive dentro del pedido

`orders/{orderId}.inventoryEffect` conserva versión, revisión deseada, routing, asignaciones realmente aplicadas y movimientos de la última operación. No es una reserva adicional ni otro saldo. El pedido, `inventory` e `inventoryMovement` confirman dentro de una sola transacción; si una escritura falla, ninguna queda aplicada.

La revisión usa únicamente empresa, pedido, elegibilidad, producto, cantidad y routing. Títulos, precios y listas de precios no participan. Cambiar entre `PreAprobado`, `Aprobado` y `Pagado` produce la misma revisión cuando cantidades y routing no cambian.

### 10. La bodega se valida contra el maestro, no por prefijo

`idBodega` sigue siendo el código de negocio, nunca el document ID de Firestore. Sin embargo, OH MY STORE tiene códigos vigentes `001`–`005`, `PRCPL-01` y códigos `BOD-*`. Por eso no se exige el prefijo `BOD-`: se exige formato simple y coincidencia única con `warehouses.company + warehouses.idBodega`.

Un document ID de Firestore, una bodega ausente o una bodega duplicada fallan cerrado. Los valores históricos que ya no existen en el maestro se conservan como evidencia y no se remapean por parecido.

## Migration Plan

1. Incorporar fixtures/contract tests para la matriz completa sin cambiar producción.
2. Cruzar el corte lógico de OMS: pedido, movimiento, auditoría y bodega; no inferir una huella histórica solo desde el estado.
3. Habilitar el nuevo ledger en un origen a la vez.
4. OMS sombra: comparar decisión nueva vs efecto real de Venta Asistida y Shopify.
5. Canario solo con pedidos nuevos posteriores a la huella, o pedidos históricos cuya aplicación se haya probado movimiento por movimiento.
6. Canario Shopify pagado inicialmente; después pago tardío; después Venta Asistida y cambios/reversas.
7. Habilitar validación fail-closed del despacho tras completar `osmosis-push-multibodega-carrier`.
8. Promover OMS solo con gates; Almacén Bombas recibe únicamente reglas neutrales aplicables.

## Rollback

Las banderas se separan por origen (`assisted_sale`, `pos`, `channel_order`, `return`) y la logística conserva su apagador independiente. Ante cualquier doble efecto o despacho sin ID, se apaga solo el origen afectado y se conserva la evidencia para conciliación.

## Risks / Trade-offs

- **Eventos fuera de orden** → decidir por transición persistida, no por orden de llegada.
- **Pedido pagado con push fallido consume stock** → mantener compromiso y alertar; liberarlo permitiría sobreventa.
- **Cambio de cantidad sin revisión estable** → construir operation ID desde el efecto anterior y el nuevo, con prueba de duplicados.
- **Respuesta parcial de Logística** → evaluar por pedido y no cerrar el lote como éxito global.
- **Payload de pedido trae datos de catálogo** → tratarlos como snapshot de la venta; nunca como autorización para sobrescribir producto o precio.
- **Pedidos históricos sin huella** → no inicializar desde el estado; cruzar movimientos y auditoría o excluirlos del canario.

## Open Questions

No quedan preguntas sobre el momento de compromiso y liberación del inventario. Sigue pendiente confirmar con Cereza el valor real de `defaultCarrierCode` de OH MY STORE; sin ese dato y sin canario autorizado, `shopifyOrderLogisticsMode` permanece `off`.
