import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter, OnDestroy, NgZone } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-floating-button',
  templateUrl: './floating-button.component.html',
  styleUrls: ['./floating-button.component.scss']
})
export class FloatingButtonComponent implements OnInit, OnDestroy {
  // Propiedades existentes
  public chatFormVisible: boolean = false;
  public chatMinimized: boolean = false;
  public hasUnreadMessages: boolean = false;
  public position = { bottom: 20, right: 20 };
  public optionsPanelVisible: boolean = false;
  public selectedMode: string = 'chat';
  public isListening: boolean = false;
  private voiceSocket: WebSocket | null = null;
  private conversationState: any = null;
  
  // Nuevas propiedades para WebRTC
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private events: any[] = [];
  private isSessionActive: boolean = false;
  public audioError: string | null = null;
  
  // Propiedades para la interfaz tipo llamada
  public isMobile: boolean = false;
  public callDuration: string = '00:00';
  public isMuted: boolean = false;
  public isSpeakerOn: boolean = false;
  private callTimer: any = null;
  private callStartTime: number = 0;
  private callSeconds: number = 0;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private httpClient: HttpClient,
    private ngZone: NgZone
  ) {
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();
    
    // Escuchar cambios de orientación y tamaño de ventana
    window.addEventListener('resize', () => {
      this.detectMobileDevice();
    });
  }

  ngOnInit() {
    // Recuperar estado guardado si existe
    const savedState = sessionStorage.getItem('kaiAssistantState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        this.chatMinimized = parsedState.minimized || false;
        this.hasUnreadMessages = parsedState.hasUnread || false;
        this.conversationState = parsedState.conversation || null;
        this.selectedMode = parsedState.mode || 'chat';

        // Si había una conversación en curso, mostrar el chat como minimizado
        if (this.conversationState && Object.keys(this.conversationState).length > 0) {
          this.chatFormVisible = true;
          this.chatMinimized = true;
        }
      } catch (e) {
        console.error("Error parsing saved assistant state:", e);
      }
    }
  }

  // Detectar si es un dispositivo móvil
  private detectMobileDevice(): void {
    // Verificar si el ancho de la ventana es menor a 768px (común para dispositivos móviles)
    this.isMobile = window.innerWidth < 768;
  }

  toggleOptionsPanel(event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (this.chatFormVisible) {
      // Si el chat está abierto, lo minimizamos en lugar de mostrar opciones
      this.minimizeChat(event);
      return;
    }

    this.optionsPanelVisible = !this.optionsPanelVisible;

    if (!this.optionsPanelVisible) {
      // Si cerramos el panel de opciones, cerramos todo
      this.closeEverything(event || null);
    }
  }

  selectMode(mode: string, event: MouseEvent) {
    event.stopPropagation();
    this.selectedMode = mode;
    this.optionsPanelVisible = false;

    switch (mode) {
      case 'chat':
        this.openChat(event);
        break;
      case 'voice':
        this.startVoiceMode(event);
        break;
      case 'help':
        this.openHelpGuide(event);
        break;
      case 'feedback':
        this.openFeedbackForm(event);
        break;
    }

    this.saveState();
  }

  openChat(event: MouseEvent) {
    event.stopPropagation();
    this.chatFormVisible = true;
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveState();
  }

  // Método actualizado para iniciar el modo de voz con WebRTC
  async startVoiceMode(event: MouseEvent) {
    event.stopPropagation();
    this.isListening = true;
    
    // Iniciar el cronómetro para la duración de la llamada
    this.startCallTimer();
    
    try {
      // Iniciar la sesión WebRTC
      await this.startSession();
    } catch (error) {
      console.error('Error al iniciar la sesión de voz:', error);
      this.isListening = false;
      this.audioError = `Error: ${error.message}`;
    }
    
    this.saveState();
  }

  // Método para iniciar el temporizador de la llamada
  private startCallTimer(): void {
    this.callStartTime = Date.now();
    this.callSeconds = 0;
    this.callDuration = '00:00';
    
    if (this.callTimer) {
      clearInterval(this.callTimer);
    }
    
    this.callTimer = setInterval(() => {
      this.ngZone.run(() => {
        this.callSeconds++;
        const minutes = Math.floor(this.callSeconds / 60);
        const seconds = this.callSeconds % 60;
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      });
    }, 1000);
  }
  
  // Método para detener el temporizador de la llamada
  private stopCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  // Método actualizado para detener el modo de voz
  stopVoiceMode(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    this.isListening = false;
    
    // Detener la sesión WebRTC
    this.stopSession();
    this.stopCallTimer();
    
    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
    }
    
    this.saveState();
  }
  
  // Métodos para controles de la llamada
  toggleMute(event: MouseEvent): void {
    event.stopPropagation();
    if (this.peerConnection) {
      this.isMuted = !this.isMuted;
      
      const audioTracks = this.peerConnection.getSenders()
        .filter(sender => sender.track && sender.track.kind === 'audio')
        .map(sender => sender.track);
        
      audioTracks.forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
  }
  
  toggleSpeaker(event: MouseEvent): void {
    event.stopPropagation();
    this.isSpeakerOn = !this.isSpeakerOn;
    
    // Implementar lógica para cambiar a altavoz
    if (this.audioElement) {
      // En móviles, las opciones de audio están limitadas
      // Aquí simplemente cambiamos el volumen como ejemplo
      this.audioElement.volume = this.isSpeakerOn ? 1.0 : 0.5;
    }
  }

  openHelpGuide(event: MouseEvent) {
    // Aquí implementar la lógica para mostrar una guía de ayuda
    this.chatFormVisible = true;
    this.chatMinimized = false;
    // Podríamos enviar un comando especial al chat para mostrar ayuda
    this.saveState();
  }

  openFeedbackForm(event: MouseEvent) {
    // Aquí implementar la lógica para mostrar un formulario de feedback
    this.chatFormVisible = true;
    this.chatMinimized = false;
    // Podríamos enviar un comando especial al chat para mostrar formulario
    this.saveState();
  }

  toggleChatForm(event?: MouseEvent) {
    if (event) event.stopPropagation();

    if (this.chatMinimized) {
      // Si está minimizado, solo maximizar
      this.chatMinimized = false;
      this.hasUnreadMessages = false;
    } else {
      // Si no está minimizado, mostrar/ocultar
      this.chatFormVisible = !this.chatFormVisible;
      if (this.chatFormVisible) {
        this.chatMinimized = false;
      }
    }

    // Actualizar estado
    this.saveState();
  }

  minimizeChat(event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatMinimized = true;
    // No cerramos el chat, solo lo minimizamos
    this.saveState();
  }

  maximizeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveState();
  }

  closeChat(event: MouseEvent) {
    if (event) event.stopPropagation();
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.conversationState = null;
    this.saveState();
  }

  closeEverything(event: MouseEvent | null) {
    if (event) event.stopPropagation();
    this.optionsPanelVisible = false;
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.isListening = false;

    // Añadir limpieza de WebRTC
    this.stopSession();

    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
    }

    this.saveState();
  }

  // Método para llamar cuando se recibe un nuevo mensaje y el chat está minimizado
  onNewMessage(message: any) {
    if (this.chatMinimized) {
      this.hasUnreadMessages = true;
      this.saveState();
    }
  }

  // Método para guardar la conversación actual
  saveConversation(conversation: any) {
    this.conversationState = conversation;
    this.saveState();
  }

  private saveState() {
    const state = {
      minimized: this.chatMinimized,
      hasUnread: this.hasUnreadMessages,
      conversation: this.conversationState,
      mode: this.selectedMode
    };
    sessionStorage.setItem('kaiAssistantState', JSON.stringify(state));
  }

  // Implementación de WebRTC - nuevos métodos
  
  // Iniciar sesión WebRTC
  async startSession(): Promise<void> {
    // Obtener token para API de OpenAI Realtime
    const tokenResponse = await this.httpClient.get("http://localhost:3000/token").toPromise();
    const data = tokenResponse as any;
    const EPHEMERAL_KEY = data.client_secret.value;

    // Crear conexión peer
    this.peerConnection = new RTCPeerConnection();

    // Configurar para reproducir audio remoto
    if (this.audioElement) {
      // Limpiar elemento de audio anterior
      document.body.removeChild(this.audioElement);
    }
    
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.controls = true;
    this.audioElement.volume = 1.0;
    this.audioElement.setAttribute('playsinline', '');
    this.audioElement.style.display = 'none';
    
    // Añadir elemento de audio al DOM
    document.body.appendChild(this.audioElement);
    
    // Configurar evento ontrack
    this.peerConnection.ontrack = (e) => {
      console.log("Pista de audio recibida:", e.streams[0]);
      
      if (this.audioElement) {
        this.audioElement.srcObject = e.streams[0];
        
        // Intentar reproducir el audio
        const playPromise = this.audioElement.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio reproduciendo correctamente");
              this.ngZone.run(() => {
                this.audioError = null;
              });
            })
            .catch((err) => {
              console.error("Error reproduciendo audio:", err);
              this.ngZone.run(() => {
                this.audioError = `Error de reproducción: ${err.message}`;
              });
              
              // Manejar política de autoplay
              const resumeAudio = () => {
                if (this.audioElement) {
                  this.audioElement.play()
                    .then(() => {
                      console.log("Audio reproduciendo después de interacción");
                      this.ngZone.run(() => {
                        this.audioError = null;
                      });
                    })
                    .catch(e => console.error("Fallo al reintentar reproducción:", e));
                }
              };
              
              // Mensaje para interacción del usuario
              alert("Haga clic en cualquier lugar de la pantalla para habilitar el audio");
              document.addEventListener('click', resumeAudio, { once: true });
            });
        }
      }
    };

    // Añadir pista de audio local para entrada de micrófono
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      this.peerConnection.addTrack(ms.getTracks()[0]);
      console.log("Micrófono conectado correctamente");
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      this.audioError = `Error de micrófono: ${err.message}`;
      throw err;
    }

    // Configurar canal de datos para eventos
    this.dataChannel = this.peerConnection.createDataChannel("oai-events");
    this.setupDataChannelEvents();

    // Iniciar sesión usando SDP
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-mini-realtime-preview-2024-12-17";
    
    // Realizar la petición a la API de OpenAI
    const response = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await response.text(),
    };
    await this.peerConnection.setRemoteDescription(answer as RTCSessionDescriptionInit);

    // La sesión se marca como activa cuando el dataChannel se abre (en setupDataChannelEvents)
  }

  // Detener sesión WebRTC
  stopSession(): void {
    // Detener el temporizador de la llamada
    this.stopCallTimer();
    
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

    this.isSessionActive = false;
    this.audioError = null;
    this.events = [];
  }

  // Configurar eventos para el canal de datos
  private setupDataChannelEvents(): void {
    if (this.dataChannel) {
      // Manejar mensajes recibidos
      this.dataChannel.onmessage = (e) => {
        this.ngZone.run(() => {
          const event = JSON.parse(e.data);
          if (!event.timestamp) {
            event.timestamp = new Date().toLocaleTimeString();
          }
          this.events = [event, ...this.events];
        });
      };

      // Cuando el canal de datos se abre
      this.dataChannel.onopen = () => {
        this.ngZone.run(() => {
          this.isSessionActive = true;
          this.events = [];
        });
      };
    }
  }

  // Enviar evento al modelo
  sendClientEvent(message: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // Enviar evento
      this.dataChannel.send(JSON.stringify(message));

      // Agregar timestamp localmente
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      this.events = [message, ...this.events];
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  // Enviar mensaje de texto
  sendTextMessage(message: string): void {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    this.sendClientEvent(event);
    this.sendClientEvent({ type: "response.create" });
  }

  ngOnDestroy(): void {
    // Detener el temporizador de la llamada si existe
    this.stopCallTimer();
    
    // Limpiar recursos cuando se destruye el componente
    this.stopSession();
    
    if (this.voiceSocket) {
      this.voiceSocket.close();
      this.voiceSocket = null;
    }
    
    // Eliminar event listeners
    window.removeEventListener('resize', () => {
      this.detectMobileDevice();
    });
  }
}
