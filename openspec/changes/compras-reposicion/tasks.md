# Tasks — compras-reposicion

## 1. El cálculo (puro primero)
- [x] 1.1 `necesidadDeReposicion`: consumo × (cobertura objetivo + días de entrega) − saldo − pendiente, con pruebas.
- [x] 1.2 Urgencia: cobertura menor que los días de entrega.
- [x] 1.3 Pendiente por recibir, leído de las órdenes abiertas y parciales de esa bodega.

## 2. Datos que faltan
- [x] 2.1 `diasEntrega` en el maestro de proveedores (con su validación y su valor por defecto).
- [x] 2.2 Último costo y último proveedor por producto, desde las órdenes anteriores.

## 3. Endpoint y pantalla
- [x] 3.1 `GET /v1/ordenes-compra/sugerencia` (antes de `/:id`, o se lee como un id).
- [x] 3.2 Pantalla "Qué comprar" en Compras: urgentes arriba, cuántos quedaron fuera por falta de demanda.
- [x] 3.3 Convertir la selección en órdenes agrupadas por proveedor, informando cuáles se crearon.

## 4. Cierre
- [x] 4.1 Suites + build + contrato en verde.
- [x] 4.2 Contrastar la sugerencia contra ALMARA FELICIDAD antes de publicar. — el contraste encontró DOS defectos: los nombres salían vacíos (viven en `crearProducto.titulo`) y se sugería comprar lo que la empresa fabrica. Corregidos; la lista quedó en 163 productos con cantidades creíbles.
- [x] 4.3 Desplegar y registrar en CONTRACT. — backend `1e82008`, frontend `2026.08.11.20`, D-172.

## 5. Lo que siguió en el mismo turno
- [x] 5.1 Devolución al proveedor, con su motivo canónico propio para que no reste demanda.
- [x] 5.2 Comparador de precios por producto.
- [x] 5.3 Mandar la orden al proveedor por WhatsApp.
- [ ] 5.4 Conciliar la nota crédito del proveedor: hoy se ve lo que debería volver, no si volvió.
