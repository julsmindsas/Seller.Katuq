/**
 * AG-UI v2 Service
 *
 * Handles communication with the AG-UI v2 backend endpoint.
 * Implements:
 * - SSE streaming for real-time events
 * - A2UI payload processing
 * - Interrupt (HITL) handling
 * - Activity tracking
 * - Session management
 *
 * Based on AG-UI Protocol: https://docs.ag-ui.com/
 */

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

import {
  AgUiV2Event,
  AgUiV2Message,
  AgUiV2ToolCall,
  AgUiV2State,
  AgUiV2Session,
  AgUiV2Request,
  AgUiV2InterruptRequest,
  AgUiInterruptPayload,
  AgUiSpeaker,
  A2UISurfaceUpdate,
  A2UIDataModelUpdate,
  KatuqCustomEventType,
  AGUI_V2_SPEAKERS,
  getSpeaker,
  isCustomEvent
} from '../models/agui-v2.model';

@Injectable({
  providedIn: 'root'
})
export class AgUiV2Service implements OnDestroy {
  // Backend URL
  private readonly backendUrl = environment.adkBackendApi || 'http://localhost:8080';

  // State
  private state: AgUiV2State = {
    isRunning: false,
    activeAgents: [],
    currentSpeaker: undefined,
    activities: new Map(),
    surfaces: new Map(),
    dataModels: new Map(),
    pendingInterrupt: undefined
  };

  // Observables
  private messagesSubject = new BehaviorSubject<AgUiV2Message[]>([]);
  private stateSubject = new BehaviorSubject<AgUiV2State>(this.state);
  private eventSubject = new Subject<AgUiV2Event>();
  private errorSubject = new Subject<string>();
  private surfaceSubject = new Subject<{ surfaceId: string; update: A2UISurfaceUpdate }>();
  private dataModelSubject = new Subject<{ surfaceId: string; update: A2UIDataModelUpdate }>();
  private interruptSubject = new Subject<AgUiInterruptPayload>();

  // Current state
  private messages: AgUiV2Message[] = [];
  private currentMessageId: string | null = null;
  private currentMessage: AgUiV2Message | null = null;
  private toolCalls: Map<string, AgUiV2ToolCall> = new Map();
  private abortController: AbortController | null = null;

  // Session
  private sessionId: string | null = null;
  private company: string | null = null;

  // Timeouts
  private executionTimeout: any;
  private idleTimeout: any;
  private readonly EXECUTION_TIMEOUT_MS = 120000; // 2 minutes
  private readonly IDLE_TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    console.log('[AgUiV2Service] Initialized with backend:', this.backendUrl);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ========================
  // PUBLIC OBSERVABLES
  // ========================

  get messages$(): Observable<AgUiV2Message[]> {
    return this.messagesSubject.asObservable();
  }

  get state$(): Observable<AgUiV2State> {
    return this.stateSubject.asObservable();
  }

  get events$(): Observable<AgUiV2Event> {
    return this.eventSubject.asObservable();
  }

