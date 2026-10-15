## Why

Lo que el mapa de Despachos ubica se pierde al recargar (D-421 lo dejó en memoria a propósito). Además, revisando con ALMARA el 14-oct salió que **el punto ya se está guardando, pero por accidente y sin control**:

- `aplicarCoordenadasAPedido` (`despachos.component.ts:6280`) escribe el punto encontrado sobre el mismo objeto del pedido. Cuando después Despachos edita ese pedido (despachar, asignar transportador, cambiar estado o fecha: `editOrder` en l.2461, 2595, 3591, 3849, 3893), `POST /v1/orders/edit` reemplaza `envio` entero y el punto queda guardado sin `fuenteUbicacion` ni `coordenadas`. Antes de D-421 esto guardaba también los puntos aproximados (centro de la ciudad).
- Evidencia: DAD-014257 (ALMARA, "Carrera 79 #2-10", Belén Rincón, Medellín) tiene guardado un punto en el Valle del Cauca (4.038, -76.460), y Despachos lo pinta sin dudar: el mapa se aleja a toda Colombia por ese pin.
- Hoy solo la venta asistida trae punto desde el origen (lo copia del cliente, D-417). Shopify, WooCommerce, Osmosis y el bot de WhatsApp no traen coordenadas; el backend no geocodifica pedidos.

## What Changes

- **Guardar a propósito, solo el punto:** cuando Despachos ubica un pedido sin punto (modo estricto de D-421), guarda en ese pedido `envio.latitud`, `envio.longitud`, `envio.coordenadas` ("lat, lng") y `envio.fuenteUbicacion = 'geocodificada'`, más quién y cuándo. Nada más del pedido cambia.
- **Nunca pisar un punto puesto por una persona:** si el pedido ya tiene un punto `manual`, `enlace` o `gps` (D-417), no se escribe, aunque la pantalla lo pida.
- **Se acaba el guardado accidental:** el punto que la pantalla encuentra deja de mezclarse en el pedido hasta que quedó guardado; las ediciones de Despachos (despachar, transportador, estado, fecha) ya no arrastran puntos sin confirmar.
- **Al abrir Despachos**, los pedidos con punto guardado se pintan de una vez, sin volver a buscarlos. Solo se buscan los que no tienen punto.
- **"Geocodificar Todo" pasa a "Volver a ubicar pedidos"**: vuelve a buscar los puntos `geocodificada` (nunca los de una persona). Si encuentra uno confiable, lo guarda en lugar del anterior. Si no lo confirma, el pedido no se pinta y sale en "Sin ubicar" con el motivo "No pudimos confirmar el punto guardado"; el punto viejo no se borra.

## Capabilities

### New Capabilities
- (ninguna)

### Modified Capabilities
- `mapa-despachos` (creada en `mapa-despachos-ubicar-pedidos`, D-421): el requisito "Solo lectura de pedidos" se reemplaza por "Guardar solo el punto encontrado", y se agregan "Pintar el punto guardado al abrir" y "Volver a ubicar".

## No-goals

- **Sin backfill.** No se corrigen en lote los pedidos que ya tienen puntos guardados por accidente; si hace falta, va en otro cambio con un script `--dry-run` primero.
- No se agrega "marcar en el mapa" desde Despachos ni se edita la dirección.
- No se geocodifica en el backend ni al llegar el pedido de Shopify, WooCommerce, Osmosis o WhatsApp.
- No cambia la venta asistida, el modal de dirección ni el servicio de geocodificación.
- No cambian estados, totales, inventario, facturación, notificaciones ni consecutivos.

## Riesgos (módulos sensibles)

- **`orders` — write-set cerrado:** solo `envio.latitud`, `envio.longitud`, `envio.coordenadas`, `envio.fuenteUbicacion`, `envio.ubicacionGuardadaEn` y `envio.ubicacionGuardadaPor`. Nada de `estadoProceso`, `carrito`, totales, `date_upd` ni el resto de `envio`. No toca inventario, productos, precios ni consecutivos.
- **Endpoint nuevo** (requiere aprobación explícita): `POST /v1/orders/:id/ubicacion-entrega`. No pasa por `updateOrderInternal`, así que no dispara inventario, Siigo, correos, SMS, push al mensajero ni la máquina de estados. Valida que el pedido sea de la empresa autenticada.
- **Choque de versiones:** `editOrder` usa `date_upd` como versión (`_baseVersion`, 409 `STALE_WRITE`). El endpoint no cambia `date_upd`, para no hacer fallar la siguiente edición desde la misma pantalla.
- **Puntos equivocados ya guardados:** al abrir se pintan como están (igual que hoy); se corrigen con "Volver a ubicar". El riesgo baja, no desaparece, hasta un backfill.
- **Costo de búsquedas:** baja. Lo guardado no se vuelve a buscar en cada visita.

## Impact

- Backend `katuq_admin_back_firebase/functions`: `routers/orders.js` (ruta nueva) y un controlador pequeño, con `auth` + `requireJwtTenant`.
- Front: `VentasService` (método nuevo), `despachos.component.ts` (`geocodificarPedido`, `aplicarCoordenadasAPedido`, `forzarGeocodificacion`, `transformarPedidosAUbicaciones`, texto del menú).
- Sin colecciones nuevas. Decisión a registrar como D-XXX en `specs/CONTRACT.md`.
