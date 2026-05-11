# EXPLORACIÓN: Agent Builder Wizard - Seller.Katuq

## RESPUESTA RÁPIDA

### 1. Ubicación del Componente Wizard y Sus Pasos

El wizard está estructurado en 4 pasos secuenciales:

- **Ubicación Base:** `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/`
- **Paso 1:** `step-basic-info/` - Nombre, descripción, departamento
- **Paso 2:** `step-prompt/` - System prompt con templates
- **Paso 3:** `step-tools/` - Selección de herramientas (FOCUS)
- **Paso 4:** `step-review/` - Revisar y crear agente
- **Orquestador:** `wizard.component.ts` (189 líneas) - Controla flujo de pasos

### 2. Estructura del Paso 3 (Herramientas/Tools)

**Archivo Clave:** `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-tools/`

**Componente:** `StepToolsComponent`
- **Input:** `agentConfig` (configurable), `toolCatalog` (datos de tools)
- **Output:** `agentConfigChange`, `next`, `back`
- **Estado Local:**
  - `availableTools[]` - Tools del departamento + generales
  - `filteredTools[]` - Tools después de filtrar
  - `searchQuery` - Búsqueda
  - `selectedCategory` - Filtro por categoría

**Estructura Visual:**
```
┌─ Header (Contador de selecciones)
├─ Search & Category Filters
├─ Responsive Grid (auto-fill, minmax 280px)
│  └─ Tool Cards (clicables)
│     ├─ Icono circular
│     ├─ Nombre + Descripción
│     ├─ Categoría badge
│     └─ Check verde si seleccionada
├─ Empty State (si no hay resultados)
├─ Validation Warning (si no hay selecciones)
└─ Buttons (Atrás / Siguiente)
```

### 3. Carga de Tools desde el Backend

**Flujo Completo:**

```
WizardComponent.ngOnInit()
    ↓
loadToolCatalog()
    ↓
ToolCatalogService.getToolCatalog()
    ↓
GET /v1/agent-builder/catalog/tools
    ↓
Backend Response: { success, data: [...tools] }
    ↓
transformToCatalog() - Transforma a ToolCatalog
    ├─ Agrupa por departamento (sales, logistics, inventory, general)
    ├─ Enriquece con iconos (PrimeNG classes)
    └─ Detecta categoría por pattern del nombre
    ↓
WizardComponent.toolCatalog = catalog
    ↓
[toolCatalog]="toolCatalog" → StepToolsComponent
    ↓
StepToolsComponent.loadAvailableTools()
    ├─ const deptTools = toolCatalog[department]
    ├─ const genTools = toolCatalog.general
    └─ availableTools = [...deptTools, ...genTools]
```

**Formato Respuesta Backend:**
```json
{
  "success": true,
  "data": [
    {
      "name": "getTotalSales",
      "description": "Obtiene total de ventas",
      "department": "sales",
      "parameters": ["startDate", "endDate"]
    },
    ...
  ]
}
```

**Transformación en Frontend:**
```json
{
  "sales": [
    {
      "name": "getTotalSales",
      "description": "Obtiene total de ventas",
      "department": "sales",
      "icon": "pi-dollar",
      "category": "data-access",
      "isEnabled": true,
      "parameters": ["startDate", "endDate"]
    }
  ],
  "logistics": [...],
  "inventory": [...],
  "general": [...]
}
```

### 4. Agrupación de Tools por Departamento

**Tipos de Departamento:**
```typescript
export type DepartmentType = 'sales' | 'logistics' | 'inventory';
```

**En StepToolsComponent:**
```typescript
loadAvailableTools(): void {
  // Obtiene tools del departamento seleccionado
  const departmentTools = this.toolCatalog[this.agentConfig.department] || [];
  
  // SIEMPRE agrega tools generales
  const generalTools = this.toolCatalog.general || [];

  // Combina
  this.availableTools = [...departmentTools, ...generalTools];
  
  this.filterTools();  // Aplica filtros
}
```

**Ejemplo:**
- Selecciona "Ventas" → Ve 10 tools de ventas + 3 generales = 13 tools
- Selecciona "Inventario" → Ve 5 tools de inventario + 3 generales = 8 tools

### 5. Cómo se Guardan las Tools Seleccionadas

