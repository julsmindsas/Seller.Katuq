# Video Agent - Diagnóstico Visual con Gemini Live API

## 🎯 Descripción

Sistema de diagnóstico visual para electrodomésticos Haceb que utiliza Gemini 2.0 Live API con capacidades multimodales (video + audio + texto) para analizar problemas en tiempo real y determinar si el usuario puede resolverlos (DIY) o necesita servicio técnico.

## ✨ Características Principales

### 🎥 Video Agent Core
- **Streaming de Video**: Captura a 1 fps, resolución 768x768, formato JPEG
- **Audio Bidireccional**: 16kHz PCM input, 24kHz output
- **Gemini Live API**: Integración WebSocket con modelo `gemini-2.0-flash-exp`
- **Análisis en Tiempo Real**: Diagnóstico visual y auditivo simultáneo

### 🔧 Arquitectura Plug & Play
- **Adapter Pattern**: Sistema extensible para múltiples industrias
- **Adapters Disponibles**:
  - ✅ **Haceb** (Electrodomésticos) - Implementado
  - 🚧 **Automotive** - Preparado
  - 🚧 **Healthcare** - Preparado
  - 🚧 **General** - Preparado

### 🎨 UI/UX Mobile-First
- Diseño responsivo optimizado para smartphones
- Interfaz intuitiva con PrimeNG
- Vista previa de cámara en tiempo real
- Chat con historial de conversación
- Panel de resultados con instrucciones detalladas

### 📅 Agendamiento Lite
- Formulario simple para agendar servicios
- Integración con diagnóstico
- Pre-llenado de información del problema
- Selección de fecha y horario

## 📁 Estructura de Archivos

```
src/app/
├── modules/
│   └── video-agent/
│       ├── core/
│       │   ├── models/
│       │   │   ├── agent-config.interface.ts      # Configuración Gemini Live
│       │   │   └── agent-adapter.interface.ts     # Interfaces adapter pattern
│       │   └── services/
│       │       ├── gemini-live.service.ts         # Core WebSocket Gemini
│       │       ├── video-stream.service.ts        # Captura video 1fps
│       │       ├── audio-stream.service.ts        # Audio 16kHz PCM
│       │       └── adapter-registry.service.ts    # Gestión adapters
│       ├── adapters/
│       │   └── haceb-adapter.ts                   # Adapter Haceb con tools
│       ├── components/
│       │   ├── agent-session/                     # Componente principal
│       │   │   ├── agent-session.component.ts
│       │   │   ├── agent-session.component.html
│       │   │   └── agent-session.component.scss
│       │   └── agent-result/                      # Panel de resultados
│       │       ├── agent-result.component.ts
│       │       ├── agent-result.component.html
│       │       └── agent-result.component.scss
│       ├── video-agent.module.ts
│       └── video-agent-routing.module.ts
│
└── components/
    └── servicios/
        └── agendamiento/                          # Agendamiento lite
            ├── agendamiento.component.ts
            ├── agendamiento.component.html
            ├── agendamiento.component.scss
            └── agendamiento.module.ts
```

## 🚀 Rutas

- `/video-agent` - Sesión de diagnóstico visual
- `/servicios/agendamiento` - Formulario de agendamiento

## 🔧 Configuración Técnica

### Gemini Live API Specs
```typescript
// Video
fps: 1
resolution: 768x768
format: JPEG base64

// Audio Input
sampleRate: 16000 Hz
channels: 1 (mono)
format: 16-bit PCM

// Audio Output
sampleRate: 24000 Hz
format: Audio from server
```

### Model Configuration
```typescript
model: 'gemini-2.0-flash-exp'
responseModalities: ['AUDIO', 'TEXT']
voiceName: 'Aoede' // Voz femenina en español
temperature: 0.7
maxOutputTokens: 2048
```

## 🎯 Haceb Adapter - Tool Declarations

### 1. analyze_appliance
Analiza tipo de electrodoméstico y extrae modelo
- **Tipos**: nevera, lavadora, secadora, estufa, horno, microondas, lavavajillas, aire_acondicionado
- **Output**: tipo, marca, modelo, edad estimada, condición visual

### 2. diagnose_issue
Diagnostica el problema específico
- **Categorías**: no_enciende, ruido_anormal, fuga_agua, temperatura_incorrecta, etc.
- **Severidad**: baja, media, alta, crítica
- **Output**: categoría, severidad, síntomas, código de error, duración, riesgo

