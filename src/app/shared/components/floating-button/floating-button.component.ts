import { Component, HostListener, ElementRef, OnInit, OnDestroy, NgZone, Inject } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
// Importar el nuevo servicio de agente de voz
import { VoiceAgentService, VoiceAgentConfig, VisualStep } from '../../services/voice-agent.service';
import { ToolAdapter, TOOL_ADAPTER } from '../../services/tools/tool-adapter';

@Component({
  selector: 'app-floating-button',
  templateUrl: './floating-button.component.html',
  styleUrls: ['./floating-button.component.scss']
})
export class FloatingButtonComponent implements OnInit, OnDestroy {
  // Propiedades existentes
  public chatFormVisible: boolean = false;
  public chatMinimized: boolean = false;
  public hasUnreadMessages: boolean = false;
  public position = { bottom: 20, right: 20 };
  public optionsPanelVisible: boolean = false;
  public selectedMode: string = 'chat';
  private conversationState: any = null;

  // Propiedades simplificadas para el agente de voz
  public isListening: boolean = false;

  // Propiedades para los pasos visuales (mantenidas para compatibilidad)
  public hasVisualContent: boolean = false;
  public visualSteps: VisualStep[] = [];
  public currentStepIndex: number = 0;
  public currentStepText: string = '';

  // Configuración del agente de voz
  public voiceAgentConfig: VoiceAgentConfig = {
    agentName: 'K.A.I.'
  };

