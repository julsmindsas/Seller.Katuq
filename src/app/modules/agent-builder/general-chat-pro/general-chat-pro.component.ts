import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatProService } from '../shared/services/chat-pro.service';
import {
  ChatProMessage,
  ChatProEventType,
  AGENT_UI_CONFIG
} from '../shared/models/chat-pro.model';

/**
 * General Chat Pro Component
 *
 * Experiencia de chat multi-agente estilo "grupo de WhatsApp" donde
 * los agentes hablan visiblemente, se mencionan entre si, y el usuario
 * puede ver todo el flujo de trabajo.
 */
@Component({
  selector: 'app-general-chat-pro',
  templateUrl: './general-chat-pro.component.html',
  styleUrls: ['./general-chat-pro.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralChatProComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // Estado del chat
  messages: ChatProMessage[] = [];
  userInput = '';
  isExecuting = false;
  isConnected = false;
  errorMessage = '';

  // Configuracion
  company = 'ALMARA FELICIDAD'; // TODO: Obtener de servicio de empresa
  activeAgents = new Set<string>();

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private chatProService: ChatProService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatProService.disconnect();
  }

  /**
   * Configura las suscripciones a los observables del servicio
   */
  private setupSubscriptions(): void {
    // Mensajes entrantes
    this.chatProService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleIncomingMessage(message);
      });

    // Estado de conexion
    this.chatProService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => {
        this.isConnected = connected;
        this.cdr.markForCheck();
      });

    // Estado de ejecucion
    this.chatProService.executing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(executing => {
        this.isExecuting = executing;
        this.cdr.markForCheck();
      });

    // Errores
    this.chatProService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.errorMessage = error;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.errorMessage = '';
          this.cdr.markForCheck();
        }, 5000);
      });
  }

  /**
   * Procesa un mensaje entrante del servicio
   */
  private handleIncomingMessage(message: ChatProMessage): void {
    // Agregar agente activo
    if (message.speaker.agent_id) {
      this.activeAgents.add(message.speaker.agent_id);
    }

    // Agregar mensaje a la lista
    this.messages.push(message);

    this.cdr.markForCheck();
    this.scrollToBottom();
  }

  /**
   * Envia un mensaje al chat
   */
  sendMessage(): void {
    const query = this.userInput.trim();
    if (!query || this.isExecuting) return;

    // Limpiar input
    this.userInput = '';
    this.errorMessage = '';

    // Limpiar agentes activos de la sesion anterior
    this.activeAgents.clear();

    // Enviar al servicio
    this.chatProService.sendMessage(this.company, query);

    // Focus en el input
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 100);
  }

  /**
   * Maneja la tecla Enter en el input
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Scroll al final del contenedor de mensajes
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 50);
  }

  /**
   * Limpia el historial de chat
   */
  clearChat(): void {
    this.messages = [];
    this.activeAgents.clear();
    this.cdr.markForCheck();
  }

  /**
   * Verifica si un mensaje es del usuario
   */
  isUserMessage(message: ChatProMessage): boolean {
    return message.speaker.type === 'user' || message.eventType === 'user_message';
  }

  /**
   * Verifica si es un mensaje de sistema/herramienta
   */
  isSystemMessage(message: ChatProMessage): boolean {
    return message.eventType === 'tool_call' || message.eventType === 'tool_result';
  }

  /**
   * Obtiene el icono para un tipo de evento
   */
  getEventIcon(eventType: ChatProEventType): string {
    const icons: Record<ChatProEventType, string> = {
      user_message: 'pi-user',
      agent_joined: 'pi-sign-in',
      agent_thinking: 'pi-spinner pi-spin',
      tool_call: 'pi-cog',
      tool_result: 'pi-check-circle',
      agent_message: 'pi-comment',
      delegation: 'pi-share-alt',
      vote: 'pi-thumbs-up',
      negotiation_round: 'pi-sync',
      consensus_reached: 'pi-check-square',
      final_response: 'pi-flag',
      error: 'pi-exclamation-triangle'
    };
    return icons[eventType] || 'pi-circle';
  }

  /**
   * Obtiene la etiqueta legible para un tipo de evento
   */
  getEventLabel(eventType: ChatProEventType): string {
    const labels: Record<ChatProEventType, string> = {
      user_message: 'Usuario',
      agent_joined: 'Conectado',
      agent_thinking: 'Pensando',
      tool_call: 'Herramienta',
      tool_result: 'Resultado',
      agent_message: 'Mensaje',
      delegation: 'Delegacion',
      vote: 'Voto',
      negotiation_round: 'Negociacion',
      consensus_reached: 'Consenso',
      final_response: 'Respuesta',
      error: 'Error'
    };
    return labels[eventType] || eventType;
  }

  /**
   * Obtiene la clase CSS para el tipo de mensaje
   */
  getMessageClass(message: ChatProMessage): string {
    const classes: string[] = ['chat-message'];

    if (this.isUserMessage(message)) {
      classes.push('user-message');
    } else {
      classes.push('agent-message');
    }

    if (this.isSystemMessage(message)) {
      classes.push('system-message');
    }

    if (message.eventType === 'final_response') {
      classes.push('final-message');
    }

    if (message.eventType === 'delegation') {
      classes.push('delegation-message');
    }

    if (message.eventType === 'error') {
      classes.push('error-message');
    }

    return classes.join(' ');
  }

  /**
   * Formatea el contenido del mensaje con @mentions resaltados
   */
  formatMessageContent(content: string): string {
    if (!content) return '';

    // Resaltar @mentions
    return content.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  }

  /**
   * Obtiene los agentes activos como array
   */
  getActiveAgentsArray(): string[] {
    return Array.from(this.activeAgents).map(agentId => {
      const config = AGENT_UI_CONFIG[agentId];
      return config?.display_name || agentId;
    });
  }

  /**
   * Toggle expandir/colapsar detalles de herramienta
   */
  toggleToolDetails(message: ChatProMessage): void {
    message.isExpanded = !message.isExpanded;
    this.cdr.markForCheck();
  }

  /**
   * Formatea JSON para mostrar
   */
  formatJson(obj: any): string {
    if (!obj) return '';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  /**
   * Formatea tiempo de ejecucion
   */
  formatExecutionTime(ms: number | undefined): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * TrackBy para ngFor de mensajes
   */
  trackByMessageId(index: number, message: ChatProMessage): string {
    return message.id;
  }
}
