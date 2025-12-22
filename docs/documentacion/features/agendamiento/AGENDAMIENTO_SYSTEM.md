# Sistema de Agendamiento Video Agent

## 📋 Descripción General

Sistema dual de agendamiento para el módulo Video Agent que permite dos modos de operación:
- **DEMO MODE**: Flujo simplificado para demostraciones y testing
- **PRODUCTION MODE**: Flujo completo con validaciones y confirmaciones

## 🎯 Modo DEMO

### Características
- ✅ Solo requiere **nombre del cliente**
- ✅ Auto-agenda para **mañana a las 10:00 AM**
- ✅ **Sin validaciones** de teléfono/email
- ✅ **Ubicación auto-detectada** (si está disponible)
- ✅ **Confirmación instantánea**
- ✅ Número de confirmación con prefijo `DEMO-`

### Flujo Conversacional (DEMO)

**1. Gemini detecta necesidad de servicio:**
```
Gemini: "Veo que tu pantalla está rota. Necesitas reparación profesional. 
         ¿Cuál es tu nombre para agendar la cita?"
```

**2. Usuario proporciona nombre:**
```
Usuario: "Mi nombre es Daniel García"
```

**3. Gemini auto-agenda inmediatamente:**
```
Gemini: "Perfecto Daniel! Tu cita está agendada para mañana a las 10:00 AM.
         Tu número de confirmación es: DEMO-12345678-123
         Recibirás más detalles por correo."
```

**Total: 2 intercambios conversacionales**

### Configuración DEMO

**environment.ts:**
```typescript
videoAgent: {
  mode: 'DEMO',
  autoDetectLocation: true,
  defaultAppointment: {
    time: '10:00 - 12:00',
    daysAhead: 1
  }
}
```

**apple-adapter.ts:**
```typescript
private readonly DEMO_MODE = true;
```

### Datos de la Cita DEMO

```typescript
{
  confirmationNumber: "DEMO-12345678-123",
  customerName: "Daniel García",
  phone: "Demo - Auto-detected",
  email: "demo@katuq.com",
  appointmentDate: "2025-10-27", // Mañana
  appointmentTime: "10:00 - 12:00",
  serviceType: "diagnostic",
  deviceInfo: "iPhone 14 Pro",
  issueSummary: "Pantalla rota",
  address: "Auto-detected location",
  city: "Bogotá",
  specialNotes: "🎯 DEMO MODE - Auto-scheduled for tomorrow 10:00 AM",
  status: "confirmed",
  isDemoMode: true
}
```

## 📋 Modo PRODUCTION

### Características
- ✅ Requiere **nombre, teléfono (10 dígitos), email**
- ✅ **Validaciones** estrictas de formato
- ✅ Verificación de **disponibilidad de horarios**
- ✅ Usuario selecciona **fecha y hora** preferidas
- ✅ **Confirmación por email**
- ✅ Número de confirmación con prefijo `APL-`
- ✅ Estado inicial `pending` hasta confirmación

### Flujo Conversacional (PRODUCTION)

**1. Gemini detecta necesidad de servicio:**
```
Gemini: "Tu dispositivo necesita reparación profesional. 
         El costo estimado es $150-200 USD.
         ¿Te gustaría agendar una cita?"
```

**2. Usuario acepta:**
```
Usuario: "Sí, quiero agendar"
```

**3. Gemini recolecta información:**
```
Gemini: "Perfecto. ¿Cuál es tu nombre completo?"
Usuario: "Daniel García"

Gemini: "Gracias Daniel. ¿Cuál es tu número de teléfono?"
Usuario: "3001234567"

Gemini: "¿Y tu email?"
Usuario: "daniel@example.com"

Gemini: "¿Puedo detectar tu ubicación para pre-llenar la dirección?"
Usuario: "Sí, claro"
```

