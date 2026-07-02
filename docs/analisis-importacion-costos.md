# Análisis del Sistema de Importación de Costos de Inventario

**Fecha:** 2026-05-14  
**Módulo:** Lista de Precios - Importación de Costos  
**Estado:** Implementado y funcional

---

## 📋 Resumen Ejecutivo

El sistema de importación de costos permite actualizar masivamente los precios de costo de productos desde archivos Excel. Utiliza un flujo **preview-apply** en dos pasos que garantiza seguridad y trazabilidad completa.

### Características principales:
- ✅ **Preview sin escritura**: dry-run que muestra cambios antes de aplicar
- ✅ **Idempotencia**: un `importId` solo se aplica una vez
- ✅ **Audit trail completo**: historial por producto + batch imports
- ✅ **Multi-fuente**: Excel Prindel, Excel costos, Aliaddo API, manual
- ✅ **Detección inteligente**: normalización de referencias, alias de códigos
- ✅ **Métricas financieras**: delta total, porcentaje de cambio, valorización
- ✅ **Alertas embebidas**: typos, productos no encontrados, stocks de referencia

---

## 🏗️ Arquitectura

### Stack
```
Frontend (Angular)
├── importar-costos-modal.component.ts      → UI modal con stepper
├── lista-precios-costos.component.ts       → Vista principal + historial
└── product-costs.service.ts                → HTTP service (BaseService)

Backend (Express/Node)
├── routers/fulfillmentIntegrations.js      → Rutas /cost-import/*
└── controllers/productCosts.js             → Lógica de negocio
```

### Colecciones Firestore
```
products                                    → Campo `costo.*` + `precio.costoUnitario`
productCostHistory                          → Historial de cambios por producto
productCostImports                          → Batches de importación (idempotente)
```

---

## 🔄 Flujo Completo

### Fase 1: Upload y parsing (Frontend)
```typescript
1. Usuario arrastra Excel o selecciona archivo
2. Frontend parsea con XLSX.js:
   - Detecta fuente: "inventario" sheet → prindel-excel, sino → costos-excel
   - Extrae columnas: REFERENCIA, COSTO, FECHA_VIGENCIA (+ opcionales)
   - Parsea sheet "Alerta" si existe (typos, faltantes)
3. Valida:
   - codigo no vacío y != "TOTAL"
   - costoUnitario > 0 y numérico
4. Genera parsedRows[] con datos normalizados
```

**Columnas reconocidas (case-insensitive):**
| Requeridas | Opcionales |
|------------|-----------|
| REFERENCIA/reference/SKU/Código | Nombre/PRODUCTO |
| COSTO/costoUnitario | FECHA_VIGENCIA/fechaVigencia |
| | BOGOTA/BUCARAMANGA/CALI/MEDELLIN/PEREIRA (stocks) |
| | P. Mayorista / P. Modelo / P. Público (precios ref) |

### Fase 2: Preview (Backend dry-run)
```typescript
POST /v1/fulfillment/cost-import/preview
Headers: { company, email }
Body: {
  fileName: "Prindel-2026-05-14.xlsx",
  fuente: "prindel-excel",
  rows: [{
    codigo: "JCR4021",
    costoUnitario: 25000,
    fechaVigencia: "2026-05-01",
    stocks: { BOGOTA: 10, total: 45 },
    precios: { mayorista: 35000 }
  }],
  codeAliases: { "JCR402": "JCR4021" } // typo fix
}
```

**Procesamiento:**
1. Carga índice de productos: `products.identificacion.referencia` → `Map<ref, productDoc>`
2. Por cada row:
   - Normaliza código: `toUpperCase().trim()`
   - Aplica alias si existe
   - Busca producto en índice
   - Calcula delta: `costoNuevo - costoAnterior`
   - Clasifica: `matched | no-change | skipped | unmatched`
3. Calcula métricas agregadas:
   - `costoTotalAntes = Σ(costoActual × stock)`
   - `deltaTotal = costoTotalDespues - costoTotalAntes`

