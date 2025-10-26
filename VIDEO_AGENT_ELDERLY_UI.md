# Video Agent - UI Optimizada para Personas Mayores

## 📅 Fecha: 26 de Octubre 2025

## 🎯 Objetivo
Crear una interfaz súper intuitiva y accesible para personas de 80+ años, con textos grandes, alto contraste, iconos claros y configuración dinámica por empresa.

---

## ✅ Mejoras Implementadas

### 1. **Sistema de Configuración por Empresa/URL** 🔴 NUEVO

**Archivo**: `src/app/modules/video-agent/core/models/company-config.interface.ts`

**Funcionalidad**:
```typescript
export interface CompanyConfig {
  id: string;
  name: string;
  industry: 'appliance' | 'automotive' | 'healthcare' | 'general';
  
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    companyName: string;
  };
  
  ui: {
    welcomeMessage: string;
    instructionsForElderly: string[];
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
  };
  
  contact?: {
    phone?: string;
    scheduleUrl?: string;
  };
}
```

**Empresas Preconfiguradas**:
- ✅ **Haceb** (Electrodomésticos)
- ✅ **Default** (Genérico)

**Uso por URL**:
```
http://localhost:4200/video-agent?company=haceb
http://localhost:4200/video-agent?company=default
http://localhost:4200/video-agent (usa default)
```

---

### 2. **UI Completamente Rediseñada para Mayores** 🔴 CRÍTICO

#### **Características Clave**:

##### **Textos Gigantes**
```scss
.font-size-extra-large {
  --font-size-base: 24px;    // Texto normal
  --font-size-large: 32px;   // Texto importante
  --font-size-xl: 48px;      // Títulos
}
```

##### **Alto Contraste**
```scss
.high-contrast-mode {
  --text-primary: #000000;      // Negro puro
  --text-secondary: #1a1a1a;    // Casi negro
  --bg-primary: #ffffff;        // Blanco puro
  --border-color: #333333;      // Bordes oscuros
}
```

##### **Iconos Gigantes**
- Iconos de 2rem a 5rem (32px a 80px)
- Espaciado generoso entre elementos
- Botones de 2rem de padding

##### **Colores Dinámicos**
```typescript
// Se aplican desde TypeScript según empresa
document.documentElement.style.setProperty('--company-primary', '#E31E24'); // Rojo Haceb
document.documentElement.style.setProperty('--company-secondary', '#1A1A1A'); // Negro Haceb
```

---

### 3. **Componentes Específicos para Mayores**

#### **Header Simplificado**
```html
<div class="session-header-elderly">
  <h1 class="company-title">
    <i class="pi pi-video"></i> <!-- ICONO GIGANTE -->
    {{ companyConfig.branding.companyName }}
  </h1>
  <p class="welcome-message">{{ companyConfig.ui.welcomeMessage }}</p>
  
  <!-- Badge de conexión MUY VISIBLE -->
  <div class="connection-badge connected">
    <i class="pi pi-check-circle"></i>
    CONECTADO
  </div>
</div>
```

#### **Instrucciones Paso a Paso**
```html
<div class="instructions-card">
  <h2><i class="pi pi-info-circle"></i> ¿Cómo funciona?</h2>
  
  <div class="instruction-step">
    <div class="step-number">1</div> <!-- Círculo grande con número -->
    <p class="step-text">Acerca la cámara al electrodoméstico</p>
  </div>
  
  <div class="instruction-step">
    <div class="step-number">2</div>
    <p class="step-text">Cuéntame qué problema tiene</p>
  </div>
  
  <div class="instruction-step">
    <div class="step-number">3</div>
    <p class="step-text">Te diré si puedes resolverlo tú mismo</p>
  </div>
</div>
```

#### **Chat con Burbujas Grandes**
```html
<div class="message-bubble-elderly agent">
  <div class="message-icon">
    <i class="pi pi-android"></i> <!-- Icono 60x60px -->
  </div>
  <div class="message-content-elderly">
    <div class="message-sender">ASISTENTE</div> <!-- MAYÚSCULAS -->
    <div class="message-text-elderly">
      ¡Hola! Soy tu asistente de Haceb...
    </div>
    <div class="message-time-elderly">10:30 AM</div>
  </div>
</div>
```

#### **Botón Principal GIGANTE**
```scss
.btn-main-elderly {
  width: 100%;
  max-width: 500px;
  padding: 2rem 3rem !important;        // ENORME
  font-size: var(--font-size-xl) !important;  // 48px
  font-weight: 800 !important;
  border-radius: 16px !important;
  text-transform: uppercase;
  
  i {
    font-size: 3rem;  // Icono 48px
  }
}
```

#### **Indicadores de Audio Visuales**
```html
<div class="audio-meters-elderly">
  <div class="meter-item">
    <div class="meter-label">MICRÓFONO</div>
    <app-audio-pulse [volume]="inputVolume" [active]="isAudioRecording">
    </app-audio-pulse>
    <div class="meter-status">ACTIVO</div>
  </div>
</div>
```

---

### 4. **Transcripciones Visibles en Tiempo Real** ✅ ARREGLADO

El chat ahora muestra:
- ✅ **Mensajes del usuario** (cuando Gemini detecta speech)
- ✅ **Respuestas del asistente** (texto de Gemini)
- ✅ **Timestamps** claros
- ✅ **Iconos diferenciados** (usuario vs asistente)

**Flujo**:
```
Usuario habla → Gemini transcribe → geminiService.transcript$ 
→ component.addMessage('agent', text) → Chat actualizado
```

---

## 🎨 Paleta de Colores por Empresa

