import { Injectable } from '@angular/core';
import { OrderToolsRegistrarService } from '../tools/order-tools-registrar.service';
import { VoiceAgentSalesService } from './voice-agent-sales.service';
import { CartSingletonService } from '../ventas/cart.singleton.service';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VoiceSalesCommand {
  command: string;
  args: any;
  timestamp: Date;
  success: boolean;
  response?: any;
  error?: string;
}

export interface VoiceSalesExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  nextAction?: string;
  progress?: any;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class VoiceSalesIntegrationService {
  private commandHistorySubject = new BehaviorSubject<VoiceSalesCommand[]>([]);
  private isProcessingSubject = new BehaviorSubject<boolean>(false);
  private lastResultSubject = new BehaviorSubject<VoiceSalesExecutionResult | null>(null);

  public commandHistory$ = this.commandHistorySubject.asObservable();
  public isProcessing$ = this.isProcessingSubject.asObservable();
  public lastResult$ = this.lastResultSubject.asObservable();

  private commandHistory: VoiceSalesCommand[] = [];

  constructor(
    private orderToolsService: OrderToolsRegistrarService,
    private voiceSalesService: VoiceAgentSalesService,
    private cartService: CartSingletonService,
    private toastr: ToastrService
  ) {}

  // === MÉTODOS PRINCIPALES DE INTEGRACIÓN ===

  /**
   * Ejecuta un comando de voz para el sistema de ventas
   */
  async executeVoiceCommand(command: string, args: any = {}): Promise<VoiceSalesExecutionResult> {
    this.isProcessingSubject.next(true);
    
    try {
      const timestamp = new Date();
      let result: VoiceSalesExecutionResult;

      // Mapear comandos de voz a herramientas del sistema
      switch (command.toLowerCase()) {
        case 'selectwarehouse':
        case 'seleccionar bodega':
        case 'cambiar bodega':
          result = await this.executeSelectWarehouse(args);
          break;

        case 'searchproducts':
        case 'buscar productos':
        case 'buscar producto':
          result = await this.executeSearchProducts(args);
          break;

        case 'addtocart':
        case 'agregar al carrito':
        case 'añadir al carrito':
          result = await this.executeAddToCart(args);
          break;

        case 'searchclient':
        case 'buscar cliente':
        case 'encontrar cliente':
          result = await this.executeSearchClient(args);
          break;

        case 'setclient':
        case 'configurar cliente':
        case 'crear cliente':
          result = await this.executeSetClient(args);
          break;

        case 'setdelivery':
        case 'configurar entrega':
        case 'dirección de entrega':
          result = await this.executeSetDelivery(args);
          break;

        case 'setbilling':
        case 'configurar facturación':
        case 'datos de facturación':
          result = await this.executeSetBilling(args);
          break;

        case 'processsale':
        case 'procesar venta':
        case 'finalizar venta':
        case 'confirmar venta':
          result = await this.executeProcessSale(args);
          break;

        case 'nextstep':
        case 'siguiente paso':
        case 'avanzar':
          result = await this.executeNextStep();
          break;

        case 'previousstep':
        case 'paso anterior':
        case 'retroceder':
          result = await this.executePreviousStep();
          break;

        case 'gotostep':
        case 'ir al paso':
        case 'navegar a':
          result = await this.executeGoToStep(args);
          break;

        case 'getstatus':
        case 'estado actual':
        case 'progreso':
          result = await this.executeGetStatus();
          break;

        case 'getcart':
        case 'ver carrito':
        case 'carrito':
          result = await this.executeGetCart();
          break;

        case 'clearorder':
        case 'limpiar pedido':
        case 'reiniciar':
          result = await this.executeClearOrder();
          break;

        default:
          result = {
            success: false,
            error: `Comando no reconocido: ${command}`,
            message: 'Comando no válido. Usa comandos como "seleccionar bodega", "buscar productos", etc.'
          };
      }

      // Registrar el comando en el historial
      const commandRecord: VoiceSalesCommand = {
        command,
        args,
        timestamp,
        success: result.success,
        response: result.data,
        error: result.error
      };

      this.addToCommandHistory(commandRecord);
      this.lastResultSubject.next(result);

      return result;

    } catch (error: any) {
      const errorResult: VoiceSalesExecutionResult = {
        success: false,
        error: error.message || 'Error desconocido',
        message: 'Error al ejecutar el comando'
      };

      this.lastResultSubject.next(errorResult);
      return errorResult;

    } finally {
      this.isProcessingSubject.next(false);
    }
  }

  // === IMPLEMENTACIÓN DE COMANDOS ESPECÍFICOS ===

  private async executeSelectWarehouse(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.warehouseId) {
        return {
          success: false,
          error: 'ID de bodega no proporcionado',
          message: 'Debes especificar el ID de la bodega. Usa "listWarehouses" para ver las disponibles.'
        };
      }

      // Ejecutar la herramienta real del OrderTools
      const result = await this.orderToolsService.selectWarehouse({ warehouseId: args.warehouseId });
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('warehouse');
        
        return {
          success: true,
          message: `Bodega "${result.selectedWarehouse}" seleccionada exitosamente`,
          data: result,
          nextAction: 'Ahora puedes buscar productos usando "buscar productos [nombre]"',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.suggestion || 'Error al seleccionar bodega',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al seleccionar bodega'
      };
    }
  }

  private async executeSearchProducts(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.query && !args.category && !args.minPrice && !args.maxPrice) {
        return {
          success: false,
          error: 'Criterios de búsqueda no proporcionados',
          message: 'Debes especificar al menos un criterio de búsqueda: nombre, categoría, precio, etc.'
        };
      }

      // Ejecutar la búsqueda real
      const result = await this.orderToolsService['searchProducts'](args);
      
      if (result.success) {
        return {
          success: true,
          message: `Encontrados ${result.totalFound} productos`,
          data: result,
          nextAction: `Usa "agregar al carrito [ID del producto] [cantidad]" para agregar productos`,
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.suggestion || 'No se encontraron productos',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al buscar productos'
      };
    }
  }

  private async executeAddToCart(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.productId) {
        return {
          success: false,
          error: 'ID de producto no proporcionado',
          message: 'Debes especificar el ID del producto a agregar'
        };
      }

      const quantity = args.quantity || 1;
      
      // Ejecutar la adición real al carrito
      const result = await this.orderToolsService['addToCart']({ 
        productId: args.productId, 
        quantity: quantity 
      });
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('cart');
        
        return {
          success: true,
          message: `${result.productAdded.name} agregado al carrito`,
          data: result,
          nextAction: 'Continúa agregando productos o usa "configurar cliente" para continuar',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.suggestion || 'Error al agregar al carrito',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al agregar al carrito'
      };
    }
  }

  private async executeSearchClient(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.document) {
        return {
          success: false,
          error: 'Documento del cliente no proporcionado',
          message: 'Debes especificar el número de documento del cliente'
        };
      }

      // Ejecutar la búsqueda real del cliente
      const result = await this.orderToolsService['searchClient']({ document: args.document });
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('client');
        
        return {
          success: true,
          message: `Cliente encontrado: ${result.client.name}`,
          data: result,
          nextAction: 'Cliente configurado. Ahora usa "configurar entrega" para continuar',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.suggestion || 'Cliente no encontrado',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al buscar cliente'
      };
    }
  }

  private async executeSetClient(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.name || !args.document) {
        return {
          success: false,
          error: 'Datos del cliente incompletos',
          message: 'Debes proporcionar al menos el nombre y documento del cliente'
        };
      }

      // Ejecutar la creación/configuración real del cliente
      const result = await this.orderToolsService['setClientToOrder'](args);
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('client');
        
        return {
          success: true,
          message: `Cliente ${args.name} configurado exitosamente`,
          data: result,
          nextAction: 'Cliente configurado. Ahora usa "configurar entrega" para continuar',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: 'Error al configurar cliente',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al configurar cliente'
      };
    }
  }

  private async executeSetDelivery(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.address) {
        return {
          success: false,
          error: 'Dirección de entrega no proporcionada',
          message: 'Debes especificar la dirección de entrega'
        };
      }

      // Ejecutar la configuración real de entrega
      const result = await this.orderToolsService['setDeliveryInfo'](args);
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('delivery');
        
        return {
          success: true,
          message: 'Información de entrega configurada',
          data: result,
          nextAction: 'Entrega configurada. Ahora usa "configurar facturación" para continuar',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: 'Error al configurar entrega',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al configurar entrega'
      };
    }
  }

  private async executeSetBilling(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.document || !args.businessName || !args.address) {
        return {
          success: false,
          error: 'Datos de facturación incompletos',
          message: 'Debes proporcionar documento, razón social y dirección'
        };
      }

      // Ejecutar la configuración real de facturación
      const result = await this.orderToolsService['setBillingInfo'](args);
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('billing');
        
        return {
          success: true,
          message: 'Información de facturación configurada',
          data: result,
          nextAction: 'Facturación configurada. Ahora puedes proceder al pago',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: 'Error al configurar facturación',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al configurar facturación'
      };
    }
  }

  private async executeProcessSale(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      // Validar que el pedido esté completo antes de procesar
      const validation = await this.orderToolsService['validateOrderBeforePay']();
      
      if (!validation.canProceedToPay) {
        return {
          success: false,
          error: 'Pedido no está listo para procesar',
          message: `Faltan requisitos: ${validation.errors.join(', ')}`,
          data: validation
        };
      }

      // Ejecutar la venta real
      const result = await this.orderToolsService['processSale'](args);
      
      if (result.success) {
        // Actualizar el paso en el servicio de voz
        this.voiceSalesService['updateVisualStep']('confirmation');
        
        return {
          success: true,
          message: `¡Venta completada exitosamente! Pedido: ${result.summary.orderNumber}`,
          data: result,
          nextAction: 'Venta completada. El sistema está listo para una nueva venta',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: result.error,
          message: result.suggestion || 'Error al procesar la venta',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al procesar la venta'
      };
    }
  }

  private async executeNextStep(): Promise<VoiceSalesExecutionResult> {
    try {
      const result = this.voiceSalesService.nextStep();
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          data: result.progress,
          nextAction: result.progress?.nextAction || 'Continúa con el siguiente paso',
          progress: result.progress
        };
      } else {
        return {
          success: false,
          error: result.message,
          message: 'No se puede avanzar al siguiente paso',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al avanzar paso'
      };
    }
  }

  private async executePreviousStep(): Promise<VoiceSalesExecutionResult> {
    try {
      const result = this.voiceSalesService.previousStep();
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          data: result.progress,
          nextAction: result.progress?.nextAction || 'Revisa el paso anterior',
          progress: result.progress
        };
      } else {
        return {
          success: false,
          error: result.message,
          message: 'No se puede retroceder',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al retroceder paso'
      };
    }
  }

  private async executeGoToStep(args: any): Promise<VoiceSalesExecutionResult> {
    try {
      if (!args.stepNumber) {
        return {
          success: false,
          error: 'Número de paso no proporcionado',
          message: 'Debes especificar el número de paso al que quieres ir'
        };
      }

      const result = this.voiceSalesService.goToStep(args.stepNumber);
      
      if (result.success) {
        return {
          success: true,
          message: result.message,
          data: result.progress,
          nextAction: result.progress?.nextAction || 'Continúa desde este paso',
          progress: result.progress
        };
      } else {
        return {
          success: false,
          error: result.message,
          message: 'No se puede navegar a ese paso',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al navegar al paso'
      };
    }
  }

  private async executeGetStatus(): Promise<VoiceSalesExecutionResult> {
    try {
      const progress = this.voiceSalesService.getCurrentProgress();
      const orderStatus = this.orderToolsService['getOrderStatus']();
      
      return {
        success: true,
        message: `Estado actual: Paso ${progress.currentStep} - ${progress.currentStepName}`,
        data: { progress, orderStatus },
        nextAction: progress.nextAction || 'Continúa con el siguiente paso',
        progress: progress
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al obtener estado'
      };
    }
  }

  private async executeGetCart(): Promise<VoiceSalesExecutionResult> {
    try {
      const cartContents = await this.orderToolsService['getCartContents']();
      
      if (cartContents.success) {
        return {
          success: true,
          message: `Carrito: ${cartContents.count} productos, Total: $${cartContents.subtotal?.toLocaleString() || 0}`,
          data: cartContents,
          nextAction: 'Continúa configurando el cliente o revisa los productos',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: 'Error al obtener contenido del carrito',
          message: 'No se pudo obtener información del carrito',
          data: cartContents
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al obtener carrito'
      };
    }
  }

  private async executeClearOrder(): Promise<VoiceSalesExecutionResult> {
    try {
      const result = await this.orderToolsService['resetSaleProcess']();
      
      if (result.success) {
        // Reiniciar el servicio de voz
        this.voiceSalesService.resetVoiceSales();
        
        return {
          success: true,
          message: 'Pedido limpiado y reiniciado exitosamente',
          data: result,
          nextAction: 'Sesión reiniciada. Comienza seleccionando una bodega',
          progress: this.voiceSalesService.getCurrentProgress()
        };
      } else {
        return {
          success: false,
          error: 'Error al limpiar pedido',
          message: 'No se pudo limpiar el pedido',
          data: result
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Error interno al limpiar pedido'
      };
    }
  }

  // === MÉTODOS AUXILIARES ===

  private addToCommandHistory(command: VoiceSalesCommand): void {
    this.commandHistory.unshift(command);
    
    // Mantener solo los últimos 50 comandos
    if (this.commandHistory.length > 50) {
      this.commandHistory = this.commandHistory.slice(0, 50);
    }
    
    this.commandHistorySubject.next([...this.commandHistory]);
  }

  /**
   * Obtiene el historial de comandos
   */
  getCommandHistory(): VoiceSalesCommand[] {
    return [...this.commandHistory];
  }

  /**
   * Limpia el historial de comandos
   */
  clearCommandHistory(): void {
    this.commandHistory = [];
    this.commandHistorySubject.next([]);
  }

  /**
   * Obtiene el último resultado de ejecución
   */
  getLastResult(): VoiceSalesExecutionResult | null {
    return this.lastResultSubject.value;
  }

  /**
   * Verifica si hay un comando en procesamiento
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessingSubject.value;
  }
}