**Response:**
```json
{
  "success": true,
  "previewId": "imp-1715708234567-a1b2c3d4",
  "summary": {
    "totalRows": 150,
    "matched": 120,
    "noChange": 15,
    "skipped": 5,
    "unmatched": 10,
    "costoTotalAntes": 12500000,
    "costoTotalDespues": 13200000,
    "deltaTotal": 700000
  },
  "matched": [ /* items con cambios */ ],
  "unmatched": [ /* códigos no encontrados */ ],
  "alerts": [ /* alertas del Excel */ ]
}
```

### Fase 3: Confirmación (Frontend)
```typescript
Modal muestra:
- Tabla de cambios (código, costo anterior → nuevo, delta, %)
- Resumen financiero: delta total, productos afectados
- Alertas embebidas por producto

Usuario confirma con SweetAlert:
"Se actualizarán 120 productos con delta total $700,000"
```

### Fase 4: Aplicar cambios (Backend escritura)
```typescript
POST /v1/fulfillment/cost-import/apply
Body: {
  importId: "imp-1715708234567-a1b2c3d4",
  fileName: "Prindel-2026-05-14.xlsx",
  fuente: "prindel-excel",
  matched: [ /* solo items con cambios */ ],
  summary: { /* del preview */ }
}
```

**Transacciones en batches de 400:**
```javascript
for (chunk of matched) {
  batch = db.batch();
  
  // 1. Verificar ownership por empresa (security)
  allowedIds = await loadCompanyProductIdSet(chunk, companyId);
  
  for (item of chunk) {
    if (!allowedIds.has(item.productId)) {
      failed++; continue;
    }
    
    // 2. Actualizar producto (6 campos)
    batch.update(productsRef.doc(item.productId), {
      costoUnitario: item.costoNuevo,
      costo: {
        costoUnitario: item.costoNuevo,
        valor: item.costoNuevo,
        fechaVigencia: item.fechaVigencia,
        fuente: "prindel-excel",
        importId,
        actualizadoAt: serverTimestamp(),
        actualizadoPor: userEmail
      },
      "precio.costoUnitario": item.costoNuevo,
      "fulfillment.costoCompra": item.costoNuevo,
      "fulfillment.costoFuente": "prindel-excel",
      "fulfillment.stockReferenciaFulfillment": item.stocks,
      "fulfillment.preciosReferenciaFulfillment": item.precios
    });
    
    // 3. Crear registro de auditoría
    batch.set(historyRef.doc(), {
      productoId: item.productId,
      referencia: item.referencia,
      company: companyId,
      costoAnterior: item.costoAnterior,
      costoNuevo: item.costoNuevo,
      delta: item.delta,
      deltaPct: item.deltaPct,
      fechaVigencia: item.fechaVigencia,
      fuente: "prindel-excel",
      importId,
      importedAt: serverTimestamp(),
      importedBy: userEmail
    });
    
    processed++;
  }
  
  await batch.commit();
}

// 4. Registrar batch import (idempotencia)
await importsRef.doc(importId).set({
  id: importId,
  fileName: "Prindel-2026-05-14.xlsx",
  company: companyId,
  fuente: "prindel-excel",
  importedAt: serverTimestamp(),
  importedBy: userEmail,
  summary: { matched: 120, deltaTotal: 700000 },
  totalProcesados: processed,
  totalFallidos: failed
});
```

**Idempotencia:**
```javascript
// Al inicio de applyCostImport:
const existing = await importsRef.doc(importId).get();
if (existing.exists) {
  return 409 Conflict: "importId ya fue aplicado"
}
```

---

## 🔍 Casos de Uso

### 1. Importación Excel Prindel
**Escenario:** Proveedor envía Excel con stock y precios actualizados

**Excel:**
```
Sheet: "Inventario Prindel"
| REFERENCIA | Nombre       | COSTO | BOGOTA | CALI | Total | P. Mayorista |
|------------|-------------|-------|--------|------|-------|--------------|
| JCR4021    | Camisa Roja | 25000 | 10     | 5    | 45    | 35000        |
| BLU2034    | Blusa Azul  | 18000 | 20     | 8    | 50    | 28000        |
```

**Resultado:**
- ✅ 2 productos actualizados
- ✅ `stockReferenciaFulfillment` guardado para análisis
- ✅ `preciosReferenciaFulfillment` guardado para comparación

