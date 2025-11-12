import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Agent } from '../../shared/models/agent.model';
import { Tool, ToolCatalog } from '../../shared/models/tool.model';

@Component({
  selector: 'app-step-tools',
  templateUrl: './step-tools.component.html',
  styleUrls: ['./step-tools.component.scss']
})
export class StepToolsComponent implements OnInit {
  @Input() agentConfig!: Partial<Agent>;
  @Input() toolCatalog!: ToolCatalog;
  @Output() agentConfigChange = new EventEmitter<Partial<Agent>>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  availableTools: Tool[] = [];
  filteredTools: Tool[] = [];
  searchQuery: string = '';
  selectedCategory: string = 'all';

  categories = [
    { label: 'Todas', value: 'all', icon: 'pi-th-large' },
    { label: 'Acceso a Datos', value: 'data-access', icon: 'pi-database' },
    { label: 'Análisis', value: 'analytics', icon: 'pi-chart-bar' },
    { label: 'Automatización', value: 'automation', icon: 'pi-cog' },
    { label: 'Comunicación', value: 'communication', icon: 'pi-send' }
  ];

  ngOnInit(): void {
    this.loadAvailableTools();
    this.filterTools();
  }

  loadAvailableTools(): void {
    if (!this.agentConfig.department || !this.toolCatalog) {
      this.availableTools = [];
      return;
    }

    // Load tools from selected department + general tools
    const departmentTools = this.toolCatalog[this.agentConfig.department] || [];
    const generalTools = this.toolCatalog.general || [];

    this.availableTools = [...departmentTools, ...generalTools];
    this.filterTools();
  }

  filterTools(): void {
    let filtered = [...this.availableTools];

    // Filter by category
    if (this.selectedCategory && this.selectedCategory !== 'all') {
      filtered = filtered.filter(tool => tool.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
      );
    }

    this.filteredTools = filtered;
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.filterTools();
  }

  onSearchChange(): void {
    this.filterTools();
  }

  toggleTool(toolName: string): void {
    if (!this.agentConfig.selectedTools) {
      this.agentConfig.selectedTools = [];
    }

    const index = this.agentConfig.selectedTools.indexOf(toolName);
    if (index === -1) {
      this.agentConfig.selectedTools.push(toolName);
    } else {
      this.agentConfig.selectedTools.splice(index, 1);
    }

    this.onInputChange();
  }

  isToolSelected(toolName: string): boolean {
    return this.agentConfig.selectedTools?.includes(toolName) || false;
  }

  selectAllTools(): void {
    if (!this.agentConfig.selectedTools) {
      this.agentConfig.selectedTools = [];
    }

    this.filteredTools.forEach(tool => {
      if (!this.agentConfig.selectedTools!.includes(tool.name)) {
        this.agentConfig.selectedTools!.push(tool.name);
      }
    });

    this.onInputChange();
  }

  clearAllTools(): void {
    this.agentConfig.selectedTools = [];
    this.onInputChange();
  }

  onBack(): void {
    this.agentConfigChange.emit(this.agentConfig);
    this.back.emit();
  }

  onNext(): void {
    if (this.isValid()) {
      this.agentConfigChange.emit(this.agentConfig);
      this.next.emit();
    }
  }

  isValid(): boolean {
    return !!(
      this.agentConfig.selectedTools &&
      this.agentConfig.selectedTools.length > 0
    );
  }

  onInputChange(): void {
    this.agentConfigChange.emit(this.agentConfig);
  }

  getSelectedCount(): number {
    return this.agentConfig.selectedTools?.length || 0;
  }
}
