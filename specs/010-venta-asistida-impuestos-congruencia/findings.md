# Findings — 010 · Congruencia de IVA en venta asistida

> Datos REALES verificados contra código (no asumidos). Fecha: 2026-06-25.
> Método: lectura directa de frontend (`Seller.Katuq`) + backend (`katuq_admin_back_firebase/functions`).
> Corrige el primer informe exploratorio que auditó **código muerto** (ver F-07).

## A. Dónde se PUEDE modificar el IVA / precio (UI venta asistida)

| Punto | Archivo:línea | Qué hace |
|---|---|---|
| Input IVA manual (carrito) | `ventas/carrito/carrito.component.ts:344-350` (`onIvaManualChange`) | Setea `_ivaManualOverride`, recalcula línea |
| Input precio base manual (carrito) | `ventas/carrito/carrito.component.ts:304-320` (`onPrecioManualInput`) | Setea `_precioManualOverride` (solo si `permitePrecioManual`) |
| Input IVA manual (cotización) | `cotizaciones/cotizacion-editor/cotizacion-editor.component.ts:740-745` | Mismo mecanismo |
| Popup config producto | `ventas/catalogo/conf-product-to-cart/conf-product-to-cart.component.ts:~4495-4552` | Precio manual + aplica precio por categoría (`_precioAplicadoPorCategoria`) |
| Precio por categoría de cliente | `ventas/catalogo/ecomerce-products/ecomerce-products.component.ts:1100-1145` | Hornea categoría en `producto.precio.*` (ver F-03) |

## B. Cálculo de IVA — el mismo concepto replicado en 7+ lugares

**Frontend**
- `carrito.component.ts`: `checkPriceScale` (246-280, master con IVA), `tierSinIva` (288-298, fallback robusto D-046), `getIvaActual` (337-342).
- `checkout.component.ts`: `getUnitPriceSinIVAWithScale` (458-494), `checkIVAPrice` (570-782, desglose por tarifa 0/5/8/19), `tierSinIva` (502-512).
- `service/pedidos.util.service.ts`: `calcularPrecioUnitarioSinIVA/ConIVA/calcularIVAUnitario` (538-823).
- `cotizaciones/cotizacion-editor.component.ts`: `itemPrecio` (660-687), `tierSinIva` (617-627), `precioSinIvaBaseLinea` (633-641), `rangoVolumenPorCantidad` (596-610).
- `ventas/list/list.component.ts` y `ventas/orden-venta/orden-venta.component.ts`: copias adicionales para listado/PDF.

**Backend**
- ✅ **CANÓNICO**: `services/orderCalculationService.js` → `calculateOrderTotals` (195-280) que usa `getSubTotalPedido` (10-66) + `getTotalImpuesto` (74-186). Invocado en `controllers/orders.js` (1093, 1866, 1987, 2066, 2234, 2348, 4704, 6905, 7544).
- ⚠️ **EMAIL (7ª copia)**: `services/notifications/templateHelpers.js:884-944` reimplementa la prioridad precio/volumen/base por su cuenta.

## C. Flags (verificados)

| Flag | Seteo | Lectura backend canónico | Efecto |
|---|---|---|---|
| `_precioManualOverride` | carrito:309/320, cotización:718/735 | `orderCalculationService.js:89-100` | precio base sin IVA manual (solo si `procesoComercial.permitePrecioManual===true`) |
| `_ivaManualOverride` | carrito:348, cotización:745 | `orderCalculationService.js:98-99, 120-122` | cambia solo la tarifa % |
| `_precioAplicadoPorCategoria` | ecomerce-products:1137, conf-product:4552 | **NO leído por backend** (solo metadata) | FE bloquea volumen; backend NO |
| `_calculadoEnBackend` | backend orders.js (1094, 1867, …) | marcador | backend asumió cálculo |

## D. SALIDAS / incongruencias (hallazgos)

