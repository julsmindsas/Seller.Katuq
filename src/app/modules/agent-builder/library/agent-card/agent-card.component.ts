import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Agent } from '../../shared/models/agent.model';
import { ToolCatalogService } from '../../shared/services/tool-catalog.service';

@Component({
  selector: 'app-agent-card',
  templateUrl: './agent-card.component.html',
  styleUrls: ['./agent-card.component.scss']
})
export class AgentCardComponent {
  @Input() agent!: Agent;
  @Output() execute = new EventEmitter<Agent>();
  @Output() delete = new EventEmitter<Agent>();
  @Output() toggleStatus = new EventEmitter<Agent>();

  constructor(private toolCatalogService: ToolCatalogService) {}

  onExecute(): void {
    this.execute.emit(this.agent);
  }

  onDelete(): void {
    this.delete.emit(this.agent);
  }

  onToggleStatus(): void {
    this.toggleStatus.emit(this.agent);
  }

  getDepartmentIcon(): string {
    return this.toolCatalogService.getDepartmentIcon(this.agent.department);
  }

  getDepartmentColor(): string {
    return this.toolCatalogService.getDepartmentColor(this.agent.department);
  }

  getDepartmentLabel(): string {
    const labels: Record<string, string> = {
      sales: 'Ventas',
      logistics: 'Logística',
      inventory: 'Inventario'
    };
    return labels[this.agent.department] || '';
  }

  getGradientClass(): string {
    const gradients: Record<string, string> = {
      sales: 'gradient-sales',
      logistics: 'gradient-logistics',
      inventory: 'gradient-inventory'
    };
    return gradients[this.agent.department] || 'gradient-default';
  }

  getExecutionsCount(): number {
    return this.agent.metadata?.totalExecutions || 0;
  }

  getToolsCount(): number {
    return this.agent.selectedTools?.length || 0;
  }

  getLastExecuted(): string {
    if (!this.agent.metadata?.lastExecuted) {
      return 'Nunca';
    }

    const date = new Date(this.agent.metadata.lastExecuted);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-CO');
    }
  }

  getVisibleTools(): string[] {
    return this.agent.selectedTools?.slice(0, 3) || [];
  }

  getRemainingToolsCount(): number {
    const total = this.agent.selectedTools?.length || 0;
    return Math.max(0, total - 3);
  }
}
