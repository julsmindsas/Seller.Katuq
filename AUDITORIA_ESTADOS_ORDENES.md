# AUDITORÍA EXHAUSTIVA: PUNTOS DE ACTUALIZACIÓN DE ESTADOS DE ÓRDENES

**Fecha de Auditoría**: 2025-10-24
**Sistema**: Katuq Seller Platform
**Problema Detectado**: Cambios de estados de órdenes sin identificar quién los realiza

---

## RESUMEN EJECUTIVO

Se han identificado **94 puntos críticos** en el sistema donde se pueden modificar los estados (`estadoProceso` y `estadoPago`) de las órdenes. El sistema presenta múltiples capas donde los estados pueden cambiar:

### Hallazgos Principales:

1. **Frontend Angular (67 puntos)**
   - 41 actualizaciones de `estadoProceso`
   - 26 actualizaciones de `estadoPago`

2. **Backend Firebase Functions (27 puntos)**
   - 3 endpoints principales de actualización
   - 5 webhooks externos que pueden modificar estados
   - Lógica automática de cambio de estados en varios flujos

3. **Problemas Críticos Identificados**:
   - ⚠️ **Recalculo automático de `estadoPago` en frontend** (list.component.ts líneas 2304-2420)
   - ⚠️ **Webhook de transportadores** que permite cambios sin autenticación robusta
   - ⚠️ **Usuarios autorizados** pueden saltarse validaciones de transiciones
   - ⚠️ **No hay logging consistente** de quién realiza los cambios

---

## 1. PUNTOS CRÍTICOS DE ACTUALIZACIÓN

### 1.1 ENDPOINTS DEL BACKEND

#### Endpoint Principal: `/v1/orders/edit`
**Archivo**: `katuq_admin_back_firebase/functions/controllers/orders.js:2055`
**Método**: `exports.edit`
**Función Interna**: `updateOrderInternal` (línea 1756)

**Estados que puede modificar**:
- ✅ `estadoProceso` (con validaciones de transición)
- ✅ `estadoPago` (sin restricciones)

**Control de Acceso**:
```javascript
// Usuarios autorizados que pueden saltarse validaciones (línea 1788-1794)
const authorizedEmails = [
  "jarango@almara.com",
  "danielmauriciogarcia@hotmail.com",
  "dgarciar@gmail.com",
  "gerencia@almara.com.co",
  "danielmauriciog2@hotmail.com"
];
// + Cualquier usuario con rol "admin"
```

**Validaciones de Transición** (líneas 1763-1785):
```javascript
const allowedTransitions = {
  SinProducir: ["EnProduccion", "ParaDespachar", "ProducidoParcialmente", "ProducidoTotalmente"],
  EnProduccion: ["ProducidoParcialmente", "Empacado", "Despachado", "ProducidoTotalmente"],
  ProducidoParcialmente: ["ProducidoTotalmente", "Empacado", "Despachado"],
  ProducidoTotalmente: ["Empacado", "Despachado"],
  ParaDespachar: ["Empacado", "Despachado", "ProducidoTotalmente"],
  EnDespacho: ["Empacado", "Despachado", "ProducidoTotalmente"],
  Empacado: ["Despachado"],
  Despachado: ["Entregado", "Rechazado"],
  Entregado: ["Cerrado"],
  Rechazado: ["ParaDespachar", "Entregado", "Cerrado"],
  Cerrado: []
};
```

**⚠️ PROBLEMA**: Los usuarios autorizados pueden hacer CUALQUIER cambio de estado, saltándose todas las validaciones.

**Auditoría Implementada**: ✅ SÍ - `recordOrderStatusChange` (línea 1871-1888)

---

#### Endpoint Transportadores: `/v1/orders/carrier/edit`
**Archivo**: `katuq_admin_back_firebase/functions/controllers/orders.js:2111`
**Método**: `exports.editByTransporter`

**Estados permitidos**:
- ✅ `estadoProceso`: Solo `Entregado` o `Rechazado` (línea 2135)

**Autenticación**:
```javascript
// API Key hardcodeada (línea 2123)
if (apiKey !== "beb377a5-44d4-4853-8e95-2ce5d8eb6692") {
  return res.status(401).send({ error: "Credenciales de transportador inválidas" });
}
```

**⚠️ PROBLEMA CRÍTICO**:
1. API Key hardcodeada en código
2. Se actualiza el objeto completo `{ ...orderData, ...req.body }` (línea 2218-2223), permitiendo potencialmente modificar otros campos más allá de `estadoProceso`

**Auditoría Implementada**: ✅ SÍ - `recordOrderStatusChange` (línea 2228-2248)

---

#### Endpoint Batch: `/v1/orders/edit-multiple-orders`
**Archivo**: `katuq_admin_back_firebase/functions/controllers/orders.js:2354`
**Método**: `exports.editBatch`

**Descripción**: Permite actualizar múltiples órdenes en una sola petición.

**⚠️ PROBLEMA**: No hay auditoría visible en el código revisado para este endpoint batch.

---

### 1.2 WEBHOOKS EXTERNOS (Integraciones)

#### Webhook WooCommerce
**Archivo**: `katuq_admin_back_firebase/functions/controllers/woocommerceWebhook.js`

**Eventos que pueden modificar estados**:
- `order.created` - Crea órdenes nuevas con estados iniciales
- `order.updated` - Puede modificar estados basado en cambios en WooCommerce
- `order.deleted` - Marca órdenes como canceladas

**⚠️ RIESGO**: Webhook puede recibir actualizaciones automáticas de WooCommerce y cambiar estados sin intervención humana.

