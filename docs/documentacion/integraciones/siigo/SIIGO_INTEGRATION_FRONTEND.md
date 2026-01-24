# Integración Frontend Siigo - Documentación de Implementación

## Resumen
Se ha implementado completamente el componente Angular de configuración de Siigo para la plataforma Katuq. El componente permite a los usuarios configurar la integración contable con Siigo API.

## Archivos Creados

### 1. Componente Principal: SiigoConfigComponent
**Ubicación:** `src/app/components/integrations/siigo-config/`

#### siigo-config.component.ts (13,282 bytes)
- Manejo completo del formulario de configuración
- Prueba de conexión con Siigo API
- Carga de datos maestros (centros de costo, tipos de documento, etc.)
- Sincronización de productos
- Integración con backend REST API

**Características principales:**
- Validación de credenciales en tiempo real
- Estados de conexión visuales (idle, testing, success, error)
- Carga asíncrona de datos maestros de Siigo
- Sincronización manual y automática de inventario
- Manejo de errores con notificaciones toast de PrimeNG

#### siigo-config.component.html (8,738 bytes)
- Template completo con componentes PrimeNG
- Formulario reactivo con validaciones
- Secciones colapsables según estado de conexión
- Resultado visual de sincronización

**Secciones del formulario:**
1. **Credenciales Siigo** - Usuario, Access Key, Partner ID
2. **Configuración Contable** - Bodegas, centros de costo, tipos de documento
3. **Mapeo de Cuentas** - Sub-componente para cuentas contables
4. **Sincronización de Inventario** - Opciones de sync automático/manual

#### siigo-config.component.scss (3,999 bytes)
- Estilos cohesivos con el sistema de diseño Katuq
- Estados visuales de conexión con colores semánticos
- Diseño responsive con grid CSS
- Override de estilos PrimeNG para consistencia

### 2. Sub-componente: SiigoMappingComponent
**Ubicación:** `src/app/components/integrations/siigo-config/siigo-mapping/`

#### siigo-mapping.component.ts (1,386 bytes)
- Implementa ControlValueAccessor para integración con formularios reactivos
- Formulario anidado para mapeo de cuentas contables

#### siigo-mapping.component.html (2,979 bytes)
- Formulario de mapeo de cuentas: ingresos, costos, inventario, descuentos
- Guía de ayuda con códigos PUC colombianos
- Iconos descriptivos por cada tipo de cuenta

#### siigo-mapping.component.scss (1,612 bytes)
- Estilos para sección de mapeo
- Guía de ayuda visual con grid responsive

## Cambios en Archivos Existentes

### integrations.service.ts
**Ubicación:** `src/app/components/integrations/integrations.service.ts`

**Métodos agregados (13 nuevos métodos):**

```typescript
// Configuración
testSiigoConnection(config: any): Observable<{success: boolean; message: string}>
loadSiigoConfig(): Observable<any>
saveSiigoConfig(config: any): Observable<any>
syncSiigoProducts(options: any): Observable<any>

// Datos maestros
getSiigoCostCenters(): Observable<any>
getSiigoDocumentTypes(): Observable<any>
getSiigoPaymentTypes(): Observable<any>
getSiigoTaxes(): Observable<any>
getSiigoPriceLists(): Observable<any>
getSiigoAccountGroups(): Observable<any>
getSiigoWarehouses(): Observable<any>

// Operaciones
createSiigoProduct(productData: any): Observable<any>
updateSiigoProduct(productId: string, productData: any): Observable<any>
createSiigoInvoice(invoiceData: any): Observable<any>
getSiigoInvoice(invoiceId: string): Observable<any>
```

Todos los métodos utilizan:
- Headers con `company` para multi-tenancy
- Endpoints del backend ya implementado `/v1/accounting/siigo/*`
- Manejo de errores consistente
- Tipado TypeScript

### integrations.module.ts
**Ubicación:** `src/app/components/integrations/integrations.module.ts`

**Cambios realizados:**

