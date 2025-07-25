import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

// Enums y tipos para el avatar
export enum AvatarState {
  IDLE = 'idle',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  SUCCESS = 'success',
  ERROR = 'error',
  CELEBRATING = 'celebrating',
  SEARCHING = 'searching',
  PROCESSING = 'processing'
}

export interface AvatarConfig {
  size: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  particleCount: number;
  animationSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'audio' | 'emotion' | 'success' | 'thinking';
}

export interface AvatarAnimationState {
  eyeSize: number;
  eyeY: number;
  mouthWidth: number;
  mouthHeight: number;
  glowIntensity: number;
  headRotation: number;
  breathingPhase: number;
  blinkTimer: number;
}

@Injectable({
  providedIn: 'root'
})
export class AvatarCanvasService implements OnDestroy {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationFrameId!: number;
  private audioContext!: AudioContext;
  private analyser!: AnalyserNode;
  private dataArray!: Uint8Array;
  private source!: MediaStreamAudioSourceNode;

  // Estado del avatar
  private currentState = AvatarState.IDLE;
  private targetState = AvatarState.IDLE;
  private stateTransitionProgress = 1;
  private lastStateChange = 0;

  // Configuración
  private config: AvatarConfig = {
    size: 100,
    primaryColor: '#4caf50',
    secondaryColor: '#81c784',
    backgroundColor: '#e8f5e8',
    particleCount: 20,
    animationSpeed: 1
  };

  // Animación
  private animationState: AvatarAnimationState = {
    eyeSize: 8,
    eyeY: -15,
    mouthWidth: 0,
    mouthHeight: 0,
    glowIntensity: 0,
    headRotation: 0,
    breathingPhase: 0,
    blinkTimer: 0
  };

  // Partículas
  private particles: Particle[] = [];
  private lastParticleSpawn = 0;

  // Audio analysis
  private audioLevels = { low: 0, mid: 0, high: 0, volume: 0 };
  private isAnalyzing = false;

  // Observables
  private stateSubject = new BehaviorSubject<AvatarState>(AvatarState.IDLE);
  private audioLevelSubject = new Subject<typeof this.audioLevels>();
  
  public state$ = this.stateSubject.asObservable();
  public audioLevel$ = this.audioLevelSubject.asObservable();

  // Variables de tiempo para animaciones
  private startTime = Date.now();
  private lastFrameTime = 0;

  constructor() {
    this.bindMethods();
  }

  private bindMethods(): void {
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Inicializa el canvas y comienza la animación
   */
  public initializeCanvas(canvas: HTMLCanvasElement, config?: Partial<AvatarConfig>): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.setupCanvas();
    this.startAnimation();
    
    // Escuchar cambios de tamaño
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Configura el canvas con el tamaño apropiado
   */
  private setupCanvas(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const size = Math.min(container.clientWidth, container.clientHeight, this.config.size * 2);
      this.canvas.width = size;
      this.canvas.height = size;
      this.canvas.style.width = `${size}px`;
      this.canvas.style.height = `${size}px`;
    }
  }

  /**
   * Conecta el análisis de audio al stream de WebRTC
   */
  public connectAudioStream(stream: MediaStream): void {
    try {
      if (this.audioContext) {
        this.audioContext.close();
      }

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isAnalyzing = true;

      console.log('🎵 Avatar conectado al stream de audio');
    } catch (error) {
      console.error('Error conectando audio al avatar:', error);
    }
  }

