# Ampliación D-518: plan gratis, productos sin control de existencias y ficha sin `variantes[].cantidad`

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Sale de la revisión del 21-oct a la ampliación D-518 y se verificó en el código. Complementa `design-ampliacion.md`. Código leído el 2026-10-21 en `wt-back-tickets-web/functions` (`feature/tickets-web`, 097ede2e). `controllers/sites.js` tiene +740 líneas sin commit de F2-41 en ese árbol, así que se cita por función y no por línea. Ninguna parte toca pedidos, pagos, reserva, consecutivos ni auth. E2 cambia qué productos reciben existencias en 6.2 (inventario: diff aprobado). E3 cambia `utils/vitrinaProducto.js`, que está en el camino del cobro (diff aprobado).

## E1. Plan gratis (pregunta 15)

**Hoy:**
- El plan gratis muestra 50 productos (`config/subscriptionLimits.js`, `tienda.productosVisibles: 50`) y no permite dominio propio (`dominioPropio: false`). `controllers/sites.js` lo hace cumplir al guardar el sitio (`problemasDeConfiguracion`).
- `productosVisiblesDelPlan` (`controllers/sites.js`) deja visibles los 50 más recientes según `createdAt || fechaCreacion` (`utils/limitesPlan.js`, `idsVisibles` y `fechaDe`). Un producto fuera del cupo responde 404 en la ficha (`visiblesFicha`, en el render).
- Lo importado entra con la fecha de hoy (`design-escritura.md`), así que pasa delante de lo que el comercio ya vendía.

**Efecto sin cambios:** un comercio gratis que importa 500 productos deja 450 sin ver. Sus productos actuales salen de la tienda, desplazados por lo migrado. Las 301 no le sirven, porque sin dominio propio la dirección vieja nunca llega a Katuq. Y las que apuntan a un producto fuera del cupo terminan en un 404.

**Cambio (recomendado en la pregunta 15):**
- La simulación lee el plan con la misma regla de la tienda (`marcaDeLaEmpresa(company).plan`, como `planDe`; sin marca, `paid`) y `limitesTienda(plan)`. Solo lee.
- Con `productosVisibles` distinto de -1, la simulación devuelve `plan: { name, visibleLimit, visibleToday, hiddenAfterImport, currentDisplaced, ownDomain: false }` y el aviso `PLAN_LIMIT`, con un mensaje sin jerga: «Tu plan gratis muestra 50 productos y ya tienes 38. De los 500 que importas, solo 12 se verán en tu tienda. Las redirecciones necesitan dominio propio, que es del plan de pago.»
- No bloquea. Es un aviso que el comercio tiene que ver antes de importar.
- **Lo migrado no desplaza lo que ya se vendía:** `idsVisibles` (`utils/limitesPlan.js`) ordena con `fechaDeNovedad` (`design-ampliacion-ficha.md` N1) en lugar de `createdAt || fechaCreacion`. Un migrado sin fecha de origen va al final, así que ocupa solo el cupo que sobra. Para los productos no migrados el orden no cambia. Es código de la tienda: va con diff aprobado (tarea 14.20) y una prueba fija que una empresa sin migrados ve los mismos 50 de hoy.
- `currentDisplaced` se calcula con esa misma regla sobre los productos publicables de hoy más los que se crearían. Con la regla nueva da 0; se muestra igual por si el comercio importa productos con fecha de origen. No se escribe nada.
- En el paso de redirecciones, con plan gratis no se genera una 301 hacia un producto que quedaría fuera del cupo (`TARGET_HIDDEN_BY_PLAN`, en el reporte). Las demás se generan igual, porque sirven el día que el comercio mejore de plan y conecte su dominio.

## E2. Productos sin control de existencias (pregunta 16)

**Hoy:** `nuevoProducto` pone siempre `disponibilidad.inventariable: true` (`services/storeMigration/migrationProduct.js:112`). El lector de Shopify no lee `Inventory tracker` ni `Continue selling when out of stock`, y W2 no define el caso de Woo sin `Stock`.

**Efecto:** en la plantilla oficial de Shopify, el e-book y el perfume traen `Inventory tracker` vacío y ninguna cantidad. Entrarían con 0 unidades y la tienda los daría por agotados: 2 de los 3 productos no se podrían vender. En Woo, la ayuda oficial dice que un `Stock` numérico activa el manejo de existencias. Sin `Stock`, el producto no lleva control y se vende mientras `In stock? = 1`.

**Regla:**

| Origen | Sin control de existencias | Con control |
|---|---|---|
| Shopify | `Inventory tracker` vacío, o `Continue selling when out of stock = CONTINUE` | `Inventory tracker = shopify` (u otro servicio) y `DENY` |
| WooCommerce | `Stock` vacío y `In stock? = 1`, o `Backorders allowed? = 1` | `Stock` numérico y sin pedidos pendientes permitidos |

