## Why

El mapa de Despachos ubica mal los pedidos y lo muestra feo. Daniel (13-oct): "mejora la geocodificación de los pedidos, y el loading y esa vaina más bonita". Verificado en `despachos.component.ts`:

- Ubica sin barrio ni zona de cobro (`geocodificarPedido`, l.6246 llama `geocodeDireccion(direccion, ciudad)` sin opciones), aunque el servicio los recibe desde el ticket 1136 (`GeocodeOpciones`) y la venta asistida ya los manda (`direccion-estructurada.component.ts:787-795`).
- Cuando no encuentra la dirección pinta el pedido en el **centro de la ciudad**, dos veces: el servicio (modo histórico, `geocodificacionAproximada`) y el componente (`obtenerCoordenadasAproximadas`, l.6268). Esos puntos falsos se ven igual que los reales y se apilan en el centro: el despachador decide con ubicaciones inventadas.
- La carga se ve como dos piezas sueltas y fuera del tema: barra azul `bg-info` en el encabezado (`despachos.component.html:28-40`) y un velo morado oscuro sobre el mapa con barra verde, pulsos y puntos flotantes, con el texto técnico "Geocodificando direcciones…".

## What Changes

- **Ubicar con barrio y zona:** cada pedido se ubica con `barrio` y `zonaCobro` de su envío y en modo estricto (`direccionEntrega: true`), el mismo de la venta asistida: todo resultado se valida contra el área esperada.
- **Sin puntos inventados:** se quita el respaldo al centro de la ciudad (el del servicio, por el modo estricto, y `obtenerCoordenadasAproximadas` del componente). Lo que no se pueda ubicar no se pinta.
- **Lista "Sin ubicar":** junto al mapa, con número de pedido, cliente, dirección y el motivo en lenguaje de negocio ("No encontramos la dirección", "Falta la dirección", "La dirección cae fuera del barrio o la zona"). Solo informa; marcar el punto a mano es parte de otro cambio (ver No-goals).
- **Carga al estilo Katuq:** una sola tarjeta blanca compacta sobre el mapa, sin velo: "Ubicando pedidos en el mapa · 12 de 30" con barra delgada morada; al terminar, "28 ubicados · 2 sin ubicar" unos segundos. Se quitan la barra azul del encabezado, el velo oscuro, los pulsos, los puntos flotantes y el marcador/círculo animado temporal (`mostrarAnimacionGeocodificacion`, `mostrarEfectoBusqueda`).
- Los pedidos se pintan a medida que se ubican (hoy solo se refresca el mapa tras lotes con despachados).

## Capabilities

### New Capabilities
- `mapa-despachos`: cómo el mapa de Despachos ubica los pedidos, qué hace con los que no puede ubicar y cómo comunica el avance.

### Modified Capabilities
- (ninguna; `design-system` se aplica sin cambiar sus requisitos)

## No-goals

- **No se guardan coordenadas en `orders`.** Persistir el punto encontrado (hoy lo ubicado se pierde al recargar; Despachos solo ubica con "Geocodificar Todo" y al despachar un pedido, no al abrir) va en otro cambio, con diff y aprobación de módulo sensible, respetando los puntos protegidos de D-417.
- No se agrega "marcar en el mapa" desde Despachos (también escribe en `orders`).
- No cambia el servicio de geocodificación, sus proveedores, ni la venta asistida.
- No cambian los mensajeros del mapa (D-420) ni qué pedidos entran al mapa.

## Riesgos (módulos sensibles)

- `orders`: **solo lectura**. El write-set del cambio es vacío: las coordenadas siguen viviendo en memoria como hoy.
- Menos pedidos pintados: los que hoy salen en el centro de la ciudad pasan a "Sin ubicar". Es intencional (eran falsos), pero cambia lo que ve el despachador; la lista lo explica.
- `forzarGeocodificacion` mantiene la regla de D-417 (no recalcula puntos protegidos).

## Impact

- `src/app/components/despachos/despachos/despachos.component.{ts,html}`: `geocodificarDireccionesPedidos`, `geocodificarPedido`, `obtenerCoordenadasAproximadas` (se elimina), encabezado de progreso.
- `src/app/components/despachos/components/mapa-ubicaciones/mapa-ubicaciones.component.{ts,html,scss}`: tarjeta de avance y lista "Sin ubicar" (entradas nuevas), fuera el velo y las animaciones.
- Sin endpoints ni colecciones nuevas. Decisión a registrar como D-XXX en `specs/CONTRACT.md` al implementar.
