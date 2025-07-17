# Configuración de Permisos para Cotizaciones

## Resumen
Para habilitar el módulo de cotizaciones en el sistema Katuq Seller, es necesario agregar las rutas correspondientes al sistema de permisos del backend.

## Cambios Realizados en el Frontend

### 1. Navegación (NavService)
Se agregó el módulo de cotizaciones en el archivo `src/app/shared/services/nav.service.ts`:

```typescript
// GESTIÓN COMERCIAL
{ headTitle1: 'Gestión Comercial' },
{
  title: 'Clientes', icon: 'user-check', type: 'sub', active: false, children: [
    { path: 'ventas/clientes', title: 'Crear cliente', type: 'link' },
    { path: 'ventas/clienteslista', title: 'Listado de clientes', type: 'link' }
  ]
},
{
  title: 'Cotizaciones', icon: 'file-text', type: 'sub', active: false, children: [
    { path: 'cotizaciones', title: 'Crear cotización', type: 'link' },
    { path: 'cotizaciones/lista', title: 'Listado de cotizaciones', type: 'link' }
  ]
},
{
  title: 'Ventas', icon: 'dollar-sign', type: 'sub', active: false, children: [
    { path: 'ventas/crear-ventas', title: 'Venta asistida', type: 'link' },
    { path: 'ventas/carga-ventas', title: 'Ventas masivas', type: 'link' },
    { path: 'ventas/ventas-pos', title: 'Ventas POS', type: 'link' }
  ]
}
```

### 2. Rutas Configuradas
- **Crear cotización**: `cotizaciones`
- **Listado de cotizaciones**: `cotizaciones/lista`

## Configuración Requerida en el Backend

### 1. Agregar Permisos en la Base de Datos
El backend debe incluir las siguientes rutas en el sistema de permisos:

```json
{
  "path": "cotizaciones",
  "title": "Crear cotización",
  "module": "Gestión Comercial",
  "description": "Permite crear nuevas cotizaciones",
  "roles": ["Administrador", "Vendedor", "Gerente"]
},
{
  "path": "cotizaciones/lista",
  "title": "Listado de cotizaciones",
  "module": "Gestión Comercial", 
  "description": "Permite ver el listado de todas las cotizaciones",
  "roles": ["Administrador", "Vendedor", "Gerente"]
}
```

### 2. Roles Sugeridos
- **Administrador**: Acceso completo (crear, ver, editar, eliminar)
- **Gerente**: Acceso completo (crear, ver, editar, eliminar)
- **Vendedor**: Crear y ver sus propias cotizaciones
- **Asistente de Ventas**: Ver cotizaciones

### 3. Permisos Granulares (Opcional)
Para un control más fino, se pueden definir permisos específicos:

```json
{
  "module": "cotizaciones",
  "permissions": [
    {
      "action": "create",
      "path": "cotizaciones",
      "title": "Crear cotización"
    },
    {
      "action": "read",
      "path": "cotizaciones/lista",
      "title": "Ver cotizaciones"
    },
    {
      "action": "update",
      "path": "cotizaciones/editar",
      "title": "Editar cotización"
    },
    {
      "action": "delete",
      "path": "cotizaciones/eliminar",
      "title": "Eliminar cotización"
    },
    {
      "action": "export",
      "path": "cotizaciones/exportar",
      "title": "Exportar cotizaciones"
    }
  ]
}
```

## Flujo de Autenticación

### 1. Login
Cuando el usuario hace login, el backend debe:
1. Validar credenciales
2. Obtener el rol del usuario
3. Generar el menú de permisos incluyendo las cotizaciones
4. Enviar el menú en la respuesta del login

### 2. Estructura de Respuesta del Login
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "Usuario Test",
    "rol": "Administrador",
    "company": "Empresa Test"
  },
  "menu": [
    {
      "path": "ventas/clientes",
      "title": "Crear cliente",
      "module": "Gestión Comercial"
    },
    {
      "path": "ventas/clienteslista", 
      "title": "Listado de clientes",
      "module": "Gestión Comercial"
    },
    {
      "path": "cotizaciones",
      "title": "Crear cotización",
      "module": "Gestión Comercial"
    },
    {
      "path": "cotizaciones/lista",
      "title": "Listado de cotizaciones", 
      "module": "Gestión Comercial"
    }
  ]
}
```

## Verificación de Funcionamiento

### 1. Después de Agregar los Permisos
1. Hacer login con un usuario que tenga permisos de cotizaciones
2. Verificar que aparezca el menú "Cotizaciones" en la barra lateral
3. Verificar que se puedan acceder a las rutas:
   - `/cotizaciones` - Crear cotización
   - `/cotizaciones/lista` - Listado de cotizaciones

### 2. Usuarios Sin Permisos
1. Hacer login con un usuario sin permisos de cotizaciones
2. Verificar que NO aparezca el menú "Cotizaciones"
3. Verificar que al acceder directamente a las rutas, sea redirigido o muestre error

## Endpoints del Backend Necesarios

### 1. Cotizaciones CRUD
```
GET    /api/v1/cotizaciones          - Listar cotizaciones
POST   /api/v1/cotizaciones          - Crear cotización
GET    /api/v1/cotizaciones/:id      - Obtener cotización
PUT    /api/v1/cotizaciones/:id      - Actualizar cotización
DELETE /api/v1/cotizaciones/:id      - Eliminar cotización
```

### 2. Exportación
```
GET    /api/v1/cotizaciones/export   - Exportar cotizaciones
POST   /api/v1/cotizaciones/pdf      - Generar PDF
```

### 3. Búsquedas
```
GET    /api/v1/cotizaciones/search   - Buscar cotizaciones
GET    /api/v1/cotizaciones/cliente/:id - Cotizaciones por cliente
```

## Notas Importantes

1. **Consistencia**: Las rutas definidas en el frontend deben coincidir exactamente con las configuradas en el backend
2. **Seguridad**: El backend debe validar permisos en cada endpoint, no solo en el menú
3. **Roles**: Considerar crear roles específicos para cotizaciones si es necesario
4. **Auditoría**: Implementar logs de acceso para las operaciones de cotizaciones

## Pasos para Implementar

1. **Backend Developer**: Agregar las rutas de cotizaciones al sistema de permisos
2. **Database Admin**: Actualizar la configuración de roles y permisos
3. **QA**: Verificar que los permisos funcionen correctamente
4. **Frontend**: El código ya está listo y funcionando

## Contacto
Para dudas sobre la implementación, contactar al equipo de desarrollo frontend. 