1. **Imports agregados:**
```typescript
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { SiigoConfigComponent } from './siigo-config/siigo-config.component';
import { SiigoMappingComponent } from './siigo-config/siigo-mapping/siigo-mapping.component';
```

2. **Declaraciones agregadas:**
```typescript
declarations: [
  // ... componentes existentes
  SiigoConfigComponent,
  SiigoMappingComponent
]
```

3. **Módulos PrimeNG agregados:**
```typescript
imports: [
  // ... módulos existentes
  CardModule,
  CheckboxModule,
  ProgressBarModule,
  ToastModule
]
```

4. **Ruta agregada:**
```typescript
const routes: Routes = [
  // ... rutas existentes
  { path: 'siigo', component: SiigoConfigComponent }
]
```

## Estructura de Archivos Final

```
src/app/components/integrations/
├── siigo-config/
│   ├── siigo-config.component.ts       (13 KB - Lógica principal)
│   ├── siigo-config.component.html     (8.7 KB - Template PrimeNG)
│   ├── siigo-config.component.scss     (4 KB - Estilos)
│   └── siigo-mapping/
│       ├── siigo-mapping.component.ts  (1.4 KB - Sub-componente)
│       ├── siigo-mapping.component.html (3 KB - Template mapeo)
│       └── siigo-mapping.component.scss (1.6 KB - Estilos)
├── integrations.service.ts             (ACTUALIZADO - +13 métodos)
└── integrations.module.ts              (ACTUALIZADO - Registro)
```

## Uso del Componente

### Navegación Directa
```
http://localhost:4200/integrations/siigo
```

### Desde código TypeScript
```typescript
this.router.navigate(['/integrations/siigo']);
```

### Desde integrations-list.component
Agregar botón "Configurar" en la card de Siigo que redirija a la ruta.

## Flujo de Usuario

1. **Acceso al componente** → Usuario navega a `/integrations/siigo`

2. **Ingreso de credenciales**
   - Username/Email
   - Access Key
   - Partner ID (readonly - "Katuq")
   - Checkbox modo prueba (sandbox)

3. **Prueba de conexión** → Click en "Probar Conexión"
   - Validación de formulario
   - POST `/v1/accounting/siigo/test`
   - Cambio visual de estado (idle → testing → success/error)

4. **Carga de datos maestros** (automática si conexión exitosa)
   - Centros de costo
   - Tipos de documento
   - Tipos de pago
   - Impuestos
   - Listas de precios
   - Grupos de cuentas
   - Bodegas

5. **Configuración contable**
   - Selección de bodega predeterminada
   - Selección de centro de costo
   - Tipo de documento para facturas
   - Lista de precios
   - Tasa de IVA (default 19%)
   - Facturación automática (checkbox)

6. **Mapeo de cuentas contables**
   - Grupo de cuentas
   - Cuenta de ingresos (4xxx)
   - Cuenta de costos (6xxx)
   - Cuenta de inventario (1xxx)
   - Cuenta de descuentos (4xxx)

7. **Sincronización de inventario**
   - Checkbox sincronización automática
   - Selección de frecuencia (hourly, daily, weekly, manual)
   - Botón "Sincronizar Ahora"
   - Visualización de resultados (sincronizados, errores, creados, actualizados)

8. **Guardado de configuración** → Click en "Guardar Configuración"
   - POST `/v1/integration/config`
   - Notificación toast de éxito/error

