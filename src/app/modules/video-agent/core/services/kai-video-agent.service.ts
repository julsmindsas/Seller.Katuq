import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * Tipos de eventos AG-UI v2
 */
export enum AGUIEventType {
  RUN_STARTED = 'RUN_STARTED',
  RUN_FINISHED = 'RUN_FINISHED',
  RUN_ERROR = 'RUN_ERROR',
  STEP_STARTED = 'STEP_STARTED',
  STEP_FINISHED = 'STEP_FINISHED',
  TEXT_MESSAGE_START = 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT = 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END = 'TEXT_MESSAGE_END',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_ARGS = 'TOOL_CALL_ARGS',
  TOOL_CALL_END = 'TOOL_CALL_END',
  STATE_SNAPSHOT = 'STATE_SNAPSHOT',
  STATE_DELTA = 'STATE_DELTA',
  CUSTOM = 'CUSTOM'
}

/**
 * Evento AG-UI parseado
 */
export interface AGUIEvent {
  type: AGUIEventType | string;
  timestamp: string;
  runId?: string;
  name?: string;
  value?: any;
  content?: string;
  toolName?: string;
  args?: any;
  result?: any;
  error?: string;
  [key: string]: any;
}

/**
 * Resultado de busqueda de fallas similares
 */
export interface SimilarFault {
  id: string;
  tipo: string;
  modelo: string;
  falla: string;
  sintomas: string[];
  solucion: string;
  repuestos: string[];
  costo_estimado: number;
  similarity: number;
}

/**
 * Repuesto sugerido
 */
export interface SuggestedPart {
  codigo: string;
  nombre: string;
  precio: number;
  disponibilidad: boolean;
  tiempo_entrega: string;
  compatible_con: string[];
  imagen_url?: string;
}

/**
 * Cita agendada
 */
export interface ScheduledAppointment {
  confirmation_number: string;
  fecha: string;
  hora: string;
  tecnico: string;
  telefono_tecnico: string;
  costo_estimado: number;
}

/**
 * KAI Video Agent Service
 *
 * Conecta el frontend Angular con el backend kai potenciado.
 * Usa SSE para streaming de eventos AG-UI v2.
 *
 * Caracteristicas:
 * - Streaming bidireccional via SSE
 * - Busqueda de fallas similares (Vector DB)
 * - Memoria de casos por cliente
 * - Sugerencia de repuestos
 * - Agendamiento automatico
 */
@Injectable({
  providedIn: 'root'
})
export class KaiVideoAgentService {

  private baseUrl: string;
  private eventSource: EventSource | null = null;

  // Estado de conexion
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  // Eventos AG-UI
  private eventSubject = new Subject<AGUIEvent>();
  public event$ = this.eventSubject.asObservable();

  // Respuestas de texto
  private responseSubject = new BehaviorSubject<string>('');
  public response$ = this.responseSubject.asObservable();

  // Fallas similares encontradas
  private similarFaultsSubject = new Subject<SimilarFault[]>();
  public similarFaults$ = this.similarFaultsSubject.asObservable();

  // Repuestos sugeridos
  private suggestedPartsSubject = new Subject<SuggestedPart[]>();
  public suggestedParts$ = this.suggestedPartsSubject.asObservable();

  // Cita agendada
  private appointmentSubject = new Subject<ScheduledAppointment>();
  public appointment$ = this.appointmentSubject.asObservable();

  // Diagnostico de audio
  private audioDiagnosisSubject = new Subject<any>();
  public audioDiagnosis$ = this.audioDiagnosisSubject.asObservable();

  // Errores
  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  // Session ID
  private sessionId: string = '';

  constructor(private http: HttpClient) {
    // URL del backend kai
    this.baseUrl = environment.kaiBackendUrl || 'https://back.katuq.com/adk';
    console.log('🤖 KaiVideoAgentService initialized, backend:', this.baseUrl);
  }