### Haceb
```scss
Primary: #E31E24 (Rojo Haceb)
Secondary: #1A1A1A (Negro)
Success: #48bb78 (Verde)
Danger: #fc8181 (Rojo claro)
```

### Default
```scss
Primary: #667eea (Azul/Morado)
Secondary: #764ba2 (Morado)
Success: #48bb78 (Verde)
Danger: #fc8181 (Rojo)
```

---

## 📐 Espaciados y Tamaños

### Espaciado
```scss
--spacing-base: 1.5rem (24px)
gap: 2rem entre secciones principales
padding: 2rem en tarjetas
```

### Iconos
```scss
Pequeños: 1.5rem (24px)
Medianos: 2rem (32px)
Grandes: 3rem (48px)
Extra grandes: 5rem (80px)
```

### Botones
```scss
Principales: padding 2rem 3rem
Secundarios: padding 1rem 2rem
Border-radius: 12px - 16px
```

---

## 🚀 Cómo Usar

### 1. Acceder con Configuración Haceb
```
http://localhost:4200/video-agent?company=haceb
```

**Se aplicará**:
- ✅ Colores rojo y negro de Haceb
- ✅ Mensaje de bienvenida personalizado
- ✅ Instrucciones específicas para electrodomésticos
- ✅ Teléfono de contacto: 018000-123456
- ✅ Fuente extra-large (24px base)
- ✅ Alto contraste habilitado

### 2. Acceder con Configuración Default
```
http://localhost:4200/video-agent
```

**Se aplicará**:
- ✅ Colores morados por defecto
- ✅ Mensaje genérico
- ✅ Fuente large (20px base)
- ✅ Alto contraste deshabilitado

---

## 📋 Checklist de Accesibilidad

### Visual
- ✅ **Textos gigantes**: 24px - 48px
- ✅ **Alto contraste**: Negro sobre blanco
- ✅ **Iconos grandes**: 32px - 80px
- ✅ **Espaciado generoso**: 24px mínimo
- ✅ **Colores diferenciados**: Verde (éxito), Rojo (peligro)

### Interacción
- ✅ **Botones enormes**: min 60x60px touch targets
- ✅ **Labels claros**: MAYÚSCULAS para énfasis
- ✅ **Estados visuales**: Conectado/Desconectado muy obvios
- ✅ **Feedback inmediato**: Animaciones de pulso

### Contenido
- ✅ **Instrucciones paso a paso**: Numeradas 1-2-3
- ✅ **Lenguaje simple**: Sin tecnicismos
- ✅ **Información de contacto**: Teléfono visible
- ✅ **Confirmaciones visuales**: "TRANSMITIENDO", "ESCUCHANDO"

---

## 🧪 Testing Checklist

### Configuración
- [ ] URL sin parámetro carga config default
- [ ] URL `?company=haceb` carga config Haceb
- [ ] Colores se aplican dinámicamente
- [ ] Tamaños de fuente se aplican correctamente
- [ ] Alto contraste funciona

### UI para Mayores
- [ ] Textos son legibles desde 2 metros
- [ ] Iconos son reconocibles
- [ ] Botones son fáciles de presionar
- [ ] Estados son obvios (conectado/desconectado)
- [ ] Chat muestra mensajes claramente

### Funcionalidad
- [ ] Transcripciones aparecen en tiempo real
- [ ] Audio se escucha sin glitches
- [ ] Video se transmite correctamente
- [ ] VU meters funcionan
- [ ] Botones responden al toque

---

## 📊 Comparación: Antes vs Después

| Aspecto | ❌ Antes | ✅ Después |
|---------|---------|----------|
| **Tamaño texto** | 16px base | 24px base (extra-large) |
| **Iconos** | 1rem (16px) | 3-5rem (48-80px) |
| **Botones** | 40px height | 80px+ height |
| **Contraste** | Normal | Alto contraste |
| **Configuración** | Fija | Dinámica por empresa |
| **Instrucciones** | Ocultas | Paso a paso visible |
| **Chat** | Pequeño | Burbujas grandes |
| **Contacto** | No visible | Teléfono prominente |

---

## 🎯 Próximos Pasos

### Agregar Más Empresas
```typescript
// En company-config.interface.ts
COMPANY_CONFIGS['samsung'] = {
  id: 'samsung',
  name: 'Samsung',
  industry: 'appliance',
  branding: {
    primaryColor: '#1428A0',
    secondaryColor: '#000000',
    companyName: 'Samsung'
  },
  // ...
};
```

### Agregar Logos
```typescript
branding: {
  logo: 'assets/logos/haceb-logo.png'
}
```

### Personalizar Voces
```typescript
ui: {
  voiceConfig: {
    language: 'es-CO',
    pitch: 1.2,
    rate: 0.9  // Más lento para mayores
  }
}
```

---

## 📞 Ejemplo Completo: Haceb

### URL
```
http://localhost:4200/video-agent?company=haceb
```

### Experiencia
1. **Pantalla de Bienvenida**:
   - Logo Haceb (rojo)
   - "¡Hola! Soy tu asistente de Haceb"
   - 3 pasos numerados claramente

2. **Botón GIGANTE**:
   - "INICIAR DIAGNÓSTICO" (48px)
   - Fondo verde brillante
   - Icono play 48px

3. **Durante Sesión**:
   - Video grande y claro
   - Chat con burbujas grandes
   - "ESCUCHANDO..." con animación
   - VU meters visuales

4. **Al Final**:
   - "¿Necesitas ayuda? Llama al 018000-123456"
   - Botón "AGENDAR SERVICIO"

---

**Resultado**: Una interfaz que cualquier persona de 80 años puede usar sin ayuda ✅

---

**Estado**: 🟢 **LISTO PARA PRUEBAS CON USUARIOS REALES**
