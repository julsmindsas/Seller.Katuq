# Quick Start - WebSocket + Genkit Streaming

## ✅ Pre-requisitos

- Node.js 20+
- npm o yarn
- Angular 14+
- Firebase Admin SDK
- Genkit 0.5.17+

## 🚀 Instalación Rápida

### 1. Verificar Dependencias Backend

```bash
cd katuq_admin_back_firebase/functions

# Verificar que existan estas dependencias en package.json
grep -E "ws|genkit|firebase" package.json

# Deberías ver:
# "ws": "^8.x" (o similar)
# "@genkit-ai/*": "^0.5.17"
# "firebase-admin": "^12.x"
```

Si falta `ws`, instalar:
```bash
npm install ws
```

### 2. Verificar Archivos Backend

```bash
# Verificar que existen los handlers
ls -la functions/handlers/
# Deberías ver:
# - websocket-handler.js
# - genkit-agent-executor.js

# Verificar integración en index.js
grep -n "createWebSocketServer\|setupWebSocket" functions/index.js
# Deberías ver líneas ~510 y ~551
```

### 3. Verificar Archivos Frontend

```bash
# Verificar WebSocket service mejorado
ls -la src/app/modules/agent-builder/shared/services/websocket.service.ts

# Verificar componente de streaming
ls -la src/app/modules/agent-builder/executor/components/streaming-message/
# Deberías ver:
# - streaming-message.component.ts
# - streaming-message.component.html
# - streaming-message.component.scss
```

## 🏃 Primeros Pasos

### Paso 1: Iniciar Backend

```bash
cd katuq_admin_back_firebase/functions

# Terminal 1
npm run start-express

# Esperar a ver:
# ✅ Servidor Express corriendo en http://localhost:3300
# ✅ Servidor WebSocket configurado en /ws
```

### Paso 2: Verificar WebSocket Activo

```bash
# Terminal 2 - Test basico
curl -v http://localhost:3300/v1/websocket/sessions

# Deberías recibir:
# {
#   "totalSessions": 0,
#   "sessions": []
# }
```

### Paso 3: Iniciar Frontend

```bash
# Terminal 3
cd src
npm start

# Esperar a que abra http://localhost:4200
```

### Paso 4: Probar Conexión

