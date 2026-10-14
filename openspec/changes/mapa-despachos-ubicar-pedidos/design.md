## Context

`DespachosComponent.geocodificarDireccionesPedidos` (l.6115) toma los pedidos sin `envio.latitud/longitud`, los procesa en lotes de 5 con 1 s de pausa y llama `geocodificarPedido` (l.6229), que usa `GeocodingService.geocodeDireccion(direccion, ciudad)` sin opciones (modo histórico: si nada sirve devuelve el centroide de la ciudad) y, ante error, `obtenerCoordenadasAproximadas` (otro centroide). Las coordenadas se escriben solo en memoria (`aplicarCoordenadasAPedido`). El mapa (`app-mapa-ubicaciones`, D-420) recibe `ubicaciones` ya filtradas por tener coordenadas.

El servicio ya ofrece el modo estricto (`GeocodeOpciones.direccionEntrega: true`, ticket 1136): valida contra barrio/zona y, si no hay resultado confiable, emite `GeocodingError` con `SIN_RESULTADO_CONFIABLE` o `DIRECCION_INVALIDA`. La venta asistida lo usa (`direccion-estructurada.component.ts:787-848`).

## Goals / Non-Goals

**Goals:** ubicar con barrio y zona en modo estricto; nunca pintar aproximados; lista "Sin ubicar"; una tarjeta de avance Katuq que no tape el mapa.

**Non-Goals:** guardar coordenadas en `orders`; marcar el punto desde Despachos; tocar el servicio o la venta asistida.

## Decisions

1. **Modo estricto del servicio, no lógica nueva.** `geocodificarPedido` pasa `{ barrio: envio.barrio, zonaCobro: envio.zonaCobro, direccionEntrega: true }`. Alternativa descartada: validar en el componente — duplicaría el validador del ticket 1136.
2. **Se elimina `obtenerCoordenadasAproximadas`** y el `catch` que lo usaba. El error se traduce a un motivo: `DIRECCION_INVALIDA` o sin dirección → "Falta la dirección"; `SIN_RESULTADO_CONFIABLE` u otro → "No encontramos esta dirección en el mapa".
3. **Estado de la ubicación en Despachos, presentación en el mapa.** `DespachosComponent` lleva `ubicacionAvance = { total, hechos, ubicados, sinUbicar: PedidoSinUbicar[], terminado }` y lo pasa por `@Input` al mapa; el mapa solo pinta. Reemplaza las llamadas imperativas `mostrarAnimacionGeocodificacion`, `mostrarEfectoBusqueda` y `actualizarProgresoGeocodificacion` (se eliminan los tres métodos).
4. **Pintar a medida que se ubica:** tras cada lote se llama `actualizarConfiguracionMapa()` siempre (hoy solo si el lote tenía despachados). Se conservan lotes de 5 y la pausa de 1 s para no subir la carga sobre los proveedores.
5. **Caché en memoria existente (`geocodingCache`) se conserva** y también guarda los fallos de la sesión, para no reintentar la misma dirección mala en la misma visita. No es una capa nueva.
6. **UI:** tarjeta flotante blanca arriba al centro del mapa (radio 16, sombra violeta difusa, texto 12.5px ink, barra 4px #5F3FE0 sobre #efe9ff); resumen final con par éxito/alerta; se oculta a los ~4 s con el temporizador del propio resumen (no sincroniza padre-hijo). "Sin ubicar" va como sección del panel lateral del mapa, debajo de Mensajeros (en móvil, debajo del mapa), con fila: número (mono, info), cliente, dirección y motivo en chip alerta. Clases sin "p-" (trampa `[class*="p-"]`). Se quitan del encabezado de Despachos la barra `bg-info` y del mapa el velo, los pulsos y los puntos.

## Risks / Trade-offs

- [Menos pedidos en el mapa: los aproximados pasan a "Sin ubicar"] → es el objetivo; la lista dice cuántos y por qué, y el resumen final lo hace visible.
- [Modo estricto rechaza direcciones que antes "pasaban"] → mismas reglas que ya usa la venta asistida desde el ticket 1136; los rechazos quedan listados.
- [Lo ubicado se pierde al recargar (no se persiste); Despachos ubica solo con "Geocodificar Todo" y al despachar, no al abrir] → aceptado en este cambio; persistir va en el cambio aparte sobre `orders`.
- [El loader global (velo de pantalla completa) salía con cada consulta de ubicación] → Despachos lo suprime con `LoaderService.suppressGlobalLoader()` mientras ubica; el avance lo muestra la tarjeta.
- [Panel lateral más largo con muchos sin ubicar] → la sección hace scroll propio y muestra el conteo en su cabecera.

## Migration Plan

Solo frontend. Despliegue normal del Seller; rollback revirtiendo el commit. Sin datos que migrar.
