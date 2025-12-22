# 🎤 Integración del Asistente de Voz con API de Inventario

Este documento describe la integración realizada entre el **Asistente de IA Gemini** y los **endpoints de inventario** para consultas de voz optimizadas.

## 📋 Resumen de la Integración

Se han conectado **10 herramientas de inventario** del asistente Gemini con los endpoints de la API REST, proporcionando capacidades híbridas que utilizan datos reales cuando están disponibles y fallback a datos mock cuando es necesario.

---

## 🔧 Arquitectura de la Integración

### 📁 **Archivos Principales**

1. **`katuq-inventory-tools.service.ts`** - Servicio especializado de herramientas de inventario
2. **`gemini-audio.service.ts`** - Servicio principal del asistente de voz (delegación)

### 🔄 **Flujo de Datos**

```
Consulta de Voz → Gemini API → Herramienta → KatuqInventoryToolsService
                                                        ↓
                            API REST ← HTTP Client ← Service
                                ↓ (si falla)
                            Mock Data ← Fallback
```

---

## 🎯 **Herramientas Disponibles**

### 1. **`quickSearchProducts`** 🔍
**Endpoint:** `GET /v1/analiticas/inventario/busqueda`

**Descripción:** Búsqueda rápida de productos por nombre, referencia o descripción.

**Casos de uso de voz:**
- *"Busca productos de mouse"*
- *"Encuentra artículos similares a teclado"*
- *"Muéstrame productos con referencia LOG-M705"*

**Parámetros:**
```typescript
{
  termino: string;     // Término de búsqueda (mín. 2 caracteres)
  limit?: number;      // Máximo resultados (default: 5, máx: 10)
}
```

### 2. **`getInventoryStatus`** 📊
**Endpoint:** `GET /v1/analiticas/inventario/resumen`

**Descripción:** Estado general del inventario con alertas y resúmenes.

**Casos de uso de voz:**
- *"Dame un resumen del inventario"*
- *"¿Cómo está el estado general del stock?"*
- *"Muéstrame las alertas de inventario"*

### 3. **`checkProductAvailability`** ✅
**Endpoint:** `GET /v1/analiticas/inventario/estado`

**Descripción:** Consulta disponibilidad de un producto específico.

**Casos de uso de voz:**
- *"¿Tenemos stock del producto LOG-M705?"*
- *"Verifica la disponibilidad del mouse Logitech"*
- *"¿Cuánto stock tenemos de este producto?"*

**Parámetros:**
```typescript
{
  productId?: string;    // ID del producto
  referencia?: string;   // Referencia del producto
  quantity?: number;     // Cantidad requerida (default: 1)
  warehouseId?: string;  // Bodega específica
}
```

### 4. **`getLowStockAlerts`** ⚠️
**Endpoint:** `GET /v1/analiticas/inventario/stock-bajo`

**Descripción:** Productos con stock bajo o agotado.

**Casos de uso de voz:**
- *"¿Qué productos están agotados?"*
- *"Muéstrame productos con stock bajo"*
- *"¿Cuáles productos necesitan reposición?"*

**Parámetros:**
```typescript
{
  threshold?: number;           // Umbral de stock bajo (default: 10)
  includeOutOfStock?: boolean;  // Incluir agotados (default: true)
  urgencyLevel?: string;        // 'all', 'critical', 'high', 'medium'
  warehouseId?: string;         // Filtrar por bodega
  limit?: number;               // Máximo resultados (default: 20)
}
```

### 5. **`searchInventoryByCategory`** 🏷️
**Endpoint:** `GET /v1/analiticas/inventario/categoria`

**Descripción:** Búsqueda de productos por categoría o etiquetas.

**Casos de uso de voz:**
- *"Muéstrame productos de electrónica"*
- *"Busca artículos con etiqueta 'oferta'"*
- *"¿Cuántos productos de ropa tenemos?"*

**Parámetros:**
```typescript
{
  category?: string;             // Nombre de la categoría
  etiqueta?: string;             // Etiqueta específica
  limit?: number;                // Máximo resultados (default: 20)
  sortBy?: string;               // Ordenar por: 'name', 'price', 'stock'
  includeOutOfStock?: boolean;   // Incluir sin stock
  priceRange?: {                 // Rango de precios
    min?: number;
    max?: number;
  };
}
```

### 6. **`getInventoryReport`** 📈
**Descripción:** Genera reportes de inventario (summary, detailed, analytics).

### 7. **`getInventoryMovements`** 📦
**Descripción:** Historial de movimientos de inventario.

### 8. **`getCategoryInventorySummary`** 📊
**Descripción:** Resumen de inventario agrupado por categorías.

### 9. **`getWarehouseInventoryComparison`** 🏢
**Descripción:** Comparación de inventario entre diferentes bodegas.

### 10. **`getInventoryTrends`** 📈
**Descripción:** Análisis de tendencias del inventario en el tiempo.

---

## 🔗 **Configuración de la API**

### **Headers Requeridos**
```typescript
{
  'Authorization': 'Bearer <token>',
  'company': '<company_id>',
  'Content-Type': 'application/json'
}
```

### **URL Base**
```typescript
const apiBaseUrl = `${environment.urlApi}/v1/analiticas/inventario`;
```

