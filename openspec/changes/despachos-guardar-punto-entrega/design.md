## Context

D-421 ubica en modo estricto y deja el punto en memoria, pero `aplicarCoordenadasAPedido` lo escribe sobre el objeto del pedido y cualquier `editOrder` posterior de Despachos lo guarda (`POST /v1/orders/edit` → `updateOrderInternal`, `controllers/orders.js:3313`, que hace `update` de primer nivel: `envio` se reemplaza entero). Ese camino arrastra efectos (inventario, Siigo, correos, push al mensajero, máquina de estados) y usa `date_upd` como versión optimista (`_baseVersion` → 409 `STALE_WRITE`, l.3385-3397, 4051). No hay endpoint parcial para `envio`. `puntoEsProtegido` (`shared/utils/client-delivery.ts:143`) define los puntos de una persona; `formatoCoordenadas` (`ubicacion-enlace.util.ts:90`) da "lat, lng".

## Goals / Non-Goals

**Goals:** guardar solo el punto, con fuente y autor; no pisar puntos de personas; cortar el guardado accidental; pintar lo guardado sin buscarlo otra vez; "Volver a ubicar" que corrige sin borrar.

**Non-Goals:** backfill, marcar en el mapa, geocodificar en backend o al llegar el pedido, tocar venta asistida o el servicio de geocodificación.

## Decisions

1. **Endpoint dedicado, no `editOrder`.** `POST /v1/orders/:id/ubicacion-entrega` con `auth` + `requireJwtTenant`. Body: `{ latitud, longitud }`. En una transacción: lee el pedido; 404 `ORDER_NOT_FOUND` si no existe o si `company` no es la del token (no se revela que el pedido existe, igual que "reenviar confirmación"); 409 `SIN_ENVIO` si no hay datos de entrega; 400 `PUNTO_INVALIDO` si el punto no está en Colombia o es 0,0; si `puntoEsProtegido(envio)` (misma regla, portada al backend) responde 409 `PUNTO_PROTEGIDO` sin escribir y devuelve el punto vigente. Servicio en `services/logistics/guardarUbicacionEntrega.js`, que reusa `puntoEntrega` de D-417. Escribe con rutas punteadas: `envio.latitud`, `envio.longitud`, `envio.coordenadas`, `envio.fuenteUbicacion: 'geocodificada'`, `envio.ubicacionGuardadaEn` (hora del servidor), `envio.ubicacionGuardadaPor` (email del token). **No toca `date_upd`** para no romper el `_baseVersion` de la pantalla. Alternativa descartada: `editOrder` con el pedido completo — dispara efectos y reemplaza `envio` entero.
2. **Punto en memoria aparte.** Despachos guarda lo encontrado en un `Map<nroPedido, {lat,lng}>` (`puntosSinGuardar`). `transformarPedidosAUbicaciones` pinta `envio.latitud/longitud` o, si no hay, el de ese mapa. Solo cuando el endpoint responde 200 se copian los seis campos al `envio` del pedido en memoria, para que las ediciones siguientes lleven exactamente lo guardado. Si responde 409 `PUNTO_PROTEGIDO`, se adopta el punto que devuelve el backend.
3. **Al abrir:** `geocodificarDireccionesPedidos` ya filtra los pedidos sin punto; se llama una vez al cargar la lista (hoy solo con el menú y al despachar). Mismos lotes de 5 con 1 s de pausa.
4. **Volver a ubicar:** reemplaza `forzarGeocodificacion`. Toma los pedidos con fuente `geocodificada` (o sin fuente y con punto), los busca en estricto; si hay resultado lo guarda con el endpoint; si no, los marca "No pudimos confirmar el punto guardado" y los saca del mapa en esta visita (un `Set` en memoria), sin borrar nada.
5. **Guardar no bloquea pintar:** el pin aparece al encontrarlo; si guardar falla, queda pintado en esta visita y se reintenta en la siguiente. Los errores de guardado no se muestran como velo ni bloquean la tarjeta de avance.
6. **Servicio:** método `guardarUbicacionEntrega(idPedido, punto)` en `VentasService` (extiende `BaseService`).

## Risks / Trade-offs

- [Dos pantallas guardan a la vez] → la transacción y la regla de protección deciden; gana el último punto `geocodificada`, nunca sobre uno de persona.
- [El endpoint no cambia `date_upd`] → la lista de pedidos no "ve" el cambio como edición; aceptable: es un dato de ubicación, no de negocio.
- [Puntos equivocados ya guardados] → se pintan hasta "Volver a ubicar"; el backfill queda fuera.
- [Endpoint nuevo en `orders`] → write-set cerrado y contract test que falla si escribe cualquier otro campo.

## Migration Plan

Primero el backend (ruta aditiva; nadie la llama), luego el front. Rollback: revertir el front deja de llamarla; los puntos guardados son válidos y siguen sirviendo.
