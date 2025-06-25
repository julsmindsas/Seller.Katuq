# 🎯 Sistema de Tours Integrado en Katuq - Versión 2.0

## 📖 Descripción General

El **Sistema de Tours de Katuq v2.0** es una solución completa e inteligente que proporciona guías interactivas paso a paso para todos los módulos de la plataforma. Esta versión mejorada incluye tours organizados por categorías, detección automática de contexto, y interfaces modernas con animaciones fluidas.

## ✨ Características Principales

### 🏷️ **Organización por Categorías**
- **Bienvenida**: Tour introductorio general
- **Configuración**: Gestión de empresa, usuarios, roles, procesos
- **Inventarios**: Stock, bodegas, movimientos, traslados
- **Ventas**: Pedidos, clientes, gestión comercial
- **POS**: Punto de venta optimizado
- **Producción**: Control de manufactura y órdenes
- **Logística**: Despachos y seguimiento de envíos
- **Reportes**: Analytics y métricas del negocio

### 🧠 **Inteligencia Contextual**
- Tours relevantes según la página actual
- Auto-detección de módulos disponibles
- Navegación automática a secciones requeridas
- Sistema de memoria para tours completados

### 🎨 **Interfaz Moderna**
- Diseño responsive y mobile-friendly
- Animaciones suaves y microinteracciones
- Soporte para modo oscuro
- Gradientes y efectos visuales modernos

### 📊 **Sistema de Progreso**
- Seguimiento de tours completados
- Badges de notificación para tours nuevos
- Indicadores de dificultad (Principiante, Intermedio, Avanzado)
- Contador de pasos y progreso visual

## 🛠️ Implementación Técnica

### Archivos del Sistema

```
src/app/shared/
├── services/tour/
│   └── tour.service.ts                    # 🔧 Servicio principal (15+ tours)
├── components/tour-button/
│   ├── tour-button.component.ts          # 🎛️ Componente inteligente
│   ├── tour-button.component.html        # 🎨 UI por categorías
│   └── tour-button.component.scss        # ✨ Estilos modernos + animaciones
└── shared.module.ts                       # 📦 Registro del módulo

src/assets/scss/components/
└── _tour.scss                            # 🎭 Temas personalizados Driver.js
```

### Tours Disponibles (15+ Guías)

#### 🏠 **Bienvenida**
- `welcome-katuq`: Introducción completa a la plataforma

#### ⚙️ **Configuración**
- `config-empresa`: Datos básicos de empresa y sedes
- `config-modulos-variables`: Procesos de producción y centros de trabajo
- `config-procesos`: Géneros, ocasiones, variables y canales
- `config-formas-entrega`: Métodos y horarios de entrega
- `config-usuarios`: Gestión de usuarios del sistema
- `config-roles`: Configuración de roles y permisos

#### 📦 **Inventarios**
- `inventarios-gestion`: Control de stock y bodegas
- `inventarios-bodegas`: Administración de ubicaciones
- `inventarios-recepcion`: Entrada de mercancía
- `inventarios-traslados`: Movimientos entre bodegas

#### 💰 **Ventas**
- `ventas-gestion`: Proceso completo de ventas
- `ventas-clientes`: Base de datos de clientes

#### 🏪 **Punto de Venta**
- `pos-ventas`: Sistema POS optimizado

#### 🏭 **Producción**
- `produccion-dashboard`: Control y monitoreo

#### 🚛 **Logística**
- `despachos-gestion`: Entregas y transportadores

#### 📊 **Analytics**
- `dashboard-reportes`: Métricas y KPIs

## 🚀 Uso del Sistema

### Para Usuarios

#### 1. **Acceso al Sistema**
- Botón circular con ❓ en la barra superior
- Badge rojo indica tours nuevos disponibles
- Clic para abrir menú de tours

#### 2. **Selección de Tours**
- Tours organizados por categoría con colores únicos
- Indicadores de dificultad y número de pasos
- Estado de completado visible

#### 3. **Experiencia de Tour**
- Navegación automática a secciones requeridas
- Pasos adaptativos según elementos disponibles
- Controles intuitivos: Siguiente, Anterior, Completar

#### 4. **Progreso y Seguimiento**
- Memoria persistente de tours completados
- Contador de progreso en footer del menú
- Tours relevantes destacados por página

### Para Desarrolladores

#### Agregar Nuevo Tour

```typescript
// En tour.service.ts - método getAvailableTours()
{
  id: 'mi-nuevo-tour',
  name: 'Mi Nuevo Tour',
  description: 'Descripción detallada del tour',
  category: 'configuration', // Categoría existente
  icon: 'fa-cog', // Icono FontAwesome
  difficulty: 'beginner', // beginner | intermediate | advanced
  requiredRoute: '/mi-ruta', // Opcional: ruta específica
  steps: [
    {
      element: '[data-tour="mi-elemento"]',
      popover: {
        title: 'Título del Paso 🎯',
        description: 'Descripción detallada con emojis y contexto.',
        side: 'bottom', // top | bottom | left | right
        align: 'center' // start | center | end
      }
    }
    // ... más pasos
  ]
}
```

#### Agregar Elementos al DOM

```html
<!-- Marcar elementos para tours -->
<div data-tour="mi-elemento" class="mi-componente">
  <!-- contenido -->
</div>

<button data-tour="mi-accion" class="btn btn-primary">
  Mi Acción
</button>
```

#### API del Servicio

