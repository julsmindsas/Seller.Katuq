## Why

Ticket 1323 (ALMACEN BOMBAS, 2026-10-21) pide cinco cosas sobre los combos. La parte de solo lectura ya está en producción desde el 22-oct (backend 60e6552d): la tool `get_combos` lista los combos con sus productos y el precio total con y sin IVA, y `get_product_catalog` dice en qué combos está cada producto. Lo que falta no se puede hacer sin cambiar cómo se guarda un combo (D-147, D-339):

- **No hay cantidad por producto.** Cada producto entra al venderse con su cantidad mínima de venta (`disponibilidad.cantidadMinVenta`). Un combo de «1 bomba + 2 acoples» no se puede armar si el acople tiene cantidad mínima 1.
- **No hay código del combo.** Solo `nombre`, así que no se puede actualizar un combo desde un Excel sin riesgo de duplicarlo cuando el nombre cambia.
- **No hay carga masiva.** ALMACEN BOMBAS tiene combos de varios productos y los crea uno por uno. Hoy tiene 8.
- **No se sabe si un combo se puede vender** según el stock de sus productos.

## What Changes

- **Cantidad por producto.** `combos.productos[].cantidad` (entero ≥ 1). Si un combo viejo no la tiene, se usa la cantidad mínima de venta del producto, como hoy, así ningún combo existente cambia. La pantalla del combo la pide al lado de cada producto. Venta asistida (las dos vistas) y cotización agregan cada producto con esa cantidad. El POS hoy no vende combos y no cambia.
- **Código del combo.** `combos.codigo` opcional, único por empresa. Se pide en la pantalla del combo y sirve de llave para el Excel. Si no se escribe, el combo funciona como hoy.
- **Carga desde Excel.** En el importador que ya existe, el tipo «Combos», con plantilla descargable de una fila por producto del combo: código del combo, nombre, descripción, referencia del producto, cantidad, activo. Primero se **simula**: el servidor revisa todo (referencias que no existen o están inactivas, cantidades vacías, códigos repetidos) y muestra cuántos combos se crean, cuántos se actualizan y la lista de errores. Solo al confirmar se guarda. Se crea o se actualiza por código.
- **Disponibilidad.** `get_combos` gana `incluirStock`: cuántos combos completos alcanzan con el stock de cada producto (el menor de existencias ÷ cantidad, con la misma suma de inventario normalizada y sin duplicados de las demás tools).

## Capabilities

### New Capabilities
- `combos-import`: carga masiva de combos desde Excel, con simulación previa y creación o actualización por código.

### Modified Capabilities
- `combos` (D-147, D-339): cantidad por producto y código del combo. El precio sigue saliendo de sumar los productos.

## Impact

- **Frontend:** `proceso/combos/*` (cantidad y código), `ventas/catalogo/ecomerce-products/*`, `cotizaciones/cotizacion-editor/*` (usar la cantidad del combo), `shared/components/import-modal/*` (tipo Combos y plantilla).
- **Backend:** `controllers/combos.js` (`cantidad` y `codigo` en los campos editables, validación de código único), endpoint de importación con modo simulación, `tools/getCombos.js` (cantidad del combo y stock).
- **Datos:** dos campos nuevos y opcionales en `combos`. Sin colección nueva. No se migran combos: sin cantidad, usan la mínima de venta como hoy.
- **Riesgo sobre módulos sensibles:** el combo se sigue vendiendo como líneas normales y el inventario descuenta cada producto por separado, como hoy. Cambia la **cantidad** con que entra cada línea al pedido: se prueba que un combo sin cantidad arme exactamente el mismo pedido que hoy. No escribe `products`, precios, listas de precios ni `inventory`.
- **Decisión a registrar:** D-538 en `specs/CONTRACT.md` (enmienda D-147 y D-339 solo en cantidad y código).

## No-goals

- **Precio propio del combo.** D-147 lo dejó como suma de sus productos y el descuento por código. El Excel no trae precio. Ver pregunta 1.
- Stock propio del combo, o el combo como un solo producto en Shopify o SIIGO.
- **Combos como fuente del creador de informes.** El motor de informes da una fila por documento y no sabe abrir la lista de productos de un combo. El informe de combos con sus productos ya sale por Claude con `get_combos`.
- Cambiar cómo se descuenta el inventario o cómo se factura.

## Preguntas para Daniel

1. ALMACEN BOMBAS sugiere que el Excel traiga «precio del combo sin IVA». ¿El combo debe tener precio propio, o sigue siendo la suma de sus productos como hoy? La propuesta asume la suma; un precio propio cambia cómo se cobra el pedido y sería otra propuesta.
2. Cantidad: ¿está bien que un combo viejo sin cantidad siga usando la cantidad mínima de venta de cada producto?
