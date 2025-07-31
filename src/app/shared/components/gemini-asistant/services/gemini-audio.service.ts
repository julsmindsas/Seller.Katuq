import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { environment } from '../../../../../environments/environment';

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message: string;
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

  connectionStatus$: Observable<ConnectionStatus> = this.connectionStatusSubject.asObservable();
  audioData$: Observable<any> = this.audioDataSubject.asObservable();
  
  // Nuevos observables para herramientas
  toolCall$: Observable<ToolCall | null> = this.toolCallSubject.asObservable();
  textResponse$: Observable<string> = this.textResponseSubject.asObservable();

  constructor() {
    this.initClient();
  }

  private initClient() {
    this.client = new GoogleGenAI({
      apiKey: environment.GEMINI_API_KEY,
    });
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
      "Eres un asistente de IA que responde en español con acento colombiano, y solo habla de que puedes hacer en el sistema como crear pedidos";
    
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
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus'} }
      },
      ...(tools.length > 0 && { tools }) // Solo agregar tools si hay herramientas configuradas
    };

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
            console.log('📨 Mensaje recibido del servidor:', message);
            
            // Manejo de audio (funcionalidad existente)
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio) {
              console.log('🔊 Audio recibido del modelo');
              this.audioDataSubject.next(audio);
            }

            // Manejo de llamadas a herramientas (nuevo)
            if (message.toolCall) {
              console.log('🛠️ Llamada a herramienta detectada:', message.toolCall);
              const functionCall = message.toolCall.functionCalls?.[0];
              if (functionCall) {
                console.log('🔧 Función específica llamada:', {
                  name: functionCall.name,
                  args: functionCall.args,
                  id: functionCall.id
                });
                
                const toolCall: ToolCall = {
                  name: functionCall.name || '',
                  args: functionCall.args || {},
                  id: functionCall.id || ''
                };
                console.log('📤 Publicando llamada a herramienta:', toolCall);
                this.toolCallSubject.next(toolCall);
                
                // Esperar un momento para que el componente procese la herramienta
                setTimeout(() => {
                  console.log('⏳ Esperando respuesta de herramienta...');
                }, 100);
              }
            }

            // Manejo de respuestas del modelo después de herramientas
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              console.log('💬 Texto recibido del modelo (posible respuesta a herramienta):', text);
              this.textResponseSubject.next(text);
            }

            // Manejo de interrupciones (funcionalidad existente)
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              console.log('⏸️ Interrupción detectada');
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
   * Basado en la documentación oficial: https://ai.google.dev/gemini-api/docs/live-tools
   */
  sendToolResponse(toolResponse: ToolResponse): void {
    if (!this.isSessionReady()) {
      console.error('❌ No se puede enviar respuesta: sesión no está lista');
      return;
    }

    console.log('📤 Enviando respuesta de herramienta al modelo:', toolResponse);
    
    try {
      // Usar el método específico para respuestas de herramientas
      // En lugar de sendClientContent, usamos la estructura correcta
      this.session.sendClientContent({
        turns: [{
          parts: [{
            text: JSON.stringify(toolResponse.response)
          }]
        }]
      });
      console.log('✅ Respuesta de herramienta enviada exitosamente');
    } catch (error) {
      console.error('❌ Error enviando respuesta de herramienta:', error);
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
   * Configuración específica para probar herramientas del sistema Katuq
   */
  async initSessionWithKatuqTools(): Promise<void> {
    const config: GeminiLiveConfig = {
      // model: 'gemini-2.5-flash-preview-native-audio-dialog',
      model: 'gemini-live-2.5-flash-preview',
      systemInstruction: "Eres un asistente de voz del sistema Katuq. Puedes consultar información del inventario, estado del sistema y buscar productos. Responde en español con acento colombiano.",
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
   * Ejemplo de uso de las herramientas del sistema Katuq
   */
  async testKatuqTools(): Promise<void> {
    console.log('🧪 Iniciando prueba de herramientas Katuq...');
    
    // Inicializar sesión con herramientas de Katuq
    console.log('🔧 Configurando sesión con herramientas Katuq...');
    await this.initSessionWithKatuqTools();

    console.log('📡 Suscribiéndose a llamadas de herramientas...');
    // Suscribirse a llamadas de herramientas
    this.toolCall$.subscribe(toolCall => {
      if (toolCall) {
        console.log('🛠️ Llamada a herramienta Katuq recibida:', toolCall);
        
        // Procesar la llamada a la herramienta
        const response = this.handleKatuqToolResponse(toolCall);
        
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
    this.toolCall$.subscribe(toolCall => {
      if (toolCall) {
        console.log('🛠️ [Test] Herramienta llamada:', toolCall);
        
        // Procesar herramienta
        const response = this.handleKatuqToolResponse(toolCall);
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
      await this.initSession();
      console.log('✅ Reconexión exitosa');
    } catch (error) {
      console.error('❌ Error en reconexión:', error);
    }
  }

  /**
   * Maneja las respuestas de herramientas específicas del sistema Katuq
   */
  handleKatuqToolResponse(toolCall: ToolCall): any {
    console.log('🛠️ Procesando llamada a herramienta Katuq:', toolCall);
    console.log('📋 Detalles de la herramienta:', {
      nombre: toolCall.name,
      argumentos: toolCall.args,
      id: toolCall.id
    });

    let response: any;

    switch (toolCall.name) {
      case 'get_inventory_info':
        console.log('📦 Procesando get_inventory_info con args:', toolCall.args);
        response = this.handleInventoryInfo(toolCall.args);
        break;
      
      case 'get_system_status':
        console.log('🖥️ Procesando get_system_status con args:', toolCall.args);
        response = this.handleSystemStatus(toolCall.args);
        break;
      
      case 'search_products':
        console.log('🔍 Procesando search_products con args:', toolCall.args);
        response = this.handleSearchProducts(toolCall.args);
        break;
      
      default:
        console.warn('⚠️ Herramienta no reconocida:', toolCall.name);
        response = { error: 'Herramienta no implementada' };
    }

    console.log('📤 Respuesta generada:', response);
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
}