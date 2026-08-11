# Tasks — mvp-compras

## 0. Checkpoint de Daniel
- [ ] 0.1 Autorizar la colección `proveedores` (la regla del proyecto exige aprobación explícita).
- [ ] 0.2 Registrar la decisión de que compras —y solo compras— escribe el costo del producto.
- [ ] 0.3 Definir si el costo se actualiza automático o se propone. Recomendado: automático con aviso sobre un umbral.

## 1. Proveedores
- [ ] 1.1 Servicio y validaciones del maestro (pura primero, con pruebas): NIT normalizado, nombre único por empresa, estado.
- [ ] 1.2 Endpoints y pantalla de proveedores.
- [ ] 1.3 La orden de compra referencia proveedor; las viejas con texto siguen funcionando.

## 2. El costo entra por la compra
- [ ] 2.1 Historial de costo por producto con origen (orden, proveedor, fecha, actor).
- [ ] 2.2 Al recibir, capturar el costo según la política elegida en 0.3.
- [ ] 2.3 Contract test: inventario no escribe products/precios; compras sí, y solo el costo.
- [ ] 2.4 Medir cuántos de los 5.489 productos sin costo quedan cubiertos tras la primera semana.

## 3. Saldo por proveedor
- [ ] 3.1 Registrar factura de compra sobre la orden (número, fecha, valor).
- [ ] 3.2 Vista de saldo por proveedor: pedido, recibido, facturado.

## 4. Cierre
- [ ] 4.1 Suites + build + contrato en verde.
- [ ] 4.2 Registrar en CONTRACT y archivar.
