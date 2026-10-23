> **Estado:** PROPUESTA, pendiente de aprobación. Tickets 1357 (datos del producto) y 1358 (precios por tipo de cliente y costos), ALMARA FELICIDAD. Decisión: D-XXX (la pone la sesión principal). Solo documento: sin diseño, sin tareas y sin código. Se entrega por fases y cada fase se aprueba y se publica por separado.

## Why

ALMARA FELICIDAD necesita saber **quién cambió qué** en un producto y en sus precios, **cuándo**, **desde dónde** y **cuál era el valor anterior**. El caso real del 23-oct (ticket 1358):

- GCJ1236: el precio «Modelos» pasó de $42.621 a $78.291 a las 10:54 a. m.
- GCJ1236C: el precio «Modelos» pasó de $45.296 a $65.163 a las 10:56 a. m.
- Nadie sabe quién lo hizo ni si fue desde el panel, una importación, una sincronización o Claude.

Verificado en el código el 23-oct, sin leer producción. Backend en `backend-aws-security` (`f322affe`); front en `feature/venta-asistida-mejorada` (`27c3fc4a`).

- **Ya existe un historial, pero casi vacío.**
  - Colección `productHistory`, consulta `GET /v1/productos/historial/:productoId` (`controllers/productos.js:2930`, `routers/productos.js:733`) y pestaña «Historial de cambios» en la ficha (`crear-productos.component.html:2053`).
  - Solo la escriben las fotos uniformes de D-501 (`services/productPhotos/batchStore.js:193` y `:276`). Por eso la pestaña casi siempre dice «Historial detallado no disponible aún».
  - La consulta toma la empresa del encabezado `company`, no del token, y trae como máximo 50 registros sin paginar.
- **El producto solo guarda la última edición:** `date_edit` (texto ISO en UTC) y `user_edit`. Cada guardado pisa al anterior y el valor de antes se pierde.
- **Los costos tienen otro registro aparte:** `productCostHistory` (`controllers/productCosts.js:9` y `:478`), con costo antes y después. El usuario sale del encabezado `email` (`:416`) y ese registro no se ve en la ficha.
- **`date_edit` también lo usa una sincronización:** el flow `katuq-product-changed` lo usa como cursor para detectar productos cambiados (`services/flows/nodes/internal/katuq-product-changed.trigger.js`). Cambiar cuándo o cómo se escribe rompería la sincronización a Shopify.
- **No se encontró en el backend** la notificación de «producto editado» que menciona 1358. El diseño la ubica antes de prometer su contenido.

### Quién escribe en `products` hoy

Censo de esta propuesta (sin pruebas ni scripts). El diseño lo completa y lo convierte en una prueba de contrato.

| Origen | Dónde |
|---|---|
| Panel | crear `productos.js:373`, crear varios `:608`, editar `:1832`, eliminar `:1964`; importar precios por tipo de cliente `:3202`, unitarios `:3454` y por volumen `:3567`; limpiar precios `:3699`; precios por tipo de cliente `:3775`; acciones masivas (activar, desactivar, disponible, agotado, eliminar) `:3884`; costo `productCosts.js:413` y su importación `:264`; atributos `services/catalogo/atributosProducto.js:110`; fotos `batchStore.js:192` |
| Importación | productos `onboarding.js:2875` (lotes en `:3304` y `:3307`), primer producto `onboarding.js:1035`, configuración inicial `diagnostics.js:757`, Aliaddo `fulfillmentProductImportService.js:174` |
| Claude/MCP | `tools/updateProduct.js:221`, `tools/updateProductPhotos.js` |
| Integraciones | Cereza `osmosisProductSyncService.js`; flows `katuq-product-upsert.action.js:306`, `shopify-product-upsert.action.js:689`, `shopify-pricelist-sync.action.js:139`; Shopify `shopify/processors/products.js:63`, `shopify/helpers/product.js:193`, `shopifyService.js:348`; WooCommerce `woocommerceIntegration.js:418`, `woocommerceWebhook.js:1038`; `ecommerceAdapter.js:437`; Siigo `accounting/utils/codigoSiigo.js:191`; compras `purchasing/purchaseCostCapture.js:113` |
| Sistema | borrar empresa `companies.js:1699`; marca técnica de embeddings `cronService.js:713` |
| Inventario | **solo lee** `products` (`inventoryService.js:329, 664, 1357`, dentro de transacciones). Cumple D-134 y así sigue |