## Endpoints Backend Utilizados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/v1/accounting/siigo/test` | Prueba de conexión |
| GET | `/v1/integration/config/siigo` | Obtener config existente |
| POST | `/v1/integration/config` | Guardar configuración |
| POST | `/v1/accounting/siigo/products/sync` | Sincronizar productos |
| GET | `/v1/accounting/siigo/cost-centers` | Centros de costo |
| GET | `/v1/accounting/siigo/document-types` | Tipos de documento |
| GET | `/v1/accounting/siigo/payment-types` | Tipos de pago |
| GET | `/v1/accounting/siigo/taxes` | Impuestos |
| GET | `/v1/accounting/siigo/price-lists` | Listas de precios |
| GET | `/v1/accounting/siigo/account-groups` | Grupos de cuentas |
| GET | `/v1/accounting/siigo/warehouses` | Bodegas |
| POST | `/v1/accounting/siigo/products` | Crear producto |
| PUT | `/v1/accounting/siigo/products/:id` | Actualizar producto |
| POST | `/v1/accounting/siigo/invoices` | Crear factura |
| GET | `/v1/accounting/siigo/invoices/:id` | Obtener factura |

**Todos los endpoints requieren:**
- Header: `company: <companyId>`
- Content-Type: `application/json`

## Tecnologías y Dependencias

### Angular
- Angular 14.1.x
- Reactive Forms
- HttpClient
- RxJS (observables, operators)

### PrimeNG (14.2.x)
- **Nuevos módulos usados:**
  - `CardModule` - Cards contenedoras
  - `CheckboxModule` - Checkboxes
  - `ProgressBarModule` - Barra de progreso sync
  - `ToastModule` - Notificaciones
- **Módulos existentes reutilizados:**
  - `InputTextModule` - Inputs de texto
  - `PasswordModule` - Input de Access Key
  - `DropdownModule` - Selects
  - `ButtonModule` - Botones

### Estilos
- SCSS con variables del sistema Katuq
- Grid CSS para layouts responsive
- Flexbox para componentes
- Media queries para mobile

## Validaciones Implementadas

### Credenciales
- **username:** Requerido, mínimo 5 caracteres
- **accessKey:** Requerido, mínimo 10 caracteres
- **partnerId:** Readonly, siempre "Katuq"

### Configuración Contable
- Todos los campos opcionales (se usan defaults si no se especifican)
- **defaultTaxRate:** Número entre 0-100

### Mapeo de Cuentas
- Todos opcionales
- Formato texto libre (validación en backend)
- Guía visual con rangos PUC colombianos

### Sincronización
- **syncFrequency:** Requerido si autoSync está activo

## Estados y Feedback Visual

### Estado de Conexión (connection-status)
| Estado | Clase CSS | Color | Icono | Mensaje |
|--------|-----------|-------|-------|---------|
| idle | `.idle` | Gris | `pi-circle` | "Sin conexión verificada" |
| testing | `.testing` | Amarillo | `pi-spin pi-spinner` | "Probando conexión..." |
| success | `.success` | Verde | `pi-check-circle` | "Conexión exitosa con Siigo" |
| error | `.error` | Rojo | `pi-times-circle` | "Error en la conexión con Siigo" |

### Notificaciones Toast
- **Success:** Fondo verde, icono check
- **Error:** Fondo rojo, icono error
- **Warning:** Fondo amarillo, icono advertencia
- **Info:** Fondo azul, icono información

### Resultado de Sincronización
Grid con 4 métricas:
- **Sincronizados** (verde) - Productos procesados correctamente
- **Errores** (rojo) - Productos con error
- **Creados** (azul) - Productos nuevos en Siigo
- **Actualizados** (amarillo) - Productos actualizados en Siigo

## Responsive Design

### Breakpoints
- **Desktop:** > 768px - Grid de 2-3 columnas
- **Tablet:** 768px - Grid de 2 columnas
- **Mobile:** < 768px - Grid de 1 columna, botones full-width

### Adaptaciones Mobile
- Botones de acción en columna (no en fila)
- Grid de resultados en 1 columna
- Padding reducido en container
- Font-size reducido en ayuda contextual

## Seguridad

### Datos Sensibles
- **accessKey:** Nunca se retorna del backend después de guardar
- Campo password con toggle mask (mostrar/ocultar)
- No se cachean credenciales en localStorage

### Headers Multi-Tenancy
Todas las llamadas incluyen header `company` para aislar datos por empresa.

## Próximos Pasos Sugeridos

