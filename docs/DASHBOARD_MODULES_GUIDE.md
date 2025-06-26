# Guía de Módulos Operativos - Dashboard Katuq

**Versión:** 1.0  
**Fecha:** 2024-12-26  
**Objetivo:** Organización modular del dashboard por áreas operativas con soporte para roles

---

## 📋 **Índice**

1. [Introducción](#introducción)
2. [Estructura Modular](#estructura-modular)  
3. [Módulos Operativos](#módulos-operativos)
4. [Configuración por Roles](#configuración-por-roles)
5. [Implementación Técnica](#implementación-técnica)
6. [Roadmap](#roadmap)

---

## <a name="introducción"></a>🎯 **Introducción**

El dashboard de Katuq ha sido reorganizado en **módulos operativos** independientes que reflejan las diferentes áreas de negocio. Esta estructura permite:

- ✅ **Organización lógica** por áreas funcionales
- ✅ **Escalabilidad** para futuras funcionalidades
- ✅ **Personalización por roles** de usuario
- ✅ **Mejor experiencia de usuario** con información relevante
- ✅ **Mantenimiento** más sencillo del código

---

## <a name="estructura-modular"></a>🏗️ **Estructura Modular**

### **Jerarquía Visual**

```
Dashboard Katuq
├── KPI Cards Globales (siempre visibles)
├── 📊 MÓDULO DE VENTAS
│   ├── Tendencia de Ventas
│   ├── K.A.I. Insights
│   ├── Productos Estrella
│   ├── Productos con Oportunidad
│   ├── Distribución por Categorías
│   └── Comportamiento de Pago
├── 🚚 MÓDULO DE LOGÍSTICA
│   ├── Eficiencia de Entregas
│   └── Cobertura Geográfica
├── 🏭 MÓDULO DE PRODUCCIÓN
│   └── [Próximamente]
└── 💰 MÓDULO FINANCIERO
    ├── Gestión de Descuentos
    └── [Análisis Avanzado]
```

### **Características Visuales**

- **Headers diferenciados** con iconos y colores específicos
- **Badges de identificación** por área operativa
- **Cards con gradientes** para mejor distinción visual
- **Animaciones suaves** en hover y transiciones
- **Responsive design** optimizado para móviles

---

## <a name="módulos-operativos"></a>📋 **Módulos Operativos**

### **1. 📊 Módulo de Ventas**
**Color:** Azul (`primary`)  
**Badge:** Comercial  
**Enfoque:** Análisis de ventas, productos y comportamiento comercial

#### **Componentes:**
- **Tendencia de Ventas del Período** (8 columnas)
  - Gráfico tipo `area` con datos temporales
  - Carga inmediata desde endpoint `dashboard-core`
  
- **K.A.I. Insights** (4 columnas)
  - Análisis inteligente con IA
  - Interfaz optimizada y compacta
  
- **Top 10 Productos Estrella** (6 columnas)
  - Productos más vendidos
  - Gráfico tipo `bar` horizontal
  
- **Productos Con Oportunidad** (6 columnas)
  - Productos menos vendidos (reframe positivo)
  - Identificación de oportunidades de mejora
  
- **Distribución por Categorías** (6 columnas)
  - Gráfico tipo `donut`
  - Análisis de portafolio
  
- **Comportamiento de Pago** (6 columnas)
  - Métodos de pago utilizados
  - Gráfico tipo `pie`

### **2. 🚚 Módulo de Logística**
**Color:** Amarillo/Naranja (`warning`)  
**Badge:** Distribución  
**Enfoque:** Gestión de entregas, tiempos y distribución geográfica

#### **Componentes:**
- **Eficiencia de Entregas** (6 columnas)
  - Tiempo promedio de entrega
  - Pedidos entregados exitosamente
  - Barras de progreso visuales
  
- **Cobertura Geográfica** (6 columnas)
  - Número de ciudades atendidas
  - Indicadores de expansión
  - Visualización circular destacada

### **3. 🏭 Módulo de Producción**
**Color:** Azul claro (`info`)  
**Badge:** Operaciones  
**Enfoque:** Control de inventarios, stock y optimización de recursos

#### **Estado Actual:**
- ⏳ **En desarrollo**
- 📋 **Funcionalidades planificadas:**
  - Control de inventarios en tiempo real
  - Alertas de stock mínimo
  - Optimización de recursos productivos
  - Análisis de eficiencia operativa

### **4. 💰 Módulo Financiero**
**Color:** Verde (`success`)  
**Badge:** Finanzas  
**Enfoque:** Análisis financiero, rentabilidad y gestión de costos

#### **Componentes Actuales:**
- **Gestión de Descuentos** (6 columnas)
  - Total de descuentos aplicados
  - Porcentaje sobre ventas totales
  
#### **Próximamente:**
- Análisis de rentabilidad
- Flujo de caja
- ROI (Retorno de inversión)

---

## <a name="configuración-por-roles"></a>👥 **Configuración por Roles**

### **Sistema de Roles Implementado**

La aplicación detecta automáticamente el rol del usuario desde `localStorage` y configura los módulos visibles:

```typescript
// Configuración automática por rol
configurarModulosPorRol() {
  const user = JSON.parse(localStorage.getItem('user'));
  const rol = user.rol.toLowerCase();
  
  switch (rol) {
    case 'vendedor':
    case 'comercial':
      this.modulosHabilitados = {
        ventas: true,      // ✅ Visible
        logistica: false,  // ❌ Oculto
        produccion: false, // ❌ Oculto
        financiero: false  // ❌ Oculto
      };
      break;
      
    case 'logistica':
    case 'despachos':
      this.modulosHabilitados = {
        ventas: true,      // ✅ Visible (contexto)
        logistica: true,   // ✅ Visible
        produccion: false, // ❌ Oculto
        financiero: false  // ❌ Oculto
      };
      break;
      
    case 'produccion':
    case 'inventario':
      this.modulosHabilitados = {
        ventas: false,     // ❌ Oculto
        logistica: true,   // ✅ Visible (relacionado)
        produccion: true,  // ✅ Visible
        financiero: false  // ❌ Oculto
      };
      break;
      
    case 'admin':
    case 'administrador':
    case 'gerente':
    default:
      // Todos los módulos visibles
      this.modulosHabilitados = {
        ventas: true,      // ✅ Visible
        logistica: true,   // ✅ Visible
        produccion: true,  // ✅ Visible
        financiero: true   // ✅ Visible
      };
      break;
  }
}
```

### **Roles Soportados**

| Rol | Módulos Visibles | Descripción |
|-----|------------------|-------------|
| **Vendedor/Comercial** | 📊 Ventas | Enfoque en métricas comerciales |
| **Logística/Despachos** | 📊 Ventas + 🚚 Logística | Ventas como contexto + operaciones logísticas |
| **Producción/Inventario** | 🚚 Logística + 🏭 Producción | Operaciones internas y distribución |
| **Admin/Gerente** | 📊 📊 🚚 🏭 💰 Todos | Vista completa del negocio |

---

## <a name="implementación-técnica"></a>⚙️ **Implementación Técnica**

### **Estructura de Archivos**

```
src/app/components/dashboard/
├── dashboard.component.html      # Template con módulos
├── dashboard.component.scss      # Estilos modulares
├── dashboard.component.ts        # Lógica y configuración
├── dashboard.module.ts           # Módulo Angular
├── dashboard-routing.module.ts   # Rutas
└── model/
    └── dashboard-interfaces.ts   # Interfaces TypeScript
```

### **Clases CSS Principales**

```scss
// Contenedor principal de módulo
.operational-module {
  margin-bottom: 3rem;
  border: 1px solid #e9ecef;
  border-radius: 15px;
  padding: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

// Header del módulo
.module-header {
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

// Cards mejoradas
.metric-card-enhanced {
  border: none;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

// Cards de próximamente
.coming-soon-card {
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  background: linear-gradient(135deg, #fafafa 0%, #f1f3f4 100%);
}
```

### **Control de Visibilidad**

```html
<!-- Módulo de Ventas -->
<div class="operational-module mb-5" *ngIf="modulosHabilitados.ventas">
  <!-- Contenido del módulo -->
</div>

<!-- Módulo de Logística -->
<div class="operational-module mb-5" *ngIf="modulosHabilitados.logistica && detailsData?.metricas">
  <!-- Contenido del módulo -->
</div>

<!-- Módulo de Producción -->
<div class="operational-module mb-5" *ngIf="modulosHabilitados.produccion">
  <!-- Contenido del módulo -->
</div>

<!-- Módulo Financiero -->
<div class="operational-module mb-5" *ngIf="modulosHabilitados.financiero">
  <!-- Contenido del módulo -->
</div>
```

### **Configuración de Gradientes**

```scss
.bg-gradient-primary   { background: linear-gradient(135deg, #4e73df 0%, #224abe 100%); }
.bg-gradient-secondary { background: linear-gradient(135deg, #6c757d 0%, #545b62 100%); }
.bg-gradient-success   { background: linear-gradient(135deg, #1cc88a 0%, #17a673 100%); }
.bg-gradient-danger    { background: linear-gradient(135deg, #e74a3b 0%, #c0392b 100%); }
.bg-gradient-warning   { background: linear-gradient(135deg, #f6c23e 0%, #dda20a 100%); }
.bg-gradient-info      { background: linear-gradient(135deg, #36b9cc 0%, #258391 100%); }
.bg-gradient-purple    { background: linear-gradient(135deg, #6f42c1 0%, #5a32a0 100%); }
```

### **Responsive Design**

```scss
@media (max-width: 768px) {
  .operational-module {
    margin-bottom: 2rem;
    padding: 1rem;
  }
  
  .module-header .row {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 576px) {
  .operational-module {
    margin-bottom: 1.5rem;
    padding: 0.75rem;
  }
  
  .module-title {
    font-size: 1.2rem;
  }
}
```

---

## <a name="roadmap"></a>🗓️ **Roadmap**

### **Fase 1: Completada ✅**
- [x] Reestructuración modular del dashboard
- [x] Implementación de módulos de Ventas y Logística
- [x] Sistema base de configuración por roles
- [x] Estilos y animaciones mejoradas
- [x] Responsive design optimizado

### **Fase 2: En Desarrollo 🚧**
- [ ] Desarrollo completo del módulo de Producción
- [ ] Integración con APIs de inventario
- [ ] Alertas de stock en tiempo real
- [ ] Métricas de eficiencia operativa

### **Fase 3: Planificada 📋**
- [ ] Módulo Financiero completo
- [ ] Análisis de rentabilidad por producto
- [ ] Flujo de caja y proyecciones
- [ ] Integración con sistemas contables

### **Fase 4: Futuro 🔮**
- [ ] Dashboard personalizable por usuario
- [ ] Widgets arrastrables
- [ ] Exportación de reportes automatizados
- [ ] Notificaciones push por módulo

---

## 📞 **Soporte Técnico**

### **Debugging por Rol**

El sistema incluye logging detallado para depuración:

```javascript
console.log('=== 🎭 CONFIGURACIÓN POR ROL ===');
console.log(`👤 Rol detectado: ${this.rolUsuario}`);
console.log('✅ Módulos habilitados:', this.modulosHabilitados);
```

### **Configuración Manual**

Para testing o configuración manual:

```typescript
// En dashboard.component.ts
this.modulosHabilitados = {
  ventas: true,      // Cambiar según necesidad
  logistica: false,  // Cambiar según necesidad
  produccion: true,  // Cambiar según necesidad
  financiero: false  // Cambiar según necesidad
};
```

### **Extensión de Módulos**

Para agregar nuevos módulos:

1. **Agregar en HTML:** Crear nueva sección con `*ngIf="modulosHabilitados.nuevoModulo"`
2. **Agregar en TypeScript:** Incluir en `modulosHabilitados` y `configurarModulosPorRol()`
3. **Agregar estilos:** Crear gradientes y estilos específicos
4. **Documentar:** Actualizar esta guía

---

## 🎛️ **Funcionalidad de Acordeón**

### **Descripción**
Cada módulo operativo funciona como un **acordeón interactivo**, permitiendo al usuario expandir o contraer el contenido según sus necesidades.

### **Características**
- ✅ **Expansión/Contracción Individual**: Click en el header de cualquier módulo
- ✅ **Controles Globales**: Botones para expandir/colapsar todos los módulos
- ✅ **Animaciones Suaves**: Transiciones CSS optimizadas
- ✅ **Persistencia**: Las preferencias se guardan en localStorage (7 días)
- ✅ **Responsive**: Optimizado para móviles y tablets
- ✅ **Accesibilidad**: Soporte para lectores de pantalla

### **Controles Disponibles**

#### **Controles Individuales**
```html
<!-- Click en cualquier header para alternar -->
<div class="module-header" (click)="toggleModule('ventas')">
  <h3 class="module-title clickable">
    📊 Módulo de Ventas
    <i class="fas fa-chevron-down collapse-icon"></i>
  </h3>
</div>
```

#### **Controles Globales**
- **Expandir Todo**: `expandAll()` - Expande todos los módulos habilitados
- **Colapsar Todo**: `collapseAll()` - Contrae todos los módulos

### **Estado por Defecto**
```typescript
modulosExpandidos = {
  ventas: true,      // ✅ Expandido por defecto (más importante)
  logistica: false,  // ❌ Contraído por defecto  
  produccion: false, // ❌ Contraído por defecto
  financiero: false  // ❌ Contraído por defecto
};
```

### **Integración con Roles**
```typescript
// Ejemplo: Solo módulo de ventas para vendedores
case 'vendedor':
  this.modulosHabilitados = {
    ventas: true,
    logistica: false,
    produccion: false,
    financiero: false
  };
  
  // Auto-expandir el único módulo disponible
  this.modulosExpandidos.ventas = true;
  break;
```

---

**Última actualización:** 26 de Diciembre, 2024  
**Versión:** 1.1.0 - Implementación Acordeón  
**Autor:** Equipo de Desarrollo Katuq  
**Siguiente revisión:** Enero 2025 