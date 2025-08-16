# 🎤 Agente de Voz para Ventas Katuq

## 📋 Descripción General

Este sistema implementa un agente de voz inteligente que permite realizar ventas completas en Katuq usando comandos de voz. El sistema se integra directamente con el `OrderToolsRegistrarService` existente para ejecutar operaciones reales de venta.

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **`VoiceAgentSalesService`** - Servicio principal que gestiona el flujo de ventas por voz
2. **`VoiceSalesIntegrationService`** - Integra comandos de voz con las herramientas reales de venta
3. **`VoiceSalesWizardComponent`** - Interfaz completa del wizard de ventas por voz
4. **`VoiceSalesDemoComponent`** - Componente de demostración automática

### Flujo de Ventas

```
Inicio → Selección Bodega → Productos → Cliente → Entrega → Facturación → Pago → Confirmación
```

## 🚀 Características Principales

### ✅ Funcionalidades Implementadas

- **Gestión de Estado**: Control completo del flujo de ventas con validaciones en tiempo real
- **Integración Real**: Conexión directa con `OrderToolsRegistrarService` para operaciones reales
- **Comandos de Voz**: Sistema de comandos naturales en español
- **Validaciones**: Verificación automática de requisitos antes de avanzar
- **Interfaz Moderna**: UI responsiva con indicadores visuales claros
- **Demo Automático**: Demostración completa del sistema paso a paso

### 🎯 Comandos de Voz Soportados

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `seleccionar bodega` | Selecciona una bodega | "Seleccionar bodega 1" |
| `buscar productos` | Busca productos disponibles | "Buscar productos camisetas" |
| `agregar al carrito` | Agrega productos al carrito | "Agregar al carrito 123 2" |
| `buscar cliente` | Busca cliente existente | "Buscar cliente 12345678" |
| `crear cliente` | Crea nuevo cliente | "Crear cliente Juan Pérez 12345678" |
| `configurar entrega` | Configura dirección de entrega | "Configurar entrega Calle 123" |
| `configurar facturación` | Completa datos de facturación | "Configurar facturación Juan Pérez 12345678" |
| `procesar venta` | Finaliza y procesa la venta | "Procesar venta" |

## 📁 Estructura de Archivos

```
src/app/shared/services/voice-agent/
├── README.md                           # Esta documentación
├── voice-agent-sales.service.ts        # Servicio principal de ventas por voz
├── voice-sales-integration.service.ts  # Integración con herramientas reales
└── components/
    ├── voice-sales-wizard/             # Wizard completo de ventas
    │   ├── voice-sales-wizard.component.ts
    │   ├── voice-sales-wizard.component.html
    │   ├── voice-sales-wizard.component.scss
    │   └── voice-sales-wizard.module.ts
    └── voice-sales-demo/               # Componente de demostración
        ├── voice-sales-demo.component.ts
        ├── voice-sales-demo.component.html
        ├── voice-sales-demo.component.scss
        └── voice-sales-demo.module.ts
```

## 🔧 Instalación y Configuración

### 1. Importar Módulos

```typescript
// En tu módulo principal
import { VoiceSalesWizardModule } from './shared/components/voice-agent/voice-sales-wizard/voice-sales-wizard.module';
import { VoiceSalesDemoModule } from './shared/components/voice-agent/voice-sales-demo/voice-sales-demo.module';

@NgModule({
  imports: [
    VoiceSalesWizardModule,
    VoiceSalesDemoModule,
    // ... otros módulos
  ]
})
export class AppModule { }
```

### 2. Agregar Rutas

```typescript
// En tu archivo de rutas
const routes: Routes = [
  {
    path: 'voice-sales-wizard',
    component: VoiceSalesWizardComponent
  },
  {
    path: 'voice-sales-demo',
    component: VoiceSalesDemoComponent
  }
];
```

### 3. Verificar Dependencias

Asegúrate de tener instaladas las siguientes dependencias:

```json
{
  "dependencies": {
    "ngx-toastr": "^15.0.0",
    "@angular/forms": "^14.0.0",
    "@angular/common": "^14.0.0"
  }
}
```

## 💻 Uso del Sistema

### Uso Básico

1. **Iniciar Sesión de Voz**:
   ```typescript
   this.voiceSalesService.startVoiceSales();
   ```

2. **Ejecutar Comando**:
   ```typescript
   const result = await this.voiceIntegrationService.executeVoiceCommand(
     'seleccionar bodega 1',
     { warehouseId: '1' }
   );
   ```

3. **Obtener Progreso**:
   ```typescript
   const progress = this.voiceSalesService.getCurrentProgress();
   ```

### Uso Avanzado

