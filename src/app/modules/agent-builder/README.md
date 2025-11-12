# Agent Builder Module

Sistema de creación y gestión de agentes IA para Katuq Seller Platform.

## Descripción

El módulo Agent Builder permite a los usuarios crear, configurar y ejecutar agentes de inteligencia artificial personalizados para automatizar tareas en diferentes departamentos (Ventas, Logística, Inventario).

## Estructura del Módulo

```
agent-builder/
├── shared/
│   ├── models/
│   │   ├── agent.model.ts       # Interfaces de Agentes
│   │   └── tool.model.ts        # Interfaces de Herramientas
│   └── services/
│       ├── agent.service.ts     # Servicio HTTP para agentes
│       └── tool-catalog.service.ts  # Catálogo de herramientas
├── wizard/
│   ├── wizard.component.*       # Wizard principal (4 pasos)
│   ├── step-basic-info/         # Paso 1: Información básica
│   ├── step-prompt/             # Paso 2: System prompt
│   ├── step-tools/              # Paso 3: Selección de herramientas
│   └── step-review/             # Paso 4: Revisión y creación
├── library/
│   ├── library.component.*      # Listado de agentes
│   └── agent-card/              # Card estilo Pokémon
├── executor/
│   └── executor.component.*     # Interfaz de ejecución
├── agent-builder.component.ts   # Componente raíz
├── agent-builder-routing.module.ts  # Routing
├── agent-builder.module.ts      # Module principal
└── README.md                    # Esta documentación
```

## Rutas

- `/agent-builder` → Redirige a `/agent-builder/library`
- `/agent-builder/library` → Librería de agentes creados
- `/agent-builder/wizard` → Wizard de creación de agente
- `/agent-builder/executor/:id` → Interfaz de ejecución de agente

## Características Principales

### 1. Wizard de Creación (4 Pasos)

#### Step 1: Información Básica
- Nombre del agente
- Departamento (Ventas, Logística, Inventario)
- Descripción (opcional)
- Modelo IA (Gemini 2.5 Flash/Pro)

#### Step 2: System Prompt
- Editor de system prompt
- Plantillas predefinidas por departamento
- Contador de caracteres
- Mejores prácticas

#### Step 3: Selección de Herramientas
- Grid gamificado de herramientas
- Filtros por categoría
- Búsqueda en tiempo real
- Selección múltiple

#### Step 4: Revisión y Creación
- Vista previa completa
- Estadísticas del agente
- Confirmación antes de crear

### 2. Librería de Agentes

- Cards estilo Pokémon/Trading Cards
- Filtros por departamento
- Indicador de estado (Activo/Inactivo)
- Estadísticas de ejecuciones
- Acciones: Ejecutar, Activar/Desactivar, Eliminar

### 3. Executor de Agentes

- Interfaz intuitiva para ejecutar tareas
- Área de texto para describir la tarea
- Visualización de resultados
- Historial de ejecuciones
- Métricas de tiempo de ejecución

## UI/UX Design

### Paleta de Colores

- **Primary Gradient**: `#667eea` → `#764ba2`
- **Sales**: `#f093fb` → `#f5576c`
- **Logistics**: `#4facfe` → `#00f2fe`
- **Inventory**: `#43e97b` → `#38f9d7`

### Efectos Visuales

- **Hover Effects**: Elevación con `translateY(-10px)` y `scale(1.02)`
- **Box Shadows**: Profundas y suaves
- **Border Radius**: 15-20px para estilo moderno
- **Holographic Overlay**: Efecto brillante en cards
- **Animations**: `slideIn`, `checkBounce`, `sparkle`

### Componentes PrimeNG Utilizados

- `p-steps` - Wizard steps
- `p-dropdown` - Selectores
- `p-inputtext` - Inputs de texto
- `p-inputtextarea` - Text areas
- `p-button` - Botones
- `p-chip` - Tags de herramientas
- `p-tooltip` - Tooltips
- `p-confirmDialog` - Diálogos de confirmación

## Servicios Backend

### Endpoints Esperados

