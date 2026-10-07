# Diseño — D-364

## Flujo trazado

`sites.crearPedido` valida la tienda, empresa, comprador y catálogo; construye la orden con `siteOrden`, resuelve el cliente y llama a `orderService.createOrder`. Este último retorna `_duplicadoEvitado: true` si encuentra una orden gemela reciente, sin crear otra ni consumir consecutivo. El checkout ejecutaba después `InventoryService.updateByPOS` incondicionalmente.

`updateByPOS` usa una transacción para las cantidades de las líneas de la orden y business code de bodega; no verifica idempotencia de la orden. Registra después los movimientos por batch. La protección de `restoreStock` al cancelar es otro camino y no impide un segundo descuento al crear. Se conserva D-204: descontar al crear y registrar `inventarioDescontadoAlCrear` cuando la reserva confirma éxito.

## Cambio aprobado

Rodear exclusivamente el bloque actual de reserva con:

```js
if (!creada._duplicadoEvitado || creada.inventarioDescontadoAlCrear !== true) {
  // bloque existente sin cambios internos
}
```

No agregar llamadas, estados ni queries. La marca es la del registro existente devuelto por el servicio, no un valor enviado por el comprador. El middleware y filtros de empresa permanecen intactos. La respuesta del pedido y efectos posteriores se conservan.

## Write-set

Reserva existente: `inventory`, `inventoryMovement` y marca en `orders`. Prohibidas escrituras a `products`, variantes, catálogo, precios, `preciosPorTipoCliente` y listas de precios. Ningún cambio a la normalización de IDs, deduplicación de inventario legacy ni política de existencias.

## Verificación y límites

Extraer los métodos reales de checkout, creación y reserva mediante AST; ejecutarlos con Firestore en memoria y módulos de red bloqueados. Probar dos envíos de una misma compra, marca previa true/false/ausente y fallo de primera reserva seguido de reintento. Verificar saldo, movimientos, llamadas y write-set. No se prueba idempotencia atómica entre peticiones simultáneas. Sintaxis, diff y suite existente de publicación cierran esta tanda; no arrancar backend conectado a Firestore ni realizar compras reales.
