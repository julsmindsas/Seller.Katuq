# Tasks — reintegro-confiable-al-quitar-producto

## 0. Antes de tocar código
- [x] 0.1 Auditar producción (`scripts/auditar-devoluciones-producto-removido.js`): 12 devoluciones, 1 ya incorrecta (ALMARA FELICIDAD, devolvió 2 habiendo descontado 1).
- [ ] 0.2 Decidir con Daniel qué hacer con esa unidad fantasma: ajuste con motivo, o dejarla registrada como hallazgo.

## 1. Corrección, con pruebas antes que código de producción
- [ ] 1.1 Pruebas de los seis casos, rojas primero: doble devolución, descuento repartido en dos bodegas, cantidad inflada desde el cliente, producto sin fila de inventario, identidad espejo, y reducción de cantidad.
- [ ] 1.2 Reescribir `restoreProductStock`: lee TODAS las salidas del par pedido+producto, descuenta lo ya devuelto, y devuelve por bodega.
- [ ] 1.3 Normalizar identidad al buscar la fila de inventario (referencia→docId), como en el resto del dominio.
- [ ] 1.4 Resolver el caso sin fila de inventario según lo decidido en la spec.
- [ ] 1.5 Cubrir la disminución de cantidad en la edición de pedidos.

## 2. Cierre
- [ ] 2.1 Suites completas + contrato de write-set + build.
- [ ] 2.2 Volver a correr la auditoría: cero devoluciones por más de lo descontado.
- [ ] 2.3 Registrar en CONTRACT y archivar.
