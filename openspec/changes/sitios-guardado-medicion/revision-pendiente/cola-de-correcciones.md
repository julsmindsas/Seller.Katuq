# Estado de las correcciones revisadas

La primera tanda D-363 se limita al guardado del editor y a la medición de pagos. Estos diffs se presentaron como propuestas independientes, verificadas con funciones reales y dependencias en memoria. Daniel aprobó posteriormente [evitar el segundo descuento confirmado](./doble-descuento.md); se aplicó localmente bajo D-364. Retiro, cantidades y selector de variantes siguen sin aplicar.

| Prioridad | Fallo reproducido | Diff preparado | Contrato que conserva |
|---|---|---|---|
| 1, aplicado D-364 | Una orden deduplicada recibe dos descuentos en dos envíos secuenciales | [Segundo descuento](./evitar-segundo-descuento.patch) | Reserva al crear D-204; permite reintentar una reserva fallida |
| 2 | Retiro sin dirección devuelve 400; se usa bodega general y las líneas dicen domicilio | [Retiro](./retiro-en-tienda.patch) | D-296, business code por empresa, formaEntrega en cada línea |
| 3 | Dos líneas del mismo producto pasan individualmente contra una sola unidad | [Cantidades](./cantidad-producto.patch) | Suma por docId, sin cambiar políticas globales de stock |
| 4 | Elegir talla muestra otro precio o sobrescribe la lista del comprador | [Selector de variantes](./precio-selector-variantes.patch) | D-214: talla/color identifica despacho; el precio y los extras conservan el motor existente |

## Evidencia de retiro

El candidato resuelve el punto guardado antes de exigir domicilio. Comprueba una bodega alternativa mediante empresa y business code; usa esa bodega para disponibilidad y orden. El script público permite retiro sin dirección. El armador conserva la dirección del punto y marca `Recoge en Tienda` también en `carrito[].configuracion.datosEntrega.formaEntrega`, que consume despachos.

Casos offline: punto inválido/desactivado, bodega que no pertenece a la empresa, stock de la sede elegida, fallback a bodega general, domicilio sin dirección rechazado. El calculador real en sus modos viejo y canónico mantiene $190.710 con IVA19%, opción pagada, adiciones y cupón10%; no altera producto, maestros ni texto completo `M/L-FUCSIA/NEG`. Domicilio mantiene costo, dirección y bodega.

## Evidencia de variantes

La ficha mostraba XL a $150.000 mientras el pedido calculaba $100.000 del producto/lista. D-214 prohíbe introducir otro mecanismo de precio por talla; se alinea la presentación con el precio aprobado. También se reprodujo lista de comprador $79.900 → selección de talla sobrescribe a $150.000. El candidato modifica ficha JSON y selector HTML para conservar $79.900 y los extras independientes. Pasan lista base, pública, promoción y mayorista, sin escribir maestros.

## Límites

No se ha diseñado una reserva atómica entre peticiones concurrentes. Sigue pendiente la disponibilidad global de variantes y el rechazo por `products.disponibilidad` desactualizado aunque el inventario real sea positivo. Estos diffs no prometen cerrar esas condiciones. Tampoco se verificaron con compras reales, pasarelas o interfaz publicada.

Los parches de retiro/cantidades afectan código cercano; antes de aplicar una segunda corrección se deben regenerar contra el estado resultante y probarla individualmente. El filtro de empresa, auth, precios maestros, servicio global de inventario y flows permanecen intactos en los candidatos.

Reproducciones de revisión local, en `/tmp`: `katuq-builder-segunda-tanda-review.js`, `katuq-builder-segunda-tanda-contratos.js`, `katuq-builder-segunda-tanda-selector.js` y `katuq-builder-segunda-tanda-duplicado.js`. Los candidatos pasan parseo y `git apply --check` contra el estado revisado.
