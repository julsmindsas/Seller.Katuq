# Descuentos y Promociones — Bitácora de trabajo

> Sesión: **2026-07-15** · Rama (ambos repos): `feature/descuentos-promociones`
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
- **"Aplica a" es informativo** — se guarda pero NO se valida en checkout (el
  descuento sigue aplicando sobre todo el carrito).
- **Historial en modal** al hacer clic (no row-expansion).

---

## 7. Commits (rama `feature/descuentos-promociones`)

| Repo | Hash | Descripción |
|------|------|-------------|
| backend | `63a82c4` | checkout aplicar-codigo + registrarRedencion |
| frontend | `711efdd5` | integrar código de descuento en carrito de ventas |
| backend | `8a5eb31` | target de aplicación + detalle de orden en redención |
| frontend | `60a72950` | selector de categoría/producto + historial de redenciones |

Los builds de Angular pasaron con **exit 0** en cada tanda. Commits **locales**
(sin push al momento de escribir esto).

---

## 8. Pendientes / follow-ups

- **Deploy backend** (EC2/PM2, sin hot-reload): `git pull && cd functions &&
  npm install && pm2 restart katuq-api`. Sin esto, las redenciones nuevas no
  capturan `detalleOrden` (el modal las muestra igual, con "—" en productos).
- **Push** de ambas ramas cuando se apruebe.
- Cero real del costo de envío para `envio_gratis` en el checkout.
- (Opcional) Enforcement de `aplicaA` en checkout (validar que el carrito
  contenga la categoría/producto y aplicar el descuento solo a esos ítems).
- (Opcional) Gate de pago para la redención en ventas online.
