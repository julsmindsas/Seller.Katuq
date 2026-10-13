## Why

Punto Verde Vidagas (Cali y Yumbo) entrega en fincas y lugares sin nomenclatura: a veces el cliente da una dirección, a veces solo un punto en el mapa o el pin de WhatsApp. Katuq no lo permite: el modal de dirección exige nomenclatura, y un punto marcado a mano se borra la próxima vez que se edita la dirección. Jairo lo reportó el 2026-10-13 (ticket 1203).

Katuq ya guarda `latitud`, `longitud` y `coordenadas` en cada entrega del cliente (`clients.datosEntrega[]`) y del pedido (`orders.envio`), y la app de mensajeros ya abre Google Maps con ellas. El problema es de captura y conservación, no de modelo.

## What Changes

- El modal de dirección (`DireccionEstructuradaComponent`) gana el modo **"Solo ubicación"**: ciudad obligatoria (define la zona de cobro), referencia opcional ("Finca El Lago, vía Yumbo") y un punto. El punto se toma con clic en el mapa (ya existe), pegando un enlace de Google Maps o las coordenadas de un pin, o con el botón **"Usar mi ubicación"**.
- En los demás modos (urbana, manzana, rural) la ubicación queda como **complemento**: se puede corregir el punto a mano y ese punto se respeta.
- Cada entrega guarda dos campos nuevos, opcionales: `fuenteUbicacion` (`geocodificada` | `manual` | `enlace` | `gps`) y `enlaceUbicacion` (el enlace que se pegó, si aplica).
- Un punto con fuente distinta de `geocodificada` **nunca se vuelve a geocodificar ni se borra** al editar (hoy el modal re-geocodifica y, si falla, lo deja vacío).
- Una entrega es válida con ciudad y **dirección o ubicación**. Si no hay dirección, `direccionEntrega` se rellena con la referencia o con "Ubicación: lat, lng", para que la guía, las notificaciones y Enviame nunca reciban un texto vacío.
- Botón **"Abrir en Maps"** en el detalle de entrega del pedido y en Despachos, y el enlace en la guía de envío propia de Katuq.
- Se corrige de paso que la venta asistida pierda las coordenadas al editar o guardar una entrega (`crear-ventas.component.ts`).
- No hay colecciones ni endpoints nuevos.

## Capabilities

### New Capabilities
- `delivery-location`: captura, validación, conservación y uso de la ubicación (punto en el mapa) de una entrega, como alternativa o complemento a la dirección escrita, en cliente y pedido.

### Modified Capabilities
<!-- No hay specs previas de dirección de entrega en openspec/specs/. -->

## Impact

- **Frontend (Seller.Katuq)**: `components/ventas/entrega/direccion-estructurada/*` (modo nuevo, entradas de punto, no re-geocodificar), `shared/utils/client-delivery.ts` (regla de entrega completa y campos nuevos), `components/ventas/clientes/crear-cliente-modal/*` y `components/ventas/entrega/pedido-entrega.component.ts` (pasan el punto actual al modal), `components/ventas/crear-ventas/crear-ventas.component.ts` (conserva coordenadas), `components/despachos/despachos/despachos.component.ts` (no pisar un punto manual en `forzarGeocodificacion`, botón Abrir en Maps), utilidad nueva `shared/util/ubicacion-enlace.util.ts`.
- **Backend (katuq_admin_back_firebase)**: `services/logistics/guiaKatuqPdf.js` (enlace de ubicación en la guía) y `services/shippingProviders/enviameProvider.js` (respaldo de `street` cuando no hay dirección). Sin endpoints nuevos.
- **Datos**: dos campos opcionales nuevos en cada elemento de `clients.datosEntrega[]` y en `orders.envio`: `fuenteUbicacion` y `enlaceUbicacion`. Nada se migra; las entregas actuales siguen funcionando igual.
- **Riesgos sobre módulos sensibles**: toca `orders.envio` (solo los campos de entrega que ya se escriben al crear o editar el pedido) y la integración Enviame. No escribe `inventory`, `products`, precios ni consecutivos. Enviame y otras transportadoras siguen pidiendo un texto de calle: con el respaldo nunca va vacío, pero una "Ubicación: lat, lng" podría no ser aceptada por la transportadora; se prueba con un despacho real de ALMACEN BOMBAS antes de cerrar. La geocodificación del ticket 1136 (validación por corregimiento) se mantiene para los puntos geocodificados.
- **Decisión a registrar**: D-415 en `specs/CONTRACT.md`.

## No-goals

- Enlaces cortos `maps.app.goo.gl` (necesitan seguir la redirección en el servidor y Google puede bloquearlo). Fase 2.
- Leer la ubicación que el cliente manda por WhatsApp directo al pedido (el webhook ya la recibe como texto). Fase 2.
- El POS sigue con dirección en texto libre.
- Cálculo de zona de cobro por coordenadas: sigue por ciudad, como hoy.
- Cambios en la app de mensajeros: ya prioriza las coordenadas del pedido.
