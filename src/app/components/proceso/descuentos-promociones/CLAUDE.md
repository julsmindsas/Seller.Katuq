# Descuentos y Promociones — Bitácora de trabajo

> Sesiones: **2026-07-15** (MVP end-to-end) · **2026-07-16** (Feature A: enforcement "Aplica a")
> Rama (ambos repos): `feature/descuentos-promociones`
> Repos: `Seller.Katuq` (frontend Angular) + `katuq_admin_back_firebase` (backend Node/Express/Firestore)

Este documento resume TODO lo trabajado hoy en el módulo Descuentos y Promociones:
qué se implementó, los cambios por archivo, las decisiones tomadas y lo pendiente.

---

## 1. Estado del módulo (antes vs después)

**Antes de la sesión:**
- CRUD admin ya existía (front + back): crear/editar/listar/desactivar + `getRedenciones`.
- Faltaba: aplicar el código en el checkout, registrar la redención, y la UI del carrito.

**Después de la sesión (completo end-to-end):**
- ✅ Checkout: validar y aplicar código (`aplicar-codigo`).
- ✅ Registrar redención al crear la orden (incrementa usos, auto-agota).
- ✅ UI del carrito de ventas para ingresar el código.
- ✅ Selector dependiente de categoría/producto en el modal de creación.
- ✅ Estado "Redimido" + modal de historial de redenciones.

---

## 2. Colecciones Firestore

- `descuentosPromociones` — los códigos/descuentos (por `company`).
- `redencioneDescuentos` — historial de usos. Doc id determinístico
  `${ordenId}_${descuentoId}` (idempotencia: una orden no duplica redención).

---

## 3. Backend (`katuq_admin_back_firebase/functions/`)

### 3.1 `controllers/descuentosPromociones.js`
- **`aplicarCodigo`** (nuevo) — endpoint de checkout. Valida: activo, vigencia de
  fechas, límite global (`limiteUsos` vs `usosActuales`), límite por cliente
  (consulta `redencioneDescuentos`), monto mínimo, combinabilidad. Calcula
  `montoDescuento` por tipo. **No escribe** (solo lectura). Aislado por tenant.
- **`create`** — ahora persiste el *target de aplicación* según `aplicaA`:
  `categoriaNombre` (si `categoria`) ó `productoId/productoNombre/productoReferencia`
  (si `producto_especifico`). Informativo (no se valida en checkout).

### 3.2 `routers/descuentosPromociones.js`
- Nueva ruta `POST /aplicar-codigo` (con `auth` + Swagger).
- Montado en `index.js:632` → `/v1/descuentos-promociones`.

### 3.3 `services/descuentosService.js` (NUEVO)
- **`registrarRedencion`** — al confirmar la orden, en UNA transacción Firestore:
  1. Escribe historial en `redencioneDescuentos` (doc id determinístico → idempotente).
  2. Incrementa `usosActuales`.
  3. Auto-desactiva (`activo: false`) si alcanzó `limiteUsos`.
  - Guarda además `detalleOrden` denormalizado: `nroPedido`, `clienteNombre`,
    `totalOrden`, `productos: [{titulo, cantidad}]` (para el historial del admin).
  - No bloqueante: los errores se loguean, no se propagan.

### 3.4 `controllers/orders.js`
- `require` de `registrarRedencion`.
- Enganche **no bloqueante** en `exports.create`, justo tras persistir la orden.
  Dispara solo si `order.descuentoAplicado.descuentoId` existe. Arma el
  `detalleOrden` desde `order` (cliente, carrito, totales, nroPedido).

---

## 4. Frontend (`Seller.Katuq/src/app/`)

### 4.1 Servicios
- `shared/services/ventas/ventas.service.ts` → **`aplicarCodigoDescuento(payload)`**
  = `POST /v1/descuentos-promociones/aplicar-codigo`.
