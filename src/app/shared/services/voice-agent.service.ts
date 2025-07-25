import { Injectable, OnDestroy, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToolAdapter, TOOL_ADAPTER } from './tools/tool-adapter';
import { AvatarCanvasService, AvatarState } from './avatar-canvas.service';

// Interfaces para los eventos del agente de voz
export interface VoiceAgentConfig {
  agentName?: string;
  instructions?: string;
  model?: string;
  voice?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface VoiceAgentState {
  isConnected: boolean;
  isListening: boolean;
  isProcessing: boolean;
  callDuration: string;
  currentText: string;
  errorMessage: string | null;
}

export interface VisualStep {
  imageUrl: string;
  caption?: string;
  stepNumber?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceAgentService implements OnDestroy {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private callTimer: any = null;
  private callStartTime: number = 0;
  private callSeconds: number = 0;
  private events: any[] = [];

  // Subjects para observables
  private stateSubject = new BehaviorSubject<VoiceAgentState>({
    isConnected: false,
    isListening: false,
    isProcessing: false,
    callDuration: '00:00',
    currentText: '',
    errorMessage: null
  });

  private visualStepsSubject = new BehaviorSubject<VisualStep[]>([]);
  private currentStepIndexSubject = new BehaviorSubject<number>(0);
  private audioEventSubject = new Subject<any>();
  private responseEventSubject = new Subject<any>();

  // Observables públicos
  public state$ = this.stateSubject.asObservable();
  public visualSteps$ = this.visualStepsSubject.asObservable();
  public currentStepIndex$ = this.currentStepIndexSubject.asObservable();
  public audioEvent$ = this.audioEventSubject.asObservable();
  public responseEvent$ = this.responseEventSubject.asObservable();

  constructor(
    private httpClient: HttpClient,
    @Inject(TOOL_ADAPTER) private toolAdapter: ToolAdapter,
    private avatarService: AvatarCanvasService
  ) {}

  async startVoiceSession(config?: VoiceAgentConfig): Promise<void> {
    try {
      this.updateState({ isProcessing: true, errorMessage: null });

      // Obtener token ephemeral de la API
      const tokenResponse = await this.httpClient.get(`${environment.urlApi}/v1/katuqintelligence/token`).toPromise();
      const data = tokenResponse as any;
      const ephemeralKey = data.client_secret.value;

      // Iniciar la sesión WebRTC directamente
      await this.startWebRTCSession(ephemeralKey, config);

      // Iniciar cronómetro
      this.startCallTimer();

      this.updateState({ 
        isConnected: true, 
        isListening: true, 
        isProcessing: false,
        currentText: 'Escuchando...' 
      });

      // Actualizar estado del avatar
      this.avatarService.setState(AvatarState.LISTENING);

    } catch (error: any) {
      console.error('Error al iniciar sesión de voz:', error);
      this.updateState({ 
        isProcessing: false,
        errorMessage: `Error: ${error.message}` 
      });
      throw error;
    }
  }

  private async startWebRTCSession(ephemeralKey: string, config?: VoiceAgentConfig): Promise<void> {
    // Crear conexión peer
    this.peerConnection = new RTCPeerConnection();

    // Configurar para reproducir audio remoto
    if (this.audioElement) {
      document.body.removeChild(this.audioElement);
    }

    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.volume = 1.0;
    this.audioElement.setAttribute('playsinline', '');
    this.audioElement.style.display = 'none';
    document.body.appendChild(this.audioElement);

    // Configurar evento ontrack
    this.peerConnection.ontrack = (e) => {
      console.log("Pista de audio recibida:", e.streams[0]);

      if (this.audioElement) {
        this.audioElement.srcObject = e.streams[0];

        // Conectar el stream al avatar para análisis de audio
        this.avatarService.connectAudioStream(e.streams[0]);

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio reproduciendo correctamente");
              this.updateState({ errorMessage: null });
            })
            .catch((err) => {
              console.error("Error reproduciendo audio:", err);
              this.updateState({ errorMessage: `Error de reproducción: ${err.message}` });
            });
        }
      }
    };