  get errors$(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  get surfaces$(): Observable<{ surfaceId: string; update: A2UISurfaceUpdate }> {
    return this.surfaceSubject.asObservable();
  }

  get dataModels$(): Observable<{ surfaceId: string; update: A2UIDataModelUpdate }> {
    return this.dataModelSubject.asObservable();
  }

  get interrupts$(): Observable<AgUiInterruptPayload> {
    return this.interruptSubject.asObservable();
  }

  get isRunning(): boolean {
    return this.state.isRunning;
  }

  get activeAgents(): string[] {
    return this.state.activeAgents;
  }

  // ========================
  // MAIN API
  // ========================

  /**
   * Send a message to the AG-UI v2 endpoint
   */
  async sendMessage(
    company: string,
    content: string,
    sessionId?: string
  ): Promise<void> {
    if (this.state.isRunning) {
      console.warn('[AgUiV2Service] Already running, canceling previous request');
      this.cancel();
    }

    this.company = company;
    this.sessionId = sessionId || this.sessionId || this.generateSessionId();

    // Add user message
    const userMessage: AgUiV2Message = {
      id: this.generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      speaker: {
        id: 'user',
        name: 'Usuario',
        displayName: 'Usuario',
        color: '#64748b',
        avatar: 'user',
        type: 'user'
      }
    };
    this.addMessage(userMessage);

    // Prepare request
    const request: AgUiV2Request = {
      company,
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      session_id: this.sessionId,
      capabilities: {
        a2ui: true,
        catalogs: ['katuq-standard-v1'],
        interrupts: true
      }
    };

    // Start streaming
    await this.streamRequest(request);
  }

  /**
   * Send interrupt response (HITL)
   */
  async sendInterruptResponse(response: AgUiV2InterruptRequest): Promise<void> {
    try {
      const res = await fetch(`${this.backendUrl}/agui/v2/interrupt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      });

      if (!res.ok) {
        throw new Error(`Interrupt response failed: ${res.status}`);
      }

      // Clear pending interrupt
      this.state.pendingInterrupt = undefined;
      this.updateState();

    } catch (error) {
      console.error('[AgUiV2Service] Interrupt response error:', error);
      this.errorSubject.next(`Error al enviar respuesta: ${error}`);
    }
  }

  /**
   * Cancel current request
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.cleanup();
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
    this.messagesSubject.next([]);
    this.sessionId = null;
  }

  // ========================
  // STREAMING
  // ========================

  private async streamRequest(request: AgUiV2Request): Promise<void> {
    this.abortController = new AbortController();
    this.startTimeouts();
    this.setRunning(true);

    try {
      const response = await fetch(`${this.backendUrl}/agui/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[AgUiV2Service] Stream completed');
          break;
        }

        this.resetIdleTimeout();
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              this.processEvent(dataStr);
            }
          } else if (line.startsWith(': keep-alive')) {
            // Ignore keep-alive
          }
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[AgUiV2Service] Request aborted');
      } else {
        console.error('[AgUiV2Service] Stream error:', error);
        this.errorSubject.next(`Error de conexión: ${error.message}`);
      }
    } finally {
      this.cleanup();
    }
  }

  // ========================
  // EVENT PROCESSING
  // ========================

  private processEvent(dataStr: string): void {
    try {
      const event: AgUiV2Event = JSON.parse(dataStr);
      console.log('[AgUiV2Service] Event:', event.type, event.customType || '');

      // Emit raw event
      this.eventSubject.next(event);

      // Handle by type
      if (event.type === 'CUSTOM' && event.customType) {
        this.handleCustomEvent(event);
      } else {
        this.handleStandardEvent(event);
      }

    } catch (error) {
      console.error('[AgUiV2Service] Event parse error:', error, dataStr);
    }
  }

  private handleStandardEvent(event: AgUiV2Event): void {
    switch (event.type) {
      // Lifecycle
      case 'RUN_STARTED':
        this.handleRunStarted(event);
        break;
      case 'RUN_FINISHED':
        this.handleRunFinished(event);
        break;
      case 'RUN_ERROR':
        this.handleRunError(event);
        break;
      case 'STEP_STARTED':
        this.handleStepStarted(event);
        break;
      case 'STEP_FINISHED':
        this.handleStepFinished(event);
        break;

      // Text Messages
      case 'TEXT_MESSAGE_START':
        this.handleTextMessageStart(event);
        break;
      case 'TEXT_MESSAGE_CONTENT':
        this.handleTextMessageContent(event);
        break;
      case 'TEXT_MESSAGE_END':
        this.handleTextMessageEnd(event);
        break;

      // Tool Calls
      case 'TOOL_CALL_START':
        this.handleToolCallStart(event);
        break;
      case 'TOOL_CALL_ARGS':
        this.handleToolCallArgs(event);
        break;
      case 'TOOL_CALL_RESULT':
        this.handleToolCallResult(event);
        break;
      case 'TOOL_CALL_END':
        this.handleToolCallEnd(event);
        break;

      // State
      case 'STATE_SNAPSHOT':
        this.handleStateSnapshot(event);
        break;
      case 'STATE_DELTA':
        this.handleStateDelta(event);
        break;
      case 'MESSAGES_SNAPSHOT':
        this.handleMessagesSnapshot(event);
        break;

      // Activity
      case 'ACTIVITY_SNAPSHOT':
        this.handleActivitySnapshot(event);
        break;
      case 'ACTIVITY_DELTA':
        this.handleActivityDelta(event);
        break;

      // Interrupt
      case 'INTERRUPT':
        this.handleInterrupt(event);
        break;
    }
  }

  private handleCustomEvent(event: AgUiV2Event): void {
    switch (event.customType) {
      // Multi-agent
      case 'katuq:AGENT_JOINED':
        this.handleAgentJoined(event);
        break;
      case 'katuq:AGENT_THINKING':
        this.handleAgentThinking(event);
        break;
      case 'katuq:DELEGATION':
        this.handleDelegation(event);
        break;

      // Voting
      case 'katuq:VOTE':
        this.handleVote(event);
        break;
      case 'katuq:CONSENSUS_REACHED':
        this.handleConsensus(event);
        break;
      case 'katuq:NEGOTIATION_ROUND':
        this.handleNegotiationRound(event);
        break;

      // A2UI
      case 'katuq:SURFACE_UPDATE':
        this.handleSurfaceUpdate(event);
        break;
      case 'katuq:DATA_MODEL_UPDATE':
        this.handleDataModelUpdate(event);
        break;
      case 'katuq:BEGIN_RENDERING':
        this.handleBeginRendering(event);
        break;

      // Compatibility
      case 'katuq:USER_MESSAGE':
        // Already handled when sending
        break;
      case 'katuq:FINAL_RESPONSE':
        this.handleFinalResponse(event);
        break;
    }
  }

  // ========================
  // LIFECYCLE HANDLERS
  // ========================

  private handleRunStarted(event: AgUiV2Event): void {
    console.log('[AgUiV2Service] Run started:', event.runId);
    this.setRunning(true);
    this.state.activeAgents = [];
    this.updateState();
  }

  private handleRunFinished(event: AgUiV2Event): void {
    console.log('[AgUiV2Service] Run finished');
    this.finalizeCurrentMessage();
    this.setRunning(false);
  }

  private handleRunError(event: AgUiV2Event): void {
    console.error('[AgUiV2Service] Run error:', event.message);
    this.errorSubject.next(event.message || 'Error desconocido');
    this.setRunning(false);
  }

  private handleStepStarted(event: AgUiV2Event): void {
    console.log('[AgUiV2Service] Step started:', event.stepName);
    // Track step in activities
    if (event.stepId) {
      this.state.activities.set(event.stepId, {
        type: 'step',
        status: 'running',
        message: event.stepName || 'Processing'
      });
      this.updateState();
    }
  }

  private handleStepFinished(event: AgUiV2Event): void {
    console.log('[AgUiV2Service] Step finished:', event.stepId);
    if (event.stepId && this.state.activities.has(event.stepId)) {
      const activity = this.state.activities.get(event.stepId)!;
      activity.status = 'completed';
      this.updateState();
    }
  }

  // ========================
  // TEXT MESSAGE HANDLERS
  // ========================

  private handleTextMessageStart(event: AgUiV2Event): void {
    this.currentMessageId = event.messageId || this.generateMessageId();

    this.currentMessage = {
      id: this.currentMessageId,
      role: 'assistant',
      content: '',
      timestamp: event.timestamp || new Date().toISOString(),
      speaker: event.speaker || this.state.currentSpeaker,
      isStreaming: true,
      toolCalls: [],
      artifacts: []
    };

    this.addMessage(this.currentMessage);
  }

  private handleTextMessageContent(event: AgUiV2Event): void {
    if (this.currentMessage && event.delta) {
      this.currentMessage.content += event.delta;
      this.updateMessages();
    }
  }

  private handleTextMessageEnd(event: AgUiV2Event): void {
    this.finalizeCurrentMessage();
  }

  // ========================
  // TOOL CALL HANDLERS
  // ========================

  private handleToolCallStart(event: AgUiV2Event): void {
    if (!event.toolCallId) return;

    const toolCall: AgUiV2ToolCall = {
      id: event.toolCallId,
      name: event.toolCallName || 'unknown',
      displayName: event.toolDisplayName || event.toolCallName || 'Tool',
      status: 'executing',
      message: event.message
    };

    this.toolCalls.set(event.toolCallId, toolCall);

    // Add to current message
    if (this.currentMessage) {
      this.currentMessage.toolCalls = this.currentMessage.toolCalls || [];
      this.currentMessage.toolCalls.push(toolCall);
      this.updateMessages();
    }
  }

  private handleToolCallArgs(event: AgUiV2Event): void {
    if (!event.toolCallId) return;

    const toolCall = this.toolCalls.get(event.toolCallId);
    if (toolCall) {
      try {
        toolCall.args = event.args || JSON.parse(event.delta || '{}');
      } catch {
        toolCall.args = { raw: event.delta };
      }
      this.updateMessages();
    }
  }

  private handleToolCallResult(event: AgUiV2Event): void {
    if (!event.toolCallId) return;

    const toolCall = this.toolCalls.get(event.toolCallId);
    if (toolCall) {
      try {
        toolCall.result = JSON.parse(event.result || '{}');
      } catch {
        toolCall.result = event.result;
      }

      // Handle A2UI payload
      if (event.a2ui) {
        this.processA2UIPayload(event.a2ui);
        toolCall.a2ui = event.a2ui;
      }

      this.updateMessages();
    }
  }

  private handleToolCallEnd(event: AgUiV2Event): void {
    if (!event.toolCallId) return;

    const toolCall = this.toolCalls.get(event.toolCallId);
    if (toolCall) {
      toolCall.status = 'completed';
      toolCall.message = event.message;
      toolCall.requiresConfirmation = event.requiresConfirmation;

      // Handle A2UI payload
      if (event.a2ui) {
        this.processA2UIPayload(event.a2ui);
        toolCall.a2ui = event.a2ui;

        // Add artifact to message
        if (this.currentMessage && event.a2ui.surfaceUpdate) {
          this.currentMessage.artifacts = this.currentMessage.artifacts || [];
          this.currentMessage.artifacts.push(event.a2ui.surfaceUpdate);
        }
      }

      this.updateMessages();
    }
  }

  // ========================
  // STATE HANDLERS
  // ========================

  private handleStateSnapshot(event: AgUiV2Event): void {
    if (event.snapshot) {
      if (event.snapshot.activeAgents) {
        this.state.activeAgents = event.snapshot.activeAgents;
      }
      this.updateState();
    }
  }

  private handleStateDelta(event: AgUiV2Event): void {
    // Apply JSON Patch operations
    // For now, handle common cases
    const delta = (event as any).delta;
    if (Array.isArray(delta)) {
      for (const op of delta) {
        if (op.path === '/activeAgents/-' && op.op === 'add') {
          this.state.activeAgents.push(op.value);
        } else if (op.path === '/currentSpeaker' && op.op === 'replace') {
          this.state.currentSpeaker = getSpeaker(op.value);
        }
      }
      this.updateState();
    }
  }

  private handleMessagesSnapshot(event: AgUiV2Event): void {
    // Sync messages with server state
    if (event.messages) {
      console.log('[AgUiV2Service] Messages snapshot:', event.messages.length);
    }
  }

  // ========================
  // ACTIVITY HANDLERS
  // ========================

  private handleActivitySnapshot(event: AgUiV2Event): void {
    if (event.activities) {
      this.state.activities.clear();
      for (const activity of event.activities) {
        this.state.activities.set(activity.id, {
          type: activity.type,
          status: activity.status,
          message: activity.message || ''
        });
      }
      this.updateState();
    }
  }

  private handleActivityDelta(event: AgUiV2Event): void {
    const delta = (event as any).delta;
    if (Array.isArray(delta)) {
      // Apply activity changes
      this.updateState();
    }
  }

  // ========================
  // INTERRUPT HANDLER
  // ========================

  private handleInterrupt(event: AgUiV2Event): void {
    const interrupt: AgUiInterruptPayload = {
      interruptId: event.interruptId!,
      interruptType: event.interruptType!,
      title: event.title!,
      message: event.message!,
      resumeToken: event.resumeToken!,
      actions: event.actions || [],
      toolName: event.toolName,
      toolArgs: event.toolArgs,
      artifact: event.artifact as A2UISurfaceUpdate,
      timeout: event.timeout,
      expiresAt: event.expiresAt
    };

    this.state.pendingInterrupt = interrupt;
    this.updateState();

    // Emit for UI
    this.interruptSubject.next(interrupt);

    // Add to current message
    if (this.currentMessage) {
      this.currentMessage.interrupt = interrupt;
      this.updateMessages();
    }
  }

  // ========================
  // CUSTOM EVENT HANDLERS
  // ========================

  private handleAgentJoined(event: AgUiV2Event): void {
    const agentId = event.agent || 'unknown';

    if (!this.state.activeAgents.includes(agentId)) {
      this.state.activeAgents.push(agentId);
    }

    this.state.currentSpeaker = {
      id: agentId,
      name: event.displayName || agentId,
      displayName: event.displayName || agentId,
      department: event.department as any,
      color: event.color || '#6b7280',
      avatar: event.avatar || 'user',
      type: (event as any).type || 'sub_agent'
    };

    this.updateState();
  }

  private handleAgentThinking(event: AgUiV2Event): void {
    // Could show thinking indicator
    console.log('[AgUiV2Service] Agent thinking:', event.agent, event.displayName);
  }

  private handleDelegation(event: AgUiV2Event): void {
    // Add delegation message
    const delegationMessage: AgUiV2Message = {
      id: event.messageId || this.generateMessageId(),
      role: 'assistant',
      content: event.message || `Delegando a ${event.to}...`,
      timestamp: event.timestamp || new Date().toISOString(),
      speaker: this.state.currentSpeaker,
      delegation: {
        messageId: event.messageId!,
        from: event.from!,
        to: event.to!,
        toAgent: event.toAgent!,
        department: event.department,
        message: event.message!,
        mentions: event.mentions || []
      }
    };

    this.addMessage(delegationMessage);
  }

  private handleVote(event: AgUiV2Event): void {
    const voteMessage: AgUiV2Message = {
      id: event.messageId || this.generateMessageId(),
      role: 'assistant',
      content: event.message || `Voto: ${event.vote}`,
      timestamp: event.timestamp || new Date().toISOString(),
      speaker: event.speaker as AgUiSpeaker,
      vote: {
        messageId: event.messageId!,
        timestamp: event.timestamp!,
        speaker: event.speaker as AgUiSpeaker,
        vote: event.vote as any,
        reason: event.reason,
        department: event.department,
        agent: event.agent!,
        message: event.message!
      }
    };

    this.addMessage(voteMessage);
  }

  private handleConsensus(event: AgUiV2Event): void {
    const consensusMessage: AgUiV2Message = {
      id: event.messageId || this.generateMessageId(),
      role: 'assistant',
      content: event.message || `Consenso: ${event.decision}`,
      timestamp: event.timestamp || new Date().toISOString(),
      speaker: AGUI_V2_SPEAKERS['general_manager']
    };

    this.addMessage(consensusMessage);
  }

  private handleNegotiationRound(event: AgUiV2Event): void {
    console.log('[AgUiV2Service] Negotiation round:', event.round);
  }

  private handleFinalResponse(event: AgUiV2Event): void {
    // Ensure final message is added/updated
    if (this.currentMessage) {
      this.currentMessage.content = event.message || this.currentMessage.content;
      this.finalizeCurrentMessage();
    }
  }

  // ========================
  // A2UI HANDLERS
  // ========================

  private handleSurfaceUpdate(event: AgUiV2Event): void {
    if (event.surfaceUpdate) {
      const { surfaceId, components } = event.surfaceUpdate;
      this.state.surfaces.set(surfaceId, event.surfaceUpdate);
      this.surfaceSubject.next({ surfaceId, update: event.surfaceUpdate });
    }
  }

  private handleDataModelUpdate(event: AgUiV2Event): void {
    if (event.dataModelUpdate) {
      const { surfaceId, path, contents } = event.dataModelUpdate;

      // Get or create data model for surface
      let dataModel = this.state.dataModels.get(surfaceId) || {};

      // Apply update
      for (const content of contents) {
        if (content.valueString !== undefined) {
          dataModel[content.key] = content.valueString;
        } else if (content.valueNumber !== undefined) {
          dataModel[content.key] = content.valueNumber;
        } else if (content.valueBoolean !== undefined) {
          dataModel[content.key] = content.valueBoolean;
        } else if (content.valueArray !== undefined) {
          dataModel[content.key] = content.valueArray;
        } else if (content.valueMap !== undefined) {
          dataModel[content.key] = this.processDataModelMap(content.valueMap);
        }
      }

      this.state.dataModels.set(surfaceId, dataModel);
      this.dataModelSubject.next({ surfaceId, update: event.dataModelUpdate });
    }
  }

  private handleBeginRendering(event: AgUiV2Event): void {
    if (event.beginRendering) {
      console.log('[AgUiV2Service] Begin rendering:', event.beginRendering);
    }
  }

  private processA2UIPayload(payload: any): void {
    if (payload.surfaceUpdate) {
      const { surfaceId } = payload.surfaceUpdate;
      this.state.surfaces.set(surfaceId, payload.surfaceUpdate);
      this.surfaceSubject.next({ surfaceId, update: payload.surfaceUpdate });
    }

    if (payload.dataModelUpdate) {
      const { surfaceId, path, contents } = payload.dataModelUpdate;
      let dataModel = this.state.dataModels.get(surfaceId) || {};

      for (const content of contents) {
        if (content.valueArray !== undefined) {
          dataModel[content.key] = content.valueArray;
        } else if (content.valueMap !== undefined) {
          dataModel[content.key] = this.processDataModelMap(content.valueMap);
        }
      }

      this.state.dataModels.set(surfaceId, dataModel);
      this.dataModelSubject.next({ surfaceId, update: payload.dataModelUpdate });
    }
  }

  private processDataModelMap(map: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const item of map) {
      if (item.valueString !== undefined) result[item.key] = item.valueString;
      else if (item.valueNumber !== undefined) result[item.key] = item.valueNumber;
      else if (item.valueBoolean !== undefined) result[item.key] = item.valueBoolean;
      else if (item.valueArray !== undefined) result[item.key] = item.valueArray;
      else if (item.valueMap !== undefined) result[item.key] = this.processDataModelMap(item.valueMap);
    }
    return result;
  }

  // ========================
  // SESSION MANAGEMENT
  // ========================

  async listSessions(company: string): Promise<AgUiV2Session[]> {
    try {
      const res = await fetch(`${this.backendUrl}/sessions/${company}`);
      const data = await res.json();
      return data.sessions || [];
    } catch (error) {
      console.error('[AgUiV2Service] List sessions error:', error);
      return [];
    }
  }

  async createSession(company: string, title?: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.backendUrl}/sessions/${company}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      return data.session_id || null;
    } catch (error) {
      console.error('[AgUiV2Service] Create session error:', error);
      return null;
    }
  }

  async loadSessionHistory(company: string, sessionId: string): Promise<void> {
    try {
      const res = await fetch(`${this.backendUrl}/sessions/${company}/${sessionId}/history`);
      const data = await res.json();

      if (data.messages) {
        this.messages = data.messages.map((m: any) => ({
          id: this.generateMessageId(),
          role: m.author === 'user' ? 'user' : 'assistant',
          content: m.text,
          timestamp: m.timestamp,
          speaker: m.author === 'user' ? undefined : getSpeaker(m.author)
        }));
        this.messagesSubject.next([...this.messages]);
      }

      this.sessionId = sessionId;
    } catch (error) {
      console.error('[AgUiV2Service] Load history error:', error);
    }
  }

  async deleteSession(company: string, sessionId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.backendUrl}/sessions/${company}/${sessionId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (error) {
      console.error('[AgUiV2Service] Delete session error:', error);
      return false;
    }
  }

  // ========================
  // HELPERS
  // ========================

  private addMessage(message: AgUiV2Message): void {
    this.messages.push(message);
    this.updateMessages();
  }

  private updateMessages(): void {
    this.messagesSubject.next([...this.messages]);
  }

  private updateState(): void {
    this.stateSubject.next({ ...this.state });
  }

  private finalizeCurrentMessage(): void {
    if (this.currentMessage) {
      this.currentMessage.isStreaming = false;
      this.updateMessages();
    }
    this.currentMessage = null;
    this.currentMessageId = null;
  }

  private setRunning(running: boolean): void {
    this.state.isRunning = running;
    this.updateState();
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startTimeouts(): void {
    this.clearTimeouts();

    this.executionTimeout = setTimeout(() => {
      console.warn('[AgUiV2Service] Execution timeout');
      this.cancel();
      this.errorSubject.next('Tiempo de ejecución agotado');
    }, this.EXECUTION_TIMEOUT_MS);

    this.resetIdleTimeout();
  }

  private resetIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = setTimeout(() => {
      console.warn('[AgUiV2Service] Idle timeout');
      this.cleanup();
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

  private cleanup(): void {
    this.clearTimeouts();
    this.finalizeCurrentMessage();
    this.setRunning(false);
    this.abortController = null;
  }

  // ========================
  // DATA MODEL ACCESS
  // ========================

  getDataModel(surfaceId: string): Record<string, any> {
    return this.state.dataModels.get(surfaceId) || {};
  }

  getSurface(surfaceId: string): A2UISurfaceUpdate | undefined {
    return this.state.surfaces.get(surfaceId);
  }
}
