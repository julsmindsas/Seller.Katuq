# Agent Builder - Guía de Implementación Backend

## Resumen Ejecutivo

El módulo **Agent Builder** frontend ha sido completamente implementado. Este documento describe los endpoints backend necesarios para su funcionamiento completo.

## Estado Actual

- Frontend: 100% completado
- Routing: Configurado en `/agent-builder`
- Menú: Integrado en "Inteligencia de Negocios"
- UI/UX: Diseño moderno con efectos gamificados
- Backend: Pendiente de implementación

## Endpoints Backend Requeridos

### Base URL
```
{API_URL}/v1/agent-builder
```

### 1. Crear Agente
```http
POST /v1/agent-builder/create
Content-Type: application/json

Request Body:
{
  "agentName": "salesBooster",
  "department": "sales",
  "systemPrompt": "Eres un asistente experto en ventas...",
  "selectedTools": ["get_orders", "create_order", "analyze_sales"],
  "description": "Agente para optimizar ventas",
  "model": "gemini-2.5-flash"
}

Response:
{
  "success": true,
  "agent": {
    "id": "agent_123",
    "agentName": "salesBooster",
    "department": "sales",
    "systemPrompt": "Eres un asistente experto...",
    "selectedTools": ["get_orders", "create_order"],
    "description": "Agente para optimizar ventas",
    "model": "gemini-2.5-flash",
    "status": "active",
    "createdAt": "2025-11-11T10:00:00Z",
    "metadata": {
      "totalExecutions": 0,
      "avgExecutionTime": 0
    }
  },
  "message": "Agente creado exitosamente"
}
```

### 2. Listar Agentes
```http
GET /v1/agent-builder/list?department=sales
Authorization: Bearer {token}

Response:
{
  "success": true,
  "agents": [
    {
      "id": "agent_123",
      "agentName": "salesBooster",
      "department": "sales",
      "systemPrompt": "...",
      "selectedTools": ["get_orders"],
      "status": "active",
      "createdAt": "2025-11-11T10:00:00Z",
      "metadata": {
        "totalExecutions": 15,
        "avgExecutionTime": 2500,
        "lastExecuted": "2025-11-11T14:30:00Z"
      }
    }
  ]
}
```

### 3. Obtener Agente por ID
```http
GET /v1/agent-builder/agents/{agentId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "agent": {
    "id": "agent_123",
    "agentName": "salesBooster",
    // ... resto de propiedades
  }
}
```

### 4. Actualizar Agente
```http
PUT /v1/agent-builder/agents/{agentId}
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "systemPrompt": "Nuevo prompt...",
  "selectedTools": ["get_orders", "new_tool"],
  "description": "Nueva descripción"
}

Response:
{
  "success": true,
  "agent": {
    // agente actualizado
  }
}
```

### 5. Eliminar Agente
```http
DELETE /v1/agent-builder/agents/{agentId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Agente eliminado exitosamente"
}
```

### 6. Ejecutar Agente
```http
POST /v1/agent-builder/execute
Content-Type: application/json
Authorization: Bearer {token}

Request Body:
{
  "agentId": "agent_123",
  "task": "Obtener los pedidos de los últimos 7 días y analizar las ventas"
}

Response:
{
  "executionId": "exec_456",
  "agentId": "agent_123",
  "result": "Análisis de ventas:\n- Total pedidos: 45\n- Ventas totales: $12,500\n...",
  "executedAt": "2025-11-11T15:00:00Z",
  "executionTime": 2350,
  "status": "completed"
}
```

### 7. Historial de Ejecuciones
```http
GET /v1/agent-builder/agents/{agentId}/history
Authorization: Bearer {token}

Response:
{
  "success": true,
  "executions": [
    {
      "agentId": "agent_123",
      "task": "Obtener pedidos...",
      "result": "...",
      "executedAt": "2025-11-11T15:00:00Z",
      "executionTime": 2350,
      "status": "completed"
    }
  ]
}
```

### 8. Catálogo de Herramientas
```http
GET /v1/agent-builder/catalog/tools
Authorization: Bearer {token}

Response:
{
  "success": true,
  "catalog": {
    "sales": [
      {
        "name": "get_orders",
        "description": "Obtener listado de pedidos con filtros",
        "department": "sales",
        "icon": "pi-list",
        "category": "data-access"
      }
    ],
    "logistics": [...],
    "inventory": [...],
    "general": [...]
  }
}
```

### 9. Alternar Estado del Agente
```http
PUT /v1/agent-builder/agents/{agentId}/toggle-status
Authorization: Bearer {token}

Response:
{
  "success": true,
  "agent": {
    "id": "agent_123",
    "status": "inactive", // cambiado de active a inactive
    // ... resto de propiedades
  }
}
```

## Modelos de Base de Datos

### Colección: agents

```typescript
{
  _id: ObjectId,
  agentName: String (único por empresa),
  department: Enum["sales", "logistics", "inventory"],
  systemPrompt: String,
  selectedTools: [String],
  description?: String,
  model: Enum["gemini-2.5-flash", "gemini-2.5-pro"],
  status: Enum["active", "inactive"],
  companyId: ObjectId (referencia a empresa),
  userId: ObjectId (creador),
  createdAt: Date,
  updatedAt: Date,
  metadata: {
    totalExecutions: Number,
    avgExecutionTime: Number,
    lastExecuted?: Date,
    successRate?: Number
  }
}
```

### Colección: agent_executions

```typescript
{
  _id: ObjectId,
  agentId: ObjectId (referencia a agent),
  task: String,
  result?: String,
  error?: String,
  executedAt: Date,
  executionTime: Number (en ms),
  status: Enum["pending", "running", "completed", "failed"],
  companyId: ObjectId,
  userId: ObjectId (ejecutor)
}
```

