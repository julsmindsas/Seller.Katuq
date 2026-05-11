# WebSocket + Genkit Streaming Integration Guide

## 📋 Descripción General

Esta guía documenta la implementación completa de **WebSocket con Genkit Streaming** en el proyecto Katuq Seller. El sistema permite comunicación en tiempo real entre el frontend y el backend, con respuestas de agentes Genkit que llegan como chunks de texto.

## 🏗️ Arquitectura

### Backend (Node.js + Express)

**Archivos creados:**
1. **`handlers/websocket-handler.js`** - Servidor WebSocket principal
   - Gestiona conexiones WebSocket
   - Autentica sesiones
   - Enruta mensajes del usuario a agentes
   - Envía chunks de respuesta en tiempo real

2. **`handlers/genkit-agent-executor.js`** - Executor de agentes Genkit
   - Obtiene configuración del agente desde Firestore
   - Construye prompts del sistema y usuario
   - Ejecuta flujos Genkit con streaming
   - Guarda conversaciones en Firestore

**Modificaciones:**
- `index.js` - Integración del servidor WebSocket

### Frontend (Angular 14)

**Archivos actualizados:**
1. **`websocket.service.ts`** - Servicio mejorado
   - Manejo de chunks de streaming
   - Autenticación automática
   - Heartbeat para mantener conexión
   - Reconexión automática
   - Subjects separados para diferentes tipos de mensajes

**Archivos creados:**
1. **`streaming-message.component.ts/html/scss`** - Componente para mostrar mensajes con streaming
   - Animación de escritura en tiempo real
   - Indicador de estado (escribiendo, completado, error)
   - Metadata de ejecución (tiempo, tokens, herramientas)

## 🔄 Flujo de Comunicación

### 1. Conexión Inicial (Frontend → Backend)

```typescript
// Frontend
this.webSocketService.connect(userId, companyId, agentId);

// Genera sessionId automático
// Se conecta a ws://localhost:3300/ws?sessionId=...
// Envía mensaje de autenticación
```

### 2. Autenticación

```json
{
  "type": "authenticate",
  "data": {
    "userId": "user_123",
    "companyId": "company_456",
    "agentId": "agent_789"
  }
}
```

**Backend responde:**
```json
{
  "type": "authenticated",
  "data": {
    "sessionId": "sess_123...",
    "userId": "user_123",
    "companyId": "company_456",
    "agentId": "agent_789"
  }
}
```

### 3. Envío de Mensaje

```typescript
// Frontend
this.webSocketService.sendMessage(
  "¿Cuál es mi inventario actual?",
  "conv_123",
  { department: "inventory" }
);
```

**Mensaje enviado:**
```json
{
  "type": "message",
  "data": {
    "agentId": "agent_789",
    "message": "¿Cuál es mi inventario actual?",
    "conversationId": "conv_123",
    "context": {
      "department": "inventory"
    }
  }
}
```

### 4. Streaming de Respuesta

**Confirmación de recepción:**
```json
{
  "type": "message_received",
  "data": {
    "messageId": "msg_123...",
    "conversationId": "conv_123",
    "timestamp": "2025-11-12T10:30:00Z"
  }
}
```

**Chunks de respuesta (múltiples mensajes):**
```json
{
  "type": "stream_chunk",
  "data": {
    "messageId": "msg_123...",
    "chunk": "Tu inventario ",
    "timestamp": "2025-11-12T10:30:00.100Z",
    "isComplete": false,
    "index": 0,
    "metadata": {
      "source": "genkit",
      "inputTokens": 150,
      "outputTokens": 10
    }
  }
}
```

**Completación:**
```json
{
  "type": "stream_complete",
  "data": {
    "messageId": "msg_123...",
    "fullMessage": "Tu inventario actual es de 1,250 unidades distribuidas en 3 bodegas...",
    "timestamp": "2025-11-12T10:30:02Z",
    "totalTokens": 195,
    "executionTime": 2100,
    "toolsExecuted": ["get_inventory", "calculate_totals"],
    "metadata": {
      "inputTokens": 150,
      "outputTokens": 45
    }
  }
}
```

## 🚀 Guía de Uso Frontend

### 1. Inyectar el Servicio

```typescript
import { WebSocketService } from './shared/services/websocket.service';

constructor(private wsService: WebSocketService) {}
```

### 2. Conectar al iniciar la sesión

```typescript
ngOnInit() {
  const userId = this.authService.currentUser.id;
  const companyId = this.authService.currentCompany.id;
  const agentId = 'agent_123'; // Opcional

  this.wsService.connect(userId, companyId, agentId);

  // Escuchar estado de conexión
  this.wsService.getConnectionStatus().subscribe(status => {
    console.log('Conectado:', status.connected);
  });
}
```

### 3. Enviar mensaje

```typescript
this.wsService.sendMessage(
  "Tu pregunta aquí",
  "conversation_id",
  {
    department: "sales",
    customerId: "cust_123"
  }
);
```

