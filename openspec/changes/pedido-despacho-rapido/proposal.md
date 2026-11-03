> **Estado:** borrador — pendiente aprobación de Daniel.
> **Ticket:** 1473 (OH MY STORE, «Despacho rápido» desde el pedido, sin ir a Logística).
> **Decisión:** D-624.
> **Origen:** OH MY STORE (Jairo Arango, 29-oct).
> `design.md` y `tasks.md` se escriben después de aprobar esta propuesta. Sin código.

## Why

OH MY STORE pide una acción «Despacho rápido» en «Opciones del pedido» (D-547) para despachar un pedido sin salir al módulo de Logística. Debe hacer lo mismo que hoy hace Logística al crear la orden de envío: elegir transportador y método, crear la orden y actualizar el estado del pedido, con las mismas validaciones.

El ticket no tiene comentarios ni adjuntos (leído completo el 3-nov; `date_add` 2026-10-29T23:22:59Z).

## Qué hace hoy Logística (verificado en el código, solo lectura)

Dos pasos separados, en el backend `functions/controllers/logistica.js` y la pantalla `components/despachos/despachos/despachos.component.ts`:

1. **Crear la orden.** El modal «Generar Orden de Envío» (`generar-orden.component.ts`) pide método de envío (obligatorio), fechas, transportador y pedidos. `despachos.component.ts:5365` (`onSubmitOrdenEnvio`) y `:5668` (`crearOrdenEnvio`) llaman `LogisticaService.createShippingOrder` → `POST /v1/logistica/shippingorders/create` (`routers/logistica.js:232`) → `createAndEditShippingOrder` (`logistica.js:1078-1600`). En una sola transacción:
   - revisa que el transportador esté `online` (`CARRIER_OFFLINE`, 403, `:1105-1121`);
   - rechaza un pedido que ya está en otra orden viva (`DUPLICATE_SHIPPING`, 409, guard `:1261-1328`);
   - toma el siguiente `nroShippingOrder` de la empresa (`:1479-1484`);
   - guarda la orden y deja cada pedido en `EnDespacho` con `shippingOrder` y `transportador`, sin retroceder estados ya avanzados (`esRetroceso`, `utils/despachoReglas.js`);
   - después escribe el historial del pedido (D-541, `recordOrderStatusChange`).
2. **Despachar.** `despachos.component.ts:3666` (`despacharOrden`) llama `dispatchShippingOrder` → `POST /v1/logistica/shippingorders/dispatch` (`routers/logistica.js:389`, `logistica.js:1687`). Valida que los pedidos sean de la empresa de la sesión (`PEDIDO_OTRA_EMPRESA`) y llama `orders.updateOrderInternal` por cada pedido: así el pedido pasa a `Despachado` con el mismo camino de la edición (historial, avisos al cliente y al seller). Con transportadora integrada (Cereza, Envíame) se suma `POST /v1/logistics/shipments` (`createShipments`, `controllers/logisticsIntegrations.js:1313`, D-205).

**Validaciones del lado de la pantalla** (`generar-orden.component.ts:808-860`):
- estado distinto de Entregado, Despachado, EnProduccion y SinProducir;
- no es recogida en tienda según `carrito[0].configuracion.datosEntrega.formaEntrega`; si falta, exige `envio.direccionEntrega`.

**Ojo: ya existe un «despacho rápido» en Logística**, pero es otra cosa: `despachoRapido` en `tabla-pedidos` abre `DespachoExpressModalComponent` y llama `POST /v1/logistica/shippingorders/batch-dispatch` (`logistica.js:3076-3280`). Es por lote, deja el pedido directo en `Despachado` y, según el código, **no** hace tres cosas que sí hace «Crear orden de envío»: no revisa transportador en línea, no tiene el candado de orden duplicada (acepta pedidos ya `EnDespacho`) y no pasa por `updateOrderInternal` (escribe el pedido con `transaction.update`, así que los avisos del pedido no salen por ahí). Hay que confirmar el alcance exacto en el diseño.

## What Changes

1. En «Opciones del pedido» aparece **Despacho rápido** como acción de **contexto** (fila «Para este pedido», D-547). Solo se ve cuando el pedido se puede despachar; cuando ya está Despachado o Entregado se ve «Ver despacho y entrega», así que las dos comparten lugar y la fila no crece.
2. Al tocarla abre una ventana corta con: transportador o método de envío (con la sugerencia de reglas que ya existe, `DispatchRulesService`), un resumen del pedido y la dirección. Un botón «Despachar».
3. «Despachar» ejecuta **el mismo camino de Logística, en el mismo orden**: crear la orden (`/shippingorders/create`) y despachar (`/shippingorders/dispatch`). Sin endpoint nuevo ni lógica nueva en el servidor.
4. Al terminar muestra el número de la orden de envío y refresca el pedido.