**4. Gemini muestra disponibilidad:**
```
Gemini: "Tengo disponibilidad esta semana:
         - Lunes 28 Oct: 10-12, 14-16, 16-18
         - Martes 29 Oct: 10-12, 14-16
         - Miércoles 30 Oct: 10-12, 14-16, 16-18
         ¿Cuál prefieres?"
```

**5. Usuario selecciona:**
```
Usuario: "Martes a las 10"
```

**6. Gemini confirma:**
```
Gemini: "¡Listo! Tu cita está confirmada:
         Fecha: Martes 29 de Octubre
         Hora: 10:00 - 12:00
         Confirmación: APL-12345678-123
         Te enviamos un email a daniel@example.com con los detalles."
```

**Total: ~6-8 intercambios conversacionales**

### Configuración PRODUCTION

**environment.prod.ts:**
```typescript
videoAgent: {
  mode: 'PRODUCTION',
  autoDetectLocation: false,
  defaultAppointment: {
    time: '10:00 - 12:00',
    daysAhead: 1
  }
}
```

**apple-adapter.ts:**
```typescript
private readonly DEMO_MODE = false;
```

### Validaciones PRODUCTION

```typescript
// Teléfono: 10 dígitos
validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
}

// Email: formato válido
validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Fecha: debe ser futura
validateDate(date: string): boolean {
  const appointmentDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return appointmentDate >= today;
}
```

## 🔄 Arquitectura del Sistema

### Componentes Principales

#### 1. **AgendamientoService** (`agendamiento.service.ts`)
Servicio centralizado que maneja la lógica de agendamiento.

**Métodos principales:**
- `createDemoAppointment()` - Crea cita modo DEMO
- `createProductionAppointment()` - Crea cita modo PRODUCTION con validaciones
- `createAppointment()` - Método wrapper que decide entre DEMO/PRODUCTION
- `getAvailableTimeSlots()` - Retorna slots disponibles (14 días)
- `cancelAppointment()` - Cancela una cita
- `setMode()` - Cambia entre DEMO/PRODUCTION

**Persistencia:**
- localStorage: `katuq_appointments`
- BehaviorSubject para reactividad

#### 2. **AppleAdapter** (`apple-adapter.ts`)
Adapter que procesa las llamadas de función de Gemini.

**Herramientas de agendamiento:**
- `collect_customer_info` - Recolecta datos del cliente
- `get_available_time_slots` - Obtiene horarios disponibles
- `confirm_appointment` - Confirma la cita

**Flujo interno:**
```typescript
// 1. Gemini llama collect_customer_info
processResult("collect_customer_info") 
  → Modo DEMO: auto_schedule_demo
  → Modo PRODUCTION: customer_info_collected

// 2. En DEMO: Va directo a confirmación
getNextAction("auto_schedule_demo")
  → action: "SCHEDULE_SERVICE"
  → Cita creada automáticamente

// 3. En PRODUCTION: Solicita horarios
getNextAction("customer_info_collected")
  → action: "SHOW_INFO"
  → Gemini llama get_available_time_slots

// 4. Usuario selecciona horario
Gemini llama confirm_appointment
  → action: "SCHEDULE_SERVICE"
```

#### 3. **GeolocationService** (`geolocation.service.ts`)
Maneja detección automática de ubicación.

**Características:**
- HTML5 Geolocation API
- Reverse geocoding con Nominatim (OpenStreetMap)
- Cálculo de distancia (Haversine)
- Manejo de errores y permisos

#### 4. **Environment Configuration**
Control global del modo de operación.

**Variables:**
```typescript
videoAgent: {
  mode: 'DEMO' | 'PRODUCTION',
  autoDetectLocation: boolean,
  defaultAppointment: {
    time: string,
    daysAhead: number
  }
}
```

## 📊 Comparativa DEMO vs PRODUCTION

