# Facturar en SIIGO con el código del producto que ya existe allá

## Why

Ticket 1229 (ALMACEN BOMBAS). Bombas factura en SIIGO desde Katuq (31 de 51
pedidos), pero la integración de inventario no quedó terminada.

Lo medido el 2026-10-18, solo lectura:

| Hallazgo | Dato |
|----------|------|
| Productos de Katuq | 1.286 |
| Con el mismo código en SIIGO | 41 |
| Con su equivalente en SIIGO por la regla de código (abajo) | 625 |
| Con dos candidatos posibles en SIIGO | 2 |
| Sin equivalente en SIIGO | 618 |
| Productos que SIIGO tiene repetidos por facturas de Katuq | 11 de 60 creados desde el 1-sep |
| Bodegas de Katuq conectadas con su bodega SIIGO | 0 de 8 (hoy 3, ver abajo) |

**Códigos.** El código de Katuq es `MARCA-categoría-subcategoría-REFERENCIA`. El
de SIIGO no lleva el bloque de categoría: `GLD-00-01-4SSFR` en Katuq es
`GLD-01-4SSFR` en SIIGO (regla hallada el 2026-09-03, memoria
`almacen-bombas-siigo-revision`). Al facturar, `siigoProvider.findOrCreateProduct`
busca la referencia de Katuq tal cual. Como no la encuentra, **crea otro producto
en SIIGO**: sin el grupo contable correcto, sin el stock del original y
duplicado en su catálogo. Ejemplos: `HCP-00-00-80AFC21.5-3` junto a
`HCP-00-80AFC21.5-3`, `FJT-00-00-G573205A` junto a `FJT-01-G573205A`.

**Bodegas.** La factura ya manda la bodega SIIGO cuando la bodega de Katuq
está conectada (D-045/D-046, `#resolveSiigoWarehouseId`). Bombas no tenía ninguna
conectada, así que SIIGO descontaba de su bodega por defecto. El 2026-10-18 se
conectaron las tres sin duda: Bogotá (BOD-005 → 6), Cali (BOD-006 → 7) y Zona
Franca Libre Disposición (BOD-001 → 31). Quedan las cuatro de Medellín
(MED-VIT, MED-MOT, MED-VIR, MED-REP), que SIIGO tiene en dos (Medellin 4 y
BMedellin 64), y Zona Franca Exterior, que no existe en SIIGO.

## What Changes

- **Código SIIGO por producto.** Cada producto puede guardar su código en SIIGO
  en `products.integrations.siigo.productCode` (Artículo XV, D-009). Al facturar,
  Katuq lo usa antes que la referencia. Sin ese dato, factura igual que hoy.
- **Carga inicial para Bombas.** Se llenan los 666 productos con equivalente
  único: 41 por código igual y 625 por la regla. Primero se hace una prueba sin
  escribir, y queda un Excel para que el comercio lo revise.
  - Los 2 ambiguos y los 618 sin equivalente quedan sin código y se le
    preguntan al comercio.
  - La regla es una función pura con pruebas y no queda amarrada a Bombas.
- **No volver a crear repetidos.** Si un producto no tiene código guardado y su
  referencia no existe en SIIGO, pero la regla encuentra uno solo, se usa ese
  código y se guarda en el producto. Si no hay ninguno, se crea como hoy.
- **Bodegas de Medellín.** Se conectan cuando el comercio diga a cuál de las
  dos de SIIGO va cada una. Se hace desde Bodegas → Importar → Importar SIIGO,
  sin código nuevo.

## Capabilities

### New Capabilities
- `siigo-codigo-producto`: equivalencia de código de producto Katuq → SIIGO al
  facturar.

## No-goals

- Cambiar la referencia de los productos de Katuq. Es la identidad del
  inventario y de los conteos ya cargados.
- Borrar o fusionar los 11 productos repetidos en SIIGO. Es contabilidad del
  comercio; se le entrega la lista.
- Traer stock de SIIGO a Katuq. Katuq sigue mandando (D-045).
- Pantalla para editar el código SIIGO por producto. Se puede agregar después
  en la ficha del producto.
- World Office y los demás proveedores.

## Riesgos

- **Facturación (módulo sensible).** Un código equivocado factura otro producto
  en SIIGO. Lo mitigan:
  - solo se usan equivalencias únicas;
  - prueba sin escribir y Excel de revisión antes de la carga;
  - la primera factura real de Bombas se revisa contra SIIGO.
- **Escritura en `products`.** El write-set es solo
  `products.integrations.siigo.productCode` (y su fecha y origen), con
  dot-notation. No toca referencia, precios, catálogo ni listas. No es una
  escritura de inventario, así que D-134 no aplica, pero se declara
  igual.
- **Stock en SIIGO.** Con bodega y código correctos, SIIGO descuenta de la
  bodega real. Si el comercio tiene activo en SIIGO el bloqueo por falta de
  stock (apagado por defecto), una factura podría rechazarse. Hoy la factura sale.

## Impact

- Backend: `siigoProvider.findOrCreateProduct`, `siigoDataMapper` (código del
  producto), armado de `productCode` en `accountingManager`, función pura de la
  regla, script de carga con `--dry-run`.
- Datos: `products.integrations.siigo.*` de ALMACEN BOMBAS.
- Front: sin cambios.
- Decisión: D-504.