- `shared/services/maestros/maestro.service.ts` → ya tenía `consultarRedenciones`,
  `getCategorias`, `quickSearchProducts` (reusados).

### 4.2 Modelo
- `components/ventas/modelo/pedido.ts` → interface **`DescuentoAplicado`** + campo
  `descuentoAplicado?` en `Pedido` (viaja en `order` a `/orders/create`).

### 4.3 Carrito de ventas
- `components/ventas/carrito/carrito.component.ts`
  - `validarCuponYAplica()` reescrito: usa el módulo nuevo (reemplaza el flujo
    legacy `validateCupon`/colección `cupones`).
  - `aplicarResultadoDescuento()`: mapea el tipo →
    - `porcentaje` → `pedido.porceDescuento` (backend recalcula).
    - `valor_fijo` → `pedido.totalDescuento` (monto fijo).
    - `envio_gratis` → sin descuento de producto (el cero del envío es follow-up).
  - `quitarDescuento()`.
  - Guarda `pedido.descuentoAplicado` para que el backend registre la redención.
- `carrito.component.html`: input con estado "Validando...", chip del código
  aplicado + botón quitar, línea de descuento con el código.
- `carrito.component.scss`: estilos del estado aplicado.

### 4.4 Modal crear/editar descuento (Punto 1)
- `descuentos-promociones/crear-descuento-promocion/crear-descuento-promocion.component.ts`
  - Carga y **aplana** el árbol de categorías (`parse` de `flatted` → `{nombre, path}`).
  - **Typeahead de productos** (`Subject` + `switchMap` → `quickSearchProducts`, mapeado
    a `{cd, titulo, referencia}`).
  - Validación condicional (categoría/producto requeridos según `aplicaA`) y limpieza
    del target al cambiar la opción. Prealimenta el producto al editar.
- `crear-descuento-promocion.component.html`
  - `ng-select` de categoría (`bindLabel="path"`, `bindValue="nombre"`).
  - `ng-select` de producto (`[typeahead]`, `[minTermLength]="2"`, template con
    título + referencia).

### 4.5 Lista + historial (Punto 2)
- `descuentos-promociones.component.ts`
  - `fueRedimido(row)` (usa `usosActuales > 0`).
  - `verHistorial(row)` → abre el modal de historial.
- `descuentos-promociones.component.html`
  - Badge **"Redimido (N)"** en la columna Estado.
  - Nueva columna **Historial** con botón que abre el modal.
- `historial-redenciones/` (**NUEVO** componente modal: ts + html + scss)
  - Llama `consultarRedenciones(descuentoId)`; tabla: fecha · cliente · pedido #·
    descontado · total pedido · productos comprados. Maneja Timestamp Firestore e ISO.
- `proceso.module.ts`: declara `HistorialRedencionesComponent`.

---

## 5. Contrato entre frontend y backend

El carrito, tras validar el código, adjunta a la orden:
```ts
order.descuentoAplicado = {
  descuentoId, codigoPersonalizado, tipo, valor, montoDescuento, clienteId
}
```
Sin ese objeto, la orden se crea igual (100% retrocompatible). El backend usa
`descuentoAplicado.descuentoId` para registrar la redención.

---

## 6. Decisiones tomadas (2026-07-15)

- **Aplicar-código vive en el módulo de descuentos**, NO en `orders.js`. Solo lee
  colecciones de descuento; no toca inventario/360.
- **Redención se registra al CREAR la orden** (MVP). Riesgo asumido: en ventas
  online con link de pago, un código con límite se consume aunque el cliente no
  pague. Endurecer con gate `estadoPago=Pagado` / webhook de pasarela = follow-up.
- **Producto específico = 1 solo producto** (no lista).
- ~~**"Aplica a" es informativo** — se guarda pero NO se valida en checkout.~~
  **SUPERSEDED (2026-07-16, Feature A):** ahora SÍ se aplica solo a la
  categoría/producto objetivo. Ver sección 9.
- **Historial en modal** al hacer clic (no row-expansion).

