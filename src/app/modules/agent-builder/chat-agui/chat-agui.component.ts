import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AgUiService } from '../shared/services/agui.service';
import {
    AgUiMessage,
    AgUiToolCall,
    AgUiAgentState,
    AgUiSpeaker,
    AgUiSession,
    AgUiConfirmationResponse,
    getToolDisplay,
    formatToolArgs,
    formatToolResult,
    getSpeakerConfig,
    getDepartmentLabel
} from '../shared/models/agui.model';

/**
 * Chat AG-UI Component
 *
 * Implementación de chat usando el protocolo AG-UI para comunicación
 * estandarizada entre agentes y frontends.
 *
 * Características:
 * - Streaming de mensajes en tiempo real
 * - Visualización de tool calls
 * - Estado del agente sincronizado
 * - UI minimalista y moderna
 */
@Component({
    selector: 'app-chat-agui',
    templateUrl: './chat-agui.component.html',
    styleUrls: ['./chat-agui.component.scss']
})
export class ChatAguiComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @ViewChild('messageInput') private messageInput!: ElementRef;

    // State
    messages: AgUiMessage[] = [];
    toolCalls: Map<string, AgUiToolCall> = new Map();
    agentState: AgUiAgentState = { activeAgents: [], currentSpeaker: null };
    userInput = '';
    isRunning = false;
    company = '';
    errorMessage: string | null = null;

    // UI state
    showToolCalls = false;
    private shouldScrollToBottom = false;
    private destroy$ = new Subject<void>();

    // Session management
    sessions: AgUiSession[] = [];
    currentSessionId: string | null = null;
    showSessionPanel = false;
    isLoadingSessions = false;

    // Typing indicators
    typingAgents: AgUiSpeaker[] = [];

    // Negotiation state
    negotiationState: {
        isActive: boolean;
        phase: 'idle' | 'voting' | 'resolving' | 'completed';
        voters: { id: string; name: string; department: string; status: 'pending' | 'thinking' | 'voted'; vote?: string; }[];
        currentRound: number;
        maxRounds: number;
    } = { isActive: false, phase: 'idle', voters: [], currentRound: 0, maxRounds: 3 };

    constructor(
        private aguiService: AgUiService,
        private cdr: ChangeDetectorRef,
        private sanitizer: DomSanitizer
    ) { }

    ngOnInit(): void {
        // Load company from localStorage
        try {
            const companyData = JSON.parse(localStorage.getItem('currentCompany') || '{}');
            this.company = companyData.nomComercial || '';
        } catch (error) {
            console.error('[ChatAgui] Error loading company:', error);
            this.company = '';
        }

        this.setupSubscriptions();

        // Cargar sesiones si hay empresa
        if (this.company) {
            this.loadSessions();
        }
    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private setupSubscriptions(): void {
        // Messages
        this.aguiService.messages$
            .pipe(takeUntil(this.destroy$))
            .subscribe(messages => {
                this.messages = messages;
                this.shouldScrollToBottom = true;
            });

        // Tool calls
        this.aguiService.toolCalls$
            .pipe(takeUntil(this.destroy$))
            .subscribe(toolCalls => {
                this.toolCalls = toolCalls;
            });

        // Agent state
        this.aguiService.agentState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.agentState = state;
            });

        // Running state
        this.aguiService.isRunning$
            .pipe(takeUntil(this.destroy$))
            .subscribe(isRunning => {
                this.isRunning = isRunning;
            });

        // Errors
        this.aguiService.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => {
                this.errorMessage = error;
                setTimeout(() => this.errorMessage = null, 5000);
            });

        // Negotiation state
        this.aguiService.negotiationState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(state => {
                this.negotiationState = state;
                this.cdr.markForCheck();
            });
    }

    sendMessage(): void {
        const content = this.userInput.trim();
        if (!content || this.isRunning || !this.company) return;

        this.userInput = '';
        this.aguiService.sendMessage(this.company, content);
    }

    onKeyPress(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    /**
     * Handler para respuestas de Human-in-the-Loop
     */
    onConfirmationResponse(event: { decision: string; comment?: string }, message: AgUiMessage): void {
        if (!message.confirmationRequest) return;

        const response: AgUiConfirmationResponse = {
            requestId: message.confirmationRequest.id,
            decision: event.decision as 'approve' | 'reject' | 'modify',
            comment: event.comment,
            timestamp: new Date()
        };

        this.aguiService.sendConfirmationResponse(this.company, response);
    }

    /**
     * Handler para acciones de despacho desde el mapa
     * Envía un mensaje al agente para que ejecute el MCP tool assign_transporter
     */
    onDispatchAction(event: { action: string; data: any }): void {
        if (this.isRunning || !this.company) return;

        let message = '';

        if (event.action === 'dispatch_all') {
            const { routes, summary } = event.data;
            const routesList = routes.map((r: any) =>
                `- Zona ${r.zone}: ${r.orders_count} pedidos, ${r.metrics?.total_distance_km?.toFixed(1)}km`
            ).join('\n');

            message = `Despachar todas las rutas planificadas:

${routesList}

Total: ${summary?.total_orders} pedidos en ${summary?.total_zones} zonas
Valor total: $${(summary?.total_value || 0).toLocaleString()}

Por favor asigna los transportadores sugeridos a cada ruta y actualiza el estado de los pedidos a "Despachado".`;

        } else if (event.action === 'dispatch_selected') {
            const { route, zone, orders_count, orders, total_value } = event.data;
            const ordersList = orders?.slice(0, 5).map((o: any) =>
                `- #${o.nroPedido}: ${o.cliente} (${o.direccion})`
            ).join('\n');

            const transporterInfo = route?.suggested_transporter
                ? `Transportador sugerido: ${route.suggested_transporter.nombre}`
                : 'Sin transportador asignado';

            message = `Despachar la ruta de zona "${zone}":

${ordersList}
${orders?.length > 5 ? `... y ${orders.length - 5} pedidos más` : ''}

Total: ${orders_count} pedidos
Valor: $${(total_value || 0).toLocaleString()}
${transporterInfo}

Por favor asigna el transportador y actualiza el estado de estos pedidos a "Despachado".`;
        }

        if (message) {
            this.userInput = '';
            this.aguiService.sendMessage(this.company, message);
        }
    }

    clearChat(): void {
        this.aguiService.clearMessages();
    }

    private scrollToBottom(): void {
        try {
            const container = this.messagesContainer?.nativeElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        } catch (err) { }
    }

    // ==========================================================================
    // Template Helpers
    // ==========================================================================

    trackByMessageId(index: number, message: AgUiMessage): string {
        return message.id;
    }

    trackByToolCallId(index: number, item: [string, AgUiToolCall]): string {
        return item[0];
    }

    isUserMessage(message: AgUiMessage): boolean {
        return message.role === 'user';
    }

    getToolCallsArray(): [string, AgUiToolCall][] {
        return Array.from(this.toolCalls.entries());
    }

    getToolDisplay(toolName: string): { icon: string; label: string; color: string } {
        return getToolDisplay(toolName);
    }

    formatToolArgs(args: string): string {
        try {
            const parsed = JSON.parse(args);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return args;
        }
    }

    formatToolResult(result: string | undefined): string {
        if (!result) return '';
        try {
            const parsed = JSON.parse(result);
            if (typeof parsed === 'object') {
                // Show summary for objects
                const keys = Object.keys(parsed);
                if (keys.length > 3) {
                    return `{ ${keys.slice(0, 3).join(', ')}, ... }`;
                }
                return JSON.stringify(parsed, null, 2);
            }
            return String(parsed);
        } catch {
            return result.substring(0, 100) + (result.length > 100 ? '...' : '');
        }
    }

    getActiveAgentsDisplay(): string {
        const agents = this.agentState.activeAgents;
        if (agents.length === 0) return '';

        // Convert agent IDs to display names
        const displayNames = agents.map(id => getSpeakerConfig(id).displayName);
        if (displayNames.length <= 3) return displayNames.join(', ');
        return `${displayNames.slice(0, 2).join(', ')} +${displayNames.length - 2}`;
    }

    toggleToolCalls(): void {
        this.showToolCalls = !this.showToolCalls;
    }

    // ==========================================================================
    // Speaker Helpers
    // ==========================================================================

    getSpeakerEmoji(message: AgUiMessage): string {
        return message.speaker?.emoji || '🤖';
    }

    getSpeakerName(message: AgUiMessage): string {
        return message.speaker?.displayName || message.speaker?.name || 'Asistente';
    }

    getSpeakerColor(message: AgUiMessage): string {
        return message.speaker?.color || '#6366f1';
    }

    getSpeakerDepartment(message: AgUiMessage): string {
        return getDepartmentLabel(message.speaker?.department || null);
    }

    getCurrentSpeakerInfo(): AgUiSpeaker | null {
        const currentId = this.agentState.currentSpeaker;
        if (!currentId) return null;
        return getSpeakerConfig(currentId);
    }

    // Overload for speaker directly
    getSpeakerEmojiDirect(speaker: AgUiSpeaker): string {
        return speaker?.emoji || '🤖';
    }

    // ==========================================================================
    // Markdown Parser (from Chat Pro)
    // ==========================================================================

    /**
     * Formatea el contenido del mensaje con Markdown y @mentions
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

    // ==========================================================================
    // Message Grouping (from Chat Pro)
    // ==========================================================================

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
        return currentMsg.speaker?.id === prevMsg.speaker?.id ||
               currentMsg.speaker?.name === prevMsg.speaker?.name;
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

    // ==========================================================================
    // Session Management Methods (from Chat Pro)
    // ==========================================================================

    /**
     * Carga la lista de sesiones de la empresa
     */
    async loadSessions(): Promise<void> {
        if (!this.company) return;

        this.isLoadingSessions = true;
        this.cdr.markForCheck();

        try {
            this.sessions = await this.aguiService.listSessions(this.company);
            this.currentSessionId = this.aguiService.currentSessionId;
        } catch (error) {
            console.error('[ChatAgui] Error loading sessions:', error);
        } finally {
            this.isLoadingSessions = false;
            this.cdr.markForCheck();
        }
    }

    /**
     * Cambia a una sesion existente y carga su historial
     */
    async switchSession(sessionId: string): Promise<void> {
        if (!this.company || this.isRunning) return;

        this.isLoadingSessions = true;
        this.cdr.markForCheck();

        try {
            const history = await this.aguiService.loadHistory(this.company, sessionId);
            if (history) {
                this.currentSessionId = sessionId;
                this.messages = this.aguiService.convertHistoryToMessages(history);
                this.showSessionPanel = false;
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('[ChatAgui] Error switching session:', error);
        } finally {
            this.isLoadingSessions = false;
            this.cdr.markForCheck();
        }
    }

    /**
     * Crea una nueva sesion de chat
     */
    async newSession(): Promise<void> {
        if (!this.company || this.isRunning) return;

        // Limpiar chat actual
        this.messages = [];
        this.toolCalls = new Map();
        this.clearTypingAgents();

        try {
            // Crear nueva sesion en el backend
            const sessionId = await this.aguiService.createSession(this.company);
            if (sessionId) {
                this.currentSessionId = sessionId;
                await this.loadSessions();
            }
        } catch (error) {
            console.error('[ChatAgui] Error creating session:', error);
            // Si falla, al menos limpiar la sesion local
            this.aguiService.startNewConversation();
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
            const success = await this.aguiService.deleteSession(this.company, sessionId);
            if (success) {
                // Si eliminamos la sesion actual, limpiar chat
                if (this.currentSessionId === sessionId) {
                    this.messages = [];
                    this.currentSessionId = null;
                    this.aguiService.startNewConversation();
                }
                await this.loadSessions();
            }
        } catch (error) {
            console.error('[ChatAgui] Error deleting session:', error);
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
    getSessionDisplayTitle(session: AgUiSession): string {
        return session.title || 'Chat sin título';
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
    isCurrentSession(session: AgUiSession): boolean {
        return session.id === this.currentSessionId;
    }

    // ==========================================================================
    // Typing Indicators (from Chat Pro)
    // ==========================================================================

    /**
     * Agrega un agente a la lista de "escribiendo"
     */
    addTypingAgent(speaker: AgUiSpeaker): void {
        // Evitar duplicados
        const exists = this.typingAgents.some(
            a => a.id === speaker.id || a.name === speaker.name
        );

        if (!exists) {
            this.typingAgents.push({ ...speaker });
            this.cdr.markForCheck();
            this.scrollToBottom();
        }
    }

    /**
     * Remueve un agente de la lista de "escribiendo"
     */
    removeTypingAgent(speaker: AgUiSpeaker): void {
        this.typingAgents = this.typingAgents.filter(
            a => a.id !== speaker.id && a.name !== speaker.name
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

    /**
     * Obtiene mensaje de actividad natural para typing indicator
     */
    getTypingMessage(speaker: AgUiSpeaker): string {
        const activities: Record<string, string> = {
            'ceo': 'coordinando el equipo',
            'sales': 'analizando datos de ventas',
            'inventory': 'consultando inventario',
            'logistics': 'revisando despachos'
        };
        return activities[speaker.department || ''] || 'procesando información';
    }

    // ==========================================================================
    // Suggestion Chips
    // ==========================================================================

    /**
     * Envia un mensaje desde un chip de sugerencia
     */
    sendSuggestion(text: string): void {
        this.userInput = text;
        this.sendMessage();
    }

    // ==========================================================================
    // Agent Presence Helpers (Enhanced)
    // ==========================================================================

    /**
     * Obtiene el color de un agente por su ID
     */
    getAgentColor(agentId: string): string {
        return getSpeakerConfig(agentId).color;
    }

    /**
     * Obtiene el emoji de un agente por su ID
     */
    getAgentEmoji(agentId: string): string {
        return getSpeakerConfig(agentId).emoji;
    }

    /**
     * Obtiene el nombre para mostrar de un agente por su ID
     */
    getAgentDisplayName(agentId: string): string {
        return getSpeakerConfig(agentId).displayName;
    }

    /**
     * Verifica si un agente esta "pensando" (ejecutando herramientas)
     */
    isAgentThinking(agentId: string): boolean {
        // Un agente esta pensando si hay tool calls en ejecucion
        for (const toolCall of this.toolCalls.values()) {
            if (toolCall.status === 'executing') {
                return this.agentState.currentSpeaker === agentId;
            }
        }
        return false;
    }

    /**
     * Obtiene la actividad actual de un agente para mostrar
     */
    getAgentActivity(speaker: AgUiSpeaker): string {
        // Buscar tool calls activos
        for (const toolCall of this.toolCalls.values()) {
            if (toolCall.status === 'executing') {
                const toolInfo = getToolDisplay(toolCall.name);
                return `consultando ${toolInfo.label}...`;
            }
        }

        // Actividades por defecto segun departamento
        const activities: Record<string, string> = {
            'ceo': 'coordinando respuesta...',
            'sales': 'analizando datos de ventas...',
            'inventory': 'consultando inventario...',
            'logistics': 'revisando despachos...'
        };
        return activities[speaker.department || ''] || 'procesando...';
    }

    /**
     * Obtiene el texto descriptivo del proposito de delegacion
     */
    getDelegationPurposeText(purpose: string): string {
        const purposes: Record<string, string> = {
            'sales': 'Consulta de informacion de ventas',
            'inventory': 'Verificacion de inventario',
            'logistics': 'Gestion de despachos y rutas',
            'analysis': 'Analisis de datos',
            'default': 'Solicitud de informacion especializada'
        };
        return purposes[purpose] || purposes['default'];
    }

    /**
     * Obtiene la etiqueta del departamento
     */
    getDepartmentLabel(department: string | null): string {
        return getDepartmentLabel(department);
    }

    /**
     * Obtiene el color de un departamento
     */
    getDepartmentColor(department: string): string {
        const colors: Record<string, string> = {
            'ceo': '#6366f1',
            'sales': '#10b981',
            'inventory': '#f59e0b',
            'logistics': '#3b82f6'
        };
        return colors[department] || '#6b7280';
    }

    /**
     * Obtiene el emoji de un departamento
     */
    getDepartmentEmoji(department: string): string {
        const emojis: Record<string, string> = {
            'ceo': '👔',
            'sales': '📈',
            'inventory': '📦',
            'logistics': '🚚'
        };
        return emojis[department] || '🤖';
    }

    // ==========================================================================
    // Vote/Negotiation Helpers (Enhanced)
    // ==========================================================================

    /**
     * Cuenta votos de un tipo especifico
     */
    countVotes(votes: AgUiMessage[], voteType: string): number {
        return votes.filter(v => v.vote === voteType).length;
    }

    /**
     * Calcula el porcentaje de votos de aprobacion
     */
    getApprovePercentage(votes: AgUiMessage[]): number {
        if (votes.length === 0) return 0;
        const approveCount = this.countVotes(votes, 'APPROVE');
        return (approveCount / votes.length) * 100;
    }

    /**
     * Calcula el porcentaje de votos de rechazo
     */
    getRejectPercentage(votes: AgUiMessage[]): number {
        if (votes.length === 0) return 0;
        const rejectCount = this.countVotes(votes, 'REJECT');
        return (rejectCount / votes.length) * 100;
    }

    /**
     * Trunca texto a un numero maximo de caracteres
     */
    truncateText(text: string, maxLength: number): string {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Genera un array de numeros para las rondas de negociacion
     */
    getRoundsArray(maxRounds: number): number[] {
        return Array.from({ length: maxRounds }, (_, i) => i);
    }

    /**
     * Calcula el porcentaje de votantes que ya votaron
     */
    getVotedPercentage(): number {
        if (this.negotiationState.voters.length === 0) return 0;
        const votedCount = this.negotiationState.voters.filter(v => v.status === 'voted').length;
        return (votedCount / this.negotiationState.voters.length) * 100;
    }

    /**
     * Obtiene los departamentos de un objeto de votos
     */
    getVoteDepartments(votes: Record<string, string>): string[] {
        return Object.keys(votes);
    }

    /**
     * Calcula el porcentaje de aprobacion para el consenso
     */
    getConsensusApprovePercent(message: AgUiMessage): number {
        if (!message.votesSummary) return 0;
        const total = (message.votesSummary.approve || 0) + (message.votesSummary.reject || 0);
        if (total === 0) return 0;
        return ((message.votesSummary.approve || 0) / total) * 100;
    }

    /**
     * Calcula el porcentaje de rechazo para el consenso
     */
    getConsensusRejectPercent(message: AgUiMessage): number {
        if (!message.votesSummary) return 0;
        const total = (message.votesSummary.approve || 0) + (message.votesSummary.reject || 0);
        if (total === 0) return 0;
        return ((message.votesSummary.reject || 0) / total) * 100;
    }

    // ==========================================================================
    // Vote/Negotiation Helpers (from Chat Pro)
    // ==========================================================================

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
    getConsecutiveVotes(startIndex: number): AgUiMessage[] {
        const votes: AgUiMessage[] = [];
        for (let i = startIndex; i < this.messages.length; i++) {
            if (this.messages[i].eventType === 'vote') {
                votes.push(this.messages[i]);
            } else {
                break;
            }
        }
        return votes;
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
    getNegotiationProgress(message: AgUiMessage): number {
        if (!message.negotiationContext) return 0;
        return (message.negotiationContext.currentRound / message.negotiationContext.maxRounds) * 100;
    }

    /**
     * Verifica si es un mensaje de delegación
     */
    isDelegation(message: AgUiMessage): boolean {
        return message.eventType === 'delegation';
    }

    /**
     * Verifica si es un mensaje de voto
     */
    isVote(message: AgUiMessage): boolean {
        return message.eventType === 'vote';
    }

    /**
     * Verifica si es una ronda de negociación
     */
    isNegotiationRound(message: AgUiMessage): boolean {
        return message.eventType === 'negotiation_round';
    }

    /**
     * Verifica si es consenso alcanzado
     */
    isConsensusReached(message: AgUiMessage): boolean {
        return message.eventType === 'consensus_reached';
    }

    /**
     * Verifica si es respuesta final
     */
    isFinalResponse(message: AgUiMessage): boolean {
        return message.eventType === 'final_response' || message.isFinalResponse === true;
    }

    /**
     * Verifica si es un mensaje normal de agente (no especial)
     */
    isRegularAgentMessage(message: AgUiMessage): boolean {
        if (this.isUserMessage(message)) return false;
        const specialTypes = ['vote', 'negotiation_round', 'consensus_reached', 'delegation'];
        return !specialTypes.includes(message.eventType || '');
    }

    /**
     * Verifica si hay una respuesta de texto después de una delegación
     * Usado para ocultar la notificación de delegación una vez que el agente responde
     */
    hasResponseAfterDelegation(delegationIndex: number): boolean {
        // Buscar si hay algún mensaje de texto (no delegación) después de este índice
        for (let i = delegationIndex + 1; i < this.messages.length; i++) {
            const msg = this.messages[i];
            // Si encontramos un mensaje de texto del asistente, hay respuesta
            if (msg.role === 'assistant' && msg.content && msg.content.trim().length > 0) {
                // Ignorar mensajes de delegación o eventos especiales sin contenido real
                if (msg.eventType !== 'delegation') {
                    return true;
                }
            }
        }
        return false;
    }
}
