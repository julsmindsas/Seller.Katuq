import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Agent } from '../../shared/models/agent.model';

@Component({
  selector: 'app-step-prompt',
  templateUrl: './step-prompt.component.html',
  styleUrls: ['./step-prompt.component.scss']
})
export class StepPromptComponent {
  @Input() agentConfig!: Partial<Agent>;
  @Output() agentConfigChange = new EventEmitter<Partial<Agent>>();
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  touched: boolean = false;

  promptTemplates = [
    {
      label: 'Asistente de Ventas',
      value: 'Eres un asistente experto en ventas. Tu objetivo es ayudar al equipo de ventas a gestionar pedidos, analizar clientes y optimizar el proceso comercial. Responde de forma clara, profesional y orientada a resultados.',
      icon: 'pi-shopping-cart',
      color: '#f093fb'
    },
    {
      label: 'Coordinador Logístico',
      value: 'Eres un coordinador logístico especializado. Tu función es optimizar rutas de entrega, rastrear envíos y garantizar entregas puntuales. Proporciona información precisa y actualizada sobre el estado de los despachos.',
      icon: 'pi-truck',
      color: '#4facfe'
    },
    {
      label: 'Gestor de Inventario',
      value: 'Eres un gestor de inventario experto. Tu tarea es monitorear stock, alertar sobre niveles bajos y sugerir reabastecimientos. Mantén el inventario optimizado y evita quiebres de stock.',
      icon: 'pi-box',
      color: '#43e97b'
    }
  ];

  onBack(): void {
    this.agentConfigChange.emit(this.agentConfig);
    this.back.emit();
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
      this.agentConfig.systemPrompt &&
      this.agentConfig.systemPrompt.trim() !== ''
    );
  }

  useTemplate(template: string): void {
    this.agentConfig.systemPrompt = template;
    this.onInputChange();
  }

  onInputChange(): void {
    this.agentConfigChange.emit(this.agentConfig);
  }

  getCharacterCount(): number {
    return this.agentConfig.systemPrompt?.length || 0;
  }
}
