import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { environment } from '../../../../../environments/environment';

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiAudioService {
  private client!: GoogleGenAI;
  private session!: Session;
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>({ 
    status: 'disconnected', 
    message: 'Not connected' 
  });
  private audioDataSubject = new BehaviorSubject<any>(null);

  connectionStatus$: Observable<ConnectionStatus> = this.connectionStatusSubject.asObservable();
  audioData$: Observable<any> = this.audioDataSubject.asObservable();

  constructor() {
    this.initClient();
  }

  private initClient() {
    this.client = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });
  }

  async initSession(): Promise<void> {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    const config = {
      responseModalities: [Modality.AUDIO],
      systemInstruction: "Eres un asistente de IA que responde en español con acento argentino, y solo habla de que puedes hacer en el sistema como crear pedidos",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus'} },
        languageCode: 'es-ES'
      }
    }
    try {
      this.connectionStatusSubject.next({ 
        status: 'connecting', 
        message: 'Connecting to Gemini Live API...' 
      });

      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.connectionStatusSubject.next({ 
              status: 'connected', 
              message: 'Connected to Gemini Live API' 
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio) {
              this.audioDataSubject.next(audio);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              this.audioDataSubject.next({ interrupted: true });
            }
          },
          onerror: (e: ErrorEvent) => {
            this.connectionStatusSubject.next({ 
              status: 'error', 
              message: `Connection error: ${e.message}` 
            });
          },
          onclose: (e: CloseEvent) => {
            this.connectionStatusSubject.next({ 
              status: 'disconnected', 
              message: `Connection closed: ${e.reason}` 
            });
          },
        },
        config: config
      });
    } catch (e: any) {
      console.error(e);
      this.connectionStatusSubject.next({ 
        status: 'error', 
        message: `Failed to initialize session: ${e.message}` 
      });
    }
  }

  sendRealtimeInput(media: any): void {
    if (this.session) {
      this.session.sendRealtimeInput({ media });
    }
  }

  closeSession(): void {
    if (this.session) {
      this.session.close();
      this.connectionStatusSubject.next({ 
        status: 'disconnected', 
        message: 'Session closed' 
      });
    }
  }

  resetSession(): void {
    this.closeSession();
    this.initSession();
  }
}