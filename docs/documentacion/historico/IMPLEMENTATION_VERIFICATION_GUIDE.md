# 🔍 Implementation Verification Guide

**Purpose**: Step-by-step verification that WebSocket + Genkit streaming is properly integrated

---

## ✅ Verification Steps

### Step 1: Backend Files Verification

#### Check WebSocket Handler
```bash
ls -lh katuq_admin_back_firebase/functions/handlers/websocket-handler.js
# Expected: File exists, ~10.6 KB
```

**Verify file contents**:
- Function: `createWebSocketServer(server)` - Creates WebSocket server on `/ws`
- Function: `handleConnection(ws, req)` - Manages client connections
- Function: `handleMessage(message)` - Routes messages to Genkit executor
- Session storage: `const sessions = new Map()` - Tracks active sessions

---

#### Check Genkit Executor
```bash
ls -lh katuq_admin_back_firebase/functions/handlers/genkit-agent-executor.js
# Expected: File exists, ~11.2 KB
```

**Verify file contents**:
- Function: `executeAgentStream(params, onChunk, onError, onComplete)` - Main streaming executor
- Function: `getAgentConfig(companyId, agentId)` - Loads agent from Firestore
- Cache: Agent configuration caching with 5-minute TTL
- Streaming: Uses `onChunk` callback for each message chunk

---

#### Check index.js Integration
```bash
grep -n "websocket-handler" katuq_admin_back_firebase/functions/index.js
# Expected: Line ~511 with import statement
```

**Verify integration**:
```bash
grep -A 20 "const setupWebSocket" katuq_admin_back_firebase/functions/index.js
# Expected: Function that calls createWebSocketServer
```

Check that `setupWebSocket()` is called in `server.listen()`:
```bash
grep -B 5 -A 5 "setupWebSocket()" katuq_admin_back_firebase/functions/index.js
# Expected: Called in server.listen() callback
```

---

#### Check KAI Integration Service Update
```bash
grep -n "Fall back to Firestore" katuq_admin_back_firebase/functions/services/kaiIntegrationService.js
# Expected: Found on line ~681
```

**Verify fallback logic**:
```bash
sed -n '623,741p' katuq_admin_back_firebase/functions/services/kaiIntegrationService.js | grep -E "if.*isEnabled|kaiError|Firestore"
# Expected: Shows both KAI attempt and Firestore fallback
```

---

### Step 2: Frontend Files Verification

#### Check WebSocket Service
```bash
ls -lh src/app/modules/agent-builder/shared/services/websocket.service.ts
# Expected: File exists, ~8.8 KB
```

**Verify service methods**:
```bash
grep "connect\|sendMessage\|getStream" src/app/modules/agent-builder/shared/services/websocket.service.ts | head -10
# Expected: Shows connect(), sendMessage(), getStreamChunks(), getStreamComplete(), getStreamErrors()
```

---

#### Check Executor Component Integration
```bash
grep -n "webSocketService" src/app/modules/agent-builder/executor/executor.component.ts | head -5
# Expected: WebSocket service is injected and used
```

**Verify WebSocket usage**:
```bash
grep -A 3 "this.webSocketService.connect" src/app/modules/agent-builder/executor/executor.component.ts
# Expected: Shows connect() call with userId, companyId, agentId parameters
```

---

#### Check Message Model Extensions
```bash
grep -A 5 "executionTime\|totalTokens" src/app/modules/agent-builder/shared/models/message.model.ts
# Expected: Shows streaming metadata properties
```

---

#### Check Streaming Component
```bash
ls -la src/app/modules/agent-builder/executor/components/streaming-message/
# Expected: Component files exist
```

**Verify component files**:
```bash
ls -1 src/app/modules/agent-builder/executor/components/streaming-message/
# Expected output:
# streaming-message.component.ts
# streaming-message.component.html
# streaming-message.component.scss
```

---

### Step 3: TypeScript Compilation

#### Compile and check for errors
```bash
npx tsc --noEmit
# Expected: No output (0 errors)
```

If there are errors, they should not include:
- ❌ TS2554 (connect() signature mismatch)
- ❌ TS2322 (totalTokens property missing)
- ❌ TS2345 (conversationId not valid)

---

### Step 4: Environment Configuration