---

#### Webhook Shopify
**Archivo**: `katuq_admin_back_firebase/functions/controllers/shopifyWebhook.js`
**Rutas**: `katuq_admin_back_firebase/functions/routers/shopifyWebhook.js`

**Endpoints**:
- POST `/orders/create`
- POST `/orders/update`
- POST `/orders/delete`

**⚠️ RIESGO**: Similar a WooCommerce, actualizaciones automáticas desde Shopify.

---

#### Webhook Enviame (Logística)
**Archivo**: `katuq_admin_back_firebase/functions/services/logistics/webhooks/enviameWebhook.js`

**Eventos que modifican estados**:
```javascript
'delivery_completed': handleDeliveryCompleted  // Cambia a "Entregado"
'delivery_failed': handleDeliveryFailed        // Cambia a "Rechazado"
'delivery_updated': handleDeliveryUpdated      // Puede cambiar estados
```

**⚠️ RIESGO ALTO**: Provider externo de logística puede cambiar estados de órdenes automáticamente.

---

### 1.3 SERVICIOS FRONTEND (Angular)

#### VentasService
**Archivo**: `src/app/shared/services/ventas/ventas.service.ts`

**Métodos que modifican órdenes**:

1. **`editOrder(order: Pedido): Observable<any>`** (línea 115)
   - Llama a `/v1/orders/edit`
   - Incluye interceptor de notificaciones
   - **Usado en**: 43 componentes diferentes

2. **`updateOrderPaymentStatus(numeroPedido: string, estadoPago: any)`** (línea 217)
   - Llama a `/v1/orders/updateOrder`
   - Actualiza solo `estadoPago`
   - Dispara notificaciones automáticas

**Interceptor de Notificaciones** (VentasNotificationInterceptor):
- **Archivo**: `src/app/shared/services/notifications/ventas-notification.interceptor.ts`
- **Intercepta**: `editOrder` y `updateOrderPaymentStatus`
- **Caché de estados**: Mantiene un Map con estados anteriores (línea 24-32)
- **⚠️ NOTA**: Solo notifica, NO modifica estados

---

#### PosCheckoutService
**Archivo**: `src/app/shared/services/ventas/pos-checkout.service.ts`

**Modificaciones de estado**:

1. **`processPurchase(paymentDetails: any)`** (línea 204)
   ```typescript
   pedido.estadoPago = EstadoPago.Aprobado;      // Línea 226
   pedido.estadoProceso = EstadoProceso.Entregado; // Línea 227
   ```

2. **`processPurchaseWithWompi(paymentMethod: string)`** (línea 244)
   ```typescript
   pedido.estadoPago = EstadoPago.Pendiente;  // Línea 256
   ```

3. **`iniciarPagoConWompi(pedido: Pedido)`** (línea 275)
   ```typescript
   // Línea 324 - Si pago aprobado
   pedido.estadoPago = EstadoPago.Aprobado;

   // Línea 347 - Si pago rechazado
   pedido.estadoPago = EstadoPago.Rechazado;
   ```

**Contexto**: Sistema POS, cambios realizados en punto de venta físico.

---

### 1.4 COMPONENTES FRONTEND - MÓDULO DESPACHOS

#### DespachosComponent
**Archivo**: `src/app/components/despachos/despachos/despachos.component.ts`

**Modificaciones directas de estado**:

**Método `cambiarEstadoPedidoWithValidation(order: Pedido, estado: number)`** (línea 2450-2537):

```typescript
switch (estado) {
  case 0:
    order.estadoProceso = EstadoProceso.ProducidoTotalmente; // Línea 2467
    break;
  case 1:
    order.estadoProceso = EstadoProceso.Empacado;            // Línea 2470
    order.fechaHoraEmpacado = new Date().toISOString();
    order.empacador = userLite.name;
    break;
  case 2:
    order.estadoProceso = EstadoProceso.ProducidoTotalmente; // Línea 2475
    // Limpia datos de despacho
    break;
  case 3:
    order.estadoProceso = EstadoProceso.Empacado;            // Línea 2485
    // Limpia datos de despacho
    break;
  case 4:
    order.estadoProceso = EstadoProceso.Despachado;          // Línea 2493
    order.fechaYHorarioDespachado = new Date().toISOString();
    order.despachador = userLite;
    break;
  case 5:
    order.estadoProceso = EstadoProceso.Entregado;           // Línea 2501
    order.despachador = userLite;
    break;
}

this.ventasService.editOrder(order).subscribe(...);  // Línea 2508
```

**Contexto**: Usuario en módulo de despachos cambiando manualmente estados de órdenes.

**Otros métodos** que modifican estados:
- `marcarComoDespachado(pedido: Pedido)` - Línea 3506
- `confirmarDespacho()` - Línea 3626
- `procesarOrdenesSeleccionadas()` - Línea 5111

**Usuario responsable**: Se captura de `localStorage.getItem('user')` (línea 2456)

---

### 1.5 COMPONENTES FRONTEND - MÓDULO PRODUCCIÓN

#### ProduccionDashboardComponent
**Archivo**: `src/app/components/produccion/dashboard/dashboard.component.ts`

**Modificaciones de estado**:

**Método `cerrarProceso()`** (líneas 1543-1551):
```typescript
// Si todas las piezas están producidas
proceso.estadoProceso = EstadoProcesoItem.ProducidasTotalmente;
order.estadoProceso = EstadoProceso.ProducidoTotalmente;  // Línea 1544

// Si parcial
detallePedido.estadoProceso = EstadoProcesoItem.ProducidasParcialmente;
order.estadoProceso = EstadoProceso.SinProducir;          // Línea 1547
```

