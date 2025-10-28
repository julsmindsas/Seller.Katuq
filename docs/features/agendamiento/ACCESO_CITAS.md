# 📅 Acceso a Citas Agendadas - Guía Rápida

## 🎯 Ubicaciones para Visualizar Citas

### 1. **Desde el Menú Principal** (Recomendado para Demo)

#### Ruta de Navegación:
```
Menú Lateral → Operaciones → Agendamiento → Ver citas agendadas
```

#### URL Directa:
```
/servicios/agendamiento/citas
```

#### Características:
- ✅ Accesible sin autenticación (hardcodeado para demo)
- ✅ Integrado en el flujo normal de la aplicación
- ✅ Estadísticas completas (Total, Confirmadas, Pendientes, etc.)
- ✅ Filtros por estado y búsqueda
- ✅ Acciones de cancelación

---

### 2. **Desde el Video Agent**

#### Ruta de Navegación:
```
/video-agent → Botón "Ver Agenda" (header)
```

#### URL Directa:
```
/video-agent/appointments
```

#### Características:
- ✅ Vista idéntica a la del módulo principal
- ✅ Contexto específico de video diagnóstico
- ✅ Todas las funcionalidades de gestión

---

## 💾 Persistencia de Datos

### LocalStorage Key:
```javascript
localStorage.getItem('katuq_appointments')
```

### Estructura de Datos:
```json
[
  {
    "confirmationNumber": "DEMO-12345678-123",
    "customerName": "Daniel García",
    "phone": "Demo - Auto-detected",
    "email": "demo@katuq.com",
    "appointmentDate": "2025-10-27",
    "appointmentTime": "10:00 - 12:00",
    "serviceType": "diagnostic",
    "deviceInfo": "iPhone 14 Pro",
    "issueSummary": "Pantalla rota",
    "address": "Auto-detected location",
    "city": "Bogotá",
    "coordinates": {
      "latitude": 4.6097,
      "longitude": -74.0817
    },
    "estimatedCost": "Por determinar",
    "specialNotes": "🎯 DEMO MODE - Auto-scheduled for tomorrow 10:00 AM",
    "createdAt": "2025-10-26T10:30:00.000Z",
    "status": "confirmed"
  }
]
```

---

## 🔄 Sincronización de Datos

### Servicio Principal:
```typescript
import { AgendamientoService } from 'src/app/shared/services/agendamiento.service';

// Inyectar servicio
constructor(private agendamientoService: AgendamientoService) {}

// Observar cambios en tiempo real
this.agendamientoService.appointments$.subscribe(appointments => {
  console.log('Citas actualizadas:', appointments);
});
```

### Cargar Citas:
```typescript
const appointments = this.agendamientoService.getAppointments();
```

### Agregar Cita Programáticamente:
```typescript
// Modo DEMO
const appointment = await this.agendamientoService.createDemoAppointment(
  'Daniel García',
  'iPhone 14 Pro',
  'Pantalla rota',
  { latitude: 4.6097, longitude: -74.0817 }
);

// Modo PRODUCTION
const appointment = await this.agendamientoService.createProductionAppointment({
  customerName: 'Daniel García',
  phone: '3001234567',
  email: 'daniel@example.com',
  appointmentDate: '2025-10-29',
  appointmentTime: '10:00 - 12:00',
  serviceType: 'screen_repair',
  deviceInfo: 'iPhone 14 Pro',
  issueSummary: 'Pantalla rota',
  address: 'Calle 100 #10-20',
  city: 'Bogotá'
});
```

---

## 🎨 Menú de Navegación

### Estructura del Menú:
```
📂 Operaciones
  ├── 📦 Pedidos
  │   ├── Todos los pedidos
  │   └── Pedidos POS
  ├── 📋 Producción
  │   └── Órdenes de producción
  ├── 📅 Agendamiento ← NUEVO
  │   ├── Solicitar servicio
  │   └── Ver citas agendadas ← AQUÍ
  └── 🚚 Logística
      └── Envíos y entregas
```

### Archivo Modificado:
```
/src/app/shared/services/nav.service.ts
```

### Código Agregado:
```typescript
{
  title: "Agendamiento",
  icon: "calendar",
  type: "sub",
  active: false,
  children: [
    { 
      path: "servicios/agendamiento", 
      title: "Solicitar servicio", 
      type: "link" 
    },
    { 
      path: "servicios/agendamiento/citas", 
      title: "Ver citas agendadas", 
      type: "link" 
    },
  ],
}
```

---

## 🧪 Testing y Demo

### 1. Crear Cita de Prueba desde Video Agent:

```bash
# 1. Navegar a /video-agent
# 2. Click "INICIAR DIAGNÓSTICO"
# 3. Decir: "Mi pantalla está rota"
# 4. Gemini preguntará tu nombre
# 5. Responder: "Daniel García"
# 6. Cita auto-agendada para mañana 10 AM
```