### 4. Escuchar streaming

```typescript
// Escuchar cada chunk
this.wsService.getStreamChunks().subscribe(chunk => {
  console.log('Chunk recibido:', chunk.chunk);
  this.messageText += chunk.chunk;
});

// Escuchar completación
this.wsService.getStreamComplete().subscribe(result => {
  console.log('Mensaje completado:', result.fullMessage);
  console.log('Tiempo de ejecución:', result.executionTime + 'ms');
  console.log('Herramientas usadas:', result.toolsExecuted);
});

// Escuchar errores
this.wsService.getStreamErrors().subscribe(error => {
  console.error('Error:', error.error);
});
```

### 5. Usar el componente de streaming

```typescript
// En el template
<app-streaming-message
  [messageId]="'msg_123'"
  [isUser]="false">
</app-streaming-message>
```

### 6. Desconectar

```typescript
ngOnDestroy() {
  this.wsService.disconnect();
}
```

## 🔧 Guía de Uso Backend

### 1. Flujo de Genkit

El executor automáticamente:
1. Obtiene la configuración del agente desde Firestore
2. Recupera el historial de conversación (últimos 10 mensajes)
3. Construye el prompt del sistema (basado en `systemPrompt` del agente)
4. Construye el prompt del usuario (con historial)
5. Ejecuta el modelo Genkit (default: `gemini-1.5-flash`)
6. Envía chunks de respuesta en tiempo real
7. Guarda la conversación en Firestore

### 2. Configuración del Agente en Firestore

```javascript
{
  id: "agent_123",
  agentName: "Asesor de Inventario",
  department: "inventory",
  systemPrompt: "Eres un experto en gestión de inventario...",
  selectedTools: ["get_inventory", "check_stock", "forecast_demand"],
  model: "gemini-1.5-flash",
  temperature: 0.7,
  maxTokens: 2048,
  status: "active",
  createdAt: "2025-11-12T10:00:00Z"
}
```

### 3. Estructura de Firestore

```
companies/{companyId}/
  agents/{agentId}/
    - configuration
  conversations/{conversationId}/
    messages/{messageId}/
      - role: "user" | "agent"
      - content: "..."
      - timestamp
      - metadata (para agent messages)
```

## 📊 Diagrama de Flujo Completo

```
┌─────────────────┐
│   USUARIO FRONTEND│
└────────┬────────┘
         │
         │ 1. Conecta con userId, companyId
         │
    ┌────▼────────────────────┐
    │ WebSocket Service       │
    │ (Maneja conexión)       │
    │ - Autenticación         │
    │ - Heartbeat             │
    │ - Reconexión            │
    └────┬────────────────────┘
         │
         │ WebSocket (ws://localhost:3300/ws)
         │
    ┌────▼────────────────────┐
    │ Backend Express         │
    │ WebSocket Handler       │
    │ - Recibe mensaje        │
    │ - Valida sesión         │
    │ - Extrae agentId        │
    └────┬────────────────────┘
         │
         │ Pasa a Executor
         │
    ┌────▼────────────────────┐
    │ Genkit Agent Executor   │
    │ - Obtiene config agent  │
    │ - Carga historial       │
    │ - Construye prompt      │
    │ - Ejecuta con Genkit    │
    └────┬────────────────────┘
         │
         │ Streaming chunks
         │
    ┌────▼────────────────────┐
    │ WebSocket Handler       │
    │ Envía chunks            │
    │ - stream_chunk          │
    │ - stream_complete       │
    └────┬────────────────────┘
         │
         │ WebSocket
         │
    ┌────▼────────────────────┐
    │ Frontend WebSocket      │
    │ Emite a Subjects        │
    │ - streamChunkSubject    │
    │ - streamCompleteSubject │
    └────┬────────────────────┘
         │
         │ Observable
         │
    ┌────▼────────────────────┐
    │ Streaming Message Comp. │
    │ - Anima texto           │
    │ - Muestra metadata      │
    │ - Renderiza resultado   │
    └────┬────────────────────┘
         │
         │ Actualiza UI
         │
    ┌────▼────────────────────┐
    │ USUARIO VE RESPUESTA    │
    │ EN TIEMPO REAL          │
    └─────────────────────────┘
```

## 🔐 Seguridad

### Autenticación
- Sesión creada al conectar WebSocket
- Autenticación validada antes de procesar mensajes
- CompanyId extraído del header en formato estándar Katuq

### Rate Limiting
- Implementado en Express (configurable)
- Heartbeat cada 30 segundos
- Sesiones terminadas si no responden a ping

## 📈 Monitoreo y Debugging

### Endpoint de Debugging

```bash
GET http://localhost:3300/v1/websocket/sessions
```

**Respuesta:**
```json
{
  "totalSessions": 2,
  "sessions": [
    {
      "sessionId": "sess_123...",
      "userId": "user_456",
      "companyId": "company_789",
      "agentId": "agent_101",
      "messageCount": 5,
      "connectedAt": "2025-11-12T10:00:00Z",
      "lastActivity": "2025-11-12T10:05:23Z"
    }
  ]
}
```

