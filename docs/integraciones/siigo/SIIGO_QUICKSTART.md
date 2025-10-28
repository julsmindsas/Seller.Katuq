# Siigo Integration - Guía Rápida de Uso

## Implementación Completa ✅

Se ha implementado exitosamente el componente Angular de configuración de Siigo.

## Archivos Creados

### Componente Principal
```
src/app/components/integrations/siigo-config/
├── siigo-config.component.ts      (Lógica del componente)
├── siigo-config.component.html    (Template PrimeNG)
├── siigo-config.component.scss    (Estilos)
└── siigo-mapping/
    ├── siigo-mapping.component.ts
    ├── siigo-mapping.component.html
    └── siigo-mapping.component.scss
```

### Archivos Modificados
- `src/app/components/integrations/integrations.service.ts` (+13 métodos Siigo)
- `src/app/components/integrations/integrations.module.ts` (Registro de componentes)

## Cómo Acceder

### Opción 1: URL Directa
```
http://localhost:4200/integrations/siigo
```

### Opción 2: Desde Código
```typescript
this.router.navigate(['/integrations/siigo']);
```

### Opción 3: Agregar Botón en Lista de Integraciones
Editar `integrations-list.component.html` y agregar:
```html
<button
  *ngIf="integration.id === 'siigo'"
  pButton
  label="Configurar Siigo"
  icon="pi pi-cog"
  routerLink="/integrations/siigo"
  class="p-button-success"></button>
```

## Flujo de Configuración (5 pasos)

### Paso 1: Ingresar Credenciales
- **Usuario/Email:** Tu email de Siigo
- **Access Key:** Tu Access Key de Siigo API
- **Partner ID:** Katuq (readonly)
- **Modo Prueba:** Checkbox para sandbox

### Paso 2: Probar Conexión
- Click en botón "Probar Conexión"
- Esperar verificación (estado visual cambia a verde si exitoso)

### Paso 3: Configurar Opciones Contables
- Seleccionar bodega predeterminada
- Seleccionar centro de costo
- Elegir tipo de documento
- Configurar tasa de IVA (default 19%)

### Paso 4: Mapear Cuentas Contables
- Cuenta de ingresos (4xxx)
- Cuenta de costos (6xxx)
- Cuenta de inventario (1xxx)
- Cuenta de descuentos (4xxx)

### Paso 5: Guardar y Sincronizar
- Click en "Guardar Configuración"
- (Opcional) Click en "Sincronizar Ahora" para sincronizar productos

## Características Principales

### 1. Prueba de Conexión
- Valida credenciales antes de guardar
- Feedback visual inmediato (verde/rojo)
- Carga automática de datos maestros si exitoso

### 2. Datos Maestros Dinámicos
Se cargan automáticamente desde Siigo:
- ✅ Centros de costo
- ✅ Tipos de documento
- ✅ Tipos de pago
- ✅ Impuestos
- ✅ Listas de precios
- ✅ Grupos de cuentas
- ✅ Bodegas

### 3. Sincronización de Productos
- **Manual:** Click en "Sincronizar Ahora"
- **Automática:** Configurar frecuencia (hourly, daily, weekly)
- **Resultado visual:** Muestra productos sincronizados, errores, creados, actualizados

### 4. Validaciones
- Campos requeridos marcados con *
- Validación de longitud mínima
- Mensajes de error contextuales
- Prevención de guardado sin conexión exitosa

## Endpoints Backend Utilizados

El componente se integra con los siguientes endpoints del backend:

| Endpoint | Propósito |
|----------|-----------|
| `POST /v1/accounting/siigo/test` | Probar conexión |
| `GET /v1/integration/config/siigo` | Cargar config existente |
| `POST /v1/integration/config` | Guardar configuración |
| `POST /v1/accounting/siigo/products/sync` | Sincronizar productos |
| `GET /v1/accounting/siigo/cost-centers` | Datos maestros |
| `GET /v1/accounting/siigo/document-types` | Datos maestros |
| `GET /v1/accounting/siigo/warehouses` | Datos maestros |

**Todos requieren header:** `company: <companyId>`

## Componentes PrimeNG Utilizados

- ✅ Card (contenedores)
- ✅ InputText (campos de texto)
- ✅ Password (Access Key con toggle)
- ✅ Dropdown (selects)
- ✅ Checkbox (opciones booleanas)
- ✅ Button (acciones)
- ✅ ProgressBar (sincronización)
- ✅ Toast (notificaciones)

## Estados Visuales