#### Verify Backend Environment
```bash
# Check if .env exists in functions directory
ls -l katuq_admin_back_firebase/functions/.env
# Expected: File exists with KAI_ENABLED setting

# Check KAI settings
grep -E "KAI_ENABLED|KAI_SERVICE|AGENT_BUILDER" katuq_admin_back_firebase/functions/.env
```

**Expected values**:
```
KAI_ENABLED=false              # (or true if KAI is running)
KAI_SERVICE_URL=http://localhost:3890
AGENT_BUILDER_URL=http://localhost:3891
```

---

#### Verify Frontend Environment
```bash
# Check if environment files are configured
cat src/environments/environment.ts | grep -i "api\|backend"
# Expected: API endpoint pointing to http://localhost:3300
```

---

### Step 5: Running Services

#### Terminal 1: Start Backend Server
```bash
cd katuq_admin_back_firebase/functions
npm run start-express
# Expected output:
# ✅ Server running on port 3300
# ✅ WebSocket handler initialized
```

**Check WebSocket is ready**:
```bash
curl -s http://localhost:3300/v1/websocket/sessions | head -20
# Expected: JSON response showing session info
```

---

#### Terminal 2: Start Frontend Server
```bash
npm start
# Expected output:
# ✅ Angular dev server running on http://localhost:4200
```

---

#### Terminal 3: (Optional) Start KAI Service
```bash
cd /path/to/kai
npm start
# Expected output:
# ✅ KAI service running on port 3890
```

**Note**: If KAI is not running, backend will fall back to Firestore automatically.

---

### Step 6: Integration Testing

#### Test 1: WebSocket Connection
Navigate to browser console and run:
```javascript
// Check if WebSocket service is available
console.log('Testing WebSocket connection...');

// Try to connect
const ws = new WebSocket('ws://localhost:3300/ws');
ws.onopen = () => {
  console.log('✅ WebSocket connected');
  ws.send(JSON.stringify({
    type: 'authenticate',
    userId: 'test_user',
    companyId: 'ALMARA FELICIDAD'
  }));
};
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

---

#### Test 2: Agent Listing Endpoint
```bash
curl -X GET "http://localhost:3300/v1/agent-builder/list" \
  -H "company: ALMARA FELICIDAD" \
  -H "Content-Type: application/json" | jq .

# Expected response:
# {
#   "success": true,
#   "agents": [
#     {
#       "id": "agent_id",
#       "agentName": "Agent Name",
#       "department": "sales",
#       ...
#     }
#   ],
#   "source": "firestore"  (or "kai" if KAI is running)
# }
```

---

#### Test 3: Executor Component Navigation
1. Navigate to `http://localhost:4200/agent-builder/library`
2. Click on an agent to open executor
3. Open browser DevTools Console
4. Enter a test message
5. Check console for WebSocket messages:
   ```
   [Executor] 🔌 Conectando a WebSocket: user=..., company=...
   [Executor] Conexión: ✅ Conectado
   [Executor] Streaming message received
   ```

---

#### Test 4: Streaming Message Verification
1. In executor component, send a message
2. Watch for real-time text appearing:
   - Characters should appear progressively
   - Not all at once
   - Should see cursor blinking during transmission

3. Check console for streaming events:
   ```javascript
   // Should see log messages like:
   [stream_chunk] { messageId: "msg_...", chunk: "Hello" }
   [stream_chunk] { messageId: "msg_...", chunk: " " }
   [stream_chunk] { messageId: "msg_...", chunk: "world" }
   [stream_complete] {
     messageId: "msg_...",
     fullMessage: "Hello world",
     executionTime: 1234,
     totalTokens: 45
   }
   ```

---

### Step 7: Error Scenario Testing

#### Test: KAI Service Unavailable
1. Ensure KAI is **NOT** running
2. Call `/v1/agent-builder/list` endpoint
3. Expected: Agents should load from Firestore (source: "firestore")
4. Check logs for: `⚠️ KAI service failed, falling back to Firestore`

---

#### Test: Network Error During Streaming
1. Start streaming a message
2. Unplug network or close WebSocket manually
3. Expected: Error notification in executor
4. Check logs for: `stream_error` event
5. WebSocket should attempt to reconnect

---

#### Test: Invalid Agent ID
1. Manually navigate to `/agent-builder/executor/invalid_id`
2. Expected: Error notification
3. Check logs for: `Error loading agent`
4. Should redirect to `/agent-builder/library`

---

## 🧠 Troubleshooting Guide

