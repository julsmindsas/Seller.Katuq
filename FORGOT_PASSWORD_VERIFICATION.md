# Guía de Verificación - Enlace "¿Olvidaste tu contraseña?"

## ✅ Lista de Verificación

### 1. Verificar que el enlace aparece en el login
- [ ] Abrir la aplicación en `http://localhost:4200/login`
- [ ] Verificar que aparece el enlace "¿Olvidaste tu contraseña?" debajo del botón "Ingresar"
- [ ] El enlace debe tener color gris (#6c757d) y cambiar a azul (#007bff) al hacer hover
- [ ] Al hacer hover debe aparecer una línea azul debajo del texto

### 2. Verificar la navegación
- [ ] Hacer clic en "¿Olvidaste tu contraseña?"
- [ ] Debe redirigir a `/authentication/forgot-password`
- [ ] La página debe cargar correctamente sin errores en consola

### 3. Verificar funcionalidad móvil
- [ ] Abrir DevTools y cambiar a vista móvil
- [ ] El enlace debe ser visible y clickeable en móviles
- [ ] El tamaño de fuente debe ajustarse correctamente

## 🔧 Solución de Problemas

### Problema: "El enlace no aparece"
**Posibles causas:**
1. Los estilos no se compilaron correctamente
2. El módulo de traducción no está funcionando
3. Hay errores de TypeScript

**Soluciones:**
```bash
# Limpiar y recompilar
npm start
# o
ng serve --configuration development
```

### Problema: "El enlace aparece pero no funciona"
**Posibles causas:**
1. Las rutas de autenticación no están configuradas
2. El módulo AuthenticationModule no está cargado

**Verificar en consola del navegador:**
- No debe haber errores de routing
- La ruta `/authentication/forgot-password` debe resolverse

### Problema: "Error 404 al hacer clic"
**Solución:**
```typescript
// Verificar que en app-routing.module.ts esté:
{
  path: 'authentication',
  loadChildren: () => import('./pages/authentication/authentication.module').then(m => m.AuthenticationModule)
}
```

## 🎨 Personalización de Estilos

Si quieres cambiar los colores del enlace, edita en `login.component.scss`:

```scss
.forgot-password-link {
  color: #TU_COLOR_AQUI; // Color normal
  
  &:hover {
    color: #TU_COLOR_HOVER_AQUI; // Color al hover
  }
  
  &::after {
    background-color: #TU_COLOR_LINEA_AQUI; // Color de la línea
  }
}
```

## 📱 Vista Previa Esperada

### Desktop:
```
┌─────────────────────────────────────┐
│           [LOGO KATUQ]              │
│                                     │
│         Ingresa a tu cuenta         │
│                                     │
│    Email: [________________]        │
│    Pass:  [________________]        │
│                                     │
│         [   INGRESAR   ]            │
│                                     │
│       ¿Olvidaste tu contraseña?     │ ← Debe aparecer aquí
│                                     │
│           Versión: X.X.X            │
└─────────────────────────────────────┘
```

### Mobile:
```
┌───────────────────────┐
│    [LOGO KATUQ]       │
│                       │
│  Ingresa a tu cuenta  │
│                       │
│ Email: [____________] │
│ Pass:  [____________] │
│                       │
│    [  INGRESAR  ]     │
│                       │
│ ¿Olvidaste tu         │ ← Debe aparecer aquí
│ contraseña?           │
│                       │
│    Versión: X.X.X     │
└───────────────────────┘
```

## 🚀 Prueba Completa del Flujo

### Paso 1: Verificar Login
1. Ir a `/login`
2. Ver el enlace "¿Olvidaste tu contraseña?"

### Paso 2: Click en el enlace
1. Hacer clic en "¿Olvidaste tu contraseña?"
2. Debe ir a `/authentication/forgot-password`

### Paso 3: Verificar página de recuperación
1. Debe aparecer formulario con campo de email
2. Título: "Recuperar Contraseña"
3. Botón: "Enviar Instrucciones"
4. Enlace: "Volver al Login"

### Paso 4: Prueba de validación
1. Intentar enviar sin email → Debe mostrar error
2. Escribir email inválido → Debe mostrar error
3. Escribir email válido → Debe funcionar (aunque falle el backend)

## 📝 Comandos Útiles

```bash
# Ejecutar en desarrollo
npm start

# Verificar errores de TypeScript
npx tsc --noEmit

# Verificar linting
npm run lint

# Build de producción
npm run build:prod
```

## ❗ Notas Importantes

1. **Backend requerido**: Los endpoints del backend deben estar implementados para que la funcionalidad completa funcione
2. **Traducciones**: Si no aparece el texto, verificar que el módulo de traducción esté configurado
3. **Estilos**: Los estilos pueden tardar unos segundos en aplicarse durante el desarrollo

## 📞 ¿Necesitas ayuda?

Si algo no funciona:
1. Revisar la consola del navegador (F12)
2. Verificar que no hay errores de compilación en la terminal
3. Confirmar que todos los archivos se guardaron correctamente
4. Reiniciar el servidor de desarrollo (`Ctrl+C` y luego `npm start`)