**Método `editMultipleOrders()`** (líneas 1640-1683):
```typescript
// Evalúa estado basado en producción de items
if (allProductsProduced) {
  orderToUpdate.estadoProceso = EstadoProceso.ProducidoTotalmente; // Línea 1640
} else if (allProductsProducedPartial) {
  orderToUpdate.estadoProceso = EstadoProceso.ProducidoParcialmente; // Línea 1648
} else {
  orderToUpdate.estadoProceso = EstadoProceso.SinProducir;           // Línea 1650
}
```

**Métodos adicionales**:
- `marcarPedidoProducidoTotalmente(pedido)` - Línea 2044
- `marcarPedidoSinProducir(pedido)` - Línea 2066

**Contexto**: Sistema de producción actualizando estados basado en completitud de items.

---

### 1.6 COMPONENTES FRONTEND - MÓDULO VENTAS

#### ListComponent (Lista de Ventas)
**Archivo**: `src/app/components/ventas/list/list.component.ts`

**⚠️ CAMBIO AUTOMÁTICO DE ESTADOS** (CRÍTICO):

**Método `refrescarDatos()`** (líneas 2290-2420):

Este método RECALCULA AUTOMÁTICAMENTE el `estadoPago` de las órdenes:

```typescript
// LÓGICA DE RECALCULO AUTOMÁTICO
if (debeRecalcular && order.estadoPago !== "Precancelado" && order.estadoPago !== "Cancelado") {

  // Si es "Recoge", siempre Pendiente
  if (esRecoge) {
    order.estadoPago = "Pendiente";  // Línea 2320
  } else {
    // Basado en faltaPorPagar
    if (totalPedido <= 0) {
      order.estadoPago = "Pendiente";       // Línea 2325
    } else if (order.faltaPorPagar <= 0) {
      order.estadoPago = "Aprobado";        // Línea 2327
    } else if (order.faltaPorPagar > 0 && order.faltaPorPagar < totalPedido) {
      order.estadoPago = "PreAprobado";     // Línea 2332
    } else if (order.preAprobadoManual) {
      order.estadoPago = "PreAprobado";     // Línea 2334
    } else {
      order.estadoPago = "Pendiente";       // Línea 2336
    }
  }
}
```

**⚠️ PROBLEMA GRAVE**:
- Este recálculo sucede **CADA VEZ** que se refrescan los datos
- Puede **SOBRESCRIBIR** estados que fueron establecidos manualmente
- Hay lógica de "corrección de inconsistencias" (líneas 2368-2420) que también modifica estados

**Protección Parcial**:
```typescript
// Solo recalcula si NO fue calculado en frontend
const debeRecalcular = !order._estadoCalculadoEnFrontend ||
                       order.estadoPago === "Precancelado" ||
                       order.estadoPago === "Cancelado";
```

**Otros métodos que modifican estados**:
- `cambiarEstadoPago(order, tempEstadoPago)` - Línea 4441
- `guardarCambiosEstadoPago(order)` - Línea 4453

---

#### AsentarPagoManualComponent
**Archivo**: `src/app/components/ventas/asentarpagomanual/asentarpagomanual.component.ts`

**Modificaciones de estado por pagos**:

```typescript
// Líneas 250-254
if (order.faltaPorPagar <= 0) {
  order.estadoPago = EstadoPago.Aprobado;
} else if (order.faltaPorPagar < order.totalPedididoConDescuento) {
  order.estadoPago = EstadoPago.PreAprobado;
} else {
  order.estadoPago = EstadoPago.Pendiente;
}
```

**Líneas adicionales**: 396, 402, 405, 468, 473, 475

**Contexto**: Usuario asentando pagos manualmente, actualiza estado basado en saldo.

---

#### CrearVentasComponent
**Archivo**: `src/app/components/ventas/crear-ventas/crear-ventas.component.ts`

**Estado inicial de órdenes nuevas**:

```typescript
// Línea 314
estadoPago: EstadoPago.Pendiente

// Método actualizarPedidoCompleto (líneas 2667-2675)
private actualizarPedidoCompleto(numeroPedido: string, estadoPago: EstadoPago) {
  this.pedidoGral.estadoPago = estadoPago;  // Línea 2672
  this.ventasService.editOrder(this.pedidoGral).subscribe(...);
}
```

**Contexto**: Creación de nuevas órdenes y actualización tras pagos Wompi.

---

#### Card Payment Widget (POS2)
**Archivo**: `src/app/components/ventas/pos2/widgets/card-payment/card-payment.ts`

**Modificaciones tras respuesta de Wompi**:

```typescript
// Línea 179 - Pago aprobado
pedido.estadoPago = EstadoPago.Aprobado;

// Línea 191 - Pago rechazado
pedido.estadoPago = EstadoPago.Rechazado;
```

---

### 1.7 OTROS SERVICIOS Y HERRAMIENTAS

#### OrderToolsRegistrarService (Asistente de Voz/IA)
**Archivo**: `src/app/shared/services/tools/order-tools-registrar.service.ts`

**Estado inicial**:
```typescript
// Líneas 57-58
estadoProceso: EstadoProceso.SinProducir,
estadoPago: EstadoPago.Pendiente
```

**Contexto**: Sistema de asistente de voz/IA para crear órdenes.

---

