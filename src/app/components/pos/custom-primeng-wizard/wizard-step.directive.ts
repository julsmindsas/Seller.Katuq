import { Directive, TemplateRef, Output, EventEmitter } from '@angular/core';

@Directive({
  selector: '[wizardStep]'
})
export class WizardStepDirective {
  @Output() stepEnter: EventEmitter<any> = new EventEmitter();
  constructor(public template: TemplateRef<any>) {}

  public emitStepEnter(event?: any): void {
    this.stepEnter.emit(event);
  }
}
