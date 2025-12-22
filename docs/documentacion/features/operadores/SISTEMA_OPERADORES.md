# 👷 Sistema de Operadores - Gestión y Asignación Automática

## 📋 Descripción General

Sistema de gestión de técnicos/operadores para asignación automática a citas de servicio. Los operadores están distribuidos geográficamente en Medellín, Colombia, y se asignan automáticamente según criterios de proximidad, especialidad y calificación.

---

## 🗺️ Operadores Disponibles (10 Técnicos)

### **OP-001 - Carlos Ramírez** ⭐ 4.8
- 📍 **Ubicación:** El Poblado, Comuna 14
- 📌 **Dirección:** Calle 10 # 43A-30
- 🧰 **Especialidades:** iPhone, iPad, MacBook
- 📱 **Teléfono:** 3001234567
- ✉️ **Email:** carlos.ramirez@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 342 servicios, 1250 horas
- 📍 **GPS:** 6.2088, -75.5675

---

### **OP-002 - María González** ⭐ 4.9
- 📍 **Ubicación:** Laureles, Comuna 11
- 📌 **Dirección:** Carrera 73 # 40-50
- 🧰 **Especialidades:** iPhone, Apple Watch, Diagnóstico
- 📱 **Teléfono:** 3012345678
- ✉️ **Email:** maria.gonzalez@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 428 servicios, 1580 horas
- 📍 **GPS:** 6.2443, -75.5912

---

### **OP-003 - Andrés Cardona** ⭐ 4.7
- 📍 **Ubicación:** Envigado Centro
- 📌 **Dirección:** Calle 37 Sur # 43-10
- 🧰 **Especialidades:** MacBook, iMac, Hardware
- 📱 **Teléfono:** 3023456789
- ✉️ **Email:** andres.cardona@katuq.com
- 🎯 **Estado:** Ocupado
- 📊 **Experiencia:** 256 servicios, 980 horas
- 📍 **GPS:** 6.1701, -75.5830

---

### **OP-004 - Laura Mejía** ⭐ 5.0 (Top Rated!)
- 📍 **Ubicación:** Sabaneta
- 📌 **Dirección:** Carrera 45 # 75 Sur-25
- 🧰 **Especialidades:** iPhone, iPad, Baterías
- 📱 **Teléfono:** 3034567890
- ✉️ **Email:** laura.mejia@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 587 servicios, 2100 horas
- 📍 **GPS:** 6.1513, -75.6167

---

### **OP-005 - Diego Zapata** ⭐ 4.6
- 📍 **Ubicación:** Belén, Comuna 16
- 📌 **Dirección:** Calle 30A # 76-40
- 🧰 **Especialidades:** iPhone, Pantallas, Cámaras
- 📱 **Teléfono:** 3045678901
- ✉️ **Email:** diego.zapata@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 198 servicios, 750 horas
- 📍 **GPS:** 6.2325, -75.6050

---

### **OP-006 - Valentina Herrera** ⭐ 4.8
- 📍 **Ubicación:** Centro, Comuna 10
- 📌 **Dirección:** Carrera 50 # 51-20
- 🧰 **Especialidades:** iPad, MacBook, Software
- 📱 **Teléfono:** 3056789012
- ✉️ **Email:** valentina.herrera@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 367 servicios, 1320 horas
- 📍 **GPS:** 6.2476, -75.5658

---

### **OP-007 - Santiago Ríos** ⭐ 4.5
- 📍 **Ubicación:** Bello Centro
- 📌 **Dirección:** Calle 50 # 55-30
- 🧰 **Especialidades:** iPhone, Agua (Daño líquido), Emergencias
- 📱 **Teléfono:** 3067890123
- ✉️ **Email:** santiago.rios@katuq.com
- 🎯 **Estado:** Ocupado
- 📊 **Experiencia:** 234 servicios, 890 horas
- 📍 **GPS:** 6.3368, -75.5597

---

### **OP-008 - Camila Montoya** ⭐ 4.9
- 📍 **Ubicación:** Estadio, Comuna 4
- 📌 **Dirección:** Carrera 70 # 48-25
- 🧰 **Especialidades:** iPhone, AirPods, Accesorios
- 📱 **Teléfono:** 3078901234
- ✉️ **Email:** camila.montoya@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 401 servicios, 1450 horas
- 📍 **GPS:** 6.2571, -75.5859

---

### **OP-009 - Sebastián Castro** ⭐ 4.7
- 📍 **Ubicación:** Itagüí Centro
- 📌 **Dirección:** Carrera 51 # 51-50
- 🧰 **Especialidades:** MacBook, iMac, Mac mini
- 📱 **Teléfono:** 3089012345
- ✉️ **Email:** sebastian.castro@katuq.com
- 🎯 **Estado:** No Disponible
- 📊 **Experiencia:** 145 servicios, 650 horas
- 📍 **GPS:** 6.1845, -75.5990

---

