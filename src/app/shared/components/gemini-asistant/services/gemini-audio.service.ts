import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { environment } from '../../../../../environments/environment';

// Importaciones para herramientas especializadas
import { KatuqInventoryToolsService, InventoryToolResponse } from './katuq-inventory-tools.service';
import { SphereVisualService } from './sphere-visual.service';

// Importaciones para sistema de ventas (solo las necesarias para coordinación)
import { VentasService } from '../../../services/ventas/ventas.service';
import { CartSingletonService } from "../../../services/ventas/cart.singleton.service";
import { BodegaService } from "../../../services/bodegas/bodega.service";
import { InventarioService } from "../../../services/inventarios/inventario.service";
import { MaestroService } from "../../../services/maestros/maestro.service";
import { Carrito, Pedido, Cliente, Facturacion, Envio, EstadoProceso, EstadoPago } from '../../../../components/ventas/modelo/pedido';
import { Producto } from '../../../models/productos/Producto';
import { UserLite } from '../../../models/User/UserLite';
import { UserLogged } from '../../../models/User/UserLogged';

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message: string;
}

// Interfaces para eventos de herramientas de Katuq
export interface KatuqToolEvent {
  toolName: string;
  stepName?: string;
  data?: any;
  success?: boolean;
  message?: string;
}

// Nuevas interfaces para herramientas
export interface ToolCall {
  name: string;
  args: any;
  id: string;
}

export interface FunctionDeclaration {
  name: string;
  description?: string;
  parameters?: any;
}

export interface ToolResponse {
  toolCallId: string;
  response: any;
}

export interface FunctionResponse {
  id: string;
  name: string;
  response: any;
}

export interface ToolResponseWithFunctions {
  functionResponses: FunctionResponse[];
}

export interface GeminiToolsConfig {
  googleSearch?: boolean;
  functionDeclarations?: FunctionDeclaration[];
  codeExecution?: boolean;
  urlContext?: boolean;
}

export interface GeminiLiveConfig {
  model?: string;
  systemInstruction?: string;
  responseModalities?: Modality[];
  speechConfig?: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
  };
  tools?: GeminiToolsConfig;
}

// Interfaces para el sistema de ventas
export interface VisualStep {
  imageUrl: string;
  caption: string;
  icon: string;
  stepKey: string;
  completed?: boolean;
  active?: boolean;
  sphereAnimation?: string;
  sphereColor?: string;
  sphereVisual?: any;
}

export interface OrderStatus {
  currentStep: string;
  completedSteps: {
    warehouse: boolean;
    products: boolean;
    client: boolean;
    delivery: boolean;
    billing: boolean;
  };
  nextStep: string;
  readyForPayment: boolean;
}

export interface DemoResponse {
  success: boolean;
  data?: any;
  message: string;
  visualUpdate?: {
    stepName: string;
    progress: number;
    nextActions: string[];
  };
  error?: string;
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

  // Nuevos subjects para herramientas
  private toolCallSubject = new BehaviorSubject<ToolCall | null>(null);
  private textResponseSubject = new BehaviorSubject<string>('');
  private katuqToolEventSubject = new BehaviorSubject<KatuqToolEvent | null>(null);

  // Sistema de turnos según documentación oficial
  private responseQueue: LiveServerMessage[] = [];
  private isProcessingTurn = false;

  connectionStatus$: Observable<ConnectionStatus> = this.connectionStatusSubject.asObservable();
  audioData$: Observable<any> = this.audioDataSubject.asObservable();
  toolCall$: Observable<ToolCall | null> = this.toolCallSubject.asObservable();
  textResponse$: Observable<string> = this.textResponseSubject.asObservable();
  katuqToolEvent$: Observable<KatuqToolEvent | null> = this.katuqToolEventSubject.asObservable();

  // Estado del sistema de ventas
  private pedidoEnProgreso: Pedido;
  private bodegaSeleccionada: any;
  private productosCatalogo: Producto[] = [];
  private empresaActual: any;
  private allBillingZone: any[] = [];
  private pasoActual: number = 1;

  // Observables para actualizaciones visuales
  private visualStepsSubject = new BehaviorSubject<VisualStep[]>([]);
  private orderStatusSubject = new BehaviorSubject<OrderStatus | null>(null);
  private progressSubject = new BehaviorSubject<number>(0);

  visualSteps$: Observable<VisualStep[]> = this.visualStepsSubject.asObservable();
  orderStatus$: Observable<OrderStatus | null> = this.orderStatusSubject.asObservable();
  progress$: Observable<number> = this.progressSubject.asObservable();

  constructor(
    private sphereVisualService: SphereVisualService,
    private bodegaService: BodegaService,
    private inventarioService: InventarioService,
    private cartService: CartSingletonService,
    private ventasService: VentasService,
    private inventoryToolsService: KatuqInventoryToolsService,
    private maestroService: MaestroService
  ) {
    this.initClient();
    this.initSalesSystem();
  }

  /**
   * Métodos auxiliares para usar servicios si están disponibles
   */
  private showToast(message: string, title: string = 'Notificación'): void {
    console.log(`🎉 Toast Demo: ${title} - ${message}`);
    // En producción, aquí se podría intentar usar ToastrService si está disponible
  }

  private updateVoiceAgentSteps(steps: VisualStep[]): void {
    console.log('📊 Voice Agent Steps Demo:', steps.map(s => s.caption));
    // En producción, aquí se podría usar VoiceAgentService si está disponible
  }

  /**
   * Espera por un mensaje en la cola de respuestas
   * Optimizado para menor latencia
   */
  private async waitMessage(): Promise<LiveServerMessage> {
    let done = false;
    let message: LiveServerMessage | undefined = undefined;
    while (!done) {
      message = this.responseQueue.shift();
      if (message) {
        done = true;
      } else {
        // Reducir polling de 100ms a 10ms para respuesta más rápida
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    return message!;
  }

  /**
   * Maneja un turno completo (mensajes hasta que se complete)
   * Optimizado con timeout para evitar bloqueos
   */
  private async handleTurn(): Promise<LiveServerMessage[]> {
    const turns: LiveServerMessage[] = [];
    let done = false;
    const startTime = Date.now();
    const maxTurnTime = 5000; // 5 segundos máximo por turno

    while (!done) {
      // Verificar timeout
      if (Date.now() - startTime > maxTurnTime) {
        console.warn('⚠️ [Turn] Timeout de turno alcanzado, completando con mensajes actuales');
        done = true;
        break;
      }

      const message = await this.waitMessage();
      turns.push(message);

      console.log('🔄 [Turn] ==================== MENSAJE RECIBIDO ====================');
      console.log('🔄 [Turn] Tipo de mensaje:', this.getMessageType(message));
      console.log('🔄 [Turn] ¿Tiene serverContent?:', !!message.serverContent);
      console.log('🔄 [Turn] ¿Tiene toolCall?:', !!message.toolCall);
      console.log('🔄 [Turn] turnComplete:', message.serverContent?.turnComplete);

      if (message.toolCall) {
        console.log('🛠️ [Turn] ✅ TOOL CALL DETECTADO:');
        console.log('🛠️ [Turn] Function calls:', JSON.stringify(message.toolCall, null, 2));
      } else {
        console.log('⚠️ [Turn] ❌ NO HAY TOOL CALL - El modelo solo respondió con texto/audio');
      }

      if (message.serverContent?.modelTurn) {
        console.log('💬 [Turn] Model turn parts:', message.serverContent.modelTurn.parts?.length || 0);
      }

      console.log('🔄 [Turn] Resumen:', {
        hasServerContent: !!message.serverContent,
        turnComplete: message.serverContent?.turnComplete,
        hasToolCall: !!message.toolCall,
        messageType: this.getMessageType(message)
      });
      console.log('🔄 [Turn] ================================================================');

      // Optimizar detección de turnos completos
      if (message.serverContent?.turnComplete === true) {
        console.log('✅ [Turn] Turno completado por turnComplete flag');
        done = true;
      } else if (message.toolCall) {
        console.log('🛠️ [Turn] Turno completado por toolCall');
        done = true;
      } else if (message.serverContent?.modelTurn?.parts) {
        // Si recibimos contenido del modelo, verificar si parece completo
        const hasText = message.serverContent.modelTurn.parts.some(part => part.text);
        const hasAudio = message.serverContent.modelTurn.parts.some(part => part.inlineData);
        if (hasText || hasAudio) {
          // Esperar un momento muy breve para ver si hay más mensajes
          await new Promise(resolve => setTimeout(resolve, 25));
          if (this.responseQueue.length === 0) {
            console.log('⚡ [Turn] Turno completado por contenido aparentemente final');
            done = true;
          }
        }
      }
    }
    return turns;
  }

  /**
   * Determina el tipo de mensaje para logging
   */
  private getMessageType(message: LiveServerMessage): string {
    if (message.toolCall) return 'toolCall';
    if (message.serverContent?.modelTurn) return 'modelTurn';
    if (message.serverContent?.interrupted) return 'interrupted';
    if (message.serverContent?.turnComplete) return 'turnComplete';
    return 'unknown';
  }

  private initClient() {
    this.client = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });
  }

  /**
   * Inicializa el sistema de ventas
   */
  private initSalesSystem(): void {
    console.log('🛒 Inicializando sistema de ventas para demo...');
    
    // Obtener datos de la empresa actual o usar datos demo
    try {
      this.empresaActual = JSON.parse(localStorage.getItem("company") || '{}');
    } catch {
      this.empresaActual = { id: 'DEMO_COMPANY', nombre: 'Empresa Demo' };
    }
    
    // Inicializar nuevo pedido
    this.inicializarNuevoPedido();
    
    // Simular zonas de facturación para demo
    this.allBillingZone = [
      { id: 'BOG', nombre: 'Bogotá', costo: 5000 },
      { id: 'MED', nombre: 'Medellín', costo: 8000 },
      { id: 'CALI', nombre: 'Cali', costo: 10000 }
    ];
    
    // Configurar pasos visuales iniciales
    this.visualStepsSubject.next(this.getInitialProcessSteps());
    
    console.log('✅ Sistema de ventas inicializado para demo');
  }

  /**
   * Inicializa un nuevo pedido
   */
  private inicializarNuevoPedido(): void {
    // Obtener usuario o usar datos demo
    let user: UserLogged;
    try {
      user = JSON.parse(localStorage.getItem('user') || '{}') as UserLogged;
    } catch {
      user = { name: 'Usuario Demo', email: 'demo@katuq.com', nit: '123456789' } as UserLogged;
    }
    
    const asesor: UserLite = { 
      name: user.name || 'Usuario Demo', 
      email: user.email || 'demo@katuq.com', 
      nit: user.nit || '123456789' 
    };

    this.pasoActual = 1;

    this.pedidoEnProgreso = {
        referencia: `VOICE-DEMO-${Date.now()}`,
        nroPedido: 'VD' + Math.floor(Math.random() * 100000), // Voice Demo
        estadoProceso: EstadoProceso.SinProducir,
        estadoPago: EstadoPago.Pendiente,
        carrito: [],
        company: this.empresaActual.id,
        asesorAsignado: asesor,
        fechaCreacion: new Date().toISOString()
    };
    
    this.bodegaSeleccionada = null;
    this.productosCatalogo = [];
    
    console.log('🆕 Nuevo proceso de pedido demo inicializado:', this.pedidoEnProgreso.nroPedido);
    
    // Actualizar estado visual
    this.updateOrderStatus();
    this.updateProgress();
  }

  /**
   * Obtiene los pasos iniciales del proceso de ventas
   */
  private getInitialProcessSteps(): VisualStep[] {
    return [
      {
        imageUrl: 'assets/images/ventas/paso1-bodega-esfera.png',
        caption: '1. 🌐 Bodega: Selecciona una bodega para iniciar la venta',
        icon: 'fa-globe',
        stepKey: 'bodega',
        sphereAnimation: 'pulse',
        sphereColor: '#4CAF50'
      },
      {
        imageUrl: 'assets/images/ventas/paso2-productos-esfera.png',
        caption: '2. 🛍️ Productos: Busca y selecciona productos del catálogo',
        icon: 'fa-shopping-basket',
        stepKey: 'productos',
        sphereAnimation: 'bounce',
        sphereColor: '#2196F3'
      },
      {
        imageUrl: 'assets/images/ventas/paso3-carrito-esfera.png',
        caption: '3. 🛒 Carrito: Revisa los productos seleccionados',
        icon: 'fa-shopping-cart',
        stepKey: 'carrito',
        sphereAnimation: 'rotate',
        sphereColor: '#FF9800'
      },
      {
        imageUrl: 'assets/images/ventas/paso4-cliente-esfera.png',
        caption: '4. 👤 Cliente: Configura la información del cliente',
        icon: 'fa-user',
        stepKey: 'cliente',
        sphereAnimation: 'wave',
        sphereColor: '#9C27B0'
      },
      {
        imageUrl: 'assets/images/ventas/paso5-envio-esfera.png',
        caption: '5. 🚚 Envío: Define los datos de entrega',
        icon: 'fa-truck',
        stepKey: 'envio',
        sphereAnimation: 'slide',
        sphereColor: '#607D8B'
      },
      {
        imageUrl: 'assets/images/ventas/paso6-facturacion-esfera.png',
        caption: '6. 📄 Facturación: Completa los datos de facturación',
        icon: 'fa-file-invoice',
        stepKey: 'facturacion',
        sphereAnimation: 'glow',
        sphereColor: '#E91E63'
      },
      {
        imageUrl: 'assets/images/ventas/paso7-pago-esfera.png',
        caption: '7. 💳 Pago: Procesa el pago del pedido',
        icon: 'fa-credit-card',
        stepKey: 'pago',
        sphereAnimation: 'pulse',
        sphereColor: '#4CAF50'
      },
      {
        imageUrl: 'assets/images/ventas/paso8-confirmacion-esfera.png',
        caption: '8. ✨ Confirmación: ¡Venta completada exitosamente!',
        icon: 'fa-check-circle',
        stepKey: 'confirmacion',
        sphereAnimation: 'celebrate',
        sphereColor: '#FFD700'
      }
    ];
  }

  /**
   * Actualiza el paso visual actual
   */
  private updateVisualStep(stepName: string): void {
    const steps = this.visualStepsSubject.value;
    const stepIndex = steps.findIndex(s => s.stepKey === stepName.toLowerCase());
    
    if (stepIndex !== -1) {
      const updatedSteps = steps.map((step, index) => ({
        ...step,
        completed: index < stepIndex,
        active: index === stepIndex
      }));
      
      this.visualStepsSubject.next(updatedSteps);
      console.log(`📍 Paso visual actualizado: ${stepName} (índice ${stepIndex})`);

      // Activar la visualización esférica para el paso actual
      const currentStep = updatedSteps[stepIndex];
      if (currentStep) {
        this.sphereVisualService.createSphereVisual(stepName.toLowerCase(), {
          animationType: currentStep.sphereAnimation as any,
          sphereColor: currentStep.sphereColor || '#4CAF50',
          particleCount: 50,
          audioReactive: true,
          celebrationMode: stepName.toLowerCase() === 'confirmacion'
        });
      }
    }
    
    this.updateProgress();
  }

  /**
   * Actualiza el estado del pedido
   */
  private updateOrderStatus(): void {
    const status: OrderStatus = {
      currentStep: this.getCurrentStepName(),
      completedSteps: {
        warehouse: !!this.bodegaSeleccionada,
        products: this.pedidoEnProgreso.carrito ? this.pedidoEnProgreso.carrito.length > 0 : false,
        client: !!this.pedidoEnProgreso.cliente,
        delivery: !!this.pedidoEnProgreso.envio,
        billing: !!this.pedidoEnProgreso.facturacion
      },
      nextStep: this.getNextStepMessage(),
      readyForPayment: this.isReadyForPayment()
    };
    
    this.orderStatusSubject.next(status);
  }

  /**
   * Actualiza el progreso del proceso
   */
  private updateProgress(): void {
    const status = this.orderStatusSubject.value;
    if (status) {
      const completedSteps = Object.values(status.completedSteps).filter(Boolean).length;
      const totalSteps = Object.keys(status.completedSteps).length;
      const progress = Math.round((completedSteps / totalSteps) * 100);
      this.progressSubject.next(progress);
    }
  }

  /**
   * Obtiene el nombre del paso actual
   */
  private getCurrentStepName(): string {
    const stepNames = [
      'Selección de Bodega',
      'Búsqueda de Productos', 
      'Revisión de Carrito',
      'Información del Cliente',
      'Datos de Envío',
      'Información de Facturación',
      'Procesamiento de Pago',
      'Confirmación'
    ];
    return stepNames[this.pasoActual - 1] || 'Paso Desconocido';
  }

