# Tareas — combos en una sola línea (ticket 1097)

- [x] 1. Utilidad `shared/utils/combo-lineas.ts` (agrupar, contar combos, abrir/cerrar) + spec.
- [x] 2. Marca `combo` en `Carrito` (modelo) y al agregar el combo (cotización y venta asistida).
- [x] 3. Editor de cotizaciones: fila del combo (cantidad, descuento, abrir, quitar) y encabezado del combo abierto.
- [x] 4. Documento de la cotización (vista previa/PDF) y anexo de precios sugeridos sin productos de combos cerrados.
- [x] 5. Backend: vista pública `/c/:token` agrupa combos cerrados + prueba (7 casos).
- [x] 6. Conversión cotización → pedido conserva la marca; `crear-ventas` también.
- [x] 7. Carrito de venta asistida: fila del combo y encabezado del combo abierto.
- [x] 8. Orden de venta y PDF/correo del pedido (no la comanda).
- [ ] 9. Build de producción sin errores, despliegue (front + back) y verificación en producción.