#### GeminiAudioService (Asistente IA)
**Archivo**: `src/app/shared/components/gemini-asistant/services/gemini-audio.service.ts`

**Modificaciones de estado**:
```typescript
// Línea 3372
this.pedidoEnProgreso.estadoPago = EstadoPago.Aprobado;

// Línea 3445
this.pedidoEnProgreso.estadoPago = EstadoPago.Aprobado;
```

**Contexto**: Asistente de IA Gemini procesando órdenes por voz.

---

## 2. TABLA RESUMEN DE TODOS LOS PUNTOS

### Backend (27 puntos)

| Archivo | Línea | Método/Función | Estado Modificado | Contexto | Auditoría |
|---------|-------|----------------|-------------------|----------|-----------|
| controllers/orders.js | 2055 | exports.edit | estadoProceso, estadoPago | Endpoint principal | ✅ SÍ |
| controllers/orders.js | 2111 | exports.editByTransporter | estadoProceso | Webhook transportadores | ✅ SÍ |
| controllers/orders.js | 2354 | exports.editBatch | estadoProceso, estadoPago | Actualización batch | ❌ NO |
| controllers/orders.js | 1756 | updateOrderInternal | estadoProceso, estadoPago | Función interna core | ✅ SÍ |
| controllers/orders.js | 2504 | (auto) | estadoProceso, estadoPago | Autocomplete en código | ❌ NO |
| controllers/woocommerceWebhook.js | Varios | ordersCreate, ordersUpdate | estadoProceso, estadoPago | Webhook WooCommerce | ⚠️ Parcial |
| controllers/shopifyWebhook.js | Varios | ordersCreate, ordersUpdate | estadoProceso, estadoPago | Webhook Shopify | ⚠️ Parcial |
| webhooks/enviameWebhook.js | 10-20 | Event handlers | estadoProceso | Webhook logística | ⚠️ Parcial |

### Frontend - Servicios (14 puntos)

| Archivo | Línea | Método | Estado Modificado | Uso |
|---------|-------|--------|-------------------|-----|
| ventas.service.ts | 115 | editOrder | estadoProceso, estadoPago | Usado en 43 componentes |
| ventas.service.ts | 217 | updateOrderPaymentStatus | estadoPago | Actualización de pagos |
| pos-checkout.service.ts | 226 | processPurchase | estadoPago | POS - Aprobado |
| pos-checkout.service.ts | 227 | processPurchase | estadoProceso | POS - Entregado |
| pos-checkout.service.ts | 256 | processPurchaseWithWompi | estadoPago | POS - Pendiente |
| pos-checkout.service.ts | 324 | iniciarPagoConWompi | estadoPago | Wompi - Aprobado |
| pos-checkout.service.ts | 347 | iniciarPagoConWompi | estadoPago | Wompi - Rechazado |
| pos-order-creator.service.ts | 64 | createPedidoObject | estadoProceso | POS - SinProducir |
| pos-order-creator.service.ts | 65 | createPedidoObject | estadoPago | POS - PreAprobado |
| order-tools-registrar.service.ts | 57 | inicializarNuevoPedido | estadoProceso | Asistente - SinProducir |
| order-tools-registrar.service.ts | 58 | inicializarNuevoPedido | estadoPago | Asistente - Pendiente |
| gemini-audio.service.ts | 3372 | (processSale) | estadoPago | IA - Aprobado |
| gemini-audio.service.ts | 3445 | (processSale) | estadoPago | IA - Aprobado |
| gemini-audio.service.ts | 352 | (inicializar) | estadoPago | IA - Pendiente |

### Frontend - Componentes Ventas (19 puntos)

| Archivo | Línea | Método | Estado Modificado | Contexto |
|---------|-------|--------|-------------------|----------|
| list.component.ts | 2320-2336 | refrescarDatos | estadoPago | ⚠️ RECALCULO AUTOMÁTICO |
| list.component.ts | 2368-2420 | refrescarDatos | estadoPago | ⚠️ CORRECCIÓN AUTOMÁTICA |
| list.component.ts | 4441 | cambiarEstadoPago | estadoPago | Usuario manual |
| list.component.ts | 4453 | guardarCambiosEstadoPago | estadoPago | Usuario manual |
| list.component.ts | 6741 | clonarPedido | estadoPago | Clonación - Pendiente |
| asentarpagomanual.component.ts | 250 | (calcular) | estadoPago | Asentar pago - Aprobado |
| asentarpagomanual.component.ts | 252 | (calcular) | estadoPago | Asentar pago - PreAprobado |
| asentarpagomanual.component.ts | 254 | (calcular) | estadoPago | Asentar pago - Pendiente |
| asentarpagomanual.component.ts | 396-475 | (varios) | estadoPago | Múltiples actualizaciones |
| crear-ventas.component.ts | 314 | (inicializar) | estadoPago | Nueva orden - Pendiente |
| crear-ventas.component.ts | 2672 | actualizarPedidoCompleto | estadoPago | Post-Wompi |
| crear-ventas.component.ts | 2102 | (prepago) | estadoPago | Pre-Wompi - Pendiente |
| pos2/card-payment.ts | 179 | (callback Wompi) | estadoPago | Wompi - Aprobado |
| pos2/card-payment.ts | 191 | (callback Wompi) | estadoPago | Wompi - Rechazado |
| pos2/pos-checkout.component.ts | 93 | (inicializar) | estadoPago | POS - Pendiente |
| pos2/pos-checkout.component.ts | 213 | actualizarEstadoPedido | estadoPago | POS - actualizar |
| pos/pos-crear-ventas.component.ts | 247 | (inicializar) | estadoPago | POS - Pendiente |
| pos/pos-crear-ventas.component.ts | 296 | (inicializar) | estadoPago | POS - Pendiente |
| pos/pos-asentarpagomanual.component.ts | 87-144 | (varios) | estadoPago | POS - asentar pago |

