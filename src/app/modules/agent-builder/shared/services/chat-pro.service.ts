import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ChatProEvent,
  ChatProEventType,
  ChatProMessage,
  ChatProSpeaker,
  getSpeakerConfig,
  getToolFriendlyName,
  getDelegationMessage,
  getActivityMessage,
  ToolMetadata,
  AgentActivityContext
} from '../models/chat-pro.model';

/**
 * Chat Pro Service
 *
 * Servicio para conectarse al endpoint /chat/pro/stream del backend ADK.
 * Maneja SSE (Server-Sent Events) para streaming en tiempo real.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatProService {
  private eventSource: EventSource | null = null;
  private baseUrl = environment.adkBackendApi || 'http://localhost:8080';

  // Subjects para diferentes tipos de eventos
  private messagesSubject = new Subject<ChatProMessage>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new Subject<string>();
  private executingSubject = new BehaviorSubject<boolean>(false);

  // Para detectar duplicados entre agent_message y final_response
  private lastMessageContent: string | null = null;
  private lastMessageSpeaker: string | null = null;

  // Timeout para forzar fin de ejecución si el backend no responde
  private executionTimeout: any = null;
  private idleTimeout: any = null;
  private readonly EXECUTION_TIMEOUT_MS = 120000; // 2 minutos max
  private readonly IDLE_TIMEOUT_MS = 30000; // 30 segundos sin actividad

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public executing$ = this.executingSubject.asObservable();

  constructor(private http: HttpClient) { }

  /**
   * Envia un mensaje al Chat Pro y procesa la respuesta SSE
   */
  sendMessage(company: string, query: string): void {
    // Cerrar conexion anterior si existe
    this.disconnect();

    // Reset duplicate tracking
    this.lastMessageContent = null;
    this.lastMessageSpeaker = null;

    // Limpiar timeout anterior si existe
    this.clearExecutionTimeout();

    console.log('[ChatProService] Enviando mensaje:', { company, query, baseUrl: this.baseUrl });

    // Emitir mensaje del usuario inmediatamente (UX instantanea)
    const userMessage: ChatProMessage = {
      id: `user_${Date.now()}`,
      timestamp: new Date(),
      eventType: 'user_message',
      speaker: {
        name: 'Tu',
        type: 'user',
        avatar: 'pi-user',
        color: '#6366f1'
      },
      content: query,
      mentions: []
    };
    this.messagesSubject.next(userMessage);

    this.executingSubject.next(true);

    // Configurar timeout de seguridad
    this.startExecutionTimeout();

    // Crear la URL con el body como query param (para SSE con POST)
    const url = `${this.baseUrl}/chat/pro/stream`;

    console.log('[ChatProService] Conectando a:', url);

    // Usar fetch para POST con SSE
    this.connectWithFetch(url, company, query);
  }

  /**
   * Conecta usando fetch API para soportar POST con SSE
   */
  private async connectWithFetch(url: string, company: string, query: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ company, query })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.connectionStatusSubject.next(true);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[ChatProService] Stream finalizado (done=true)');
          this.finishExecution();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Procesar eventos completos en el buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Mantener la ultima linea incompleta

        let currentEvent: string | null = null;
        let currentData: string | null = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.substring(6);

            if (currentEvent && currentData) {
              this.processEvent(currentEvent as ChatProEventType, currentData);
              currentEvent = null;
              currentData = null;
            }
          } else if (line === '' && currentEvent && currentData) {
            // Linea vacia indica fin de evento
            this.processEvent(currentEvent as ChatProEventType, currentData);
            currentEvent = null;
            currentData = null;
          }
        }
      }

      this.connectionStatusSubject.next(false);

    } catch (error: any) {
      console.error('[ChatProService] Error completo:', error);
      console.error('[ChatProService] URL intentada:', url);
      console.error('[ChatProService] Datos enviados:', { company, query });

      // Mostrar error mas descriptivo
      let errorMsg = 'Error de conexion';
      if (error.message?.includes('fetch')) {
        errorMsg = 'No se pudo conectar al servidor. Verifica que el backend este corriendo.';
      } else if (error.message?.includes('CORS')) {
        errorMsg = 'Error de CORS. El backend no permite conexiones desde este origen.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      this.errorSubject.next(errorMsg);
      this.finishExecution();
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Procesa un evento SSE y lo convierte en ChatProMessage
   */
  private processEvent(eventType: ChatProEventType, dataStr: string): void {
    try {
      // Reiniciar timeout de inactividad con cada evento
      this.resetIdleTimeout();

      // Ignorar user_message del backend (ya lo mostramos localmente)
      if (eventType === 'user_message') {
        console.log('[ChatProService] Ignorando user_message del backend (ya mostrado localmente)');
        return;
      }

      console.log('[ChatProService] Evento recibido:', eventType);

      const data = JSON.parse(dataStr);
      const messageContent = data.message || '';
      const speakerName = data.speaker?.display_name || data.speaker?.name || '';

      // Detectar duplicados: si final_response tiene el mismo contenido que el ultimo agent_message
      if (eventType === 'final_response') {
        console.log('[ChatProService] Recibido final_response');
        const contentHash = messageContent.substring(0, 200); // Comparar primeros 200 chars
        if (this.lastMessageContent === contentHash && this.lastMessageSpeaker === speakerName) {
          console.log('[ChatProService] Ignorando final_response duplicado (mismo contenido que agent_message)');
          // Solo marcar fin de ejecucion, no emitir mensaje duplicado
          setTimeout(() => {
            this.finishExecution();
          }, 300);
          // Reset tracking
          this.lastMessageContent = null;
          this.lastMessageSpeaker = null;
          return;
        }
      }

      // Trackear agent_message para detectar duplicados
      if (eventType === 'agent_message') {
        this.lastMessageContent = messageContent.substring(0, 200);
        this.lastMessageSpeaker = speakerName;
      }

      const message = this.convertToMessage(eventType, data);

      if (message) {
        this.messagesSubject.next(message);
      }

      // Marcar fin de ejecucion con delay para permitir que la UI renderice el mensaje
      // El indicador "thinking" debe quedarse hasta que el mensaje final sea visible
      if (eventType === 'final_response') {
        setTimeout(() => {
          this.finishExecution();
        }, 300);
        // Reset tracking
        this.lastMessageContent = null;
        this.lastMessageSpeaker = null;
      }

    } catch (error) {
      console.error('[ChatProService] Error parsing event:', eventType, error);
    }
  }

  /**
   * Finaliza la ejecución y limpia el timeout
   */
  private finishExecution(): void {
    console.log('[ChatProService] Finalizando ejecución');
    this.clearExecutionTimeout();
    this.executingSubject.next(false);
  }

  /**
   * Inicia timeout de seguridad para forzar fin de ejecución
   */
  private startExecutionTimeout(): void {
    this.executionTimeout = setTimeout(() => {
      console.warn('[ChatProService] Timeout de ejecución alcanzado, forzando fin');
      this.finishExecution();
    }, this.EXECUTION_TIMEOUT_MS);
  }

  /**
   * Limpia el timeout de ejecución
   */
  private clearExecutionTimeout(): void {
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
   * Reinicia el timeout de inactividad (llamar cada vez que llega un evento)
   */
  private resetIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    this.idleTimeout = setTimeout(() => {
      console.warn('[ChatProService] Timeout de inactividad alcanzado (30s sin eventos)');
      this.finishExecution();
    }, this.IDLE_TIMEOUT_MS);
  }

  /**
   * Convierte datos del evento SSE a ChatProMessage
   * Enriquece con metadata amigable para UI natural
   */
  private convertToMessage(eventType: ChatProEventType, data: any): ChatProMessage | null {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // Obtener speaker config con nombres humanos
    let speaker: ChatProSpeaker;
    if (data.speaker?.agent_id) {
      // Usar configuración predefinida para nombres humanos
      speaker = getSpeakerConfig(data.speaker.agent_id);
      // Mantener color/avatar del backend si existe
      if (data.speaker.color) speaker.color = data.speaker.color;
      if (data.speaker.avatar) speaker.avatar = this.mapAvatar(data.speaker.avatar);
    } else if (data.speaker) {
      speaker = {
        name: data.speaker.display_name || data.speaker.name || 'Asistente',
        agent_id: data.speaker.agent_id,
        type: data.speaker.type || 'sub_agent',
        department: data.speaker.department,
        avatar: this.mapAvatar(data.speaker.avatar),
        color: data.speaker.color || '#6b7280'
      };
    } else {
      speaker = getSpeakerConfig('unknown');
    }

    const baseMessage: ChatProMessage = {
      id,
      timestamp,
      eventType,
      speaker,
      content: data.message || '',
      mentions: data.mentions || []
    };

    // Agregar campos especificos segun el tipo de evento
    switch (eventType) {
      case 'tool_call':
        // Obtener metadata amigable para la herramienta
        const toolMeta = getToolFriendlyName(data.tool);
        return {
          ...baseMessage,
          toolName: data.tool,
          toolParams: data.params,
          toolMetadata: toolMeta,
          content: data.message || toolMeta.description
        };

      case 'tool_result':
        const toolResultMeta = getToolFriendlyName(data.tool);
        return {
          ...baseMessage,
          toolName: data.tool,
          toolResult: data.result,
          toolMetadata: toolResultMeta,
          executionTimeMs: data.execution_time_ms,
          // Crear resumen visual si hay datos estructurados
          toolResultSummary: this.createToolResultSummary(data.tool, data.result),
          content: data.message || `${toolResultMeta.friendlyName} completado`
        };

      case 'delegation':
        let targetSpeaker: ChatProSpeaker | undefined;
        if (data.target?.agent_id) {
          targetSpeaker = getSpeakerConfig(data.target.agent_id);
        } else if (data.target) {
          targetSpeaker = {
            name: data.target.display_name || data.target.name || 'Especialista',
            type: data.target.type || 'department',
            department: data.target.department,
            avatar: this.mapAvatar(data.target.avatar),
            color: data.target.color || '#6b7280'
          };
        }
        // Mensaje natural de delegación
        const delegationMsg = getDelegationMessage(speaker, targetSpeaker!, data.purpose);
        return {
          ...baseMessage,
          delegationTarget: targetSpeaker,
          delegationPurpose: data.purpose,
          content: data.message || delegationMsg
        };

      case 'agent_thinking':
      case 'agent_joined':
        // Contexto de actividad enriquecido
        const activityContext: AgentActivityContext = {
          currentTask: data.context?.current_task || data.task,
          thinkingAbout: data.context?.thinking_about,
          progress: data.context?.progress
        };
        return {
          ...baseMessage,
          activityContext,
          content: data.message || getActivityMessage(speaker, activityContext)
        };

      case 'vote':
        return {
          ...baseMessage,
          vote: data.vote,
          voteReason: data.vote_reason,
          content: data.message || this.getVoteMessage(speaker, data.vote, data.vote_reason)
        };

      case 'negotiation_round':
        return {
          ...baseMessage,
          negotiationRound: data.round,
          newProposal: data.new_proposal,
          negotiationContext: data.context ? {
            originalProposal: data.context.original_proposal,
            currentRound: data.round,
            maxRounds: data.context.max_rounds || 3,
            currentVotes: data.context.current_votes || {},
            reasonForNewRound: data.context.reason_for_new_round
          } : undefined,
          content: data.message || `Ronda ${data.round}: ${data.new_proposal || 'Nueva propuesta'}`
        };

      case 'consensus_reached':
        return {
          ...baseMessage,
          consensusDecision: data.decision,
          votesSummary: data.votes_summary,
          consensusResult: {
            decision: data.decision,
            approvedBy: data.approved_by || [],
            rejectedBy: data.rejected_by || [],
            nextSteps: data.next_steps
          },
          content: data.message || `¡Consenso alcanzado! ${data.decision}`
        };

      case 'final_response':
        return {
          ...baseMessage,
          isFinalResponse: true,
          content: data.message || ''
        };

      case 'agent_message':
      case 'user_message':
        return baseMessage;

      case 'error':
        return {
          ...baseMessage,
          content: data.error || data.message || 'Ocurrió un error inesperado'
        };

      default:
        return baseMessage;
    }
  }

  /**
   * Genera mensaje de voto natural
   */
  private getVoteMessage(speaker: ChatProSpeaker, vote: string, reason?: string): string {
    const name = speaker.name;
    switch (vote) {
      case 'APPROVE':
        return reason ? `${name} aprueba: "${reason}"` : `${name} está de acuerdo`;
      case 'REJECT':
        return reason ? `${name} rechaza: "${reason}"` : `${name} no está de acuerdo`;
      case 'PENDING':
        return `${name} está evaluando la propuesta`;
      default:
        return `${name} votó: ${vote}`;
    }
  }

  /**
   * Crea resumen visual del resultado de una herramienta
   */
  private createToolResultSummary(tool: string, result: any): any {
    if (!result) return undefined;

    // Por ahora retorna undefined - el backend puede enviar summaries estructurados
    // que se pueden procesar aquí en el futuro
    return undefined;
  }

  /**
   * Mapea nombres de avatar del backend a clases de PrimeNG icons
   */
  private mapAvatar(avatar: string): string {
    const avatarMap: Record<string, string> = {
      'briefcase': 'pi-briefcase',
      'trending-up': 'pi-chart-line',
      'package': 'pi-box',
      'truck': 'pi-truck',
      'layers': 'pi-sitemap',
      'git-branch': 'pi-share-alt',
      'zap': 'pi-bolt',
      'user': 'pi-user'
    };

    return avatarMap[avatar] || avatar || 'pi-user';
  }

  /**
   * Desconecta el stream SSE
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionStatusSubject.next(false);
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.messagesSubject.complete();
    this.connectionStatusSubject.complete();
    this.errorSubject.complete();
    this.executingSubject.complete();
  }
}
