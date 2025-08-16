import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { OrderToolsRegistrarService } from '../tools/order-tools-registrar.service';
import { CartSingletonService } from '../ventas/cart.singleton.service';
import { ToastrService } from 'ngx-toastr';
import { Pedido, Cliente, Facturacion, Envio, EstadoProceso, EstadoPago } from '../../../components/ventas/modelo/pedido';
import { Producto } from '../../models/productos/Producto';
import { UserLogged } from '../../models/User/UserLogged';
import { UserLite } from '../../models/User/UserLite';

export interface VoiceSalesStep {
  id: number;
  name: string;
  key: string;
  description: string;
  icon: string;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
  requiredFields: string[];
  validationRules: string[];
}

export interface VoiceSalesProgress {
  currentStep: number;
  totalSteps: number;
  completionPercentage: number;
  currentStepName: string;
  nextAction: string;
  canProceed: boolean;
  missingRequirements: string[];
}

export interface VoiceSalesContext {
  orderNumber: string;
  clientName: string;
  productsCount: number;
  totalAmount: number;
  warehouseName: string;
  deliveryAddress: string;
  paymentMethod: string;
}

@Injectable({ providedIn: 'root' })
export class VoiceAgentSalesService {
  private currentStepSubject = new BehaviorSubject<number>(1);
  private salesProgressSubject = new BehaviorSubject<VoiceSalesProgress | null>(null);
  private salesContextSubject = new BehaviorSubject<VoiceSalesContext | null>(null);
  private isActiveSubject = new BehaviorSubject<boolean>(false);

  public currentStep$ = this.currentStepSubject.asObservable();
  public salesProgress$ = this.salesProgressSubject.asObservable();
  public salesContext$ = this.salesContextSubject.asObservable();
  public isActive$ = this.isActiveSubject.asObservable();

  private salesSteps: VoiceSalesStep[] = [
    {
      id: 1,
      name: 'Selección de Bodega',
      key: 'warehouse',
      description: 'Seleccionar la bodega donde se realizará la venta',
      icon: 'fa-warehouse',
      isCompleted: false,
      isActive: true,
      isAccessible: true,
      requiredFields: ['warehouseId'],
      validationRules: ['Bodega debe estar disponible', 'Usuario debe tener permisos']
    },
    {
      id: 2,
      name: 'Selección de Productos',
      key: 'products',
      description: 'Agregar productos al carrito de compras',
      icon: 'fa-shopping-basket',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: ['products', 'quantities'],
      validationRules: ['Stock disponible', 'Precios válidos']
    },
    {
      id: 3,
      name: 'Configuración del Cliente',
      key: 'client',
      description: 'Seleccionar o crear cliente para la venta',
      icon: 'fa-user',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: ['clientData'],
      validationRules: ['Datos obligatorios completos', 'Documento válido']
    },
    {
      id: 4,
      name: 'Configuración de Entrega',
      key: 'delivery',
      description: 'Configurar dirección y método de entrega',
      icon: 'fa-truck',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: ['deliveryAddress', 'deliveryMethod'],
      validationRules: ['Dirección válida', 'Método de entrega seleccionado']
    },
    {
      id: 5,
      name: 'Configuración de Facturación',
      key: 'billing',
      description: 'Completar datos de facturación',
      icon: 'fa-file-invoice',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: ['billingData'],
      validationRules: ['Datos fiscales completos', 'Documento válido']
    },
    {
      id: 6,
      name: 'Resumen y Pago',
      key: 'payment',
      description: 'Revisar pedido y seleccionar método de pago',
      icon: 'fa-credit-card',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: ['paymentMethod'],
      validationRules: ['Método de pago válido', 'Total calculado correctamente']
    },
    {
      id: 7,
      name: 'Confirmación',
      key: 'confirmation',
      description: 'Confirmar y procesar la venta',
      icon: 'fa-check-circle',
      isCompleted: false,
      isActive: false,
      isAccessible: false,
      requiredFields: [],
      validationRules: ['Todos los pasos anteriores completados']
    }
  ];

  constructor(
    private orderToolsService: OrderToolsRegistrarService,
    private cartService: CartSingletonService,
    private toastr: ToastrService
  ) {
    this.initializeSalesSession();
  }