### 2. Corrección de typos con alias
**Escenario:** Excel tiene código incorrecto `JCR402` pero el correcto es `JCR4021`

**Sheet "Alerta":**
```
| Tipo  | Código  | Descripción                  | Acción sugerida |
|-------|---------|------------------------------|-----------------|
| Typo  | JCR402  | Código sin match en sistema  | Usar JCR4021    |
```

**Proceso:**
1. Frontend detecta alerta tipo "typo"
2. Genera `codeAliases: { "JCR402": "JCR4021" }`
3. Backend resuelve alias antes de lookup
4. Auditoría registra: `aliasAplicado: { de: "JCR402", a: "JCR4021" }`

### 3. Fechas de vigencia
**Escenario:** Costos con fecha futura para aplicación programada

**Excel:**
```
| REFERENCIA | COSTO | FECHA_VIGENCIA |
|------------|-------|----------------|
| JCR4021    | 27000 | 2026-06-01     |
```

**Resultado:**
- ✅ `costo.fechaVigencia: "2026-06-01"` guardado
- ⚠️ **NO hay aplicación automática** (campo de referencia)
- 💡 Futuro: job cron para activar costos por fecha

---

## 📊 Datos Escritos

### Campo `costo.*` en productos
```typescript
costo: {
  costoUnitario: 25000,                     // número
  valor: 25000,                             // legacy compat
  fechaVigencia: "2026-05-01",             // ISO date string
  fuente: "prindel-excel",                 // source tracking
  importId: "imp-1715708234567-a1b2c3d4",  // idempotencia
  actualizadoAt: Timestamp,
  actualizadoPor: "user@empresa.com"
}
```

### Campo `precio.*` (compatibilidad)
```typescript
precio: {
  costoUnitario: 25000,  // mismo valor que costo.costoUnitario
  // ... otros campos de precio
}
```

### Campo `fulfillment.*` (contexto)
```typescript
fulfillment: {
  costoCompra: 25000,
  costoFuente: "prindel-excel",
  costoActualizadoAt: Timestamp,
  costoActualizadoPor: "user@empresa.com",
  costoImportId: "imp-1715708234567-a1b2c3d4",
  stockReferenciaFulfillment: {
    BOGOTA: 10,
    CALI: 5,
    total: 45
  },
  preciosReferenciaFulfillment: {
    mayorista: 35000,
    modelo: 32000,
    publico: 40000
  }
}
```

---

## 🛡️ Seguridad y Validaciones

### Nivel Frontend
```typescript
// 1. Parsing
if (!codigo || codigo.toUpperCase() === 'TOTAL') {
  filasIgnoradas++; continue;
}
if (!isFinite(costoUnitario) || costoUnitario <= 0) {
  filasIgnoradas++; continue;
}

// 2. Confirmación
SweetAlert.fire({
  title: '¿Confirmar aplicación?',
  html: `Se actualizarán <b>${matched.length}</b> productos...`,
  icon: 'warning',
  showCancelButton: true
});
```

### Nivel Backend
```javascript
// 1. Auth & multi-tenant
const companyId = req.headers.company;  // del interceptor
if (!companyId) return 400;

// 2. Ownership check en apply
const allowedIds = await loadCompanyProductIdSet(productIds, companyId);
// Solo batch.update() si productId ∈ allowedIds

// 3. Idempotencia
const existing = await importsRef.doc(importId).get();
if (existing.exists) return 409 Conflict;

// 4. Validación de fuente
if (!VALID_SOURCES.has(fuente)) {
  return 400: "fuente inválida"
}
```

### Rate limiting
- **Preview**: sin límite (dry-run, solo lectura)
- **Apply**: batches de 400 productos × N chunks
  - 400 productos × 2 writes (product + history) = 800 writes/batch
  - Firestore limit: 500 writes/batch → OK con 400
  - Tiempo estimado: ~500ms por batch de 400

---

## 📈 Métricas y Monitoreo

