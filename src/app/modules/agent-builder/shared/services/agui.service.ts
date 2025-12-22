import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
    AgUiEvent,
    AgUiEventType,
    AgUiMessage,
    AgUiToolCall,
    AgUiAgentState,
    AgUiRequest,
    AgUiSpeaker,
    AgUiSession,
    AgUiSessionHistory,
    AgUiArtifact,
    AgUiConfirmationRequest,
    AgUiConfirmationResponse,
    getToolDisplay,
    getSpeakerConfig,
    AGUI_SPEAKER_CONFIG,
    transformToolResultToArtifact,
    toolRequiresConfirmation,
    getToolArtifactConfig,
    AGUI_HITL_TOOLS
} from '../models/agui.model';

/**
 * AG-UI Service
 *
 * Servicio para conectarse al endpoint /agui del backend ADK.
 * Implementa el protocolo AG-UI para comunicación estandarizada
 * entre agentes y frontends.
 *
 * Basado en: https://docs.ag-ui.com/
 */
@Injectable({
    providedIn: 'root'
})
export class AgUiService {
    private baseUrl = environment.adkBackendApi || 'http://localhost:8080';

    // State subjects
    private messagesSubject = new BehaviorSubject<AgUiMessage[]>([]);
    private toolCallsSubject = new BehaviorSubject<Map<string, AgUiToolCall>>(new Map());
    private agentStateSubject = new BehaviorSubject<AgUiAgentState>({
        activeAgents: [],
        currentSpeaker: null
    });
    private isRunningSubject = new BehaviorSubject<boolean>(false);
    private errorSubject = new Subject<string>();
    private threadIdSubject = new BehaviorSubject<string | null>(null);
    private sessionsSubject = new BehaviorSubject<AgUiSession[]>([]);

    // Current streaming message
    private currentMessage: AgUiMessage | null = null;

    // Session management
    public currentSessionId: string | null = null;

    // Negotiation state tracking
    private negotiationStateSubject = new BehaviorSubject<{
        isActive: boolean;
        phase: 'idle' | 'voting' | 'resolving' | 'completed';
        voters: { id: string; name: string; department: string; status: 'pending' | 'thinking' | 'voted'; vote?: string; }[];
        currentRound: number;
        maxRounds: number;
    }>({
        isActive: false,
        phase: 'idle',
        voters: [],
        currentRound: 0,
        maxRounds: 3
    });
    public negotiationState$ = this.negotiationStateSubject.asObservable();

    // Timeouts
    private executionTimeout: any = null;
    private idleTimeout: any = null;
    private readonly EXECUTION_TIMEOUT_MS = 120000; // 2 minutes max
    private readonly IDLE_TIMEOUT_MS = 30000; // 30 seconds idle

    // Observable streams
    public messages$ = this.messagesSubject.asObservable();
    public toolCalls$ = this.toolCallsSubject.asObservable();
    public agentState$ = this.agentStateSubject.asObservable();
    public isRunning$ = this.isRunningSubject.asObservable();
    public error$ = this.errorSubject.asObservable();
    public threadId$ = this.threadIdSubject.asObservable();
    public sessions$ = this.sessionsSubject.asObservable();

    constructor() { }

    /**
     * Envia un mensaje usando el protocolo AG-UI
     */
    async sendMessage(company: string, content: string, sessionId?: string): Promise<void> {
        // Reset state
        this.clearTimeouts();

        // Use provided sessionId or fallback to currentSessionId
        // If neither exists, create a new session automatically
        let effectiveSessionId = sessionId || this.currentSessionId;

        // Auto-create session if none exists (ensures conversation continuity)
        if (!effectiveSessionId) {
            const newSessionId = `agui_${company}_${Date.now().toString(36)}`;
            this.currentSessionId = newSessionId;
            effectiveSessionId = newSessionId;
            console.log('[AgUiService] 🆕 Auto-created session:', newSessionId);
        }

        console.log('[AgUiService] Sending message:', { company, content, sessionId: effectiveSessionId });

        // Add user message immediately for instant UX
        const userMessage: AgUiMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: content,
            speaker: AGUI_SPEAKER_CONFIG['user'],
            timestamp: new Date()
        };

        const currentMessages = this.messagesSubject.value;
        this.messagesSubject.next([...currentMessages, userMessage]);

        this.isRunningSubject.next(true);
        this.startExecutionTimeout();

        // Build request with full conversation history for context
        // Include previous messages so the agent maintains conversation context
        const conversationHistory = currentMessages
            .filter(m => m.content && m.content.trim()) // Only messages with content
            .map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

        // Add the new user message
        conversationHistory.push({ role: 'user', content });

        console.log('[AgUiService] 📜 Sending with history:', {
            historyLength: conversationHistory.length,
            sessionId: effectiveSessionId
        });

        const request: AgUiRequest = {
            company,
            messages: conversationHistory,
            session_id: effectiveSessionId
        };

