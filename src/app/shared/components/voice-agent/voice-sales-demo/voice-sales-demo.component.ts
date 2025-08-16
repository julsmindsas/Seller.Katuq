import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { VoiceSalesWizardComponent } from '../voice-sales-wizard/voice-sales-wizard.component';
import { VoiceAgentSalesService } from '../../../services/voice-agent/voice-agent-sales.service';
import { VoiceSalesIntegrationService } from '../../../services/voice-agent/voice-sales-integration.service';
import { OrderToolsRegistrarService } from '../../../services/tools/order-tools-registrar';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-voice-sales-demo',
  templateUrl: './voice-sales-demo.component.html',
  styleUrls: ['./voice-sales-demo.component.scss']
})
export class VoiceSalesDemoComponent implements OnInit, OnDestroy {
  
  // Estado del demo
  isDemoActive: boolean = false;
  currentDemoStep: string = '';
  demoProgress: number = 0;
  
  // Configuración del demo
  demoSteps = [
    {
      id: 'start',
      name: 'Iniciar Demo',
      description: 'Configurar el sistema para demostración',
      command: 'Iniciar demostración de ventas por voz'
    },
    {
      id: 'warehouse',
      name: 'Seleccionar Bodega',
      description: 'Elegir una bodega para la venta',
      command: 'Seleccionar bodega 1'
    },
    {
      id: 'products',
      name: 'Buscar Productos',
      description: 'Encontrar productos disponibles',
      command: 'Buscar productos camisetas'
    },
    {
      id: 'add-to-cart',
      name: 'Agregar al Carrito',
      description: 'Agregar productos seleccionados',
      command: 'Agregar al carrito 123 2'
    },
    {
      id: 'client',
      name: 'Configurar Cliente',
      description: 'Crear o buscar cliente',
      command: 'Crear cliente Juan Pérez 12345678'
    },
    {
      id: 'delivery',
      name: 'Configurar Entrega',
      description: 'Definir dirección de entrega',
      command: 'Configurar entrega Calle 123 #45-67'
    },
    {
      id: 'billing',
      name: 'Configurar Facturación',
      description: 'Completar datos de facturación',
      command: 'Configurar facturación Juan Pérez 12345678'
    },
    {
      id: 'process',
      name: 'Procesar Venta',
      description: 'Finalizar y procesar la venta',
      command: 'Procesar venta'
    }
  ];

  // Subscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private voiceSalesService: VoiceAgentSalesService,
    private voiceIntegrationService: VoiceSalesIntegrationService,
    private orderToolsService: OrderToolsRegistrarService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeDemo();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeDemo(): void {
    // Suscribirse al progreso de ventas
    this.subscriptions.push(
      this.voiceSalesService.salesProgress$.subscribe(progress => {
        if (progress) {
          this.demoProgress = progress.completionPercentage;
          this.updateDemoStep(progress.currentStep);
        }
      })
    );

    // Suscribirse al estado activo
    this.subscriptions.push(
      this.voiceSalesService.isActive$.subscribe(active => {
        this.isDemoActive = active;
      })
    );
  }

  // === MÉTODOS DEL DEMO ===

  /**
   * Inicia la demostración completa
   */
  startFullDemo(): void {
    this.isDemoActive = true;
    this.currentDemoStep = 'start';
    this.demoProgress = 0;
    
    this.toastr.info('Iniciando demostración completa de ventas por voz', 'Demo Iniciado');
    
    // Iniciar el servicio de ventas por voz
    this.voiceSalesService.startVoiceSales();
    
    // Ejecutar el primer paso automáticamente
    setTimeout(() => {
      this.executeDemoStep('warehouse');
    }, 1000);
  }

  /**
   * Ejecuta un paso específico del demo
   */
  async executeDemoStep(stepId: string): Promise<void> {
    const step = this.demoSteps.find(s => s.id === stepId);
    if (!step) return;

    this.currentDemoStep = stepId;
    this.toastr.info(`Ejecutando: ${step.name}`, 'Demo en Progreso');

    try {
      // Ejecutar el comando correspondiente al paso
      const result = await this.voiceIntegrationService.executeVoiceCommand(
        step.command,
        this.parseDemoCommand(step.command)
      );

      if (result.success) {
        this.toastr.success(`${step.name} completado exitosamente`, 'Demo Exitoso');
        
        // Avanzar al siguiente paso automáticamente
        this.advanceToNextDemoStep(stepId);
      } else {
        this.toastr.error(`Error en ${step.name}: ${result.message}`, 'Demo Fallido');
      }
    } catch (error: any) {
      this.toastr.error(`Error ejecutando demo: ${error.message}`, 'Error en Demo');
    }
  }

  /**
   * Avanza al siguiente paso del demo
   */
  private advanceToNextDemoStep(currentStepId: string): void {
    const currentIndex = this.demoSteps.findIndex(s => s.id === currentStepId);
    if (currentIndex < this.demoSteps.length - 1) {
      const nextStep = this.demoSteps[currentIndex + 1];
      
      // Esperar un poco antes de ejecutar el siguiente paso
      setTimeout(() => {
        this.executeDemoStep(nextStep.id);
      }, 2000);
    } else {
      // Demo completado
      this.completeDemo();
    }
  }

