> Despachos es módulo sensible: un cambio a la vez, diff a la vista antes de commitear. Ninguna tarea despliega ni escribe en producción. Cada tarea de código cierra con el build de producción sin errores.

## 1. Funciones puras y pruebas

- [x] 1.1 `src/app/components/despachos/despachos/estado-despacho.ts`: `estadoDestino`, `aplicarCambioDeEstado` (misma tabla que hoy tiene `cambiarEstado`) y `yaQuedoAsi`
- [x] 1.2 `tests/despachos/estado-despacho.test.js`: códigos 0–5, campos intactos, `yaQuedoAsi`, y el flujo releer → reaplicar → guardar con un `editOrder` que rechaza una vez. **10/10 en verde.**
- [x] 1.3 `VentasService.getPedidoPorNumero(nroPedido)` sobre `GET /v1/orders/getOrderByNroPedido/:nroPedido`, devuelve `null` si no existe o falla

## 2. Pantalla de Despachos (un solo archivo)

- [x] 2.1 `cambiarEstado` usa `estadoDestino` y `aplicarCambioDeEstado`; el guardado pasa a `guardarCambioDeEstado` con reintento
- [x] 2.2 `reintentarConPedidoFresco`: releer, `yaQuedoAsi`, reaplicar, guardar una vez, `Object.assign` al objeto de la pantalla
- [x] 2.3 `cambioDeEstadoGuardado` y `mostrarErrorDeEstado` conservan lo de hoy (refrescar, geocodificar si Despachado, avisos)
- [x] 2.4 Build de producción sin errores (16-oct 16:38, hash 8ea7f871)

## 3. Verificación y registro

- [x] 3.1 Nota interna en el ticket 1224 con lo hecho y lo que falta probar
- [ ] 3.2 (D-460 registrado) Commit solo con los archivos del cambio, con el OK de Santiago
- [ ] 3.3 Tras la publicación (Daniel): probar con ALMARA quitar de una orden un pedido que empaque marcó entretanto; avisar a Yulie y cerrar el ticket
