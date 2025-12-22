# Changelog

Todos los cambios notables en Katuq serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto sigue [Versionado basado en fecha](./VERSIONADO.md).

## [2.0.0] - 26 de Diciembre 2024 - Diseño Visual Modernizado

### 🎨 Añadido - Revolución del Diseño Visual
- **Iconografía SVG Personalizada**: 6 iconos SVG únicos creados para cada módulo operativo
  - `sales-chart.svg` - Gráfico de ventas con gradiente azul-púrpura y puntos animados
  - `logistics-truck.svg` - Camión logístico con líneas de velocidad y detalles precisos
  - `production-gear.svg` - Engranajes interconectados con animación sutil
  - `financial-chart.svg` - Símbolo financiero con gráficos de barras integrados
  - `robot-ai.svg` - Robot K.A.I. moderno con antena y partículas de datos
  - `trophy-star.svg` - Trofeo estrella dorado con efectos de brillo

### 📊 Mejorado - Gráficos y Visualización
- **ApexCharts Profesionalizados**: Configuraciones avanzadas para todos los gráficos
  - Altura optimizada a 350px para mejor visualización y detalle
  - Gradientes personalizados con colorStops avanzados y transiciones suaves
  - Tooltips rediseñados con tipografía Inter y sombras profesionales
  - Grids personalizados con líneas dash suaves y mejor contraste
  - Animaciones graduales con timing functions naturales (1200ms)
  - Toolbars habilitados con controles de zoom, pan y descarga

### 🏗️ Mejorado - Arquitectura y Layout
- **Módulos Operativos Rediseñados**:
  - Border-radius aumentado a 20px para formas más orgánicas
  - Barra superior multicolor con gradiente de identificación visual
  - Sombras dinámicas que evolucionan en estados hover
  - Padding optimizado a 2rem para mejor respiración del contenido
  - Efectos glassmorphism con overlays gradiente sutiles

### 🎯 Mejorado - Componentes y Cards
- **KPI Cards Premium con Micro-interacciones**:
  - Overlay gradiente glassmorphism para profundidad visual
  - Transformaciones complejas combinando scale(1.02) + translateY(-8px)
  - Iconos con rotación (10deg) y escala (1.1) en hover
  - Sombras profundas (0 25px 50px) para efectos de elevación
  - Transiciones cubic-bezier optimizadas para naturalidad

- **Chart Cards Modernizadas**:
  - Headers con overlay divisorio sutil usando pseudo-elementos
  - Background gradiente en card-body para transición suave
  - Text-shadow aplicado en títulos para mejor contraste
  - Border-radius unificado a 16px en toda la interfaz

### 🔄 Añadido - Animaciones e Interacciones
- **Sistema de Animaciones Avanzado**:
  - Timing functions cubic-bezier(0.4, 0, 0.2, 1) para movimientos naturales
  - Transform effects combinados: translateY, scale y rotate
  - Staggered animations con retrasos progresivos de 150ms
  - Hardware acceleration habilitada con transform3d
  - Animaciones graduales activadas bajo demanda en viewport

### 🎨 Cambiado - Paleta de Colores y Tipografía
- **Sistema de Colores Profesional**:
  - Textos actualizados: #1f2937 (primary), #64748b (secondary), #9ca3af (muted)
  - Bordes redefinidos: #e2e8f0 (light) para mayor sutileza
  - Fondos optimizados: #ffffff (cards), #f8f9fa (subtle backgrounds)
- **Tipografía Sistemática**: Inter como fuente principal con fallbacks del sistema
- **Variables CSS**: Sistema de design tokens para border-radius y shadows

### 📱 Mejorado - Diseño Responsivo
- **Responsive Excellence con Mobile-First**:
  - Breakpoints optimizados: 576px (mobile), 768px (tablet), 1200px (desktop)
  - Iconos SVG escalados adaptativamente según tamaño de pantalla
  - Espaciado fluido con margins y paddings responsivos
  - Touch targets optimizados: mínimo 44px para interacciones móviles

### ⚡ Añadido - Optimizaciones de Performance
- **CSS de Alto Rendimiento**:
  - Will-change y contain aplicados para aislamiento de layout
  - Transform3d habilitado para aceleración de hardware
  - Lazy loading implementado para iconos SVG y animaciones
  - Reduced reflows: animaciones que no afectan el layout base

### 📚 Añadido - Documentación Técnica
- **DASHBOARD_DESIGN_IMPROVEMENTS.md**: Documentación completa de 15 páginas
- **SVG Assets Guide**: Guía detallada de implementación de iconografía
- **Performance Metrics**: Métricas cuantificadas de mejora UX
- **Roadmap Design**: Planificación de futuras mejoras visuales Q1 2025

## [2025.04.30.1] - 30 de Abril 2025

