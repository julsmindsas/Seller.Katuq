import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createBlob, decode, decodeAudioData } from '../utils';

export interface AudioState {
  isRecording: boolean;
  status: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AudioProcessingService {
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

  get inputNode(): GainNode {
    return this._inputNode;
  }

  get outputNode(): GainNode {
    return this._outputNode;
  }

  constructor() {
    this.initAudio();
  }

  private initAudio(): void {
    this.nextStartTime = this.outputAudioContext.currentTime;
    this._outputNode.connect(this.outputAudioContext.destination);
  }

  async startRecording(onAudioData: (pcmData: Float32Array) => void): Promise<void> {
    if (this.audioStateSubject.value.isRecording) {
      return;
    }

    this.inputAudioContext.resume();
    this.updateStatus('Solicitando acceso al micrófono...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Acceso al micrófono concedido. Capturando...');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this._inputNode);

      const bufferSize = 4096;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.audioStateSubject.value.isRecording) return;
        
        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        onAudioData(pcmData);
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.updateAudioState({
        isRecording: true,
        status: '🎤 Escuchando...'
      });

    } catch (err: any) {
      console.error('Error al iniciar la grabación:', err);
      this.updateAudioState({
        isRecording: false,
        status: 'Error al iniciar la grabación',
        error: err.message
      });
      this.stopRecording();
    }
  }

  stopRecording(): void {
    if (!this.audioStateSubject.value.isRecording && !this.mediaStream && !this.inputAudioContext) {
      return;
    }

    this.updateStatus('Deteniendo escucha...');

    this.updateAudioState({
      isRecording: false,
      status: 'Deteniendo escucha...'
    });

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null!;
    this.sourceNode = null!;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null!;
    }

    this.updateStatus('Micrófono desactivado. Activa para comenzar.');
  }

  async playAudioData(audioData: any): Promise<void> {
    try {
      this.nextStartTime = Math.max(
        this.nextStartTime,
        this.outputAudioContext.currentTime,
      );

      const audioBuffer = await decodeAudioData(
        decode(audioData.data),
        this.outputAudioContext,
        24000,
        1,
      );
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._outputNode);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime = this.nextStartTime + audioBuffer.duration;
      this.sources.add(source);
    } catch (error) {
      console.error('Error al reproducir audio:', error);
    }
  }

  stopAllAudio(): void {
    for (const source of this.sources.values()) {
      source.stop();
      this.sources.delete(source);
    }
    this.nextStartTime = 0;
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
}