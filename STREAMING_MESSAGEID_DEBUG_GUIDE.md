# 🔍 Streaming MessageId Debug Guide - Testing Steps

**Date**: 2025-11-13
**Issue**: Streaming chunks being received but not displayed in UI
**Root Cause**: Frontend and backend using different messageIds

---

## 📋 Problem Summary

The frontend and backend are **generating different messageIds**:

```
Frontend: msg_1763006610629_t0eamjpnu
Backend:  msg_1763006610752_x89vmkrfw
```

This causes the chunk filter to fail:
```
if (currentStreamingMessageId === chunk.messageId)  // ALWAYS FALSE!
```

---

## ✅ Solution Applied

### 1. Frontend Changes

**websocket.service.ts** (lines 203-237):
- Added `messageId?: string` parameter to `sendMessage()`
- Only include messageId in payload if provided
- Added logging to show what's being sent

**executor.component.ts** (lines 137-143):
- Now passes `this.currentStreamingMessageId` as 4th parameter to `sendMessage()`
- Added logging to show the messageId being sent

### 2. Backend Changes

**websocket-handler.js** (lines 165-194):
- Added logging to show what messageId is being received
- Use `data.messageId` if provided by frontend
- Fall back to generating if not provided

### 3. Change Detection

**executor.component.ts** (line 168):
- Added `this.cdr.markForCheck()` after updating message
- Ensures Angular detects the change

---

## 🔧 Testing Steps

### Step 1: Restart Backend Server

**CRITICAL**: The backend needs to be restarted to load the new websocket-handler.js code.

```bash
# Stop current backend (if running)
# Ctrl+C in the terminal where it's running

# Restart backend
npm run start-express
```

Watch for this log line:
```
[Express] Servidor ejecutándose en http://localhost:3300
```

### Step 2: Refresh Frontend

- Close the browser tab or reload (Ctrl+R / Cmd+R)
- This ensures the updated WebSocket service code is loaded

### Step 3: Test Streaming Message

1. Navigate to the Agent Builder executor
2. Select an agent
3. Type a message: "¿Cuál es tu nombre?"
4. Send the message

### Step 4: Check Console Logs

**Frontend Console (Browser DevTools - F12)**:

You should see:
```
[Executor] ⏳ Esperando conexión WebSocket para enviar mensaje
[Executor] Conexión: ✅ Conectado
[Executor] 📤 Enviando mensaje por WebSocket con messageId: msg_1763006610629_t0eamjpnu
[WebSocketService] 📤 Enviando mensaje: {
  hasMessageId: true,
  messageId: "msg_1763006610629_t0eamjpnu",
  ...
}
```

**Backend Console (Terminal running npm run start-express)**:

You should see:
```
[WebSocket] 📥 Mensaje recibido: {
  hasMessageId: true,
  messageId: "msg_1763006610629_t0eamjpnu",
  ...
}
[WebSocket] 📋 messageId: msg_1763006610629_t0eamjpnu (from frontend)
[WebSocket] 🚀 Ejecutando agente: agent_id
[WebSocket] 🔄 Intentando ejecutar con KAI service
[WebSocket] 📤 Enviando chunk: "¡Hola!"
[WebSocket] 📤 Enviando chunk: "Mi"
[WebSocket] 📤 Enviando chunk: "nombre"
```

**Frontend (after chunks arrive)**:

You should see:
```
[WebSocketService] 📨 stream_chunk
[Executor] 📨 Chunk recibido: {
  currentStreamingMessageId: "msg_1763006610629_t0eamjpnu",
  chunkMessageId: "msg_1763006610629_t0eamjpnu",
  match: true,  // ← THIS SHOULD BE TRUE NOW!
  chunkText: "¡Hola! "
}
[Executor] 🔍 Message index: 1, Total messages: 2
[Executor] ✅ Actualizando mensaje en index: 1
[Executor] 📝 Mensaje actual: ¡Hola! Mi nombre ...
```

---

## ✅ Expected Results

### Success Indicators

1. **MessageId Match**: `match: true` in console logs ✅
2. **Message Index Found**: `Message index: 1` (not -1) ✅
3. **Streaming Text Display**: Message updates in real-time in the chat ✅
4. **Backend Log**: Shows `(from frontend)` not `(generated)` ✅

### If It Still Doesn't Work

Check the following:

**Issue**: Frontend logs show `hasMessageId: false`
- **Cause**: `currentStreamingMessageId` is null or undefined
- **Fix**: Check that message creation happens BEFORE connection handler fires

**Issue**: Backend logs show `hasMessageId: false` or `(generated)`
- **Cause**: Frontend didn't send messageId
- **Fix**: Verify websocket.service.ts is using the updated code (refresh browser)

