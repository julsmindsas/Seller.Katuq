import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-floating-button',
  templateUrl: './floating-button.component.html',
  styleUrls: ['./floating-button.component.scss']
})
export class FloatingButtonComponent implements OnInit {
  public chatFormVisible: boolean = false;
  public chatMinimized: boolean = false;
  public hasUnreadMessages: boolean = false;
  public position = { bottom: 20, right: 20 };

  // Panel de opciones
  public optionsPanelVisible: boolean = false;
  public selectedMode: string = 'chat'; // Valores posibles: 'chat', 'voice', 'help', 'feedback'
  public isListening: boolean = false; // Estado para el modo de voz

  // WebSocket para el modo de voz
  private voiceSocket: WebSocket | null = null;

  // Guardar el último estado de la conversación
  private conversationState: any = null;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef
  ) { }

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

  startVoiceMode(event: MouseEvent) {
    event.stopPropagation();
    this.isListening = true;

    // Iniciar conexión WebSocket para voz
    try {
      this.voiceSocket = new WebSocket(environment.voiceWsUrl);

      this.voiceSocket.onopen = () => {
        console.log('Voice WebSocket connection established');
        // Aquí podríamos enviar un mensaje inicial o configuración
      };

      this.voiceSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Voice message received:', data);
        // Procesar respuesta de voz
      };

      this.voiceSocket.onerror = (error) => {
        console.error('Voice WebSocket error:', error);
        this.stopVoiceMode(null);
      };

      this.voiceSocket.onclose = () => {
        console.log('Voice WebSocket connection closed');
        this.isListening = false;
      };
    } catch (error) {
      console.error('Failed to connect to voice service:', error);
      this.isListening = false;
    }

    this.saveState();
  }

  stopVoiceMode(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    this.isListening = false;

    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
    }

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
    // No cerramos el chat, solo lo minimizamos
    this.saveState();
  }

  maximizeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveState();
  }

  closeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.conversationState = null;
    this.saveState();
  }

  closeEverything(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    this.optionsPanelVisible = false;
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.isListening = false;

    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
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
}
