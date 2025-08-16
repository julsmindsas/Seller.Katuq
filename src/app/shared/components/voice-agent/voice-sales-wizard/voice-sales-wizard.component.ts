import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { VoiceAgentSalesService, VoiceSalesStep, VoiceSalesProgress } from '../../../services/voice-agent/voice-agent-sales.service';
import { VoiceSalesIntegrationService, VoiceSalesExecutionResult } from '../../../services/voice-agent/voice-sales-integration.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-voice-sales-wizard',
  templateUrl: './voice-sales-wizard.component.html',
  styleUrls: ['./voice-sales-wizard.component.scss']
})
export class VoiceSalesWizardComponent implements OnInit, OnDestroy {
  @ViewChild('voiceInput', { static: false }) voiceInput!: ElementRef<HTMLInputElement>;
  
  // Estado del wizard
  currentStep: number = 1;
  totalSteps: number = 7;
  completionPercentage: number = 0;
  isActive: boolean = false;
  isProcessing: boolean = false;
  
  // Datos del paso actual
  currentStepInfo: VoiceSalesStep | null = null;
  salesProgress: VoiceSalesProgress | null = null;
  
  // Estado de la interfaz
  showVoiceInput: boolean = false;
  voiceCommand: string = '';
  lastResult: VoiceSalesExecutionResult | null = null;
  commandHistory: any[] = [];
  
  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private voiceSalesService: VoiceAgentSalesService,
    private voiceIntegrationService: VoiceSalesIntegrationService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeSubscriptions();
    this.startVoiceSales();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeSubscriptions(): void {
    // Suscribirse al paso actual
    this.subscriptions.push(
      this.voiceSalesService.currentStep$.subscribe(step => {
        this.currentStep = step;
        this.currentStepInfo = this.voiceSalesService.getCurrentStepInfo();
      })
    );

    // Suscribirse al progreso de ventas
    this.subscriptions.push(
      this.voiceSalesService.salesProgress$.subscribe(progress => {
        this.salesProgress = progress;
        if (progress) {
          this.completionPercentage = progress.completionPercentage;
        }
      })
    );

    // Suscribirse al estado activo
    this.subscriptions.push(
      this.voiceSalesService.isActive$.subscribe(active => {
        this.isActive = active;
      })
    );

    // Suscribirse al procesamiento de comandos
    this.subscriptions.push(
      this.voiceIntegrationService.isProcessing$.subscribe(processing => {
        this.isProcessing = processing;
      })
    );

    // Suscribirse al último resultado
    this.subscriptions.push(
      this.voiceIntegrationService.lastResult$.subscribe(result => {
        this.lastResult = result;
        if (result) {
          this.handleCommandResult(result);
        }
      })
    );

    // Suscribirse al historial de comandos
    this.subscriptions.push(
      this.voiceIntegrationService.commandHistory$.subscribe(history => {
        this.commandHistory = history;
      })
    );
  }

  // === MÉTODOS PRINCIPALES ===

  /**
   * Inicia la sesión de ventas por voz
   */
  startVoiceSales(): void {
    this.voiceSalesService.startVoiceSales();
    this.showVoiceInput = true;
    this.toastr.success('Sesión de ventas por voz iniciada', 'Agente de Voz');
  }

  /**
   * Finaliza la sesión de ventas por voz
   */
  endVoiceSales(): void {
    this.voiceSalesService.endVoiceSales();
    this.showVoiceInput = false;
    this.toastr.info('Sesión de ventas por voz finalizada', 'Agente de Voz');
  }

  /**
   * Reinicia la sesión de ventas por voz
   */
  resetVoiceSales(): void {
    this.voiceSalesService.resetVoiceSales();
    this.voiceCommand = '';
    this.lastResult = null;
    this.toastr.info('Sesión de ventas por voz reiniciada', 'Agente de Voz');
  }

  /**
   * Ejecuta un comando de voz
   */
  async executeVoiceCommand(): Promise<void> {
    if (!this.voiceCommand.trim()) {
      this.toastr.warning('Ingresa un comando de voz', 'Comando Requerido');
      return;
    }

    try {
      const result = await this.voiceIntegrationService.executeVoiceCommand(
        this.voiceCommand.trim(),
        this.parseCommandArgs(this.voiceCommand.trim())
      );

      if (result.success) {
        this.toastr.success(result.message, 'Comando Ejecutado');
        this.voiceCommand = '';
      } else {
        this.toastr.error(result.message, 'Error en Comando');
      }
    } catch (error: any) {
      this.toastr.error(`Error al ejecutar comando: ${error.message}`, 'Error');
    }
  }

