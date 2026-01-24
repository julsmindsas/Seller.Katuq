# Bitácora de Integración Siigo - Katuq

## Estado Actual: IDs DE IMPUESTOS CONFIGURABLES
**Última actualización**: 2026-01-23
**Fase**: Funcionalidad Completa + Corrección de IDs de Impuestos

---

## Resumen Ejecutivo
Se implementó el control de facturación electrónica tanto en venta asistida (checkbox) como facturación manual desde la lista de pedidos (botón "Facturar Siigo").

---

## ✅ MEJORA (2026-01-23) - IDs de Impuestos Configurables

### Problema
Al crear facturas en Siigo, los IDs de impuestos estaban hardcodeados como porcentajes (0, 5, 19) en lugar de usar los IDs reales de cada cuenta de Siigo. Esto causaba errores porque Siigo requiere IDs específicos obtenidos de `GET /taxes`.

### Causa Raíz
El `SiigoDataMapper.getTaxId()` usaba el porcentaje como fallback cuando no había configuración. No existía forma de configurar los IDs reales desde el frontend.

### Solución Implementada

#### Frontend - Configuración de Siigo

**`siigo-config.component.ts`**
- Agregados campos `tax0Id`, `tax5Id`, `tax19Id` en `createForm()`
- Agregados en `patchFormWithConfig()` para cargar valores existentes
- Agregados en `saveConfig()` para enviar al backend

**`siigo-config.component.html`**
- Nueva sección "IDs de Impuestos de Siigo" después de configuración contable
- 3 dropdowns con filtro para seleccionar impuestos de `masterData.taxes`
- Cada dropdown corresponde a una tasa: 0% (Excluido), 5%, 19% (IVA General)

**`siigo-config.component.scss`**
- Estilos para `.tax-ids-section`

#### Backend - Uso de IDs Configurados

**`accountingManager.js`** (línea ~912)
```javascript
const invoiceConfig = {
  documentTypeId: ...,
  paymentTypeId: ...,
  costCenterId: ...,
  sellerId: ...,
  // NUEVO: Tax IDs de Siigo
  tax0Id: siigoConfig.tax0Id || null,
  tax5Id: siigoConfig.tax5Id || null,
  tax19Id: siigoConfig.tax19Id || null
};
```

El `SiigoDataMapper.mapOrderToInvoice()` ya estaba preparado para recibir estos IDs mediante el método `getTaxId(percentage, taxConfig)`.

### Archivos Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `siigo-config.component.ts` | Frontend | Campos tax0Id, tax5Id, tax19Id |
| `siigo-config.component.html` | Frontend | Sección con 3 dropdowns de impuestos |
| `siigo-config.component.scss` | Frontend | Estilos .tax-ids-section |
| `accountingManager.js` | Backend | Pasar tax IDs a invoiceConfig |

### Cómo Usar

1. Ir a **Integraciones → Siigo**
2. Conectar con credenciales (probar conexión)
3. En la sección **"IDs de Impuestos de Siigo"**:
   - Seleccionar el impuesto correspondiente a **0%** (Excluido/Exento)
   - Seleccionar el impuesto correspondiente a **5%**
   - Seleccionar el impuesto correspondiente a **19%** (IVA General)
4. Guardar configuración
5. Al facturar desde lista de pedidos, los IDs correctos se usarán automáticamente

### Flujo de Facturación Actualizado

```
list.component.ts (click "Facturar")
        ↓
integrationsService.createSiigoInvoiceFromOrder(orderId)
        ↓
Backend: POST /v1/accounting/siigo/invoices/from-order
        ↓
accountingManager.createInvoiceFromOrder()
        ↓
invoiceConfig incluye { tax0Id, tax5Id, tax19Id }
        ↓
SiigoDataMapper.mapOrderToInvoice(pedido, invoiceConfig)
        ↓
SiigoDataMapper.getTaxId(percentage, invoiceConfig) → ID real de Siigo
        ↓
Factura creada con IDs de impuestos correctos
```

---

## ✅ BUG FIX (2026-01-23) - Configuración desde Modal

### Problema
Al configurar Siigo desde el modal de integraciones (`/integrations`), se enviaba un objeto vacío `{provider: "siigo", config: {}}` al hacer clic en "Probar Conexión" o "Guardar".

### Causa Raíz
El método `buildCredentials()` en `integrations.component.ts` **no tenía un case para 'siigo'**, por lo que retornaba un objeto de credenciales vacío.

### Solución
Se agregó el case para 'siigo' en el método `buildCredentials()`:

