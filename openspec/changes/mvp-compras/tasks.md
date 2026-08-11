# Tasks — mvp-compras

## 0. Checkpoint de Daniel — RESUELTO (2026-08-11)
- [x] 0.1 Colección `proveedores`: autorizada.
- [x] 0.2 Compras escribe el costo Y el cargue por Excel sigue como está: dos fuentes que conviven.
- [x] 0.3 Automático, teniendo en cuenta el Excel: cada escritura deja su fuente y avisa cuando el cambio es grande.
- [x] 0.4 HALLAZGO: `productCostHistory`, `productCostImports` y el catálogo de fuentes YA existen en `controllers/productCosts.js`. La pieza 2 se reduce a sumar `compra` como fuente sobre esa tubería, no a construir una nueva.

## 1. Proveedores
- [ ] 1.1 Servicio y validaciones del maestro (pura primero, con pruebas): NIT normalizado, nombre único por empresa, estado.
- [ ] 1.2 Endpoints y pantalla de proveedores.
- [ ] 1.3 La orden de compra referencia proveedor; las viejas con texto siguen funcionando.

## 2. El costo entra por la compra (sobre lo que ya existe)
- [ ] 2.1 Extraer el núcleo de `updateProductCost` a un servicio reusable — hoy vive dentro de un manejador HTTP y solo se puede llamar por red.
- [ ] 2.2 Agregar `compra` al catálogo de fuentes y capturar el costo al recibir, con la orden y el proveedor como origen.
- [ ] 2.5 Aviso cuando el costo de una compra se aparte mucho del vigente, sin bloquear la recepción.
- [ ] 2.3 Contract test: inventario no escribe products/precios; compras sí, y solo el costo.
- [ ] 2.4 Medir cuántos de los 5.489 productos sin costo quedan cubiertos tras la primera semana.

## 3. Saldo por proveedor
- [ ] 3.1 Registrar factura de compra sobre la orden (número, fecha, valor).
- [ ] 3.2 Vista de saldo por proveedor: pedido, recibido, facturado.

## 4. Cierre
- [ ] 4.1 Suites + build + contrato en verde.
- [ ] 4.2 Registrar en CONTRACT y archivar.