### Fase 0, ya en curso (sin spec: solo presentación y quién)

Otra sesión la empezó el 23-oct, en commits locales sin publicar:

- front `27c3fc4a`: «Última edición» en hora de Colombia y con quién, en las cuatro pestañas de Listas de precios;
- backend `9d2fa325`: los precios por tipo de cliente toman el usuario del token.

Para cerrar la fase 0 falta lo mismo en:

- el listado de productos (`productos.component.html:774`: solo fecha, con la hora del navegador);
- la ficha (`crear-productos.component.html:2079`: sin quién);
- el usuario del token, no del encabezado `email`, en costo (`productCosts.js:416`), importar precios (`productos.js:3349`, `:3467` y `:3580`), limpiar precios (`:3727`) y acciones masivas (`:3937`).

La fase 0 no reemplaza el historial: solo muestra la **última** edición.

## What Changes

### Un evento por cada vez que algo cambia un producto

Se reutiliza el modelo de D-541 (historial del pedido), adaptado al producto. No se inventa otro. Cada evento lleva:

- la fecha y la hora del servidor, que se muestran en hora de Colombia;
- el usuario, con su nombre, correo y rol de ese momento, o «Sistema» o el nombre de la integración;
- el **origen**, de una lista cerrada: Katuq (web o app), Importación, Claude/MCP, Opttia, Cereza, Shopify, WooCommerce, Siigo, Proveedor, Compras o Sistema;
- el tipo de evento;
- los detalles: cada campo con su nombre legible y su antes → después;
- en precios y costos: la lista o el tipo de cliente, y la variación en pesos y en porcentaje;
- el lote, cuando viene de una importación o de una acción masiva;
- el motivo, cuando la persona lo escribe.

Lo que se guarda junto forma **un solo evento**. Los eventos solo se agregan: nadie los edita ni los borra. **Si nada cambió de verdad** (por ejemplo, una sincronización que reescribe los mismos valores), no hay evento.

### Fases

| Fase | Qué entrega |
|---|---|
| **F0** | «Última edición» legible y con quién (arriba). Sin spec. |
| **F1** | El modelo de evento y un solo registrador. **Precios y costos** desde el panel, la importación de precios y Claude: precio base, cada tipo de cliente, precio por volumen y costo. **Creación, edición, inactivación y eliminación** desde el panel y Claude. Consulta paginada y limitada a la empresa del token. Pestaña «Historial» rehecha y botón de historial en «Precio tipo clientes» y «Costo». Con bandera por empresa, ALMARA primero. |
| **F2** | Importación de productos, acciones masivas, fotos (lo de D-501 pasa al modelo), atributos e **integraciones** (Cereza, Shopify, WooCommerce, Siigo, Aliaddo, compras), solo con cambios reales. Productos anteriores con «registro reconstruido». |
| **F3** | **Reporte** de cambios filtrable por fechas, usuario, producto y lista, con exportación. **Aviso** de cambio de precio o costo con quién, producto, lista y antes → después. |
| **F4** | Solo si se aprueba: **volver al valor anterior** de un precio o costo desde el historial, como un cambio nuevo con vista previa y confirmación. |

## Capabilities

