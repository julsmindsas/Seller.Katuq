# Comparacion ClickUp OMS-Organizado vs sistema actual

Fecha de revision: 2026-05-11

ClickUp revisado:

- Workspace: `31545745`
- Space: `KATUQ`
- Folder: `MODO CRITICO`
- List: `OMS - Organizado` (`901416274871`)
- URL: `https://app.clickup.com/31545745/v/l/li/901416274871`

La lista se describe como consolidada de OMS y reemplaza `OMS`, `MODULO INVENTARIOS` e `inventario`. Su propia descripcion dice que agrupa 7 paraguas: inventario, Guia Cereza, integraciones OMS, operaciones OMS, indicadores, WMS y items legacy sin claridad.

## Repos comparados

- Frontend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/Seller.Katuq`
- Backend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase`

## Mapa local encontrado

### Frontend

Existe soporte visible para:

- Inventario: `src/app/components/inventarios/*`
- Bodegas: `src/app/shared/services/bodegas/*`
- Fulfillment: `src/app/shared/services/fulfillment/*`
- Ventas/POS: `src/app/components/ventas/*`, `src/app/components/pos/*`
- Integraciones UI: `src/app/components/integrations/*`
- Importaciones con IA: `src/app/shared/components/import-modal/*`, `src/app/shared/services/import/column-mapping.service.ts`
- Dashboards/report builder: `src/app/components/dashboard/*`, `src/app/shared/services/dashboard/*`
- Pagos/Wompi frontend: `src/app/components/payment-callback/*`, `src/app/shared/components/upgrade-modal/*`

### Backend

Existe soporte real para:

- Inventario: `functions/routers/inventory.js`, `functions/controllers/inventory.js`, `functions/services/inventoryService.js`
- Pedidos: `functions/routers/orders.js`, `functions/controllers/orders.js`
- Bodegas: `functions/routers/bodegas.js`, `functions/controllers/bodegas.js`
- Guia Cereza/Osmosis: `functions/routers/osmosisIntegration.js`, `functions/routers/osmosisWebhook.js`, `functions/services/integrations/osmosis/*`
- Shopify: `functions/routers/shopifyIntegration.js`, `functions/routers/shopifyWebhook.js`, `functions/services/shopify/*`, `functions/services/flows/nodes/shopify/*`
- WooCommerce: `functions/routers/woocommerceWebhook.js`, `functions/controllers/woocommerceWebhook.js`, `functions/services/woocommerceService.js`
- Fulfillment/Aliaddo: `functions/routers/fulfillmentIntegrations.js`, `functions/services/fulfillment*`, `functions/services/fulfillmentProviders/aliaddoProvider.js`
- Siigo/contabilidad: `functions/routers/accounting.js`, `functions/services/accounting/*`
- Wompi/pagos: `functions/controllers/integration.js`, `functions/services/paymentGateway/providers/wompiProvider.js`, `functions/routers/pagos.js`
- Reportes OMS: `functions/routers/reports.js`, `functions/services/reports/sources/*`

## Comparacion por paraguas

| ClickUp | Estado local | Comparacion |
| --- | --- | --- |
| `86b8f1hd4` Inventario Bugs y Sugerencias | Parcial | El modulo existe y es amplio, pero las reglas objetivo de eventos, ajustes, traslados y tests no estan completas. |
| `86b8nz8tr` Integracion Guia Cereza | Bastante avanzado | Hay router Osmosis, webhook HMAC, servicios, flows, scripts y runbooks. Las fases base aparecen como `done`, pero hay bugs F3 y decisiones aun abiertas. |
| `86b9ve8h6` Integraciones OMS | Parcial | Existen Shopify, Woo, Siigo, Aliaddo, Prindel/Wompi en distinto grado. El paraguas ClickUp no tiene subtareas propias y necesita desglose por proveedor. |
| `86b9ve8hb` OMS Operaciones | Parcial | Hay ventas, pagos manuales, facturacion e integraciones, pero la tarea es demasiado amplia y sin subtareas. |
| `86b9ve8hg` Indicadores OMS | Parcial | Hay `reports` y fuentes BigQuery para `orders` e `inventory`, mas routers de analytics. Falta aterrizar KPIs concretos de OMS. |
| `86b9ve8hp` Plan Maestro WMS v3.0 | Objetivo futuro | El codigo actual cubre inventario operativo, no el WMS completo con ATP, OCs, transitos, reorden y prediccion. |
| `86b9ve90b` Sin contexto / revisar | Sin validar | ClickUp reconoce que son items legacy sin claridad. Deben cerrarse o convertirse en tareas especificas. |

## Inventario

Tareas ClickUp relevantes:

- `86b9vqnf9` Eventos que RESTAN inventario
- `86b9vqpg6` Eventos que SUMAN inventario
- `86b9vqv40` Validar descuento en pedido creado para 6 canales
- `86b9vqv5y` Estandarizar movimientos de salida
- `86b9vqv6x` Stock insuficiente + lock SKU+bodega
- `86b9vqv7n` Ajustes manuales con motivo + bloqueo no inventariables
- `86b9vqv86` Traslados: descuento al confirmar despacho
- `86b9vqw9u` Traslados: entrada al confirmar recepcion
- `86b9vqw8e` Cancelacion/edicion: devolucion por bodega
- `86b9vqw8v` Devolucion cliente post-despacho
- `86b9vqwa9` Produccion/ensamble
- `86b9vqwaf` Tests entradas

Lo que hay:

- Descuento en creacion de orden mediante `inventoryService.updateStock`.
- POS y canales soportados en backend.
- Restauracion completa o parcial via `restoreStock` y `restoreProductStock`.
- Historial de movimientos en `inventoryMovement`.
- Inventario consolidado, detalle por bodega, central de abastecimiento, diagnostico y reparacion.

Brechas:

1. ClickUp exige bloquear cuando no hay stock; el backend puede dejar la orden creada si `updateStock` devuelve error.
2. ClickUp exige enum claro `SALIDA_*` y `ENTRADA_*`; el codigo mezcla texto en espanol con deteccion por prefijo.
3. ClickUp exige motivo obligatorio y permisos para ajustes; no esta garantizado transversalmente.
4. ClickUp exige bloquear ajustes de no inventariables; el frontend/backend deben cerrarlo.
5. ClickUp quiere traslados con despacho, transito y recepcion; el codigo actual mueve origen y destino en una sola transaccion.
6. Produccion/ensamble con BOM no esta implementado como motor atomico de inventario.
7. No hay suite de tests automatizados que cubra los 6 canales y casos borde de entrada/salida.
8. La exportacion completa por una, varias o todas las bodegas sigue pendiente frente a `86b9ewxbq`.

## Guia Cereza / Osmosis

Tarea principal: `86b8nz8tr`.

ClickUp dice que las fases base estan cerradas:

- Fase 1: traer productos Cereza a Katuq.
- Fase 2: enviar pedidos a Cereza.
- Fase 3: recibir estados/evidencias.

Lo que hay:

- `GET /v1/osmosis/products/sync`
- `GET /v1/osmosis/products`
- `POST /v1/osmosis/orders/:id/push`
- `PATCH /v1/osmosis/orders/:id/status`
- `GET /v1/osmosis/dashboard/summary`
- `GET /v1/osmosis/dashboard/orders-with-issues`
- `POST /v1/osmosis/webhook/:companyId` con HMAC.
- Servicios Osmosis para auth, API client, productos, ordenes y webhooks.
- Flows para Osmosis en `functions/services/flows/nodes/osmosis/*`.
- Scripts/runbooks de Cereza y Shopify.

Brechas ClickUp aun abiertas:

1. `86b9vbd8z`: filtro de visibilidad por canal a nivel producto.
2. `86b9vbdb2`: Shopify solo muestra productos de Cereza, faltan China y tecnologia.
3. `86b9vbdcw`: configurar bodegas por canal para Shopify.
4. `86b9vbdfr`: cifras de productos en Shopify inconsistentes con catalogo total.
5. `86b9vbdhv`: categorias hibridas Cereza automatica + OMS manual.
6. `86b9vbdjn`: estados de pago y proceso para pedidos Shopify.
7. `86b9vbdmc`: etiqueta `No disponible` diferenciada de `Bajo pedido`.
8. `86b9vbdnx`: homologacion automatica de pago Shopify a Katuq.
9. `86b9vbdpz`: pedidos sin pago, descuento de nomina y contra entrega.

Nota: hay varias tareas marcadas `done` en ClickUp que tienen soporte local en scripts o flujo, pero eso no prueba por si solo que esten desplegadas o validadas en produccion.

## Integraciones OMS

ClickUp: `86b9ve8h6` agrupa Siigo, Aliaddo, Prindel, Wompi, Shopify y WooCommerce.

Lo que hay:

- Siigo/World Office/Alegra: arquitectura contable via `accounting`.
- Shopify: router REST, webhook queue, processors, flow nodes, mappers y scripts.
- WooCommerce: webhooks de orden/producto/cliente e importacion masiva de productos.
- Aliaddo: fulfillment provider, sync stock, import productos y logs.
- Prindel/Osmosis: shipping providers y configuracion UI.
- Wompi/ePayco: controladores de pago, callbacks, payment gateway providers.

Brechas:

1. El paraguas de ClickUp no tiene subtareas propias; conviene dividir por proveedor.
2. WooCommerce tiene firma comentada temporalmente en router; seguridad pendiente si se usa en produccion.
3. Shopify tiene dos capas: router legacy y nuevo motor de flows. Hay que definir cual es la fuente operativa por caso.
4. Aliaddo aparece como fulfillment/stock, no como creador de orden comercial. Mantener esa frontera.
5. Prindel aparece como shipping provider, no como fulfillment de inventario.
6. Wompi existe para pagos, pero los nuevos alcances de Shopify/pedidos sin pago requieren homologacion adicional.

## Operaciones OMS

ClickUp: `86b9ve8hb`.

Lo que hay:

- Ventas y pedidos completos.
- POS, pagos manuales y formas de pago.
- Facturacion electronica e integraciones contables.
- Estados de pago en pedidos.
- Cobertura/bodegas y zonas de cobro existen como dominios separados.

Brechas:

1. La tarea es muy amplia y no tiene subtareas. No se puede validar como `done` sin criterios.
2. `86b6vxa7f` pregunta si una entrega rechazada debe ir a bodega de rechazados. No existe una politica clara detectada en codigo/documentacion.
3. `86b7twrku` ciudades de entrega/cobro no tiene descripcion; hay `zonascobro` y cobertura, pero falta especificacion.

## Indicadores OMS

ClickUp: `86b9ve8hg`.

Lo que hay:

- `functions/routers/reports.js`
- Fuente `orders` sobre `v_orders`.
- Fuente `inventory` sobre `v_inventory`.
- Routers analytics de pedidos, logistica e inventario.
- Frontend dashboard/report builder.

Brechas:

1. No hay lista cerrada de KPIs OMS en ClickUp.
2. El motor BI existe, pero los indicadores de OMS deben definirse como reportes/sources concretos.
3. Si OMS necesita metricas por Cereza/Shopify/fulfillment, hay que confirmar que las vistas BigQuery tengan esos campos.

## WMS v3

ClickUp: `86b9ve8hp` y doc adjunto `KATUQ_WMS_Plan_Maestro_v3.0.docx`.

Lo que hay:

- Base operativa de inventario.
- Central de abastecimiento.
- Fulfillment externo.
- Reportes.

Lo que falta frente al objetivo WMS:

- ATP formal.
- Ordenes de compra.
- `purchase_orders`.
- `product_reorder_config`.
- `reorder_suggestions`.
- `demand_predictions`.
- Traslados con `status`, `fecha_despacho`, `fecha_recepcion`.
- KAI Morning Briefing.
- Reorden automatico y prediccion de demanda.

## Items legacy sin claridad

ClickUp: `86b9ve90b`.

Items listados:

- Productos.
- Inventarios.
- Clientes.
- Pago en linea.
- Zonas de cobro.
- Pruebas integracion.
- Segunda bodega.
- Validar tiempo Shopify.

Comparacion:

- Casi todos esos temas ya tienen dominios o tareas mas concretas.
- Mantenerlos abiertos como tareas independientes agrega ruido.
- Recomendacion: cerrar si estan duplicados o convertirlos en subtareas bajo Shopify/OMS Operaciones con criterio de aceptacion.

## Prioridad recomendada

1. Inventario: bloquear stock insuficiente en backend antes de crear/confirmar orden, o hacer rollback si falla descuento.
2. Inventario: estandarizar enum y schema de movimientos.
3. Cereza/Shopify: resolver visibilidad por canal y bodegas por canal.
4. Traslados: decidir si se migra al flujo WMS despacho/transito/recepcion.
5. Ajustes: motivo obligatorio, permisos y bloqueo no inventariables.
6. Woo/Shopify: auditar sincronizacion bidireccional stock/bodega.
7. Indicadores: definir KPIs OMS concretos sobre `orders`, `inventory`, Cereza y canales.
8. Limpieza ClickUp: cerrar o reubicar items legacy sin contexto.

## Conclusiones

La lista `OMS - Organizado` esta bien como tablero estrategico, pero no representa un backlog ejecutable limpio todavia. El codigo local ya cubre bastante de la capa operativa: inventario, ordenes, integraciones, pagos, reportes y Cereza. La mayor diferencia esta en el modelo objetivo: ClickUp ya describe un OMS/WMS mas estricto y auditable que el sistema actual, especialmente en inventario, transferencias, pagos Shopify y KPIs.

La comparacion sugiere dos trabajos distintos:

1. Cerrar bugs concretos de integracion e inventario que ya tienen impacto actual.
2. Separar WMS v3 como roadmap nuevo, porque requiere cambios de modelo de datos y flujo operacional.