- **F-01 (CRÍTICO) — El fix D-046 es solo frontend; el bug sigue vivo en el backend.**
  `orderCalculationService.getTotalImpuesto:107-117` toma el tier de volumen con `valorUnitarioPorVolumenSinIVA` **crudo** (`|| precioSinIva`), sin el `tierSinIva` robusto que deriva desde el valor con IVA. Para datos legacy (campo ausente/0) colapsa al **precio de 1 unidad**. Al recalcular en `/orders/create`, `edit` y lecturas de `list` reaparece exactamente el bug que D-046 dice resuelto.

- **F-02 (CRÍTICO) — Incongruencia interna del backend (subtotal vs IVA).**
  Para el MISMO tier legacy: `getSubTotalPedido:29-32` cae a **0** (`Number(...)||0` → `0 * cantidad`), mientras `getTotalImpuesto:112` cae al **precio de 1 unidad**. Subtotal e IVA quedan calculados sobre bases distintas → total inconsistente.

- **F-03 (ALTO) — Categoría de cliente vs volumen divergen FE/BE.**
  FE bloquea volumen cuando hay categoría (`carrito:262`, `checkout:470`). El backend canónico NO conoce `_precioAplicadoPorCategoria` y aplica volumen sobre el precio horneado (`getTotalImpuesto:107-117`). Un producto con precio por categoría **y** `preciosVolumen` da totales distintos FE vs BE. Además, `ecomerce-products:1130-1135` hornea `precioUnitarioConIva/SinIva/valorIva` pero **no** `precioUnitarioIva` (la tarifa %) → el backend usa la tarifa base, no la de la categoría.

- **F-04 (ALTO) — El email diverge del pedido.**
  `templateHelpers.js:910-924` para tier de volumen devuelve `valorUnitarioPorVolumenConIVA` directo: **ignora `_ivaManualOverride`**, no maneja categoría y no tiene fallback robusto. El precio/IVA del correo al cliente puede no coincidir con el pedido persistido.

- **F-05 (MEDIO) — Sin desglose por tarifa en backend.**
  El backend persiste solo `totalImpuesto` agregado; el desglose 0/5/8/19 vive únicamente en `checkout.checkIVAPrice`. La factura electrónica (SIIGO/World Office) depende de ese desglose del frontend → riesgo de descuadre si el backend recalcula el total con otra base (F-01/F-03).

- **F-06 (DEUDA, ya señalada en D-046) — Lógica replicada en 7+ lugares.**
  carrito, checkout, pedidos.util, cotizacion-editor, list, orden-venta, orderCalculationService, templateHelpers. D-046 ya recomendó extraer un `LineaPricingService` único. Sin fuente única, cada fix corre el riesgo de no propagarse (causa raíz de F-01/F-04).

- **F-07 (RUIDO) — Código muerto que confunde auditorías.**
  `controllers/orders.js:7066` (`getTotalImpuesto`) y `:7222` (`getValorACobrarPorPedido`) están **deprecated con fórmula marcada INCORRECTA**; el único llamador del primero es el segundo. Siguen montados. Un primer agente auditó ESTA versión y concluyó erróneamente que "el backend ignora los overrides" — falso para el canónico.

## D-bis. EL FANTASMA (root-cause del "IVA mal en muchos pedidos") — VERIFICADO

Modelo de prioridad ratificado por el responsable de producto: **precio manual → precio por tipo de cliente (categoría) → precio por volumen → precio base**. Categoría manda sobre volumen (no es normal tener ambos). El caso base funciona; el IVA falla "fantasmalmente" en muchos pedidos.

**Causa raíz (F-08, CRÍTICO):** frontend y backend calculan el IVA de la MISMA línea **leyendo campos distintos con anclas distintas**:

