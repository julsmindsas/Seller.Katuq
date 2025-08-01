import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { GeminiAudioService, ConnectionStatus, KatuqToolEvent } from '../services/gemini-audio.service';
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
  currentKatuqToolEvent: KatuqToolEvent | null = null;

  get inputNode() {
    return this.audioService.inputNode;
  }

  get outputNode() {
    return this.audioService.outputNode;
  }

  private subscriptions: Subscription[] = [];

  constructor(
    private geminiService: GeminiAudioService,
    private audioService: AudioProcessingService,
    private router: Router
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

  closeFullscreen() {
    console.log('🔄 Cerrando pantalla completa de Live Audio');
    this.router.navigate(['/']);
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

    // Subscribe to tool calls (solo para mostrar status - el procesamiento es automático)
    const toolCallSub = this.geminiService.toolCall$.subscribe(
      (toolCall) => {
        if (toolCall) {
          console.log('🛠️ [LiveAudio] Llamada a herramienta detectada:', toolCall.name);
          this.status = `Herramienta ejecutada: ${toolCall.name}`;
          // Nota: El procesamiento y respuesta de herramientas ahora es automático en processTurns()
        }
      }
    );
    this.subscriptions.push(toolCallSub);

    // Subscribe to Katuq tool events for visual3d
    const katuqToolEventSub = this.geminiService.katuqToolEvent$.subscribe(
      (toolEvent: KatuqToolEvent | null) => {
        if (toolEvent) {
          console.log('🎨 [LiveAudio] Evento de herramienta Katuq para visual3d:', toolEvent);
          this.currentKatuqToolEvent = toolEvent;
          this.status = `Herramienta Katuq: ${toolEvent.toolName} - ${toolEvent.success ? 'Éxito' : 'Error'}`;
          
          // Forzar detección de cambios
          setTimeout(() => {
            console.log('🎨 [LiveAudio] Limpiando evento después de 3 segundos');
            this.currentKatuqToolEvent = null;
          }, 3000);
        } else {
          console.log('🎨 [LiveAudio] Evento de herramienta es null');
          this.currentKatuqToolEvent = null;
        }
      }
    );
    this.subscriptions.push(katuqToolEventSub);

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

  testVisuals(): void {
    console.log('🎨 [LiveAudio] Probando visuales...');
    
    // Probar diferentes herramientas
    const testTools = [
      'listWarehouses',
      'searchProductsAdvanced', 
      'addToCart',
      'searchClient',
      'configureBilling',
      'configureShipping',
      'processSale'
    ];
    
    let index = 0;
    const testInterval = setInterval(() => {
      if (index < testTools.length) {
        const toolName = testTools[index];
        console.log(`🎨 [LiveAudio] Probando herramienta: ${toolName}`);
        
        this.currentKatuqToolEvent = {
          toolName: toolName,
          stepName: 'Test Step',
          data: { test: true },
          success: true,
          message: `Prueba de ${toolName}`
        };
        
        this.status = `Probando: ${toolName}`;
        index++;
      } else {
        clearInterval(testInterval);
        console.log('🎨 [LiveAudio] Pruebas de visuales completadas');
        this.currentKatuqToolEvent = null;
        this.status = 'Pruebas completadas';
      }
    }, 2000); // Cambiar cada 2 segundos
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