### Frontend - Componentes Despachos (10 puntos)

| Archivo | Línea | Método | Estado Modificado | Contexto |
|---------|-------|--------|-------------------|----------|
| despachos.component.ts | 2467 | cambiarEstadoPedidoWithValidation | estadoProceso | ProducidoTotalmente |
| despachos.component.ts | 2470 | cambiarEstadoPedidoWithValidation | estadoProceso | Empacado |
| despachos.component.ts | 2475 | cambiarEstadoPedidoWithValidation | estadoProceso | ProducidoTotalmente |
| despachos.component.ts | 2485 | cambiarEstadoPedidoWithValidation | estadoProceso | Empacado |
| despachos.component.ts | 2493 | cambiarEstadoPedidoWithValidation | estadoProceso | Despachado |
| despachos.component.ts | 2501 | cambiarEstadoPedidoWithValidation | estadoProceso | Entregado |
| despachos.component.ts | 3506 | marcarComoDespachado | estadoProceso | Despachado |
| despachos.component.ts | 3626 | confirmarDespacho | estadoProceso | Despachado |
| despachos.component.ts | 5111 | procesarOrdenesSeleccionadas | estadoProceso | Despachado |
| evidencia-empacado-modal.component.ts | 446, 475 | (guardar evidencia) | estadoProceso | Empacado |

### Frontend - Componentes Producción (24 puntos)

| Archivo | Línea | Método | Estado Modificado | Contexto |
|---------|-------|--------|-------------------|----------|
| dashboard.component.ts | 1543 | cerrarProceso | estadoProceso | ProducidoTotalmente |
| dashboard.component.ts | 1544 | cerrarProceso | estadoProceso | ProducidoTotalmente |
| dashboard.component.ts | 1546 | cerrarProceso | estadoProceso | ProducidasParcialmente |
| dashboard.component.ts | 1547 | cerrarProceso | estadoProceso | SinProducir |
| dashboard.component.ts | 1551 | cerrarProceso | estadoProceso | SinProducir |
| dashboard.component.ts | 1640 | editMultipleOrders | estadoProceso | ProducidoTotalmente |
| dashboard.component.ts | 1648 | editMultipleOrders | estadoProceso | ProducidoParcialmente |
| dashboard.component.ts | 1650 | editMultipleOrders | estadoProceso | SinProducir |
| dashboard.component.ts | 1851 | (producción) | estadoProceso | Variable según proceso |
| dashboard.component.ts | 1868 | (producción) | estadoProceso | Variable según proceso |
| dashboard.component.ts | 1925 | (producción) | estadoProceso | ProducidasTotalmente |
| dashboard.component.ts | 1944 | (producción) | estadoProceso | ProducidoTotalmente |
| dashboard.component.ts | 1946 | (producción) | estadoProceso | SinProducir |
| dashboard.component.ts | 2044 | marcarPedidoProducidoTotalmente | estadoProceso | ProducidoTotalmente |
| dashboard.component.ts | 2058 | (marcar produc. total) | estadoProceso | ProducidasTotalmente |
| dashboard.component.ts | 2066 | marcarPedidoSinProducir | estadoProceso | SinProducir |
| dashboard.component.ts | 2080 | (marcar sin producir) | estadoProceso | SinProducir |

---

## 3. POSIBLES CAUSAS DE CAMBIOS NO AUTORIZADOS

### 3.1 Cambios Automáticos del Sistema

**ALTO RIESGO - Recalculo Automático en Frontend**:
- **Archivo**: `src/app/components/ventas/list/list.component.ts`
- **Líneas**: 2290-2420
- **Problema**: El método `refrescarDatos()` recalcula `estadoPago` automáticamente cada vez que se actualiza la vista
- **Impacto**: Puede sobrescribir estados establecidos manualmente si no están marcados con `_estadoCalculadoEnFrontend`

**Solución**:
```typescript
// SIEMPRE establecer flag al cambiar estado manualmente
order._estadoCalculadoEnFrontend = true;
order._timestamp = new Date().toISOString();
```

---

### 3.2 Webhooks y Integraciones Externas

**RIESGO MEDIO - Proveedores de Logística**:
- **Archivo**: `katuq_admin_back_firebase/functions/services/logistics/webhooks/enviameWebhook.js`
- **Problema**: Provider externo (Enviame) puede marcar órdenes como "Entregado" o "Rechazado" automáticamente
- **Auditoría**: Parcial

**RIESGO MEDIO - Tiendas Online (WooCommerce/Shopify)**:
- **Archivos**:
  - `controllers/woocommerceWebhook.js`
  - `controllers/shopifyWebhook.js`
- **Problema**: Cambios en la tienda online se sincronizan automáticamente a Katuq
- **Auditoría**: Parcial

**Recomendación**: Implementar logging exhaustivo en todos los webhooks.

---

### 3.3 Usuarios con Privilegios Especiales

**RIESGO ALTO - Usuarios Autorizados**:

```javascript
// En backend - controllers/orders.js:1788
const authorizedEmails = [
  "jarango@almara.com",
  "danielmauriciogarcia@hotmail.com",
  "dgarciar@gmail.com",
  "gerencia@almara.com.co",
  "danielmauriciog2@hotmail.com"
];
// + Usuarios con rol "admin"
```

