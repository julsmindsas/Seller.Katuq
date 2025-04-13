// card-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.html'
})
export class CardPaymentComponent {
  cardNumber: string = '';
  expiryDate: string = '';
  cvv: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  confirmPayment() {
    if (this.cardNumber && this.expiryDate && this.cvv) {
      alert(`Pago con tarjeta confirmado: ${this.cardNumber}`);
      this.activeModal.close();
    } else {
      alert('Complete todos los campos.');
    }
  }
}