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
| Venta Asistida creada | Comprometer/descontar una vez | Manual desde Logística |
| Shopify llega pagado | Comprometer/descontar una vez | Automático |
| Shopify llega no pagado | Sin efecto hasta pago | No |
| Shopify pasa después a pagado | Comprometer/descontar una vez | Automático |
| Crear guía o reintentar push | Ninguno | Reintento idempotente |
| Aumentar/disminuir cantidad | Solo delta | Actualizar según contrato permitido |
| Cancelar/rechazar | Liberar una vez | Cancelar/registrar según provider |

La regla propuesta para Shopify no pagado es deliberada: no consume cantidad Katuq hasta confirmar pago. Requiere aprobación humana antes de generar tareas porque define disponibilidad comercial.

### 2. Inventario y despacho tienen idempotencias diferentes

El efecto de inventario usa una clave por pedido, línea, bodega y revisión del efecto. El push usa la identidad del pedido y su operación externa. Reintentar el proveedor no vuelve a ejecutar el efecto de inventario.

Alternativa descartada: una sola clave para todo el flow. Impide distinguir un reintento logístico de un cambio legítimo de cantidad.

### 3. `orders/paid` activa la misma transición que un pedido inicialmente pagado

El bridge de Shopify debe enrutar el pago tardío al flujo canónico de “pedido listo para comprometer y despachar”. El upsert de orden, el ledger y el push validan idempotencia de forma independiente.

### 4. Push exitoso exige confirmación externa

Un pedido solo queda enviado/despachado al proveedor cuando la respuesta válida trae su identificador externo y este se persiste. HTTP 200 con resultados parciales no basta. Un fallo deja estado de atención, error resumido y posibilidad de retry.

### 5. Bodega no mapeada o configuración incompleta falla cerrado

El cambio `osmosis-push-multibodega-carrier` debe resolver `osmosisStorageCode` y `carrier_code`. Si falta alguno, no se adivina una bodega ni se marca despacho. La operación queda pendiente con atención visible.

### 6. Cambios y reversas se calculan desde efectos aplicados

No se confía únicamente en el carrito actual. El sistema compara el efecto ya registrado por línea con la nueva cantidad y aplica solo la diferencia. Una reversa referencia los movimientos originales.

### 7. El ciclo de inventario no escribe maestros ni precios

Los datos del producto contenidos en el pedido sirven como referencia de la línea. Este cambio no actualiza `products`, variantes, categorías, imágenes, disponibilidad comercial ni precios. Tampoco recalcula listas de precios. Cualquier sincronización de catálogo permanece en su flujo y cambio OpenSpec propios.

## Migration Plan

1. Incorporar fixtures/contract tests para la matriz completa sin cambiar producción.
2. Habilitar el nuevo ledger en un origen a la vez.
3. OMS sombra: comparar decisión nueva vs efecto real de Venta Asistida y Shopify.
4. Canario Shopify pagado inicialmente; después pago tardío; después Venta Asistida y cambios/reversas.
5. Habilitar validación fail-closed del despacho tras completar `osmosis-push-multibodega-carrier`.
6. Promover OMS solo con gates; Almacén Bombas recibe únicamente reglas neutrales aplicables.

## Rollback

Las banderas se separan por origen (`assisted-sale`, `shopify-created`, `shopify-paid`, `manual-dispatch`, `reversal`). Ante cualquier doble efecto o despacho sin ID, se apaga solo el origen afectado y se conserva la evidencia para conciliación.

## Risks / Trade-offs

- **Eventos fuera de orden** → decidir por transición persistida, no por orden de llegada.
- **Pedido pagado con push fallido consume stock** → mantener compromiso y alertar; liberarlo permitiría sobreventa.
- **Cambio de cantidad sin revisión estable** → construir operation ID desde el efecto anterior y el nuevo, con prueba de duplicados.
- **Respuesta parcial de Logística** → evaluar por pedido y no cerrar el lote como éxito global.
- **Payload de pedido trae datos de catálogo** → tratarlos como snapshot de la venta; nunca como autorización para sobrescribir producto o precio.

## Open Questions

- **Checkpoint humano obligatorio:** confirmar la regla propuesta “Shopify no pagado no descuenta Katuq hasta que llegue `orders/paid`”. Si OMS desea reservar antes del pago, cambian spec, diseño y tareas.
