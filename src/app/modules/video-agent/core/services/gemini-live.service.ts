import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Session,
  MediaResolution,
  Blob,
} from "@google/genai";
import { environment } from "src/environments/environment";
import {
  DEFAULT_STREAM_CONFIG,
  StreamConfig,
} from "../models/agent-config.interface";
import { IAgentAdapter } from "../models/agent-adapter.interface";
import { AudioStreamerService } from "./audio-streamer.service";

/**
 * Modo de conexion del servicio
 */
export enum ConnectionMode {
  /** Conexion directa a Gemini Live API (frontend solo) */
  DIRECT_GEMINI = 'direct',
  /** Conexion via Backend ADK con tools potenciados (Vector Search, Firestore, etc) */
  BACKEND_ADK = 'backend'
}

/**
 * Core service para Gemini Live API con video streaming
 *
 * Soporta dos modos de conexion:
 * 1. DIRECT_GEMINI: Conexion directa a Gemini Live (sin tools backend)
 * 2. BACKEND_ADK: Conexion via backend ADK con run_live() (tools con Vector Search, Firestore)
 *
 * ACTUALIZADO: Integrado con AudioStreamerService para playback sin glitches
 */
@Injectable({
  providedIn: "root",
})
export class GeminiLiveService {
  // Gemini Direct mode
  private client!: GoogleGenAI;
  private session: Session | undefined = undefined;

  // Backend ADK mode
  private adkWebSocket: WebSocket | null = null;
  private userId: string = '';
  private sessionId: string = '';

  // Binary audio optimization - reduces ~33% bandwidth overhead vs Base64
  private useBinaryAudio: boolean = true;

  // Shared
  private currentAdapter: IAgentAdapter | null = null;
  private streamConfig: StreamConfig = DEFAULT_STREAM_CONFIG;
  private connectionMode: ConnectionMode = ConnectionMode.BACKEND_ADK; // Default to backend

  // Estado de la conexión
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  // Transcripción del usuario (speech-to-text)
  private transcriptSubject = new BehaviorSubject<string>("");
  public transcript$ = this.transcriptSubject.asObservable();

  // Respuestas del servidor
  private serverResponseSubject = new Subject<any>();
  public serverResponse$ = this.serverResponseSubject.asObservable();

  // Audio del servidor (text-to-speech)
  private serverAudioSubject = new Subject<string>(); // Base64 audio
  public serverAudio$ = this.serverAudioSubject.asObservable();

  // Errores
  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  // Next Action del adapter (para que el componente procese acciones como guardar citas)
  private nextActionSubject = new Subject<any>();
  public nextAction$ = this.nextActionSubject.asObservable();

  // Tool calls del backend (para mostrar UI de progreso)
  private toolCallSubject = new Subject<any>();
  public toolCall$ = this.toolCallSubject.asObservable();

  // Estado de la sesión
  private sessionActive = false;

  constructor(private _audioStreamer: AudioStreamerService) {
    console.log("🎤 GeminiLiveService initialized with SDK + AudioStreamer");
    // Inicializar audio streamer
    this._audioStreamer.initialize().catch((err) => {
      console.error("❌ Error initializing AudioStreamer:", err);
    });
  }

  /**
   * Establece el modo de conexion
   */
  setConnectionMode(mode: ConnectionMode): void {
    this.connectionMode = mode;
    console.log(`🔧 Connection mode set to: ${mode}`);
  }