### Issue: WebSocket Connection Fails
**Symptoms**:
- Browser console shows WebSocket error
- `ws.readyState` is not `OPEN`

**Solutions**:
1. Verify backend is running on port 3300
2. Check firewall allows WebSocket connections
3. Verify WebSocket handler is imported in index.js
4. Check browser console for specific error messages

```bash
# Test backend availability
curl http://localhost:3300/health
# Should return 200 OK
```

---

### Issue: TypeScript Compilation Errors
**Symptoms**:
- Build fails with TS errors
- Specific error codes shown

**Solutions by Error Code**:

**TS2554 - connect() signature mismatch**
```typescript
// ❌ WRONG
this.webSocketService.connect(sessionId);

// ✅ CORRECT
this.webSocketService.connect(userId, companyId, agentId);
```

**TS2322 - Property doesn't exist**
- Ensure message.model.ts has metadata properties
- Check for typos in property names

**TS2345 - Type mismatch**
- Use `sessionId` instead of `conversationId`
- Check interface definitions

---

### Issue: Agent List Not Loading
**Symptoms**:
- GET `/v1/agent-builder/list` returns error
- Frontend shows no agents

**Solutions**:
1. Check Firestore has agents in:
   ```
   companies/{companyId}/agents/
   ```
2. Verify KAI is either:
   - Running on port 3890, OR
   - Disabled (KAI_ENABLED=false)
3. Check logs for specific error messages
4. Verify database permissions

---

### Issue: Streaming Messages Not Appearing
**Symptoms**:
- Message sent but appears all at once
- No progressive text display
- No streaming events in console

**Solutions**:
1. Verify WebSocket connection is open
2. Check that streaming component is imported
3. Verify `getStreamChunks()` is subscribed
4. Check backend logs for errors in genkit executor
5. Verify agent has streaming enabled in config

---

### Issue: High Memory Usage
**Symptoms**:
- Backend consuming lots of RAM
- Browser becoming sluggish

**Solutions**:
1. Check for zombie WebSocket connections
2. Verify sessions are being cleaned up
3. Check agent config cache size (5-min TTL)
4. Monitor concurrent connections count

```bash
# Check active sessions
curl http://localhost:3300/v1/websocket/sessions | jq '.sessions | length'
```

---

## 📊 Health Checks

### Backend Health Check
```bash
# Quick health verification
curl -s http://localhost:3300/health && echo "✅ Backend healthy"
curl -s http://localhost:3300/v1/websocket/sessions && echo "✅ WebSocket functional"
```

---

### Frontend Health Check
```bash
# In browser console
console.log('✅ Frontend loaded at', new Date().toLocaleTimeString());
console.log('User data:', JSON.parse(localStorage.getItem('user')));
```

---

### Full System Check Script
```bash
#!/bin/bash
echo "🔍 WebSocket + Genkit System Health Check"
echo "=========================================="

echo -n "Backend (port 3300)... "
curl -s http://localhost:3300/health > /dev/null && echo "✅" || echo "❌"

echo -n "Frontend (port 4200)... "
curl -s http://localhost:4200 > /dev/null && echo "✅" || echo "❌"

echo -n "KAI Service (port 3890)... "
curl -s http://localhost:3890/health > /dev/null && echo "✅" || echo "⚠️ (Optional)"

echo -n "WebSocket Handler... "
curl -s http://localhost:3300/v1/websocket/sessions > /dev/null && echo "✅" || echo "❌"

echo -n "Agent List Endpoint... "
curl -s "http://localhost:3300/v1/agent-builder/list" \
  -H "company: ALMARA FELICIDAD" > /dev/null && echo "✅" || echo "❌"

echo ""
echo "TypeScript Compilation... "
npx tsc --noEmit > /dev/null 2>&1 && echo "✅ 0 Errors" || echo "❌ Compilation errors found"

echo ""
echo "=========================================="
echo "Health check complete!"
```

---

## ✅ Final Verification

When all tests pass, you should see:

```
✅ Backend WebSocket server running
✅ Frontend connects via WebSocket
✅ Messages stream in real-time
✅ Metadata captured correctly
✅ KAI/Firestore fallback working
✅ Error handling functional
✅ TypeScript compilation: 0 errors
✅ All services healthy
```

---

**If all verifications pass**: ✅ **Implementation is complete and ready for use!**

**Next Step**: Deploy to staging environment or proceed with end-to-end testing.

---

**Last Updated**: 2025-11-12
