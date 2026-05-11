# Revision Guia Cereza + informe inventario/costos

Fecha de revision: 2026-05-11

Archivos y fuentes revisadas:

- Excel: `/Users/danielga/Downloads/Inventario_Prindel-Katuq_Analisis.xlsx`
- Frontend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/Seller.Katuq`
- Backend: `/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase`
- ClickUp: workspace `31545745`, lista `OMS - Organizado` (`901416274871`)

## Solicitud recibida

Mensaje de Jairo:

1. Dar una fecha de entrega de la integracion 100% de Guia Cereza.
2. Crear una lista de precios para subir el costo y usarla en inventarios.
3. El punto 2 es esencial para trabajar el informe.
4. Ver productos de Guia Cereza en venta asistida, en una bodega llamada `Guia Cereza`.
5. El Excel debe poder descargarse desde Katuq en formato Excel.
6. Ya existen archivos/motor para armar reportes dinamicos; hay que ubicarlos.

## Lectura del Excel

El archivo es un informe de valorizacion de inventario, no un simple listado. Tiene 4 hojas:

| Hoja | Filas x columnas | Proposito |
| --- | ---: | --- |
| `Resumen Financiero` | 20 x 2 | Indicadores generales, capital inmovilizado, valor potencial y margen/markup promedio. |
| `Analisis por Bodega` | 8 x 5 | Unidades, costo total, participacion de costo y productos sin stock por bodega. |
| `Inventario y Precios` | 80 x 36 | Base SKU por bodega, costo, listas de precio, margenes, markup, valor de inventario y alertas. |
| `Alertas` | 4 x 4 | Observaciones manuales de datos/precios/codigos. |

La hoja principal contiene 78 SKUs y estas columnas clave:

- Identificacion: `Codigo`, `Nombre`, `Categoria`, `Unidad`.
- Stock por bodega: `BOGOTA`, `BUCARAMANGA`, `CALI`, `MEDELLIN`, `PEREIRA`, `Principal`.
- Totales: `Total existencias`, `Costo total inventario`, `Valor venta @ Publico`, `Utilidad potencial @ Publico`.
- Costos/precios: `Costo unitario`, `P. Mayorista`, `P. Modelo`, `P. Publico`.
- Rentabilidad: margen en pesos, margen porcentual y markup para cada lista de precio.
- Estado: `OK`, `SIN COSTO`, `SIN STOCK`, `STOCK BAJO`.

Totales leidos del Excel:

| Metrica | Valor |
| --- | ---: |
| Productos | 78 |
| Unidades totales | 12.175 |
| Capital inmovilizado | 620.164.807,21 |
| Valor venta potencial @ Mayorista | 870.509.450,07 |
| Valor venta potencial @ Modelo | 1.101.019.867,38 |
| Valor venta potencial @ Publico | 1.684.590.866,97 |
| Utilidad potencial @ Publico | 1.064.426.059,76 |
| Margen promedio @ Publico | 63,19% |
| Markup promedio @ Publico | 2,716x |

Stock/costo por bodega:

| Bodega | Unidades | Costo total | % costo total | SKUs sin stock |
| --- | ---: | ---: | ---: | ---: |
| BOGOTA | 2.358 | 118.533.352,85 | 19,11% | 4 |
| BUCARAMANGA | 2.452 | 121.951.605,78 | 19,66% | 2 |
| CALI | 2.516 | 134.051.381,38 | 21,62% | 4 |
| MEDELLIN | 2.432 | 123.002.519,95 | 19,83% | 2 |
| PEREIRA | 2.417 | 122.625.947,25 | 19,77% | 1 |
| Principal | 0 | 0 | 0% | 78 |

Alertas del Excel:

- Codigo posible typo: en Aliaddo aparece `JRC4202`; debe verificarse/corregirse a `JCR4202`.
- Revisar IVA para `JCR4036`.
- Revisar IVA para `JCR4026`.

## Comparacion con ClickUp

### Guia Cereza

Tarea principal: `86b8nz8tr` - `INTEGRACION GUIA CEREZA - APROBADO`.

ClickUp muestra las fases base como hechas:

- Fase 1: traer productos de Guia Cereza a Katuq.
- Fase 2: enviar pedidos creados a Guia Cereza.
- Fase 3: recibir estados y evidencias.

Pero la tarea padre sigue `in progress` y hay bloqueadores abiertos:

| ClickUp | Estado | Impacto |
| --- | --- | --- |
| `86b9vbd81` Productos Cereza no aparecen en Venta Asistida | `to do`, urgente | Bloquea venta operativa desde Katuq. |
| `86b9vbd9v` Consolidar 3 bodegas Cereza en una sola `Guia Cereza` | `to do`, alta | Necesario para que OMS no gestione centros Cereza separados. |
| `86b9vbd8z` Filtro de visibilidad por canal a nivel producto | `to do`, alta | Probable causa de que no aparezcan en venta asistida/canales. |
| `86b9vbdb2` Shopify solo muestra productos de Cereza | `to do`, urgente | Alcance F3 canal Shopify. |
| `86b9vbdcw` Configurar bodegas por canal para Shopify | `to do`, alta | Evita que Shopify opere solo contra Cereza. |
| `86b9vbdfr` Cifras de productos Shopify inconsistentes | `to do`, normal | Validacion de catalogo/canal. |
| `86b9vbdhv` Categorias hibridas | `to do`, normal | Decision/implementacion de taxonomia. |
| `86b9vbdjn` Estados de pago/proceso Shopify | `to do`, alta | Homologacion operacional. |
| `86b9vbdnx` Pago Shopify -> Katuq | `to do`, normal | Scope adicional. |
| `86b9vbdpz` Pedidos sin pago | `to do`, normal | Scope adicional. |

Conclusion: no conviene prometer "100%" solo porque las tres fases base estan en `done`. Para "100%" real frente a ClickUp faltan venta asistida, bodega unica, visibilidad por canal y cierres F3 de Shopify/pagos.

### Informe de inventarios

Tarea clave: `86b9vgqbc` - `Informe de inventarios`.

Descripcion ClickUp:

- El informe debe mezclar data.
- Incluir costo.
- Jairo propone un apartado de costos dentro de lista de precios, con subida similar/dinamica.
- Combinar costo de producto, precios de venta y metricas generales.
- Debe funcionar por bodega o total.

Esto coincide directamente con el Excel revisado.

## Lo que ya existe en Katuq

### Lista de precios

Frontend:

- `src/app/components/lista-precios/lista-precios/lista-precios.component.ts`
- Exporta plantillas Excel.
- Exporta precios por tipo de cliente, precio unitario y precio por volumen.
- Importa Excel de precios por tipo de cliente.

Backend:

- `functions/routers/tiposPrecios.js`
- `functions/controllers/tiposPrecios.js`
- `functions/routers/preciosAsociados.js`
- `functions/controllers/preciosAsociados.js`
- `functions/controllers/productos.js` expone `POST /v1/productos/import-precios`.

El importador actual guarda `preciosPorTipoCliente` en cada producto y soporta precios con/sin IVA.

### Costos

El modelo ya tiene costo unitario:

- Frontend: `src/app/shared/models/productos/Precio.ts` contiene `costoUnitario?: number`.
- Importador onboarding inventario: acepta `costoUnitario`, `costo`, `costoCompra`, `cost`, `priceBuy`, `unit_cost`.
- Backend onboarding actualiza `products.precio.costoUnitario`.
- Fulfillment import tambien mapea `precio.costoUnitario`.
- Backend inventario ya calcula valores de costo en varias metricas (`inventory.js`).

Decision recomendada: no crear una entidad separada para "costo" si el valor final operativo es `products.precio.costoUnitario`. Lo correcto es agregar una experiencia de carga de costos dentro de Lista de precios, pero persistiendo en `precio.costoUnitario`. Asi el inventario, reportes y margen usan una sola fuente de verdad.

### Exportacion Excel inventario

Frontend existente:

- `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts`
  - `exportToExcel()` -> `Inventario_Detallado.xlsx`.
  - `exportarExcelConsolidado()` -> `Inventario_Consolidado_YYYY-MM-DD.xlsx`.
- `src/app/components/inventarios/historial-movimientos/historial-movimientos.component.ts`
  - exporta movimientos a Excel.

Limitacion: esas exportaciones son listados planos desde la vista actual. No generan el workbook multihoja con resumen financiero, analisis por bodega, margenes, markup y alertas.

### Reportes dinamicos

Frontend:

- `src/app/components/dashboard/builder/report-builder.component.ts`
- `src/app/shared/services/dashboard/reports.service.ts`
- `src/app/components/dashboard/model/source-catalog.ts`

Backend:

- `functions/routers/reports.js`
- `functions/services/reports/engine/bigquery.engine.js`
- `functions/services/reports/sources/inventory.source.js`
- `functions/services/reports/sources/products.source.js`

Limitacion actual:

- El builder exporta CSV, no XLSX.
- `v_inventory` no expone costos, listas de precio ni margenes.
- `v_products` expone precio y stock, pero no `precio.costoUnitario` ni las listas `preciosPorTipoCliente`.
- El Excel solicitado requiere unir productos + inventario por bodega + costo + precios por tipo/lista.

## Brecha tecnica exacta

Para replicar el Excel desde Katuq falta:

1. Carga masiva de costos desde Lista de precios.
2. Reporte backend que una inventario + productos + costos + listas de precio.
3. Exportador XLSX multihoja con formulas o valores calculados.
4. Filtro por bodega o total.
5. Boton de descarga desde Katuq.
6. Correccion/validacion de bodega unica `Guia Cereza` para venta asistida.
7. Asegurar que los productos Cereza queden activos, visibles para SellerCenter/Venta Asistida y asociados a la bodega unica.

## Plan tecnico recomendado

### 1. Costos en Lista de precios

Agregar una cuarta pestana en `Lista de precios`: `Costos`.

Funciones:

- Descargar plantilla con columnas: `REFERENCIA`, `COSTO UNITARIO`.
- Importar Excel y actualizar `products.precio.costoUnitario` por `identificacion.referencia`.
- Mostrar preview: referencias encontradas, no encontradas, valores invalidos.
- Registrar `date_edit` y `user_edit`.
- Invalidar cache de paginacion de productos.

Backend sugerido:

- Nuevo endpoint: `POST /v1/productos/import-costos`.
- Reutilizar patron de `importPrecios`, pero escribiendo solo `precio.costoUnitario`.

### 2. Reporte inventario valorizado

Crear un endpoint especifico para este workbook, porque el reporte necesita varias hojas y calculos financieros.

Opcion recomendada:

- `POST /v1/inventory/reports/valuation/export`
- Body:
  - `bodegaIds?: string[]`
  - `includeAllBodegas?: boolean`
  - `priceListNames?: { mayorista, modelo, publico }`
  - `fulfillment?: string`
  - `format: "xlsx"`

Salida:

- Archivo `.xlsx` con hojas:
  - `Resumen Financiero`
  - `Analisis por Bodega`
  - `Inventario y Precios`
  - `Alertas`

Calculos:

- Stock por bodega usando `inventory.idBodega` como business code.
- Normalizacion anti doble conteo de `productoId` usando referencia -> docId, como en `calcularMetricasPorBodega`.
- Costo unitario desde `products.precio.costoUnitario`.
- Precios desde `preciosPorTipoCliente` por nombre/ID de lista.
- Publico desde precio base si no existe lista Publico.
- Margen: `precio - costo`.
- Margen %: `(precio - costo) / precio`.
- Markup: `precio / costo`.
- Estado:
  - `SIN COSTO` si costo es 0 o vacio.
  - `SIN STOCK` si total existencias es 0.
  - `STOCK BAJO` si total existencias < 10.
  - `OK` en caso contrario.

### 3. Integracion con reportes dinamicos

En paralelo o despues del endpoint especifico:

- Agregar source `inventory_valuation` al motor de reportes.
- Exponer dimensiones: producto, referencia, categoria, bodega, fulfillment, estado.
- Exponer medidas: stock, costo unitario, costo total, precio publico, valor venta, utilidad, margen.
- Agregar exportacion XLSX al Report Builder, ademas de CSV.

Esto potencia la parte dinamica, pero no reemplaza el workbook financiero multihoja.

### 4. Guia Cereza en Venta Asistida

Cerrar los bloqueadores ClickUp:

- Crear/dejar una sola bodega con nombre `Guia Cereza`.
- Consolidar stock Cereza en esa bodega usando `idBodega` business code, no Firestore doc ID.
- Marcar productos Cereza como activos y visibles para venta asistida/SellerCenter.
- Revisar filtro por canal en el buscador de productos de `crear-ventas`.
- Confirmar que al seleccionar bodega `Guia Cereza` aparecen todos los productos activos Cereza con stock.

## Fecha tecnica sugerida

Hoy es lunes 2026-05-11.

Recomendacion para comunicar:

- Informe Excel descargable + carga de costos: jueves 2026-05-14 al cierre del dia, como primera version validable.
- Guia Cereza operativa en Venta Asistida con bodega unica: viernes 2026-05-15 al cierre del dia, si no aparecen bloqueos de datos productivos.
- Integracion Guia Cereza "100%" frente a ClickUp, incluyendo F3 Shopify/pagos/canales: lunes 2026-05-18 al cierre del dia como fecha prudente.

No recomendaria prometer "100%" para antes de 2026-05-18, porque ClickUp aun tiene tareas abiertas urgentes y altas que exceden el flujo base Cereza -> Katuq.

## Respuesta corta sugerida para Jairo

Jairo, revise el Excel y ClickUp. El informe que necesitas mezcla inventario por bodega, costo unitario, listas de precio Mayorista/Modelo/Publico, margenes, markup y resumen financiero. Katuq ya tiene base para esto: inventario consolidado, exportaciones Excel, lista de precios, costoUnitario en productos y motor de reportes dinamicos. Lo que falta es unir esas piezas en un reporte valorizado descargable en Excel y agregar carga masiva de costos desde Lista de precios.

Para Guia Cereza, la integracion base tiene fases cerradas, pero en ClickUp siguen abiertos dos bloqueadores operativos: que los productos aparezcan en Venta Asistida y consolidar todo en una sola bodega llamada `Guia Cereza`. Mi fecha recomendada es entregar el informe/carga de costos el jueves 14 de mayo de 2026, dejar Venta Asistida + bodega unica el viernes 15 de mayo de 2026, y prometer la integracion 100% frente a ClickUp para el lunes 18 de mayo de 2026.
