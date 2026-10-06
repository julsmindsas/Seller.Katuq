## Why

Hoy el comercio salta entre tres pantallas para responder una sola pregunta: "¿qué puedo despachar ya y qué está trabado?". Inventarios dice cuánto hay, Despachos dice qué está en cola, y ninguna dice qué pedidos en cola tienen un producto en negativo en su bodega. Esos pedidos ya se vendieron, pero no hay unidades físicas para despacharlos. Daniel pidió (5-oct, "dale, arranca con la propuesta") una pantalla nueva, 100 % operativa y visual, que junte bodega y despachos en una sola escena 3D, con la misma dinámica de three.js de la bienvenida. Se registra como **D-354**.

Dato del código que define el alcance: la venta **descuenta el inventario al crearse el pedido**, y desde la política "negativo visible" (2026-06-11, `inventoryService.js:219-300`) el descuento es completo aunque no haya existencias. Lo que falta queda como stock negativo, se audita en `inventory_audit` (`updateStock-stockNegativo`) y se avisa con `NEGATIVE_STOCK`. Por eso "pedido frenado" **no** es un pedido sin stock reservado. Es un pedido de la cola operativa con algún producto en negativo en su bodega.

## What Changes

- **Pantalla nueva "Centro de operaciones"** (ruta propia, módulo lazy) con una escena 3D de tres niveles por acercamiento de cámara:
  - **Bodega**: estanterías por producto con la altura según el stock real de la bodega elegida. Rojo si el stock está en negativo, naranja si está bajo. **Solo lectura.**
  - **Muelles**: la cola operativa del día por etapa (producido, empacado, listo para despachar), los urgentes y los camiones por transportador con sus pedidos.
  - **Pedidos frenados**: el pedido queda detenido en el muelle con la etiqueta "faltan N de <producto>". Al tocar el producto se iluminan todos los pedidos que lo esperan.
- **Operación desde la escena** con las acciones que **ya existen** en Despachos y con su misma confirmación: generar guía, despachar e imprimir. También abre el detalle del pedido, que ya trae el recorrido 3D. No se crea lógica nueva de pedidos ni de despachos.
- **Panel lateral en texto**, que es la versión accesible y la que queda sin WebGL: cola, frenados y faltantes por producto.
- **Backend: una consulta nueva de solo lectura** que arma la foto de la operación: cola, stock de los productos de la cola por bodega y frenados. Reusa `getRealStockMap` (normaliza referencia→docId y deduplica producto+bodega) y `READY_STATES` de la cola operativa.
- **Encendido por comercio**: nace **apagado** para los clientes actuales (ALMARA FELICIDAD, OH MY STORE, CAFE ESCOBAR, ALMACEN BOMBAS) y se prueba en **FLORECER**. Se enciende con la entrada de menú en el rol (el filtro de menú ya existente) y con una opción en `companyConfig/{empresa}` que valida el backend.
- **Etapas posteriores**, fuera de esta primera entrega: el nivel "país" con las rutas del día sobre el mapa de D-352, la repetición del día y "¿qué despacho primero?" por Opttia (ADK).

## Capabilities

### New Capabilities
- `centro-operaciones-3d`: pantalla, niveles de la escena, operación con acciones existentes, panel accesible, encendido por comercio.
- `pedidos-frenados-por-stock`: foto de la operación en el backend (cola + stock por bodega + frenados), de solo lectura.

### Modified Capabilities
- (ninguna: no cambia el comportamiento de Despachos, Pedidos ni Inventarios)

## Impact

- **Frontend (Seller)**: módulo nuevo `components/centro-operaciones/` con escena sobre `shared/escena-3d/escena-base.ts`. Entrada en `nav.service.ts`. Servicio nuevo que extiende `BaseService`. Tema canónico (`openspec/specs/design-system`).
- **Backend**: ruta nueva GET de solo lectura, con auth y empresa del token, que respeta "solo sus métricas" (D-349). **Write-set: ninguno.** No escribe `inventory`, `inventoryMovement`, `products`, precios ni listas de precios. No crea colecciones. Lee `orders`, `inventory`, `warehouses`, `transportadores` y `shipping_orders` con `.select()`.
- **Datos**: un script de roles con `--dry-run` primero, que agrega el menú solo a los roles de FLORECER.
- **Módulos sensibles**: despachos, estados de pedido e inventario. Riesgo principal: que una acción desde la escena dispare un flujo distinto al de Despachos. Mitigación: llamar exactamente a los mismos métodos de servicio con los mismos datos, o reusar sus modales, sin reescribir nada. Riesgo de carga: la consulta lee la cola completa y el stock de sus productos. Mitigación: solo estados de la cola, `.select()` y el índice `company+idBodega+productoId` que ya existe.
- **No-goals**: ajustar, trasladar o reservar inventario desde la escena; cambiar la regla "negativo visible"; reusar el mapa de mensajeros de Despachos (tiene el hueco de seguridad de la propuesta `mapa-despachos-seguro-por-empresa`); agentes de voz o video.