  /**
   * Desconecta el análisis de audio
   */
  public disconnectAudioStream(): void {
    this.isAnalyzing = false;
    
    if (this.source) {
      this.source.disconnect();
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    this.audioLevels = { low: 0, mid: 0, high: 0, volume: 0 };
    console.log('🔇 Avatar desconectado del audio');
  }

  /**
   * Cambia el estado del avatar con transición suave
   */
  public setState(newState: AvatarState, immediate = false): void {
    if (this.currentState === newState && this.stateTransitionProgress === 1) {
      return;
    }

    this.targetState = newState;
    this.lastStateChange = Date.now();
    
    if (immediate) {
      this.currentState = newState;
      this.stateTransitionProgress = 1;
    } else {
      this.stateTransitionProgress = 0;
    }

    this.stateSubject.next(newState);
    console.log(`🤖 Avatar: ${this.currentState} → ${newState}`);
  }

  /**
   * Reacciona a eventos específicos de herramientas de pedidos
   */
  public reactToOrderEvent(toolName: string, result: any): void {
    const eventReactions: { [key: string]: AvatarState } = {
      // Herramientas de bodega y productos
      'listWarehouses': AvatarState.SEARCHING,
      'selectWarehouse': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      'searchProducts': AvatarState.SEARCHING,
      'getProductFilters': AvatarState.THINKING,
      'addToCart': result.success ? AvatarState.CELEBRATING : AvatarState.ERROR,
      'quickAddToCart': result.success ? AvatarState.CELEBRATING : AvatarState.ERROR,
      'getCartContents': AvatarState.THINKING,
      
      // Herramientas de cliente
      'searchClient': AvatarState.SEARCHING,
      'setClientToOrder': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      'quickCreateClient': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      
      // Herramientas de entrega y facturación
      'setDeliveryInfo': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      'setDeliveryDetails': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      'getDeliveryOptions': AvatarState.THINKING,
      
      // Herramientas de estado y resumen
      'getCurrentOrder': AvatarState.THINKING,
      'getOrderSummary': AvatarState.THINKING,
      'validateOrderBeforePay': result.canProceedToPay ? AvatarState.SUCCESS : AvatarState.THINKING,
      'validateSpecificData': result.isValid ? AvatarState.SUCCESS : AvatarState.ERROR,
      
      // Herramientas de navegación del wizard
      'goToWizardStep': result.success ? AvatarState.SUCCESS : AvatarState.ERROR,
      'getCurrentStepInfo': AvatarState.THINKING,
      'getWizardMap': AvatarState.THINKING,
      
      // Herramientas de shortcuts
      'smartNextStep': result.success ? AvatarState.SUCCESS : AvatarState.THINKING,
      'getQuickStatus': AvatarState.THINKING,
      'expressCheckout': result.success ? AvatarState.CELEBRATING : AvatarState.ERROR,
      
      // Herramientas de finalización
      'processSale': result.success ? AvatarState.CELEBRATING : AvatarState.ERROR,
    };

    const reaction = eventReactions[toolName];
    if (reaction) {
      this.setState(reaction);
      console.log(`🎭 Avatar reaccionando a ${toolName}: ${reaction}`);
      
      // Duración de la reacción según el tipo
      let reactionDuration = 1500; // Por defecto
      
      switch (reaction) {
        case AvatarState.CELEBRATING:
          reactionDuration = 2500; // Celebraciones más largas
          break;
        case AvatarState.SUCCESS:
          reactionDuration = 1200; // Éxitos más rápidos
          break;
        case AvatarState.SEARCHING:
          reactionDuration = 800; // Búsquedas rápidas
          break;
        case AvatarState.ERROR:
          reactionDuration = 2000; // Errores un poco más largos
          break;
        case AvatarState.THINKING:
          reactionDuration = 1000; // Pensamiento rápido
          break;
      }
      
      // Volver al estado anterior después de la reacción
      setTimeout(() => {
        this.setState(AvatarState.LISTENING);
      }, reactionDuration);
    } else {
      // Para herramientas no reconocidas, mostrar estado pensando brevemente
      console.log(`🤔 Avatar: herramienta desconocida ${toolName}`);
      this.setState(AvatarState.THINKING);
      setTimeout(() => {
        this.setState(AvatarState.LISTENING);
      }, 800);
    }
  }

  /**
   * Actualiza el análisis de audio en cada frame
   */
  private updateAudioAnalysis(): void {
    if (!this.isAnalyzing || !this.analyser) {
      return;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    // Calcular niveles de frecuencia
    const length = this.dataArray.length;
    const lowEnd = Math.floor(length * 0.2);
    const midEnd = Math.floor(length * 0.6);

    let low = 0, mid = 0, high = 0, total = 0;

    for (let i = 0; i < length; i++) {
      const value = this.dataArray[i] / 255;
      total += value;

      if (i < lowEnd) {
        low += value;
      } else if (i < midEnd) {
        mid += value;
      } else {
        high += value;
      }
    }

    this.audioLevels = {
      low: low / lowEnd,
      mid: mid / (midEnd - lowEnd),
      high: high / (length - midEnd),
      volume: total / length
    };

    this.audioLevelSubject.next(this.audioLevels);

    // Detectar si está hablando basado en el volumen
    if (this.audioLevels.volume > 0.01 && this.currentState === AvatarState.LISTENING) {
      this.setState(AvatarState.SPEAKING);
    } else if (this.audioLevels.volume <= 0.005 && this.currentState === AvatarState.SPEAKING) {
      this.setState(AvatarState.LISTENING);
    }
  }

  /**
   * Actualiza el estado de animación basado en el estado actual
   */
  private updateAnimationState(deltaTime: number): void {
    const time = (Date.now() - this.startTime) / 1000;
    
    // Transición entre estados
    if (this.stateTransitionProgress < 1) {
      this.stateTransitionProgress = Math.min(1, this.stateTransitionProgress + deltaTime * 3);
      
      if (this.stateTransitionProgress >= 1) {
        this.currentState = this.targetState;
      }
    }

    // Animación de respiración base
    this.animationState.breathingPhase = Math.sin(time * 2) * 0.1 + 1;

    // Animación de parpadeo
    this.animationState.blinkTimer -= deltaTime;
    if (this.animationState.blinkTimer <= 0) {
      this.animationState.blinkTimer = 2 + Math.random() * 3; // Parpadear cada 2-5 segundos
    }

    // Estados específicos
    switch (this.currentState) {
      case AvatarState.IDLE:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 8, deltaTime * 3);
        this.animationState.mouthWidth = this.lerp(this.animationState.mouthWidth, 0, deltaTime * 5);
        this.animationState.mouthHeight = this.lerp(this.animationState.mouthHeight, 0, deltaTime * 5);
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.2, deltaTime * 2);
        break;

      case AvatarState.LISTENING:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 12, deltaTime * 3);
        this.animationState.mouthWidth = this.lerp(this.animationState.mouthWidth, 4, deltaTime * 5);
        this.animationState.mouthHeight = this.lerp(this.animationState.mouthHeight, 2, deltaTime * 5);
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.5, deltaTime * 2);
        break;

