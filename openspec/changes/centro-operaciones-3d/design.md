## Context

- **Lo que ya hay.** Las escenas 3D de la bienvenida (D-351, D-352) y el recorrido del pedido (D-353) comparten `shared/escena-3d/escena-base.ts`. Esa base ya resuelve la cámara orbital sin rueda, el puntero, las etiquetas ancladas, unos 40 fps con pausa fuera de pantalla y la limpieza. three ^0.180 está en el front.
- **Cola operativa.** `READY_STATES = ['Empacado','ParaDespachar','ProducidoTotalmente']` (`services/shippingQueueMetrics.js:4`), la misma que cuenta "Por despachar" en la bienvenida (`controllers/logistica.js:2371`).
- **Stock.** `getRealStockMap(company, products, { idBodega })` (`services/productStockHelper.js:98`) ya normaliza referencia→docId, deduplica producto+bodega y devuelve 999999 para no inventariables. No tiene caché.
- **Negativo visible.** La venta descuenta completo al crearse y el faltante queda en negativo (`inventoryService.js:219-300`).
- **Despachar.** `despachos.component.ts:3790-3835` (8.112 líneas) arma `nuevaOrdenEnvio`, cambia cada pedido (transportador, despachador, estado, número de orden) y llama `dispatchShippingOrder`. **Generar guía** es una sola llamada: `generarGuia(orderId)` (`:4669`).
- **Menú.** La visibilidad sale de `roles.menus` en el login. Un módulo nuevo nace invisible hasta que se le hace backfill al rol (`backfill-menu-sitios.js` como molde).

## Goals / Non-Goals

**Goals:** una pantalla con bodega y muelles en una sola escena, con los pedidos frenados por stock visibles. Generar guía y abrir detalle directo desde la escena. Despachar e imprimir con entrega a Despachos sin duplicar su lógica. Panel en texto equivalente. Encendida solo en FLORECER al inicio.

**Non-Goals:** nivel "país", repetición del día y Opttia (etapas siguientes); escribir inventario; refactorizar Despachos; tiempo real por sockets; el mapa de mensajeros.

## Decisions

1. **Una consulta "foto" en el backend en vez de que la pantalla combine tres.** Ruta: `GET /v1/analytics/logistica/centro-operaciones`, junto a `mapa-pedidos` (D-352), con auth.
   - Pasos: lee la cola con `.select()` de los campos que necesita (`estadoProceso`, `estadoPago`, `fechaEntrega`, `bodegaId`, `transportador`, `nroPedido`, `carrito` con producto y cantidad, y los campos del asesor). Quita cancelados. Aplica el alcance de D-349. Arma la lista de productos únicos y llama `getRealStockMap` una vez por bodega presente.
   - Respuesta: `pedidos[]` (con `frenado` y `faltantes[]`), `productos[]` (stock por bodega), `bodegas[]` y `transportadores[]` con conteos.
   - Por qué: la regla de frenado y el doble conteo viven en el backend, que ya tiene las dos piezas probadas. Que el front lo arme exigiría leer el inventario crudo, que es justo donde se infla un 60 %.
   - Alternativa descartada: reusar `/v1/inventory/consolidado`. Trae el catálogo completo paginado, no solo los productos de la cola.
2. **Regla de frenado.** Producto de la línea con `stockPorBodega[order.bodegaId] < 0`. Si el pedido no trae `bodegaId` (canal sin bodega resuelta), se usa `stockTotal < 0`. El faltante es el valor absoluto del negativo. Los no inventariables nunca frenan (999999).
   - Alternativa descartada: leer `inventory_audit` (`updateStock-stockNegativo`). Es el faltante al momento de la venta, no el actual. Si el comercio ya cargó el ingreso, el pedido aparecería frenado sin estarlo.
3. **Encendido por comercio, doble llave.**
   - La entrada de menú, por backfill solo a los roles de FLORECER, con `--dry-run` primero.
   - `companyConfig/{empresa}.centroOperaciones3d === true`, que la ruta valida: si falta, responde 403 "no disponible". El front lo traduce a un estado vacío amable.
   - Mismo patrón que `metricasSoloPropias` (D-349). Sin colecciones nuevas.
4. **Acciones.**
   - Generar guía: el mismo `LogisticaServiceV2.generarGuia(orderId)` y la misma forma de abrir el PDF.
   - Abrir detalle: lleva a Pedidos con el pedido seleccionado.
   - Despachar e imprimir: navegan a Despachos con `?pedidos=<ids>&transportador=<nombre>`. Despachos lee esos parámetros **solo para preseleccionar** pedidos y transportador; el usuario confirma ahí, con el flujo de siempre.
   - Es el único cambio dentro de Despachos: aditivo y sin tocar `dispatchShippingOrder`.
   - Alternativa descartada: extraer el despacho a un servicio y llamarlo desde la escena. Es lo ideal, pero refactoriza el flujo más delicado de la app y merece su propia propuesta.
5. **Escena sobre la base compartida** (`CentroOperacionesEscena extends EscenaBase`).
   - Instancias para estanterías y cajas, porque una cola grande puede traer cientos de pedidos. Tope visual: 60 pedidos por muelle; el resto se cuenta como "+N" y queda completo en el panel.
   - Los dos niveles son dos encuadres de cámara con transición, no dos escenas.
   - Refresco: cada 60 s mientras está visible, y al volver de Despachos.
6. **Front.** Módulo lazy `components/centro-operaciones/`, servicio `CentroOperacionesService extends BaseService` y ruta `centro-operaciones` con `AuthGuard`. Tema canónico; reusa el estilo de etiquetas y panel de la bienvenida.

## Risks / Trade-offs

- [Cola grande en comercios con mucho volumen] → `.select()`, una lectura de stock por bodega con el índice `company+idBodega+productoId` que ya existe, y tope de 3.000 pedidos con aviso de "truncado".
- [Que "despachar" desde la escena difiera del de Despachos] → no se reescribe: se entrega a Despachos con preselección.
- [Parámetros de URL manipulados] → Despachos solo preselecciona entre los pedidos que ya cargó para la empresa de la sesión. Un id ajeno se ignora.
- [Frenado por un negativo viejo que nadie corrigió] → la etiqueta dice "faltan N" y el panel enlaza al producto en Inventarios. El descuadre ya es visible por diseño (negativo visible).
- [Menú invisible al encender otro comercio] → el script de backfill queda parametrizado por empresa y se documenta en la tarea.

## Migration Plan

1. Backend (ruta + llave en `companyConfig`) desplegado primero; sin la llave responde 403, así que no cambia nada para nadie.
2. Frontend con la pantalla y la preselección en Despachos.
3. En FLORECER: encender la llave y hacer backfill del menú (`--dry-run` y luego `--apply`).
4. Rollback: apagar la llave en `companyConfig`. El menú puede quedarse, porque la pantalla muestra "no disponible".

## Open Questions

- ¿Qué roles de FLORECER llevan el menú: solo administrador, o también bodega y despachos? Propuesta: administrador y roles con `despachos` en su menú.
- ¿El tope de 60 pedidos por muelle sirve para los comercios grandes o hay que agrupar por día de entrega? Se mide con datos reales antes de encender a un cliente.
