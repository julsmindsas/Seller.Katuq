# Guardar una venta asistida como borrador para retomarla después

## Why

Ticket 1169 (Jairo Arango): muchas ventas asistidas quedan en espera porque al
vendedor le falta un dato (la dirección, la fecha, la confirmación del cliente o
del pago). Hoy no hay forma de dejarlas guardadas. Si empieza otra venta, la
primera se pierde.

Hoy (medido en el código el 2026-10-15):

- La venta en curso vive en el navegador: el carrito en `localStorage['carrito']`
  y el cliente en `sessionStorage['cliente']`, más `pedidoTemporal`,
  `selectedCity` y `warehouse`.
- Hay una sola venta en curso por navegador. `limpiarCacheCompleto()` la borra al
  empezar otra.
- El cliente se pierde al cerrar la pestaña (`sessionStorage`). La venta no pasa a
  otro equipo ni a otro compañero.
- El POS escribe la misma llave `localStorage['carrito']`. Abrir el POS en la
  misma sesión puede pisar el carrito de una venta asistida a medias.

## What Changes

- **Botón "Guardar borrador"** en la venta asistida, disponible desde que hay un
  cliente o al menos un producto. Guarda todo lo que lleva la venta: cliente,
  productos con su configuración, entrega, facturación, ciudad, bodega y notas.
  Pide un nombre corto opcional, por ejemplo "Keikaku, falta dirección".
- **Al guardar, la pantalla queda limpia** para empezar otra venta. El borrador no
  se pisa.
- **"Mis borradores"** en la venta asistida: una lista con el cliente, el número
  de productos, el total estimado, la fecha y quién lo guardó. Desde ahí se puede:
  - **Retomar:** carga la venta tal como quedó y sigue el flujo normal hasta crear
    el pedido.
  - **Eliminar** el borrador.
- **Al crear el pedido desde un borrador, el borrador se borra.**
- **Un borrador NO es un pedido.** No toma número de pedido, no descuenta ni
  reserva inventario, no aparece en Todos los pedidos ni en reportes, y no factura.
- **Precios y existencias se recalculan al retomar.** Si un producto cambió de
  precio, ya no existe o no tiene existencias, se avisa al retomar, como si se
  agregara de nuevo.
- **Quién ve qué:** cada vendedor ve sus borradores. La familia Administrador ve
  los de toda la empresa y puede retomar el de otro (por ejemplo, si el vendedor
  no está). El filtro se aplica en el servidor y por empresa.
- **Vencimiento:** los borradores sin tocar durante 30 días se borran solos. Antes
  se avisa en la lista con "vence en N días".

## Capabilities

### New Capabilities
- `venta-asistida-borradores`: guardar, listar, retomar y eliminar borradores de
  venta asistida por empresa y usuario, sin crear pedido.

### Modified Capabilities
_(ninguna spec vigente describe el estado en curso de crear-ventas)_

## No-goals

- Borradores en el POS. Es otro flujo; se puede extender después.
- Convertir un borrador en cotización. Hoy existe la cotización → pedido, no al
  revés.
- Compartir el borrador con el cliente o enviárselo.
- Reservar inventario o apartar el número de pedido mientras está en borrador.
- Unificar los dos formularios de venta asistida (ticket 1168).
- Corregir la llave compartida `carrito` entre POS y venta asistida. Se anota como
  riesgo; si el diseño lo exige se propone aparte.

## Impact

- **Módulo sensible (`orders`, crear-ventas).** Este cambio solo agrega guardar y
  restaurar el estado. No cambia la creación del pedido, los consecutivos, el
  inventario ni los precios.
- **Colección nueva (requiere aprobación):** `salesDrafts`, un documento por
  borrador con `company`, el usuario dueño, fechas, nombre y la foto del estado de
  la venta. No se escriben pedidos, productos ni inventario.
- **Backend** (`katuq_admin_back_firebase/functions`): router
  `/v1/sales-drafts` con crear, listar, leer, actualizar y eliminar, con auth y
  empresa del token. Vencimiento de 30 días con limpieza diaria. Se reutiliza un
  cron existente si lo hay.
- **Frontend:** `crear-ventas` (botón Guardar borrador, retomar y limpiar al
  crear) y un componente pequeño `borradores-venta` con la lista, sobre la base de
  diseño D-400.
- **Riesgo:** al retomar hay que reconstruir el estado de varios componentes hijos
  (catálogo, carrito, checkout, entrega y facturación) sin `setTimeout`. El design
  debe trazar ese orden.