```typescript
import { TourService } from './shared/services/tour/tour.service';

// Inyectar servicio
constructor(private tourService: TourService) {}

// Métodos principales
tourService.startTour('tour-id');                    // Iniciar tour específico
tourService.stopCurrentTour();                       // Detener tour actual
tourService.isActive();                              // Verificar si hay tour activo
tourService.getToursForCurrentRoute();               // Tours para ruta actual
tourService.getAllTours();                           // Todos los tours
tourService.getToursByCategory('configuration');     // Tours por categoría
tourService.isTourCompleted('tour-id');              // Verificar completado
tourService.resetSeenTours();                        // Reiniciar (desarrollo)
```

## 🎨 Personalización

### Colores de Categorías

```typescript
// En tour-button.component.ts
public categories = {
  welcome: { name: 'Bienvenida', icon: 'fa-star', color: '#ffd700' },
  configuration: { name: 'Configuración', icon: 'fa-cog', color: '#6c757d' },
  inventory: { name: 'Inventarios', icon: 'fa-boxes', color: '#20c997' },
  // ... más categorías
};
```

### Estilos Personalizados

```scss
// En tour-button.component.scss
.tour-button {
  // Personalizar botón principal
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  &.tour-active {
    // Estado activo
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  }
}

.tour-menu {
  // Personalizar menú
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
```

### Temas Driver.js

```scss
// En _tour.scss
.driverjs-theme {
  .driver-popover {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 12px;
  }
}
```

## 📱 Responsive y Accesibilidad

### Breakpoints Móviles
- **Tablet (768px)**: Menú adaptado, botones más grandes
- **Móvil (480px)**: Layout compacto, textos optimizados

### Características de Accesibilidad
- Navegación por teclado completa
- Roles ARIA apropiados
- Contraste de colores WCAG AA
- Textos descriptivos y claros

## 🔧 Configuración Avanzada

### Variables de Entorno

```typescript
// En environment.ts
export const environment = {
  tours: {
    autoStart: true,           // Auto-iniciar tour de bienvenida
    enableDevelopmentTools: false, // Botón de reset
    defaultLanguage: 'es',     // Idioma por defecto
    animationSpeed: 300        // Velocidad de animaciones
  }
};
```

### Personalización de Comportamiento

```typescript
// En tour.service.ts - initializeDriver()
const config: Config = {
  animate: true,
  smoothScroll: true,
  showProgress: true,
  allowClose: true,
  nextBtnText: 'Siguiente →',
  prevBtnText: '← Anterior',
  doneBtnText: '¡Completado! ✓',
  // ... más configuraciones
};
```

## 🧪 Testing y Desarrollo

### Comandos de Desarrollo

```bash
# Ejecutar con tours habilitados
ng serve

# Compilar para producción
ng build --prod

# Reiniciar tours en localStorage
localStorage.removeItem('katuq_completed_tours');
```

### Debugging Tours

```typescript
// Habilitar logs detallados
console.log('Tours disponibles:', this.tourService.getAllTours());
console.log('Tour activo:', this.tourService.isActive());
console.log('Tours completados:', this.tourService.getCompletedTours());
```

## 🚨 Solución de Problemas

### Problemas Comunes

#### Tour no inicia
- ✅ Verificar que los elementos `data-tour` existan en el DOM
- ✅ Comprobar que la ruta coincida con `requiredRoute`
- ✅ Revisar console para errores de Driver.js

#### Elementos no encontrados
- ✅ Asegurar que los selectores CSS sean correctos
- ✅ Verificar timing - elementos cargados después de tours
- ✅ Usar `setTimeout` para elementos dinámicos

#### Estilos no aplicados
- ✅ Importar `_tour.scss` en `styles.scss`
- ✅ Verificar especificidad CSS
- ✅ Comprobar conflictos con Bootstrap/PrimeNG

### Errores de Compilación

```bash
# Si faltan dependencias
npm install driver.js @angular/cdk@14 --legacy-peer-deps

# Si hay conflictos de tipos
npm install @types/driver.js --save-dev
```

## 🔮 Roadmap Futuro

### Versión 2.1 (Próxima)
- [ ] 🌐 Soporte multiidioma (inglés, português)
- [ ] 📊 Analytics de uso de tours
- [ ] 🎥 Tours con video embebido
- [ ] 🔄 Actualización automática de tours

### Versión 2.2 (Futura)
- [ ] 🤖 Tours adaptativos con IA
- [ ] 📱 App móvil nativa con tours
- [ ] 🎮 Gamificación y logros
- [ ] 📈 Métricas de efectividad

## 📊 Métricas de Rendimiento

### Impacto en Bundle
- **Driver.js**: ~4KB gzipped
- **Tours Service**: ~15KB
- **Componente**: ~8KB
- **Estilos**: ~12KB
- **Total**: ~39KB adicionales

### Tiempo de Carga
- Lazy loading por ruta
- Componentes bajo demanda
- Optimización de imágenes y assets

## 🎉 Conclusión

El **Sistema de Tours v2.0** de Katuq representa una evolución significativa en la experiencia de usuario, proporcionando:

- ✨ **15+ tours especializados** para todas las áreas
- 🎯 **Inteligencia contextual** avanzada  
- 🎨 **UX moderna** con animaciones fluidas
- 📱 **Responsive** para todos los dispositivos
- ⚙️ **Configuración flexible** para desarrolladores
- 📈 **Escalabilidad** para futuros módulos

Este sistema transforma la curva de aprendizaje de Katuq en una experiencia guiada, intuitiva y eficiente, acelerando la adopción de usuarios y reduciendo la necesidad de soporte técnico.

---

**Desarrollado con ❤️ para el equipo Katuq**  
*Versión 2.0 - Junio 2024* 