import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Agent, DepartmentType } from '../shared/models/agent.model';
import { DepartmentOption } from '../shared/models/tool.model';
import { AgentService } from '../shared/services/agent.service';
import { ToolCatalogService } from '../shared/services/tool-catalog.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  providers: [ConfirmationService]
})
export class LibraryComponent implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  filterDepartment: DepartmentType | 'all' = 'all';
  departments: DepartmentOption[] = [];
  isLoading: boolean = false;

  constructor(
    private agentService: AgentService,
    private toolCatalogService: ToolCatalogService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.loadAgents();
  }

  loadDepartments(): void {
    this.departments = [
      { label: 'Todos', value: 'all' as any, icon: 'pi-th-large', color: '#667eea' },
      ...this.toolCatalogService.getDepartmentOptions()
    ];
  }

  loadAgents(): void {
    this.isLoading = true;

    this.agentService.listAgents().subscribe({
      next: (response) => {
        this.isLoading = false;
        this.agents = response.agents || [];
        this.filterAgents();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading agents:', error);
        this.notificationService.error('Error', 'Error al cargar los agentes');
        // For development, show empty state
        this.agents = [];
        this.filteredAgents = [];
      }
    });
  }

  filterAgents(): void {
    if (this.filterDepartment === 'all') {
      this.filteredAgents = [...this.agents];
    } else {
      this.filteredAgents = this.agents.filter(
        agent => agent.department === this.filterDepartment
      );
    }
  }

  onDepartmentFilterChange(): void {
    this.filterAgents();
  }

  executeAgent(agent: Agent): void {
    if (!agent.id) return;
    this.router.navigate(['/agent-builder/executor', agent.id]);
  }

  deleteAgent(agent: Agent): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el agente "${agent.agentName}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (!agent.id) return;

        this.agentService.deleteAgent(agent.id).subscribe({
          next: (response) => {
            this.notificationService.success('Éxito', 'Agente eliminado exitosamente');
            this.loadAgents(); // Reload agents list
          },
          error: (error) => {
            console.error('Error deleting agent:', error);
            this.notificationService.error('Error', 'Error al eliminar el agente');
          }
        });
      }
    });
  }

  toggleAgentStatus(agent: Agent): void {
    if (!agent.id) return;

    this.agentService.toggleAgentStatus(agent.id).subscribe({
      next: (response) => {
        const newStatus = response.agent.status;
        const message = newStatus === 'active'
          ? 'Agente activado'
          : 'Agente desactivado';
        this.notificationService.success('Éxito', message);
        this.loadAgents(); // Reload to get updated data
      },
      error: (error) => {
        console.error('Error toggling agent status:', error);
        this.notificationService.error('Error', 'Error al cambiar el estado del agente');
      }
    });
  }

  createNewAgent(): void {
    this.router.navigate(['/agent-builder/wizard']);
  }
}
