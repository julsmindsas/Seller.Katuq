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
 * Core service para Gemini Live API con video streaming
 * Refactorizado para usar @google/genai SDK (igual que gemini-audio.service)
 * ACTUALIZADO: Integrado con AudioStreamerService para playback sin glitches
 */
@Injectable({
  providedIn: "root",
})
export class GeminiLiveService {
  private client!: GoogleGenAI;
  private session: Session | undefined = undefined;
  private currentAdapter: IAgentAdapter | null = null;
  private streamConfig: StreamConfig = DEFAULT_STREAM_CONFIG;

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
   * Conecta a Gemini Live API con un adapter específico
   */
  async connect(adapter: IAgentAdapter): Promise<void> {
    if (this.sessionActive) {
      console.warn("⚠️ Session already active, disconnecting first");
      await this.disconnect();
    }

    this.currentAdapter = adapter;

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
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede", // Voz femenina en español
          },
        },
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
      console.log("🔌 Conectando a Gemini Live API con SDK...");

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

    // Enviar respuesta de la función al servidor como STRING
    // Gemini espera que la respuesta sea un string, no un objeto
    const responseMessage = `Analysis completed: ${result.summary}. Confidence: ${result.confidence}%. Type: ${result.type}.`;

    this.sendFunctionResponse(
      functionCall.id || functionCall.name,
      responseMessage,
    );
  }

  /**
   * Envía respuesta de función ejecutada
   */
  private sendFunctionResponse(functionId: string, result: any): void {
    if (!this.session) {
      console.warn("⚠️ Cannot send function response, no session");
      return;
    }

    // Convertir result a Record<string, unknown>
    let responseData: Record<string, unknown>;

    if (typeof result === "string") {
      try {
        // Si es string, intentar parsear como JSON
        responseData = JSON.parse(result);
      } catch {
        // Si no es JSON válido, envolver en objeto
        responseData = { result };
      }
    } else if (typeof result === "object" && result !== null) {
      // Si ya es objeto, usar directamente
      responseData = result;
    } else {
      // Para otros tipos (number, boolean, etc), envolver
      responseData = { result };
    }

    try {
      this.session.sendToolResponse({
        functionResponses: [
          {
            id: functionId,
            response: responseData,
          },
        ],
      });
      console.log("✅ Function response sent:", functionId);
    } catch (error) {
      console.error("❌ Error sending function response:", error);
      // No propagar el error para que no rompa la sesión
    }
  }

  /**
   * Envía frame de video (1 fps)
   */
  sendVideoFrame(base64Image: string): void {
    if (!this.isConnected || !this.session) {
      console.warn("⚠️ Cannot send video, not connected");
      return;
    }

    // Crear SDK Blob con formato correcto
    const blob: Blob = {
      data: base64Image,
      mimeType: this.streamConfig.video.mimeType,
    };

    this.session.sendRealtimeInput({ media: blob });
  }

  /**
   * Envía chunk de audio (16kHz PCM)
   */
  sendAudioChunk(base64Audio: string): void {
    if (!this.isConnected || !this.session) {
      console.warn("⚠️ Cannot send audio, not connected");
      return;
    }

    // Crear SDK Blob con formato correcto (igual que el voice service)
    const blob: Blob = {
      data: base64Audio,
      mimeType: "audio/pcm;rate=16000",
    };

    this.session.sendRealtimeInput({ audio: blob });
  }

  /**
   * Envía texto directo
   */
  sendText(text: string): void {
    if (!this.isConnected || !this.session) {
      console.warn("⚠️ Cannot send text, not connected");
      return;
    }

    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  /**
   * Desconecta la sesión
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = undefined;
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
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
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