```typescript
// Crear agente
POST /v1/agent-builder/create
Body: CreateAgentRequest
Response: { success: boolean; agent: Agent; message: string }

// Listar agentes
GET /v1/agent-builder/list?department=sales
Response: { success: boolean; agents: Agent[] }

// Obtener agente
GET /v1/agent-builder/agents/:id
Response: { success: boolean; agent: Agent }

// Actualizar agente
PUT /v1/agent-builder/agents/:id
Body: Partial<UpdateAgentRequest>
Response: { success: boolean; agent: Agent }

// Eliminar agente
DELETE /v1/agent-builder/agents/:id
Response: { success: boolean; message: string }

// Ejecutar agente
POST /v1/agent-builder/execute
Body: { agentId: string; task: string }
Response: AgentExecutionResponse

// Historial de ejecuciones
GET /v1/agent-builder/agents/:id/history
Response: { success: boolean; executions: AgentExecution[] }

// Catálogo de herramientas
GET /v1/agent-builder/catalog/tools
Response: { success: boolean; catalog: ToolCatalog }

// Alternar estado
PUT /v1/agent-builder/agents/:id/toggle-status
Response: { success: boolean; agent: Agent }
```

## Modelos de Datos

### Agent
```typescript
interface Agent {
  id?: string;
  agentName: string;
  department: 'sales' | 'logistics' | 'inventory';
  systemPrompt: string;
  selectedTools: string[];
  description?: string;
  model?: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
  metadata?: AgentMetadata;
}
```

### Tool
```typescript
interface Tool {
  name: string;
  description: string;
  department: 'sales' | 'logistics' | 'inventory' | 'general';
  icon?: string;
  category?: ToolCategory;
  isEnabled?: boolean;
}
```

## Uso

### Acceso al Módulo

1. El usuario debe estar autenticado (`AdminGuard`)
2. Debe tener suscripción activa (`SubscriptionGuard`)
3. Navegar a `/agent-builder` desde el menú principal

### Crear un Agente

1. Hacer clic en "Crear Nuevo Agente"
2. Completar los 4 pasos del wizard
3. Revisar la configuración
4. Confirmar creación

### Ejecutar un Agente

1. En la librería, hacer clic en "Ejecutar" en el card del agente
2. Escribir la tarea a ejecutar
3. Hacer clic en "Ejecutar"
4. Ver resultado y historial

### Gestionar Agentes

- **Activar/Desactivar**: Click en el ícono de power
- **Eliminar**: Click en el ícono de papelera (requiere confirmación)
- **Filtrar**: Usar el dropdown de departamentos

## Desarrollo

### Mock Data

El servicio `ToolCatalogService` incluye un método `getMockToolCatalog()` que retorna un catálogo de prueba para desarrollo local sin backend.

Para usarlo, el código ya está configurado en `wizard.component.ts`:

```typescript
// Usando mock catalog (actual)
this.toolCatalogService.getMockToolCatalog().subscribe(...)

// Para producción, cambiar a:
this.toolCatalogService.getToolCatalog().subscribe(...)
```

### Extensión

Para agregar nuevas categorías de herramientas:

1. Actualizar `ToolCategory` en `tool.model.ts`
2. Agregar categoría en `categories` array de `step-tools.component.ts`
3. Actualizar mock catalog o backend según corresponda

## Testing

### Casos de Prueba Sugeridos

1. **Wizard Flow**
   - Validación en cada paso
   - Navegación hacia atrás/adelante
   - Persistencia de datos entre pasos

2. **Librería**
   - Carga de agentes
   - Filtros por departamento
   - Eliminación con confirmación

3. **Executor**
   - Ejecución de tareas
   - Manejo de errores
   - Visualización de historial

## Performance

- **Lazy Loading**: El módulo se carga solo cuando se accede
- **OnPush Strategy**: Considerar implementar en componentes grandes
- **Virtual Scroll**: Para listas de herramientas muy grandes

## Responsive Design

El módulo es completamente responsive:

- **Desktop**: Grid de 3-4 columnas para cards
- **Tablet**: Grid de 2 columnas
- **Mobile**: Layout de 1 columna con componentes apilados

## Accesibilidad

- Etiquetas semánticas HTML5
- ARIA labels en botones e iconos
- Contraste de colores WCAG AA
- Navegación por teclado en wizard

## Próximas Mejoras

- [ ] Duplicar agente existente
- [ ] Exportar/Importar configuración de agente
- [ ] Templates de agentes predefinidos
- [ ] Análisis de rendimiento de agentes
- [ ] Colaboración en agentes (compartir con equipo)
- [ ] Programación de ejecuciones automáticas
- [ ] Webhooks para notificaciones

## Soporte

Para dudas o problemas con el módulo, contactar al equipo de desarrollo de Katuq.

---

**Versión**: 1.0.0
**Última actualización**: 2025-11-11
**Autor**: Katuq Development Team
