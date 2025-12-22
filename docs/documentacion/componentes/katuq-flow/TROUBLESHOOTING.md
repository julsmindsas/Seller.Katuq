# Katuq Flow CRM - Guía de Troubleshooting

## 🚨 Problema Actual: No se conecta a la API

### Estado del Módulo
- ✅ **Módulo compilado** correctamente
- ✅ **Interfaz creada** y funcionando
- ✅ **Routing configurado** (`/katuq-flow/leads`)
- ✅ **Menú agregado** al sistema
- ❌ **API no responde** - Error de conexión

### 🔍 Verificaciones Realizadas

#### 1. Configuración de URL
```typescript
// Configuración actual en environment.ts
urlApi: 'https://api.katuq.com'
baseUrl: 'https://api.katuq.com/v1/crm-movil'
```

#### 2. Interceptor HTTP
- ✅ Interceptor configurado automáticamente
- ✅ Headers de autenticación aplicados
- ✅ Token y company incluidos

#### 3. Servicio Configurado
- ✅ Mock data removido
- ✅ Solo API real habilitada
- ✅ Logging detallado agregado

## 🛠️ Pasos de Diagnóstico

### Paso 1: Usar el Botón "Test API"
1. Ve a `/katuq-flow/leads`
2. Haz clic en el botón **"Test API"** (ícono wifi azul)
3. Revisa los mensajes en:
   - Toast de notificación en la interfaz
   - Console del navegador (F12)

### Paso 2: Verificar Console del Navegador
Busca estos logs específicos:
```javascript
🚀 Katuq Flow Service initialized with URL: [URL]
👤 Usuario encontrado: [email]
🏢 Company: [company]
🔑 Token presente: true/false
📡 Making API call to: [URL]
```

### Paso 3: Verificar Network Tab
1. Abre DevTools (F12)
2. Ve a Network tab
3. Haz clic en "Test API"
4. Busca la petición a `/v1/crm-movil/leads/simple`

## 🔧 Posibles Soluciones

### Solución 1: Verificar Permisos de Usuario
```typescript
// Verificar en console del navegador:
console.log(JSON.parse(localStorage.getItem('user')));
console.log(JSON.parse(localStorage.getItem('authorizedMenuItems')));
```

### Solución 2: Agregar Ruta a Permisos
Si la ruta no está autorizada, agregar manualmente:
```typescript
// En console del navegador:
const current = JSON.parse(localStorage.getItem('authorizedMenuItems') || '[]');
current.push({ path: 'katuq-flow/leads', title: 'Gestión de Leads' });
localStorage.setItem('authorizedMenuItems', JSON.stringify(current));
window.location.reload();
```

### Solución 3: Verificar CORS
Si hay error CORS, verificar:
- Que la API permita el dominio actual
- Headers de CORS configurados correctamente
- Protocolo HTTPS vs HTTP

### Solución 4: Verificar Endpoint
Probar endpoint directamente:
```bash
# Con tu token de autorización:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "company: YOUR_COMPANY" \
     "https://api.katuq.com/v1/crm-movil/leads/simple?limit=1"
```

### Solución 5: Usar Mock Data Temporalmente
Si necesitas ver la interfaz funcionando:
```typescript
// En el servicio, cambiar temporalmente:
private useMockData = true; // Solo para testing
```

## 📊 Códigos de Error Comunes

| Status | Significado | Solución |
|--------|-------------|----------|
| 0 | Error de red/CORS | Verificar URL y CORS |
| 401 | No autorizado | Verificar token de usuario |
| 403 | Permisos insuficientes | Verificar permisos de ruta |
| 404 | Endpoint no encontrado | Verificar URL de API |
| 500 | Error del servidor | Contactar backend |

## 🔍 Debug Step by Step

### 1. Verificar Usuario Logueado
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User data:', user);
console.log('Token exists:', !!user?.token);
console.log('Company:', user?.company);
```

### 2. Verificar Interceptor
```javascript
// En Network tab, verificar que las peticiones tengan:
// - Authorization: Bearer [token]
// - company: [company]
// - user: [nit]
```

### 3. Verificar URL Completa
```javascript
// URL esperada:
// https://api.katuq.com/v1/crm-movil/leads/simple
```

### 4. Probar con Postman/Insomnia
```
GET https://api.katuq.com/v1/crm-movil/leads/simple
Headers:
  Authorization: Bearer [tu_token]
  company: [tu_company]
  user: [tu_nit]
  Content-Type: application/json
```

## 🚀 Acciones Inmediatas

### 1. Verificar que el Backend esté Funcionando
- Confirmar que `/v1/crm-movil/leads/simple` existe
- Verificar que acepta los parámetros documentados
- Probar con herramienta externa (Postman)

### 2. Verificar Autenticación
- Token válido y no expirado
- Usuario con permisos para CRM
- Company correcta en headers

### 3. Verificar Configuración
- URL de API correcta en environment
- CORS configurado en el servidor
- Interceptor funcionando correctamente

## 📝 Logs Importantes

### Logs de Éxito:
```
✅ API Response received: [number] leads
🔗 Connection test successful
```

### Logs de Error:
```
❌ Error en API call: [error]
❌ Connection test failed: [details]
🔥 [operation] failed: [error]
```

## 🆘 Contacto para Soporte

Si después de seguir esta guía el problema persiste:

1. **Captura de pantalla** del Network tab con el error
2. **Console logs** completos
3. **Datos de usuario** (sin token, solo estructura)
4. **URL exacta** que se está llamando

**Contacto**: dev@julsmind.com
**Slack**: #katuq-flow-support

---
**Última actualización**: Enero 2025
**Versión**: 1.0.0