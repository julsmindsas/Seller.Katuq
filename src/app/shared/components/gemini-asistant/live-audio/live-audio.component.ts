import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { GeminiAudioService, ConnectionStatus } from '../services/gemini-audio.service';
import { AudioProcessingService, AudioState } from '../services/audio-processing.service';
import { createBlob } from '../utils';

@Component({
  selector: 'app-live-audio',
  templateUrl: './live-audio.component.html',
  styleUrls: ['./live-audio.component.scss']
})
export class LiveAudioComponent implements OnInit, OnDestroy {
  isRecording = false;
  status = '';
  error = '';

  get inputNode() {
    return this.audioService.inputNode;
  }

  get outputNode() {
    return this.audioService.outputNode;
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private geminiService: GeminiAudioService,
    private audioService: AudioProcessingService
  ) { }

  ngOnInit(): void {
    this.initSubscriptions();
    console.log('🎤 [LiveAudio] Iniciando componente con herramientas Katuq...');
    // Inicializar con herramientas de Katuq en lugar de sesión básica
    this.geminiService.initSessionWithKatuqTools();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.geminiService.closeSession();
    this.audioService.stopRecording();
  }

  private initSubscriptions(): void {
    // Subscribe to connection status
    const connectionSub = this.geminiService.connectionStatus$.subscribe(
      (status: ConnectionStatus) => {
        this.status = status.message;
        if (status.status === 'error') {
          this.error = status.message;
        } else {
          this.error = '';
        }
      }
    );
    this.subscriptions.push(connectionSub);

    // Subscribe to audio state
    const audioSub = this.audioService.audioState$.subscribe(
      (audioState: AudioState) => {
        this.isRecording = audioState.isRecording;
        if (audioState.status) {
          this.status = audioState.status;
        }
        if (audioState.error) {
          this.error = audioState.error;
        }
      }
    );
    this.subscriptions.push(audioSub);

    // Subscribe to incoming audio data
    const audioDataSub = this.geminiService.audioData$.subscribe(
      (audioData) => {
        if (audioData) {
          if (audioData.interrupted) {
            this.audioService.stopAllAudio();
          } else if (audioData.data) {
            this.audioService.playAudioData(audioData);
          }
        }
      }
    );
    this.subscriptions.push(audioDataSub);

    // Subscribe to tool calls (nuevo)
    const toolCallSub = this.geminiService.toolCall$.subscribe(
      (toolCall) => {
        if (toolCall) {
          console.log('🛠️ [LiveAudio] Llamada a herramienta detectada:', toolCall);
          this.status = `Herramienta llamada: ${toolCall.name}`;
          
          // Procesar la herramienta Katuq
          const response = this.geminiService.handleKatuqToolResponse(toolCall);
          console.log('📤 [LiveAudio] Respuesta de herramienta:', response);
          
          // Enviar la respuesta de vuelta al modelo con delay
          setTimeout(() => {
            console.log('⏳ [LiveAudio] Enviando respuesta después de delay...');
            this.geminiService.sendToolResponse({
              toolCallId: toolCall.id,
              response: response
            });
          }, 500); // Delay de 500ms para asegurar estabilidad
        }
      }
    );
    this.subscriptions.push(toolCallSub);

    // Subscribe to text responses (nuevo)
    const textResponseSub = this.geminiService.textResponse$.subscribe(
      (text) => {
        if (text) {
          console.log('💬 [LiveAudio] Respuesta de texto recibida:', text);
          this.status = `Respuesta: ${text.substring(0, 50)}...`;
        }
      }
    );
    this.subscriptions.push(textResponseSub);
  }

  async startRecording(): Promise<void> {
    await this.audioService.startRecording((pcmData: Float32Array) => {
      this.geminiService.sendRealtimeInput(createBlob(pcmData));
    });
  }

  stopRecording(): void {
    this.audioService.stopRecording();
  }

  reset(): void {
    this.geminiService.resetSession();
    this.status = 'Session cleared.';
  }

  /**
   * Método para probar las herramientas de Katuq
   */
  testKatuqTools(): void {
    console.log('🧪 [LiveAudio] Probando herramientas Katuq...');
    this.geminiService.testKatuqTools();
  }

  /**
   * Enviar mensaje de prueba para activar herramientas
   */
  sendTestMessage(message: string): void {
    console.log('📤 [LiveAudio] Enviando mensaje de prueba:', message);
    this.geminiService.sendTextMessage(message);
  }

  /**
   * Probar el flujo completo de herramientas
   */
  testCompleteFlow(): void {
    console.log('🧪 [LiveAudio] Probando flujo completo de herramientas...');
    this.geminiService.testCompleteToolFlow();
  }
}