### Añadido
- Conversión automática de imágenes a formato WebP para productos, mejorando la eficiencia y velocidad de carga
- Optimización en el proceso de carga de imágenes, manteniendo las originales que ya están en formato WebP
- Mejoras en la gestión de la interfaz de usuario durante la carga de imágenes con indicador de progreso optimizado
- Deshabilitar botón de guardar durante el proceso de carga de imágenes para prevenir errores

### Mejorado
- Gestión del estado de carga de imágenes para evitar operaciones paralelas conflictivas
- Mensajes de error más descriptivos durante los procesos de carga y conversión de imágenes

## [2025.04.29.4] - 29 de Abril 2025

### Añadido
- Sistema de canales de ventas asignando multiples bodegas

## [2025.04.29.1] - 29 de Abril 2025

### Añadido
- Sistema de versionado automático basado en fecha (AAAA.MM.DD.N)
- Automatización del proceso de actualización de versiones mediante `update-version.js`
- Documentación del sistema de versionado en `VERSIONADO.md`
- Nuevo formato de CHANGELOG para seguimiento de cambios
- [Cambios del commit feat(recepcion-mercancia): actualizar manejo de tipos de movimiento y permitir cambio manual de cantidad] <!-- Por favor, reemplaza esto con el mensaje real del commit -->

### Cambiado
- Formato de versión en archivos de entorno de "X.Y.Z - DD de Mes AAAA (Beta)" a "AAAA.MM.DD.N - DD de Mes AAAA (Beta)"
- Scripts en `package.json` para soportar la actualización automática de versiones

## [8.5.7] - 28 de Abril 2025

### Añadido
- [Describir funcionalidades añadidas en esta versión]

### Cambiado
- [Describir cambios realizados en funcionalidades existentes]

### Arreglado
- [Describir bugs arreglados]

### Eliminado
- [Describir funcionalidades eliminadas]

## [8.5.6] - 27 de Abril 2025

### Añadido
- [Describir funcionalidades añadidas]

### Cambiado
- [Describir cambios]

### Arreglado
- [Describir correcciones]

## [1.5.0] - 2024-12-26

### ✨ Agregado
- **Dashboard Modular por Áreas Operativas**: Reorganización completa del dashboard en módulos independientes
  - 📊 **Módulo de Ventas**: Tendencia de ventas, productos estrella, categorías, métodos de pago, K.A.I. insights
  - 🚚 **Módulo de Logística**: Eficiencia de entregas, cobertura geográfica, métricas de distribución
  - 🏭 **Módulo de Producción**: Preparado para control de inventarios y optimización (próximamente)
  - 💰 **Módulo Financiero**: Gestión de descuentos, análisis de rentabilidad (en desarrollo)

- **Sistema de Roles Inteligente**: Configuración automática de módulos visibles según rol del usuario
  - Soporte para roles: Vendedor, Logística, Producción, Administrador
  - Detección automática desde localStorage
  - Logging detallado para debugging

- **Mejoras Visuales Significativas**:
  - Headers diferenciados con iconos y colores por módulo
  - Badges identificativos por área operativa
  - Gradientes modernos y animaciones suaves
  - Cards mejoradas con mejor jerarquía visual
  - Responsive design optimizado para móviles

### 🔧 Mejorado
- **Arquitectura de Componentes**: Separación clara entre módulos operativos
- **Estilos SCSS**: Nueva estructura modular con clases específicas
- **Performance**: Carga progresiva y renderizado condicional
- **UX**: Información más relevante y mejor organizada por contexto laboral

### 📝 Documentación
- **Nueva guía completa**: `docs/DASHBOARD_MODULES_GUIDE.md`
- **Roadmap definido**: Fases de desarrollo y próximas funcionalidades
- **Guía técnica**: Implementación, configuración y extensión de módulos

### 🏗️ Infraestructura
- **Preparación para escalabilidad**: Base sólida para futuras funcionalidades
- **Sistema extensible**: Fácil agregado de nuevos módulos operativos
- **Configuración flexible**: Personalización por rol sin cambios de código

## [1.4.2] - 2024-12-26

### 🔧 Mejorado

## Guía para mantener el Changelog

Cada versión debe:
1. **Mostrar la fecha** de publicación en formato "DD de Mes AAAA"
2. **Agrupar los cambios** según su propósito bajo las siguientes categorías:
   - `Añadido` para nuevas características
   - `Cambiado` para cambios en funcionalidades existentes
   - `Obsoleto` para características que serán eliminadas próximamente
   - `Eliminado` para características eliminadas
   - `Arreglado` para correcciones de bugs
   - `Seguridad` para actualizaciones de seguridad

3. **Mantener un lenguaje sencillo y directo**, centrándose en los cambios que afectan a los usuarios
4. **Actualizar este archivo con cada versión nueva**, completando las secciones con información real de los cambios realizados

---

*Documentación mantenida por el equipo de desarrollo de Katuq*