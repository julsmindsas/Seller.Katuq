# Resumen Ejecutivo: Migración Video-Agent → Gemini-Asistant

## Vista Rápida

### Lo Urgente (Semana 1)
1. **AudioWorklets**: Reemplazar ScriptProcessorNode deprecated
2. **Queue Management**: Agregar AudioStreamerService para playback sin glitches
3. **Recording Worklet**: Usar vol-meter.worklet.ts para VU meter

### Lo Importante (Semana 2)
1. **Adapter Pattern**: Refactorizar tool system con registry
2. **AudioPulse Component**: Agregar indicador visual de volumen
3. **GeminiLiveService**: Migrar a @google/genai SDK

### Lo Futuro (Backlog)
1. **VideoStreamService**: Agregar captura de video (opcional)
2. **Visual Effects**: Mantener separadas las características 3D

---

## Archivos Clave a Copiar

### Servicios de Audio (CRÍTICO)

**Fuente**: `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/`

```
✓ audio-stream.service.ts              (AudioWorklets para recording)
✓ audio-streamer.service.ts            (Queue management para playback)
✓ gemini-live.service.ts               (@google/genai SDK integration)
✓ video-stream.service.ts              (Captura de video - opcional)
```

**Destino**: `/src/app/shared/services/audio/`

### Worklets (CRÍTICO)

**Fuente**: `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/worklets/`

```
✓ audio-recording.worklet.ts           (Float32 → Int16 conversion)
✓ vol-meter.worklet.ts                 (RMS calculation for VU meter)
```

**Destino**: `/src/app/shared/worklets/`

### Modelos e Interfaces (CRÍTICO)

**Fuente**: `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/models/`

```
✓ agent-adapter.interface.ts           (IAgentAdapter pattern)
✓ agent-config.interface.ts            (Configuration models)
✓ company-config.interface.ts          (Company branding)
```

**Destino**: `/src/app/shared/models/agent/`

### Componentes UI

**Fuente**: `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/components/audio-pulse/`

```
✓ audio-pulse.component.ts
✓ audio-pulse.component.html
✓ audio-pulse.component.scss
```

**Destino**: `/src/app/shared/components/audio-pulse/`

### Services del Registro

**Fuente**: `/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/`

```
✓ adapter-registry.service.ts          (Plugin architecture)
```

**Destino**: `/src/app/shared/services/registry/`

---

## Problemas Resueltos

### Problema 1: Audio Glitches (Playback)
**Causa**: Gemini-asistant programa buffers directamente sin look-ahead  
**Solución**: AudioStreamerService con 200ms SCHEDULE_AHEAD_TIME  
**Beneficio**: Playback smooth incluso en conexiones lentas

### Problema 2: CPU Bloqueado (Recording)
**Causa**: ScriptProcessorNode en main thread  
**Solución**: AudioWorklets en worker thread  
**Beneficio**: ~10x mejor performance en móvil

### Problema 3: Sin Visual Feedback
**Causa**: No hay VU meter en gemini-asistant  
**Solución**: vol-meter.worklet + audio-pulse.component  
**Beneficio**: Usuario ve nivel de micrófono en tiempo real

### Problema 4: Herramientas Rígidas
**Causa**: Herramientas hardcoded en servicios  
**Solución**: Adapter pattern con AdapterRegistryService  
**Beneficio**: Agregar nueva industria sin tocar core

### Problema 5: WebSocket Manual
**Causa**: Implementación manual de Gemini Live API  
**Solución**: @google/genai SDK oficial  
**Beneficio**: Soporte oficial, type-safe, mejor mantenimiento

---

## Comparación Rápida

| Feature | video-agent | gemini-asistant | Status |
|---------|------------|-----------------|--------|
| **AudioWorklets** | ✓ | ✗ | Migrar URGENTE |
| **Queue Management** | ✓ | ✗ | Migrar URGENTE |
| **VU Meter** | ✓ | ✗ | Agregar |
| **Adapter Pattern** | ✓ | ✗ | Implementar |
| **@google/genai SDK** | ✓ | ✗ | Actualizar |
| **Video Streaming** | ✓ | ✗ | Opcional |
| **Katuq Tools** | ✗ | ✓ | Mantener/Mover |
| **3D Visualización** | ✗ | ✓ | Mantener |

---

## Estructura de Carpetas Nueva

