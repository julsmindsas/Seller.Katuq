import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { GeminiLiveService } from "../../core/services/gemini-live.service";
import { VideoStreamService } from "../../core/services/video-stream.service";
import { AudioStreamService } from "../../core/services/audio-stream.service";
import { AdapterRegistryService } from "../../core/services/adapter-registry.service";
import { HacebAdapter } from "../../adapters/haceb-adapter";
import {
  AgentIndustry,
  AdapterResult,
} from "../../core/models/agent-adapter.interface";
import { ServerMessage } from "../../core/models/agent-config.interface";

/**
 * Componente principal para sesiones de Video Agent
 * Integra video, audio y Gemini Live API
 */
@Component({
  selector: "app-agent-session",
  templateUrl: "./agent-session.component.html",
  styleUrls: ["./agent-session.component.scss"],
})
export class AgentSessionComponent implements OnInit, OnDestroy {
  @ViewChild("videoPreview", { static: false })
  videoPreview!: ElementRef<HTMLDivElement>;

  // Estado de la sesión
  isConnected = false;
  isVideoStreaming = false;
  isAudioRecording = false;
  isAudioPlaying = false;
  sessionActive = false;

  // Volúmenes de audio
  inputVolume = 0;
  outputVolume = 0;

  // Industria seleccionada
  selectedIndustry: AgentIndustry = AgentIndustry.APPLIANCE;
  availableIndustries: AgentIndustry[] = [];

  // Mensajes y transcripciones
  transcript = "";
  messages: Array<{ role: "user" | "agent"; text: string; timestamp: Date }> =
    [];

  // Resultados del diagnóstico
  currentResult: AdapterResult | null = null;
  showResultPanel = false;

