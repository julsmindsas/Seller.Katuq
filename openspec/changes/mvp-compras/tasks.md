# Tasks — mvp-compras

## 0. Checkpoint de Daniel — RESUELTO (2026-08-11)
- [x] 0.1 Colección `proveedores`: autorizada.
- [x] 0.2 Compras escribe el costo Y el cargue por Excel sigue como está: dos fuentes que conviven.
- [x] 0.3 Automático, teniendo en cuenta el Excel: cada escritura deja su fuente y avisa cuando el cambio es grande.
- [x] 0.4 HALLAZGO: `productCostHistory`, `productCostImports` y el catálogo de fuentes YA existen en `controllers/productCosts.js`. La pieza 2 se reduce a sumar `compra` como fuente sobre esa tubería, no a construir una nueva.

## 1. Proveedores
- [x] 1.1 Servicio y validaciones del maestro (pura primero, con pruebas): NIT normalizado, nombre único por empresa, estado. — `services/purchasing/supplierService.js`, 11/11 casos.
- [x] 1.2 Endpoints y pantalla de proveedores. — `/v1/proveedores` + `compras/proveedores`, con el saldo de cada uno al frente.
- [x] 1.3 La orden de compra referencia proveedor; las viejas con texto siguen funcionando. — se guarda `proveedorId` **y** el nombre; escribirlo a mano sigue siendo válido.

## 2. El costo entra por la compra (sobre lo que ya existe)
- [x] 2.1 Núcleo reusable del costo. — DESVÍO: en vez de extraer `updateProductCost` (manejador HTTP con su propia validación de request), `purchaseCostCapture` escribe los mismos campos y el mismo historial. Extraerlo habría tocado un endpoint de precios en producción para no ganar nada hoy; queda anotado como deuda si aparece un tercer llamador.
- [x] 2.2 `compra` en el catálogo de fuentes y captura del costo al recibir, con la orden y el proveedor como origen.
- [x] 2.5 Aviso cuando el costo de una compra se aparte mucho del vigente (30%), sin bloquear la recepción: la mercancía ya llegó y frenar el registro no la devuelve.
- [x] 2.3 Contract test: inventario no escribe products/precios; compras sí, y solo el costo. — guarda que `controllers/inventory.js` no vuelva a importar `purchaseCostCapture`.
- [ ] 2.4 Medir cuántos de los 5.489 productos sin costo quedan cubiertos tras la primera semana de uso. — depende de que empiecen a recibir contra órdenes.

## 3. Saldo por proveedor
- [x] 3.1 Registrar factura de compra sobre la orden (número, fecha, valor).
- [x] 3.2 Vista de saldo por proveedor: pedido, recibido, facturado, y marcado cuando el proveedor facturó de más.

## 4. Cierre
- [x] 4.1 Suites + build + contrato en verde. — 20/20 órdenes, 11/11 proveedores, 10/10 costo, contrato de inventario PASS, `npm run build` sin errores.
- [x] 4.2 Desplegar (backend + frontend), aplicar los menús de rol y registrar en CONTRACT. — backend `c4b68db` en `katuq-api`, frontend `2026.08.11.11`, 75 roles con la pantalla, D-171 en CONTRACT.
- [ ] 4.3 Archivar el cambio. Queda abierto a propósito hasta cerrar 2.4: archivarlo hoy daría por medido algo que todavía no se midió.