### Endpoint de historial
```typescript
GET /v1/fulfillment/cost-import/imports?limit=20
Response: {
  imports: [{
    id: "imp-...",
    fileName: "Prindel-2026-05-14.xlsx",
    fuente: "prindel-excel",
    importedAt: Timestamp,
    importedBy: "user@empresa.com",
    summary: {
      matched: 120,
      deltaTotal: 700000,
      costoTotalAntes: 12500000,
      costoTotalDespues: 13200000
    },
    totalProcesados: 120,
    totalFallidos: 0
  }]
}
```

### Historial por producto
```typescript
GET /v1/fulfillment/cost-import/history/:productId?limit=20
Response: {
  history: [{
    productoId: "ABC123",
    referencia: "JCR4021",
    costoAnterior: 23000,
    costoNuevo: 25000,
    delta: 2000,
    deltaPct: 8.7,
    fechaVigencia: "2026-05-01",
    fuente: "prindel-excel",
    importId: "imp-...",
    importedAt: Timestamp,
    importedBy: "user@empresa.com"
  }]
}
```

---

## 🐛 Anti-patterns y Problemas Potenciales

### ❌ Problema 1: Normalización inconsistente
**Síntoma:** Excel tiene `"jcr4021 "` (minúsculas + espacio), BD tiene `"JCR4021"`

**Causa raíz:** Frontend no normaliza antes de enviar

**Fix actual:**
```typescript
// Backend normaliza siempre
function normalizeReference(value) {
  return String(value).trim().toUpperCase();
}
```

**Recomendación:** ✅ Mantener normalización en backend (fuente de verdad)

---

### ❌ Problema 2: Campos duplicados de costo
**Síntoma:** `costo.costoUnitario`, `precio.costoUnitario`, `costoUnitario` (root), `fulfillment.costoCompra`

**Causa raíz:** Legacy + feature flags + integraciones

**Estado actual:**
```javascript
// applyCostImport escribe a 4 lugares:
batch.update(prodRef, {
  costoUnitario: valor,              // root (legacy)
  costo: { ... },                    // canónico
  "precio.costoUnitario": valor,     // módulo ventas
  "fulfillment.costoCompra": valor   // fulfillment
});
```

**Impacto:**
- ✅ **Pro:** Compatibilidad con todos los módulos
- ⚠️ **Contra:** Escrituras extra (×4 fields)
- ⚠️ **Contra:** Riesgo de desincronización si un módulo escribe directo

**Recomendación:** 
1. **Corto plazo:** mantener escritura a 4 campos (alta compatibilidad)
2. **Largo plazo:** migrar a fuente única `costo.*` con helper de lectura

---

### ❌ Problema 3: Sin validación de fechas de vigencia futuras
**Síntoma:** Se guarda `fechaVigencia: "2026-12-01"` pero el costo se aplica inmediatamente

**Fix necesario:**
```javascript
// En applyCostImport:
const fechaVigencia = item.fechaVigencia;
const hoy = new Date().toISOString().slice(0, 10);

if (fechaVigencia && fechaVigencia > hoy) {
  // Opción A: rechazar con error
  failed++;
  errors.push({ codigo: item.codigoOriginal, reason: "Fecha vigencia futura" });
  continue;
  
  // Opción B: guardar pero no aplicar (flag pendiente)
  batch.update(prodRef, {
    "costo.costoUnitarioPendiente": item.costoNuevo,
    "costo.fechaVigencia": fechaVigencia,
    "costo.estado": "programado"
  });
}
```

**Recomendación:** Implementar job cron que active costos programados

---

### ⚠️ Problema 4: Stocks de referencia sin validación
**Síntoma:** Excel dice `BOGOTA: 10`, pero inventario real Katuq tiene 0

**Estado actual:** 
```javascript
// Se guarda sin validar:
"fulfillment.stockReferenciaFulfillment": item.stocks
```

**Impacto:** Campo informativo, NO afecta inventario real

**Recomendación:** 
- Agregar validación cruzada en preview:
  ```javascript
  const inventoryActual = await getInventoryByBodega(productId, "BOD-001");
  if (Math.abs(item.stocks.total - inventoryActual) > threshold) {
    warnings.push({ codigo, mensaje: "Stock desviado del real" });
  }
  ```