**Issue**: Messages not updating despite matching messageIds
- **Cause**: Change detection not triggered
- **Fix**: Make sure `ChangeDetectorRef` is imported and `markForCheck()` is called

---

## 🔄 Debug Checklist

### Frontend Checklist
- [ ] Browser has latest code (refresh with Ctrl+F5 or Cmd+Shift+R)
- [ ] DevTools console shows `📤 Enviando mensaje` with messageId
- [ ] DevTools console shows `match: true` for chunks
- [ ] Message appears in chat UI

### Backend Checklist
- [ ] Backend restarted after code changes
- [ ] Logs show `(from frontend)` not `(generated)`
- [ ] Logs show chunks being sent with same messageId
- [ ] No errors in backend console

### Network Checklist
- [ ] WebSocket connection is open (check Network tab in DevTools)
- [ ] Messages are being sent (can see in Network > WS)
- [ ] Chunks are being received (can see in Network > WS)

---

## 📊 Log Examples

### GOOD - Matching MessageIds

```
[Frontend]
[Executor] 📤 Enviando mensaje por WebSocket con messageId: msg_1763006610629_t0eamjpnu

[Backend]
[WebSocket] 📥 Mensaje recibido: { hasMessageId: true, messageId: "msg_1763006610629_t0eamjpnu", ... }
[WebSocket] 📋 messageId: msg_1763006610629_t0eamjpnu (from frontend)

[Frontend - Receiving chunks]
[Executor] 📨 Chunk recibido: { currentStreamingMessageId: "msg_1763006610629_t0eamjpnu", chunkMessageId: "msg_1763006610629_t0eamjpnu", match: true, ... }
[Executor] ✅ Actualizando mensaje en index: 1
```

### BAD - Mismatched MessageIds

```
[Frontend]
[Executor] 📤 Enviando mensaje por WebSocket con messageId: msg_1763006610629_t0eamjpnu

[Backend]
[WebSocket] 📥 Mensaje recibido: { hasMessageId: false, messageId: undefined, ... }
[WebSocket] 📋 messageId: msg_1763006610752_x89vmkrfw (generated)

[Frontend - Receiving chunks]
[Executor] 📨 Chunk recibido: { currentStreamingMessageId: "msg_1763006610629_t0eamjpnu", chunkMessageId: "msg_1763006610752_x89vmkrfw", match: false, ... }
[Executor] ❌ MessageId mismatch: msg_1763006610629_t0eamjpnu !== msg_1763006610752_x89vmkrfw
```

---

## 🎯 Expected Flow

```
1. User sends message
   ↓
2. Frontend creates messageId_A
3. Frontend creates placeholder message
4. WebSocket connects
   ↓
5. Frontend: "📤 Enviando mensaje... con messageId: msg_A"
6. Frontend: "📤 Enviando mensaje: {hasMessageId: true, messageId: msg_A, ...}"
   ↓
7. Backend: "📥 Mensaje recibido: {hasMessageId: true, messageId: msg_A, ...}"
8. Backend: "📋 messageId: msg_A (from frontend)"
   ↓
9. Backend sends chunks with msg_A
   ↓
10. Frontend: "📨 Chunk recibido: {match: true, chunkText: '...'}"
11. Frontend: "✅ Actualizando mensaje"
12. Message text updates in UI ✅
    ↓
13. Backend sends stream_complete with msg_A
14. Frontend: "🏁 Stream completado"
15. Message marked as complete
    ↓
16. ✅ SUCCESS!
```

---

## 📞 Troubleshooting

### Q: Chunks are still not showing
**A**:
1. Restart backend with `npm run start-express`
2. Refresh browser with Ctrl+F5
3. Check logs for `(from frontend)` in backend console

### Q: Backend shows `(generated)` still
**A**:
1. Frontend is NOT sending messageId
2. Check frontend logs for `hasMessageId: false`
3. Verify websocket.service.ts has the updated code
4. Refresh browser with Ctrl+Shift+R (hard refresh)

### Q: MessageIds match but message still not updating
**A**:
1. Check that `ChangeDetectorRef` is imported
2. Verify `markForCheck()` is being called
3. Check browser console for any JavaScript errors
4. Try scrolling down in the chat window

---

## 🚀 Next Steps After Successful Test

Once streaming works correctly:

1. Remove debug logging from the code
2. Create a proper commit with all changes
3. Deploy to staging environment
4. Run full end-to-end testing
5. Deploy to production

---

**Key Takeaway**: The frontend MUST send the messageId to the backend, and both must use the SAME messageId when sending/receiving chunks. This is the bridge between the message placeholder and the streaming response.

