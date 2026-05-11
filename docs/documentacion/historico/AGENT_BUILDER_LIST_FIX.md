# Fix: Error Listing Agents - Agent Builder Service

## 🔴 Problema Identificado

**Error**: `{"success":false,"error":"Error listing agents","companyId":"ALMARA FELICIDAD"}`

**URL**: `http://localhost:3300/v1/agent-builder/list`

**Causa Raíz**: El servicio intenta conectarse a un servicio KAI externo (`http://localhost:3891`) que no está corriendo.

---

## 🔍 Análisis del Error

### Flujo Original
```
Frontend (Angular)
  ↓
/v1/agent-builder/list
  ↓
agentBuilderController.listAgents()
  ↓
kaiIntegrationService.listAgents()
  ↓
agentBuilderClient.get('/agent-builder/list') ❌
  ↓
HTTP -> localhost:3891 (KAI Service - NO ESTÁ CORRIENDO)
  ↓
Error: Network Error / Connection Refused
```

### Raíz del Problema
El archivo `kaiIntegrationService.js` está configurado para:
1. Intentar conectarse a `http://localhost:3891` (servicio KAI separado)
2. Si KAI no está disponible, fallar completamente
3. No hay fallback a datos locales (Firestore)

---

## ✅ Solución Implementada

### Nueva Arquitectura - Fallback Strategy

```
Frontend (Angular)
  ↓
/v1/agent-builder/list
  ↓
agentBuilderController.listAgents()
  ↓
kaiIntegrationService.listAgents()
  ├─ Si KAI está habilitado Y disponible:
  │   └─ Usar KAI (localhost:3891) ✓ Óptimo
  │
  ├─ Si KAI falla:
  │   └─ FALLBACK a Firestore ✓ Confiable
  │
  └─ Si todo falla:
      └─ Retornar error claro
```

### Cambios en `kaiIntegrationService.js`

**Método**: `listAgents(companyId, department)`

#### Antes (Problema)
```javascript
async listAgents(companyId, department) {
  try {
    // Solo intenta KAI, sin fallback
    const response = await agentBuilderClient.get('/agent-builder/list', { params });
    // ... procesar respuesta KAI ...
  } catch (error) {
    // Si falla KAI, error total
    throw { error: error.message };
  }
}
```

#### Ahora (Solución)
```javascript
async listAgents(companyId, department) {
  try {
    // 1. Si KAI está habilitado, intentar primero
    if (this.isEnabled()) {
      try {
        const response = await agentBuilderClient.get('/agent-builder/list', { params });
        // ... procesar respuesta KAI ...
        return result; // ✓ Éxito con KAI
      } catch (kaiError) {
        console.warn('KAI failed, falling back to Firestore');
        // Continue to Firestore fallback
      }
    }

    // 2. Si KAI no disponible o fallo, usar Firestore
    const db = admin.firestore();
    let query = db.collection('companies').doc(companyId).collection('agents');

    if (department) {
      query = query.where('department', '==', department);
    }

    const snapshot = await query.get();
    const agents = [];

    snapshot.forEach(doc => {
      agents.push({
        id: doc.id,
        agentName: doc.data().agentName,
        // ... mapear datos ...
      });
    });

    return {
      success: true,
      agents: agents,
      count: agents.length,
      source: 'firestore'  // ✓ Indica que vino de Firestore
    };
  } catch (error) {
    throw { error: error.message };
  }
}
```

---

## 🎯 Ventajas de la Solución

✅ **Resilencia**: No depende de servicios externos
✅ **Fallback Automático**: Usa Firestore si KAI no está disponible
✅ **Sin Cambios de API**: El frontend sigue igual
✅ **Logging Claro**: Indica qué fuente se usó (KAI o Firestore)
✅ **Escalable**: Fácil de extender con más fallbacks

---

## 📊 Comportamiento

