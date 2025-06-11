# Módulo de Recuperación de Contraseña

Este documento describe la implementación del módulo de recuperación de contraseña para el sistema Katuq Seller.

## Descripción General

El módulo de recuperación de contraseña proporciona una funcionalidad segura y sencilla para que los usuarios puedan restablecer sus contraseñas cuando las hayan olvidado. El flujo sigue las mejores prácticas de seguridad web.

## Flujo de Recuperación

### 1. Solicitud de Recuperación
- Usuario ingresa a `/authentication/forgot-password`
- Proporciona su dirección de correo electrónico
- Sistema valida el email y envía instrucciones de recuperación

### 2. Verificación por Email
- Usuario recibe un email con un enlace seguro
- El enlace contiene un token temporal con expiración
- Al hacer clic, es redirigido a `/authentication/reset-password?token=XXXX`

### 3. Restablecimiento de Contraseña
- Sistema verifica la validez del token
- Usuario ingresa nueva contraseña con confirmación
- Contraseña es validada según políticas de seguridad
- Sistema actualiza la contraseña y confirma el cambio

## Componentes Implementados

### 1. ForgotPasswordComponent
**Ruta:** `/authentication/forgot-password`
**Archivo:** `src/app/pages/authentication/forgot-password/forgot-password.component.ts`

**Funcionalidades:**
- Formulario reactivo para captura de email
- Validación de formato de email
- Integración con AuthService para envío de email
- Retroalimentación visual del estado de la solicitud
- Redirección automática tras éxito

**Propiedades principales:**
```typescript
public forgotPasswordForm: FormGroup;
public isLoading: boolean = false;
public emailSent: boolean = false;
```

### 2. ResetPasswordComponent
**Ruta:** `/authentication/reset-password`
**Archivo:** `src/app/pages/authentication/reset-password/reset-password.component.ts`

**Funcionalidades:**
- Verificación automática del token de recuperación
- Formulario para nueva contraseña con confirmación
- Validación robusta de contraseña (requisitos de seguridad)
- Verificación de coincidencia de contraseñas
- Manejo de tokens inválidos o expirados

**Validación de contraseña:**
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (@$!%*?&)

### 3. ForgetPasswordComponent (Existente)
**Ruta:** `/authentication/forget-password`
Componente existente actualizado con la nueva funcionalidad.

## Servicios Actualizados

### AuthService
**Archivo:** `src/app/shared/services/firebase/auth.service.ts`

**Método agregado:**
```typescript
ForgotPassword(passwordResetEmail: string): Promise<any>
```

### ServiciosService
**Archivo:** `src/app/shared/services/servicios.service.ts`

**Métodos agregados:**
```typescript
forgotPassword(datos: any)              // Envía email de recuperación
verifyResetToken(datos: any)           // Verifica validez del token
resetPassword(datos: any)              // Actualiza la contraseña
```

## Endpoints de API Requeridos