### 1. Integración con Lista de Integraciones
Modificar `integrations-list.component.html` para incluir:
```html
<button
  *ngIf="integration.id === 'siigo'"
  pButton
  label="Configurar"
  icon="pi pi-cog"
  (click)="navigateToSiigoConfig()"
  class="p-button-sm"></button>
```

### 2. Testing
- Tests unitarios para SiigoConfigComponent
- Tests de integración con mock del servicio
- Tests E2E del flujo completo

### 3. Mejoras Futuras
- Validación de formato de cuentas PUC en frontend
- Autocompletado de cuentas basado en catálogo
- Vista previa de configuración antes de guardar
- Historial de sincronizaciones
- Logs de errores de sincronización
- Exportar/importar configuración

### 4. Documentación de Usuario
- Crear guía de usuario con screenshots
- Video tutorial de configuración
- FAQ de errores comunes

## Compatibilidad

### Navegadores Soportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Resoluciones
- Mínima: 320px (mobile)
- Óptima: 1920px (desktop)

## Troubleshooting

### Error: "Cannot find module 'primeng/...'"
```bash
npm install primeng@14.2.0 primeicons --save
```

### Error: "Component not found in module"
Verificar que `SiigoConfigComponent` y `SiigoMappingComponent` estén declarados en `integrations.module.ts`.

### Error 401 al conectar con Siigo
- Verificar username y accessKey
- Confirmar que partnerId sea "Katuq"
- Revisar que el backend tenga las credenciales correctas

### Datos maestros no cargan
- Verificar que la conexión sea exitosa primero
- Revisar logs del backend `/v1/accounting/siigo/*`
- Confirmar permisos de la cuenta Siigo

## Autor y Soporte

**Implementado por:** Claude Code (Anthropic)
**Fecha:** Octubre 2024
**Versión Angular:** 14.1.x
**Versión PrimeNG:** 14.2.x

Para soporte técnico, revisar:
- Logs del navegador (Console)
- Network tab (llamadas HTTP)
- Backend logs en `/v1/accounting/siigo/*`

---

## Facturación Automática desde Venta Asistida

### Flujo de Facturación Siigo en Creación de Pedidos

La facturación Siigo se ejecuta de forma **asíncrona** sin bloquear la creación del pedido.

#### Condición de Activación

```typescript
// crear-ventas.component.ts línea 2828
if (orderId && (context.siigoEnabled || context.generarFacturaElectronica)) {
  context.encolarFacturacionSiigo(orderId, nroPedido);
}
```

| Configuración Global (`siigoEnabled`) | Checkbox Pedido (`generarFacturaElectronica`) | Resultado |
|--------------------------------------|-----------------------------------------------|-----------|
| `true` | cualquiera | ✅ Genera factura |
| `false` | `true` | ✅ Genera factura |
| `false` | `false` | ❌ No genera factura |