---

## 7. Commits (rama `feature/descuentos-promociones`)

| Repo | Hash | Descripción |
|------|------|-------------|
| backend | `63a82c4` | checkout aplicar-codigo + registrarRedencion |
| frontend | `711efdd5` | integrar código de descuento en carrito de ventas |
| backend | `8a5eb31` | target de aplicación + detalle de orden en redención |
| frontend | `60a72950` | selector de categoría/producto + historial de redenciones |
| backend | `ce425b2` | (Feature A) enforcement de "Aplica a" en aplicar-codigo |
| frontend | `efcef55b` | (Feature A) carrito envía items para enforcement de "Aplica a" |

Los builds de Angular pasaron con **exit 0** en cada tanda. Commits **locales**
(sin push al momento de escribir esto).

---

## 8. Pendientes / follow-ups

- **Deploy backend** (EC2/PM2, sin hot-reload): `git pull && cd functions &&
  npm install && pm2 restart katuq-api`. Sin esto, las redenciones nuevas no
  capturan `detalleOrden` (el modal las muestra igual, con "—" en productos).
- **Push** de ambas ramas cuando se apruebe (incluye ahora los commits de Feature A
  `ce425b2` backend / `efcef55b` frontend — sin push todavía).
- Cero real del costo de envío para `envio_gratis` en el checkout.
- ✅ ~~Enforcement de `aplicaA` en checkout~~ → **HECHO (Feature A, 2026-07-16)**. Ver sección 9.
- **Feature B (pendiente, no iniciado):** promociones automáticas de catálogo
  (producto ya rebajado sin código). Requiere: modelo/CRUD (código vs promoción),
  precio promocional en catálogo, aplicación automática en checkout y regla de
  acumulación código+promoción. Es desarrollo nuevo y más grande.
- (Opcional) Gate de pago para la redención en ventas online.
- Zona horaria en vigencia: `aplicarCodigo` compara `hoy` en UTC → off-by-~5h en
  bordes de medianoche vs America/Bogota. Y porcentaje sin tope 100%. Menores, no
  bloquean (hallados en revisión pre-deploy 2026-07-16).

---

## 9. Sesión 2026-07-16 — Feature A: enforcement de "Aplica a"

**Requerimiento (del grupo):** que un código con `aplicaA = categoria` o
`producto_especifico` descuente **solo** los ítems elegibles del carrito, no todo.
Antes "Aplica a" se guardaba pero no se validaba (ver decisión SUPERSEDED en §6).

### 9.1 Backend — `controllers/descuentosPromociones.js` → `aplicarCodigo`
- Acepta un nuevo campo `items` en el body: `[{ productoReferencia, categorias, precioLinea }]`.
- Calcula la **base elegible** según `aplicaA`:
  - `todos_los_productos` → base = `totalCarrito` (comportamiento previo).
  - `producto_especifico` → suma de `precioLinea` de líneas cuya `productoReferencia`
    coincide con `descuento.productoReferencia` (case-insensitive).
  - `categoria` → suma de `precioLinea` de líneas cuyo array `categorias` incluye
    `descuento.categoriaNombre` (pertenencia, case-insensitive).
- Si el código es dirigido y `baseAplicada <= 0` → **HTTP 400** con mensaje claro
  ("Este código aplica solo a … y no tienes esos productos en el carrito").
- `montoDescuento` se calcula **sobre `baseAplicada`**, no sobre el total.
- La respuesta agrega `aplicaA` y `baseAplicada` (contexto para el frontend).
- **Retrocompatible:** sin `items`, cae al total del carrito.
- El chequeo de `montoMinimo` sigue evaluándose sobre el total del carrito (a propósito).