  /**
   * Obtiene el mensaje del siguiente paso
   */
  private getNextStepMessage(): string {
    if (!this.bodegaSeleccionada) return 'Seleccionar una bodega';
    if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) return 'Agregar productos al carrito';
    if (!this.pedidoEnProgreso.cliente) return 'Configurar cliente';
    if (!this.pedidoEnProgreso.envio) return 'Configurar datos de envío';
    if (!this.pedidoEnProgreso.facturacion) return 'Configurar facturación';
    return 'Procesar pago';
  }

  /**
   * Verifica si está listo para el pago
   */
  private isReadyForPayment(): boolean {
    return !!(
      this.bodegaSeleccionada &&
      this.pedidoEnProgreso.carrito && this.pedidoEnProgreso.carrito.length > 0 &&
      this.pedidoEnProgreso.cliente &&
      this.pedidoEnProgreso.envio &&
      this.pedidoEnProgreso.facturacion
    );
  }

  /**
   * Infiere el departamento a partir de la ciudad colombiana
   */
  private inferDepartmentFromCity(city: string): string {
    const cityDepartmentMap: { [key: string]: string } = {
      'Bogotá': 'Cundinamarca',
      'Medellín': 'Antioquia',
      'Cali': 'Valle del Cauca',
      'Barranquilla': 'Atlántico',
      'Cartagena': 'Bolívar',
      'Bucaramanga': 'Santander',
      'Pereira': 'Risaralda',
      'Manizales': 'Caldas',
      'Ibagué': 'Tolima',
      'Pasto': 'Nariño',
      'Cúcuta': 'Norte de Santander',
      'Armenia': 'Quindío',
      'Villavicencio': 'Meta',
      'Neiva': 'Huila',
      'Popayán': 'Cauca'
    };
    return cityDepartmentMap[city] || 'Cundinamarca';
  }

  /**
   * Obtiene el código postal estándar para ciudades colombianas
   */
  private getPostalCodeForCity(city: string): string {
    const cityPostalMap: { [key: string]: string } = {
      'Bogotá': '110111',
      'Medellín': '050001',
      'Cali': '760001',
      'Barranquilla': '080001',
      'Cartagena': '130001',
      'Bucaramanga': '680001',
      'Pereira': '660001',
      'Manizales': '170001',
      'Ibagué': '730001',
      'Pasto': '520001',
      'Cúcuta': '540001',
      'Armenia': '630001',
      'Villavicencio': '500001',
      'Neiva': '410001',
      'Popayán': '190001'
    };
    return cityPostalMap[city] || '110111';
  }

  /**
   * Procesa los turnos recibidos manteniendo la funcionalidad existente
   */
  private async processTurns(turns: LiveServerMessage[]): Promise<void> {
    console.log(`🔄 [Turn] Procesando ${turns.length} mensajes en el turno`);

    for (const turn of turns) {
      console.log('📨 [Turn] Procesando mensaje:', this.getMessageType(turn));

      // Procesar audio del modelo (funcionalidad existente)
      const audio = turn.serverContent?.modelTurn?.parts?.[0]?.inlineData;
      if (audio) {
        console.log('🔊 [Turn] Audio recibido del modelo');
        this.audioDataSubject.next(audio);
      }

      // Procesar texto del modelo (funcionalidad existente)
      const text = turn.serverContent?.modelTurn?.parts?.[0]?.text;
      if (text) {
        console.log('💬 [Turn] Texto recibido del modelo:', text.substring(0, 100) + '...');
        this.textResponseSubject.next(text);
      }

      // Procesar llamadas a herramientas según patrón oficial
      if (turn.toolCall && turn.toolCall.functionCalls) {
        console.log('🛠️ [Turn] Procesando llamadas a herramientas');

        // Procesar todas las llamadas a herramientas en el turno
        const functionResponses: any[] = [];

        for (const functionCall of turn.toolCall.functionCalls) {
          console.log('🔧 [Turn] Procesando función:', {
            name: functionCall.name,
            args: functionCall.args,
            id: functionCall.id
          });

          // Crear toolCall para compatibilidad con el sistema existente
          const toolCall: ToolCall = {
            name: functionCall.name || '',
            args: functionCall.args || {},
            id: functionCall.id || ''
          };

          // Notificar al componente (para compatibilidad)
          this.toolCallSubject.next(toolCall);

          // Procesar la herramienta directamente aquí (patrón oficial)
          try {
            const response = await this.handleKatuqToolResponse(toolCall);
            functionResponses.push({
              id: functionCall.id,
              name: functionCall.name,
              response: response
            });
            console.log('✅ [Turn] Herramienta procesada:', functionCall.name);
          } catch (error) {
            console.error('❌ [Turn] Error procesando herramienta:', functionCall.name, error);
            functionResponses.push({
              id: functionCall.id,
              name: functionCall.name,
              response: { error: 'Error procesando herramienta' }
            });
          }
        }

        // Enviar todas las respuestas de herramientas (patrón oficial)
        if (functionResponses.length > 0) {
          console.log('📤 [Turn] Enviando respuestas de herramientas:', functionResponses.length);
          this.sendToolResponseWithFunctions({ functionResponses });
        }
      }

      // Procesar interrupciones (funcionalidad existente)
      const interrupted = turn.serverContent?.interrupted;
      if (interrupted) {
        console.log('⏸️ [Turn] Interrupción detectada');
        this.audioDataSubject.next({ interrupted: true });
      }
    }

    console.log('✅ [Turn] Procesamiento de turno completado');
  }

  /**
   * Construye la configuración de herramientas según el modelo
   * Basado en la documentación oficial: https://ai.google.dev/gemini-api/docs/live-tools
   */
  private buildToolsConfig(toolsConfig?: GeminiToolsConfig): any[] {
    const tools: any[] = [];

    // Google Search - disponible en todos los modelos Live
    if (toolsConfig?.googleSearch) {
      tools.push({ googleSearch: {} });
    }

    // Function Calls - disponible en gemini-live-2.5-flash-preview y gemini-2.0-flash-live-001
    if (toolsConfig?.functionDeclarations && toolsConfig.functionDeclarations.length > 0) {
      tools.push({
        functionDeclarations: toolsConfig.functionDeclarations
      });
    }

    // Code Execution - solo disponible en gemini-live-2.5-flash-preview
    if (toolsConfig?.codeExecution) {
      tools.push({ codeExecution: {} });
    }

    // URL Context - solo disponible en gemini-live-2.5-flash-preview
    if (toolsConfig?.urlContext) {
      tools.push({ urlContext: {} });
    }

    return tools;
  }

  /**
   * Valida la compatibilidad de herramientas según el modelo
   */
  private validateToolsForModel(model: string, toolsConfig?: GeminiToolsConfig): string[] {
    const warnings: string[] = [];

    if (toolsConfig?.codeExecution && !model.includes('gemini-live-2.5-flash-preview')) {
      warnings.push('Code Execution solo está disponible en gemini-live-2.5-flash-preview');
    }

    if (toolsConfig?.urlContext && !model.includes('gemini-live-2.5-flash-preview')) {
      warnings.push('URL Context solo está disponible en gemini-live-2.5-flash-preview');
    }

    if (toolsConfig?.functionDeclarations &&
      !model.includes('gemini-live-2.5-flash-preview') &&
      !model.includes('gemini-2.0-flash-live-001')) {
      warnings.push('Function Calls solo está disponible en gemini-live-2.5-flash-preview y gemini-2.0-flash-live-001');
    }

    return warnings;
  }

  async initSession(config?: GeminiLiveConfig): Promise<void> {
    const model = config?.model || 'gemini-2.5-flash-preview-native-audio-dialog';
    const systemInstruction = config?.systemInstruction ||
      "Eres un asistente de IA que responde en español, solo habla de que puedes hacer en el sistema como crear pedidos";

    console.log('🚀 Iniciando sesión Gemini Live...');
    console.log('📋 Configuración:', {
      modelo: model,
      instruccion: systemInstruction,
      herramientas: config?.tools ? 'Configuradas' : 'Sin herramientas'
    });

    // Validar herramientas para el modelo
    const warnings = this.validateToolsForModel(model, config?.tools);
    if (warnings.length > 0) {
      console.warn('⚠️ Advertencias de compatibilidad de herramientas:', warnings);
    }

    // Construir configuración de herramientas
    const tools = this.buildToolsConfig(config?.tools);

    
    const sessionConfig = {
      responseModalities: config?.responseModalities || [Modality.AUDIO],
      systemInstruction: systemInstruction,
      speechConfig: config?.speechConfig || {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus'} },
        languageCode: 'es-US'
      },
      ...(tools.length > 0 && { tools }) // Solo agregar tools si hay herramientas configuradas
    };
    
    /*const sessionConfig = {
      responseModalities: [Modality.AUDIO],
      model: 'gemini-2.5-flash-preview',
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } },
        languageCode: 'es-US'
      },
      tools: tools
    }*/

    console.log('🔧 Configuración de sesión:', {
      model,
      tools: tools.length > 0 ? tools : 'Sin herramientas',
      responseModalities: sessionConfig.responseModalities,
      voice: sessionConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName
    });

    try {
      this.connectionStatusSubject.next({
        status: 'connecting',
        message: 'Connecting to Gemini Live API...'
      });

      console.log('🔌 Conectando a Gemini Live API...');
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            console.log('✅ Conexión establecida con Gemini Live API');
            this.connectionStatusSubject.next({
              status: 'connected',
              message: 'Connected to Gemini Live API'
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('📨 [Message] Mensaje recibido del servidor:', this.getMessageType(message));

            // Procesamiento inmediato para ciertos tipos de mensajes
            const messageType = this.getMessageType(message);
            
            if (messageType === 'interrupted') {
              // Procesar interrupciones inmediatamente
              console.log('⏸️ [Message] Interrupción procesada inmediatamente');
              this.audioDataSubject.next({ interrupted: true });
              return;
            }

            // Agregar el mensaje a la cola para procesamiento por turnos
            this.responseQueue.push(message);

            // Si no estamos procesando un turno, iniciar el procesamiento
            if (!this.isProcessingTurn) {
              this.isProcessingTurn = true;

              try {
                console.log('🔄 [Message] Iniciando procesamiento de turno...');
                const turns = await this.handleTurn();
                await this.processTurns(turns);
              } catch (error) {
                console.error('❌ [Message] Error procesando turno:', error);
                this.connectionStatusSubject.next({
                  status: 'error',
                  message: `Turn processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
              } finally {
                this.isProcessingTurn = false;
                console.log('✅ [Message] Procesamiento de turno finalizado');
              }
            } else {
              console.log('⏳ [Message] Turno ya en procesamiento, mensaje agregado a cola');
            }
          },
          onerror: (e: ErrorEvent) => {
            this.connectionStatusSubject.next({
              status: 'error',
              message: `Connection error: ${e.message}`
            });
          },
          onclose: (e: CloseEvent) => {
            console.log('🔌 Conexión cerrada:', e.reason, 'Código:', e.code);
            this.connectionStatusSubject.next({
              status: 'disconnected',
              message: `Connection closed: ${e.reason}`
            });

            // Si la conexión se cierra inesperadamente, intentar reconectar
            if (e.code !== 1000) { // 1000 = cierre normal
              console.log('🔄 Intentando reconectar en 3 segundos...');
              setTimeout(() => {
                this.reconnectSession();
              }, 3000);
            }
          },
        },
        config: sessionConfig
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

  /**
   * Verifica si la sesión está activa y lista para enviar
   */
  private isSessionReady(): boolean {
    const status = this.getConnectionStatus();
    const isReady = this.session && status.status === 'connected';

    if (!isReady) {
      console.warn('⚠️ Sesión no está lista:', {
        session: !!this.session,
        status: status.status,
        message: status.message
      });
    }

    return isReady;
  }

  /**
   * Envía respuesta a una llamada de herramienta
   * Mejorado para funcionar con el sistema de turnos
   */
  sendToolResponse(toolResponse: ToolResponse): void {
    if (!this.isSessionReady()) {
      console.error('❌ [Tool] No se puede enviar respuesta: sesión no está lista');
      return;
    }

    console.log('📤 [Tool] Enviando respuesta de herramienta al modelo:', {
      toolCallId: toolResponse.toolCallId,
      responseType: typeof toolResponse.response,
      responsePreview: JSON.stringify(toolResponse.response).substring(0, 100) + '...'
    });

    try {
      // Estructura recomendada para respuestas de herramientas
      const responseContent = {
        turns: [{
          parts: [{
            text: JSON.stringify(toolResponse.response)
          }]
        }]
      };

      this.session.sendClientContent(responseContent);
      console.log('✅ [Tool] Respuesta de herramienta enviada exitosamente');

      // Limpiar la llamada a herramienta pendiente inmediatamente
      setTimeout(() => {
        this.toolCallSubject.next(null);
      }, 25);

    } catch (error) {
      console.error('❌ [Tool] Error enviando respuesta de herramienta:', error);
    }
  }

  /**
   * Envía respuesta de herramientas con múltiples funciones
   * Basado en el ejemplo oficial de Gemini Live Tools
   */
  sendToolResponseWithFunctions(toolResponse: ToolResponseWithFunctions): void {
    if (!this.isSessionReady()) {
      console.error('❌ [Tool] No se puede enviar respuesta: sesión no está lista');
      return;
    }

    console.log('📤 [Tool] Enviando respuestas de herramientas con funciones:', toolResponse.functionResponses.length);

    try {
      // Usar el método específico para respuestas de herramientas con funciones
      this.session.sendToolResponse(toolResponse);
      console.log('✅ [Tool] Respuestas de herramientas enviadas exitosamente');

      // Limpiar las llamadas a herramientas pendientes
      setTimeout(() => {
        this.toolCallSubject.next(null);
      }, 25);

    } catch (error) {
      console.error('❌ [Tool] Error enviando respuestas de herramientas:', error);
    }
  }

  /**
   * Envía contenido de texto al modelo
   */
  sendTextMessage(text: string): void {
    if (this.session) {
      this.session.sendClientContent({
        turns: [{ parts: [{ text }] }]
      });
    }
  }

  /**
   * Limpia las llamadas de herramientas pendientes
   */
  clearToolCalls(): void {
    this.toolCallSubject.next(null);
  }

  /**
   * Obtiene el estado actual de la conexión
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }

  /**
   * Verifica si la sesión está activa
   */
  isSessionActive(): boolean {
    return this.session && this.getConnectionStatus().status === 'connected';
  }

  /**
   * Configuración de ejemplo con Google Search
   */
  async initSessionWithGoogleSearch(): Promise<void> {
    const config: GeminiLiveConfig = {
      model: 'gemini-2.5-flash-preview-native-audio-dialog',
      systemInstruction: "Eres un asistente de IA que responde en español con acento colombiano. Puedes buscar información en internet para responder preguntas.",
      responseModalities: [Modality.AUDIO],
      tools: {
        googleSearch: true
      }
    };
    await this.initSession(config);
  }

  /**
   * Configuración de ejemplo con Function Calls
   */
  async initSessionWithFunctionCalls(): Promise<void> {
    const config: GeminiLiveConfig = {
      model: 'gemini-2.5-flash-preview-native-audio-dialog',
      systemInstruction: "Eres un asistente de IA que responde en español. Puedes llamar funciones para realizar acciones en el sistema Katuq.",
      responseModalities: [Modality.AUDIO],
      tools: {
        functionDeclarations: [
          {
            name: 'get_inventory_info',
            description: 'Obtiene información básica del inventario del sistema Katuq',
            parameters: {
              type: 'object',
              properties: {
                product_name: {
                  type: 'string',
                  description: 'Nombre del producto a consultar (opcional)'
                },
                category: {
                  type: 'string',
                  description: 'Categoría de productos a consultar (opcional)'
                }
              }
            }
          },
          {
            name: 'get_system_status',
            description: 'Obtiene el estado general del sistema Katuq',
            parameters: {
              type: 'object',
              properties: {
                include_metrics: {
                  type: 'boolean',
                  description: 'Incluir métricas del sistema (opcional)'
                }
              }
            }
          },
          {
            name: 'search_products',
            description: 'Busca productos en el inventario del sistema Katuq',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Término de búsqueda para productos'
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados (opcional, por defecto 10)'
                }
              },
              required: ['query']
            }
          }
        ]
      }
    };
    await this.initSession(config);
  }

  /**
   * Configuración de ejemplo con Code Execution
   */
  async initSessionWithCodeExecution(): Promise<void> {
    const config: GeminiLiveConfig = {
      model: 'gemini-live-2.5-flash-preview', // Solo este modelo soporta Code Execution
      systemInstruction: "Eres un asistente de IA que responde en español. Puedes ejecutar código Python para resolver problemas.",
      responseModalities: [Modality.TEXT],
      tools: {
        codeExecution: true
      }
    };
    await this.initSession(config);
  }

  /**
   * Configuración de ejemplo con múltiples herramientas
   */
  async initSessionWithMultipleTools(): Promise<void> {
    const config: GeminiLiveConfig = {
      model: 'gemini-live-2.5-flash-preview',
      systemInstruction: "Eres un asistente de IA que responde en español. Puedes buscar información, ejecutar código y llamar funciones.",
      responseModalities: [Modality.TEXT],
      tools: {
        googleSearch: true,
        codeExecution: true,
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Obtiene el clima actual'
          }
        ]
      }
    };
    await this.initSession(config);
  }

  /**
   * Configuración específica para probar herramientas del sistema Katuq con todas las herramientas de ventas
   */
  async initSessionWithKatuqTools(): Promise<void> {
    const config: GeminiLiveConfig = {
      model: 'gemini-live-2.5-flash-preview',
      systemInstruction: `Eres un asistente de voz inteligente del sistema Katuq Seller, especializado en la gestión de inventario y ventas e inventarios de productos.

CAPACIDADES PRINCIPALES:
- Gestión completa de ventas paso a paso con feedback visual esférico
- Selección de bodegas y catálogo de productos
- Búsqueda avanzada y gestión de carrito de compras
- Creación y búsqueda de clientes
- Configuración completa de facturación y envío
- Procesamiento completo de pedidos y pagos
- Actualizaciones visuales en tiempo real con animaciones esféricas

PERSONALIDAD:
- Profesional pero amigable, con acento colombiano
- Proactivo en sugerir siguientes pasos
- Enfocado en eficiencia y experiencia de usuario
- Explica claramente cada acción realizada
- Crea experiencias visuales inolvidables

MODO DEMO - DATOS SIMPLIFICADOS:
- Para facturación: Solo pide el nombre del cliente (ciudad opcional)
- Para envío: Solo pide la dirección de entrega (ciudad opcional)
- Todo lo demás se auto-completa con datos demo realistas
- Enfócate en velocidad y fluidez, no en formularios largos
- IMPORTANTE: Siempre habla de precios en PESOS COLOMBIANOS (COP)
- Usa formato de moneda colombiano: $50.000, $1.200.000, etc.
- Di "pesos" o "pesos colombianos" cuando menciones precios
- Ejemplos: "El total es cincuenta mil pesos", "Son dos millones de pesos"

⚠️ IMPORTANTE: USO OBLIGATORIO DE HERRAMIENTAS ⚠️

DEBES usar las herramientas (function calls) para TODAS las operaciones. NUNCA respondas solo con texto cuando existe una herramienta disponible.

GUÍA DE USO DE HERRAMIENTAS POR PASO:

1️⃣ BODEGAS
Usuario dice: "lista bodegas" / "muestra bodegas" / "qué bodegas hay"
→ EJECUTA: listWarehouses()
→ Luego menciona las bodegas recibidas

Usuario dice: "selecciona bodega X" / "usa la bodega principal"
→ EJECUTA: selectWarehouse({warehouseId: "ID_DE_BODEGA"})

2️⃣ PRODUCTOS
Usuario dice: "busca productos" / "muestra productos" / "busca Samsung"
→ EJECUTA: searchProductsAdvanced({query: "Samsung"})
→ Lee los productos encontrados con nombre y precio

Usuario dice: "agrega producto X" / "añade al carrito"
→ EJECUTA: addToCart({productId: "ID", quantity: 1})

3️⃣ CARRITO
Usuario dice: "muestra el carrito" / "qué hay en el carrito"
→ EJECUTA: getCartContents()

4️⃣ CLIENTE
Usuario da nombre y documento
→ EJECUTA: quickCreateClient({name: "...", document: "..."})

5️⃣ ENVÍO
Usuario da dirección
→ EJECUTA: configureShipping({direccion: "...", ciudad: "Bogotá"})

6️⃣ FACTURACIÓN
Usuario confirma datos
→ EJECUTA: configureBilling({nombres: "...", ciudad: "Bogotá"})

7️⃣ PAGO
Usuario confirma pedido
→ EJECUTA: processSale({paymentMethod: "Efectivo"})

🚨 REGLAS CRÍTICAS:
✅ CORRECTO: Usuario: "busca Samsung" → TÚ: [EJECUTAS searchProductsAdvanced] → "Encontré 3 productos Samsung..."
❌ INCORRECTO: Usuario: "busca Samsung" → TÚ: "Claro, voy a buscar productos Samsung..." [NO HACE NADA]

✅ CORRECTO: Usuario: "agrega ese producto" → TÚ: [EJECUTAS addToCart con el ID del último producto mencionado]
❌ INCORRECTO: Usuario: "agrega ese producto" → TÚ: "Necesito que me des el ID del producto"

📋 REGLAS DE DATOS:
✅ Datos OBLIGATORIOS que DEBES pedir al usuario:
- Bodega de origen
- Nombres del cliente
- Dirección completa de envío
- Ciudad de destino
- Productos a agregar

✅ Datos OPCIONALES que puedes autocompletar:
- Teléfonos (usa +57 por defecto)
- Emails (genera temporal si no proporcionan)
- Departamento (infiere de la ciudad)
- Código postal (estándar de la ciudad)
- Tipo documento (CC por defecto en Colombia)

💬 FLUJO CONVERSACIONAL:
Usuario: "Crea una venta para María García"
Tú: [EJECUTAS quickCreateClient] "Cliente María creado. ¿Qué productos necesitas agregar?"

Usuario: "Busca laptops"
Tú: [EJECUTAS searchProductsAdvanced] "Encontré 5 laptops. ¿Cuál quieres agregar?"

Usuario: "Agrega la primera"
Tú: [EJECUTAS addToCart] "Laptop agregada. ¿Algo más o configuramos envío?"

Usuario: "Envía a Calle 123 Bogotá"
Tú: [EJECUTAS configureShipping] "Envío configurado a Bogotá. ¿Procesamos la venta?"

FLUJO DE VENTAS COMPLETO:
1. Seleccionar bodega → 2. Buscar productos → 3. Agregar al carrito → 4. Configurar cliente → 5. Configurar envío → 6. Configurar facturación → 7. Procesar venta → 8. Confirmación

Siempre usa las herramientas para obtener datos reales. Proporciona retroalimentación clara sobre el progreso y sugieres las mejores acciones a seguir.`,
      responseModalities: [Modality.AUDIO],
      tools: {
        functionDeclarations: [
          // === GESTIÓN DE BODEGAS ===
          {
            name: 'listWarehouses',
            description: 'Lista todas las bodegas disponibles para realizar ventas en el sistema Katuq',
            parameters: { type: 'object', properties: {} }
          },
          {
            name: 'selectWarehouse',
            description: 'Selecciona una bodega específica para la venta y carga su catálogo de productos',
            parameters: {
              type: 'object',
              properties: {
                warehouseId: { type: 'string', description: 'ID de la bodega a seleccionar (ej: BOD001, BOD002)' }
              },
              required: ['warehouseId']
            }
          },

          // === GESTIÓN DE PRODUCTOS ===
          {
            name: 'searchProductsAdvanced',
            description: 'Busca productos en el catálogo con filtros avanzados como precio, categoría, stock y ordenamiento',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Término de búsqueda por nombre, marca, o referencia' },
                category: { type: 'string', description: 'Filtrar por categoría específica (Electrónicos, Ropa, etc.)' },
                minPrice: { type: 'number', description: 'Precio mínimo del producto' },
                maxPrice: { type: 'number', description: 'Precio máximo del producto' },
                minStock: { type: 'integer', description: 'Stock mínimo requerido' },
                sortBy: { type: 'string', enum: ['name', 'price-asc', 'price-desc'], description: 'Ordenar resultados' },
                limit: { type: 'integer', description: 'Máximo de resultados (por defecto 10)' }
              }
            }
          },
          {
            name: 'addToCart',
            description: 'Agrega un producto específico al carrito de compras con la cantidad deseada',
            parameters: {
              type: 'object',
              properties: {
                productId: { type: 'string', description: 'ID del producto a agregar (ej: PROD001)' },
                quantity: { type: 'integer', description: 'Cantidad a agregar (por defecto 1)', default: 1 }
              },
              required: ['productId']
            }
          },
          {
            name: 'quickAddToCart',
            description: 'Busca un producto por nombre y lo agrega al carrito en una sola operación',
            parameters: {
              type: 'object',
              properties: {
                productQuery: { type: 'string', description: 'Nombre o descripción del producto a buscar y agregar' },
                quantity: { type: 'integer', description: 'Cantidad a agregar (por defecto 1)' },
                useFirstMatch: { type: 'boolean', description: 'Agregar automáticamente el primer resultado encontrado' }
              },
              required: ['productQuery']
            }
          },
          {
            name: 'getCartContents',
            description: 'Muestra el contenido actual del carrito con productos, cantidades y totales',
            parameters: { type: 'object', properties: {} }
          },

          // === GESTIÓN DE CLIENTES ===
          {
            name: 'searchClient',
            description: 'Busca un cliente existente en el sistema por su número de documento',
            parameters: {
              type: 'object',
              properties: {
                document: { type: 'string', description: 'Número de documento del cliente (sin puntos ni espacios)' }
              },
              required: ['document']
            }
          },
          {
            name: 'quickCreateClient',
            description: 'Crea un nuevo cliente rápidamente con datos básicos y lo asigna al pedido actual',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nombre completo del cliente' },
                document: { type: 'string', description: 'Número de documento de identificación' },
                email: { type: 'string', description: 'Correo electrónico (opcional)' },
                phone: { type: 'string', description: 'Número de teléfono (opcional)' }
              },
              required: ['name', 'document']
            }
          },

          // === NUEVAS HERRAMIENTAS DE FACTURACIÓN ===
          {
            name: 'configureBilling',
            description: 'Configura facturación con datos mínimos para demo rápida. Solo requiere el nombre, el resto se auto-completa.',
            parameters: {
              type: 'object',
              properties: {
                nombres: { type: 'string', description: 'Nombres completos para facturación' },
                ciudad: { type: 'string', description: 'Ciudad para facturación (opcional, default: Bogotá)' }
              },
              required: ['nombres']
            }
          },
          {
            name: 'getBillingZones',
            description: 'Obtiene las zonas de facturación disponibles con sus costos',
            parameters: { type: 'object', properties: {} }
          },
          {
            name: 'selectBillingZone',
            description: 'Selecciona una zona de facturación específica para el pedido',
            parameters: {
              type: 'object',
              properties: {
                zoneId: { type: 'string', description: 'ID de la zona de facturación (ej: BOG, MED, CALI)' }
              },
              required: ['zoneId']
            }
          },

          // === NUEVAS HERRAMIENTAS DE ENVÍO ===
          {
            name: 'configureShipping',
            description: 'Configura envío con dirección básica para demo rápida. Solo requiere la dirección, el resto se auto-completa.',
            parameters: {
              type: 'object',
              properties: {
                direccion: { type: 'string', description: 'Dirección completa de entrega' },
                ciudad: { type: 'string', description: 'Ciudad de entrega (opcional, default: Bogotá)' }
              },
              required: ['direccion']
            }
          },
          {
            name: 'getShippingOptions',
            description: 'Obtiene las opciones de envío disponibles con sus costos y tiempos',
            parameters: { type: 'object', properties: {} }
          },
          {
            name: 'selectShippingOption',
            description: 'Selecciona una opción de envío específica para el pedido',
            parameters: {
              type: 'object',
              properties: {
                optionId: { type: 'string', description: 'ID de la opción de envío' },
                estimatedDays: { type: 'integer', description: 'Días estimados de entrega' },
                cost: { type: 'number', description: 'Costo del envío' }
              },
              required: ['optionId']
            }
          },

          // === PROCESAMIENTO DE PEDIDOS ===
          {
            name: 'getOrderSummary',
            description: 'Genera un resumen completo del pedido actual con totales, productos y datos del cliente',
            parameters: { type: 'object', properties: {} }
          },
          {
            name: 'validateOrderBeforePay',
            description: 'Valida que el pedido esté completo y listo para procesar el pago',
            parameters: { type: 'object', properties: {} }
          },
          {
            name: 'processSale',
            description: 'Procesa la venta final, calcula totales y completa el pedido',
            parameters: {
              type: 'object',
              properties: {
                paymentMethod: { type: 'string', description: 'Método de pago (Efectivo, Tarjeta, etc.)', default: 'Efectivo' }
              }
            }
          },

          // === ESTADO Y NAVEGACIÓN ===
          {
            name: 'getDemoStatus',
            description: 'Obtiene el estado actual del proceso de venta con progreso visual y siguientes acciones',
            parameters: { type: 'object', properties: {} }
          },

          // === NUEVAS HERRAMIENTAS VISUALES ESFÉRICAS ===
          {
            name: 'createSphereVisual',
            description: 'Crea una experiencia visual esférica única para el paso actual',
            parameters: {
              type: 'object',
              properties: {
                stepName: { type: 'string', description: 'Nombre del paso para crear la esfera visual' },
                animationType: { type: 'string', enum: ['pulse', 'bounce', 'rotate', 'wave', 'slide', 'glow', 'celebrate'], description: 'Tipo de animación esférica' },
                sphereColor: { type: 'string', description: 'Color de la esfera (hex, rgb, o nombre)' },
                particleCount: { type: 'integer', description: 'Número de partículas en la esfera (opcional)' }
              },
              required: ['stepName']
            }
          },
          {
            name: 'showSphereProgress',
            description: 'Muestra el progreso del proceso de venta en una esfera interactiva',
            parameters: {
              type: 'object',
              properties: {
                includeAnimations: { type: 'boolean', description: 'Incluir animaciones en la esfera de progreso', default: true },
                showDetails: { type: 'boolean', description: 'Mostrar detalles de cada paso en la esfera', default: true }
              }
            }
          },
          {
            name: 'createSphereCelebration',
            description: 'Crea una celebración esférica especial cuando se completa una venta',
            parameters: {
              type: 'object',
              properties: {
                celebrationType: { type: 'string', enum: ['success', 'milestone', 'completion'], description: 'Tipo de celebración' },
                particleEffects: { type: 'boolean', description: 'Incluir efectos de partículas', default: true },
                soundEffects: { type: 'boolean', description: 'Incluir efectos de sonido', default: true }
              }
            }
          },
          {
            name: 'showSphereNotification',
            description: 'Muestra una notificación esférica con animaciones únicas',
            parameters: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Mensaje a mostrar en la notificación esférica' },
                type: { type: 'string', enum: ['info', 'success', 'warning', 'error'], description: 'Tipo de notificación' },
                duration: { type: 'integer', description: 'Duración en milisegundos (opcional)' },
                sphereSize: { type: 'string', enum: ['small', 'medium', 'large'], description: 'Tamaño de la esfera', default: 'medium' }
              },
              required: ['message']
            }
          },

          // === HERRAMIENTAS ORIGINALES (compatibilidad) ===
          {
            name: 'get_inventory_info',
            description: 'Obtiene información básica del inventario del sistema Katuq',
            parameters: {
              type: 'object',
              properties: {
                product_name: { type: 'string', description: 'Nombre del producto a consultar (opcional)' },
                category: { type: 'string', description: 'Categoría de productos a consultar (opcional)' }
              }
            }
          },
          {
            name: 'get_system_status',
            description: 'Obtiene el estado general del sistema Katuq',
            parameters: {
              type: 'object',
              properties: {
                include_metrics: { type: 'boolean', description: 'Incluir métricas del sistema (opcional)' }
              }
            }
          },
          {
            name: 'search_products',
            description: 'Búsqueda básica de productos en el inventario',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Término de búsqueda para productos' },
                limit: { type: 'number', description: 'Número máximo de resultados (opcional, por defecto 10)' }
              },
              required: ['query']
            }
          },

          // === VALIDACIÓN DE CUPONES ===
          {
            name: 'validateCoupon',
            description: 'Valida un cupón de descuento y lo aplica al pedido si es válido',
            parameters: {
              type: 'object',
              properties: {
                couponCode: { type: 'string', description: 'Código del cupón a validar' }
              },
              required: ['couponCode']
            }
          },

          // === NUEVAS HERRAMIENTAS DE INVENTARIO ===
          {
            name: 'getInventoryStatus',
            description: 'Obtiene el estado general del inventario con estadísticas y métricas',
            parameters: {
              type: 'object',
              properties: {
                includeLowStock: { type: 'boolean', description: 'Incluir alertas de stock bajo', default: true },
                includeCategories: { type: 'boolean', description: 'Incluir resumen por categorías', default: true },
                includeWarehouse: { type: 'string', description: 'Filtrar por bodega específica (opcional)' }
              }
            }
          },
          {
            name: 'searchInventoryByCategory',
            description: 'Busca productos en el inventario por categoría específica',
            parameters: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Categoría de productos a buscar' },
                minStock: { type: 'integer', description: 'Stock mínimo requerido (opcional)' },
                maxPrice: { type: 'number', description: 'Precio máximo (opcional)' },
                sortBy: { type: 'string', enum: ['name', 'stock', 'price', 'date'], description: 'Ordenar resultados', default: 'name' },
                limit: { type: 'integer', description: 'Máximo de resultados', default: 20 }
              },
              required: ['category']
            }
          },
          {
            name: 'getLowStockAlerts',
            description: 'Obtiene alertas de productos con stock bajo o agotado',
            parameters: {
              type: 'object',
              properties: {
                threshold: { type: 'integer', description: 'Umbral de stock bajo (por defecto 10)', default: 10 },
                includeOutOfStock: { type: 'boolean', description: 'Incluir productos agotados', default: true },
                warehouse: { type: 'string', description: 'Filtrar por bodega específica (opcional)' }
              }
            }
          },
          {
            name: 'getInventoryReport',
            description: 'Genera un reporte completo del inventario con análisis detallado',
            parameters: {
              type: 'object',
              properties: {
                reportType: { type: 'string', enum: ['summary', 'detailed', 'analytics'], description: 'Tipo de reporte', default: 'summary' },
                dateRange: { type: 'string', description: 'Rango de fechas (ej: "last7days", "last30days", "thisMonth")', default: 'last30days' },
                includeMovements: { type: 'boolean', description: 'Incluir movimientos de inventario', default: false },
                exportFormat: { type: 'string', enum: ['json', 'csv', 'pdf'], description: 'Formato de exportación', default: 'json' }
              }
            }
          },
          {
            name: 'checkProductAvailability',
            description: 'Verifica la disponibilidad de un producto específico en tiempo real',
            parameters: {
              type: 'object',
              properties: {
                productId: { type: 'string', description: 'ID del producto a verificar' },
                productName: { type: 'string', description: 'Nombre del producto a verificar' },
                checkAllWarehouses: { type: 'boolean', description: 'Verificar en todas las bodegas', default: true },
                includeAlternatives: { type: 'boolean', description: 'Incluir productos alternativos similares', default: false }
              },
              required: ['productId', 'productName']
            }
          },
          {
            name: 'getInventoryMovements',
            description: 'Obtiene el historial de movimientos de inventario para análisis',
            parameters: {
              type: 'object',
              properties: {
                movementType: { type: 'string', enum: ['all', 'in', 'out', 'adjustment'], description: 'Tipo de movimiento', default: 'all' },
                startDate: { type: 'string', description: 'Fecha de inicio (YYYY-MM-DD)', default: 'last7days' },
                endDate: { type: 'string', description: 'Fecha de fin (YYYY-MM-DD)' },
                productId: { type: 'string', description: 'Filtrar por producto específico (opcional)' },
                warehouse: { type: 'string', description: 'Filtrar por bodega (opcional)' },
                limit: { type: 'integer', description: 'Máximo de resultados', default: 50 }
              }
            }
          },
          {
            name: 'getCategoryInventorySummary',
            description: 'Obtiene un resumen del inventario organizado por categorías',
            parameters: {
              type: 'object',
              properties: {
                includeEmptyCategories: { type: 'boolean', description: 'Incluir categorías sin productos', default: false },
                sortBy: { type: 'string', enum: ['name', 'count', 'value', 'stock'], description: 'Ordenar por', default: 'name' },
                includePricing: { type: 'boolean', description: 'Incluir información de precios', default: true },
                includeStockLevels: { type: 'boolean', description: 'Incluir niveles de stock', default: true }
              }
            }
          },
          {
            name: 'getWarehouseInventoryComparison',
            description: 'Compara el inventario entre diferentes bodegas',
            parameters: {
              type: 'object',
              properties: {
                warehouses: { type: 'array', items: { type: 'string' }, description: 'Lista de IDs de bodegas a comparar' },
                includeMetrics: { type: 'boolean', description: 'Incluir métricas comparativas', default: true },
                includeProducts: { type: 'boolean', description: 'Incluir lista de productos por bodega', default: false },
                highlightDifferences: { type: 'boolean', description: 'Resaltar diferencias entre bodegas', default: true }
              },
              required: ['warehouses']
            }
          },
          {
            name: 'getInventoryTrends',
            description: 'Analiza tendencias del inventario en el tiempo',
            parameters: {
              type: 'object',
              properties: {
                trendType: { type: 'string', enum: ['stock', 'sales', 'purchases', 'movements'], description: 'Tipo de tendencia a analizar', default: 'stock' },
                period: { type: 'string', description: 'Período de análisis (ej: "weekly", "monthly", "quarterly")', default: 'monthly' },
                months: { type: 'integer', description: 'Número de meses a analizar', default: 6 },
                includeForecast: { type: 'boolean', description: 'Incluir pronóstico futuro', default: false },
                category: { type: 'string', description: 'Filtrar por categoría específica (opcional)' }
              }
            }
          },
          {
            name: 'quickSearchProducts',
            description: 'Búsqueda rápida de productos por nombre, referencia o descripción. Ideal para consultas como "busca productos de mouse" o "encuentra artículos similares a teclado"',
            parameters: {
              type: 'object',
              properties: {
                termino: {
                  type: 'string',
                  description: 'Término de búsqueda (mínimo 2 caracteres). Puede ser nombre, referencia, descripción o código del producto'
                },
                limit: {
                  type: 'number',
                  description: 'Número máximo de resultados a retornar (default: 5, máximo: 10)',
                  default: 5
                }
              },
              required: ['termino']
            }
          }
        ]
      }
    };
    await this.initSession(config);
  }

  /**
   * Ejemplo de uso de las herramientas del sistema Katuq
   */
  async testKatuqTools(): Promise<void> {
    console.log('🧪 Iniciando prueba de herramientas Katuq...');

    // Inicializar sesión con herramientas de Katuq
    console.log('🔧 Configurando sesión con herramientas Katuq...');
    await this.initSessionWithKatuqTools();

    console.log('📡 Suscribiéndose a llamadas de herramientas...');
    // Suscribirse a llamadas de herramientas
    this.toolCall$.subscribe(async (toolCall) => {
      if (toolCall) {
        console.log('🛠️ Llamada a herramienta Katuq recibida:', toolCall);

        // Procesar la llamada a la herramienta
        const response = await this.handleKatuqToolResponse(toolCall);

        // Enviar respuesta (comentado por ahora para evitar errores de tipos)
        console.log('📤 Respuesta de herramienta:', response);
        // this.sendToolResponse({
        //   toolCallId: toolCall.id,
        //   response: response
        // });
      }
    });

    console.log('📡 Suscribiéndose a respuestas de texto...');
    // Suscribirse a respuestas de texto
    this.textResponse$.subscribe(text => {
      console.log('💬 Respuesta de texto recibida:', text);
    });

    // Ejemplos de mensajes para probar
    const testMessages = [
      "¿Cuál es el estado del sistema Katuq?",
      "Busca productos de electrónicos en el inventario",
      "Dame información del inventario general",
      "¿Cuántos productos hay en la categoría Ropa?"
    ];

    console.log('🧪 Mensajes de prueba disponibles:');
    testMessages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg}`);
    });

    console.log('✅ Configuración de prueba completada. Puedes enviar mensajes de voz o texto.');
  }

  /**
   * Prueba específica del flujo completo de herramientas
   */
  async testCompleteToolFlow(): Promise<void> {
    console.log('🧪 Iniciando prueba del flujo completo de herramientas...');

    // Inicializar sesión con herramientas
    await this.initSessionWithKatuqTools();

    // Suscribirse a todo el flujo
    this.toolCall$.subscribe(async (toolCall) => {
      if (toolCall) {
        console.log('🛠️ [Test] Herramienta llamada:', toolCall);

        // Procesar herramienta
        const response = await this.handleKatuqToolResponse(toolCall);
        console.log('📤 [Test] Respuesta generada:', response);

        // Enviar respuesta al modelo
        this.sendToolResponse({
          toolCallId: toolCall.id,
          response: response
        });
      }
    });

    this.textResponse$.subscribe(text => {
      console.log('💬 [Test] Respuesta del modelo:', text);
    });

    // Enviar mensaje de prueba después de un momento
    setTimeout(() => {
      console.log('📤 [Test] Enviando mensaje de prueba...');
      this.sendTextMessage("¿Cuál es el estado del sistema Katuq?");
    }, 2000);

    console.log('✅ [Test] Configuración completada. Revisa la consola para el flujo completo.');
  }

  closeSession(): void {
    // Limpiar estado de turnos
    this.responseQueue = [];
    this.isProcessingTurn = false;

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

  /**
   * Reintenta la conexión de la sesión
   */
  async reconnectSession(): Promise<void> {
    console.log('🔄 Reintentando conexión...');
    try {
      // Limpiar estado de turnos antes de reconectar
      this.responseQueue = [];
      this.isProcessingTurn = false;

      await this.initSession();
      console.log('✅ Reconexión exitosa');
    } catch (error) {
      console.error('❌ Error en reconexión:', error);
    }
  }

  /**
   * Maneja las respuestas de herramientas específicas del sistema Katuq
   */
  async handleKatuqToolResponse(toolCall: ToolCall): Promise<any> {
    const { name, args } = toolCall;
    console.log(`🔧 Ejecutando herramienta Katuq: ${name}`, args);

    try {
      let response: any;

      switch (name) {
        case 'listWarehouses':
          response = await this.handleListWarehouses(args);
          this.emitKatuqToolEvent('listWarehouses', response.data, response.success, response.message);
          break;

        case 'selectWarehouse':
          response = await this.handleSelectWarehouse(args);
          this.emitKatuqToolEvent('selectWarehouse', response.data, response.success, response.message);
          break;

        case 'searchProductsAdvanced':
          response = await this.handleSearchProductsAdvanced(args);
          this.emitKatuqToolEvent('searchProductsAdvanced', response.data, response.success, response.message);
          break;

        case 'addToCart':
          response = await this.handleAddToCart(args);
          this.emitKatuqToolEvent('addToCart', response.data, response.success, response.message);
          break;

        case 'quickAddToCart':
          response = this.handleQuickAddToCart(args);
          this.emitKatuqToolEvent('quickAddToCart', response.data, response.success, response.message);
          break;

        case 'getCartContents':
          response = this.handleGetCartContents(args);
          this.emitKatuqToolEvent('getCartContents', response.data, response.success, response.message);
          break;

        case 'searchClient':
          response = await this.handleSearchClient(args);
          this.emitKatuqToolEvent('searchClient', response.data, response.success, response.message);
          break;

        case 'quickCreateClient':
          response = this.handleQuickCreateClient(args);
          this.emitKatuqToolEvent('quickCreateClient', response.data, response.success, response.message);
          break;

        case 'getOrderSummary':
          response = this.handleGetOrderSummary(args);
          this.emitKatuqToolEvent('getOrderSummary', response.data, response.success, response.message);
          break;

        case 'validateOrderBeforePay':
          response = this.handleValidateOrderBeforePay(args);
          this.emitKatuqToolEvent('validateOrderBeforePay', response.data, response.success, response.message);
          break;

        case 'processSale':
          response = await this.handleProcessSale(args);
          this.emitKatuqToolEvent('processSale', response.data, response.success, response.message);
          break;

        case 'getDemoStatus':
          response = this.handleGetDemoStatus(args);
          this.emitKatuqToolEvent('getDemoStatus', response.data, response.success, response.message);
          break;

        case 'configureBilling':
          response = this.handleConfigureBilling(args);
          this.emitKatuqToolEvent('configureBilling', response.data, response.success, response.message);
          break;

        case 'getBillingZones':
          response = this.handleGetBillingZones(args);
          this.emitKatuqToolEvent('getBillingZones', response.data, response.success, response.message);
          break;

        case 'selectBillingZone':
          response = this.handleSelectBillingZone(args);
          this.emitKatuqToolEvent('selectBillingZone', response.data, response.success, response.message);
          break;

        case 'configureShipping':
          response = this.handleConfigureShipping(args);
          this.emitKatuqToolEvent('configureShipping', response.data, response.success, response.message);
          break;

        case 'getShippingOptions':
          response = this.handleGetShippingOptions(args);
          this.emitKatuqToolEvent('getShippingOptions', response.data, response.success, response.message);
          break;

        case 'selectShippingOption':
          response = this.handleSelectShippingOption(args);
          this.emitKatuqToolEvent('selectShippingOption', response.data, response.success, response.message);
          break;

        case 'createSphereVisual':
          response = this.handleCreateSphereVisual(args);
          this.emitKatuqToolEvent('createSphereVisual', response.data, response.success, response.message);
          break;

        case 'showSphereProgress':
          response = this.handleShowSphereProgress(args);
          this.emitKatuqToolEvent('showSphereProgress', response.data, response.success, response.message);
          break;

        case 'createSphereCelebration':
          response = this.handleCreateSphereCelebration(args);
          this.emitKatuqToolEvent('createSphereCelebration', response.data, response.success, response.message);
          break;

        case 'showSphereNotification':
          response = this.handleShowSphereNotification(args);
          this.emitKatuqToolEvent('showSphereNotification', response.data, response.success, response.message);
          break;

        case 'validateCoupon':
          response = await this.handleValidateCoupon(args);
          this.emitKatuqToolEvent('validateCoupon', response.data, response.success, response.message);
          break;

        // === HERRAMIENTAS DE INVENTARIO - Delegadas al servicio especializado ===
        case 'getInventoryStatus':
          response = await this.delegateToInventoryTools('getInventoryStatus', args);
          this.emitKatuqToolEvent('getInventoryStatus', response.data, response.success, response.message);
          break;

        case 'searchInventoryByCategory':
          response = await this.delegateToInventoryTools('searchInventoryByCategory', args);
          this.emitKatuqToolEvent('searchInventoryByCategory', response.data, response.success, response.message);
          break;

        case 'getLowStockAlerts':
          response = await this.delegateToInventoryTools('getLowStockAlerts', args);
          this.emitKatuqToolEvent('getLowStockAlerts', response.data, response.success, response.message);
          break;

        case 'getInventoryReport':
          response = await this.delegateToInventoryTools('getInventoryReport', args);
          this.emitKatuqToolEvent('getInventoryReport', response.data, response.success, response.message);
          break;

        case 'checkProductAvailability':
          response = await this.delegateToInventoryTools('checkProductAvailability', args);
          this.emitKatuqToolEvent('checkProductAvailability', response.data, response.success, response.message);
          break;

        case 'getInventoryMovements':
          response = await this.delegateToInventoryTools('getInventoryMovements', args);
          this.emitKatuqToolEvent('getInventoryMovements', response.data, response.success, response.message);
          break;

        case 'getCategoryInventorySummary':
          response = await this.delegateToInventoryTools('getCategoryInventorySummary', args);
          this.emitKatuqToolEvent('getCategoryInventorySummary', response.data, response.success, response.message);
          break;

        case 'getWarehouseInventoryComparison':
          response = await this.delegateToInventoryTools('getWarehouseInventoryComparison', args);
          this.emitKatuqToolEvent('getWarehouseInventoryComparison', response.data, response.success, response.message);
          break;

        case 'getInventoryTrends':
          response = await this.delegateToInventoryTools('getInventoryTrends', args);
          this.emitKatuqToolEvent('getInventoryTrends', response.data, response.success, response.message);
          break;

        case 'quickSearchProducts':
          response = await this.delegateToInventoryTools('quickSearchProducts', args);
          this.emitKatuqToolEvent('quickSearchProducts', response.data, response.success, response.message);
          break;

        default:
          console.warn(`❌ Herramienta no reconocida: ${name}`);
          response = {
            success: false,
            error: `Herramienta no reconocida: ${name}`
          };
          this.emitKatuqToolEvent(name, null, false, `Herramienta no reconocida: ${name}`);
          break;
      }

      return response;
    } catch (error) {
      console.error(`❌ Error ejecutando herramienta ${name}:`, error);
      const errorResponse = {
        success: false,
        error: `Error ejecutando ${name}: ${error}`
      };
      this.emitKatuqToolEvent(name, null, false, `Error ejecutando ${name}: ${error}`);
      return errorResponse;
    }
  }

  // Método para emitir eventos de herramientas de Katuq
  private emitKatuqToolEvent(toolName: string, data?: any, success: boolean = true, message?: string): void {
    const event: KatuqToolEvent = {
      toolName,
      stepName: this.getCurrentStepName(),
      data,
      success,
      message
    };
    this.katuqToolEventSubject.next(event);
  }

  /**
   * Delega las herramientas de inventario al servicio especializado
   */
  private async delegateToInventoryTools(toolName: string, args: any): Promise<DemoResponse> {
    try {
      // Sincronizar estado con el servicio de inventario
      this.inventoryToolsService.setBodegaSeleccionada(this.bodegaSeleccionada);
      this.inventoryToolsService.setProductosCatalogo(this.productosCatalogo);
      this.inventoryToolsService.setEmpresaActual(this.empresaActual);

      // Llamar al método correspondiente en el servicio de inventario
      let inventoryResponse: InventoryToolResponse;
      
      switch (toolName) {
        case 'getInventoryStatus':
          inventoryResponse = await this.inventoryToolsService.getInventoryStatus(args);
          break;
        case 'searchInventoryByCategory':
          inventoryResponse = await this.inventoryToolsService.searchInventoryByCategory(args);
          break;
        case 'getLowStockAlerts':
          inventoryResponse = await this.inventoryToolsService.getLowStockAlerts(args);
          break;
        case 'getInventoryReport':
          inventoryResponse = await this.inventoryToolsService.getInventoryReport(args);
          break;
        case 'checkProductAvailability':
          inventoryResponse = await this.inventoryToolsService.checkProductAvailability(args);
          break;
        case 'getInventoryMovements':
          inventoryResponse = await this.inventoryToolsService.getInventoryMovements(args);
          break;
        case 'getCategoryInventorySummary':
          inventoryResponse = await this.inventoryToolsService.getCategoryInventorySummary(args);
          break;
        case 'getWarehouseInventoryComparison':
          inventoryResponse = await this.inventoryToolsService.getWarehouseInventoryComparison(args);
          break;
        case 'getInventoryTrends':
          inventoryResponse = await this.inventoryToolsService.getInventoryTrends(args);
          break;
        case 'quickSearchProducts':
          inventoryResponse = await this.inventoryToolsService.quickSearchProducts(args);
          break;
        default:
          throw new Error(`Herramienta de inventario no reconocida: ${toolName}`);
      }

      // Convertir respuesta del servicio de inventario al formato DemoResponse
      return {
        success: inventoryResponse.success,
        data: inventoryResponse.data,
        message: inventoryResponse.message,
        error: inventoryResponse.error
      };
    } catch (error) {
      console.error(`Error delegando herramienta ${toolName}:`, error);
      return {
        success: false,
        message: `Error ejecutando herramienta de inventario: ${toolName}`,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // === HERRAMIENTAS DE GESTIÓN DE BODEGAS ===

  /**
   * Maneja la lista de bodegas disponibles
   */
  private async handleListWarehouses(args: any): Promise<DemoResponse> {
    console.log('🏭 === INICIO: handleListWarehouses ===');
    console.log('🏭 Argumentos recibidos:', args);
    
    try {
      console.log('🏭 Intentando obtener bodegas del sistema real...');
      const realWarehouses = await this.bodegaService.getBodegas().toPromise();
      console.log('🏭 Respuesta de bodegaService.getBodegas():', realWarehouses);
      
      if (realWarehouses && Array.isArray(realWarehouses) && realWarehouses.length > 0) {
        console.log(`🏭 ✅ Se encontraron ${realWarehouses.length} bodegas reales`);
        
        // Mapear bodegas reales al formato esperado
        const mappedWarehouses = realWarehouses.map((bodega, index) => {
          console.log(`🏭 Mapeando bodega ${index + 1}:`, bodega);
          
          const bodegaMapeada = {
            id: bodega.idBodega || bodega.id || `BOD-${index + 1}`,
            name: bodega.nombre || bodega.name || `Bodega ${index + 1}`,
            location: bodega.direccion || bodega.direccionCompleta || bodega.location || 'Ubicación no especificada',
            capacity: bodega.capacidad || bodega.capacity || 'Capacidad no especificada',
            status: bodega.estado || bodega.status || 'Activa'
          };
          
          console.log(`🏭 Bodega mapeada ${index + 1}:`, bodegaMapeada);
          return bodegaMapeada;
        });
        
        console.log('🏭 Bodegas mapeadas finales:', mappedWarehouses);
        
        this.pasoActual = 1;
        this.updateVisualStep('bodega');
        this.updateOrderStatus();
        
        console.log('🏭 === FIN: handleListWarehouses (ÉXITO) ===');
        
        // Preparar respuesta con información detallada de bodegas
        const bodegasFormateadas = mappedWarehouses.map(b => ({
          id: b.id,
          nombre: b.name,
          ubicacion: b.location,
          capacidad: b.capacity || 'No especificada',
          estado: b.status || 'Activa',
          productos: 'Por cargar'
        }));

        return {
      success: true,
      data: {
            warehouses: bodegasFormateadas,
            total: bodegasFormateadas.length,
            message: `Se encontraron ${bodegasFormateadas.length} bodegas disponibles`
          },
          message: `Se encontraron ${bodegasFormateadas.length} bodegas disponibles en el sistema. Selecciona una con selectWarehouse para ver sus productos.`,
      visualUpdate: {
        stepName: 'bodega',
            progress: 20, 
            nextActions: [`Selecciona una bodega con selectWarehouse`] 
          }
        };
        
      } else {
        console.log('🏭 ⚠️ No se encontraron bodegas reales o respuesta inválida');
        console.log('🏭 Usando bodegas demo como fallback...');
        
        // Fallback a bodegas demo
        const demoWarehouses = this.generateMockWarehouses();
        console.log('🏭 Bodegas demo generadas:', demoWarehouses);
        
        this.pasoActual = 1;
        this.updateVisualStep('bodega');
        this.updateOrderStatus();
        
        console.log('🏭 === FIN: handleListWarehouses (FALLBACK) ===');
        
        return {
          success: true,
          data: { warehouses: demoWarehouses },
          message: `Se encontraron ${demoWarehouses.length} bodegas demo (modo fallback)`,
          visualUpdate: { 
            stepName: 'bodega', 
            progress: 20, 
            nextActions: [`Selecciona una bodega con selectWarehouse`] 
          }
        };
      }
      
    } catch (error: any) {
      console.error('🏭 ❌ Error obteniendo bodegas reales:', error);
      console.log('🏭 Usando bodegas demo como fallback por error...');
      
      // Fallback por error
      const demoWarehouses = this.generateMockWarehouses();
      console.log('🏭 Bodegas demo generadas por error:', demoWarehouses);
      
      this.pasoActual = 1;
      this.updateVisualStep('bodega');
      this.updateOrderStatus();
      
      console.log('🏭 === FIN: handleListWarehouses (ERROR + FALLBACK) ===');
      
      return {
        success: true,
        data: { warehouses: demoWarehouses },
        message: `Se encontraron ${demoWarehouses.length} bodegas demo (modo fallback por error)`,
        visualUpdate: { 
          stepName: 'bodega', 
          progress: 20, 
          nextActions: [`Selecciona una bodega con selectWarehouse`] 
        }
      };
    }
  }

  /**
   * Maneja la selección de una bodega
   */
  private async handleSelectWarehouse(args: any): Promise<DemoResponse> {
    console.log('🏭 handleSelectWarehouse llamado con args:', args);
    const { warehouseId } = args;

    if (!warehouseId) {
      return {
        success: false,
        message: 'Se requiere el ID de la bodega a seleccionar',
        error: 'Parámetro warehouseId es obligatorio'
      };
    }

    try {
      // Usar el BodegaService real para obtener la bodega específica
      const realWarehouses = await this.bodegaService.getBodegas().toPromise();
      const selectedWarehouse = realWarehouses?.find(b => 
        (b.idBodega === warehouseId) || (b.id === warehouseId)
      );

      if (!selectedWarehouse) {
      return {
        success: false,
        message: `No se encontró la bodega con ID: ${warehouseId}`,
          error: 'Bodega no encontrada',
          visualUpdate: {
            stepName: 'bodega',
            progress: 5,
            nextActions: ['Usa listWarehouses para ver las bodegas disponibles']
          }
        };
      }

      // Guardar la bodega seleccionada
      this.bodegaSeleccionada = {
        idBodega: selectedWarehouse.idBodega || selectedWarehouse.id,
        nombre: selectedWarehouse.nombre,
        direccion: selectedWarehouse.direccion || selectedWarehouse.direccionCompleta || 'Dirección no especificada'
      };

      // Cargar productos reales de la bodega seleccionada usando InventarioService
      try {
        console.log('📦 Cargando productos reales de la bodega:', this.bodegaSeleccionada.idBodega);
        
        let productosReales: any[] = [];
        
        // Intentar primero con getProductosBodega
        try {
          console.log('📦 Intentando con getProductosBodega...');
          productosReales = await this.inventarioService.getProductosBodega(this.bodegaSeleccionada.idBodega).toPromise() || [];
          console.log('📦 Respuesta de getProductosBodega:', productosReales);
        } catch (error) {
          console.log('⚠️ getProductosBodega falló, intentando con obtenerInventarioPorBodega...');
          try {
            const inventario = await this.inventarioService.obtenerInventarioPorBodega(this.bodegaSeleccionada.idBodega).toPromise();
            console.log('📦 Respuesta de obtenerInventarioPorBodega:', inventario);
            
            // Extraer productos del inventario
            if (inventario && inventario.productos) {
              productosReales = inventario.productos;
            } else if (inventario && Array.isArray(inventario)) {
              productosReales = inventario;
            } else if (inventario && inventario.items) {
              productosReales = inventario.items;
            }
          } catch (error2) {
            console.log('⚠️ obtenerInventarioPorBodega también falló:', error2);
            productosReales = [];
          }
        }
        
        if (productosReales && Array.isArray(productosReales) && productosReales.length > 0) {
          console.log(`📦 Encontrados ${productosReales.length} productos en la bodega`);
          
          // Convertir productos reales al formato esperado usando la misma lógica que order-tools-registrar
          this.productosCatalogo = productosReales.map((item: any) => {
            console.log(`📦 Procesando item de inventario:`, item);
            
            // Extraer el producto del item de inventario
            const producto = item.producto || item;
            
            // Mapear usando la misma lógica que order-tools-registrar
            const productoMapeado = {
              ...producto,
              disponibilidad: {
                ...producto?.disponibilidad,
                cantidadDisponible: item.cantidad || producto?.disponibilidad?.cantidadDisponible || 0,
              },
              bodegaId: item.bodegaId || this.bodegaSeleccionada.idBodega,
            };
            
            console.log(`📦 Producto mapeado:`, {
              cd: productoMapeado.cd,
              titulo: productoMapeado.crearProducto?.titulo,
              precio: productoMapeado.precio?.precioUnitarioConIva,
              stock: productoMapeado.disponibilidad?.cantidadDisponible,
              categoria: productoMapeado.crearProducto?.categorias?.label || 'Sin categoría'
            });
            return productoMapeado;
          });
          
          console.log(`✅ Se cargaron ${this.productosCatalogo.length} productos reales de la bodega`);
          console.log('📦 Primeros 3 productos del catálogo:', this.productosCatalogo.slice(0, 3));
          
        } else {
          console.log('⚠️ No se encontraron productos en la bodega o respuesta inválida:', productosReales);
          console.log('🔄 Usando productos demo como fallback');
          this.productosCatalogo = this.generateMockProducts(20); // Menos productos demo
        }
        
      } catch (error: any) {
        console.error('❌ Error cargando productos reales:', error);
        console.log('🔄 Usando productos demo como fallback');
        this.productosCatalogo = this.generateMockProducts(20);
      }

    this.pasoActual = 2;

    // Actualizar estado visual
    this.updateVisualStep('productos');
    this.updateOrderStatus();

    // Mostrar notificación
    this.showToast(`Bodega "${this.bodegaSeleccionada.nombre}" seleccionada correctamente`, 'Bodega Configurada');

    const response: DemoResponse = {
      success: true,
      data: {
        selectedWarehouse: {
          id: this.bodegaSeleccionada.idBodega,
          name: this.bodegaSeleccionada.nombre,
          address: this.bodegaSeleccionada.direccion
        },
        productsLoaded: this.productosCatalogo.length,
        catalogPreview: this.productosCatalogo.slice(0, 3).map(p => ({
          id: p.cd,
          name: p.crearProducto?.titulo,
          price: p.precio?.precioUnitarioConIva
        }))
      },
      message: `¡Perfecto! Bodega "${this.bodegaSeleccionada.nombre}" seleccionada. Se cargaron ${this.productosCatalogo.length} productos disponibles.`,
      visualUpdate: {
        stepName: 'productos',
        progress: 25,
        nextActions: [
          'Busca productos con searchProductsAdvanced',
          'Agrega productos directamente con quickAddToCart'
        ]
      }
    };

      console.log('📤 Bodega real seleccionada:', response);
    return response;

    } catch (error: any) {
      console.error('❌ Error seleccionando bodega real:', error);
      
      // Fallback a datos demo si hay error
      const mockWarehouses = [
        { idBodega: 'BOD001', nombre: 'Bodega Principal Bogotá', direccion: 'Av. El Dorado 123' },
        { idBodega: 'BOD002', nombre: 'Bodega Norte', direccion: 'Calle 127 45-67' },
        { idBodega: 'BOD003', nombre: 'Bodega Sur', direccion: 'Av. Boyacá 234-56' }
      ];

      this.bodegaSeleccionada = mockWarehouses.find(b => b.idBodega === warehouseId);

      if (!this.bodegaSeleccionada) {
        return {
          success: false,
          message: `No se encontró la bodega con ID: ${warehouseId} (modo demo)`,
          error: 'Bodega no encontrada',
          visualUpdate: {
            stepName: 'bodega',
            progress: 5,
            nextActions: ['Usa listWarehouses para ver las bodegas disponibles']
          }
        };
      }

      // Continuar con datos demo
      this.productosCatalogo = this.generateMockProducts(50);
      this.pasoActual = 2;
      this.updateVisualStep('productos');
      this.updateOrderStatus();

      return {
        success: true,
        data: {
          selectedWarehouse: {
            id: this.bodegaSeleccionada.idBodega,
            name: this.bodegaSeleccionada.nombre,
            address: this.bodegaSeleccionada.direccion
          },
          productsLoaded: this.productosCatalogo.length,
          catalogPreview: this.productosCatalogo.slice(0, 3).map(p => ({
            id: p.cd,
            name: p.crearProducto?.titulo,
            price: p.precio?.precioUnitarioConIva
          }))
        },
        message: `¡Perfecto! Bodega "${this.bodegaSeleccionada.nombre}" seleccionada (modo demo). Se cargaron ${this.productosCatalogo.length} productos disponibles.`,
        visualUpdate: {
          stepName: 'productos',
          progress: 25,
          nextActions: [
            'Busca productos con searchProductsAdvanced',
            'Agrega productos directamente con quickAddToCart'
          ]
        }
      };
    }
  }

  /**
   * Genera productos de demostración
   */
  private generateMockProducts(count: number): Producto[] {
    const categories = ['Electrónicos', 'Ropa', 'Hogar', 'Deportes', 'Libros'];
    const brands = ['Samsung', 'Apple', 'Nike', 'Adidas', 'Sony', 'LG'];
    const products: Producto[] = [];

    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      
      products.push({
        cd: `PROD${i.toString().padStart(3, '0')}`,
        crearProducto: {
          titulo: `${brand} ${category} Producto ${i}`,
          descripcion: `Descripción del producto ${i} de la categoría ${category}`
        },
        precio: {
          precioUnitarioConIva: Math.floor(Math.random() * 500000) + 50000,
          precioUnitarioSinIva: Math.floor(Math.random() * 400000) + 40000
        },
        disponibilidad: {
          cantidadDisponible: Math.floor(Math.random() * 100) + 1
        },
        identificacion: {
          referencia: `REF-${i}`,
          codigoBarras: `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
          marca: brand
        },
        exposicion: {
          etiquetas: [category]
        },
        categorias: {
          label: category
        }
      } as Producto);
    }

    return products;
  }

  // === HERRAMIENTAS DE GESTIÓN DE PRODUCTOS ===

  /**
   * Maneja la búsqueda avanzada de productos
   */
  private async handleSearchProductsAdvanced(args: any): Promise<DemoResponse> {
    console.log('🔍 ==================== SEARCH PRODUCTS START ====================');
    console.log('🔍 [SEARCH] Argumentos recibidos:', JSON.stringify(args, null, 2));
    console.log('🔍 [SEARCH] Bodega seleccionada:', this.bodegaSeleccionada);
    console.log('🔍 [SEARCH] ID Bodega:', this.bodegaSeleccionada?.idBodega);
    console.log('🔍 [SEARCH] Productos en catálogo actual:', this.productosCatalogo?.length || 0);

    const { query, category, minPrice, maxPrice, minStock, sortBy, limit = 10 } = args;
    console.log('🔍 [SEARCH] Query extraído:', query);
    console.log('🔍 [SEARCH] Limit:', limit);

    if (!this.bodegaSeleccionada) {
      console.log('🔍 ❌ No hay bodega seleccionada');
      return {
        success: false,
        message: 'Debes seleccionar una bodega primero usando selectWarehouse',
        error: 'Bodega no seleccionada'
      };
    }

    try {
      let productosFiltrados: any[] = [];
      
      if (query && query.trim()) {
        console.log('🔍 🔎 Búsqueda con query:', query);
        
        // Intentar búsqueda real en el inventario usando la misma lógica que order-tools-registrar
        try {
          console.log('🔍 Intentando búsqueda real en inventario...');
          const inventarioReal = await this.inventarioService.obtenerInventarioPorBodega(this.bodegaSeleccionada.idBodega).toPromise();
          console.log('🔍 Respuesta de obtenerInventarioPorBodega:', inventarioReal);
          
          if (inventarioReal && Array.isArray(inventarioReal) && inventarioReal.length > 0) {
            console.log(`🔍 ✅ Encontrados ${inventarioReal.length} productos en inventario real`);
            
            // Filtrar por query usando la misma lógica que order-tools-registrar
            productosFiltrados = inventarioReal.filter((item: any) => {
              const producto = item.producto || item;
              const titulo = (producto.crearProducto?.titulo || producto.nombre || producto.titulo || '').toLowerCase();
              const codigoBarras = (producto.identificacion?.codigoBarras || producto.codigoBarras || '').toLowerCase();
              const referencia = (producto.identificacion?.referencia || producto.referencia || '').toLowerCase();
              const queryLower = query.toLowerCase();
              
              return titulo.includes(queryLower) || 
                     codigoBarras.includes(queryLower) || 
                     referencia.includes(queryLower);
            });
            
            console.log(`🔍 🔍 Filtrados ${productosFiltrados.length} productos por query "${query}"`);
            
          } else {
            console.log('🔍 ⚠️ No se encontraron productos en inventario real, usando catálogo local');
            // Fallback a búsqueda local
            productosFiltrados = this.productosCatalogo.filter(producto => {
              const titulo = (producto.crearProducto?.titulo || '').toLowerCase();
              const codigoBarras = (producto.identificacion?.codigoBarras || '').toLowerCase();
              const referencia = (producto.identificacion?.referencia || '').toLowerCase();
              const queryLower = query.toLowerCase();
              
              return titulo.includes(queryLower) || 
                     codigoBarras.includes(queryLower) || 
                     referencia.includes(queryLower);
            });
          }
          
        } catch (error) {
          console.log('🔍 ⚠️ Error en búsqueda real, usando catálogo local:', error);
          // Fallback a búsqueda local
          productosFiltrados = this.productosCatalogo.filter(producto => {
            const titulo = (producto.crearProducto?.titulo || '').toLowerCase();
            const codigoBarras = (producto.identificacion?.codigoBarras || '').toLowerCase();
            const referencia = (producto.identificacion?.referencia || '').toLowerCase();
            const queryLower = query.toLowerCase();
            
            return titulo.includes(queryLower) || 
                   codigoBarras.includes(queryLower) || 
                   referencia.includes(queryLower);
          });
        }
        
      } else {
        console.log('🔍 📋 Sin query, mostrando todos los productos del catálogo');
        productosFiltrados = [...this.productosCatalogo];
      }

      // Aplicar filtros adicionales
      console.log('🔍 Aplicando filtros adicionales...');
      
      if (category) {
        console.log('🔍 Filtrando por categoría:', category);
        productosFiltrados = productosFiltrados.filter(p => 
          ((p.crearProducto as any)?.categorias?.label || '').toLowerCase().includes(category.toLowerCase())
        );
      }
      
      if (minPrice !== undefined) {
        console.log('🔍 Filtrando por precio mínimo:', minPrice);
        productosFiltrados = productosFiltrados.filter(p => 
          (p.precio?.precioUnitarioConIva || 0) >= minPrice
        );
      }
      
      if (maxPrice !== undefined) {
        console.log('🔍 Filtrando por precio máximo:', maxPrice);
        productosFiltrados = productosFiltrados.filter(p => 
          (p.precio?.precioUnitarioConIva || 0) <= maxPrice
        );
      }
      
      if (minStock !== undefined) {
        console.log('🔍 Filtrando por stock mínimo:', minStock);
        productosFiltrados = productosFiltrados.filter(p => 
          (p.disponibilidad?.cantidadDisponible || 0) >= minStock
        );
      }

      // Aplicar ordenamiento
      if (sortBy) {
        console.log('🔍 Aplicando ordenamiento:', sortBy);
        switch (sortBy) {
          case 'price-asc':
            productosFiltrados.sort((a, b) => (a.precio?.precioUnitarioConIva || 0) - (b.precio?.precioUnitarioConIva || 0));
            break;
          case 'price-desc':
            productosFiltrados.sort((a, b) => (b.precio?.precioUnitarioConIva || 0) - (a.precio?.precioUnitarioConIva || 0));
            break;
          case 'name':
            productosFiltrados.sort((a, b) => (a.crearProducto?.titulo || '').localeCompare(b.crearProducto?.titulo || ''));
            break;
        }
      }

      // Aplicar límite
      if (limit && productosFiltrados.length > limit) {
        console.log(`🔍 Aplicando límite de ${limit} resultados`);
        productosFiltrados = productosFiltrados.slice(0, limit);
      }

      console.log(`🔍 ✅ Búsqueda completada: ${productosFiltrados.length} productos encontrados`);
      console.log('🔍 Primeros 3 productos encontrados:', productosFiltrados.slice(0, 3));

      this.pasoActual = 3;
      this.updateVisualStep('productos');
      this.updateOrderStatus();

      // Preparar respuesta con información detallada de productos
      console.log('🔍 [SEARCH] ========== FORMATEANDO RESULTADOS ==========');
      console.log('🔍 [SEARCH] Productos filtrados antes de formatear:', productosFiltrados.length);

      const productosFormateados = productosFiltrados.map((p, index) => {
        const formatted = {
          id: p.cd,
          nombre: p.crearProducto?.titulo || p.nombre || 'Sin nombre',
          descripcion: p.crearProducto?.descripcion || p.descripcion || 'Sin descripción',
          categoria: p.crearProducto?.categorias?.label || p.categorias?.label || 'Sin categoría',
          precio: p.precio?.precioUnitarioConIva || p.precioUnitario || 0,
          stock: p.disponibilidad?.cantidadDisponible || p.stock || 0,
          bodega: this.bodegaSeleccionada.nombre
        };

        if (index < 3) {
          console.log(`🔍 [SEARCH] Producto ${index + 1}:`, JSON.stringify(formatted, null, 2));
        }

        return formatted;
      });

      console.log('🔍 [SEARCH] Total productos formateados:', productosFormateados.length);

      const response = {
        success: true,
        data: {
          products: productosFormateados,
          total: productosFiltrados.length,
          query: query || 'Todos los productos',
          filters: { category, minPrice, maxPrice, minStock, sortBy, limit },
          warehouse: this.bodegaSeleccionada.nombre
        },
        message: `Se encontraron ${productosFiltrados.length} productos${query ? ` para "${query}"` : ''} en ${this.bodegaSeleccionada.nombre}`,
        visualUpdate: {
          stepName: 'productos',
          progress: 40,
          nextActions: ['Agrega productos al carrito con addToCart']
        }
      };

      console.log('🔍 [SEARCH] Response completo:', JSON.stringify(response, null, 2));
      console.log('🔍 [SEARCH] ==================== SEARCH PRODUCTS END ====================');

      return response;

    } catch (error: any) {
      console.error('🔍 ❌ Error en búsqueda avanzada:', error);
      
      console.log('🔍 === FIN: handleSearchProductsAdvanced (ERROR) ===');
      
      return {
        success: false,
        message: 'Error en la búsqueda de productos',
        error: error.message,
        visualUpdate: { 
          stepName: 'productos', 
          progress: 30, 
          nextActions: ['Reintenta la búsqueda'] 
        }
      };
    }
  }

  /**
   * Búsqueda local como fallback
   */
  private handleSearchProductsAdvancedLocal(args: any): DemoResponse {
    console.log('🔍 Búsqueda local como fallback');
    const { query, category, minPrice, maxPrice, minStock, sortBy, limit = 10 } = args;

    let results = [...this.productosCatalogo];
    const appliedFilters: string[] = [];

    // Filtro por búsqueda de texto
    if (query) {
      const q = query.toLowerCase().trim();
      results = results.filter(p => {
        const titulo = p.crearProducto?.titulo?.toLowerCase() || '';
        const marca = p.identificacion?.marca?.toLowerCase() || '';
        const referencia = p.identificacion?.referencia?.toLowerCase() || '';
        return titulo.includes(q) || marca.includes(q) || referencia.includes(q);
      });
      appliedFilters.push(`búsqueda local: "${query}"`);
    }

    // Filtro por categoría
    if (category) {
      results = results.filter(p => {
        const etiquetas = p.exposicion?.etiquetas || [];
        const categoriaNombre = p.categorias?.label?.toLowerCase() || '';
        return etiquetas.includes(category) || categoriaNombre.includes(category.toLowerCase());
      });
      appliedFilters.push(`categoría: "${category}"`);
    }

    // Filtro por precio
    if (minPrice !== undefined) {
      results = results.filter(p => (p.precio?.precioUnitarioConIva || 0) >= minPrice);
      appliedFilters.push(`precio mín: $${minPrice.toLocaleString()}`);
    }
    if (maxPrice !== undefined) {
      results = results.filter(p => (p.precio?.precioUnitarioConIva || 0) <= maxPrice);
      appliedFilters.push(`precio máx: $${maxPrice.toLocaleString()}`);
    }

    // Filtro por stock
    if (minStock !== undefined) {
      results = results.filter(p => (p.disponibilidad?.cantidadDisponible || 0) >= minStock);
      appliedFilters.push(`stock mín: ${minStock}`);
    }

    // Ordenamiento
    if (sortBy) {
      switch (sortBy) {
        case 'name':
          results.sort((a, b) => (a.crearProducto?.titulo || '').localeCompare(b.crearProducto?.titulo || ''));
          break;
        case 'price-asc':
          results.sort((a, b) => (a.precio?.precioUnitarioConIva || 0) - (b.precio?.precioUnitarioConIva || 0));
          break;
        case 'price-desc':
          results.sort((a, b) => (b.precio?.precioUnitarioConIva || 0) - (a.precio?.precioUnitarioConIva || 0));
          break;
      }
      appliedFilters.push(`ordenado por ${sortBy}`);
    }

    const totalFound = results.length;
    const limitedResults = results.slice(0, Math.min(limit, 20));

    const productList = limitedResults.map(p => ({
      id: p.cd,
      nombre: p.crearProducto?.titulo,
      precio: p.precio?.precioUnitarioConIva || 0,
      disponible: p.disponibilidad?.cantidadDisponible || 0,
      categoria: p.exposicion?.etiquetas?.[0] || p.categorias?.label || 'Sin categoría',
      referencia: p.identificacion?.referencia || '',
      marca: p.identificacion?.marca || '',
      precioFormateado: `$${(p.precio?.precioUnitarioConIva || 0).toLocaleString()}`
    }));

    if (totalFound === 0) {
      return {
        success: false,
        message: `No se encontraron productos${appliedFilters.length > 0 ? ` con ${appliedFilters.join(', ')}` : ''}`,
        error: 'Sin resultados',
        data: { appliedFilters, totalInCatalog: this.productosCatalogo.length }
      };
    }

    const response: DemoResponse = {
      success: true,
      data: {
        products: productList,
        totalFound,
        appliedFilters,
        searchQuery: query,
        bodega: this.bodegaSeleccionada.nombre
      },
      message: `Se encontraron ${totalFound} productos${appliedFilters.length > 0 ? ` con ${appliedFilters.join(', ')}` : ''}`,
      visualUpdate: {
        stepName: 'productos',
        progress: 40,
        nextActions: [
          'Usa addToCart para agregar productos al carrito',
          'Usa quickAddToCart para agregar productos rápidamente'
        ]
      }
    };

    console.log('📤 Resultados de búsqueda local:', response);
    return response;
  }

  /**
   * Maneja la adición de productos al carrito
   */
  private async handleAddToCart(args: any): Promise<DemoResponse> {
    console.log('🛒 === INICIO: handleAddToCart ===');
    console.log('🛒 Argumentos recibidos:', args);
    console.log('🛒 Bodega seleccionada:', this.bodegaSeleccionada);
    console.log('🛒 Productos en catálogo:', this.productosCatalogo?.length || 0);
    console.log('🛒 Carrito actual:', this.pedidoEnProgreso.carrito?.length || 0);
    
    const { productId, quantity = 1 } = args;

    if (!this.bodegaSeleccionada) {
      console.log('🛒 ❌ No hay bodega seleccionada');
      return {
        success: false,
        message: 'Debes seleccionar una bodega primero usando selectWarehouse',
        error: 'Bodega no seleccionada'
      };
    }

    if (!productId) {
      console.log('🛒 ❌ No se especificó el ID del producto');
      return {
        success: false,
        message: 'Se requiere el ID del producto a agregar',
        error: 'ID de producto faltante'
      };
    }

    try {
      console.log('🛒 🔍 Buscando producto con ID:', productId);
      
             // Buscar el producto en el catálogo usando la misma lógica que order-tools-registrar
      const productoEncontrado = this.productosCatalogo.find(p => 
        p.cd === productId || (p as any).id === productId || (p as any).codigo === productId
      );

      if (!productoEncontrado) {
        console.log('🛒 ❌ Producto no encontrado en el catálogo');
        console.log('🛒 Productos disponibles:', this.productosCatalogo.map(p => ({ id: p.cd, nombre: p.crearProducto?.titulo })));
        
      return {
        success: false,
          message: `No se encontró el producto con ID: ${productId}`,
          error: 'Producto no encontrado',
          visualUpdate: {
            stepName: 'productos',
            progress: 35,
            nextActions: ['Usa searchProductsAdvanced para ver productos disponibles']
          }
        };
      }

      console.log('🛒 ✅ Producto encontrado:', productoEncontrado);
      console.log('🛒 Cantidad solicitada:', quantity);
      console.log('🛒 Stock disponible:', productoEncontrado.disponibilidad?.cantidadDisponible || 0);

      // Verificar stock disponible
      const stockDisponible = productoEncontrado.disponibilidad?.cantidadDisponible || 0;
      if (stockDisponible < quantity) {
        console.log('🛒 ❌ Stock insuficiente');
        return {
          success: false,
          message: `Stock insuficiente. Disponible: ${stockDisponible}, Solicitado: ${quantity}`,
        error: 'Stock insuficiente',
          data: { 
            requested: quantity, 
            available: stockDisponible,
            product: productoEncontrado.crearProducto?.titulo
          }
        };
      }

      // Crear producto para el carrito usando la misma estructura que order-tools-registrar
      const productoParaCarrito: Carrito = {
        producto: productoEncontrado as any,
      configuracion: {
          producto: productoEncontrado as any,
          datosEntrega: null as any,
        preferencias: [],
        adiciones: [],
        tarjetas: []
      },
      cantidad: quantity
    };

      console.log('🛒 📦 Producto preparado para carrito:', productoParaCarrito);

      // Agregar al carrito real del sistema
      try {
        console.log('🛒 🚀 Intentando agregar al carrito real del sistema...');
        await this.cartService.addToCart(productoParaCarrito);
        console.log('🛒 ✅ Producto agregado al carrito real del sistema');
      } catch (error) {
        console.log('🛒 ⚠️ Error agregando al carrito real, usando carrito local:', error);
      }

      // Agregar al carrito local como respaldo
    if (!this.pedidoEnProgreso.carrito) {
      this.pedidoEnProgreso.carrito = [];
    }
      
             // Verificar si el producto ya está en el carrito
       const productoExistente = this.pedidoEnProgreso.carrito.find(item => 
         item.producto?.cd === productId || (item.producto as any)?.id === productId
       );

      if (productoExistente) {
        console.log('🛒 🔄 Producto ya existe en carrito, actualizando cantidad');
        productoExistente.cantidad = (productoExistente.cantidad || 0) + quantity;
        console.log('🛒 Nueva cantidad total:', productoExistente.cantidad);
      } else {
        console.log('🛒 ➕ Agregando nuevo producto al carrito local');
        this.pedidoEnProgreso.carrito.push(productoParaCarrito);
      }

      console.log('🛒 📊 Estado del carrito después de agregar:');
      console.log('🛒 Total de productos:', this.pedidoEnProgreso.carrito.length);
      console.log('🛒 Productos en carrito:', this.pedidoEnProgreso.carrito.map(item => ({
        nombre: item.producto?.crearProducto?.titulo,
        cantidad: item.cantidad,
        precio: item.producto?.precio?.precioUnitarioConIva
      })));

      // Calcular total del carrito
      const totalCarrito = this.pedidoEnProgreso.carrito.reduce((sum, item) => 
        sum + ((item.producto?.precio?.precioUnitarioConIva || 0) * (item.cantidad || 0)), 0
      );

      console.log('🛒 💰 Total del carrito:', totalCarrito);

      // Actualizar estado visual
      this.pasoActual = 4;
    this.updateVisualStep('carrito');
    this.updateOrderStatus();

      console.log('🛒 === FIN: handleAddToCart ===');

      // Preparar información detallada del producto agregado
      const productoInfo = {
        id: productId,
        nombre: productoEncontrado.crearProducto?.titulo || (productoEncontrado as any).nombre || 'Sin nombre',
        descripcion: productoEncontrado.crearProducto?.descripcion || (productoEncontrado as any).descripcion || 'Sin descripción',
        categoria: (productoEncontrado.crearProducto as any)?.categorias?.label || (productoEncontrado as any).categorias?.label || 'Sin categoría',
        cantidad: quantity,
        precio: productoEncontrado.precio?.precioUnitarioConIva || (productoEncontrado as any).precioUnitario || 0,
        precioFormateado: `$${(productoEncontrado.precio?.precioUnitarioConIva || (productoEncontrado as any).precioUnitario || 0).toLocaleString()}`,
        stock: productoEncontrado.disponibilidad?.cantidadDisponible || (productoEncontrado as any).stock || 0,
        bodega: this.bodegaSeleccionada.nombre
      };

      return {
      success: true,
      data: {
          addedProduct: productoInfo,
          cartTotal: totalCarrito,
          cartTotalFormatted: `$${totalCarrito.toLocaleString()}`,
          itemsInCart: this.pedidoEnProgreso.carrito.length,
          cartSummary: this.pedidoEnProgreso.carrito.map(item => ({
            nombre: item.producto?.crearProducto?.titulo || (item.producto as any)?.nombre || 'Sin nombre',
            cantidad: item.cantidad,
            precio: item.producto?.precio?.precioUnitarioConIva || (item.producto as any)?.precioUnitario || 0
          }))
        },
        message: `✅ ${quantity}x ${productoInfo.nombre} agregado al carrito de ${this.bodegaSeleccionada.nombre}`,
      visualUpdate: {
        stepName: 'carrito',
        progress: 50,
          nextActions: ['Continúa agregando productos o usa getCartContents para ver el carrito'] 
        }
      };

    } catch (error: any) {
      console.error('🛒 ❌ Error agregando producto al carrito:', error);
      
      console.log('🛒 === FIN: handleAddToCart (ERROR) ===');
      
      return {
        success: false,
        message: 'Error agregando producto al carrito',
        error: error.message,
        visualUpdate: { 
          stepName: 'productos', 
          progress: 35, 
          nextActions: ['Reintenta agregar el producto'] 
        }
      };
    }
  }

  /**
   * Maneja la adición rápida de productos al carrito
   */
  private async handleQuickAddToCart(args: any): Promise<DemoResponse> {
    console.log('⚡ handleQuickAddToCart llamado con args:', args);
    const { productQuery, quantity = 1, useFirstMatch = false } = args;

    if (!this.bodegaSeleccionada) {
      return {
        success: false,
        message: 'Primero selecciona una bodega',
        error: 'No hay bodega seleccionada'
      };
    }

    // Buscar productos
    const q = productQuery.toLowerCase().trim();
    const results = this.productosCatalogo.filter(p => {
      const titulo = p.crearProducto?.titulo?.toLowerCase() || '';
      const marca = p.identificacion?.marca?.toLowerCase() || '';
      const referencia = p.identificacion?.referencia?.toLowerCase() || '';
      return titulo.includes(q) || marca.includes(q) || referencia.includes(q);
    });

    if (results.length === 0) {
      return {
        success: false,
        message: `No se encontraron productos con "${productQuery}"`,
        error: 'Sin resultados',
        visualUpdate: {
          stepName: 'productos',
          progress: 35,
          nextActions: ['Intenta con otros términos de búsqueda']
        }
      };
    }

    let selectedProduct: Producto;
    
    if (useFirstMatch || results.length === 1) {
      selectedProduct = results[0];
    } else {
      // Mostrar opciones para selección
      const options = results.slice(0, 5).map((p, index) => ({
        option: index + 1,
        id: p.cd,
        name: p.crearProducto?.titulo,
        price: `$${(p.precio?.precioUnitarioConIva || 0).toLocaleString()}`,
        available: p.disponibilidad?.cantidadDisponible || 0
      }));

      return {
        success: false,
        message: `Se encontraron ${results.length} productos. Especifica cuál quieres agregar.`,
        error: 'Múltiples opciones',
        data: { foundProducts: options },
        visualUpdate: {
          stepName: 'productos',
          progress: 35,
          nextActions: ['Usa addToCart con el ID específico del producto que deseas']
        }
      };
    }

    // Usar el método addToCart para agregar el producto seleccionado
    return await this.handleAddToCart({ productId: selectedProduct.cd, quantity });
  }

  /**
   * Maneja la obtención del contenido del carrito
   */
  private handleGetCartContents(args: any): DemoResponse {
    console.log('🛒 handleGetCartContents llamado con args:', args);

    if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
      return {
        success: true,
        message: 'El carrito está vacío',
        data: { items: [], count: 0, total: 0 },
        visualUpdate: {
          stepName: 'productos',
          progress: 25,
          nextActions: ['Busca productos con searchProductsAdvanced', 'Agrega productos con addToCart']
        }
      };
    }

    const cartItems = this.pedidoEnProgreso.carrito.map(item => ({
      id: item.producto?.cd,
      name: item.producto?.crearProducto?.titulo,
      quantity: item.cantidad,
      unitPrice: item.producto?.precio?.precioUnitarioConIva || 0,
      subtotal: (item.producto?.precio?.precioUnitarioConIva || 0) * (item.cantidad || 0),
      available: item.producto?.disponibilidad?.cantidadDisponible || 0
    }));

    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);

    const response: DemoResponse = {
      success: true,
      data: {
        items: cartItems,
        count: cartItems.length,
        total: total,
        totalFormatted: `$${total.toLocaleString()}`,
        warehouse: this.bodegaSeleccionada?.nombre
      },
      message: `Carrito con ${cartItems.length} producto${cartItems.length > 1 ? 's' : ''} por un total de $${total.toLocaleString()}`,
      visualUpdate: {
        stepName: 'carrito',
        progress: 50,
        nextActions: [
          'Continúa con la información del cliente',
          'Agrega más productos si es necesario'
        ]
      }
    };

    console.log('📤 Contenido del carrito:', response);
    return response;
  }

  /**
   * Maneja la obtención de información del inventario
   */
  private handleInventoryInfo(args: any): any {
    console.log('📦 handleInventoryInfo llamado con args:', args);
    const { product_name, category } = args;

    // Simulación de datos del inventario
    const mockInventory = {
      total_products: 1250,
      categories: ['Electrónicos', 'Ropa', 'Hogar', 'Deportes'],
      low_stock_items: 15,
      out_of_stock_items: 3
    };

    if (product_name) {
      console.log('🔍 Buscando producto específico:', product_name);
      const response = {
        success: true,
        message: `Información del producto "${product_name}"`,
        data: {
          product_name,
          stock: Math.floor(Math.random() * 100) + 1,
          price: (Math.random() * 1000 + 50).toFixed(2),
          category: category || 'General'
        }
      };
      console.log('📤 Respuesta para producto específico:', response);
      return response;
    }

    if (category) {
      console.log('📂 Buscando categoría específica:', category);
      const response = {
        success: true,
        message: `Información de la categoría "${category}"`,
        data: {
          category,
          products_count: Math.floor(Math.random() * 200) + 50,
          average_price: (Math.random() * 500 + 100).toFixed(2)
        }
      };
      console.log('📤 Respuesta para categoría específica:', response);
      return response;
    }

    console.log('📊 Devolviendo información general del inventario');
    const response = {
      success: true,
      message: 'Información general del inventario',
      data: mockInventory
    };
    console.log('📤 Respuesta general del inventario:', response);
    return response;
  }

  /**
   * Maneja la obtención del estado del sistema
   */
  private handleSystemStatus(args: any): any {
    console.log('🖥️ handleSystemStatus llamado con args:', args);
    const { include_metrics } = args;

    const systemStatus = {
      status: 'online',
      uptime: '15 días, 8 horas, 32 minutos',
      active_users: Math.floor(Math.random() * 50) + 10,
      last_backup: '2024-01-15 02:30:00',
      system_version: 'Katuq v2.1.0'
    };

    if (include_metrics) {
      console.log('📈 Incluyendo métricas del sistema');
      systemStatus['metrics'] = {
        cpu_usage: `${Math.floor(Math.random() * 30) + 20}%`,
        memory_usage: `${Math.floor(Math.random() * 40) + 30}%`,
        disk_usage: `${Math.floor(Math.random() * 20) + 60}%`,
        network_requests: Math.floor(Math.random() * 1000) + 500
      };
    }

    const response = {
      success: true,
      message: 'Estado del sistema Katuq',
      data: systemStatus
    };
    console.log('📤 Respuesta del estado del sistema:', response);
    return response;
  }

  /**
   * Maneja la búsqueda de productos
   */
  private handleSearchProducts(args: any): any {
    console.log('🔍 handleSearchProducts llamado con args:', args);
    const { query, limit = 10 } = args;

    // Simulación de búsqueda de productos
    const mockProducts = [
      { id: 1, name: 'Laptop HP Pavilion', category: 'Electrónicos', price: 899.99, stock: 15 },
      { id: 2, name: 'Smartphone Samsung Galaxy', category: 'Electrónicos', price: 599.99, stock: 8 },
      { id: 3, name: 'Camiseta Nike Sport', category: 'Ropa', price: 29.99, stock: 45 },
      { id: 4, name: 'Sofá 3 Plazas', category: 'Hogar', price: 1299.99, stock: 3 },
      { id: 5, name: 'Pelota de Fútbol', category: 'Deportes', price: 19.99, stock: 25 }
    ];

    console.log('🔍 Buscando productos con query:', query, 'y límite:', limit);

    // Filtrar productos que coincidan con la búsqueda
    const filteredProducts = mockProducts
      .filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, limit);

    console.log('✅ Productos encontrados:', filteredProducts.length);

    const response = {
      success: true,
      message: `Resultados de búsqueda para "${query}"`,
      data: {
        query,
        total_results: filteredProducts.length,
        products: filteredProducts
      }
    };
    console.log('📤 Respuesta de búsqueda de productos:', response);
    return response;
  }

  // === HERRAMIENTAS DE GESTIÓN DE CLIENTES ===

  private async handleSearchClient(args: any): Promise<DemoResponse> {
    const { document } = args;
    console.log('👤 Buscando cliente con documento:', document);

    if (!document) {
      return {
        success: false,
        message: 'Se requiere el número de documento',
        error: 'Documento requerido'
      };
    }

    try {
      // 🔄 BÚSQUEDA REAL usando MaestroService
      const res: any = await this.maestroService.getClientByDocument({ documento: document }).toPromise();

      if (!res || !res.company) {
        // Cliente no encontrado
        console.log('❌ Cliente no encontrado:', document);
        return {
          success: false,
          message: `Cliente con documento ${document} no encontrado. ¿Deseas crear uno nuevo con quickCreateClient?`,
          error: 'Cliente no existe',
          visualUpdate: {
            stepName: 'cliente',
            progress: 50,
            nextActions: ['Crea un nuevo cliente con quickCreateClient']
          }
        };
      }

      // Cliente encontrado - mapear datos reales
      console.log('✅ Cliente encontrado:', res.nombres_completos);
      const cliente: Cliente = {
        documento: res.documento,
        nombres_completos: res.nombres_completos,
        correo_electronico_comprador: res.correo_electronico_comprador,
        numero_celular_comprador: res.numero_celular_comprador,
        datosFacturacionElectronica: res.datosFacturacionElectronica,
        datosEntrega: res.datosEntrega
      };

      this.pedidoEnProgreso.cliente = cliente;
      this.pasoActual = 4;
      this.updateVisualStep('cliente');
      this.updateOrderStatus();

      return {
        success: true,
        data: { client: cliente },
        message: `✅ Cliente encontrado: ${cliente.nombres_completos}`,
        visualUpdate: {
          stepName: 'cliente',
          progress: 60,
          nextActions: ['Configura envío con configureShipping', 'Configura facturación con configureBilling']
        }
      };
    } catch (error) {
      console.error('❌ Error buscando cliente:', error);
      return {
        success: false,
        message: `Error al buscar cliente: ${error.message || 'Error desconocido'}`,
        error: error.message || 'Error en búsqueda',
        visualUpdate: {
          stepName: 'cliente',
          progress: 50,
          nextActions: ['Intenta de nuevo o crea un nuevo cliente con quickCreateClient']
        }
      };
    }
  }

  private handleQuickCreateClient(args: any): DemoResponse {
    console.log('👤 Creación rápida de cliente con args:', args);
    const { name, document } = args;

    if (!name || name.trim() === '') {
      return {
        success: false,
        message: '❌ Necesito el nombre del cliente. Por ejemplo: "Crea cliente Juan Pérez"',
        error: 'Nombre requerido'
      };
    }

    const newClient: Cliente = {
      nombres_completos: name,
      documento: document || 'TEMP' + Date.now(),
      isDemoClient: true, // NUEVO FLAG para identificar clientes demo
      correo_electronico_comprador: `${name.split(' ')[0].toLowerCase()}@temp.co`,
      numero_celular_comprador: '3001234567',
      indicativo_celular_comprador: '+57',
      tipo_documento_comprador: 'CC'
    } as any;

    this.pedidoEnProgreso.cliente = newClient;
    
    // Auto-completar datos de facturación y envío
    this.pedidoEnProgreso.facturacion = {
      nombres: name,
      documento: document,
      correoElectronico: `${name.split(' ')[0].toLowerCase()}@temp.co`,
      celular: '3001234567',
      direccion: 'Dirección por confirmar',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      pais: 'Colombia',
      tipoDocumento: 'CC',
      codigoPostal: '',
      indicativoCel: '57',
      alias: 'Principal'
    };

    this.pedidoEnProgreso.envio = {
      nombres: name,
      direccionEntrega: 'Dirección por confirmar',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      celular: '3001234567',
      apellidos: '',
      barrio: '',
      codigoPV: '',
      especificacionesInternas: '',
      indicativoCel: '57',
      indicativoOtroNumero: '',
      nombreUnidad: '',
      otroNumero: '',
      pais: 'Colombia',
      observaciones: '',
      alias: 'Principal',
      zonaCobro: ''
    };

    // Update visual step
    this.pasoActual = 4;
    this.updateVisualStep('cliente');
    this.updateOrderStatus();

    return {
      success: true,
      data: { client: newClient },
      message: `✅ Cliente ${name} creado con datos demo. Puedes editar los datos después si es necesario.`,
      visualUpdate: { stepName: 'cliente', progress: 50, nextActions: ['Agrega productos al carrito', 'Configura envío y facturación'] }
    };
  }

  // === HERRAMIENTAS DE PROCESAMIENTO DE PEDIDOS ===

  private handleGetOrderSummary(_args: any): DemoResponse {
    console.log('📋 Generando resumen del pedido');

    if (!this.pedidoEnProgreso.carrito || this.pedidoEnProgreso.carrito.length === 0) {
      return { success: false, message: 'No hay productos en el carrito', error: 'Carrito vacío' };
    }

    const total = this.pedidoEnProgreso.carrito.reduce((sum, item) => 
      sum + ((item.producto?.precio?.precioUnitarioConIva || 0) * (item.cantidad || 0)), 0
    );

    const summary = {
      orderNumber: this.pedidoEnProgreso.nroPedido,
      customer: this.pedidoEnProgreso.cliente?.nombres_completos || 'No configurado',
      warehouse: this.bodegaSeleccionada?.nombre || 'No seleccionada',
      items: this.pedidoEnProgreso.carrito.length,
      total: total,
      totalFormatted: `$${total.toLocaleString()}`,
      readyForPayment: this.isReadyForPayment()
    };

    return {
      success: true,
      data: summary,
      message: `Resumen: ${summary.items} productos por $${total.toLocaleString()} para ${summary.customer}`,
      visualUpdate: { stepName: 'pago', progress: 80, nextActions: ['Valida y procesa la venta'] }
    };
  }

  /**
   * Valida que el pedido tenga todos los datos obligatorios
   */
  private validateOrderData(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ERRORES CRÍTICOS (bloquean venta)
    if (!this.bodegaSeleccionada) errors.push('Bodega no seleccionada');
    if (!this.pedidoEnProgreso.carrito?.length) errors.push('Carrito vacío');
    if (!this.pedidoEnProgreso.cliente?.nombres_completos) errors.push('Nombre de cliente faltante');
    if (!this.pedidoEnProgreso.envio?.direccionEntrega) errors.push('Dirección de envío faltante');
    if (!this.pedidoEnProgreso.envio?.ciudad) errors.push('Ciudad de envío faltante');

    // ADVERTENCIAS (pueden procesarse, datos fueron mock)
    if ((this.pedidoEnProgreso.cliente as any)?.isDemoClient) warnings.push('Cliente creado con datos demo');
    if (!this.pedidoEnProgreso.facturacion?.correoElectronico?.includes('@')) warnings.push('Email mock generado');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private handleValidateOrderBeforePay(_args: any): DemoResponse {
    console.log('✅ Validando pedido antes del pago');

    const validation = {
      warehouse: !!this.bodegaSeleccionada,
      products: this.pedidoEnProgreso.carrito && this.pedidoEnProgreso.carrito.length > 0,
      client: !!this.pedidoEnProgreso.cliente,
      billing: !!this.pedidoEnProgreso.facturacion,
      shipping: !!this.pedidoEnProgreso.envio
    };

    const errors = Object.entries(validation).filter(([_key, value]) => !value).map(([key]) => key);
    const isValid = errors.length === 0;

    return {
      success: true,
      data: { validation, errors, isValid },
      message: isValid ? '✅ Pedido válido y listo para procesar' : `❌ Faltan: ${errors.join(', ')}`,
      visualUpdate: { 
        stepName: isValid ? 'pago' : 'validation', 
        progress: isValid ? 90 : 70, 
        nextActions: isValid ? ['Procesa con processSale'] : ['Completa la información faltante'] 
      }
    };
  }

  private async handleProcessSale(args: any): Promise<DemoResponse> {
    console.log('💳 [PROCESS SALE] Iniciando procesamiento de venta real');
    console.log('💳 [PROCESS SALE] Args recibidos:', args);
    const { paymentMethod = 'Efectivo' } = args;

    // NUEVA VALIDACIÓN DETALLADA
    const validation = this.validateOrderData();
    if (!validation.isValid) {
      console.error('❌ [PROCESS SALE] Validación fallida:', validation.errors);
      return {
        success: false,
        message: `❌ Faltan datos obligatorios: ${validation.errors.join(', ')}`,
        error: 'Datos incompletos',
        visualUpdate: {
          stepName: 'validation',
          progress: 85,
          nextActions: ['Completa los datos faltantes antes de procesar']
        }
      };
    }

    // MOSTRAR ADVERTENCIAS PERO CONTINUAR
    if (validation.warnings.length > 0) {
      console.warn('⚠️ [PROCESS SALE] Advertencias:', validation.warnings.join(', '));
    }

    console.log('💳 [PROCESS SALE] Verificando si está listo para pago...');
    if (!this.isReadyForPayment()) {
      console.error('❌ [PROCESS SALE] Pedido NO está listo para procesar');
      return { success: false, message: 'El pedido no está listo para procesar', error: 'Datos incompletos' };
    }
    console.log('✅ [PROCESS SALE] Pedido listo para procesar');

    try {
      // Preparar el pedido para el sistema real
      console.log('📋 [PROCESS SALE] Llamando a prepareOrderForRealSystem...');
      const orderTemplate = await this.prepareOrderForRealSystem();

      console.log('📋 [PROCESS SALE] Pedido preparado:', JSON.stringify(orderTemplate, null, 2));

      // Procesar la venta usando VentasService real
      console.log('🚀 [PROCESS SALE] Enviando pedido a VentasService.createOrder...');
      const ventaResult = await this.ventasService.createOrder(orderTemplate).toPromise();
      console.log('📥 [PROCESS SALE] Respuesta de VentasService:', JSON.stringify(ventaResult, null, 2));
      
      if (ventaResult && ventaResult.success !== false) {
        console.log('✅ [PROCESS SALE] Venta procesada exitosamente en sistema real');
        console.log('✅ [PROCESS SALE] Resultado completo:', JSON.stringify(ventaResult, null, 2));
        
        // Actualizar el pedido local con la respuesta del sistema
        if (ventaResult.orderNumber) {
          this.pedidoEnProgreso.nroPedido = ventaResult.orderNumber;
        }
        if (ventaResult._id) {
          this.pedidoEnProgreso._id = ventaResult._id;
        }
        
        // Actualizar estado
        this.pedidoEnProgreso.formaDePago = paymentMethod;
        this.pedidoEnProgreso.totalPedididoConDescuento = orderTemplate.totalPedididoConDescuento;
        this.pedidoEnProgreso.estadoPago = EstadoPago.Aprobado;
        this.pedidoEnProgreso.estadoProceso = EstadoProceso.SinProducir;

        // Actualizar a confirmación
        this.pasoActual = 8;
        this.updateVisualStep('confirmacion');
        this.updateOrderStatus();

        // Crear celebración esférica especial
        const celebrationData = {
          celebrationType: 'success',
          particleEffects: true,
          soundEffects: true
        };
        
        const celebrationResponse = this.handleCreateSphereCelebration(celebrationData);

        // Mostrar notificación de éxito
        this.showToast('¡Venta procesada exitosamente en el sistema!', 'Pedido Creado');

        // Preparar nuevo pedido para la siguiente venta
        setTimeout(() => {
          this.inicializarNuevoPedido();
        }, 5000);

        return {
          success: true,
          data: {
            orderNumber: this.pedidoEnProgreso.nroPedido,
            total: orderTemplate.totalPedididoConDescuento,
            totalFormatted: `$${orderTemplate.totalPedididoConDescuento.toLocaleString()}`,
            paymentMethod: paymentMethod,
            customer: this.pedidoEnProgreso.cliente?.nombres_completos,
            celebration: celebrationResponse.data,
            systemResponse: ventaResult
          },
          message: `🎉 ¡Venta procesada en sistema real! Pedido ${this.pedidoEnProgreso.nroPedido} por $${orderTemplate.totalPedididoConDescuento.toLocaleString()}`,
          visualUpdate: { 
            stepName: 'confirmacion', 
            progress: 100, 
            nextActions: ['¡Celebración esférica activada!', 'Sistema listo para nueva venta'] 
          }
        };
        
      } else {
        throw new Error('Error en respuesta del sistema de ventas');
      }
      
    } catch (error: any) {
      console.error('❌ [PROCESS SALE] Error procesando venta real');
      console.error('❌ [PROCESS SALE] Error completo:', error);
      console.error('❌ [PROCESS SALE] Stack trace:', error?.stack);
      console.error('❌ [PROCESS SALE] Mensaje:', error?.message);

      // Fallback a procesamiento local
      console.log('🔄 [PROCESS SALE] Usando procesamiento local como fallback');
      return this.handleProcessSaleLocal(args);
    }
  }

  /**
   * Procesamiento local como fallback
   */
  private handleProcessSaleLocal(args: any): DemoResponse {
    console.log('💳 Procesando venta local como fallback');
    const { paymentMethod = 'Efectivo' } = args;

    const total = this.pedidoEnProgreso.carrito!.reduce((sum, item) => 
      sum + ((item.producto?.precio?.precioUnitarioConIva || 0) * (item.cantidad || 0)), 0
    );

    this.pedidoEnProgreso.formaDePago = paymentMethod;
    this.pedidoEnProgreso.totalPedididoConDescuento = total;
    this.pedidoEnProgreso.estadoPago = EstadoPago.Aprobado;

    // Actualizar a confirmación
    this.pasoActual = 8;
    this.updateVisualStep('confirmacion');
    this.updateOrderStatus();

    // Crear celebración esférica especial
    const celebrationData = {
      celebrationType: 'success',
      particleEffects: true,
      soundEffects: true
    };
    
    const celebrationResponse = this.handleCreateSphereCelebration(celebrationData);

    // Mostrar notificación
    this.showToast('¡Venta completada localmente!', 'Pedido Creado');

    // Preparar nuevo pedido para la siguiente venta
    setTimeout(() => {
      this.inicializarNuevoPedido();
    }, 5000);

    return {
      success: true,
      data: {
        orderNumber: this.pedidoEnProgreso.nroPedido,
        total: total,
        totalFormatted: `$${total.toLocaleString()}`,
        paymentMethod: paymentMethod,
        customer: this.pedidoEnProgreso.cliente?.nombres_completos,
        celebration: celebrationResponse.data
      },
      message: `🎉 ¡Venta completada localmente! Pedido ${this.pedidoEnProgreso.nroPedido} por $${total.toLocaleString()}`,
      visualUpdate: { 
        stepName: 'confirmacion', 
        progress: 100, 
        nextActions: ['¡Celebración esférica activada!', 'Sistema listo para nueva venta'] 
      }
    };
  }

  private handleGetDemoStatus(_args: any): DemoResponse {
    const status = this.orderStatusSubject.value;
    const progress = this.progressSubject.value;

    return {
      success: true,
      data: {
        currentStep: this.getCurrentStepName(),
        progress: progress,
        orderNumber: this.pedidoEnProgreso.nroPedido,
        warehouse: this.bodegaSeleccionada?.nombre,
        itemsInCart: this.pedidoEnProgreso.carrito?.length || 0,
        client: this.pedidoEnProgreso.cliente?.nombres_completos,
        status: status
      },
      message: `Estado: ${this.getCurrentStepName()} (${progress}% completo)`,
      visualUpdate: { stepName: 'status', progress: progress, nextActions: [status?.nextStep || 'Continuar proceso'] }
    };
  }

  // === NUEVAS HERRAMIENTAS DE FACTURACIÓN ===

  /**
   * Maneja la configuración de datos de facturación
   */
  private handleConfigureBilling(args: any): DemoResponse {
    console.log('📤 Configurando facturación con args:', args);
    const { nombres, ciudad = 'Bogotá', correo, telefono } = args;

    // VALIDAR SOLO DATOS CRÍTICOS
    if (!nombres || nombres.trim() === '') {
      return {
        success: false,
        message: '❌ Necesito el nombre para facturación. Por ejemplo: "Configura facturación para Juan Pérez"',
        error: 'Nombre requerido',
        visualUpdate: {
          stepName: 'facturacion',
          progress: 70,
          nextActions: ['Proporciona el nombre completo para facturación']
        }
      };
    }

    // USAR DATOS DEL CLIENTE SI YA EXISTEN
    const clienteExistente = this.pedidoEnProgreso.cliente;
    const correoFinal = correo || clienteExistente?.correo_electronico_comprador || `${nombres.split(' ')[0].toLowerCase()}@temp.co`;
    const telefonoFinal = telefono || clienteExistente?.numero_celular_comprador || '3001234567';
    const documentoFinal = clienteExistente?.documento || 'TEMP' + Date.now();

    // Configurar facturación con datos inteligentes
    this.pedidoEnProgreso.facturacion = {
      nombres: nombres,
      ciudad: ciudad,
      departamento: this.inferDepartmentFromCity(ciudad),
      pais: 'Colombia',
      correoElectronico: correoFinal,
      celular: telefonoFinal,
      indicativoCel: '57',
      tipoDocumento: 'CC',
      documento: documentoFinal,
      direccion: `Dirección ${ciudad}`,
      codigoPostal: this.getPostalCodeForCity(ciudad),
      alias: 'Principal'
    };

    console.log('📤 Facturación configurada:', this.pedidoEnProgreso.facturacion);

    // Actualizar paso visual
    this.pasoActual = 6;
    this.updateVisualStep('facturacion');
    this.updateOrderStatus();

    return {
      success: true,
      data: {
        billing: this.pedidoEnProgreso.facturacion,
        autoCompleted: {
          email: !correo,
          phone: !telefono,
          document: !clienteExistente?.documento
        }
      },
      message: `✅ Facturación configurada para ${nombres} en ${ciudad}${!correo ? ' (email temporal generado)' : ''}`,
      visualUpdate: {
        stepName: 'facturacion',
        progress: 75,
        nextActions: ['Configura el envío con configureShipping', 'Procesa la venta con processSale']
      }
    };
  }

  /**
   * Maneja la obtención de zonas de facturación
   */
  private handleGetBillingZones(args: any): DemoResponse {
    console.log('🏢 handleGetBillingZones llamado con args:', args);

    const billingZones = [
      { id: 'BOG', nombre: 'Bogotá', costo: 5000, descripcion: 'Zona metropolitana de Bogotá' },
      { id: 'MED', nombre: 'Medellín', costo: 8000, descripcion: 'Área metropolitana de Medellín' },
      { id: 'CALI', nombre: 'Cali', costo: 10000, descripcion: 'Valle del Cauca' },
      { id: 'BARR', nombre: 'Barranquilla', costo: 12000, descripcion: 'Costa Atlántica' },
      { id: 'CART', nombre: 'Cartagena', costo: 15000, descripcion: 'Costa Caribe' }
    ];

    const response: DemoResponse = {
      success: true,
      data: {
        zones: billingZones,
        total: billingZones.length
      },
      message: `Se encontraron ${billingZones.length} zonas de facturación disponibles`,
      visualUpdate: {
        stepName: 'facturacion',
        progress: 70,
        nextActions: ['Selecciona una zona con selectBillingZone', 'Configura facturación con configureBilling']
      }
    };

    console.log('📤 Zonas de facturación:', response);
    return response;
  }

  /**
   * Maneja la selección de zona de facturación
   */
  private handleSelectBillingZone(args: any): DemoResponse {
    console.log('📍 handleSelectBillingZone llamado con args:', args);
    const { zoneId } = args;

    if (!zoneId) {
      return {
        success: false,
        message: 'Se requiere el ID de la zona de facturación',
        error: 'ZoneId es obligatorio'
      };
    }

    const billingZones = [
      { id: 'BOG', nombre: 'Bogotá', costo: 5000 },
      { id: 'MED', nombre: 'Medellín', costo: 8000 },
      { id: 'CALI', nombre: 'Cali', costo: 10000 },
      { id: 'BARR', nombre: 'Barranquilla', costo: 12000 },
      { id: 'CART', nombre: 'Cartagena', costo: 15000 }
    ];

    const selectedZone = billingZones.find(z => z.id === zoneId);
    if (!selectedZone) {
      return {
        success: false,
        message: `No se encontró la zona de facturación con ID: ${zoneId}`,
        error: 'Zona no encontrada'
      };
    }

    // Actualizar el pedido con la zona seleccionada
    if (!this.pedidoEnProgreso.facturacion) {
      this.pedidoEnProgreso.facturacion = {} as Facturacion;
    }
    this.pedidoEnProgreso.facturacion.zonaCobro = selectedZone.nombre;

    const response: DemoResponse = {
      success: true,
      data: {
        selectedZone,
        billingCost: selectedZone.costo
      },
      message: `✅ Zona de facturación "${selectedZone.nombre}" seleccionada. Costo: $${selectedZone.costo.toLocaleString()}`,
      visualUpdate: {
        stepName: 'facturacion',
        progress: 72,
        nextActions: ['Completa la configuración de facturación con configureBilling']
      }
    };

    console.log('📤 Zona de facturación seleccionada:', response);
    return response;
  }

  // === NUEVAS HERRAMIENTAS DE ENVÍO ===

  /**
   * Maneja la configuración de datos de envío
   */
  private handleConfigureShipping(args: any): DemoResponse {
    console.log('📤 Configurando envío con args:', args);
    const { direccion, ciudad = 'Bogotá', barrio, telefono } = args;

    // VALIDAR DATOS CRÍTICOS
    if (!direccion || direccion.trim() === '') {
      return {
        success: false,
        message: '❌ Necesito la dirección de envío. Por ejemplo: "Envía a Calle 123 #45-67"',
        error: 'Dirección requerida',
        visualUpdate: {
          stepName: 'envio',
          progress: 60,
          nextActions: ['Proporciona la dirección completa de envío']
        }
      };
    }

    // USAR DATOS DEL CLIENTE SI YA EXISTEN
    const clienteExistente = this.pedidoEnProgreso.cliente;
    const telefonoFinal = telefono || clienteExistente?.numero_celular_comprador || '3001234567';
    const nombresFinales = clienteExistente?.nombres_completos || 'Cliente';

    // Configurar envío con datos inteligentes
    this.pedidoEnProgreso.envio = {
      nombres: nombresFinales,
      apellidos: '',
      indicativoCel: '57',
      celular: telefonoFinal,
      direccionEntrega: direccion,
      barrio: barrio || 'Centro',
      ciudad: ciudad,
      departamento: this.inferDepartmentFromCity(ciudad),
      pais: 'Colombia',
      codigoPV: this.getPostalCodeForCity(ciudad),
      observaciones: 'Envío configurado por asistente de voz',
      especificacionesInternas: '',
      indicativoOtroNumero: '',
      nombreUnidad: '',
      otroNumero: '',
      alias: 'Principal',
      zonaCobro: ciudad
    };

    console.log('📤 Envío configurado:', this.pedidoEnProgreso.envio);

    // Actualizar paso visual
    this.pasoActual = 5;
    this.updateVisualStep('envio');
    this.updateOrderStatus();

    return {
      success: true,
      data: {
        shipping: this.pedidoEnProgreso.envio,
        autoCompleted: {
          phone: !telefono,
          barrio: !barrio,
          names: !clienteExistente?.nombres_completos
        }
      },
      message: `✅ Envío configurado a ${direccion}, ${ciudad}${!telefono ? ' (teléfono del cliente usado)' : ''}`,
      visualUpdate: {
        stepName: 'envio',
        progress: 65,
        nextActions: ['Configura la facturación con configureBilling', 'Procesa la venta con processSale']
      }
    };
  }

  /**
   * Maneja la obtención de opciones de envío
   */
  private handleGetShippingOptions(args: any): DemoResponse {
    console.log('📦 handleGetShippingOptions llamado con args:', args);

    const shippingOptions = [
      { id: 'ESTANDAR', nombre: 'Envío Estándar', costo: 8000, diasEstimados: 3, descripcion: 'Entrega en 3 días hábiles' },
      { id: 'EXPRESS', nombre: 'Envío Express', costo: 15000, diasEstimados: 1, descripcion: 'Entrega en 24 horas' },
      { id: 'PREMIUM', nombre: 'Envío Premium', costo: 25000, diasEstimados: 1, descripcion: 'Entrega el mismo día' },
      { id: 'GRATIS', nombre: 'Envío Gratis', costo: 0, diasEstimados: 5, descripcion: 'Envío gratis para compras superiores a $200,000' }
    ];

    const response: DemoResponse = {
      success: true,
      data: {
        options: shippingOptions,
        total: shippingOptions.length
      },
      message: `Se encontraron ${shippingOptions.length} opciones de envío disponibles`,
      visualUpdate: {
        stepName: 'envio',
        progress: 60,
        nextActions: ['Selecciona una opción con selectShippingOption', 'Configura envío con configureShipping']
      }
    };

    console.log('📤 Opciones de envío:', response);
    return response;
  }

  /**
   * Maneja la selección de opción de envío
   */
  private handleSelectShippingOption(args: any): DemoResponse {
    console.log('✅ handleSelectShippingOption llamado con args:', args);
    const { optionId, estimatedDays, cost } = args;

    if (!optionId) {
      return {
        success: false,
        message: 'Se requiere el ID de la opción de envío',
        error: 'OptionId es obligatorio'
      };
    }

    const shippingOptions = [
      { id: 'ESTANDAR', nombre: 'Envío Estándar', costo: 8000, diasEstimados: 3 },
      { id: 'EXPRESS', nombre: 'Envío Express', costo: 15000, diasEstimados: 1 },
      { id: 'PREMIUM', nombre: 'Envío Premium', costo: 25000, diasEstimados: 1 },
      { id: 'GRATIS', nombre: 'Envío Gratis', costo: 0, diasEstimados: 5 }
    ];

    const selectedOption = shippingOptions.find(o => o.id === optionId);
    if (!selectedOption) {
      return {
        success: false,
        message: `No se encontró la opción de envío con ID: ${optionId}`,
        error: 'Opción no encontrada'
      };
    }

    // Actualizar el pedido con la opción seleccionada
    this.pedidoEnProgreso.totalEnvio = selectedOption.costo;
    this.pedidoEnProgreso.formaEntrega = selectedOption.nombre;

    const response: DemoResponse = {
      success: true,
      data: {
        selectedOption,
        shippingCost: selectedOption.costo,
        estimatedDays: selectedOption.diasEstimados
      },
      message: `✅ Opción de envío "${selectedOption.nombre}" seleccionada. Costo: $${selectedOption.costo.toLocaleString()}, entrega en ${selectedOption.diasEstimados} día${selectedOption.diasEstimados > 1 ? 's' : ''}`,
      visualUpdate: {
        stepName: 'envio',
        progress: 62,
        nextActions: ['Completa la configuración de envío con configureShipping']
      }
    };

    console.log('📤 Opción de envío seleccionada:', response);
    return response;
  }

  // === NUEVAS HERRAMIENTAS VISUALES ESFÉRICAS ===

  /**
   * Maneja la creación de experiencias visuales esféricas únicas
   */
  private handleCreateSphereVisual(args: any): DemoResponse {
    console.log('🌐 handleCreateSphereVisual llamado con args:', args);
    const { stepName, animationType = 'pulse', sphereColor = '#4CAF50', particleCount = 50 } = args;

    if (!stepName) {
      return {
        success: false,
        message: 'Se requiere el nombre del paso para crear la esfera visual',
        error: 'StepName es obligatorio'
      };
    }

    // Usar el servicio de visualización esférica
    this.sphereVisualService.createSphereVisual(stepName, {
      animationType,
      sphereColor,
      particleCount,
      audioReactive: true
    });

    // Actualizar el paso visual con la esfera
    this.updateVisualStepWithSphere(stepName, {
      stepName,
      animationType,
      sphereColor,
      particleCount,
      timestamp: Date.now(),
      uniqueId: `sphere_${stepName}_${Date.now()}`,
      visualElements: {
        mainSphere: {
          color: sphereColor,
          animation: animationType,
          size: 'large',
          glow: true
        },
        particles: {
          count: particleCount,
          colors: this.generateParticleColors(sphereColor),
          movement: 'orbital'
        },
        effects: {
          ripple: true,
          sparkle: animationType === 'celebrate',
          pulse: animationType === 'pulse'
        }
      }
    });

    const response: DemoResponse = {
      success: true,
      data: {
        sphereVisual: {
          stepName,
          animationType,
          sphereColor,
          particleCount
        },
        stepName,
        animationType,
        sphereColor
      },
      message: `✨ Esfera visual creada para "${stepName}" con animación ${animationType} y color ${sphereColor}`,
      visualUpdate: {
        stepName: stepName.toLowerCase(),
        progress: this.getStepProgress(stepName),
        nextActions: ['Continúa con el siguiente paso', 'Usa showSphereProgress para ver el progreso completo']
      }
    };

    console.log('📤 Esfera visual creada:', response);
    return response;
  }

  /**
   * Maneja la visualización del progreso en esfera interactiva
   */
  private handleShowSphereProgress(args: any): DemoResponse {
    console.log('📊 handleShowSphereProgress llamado con args:', args);
    const { includeAnimations = true, showDetails = true } = args;

    const currentProgress = this.progressSubject.value;
    const status = this.orderStatusSubject.value;

    // Crear esfera de progreso interactiva usando el servicio
    const sphereProgress = {
      overallProgress: currentProgress,
      currentStep: this.getCurrentStepName(),
      steps: this.visualStepsSubject.value.map((step, index) => ({
        name: step.stepKey,
        completed: step.completed || false,
        active: step.active || false,
        progress: this.getStepProgress(step.stepKey),
        sphereColor: step.sphereColor || '#4CAF50',
        animation: step.sphereAnimation || 'pulse'
      })),
      animations: includeAnimations ? {
        rotation: true,
        particleFlow: true,
        colorTransitions: true,
        progressPulse: true
      } : {},
      details: showDetails ? {
        orderNumber: this.pedidoEnProgreso.nroPedido,
        customer: this.pedidoEnProgreso.cliente?.nombres_completos,
        warehouse: this.bodegaSeleccionada?.nombre,
        itemsInCart: this.pedidoEnProgreso.carrito?.length || 0
      } : {}
    };

    // Actualizar la visualización esférica con el progreso
    this.sphereVisualService.updateSphereVisual({
      audioReactive: true,
      celebrationMode: currentProgress === 100
    });

    const response: DemoResponse = {
      success: true,
      data: {
        sphereProgress,
        currentProgress,
        totalSteps: this.visualStepsSubject.value.length,
        completedSteps: this.visualStepsSubject.value.filter(s => s.completed).length
      },
      message: `📊 Progreso actual: ${currentProgress}% completado. ${sphereProgress.steps.filter(s => s.completed).length} de ${sphereProgress.steps.length} pasos terminados.`,
      visualUpdate: {
        stepName: 'progress',
        progress: currentProgress,
        nextActions: ['Continúa con el siguiente paso', 'Usa createSphereVisual para crear experiencias únicas']
      }
    };

    console.log('📤 Progreso esférico mostrado:', response);
    return response;
  }

  /**
   * Maneja la creación de celebraciones esféricas
   */
  private handleCreateSphereCelebration(args: any): DemoResponse {
    console.log('🎉 handleCreateSphereCelebration llamado con args:', args);
    const { celebrationType = 'success', particleEffects = true, soundEffects = true } = args;

    // Usar el servicio de visualización esférica para la celebración
    this.sphereVisualService.activateCelebration(celebrationType);

    // Crear celebración esférica única
    const celebration = {
      type: celebrationType,
      timestamp: Date.now(),
      duration: 5000, // 5 segundos
      effects: {
        particles: particleEffects ? {
          count: 200,
          colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'],
          movement: 'explosion',
          speed: 'fast'
        } : {},
        sound: soundEffects ? {
          type: celebrationType === 'success' ? 'success_chime' : 'celebration_fanfare',
          volume: 0.7
        } : {},
        visual: {
          mainSphere: {
            color: '#FFD700',
            animation: 'celebrate',
            size: 'extra-large',
            glow: true,
            pulse: true
          },
          secondarySpheres: [
            { color: '#FF69B4', animation: 'bounce', size: 'medium' },
            { color: '#00CED1', animation: 'rotate', size: 'medium' },
            { color: '#32CD32', animation: 'wave', size: 'medium' }
          ]
        }
      },
      message: this.getCelebrationMessage(celebrationType)
    };

    const response: DemoResponse = {
      success: true,
      data: {
        celebration,
        type: celebrationType,
        effects: celebration.effects
      },
      message: `🎉 ¡Celebración esférica creada! ${celebration.message}`,
      visualUpdate: {
        stepName: 'celebration',
        progress: 100,
        nextActions: ['Disfruta de la celebración', 'Continúa con la siguiente venta']
      }
    };

    console.log('📤 Celebración esférica creada:', response);
    return response;
  }

  /**
   * Maneja la visualización de notificaciones esféricas
   */
  private handleShowSphereNotification(args: any): DemoResponse {
    console.log('🔔 handleShowSphereNotification llamado con args:', args);
    const { message, type = 'info', duration = 3000, sphereSize = 'medium' } = args;

    if (!message) {
      return {
        success: false,
        message: 'Se requiere un mensaje para la notificación esférica',
        error: 'Message es obligatorio'
      };
    }

    // Usar el servicio de visualización esférica para la notificación
    this.sphereVisualService.showSphereNotification(message, type);

    // Crear notificación esférica
    const notification = {
      message,
      type,
      duration,
      sphereSize,
      timestamp: Date.now(),
      visual: {
        sphere: {
          color: this.getNotificationColor(type),
          animation: this.getNotificationAnimation(type),
          size: sphereSize,
          glow: type === 'success' || type === 'error',
          pulse: type === 'warning'
        },
        text: {
          color: this.getNotificationTextColor(type),
          animation: 'fadeIn',
          position: 'center'
        }
      }
    };

    // Mostrar notificación
    this.showToast(message, `Notificación ${type}`);

    const response: DemoResponse = {
      success: true,
      data: {
        notification,
        type,
        message
      },
      message: `🔔 Notificación esférica mostrada: ${message}`,
      visualUpdate: {
        stepName: 'notification',
        progress: this.progressSubject.value,
        nextActions: ['Continúa con el proceso', 'Usa createSphereVisual para más experiencias']
      }
    };

    console.log('📤 Notificación esférica mostrada:', response);
    return response;
  }

  /**
   * Genera colores de partículas basados en el color principal
   */
  private generateParticleColors(mainColor: string): string[] {
    const colors = [
      mainColor,
      this.adjustColor(mainColor, 20),
      this.adjustColor(mainColor, -20),
      this.adjustColor(mainColor, 40),
      this.adjustColor(mainColor, -40)
    ];
    return colors;
  }

  /**
   * Ajusta un color para crear variaciones
   */
  private adjustColor(color: string, amount: number): string {
    // Implementación simple de ajuste de color
    return color; // Por simplicidad, retorna el color original
  }

  /**
   * Actualiza el paso visual con esfera
   */
  private updateVisualStepWithSphere(stepName: string, sphereVisual: any): void {
    const steps = this.visualStepsSubject.value;
    const stepIndex = steps.findIndex(s => s.stepKey === stepName.toLowerCase());
    
    if (stepIndex !== -1) {
      const updatedSteps = steps.map((step, index) => ({
        ...step,
        sphereVisual: index === stepIndex ? sphereVisual : step.sphereVisual
      }));
      
      this.visualStepsSubject.next(updatedSteps);
    }
  }

  /**
   * Obtiene el progreso de un paso específico
   */
  private getStepProgress(stepName: string): number {
    const stepProgress = {
      bodega: 10,
      productos: 25,
      carrito: 40,
      cliente: 55,
      envio: 65,
      facturacion: 75,
      pago: 85,
      confirmacion: 100
    };
    return stepProgress[stepName.toLowerCase()] || 0;
  }

  /**
   * Obtiene el mensaje de celebración según el tipo
   */
  private getCelebrationMessage(type: string): string {
    const messages = {
      success: '¡Venta completada exitosamente! 🎉',
      milestone: '¡Hito alcanzado! 🚀',
      completion: '¡Proceso completado! ✨'
    };
    return messages[type] || '¡Celebración! 🎊';
  }

  /**
   * Obtiene el color de notificación según el tipo
   */
  private getNotificationColor(type: string): string {
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336'
    };
    return colors[type] || '#2196F3';
  }

  /**
   * Obtiene la animación de notificación según el tipo
   */
  private getNotificationAnimation(type: string): string {
    const animations = {
      info: 'pulse',
      success: 'bounce',
      warning: 'shake',
      error: 'pulse'
    };
    return animations[type] || 'pulse';
  }

  /**
   * Obtiene el color del texto de notificación según el tipo
   */
  private getNotificationTextColor(type: string): string {
    const colors = {
      info: '#FFFFFF',
      success: '#FFFFFF',
      warning: '#000000',
      error: '#FFFFFF'
    };
    return colors[type] || '#FFFFFF';
  }

  /**
   * Prepara el pedido para el sistema real de ventas
   */
  private async prepareOrderForRealSystem(): Promise<any> {
    console.log('📋 [PREPARE ORDER] ==================== INICIO ====================');
    console.log('📋 [PREPARE ORDER] Estado del pedido en progreso:', this.pedidoEnProgreso);

    // Obtener company desde localStorage
    const empresaActual = JSON.parse(localStorage.getItem("currentCompany") || '{}');
    const companyName = empresaActual.nomComercial || 'KATUQ';
    console.log('🏢 [PREPARE ORDER] Company desde localStorage:', companyName);

    // Obtener número de pedido consecutivo
    console.log('🔢 [PREPARE ORDER] Obteniendo número consecutivo de pedido...');
    let nroPedido = this.pedidoEnProgreso.nroPedido;

    if (!nroPedido) {
      try {
        const consecutiveResult = await this.ventasService.getNextRef(companyName).toPromise();
        console.log('✅ [PREPARE ORDER] Resultado de getNextRef:', consecutiveResult);
        nroPedido = consecutiveResult?.nroPedido || `PED-${Date.now()}`;
        console.log('📌 [PREPARE ORDER] Número de pedido asignado:', nroPedido);
      } catch (error) {
        console.error('❌ [PREPARE ORDER] Error obteniendo consecutivo:', error);
        nroPedido = `PED-${Date.now()}`;
        console.log('⚠️ [PREPARE ORDER] Usando número de pedido temporal:', nroPedido);
      }
    } else {
      console.log('📌 [PREPARE ORDER] Usando nroPedido existente:', nroPedido);
    }

    // Calcular totales
    console.log('💰 [PREPARE ORDER] Calculando totales del carrito...');
    const total = this.pedidoEnProgreso.carrito!.reduce((sum, item) => {
      const precio = item.producto?.precio?.precioUnitarioConIva || 0;
      const cantidad = item.cantidad || 0;
      const subtotalItem = precio * cantidad;
      const nombreProducto = item.producto?.crearProducto?.titulo || item.producto?.identificacion?.referencia || 'Producto';
      console.log(`   - ${nombreProducto}: $${precio} x ${cantidad} = $${subtotalItem}`);
      return sum + subtotalItem;
    }, 0);
    console.log('💰 [PREPARE ORDER] Total calculado:', total);

    // Preparar template del pedido para VentasService
    const orderTemplate = {
      // Datos básicos del pedido
      referencia: this.pedidoEnProgreso.referencia || `VENTA-${Date.now()}`,
      nroPedido: nroPedido,
      company: companyName,
      typeOrder: 'E-commerce',
      channel: {
        activo: true,
        createdAt: new Date().toISOString(),
        name: 'Venta Asistida',
        tipo: 'E-commerce'
      },

      // Cliente
      cliente: this.pedidoEnProgreso.cliente,

      // Bodega
      bodegaId: this.bodegaSeleccionada?.idBodega,

      // Carrito
      carrito: this.pedidoEnProgreso.carrito?.map(item => ({
        producto: item.producto,
        cantidad: item.cantidad || 1,
        configuracion: item.configuracion
      })),

      // Totales
      totalPedidoSinDescuento: total,
      totalPedididoConDescuento: total,
      totalEnvio: this.pedidoEnProgreso.totalEnvio || 0,
      totalDescuento: this.pedidoEnProgreso.totalDescuento || 0,
      totalImpuesto: this.pedidoEnProgreso.totalImpuesto || 0,
      subtotal: total,

      // Forma de pago
      formaDePago: this.pedidoEnProgreso.formaDePago || 'Efectivo',

      // Estado inicial
      estadoProceso: EstadoProceso.SinProducir,
      estadoPago: EstadoPago.Pendiente,

      // Fechas
      fechaCreacion: new Date().toISOString(),

      // Facturación y envío
      facturacion: this.pedidoEnProgreso.facturacion,
      envio: this.pedidoEnProgreso.envio,

      // Notas
      notasPedido: this.pedidoEnProgreso.notasPedido
    };

    console.log('📋 [PREPARE ORDER] ==================== VALIDACIÓN ====================');
    console.log('✅ [PREPARE ORDER] referencia:', orderTemplate.referencia);
    console.log('✅ [PREPARE ORDER] nroPedido:', orderTemplate.nroPedido);
    console.log('✅ [PREPARE ORDER] company:', orderTemplate.company);
    console.log('✅ [PREPARE ORDER] typeOrder:', orderTemplate.typeOrder);
    console.log('✅ [PREPARE ORDER] channel:', orderTemplate.channel);
    console.log('✅ [PREPARE ORDER] cliente:', orderTemplate.cliente ? '✓' : '✗ FALTA');
    console.log('✅ [PREPARE ORDER] bodegaId:', orderTemplate.bodegaId ? '✓' : '✗ FALTA');
    console.log('✅ [PREPARE ORDER] carrito (items):', orderTemplate.carrito?.length || 0);
    console.log('✅ [PREPARE ORDER] facturacion:', orderTemplate.facturacion ? '✓' : '✗ FALTA');
    console.log('✅ [PREPARE ORDER] envio:', orderTemplate.envio ? '✓' : '✗ FALTA');
    console.log('✅ [PREPARE ORDER] subtotal:', orderTemplate.subtotal);
    console.log('📋 [PREPARE ORDER] ==================== FIN ====================');

    return orderTemplate;
  }

  /**
   * Valida un cupón de descuento usando el sistema real
   */
  private async handleValidateCoupon(args: any): Promise<DemoResponse> {
    console.log('🎫 Validando cupón:', args);
    const { couponCode } = args;

    if (!couponCode) {
      return {
        success: false,
        message: 'Se requiere el código del cupón',
        error: 'Código de cupón faltante'
      };
    }

    try {
      // Validar cupón usando VentasService real
      const cuponResult = await this.ventasService.validateCupon({ code: couponCode }).toPromise();
      
      if (cuponResult && cuponResult.valid) {
        console.log('✅ Cupón válido:', cuponResult);
        
        // Aplicar descuento al pedido
        const descuento = cuponResult.discount || 0;
        const totalOriginal = this.pedidoEnProgreso.carrito!.reduce((sum, item) => 
          sum + ((item.producto?.precio?.precioUnitarioConIva || 0) * (item.cantidad || 0)), 0
        );
        
        this.pedidoEnProgreso.cuponAplicado = couponCode;
        this.pedidoEnProgreso.totalDescuento = descuento;
        this.pedidoEnProgreso.totalPedididoConDescuento = totalOriginal - descuento;
        
        return {
          success: true,
          data: {
            coupon: {
              code: couponCode,
              discount: descuento,
              discountFormatted: `$${descuento.toLocaleString()}`,
              totalAfterDiscount: this.pedidoEnProgreso.totalPedididoConDescuento,
              totalAfterDiscountFormatted: `$${this.pedidoEnProgreso.totalPedididoConDescuento.toLocaleString()}`
            }
          },
          message: `🎉 Cupón "${couponCode}" aplicado exitosamente. Descuento: $${descuento.toLocaleString()}`,
          visualUpdate: {
            stepName: 'pago',
            progress: 90,
            nextActions: ['Procesa la venta con processSale']
          }
        };
        
      } else {
        return {
          success: false,
          message: `Cupón "${couponCode}" no válido o expirado`,
          error: 'Cupón inválido',
          data: { couponCode, validationResult: cuponResult }
        };
      }
      
    } catch (error: any) {
      console.error('❌ Error validando cupón:', error);
      
      return {
        success: false,
        message: `Error validando cupón "${couponCode}"`,
        error: 'Error de conexión',
        data: { couponCode, error: error.message }
      };
    }
  }

  /**
   * Genera bodegas demo para fallback
   */
  private generateMockWarehouses(): any[] {
    console.log('🏭 Generando bodegas demo...');
    
    const demoWarehouses = [
      { 
        id: 'BOD001', 
        name: 'Bodega Principal Bogotá', 
        location: 'Av. El Dorado 123, Bogotá', 
        capacity: '1000 m²',
        status: 'Activa'
      },
      { 
        id: 'BOD002', 
        name: 'Bodega Norte', 
        location: 'Calle 127 45-67, Bogotá', 
        capacity: '800 m²',
        status: 'Activa'
      },
      { 
        id: 'BOD003', 
        name: 'Bodega Sur', 
        location: 'Av. Boyacá 234-56, Bogotá', 
        capacity: '600 m²',
        status: 'Activa'
      }
    ];
    
    console.log('🏭 Bodegas demo generadas:', demoWarehouses);
    return demoWarehouses;
  }

  // === MÉTODOS DE INVENTARIO ELIMINADOS ===
  // Los métodos de inventario han sido delegados al KatuqInventoryToolsService
  // para una mejor separación de responsabilidades

  /**
   * Notifica un log al sistema visual
   */
  public notifyVisualLog(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'system' = 'info', details?: string): void {
    console.log(`📊 [Visual] ${message}`);
    // Este método se puede usar para notificar logs al componente visual
  }
}