### Flujo Completo de Encolamiento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Angular)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  crear-ventas.component.ts                                                  │
│  ├── createOrder() → Crea pedido en DB                                      │
│  │                                                                          │
│  └── if (siigoEnabled || generarFacturaElectronica):                        │
│          └── encolarFacturacionSiigo(orderId, nroPedido)                    │
│                   │                                                         │
│                   ▼                                                         │
│          integrationsService.createSiigoInvoiceFromOrderAsync()             │
│                   │                                                         │
│                   │  POST /v1/accounting/siigo/invoices/from-order-async    │
│                   │  Body: { orderId, options }                             │
│                   │                                                         │
└───────────────────│─────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  accountingController.createInvoiceFromOrderAsync()                         │
│       │                                                                     │
│       ▼                                                                     │
│  siigoSyncService.enqueueInvoiceCreation()                                  │
│       │                                                                     │
│       ├── 1. Valida que pedido existe                                       │
│       ├── 2. Verifica no haya job duplicado (QUEUED/PROCESSING)             │
│       ├── 3. Crea job en Firestore: siigo_invoice_jobs (status: QUEUED)     │
│       └── 4. Encola en SQS: type="SIIGO_CREATE_INVOICE"                     │
│                                                                             │
│       ▼                                                                     │
│  HTTP 202 Accepted { jobId, message } ← NO BLOQUEA                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKER (SQS Listener)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  sqsListener.js                                                             │
│       │                                                                     │
│       └── if (messageType === "SIIGO_CREATE_INVOICE"):                      │
│               │                                                             │
│               ▼                                                             │
│           siigoSyncService.processInvoiceCreation()                         │
│               │                                                             │
│               ├── 1. Actualiza job status → "PROCESSING"                    │
│               ├── 2. accountingManager.createInvoiceFromOrder()             │
│               │       ├── Busca/crea cliente en Siigo                       │
│               │       ├── Busca/crea productos en Siigo                     │
│               │       ├── Agrega ENVIO si totalEnvio > 0                    │
│               │       └── siigoProvider.createInvoice()                     │
│               │               ├── stamp: { send: true } → DIAN ✅           │
│               │               ├── mail: { send: true }  → Email ✅          │
│               │               └── date: Colombia UTC-5  → Fecha ✅          │
│               │                                                             │
│               ├── 3. Si éxito → status="SUCCESS" + notifica usuario         │
│               └── 4. Si error:                                              │
│                       ├── Si reintentable → status="RETRY_PENDING" + reencola│
│                       └── Si no → status="FAILED" + notifica error          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICACIÓN (Firebase RTDB)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  siigoSyncService.notifyInvoiceResult()                                     │
│       │                                                                     │
│       └── Firebase RTDB: notification_queue.push({                          │
│               type: "SIIGO_INVOICE_CREATED" | "SIIGO_INVOICE_FAILED",       │
│               company: companyId,                                           │
│               title: "📄 Factura Siigo creada" | "❌ Error facturando",     │
│               message: "Factura FE-XXX generada para pedido #YYY",          │
│               actionUrl: "/ventas/pedidos/{orderId}",                       │
│               actionText: "Ver pedido"                                      │
│           })                                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (NotificationCenter)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  NotificationManagerService.listenToNotificationQueue()                     │
│       │                                                                     │
│       └── Escucha cambios en notification_queue filtrado por companyId      │
│               │                                                             │
│               ▼                                                             │
│           NotificationCenter muestra la notificación en tiempo real 🔔      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visualización en NotificationCenter

#### Estructura HTML Real del Componente (líneas 170-230)

```html
<div class="notification-item"
     [class.unread]="notification.status !== NotificationStatus.READ"
     [class]="getPriorityClass(notification.priority)">

  <!-- Icono -->
  <div class="notification-icon" [ngClass]="getNotificationIconClass(notification.type)">
    <i class="fa" [class]="getNotificationIcon(notification.type)"></i>
  </div>

  <!-- Contenido -->
  <div class="notification-content">
    <div class="notification-header">
      <h5 class="notification-title">{{ notification.title }}</h5>
      <div class="notification-meta">
        <span class="notification-time">{{ getRelativeTime(notification.createdAt) }}</span>
        <span class="notification-type">{{ getTypeName(notification.type) }}</span>
      </div>
    </div>

    <p class="notification-message">{{ notification.message }}</p>

    <div class="notification-footer" *ngIf="notification.actionText">
      <button class="btn btn-sm btn-link notification-action">
        {{ notification.actionText }}
      </button>
    </div>
  </div>

  <!-- Acciones (hover) -->
  <div class="notification-actions">
    <button class="btn-icon btn-mark-read"><i class="fa fa-check"></i></button>
    <button class="btn-icon btn-delete"><i class="fa fa-trash"></i></button>
  </div>

  <!-- Indicador no leída -->
  <div class="unread-indicator" *ngIf="notification.status !== NotificationStatus.READ"></div>
</div>
```

#### Esquema Visual de Notificaciones Siigo