### 9.2 Frontend
- `shared/services/ventas/ventas.service.ts` → `aplicarCodigoDescuento` ahora envía `items`.
- `components/ventas/carrito/carrito.component.ts`:
  - `construirItemsCarrito()` — arma las líneas reusando el cálculo de precio de
    `getTotalProductPriceInCart` (base + adiciones + preferencias) × cantidad.
  - `resolverCategoriasProducto(prod)` — extrae nombres de categoría del producto,
    tolerante al formato (string `flatted` / JSON / objeto); recorre `data.nombre`
    / `nombre` / `label` y `children`. Import: `parse as flattedParse` de `flatted`.
  - **Corrección clave en `aplicarResultadoDescuento`:** un código **dirigido**
    (`res.aplicaA !== 'todos_los_productos'`) se mapea como **monto fijo ya
    calculado** (`porceDescuento=0`, `totalDescuento=monto`). Así el backend de
    órdenes (`orderCalculationService.js`, rama `else`) aplica exactamente ese monto
    y NO lo recalcula como % sobre TODO el subtotal (que sobre-aplicaría).

### 9.3 Decisión de diseño
- **Resolución de categorías en el FRONTEND** (que ya conoce el árbol y parsea
  `flatted`), backend hace solo un chequeo de pertenencia por string. Evita lecturas
  extra de Firestore en el checkout y no depende de parsear `flatted` en el server.
- `producto_especifico` matchea por `referencia` (100% confiable). `categoria`
  matchea por nombre; si un producto no trae `categorias`, esa línea no cuenta como
  elegible (seguro/explícito: no sobre-descuenta).

### 9.4 No se tocó
- `orders.js`, `services/descuentosService.js` (redención) ni el contrato de la orden.
  Feature A reusa la rama de monto fijo existente.

### 9.5 Verificación
- `node --check` backend OK · Angular `Compiled successfully` · backend local
  reiniciado (puerto 3300), `aplicar-codigo` responde 401 (montado). Prueba
  end-to-end en navegador quedó lista para correr (front apuntando a localhost:3300).

## 10. Feature B — Promociones automáticas de catálogo (2026-07-22)

**Objetivo:** descuentos automáticos SIN código — el producto aparece ya rebajado
en el catálogo y se aplica solo en el checkout. Contrario a los códigos (Feature A),
que el cliente debe escribir.

### 10.1 Decisiones cerradas con el usuario
- **D-B1** — Modelo por **discriminador** `naturaleza: 'codigo' | 'promocion'` en la
  MISMA colección `descuentosPromociones` (no colección aparte). Reutiliza CRUD,
  validaciones y vigencia.
- **D-B2** — **No acumulable:** un código NO descuenta sobre ítems que ya tienen
  precio promocional (Fase 4).
- **D-B3** — MVP solo **POS / venta asistida** (no toca 360 Woo/Shopify).
- **D-B4** — Una promoción solo admite `tipo` **porcentaje** o **valor_fijo** (no envío gratis).
- **D-B5** — Una promoción siempre apunta a **categoría** o **producto_especifico**
  (no `todos_los_productos` / store-wide).

### 10.2 Fase 1 — Modelo + CRUD (backend) — HECHO
`controllers/descuentosPromociones.js`:
- **`create`** acepta `naturaleza` (default `'codigo'`, retrocompatible). Si
  `'promocion'`: no exige `codigoPersonalizado`, salta la unicidad de código, y
  valida D-B4/D-B5 + target obligatorio (categoriaId o productoId). Persiste
  `naturaleza`; en promociones fuerza a null los campos de código
  (`codigoPersonalizado`, `limiteUsos`, `limiteUsosPorCliente`, `montoMinimo`) y
  `combinable=false`.
- **`getAll`** normaliza `naturaleza` (legacy sin campo → `'codigo'`) y admite filtro
  opcional `?naturaleza=codigo|promocion` (en memoria, sin índices nuevos).
- **`edit`** — `naturaleza` es **inmutable** (`delete resto.naturaleza`): no se puede
  convertir un código en promoción ni al revés.
