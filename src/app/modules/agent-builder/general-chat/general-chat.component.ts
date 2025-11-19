import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AgentService } from '../shared/services/agent.service';
import { WebSocketService } from '../shared/services/websocket.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Agent } from '../shared/models/agent.model';

interface ProcessStep {
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  toolCall?: string;
}

interface ConversationMessage {
  id?: string;
  timestamp?: Date;
  speaker: string;
  department: string;
  message: string;
  type: string;
  isStreaming?: boolean;
  streamingComplete?: boolean;
  metadata?: {
    steps?: ProcessStep[];
    [key: string]: any;
  };
  isProcessExpanded?: boolean;
}

@Component({
  selector: 'app-general-chat',
  templateUrl: './general-chat.component.html',
  styleUrls: ['./general-chat.component.scss']
})
export class GeneralChatComponent implements OnInit, OnDestroy {
  @ViewChild('chatMessages') chatMessagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  // Agents State
  agents: Agent[] = [];
  selectedAgent: Agent | null = null; // null = General Manager
  isLoadingAgents: boolean = false;

  // Mentions State
  showMentionList: boolean = false;
  mentionFilter: string = '';
  filteredAgentsForMention: Agent[] = [];
  mentionCursorIndex: number = -1;

  // Messages state
  messages: ConversationMessage[] = [];
  currentTask: string = '';
  isExecuting: boolean = false;
  orchestratorsInvolved: string[] = [];

  // WebSocket state
  private currentStreamingMessageId: string | null = null;
  private wsSubscriptions: Subscription[] = [];
  isConnected: boolean = false;
  private destroy$ = new Subject<void>();

  // UI state
  showEmptyState: boolean = true;
  sidebarOpen: boolean = true;

  exampleQuestions = [
    '¿Cuánto vendimos en octubre?',
    '¿Qué productos debería impulsar?',
    '¿Cuál es el estado actual del negocio?',
    '¿Quién es mi cliente más importante?',
    '¿Qué productos tienen bajo stock?'
  ];

  constructor(
    private agentService: AgentService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    console.log('[GeneralChat] 🎯 Inicializando Unified Chat Hub');
    this.loadAgents();
  }

  ngOnDestroy(): void {
    console.log('[GeneralChat] 🧹 Destruyendo Unified Chat Hub');
    this.wsSubscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
    if (this.isConnected) {
      this.webSocketService.disconnect();
    }
  }

  /**
   * Cargar lista de agentes disponibles
   */
  loadAgents(): void {
    this.isLoadingAgents = true;
    this.agentService.listAgents().subscribe({
      next: (response) => {
        this.agents = response.agents || [];
        this.isLoadingAgents = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading agents:', error);
        this.isLoadingAgents = false;
        this.notificationService.error('Error', 'No se pudieron cargar los agentes');
      }
    });
  }

  /**
   * Seleccionar un agente (o General Manager si es null)
   */
  selectAgent(agent: Agent | null): void {
    if (this.selectedAgent === agent) return;

    this.selectedAgent = agent;
    this.clearChat(); // Limpiar chat al cambiar de contexto

    // Desconectar sesión anterior si existe
    if (this.isConnected) {
      this.webSocketService.disconnect();
      this.isConnected = false;
    }

    this.cdr.markForCheck();
  }

  /**
   * Manejo de Input para Menciones
   */
  onInput(event: any): void {
    const input = event.target;
    const value = input.value;
    const cursorPosition = input.selectionStart;

    // Detectar '@' antes del cursor
    const lastAtPos = value.lastIndexOf('@', cursorPosition - 1);

    if (lastAtPos !== -1) {
      const textAfterAt = value.substring(lastAtPos + 1, cursorPosition);
      // Si hay espacios, asumimos que no es una mención activa a menos que sea el inicio
      if (!textAfterAt.includes(' ')) {
        this.showMentionList = true;
        this.mentionFilter = textAfterAt.toLowerCase();
        this.mentionCursorIndex = lastAtPos;
        this.filterAgentsForMention();
        return;
      }
    }

    this.showMentionList = false;
  }

  filterAgentsForMention(): void {
    if (!this.mentionFilter) {
      this.filteredAgentsForMention = this.agents;
    } else {
      this.filteredAgentsForMention = this.agents.filter(agent =>
        agent.agentName.toLowerCase().includes(this.mentionFilter) ||
        this.getDepartmentName(agent.department).toLowerCase().includes(this.mentionFilter)
      );
    }
  }

