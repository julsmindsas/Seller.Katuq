# Katuq Flow CRM Module

## Descripción General

El módulo **Katuq Flow CRM** es un sistema de gestión de leads capturados desde la aplicación móvil Katuq Flow. Permite visualizar, filtrar y gestionar los leads generados por el sistema de CRM móvil con transcripción de voz y otros canales de captación.

## Características Principales

### 🎯 Gestión de Leads
- **Visualización completa** de leads con información detallada
- **Filtros avanzados** por empresa, estado, fuente, fechas y búsqueda general
- **Estados de seguimiento**: Nuevo, En Proceso, Contactado, Calificado, Convertido, Perdido
- **Estadísticas en tiempo real** con métricas de conversión

### 📊 Dashboard de Estadísticas
- Resumen visual con cards de estadísticas
- Distribución por estados de lead
- Actividad reciente (últimos 7 días)
- Métricas por fuente de captación

### 🔄 Sincronización
- Conexión directa con API del CRM móvil
- Sincronización manual y automática
- Manejo de errores y estados de carga

### 📱 Responsive Design
- Diseño adaptativo para todas las pantallas
- Interfaz optimizada para tablets y móviles
- Componentes de PrimeNG para consistencia visual

## Estructura del Módulo

```
katuq-flow/
├── components/
│   └── leads-list/           # Componente principal de listado
├── interfaces/
│   └── crm-lead.interface.ts # Definición de tipos TypeScript
├── services/
│   └── katuq-flow.service.ts # Servicio para API y lógica de negocio
├── mock-data/
│   └── example-leads.json    # Datos de ejemplo para desarrollo
├── katuq-flow-routing.module.ts
├── katuq-flow.module.ts
└── README.md
```

## API Endpoints

### Obtener Leads (Simple)
```http
GET /v1/crm-movil/leads/simple
```

**Parámetros disponibles:**
- `page`: Número de página (default: 1)
- `limit`: Límite por página (default: 100)
- `status`: Filtrar por estado
- `search`: Búsqueda de texto
- `source`: Filtrar por fuente
- `date_from`: Desde fecha (YYYY-MM-DD)
- `date_to`: Hasta fecha (YYYY-MM-DD)
- `assigned_to`: Filtrar por usuario asignado

**Respuesta:**
```json
[
  {
    "mobile_id": 8,
    "name": "Cristian",
    "email": "didáctica@gmail.com",
    "phone": "3243945454",
    "company": "julsmind",
    "status": "Nuevo",
    "source": "Transcripción de voz - Lead directo",
    "summary": "🎯 REFERENCIA A NUESTRA EMPRESA...",
    "created_at": "2025-08-19T11:16:15.709345",
    "created_by": "system",
    "updated_at": "2025-08-24T17:14:10.872Z",
    "last_called": "2025-08-19T11:16:21.092786",
    "last_sync": "2025-08-24T17:14:10.872Z",
    "sync_user": "dgarciah@julsmind.com"
  }
]
```

### Actualizar Estado de Lead
```http
PUT /v1/crm-movil/leads/{mobile_id}/status
```

**Body:**
```json
{
  "status": "Contactado"
}
```

## Modelo de Datos

### CrmLead Interface
```typescript
interface CrmLead {
  mobile_id: number;           // ID único del lead
  name: string;               // Nombre del contacto
  email: string;              // Email del lead
  phone: string;              // Teléfono del lead
  company: string;            // Empresa del usuario registrante
  status: LeadStatus;         // Estado actual del lead
  source: string;             // Fuente de origen
  summary: string;            // Resumen del lead
  created_at: string;         // Fecha de creación
  created_by: string;         // Usuario/sistema creador
  updated_at: string;         // Última actualización
  last_called?: string;       // Última llamada
  last_sync: string;          // Última sincronización
  sync_user: string;          // Usuario de sincronización
}
```

