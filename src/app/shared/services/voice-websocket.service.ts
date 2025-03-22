import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AudioMessage {
  type: 'audio';
  data: Blob;
}

export interface TranscriptionResponse {
  type: 'transcription';
  data: string;
  isFinal: boolean;
}

export interface ErrorResponse {
  type: 'error';
  message: string;
}

type WebSocketMessage = AudioMessage | TranscriptionResponse | ErrorResponse;

@Injectable({
  providedIn: 'root'
})
export class VoiceWebsocketService {
  private socket: WebSocket | null = null;
  private ws: WebSocket;
  private transcriptionSubject = new Subject<string>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string>('');
  private finalResultSubject = new BehaviorSubject<string>('');

  // URL del WebSocket desde las variables de entorno
  private wsUrl = environment.wsVoiceServiceUrl || 'wss://tu-servidor-websocket/voice';
  
  // Observables para que los componentes se suscriban
  public transcription$ = this.transcriptionSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public finalResult$ = this.finalResultSubject.asObservable();

  constructor() {}

  /**
   * Inicia la conexión WebSocket
   */
  public connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.socket = new WebSocket(this.wsUrl);
      this.ws = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket conectado');
        this.connectionStatusSubject.next(true);
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const messageObj = JSON.parse(event.data);
          if (messageObj.type === 'transcription') {
            const lastResult = messageObj.results[messageObj.results.length - 1];
            this.transcriptionSubject.next(lastResult.transcript);
          } else if (messageObj.type === 'error') {
            this.errorSubject.next(messageObj.message);
          }
        } catch (err) {
          console.error('Error al procesar mensaje del WebSocket:', err);
        }
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription' && data.results?.length) {
          const text = data.results.map(r => r.transcript).join(' ');
          this.transcriptionSubject.next(text);
        }
      };

      this.socket.onerror = (error) => {
        console.error('Error de WebSocket:', error);
        this.errorSubject.next('Error de conexión con el servidor');
        this.connectionStatusSubject.next(false);
        reject(error);
      };

      this.socket.onclose = () => {
        console.log('WebSocket cerrado');
        this.connectionStatusSubject.next(false);
      };
    });
  }

  /**
   * Inicia la transcripción enviando un mensaje de control
   */
  public startTranscription(languageCode: string = 'es-ES'): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const startMsg = {
      action: 'start',
      languageCode: 'es-ES',
      encoding: 'pcm',
      sampleRate: 16000
    };
    this.socket.send(JSON.stringify(startMsg));
    if (!this.ws) { return; }
    this.ws.send(JSON.stringify({ action: 'start', languageCode }));
  }

  /**
   * Detiene la transcripción enviando un mensaje de control
   */
  public stopTranscription(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const stopMsg = { action: 'stop' };
    this.socket.send(JSON.stringify(stopMsg));
    if (!this.ws) { return; }
    this.ws.send(JSON.stringify({ action: 'stop' }));
  }

  /**
   * Envía datos binarios de audio al WebSocket
   */
  public sendAudioChunk(audioBlob: Blob): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    audioBlob.arrayBuffer().then(buffer => {
      this.socket!.send(buffer);
    });
  }

  /**
   * Cierra la conexión WebSocket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
    
    // Reiniciar los valores
    this.transcriptionSubject.next('');
    this.errorSubject.next('');
  }

  /**
   * Inicia una nueva sesión de reconocimiento de voz
   */
  public startSession(): Promise<void> {
    return this.connect(this.wsUrl).then(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ 
          type: 'start_session',
          config: {
            language: 'es-ES',
            sampleRate: 16000
          }
        }));
      }
    });
  }

  /**
   * Finaliza la sesión actual de reconocimiento de voz
   */
  public endSession(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'end_session' }));
    }
  }
}