### Escenario 1: KAI Disponible
```
1. Request a /v1/agent-builder/list
2. KAI_ENABLED = true
3. Intenta conectar a localhost:3891
4. ✅ Conexión exitosa
5. Retorna agentes desde KAI
6. Response: { success: true, agents: [...], source: 'kai' }
```

### Escenario 2: KAI No Disponible (Actual)
```
1. Request a /v1/agent-builder/list
2. KAI_ENABLED = false o localhost:3891 no responde
3. Intenta Firestore
4. ✅ Conexión exitosa
5. Retorna agentes desde Firestore
6. Response: { success: true, agents: [...], source: 'firestore' }
```

### Escenario 3: Error Total
```
1. Request a /v1/agent-builder/list
2. KAI no disponible
3. Firestore también falla (permiso denegado, etc)
4. ❌ Error
5. Response: { success: false, error: "..." }
```

---

## 🔧 Cómo Usar

### Sin Cambios - Funciona Igual

```typescript
// Frontend - Angular (sin cambios)
constructor(private agentService: AgentService) {}

ngOnInit() {
  this.agentService.getAgents().subscribe(
    (response) => {
      this.agents = response.agents;
      console.log(`Agentes cargados desde: ${response.source}`);
    }
  );
}
```

### Verificar Configuración

```bash
# Backend - Ver si KAI está habilitado
echo $KAI_ENABLED  # false o true

# Ver variables de entorno
grep -E "KAI_ENABLED|KAI_SERVICE|AGENT_BUILDER" .env
```

---

## 📝 Notas Técnicas

### Firestore Collection Structure
```
companies/
  └─ {companyId}/
     └─ agents/
        └─ {agentId}/
           ├─ agentName: string
           ├─ department: string
           ├─ systemPrompt: string
           ├─ selectedTools: string[]
           ├─ description: string
           ├─ model: string
           ├─ status: string
           ├─ createdAt: timestamp
           ├─ updatedAt: timestamp
           └─ metadata: object
```

### KAI Integration Configuration

En `.env` o en el código:
```bash
# Habilitar KAI (experimental)
KAI_ENABLED=false  # Default: false

# URLs de servicios KAI
KAI_SERVICE_URL=http://localhost:3890
AGENT_BUILDER_URL=http://localhost:3891

# Timeout
KAI_TIMEOUT=120000
```

---

## 🧪 Testing

### Test 1: Listar Agentes (Firestore)
```bash
curl -X GET "http://localhost:3300/v1/agent-builder/list" \
  -H "company: ALMARA FELICIDAD" \
  -H "Content-Type: application/json"

# Respuesta esperada (si hay agentes en Firestore)
{
  "success": true,
  "agents": [...],
  "count": 2,
  "source": "firestore"
}
```

### Test 2: Listar Agentes por Departamento
```bash
curl -X GET "http://localhost:3300/v1/agent-builder/list?department=sales" \
  -H "company: ALMARA FELICIDAD"

# Solo retorna agentes del departamento 'sales'
```

### Test 3: Sin Company Header (Error esperado)
```bash
curl -X GET "http://localhost:3300/v1/agent-builder/list"

# Response: 400 Bad Request
# { "error": "companyId is required" }
```

---

## ✅ Verificación

Para confirmar que el fix funciona:

1. ✅ GET `/v1/agent-builder/list` retorna 200
2. ✅ Response tiene `success: true`
3. ✅ Response incluye `source: "firestore"`
4. ✅ Array `agents` está presente
5. ✅ Cada agente tiene `agentName`, `department`, etc.

---

## 📋 Resumen

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Fuente datos | Solo KAI | KAI + Firestore (fallback) |
| Si KAI falla | Error total | Usa Firestore |
| Resilencia | Baja | Alta |
| Disponibilidad | Requiere KAI | Funciona sin KAI |
| API Frontend | - | Sin cambios |

---

**Status**: ✅ FIXED
**Date**: 2025-11-12
**Impact**: Medium (listAgents was failing completely)
**Solution**: Fallback to Firestore with graceful degradation