  selectMention(agent: Agent): void {
    if (this.mentionCursorIndex === -1) return;

    const currentValue = this.currentTask;
    const beforeAt = currentValue.substring(0, this.mentionCursorIndex);
    // Encontrar donde termina la palabra actual siendo escrita
    const nextSpaceIndex = currentValue.indexOf(' ', this.mentionCursorIndex);
    const afterMention = nextSpaceIndex !== -1 ? currentValue.substring(nextSpaceIndex) : '';

    // Insertar el nombre del agente formateado
    // Podríamos usar un formato especial si el backend lo soporta, por ahora solo el nombre
    const mentionText = `@${agent.agentName} `;

    this.currentTask = beforeAt + mentionText + afterMention;
    this.showMentionList = false;

    // Enfocar de nuevo y poner el cursor al final de la mención
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
        const newCursorPos = beforeAt.length + mentionText.length;
        this.messageInput.nativeElement.setSelectionRange(newCursorPos, newCursorPos);
      }
    });
  }

  /**
   * Ejecuta la consulta del usuario
   */
  executeTask(): void {
    if (!this.currentTask.trim()) {
      this.notificationService.error('Validación', 'Por favor ingresa una consulta');
      return;
    }

    this.showEmptyState = false;
    this.showMentionList = false; // Asegurar que se cierre

    // Add user message
    this.addMessage({
      id: this.generateId(),
      timestamp: new Date(),
      speaker: 'Tú',
      department: 'user',
      message: this.currentTask,
      type: 'user'
    });

    // Setup streaming ID
    this.currentStreamingMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine speaker info
    const speakerName = this.selectedAgent ? this.selectedAgent.agentName : 'General Manager';
    const department = this.selectedAgent ? this.selectedAgent.department : 'general';

    // Add response placeholder
    this.addMessage({
      id: this.currentStreamingMessageId,
      timestamp: new Date(),
      speaker: speakerName,
      department: department,
      message: '',
      type: 'agent',
      isStreaming: true,
      streamingComplete: false
    });

    this.isExecuting = true;
    const taskToExecute = this.currentTask;
    this.currentTask = '';
    this.cdr.markForCheck();
    this.scrollToBottom();

    // Connect and send
    this.connectAndSend(taskToExecute);
  }

  /**
   * Conectar WebSocket y enviar mensaje
   */
  private connectAndSend(message: string): void {
    const userData = this.getUserData();
    const userId = userData.uid || 'anonymous';
    const companyId = userData.company || 'unknown';

    // Determine agentId for connection
    // If selectedAgent is null, use 'general_manager'
    // If selectedAgent is set, use its ID
    const targetAgentId = this.selectedAgent ? this.selectedAgent.id : 'general_manager';

    console.log(`[GeneralChat] 🔗 Conectando WebSocket para: ${targetAgentId}`);

    // Si ya estamos conectados al agente correcto, enviar directo
    if (this.isConnected && this.webSocketService.getCurrentAgentId() === targetAgentId) {
      this.sendMessage(message, userId, companyId, targetAgentId);
      return;
    }

    // Si no, conectar primero
    this.webSocketService.connect(userId, companyId, targetAgentId);

    // Suscribirse al estado de conexión (solo una vez)
    if (this.wsSubscriptions.length === 0) {
      const connectionSub = this.webSocketService.getConnectionStatus()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (status) => {
            this.isConnected = status.connected;
            if (status.connected && this.isExecuting && this.currentStreamingMessageId) {
              // Setup streaming subs if not already done
              this.setupWebSocketSubscriptions();
              // Send the pending message
              this.sendMessage(message, userId, companyId, targetAgentId || 'general_manager');
            }
          },
          error: (error) => {
            console.error('[GeneralChat] ❌ Connection error:', error);
            this.handleExecutionError('Error de conexión WebSocket');
          }
        });
      this.wsSubscriptions.push(connectionSub);
    }
  }

  private sendMessage(message: string, userId: string, companyId: string, agentId: string): void {
    this.webSocketService.sendMessage(
      message,
      this.currentStreamingMessageId!, // Conversation ID same as message ID for simplicity in this context
      {
        company: companyId,
        userId: userId,
        isGeneralManager: !this.selectedAgent,
        agentId: agentId
      },
      this.currentStreamingMessageId!
    );
  }

  private setupWebSocketSubscriptions(): void {
    // Evitar duplicar suscripciones
    if (this.wsSubscriptions.length > 1) return;

    // Chunk subscription
    const chunkSub = this.webSocketService.getStreamChunks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunkData) => {
          if (this.currentStreamingMessageId === chunkData.messageId) {
            const messageIndex = this.messages.findIndex(m => m.id === chunkData.messageId);
            if (messageIndex !== -1) {
              this.messages[messageIndex].message += chunkData.chunk;
              this.cdr.markForCheck();
              this.scrollToBottom();
            }
          }
        }
      });

    // Complete subscription
    const completeSub = this.webSocketService.getStreamComplete()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (completeData) => {
          if (this.currentStreamingMessageId === completeData.messageId) {
            const messageIndex = this.messages.findIndex(m => m.id === completeData.messageId);
            if (messageIndex !== -1) {
              this.messages[messageIndex].message = completeData.fullMessage;
              this.messages[messageIndex].streamingComplete = true;
              this.messages[messageIndex].isStreaming = false;

              if (completeData.metadata?.orchestratorsInvolved) {
                this.orchestratorsInvolved = completeData.metadata.orchestratorsInvolved;
              }
            }
            this.currentStreamingMessageId = null;
            this.isExecuting = false;
            this.notificationService.success('Éxito', 'Respuesta completada');
            this.cdr.markForCheck();
            this.scrollToBottom();
          }
        }
      });

    // Error subscription
    const errorSub = this.webSocketService.getStreamErrors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (errorData) => {
          if (this.currentStreamingMessageId === errorData.messageId) {
            this.handleExecutionError(errorData.error);
          }
        }
      });

    // Agent Response subscription (Sub-agentes)
    const agentResponseSub = this.webSocketService.getAgentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Agregar mensaje del sub-agente al chat
          this.addMessage({
            id: response.id || this.generateId(),
            timestamp: new Date(response.timestamp),
            speaker: response.speaker,
            department: response.department,
            message: response.message,
            type: 'agent', // Lo mostramos como un mensaje de agente normal
            isStreaming: false,
            streamingComplete: true
          });
          this.scrollToBottom();
        }
      });

    this.wsSubscriptions.push(chunkSub, completeSub, errorSub, agentResponseSub);
  }

  private handleExecutionError(errorMessage: string): void {
    const messageIndex = this.messages.findIndex(m => m.id === this.currentStreamingMessageId);
    if (messageIndex !== -1) {
      this.messages[messageIndex].message = `❌ Error: ${errorMessage}`;
      this.messages[messageIndex].isStreaming = false;
      this.messages[messageIndex].streamingComplete = true;
      this.messages[messageIndex].type = 'error';
    }
    this.currentStreamingMessageId = null;
    this.isExecuting = false;
    this.notificationService.error('Error', errorMessage);
    this.cdr.markForCheck();
  }

  private addMessage(message: ConversationMessage): void {
    this.messages.push(message);
    this.cdr.markForCheck();
  }

  clearChat(): void {
    this.messages = [];
    this.orchestratorsInvolved = [];
    this.showEmptyState = true;
    this.cdr.markForCheck();
  }

  useExampleQuestion(question: string): void {
    this.currentTask = question;
    this.executeTask();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesContainer) {
        const element = this.chatMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 50);
  }

  private getUserData(): any {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : {};
    } catch (error) {
      return {};
    }
  }

  // Helpers for UI
  getDepartmentName(department: string): string {
    const names: { [key: string]: string } = {
      'sales': 'Ventas',
      'inventory': 'Inventario',
      'logistics': 'Logística',
      'general': 'General Manager',
      'user': 'Tú'
    };
    return names[department] || department;
  }

  getDepartmentIcon(department: string): string {
    const icons: { [key: string]: string } = {
      'sales': 'pi-shopping-cart',
      'inventory': 'pi-box',
      'logistics': 'pi-truck',
      'general': 'pi-users',
      'user': 'pi-user'
    };
    return icons[department] || 'pi-info-circle';
  }

  getDepartmentColor(department: string): string {
    const colors: { [key: string]: string } = {
      'sales': '#f093fb',
      'inventory': '#43e97b',
      'logistics': '#4facfe',
      'general': '#667eea',
      'user': '#9c27b0'
    };
    return colors[department] || '#999';
  }

  getThemeColor(): string {
    if (this.selectedAgent) {
      return this.getDepartmentColor(this.selectedAgent.department);
    }
    return '#1a73e8'; // Default Google Blue for General Manager
  }
}