```
╔═════════════════════════════════════════════════════════════════════════════╗
║                         NOTIFICATION CENTER PANEL                           ║
╠═════════════════════════════════════════════════════════════════════════════╣
║ 🔔 Notificaciones                                            ⚙️ ✓ 🗑️ ✕    ║
║ 2 no leídas                                                                 ║
╠═════════════════════════════════════════════════════════════════════════════╣
║ 🔍 Buscar notificaciones...                                            ✕    ║
║ [Todas] [No leídas (2)] [Importante] [Hoy]                                  ║
║ ▼ Todos los tipos                                                           ║
╠═════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  SIIGO_INVOICE_CREATED (Éxito):                                             ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │▌                                                                ✓  🗑 │ ║
║  │▌  ┌────┐  Factura Siigo Creada                                        │ ║
║  │▌  │ 📄 │  Hace 2m  │ FACTURA SIIGO CREADA │                           │ ║
║  │▌  └────┘                                                              │ ║
║  │▌         Factura FE-4521 generada para pedido #1847                   │ ║
║  │▌                                                                      │ ║
║  │▌         [Ver pedido]                                                 │ ║
║  │▌ •                                                                    │ ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
║    ▌= border-left: 4px solid #6366f1 (índigo, priority-normal)              ║
║    • = unread-indicator (bolita azul)                                       ║
║                                                                             ║
║  SIIGO_INVOICE_FAILED (Error):                                              ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │█                                                                ✓  🗑 │ ║
║  │█  ┌────┐  Error Facturación Siigo                                     │ ║
║  │█  │ 📊 │  Hace 5m  │ ERROR FACTURACIÓN SIIGO │                        │ ║
║  │█  └────┘                                                              │ ║
║  │█         No se pudo crear factura para pedido #1845:                  │ ║
║  │█         NIT no válido                                                │ ║
║  │█                                                                      │ ║
║  │█         [Ver pedido]                                                 │ ║
║  │█ •                                                                    │ ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
║    █= border-left: 4px solid #f59e0b (naranja, priority-high + pulso)       ║
║                                                                             ║
╚═════════════════════════════════════════════════════════════════════════════╝
```

#### Configuración de Tipos de Notificación Siigo

| Tipo | Icono | Clase Icono | Color Borde | Prioridad | Expira |
|------|-------|-------------|-------------|-----------|--------|
| `SIIGO_INVOICE_CREATED` | `fa-file-text-o` | `icon-accounting` | #6366f1 (índigo) | NORMAL | 3 días |
| `SIIGO_INVOICE_FAILED` | `fa-file-excel-o` | `icon-accounting` | #f59e0b (naranja) | HIGH + pulso | 7 días |
| `SIIGO_INVOICE_PROCESSING` | `fa-spinner` | `icon-accounting` | #6366f1 (índigo) | NORMAL | 1 hora |

#### Archivos Relacionados

| Archivo | Función |
|---------|---------|
| `notification.types.ts:55-57` | Enum `NotificationType` con SIIGO_* |
| `notification.config.ts:556-605` | Configuración de templates y canales |
| `notification-center.component.ts:391-395` | Mapeo de iconos |
| `notification-center.component.ts:515-519` | Mapeo de nombres |
| `notification-manager.service.ts:166-196` | Listener de `notification_queue` |

### Características de Robustez

| Feature | Implementación |
|---------|----------------|
| No bloquea creación pedido | HTTP 202 Accepted inmediato |
| Previene duplicados | Verifica jobs existentes en Firestore |
| Reintentos automáticos | 3 intentos con backoff exponencial |
| Notificación al usuario | Firebase RTDB → NotificationCenter |
| Tracking de estado | Firestore `siigo_invoice_jobs` |
| Email al cliente | `mail: { send: true }` si tiene email |
| Envío a DIAN | `stamp: { send: true }` automático |

---

## 🤖 PROMPT PARA PRÓXIMA INSTANCIA DE CLAUDE

### Contexto del Proyecto Siigo en Katuq

