# Changelog

Todos los cambios notables en Katuq serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto sigue [Versionado basado en fecha](./VERSIONADO.md).

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