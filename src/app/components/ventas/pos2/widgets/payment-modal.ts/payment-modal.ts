import { Component, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-payment-modal',
    templateUrl: './payment-modal.html',
    styleUrls: ['./payment-modal.scss']
})
export class PaymentModalComponent {

    constructor(private modal: NgbModal) { }

    paymentType: string = ''; // 'cash', 'card', 'ewallet'
    title: string = 'Pago';
    amountReceived: number = 0;
    totalAmount: number = 100; // Ejemplo, monto total a pagar
    authorizationCode: string = '';
    walletId: string = '';

    calculateChange(): number {
        return this.amountReceived > this.totalAmount ? this.amountReceived - this.totalAmount : 0;
    }

    onPay(): void {
        this.closeModal();
    }

    closeModal(): void {
        // Lógica para cerrar el modal y enviar el pago
        this.modal.dismissAll({ amountReceived: this.amountReceived, paymentType: this.paymentType, change: this.calculateChange() });
    }
}
