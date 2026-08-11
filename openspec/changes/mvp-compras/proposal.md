# Propuesta: MVP de compras

## Why

Katuq ya sabe **recibir** mercancía contra una orden (`ordenes_compra`, desplegado
2026-08-10): quién pidió qué, cuánto llegó, cuánto queda debiendo, y la entrada al
inventario con su movimiento. Lo que falta es todo lo que hace que esa orden sirva
para algo más que registrar:

1. **No hay proveedores.** Hoy el proveedor es texto libre: dos personas escriben
   "Distribuidora XYZ" y "distribuidora xyz S.A.S" y son dos proveedores distintos.
   Sin identidad no se puede comparar precios, medir cumplimiento ni reclamar.
2. **El costo no entra por la compra.** Vive en el producto como un solo número
   actual, sin historia, y hoy lo escribe alguien a mano en la pantalla de precios.
   Consecuencia medida el 2026-08-10: **5.489 productos con existencias no tienen
   costo**, y por eso el inventario valorizado de OH MY STORE ($337M) es un piso y
   no el total. La compra es el único momento en que el costo se conoce de verdad.
3. **No se sabe cuánto se le debe a quién.** No hay factura de compra ni saldo por
   proveedor. Un tercio del valor de comprar bien está en no perder de vista la plata.

## What Changes

**Pieza 1 — Proveedores.** Maestro con nombre, NIT, contacto, condiciones de pago y
estado. La orden de compra pasa a referenciar un proveedor en vez de texto libre;
lo ya creado con texto se conserva y se puede vincular después.

**Pieza 2 — El costo entra por la compra.** Al recibir, el costo unitario de la
línea actualiza el costo del producto y queda registrado con su fecha, su
proveedor y la orden que lo originó. Es lo que convierte el valorizado en un
número defendible.

**Pieza 3 — Lo que se debe.** La orden lleva su estado de plata: pedido, recibido y
facturado, con el saldo por proveedor. Sin contabilidad ni asientos.

## Decisiones tomadas (Daniel, 2026-08-11)

1. **Colección `proveedores`: AUTORIZADA.**
2. **Compras escribe el costo del producto — y el cargue por Excel sigue igual.**
   Son DOS fuentes que conviven, no una que reemplaza a la otra. La regla dura
   sigue intacta: INVENTARIO no toca productos ni precios.
3. **El costo se actualiza automático**, teniendo en cuenta el Excel: una compra no
   puede pisar en silencio un costo que alguien acaba de cargar masivamente, ni al
   revés. Cada escritura deja su fuente, y el aviso salta cuando el cambio es grande.

## Lo que NO hay que construir (hallazgo del 2026-08-11)

Al revisar antes de escribir código apareció que la mitad de la pieza 2 **ya existe**
y funciona: `controllers/productCosts.js` mantiene `productCostHistory` con costo
anterior, nuevo, delta, porcentaje, fuente, lote de importación, fecha y autor;
`productCostImports` guarda los lotes; y hay previsualización antes de aplicar. El
catálogo de fuentes válidas ya distingue `prindel-excel`, `aliaddo-api`,
`aliaddo-excel`, `costos-excel` y `manual`.

Entonces compras **no inventa un camino paralelo**: se suma como una fuente más
(`compra`) sobre la misma tubería. Eso es exactamente lo que hace que las dos
fuentes convivan sin pisarse — quien mire el historial va a ver si ese costo entró
por una compra o por un cargue de Excel, y de cuál.

## Capabilities

### New Capabilities
- `supplier-master`: identidad de proveedores y su historial de compras.
- `purchase-cost-capture`: el costo del producto se alimenta de lo que se compró.
- `purchase-balance`: cuánto se pidió, se recibió y se facturó por proveedor.

### Modified Capabilities
- `ordenes_compra` gana la referencia al proveedor y el estado de facturación.

## Impact

- Backend: nuevo dominio de compras; escribe `proveedores`, `ordenes_compra` y —solo
  para el costo— `products`. El write-set de INVENTARIO no se amplía.
- Frontend: pantalla de proveedores y ampliación de la de órdenes de compra.
- Datos: las órdenes existentes con proveedor en texto siguen funcionando.

## No-goals

- Aprobaciones por monto, comparación de cotizaciones, órdenes multi-bodega.
- Costos de importación y nacionalización (landed cost).
- Integración contable, asientos, retenciones o impuestos de compra.
- Devoluciones a proveedor. Se agregan después sin rehacer lo anterior.

## Riesgos

- El costo es un dato con consecuencias: mueve el valorizado, los márgenes y los
  informes. Por eso la decisión 3 y por eso el histórico — sin él, un error de
  digitación se vuelve permanente y nadie sabe qué había antes.
- Vincular las órdenes viejas al maestro nuevo es trabajo manual si los nombres
  están escritos de varias formas. Se hace por sugerencia, nunca automático.