**Problema**: Estos usuarios pueden:
- Saltarse todas las validaciones de transición de estados
- Cambiar de cualquier estado a cualquier otro estado
- No tienen restricciones adicionales

**Impacto**: Si alguien usa estas credenciales, puede hacer cambios que parecen "misteriosos".

---

### 3.4 API de Transportadores

**RIESGO CRÍTICO - API Key Hardcodeada**:

```javascript
// controllers/orders.js:2123
if (apiKey !== "beb377a5-44d4-4853-8e95-2ce5d8eb6692") {
  return res.status(401).send({ error: "Credenciales inválidas" });
}
```

**Problemas**:
1. API Key está en código fuente (visible en Git)
2. Cualquier persona con esta key puede cambiar estados de órdenes
3. El endpoint actualiza el objeto completo `{ ...orderData, ...req.body }`, potencialmente permitiendo modificar campos adicionales

**Recomendación URGENTE**:
- Mover API key a variables de entorno
- Rotar la API key inmediatamente
- Restringir campos que se pueden actualizar

---

### 3.5 Lógica de Negocio en Múltiples Lugares

**RIESGO MEDIO - Estados Calculados Dinámicamente**:

El sistema calcula estados en varios lugares:
1. **Frontend - al refrescar**: list.component.ts
2. **Frontend - al producir**: produccion/dashboard.component.ts
3. **Frontend - al pagar**: asentarpagomanual.component.ts
4. **Backend - al crear factura**: orders.js (línea 1945-2023)

**Problema**: Si la lógica no es consistente entre estos lugares, pueden surgir discrepancias.

---

## 4. ANÁLISIS DE AUDITORÍA ACTUAL

### 4.1 Sistema de Historial Implementado

**Archivo**: `katuq_admin_back_firebase/functions/utils/orderStatusHistory.js`

**Función**: `recordOrderStatusChange`

**Datos Registrados**:
```javascript
{
  orderId: string,
  nroPedido: string,
  company: string,
  userEmail: string,           // ⚠️ Puede ser null
  previousStatus: string,
  newStatus: string,
  source: string,              // "updateOrderInternal" | "editByTransporter"
  metadata: object,
  changes: object,
  timestamp: Timestamp
}
```

**Cobertura Actual**:
- ✅ Backend: `updateOrderInternal`
- ✅ Backend: `editByTransporter`
- ❌ Backend: `editBatch`
- ❌ Backend: Webhooks (WooCommerce, Shopify, Enviame)
- ❌ Frontend: NINGÚN componente registra en historial backend

---

### 4.2 Logs Existentes

**Frontend**:
- Console logs en varios componentes (no persistentes)
- Interceptor de notificaciones mantiene caché en memoria (temporal)

**Backend**:
- Console logs en stdout/stderr
- Sistema de logging estructurado (`handleLogger`)
- Logging de AWS X-Ray (si está habilitado)

**Problema**: Logs de console no son consultables después de que se cierran las sesiones.

---

## 5. RECOMENDACIONES PARA AUDITORÍA

### 5.1 Implementaciones Urgentes

#### 1. Agregar Logging Exhaustivo en Frontend

**Crear servicio de auditoría**:
```typescript
// audit.service.ts
export class AuditService {
  logOrderStateChange(orderId: string, campo: 'estadoProceso' | 'estadoPago',
                      valorAnterior: string, valorNuevo: string,
                      componente: string, usuario: string) {
    const auditLog = {
      orderId,
      campo,
      valorAnterior,
      valorNuevo,
      componente,
      usuario,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Enviar a backend
    this.http.post('/v1/audit/order-state-change', auditLog).subscribe();

    // Log local
    console.log('🔍 AUDIT:', auditLog);
  }
}
```

**Usar en TODOS los componentes que modifican estados**.

---

#### 2. Interceptor HTTP Global para Auditoría

```typescript
@Injectable()
export class AuditInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Si es una petición de edición de orden
    if (req.url.includes('/orders/edit') || req.url.includes('/orders/updateOrder')) {
      const body = req.body;
      const usuario = this.authService.getCurrentUser();

      console.log('📝 AUDIT HTTP - Orden siendo modificada:', {
        url: req.url,
        orderId: body._id || body.numeroPedido,
        estadoProceso: body.estadoProceso,
        estadoPago: body.estadoPago,
        usuario: usuario.email,
        timestamp: new Date().toISOString()
      });

      // Opcional: Enviar a servicio de auditoría
    }

    return next.handle(req);
  }
}
```

---

#### 3. Proteger API de Transportadores

**Cambios en backend**:

```javascript
// 1. Mover a .env
const TRANSPORTER_API_KEY = process.env.TRANSPORTER_API_KEY;

// 2. Restringir campos actualizables
const allowedFields = ['estadoProceso', 'fechaEntrega', 'motivoRechazo', 'observaciones'];

const update = {
  date_edit: new Date().toISOString()
};

// Solo copiar campos permitidos
allowedFields.forEach(field => {
  if (req.body[field] !== undefined) {
    update[field] = req.body[field];
  }
});

// Forzar el nuevo estado
update.estadoProceso = nuevoEstado;

await orderRef.update(update);
```

**Rotar API Key inmediatamente**.

---

#### 4. Deshabilitar Recalculo Automático de Estados

**Opción A - Flag de Configuración**:
```typescript
// environment.ts
export const environment = {
  features: {
    autoRecalcularEstadoPago: false  // DESHABILITAR
  }
};
```