```
PROYECTO: Katuq Seller - Integración Siigo (Facturación Electrónica Colombia)
STACK: Angular 14 + Node.js + Firebase + AWS SQS
ESTADO: ✅ Implementado y funcional

ARCHIVOS CLAVE FRONTEND:
- src/app/components/ventas/crear-ventas/crear-ventas.component.ts
  └── encolarFacturacionSiigo() línea 758
  └── Llamadas en líneas 2828 y 3518
- src/app/components/integrations/siigo-config/
- src/app/shared/components/notification-center/
- src/app/shared/services/notifications/

ARCHIVOS CLAVE BACKEND:
- functions/services/accounting/siigoSyncService.js
  └── enqueueInvoiceCreation() - Encola en Firestore + SQS
  └── processInvoiceCreation() - Procesa facturación
  └── notifyInvoiceResult() - Notifica via Firebase RTDB
- functions/services/accounting/accountingManager.js
  └── createInvoiceFromOrder() - Lógica de facturación
- functions/services/accounting/providers/siigoProvider.js
  └── createInvoice() - API Siigo
- functions/services/accounting/utils/siigoDataMapper.js
  └── mapToSiigoInvoice() - Mapeo pedido → factura Siigo
- functions/handlers/sqsListener.js
  └── Procesa mensajes SIIGO_CREATE_INVOICE

FLUJO FACTURACIÓN AUTOMÁTICA:
1. Frontend: crear pedido → encolarFacturacionSiigo()
2. Backend: POST /from-order-async → siigoSyncService.enqueueInvoiceCreation()
3. Firestore: siigo_invoice_jobs (status: QUEUED)
4. SQS: mensaje type=SIIGO_CREATE_INVOICE
5. Worker: sqsListener → processInvoiceCreation()
6. Siigo API: createInvoice() con stamp.send=true, mail.send=true
7. Notificación: Firebase RTDB notification_queue
8. Frontend: NotificationCenter muestra resultado

CONDICIÓN DE FACTURACIÓN:
if (orderId && (siigoEnabled || generarFacturaElectronica))
- siigoEnabled: Configuración global enableAutoInvoicing=true
- generarFacturaElectronica: Checkbox individual del pedido

CARACTERÍSTICAS SIIGO:
- stamp: { send: true } → Envía a DIAN automáticamente
- mail: { send: !!customerEmail } → Email al cliente con PDF
- date: Fecha Colombia (UTC-5)
- Producto ENVIO si totalEnvio > 0
- Creación automática de clientes/productos en Siigo

NOTIFICACIONES:
- SIIGO_INVOICE_CREATED: Éxito, prioridad NORMAL, 3 días
- SIIGO_INVOICE_FAILED: Error, prioridad HIGH + pulso, 7 días
- Canal: Firebase RTDB notification_queue → NotificationCenter

ERRORES COMUNES:
- NIT no válido del cliente
- Producto sin código en Siigo
- Credenciales Siigo expiradas
- Rate limit de API Siigo

REINTENTOS:
- 3 intentos máximo
- Backoff exponencial (2s, 4s, 8s... max 30s)
- Errores reintentables: timeout, 502, 503, 504, rate limit
```

### Puntos Clave para Recordar

1. **La facturación NO bloquea** la creación del pedido (HTTP 202)
2. **El checkbox del pedido** (`generarFacturaElectronica`) DEBE respetarse además de la config global
3. **Tres lugares** donde se verifica la condición:
   - Línea 760: Validación interna del método
   - Línea 2828: Flujo normal de creación
   - Línea 3518: Flujo Wompi
4. **La notificación** llega al NotificationCenter via Firebase RTDB en tiempo real
5. **El email al cliente** lo envía Siigo directamente con el PDF

---

**Estado:** ✅ Implementación completa y funcional
**Archivos:** 6 archivos creados + 2 actualizados
**Líneas de código:** ~1,500 líneas totales
**Última actualización:** Enero 2026 - Facturación desde Venta Asistida
