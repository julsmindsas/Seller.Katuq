# Video Agent - Diagnóstico Visual con Gemini 2.0 Live API

## 🎯 Descripción

Sistema de diagnóstico visual multimodal que utiliza **Gemini 2.0 Live API** con capacidades de video, audio y texto en tiempo real. Diseñado para analizar problemas técnicos mediante streaming visual y conversación natural, determinando automáticamente si el usuario puede resolver el problema (DIY) o necesita servicio profesional.

## ✨ Características Principales

### 🎥 Multimodal Real-Time Analysis
- **Video Streaming**: Captura a 1 fps, 768x768px, formato JPEG base64
- **Audio Bidireccional**: Input 16kHz PCM mono, Output 24kHz con voz natural
- **WebSocket Live**: Conexión persistente con Gemini 2.0 Flash Native Audio Preview
- **Análisis Inteligente**: Diagnóstico visual, auditivo y contextual simultáneo

### 🔧 Arquitectura Modular (Adapter Pattern)
Sistema extensible plug-and-play para múltiples industrias:

- ✅ **Haceb Adapter** (Electrodomésticos) - Implementado
- ✅ **Apple Adapter** (Dispositivos Apple) - Implementado  
- 🚧 **Automotive** - Preparado
- 🚧 **Healthcare** - Preparado
- 🚧 **General Purpose** - Preparado

Cada adapter define:
- System instructions específicas
- Tool declarations (function calling)
- Lógica de procesamiento de resultados
- Acciones automáticas (DIY, SERVICE, INFO, ESCALATE)

### 🎨 UI/UX Mobile-First Premium