  private initializeSalesSession(): void {
    this.currentStepSubject.next(1);
    this.updateSalesProgress();
    this.isActiveSubject.next(true);
  }

  // === MÉTODOS PRINCIPALES DEL AGENTE DE VOZ ===

  /**
   * Inicia una nueva sesión de venta por voz
   */
  startVoiceSales(): VoiceSalesProgress {
    this.initializeSalesSession();
    this.toastr.info('Sesión de venta por voz iniciada', 'Agente de Voz');
    return this.getCurrentProgress();
  }

  /**
   * Obtiene el progreso actual de la venta
   */
  getCurrentProgress(): VoiceSalesProgress {
    const currentStep = this.currentStepSubject.value;
    const currentStepData = this.salesSteps.find(step => step.id === currentStep);
    
    const progress: VoiceSalesProgress = {
      currentStep,
      totalSteps: this.salesSteps.length,
      completionPercentage: this.calculateCompletionPercentage(),
      currentStepName: currentStepData?.name || 'Paso desconocido',
      nextAction: this.getNextAction(currentStep),
      canProceed: this.canProceedToNextStep(currentStep),
      missingRequirements: this.getMissingRequirements(currentStep)
    };

    this.salesProgressSubject.next(progress);
    return progress;
  }

  /**
   * Avanza al siguiente paso si es posible
   */
  nextStep(): { success: boolean; message: string; progress?: VoiceSalesProgress } {
    const currentStep = this.currentStepSubject.value;
    
    if (!this.canProceedToNextStep(currentStep)) {
      const missing = this.getMissingRequirements(currentStep);
      return {
        success: false,
        message: `No se puede avanzar. Faltan: ${missing.join(', ')}`
      };
    }

    if (currentStep < this.salesSteps.length) {
      this.currentStepSubject.next(currentStep + 1);
      this.updateSalesProgress();
      this.toastr.success(`Avanzando al paso: ${this.salesSteps[currentStep].name}`, 'Siguiente Paso');
      
      return {
        success: true,
        message: `Paso ${currentStep + 1} completado. Avanzando a: ${this.salesSteps[currentStep].name}`,
        progress: this.getCurrentProgress()
      };
    }

    return {
      success: false,
      message: 'Ya estás en el último paso'
    };
  }

  /**
   * Retrocede al paso anterior
   */
  previousStep(): { success: boolean; message: string; progress?: VoiceSalesProgress } {
    const currentStep = this.currentStepSubject.value;
    
    if (currentStep > 1) {
      this.currentStepSubject.next(currentStep - 1);
      this.updateSalesProgress();
      this.toastr.info(`Retrocediendo al paso: ${this.salesSteps[currentStep - 2].name}`, 'Paso Anterior');
      
      return {
        success: true,
        message: `Retrocediendo al paso: ${this.salesSteps[currentStep - 2].name}`,
        progress: this.getCurrentProgress()
      };
    }

    return {
      success: false,
      message: 'Ya estás en el primer paso'
    };
  }

  /**
   * Navega a un paso específico
   */
  goToStep(stepNumber: number): { success: boolean; message: string; progress?: VoiceSalesProgress } {
    if (stepNumber < 1 || stepNumber > this.salesSteps.length) {
      return {
        success: false,
        message: `Paso inválido. Debe ser entre 1 y ${this.salesSteps.length}`
      };
    }

    if (!this.canAccessStep(stepNumber)) {
      return {
        success: false,
        message: 'No puedes acceder a este paso sin completar los anteriores'
      };
    }

    this.currentStepSubject.next(stepNumber);
    this.updateSalesProgress();
    this.toastr.info(`Navegando al paso: ${this.salesSteps[stepNumber - 1].name}`, 'Navegación');
    
    return {
      success: true,
      message: `Navegando al paso ${stepNumber}: ${this.salesSteps[stepNumber - 1].name}`,
      progress: this.getCurrentProgress()
    };
  }

  /**
   * Obtiene información del paso actual
   */
  getCurrentStepInfo(): VoiceSalesStep | null {
    const currentStep = this.currentStepSubject.value;
    return this.salesSteps.find(step => step.id === currentStep) || null;
  }

