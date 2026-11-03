# Propuesta: Compras, ciclo completo (proveedor, costo, orden, recepción, factura y pago)

**Estado: borrador — pendiente aprobación de Daniel**

- **Tickets:** 1468 (Compras 1/3 Proveedores), 1470 (Compras 2/3 Qué comprar, mejoras 1 a 8 y error 6) y 1469 (Compras 3/3 Órdenes de compra, puntos 1 a 8).
- **Decisión:** D-626.
- **Origen:** los tres tickets de Daniel del 2026-10-29 y su comentario sobre la regla de costos (ticket 1468). Continúa `mvp-compras` (D-171) y `compras-reposicion` (D-172), ya desplegados.
- **Spec:** `specs/compras/spec.md`. Tasks: se escriben después de la aprobación de este documento.

## Why

El ciclo de compras de Katuq está a medias. Se puede sugerir qué comprar, crear una orden, recibirla y anotar factura y pago, pero:

1. **No se sabe quién surte cada producto.** El proveedor de una sugerencia es el de la última compra, o nadie. No existe la relación producto–proveedor, así que Qué comprar no puede ofrecer varios proveedores, ni su costo, ni su tiempo real.
2. **El costo tiene dos puertas y ninguna regla.** Se escribe en Lista de precios > COSTO, entra por la recepción de una compra y por el Excel. Hoy hay 1.742 productos con existencias sin costo en ALMARA, y la pantalla de Qué comprar no deja ponerlo ahí mismo.
3. **La sugerencia no termina en órdenes.** «Crear órdenes de compra» ya agrupa por proveedor, pero no hay borrador, ni redondeo a la unidad de compra, ni filtros, ni exportación.
4. **La orden tiene cuatro estados** (abierta, parcial, recibida, anulada). Faltan borrador, enviada y cerrada, el envío con registro, y las diferencias de recepción.
5. **Factura y pago viven pegados a una sola orden**, sin vencimiento, sin comparar factura contra orden contra recibido, sin saldo vencido ni por vencer.

## Qué ya existe (verificado en el código, 2026-11-03)

| Pieza | Estado | Dónde |
|---|---|---|
| Maestro de proveedores (nombre, NIT, contacto, ciudad, `diasEntrega`, activo/inactivo) | Existe. Faltan documento no-NIT, WhatsApp, condiciones de pago, dirección, notas, importar/exportar | `services/purchasing/supplierService.js`, `compras/proveedores/` |
| Relación producto–proveedor | **No existe** | — |
| Costo del producto + historial `productCostHistory` + fuente `compra` | Existe; un valor en `precio.costoUnitario` | `purchaseCostCapture.js`, `controllers/productCosts.js` |
| Qué comprar: cálculo, urgencia, pendiente por recibir, proveedor de la última compra | Existe. Errores 1 a 5 y avisos ya corregidos (e5719c03 front, 91776a5e back) | `replenishmentService.js`, `compras/reposicion/` |
| Convertir selección en órdenes agrupadas por proveedor | Existe, sin borrador | `reposicion.component.ts` `crearOrdenes()` |
| Orden: crear, flete/otros costos, IVA por línea, recepción parcial, devolución, WhatsApp, comparador de precios | Existe | `purchaseOrderService.js`, `ordenes-compra/` |
| Filtro de bodega en «Todas» y recuerda la elegida (1469, ajustes 1 y 2) | Corregido en e1fff70c | `ordenes-compra.component.ts` |
| Factura y pago por orden, saldo por proveedor, cumplimiento | Existe en la orden (`facturas[]`, `pagos[]`) | `estadoDeCuenta`, `resumirCumplimiento` |
| Pendiente de `mvp-compras` | 2.4 (medir productos que ganan costo) y 4.3 (archivar) | `mvp-compras/tasks.md` |
| Pendiente de `compras-reposicion` | 5.4 (conciliar nota crédito del proveedor) | `compras-reposicion/tasks.md` |

## Una sola regla de costos (comentario del ticket 1468)

El costo se carga en Lista de precios > COSTO o en Compras > Productos y proveedores, y se ve igual en las dos. Reglas:

1. **Un solo valor vigente por producto**, el que ya usa Lista de precios (`precio.costoUnitario`). No nacen otros campos de costo; las lecturas viejas (`costo.valor`, `costoUnitario` suelto) no se escriben más.
2. Producto **sin proveedor**: el costo es general.
3. Producto **con proveedor**: el costo vigente es el costo de compra del **proveedor principal**. Editarlo en cualquiera de las dos pantallas actualiza al proveedor principal.
4. Asignar el primer proveedor conserva el costo general como costo de ese proveedor. Quitar el último lo devuelve a general.
5. Cambiar el principal cambia el vigente, con aviso antes de confirmar.
6. Recibir una orden, Qué comprar (costo en línea) y los dos Excel aplican la misma regla.
7. **Un solo punto de escritura**: una operación de costos que, en una transacción, actualiza el costo del proveedor, el vigente del producto y una fila de `productCostHistory`, con la pantalla de origen (Lista de precios, Proveedores, Qué comprar, Orden recibida, Importación).
8. En Lista de precios > COSTO se muestra el origen («General (sin proveedor)», «Proveedor principal: X», «Última compra [fecha]») y la cantidad de proveedores.

Nota de diseño: el costo de compra de cada proveedor vive en la relación y el vigente del producto es su copia derivada. Hace falta porque Lista de precios, el valorizado y los informes leen `precio.costoUnitario`. Las dos se escriben juntas, en la misma transacción y por un solo servicio, para que no se desincronicen. A futuro, la política (principal, última compra, promedio ponderado) será configurable por comercio en `companyConfig`, no en el `.env` (D-505).

## What Changes: fases cortas, en orden

Cada fase se aprueba, se implementa y se despliega antes de empezar la siguiente.

**Fase A: costo en línea y proveedor** (1468, 1470 mejoras 1 y 2, error 6)
- Relación producto–proveedor (varios por producto, uno principal): referencia del proveedor, costo, unidad y factor de compra, pedido mínimo, tiempo de entrega, fecha y costo de la última compra.
- El maestro de proveedores gana los campos que faltan y Excel (importar, plantilla, exportar con vista previa y reporte).
- Vista «Productos y proveedores» (pestañas Por producto, Por proveedor, Sin proveedor) con el diseño de Lista de precios.
- La regla de costos de arriba, con historial único.
- En Qué comprar: costo escrito en la fila, proveedor principal y su tiempo de entrega real prellenados, cambio de proveedor, y foto del producto en lugar de la letra.

**Fase B: cantidades y generar órdenes por proveedor** (1470 mejoras 3 a 8)
- Cantidad redondeada a la unidad de compra y al pedido mínimo, con el cálculo visible y editable.
- Barra fija con total, valor estimado y «Generar órdenes de compra»: un **borrador** por proveedor; lo que no tiene proveedor queda aparte.
- Orden por urgencia, filtros (proveedor, categoría, bodega, solo urgentes), solo urgentes marcados por defecto, avisos con enlace para corregir, exportar a Excel.
- Pestaña «Qué producir» con venta, existencia y cantidad sugerida. Los insumos por receta quedan fuera: hoy no hay modelo de recetas en el código (ver preguntas).

**Fase C: ciclo de la orden** (1469 puntos 1 a 4 y 8)
- Estados: Borrador, Enviada, Recibida parcial, Recibida completa, Cerrada, Cancelada. Las órdenes existentes se leen sin migrar (`abierta` se lee Enviada, `parcial`, `recibida` y `anulada` conservan su sentido).
- Envío: PDF con logo, WhatsApp o correo desde Katuq; se registra fecha y quién. Duplicar orden.
- Recepción contra la orden con diferencias (faltó, de más, otro producto, dañado, vencido, foto opcional), saldo pendiente o cancelado. **La recepción pasa a ser una sola operación del backend**: hoy el Seller llama primero a inventario y luego a la orden, y si la segunda falla el stock entra sin anotarse (`ordenes-compra.component.ts`, `recibir()`).
- Permisos por rol e historial de cada orden.

**Fase D: factura del proveedor y cuentas por pagar** (1469 puntos 5 y 6)
- Factura (número, fecha, valor, PDF/XML) ligada a una o varias órdenes; leer el XML electrónico para prellenar; comparar factura, orden y recibido y avisar diferencias.
- Cada factura genera un saldo con vencimiento según las condiciones de pago; pagos totales o parciales con soporte; saldo por proveedor vencido y por vencer; Excel; «Recibido sin facturar» en Proveedores.
- Documento soporte a Siigo: queda como «ideal» del ticket, fuera de esta fase.

**Fase E: indicadores** (1469 punto 7 y 1468 punto 6)
- Cumplimiento (% completo y a tiempo), días reales contra prometidos y valor comprado por período, en la ficha del proveedor. El tiempo real ya alimenta Qué comprar; esta fase lo muestra.