En el navegador (http://localhost:4200):
1. Abrir DevTools (F12)
2. Ir a Console
3. Ejecutar:

```javascript
// Inyectar el servicio
const wsService = ng.probe(document.querySelector('app-root')).injector.get(window.ng.core.inject.InjectionToken);

// O directamente en un componente que lo inyecte
```

O en un componente Angular:

```typescript
import { WebSocketService } from './services/websocket.service';

export class TestComponent {
  constructor(private ws: WebSocketService) {
    // Conectar
    this.ws.connect('test_user', 'test_company', 'test_agent');

    // Escuchar conexión
    this.ws.getConnectionStatus().subscribe(status => {
      console.log('✅ Conectado:', status.connected);
    });

    // Enviar mensaje
    setTimeout(() => {
      this.ws.sendMessage(
        'Hola, ¿cómo estás?',
        'conv_test'
      );
    }, 1000);

    // Escuchar respuesta
    this.ws.getStreamChunks().subscribe(chunk => {
      console.log('📨 Chunk:', chunk.chunk);
    });

    this.ws.getStreamComplete().subscribe(result => {
      console.log('✅ Completado:', result.fullMessage);
    });
  }
}
```

## 🧪 Test con wscat

### Instalar wscat

```bash
npm install -g wscat
```

### Conectar y Probar

```bash
# Terminal 4
wscat -c "ws://localhost:3300/ws?sessionId=test_session_123"

# Esperar: Connected (press CTRL+C to quit)
```

### Enviar Mensajes de Prueba

```json
# 1. Autenticar
{
  "type": "authenticate",
  "data": {
    "userId": "user_123",
    "companyId": "company_456",
    "agentId": "agent_789"
  }
}

# 2. Esperar respuesta
# {"type":"authenticated",...}

# 3. Enviar mensaje
{
  "type": "message",
  "data": {
    "agentId": "agent_789",
    "message": "¿Cuál es mi inventario?",
    "conversationId": "conv_test_123",
    "context": {
      "department": "inventory"
    }
  }
}

# 4. Ver respuestas
# {"type":"message_received",...}
# {"type":"stream_chunk",...}
# {"type":"stream_chunk",...}
# {"type":"stream_complete",...}
```

## 📊 Verificación de Logs

### Backend (Terminal 1)

Buscar estos logs para confirmar que funciona:

```
✅ Servidor WebSocket configurado en /ws
[WebSocket] 🔗 Nueva conexión: test_session_123
[WebSocket] ✅ Autenticado: user=user_123, company=company_456, agent=agent_789
[WebSocket] 📨 Mensaje: message
[WebSocket] 🚀 Ejecutando agente: agent_789
[Genkit] 🤖 Ejecutando agente: agent_789
[Genkit] ✅ Agente completado en Xms
```

### Frontend (DevTools Console)

Buscar estos logs para confirmar que funciona:

```
[WebSocketService] 🚀 Service initialized
[WebSocketService] 📍 WebSocket URL: ws://localhost:3300/ws
[WebSocketService] 🔗 Connecting to ws://localhost:3300/ws?sessionId=...
[WebSocketService] ✅ Connected successfully
[WebSocketService] 📨 authenticated
[WebSocketService] 📨 stream_chunk
[WebSocketService] 📨 stream_chunk
[WebSocketService] 📨 stream_complete
```

## ⚠️ Troubleshooting Rápido

### "WebSocket error: Network error"

```bash
# 1. Verificar que backend está corriendo
curl http://localhost:3300/api-docs

# 2. Verificar puerto no está en uso
lsof -i :3300

# 3. Si está en uso, matar proceso
kill -9 <PID>

# 4. Reiniciar backend
npm run start-express
```

### "No agent found"

```bash
# Verificar que el agente existe en Firestore
# 1. Ir a Firebase Console
# 2. Firestore Database
# 3. Navegar a: companies/{companyId}/agents/{agentId}
# 4. Debe existir el documento
```

### "CORS error"

```bash
# Verificar CORS en index.js
grep -A 20 "corsOptions" functions/index.js

# Agregar tu origen si no está (ej: http://localhost:4200)
# "http://localhost:4200" debe estar en el array
```

### Reconexión infinita

```bash
# 1. Revisar backend logs para errores
# 2. Verificar que companyId es válido
# 3. Verificar que userId es válido
# 4. Revisar WebSocket handler para excepciones
```

## 🎯 Checklist de Validación

### Backend
- [ ] `websocket-handler.js` existe
- [ ] `genkit-agent-executor.js` existe
- [ ] `index.js` importa y configura WebSocket
- [ ] Dependencia `ws` está instalada
- [ ] Backend inicia sin errores
- [ ] WebSocket responde en `/ws`
- [ ] Endpoint `/v1/websocket/sessions` funciona

### Frontend
- [ ] `websocket.service.ts` tiene métodos de streaming
- [ ] `streaming-message.component.*` existe
- [ ] Servicio inyectable en componentes
- [ ] Logs [WebSocketService] aparecen en console
- [ ] Conexión establece automáticamente

### E2E
- [ ] Backend y frontend pueden conectar
- [ ] Autenticación funciona
- [ ] Mensajes se envían y reciben
- [ ] Streaming muestra chunks
- [ ] Completación se emite correctamente
- [ ] Errores se manejan apropiadamente

## 📈 Siguientes Pasos

### Desarrollo
1. Integrar en componentes existentes
2. Personalizar UI con tu diseño
3. Agregar más tipos de mensajes si es necesario
4. Testing exhaustivo

### Producción
1. Cambiar `localhost:3300` por URL real
2. Usar `wss://` en lugar de `ws://`
3. Configurar rate limiting
4. Agregar autenticación adicional si es necesario
5. Monitoreo y logging
6. Backup de conversaciones

## 💡 Tips de Performance

```typescript
// ✅ BUENO: Unsubscribe automático
ngOnInit() {
  this.ws.getStreamChunks()
    .pipe(takeUntil(this.destroy$))
    .subscribe(chunk => { ... });
}

ngOnDestroy() {
  this.destroy$.next();
  this.ws.disconnect();
}

// ❌ MALO: Sin unsubscribe
ngOnInit() {
  this.ws.getStreamChunks().subscribe(chunk => { ... });
  // Memory leak si componente se destruye
}
```

## 🔐 Seguridad Básica

```typescript
// ✅ Validar entrada del usuario
const message = userInput.trim();
if (!message || message.length === 0) return;

// ✅ Validar estado de conexión
if (!this.ws.isConnected()) {
  this.showError('No conectado');
  return;
}

// ✅ Manejar errores
this.ws.getStreamErrors().subscribe(error => {
  console.error('Error:', error.error);
  // Mostrar al usuario
  this.showError(error.error);
});

// ❌ Evitar
// - Enviar datos sensibles en contexto
// - No validar entrada del usuario
// - Ignorar errores de conexión
```

## 📞 Support

### Recursos
- [WebSocket Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Genkit Docs](https://genkit.dev)
- [RxJS Guide](https://rxjs.dev)

### Debugging
```bash
# Backend logs
tail -f backend.log | grep WebSocket

# Frontend logs (en DevTools)
# Filtrar por: [WebSocketService]

# Sessions activas
curl http://localhost:3300/v1/websocket/sessions | jq
```

### Contacto
Para preguntas o issues, revisar:
1. WEBSOCKET_GENKIT_STREAMING.md - Guía completa
2. WEBSOCKET_INTEGRATION_EXAMPLE.md - Ejemplos
3. WEBSOCKET_CHANGES_SUMMARY.md - Resumen técnico

---

**¡Listo para empezar!** 🚀

Si todo está correcto, deberías ver:
- ✅ Backend corriendo en localhost:3300
- ✅ WebSocket en /ws
- ✅ Frontend corriendo en localhost:4200
- ✅ Conexión automática al servicio
- ✅ Streaming de mensajes en tiempo real

**Hora de integrar en tus componentes!**
