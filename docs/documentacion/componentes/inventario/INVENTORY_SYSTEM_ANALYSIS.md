# Analisis del sistema de inventario - Frontend Seller.Katuq

Fecha de analisis: 2026-05-11

Este documento resume como esta conectado el inventario desde el frontend Angular y que contratos espera del backend `katuq_admin_back_firebase`. Es una guia de trabajo para futuras modificaciones sin romper ventas, POS, fulfillment o metricas.

## Repositorios relacionados

- Frontend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/Seller.Katuq`
- Backend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase`
- Backend principal: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase/functions`

## Modulo Angular

Entrada principal:

- `src/app/components/inventarios/inventarios.module.ts`
- `src/app/components/inventarios/inventarios-routing.module.ts`

Rutas activas:

| Ruta | Componente | Uso |
| --- | --- | --- |
| `/inventario/inventario-catalogo` | `InventarioCatalogoComponent` | Vista principal de inventario consolidado |
| `/inventario/bodegas` | `BodegasComponent` | CRUD y gestion de bodegas |
| `/inventario/recepcion-mercancia` | `RecepcionMercanciaComponent` | Ingresos/salidas manuales multiples |
| `/inventario/traslados` | `TrasladosComponent` | Movimientos entre bodegas |
| `/inventario/historial-movimientos` | `HistorialMovimientosComponent` | Auditoria de movimientos |
| `/inventario/central-abastecimiento` | `CentralAbastecimientoComponent` | Alertas y recomendaciones de abastecimiento |
| `/inventario/bodega-detalle` | `BodegaDetalleComponent` | Detalle paginado por bodega |

## Servicios frontend

Servicio principal:

- `src/app/shared/services/inventarios/inventario.service.ts`

Servicios relacionados:

- `src/app/shared/services/bodegas/bodega.service.ts`
- `src/app/shared/services/fulfillment/fulfillment.service.ts`
- `src/app/shared/services/ventas/ventas.service.ts`
- `src/app/shared/services/maestros/maestro.service.ts`

`InventarioService` usa `environment.urlApi + '/v1'` y llama endpoints `inventory`, `bodegas`, `fulfillment` y `katuqintelligence`. Aunque inyecta `HttpClient` directamente, el interceptor global sigue aplicando headers porque las URL apuntan al backend configurado.

## Contratos principales con backend

| Metodo frontend | Endpoint | Estado |
| --- | --- | --- |
| `obtenerInventarioConsolidado` | `GET /v1/inventory/consolidado` | Principal y vigente |
| `getBodegaDetalle` | `GET /v1/inventory/bodega-detalle` | Vigente |
| `getCentralAbastecimiento` | `GET /v1/inventory/central-abastecimiento` | Vigente |
| `ingresarProductos` | `POST /v1/inventory/ingresar-multiples` | Vigente, contrato delicado para salidas |
| `realizarTraslado` | `POST /v1/inventory/traslados` | Vigente |
| `getHistorialMovimientos` | `GET /v1/inventory/historial` | Vigente |
| `diagnosticarInventario` | `GET /v1/inventory/diagnostico` | Vigente |
| `repararInventario` | `POST /v1/inventory/reparar` | Vigente, revisar seguridad backend |
| `deleteAllInventoryByCompany` | `POST /v1/inventory/delete-all-by-company` | Destructivo |
| `obtenerInventarioPorBodega` | `GET /v1/inventory/bodega/:idBodega` | Deprecated en backend, aun usado |
| `obtenerInventarioProducto` | `GET /v1/inventory/producto/:productoId` | Incompatible con backend actual |
| `registrarMovimientoInventario` | `POST /v1/inventory/movimientos` | No existe en router backend actual |
| `obtenerHistorialMovimientos` | `GET /v1/inventory/movimientos/:productId` | No existe en router backend actual |
| `obtenerMovimientosPorBodega` | `GET /v1/inventory/movimientos/bodega/:bodegaId` | No existe en router backend actual |

Los metodos legacy incompatibles deben considerarse deuda tecnica. Si aparecen errores 404 desde vistas antiguas, revisar primero estos contratos.

## Invariantes criticas

### Bodega

En inventario, `idBodega` siempre debe ser el codigo de negocio:

- Correcto: `"BOD-001"`
- Incorrecto: ID de documento Firestore, por ejemplo `"eSnsrFum5v2Lc4ZY8ukS"`

Esto aplica a:

- `inventory.idBodega`
- `inventoryMovement.idBodega`
- parametros enviados desde frontend a `/inventory/bodega`, `/inventory/traslados`, `/inventory/ingresar-multiples`

`BodegaService` normaliza bodegas y suele exponer ambos campos:

- `id`: identificador del documento o `cd`
- `idBodega`: codigo de negocio que debe usarse para stock

### Producto

El stock moderno debe usar el doc ID del producto, normalmente `producto.cd`. Hay registros legacy donde `inventory.productoId` guarda la referencia comercial. El backend normaliza referencia a doc ID antes de sumar, pero cualquier nueva lectura debe respetar ese patron.

Regla segura:

1. Construir mapa `referencia -> docId` desde `products.identificacion.referencia`.
2. Normalizar `inventory.productoId` con ese mapa.
3. Deduplicar por `normalizedProductId + '_' + idBodega`.

## Vista principal: inventario consolidado

Archivo:

- `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts`

La vista consolidada es la ruta principal. Carga productos desde `GET /v1/inventory/consolidado` con:

- `limit`
- `page`
- `soloInventariables`
- `includeMetrics`
- `search`
- `stockFilter`
- `bodega`
- `fulfillment`

Comportamiento relevante:

- `vistaConsolidada = true` por defecto.
- En la primera carga pide metricas completas con `includeMetrics=true`.
- En cambios de pagina evita recalcular metricas usando `_metricasCargadas`.
- Cuando hay filtros activos, usa `totalesFiltrados`; sin filtros usa `totalesGlobales`.
- El debounce de busqueda es de 500 ms.
- Las acciones de ajuste rapido llaman `ingresarProductos`.
- La accion de reparacion llama `repararInventario`.
- La accion de limpieza total llama `deleteAllInventoryByCompany`.

Riesgo funcional: el ajuste rapido de salida envia el texto `"Salida por ajuste de inventario"`. En backend, `ingresarProducto` e `ingresarMultiplesProductos` detectan salidas con `tipoMovimiento.startsWith('SALIDA_')`. Si se envia el texto visible en vez de la clave `SALIDA_AJUSTE`, el backend puede tratar la salida como ingreso. Este contrato debe corregirse antes de confiar en ajustes negativos.

## Recepcion de mercancia

Archivo:

- `src/app/components/inventarios/recepcion-mercancia/recepcion-mercancia.component.ts`

Flujo:

1. Carga bodegas.
2. Busca productos con `MaestroService.getProductsBySearch`.
3. Acumula productos seleccionados con cantidades.
4. Envia `POST /v1/inventory/ingresar-multiples`.

En esta pantalla, los tipos de movimiento se envian como claves (`INGRESO_COMPRA`, `SALIDA_AJUSTE`, etc.) porque el select usa `valor` como key del enum local. Ese formato si coincide con la deteccion backend basada en `SALIDA_`.

## Traslados

Archivo:

- `src/app/components/inventarios/traslados/traslados.component.ts`

Flujo:

1. Selecciona bodega origen y destino.
2. Carga productos de origen con `obtenerInventarioPorBodega`.
3. Envia un `POST /v1/inventory/traslados` por producto.

El endpoint de lectura por bodega esta marcado como deprecated en backend, pero todavia sostiene esta pantalla y algunos flujos POS. Si se elimina, hay que migrar primero la carga de productos a `consolidado` o a un endpoint especifico por bodega.

## Historial

Archivo:

- `src/app/components/inventarios/historial-movimientos/historial-movimientos.component.ts`

Usa `GET /v1/inventory/historial` con filtros:

- fechas
- bodega
- producto
- tipo de movimiento
- texto de busqueda
- ordenamiento

La vista por defecto consulta la ultima semana. Para cambios en backend, mantener obligatorios `fechaInicio` y `fechaFin`, porque el controlador los exige.

## Central de abastecimiento

Archivo:

- `src/app/components/inventarios/central-abastecimiento/central-abastecimiento.component.ts`

Usa:

- `GET /v1/inventory/central-abastecimiento`
- `POST /v1/katuqintelligence/kai/inventory-analysis`

Nota: backend tambien expone `POST /v1/inventory/analizar-abastecimiento-ia`. El frontend actual no usa ese endpoint desde `analizarAbastecimientoIA`; usa la ruta de `katuqintelligence`.

## Detalle de bodega

Archivo:

- `src/app/components/inventarios/bodega-detalle/bodega-detalle.component.ts`

Usa `GET /v1/inventory/bodega-detalle` con:

- `bodegaId`
- `search`
- `page`
- `limit`

Tambien puede consultar stock de fulfillment por producto con `FulfillmentService.getStockByKatuqId`.

Limitacion: la exportacion Excel se arma con los productos de la pagina actual, no necesariamente con todo el resultado filtrado.

## Fulfillment

Servicio:

- `src/app/shared/services/fulfillment/fulfillment.service.ts`

Endpoints principales:

- `GET /v1/fulfillment/stock/:provider/:fulfillmentProductId`
- `GET /v1/fulfillment/stock-by-katuq-id/:katuqProductId`
- `POST /v1/fulfillment/sync-inventory`
- `POST /v1/fulfillment/sync-bodega`
- `POST /v1/fulfillment/init-inventory`

El proveedor Aliaddo se usa como bodega fisica externa y sincronizacion de stock. El backend documenta que no debe crear ordenes en Aliaddo desde pedidos Katuq; Katuq sigue siendo la fuente de verdad comercial.

## Relacion con ventas y POS

Inventario se descuenta desde backend al crear ordenes:

- Frontend crea orden con `VentasService`.
- Backend `orders.create` guarda la orden.
- Backend `inventoryService.updateStock` descuenta inventario.

Para POS y ventas asistidas, el campo `order.bodegaId` debe ser codigo de negocio (`BOD-001`). Si se envia el ID del documento Firestore, el descuento, movimientos o restauraciones pueden quedar asociados a la bodega incorrecta.

## Cruce con ClickUp

Workspace revisado: ClickUp `31545745`, espacio `KATUQ`, carpeta `MODO CRITICO`, lista `OMS - Organizado`.

Referencias principales:

- `86b8f1hd4` - Inventario Bugs y Sugerencias (HUB legacy)
- `86b9vqnf9` - Eventos que RESTAN inventario
- `86b9vqpg6` - Eventos que SUMAN inventario
- `86b973c8w` - Plan Maestro WMS v3.0
- `86b7yg7br` - Bodegas no sincronizan inventario con WordPress/WooCommerce
- `86b9ve2fa` - Referencias duplicadas en bodegas OMS
- `86b9ve2xp` - Bodega Bucaramanga no muestra productos
- `86b9ewxbq` - Descargar inventario completo por una, varias o todas las bodegas
- `86b9ur0k6` - No inventariables no deben salir para agregar unidades en ajustes

### Reglas objetivo segun ClickUp

ClickUp define que Katuq descuenta stock al crear el pedido o al agregar unidades a un pedido existente. No hay bucket operativo `RESERVED` en el sistema actual. Toda reversa debe sumar con un movimiento compensatorio; nunca se edita o borra el descuento previo como mecanismo normal.

Eventos que deben restar:

- Venta asistida al confirmar creacion del pedido.
- Web/WooCommerce al confirmar creacion del pedido.
- POS al cerrar la venta.
- Recompra al confirmar modificacion, solo por unidades nuevas.
- Ajuste manual a la baja al guardar ajuste.
- Traslado origen al confirmar despacho, no al crear traslado.

Eventos que deben sumar:

- Cancelacion de pedido antes de despacho.
- Devolucion de cliente al recibir fisicamente la mercancia.
- Quitar producto o bajar cantidad en pedido existente.
- Ajuste manual al alza.
- Traslado destino al confirmar recepcion, no al despacho.
- Produccion/ensamble al finalizar orden de produccion.

### Brechas frontend vs ClickUp

1. Ajustes manuales: ClickUp exige motivo obligatorio, permisos por rol y bloqueo para productos no inventariables. La pantalla actual de ajuste rapido no refleja completamente esa regla.
2. Traslados: ClickUp quiere estados de despacho, transito y recepcion. La pantalla actual envia traslados directos e inmediatos.
3. Exportacion: ClickUp tiene pendiente descargar inventario completo por una, varias o todas las bodegas. La vista detalle exporta solo la pagina cargada.
4. No inventariables: ClickUp pide que no aparezcan para agregar unidades en ajustes; frontend debe filtrar o bloquear esos productos en formularios de ajuste/recepcion.
5. WooCommerce/WordPress: ClickUp marca como pendiente que cambios de stock Katuq se reflejen en web y que ventas web descuenten de la bodega correcta.
6. Duplicados por referencia: ClickUp reporta Bogota con 126 referencias y Medellin con 128 cuando deberian ser 64-68. Esto confirma que la normalizacion `referencia -> docId` no es solo deuda tecnica, sino bug visible.
7. Bucaramanga: ClickUp reporta que la bodega no carga productos. Debe investigarse con `idBodega`, duplicados y endpoint `bodega-detalle`.
8. WMS v3: el roadmap introduce ATP, ordenes de compra, traslados en transito, sugerencias de reorden, predicciones y KAI Morning Briefing. El frontend actual cubre inventario operativo, pero no el modelo WMS completo.

### Nota sobre ATP

El Plan Maestro WMS v3.0 define:

```text
ATP = Stock Fisico + En Camino (OC) + En Transito (Traslados) - Reservado (Pedidos) + Fulfillment Externo
```

Esto no contradice necesariamente la regla actual de "sin RESERVED" si `Reservado (Pedidos)` se calcula como derivado de pedidos abiertos ya descontados o como una futura capa de ATP. Antes de implementarlo hay que decidir si `reserved` sera un campo persistido, una coleccion nueva o un calculo derivado.

## Riesgos y deuda tecnica observada

1. Hay metodos legacy en `InventarioService` que apuntan a endpoints inexistentes.
2. `obtenerInventarioPorBodega` sigue vivo aunque backend lo marca deprecated.
3. El ajuste rapido de salida puede incrementar stock si envia texto visible en vez de clave `SALIDA_*`.
4. `obtenerInventarioProducto` no coincide con la firma backend actual.
5. Las pantallas dependen de que `idBodega` sea business code, pero varios objetos de bodega tambien incluyen `id` de documento.
6. La exportacion del detalle por bodega no exporta todos los resultados filtrados.
7. Reparacion y limpieza son acciones de alto impacto; no deben exponerse sin confirmacion fuerte y auditoria.
8. Al cambiar filtros en consolidado, las metricas deben invalidarse correctamente para no mostrar totales obsoletos.
9. El frontend actual no expresa aun el flujo objetivo WMS de traslado con estados `creado -> despachado -> en_transito -> recibido`.
10. Los ajustes no inventariables y motivos obligatorios deben alinearse con las reglas ClickUp antes de cerrar los bugs activos.

## Guia segura para modificar

- Para lecturas agregadas, preferir `GET /v1/inventory/consolidado`.
- Para detalle operacional por bodega, preferir `GET /v1/inventory/bodega-detalle`.
- Para escribir stock manual, enviar claves de tipo de movimiento (`INGRESO_*`, `SALIDA_*`), no textos visibles.
- No usar `HttpClient` directo en componentes nuevos; crear o extender servicios.
- No mezclar `bodega.id` con `bodega.idBodega`.
- No sumar `inventory` sin normalizar `productoId`.
- Antes de tocar ventas, POS, picking, packing o fulfillment, revisar el flujo backend completo porque comparten la misma coleccion `inventory`.
