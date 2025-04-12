import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-payment-modal',
  templateUrl: './payment-modal.html',
  styleUrls: ['./payment-modal.scss']
})
export class PaymentModalComponent {
  @Input() paymentType: string = ''; // 'cash', 'card', 'ewallet'
  @Input() title: string = 'Pago';

  amountReceived: number = 0;
  totalAmount: number = 100; // Ejemplo, monto total a pagar
  authorizationCode: string = '';
  walletId: string = '';

  calculateChange(): number {
    return this.amountReceived > this.totalAmount ? this.amountReceived - this.totalAmount : 0;
  }

  onPay(): void {
    alert(`Pago exitoso mediante ${this.paymentType}`);
  }

  closeModal(): void {
    // Lógica para cerrar el modal
  }
}