### **OP-010 - Isabella Vargas** ⭐ 5.0 (Top Rated!)
- 📍 **Ubicación:** La Estrella
- 📌 **Dirección:** Calle 77 Sur # 48-15
- 🧰 **Especialidades:** iPhone, iPad, Pantallas, Baterías
- 📱 **Teléfono:** 3090123456
- ✉️ **Email:** isabella.vargas@katuq.com
- 🎯 **Estado:** Disponible
- 📊 **Experiencia:** 512 servicios, 1820 horas
- 📍 **GPS:** 6.1583, -75.6408

---

## 🤖 Algoritmo de Asignación Automática

### **Criterios de Selección (Por Prioridad):**

1. **Disponibilidad** ✅
   - Estado: `disponible`
   - Operador activo: `true`

2. **Especialidad** 🧰
   - Mapeo de tipo de servicio a especialidad:
     - `screen_repair` → Pantallas
     - `battery_replacement` → Baterías
     - `water_damage` → Agua
     - `diagnostic` → Diagnóstico

3. **Proximidad Geográfica** 📍
   - Cálculo de distancia con fórmula Haversine
   - Radio máximo: 15 km
   - Top 3 operadores más cercanos

4. **Calificación** ⭐
   - Entre operadores cercanos, se elige el de mayor calificación
   - Rango: 0.0 - 5.0

### **Flujo de Asignación:**

```typescript
asignarMejorOperador(serviceType, latitude, longitude) {
  // 1. Filtrar solo disponibles
  operadores = getOperadoresDisponibles()
  
  // 2. Filtrar por especialidad (si aplica)
  if (especialidad_match) {
    operadores = operadores.filter(especialidad)
  }
  
  // 3. Si hay ubicación, priorizar cercanos
  if (latitude && longitude) {
    cercanos = getOperadoresCercanos(lat, lon, maxDistance: 15km, limit: 3)
    cercanos.sort(by: calificacion DESC)
    return cercanos[0]
  }
  
  // 4. Fallback: mejor calificación general
  operadores.sort(by: calificacion DESC)
  return operadores[0]
}
```

---

## 💾 Persistencia de Datos

### **LocalStorage Key:**
```javascript
localStorage.getItem('katuq_operadores')
```

### **Estructura de Datos:**

```json
[
  {
    "id": "OP-001",
    "nombre": "Carlos",
    "apellido": "Ramírez",
    "nombreCompleto": "Carlos Ramírez",
    "telefono": "3001234567",
    "email": "carlos.ramirez@katuq.com",
    "especialidades": ["iPhone", "iPad", "MacBook"],
    "calificacion": 4.8,
    "ubicacion": {
      "barrio": "El Poblado",
      "comuna": "Comuna 14",
      "direccion": "Calle 10 # 43A-30",
      "coordinates": {
        "latitude": 6.2088,
        "longitude": -75.5675
      }
    },
    "disponibilidad": "disponible",
    "horasTrabajadas": 1250,
    "serviciosCompletados": 342,
    "foto": null,
    "activo": true
  }
]
```

---

## 🔧 Uso del Servicio

### **1. Inyectar Servicio:**

```typescript
import { OperadoresService } from 'src/app/shared/services/operadores.service';

constructor(private operadoresService: OperadoresService) {}
```

### **2. Obtener Operadores Disponibles:**

```typescript
const disponibles = this.operadoresService.getOperadoresDisponibles();
console.log(`${disponibles.length} operadores disponibles`);
```

### **3. Asignar Mejor Operador:**

```typescript
const operador = this.operadoresService.asignarMejorOperador(
  'screen_repair',
  6.2088,  // latitude
  -75.5675 // longitude
);

if (operador) {
  console.log(`Asignado: ${operador.nombreCompleto}`);
  console.log(`Calificación: ${operador.calificacion}⭐`);
}
```

### **4. Obtener Operadores Cercanos:**

```typescript
const cercanos = this.operadoresService.getOperadoresCercanos(
  6.2088,   // latitude
  -75.5675, // longitude
  10,       // maxDistance en km
  5         // limit de resultados
);

cercanos.forEach(op => {
  console.log(`${op.nombreCompleto} - ${op.distancia.toFixed(2)} km`);
});
```

### **5. Cambiar Estado de Operador:**

```typescript
// Marcar como ocupado
this.operadoresService.ocuparOperador('OP-001');

// Liberar operador
this.operadoresService.liberarOperador('OP-001');

// Cambiar disponibilidad manualmente
this.operadoresService.cambiarDisponibilidad('OP-001', 'no_disponible');
```

### **6. Registrar Servicio Completado:**

```typescript
this.operadoresService.registrarServicioCompletado(
  'OP-001',
  2 // horas trabajadas
);
// Incrementa: serviciosCompletados y horasTrabajadas
```

---

## 📊 Integración con Citas

### **En AppointmentData:**

```typescript
interface AppointmentData {
  // ... otros campos
  operadorAsignado?: {
    id: string;
    nombre: string;
    telefono: string;
    email: string;
    distancia?: number; // km desde el cliente
  };
}
```

### **Asignación Automática en createDemoAppointment:**

