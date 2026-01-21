# Mejoras al Módulo de Inventario Consolidado

**Fecha:** 21 de Enero 2026
**Branch:** `feature/venta-asistida-mejorada`

---

## Resumen de Cambios

### 1. Corrección del Cálculo de Totales

**Problema:** El TOTAL de la tabla mostraba 14,488 unidades pero la métrica real era 7,838.

**Solución:**
- Se corrigió `calcularTotalUnidadesBodegas()` para sumar los stocks de los **productos filtrados** en lugar de las métricas del backend
- Se creó `calcularTotalBodegaFiltrado(bodegaId)` para calcular el total de cada columna de bodega basado en productos filtrados
- Ahora el TOTAL respeta los filtros aplicados (fulfillment, bodega, estado de stock, búsqueda)

**Archivos modificados:**
- `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts` (líneas 829-860)

```typescript
calcularTotalBodegaFiltrado(bodegaId: string): number {
  return this.productosConsolidadosFiltrados.reduce((total, producto) => {
    return total + (producto.stockPorBodega?.[bodegaId] ?? 0);
  }, 0);
}

calcularTotalUnidadesBodegas(): number {
  // Filtra bodegas según filtros activos
  // Suma stocks de productos filtrados en bodegas filtradas
}
```

---

### 2. Exportar a Excel

**Funcionalidad:** Nuevo botón para exportar la vista consolidada a Excel.

**Características:**
- Columnas dinámicas por cada bodega
- Respeta los filtros activos
- Incluye: Referencia, Nombre, Stock por bodega, TOTAL, Precio, Valor Total
- Nombre de archivo con fecha: `Inventario_Consolidado_2026-01-21.xlsx`

**Archivos modificados:**
- `src/app/components/inventarios/inventario-catalogo/inventarios.component.ts` (método `exportarExcelConsolidado()`)
- `src/app/components/inventarios/inventario-catalogo/inventarios.component.html` (botón Excel)

---

### 3. Rediseño de la Barra de Filtros

**Antes:** Filtros desorganizados en dos filas con botones de colores disparejos (naranja, morado, verde).

**Después:**
- **Fila 1:** Filtros alineados con iconos y labels (Buscar, Estado, Bodega, Fulfillment) + botón limpiar + contador
- **Fila 2:** Acciones de sincronización y exportación

**Mejoras visuales:**
- Fondo blanco con sombra sutil
- Iconos en los labels de filtros
- Todos los botones usan el color primario de Katuq (`#5c6ac4`)
- Botones principales: solid | Botones secundarios: outlined
- Separador visual entre grupos de acciones

**Archivos modificados:**
- `src/app/components/inventarios/inventario-catalogo/inventarios.component.html` (líneas 173-340)

---

### 4. Rediseño del Header

**Antes:**
- Botón refresh con estilo texto
- Botón IA con gradiente morado
- Badge "aliaddo_fulfillment Conectado" largo

**Después:**
- Botón refresh: outlined circular (`#5c6ac4`)
- Botón IA: solid con label "IA" (`#5c6ac4`)
- Badge fulfillment: eliminado (innecesario)

**Archivos modificados:**
- `src/app/components/inventarios/inventario-catalogo/inventarios.component.html` (líneas 24-45)

---

## Esquema de Colores Unificado

Todos los elementos de UI ahora usan el color primario de Katuq:

| Elemento | Estilo | Color |
|----------|--------|-------|
| Botones principales | Solid | `#5c6ac4` |
| Botones secundarios | Outlined | `border: #5c6ac4` |
| Badges/Contadores | Solid | `#5c6ac4` |
| Iconos activos | Color | `#5c6ac4` |

---

## Archivos Modificados

```
src/app/components/inventarios/inventario-catalogo/
├── inventarios.component.ts    # Lógica de cálculos y exportación
└── inventarios.component.html  # UI de filtros y header
```

---

## Testing

1. Verificar que el TOTAL coincide con la suma de las columnas de bodegas
2. Aplicar filtro de fulfillment "Con enlace" y verificar que el TOTAL se actualiza
3. Exportar a Excel y verificar que los números coinciden
4. Verificar que los botones tienen colores consistentes
