# Flujo de Ventas con Integración Fulfillment (Aliaddo)

## Regla Fundamental

> **KATUQ ES EL SISTEMA MAESTRO. TODAS LAS VENTAS, ESTADOS, DESPACHOS Y LÓGICA DE NEGOCIO SE MANEJAN EN KATUQ.**
>
> Aliaddo es únicamente un proveedor de almacenamiento físico con una API de inventario. No recibe órdenes, no envía webhooks, no gestiona nada más que el stock físico.

---

## Resumen

Este documento describe el flujo de ventas en Katuq cuando se utiliza una bodega de fulfillment (Aliaddo). El sistema garantiza:

1. **Venta 100% en Katuq** - Toda la lógica de negocio está en Katuq
2. **Descuento de inventario en Katuq** - Primero se descuenta en Firestore
3. **Sincronización de stock con Aliaddo** - Si la bodega es fulfillment, se actualiza el stock en Aliaddo
4. **Sin webhooks** - Aliaddo no notifica nada a Katuq

---

## ¿Qué es Aliaddo para Katuq?

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALIADDO = BODEGA FÍSICA EXTERNA              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Lo que SÍ hace Aliaddo:                                       │
│   ✅ Almacena productos físicamente                             │
│   ✅ Tiene una API para consultar/actualizar stock              │
│   ✅ Permite importar su catálogo de productos                  │
│   ✅ Permite importar sus bodegas/warehouses                    │
│                                                                 │
│   Lo que NO hace Aliaddo (para Katuq):                          │
│   ❌ NO recibe órdenes de venta                                 │
│   ❌ NO envía webhooks                                          │
│   ❌ NO maneja estados de pedido                                │
│   ❌ NO gestiona despachos                                      │
│   ❌ NO notifica nada a Katuq                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA KATUQ + FULFILLMENT                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌───────────┐
│   Angular   │────▶│  Firebase   │────▶│  Inventory      │────▶│  Aliaddo  │
│  Frontend   │     │  Functions  │     │  Service        │     │   API     │
└─────────────┘     └─────────────┘     └─────────────────┘     └───────────┘
                           │                    │
                           │                    │ Solo actualiza stock
                           ▼                    │ (no crea órdenes)
                    ┌─────────────┐             │
                    │  Firestore  │◀────────────┘
                    │  - orders   │
                    │  - inventory│
                    │  - warehouses
                    └─────────────┘

⚠️ NO HAY WEBHOOKS DE ALIADDO → KATUQ
⚠️ NO SE CREAN ÓRDENES EN ALIADDO
```

---

## Flujo Completo de Venta

### Paso 1: Selección de Bodega (Frontend)

El usuario selecciona una bodega en el componente de crear ventas. La bodega puede ser:
- **Bodega propia**: Stock manejado internamente
- **Bodega fulfillment**: Stock físico en Aliaddo

```typescript
// crear-ventas.component.ts
onWarehouseChange(event: Event): void {
  const selected = this.bodegas.find(w => w.idBodega === selectedId);
  this.bodega = selected;
  this.pedidoGral.bodegaId = selected.idBodega;
  localStorage.setItem("warehouse", JSON.stringify(selected));
}
```

### Paso 2: Creación de Orden (Frontend → Backend)

```
Frontend envía POST /v1/orders/create
{
  "order": {
    "nroPedido": "PED-2024-001",
    "bodegaId": "BOD-001",        // ← Bodega seleccionada
    "carrito": [...],
    "cliente": {...},
    "envio": {...}
  },
  "emailHtml": "..."
}
```

### Paso 3: Procesamiento en Backend

```
controllers/orders.js → exports.create
    │
    ├─ [1] Crear orden en Firestore (Katuq)
    │       - Genera nroPedido
    │       - estadoProceso: "SinProducir"
    │       - Guarda en collection 'orders'
    │
    ├─ [2] Descontar inventario en Katuq
    │       inventoryService.updateStock()
    │       ├─ Descuenta en Firestore (inventory)
    │       └─ Registra movimiento (inventoryMovement)
    │
    └─ [3] ¿Bodega es fulfillment?
            │
            ├─ SI (bodega.origenFulfillment === true):
            │   └─ Sincronizar stock con Aliaddo
            │       aliaddoProvider.updateStock()
            │       └─ PUT a API Aliaddo (solo descuento)
            │
            └─ NO:
                └─ (nada más, ya se descontó en Katuq)