```typescript
case 'siigo':
  credentials = {
    username: formData.username,
    accessKey: formData.accessKey,
    partnerId: formData.partnerId || 'Katuq',
    testMode: formData.testMode || false,
    defaultWarehouse: formData.defaultWarehouse,
    defaultCostCenter: formData.defaultCostCenter,
    documentTypeId: formData.documentTypeId,
    defaultPriceList: formData.defaultPriceList || 1,
    defaultTaxRate: formData.defaultTaxRate || 19,
    enableAutoInvoicing: formData.enableAutoInvoicing || false,
    autoSyncInventory: formData.autoSyncInventory || false,
    syncFrequency: formData.syncFrequency || 'manual',
    accountGroup: formData.accountGroup,
    incomeAccount: formData.incomeAccount,
    costAccount: formData.costAccount,
    inventoryAccount: formData.inventoryAccount,
    discountAccount: formData.discountAccount
  };
  break;
```

### Archivo Modificado
| Archivo | Cambio |
|---------|--------|
| `integrations.component.ts` | Agregado case 'siigo' en `buildCredentials()` (línea ~1193) |

### Nota Técnica
El archivo `integration-modal.component.html` es obsoleto. El modal de integraciones usa `IntegrationsComponent` con `integrations.component.html`, que ya tiene campos específicos para Siigo.

---

## ✅ TRABAJO COMPLETADO HOY (2026-01-22) - SESIÓN 2

### Control de Facturación en Venta Asistida

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `pedido-facturacion.component.html` | ✅ MODIFICADO | Activado checkbox "Generar Factura Electrónica (Siigo)" |
| `pedido-facturacion.component.ts` | ✅ MODIFICADO | Agregado @Output `generarFacturaChange` |
| `crear-ventas.component.html` | ✅ MODIFICADO | Conectado evento `(generarFacturaChange)` |
| `crear-ventas.component.ts` | ✅ MODIFICADO | Agregado método `onGenerarFacturaChange()` y campo en `initializePedidoGral()` |

### Facturación Manual desde Lista de Pedidos

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `list.component.ts` | ✅ MODIFICADO | Agregado import `IntegrationsService` |
| `list.component.ts` | ✅ MODIFICADO | Agregado `puedeFacturarSiigo()` - verifica si pedido puede facturarse |
| `list.component.ts` | ✅ MODIFICADO | Agregado `facturarPedidoSiigo()` - muestra confirmación |
| `list.component.ts` | ✅ MODIFICADO | Agregado `ejecutarFacturacionSiigo()` - llama al backend |
| `list.component.ts` | ✅ MODIFICADO | Opción "Facturar Siigo" en menú de 3 puntos |

### Compilación
- ✅ Build exitoso sin errores
- Módulo de ventas: 5.97 MB (lazy loaded)

---

## 🎯 FLUJO DE FACTURACIÓN IMPLEMENTADO

### Opción 1: Automática (al aprobar pago)
1. En configuración Siigo (`/integrations/siigo`), activar "Facturación Automática"
2. Cuando el `estadoPago` cambia a "Aprobado", el backend genera la factura automáticamente
3. La factura se crea en background sin bloquear

### Opción 2: Control por Pedido (checkbox en venta asistida)
1. Al crear pedido en venta asistida, marcar checkbox "Generar Factura Electrónica (Siigo)"
2. El campo `generarFacturaElectronica` se guarda en el pedido
3. El backend respeta esta configuración al aprobar el pago

### Opción 3: Manual (desde lista de pedidos)
1. En lista de pedidos, hacer clic en los 3 puntos de un pedido
2. Si el pedido tiene pago "Aprobado" y no tiene factura, aparece "Facturar Siigo"
3. Confirmar y se genera la factura inmediatamente

---

## ✅ TRABAJO COMPLETADO ANTERIORMENTE (SESIÓN 1)

### Componentes Frontend Creados

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `siigo-config.component.ts` | ✅ CREADO | Componente principal de configuración |
| `siigo-config.component.html` | ✅ CREADO | Template con formularios PrimeNG |
| `siigo-config.component.scss` | ✅ CREADO | Estilos responsivos |
| `siigo-mapping.component.ts` | ✅ CREADO | Sub-componente para mapeo de cuentas |
| `siigo-mapping.component.html` | ✅ CREADO | Template del mapeo |
| `siigo-mapping.component.scss` | ✅ CREADO | Estilos del mapeo |

### Módulo Actualizado
- `integrations.module.ts` - Declaraciones y ruta `/siigo` agregada

---

## 🚀 CÓMO USAR LA INTEGRACIÓN

### Paso 1: Configurar Siigo
```bash
npm start
# Navegar a http://localhost:4200/integrations/siigo
```
1. Ingresar credenciales de Siigo API
2. Probar conexión
3. Configurar bodega, centro de costo, cuentas PUC
4. Guardar configuración

### Paso 2: Usar facturación automática
1. En configuración Siigo, activar "Facturación Automática"
2. Al aprobar pagos, se generan facturas automáticamente

