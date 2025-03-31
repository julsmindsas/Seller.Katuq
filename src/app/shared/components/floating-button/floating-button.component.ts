import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter, OnDestroy, NgZone, Inject } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';

// Interfaz para los pasos visuales
interface VisualStep {
  imageUrl: string;
  caption?: string;
}

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

  // Propiedades para los pasos visuales
  public hasVisualContent: boolean = false;
  public visualSteps: VisualStep[] = [];
  public currentStepIndex: number = 0;
  public currentStepText: string = '';

  // Propiedades para herramientas disponibles
  private tools: any[] = [];
  private toolFunctions: { [key: string]: Function } = {};

  // Propiedades para arrastrar la ventana
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  public voiceWindowPosition = { x: 0, y: 0 };

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private httpClient: HttpClient,
    private ngZone: NgZone,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();

    // Escuchar cambios de orientación y tamaño de ventana
    window.addEventListener('resize', () => {
      this.detectMobileDevice();
    });

    // Inicializar herramientas disponibles
    this.initializeTools();
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

    // Limpiar cualquier contenido visual previo
    this.clearVisualContent();

    try {
      // Iniciar la sesión WebRTC
      await this.startSession();

      // Solo para demostración, cargar algunos pasos después de un breve retraso
      setTimeout(() => this.loadDemoContent(), 2000);

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

    // Limpiar contenido visual
    this.clearVisualContent();

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

  // Configurar eventos para el canal de datos (adaptado al nuevo patrón)
  private setupDataChannelEvents(): void {
    if (this.dataChannel) {
      // Configurar las herramientas al abrir el canal de datos
      this.dataChannel.onopen = () => {
        console.log('Configuring data channel with tools');
        this.isSessionActive = true;
        this.events = [];

        // Configura el canal con modalidades y herramientas
        const configEvent = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            tools: this.tools
          }
        };

        // Enviar la configuración al canal de datos
        this.dataChannel.send(JSON.stringify(configEvent));
      };

      // Manejar mensajes recibidos (adaptado al patrón proporcionado)
      this.dataChannel.onmessage = async (e) => {
        const msg = JSON.parse(e.data);
        console.log('Received message:', msg);

        // Registrar el mensaje en la lista de eventos
        if (!msg.timestamp) {
          msg.timestamp = new Date().toLocaleTimeString();
        }
        this.events = [msg, ...this.events];

        // Procesar llamadas a funciones siguiendo el patrón proporcionado
        if (msg.type === 'response.function_call_arguments.done') {
          await this.ngZone.run(async () => {
            const fn = this.toolFunctions[msg.name];
            if (fn !== undefined) {
              console.log(`Calling local function ${msg.name} with ${msg.arguments}`);
              try {
                const args = msg.arguments ? JSON.parse(msg.arguments) : {};
                const result = await fn(args);
                console.log('result', result);

                // Enviar el resultado de vuelta a OpenAI
                const event = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: msg.call_id,
                    output: JSON.stringify(result)
                  }
                };

                // Enviar el resultado y solicitar respuesta
                this.dataChannel.send(JSON.stringify(event));
                this.dataChannel.send(JSON.stringify({ type: "response.create" }));
              } catch (error) {
                console.error(`Error executing function ${msg.name}:`, error);

                // En caso de error, informar al modelo
                const errorEvent = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: msg.call_id,
                    output: JSON.stringify({ error: `Error: ${error.message}` })
                  }
                };

                this.dataChannel.send(JSON.stringify(errorEvent));
                this.dataChannel.send(JSON.stringify({ type: "response.create" }));
              }
            } else {
              console.error(`Function not found: ${msg.name}`);
            }
          });
        }
      };
    }
  }

  // Método para inicializar las herramientas disponibles
  private initializeTools(): void {
    // Definir las funciones que se pueden llamar desde el modelo
    this.toolFunctions = {
      // Navegar a una ruta específica
      navigateTo: async (args: { route: string }) => {
        this.router.navigate([args.route]);
        return { success: true, route: args.route };
      },

      // Mostrar un paso específico en la guía visual
      showStep: async (args: { stepNumber: number }) => {
        const stepIndex = args.stepNumber - 1;
        if (this.visualSteps && stepIndex >= 0 && stepIndex < this.visualSteps.length) {
          this.goToStep(stepIndex);
          return { success: true, step: args.stepNumber };
        } else {
          return { success: false, error: "Paso no disponible" };
        }
      },

      // Obtener información sobre los pasos de creación de venta
      getVentaStepsInfo: async () => {
        return {
          success: true,
          totalSteps: this.visualSteps.length,
          currentStep: this.currentStepIndex + 1,
          steps: this.visualSteps.map((step, index) => ({
            number: index + 1,
            title: step.caption.split(':')[0].trim(),
            description: step.caption.split(':')[1]?.trim() || step.caption
          }))
        };
      },

      // Ir al siguiente paso
      nextStep: async () => {
        if (this.currentStepIndex < this.visualSteps.length - 1) {
          this.currentStepIndex++;
          this.updateCurrentStepText();
          return { success: true, newStep: this.currentStepIndex + 1 };
        } else {
          return { success: false, error: "Ya estás en el último paso" };
        }
      },

      // Ir al paso anterior
      previousStep: async () => {
        if (this.currentStepIndex > 0) {
          this.currentStepIndex--;
          this.updateCurrentStepText();
          return { success: true, newStep: this.currentStepIndex + 1 };
        } else {
          return { success: false, error: "Ya estás en el primer paso" };
        }
      },

      // Obtener la información de la página actual
      getPageInfo: async () => {
        return {
          success: true,
          url: this.document.location.href,
          title: this.document.title,
          path: this.router.url
        };
      },

      // Obtener el HTML de la página actual (similar al ejemplo)
      getPageHTML: async () => {
        return {
          success: true,
          html: this.document.documentElement.outerHTML
        };
      }
    };

    // Definir las herramientas disponibles para OpenAI
    this.tools = [
      {
        type: 'function',
        name: 'navigateTo',
        description: 'Navega a una ruta específica dentro de la aplicación',
        parameters: {
          type: 'object',
          properties: {
            route: { type: 'string', description: 'Ruta a la que navegar, por ejemplo: /ventas/crear-ventas' }
          },
          required: ['route']
        }
      },
      {
        type: 'function',
        name: 'showStep',
        description: 'Muestra un paso específico en la guía visual de creación de ventas',
        parameters: {
          type: 'object',
          properties: {
            stepNumber: { type: 'integer', description: 'Número del paso a mostrar (1-7)' }
          },
          required: ['stepNumber']
        }
      },
      {
        type: 'function',
        name: 'getVentaStepsInfo',
        description: 'Obtiene información sobre todos los pasos del proceso de venta',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'nextStep',
        description: 'Avanza al siguiente paso en la guía visual',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'previousStep',
        description: 'Retrocede al paso anterior en la guía visual',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'getPageInfo',
        description: 'Obtiene información sobre la página actual',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  // Método actualizado para cargar contenido visual de demostración
  loadDemoContent() {
    this.ngZone.run(() => {
      // Carga de pasos visuales con rutas actualizadas para imágenes específicas de la sección
      this.visualSteps = [
        {
          imageUrl: 'assets/images/ventas/paso1-catalogo.png',
          caption: '1. Catálogo: Selecciona una ubicación de destino y elige los productos del catálogo'
        },
        {
          imageUrl: 'assets/images/ventas/paso2-carrito.png',
          caption: '2. Carrito y Notas: Revisa tus productos seleccionados y agrega notas al pedido'
        },
        {
          imageUrl: 'assets/images/ventas/paso3-cliente.png',
          caption: '3. Datos Cliente: Busca un cliente existente o crea uno nuevo con sus datos completos'
        },
        {
          imageUrl: 'assets/images/ventas/paso4-facturacion.png',
          caption: '4. Datos de Facturación: Completa la información para la facturación electrónica'
        },
        {
          imageUrl: 'assets/images/ventas/paso5-entrega.png',
          caption: '5. Datos de Entrega: Define la dirección y detalles para la entrega del pedido'
        },
        {
          imageUrl: 'assets/images/ventas/paso6-pago.png',
          caption: '6. Resumen y Pago: Revisa el pedido completo y procede al pago'
        },
        {
          imageUrl: 'assets/images/ventas/paso7-confirmacion.png',
          caption: '7. Confirmación: ¡Venta completada exitosamente!'
        }
      ];

      this.hasVisualContent = this.visualSteps.length > 0;
      this.currentStepIndex = 0;
      this.updateCurrentStepText();

      // Informar al usuario que puede interactuar con el asistente
      this.sendTextMessage("Estoy mostrando los pasos para crear una venta. Puedes preguntarme sobre cualquier paso específico o pedirme que te explique el proceso.");
    });
  }

  // Actualizar el texto que se muestra bajo el avatar para ser más específico
  updateCurrentStepText() {
    if (this.hasVisualContent && this.visualSteps[this.currentStepIndex]) {
      const stepNumber = this.currentStepIndex + 1;
      const stepPrefix = stepNumber === 1 ? 'Comienza por ' :
        stepNumber === this.visualSteps.length ? 'Finalmente, ' :
          'Ahora ';

      this.currentStepText = `${stepPrefix}${this.visualSteps[this.currentStepIndex].caption.split(':')[0]}`;
    } else {
      this.currentStepText = 'Escuchando...';
    }
  }

  // Agregar un método para ir a un paso específico (útil para navegar directamente)
  goToStep(stepIndex: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (stepIndex >= 0 && stepIndex < this.visualSteps.length) {
      this.currentStepIndex = stepIndex;
      this.updateCurrentStepText();

      // Opcional: Anunciar el cambio de paso mediante voz
      this.sendTextMessage(`Mostrando paso ${stepIndex + 1}: ${this.visualSteps[stepIndex].caption.split(':')[1].trim()}`);
    }
  }

  // Navegar al paso anterior
  previousStep(event: MouseEvent) {
    event.stopPropagation();
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.updateCurrentStepText();
    }
  }

  // Navegar al siguiente paso
  nextStep(event: MouseEvent) {
    event.stopPropagation();
    if (this.currentStepIndex < this.visualSteps.length - 1) {
      this.currentStepIndex++;
      this.updateCurrentStepText();
    }
  }

  // Borrar todo el contenido visual
  clearVisualContent() {
    this.visualSteps = [];
    this.hasVisualContent = false;
    this.currentStepIndex = 0;
    this.currentStepText = '';
  }

  // Método para agregar un nuevo paso desde datos externos (API, modelo, etc.)
  addVisualStep(step: VisualStep) {
    this.ngZone.run(() => {
      this.visualSteps.push(step);
      this.hasVisualContent = true;

      // Si es el primer paso, actualizamos el texto
      if (this.visualSteps.length === 1) {
        this.currentStepIndex = 0;
        this.updateCurrentStepText();
      }
    });
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

  // Métodos para permitir arrastrar la ventana de voz
  startDrag(event: MouseEvent): void {
    // Solo permitir arrastrar en escritorio, no en móvil
    if (!this.isMobile) {
      this.isDragging = true;
      
      // Calcular el offset del mouse dentro de la ventana
      const voiceContainer = event.currentTarget as HTMLElement;
      const rect = voiceContainer.getBoundingClientRect();
      this.dragOffsetX = event.clientX - rect.left;
      this.dragOffsetY = event.clientY - rect.top;
      
      // Prevenir selección de texto mientras se arrastra
      event.preventDefault();
    }
  }
  
  onDrag(event: MouseEvent): void {
    if (this.isDragging) {
      // Calcular nueva posición basada en movimiento del mouse
      const x = event.clientX - this.dragOffsetX;
      const y = event.clientY - this.dragOffsetY;
      
      // Actualizar posición
      this.ngZone.run(() => {
        this.voiceWindowPosition = { x, y };
      });
      
      event.preventDefault();
    }
  }
  
  stopDrag(): void {
    this.isDragging = false;
  }

  // Agregar estos listeners al documento
  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    this.onDrag(event);
  }
  
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.stopDrag();
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