  // UI State
  isLoading = false;
  errorMessage = "";
  cameraFacingMode: "user" | "environment" = "environment";

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private geminiService: GeminiLiveService,
    private videoService: VideoStreamService,
    private audioService: AudioStreamService,
    private adapterRegistry: AdapterRegistryService,
  ) {}

  ngOnInit(): void {
    this.initializeAdapters();
    this.setupSubscriptions();
    this.checkDeviceCapabilities();
  }

  ngOnDestroy(): void {
    this.endSession();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa y registra adapters disponibles
   */
  private initializeAdapters(): void {
    // Registrar Haceb adapter
    const hacebAdapter = new HacebAdapter();
    this.adapterRegistry.registerAdapter(hacebAdapter, true, 100);

    // TODO: Registrar otros adapters aquí (automotive, healthcare, etc.)

    // Obtener industrias disponibles
    this.availableIndustries = this.adapterRegistry.getAvailableIndustries();

    // Establecer adapter por defecto
    this.adapterRegistry.setCurrentAdapter(this.selectedIndustry);

    console.log("✅ Adapters initialized:", this.availableIndustries);
  }

  /**
   * Configura suscripciones a observables
   */
  private setupSubscriptions(): void {
    // Estado de conexión Gemini
    this.geminiService.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((connected) => {
        this.isConnected = connected;
      });

    // Transcripciones
    this.geminiService.transcript$
      .pipe(takeUntil(this.destroy$))
      .subscribe((text) => {
        if (text) {
          this.transcript = text;
          this.addMessage("agent", text);
        }
      });

    // Respuestas del servidor
    this.geminiService.serverResponse$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.handleServerResponse(response);
      });

    // Audio del servidor - Ya no es necesario suscribirse aquí
    // El AudioStreamerService en gemini-live.service maneja la reproducción automáticamente

    // Frames de video
    this.videoService.frame$
      .pipe(takeUntil(this.destroy$))
      .subscribe((frameBase64) => {
        if (this.isConnected) {
          this.geminiService.sendVideoFrame(frameBase64);
        }
      });

    // Chunks de audio
    this.audioService.audioChunk$
      .pipe(takeUntil(this.destroy$))
      .subscribe((chunkBase64) => {
        if (this.isConnected) {
          this.geminiService.sendAudioChunk(chunkBase64);
        }
      });

    // Estado de video streaming
    this.videoService.isStreaming$
      .pipe(takeUntil(this.destroy$))
      .subscribe((streaming) => {
        this.isVideoStreaming = streaming;
      });

    // Estado de audio recording
    this.audioService.isRecording$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recording) => {
        this.isAudioRecording = recording;
      });

    // Volumen de entrada (micrófono)
    this.audioService.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe((volume) => {
        this.inputVolume = volume;
      });

    // Estado de audio playback (Gemini response)
    this.geminiService.audioStreamer.isPlaying$
      .pipe(takeUntil(this.destroy$))
      .subscribe((playing) => {
        this.isAudioPlaying = playing;
      });

    // Volumen de salida (respuesta de Gemini)
    this.geminiService.audioStreamer.volume$
      .pipe(takeUntil(this.destroy$))
      .subscribe((volume) => {
        this.outputVolume = volume;
      });

    // Errores
    this.geminiService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.showError(error);
      });
  }

  /**
   * Verifica capacidades del dispositivo
   */
  private async checkDeviceCapabilities(): Promise<void> {
    const hasCamera = await this.videoService.hasCamera();
    const hasMic = await this.audioService.hasMicrophone();

    if (!hasCamera) {
      this.showError("No se detectó cámara en este dispositivo");
    }

    if (!hasMic) {
      this.showError("No se detectó micrófono en este dispositivo");
    }

    console.log("📱 Device capabilities:", { hasCamera, hasMic });
  }

  /**
   * Inicia una nueva sesión de diagnóstico
   */
  async startSession(): Promise<void> {
    try {
      this.isLoading = true;
      this.errorMessage = "";
      this.messages = [];
      this.currentResult = null;

      // Establecer adapter seleccionado
      this.adapterRegistry.setCurrentAdapter(this.selectedIndustry);
      const adapter = this.adapterRegistry.currentAdapter;

      if (!adapter) {
        throw new Error("No se pudo cargar el adapter seleccionado");
      }

      // Conectar a Gemini Live
      await this.geminiService.connect(adapter);

      // Iniciar captura de video
      await this.videoService.startCapture(this.cameraFacingMode);

      // Mostrar preview en UI
      this.attachVideoPreview();

      // Iniciar captura de audio
      await this.audioService.startRecording();

      this.sessionActive = true;
      this.isLoading = false;

      this.addMessage(
        "agent",
        "¡Hola! Soy tu asistente de diagnóstico. Muéstrame el electrodoméstico y cuéntame qué problema tiene.",
      );

      console.log("✅ Session started successfully");
    } catch (error) {
      console.error("❌ Error starting session:", error);
      this.showError(`Error al iniciar sesión: ${error}`);
      this.isLoading = false;
    }
  }

  /**
   * Finaliza la sesión actual
   */
  async endSession(): Promise<void> {
    this.sessionActive = false;

    // Detener servicios
    this.videoService.stopCapture();
    this.audioService.stopRecording();
    await this.geminiService.disconnect();

    console.log("🛑 Session ended");
  }

  /**
   * Adjunta video preview al contenedor
   */
  private attachVideoPreview(): void {
    if (!this.videoPreview) {
      return;
    }

    const videoElement = this.videoService.getVideoElement();

    if (videoElement) {
      // Limpiar contenedor
      this.videoPreview.nativeElement.innerHTML = "";

      // Agregar video
      videoElement.style.width = "100%";
      videoElement.style.height = "100%";
      videoElement.style.objectFit = "cover";
      videoElement.style.borderRadius = "12px";

      this.videoPreview.nativeElement.appendChild(videoElement);
    }
  }

  /**
   * Cambia entre cámara frontal y trasera
   */
  async switchCamera(): Promise<void> {
    try {
      await this.videoService.switchCamera();
      this.cameraFacingMode =
        this.cameraFacingMode === "user" ? "environment" : "user";
      this.attachVideoPreview();
    } catch (error) {
      this.showError("Error al cambiar cámara");
    }
  }

  /**
   * Maneja respuestas del servidor
   */
  private handleServerResponse(response: ServerMessage): void {
    // Aquí puedes procesar respuestas específicas
    console.log("📥 Server response:", response);

    // Si hay resultado de diagnóstico, mostrarlo
    if (response.serverContent?.modelTurn?.parts) {
      const parts = response.serverContent.modelTurn.parts;

      parts.forEach((part) => {
        if (part.functionCall) {
          // Procesar con adapter
          const adapter = this.adapterRegistry.currentAdapter;

          if (adapter) {
            this.currentResult = adapter.processResult(part.functionCall);
            this.showResultPanel = true;
          }
        }
      });
    }
  }

  /**
   * Agrega mensaje al historial
   */
  private addMessage(role: "user" | "agent", text: string): void {
    this.messages.push({
      role,
      text,
      timestamp: new Date(),
    });

    // Auto-scroll al último mensaje
    setTimeout(() => {
      const container = document.querySelector(".messages-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  /**
   * Muestra error en UI
   */
  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = "";
    }, 5000);
  }

  /**
   * Cambia industria seleccionada
   */
  onIndustryChange(): void {
    if (this.sessionActive) {
      // Si hay sesión activa, preguntar si quiere reiniciar
      const confirmRestart = confirm(
        "¿Deseas reiniciar la sesión con el nuevo tipo de asistente?",
      );

      if (confirmRestart) {
        this.endSession();
        setTimeout(() => {
          this.startSession();
        }, 500);
      }
    }
  }

  /**
   * Cierra el panel de resultados
   */
  closeResultPanel(): void {
    this.showResultPanel = false;
  }
}