  /**
   * Navega al siguiente paso
   */
  nextStep(): void {
    const result = this.voiceSalesService.nextStep();
    if (result.success) {
      this.toastr.success(result.message, 'Siguiente Paso');
    } else {
      this.toastr.warning(result.message, 'No se puede avanzar');
    }
  }

  /**
   * Navega al paso anterior
   */
  previousStep(): void {
    const result = this.voiceSalesService.previousStep();
    if (result.success) {
      this.toastr.info(result.message, 'Paso Anterior');
    } else {
      this.toastr.warning(result.message, 'No se puede retroceder');
    }
  }

  /**
   * Navega a un paso específico
   */
  goToStep(stepNumber: number): void {
    const result = this.voiceSalesService.goToStep(stepNumber);
    if (result.success) {
      this.toastr.info(result.message, 'Navegación');
    } else {
      this.toastr.warning(result.message, 'Navegación Fallida');
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Parsea los argumentos de un comando de voz
   */
  private parseCommandArgs(command: string): any {
    const args: any = {};
    
    // Comandos simples sin argumentos
    if (['nextstep', 'siguiente paso', 'avanzar', 'previousstep', 'paso anterior', 'retroceder'].includes(command.toLowerCase())) {
      return args;
    }

    // Comandos con argumentos específicos
    if (command.toLowerCase().includes('seleccionar bodega') || command.toLowerCase().includes('cambiar bodega')) {
      // Extraer ID de bodega del comando
      const match = command.match(/(\d+)/);
      if (match) {
        args.warehouseId = match[1];
      }
    }

    if (command.toLowerCase().includes('buscar productos') || command.toLowerCase().includes('buscar producto')) {
      // Extraer término de búsqueda
      const searchTerms = ['buscar productos', 'buscar producto'];
      for (const term of searchTerms) {
        if (command.toLowerCase().includes(term)) {
          args.query = command.substring(command.toLowerCase().indexOf(term) + term.length).trim();
          break;
        }
      }
    }

    if (command.toLowerCase().includes('agregar al carrito') || command.toLowerCase().includes('añadir al carrito')) {
      // Extraer ID de producto y cantidad
      const match = command.match(/(\d+)/g);
      if (match && match.length >= 1) {
        args.productId = match[0];
        if (match.length >= 2) {
          args.quantity = parseInt(match[1]);
        }
      }
    }

    if (command.toLowerCase().includes('buscar cliente') || command.toLowerCase().includes('encontrar cliente')) {
      // Extraer documento del cliente
      const match = command.match(/(\d+)/);
      if (match) {
        args.document = match[1];
      }
    }

    if (command.toLowerCase().includes('configurar cliente') || command.toLowerCase().includes('crear cliente')) {
      // Extraer nombre y documento
      const nameMatch = command.match(/cliente\s+([^0-9]+)/i);
      const docMatch = command.match(/(\d+)/);
      
      if (nameMatch) {
        args.name = nameMatch[1].trim();
      }
      if (docMatch) {
        args.document = docMatch[1];
      }
    }

    if (command.toLowerCase().includes('configurar entrega') || command.toLowerCase().includes('dirección de entrega')) {
      // Extraer dirección
      const addressMatch = command.match(/entrega\s+(.+)/i);
      if (addressMatch) {
        args.address = addressMatch[1].trim();
      }
    }

    if (command.toLowerCase().includes('configurar facturación') || command.toLowerCase().includes('datos de facturación')) {
      // Extraer datos de facturación
      const nameMatch = command.match(/facturación\s+([^0-9]+)/i);
      const docMatch = command.match(/(\d+)/);
      
      if (nameMatch) {
        args.businessName = nameMatch[1].trim();
      }
      if (docMatch) {
        args.document = docMatch[1];
      }
    }

    if (command.toLowerCase().includes('ir al paso') || command.toLowerCase().includes('navegar a')) {
      // Extraer número de paso
      const match = command.match(/(\d+)/);
      if (match) {
        args.stepNumber = parseInt(match[1]);
      }
    }

    return args;
  }

  /**
   * Maneja el resultado de un comando ejecutado
   */
  private handleCommandResult(result: VoiceSalesExecutionResult): void {
    if (result.success) {
      // Actualizar la interfaz según el resultado
      if (result.progress) {
        this.completionPercentage = result.progress.completionPercentage;
      }
    }
  }

  /**
   * Obtiene la clase CSS para el estado de un paso
   */
  getStepClass(step: VoiceSalesStep): string {
    if (step.isActive) return 'active';
    if (step.isCompleted) return 'completed';
    if (step.isAccessible) return 'accessible';
    return 'locked';
  }

  /**
   * Obtiene el icono para el estado de un paso
   */
  getStepIcon(step: VoiceSalesStep): string {
    if (step.isCompleted) return 'fa-check-circle';
    if (step.isActive) return 'fa-play-circle';
    return step.icon;
  }

  /**
   * Verifica si se puede navegar a un paso
   */
  canNavigateToStep(stepNumber: number): boolean {
    return this.voiceSalesService['canAccessStep'](stepNumber);
  }

  /**
   * Obtiene el mensaje de ayuda para el paso actual
   */
  getCurrentStepHelp(): string {
    if (!this.currentStepInfo) return '';
    
    switch (this.currentStepInfo.key) {
      case 'warehouse':
        return 'Di: "Seleccionar bodega [número]" o "Cambiar bodega [número]"';
      case 'products':
        return 'Di: "Buscar productos [nombre]" o "Agregar al carrito [ID] [cantidad]"';
      case 'client':
        return 'Di: "Buscar cliente [documento]" o "Crear cliente [nombre] [documento]"';
      case 'delivery':
        return 'Di: "Configurar entrega [dirección]"';
      case 'billing':
        return 'Di: "Configurar facturación [nombre] [documento]"';
      case 'payment':
        return 'Di: "Procesar venta" o "Confirmar venta"';
      case 'confirmation':
        return 'Di: "Finalizar venta" para completar el proceso';
      default:
        return 'Usa comandos de voz para navegar por el proceso de venta';
    }
  }

  /**
   * Obtiene comandos de ejemplo para el paso actual
   */
  getExampleCommands(): string[] {
    if (!this.currentStepInfo) return [];
    
    switch (this.currentStepInfo.key) {
      case 'warehouse':
        return [
          'Seleccionar bodega 1',
          'Cambiar bodega 2',
          'Ver bodegas disponibles'
        ];
      case 'products':
        return [
          'Buscar productos camisetas',
          'Agregar al carrito 123 2',
          'Ver productos disponibles'
        ];
      case 'client':
        return [
          'Buscar cliente 12345678',
          'Crear cliente Juan Pérez 12345678',
          'Configurar cliente nuevo'
        ];
      case 'delivery':
        return [
          'Configurar entrega Calle 123 #45-67',
          'Dirección de entrega Avenida Principal 100',
          'Configurar entrega a domicilio'
        ];
      case 'billing':
        return [
          'Configurar facturación Juan Pérez 12345678',
          'Datos de facturación Empresa ABC 98765432',
          'Configurar facturación electrónica'
        ];
      case 'payment':
        return [
          'Procesar venta',
          'Confirmar venta',
          'Finalizar pedido'
        ];
      case 'confirmation':
        return [
          'Finalizar venta',
          'Completar pedido',
          'Confirmar venta'
        ];
      default:
        return [
          'Siguiente paso',
          'Paso anterior',
          'Ver estado actual'
        ];
    }
  }

  /**
   * Ejecuta un comando de ejemplo
   */
  executeExampleCommand(command: string): void {
    this.voiceCommand = command;
    this.executeVoiceCommand();
  }

  /**
   * Limpia el historial de comandos
   */
  clearCommandHistory(): void {
    this.voiceIntegrationService.clearCommandHistory();
    this.toastr.info('Historial de comandos limpiado', 'Historial');
  }

  /**
   * Obtiene el estado del botón de siguiente paso
   */
  getNextStepButtonState(): { disabled: boolean; text: string; icon: string } {
    if (!this.salesProgress) {
      return { disabled: true, text: 'Cargando...', icon: 'fa-spinner fa-spin' };
    }

    if (this.salesProgress.canProceed) {
      return { disabled: false, text: 'Siguiente Paso', icon: 'fa-arrow-right' };
    } else {
      return { disabled: true, text: 'Completar Requisitos', icon: 'fa-exclamation-triangle' };
    }
  }

  /**
   * Obtiene el estado del botón de paso anterior
   */
  getPreviousStepButtonState(): { disabled: boolean; text: string; icon: string } {
    if (this.currentStep <= 1) {
      return { disabled: true, text: 'Primer Paso', icon: 'fa-home' };
    } else {
      return { disabled: false, text: 'Paso Anterior', icon: 'fa-arrow-left' };
    }
  }
}
