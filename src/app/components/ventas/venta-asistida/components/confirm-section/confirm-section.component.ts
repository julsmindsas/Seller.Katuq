import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-section',
  templateUrl: './confirm-section.component.html',
  styleUrls: ['./confirm-section.component.scss']
})
export class ConfirmSectionComponent {
  @Input() puedeConfirmarVenta: boolean = false;
  @Input() loadingVenta: boolean = false;
  @Input() ventaExitosa: boolean = false;
  @Input() errorVenta: string | null = null;
  @Output() confirmarVenta = new EventEmitter<void>();
} 