```typescript
// Suscribirse al progreso
this.voiceSalesService.salesProgress$.subscribe(progress => {
  console.log('Progreso actual:', progress);
});

// Navegar entre pasos
this.voiceSalesService.nextStep();
this.voiceSalesService.goToStep(3);

// Obtener estado del pedido
const orderStatus = this.voiceSalesService.getOrderStatus();
```

## 🎨 Personalización

### Modificar Pasos del Flujo

```typescript
// En VoiceAgentSalesService
private salesSteps: VoiceSalesStep[] = [
  {
    id: 1,
    name: 'Nuevo Paso',
    key: 'new-step',
    description: 'Descripción del nuevo paso',
    icon: 'fa-icon',
    // ... otras propiedades
  }
];
```

### Agregar Nuevos Comandos

```typescript
// En VoiceSalesIntegrationService
case 'nuevo-comando':
  result = await this.executeNewCommand(args);
  break;

private async executeNewCommand(args: any): Promise<VoiceSalesExecutionResult> {
  // Implementar lógica del nuevo comando
}
```

## 🔍 Monitoreo y Debugging

### Logs del Sistema

El sistema genera logs detallados de todas las operaciones:

```typescript
// Habilitar logs detallados
this.voiceIntegrationService.commandHistory$.subscribe(history => {
  console.log('Historial de comandos:', history);
});
```

### Estado del Sistema

```typescript
// Verificar estado completo
const systemStatus = {
  voiceService: this.voiceSalesService.isActive$,
  integration: this.voiceIntegrationService.isProcessing$,
  progress: this.voiceSalesService.getCurrentProgress()
};
```

## 🧪 Testing

### Pruebas Unitarias

```bash
# Ejecutar pruebas del servicio
ng test voice-agent-sales.service.spec.ts

# Ejecutar pruebas del integrador
ng test voice-sales-integration.service.spec.ts
```

### Pruebas de Integración

```bash
# Ejecutar pruebas del componente
ng test voice-sales-wizard.component.spec.ts

# Ejecutar pruebas del demo
ng test voice-sales-demo.component.spec.ts
```

## 🚨 Solución de Problemas

### Problemas Comunes

1. **Error: "Comando no reconocido"**
   - Verificar que el comando esté en la lista de comandos soportados
   - Revisar la sintaxis del comando

2. **Error: "No se puede avanzar al siguiente paso"**
   - Verificar que todos los requisitos del paso actual estén completos
   - Revisar los logs para identificar requisitos faltantes

3. **Error: "Integración con OrderTools en desarrollo"**
   - Verificar que el `OrderToolsRegistrarService` esté disponible
   - Comprobar que las dependencias estén correctamente inyectadas

### Debugging

```typescript
// Habilitar modo debug
this.voiceSalesService.debugMode = true;

// Ver logs detallados
console.log('Estado del pedido:', this.voiceSalesService.getOrderStatus());
console.log('Progreso actual:', this.voiceSalesService.getCurrentProgress());
```

## 📈 Mejoras Futuras

### Funcionalidades Planificadas

- [ ] **Reconocimiento de Voz Real**: Integración con Web Speech API
- [ ] **Machine Learning**: Mejora de comandos usando IA
- [ ] **Multiidioma**: Soporte para inglés y otros idiomas
- [ ] **Analytics**: Métricas de uso y rendimiento
- [ ] **Integración con Chatbots**: Conexión con sistemas de chat existentes

### Optimizaciones Técnicas

- [ ] **Lazy Loading**: Carga perezosa de componentes
- [ ] **Service Workers**: Funcionalidad offline
- [ ] **PWA**: Aplicación web progresiva
- [ ] **Performance**: Optimización de renderizado

## 🤝 Contribución

### Guías de Desarrollo

1. **Estilo de Código**: Seguir las convenciones de Angular
2. **Testing**: Mantener cobertura de pruebas > 80%
3. **Documentación**: Documentar todas las nuevas funcionalidades
4. **Revisión**: Todas las PRs deben ser revisadas

### Proceso de Contribución

1. Fork del repositorio
2. Crear rama para nueva funcionalidad
3. Implementar cambios con tests
4. Crear Pull Request con descripción detallada
5. Esperar revisión y aprobación

## 📞 Soporte

### Contacto

- **Desarrollador**: Equipo de Desarrollo Katuq
- **Email**: dev@katuq.com
- **Documentación**: [Wiki del Proyecto](https://wiki.katuq.com)

### Recursos Adicionales

- [Documentación de Angular](https://angular.io/docs)
- [Guía de RxJS](https://rxjs.dev/guide/overview)
- [Bootstrap Components](https://getbootstrap.com/docs/5.0/components/)

---

**Versión**: 1.0.0  
**Última Actualización**: Diciembre 2024  
**Compatibilidad**: Angular 14+  
**Licencia**: MIT
