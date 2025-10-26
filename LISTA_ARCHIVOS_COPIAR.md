# Lista Exacta de Archivos para Copiar y Mover

## LISTA DE COPIAS (video-agent → shared/)

### 1. SERVICIOS DE AUDIO (CRÍTICO)

```bash
# Fuente: /src/app/modules/video-agent/core/services/
# Destino: /src/app/shared/services/audio/

COPIAR:
  /src/app/modules/video-agent/core/services/audio-stream.service.ts
  /src/app/modules/video-agent/core/services/audio-streamer.service.ts
```

### 2. SERVICIOS DE GEMINI (CRÍTICO)

```bash
# Fuente: /src/app/modules/video-agent/core/services/
# Destino: /src/app/shared/services/gemini/

COPIAR:
  /src/app/modules/video-agent/core/services/gemini-live.service.ts
```

### 3. SERVICIOS DE VIDEO (OPCIONAL)

```bash
# Fuente: /src/app/modules/video-agent/core/services/
# Destino: /src/app/shared/services/video/

COPIAR:
  /src/app/modules/video-agent/core/services/video-stream.service.ts
```

### 4. SERVICIOS DE REGISTRO (IMPORTANTE)

```bash
# Fuente: /src/app/modules/video-agent/core/services/
# Destino: /src/app/shared/services/registry/

COPIAR:
  /src/app/modules/video-agent/core/services/adapter-registry.service.ts
```

### 5. WORKLETS (CRÍTICO)

```bash
# Fuente: /src/app/modules/video-agent/core/worklets/
# Destino: /src/app/shared/worklets/

COPIAR:
  /src/app/modules/video-agent/core/worklets/audio-recording.worklet.ts
  /src/app/modules/video-agent/core/worklets/vol-meter.worklet.ts
```

### 6. MODELOS E INTERFACES (CRÍTICO)

```bash
# Fuente: /src/app/modules/video-agent/core/models/
# Destino: /src/app/shared/models/agent/

COPIAR:
  /src/app/modules/video-agent/core/models/agent-adapter.interface.ts
  /src/app/modules/video-agent/core/models/agent-config.interface.ts
  /src/app/modules/video-agent/core/models/company-config.interface.ts
```

### 7. COMPONENTES UI (REUTILIZABLE)

```bash
# Fuente: /src/app/modules/video-agent/components/audio-pulse/
# Destino: /src/app/shared/components/audio-pulse/

COPIAR CARPETA COMPLETA:
  /src/app/modules/video-agent/components/audio-pulse/
  
ARCHIVOS:
  /src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.ts
  /src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.html
  /src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.scss
```

---

## LISTA DE MOVIDAS (gemini-asistant → shared/)

### 8. HERRAMIENTAS DE KATUQ (NEGOCIO)

```bash
# Fuente: /src/app/shared/components/gemini-asistant/services/
# Destino: /src/app/shared/services/tools/inventory/

MOVER (NO copiar, MOVER):
  /src/app/shared/components/gemini-asistant/services/katuq-inventory-tools.service.ts

DESPUÉS:
  - Actualizar imports en gemini-asistant
  - Implementar como adapter que implemente IAgentAdapter
```

---

## LISTA DE MANTENCIÓN EN gemini-asistant

### 9. VISUAL EFFECTS (MANTENER EN gemini-asistant)

```bash
# NO MOVER - Mantener en:
# /src/app/shared/components/gemini-asistant/

MANTENER:
  /src/app/shared/components/gemini-asistant/sphere-visual/
  /src/app/shared/components/gemini-asistant/sphere-visual-container/
  /src/app/shared/components/gemini-asistant/visual/
  /src/app/shared/components/gemini-asistant/visual3d/
  /src/app/shared/components/gemini-asistant/sphere-shader.ts
  /src/app/shared/components/gemini-asistant/backdrop-shader.ts
  /src/app/shared/components/gemini-asistant/analyser.ts
```

---

## LISTA DE ACTUALIZACIÓN EN gemini-asistant

### 10. ARCHIVOS A REFACTORIZAR EN gemini-asistant

```bash
# Actualizar imports y lógica en estos archivos:

/src/app/shared/components/gemini-asistant/live-audio/live-audio.component.ts
  ├─ Reemplazar import AudioProcessingService
  ├─ Agregar import AudioStreamService
  ├─ Agregar import AudioStreamerService
  ├─ Actualizar subscriptions
  └─ Integrar audio-pulse component

/src/app/shared/components/gemini-asistant/live-audio/live-audio.component.html
  ├─ Agregar <app-audio-pulse> element
  ├─ Mostrar VU meter
  └─ Actualizar bindings

/src/app/shared/components/gemini-asistant/services/gemini-audio.service.ts
  ├─ Actualizar para usar GeminiLiveService
  └─ O deprecar si se migra completamente
```

---

## RESUMEN DE RUTAS ABSOLUTAS

### Fuentes a COPIAR

