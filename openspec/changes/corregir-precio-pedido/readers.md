# Matriz de lectores — gate común D-543/D-544

**23-oct-2026.** Código local, sin acreditar versión productiva ni build instalado. Rutas relativas a Seller y al backend hermano, salvo la app indicada. Esta matriz forma parte del diseño APROBADO: «Apruebo ambos diseños y la adaptación». Las tareas conservan su checkpoint propio.

Regla común: pedido sin marca conserva comportamiento actual; pedido con acuerdo validado usa bases/importes resueltos del servidor. Marca inválida es error explícito, nunca fallback a catálogo. Congelar precios no congela pagos futuros ni el saldo: el servidor recalcula con pagos vigentes. Ninguna pantalla crea otra fórmula de dinero.

| Consumidor | Camino comprobado | Gate para pedido marcado |
|---|---|---|
| Pedidos/detalle | `list.component.ts:3207,4320,4671`; guarda `necesitaRecalculoFrontend:3848`; derivación independiente de saldo `4354–4395` | Bifurcar antes de todos los recálculos, no solo `_calculadoEnBackend`; unitarios, total, pagado, saldo y excedente del servidor |
| Lista/búsqueda/export API | Backend `controllers/orders.js:1660,1675,9236` usa `calculateOrderTotals`; métricas proyectadas en `1650` | Propagar marca/acuerdos; calculador respeta pacto; probar paginación/export sin reemplazar precios |
| Pagos/Tesorería | `asentarpagomanual.component.ts:99,234,287`; `registrar-pago:59`; backend `treasuryService.js:737,1049,1216` | Corregir no registra ni revisa pagos; un pago posterior conserva bases y refresca saldo. Caracterizar estados no vigentes sin alterarlos |
| Cartera | `GET /v1/treasury/cartera` → `carteraService.js:74 resolveSaldo` | Cero por cobrar ante excedente; no crear abono ni cambiar aging |
| Logística principal | `despachos.component.ts:628,661` consulta pedidos; bloques `665–679,2807–2814` comentados | Usar importes actuales; no atribuir ejecución a comentarios |
| Órdenes generadas v2 | `/despachos`, pestaña `despachos.component.html:243` → `v2.ts:155` → `GET /v1/logistica/shippingorders/all?fields=full`; backend `logistica.js:655–725` hace `getAll` de pedidos actuales | Evitar recálculo `v2.ts:184,1446–1514` para marcado. No escribir shipping_orders para copiar dinero |
| Órdenes originales/modal | `despachos.component.html:360`; `ordenes-despacho.component.ts:73,303–338,341,582` | Misma regla; ambas vistas reproducen el caso 1352 si no se adaptan |
| Planilla logística | `despachos.component.ts:4054,4056,4140`, otras `1915,4951,5187` leen `faltaPorPagar` | Refrescar pedidos seleccionados antes de generar; probar orden de despacho creada antes de corregir |
| PDF/comanda/correo generado | `list.component.ts:5792,5912,5920` sincroniza entrega y recalcula; `PaymentService:1485–1552,2149,2177`; `PedidosUtilService:778` | Bifurcar antes de mutar entrega/zona o importes; consumir líneas, extras, bruto/neto y desglose resueltos sin doble suma. No reenviar documentos anteriores |
| Correo generado por backend | `routers/orders.js:928` → `services/notifications/reenviarConfirmacionPedido.js:83–85` → `notificationHooks.correoPedidoCreado` → `templateHelpers.buildCartItemsList:298,975`; `extractItemPrice:918–954` solo manual/volumen/base | Adaptar unitarios y totales del HTML a acuerdos; prueban marcado/legacy con transporte de correo simulado. No enviar correos reales para validar ni modificar archivos de correo ajenos sin integrar su diff |
| Orden de venta simplificada | `list.component.ts:5885`; `orden-venta.component.ts:39,194–235` | Total y unitarios pactados; no descontar otra vez un precio neto |
| Excel de pedidos | `GET /v1/orders/all/export`; `list.component.ts:8821–8858` recalcula después de recibir | Omitir transformación monetaria legacy para marcado; incluir pagos no vigentes y excedente |
| Reportes | Backend `analytics.js:1377` proyecta campos, `1396` llama `priceCalculations.recalcularPedidoCompleto`, `1413` obtiene ingreso por producto de snapshot | Proyección incluye marca/acuerdos y datos necesarios; ingreso por producto usa resueltos, no basta total correcto. Regresión de sumas persistidas `99,243,437,583,781` |
| Facturación posterior | Backend `AccountingManager.js:1544–1610`; `dian/invoiceRequests.js:78`; mappers SIIGO/World Office/UBL | Lectura fresca tras candado; adaptadores consumen precio/impuesto pactados. Gate previo con dobles de proveedor, sin emitir facturas reales |

## Escritores posteriores que también son gates

