import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { ConversationMessage } from '../models/message.model';
import { environment } from '../../../../../environments/environment';

export interface StreamChunk {
  messageId: string;
  chunk: string;
  timestamp: string;
  isComplete: boolean;
  index: number;
  metadata?: {
    source: string;
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface StreamComplete {
  messageId: string;
  fullMessage: string;
  timestamp: string;
  totalTokens: number;
  executionTime: number;
  toolsExecuted: string[];
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;

  // Subjects para diferentes tipos de mensajes
  private messageSubject = new Subject<ConversationMessage>();
  private streamChunkSubject = new Subject<StreamChunk>();
  private streamCompleteSubject = new Subject<StreamComplete>();
  private streamErrorSubject = new Subject<{ messageId: string; error: string; code: string }>();
  private agentResponseSubject = new Subject<any>(); // Nuevo subject para respuestas de sub-agentes

  private connectionSubject = new BehaviorSubject<{ connected: boolean; sessionId?: string }>({ connected: false });

  private sessionId: string | null = null;
  private userId: string | null = null;
  private companyId: string | null = null;
  private agentId: string | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;

  private heartbeatInterval: any = null;

  // WebSocket URL desde environment
  private WS_URL = environment.agentBuilderWs;

  constructor() {
    console.log('[WebSocketService] 🚀 Service initialized');
    console.log(`[WebSocketService] 📍 WebSocket URL: ${this.WS_URL}`);
  }

  /**
   * Conectar al WebSocket server
   */
  connect(userId: string, companyId: string, agentId?: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[WebSocketService] ✅ Already connected');
      return;
    }

    this.userId = userId;
    this.companyId = companyId;
    this.agentId = agentId || null;
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const url = `${this.WS_URL}?sessionId=${this.sessionId}`;

    console.log(`[WebSocketService] 🔗 Connecting to ${url}`);

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = (event) => {
        console.log('[WebSocketService] ✅ Connected successfully');
        this.reconnectAttempts = 0;

        // Autenticar después de conectar
        this.authenticate(userId, companyId, agentId);

        // Iniciar heartbeat
        this.startHeartbeat();

        this.connectionSubject.next({ connected: true, sessionId: this.sessionId || undefined });
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (error) => {
        console.error('[WebSocketService] ❌ WebSocket error:', error);
      };

      this.socket.onclose = (event) => {
        console.log(`[WebSocketService] 🔌 Connection closed (code: ${event.code})`);
        this.connectionSubject.next({ connected: false });
        this.stopHeartbeat();

        // Intentar reconectar
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WebSocketService] 🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            if (this.userId && this.companyId) {
              this.connect(this.userId, this.companyId, this.agentId || undefined);
            }
          }, this.reconnectInterval);
        }
      };

    } catch (error) {
      console.error('[WebSocketService] ❌ Error creating WebSocket:', error);
      this.connectionSubject.next({ connected: false });
    }
  }

  /**
   * Autenticar sesión
   */
  private authenticate(userId: string, companyId: string, agentId?: string): void {
    this.send({
      type: 'authenticate',
      data: {
        userId,
        companyId,
        agentId: agentId || null
      }
    });
  }

  /**
   * Manejar mensaje del servidor
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log(`[WebSocketService] 📨 ${message.type}`);

      switch (message.type) {
        case 'connected':
        case 'authenticated':
        case 'message_received':
          // Mensajes de confirmación - no hacer nada
          break;

        case 'stream_chunk':
          this.streamChunkSubject.next(message.data);
          break;

        case 'stream_complete':
          this.streamCompleteSubject.next(message.data);
          break;

        case 'stream_error':
          this.streamErrorSubject.next(message.data);
          break;

        case 'agent_response':
          this.agentResponseSubject.next(message.data);
          break;

        case 'error':
          console.error('[WebSocketService] ❌ Server error:', message.data.error);
          break;

        case 'pong':
          // Heartbeat pong
          break;

        default:
          console.warn('[WebSocketService] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocketService] Error parsing message:', error);
    }
  }

  /**
   * Enviar mensaje del usuario al agente
   */
  sendMessage(message: string, conversationId: string, context?: Record<string, any>, messageId?: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('[WebSocketService] ❌ WebSocket not connected');
      return;
    }

    if (!this.agentId) {
      console.error('[WebSocketService] ❌ No agent selected');
      return;
    }

    const messageData: any = {
      agentId: this.agentId,
      message,
      conversationId,
      context: context || {}
    };

    // Only include messageId if provided
    if (messageId) {
      messageData.messageId = messageId;
    }

    console.log('[WebSocketService] 📤 Enviando mensaje:', {
      hasMessageId: !!messageId,
      messageId: messageId,
      message: message.substring(0, 50),
      conversationId: conversationId
    });

    this.send({
      type: 'message',
      data: messageData
    });
  }

  /**
   * Enviar datos al servidor
   */
  send(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(data));
      } catch (error) {
        console.error('[WebSocketService] Error sending message:', error);
      }
    } else {
      console.warn('[WebSocketService] ⚠️ WebSocket not connected');
    }
  }

  /**
   * Iniciar heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Cada 30 segundos
  }

  /**
   * Detener heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    console.log('[WebSocketService] 👋 Disconnecting...');
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.sessionId = null;
    this.userId = null;
    this.companyId = null;
    this.agentId = null;
    this.reconnectAttempts = 0;

    this.connectionSubject.next({ connected: false });
  }

  // ============ OBSERVABLES ============

  /**
   * Stream de chunks de respuesta
   */
  getStreamChunks(): Observable<StreamChunk> {
    return this.streamChunkSubject.asObservable();
  }

  /**
   * Stream completado
   */
  getStreamComplete(): Observable<StreamComplete> {
    return this.streamCompleteSubject.asObservable();
  }

  /**
   * Errores de stream
   */
  getStreamErrors(): Observable<{ messageId: string; error: string; code: string }> {
    return this.streamErrorSubject.asObservable();
  }

  /**
   * Respuestas de sub-agentes
   */
  getAgentResponses(): Observable<any> {
    return this.agentResponseSubject.asObservable();
  }

  /**
   * Estado de conexión
   */
  getConnectionStatus(): Observable<{ connected: boolean; sessionId?: string }> {
    return this.connectionSubject.asObservable();
  }

  /**
   * Observable para mensajes (legacy)
   */
  getMessages(): Observable<ConversationMessage> {
    return this.messageSubject.asObservable();
  }

  // ============ GETTERS ============

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  getCurrentAgentId(): string | null {
    return this.agentId;
  }

  setAgentId(agentId: string): void {
    this.agentId = agentId;
  }
}