| Rama | Frontend (`checkout.checkIVAPrice`) | Backend (`orderCalculationService.getTotalImpuesto`) | ¿Congruente? |
|---|---|---|---|
| Base | `precioUnitarioSinIva × precioUnitarioIva%` (716) | `precioUnitarioSinIva × precioUnitarioIva%` (103-127) | ✅ Sí |
| **Volumen** | suma directa de `valorUnitarioPorVolumenIva` (monto $ guardado) (688-691) | `valorUnitarioPorVolumenSinIVA × valorIVAPorVolumen%` (112-127) | ❌ **Solo si los campos guardados son recíprocos exactos** |
| **Categoría** | suma directa de `precioCategoria.valorIva` (monto $ guardado) (659-662) | `precioCategoria.precio` horneado × **tarifa base** (no la de categoría) | ❌ **Diverge si valorIva guardado ≠ precio×% o si la tarifa difiere** |
| Precio/IVA manual | `sinIva × %` (616, 635) | `sinIva × %` (96-100, 127) | ✅ Sí |

**Conclusión:** el IVA NO se descuadra al azar — se descuadra **en toda línea con precio por volumen o por categoría**, porque el FE confía en un monto de IVA **pre-guardado** en el producto y el BE lo **recalcula** desde otro campo. En cuanto esos campos del producto dejan de ser perfectamente coherentes (redondeo, sync Osmosis/import, edición parcial, dato legacy), el total persistido difiere del cobrado. Esto explica por qué el bug es intermitente, masivo y difícil de rastrear. El caso base coincide → "más o menos funciona".

**Corolario:** la única cura estable es una **fuente única de cálculo** (Q-03 = sí) que fije UN ancla (p. ej. siempre `sinIVA × tarifa`, derivando `sinIVA` del tier de forma robusta) y la consuman checkout, `orderCalculationService` y `templateHelpers`. Parchar por separado deja el riesgo de re-divergencia.

**F-09 (ALTO) — IVA del envío inconsistente FE/BE (pedidos a domicilio):**
- FE (`checkout:824` + `PaymentService.checkIVAPrice:578-603`): el `totalImpuesto` **incluye** el IVA del envío (extrae IVA tratando el costo de zona como CON IVA).
- BE (`orderCalculationService.getTotalImpuesto:168`): suma el IVA del envío **solo si recibe `allBillingZone`**, pero los llamadores (`orders.js` 1093, 2234, 6905…) hacen `calculateOrderTotals(doc)` **sin** ese argumento → el BE **omite** el IVA del envío. Y como el BE **sobreescribe** `totalImpuesto` (`:249-250`), el persistido **pierde** el IVA del envío que el vendedor vio.
- Ruta de recuperación de envío (`:210-228`): asigna `totalEnvio = valorZonaCobroConImpuesto` (CON IVA) y luego suma `ivaEnvio` aparte → **doble conteo** del IVA del envío.
- Ambigüedad de naming: `payment.service.ts:1797` llama `pedido.totalEnvio` como `envioSinIva`, pero `checkIVAPrice` lo trata como CON IVA. No hay una semántica única de si `totalEnvio` es con o sin IVA.
- **Nota de frecuencia:** afecta solo pedidos a **domicilio** con zona de cobro → "raro pero real". Los pedidos sin envío (recoge/base) no se ven afectados.
- **Cura (misma spec):** fijar UNA semántica — `totalEnvio` SIN IVA + IVA del envío calculado **una sola vez** dentro del cálculo canónico, con la **tarifa del envío persistida en el pedido** (para que el BE no dependa de recibir `allBillingZone`). Requiere decisión de producto sobre si el envío lleva IVA y a qué tarifa (ver pregunta abierta).

## D-ter. FOTO DEL FANTASMA — harness ejecutado (T-04, 2026-06-25)

Corrida de `functions/scripts/test-iva-contract.js` (14 fixtures vs `orderCalculationService` actual): **7 PASS / 7 FAIL**. Cada fallo confirma un hallazgo:

| Fixture | Esperado | Actual | Confirma |
|---|---|---|---|
| F-04 volumen legacy | IVA 152 / total 952 | IVA 190 / **total 190** | F-01 (colapso a base) **+ F-02** (subtotal→0; total catastrófico) |
| F-05 categoría | IVA 39.9 | IVA 57 | F-03 (BE ignora categoría) |
| F-06 categoría+volumen | IVA 133 | IVA 152 | F-03 (volumen pisa categoría; viola AC-10) |
| F-08 precio manual | total 285.6 | total 245.6 | **NUEVO F-10:** `getSubTotalPedido` ignora `_precioManualOverride` |
| F-09 precio+IVA manual | total 252 | total 212 | NUEVO F-10 (subtotal con base, no manual) |
| F-10 adiciones | IVA 20.9 | IVA 19 | adiciones leen campo distinto (`precioTotalConIva` vs `valorUnitarioSinIva`) |
| F-13 envío | IVA 20.9 | IVA 19 | F-09 (omite IVA de envío sin `allBillingZone`) |

**F-10 (ALTO, nuevo) — subtotal e IVA usan bases distintas en precio manual:** `getSubTotalPedido` (`orderCalculationService.js:21,38,41`) NO contempla `_precioManualOverride` ni categoría — siempre usa `precioUnitarioSinIva`. Pero `getTotalImpuesto` SÍ usa el manual. Resultado: con precio manual el IVA es correcto pero el subtotal (y el total) quedan con el precio base. El cálculo canónico debe usar la MISMA resolución de precio para subtotal e IVA.

PASS (7): base, multi-tarifa, volumen sano, IVA manual sobre volumen, descuento, cantidad 0, NaN → confirma que la mayoría de pedidos (precio base) cuadran; el fantasma vive en los bordes.

## E-bis. INVENTARIO COMPLETO de superficies (barrido 2026-06-25)

> El barrido amplió la superficie. Hay **3 implementaciones de cálculo en backend que se contradicen** y un hub de FE ya existente.

### Implementaciones de cálculo (las que hay que UNIFICAR)
| # | Ubicación | Ancla | Respeta overrides/categoría | Estado |
|---|---|---|---|---|
| BE-1 | `services/orderCalculationService.js` | `sinIVA × tarifa` (multiplica) | overrides SÍ; categoría NO; volumen sin fallback robusto (F-01) | **vivo** (orders create/edit/list/POS). Base del canónico |
| BE-2 | `utils/priceCalculations.js` (`calculateIVAPrice`, `recalcularPedidoCompleto`) | suma montos guardados (`valorUnitarioPorVolumenIva`, `valorIva`) | NO respeta overrides ni categoría | **vivo** vía `controllers/analytics.js:1144/1229/1377` → métricas divergen del pedido |
| BE-3 | `controllers/orders.js:7066 getTotalImpuesto` + `:7222` | multiplica | parcial | **muerto** (deprecated) — eliminar |
| BE-4 | `services/notifications/templateHelpers.js:884-944` | monto guardado por volumen, ignora IVA manual | NO | **vivo** (email/PDF) |
| FE-hub | `shared/services/ventas/payment.service.ts` (`checkPriceScale:198`, `checkIVAPrice:285`) | acepta `Pedido \| POSPedido` | overrides SÍ, categoría SÍ, `tierSinIva` robusto | **vivo** — usado por cotizaciones y POS. Candidato a punto único FE |
| FE-otros | `carrito`, `checkout`, `pedidos.util.service`, `cotizacion-editor`, `list`, `orden-venta` | varias copias | mixto | **vivos** — deben delegar al hub |

### POS = copia paralela de venta asistida (FE)
`pos/pos-carrito`, `pos/pos-checkout`, `pos/pos-service/pos-pedidos.util.service.ts`, `pos/factura-tirilla` (tirilla impresa), `shared/services/ventas/pos-checkout.service.ts`, `pos/pos-catalogo/...`. Comparten el problema; deben consumir el mismo punto único.