### 2. Ver la Cita Creada:

**Opción A - Desde Video Agent:**
```bash
# Click botón "Ver Agenda" en header
```

**Opción B - Desde Menú:**
```bash
# Menú → Operaciones → Agendamiento → Ver citas agendadas
```

### 3. Verificar en Console:

```javascript
// Abrir DevTools (F12)
// En Console:
console.table(JSON.parse(localStorage.getItem('katuq_appointments')));
```

---

## 🗑️ Limpiar Datos de Prueba

### Desde la UI:
```bash
# En /servicios/agendamiento/citas
# Click botón "Limpiar Todo" (requiere confirmación)
```

### Desde Console:
```javascript
// Limpiar todas las citas
localStorage.removeItem('katuq_appointments');

// Verificar
console.log(localStorage.getItem('katuq_appointments')); // null
```

### Programáticamente:
```typescript
this.agendamientoService.clearAllAppointments();
```

---

## 📊 Funcionalidades Disponibles

### Dashboard de Estadísticas:
- 📅 **Total Citas**: Contador de todas las citas
- ✅ **Confirmadas**: Citas con status 'confirmed'
- ⏰ **Pendientes**: Citas con status 'pending'
- ✔️ **Completadas**: Citas con status 'completed'
- ❌ **Canceladas**: Citas con status 'cancelled'

### Filtros:
- **Por Estado**: Dropdown con todos los estados
- **Búsqueda**: Por nombre, confirmación, dispositivo, teléfono

### Acciones por Cita:
- 👁️ **Ver Detalles**: (Próximamente)
- 🔄 **Re-agendar**: (Próximamente)
- ❌ **Cancelar**: Disponible para citas no completadas/canceladas

### Controles Globales:
- 🔄 **Cambiar Modo**: Toggle DEMO ↔ PRODUCTION
- 📥 **Exportar**: Exportar a Excel/CSV (Próximamente)
- 🗑️ **Limpiar Todo**: Elimina todas las citas con confirmación

---

## 🔧 Configuración de Modos

### Cambiar entre DEMO y PRODUCTION:

**Opción 1 - Environment (Build Time):**
```typescript
// src/environments/environment.ts
videoAgent: {
  mode: 'DEMO' // Para development
}

// src/environments/environment.prod.ts
videoAgent: {
  mode: 'PRODUCTION' // Para production
}
```

**Opción 2 - Runtime (Desde UI):**
```bash
# En /servicios/agendamiento/citas
# Click botón "Cambiar Modo"
```

**Opción 3 - Programático:**
```typescript
this.agendamientoService.setMode('DEMO');
// o
this.agendamientoService.setMode('PRODUCTION');
```

---

## 🚀 Flujo Completo de Demo

### Paso a Paso:

1. **Usuario inicia** → `/video-agent`
2. **Click** → "INICIAR DIAGNÓSTICO"
3. **Muestra dispositivo** → Gemini analiza
4. **Gemini detecta problema** → "Necesitas reparación"
5. **Gemini pregunta** → "¿Cuál es tu nombre?"
6. **Usuario responde** → "Daniel García"
7. **Auto-agendamiento** → Mañana 10:00 AM
8. **Confirmación** → `DEMO-12345678-123`
9. **Ver cita** → Menú → Operaciones → Agendamiento → Ver citas agendadas
10. **Dashboard muestra** → Estadísticas + Card de la cita

---

## 📱 Responsive Design

La interfaz de citas está optimizada para:
- 💻 **Desktop**: Grid de 2 columnas
- 📱 **Tablet**: Grid de 1 columna
- 📱 **Mobile**: Stack vertical con botones full-width

---

## 🔮 Próximas Funcionalidades

- [ ] **Backend API**: Persistencia en base de datos
- [ ] **Email Automático**: Confirmación por email
- [ ] **SMS**: Recordatorio 24h antes
- [ ] **Re-agendamiento**: Desde la UI
- [ ] **Edición de Citas**: Modificar detalles
- [ ] **Exportación**: Excel/CSV/PDF
- [ ] **Calendario Visual**: Vista de calendario
- [ ] **Google Calendar**: Integración
- [ ] **Notificaciones Push**: Recordatorios
- [ ] **Asignación Técnicos**: Workflow interno

---

## 📞 Soporte

### Documentación Completa:
```
/AGENDAMIENTO_SYSTEM.md
```

### Archivos Clave:
```
/src/app/shared/services/agendamiento.service.ts
/src/app/components/servicios/agendamiento/appointments-list/
/src/app/shared/services/nav.service.ts (línea 381-391)
```

### LocalStorage Key:
```
katuq_appointments
```
