import { Component, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { VoiceWebsocketService } from '../../../shared/services/voice-websocket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-voice-interaction',
  template: `
    <!-- Botón flotante siempre visible -->
    <div class="voice-float-button" [class.expanded]="isExpanded || isRecording" (click)="toggleExpand()">
      <div class="voice-button-inner" *ngIf="!isExpanded && !isRecording">
        <i class="fa fa-microphone"></i>
      </div>
      
      <!-- Contenido expandido -->
      <div class="voice-expanded-content" *ngIf="isExpanded && !isRecording">
        <div class="voice-header">
          <span class="voice-title">Asistente de Voz</span>
          <button class="voice-close-btn" (click)="closeExpand($event)">
            <i class="fa fa-times"></i>
          </button>
        </div>
        
        <div class="voice-body">
          <button 
            (click)="startRecording()" 
            class="btn voice-action-btn"
            [disabled]="!isConnected">
            <i class="fa fa-microphone"></i>
            {{isConnected ? 'Iniciar grabación' : 'Conectando...'}}
          </button>
          
          <div *ngIf="transcription" class="voice-transcription">
            <p><i class="fa fa-file-text-o me-2"></i>{{ transcription }}</p>
          </div>
          
          <div *ngIf="errorMessage" class="voice-error">
            <i class="fa fa-exclamation-triangle me-2"></i>
            {{ errorMessage }}
          </div>
        </div>
      </div>
      
      <!-- Interfaz tipo llamada cuando está grabando -->
      <div class="call-interface" *ngIf="isRecording">
        <div class="call-header">
          <div class="caller-info">
            <div class="caller-avatar">
              <i class="fa fa-microphone"></i>
            </div>
            <div class="caller-name">
              <!-- Mostrar estado de conexión -->
              <span *ngIf="isConnected">Grabando...</span>
              <span *ngIf="!isConnected" class="text-warning">Reconectando...</span>
            </div>
            <div class="call-timer">{{timerDisplay}}</div>
          </div>
        </div>
        
        <div class="call-body">
          <div class="sound-wave" [class.inactive]="!isConnected">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </div>
          
          <div *ngIf="transcription" class="transcription-call">
            <p>{{transcription}}</p>
          </div>
        </div>
        
        <div class="call-actions">
          <button class="call-btn send-btn" (click)="stopAndSend()">
            <i class="fa fa-paper-plane"></i>
            <span>Enviar</span>
          </button>
          
          <button class="call-btn end-btn" (click)="cancelRecording()">
            <i class="fa fa-times"></i>
            <span>Cancelar</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Botón flotante */
    .voice-float-button {
      position: fixed;
      bottom: 30px;
      left: 50%; /* Centrar horizontalmente */
      transform: translateX(-50%); /* Ajusta para que el centro del botón esté en el centro */
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7367f0, #5e50ee);
      box-shadow: 0 4px 10px rgba(115, 103, 240, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 9999;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    .voice-float-button.expanded {
      width: 320px;
      height: auto;
      max-height: 500px;
      border-radius: 16px;
      background: #ffffff;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    
    .voice-button-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .voice-button-inner i {
      font-size: 24px;
      color: white;
    }
    
    /* Contenido expandido */
    .voice-expanded-content {
      width: 100%;
      padding: 15px;
    }
    
    .voice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .voice-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .voice-close-btn {
      background: transparent;
      border: none;
      font-size: 16px;
      color: #888;
      cursor: pointer;
    }
    
    .voice-close-btn:hover {
      color: #333;
    }
    
    .voice-body {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .voice-action-btn {
      background: #7367f0;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s ease;
    }
    
    .voice-action-btn:hover {
      background: #5e50ee;
      transform: translateY(-2px);
    }
    
    .voice-transcription {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      border-left: 3px solid #7367f0;
      font-size: 14px;
    }
    
    .voice-error {
      color: #dc3545;
      font-size: 14px;
      padding: 8px;
      background-color: rgba(220, 53, 69, 0.1);
      border-radius: 8px;
      text-align: center;
    }
    
    /* Interfaz de llamada */
    .call-interface {
      width: 100%;
      padding: 15px;
    }
    
    .call-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .caller-info {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .caller-avatar {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #7367f0, #5e50ee);
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .caller-avatar i {
      font-size: 24px;
      color: white;
      animation: pulse 1.5s infinite;
    }
    
    .caller-name {
      font-size: 16px;
      font-weight: 600;
      color: #dc3545;
    }
    
    .call-timer {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    
    .call-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .sound-wave {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 40px;
      gap: 4px;
      margin-bottom: 10px;
    }
    
    .bar {
      display: inline-block;
      width: 4px;
      background: #7367f0;
      height: 20px;
      border-radius: 10px;
      animation: sound-wave 0.8s infinite ease alternate;
    }
    
    .bar:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .bar:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    .bar:nth-child(4) {
      animation-delay: 0.6s;
    }
    
    .bar:nth-child(5) {
      animation-delay: 0.3s;
    }
    
    @keyframes sound-wave {
      0% {
        height: 10px;
      }
      100% {
        height: 30px;
      }
    }
    
    .transcription-call {
      width: 100%;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }
    
    .call-actions {
      display: flex;
      justify-content: center;
      gap: 15px;
    }
    
    .call-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 12px;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .call-btn i {
      font-size: 20px;
    }
    
    .call-btn span {
      font-size: 10px;
      white-space: nowrap;
    }
    
    .send-btn {
      background: #28a745;
      color: white;
    }
    
    .send-btn:hover {
      background: #218838;
      transform: scale(1.05);
    }
    
    .end-btn {
      background: #dc3545;
      color: white;
    }
    
    .end-btn:hover {
      background: #c82333;
      transform: scale(1.05);
    }
    
    @keyframes pulse {
      0% {
        opacity: 0.6;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0.6;
      }
    }
    
    /* Estado de conexión */
    .sound-wave.inactive .bar {
      animation: none;
      opacity: 0.4;
      height: 10px;
    }
    
    .text-warning {
      color: #ffc107;
    }
  `]
})
export class VoiceInteractionComponent implements OnInit, OnDestroy {
  private mediaRecorder?: MediaRecorder;
  private audioChunks: BlobPart[] = [];
  private timerInterval: any;
  private startTime: number = 0;
  private subscriptions: Subscription[] = [];
  private processingInterval: any;