### Facturación electrónica / push externos — CLASIFICACIÓN VERIFICADA (lee vs calcula)
> Verificado por lectura 2026-06-25. Reduce el alcance: la mayoría **lee** el total persistido y se corrige sola en Fase C.

| Módulo | Lee/Calcula | ¿Cambio? |
|---|---|---|
| `osmosis-order-create.action.js` (push Cereza) | **Lee** `totalPedididoConDescuento`/`subtotal+totalImpuesto` (164-169); `precioUnitarioIva` solo bandera `taxable` (258-261) | **No** |
| `osmosisOrderService.js` | **Lee** total (264-270); `taxable` (384-386) | **No** |
| `services/shopify/mappers/order.js` | **Calcula desde `item.tax_lines` de Shopify** (inbound, impuestos externos) | **No** (fuente externa) |
| `services/woocommerce/mappers/order.js` | **Lee `wooOrder.total_tax`** (inbound) | **No** (fuente externa) |
| `notifications/templates/components/totals.js` | Plantilla `{{totalImpuestoFormateado}}` | **No** (solo muestra) |
| `shared/services/tools/order-tools-registrar.service.ts` (IA) | Recalcula vía `pedidosUtilService.checkIVAPrice()` (1142, 2277, 2578) | **No aparte** — va con Fase D (pedidos.util) |
| `worldOfficeDataMapper.js` + FE `facturacion.service.ts` | **Lee** total (`tax: totalImpuesto`, 562); pero mapea **% por línea desde `precioUnitarioIva` BASE** (`extractTaxPercentage` 99-103; `getTaxeByProduct` 168-170) → ignora `_ivaManualOverride`/categoría | **Sí, chico** (Fase F): usar tarifa **efectiva** por línea |
| `templateHelpers.js` / `emailTemplates.js` / `notificationHooks.js` (email) | **Recalcula** (copia propia) | **Sí** (Fase F) |

**Conclusión:** WooCommerce/Shopify/Osmosis **NO se tocan** (inbound usa impuestos del sistema externo; outbound solo lee el total). Único cambio de integración real = factura electrónica usar la tarifa efectiva por línea. Lo demás (cálculo de pedido FE/BE + email) ya estaba contemplado.

### Agentes IA que crean pedidos (FE)
`shared/services/tools/order-tools-registrar.service.ts`, `gemini-audio.service.ts`, `katuq-quickstart.service.ts`.

### Escritores de los campos del producto (CAUSA de la incoherencia — prevención, fuera de scope directo)
`productos/crear-productos`, `lista-precios/editar-precio-volumen`, `lista-precios/editar-precio-unitario`, `services/flows/nodes/internal/katuq-product-upsert.action.js`, mappers de producto Shopify/Osmosis/Woo. Aquí se generan los `valorUnitarioPorVolumenIva` etc. que luego no cuadran.

### Solo LECTORES de `totalImpuesto` (NO requieren cambio si lo persistido es correcto)
Analytics restantes, `services/reports/*`, tools IA de ventas (`getSalesToday`, `getTopProducts`, `getOrderAnalytics`…), columnas de listados. **Excepción:** `analytics.js` hoy RE-calcula (BE-2) en vez de leer → debe pasar a confiar en el persistido.

## E. Impacto / zonas de alto riesgo al tocar
- `orderCalculationService.js` afecta create + edit + list + métricas + POS + fulfillment (CLAUDE.md: orders/inventory alto impacto). Cambios requieren tests de contrato FE↔BE.
- Datos legacy sin `valorUnitarioPorVolumenSinIVA` pueden además tener `conIVA` inconsistente → derivación necesita guardas.
- Retirar BE-2/BE-3/BE-4 cambia números en analytics y email → validar contra el persistido antes de mergear.
