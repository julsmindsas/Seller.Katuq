# Documentación Katuq Seller Platform

Esta carpeta contiene la documentación técnica completa de la plataforma Katuq Seller.

## 📚 Índice de Documentos

### 1. [RESUMEN_KATUQ.md](./RESUMEN_KATUQ.md)
**Resumen completo de la plataforma Katuq**

Contenido:
- Visión general del sistema
- Arquitectura y stack tecnológico
- Módulos funcionales principales
- Servicios core y arquitectura
- Sistema de notificaciones inteligente
- Modelos de datos principales
- Características distintivas
- Flujos de trabajo típicos

**Ideal para**: Entender qué es Katuq y cómo funciona el sistema completo.

---

### 2. [ENDPOINTS_API_KATUQ.md](./ENDPOINTS_API_KATUQ.md)
**Catálogo completo de endpoints de la API**

Contenido:
- 292 endpoints documentados
- 37 categorías funcionales
- Diagramas de flujo de arquitectura
- Patrones de integración
- Mejores prácticas
- Endpoints críticos por módulo

**Ideal para**: Desarrolladores que necesitan integrar con la API o entender los endpoints disponibles.

---

## 🎯 Uso Recomendado

### Para Nuevos Desarrolladores
1. Leer primero `RESUMEN_KATUQ.md` para entender el sistema
2. Revisar `ENDPOINTS_API_KATUQ.md` para conocer la API

### Para Integraciones
1. Consultar `ENDPOINTS_API_KATUQ.md` directamente
2. Buscar el módulo específico (Orders, Products, Inventory, etc.)
3. Revisar los patrones de integración

### Para Análisis de Arquitectura
1. Revisar los diagramas en `ENDPOINTS_API_KATUQ.md`
2. Leer la sección de arquitectura en `RESUMEN_KATUQ.md`
3. Consultar modelos de datos en `RESUMEN_KATUQ.md`

---

## 📊 Estadísticas

- **Total de Endpoints Documentados**: 292
- **Módulos Principales**: 10
- **Servicios Analizados**: 11
- **Modelos de Datos**: 30+
- **Categorías API**: 37

---

## 🔄 Última Actualización

**Fecha**: 2025-01-08
**Versión Katuq**: 1.1.0
**Framework**: Angular 14.3.0
**API Version**: v1

---

## 📝 Notas

Esta documentación fue generada mediante análisis del código fuente y está sincronizada con la implementación actual de la plataforma.

Para consultas o actualizaciones, referirse al código fuente en:
- `src/app/shared/services/` - Servicios y endpoints
- `src/app/shared/models/` - Modelos de datos
- `src/app/components/` - Módulos funcionales
