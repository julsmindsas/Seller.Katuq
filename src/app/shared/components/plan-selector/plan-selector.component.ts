import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-plan-selector',
  templateUrl: './plan-selector.component.html',
  styleUrls: ['./plan-selector.component.scss']
})
export class PlanSelectorComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() planSelected = new EventEmitter<string>();

  selectedPlan: string = 'completo';
  
  plans = [
    {
      id: 'basico',
      name: 'Básico',
      price: '$9.99',
      features: ['100 transacciones/mes', 'Soporte básico', '1 usuario'],
      icon: 'fa-star'
    },
    {
      id: 'completo',
      name: 'Completo',
      price: '$29.99',
      features: ['Transacciones ilimitadas', 'Soporte prioritario', 'Hasta 5 usuarios'],
      icon: 'fa-crown'
    },
    {
      id: 'empresarial',
      name: 'Empresarial',
      price: '$99.99',
      features: ['Transacciones ilimitadas', 'Soporte 24/7', 'Usuarios ilimitados'],
      icon: 'fa-building'
    }
  ];

  close() {
    this.closed.emit();
  }

  selectPlan(planId: string) {
    this.selectedPlan = planId;
  }

  confirmSelection() {
    if (this.selectedPlan) {
      this.planSelected.emit(this.selectedPlan);
    }
  }
}