```

### Paso 4: Respuesta al Frontend

```javascript
{
  "msg": "Orden creada, inventario actualizado",
  "order": {
    "_id": "order-id-firestore",
    "nroPedido": "PED-2024-001",
    "estadoProceso": "SinProducir",
    "bodegaId": "BOD-001"
  },
  "inventarioStatus": { "success": true }
}
```

### Paso 5: Gestión del Pedido (100% Katuq)

Todo lo demás se maneja completamente en Katuq:

| Proceso | Módulo Katuq | Aliaddo |
|---------|--------------|---------|
| Producción | `/produccion` | ❌ No interviene |
| Empacado | `/produccion` | ❌ No interviene |
| Despacho | `/despachos` | ❌ No interviene |
| Transportadora | Integración propia | ❌ No interviene |
| Tracking | Katuq | ❌ No interviene |
| Entrega | `/despachos` | ❌ No interviene |
| Notificaciones | Katuq | ❌ No interviene |

---

## Configuración de Bodegas

### Campos en Collection `warehouses`

```javascript
{
  "idBodega": "BOD-001",           // Código único en Katuq
  "nombre": "Bodega Aliaddo Central",
  "tipo": "Física",

  // === CAMPOS DE FULFILLMENT ===
  "origenFulfillment": true,       // TRUE = bodega física en Aliaddo
  "fulfillmentId": "uuid-aliaddo", // UUID del warehouse en Aliaddo
  "fulfillmentProvider": "aliaddo", // Nombre del proveedor
  "fulfillmentCode": "ALIADO-01",  // Código del proveedor (opcional)

  // === COBERTURA ===
  "coberturaNacional": true,
  "ciudadesCobertura": [
    { "codigo": "11001", "nombre": "Bogotá", "departamento": "Cundinamarca" }
  ]
}
```

### Diferencia entre Bodegas

| Campo | Bodega Propia | Bodega Fulfillment |
|-------|---------------|-------------------|
| `origenFulfillment` | `false` | `true` |
| `fulfillmentId` | `null` | UUID de Aliaddo |
| `fulfillmentProvider` | `null` | `'aliaddo'` |
| Stock Katuq | ✅ Sí | ✅ Sí |
| Stock Aliaddo | ❌ No | ✅ Sincronizado |
| Al vender | Descuenta Katuq | Descuenta Katuq + Aliaddo |

---

## Interacciones con API Aliaddo

| Operación | Dirección | Descripción |
|-----------|-----------|-------------|
| Importar productos | Aliaddo → Katuq | GET productos, crear en Katuq |
| Importar bodegas | Aliaddo → Katuq | GET warehouses |
| Consultar stock | Aliaddo → Katuq | GET stock actual |
| Sincronizar bodega | Bidireccional | Comparar y ajustar |
| **Venta (descuento)** | **Katuq → Aliaddo** | **PUT stock (descontar)** |

### Endpoints Katuq para Fulfillment

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/v1/fulfillment/import-products` | POST | Importar productos de Aliaddo |
| `/v1/fulfillment/warehouses/{provider}` | GET | Obtener bodegas de Aliaddo |
| `/v1/fulfillment/stock/bulk` | POST | Consultar stock en Aliaddo |
| `/v1/fulfillment/sync-inventory` | POST | Sincronizar producto |
| `/v1/fulfillment/sync-bodega` | POST | Sincronizar bodega completa |
| `/v1/fulfillment/sync-logs` | GET | Ver logs de sincronización |
| `/v1/fulfillment/providers` | GET | Proveedores configurados |

---

## Modelo de Datos

### Pedido (con bodegaId)

```typescript
interface Pedido {
  _id?: string;
  nroPedido?: string;
  bodegaId?: string;              // ← ID de la bodega seleccionada
  cliente?: Cliente;
  carrito?: Carrito[];
  estadoProceso: EstadoProceso;   // ← Manejado 100% por Katuq
  estadoPago: EstadoPago;         // ← Manejado 100% por Katuq
  // ... otros campos
}
```

