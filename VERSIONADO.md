# Sistema de Versionado Automático para Katuq

## Descripción General

Este documento explica el sistema de versionado automático implementado para Katuq. El sistema utiliza un formato basado en fecha que se actualiza automáticamente con cada compilación, facilitando el seguimiento de las diferentes versiones y releases del software.

## Formato de Versión

El formato de versión utilizado es:

```
AAAA.MM.DD.N - DD de Mes AAAA (Etapa)
```

Donde:
- **AAAA**: Año de la versión (4 dígitos)
- **MM**: Mes de la versión (2 dígitos)
- **DD**: Día de la versión (2 dígitos)
- **N**: Número de build del día (incrementa automáticamente)
- **Etapa**: Indica la etapa del desarrollo (Beta, RC, Stable, etc.)

### Ejemplo:
```
2025.04.29.3 - 29 de Abril 2025 (Beta)
```

## Funcionamiento

El sistema consiste en:

1. **Script de actualización automática**: Un archivo `update-version.js` que:
   - Determina la fecha actual
   - Extrae la versión actual de los archivos de entorno
   - Si la compilación es del mismo día, incrementa el número de build
   - Si es un día nuevo, reinicia el contador a 1
   - Actualiza la fecha en formato legible
   - Actualiza la versión en todos los archivos de entorno

2. **Integración en flujo de trabajo**: El script se ejecuta automáticamente:
   - Antes de cada compilación (`prebuild`)
   - Como parte de los comandos compuestos definidos en `package.json`

## Uso en el Proyecto

### Comandos Disponibles

En `package.json` se han configurado los siguientes comandos para gestionar versiones:

| Comando | Descripción |
|---------|-------------|
| `npm run update-version` | Actualiza solo la versión |
| `npm run actualizar-compilar` | Actualiza versión y compila para desarrollo |
| `npm run actualizar-compilar-prod` | Actualiza versión y compila para producción |
| `npm run release` | Actualiza versión, ejecuta linting y compila para producción |

### Ejecución Manual

Para actualizar la versión manualmente:

```bash
npm run update-version
```

### Ejecución Automática

La versión se actualiza automáticamente cuando:

1. Se ejecuta `npm run build` (desarrollo)
2. Se ejecuta `npm run build:prod` (producción)
3. Se realiza un release con `npm run release`

## Beneficios del Sistema

- **Trazabilidad**: Cada versión contiene la fecha exacta de compilación
- **Consistencia**: Formato uniforme en todas las versiones
- **Automatización**: No es necesario actualizar manualmente los números de versión
- **Simplicidad**: Fácil de entender y rastrear para todos los miembros del equipo
- **Cronológico**: Permite ordenar las versiones cronológicamente
- **Identificación**: Facilita la identificación de la versión específica para soporte y debugging

## Visualización en la Aplicación

La versión se muestra en la interfaz de usuario en:
- La barra lateral
- La página de inicio de sesión

## Personalización

Si se requiere modificar el formato de versión o agregar información adicional, editar el archivo `update-version.js` que contiene toda la lógica del versionado.

## Preguntas Frecuentes

### ¿Por qué usar una versión basada en fecha?

Para aplicaciones con actualizaciones diarias, el versionado semántico tradicional (MAJOR.MINOR.PATCH) puede resultar complejo de mantener. Un formato basado en fecha proporciona un contexto temporal inmediato.

### ¿Cómo identificar cambios importantes?

Para cambios importantes que rompen compatibilidad, considerar añadir una etiqueta específica adicional a la versión o documentar estos cambios en un archivo CHANGELOG.md.

### ¿Qué hacer si se requieren múltiples builds en un día?

El sistema incrementa automáticamente el número de build (último dígito) cada vez que se ejecuta en el mismo día, permitiendo diferenciar entre versiones del mismo día.

---

*Documentación creada para el equipo de desarrollo de Katuq - Abril 2025*