**Flujo de Selección:**

```
User Click Tool Card
    ↓
toggleTool('getTotalSales')
    ├─ if NOT in selectedTools → push()
    └─ else → splice()
    ↓
onInputChange()
    ↓
agentConfigChange.emit(agentConfig)
    ↓
[(agentConfig)]="agentConfig" (two-way binding)
    ↓
WizardComponent.agentConfig ACTUALIZADO
    {
      agentName: "Asistente Ventas",
      department: "sales",
      systemPrompt: "...",
      selectedTools: ["getTotalSales", "getCustomers"],  ← ACTUALIZADO
      model: "gemini-2.5-flash"
    }
```

**Persistencia al Backend:**

```typescript
createAgent(): void {
  const createRequest: CreateAgentRequest = {
    agentName: this.agentConfig.agentName!,
    department: this.agentConfig.department!,
    systemPrompt: this.agentConfig.systemPrompt!,
    selectedTools: this.agentConfig.selectedTools!,  // Array de strings
    description: this.agentConfig.description,
    model: this.agentConfig.model
  };

  this.agentService.createAgent(createRequest).subscribe({
    next: (response) => {
      this.router.navigate(['/agent-builder/library']);
    }
  });
}
```

**Endpoint:**
```
POST /v1/agent-builder/create
Body: {
  "agentName": "Asistente Ventas",
  "department": "sales",
  "systemPrompt": "...",
  "selectedTools": ["getTotalSales", "getCustomers"],
  "description": "...",
  "model": "gemini-2.5-flash"
}
```

---

## ARCHIVOS CLAVE - RUTAS ABSOLUTAS

