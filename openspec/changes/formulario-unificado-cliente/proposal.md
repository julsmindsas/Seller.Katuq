## Why

Hoy el cliente se captura en cuatro formularios distintos (pantalla Crear cliente, modal compartido `CrearClienteModalComponent`, formulario inline de venta asistida larga y formulario inline de venta asistida única) y solo la pantalla Crear cliente permite agregar direcciones de entrega, datos de facturación electrónica y notas, y lo hace en pasos separados después de crear. Jairo lo reportó en cuatro tickets el 2026-10-10 (1164 crear completo en una sola pantalla, 1165 editar completo desde el listado, 1166 username de WhatsApp, 1167 formularios homogéneos): el vendedor crea un cliente "a medias" y después no encuentra dónde completarlo.

## What Changes

- Un solo formulario de cliente reutilizable, con pestañas **Contacto**, **Entrega**, **Facturación** y **Notas**, que se usa en todas las pantallas donde hoy se crea o edita un cliente.
- **Contacto** gana el campo `whatsappUsername` (nombre de usuario de WhatsApp) junto al número de WhatsApp (ticket 1166).
- **Entrega** permite una o varias direcciones (`datosEntrega[]`, que ya existe en el documento del cliente), con la dirección estructurada y la zona de cobro que ya usa Crear cliente.
- **Facturación** permite uno o varios perfiles de facturación electrónica (`datosFacturacionElectronica[]`, ya existe).
- **Notas** permite agregar notas con fecha (`notas[]`, ya existe).
- La pantalla Crear cliente, el listado de clientes (editar), la venta asistida larga y la venta asistida única pasan a usar este formulario. Las pantallas que ya usan el modal compartido (cotizaciones, CRM, facturación electrónica) lo reciben sin cambios de contrato: las pestañas nuevas son opcionales.
- Se elimina el formulario inline duplicado de venta asistida (dos copias) y el formulario propio de la pantalla Crear cliente, que quedan reemplazados por el componente único.
- No hay cambio de modelo en Firestore: todos los campos ya existen en `clients`, salvo `whatsappUsername` (campo nuevo, opcional, en el mismo documento). No se crean colecciones ni endpoints; `clients/create` y `clients/edit` ya aceptan el documento completo.

## Capabilities

### New Capabilities
- `client-unified-form`: formulario único de cliente con pestañas Contacto/Entrega/Facturación/Notas, reutilizable en modal e inline, que crea y edita el documento completo del cliente en una sola acción y es el único punto de captura de clientes en el seller center.

### Modified Capabilities
<!-- No hay specs previas de clientes en openspec/specs/. El comportamiento existente del modal (D-110, D-303, tickets 1050/1083/1100) se incorpora como requisitos de la capability nueva, no como delta. -->

## Impact

- **Frontend (Seller.Katuq)**: `components/ventas/clientes/crear-cliente-modal/*` (se extiende y pasa a soportar modo inline), `components/ventas/clientes/clientes.component.*` (reemplaza su formulario propio), `components/ventas/clientes/lista/*` (editar completo), `components/ventas/crear-ventas/*` y `components/ventas/venta-asistida-unica/*` (reemplazan el formulario inline por el componente). `ClientesSharedModule` ya exporta el componente.
- **Backend (katuq_admin_back_firebase)**: sin cambios de contrato. `clients/create` y `clients/edit` guardan el body completo; el índice de búsqueda (`clients_search_index`) no indexa los campos nuevos. Solo se verifica que `whatsappUsername` pase por `editClient` sin ser filtrado.
- **Datos**: `clients.<doc>.whatsappUsername` (string opcional, nuevo). `datosEntrega[]`, `datosFacturacionElectronica[]` y `notas[]` se mantienen con su forma actual para no romper venta asistida, cotizaciones, facturación electrónica ni logística, que ya los leen.
- **Riesgo sobre módulos sensibles**: ninguno sobre pedidos, inventario ni consecutivos. El cambio no escribe `orders`, `inventory` ni `products`. La venta asistida sigue armando el pedido a partir del cliente seleccionado como hoy; solo cambia el formulario con el que se crea o edita ese cliente.
- **Decisión a registrar**: D-402 en `specs/CONTRACT.md` (formulario único de cliente y campo `whatsappUsername`).

## No-goals

- No se rediseña el listado de clientes ni sus métricas.
- No se migran clientes existentes (los campos nuevos quedan vacíos hasta que alguien los edite).
- No se unifican los dos formularios de venta asistida entre sí (ticket 1168, decisión de producto aparte); solo comparten el formulario de cliente.
- No se toca el cliente corporativo (`corporateClients`) más allá de lo que el modal compartido ya hace con `target: 'corporate'`.
- No se cambia la búsqueda de clientes ni su índice.