### Bodega (con campos fulfillment)

```typescript
interface Bodega {
  idBodega: string;
  nombre: string;
  tipo?: string;
  activa?: boolean;

  // Campos fulfillment
  origenFulfillment?: boolean;    // true = bodega en Aliaddo
  fulfillmentId?: string;         // UUID en Aliaddo
  fulfillmentProvider?: string;   // 'aliaddo'
  fulfillmentCode?: string;       // Código original
}
```

---

## Flujo de Sincronización de Stock

Cuando se vende desde una bodega fulfillment:

```
┌─────────────────┐
│  Venta en Katuq │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  1. Descontar stock en Katuq    │
│     (Firestore: inventory)      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  2. ¿bodega.origenFulfillment?  │
└────────┬────────────────────────┘
         │
    ┌────┴────┐
    │   SÍ    │
    └────┬────┘
         │
         ▼
┌─────────────────────────────────┐
│  3. PUT stock a API Aliaddo     │
│     (Actualizar inventario)     │
│                                 │
│  aliaddoProvider.updateStock({  │
│    warehouseId: bodega.fulfillmentId,
│    productId: producto.fulfillmentId,
│    quantity: nuevoStock         │
│  })                             │
└─────────────────────────────────┘
```

---

## Colecciones Firestore

| Collection | Descripción |
|------------|-------------|
| `orders` | Pedidos (con `bodegaId`) |
| `warehouses` | Bodegas (con campos `origenFulfillment`, `fulfillmentId`) |
| `inventory` | Stock por bodega en Katuq |
| `inventoryMovement` | Historial de movimientos |
| `fulfillment_sync_logs` | Logs de sincronización con Aliaddo |

---

## Troubleshooting

### Stock no se sincroniza con Aliaddo

1. Verificar que la bodega tiene `origenFulfillment: true`
2. Verificar que tiene `fulfillmentId` configurado
3. Verificar conexión con API Aliaddo
4. Revisar logs en `fulfillment_sync_logs`

### Diferencia de stock entre Katuq y Aliaddo

1. Usar endpoint `POST /v1/fulfillment/sync-bodega` para sincronizar
2. El stock de Katuq es el "maestro"
3. Aliaddo se actualiza para reflejar Katuq

---

## Diagrama de Secuencia Simplificado

```
┌─────────┐    ┌─────────┐    ┌─────────────┐    ┌─────────┐
│ Usuario │    │ Angular │    │   Backend   │    │ Aliaddo │
└────┬────┘    └────┬────┘    └──────┬──────┘    └────┬────┘
     │              │                │                 │
     │ Crear Venta  │                │                 │
     │─────────────▶│                │                 │
     │              │ POST /orders   │                 │
     │              │───────────────▶│                 │
     │              │                │                 │
     │              │                │ Guardar orden   │
     │              │                │ (Firestore)     │
     │              │                │                 │
     │              │                │ Descontar stock │
     │              │                │ (Katuq)         │
     │              │                │                 │
     │              │                │ ¿Fulfillment?   │
     │              │                │───────┐         │
     │              │                │       │ SÍ      │
     │              │                │       ▼         │
     │              │                │ PUT stock       │
     │              │                │────────────────▶│
     │              │                │                 │
     │              │   Response     │                 │
     │              │◀───────────────│                 │
     │  Confirmación│                │                 │
     │◀─────────────│                │                 │
     │              │                │                 │
     │              │   (Todo lo demás: producción,    │
     │              │    despacho, entrega = KATUQ)    │
```

---

## Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2024-12-22 | 1.0.0 | Documentación inicial |
| 2024-12-23 | 2.0.0 | **CORRECCIÓN MAYOR**: Aliaddo solo maneja inventario, no órdenes. Sin webhooks. Katuq es sistema maestro. |

---

## Referencias

- [Documentación API Aliaddo](https://docs.aliaddo.net)
- `CLAUDE.md` - Documentación general de Katuq
- `src/app/shared/services/fulfillment/fulfillment.service.ts` - Servicio de fulfillment