### Status de Conexión
| Estado | Color | Icono | Mensaje |
|--------|-------|-------|---------|
| Idle | Gris | ○ | "Sin conexión verificada" |
| Testing | Amarillo | ⟳ | "Probando conexión..." |
| Success | Verde | ✓ | "Conexión exitosa con Siigo" |
| Error | Rojo | ✗ | "Error en la conexión con Siigo" |

## Ejemplo de Uso Completo

```typescript
// 1. Usuario navega al componente
router.navigate(['/integrations/siigo']);

// 2. Ingresa credenciales
username: "mi-email@empresa.com"
accessKey: "abc123xyz789..."
partnerId: "Katuq" (readonly)

// 3. Click "Probar Conexión"
// → Backend valida credenciales
// → Estado cambia a "success" (verde)
// → Carga datos maestros automáticamente

// 4. Selecciona opciones
defaultWarehouse: "Bodega Principal"
defaultCostCenter: "Centro 001"
documentTypeId: "FV - Factura de Venta"
defaultTaxRate: 19

// 5. Mapea cuentas
incomeAccount: "4135"
costAccount: "6135"
inventoryAccount: "1435"

// 6. Guarda configuración
// → POST /v1/integration/config
// → Notificación toast verde: "Configuración guardada"

// 7. Sincroniza productos
// → POST /v1/accounting/siigo/products/sync
// → Muestra resultado: "Sincronizados: 50, Errores: 0"
```

## Troubleshooting Rápido

### No aparece el componente en la ruta
```bash
# Verificar que el módulo está cargado
ng serve
# Navegar a http://localhost:4200/integrations/siigo
```

### Error de módulos PrimeNG
```bash
# Instalar PrimeNG si no está
npm install primeng@14.2.0 primeicons --save
```

### Error 401 al probar conexión
- Verificar username y accessKey correctos
- Confirmar que partnerId sea "Katuq"
- Revisar backend logs

### Datos maestros no cargan
1. Verificar que la conexión fue exitosa (verde)
2. Abrir DevTools → Network tab
3. Buscar llamadas a `/v1/accounting/siigo/*`
4. Revisar respuestas del backend

## Siguiente Paso Recomendado

### Agregar botón en el listado de integraciones

**Archivo:** `src/app/components/integrations/integrations-list.component.html`

**Buscar la card de Siigo y agregar:**
```html
<div class="integration-card" *ngIf="isIntegrationVisible('siigo')">
  <div class="integration-header">
    <img src="assets/images/logos/siigo.svg" alt="Siigo">
    <h3>Siigo</h3>
  </div>

  <p>Software contable y administrativo colombiano</p>

  <div class="integration-actions">
    <button
      pButton
      label="Configurar"
      icon="pi pi-cog"
      routerLink="/integrations/siigo"
      class="p-button-success"></button>
  </div>
</div>
```

## Testing Manual Sugerido

### Test 1: Flujo Completo Exitoso
1. ✓ Navegar a `/integrations/siigo`
2. ✓ Ingresar credenciales válidas
3. ✓ Probar conexión → Verde
4. ✓ Verificar que se cargan datos maestros
5. ✓ Seleccionar opciones
6. ✓ Guardar configuración
7. ✓ Sincronizar productos

### Test 2: Validaciones
1. ✓ Intentar guardar sin probar conexión → Error
2. ✓ Dejar username vacío → Mensaje de error
3. ✓ Access Key < 10 caracteres → Mensaje de error

### Test 3: Errores de Conexión
1. ✓ Credenciales incorrectas → Estado rojo
2. ✓ Backend down → Mensaje de error
3. ✓ Timeout → Manejo correcto

## Métricas de Implementación

- **Archivos creados:** 6
- **Archivos modificados:** 2
- **Líneas de código:** ~1,500
- **Componentes:** 2 (principal + sub-componente)
- **Métodos en servicio:** 13 nuevos
- **Módulos PrimeNG:** 4 nuevos
- **Tiempo estimado de uso:** 5-10 minutos

## Documentación Adicional

Para información técnica detallada, consultar:
- `SIIGO_INTEGRATION_FRONTEND.md` - Documentación completa
- `katuq_admin_back_firebase/docs/API_SIIGO.md` - Documentación del backend

## Soporte

Si encuentras problemas:
1. Revisar logs del navegador (Console)
2. Revisar llamadas HTTP (Network tab)
3. Verificar backend logs
4. Consultar documentación del backend Siigo

---

**Estado:** ✅ Listo para usar
**Versión:** 1.0.0
**Fecha:** Octubre 2024
