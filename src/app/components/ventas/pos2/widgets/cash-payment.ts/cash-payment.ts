// cash-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.html',
  styleUrls: ['./cash-payment.scss']
})
export class CashPaymentComponent {

  totalAmount: number = 0; // Monto total a pagar (puedes pasarlo como entrada si es dinámico)
  amountPaid: number = 0;    // Monto entregado por el cliente
  change: number = 0;        // Cambio a devolver

  constructor(public activeModal: NgbActiveModal) {}

  calculateChange() {
    if (this.amountPaid >= this.totalAmount) {
      this.change = this.amountPaid - this.totalAmount;
    } else {
      this.change = 0;
    }
  }

  confirmPayment() {
    if (this.amountPaid >= this.totalAmount) {
      alert(`Pago confirmado. Cambio a devolver: $${this.change.toFixed(2)}`);
      this.activeModal.close();
    } else {
      alert('El monto entregado no es suficiente.');
    }
  }
}