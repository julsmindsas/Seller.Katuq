import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Agent } from '../../shared/models/agent.model';
import { ToolCatalogService } from '../../shared/services/tool-catalog.service';

@Component({
  selector: 'app-step-review',
  templateUrl: './step-review.component.html',
  styleUrls: ['./step-review.component.scss']
})
export class StepReviewComponent {
  @Input() agentConfig!: Partial<Agent>;
  @Input() isLoading: boolean = false;
  @Output() back = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();

  constructor(private toolCatalogService: ToolCatalogService) {}

  onBack(): void {
    this.back.emit();
  }

  onCreate(): void {
    this.create.emit();
  }

  getDepartmentIcon(): string {
    if (!this.agentConfig.department) return 'pi pi-cog';
    return this.toolCatalogService.getDepartmentIcon(this.agentConfig.department);
  }

  getDepartmentColor(): string {
    if (!this.agentConfig.department) return '#667eea';
    return this.toolCatalogService.getDepartmentColor(this.agentConfig.department);
  }

  getDepartmentLabel(): string {
    const labels: Record<string, string> = {
      sales: 'Ventas',
      logistics: 'Logística',
      inventory: 'Inventario'
    };
    return labels[this.agentConfig.department || ''] || '';
  }

  getModelLabel(): string {
    const labels: Record<string, string> = {
      'gemini-2.5-flash': 'Gemini 2.5 Flash (Rápido)',
      'gemini-2.5-pro': 'Gemini 2.5 Pro (Avanzado)'
    };
    return labels[this.agentConfig.model || ''] || '';
  }
}
