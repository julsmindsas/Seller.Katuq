# Propuesta: que quitar un producto de un pedido devuelva bien el inventario

## Why

Revisión pedida por Daniel (2026-08-10) del reintegro cuando se cancelan
productos. Dos de los tres caminos están bien; el tercero no, y **ya causó daño
en producción**.

Lo que sí funciona:
- **Cancelar el pedido completo** (`restoreStock`): devuelve exactamente lo que
  los movimientos de salida originales descontaron, y tiene candado de
  idempotencia. Cancelar dos veces no infla nada.
- **Recompra** (agregar productos o subir cantidades): descuenta solo el delta
  positivo. El bug viejo de detectar únicamente productos nuevos está corregido.

Lo que no: **quitar un producto de un pedido** (`restoreProductStock`). Auditado
sobre producción: de 12 devoluciones por producto removido, **una ya está mal** —
devolvió 2 unidades habiendo descontado 1. Hay una unidad fantasma en ALMARA
FELICIDAD. Con solo 12 usos, una falla es 8%: no es mala suerte, es el diseño.

## What Changes

Seis correcciones sobre el mismo camino:

1. **Idempotencia.** Hoy nada impide devolver dos veces el mismo producto del
   mismo pedido: la salida original sigue ahí y la segunda llamada la vuelve a
   encontrar. Se aplica el mismo patrón que ya usa la cancelación total.
2. **Todas las salidas, no la primera.** Un pedido de canal puede descontar el
   mismo producto de varias bodegas. Hoy se lee `limit(1)` y se devuelve todo a
   una sola: el stock aparece donde no está. Debe devolverse a cada bodega lo
   que de ella salió.
3. **La cantidad no la manda el navegador.** Hoy el cliente envía `cantidad` y
   se acepta. Debe acotarse a lo realmente descontado y no devuelto todavía.
4. **Sin fila de inventario, no hay devolución muda.** Hoy, si el documento no
   existe, se escribe el movimiento igual y ningún saldo cambia: el historial
   dice que volvió mercancía que nunca volvió. O se crea la fila canónica, o se
   rechaza; lo que no puede es mentir.
5. **Identidad normalizada.** La búsqueda del documento de inventario no
   normaliza referencia→docId, así que puede sumarle al espejo en vez del bueno.
   Misma corrección que ya se aplicó en los demás lectores y escritores.
6. **Bajar la cantidad también devuelve.** Reducir de 5 a 2 sin quitar el
   producto no devuelve nada hoy: el camino de edición solo procesa aumentos.

## Capabilities

### Modified Capabilities
- `order-line-return`: el reintegro por línea pasa a ser exacto, idempotente y
  por bodega, con la misma disciplina que ya tiene la cancelación total.

## Impact

- Código: `services/inventoryService.js` (`restoreProductStock`) y el camino de
  edición de pedidos para el caso de disminución. Módulo de máxima sensibilidad.
- Datos: queda por decidir si se corrige la unidad fantasma de ALMARA con un
  ajuste con motivo, o se deja registrada como hallazgo.
- Sin colecciones nuevas. El write-set de inventario no se amplía.

## No-goals

- No cambiar la cancelación total, que funciona.
- No cambiar la recompra, que funciona.
- No tocar la política de negativo-visible ni el control de existencias en venta
  (eso es la spec `vender-contra-disponible`).

## Riesgos

- Es el mismo endpoint que hoy usa la pantalla de pedidos: un error aquí se ve
  de inmediato en la operación. Va con pruebas de los seis casos antes de tocar
  producción.
- La corrección 3 (acotar la cantidad) puede rechazar devoluciones que hoy pasan
  calladas. Es el punto: hoy pasan porque nadie las valida.