### Colección: tools_catalog

```typescript
{
  _id: ObjectId,
  name: String (único),
  description: String,
  department: Enum["sales", "logistics", "inventory", "general"],
  icon: String,
  category: Enum["data-access", "analytics", "automation", "communication", "utility"],
  isEnabled: Boolean,
  parameters: [{
    name: String,
    type: String,
    description: String,
    required: Boolean,
    defaultValue?: Any
  }],
  implementationRef: String (referencia al servicio/función que implementa la herramienta)
}
```

## Lógica Backend - Ejecución de Agentes

### Flujo de Ejecución

1. **Recibir Request** (`POST /execute`)
   - Validar agentId existe
   - Validar agente está activo
   - Validar task no está vacía

2. **Preparar Contexto**
   ```javascript
   const context = {
     systemPrompt: agent.systemPrompt,
     tools: agent.selectedTools.map(toolName => getToolImplementation(toolName)),
     task: request.task,
     model: agent.model
   };
   ```

3. **Llamar a Gemini API**
   ```javascript
   const response = await geminiAPI.execute({
     model: agent.model,
     systemInstruction: agent.systemPrompt,
     tools: context.tools,
     prompt: request.task
   });
   ```

4. **Procesar Respuesta**
   - Ejecutar function calls si Gemini las solicita
   - Combinar resultados
   - Formatear respuesta final

5. **Guardar Ejecución**
   ```javascript
   await AgentExecution.create({
     agentId: agent._id,
     task: request.task,
     result: response.text,
     executedAt: new Date(),
     executionTime: endTime - startTime,
     status: 'completed'
   });
   ```

6. **Actualizar Metadata del Agente**
   ```javascript
   await Agent.updateOne(
     { _id: agent._id },
     {
       $inc: { 'metadata.totalExecutions': 1 },
       $set: {
         'metadata.lastExecuted': new Date(),
         'metadata.avgExecutionTime': calculateAverage(...)
       }
     }
   );
   ```

### Implementación de Herramientas

Cada herramienta debe ser una función que:
- Reciba parámetros según su definición
- Ejecute la lógica correspondiente
- Retorne resultado en formato JSON

Ejemplo:
```javascript
// tools/sales/get_orders.js
async function get_orders(filters = {}) {
  const { startDate, endDate, status } = filters;

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: status
  }).populate('cliente');

  return {
    success: true,
    data: orders,
    count: orders.length
  };
}
```

## Integración con Gemini

### Configuración de Herramientas para Gemini

```javascript
const toolsForGemini = agent.selectedTools.map(toolName => {
  const toolDef = ToolsCatalog.findOne({ name: toolName });

  return {
    functionDeclarations: [{
      name: toolDef.name,
      description: toolDef.description,
      parameters: {
        type: 'object',
        properties: convertParametersToSchema(toolDef.parameters),
        required: toolDef.parameters.filter(p => p.required).map(p => p.name)
      }
    }]
  };
});
```

### Llamada a Gemini

```javascript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: agent.model,
  systemInstruction: agent.systemPrompt
});

const chat = model.startChat({
  tools: toolsForGemini,
  toolConfig: { functionCallingConfig: { mode: 'AUTO' } }
});

const result = await chat.sendMessage(request.task);
```

## Seguridad

### Validaciones Necesarias

1. **Autenticación**: Verificar token JWT en todas las rutas
2. **Autorización**: Usuario solo puede ver/editar agentes de su empresa
3. **Rate Limiting**: Limitar ejecuciones por minuto/hora
4. **Validación de Input**: Sanitizar systemPrompt y task
5. **Timeout**: Limitar tiempo máximo de ejecución (ej: 30 segundos)

### Middleware Ejemplo

```javascript
async function validateAgentOwnership(req, res, next) {
  const agent = await Agent.findById(req.params.agentId);

  if (!agent) {
    return res.status(404).json({ success: false, message: 'Agente no encontrado' });
  }

  if (agent.companyId.toString() !== req.user.companyId.toString()) {
    return res.status(403).json({ success: false, message: 'No autorizado' });
  }

  req.agent = agent;
  next();
}
```

## Testing

### Test Cases Críticos

1. **Crear agente con herramientas válidas**
2. **Rechazar agente con nombre duplicado**
3. **Ejecutar agente con tarea simple**
4. **Manejar timeout en ejecución larga**
5. **Function calling múltiple**
6. **Actualizar metadata correctamente**
7. **Filtrar agentes por departamento**
8. **Alternar estado activo/inactivo**

## Monitoreo y Logs

### Eventos a Loggear

1. **agent.created** - Nuevo agente creado
2. **agent.executed** - Agente ejecutó tarea
3. **agent.execution.failed** - Ejecución falló
4. **agent.deleted** - Agente eliminado
5. **tool.called** - Herramienta fue llamada

### Métricas Importantes

- Tiempo promedio de ejecución por agente
- Tasa de éxito de ejecuciones
- Herramientas más utilizadas
- Agentes más activos
- Errores más comunes

## Próximos Pasos

1. Implementar endpoints en backend
2. Crear colecciones en MongoDB
3. Implementar herramientas base (get_orders, get_products, etc.)
4. Integrar Gemini API
5. Testing completo
6. Deploy a staging
7. Validación con usuarios beta
8. Deploy a producción

## Contacto

Para soporte técnico sobre la implementación, contactar al equipo de desarrollo de Katuq.

---

**Documento creado**: 2025-11-11
**Versión Frontend**: 1.0.0
**Estado Backend**: Pendiente
