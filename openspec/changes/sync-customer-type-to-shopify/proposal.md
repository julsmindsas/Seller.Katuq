# Propuesta: sincronizar el tipo de cliente de Katuq hacia Shopify

## Why

CreaCTA (agencia de OH MY STORE) ya montó en producción el pricing dinámico por perfil de cliente con el motor B2B nativo de Shopify (Markets & Catalogs + Price Lists), y vincula cada compañía al metafield `katuq.tipo_cliente` del customer. En su informe del 2026-07-17 pide que Katuq **complete ese metafield para toda la base de clientes** (hoy solo existen los 2 clientes de muestra estampados a mano el 2026-07-08) y que **los clientes nuevos queden clasificados automáticamente** sin intervención manual.

Hoy **no existe ninguna sincronización de clientes de Katuq hacia Shopify** en ninguna capa (verificado en código, D-084): no hay nodo `shopify-customer-*`, el dashboard solo sincroniza producto/inventario/pedido y el Mapeo de Campos no tiene sección de clientes. Sin esta capacidad, el pricing por perfil solo funciona para los clientes cargados a mano.

Esta capacidad es la formalización en OpenSpec de la spec 018 (`specs/018-sync-tipo-cliente-shopify/`, approved 2026-07-07) y del compromiso D-084 del contrato.

## What Changes

- Estampar en el customer de Shopify (match por email) los metafields `katuq.tipo_cliente` (nombre del tipo, fuente de verdad Katuq) y `katuq.customer_id` (docId del cliente en Katuq), reusando el mismo `metafieldsSet` ya validado en prod el 2026-07-08.
- Propagar cada creación/edición de cliente en Katuq hacia ese estampado (forward sync), reusando el evento `customer.upserted` y el patrón de nodos por proveedor del motor de flows.
- Estampar al vuelo cuando aparece un customer nuevo en la tienda (webhook `customers/create`) cuyo email coincide con un cliente de Katuq — esto cubre el auto-enrolamiento que pide CreaCTA.
- Backfill retroactivo de la base existente en modo `--dry-run` por defecto, con reporte de conteos.
- Borrar el metafield `katuq.tipo_cliente` cuando el cliente pierde su tipo en Katuq (Shopify fiel a Katuq; el storefront cae a precio público).
- **Enrolamiento automático en el Market del perfil**: cuando un cliente nuevo (o reclasificado) queda con tipo Mayoristas/Modelos, crearle la B2B Company y agregarla al Market correspondiente — automatiza lo que hoy hace el script manual `sync-b2b-companies.js` (con el que ya se enrolaron los 139 mayoristas existentes en junio, commit `138def3`). Esto es lo que realmente hace que el buyer vea su precio; el metafield es la referencia que CreaCTA lee.

## Capabilities

### New Capabilities

- `shopify-customer-type-sync`: estampado idempotente, multi-tenant y trazable del tipo de cliente de Katuq en el customer de Shopify (forward, al vuelo y backfill).

### Modified Capabilities

Ninguna.

## Impact

- Backend `katuq_admin_back_firebase` (rama `backend-aws-security`): nodo nuevo `shopify-customer-upsert.action.js` + registro en el catálogo de nodos; emisión de `customer.upserted` desde `controllers/clients.js`; suscripción del pipeline Shopify existente al topic `customers/create`; script de backfill.
- Sin colecciones Firestore nuevas ni endpoints/módulos "v2". Reusa la trazabilidad de `flow_runs` existente.
- Sin frontend en el MVP (se opera desde el motor de integraciones; sin sección Clientes en Mapeo de Campos).
- Multi-tenant default OFF: el flow se instala y activa solo para OH MY STORE.
- Datos reales verificados (D-084, 2026-07-08): 573 clientes OMS, solo 134 con email (`correo_electronico_comprador`), 140 Mayoristas / 4 Público / 0 Modelos / 429 sin tipo. Nombre real del tier = **"Modelos"** (plural).
- Evidencia relacionada: [spec 018](../../../specs/018-sync-tipo-cliente-shopify/spec.md), decisiones D-084 y D-069 de [CONTRACT](../../../specs/CONTRACT.md), [findings 360](../../../specs/002-flows-osmosis-shopify-marco/findings.md).

## No-goals

- No sincronizar otros campos del cliente de forma continua (teléfono, direcciones). El nombre solo se envía una vez, al CREAR un customer que no existía.
- No crear ni actualizar clientes DE Katuq desde Shopify: el estampado al vuelo solo escribe metafields en Shopify, nunca toca la base de Katuq.
- No generar ni tocar tags/precios de producto ni price lists — eso es la capacidad hermana `shopify-product-price-sync`.
- No agregar sección "Clientes" a la UI de Mapeo de Campos en este MVP.
- No habilitar la sincronización para otros comercios ni otros canales (WooCommerce) en esta entrega.

## Risks

- Doble representación del tipo en el doc de cliente (`tipoCliente` string vs `categoria` {id,nombre}); el pricing usa `categoria`. Mitiga una regla única de resolución en el mapper, sin migrar datos.
- El maestro de tipos (`tiposPrecios`) es editable por el comercio y sus nombres son la fuente de verdad; un renombre se propaga en la siguiente sync y CreaCTA debe leer el valor dinámicamente (acuerdo operativo).
- Rate limits de la GraphQL de Shopify durante el backfill → throttling y reanudación; un cliente con error no bloquea el lote.
- Emails sensibles: nunca en logs de error, solo en el payload del run.
