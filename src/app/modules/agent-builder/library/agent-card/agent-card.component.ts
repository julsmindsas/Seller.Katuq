import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Agent } from '../../shared/models/agent.model';
import { ToolCatalogService } from '../../shared/services/tool-catalog.service';

@Component({
  selector: 'app-agent-card',
  templateUrl: './agent-card.component.html',
  styleUrls: ['./agent-card.component.scss']
})
export class AgentCardComponent implements OnInit {
  @Input() agent!: Agent;
  @Output() execute = new EventEmitter<Agent>();
  @Output() delete = new EventEmitter<Agent>();
  @Output() toggleStatus = new EventEmitter<Agent>();
  @Output() edit = new EventEmitter<Agent>();

  menuItems: MenuItem[] = [];

  constructor(private toolCatalogService: ToolCatalogService) { }

  ngOnInit(): void {
    this.updateMenuItems();
  }

  updateMenuItems(): void {
    this.menuItems = [
      {
        label: this.agent.status === 'active' ? 'Deactivate' : 'Activate',
        icon: this.agent.status === 'active' ? 'pi pi-power-off' : 'pi pi-check-circle',
        command: () => this.onToggleStatus()
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.onEdit()
      },
      {
        separator: true
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'text-red-500',
        command: () => this.onDelete()
      }
    ];
  }

  onExecute(): void {
    this.execute.emit(this.agent);
  }

  onDelete(): void {
    this.delete.emit(this.agent);
  }

  onToggleStatus(): void {
    this.toggleStatus.emit(this.agent);
    // Update menu label after toggle (optimistic update, parent will reload)
    setTimeout(() => this.updateMenuItems(), 100);
  }

  onEdit(): void {
    this.edit.emit(this.agent);
  }

  getDepartmentIcon(): string {
    return this.toolCatalogService.getDepartmentIcon(this.agent.department);
  }

  getDepartmentColor(): string {
    return this.toolCatalogService.getDepartmentColor(this.agent.department);
  }

  getDepartmentLabel(): string {
    const labels: Record<string, string> = {
      sales: 'Sales',
      logistics: 'Logistics',
      inventory: 'Inventory'
    };
    return labels[this.agent.department] || this.agent.department;
  }

  getExecutionsCount(): number {
    return this.agent.metadata?.totalExecutions || 0;
  }

  getToolsCount(): number {
    return this.agent.selectedTools?.length || 0;
  }

  getLastExecuted(): string {
    if (!this.agent.metadata?.lastExecuted) {
      return 'Never';
    }

    const date = new Date(this.agent.metadata.lastExecuted);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
