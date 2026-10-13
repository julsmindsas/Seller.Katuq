## 1. Utilidades y regla de entrega

- [x] 1.1 Crear `shared/util/ubicacion-enlace.util.ts`: `leerUbicacion(texto)` que extrae lat,lng de enlaces de Google Maps (`@lat,lng`, `q=`, `ll=`, `query=`, `destination=`) y de texto `lat, lng`; `esPuntoValido(lat, lng)` (rango Colombia, sin 0,0); `enlaceMaps(lat, lng)`. Con pruebas unitarias (Karma) de cada formato, de un enlace corto sin coordenadas y de puntos inválidos
- [x] 1.2 En `shared/utils/client-delivery.ts`: agregar `fuenteUbicacion` y `enlaceUbicacion` a la forma canónica y al normalizador (sin fuente = `geocodificada`); cambiar `esEntregaCompleta` a ciudad y (dirección o punto válido); agregar `textoDireccionRespaldo(entrega)`. Pruebas unitarias
- [x] 1.3 Build sin errores

## 2. Modal de dirección

- [x] 2.1 Leer completo `direccion-estructurada.component.ts/.html/.scss` antes de editar
- [x] 2.2 Agregar el modo "Solo ubicación" al selector de tipo: apaga validaciones de nomenclatura, deja ciudad y punto obligatorios y referencia opcional
- [x] 2.3 Agregar el campo "Pegar enlace o coordenadas" (usa `leerUbicacion`, mensaje claro si no se puede leer) y el botón "Usar mi ubicación" (`navigator.geolocation`, mensaje si se niega el permiso). Ambos ubican el punto en el mapa existente
- [x] 2.4 Entradas `coordenadasActuales`, `fuenteActual`, `enlaceActual`: si la fuente no es `geocodificada`, mostrar ese punto y no geocodificar al abrir ni al confirmar; el clic en el mapa pone la fuente en `manual`
- [x] 2.5 Devolver en el resultado `fuenteUbicacion` y `enlaceUbicacion`, y en modo ubicación llenar `direccion` con `textoDireccionRespaldo`
- [x] 2.6 Estilos con los tokens del tema "Todos los pedidos" (acento `#5F3FE0`, plano)
- [x] 2.7 Build sin errores

## 3. Quién abre el modal

- [x] 3.1 `crear-cliente-modal` (pestaña Entrega): pasar el punto, la fuente y el enlace actuales al editar una dirección; guardar los campos nuevos; usar `esEntregaCompleta` actualizada
- [x] 3.2 `pedido-entrega.component.ts`: pasar punto, fuente y enlace actuales (:1107); validar con `esEntregaCompleta` (:316); guardar los campos nuevos en `envio`
- [x] 3.3 `crear-ventas.component.ts`: conservar `latitud`, `longitud`, `coordenadas`, `fuenteUbicacion` y `enlaceUbicacion` en `editarDatosEntrega` (:2123) y `guardarDatosEntrega` (:2414); usar `esEntregaCompleta` en la validación de :3596. Mostrar el diff antes de aplicar (toca la creación del pedido)
  - Revisado 2026-10-13: la venta asistida captura la entrega con `<pedido-entrega>` (corregido en 3.2, que también perdía las coordenadas en `editarDatosEntrega`). En `crear-ventas`, `editarDatosEntrega` no tiene llamadas y `guardarDatosEntrega` es de un modal viejo sin dirección ni mapa; la validación de :3596 solo exige `direccionEntrega`, que el modo ubicación siempre llena. No se toca `crear-ventas` ni la creación del pedido.
- [x] 3.4 Build sin errores

## 4. Despachos y pedido

- [x] 4.1 `despachos.component.ts` `forzarGeocodificacion` (:6433): saltar pedidos con fuente distinta de `geocodificada`
- [x] 4.2 Botón "Abrir en Maps" en el detalle de entrega del pedido y en Despachos (solo si hay punto)
- [x] 4.3 Build sin errores

## 5. Backend

- [x] 5.1 `services/shippingProviders/enviameProvider.js`: si `direccionEntrega` llega vacía, usar referencia o "Ubicación: lat, lng" como `street`. Prueba unitaria
- [x] 5.2 `services/logistics/guiaKatuqPdf.js`: si hay punto, mostrar el enlace de Google Maps en la guía. Prueba con el smoke del generador
- [x] 5.3 Verificar que `clients/edit` y la edición de pedidos no filtran `fuenteUbicacion` ni `enlaceUbicacion`
- [x] 5.4 `node --check` de los archivos tocados

## 6. Cierre

- [x] 6.1 Registrar D-415 en `specs/CONTRACT.md` y bitácora
- [ ] 6.2 Pruebas en navegador: crear cliente con entrega solo por ubicación (mapa, enlace, mi ubicación); editarla sin perder el punto; venta asistida con esa entrega; editar la entrega desde la lista de pedidos; Despachos (Abrir en Maps y forzar geocodificación); guía de envío Katuq
- [ ] 6.3 Prueba con un despacho real por Enviame (ALMACEN BOMBAS) de un pedido solo por ubicación, con permiso del usuario
- [x] 6.4 Nota interna en el ticket 1203 con lo hecho y los archivos tocados