#### Diseño Glassmorphism Moderno
- Header translúcido con `backdrop-filter: blur(20px)`
- Sombras sutiles y bordes difuminados
- Paleta de colores Katuq (#459BD1, #4555D1)
- Transiciones suaves con `cubic-bezier`

#### FAB Draggable (Floating Action Button)
- **Botón FINALIZAR flotante** con gradiente rojo vibrante
- **Completamente reposicionable** mediante drag & drop
- **Persistencia** de posición en localStorage
- **Efectos visuales premium**:
  - Gradiente dinámico con inner glow
  - Sombra elevada con resplandor rojo
  - Animación de pulso continua (scale + shadow)
  - Rotación sutil al arrastrar (5deg)
  - Ripple effect expandible mientras se mueve
  - Haptic feedback en dispositivos compatibles

#### Chat Expandido
- **Altura completa** cuando sesión está activa (viewport - header)
- Footer oculto durante la sesión (solo FAB visible)
- Scroll suave con scrollbar personalizado (4px)
- Burbujas de mensaje con diseño moderno
- Timestamps y estados visuales

#### Componentes Clave
- Video preview con streaming badge
- Botón cambiar cámara (frontal/trasera)
- Chat conversacional con historial
- Panel lateral de resultados (Sidebar)
- Audio meters con pulsos visuales

### 🔊 Audio Streaming Mejorado
- **AudioStreamerService**: Playback sin glitches
- Buffer de audio inteligente
- Manejo de colas para reproducción continua
- Conversión PCM16 → AudioBuffer

### 📅 Agendamiento Inteligente con Geolocalización
- **Navegación automática** desde diagnóstico (cuando SERVICE es necesario)
- **Pre-llenado** con información del problema detectado
- **Geolocalización automática** (HTML5 Geolocation API)
- **Reverse Geocoding** con Nominatim (OpenStreetMap)
- **Auto-completado de dirección** y ciudad
- **Validación en tiempo real** de formularios
- **Slots de tiempo disponibles** con calendario PrimeNG
- **Persistencia de datos** vía sessionStorage

#### Características de Geolocalización:
- Solicitud de permiso de ubicación
- Detección automática al cargar formulario
- Botón manual "Detectar Ubicación"
- Conversión de coordenadas a dirección legible
- Formato de dirección colombiana
- Edición manual de dirección detectada
- Mensajes de estado (cargando, éxito, error)
- Cálculo de distancia entre puntos (Haversine)

## 📁 Estructura de Archivos

```
src/app/modules/video-agent/
├── core/
│   ├── models/
│   │   ├── agent-config.interface.ts          # Config Gemini Live
│   │   ├── agent-adapter.interface.ts         # Interfaces adapter
│   │   └── company-config.interface.ts        # Config por empresa
│   └── services/
│       ├── gemini-live.service.ts             # WebSocket Gemini 2.0
│       ├── audio-streamer.service.ts          # Playback sin glitches
│       ├── video-stream.service.ts            # Captura 1fps JPEG
│       ├── audio-stream.service.ts            # Micrófono 16kHz
│       └── adapter-registry.service.ts        # Registry pattern
├── adapters/
│   ├── haceb-adapter.ts                       # Electrodomésticos
│   └── apple-adapter.ts                       # Dispositivos Apple
├── components/
│   ├── agent-session/
│   │   ├── agent-session.component.ts         # Lógica principal
│   │   ├── agent-session.component.html       # Template
│   │   ├── agent-session.component.scss       # Estilos base
│   │   ├── agent-session-mobile.component.scss # Mobile-first
│   │   └── agent-session-simple.component.scss # Simplified
│   └── agent-result/
│       ├── agent-result.component.ts          # Panel resultados
│       ├── agent-result.component.html
│       └── agent-result.component.scss
├── video-agent.module.ts
└── video-agent-routing.module.ts

src/app/components/servicios/agendamiento/
├── agendamiento.component.ts                  # Agendamiento lite
├── agendamiento.component.html
├── agendamiento.component.scss
└── agendamiento.module.ts
```

## 🚀 Rutas y Configuración

### Acceso por Empresa
```bash
# Apple Devices
http://localhost:4200/video-agent?company=apple

# Haceb Appliances (Comentado actualmente)
# http://localhost:4200/video-agent?company=haceb

# Default (Apple por defecto)
http://localhost:4200/video-agent
```

### Agendamiento
```
/servicios/agendamiento
```

## 🔧 Especificaciones Técnicas

### Gemini 2.0 Live API Configuration
```typescript
model: 'models/gemini-2.5-flash-native-audio-preview-09-2025'
responseModalities: [Modality.AUDIO]
mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM
voiceName: 'Aoede' // Voz femenina en español

// Video
fps: 1
resolution: 768x768
format: JPEG base64
mimeType: 'image/jpeg'

// Audio Input
sampleRate: 16000 Hz
channels: 1 (mono)
format: 16-bit PCM
mimeType: 'audio/pcm;rate=16000'

// Audio Output
sampleRate: 24000 Hz
format: PCM16 from Gemini
```

### Function Calling Pattern
```typescript
// 1. Adapter define tools
getToolDeclarations(): ToolDeclaration[]

// 2. Gemini llama función
toolCall.functionCalls[0]

// 3. Adapter procesa
processResult(functionCall) → AdapterResult

// 4. Adapter determina acción
getNextAction(result) → AgentAction

// 5. Respuesta a Gemini (STRING)
sendFunctionResponse(id, "Analysis completed: ...")
```

## 🎯 Apple Adapter - Tool Declarations

### 1. analyze_device
Identifica tipo de dispositivo Apple y extrae modelo
```typescript
Parameters:
  - device_type: 'iphone' | 'ipad' | 'mac' | 'apple_watch' | 'airpods' | 'apple_tv' | 'other'
  - model: string
  - visual_condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged'

Output:
  - Device identification
  - Model and serial if visible
  - Physical condition assessment
```

### 2. diagnose_issue
Diagnostica el problema específico del dispositivo
```typescript
Categories:
  - wont_turn_on
  - screen_issues (cracked, black, flickering, lines)
  - battery_problems (draining, swollen, not_charging)
  - overheating
  - water_damage
  - software_issues
  - charging_issues
  - speaker_microphone
  - camera_issues
  - physical_damage
  - other

Severity: 'low' | 'medium' | 'high' | 'critical'

Output:
  - Problem category
  - Severity level
  - Symptoms detected
  - Safety concerns (battery swelling = critical)
```

### 3. provide_solution
Proporciona solución recomendada
```typescript
Solution Types:
  - DIY: Software fixes, restarts, settings
  - SERVICE: Hardware repair needed (Genius Bar)
  - INFO: Educational content
  - ESCALATE: Critical safety issue

Confidence: 0-100%

DIY includes:
  - Step-by-step instructions
  - Estimated time
  - Tools needed
  - Screenshots/guides

SERVICE includes:
  - Reason for professional help
  - Urgency level
  - Estimated repair cost
  - Warranty status consideration
```

### 4. collect_customer_info (NEW)
Recopila información del cliente para agendamiento
```typescript
Parameters:
  - full_name: string (required)
  - phone: string (10 digits, required)
  - email: string (required)
  - has_location_permission: boolean

Purpose:
  - Gemini pregunta de forma conversacional
  - Valida formato de teléfono y email
  - Pregunta sobre permiso de ubicación
  - Prepara para el siguiente paso
```

### 5. get_available_time_slots (NEW)
Obtiene slots de tiempo disponibles
```typescript
Parameters:
  - preferred_date: string (ISO format YYYY-MM-DD)
  - service_type: 'screen_repair' | 'battery_replacement' | 'water_damage' | 'diagnostic' | 'other' (required)
  - urgency: 'low' | 'medium' | 'high' | 'urgent'

Response:
  - Lista de horarios disponibles
  - Próximos 14 días (excluyendo domingos)
  - Slots: 08:00-10:00, 10:00-12:00, 14:00-16:00, 16:00-18:00
```

### 6. confirm_appointment (NEW)
Confirma y crea la cita con toda la información
```typescript
Parameters (all required):
  - customer_name: string
  - phone: string
  - email: string
  - appointment_date: string (YYYY-MM-DD)
  - appointment_time: string (e.g., "10:00 - 12:00")
  - service_type: string
  - device_info: string (tipo y modelo del dispositivo)
  - issue_summary: string (resumen breve del problema)
  - address: string (opcional, de geolocalización)
  - estimated_cost: string (opcional)
  - special_notes: string (opcional)

Actions:
  - Crea solicitud en sistema
  - Navega a formulario de agendamiento (si web)
  - Envía confirmación por email
  - Proporciona número de confirmación
```

## 📱 Flujo de Usuario Completo

### Fase 1: Inicio de Sesión
1. Usuario accede a `/video-agent?company=apple`
2. Carga **CompanyConfig** (branding, UI, adapter)
3. Muestra **instrucciones paso a paso**
4. Usuario otorga **permisos de cámara y micrófono**
5. Click en **botón INICIAR DIAGNÓSTICO** (footer, verde, 64px)

### Fase 2: Sesión Activa
6. **Footer desaparece**, aparece **FAB FINALIZAR** (rojo, flotante)
7. Usuario puede **arrastrar el FAB** a cualquier posición
8. **Chat se expande** a altura completa (viewport - header)
9. **Video streaming** comienza (1 fps a Gemini)
10. **Audio bidireccional** activo (usuario habla, Gemini responde)
11. Usuario **muestra dispositivo** y **describe problema**
12. Gemini **analiza video/audio** en tiempo real
13. **Conversación natural**: Gemini hace preguntas aclaratorias
14. Sistema **llama funciones** (analyze_device, diagnose_issue)

### Fase 3: Diagnóstico y Resultado
15. Gemini determina **solución** (DIY vs SERVICE)
16. **Panel lateral** muestra resultado detallado
17. Si **DIY**: Pasos numerados para resolver
18. Si **SERVICE**: Botón "AGENDAR SERVICIO TÉCNICO"

### Fase 4: Agendamiento Conversacional (Opcional)

**Opción A: Agendamiento dentro de la conversación con Gemini**

19. Gemini pregunta: **"¿Te gustaría agendar una cita para la reparación?"**
20. Usuario acepta → Gemini usa `collect_customer_info`
21. Gemini pregunta **conversacionalmente**:
    - "¿Cuál es tu nombre completo?"
    - "¿A qué número de teléfono te puedo contactar?"
    - "¿Cuál es tu correo electrónico?"
22. Gemini pregunta: **"¿Puedo detectar tu ubicación automáticamente?"**
23. Si acepta → Sistema solicita permiso de geolocalización
24. Gemini usa `get_available_time_slots` y pregunta:
    - "¿Prefieres mañana o esta semana?"
    - "¿Qué horario te viene mejor: mañana o tarde?"
25. Usuario elige fecha/hora
26. Gemini usa `confirm_appointment` con toda la información
27. **Confirmación verbal**: "Perfecto, tu cita está confirmada para [fecha] a las [hora]. Recibirás un email de confirmación."

**Opción B: Agendamiento vía formulario web**

19. Click en **AGENDAR SERVICIO TÉCNICO** (botón en panel de resultados)
20. Navegación a `/servicios/agendamiento`
21. **Geolocalización automática**:
    - Al cargar, solicita permiso de ubicación
    - Auto-llena dirección y ciudad
    - Usuario puede editar manualmente
22. Formulario **pre-llenado** con:
    - Tipo de servicio (del diagnóstico)
    - Descripción del problema detectado
    - Urgencia
    - Costo estimado
23. Usuario completa:
    - Datos personales (nombre, teléfono, email)
    - Confirma/edita dirección (pre-llenada por geo)
    - Selecciona fecha (calendario con 14 días disponibles)
    - Selecciona horario (4 slots diarios)
    - Agrega observaciones opcionales
24. **Submit** → Confirmación visual + email
25. Redirección automática a `/video-agent` después de 3 segundos

## 🎨 Mejoras Visuales del FAB

### Gradiente Dinámico
```scss
// Estado normal
background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);

// Hover
background: linear-gradient(135deg, #e84855 0%, #d32f3f 100%);

// Dragging
background: linear-gradient(135deg, #ff4757 0%, #e84855 100%);
```

### Inner Glow Effect
```scss
&::after {
  content: '';
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%, 
    rgba(255, 255, 255, 0.3), 
    transparent 60%
  );
}
```

### Sombras Elevadas
```scss
// Idle
box-shadow:
  0 4px 12px rgba(220, 53, 69, 0.5),
  0 8px 24px rgba(220, 53, 69, 0.3),
  0 0 0 0 rgba(220, 53, 69, 0.4);

// Dragging
box-shadow:
  0 12px 28px rgba(220, 53, 69, 0.7),
  0 24px 48px rgba(220, 53, 69, 0.5),
  0 0 0 12px rgba(220, 53, 69, 0.15);
```

### Animaciones
- **Pulso continuo**: scale(1 → 1.05) + sombra expansiva
- **Rotación al arrastrar**: `rotate(5deg)`
- **Ripple effect**: Borde punteado que se expande
- **Bounce suave**: `cubic-bezier(0.34, 1.56, 0.64, 1)`

## 🔐 Seguridad y Mejores Prácticas

### Apple Adapter
- ✅ NUNCA sugiere abrir dispositivos sellados (warranty void)
- ✅ Alerta CRÍTICA sobre baterías infladas (riesgo de fuego)
- ✅ Advierte sobre riesgos eléctricos
- ✅ Solo recomienda reparaciones oficiales (Genius Bar)
- ✅ Detecta daños físicos y recomienda servicio inmediato

### General
- ✅ Validación de permisos antes de captura
- ✅ Manejo de errores con mensajes claros
- ✅ Desconexión limpia de servicios
- ✅ localStorage para preferencias de usuario (posición FAB)

## 🐛 Debugging y Logs

### Console Logs Útiles
```javascript
// Inicialización
🎤 GeminiLiveService initialized with SDK + AudioStreamer
✅ Audio context initialized
📹 VideoStreamService initialized

// Sesión
✅ WebSocket connected to Gemini Live (SDK)
📤 Sending video frame
📤 Sending audio chunk

// Respuestas
💬 Server text: [transcripción]
🔊 Server audio received
✅ Audio queue completed

// Function Calling
🔧 Function call: {functionCalls: [{name: 'analyze_device', ...}]}
📊 Adapter result: {type: 'INFO', confidence: 50, ...}
🎯 Next action: {action: 'SHOW_INFO', ...}
✅ Function response sent

// Errores solucionados
✅ Ya NO aparece: "Could not parse function response"
```

## 📦 Dependencias Principales

```json
{
  "@google/genai": "^1.16.0",
  "@angular/core": "^14.3.0",
  "primeng": "^14.2.3",
  "primeicons": "^6.0.1",
  "rxjs": "^7.8.2"
}
```

## 🚀 Próximos Pasos

### Corto Plazo
- [ ] Testing exhaustivo en iOS Safari (permisos de cámara)
- [ ] Testing en Android Chrome (WebRTC constraints)
- [ ] Optimización de compresión de video (reducir ancho de banda)
- [ ] Agregar reconexión automática si WebSocket se cae

### Mediano Plazo
- [ ] Backend real para agendamiento (API REST)
- [ ] Sistema de notificaciones (email/SMS al agendar)
- [ ] Analytics de uso (tiempo de sesión, problemas más comunes)
- [ ] Multi-idioma completo (i18n con ngx-translate)

### Largo Plazo
- [ ] Implementar Automotive Adapter (diagnóstico de vehículos)
- [ ] Healthcare Adapter (triage médico básico)
- [ ] Integración con CRM para seguimiento de casos
- [ ] Dashboard de métricas y reportes
- [ ] Modo offline con caché de instrucciones comunes

## 📝 Notas de Desarrollo

### Cambios Recientes (Latest Session)
1. **FAB Draggable mejorado**:
   - Convertido botón FINALIZAR en FAB flotante
   - Gradientes vibrantes con inner glow
   - Animaciones de pulso y ripple
   - Persistencia de posición en localStorage
   
2. **Chat expandido**:
   - Footer oculto durante sesión activa
   - Chat ocupa altura completa: `calc(100vh - 58px)`
   - Scroll corregido con `height: 0` en flex child
   
3. **Gemini Function Response fix**:
   - Cambio de respuesta de objeto a string simple
   - Formato: `"Analysis completed: ... Confidence: X%. Type: Y."`
   - Elimina error "Could not parse function response"

4. **Glassmorphism en header**:
   - `backdrop-filter: blur(20px) saturate(180%)`
   - Sombras ultra-sutiles
   - Logo Katuq en header

### API Key Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  GEMINI_API_KEY: 'YOUR_API_KEY_HERE'
};
```

### Rutas sin Autenticación
Las rutas están configuradas **sin `AdminGuard`** para acceso público demo.

## 🎯 Métricas de Éxito

- **Tiempo promedio de diagnóstico**: < 3 minutos
- **Precisión DIY vs SERVICE**: > 85%
- **Satisfacción de usuario**: Medible con encuesta post-diagnóstico
- **Tasa de agendamiento**: % de SERVICE que completan formulario

## 📞 Contacto y Soporte

- **Desarrollador**: Daniel García
- **Empresa**: Katuq
- **Proyecto**: Video Agent - Gemini 2.0 Live API Integration
- **Fecha**: Enero 2025
- **Versión**: 1.0.0

## 🏆 Créditos

- **Google Gemini Team**: Por Gemini 2.0 Live API
- **PrimeNG Team**: Por componentes UI premium
- **Angular Team**: Por framework robusto

---

**Estado**: ✅ Producción (Demo funcional)  
**Tecnología**: Google Gemini 2.0 Flash Native Audio Preview  
**Framework**: Angular 14 + PrimeNG 14  
**Última actualización**: Enero 2025