  public useModelBig: any;
  public isLoggedIn = false;
  public chatMaximized: boolean = false;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private httpClient: HttpClient,
    private ngZone: NgZone,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    @Inject(TOOL_ADAPTER) private toolAdapter: ToolAdapter,
    private voiceAgentService: VoiceAgentService
  ) {
    this.useModelBig = environment.useModelBig;

    // Verificamos si el usuario está autenticado correctamente
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.company) {
          this.isLoggedIn = true;
        }
      } catch (err) {
        console.error('Error al parsear user desde localStorage:', err);
        this.isLoggedIn = this.authService.isLoggedIn;
      }
    } else {
      this.isLoggedIn = this.authService.isLoggedIn;
    }
  }

  ngOnInit() {
    // Recuperar estado guardado si existe
    const savedState = sessionStorage.getItem('kaiAssistantState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        this.chatMinimized = parsedState.minimized || false;
        this.hasUnreadMessages = parsedState.hasUnread || false;
        this.conversationState = parsedState.conversation || null;
        this.selectedMode = parsedState.mode || 'chat';

        // Si había una conversación en curso, mostrar el chat como minimizado
        if (this.conversationState && Object.keys(this.conversationState).length > 0) {
          this.chatFormVisible = true;
          this.chatMinimized = true;
        }
      } catch (e) {
        console.error("Error parsing saved assistant state:", e);
      }
    }

    const user: any = localStorage.getItem('user');
    if (user?.company) {
      this.isLoggedIn = true;
    }
    else {
      this.isLoggedIn = false;
    }

    // Verificar nuevamente si existe sesión activa para habilitar el chat
    const userStrInit = localStorage.getItem('user');
    if (userStrInit) {
      try {
        const parsedUser = JSON.parse(userStrInit);
        if (parsedUser && parsedUser.company) {
          this.isLoggedIn = true;
        }
      } catch (err) {
        console.error('Error al parsear user en ngOnInit:', err);
        this.isLoggedIn = this.authService.isLoggedIn;
      }
    } else {
      this.isLoggedIn = this.authService.isLoggedIn;
    }

    // Suscribirse a eventos del agente de voz
    this.setupVoiceAgentSubscriptions();
  }

  // Configurar suscripciones al agente de voz
  private setupVoiceAgentSubscriptions(): void {
    this.voiceAgentService.state$.subscribe(state => {
      this.isListening = state.isListening;
      this.currentStepText = state.currentText;
    });

    this.voiceAgentService.visualSteps$.subscribe(steps => {
      this.visualSteps = steps;
      this.hasVisualContent = steps.length > 0;
    });

    this.voiceAgentService.currentStepIndex$.subscribe(index => {
      this.currentStepIndex = index;
    });
  }

  toggleOptionsPanel(event?: MouseEvent) {
    if (event) event.stopPropagation();
    console.log('🔄 Toggle options panel clicked');

    // Simplemente alternar el panel de opciones
    this.optionsPanelVisible = !this.optionsPanelVisible;
    
    // Si cerramos el panel, cerrar también el chat si está abierto
    if (!this.optionsPanelVisible && this.chatFormVisible) {
      this.chatFormVisible = false;
      this.chatMinimized = false;
    }

    this.saveState();
  }

  selectMode(mode: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedMode = mode;
    this.optionsPanelVisible = false;

    switch (mode) {
      case 'chat':
        this.openChat(event);
        break;
      case 'voice':
        this.startVoiceMode(event);
        break;
      case 'live-audio':
        this.startLiveAudioMode(event);
        break;
      case 'help':
        this.openHelpGuide(event);
        break;
      case 'feedback':
        this.openFeedbackForm(event);
        break;
    }

    this.saveState();
  }

  openChat(event: MouseEvent) {
    event.stopPropagation();
    this.chatFormVisible = true;
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveState();
  }

  // Método simplificado para iniciar el modo de voz usando el servicio
  async startVoiceMode(event: MouseEvent) {
    event.stopPropagation();
    console.log('🎤 Iniciando modo de voz con nuevo servicio');
    
    try {
      // Iniciar sesión de voz
      await this.voiceAgentService.startVoiceSession(this.voiceAgentConfig);
      
    } catch (error: any) {
      console.error('Error al iniciar la sesión de voz:', error);
    }

    this.saveState();
  }

  // Método simplificado para detener el modo de voz
  stopVoiceMode(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    console.log('🛑 Deteniendo modo de voz');
    
    this.voiceAgentService.stopVoiceSession();
    this.saveState();
  }

  // Método para iniciar el modo live-audio
  startLiveAudioMode(event: MouseEvent) {
    event.stopPropagation();
    console.log('🎵 Iniciando modo Live Audio en pantalla completa');
    
    // Cerrar otros paneles
    this.optionsPanelVisible = false;
    this.chatFormVisible = false;
    this.chatMinimized = false;
    
    // Navegar a la ruta de live-audio en pantalla completa
    this.router.navigate(['/live-audio']);
    
    this.saveState();
  }

  private openLiveAudioFullscreen() {
    // Crear un contenedor de pantalla completa
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.id = 'live-audio-fullscreen';
    fullscreenContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: 'Arial', sans-serif;
    `;

    // Agregar contenido del live audio
    fullscreenContainer.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
      ">
        <!-- Header con título y botón de cerrar -->
        <div style="
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10000;
        ">
          <h1 style="
            margin: 0;
            font-size: 2rem;
            font-weight: 300;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(255,255,255,0.3);
          ">🎤 Live Audio - Katuq Assistant</h1>
          <button id="close-live-audio" style="
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          ">✕ Cerrar</button>
        </div>

        <!-- Contenedor principal para el live audio -->
        <div id="live-audio-content" style="
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px 20px 20px;
        ">
          <!-- Contenedor para el componente live-audio -->
          <div id="live-audio-component-container" style="
            width: 100%;
            max-width: 800px;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
          ">
            <div style="
              font-size: 1.5rem;
              margin-bottom: 20px;
              text-align: center;
              color: #ffffff;
            ">
              🎵 Live Audio Iniciado
            </div>
            <div style="
              width: 200px;
              height: 200px;
              border-radius: 50%;
              background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              animation: pulse 2s infinite;
              margin-bottom: 20px;
            ">
              <i class="fa fa-microphone" style="font-size: 3rem; color: white;"></i>
            </div>
            <div style="
              font-size: 1rem;
              text-align: center;
              color: rgba(255,255,255,0.8);
              max-width: 400px;
            ">
              Habla con Katuq Assistant usando tu micrófono para interactuar con las herramientas de ventas
            </div>
            <div style="
              margin-top: 20px;
              padding: 15px;
              background: rgba(255,255,255,0.1);
              border-radius: 10px;
              border: 1px solid rgba(255,255,255,0.2);
            ">
              <div style="font-size: 0.9rem; margin-bottom: 10px; color: #ffffff;">
                <strong>Comandos disponibles:</strong>
              </div>
              <div style="font-size: 0.8rem; color: rgba(255,255,255,0.8); line-height: 1.4;">
                • "Buscar productos" - Buscar en el catálogo<br>
                • "Agregar al carrito" - Añadir productos<br>
                • "Ver carrito" - Mostrar contenido del carrito<br>
                • "Buscar cliente" - Buscar o crear clientes<br>
                • "Configurar facturación" - Configurar datos de facturación<br>
                • "Configurar envío" - Configurar opciones de envío<br>
                • "Procesar venta" - Finalizar la venta
              </div>
            </div>
          </div>
        </div>

        <!-- Footer con instrucciones -->
        <div style="
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          text-align: center;
          color: rgba(255,255,255,0.7);
          font-size: 0.9rem;
        ">
          💡 Di "ayuda" para ver todas las herramientas disponibles
        </div>
      </div>

      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      </style>
    `;

    // Agregar al DOM
    document.body.appendChild(fullscreenContainer);

    // Agregar evento para cerrar
    const closeButton = document.getElementById('close-live-audio');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeLiveAudioFullscreen();
      });
    }

    // Agregar evento para cerrar con Escape
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.closeLiveAudioFullscreen();
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Guardar referencia para poder cerrar después
    (fullscreenContainer as any).handleEscape = handleEscape;
  }

  private closeLiveAudioFullscreen() {
    const fullscreenContainer = document.getElementById('live-audio-fullscreen');
    if (fullscreenContainer) {
      // Remover evento de Escape
      const handleEscape = (fullscreenContainer as any).handleEscape;
      if (handleEscape) {
        document.removeEventListener('keydown', handleEscape);
      }
      
      // Remover el contenedor
      document.body.removeChild(fullscreenContainer);
      
      // Resetear modo
      this.selectedMode = 'chat';
      this.saveState();
    }
  }

  // Método para detener el modo live-audio
  stopLiveAudioMode(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    console.log('🛑 Deteniendo modo Live Audio');
    
    this.selectedMode = 'chat'; // Volver al modo por defecto
    this.saveState();
  }

  openHelpGuide(event: MouseEvent) {
    // Aquí implementar la lógica para mostrar una guía de ayuda
    this.chatFormVisible = true;
    this.chatMinimized = false;
    // Podríamos enviar un comando especial al chat para mostrar ayuda
    this.saveState();
  }

  openFeedbackForm(event: MouseEvent) {
    // Aquí implementar la lógica para mostrar un formulario de feedback
    this.chatFormVisible = true;
    this.chatMinimized = false;
    // Podríamos enviar un comando especial al chat para mostrar formulario
    this.saveState();
  }

  toggleChatForm(event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (this.chatMinimized) {
      // Si está minimizado, solo maximizar
      this.chatMinimized = false;
      this.hasUnreadMessages = false;
    } else {
      // Si no está minimizado, mostrar/ocultar
      this.chatFormVisible = !this.chatFormVisible;
      if (this.chatFormVisible) {
        this.chatMinimized = false;
      }
    }

    // Actualizar estado
    this.saveState();
  }

  minimizeChat(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatMinimized = true;
    // Cerrar completamente el cuadro al minimizar
    this.chatFormVisible = false;
    this.optionsPanelVisible = false;
    this.chatMaximized = false;
    this.saveState();
  }

  maximizeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    // Restaurar y mostrar el chat al maximizar
    this.chatFormVisible = true;
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveState();
  }

  closeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.chatMaximized = false;
    this.conversationState = null;
    this.saveState();
  }

  closeEverything(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    this.optionsPanelVisible = false;
    this.chatFormVisible = false;
    this.chatMinimized = false;

    // Detener sesión de voz si está activa
    if (this.voiceAgentService.isSessionActive()) {
      this.voiceAgentService.stopVoiceSession();
    }

    // Resetear modo si es live-audio
    if (this.selectedMode === 'live-audio') {
      this.selectedMode = 'chat';
    }

    this.saveState();
  }

  // Método para llamar cuando se recibe un nuevo mensaje y el chat está minimizado
  onNewMessage(message: any) {
    if (this.chatMinimized) {
      this.hasUnreadMessages = true;
      this.saveState();
    }
  }

  // Método para guardar la conversación actual
  saveConversation(conversation: any) {
    this.conversationState = conversation;
    this.saveState();
  }

  private saveState() {
    const state = {
      minimized: this.chatMinimized,
      hasUnread: this.hasUnreadMessages,
      conversation: this.conversationState,
      mode: this.selectedMode
    };
    sessionStorage.setItem('kaiAssistantState', JSON.stringify(state));
  }

  // Métodos para compatibilidad con el template existente
  goToStep(stepIndex: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.voiceAgentService.goToStep(stepIndex);
  }

  previousStep(event: MouseEvent) {
    event.stopPropagation();
    this.voiceAgentService.previousStep();
  }

  nextStep(event: MouseEvent) {
    event.stopPropagation();
    this.voiceAgentService.nextStep();
  }

  // Método público para navegación desde el template
  public navigateTo(route: string, event: MouseEvent): void {
    event.stopPropagation();
    this.router.navigate([route]);
    this.optionsPanelVisible = false;
    this.saveState();
  }

  // Método para manejar errores del agente de voz
  public onVoiceError(error: string): void {
    console.error('Error del agente de voz:', error);
    // Aquí podrías mostrar una notificación al usuario o manejar el error de otra manera
  }

  toggleChatSize(event: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.chatFormVisible && !this.chatMinimized) {
      this.chatMaximized = !this.chatMaximized;
    }
  }

  ngOnDestroy(): void {
    // Detener sesión de voz si está activa
    if (this.voiceAgentService.isSessionActive()) {
      this.voiceAgentService.stopVoiceSession();
    }
  }
}
