# Tasks — compras-reposicion

## 1. El cálculo (puro primero)
- [ ] 1.1 `necesidadDeReposicion`: consumo × (cobertura objetivo + días de entrega) − saldo − pendiente, con pruebas.
- [ ] 1.2 Urgencia: cobertura menor que los días de entrega.
- [ ] 1.3 Pendiente por recibir, leído de las órdenes abiertas y parciales de esa bodega.

## 2. Datos que faltan
- [ ] 2.1 `diasEntrega` en el maestro de proveedores (con su validación y su valor por defecto).
- [ ] 2.2 Último costo y último proveedor por producto, desde las órdenes anteriores.

## 3. Endpoint y pantalla
- [ ] 3.1 `GET /v1/ordenes-compra/sugerencia` (antes de `/:id`, o se lee como un id).
- [ ] 3.2 Pantalla "Qué comprar" en Compras: urgentes arriba, cuántos quedaron fuera por falta de demanda.
- [ ] 3.3 Convertir la selección en órdenes agrupadas por proveedor, informando cuáles se crearon.

## 4. Cierre
- [ ] 4.1 Suites + build + contrato en verde.
- [ ] 4.2 Contrastar la sugerencia contra ALMARA FELICIDAD antes de publicar: los 388 productos deben salir con nombre y cantidad razonable.
- [ ] 4.3 Desplegar y registrar en CONTRACT.
