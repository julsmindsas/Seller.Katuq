## 1. Backend: guardar solo el punto (diff y aprobación antes de aplicar)

- [x] 1.1 Avisar a las sesiones activas que se toman `routers/orders.js` y un controlador nuevo de ubicación de entrega
- [x] 1.2 Portar `puntoEsProtegido` y la validación de punto en Colombia (no 0,0) a una utilidad del backend, con pruebas
- [x] 1.3 Controlador `POST /v1/orders/:id/ubicacion-entrega` con `auth` + `requireJwtTenant`: transacción, 404 (no existe o de otra empresa)/400/409 `SIN_ENVIO`/409 `PUNTO_PROTEGIDO`, escritura con rutas punteadas de los seis campos, sin `date_upd`
- [x] 1.4 Contract test del write-set: falla si escribe cualquier campo fuera de `envio.latitud|longitud|coordenadas|fuenteUbicacion|ubicacionGuardadaEn|ubicacionGuardadaPor`, si llama `updateOrderInternal` o si cambia `date_upd`
- [x] 1.5 Prueba de empresa ajena (404) y de punto protegido (409, sin escritura)
- [ ] 1.6 Mostrar el diff a Daniel y esperar su aprobación; luego commit y despliegue del backend (fuera del modo automático)

## 2. Front: Despachos guarda y deja de guardar por accidente (diff y aprobación)

- [x] 2.1 `VentasService.guardarUbicacionEntrega(idPedido, punto)`
- [x] 2.2 `puntosSinGuardar` en memoria; `aplicarCoordenadasAPedido` ya no toca el pedido hasta que el backend confirma; con 409 adopta el punto devuelto
- [x] 2.3 `transformarPedidosAUbicaciones` pinta el punto guardado o el de memoria
- [x] 2.4 Ubicar los pedidos sin punto al cargar la lista (una vez por carga)
- [x] 2.5 "Volver a ubicar pedidos" en lugar de "Geocodificar Todo": solo fuente `geocodificada`; motivo "No pudimos confirmar el punto guardado" sin borrar
- [x] 2.6 Build de producción sin errores; contar gradientes y primarios prohibidos (no suben)

## 3. Verificación y registro

- [ ] 3.1 Probar en localhost:4200 con ALMARA: ubicar, recargar y ver que se pintan sin buscar; que despachar no arrastre un punto no guardado; que un punto manual no se pisa
- [ ] 3.2 Revisar en red que la única escritura nueva en `orders` es la del endpoint, con los seis campos
- [ ] 3.3 Probar "Volver a ubicar" con DAD-014257 (punto guardado en el Valle del Cauca)
- [ ] 3.4 Registrar D-XXX en `specs/CONTRACT.md` y commitear solo los archivos del cambio