### New Capabilities
- `product-history-log`: registro inmutable de los cambios de un producto, sus precios y sus costos: quién, cuándo, desde dónde, qué cambió y la variación, con reglas de multiempresa, volumen y no bloqueo.
- `product-history-view`: «Última edición» legible, pestaña «Historial», historial por precio, reporte y aviso de cambios.

### Modified Capabilities
- Ninguna archivada. El historial del pedido (D-541) no cambia.

## Impact

- **Backend:** cada escritor del censo agrega su evento, uno a la vez y por fases; la consulta de `controllers/productos.js:2930` pasa a la empresa del token, con paginación.
- **Front:** pestaña «Historial de cambios» de `crear-productos`, `lista-precios` (botón de historial) y un servicio que extiende `BaseService`.
- **Datos:** ver la pregunta 1. `productCostHistory` sigue como hoy para quien ya la lee.
- **Write-set:** el registrador solo escribe eventos. No cambia lo que cada escritor guarda en `products`, ni `date_edit` ni `user_edit`. No escribe inventario, movimientos ni listas maestras.
- **D-134:** el inventario no escribe productos y esta propuesta no lo cambia. El historial no registra existencias: eso ya vive en los movimientos de inventario.
- **Sin endpoints «v2»:** la consulta actual crece de forma compatible.

## No-goals

- Historial de existencias o de movimientos de inventario.
- Cambiar reglas de precio, de sincronización o quién puede editar productos.
- Escribir eventos para cambios viejos: lo anterior se reconstruye al consultar.
- Cambiar la frecuencia, los límites o la cobertura de los flows (D-134, AGENTS.md).
- El historial de pedidos (D-541) o de clientes.

## Riesgos

- **Muchos escritores (unos 30):** se enganchan uno a la vez, con diff aprobado. Una prueba de contrato verifica que el producto se guarda igual aunque falle el evento.
- **Volumen de las sincronizaciones:** OH MY STORE tenía 8.311 productos (findings 002 §1) y el flow `cereza-products-to-shopify-a5156643` escribe productos por `katuq-product-upsert` (findings §4). Sin la regla de «solo cambios reales» una corrida podría dejar miles de eventos. La F2 mide antes de encender.
- **`date_edit` es cursor de flows:** no se cambia su formato ni cuándo se escribe.
- **Costos sensibles:** un vendedor no debe ver costos en el historial si hoy no los ve.
- **El antes debe ser real:** sale de lo guardado al momento del cambio, no de una copia del navegador.
- **Trabajo paralelo:** la fase 0 la lleva otra sesión. Las fotos de D-501 tienen su prueba de contrato del write-set (`tests/productos/productPhotos/writeset.contract.test.js`), que la F2 debe conservar.

## Preguntas para Daniel

1. **¿Dónde se guardan los eventos?**
   - **A (recomendada):** ampliar `productHistory`, que ya existe, ya tiene consulta y pestaña, y hoy solo la usan las fotos. Se distingue por versión del registro. No hace falta colección nueva y nadie más la lee (a diferencia de `order_status_history` en D-541).
   - **B:** una colección nueva solo para eventos de producto, como D-541. Exige tu aprobación explícita (`openspec/config.yaml`).
2. **¿Las sincronizaciones (Cereza, Shopify, WooCommerce) dejan evento?**
   - **Recomendada:** sí, en la F2, solo cuando cambia algo de verdad y agrupadas por corrida, después de medir el volumen.
   - Alternativa: solo precios, costos y estado activo/inactivo.
3. **¿Volver al valor anterior (el «ideal» de 1358)?**
   - **Recomendada:** dejarlo como F4 y decidir después de usar F1 a F3. Solo para precios y costos, como un cambio nuevo con vista previa.
   - Alternativa: sacarlo del alcance.
4. **¿Para todos o con bandera, y quién exporta el reporte?**
   - **Recomendada:** bandera por empresa (D-505: `featureFlags.<nombre>` en `companies`, nada en el `.env`), ALMARA primero. Exportar, solo la familia Administrador, como en D-541.