```
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/audio-stream.service.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/audio-streamer.service.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/gemini-live.service.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/video-stream.service.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/services/adapter-registry.service.ts

/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/worklets/audio-recording.worklet.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/worklets/vol-meter.worklet.ts

/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/models/agent-adapter.interface.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/models/agent-config.interface.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/core/models/company-config.interface.ts

/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.ts
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.html
/Users/danielga/Downloads/Seller.Katuq/src/app/modules/video-agent/components/audio-pulse/audio-pulse.component.scss
```

### Destinos en shared/

```
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/services/audio/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/services/gemini/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/services/video/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/services/registry/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/worklets/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/models/agent/
/Users/danielga/Downloads/Seller.Katuq/src/app/shared/components/audio-pulse/
```

---

## COMANDOS BASH PARA COPIAR

```bash
#!/bin/bash

# Crear estructura de carpetas
mkdir -p src/app/shared/services/audio
mkdir -p src/app/shared/services/gemini
mkdir -p src/app/shared/services/video
mkdir -p src/app/shared/services/registry
mkdir -p src/app/shared/worklets
mkdir -p src/app/shared/models/agent
mkdir -p src/app/shared/components/audio-pulse

# Copiar servicios
cp src/app/modules/video-agent/core/services/audio-stream.service.ts \
   src/app/shared/services/audio/
cp src/app/modules/video-agent/core/services/audio-streamer.service.ts \
   src/app/shared/services/audio/
cp src/app/modules/video-agent/core/services/gemini-live.service.ts \
   src/app/shared/services/gemini/
cp src/app/modules/video-agent/core/services/video-stream.service.ts \
   src/app/shared/services/video/
cp src/app/modules/video-agent/core/services/adapter-registry.service.ts \
   src/app/shared/services/registry/

# Copiar worklets
cp src/app/modules/video-agent/core/worklets/audio-recording.worklet.ts \
   src/app/shared/worklets/
cp src/app/modules/video-agent/core/worklets/vol-meter.worklet.ts \
   src/app/shared/worklets/

# Copiar modelos
cp src/app/modules/video-agent/core/models/agent-adapter.interface.ts \
   src/app/shared/models/agent/
cp src/app/modules/video-agent/core/models/agent-config.interface.ts \
   src/app/shared/models/agent/
cp src/app/modules/video-agent/core/models/company-config.interface.ts \
   src/app/shared/models/agent/

# Copiar componentes
cp -r src/app/modules/video-agent/components/audio-pulse/ \
   src/app/shared/components/

# Mover herramientas Katuq
mv src/app/shared/components/gemini-asistant/services/katuq-inventory-tools.service.ts \
   src/app/shared/services/tools/inventory/
   
echo "Copia completada exitosamente"
```

---

## ACTUALIZACIÓN DE IMPORTS (gemini-asistant)

### Antes
```typescript
import { AudioProcessingService } from '../services/audio-processing.service';
import { GeminiAudioService } from '../services/gemini-audio.service';
import { KatuqInventoryToolsService } from '../services/katuq-inventory-tools.service';
```

### Después
```typescript
import { AudioStreamService } from '../../../../shared/services/audio/audio-stream.service';
import { AudioStreamerService } from '../../../../shared/services/audio/audio-streamer.service';
import { GeminiLiveService } from '../../../../shared/services/gemini/gemini-live.service';
import { AdapterRegistryService } from '../../../../shared/services/registry/adapter-registry.service';
import { KatuqInventoryToolsService } from '../../../../shared/services/tools/inventory/katuq-inventory-tools.service';
```

---

## CHECKLIST DE EJECUCIÓN

### Fase 1: Copias Iniciales
- [ ] Crear estructura de carpetas en shared/
- [ ] Copiar servicios de audio (audio-stream, audio-streamer)
- [ ] Copiar servicios de Gemini (gemini-live)
- [ ] Copiar worklets (audio-recording, vol-meter)
- [ ] Copiar modelos (agent-adapter, agent-config, company-config)
- [ ] Copiar componentes (audio-pulse)
- [ ] Copiar registry (adapter-registry)
- [ ] Mover herramientas Katuq

### Fase 2: Validación de video-agent
- [ ] Verificar que video-agent siga funcionando
- [ ] Actualizar imports en video-agent si necesario
- [ ] Testing básico de video-agent

### Fase 3: Refactorización de gemini-asistant
- [ ] Actualizar imports en live-audio.component
- [ ] Reemplazar AudioProcessingService con new services
- [ ] Integrar audio-pulse component
- [ ] Actualizar subscriptions
- [ ] Testing de recording
- [ ] Testing de playback

### Fase 4: Testing Final
- [ ] Testing en desktop
- [ ] Testing en móvil
- [ ] Performance profiling
- [ ] Bug fixes
- [ ] Documentation update

---

**Documento**: LISTA_ARCHIVOS_COPIAR.md  
**Fecha**: 2025-10-26  
**Estado**: LISTO PARA EJECUCIÓN