```
src/app/shared/
├── services/
│   ├── audio/
│   │   ├── audio-stream.service.ts          ← NEW
│   │   ├── audio-streamer.service.ts        ← NEW
│   │   └── audio-processing.service.ts      ← LEGACY
│   ├── gemini/
│   │   ├── gemini-live.service.ts           ← NEW
│   │   └── gemini-audio.service.ts          ← LEGACY
│   ├── video/
│   │   └── video-stream.service.ts          ← NEW (optional)
│   └── registry/
│       └── adapter-registry.service.ts      ← NEW
├── models/
│   └── agent/
│       ├── agent-adapter.interface.ts       ← NEW
│       ├── agent-config.interface.ts        ← NEW
│       └── company-config.interface.ts      ← NEW
├── worklets/
│   ├── audio-recording.worklet.ts           ← NEW
│   └── vol-meter.worklet.ts                 ← NEW
└── components/
    └── audio-pulse/
        ├── audio-pulse.component.ts         ← NEW
        ├── audio-pulse.component.html       ← NEW
        └── audio-pulse.component.scss       ← NEW
```

---

## Timeline de Implementación

### Día 1-2: Setup
- [ ] Copiar archivos a shared/
- [ ] Actualizar paths en video-agent (validar que siga funcionando)
- [ ] Crear estructura de carpetas

### Día 2-3: Audio Services
- [ ] Actualizar imports en gemini-asistant
- [ ] Reemplazar AudioProcessingService con AudioStreamService
- [ ] Integrar AudioStreamerService
- [ ] Testing de recording y playback

### Día 3-4: UI & Tools
- [ ] Integrar audio-pulse.component
- [ ] Migrar a GeminiLiveService
- [ ] Implementar AdapterRegistry
- [ ] Integrar katuq-inventory-tools como adapter

### Día 4-5: Testing & Polish
- [ ] Testing en desktop
- [ ] Testing en móvil
- [ ] Performance benchmarking
- [ ] Bug fixes
- [ ] Documentation

---

## Cambios Principales en Código

### Before (gemini-asistant)
```typescript
// audio-processing.service.ts - ScriptProcessor (deprecated)
this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
this.scriptProcessorNode.onaudioprocess = (event) => {
  // BLOQUEA MAIN THREAD
  onAudioData(event.inputBuffer.getChannelData(0));
};

// Direct playback sin queue
source.start(this.nextStartTime);

// Tools hardcoded
searchInventory(query) { ... }
getStockAlerts() { ... }
```

### After (con video-agent)
```typescript
// audio-stream.service.ts - AudioWorklets (moderno)
await this.audioContext.audioWorklet.addModule(workletUrl);
this.recordingWorklet = new AudioWorkletNode(this.audioContext, 'audio-recording-processor');
this.recordingWorklet.port.onmessage = (event) => {
  // NO BLOQUEA, worker thread
  this.audioChunkSubject.next(base64Audio);
};

// Queue-based playback con look-ahead
addPCM16(chunk);           // Agrega a queue
scheduleNextBuffer();      // Programa 200ms adelante

// Adapter pattern extensible
export class InventoryAdapter implements IAgentAdapter {
  getToolDeclarations(): ToolDeclaration[] { ... }
  processResult(rawResult) { ... }
  getNextAction(result) { ... }
}
```

---

## Validación Post-Migración

### Audio Recording
- [ ] Volumen detectado correctamente
- [ ] No hay bloqueos en main thread
- [ ] Trabajar en dispositivos móviles
- [ ] Visualización en VU meter

### Audio Playback
- [ ] Sin glitches en conexiones normales
- [ ] Sin glitches en conexiones lentas
- [ ] Fade-out suave
- [ ] Múltiples chunks en rápida sucesión

### Tool Calling
- [ ] Herramientas se ejecutan correctamente
- [ ] Resultados se procesan con adapter
- [ ] Próxima acción se determina correctamente
- [ ] UI se actualiza adecuadamente

### Performance
- [ ] CPU < 5% en recording
- [ ] Memory < 20MB en audio
- [ ] Tool response < 500ms
- [ ] Mobile smooth (60fps cuando sea posible)

---

## Preguntas Frecuentes

**P: ¿Afectará esto a video-agent?**  
R: NO. Video-agent solo copia hacia shared/, no se modifica.

**P: ¿Perderé las herramientas de inventario?**  
R: NO. Se mantienen, se integran mejor con adapter pattern.

**P: ¿Funcionará en Safari?**  
R: Mayormente sí. AudioWorklets soportado. Si no, fallback a ScriptProcessor.

**P: ¿Cuándo veo los beneficios?**  
R: Inmediatamente. VU meter aparece, glitches desaparecen, CPU baja.

**P: ¿Necesito cambiar mi código?**  
R: Mínimamente. Principales cambios en servicios ya están en video-agent.

---

## Recursos

- Audio Worklets: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
- Gemini Live API: https://ai.google.dev/api/gemini-live
- @google/genai SDK: https://www.npmjs.com/package/@google/genai
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**Documento**: RESUMEN_EJECUTIVO_MIGRACION.md  
**Fecha**: 2025-10-26  
**Estado**: LISTO PARA IMPLEMENTACIÓN