- Verificación: `node -c` OK; 6/6 casos de rechazo (mock req/res, sin escribir a
  Firestore) PASS (D-B4, D-B5, target requerido, campos requeridos); backend
  reiniciado limpio en :3300.

### 10.3 Fase 1 — Form admin (frontend) — HECHO
- **`crear-descuento-promocion.component.ts`**: `@Input naturaleza` ('codigo'|'promocion');
  getters `esPromocion`, `tiposDisponibles` (sin envío gratis en promo, D-B4),
  `aplicaADisponibles` (sin "todos" en promo, D-B5); control `naturaleza` en el form;
  `configurarComoPromocion()` quita el required del código, lo pone null y fuerza
  tipo/aplicaA válidos; al editar la naturaleza se lee del registro (inmutable).
  Mensajes de éxito dicen "promoción" según el modo.
- **`crear-descuento-promocion.component.html`**: título dinámico; banner info del modo
  promoción; oculta con `*ngIf="!esPromocion"` el campo Código, Límite global, Monto
  mínimo, Límite por cliente y Combinable; selects usan `tiposDisponibles`/`aplicaADisponibles`.
- **`descuentos-promociones.component.ts`**: `openCrearModal(naturaleza)` pasa la naturaleza al modal.
- **`descuentos-promociones.component.html`**: 2º botón "Crear Promoción" (btn-info, icono tag);
  la columna Código muestra badge "Promoción automática" cuando `row.naturaleza==='promocion'`.
- Verificación: `ng serve` AOT `Compiled successfully` (15 builds, 0 errores), front HTTP 200.
  Prueba end-to-end en navegador PENDIENTE (bloqueada por credenciales de login).

### 10.4 Fase 2 — Precio promocional en catálogo (backend) — HECHO
- **NUEVO `services/productPromoHelper.js`** (espejo de `productStockHelper`):
  - `obtenerPromocionesVigentes(company)` → lee `descuentosPromociones` con
    `naturaleza='promocion' + activo=true` (SOLO igualdad, sin índice compuesto);
    filtra vigencia por fechas en memoria; indexa en 2 Maps: `porProducto` (cd) y
    `porCategoria` (categoriaNombre.toLowerCase()).
  - `aplicarPromocion(producto, indice)` → match por `producto.cd` (prioridad) o por
    categoría; setea `precioPromocional` + `promocionAplicada` {promocionId, nombre,
    tipo, valor, aplicaA, precioBase}. Solo enriquece si el precio realmente baja.
  - `calcularPrecioPromocional(base, promo)` → % o valor_fijo, redondea a entero, piso 0.
  - `extraerCategoriasProducto(prod)` → replica la extracción del índice de búsqueda
    (`JSON.parse` tolerante de `producto.categorias`, `[1].label`/`.label`).
  - `enrichProductsWithPromos(products, company)` → punto de entrada; nunca rompe el
    catálogo (ante error devuelve productos intactos); retrocompatible.
- **Enganchado** en ambos endpoints del catálogo, justo tras `enrichProductsWithStock`:
  - `controllers/productosPaginated.js` (`getAllByFilterPaginated`, ~línea 730).
  - `controllers/productos.js` (`quickSearch`, ~línea 2395).
- Precio base usado: `precio.precioUnitarioConIva` (con IVA, canónico para display).
- Verificación: `node -c` OK en los 3 archivos; **17/17** casos de lógica pura PASS
  (cálculo %/valor_fijo, extracción de categoría, match producto/categoría + prioridad,
  sin-match intacto); backend reiniciado limpio en :3300.
- Contrato para el frontend: cada producto puede traer `precioPromocional` (número) y
  `promocionAplicada`. Si NO vienen, no hay promo → pintar precio normal (retrocompatible).

### 10.5 Fase 2 — Precio tachado en catálogo (frontend) — HECHO
- **`shared/models/productos/Producto.ts`**: campos opcionales `precioPromocional?: number`
  y `promocionAplicada?: PromocionAplicada` (nueva interfaz exportada).