  transcription = '';
  errorMessage = '';
  isRecording = false;
  isExpanded = false;
  isConnected = false;
  timerDisplay = '00:00';

  @Output() transcriptionEvent = new EventEmitter<string>();

  constructor(
    private http: HttpClient,
    private wsService: VoiceWebsocketService
  ) { }

  ngOnInit() {
    // Suscribirse a los observables del servicio WebSocket
    this.subscriptions.push(
      this.wsService.connectionStatus$.subscribe(status => {
        this.isConnected = status;
      })
    );

    this.subscriptions.push(
      this.wsService.transcription$.subscribe(text => {
        if (text) {
          this.transcription = text;
        }
      })
    );

    this.subscriptions.push(
      this.wsService.error$.subscribe(error => {
        if (error) {
          this.errorMessage = error;
        }
      })
    );

    this.subscriptions.push(
      this.wsService.finalResult$.subscribe(result => {
        if (result) {
          this.transcriptionEvent.emit(result);
        }
      })
    );

    // Conectarse al WebSocket al iniciar
    this.wsService.connect(environment.voiceWsUrl).catch(err => {
      console.error('Error al conectar WebSocket:', err);
      this.errorMessage = 'No se pudo establecer conexión con el servidor de voz';
    });
  }

  ngOnDestroy() {
    // Limpiar temporizadores y suscripciones
    this.stopTimer();
    this.stopProcessing();
    this.subscriptions.forEach(sub => sub.unsubscribe());

    // Cerrar WebSocket y liberar micrófono
    if (this.isRecording) {
      this.stopRecording();
    }

    this.wsService.disconnect();
  }

  toggleExpand(): void {
    if (!this.isRecording) {
      this.isExpanded = !this.isExpanded;
    }
  }

  closeExpand(event: Event): void {
    event.stopPropagation();
    this.isExpanded = false;
  }

  async startRecording(): Promise<void> {
    this.errorMessage = '';
    this.transcription = '';

    try {
      // Asegurar conexión
      await this.wsService.connect(environment.voiceWsUrl);
      // Enviar comando de inicio
      this.wsService.startTranscription();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          // Enviar el fragmento de audio sin base64
          this.wsService.sendAudioChunk(event.data);
        }
      };

      this.mediaRecorder.start(200);
      this.isRecording = true;
      this.isExpanded = false;
      this.startTimer();
      this.startProcessing();
    } catch (error) {
      this.errorMessage = 'Error al acceder al micrófono.';
    }
  }

  stopAndSend(): void {
    if (!this.mediaRecorder || !this.isRecording) {
      this.errorMessage = 'No hay grabación en curso.';
      return;
    }
    this.stopTimer();
    this.stopProcessing();
    this.stopRecording();
    // Enviar comando de stop
    this.wsService.stopTranscription();
    this.isExpanded = true;
  }

  cancelRecording(): void {
    if (!this.mediaRecorder || !this.isRecording) return;
    this.stopTimer();
    this.stopProcessing();
    this.stopRecording();
    this.transcription = '';
    // Enviar comando de stop
    this.wsService.stopTranscription();
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Detener tracks del stream para liberar el micrófono
      const tracks = this.mediaRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  }

  private startProcessing(): void {
    // Este temporizador simula el procesamiento continuo mientras se graba
    // Se puede eliminar si el WebSocket ya maneja esto correctamente
    this.processingInterval = setInterval(() => {
      // Solo para mantener viva la conexión, no es necesario hacer nada aquí
      if (!this.isConnected) {
        this.wsService.connect(environment.voiceWsUrl).catch(console.error);
      }
    }, 5000);
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private startTimer(): void {
    this.startTime = Date.now();
    this.timerDisplay = '00:00';

    this.timerInterval = setInterval(() => {
      const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
      const seconds = (elapsedTime % 60).toString().padStart(2, '0');
      this.timerDisplay = `${minutes}:${seconds}`;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
