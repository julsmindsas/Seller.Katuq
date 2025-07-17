# Módulo de Cotizaciones - Seller.Katuq

## Descripción

El módulo de cotizaciones es un componente completo basado en el sistema POS existente, diseñado para crear, gestionar y generar cotizaciones comerciales. Permite a los usuarios crear cotizaciones de manera intuitiva siguiendo un flujo de pasos bien definido.

## Características Principales

### ✅ Funcionalidades Implementadas

1. **Gestión de Clientes**
   - Búsqueda de clientes existentes por documento, email o nombre
   - Creación de nuevos clientes desde el formulario
   - Actualización de información de clientes existentes
   - Validación de campos requeridos

2. **Catálogo de Productos**
   - Visualización de todos los productos de la empresa (sin dependencia de bodegas)
   - Filtrado por nombre, código y categoría
   - Vista en grid y lista intercambiables
   - Búsqueda en tiempo real

3. **Carrito de Cotización**
   - Agregado de productos con cantidades personalizables
   - Cálculo automático de subtotales
   - Eliminación y modificación de items
   - Actualización de cantidades en tiempo real

4. **Cálculos Automáticos**
   - Subtotal de productos
   - Aplicación de descuentos por porcentaje
   - Cálculo de IVA (19% configurable)
   - Total final con todos los impuestos y descuentos

5. **Generación de PDF**
   - Vista previa de la cotización
   - Generación y descarga de PDF profesional
   - Información completa de empresa y cliente
   - Detalle de productos y totales

6. **Interfaz de Usuario**
   - Wizard de 4 pasos intuitivo
   - Diseño responsivo para móviles y tablets
   - Indicador visual de progreso
   - Animaciones y transiciones suaves

## Estructura de Archivos

```
src/app/components/cotizaciones/
├── cotizaciones.component.ts          # Lógica principal del componente
├── cotizaciones.component.html        # Plantilla HTML del wizard
├── cotizaciones.component.scss        # Estilos personalizados
├── cotizaciones.module.ts             # Módulo con dependencias
├── cotizaciones-routing.module.ts     # Configuración de rutas
├── cotizaciones.service.ts            # Servicio para operaciones HTTP
└── COTIZACIONES_README.md            # Esta documentación
```

## Flujo de Trabajo

### Paso 1: Cliente
- Búsqueda de cliente existente
- Creación de nuevo cliente si no existe
- Validación de datos requeridos

### Paso 2: Productos
- Navegación por catálogo de productos
- Filtrado y búsqueda
- Agregado de productos al carrito
- Modificación de cantidades

### Paso 3: Resumen
- Revisión de información del cliente
- Configuración de validez y descuentos
- Vista detallada de productos y totales
- Guardado de la cotización

### Paso 4: PDF
- Vista previa del documento
- Generación y descarga del PDF
- Formato profesional con información completa

## Modelos de Datos

### CotizacionItem
```typescript
interface CotizacionItem {
  producto: Producto;
  cantidad: number;
  precio: number;
  subtotal: number;
}
```

### Cotizacion
```typescript
interface Cotizacion {
  id?: string;
  numero?: string;
  fecha: string;
  cliente: Cliente;
  items: CotizacionItem[];
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  observaciones?: string;
  validez: string;
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';
}
```

## Dependencias

### Módulos de Angular
- `CommonModule`
- `FormsModule`
- `ReactiveFormsModule`

### Módulos de PrimeNG
- `TableModule` - Tablas de datos
- `ButtonModule` - Botones estilizados
- `InputTextModule` - Campos de texto
- `CalendarModule` - Selector de fechas
- `DropdownModule` - Menús desplegables
- `DialogModule` - Ventanas modales
- `ToastModule` - Notificaciones
- `ConfirmDialogModule` - Diálogos de confirmación
- `CardModule` - Tarjetas UI
- `InputNumberModule` - Campos numéricos
- `InputTextareaModule` - Áreas de texto

### Librerías Externas
- `jspdf` - Generación de PDFs
- `html2canvas` - Captura de elementos HTML
- `sweetalert2` - Alertas y confirmaciones
- `ngx-toastr` - Notificaciones toast

## Rutas Configuradas

```typescript
const routes: Routes = [
  {
    path: '',
    component: CotizacionesComponent,
    data: { title: 'Cotizaciones', breadcrumb: 'Cotizaciones' }
  },
  {
    path: 'crear',
    component: CotizacionesComponent,
    data: { title: 'Crear Cotización', breadcrumb: 'Crear Cotización' }
  },
  {
    path: 'editar/:id',
    component: CotizacionesComponent,
    data: { title: 'Editar Cotización', breadcrumb: 'Editar Cotización' }
  },
  {
    path: 'ver/:id',
    component: CotizacionesComponent,
    data: { title: 'Ver Cotización', breadcrumb: 'Ver Cotización' }
  }
];
```

## Servicios Implementados

### CotizacionesService
Proporciona métodos para:
- CRUD completo de cotizaciones
- Generación de PDFs
- Envío por email
- Conversión a pedidos
- Exportación e importación
- Estadísticas y reportes

## Estilos y Diseño

### Características del Diseño
- **Responsive**: Adaptable a móviles, tablets y desktop
- **Moderno**: Uso de Bootstrap 5 y componentes PrimeNG
- **Intuitivo**: Wizard paso a paso con indicadores visuales
- **Profesional**: Diseño limpio y organizado

### Animaciones
- Transiciones suaves entre pasos
- Efectos hover en productos
- Animaciones de carga
- Feedback visual de acciones

## Instalación y Uso

### 1. Importar el Módulo
El módulo ya está configurado para carga lazy en el routing principal:

```typescript
{
  path: 'cotizaciones',
  loadChildren: () => import('../cotizaciones/cotizaciones.module').then(m => m.CotizacionesModule)
}
```

### 2. Acceder a las Rutas
- `/cotizaciones` - Lista de cotizaciones
- `/cotizaciones/crear` - Crear nueva cotización
- `/cotizaciones/editar/:id` - Editar cotización existente
- `/cotizaciones/ver/:id` - Ver cotización

### 3. Configuración Requerida
- Configurar URL de API en el servicio
- Asegurar que los servicios de clientes y productos estén disponibles
- Verificar permisos de usuario para acceso al módulo

## Próximas Mejoras

### Funcionalidades Pendientes
- [ ] Lista de cotizaciones con paginación y filtros
- [ ] Plantillas de cotizaciones predefinidas
- [ ] Envío automático por email
- [ ] Seguimiento de estados de cotización
- [ ] Integración con sistema de facturación
- [ ] Reportes y estadísticas avanzadas
- [ ] Workflow de aprobaciones
- [ ] Comentarios y notas internas

### Optimizaciones Técnicas
- [ ] Implementar lazy loading para el catálogo de productos
- [ ] Agregar cache para mejorar rendimiento
- [ ] Implementar paginación virtual para listas grandes
- [ ] Optimizar generación de PDFs para archivos grandes
- [ ] Agregar tests unitarios y de integración

## Soporte y Mantenimiento

Para reportar bugs o solicitar nuevas funcionalidades, crear un issue en el repositorio del proyecto con la etiqueta `cotizaciones`.

### Contacto
- Equipo de desarrollo: dev@katuq.com
- Documentación técnica: docs.katuq.com
- Soporte: soporte@katuq.com

---

**Nota**: Este módulo está basado en el sistema POS existente y mantiene la consistencia con el resto de la aplicación Seller.Katuq. 