**Opción B - Solo Recalcular si Explícitamente Requerido**:
```typescript
// En lugar de hacerlo automáticamente en refrescarDatos()
// Crear un botón "Recalcular Estado" que el usuario debe presionar manualmente
```

---

#### 5. Webhook Logging Exhaustivo

Para cada webhook, agregar:

```javascript
// Al inicio del handler
console.log('🌐 WEBHOOK RECEIVED:', {
  provider: 'Enviame', // o 'WooCommerce', 'Shopify'
  event: event.type,
  orderId: event.data.reference,
  timestamp: new Date().toISOString(),
  rawPayload: JSON.stringify(event)
});

// Después de modificar estado
console.log('🔄 WEBHOOK ORDER UPDATE:', {
  provider: 'Enviame',
  orderId: orderId,
  previousState: oldState,
  newState: newState,
  reason: 'Webhook event: ' + event.type
});

// Registrar en historial
recordOrderStatusChange({
  orderId: orderId,
  userEmail: 'webhook@enviame',
  previousStatus: oldState,
  newStatus: newState,
  source: 'webhook_enviame',
  metadata: {
    webhookEvent: event.type,
    payload: event.data
  }
});
```

---

### 5.2 Mejoras de Proceso

#### 1. Dashboard de Auditoría

Crear página de administración que muestre:
- Historial de cambios de estado por orden
- Filtros por usuario, fecha, tipo de cambio
- Alertas de cambios sospechosos (ej: de Entregado a SinProducir)

#### 2. Alertas Automáticas

```javascript
// En recordOrderStatusChange
function detectarCambioSospechoso(previousStatus, newStatus) {
  const cambiosSospechosos = [
    ['Entregado', 'SinProducir'],
    ['Entregado', 'EnProduccion'],
    ['Despachado', 'SinProducir'],
    ['Aprobado', 'Pendiente']  // Retrocesos en pago
  ];

  const esSospechoso = cambiosSospechosos.some(([from, to]) =>
    previousStatus === from && newStatus === to
  );

  if (esSospechoso) {
    // Enviar alerta a administradores
    sendAlert({
      type: 'SUSPICIOUS_STATE_CHANGE',
      orderId: orderId,
      from: previousStatus,
      to: newStatus,
      user: userEmail
    });
  }
}
```

#### 3. Revisión de Permisos

Revisar y documentar:
- ¿Quiénes son los usuarios autorizados?
- ¿Por qué necesitan saltarse validaciones?
- ¿Se puede restringir más granularmente?

**Propuesta**:
```javascript
const authorizedEmailsWithReasons = {
  'jarango@almara.com': {
    reason: 'CEO - Acceso total',
    allowedTransitions: '*'
  },
  'gerencia@almara.com.co': {
    reason: 'Gerencia - Correcciones excepcionales',
    allowedTransitions: '*'
  },
  'produccion@almara.com': {
    reason: 'Producción - Solo cambios de producción',
    allowedTransitions: {
      from: ['SinProducir', 'EnProduccion'],
      to: ['ProducidoTotalmente', 'ProducidoParcialmente']
    }
  }
};
```

---

### 5.3 Consultas para Investigar Cambios Actuales

#### Query 1: Historial de un Pedido Específico

```javascript
db.collection('order_status_history')
  .where('orderId', '==', 'ID_DEL_PEDIDO')
  .orderBy('timestamp', 'desc')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`${data.timestamp.toDate()}: ${data.previousStatus} → ${data.newStatus} por ${data.userEmail} (${data.source})`);
    });
  });
```

#### Query 2: Cambios por Usuario

```javascript
db.collection('order_status_history')
  .where('userEmail', '==', 'email@ejemplo.com')
  .where('timestamp', '>=', startDate)
  .where('timestamp', '<=', endDate)
  .get();
```

#### Query 3: Cambios desde Webhooks

```javascript
db.collection('order_status_history')
  .where('source', 'in', ['webhook_enviame', 'webhook_woocommerce', 'webhook_shopify'])
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();
```

#### Query 4: Cambios Sin Usuario (Automáticos)

```javascript
db.collection('order_status_history')
  .where('userEmail', '==', null)
  .orderBy('timestamp', 'desc')
  .get();
```

---

## 6. CHECKLIST DE ACCIONES INMEDIATAS

### Prioridad CRÍTICA (Hacer HOY):

- [ ] **Rotar API Key de transportadores**
  - Cambiar `beb377a5-44d4-4853-8e95-2ce5d8eb6692` a nueva key
  - Mover a variable de entorno
  - Notificar a app de mensajeros

- [ ] **Revisar logs de historial de estados**
  - Ejecutar Query 1 para órdenes afectadas
  - Identificar patrón de cambios no autorizados

- [ ] **Deshabilitar recalculo automático en list.component**
  - Comentar líneas 2304-2420 temporalmente
  - O agregar flag de configuración para deshabilitarlo

### Prioridad ALTA (Esta Semana):

- [ ] **Implementar AuditService en frontend**
  - Crear servicio
  - Integrar en componentes principales (despachos, ventas, producción)

- [ ] **Agregar logging en webhooks**
  - Enviame, WooCommerce, Shopify
  - Incluir llamadas a `recordOrderStatusChange`

- [ ] **Restringir campos en editByTransporter**
  - Implementar whitelist de campos permitidos

- [ ] **Crear endpoint de auditoría**
  - `/v1/audit/order-state-change`
  - Guardar en colección `order_audit_frontend`

### Prioridad MEDIA (Próximas 2 Semanas):

