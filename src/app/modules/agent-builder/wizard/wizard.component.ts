import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Agent, CreateAgentRequest } from '../shared/models/agent.model';
import { Tool, ToolCatalog } from '../shared/models/tool.model';
import { AgentService } from '../shared/services/agent.service';
import { ToolCatalogService } from '../shared/services/tool-catalog.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  steps: MenuItem[] = [];
  activeStep: number = 0;

  agentConfig: Partial<Agent> = {
    agentName: '',
    department: undefined,
    systemPrompt: '',
    selectedTools: [],
    description: '',
    model: 'gemini-2.5-flash',
    status: 'active'
  };

  toolCatalog: ToolCatalog = {
    sales: [],
    logistics: [],
    inventory: [],
    general: []
  };

  isLoading: boolean = false;

  constructor(
    private agentService: AgentService,
    private toolCatalogService: ToolCatalogService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeSteps();
    this.loadToolCatalog();
  }

  initializeSteps(): void {
    this.steps = [
      {
        label: 'Información Básica',
        icon: 'pi pi-info-circle'
      },
      {
        label: 'System Prompt',
        icon: 'pi pi-file-edit'
      },
      {
        label: 'Herramientas',
        icon: 'pi pi-wrench'
      },
      {
        label: 'Revisar y Crear',
        icon: 'pi pi-check-circle'
      }
    ];
  }

  loadToolCatalog(): void {
    console.log('[WizardComponent] Loading tool catalog from backend...');

    this.toolCatalogService.getToolCatalog().subscribe({
      next: (catalog) => {
        this.toolCatalog = catalog;
        console.log('[WizardComponent] Tool catalog loaded successfully:', {
          sales: catalog.sales?.length || 0,
          logistics: catalog.logistics?.length || 0,
          inventory: catalog.inventory?.length || 0,
          general: catalog.general?.length || 0
        });
      },
      error: (error) => {
        console.error('[WizardComponent] Error loading tool catalog from backend:', error);

        // Fallback to mock catalog if backend fails
        console.warn('[WizardComponent] Falling back to mock catalog...');
        this.toolCatalogService.getMockToolCatalog().subscribe({
          next: (mockCatalog) => {
            this.toolCatalog = mockCatalog;
            this.notificationService.error(
              'Advertencia',
              'Usando catálogo de prueba. El backend no está disponible.'
            );
          },
          error: (mockError) => {
            console.error('[WizardComponent] Error loading mock catalog:', mockError);
            this.notificationService.error('Error', 'Error cargando catálogo de herramientas');
          }
        });
      }
    });
  }

  nextStep(): void {
    if (this.activeStep < this.steps.length - 1) {
      this.activeStep++;
    }
  }

  prevStep(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  goToStep(index: number): void {
    this.activeStep = index;
  }

  createAgent(): void {
    if (!this.validateAgent()) {
      return;
    }

    this.isLoading = true;

    const createRequest: CreateAgentRequest = {
      agentName: this.agentConfig.agentName!,
      department: this.agentConfig.department!,
      systemPrompt: this.agentConfig.systemPrompt!,
      selectedTools: this.agentConfig.selectedTools!,
      description: this.agentConfig.description,
      model: this.agentConfig.model
    };

    this.agentService.createAgent(createRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.notificationService.success('Éxito', 'Agente creado exitosamente');
        this.router.navigate(['/agent-builder/library']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error creating agent:', error);
        this.notificationService.error('Error', 'Error al crear el agente. Por favor intenta nuevamente.');
      }
    });
  }

  validateAgent(): boolean {
    if (!this.agentConfig.agentName || this.agentConfig.agentName.trim() === '') {
      this.notificationService.error('Error', 'El nombre del agente es requerido');
      return false;
    }

    if (!this.agentConfig.department) {
      this.notificationService.error('Error', 'Debes seleccionar un departamento');
      return false;
    }

    if (!this.agentConfig.systemPrompt || this.agentConfig.systemPrompt.trim() === '') {
      this.notificationService.error('Error', 'El system prompt es requerido');
      return false;
    }

    if (!this.agentConfig.selectedTools || this.agentConfig.selectedTools.length === 0) {
      this.notificationService.error('Error', 'Debes seleccionar al menos una herramienta');
      return false;
    }

    return true;
  }

  resetWizard(): void {
    this.activeStep = 0;
    this.agentConfig = {
      agentName: '',
      department: undefined,
      systemPrompt: '',
      selectedTools: [],
      description: '',
      model: 'gemini-2.5-flash',
      status: 'active'
    };
  }
}