        try {
            const response = await fetch(`${this.baseUrl}/agui`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log('[AgUiService] Stream finished');
                    this.finishExecution();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                // Process complete events
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.substring(6);
                        this.processEvent(dataStr);
                    }
                }
            }

        } catch (error: any) {
            console.error('[AgUiService] Error:', error);

            let errorMsg = 'Connection error';
            if (error.message?.includes('fetch')) {
                errorMsg = 'Could not connect to server. Check if backend is running.';
            } else if (error.message) {
                errorMsg = error.message;
            }

            this.errorSubject.next(errorMsg);
            this.finishExecution();
        }
    }

    /**
     * Procesa un evento AG-UI
     */
    private processEvent(dataStr: string): void {
        try {
            this.resetIdleTimeout();

            const event: AgUiEvent = JSON.parse(dataStr);
            console.log('[AgUiService] Event:', event.type);

            switch (event.type) {
                case 'RUN_STARTED':
                    this.handleRunStarted(event);
                    break;

                case 'RUN_FINISHED':
                    this.handleRunFinished(event);
                    break;

                case 'RUN_ERROR':
                    this.handleRunError(event);
                    break;

                case 'TEXT_MESSAGE_START':
                    this.handleTextMessageStart(event);
                    break;

                case 'TEXT_MESSAGE_CONTENT':
                    this.handleTextMessageContent(event);
                    break;

                case 'TEXT_MESSAGE_END':
                    this.handleTextMessageEnd(event);
                    break;

                case 'TOOL_CALL_START':
                    this.handleToolCallStart(event);
                    break;

                case 'TOOL_CALL_ARGS':
                    this.handleToolCallArgs(event);
                    break;

                case 'TOOL_CALL_END':
                    this.handleToolCallEnd(event);
                    break;

                case 'STATE_SNAPSHOT':
                    this.handleStateSnapshot(event);
                    break;

                case 'STATE_DELTA':
                    this.handleStateDelta(event);
                    break;

                case 'AGENT_JOINED':
                    this.handleAgentJoined(event);
                    break;

                case 'AGENT_THINKING':
                    this.handleAgentThinking(event);
                    break;

                case 'DELEGATION':
                    this.handleDelegation(event);
                    break;

                case 'VOTE':
                    this.handleVote(event);
                    break;

                case 'CONSENSUS_REACHED':
                    this.handleConsensusReached(event);
                    break;

                case 'CONFIRMATION_REQUEST':
                    this.handleConfirmationRequest(event);
                    break;

                // Chat Pro compatibility events
                case 'USER_MESSAGE':
                    this.handleUserMessage(event);
                    break;

                case 'AGENT_MESSAGE':
                    this.handleAgentMessage(event);
                    break;

                case 'FINAL_RESPONSE':
                    this.handleFinalResponse(event);
                    break;

                case 'NEGOTIATION_ROUND':
                    this.handleNegotiationRound(event);
                    break;

                default:
                    console.warn('[AgUiService] Unknown event type:', event.type);
            }

        } catch (error) {
            console.error('[AgUiService] Error parsing event:', error);
        }
    }

    // ==========================================================================
    // Event Handlers
    // ==========================================================================

    private handleRunStarted(event: AgUiEvent): void {
        console.log('[AgUiService] Run started:', event.threadId);
        this.threadIdSubject.next(event.threadId || null);

        // RESET: Limpiar agentes activos y empezar fresco con el CEO
        // Esto evita que se acumulen avatares de consultas anteriores
        this.agentStateSubject.next({
            activeAgents: ['general_manager'],
            currentSpeaker: 'general_manager'
        });
        console.log('[AgUiService] 👔 Reset agents - CEO initialized as first active agent');
    }

    private handleRunFinished(event: AgUiEvent): void {
        console.log('[AgUiService] Run finished');
        // Ensure any pending message is finalized
        if (this.currentMessage) {
            this.finalizeCurrentMessage();
        }
        this.finishExecution();
    }

    private handleRunError(event: AgUiEvent): void {
        console.error('[AgUiService] Run error:', event.message);
        this.errorSubject.next(event.message || 'Unknown error');
        this.finishExecution();
    }

    private handleTextMessageStart(event: AgUiEvent): void {
        console.log('[AgUiService] Message start:', event.messageId);

        // Extended event to access speaker field
        const extEvent = event as any;

        // PRIORITY 1: Use speaker from event if available (sent by backend)
        // PRIORITY 2: Use current speaker from agent state
        // PRIORITY 3: Default to general_manager
        let speaker: AgUiSpeaker;

        if (extEvent.speaker) {
            // Backend sent speaker config - convert to AgUiSpeaker format
            const backendSpeaker = extEvent.speaker;
            const dept = backendSpeaker.department || backendSpeaker.type;
            const personName = this.mapDisplayNameToPersonName(backendSpeaker.display_name, dept);

            speaker = {
                id: backendSpeaker.agent_id || backendSpeaker.name || 'general_manager',
                name: personName,
                displayName: personName,
                department: this.mapDepartment(dept),
                color: backendSpeaker.color || '#6366f1',
                icon: this.mapAvatarToIcon(backendSpeaker.avatar),
                emoji: this.getEmojiForDepartment(dept)
            };
            console.log('[AgUiService] Using speaker from event:', speaker.name, speaker.emoji);

            // Also update current speaker in agent state
            const currentState = this.agentStateSubject.value;
            if (!currentState.activeAgents.includes(speaker.id)) {
                currentState.activeAgents.push(speaker.id);
            }
            currentState.currentSpeaker = speaker.id;
            this.agentStateSubject.next({ ...currentState });
        } else {
            // Fallback to current speaker from state
            const currentAgentId = this.agentStateSubject.value.currentSpeaker;
            speaker = currentAgentId
                ? getSpeakerConfig(currentAgentId)
                : getSpeakerConfig('general_manager');
            console.log('[AgUiService] Using speaker from state:', speaker.name);
        }

        this.currentMessage = {
            id: event.messageId || `msg_${Date.now()}`,
            role: (event.role as 'user' | 'assistant') || 'assistant',
            content: '',
            speaker: speaker,
            timestamp: new Date(),
            isStreaming: true
        };
    }

    /**
     * Maps backend department string to AgUiSpeaker department type
     */
    private mapDepartment(dept: string | null): 'ceo' | 'sales' | 'inventory' | 'logistics' | 'user' | null {
        if (!dept) return 'ceo';
        const deptLower = dept.toLowerCase();
        if (deptLower === 'sales') return 'sales';
        if (deptLower === 'inventory') return 'inventory';
        if (deptLower === 'logistics') return 'logistics';
        if (deptLower === 'user') return 'user';
        if (deptLower === 'ceo' || deptLower === 'sub_agent' || deptLower === 'system') return 'ceo';
        return null;
    }

    /**
     * Maps backend avatar name to PrimeNG icon
     */
    private mapAvatarToIcon(avatar: string | undefined): string {
        const iconMap: Record<string, string> = {
            'briefcase': 'pi-briefcase',
            'trending-up': 'pi-chart-line',
            'package': 'pi-box',
            'truck': 'pi-truck',
            'layers': 'pi-sitemap',
            'git-branch': 'pi-share-alt',
            'zap': 'pi-bolt',
            'user': 'pi-user'
        };
        return iconMap[avatar || 'user'] || 'pi-user';
    }

    /**
     * Gets emoji for department
     */
    private getEmojiForDepartment(dept: string | null): string {
        if (!dept) return '👔';
        const deptLower = dept.toLowerCase();
        const emojiMap: Record<string, string> = {
            'ceo': '👔',
            'sales': '📈',
            'inventory': '📦',
            'logistics': '🚚',
            'sub_agent': '🤖',
            'system': '⚙️',
            'voter': '🗳️'
        };
        return emojiMap[deptLower] || '👔';
    }

    /**
     * Maps backend display_name to person name (Carlos, Maria, etc.)
     * Backend sends: 'CEO', 'Ventas', 'Inventario', 'Logistica'
     * Frontend shows: 'Carlos', 'Maria', 'Pedro', 'Ana'
     */
    private mapDisplayNameToPersonName(displayName: string | null, dept: string | null): string {
        if (!displayName) return 'Carlos';

        const nameNormalized = displayName.toLowerCase();
        const deptNormalized = (dept || '').toLowerCase();

        // Map department-based display names to person names
        const nameMap: Record<string, string> = {
            'ceo': 'Carlos',
            'ventas': 'Maria',
            'inventario': 'Pedro',
            'logistica': 'Ana',
            'sintesis': 'Carlos',
            'pipeline multi-dept': 'Carlos',
            'ejecucion paralela': 'Carlos',
            'votante ventas': 'Maria',
            'votante inventario': 'Pedro',
            'votante logistica': 'Ana',
            'sistema de consenso': 'Carlos',
            'ronda de votacion': 'Carlos',
            'negociacion': 'Carlos'
        };

        // Check if displayName matches a known department name
        if (nameMap[nameNormalized]) {
            return nameMap[nameNormalized];
        }

        // Check by department type
        const deptMap: Record<string, string> = {
            'sales': 'Maria',
            'inventory': 'Pedro',
            'logistics': 'Ana',
            'ceo': 'Carlos',
            'sub_agent': 'Carlos',
            'system': 'Carlos',
            'voter': 'Carlos'
        };

        if (deptMap[deptNormalized]) {
            return deptMap[deptNormalized];
        }

        // If displayName is already a person name, return it
        const personNames = ['carlos', 'maria', 'pedro', 'ana'];
        if (personNames.includes(nameNormalized)) {
            return displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
        }

        // Default
        return 'Carlos';
    }

    private handleTextMessageContent(event: AgUiEvent): void {
        if (this.currentMessage && event.delta) {
            this.currentMessage.content += event.delta;

            // Update messages array with streaming content
            const messages = this.messagesSubject.value;
            const existingIndex = messages.findIndex(m => m.id === this.currentMessage!.id);

            if (existingIndex >= 0) {
                // Update existing message
                messages[existingIndex] = { ...this.currentMessage };
                this.messagesSubject.next([...messages]);
            } else {
                // Add new message
                this.messagesSubject.next([...messages, { ...this.currentMessage }]);
            }
        }
    }

    private handleTextMessageEnd(event: AgUiEvent): void {
        console.log('[AgUiService] Message end:', event.messageId);
        this.finalizeCurrentMessage();
    }

    private handleToolCallStart(event: AgUiEvent): void {
        console.log('[AgUiService] 🔧 TOOL_CALL_START:', {
            toolCallId: event.toolCallId,
            toolCallName: event.toolCallName,
            fullEvent: event
        });

        const toolCall: AgUiToolCall = {
            id: event.toolCallId || `tc_${Date.now()}`,
            name: event.toolCallName || 'unknown',
            args: '',
            status: 'executing'
        };

        console.log('[AgUiService] 📝 ToolCall created:', toolCall);

        const toolCalls = new Map(this.toolCallsSubject.value);
        toolCalls.set(toolCall.id, toolCall);
        this.toolCallsSubject.next(toolCalls);
    }

    private handleToolCallArgs(event: AgUiEvent): void {
        if (event.toolCallId && event.delta) {
            const toolCalls = new Map(this.toolCallsSubject.value);
            const toolCall = toolCalls.get(event.toolCallId);

            if (toolCall) {
                toolCall.args += event.delta;
                toolCalls.set(event.toolCallId, { ...toolCall });
                this.toolCallsSubject.next(toolCalls);
            }
        }
    }

    private handleToolCallEnd(event: AgUiEvent): void {
        console.log('[AgUiService] 🔧 TOOL_CALL_END:', {
            toolCallId: event.toolCallId,
            resultPreview: event.result ? event.result.substring(0, 200) : 'no result'
        });

        if (event.toolCallId) {
            const toolCalls = new Map(this.toolCallsSubject.value);
            const toolCall = toolCalls.get(event.toolCallId);

            console.log('[AgUiService] 📝 Found toolCall:', toolCall ? {
                id: toolCall.id,
                name: toolCall.name,
                status: toolCall.status
            } : 'NOT FOUND');

            if (toolCall) {
                toolCall.result = event.result;
                toolCall.status = 'completed';
                toolCalls.set(event.toolCallId, { ...toolCall });
                this.toolCallsSubject.next(toolCalls);

                // Check if backend flagged this as HITL tool
                const extEvent = event as any;
                const requiresConfirmation = extEvent.requiresConfirmation || false;
                const confirmationId = extEvent.confirmationId;

                console.log('[AgUiService] 🗺️ Calling processToolResultAsArtifact:', {
                    toolName: toolCall.name,
                    requiresConfirmation,
                    confirmationId
                });

                // Try to transform tool result to artifact (Generative UI)
                this.processToolResultAsArtifact(
                    toolCall.name,
                    event.result,
                    requiresConfirmation,
                    confirmationId
                );
            }
        }
    }

    /**
     * Maneja eventos CONFIRMATION_REQUEST del backend
     *
     * IMPORTANTE: Verifica si ya existe una confirmación con el mismo ID
     * para evitar duplicados cuando TOOL_CALL_END también genera confirmación
     */
    private handleConfirmationRequest(event: AgUiEvent): void {
        console.log('[AgUiService] Confirmation request:', event);

        const extEvent = event as any;
        const confirmId = extEvent.confirmationId || `confirm_${Date.now()}`;

        // Check if this confirmation already exists (avoid duplicates)
        const messages = this.messagesSubject.value;
        const existingConfirm = messages.find(m =>
            m.confirmationRequest?.id === confirmId ||
            (m.confirmationRequest?.toolCallId && m.confirmationRequest.toolCallId === extEvent.toolCallId)
        );

        if (existingConfirm) {
            console.log('[AgUiService] ⚠️ Confirmation already exists, skipping duplicate:', confirmId);
            return; // Don't create duplicate
        }

        // Get current speaker
        const currentAgentId = this.agentStateSubject.value.currentSpeaker;
        const speaker = currentAgentId
            ? getSpeakerConfig(currentAgentId)
            : getSpeakerConfig('general_manager');

        // Create confirmation request from backend event
        const confirmationRequest: AgUiConfirmationRequest = {
            id: confirmId,
            type: extEvent.confirmationType || 'approve_reject',
            title: extEvent.title || 'Confirmación requerida',
            message: extEvent.message || '¿Desea proceder con esta acción?',
            toolCallId: extEvent.toolCallId,
            toolName: extEvent.toolName,
            args: extEvent.args,
            timeout: extEvent.timeout,
            expiresAt: extEvent.expiresAt ? new Date(extEvent.expiresAt) : undefined
        };

        // Create a message with the confirmation request
        const confirmMessage: AgUiMessage = {
            id: `hitl_${Date.now()}`,
            role: 'assistant',
            content: confirmationRequest.message,
            speaker: speaker,
            timestamp: new Date(),
            confirmationRequest: confirmationRequest,
            eventType: 'confirmation_request'
        };

        // Add to messages
        this.messagesSubject.next([...messages, confirmMessage]);
    }

    /**
     * Procesa el resultado de un tool y lo transforma a artifact si aplica
     */
    private processToolResultAsArtifact(
        toolName: string,
        resultStr?: string,
        backendRequiresConfirmation: boolean = false,
        backendConfirmationId?: string
    ): void {
        console.log('[AgUiService] 🎨 processToolResultAsArtifact START:', {
            toolName,
            resultStrLength: resultStr?.length || 0,
            backendRequiresConfirmation
        });

        if (!resultStr) {
            console.log('[AgUiService] ⚠️ No resultStr, returning');
            return;
        }

        try {
            const result = JSON.parse(resultStr);
            console.log('[AgUiService] 📦 Parsed result:', {
                status: result.status,
                hasMapData: !!result.map_data,
                hasRoutes: !!result.routes,
                artifactType: result.artifact_type
            });

            const artifact = transformToolResultToArtifact(toolName, result);

            console.log('[AgUiService] 🗺️ Transform result:', artifact ? {
                id: artifact.id,
                type: artifact.type,
                title: artifact.title,
                hasData: !!artifact.data
            } : 'NULL ARTIFACT');

            if (artifact) {
                console.log('[AgUiService] ✅ Artifact created from tool:', toolName, artifact.type);

                // Get current speaker
                const currentAgentId = this.agentStateSubject.value.currentSpeaker;
                const speaker = currentAgentId
                    ? getSpeakerConfig(currentAgentId)
                    : getSpeakerConfig('general_manager');

                // Check if tool requires Human-in-the-Loop confirmation
                // Backend flag takes priority, then check local config
                const config = getToolArtifactConfig(toolName);
                const requiresConfirmation = backendRequiresConfirmation ||
                    config?.requiresConfirmation ||
                    AGUI_HITL_TOOLS.includes(toolName);

                // Create a message with the artifact
                const artifactMessage: AgUiMessage = {
                    id: `artifact_${Date.now()}`,
                    role: 'assistant',
                    content: '', // Artifacts don't need text content
                    speaker: speaker,
                    timestamp: new Date(),
                    artifacts: [artifact],
                    eventType: 'agent_message'
                };

                // Add confirmation request if needed
                if (requiresConfirmation) {
                    artifactMessage.confirmationRequest = {
                        id: backendConfirmationId || `confirm_${Date.now()}`,
                        type: 'approve_reject',
                        title: 'Confirmación requerida',
                        message: config?.confirmationMessage || `¿Aprobar esta acción de ${toolName}?`,
                        toolCallId: `tc_${toolName}_${Date.now()}`,
                        toolName: toolName,
                        artifact: artifact
                    };
                }

                // Add to messages
                const messages = this.messagesSubject.value;
                this.messagesSubject.next([...messages, artifactMessage]);
            }
        } catch (error) {
            console.warn('[AgUiService] Could not parse tool result for artifact:', toolName, error);
        }
    }

    /**
     * Envía respuesta de confirmación Human-in-the-Loop
     *
     * Backend endpoint: POST /agui/confirm
     * Expects: { company, session_id, confirmation_id, decision, modified_args?, comment? }
     */
    async sendConfirmationResponse(company: string, response: AgUiConfirmationResponse): Promise<boolean> {
        console.log('[AgUiService] Sending confirmation response:', response);

        try {
            const payload = {
                company,
                session_id: this.currentSessionId || undefined,
                confirmation_id: response.requestId,
                decision: response.decision,
                modified_args: response.modifiedArgs || undefined,
                comment: response.comment || undefined
            };

            console.log('[AgUiService] Confirmation payload:', payload);

            const res = await fetch(`${this.baseUrl}/agui/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
            }

            const result = await res.json();
            console.log('[AgUiService] Confirmation result:', result);

            // Update the message to show confirmation was sent
            const messages = this.messagesSubject.value;
            const updatedMessages = messages.map(msg => {
                if (msg.confirmationRequest?.id === response.requestId) {
                    const statusEmoji = response.decision === 'approve' ? '✅' : '❌';
                    const statusText = response.decision === 'approve' ? 'Aprobado' : 'Rechazado';
                    return {
                        ...msg,
                        confirmationRequest: undefined, // Remove the request UI
                        confirmationResponse: response, // Store the response
                        content: msg.content ? `${msg.content}\n\n${statusEmoji} ${statusText}` : `${statusEmoji} ${statusText}`
                    };
                }
                return msg;
            });

            this.messagesSubject.next(updatedMessages);
            return true;

        } catch (error: any) {
            console.error('[AgUiService] Error sending confirmation:', error);
            this.errorSubject.next(error.message || 'Error sending confirmation');
            return false;
        }
    }

    /**
     * Lista confirmaciones pendientes para una sesión
     */
    async getPendingConfirmations(company: string, sessionId?: string): Promise<any[]> {
        try {
            let url = `${this.baseUrl}/agui/pending/${encodeURIComponent(company)}`;
            if (sessionId) {
                url += `?session_id=${encodeURIComponent(sessionId)}`;
            }

            const res = await fetch(url, { method: 'GET' });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            return data.pending || [];
        } catch (error) {
            console.error('[AgUiService] Error fetching pending confirmations:', error);
            return [];
        }
    }

    private handleStateSnapshot(event: AgUiEvent): void {
        if (event.state) {
            this.agentStateSubject.next({
                ...this.agentStateSubject.value,
                ...event.state
            });
        }
    }

    private handleStateDelta(event: AgUiEvent): void {
        // Apply JSON Patch operations
        const currentState = { ...this.agentStateSubject.value };

        // Handle delta array format from backend
        const deltas = (event as any).delta || [];

        for (const op of deltas) {
            this.applyJsonPatch(currentState, op);
        }

        this.agentStateSubject.next(currentState);
    }

    // ==========================================================================
    // Multi-Agent Event Handlers
    // ==========================================================================

    private handleAgentJoined(event: AgUiEvent): void {
        const extEvent = event as any;
        const agentId = extEvent.agent || 'unknown';
        const displayName = extEvent.displayName || agentId;

        console.log('[AgUiService] 🤝 Agent joined:', displayName);

        // Update agent state
        const currentState = this.agentStateSubject.value;
        if (!currentState.activeAgents.includes(agentId)) {
            currentState.activeAgents.push(agentId);
        }
        currentState.currentSpeaker = agentId;
        this.agentStateSubject.next({ ...currentState });

        // Optionally emit a system message (can be disabled if too verbose)
        // This is similar to how chat_pro shows "Agent joined"
    }

    private handleAgentThinking(event: AgUiEvent): void {
        const extEvent = event as any;
        const agentId = extEvent.agent || 'unknown';
        const displayName = extEvent.displayName || agentId;

        console.log('[AgUiService] 💭 Agent thinking:', displayName);

        // Update current speaker in state
        const currentState = this.agentStateSubject.value;
        currentState.currentSpeaker = agentId;
        this.agentStateSubject.next({ ...currentState });

        // Update negotiation state if a voter is thinking
        const negState = this.negotiationStateSubject.value;
        if (negState.isActive) {
            const voterIndex = negState.voters.findIndex(v =>
                v.id === agentId ||
                agentId.includes(v.department) ||
                displayName.toLowerCase().includes(v.department)
            );

            if (voterIndex >= 0) {
                negState.voters[voterIndex].status = 'thinking';
                this.negotiationStateSubject.next({ ...negState });
                console.log('[AgUiService] 🗳️ Voter thinking:', negState.voters[voterIndex].name);
            }

            // Check if consensus_resolver is thinking
            if (agentId.includes('consensus') || agentId.includes('resolver')) {
                negState.phase = 'resolving';
                this.negotiationStateSubject.next({ ...negState });
                console.log('[AgUiService] 🗳️ Consensus resolver is working');
            }
        }
    }

    private handleDelegation(event: AgUiEvent): void {
        const extEvent = event as any;
        const fromAgent = extEvent.from || 'CEO';
        const toAgent = extEvent.to || extEvent.toAgent || 'unknown';
        const department = extEvent.department;

        console.log('[AgUiService] 🔄 Delegation:', fromAgent, '→', toAgent);

        // Check if delegation is to negotiation_loop - start negotiation tracking
        if (toAgent === 'negotiation_loop' || toAgent.includes('negotiation')) {
            console.log('[AgUiService] 🗳️ Starting negotiation tracking');
            this.negotiationStateSubject.next({
                isActive: true,
                phase: 'voting',
                voters: [
                    { id: 'sales_voter', name: 'María', department: 'sales', status: 'pending' },
                    { id: 'inventory_voter', name: 'Pedro', department: 'inventory', status: 'pending' },
                    { id: 'logistics_voter', name: 'Ana', department: 'logistics', status: 'pending' }
                ],
                currentRound: 1,
                maxRounds: 3
            });
        }

        // Get speaker configs
        const fromSpeaker = getSpeakerConfig(extEvent.from || 'general_manager');
        const toSpeaker = getSpeakerConfig(extEvent.toAgent || toAgent);

        // Create delegation message
        const delegationMessage: AgUiMessage = {
            id: extEvent.messageId || `delegation_${Date.now()}`,
            role: 'assistant',
            content: `Delegando a ${toAgent}...`,
            speaker: fromSpeaker,
            timestamp: new Date(),
            eventType: 'delegation',
            delegationTarget: toSpeaker,
            delegationPurpose: department
        };

        // Add to messages
        const messages = this.messagesSubject.value;
        this.messagesSubject.next([...messages, delegationMessage]);
    }

    private handleVote(event: AgUiEvent): void {
        const extEvent = event as any;
        const vote = extEvent.vote; // 'APPROVE', 'REJECT', 'PENDING'
        const reason = extEvent.reason;
        const department = extEvent.department;
        const agentName = extEvent.agent || department || 'unknown';

        console.log('[AgUiService] 🗳️ Vote:', agentName, vote);

        // Update negotiation state when a vote is received
        const negState = this.negotiationStateSubject.value;
        if (negState.isActive) {
            const voterIndex = negState.voters.findIndex(v =>
                v.department === department ||
                agentName.includes(v.department) ||
                v.id.includes(department || '')
            );

            if (voterIndex >= 0) {
                negState.voters[voterIndex].status = 'voted';
                negState.voters[voterIndex].vote = vote;
                this.negotiationStateSubject.next({ ...negState });
                console.log('[AgUiService] 🗳️ Vote recorded:', negState.voters[voterIndex].name, vote);
            }
        }

        // Get speaker config
        const speaker = getSpeakerConfig(
            department ? `${department}_orchestrator` : 'general_manager'
        );

        // Create vote message
        const voteMessage: AgUiMessage = {
            id: extEvent.messageId || `vote_${Date.now()}`,
            role: 'assistant',
            content: reason || `Voto: ${vote}`,
            speaker: speaker,
            timestamp: new Date(),
            eventType: 'vote',
            vote: vote as 'APPROVE' | 'REJECT' | 'PENDING',
            voteReason: reason
        };

        // Add to messages
        const messages = this.messagesSubject.value;
        this.messagesSubject.next([...messages, voteMessage]);
    }

    private handleConsensusReached(event: AgUiEvent): void {
        const extEvent = event as any;
        const decision = extEvent.decision || 'Consenso alcanzado';
        const votesSummary = extEvent.votesSummary || {};

        console.log('[AgUiService] ✅ Consensus reached:', decision);

        // Mark negotiation as completed
        const negState = this.negotiationStateSubject.value;
        negState.isActive = false;
        negState.phase = 'completed';
        this.negotiationStateSubject.next({ ...negState });
        console.log('[AgUiService] 🗳️ Negotiation completed');

        // Get speaker config (consensus resolver or CEO)
        const speaker = getSpeakerConfig('synthesis_agent');

        // Create consensus message
        const consensusMessage: AgUiMessage = {
            id: extEvent.messageId || `consensus_${Date.now()}`,
            role: 'assistant',
            content: decision,
            speaker: speaker,
            timestamp: new Date(),
            eventType: 'consensus_reached',
            consensusDecision: decision,
            votesSummary: votesSummary
        };

        // Add to messages
        const messages = this.messagesSubject.value;
        this.messagesSubject.next([...messages, consensusMessage]);
    }

    // ==========================================================================
    // Chat Pro Compatibility Handlers
    // ==========================================================================

    private handleUserMessage(event: AgUiEvent): void {
        // El mensaje del usuario ya se agregó en sendMessage() para UX instantánea
        // Solo logueamos para debug, NO agregamos otro mensaje para evitar duplicación
        console.log('[AgUiService] 👤 User message event received (already added locally)');
    }

    private handleAgentMessage(event: AgUiEvent): void {
        const extEvent = event as any;
        const backendSpeaker = extEvent.speaker;

        console.log('[AgUiService] AGENT_MESSAGE:', {
            messageId: extEvent.messageId,
            speaker: backendSpeaker?.display_name || backendSpeaker?.name
        });

        // Convert backend speaker to AgUiSpeaker format
        let speaker: AgUiSpeaker;
        if (backendSpeaker) {
            const dept = backendSpeaker.department || backendSpeaker.type;
            const personName = this.mapDisplayNameToPersonName(backendSpeaker.display_name, dept);

            speaker = {
                id: backendSpeaker.agent_id || backendSpeaker.name || 'general_manager',
                name: personName,
                displayName: personName,
                department: this.mapDepartment(dept),
                color: backendSpeaker.color || '#6366f1',
                icon: this.mapAvatarToIcon(backendSpeaker.avatar),
                emoji: this.getEmojiForDepartment(dept)
            };
        } else {
            speaker = getSpeakerConfig('general_manager');
        }

        // Update current speaker in agent state
        const currentState = this.agentStateSubject.value;
        if (!currentState.activeAgents.includes(speaker.id)) {
            currentState.activeAgents.push(speaker.id);
        }
        currentState.currentSpeaker = speaker.id;
        this.agentStateSubject.next({ ...currentState });

        // CRITICAL: Update speaker in existing message if messageId matches
        // This ensures the message shows the correct avatar even if TEXT_MESSAGE_START
        // was processed before we knew the speaker
        if (extEvent.messageId) {
            const messages = this.messagesSubject.value;
            const existingIndex = messages.findIndex(m => m.id === extEvent.messageId);

            if (existingIndex >= 0) {
                const existingMessage = messages[existingIndex];
                // Only update if the speaker is different (better info from AGENT_MESSAGE)
                if (existingMessage.speaker?.id !== speaker.id) {
                    console.log('[AgUiService] Updating message speaker:', {
                        messageId: extEvent.messageId,
                        oldSpeaker: existingMessage.speaker?.name,
                        newSpeaker: speaker.name
                    });
                    messages[existingIndex] = {
                        ...existingMessage,
                        speaker: speaker
                    };
                    this.messagesSubject.next([...messages]);
                }
            }
        }

        // Also update currentMessage if it's streaming
        if (this.currentMessage && this.currentMessage.id === extEvent.messageId) {
            this.currentMessage.speaker = speaker;
        }
    }

    private handleFinalResponse(event: AgUiEvent): void {
        const extEvent = event as any;
        console.log('[AgUiService] 🏁 Final response received');

        // Final response is typically already handled by TEXT_MESSAGE_END
        // This is for compatibility with chat_pro frontend
        // Only add if the message doesn't already exist
        const messages = this.messagesSubject.value;
        const existingMessage = messages.find(m => m.id === extEvent.messageId);

        if (!existingMessage && extEvent.message) {
            const speaker = extEvent.speaker || getSpeakerConfig('general_manager');
            const finalMessage: AgUiMessage = {
                id: extEvent.messageId || `final_${Date.now()}`,
                role: 'assistant',
                content: extEvent.message,
                speaker: speaker,
                timestamp: new Date(extEvent.timestamp || Date.now()),
                eventType: 'final_response'
            };
            this.messagesSubject.next([...messages, finalMessage]);
        }
    }

    private handleNegotiationRound(event: AgUiEvent): void {
        const extEvent = event as any;
        const round = extEvent.round || 1;
        const newProposal = extEvent.newProposal;

        console.log('[AgUiService] 🔄 Negotiation round:', round);

        // Get speaker config
        const speaker = extEvent.speaker || getSpeakerConfig('synthesis_agent');

        // Create negotiation round message
        const roundMessage: AgUiMessage = {
            id: extEvent.messageId || `round_${Date.now()}`,
            role: 'assistant',
            content: extEvent.message || `Ronda ${round} de negociación`,
            speaker: speaker,
            timestamp: new Date(extEvent.timestamp || Date.now()),
            eventType: 'negotiation_round'
        };

        // Add to messages
        const messages = this.messagesSubject.value;
        this.messagesSubject.next([...messages, roundMessage]);
    }

    // ==========================================================================
    // Helper Methods
    // ==========================================================================

    private applyJsonPatch(state: any, op: { op: string; path: string; value?: any }): void {
        const pathParts = op.path.split('/').filter(p => p);

        if (op.op === 'replace') {
            let current = state;
            for (let i = 0; i < pathParts.length - 1; i++) {
                current = current[pathParts[i]];
            }
            current[pathParts[pathParts.length - 1]] = op.value;
        } else if (op.op === 'add') {
            const lastPart = pathParts[pathParts.length - 1];
            let current = state;
            for (let i = 0; i < pathParts.length - 1; i++) {
                current = current[pathParts[i]];
            }
            if (lastPart === '-' && Array.isArray(current)) {
                // Special case: append to array
                const parentPath = pathParts.slice(0, -1);
                let parent = state;
                for (const p of parentPath) {
                    parent = parent[p];
                }
                if (Array.isArray(parent)) {
                    parent.push(op.value);
                }
            } else {
                current[lastPart] = op.value;
            }
        } else if (op.op === 'remove') {
            let current = state;
            for (let i = 0; i < pathParts.length - 1; i++) {
                current = current[pathParts[i]];
            }
            delete current[pathParts[pathParts.length - 1]];
        }
    }

    private finalizeCurrentMessage(): void {
        if (this.currentMessage) {
            this.currentMessage.isStreaming = false;

            const messages = this.messagesSubject.value;
            const existingIndex = messages.findIndex(m => m.id === this.currentMessage!.id);

            if (existingIndex >= 0) {
                messages[existingIndex] = { ...this.currentMessage };
                this.messagesSubject.next([...messages]);
            } else if (this.currentMessage.content.trim()) {
                this.messagesSubject.next([...messages, { ...this.currentMessage }]);
            }

            this.currentMessage = null;
        }
    }

    private finishExecution(): void {
        console.log('[AgUiService] Finishing execution');
        this.clearTimeouts();
        this.isRunningSubject.next(false);

        // Reset negotiation state after a delay to allow UI to show completion
        setTimeout(() => {
            const negState = this.negotiationStateSubject.value;
            if (negState.phase === 'completed') {
                this.negotiationStateSubject.next({
                    isActive: false,
                    phase: 'idle',
                    voters: [],
                    currentRound: 0,
                    maxRounds: 3
                });
            }
        }, 3000);
    }

    private startExecutionTimeout(): void {
        this.executionTimeout = setTimeout(() => {
            console.warn('[AgUiService] Execution timeout reached');
            this.finishExecution();
        }, this.EXECUTION_TIMEOUT_MS);
    }

    private resetIdleTimeout(): void {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }
        this.idleTimeout = setTimeout(() => {
            console.warn('[AgUiService] Idle timeout reached');
            this.finishExecution();
        }, this.IDLE_TIMEOUT_MS);
    }

    private clearTimeouts(): void {
        if (this.executionTimeout) {
            clearTimeout(this.executionTimeout);
            this.executionTimeout = null;
        }
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }

    /**
     * Clears all messages and resets state
     * Also resets the session to start a fresh conversation
     */
    clearMessages(): void {
        this.messagesSubject.next([]);
        this.toolCallsSubject.next(new Map());
        this.agentStateSubject.next({ activeAgents: [], currentSpeaker: null });
        this.currentMessage = null;
        // Reset session to force a new conversation context
        this.currentSessionId = null;
        // Reset negotiation state
        this.negotiationStateSubject.next({
            isActive: false,
            phase: 'idle',
            voters: [],
            currentRound: 0,
            maxRounds: 3
        });
        console.log('[AgUiService] 🗑️ Messages and session cleared');
    }

    /**
     * Gets current messages
     */
    getMessages(): AgUiMessage[] {
        return this.messagesSubject.value;
    }

    /**
     * Gets current tool calls
     */
    getToolCalls(): Map<string, AgUiToolCall> {
        return this.toolCallsSubject.value;
    }

    /**
     * Gets current agent state
     */
    getAgentState(): AgUiAgentState {
        return this.agentStateSubject.value;
    }

    // ==========================================================================
    // Session Management Methods
    // ==========================================================================

    /**
     * Lista todas las sesiones de chat de una empresa
     */
    async listSessions(company: string): Promise<AgUiSession[]> {
        try {
            const response = await fetch(
                `${this.baseUrl}/sessions/${encodeURIComponent(company)}`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const sessions = data.sessions || [];
            this.sessionsSubject.next(sessions);
            return sessions;
        } catch (error) {
            console.error('[AgUiService] Error listing sessions:', error);
            this.errorSubject.next('Error al cargar sesiones');
            return [];
        }
    }

    /**
     * Crea una nueva sesion de chat
     */
    async createSession(company: string, title?: string): Promise<string | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/sessions/${encodeURIComponent(company)}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: title || 'Nueva conversación' })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentSessionId = data.session_id;
            console.log('[AgUiService] Nueva sesion creada:', this.currentSessionId);

            // Refrescar lista de sesiones
            await this.listSessions(company);

            return this.currentSessionId;
        } catch (error) {
            console.error('[AgUiService] Error creating session:', error);
            this.errorSubject.next('Error al crear sesión');
            return null;
        }
    }

    /**
     * Elimina una sesion de chat
     */
    async deleteSession(company: string, sessionId: string): Promise<boolean> {
        try {
            const response = await fetch(
                `${this.baseUrl}/sessions/${encodeURIComponent(company)}/${encodeURIComponent(sessionId)}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Si la sesion eliminada es la actual, limpiar
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
            }

            // Refrescar lista de sesiones
            await this.listSessions(company);

            return true;
        } catch (error) {
            console.error('[AgUiService] Error deleting session:', error);
            this.errorSubject.next('Error al eliminar sesión');
            return false;
        }
    }

    /**
     * Carga el historial de una sesion
     */
    async loadHistory(company: string, sessionId: string): Promise<AgUiSessionHistory | null> {
        try {
            const response = await fetch(
                `${this.baseUrl}/sessions/${encodeURIComponent(company)}/${encodeURIComponent(sessionId)}/history`,
                { method: 'GET' }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.currentSessionId = sessionId;

            return {
                session_id: data.session_id,
                title: data.title,
                messages: data.messages || [],
                state: data.state
            };
        } catch (error) {
            console.error('[AgUiService] Error loading history:', error);
            this.errorSubject.next('Error al cargar historial');
            return null;
        }
    }

    /**
     * Convierte mensajes del historial a AgUiMessages
     */
    convertHistoryToMessages(history: AgUiSessionHistory): AgUiMessage[] {
        return history.messages.map((msg, index) => {
            const isUser = msg.author === 'user' || msg.author?.includes('user');

            return {
                id: `history_${index}_${Date.now()}`,
                role: isUser ? 'user' : 'assistant',
                content: msg.text,
                speaker: isUser ? AGUI_SPEAKER_CONFIG['user'] : getSpeakerConfig(msg.author || 'general_manager'),
                timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date()
            } as AgUiMessage;
        });
    }

    /**
     * Inicia una nueva conversacion (limpia sesion actual)
     */
    startNewConversation(): void {
        this.currentSessionId = null;
        console.log('[AgUiService] Nueva conversacion iniciada (sin sesion)');
    }

    /**
     * Cleanup on destroy
     */
    ngOnDestroy(): void {
        this.clearTimeouts();
        this.messagesSubject.complete();
        this.toolCallsSubject.complete();
        this.agentStateSubject.complete();
        this.isRunningSubject.complete();
        this.errorSubject.complete();
        this.threadIdSubject.complete();
        this.sessionsSubject.complete();
    }
}
