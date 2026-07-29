// cash-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cash-payment',
  templateUrl: './cash-payment.html',
  styleUrls: ['./cash-payment.scss']
})
export class CashPaymentComponent {

  totalAmount: number = 0; // Monto total a pagar (puedes pasarlo como entrada si es dinámico)
  amountPaid: number = 0;    // Monto entregado por el cliente
  change: number = 0;        // Cambio a devolver

  /** Denominaciones de billete colombianas para los atajos del modal. */
  readonly billetes: number[] = [5000, 10000, 20000, 50000, 100000];

  constructor(public activeModal: NgbActiveModal) {}

  /**
   * Atajo de billete: escribe el monto recibido y recalcula el cambio con el
   * mismo calculateChange() de siempre. Solo evita digitar.
   */
  establecerRecibido(valor: number): void {
    this.amountPaid = valor;
    this.calculateChange();
  }

  calculateChange() {
    if (this.amountPaid >= this.totalAmount) {
      this.change = this.amountPaid - this.totalAmount;
    } else {
      this.change = 0;
    }
  }

  confirmPayment() {
    if (this.amountPaid >= this.totalAmount) {
      this.activeModal.close({ amountReceived: this.amountPaid, paymentType: 'cash', change: this.change });
    } else {
      Swal.fire({
        title: 'Error',
        text: 'El monto entregado no es suficiente.',
        icon: 'error',
        confirmButtonText: 'OK'
      }); 
    }
  }
}