### **Endpoints Mapeados**
- `/busqueda` → `quickSearchProducts`
- `/estado` → `checkProductAvailability`
- `/stock-bajo` → `getLowStockAlerts`
- `/resumen` → `getInventoryStatus`
- `/categoria` → `searchInventoryByCategory`

---

## 🚀 **Estrategia de Fallback**

### **Nivel 1: API REST**
- Intenta conectar con los endpoints reales
- Maneja autenticación y headers automáticamente
- Procesa respuestas y las adapta al formato interno

### **Nivel 2: Servicios Internos**
- Si la API no está disponible, usa `InventarioService`
- Obtiene datos desde la base de datos local

### **Nivel 3: Datos Mock**
- Como último recurso, genera datos de demostración
- Mantiene la funcionalidad del asistente siempre activa

### **Indicador de Fuente**
Todas las respuestas incluyen un campo `source`:
```typescript
{
  data: {
    // ... datos
    source: 'api' | 'internal' | 'mock'
  }
}
```

---

## 💬 **Ejemplos de Uso con Voz**

### **Búsqueda Rápida**
```
👤 Usuario: "Busca productos de mouse"
🤖 Asistente: "Encontré 5 productos de mouse via API:
              1. Mouse Inalámbrico Logitech - $89,900 (25 en stock)
              2. Mouse Gaming Razer - $159,900 (12 en stock)
              ..."
```

### **Consulta de Stock**
```
👤 Usuario: "¿Tenemos stock del LOG-M705?"
🤖 Asistente: "El Mouse Inalámbrico Logitech LOG-M705 tiene:
              - Stock disponible: 25 unidades
              - Estado: En stock
              - Precio: $89,900
              - Ubicación: Bodega Principal (15), Bodega Norte (10)"
```

### **Alertas de Stock**
```
👤 Usuario: "¿Qué productos están agotados?"
🤖 Asistente: "Hay 3 productos agotados que requieren atención inmediata:
              1. Teclado Mecánico TEC-001 (crítico)
              2. Monitor 24" MON-24 (stock bajo: 3 unidades)
              ..."
```

### **Búsqueda por Categoría**
```
👤 Usuario: "Muéstrame productos de electrónica"
🤖 Asistente: "Encontrados 15 productos de electrónica:
              - Total con stock: 12 productos
              - Total sin stock: 3 productos
              - Valor total: $2,450,000"
```

---

## 🛠️ **Configuración para Desarrollo**

### **1. Variables de Entorno**
```typescript
// environment.ts
export const environment = {
  urlApi: "https://api.katuq.com", // Producción
  // urlApi: "http://localhost:3300", // Desarrollo local
};
```

### **2. Testing de Endpoints**
```bash
# Prueba básica de búsqueda
curl -H "Authorization: Bearer <token>" \
     -H "company: <company_id>" \
     "https://api.katuq.com/v1/analiticas/inventario/busqueda?termino=mouse&limite=3"

# Resumen de inventario
curl -H "Authorization: Bearer <token>" \
     -H "company: <company_id>" \
     "https://api.katuq.com/v1/analiticas/inventario/resumen"
```

### **3. Debugging**
El servicio incluye logging detallado:
```typescript
console.log('⚠️ API no disponible, usando datos alternativos:', apiError);
console.log('📊 Datos reales del inventario obtenidos:', inventoryData);
```

---

## 📝 **Casos de Uso Frecuentes**

### **Para Vendedores**
1. *"¿Tenemos stock del producto X?"* → `checkProductAvailability`
2. *"Busca productos similares a Y"* → `quickSearchProducts`
3. *"¿Qué productos están en oferta?"* → `searchInventoryByCategory`

### **Para Gerentes**
1. *"Dame un resumen del inventario"* → `getInventoryStatus`
2. *"¿Qué productos necesitan reposición?"* → `getLowStockAlerts`
3. *"Compara el inventario entre bodegas"* → `getWarehouseInventoryComparison`

### **Para Analistas**
1. *"Muéstrame las tendencias de stock"* → `getInventoryTrends`
2. *"Genera un reporte de inventario"* → `getInventoryReport`
3. *"¿Cómo están las categorías?"* → `getCategoryInventorySummary`

---

## 🔧 **Optimizaciones Implementadas**

### **Performance**
- ⚡ Límites en resultados (5-20 items máximo)
- 🔄 Caché de respuestas API cuando sea posible
- 📊 Paginación automática en consultas grandes

### **Experiencia de Usuario**
- 🎯 Respuestas concisas para IA de voz
- 📝 Mensajes descriptivos del estado
- 🔍 Búsqueda flexible con coincidencias parciales

### **Robustez**
- 🛡️ Manejo gracioso de errores
- 🔄 Múltiples niveles de fallback
- 📊 Metadatos de procesamiento y debug

---

## 📚 **Referencias**

- **Documentación API:** `/docs/inventory-voice-endpoints.md`
- **Servicio Principal:** `gemini-audio.service.ts`
- **Servicio Inventario:** `katuq-inventory-tools.service.ts`
- **Interfaces:** Definidas en cada servicio

---

*Documentación técnica - Versión 1.0*  
*Última actualización: Agosto 2024*
