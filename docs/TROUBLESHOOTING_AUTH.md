# Troubleshooting - Problemas de Autenticación Dashboard

## 🔍 Error 401 Unauthorized en Dashboard Analytics

### Descripción del Problema
El usuario está experimentando errores 401 (Unauthorized) al intentar cargar datos del dashboard desde los nuevos endpoints de analytics.

### Síntomas
- Error en consola: `HttpErrorResponse {status: 401, statusText: 'Unauthorized'}`
- URL afectada: `http://localhost:3300/v1/analytics/dashboard-details`
- El dashboard muestra mensaje de error de carga

### Diagnóstico Implementado

#### 1. **Logging Mejorado en AnalyticsService**
- ✅ Verificación automática del estado de autenticación
- ✅ Logs detallados de usuario y token
- ✅ Manejo específico de errores 401/403
- ✅ Headers de autenticación trackeados

#### 2. **Verificación en Dashboard Component**
- ✅ Validación de sesión activa
- ✅ Verificación de token válido
- ✅ Check de tiempo de expiración
- ✅ Manejo de errores específicos por código HTTP

### Pasos para Diagnosticar

#### Paso 1: Verificar Usuario en localStorage
```javascript
// En consola del navegador:
const user = JSON.parse(localStorage.getItem('user'));
console.log('Usuario:', user);
console.log('¿Tiene token?', !!user?.token);
console.log('Longitud token:', user?.token?.length);
```

#### Paso 2: Verificar Interceptor HTTP
```javascript
// Buscar en Network tab si las peticiones incluyen headers:
// - Authorization: Bearer <token>
// - company: <company_id>
// - user: <user_nit>
```

#### Paso 3: Verificar Estado del Servidor
```bash
# Verificar si el servidor local está ejecutándose en puerto 3300:
curl -I http://localhost:3300/health
# O verificar un endpoint conocido
```

### Posibles Causas y Soluciones

#### 1. **Token Expirado**
**Causa:** El token JWT ha expirado (> 24 horas)
**Solución:**
```typescript
// Limpiar localStorage y redirigir al login
localStorage.removeItem('user');
localStorage.removeItem('loginTime');
window.location.href = '/login';
```

#### 2. **Interceptor No Está Funcionando**
**Causa:** El HttpInterceptor2 no está aplicando headers
**Verificar:**
- ✅ Interceptor registrado en `app.module.ts`
- ✅ Usuario válido en localStorage
- ✅ Headers siendo aplicados

#### 3. **Servidor de Desarrollo No Ejecutándose**
**Causa:** `http://localhost:3300` no está disponible
**Solución:**
```typescript
// Cambiar temporalmente en environment.ts:
urlApi: "https://api.katuq.com", // API AWS en lugar de local
```

#### 4. **Formato de Token Inválido**
**Causa:** Token corrupto o en formato incorrecto
**Verificar:**
```javascript
const user = JSON.parse(localStorage.getItem('user'));
// El token debe tener formato JWT (3 partes separadas por .)
console.log('Partes del token:', user.token.split('.').length); // Debe ser 3
```

### Archivos Modificados

#### `/src/app/shared/services/dashboard/analytics.service.ts`
- ✅ Agregado logging de autenticación
- ✅ Manejo de errores 401/403
- ✅ Verificación automática de usuario

#### `/src/app/components/dashboard/dashboard.component.ts`
- ✅ Verificación de estado de autenticación
- ✅ Manejo específico de errores por código HTTP
- ✅ Logging detallado de diagnóstico

### Testing Manual

#### 1. Verificar Logs en Consola
Al cargar el dashboard, buscar estos logs:
```
🔗 Analytics Service inicializado con baseUrl: http://localhost:3300/v1/analytics
👤 Usuario en localStorage: {email: "...", company: "...", hasToken: true, ...}
🚀 Iniciando getDashboardCore...
📡 GET http://localhost:3300/v1/analytics/dashboard-core?fechaInicio=...
```

#### 2. Verificar Network Tab
- ✅ Petición incluye header `Authorization: Bearer <token>`
- ✅ Petición incluye header `company: <company_id>`
- ✅ Response status es 200 (no 401)

#### 3. Test de Conectividad
```bash
# Test simple de conectividad
ping localhost
telnet localhost 3300
```

### Solución Rápida (Fallback)

Si el problema persiste, activar el fallback automático:

```typescript
// En dashboard.component.ts, línea ~160
this.estadoCarga.error = null; // Comentar esta línea
this.loadFallbackData(); // Forzar uso de servicios legacy
```

### Configuración de Producción

Para ambiente de producción, asegurar que `environment.ts` apunte al servidor correcto:

```typescript
export const environment = {
  production: true,
  urlApi: "https://api.katuq.com", // API AWS
  // ...resto de configuración
};
```

### Contacto y Escalación

Si el problema persiste después de seguir estos pasos:
1. Verificar estado del servidor backend
2. Revisar logs del servidor para errores de autenticación
3. Verificar configuración de CORS si es cross-origin
4. Contactar al equipo de backend para verificar endpoints `/v1/analytics/*` 