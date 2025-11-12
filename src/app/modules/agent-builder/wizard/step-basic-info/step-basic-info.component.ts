import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Agent } from '../../shared/models/agent.model';
import { DepartmentOption } from '../../shared/models/tool.model';
import { ToolCatalogService } from '../../shared/services/tool-catalog.service';

@Component({
  selector: 'app-step-basic-info',
  templateUrl: './step-basic-info.component.html',
  styleUrls: ['./step-basic-info.component.scss']
})
export class StepBasicInfoComponent {
  @Input() agentConfig!: Partial<Agent>;
  @Output() agentConfigChange = new EventEmitter<Partial<Agent>>();
  @Output() next = new EventEmitter<void>();

  departments: DepartmentOption[] = [];
  touched: boolean = false;

  constructor(private toolCatalogService: ToolCatalogService) {
    this.departments = this.toolCatalogService.getDepartmentOptions();
  }

  onNext(): void {
    this.touched = true;
    if (this.isValid()) {
      this.agentConfigChange.emit(this.agentConfig);
      this.next.emit();
    }
  }

  isValid(): boolean {
    return !!(
      this.agentConfig.agentName &&
      this.agentConfig.agentName.trim() !== '' &&
      this.agentConfig.department
    );
  }

  onInputChange(): void {
    this.agentConfigChange.emit(this.agentConfig);
  }
}