- **Sin control:** `disponibilidad.inventariable: false`. La tienda ya lo reconoce (`vitrinaProducto.js`, `productoParaVitrina`; `sites.js`, catálogo; F2-43·7) y el pedido no aparta unidades de un producto así (la tienda, en la creación del pedido de `controllers/sites.js`; Kuvo, en `services/kuvo/orderWriter.js:95`). Este cambio no toca ninguno de los dos. **No** recibe existencias: el lote no le manda filas a `importInventory`. El reporte lo marca `NOT_TRACKED`.
- **Woo sin `Stock` y con `In stock? = 0`:** queda con control, en 0 y agotado, como hoy (`STOCK_UNKNOWN`).
- **Un producto partido (A4)** decide por sus propias variantes. Si en un mismo grupo unas variantes llevan control y otras no, todo el grupo queda **con** control y el reporte lo avisa (`TRACKING_MIXED`). Así nunca se vende sin control algo que el comercio sí contaba.
- **Modo `upsert`:** no cambia `disponibilidad`, como dice `design-escritura.md`.

**Inventario (regla de `openspec/config.yaml`):** `importInventory` no cambia. Lo que cambia es **qué productos y qué cantidades le entrega el lote** (6.2). Antes del diff de 6.2 se escribe una prueba de caracterización del mapeo de cantidades, con la plantilla oficial y los fixtures sintéticos. Además, el escenario «las existencias no tocan el producto» de `store-migration-catalog` también cubre a Woo (`store-migration-woocommerce`).

## E3. Ficha de un producto migrado sin depender de `variantes[].cantidad` (pregunta 18; requisito de 13.2)

**Hoy:**
- `productoParaFicha` (`utils/vitrinaProducto.js:296-298`) da una variante por disponible si `variantes[].cantidad > 0`, salvo que el producto no sea inventariable.
- Ese campo solo lo actualiza el flow de Cereza. En un producto migrado queda con la foto del archivo para siempre:
  - una talla que llegó en 0 queda agotada aunque el comercio la reponga, y el formulario del Seller no deja editar `variantes[]`;
  - una talla que se vende hasta 0 sigue a la venta.
- La tarea 13.2 exige resolverlo antes de encender la bandera en un comercio real, y por D-518 T·1 no hay ticket «b» que lo reciba.

**Cambio (si la pregunta 18 dice «aquí»):**
- En un producto con `metadata.migration` y sin `integrations` de ningún proveedor, cada variante activa toma la disponibilidad **del producto** (`disponibilidad.inventariable === false` o `cantidadDisponible > 0`). Se ignora `variantes[].cantidad`.
- Los demás productos siguen exactamente igual (Cereza y los creados a mano).
- No cambia ningún precio ni el cobro. Va con diff aprobado y caracterización antes y después: `tests/sitios/precioSelectorVariantes.test.js`, `detalleComercialProducto.test.js` y un caso nuevo, «producto de Cereza con una talla en 0 sigue agotada en esa talla».
- **Lo que se acepta:** la tienda puede ofrecer una talla sin unidades mientras el producto tenga existencias. Hoy ya pasa con la foto inicial. El pedido llega con la talla elegida y el comercio confirma. Llevar stock por variante sigue prohibido por D-214.

## Write-set de esta parte

| Dónde | Qué | Prueba |
|---|---|---|
| Simulación | Solo lee el plan (marca de la empresa) y los productos publicables | `importStoreDryRun.noWrites` |
| `products` (por el upsert, sin modificarlo) | `disponibilidad.inventariable: false` en los productos sin control | `importStoreProducts.writeSet` |
| `inventory`, `inventoryMovement` | Nada nuevo. Menos filas: los productos sin control no reciben existencias | Contract tests de inventario sin cambios y caracterización del mapeo (14.21a) |
| `sites` | Ninguna 301 hacia un producto fuera del cupo del plan gratis | `importStoreRedirects` |
| Código de la tienda (E1 y E3) | Orden del cupo del plan gratis con `fechaDeNovedad`; disponibilidad de las variantes de un producto migrado; ningún precio | Suite de `tests/sitios` igual a la base |

## Riesgos

- **E1:** el cupo sale de la fecha de novedad. Si TX-34 cambia la proyección (D1), debe traer los campos de `fechaDeNovedad` (tarea 14.18).
- **E2:** un comercio de Shopify que vende servicios o productos digitales los trae sin control. Es lo correcto, pero también se pierde el tope de unidades si en Shopify no lo llevaba.
- **E3:** se vende una talla sin unidades. Mitigación: el pedido llega con la talla y el reporte final lo explica.
