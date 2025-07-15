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
    agentName: 'K.A.I.',
    instructions: 'Eres un asistente virtual inteligente de Katuq. Ayudas a los usuarios con ventas, inventarios y gestión empresarial.'
  };

  // Pasos de demostración para ventas
  public demoSteps: VisualStep[] = [
    {
      imageUrl: 'assets/images/ventas/paso1-catalogo.png',
      caption: '1. Catálogo: Selecciona una ubicación de destino y elige los productos del catálogo'
    },
    {
      imageUrl: 'assets/images/ventas/paso2-carrito.png',
      caption: '2. Carrito y Notas: Revisa tus productos seleccionados y agrega notas al pedido'
    },
    {
      imageUrl: 'assets/images/ventas/paso3-cliente.png',
      caption: '3. Datos Cliente: Busca un cliente existente o crea uno nuevo con sus datos completos'
    },
    {
      imageUrl: 'assets/images/ventas/paso4-facturacion.png',
      caption: '4. Datos de Facturación: Completa la información para la facturación electrónica'
    },
    {
      imageUrl: 'assets/images/ventas/paso5-entrega.png',
      caption: '5. Datos de Entrega: Define la dirección y detalles para la entrega del pedido'
    },
    {
      imageUrl: 'assets/images/ventas/paso6-pago.png',
      caption: '6. Resumen y Pago: Revisa el pedido completo y procede al pago'
    },
    {
      imageUrl: 'assets/images/ventas/paso7-confirmacion.png',
      caption: '7. Confirmación: ¡Venta completada exitosamente!'
    }
  ];

  useModelBig: any;
  isLoggedIn = false;
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

    if (this.chatFormVisible) {
      // Si el chat está abierto, lo minimizamos en lugar de mostrar opciones
      this.minimizeChat(event);
      return;
    }

    this.optionsPanelVisible = !this.optionsPanelVisible;

    if (!this.optionsPanelVisible) {
      // Si cerramos el panel de opciones, cerramos todo
      this.closeEverything(event || null);
    }
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
      // Cargar pasos de demostración
      this.voiceAgentService.setVisualSteps(this.demoSteps);
      
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