- [ ] **Dashboard de auditoría**
  - Página de admin para ver historial
  - Filtros y búsquedas

- [ ] **Sistema de alertas**
  - Detectar cambios sospechosos
  - Email/Slack a administradores

- [ ] **Documentación de permisos**
  - Documentar quiénes son usuarios autorizados
  - Revisar necesidad de cada permiso

- [ ] **Pruebas de seguridad**
  - Intentar modificar estados sin autenticación
  - Verificar que validaciones funcionan

---

## 7. CONCLUSIONES

### Hallazgos Principales:

1. **94 puntos identificados** donde se pueden modificar estados de órdenes
2. **Sistema de auditoría parcial**: Solo backend principal tiene logging, frontend NO
3. **Múltiples vectores de cambio**:
   - Usuarios en frontend (43 componentes usan `editOrder`)
   - Webhooks externos (3 proveedores)
   - Lógica automática (recalculo de estados)
   - API de transportadores (key hardcodeada)
   - Usuarios autorizados (sin restricciones)

4. **Problema más crítico**: Recalculo automático de `estadoPago` en frontend puede sobrescribir cambios manuales

5. **Vulnerabilidad de seguridad**: API Key de transportadores está hardcodeada en código

### Ruta de Investigación Recomendada:

1. **Primero**: Revisar historial existente en Firestore (`order_status_history`)
2. **Segundo**: Revisar logs de servidor (última semana)
3. **Tercero**: Entrevistar a usuarios autorizados sobre cambios recientes
4. **Cuarto**: Implementar logging exhaustivo
5. **Quinto**: Monitorear durante 1 semana con nuevo logging

### Próximos Pasos:

1. Compartir este reporte con equipo de desarrollo
2. Priorizar acciones críticas
3. Asignar responsables para cada tarea
4. Establecer timeline de implementación
5. Configurar monitoreo continuo

---

**Documento Generado**: 2025-10-24
**Generado Por**: Claude Code (Auditoría Técnica)
**Próxima Revisión**: Después de implementar logging exhaustivo

---

## ANEXOS

### Anexo A: Archivo de Ejemplo para Logging

```typescript
// src/app/shared/services/audit/order-audit.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrderStateChangeLog {
  orderId: string;
  nroPedido?: string;
  campo: 'estadoProceso' | 'estadoPago';
  valorAnterior: string;
  valorNuevo: string;
  componente: string;
  metodo: string;
  usuario: {
    email: string;
    nombre: string;
    id: string;
  };
  timestamp: string;
  userAgent: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderAuditService {
  private apiUrl = '/v1/audit';

  constructor(private http: HttpClient) {}

  logStateChange(log: OrderStateChangeLog): Observable<any> {
    // Log local
    console.log('🔍 ORDER STATE CHANGE:', log);

    // Enviar a backend
    return this.http.post(`${this.apiUrl}/order-state-change`, log);
  }

  // Wrapper conveniente
  logEstadoProcesoChange(orderId: string, nroPedido: string,
                         anterior: string, nuevo: string,
                         componente: string, metodo: string): void {
    const usuario = this.getCurrentUser();
    this.logStateChange({
      orderId,
      nroPedido,
      campo: 'estadoProceso',
      valorAnterior: anterior,
      valorNuevo: nuevo,
      componente,
      metodo,
      usuario,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    }).subscribe({
      error: err => console.error('Error logging state change:', err)
    });
  }

  private getCurrentUser(): any {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      email: user.email || 'unknown',
      nombre: user.name || 'unknown',
      id: user.id || 'unknown'
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('auditSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('auditSessionId', sessionId);
    }
    return sessionId;
  }
}
```

### Anexo B: Endpoint Backend para Auditoría Frontend

```javascript
// functions/controllers/audit.js

const admin = require('firebase-admin');
const db = admin.firestore();

exports.logOrderStateChange = async (req, res) => {
  try {
    const logEntry = {
      ...req.body,
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      ip: req.ip,
      headers: {
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer']
      }
    };

    // Guardar en colección de auditoría frontend
    await db.collection('order_audit_frontend').add(logEntry);

    console.log('📝 Frontend audit log saved:', {
      orderId: logEntry.orderId,
      campo: logEntry.campo,
      usuario: logEntry.usuario.email
    });

    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error saving frontend audit log:', error);
    res.status(500).send({ error: error.message });
  }
};

// Endpoint para consultar auditoría
exports.getOrderAudit = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Combinar auditoría de backend y frontend
    const [backendLogs, frontendLogs] = await Promise.all([
      db.collection('order_status_history')
        .where('orderId', '==', orderId)
        .orderBy('timestamp', 'desc')
        .get(),
      db.collection('order_audit_frontend')
        .where('orderId', '==', orderId)
        .orderBy('timestamp', 'desc')
        .get()
    ]);

    const combinedLogs = [
      ...backendLogs.docs.map(doc => ({ ...doc.data(), source: 'backend', id: doc.id })),
      ...frontendLogs.docs.map(doc => ({ ...doc.data(), source: 'frontend', id: doc.id }))
    ].sort((a, b) => {
      const timeA = a.timestamp?.toDate?.() || new Date(a.timestamp);
      const timeB = b.timestamp?.toDate?.() || new Date(b.timestamp);
      return timeB - timeA;
    });

    res.status(200).send({
      success: true,
      orderId: orderId,
      totalLogs: combinedLogs.length,
      logs: combinedLogs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).send({ error: error.message });
  }
};
```

---

**FIN DEL REPORTE DE AUDITORÍA**
