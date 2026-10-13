## Context

- La entrega vive en `clients.datosEntrega[]` y se copia al pedido en `orders.envio` (`crear-ventas.component.ts:2114`). Forma canónica en `shared/utils/client-delivery.ts`: `direccionEntrega, barrio, nombreUnidad, especificacionesInternas, ciudad, departamento, zonaCobro, valorZonaCobro, codigoPV, latitud, longitud, coordenadas`.
- `DireccionEstructuradaComponent` (`components/ventas/entrega/direccion-estructurada/`) tiene modos urbana, manzana y rural, un mapa Leaflet con clic para marcar (:785-832) y geocodificación en el front (`shared/services/geocoding.service.ts` con el validador del ticket 1136). Exige nomenclatura y ciudad, y no cierra sin coordenadas (:892-900). Al abrirlo no recibe el punto actual: re-geocodifica y, si falla, borra el punto (:766).
- Lo abren `crear-cliente-modal` (pestaña Entrega) y `pedido-entrega.component.ts` (lista de pedidos, despachos, producción, POS-list).
- Quién lee el punto: mapa de Despachos (`despachos.component.ts:6333`), `BK/tools/_geocoder.js` (prioriza el del pedido), ofertas de transportadoras, analítica y la app de mensajeros (abre Google Maps con lat,lng).
- Bug actual: `crear-ventas.component.ts` arma la entrega sin `latitud/longitud/coordenadas` en `editarDatosEntrega` (:2123) y `guardarDatosEntrega` (:2414).

## Goals / Non-Goals

**Goals:**
- Registrar una entrega solo con ubicación, o con dirección más un punto corregido a mano.
- Que un punto que no salió de la geocodificación no se pierda nunca.
- Que la guía, las notificaciones y Enviame sigan recibiendo un texto de dirección.
- Que quien despacha pueda abrir el punto en Google Maps.

**Non-Goals:**
- Enlaces cortos `maps.app.goo.gl`, ubicación recibida por WhatsApp directo al pedido, POS, zona de cobro por coordenadas, cambios en la app de mensajeros (ver proposal).

## Decisions

1. **Reutilizar los campos de coordenadas existentes y agregar solo `fuenteUbicacion` y `enlaceUbicacion`.**
   - Alternativa descartada: un objeto `ubicacion: {lat, lng, fuente}` nuevo. Obligaría a migrar a todos los lectores actuales (despachos, `_geocoder`, app de mensajeros, analítica), que ya leen `latitud/longitud/coordenadas`.
   - Sin `fuenteUbicacion` se asume `geocodificada`: las entregas actuales no cambian de comportamiento.

2. **Modo nuevo dentro del mismo modal, no un componente aparte.** El modal ya tiene el mapa, la ciudad y la vista previa. Se agrega `tipoDireccion = 'ubicacion'` junto a urbana, manzana y rural. Las validaciones de nomenclatura se apagan en ese modo; ciudad y punto quedan obligatorios.

3. **El modal recibe el punto actual.** Nuevas entradas `coordenadasActuales`, `fuenteActual` y `enlaceActual`. Si la fuente no es `geocodificada`, el modal muestra ese punto y no llama a la geocodificación al abrir ni al confirmar. Si el usuario mueve el punto con clic, la fuente pasa a `manual`.

4. **Lectura de enlaces en el front, en una utilidad pura** (`shared/util/ubicacion-enlace.util.ts`): extrae `lat,lng` de `@lat,lng`, `q=`, `ll=`, `query=`, `destination=` y de texto `lat, lng`. Valida el rango de Colombia (lat entre -4.3 y 13.5, lng entre -82 y -66.8) y descarta 0,0. Sin red ni endpoint: los enlaces cortos quedan para la fase 2.

5. **"Usar mi ubicación" con `navigator.geolocation`**, con un mensaje claro si el navegador niega el permiso. Sirve sobre todo cuando quien registra está en el sitio.

6. **Regla de entrega completa en un solo lugar:** `esEntregaCompleta` en `client-delivery.ts` pasa a `ciudad && (direccionEntrega || puntoValido)`. Las validaciones que hoy repiten la regla (`pedido-entrega.component.ts:316`, `crear-ventas.component.ts:3596`) llaman a esta función.

7. **Texto de respaldo al guardar, no al leer.** Al confirmar el modo ubicación, `direccionEntrega` se llena con la referencia o con "Ubicación: lat, lng". Así la guía PDF, las notificaciones, Enviame y cualquier lector que hoy usa `direccionEntrega` siguen funcionando sin tocarlos. En el backend, `enviameProvider.js` además usa el mismo respaldo si encuentra `direccionEntrega` vacía (defensa para pedidos viejos).

8. **"Abrir en Maps"** usa `https://www.google.com/maps/search/?api=1&query=lat,lng` (funciona en web y abre la app en el celular). En la guía PDF (`guiaKatuqPdf.js`) va el enlace en texto; un QR queda como mejora si se pide.

9. **Despachos:** `forzarGeocodificacion` (:6433) salta los pedidos con fuente distinta de `geocodificada`.

10. **UI** con los tokens del tema "Todos los pedidos" (`openspec/specs/design-system/spec.md`): acento `#5F3FE0`, plano, sin gradientes. El modo nuevo se presenta como una opción más del selector de tipo de dirección.

## Risks / Trade-offs

- [Una transportadora rechaza "Ubicación: lat, lng" como calle] → Con referencia escrita el texto es legible. Se prueba con un despacho real de ALMACEN BOMBAS por Enviame antes de cerrar. Si Enviame lo rechaza, se pide referencia obligatoria para despachos por transportadora externa.
- [La geolocalización del navegador es imprecisa en computador] → Se muestra el punto en el mapa para que el usuario lo confirme o lo corrija.
- [Un punto manual equivocado se conserva para siempre] → El usuario siempre puede moverlo o volver a geocodificar a propósito con el botón existente; solo se evita que el sistema lo borre solo.
- [Lectores que validan `direccionEntrega` con reglas de nomenclatura] → El respaldo es texto libre. Se revisan los validadores del backend (no hay validación de `datosEntrega` en `clients.js`) y la notificación de entrega.
- [Toca `orders.envio`, módulo sensible] → Solo se agregan dos campos opcionales y se corrige la pérdida de coordenadas; la creación del pedido, el inventario y los consecutivos no cambian.

## Migration Plan

- Sin migración de datos: las entregas sin `fuenteUbicacion` se tratan como `geocodificada`.
- Despliegue: backend primero (respaldo de Enviame y enlace en la guía son compatibles con pedidos viejos), luego el front.
- Rollback: revertir el front deja las entregas nuevas con campos extra que nadie lee y con `direccionEntrega` ya rellena; no rompe nada.

## Open Questions

- ¿La referencia debe ser obligatoria cuando el pedido va por transportadora externa (Enviame/Prindel)? Por defecto: opcional, y se decide tras la prueba con Enviame.
- ¿Se quiere QR en la guía PDF desde la fase 1?