  /**
   * Obtiene todos los pasos disponibles
   */
  getAllSteps(): VoiceSalesStep[] {
    return this.salesSteps.map(step => ({
      ...step,
      isActive: step.id === this.currentStepSubject.value,
      isCompleted: this.isStepCompleted(step.id),
      isAccessible: this.canAccessStep(step.id)
    }));
  }

  /**
   * Obtiene el contexto actual de la venta
   */
  getSalesContext(): VoiceSalesContext | null {
    // Aquí implementaremos la lógica para obtener el contexto real
    // Por ahora retornamos null
    return null;
  }

  // === MÉTODOS DE VALIDACIÓN ===

  private canProceedToNextStep(currentStep: number): boolean {
    const missingRequirements = this.getMissingRequirements(currentStep);
    return missingRequirements.length === 0;
  }

  private canAccessStep(stepNumber: number): boolean {
    // Solo se puede acceder a un paso si todos los anteriores están completos
    for (let i = 1; i < stepNumber; i++) {
      if (!this.isStepCompleted(i)) {
        return false;
      }
    }
    return true;
  }

  private isStepCompleted(stepNumber: number): boolean {
    // Implementar lógica de validación según el paso
    switch (stepNumber) {
      case 1: // Bodega
        return this.orderToolsService['bodegaSeleccionada'] !== null;
      case 2: // Productos
        const cart = this.cartService.productInCart.getValue();
        return cart && cart.length > 0;
      case 3: // Cliente
        return this.orderToolsService['pedidoEnProgreso']?.cliente !== null;
      case 4: // Entrega
        return this.orderToolsService['pedidoEnProgreso']?.envio?.direccionEntrega !== null;
      case 5: // Facturación
        return this.orderToolsService['pedidoEnProgreso']?.facturacion?.nombres !== null;
      case 6: // Pago
        return this.orderToolsService['pedidoEnProgreso']?.formaDePago !== null;
      case 7: // Confirmación
        return this.orderToolsService['pedidoEnProgreso']?._id !== null;
      default:
        return false;
    }
  }

  private getMissingRequirements(stepNumber: number): string[] {
    const missing: string[] = [];
    
    switch (stepNumber) {
      case 1:
        if (!this.orderToolsService['bodegaSeleccionada']) {
          missing.push('Seleccionar bodega');
        }
        break;
      case 2:
        const cart = this.cartService.productInCart.getValue();
        if (!cart || cart.length === 0) {
          missing.push('Agregar productos al carrito');
        }
        break;
      case 3:
        if (!this.orderToolsService['pedidoEnProgreso']?.cliente) {
          missing.push('Configurar cliente');
        }
        break;
      case 4:
        if (!this.orderToolsService['pedidoEnProgreso']?.envio?.direccionEntrega) {
          missing.push('Configurar dirección de entrega');
        }
        break;
      case 5:
        if (!this.orderToolsService['pedidoEnProgreso']?.facturacion?.nombres) {
          missing.push('Completar datos de facturación');
        }
        break;
      case 6:
        if (!this.orderToolsService['pedidoEnProgreso']?.formaDePago) {
          missing.push('Seleccionar método de pago');
        }
        break;
      case 7:
        // Verificar que todos los pasos anteriores estén completos
        for (let i = 1; i < 7; i++) {
          if (!this.isStepCompleted(i)) {
            missing.push(`Completar paso ${i}`);
          }
        }
        break;
    }
    
    return missing;
  }

  private getNextAction(currentStep: number): string {
    const stepInfo = this.salesSteps.find(step => step.id === currentStep);
    if (!stepInfo) return 'Paso no encontrado';

    switch (currentStep) {
      case 1:
        return 'Selecciona una bodega usando "selectWarehouse"';
      case 2:
        return 'Agrega productos usando "searchProducts" y "addToCart"';
      case 3:
        return 'Configura el cliente usando "searchClient" o "setClientToOrder"';
      case 4:
        return 'Configura la entrega usando "setDeliveryInfo"';
      case 5:
        return 'Completa la facturación usando "setBillingInfo"';
      case 6:
        return 'Selecciona el método de pago y revisa el resumen';
      case 7:
        return 'Confirma y procesa la venta usando "processSale"';
      default:
        return 'Paso no reconocido';
    }
  }

