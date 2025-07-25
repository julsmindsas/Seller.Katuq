import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { VoiceAgentService, VoiceAgentConfig, VoiceAgentState, VisualStep } from '../../services/voice-agent.service';
import { AvatarCanvasService, AvatarConfig } from '../../services/avatar-canvas.service';

export interface VoiceAgentUIConfig {
  showVisualSteps?: boolean;
  allowDragging?: boolean;
  position?: 'fixed' | 'relative';
  theme?: 'default' | 'minimal' | 'compact';
  showControls?: boolean;
}

@Component({
  selector: 'app-voice-agent',
  templateUrl: './voice-agent.component.html',
  styleUrls: ['./voice-agent.component.scss']
})
export class VoiceAgentComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() config: VoiceAgentConfig = {};
  @Input() uiConfig: VoiceAgentUIConfig = {
    showVisualSteps: true,
    allowDragging: true,
    position: 'fixed',
    theme: 'default',
    showControls: true
  };
  @Input() autoStart: boolean = false;
  @Input() demoSteps: VisualStep[] = [];

  @Output() sessionStarted = new EventEmitter<void>();
  @Output() sessionEnded = new EventEmitter<void>();
  @Output() textReceived = new EventEmitter<string>();
  @Output() stepChanged = new EventEmitter<{ stepIndex: number; step: VisualStep }>();
  @Output() errorOccurred = new EventEmitter<string>();

  // Referencias a elementos del DOM
  @ViewChild('avatarCanvas', { static: false }) avatarCanvas!: ElementRef<HTMLCanvasElement>;

  // Estado del componente
  public state: VoiceAgentState = {
    isConnected: false,
    isListening: false,
    isProcessing: false,
    callDuration: '00:00',
    currentText: '',
    errorMessage: null
  };

  public visualSteps: VisualStep[] = [];
  public currentStepIndex: number = 0;
  public isMobile: boolean = false;

  // Propiedades para arrastrar
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  public windowPosition = { x: 0, y: 0 };

  private subscriptions: Subscription[] = [];

  constructor(
    private voiceAgentService: VoiceAgentService
  ) {
    this.detectMobileDevice();
    
    // Escuchar cambios de orientación y tamaño de ventana
    window.addEventListener('resize', () => {
      this.detectMobileDevice();
    });
  }

  ngOnInit(): void {
    console.log('🚀 VoiceAgentComponent inicializando...');
    this.setupSubscriptions();
    
    if (this.autoStart) {
      this.startSession();
    }

    // Cargar pasos de demostración si se proporcionan
    if (this.demoSteps.length > 0) {
      this.voiceAgentService.setVisualSteps(this.demoSteps);
    }

    console.log('📊 Estado inicial:', this.state);
    console.log('⚙️ Configuración UI:', this.uiConfig);
  }

  ngAfterViewInit(): void {
    console.log('👁️ Vista inicializada, preparando avatar...');
    // Inicializar el canvas del avatar después de que la vista esté lista
    this.initializeAvatar();
    
    // También intentar inicializar si el estado cambia a conectado
    this.subscriptions.push(
      this.voiceAgentService.state$.subscribe(state => {
        if (state.isConnected && this.avatarCanvas?.nativeElement) {
          const avatarService = this.voiceAgentService.getAvatarService();
          if (avatarService && avatarService.getCurrentState() === 'idle') {
            console.log('🔄 Reintentando inicialización del avatar por cambio de estado');
            this.tryInitializeCanvas(avatarService);
          }
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian los pasos de demostración, actualizarlos
    if (changes['demoSteps'] && this.demoSteps.length > 0) {
      this.voiceAgentService.setVisualSteps(this.demoSteps);
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // Configurar suscripciones a los observables del servicio
  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.voiceAgentService.state$.subscribe(state => {
        this.state = state;
        
        // Emitir eventos basados en cambios de estado
        if (state.isConnected && !this.state.isConnected) {
          this.sessionStarted.emit();
        }
        
        if (!state.isConnected && this.state.isConnected) {
          this.sessionEnded.emit();
        }
        
        if (state.currentText && state.currentText !== this.state.currentText) {
          this.textReceived.emit(state.currentText);
        }
        
        if (state.errorMessage) {
          this.errorOccurred.emit(state.errorMessage);
        }
      })
    );

    this.subscriptions.push(
      this.voiceAgentService.visualSteps$.subscribe(steps => {
        this.visualSteps = steps;
      })
    );

    this.subscriptions.push(
      this.voiceAgentService.currentStepIndex$.subscribe(index => {
        this.currentStepIndex = index;
        
        if (this.visualSteps[index]) {
          this.stepChanged.emit({
            stepIndex: index,
            step: this.visualSteps[index]
          });
        }
      })
    );
  }

  // Inicializar el avatar canvas
  private initializeAvatar(): void {
    console.log('🎯 Iniciando inicialización del avatar...');
    
    // Verificar que el servicio esté disponible
    if (!this.voiceAgentService) {
      console.error('❌ VoiceAgentService no está disponible');
      return;
    }

    const avatarService = this.voiceAgentService.getAvatarService();
    if (!avatarService) {
      console.error('❌ AvatarCanvasService no está disponible');
      return;
    }

    // Usar setTimeout para asegurar que el ViewChild esté disponible
    setTimeout(() => {
      if (!this.avatarCanvas?.nativeElement) {
        console.error('❌ Canvas del avatar no está disponible después del timeout');
        // Reintentar una vez más después de un segundo
        setTimeout(() => {
          this.tryInitializeCanvas(avatarService);
        }, 1000);
        return;
      }

      this.tryInitializeCanvas(avatarService);
    }, 100);
  }

  private tryInitializeCanvas(avatarService: AvatarCanvasService): void {
    if (!this.avatarCanvas?.nativeElement) {
      console.error('❌ Canvas del avatar aún no está disponible');
      return;
    }

    try {
      // Configuración del avatar
      const avatarConfig: Partial<AvatarConfig> = {
        size: 100,
        primaryColor: '#4caf50',
        secondaryColor: '#81c784',
        backgroundColor: 'transparent',
        particleCount: 15,
        animationSpeed: 1.0
      };

      // Personalizar según el tema
      switch (this.uiConfig.theme) {
        case 'minimal':
          avatarConfig.particleCount = 8;
          avatarConfig.animationSpeed = 0.8;
          avatarConfig.size = 80;
          break;
        case 'compact':
          avatarConfig.size = 80;
          avatarConfig.particleCount = 10;
          break;
      }

      console.log('🎨 Configurando avatar canvas con:', avatarConfig);

      // Inicializar el canvas con la configuración
      avatarService.initializeCanvas(this.avatarCanvas.nativeElement, avatarConfig);
      
      console.log('✅ Avatar canvas inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando avatar canvas:', error);
    }
  }

  // Métodos públicos para controlar la sesión
  async startSession(): Promise<void> {
    try {
      await this.voiceAgentService.startVoiceSession(this.config);
    } catch (error: any) {
      this.errorOccurred.emit(error.message);
    }
  }

  async stopSession(): Promise<void> {
    await this.voiceAgentService.stopVoiceSession();
  }

  // Métodos para controles de navegación de pasos
  goToStep(stepIndex: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.voiceAgentService.goToStep(stepIndex);
  }

  nextStep(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.voiceAgentService.nextStep();
  }

  previousStep(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.voiceAgentService.previousStep();
  }

  // Métodos para interrumpir y enviar mensajes
  interrupt(): void {
    this.voiceAgentService.interrupt();
  }

  sendMessage(message: string): void {
    this.voiceAgentService.sendTextMessage(message);
  }

  // Detectar dispositivos móviles
  private detectMobileDevice(): void {
    this.isMobile = window.innerWidth < 768;
  }

  // Métodos para arrastrar (solo en escritorio)
  startDrag(event: MouseEvent): void {
    if (!this.uiConfig.allowDragging || this.isMobile) return;
    
    this.isDragging = true;
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left;
    this.dragOffsetY = event.clientY - rect.top;
    event.preventDefault();
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    
    const x = event.clientX - this.dragOffsetX;
    const y = event.clientY - this.dragOffsetY;
    this.windowPosition = { x, y };
    event.preventDefault();
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  // Getters para facilitar el uso en el template
  get hasVisualContent(): boolean {
    return this.visualSteps.length > 0;
  }

  get currentStep(): VisualStep | null {
    return this.visualSteps[this.currentStepIndex] || null;
  }

  get isSessionActive(): boolean {
    return this.voiceAgentService.isSessionActive();
  }

  get shouldShowComponent(): boolean {
    // Mostrar el componente si hay una sesión activa, está conectado, escuchando, o si autoStart está activado
    return this.isSessionActive || this.state.isConnected || this.state.isListening || this.autoStart;
  }

  // Método público para forzar la inicialización del avatar
  public forceInitializeAvatar(): void {
    console.log('🔧 Forzando inicialización del avatar...');
    this.initializeAvatar();
  }

  // Limpiar recursos
  private cleanup(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.isSessionActive) {
      this.voiceAgentService.stopVoiceSession();
    }
    
    window.removeEventListener('resize', () => {
      this.detectMobileDevice();
    });
  }
} 