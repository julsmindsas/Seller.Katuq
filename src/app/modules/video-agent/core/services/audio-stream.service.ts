import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import { DEFAULT_STREAM_CONFIG } from "../models/agent-config.interface";
import { audioRecordingWorkletCode } from "../worklets/audio-recording.worklet";
import { volMeterWorkletCode } from "../worklets/vol-meter.worklet";

/**
 * Service para captura y streaming de audio
 * ACTUALIZADO: Usa AudioWorklets en vez de ScriptProcessorNode (deprecated)
 *
 * Optimizado según Gemini Live API specs: 16kHz mono 16-bit PCM
 * Basado en el demo oficial de Google
 */
@Injectable({
  providedIn: "root",
})
export class AudioStreamService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private recordingWorklet: AudioWorkletNode | null = null;
  private vuMeterWorklet: AudioWorkletNode | null = null;

  // Configuración de audio
  private readonly config = DEFAULT_STREAM_CONFIG.audio;
  private readonly targetSampleRate = DEFAULT_STREAM_CONFIG.audio.sampleRate; // 16000 Hz

  // Observables
  private isRecordingSubject = new BehaviorSubject<boolean>(false);
  public isRecording$ = this.isRecordingSubject.asObservable();

  private audioChunkSubject = new Subject<string>(); // Base64 PCM
  public audioChunk$ = this.audioChunkSubject.asObservable();

  private volumeSubject = new BehaviorSubject<number>(0);
  public volume$ = this.volumeSubject.asObservable();

  private errorSubject = new Subject<string>();
  public error$ = this.errorSubject.asObservable();

  constructor() {
    console.log("🎤 AudioStreamService initialized (with AudioWorklets)");
  }

  /**
   * Inicia captura de audio desde el micrófono
   * NUEVO: Usa AudioWorklets para procesamiento
   */
  async startRecording(): Promise<void> {
    try {
      // Solicitar acceso al micrófono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.config.channelCount,
          sampleRate: { ideal: this.targetSampleRate },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Crear AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.targetSampleRate,
        latencyHint: "interactive",
      });

      // Crear source node
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      );

      // Crear y registrar audio recording worklet
      await this.setupRecordingWorklet();

      // Crear y registrar VU meter worklet
      await this.setupVUMeterWorklet();

      // Conectar nodos
      this.sourceNode.connect(this.recordingWorklet!);
      this.sourceNode.connect(this.vuMeterWorklet!);

      // Opcional: conectar a destination para monitoring local
      // this.vuMeterWorklet!.connect(this.audioContext.destination);

      this.isRecordingSubject.next(true);
      console.log(
        "✅ Audio recording started at",
        this.targetSampleRate,
        "Hz (AudioWorklets)",
      );
    } catch (error) {
      console.error("❌ Error accessing microphone:", error);
      this.errorSubject.next(`Microphone access error: ${error}`);
      throw error;
    }
  }

  /**
   * Configura el AudioWorklet para recording
   */
  private async setupRecordingWorklet(): Promise<void> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    // Crear blob URL desde el código del worklet
    const workletBlob = new Blob([audioRecordingWorkletCode], {
      type: "application/javascript",
    });
    const workletUrl = URL.createObjectURL(workletBlob);

    try {
      // Registrar worklet module
      await this.audioContext.audioWorklet.addModule(workletUrl);

      // Crear worklet node
      this.recordingWorklet = new AudioWorkletNode(
        this.audioContext,
        "audio-recording-processor",
      );

      // Escuchar mensajes del worklet
      this.recordingWorklet.port.onmessage = (event: MessageEvent) => {
        const arrayBuffer = event.data.data.int16arrayBuffer;

        if (arrayBuffer) {
          // Convertir ArrayBuffer a Base64
          const base64Audio = this.arrayBufferToBase64(arrayBuffer);
          this.audioChunkSubject.next(base64Audio);
        }
      };

      console.log("✅ Recording worklet initialized");
    } finally {
      // Limpiar URL
      URL.revokeObjectURL(workletUrl);
    }
  }

  /**
   * Configura el AudioWorklet para VU meter
   */
  private async setupVUMeterWorklet(): Promise<void> {
    if (!this.audioContext) {
      throw new Error("AudioContext not initialized");
    }

    // Crear blob URL desde el código del worklet
    const workletBlob = new Blob([volMeterWorkletCode], {
      type: "application/javascript",
    });
    const workletUrl = URL.createObjectURL(workletBlob);

    try {
      // Registrar worklet module
      await this.audioContext.audioWorklet.addModule(workletUrl);

      // Crear worklet node
      this.vuMeterWorklet = new AudioWorkletNode(
        this.audioContext,
        "vol-meter",
      );

      // Escuchar mensajes del worklet (volumen)
      this.vuMeterWorklet.port.onmessage = (event: MessageEvent) => {
        this.volumeSubject.next(event.data.volume);
      };

      console.log("✅ VU meter worklet initialized");
    } finally {
      // Limpiar URL
      URL.revokeObjectURL(workletUrl);
    }
  }

  /**
   * Convierte ArrayBuffer a Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  /**
   * Detiene la grabación de audio
   */
  stopRecording(): void {
    // 🛡️ FIX: Establecer recording = false PRIMERO para bloquear nuevos chunks
    // Esto previene race conditions donde worklet messages pendientes se procesan
    this.isRecordingSubject.next(false);
    this.volumeSubject.next(0);

    // Desconectar message handlers INMEDIATAMENTE para ignorar mensajes pendientes
    if (this.recordingWorklet) {
      this.recordingWorklet.port.onmessage = null;
      this.recordingWorklet.disconnect();
      this.recordingWorklet = null;
    }

    if (this.vuMeterWorklet) {
      this.vuMeterWorklet.port.onmessage = null;
      this.vuMeterWorklet.disconnect();
      this.vuMeterWorklet = null;
    }

    // Desconectar source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Cerrar AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Detener tracks del stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log("✅ Audio recording stopped completely");
  }

  /**
   * Verifica si el dispositivo tiene micrófono
   */
  async hasMicrophone(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((device) => device.kind === "audioinput");
    } catch {
      return false;
    }
  }

  /**
   * Obtiene lista de micrófonos disponibles
   */
  async getMicrophones(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "audioinput");
    } catch (error) {
      console.error("❌ Error listing microphones:", error);
      return [];
    }
  }

  /**
   * Getters
   */
  get isRecording(): boolean {
    return this.isRecordingSubject.value;
  }

  get currentVolume(): number {
    return this.volumeSubject.value;
  }
}
