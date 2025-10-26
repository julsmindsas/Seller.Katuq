import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { createBlob, decode, decodeAudioData } from '../utils';
import { AudioStreamService } from '../../../services/gemini/audio/audio-stream.service';
import { AudioStreamerService } from '../../../services/gemini/audio/audio-streamer.service';

export interface AudioState {
  isRecording: boolean;
  status: string;
  error?: string;
}

/**
 * AudioProcessingService - Facade para servicios de audio compartidos
 * Mantiene compatibilidad con componentes existentes mientras delega a servicios modernos
 * OPTIMIZADO: Suscripción única para eliminar latencia
 */
@Injectable({
  providedIn: 'root'
})
export class AudioProcessingService implements OnDestroy {
  private inputAudioContext = new (AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  private outputAudioContext = new (AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  private _inputNode = this.inputAudioContext.createGain();
  private _outputNode = this.outputAudioContext.createGain();
  
  private nextStartTime = 0;
  private mediaStream!: MediaStream;
  private sourceNode!: MediaStreamAudioSourceNode;
  private scriptProcessorNode!: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  private audioStateSubject = new BehaviorSubject<AudioState>({
    isRecording: false,
    status: 'Listo para activar micrófono'
  });

  audioState$: Observable<AudioState> = this.audioStateSubject.asObservable();

  // Callback actual y suscripción para evitar memory leaks
  private currentCallback: ((pcmData: Float32Array) => void) | null = null;
  private audioChunkSubscription?: Subscription;

  get inputNode(): GainNode {
    return this._inputNode;
  }

  get outputNode(): GainNode {
    return this._outputNode;
  }

  constructor(
    private audioStreamService: AudioStreamService,
    private audioStreamer: AudioStreamerService
  ) {
    this.initAudio();
    this.initAudioChunkSubscription();
  }

  private initAudio(): void {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this._outputNode.connect(this.outputAudioContext.destination);

    // Inicializar AudioStreamer
    this.audioStreamer.initialize().catch(err => {
      console.error('❌ Error initializing AudioStreamer:', err);
      this.updateAudioState({
        isRecording: false,
        status: 'Error al inicializar audio',
        error: err.message
      });
    });
  }

  /**
   * Inicializa la suscripción UNA VEZ para eliminar latencia
   */
  private initAudioChunkSubscription(): void {
    this.audioChunkSubscription = this.audioStreamService.audioChunk$
      .subscribe((base64Chunk: string) => {
        if (!this.audioStateSubject.value.isRecording || !this.currentCallback) return;

        try {
          // Conversión eficiente de base64 a Float32Array
          const binary = atob(base64Chunk);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const int16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(int16.length);
          for (let i = 0; i < int16.length; i++) {
            float32[i] = int16[i] / 32768.0;
          }
          this.currentCallback(float32);
        } catch (error) {
          console.error('Error processing audio chunk:', error);
        }
      });
  }

  async startRecording(onAudioData: (pcmData: Float32Array) => void): Promise<void> {
    if (this.audioStateSubject.value.isRecording) {
      return;
    }

    this.updateStatus('Solicitando acceso al micrófono...');

    try {
      // Asignar callback (la suscripción ya existe en el constructor)
      this.currentCallback = onAudioData;

      // Delegar a AudioStreamService (usa AudioWorklets modernos)
      await this.audioStreamService.startRecording();

      this.updateStatus('Acceso al micrófono concedido. Capturando...');

      this.updateAudioState({
        isRecording: true,
        status: '🎤 Escuchando...'
      });

    } catch (err: any) {
      console.error('Error al iniciar la grabación:', err);
      this.currentCallback = null;
      this.updateAudioState({
        isRecording: false,
        status: 'Error al iniciar la grabación',
        error: err.message
      });
      this.stopRecording();
    }
  }

  stopRecording(): void {
    if (!this.audioStateSubject.value.isRecording) {
      return;
    }

    this.updateStatus('Deteniendo escucha...');

    this.updateAudioState({
      isRecording: false,
      status: 'Deteniendo escucha...'
    });

    // Limpiar callback
    this.currentCallback = null;

    // Delegar a AudioStreamService
    this.audioStreamService.stopRecording();

    this.updateStatus('Micrófono desactivado. Activa para comenzar.');
  }

  async playAudioData(audioData: any): Promise<void> {
    try {
      // Delegar a AudioStreamerService (queue-based, sin glitches)
      const pcmData = decode(audioData.data);

      // AudioStreamer espera Uint8Array de PCM16
      const uint8Data = new Uint8Array(pcmData);
      this.audioStreamer.addPCM16(uint8Data);

    } catch (error) {
      console.error('Error al reproducir audio:', error);
    }
  }

  stopAllAudio(): void {
    // Delegar a AudioStreamerService
    this.audioStreamer.stop();
  }

  /**
   * Getters para acceder a observables de volumen (para VU meters)
   */
  get inputVolume$(): Observable<number> {
    return this.audioStreamService.volume$;
  }

  get outputVolume$(): Observable<number> {
    // TODO: Implementar volumen de salida en AudioStreamerService si se necesita
    return new BehaviorSubject<number>(0).asObservable();
  }

  private updateStatus(message: string): void {
    const currentState = this.audioStateSubject.value;
    this.audioStateSubject.next({
      ...currentState,
      status: message,
      error: undefined
    });
  }

  private updateAudioState(newState: Partial<AudioState>): void {
    const currentState = this.audioStateSubject.value;
    this.audioStateSubject.next({
      ...currentState,
      ...newState
    });
  }

  /**
   * Limpieza al destruir el servicio
   */
  ngOnDestroy(): void {
    this.audioChunkSubscription?.unsubscribe();
    this.currentCallback = null;
  }
}