// card-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.html',
  styleUrls: ['./card-payment.scss']
})
export class CardPaymentComponent {
  constructor(public activeModal: NgbActiveModal) {}

  /**
   * Selecciona un método de pago y cierra el modal devolviendo la información
   * @param method Nombre del método de pago seleccionado
   */
  selectPaymentMethod(method: string) {
    this.activeModal.close({
      paymentMethod: method
    });
  }
}