      case AvatarState.SPEAKING:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 10, deltaTime * 3);
        // Animación de boca basada en audio
        const targetMouthWidth = 8 + this.audioLevels.volume * 20;
        const targetMouthHeight = 4 + this.audioLevels.mid * 10;
        this.animationState.mouthWidth = this.lerp(this.animationState.mouthWidth, targetMouthWidth, deltaTime * 8);
        this.animationState.mouthHeight = this.lerp(this.animationState.mouthHeight, targetMouthHeight, deltaTime * 8);
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.8 + this.audioLevels.volume, deltaTime * 5);
        break;

      case AvatarState.THINKING:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 6, deltaTime * 3);
        this.animationState.headRotation = Math.sin(time * 3) * 5; // Rotación sutil
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.6, deltaTime * 2);
        break;

      case AvatarState.SUCCESS:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 14, deltaTime * 4);
        this.animationState.mouthWidth = this.lerp(this.animationState.mouthWidth, 16, deltaTime * 6);
        this.animationState.mouthHeight = this.lerp(this.animationState.mouthHeight, 8, deltaTime * 6);
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 1.2, deltaTime * 3);
        break;

      case AvatarState.CELEBRATING:
        const celebration = Math.sin(time * 8) * 0.5 + 0.5;
        this.animationState.eyeSize = 14 + celebration * 4;
        this.animationState.mouthWidth = 16 + celebration * 8;
        this.animationState.mouthHeight = 8 + celebration * 4;
        this.animationState.glowIntensity = 1.0 + celebration * 0.8;
        this.animationState.headRotation = Math.sin(time * 4) * 10;
        break;

      case AvatarState.ERROR:
        this.animationState.eyeSize = this.lerp(this.animationState.eyeSize, 4, deltaTime * 4);
        this.animationState.mouthWidth = this.lerp(this.animationState.mouthWidth, 2, deltaTime * 5);
        this.animationState.mouthHeight = this.lerp(this.animationState.mouthHeight, 6, deltaTime * 5);
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.3, deltaTime * 2);
        break;

      case AvatarState.SEARCHING:
        this.animationState.eyeSize = 8 + Math.sin(time * 6) * 2;
        this.animationState.eyeY = -15 + Math.sin(time * 4) * 3; // Ojos que se mueven
        this.animationState.glowIntensity = this.lerp(this.animationState.glowIntensity, 0.7, deltaTime * 3);
        break;
    }
  }

  /**
   * Maneja las partículas del avatar
   */
  private updateParticles(deltaTime: number): void {
    const now = Date.now();
    
    // Crear nuevas partículas según el estado
    if (now - this.lastParticleSpawn > this.getParticleSpawnRate()) {
      this.spawnParticle();
      this.lastParticleSpawn = now;
    }

    // Actualizar partículas existentes
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.life -= deltaTime;

      // Remover partículas muertas
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Obtiene la velocidad de spawn de partículas según el estado
   */
  private getParticleSpawnRate(): number {
    switch (this.currentState) {
      case AvatarState.SPEAKING: return 100;
      case AvatarState.CELEBRATING: return 50;
      case AvatarState.SUCCESS: return 150;
      case AvatarState.THINKING: return 300;
      case AvatarState.LISTENING: return 200;
      default: return 500;
    }
  }

  /**
   * Renderiza el avatar completo
   */
  private render(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const avatarRadius = this.config.size / 2;

    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Renderizar cuerpo (nuevo)
    this.renderBody(centerX, centerY, avatarRadius);

    // Aplicar transformaciones globales para la cabeza
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((this.animationState.headRotation * Math.PI) / 180);
    this.ctx.scale(this.animationState.breathingPhase, this.animationState.breathingPhase);

    // Renderizar aura/glow
    this.renderGlow(avatarRadius);

    // Renderizar cabeza (ahora ovalada)
    this.renderHead(avatarRadius);

    // Renderizar mejillas simpáticas
    this.renderCheeks();

    // Renderizar ojos (más juntos y ovalados)
    this.renderEyes();

    // Renderizar boca (curva animada tipo labios)
    this.renderMouth();

    this.ctx.restore();

    // Renderizar partículas (sin transformaciones)
    this.renderParticles();
  }

  /**
   * Renderiza el efecto de glow alrededor del avatar
   */
  private renderGlow(radius: number): void {
    const glowRadius = radius * (1 + this.animationState.glowIntensity);
    
    const gradient = this.ctx.createRadialGradient(0, 0, radius, 0, 0, glowRadius);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, this.hexToRgba(this.config.primaryColor, 0.1 * this.animationState.glowIntensity));
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Renderiza la cabeza del avatar (ovalada)
   */
  private renderHead(radius: number): void {
    // Cabeza principal ovalada
    const headGradient = this.ctx.createRadialGradient(0, -radius * 0.3, 0, 0, 0, radius);
    headGradient.addColorStop(0, this.config.secondaryColor);
    headGradient.addColorStop(1, this.config.primaryColor);

    this.ctx.fillStyle = headGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius, radius * 1.15, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Borde de la cabeza
    this.ctx.strokeStyle = this.config.primaryColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius, radius * 1.15, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Renderiza mejillas simpáticas
   */
  private renderCheeks(): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 182, 193, 0.5)'; // Rosado pastel
    this.ctx.beginPath();
    this.ctx.ellipse(-18, 28, 7, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.ellipse(18, 28, 7, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Renderiza los ojos del avatar (más juntos, ovalados y con párpado)
   */
  private renderEyes(): void {
    const eyeDistance = 14; // Más juntos
    const eyeY = this.animationState.eyeY;
    const eyeSizeX = this.animationState.eyeSize * 0.8; // Más ovalado
    const eyeSizeY = this.animationState.eyeSize;

    // Determinar si está parpadeando
    const isBlinking = this.animationState.blinkTimer < 0.1;
    const eyeHeight = isBlinking ? 2 : eyeSizeY;

    this.ctx.fillStyle = '#ffffff';
    // Ojo izquierdo
    this.ctx.beginPath();
    this.ctx.ellipse(-eyeDistance, eyeY, eyeSizeX, eyeHeight, 0, 0, Math.PI * 2);
    this.ctx.fill();
    // Ojo derecho
    this.ctx.beginPath();
    this.ctx.ellipse(eyeDistance, eyeY, eyeSizeX, eyeHeight, 0, 0, Math.PI * 2);
    this.ctx.fill();

    if (!isBlinking) {
      // Pupilas
      this.ctx.fillStyle = '#333333';
      const pupilSizeX = eyeSizeX * 0.6;
      const pupilSizeY = eyeSizeY * 0.6;
      this.ctx.beginPath();
      this.ctx.ellipse(-eyeDistance, eyeY, pupilSizeX, pupilSizeY, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(eyeDistance, eyeY, pupilSizeX, pupilSizeY, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // Brillo en los ojos
      this.ctx.fillStyle = '#ffffff';
      const shineSizeX = pupilSizeX * 0.3;
      const shineSizeY = pupilSizeY * 0.4;
      this.ctx.beginPath();
      this.ctx.ellipse(-eyeDistance - pupilSizeX * 0.2, eyeY - pupilSizeY * 0.2, shineSizeX, shineSizeY, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(eyeDistance - pupilSizeX * 0.2, eyeY - pupilSizeY * 0.2, shineSizeX, shineSizeY, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // Párpado superior
      this.ctx.strokeStyle = '#bbb';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(-eyeDistance, eyeY, eyeSizeX, Math.PI, 2 * Math.PI);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(eyeDistance, eyeY, eyeSizeX, Math.PI, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  /**
   * Renderiza la boca del avatar (curva animada tipo labios, ahora más expresiva según el volumen de voz)
   */
  private renderMouth(): void {
    const mouthY = 28;
    let mouthWidth = this.animationState.mouthWidth;
    let mouthHeight = this.animationState.mouthHeight;

    // Boca más expresiva según el estado y el volumen de voz
    if (this.currentState === AvatarState.SPEAKING) {
      // El volumen de voz controla la apertura y curvatura
      const vol = Math.min(1, this.audioLevels.volume * 3); // Normaliza el volumen
      mouthWidth = 16 + vol * 16; // Más ancha con más volumen
      mouthHeight = 6 + vol * 24; // Más alta con más volumen
    } else if (this.currentState === AvatarState.LISTENING || this.currentState === AvatarState.IDLE) {
      mouthWidth = 16;
      mouthHeight = 2; // Línea recta o curva sutil
    } // Otros estados usan la animaciónState por defecto

    // Boca tipo curva (labios)
    this.ctx.save();
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(-mouthWidth, mouthY);
    this.ctx.quadraticCurveTo(0, mouthY + mouthHeight, mouthWidth, mouthY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Renderiza el cuerpo del avatar (tronco y brazos)
   */
  private renderBody(centerX: number, centerY: number, radius: number): void {
    this.ctx.save();
    // Tronco
    this.ctx.fillStyle = this.config.primaryColor;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY + radius * 1.3, radius * 0.7, radius * 1.1, 0, 0, Math.PI * 2);
    this.ctx.fill();
    // Brazos
    this.ctx.strokeStyle = this.config.secondaryColor;
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - radius * 0.7, centerY + radius * 1.1);
    this.ctx.quadraticCurveTo(centerX - radius * 1.2, centerY + radius * 1.7, centerX - radius * 0.2, centerY + radius * 1.7);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(centerX + radius * 0.7, centerY + radius * 1.1);
    this.ctx.quadraticCurveTo(centerX + radius * 1.2, centerY + radius * 1.7, centerX + radius * 0.2, centerY + radius * 1.7);
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Crea una nueva partícula (solo ambientales y celebración, no burbujas de boca)
   */
  private spawnParticle(): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const avatarRadius = this.config.size / 2;
    let particle: Particle;
    switch (this.currentState) {
      case AvatarState.CELEBRATING:
        // Partículas doradas que explotan
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        particle = {
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          color: '#ffd700',
          life: 1.5 + Math.random(),
          maxLife: 1.5 + Math.random(),
          type: 'success'
        };
        break;
      case AvatarState.THINKING:
        // Partículas que giran alrededor de la cabeza
        const orbitAngle = Date.now() / 500 + Math.random() * Math.PI * 2;
        particle = {
          x: centerX + Math.cos(orbitAngle) * avatarRadius * 1.5,
          y: centerY + Math.sin(orbitAngle) * avatarRadius * 1.5,
          vx: 0,
          vy: -20,
          size: 1.5 + Math.random() * 2,
          color: '#ffeb3b',
          life: 2 + Math.random(),
          maxLife: 2 + Math.random(),
          type: 'thinking'
        };
        break;
      default:
        // Partículas ambientales sutiles
        const ambientAngle = Math.random() * Math.PI * 2;
        particle = {
          x: centerX + Math.cos(ambientAngle) * avatarRadius * 2,
          y: centerY + Math.sin(ambientAngle) * avatarRadius * 2,
          vx: (Math.random() - 0.5) * 20,
          vy: -10 - Math.random() * 20,
          size: 1 + Math.random() * 2,
          color: this.config.secondaryColor,
          life: 2 + Math.random() * 2,
          maxLife: 2 + Math.random() * 2,
          type: 'emotion'
        };
        break;
    }
    this.particles.push(particle);
  }

  /**
   * Renderiza las partículas (solo ambientales y celebración, no burbujas de boca)
   */
  private renderParticles(): void {
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      const size = particle.size * alpha;
      this.ctx.fillStyle = this.hexToRgba(particle.color, alpha);
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /**
   * Loop principal de animación
   */
  private animate(currentTime: number): void {
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Actualizar análisis de audio
    this.updateAudioAnalysis();

    // Actualizar estado de animación
    this.updateAnimationState(deltaTime);

    // Actualizar partículas
    this.updateParticles(deltaTime);

    // Renderizar
    this.render();

    // Continuar animación
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Inicia el loop de animación
   */
  private startAnimation(): void {
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Detiene la animación
   */
  private stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Maneja el redimensionamiento del canvas
   */
  private handleResize(): void {
    this.setupCanvas();
  }

  /**
   * Interpolación lineal entre dos valores
   */
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  /**
   * Convierte hex a rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(76, 175, 80, ${alpha})`; // Fallback
  }

  /**
   * Actualiza la configuración del avatar
   */
  public updateConfig(newConfig: Partial<AvatarConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtiene el estado actual del avatar
   */
  public getCurrentState(): AvatarState {
    return this.currentState;
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.stopAnimation();
    this.disconnectAudioStream();
    window.removeEventListener('resize', this.handleResize);
  }
}