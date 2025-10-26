import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Servicio para streaming de audio con queue management
 * Basado en el AudioStreamer del demo oficial de Google
 *
 * Características:
 * - Queue de buffers para playback suave sin glitches
 * - Scheduling adelantado (200ms) para evitar interrupciones
 * - Manejo de PCM16 a Float32Array
 * - Soporte para 24kHz (output de Gemini Live API)
 */
@Injectable({
  providedIn: 'root'
})
export class AudioStreamerService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  // Queue management
  private audioQueue: Float32Array[] = [];
  private isPlaying: boolean = false;
  private scheduledTime: number = 0;
  private checkInterval: any = null;
  private isStreamComplete: boolean = false;
  private endOfQueueAudioSource: AudioBufferSourceNode | null = null;

  // Configuración
  private readonly sampleRate = 24000; // Output de Gemini es 24kHz
  private readonly bufferSize = 7680; // Tamaño de chunk óptimo
  private readonly initialBufferTime = 0.1; // 100ms de buffer inicial
  private readonly SCHEDULE_AHEAD_TIME = 0.2; // 200ms adelante

  // Observables
  private volumeSubject = new BehaviorSubject<number>(0);
  public volume$ = this.volumeSubject.asObservable();

  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  public isPlaying$ = this.isPlayingSubject.asObservable();

  constructor() {
    console.log('🔊 AudioStreamerService initialized');
  }

  /**
   * Inicializa el AudioContext
   */
  async initialize(): Promise<void> {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return;
    }

    this.audioContext = new AudioContext({
      sampleRate: this.sampleRate,
      latencyHint: 'interactive'
    });

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // Resume context si está suspended (necesario para algunos browsers)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('✅ AudioStreamer initialized at', this.sampleRate, 'Hz');
  }

  /**
   * Agrega chunk PCM16 a la queue
   * Este es el método principal para streaming de audio desde Gemini
   */
  addPCM16(chunk: Uint8Array): void {
    if (!this.audioContext || !this.gainNode) {
      console.warn('⚠️ AudioContext not initialized, call initialize() first');
      return;
    }

    // Reset stream complete flag cuando llega nuevo chunk
    this.isStreamComplete = false;

    // Convertir PCM16 a Float32Array
    let processingBuffer = this.processPCM16Chunk(chunk);

    // Dividir en buffers del tamaño óptimo
    while (processingBuffer.length >= this.bufferSize) {
      const buffer = processingBuffer.slice(0, this.bufferSize);
      this.audioQueue.push(buffer);
      processingBuffer = processingBuffer.slice(this.bufferSize);
    }

    // Agregar buffer restante si no está vacío
    if (processingBuffer.length > 0) {
      this.audioQueue.push(processingBuffer);
    }

    // Iniciar playback si no está reproduciendo
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.isPlayingSubject.next(true);

      // Inicializar scheduledTime con buffer inicial
      this.scheduledTime = this.audioContext.currentTime + this.initialBufferTime;

      this.scheduleNextBuffer();
      console.log('▶️ Audio playback started');
    }
  }

  /**
   * Convierte Uint8Array PCM16 a Float32Array
   * PCM16 está en rango [-32768, 32767]
   * Float32 debe estar en rango [-1.0, 1.0]
   */
  private processPCM16Chunk(chunk: Uint8Array): Float32Array {
    const float32Array = new Float32Array(chunk.length / 2);
    const dataView = new DataView(chunk.buffer);

    for (let i = 0; i < chunk.length / 2; i++) {
      try {
        const int16 = dataView.getInt16(i * 2, true); // true = little-endian
        float32Array[i] = int16 / 32768; // Normalizar a [-1.0, 1.0]
      } catch (e) {
        console.error('❌ Error processing PCM16 sample:', e);
      }
    }

    return float32Array;
  }

  /**
   * Programa buffers adelante para playback suave
   * Este es el corazón del sistema de queue management
   */
  private scheduleNextBuffer(): void {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    // Programar todos los buffers que quepan en la ventana de scheduling
    while (
      this.audioQueue.length > 0 &&
      this.scheduledTime < this.audioContext.currentTime + this.SCHEDULE_AHEAD_TIME
    ) {
      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.createAudioBuffer(audioData);
      const source = this.audioContext.createBufferSource();

      // Manejar último buffer para detectar fin de queue
      if (this.audioQueue.length === 0) {
        if (this.endOfQueueAudioSource) {
          this.endOfQueueAudioSource.onended = null;
        }

        this.endOfQueueAudioSource = source;
        source.onended = () => {
          if (!this.audioQueue.length && this.endOfQueueAudioSource === source) {
            this.endOfQueueAudioSource = null;
            this.onQueueComplete();
          }
        };
      }

      source.buffer = audioBuffer;
      source.connect(this.gainNode);

      // Asegurar que nunca programamos en el pasado
      const startTime = Math.max(
        this.scheduledTime,
        this.audioContext.currentTime
      );

      source.start(startTime);
      this.scheduledTime = startTime + audioBuffer.duration;
    }

    // Manejo de queue vacía
    if (this.audioQueue.length === 0) {
      if (this.isStreamComplete) {
        this.isPlaying = false;
        this.isPlayingSubject.next(false);

        if (this.checkInterval) {
          clearInterval(this.checkInterval);
          this.checkInterval = null;
        }
      } else {
        // Queue vacía pero stream no completo, chequear periódicamente
        if (!this.checkInterval) {
          this.checkInterval = setInterval(() => {
            if (this.audioQueue.length > 0) {
              this.scheduleNextBuffer();
            }
          }, 100);
        }
      }
    } else {
      // Hay más buffers, programar próximo chequeo
      const nextCheckTime = (this.scheduledTime - this.audioContext.currentTime) * 1000;
      setTimeout(
        () => this.scheduleNextBuffer(),
        Math.max(0, nextCheckTime - 50)
      );
    }
  }

  /**
   * Crea AudioBuffer desde Float32Array
   */
  private createAudioBuffer(audioData: Float32Array): AudioBuffer {
    const audioBuffer = this.audioContext!.createBuffer(
      1, // Mono
      audioData.length,
      this.sampleRate
    );

    audioBuffer.getChannelData(0).set(audioData);
    return audioBuffer;
  }

  /**
   * Callback cuando se completa la queue
   */
  private onQueueComplete(): void {
    console.log('✅ Audio queue completed');
    // Aquí se puede emitir evento si se necesita
  }

  /**
   * Detiene el playback inmediatamente
   */
  stop(): void {
    this.isPlaying = false;
    this.isStreamComplete = true;
    this.audioQueue = [];

    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Fade out suave
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + 0.1
      );

      setTimeout(() => {
        if (this.gainNode && this.audioContext) {
          this.gainNode.disconnect();
          this.gainNode = this.audioContext.createGain();
          this.gainNode.connect(this.audioContext.destination);
          this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
        }
      }, 200);
    }

    this.isPlayingSubject.next(false);
    console.log('🛑 Audio playback stopped');
  }

  /**
   * Resume el playback después de pause
   */
  async resume(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
      return;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isStreamComplete = false;

    if (this.audioContext && this.gainNode) {
      this.scheduledTime = this.audioContext.currentTime + this.initialBufferTime;
      this.gainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
    }

    console.log('▶️ Audio playback resumed');
  }

  /**
   * Marca el stream como completo (no más chunks llegarán)
   */
  complete(): void {
    this.isStreamComplete = true;
    console.log('✅ Audio stream marked as complete');
  }

  /**
   * Limpia recursos
   */
  async cleanup(): Promise<void> {
    this.stop();

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.gainNode = null;
    console.log('🧹 AudioStreamer cleaned up');
  }

  /**
   * Getters
   */
  get isActive(): boolean {
    return this.isPlaying;
  }

  get queueLength(): number {
    return this.audioQueue.length;
  }

  get currentTime(): number {
    return this.audioContext?.currentTime || 0;
  }

  get state(): AudioContextState | null {
    return this.audioContext?.state || null;
  }
}
