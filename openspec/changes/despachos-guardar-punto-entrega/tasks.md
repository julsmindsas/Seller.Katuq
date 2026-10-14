## 1. Backend: guardar solo el punto (diff y aprobación antes de aplicar)

- [x] 1.1 Avisar a las sesiones activas que se toman `routers/orders.js` y un controlador nuevo de ubicación de entrega
- [x] 1.2 Portar `puntoEsProtegido` y la validación de punto en Colombia (no 0,0) a una utilidad del backend, con pruebas
- [x] 1.3 Controlador `POST /v1/orders/:id/ubicacion-entrega` con `auth` + `requireJwtTenant`: transacción, 404 (no existe o de otra empresa)/400/409 `SIN_ENVIO`/409 `PUNTO_PROTEGIDO`, escritura con rutas punteadas de los seis campos, sin `date_upd`
- [x] 1.4 Contract test del write-set: falla si escribe cualquier campo fuera de `envio.latitud|longitud|coordenadas|fuenteUbicacion|ubicacionGuardadaEn|ubicacionGuardadaPor`, si llama `updateOrderInternal` o si cambia `date_upd`
- [x] 1.5 Prueba de empresa ajena (404) y de punto protegido (409, sin escritura)
- [x] 1.6 (aprobado 14-oct; backend 452f590 desplegado por apoyodev ~15:16 COT junto con 0260ca0) Mostrar el diff a Daniel y esperar su aprobación; luego commit y despliegue del backend (fuera del modo automático)

## 2. Front: Despachos guarda y deja de guardar por accidente (diff y aprobación)

- [x] 2.1 `VentasService.guardarUbicacionEntrega(idPedido, punto)`
- [x] 2.2 `puntosSinGuardar` en memoria; `aplicarCoordenadasAPedido` ya no toca el pedido hasta que el backend confirma; con 409 adopta el punto devuelto
- [x] 2.3 `transformarPedidosAUbicaciones` pinta el punto guardado o el de memoria
- [x] 2.4 Ubicar los pedidos sin punto al cargar la lista (una vez por carga)
- [x] 2.5 "Volver a ubicar pedidos" en lugar de "Geocodificar Todo": solo fuente `geocodificada`; motivo "No pudimos confirmar el punto guardado" sin borrar
- [x] 2.6 Build de producción sin errores; contar gradientes y primarios prohibidos (no suben)

## 3. Verificación y registro

- [x] 3.1 (14-oct en producción: 4 pedidos guardados y repintados al recargar sin buscarlos ni volver a guardar; despachar y punto manual cubiertos por las pruebas, sin probar a mano) Probar en localhost:4200 con ALMARA: ubicar, recargar y ver que se pintan sin buscar; que despachar no arrastre un punto no guardado; que un punto manual no se pisa
- [x] 3.2 (contract test del write-set; en producción los pedidos traen solo los seis campos nuevos; sin sesión responde 401) Revisar en red que la única escritura nueva en `orders` es la del endpoint, con los seis campos
- [ ] 3.3 Probar "Volver a ubicar" con DAD-014257 (punto guardado en el Valle del Cauca)
- [x] 3.4 (D-423, front 9dbc59af publicado en 2026.10.14.4) Registrar D-XXX en `specs/CONTRACT.md` y commitear solo los archivos del cambio
