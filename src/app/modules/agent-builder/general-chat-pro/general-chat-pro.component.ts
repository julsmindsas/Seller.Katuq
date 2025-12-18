import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostBinding,
  ViewEncapsulation
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatProService } from '../shared/services/chat-pro.service';
import { LayoutService } from '../../../shared/services/layout.service';
import {
  ChatProMessage,
  ChatProEventType,
  ChatProSpeaker,
  AGENT_UI_CONFIG,
  getActivityMessage,
  getDelegationMessage,
  formatCurrency,
  formatNumber,
  formatPercent,
  ChatSession,
  SessionHistory
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None // Necesario para estilos en innerHTML
})
export class GeneralChatProComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  // Theme binding - aplica la clase del tema al host
  @HostBinding('class')
  get themeClass(): string {
    return this.layoutService.config.settings.layout_version || 'light-only';
  }

  // Estado del chat
  messages: ChatProMessage[] = [];
  userInput = '';
  isExecuting = false;
  isConnected = false;
  errorMessage = '';

  // Configuracion
  company = '';
  activeAgents = new Set<string>();

  // Sprint 1.4: Agentes escribiendo (typing indicators)
  typingAgents: ChatProSpeaker[] = [];

  // Session management
  sessions: ChatSession[] = [];
  currentSessionId: string | null = null;
  showSessionPanel = false;
  isLoadingSessions = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private chatProService: ChatProService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    this.loadCompany();
    this.setupSubscriptions();

    // Cargar sesiones si hay empresa
    if (this.company) {
      this.loadSessions();
    }
  }

  /**
   * Carga la empresa actual desde localStorage
   */
  private loadCompany(): void {
    try {
      const currentCompany = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      this.company = currentCompany.nomComercial || '';

      if (!this.company) {
        console.warn('[GeneralChatPro] No se encontró empresa en localStorage');
      } else {
        console.log('[GeneralChatPro] Empresa cargada:', this.company);
      }
    } catch (error) {
      console.error('[GeneralChatPro] Error al cargar empresa:', error);
      this.company = '';
    }
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

    // agent_thinking: solo typing indicator, no mostrar mensaje
    if (message.eventType === 'agent_thinking') {
      this.addTypingAgent(message.speaker);
      this.cdr.markForCheck();
      return; // No agregar a messages
    }

    // tool_call: solo typing indicator
    if (message.eventType === 'tool_call') {
      this.addTypingAgent(message.speaker);
      this.cdr.markForCheck();
      return; // No agregar a messages
    }

    // tool_result: ignorar, no mostrar
    if (message.eventType === 'tool_result') {
      this.cdr.markForCheck();
      return; // No agregar a messages
    }

    if (message.eventType === 'agent_joined') {
      this.addTypingAgent(message.speaker);
    } else if (message.eventType === 'agent_message' ||
               message.eventType === 'final_response') {
      // Remover agente de typing cuando envía mensaje real
      this.removeTypingAgent(message.speaker);
    }

    // Limpiar todos los typing al recibir final_response
    if (message.eventType === 'final_response') {
      this.clearTypingAgents();
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
    this.clearTypingAgents();
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
   * Formatea el contenido del mensaje con Markdown y @mentions
   * Basado en el parser de general-chat
   */
  formatMessageContent(content: string): SafeHtml {
    if (!content) return '';

    // 1. Escape HTML para prevenir inyección
    let parsed = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 2. Code blocks (```code```)
    parsed = parsed.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // 3. Inline code (`code`)
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Bold (**text**)
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Italic (*text*)
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 6. Headers (## text)
    parsed = parsed.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    parsed = parsed.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // 7. Bullet points (- item or * item)
    parsed = parsed.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    // Wrap consecutive <li> in <ul>
    parsed = parsed.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 8. Mentions (@Name)
    parsed = parsed.replace(/@([\w\s]+?)(?=\s|$|[.,;:])/g,
      '<span class="mention">@$1</span>'
    );

    // 9. Newlines to <br> (pero no dentro de <pre>)
    const parts = parsed.split(/(<pre>[\s\S]*?<\/pre>)/g);
    parsed = parts.map(part => {
      if (part.startsWith('<pre>')) return part;
      return part.replace(/\n/g, '<br>');
    }).join('');

    return this.sanitizer.bypassSecurityTrustHtml(parsed);
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

  // ============================================
  // Sprint 1.3: Message Grouping
  // ============================================

  /**
   * Verifica si el mensaje actual es parte de un grupo
   * (mismo speaker que el mensaje anterior y no es primer mensaje)
   */
  isGroupedMessage(index: number): boolean {
    if (index === 0) return false;

    const currentMsg = this.messages[index];
    const prevMsg = this.messages[index - 1];

    // No agrupar mensajes de usuario
    if (this.isUserMessage(currentMsg)) return false;

    // No agrupar si el anterior es de usuario
    if (this.isUserMessage(prevMsg)) return false;

    // Agrupar si es el mismo speaker
    return currentMsg.speaker.agent_id === prevMsg.speaker.agent_id ||
           currentMsg.speaker.name === prevMsg.speaker.name;
  }

  /**
   * Verifica si es el ultimo mensaje de un grupo
   */
  isGroupEnd(index: number): boolean {
    // Es el ultimo mensaje
    if (index === this.messages.length - 1) return true;

    const currentMsg = this.messages[index];
    const nextMsg = this.messages[index + 1];

    // Si el siguiente es de usuario, termina el grupo
    if (this.isUserMessage(nextMsg)) return true;

    // Si el siguiente es de diferente speaker, termina el grupo
    return currentMsg.speaker.agent_id !== nextMsg.speaker.agent_id &&
           currentMsg.speaker.name !== nextMsg.speaker.name;
  }

  // ============================================
  // Sprint 4: Vote Grouping
  // ============================================

  /**
   * Verifica si es el primer voto de una secuencia de votos
   */
  isFirstVote(index: number): boolean {
    const currentMsg = this.messages[index];
    if (currentMsg.eventType !== 'vote') return false;

    // Es el primer mensaje o el anterior no es voto
    if (index === 0) return true;
    return this.messages[index - 1].eventType !== 'vote';
  }

  /**
   * Verifica si es el último voto de una secuencia de votos
   */
  isLastVote(index: number): boolean {
    const currentMsg = this.messages[index];
    if (currentMsg.eventType !== 'vote') return false;

    // Es el último mensaje o el siguiente no es voto
    if (index === this.messages.length - 1) return true;
    return this.messages[index + 1].eventType !== 'vote';
  }

  /**
   * Obtiene todos los votos consecutivos a partir de un índice
   */
  getConsecutiveVotes(startIndex: number): ChatProMessage[] {
    const votes: ChatProMessage[] = [];
    for (let i = startIndex; i < this.messages.length; i++) {
      if (this.messages[i].eventType === 'vote') {
        votes.push(this.messages[i]);
      } else {
        break;
      }
    }
    return votes;
  }

  // ============================================
  // Sprint 1.4: Typing Agents Management
  // ============================================

  /**
   * Agrega un agente a la lista de "escribiendo"
   */
  addTypingAgent(speaker: ChatProSpeaker): void {
    // Evitar duplicados
    const exists = this.typingAgents.some(
      a => a.agent_id === speaker.agent_id || a.name === speaker.name
    );

    if (!exists) {
      // Clonar speaker para poder modificar el contexto
      this.typingAgents.push({ ...speaker });
      this.cdr.markForCheck();
      this.scrollToBottom();
    }
  }

  /**
   * Actualiza el contexto de actividad de un agente en typing
   */
  updateTypingContext(speaker: ChatProSpeaker, context: string): void {
    const agent = this.typingAgents.find(
      a => a.agent_id === speaker.agent_id || a.name === speaker.name
    );
    if (agent) {
      // Guardar contexto en una propiedad custom
      (agent as any).activityContext = context;
      this.cdr.markForCheck();
    } else {
      // Si no existe, agregarlo con contexto
      const newAgent = { ...speaker } as any;
      newAgent.activityContext = context;
      this.typingAgents.push(newAgent);
      this.cdr.markForCheck();
      this.scrollToBottom();
    }
  }

  /**
   * Remueve un agente de la lista de "escribiendo"
   */
  removeTypingAgent(speaker: ChatProSpeaker): void {
    this.typingAgents = this.typingAgents.filter(
      a => a.agent_id !== speaker.agent_id && a.name !== speaker.name
    );
    this.cdr.markForCheck();
  }

  /**
   * Limpia todos los agentes escribiendo
   */
  clearTypingAgents(): void {
    this.typingAgents = [];
    this.cdr.markForCheck();
  }

  // ============================================
  // Sprint 2: Natural UI Helpers
  // ============================================

  /**
   * Obtiene mensaje de actividad natural para typing indicator
   */
  getTypingMessage(speaker: ChatProSpeaker): string {
    return getActivityMessage(speaker);
  }

  /**
   * Formatea valor como moneda colombiana
   */
  formatAsCurrency(value: number): string {
    return formatCurrency(value);
  }

  /**
   * Formatea número con separadores
   */
  formatAsNumber(value: number): string {
    return formatNumber(value);
  }

  /**
   * Formatea porcentaje con signo
   */
  formatAsPercent(value: number): string {
    return formatPercent(value);
  }

  /**
   * Verifica si es mensaje de herramienta (para mostrar compacto)
   */
  isToolEvent(message: ChatProMessage): boolean {
    return message.eventType === 'tool_call' || message.eventType === 'tool_result';
  }

  /**
   * Verifica si es evento de sistema (delegación, join, etc)
   */
  isSystemEvent(message: ChatProMessage): boolean {
    return message.eventType === 'delegation' ||
           message.eventType === 'agent_joined' ||
           message.eventType === 'negotiation_round' ||
           message.eventType === 'consensus_reached';
  }

  /**
   * Verifica si debe mostrar el avatar (no agrupado)
   */
  shouldShowAvatar(index: number): boolean {
    return !this.isGroupedMessage(index);
  }

  /**
   * Verifica si debe mostrar el header del mensaje (no agrupado)
   */
  shouldShowHeader(index: number): boolean {
    return !this.isGroupedMessage(index);
  }

  /**
   * Obtiene clase CSS para badge de voto
   */
  getVoteBadgeClass(vote: string | undefined): string {
    switch (vote) {
      case 'APPROVE': return 'vote-approve';
      case 'REJECT': return 'vote-reject';
      case 'PENDING': return 'vote-pending';
      default: return '';
    }
  }

  /**
   * Obtiene icono para voto
   */
  getVoteIcon(vote: string | undefined): string {
    switch (vote) {
      case 'APPROVE': return 'pi-check';
      case 'REJECT': return 'pi-times';
      case 'PENDING': return 'pi-clock';
      default: return 'pi-question';
    }
  }

  /**
   * Calcula progreso de negociación (1/3, 2/3, 3/3)
   */
  getNegotiationProgress(message: ChatProMessage): number {
    if (!message.negotiationContext) return 0;
    return (message.negotiationContext.currentRound / message.negotiationContext.maxRounds) * 100;
  }

  /**
   * Obtiene rol/departamento legible
   */
  getSpeakerRole(speaker: ChatProSpeaker): string {
    const config = AGENT_UI_CONFIG[speaker.agent_id || ''];
    if (config?.role) return config.role;

    switch (speaker.department) {
      case 'sales': return 'Ventas';
      case 'inventory': return 'Inventario';
      case 'logistics': return 'Logística';
      default: return '';
    }
  }

  /**
   * Obtiene emoji del agente
   */
  getSpeakerEmoji(speaker: ChatProSpeaker): string {
    const config = AGENT_UI_CONFIG[speaker.agent_id || ''];
    return config?.emoji || '👤';
  }

  /**
   * Verifica si el mensaje tiene contenido expandible
   */
  hasExpandableContent(message: ChatProMessage): boolean {
    return !!(message.toolParams || message.toolResult);
  }

  /**
   * Obtiene nombre amigable de herramienta
   */
  getToolFriendlyName(message: ChatProMessage): string {
    return message.toolMetadata?.friendlyName || message.toolName || 'Procesando';
  }

  /**
   * Obtiene descripción de herramienta
   */
  getToolDescription(message: ChatProMessage): string {
    return message.toolMetadata?.description || 'Ejecutando consulta...';
  }

  /**
   * Obtiene icono de herramienta
   */
  getToolIcon(message: ChatProMessage): string {
    return message.toolMetadata?.icon || 'pi-cog';
  }

  // ============================================
  // Session Management Methods
  // ============================================

  /**
   * Carga la lista de sesiones de la empresa
   */
  async loadSessions(): Promise<void> {
    if (!this.company) return;

    this.isLoadingSessions = true;
    this.cdr.markForCheck();

    try {
      this.sessions = await this.chatProService.listSessions(this.company);
      this.currentSessionId = this.chatProService.currentSessionId;
    } catch (error) {
      console.error('[GeneralChatPro] Error loading sessions:', error);
    } finally {
      this.isLoadingSessions = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Cambia a una sesion existente y carga su historial
   */
  async switchSession(sessionId: string): Promise<void> {
    if (!this.company || this.isExecuting) return;

    this.isLoadingSessions = true;
    this.cdr.markForCheck();

    try {
      const history = await this.chatProService.loadHistory(this.company, sessionId);
      if (history) {
        this.currentSessionId = sessionId;
        this.messages = this.chatProService.convertHistoryToMessages(history);
        this.showSessionPanel = false;
        this.scrollToBottom();
      }
    } catch (error) {
      console.error('[GeneralChatPro] Error switching session:', error);
    } finally {
      this.isLoadingSessions = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Crea una nueva sesion de chat
   */
  async newSession(): Promise<void> {
    if (!this.company || this.isExecuting) return;

    // Limpiar chat actual
    this.messages = [];
    this.activeAgents.clear();
    this.clearTypingAgents();

    try {
      // Crear nueva sesion en el backend
      const sessionId = await this.chatProService.createSession(this.company);
      if (sessionId) {
        this.currentSessionId = sessionId;
        await this.loadSessions();
      }
    } catch (error) {
      console.error('[GeneralChatPro] Error creating session:', error);
      // Si falla, al menos limpiar la sesion local
      this.chatProService.startNewConversation();
      this.currentSessionId = null;
    }

    this.showSessionPanel = false;
    this.cdr.markForCheck();
  }

  /**
   * Elimina una sesion
   */
  async deleteSession(sessionId: string, event: Event): Promise<void> {
    event.stopPropagation(); // Evitar que se active switchSession

    if (!this.company) return;

    try {
      const success = await this.chatProService.deleteSession(this.company, sessionId);
      if (success) {
        // Si eliminamos la sesion actual, limpiar chat
        if (this.currentSessionId === sessionId) {
          this.messages = [];
          this.currentSessionId = null;
          this.chatProService.startNewConversation();
        }
        await this.loadSessions();
      }
    } catch (error) {
      console.error('[GeneralChatPro] Error deleting session:', error);
    }

    this.cdr.markForCheck();
  }

  /**
   * Toggle del panel de sesiones
   */
  toggleSessionPanel(): void {
    this.showSessionPanel = !this.showSessionPanel;
    if (this.showSessionPanel && this.company) {
      this.loadSessions();
    }
    this.cdr.markForCheck();
  }

  /**
   * Obtiene el titulo de una sesion para mostrar
   */
  getSessionDisplayTitle(session: ChatSession): string {
    return session.title || 'Chat sin titulo';
  }

  /**
   * Formatea la fecha de ultima actualizacion
   */
  formatSessionDate(dateStr: string | null): string {
    if (!dateStr) return '';

    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays < 7) return `Hace ${diffDays}d`;

      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }

  /**
   * Verifica si una sesion es la actual
   */
  isCurrentSession(session: ChatSession): boolean {
    return session.id === this.currentSessionId;
  }
}