### Paso 3: Usar checkbox en venta asistida
1. Al crear pedido, ir a pestaña "Facturación"
2. Marcar checkbox "Generar Factura Electrónica (Siigo)"
3. Completar pedido normalmente

### Paso 4: Facturar manualmente
1. Ir a lista de pedidos (`/ventas/pedidos`)
2. Buscar pedido con pago aprobado
3. Clic en menú de 3 puntos > "Facturar Siigo"
4. Confirmar generación de factura

---

## 📁 ARCHIVOS MODIFICADOS HOY

```
Seller.Katuq/src/app/components/ventas/
├── facturacion/
│   ├── pedido-facturacion.component.html  (checkbox activado)
│   └── pedido-facturacion.component.ts    (+Output generarFacturaChange)
├── crear-ventas/
│   ├── crear-ventas.component.html        (+evento generarFacturaChange)
│   └── crear-ventas.component.ts          (+método onGenerarFacturaChange)
└── list/
    └── list.component.ts                  (+facturación Siigo en menú)
```

---

## 🔧 BACKEND EXISTENTE (Ya implementado)

### Endpoints Disponibles (`/v1/accounting/siigo/`)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/test` | POST | Probar conexión |
| `/cost-centers` | GET | Centros de costo |
| `/document-types` | GET | Tipos de documento |
| `/payment-types` | GET | Tipos de pago |
| `/taxes` | GET | Impuestos |
| `/price-lists` | GET | Listas de precios |
| `/account-groups` | GET | Grupos de cuentas |
| `/warehouses` | GET | Bodegas |
| `/products` | POST | Crear producto |
| `/products/sync` | POST | Sincronizar productos |
| `/invoices` | POST | Crear factura |

### Servicio Frontend (`integrations.service.ts`)
- ✅ `testSiigoConnection()` - Probar conexión
- ✅ `loadSiigoConfig()` - Cargar configuración
- ✅ `saveSiigoConfig()` - Guardar configuración
- ✅ `syncSiigoProducts()` - Sincronizar productos
- ✅ `getSiigoCostCenters()` - Obtener centros de costo
- ✅ `getSiigoDocumentTypes()` - Obtener tipos de documento
- ✅ `getSiigoPaymentTypes()` - Obtener tipos de pago
- ✅ `getSiigoTaxes()` - Obtener impuestos
- ✅ `getSiigoPriceLists()` - Obtener listas de precios
- ✅ `getSiigoAccountGroups()` - Obtener grupos de cuentas
- ✅ `getSiigoWarehouses()` - Obtener bodegas
- ✅ `createSiigoProduct()` - Crear producto
- ✅ `createSiigoInvoice()` - Crear factura (genérico)
- ✅ `createSiigoInvoiceFromOrder()` - **NUEVO** Crear factura desde pedido (auto-crea cliente/productos)

---

## ⚙️ PRÓXIMOS PASOS PARA EL USUARIO

1. **Configurar Siigo** (si no lo ha hecho)
   - Ir a `/integrations/siigo`
   - Ingresar credenciales y probar conexión

2. **Probar facturación manual**
   - Crear pedido de prueba
   - Aprobar pago manualmente
   - Usar "Facturar Siigo" desde lista de pedidos

3. **Probar facturación automática** (opcional)
   - Activar "Facturación Automática" en configuración
   - Crear pedido y aprobar pago

---

## Contexto para Retomar
**Si la conversación se compacta, leer este archivo primero.**

### Último punto de trabajo:
- IDs de impuestos ahora configurables desde UI
- Dropdowns para seleccionar tax0Id, tax5Id, tax19Id
- Backend actualizado para pasar IDs al SiigoDataMapper

### Funcionalidades implementadas:
1. ✅ Configuración de credenciales Siigo
2. ✅ Facturación automática al aprobar pagos
3. ✅ Checkbox para control por pedido
4. ✅ Facturación manual desde lista de pedidos
5. ✅ Creación automática de clientes en Siigo
6. ✅ Creación automática de productos en Siigo
7. ✅ IDs de impuestos configurables (tax0Id, tax5Id, tax19Id)

### Lo que falta:
- Usuario configure credenciales de Siigo API
- Usuario seleccione los IDs de impuestos correctos de su cuenta
- Probar flujo completo end-to-end
- Verificar respuesta del backend al crear facturas

---

## Referencias
- [Siigo API Docs](https://siigoapi.docs.apiary.io/)
- Documentación backend: `katuq_admin_back_firebase/docs/Integraciones/SIIGO_INTEGRATION_FINAL.md`
- Ruta frontend configuración: `/integrations/siigo`
- Ruta frontend pedidos: `/ventas/pedidos`
