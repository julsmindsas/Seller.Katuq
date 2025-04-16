import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter, OnDestroy, NgZone, Inject } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
// Importar interfaces del modelo de pedido
import { Pedido, Cliente, Facturacion, Envio, Carrito, EstadoProceso, EstadoPago } from '../../../components/ventas/modelo/pedido';
// Importar servicios necesarios para la creación de pedidos
import { VentasService } from '../../services/ventas/ventas.service';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { ToastrService } from 'ngx-toastr';
import { UtilsService } from '../../../shared/services/utils.service';

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
  public debugLogs: string[] = []; // nueva propiedad para almacenar logs de debug

  // Propiedades para herramientas disponibles
  private tools: any[] = [];
  private toolFunctions: { [key: string]: Function } = {};

  // Propiedades para arrastrar la ventana
  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  public voiceWindowPosition = { x: 0, y: 0 };

  // Propiedades para el estado del proceso de ventas
  private currentSaleProcess = {
    step: 0, // Paso actual del proceso
    cart: [] as any[],
    client: null as any,
    deliveryInfo: null as any,
    billingInfo: null as any,
    paymentInfo: null as any,
    completed: false
  };
  empresaActual: any;
  useModelBig: any;
  isLoggedIn = false;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef,
    private httpClient: HttpClient,
    private ngZone: NgZone,
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    // Inyectar los servicios necesarios para crear pedidos
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private toastr: ToastrService,
    private utils: UtilsService
  ) {
    // Detectar si es un dispositivo móvil
    this.detectMobileDevice();
    this.useModelBig = environment.useModelBig;
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

    const user: any = localStorage.getItem('user');
    if (user.company) {
      this.isLoggedIn = true;
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
    console.log('🎤 Iniciando modo de voz');
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
    console.log('🛑 Deteniendo modo de voz');
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
    const urlApi = environment.urlApi;
    // Obtener token para API de OpenAI Realtime
    const tokenResponse = await this.httpClient.get(`${urlApi}/v1/katuqintelligence/token`).toPromise();
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
    const modelBig = "gpt-4o-realtime-preview-2024-12-17";
    const modelMini = "gpt-4o-mini-realtime-preview-2024-12-17";
    const model = this.useModelBig ? modelBig : modelMini;

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
    // console.log('🚀 Inicializando herramientas del asistente de voz');

    // Catálogo de productos disponibles en formato JSON
    const catalogProducts = [
      {
        "crearProducto": {
          "imagenesSecundarias": [],
          "titulo": "Deliciosos Bombones de Chocolate Rellenos de Galleta: Un Placer para el Paladar Colombiano",
          "descripcion": "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Bombones de Chocolate</title>\n</head>\n<body>\n<h1>Bombones de Chocolate con Mini Galleta: Un Placer Instantáneo</h1>\n\n<h2>Un Sabor Inolvidable</h2>\n<p>Descubre la exquisita combinación de chocolate y galleta en nuestros bombones. Cada bocado te transportará a un universo de sabores únicos, perfecto para deleitar tus sentidos.</p>\n\n<h2>Características Destacadas</h2>\n<ul>\n<li>Chocolate de alta calidad, elaborado con ingredientes colombianos.</li>\n<li>Relleno irresistible de mini galletas crujientes.</li>\n<li>Diseño elegante y presentación perfecta para regalar.</li>\n<li>Elaborado con métodos artesanales.</li>\n<li>Ideal para momentos especiales, celebraciones o un simple capricho.</li>\n</ul>\n\n<h2>Beneficios Adicionales</h2>\n<ul>\n<li>Un toque de innovación en la combinación de sabores tradicionales</li>\n<li>Duración superior a la competencia, mantenga su frescura.</li>\n<li>Aspecto único y moderno. </li>\n</ul>\n\n<h2>Instrucciones de Consumo</h2>\n<p>Disfruta de nuestros bombones a temperatura ambiente o ligeramente refrigerados.  Para maximizar la frescura, conservar en un lugar fresco y seco.</p>\n\n<h2>Garantía de Calidad</h2>\n<p>Ofrecemos una garantía de satisfacción total. Si no estás completamente satisfecho con tu compra, contáctanos y te devolveremos tu dinero.</p>\n\n<h2>Condiciones y Restricciones</h2>\n<p>Estos bombones son un producto artesanal,  pueden presentar variaciones en el color y la textura sin afectar la calidad y sabor.</p>\n\n<h2>Preguntas Frecuentes</h2>\n<p> Si tienes preguntas adicionales, consulta nuestra sección de preguntas frecuentes. </p>\n\n<p>Disfruta de este momento único con cada bocado</p>\n</body>\n</html>\n",
          "imagenesPrincipales": [{
            "urls": "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Productos%2Fimage%20(62).png?alt=media&token=47378090-6c28-4f6b-9715-a6118688912a",
            "nombreImagen": "image (62).png",
            "path": "Productos/image (62).png",
            "tipo": "principal"
          }]
        },
        "precio": {
          "precioUnitarioSinIva": 1000,
          "precioUnitarioIva": "0",
          "valorIva": 0,
          "precioUnitarioConIva": 1000,
          "preciosVolumen": [{
            "numeroUnidadesInicial": 1,
            "numeroUnidadesLimite": 1,
            "valorUnitarioPorVolumenSinIVA": 1000,
            "valorUnitarioPorVolumenIva": 0,
            "valorIVAPorVolumen": "0",
            "valorUnitarioPorVolumenConIVA": 1000
          }]
        },
        "identificacion": {
          "tipoProducto": "propio",
          "tipoReferencia": "propio",
          "marca": "Almara",
          "referencia": "ALM-000325"
        },
        "exposicion": {
          "activar": true,
          "disponible": true,
          "etiquetas": ["bombones", "chocolate", "galletas", "golosinas", "dulces", "regalos", "chocolate colombiano", "bombones colombianos", "regalo", "cumpleaños", "deliciosos", "sabores", "placer", "artesanal", "calidad", "precio", "innovación", "combinación sabores"]
        },
        "cd": "UHOxHZihOIvZMJENbIvZ",
        "disponibilidad": {
          "tipoEntrega": "ENVIO A DOMICILIO Y RECOGE",
          "cantidadDisponible": 10,
          "inventariable": true
        }
      },
      {
        "crearProducto": {
          "imagenesSecundarias": [],
          "titulo": "Galleta de la Fortuna Tradicional Colombiana: Mensaje Inspirador y Sabor Auténtico",
          "descripcion": "<!DOCTYPE html>\n<html>\n<head>\n<title>Galleta de la Fortuna</title>\n</head>\n<body>\n\n<h1>Galleta de la Fortuna Tradicional Colombiana</h1>\n\n<p>Descubre la magia de una experiencia única con nuestras galletas de la fortuna, elaboradas con ingredientes de primera calidad y un mensaje inspirador para cada momento.</p>\n\n<h2>Características Destacadas</h2>\n<ul>\n<li>Sabor tradicional colombiano:</li>\n<li>Mensaje inspirador interno:</li>\n<li>Ingredientes cuidadosamente seleccionados:</li>\n</ul>\n\n<h2>Beneficios de comprar nuestras galletas</h2>\n<ul>\n<li>Experiencia cultural: Conecta con la tradición de las galletas de la fortuna.</li>\n<li>Momentos de felicidad: Comparte momentos especiales con la alegría de un mensaje secreto.</li>\n<li>Regalos únicos: Ideal para compartir y expresar cariño con amigos, familiares o colegas.</li>\n</ul>\n\n<h2>¡Sorpréndete con un mensaje especial!</h2>\n\n<p>Cada galleta de la fortuna esconde un mensaje único que te inspirará, te animará o simplemente te alegrará el día.</p>\n\n<h2>Instrucciones de consumo</h2>\n<p>Disfruta de una galleta de la fortuna como un delicioso aperitivo y saborea la tradición!</p>\n\n<h2>Garantía de Calidad</h2>\n<p>¡Totalmente libre de aditivos artificiales!</p>\n\n</body>\n</html>",
          "imagenesPrincipales": [{
            "urls": "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Productos%2F20250201_090253.jpg?alt=media&token=2ad04492-d75f-40d3-a2d3-57967bb3bc06",
            "nombreImagen": "20250201_090253.jpg",
            "path": "Productos/20250201_090253.jpg",
            "tipo": "principal"
          }]
        },
        "precio": {
          "precioUnitarioSinIva": 1600,
          "precioUnitarioIva": "0",
          "valorIva": 0,
          "precioUnitarioConIva": 1600,
          "preciosVolumen": [{
            "numeroUnidadesLimite": 1,
            "valorUnitarioPorVolumenSinIVA": 1600,
            "valorUnitarioPorVolumenIva": 0,
            "valorIVAPorVolumen": 0,
            "valorUnitarioPorVolumenConIVA": 1600
          }]
        },
        "identificacion": {
          "referencia": "ALM-000394",
          "tipoProducto": "propio",
          "tipoReferencia": "propio",
          "codigoBarras": "ALM-000394",
          "marca": "Almara"
        },
        "exposicion": {
          "activar": true,
          "disponible": true,
          "etiquetas": ["galletas", "galletas de la fortuna", "galletas colombianas", "galletas artesanales", "galletas tradicionales", "dulces tradicionales", "merienda", "aperitivo", "regalo", "mensaje inspirador", "sabor tradicional", "calidad suprema", "producto colombiano"]
        },
        "disponibilidad": {
          "tipoEntrega": "SOLO RECOGE",
          "cantidadDisponible": 5,
          "inventariable": true
        },
        "cd": "vf8dkfnhf7kY2sgRYaIb"
      },
      {
        "crearProducto": {
          "imagenesSecundarias": [],
          "titulo": "Paleta Candy Colorida: Dulces Sorpresas de Chocolate para Regalar en Colombia",
          "descripcion": "<div>\n  <h2>Paleta Candy Colorida: Un toque de alegría para cualquier ocasión</h2>\n  <p>Sorprende a tus seres queridos con esta paleta de chocolate blanco rellena con quipito, un delicioso dulce colombiano. Cada paleta es una explosión de sabor y color, con diseños surtidos que alegrarán cualquier día. ¡Perfecta para compartir o para disfrutar solo!</p>\n  <h3>Características especiales:</h3>\n  <ul>\n    <li><strong>Chocolate blanco de alta calidad:</strong> Elaborada con chocolate blanco cremoso y suave, que se derrite en la boca.</li>\n    <li><strong>Relleno de quipito:</strong> Un toque de sabor colombiano que hará que tu paleta sea aún más especial.</li>\n    <li><strong>Diseños surtidos:</strong> Cada paleta tiene un diseño único, con grageas y figuras de chocolate que la hacen irresistible.</li>\n    <li><strong>Empaque elegante:</strong> Viene en una bolsa de polipropileno transparente con una cinta de tela, lista para regalar.</li>\n  </ul>\n  <p>Las paletas Candy Colorida son una opción ideal para:</p>\n  <ul>\n    <li>Cumpleaños</li>\n    <li>Fiestas infantiles</li>\n    <li>Eventos especiales</li>\n    <li>Un detalle especial para amigos y familiares</li>\n  </ul>\n  <p>Dale un toque de alegría a tu día con la paleta Candy Colorida. ¡Anímate a probarla!</p>\n</div>",
          "imagenesPrincipales": [{
            "urls": "https://firebasestorage.googleapis.com/v0/b/julsmind-katuq.appspot.com/o/Productos%2F023paletcandynvas.jpg?alt=media&token=bdc0a0be-ef6d-495c-b61a-c5502246bb44",
            "nombreImagen": "023paletcandynvas.jpg",
            "path": "Productos/023paletcandynvas.jpg",
            "tipo": "principal"
          }]
        },
        "identificacion": {
          "referencia": "ALM-2402",
          "tipoProducto": "externo",
          "tipoReferencia": "externo",
          "codigoBarras": "ALM-2402",
          "marca": "Almara"
        },
        "exposicion": {
          "activar": true,
          "disponible": true,
          "etiquetas": ["paleta de chocolate", "paleta candy", "paleta de chocolate blanco", "chocolate blanco", "chocolate colombiano", "dulce colombiano", "regalos colombia", "detalles colombia", "chocolates colombianos", "paleta de chocolate para regalo", "regalo original", "dulce para cumpleaños", "dulce para fiestas", "dulce para eventos"]
        },
        "cd": "QwxcJJ0AQwr6vsSBveJB",
        "precio": {
          "precioUnitarioSinIva": 2800,
          "precioUnitarioIva": "0",
          "valorIva": 0,
          "precioUnitarioConIva": 2800,
          "preciosVolumen": [{
            "numeroUnidadesInicial": 1,
            "numeroUnidadesLimite": 1,
            "valorUnitarioPorVolumenSinIVA": 2800,
            "valorUnitarioPorVolumenIva": 0,
            "valorIVAPorVolumen": "0",
            "valorUnitarioPorVolumenConIVA": 2800
          }]
        },
        "disponibilidad": {
          "tipoEntrega": "ENVIO A DOMICILIO Y RECOGE",
          "cantidadDisponible": 9,
          "inventariable": true
        }
      }
    ];

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
      },

      // Herramientas para el proceso de ventas
      searchProducts: async (args: { query: string, category?: string, limit?: number }) => {
        console.log('📋 PASO 1: Búsqueda de productos', args);
        try {
          // Usar los productos del catálogo definido arriba
          let results = catalogProducts;

          // Filtrar por búsqueda
          if (args.query) {
            const query = args.query.toLowerCase();
            results = results.filter(p =>
              p.crearProducto.titulo.toLowerCase().includes(query) ||
              (p.exposicion.etiquetas && p.exposicion.etiquetas.some(tag =>
                tag.toLowerCase().includes(query))
              )
            );
          }

          // Filtrar por categoría si se proporciona
          if (args.category) {
            const categoryLower = args.category.toLowerCase();
            // Buscar en etiquetas y título como alternativa a categorías explícitas
            results = results.filter(p => {
              // Buscar en etiquetas
              if (p.exposicion.etiquetas && p.exposicion.etiquetas.length) {
                if (p.exposicion.etiquetas.some(tag => tag.toLowerCase().includes(categoryLower))) {
                  return true;
                }
              }

              // Buscar en el título del producto
              if (p.crearProducto.titulo.toLowerCase().includes(categoryLower)) {
                return true;
              }

              return false;
            });
          }

          // Limitar resultados
          if (args.limit && args.limit > 0) {
            results = results.slice(0, args.limit);
          }

          // Formatear los resultados para que sean más manejables
          const formattedResults = results.map(p => ({
            id: p.cd,
            name: p.crearProducto.titulo,
            price: p.precio.precioUnitarioConIva,
            stock: p.disponibilidad.cantidadDisponible,
            reference: p.identificacion?.referencia || '',
            image: p.crearProducto.imagenesPrincipales && p.crearProducto.imagenesPrincipales.length > 0
              ? p.crearProducto.imagenesPrincipales[0].urls
              : null,
            tipoEntrega: p.disponibilidad.tipoEntrega
          }));

          // Asegurarnos de estar en el paso correcto del proceso visual
          if (this.currentSaleProcess.step < 1) {
            console.log('⮕ Avanzando al paso 1: Catálogo de productos');
            this.currentSaleProcess.step = 1;
            // Mostrar el paso de catálogo
            this.goToStep(0);
          }

          return {
            success: true,
            products: formattedResults,
            totalResults: formattedResults.length
          };
        } catch (error) {
          console.error('❌ Error en búsqueda de productos:', error);
          return { success: false, error: error.message };
        }
      },

      addToCart: async (args: { productId: string, quantity: number }) => {
        console.log('🛒 PASO 2: Agregando producto al carrito', args);
        try {
          // En un escenario real, esto añadiría el producto al carrito mediante un servicio
          const { productId, quantity } = args;

          // Buscar el producto por ID (cd) en nuestro catálogo
          const product = catalogProducts.find(p => p.cd === productId);

          if (!product) {
            return { success: false, error: `Producto con ID ${productId} no encontrado` };
          }

          // Crear un objeto simplificado para el carrito
          const cartProduct = {
            id: product.cd,
            name: product.crearProducto.titulo,
            price: product.precio.precioUnitarioConIva,
            reference: product.identificacion?.referencia || '',
            image: product.crearProducto.imagenesPrincipales && product.crearProducto.imagenesPrincipales.length > 0
              ? product.crearProducto.imagenesPrincipales[0].urls
              : null,
            tipoEntrega: product.disponibilidad.tipoEntrega
          };

          // Agregar producto a nuestro estado interno
          const cartItem = {
            product: cartProduct,
            quantity,
            total: cartProduct.price * quantity
          };

          // Agregamos o actualizamos el item en el carrito
          const existingItemIndex = this.currentSaleProcess.cart.findIndex(item =>
            item.product.id === productId
          );

          if (existingItemIndex >= 0) {
            this.currentSaleProcess.cart[existingItemIndex].quantity += quantity;
            this.currentSaleProcess.cart[existingItemIndex].total =
              this.currentSaleProcess.cart[existingItemIndex].quantity * cartProduct.price;
          } else {
            this.currentSaleProcess.cart.push(cartItem);
          }

          // Avanzar al paso 2 si ya agregamos productos y estamos en el paso 1
          if (this.currentSaleProcess.step < 2 && this.currentSaleProcess.cart.length > 0) {
            console.log('⮕ Avanzando al paso 2: Carrito de compras');
            this.currentSaleProcess.step = 2;
            // Mostrar el paso de carrito
            this.goToStep(1);
          }

          return {
            success: true,
            message: `${quantity} unidad(es) de ${cartProduct.name} añadidas al carrito`,
            cartItem,
            currentCart: this.currentSaleProcess.cart
          };
        } catch (error) {
          console.error('❌ Error al agregar producto al carrito:', error);
          return { success: false, error: error.message };
        }
      },

      getCartContents: async () => {
        console.log('🛍️ Consultando contenido del carrito');
        try {
          // Usamos el carrito almacenado en el estado
          const cart = this.currentSaleProcess.cart;

          if (cart.length === 0) {
            return {
              success: true,
              message: "El carrito está vacío",
              items: [],
              summary: {
                itemCount: 0,
                totalItems: 0,
                subtotal: 0,
                taxes: 0,
                total: 0
              }
            };
          }

          const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
          const taxes = subtotal * 0.16; // 16% de impuestos
          const total = subtotal + taxes;

          // Asegurarnos de estar en el paso de carrito
          if (this.currentSaleProcess.step < 2 && cart.length > 0) {
            console.log('⮕ Mostrando paso 2: Revisión del carrito');
            this.currentSaleProcess.step = 2;
            this.goToStep(1); // Mostrar paso de carrito
          }

          return {
            success: true,
            items: cart,
            summary: {
              itemCount: cart.length,
              totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
              subtotal,
              taxes,
              total
            }
          };
        } catch (error) {
          console.error('❌ Error al obtener contenido del carrito:', error);
          return { success: false, error: error.message };
        }
      },

      setClientInfo: async (args: {
        name: string,
        email: string,
        phone?: string,
        address: string, // Se agrega este campo para la dirección
        isNewClient?: boolean
      }) => {
        console.log('👤 PASO 3: Guardando información del cliente', args);

        // Validar formato de correo electrónico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(args.email)) {
          return { success: false, error: "El correo electrónico proporcionado no es válido." };
        }

        // Validar que la dirección no esté vacía
        if (!args.address || args.address.trim().length === 0) {
          return { success: false, error: "La dirección es obligatoria y no puede estar vacía." };
        }

        try {
          // Almacenamos la información del cliente en nuestro estado
          this.currentSaleProcess.client = {
            name: args.name,
            email: args.email,
            phone: args.phone || 'No especificado',
            address: args.address, // Guardamos la dirección
            isNewClient: args.isNewClient || false,
            id: args.isNewClient ? 'NUEVO' : 'CL' + Math.floor(Math.random() * 10000)
          };

          // Avanzamos al paso de datos de cliente
          if (this.currentSaleProcess.step < 3) {
            console.log('⮕ Avanzando al paso 3: Datos del cliente');
            this.currentSaleProcess.step = 3;
            this.goToStep(2); // Mostrar paso de datos de cliente
          }

          return {
            success: true,
            message: `Información del cliente ${this.currentSaleProcess.client.name} guardada correctamente`,
            clientInfo: this.currentSaleProcess.client
          };
        } catch (error) {
          console.error('❌ Error al guardar información del cliente:', error);
          return { success: false, error: error.message };
        }
      },

      setBillingInfo: async (args: {
        taxId?: string,
        billingAddress?: string,
        billingEmail?: string
      }) => {
        console.log('🧾 PASO 4: Guardando información de facturación', args);
        try {
          // Almacenamos la información de facturación en nuestro estado
          this.currentSaleProcess.billingInfo = {
            taxId: args.taxId || 'No especificado',
            billingAddress: args.billingAddress || 'Igual a dirección de entrega',
            billingEmail: args.billingEmail || this.currentSaleProcess.client?.email || 'No especificado',
            billingDate: new Date().toISOString().split('T')[0]
          };

          // Avanzamos al paso de facturación
          if (this.currentSaleProcess.step < 4) {
            console.log('⮕ Avanzando al paso 4: Datos de facturación');
            this.currentSaleProcess.step = 4;
            this.goToStep(3); // Mostrar paso de facturación
          }

          return {
            success: true,
            message: "Información de facturación guardada correctamente",
            billingInfo: this.currentSaleProcess.billingInfo
          };
        } catch (error) {
          console.error('❌ Error al guardar información de facturación:', error);
          return { success: false, error: error.message };
        }
      },

      setDeliveryInfo: async (args: {
        address: string,
        city?: string,
        zipCode?: string,
        deliveryDate?: string
      }) => {
        console.log('🚚 PASO 5: Guardando información de entrega', args);
        try {
          // Almacenamos la información de entrega en nuestro estado
          this.currentSaleProcess.deliveryInfo = {
            address: args.address,
            city: args.city || 'Ciudad por defecto',
            zipCode: args.zipCode || 'No especificado',
            deliveryDate: args.deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 días después
            deliveryMethod: 'Estándar'
          };

          // Avanzamos al paso de entrega
          if (this.currentSaleProcess.step < 5) {
            console.log('⮕ Avanzando al paso 5: Datos de entrega');
            this.currentSaleProcess.step = 5;
            this.goToStep(4); // Mostrar paso de entrega
          }

          return {
            success: true,
            message: `Dirección de entrega establecida: ${this.currentSaleProcess.deliveryInfo.address}`,
            deliveryInfo: this.currentSaleProcess.deliveryInfo
          };
        } catch (error) {
          console.error('❌ Error al guardar información de entrega:', error);
          return { success: false, error: error.message };
        }
      },

      processSale: async (args: { paymentMethod?: string, notes?: string }) => {
        console.log('💲 PASO 6-7: Procesando venta', args);
        try {
          // Verificaciones iniciales
          if (!this.currentSaleProcess.client) {
            console.warn('⚠️ Error al procesar venta: Falta información del cliente');
            return { success: false, error: "Falta información del cliente" };
          }

          if (!this.currentSaleProcess.deliveryInfo) {
            console.warn('⚠️ Error al procesar venta: Falta información de entrega');
            return { success: false, error: "Falta información de entrega" };
          }

          if (this.currentSaleProcess.cart.length === 0) {
            console.warn('⚠️ Error al procesar venta: El carrito está vacío');
            return { success: false, error: "El carrito está vacío" };
          }

          // Guardamos la información de pago
          this.currentSaleProcess.paymentInfo = {
            method: args.paymentMethod || 'Efectivo',
            date: new Date().toISOString(),
            notes: args.notes || '',
            status: 'Procesado'
          };

          // Calculamos el total
          const subtotal = this.currentSaleProcess.cart.reduce((sum, item) => sum + item.total, 0);
          const taxes = subtotal * 0.16;
          const total = subtotal + taxes;

          // Convertir el carrito actual en formato compatible con el modelo Carrito[]
          const carritoItems: Carrito[] = this.currentSaleProcess.cart.map(item => {
            // Crear un objeto producto que cumpla con la interfaz Producto
            return {
              producto: {
                cd: item.product.id,
                crearProducto: {
                  imagenesSecundarias: item.product.images || [],
                  referencia: item.product.reference || '',
                  titulo: item.product.name,
                  descripcion: item.product.description || '',
                  imagenesPrincipales: item.product.image ? [item.product.image] : [],
                  garantiasProducto: "prueba",
                  restriccionesProducto: "prueba",
                  fechaInicial: "",
                  fechaFinal: "",
                  caracAdicionales: "",
                  cuidadoConsumo: "",
                  paraProduccion: true
                },
                precio: {
                  precioUnitarioSinIva: Number(item.product.price) || 0,
                  precioUnitarioIva: "0",
                  valorIva: 0,
                  precioUnitarioConIva: Number(item.product.price) || 0,
                  preciosVolumen: []
                },
                identificacion: {
                  referencia: item.product.reference || '',
                  tipoProducto: 'propio',
                  tipoReferencia: 'propio',
                  marca: '',
                  codigoBarras: item.product.reference || '',
                },

                dimensiones: {
                  altoProductoCm: '0',
                  anchoProductoCm: '0',
                  largoProductoCm: '0',
                  pesoUnitarioProductoKg: '0'
                },
                disponibilidad: {
                  tipoEntrega: item.product.tipoEntrega || 'ENVIO A DOMICILIO Y RECOGE',
                  cantidadDisponible: 10,
                  inventariable: true,
                  cantidadMinVenta: 1,
                  tiempoEntrega: '1',
                  inventarioSeguridad: 0
                },
                exposicion: {
                  disponible: true,
                  etiquetas: item.product.tipoEntrega ? [item.product.tipoEntrega] : [],
                  activar: true,
                  posicion: 1,
                  masvendido: false,
                  nuevo: false,
                  recomendado: false,
                  oferta: false,
                  soloPos: false,
                  destacado: false,
                },

              },
              cantidad: item.quantity,
              estadoProcesoProducto: EstadoProceso.SinProducir
            };
          });

          // Crear objeto de cliente compatible con la interfaz Cliente
          const cliente: Cliente = {
            nombres_completos: this.currentSaleProcess.client.name,
            correo_electronico_comprador: this.currentSaleProcess.client.email,
            numero_celular_comprador: this.currentSaleProcess.client.phone,
            datosFacturacionElectronica: this.currentSaleProcess.billingInfo ? {
              tipoDocumento: 'NIT',
              documento: this.currentSaleProcess.billingInfo.taxId,
              direccion: this.currentSaleProcess.billingInfo.billingAddress,
              correoElectronico: this.currentSaleProcess.billingInfo.billingEmail,
              // Campos obligatorios para Facturacion
              codigoPostal: '',
              indicativoCel: '',
              ciudad: '',
              alias: '',
              celular: '',
              departamento: '',
              nombres: this.currentSaleProcess.client.name,
              pais: 'Colombia'
            } : undefined,
            datosEntrega: this.currentSaleProcess.deliveryInfo ? {
              direccionEntrega: this.currentSaleProcess.deliveryInfo.address,
              ciudad: this.currentSaleProcess.deliveryInfo.city,
              nombres: this.currentSaleProcess.client.name
            } : undefined
          };

          // Crear objeto de envío compatible con la interfaz Envio
          const envio: Envio = {
            direccionEntrega: this.currentSaleProcess.deliveryInfo.address,
            ciudad: this.currentSaleProcess.deliveryInfo.city || '',
            nombres: this.currentSaleProcess.client.name,
            apellidos: '',
            barrio: '',
            indicativoOtroNumero: '',
            especificacionesInternas: '',
            otroNumero: '',
            pais: 'Colombia',
            indicativoCel: '',
            observaciones: '',
            alias: 'Principal',
            celular: this.currentSaleProcess.client.phone || '',
            departamento: '',
            codigoPV: '',
            nombreUnidad: '',
            zonaCobro: '' // Añadimos el campo zonaCobro obligatorio
          };

          // Crear objeto facturación compatible con la interfaz Facturacion
          const facturacion: Facturacion = {
            tipoDocumento: 'NIT',
            documento: this.currentSaleProcess.billingInfo?.taxId || '',
            direccion: this.currentSaleProcess.billingInfo?.billingAddress || this.currentSaleProcess.deliveryInfo?.address || '',
            correoElectronico: this.currentSaleProcess.billingInfo?.billingEmail || this.currentSaleProcess.client?.email || '',
            codigoPostal: '',
            indicativoCel: '',
            ciudad: this.currentSaleProcess.deliveryInfo?.city || '',
            alias: 'Principal',
            celular: this.currentSaleProcess.client?.phone || '',
            departamento: '',
            nombres: this.currentSaleProcess.client.name,
            pais: 'Colombia'
          };
          this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany") ?? '{}');
          // Ahora creamos un objeto de tipo Pedido según el modelo
          const pedido: Pedido = {
            referencia: `REF-${Date.now()}`,
            nroPedido: 'ORD' + Math.floor(Math.random() * 100000),
            company: this.empresaActual?.nomComercial || 'Katuq',
            cliente: cliente,
            carrito: carritoItems,
            formaDePago: this.currentSaleProcess.paymentInfo.method,
            subtotal: subtotal,
            totalImpuesto: taxes,
            totalPedididoConDescuento: total,
            facturacion: facturacion,
            envio: envio,
            fechaEntrega: this.currentSaleProcess.deliveryInfo.deliveryDate,
            estadoProceso: EstadoProceso.SinProducir,
            estadoPago: EstadoPago.Pendiente,
            fechaCreacion: new Date().toISOString(),
            notasPedido: {
              notasDespachos: [],
              notasEntregas: [],
              notasCliente: [],
              notasProduccion: [],
              notasFacturacionPagos: []
            }
          };

          if (args.notes) {
            // Añadir notas si existen
            pedido.notasPedido.notasCliente.push({
              fecha: new Date().toISOString(),
              nota: args.notes
            });
          }

          // INTEGRACIÓN CON API: Crear el pedido
          console.log('📡 Validando número de pedido...');
          const validationResult = await this.ventasService.validateNroPedido(pedido.nroPedido as string).toPromise();
          console.log('✅ Número de pedido validado:', validationResult);

          // Generar HTML para el correo usando el PaymentService en lugar del método local
          const htmlContent = this.paymentService.getHtmlContent(pedido);

          console.log('📡 Creando pedido en la base de datos...');
          try {
            const orderResult = await this.ventasService.createOrder({
              order: pedido,
              emailHtml: htmlContent
            }).toPromise();

            console.log('✅ Pedido creado exitosamente:', orderResult);
            this.toastr.success(`Pedido ${pedido.nroPedido} creado correctamente`, 'Pedido Creado');
          } catch (apiError) {
            console.error('❌ Error al crear el pedido en la API:', apiError);
            this.toastr.error('Ocurrió un error al crear el pedido', 'Error');

            // Aunque haya un error en la API, continuamos con el flujo local
            console.warn('⚠️ Continuando con el flujo local a pesar del error en la API');
          }

          // Marcamos la venta como completada
          this.currentSaleProcess.completed = true;

          // Avanzamos al paso final de confirmación
          if (this.currentSaleProcess.step < 7) {
            console.log('⮕ Avanzando al paso 7: Confirmación de venta');
            this.currentSaleProcess.step = 7;
            this.goToStep(6); // Mostrar paso de confirmación
          }

          console.log('✅ Pedido generado exitosamente:', pedido.nroPedido, pedido);

          return {
            success: true,
            message: `¡Venta ${pedido.nroPedido} procesada correctamente!`,
            pedido: pedido // Devolver el objeto pedido en formato correcto
          };
        } catch (error) {
          console.error('❌ Error al procesar venta:', error);
          this.toastr.error('Ocurrió un error al procesar la venta', 'Error');
          return { success: false, error: error.message };
        }
      },

      getCurrentSaleProcess: async () => {
        console.log('🔍 Consultando estado actual del proceso de venta');
        try {
          // Devuelve el estado actual completo del proceso de venta
          return {
            success: true,
            currentStep: this.currentSaleProcess.step,
            steps: [
              { number: 1, name: "Catálogo", completed: this.currentSaleProcess.step > 1 },
              { number: 2, name: "Carrito", completed: this.currentSaleProcess.step > 2 },
              { number: 3, name: "Datos Cliente", completed: this.currentSaleProcess.step > 3 },
              { number: 4, name: "Facturación", completed: this.currentSaleProcess.step > 4 },
              { number: 5, name: "Entrega", completed: this.currentSaleProcess.step > 5 },
              { number: 6, name: "Pago", completed: this.currentSaleProcess.step > 6 },
              { number: 7, name: "Confirmación", completed: this.currentSaleProcess.completed }
            ],
            cart: this.currentSaleProcess.cart,
            client: this.currentSaleProcess.client,
            billingInfo: this.currentSaleProcess.billingInfo,
            deliveryInfo: this.currentSaleProcess.deliveryInfo,
            paymentInfo: this.currentSaleProcess.paymentInfo,
            completed: this.currentSaleProcess.completed
          };
        } catch (error) {
          console.error('❌ Error al obtener estado del proceso de venta:', error);
          return { success: false, error: error.message };
        }
      },

      // Reemplazar getCurrentStepInSalesProcess por la versión que no depende de URL
      getCurrentStepInSalesProcess: async () => {
        console.log('🔖 Consultando paso actual del proceso de venta');
        try {
          let currentStep = {
            number: this.currentSaleProcess.step,
            name: 'Paso no iniciado',
            description: 'Iniciar proceso de venta',
            nextAction: 'Buscar productos en el catálogo'
          };

          switch (this.currentSaleProcess.step) {
            case 1:
              currentStep = {
                number: 1,
                name: 'Catálogo',
                description: 'Selección de productos',
                nextAction: 'Añadir productos al carrito'
              };
              break;
            case 2:
              currentStep = {
                number: 2,
                name: 'Carrito',
                description: 'Revisión de productos seleccionados',
                nextAction: 'Agregar información del cliente'
              };
              break;
            case 3:
              currentStep = {
                number: 3,
                name: 'Datos del Cliente',
                description: 'Información del cliente',
                nextAction: 'Agregar datos de facturación'
              };
              break;
            case 4:
              currentStep = {
                number: 4,
                name: 'Facturación',
                description: 'Datos para factura electrónica',
                nextAction: 'Agregar datos de entrega'
              };
              break;
            case 5:
              currentStep = {
                number: 5,
                name: 'Entrega',
                description: 'Datos de envío',
                nextAction: 'Proceder al pago'
              };
              break;
            case 6:
              currentStep = {
                number: 6,
                name: 'Pago',
                description: 'Resumen y método de pago',
                nextAction: 'Procesar venta'
              };
              break;
            case 7:
              currentStep = {
                number: 7,
                name: 'Confirmación',
                description: 'Venta confirmada',
                nextAction: 'Finalizar proceso'
              };
              break;
          }

          return {
            success: true,
            currentStep,
            isInSalesProcess: this.currentSaleProcess.step > 0
          };
        } catch (error) {
          console.error('❌ Error al obtener paso actual del proceso:', error);
          return { success: false, error: error.message };
        }
      },

      resetSaleProcess: async () => {
        console.log('🔄 Reiniciando proceso de venta');
        try {
          // Reiniciar el proceso de venta
          this.currentSaleProcess = {
            step: 0,
            cart: [],
            client: null,
            deliveryInfo: null,
            billingInfo: null,
            paymentInfo: null,
            completed: false
          };

          // Volver al primer paso visual
          if (this.visualSteps.length > 0) {
            this.goToStep(0);
          }

          console.log('✅ Proceso de venta reiniciado correctamente');
          return {
            success: true,
            message: "Proceso de venta reiniciado correctamente"
          };
        } catch (error) {
          console.error('❌ Error al reiniciar proceso de venta:', error);
          return { success: false, error: error.message };
        }
      }
    };

    // Definir las herramientas disponibles para OpenAI
    this.tools = [
      {
        type: 'function',
        name: 'navigateTo',
        description: 'Navega a una ruta específica de la app',
        parameters: {
          type: 'object',
          properties: {
            route: { type: 'string', description: 'Ruta a navegar (ej: /ventas)' }
          },
          required: ['route']
        }
      },
      {
        type: 'function',
        name: 'showStep',
        description: 'Muestra un paso específico de la guía',
        parameters: {
          type: 'object',
          properties: {
            stepNumber: { type: 'integer', description: 'Número del paso (1-7)' }
          },
          required: ['stepNumber']
        }
      },
      {
        type: 'function',
        name: 'getVentaStepsInfo',
        description: 'Obtiene lista de pasos de venta',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'nextStep',
        description: 'Va al siguiente paso visual',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'previousStep',
        description: 'Va al paso visual anterior',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'getPageInfo',
        description: 'Obtiene info de la página actual',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      // Herramientas simplificadas para proceso rápido de venta
      {
        type: 'function',
        name: 'searchProducts',
        description: 'Busca productos en catálogo',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Término de búsqueda' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'addToCart',
        description: 'Añade producto al carrito',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'ID del producto' },
            quantity: { type: 'integer', description: 'Cantidad', default: 1 }
          },
          required: ['productId']
        }
      },
      {
        type: 'function',
        name: 'getCartContents',
        description: 'Muestra contenido del carrito',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'setClientInfo',
        description: 'Guarda información del cliente',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nombre del cliente' },
            email: { type: 'string', description: 'Email (opcional)' },
            phone: { type: 'string', description: 'Teléfono (opcional)' },
            address: { type: 'string', description: 'Dirección del cliente' },
            isNewClient: { type: 'boolean', description: 'Indica si es un cliente nuevo' }
          },
          required: ['name', 'address']
        }
      },
      {
        type: 'function',
        name: 'setDeliveryInfo',
        description: 'Guarda dirección de entrega',
        parameters: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Dirección de entrega' },
            city: { type: 'string', description: 'Ciudad (opcional)' }
          },
          required: ['address']
        }
      },
      {
        type: 'function',
        name: 'processSale',
        description: 'Completa la venta',
        parameters: {
          type: 'object',
          properties: {
            paymentMethod: {
              type: 'string',
              description: 'Método de pago',
              enum: ['Efectivo', 'Tarjeta de crédito', 'Transferencia'],
              default: 'Efectivo'
            },
            notes: { type: 'string', description: 'Notas adicionales' }
          }
        }
      },
      {
        type: 'function',
        name: 'getCurrentSaleProcess',
        description: 'Obtiene estado de la venta',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'resetSaleProcess',
        description: 'Reinicia el proceso de venta',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  // Método actualizado para cargar contenido visual de demostración
  loadDemoContent() {
    console.log('📊 Cargando contenido visual de demostración');
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
      this.logDebug(`📝 Texto de paso actualizado: "${this.currentStepText}"`);
    } else {
      this.currentStepText = 'Escuchando...';
      this.logDebug(`📝 Texto de paso actualizado: "${this.currentStepText}"`);
    }
  }

  // Agregar un método para ir a un paso específico (útil para navegar directamente)
  goToStep(stepIndex: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (stepIndex >= 0 && stepIndex < this.visualSteps.length) {
      console.log(`🔀 Navegando al paso ${stepIndex + 1} de ${this.visualSteps.length}`);
      this.currentStepIndex = stepIndex;
      this.updateCurrentStepText();

      // Opcional: Anunciar el cambio de paso mediante voz
      this.sendTextMessage(`Mostrando paso ${stepIndex + 1}: ${this.visualSteps[stepIndex].caption.split(':')[1].trim()}`);
    } else {
      console.warn(`⚠️ Intento de navegación a paso inválido: ${stepIndex + 1}`);
    }
  }

  // Navegar al paso anterior
  previousStep(event: MouseEvent) {
    event.stopPropagation();
    if (this.currentStepIndex > 0) {
      console.log(`⬅️ Retrocediendo al paso ${this.currentStepIndex}`);
      this.currentStepIndex--;
      this.updateCurrentStepText();
    } else {
      console.warn('⚠️ Ya estás en el primer paso, no se puede retroceder más');
    }
  }

  // Navegar al siguiente paso
  nextStep(event: MouseEvent) {
    event.stopPropagation();
    if (this.currentStepIndex < this.visualSteps.length - 1) {
      console.log(`➡️ Avanzando al paso ${this.currentStepIndex + 2}`);
      this.currentStepIndex++;
      this.updateCurrentStepText();
    } else {
      console.warn('⚠️ Ya estás en el último paso, no se puede avanzar más');
    }
  }

  // Borrar todo el contenido visual
  clearVisualContent() {
    console.log('🧹 Limpiando contenido visual');
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

  // Nuevo método para registrar mensajes de debug y almacenarlos
  private logDebug(message: string): void {
    console.log(message);
    this.debugLogs.push(message);
    // Limitar cantidad de mensajes guardados
    if (this.debugLogs.length > 10) {
      this.debugLogs.shift();
    }
  }

}
