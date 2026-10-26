## Why

Ticket 1327 (ALMACEN BOMBAS, 2026-10-22): «en ciertas empresas, normalmente grandes, al elaborar una cotización no siempre se dirige a la misma persona. Debería existir la posibilidad de inscribir más de un contacto con su nombre y correo electrónico».

Hoy el cliente tiene un solo correo (`correo_electronico_comprador`), un solo celular y un solo WhatsApp. La cotización guarda una copia del cliente y muestra ese correo; no hay forma de decir a quién de la empresa va dirigida. El vendedor termina escribiendo el nombre de la persona en las notas o creando un cliente repetido por cada contacto.

## What Changes

- **Contactos del cliente.** La ficha del cliente gana una lista opcional de personas de contacto: nombre, cargo, correo y celular, con una marcada como principal. Vive en el mismo documento del cliente (`clients.contactos[]`), igual que hoy viven `datosEntrega[]` y `datosFacturacionElectronica[]`.
- **Formulario.** El formulario único de cliente (D-406) suma la pestaña **Contactos**, con el mismo manejo de lista que Entrega y Facturación: agregar, editar, quitar y marcar principal. Funciona en todas las pantallas que ya usan ese formulario.
- **Cotización dirigida a una persona.** Al escoger el cliente en la cotización aparece «Dirigida a»: el contacto principal por defecto o cualquier otro de la lista. La cotización guarda una copia de esa persona (`cotizacion.contactoDestino`: nombre, cargo, correo, celular), así un cambio posterior en la ficha no altera cotizaciones ya hechas.
- **Dónde se ve.** El documento de la cotización muestra «Atención: <nombre> — <cargo>» con su correo. Al compartir por WhatsApp se usa el celular de esa persona si lo tiene; si no, el del cliente como hoy.
- Sin colección nueva ni endpoint nuevo: `clients/create`, `clients/edit` y la creación/edición de cotizaciones ya guardan el documento completo.

## Capabilities

### New Capabilities
- `client-contacts`: lista de personas de contacto en la ficha del cliente y selección de la persona a la que va dirigida una cotización.

### Modified Capabilities
- `client-unified-form` (D-406): suma la pestaña Contactos. No cambia Contacto, Entrega, Facturación ni Notas.

## Impact

- **Frontend:** `ventas/clientes/crear-cliente-modal/*` (pestaña Contactos), `cotizaciones/cotizacion-editor/*` (selector «Dirigida a» y bloque «Atención» del documento), `ventas/modelo/pedido.ts` y `modelo/cotizacion.ts` (tipos).
- **Backend:** sin cambio de contrato. Se verifica con un test que `contactos` pasa por `clients/edit` y `contactoDestino` por cotizaciones sin ser filtrados.
- **Datos:** `clients.<doc>.contactos[]` y `cotizaciones.<doc>.contactoDestino`, ambos opcionales y nuevos. Ningún cliente existente cambia: sin contactos, todo se comporta como hoy.
- **Riesgo sobre módulos sensibles:** ninguno. No escribe `orders`, `inventory`, `products`, precios ni consecutivos. Pedidos, facturación electrónica, cartera y notificaciones siguen usando el correo principal del cliente.
- **Constitución:** multi-tenant sin cambios (el contacto vive dentro del documento del cliente de la empresa); UI con la regla de diseño Katuq (D-398/D-399/D-400).
- **Decisión a registrar:** D-537 en `specs/CONTRACT.md`.

## No-goals

- **Enviar la cotización por correo.** Hoy ese envío no existe (`/v1/cotizaciones/enviar-email` responde «en desarrollo»). Cuando exista, usará `contactoDestino`; construirlo es otro cambio.
- **Clientes corporativos del CRM.** Se guardan por otro camino que filtra campos y descartaría la lista. Queda para un cambio aparte si se pide.
- **Buscar clientes por el nombre o correo de un contacto.** El índice de búsqueda no cambia.
- **Pedidos y facturas dirigidos a un contacto.** Siguen usando el correo principal del cliente.
- **Vista pública de la cotización (link).** Sigue mostrando solo el nombre del cliente.
- Migrar o completar datos existentes.

## Preguntas para Daniel

1. ¿La pestaña se llama «Contactos» o prefieres que vaya dentro de la pestaña Contacto como «Otras personas»?
2. ¿«Atención: …» debe salir también en el PDF/impresión de la cotización, o solo en pantalla? (La propuesta asume ambos.)