### Logs en Frontend

```typescript
// Todos los eventos loguean automáticamente
// Busca en Console:
// [WebSocketService]
// [Streaming Message Component]
```

### Logs en Backend

```bash
# WebSocket Handler
[WebSocket] 🔗 Nueva conexión: sess_123
[WebSocket] ✅ Autenticado: user=user_456, company=company_789
[WebSocket] 📨 Mensaje: message
[WebSocket] 🚀 Ejecutando agente: agent_101

# Genkit Executor
[Genkit] 🤖 Ejecutando agente: agent_101
[Genkit] 💾 Cache hit: agent_101
[Genkit] 📤 Enviando a modelo: gemini-1.5-flash
[Genkit] ✅ Agente completado en 2100ms
```

## 🧪 Testing

### 1. Prueba Local Básica

```bash
# Terminal 1: Iniciar backend
cd katuq_admin_back_firebase/functions
npm run start-express

# Terminal 2: Iniciar frontend
cd src
npm start

# Frontend abrirá en http://localhost:4200
```

### 2. Probar WebSocket con wscat

```bash
# Instalar wscat
npm install -g wscat

# Conectar
wscat -c "ws://localhost:3300/ws?sessionId=test_123"

# Enviar autenticación
{"type":"authenticate","data":{"userId":"test_user","companyId":"test_company","agentId":"test_agent"}}

# Enviar mensaje
{"type":"message","data":{"agentId":"test_agent","message":"Hola","conversationId":"conv_test"}}
```

### 3. Prueba E2E en Angular

```typescript
describe('WebSocket + Genkit Streaming', () => {
  let wsService: WebSocketService;

  beforeEach(() => {
    wsService = TestBed.inject(WebSocketService);
  });

  it('should connect and receive stream chunks', (done) => {
    wsService.connect('user_123', 'company_456', 'agent_789');

    wsService.getStreamChunks().subscribe(chunk => {
      expect(chunk.messageId).toBeDefined();
      expect(chunk.chunk).toBeDefined();
      done();
    });

    wsService.sendMessage('Test message', 'conv_123');
  });
});
```

## ⚙️ Configuración

### Ambiente Variable (Backend)

```env
# .env
PORT=3300
WS_URL=ws://localhost:3300/ws
GENKIT_API_KEY=your_key_here
```

### Configuración Genkit

```javascript
// index.js
configureGenkit({
  plugins: [
    googleAI({
      apiKey: GOOGLE_AI_API_KEY,
      apiVersion: ["v1", "v1beta"],
    }),
  ],
  flowStateStore: "firebase",
  traceStore: "none",
  enableTracingAndMetrics: false,
  logLevel: "info",
});
```

## 🐛 Troubleshooting

### WebSocket no conecta

**Síntoma:** `WebSocket error: Network error`

**Solución:**
1. Verificar que el backend está corriendo: `curl http://localhost:3300/api-docs`
2. Verificar CORS en index.js - agregar origen del frontend
3. Verificar firewall/proxy permite WebSocket

### Streaming se detiene

**Síntoma:** Recibe chunks iniciales pero luego se detiene

**Solución:**
1. Verificar logs del backend para errores en Genkit
2. Verificar timeout del servidor (config en index.js)
3. Verificar que el agente existe en Firestore

### Reconexión infinita

**Síntoma:** Console muestra reconexiones constantes

**Solución:**
1. Revisar configuración de CORS
2. Verificar autenticación (headers.company)
3. Revisar logs del servidor para errores de sesión

## 📚 Archivos Referencia

| Archivo | Responsabilidad |
|---------|-----------------|
| `handlers/websocket-handler.js` | Servidor WebSocket |
| `handlers/genkit-agent-executor.js` | Ejecución de agentes |
| `websocket.service.ts` | Cliente WebSocket (Angular) |
| `streaming-message.component.*` | UI de mensajes con streaming |
| `index.js` | Integración en Express |

## 🔗 Enlaces Útiles

- [Genkit Documentation](https://genkit.dev)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RxJS Subjects](https://rxjs.dev/guide/subject)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)

## ✅ Checklist de Implementación

- [x] Backend WebSocket Handler creado
- [x] Genkit Agent Executor implementado
- [x] Frontend WebSocket Service mejorado
- [x] Streaming Message Component creado
- [x] Integración en index.js
- [x] Heartbeat y reconexión automática
- [x] Guardado de conversaciones en Firestore
- [ ] Testing E2E completado
- [ ] Deploy a producción
- [ ] Documentación de API completada

## 📞 Soporte

Para preguntas o issues:
1. Revisar logs (Frontend: Console; Backend: `backend.log`)
2. Verificar endpoint de debugging: `/v1/websocket/sessions`
3. Consultar sección de Troubleshooting arriba