### Wizard Principal
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/wizard.component.ts`
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/wizard.component.html`
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/wizard.component.scss`

### Paso 3 - Tools (FOCUS)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-tools/step-tools.component.ts` (143 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-tools/step-tools.component.html` (117 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-tools/step-tools.component.scss` (314 líneas)

### Otros Pasos
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-basic-info/`
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-prompt/`
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-review/`

### Modelos e Interfaces
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/models/tool.model.ts` (36 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/models/agent.model.ts` (70 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/models/message.model.ts`

### Servicios Principales
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/services/tool-catalog.service.ts` (355 líneas) **INTEGRACIÓN BACKEND**
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/services/agent.service.ts` (100 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/shared/services/websocket.service.ts`

### Módulo y Routing
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/agent-builder.module.ts` (62 líneas)
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/agent-builder-routing.module.ts` (26 líneas)

### Librería y Ejecutor
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/library/`
- `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/executor/`

---

## CATEGORÍAS DE TOOLS DISPONIBLES

```typescript
categories = [
  { label: 'Todas', value: 'all' },
  { label: 'Acceso a Datos', value: 'data-access' },
  { label: 'Análisis', value: 'analytics' },
  { label: 'Automatización', value: 'automation' },
  { label: 'Comunicación', value: 'communication' }
];
```

**Detección Automática (getToolCategory):**
- `get*`, `check*` → `data-access`
- `*Stats`, `analyze*`, `*Top` → `analytics`
- `update*`, `create*`, `optimize*` → `automation`
- `send*`, `notify*` → `communication`
- Default → `utility`

---

## ENDPOINTS BACKEND UTILIZADOS

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/v1/agent-builder/catalog/tools` | GET | Obtiene catálogo completo |
| `/v1/agent-builder/catalog/tools/{dept}` | GET | Obtiene tools de un departamento |
| `/v1/agent-builder/create` | POST | Crea agente con tools seleccionadas |
| `/v1/agent-builder/list` | GET | Lista todos los agentes |
| `/v1/agent-builder/agents/{id}` | GET | Obtiene agente específico |
| `/v1/agent-builder/agents/{id}` | PUT | Actualiza agente |
| `/v1/agent-builder/agents/{id}` | DELETE | Elimina agente |
| `/v1/agent-builder/execute` | POST | Ejecuta agente |

---

## DÓNDE AGREGAR LA SECCIÓN DE COLABORACIÓN

### Opción 1: NUEVO PASO (RECOMENDADO)

**Ubicación Nueva Carpeta:**
```
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/agent-builder/wizard/step-collaboration/
├── step-collaboration.component.ts
├── step-collaboration.component.html
├── step-collaboration.component.scss
└── collaboration.model.ts (si es necesario)
```

**Cambios en wizard.component.ts:**
```typescript
initializeSteps(): void {
  this.steps = [
    { label: 'Información Básica', icon: 'pi pi-info-circle' },
    { label: 'System Prompt', icon: 'pi pi-file-edit' },
    { label: 'Herramientas', icon: 'pi pi-wrench' },
    { label: 'Colaboración', icon: 'pi pi-users' },      // NUEVO
    { label: 'Revisar y Crear', icon: 'pi pi-check-circle' }
  ];
}
```

**En Template del Wizard:**
```html
<app-step-collaboration
  *ngIf="activeStep === 3"
  [(agentConfig)]="agentConfig"
  (next)="nextStep()"
  (back)="prevStep()">
</app-step-collaboration>
```

**Actualizar agent.model.ts:**
```typescript
export interface Agent {
  // ... existing properties
  collaborators?: string[];              // Usuarios colaboradores
  collaborationRules?: CollaborationRule[];
  sharedWith?: string[];
  // ... más propiedades de colaboración
}
```

**Actualizar agent-builder.module.ts:**
```typescript
import { StepCollaborationComponent } from './wizard/step-collaboration/step-collaboration.component';

@NgModule({
  declarations: [
    // ... existing
    StepCollaborationComponent  // AGREGAR
  ]
})
```

---

## RESUMEN DE ARQUITECTURA

```
Agent Builder Module
├── Wizard (Componente Principal - 5 pasos)
│   ├── Step 1: Basic Info (Nombre, Depto, Desc)
│   ├── Step 2: System Prompt (Instrucciones IA)
│   ├── Step 3: Tools Selection (Grid de herramientas)
│   │   ├── Carga desde: ToolCatalogService
│   │   ├── Backend: GET /v1/agent-builder/catalog/tools
│   │   ├── Agrupa por: Departamento + General
│   │   └── Filtros: Categoría, Búsqueda
│   ├── Step 4: Colaboración [NUEVO LUGAR]
│   └── Step 5: Review & Create
│
├── Shared Services
│   ├── ToolCatalogService (Carga y transforma tools)
│   ├── AgentService (CRUD de agentes)
│   └── WebsocketService (Ejecución en tiempo real)
│
├── Data Models
│   ├── Tool (name, description, department, icon, category)
│   ├── ToolCatalog (sales[], logistics[], inventory[], general[])
│   └── Agent (name, department, prompt, selectedTools[], ...)
│
├── Library (Listado de agentes creados)
└── Executor (Ejecución de agentes)
```

---

## CATALOGO MOCK PARA TESTING

El servicio tiene un catálogo mock con ejemplos:
- **Sales:** getTotalSales, getCustomers, analyzeSales, sendQuote
- **Logistics:** getShipments, trackShipment, optimizeRoutes
- **Inventory:** getProducts, checkStock, updateStock, restockAlert
- **General:** sendEmail, generateReport, scheduleTask

Se carga automáticamente si el backend no está disponible.

---

## VALIDACIONES IMPLEMENTADAS

En Step-Tools:
```typescript
isValid(): boolean {
  return !!(
    this.agentConfig.selectedTools &&
    this.agentConfig.selectedTools.length > 0
  );
}
```

En Wizard (createAgent):
```typescript
validateAgent(): boolean {
  if (!this.agentConfig.agentName) → Error
  if (!this.agentConfig.department) → Error
  if (!this.agentConfig.systemPrompt) → Error
  if (!this.agentConfig.selectedTools || length === 0) → Error
  return true; // Si todo OK
}
```

---

## PRÓXIMOS PASOS PARA COLABORACIÓN

1. **Crear StepCollaborationComponent** en `/wizard/step-collaboration/`
2. **Definir modelo de colaboración** (CollaborationRule, permissions, etc.)
3. **Extender Agent interface** con propiedades de colaboración
4. **Actualizar número de pasos** del wizard (4 → 5)
5. **Implementar lógica de colaboración** (selección de usuarios, permisos, etc.)
6. **Sincronizar con agentConfig** usando two-way binding
7. **Enviar al backend** en CreateAgentRequest