| Característica | DEMO | PRODUCTION |
|---------------|------|------------|
| **Datos requeridos** | Solo nombre | Nombre + teléfono + email |
| **Validaciones** | Ninguna | Estrictas |
| **Fecha/hora** | Auto (mañana 10 AM) | Usuario selecciona |
| **Disponibilidad** | No se verifica | Se verifica contra citas existentes |
| **Ubicación** | Auto-detectada | Opcional (con permiso) |
| **Email confirmación** | No se envía | Se envía (TODO: implementar) |
| **Prefijo confirmación** | DEMO- | APL- |
| **Estado inicial** | confirmed | pending |
| **Intercambios** | ~2 | ~6-8 |
| **Tiempo completar** | 30 segundos | 2-3 minutos |

## 🛠️ Cambiar entre DEMO y PRODUCTION

### Opción 1: Variable de Entorno (Recomendado)

**Para DEMO:**
```typescript
// src/environments/environment.ts
videoAgent: {
  mode: 'DEMO'
}
```

**Para PRODUCTION:**
```typescript
// src/environments/environment.prod.ts
videoAgent: {
  mode: 'PRODUCTION'
}
```

### Opción 2: Adapter Directamente

**apple-adapter.ts:**
```typescript
// DEMO
private readonly DEMO_MODE = true;

// PRODUCTION
private readonly DEMO_MODE = false;
```

### Opción 3: Runtime (Programático)

```typescript
// En cualquier componente
import { AgendamientoService } from './services/agendamiento.service';

constructor(private agendamientoService: AgendamientoService) {}

// Cambiar a DEMO
this.agendamientoService.setMode('DEMO');

// Cambiar a PRODUCTION
this.agendamientoService.setMode('PRODUCTION');
```

## 📝 Ejemplos de Uso

### Crear Cita DEMO

```typescript
const appointment = await agendamientoService.createDemoAppointment(
  'Daniel García',
  'iPhone 14 Pro',
  'Pantalla rota',
  { latitude: 4.6097, longitude: -74.0817 } // Opcional
);

console.log(appointment.confirmationNumber); // DEMO-12345678-123
console.log(appointment.appointmentDate); // 2025-10-27 (mañana)
console.log(appointment.appointmentTime); // 10:00 - 12:00
```

### Crear Cita PRODUCTION

```typescript
try {
  const appointment = await agendamientoService.createProductionAppointment({
    customerName: 'Daniel García',
    phone: '3001234567',
    email: 'daniel@example.com',
    appointmentDate: '2025-10-29',
    appointmentTime: '10:00 - 12:00',
    serviceType: 'screen_repair',
    deviceInfo: 'iPhone 14 Pro',
    issueSummary: 'Pantalla rota',
    address: 'Calle 100 #10-20',
    city: 'Bogotá',
    coordinates: { latitude: 4.6097, longitude: -74.0817 }
  });
  
  console.log(appointment.confirmationNumber); // APL-12345678-123
  console.log(appointment.status); // pending
} catch (error) {
  console.error('Validation error:', error.message);
}
```

### Obtener Slots Disponibles

```typescript
const slots = agendamientoService.getAvailableTimeSlots();

// Retorna:
[
  { date: '2025-10-27', time: '08:00 - 10:00', available: true },
  { date: '2025-10-27', time: '10:00 - 12:00', available: false }, // Ocupado
  { date: '2025-10-27', time: '14:00 - 16:00', available: true },
  // ... 20 slots total (excluye domingos)
]
```

### Cancelar Cita

```typescript
const cancelled = agendamientoService.cancelAppointment('DEMO-12345678-123');
console.log(cancelled); // true
```

## 🔐 Persistencia de Datos

### localStorage Structure

