import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { VoiceAgentService, VoiceAgentConfig, VoiceAgentState, VisualStep } from '../../services/voice-agent.service';

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
export class VoiceAgentComponent implements OnInit, OnDestroy, OnChanges {
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

  constructor(private voiceAgentService: VoiceAgentService) {
    this.detectMobileDevice();
    
    // Escuchar cambios de orientación y tamaño de ventana
    window.addEventListener('resize', () => {
      this.detectMobileDevice();
    });
  }

  ngOnInit(): void {
    this.setupSubscriptions();
    
    if (this.autoStart) {
      this.startSession();
    }

    // Cargar pasos de demostración si se proporcionan
    if (this.demoSteps.length > 0) {
      this.voiceAgentService.setVisualSteps(this.demoSteps);
    }
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