### 3. provide_solution
Proporciona solución recomendada
- **Tipos**: DIY, SERVICE, INFO, ESCALATE
- **DIY**: Incluye pasos detallados, tiempo estimado, herramientas necesarias
- **SERVICE**: Razón, urgencia, costo estimado
- **Output**: tipo de solución, confianza (0-100%), detalles completos

## 📱 Flujo de Usuario

1. **Inicio**: Usuario accede a `/video-agent`
2. **Selección**: Elige tipo de asistente (Electrodomésticos Haceb)
3. **Permisos**: Otorga acceso a cámara y micrófono
4. **Sesión**: Inicia diagnóstico en tiempo real
5. **Interacción**: Muestra electrodoméstico y describe problema
6. **Análisis**: Gemini analiza video y audio, hace preguntas
7. **Diagnóstico**: Sistema determina DIY vs SERVICE
8. **Resultado**:
   - **Si DIY**: Muestra pasos detallados para resolver
   - **Si SERVICE**: Botón para agendar servicio técnico
9. **Agendamiento** (opcional): Completa formulario en `/servicios/agendamiento`

## 🔐 Seguridad

- ✅ Advertencias sobre desconectar equipos antes de tocar
- ✅ NUNCA sugiere abrir paneles eléctricos internos
- ✅ Alerta sobre riesgos de choque eléctrico
- ✅ Recomienda técnico ante cualquier duda

## 🎨 Paleta de Colores

```scss
// Primary Gradient
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)

// Result Types
DIY: #48bb78 (verde)
SERVICE: #ed8936 (naranja)
ESCALATE: #f56565 (rojo)
INFO: #4299e1 (azul)
```

## 📦 Dependencias Clave

- `@google/genai: ^1.16.0` - SDK oficial Gemini
- `primeng: ^14.2.3` - Componentes UI
- Angular 14.3.0
- RxJS 7.8.2

## 🚀 Uso

### Iniciar Sesión de Diagnóstico
```typescript
// El componente maneja todo automáticamente
// 1. Registra adapter
// 2. Conecta a Gemini Live
// 3. Inicia captura de video/audio
// 4. Procesa respuestas en tiempo real
```

### Agregar Nuevo Adapter
```typescript
// 1. Crear clase que implemente IAgentAdapter
export class MiAdapter implements IAgentAdapter {
  readonly industry = AgentIndustry.AUTOMOTIVE;
  readonly name = 'Mi Adapter';

  getSystemInstruction(): string { ... }
  getToolDeclarations(): ToolDeclaration[] { ... }
  processResult(rawResult: any): AdapterResult { ... }
  getNextAction(result: AdapterResult): AgentAction { ... }
}

// 2. Registrar en agent-session.component.ts
const miAdapter = new MiAdapter();
this.adapterRegistry.registerAdapter(miAdapter, true, 100);
```

## 🎯 Próximos Pasos

- [ ] Testing en dispositivos móviles reales (Chrome/Safari)
- [ ] Integración con backend de agendamiento real
- [ ] Implementar adapters adicionales (automotive, healthcare)
- [ ] Agregar soporte multiidioma completo
- [ ] Métricas y analytics de uso
- [ ] Optimización de performance

## 📝 Notas Importantes

1. **API Key**: Configurada en `environment.ts` como `GEMINI_API_KEY`
2. **Sin Autenticación**: Las rutas están configuradas sin `AdminGuard` para demo público
3. **Mobile-First**: Optimizado para smartphones económicos y premium
4. **PWA Ready**: Compatible con instalación como app
5. **Offline**: Requiere conexión para funcionar (depende de Gemini API)

## 🐛 Debugging

```typescript
// Logs útiles en consola
🎤 AudioStreamService initialized
📹 VideoStreamService initialized
🔧 AdapterRegistryService initialized
✅ Session started successfully
📤 Setup message sent
💬 Server text: [respuesta]
🔊 Server audio received
🔧 Function call: [tool]
```

## 📞 Soporte

Para problemas o preguntas:
- GitHub Issues: [katuq-repo]
- Email: soporte@katuq.com

---

**Desarrollado para**: Haceb Startup Day 2025
**Tecnología**: Google Gemini 2.0 Live API
**Framework**: Angular 14 + PrimeNG
**Estado**: Demo funcional ✅