- **`ventas/catalogo/ecomerce-products/ecomerce-products.component.ts`**:
  - `getPrecioParaMostrar()` reescrito con jerarquía: precio por categoría de cliente >
    precio promocional automático (Feature B) > precio estándar.
  - NUEVO `tienePrecioPromocional(producto)` → true si `precioPromocional` es número y
    menor que `precio.precioUnitarioConIva`.
- **`ecomerce-products.component.html`** (card, ~línea 399): el precio tachado ahora
  aparece si `tienePrecioCategoria || tienePrecioPromocional`; badge rojo `.promo-badge`
  con `-N%` (porcentaje) u "OFERTA" (valor_fijo).
- **`ecomerce-products.component.scss`**: estilo `.promo-badge` (tamaño/peso).
- Verificación: `ng serve` AOT recompiló el módulo de ventas `Compiled successfully`
  (valida el acceso a los campos nuevos en el template). Prueba visual PENDIENTE
  (requiere login — ya desbloqueado — y crear una promoción de prueba).

### 10.6 Fase 3 — Aplicación automática en checkout (backend) — HECHO
**Decisión de diseño:** `calculateOrderTotals` se deja SÍNCRONO (se invoca en ~8 sitios;
volverlo async era riesgoso). Las promos se pre-aplican a las líneas ANTES de recalcular.
- **`services/productPromoHelper.js`**:
  - `buscarPromocionParaProducto(producto, indice)` (extraído del match: cd > categoría).
  - `calcularPrecioLineaPromocional(producto, promo)` → precio unitario en sus 2 bases;
    porcentaje aplica % a ambas; valor_fijo resta el monto al precio CON IVA (igual que el
    catálogo, Fase 2) y deriva el sin-IVA con la tasa de la línea. Devuelve null si no baja.
  - `aplicarPromocionesACarrito(carrito, company)` (async) → setea en cada línea elegible
    `_precioPromocional` (unitario SIN IVA) + `_promocionAplicada` {promocionId, nombre, tipo,
    valor, bases}. Respeta `_precioManualOverride` explícito (no lo pisa). Nunca lanza.
- **`services/orderCalculationService.js`** (money path):
  - `getSubTotalPedido` y `getTotalImpuesto` ahora PREFIEREN `_precioPromocional` cuando está
    presente (override de base y de volumen — no se acumulan). El IVA% del producto se mantiene.
  - Retrocompatible: sin el flag, el cálculo es idéntico al anterior (probado).
- **`controllers/orders.js`** (`exports.create`, ~línea 4705): `await aplicarPromocionesACarrito(
  newOrderData.carrito, newOrderData.company)` ANTES de `calculateOrderTotals`. La promo se
  CONGELA en la orden (snapshot) → recalcular después usa el precio guardado, no la promo vigente.
- Verificación: `node -c` OK en los 3 archivos; **17/17** casos del money path PASS (IVA 19%):
  sin promo intacto (119.000), promo % → 95.200 (=119.000×0.8, coincide catálogo), valor_fijo
  equivalente, cantidad ×2, y promo+código (apila — lo restringe Fase 4). Backend reiniciado limpio.
- **Pendiente Fase 3 frontend:** el carrito de venta asistida (`PaymentService`) debería aplicar
  la misma promo para que el total mostrado al vendedor coincida con el que persiste el backend.

### 10.7 Fase 4 — No acumulación código+promo (backend) — HECHO (D-B2)
Un código NO descuenta sobre líneas que ya tienen promoción automática.
- **`services/orderCalculationService.js`** (autoritativo):
  - `getSubTotalPedido(pedido, {excluirPromocionados})` — nueva opción que salta las líneas
    con `_precioPromocional`.
  - `calculateOrderTotals` — el descuento de código se calcula sobre `baseDescontable`
    (= subtotal SIN líneas en promo). `porceDescuento` aplica sobre esa base; el descuento
    fijo (`totalDescuento`) se **capa** a esa base.
  - `getTotalImpuesto` — `factorDesc = lineaEnPromo ? 1 : (1 - porceDescuento)`: el IVA de una
    línea en promo NO recibe el descuento de código (producto + adiciones + preferencias).