  /**
   * Inicia una sesion de diagnostico con streaming SSE
   */
  async startDiagnosis(params: {
    company: string;
    adapterType?: string;
    query: string;
    context?: {
      applianceType?: string;
      symptoms?: string[];
      imageBase64?: string;
      customerPhone?: string;
    };
  }): Promise<void> {
    // Generar session ID
    this.sessionId = `video_${Date.now()}`;

    console.log('🚀 Starting diagnosis session:', this.sessionId);

    // Para SSE con POST, usamos fetch con ReadableStream
    try {
      const response = await fetch(`${this.baseUrl}/video-agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          company: params.company,
          adapter_type: params.adapterType || 'haceb',
          query: params.query,
          session_id: this.sessionId,
          context: params.context || {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      this.isConnectedSubject.next(true);

      // Procesar stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream completed');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Procesar lineas completas
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Guardar linea incompleta

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data) as AGUIEvent;
              this.processEvent(event);
            } catch (e) {
              console.warn('Failed to parse event:', data);
            }
          }
        }
      }

      this.isConnectedSubject.next(false);

    } catch (error: any) {
      console.error('❌ Stream error:', error);
      this.errorSubject.next(error.message || 'Connection error');
      this.isConnectedSubject.next(false);
    }
  }

  /**
   * Procesa un evento AG-UI
   */
  private processEvent(event: AGUIEvent): void {
    console.log('📨 AG-UI Event:', event.type, event);

    // Emitir evento raw
    this.eventSubject.next(event);

    switch (event.type) {
      case AGUIEventType.RUN_STARTED:
        console.log('🏃 Run started:', event.runId);
        break;

      case AGUIEventType.RUN_FINISHED:
        console.log('🏁 Run finished');
        break;

      case AGUIEventType.RUN_ERROR:
        console.error('❌ Run error:', event.error);
        this.errorSubject.next(event.error || 'Unknown error');
        break;

      case AGUIEventType.TEXT_MESSAGE_CONTENT:
        // Acumular respuesta de texto
        const currentResponse = this.responseSubject.value;
        this.responseSubject.next(currentResponse + (event.content || ''));
        break;

      case AGUIEventType.TEXT_MESSAGE_END:
        // Respuesta completa
        console.log('💬 Response:', this.responseSubject.value);
        break;

      case AGUIEventType.TOOL_CALL_END:
        // Procesar resultado del tool
        this.processToolResult(event.toolName || '', event.result);
        break;

      case AGUIEventType.CUSTOM:
        // Eventos custom de katuq
        this.processCustomEvent(event.name || '', event.value);
        break;
    }
  }

  /**
   * Procesa resultado de tool call
   */
  private processToolResult(toolName: string, result: any): void {
    console.log('🔧 Tool result:', toolName, result);

    switch (toolName) {
      case 'search_similar_faults':
        if (result?.matches) {
          this.similarFaultsSubject.next(result.matches);
        }
        break;

      case 'find_parts':
        if (result?.repuestos) {
          this.suggestedPartsSubject.next(result.repuestos);
        }
        break;

      case 'schedule_appointment':
        if (result?.confirmation_number) {
          this.appointmentSubject.next({
            confirmation_number: result.confirmation_number,
            fecha: result.cita?.fecha,
            hora: result.cita?.hora,
            tecnico: result.cita?.tecnico,
            telefono_tecnico: result.cita?.telefono_tecnico,
            costo_estimado: result.cita?.costo_estimado
          });
        }
        break;

      case 'diagnose_audio_pattern':
        this.audioDiagnosisSubject.next(result);
        break;
    }
  }

  /**
   * Procesa eventos custom de katuq
   */
  private processCustomEvent(name: string, value: any): void {
    console.log('🎯 Custom event:', name, value);

    switch (name) {
      case 'katuq:SIMILAR_FAULTS_FOUND':
        if (value?.matches) {
          this.similarFaultsSubject.next(value.matches);
        }
        break;

      case 'katuq:PARTS_SUGGESTED':
        if (value?.repuestos) {
          this.suggestedPartsSubject.next(value.repuestos);
        }
        break;

      case 'katuq:APPOINTMENT_SCHEDULED':
        if (value?.confirmation_number) {
          this.appointmentSubject.next(value);
        }
        break;

      case 'katuq:AUDIO_DIAGNOSED':
        this.audioDiagnosisSubject.next(value);
        break;

      case 'katuq:AGENT_JOINED':
        console.log('🤖 Agent joined:', value);
        break;
    }
  }

  /**
   * Diagnostico sincrono (sin streaming)
   */
  diagnoseSync(params: {
    company: string;
    adapterType?: string;
    query: string;
    context?: any;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/video-agent/diagnose`, {
      company: params.company,
      adapter_type: params.adapterType || 'haceb',
      query: params.query,
      context: params.context || {}
    });
  }

  /**
   * Buscar fallas similares
   */
  searchSimilarFaults(params: {
    company: string;
    description: string;
    applianceType?: string;
    imageBase64?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/video-agent/search-faults`, {
      company: params.company,
      description: params.description,
      appliance_type: params.applianceType,
      image_base64: params.imageBase64
    });
  }

  /**
   * Buscar repuestos
   */
  findParts(params: {
    company: string;
    faultType: string;
    applianceModel?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/video-agent/find-parts`, {
      company: params.company,
      fault_type: params.faultType,
      appliance_model: params.applianceModel
    });
  }

  /**
   * Obtener historial de casos
   */
  getCustomerHistory(params: {
    company: string;
    phone?: string;
    email?: string;
    serial?: string;
  }): Observable<any> {
    let queryParams = `company=${params.company}`;
    if (params.phone) queryParams += `&phone=${params.phone}`;
    if (params.email) queryParams += `&email=${params.email}`;
    if (params.serial) queryParams += `&serial=${params.serial}`;

    return this.http.get(`${this.baseUrl}/video-agent/history?${queryParams}`);
  }

  /**
   * Agendar cita
   */
  scheduleAppointment(params: {
    company: string;
    customerName: string;
    customerPhone: string;
    address: string;
    city?: string;
    customerEmail?: string;
    applianceType?: string;
    applianceModel?: string;
    issueSummary?: string;
    partsNeeded?: string[];
    preferredDate?: string;
    preferredTime?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/video-agent/schedule`, {
      company: params.company,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      address: params.address,
      city: params.city,
      customer_email: params.customerEmail,
      appliance_type: params.applianceType,
      appliance_model: params.applianceModel,
      issue_summary: params.issueSummary,
      parts_needed: params.partsNeeded,
      preferred_date: params.preferredDate,
      preferred_time: params.preferredTime
    });
  }

  /**
   * Health check del servicio
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.baseUrl}/video-agent/health`);
  }

  /**
   * Limpiar respuesta acumulada
   */
  clearResponse(): void {
    this.responseSubject.next('');
  }

  /**
   * Obtener session ID actual
   */
  getSessionId(): string {
    return this.sessionId;
  }
}