    // Añadir pista de audio local para entrada de micrófono
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.peerConnection.addTrack(ms.getTracks()[0]);
      console.log("Micrófono conectado correctamente");
    } catch (err: any) {
      console.error("Error al acceder al micrófono:", err);
      this.updateState({ errorMessage: `Error de micrófono: ${err.message}` });
      throw err;
    }

    // Configurar canal de datos para eventos
    this.dataChannel = this.peerConnection.createDataChannel("oai-events");
    this.setupDataChannelEvents(config);

    // Iniciar sesión usando SDP
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    const modelBig = "gpt-4o-realtime-preview-2025-06-03";
    const modelMini = "gpt-4o-mini-realtime-preview-2024-12-17";
    const model = environment.useModelBig ? modelBig : modelMini;

    // Realizar la petición a la API de OpenAI
    const response = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await response.text(),
    };
    await this.peerConnection.setRemoteDescription(answer as RTCSessionDescriptionInit);
  }

  // Configurar eventos para el canal de datos
  private setupDataChannelEvents(config?: VoiceAgentConfig): void {
    if (this.dataChannel) {
      this.dataChannel.onopen = () => {
        console.log('Canal de datos abierto');
        this.events = [];

        // Configurar la sesión con modalidades y herramientas
        const configEvent = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: config?.instructions || 'Eres un asistente virtual inteligente de Katuq. Ayudas a los usuarios con ventas, inventarios y gestión empresarial.',
            voice: config?.voice || 'alloy',
            temperature: config?.temperature || 0.8,
            max_response_output_tokens: config?.maxTokens || 4096,
            tools: this.toolAdapter.getToolsMetadata()
          }
        };

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify(configEvent));
        }
      };

      this.dataChannel.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        console.log('Received message:', msg);

        if (!msg.timestamp) {
          msg.timestamp = new Date().toLocaleTimeString();
        }
        this.events = [msg, ...this.events];

        // Actualizar texto actual basado en el tipo de mensaje
        if (msg.type === 'response.text.delta') {
          this.updateState({ currentText: msg.delta || 'Procesando...' });
          // Avatar está procesando/pensando
          this.avatarService.setState(AvatarState.THINKING);
        } else if (msg.type === 'response.text.done') {
          this.updateState({ currentText: msg.text || 'Escuchando...' });
          // Avatar vuelve a escuchar
          this.avatarService.setState(AvatarState.LISTENING);
        }

        // Procesar llamadas a funciones
        if (msg.type === 'response.function_call_arguments.done') {
          try {
            const args = msg.arguments ? JSON.parse(msg.arguments) : {};
            const result = await this.toolAdapter.executeTool(msg.name, args);
            console.log('Tool result:', result);

            // Hacer que el avatar reaccione al resultado de la herramienta
            this.avatarService.reactToOrderEvent(msg.name, result);

            const event = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: msg.call_id,
                output: JSON.stringify(result)
              }
            };

            this.dataChannel?.send(JSON.stringify(event));
            this.dataChannel?.send(JSON.stringify({ type: "response.create" }));
          } catch (error: any) {
            console.error(`Error ejecutando herramienta ${msg.name}:`, error);
            // Avatar reacciona al error
            this.avatarService.setState(AvatarState.ERROR);
          }
        }
      };
    }
  }

  async stopVoiceSession(): Promise<void> {
    try {
      // Detener cronómetro
      this.stopCallTimer();

      // Limpiar WebRTC
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      if (this.peerConnection) {
        this.peerConnection.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Limpiar el elemento de audio
      if (this.audioElement) {
        this.audioElement.srcObject = null;
        if (document.body.contains(this.audioElement)) {
          document.body.removeChild(this.audioElement);
        }
        this.audioElement = null;
      }

      // Limpiar estado
      this.updateState({
        isConnected: false,
        isListening: false,
        isProcessing: false,
        callDuration: '00:00',
        currentText: '',
        errorMessage: null
      });

      // Desconectar y resetear avatar
      this.avatarService.disconnectAudioStream();
      this.avatarService.setState(AvatarState.IDLE);

      // Limpiar contenido visual
      this.clearVisualContent();

    } catch (error: any) {
      console.error('Error al detener sesión de voz:', error);
      this.updateState({ errorMessage: `Error al desconectar: ${error.message}` });
    }
  }

  // Enviar mensaje de texto
  sendTextMessage(message: string): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const event = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: message }],
        },
      };

      this.dataChannel.send(JSON.stringify(event));
      this.dataChannel.send(JSON.stringify({ type: "response.create" }));
    } else {
      console.warn('No hay sesión activa para enviar mensaje');
    }
  }

  // Interrumpir al agente
  interrupt(): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      // Enviar comando de interrupción
      const event = { type: "response.cancel" };
      this.dataChannel.send(JSON.stringify(event));
    }
  }

  // Métodos para gestión de contenido visual
  addVisualStep(step: VisualStep): void {
    const currentSteps = this.visualStepsSubject.value;
    const newSteps = [...currentSteps, { ...step, stepNumber: currentSteps.length + 1 }];
    this.visualStepsSubject.next(newSteps);
  }

  setVisualSteps(steps: VisualStep[]): void {
    const numberedSteps = steps.map((step, index) => ({ 
      ...step, 
      stepNumber: index + 1 
    }));
    this.visualStepsSubject.next(numberedSteps);
  }

  clearVisualContent(): void {
    this.visualStepsSubject.next([]);
    this.currentStepIndexSubject.next(0);
  }

  goToStep(stepIndex: number): void {
    const steps = this.visualStepsSubject.value;
    if (stepIndex >= 0 && stepIndex < steps.length) {
      this.currentStepIndexSubject.next(stepIndex);
    }
  }

  nextStep(): boolean {
    const currentIndex = this.currentStepIndexSubject.value;
    const steps = this.visualStepsSubject.value;
    if (currentIndex < steps.length - 1) {
      this.currentStepIndexSubject.next(currentIndex + 1);
      return true;
    }
    return false;
  }

  previousStep(): boolean {
    const currentIndex = this.currentStepIndexSubject.value;
    if (currentIndex > 0) {
      this.currentStepIndexSubject.next(currentIndex - 1);
      return true;
    }
    return false;
  }

  // Iniciar cronómetro de llamada
  private startCallTimer(): void {
    this.callStartTime = Date.now();
    this.callSeconds = 0;

    if (this.callTimer) {
      clearInterval(this.callTimer);
    }

    this.callTimer = setInterval(() => {
      this.callSeconds++;
      const minutes = Math.floor(this.callSeconds / 60);
      const seconds = this.callSeconds % 60;
      const duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      this.updateState({ callDuration: duration });
    }, 1000);
  }

  // Detener cronómetro de llamada
  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  // Actualizar estado
  private updateState(updates: Partial<VoiceAgentState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...updates });
  }

  // Obtener estado actual
  getCurrentState(): VoiceAgentState {
    return this.stateSubject.value;
  }

  // Obtener servicio del avatar para uso externo
  getAvatarService(): AvatarCanvasService {
    return this.avatarService;
  }

  // Verificar si hay sesión activa
  isSessionActive(): boolean {
    return this.peerConnection !== null && this.stateSubject.value.isConnected;
  }

  ngOnDestroy(): void {
    this.stopVoiceSession();
  }
} 