- **`controllers/descuentosPromociones.js`** (`aplicarCodigo`, preview): los ítems marcados
  `enPromocion===true` se excluyen de la base en los 3 modos (producto/categoría/todos).
  Retrocompatible: sin el flag, comportamiento igual que antes.
- Verificación: `node -c` OK; **22/22** money-path PASS (incluye: solo-promo→descuento 0 y
  total intacto; carrito mixto→código solo sobre la línea normal, IVA 32.300; fijo capado;
  regresión sin promo idéntica). Backend reiniciado.
- **Pendiente Fase 4 frontend:** `carrito.component` (`construirItemsCarrito`) debe enviar
  `enPromocion: !!producto.precioPromocional` por ítem a `aplicar-codigo` para que el
  descuento PREVIEW del carrito coincida con el que persiste el backend.

### 10.8 Fase 3 + 4 — Frontend del carrito de venta asistida — HECHO
- **`components/ventas/carrito/carrito.component.ts`**:
  - `tienePromo(producto)` → true si `precioPromocional` (número) < `precio.precioUnitarioConIva`.
  - `checkPriceScale()` (precio unitario CON IVA) ahora devuelve `producto.precioPromocional`
    cuando hay promo y no hay precio por categoría de cliente. Precedencia: override manual >
    precio por categoría > promoción. Esto arregla de golpe precio por línea, subtotal
    (`getTotalProductPriceInCart`) y `precioLinea` de `construirItemsCarrito` (todos usan checkPriceScale).
  - `construirItemsCarrito()` ahora envía `enPromocion: this.tienePromo(producto)` por ítem (Fase 4 front).
- **`carrito.component.html`** (bloque `#soloIvaEditable`): precio original tachado + badge rojo
  (`-N%` / "OFERTA") cuando `tienePromo`.
- **`shared/services/ventas/ventas.service.ts`**: el tipo de `items` en `aplicarCodigoDescuento`
  incluye `enPromocion?: boolean`.
- **`shared/services/ventas/payment.service.ts`** (resumen/factura): `tienePromoLinea(producto)`;
  `checkPriceScale` (subtotal sin IVA) deriva el sin-IVA = `precioPromocional/(1+iva)`; `checkIVAPrice`
  usa `precioPromocional` como precio con IVA de la línea. Ambos como capa tras el precio por categoría.
- Verificación: `ng serve` AOT `Compiled successfully` (módulo de ventas + servicios recompilados, 0 errores).
- **Gap menor conocido (solo display frontend):** en `checkIVAPrice`, si se aplica un código % (`porceDescuento`)
  Y hay una línea en promo simultáneamente, el desglose de IVA del front aún multiplica esa línea por
  `(1 - porceDescuento)` (acumularía en el DISPLAY). El BACKEND ya lo excluye (autoritativo), así que la
  orden persistida es correcta; es solo una diferencia visual en ese caso combinado. Follow-up: aplicar
  `factorDesc` por línea en `checkIVAPrice` como en `orderCalculationService`.

### 10.9 Feature B — estado
- **Fases 1–4: COMPLETAS backend + frontend.** Todo compila; backend con 45 casos unit PASS.
- **PENDIENTE:** prueba end-to-end en navegador (login ya arreglado): crear promo → verla en
  catálogo (tachado) → agregar al carrito (precio promo + badge) → checkout aplica promo →
  un código no acumula sobre esa línea.
- Nada commiteado aún (a la espera de autorización del usuario).
- **Fase 3:** aplicación automática en `orderCalculationService` (checkout POS).
- **Fase 4:** regla de no acumulación (D-B2) — excluir líneas en promo de la base
  elegible de un código.