  /**
   * Completa la demostración
   */
  private completeDemo(): void {
    this.isDemoActive = false;
    this.currentDemoStep = 'completed';
    this.demoProgress = 100;
    
    this.toastr.success('¡Demostración completada exitosamente!', 'Demo Finalizado');
    
    // Mostrar resumen del demo
    this.showDemoSummary();
  }

  /**
   * Muestra el resumen de la demostración
   */
  private showDemoSummary(): void {
    const summary = {
      title: 'Resumen de la Demostración',
      message: 'Se ha completado exitosamente una venta completa usando comandos de voz',
      steps: this.demoSteps.length,
      completed: this.demoSteps.length,
      success: true
    };

    // Aquí podrías mostrar un modal o notificación con el resumen
    console.log('Demo Summary:', summary);
  }

  /**
   * Parsea un comando de demo para extraer argumentos
   */
  private parseDemoCommand(command: string): any {
    const args: any = {};

    if (command.includes('Seleccionar bodega')) {
      const match = command.match(/(\d+)/);
      if (match) {
        args.warehouseId = match[1];
      }
    }

    if (command.includes('Buscar productos')) {
      const searchTerms = ['Buscar productos', 'Buscar producto'];
      for (const term of searchTerms) {
        if (command.includes(term)) {
          args.query = command.substring(command.indexOf(term) + term.length).trim();
          break;
        }
      }
    }

    if (command.includes('Agregar al carrito')) {
      const match = command.match(/(\d+)/g);
      if (match && match.length >= 1) {
        args.productId = match[0];
        if (match.length >= 2) {
          args.quantity = parseInt(match[1]);
        }
      }
    }

    if (command.includes('Crear cliente')) {
      const nameMatch = command.match(/cliente\s+([^0-9]+)/i);
      const docMatch = command.match(/(\d+)/);
      
      if (nameMatch) {
        args.name = nameMatch[1].trim();
      }
      if (docMatch) {
        args.document = docMatch[1];
      }
    }

    if (command.includes('Configurar entrega')) {
      const addressMatch = command.match(/entrega\s+(.+)/i);
      if (addressMatch) {
        args.address = addressMatch[1].trim();
      }
    }

    if (command.includes('Configurar facturación')) {
      const nameMatch = command.match(/facturación\s+([^0-9]+)/i);
      const docMatch = command.match(/(\d+)/);
      
      if (nameMatch) {
        args.businessName = nameMatch[1].trim();
      }
      if (docMatch) {
        args.document = docMatch[1];
      }
    }

    return args;
  }

  /**
   * Actualiza el paso actual del demo
   */
  private updateDemoStep(stepNumber: number): void {
    if (stepNumber >= 1 && stepNumber <= this.demoSteps.length) {
      const step = this.demoSteps[stepNumber - 1];
      this.currentDemoStep = step.id;
    }
  }

  /**
   * Ejecuta un paso específico manualmente
   */
  executeStepManually(stepId: string): void {
    this.executeDemoStep(stepId);
  }

  /**
   * Reinicia la demostración
   */
  resetDemo(): void {
    this.isDemoActive = false;
    this.currentDemoStep = '';
    this.demoProgress = 0;
    
    // Reiniciar el servicio de ventas por voz
    this.voiceSalesService.resetVoiceSales();
    
    this.toastr.info('Demostración reiniciada', 'Demo Reiniciado');
  }

  /**
   * Obtiene el estado visual del paso del demo
   */
  getDemoStepStatus(stepId: string): string {
    if (stepId === this.currentDemoStep) return 'active';
    
    const stepIndex = this.demoSteps.findIndex(s => s.id === stepId);
    const currentIndex = this.demoSteps.findIndex(s => s.id === this.currentDemoStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  }

  /**
   * Obtiene el icono para el estado del paso
   */
  getDemoStepIcon(stepId: string): string {
    const status = this.getDemoStepStatus(stepId);
    
    switch (status) {
      case 'completed': return 'fa-check-circle';
      case 'active': return 'fa-play-circle';
      case 'pending': return 'fa-clock';
      default: return 'fa-circle';
    }
  }

  /**
   * Obtiene la clase CSS para el estado del paso
   */
  getDemoStepClass(stepId: string): string {
    const status = this.getDemoStepStatus(stepId);
    return `demo-step-${status}`;
  }

  /**
   * Navega al wizard completo
   */
  openFullWizard(): void {
    this.router.navigate(['/voice-sales-wizard']);
  }

  /**
   * Obtiene el progreso del demo en porcentaje
   */
  getDemoProgressPercentage(): number {
    if (this.demoSteps.length === 0) return 0;
    
    const completedSteps = this.demoSteps.filter(step => 
      this.getDemoStepStatus(step.id) === 'completed'
    ).length;
    
    return Math.round((completedSteps / this.demoSteps.length) * 100);
  }

  /**
   * Verifica si el demo está en progreso
   */
  isDemoInProgress(): boolean {
    return this.isDemoActive && this.currentDemoStep !== '' && this.currentDemoStep !== 'completed';
  }

  /**
   * Obtiene el mensaje de estado actual del demo
   */
  getCurrentDemoStatus(): string {
    if (!this.isDemoActive) return 'Demo no iniciado';
    if (this.currentDemoStep === 'completed') return 'Demo completado';
    if (this.currentDemoStep === '') return 'Iniciando demo...';
    
    const currentStep = this.demoSteps.find(s => s.id === this.currentDemoStep);
    return currentStep ? `Ejecutando: ${currentStep.name}` : 'Demo en progreso';
  }
}
