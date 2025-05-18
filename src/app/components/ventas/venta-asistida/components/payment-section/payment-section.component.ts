import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-payment-section',
  templateUrl: './payment-section.component.html',
  styleUrls: ['./payment-section.component.scss']
})
export class PaymentSectionComponent {
  @Input() metodosPago: any[] = [];
  @Input() metodoPagoSeleccionado: any = null;
  @Output() seleccionarMetodoPago = new EventEmitter<any>();
} 