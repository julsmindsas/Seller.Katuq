import { Component, ContentChildren, QueryList, AfterContentInit, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { WizardStepDirective } from './wizard-step.directive';
import { MovingDirection } from 'angular-archwizard';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-custom-primeng-wizard',
  templateUrl: './custom-primeng-wizard.component.html',
  styleUrls: ['./custom-primeng-wizard.component.scss']
})
export class CustomPrimeNGWizardComponent implements AfterContentInit {
  @ContentChildren(WizardStepDirective) steps: QueryList<WizardStepDirective>;
  @Output() stepEnter = new EventEmitter<{ event?: MovingDirection, step: number }>();
  @Input() autoAdvance: boolean = true; // Nueva propiedad para avanzar automáticamente
  @Input() autoAdvanceDelay: number = 1500; // Retraso en ms para el auto avance
  activeIndex: number = 0;
  stepsArray: any[] = [];
  items: MenuItem[] = [];

  constructor(private cd: ChangeDetectorRef) { }

  ngAfterContentInit(): void {
    this.stepsArray = this.steps.toArray().map((_, i) => ({ label: '' }));
    this.items = this.stepsArray.map(step => ({ label: step.label }));
    // Emitir el paso inicial
    this.emitCurrentStep(MovingDirection.Forwards);
    this.cd.detectChanges();
  }

  onStepChange(event: any): void {
    this.activeIndex = event.index;
    this.emitCurrentStep(undefined);
    this.cd.detectChanges();
    // Si autoAdvance está activado y no es el último paso, programa el siguiente avance
    if (this.autoAdvance && this.activeIndex < this.stepsArray.length - 1) {
      setTimeout(() => {
        // Aquí podrías agregar lógica adicional: por ejemplo, verificar que el formulario del paso esté validado
        this.next();
      }, this.autoAdvanceDelay);
    }
  }

  next(): void {
    if (this.activeIndex < this.steps.toArray().length - 1) {
      this.activeIndex++;
      this.emitCurrentStep(MovingDirection.Forwards);
      this.cd.detectChanges();
    }
  }

  prev(): void {
    if (this.activeIndex > 0) {
      this.activeIndex--;
      this.emitCurrentStep(MovingDirection.Backwards);
      this.cd.detectChanges();
    }
  }

  finalizar(): void {
    console.log('Wizard finalizado');
    // Lógica final
  }

  private emitCurrentStep(direction: MovingDirection | undefined): void {
    const currentStep = this.steps.toArray()[this.activeIndex];
    if (currentStep) {
      currentStep.emitStepEnter({ event: direction, step: this.activeIndex });
      this.stepEnter.emit({ event: direction, step: this.activeIndex });
    }
  }
}