### Estados de Lead (LeadStatus)
- **Nuevo**: Lead recién capturado, sin contactar
- **En Proceso**: Lead en proceso de evaluación/contacto
- **Contactado**: Lead contactado exitosamente
- **Calificado**: Lead calificado como oportunidad real
- **Convertido**: Lead convertido en cliente
- **Perdido**: Lead perdido/descartado

## Uso del Módulo

### 1. Navegación
El módulo está disponible en el menú principal bajo:
```
Gestión Comercial > Katuq Flow CRM > Gestión de Leads
```

### 2. Filtros Disponibles
- **Búsqueda general**: Busca en nombre, email, teléfono y resumen
- **Empresa**: Filtra por empresa específica
- **Estado**: Filtra por estado del lead
- **Fuente**: Filtra por canal de captación
- **Rango de fechas**: Filtra por período de creación

### 3. Acciones Disponibles
- **Ver detalles**: Información completa del lead
- **Cambiar estado**: Actualización del estado de seguimiento
- **Sincronizar**: Actualización manual de datos
- **Exportar**: Descarga de datos (próximamente)

## Configuración de Desarrollo

### Variables de Entorno
El módulo utiliza la configuración de `environment.ts`:
```typescript
environment: {
  urlApi: 'https://api.katuq.com' // URL base de la API
}
```

### Modo Mock (Solo Desarrollo)
En modo desarrollo, se puede alternar entre datos mock y API real:
```typescript
// En el servicio
katuqFlowService.toggleMockMode(true);  // Usar mock data
katuqFlowService.toggleMockMode(false); // Usar API real
```

### Instalación de Dependencias
El módulo requiere las siguientes dependencias de PrimeNG:
- `primeng/table`
- `primeng/dropdown`
- `primeng/calendar`
- `primeng/tag`
- `primeng/toast`
- `primeng/confirmdialog`
- `primeng/accordion`
- `primeng/button`

## Consideraciones de Seguridad

### Autenticación
- El módulo requiere autenticación válida (`AuthGuard`)
- Los endpoints de la API requieren tokens válidos
- La empresa del usuario determina los leads visibles

### Permisos
- Filtrado automático por empresa del usuario
- Solo usuarios autorizados pueden cambiar estados
- Logs de auditoría para cambios de estado

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] **Detalle completo de lead**: Modal/página con información extendida
- [ ] **Historial de actividades**: Registro de todas las interacciones
- [ ] **Asignación de leads**: Asignar leads a usuarios específicos
- [ ] **Exportación avanzada**: Excel, PDF con filtros aplicados
- [ ] **Notificaciones**: Alertas para leads sin actividad
- [ ] **Dashboard avanzado**: Gráficos y métricas detalladas
- [ ] **Integración con calendarios**: Programar seguimientos
- [ ] **Templates de email**: Respuestas rápidas automatizadas

### Optimizaciones Técnicas
- [ ] **Paginación virtual**: Para grandes volúmenes de datos
- [ ] **Cache inteligente**: Reducir llamadas a la API
- [ ] **Websockets**: Actualizaciones en tiempo real
- [ ] **PWA features**: Funcionamiento offline limitado

## Contribución

### Estructura de Commits
```
feat(katuq-flow): agregar filtro por fuente
fix(katuq-flow): corregir paginación en tabla
docs(katuq-flow): actualizar documentación de API
```

### Testing
```bash
# Ejecutar tests unitarios
ng test --project=katuq-flow

# Ejecutar tests e2e
ng e2e --project=katuq-flow
```

### Code Review Checklist
- [ ] Interfaces TypeScript actualizadas
- [ ] Manejo de errores implementado
- [ ] Responsive design verificado
- [ ] Documentación actualizada
- [ ] Tests unitarios incluidos

## Soporte

Para soporte técnico o reportar bugs:
- **Email**: dev@julsmind.com
- **Slack**: #katuq-flow-support
- **Documentación técnica**: [Wiki interno]

---

**Última actualización**: Agosto 2025  
**Versión del módulo**: 1.0.0  
**Compatibilidad**: Angular 14+, PrimeNG 14+