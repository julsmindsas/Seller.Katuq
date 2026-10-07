# Corrección propuesta: evitar descontar otra vez un pedido ya reservado

Estado: **aprobada por Daniel y aplicada localmente bajo D-364**; ocho regresiones pasan. Es independiente de la primera tanda D-363. El diff de abajo conserva la propuesta que se presentó antes de aplicar. Sin desplegar.

## Fallo reproducido

Dos envíos secuenciales del mismo checkout crean una sola orden por la protección de `orderService.createOrder`, que devuelve `_duplicadoEvitado: true`. Sin embargo, `sites.crearPedido` llama de nuevo a `InventoryService.updateByPOS`, que no verifica esa condición ni la marca de reserva. La devolución de stock al cancelar sí tiene otra protección; no evita esta repetición del descuento.

Prueba con funciones reales extraídas del código y Firestore en memoria:

| Caso | Código actual | Candidato |
|---|---|---|
| Dos envíos, primera reserva confirmada | Una orden, stock 10 → 8, dos movimientos SALIDA | Una orden, stock 10 → 9, un movimiento SALIDA |
| Primera reserva fallida, luego reintento | — | Se permite recuperar la reserva; stock 10 → 9 |
| Orden existente con marca `true` | — | Dos llamadas, cero reservas adicionales |
| Orden existente con marca `false` o ausente | — | Dos llamadas, una reserva; saldo 9 |

No se usaron datos productivos. La prueba bloquea módulos no permitidos y falla ante escrituras en productos, precios, empresas o plantillas.

## Diff concreto

[evitar-segundo-descuento.patch](/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/Seller.Katuq/openspec/changes/sitios-guardado-medicion/revision-pendiente/evitar-segundo-descuento.patch) agrega una condición al bloque existente de reserva en `functions/controllers/sites.js`:

```js
if (!creada._duplicadoEvitado || creada.inventarioDescontadoAlCrear !== true) {
  // reserva existente
}
```

Se omite la reserva solamente si la orden retornada es un duplicado y su descuento ya quedó confirmado. No se cambia el servicio global de inventario, sus transacciones, precios, maestros, auth, aislamiento de empresas ni consecutivos. `git apply --check` y el parseo del candidato pasan.

Write-set del camino existente que se conserva: `orders` (marca de reserva), `inventory` e `inventoryMovement`; productos y precios permanecen de solo lectura. Sin nuevas colecciones ni modificaciones de datos como parte de la implementación y las pruebas.

## Límites que siguen pendientes

La condición protege el reenvío **secuencial después de una reserva confirmada**. No cierra la carrera entre dos peticiones simultáneas ni un fallo después de descontar pero antes de registrar la marca. Eso requiere un diseño de idempotencia atómica aparte. El caso reproducido también volvió a solicitar enlace de pago, contador, evento y notificación; este diff no corrige esos efectos. La prueba observa llamadas simuladas, no demuestra envíos externos duplicados.

El retiro sin dirección, la coherencia de su bodega/forma de entrega, la suma de cantidades del mismo producto y la presentación del precio de talla/color se revisaron aparte y no forman parte de este diff.

## Evidencia y aprobación

Reproducción y candidato: `/tmp/katuq-builder-segunda-tanda-duplicado.js` y `/tmp/katuq-builder-segunda-tanda-sites-duplicado.js`. Ejecutado:

```bash
node /tmp/katuq-builder-segunda-tanda-duplicado.js /tmp/katuq-builder-segunda-tanda-sites-duplicado.js
```

La regla de [openspec/config.yaml del backend](/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase/openspec/config.yaml) exige: «Módulos sensibles (orders/inventory/consecutivos): un cambio a la vez, diff antes de aplicar, aprobación explícita». Esta corrección toca el camino de pedido → inventario; se presentó probada y como diff antes de solicitar aprobación. Daniel confirmó el alcance de tiendas propias de Katuq y aprobó: «ah bueno aprobado». Se registró D-364 antes de aplicar. Resultados y regresión portable en [tareas D-364](../../sitios-reserva-duplicada/tasks.md).