  /**
   * Conecta segun el modo configurado
   */
  async connect(adapter: IAgentAdapter): Promise<void> {
    if (this.sessionActive) {
      console.warn("⚠️ Session already active, disconnecting first");
      await this.disconnect();
    }

    this.currentAdapter = adapter;

    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      await this.connectToBackendADK(adapter);
    } else {
      await this.connectDirectToGemini(adapter);
    }
  }

  /**
   * Conecta al Backend ADK via WebSocket
   * El backend usa ADK run_live() con tools potenciados (Vector Search, Firestore, etc.)
   *
   * Basado en el sample oficial: https://github.com/google/adk-samples/tree/main/python/agents/bidi-demo
   */
  private async connectToBackendADK(adapter: IAgentAdapter): Promise<void> {
    // Generar IDs de sesion
    this.userId = this.generateUserId();
    this.sessionId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Obtener company y adapter type del adapter
    const company = (adapter as any).company || 'HACEB';
    const adapterType = (adapter as any).adapterType || 'haceb';

    // Construir URL del WebSocket backend - Formato del sample oficial ADK
    // /ws/{user_id}/{session_id}?company=X&adapter_type=Y
    const wsUrl = `${environment.kaiBackendWs}/ws/${this.userId}/${this.sessionId}?company=${company}&adapter_type=${adapterType}`;

    console.log(`🔌 Conectando a Backend ADK (sample pattern): ${wsUrl}`);

    return new Promise((resolve, reject) => {
      try {
        this.adkWebSocket = new WebSocket(wsUrl);

        this.adkWebSocket.onopen = () => {
          console.log("✅ WebSocket connected to Backend ADK");
          this.isConnectedSubject.next(true);
          this.sessionActive = true;
          resolve();
        };

        this.adkWebSocket.onmessage = (event: MessageEvent) => {
          try {
            const adkEvent = JSON.parse(event.data);
            this.handleADKEvent(adkEvent);
          } catch (e) {
            console.error("❌ Error parsing ADK event:", e);
          }
        };

        this.adkWebSocket.onerror = (event: Event) => {
          console.error("❌ WebSocket error (ADK):", event);
          this.errorSubject.next("Error de conexion con el servidor ADK");
          reject(new Error("WebSocket connection error"));
        };

        this.adkWebSocket.onclose = (event: CloseEvent) => {
          console.log(`🔌 WebSocket disconnected (ADK): ${event.code} - ${event.reason}`);
          this.isConnectedSubject.next(false);
          this.sessionActive = false;
        };

        // Timeout de conexion
        setTimeout(() => {
          if (this.adkWebSocket?.readyState !== WebSocket.OPEN) {
            this.adkWebSocket?.close();
            reject(new Error("WebSocket connection timeout"));
          }
        }, 10000);

      } catch (error) {
        console.error("❌ Error creating WebSocket:", error);
        reject(error);
      }
    });
  }

  /**
   * Genera un userId unico para la sesion
   */
  private generateUserId(): string {
    // Intentar obtener userId de localStorage o generar uno nuevo
    let userId = localStorage.getItem('video_agent_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('video_agent_user_id', userId);
    }
    return userId;
  }

  /**
   * Procesa eventos del Backend ADK
   *
   * ADK Events structure:
   * - content: { parts: [{ inlineData: { data, mimeType } }] } - Audio/content
   * - inputTranscription: { text } - User's speech transcription
   * - outputTranscription: { text } - Model's speech transcription
   * - turnComplete: boolean - Turn is complete
   * - usageMetadata: {} - Token usage stats
   */
  private handleADKEvent(event: any): void {
    // Emitir evento completo para debugging
    this.serverResponseSubject.next(event);

    // Detectar tipo de evento ADK basado en propiedades
    // ADK no usa event.type, usa propiedades directas

    // 1. Audio content (lo mas importante para reproduccion)
    if (event.content?.parts) {
      for (const part of event.content.parts) {
        if (part.inlineData?.data && part.inlineData?.mimeType?.includes('audio')) {
          const dataType = typeof part.inlineData.data;
          const dataLength = part.inlineData.data?.length || 0;
          const dataSample = typeof part.inlineData.data === 'string'
            ? part.inlineData.data.substring(0, 50)
            : 'non-string';
          console.log(`🔊 ADK audio: type=${dataType}, len=${dataLength}, sample=${dataSample}...`);

          const audioData = this.base64ToUint8Array(part.inlineData.data);
          if (audioData.length > 0) {
            this._audioStreamer.addPCM16(audioData);
            this.serverAudioSubject.next(part.inlineData.data);
          }
        } else if (part.text) {
          console.log("💬 ADK text:", part.text);
          this.transcriptSubject.next(part.text);
        }
      }
      return;
    }

    // 2. Input transcription (lo que dijo el usuario)
    if (event.inputTranscription?.text) {
      console.log("🎤 User said:", event.inputTranscription.text);
      // Emitir en subject de transcripcion de usuario si existe
      return;
    }

    // 3. Output transcription (lo que dijo el modelo)
    if (event.outputTranscription?.text) {
      console.log("🤖 Model said:", event.outputTranscription.text);
      this.transcriptSubject.next(event.outputTranscription.text);
      return;
    }

    // 4. Turn complete
    if (event.turnComplete) {
      console.log("✅ Turn complete");
      return;
    }

    // 5. Usage metadata (stats)
    if (event.usageMetadata) {
      console.log("📊 Usage:", event.usageMetadata);
      return;
    }

    // 6. Legacy event.type handling
    const eventType = event.type;
    if (!eventType) {
      console.log("📨 ADK event (unhandled):", event);
      return;
    }

    switch (eventType) {
      case 'connection_established':
        console.log("✅ ADK session established:", event.session_id);
        break;

      case 'audio':
        // Audio de respuesta del modelo (TTS)
        if (event.data) {
          console.log("🔊 ADK audio received");
          const audioData = this.base64ToUint8Array(event.data);
          this._audioStreamer.addPCM16(audioData);
          this.serverAudioSubject.next(event.data);
        }
        break;

      case 'text':
        // Texto de respuesta del modelo
        if (event.content || event.text) {
          const text = event.content || event.text;
          console.log("💬 ADK text:", text);
          this.transcriptSubject.next(text);
        }
        break;

      case 'tool_call':
        // Tool siendo ejecutado en backend
        console.log("🔧 ADK tool call:", event.tool_name || event.name, "display:", event.display_name);
        this.toolCallSubject.next({
          type: 'tool_call',
          name: event.tool_name || event.name,
          display_name: event.display_name,  // FIX: Incluir display_name del backend
          arguments: event.arguments || event.args,
          status: 'executing'
        });
        break;

      case 'tool_result':
        // Resultado de tool ejecutado
        console.log("📊 ADK tool result:", event.tool_name || event.name);
        this.toolCallSubject.next({
          type: 'tool_result',
          name: event.tool_name || event.name,
          display_name: event.display_name,  // FIX: Incluir display_name
          result: event.result,
          status: 'completed'
        });
        // Tambien emitir como nextAction para retrocompatibilidad
        if (event.result) {
          this.nextActionSubject.next({
            type: 'TOOL_RESULT',
            toolName: event.tool_name || event.name,
            data: event.result
          });
        }
        break;

      case 'input_audio_transcription':
        // Transcripcion del audio del usuario
        if (event.text) {
          console.log("🎤 User said:", event.text);
          // Podriamos emitir esto en un subject separado si es necesario
        }
        break;

      case 'output_audio_transcription':
        // Transcripcion del audio del modelo
        if (event.text) {
          console.log("🤖 Model said:", event.text);
          this.transcriptSubject.next(event.text);
        }
        break;

      case 'error':
        console.error("❌ ADK error:", event.error || event.message);
        this.errorSubject.next(event.error || event.message || "Error desconocido");
        break;

      case 'pong':
        // Respuesta a ping, ignorar
        break;

      default:
        console.log(`📨 ADK event (${eventType}):`, event);
    }
  }

  /**
   * Conecta directamente a Gemini Live API (modo legacy sin backend)
   */
  private async connectDirectToGemini(adapter: IAgentAdapter): Promise<void> {
    // Inicializar cliente
    this.client = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });

    if (!environment.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not found in environment");
    }

    // Configuración del modelo
    const toolDeclarations = adapter.getToolDeclarations();
    const config: any = {
      responseModalities: [Modality.AUDIO],
      // LOW para procesamiento más rápido, MEDIUM para balance calidad/velocidad
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede", // Voz femenina en español
          },
        },
      },
      // 🧠 Configuración de pensamiento - REDUCIDO para respuestas más rápidas
      // Menor budget = menor latencia, especialmente importante para usuarios mayores
      thinkingConfig: {
        thinkingBudget: 0,        // 0 para respuestas inmediatas (0-24576)
        includeThoughts: false    // No mostrar pensamientos internos al usuario
      },
      systemInstruction: {
        parts: [
          {
            text: adapter.getSystemInstruction(),
          },
        ],
      },
    };

    // Agregar tools solo si hay declarations
    if (toolDeclarations.length > 0) {
      config.tools = [
        {
          functionDeclarations: toolDeclarations,
        },
      ];
    }

    try {
      console.log("🔌 Conectando a Gemini Live API con SDK (DIRECT)...");

      this.session = await this.client.live.connect({
        model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: () => {
            console.log("✅ WebSocket connected to Gemini Live (SDK)");
            this.isConnectedSubject.next(true);
            this.sessionActive = true;
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onerror: (e: ErrorEvent) => {
            console.error("❌ WebSocket error:", e.message);
            this.errorSubject.next(`Connection error: ${e.message}`);
          },
          onclose: (e: CloseEvent) => {
            console.log("🔌 WebSocket disconnected:", e.reason);
            this.isConnectedSubject.next(false);
            this.sessionActive = false;
          },
        },
        config,
      });

      console.log("✅ Session initialized with SDK");
    } catch (error) {
      console.error("❌ Error connecting to Gemini Live:", error);
      this.errorSubject.next(`Connection error: ${error}`);
      throw error;
    }
  }

  /**
   * Procesa mensajes del servidor
   */
  private handleServerMessage(message: LiveServerMessage): void {
    try {
      // Emitir mensaje completo
      this.serverResponseSubject.next(message);

      // Procesar según tipo de mensaje
      if (message.serverContent?.modelTurn) {
        const parts = message.serverContent.modelTurn.parts || [];

        parts.forEach((part: any) => {
          // Texto de respuesta
          if (part.text) {
            console.log("💬 Server text:", part.text);
            this.transcriptSubject.next(part.text);
          }

          // Audio de respuesta (TTS)
          if (part.inlineData?.mimeType?.startsWith("audio/")) {
            console.log("🔊 Server audio received");
            // Convertir base64 a Uint8Array y enviar al AudioStreamer
            const audioData = this.base64ToUint8Array(part.inlineData.data);
            this._audioStreamer.addPCM16(audioData);
            // También emitir para retrocompatibilidad
            this.serverAudioSubject.next(part.inlineData.data);
          }

          // Function call
          if (part.functionCall) {
            console.log("🔧 Function call:", part.functionCall);
            this.handleFunctionCall(part.functionCall);
          }
        });
      }

      // Tool call response (alternativa)
      if (message.toolCall) {
        console.log("🔧 Tool call:", message.toolCall);
        (message as any).toolCall.functionCalls?.forEach((fc: any) => {
          this.handleFunctionCall(fc);
        });
      }
    } catch (error) {
      console.error("❌ Error parsing server message:", error);
      this.errorSubject.next(`Message parsing error: ${error}`);
    }
  }

  /**
   * Maneja llamadas a funciones (tool calling)
   */
  private handleFunctionCall(functionCall: any): void {
    if (!this.currentAdapter) {
      console.warn("⚠️ No adapter set, ignoring function call");
      return;
    }

    // Procesar con el adapter
    const result = this.currentAdapter.processResult(functionCall);
    const action = this.currentAdapter.getNextAction(result);

    console.log("📊 Adapter result:", result);
    console.log("🎯 Next action:", action);

    // Emitir nextAction para que el componente lo procese (ej: guardar citas)
    this.nextActionSubject.next(action);

    // Enviar respuesta de la función al servidor
    // Gemini Live API requiere: id, name, y response (objeto)
    this.sendFunctionResponse(
      functionCall.id,
      functionCall.name,
      result,
    );
  }

  /**
   * Envía respuesta de función ejecutada
   * Formato según documentación oficial de Google Live API:
   * - id: string (requerido)
   * - name: string (requerido)
   * - response: object (requerido)
   */
  private sendFunctionResponse(functionId: string, functionName: string, result: any): void {
    if (!this.session) {
      console.warn("⚠️ Cannot send function response, no session");
      return;
    }

    // Construir objeto de respuesta con valores primitivos
    // El API acepta objetos simples con campos de tipo string, number, boolean
    let responseData: Record<string, string | number | boolean>;

    if (typeof result === "string") {
      responseData = { result: result };
    } else if (typeof result === "number" || typeof result === "boolean") {
      responseData = { result: result };
    } else if (typeof result === "object" && result !== null) {
      // Para AdapterResult, extraer campos primitivos
      const summary = result.summary || result.message || "Function executed successfully";
      const confidence = result.confidence || 100;
      const type = result.type || "INFO";

      responseData = {
        success: true,
        message: String(summary),
        confidence: Number(confidence),
        result_type: String(type),
      };

      // Agregar detalles específicos si existen (solo primitivos)
      if (result.details) {
        const details = result.details;
        if (details.device_type) responseData.device_type = String(details.device_type);
        if (details.model) responseData.model = String(details.model);
        if (details.issue_description) responseData.issue = String(details.issue_description);
        if (details.solution_type) responseData.solution_type = String(details.solution_type);
        if (details.urgency) responseData.urgency = String(details.urgency);
        if (details.estimated_time) responseData.estimated_time = String(details.estimated_time);
        if (details.customer_name) responseData.customer_name = String(details.customer_name);
      }
    } else {
      responseData = { result: String(result) };
    }

    try {
      console.log("📤 Sending function response:", {
        id: functionId,
        name: functionName,
        response: responseData,
      });

      // Formato según documentación oficial: id, name, response
      this.session.sendToolResponse({
        functionResponses: [
          {
            id: functionId,
            name: functionName,  // Campo requerido que nos faltaba
            response: responseData,  // Objeto con valores primitivos
          },
        ],
      });

      console.log("✅ Function response sent successfully");
    } catch (error) {
      console.error("❌ Error sending function response:", error);
      // No propagar el error para que no rompa la sesión
    }
  }

  /**
   * Envía frame de video (1 fps)
   */
  sendVideoFrame(base64Image: string): void {
    if (!this.isConnected) {
      console.warn("⚠️ Cannot send video, not connected");
      return;
    }

    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      // Enviar via Backend ADK WebSocket
      this.sendToBackend({
        type: 'video',
        data: base64Image,
        mime_type: this.streamConfig.video.mimeType
      });
    } else {
      // Modo directo a Gemini
      if (!this.session) return;
      const blob: Blob = {
        data: base64Image,
        mimeType: this.streamConfig.video.mimeType,
      };
      this.session.sendRealtimeInput({ media: blob });
    }
  }

  /**
   * Envía chunk de audio (16kHz PCM)
   * Soporta modo binario (33% menos overhead) con fallback a Base64
   */
  sendAudioChunk(base64Audio: string): void {
    if (!this.isConnected) {
      console.warn("⚠️ Cannot send audio, not connected");
      return;
    }

    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      // Intentar enviar como binario si está habilitado
      if (this.useBinaryAudio && this.adkWebSocket?.readyState === WebSocket.OPEN) {
        try {
          // Convertir Base64 a ArrayBuffer y enviar directo (33% menos overhead)
          const binaryData = this.base64ToUint8Array(base64Audio);
          if (binaryData.length > 0) {
            this.adkWebSocket.send(binaryData.buffer);
            return; // Éxito - no continuar con fallback
          }
        } catch (e) {
          console.warn("⚠️ Binary audio failed, falling back to Base64");
          this.useBinaryAudio = false; // Deshabilitar para futuros chunks
        }
      }

      // Fallback: enviar como JSON + Base64
      this.sendToBackend({
        type: 'audio',
        data: base64Audio,
        mime_type: 'audio/pcm;rate=16000'
      });
    } else {
      // Modo directo a Gemini
      if (!this.session) return;
      const blob: Blob = {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      };
      this.session.sendRealtimeInput({ audio: blob });
    }
  }

  /**
   * Envía audio PCM16 directamente como Int16Array (sin Base64)
   * Más eficiente cuando el audio ya está en formato nativo
   */
  sendAudioPCM16(pcmData: Int16Array): void {
    if (!this.isConnected) {
      console.warn("⚠️ Cannot send audio, not connected");
      return;
    }

    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      if (this.useBinaryAudio && this.adkWebSocket?.readyState === WebSocket.OPEN) {
        try {
          // Enviar ArrayBuffer directamente - máxima eficiencia
          this.adkWebSocket.send(pcmData.buffer);
          return;
        } catch (e) {
          console.warn("⚠️ Binary audio failed, falling back to Base64");
          this.useBinaryAudio = false;
        }
      }

      // Fallback: convertir a Base64 y enviar como JSON
      const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
      this.sendToBackend({
        type: 'audio',
        data: base64Audio,
        mime_type: 'audio/pcm;rate=16000'
      });
    } else {
      // Modo directo a Gemini - convertir a Base64
      if (!this.session) return;
      const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
      const blob: Blob = {
        data: base64Audio,
        mimeType: "audio/pcm;rate=16000",
      };
      this.session.sendRealtimeInput({ audio: blob });
    }
  }

  /**
   * Convierte ArrayBuffer a Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Envía texto directo
   */
  sendText(text: string): void {
    if (!this.isConnected) {
      console.warn("⚠️ Cannot send text, not connected");
      return;
    }

    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      // Enviar via Backend ADK WebSocket
      this.sendToBackend({
        type: 'text',
        content: text
      });
    } else {
      // Modo directo a Gemini
      if (!this.session) return;
      this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
    }
  }

  /**
   * Envia mensaje al Backend ADK via WebSocket
   */
  private sendToBackend(message: any): void {
    if (this.adkWebSocket?.readyState === WebSocket.OPEN) {
      this.adkWebSocket.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ Backend WebSocket not ready, message dropped");
    }
  }

  /**
   * Desconecta la sesión
   */
  async disconnect(): Promise<void> {
    // Cerrar conexion segun el modo
    if (this.connectionMode === ConnectionMode.BACKEND_ADK) {
      if (this.adkWebSocket) {
        this.adkWebSocket.close();
        this.adkWebSocket = null;
      }
    } else {
      if (this.session) {
        this.session.close();
        this.session = undefined;
      }
    }

    // Detener audio streamer
    this._audioStreamer.stop();

    this.sessionActive = false;
    this.isConnectedSubject.next(false);
    this.currentAdapter = null;

    console.log("🔌 Disconnected from Gemini Live");
  }

  /**
   * Convierte string Base64 a Uint8Array
   * Maneja diferentes formatos de base64 (URL-safe, con/sin padding)
   */
  private base64ToUint8Array(base64: string | any): Uint8Array {
    // Si ya es Uint8Array o ArrayBuffer, retornar directamente
    if (base64 instanceof Uint8Array) {
      return base64;
    }
    if (base64 instanceof ArrayBuffer) {
      return new Uint8Array(base64);
    }
    if (typeof base64 !== 'string') {
      console.warn("base64ToUint8Array: unexpected type", typeof base64);
      return new Uint8Array(0);
    }

    try {
      // Limpiar el string: remover espacios, newlines
      let cleanBase64 = base64.replace(/[\s\n\r]/g, '');

      // Convertir de URL-safe base64 a standard base64
      cleanBase64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');

      // Agregar padding si es necesario
      const padLength = (4 - (cleanBase64.length % 4)) % 4;
      cleanBase64 += '='.repeat(padLength);

      // Decodificar
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes;
    } catch (error) {
      console.error("base64ToUint8Array: decode error", error);
      // Si falla, intentar interpretar como raw bytes string
      try {
        const bytes = new Uint8Array(base64.length);
        for (let i = 0; i < base64.length; i++) {
          bytes[i] = base64.charCodeAt(i);
        }
        return bytes;
      } catch {
        return new Uint8Array(0);
      }
    }
  }

  /**
   * Getters
   */
  get isConnected(): boolean {
    return this.isConnectedSubject.value;
  }

  get adapter(): IAgentAdapter | null {
    return this.currentAdapter;
  }

  get audioStreamer(): AudioStreamerService {
    return this._audioStreamer;
  }
}
