# Documentación Katuq Seller

Esta carpeta contiene toda la documentación técnica y funcional del proyecto Katuq Seller, organizada por categorías para facilitar su búsqueda.

## Estructura de Carpetas

### 📦 `/features` - Funcionalidades y Módulos
Documentación de funcionalidades específicas del sistema.

#### `/features/agendamiento`
- Sistema de agendamiento de citas y servicios
- Acceso y gestión de citas

#### `/features/video-agent`
- Agente de video con IA (Gemini)
- UI para adultos mayores
- Mejoras y correcciones
- Migración y actualizaciones

#### `/features/gemini-asistant`
- Asistente de voz con Gemini Live API
- Efectos visuales (Sphere Visual)
- Integración con inventario
- Análisis comparativo con Video Agent

#### `/features/tours`
- Sistema de tours guiados en la aplicación
- Implementación de guías interactivas

#### `/features/operadores`
- Sistema de operadores y gestión de usuarios

### 🔌 `/integraciones` - Integraciones Externas
Documentación de integraciones con servicios externos.

#### `/integraciones/siigo`
- Integración con Siigo (contabilidad)
- Quickstart y guías de frontend

#### `/integraciones/dropshipping`
- Guías de dropshipping
- Mapas de flujo y arquitectura

#### `/integraciones/pagos`
- Pasarelas de pago
- Notificaciones

### 🏗️ `/arquitectura` - Arquitectura y Modelos
Documentación de arquitectura del sistema.

- Modelos de datos (Pedidos, Inventarios, Logística)
- Interfaces y endpoints de Angular
- Arquitectura de inventarios

### 🎨 `/ui-ux` - Diseño y UX
Documentación de diseño y experiencia de usuario.

- Guías de dashboard y módulos
- Mejoras de diseño
- Responsive design para móviles
- Mejoras de sidebar
- UX de módulo de despachos
- Optimización de tipografía

### 📚 `/guias` - Guías y Tutoriales
Guías de uso, desarrollo y troubleshooting.

- Quickstart de estructuras de módulos
- Troubleshooting de autenticación
- Demo móvil rápida
- Performance improvements
- Métricas y cálculos monetarios

### 🔄 `/migraciones` - Migraciones y Actualizaciones
Documentación de migraciones, cambios de formato y actualizaciones.

- Cambios de formato de pedidos
- Correcciones de formato en ventas
- Resumen ejecutivo de migraciones
- Resúmenes de correcciones

### 📊 `/auditorias` - Auditorías y Reportes
Auditorías del sistema y reportes de estado.

- Auditoría de estados de órdenes

## Archivos en Raíz Principal

Los siguientes archivos permanecen en la raíz del proyecto por ser críticos:

- `README.md` - Información principal del proyecto
- `CHANGELOG.md` - Registro de cambios del proyecto
- `CLAUDE.md` - Instrucciones para Claude Code

## Convenciones

- Todos los archivos están en formato Markdown (.md)
- Los nombres de archivo usan SCREAMING_SNAKE_CASE para documentos importantes
- Las imágenes y diagramas se guardan junto a su documentación relacionada
- Se mantiene un índice en este README para facilitar la navegación

## Contribuir a la Documentación

Al crear nueva documentación:

1. **Identifica la categoría correcta** según el contenido
2. **Usa nombres descriptivos** que indiquen claramente el contenido
3. **Incluye un índice** si el documento es largo
4. **Actualiza este README** si creas una nueva categoría

## Historial de Organización

- **2025-10-28**: Reorganización completa de documentación en subcarpetas por categoría