  private calculateCompletionPercentage(): number {
    const completedSteps = this.salesSteps.filter(step => this.isStepCompleted(step.id)).length;
    return Math.round((completedSteps / this.salesSteps.length) * 100);
  }

  private updateSalesProgress(): void {
    this.salesProgressSubject.next(this.getCurrentProgress());
  }

  // === MÉTODOS DE INTEGRACIÓN CON ORDER TOOLS ===

  /**
   * Ejecuta una herramienta del OrderToolsRegistrarService
   */
  async executeOrderTool(toolName: string, args: any): Promise<any> {
    try {
      // Aquí implementaremos la integración directa con las herramientas
      // Por ahora retornamos un placeholder
      return {
        success: false,
        message: 'Integración con OrderTools en desarrollo',
        toolName,
        args
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        toolName,
        args
      };
    }
  }

  /**
   * Obtiene el estado actual del pedido desde OrderTools
   */
  getOrderStatus(): any {
    try {
      // Acceder al estado del pedido desde OrderTools
      return this.orderToolsService['_getProcessStatus']();
    } catch (error) {
      return {
        success: false,
        error: 'Error al obtener estado del pedido'
      };
    }
  }

  /**
   * Finaliza la sesión de venta por voz
   */
  endVoiceSales(): void {
    this.isActiveSubject.next(false);
    this.toastr.info('Sesión de venta por voz finalizada', 'Agente de Voz');
  }

  /**
   * Reinicia la sesión de venta por voz
   */
  resetVoiceSales(): void {
    this.currentStepSubject.next(1);
    this.updateSalesProgress();
    this.isActiveSubject.next(true);
    this.toastr.info('Sesión de venta por voz reiniciada', 'Agente de Voz');
  }

  // === MÉTODOS DE COMPATIBILIDAD CON FLOATING-BUTTON ===

  /**
   * Inicia una sesión de voz (compatibilidad con floating-button)
   */
  async startVoiceSession(config: any): Promise<void> {
    console.log('🎤 Iniciando sesión de voz con configuración:', config);
    this.isActiveSubject.next(true);
    this.currentStepSubject.next(1);
    this.updateSalesProgress();
    this.toastr.success('Sesión de voz iniciada', 'Agente de Voz');
  }

  /**
   * Detiene la sesión de voz (compatibilidad con floating-button)
   */
  stopVoiceSession(): void {
    console.log('🛑 Deteniendo sesión de voz');
    this.isActiveSubject.next(false);
    this.toastr.info('Sesión de voz detenida', 'Agente de Voz');
  }

  /**
   * Verifica si la sesión está activa (compatibilidad con floating-button)
   */
  isSessionActive(): boolean {
    return this.isActiveSubject.value;
  }

  // === OBSERVABLES DE COMPATIBILIDAD ===

  /**
   * Observable del estado general (compatibilidad con floating-button)
   */
  get state$(): Observable<any> {
    return new Observable(observer => {
      // Combinar múltiples observables en uno solo
      const subscription = this.isActive$.subscribe(isActive => {
        const currentStep = this.currentStepSubject.value;
        const stepInfo = this.getCurrentStepInfo();
        const progress = this.getCurrentProgress();
        
        observer.next({
          isListening: isActive,
          currentText: stepInfo?.description || 'Paso actual',
          isVoiceSalesActive: isActive,
          currentVoiceStep: stepInfo,
          voiceSalesProgress: progress
        });
      });
      
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Observable de pasos visuales (compatibilidad con floating-button)
   */
  get visualSteps$(): Observable<any[]> {
    return new Observable(observer => {
      const subscription = this.currentStep$.subscribe(currentStep => {
        const steps = this.getAllSteps();
        observer.next(steps);
      });
      
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Observable del índice del paso actual (compatibilidad con floating-button)
   */
  get currentStepIndex$(): Observable<number> {
    return this.currentStep$;
  }
}
