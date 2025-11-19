import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Agent, DepartmentType } from '../shared/models/agent.model';
import { DepartmentOption } from '../shared/models/tool.model';
import { AgentService } from '../shared/services/agent.service';
import { ToolCatalogService } from '../shared/services/tool-catalog.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  providers: [ConfirmationService]
})
export class LibraryComponent implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];

  // Filters
  filterDepartment: DepartmentType | 'all' = 'all';
  searchTerm: string = '';

  departments: DepartmentOption[] = [];
  isLoading: boolean = false;

  constructor(
    private agentService: AgentService,
    private toolCatalogService: ToolCatalogService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadDepartments();
    this.loadAgents();
  }

  loadDepartments(): void {
    this.departments = this.toolCatalogService.getDepartmentOptions();
  }

  loadAgents(): void {
    this.isLoading = true;
    this.agentService.listAgents().subscribe({
      next: (response) => {
        this.agents = response.agents || [];
        this.filterAgents();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading agents:', error);
        this.notificationService.error('Error', 'Could not load agents');
        this.isLoading = false;
      }
    });
  }

  setDepartment(dept: DepartmentType | 'all'): void {
    this.filterDepartment = dept;
    this.filterAgents();
  }

  filterAgents(): void {
    let result = [...this.agents];

    // Department Filter
    if (this.filterDepartment !== 'all') {
      result = result.filter(agent => agent.department === this.filterDepartment);
    }

    // Search Filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(agent =>
        agent.agentName.toLowerCase().includes(term) ||
        (agent.description && agent.description.toLowerCase().includes(term))
      );
    }

    this.filteredAgents = result;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterDepartment = 'all';
    this.filterAgents();
  }

  executeAgent(agent: Agent): void {
    if (!agent.id) return;
    this.router.navigate(['/agent-builder/general-chat'], { state: { selectedAgentId: agent.agentName } });
  }

  editAgent(agent: Agent): void {
    this.router.navigate(['/agent-builder/wizard'], { state: { agentToEdit: agent } });
  }


  createNewAgent(): void {
    this.router.navigate(['/agent-builder/wizard']);
  }

  goToGeneralChat(): void {
    this.router.navigate(['/agent-builder/general-chat']);
  }

  deleteAgent(agent: Agent): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${agent.agentName}"?`,
      header: 'Delete Agent',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-text',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        if (!agent.id) return;
        this.agentService.deleteAgent(agent.id).subscribe({
          next: () => {
            this.notificationService.success('Success', 'Agent deleted');
            this.loadAgents();
          },
          error: () => this.notificationService.error('Error', 'Could not delete agent')
        });
      }
    });
  }

  toggleAgentStatus(agent: Agent): void {
    if (!agent.id) return;
    this.agentService.toggleAgentStatus(agent.id).subscribe({
      next: (response) => {
        const status = response.agent.status === 'active' ? 'activated' : 'deactivated';
        this.notificationService.success('Success', `Agent ${status}`);
        this.loadAgents();
      },
      error: () => this.notificationService.error('Error', 'Could not update status')
    });
  }
}