```typescript
// Key: 'katuq_appointments'
[
  {
    confirmationNumber: "DEMO-12345678-123",
    customerName: "Daniel García",
    phone: "Demo - Auto-detected",
    email: "demo@katuq.com",
    appointmentDate: "2025-10-27",
    appointmentTime: "10:00 - 12:00",
    serviceType: "diagnostic",
    deviceInfo: "iPhone 14 Pro",
    issueSummary: "Pantalla rota",
    address: "Auto-detected location",
    city: "Bogotá",
    coordinates: { latitude: 4.6097, longitude: -74.0817 },
    estimatedCost: "Por determinar",
    specialNotes: "🎯 DEMO MODE",
    createdAt: "2025-10-26T10:30:00.000Z",
    status: "confirmed"
  },
  // ... más citas
]
```

### Observables (Reactive)

```typescript
// Componente subscribe a cambios
agendamientoService.appointments$.subscribe(appointments => {
  console.log('Citas actualizadas:', appointments);
});
```

## 🚀 TODO: Implementaciones Futuras

### Backend Integration

- [ ] API REST para crear/actualizar/cancelar citas
- [ ] Sincronización con Firebase/base de datos
- [ ] Sistema de notificaciones en tiempo real

### Email Confirmations

- [ ] Template de email de confirmación
- [ ] Email de recordatorio (24h antes)
- [ ] Email de confirmación de cancelación

### Advanced Features

- [ ] Calendario visual para selección de fecha
- [ ] Integración con Google Calendar
- [ ] SMS confirmación (Twilio)
- [ ] Sistema de recordatorios automáticos
- [ ] Re-agendamiento fácil
- [ ] Lista de espera para horarios ocupados

### Mobile Optimizations

- [ ] Detección de ubicación más precisa (GPS)
- [ ] Compartir ubicación en tiempo real
- [ ] Notificaciones push
- [ ] Widget de próximas citas

## 📱 Testing

### Test DEMO Mode

```bash
# 1. Configurar environment.ts con mode: 'DEMO'
# 2. Iniciar app: npm start
# 3. Abrir Video Agent
# 4. Iniciar sesión
# 5. Decir: "Mi pantalla está rota"
# 6. Gemini detectará servicio necesario
# 7. Proporcionar nombre cuando se solicite
# 8. Verificar auto-agendamiento instantáneo
```

### Test PRODUCTION Mode

```bash
# 1. Configurar environment.ts con mode: 'PRODUCTION'
# 2. Iniciar app: npm start
# 3. Abrir Video Agent
# 4. Iniciar sesión
# 5. Decir: "Mi batería no carga"
# 6. Gemini detectará servicio necesario
# 7. Proporcionar nombre, teléfono, email
# 8. Seleccionar fecha y hora de slots disponibles
# 9. Verificar confirmación completa
```

### Limpiar Datos de Testing

```typescript
// En consola del navegador
agendamientoService.clearAllAppointments();
localStorage.removeItem('katuq_appointments');
```

## 🎓 Mejores Prácticas

### Para Demos
1. Usar `mode: 'DEMO'` en environment.ts
2. Mantener flujo conversacional corto (2 intercambios)
3. Mostrar número de confirmación claramente
4. Usar datos ficticios evidentes ("Demo -", "demo@katuq.com")

### Para Producción
1. Usar `mode: 'PRODUCTION'` en environment.prod.ts
2. Validar todos los inputs del usuario
3. Verificar disponibilidad real de horarios
4. Implementar confirmación por email
5. Manejar errores gracefully
6. Proveer opciones de cancelación/re-agendamiento

### Seguridad
1. Nunca exponer datos reales en modo DEMO
2. Validar y sanitizar inputs en PRODUCTION
3. Implementar rate limiting en backend
4. Encriptar datos sensibles (teléfono, email)
5. Cumplir con GDPR/regulaciones de datos

## 📞 Soporte

Para cambiar entre modos o reportar problemas:
- **Archivo de configuración**: `src/environments/environment.ts`
- **Variable clave**: `videoAgent.mode`
- **Documentación**: Este archivo (AGENDAMIENTO_SYSTEM.md)