```typescript
// Asignar operador automáticamente
const operador = this.operadoresService.asignarMejorOperador(
  "diagnostic",
  coordinates?.latitude,
  coordinates?.longitude
);

const appointment: AppointmentData = {
  // ... otros campos
  operadorAsignado: operador ? {
    id: operador.id,
    nombre: operador.nombreCompleto,
    telefono: operador.telefono,
    email: operador.email,
    distancia: coordinates ? this.calcularDistancia(...) : undefined
  } : undefined,
};

// Marcar operador como ocupado
if (operador) {
  this.operadoresService.ocuparOperador(operador.id);
}
```

---

## 🎨 Visualización en UI

### **Card de Cita con Operador:**

```html
<!-- Operador Asignado -->
<div class="info-item full-width operador-asignado" *ngIf="appointment.operadorAsignado">
  <i class="pi pi-user"></i>
  <div class="info-content">
    <label>Técnico Asignado</label>
    <div class="operador-details">
      <span class="operador-nombre">👷 {{ appointment.operadorAsignado.nombre }}</span>
      <span class="operador-contacto">
        📱 {{ appointment.operadorAsignado.telefono }} • 
        ✉️ {{ appointment.operadorAsignado.email }}
      </span>
      <span class="operador-distancia" *ngIf="appointment.operadorAsignado.distancia">
        📍 A {{ appointment.operadorAsignado.distancia }} km de distancia
      </span>
    </div>
  </div>
</div>
```

### **Estilos Destacados:**

```scss
.operador-asignado {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #0ea5e9;
}
```

---

## 🧪 Testing y Demo

### **1. Ver Operadores en Console:**

```javascript
// Abrir DevTools (F12)
const operadores = JSON.parse(localStorage.getItem('katuq_operadores'));
console.table(operadores);
```

### **2. Resetear Operadores:**

```typescript
this.operadoresService.resetOperadores();
// Recrea los 10 operadores por defecto
```

### **3. Simular Asignación:**

```typescript
const operador = this.operadoresService.asignarMejorOperador(
  'screen_repair',
  6.2088,  // El Poblado
  -75.5675
);

console.log('Operador asignado:', operador?.nombreCompleto);
console.log('Ubicación:', operador?.ubicacion.barrio);
console.log('Especialidades:', operador?.especialidades);
```

---

## 🗺️ Mapa de Cobertura

### **Zona Norte:**
- 🔵 Bello Centro (Santiago Ríos)

### **Zona Centro:**
- 🔵 Centro Comuna 10 (Valentina Herrera)
- 🔵 Estadio Comuna 4 (Camila Montoya)

### **Zona Oeste:**
- 🔵 Laureles (María González)
- 🔵 Belén (Diego Zapata)

### **Zona Este:**
- 🔵 El Poblado (Carlos Ramírez)

### **Zona Sur:**
- 🔵 Envigado (Andrés Cardona)
- 🔵 Sabaneta (Laura Mejía)
- 🔵 Itagüí (Sebastián Castro)
- 🔵 La Estrella (Isabella Vargas)

---

## 📈 Métricas y Estadísticas

### **Por Disponibilidad:**
- ✅ Disponible: 6 operadores
- 🔴 Ocupado: 2 operadores
- ⛔ No Disponible: 2 operadores

### **Por Calificación:**
- ⭐⭐⭐⭐⭐ 5.0: 2 operadores (Laura Mejía, Isabella Vargas)
- ⭐⭐⭐⭐ 4.9: 2 operadores (María González, Camila Montoya)
- ⭐⭐⭐⭐ 4.8: 2 operadores (Carlos Ramírez, Valentina Herrera)
- ⭐⭐⭐⭐ 4.7: 2 operadores (Andrés Cardona, Sebastián Castro)
- ⭐⭐⭐⭐ 4.6: 1 operador (Diego Zapata)
- ⭐⭐⭐⭐ 4.5: 1 operador (Santiago Ríos)

### **Experiencia Total:**
- 📊 Servicios completados: 3,470
- ⏱️ Horas trabajadas: 12,840

---

## 🚀 Próximas Funcionalidades

- [ ] **Tracking en Tiempo Real:** Ubicación del operador en ruta
- [ ] **Chat Directo:** Comunicación cliente-operador
- [ ] **Historial de Servicios:** Ver servicios previos del operador
- [ ] **Calificación Post-Servicio:** Cliente califica al operador
- [ ] **Optimización de Rutas:** Asignar múltiples citas cercanas
- [ ] **Dashboard de Operadores:** Panel de control para técnicos
- [ ] **Notificaciones Push:** Alertas de nuevas asignaciones
- [ ] **Disponibilidad por Horario:** Turnos y horarios personalizados

---

## 📞 Soporte

### **Archivos Clave:**
```
/src/app/shared/services/operadores.service.ts
/src/app/shared/services/agendamiento.service.ts
/src/app/components/servicios/agendamiento/appointments-list/
```

### **LocalStorage Keys:**
```
katuq_operadores      → Lista de operadores
katuq_appointments    → Citas con operadores asignados
```