| Camino | Riesgo y protección |
|---|---|
| `updateOrderInternal` y lectores/editores de carrito | Payload completo antiguo o recálculo puede pisar acuerdo. Guard transaccional de campos server-only, identidad estable y protocolos de edición de líneas del diseño |
| `editBatch`, `/edit-multiple-orders`, `orders.js:5949–5966` | Batch del body puede pisar dinero/cápsula. Para marcados, patch operativo excluye esos campos y lleva precondición; caracterizar conflictos por pedido/lote |
| `registrarCierreCaja`, `orders.js:7697,7817–7823` | Consulta previa + batch de pedido completo puede sobrescribir dinero tras corregir. Patch solo de cierre y precondición updateTime; conflicto exige recalcular cierre. Confirm bloquea cierre ya persistido |

Inventariar otros escritores que reemplazan snapshots completos antes de activar, incluidos integraciones y transportadores cuando correspondan. No basta que los lectores entiendan la marca si una escritura posterior puede invalidarla. El write-set de cada acción existente no se amplía por esta protección; diffs sensibles separados y pruebas con copia anterior/posterior a la corrección.

## App del mensajero y contrato móvil

Repo real localizado, solo leído: `/Users/danielga/Downloads/_Organizado/growdata/katuq_front_appmensajeros`. No confundir con las apps del personal `Katuq.Android.Gestion`/`Katuq.iOS.Gestion`.

- Android nativo: `features/orders/OrdersRemote.kt:40`, `core/ApiClient.kt:96` → `POST /v1/logistica/shippingorders/getByTransportador`; `OrderExt.kt:59` lee saldo; `Models.kt:101` tiene fallback a envío si falta.
- iOS nativo: `Core/APIClient.swift:118`, `Models.swift:144–145`, `OrderDetailView.swift:54`: misma ruta, saldo o fallback si falta.
- Flutter: `orders_api_service.dart:101`, `order_detail_screen.dart:1030`: misma ruta/`faltaPorPagar`.
- Backend: `routers/logistica.js:431` conserva `carrierAuth`; `controllers/logistica.js:1957,2128` recalcula antes de responder. La variante de independiente delega en `controllers/independientes` y también debe caracterizarse.

Respuesta siempre con `faltaPorPagar` **numérico, incluido 0**, para no activar fallback de domicilio. No cambiar contrato de autenticación ni agregar fórmula monetaria móvil. Antes de habilitar: identificar plataforma/build realmente instalado en ALMARA, verificar decoder/payload y observar pantalla refrescada con el caso sintético de total $43.400/saldo $21.700, cero y excedente. Una prueba del endpoint no sustituye la pantalla instalada. Si un cliente requiere corrección, se hace como adaptación compatible aprobada de ese lector, no se declara cubierto por inspeccionar otro repo.

## Evidencia que debe producir la implementación

Contratos de lectores marcados y sin marca; datos del caso 1352 en memoria/emulador; IVA no cero, descuentos de línea/globales, extras en sus dos representaciones, domicilio e impuestos, precio cero, manual conservado/sustituido, lista incompleta, mismo producto en dos líneas, catálogo/lista posterior y pagos concurrentes. No cambiar los resultados canónicos legacy para hacer pasar el acuerdo. No usar datos personales ni crear pedidos reales de QA sin autorización específica.

### Precisiones verificadas al preparar S-03 (23-oct-2026)

- `precioSinIvaResuelto` es base unitaria del producto antes de descuentos; `ivaLinea` es impuesto extendido del producto, sin extras. `precioEfectivoSinIva` ya contiene descuentos porcentuales: no volver a aplicarlos en factura/PDF. La presencia de promoción sigue suprimiendo el descuento global en el modo legacy, incluso si el precio procede de una entrada manual.
- Los extras planos ya contienen su cantidad propia en `valorUnitarioSinIva`; el motor multiplica por cantidad del producto. No multiplicar de nuevo por cantidad del extra ni completar importes desde referencias actuales. Legacy usa `precioTotalConIva` para su impuesto; canónico usa base × tarifa. No normalizar esa diferencia desde una pantalla.
- El impuesto canónico agregado se redondea por pedido y `ivaLinea` por producto. Dos líneas de base0,10/IVA5% tienen impuesto agregado0,01 y campos `ivaLinea`0,01+0,01. Conservar el total autoritativo; no reconstruirlo sumando esos campos ni repartir el redondeo sin una regla aprobada. `desgloseIVA['0']` representa impuesto cero, no base excluida.
- El descuento fijo legacy vive en el resumen y no está distribuido entre productos/IVA. Lectores y mappers deben conservar esa distinción; no crear un prorrateo para hacer cuadrar netos. Alias de correo/PDF de bases excluidas e impuestos requieren proyección explícita desde el motor, no inferir bases dividiendo un impuesto ya redondeado.

Estas precisiones guían las pruebas pendientes de lectores; no acreditan todavía su implementación ni el gate de facturación.
