import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ChatProEvent,
  ChatProEventType,
  ChatProMessage,
  ChatProSpeaker,
  getSpeakerConfig
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

  // Observable streams
  public messages$ = this.messagesSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public executing$ = this.executingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Envia un mensaje al Chat Pro y procesa la respuesta SSE
   */
  sendMessage(company: string, query: string): void {
    // Cerrar conexion anterior si existe
    this.disconnect();

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
          this.executingSubject.next(false);
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
      this.executingSubject.next(false);
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Procesa un evento SSE y lo convierte en ChatProMessage
   */
  private processEvent(eventType: ChatProEventType, dataStr: string): void {
    try {
      // Ignorar user_message del backend (ya lo mostramos localmente)
      if (eventType === 'user_message') {
        console.log('[ChatProService] Ignorando user_message del backend (ya mostrado localmente)');
        return;
      }

      console.log('[ChatProService] Evento recibido:', eventType);

      const data = JSON.parse(dataStr);
      const message = this.convertToMessage(eventType, data);

      if (message) {
        this.messagesSubject.next(message);
      }

      // Marcar fin de ejecucion con delay para permitir que la UI renderice el mensaje
      // El indicador "thinking" debe quedarse hasta que el mensaje final sea visible
      if (eventType === 'final_response') {
        setTimeout(() => {
          this.executingSubject.next(false);
        }, 300);
      }

    } catch (error) {
      console.error('[ChatProService] Error parsing event:', eventType, error);
    }
  }

  /**
   * Convierte datos del evento SSE a ChatProMessage
   */
  private convertToMessage(eventType: ChatProEventType, data: any): ChatProMessage | null {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();

    // Obtener speaker config
    let speaker: ChatProSpeaker;
    if (data.speaker) {
      speaker = {
        name: data.speaker.display_name || data.speaker.name || 'Unknown',
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
        return {
          ...baseMessage,
          toolName: data.tool,
          toolParams: data.params,
          content: data.message || `Consultando ${data.tool}...`
        };

      case 'tool_result':
        return {
          ...baseMessage,
          toolName: data.tool,
          toolResult: data.result,
          executionTimeMs: data.execution_time_ms,
          content: data.message || `Resultado de ${data.tool}`
        };

      case 'delegation':
        let targetSpeaker: ChatProSpeaker | undefined;
        if (data.target) {
          targetSpeaker = {
            name: data.target.display_name || data.target.name || 'Unknown',
            type: data.target.type || 'department',
            department: data.target.department,
            avatar: this.mapAvatar(data.target.avatar),
            color: data.target.color || '#6b7280'
          };
        }
        return {
          ...baseMessage,
          delegationTarget: targetSpeaker,
          content: data.message || `Delegando a ${targetSpeaker?.name || 'agente'}`
        };

      case 'vote':
        return {
          ...baseMessage,
          vote: data.vote,
          voteReason: data.vote_reason
        };

      case 'agent_joined':
      case 'agent_thinking':
      case 'agent_message':
      case 'final_response':
      case 'user_message':
        return baseMessage;

      case 'error':
        return {
          ...baseMessage,
          content: data.error || data.message || 'Error desconocido'
        };

      default:
        return baseMessage;
    }
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