## Cómo reutilizar sin duplicar

- **Servidor:** nada que reutilizar a mano; se llaman los mismos dos endpoints con el mismo cuerpo que arma Logística.
- **Front:** un servicio pequeño (`BaseService`, nunca `HttpClient` en el componente) que arma el cuerpo de la orden para UN pedido y encadena `createShippingOrder` y `dispatchShippingOrder` de `LogisticaService`. Mientras no se toque `despachos.component.ts` (más de 5000 líneas), la única copia nueva es el armado del cuerpo, y esa copia lleva una prueba local que lo compara con el de Logística. Mover la lógica de Logística a ese servicio es una fase posterior y aparte.
- **Alternativa B (no recomendada):** llamar `batch-dispatch` con un grupo de un pedido. Es una sola llamada, pero salta las tres validaciones de arriba y no es «lo mismo que Crear orden de envío». Si Daniel la prefiere, se aprueba como excepción.

## Inventario

**No cambia.** Ni `createAndEditShippingOrder` ni `dispatchShippingOrder` ni `batch-dispatch` tocan `inventory` ni `inventoryMovement` (sin referencias a inventario en `logistica.js`). El descuento ocurre al crear el pedido o al entrar en pago elegible (`orders.js`, `executeOrderInventoryRollout`); despachar solo decide si una cancelación posterior devuelve stock (`services/inventory/devolucionPorPagoCancelado.js`, `availabilityService.js:44`). **Write-set:** `shipping_orders` y los campos de despacho del pedido, exactamente los que escribe Logística; ninguna escritura en `products`, precios, inventario ni Shopify desde esta acción. Con transportadora Cereza el aviso a Cereza es el mismo de hoy (D-205: el estado de pago no bloquea el despacho pedido por una persona).

## Capabilities

### New Capabilities
- `pedido-despacho-rapido`: la acción «Despacho rápido» en el pedido (spec en `specs/pedidos/spec.md`).

### Modified Capabilities
- Ninguna. «Opciones del pedido» (D-547) suma una acción de contexto sin cambiar las 16 fijas.

## No-goals

- Cambiar Logística, sus pantallas, sus endpoints o el `batch-dispatch`.
- Despachar varios pedidos (eso ya lo hace Despacho Express).
- Cambiar cómo se descuenta o devuelve inventario, ni escribir productos, precios o Shopify.
- Crear colecciones, endpoints o módulos «v2».
- Nuevas reglas de pago: D-205 se mantiene.

## Riesgos (módulo sensible: `orders`; toca Logística)

- **Un solo cambio a la vez y con diff aprobado por Daniel.** `orders` es sensible, y D-541 y D-547 tocan los mismos archivos del detalle (`list.component.*`, `acciones-pedido.*`). Se hace `git pull` antes y no se mezcla con otras acciones.
- **Doble clic o doble despacho.** El candado `DUPLICATE_SHIPPING` ya existe; el botón se deshabilita mientras corre y el servicio no reintenta solo.
- **Medio camino.** Si la orden se crea y el despacho falla, el pedido queda `EnDespacho` con su orden. La ventana lo dice y ofrece reintentar el despacho; nunca crea una segunda orden.
- **Cuerpo distinto al de Logística** haría que el servidor trate el pedido distinto; por eso la prueba de comparación.
- **Trampas de CSS global** (AGENTS.md): ninguna clase nueva con «p-»; foco con `:focus-visible`; spans con color propio.

## Preguntas para Daniel o el comercio

1. **¿Camino A (crear + despachar) o B (`batch-dispatch`)?** Recomendado A: es lo que pide el ticket («mismos pasos, mismas validaciones»).
2. **¿Incluye transportadoras integradas (Cereza, Envíame, guía)?** Recomendado: sí, con el mismo paso de Logística; si no se ve claro en el diseño, la primera versión cubre solo «mensajero propio» y el resto abre Logística.
3. **«Bodega/origen».** El ticket la menciona, pero la orden de envío de Logística no pide bodega (campos: método, transportador, fechas). ¿Se refiere a otra cosa?
4. **¿Quién puede usarla?** Recomendado: quien hoy puede abrir Logística y despachar; el servidor es quien manda.
5. **¿Para quién sale?** Recomendado: bandera por empresa en `featureFlags` (D-505), primero OH MY STORE.