### POST /v1/authentication/forgot-password
**Payload:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Email de recuperación enviado"
}
```

### POST /v1/authentication/verify-reset-token
**Payload:**
```json
{
  "token": "TOKEN_RECUPERACION"
}
```

**Respuesta:**
```json
{
  "valid": true,
  "message": "Token válido"
}
```

### POST /v1/authentication/reset-password
**Payload:**
```json
{
  "token": "TOKEN_RECUPERACION",
  "newPassword": "HASH_NUEVA_CONTRASEÑA"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

## Seguridad Implementada

### 1. Validación del Token
- Tokens con expiración temporal (recomendado: 1 hora)
- Verificación de validez antes de permitir cambio
- Tokens de un solo uso (invalidados tras uso exitoso)

### 2. Validación de Contraseña
- Política de contraseña robusta
- Hash de contraseña usando UtilsService
- Validación en frontend y backend

### 3. Protección contra Ataques
- Rate limiting recomendado en el backend
- Validación de formato de email
- Mensajes de error genéricos para evitar enumeración de usuarios

## Estilos y UX

### Diseño Responsivo
- Adaptación automática a dispositivos móviles
- Componentes optimizados para diferentes tamaños de pantalla

### Retroalimentación Visual
- Estados de carga durante las operaciones
- Mensajes de éxito y error claros
- Animaciones suaves para transiciones

### Accesibilidad
- Labels apropiados para lectores de pantalla
- Validación visual clara
- Navegación por teclado

## Configuración y Uso

### 1. Importación del Módulo
El módulo ya está configurado en `AuthenticationModule`:

```typescript
// authentication.module.ts
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
// ... otros imports

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,  // Requerido
    FormsModule,         // Requerido
    SharedModule,
    AuthenticationRoutingModule
  ],
  // ...
})
```

### 2. Rutas Configuradas
```typescript
// authentication-routing.module.ts
{
  path: 'forgot-password',
  component: ForgotPasswordComponent,
},
{
  path: 'reset-password',
  component: ResetPasswordComponent,
}
```

### 3. Enlaces en el Login
Para agregar el enlace de "¿Olvidaste tu contraseña?" en el componente de login:

```html
<a [routerLink]="'/authentication/forgot-password'" class="link">
  ¿Olvidaste tu contraseña?
</a>
```

## Personalización

### Textos e Internacionalización
Todos los textos utilizan el pipe `translate`, permitiendo fácil localización:

```html
{{ 'Recuperar Contraseña' | translate }}
{{ 'Ingresa tu correo electrónico' | translate }}
```

### Estilos
Los componentes utilizan SCSS con variables personalizables:
- Colores primarios: `#007bff`
- Colores de error: `#dc3545`
- Colores de éxito: `#28a745`

### Validaciones
Las validaciones pueden ajustarse modificando los validadores en los FormGroups:

```typescript
// Personalizar validación de contraseña
newPassword: ['', [
  Validators.required, 
  Validators.minLength(8),
  // Agregar validadores personalizados aquí
]]
```

## Testing

### Casos de Prueba Recomendados

1. **Forgot Password:**
   - Email válido envía solicitud correctamente
   - Email inválido muestra error apropiado
   - Campo vacío no permite envío
   - Loading state funciona correctamente

2. **Reset Password:**
   - Token válido permite cambio de contraseña
   - Token inválido muestra error
   - Contraseñas no coincidentes muestran error
   - Contraseña débil no es aceptada
   - Cambio exitoso redirige al login

## Consideraciones de Backend

### Base de Datos
Se recomienda crear una tabla para tokens de recuperación:

```sql
CREATE TABLE password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Generación de Tokens
- Usar tokens criptográficamente seguros
- Longitud mínima de 32 caracteres
- Expiración configurable (recomendado: 1 hora)

### Email Template
Crear plantilla de email profesional con:
- Logo de la empresa
- Instrucciones claras
- Enlace seguro con el token
- Información de expiración
- Contacto de soporte

## Mantenimiento

### Logs Recomendados
- Solicitudes de recuperación de contraseña
- Intentos de uso de tokens inválidos
- Cambios de contraseña exitosos
- Errores durante el proceso

### Monitoreo
- Frecuencia de uso del sistema de recuperación
- Tokens expirados sin usar
- Intentos de ataques (tokens inválidos repetidos)

## Próximas Mejoras

### Funcionalidades Adicionales
1. **Autenticación de dos factores (2FA)**
2. **Recuperación por SMS**
3. **Preguntas de seguridad**
4. **Historial de cambios de contraseña**
5. **Notificaciones de seguridad**

### Optimizaciones
1. **Cache de validación de tokens**
2. **Compresión de emails**
3. **Templates de email más ricos**
4. **Analytics de uso**

---

## Contacto y Soporte

Para dudas sobre la implementación o reportar issues:
- Revisar los logs del sistema
- Verificar la configuración de email del backend
- Confirmar que las rutas están correctamente configuradas
- Validar que los servicios están importados en los módulos necesarios