## Write-set declarado

- **Fases A, B, D, E:** no mueven inventario. Escriben `proveedores`, la relación producto–proveedor, `ordenes_compra`, `productCostHistory` y, de `products`, **solo** `precio.costoUnitario` y `fulfillment.costoFuente` (autorizado por D-171). Nunca escriben variantes, precio de venta, precios por cliente, categorías, imágenes ni Price Lists.
- **Fase C (recepción), módulo sensible:** además escribe `inventory` e `inventoryMovement` por el camino de ingreso por compra que ya existe (transacción, idempotencia, `idBodega` con business code, sin tocar la normalización de `productoId`). Un borrador o una orden enviada no mueven inventario. Se envuelve el camino existente, no se crea otro.
- **Contract test del write-set** en cada fase: falla si se escribe `products` fuera del costo, precios o Price Lists; y en la Fase C, si el stock entra por un camino distinto al de ingreso por compra o dos veces con la misma recepción.
- **Shopify:** el ingreso por compra puede disparar el sync de stock que ya existe; esta propuesta no lo amplía, no cambia frecuencia ni límites y no toca los flows mixtos de OH MY STORE (`cereza-products-to-shopify-a5156643`, `katuq-web-to-shopify`).

## Decisiones que necesito de Daniel (checkpoint antes de la Fase A)

1. **Colección nueva** para la relación producto–proveedor (`productoProveedores`, una fila por par). Recomendada: guarda el costo, la unidad y el tiempo por proveedor sin ampliar lo que Compras escribe en `products`. La alternativa (dentro de `products`) rompe el write-set de D-171. Según `openspec/config.yaml`, no se crea sin aprobación explícita.
2. **Cuentas por pagar y Tesorería (aws-claude-1).** Tesorería y Cartera hoy llevan lo que se **cobra** (`treasury/`, `carteraService`). Cuentas por pagar sería su espejo (lo que se **debe**). Propuesta: Compras es dueña del saldo por pagar del proveedor y Tesorería solo lo lee, si algún día muestra flujo de caja. Antes de la Fase D hay que acordarlo con aws-claude-1 para no crear dos pantallas ni dos colecciones de pagos.
3. **Permisos por rol** para ver costos, editar costos, crear, aprobar, recibir y pagar. Se propone reutilizar el permiso que hoy gobierna editar costo en Lista de precios; confirmar.
4. **Recetas** para «Qué producir»: ¿existe o se planea un modelo de recetas? En el código no aparece; sin él, esa parte queda aparte.
5. ¿Se aprueba que `abierta` se lea como Enviada sin migrar datos?

## No-goals

- Aprobaciones por monto, cotizaciones comparativas, órdenes multi-bodega (siguen fuera, como en `mvp-compras`).
- Costos de importación (landed cost), contabilidad, asientos y retenciones.
- Política de costo distinta a «proveedor principal» (queda como configuración futura).
- Insumos por receta en Qué producir.
- Documento soporte a Siigo.
- Cualquier cambio de catálogo, precios de venta o Price Lists.

## Riesgos

- **Recepción = inventario (módulo sensible).** Un fallo a mitad de camino hoy deja stock sin anotar, y el reintento lo duplica. La Fase C va sola, un cambio a la vez, con diff aprobado, clave de idempotencia por recepción y prueba de doble envío.
- **Costo sincronizado en dos pantallas.** Un error de digitación se vuelve visible en el valorizado y los márgenes. Mitigación: historial único, aviso de cambio mayor al 30 % (ya existe) y permiso por rol.
- **Tamaño.** Son tres tickets grandes. Por eso las fases son cortas y cada una puede quedar publicada sola.
- **Datos en Postgres (D-579).** Las consultas nuevas sobre `products` e `inventory` necesitan índice y traer solo los campos usados. No se consulta Firestore para validar nada.

## Acuerdo con aws-claude-1 (3-nov)

- Compras es dueña del saldo por pagar a proveedores; Tesorería solo lo lee.
- Si los pagos a proveedores se muestran en Tesorería, van en un endpoint o una pestaña propia. No se tocan `listPayments`, `getMetrics` ni la cola de revisión de `treasuryService`, que lleva la rama de aws-claude-1. Antes de abrir la fase D se le avisa.
- La recepción (fase C) respeta D-134: el write-set de inventario es cerrado, y la recepción no toca `products` ni precios. El costo se actualiza por el servicio de costos con su historial, en un cambio aparte y aprobado.
