# Bitácora de Integración Siigo - Katuq

## Estado Actual: ✅ FACTURACIÓN FUNCIONANDO
**Última actualización**: 2026-01-24
**Fase**: Producción - Facturación Completa Operativa

---

## Resumen Ejecutivo
Integración de facturación electrónica con Siigo completamente funcional. Soporta creación automática de clientes (NIT/CC), productos, **costo de envío**, envío automático a **DIAN** y **correo al cliente**.

**Última factura creada exitosamente:** LUMK-2443 (2026-01-24)

---

## ✅ NUEVA FUNCIONALIDAD: Envío a DIAN y Email al Cliente

### Envío Automático a DIAN
Las facturas se envían automáticamente a la DIAN usando el parámetro `stamp: { send: true }`.

**Referencia**: [Siigo API - Create Invoice](https://developers.siigo.com/docs/siigoapi/invoice/1-create-invoice/)

```javascript
// siigoDataMapper.js
stamp: {
    send: sendToDian // true por defecto
}
```

**⚠️ Importante**: La fecha de la factura DEBE ser la fecha actual (fecha de envío a DIAN). No se pueden enviar facturas con fecha futura o pasada.

### Envío de Factura por Email al Cliente
Después de crear la factura, se envía automáticamente al email del cliente usando:
```
POST /v1/invoices/{id}/mail
Body: { "mail_to": "cliente@email.com" }
```

**Flujo de email**:
1. `siigoDataMapper.js` extrae email de: `cliente.correo_electronico_comprador || facturacion.correoElectronico`
2. `siigoProvider.js` llama a `/invoices/{id}/mail` con el email
3. Si no hay email, solo muestra advertencia (no falla la factura)

### Observations (Publicidad)
Cada factura incluye texto promocional:
```
"Pedido #123 | Factura generada automaticamente desde katuq.com integrando Siigo"
```

---

## ✅ NUEVA FUNCIONALIDAD: Facturación de Costo de Envío

### Problema
Siigo **NO tiene un campo nativo para cargos de envío/flete**. El `totalEnvio` del pedido no se incluía en la factura.

### Solución Implementada
El costo de envío se agrega como un **ítem adicional de tipo Servicio** en la factura.

**Referencia**: [Documentación Plugin Siigo WooCommerce](https://vivamente.co/documentacion-plugin-siigo-con-woocommerce/)

### Configuración

**No requiere configuración manual.** El sistema automáticamente:

1. Verifica si existe el producto `ENVIO` en Siigo
2. Si no existe, lo crea como tipo `Service` (sin inventario)
3. Agrega el costo de envío del pedido a la factura

### Flujo Automático

```
Pedido Katuq:
  - Productos: $100,000
  - totalEnvio: $8,000

Factura Siigo:
  items: [
    { code: "PROD-001", price: 100000 },  // Productos
    { code: "ENVIO", price: 8000 }        // Envío como ítem adicional
  ]
  total: $108,000 ✅
```

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `siigoDataMapper.js` | Agregar `totalEnvio` como ítem de servicio |
| `accountingManager.js` | Configuración de `shippingProductCode`, `shippingDescription`, `shippingTaxId` |

### Código Implementado

```javascript
// siigoDataMapper.js - mapOrderToInvoice()
const totalEnvio = katuqPedido.totalEnvio || 0;
if (totalEnvio > 0) {
    items.push({
        code: config.shippingProductCode || 'ENVIO',
        description: config.shippingDescription || 'Servicio de envío a domicilio',
        quantity: 1,
        price: totalEnvio,
        discount: 0,
        taxes: config.shippingTaxId ? [{ id: config.shippingTaxId }] : []
    });
}
```

---

## ✅ FIXES CRÍTICOS (2026-01-24) - Creación de Clientes y Facturas

### Problemas Resueltos

| # | Error | Causa | Solución |
|---|-------|-------|----------|
| 1 | `Invalid email: 3104082376` | Teléfono en campo email | Validación regex `isValidEmail()` |
| 2 | `fiscal_responsibilities required` | Campo no mapeado correctamente | Soporte snake_case + camelCase en `createCustomer` |
| 3 | `Code doesn't exist: R-00-PN` | Código fiscal inválido | Usar `R-99-PN` (comodín DIAN válido) |
| 4 | `identification invalid format` | NIT con guión `901832344-7` | Separar en `identification` + `check_digit` |
| 5 | `identification already exists` | Búsqueda con guión, Siigo sin guión | Limpiar identificación antes de buscar |
| 6 | `customer doesn't exist` en factura | Factura usaba NIT con guión | Usar identificación de Siigo encontrada |
| 7 | `invalid_array` en campo `name` | Nombre como array con >2 elementos | Formato exacto: Person=2 elementos, Company=1 |
| 8 | `The field mail_to is required` | Email no pasado al endpoint de correo | Agregar `customerEmail` al invoice desde mapper |
| 9 | Fecha no coincide con DIAN | Fecha del pedido diferente a fecha actual | Usar siempre `new Date()` en siigoProvider |

### Archivos Modificados

#### `siigoDataMapper.js`
```javascript
// 1. Validación de email
isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// 2. Detección automática de NIT
#isNitFormat(documento) {
    // Detecta NITs por guión o formato 9-10 dígitos
    if (documento.includes('-')) return true;
    // NITs empiezan con 8 o 9
    ...
}

// 3. Separación de dígito de verificación
#extractIdentificationParts(documento, isCompany) {
    // "901832344-7" → { cleanIdentification: "901832344", checkDigit: "7" }
}

// 4. Códigos fiscales válidos DIAN
const fiscalResponsibility = { code: 'R-99-PN', name: 'No responsable' };
// Solo O-13, O-15, O-23, O-47, R-99-PN son válidos

// 7. Formato correcto de nombre según tipo de persona
// Documentación: https://developers.siigo.com/docs/siigoapi/customer/1-create-customer/
if (isCompany) {
    // Empresa (NIT): EXACTAMENTE 1 elemento
    nameArray = [rawName.trim()]; // ["Empresa ABC S.A.S."]
} else {
    // Persona (CC/CE): EXACTAMENTE 2 elementos [nombre, apellido]
    const parts = rawName.trim().split(/\s+/);
    if (parts.length === 1) {
        nameArray = [parts[0], 'N/A'];
    } else if (parts.length === 2) {
        nameArray = parts;
    } else {
        // "Jairo Alberto Pérez" → ["Jairo", "Alberto Pérez"]
        nameArray = [parts[0], parts.slice(1).join(' ')];
    }
}
```

#### `siigoProvider.js`
```javascript
// 5. Búsqueda con identificación limpia
async findCustomerByIdentification(identification, ...) {
    let cleanIdentification = identification;
    if (cleanIdentification.includes('-')) {
        cleanIdentification = cleanIdentification.split('-')[0];
    }
    // Buscar con "901832344" no "901832344-7"
}

// 6. Crear cliente con soporte snake_case
const payload = {
    person_type: customer.person_type || customer.personType || 'Person',
    fiscal_responsibilities: customer.fiscal_responsibilities || customer.fiscalResponsibilities || [],
    check_digit: checkDigit || undefined, // Solo si existe
    ...
};
```

#### `accountingManager.js`
```javascript
// 7. Pasar identificación de Siigo a la factura
invoiceConfig.customerIdentification = customerResult.customer?.identification;
// Usa "901832344" que Siigo devolvió, no el del pedido
```

### Códigos Fiscales Válidos DIAN

| Código | Descripción |
|--------|-------------|
| `O-13` | Gran contribuyente |
| `O-15` | Autorretenedor |
| `O-23` | Agente de retención IVA |
| `O-47` | Régimen simple de tributación |
| `R-99-PN` | No responsable (comodín para todos los demás) |

⚠️ **El código `R-00-PN` NO EXISTE.** Usar `R-99-PN` para empresas normales.

### Formato del Campo `name` en Clientes

Según la [documentación oficial de Siigo](https://developers.siigo.com/docs/siigoapi/customer/1-create-customer/), el campo `name` es un **array de strings** con formato específico:

| Tipo | Elementos | Ejemplo |
|------|-----------|---------|
| `Person` (CC, CE) | **Exactamente 2** | `["Juan", "Pérez Gómez"]` |
| `Company` (NIT) | **Exactamente 1** | `["Mi Empresa S.A.S."]` |

#### Transformación de nombres:

```
Persona: "Jairo Alberto Pérez" → ["Jairo", "Alberto Pérez"]
Persona: "María" → ["María", "N/A"]
Empresa: "LUMINOS SAS" → ["LUMINOS SAS"]
```

⚠️ **Enviar más de 2 elementos para Person o más de 1 para Company causa `invalid_array`.**

### Flujo de Creación de Cliente Corregido

```
1. Pedido tiene cliente: NIT 901832344-7

2. findCustomerByIdentification("901832344-7")
   └─ Limpia: "901832344"
   └─ Busca en Siigo
   └─ ✅ Encontrado → Usa ese cliente

3. Si no existe, mapCustomerToSiigo():
   └─ Detecta NIT automáticamente (tiene guión)
   └─ Separa: identification="901832344", check_digit="7"
   └─ fiscal_responsibilities=[{code:"R-99-PN", name:"No responsable"}]
   └─ Valida email (ignora si es teléfono)
   └─ ✅ Crea cliente en Siigo

4. createInvoice():
   └─ Usa customerResult.customer.identification ("901832344")
   └─ ✅ Factura creada exitosamente
```

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

### Último punto de trabajo (2026-01-24):
- ✅ Facturación funcionando end-to-end
- ✅ Factura LUMK-2443 creada exitosamente
- ✅ Cliente NIT 901832344 creado/encontrado correctamente
- ✅ Producto JCR4216 creado en Siigo

### Funcionalidades implementadas:
1. ✅ Configuración de credenciales Siigo
2. ✅ Facturación automática al aprobar pagos
3. ✅ Checkbox para control por pedido
4. ✅ Facturación manual desde lista de pedidos
5. ✅ Creación automática de clientes en Siigo (NIT y CC)
6. ✅ Creación automática de productos en Siigo
7. ✅ IDs de impuestos configurables (tax0Id, tax5Id, tax19Id)
8. ✅ Validación de email (ignora teléfonos en campo email)
9. ✅ Detección automática de NIT por formato
10. ✅ Separación de dígito de verificación para NITs
11. ✅ Códigos fiscales DIAN válidos (R-99-PN)
12. ✅ Columna "Factura" en lista de pedidos con link a PDF
13. ✅ Columna "Factura" en despachos con link a PDF

### Estado actual:
- **PRODUCCIÓN LISTA** - Facturación funcionando correctamente
- PDF de facturas accesible via `public_url` de Siigo
- Pedidos actualizados con `nroFactura` y `pdfUrlInvoice`

---

## ✅ UI - Columna Factura en Listas (2026-01-24)

### Lista de Pedidos (`list.component`)
- Columna "Factura" agregada después de "# Pedido"
- Muestra número de factura con icono PDF
- Link directo al PDF si `pdfUrlInvoice` existe
- Lógica de merge para columnas nuevas en localStorage

### Tabla de Despachos (`tabla-pedidos.component`)
- Misma funcionalidad que lista de pedidos
- Columna "Factura" con link a PDF

### Campos del Pedido Actualizados
```typescript
interface Pedido {
  nroFactura?: string;           // Número de factura (ej: "2443")
  pdfUrlInvoice?: string;        // URL al PDF de Siigo
  facturacionElectronica?: {
    provider: string;            // "siigo"
    invoiceId: string;           // UUID de Siigo
    invoiceNumber: string;       // Número de factura
    pdfUrl?: string;             // URL alternativa al PDF
    createdAt: string;
    customerId: string;
    customerCreated: boolean;
  };
}
```

---

## Referencias
- [Siigo API Docs](https://developers.siigo.com/)
- [Códigos Fiscales DIAN](https://soporte.misfacturas.com.co/hc/es-419/articles/4401755703956)
- Documentación backend: `katuq_admin_back_firebase/docs/Integraciones/SIIGO_INTEGRATION_FINAL.md`
- Ruta frontend configuración: `/integrations/siigo`
- Ruta frontend pedidos: `/ventas/pedidos`
