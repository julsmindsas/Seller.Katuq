// e-wallet-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-e-wallet-payment',
  templateUrl: './ewallet-payment.html'
})
export class EWalletPaymentComponent {
  emailOrPhone: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  confirmPayment() {
    if (this.emailOrPhone) {
      alert(`Pago con E-wallet confirmado: ${this.emailOrPhone}`);
      this.activeModal.close();
    } else {
      alert('Ingrese un correo electrónico o número de teléfono válido.');
    }
  }
}