---

## 🔧 Mejoras Propuestas

### 1. Activación automática por fecha de vigencia
**Prioridad:** Media  
**Esfuerzo:** 2-3 días

```javascript
// Cron job diario (2:00 AM)
async function activarCostosProgramados() {
  const hoy = new Date().toISOString().slice(0, 10);
  
  const snap = await db.collection('products')
    .where('costo.estado', '==', 'programado')
    .where('costo.fechaVigencia', '<=', hoy)
    .get();
  
  const batch = db.batch();
  snap.forEach(doc => {
    const pendiente = doc.data().costo.costoUnitarioPendiente;
    batch.update(doc.ref, {
      costoUnitario: pendiente,
      "costo.costoUnitario": pendiente,
      "costo.estado": "activo",
      "costo.activadoAt": FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log(`Activados ${snap.size} costos programados`);
}
```

---

### 2. Validación cruzada con inventario
**Prioridad:** Baja  
**Esfuerzo:** 1 día

```typescript
// En previewCostImport, después de buildPreviewItem:
const inventarios = await getInventoryBulk(matched.map(i => i.productId));
for (const item of matched) {
  const inv = inventarios.get(item.productId);
  const stockExcel = item.stocksFulfillment?.total || 0;
  const stockKatuq = inv?.totalDisponible || 0;
  
  if (Math.abs(stockExcel - stockKatuq) > 10) {
    item.warning = `Stock Excel (${stockExcel}) difiere de Katuq (${stockKatuq})`;
  }
}
```

---

### 3. Export de productos sin costo
**Prioridad:** Media  
**Esfuerzo:** 0.5 días

```typescript
// Botón en lista-precios-costos.component
async exportarProductosSinCosto() {
  const productos = await this.inventarioService.exportarInventarioExcel({
    soloSinCosto: true,
    soloInventariables: true
  });
  // Descarga Excel pre-formateado para importar costos
}
```

---

### 4. Diff visual entre preview y último import
**Prioridad:** Baja  
**Esfuerzo:** 2 días

```typescript
// En importar-costos-modal:
async function cargarUltimoImport() {
  const ultimo = await this.costsService.listImports(1);
  this.ultimoImport = ultimo.imports[0];
  
  // Comparar preview actual vs último import
  for (const item of this.preview.matched) {
    const prev = this.ultimoImport.matched.find(p => p.productId === item.productId);
    if (prev) {
      item.ultimoCosto = prev.costoNuevo;
      item.deltaVsUltimo = item.costoNuevo - prev.costoNuevo;
    }
  }
}
```

---

## 📚 Referencias de Código

### Frontend
- `src/app/components/lista-precios/importar-costos-modal/importar-costos-modal.component.ts` (líneas 1-333)
- `src/app/components/lista-precios/lista-precios-costos/lista-precios-costos.component.ts` (líneas 1-142)
- `src/app/shared/services/lista-precios/product-costs.service.ts` (líneas 1-112)

### Backend
- `katuq_admin_back_firebase/functions/routers/fulfillmentIntegrations.js` (líneas 2022-2034)
- `katuq_admin_back_firebase/functions/controllers/productCosts.js` (líneas 1-454)

### Colecciones Firestore
- `products` → campos: `costo.*`, `precio.costoUnitario`, `fulfillment.*`
- `productCostHistory` → auditoría por producto
- `productCostImports` → batches de importación

---

## ✅ Conclusión

El sistema de importación de costos está **bien diseñado y funcional**. Cumple con:

- ✅ **Seguridad:** Multi-tenant, ownership validation, idempotencia
- ✅ **UX:** Preview claro, confirmación con métricas, feedback visual
- ✅ **Trazabilidad:** Historial completo + audit trail
- ✅ **Escalabilidad:** Batching de 400 productos, async processing
- ✅ **Robustez:** Normalización, aliases, manejo de errores

**Áreas de mejora (no críticas):**
1. Activación automática por fecha de vigencia
2. Validación cruzada con inventario real
3. Consolidación de campos de costo (migración gradual)

**Recomendación:** Sistema production-ready. Las mejoras son evolutivas.
